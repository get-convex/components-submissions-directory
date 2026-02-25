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
    // Additional emails for multi-account access to this submission
    additionalEmails: v.optional(v.array(v.string())),
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
    // Timestamp when package is approved for public directory sorting
    approvedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    // Featured flag - only approved packages can be featured
    featured: v.optional(v.boolean()),
    // Admin-managed sort order for featured section (lower = first)
    featuredSortOrder: v.optional(v.number()),
    // Soft deletion fields - user marks for deletion, admin permanently deletes
    markedForDeletion: v.optional(v.boolean()),
    markedForDeletionAt: v.optional(v.number()),
    markedForDeletionBy: v.optional(v.string()), // email of user who requested deletion
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

    // --- Directory expansion fields ---
    // URL slug for component detail pages (e.g. "agent", "gilhrpenner/convex-files-control")
    slug: v.optional(v.string()),
    // Component category (ai, auth, backend, database, durable-functions, integrations, payments)
    category: v.optional(v.string()),
    // Searchable tags for filtering (manual + AI-generated)
    tags: v.optional(v.array(v.string())),
    // Short description shown on cards (200 char max)
    shortDescription: v.optional(v.string()),
    // Full markdown description shown on detail page
    longDescription: v.optional(v.string()),
    // Video demo URL (YouTube, Loom, etc.)
    videoUrl: v.optional(v.string()),
    // Thumbnail image URL (external URL or resolved from storage)
    thumbnailUrl: v.optional(v.string()),
    // Convex file storage ID for uploaded thumbnail (16:9, max 3MB)
    thumbnailStorageId: v.optional(v.id("_storage")),
    // --- Logo and thumbnail generation fields ---
    // Convex file storage ID for the user-uploaded logo (png/webp/svg)
    logoStorageId: v.optional(v.id("_storage")),
    // Resolved URL for the uploaded logo (admin-only display)
    logoUrl: v.optional(v.string()),
    // Which template was used to generate the current active thumbnail
    selectedTemplateId: v.optional(v.id("thumbnailTemplates")),
    // Increment to track regeneration version
    thumbnailGenerationVersion: v.optional(v.number()),
    // When the current thumbnail was generated
    thumbnailGeneratedAt: v.optional(v.number()),
    // Who generated it ("auto" for submit flow, admin email for manual)
    thumbnailGeneratedBy: v.optional(v.string()),
    // Convex team has tested and verified this component
    convexVerified: v.optional(v.boolean()),
    // GitHub username of primary author
    authorUsername: v.optional(v.string()),
    // GitHub avatar URL
    authorAvatar: v.optional(v.string()),
    // Human-readable component display name (e.g. "Convex Agent")
    componentName: v.optional(v.string()),
    // Hide thumbnail in category listings (show only in Featured section)
    hideThumbnailInCategory: v.optional(v.boolean()),
    // Hide from submissions page only (still shows on Directory if approved)
    hideFromSubmissions: v.optional(v.boolean()),
    // Related component IDs (admin-managed)
    relatedComponentIds: v.optional(v.array(v.id("packages"))),
    // Cached GitHub issue counts (refreshed via action)
    githubOpenIssues: v.optional(v.number()),
    githubClosedIssues: v.optional(v.number()),
    githubIssuesFetchedAt: v.optional(v.number()),

    // --- AI-generated SEO/AEO/GEO structured content ---
    // One-liner value prop (becomes meta description + AI citation sentence)
    seoValueProp: v.optional(v.string()),
    // 3-4 outcome-focused benefit bullets
    seoBenefits: v.optional(v.array(v.string())),
    // Use cases matching real search queries
    seoUseCases: v.optional(
      v.array(
        v.object({
          query: v.string(),
          answer: v.string(),
        }),
      ),
    ),
    // Self-contained FAQ pairs for AI engine extraction
    seoFaq: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        }),
      ),
    ),
    // Consistent resource links per component
    seoResourceLinks: v.optional(
      v.array(
        v.object({
          label: v.string(),
          url: v.string(),
        }),
      ),
    ),
    // Timestamp of last SEO content generation
    seoGeneratedAt: v.optional(v.number()),
    // Track generation state
    seoGenerationStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("completed"),
        v.literal("error"),
      ),
    ),
    // Error message if generation fails
    seoGenerationError: v.optional(v.string()),
    // AI-generated SKILL.md content for Claude agent skills
    skillMd: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_submitted_at", ["submittedAt"])
    .index("by_approved_at", ["approvedAt"])
    .index("by_review_status", ["reviewStatus"])
    .index("by_visibility", ["visibility"])
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_category_and_visibility", ["category", "visibility"])
    .index("by_submitter_email", ["submitterEmail"])
    .index("by_marked_for_deletion", ["markedForDeletion"])
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
    isAdminReply: v.optional(v.boolean()), // True if this is an admin reply to a user request
    userHasRead: v.optional(v.boolean()), // True if user has seen admin reply
    adminHasRead: v.optional(v.boolean()), // True if admin has seen user request
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
    adminHasRead: v.optional(v.boolean()), // True if admin has seen comment
  })
    .index("by_package", ["packageId"])
    .index("by_package_and_created", ["packageId", "createdAt"]),

  // Admin settings for AI review/SEO automation and auto-refresh
  // Keys: "autoApproveOnPass", "autoRejectOnFail", "autoGenerateSeoOnPendingOrInReview", "autoRefreshEnabled"
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

  // Badge fetch analytics - one row per fetch, aggregate in queries
  // Tracks views when component authors embed badges in their READMEs
  badgeFetches: defineTable({
    slug: v.string(),
    packageId: v.optional(v.id("packages")),
    fetchedAt: v.number(),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_slug_and_fetched_at", ["slug", "fetchedAt"])
    .index("by_package", ["packageId"]),

  // Admin-managed categories for the directory
  categories: defineTable({
    // Unique slug id (e.g. "ai", "auth", "backend")
    slug: v.string(),
    // Display label (e.g. "AI", "Auth")
    label: v.string(),
    // Description shown on directory page
    description: v.string(),
    // Sort order for display
    sortOrder: v.number(),
    // Whether this category is shown in dropdowns and on the directory
    enabled: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_sort_order", ["sortOrder"]),

  // Star ratings for components (one per user session / fingerprint)
  componentRatings: defineTable({
    packageId: v.id("packages"),
    rating: v.number(), // 1-5
    sessionId: v.string(), // anonymous session identifier
    createdAt: v.number(),
  })
    .index("by_package", ["packageId"])
    .index("by_package_and_session", ["packageId", "sessionId"]),

  // Thumbnail background templates for auto-generating 16:9 thumbnails
  // Admin uploads gradient/image backgrounds; user logos get centered on top
  thumbnailTemplates: defineTable({
    // Display name (e.g. "Sunset Coral", "Ocean Breeze")
    name: v.string(),
    // Convex file storage ID for the background image
    storageId: v.id("_storage"),
    // Resolved preview URL for admin display
    previewUrl: v.optional(v.string()),
    // CSS gradient string for reference/fallback (e.g. "linear-gradient(135deg, #ff6b6b 0%, ...)")
    gradient: v.optional(v.string()),
    // Whether this template is available for selection
    active: v.boolean(),
    // Whether this is the default template for auto-generation
    isDefault: v.boolean(),
    // Sort order in admin list
    sortOrder: v.number(),
    // Optional safe area for logo placement (pixels in 1536x864 canvas)
    safeAreaX: v.optional(v.number()),
    safeAreaY: v.optional(v.number()),
    safeAreaWidth: v.optional(v.number()),
    safeAreaHeight: v.optional(v.number()),
  })
    .index("by_active_and_sort", ["active", "sortOrder"])
    .index("by_default", ["isDefault"])
    .index("by_sort_order", ["sortOrder"]),

  // Thumbnail generation job tracking for status/history
  thumbnailJobs: defineTable({
    packageId: v.id("packages"),
    templateId: v.optional(v.id("thumbnailTemplates")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_package", ["packageId"])
    .index("by_status", ["status"])
    .index("by_package_and_created", ["packageId", "createdAt"]),

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

  // AI provider configuration (API keys and models for Anthropic, OpenAI, Gemini)
  aiProviderSettings: defineTable({
    provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("gemini"),
    ),
    apiKey: v.optional(v.string()),
    model: v.optional(v.string()),
    isEnabled: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_provider", ["provider"]),

  // AI review prompt versions (append-only for history)
  aiPromptVersions: defineTable({
    content: v.string(),
    isActive: v.boolean(),
    isDefault: v.boolean(),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
