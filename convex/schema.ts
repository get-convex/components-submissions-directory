import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Review status values: pending, in_review, approved, changes_requested, rejected
// Visibility values: visible, hidden, archived

const applicationTables = {
  packages: defineTable({
    name: v.string(),
    description: v.string(),
    installCommand: v.string(),
    repositoryUrl: v.optional(v.string()),
    homepageUrl: v.optional(v.string()),
    version: v.string(),
    license: v.string(),
    unpackedSize: v.number(),
    totalFiles: v.number(),
    lastPublish: v.string(),
    weeklyDownloads: v.number(),
    collaborators: v.array(
      v.object({
        name: v.string(),
        avatar: v.string(),
      }),
    ),
    // Denormalized field for full-text search on maintainer names
    maintainerNames: v.optional(v.string()),
    npmUrl: v.string(),
    submittedAt: v.number(),
    // Submitter info (shown only in admin)
    submitterName: v.optional(v.string()),
    submitterEmail: v.optional(v.string()),
    submitterDiscord: v.optional(v.string()),
    // Live demo URL (optional, submitted by user)
    demoUrl: v.optional(v.string()),
    // Review fields
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_review"),
        v.literal("approved"),
        v.literal("changes_requested"),
        v.literal("rejected"),
      ),
    ),
    visibility: v.optional(
      v.union(v.literal("visible"), v.literal("hidden"), v.literal("archived")),
    ),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    // Featured flag - only approved packages can be featured
    featured: v.optional(v.boolean()),
    // AI Review fields
    aiReviewStatus: v.optional(
      v.union(
        v.literal("not_reviewed"),
        v.literal("reviewing"),
        v.literal("passed"),
        v.literal("failed"),
        v.literal("partial"),
        v.literal("error"),
      ),
    ),
    aiReviewSummary: v.optional(v.string()),
    aiReviewCriteria: v.optional(
      v.array(
        v.object({
          name: v.string(),
          passed: v.boolean(),
          notes: v.string(),
        }),
      ),
    ),
    aiReviewedAt: v.optional(v.number()),
    aiReviewError: v.optional(v.string()),
    // Auto-refresh fields
    lastRefreshedAt: v.optional(v.number()), // Timestamp of last npm data refresh
    refreshError: v.optional(v.string()), // Last refresh error message (if any)
  })
    .index("by_name", ["name"])
    .index("by_submitted_at", ["submittedAt"])
    .index("by_review_status", ["reviewStatus"])
    .index("by_visibility", ["visibility"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["visibility", "reviewStatus"],
    })
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["visibility", "reviewStatus"],
    })
    .searchIndex("search_maintainers", {
      searchField: "maintainerNames",
      filterFields: ["visibility", "reviewStatus"],
    }),

  // Admin notes for packages (internal, admin-only) - supports threading
  packageNotes: defineTable({
    packageId: v.id("packages"),
    content: v.string(),
    authorEmail: v.string(),
    authorName: v.optional(v.string()),
    parentNoteId: v.optional(v.id("packageNotes")), // For threaded replies
    createdAt: v.number(),
  })
    .index("by_package", ["packageId"])
    .index("by_package_and_created", ["packageId", "createdAt"])
    .index("by_parent", ["parentNoteId"]),

  // Public comments for packages - visible on frontend
  packageComments: defineTable({
    packageId: v.id("packages"),
    content: v.string(),
    authorEmail: v.string(),
    authorName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_package", ["packageId"])
    .index("by_package_and_created", ["packageId", "createdAt"]),

  // Admin settings for AI review automation and auto-refresh
  // Keys: "autoApproveOnPass", "autoRejectOnFail", "autoRefreshEnabled"
  // For numeric settings like refreshIntervalDays, store in adminSettingsNumeric
  adminSettings: defineTable({
    key: v.string(),
    value: v.boolean(),
  }).index("by_key", ["key"]),

  // Admin settings for numeric values (e.g., refreshIntervalDays)
  adminSettingsNumeric: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),

  // Refresh logs for tracking auto-refresh and manual refresh runs
  refreshLogs: defineTable({
    runAt: v.number(),
    packagesProcessed: v.number(),
    packagesSucceeded: v.number(),
    packagesFailed: v.number(),
    errors: v.array(
      v.object({
        packageId: v.id("packages"),
        packageName: v.string(),
        error: v.string(),
      }),
    ),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    isManual: v.optional(v.boolean()), // true if triggered by "Refresh All" button
  })
    .index("by_run_at", ["runAt"])
    .index("by_status", ["status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
