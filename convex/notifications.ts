import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ HELPER: Get current user's email from identity claims ============
async function getCurrentUserEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.email ?? null;
}

// Query: Unread review status notifications for the current user's header bell.
// Returns minimal metadata only (caller's own packages, no PII beyond that).
export const getMyStatusNotifications = query({
  args: {},
  returns: v.array(
    v.object({
      notificationId: v.id("statusNotifications"),
      packageId: v.id("packages"),
      packageName: v.string(),
      slug: v.optional(v.string()),
      reviewStatus: v.union(
        v.literal("in_review"),
        v.literal("approved"),
        v.literal("changes_requested"),
        v.literal("rejected"),
      ),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return [];
    }

    const unread = await ctx.db
      .query("statusNotifications")
      .withIndex("by_recipientEmail_and_read", (q) =>
        q.eq("recipientEmail", userEmail).eq("read", false),
      )
      .take(50);

    const results: Array<{
      notificationId: Id<"statusNotifications">;
      packageId: Id<"packages">;
      packageName: string;
      slug: string | undefined;
      reviewStatus: "in_review" | "approved" | "changes_requested" | "rejected";
      createdAt: number;
    }> = [];

    for (const notification of unread) {
      const pkg = await ctx.db.get("packages", notification.packageId);
      if (!pkg) continue;
      results.push({
        notificationId: notification._id,
        packageId: notification.packageId,
        packageName: pkg.componentName ?? pkg.name,
        slug: pkg.slug ?? undefined,
        reviewStatus: notification.reviewStatus,
        createdAt: notification.createdAt,
      });
    }

    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

// Mutation: Mark a single status notification as read (owner only, idempotent)
export const markStatusNotificationRead = mutation({
  args: { notificationId: v.id("statusNotifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return null;
    }

    const notification = await ctx.db.get("statusNotifications", args.notificationId);
    if (!notification) return null;
    if (notification.recipientEmail !== userEmail) return null;
    if (notification.read) return null;

    await ctx.db.patch("statusNotifications", args.notificationId, { read: true });
    return null;
  },
});

// Mutation: Mark all of the current user's status notifications as read
export const markAllStatusNotificationsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return null;
    }

    const unread = await ctx.db
      .query("statusNotifications")
      .withIndex("by_recipientEmail_and_read", (q) =>
        q.eq("recipientEmail", userEmail).eq("read", false),
      )
      .take(200);

    await Promise.all(
      unread.map((n) => ctx.db.patch("statusNotifications", n._id, { read: true })),
    );
    return null;
  },
});
