import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAdminIdentity } from "./auth";

// Oct 1, 2025 00:00:00 UTC
const OCT_2025_EPOCH = new Date("2025-10-01T00:00:00Z").getTime();

// Heuristic: package belongs to the get-convex team if its npm scope is
// @convex-dev, or if it has a collaborator whose npm username is "convex"
// or "get-convex", or it is convexVerified but NOT community-submitted.
function isConvexTeamPackage(pkg: {
  name: string;
  collaborators: Array<{ name: string; avatar: string }>;
  convexVerified?: boolean;
  communitySubmitted?: boolean;
}): boolean {
  if (pkg.name.startsWith("@convex-dev/")) return true;
  const teamUsernames = ["convex", "get-convex", "convex-dev"];
  if (pkg.collaborators.some((c) => teamUsernames.includes(c.name.toLowerCase()))) {
    return true;
  }
  if (pkg.convexVerified && !pkg.communitySubmitted) return true;
  return false;
}

function resolveAuthor(pkg: {
  authorUsername?: string;
  collaborators: Array<{ name: string; avatar: string }>;
}): string {
  if (pkg.authorUsername) return pkg.authorUsername;
  if (pkg.collaborators.length > 0) return pkg.collaborators[0].name;
  return "Unknown";
}

// Formats a timestamp into "YYYY-MM" bucket key
function toMonthKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const authorStatValidator = v.object({
  author: v.string(),
  avatar: v.string(),
  count: v.number(),
  downloads: v.number(),
  isConvexTeam: v.boolean(),
});

const monthStatValidator = v.object({
  month: v.string(),
  count: v.number(),
  communityCount: v.number(),
  convexTeamCount: v.number(),
});

export const getDashboardStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    approved: v.number(),
    community: v.number(),
    convexTeam: v.number(),
    convexTeamSinceOct2025: v.number(),
    preOct2025: v.number(),
    totalDownloads: v.number(),
    communityDownloads: v.number(),
    convexTeamDownloads: v.number(),
    byAuthor: v.array(authorStatValidator),
    byMonth: v.array(monthStatValidator),
  }),
  handler: async (ctx) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) {
      return {
        total: 0,
        approved: 0,
        community: 0,
        convexTeam: 0,
        convexTeamSinceOct2025: 0,
        preOct2025: 0,
        totalDownloads: 0,
        communityDownloads: 0,
        convexTeamDownloads: 0,
        byAuthor: [],
        byMonth: [],
      };
    }

    const packages = await ctx.db.query("packages").take(2000);

    // Filter to non-archived, non-deleted
    const active = packages.filter(
      (p) => p.visibility !== "archived" && !p.markedForDeletion,
    );

    let community = 0;
    let convexTeam = 0;
    let convexTeamSinceOct2025 = 0;
    let preOct2025 = 0;
    let totalDownloads = 0;
    let communityDownloads = 0;
    let convexTeamDownloads = 0;
    let approved = 0;

    const authorMap: Record<
      string,
      { avatar: string; count: number; downloads: number; isConvexTeam: boolean }
    > = {};
    const monthMap: Record<
      string,
      { count: number; communityCount: number; convexTeamCount: number }
    > = {};

    for (const pkg of active) {
      const isTeam = isConvexTeamPackage(pkg);
      const author = resolveAuthor(pkg);
      const downloads = pkg.weeklyDownloads ?? 0;
      const submittedTs = pkg.submittedAt || pkg._creationTime;

      if (pkg.reviewStatus === "approved") approved++;
      totalDownloads += downloads;

      if (isTeam) {
        convexTeam++;
        convexTeamDownloads += downloads;
        if (submittedTs >= OCT_2025_EPOCH) convexTeamSinceOct2025++;
      } else {
        community++;
        communityDownloads += downloads;
      }

      if (submittedTs < OCT_2025_EPOCH) preOct2025++;

      // Author aggregation
      if (!authorMap[author]) {
        const avatar =
          pkg.authorAvatar ||
          (pkg.collaborators.length > 0 ? pkg.collaborators[0].avatar : "");
        authorMap[author] = { avatar, count: 0, downloads: 0, isConvexTeam: isTeam };
      }
      authorMap[author].count++;
      authorMap[author].downloads += downloads;

      // Monthly aggregation
      const mk = toMonthKey(submittedTs);
      if (!monthMap[mk]) {
        monthMap[mk] = { count: 0, communityCount: 0, convexTeamCount: 0 };
      }
      monthMap[mk].count++;
      if (isTeam) monthMap[mk].convexTeamCount++;
      else monthMap[mk].communityCount++;
    }

    const byAuthor = Object.entries(authorMap)
      .map(([author, s]) => ({ author, ...s }))
      .sort((a, b) => b.downloads - a.downloads);

    const byMonth = Object.entries(monthMap)
      .map(([month, s]) => ({ month, ...s }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      total: active.length,
      approved,
      community,
      convexTeam,
      convexTeamSinceOct2025,
      preOct2025,
      totalDownloads,
      communityDownloads,
      convexTeamDownloads,
      byAuthor,
      byMonth,
    };
  },
});
