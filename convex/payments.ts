"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Tremendous API response types
interface TremendousOrderResponse {
  order?: {
    id?: string;
    rewards?: Array<{
      id?: string;
      delivery?: {
        link?: string;
      };
    }>;
  };
}

type RewardSendResult = {
  success: boolean;
  error?: string;
};

type TremendousSendParams = {
  packageId?: Id<"packages">;
  recipientEmail: string;
  recipientName?: string;
  amount: number;
  sentBy: string;
  note?: string;
  isTest?: boolean;
  externalIdPrefix: string;
};

function normalizeTremendousBaseUrl(rawBaseUrl?: string): string {
  const trimmed = rawBaseUrl?.trim();
  if (!trimmed) {
    return "https://api.tremendous.com/api/v2";
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  if (withoutTrailingSlash === "https://www.tremendous.com") {
    return "https://api.tremendous.com/api/v2";
  }

  if (withoutTrailingSlash === "https://api.tremendous.com") {
    return "https://api.tremendous.com/api/v2";
  }

  if (withoutTrailingSlash === "https://testflight.tremendous.com") {
    return "https://testflight.tremendous.com/api/v2";
  }

  return withoutTrailingSlash;
}

async function sendRewardThroughTremendous(
  ctx: Parameters<typeof internalAction>[0] extends never ? never : any,
  params: TremendousSendParams,
): Promise<RewardSendResult> {
  const apiKey = process.env.TREMENDOUS_API_KEY;
  const baseUrl = normalizeTremendousBaseUrl(process.env.TREMENDOUS_BASE_URL);

  if (!apiKey) {
    return { success: false, error: "TREMENDOUS_API_KEY not configured" };
  }

  const campaignId = process.env.TREMENDOUS_CAMPAIGN_ID?.trim();
  const externalId = `${params.externalIdPrefix}-${Date.now()}`;
  const deliveryMessage = params.note?.trim();

  const requestBody = {
    external_id: externalId,
    payment: {
      funding_source_id: process.env.TREMENDOUS_FUNDING_SOURCE_ID || "balance",
    },
    rewards: [
      {
        value: {
          denomination: params.amount,
          currency_code: "USD",
        },
        delivery: {
          method: "EMAIL",
          ...(deliveryMessage && {
            meta: {
              message: deliveryMessage,
            },
          }),
        },
        recipient: {
          email: params.recipientEmail,
          name: params.recipientName || undefined,
        },
        ...(!campaignId && {
          products: ["giftcard"],
        }),
        ...(campaignId && {
          campaign_id: campaignId,
        }),
      },
    ],
  };

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        throw new Error(
          `Tremendous API error: 404 ${errorText}. Check TREMENDOUS_BASE_URL. Use https://testflight.tremendous.com/api/v2 for sandbox or https://api.tremendous.com/api/v2 for production.`,
        );
      }
      if (response.status === 400 && campaignId) {
        throw new Error(
          `Tremendous API error: 400 ${errorText}. Your campaign is controlling available payout products. Check the campaign's allowed products and minimum amounts in Tremendous.`,
        );
      }
      throw new Error(`Tremendous API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as TremendousOrderResponse;
    const orderId = data.order?.id;
    const reward = data.order?.rewards?.[0];
    const rewardId = reward?.id;
    const rewardLink = reward?.delivery?.link;

    await ctx.runMutation(internal.paymentsDb._recordPayment, {
      packageId: params.packageId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      amount: params.amount,
      currencyCode: "USD",
      tremendousOrderId: orderId,
      tremendousRewardId: rewardId,
      tremendousRewardLink: rewardLink,
      status: "sent",
      error: undefined,
      isTest: params.isTest,
      sentBy: params.sentBy,
      note: deliveryMessage,
    });

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await ctx.runMutation(internal.paymentsDb._recordPayment, {
      packageId: params.packageId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      amount: params.amount,
      currencyCode: "USD",
      status: "failed",
      error: errorMessage,
      isTest: params.isTest,
      sentBy: params.sentBy,
      note: deliveryMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// Internal action to send reward via Tremendous
// Used by scheduler for auto-send, and called from public sendRewardManual
export const sendReward = internalAction({
  args: {
    packageId: v.id("packages"),
    amount: v.number(),
    sentBy: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RewardSendResult> => {
    // Get package data
    const pkg = await ctx.runQuery(internal.paymentsDb._getPackageForReward, {
      packageId: args.packageId,
    });

    if (!pkg) {
      return { success: false, error: "Package not found" };
    }

    if (!pkg.submitterEmail) {
      return { success: false, error: "No submitter email on this package" };
    }

    return await sendRewardThroughTremendous(ctx, {
      packageId: args.packageId,
      recipientEmail: pkg.submitterEmail,
      recipientName: pkg.submitterName,
      amount: args.amount,
      sentBy: args.sentBy,
      note: args.note,
      externalIdPrefix: `pkg-${args.packageId}`,
    });
  },
});

// Public action to send reward manually
// Wrapper for admin UI to call the internal sendReward action
export const sendRewardManual = action({
  args: {
    packageId: v.id("packages"),
    amount: v.number(),
    sentBy: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<RewardSendResult> => {
    const result: RewardSendResult = await ctx.runAction(
      internal.payments.sendReward,
      {
        packageId: args.packageId,
        amount: args.amount,
        sentBy: args.sentBy,
        note: args.note,
      },
    );
    return result;
  },
});

// Public action to send a settings-level test reward
export const sendTestReward = action({
  args: {
    amount: v.number(),
    sentBy: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<RewardSendResult> => {
    const testRecipientEmail =
      process.env.TREMENDOUS_TEST_RECIPIENT_EMAIL?.trim();

    if (!testRecipientEmail) {
      return {
        success: false,
        error: "TREMENDOUS_TEST_RECIPIENT_EMAIL not configured",
      };
    }

    return await sendRewardThroughTremendous(ctx, {
      recipientEmail: testRecipientEmail,
      recipientName: "Tremendous Test Recipient",
      amount: args.amount,
      sentBy: args.sentBy,
      note: args.note,
      isTest: true,
      externalIdPrefix: "test-reward",
    });
  },
});
