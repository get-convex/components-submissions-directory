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
      })
    ),
    // Denormalized field for full-text search on maintainer names
    maintainerNames: v.optional(v.string()),
    npmUrl: v.string(),
    submittedAt: v.number(),
    // Submitter info (shown only in admin)
    submitterName: v.optional(v.string()),
    submitterEmail: v.optional(v.string()),
    submitterDiscord: v.optional(v.string()),
    // Review fields
    reviewStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("changes_requested"),
      v.literal("rejected")
    )),
    visibility: v.optional(v.union(
      v.literal("visible"),
      v.literal("hidden"),
      v.literal("archived")
    )),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    // Featured flag - only approved packages can be featured
    featured: v.optional(v.boolean()),
    // AI Review fields
    aiReviewStatus: v.optional(v.union(
      v.literal("not_reviewed"),
      v.literal("reviewing"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error")
    )),
    aiReviewSummary: v.optional(v.string()),
    aiReviewCriteria: v.optional(v.array(v.object({
      name: v.string(),
      passed: v.boolean(),
      notes: v.string(),
    }))),
    aiReviewedAt: v.optional(v.number()),
    aiReviewError: v.optional(v.string()),
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

  // Admin settings for AI review automation
  adminSettings: defineTable({
    key: v.string(),
    value: v.boolean(),
  })
    .index("by_key", ["key"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
