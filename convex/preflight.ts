import { v, type Infer } from "convex/values";
import { internalQuery, internalMutation, type QueryCtx } from "./_generated/server";

// Rate limit config
const MAX_CHECKS_PER_HOUR = 10;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const HOUR_MS = 60 * 60 * 1000;
// Pending rows older than this are treated as abandoned (crashed or timed out runs)
const STALE_PENDING_MS = 10 * 60 * 1000;

// Guest (signed out) limits. The global cap bounds LLM cost even if IPs rotate.
export const GUEST_MAX_CHECKS_PER_HOUR = 3;
export const GUEST_GLOBAL_MAX_CHECKS_PER_HOUR = 30;
export const SIGNED_IN_MAX_CHECKS_PER_HOUR = MAX_CHECKS_PER_HOUR;
export const GUEST_PREFLIGHT_SETTING_KEY = "guestPreflightEnabled";

// Hash IP address for privacy using Web Crypto API (available in Convex runtime)
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 32);
}

// Normalize repo URL for consistent caching. Strips GitHub /tree and /blob
// paths and the GitLab /-/tree and /-/blob equivalents so subdirectory URLs
// share a cache entry with the repo root.
export function normalizeRepoUrl(url: string): string {
  return url
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .replace(/\/-\/(tree|blob)\/[^/]+.*$/, "")
    .replace(/\/tree\/[^/]+.*$/, "")
    .replace(/\/blob\/[^/]+.*$/, "")
    .replace(/#.*$/, "")
    .toLowerCase();
}

// Check if IP is rate limited (internal query for HTTP action)
export const _checkRateLimit = internalQuery({
  args: { hashedIp: v.string(), now: v.number() },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const oneHourAgo = args.now - 60 * 60 * 1000;

    const recentChecks = await ctx.db
      .query("preflightChecks")
      .withIndex("by_hashed_ip_and_created", (q) =>
        q.eq("hashedIp", args.hashedIp).gt("createdAt", oneHourAgo)
      )
      .take(1000);

    const count = recentChecks.length;
    const remaining = Math.max(0, MAX_CHECKS_PER_HOUR - count);
    const allowed = count < MAX_CHECKS_PER_HOUR;

    // Find the oldest check to determine reset time
    let resetAt: number | undefined;
    if (!allowed && recentChecks.length > 0) {
      const oldest = recentChecks.reduce((a, b) =>
        a.createdAt < b.createdAt ? a : b
      );
      resetAt = oldest.createdAt + 60 * 60 * 1000;
    }

    return { allowed, remaining, resetAt };
  },
});

const cachedResultValidator = v.object({
  status: v.union(
    v.literal("pending"),
    v.literal("passed"),
    v.literal("failed"),
    v.literal("partial"),
    v.literal("error")
  ),
  summary: v.optional(v.string()),
  criteria: v.optional(
    v.array(
      v.object({
        name: v.string(),
        passed: v.boolean(),
        notes: v.string(),
      })
    )
  ),
  cachedAt: v.number(),
  expiresAt: v.number(),
});

type CachedResult = Infer<typeof cachedResultValidator>;

// Newest unexpired, completed result for a repo, or null
async function findCachedResult(
  ctx: QueryCtx,
  normalizedRepoUrl: string,
  now: number
): Promise<CachedResult | null> {
  const cached = await ctx.db
    .query("preflightChecks")
    .withIndex("by_repo_and_expires", (q) =>
      q.eq("normalizedRepoUrl", normalizedRepoUrl).gt("expiresAt", now)
    )
    .order("desc")
    .first();

  if (!cached || cached.status === "pending") {
    return null;
  }

  return {
    status: cached.status,
    summary: cached.summary,
    criteria: cached.criteria,
    cachedAt: cached.createdAt,
    expiresAt: cached.expiresAt,
  };
}

// Check for cached result (internal query for HTTP action)
export const _getCachedResult = internalQuery({
  args: { normalizedRepoUrl: v.string(), now: v.number() },
  returns: v.union(cachedResultValidator, v.null()),
  handler: async (ctx, args) => {
    return await findCachedResult(ctx, args.normalizedRepoUrl, args.now);
  },
});

// Create a pending preflight check record (internal mutation for HTTP action)
export const _createPreflightCheck = internalMutation({
  args: {
    normalizedRepoUrl: v.string(),
    hashedIp: v.string(),
  },
  returns: v.id("preflightChecks"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("preflightChecks", {
      normalizedRepoUrl: args.normalizedRepoUrl,
      hashedIp: args.hashedIp,
      createdAt: now,
      status: "pending",
      expiresAt: now + CACHE_DURATION_MS,
    });
  },
});

// Update preflight check with result (internal mutation for HTTP action)
export const _updatePreflightCheck = internalMutation({
  args: {
    checkId: v.id("preflightChecks"),
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error")
    ),
    summary: v.optional(v.string()),
    criteria: v.optional(
      v.array(
        v.object({
          name: v.string(),
          passed: v.boolean(),
          notes: v.string(),
        })
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("preflightChecks", args.checkId, {
      status: args.status,
      summary: args.summary,
      criteria: args.criteria,
      // Errors expire immediately so the next visitor gets a fresh run, not a cached error
      ...(args.status === "error" ? { expiresAt: Date.now() } : {}),
    });
    return null;
  },
});

// Check if there's an in-flight check for this IP (internal query for HTTP action)
export const _hasInFlightCheck = internalQuery({
  args: { hashedIp: v.string(), now: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("preflightChecks")
      .withIndex("by_hashed_ip_and_status", (q) =>
        q
          .eq("hashedIp", args.hashedIp)
          .eq("status", "pending")
          .gt("_creationTime", args.now - STALE_PENDING_MS)
      )
      .first();

    return pending !== null;
  },
});

// Atomically apply every guest safeguard and insert the pending row.
// Reads and the insert share one transaction, so parallel requests serialize
// under OCC instead of all passing a separate read before any row exists.
// Cached results come back first and never count against a limit.
export const _reserveGuestCheck = internalMutation({
  args: { hashedIp: v.string(), normalizedRepoUrl: v.string() },
  returns: v.union(
    v.object({
      kind: v.literal("cached"),
      result: cachedResultValidator,
    }),
    v.object({
      kind: v.literal("reserved"),
      checkId: v.id("preflightChecks"),
      remaining: v.number(),
    }),
    v.object({
      kind: v.literal("denied"),
      reason: v.union(
        v.literal("disabled"),
        v.literal("in_flight"),
        v.literal("ip_limit"),
        v.literal("global_limit")
      ),
      retryAfterSeconds: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowStart = now - HOUR_MS;

    const setting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", GUEST_PREFLIGHT_SETTING_KEY))
      .first();
    if (setting && !setting.value) {
      return { kind: "denied" as const, reason: "disabled" as const };
    }

    const cached = await findCachedResult(ctx, args.normalizedRepoUrl, now);
    if (cached) {
      return { kind: "cached" as const, result: cached };
    }

    const pending = await ctx.db
      .query("preflightChecks")
      .withIndex("by_hashed_ip_and_status", (q) =>
        q
          .eq("hashedIp", args.hashedIp)
          .eq("status", "pending")
          .gt("_creationTime", now - STALE_PENDING_MS)
      )
      .first();
    if (pending) {
      return { kind: "denied" as const, reason: "in_flight" as const };
    }

    // Per network window counts every check from this IP, guest or signed in
    const ipChecks = await ctx.db
      .query("preflightChecks")
      .withIndex("by_hashed_ip_and_created", (q) =>
        q.eq("hashedIp", args.hashedIp).gt("createdAt", windowStart)
      )
      .take(GUEST_MAX_CHECKS_PER_HOUR);
    if (ipChecks.length >= GUEST_MAX_CHECKS_PER_HOUR) {
      // Index order is ascending createdAt, so the first row frees up first
      const retryAfterMs = ipChecks[0].createdAt + HOUR_MS - now;
      return {
        kind: "denied" as const,
        reason: "ip_limit" as const,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    const guestChecks = await ctx.db
      .query("preflightChecks")
      .withIndex("by_is_guest_and_created", (q) =>
        q.eq("isGuest", true).gt("createdAt", windowStart)
      )
      .take(GUEST_GLOBAL_MAX_CHECKS_PER_HOUR);
    if (guestChecks.length >= GUEST_GLOBAL_MAX_CHECKS_PER_HOUR) {
      const retryAfterMs = guestChecks[0].createdAt + HOUR_MS - now;
      return {
        kind: "denied" as const,
        reason: "global_limit" as const,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    const checkId = await ctx.db.insert("preflightChecks", {
      normalizedRepoUrl: args.normalizedRepoUrl,
      hashedIp: args.hashedIp,
      createdAt: now,
      status: "pending",
      expiresAt: now + CACHE_DURATION_MS,
      isGuest: true,
    });

    return {
      kind: "reserved" as const,
      checkId,
      remaining: GUEST_MAX_CHECKS_PER_HOUR - ipChecks.length - 1,
    };
  },
});
