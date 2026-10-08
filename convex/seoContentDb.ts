// Internal mutations for saving AI-generated SEO content.
// Separated from seoContent.ts because mutations cannot live in "use node" files.
// Note: Internal mutations omit return validators per Convex best practices (TypeScript inference suffices).

import { v, ConvexError, type Infer } from "convex/values";
import {
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminIdentity } from "./auth";
import { buildSkillMdFromContent } from "../shared/buildSkillMd";
import { stripUnsafeHtml } from "../shared/sanitizeMarkdown";

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
    // Same write-time cleanup as submitter edits; the page sanitizes again
    for (const key of [
      "generatedUseCases",
      "generatedHowItWorks",
      "readmeIncludedMarkdown",
    ]) {
      if (typeof patch[key] === "string") {
        patch[key] = stripUnsafeHtml(patch[key]);
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

// Internal mutation: update only the README markdown field (no AI content changes).
// Skips the write when the stored content is identical (keeps hourly auto-update
// runs idempotent) and returns whether anything changed for the update log.
export const _updateReadmeOnly = internalMutation({
  args: {
    packageId: v.id("packages"),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      return false;
    }
    const unchanged =
      pkg.readmeIncludedMarkdown === args.readmeIncludedMarkdown &&
      pkg.readmeIncludeSource === args.readmeIncludeSource;
    if (unchanged) {
      return false;
    }
    await ctx.db.patch(args.packageId, {
      readmeIncludedMarkdown: args.readmeIncludedMarkdown,
      readmeIncludeSource: args.readmeIncludeSource,
    });
    return true;
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

// Internal batch worker: pages through packages, builds skillMd where missing
// (or for all packages with v2 content when force is set), and schedules itself
// for the next page to stay within transaction limits.
export const _backfillSkillMdBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    patchedSoFar: v.number(),
    force: v.optional(v.boolean()),
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
      if (pkg.skillMd && !args.force) continue;
      const skillMd = tryBuildSkillMd(pkg);
      if (!skillMd) continue; // v1 model without v2 content; skipped until content is generated
      if (skillMd === pkg.skillMd) continue; // already up to date
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
        { cursor: page.continueCursor, patchedSoFar: total, force: args.force },
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

// Admin mutation: force-rebuild skillMd for ALL approved packages with v2
// content, even if they already have one. Used after skill template changes
// (e.g. version frontmatter, agent instruction line).
export const rebuildAllSkillMd = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);
    await ctx.scheduler.runAfter(
      0,
      internal.seoContentDb._backfillSkillMdBatch,
      { cursor: null, patchedSoFar: 0, force: true },
    );
    return null;
  },
});

// ============ ONE-OFF: FIND STORED MARKDOWN WITH UNSAFE HTML ============
// Lists packages whose markdown fields still hold HTML that stripUnsafeHtml
// would remove (iframes, srcdoc, scripts, event handlers, javascript: URLs
// and so on), i.e. rows saved before write-time cleanup existed. Read only.
//
//   npx convex run --prod seoContentDb:findUnsafeMarkdown
//
// The detail page sanitizes when it renders, so these rows are already safe
// to view there. To clean the stored copy, refresh the README or re-save the
// generated content or long description in admin, which runs it through
// stripUnsafeHtml.

const UNSAFE_SCAN_BATCH_SIZE = 20;

const UNSAFE_SCAN_FIELDS = [
  "longDescription",
  "generatedUseCases",
  "generatedHowItWorks",
  "readmeIncludedMarkdown",
  "skillMd",
] as const;

// What to show for a match, so the result says why a row was flagged
const UNSAFE_SIGNAL_RE =
  /<\s*\/?\s*(?:iframe|script|object|embed|form|style|svg|math|meta|link|base|template)\b|\bsrcdoc\b|\bon[a-z]+\s*=|(?:javascript|vbscript):/gi;

const unsafeMarkdownMatchValidator = v.object({
  packageId: v.id("packages"),
  name: v.string(),
  slug: v.optional(v.string()),
  reviewStatus: v.optional(v.string()),
  fields: v.array(v.string()),
  signals: v.array(v.string()),
});

type UnsafeMarkdownPage = {
  matches: Array<Infer<typeof unsafeMarkdownMatchValidator>>;
  continueCursor: string;
  isDone: boolean;
};

export const _findUnsafeMarkdownPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    matches: v.array(unsafeMarkdownMatchValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args): Promise<UnsafeMarkdownPage> => {
    const page = await ctx.db
      .query("packages")
      .paginate({ numItems: UNSAFE_SCAN_BATCH_SIZE, cursor: args.cursor });

    const matches: UnsafeMarkdownPage["matches"] = [];
    for (const pkg of page.page) {
      const fields = UNSAFE_SCAN_FIELDS.filter((field) => {
        const value = pkg[field];
        return typeof value === "string" && stripUnsafeHtml(value) !== value;
      });
      if (fields.length === 0) continue;

      const signals = new Set<string>();
      for (const field of fields) {
        for (const match of (pkg[field] ?? "").matchAll(UNSAFE_SIGNAL_RE)) {
          signals.add(match[0].toLowerCase().replace(/\s+/g, ""));
        }
      }
      matches.push({
        packageId: pkg._id,
        name: pkg.name,
        slug: pkg.slug,
        reviewStatus: pkg.reviewStatus,
        fields: [...fields],
        signals: [...signals].slice(0, 10),
      });
    }
    return {
      matches,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const findUnsafeMarkdown = internalAction({
  args: {},
  returns: v.array(unsafeMarkdownMatchValidator),
  handler: async (ctx) => {
    const matches: UnsafeMarkdownPage["matches"] = [];
    let cursor: string | null = null;
    for (;;) {
      const page: UnsafeMarkdownPage = await ctx.runQuery(
        internal.seoContentDb._findUnsafeMarkdownPage,
        { cursor },
      );
      matches.push(...page.matches);
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    console.log(`Unsafe markdown scan: ${matches.length} packages flagged`);
    return matches;
  },
});
