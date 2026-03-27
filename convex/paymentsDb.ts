import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Internal query to get package data for reward
export const _getPackageForReward = internalQuery({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("packages"),
      name: v.string(),
      submitterEmail: v.optional(v.string()),
      submitterName: v.optional(v.string()),
      rewardStatus: v.optional(
        v.union(
          v.literal("not_sent"),
          v.literal("sent"),
          v.literal("delivered"),
          v.literal("failed"),
        ),
      ),
      reviewStatus: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("in_review"),
          v.literal("approved"),
          v.literal("changes_requested"),
          v.literal("rejected"),
        ),
      ),
      visibility: v.optional(
        v.union(
          v.literal("visible"),
          v.literal("hidden"),
          v.literal("archived"),
        ),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return null;
    return {
      _id: pkg._id,
      name: pkg.name,
      submitterEmail: pkg.submitterEmail,
      submitterName: pkg.submitterName,
      rewardStatus: pkg.rewardStatus,
      reviewStatus: pkg.reviewStatus,
      visibility: pkg.visibility,
    };
  },
});

// Internal mutation to record payment
export const _recordPayment = internalMutation({
  args: {
    packageId: v.optional(v.id("packages")),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    amount: v.number(),
    currencyCode: v.string(),
    tremendousOrderId: v.optional(v.string()),
    tremendousRewardId: v.optional(v.string()),
    tremendousRewardLink: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
    isTest: v.optional(v.boolean()),
    sentBy: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sentAt = Date.now();

    // Insert payment record
    await ctx.db.insert("payments", {
      packageId: args.packageId,
      recipientEmail: args.recipientEmail,
      recipientName: args.recipientName,
      amount: args.amount,
      currencyCode: args.currencyCode,
      tremendousOrderId: args.tremendousOrderId,
      tremendousRewardId: args.tremendousRewardId,
      tremendousRewardLink: args.tremendousRewardLink,
      status: args.status,
      error: args.error,
      isTest: args.isTest,
      sentBy: args.sentBy,
      sentAt,
      note: args.note,
    });

    if (!args.packageId || args.isTest) {
      return;
    }

    // Update package reward status
    const rewardStatus =
      args.status === "sent" || args.status === "delivered"
        ? args.status
        : args.status === "failed"
          ? "failed"
          : "not_sent";

    // Get existing total and add new amount if successful
    const pkg = await ctx.db.get(args.packageId);
    const existingTotal = pkg?.rewardTotalAmount ?? 0;
    const newTotal =
      args.status === "sent" || args.status === "delivered"
        ? existingTotal + args.amount
        : existingTotal;

    await ctx.db.patch(args.packageId, {
      rewardStatus,
      rewardTotalAmount: newTotal,
    });
  },
});

// Query to get payments for a package
export const getPaymentsForPackage = query({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.array(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      packageId: v.optional(v.id("packages")),
      recipientEmail: v.string(),
      recipientName: v.optional(v.string()),
      amount: v.number(),
      currencyCode: v.string(),
      tremendousOrderId: v.optional(v.string()),
      tremendousRewardId: v.optional(v.string()),
      tremendousRewardLink: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("failed"),
      ),
      error: v.optional(v.string()),
      isTest: v.optional(v.boolean()),
      sentBy: v.string(),
      sentAt: v.number(),
      note: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .order("desc")
      .take(1000);
    return payments;
  },
});

// Backfill: reconcile package rewardStatus/rewardTotalAmount from actual payment records.
// Useful when a payment went through Tremendous but the package fields are out of sync.
type PaymentAgg = { total: number; hasSent: boolean; hasDelivered: boolean };

function aggregatePaymentsByPackage(payments: any[]) {
  const map: Record<string, PaymentAgg> = {};
  for (const p of payments) {
    if (p.isTest || !p.packageId) continue;
    if (p.status !== "sent" && p.status !== "delivered") continue;
    const key = p.packageId as string;
    if (!map[key]) map[key] = { total: 0, hasSent: false, hasDelivered: false };
    map[key].total += p.amount;
    if (p.status === "delivered") map[key].hasDelivered = true;
    else map[key].hasSent = true;
  }
  return map;
}

async function reconcileRewardStatuses(ctx: any, packagePayments: Record<string, PaymentAgg>) {
  const details: Array<{
    packageId: string;
    packageName: string;
    oldRewardStatus: string | undefined;
    newRewardStatus: string;
    oldTotal: number;
    newTotal: number;
  }> = [];
  for (const [pkgIdStr, data] of Object.entries(packagePayments)) {
    const pkg = await ctx.db.get(pkgIdStr as Id<"packages">);
    if (!pkg) continue;
    const newRewardStatus = data.hasDelivered ? "delivered" : "sent";
    const oldTotal = pkg.rewardTotalAmount ?? 0;
    if (pkg.rewardStatus !== newRewardStatus || Math.abs(oldTotal - data.total) > 0.001) {
      await ctx.db.patch(pkgIdStr as Id<"packages">, { rewardStatus: newRewardStatus, rewardTotalAmount: data.total });
      details.push({
        packageId: pkgIdStr,
        packageName: pkg.name ?? "Unknown",
        oldRewardStatus: pkg.rewardStatus,
        newRewardStatus,
        oldTotal,
        newTotal: data.total,
      });
    }
  }
  return details;
}

export const backfillRewardStatusFromPayments = mutation({
  args: {},
  returns: v.object({
    packagesUpdated: v.number(),
    details: v.array(
      v.object({
        packageId: v.string(),
        packageName: v.string(),
        oldRewardStatus: v.optional(v.string()),
        newRewardStatus: v.string(),
        oldTotal: v.number(),
        newTotal: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const allPayments = await ctx.db.query("payments").take(10000);
    const packagePayments = aggregatePaymentsByPackage(allPayments);
    const details = await reconcileRewardStatuses(ctx, packagePayments);
    return { packagesUpdated: details.length, details };
  },
});

// Query to get payment stats
export const getPaymentStats = query({
  args: {},
  returns: v.object({
    totalRewardsSent: v.number(),
    totalAmountSent: v.number(),
    pendingCount: v.number(),
    sentCount: v.number(),
    deliveredCount: v.number(),
    failedCount: v.number(),
  }),
  handler: async (ctx) => {
    const allPayments = await ctx.db.query("payments").take(1000);

    let totalAmountSent = 0;
    let pendingCount = 0;
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    for (const payment of allPayments) {
      if (payment.isTest) {
        continue;
      }
      if (payment.status === "pending") {
        pendingCount++;
      } else if (payment.status === "sent") {
        sentCount++;
        totalAmountSent += payment.amount;
      } else if (payment.status === "delivered") {
        deliveredCount++;
        totalAmountSent += payment.amount;
      } else if (payment.status === "failed") {
        failedCount++;
      }
    }

    return {
      totalRewardsSent: sentCount + deliveredCount,
      totalAmountSent,
      pendingCount,
      sentCount,
      deliveredCount,
      failedCount,
    };
  },
});
