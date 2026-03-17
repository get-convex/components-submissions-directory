// Internal mutations for saving AI-generated SEO content.
// Separated from seoContent.ts because mutations cannot live in "use node" files.
// Note: Internal mutations omit return validators per Convex best practices (TypeScript inference suffices).

import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
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

// Admin mutation: migrate a single package from v1 (SEO) to v2 content model
export const migrateToContentModel = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Package not found");

    if (pkg.contentModelVersion === 2) {
      // Already v2, but backfill skillMd if missing and content exists
      if (
        !pkg.skillMd &&
        pkg.generatedDescription &&
        pkg.generatedUseCases &&
        pkg.generatedHowItWorks
      ) {
        const skillMd = buildSkillMdFromContent(pkg, {
          description: pkg.generatedDescription,
          useCases: pkg.generatedUseCases,
          howItWorks: pkg.generatedHowItWorks,
        });
        await ctx.db.patch(args.packageId, { skillMd });
      }
      return null;
    }

    // Snapshot user-submitted descriptions before migration (only if not already captured)
    const patchData: Record<string, unknown> = {
      contentModelVersion: 2,
    };
    if (!pkg.submittedShortDescription && pkg.shortDescription) {
      patchData.submittedShortDescription = pkg.shortDescription;
    }
    if (!pkg.submittedLongDescription && pkg.longDescription) {
      patchData.submittedLongDescription = pkg.longDescription;
    }

    // Build skillMd from existing v2 content fields if available
    if (
      pkg.generatedDescription &&
      pkg.generatedUseCases &&
      pkg.generatedHowItWorks
    ) {
      patchData.skillMd = buildSkillMdFromContent(pkg, {
        description: pkg.generatedDescription,
        useCases: pkg.generatedUseCases,
        howItWorks: pkg.generatedHowItWorks,
      });
    }

    await ctx.db.patch(args.packageId, patchData);

    return null;
  },
});
