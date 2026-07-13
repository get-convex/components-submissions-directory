// Internal mutations for saving AI-generated SEO content.
// Separated from seoContent.ts because mutations cannot live in "use node" files.
// Note: Internal mutations omit return validators per Convex best practices (TypeScript inference suffices).

import { v, ConvexError } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminIdentity } from "./auth";
import { buildSkillMdFromContent } from "../shared/buildSkillMd";

// Save generated SEO content to a package
export const _saveSeoContent = internalMutation({
  args: {
    packageId: v.id("packages"),
    valueProp: v.string(),
    benefits: v.array(v.string()),
    useCases: v.array(
      v.object({ query: v.string(), answer: v.string() }),
    ),
    faq: v.array(
      v.object({ question: v.string(), answer: v.string() }),
    ),
    resourceLinks: v.array(
      v.object({ label: v.string(), url: v.string() }),
    ),
    skillMd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      seoValueProp: args.valueProp,
      seoBenefits: args.benefits,
      seoUseCases: args.useCases,
      seoFaq: args.faq,
      seoResourceLinks: args.resourceLinks,
      seoGeneratedAt: Date.now(),
      seoGenerationStatus: "completed",
      seoGenerationError: undefined,
      skillMd: args.skillMd,
    });
  },
});

// Update SEO generation status (e.g. "generating")
export const _updateSeoStatus = internalMutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      seoGenerationStatus: args.status,
    });
  },
});

// Admin mutation: manually edit AI-generated SEO content fields
export const updateSeoContent = mutation({
  args: {
    packageId: v.id("packages"),
    seoValueProp: v.optional(v.string()),
    seoBenefits: v.optional(v.array(v.string())),
    seoUseCases: v.optional(
      v.array(v.object({ query: v.string(), answer: v.string() })),
    ),
    seoFaq: v.optional(
      v.array(v.object({ question: v.string(), answer: v.string() })),
    ),
    seoResourceLinks: v.optional(
      v.array(v.object({ label: v.string(), url: v.string() })),
    ),
    skillMd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const { packageId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(packageId, patch);
    }

    return null;
  },
});

// Save error state for SEO generation
export const _setSeoError = internalMutation({
  args: {
    packageId: v.id("packages"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      seoGenerationStatus: "error",
      seoGenerationError: args.error,
      seoGeneratedAt: Date.now(),
    });
  },
});

// ============ V2: GENERATED CONTENT MUTATIONS ============

// Save generated directory content to a package (v2 content model)
export const _saveGeneratedContent = internalMutation({
  args: {
    packageId: v.id("packages"),
    generatedDescription: v.string(),
    generatedUseCases: v.string(),
    generatedHowItWorks: v.string(),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
    skillMd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      generatedDescription: args.generatedDescription,
      generatedUseCases: args.generatedUseCases,
      generatedHowItWorks: args.generatedHowItWorks,
      readmeIncludedMarkdown: args.readmeIncludedMarkdown,
      readmeIncludeSource: args.readmeIncludeSource,
      contentGenerationStatus: "completed",
      contentGenerationError: undefined,
      contentGeneratedAt: Date.now(),
      contentModelVersion: 2,
      skillMd: args.skillMd,
    });
  },
});

// Update content generation status
export const _updateContentStatus = internalMutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      contentGenerationStatus: args.status,
    });
  },
});

// Save error state for content generation
export const _setContentError = internalMutation({
  args: {
    packageId: v.id("packages"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      contentGenerationStatus: "error",
      contentGenerationError: args.error,
      contentGeneratedAt: Date.now(),
    });
  },
});

// Admin mutation: manually edit generated directory content fields
export const updateGeneratedContent = mutation({
  args: {
    packageId: v.id("packages"),
    generatedDescription: v.optional(v.string()),
    generatedUseCases: v.optional(v.string()),
    generatedHowItWorks: v.optional(v.string()),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
    skillMd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const { packageId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    // Auto-rebuild skillMd when content fields change (unless admin explicitly passed skillMd)
    if (Object.keys(patch).length > 0 && !patch.skillMd) {
      const pkg = await ctx.db.get(packageId);
      if (pkg) {
        const desc = (patch.generatedDescription as string | undefined) ?? pkg.generatedDescription ?? "";
        const useCases = (patch.generatedUseCases as string | undefined) ?? pkg.generatedUseCases ?? "";
        const howItWorks = (patch.generatedHowItWorks as string | undefined) ?? pkg.generatedHowItWorks ?? "";
        if (desc && useCases && howItWorks) {
          patch.skillMd = buildSkillMdFromContent(pkg, {
            description: desc,
            useCases,
            howItWorks,
          });
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(packageId, {
        ...patch,
        contentModelVersion: 2,
        contentGenerationStatus: "completed",
        contentGenerationError: undefined,
        contentGeneratedAt: Date.now(),
      });
    }

    return null;
  },
});

// Internal mutation: update only the README markdown field (no AI content changes)
export const _updateReadmeOnly = internalMutation({
  args: {
    packageId: v.id("packages"),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      readmeIncludedMarkdown: args.readmeIncludedMarkdown,
      readmeIncludeSource: args.readmeIncludeSource,
    });
    return null;
  },
});

// Admin mutation: migrate a single package from v1 (SEO) to v2 content model
function tryBuildSkillMd(pkg: any): string | undefined {
  if (pkg.generatedDescription && pkg.generatedUseCases && pkg.generatedHowItWorks) {
    return buildSkillMdFromContent(pkg, {
      description: pkg.generatedDescription,
      useCases: pkg.generatedUseCases,
      howItWorks: pkg.generatedHowItWorks,
    });
  }
  return undefined;
}

function buildMigrationPatch(pkg: any) {
  const patchData: Record<string, unknown> = { contentModelVersion: 2 };
  if (!pkg.submittedShortDescription && pkg.shortDescription) {
    patchData.submittedShortDescription = pkg.shortDescription;
  }
  if (!pkg.submittedLongDescription && pkg.longDescription) {
    patchData.submittedLongDescription = pkg.longDescription;
  }
  const skillMd = tryBuildSkillMd(pkg);
  if (skillMd) patchData.skillMd = skillMd;
  return patchData;
}

export const migrateToContentModel = mutation({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new ConvexError("Package not found");

    if (pkg.contentModelVersion === 2) {
      if (!pkg.skillMd) {
        const skillMd = tryBuildSkillMd(pkg);
        if (skillMd) await ctx.db.patch(args.packageId, { skillMd });
      }
      return null;
    }

    await ctx.db.patch(args.packageId, buildMigrationPatch(pkg));
    return null;
  },
});

// Admin mutation: rebuild SKILL.md from current directory content (deterministic, no AI call)
export const rebuildSkillMd = mutation({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new ConvexError("Package not found");

    const skillMd = tryBuildSkillMd(pkg);
    if (!skillMd) {
      throw new ConvexError(
        "This component has no generated directory content yet. Generate directory content first.",
      );
    }

    await ctx.db.patch(args.packageId, { skillMd });
    return null;
  },
});

// ============ ONE-TIME SKILL BACKFILL ============

const SKILL_BACKFILL_BATCH_SIZE = 100;

// Internal batch worker: pages through packages, builds skillMd where missing,
// and schedules itself for the next page to stay within transaction limits.
export const _backfillSkillMdBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    patchedSoFar: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("packages")
      .paginate({ numItems: SKILL_BACKFILL_BATCH_SIZE, cursor: args.cursor });

    let patched = 0;
    const updates: Promise<void>[] = [];
    for (const pkg of page.page) {
      if (pkg.reviewStatus !== "approved") continue;
      if (pkg.skillMd) continue;
      const skillMd = tryBuildSkillMd(pkg);
      if (!skillMd) continue; // v1 model without v2 content; skipped until content is generated
      updates.push(ctx.db.patch(pkg._id, { skillMd }));
      patched++;
    }
    await Promise.all(updates);

    const total = args.patchedSoFar + patched;
    if (page.isDone) {
      console.log(`Skill backfill complete: ${total} packages patched`);
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.seoContentDb._backfillSkillMdBatch,
        { cursor: page.continueCursor, patchedSoFar: total },
      );
    }
    return null;
  },
});

// Admin mutation: kick off the one-time backfill of skillMd for approved
// packages that have v2 generated content but no skill yet.
export const backfillAllSkillMd = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);
    await ctx.scheduler.runAfter(
      0,
      internal.seoContentDb._backfillSkillMdBatch,
      { cursor: null, patchedSoFar: 0 },
    );
    return null;
  },
});
