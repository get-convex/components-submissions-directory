// Scheduled README auto-update for official Convex team components
// (get-convex GitHub org / @convex-dev npm scope) plus the readmeUpdateLogs
// audit trail browsed from the admin Logs tab.
//
// An hourly cron calls scheduledOfficialReadmeUpdate. Convex crons cannot
// change schedule at runtime, so the handler gates on the admin toggle and
// the configured interval (hour/day/3 days/week/month) and early-returns
// when the run is not due. When due, it staggers one GitHub fetch per
// package every 10 seconds to stay far under GitHub API rate limits.

import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  mutation,
  query,
  MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAdminIdentity, requireAdminIdentity } from "./auth";
import { listApprovedOfficialPackages } from "./packages";

// ============ Settings ============

const ENABLED_KEY = "officialReadmeAutoUpdateEnabled";
const INTERVAL_KEY = "officialReadmeUpdateIntervalHours";
const LAST_RUN_KEY = "officialReadmeLastRunAt";

// Allowed schedule choices, in hours: hour, day, 3 days, week, month.
const ALLOWED_INTERVAL_HOURS = [1, 24, 72, 168, 720];
const DEFAULT_INTERVAL_HOURS = 1;

// Seconds between per-package fetches. GitHub's unauthenticated API limit is
// 60 requests/hour and each README fetch can make a few requests, so one
// package every 10s keeps a full run of ~30 components well under the limit.
const STAGGER_MS = 10_000;

// Keep the newest N log rows; older ones are pruned after each cron run.
const MAX_LOG_ROWS = 500;
// Per-transaction delete batch size for clear/cleanup.
const DELETE_BATCH_SIZE = 500;

async function getBooleanSetting(
  ctx: MutationCtx,
  key: string,
): Promise<boolean | null> {
  const row = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row?.value ?? null;
}

async function getNumericSetting(
  ctx: MutationCtx,
  key: string,
): Promise<number | null> {
  const row = await ctx.db
    .query("adminSettingsNumeric")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row?.value ?? null;
}

async function upsertBooleanSetting(
  ctx: MutationCtx,
  key: string,
  value: boolean,
): Promise<void> {
  const existing = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("adminSettings", { key, value });
  }
}

async function upsertNumericSetting(
  ctx: MutationCtx,
  key: string,
  value: number,
): Promise<void> {
  const existing = await ctx.db
    .query("adminSettingsNumeric")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("adminSettingsNumeric", { key, value });
  }
}

// ============ Cron handler ============

// Called hourly by the official-readme-auto-update cron. Gated by the admin
// toggle and the configured interval; when due it schedules the same internal
// README refresh action the admin and profile "Update README" buttons use.
export const scheduledOfficialReadmeUpdate = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const enabled = await getBooleanSetting(ctx, ENABLED_KEY);
    if (!enabled) {
      return null;
    }

    const intervalHours =
      (await getNumericSetting(ctx, INTERVAL_KEY)) ?? DEFAULT_INTERVAL_HOURS;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const lastRunAt = await getNumericSetting(ctx, LAST_RUN_KEY);
    const now = Date.now();

    // 5 minute tolerance so an hourly interval is not skipped by cron jitter.
    if (lastRunAt !== null && now - lastRunAt < intervalMs - 5 * 60 * 1000) {
      return null;
    }

    await upsertNumericSetting(ctx, LAST_RUN_KEY, now);

    const officialPackages = await listApprovedOfficialPackages(ctx);

    let scheduled = 0;
    for (const pkg of officialPackages) {
      if (!pkg.repositoryUrl) {
        // Never fetched: record why so the log explains the gap.
        await ctx.db.insert("readmeUpdateLogs", {
          packageId: pkg._id,
          packageName: pkg.name,
          status: "skipped",
          source: "cron",
          message: "No repository URL",
        });
        continue;
      }
      // Stagger fetches to avoid bursting the GitHub API.
      await ctx.scheduler.runAfter(
        scheduled * STAGGER_MS,
        internal.seoContent.refreshReadme,
        { packageId: pkg._id, source: "cron" },
      );
      scheduled += 1;
    }

    // Prune old log rows after the last scheduled fetch settles.
    await ctx.scheduler.runAfter(
      scheduled * STAGGER_MS + 60_000,
      internal.readmeAutoUpdate._cleanupOldReadmeUpdateLogs,
      {},
    );

    console.log(
      `Official README auto-update: scheduled ${scheduled} of ${officialPackages.length} official packages`,
    );
    return null;
  },
});

// ============ Log writes (internal) ============

// One row per README update attempt. Called by internal.seoContent.refreshReadme
// for cron, admin, and profile triggered refreshes.
export const _insertReadmeUpdateLog = internalMutation({
  args: {
    packageId: v.optional(v.id("packages")),
    packageName: v.string(),
    status: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    source: v.union(
      v.literal("cron"),
      v.literal("admin"),
      v.literal("profile"),
    ),
    changed: v.optional(v.boolean()),
    message: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("readmeUpdateLogs", args);
    return null;
  },
});

// Keep only the newest MAX_LOG_ROWS entries.
export const _cleanupOldReadmeUpdateLogs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("readmeUpdateLogs")
      .order("desc")
      .take(MAX_LOG_ROWS + DELETE_BATCH_SIZE);
    const excess = rows.slice(MAX_LOG_ROWS);
    await Promise.all(excess.map((row) => ctx.db.delete(row._id)));
    return null;
  },
});

// Batched continuation for clearReadmeUpdateLogs.
export const _clearReadmeUpdateLogsBatch = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("readmeUpdateLogs")
      .take(DELETE_BATCH_SIZE);
    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    if (rows.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.readmeAutoUpdate._clearReadmeUpdateLogsBatch,
        {},
      );
    }
    return null;
  },
});

// ============ Admin settings API ============

const settingsReturnValidator = v.object({
  enabled: v.boolean(),
  intervalHours: v.number(),
  lastRunAt: v.union(v.number(), v.null()),
});

// Read the auto-update settings for the admin UI. Non-sensitive booleans,
// same exposure level as getAdminSettings.
export const getOfficialReadmeAutoUpdateSettings = query({
  args: {},
  returns: settingsReturnValidator,
  handler: async (ctx) => {
    const enabled = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", ENABLED_KEY))
      .first();
    const interval = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", INTERVAL_KEY))
      .first();
    const lastRun = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", LAST_RUN_KEY))
      .first();
    return {
      enabled: enabled?.value ?? false,
      intervalHours: interval?.value ?? DEFAULT_INTERVAL_HOURS,
      lastRunAt: lastRun?.value ?? null,
    };
  },
});

// Admin-only: toggle the auto-update and/or change the schedule.
export const updateOfficialReadmeAutoUpdateSettings = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    intervalHours: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    if (args.enabled !== undefined) {
      await upsertBooleanSetting(ctx, ENABLED_KEY, args.enabled);
    }
    if (args.intervalHours !== undefined) {
      if (!ALLOWED_INTERVAL_HOURS.includes(args.intervalHours)) {
        throw new Error("Invalid interval");
      }
      await upsertNumericSetting(ctx, INTERVAL_KEY, args.intervalHours);
    }
    return null;
  },
});

// ============ Admin logs API ============

const logValidator = v.object({
  _id: v.id("readmeUpdateLogs"),
  _creationTime: v.number(),
  packageId: v.optional(v.id("packages")),
  packageName: v.string(),
  status: v.union(
    v.literal("success"),
    v.literal("failed"),
    v.literal("skipped"),
  ),
  source: v.union(v.literal("cron"), v.literal("admin"), v.literal("profile")),
  changed: v.optional(v.boolean()),
  message: v.optional(v.string()),
});

// SECURITY: Admin-only query - non-admins receive an empty page.
export const listReadmeUpdateLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("success"),
        v.literal("failed"),
        v.literal("skipped"),
      ),
    ),
    source: v.optional(
      v.union(v.literal("cron"), v.literal("admin"), v.literal("profile")),
    ),
  },
  returns: v.object({
    page: v.array(logValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const status = args.status;
    const source = args.source;

    if (status !== undefined) {
      let queryByStatus = ctx.db
        .query("readmeUpdateLogs")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc");
      if (source !== undefined) {
        queryByStatus = queryByStatus.filter((q) =>
          q.eq(q.field("source"), source),
        );
      }
      return await queryByStatus.paginate(args.paginationOpts);
    }

    if (source !== undefined) {
      return await ctx.db
        .query("readmeUpdateLogs")
        .withIndex("by_source", (q) => q.eq("source", source))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("readmeUpdateLogs")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Admin-only: delete a selected set of log rows.
export const deleteReadmeUpdateLogs = mutation({
  args: { ids: v.array(v.id("readmeUpdateLogs")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    if (args.ids.length > DELETE_BATCH_SIZE) {
      throw new Error(
        `Cannot delete more than ${DELETE_BATCH_SIZE} logs at once`,
      );
    }
    await Promise.all(args.ids.map((id) => ctx.db.delete(id)));
    return null;
  },
});

// Admin-only: clear all log rows (batched to stay within transaction limits).
export const clearReadmeUpdateLogs = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);
    const rows = await ctx.db
      .query("readmeUpdateLogs")
      .take(DELETE_BATCH_SIZE);
    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    if (rows.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.readmeAutoUpdate._clearReadmeUpdateLogsBatch,
        {},
      );
    }
    return null;
  },
});
