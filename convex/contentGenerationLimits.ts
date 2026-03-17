import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const CONTENT_GENERATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_CONTENT_GENERATIONS_PER_WINDOW = 5;

export const _checkRateLimit = internalQuery({
  args: { userKey: v.string() },
  returns: v.object({
    allowed: v.boolean(),
    resetAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const windowStart = Date.now() - CONTENT_GENERATION_WINDOW_MS;

    const recentRequests = await ctx.db
      .query("contentGenerationRequests")
      .withIndex("by_userKey_and_createdAt", (q) =>
        q.eq("userKey", args.userKey).gt("createdAt", windowStart),
      )
      .collect();

    const allowed = recentRequests.length < MAX_CONTENT_GENERATIONS_PER_WINDOW;

    if (allowed || recentRequests.length === 0) {
      return { allowed, resetAt: undefined };
    }

    const oldestRequest = recentRequests.reduce((oldest, current) =>
      current.createdAt < oldest.createdAt ? current : oldest,
    );

    return {
      allowed,
      resetAt: oldestRequest.createdAt + CONTENT_GENERATION_WINDOW_MS,
    };
  },
});

export const _recordRequest = internalMutation({
  args: {
    userKey: v.string(),
    source: v.union(v.literal("submit"), v.literal("profile")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("contentGenerationRequests", {
      userKey: args.userKey,
      source: args.source,
      createdAt: Date.now(),
    });
    return null;
  },
});
