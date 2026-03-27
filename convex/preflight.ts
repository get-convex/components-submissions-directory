import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

// Rate limit config
const MAX_CHECKS_PER_HOUR = 10;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Hash IP address for privacy using Web Crypto API (available in Convex runtime)
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 32);
}

// Normalize repo URL for consistent caching
export function normalizeRepoUrl(url: string): string {
  return url
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
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

// Check for cached result (internal query for HTTP action)
export const _getCachedResult = internalQuery({
  args: { normalizedRepoUrl: v.string(), now: v.number() },
  returns: v.union(
    v.object({
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const now = args.now;

    // Find a valid cached result
    const cached = await ctx.db
      .query("preflightChecks")
      .withIndex("by_repo_and_expires", (q) =>
        q.eq("normalizedRepoUrl", args.normalizedRepoUrl).gt("expiresAt", now)
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
    await ctx.db.patch(args.checkId, {
      status: args.status,
      summary: args.summary,
      criteria: args.criteria,
    });
    return null;
  },
});

// Check if there's an in-flight check for this IP (internal query for HTTP action)
export const _hasInFlightCheck = internalQuery({
  args: { hashedIp: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("preflightChecks")
      .withIndex("by_hashed_ip_and_status", (q) =>
        q.eq("hashedIp", args.hashedIp).eq("status", "pending")
      )
      .first();

    return pending !== null;
  },
});
