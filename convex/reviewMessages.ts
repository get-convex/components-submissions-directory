// Admin API for review outcome drafts (rejection and approval messages).
// Drafts are admin only. Sending posts a normal User Messages row.
import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { getAdminIdentity, requireAdminIdentity } from "./auth";
import {
  MAX_MESSAGE_LENGTH,
  buildDraftContent,
  getPendingDraft,
  isTeamComment,
  sendDraft,
  upsertRejectionDraft,
  wasRejectionRunHandled,
} from "./packageMessaging";

const draftKindValidator = v.union(v.literal("rejected"), v.literal("approved"));

const draftReturnValidator = v.object({
  _id: v.id("reviewMessageDrafts"),
  kind: draftKindValidator,
  content: v.string(),
  createdAt: v.number(),
  editedAt: v.optional(v.number()),
});

function cleanContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ConvexError(
      `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    );
  }
  return trimmed;
}

async function loadPendingDraft(
  ctx: Parameters<typeof getPendingDraft>[0],
  draftId: Doc<"reviewMessageDrafts">["_id"],
): Promise<Doc<"reviewMessageDrafts"> | null> {
  const draft = await ctx.db.get("reviewMessageDrafts", draftId);
  return draft && draft.status === "draft" ? draft : null;
}

// Pending draft for one package, or null. Non admins always get null.
export const getReviewMessageDraft = query({
  args: { packageId: v.id("packages") },
  returns: v.union(draftReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return null;
    const draft = await getPendingDraft(ctx, args.packageId);
    if (!draft) return null;
    return {
      _id: draft._id,
      kind: draft.kind,
      content: draft.content,
      createdAt: draft.createdAt,
      editedAt: draft.editedAt,
    };
  },
});

// Package ids with a pending draft, for the list row indicator.
export const listPackagesWithPendingDrafts = query({
  args: {},
  returns: v.array(v.id("packages")),
  handler: async (ctx) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return [];
    const pending = await ctx.db
      .query("reviewMessageDrafts")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .take(500);
    return [...new Set(pending.map((d) => d.packageId))];
  },
});

// Autosave target for composer edits (debounced on the client).
export const updateReviewMessageDraft = mutation({
  args: { draftId: v.id("reviewMessageDrafts"), content: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const content = cleanContent(args.content);
    const draft = await loadPendingDraft(ctx, args.draftId);
    if (!draft || draft.content === content) return null;
    await ctx.db.patch("reviewMessageDrafts", draft._id, {
      content,
      editedAt: Date.now(),
    });
    return null;
  },
});

// Rebuild the draft from the latest review data, dropping admin edits.
export const regenerateReviewMessageDraft = mutation({
  args: { draftId: v.id("reviewMessageDrafts") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const draft = await loadPendingDraft(ctx, args.draftId);
    if (!draft) {
      throw new ConvexError("This draft was already sent or discarded");
    }
    const pkg = await ctx.db.get("packages", draft.packageId);
    if (!pkg) throw new ConvexError("Package not found");
    const content = buildDraftContent(pkg, draft.kind);
    if (content === null) {
      throw new ConvexError(
        "No failed AI review with reasons to build this message from",
      );
    }
    await ctx.db.patch("reviewMessageDrafts", draft._id, {
      content,
      editedAt: undefined,
      sourceAiReviewedAt:
        draft.kind === "rejected" ? pkg.aiReviewedAt : draft.sourceAiReviewedAt,
    });
    return content;
  },
});

// Discard without sending. Safe to call twice.
export const dismissReviewMessageDraft = mutation({
  args: { draftId: v.id("reviewMessageDrafts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const draft = await loadPendingDraft(ctx, args.draftId);
    if (!draft) return null;
    await ctx.db.patch("reviewMessageDrafts", draft._id, {
      status: "dismissed",
    });
    return null;
  },
});

// Send the (possibly edited) draft as the signed in admin.
export const sendReviewMessageDraft = mutation({
  args: {
    draftId: v.id("reviewMessageDrafts"),
    content: v.string(),
    alsoCreateGithubIssue: v.boolean(),
  },
  returns: v.id("packageComments"),
  handler: async (ctx, args) => {
    const { email, identity } = await requireAdminIdentity(ctx);
    const content = cleanContent(args.content);
    if (!content) throw new ConvexError("Message cannot be empty");

    const draft = await loadPendingDraft(ctx, args.draftId);
    if (!draft) {
      throw new ConvexError("This draft was already sent or discarded");
    }
    const pkg = await ctx.db.get("packages", draft.packageId);
    if (!pkg) throw new ConvexError("Package not found");

    return await sendDraft(ctx, {
      draft,
      pkg,
      content,
      authorEmail: email,
      authorName: identity.name ?? undefined,
      alsoCreateGithubIssue: args.alsoCreateGithubIssue,
    });
  },
});

// One time backfill for packages rejected before drafts existed. Creates
// drafts only, never sends. Idempotent, pages through rejected packages.
// npx convex run --prod reviewMessages:backfillRejectionDrafts '{"dryRun":true}'
export const backfillRejectionDrafts = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    scanned: v.number(),
    created: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const page = await ctx.db
      .query("packages")
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) =>
        q.eq("reviewStatus", "rejected"),
      )
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let created = 0;
    for (const pkg of page.page) {
      if (!(await needsBackfillDraft(ctx, pkg))) continue;
      if (dryRun) {
        created += 1;
        continue;
      }
      if (await upsertRejectionDraft(ctx, pkg)) created += 1;
    }

    console.log(
      `backfillRejectionDrafts${dryRun ? " (dry run)" : ""}: scanned ${page.page.length}, ${dryRun ? "would create" : "created"} ${created}`,
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.reviewMessages.backfillRejectionDrafts,
        { cursor: page.continueCursor, dryRun },
      );
    }
    return { scanned: page.page.length, created, isDone: page.isDone };
  },
});

// Skip anything without usable reasons, anything already drafted or handled,
// and anything the team already wrote to after the latest review.
async function needsBackfillDraft(
  ctx: Parameters<typeof getPendingDraft>[0],
  pkg: Doc<"packages">,
): Promise<boolean> {
  if (buildDraftContent(pkg, "rejected") === null) return false;
  if (await getPendingDraft(ctx, pkg._id, "rejected")) return false;
  if (await wasRejectionRunHandled(ctx, pkg)) return false;

  const since = pkg.aiReviewedAt ?? 0;
  const recent = await ctx.db
    .query("packageComments")
    .withIndex("by_package_and_created", (q) =>
      q.eq("packageId", pkg._id).gte("createdAt", since),
    )
    .take(100);
  return !recent.some(isTeamComment);
}
