import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
  // Submitter info (admin only)
  submitterName: v.optional(v.string()),
  submitterEmail: v.optional(v.string()),
  submitterDiscord: v.optional(v.string()),
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
    demoUrl: pkg.demoUrl,
    reviewStatus: pkg.reviewStatus,
    visibility: pkg.visibility,
    featured: pkg.featured,
    // Only expose status, not summary/criteria/error
    aiReviewStatus: pkg.aiReviewStatus,
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
    // Submitter info (admin only)
    submitterName: pkg.submitterName,
    submitterEmail: pkg.submitterEmail,
    submitterDiscord: pkg.submitterDiscord,
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
  };
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
    npmUrl: v.string(),
    submitterName: v.string(),
    submitterEmail: v.string(),
    submitterDiscord: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Allow unauthenticated submissions
    const userId = await getAuthUserId(ctx);

    // Parse package name from URL
    // Handles: https://www.npmjs.com/package/@convex-dev/agent or https://www.npmjs.com/package/react
    // For scoped packages, capture @scope/name together
    const urlMatch = args.npmUrl.match(
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

    // Insert into database with submitter info
    // Package shows up immediately in frontend and admin
    const packageId = await ctx.runMutation(api.packages.addPackage, {
      ...packageData,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      submitterDiscord: args.submitterDiscord,
      demoUrl: args.demoUrl,
    });

    // Check if auto-approve or auto-reject is enabled
    // If so, automatically trigger AI review in background
    const settings = await ctx.runQuery(api.packages.getAdminSettings);
    const autoApproveEnabled = settings.autoApproveOnPass || false;
    const autoRejectEnabled = settings.autoRejectOnFail || false;

    if (
      (autoApproveEnabled || autoRejectEnabled) &&
      packageData.repositoryUrl
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
  },
  handler: async (ctx, args) => {
    // Allow unauthenticated submissions
    const userId = await getAuthUserId(ctx);

    // Create denormalized maintainer names string for search
    const maintainerNames = args.collaborators.map((c) => c.name).join(" ");

    // Check if package already exists
    const existing = await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Update existing package (keep existing submitter info)
      await ctx.db.patch(existing._id, {
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
      });
      return existing._id;
    }

    // Insert new package with submitter info and maintainer names
    return await ctx.db.insert("packages", {
      ...args,
      maintainerNames,
      submittedAt: Date.now(),
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
    await ctx.db.patch(args.packageId, {
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
    // Hidden and archived packages are excluded from public view
    const publicPackages = allPackages.filter((pkg) => {
      const isVisible = !pkg.visibility || pkg.visibility === "visible";
      return isVisible;
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Not authenticated - return empty array (not an error to avoid info leakage)
      return [];
    }

    // Get user's email from authAccounts table
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    // Check if email ends with @convex.dev (admin check)
    if (!authAccount?.providerAccountId?.endsWith("@convex.dev")) {
      // Not an admin - return empty array
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
        .filter((pkg) => !pkg.visibility || pkg.visibility === "visible")
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
        // Filter to only visible packages
        if (!pkg.visibility || pkg.visibility === "visible") {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return []; // Not authenticated
    }

    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!authAccount?.providerAccountId?.endsWith("@convex.dev")) {
      return []; // Not an admin
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
    return await ctx.db.get(args.packageId);
  },
});

// SECURITY: Public query - returns safe package data only
export const getPackage = query({
  args: { packageId: v.id("packages") },
  returns: v.union(v.null(), publicPackageValidator),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
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
    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch(args.packageId, {
      reviewStatus: args.reviewStatus,
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      ...(args.reviewNotes !== undefined && { reviewNotes: args.reviewNotes }),
    });
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
    await ctx.db.patch(args.packageId, {
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
    await ctx.db.delete(args.packageId);
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
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }

    // Only approved packages can be featured
    if (pkg.reviewStatus !== "approved") {
      throw new Error("Only approved packages can be featured");
    }

    // Toggle featured status
    await ctx.db.patch(args.packageId, {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return []; // Not authenticated
    }

    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!authAccount?.providerAccountId?.endsWith("@convex.dev")) {
      return []; // Not an admin
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
    // Insert the note with timestamp-based ordering
    return await ctx.db.insert("packageNotes", {
      packageId: args.packageId,
      content: args.content,
      authorEmail: args.authorEmail,
      authorName: args.authorName,
      parentNoteId: args.parentNoteId,
      createdAt: Date.now(),
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
    await ctx.db.delete(args.noteId);
    return null;
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
      return ctx.db.patch(pkg._id, { maintainerNames });
    });

    await Promise.all(updates);
    return packagesToUpdate.length;
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
    await ctx.db.patch(args.packageId, {
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
    await ctx.db.patch(args.packageId, {
      aiReviewStatus: args.status,
      aiReviewSummary: args.summary,
      aiReviewCriteria: args.criteria,
      aiReviewedAt: Date.now(),
      aiReviewError: args.error,
    });
    return null;
  },
});

// Get admin settings for auto-approve/reject
export const getAdminSettings = query({
  args: {},
  returns: v.object({
    autoApproveOnPass: v.boolean(),
    autoRejectOnFail: v.boolean(),
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

    return {
      autoApproveOnPass: autoApprove?.value || false,
      autoRejectOnFail: autoReject?.value || false,
    };
  },
});

// Update admin setting
export const updateAdminSetting = mutation({
  args: {
    key: v.union(v.literal("autoApproveOnPass"), v.literal("autoRejectOnFail")),
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
      await ctx.db.patch(existing._id, {
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
    await ctx.db.delete(args.commentId);
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
        await ctx.db.patch(existing._id, { value: args.value as boolean });
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
        await ctx.db.patch(existing._id, { value: args.value as number });
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
    const log = await ctx.db.get(args.logId);
    if (!log) return null;

    await ctx.db.patch(args.logId, {
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
    await ctx.db.patch(args.logId, {
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
      await ctx.db.delete(log._id);
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
    await ctx.db.patch(args.packageId, update);
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
    await ctx.db.patch(args.packageId, {
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
