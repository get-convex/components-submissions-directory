// Internal mutations for saving AI-generated SEO content.
// Separated from seoContent.ts because mutations cannot live in "use node" files.
// Note: Internal mutations omit return validators per Convex best practices (TypeScript inference suffices).

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
