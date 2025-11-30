import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

export const fetchNpmPackage = action({
  args: { packageName: v.string() },
  handler: async (ctx, args) => {
    const name = decodeURIComponent(args.packageName.trim());

    // For scoped packages (@scope/name), encode the slash between scope and name
    // npm registry requires: @scope%2Fname format
    const encodedName = name.startsWith("@")
      ? name.replace("/", "%2F")
      : name;
    const registryUrl = `https://registry.npmjs.org/${encodedName}`;

    // Use encodeURIComponent for the downloads API
    const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`;

    const [metadataResponse, downloadsResponse] = await Promise.all([
      fetch(registryUrl, { method: "GET" }),
      fetch(downloadsUrl, { method: "GET" }),
    ]);

    if (!metadataResponse.ok) {
      throw new Error(
        `Failed to fetch registry metadata for "${name}": ${metadataResponse.status} ${metadataResponse.statusText}`
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
      })
    );

    // Get last publish time
    const lastPublish = metadata.time?.[latestVersion] || new Date().toISOString();

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
    // Get the existing package to get its name
    const pkg = await ctx.runQuery(api.packages.getPackage, {
      packageId: args.packageId,
    });

    if (!pkg) {
      throw new Error("Package not found");
    }

    // Fetch fresh data from npm
    const packageData: any = await ctx.runAction(api.packages.fetchNpmPackage, {
      packageName: pkg.name,
    });

    // Update the package with fresh npm data (preserves submitter info, review status, etc.)
    await ctx.runMutation(api.packages.updateNpmData, {
      packageId: args.packageId,
      description: packageData.description,
      version: packageData.version,
      license: packageData.license,
      repositoryUrl: packageData.repositoryUrl,
      homepageUrl: packageData.homepageUrl,
      unpackedSize: packageData.unpackedSize,
      totalFiles: packageData.totalFiles,
      lastPublish: packageData.lastPublish,
      weeklyDownloads: packageData.weeklyDownloads,
      collaborators: packageData.collaborators,
    });

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
    const urlMatch = args.npmUrl.match(/npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/);
    if (!urlMatch) {
      throw new Error("Invalid npm URL. Expected format: https://www.npmjs.com/package/package-name");
    }

    const packageName = decodeURIComponent(urlMatch[1]);

    // Check if package already exists
    const existing = await ctx.runQuery(api.packages.getPackageByName, {
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

    if ((autoApproveEnabled || autoRejectEnabled) && packageData.repositoryUrl) {
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
      })
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
      })
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

export const listPackages = query({
  args: { sortBy: v.optional(v.union(v.literal("newest"), v.literal("downloads"), v.literal("updated"))) },
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "newest";

    // Get all packages and filter to only visible ones for public view
    // All submissions are visible by default (pending included), admins can hide/archive
    const allPackages = await ctx.db.query("packages").collect();
    
    // Filter: show packages that are visible (or no visibility set = visible by default)
    // Hidden and archived packages are excluded from public view
    const publicPackages = allPackages.filter(pkg => {
      const isVisible = !pkg.visibility || pkg.visibility === "visible";
      return isVisible;
    });

    if (sortBy === "newest") {
      return publicPackages
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 50);
    }

    if (sortBy === "downloads") {
      return publicPackages
        .sort((a, b) => b.weeklyDownloads - a.weeklyDownloads)
        .slice(0, 50);
    }

    if (sortBy === "updated") {
      return publicPackages
        .sort((a, b) => new Date(b.lastPublish).getTime() - new Date(a.lastPublish).getTime())
        .slice(0, 50);
    }

    return publicPackages.slice(0, 50);
  },
});

export const getAllPackages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("packages").collect();
  },
});

// Public search: searches visible packages by name, description, or maintainer names
export const searchPackages = query({
  args: { searchTerm: v.string() },
  returns: v.array(v.object({
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
    collaborators: v.array(v.object({
      name: v.string(),
      avatar: v.string(),
    })),
    maintainerNames: v.optional(v.string()),
    npmUrl: v.string(),
    submittedAt: v.number(),
    // Submitter info (optional - may not exist on older records)
    submitterName: v.optional(v.string()),
    submitterEmail: v.optional(v.string()),
    submitterDiscord: v.optional(v.string()),
    // Live demo URL (optional)
    demoUrl: v.optional(v.string()),
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
  })),
  handler: async (ctx, args) => {
    // If no search term, return all visible packages sorted by newest
    if (!args.searchTerm.trim()) {
      const allPackages = await ctx.db.query("packages").collect();
      return allPackages
        .filter(pkg => !pkg.visibility || pkg.visibility === "visible")
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 50);
    }

    // Search by name using Convex full-text search
    const nameResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchTerm))
      .take(50);

    // Search by description using Convex full-text search
    const descriptionResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_description", (q) => q.search("description", args.searchTerm))
      .take(50);

    // Search by maintainer names using Convex full-text search
    const maintainerResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_maintainers", (q) => q.search("maintainerNames", args.searchTerm))
      .take(50);

    // Combine results and deduplicate by _id
    const seen = new Set<string>();
    const combined: typeof nameResults = [];
    
    for (const pkg of [...nameResults, ...descriptionResults, ...maintainerResults]) {
      if (!seen.has(pkg._id)) {
        seen.add(pkg._id);
        // Filter to only visible packages
        if (!pkg.visibility || pkg.visibility === "visible") {
          combined.push(pkg);
        }
      }
    }

    return combined.slice(0, 50);
  },
});

// Admin search: searches all packages by name, description, or maintainer names
export const adminSearchPackages = query({
  args: { searchTerm: v.string() },
  returns: v.array(v.object({
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
    collaborators: v.array(v.object({
      name: v.string(),
      avatar: v.string(),
    })),
    maintainerNames: v.optional(v.string()),
    npmUrl: v.string(),
    submittedAt: v.number(),
    // Submitter info (optional - may not exist on older records)
    submitterName: v.optional(v.string()),
    submitterEmail: v.optional(v.string()),
    submitterDiscord: v.optional(v.string()),
    // Live demo URL (optional)
    demoUrl: v.optional(v.string()),
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
  })),
  handler: async (ctx, args) => {
    // If no search term, return all packages sorted by newest
    if (!args.searchTerm.trim()) {
      return await ctx.db
        .query("packages")
        .withIndex("by_submitted_at")
        .order("desc")
        .take(100);
    }

    // Search by name using Convex full-text search
    const nameResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchTerm))
      .take(100);

    // Search by description using Convex full-text search
    const descriptionResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_description", (q) => q.search("description", args.searchTerm))
      .take(100);

    // Search by maintainer names using Convex full-text search
    const maintainerResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_maintainers", (q) => q.search("maintainerNames", args.searchTerm))
      .take(100);

    // Combine results and deduplicate by _id
    const seen = new Set<string>();
    const combined: typeof nameResults = [];
    
    for (const pkg of [...nameResults, ...descriptionResults, ...maintainerResults]) {
      if (!seen.has(pkg._id)) {
        seen.add(pkg._id);
        combined.push(pkg);
      }
    }

    return combined.slice(0, 100);
  },
});

export const getPackage = query({
  args: { packageId: v.id("packages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.packageId);
  },
});

export const getPackageByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
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
      v.literal("rejected")
    ),
    reviewNotes: v.optional(v.string()),
    reviewerEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch(args.packageId, {
      reviewStatus: args.reviewStatus,
      reviewedBy: args.reviewerEmail,
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
      v.literal("archived")
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

// Admin query: Get packages by review status
export const getPackagesByStatus = query({
  args: {
    reviewStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("changes_requested"),
      v.literal("rejected"),
      v.literal("all")
    )),
  },
  returns: v.array(v.object({
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
    collaborators: v.array(v.object({
      name: v.string(),
      avatar: v.string(),
    })),
    maintainerNames: v.optional(v.string()),
    npmUrl: v.string(),
    submittedAt: v.number(),
    // Submitter info (optional - may not exist on older records)
    submitterName: v.optional(v.string()),
    submitterEmail: v.optional(v.string()),
    submitterDiscord: v.optional(v.string()),
    // Live demo URL (optional)
    demoUrl: v.optional(v.string()),
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
  })),
  handler: async (ctx, args) => {
    const status = args.reviewStatus || "all";
    
    if (status === "all") {
      return await ctx.db.query("packages").collect();
    }
    
    // Get all packages and filter by status (including undefined as pending)
    const allPackages = await ctx.db.query("packages").collect();
    
    if (status === "pending") {
      // Treat undefined reviewStatus as pending
      return allPackages.filter(pkg => !pkg.reviewStatus || pkg.reviewStatus === "pending");
    }
    
    return allPackages.filter(pkg => pkg.reviewStatus === status);
  },
});

// ============ PACKAGE NOTES ============

// Query: Get notes for a package with reply counts
export const getPackageNotes = query({
  args: { packageId: v.id("packages") },
  returns: v.array(v.object({
    _id: v.id("packageNotes"),
    _creationTime: v.number(),
    packageId: v.id("packages"),
    content: v.string(),
    authorEmail: v.string(),
    authorName: v.optional(v.string()),
    parentNoteId: v.optional(v.id("packageNotes")),
    createdAt: v.number(),
    replyCount: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get all notes for this package
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
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
      })
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
      v.literal("error")
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
      v.literal("error")
    ),
    summary: v.string(),
    criteria: v.array(v.object({
      name: v.string(),
      passed: v.boolean(),
      notes: v.string(),
    })),
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
  returns: v.array(v.object({
    _id: v.id("packageComments"),
    _creationTime: v.number(),
    packageId: v.id("packages"),
    content: v.string(),
    authorEmail: v.string(),
    authorName: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get all comments for this package, ordered by creation time
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
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
