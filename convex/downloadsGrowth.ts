import {
  query,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdminIdentity, getAdminIdentity } from "./auth";

// npm asks API consumers to identify themselves; also lowers block risk
const NPM_USER_AGENT =
  "convex-components-directory (+https://www.convex.dev/components)";
// npm's range API clamps windows to ~18 months; stay safely under it
const NPM_MAX_WINDOW_DAYS = 540;
const DAY_MS = 24 * 60 * 60 * 1000;
// Convex shipped in 2021, so no listed component has downloads before this.
// Keeps request counts low versus starting at npm's 2015 data floor.
const DEFAULT_START_DATE = "2019-01-01";
// Pause between npm requests; npm heavily rate limits bursts from shared IPs
const REQUEST_SPACING_MS = 400;

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

const monthPointValidator = v.object({
  month: v.string(),
  downloads: v.number(),
  cumulative: v.number(),
});

const growthSeriesValidator = v.object({
  _id: v.id("downloadGrowthSeries"),
  _creationTime: v.number(),
  generatedAt: v.number(),
  startMonth: v.string(),
  endMonth: v.string(),
  months: v.array(monthPointValidator),
  packagesIncluded: v.number(),
  packagesFailed: v.array(v.string()),
  totalDownloads: v.number(),
  packageNames: v.optional(v.array(v.string())),
});

// Latest saved growth snapshot for the admin Growth tab.
// Admin-gated; returns null for non-admins to avoid info leakage.
export const getGrowthSeries = query({
  args: {},
  returns: v.union(growthSeriesValidator, v.null()),
  handler: async (ctx) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return null;

    const snapshot = await ctx.db
      .query("downloadGrowthSeries")
      .order("desc")
      .first();
    return snapshot ?? null;
  },
});

// Packages that count toward the all-time downloads total (approved, not
// archived, not marked for deletion), with their stored allTimeDownloads.
// This is the same stored figure the admin dashboard sums, kept fresh by the
// existing package refresh flows, so incremental refreshes need no npm calls.
export const _getGrowthPackages = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      allTimeDownloads: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const approved = await ctx.db
      .query("packages")
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) =>
        q.eq("reviewStatus", "approved"),
      )
      .take(4000);

    return approved
      .filter(
        (pkg) => pkg.visibility !== "archived" && pkg.markedForDeletion !== true,
      )
      .map((pkg) => ({
        name: pkg.name,
        allTimeDownloads: pkg.allTimeDownloads,
      }));
  },
});

// Latest snapshot for the action to decide between incremental and full runs.
export const _getLatestGrowthSeries = internalQuery({
  args: {},
  returns: v.union(growthSeriesValidator, v.null()),
  handler: async (ctx) => {
    const snapshot = await ctx.db
      .query("downloadGrowthSeries")
      .order("desc")
      .first();
    return snapshot ?? null;
  },
});

// Replace the stored snapshot with a freshly generated one.
export const _saveGrowthSeries = internalMutation({
  args: {
    generatedAt: v.number(),
    startMonth: v.string(),
    endMonth: v.string(),
    months: v.array(monthPointValidator),
    packagesIncluded: v.number(),
    packagesFailed: v.array(v.string()),
    totalDownloads: v.number(),
    packageNames: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Only the latest snapshot is kept; clear any previous ones
    const existing = await ctx.db.query("downloadGrowthSeries").take(10);
    await Promise.all(
      existing.map((doc) => ctx.db.delete("downloadGrowthSeries", doc._id)),
    );
    await ctx.db.insert("downloadGrowthSeries", args);
    return null;
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch daily downloads for one package across one date window, retrying with
// backoff since npm rate limits bursts of range requests.
// Returns null on persistent failure so the caller can record the package as failed.
async function fetchDailyRange(
  packageName: string,
  start: string,
  end: string,
): Promise<Array<{ day: string; downloads: number }> | null> {
  const url = `https://api.npmjs.org/downloads/range/${start}:${end}/${encodeURIComponent(packageName)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": NPM_USER_AGENT },
      });
      if (response.status === 429 || response.status >= 500) {
        console.warn(
          `npm range ${response.status} for ${packageName}, attempt ${attempt + 1}`,
        );
        continue;
      }
      if (!response.ok) {
        console.warn(`npm range ${response.status} for ${packageName}`);
        return null;
      }
      const data = await response.json();
      if (!Array.isArray(data.downloads)) return null;
      return data.downloads;
    } catch (err) {
      console.warn(`npm range fetch error for ${packageName}: ${String(err)}`);
    }
  }
  return null;
}

// Sum one package's daily downloads into a month map. All windows must
// succeed or the whole package is rejected, so partial data never mixes in.
// Everything runs sequentially with spacing to stay under npm's rate limit.
async function accumulatePackageMonths(
  packageName: string,
  startMs: number,
  todayMs: number,
  monthTotals: Map<string, number>,
): Promise<boolean> {
  const packageTotals: Map<string, number> = new Map();
  let cursor = startMs;
  while (cursor <= todayMs) {
    const windowEndMs = Math.min(
      cursor + (NPM_MAX_WINDOW_DAYS - 1) * DAY_MS,
      todayMs,
    );
    const days = await fetchDailyRange(
      packageName,
      toDateString(new Date(cursor)),
      toDateString(new Date(windowEndMs)),
    );
    if (days === null) return false;
    for (const point of days) {
      if (typeof point.downloads !== "number" || point.downloads === 0)
        continue;
      const month = point.day.slice(0, 7);
      packageTotals.set(
        month,
        (packageTotals.get(month) ?? 0) + point.downloads,
      );
    }
    cursor = windowEndMs + DAY_MS;
    await sleep(REQUEST_SPACING_MS);
  }
  // Merge only after every window succeeded
  for (const [month, downloads] of packageTotals) {
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + downloads);
  }
  return true;
}

// Walk months in "YYYY-MM" order from the earliest key with data through
// endMonth, computing running cumulative totals. Gaps render as zeros.
function buildCumulativeMonths(
  monthTotals: Map<string, number>,
  endMonth: string,
): Array<{ month: string; downloads: number; cumulative: number }> {
  const keys = Array.from(monthTotals.keys()).sort();
  const start = keys[0] ?? endMonth;
  const months: Array<{
    month: string;
    downloads: number;
    cumulative: number;
  }> = [];
  let cumulative = 0;
  // Begin one month before the first data point so the chart has a zero
  // lead-in baseline; trimLeadingEmptyMonths keeps exactly one such month
  let [year, monthNum] = start.split("-").map(Number);
  monthNum--;
  if (monthNum < 1) {
    monthNum = 12;
    year--;
  }
  while (true) {
    const month = `${year}-${String(monthNum).padStart(2, "0")}`;
    const downloads = monthTotals.get(month) ?? 0;
    cumulative += downloads;
    months.push({ month, downloads, cumulative });
    if (month >= endMonth) break;
    monthNum++;
    if (monthNum > 12) {
      monthNum = 1;
      year++;
    }
  }
  return months;
}

// Trim leading empty months so the chart starts where downloads begin,
// keeping one zero month of lead-in for visual context.
function trimLeadingEmptyMonths<T extends { cumulative: number }>(
  months: Array<T>,
): Array<T> {
  const firstActive = months.findIndex((m) => m.cumulative > 0);
  return firstActive > 1 ? months.slice(firstActive - 1) : months;
}

// Build or refresh the cumulative all-time downloads growth series.
// Admin-only, on demand from the Growth tab.
//
// Two modes:
// - incremental (default when a snapshot exists): historical months never
//   change, so nothing is refetched for packages already in the snapshot.
//   The current total comes from the stored allTimeDownloads sum (the same
//   figure the admin dashboard shows), and only packages that are new since
//   the snapshot get their full npm history fetched.
// - full: refetch every package's history from npm. Runs automatically when
//   there is no usable snapshot or packages were removed (their baked-in
//   history cannot be subtracted), or explicitly via fullRebuild.
export const generateGrowthSeries = action({
  args: {
    startDate: v.optional(v.string()), // "YYYY-MM-DD"
    fullRebuild: v.optional(v.boolean()),
  },
  returns: v.object({
    packagesIncluded: v.number(),
    packagesFailed: v.array(v.string()),
    totalDownloads: v.number(),
    monthCount: v.number(),
    mode: v.union(v.literal("full"), v.literal("incremental")),
  }),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const packages: Array<{ name: string; allTimeDownloads?: number }> =
      await ctx.runQuery(internal.downloadsGrowth._getGrowthPackages, {});
    const snapshot = await ctx.runQuery(
      internal.downloadsGrowth._getLatestGrowthSeries,
      {},
    );

    const names = packages.map((p) => p.name);
    const startMs = new Date(args.startDate ?? DEFAULT_START_DATE).getTime();
    const todayMs = Date.now();
    const endMonth = toDateString(new Date(todayMs)).slice(0, 7);

    // Incremental needs a snapshot that tracks its package list and no
    // removals (a removed package's months are baked into the aggregate)
    const snapshotNames = snapshot?.packageNames;
    const currentSet = new Set(names);
    const removed = snapshotNames?.filter((n) => !currentSet.has(n)) ?? [];
    const canIncrement =
      args.fullRebuild !== true &&
      snapshot !== null &&
      snapshotNames !== undefined &&
      removed.length === 0;

    const monthTotals: Map<string, number> = new Map();
    const failed: Array<string> = [];

    if (canIncrement) {
      // Start from the snapshot's stored months
      for (const m of snapshot.months) monthTotals.set(m.month, m.downloads);

      // Fetch full npm history only for packages new since the snapshot
      const known = new Set(snapshotNames);
      for (const name of names) {
        if (known.has(name)) continue;
        const ok = await accumulatePackageMonths(
          name,
          startMs,
          todayMs,
          monthTotals,
        );
        if (!ok) failed.push(name);
        else await sleep(REQUEST_SPACING_MS);
      }

      const months = trimLeadingEmptyMonths(
        buildCumulativeMonths(monthTotals, endMonth),
      );

      // True up the newest point against the stored allTimeDownloads sum,
      // the same source the dashboard total reads from. Growth since the
      // snapshot lands on the current month.
      const storedTotal = packages.reduce(
        (sum, p) => sum + (p.allTimeDownloads ?? 0),
        0,
      );
      const last = months[months.length - 1];
      const delta = storedTotal - last.cumulative;
      if (delta > 0) {
        last.downloads += delta;
        last.cumulative = storedTotal;
      }

      const includedNames = names.filter((n) => !failed.includes(n));
      await ctx.runMutation(internal.downloadsGrowth._saveGrowthSeries, {
        generatedAt: todayMs,
        startMonth: months[0]?.month ?? endMonth,
        endMonth,
        months,
        packagesIncluded: includedNames.length,
        packagesFailed: failed,
        totalDownloads: last.cumulative,
        packageNames: includedNames,
      });

      return {
        packagesIncluded: includedNames.length,
        packagesFailed: failed,
        totalDownloads: last.cumulative,
        monthCount: months.length,
        mode: "incremental" as const,
      };
    }

    // Full rebuild: sequential fetching with pacing keeps npm from returning
    // 429s. A second pass retries anything that still failed the first time.
    const firstPassFailed: Array<string> = [];
    for (const name of names) {
      const ok = await accumulatePackageMonths(
        name,
        startMs,
        todayMs,
        monthTotals,
      );
      if (!ok) firstPassFailed.push(name);
    }
    for (const name of firstPassFailed) {
      await sleep(REQUEST_SPACING_MS * 4);
      const ok = await accumulatePackageMonths(
        name,
        startMs,
        todayMs,
        monthTotals,
      );
      if (!ok) failed.push(name);
    }

    const months = trimLeadingEmptyMonths(
      buildCumulativeMonths(monthTotals, endMonth),
    );
    const totalDownloads = months[months.length - 1]?.cumulative ?? 0;
    const includedNames = names.filter((n) => !failed.includes(n));

    await ctx.runMutation(internal.downloadsGrowth._saveGrowthSeries, {
      generatedAt: todayMs,
      startMonth: months[0]?.month ?? endMonth,
      endMonth,
      months,
      packagesIncluded: includedNames.length,
      packagesFailed: failed,
      totalDownloads,
      packageNames: includedNames,
    });

    return {
      packagesIncluded: includedNames.length,
      packagesFailed: failed,
      totalDownloads,
      monthCount: months.length,
      mode: "full" as const,
    };
  },
});
