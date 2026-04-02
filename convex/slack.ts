import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = internalAction({
  args: { text: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const url = process.env.SLACK_WEBHOOK_URL?.trim();
    if (!url) {
      console.error(
        "Slack webhook failed: SLACK_WEBHOOK_URL is not set in this deployment.",
      );
      return null;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: args.text }),
      });
      if (!res.ok) {
        console.error("Slack webhook failed:", res.status, await res.text());
      }
    } catch (e) {
      console.error("Slack webhook error:", e);
    }
    return null;
  },
});
