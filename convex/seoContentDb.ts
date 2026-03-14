// Internal mutations for saving AI-generated SEO content.
// Separated from seoContent.ts because mutations cannot live in "use node" files.
// Note: Internal mutations omit return validators per Convex best practices (TypeScript inference suffices).

import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { requireAdminIdentity } from "./auth";

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
