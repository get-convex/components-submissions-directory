import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  internalQuery,
  internalMutation,
  internalAction,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { getAdminIdentity, requireAdminIdentity, getAuthUserId } from "./auth";
import { api, internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";

// ============ HELPER: Get current user's email from database ============
// @convex-dev/auth stores user data in the users table, not in JWT claims
async function getCurrentUserEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  
  const user = await ctx.db.get(userId);
  return user?.email ?? null;
}

// ============ HELPER: Check if user owns a package ============
// Checks both submitterEmail and additionalEmails array
function userOwnsPackage(pkg: Doc<"packages">, userEmail: string): boolean {
  if (pkg.submitterEmail === userEmail) return true;
  if (pkg.additionalEmails?.includes(userEmail)) return true;
  return false;
}

// ============ SECURITY: Public-safe package fields ============
// These fields are safe to expose to the public frontend
// Sensitive fields like submitterEmail, submitterName, submitterDiscord,
// and AI review details are excluded from public queries

const publicPackageValidator = v.object({
  _id: v.id("packages"),
  _creationTime: v.number(),
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
  maintainerNames: v.optional(v.string()),
  npmUrl: v.string(),
  submittedAt: v.number(),
  approvedAt: v.optional(v.number()),
  // Live demo URL (optional)
  demoUrl: v.optional(v.string()),
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
  // Featured flag (public)
  featured: v.optional(v.boolean()),
  // Only expose AI review status, NOT the detailed results
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
  // --- Directory expansion fields (public) ---
  slug: v.optional(v.string()),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  shortDescription: v.optional(v.string()),
  longDescription: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  convexVerified: v.optional(v.boolean()),
  authorUsername: v.optional(v.string()),
  authorAvatar: v.optional(v.string()),
  componentName: v.optional(v.string()),
  relatedComponentIds: v.optional(v.array(v.id("packages"))),
  // Cached GitHub issue counts
  githubOpenIssues: v.optional(v.number()),
  githubClosedIssues: v.optional(v.number()),
  githubIssuesFetchedAt: v.optional(v.number()),
  // --- AI-generated SEO/AEO/GEO content (public) ---
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
  seoGeneratedAt: v.optional(v.number()),
  seoGenerationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error"),
    ),
  ),
  // AI-generated SKILL.md content for Claude agent skills
  skillMd: v.optional(v.string()),
});

// ============ SECURITY: Admin package fields ============
// These fields include sensitive submitter info for admin dashboard only
// Used by getAllPackages and adminSearchPackages
const adminPackageValidator = v.object({
  _id: v.id("packages"),
  _creationTime: v.number(),
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
  maintainerNames: v.optional(v.string()),
  npmUrl: v.string(),
  submittedAt: v.number(),
  approvedAt: v.optional(v.number()),
  // Submitter info (admin only)
  submitterName: v.optional(v.string()),
  submitterEmail: v.optional(v.string()),
  submitterDiscord: v.optional(v.string()),
  additionalEmails: v.optional(v.array(v.string())),
  // Live demo URL
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
  // Refresh fields
  lastRefreshedAt: v.optional(v.number()),
  refreshError: v.optional(v.string()),
  // --- Directory expansion fields (admin) ---
  slug: v.optional(v.string()),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  shortDescription: v.optional(v.string()),
  longDescription: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  // Logo fields (admin-only display)
  logoStorageId: v.optional(v.id("_storage")),
  logoUrl: v.optional(v.string()),
  selectedTemplateId: v.optional(v.id("thumbnailTemplates")),
  thumbnailGeneratedAt: v.optional(v.number()),
  convexVerified: v.optional(v.boolean()),
  authorUsername: v.optional(v.string()),
  authorAvatar: v.optional(v.string()),
  componentName: v.optional(v.string()),
  relatedComponentIds: v.optional(v.array(v.id("packages"))),
  // Cached GitHub issue counts
  githubOpenIssues: v.optional(v.number()),
  githubClosedIssues: v.optional(v.number()),
  githubIssuesFetchedAt: v.optional(v.number()),
  // --- AI-generated SEO/AEO/GEO content (admin) ---
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
  seoGeneratedAt: v.optional(v.number()),
  seoGenerationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error"),
    ),
  ),
  seoGenerationError: v.optional(v.string()),
  // Deletion fields
  markedForDeletion: v.optional(v.boolean()),
  markedForDeletionAt: v.optional(v.number()),
  markedForDeletionBy: v.optional(v.string()),
});

// Helper function to strip sensitive fields from a package
// SECURITY: Removes submitter info and AI review details
function toPublicPackage(pkg: any) {
  return {
    _id: pkg._id,
    _creationTime: pkg._creationTime,
    name: pkg.name || "",
    description: pkg.description || "",
    installCommand: pkg.installCommand || `npm install ${pkg.name || ""}`,
    repositoryUrl: pkg.repositoryUrl,
    homepageUrl: pkg.homepageUrl,
    version: pkg.version || "0.0.0",
    license: pkg.license || "Unknown",
    unpackedSize: pkg.unpackedSize ?? 0,
    totalFiles: pkg.totalFiles ?? 0,
    lastPublish: pkg.lastPublish || new Date().toISOString(),
    weeklyDownloads: pkg.weeklyDownloads ?? 0,
    collaborators: pkg.collaborators || [],
    maintainerNames: pkg.maintainerNames,
    npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
    submittedAt: pkg.submittedAt ?? pkg._creationTime ?? Date.now(),
    approvedAt: pkg.approvedAt,
    demoUrl: pkg.demoUrl,
    reviewStatus: pkg.reviewStatus,
    visibility: pkg.visibility,
    featured: pkg.featured,
    // Only expose status, not summary/criteria/error
    aiReviewStatus: pkg.aiReviewStatus,
    // Directory expansion fields
    slug: pkg.slug,
    category: pkg.category,
    tags: pkg.tags,
    shortDescription: pkg.shortDescription,
    longDescription: pkg.longDescription,
    videoUrl: pkg.videoUrl,
    thumbnailUrl: pkg.thumbnailUrl,
    convexVerified: pkg.convexVerified,
    authorUsername: pkg.authorUsername,
    authorAvatar: pkg.authorAvatar,
    componentName: pkg.componentName,
    relatedComponentIds: pkg.relatedComponentIds,
    githubOpenIssues: pkg.githubOpenIssues,
    githubClosedIssues: pkg.githubClosedIssues,
    githubIssuesFetchedAt: pkg.githubIssuesFetchedAt,
    // SEO content (public, no error field)
    seoValueProp: pkg.seoValueProp,
    seoBenefits: pkg.seoBenefits,
    seoUseCases: pkg.seoUseCases,
    seoFaq: pkg.seoFaq,
    seoResourceLinks: pkg.seoResourceLinks,
    seoGeneratedAt: pkg.seoGeneratedAt,
    seoGenerationStatus: pkg.seoGenerationStatus,
    skillMd: pkg.skillMd,
  };
}

// Helper function to normalize admin package data with default values
// Ensures older documents with missing fields don't break validators
function toAdminPackage(pkg: any) {
  return {
    _id: pkg._id,
    _creationTime: pkg._creationTime,
    name: pkg.name || "",
    description: pkg.description || "",
    installCommand: pkg.installCommand || `npm install ${pkg.name || ""}`,
    repositoryUrl: pkg.repositoryUrl,
    homepageUrl: pkg.homepageUrl,
    version: pkg.version || "0.0.0",
    license: pkg.license || "Unknown",
    unpackedSize: pkg.unpackedSize ?? 0,
    totalFiles: pkg.totalFiles ?? 0,
    lastPublish: pkg.lastPublish || new Date().toISOString(),
    weeklyDownloads: pkg.weeklyDownloads ?? 0,
    collaborators: pkg.collaborators || [],
    maintainerNames: pkg.maintainerNames,
    npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
    submittedAt: pkg.submittedAt ?? pkg._creationTime ?? Date.now(),
    approvedAt: pkg.approvedAt,
    // Submitter info (admin only)
    submitterName: pkg.submitterName,
    submitterEmail: pkg.submitterEmail,
    submitterDiscord: pkg.submitterDiscord,
    additionalEmails: pkg.additionalEmails,
    // Live demo URL
    demoUrl: pkg.demoUrl,
    // Review fields
    reviewStatus: pkg.reviewStatus,
    visibility: pkg.visibility,
    reviewedBy: pkg.reviewedBy,
    reviewedAt: pkg.reviewedAt,
    reviewNotes: pkg.reviewNotes,
    featured: pkg.featured,
    // AI Review fields
    aiReviewStatus: pkg.aiReviewStatus,
    aiReviewSummary: pkg.aiReviewSummary,
    aiReviewCriteria: pkg.aiReviewCriteria,
    aiReviewedAt: pkg.aiReviewedAt,
    aiReviewError: pkg.aiReviewError,
    // Refresh fields
    lastRefreshedAt: pkg.lastRefreshedAt,
    refreshError: pkg.refreshError,
    // Directory expansion fields
    slug: pkg.slug,
    category: pkg.category,
    tags: pkg.tags,
    shortDescription: pkg.shortDescription,
    longDescription: pkg.longDescription,
    videoUrl: pkg.videoUrl,
    thumbnailUrl: pkg.thumbnailUrl,
    // Logo fields (admin-only)
    logoStorageId: pkg.logoStorageId,
    logoUrl: pkg.logoUrl,
    selectedTemplateId: pkg.selectedTemplateId,
    thumbnailGeneratedAt: pkg.thumbnailGeneratedAt,
    convexVerified: pkg.convexVerified,
    authorUsername: pkg.authorUsername,
    authorAvatar: pkg.authorAvatar,
    componentName: pkg.componentName,
    relatedComponentIds: pkg.relatedComponentIds,
    githubOpenIssues: pkg.githubOpenIssues,
    githubClosedIssues: pkg.githubClosedIssues,
    githubIssuesFetchedAt: pkg.githubIssuesFetchedAt,
    // SEO content (admin includes error field)
    seoValueProp: pkg.seoValueProp,
    seoBenefits: pkg.seoBenefits,
    seoUseCases: pkg.seoUseCases,
    seoFaq: pkg.seoFaq,
    seoResourceLinks: pkg.seoResourceLinks,
    seoGeneratedAt: pkg.seoGeneratedAt,
    seoGenerationStatus: pkg.seoGenerationStatus,
    seoGenerationError: pkg.seoGenerationError,
    // Deletion fields
    markedForDeletion: pkg.markedForDeletion,
    markedForDeletionAt: pkg.markedForDeletionAt,
    markedForDeletionBy: pkg.markedForDeletionBy,
  };
}

// Generate slug from npm package name (server-side version)
// @convex-dev/agent -> "agent", @scope/name -> "scope/name", unscoped -> as-is
function generateSlugFromName(npmPackageName: string): string {
  if (!npmPackageName) return "";
  if (npmPackageName.startsWith("@")) {
    const parts = npmPackageName.slice(1).split("/");
    if (parts.length !== 2) return npmPackageName;
    const [scope, name] = parts;
    if (scope === "convex-dev") return name;
    return `${scope}/${name}`;
  }
  return npmPackageName;
}

export const fetchNpmPackage = action({
  args: { packageName: v.string() },
  handler: async (ctx, args) => {
    const name = decodeURIComponent(args.packageName.trim());

    // For scoped packages (@scope/name), encode the slash between scope and name
    // npm registry requires: @scope%2Fname format
    const encodedName = name.startsWith("@") ? name.replace("/", "%2F") : name;
    const registryUrl = `https://registry.npmjs.org/${encodedName}`;

    // Use encodeURIComponent for the downloads API
    const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`;

    const [metadataResponse, downloadsResponse] = await Promise.all([
      fetch(registryUrl, { method: "GET" }),
      fetch(downloadsUrl, { method: "GET" }),
    ]);

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to fetch registry metadata for "${name}": ${metadataResponse.status} ${metadataResponse.statusText}`,
      );
    }

    // downloads API is optional: if it fails, just set weeklyDownloads = 0
    let weeklyDownloads = 0;
    if (downloadsResponse.ok) {
      const downloadsData = await downloadsResponse.json();
      weeklyDownloads = downloadsData.downloads ?? 0;
    }

    const metadata = await metadataResponse.json();

    // Get latest version info
    const latestVersion = metadata["dist-tags"]?.latest;
    if (!latestVersion) {
      throw new Error("No latest version found for package");
    }

    const versionData = metadata.versions?.[latestVersion];
    if (!versionData) {
      throw new Error("Version data not found");
    }

    // Extract repository URL
    let repositoryUrl: string | undefined;
    if (versionData.repository) {
      if (typeof versionData.repository === "string") {
        repositoryUrl = versionData.repository;
      } else if (versionData.repository.url) {
        repositoryUrl = versionData.repository.url
          .replace(/^git\+/, "")
          .replace(/\.git$/, "");
      }
    }

    // Extract collaborators from maintainers
    const maintainers = versionData.maintainers ?? metadata.maintainers ?? [];
    const collaborators = maintainers.map(
      (maintainer: { name: string; email?: string }) => ({
        name: maintainer.name,
        avatar: `https://www.gravatar.com/avatar/${maintainer.name}?d=identicon`,
      }),
    );

    // Get last publish time
    const lastPublish =
      metadata.time?.[latestVersion] || new Date().toISOString();

    return {
      name,
      description: versionData.description || "No description available",
      installCommand: `npm install ${name}`,
      repositoryUrl,
      homepageUrl: versionData.homepage,
      version: latestVersion,
      license: versionData.license || "Unknown",
      unpackedSize: versionData.dist?.unpackedSize || 0,
      totalFiles: versionData.dist?.fileCount || 0,
      lastPublish,
      weeklyDownloads,
      collaborators,
      npmUrl: `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
    };
  },
});

// Admin action: Refresh npm data for a specific package
export const refreshNpmData = action({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // SECURITY: Use internal query to get full package data
    const pkg = await ctx.runQuery(internal.packages._getPackage, {
      packageId: args.packageId,
    });

    if (!pkg) {
      throw new Error("Package not found");
    }

    try {
      // Fetch fresh data from npm
      const packageData: any = await ctx.runAction(
        api.packages.fetchNpmPackage,
        {
          packageName: pkg.name,
        },
      );

      // Preserve existing repositoryUrl if already set (don't overwrite with npm data)
      // Only use npm's repositoryUrl if the package doesn't have one
      const repositoryUrl = pkg.repositoryUrl || packageData.repositoryUrl;

      // Preserve existing homepageUrl if already set
      const homepageUrl = pkg.homepageUrl || packageData.homepageUrl;

      // Update the package with fresh npm data (preserves submitter info, review status, etc.)
      await ctx.runMutation(api.packages.updateNpmData, {
        packageId: args.packageId,
        description: packageData.description,
        version: packageData.version,
        license: packageData.license,
        repositoryUrl,
        homepageUrl,
        unpackedSize: packageData.unpackedSize,
        totalFiles: packageData.totalFiles,
        lastPublish: packageData.lastPublish,
        weeklyDownloads: packageData.weeklyDownloads,
        collaborators: packageData.collaborators,
      });

      // Update refresh timestamp and clear any previous error
      await ctx.runMutation(internal.packages._updatePackageRefreshTimestamp, {
        packageId: args.packageId,
        clearError: true,
      });
    } catch (error) {
      // Set error on package so admin can see what failed
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.packages._setPackageRefreshError, {
        packageId: args.packageId,
        error: errorMessage,
      });
      throw error;
    }

    return null;
  },
});

export const submitPackage = action({
  args: {
    repositoryUrl: v.string(),
    npmUrl: v.string(),
    submitterName: v.string(),
    submitterEmail: v.string(),
    submitterDiscord: v.optional(v.string()),
    demoUrl: v.string(),
    // Directory expansion: new submission fields
    componentName: v.string(),
    category: v.optional(v.string()),
    shortDescription: v.string(),
    longDescription: v.string(),
    tags: v.optional(v.string()), // Comma-separated string, split on backend
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Require authentication to submit packages
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to submit a package. Please sign in first.");
    }

    const repositoryUrl = args.repositoryUrl.trim();
    const npmUrl = args.npmUrl.trim();
    const componentName = args.componentName.trim();
    const shortDescription = args.shortDescription.trim();
    const longDescription = args.longDescription.trim();
    const demoUrl = args.demoUrl.trim();

    if (!componentName || !shortDescription || !longDescription || !demoUrl) {
      throw new Error("Please fill in all required fields.");
    }

    const parsedRepo = parseGitHubRepo(repositoryUrl);
    if (!parsedRepo) {
      throw new Error(
        "Invalid GitHub repository URL. Expected format: https://github.com/owner/repo",
      );
    }

    // Parse package name from URL
    // Handles: https://www.npmjs.com/package/@convex-dev/agent or https://www.npmjs.com/package/react
    // For scoped packages, capture @scope/name together
    const urlMatch = npmUrl.match(
      /npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/,
    );
    if (!urlMatch) {
      throw new Error(
        "Invalid npm URL. Expected format: https://www.npmjs.com/package/package-name",
      );
    }

    const packageName = decodeURIComponent(urlMatch[1]);

    // SECURITY: Use internal query to check if package already exists
    const existing = await ctx.runQuery(internal.packages._getPackageByName, {
      name: packageName,
    });

    if (existing) {
      throw new Error("Package already submitted");
    }

    // Fetch package data from npm
    const packageData: any = await ctx.runAction(api.packages.fetchNpmPackage, {
      packageName,
    });

    // Generate slug from package name
    const slug = generateSlugFromName(packageName);

    // Parse tags from comma-separated string
    const parsedTags = args.tags
      ? args.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : undefined;

    // Auto-extract author info from GitHub repository URL
    let authorUsername: string | undefined;
    let authorAvatar: string | undefined;
    if (parsedRepo) {
      authorUsername = parsedRepo.owner;
      authorAvatar = `https://github.com/${parsedRepo.owner}.png`;
    }

    // Insert into database with submitter info and new directory fields
    const packageId = await ctx.runMutation(api.packages.addPackage, {
      ...packageData,
      repositoryUrl,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      submitterDiscord: args.submitterDiscord,
      demoUrl,
      slug,
      componentName,
      category: args.category,
      shortDescription,
      longDescription,
      tags: parsedTags,
      videoUrl: args.videoUrl,
      authorUsername,
      authorAvatar,
    });

    // Check if auto-approve or auto-reject is enabled
    // If so, automatically trigger AI review in background
    const settings = await ctx.runQuery(api.packages.getAdminSettings);
    const autoApproveEnabled = settings.autoApproveOnPass || false;
    const autoRejectEnabled = settings.autoRejectOnFail || false;

    if (
      (autoApproveEnabled || autoRejectEnabled) &&
      args.repositoryUrl
    ) {
      // Schedule AI review to run immediately in background
      // Package is already in database, so user sees it while AI reviews
      await ctx.scheduler.runAfter(0, api.aiReview.runAiReview, {
        packageId,
      });
    }

    return packageId;
  },
});

export const addPackage = mutation({
  args: {
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
    npmUrl: v.string(),
    // Submitter info (shown only in admin)
    submitterName: v.string(),
    submitterEmail: v.string(),
    submitterDiscord: v.optional(v.string()),
    // Live demo URL (optional)
    demoUrl: v.optional(v.string()),
    // Directory expansion fields from submission form
    slug: v.optional(v.string()),
    componentName: v.optional(v.string()),
    category: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    authorUsername: v.optional(v.string()),
    authorAvatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create denormalized maintainer names string for search
    const maintainerNames = args.collaborators.map((c) => c.name).join(" ");

    // Check if package already exists
    const existing = await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Update existing package (keep existing submitter info)
      await ctx.db.patch("packages", existing._id, {
        description: args.description,
        installCommand: args.installCommand,
        repositoryUrl: args.repositoryUrl,
        homepageUrl: args.homepageUrl,
        version: args.version,
        license: args.license,
        unpackedSize: args.unpackedSize,
        totalFiles: args.totalFiles,
        lastPublish: args.lastPublish,
        weeklyDownloads: args.weeklyDownloads,
        collaborators: args.collaborators,
        maintainerNames,
        npmUrl: args.npmUrl,
        submittedAt: Date.now(),
        reviewStatus: existing.reviewStatus ?? "pending",
        visibility: existing.visibility ?? "visible",
      });
      return existing._id;
    }

    // Insert new package with submitter info, maintainer names, and directory fields
    return await ctx.db.insert("packages", {
      name: args.name,
      description: args.description,
      installCommand: args.installCommand,
      repositoryUrl: args.repositoryUrl,
      homepageUrl: args.homepageUrl,
      version: args.version,
      license: args.license,
      unpackedSize: args.unpackedSize,
      totalFiles: args.totalFiles,
      lastPublish: args.lastPublish,
      weeklyDownloads: args.weeklyDownloads,
      collaborators: args.collaborators,
      npmUrl: args.npmUrl,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      submitterDiscord: args.submitterDiscord,
      demoUrl: args.demoUrl,
      maintainerNames,
      submittedAt: Date.now(),
      reviewStatus: "pending",
      visibility: "visible",
      // Directory expansion fields
      slug: args.slug,
      componentName: args.componentName,
      category: args.category,
      shortDescription: args.shortDescription,
      longDescription: args.longDescription,
      tags: args.tags,
      videoUrl: args.videoUrl,
      authorUsername: args.authorUsername,
      authorAvatar: args.authorAvatar,
    });
  },
});

// Admin mutation: Update npm data for a package (preserves submitter info, review status, etc.)
export const updateNpmData = mutation({
  args: {
    packageId: v.id("packages"),
    description: v.string(),
    version: v.string(),
    license: v.string(),
    repositoryUrl: v.optional(v.string()),
    homepageUrl: v.optional(v.string()),
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create denormalized maintainer names string for search
    const maintainerNames = args.collaborators.map((c) => c.name).join(" ");

    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch("packages", args.packageId, {
      description: args.description,
      version: args.version,
      license: args.license,
      repositoryUrl: args.repositoryUrl,
      homepageUrl: args.homepageUrl,
      unpackedSize: args.unpackedSize,
      totalFiles: args.totalFiles,
      lastPublish: args.lastPublish,
      weeklyDownloads: args.weeklyDownloads,
      collaborators: args.collaborators,
      maintainerNames,
    });

    return null;
  },
});

// SECURITY: Public query - filters out sensitive submitter info and AI review details
export const listPackages = query({
  args: {
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("downloads"),
        v.literal("updated"),
      ),
    ),
  },
  returns: v.array(publicPackageValidator),
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "newest";

    // Get all packages and filter to only visible ones for public view
    // All submissions are visible by default (pending included), admins can hide/archive
    const allPackages = await ctx.db.query("packages").collect();

    // Filter: show packages that are visible (or no visibility set = visible by default)
    // Hidden, archived, and marked-for-deletion packages are excluded from public view
    const publicPackages = allPackages.filter((pkg) => {
      const isVisible = !pkg.visibility || pkg.visibility === "visible";
      return isVisible && !pkg.markedForDeletion;
    });

    let sortedPackages;
    if (sortBy === "newest") {
      sortedPackages = publicPackages
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 50);
    } else if (sortBy === "downloads") {
      sortedPackages = publicPackages
        .sort((a, b) => b.weeklyDownloads - a.weeklyDownloads)
        .slice(0, 50);
    } else if (sortBy === "updated") {
      sortedPackages = publicPackages
        .sort(
          (a, b) =>
            new Date(b.lastPublish).getTime() -
            new Date(a.lastPublish).getTime(),
        )
        .slice(0, 50);
    } else {
      sortedPackages = publicPackages.slice(0, 50);
    }

    // SECURITY: Strip sensitive fields before returning to client
    return sortedPackages.map(toPublicPackage);
  },
});

// SECURITY: Admin-only query - requires @convex.dev email authentication
// Returns full package data including sensitive submitter info for admin dashboard
export const getAllPackages = query({
  args: {},
  returns: v.array(adminPackageValidator),
  handler: async (ctx) => {
    // Check if user is authenticated and is an admin
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return [];
    }

    // Admin authenticated - return full data
    const packages = await ctx.db.query("packages").collect();
    // Normalize data to ensure all required fields have default values
    return packages.map(toAdminPackage);
  },
});

// SECURITY: Public search - filters out sensitive submitter info and AI review details
export const searchPackages = query({
  args: { searchTerm: v.string() },
  returns: v.array(publicPackageValidator),
  handler: async (ctx, args) => {
    // If no search term, return all visible packages sorted by newest
    if (!args.searchTerm.trim()) {
      const allPackages = await ctx.db.query("packages").collect();
      const filtered = allPackages
        .filter(
          (pkg) =>
            (!pkg.visibility || pkg.visibility === "visible") &&
            !pkg.markedForDeletion,
        )
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 50);
      // SECURITY: Strip sensitive fields before returning to client
      return filtered.map(toPublicPackage);
    }

    // Search by name using Convex full-text search
    const nameResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchTerm))
      .take(50);

    // Search by description using Convex full-text search
    const descriptionResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_description", (q) =>
        q.search("description", args.searchTerm),
      )
      .take(50);

    // Search by maintainer names using Convex full-text search
    const maintainerResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_maintainers", (q) =>
        q.search("maintainerNames", args.searchTerm),
      )
      .take(50);

    // Combine results and deduplicate by _id
    const seen = new Set<string>();
    const combined: typeof nameResults = [];

    for (const pkg of [
      ...nameResults,
      ...descriptionResults,
      ...maintainerResults,
    ]) {
      if (!seen.has(pkg._id)) {
        seen.add(pkg._id);
        // Filter to only visible packages (not hidden, not marked for deletion)
        if (
          (!pkg.visibility || pkg.visibility === "visible") &&
          !pkg.markedForDeletion
        ) {
          combined.push(pkg);
        }
      }
    }

    // SECURITY: Strip sensitive fields before returning to client
    return combined.slice(0, 50).map(toPublicPackage);
  },
});

// SECURITY: Admin-only search - requires @convex.dev email authentication
// Searches all packages by name, description, or maintainer names
export const adminSearchPackages = query({
  args: { searchTerm: v.string() },
  returns: v.array(adminPackageValidator),
  handler: async (ctx, args) => {
    // SECURITY: Check if user is authenticated and is an admin
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return [];
    }

    // If no search term, return all packages sorted by newest
    if (!args.searchTerm.trim()) {
      const packages = await ctx.db
        .query("packages")
        .withIndex("by_submitted_at")
        .order("desc")
        .take(100);
      // Normalize data to ensure all required fields have default values
      return packages.map(toAdminPackage);
    }

    // Search by name using Convex full-text search
    const nameResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchTerm))
      .take(100);

    // Search by description using Convex full-text search
    const descriptionResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_description", (q) =>
        q.search("description", args.searchTerm),
      )
      .take(100);

    // Search by maintainer names using Convex full-text search
    const maintainerResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_maintainers", (q) =>
        q.search("maintainerNames", args.searchTerm),
      )
      .take(100);

    // Combine results and deduplicate by _id
    const seen = new Set<string>();
    const combined: typeof nameResults = [];

    for (const pkg of [
      ...nameResults,
      ...descriptionResults,
      ...maintainerResults,
    ]) {
      if (!seen.has(pkg._id)) {
        seen.add(pkg._id);
        combined.push(pkg);
      }
    }

    // Normalize data to ensure all required fields have default values
    return combined.slice(0, 100).map(toAdminPackage);
  },
});

// SECURITY: Internal query for backend use only (e.g., AI review action)
// Returns full package data including sensitive fields
export const _getPackage = internalQuery({
  args: { packageId: v.id("packages") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.get("packages", args.packageId);
  },
});

// SECURITY: Public query - returns safe package data only
export const getPackage = query({
  args: { packageId: v.id("packages") },
  returns: v.union(v.null(), publicPackageValidator),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get("packages", args.packageId);
    if (!pkg) return null;
    // SECURITY: Strip sensitive fields before returning to client
    return toPublicPackage(pkg);
  },
});

// SECURITY: Internal query for backend use only (e.g., checking existence in submitPackage)
// Returns full package data including sensitive fields
export const _getPackageByName = internalQuery({
  args: { name: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// SECURITY: Public query - returns safe package data only
export const getPackageByName = query({
  args: { name: v.string() },
  returns: v.union(v.null(), publicPackageValidator),
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (!pkg) return null;
    // SECURITY: Strip sensitive fields before returning to client
    return toPublicPackage(pkg);
  },
});

// Admin mutation: Update review status
export const updateReviewStatus = mutation({
  args: {
    packageId: v.id("packages"),
    reviewStatus: v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("changes_requested"),
      v.literal("rejected"),
    ),
    reviewNotes: v.optional(v.string()),
    reviewedBy: v.string(), // Identifier for who reviewed (e.g., "AI" or admin name)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reviewedAt = Date.now();
    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch("packages", args.packageId, {
      reviewStatus: args.reviewStatus,
      reviewedBy: args.reviewedBy,
      reviewedAt,
      ...(args.reviewStatus === "approved" && { approvedAt: reviewedAt }),
      ...(args.reviewNotes !== undefined && { reviewNotes: args.reviewNotes }),
    });

    // Auto-generate SEO content when approved, or on pending/in_review if enabled
    let shouldAutoGenerateSeo =
      args.reviewStatus === "approved" ||
      args.reviewStatus === "pending" ||
      args.reviewStatus === "in_review";

    if (args.reviewStatus === "pending" || args.reviewStatus === "in_review") {
      const autoGenerateOnReviewState = await ctx.db
        .query("adminSettings")
        .withIndex("by_key", (q) =>
          q.eq("key", "autoGenerateSeoOnPendingOrInReview"),
        )
        .first();
      shouldAutoGenerateSeo = autoGenerateOnReviewState?.value || false;
    }

    if (shouldAutoGenerateSeo) {
      const pkg = await ctx.db.get("packages", args.packageId);
      if (pkg && !pkg.seoGeneratedAt) {
        await ctx.scheduler.runAfter(
          0,
          internal.seoContent.generateSeoContent,
          { packageId: args.packageId },
        );
      }
    }

    return null;
  },
});

// Admin mutation: Update visibility (hide, show, archive)
export const updateVisibility = mutation({
  args: {
    packageId: v.id("packages"),
    visibility: v.union(
      v.literal("visible"),
      v.literal("hidden"),
      v.literal("archived"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("packages", args.packageId, {
      visibility: args.visibility,
    });
    return null;
  },
});

// Admin mutation: Delete package permanently
export const deletePackage = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("packages", args.packageId);
    return null;
  },
});

// Admin mutation: Toggle featured status (only approved packages can be featured)
export const toggleFeatured = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the package to check its current state
    const pkg = await ctx.db.get("packages", args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }

    // Only approved packages can be featured
    if (pkg.reviewStatus !== "approved") {
      throw new Error("Only approved packages can be featured");
    }

    // Toggle featured status
    await ctx.db.patch("packages", args.packageId, {
      featured: !pkg.featured,
    });
    return null;
  },
});

// SECURITY: Admin-only query - requires @convex.dev email authentication
// Get packages filtered by review status
export const getPackagesByStatus = query({
  args: {
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_review"),
        v.literal("approved"),
        v.literal("changes_requested"),
        v.literal("rejected"),
        v.literal("all"),
      ),
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      _creationTime: v.number(),
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
      maintainerNames: v.optional(v.string()),
      npmUrl: v.string(),
      submittedAt: v.number(),
      // Submitter info (optional - may not exist on older records)
      submitterName: v.optional(v.string()),
      submitterEmail: v.optional(v.string()),
      submitterDiscord: v.optional(v.string()),
      // Live demo URL (optional)
      demoUrl: v.optional(v.string()),
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
        v.union(
          v.literal("visible"),
          v.literal("hidden"),
          v.literal("archived"),
        ),
      ),
      reviewedBy: v.optional(v.string()),
      reviewedAt: v.optional(v.number()),
      reviewNotes: v.optional(v.string()),
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
    }),
  ),
  handler: async (ctx, args) => {
    // SECURITY: Check if user is authenticated and is an admin
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return [];
    }

    const status = args.reviewStatus || "all";

    if (status === "all") {
      return await ctx.db.query("packages").collect();
    }

    // Get all packages and filter by status (including undefined as pending)
    const allPackages = await ctx.db.query("packages").collect();

    if (status === "pending") {
      // Treat undefined reviewStatus as pending
      return allPackages.filter(
        (pkg) => !pkg.reviewStatus || pkg.reviewStatus === "pending",
      );
    }

    return allPackages.filter((pkg) => pkg.reviewStatus === status);
  },
});

// ============ PACKAGE NOTES ============

// Query: Get notes for a package with reply counts
export const getPackageNotes = query({
  args: { packageId: v.id("packages") },
  returns: v.array(
    v.object({
      _id: v.id("packageNotes"),
      _creationTime: v.number(),
      packageId: v.id("packages"),
      content: v.string(),
      authorEmail: v.string(),
      authorName: v.optional(v.string()),
      parentNoteId: v.optional(v.id("packageNotes")),
      createdAt: v.number(),
      replyCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    // Get all notes for this package
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("desc")
      .collect();

    // Calculate reply counts for each note
    const notesWithReplies = await Promise.all(
      notes.map(async (note) => {
        const replies = await ctx.db
          .query("packageNotes")
          .withIndex("by_parent", (q) => q.eq("parentNoteId", note._id))
          .collect();
        return {
          ...note,
          replyCount: replies.length,
        };
      }),
    );

    return notesWithReplies;
  },
});

// Query: Get note count for a package (for badge display)
export const getPackageNoteCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    return notes.length;
  },
});

// Query: Get count of unreplied user requests for a package (for admin notification)
export const getUnrepliedUserRequestCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    // Find user requests (notes starting with [User Request])
    const userRequestIds = new Set<string>();
    for (const note of notes) {
      if (note.content.startsWith("[User Request]")) {
        userRequestIds.add(note._id);
      }
    }

    // Find which user requests have admin replies
    const repliedRequestIds = new Set<string>();
    for (const note of notes) {
      if (
        note.parentNoteId &&
        userRequestIds.has(note.parentNoteId) &&
        note.authorEmail.endsWith("@convex.dev")
      ) {
        repliedRequestIds.add(note.parentNoteId);
      }
    }

    // Count unreplied user requests
    let unrepliedCount = 0;
    for (const requestId of userRequestIds) {
      if (!repliedRequestIds.has(requestId)) {
        unrepliedCount++;
      }
    }

    return unrepliedCount;
  },
});

// Mutation: Add a note to a package
export const addPackageNote = mutation({
  args: {
    packageId: v.id("packages"),
    content: v.string(),
    authorEmail: v.string(),
    authorName: v.optional(v.string()),
    parentNoteId: v.optional(v.id("packageNotes")),
  },
  returns: v.id("packageNotes"),
  handler: async (ctx, args) => {
    // Check if this is an admin replying to a user request
    let isAdminReply = false;
    if (args.parentNoteId) {
      const parentNote = await ctx.db.get(args.parentNoteId);
      // If parent note starts with [User Request] and current author is admin (convex.dev email)
      if (
        parentNote &&
        parentNote.content.startsWith("[User Request]") &&
        args.authorEmail.endsWith("@convex.dev")
      ) {
        isAdminReply = true;
      }
    }

    // Insert the note with timestamp-based ordering
    return await ctx.db.insert("packageNotes", {
      packageId: args.packageId,
      content: args.content,
      authorEmail: args.authorEmail,
      authorName: args.authorName,
      parentNoteId: args.parentNoteId,
      createdAt: Date.now(),
      isAdminReply: isAdminReply || undefined,
      userHasRead: isAdminReply ? false : undefined,
    });
  },
});

// Mutation: Delete a note
export const deletePackageNote = mutation({
  args: {
    noteId: v.id("packageNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete the note directly
    await ctx.db.delete("packageNotes", args.noteId);
    return null;
  },
});

// Mutation: Mark all notes as read for admin (marks user requests as read)
export const markNotesAsReadForAdmin = mutation({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    // Mark user requests (not from @convex.dev emails) as admin-read
    const updates = notes
      .filter(
        (note) =>
          !note.authorEmail.endsWith("@convex.dev") && note.adminHasRead !== true
      )
      .map((note) => ctx.db.patch(note._id, { adminHasRead: true }));

    await Promise.all(updates);
    return null;
  },
});

// Query: Get count of unread user notes for admin
export const getUnreadUserNotesCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    // Count notes from non-admin users that haven't been read by admin
    return notes.filter(
      (note) =>
        !note.authorEmail.endsWith("@convex.dev") && note.adminHasRead !== true
    ).length;
  },
});

// Mutation: Mark all comments as read for admin
export const markCommentsAsReadForAdmin = mutation({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    // Mark all unread comments as read
    const updates = comments
      .filter((comment) => comment.adminHasRead !== true)
      .map((comment) => ctx.db.patch(comment._id, { adminHasRead: true }));

    await Promise.all(updates);
    return null;
  },
});

// Query: Get count of unread comments for admin
export const getUnreadCommentsCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    return comments.filter((comment) => comment.adminHasRead !== true).length;
  },
});

// Migration: Backfill maintainerNames for existing packages
export const backfillMaintainerNames = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Get all packages without maintainerNames
    const packages = await ctx.db.query("packages").collect();
    const packagesToUpdate = packages.filter((pkg) => !pkg.maintainerNames);

    // Update each package with maintainerNames derived from collaborators
    const updates = packagesToUpdate.map((pkg) => {
      const maintainerNames = pkg.collaborators.map((c) => c.name).join(" ");
      return ctx.db.patch("packages", pkg._id, { maintainerNames });
    });

    await Promise.all(updates);
    return packagesToUpdate.length;
  },
});

// Migration: Backfill package reliability fields used by directory sorting/visibility
export const backfillPackageReliabilityFields = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const packages = await ctx.db.query("packages").collect();
    let updatedCount = 0;

    // Patch rows with missing defaults so directory sort/filter remains stable.
    const updates = packages.map(async (pkg) => {
      const patch: {
        reviewStatus?: "pending";
        visibility?: "visible";
        submittedAt?: number;
        weeklyDownloads?: number;
        lastPublish?: string;
        approvedAt?: number;
      } = {};

      if (!pkg.reviewStatus) {
        patch.reviewStatus = "pending";
      }
      if (!pkg.visibility) {
        patch.visibility = "visible";
      }
      if (!pkg.submittedAt) {
        patch.submittedAt = pkg._creationTime;
      }
      if (pkg.weeklyDownloads === undefined) {
        patch.weeklyDownloads = 0;
      }
      if (!pkg.lastPublish) {
        patch.lastPublish = new Date(pkg._creationTime).toISOString();
      }
      if (pkg.reviewStatus === "approved" && !pkg.approvedAt) {
        patch.approvedAt = pkg.reviewedAt ?? pkg._creationTime;
      }

      if (Object.keys(patch).length === 0) {
        return;
      }

      await ctx.db.patch("packages", pkg._id, patch);
      updatedCount += 1;
    });

    await Promise.all(updates);
    return updatedCount;
  },
});

// ============ AI REVIEW FUNCTIONS ============

// Update AI review status only (for "reviewing" state)
export const updateAiReviewStatus = mutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("not_reviewed"),
      v.literal("reviewing"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch("packages", args.packageId, {
      aiReviewStatus: args.status,
    });
    return null;
  },
});

// Update AI review result (after review completes)
export const updateAiReviewResult = mutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error"),
    ),
    summary: v.string(),
    criteria: v.array(
      v.object({
        name: v.string(),
        passed: v.boolean(),
        notes: v.string(),
      }),
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch("packages", args.packageId, {
      aiReviewStatus: args.status,
      aiReviewSummary: args.summary,
      aiReviewCriteria: args.criteria,
      aiReviewedAt: Date.now(),
      aiReviewError: args.error,
    });
    return null;
  },
});

// Get admin settings for auto-approve/reject and thumbnail generation
export const getAdminSettings = query({
  args: {},
  returns: v.object({
    autoApproveOnPass: v.boolean(),
    autoRejectOnFail: v.boolean(),
    autoGenerateSeoOnPendingOrInReview: v.boolean(),
    autoGenerateThumbnailOnSubmit: v.boolean(),
    rotateThumbnailTemplatesOnSubmit: v.boolean(),
  }),
  handler: async (ctx) => {
    const autoApprove = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoApproveOnPass"))
      .first();

    const autoReject = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoRejectOnFail"))
      .first();
    const autoGenerateSeoOnReview = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) =>
        q.eq("key", "autoGenerateSeoOnPendingOrInReview"),
      )
      .first();
    const autoGenerateThumb = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) =>
        q.eq("key", "autoGenerateThumbnailOnSubmit"),
      )
      .first();
    const rotateTemplates = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) =>
        q.eq("key", "rotateThumbnailTemplatesOnSubmit"),
      )
      .first();

    return {
      autoApproveOnPass: autoApprove?.value || false,
      autoRejectOnFail: autoReject?.value || false,
      autoGenerateSeoOnPendingOrInReview: autoGenerateSeoOnReview?.value || false,
      autoGenerateThumbnailOnSubmit: autoGenerateThumb?.value || false,
      rotateThumbnailTemplatesOnSubmit: rotateTemplates?.value || false,
    };
  },
});

// Update admin setting
export const updateAdminSetting = mutation({
  args: {
    key: v.union(
      v.literal("autoApproveOnPass"),
      v.literal("autoRejectOnFail"),
      v.literal("autoGenerateSeoOnPendingOrInReview"),
      v.literal("autoGenerateThumbnailOnSubmit"),
      v.literal("rotateThumbnailTemplatesOnSubmit"),
    ),
    value: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find existing setting
    const existing = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      // Update existing with direct patch
      await ctx.db.patch("adminSettings", existing._id, {
        value: args.value,
      });
    } else {
      // Create new setting
      await ctx.db.insert("adminSettings", {
        key: args.key,
        value: args.value,
      });
    }

    return null;
  },
});

// ============ PUBLIC PACKAGE COMMENTS (visible on frontend) ============

// Query: Get public comments for a package
export const getPackageComments = query({
  args: { packageId: v.id("packages") },
  returns: v.array(
    v.object({
      _id: v.id("packageComments"),
      _creationTime: v.number(),
      packageId: v.id("packages"),
      content: v.string(),
      authorEmail: v.string(),
      authorName: v.optional(v.string()),
      createdAt: v.number(),
      adminHasRead: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    // Get all comments for this package, ordered by creation time
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("desc")
      .collect();
    return comments;
  },
});

// Query: Get comment count for a package (for badge display)
export const getPackageCommentCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    return comments.length;
  },
});

// Mutation: Add a public comment to a package (admin only)
export const addPackageComment = mutation({
  args: {
    packageId: v.id("packages"),
    content: v.string(),
    authorEmail: v.string(),
    authorName: v.optional(v.string()),
  },
  returns: v.id("packageComments"),
  handler: async (ctx, args) => {
    // Insert the comment with timestamp-based ordering
    return await ctx.db.insert("packageComments", {
      packageId: args.packageId,
      content: args.content,
      authorEmail: args.authorEmail,
      authorName: args.authorName,
      createdAt: Date.now(),
    });
  },
});

// Mutation: Delete a public comment
export const deletePackageComment = mutation({
  args: {
    commentId: v.id("packageComments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete the comment directly
    await ctx.db.delete("packageComments", args.commentId);
    return null;
  },
});

// ============ AUTO-REFRESH SYSTEM ============

// Get auto-refresh settings
export const getRefreshSettings = query({
  args: {},
  returns: v.object({
    autoRefreshEnabled: v.boolean(),
    refreshIntervalDays: v.number(),
  }),
  handler: async (ctx) => {
    const enabledSetting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoRefreshEnabled"))
      .first();

    const intervalSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "refreshIntervalDays"))
      .first();

    return {
      autoRefreshEnabled: enabledSetting?.value || false,
      refreshIntervalDays: intervalSetting?.value || 3,
    };
  },
});

// Update auto-refresh settings
export const updateRefreshSetting = mutation({
  args: {
    key: v.union(
      v.literal("autoRefreshEnabled"),
      v.literal("refreshIntervalDays"),
    ),
    value: v.union(v.boolean(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.key === "autoRefreshEnabled") {
      // Boolean setting
      const existing = await ctx.db
        .query("adminSettings")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .first();

      if (existing) {
        await ctx.db.patch("adminSettings", existing._id, { value: args.value as boolean });
      } else {
        await ctx.db.insert("adminSettings", {
          key: args.key,
          value: args.value as boolean,
        });
      }
    } else if (args.key === "refreshIntervalDays") {
      // Numeric setting
      const existing = await ctx.db
        .query("adminSettingsNumeric")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .first();

      if (existing) {
        await ctx.db.patch("adminSettingsNumeric", existing._id, { value: args.value as number });
      } else {
        await ctx.db.insert("adminSettingsNumeric", {
          key: args.key,
          value: args.value as number,
        });
      }
    }

    return null;
  },
});

// Get refresh statistics for admin dashboard
export const getRefreshStats = query({
  args: {},
  returns: v.object({
    packagesNeedingRefresh: v.number(),
    totalPackages: v.number(),
    lastRefreshRun: v.union(
      v.null(),
      v.object({
        runAt: v.number(),
        packagesSucceeded: v.number(),
        packagesFailed: v.number(),
        status: v.union(
          v.literal("running"),
          v.literal("completed"),
          v.literal("failed"),
        ),
      }),
    ),
  }),
  handler: async (ctx) => {
    // Get refresh settings for interval
    const intervalSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "refreshIntervalDays"))
      .first();
    const intervalDays = intervalSetting?.value || 3;
    const staleThreshold = Date.now() - intervalDays * 24 * 60 * 60 * 1000;

    // Get all approved/visible packages
    const allPackages = await ctx.db
      .query("packages")
      .filter((q) =>
        q.and(
          q.eq(q.field("reviewStatus"), "approved"),
          q.neq(q.field("visibility"), "archived"),
        ),
      )
      .collect();

    // Count packages needing refresh (never refreshed or older than threshold)
    const needingRefresh = allPackages.filter(
      (pkg) => !pkg.lastRefreshedAt || pkg.lastRefreshedAt < staleThreshold,
    ).length;

    // Get the most recent refresh log
    const lastLog = await ctx.db
      .query("refreshLogs")
      .withIndex("by_run_at")
      .order("desc")
      .first();

    return {
      packagesNeedingRefresh: needingRefresh,
      totalPackages: allPackages.length,
      lastRefreshRun: lastLog
        ? {
            runAt: lastLog.runAt,
            packagesSucceeded: lastLog.packagesSucceeded,
            packagesFailed: lastLog.packagesFailed,
            status: lastLog.status,
          }
        : null,
    };
  },
});

// Get recent refresh logs for admin dashboard
export const getRecentRefreshLogs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("refreshLogs"),
      _creationTime: v.number(),
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
      isManual: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("refreshLogs")
      .withIndex("by_run_at")
      .order("desc")
      .take(10);

    return logs;
  },
});

// Internal query: Get packages needing refresh (for cron)
export const _getStalePackages = internalQuery({
  args: { staleThreshold: v.number(), limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      name: v.string(),
      lastRefreshedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    // Get approved packages that need refresh
    const packages = await ctx.db
      .query("packages")
      .filter((q) =>
        q.and(
          q.eq(q.field("reviewStatus"), "approved"),
          q.neq(q.field("visibility"), "archived"),
        ),
      )
      .collect();

    // Filter and sort by staleness (never refreshed first, then oldest)
    const stalePackages = packages
      .filter(
        (pkg) =>
          !pkg.lastRefreshedAt || pkg.lastRefreshedAt < args.staleThreshold,
      )
      .sort((a, b) => {
        if (!a.lastRefreshedAt && !b.lastRefreshedAt) return 0;
        if (!a.lastRefreshedAt) return -1;
        if (!b.lastRefreshedAt) return 1;
        return a.lastRefreshedAt - b.lastRefreshedAt;
      })
      .slice(0, args.limit)
      .map((pkg) => ({
        _id: pkg._id,
        name: pkg.name,
        lastRefreshedAt: pkg.lastRefreshedAt,
      }));

    return stalePackages;
  },
});

// Internal query: Get all approved packages (for manual refresh approved only)
export const _getAllApprovedPackages = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      name: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const packages = await ctx.db
      .query("packages")
      .filter((q) =>
        q.and(
          q.eq(q.field("reviewStatus"), "approved"),
          q.neq(q.field("visibility"), "archived"),
        ),
      )
      .take(args.limit);

    return packages.map((pkg) => ({
      _id: pkg._id,
      name: pkg.name,
    }));
  },
});

// Internal query: Get all packages regardless of status (for manual refresh all)
export const _getAllPackagesForRefresh = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      name: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    // Get all non-archived packages regardless of review status
    const packages = await ctx.db
      .query("packages")
      .filter((q) => q.neq(q.field("visibility"), "archived"))
      .take(args.limit);

    return packages.map((pkg) => ({
      _id: pkg._id,
      name: pkg.name,
    }));
  },
});

// Internal mutation: Create a refresh log entry
export const _createRefreshLog = internalMutation({
  args: {
    packagesProcessed: v.number(),
    isManual: v.boolean(),
  },
  returns: v.id("refreshLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("refreshLogs", {
      runAt: Date.now(),
      packagesProcessed: args.packagesProcessed,
      packagesSucceeded: 0,
      packagesFailed: 0,
      errors: [],
      status: "running",
      isManual: args.isManual,
    });
  },
});

// Internal mutation: Update refresh log with batch results
export const _updateRefreshLogBatch = internalMutation({
  args: {
    logId: v.id("refreshLogs"),
    succeeded: v.number(),
    failed: v.number(),
    errors: v.array(
      v.object({
        packageId: v.id("packages"),
        packageName: v.string(),
        error: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get("refreshLogs", args.logId);
    if (!log) return null;

    await ctx.db.patch("refreshLogs", args.logId, {
      packagesSucceeded: log.packagesSucceeded + args.succeeded,
      packagesFailed: log.packagesFailed + args.failed,
      errors: [...log.errors, ...args.errors],
    });

    return null;
  },
});

// Internal mutation: Finalize refresh log
export const _finalizeRefreshLog = internalMutation({
  args: {
    logId: v.id("refreshLogs"),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("refreshLogs", args.logId, {
      completedAt: Date.now(),
      status: args.status,
    });

    return null;
  },
});

// Internal mutation: Cleanup old refresh logs (keep last 30)
export const _cleanupOldRefreshLogs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("refreshLogs")
      .withIndex("by_run_at")
      .order("desc")
      .collect();

    // Delete logs beyond the 30th
    const toDelete = logs.slice(30);
    for (const log of toDelete) {
      await ctx.db.delete("refreshLogs", log._id);
    }

    return null;
  },
});

// Internal mutation: Update package with refresh timestamp and clear error
export const _updatePackageRefreshTimestamp = internalMutation({
  args: {
    packageId: v.id("packages"),
    clearError: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: { lastRefreshedAt: number; refreshError?: string } = {
      lastRefreshedAt: Date.now(),
    };
    if (args.clearError) {
      update.refreshError = undefined;
    }
    await ctx.db.patch("packages", args.packageId, update);
    return null;
  },
});

// Internal mutation: Set package refresh error
export const _setPackageRefreshError = internalMutation({
  args: {
    packageId: v.id("packages"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("packages", args.packageId, {
      refreshError: args.error,
      lastRefreshedAt: Date.now(), // Still update timestamp to avoid retry loop
    });
    return null;
  },
});

// Internal action: Process a batch of packages
export const _refreshPackageBatch = internalAction({
  args: {
    packages: v.array(
      v.object({
        _id: v.id("packages"),
        name: v.string(),
      }),
    ),
    logId: v.id("refreshLogs"),
    isLastBatch: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let succeeded = 0;
    let failed = 0;
    const errors: {
      packageId: Id<"packages">;
      packageName: string;
      error: string;
    }[] = [];

    for (const pkg of args.packages) {
      try {
        // Get the full package data to preserve existing URLs
        const existingPkg = await ctx.runQuery(internal.packages._getPackage, {
          packageId: pkg._id,
        });

        // Fetch fresh data from npm
        const packageData: any = await ctx.runAction(
          api.packages.fetchNpmPackage,
          {
            packageName: pkg.name,
          },
        );

        // Preserve existing repositoryUrl and homepageUrl if already set
        const repositoryUrl =
          existingPkg?.repositoryUrl || packageData.repositoryUrl;
        const homepageUrl = existingPkg?.homepageUrl || packageData.homepageUrl;

        // Update the package with fresh npm data (preserving URLs)
        await ctx.runMutation(api.packages.updateNpmData, {
          packageId: pkg._id,
          description: packageData.description,
          version: packageData.version,
          license: packageData.license,
          repositoryUrl,
          homepageUrl,
          unpackedSize: packageData.unpackedSize,
          totalFiles: packageData.totalFiles,
          lastPublish: packageData.lastPublish,
          weeklyDownloads: packageData.weeklyDownloads,
          collaborators: packageData.collaborators,
        });

        // Update refresh timestamp and clear any previous error
        await ctx.runMutation(
          internal.packages._updatePackageRefreshTimestamp,
          {
            packageId: pkg._id,
            clearError: true,
          },
        );

        succeeded++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Set error on package
        await ctx.runMutation(internal.packages._setPackageRefreshError, {
          packageId: pkg._id,
          error: errorMessage,
        });

        errors.push({
          packageId: pkg._id,
          packageName: pkg.name,
          error: errorMessage,
        });
        failed++;
      }
    }

    // Update the refresh log with batch results
    await ctx.runMutation(internal.packages._updateRefreshLogBatch, {
      logId: args.logId,
      succeeded,
      failed,
      errors,
    });

    // If this is the last batch, finalize the log
    if (args.isLastBatch) {
      await ctx.runMutation(internal.packages._finalizeRefreshLog, {
        logId: args.logId,
        status: "completed",
      });

      // Cleanup old logs
      await ctx.runMutation(internal.packages._cleanupOldRefreshLogs, {});
    }

    return null;
  },
});

// Internal action: Scheduled refresh check (called by cron daily)
export const scheduledRefreshCheck = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if auto-refresh is enabled
    const enabledSetting = await ctx.runQuery(
      internal.packages._getAutoRefreshEnabled,
    );
    if (!enabledSetting) {
      console.log("Auto-refresh is disabled, skipping scheduled refresh");
      return null;
    }

    // Get the interval setting
    const intervalDays = await ctx.runQuery(
      internal.packages._getRefreshIntervalDays,
    );
    const staleThreshold = Date.now() - intervalDays * 24 * 60 * 60 * 1000;

    // Get stale packages (max 100 per run)
    const stalePackages = await ctx.runQuery(
      internal.packages._getStalePackages,
      {
        staleThreshold,
        limit: 100,
      },
    );

    if (stalePackages.length === 0) {
      console.log("No stale packages found, skipping refresh");
      return null;
    }

    console.log(`Found ${stalePackages.length} stale packages to refresh`);

    // Create refresh log
    const logId = await ctx.runMutation(internal.packages._createRefreshLog, {
      packagesProcessed: stalePackages.length,
      isManual: false,
    });

    // Batch packages into groups of 10
    const batchSize = 10;
    const batches: (typeof stalePackages)[] = [];
    for (let i = 0; i < stalePackages.length; i += batchSize) {
      batches.push(stalePackages.slice(i, i + batchSize));
    }

    // Schedule each batch with staggered delays (5 seconds apart)
    for (let i = 0; i < batches.length; i++) {
      const delay = i * 5000; // 5 seconds between batches
      const isLastBatch = i === batches.length - 1;

      await ctx.scheduler.runAfter(
        delay,
        internal.packages._refreshPackageBatch,
        {
          packages: batches[i],
          logId,
          isLastBatch,
        },
      );
    }

    return null;
  },
});

// Internal query: Get auto-refresh enabled setting
export const _getAutoRefreshEnabled = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoRefreshEnabled"))
      .first();
    return setting?.value || false;
  },
});

// Internal query: Get refresh interval days setting
export const _getRefreshIntervalDays = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "refreshIntervalDays"))
      .first();
    return setting?.value || 3;
  },
});

// Action: Manual "Refresh Approved" trigger (bypasses staleness check, approved packages only)
export const triggerManualRefreshAll = action({
  args: {},
  returns: v.object({
    packagesQueued: v.number(),
    logId: v.union(v.id("refreshLogs"), v.null()),
  }),
  handler: async (
    ctx,
  ): Promise<{ packagesQueued: number; logId: Id<"refreshLogs"> | null }> => {
    // Get all approved packages (max 100)
    const packages: { _id: Id<"packages">; name: string }[] =
      await ctx.runQuery(internal.packages._getAllApprovedPackages, {
        limit: 100,
      });

    // Return gracefully if no approved packages found
    if (packages.length === 0) {
      return { packagesQueued: 0, logId: null };
    }

    // Create refresh log
    const logId: Id<"refreshLogs"> = await ctx.runMutation(
      internal.packages._createRefreshLog,
      {
        packagesProcessed: packages.length,
        isManual: true,
      },
    );

    // Batch packages into groups of 10
    const batchSize = 10;
    const batches: (typeof packages)[] = [];
    for (let i = 0; i < packages.length; i += batchSize) {
      batches.push(packages.slice(i, i + batchSize));
    }

    // Schedule each batch with staggered delays (5 seconds apart)
    for (let i = 0; i < batches.length; i++) {
      const delay = i * 5000; // 5 seconds between batches
      const isLastBatch = i === batches.length - 1;

      await ctx.scheduler.runAfter(
        delay,
        internal.packages._refreshPackageBatch,
        {
          packages: batches[i],
          logId,
          isLastBatch,
        },
      );
    }

    return {
      packagesQueued: packages.length,
      logId,
    };
  },
});

// Action: Manual "Refresh All Packages" trigger (all packages regardless of status)
export const triggerManualRefreshAllPackages = action({
  args: {},
  returns: v.object({
    packagesQueued: v.number(),
    logId: v.union(v.id("refreshLogs"), v.null()),
  }),
  handler: async (
    ctx,
  ): Promise<{ packagesQueued: number; logId: Id<"refreshLogs"> | null }> => {
    // Get all packages regardless of status (max 100)
    const packages: { _id: Id<"packages">; name: string }[] =
      await ctx.runQuery(internal.packages._getAllPackagesForRefresh, {
        limit: 100,
      });

    // Return gracefully if no packages found
    if (packages.length === 0) {
      return { packagesQueued: 0, logId: null };
    }

    // Create refresh log
    const logId: Id<"refreshLogs"> = await ctx.runMutation(
      internal.packages._createRefreshLog,
      {
        packagesProcessed: packages.length,
        isManual: true,
      },
    );

    // Batch packages into groups of 10
    const batchSize = 10;
    const batches: (typeof packages)[] = [];
    for (let i = 0; i < packages.length; i += batchSize) {
      batches.push(packages.slice(i, i + batchSize));
    }

    // Schedule each batch with staggered delays (5 seconds apart)
    for (let i = 0; i < batches.length; i++) {
      const delay = i * 5000; // 5 seconds between batches
      const isLastBatch = i === batches.length - 1;

      await ctx.scheduler.runAfter(
        delay,
        internal.packages._refreshPackageBatch,
        {
          packages: batches[i],
          logId,
          isLastBatch,
        },
      );
    }

    return {
      packagesQueued: packages.length,
      logId,
    };
  },
});

// ============ DIRECTORY EXPANSION: PUBLIC QUERIES ============

// Validator for directory listing cards (lightweight, no longDescription)
const directoryCardValidator = v.object({
  _id: v.id("packages"),
  _creationTime: v.number(),
  name: v.string(),
  componentName: v.optional(v.string()),
  description: v.string(),
  slug: v.optional(v.string()),
  category: v.optional(v.string()),
  shortDescription: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  convexVerified: v.optional(v.boolean()),
  authorUsername: v.optional(v.string()),
  authorAvatar: v.optional(v.string()),
  weeklyDownloads: v.number(),
  repositoryUrl: v.optional(v.string()),
  npmUrl: v.string(),
  installCommand: v.string(),
  featured: v.optional(v.boolean()),
  tags: v.optional(v.array(v.string())),
  demoUrl: v.optional(v.string()),
});

// Public query: List approved+visible components for directory page
export const listApprovedComponents = query({
  args: {
    category: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("downloads"),
        v.literal("updated"),
        v.literal("rating"),
      ),
    ),
  },
  returns: v.array(directoryCardValidator),
  handler: async (ctx, args) => {
    let packages;

    // Use category index when filtering by category
    if (args.category) {
      packages = await ctx.db
        .query("packages")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
      // Keep category-filtered results aligned with global directory visibility/status rules.
      // Also exclude packages marked for deletion.
      packages = packages.filter(
        (pkg) =>
          pkg.reviewStatus === "approved" &&
          (!pkg.visibility || pkg.visibility === "visible") &&
          !pkg.markedForDeletion,
      );
    } else {
      // Get all approved+visible packages
      packages = await ctx.db
        .query("packages")
        .withIndex("by_review_status", (q) => q.eq("reviewStatus", "approved"))
        .collect();
      // Exclude packages marked for deletion
      packages = packages.filter(
        (pkg) =>
          (!pkg.visibility || pkg.visibility === "visible") &&
          !pkg.markedForDeletion,
      );
    }

    // Sort
    const sortBy = args.sortBy || "newest";
    if (sortBy === "newest") {
      packages.sort(
        (a, b) =>
          (b.approvedAt ?? b.submittedAt ?? b._creationTime) -
          (a.approvedAt ?? a.submittedAt ?? a._creationTime),
      );
    } else if (sortBy === "downloads") {
      packages.sort((a, b) => b.weeklyDownloads - a.weeklyDownloads);
    } else if (sortBy === "updated") {
      packages.sort(
        (a, b) =>
          new Date(b.lastPublish).getTime() -
          new Date(a.lastPublish).getTime(),
      );
    } else if (sortBy === "rating") {
      // Fetch all ratings and compute average per package
      const allRatings = await ctx.db.query("componentRatings").collect();
      const ratingMap: Record<string, { sum: number; count: number }> = {};
      for (const r of allRatings) {
        const pid = r.packageId as string;
        if (!ratingMap[pid]) {
          ratingMap[pid] = { sum: 0, count: 0 };
        }
        ratingMap[pid].sum += r.rating;
        ratingMap[pid].count += 1;
      }
      // Sort by average rating descending (unrated packages go last)
      packages.sort((a, b) => {
        const aData = ratingMap[a._id as string];
        const bData = ratingMap[b._id as string];
        const aAvg = aData ? aData.sum / aData.count : 0;
        const bAvg = bData ? bData.sum / bData.count : 0;
        // If averages are equal, sort by rating count (more ratings = higher confidence)
        if (bAvg === aAvg) {
          return (bData?.count || 0) - (aData?.count || 0);
        }
        return bAvg - aAvg;
      });
    }

    // Return lightweight card data
    return packages.map((pkg) => ({
      _id: pkg._id,
      _creationTime: pkg._creationTime,
      name: pkg.name || "",
      componentName: pkg.componentName,
      description: pkg.description || "",
      slug: pkg.slug,
      category: pkg.category,
      shortDescription: pkg.shortDescription,
      thumbnailUrl: pkg.thumbnailUrl,
      convexVerified: pkg.convexVerified,
      authorUsername: pkg.authorUsername,
      authorAvatar: pkg.authorAvatar,
      weeklyDownloads: pkg.weeklyDownloads ?? 0,
      repositoryUrl: pkg.repositoryUrl,
      npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
      installCommand: pkg.installCommand || `npm install ${pkg.name || ""}`,
      featured: pkg.featured,
      tags: pkg.tags,
      demoUrl: pkg.demoUrl,
    }));
  },
});

// Public query: Get a single component by slug for detail page
// Allows approved OR pending packages with a slug (admin intentionally set the slug)
// Only hides explicitly hidden/archived packages
export const getComponentBySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), publicPackageValidator),
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!pkg) return null;

    // Hide explicitly hidden, archived, or marked-for-deletion packages
    if (
      pkg.visibility === "hidden" ||
      pkg.visibility === "archived" ||
      pkg.markedForDeletion
    ) {
      return null;
    }

    return toPublicPackage(pkg);
  },
});

// Validator for user submission items shown on profile page
const userSubmissionValidator = v.object({
  _id: v.id("packages"),
  _creationTime: v.number(),
  name: v.string(),
  componentName: v.optional(v.string()),
  slug: v.optional(v.string()),
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
  submittedAt: v.number(),
  thumbnailUrl: v.optional(v.string()),
  shortDescription: v.optional(v.string()),
  category: v.optional(v.string()),
  unreadAdminReplies: v.number(),
  markedForDeletion: v.optional(v.boolean()),
  markedForDeletionAt: v.optional(v.number()),
});

// Public query: Get submissions by the authenticated user's email
// Returns packages submitted by the current user for profile page
export const getMySubmissions = query({
  args: {},
  returns: v.array(userSubmissionValidator),
  handler: async (ctx) => {
    // Get authenticated user email from database
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return [];
    }

    // Query packages by submitter email
    const packagesBySubmitter = await ctx.db
      .query("packages")
      .withIndex("by_submitter_email", (q) => q.eq("submitterEmail", userEmail))
      .order("desc")
      .collect();

    // Also find packages where user is in additionalEmails
    // Since there's no index on additionalEmails, we do a filtered scan
    // This is acceptable because the dataset is limited and this is a user-specific query
    const allPackages = await ctx.db.query("packages").collect();
    const packagesByAdditionalEmail = allPackages.filter(
      (pkg) =>
        pkg.additionalEmails?.includes(userEmail) &&
        pkg.submitterEmail !== userEmail,
    );

    // Merge and dedupe
    const seenIds = new Set(packagesBySubmitter.map((p) => p._id));
    const packages = [...packagesBySubmitter];
    for (const pkg of packagesByAdditionalEmail) {
      if (!seenIds.has(pkg._id)) {
        packages.push(pkg);
      }
    }

    // Sort by submittedAt descending
    packages.sort((a, b) => b.submittedAt - a.submittedAt);

    // Calculate unread admin replies for each package
    const packagesWithUnread = await Promise.all(
      packages.map(async (pkg) => {
        const notes = await ctx.db
          .query("packageNotes")
          .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
          .collect();

        // Find user request IDs (from this user)
        const userRequestIds = new Set<string>();
        for (const note of notes) {
          if (
            note.authorEmail === userEmail &&
            note.content.startsWith("[User Request]")
          ) {
            userRequestIds.add(note._id);
          }
        }

        // Count unread admin replies
        let unreadCount = 0;
        for (const note of notes) {
          if (
            note.parentNoteId &&
            userRequestIds.has(note.parentNoteId) &&
            note.userHasRead === false
          ) {
            unreadCount++;
          }
        }

        return {
          _id: pkg._id,
          _creationTime: pkg._creationTime,
          name: pkg.name,
          componentName: pkg.componentName,
          slug: pkg.slug,
          reviewStatus: pkg.reviewStatus,
          visibility: pkg.visibility,
          submittedAt: pkg.submittedAt,
          thumbnailUrl: pkg.thumbnailUrl,
          shortDescription: pkg.shortDescription,
          category: pkg.category,
          unreadAdminReplies: unreadCount,
          markedForDeletion: pkg.markedForDeletion,
          markedForDeletionAt: pkg.markedForDeletionAt,
        };
      }),
    );

    return packagesWithUnread;
  },
});

// Mutation: Request refresh/re-review from profile page
// Creates a note for admin team
export const requestSubmissionRefresh = mutation({
  args: {
    packageId: v.id("packages"),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    // Get user info for the note
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;

    // Verify the package belongs to this user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new Error("You can only request refresh for your own submissions");
    }

    // Create a note for admin team
    await ctx.db.insert("packageNotes", {
      packageId: args.packageId,
      content: `[User Request] ${args.note}`,
      authorEmail: userEmail,
      authorName: user?.name || undefined,
      createdAt: Date.now(),
    });

    return null;
  },
});

// Query: Get user's notes thread for a package (their requests + admin replies)
// Returns notes visible to the user (their own requests and any admin replies)
export const getMyPackageNotes = query({
  args: { packageId: v.id("packages") },
  returns: v.array(
    v.object({
      _id: v.id("packageNotes"),
      content: v.string(),
      authorName: v.optional(v.string()),
      isFromAdmin: v.boolean(),
      createdAt: v.number(),
      parentNoteId: v.optional(v.id("packageNotes")),
      userHasRead: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return [];
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || !userOwnsPackage(pkg, userEmail)) {
      return [];
    }

    // Get all notes for this package
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("asc")
      .collect();

    // Filter to only user requests and admin replies
    const userRequestIds = new Set<string>();
    const result: Array<{
      _id: typeof notes[0]["_id"];
      content: string;
      authorName?: string;
      isFromAdmin: boolean;
      createdAt: number;
      parentNoteId?: typeof notes[0]["_id"];
      userHasRead?: boolean;
    }> = [];

    // First pass: find user requests
    for (const note of notes) {
      if (
        note.authorEmail === userEmail &&
        note.content.startsWith("[User Request]")
      ) {
        userRequestIds.add(note._id);
        result.push({
          _id: note._id,
          content: note.content.replace("[User Request] ", ""),
          authorName: note.authorName || "You",
          isFromAdmin: false,
          createdAt: note.createdAt,
          parentNoteId: note.parentNoteId,
        });
      }
    }

    // Second pass: find admin replies to user requests
    for (const note of notes) {
      if (note.parentNoteId && userRequestIds.has(note.parentNoteId)) {
        result.push({
          _id: note._id,
          content: note.content,
          authorName: note.authorName || "Convex Team",
          isFromAdmin: true,
          createdAt: note.createdAt,
          parentNoteId: note.parentNoteId,
          userHasRead: note.userHasRead,
        });
      }
    }

    // Sort by creation time
    result.sort((a, b) => a.createdAt - b.createdAt);

    return result;
  },
});

// Query: Count unread admin replies for a user's package
export const getUnreadAdminReplyCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return 0;
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || !userOwnsPackage(pkg, userEmail)) {
      return 0;
    }

    // Get all notes for this package
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    // Find user request IDs
    const userRequestIds = new Set<string>();
    for (const note of notes) {
      if (
        note.authorEmail === userEmail &&
        note.content.startsWith("[User Request]")
      ) {
        userRequestIds.add(note._id);
      }
    }

    // Count unread admin replies
    let unreadCount = 0;
    for (const note of notes) {
      if (
        note.parentNoteId &&
        userRequestIds.has(note.parentNoteId) &&
        note.userHasRead === false
      ) {
        unreadCount++;
      }
    }

    return unreadCount;
  },
});

// Mutation: Mark admin replies as read for a package
export const markPackageNotesAsRead = mutation({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || !userOwnsPackage(pkg, userEmail)) {
      throw new Error("You can only access notes for your own submissions");
    }

    // Get all notes for this package
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    // Find user request IDs
    const userRequestIds = new Set<string>();
    for (const note of notes) {
      if (
        note.authorEmail === userEmail &&
        note.content.startsWith("[User Request]")
      ) {
        userRequestIds.add(note._id);
      }
    }

    // Mark unread admin replies as read
    const updates = notes
      .filter(
        (note) =>
          note.parentNoteId &&
          userRequestIds.has(note.parentNoteId) &&
          note.userHasRead === false,
      )
      .map((note) => ctx.db.patch(note._id, { userHasRead: true }));

    await Promise.all(updates);

    return null;
  },
});

// Mutation: User sets their own submission visibility (hide/show)
export const setMySubmissionVisibility = mutation({
  args: {
    packageId: v.id("packages"),
    visibility: v.union(v.literal("visible"), v.literal("hidden")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new Error("You can only modify your own submissions");
    }

    // Users can only toggle between visible and hidden (not archived)
    await ctx.db.patch(args.packageId, { visibility: args.visibility });
    return null;
  },
});

// Mutation: User marks their submission for deletion (soft delete)
// Admin must permanently delete via scheduled cleanup or manual action
export const requestDeleteMySubmission = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new Error("You can only delete your own submissions");
    }

    // Mark for deletion instead of immediate delete
    await ctx.db.patch(args.packageId, {
      markedForDeletion: true,
      markedForDeletionAt: Date.now(),
      markedForDeletionBy: userEmail,
      // Hide from directory immediately
      visibility: "hidden",
    });

    return null;
  },
});

// Mutation: User cancels deletion request (unmarks for deletion)
export const cancelDeleteMySubmission = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new Error("You can only manage your own submissions");
    }

    // Remove deletion mark
    await ctx.db.patch(args.packageId, {
      markedForDeletion: undefined,
      markedForDeletionAt: undefined,
      markedForDeletionBy: undefined,
    });

    return null;
  },
});

// Internal mutation: Permanently delete a package and all associated data
export const _permanentlyDeletePackage = internalMutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return null;

    // Delete associated notes
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(notes.map((note) => ctx.db.delete(note._id)));

    // Delete associated comments
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

    // Delete associated ratings
    const ratings = await ctx.db
      .query("componentRatings")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(ratings.map((rating) => ctx.db.delete(rating._id)));

    // Delete thumbnail jobs
    const jobs = await ctx.db
      .query("thumbnailJobs")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(jobs.map((job) => ctx.db.delete(job._id)));

    // Delete badge fetches
    const fetches = await ctx.db
      .query("badgeFetches")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(fetches.map((fetch) => ctx.db.delete(fetch._id)));

    // Delete the package itself
    await ctx.db.delete(args.packageId);

    return null;
  },
});

// Admin mutation: Permanently delete a package marked for deletion
export const adminPermanentlyDeletePackage = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }

    // Delete associated notes
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(notes.map((note) => ctx.db.delete(note._id)));

    // Delete associated comments
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

    // Delete associated ratings
    const ratings = await ctx.db
      .query("componentRatings")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(ratings.map((rating) => ctx.db.delete(rating._id)));

    // Delete thumbnail jobs
    const jobs = await ctx.db
      .query("thumbnailJobs")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(jobs.map((job) => ctx.db.delete(job._id)));

    // Delete badge fetches
    const fetches = await ctx.db
      .query("badgeFetches")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();
    await Promise.all(fetches.map((fetch) => ctx.db.delete(fetch._id)));

    // Delete the package itself
    await ctx.db.delete(args.packageId);

    return null;
  },
});

// Query: Get packages marked for deletion (admin only)
export const getPackagesMarkedForDeletion = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      name: v.string(),
      componentName: v.optional(v.string()),
      submitterEmail: v.optional(v.string()),
      markedForDeletionAt: v.optional(v.number()),
      markedForDeletionBy: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) {
      return [];
    }

    const packages = await ctx.db
      .query("packages")
      .withIndex("by_marked_for_deletion", (q) => q.eq("markedForDeletion", true))
      .collect();

    return packages.map((pkg) => ({
      _id: pkg._id,
      name: pkg.name,
      componentName: pkg.componentName,
      submitterEmail: pkg.submitterEmail,
      markedForDeletionAt: pkg.markedForDeletionAt,
      markedForDeletionBy: pkg.markedForDeletionBy,
    }));
  },
});

// Query: Get deletion cleanup settings
export const getDeletionCleanupSettings = query({
  args: {},
  returns: v.object({
    autoDeleteEnabled: v.boolean(),
    deleteIntervalDays: v.number(),
  }),
  handler: async (ctx) => {
    const autoDeleteSetting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoDeleteMarkedPackages"))
      .unique();

    const intervalSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "deleteIntervalDays"))
      .unique();

    return {
      autoDeleteEnabled: autoDeleteSetting?.value ?? false,
      deleteIntervalDays: intervalSetting?.value ?? 7,
    };
  },
});

// Mutation: Update deletion cleanup settings
export const updateDeletionCleanupSetting = mutation({
  args: {
    key: v.union(v.literal("autoDeleteMarkedPackages"), v.literal("deleteIntervalDays")),
    value: v.union(v.boolean(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    if (args.key === "autoDeleteMarkedPackages" && typeof args.value === "boolean") {
      const existing = await ctx.db
        .query("adminSettings")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { value: args.value });
      } else {
        await ctx.db.insert("adminSettings", { key: args.key, value: args.value });
      }
    } else if (args.key === "deleteIntervalDays" && typeof args.value === "number") {
      const existing = await ctx.db
        .query("adminSettingsNumeric")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { value: args.value });
      } else {
        await ctx.db.insert("adminSettingsNumeric", { key: args.key, value: args.value });
      }
    }

    return null;
  },
});

// Internal action: Scheduled cleanup of packages marked for deletion
export const scheduledDeletionCleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if auto-delete is enabled
    const autoDeleteSetting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoDeleteMarkedPackages"))
      .unique();

    if (!autoDeleteSetting?.value) {
      return null;
    }

    // Get interval setting
    const intervalSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "deleteIntervalDays"))
      .unique();

    const intervalDays = intervalSetting?.value ?? 7;
    const cutoffTime = Date.now() - intervalDays * 24 * 60 * 60 * 1000;

    // Get packages marked for deletion that are past the waiting period
    const packagesToDelete = await ctx.db
      .query("packages")
      .withIndex("by_marked_for_deletion", (q) => q.eq("markedForDeletion", true))
      .collect();

    const eligiblePackages = packagesToDelete.filter(
      (pkg) => pkg.markedForDeletionAt && pkg.markedForDeletionAt < cutoffTime
    );

    // Delete each eligible package
    for (const pkg of eligiblePackages) {
      // Delete associated data
      const notes = await ctx.db
        .query("packageNotes")
        .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
        .collect();
      await Promise.all(notes.map((note) => ctx.db.delete(note._id)));

      const comments = await ctx.db
        .query("packageComments")
        .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
        .collect();
      await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

      const ratings = await ctx.db
        .query("componentRatings")
        .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
        .collect();
      await Promise.all(ratings.map((rating) => ctx.db.delete(rating._id)));

      const jobs = await ctx.db
        .query("thumbnailJobs")
        .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
        .collect();
      await Promise.all(jobs.map((job) => ctx.db.delete(job._id)));

      const fetches = await ctx.db
        .query("badgeFetches")
        .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
        .collect();
      await Promise.all(fetches.map((fetch) => ctx.db.delete(fetch._id)));

      await ctx.db.delete(pkg._id);
    }

    return null;
  },
});

// Mutation: User deletes their entire account (requires no active submissions)
export const deleteMyAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    // Get all packages owned by user (not marked for deletion)
    const userPackages = await ctx.db
      .query("packages")
      .withIndex("by_submitter_email", (q) => q.eq("submitterEmail", userEmail))
      .collect();

    // Check if user has any active submissions (not marked for deletion)
    const activeSubmissions = userPackages.filter((pkg) => !pkg.markedForDeletion);
    if (activeSubmissions.length > 0) {
      throw new Error(
        `You must delete all your components before deleting your account. You have ${activeSubmissions.length} active submission(s).`
      );
    }

    // Remove user from additionalEmails on packages they don't own
    const allPackages = await ctx.db.query("packages").collect();
    const additionalEmailPackages = allPackages.filter(
      (pkg) =>
        pkg.additionalEmails?.includes(userEmail) &&
        pkg.submitterEmail !== userEmail
    );

    for (const pkg of additionalEmailPackages) {
      if (pkg.additionalEmails) {
        const updatedEmails = pkg.additionalEmails.filter(
          (e) => e !== userEmail
        );
        await ctx.db.patch(pkg._id, {
          additionalEmails:
            updatedEmails.length > 0 ? updatedEmails : undefined,
        });
      }
    }

    return null;
  },
});

// Mutation: User updates their own submission fields
export const updateMySubmission = mutation({
  args: {
    packageId: v.id("packages"),
    componentName: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    demoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new Error("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new Error("You can only edit your own submissions");
    }

    // Build update object with only provided fields
    const updates: Record<string, string | string[] | undefined> = {};
    if (args.componentName !== undefined) updates.componentName = args.componentName;
    if (args.shortDescription !== undefined) updates.shortDescription = args.shortDescription;
    if (args.longDescription !== undefined) updates.longDescription = args.longDescription;
    if (args.category !== undefined) updates.category = args.category;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.demoUrl !== undefined) updates.demoUrl = args.demoUrl;
    if (args.videoUrl !== undefined) updates.videoUrl = args.videoUrl;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.packageId, updates);
    }

    return null;
  },
});

// Query: Get full submission data for editing (user's own submission only)
export const getMySubmissionForEdit = query({
  args: { packageId: v.id("packages") },
  returns: v.union(
    v.object({
      _id: v.id("packages"),
      name: v.string(),
      componentName: v.optional(v.string()),
      shortDescription: v.optional(v.string()),
      longDescription: v.optional(v.string()),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      demoUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      repositoryUrl: v.optional(v.string()),
      npmUrl: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return null;
    }

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || !userOwnsPackage(pkg, userEmail)) {
      return null;
    }

    return {
      _id: pkg._id,
      name: pkg.name,
      componentName: pkg.componentName,
      shortDescription: pkg.shortDescription,
      longDescription: pkg.longDescription,
      category: pkg.category,
      tags: pkg.tags,
      demoUrl: pkg.demoUrl,
      videoUrl: pkg.videoUrl,
      repositoryUrl: pkg.repositoryUrl,
      npmUrl: pkg.npmUrl,
    };
  },
});

// Query: Get total unread admin reply count across all user's packages
export const getTotalUnreadAdminReplies = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return 0;
    }

    // Get all packages submitted by user
    const packages = await ctx.db
      .query("packages")
      .withIndex("by_submitter_email", (q) =>
        q.eq("submitterEmail", userEmail),
      )
      .collect();

    if (packages.length === 0) return 0;

    // Get all notes for user's packages
    let totalUnread = 0;
    for (const pkg of packages) {
      const notes = await ctx.db
        .query("packageNotes")
        .withIndex("by_package", (q) => q.eq("packageId", pkg._id))
        .collect();

      // Find user request IDs for this package
      const userRequestIds = new Set<string>();
      for (const note of notes) {
        if (
          note.authorEmail === userEmail &&
          note.content.startsWith("[User Request]")
        ) {
          userRequestIds.add(note._id);
        }
      }

      // Count unread admin replies
      for (const note of notes) {
        if (
          note.parentNoteId &&
          userRequestIds.has(note.parentNoteId) &&
          note.userHasRead === false
        ) {
          totalUnread++;
        }
      }
    }

    return totalUnread;
  },
});

// Public query: List categories from admin-managed table with component counts
// Only returns enabled categories, sorted by admin-set sortOrder
export const listCategories = query({
  args: {},
  returns: v.array(
    v.object({
      category: v.string(),
      label: v.string(),
      description: v.string(),
      count: v.number(),
    }),
  ),
  handler: async (ctx) => {
    // Read admin-managed categories (enabled only, sorted by sortOrder)
    const adminCategories = await ctx.db
      .query("categories")
      .withIndex("by_sort_order")
      .collect();

    const enabledCategories = adminCategories.filter((c) => c.enabled);

    // Get all approved+visible packages
    const packages = await ctx.db
      .query("packages")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "approved"))
      .collect();

    const visible = packages.filter(
      (pkg) => !pkg.visibility || pkg.visibility === "visible",
    );

    // Count packages per category
    const categoryCountMap: Record<string, number> = {};
    for (const pkg of visible) {
      if (!pkg.category) continue;
      categoryCountMap[pkg.category] = (categoryCountMap[pkg.category] || 0) + 1;
    }

    // Return admin categories with their counts (preserves admin sortOrder)
    return enabledCategories.map((cat) => ({
      category: cat.slug,
      label: cat.label,
      description: cat.description,
      count: categoryCountMap[cat.slug] || 0,
    }));
  },
});

// Public query: Get featured+approved+visible components
export const getFeaturedComponents = query({
  args: {},
  returns: v.array(directoryCardValidator),
  handler: async (ctx) => {
    // Get all approved packages and filter to featured+visible
    const packages = await ctx.db
      .query("packages")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "approved"))
      .collect();

    const featured = packages.filter(
      (pkg) =>
        pkg.featured &&
        (!pkg.visibility || pkg.visibility === "visible") &&
        !pkg.markedForDeletion,
    );

    return featured.map((pkg) => ({
      _id: pkg._id,
      _creationTime: pkg._creationTime,
      name: pkg.name || "",
      componentName: pkg.componentName,
      description: pkg.description || "",
      slug: pkg.slug,
      category: pkg.category,
      shortDescription: pkg.shortDescription,
      thumbnailUrl: pkg.thumbnailUrl,
      convexVerified: pkg.convexVerified,
      authorUsername: pkg.authorUsername,
      authorAvatar: pkg.authorAvatar,
      weeklyDownloads: pkg.weeklyDownloads ?? 0,
      repositoryUrl: pkg.repositoryUrl,
      npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
      installCommand: pkg.installCommand || `npm install ${pkg.name || ""}`,
      featured: pkg.featured,
      tags: pkg.tags,
      demoUrl: pkg.demoUrl,
    }));
  },
});

// ============ FILE STORAGE: THUMBNAIL UPLOAD ============

// Generate a Convex upload URL for thumbnail image upload
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded thumbnail to a package
// Called after the file is uploaded via the upload URL
export const saveThumbnail = mutation({
  args: {
    packageId: v.id("packages"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Resolve the storage URL for display
    const url = await ctx.storage.getUrl(args.storageId);
    // Patch directly without reading first
    await ctx.db.patch("packages", args.packageId, {
      thumbnailStorageId: args.storageId,
      thumbnailUrl: url ?? undefined,
    });
    return null;
  },
});

// Save uploaded logo to a package (png/webp/svg)
// Called after the file is uploaded via generateUploadUrl
// Schedules auto thumbnail generation if the admin setting is enabled
export const saveLogo = mutation({
  args: {
    packageId: v.id("packages"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Resolve the storage URL for admin display
    const url = await ctx.storage.getUrl(args.storageId);
    // Patch directly without reading first
    await ctx.db.patch(args.packageId, {
      logoStorageId: args.storageId,
      logoUrl: url ?? undefined,
    });

    // Check if auto thumbnail generation is enabled
    const setting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) =>
        q.eq("key", "autoGenerateThumbnailOnSubmit"),
      )
      .first();
    if (setting?.value) {
      // Schedule auto-generation in background
      await ctx.scheduler.runAfter(
        0,
        internal.thumbnailGenerator._autoGenerateThumbnail,
        { packageId: args.packageId },
      );
    }

    return null;
  },
});

// Clear the logo from a package
export const clearLogo = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      logoStorageId: undefined,
      logoUrl: undefined,
    });
    return null;
  },
});

// ============ DIRECTORY EXPANSION: AUTO-FILL AUTHOR FROM GITHUB ============

// Extract GitHub owner from repository URL and auto-populate author fields
// Returns the extracted values so the UI can update local state immediately
export const autoFillAuthorFromRepo = mutation({
  args: { packageId: v.id("packages") },
  returns: v.union(
    v.null(),
    v.object({ authorUsername: v.string(), authorAvatar: v.string() }),
  ),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get("packages", args.packageId);
    if (!pkg) return null;

    const repoUrl = pkg.repositoryUrl;
    if (!repoUrl) return null;

    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const owner = match[1];
    const authorUsername = owner;
    const authorAvatar = `https://github.com/${owner}.png`;

    // Always overwrite when admin clicks auto-fill
    await ctx.db.patch("packages", args.packageId, { authorUsername, authorAvatar });

    return { authorUsername, authorAvatar };
  },
});

// ============ DIRECTORY EXPANSION: ADMIN MUTATIONS ============

// Admin mutation: Update directory-specific component details
export const updateComponentDetails = mutation({
  args: {
    packageId: v.id("packages"),
    componentName: v.optional(v.string()),
    slug: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    shortDescription: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    clearThumbnail: v.optional(v.boolean()),
    convexVerified: v.optional(v.boolean()),
    authorUsername: v.optional(v.string()),
    authorAvatar: v.optional(v.string()),
    relatedComponentIds: v.optional(v.array(v.id("packages"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const { packageId, clearThumbnail, ...updates } = args;

    // Build patch object with only defined fields
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    // Explicitly clear both URL and storage ID when requested from the editor.
    if (clearThumbnail) {
      patch.thumbnailUrl = undefined;
      patch.thumbnailStorageId = undefined;
    }

    // Patch directly without reading first to avoid write conflicts
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("packages", packageId, patch);
    }

    return null;
  },
});

// Admin mutation: Update source metadata fields normally pulled from npm/git
export const updatePackageSourceMetadata = mutation({
  args: {
    packageId: v.id("packages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    npmUrl: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
    homepageUrl: v.optional(v.string()),
    installCommand: v.optional(v.string()),
    version: v.optional(v.string()),
    license: v.optional(v.string()),
    weeklyDownloads: v.optional(v.number()),
    totalFiles: v.optional(v.number()),
    lastPublish: v.optional(v.string()),
    collaborators: v.optional(
      v.array(
        v.object({
          name: v.string(),
          avatar: v.string(),
        }),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const { packageId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("packages", packageId, patch);
    }
    return null;
  },
});

// Admin mutation: Update submitter email for a package
export const updateSubmitterEmail = mutation({
  args: {
    packageId: v.id("packages"),
    submitterEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const email = args.submitterEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    await ctx.db.patch(args.packageId, { submitterEmail: email });
    return null;
  },
});

// Admin mutation: Update additional emails for a package
export const updateAdditionalEmails = mutation({
  args: {
    packageId: v.id("packages"),
    additionalEmails: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    // Filter and clean email list
    const cleanEmails = args.additionalEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));

    await ctx.db.patch(args.packageId, { additionalEmails: cleanEmails });
    return null;
  },
});

// Internal query: Get package by slug (for badge service)
export const _getPackageBySlug = internalQuery({
  args: { slug: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Internal query: List all approved+visible packages (for llms.txt endpoint)
export const _listApprovedPackages = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const packages = await ctx.db
      .query("packages")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "approved"))
      .collect();
    return packages.filter(
      (pkg) => !pkg.visibility || pkg.visibility === "visible",
    );
  },
});

// Internal mutation: Record a badge fetch event
export const _recordBadgeFetch = internalMutation({
  args: {
    slug: v.string(),
    packageId: v.optional(v.id("packages")),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("badgeFetches", {
      slug: args.slug,
      packageId: args.packageId,
      fetchedAt: Date.now(),
      referrer: args.referrer,
      userAgent: args.userAgent,
    });
    return null;
  },
});

// Admin query: Get badge fetch stats for a component
export const getBadgeStats = query({
  args: { packageId: v.id("packages") },
  returns: v.object({
    last7Days: v.number(),
    last30Days: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const allFetches = await ctx.db
      .query("badgeFetches")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    const last7 = allFetches.filter((f) => f.fetchedAt >= sevenDaysAgo).length;
    const last30 = allFetches.filter(
      (f) => f.fetchedAt >= thirtyDaysAgo,
    ).length;

    return {
      last7Days: last7,
      last30Days: last30,
      total: allFetches.length,
    };
  },
});

// ============ COMPONENT RATINGS ============

// Get average rating and count for a component
export const getComponentRating = query({
  args: { packageId: v.id("packages") },
  returns: v.object({
    average: v.number(),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("componentRatings")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .collect();

    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  },
});

// Submit or update a star rating for a component
export const rateComponent = mutation({
  args: {
    packageId: v.id("packages"),
    rating: v.number(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate rating 1-5
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check for existing rating from this session
    const existing = await ctx.db
      .query("componentRatings")
      .withIndex("by_package_and_session", (q) =>
        q.eq("packageId", args.packageId).eq("sessionId", args.sessionId)
      )
      .first();

    if (existing) {
      // Update existing rating
      if (existing.rating === args.rating) return null;
      await ctx.db.patch("componentRatings", existing._id, { rating: args.rating });
    } else {
      // Insert new rating
      await ctx.db.insert("componentRatings", {
        packageId: args.packageId,
        rating: args.rating,
        sessionId: args.sessionId,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// ============ CATEGORY MANAGEMENT ============

// Default categories to seed if the table is empty
const DEFAULT_CATEGORIES = [
  { slug: "ai", label: "AI", description: "Components for building AI-powered applications.", sortOrder: 0 },
  { slug: "auth", label: "Authentication", description: "Components for authentication and authorization.", sortOrder: 1 },
  { slug: "backend", label: "Backend", description: "Backend capabilities powering features throughout the stack.", sortOrder: 2 },
  { slug: "database", label: "Database", description: "Components for real-time data management and synchronization.", sortOrder: 3 },
  { slug: "durable-functions", label: "Durable Functions", description: "Workflows, crons, and background jobs.", sortOrder: 4 },
  { slug: "integrations", label: "Integrations", description: "Third-party service integrations.", sortOrder: 5 },
  { slug: "payments", label: "Payments", description: "Payment processing and billing.", sortOrder: 6 },
];

// Public: List all enabled categories (sorted by sortOrder)
export const listEnabledDirectoryCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      slug: v.string(),
      label: v.string(),
      description: v.string(),
      sortOrder: v.number(),
      enabled: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_sort_order")
      .collect();

    return cats.filter((c) => c.enabled);
  },
});

// Backwards-compatible alias query name.
export const listDirectoryCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      slug: v.string(),
      label: v.string(),
      description: v.string(),
      sortOrder: v.number(),
      enabled: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_sort_order")
      .collect();

    return cats.filter((c) => c.enabled);
  },
});

// Admin: List all categories (including disabled)
export const listAllDirectoryCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      slug: v.string(),
      label: v.string(),
      description: v.string(),
      sortOrder: v.number(),
      enabled: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_sort_order")
      .collect();
  },
});

// Admin: Create or update a category
export const upsertCategory = mutation({
  args: {
    id: v.optional(v.id("categories")),
    slug: v.string(),
    label: v.string(),
    description: v.string(),
    sortOrder: v.number(),
    enabled: v.boolean(),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    if (args.id) {
      await ctx.db.patch("categories", args.id, {
        slug: args.slug,
        label: args.label,
        description: args.description,
        sortOrder: args.sortOrder,
        enabled: args.enabled,
      });
      return args.id;
    }
    return await ctx.db.insert("categories", {
      slug: args.slug,
      label: args.label,
      description: args.description,
      sortOrder: args.sortOrder,
      enabled: args.enabled,
    });
  },
});

// Admin: Delete a category
export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("categories", args.id);
    return null;
  },
});

// Admin: Seed default categories if table is empty
export const seedCategories = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").first();
    if (existing) return null;

    for (const cat of DEFAULT_CATEGORIES) {
      await ctx.db.insert("categories", { ...cat, enabled: true });
    }
    return null;
  },
});

// ============ GITHUB ISSUES ============

// GitHub issue shape returned to the client
const githubIssueValidator = v.object({
  number: v.number(),
  title: v.string(),
  state: v.string(),
  html_url: v.string(),
  created_at: v.string(),
  user: v.optional(v.string()),
  labels: v.array(v.string()),
  comments: v.number(),
});

// Parse owner/repo from a GitHub repository URL
function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

// Public action: Fetch GitHub issues for a component's repository
// Returns a list of issues (open or closed) for display in the issues tab
export const fetchGitHubIssues = action({
  args: {
    repositoryUrl: v.string(),
    state: v.union(v.literal("open"), v.literal("closed")),
    page: v.optional(v.number()),
  },
  returns: v.object({
    issues: v.array(githubIssueValidator),
    hasMore: v.boolean(),
  }),
  handler: async (_ctx, args) => {
    const parsed = parseGitHubRepo(args.repositoryUrl);
    if (!parsed) {
      return { issues: [], hasMore: false };
    }

    const page = args.page ?? 1;
    const perPage = 25;
    const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues?state=${args.state}&per_page=${perPage}&page=${page}&sort=created&direction=desc`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ConvexComponentsDirectory",
    };

    // Use GitHub token if available (raises rate limit from 60 to 5000/hr)
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      return { issues: [], hasMore: false };
    }

    const data = await response.json();

    // GitHub issues API also returns pull requests; filter them out
    const issues = (data as any[])
      .filter((item: any) => !item.pull_request)
      .map((item: any) => ({
        number: item.number,
        title: item.title,
        state: item.state,
        html_url: item.html_url,
        created_at: item.created_at,
        user: item.user?.login,
        labels: (item.labels || []).map((l: any) => l.name),
        comments: item.comments || 0,
      }));

    // Check if there could be more pages
    const linkHeader = response.headers.get("Link");
    const hasMore = linkHeader ? linkHeader.includes('rel="next"') : data.length === perPage;

    return { issues, hasMore };
  },
});

// Public action: Fetch and cache GitHub issue counts for a package
// Called on demand from the detail page; caches counts in the DB
export const refreshGitHubIssueCounts = action({
  args: { packageId: v.id("packages") },
  returns: v.object({
    openCount: v.number(),
    closedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get the package to read its repositoryUrl
    const pkg = await ctx.runQuery(internal.packages._getPackage, {
      packageId: args.packageId,
    });

    if (!pkg || !pkg.repositoryUrl) {
      return { openCount: 0, closedCount: 0 };
    }

    const parsed = parseGitHubRepo(pkg.repositoryUrl);
    if (!parsed) {
      return { openCount: 0, closedCount: 0 };
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ConvexComponentsDirectory",
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Fetch open and closed counts in parallel using search API (returns total_count)
    const [openRes, closedRes] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=repo:${parsed.owner}/${parsed.repo}+type:issue+state:open`,
        { headers },
      ),
      fetch(
        `https://api.github.com/search/issues?q=repo:${parsed.owner}/${parsed.repo}+type:issue+state:closed`,
        { headers },
      ),
    ]);

    let openCount = 0;
    let closedCount = 0;

    if (openRes.ok) {
      const openData = await openRes.json();
      openCount = openData.total_count ?? 0;
    }
    if (closedRes.ok) {
      const closedData = await closedRes.json();
      closedCount = closedData.total_count ?? 0;
    }

    // Cache the counts in the database
    await ctx.runMutation(internal.packages._updateGitHubIssueCounts, {
      packageId: args.packageId,
      openCount,
      closedCount,
    });

    return { openCount, closedCount };
  },
});

// Internal mutation: Cache GitHub issue counts on a package
export const _updateGitHubIssueCounts = internalMutation({
  args: {
    packageId: v.id("packages"),
    openCount: v.number(),
    closedCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("packages", args.packageId, {
      githubOpenIssues: args.openCount,
      githubClosedIssues: args.closedCount,
      githubIssuesFetchedAt: Date.now(),
    });
    return null;
  },
});

// ============ SLUG MIGRATION TOOLS ============

// Admin query: Get packages without slugs
export const getPackagesWithoutSlugs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("packages"),
      name: v.string(),
      npmUrl: v.string(),
      submittedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);

    const packages = await ctx.db.query("packages").collect();

    return packages
      .filter((pkg) => !pkg.slug || pkg.slug.trim() === "")
      .map((pkg) => ({
        _id: pkg._id,
        name: pkg.name,
        npmUrl: pkg.npmUrl,
        submittedAt: pkg.submittedAt,
      }));
  },
});

// Admin mutation: Generate slug for a single package
export const generateSlugForPackage = mutation({
  args: { packageId: v.id("packages") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return null;

    // Skip if already has a slug
    if (pkg.slug && pkg.slug.trim() !== "") {
      return pkg.slug;
    }

    const slug = generateSlugFromName(pkg.name);
    if (!slug) return null;

    await ctx.db.patch(args.packageId, { slug });
    return slug;
  },
});

// Admin mutation: Generate slugs for all packages without them
export const generateMissingSlugs = mutation({
  args: {},
  returns: v.object({
    generated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);

    const packages = await ctx.db.query("packages").collect();

    let generated = 0;
    let skipped = 0;

    for (const pkg of packages) {
      // Skip if already has a slug
      if (pkg.slug && pkg.slug.trim() !== "") {
        skipped++;
        continue;
      }

      const slug = generateSlugFromName(pkg.name);
      if (slug) {
        await ctx.db.patch(pkg._id, { slug });
        generated++;
      } else {
        skipped++;
      }
    }

    return { generated, skipped };
  },
});
