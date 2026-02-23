// Thumbnail template management and generation API
// Admin CRUD for background templates and thumbnail generation triggers
import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { requireAdminIdentity } from "./auth";
import { Id } from "./_generated/dataModel";

// ============ TEMPLATE QUERIES ============

// List all active thumbnail templates (sorted by sortOrder)
export const listTemplates = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("thumbnailTemplates"),
      _creationTime: v.number(),
      name: v.string(),
      storageId: v.id("_storage"),
      previewUrl: v.optional(v.string()),
      gradient: v.optional(v.string()),
      active: v.boolean(),
      isDefault: v.boolean(),
      sortOrder: v.number(),
      safeAreaX: v.optional(v.number()),
      safeAreaY: v.optional(v.number()),
      safeAreaWidth: v.optional(v.number()),
      safeAreaHeight: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_sort_order")
      .collect();
  },
});

// List only active templates for selection UIs
export const listActiveTemplates = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("thumbnailTemplates"),
      name: v.string(),
      previewUrl: v.optional(v.string()),
      gradient: v.optional(v.string()),
      isDefault: v.boolean(),
      sortOrder: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_active_and_sort", (q) => q.eq("active", true))
      .collect();
    return templates.map((t) => ({
      _id: t._id,
      name: t.name,
      previewUrl: t.previewUrl,
      gradient: t.gradient,
      isDefault: t.isDefault,
      sortOrder: t.sortOrder,
    }));
  },
});

// Get the current default template
export const getDefaultTemplate = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("thumbnailTemplates"),
      name: v.string(),
      storageId: v.id("_storage"),
      previewUrl: v.optional(v.string()),
      gradient: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const template = await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();
    if (!template) return null;
    return {
      _id: template._id,
      name: template.name,
      storageId: template.storageId,
      previewUrl: template.previewUrl,
      gradient: template.gradient,
    };
  },
});

// ============ TEMPLATE MUTATIONS (admin only) ============

// Helper: verify admin access using shared auth helper
async function requireAdmin(ctx: any): Promise<string> {
  const identity = await requireAdminIdentity(ctx);
  return identity.email ?? "";
}

// Create a new thumbnail template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    storageId: v.id("_storage"),
    gradient: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    safeAreaX: v.optional(v.number()),
    safeAreaY: v.optional(v.number()),
    safeAreaWidth: v.optional(v.number()),
    safeAreaHeight: v.optional(v.number()),
  },
  returns: v.id("thumbnailTemplates"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Resolve preview URL from storage
    const previewUrl = await ctx.storage.getUrl(args.storageId);

    // Get next sort order
    const existing = await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_sort_order")
      .order("desc")
      .first();
    const nextOrder = existing ? existing.sortOrder + 1 : 0;

    const setDefault = args.isDefault ?? false;

    // If setting as default, unset current default
    if (setDefault) {
      const currentDefault = await ctx.db
        .query("thumbnailTemplates")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .first();
      if (currentDefault) {
        await ctx.db.patch(currentDefault._id, { isDefault: false });
      }
    }

    return await ctx.db.insert("thumbnailTemplates", {
      name: args.name,
      storageId: args.storageId,
      previewUrl: previewUrl ?? undefined,
      gradient: args.gradient,
      active: true,
      isDefault: setDefault,
      sortOrder: nextOrder,
      safeAreaX: args.safeAreaX,
      safeAreaY: args.safeAreaY,
      safeAreaWidth: args.safeAreaWidth,
      safeAreaHeight: args.safeAreaHeight,
    });
  },
});

// Update a template (name, active status, safe area, etc.)
export const updateTemplate = mutation({
  args: {
    templateId: v.id("thumbnailTemplates"),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
    gradient: v.optional(v.string()),
    safeAreaX: v.optional(v.number()),
    safeAreaY: v.optional(v.number()),
    safeAreaWidth: v.optional(v.number()),
    safeAreaHeight: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { templateId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(templateId, patch);
    }
    return null;
  },
});

// Set a template as the default (unsets previous default)
export const setDefaultTemplate = mutation({
  args: {
    templateId: v.id("thumbnailTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Unset current default
    const currentDefault = await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();
    if (currentDefault) {
      await ctx.db.patch(currentDefault._id, { isDefault: false });
    }

    // Set new default
    await ctx.db.patch(args.templateId, { isDefault: true, active: true });
    return null;
  },
});

// Delete a template (also removes storage file)
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("thumbnailTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    // Clean up storage
    await ctx.storage.delete(template.storageId);
    await ctx.db.delete(args.templateId);
    return null;
  },
});

// Reorder templates (swap sort orders)
export const reorderTemplates = mutation({
  args: {
    orderedIds: v.array(v.id("thumbnailTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Parallel patch with new sort orders
    const updates = args.orderedIds.map((id, index) =>
      ctx.db.patch(id, { sortOrder: index }),
    );
    await Promise.all(updates);
    return null;
  },
});

// ============ THUMBNAIL JOB TRACKING ============

// Internal: create a thumbnail generation job record
export const _createThumbnailJob = internalMutation({
  args: {
    packageId: v.id("packages"),
    templateId: v.optional(v.id("thumbnailTemplates")),
  },
  returns: v.id("thumbnailJobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("thumbnailJobs", {
      packageId: args.packageId,
      templateId: args.templateId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Internal: update thumbnail job status
export const _updateThumbnailJob = internalMutation({
  args: {
    jobId: v.id("thumbnailJobs"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "processing") {
      patch.startedAt = Date.now();
    }
    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = Date.now();
    }
    if (args.error) {
      patch.error = args.error;
    }
    await ctx.db.patch(args.jobId, patch);
    return null;
  },
});

// Internal: get the default template for generation
export const _getDefaultTemplate = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("thumbnailTemplates"),
      storageId: v.id("_storage"),
      safeAreaX: v.optional(v.number()),
      safeAreaY: v.optional(v.number()),
      safeAreaWidth: v.optional(v.number()),
      safeAreaHeight: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const template = await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();
    if (!template) return null;
    return {
      _id: template._id,
      storageId: template.storageId,
      safeAreaX: template.safeAreaX,
      safeAreaY: template.safeAreaY,
      safeAreaWidth: template.safeAreaWidth,
      safeAreaHeight: template.safeAreaHeight,
    };
  },
});

// Internal: choose template for submit-time auto generation.
// When rotation is enabled, distribute packages across active templates.
export const _getTemplateForSubmit = internalQuery({
  args: { packageId: v.id("packages") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("thumbnailTemplates"),
      storageId: v.id("_storage"),
      safeAreaX: v.optional(v.number()),
      safeAreaY: v.optional(v.number()),
      safeAreaWidth: v.optional(v.number()),
      safeAreaHeight: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const rotateSetting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) =>
        q.eq("key", "rotateThumbnailTemplatesOnSubmit"),
      )
      .first();

    // Default behavior: always use default template.
    if (!rotateSetting?.value) {
      const defaultTemplate = await ctx.db
        .query("thumbnailTemplates")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .first();
      if (!defaultTemplate) return null;
      return {
        _id: defaultTemplate._id,
        storageId: defaultTemplate.storageId,
        safeAreaX: defaultTemplate.safeAreaX,
        safeAreaY: defaultTemplate.safeAreaY,
        safeAreaWidth: defaultTemplate.safeAreaWidth,
        safeAreaHeight: defaultTemplate.safeAreaHeight,
      };
    }

    // Rotation behavior: spread by package id hash across active templates.
    const activeTemplates = await ctx.db
      .query("thumbnailTemplates")
      .withIndex("by_active_and_sort", (q) => q.eq("active", true))
      .collect();
    if (activeTemplates.length === 0) return null;

    const hash = Array.from(args.packageId).reduce(
      (acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0,
      7,
    );
    const picked = activeTemplates[hash % activeTemplates.length];

    return {
      _id: picked._id,
      storageId: picked.storageId,
      safeAreaX: picked.safeAreaX,
      safeAreaY: picked.safeAreaY,
      safeAreaWidth: picked.safeAreaWidth,
      safeAreaHeight: picked.safeAreaHeight,
    };
  },
});

// Internal: get template by ID for generation
export const _getTemplateById = internalQuery({
  args: { templateId: v.id("thumbnailTemplates") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("thumbnailTemplates"),
      storageId: v.id("_storage"),
      safeAreaX: v.optional(v.number()),
      safeAreaY: v.optional(v.number()),
      safeAreaWidth: v.optional(v.number()),
      safeAreaHeight: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;
    return {
      _id: template._id,
      storageId: template.storageId,
      safeAreaX: template.safeAreaX,
      safeAreaY: template.safeAreaY,
      safeAreaWidth: template.safeAreaWidth,
      safeAreaHeight: template.safeAreaHeight,
    };
  },
});

// Internal: get package logo storage ID for generation
export const _getPackageLogo = internalQuery({
  args: { packageId: v.id("packages") },
  returns: v.union(
    v.null(),
    v.object({
      logoStorageId: v.id("_storage"),
    }),
  ),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || !pkg.logoStorageId) return null;
    return { logoStorageId: pkg.logoStorageId };
  },
});

// Internal: save generated thumbnail to package
export const _saveGeneratedThumbnail = internalMutation({
  args: {
    packageId: v.id("packages"),
    storageId: v.id("_storage"),
    templateId: v.optional(v.id("thumbnailTemplates")),
    generatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(args.packageId, {
      thumbnailStorageId: args.storageId,
      thumbnailUrl: url ?? undefined,
      selectedTemplateId: args.templateId,
      thumbnailGeneratedAt: Date.now(),
      thumbnailGeneratedBy: args.generatedBy,
      thumbnailGenerationVersion:
        ((await ctx.db.get(args.packageId))?.thumbnailGenerationVersion ?? 0) +
        1,
    });
    return null;
  },
});

// Internal: check if auto-generate thumbnail is enabled
export const _getAutoGenerateThumbnailEnabled = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) =>
        q.eq("key", "autoGenerateThumbnailOnSubmit"),
      )
      .first();
    return setting?.value || false;
  },
});

// Internal: get packages that have logos for batch regen
export const _getPackagesWithLogos = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      thumbnailUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const all = await ctx.db.query("packages").collect();
    const withLogos: Array<{ _id: Id<"packages">; thumbnailUrl?: string }> = [];
    for (const p of all) {
      if (p.logoStorageId) {
        withLogos.push({ _id: p._id, thumbnailUrl: p.thumbnailUrl });
      }
    }
    return withLogos;
  },
});

// Get thumbnail generation jobs for a package (admin display)
export const getPackageThumbnailJobs = query({
  args: { packageId: v.id("packages") },
  returns: v.array(
    v.object({
      _id: v.id("thumbnailJobs"),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      error: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("thumbnailJobs")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("desc")
      .take(10);
    return jobs.map((j) => ({
      _id: j._id,
      status: j.status,
      error: j.error,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    }));
  },
});

// ============ CLEANUP: Remove old failed jobs (runs via cron) ============

// Internal: clean up failed thumbnail jobs older than 7 days
export const _cleanupOldThumbnailJobs = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldJobs = await ctx.db
      .query("thumbnailJobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    let deleted = 0;
    for (const job of oldJobs) {
      if (job.createdAt < cutoff) {
        await ctx.db.delete(job._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
