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

    const previewLine = (args.text.split("\n")[0] ?? "").trim();
    const preview =
      previewLine.length > 160 ? `${previewLine.slice(0, 160)}…` : previewLine;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: args.text }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(
          "Slack webhook failed:",
          res.status,
          body || "(empty body)",
        );
        return null;
      }
      console.log(
        `Slack webhook: delivered (${res.status})${preview ? ` — ${preview}` : ""}`,
      );
    } catch (e) {
      console.error("Slack webhook error (network/fetch):", e);
    }
    return null;
  },
});
