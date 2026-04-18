import { v, ConvexError } from "convex/values";
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
import { getAdminIdentity, requireAdminIdentity } from "./auth";
import { api, internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import { buildSkillMdFromContent } from "../shared/buildSkillMd";

// ============ HELPER: Recount category package/verified counts ============
// Recalculates denormalized counts on the categories table after approval/visibility changes.
// Only patches categories whose counts actually changed (avoids subscription invalidation).
async function recountCategoryStats(ctx: MutationCtx) {
  const allCategories = await ctx.db.query("categories").take(1000);
  const approvedPackages = await ctx.db
    .query("packages")
    .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
    .take(5000);

  const countMap: Record<string, number> = {};
  const verifiedMap: Record<string, number> = {};
  for (const pkg of approvedPackages) {
    if (pkg.visibility === "hidden" || pkg.visibility === "archived" || pkg.markedForDeletion) continue;
    if (!pkg.category) continue;
    countMap[pkg.category] = (countMap[pkg.category] || 0) + 1;
    if (pkg.convexVerified) {
      verifiedMap[pkg.category] = (verifiedMap[pkg.category] || 0) + 1;
    }
  }

  for (const cat of allCategories) {
    const newCount = countMap[cat.slug] || 0;
    const newVerified = verifiedMap[cat.slug] || 0;
    if (cat.packageCount !== newCount || cat.verifiedCount !== newVerified) {
      await ctx.db.patch(cat._id, {
        packageCount: newCount,
        verifiedCount: newVerified,
      });
    }
  }
}

// ============ HELPER: Get current user's email from identity claims ============
async function getCurrentUserEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.email ?? null;
}

// ============ HELPER: Check if user owns a package ============
// Checks both submitterEmail and additionalEmails array
function userOwnsPackage(pkg: Doc<"packages">, userEmail: string): boolean {
  if (pkg.submitterEmail === userEmail) return true;
  if (pkg.additionalEmails?.includes(userEmail)) return true;
  return false;
}

function formatSlackNotification(
  pkg: Doc<"packages">,
  headline: string,
  fromLabel: string,
  content: string,
): string {
  const slugForUrl = pkg.slug ?? pkg.name;
  const displayName = `${pkg.componentName ?? pkg.name} (${pkg.name})`;
  const preview = content.length > 200 ? `${content.slice(0, 200)}...` : content;
  return (
    `${headline} ${displayName}\n` +
    `From: ${fromLabel}\n` +
    `https://www.convex.dev/components/${slugForUrl}\n` +
    `Preview: ${preview}`
  );
}

async function requirePackageOwnerOrAdmin(
  ctx: MutationCtx,
  packageId: Id<"packages">,
): Promise<Doc<"packages">> {
  const pkg = await ctx.db.get(packageId);
  if (!pkg) {
    throw new ConvexError("Package not found");
  }

  const adminIdentity = await getAdminIdentity(ctx);
  if (adminIdentity) {
    return pkg;
  }

  const userEmail = await getCurrentUserEmail(ctx);
  if (!userEmail) {
    throw new ConvexError("Authentication required");
  }

  if (!userOwnsPackage(pkg, userEmail)) {
    throw new ConvexError("You can only modify your own submissions");
  }

  return pkg;
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
  communitySubmitted: v.optional(v.boolean()),
  authorUsername: v.optional(v.string()),
  authorAvatar: v.optional(v.string()),
  componentName: v.optional(v.string()),
  hideThumbnailInCategory: v.optional(v.boolean()),
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
  hideSeoAndSkillContentOnDetailPage: v.optional(v.boolean()),
  // AI-generated SKILL.md content for Claude agent skills
  skillMd: v.optional(v.string()),
  // Discord username (displayed on detail page, links to Convex community)
  submitterDiscord: v.optional(v.string()),
  // --- V2 generated content model ---
  generatedDescription: v.optional(v.string()),
  generatedUseCases: v.optional(v.string()),
  generatedHowItWorks: v.optional(v.string()),
  readmeIncludedMarkdown: v.optional(v.string()),
  readmeIncludeSource: v.optional(
    v.union(v.literal("markers"), v.literal("full")),
  ),
  contentGenerationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error"),
    ),
  ),
  contentGeneratedAt: v.optional(v.number()),
  contentModelVersion: v.optional(v.number()),
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
  allTimeDownloads: v.optional(v.number()),
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
  communitySubmitted: v.optional(v.boolean()),
  authorUsername: v.optional(v.string()),
  authorAvatar: v.optional(v.string()),
  componentName: v.optional(v.string()),
  hideThumbnailInCategory: v.optional(v.boolean()),
  hideFromSubmissions: v.optional(v.boolean()),
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
  hideSeoAndSkillContentOnDetailPage: v.optional(v.boolean()),
  // --- V2 generated content model ---
  generatedDescription: v.optional(v.string()),
  generatedUseCases: v.optional(v.string()),
  generatedHowItWorks: v.optional(v.string()),
  readmeIncludedMarkdown: v.optional(v.string()),
  readmeIncludeSource: v.optional(
    v.union(v.literal("markers"), v.literal("full")),
  ),
  contentGenerationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("error"),
    ),
  ),
  contentGenerationError: v.optional(v.string()),
  contentGeneratedAt: v.optional(v.number()),
  contentModelVersion: v.optional(v.number()),
  // Deletion fields
  markedForDeletion: v.optional(v.boolean()),
  markedForDeletionAt: v.optional(v.number()),
  markedForDeletionBy: v.optional(v.string()),
});

const aiReviewCriterionValidator = v.object({
  name: v.string(),
  passed: v.boolean(),
  notes: v.string(),
});

const aiReviewRunValidator = v.object({
  _id: v.id("aiReviewRuns"),
  _creationTime: v.number(),
  packageId: v.id("packages"),
  createdAt: v.number(),
  status: v.union(
    v.literal("passed"),
    v.literal("failed"),
    v.literal("partial"),
    v.literal("error"),
  ),
  summary: v.string(),
  criteria: v.array(aiReviewCriterionValidator),
  error: v.optional(v.string()),
  provider: v.optional(
    v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("gemini"),
    ),
  ),
  model: v.optional(v.string()),
  source: v.optional(v.string()),
  rawOutput: v.optional(v.string()),
});

const submitPageSizeValidator = v.union(v.literal(20), v.literal(40), v.literal(60));

const paginatedPublicPackagesValidator = v.object({
  items: v.array(publicPackageValidator),
  total: v.number(),
  page: v.number(),
  pageSize: submitPageSizeValidator,
  totalPages: v.number(),
});

const SUBMIT_PAGE_SIZE_SETTING_KEY = "submitPageSizeDefault";

function getSubmitPageSizeValue(value: number | undefined): 20 | 40 | 60 {
  if (value === 20 || value === 40 || value === 60) return value;
  return 40;
}

function sortPublicPackages(
  packages: Array<Doc<"packages">>,
  sortBy: "newest" | "downloads" | "updated" | "verified",
): Array<Doc<"packages">> {
  if (sortBy === "downloads") {
    return [...packages].sort((a, b) => b.weeklyDownloads - a.weeklyDownloads);
  }
  if (sortBy === "updated") {
    return [...packages].sort(
      (a, b) =>
        new Date(b.lastPublish).getTime() - new Date(a.lastPublish).getTime(),
    );
  }
  if (sortBy === "verified") {
    return [...packages].sort((a, b) => {
      const verifiedDelta =
        Number(Boolean(b.convexVerified)) - Number(Boolean(a.convexVerified));
      if (verifiedDelta !== 0) return verifiedDelta;
      return b.submittedAt - a.submittedAt;
    });
  }
  return [...packages].sort((a, b) => b.submittedAt - a.submittedAt);
}

function paginatePublicPackages(
  packages: Array<Doc<"packages">>,
  page: number,
  pageSize: 20 | 40 | 60,
) {
  const total = packages.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = packages.slice(start, start + pageSize);

  return {
    items: items.map(toPublicPackage),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

async function getVisibleSubmitPackages(ctx: QueryCtx) {
  const allPackages = await ctx.db.query("packages").take(1000);
  return allPackages.filter((pkg) => {
    const isVisible = !pkg.visibility || pkg.visibility === "visible";
    return isVisible && !pkg.markedForDeletion && !pkg.hideFromSubmissions;
  });
}

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
    lastPublish: pkg.lastPublish || "Unknown",
    weeklyDownloads: pkg.weeklyDownloads ?? 0,
    collaborators: pkg.collaborators || [],
    maintainerNames: pkg.maintainerNames,
    npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
    submittedAt: pkg.submittedAt ?? pkg._creationTime ?? 0,
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
    communitySubmitted: pkg.communitySubmitted,
    authorUsername: pkg.authorUsername,
    authorAvatar: pkg.authorAvatar,
    componentName: pkg.componentName,
    hideThumbnailInCategory: pkg.hideThumbnailInCategory,
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
    hideSeoAndSkillContentOnDetailPage: pkg.hideSeoAndSkillContentOnDetailPage,
    skillMd: pkg.skillMd,
    submitterDiscord: pkg.submitterDiscord,
    // V2 content model
    generatedDescription: pkg.generatedDescription,
    generatedUseCases: pkg.generatedUseCases,
    generatedHowItWorks: pkg.generatedHowItWorks,
    readmeIncludedMarkdown: pkg.readmeIncludedMarkdown,
    readmeIncludeSource: pkg.readmeIncludeSource,
    contentGenerationStatus: pkg.contentGenerationStatus,
    contentGeneratedAt: pkg.contentGeneratedAt,
    contentModelVersion: pkg.contentModelVersion,
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
    lastPublish: pkg.lastPublish || "Unknown",
    weeklyDownloads: pkg.weeklyDownloads ?? 0,
    allTimeDownloads: pkg.allTimeDownloads,
    collaborators: pkg.collaborators || [],
    maintainerNames: pkg.maintainerNames,
    npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
    submittedAt: pkg.submittedAt ?? pkg._creationTime ?? 0,
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
    communitySubmitted: pkg.communitySubmitted,
    authorUsername: pkg.authorUsername,
    authorAvatar: pkg.authorAvatar,
    componentName: pkg.componentName,
    hideThumbnailInCategory: pkg.hideThumbnailInCategory,
    hideFromSubmissions: pkg.hideFromSubmissions,
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
    hideSeoAndSkillContentOnDetailPage: pkg.hideSeoAndSkillContentOnDetailPage,
    // V2 content model
    generatedDescription: pkg.generatedDescription,
    generatedUseCases: pkg.generatedUseCases,
    generatedHowItWorks: pkg.generatedHowItWorks,
    readmeIncludedMarkdown: pkg.readmeIncludedMarkdown,
    readmeIncludeSource: pkg.readmeIncludeSource,
    contentGenerationStatus: pkg.contentGenerationStatus,
    contentGenerationError: pkg.contentGenerationError,
    contentGeneratedAt: pkg.contentGeneratedAt,
    contentModelVersion: pkg.contentModelVersion,
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

// Check if slug is already in use by another package (excluding the given packageId)
async function isSlugTaken(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  excludePackageId?: Id<"packages">
): Promise<boolean> {
  const existing = await ctx.db
    .query("packages")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (!existing) return false;
  if (excludePackageId && existing._id === excludePackageId) return false;
  return true;
}

// Generate a unique slug, appending numeric suffix if collision occurs
// Deterministic: always appends -2, -3, etc. until unique
async function generateUniqueSlug(
  ctx: QueryCtx | MutationCtx,
  baseSlug: string,
  excludePackageId?: Id<"packages">
): Promise<string> {
  if (!baseSlug) return "";
  
  // Check base slug first
  if (!(await isSlugTaken(ctx, baseSlug, excludePackageId))) {
    return baseSlug;
  }
  
  // Append numeric suffix until unique
  let suffix = 2;
  const maxAttempts = 100;
  while (suffix <= maxAttempts) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await isSlugTaken(ctx, candidate, excludePackageId))) {
      return candidate;
    }
    suffix++;
  }
  
  // Fallback: append timestamp if all numeric suffixes exhausted
  return `${baseSlug}-${Date.now()}`;
}

const fetchNpmPackageReturnValidator = v.object({
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
  allTimeDownloads: v.number(),
  collaborators: v.array(
    v.object({
      name: v.string(),
      avatar: v.string(),
    }),
  ),
  npmUrl: v.string(),
});

export async function fetchNpmPackageHandler(_ctx: any, args: { packageName: string }) {
    const name = decodeURIComponent(args.packageName.trim());

    // For scoped packages (@scope/name), encode the slash between scope and name
    // npm registry requires: @scope%2Fname format
    const encodedName = name.startsWith("@") ? name.replace("/", "%2F") : name;
    const registryUrl = `https://registry.npmjs.org/${encodedName}`;

    // Use encodeURIComponent for the downloads API
    const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`;
    // npm API supports a wide date range for cumulative all-time downloads
    const allTimeDownloadsUrl = `https://api.npmjs.org/downloads/point/2015-01-01:2099-12-31/${encodeURIComponent(name)}`;

    const [metadataResponse, downloadsResponse, allTimeResponse] = await Promise.all([
      fetch(registryUrl, { method: "GET" }),
      fetch(downloadsUrl, { method: "GET" }),
      fetch(allTimeDownloadsUrl, { method: "GET" }),
    ]);

    if (!metadataResponse.ok) {
      throw new ConvexError(
        `Failed to fetch registry metadata for "${name}": ${metadataResponse.status} ${metadataResponse.statusText}`,
      );
    }

    // downloads API is optional: if it fails, just set weeklyDownloads = 0
    let weeklyDownloads = 0;
    if (downloadsResponse.ok) {
      const downloadsData = await downloadsResponse.json();
      weeklyDownloads = downloadsData.downloads ?? 0;
    }

    let allTimeDownloads = 0;
    if (allTimeResponse.ok) {
      const allTimeData = await allTimeResponse.json();
      allTimeDownloads = allTimeData.downloads ?? 0;
    }

    const metadata = await metadataResponse.json();

    // Get latest version info
    const latestVersion = metadata["dist-tags"]?.latest;
    if (!latestVersion) {
      throw new ConvexError("No latest version found for package");
    }

    const versionData = metadata.versions?.[latestVersion];
    if (!versionData) {
      throw new ConvexError("Version data not found");
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
      allTimeDownloads,
      collaborators,
      npmUrl: `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
    };
}

export const fetchNpmPackage = action({
  args: { packageName: v.string() },
  returns: fetchNpmPackageReturnValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    return fetchNpmPackageHandler(ctx, args);
  },
});

export const _fetchNpmPackage = internalAction({
  args: { packageName: v.string() },
  returns: fetchNpmPackageReturnValidator,
  handler: fetchNpmPackageHandler,
});

async function fetchAndUpdateNpmData(
  ctx: any,
  packageId: Id<"packages">,
  existingPkg: any,
) {
  const packageData: any = await fetchNpmPackageHandler(ctx, {
    packageName: existingPkg.name,
  });

  const repositoryUrl = existingPkg.repositoryUrl || packageData.repositoryUrl;
  const homepageUrl = existingPkg.homepageUrl || packageData.homepageUrl;

  await ctx.runMutation(internal.packages._updateNpmDataAndTimestamp, {
    packageId,
    description: packageData.description,
    version: packageData.version,
    license: packageData.license,
    repositoryUrl,
    homepageUrl,
    unpackedSize: packageData.unpackedSize,
    totalFiles: packageData.totalFiles,
    lastPublish: packageData.lastPublish,
    weeklyDownloads: packageData.weeklyDownloads,
    allTimeDownloads: packageData.allTimeDownloads,
    collaborators: packageData.collaborators,
  });
}

// Admin action: Refresh npm data for a specific package
export const refreshNpmData = action({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await requireAdminIdentity(ctx);

    const pkg = await ctx.runQuery(internal.packages._getPackage, {
      packageId: args.packageId,
    });
    if (!pkg) {
      throw new ConvexError("Package not found");
    }

    try {
      await fetchAndUpdateNpmData(ctx, args.packageId, pkg);
    } catch (error) {
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
    longDescription: v.optional(v.string()),
    tags: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    // V2 generated content fields (from preview)
    generatedDescription: v.optional(v.string()),
    generatedUseCases: v.optional(v.string()),
    generatedHowItWorks: v.optional(v.string()),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
  },
  returns: v.id("packages"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required to submit a package. Please sign in first.");
    }

    const submitterEmail = identity.email?.trim();
    if (!submitterEmail) {
      throw new ConvexError("Your account is missing an email address.");
    }

    const validated = validateSubmitInputs(args);
    const packageName = parsePackageNameFromNpmUrl(validated.npmUrl);

    const prereqs: any = await ctx.runQuery(internal.packages._checkSubmitPrereqs, {
      name: packageName,
    });
    if (prereqs.existing) {
      throw new ConvexError(
        `A component with the npm package "${packageName}" has already been submitted. ` +
        `If this is yours, check your profile for its current status. ` +
        `If you believe this is an error, please reach out to us.`,
      );
    }

    const packageData: any = await fetchNpmPackageHandler(ctx, { packageName });
    const insertData = buildPackageInsertData(args, validated, packageName, packageData, submitterEmail);

    const packageId: Id<"packages"> = await ctx.runMutation(internal.packages._addPackage, insertData);

    await scheduleSubmissionFollowups(ctx, {
      packageId,
      packageName,
      args,
      validated,
      prereqs,
    });

    return packageId;
  },
});

// Schedule Slack notification and optional auto AI / security scans after a
// package is inserted. Nothing here blocks the submission response.
async function scheduleSubmissionFollowups(
  ctx: any,
  params: {
    packageId: Id<"packages">;
    packageName: string;
    args: any;
    validated: any;
    prereqs: any;
  },
) {
  const { packageId, packageName, args, validated, prereqs } = params;

  const inserted = await ctx.runQuery(internal.packages._getPackage, { packageId });
  const slugForUrl = inserted?.slug ?? packageName;
  const slackText =
    `New component submission\n` +
    `${validated.componentName} (${packageName})\n` +
    `https://www.convex.dev/components/${slugForUrl}\n` +
    `Repo: ${validated.repositoryUrl}\n` +
    `npm: ${validated.npmUrl}`;
  await ctx.scheduler.runAfter(0, internal.slack.sendMessage, { text: slackText });

  if (prereqs.settings.autoAiReview && args.repositoryUrl) {
    const _: null = await ctx.runMutation(internal.packages._updateReviewStatus, {
      packageId,
      reviewStatus: "in_review",
      reviewedBy: "AI",
      reviewNotes: "Auto AI review queued on submission",
    });
    await ctx.scheduler.runAfter(0, internal.aiReview._runAiReview, { packageId });
  }

  if (prereqs.settings.autoSecurityScan && args.repositoryUrl) {
    await ctx.scheduler.runAfter(0, internal.securityScan._runSecurityScan, {
      packageId,
    });
  }
}

function validateSubmitInputs(args: any) {
  const repositoryUrl = args.repositoryUrl.trim();
  const npmUrl = args.npmUrl.trim();
  const componentName = args.componentName.trim();
  const shortDescription = args.shortDescription.trim();
  const longDescription = args.longDescription?.trim() || "";
  const demoUrl = args.demoUrl.trim();

  if (!componentName || !shortDescription || !demoUrl) {
    throw new ConvexError("Please fill in all required fields.");
  }

  const parsedRepo = parseGitHubRepo(repositoryUrl);
  if (!parsedRepo) {
    throw new ConvexError(
      "Invalid GitHub repository URL. Expected format: https://github.com/owner/repo",
    );
  }

  return { repositoryUrl, npmUrl, componentName, shortDescription, longDescription, demoUrl, parsedRepo };
}

function parsePackageNameFromNpmUrl(npmUrl: string): string {
  const urlMatch = npmUrl.match(/npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/);
  if (!urlMatch) {
    throw new ConvexError(
      "Invalid npm URL. Expected format: https://www.npmjs.com/package/package-name",
    );
  }
  return decodeURIComponent(urlMatch[1]);
}

function buildPackageInsertData(args: any, validated: any, packageName: string, packageData: any, submitterEmail: string) {
  const slug = generateSlugFromName(packageName);
  const parsedTags = args.tags
    ? args.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : undefined;

  const authorUsername = validated.parsedRepo?.owner;
  const authorAvatar = validated.parsedRepo
    ? `https://avatars.githubusercontent.com/${validated.parsedRepo.owner}`
    : undefined;

  let skillMd: string | undefined;
  if (args.generatedDescription && args.generatedUseCases && args.generatedHowItWorks) {
    skillMd = buildSkillMdFromContent(
      {
        name: packageName,
        componentName: validated.componentName,
        shortDescription: validated.shortDescription,
        description: packageData.description,
        repositoryUrl: validated.repositoryUrl,
        npmUrl: validated.npmUrl,
        demoUrl: validated.demoUrl,
        installCommand: packageData.installCommand,
        slug,
      },
      {
        description: args.generatedDescription,
        useCases: args.generatedUseCases,
        howItWorks: args.generatedHowItWorks,
      },
    );
  }

  return {
    ...packageData,
    repositoryUrl: validated.repositoryUrl,
    submitterName: args.submitterName,
    submitterEmail,
    submitterDiscord: args.submitterDiscord,
    demoUrl: validated.demoUrl,
    slug,
    componentName: validated.componentName,
    category: args.category,
    shortDescription: validated.shortDescription,
    longDescription: validated.longDescription || undefined,
    tags: parsedTags,
    videoUrl: args.videoUrl,
    authorUsername,
    authorAvatar,
    communitySubmitted: true,
    generatedDescription: args.generatedDescription,
    generatedUseCases: args.generatedUseCases,
    generatedHowItWorks: args.generatedHowItWorks,
    readmeIncludedMarkdown: args.readmeIncludedMarkdown,
    readmeIncludeSource: args.readmeIncludeSource,
    contentModelVersion: args.generatedDescription ? 2 : undefined,
    skillMd,
  };
}

export const _addPackage = internalMutation({
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
    allTimeDownloads: v.optional(v.number()),
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
    communitySubmitted: v.optional(v.boolean()),
    // V2 generated content fields
    generatedDescription: v.optional(v.string()),
    generatedUseCases: v.optional(v.string()),
    generatedHowItWorks: v.optional(v.string()),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
    contentModelVersion: v.optional(v.number()),
    skillMd: v.optional(v.string()),
  },
  returns: v.id("packages"),
  handler: async (ctx, args) => {
    return await addPackageHelper(ctx, args);
  },
});

async function addPackageHelper(ctx: any, args: any): Promise<Id<"packages">> {
  const maintainerNames = args.collaborators.map((c: any) => c.name).join(" ");

  const existing = await ctx.db
    .query("packages")
    .withIndex("by_name", (q: any) => q.eq("name", args.name))
    .first();

  if (existing) {
    return await updateExistingPackage(ctx, existing, args, maintainerNames);
  }

  return await insertNewPackage(ctx, args, maintainerNames);
}

async function updateExistingPackage(ctx: any, existing: any, args: any, maintainerNames: string): Promise<Id<"packages">> {
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
    allTimeDownloads: args.allTimeDownloads,
    collaborators: args.collaborators,
    maintainerNames,
    npmUrl: args.npmUrl,
    submittedAt: Date.now(),
    reviewStatus: existing.reviewStatus ?? "pending",
    visibility: existing.visibility ?? "visible",
  });
  return existing._id;
}

async function insertNewPackage(ctx: any, args: any, maintainerNames: string): Promise<Id<"packages">> {
  let finalSlug = args.slug;
  if (finalSlug) {
    finalSlug = await generateUniqueSlug(ctx, finalSlug);
  }

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
    allTimeDownloads: args.allTimeDownloads,
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
    slug: finalSlug,
    componentName: args.componentName,
    category: args.category,
    shortDescription: args.shortDescription,
    longDescription: args.longDescription,
    tags: args.tags,
    videoUrl: args.videoUrl,
    authorUsername: args.authorUsername,
    authorAvatar: args.authorAvatar,
    communitySubmitted: args.communitySubmitted,
    generatedDescription: args.generatedDescription,
    generatedUseCases: args.generatedUseCases,
    generatedHowItWorks: args.generatedHowItWorks,
    readmeIncludedMarkdown: args.readmeIncludedMarkdown,
    readmeIncludeSource: args.readmeIncludeSource,
    contentModelVersion: args.contentModelVersion,
    skillMd: args.skillMd,
  });
}

// Admin mutation: Update npm data for a package (preserves submitter info, review status, etc.)
// Compares before writing to avoid no-op patches that invalidate subscriptions.
async function updateNpmDataHelper(ctx: any, args: any) {
  const maintainerNames = args.collaborators.map((c: any) => c.name).join(" ");
  const pkg = await ctx.db.get(args.packageId);
  if (!pkg) return;

  const newFields: Record<string, any> = {
    description: args.description,
    version: args.version,
    license: args.license,
    repositoryUrl: args.repositoryUrl,
    homepageUrl: args.homepageUrl,
    unpackedSize: args.unpackedSize,
    totalFiles: args.totalFiles,
    lastPublish: args.lastPublish,
    weeklyDownloads: args.weeklyDownloads,
    allTimeDownloads: args.allTimeDownloads,
    maintainerNames,
  };

  // Only include fields that actually changed (skip collaborators deep-compare for perf)
  const patch: Record<string, any> = {};
  for (const [key, value] of Object.entries(newFields)) {
    if (pkg[key] !== value) {
      patch[key] = value;
    }
  }

  // Collaborators need a shallow JSON compare since they're arrays of objects
  if (JSON.stringify(pkg.collaborators) !== JSON.stringify(args.collaborators)) {
    patch.collaborators = args.collaborators;
  }

  if (Object.keys(patch).length === 0) return;
  await ctx.db.patch(args.packageId, patch);
}

const npmDataArgs = {
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
  allTimeDownloads: v.optional(v.number()),
  collaborators: v.array(
    v.object({
      name: v.string(),
      avatar: v.string(),
    }),
  ),
};

export const _updateNpmData = internalMutation({
  args: npmDataArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await updateNpmDataHelper(ctx, args);
    return null;
  },
});

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
    allTimeDownloads: v.optional(v.number()),
    collaborators: v.array(
      v.object({
        name: v.string(),
        avatar: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    await updateNpmDataHelper(ctx, args);
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
    const allPackages = await ctx.db.query("packages").take(1000);

    // Filter: show packages that are visible (or no visibility set = visible by default)
    // Hidden, archived, marked-for-deletion, and hideFromSubmissions packages are excluded
    const publicPackages = allPackages.filter((pkg) => {
      const isVisible = !pkg.visibility || pkg.visibility === "visible";
      return isVisible && !pkg.markedForDeletion && !pkg.hideFromSubmissions;
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
    const packages = await ctx.db.query("packages").take(1000);
    // Normalize data to ensure all required fields have default values
    return packages.map(toAdminPackage);
  },
});

export const _getAllPackages = internalQuery({
  args: {},
  returns: v.array(adminPackageValidator),
  handler: async (ctx) => {
    const packages = await ctx.db.query("packages").take(5000);
    return packages.map(toAdminPackage);
  },
});

// SECURITY: Public search - filters out sensitive submitter info and AI review details
export const searchPackages = query({
  args: { searchTerm: v.string() },
  returns: v.array(publicPackageValidator),
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) {
      return await getDefaultVisiblePackages(ctx);
    }
    const results = await searchAcrossIndexes(ctx, args.searchTerm);
    return dedupeAndFilterResults(results).map(toPublicPackage);
  },
});

async function getDefaultVisiblePackages(ctx: any) {
  const allPackages = await ctx.db.query("packages").take(1000);
  return allPackages
    .filter(isVisiblePackage)
    .sort((a: any, b: any) => b.submittedAt - a.submittedAt)
    .slice(0, 50)
    .map(toPublicPackage);
}

function isVisiblePackage(pkg: any) {
  return (
    (!pkg.visibility || pkg.visibility === "visible") &&
    !pkg.markedForDeletion &&
    !pkg.hideFromSubmissions
  );
}

async function searchAcrossIndexes(ctx: any, searchTerm: string) {
  const [nameResults, descriptionResults, maintainerResults] = await Promise.all([
    ctx.db.query("packages")
      .withSearchIndex("search_name", (q: any) => q.search("name", searchTerm))
      .take(50),
    ctx.db.query("packages")
      .withSearchIndex("search_description", (q: any) => q.search("description", searchTerm))
      .take(50),
    ctx.db.query("packages")
      .withSearchIndex("search_maintainers", (q: any) => q.search("maintainerNames", searchTerm))
      .take(50),
  ]);
  return [...nameResults, ...descriptionResults, ...maintainerResults];
}

function dedupeAndFilterResults(results: any[]) {
  const seen = new Set<string>();
  const combined: any[] = [];
  for (const pkg of results) {
    if (!seen.has(pkg._id) && isVisiblePackage(pkg)) {
      seen.add(pkg._id);
      combined.push(pkg);
    }
  }
  return combined.slice(0, 50);
}

// Public query: Paginated submissions listing for Submit.tsx
export const getSubmitPackagesPage = query({
  args: {
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("downloads"),
        v.literal("updated"),
      ),
    ),
    page: v.optional(v.number()),
    pageSize: v.optional(submitPageSizeValidator),
  },
  returns: paginatedPublicPackagesValidator,
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "newest";
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 40;

    const visiblePackages = await getVisibleSubmitPackages(ctx);
    const sortedPackages = sortPublicPackages(visiblePackages, sortBy);
    return paginatePublicPackages(sortedPackages, page, pageSize);
  },
});

// Public query: Paginated submission search for Submit.tsx
export const searchSubmitPackagesPage = query({
  args: {
    searchTerm: v.string(),
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("downloads"),
        v.literal("updated"),
      ),
    ),
    page: v.optional(v.number()),
    pageSize: v.optional(submitPageSizeValidator),
  },
  returns: paginatedPublicPackagesValidator,
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "newest";
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 40;
    const searchTerm = args.searchTerm.trim().toLowerCase();

    const visiblePackages = await getVisibleSubmitPackages(ctx);
    const searchedPackages = searchTerm
      ? visiblePackages.filter((pkg) => {
          const maintainerNames = pkg.maintainerNames?.toLowerCase() || "";
          return (
            pkg.name.toLowerCase().includes(searchTerm) ||
            pkg.description.toLowerCase().includes(searchTerm) ||
            maintainerNames.includes(searchTerm)
          );
        })
      : visiblePackages;

    const sortedPackages = sortPublicPackages(searchedPackages, sortBy);
    return paginatePublicPackages(sortedPackages, page, pageSize);
  },
});

// Public query: Read default page size for submissions listing.
export const getSubmitPageSizeSetting = query({
  args: {},
  returns: v.object({
    defaultPageSize: submitPageSizeValidator,
  }),
  handler: async (ctx) => {
    const pageSizeSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", SUBMIT_PAGE_SIZE_SETTING_KEY))
      .first();

    const defaultPageSize: 20 | 40 | 60 = getSubmitPageSizeValue(
      pageSizeSetting?.value,
    );
    return { defaultPageSize };
  },
});

// Admin query: Read default page size setting for submissions listing.
export const getSubmitPageSizeAdminSetting = query({
  args: {},
  returns: v.object({
    defaultPageSize: submitPageSizeValidator,
  }),
  handler: async (ctx) => {
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return { defaultPageSize: getSubmitPageSizeValue(undefined) };
    }

    const pageSizeSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", SUBMIT_PAGE_SIZE_SETTING_KEY))
      .first();

    const defaultPageSize: 20 | 40 | 60 = getSubmitPageSizeValue(
      pageSizeSetting?.value,
    );
    return { defaultPageSize };
  },
});

// Admin mutation: Update default page size for submissions listing.
export const updateSubmitPageSizeSetting = mutation({
  args: {
    value: submitPageSizeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const existing = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", SUBMIT_PAGE_SIZE_SETTING_KEY))
      .first();

    if (existing) {
      await ctx.db.patch("adminSettingsNumeric", existing._id, {
        value: args.value,
      });
    } else {
      await ctx.db.insert("adminSettingsNumeric", {
        key: SUBMIT_PAGE_SIZE_SETTING_KEY,
        value: args.value,
      });
    }

    return null;
  },
});

// SECURITY: Admin-only search - requires @convex.dev email authentication
// Searches packages by name, description, maintainer names, component name, and repository URL
export const adminSearchPackages = query({
  args: { searchTerm: v.string() },
  returns: v.array(adminPackageValidator),
  handler: async (ctx, args) => {
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return [];
    }

    if (!args.searchTerm.trim()) {
      const packages = await ctx.db
        .query("packages")
        .withIndex("by_submitted_at")
        .order("desc")
        .take(100);
      return packages.map(toAdminPackage);
    }

    const results = await adminSearchAcrossIndexes(ctx, args.searchTerm);
    return dedupeResults(results).slice(0, 100).map(toAdminPackage);
  },
});

async function adminSearchAcrossIndexes(ctx: any, searchTerm: string) {
  const [nameResults, descriptionResults, maintainerResults, componentNameResults, repoResults] =
    await Promise.all([
      ctx.db.query("packages")
        .withSearchIndex("search_name", (q: any) => q.search("name", searchTerm))
        .take(100),
      ctx.db.query("packages")
        .withSearchIndex("search_description", (q: any) => q.search("description", searchTerm))
        .take(100),
      ctx.db.query("packages")
        .withSearchIndex("search_maintainers", (q: any) => q.search("maintainerNames", searchTerm))
        .take(100),
      ctx.db.query("packages")
        .withSearchIndex("search_componentName", (q: any) => q.search("componentName", searchTerm))
        .take(100),
      ctx.db.query("packages")
        .withSearchIndex("search_repositoryUrl", (q: any) => q.search("repositoryUrl", searchTerm))
        .take(100),
    ]);
  return [...nameResults, ...descriptionResults, ...maintainerResults, ...componentNameResults, ...repoResults];
}

function dedupeResults(results: any[]) {
  const seen = new Set<string>();
  const combined: any[] = [];
  for (const pkg of results) {
    if (!seen.has(pkg._id)) {
      seen.add(pkg._id);
      combined.push(pkg);
    }
  }
  return combined;
}

// SECURITY: Internal query for backend use only (e.g., AI review action)
// Returns full package data including sensitive fields
export const _getPackage = internalQuery({
  args: { packageId: v.id("packages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.packageId);
  },
});

export const _getPackagesByIds = internalQuery({
  args: { packageIds: v.array(v.id("packages")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.packageIds.map((id) => ctx.db.get(id)),
    );
    const map: Record<string, any> = {};
    for (const pkg of results) {
      if (pkg) {
        map[pkg._id] = pkg;
      }
    }
    return map;
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
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Combined query: check if package exists + get admin settings in one round trip
export const _checkSubmitPrereqs = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    const settings = await getAdminSettingsHelper(ctx);
    return { existing: !!existing, settings };
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

// Internal mutation: Update review status
type ReviewStatusArgs = {
  packageId: Id<"packages">;
  reviewStatus: "pending" | "in_review" | "approved" | "changes_requested" | "rejected";
  reviewNotes?: string;
  reviewedBy: string;
};

async function updateReviewStatusHelper(ctx: any, args: ReviewStatusArgs) {
  const reviewedAt = Date.now();
  await ctx.db.patch("packages", args.packageId, {
    reviewStatus: args.reviewStatus,
    reviewedBy: args.reviewedBy,
    reviewedAt,
    ...(args.reviewStatus === "approved" && { approvedAt: reviewedAt }),
    ...(args.reviewNotes !== undefined && { reviewNotes: args.reviewNotes }),
  });

  let shouldAutoGenerateSeo =
    args.reviewStatus === "approved" ||
    args.reviewStatus === "pending" ||
    args.reviewStatus === "in_review";

  if (args.reviewStatus === "pending" || args.reviewStatus === "in_review") {
    const autoGenerateOnReviewState = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q: any) =>
        q.eq("key", "autoGenerateSeoOnPendingOrInReview"),
      )
      .first();
    shouldAutoGenerateSeo = autoGenerateOnReviewState?.value || false;
  }

  if (shouldAutoGenerateSeo) {
    const pkg = await ctx.db.get(args.packageId);
    if (pkg && !pkg.seoGeneratedAt) {
      await ctx.scheduler.runAfter(
        0,
        internal.seoContent.generateSeoContent,
        { packageId: args.packageId },
      );
    }
  }

  if (args.reviewStatus === "approved") {
    const pkg = await ctx.db.get(args.packageId);
    if (pkg && pkg.visibility === "visible") {
      const autoSendRewardSetting = await ctx.db
        .query("adminSettings")
        .withIndex("by_key", (q: any) => q.eq("key", "autoSendRewardOnApprove"))
        .first();

      if (autoSendRewardSetting?.value) {
        const rewardStatus = pkg.rewardStatus;
        if (rewardStatus !== "sent" && rewardStatus !== "delivered") {
          const defaultAmountSetting = await ctx.db
            .query("adminSettingsNumeric")
            .withIndex("by_key", (q: any) => q.eq("key", "defaultRewardAmount"))
            .first();
          const amount = defaultAmountSetting?.value ?? 25;

          await ctx.scheduler.runAfter(
            0,
            internal.payments.sendReward,
            {
              packageId: args.packageId,
              amount,
              sentBy: "auto",
            },
          );
        }
      }
    }
  }

  // Recount denormalized category stats after status changes
  await recountCategoryStats(ctx);
}

export const _updateReviewStatus = internalMutation({
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
    reviewedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await updateReviewStatusHelper(ctx, args);
    return null;
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
    reviewedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    await updateReviewStatusHelper(ctx, args);
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
    await requireAdminIdentity(ctx);
    await ctx.db.patch("packages", args.packageId, {
      visibility: args.visibility,
    });
    await recountCategoryStats(ctx);
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
    await requireAdminIdentity(ctx);
    await ctx.db.delete("packages", args.packageId);
    await recountCategoryStats(ctx);
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
    await requireAdminIdentity(ctx);

    // Get the package to check its current state
    const pkg = await ctx.db.get("packages", args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }

    // Only approved packages can be featured
    if (pkg.reviewStatus !== "approved") {
      throw new ConvexError("Only approved packages can be featured");
    }

    // Toggle featured status
    await ctx.db.patch("packages", args.packageId, {
      featured: !pkg.featured,
    });
    return null;
  },
});

// Admin mutation: Set featured sort order for a package
export const setFeaturedSortOrder = mutation({
  args: {
    packageId: v.id("packages"),
    sortOrder: v.union(v.number(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    // Patch directly - will throw if package doesn't exist
    await ctx.db.patch(args.packageId, {
      featuredSortOrder: args.sortOrder ?? undefined,
    });
    return null;
  },
});

// Admin mutation: Toggle hideFromSubmissions for a package
// Hides from Submit.tsx but not from Directory.tsx
export const toggleHideFromSubmissions = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }
    await ctx.db.patch(args.packageId, {
      hideFromSubmissions: !pkg.hideFromSubmissions,
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
      featuredSortOrder: v.optional(v.number()),
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
      return await ctx.db.query("packages").take(1000);
    }

    // Get all packages and filter by status (including undefined as pending)
    const allPackages = await ctx.db.query("packages").take(1000);

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
      adminHasRead: v.optional(v.boolean()),
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
      .take(1000);

    // Calculate reply counts for each note
    const notesWithReplies = await Promise.all(
      notes.map(async (note) => {
        const replies = await ctx.db
          .query("packageNotes")
          .withIndex("by_parent", (q) => q.eq("parentNoteId", note._id))
          .take(1000);
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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);
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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

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
    parentNoteId: v.optional(v.id("packageNotes")),
  },
  returns: v.id("packageNotes"),
  handler: async (ctx, args) => {
    const admin = await requireAdminIdentity(ctx);
    const adminEmail = admin.email;

    // Check if this is an admin reply to a legacy user request note.
    let isAdminReply = false;
    if (args.parentNoteId) {
      const parentNote = await ctx.db.get(args.parentNoteId);
      if (
        parentNote &&
        parentNote.content.startsWith("[User Request]")
      ) {
        isAdminReply = true;
      }
    }

    // Insert the internal admin note with timestamp-based ordering.
    const noteId = await ctx.db.insert("packageNotes", {
      packageId: args.packageId,
      content: args.content,
      authorEmail: adminEmail,
      authorName: admin.identity.name ?? undefined,
      parentNoteId: args.parentNoteId,
      createdAt: Date.now(),
      isAdminReply: isAdminReply || undefined,
      userHasRead: isAdminReply ? false : undefined,
    });

    // Mirror admin notes to Slack.
    const pkg = await ctx.db.get("packages", args.packageId);
    if (pkg) {
      const headline = isAdminReply
        ? "Admin reply (legacy request) on"
        : "Internal admin note on";
      const text = formatSlackNotification(pkg, headline, `Admin (${adminEmail})`, args.content);
      await ctx.scheduler.runAfter(0, internal.slack.sendMessage, { text });
    }

    return noteId;
  },
});

// Mutation: Delete a note
export const deletePackageNote = mutation({
  args: {
    noteId: v.id("packageNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminIdentity(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return null;
    }

    if (note.authorEmail !== admin.email) {
      throw new ConvexError("You can only delete your own notes");
    }

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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

    // Mark unread user messages as read for admin
    const updates = comments
      .filter(
        (comment) =>
          !comment.authorEmail.endsWith("@convex.dev") &&
          (comment.status === undefined || comment.status === "active") &&
          comment.adminHasRead !== true,
      )
      .map((comment) => ctx.db.patch(comment._id, { adminHasRead: true }));

    await Promise.all(updates);
    return null;
  },
});

// Mutation: Admin marks a single comment as read.
// Idempotent: re-running on an already-read or admin-authored comment is a no-op.
export const markPackageCommentReadForAdmin = mutation({
  args: { commentId: v.id("packageComments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) return null;
    if (comment.adminHasRead === true) return null;
    await ctx.db.patch(args.commentId, { adminHasRead: true });
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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

    return comments.filter(
      (comment) =>
        !comment.authorEmail.endsWith("@convex.dev") &&
        (comment.status === undefined || comment.status === "active") &&
        comment.adminHasRead !== true,
    ).length;
  },
});

// Migration: Recount and backfill denormalized category counts
export const backfillCategoryCounts = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await recountCategoryStats(ctx);
    return null;
  },
});

// Migration: Backfill maintainerNames for existing packages
export const backfillMaintainerNames = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Get all packages without maintainerNames
    const packages = await ctx.db.query("packages").take(10000);
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
    const packages = await ctx.db.query("packages").take(10000);
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
async function updateAiReviewStatusHelper(ctx: any, args: { packageId: Id<"packages">; status: string }) {
  await ctx.db.patch("packages", args.packageId, {
    aiReviewStatus: args.status,
  });
}

export const _updateAiReviewStatus = internalMutation({
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
    await updateAiReviewStatusHelper(ctx, args);
    return null;
  },
});

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
    await requireAdminIdentity(ctx);
    await updateAiReviewStatusHelper(ctx, args);
    return null;
  },
});

async function updateAiReviewResultHelper(ctx: any, args: any) {
  await ctx.db.patch("packages", args.packageId, {
    aiReviewStatus: args.status,
    aiReviewSummary: args.summary,
    aiReviewCriteria: args.criteria,
    aiReviewedAt: Date.now(),
    aiReviewError: args.error,
  });
}

export const _updateAiReviewResult = internalMutation({
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
    await updateAiReviewResultHelper(ctx, args);
    return null;
  },
});

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
    await requireAdminIdentity(ctx);
    await updateAiReviewResultHelper(ctx, args);
    return null;
  },
});

export const getAiReviewRunsForPackage = query({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.array(aiReviewRunValidator),
  handler: async (ctx, args) => {
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return [];
    }

    return await ctx.db
      .query("aiReviewRuns")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .order("desc")
      .take(1000);
  },
});

export const _createAiReviewRun = internalMutation({
  args: {
    packageId: v.id("packages"),
    createdAt: v.number(),
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error"),
    ),
    summary: v.string(),
    criteria: v.array(aiReviewCriterionValidator),
    error: v.optional(v.string()),
    provider: v.optional(
      v.union(
        v.literal("anthropic"),
        v.literal("openai"),
        v.literal("gemini"),
      ),
    ),
    model: v.optional(v.string()),
    source: v.optional(v.string()),
    rawOutput: v.optional(v.string()),
  },
  returns: v.id("aiReviewRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiReviewRuns", {
      packageId: args.packageId,
      createdAt: args.createdAt,
      status: args.status,
      summary: args.summary,
      criteria: args.criteria,
      error: args.error,
      provider: args.provider,
      model: args.model,
      source: args.source,
      rawOutput: args.rawOutput,
    });
  },
});

// Batched mutation: update AI review result AND create review run in one transaction
export const _saveAiReviewResultAndRun = internalMutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error"),
    ),
    summary: v.string(),
    criteria: v.array(aiReviewCriterionValidator),
    error: v.optional(v.string()),
    createdAt: v.number(),
    provider: v.optional(
      v.union(
        v.literal("anthropic"),
        v.literal("openai"),
        v.literal("gemini"),
      ),
    ),
    model: v.optional(v.string()),
    source: v.optional(v.string()),
    rawOutput: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      aiReviewStatus: args.status,
      aiReviewSummary: args.summary,
      aiReviewCriteria: args.criteria,
      aiReviewedAt: Date.now(),
      aiReviewError: args.error,
    });
    await ctx.db.insert("aiReviewRuns", {
      packageId: args.packageId,
      createdAt: args.createdAt,
      status: args.status,
      summary: args.summary,
      criteria: args.criteria,
      error: args.error,
      provider: args.provider,
      model: args.model,
      source: args.source,
      rawOutput: args.rawOutput,
    });
    return null;
  },
});

export const deleteAiReviewRun = mutation({
  args: {
    runId: v.id("aiReviewRuns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const run = await ctx.db.get(args.runId);
    if (!run) {
      return null;
    }

    const latestRun = await ctx.db
      .query("aiReviewRuns")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", run.packageId))
      .order("desc")
      .first();

    if (latestRun?._id === args.runId) {
      throw new ConvexError("Cannot delete the latest AI review snapshot");
    }

    await ctx.db.delete(args.runId);
    return null;
  },
});

// ============ SECURITY SCAN MUTATIONS & QUERIES ============

const securityFindingValidator = v.object({
  provider: v.union(v.literal("socket"), v.literal("snyk"), v.literal("devin")),
  severity: v.union(
    v.literal("critical"),
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
    v.literal("info"),
  ),
  title: v.string(),
  description: v.string(),
  recommendation: v.string(),
});

const providerResultsValidator = v.object({
  socket: v.optional(
    v.object({
      status: v.string(),
      score: v.optional(v.number()),
      issueCount: v.optional(v.number()),
      rawSummary: v.optional(v.string()),
    }),
  ),
  snyk: v.optional(
    v.object({
      status: v.string(),
      vulnerabilityCount: v.optional(v.number()),
      criticalCount: v.optional(v.number()),
      highCount: v.optional(v.number()),
      rawSummary: v.optional(v.string()),
    }),
  ),
  devin: v.optional(
    v.object({
      status: v.string(),
      sessionId: v.optional(v.string()),
      sessionUrl: v.optional(v.string()),
      findingCount: v.optional(v.number()),
      rawSummary: v.optional(v.string()),
    }),
  ),
});

const securityScanRunValidator = v.object({
  _id: v.id("securityScanRuns"),
  _creationTime: v.number(),
  packageId: v.id("packages"),
  createdAt: v.number(),
  status: v.union(
    v.literal("safe"),
    v.literal("unsafe"),
    v.literal("warning"),
    v.literal("error"),
  ),
  summary: v.string(),
  findings: v.array(securityFindingValidator),
  recommendations: v.array(v.string()),
  providerResults: providerResultsValidator,
  error: v.optional(v.string()),
  triggeredBy: v.optional(v.string()),
});

// Set scanning status on package
export const _updateSecurityScanStatus = internalMutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("not_scanned"),
      v.literal("scanning"),
      v.literal("safe"),
      v.literal("unsafe"),
      v.literal("warning"),
      v.literal("error"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      securityScanStatus: args.status,
    });
    return null;
  },
});

// Save security scan result and create run history in one transaction
export const _saveSecurityScanResultAndRun = internalMutation({
  args: {
    packageId: v.id("packages"),
    status: v.union(
      v.literal("safe"),
      v.literal("unsafe"),
      v.literal("warning"),
      v.literal("error"),
    ),
    summary: v.string(),
    findings: v.array(securityFindingValidator),
    recommendations: v.array(v.string()),
    providerResults: providerResultsValidator,
    error: v.optional(v.string()),
    createdAt: v.number(),
    triggeredBy: v.optional(v.string()),
    socketScanStatus: v.optional(v.string()),
    snykScanStatus: v.optional(v.string()),
    devinScanStatus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update denormalized package fields
    await ctx.db.patch(args.packageId, {
      securityScanStatus: args.status,
      securityScanSummary: args.summary,
      securityScanUpdatedAt: args.createdAt,
      securityScanError: args.error,
      socketScanStatus: args.socketScanStatus,
      snykScanStatus: args.snykScanStatus,
      devinScanStatus: args.devinScanStatus,
    });
    // Insert history row
    await ctx.db.insert("securityScanRuns", {
      packageId: args.packageId,
      createdAt: args.createdAt,
      status: args.status,
      summary: args.summary,
      findings: args.findings,
      recommendations: args.recommendations,
      providerResults: args.providerResults,
      error: args.error,
      triggeredBy: args.triggeredBy,
    });

    // Notify via Slack when a security scan finishes.
    const pkg = await ctx.db.get(args.packageId);
    if (pkg) {
      const slugForUrl = pkg.slug ?? pkg.name;
      const displayName = pkg.componentName ?? pkg.name;
      const sum =
        args.summary.length > 280 ? `${args.summary.slice(0, 280)}...` : args.summary;
      const slackText =
        `Security scan completed\n` +
        `${displayName} (${pkg.name})\n` +
        `Status: ${args.status}\n` +
        `Summary: ${sum}\n` +
        `https://www.convex.dev/components/${slugForUrl}` +
        (pkg.repositoryUrl ? `\nRepo: ${pkg.repositoryUrl}` : "");
      await ctx.scheduler.runAfter(0, internal.slack.sendMessage, {
        text: slackText,
      });
    }
    return null;
  },
});

// Admin query: get security scan runs for a package
export const getSecurityScanRunsForPackage = query({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.array(securityScanRunValidator),
  handler: async (ctx, args) => {
    const adminIdentity = await getAdminIdentity(ctx);
    if (!adminIdentity) {
      return [];
    }
    return await ctx.db
      .query("securityScanRuns")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("desc")
      .take(100);
  },
});

// Public query: latest security scan for sidebar display (safe fields only)
export const getLatestSecurityScan = query({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("not_scanned"),
        v.literal("scanning"),
        v.literal("safe"),
        v.literal("unsafe"),
        v.literal("warning"),
        v.literal("error"),
      ),
      summary: v.optional(v.string()),
      findingCount: v.number(),
      providerCount: v.number(),
      lastScannedAt: v.optional(v.number()),
      // Findings for public modal display
      findings: v.array(
        v.object({
          severity: v.string(),
          title: v.string(),
          description: v.string(),
          recommendation: v.string(),
          provider: v.string(),
        }),
      ),
      recommendations: v.array(v.string()),
      providerStatuses: v.object({
        socket: v.optional(v.string()),
        snyk: v.optional(v.string()),
        devin: v.optional(v.string()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return null;

    if (!pkg.securityScanStatus || pkg.securityScanStatus === "not_scanned") {
      return {
        status: "not_scanned" as const,
        findingCount: 0,
        providerCount: 0,
        findings: [],
        recommendations: [],
        providerStatuses: {},
      };
    }

    const latestRun = await ctx.db
      .query("securityScanRuns")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("desc")
      .first();

    return formatLatestSecurityScan(pkg, latestRun);
  },
});

// Build the public-safe security scan payload from a package row and its
// most recent `securityScanRuns` entry.
function formatLatestSecurityScan(pkg: any, latestRun: any) {
  const providerCount = [
    pkg.socketScanStatus,
    pkg.snykScanStatus,
    pkg.devinScanStatus,
  ].filter(Boolean).length;

  return {
    status: pkg.securityScanStatus,
    summary: pkg.securityScanSummary,
    findingCount: latestRun?.findings?.length ?? 0,
    providerCount,
    lastScannedAt: pkg.securityScanUpdatedAt,
    findings: (latestRun?.findings ?? []).map((f: any) => ({
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      provider: f.provider,
    })),
    recommendations: latestRun?.recommendations ?? [],
    providerStatuses: {
      socket: pkg.socketScanStatus,
      snyk: pkg.snykScanStatus,
      devin: pkg.devinScanStatus,
    },
  };
}

// Admin query: security scan backlog stats for the settings panel
export const getSecurityScanBacklogStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    unscanned: v.number(),
    scanning: v.number(),
    scanned: v.number(),
    errorCount: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);
    const packages = await ctx.db.query("packages").take(10000);
    const withRepo = packages.filter((pkg) => !!pkg.repositoryUrl);
    let unscanned = 0;
    let scanning = 0;
    let scanned = 0;
    let errorCount = 0;
    for (const pkg of withRepo) {
      const status = pkg.securityScanStatus;
      if (!status || status === "not_scanned") {
        unscanned++;
      } else if (status === "scanning") {
        scanning++;
      } else if (status === "error") {
        errorCount++;
      } else {
        scanned++;
      }
    }
    return { total: withRepo.length, unscanned, scanning, scanned, errorCount };
  },
});

// Admin mutation: queue a batch of unscanned packages for security scanning
export const runSecurityScanBacklog = mutation({
  args: { batchSize: v.optional(v.number()) },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const limit = args.batchSize ?? 20;
    const packages = await ctx.db.query("packages").take(10000);
    const eligible = packages.filter(
      (pkg) =>
        !!pkg.repositoryUrl &&
        (!pkg.securityScanStatus ||
          pkg.securityScanStatus === "not_scanned" ||
          pkg.securityScanStatus === "error"),
    );
    const batch = eligible.slice(0, limit);
    for (const pkg of batch) {
      await ctx.db.patch(pkg._id, { securityScanStatus: "scanning" as const });
      await ctx.scheduler.runAfter(
        0,
        internal.securityScan._runSecurityScan,
        { packageId: pkg._id },
      );
    }
    return { queued: batch.length };
  },
});

// Internal action target for scheduled security scans
export const scheduledSecurityScanCheck = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await getAdminSettingsHelper(ctx);
    const scheduleDays = settings.securityScanScheduleDays;
    if (scheduleDays <= 0) return null;

    const anyProviderEnabled =
      settings.enableSocketScan ||
      settings.enableSnykScan;
    if (!anyProviderEnabled) return null;

    const cutoff = Date.now() - scheduleDays * 24 * 60 * 60 * 1000;

    // Find packages that need scanning (have repo URL, stale or never scanned)
    const allPackages = await ctx.db.query("packages").take(10000);
    const eligible = allPackages.filter(
      (pkg) =>
        !!pkg.repositoryUrl &&
        pkg.securityScanStatus !== "scanning" &&
        (!pkg.securityScanUpdatedAt || pkg.securityScanUpdatedAt < cutoff),
    );

    // Queue up to 20 scans per run to avoid overwhelming providers
    const batch = eligible.slice(0, 20);
    for (const pkg of batch) {
      await ctx.scheduler.runAfter(
        0,
        internal.securityScan._runSecurityScan,
        { packageId: pkg._id },
      );
    }
    return null;
  },
});

// Get admin settings for AI review, thumbnails, and related automation
async function getAdminSettingsHelper(ctx: QueryCtx) {
  const autoAiReview = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", "autoAiReview"))
    .first();
  const autoApproveOnPass = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", "autoApproveOnPass"))
    .first();
  const autoRejectOnFail = await ctx.db
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
  const showRelated = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) =>
      q.eq("key", "showRelatedOnDetailPage"),
    )
    .first();
  const autoSendReward = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) =>
      q.eq("key", "autoSendRewardOnApprove"),
    )
    .first();
  const defaultRewardAmount = await ctx.db
    .query("adminSettingsNumeric")
    .withIndex("by_key", (q) =>
      q.eq("key", "defaultRewardAmount"),
    )
    .first();
  const apiAccessEnabled = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", "apiAccessEnabled"))
    .first();
  // Security scan provider toggles
  const enableSocketScan = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", "enableSocketScan"))
    .first();
  const enableSnykScan = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", "enableSnykScan"))
    .first();
  const autoSecurityScan = await ctx.db
    .query("adminSettings")
    .withIndex("by_key", (q) => q.eq("key", "autoSecurityScan"))
    .first();
  const securityScanScheduleDays = await ctx.db
    .query("adminSettingsNumeric")
    .withIndex("by_key", (q) => q.eq("key", "securityScanScheduleDays"))
    .first();

  return {
    autoAiReview: autoAiReview?.value || false,
    autoApproveOnPass: autoApproveOnPass?.value || false,
    autoRejectOnFail: autoRejectOnFail?.value || false,
    autoGenerateSeoOnPendingOrInReview: autoGenerateSeoOnReview?.value || false,
    autoGenerateThumbnailOnSubmit: autoGenerateThumb?.value || false,
    rotateThumbnailTemplatesOnSubmit: rotateTemplates?.value || false,
    showRelatedOnDetailPage: showRelated?.value ?? true,
    autoSendRewardOnApprove: autoSendReward?.value || false,
    defaultRewardAmount: defaultRewardAmount?.value ?? 25,
    apiAccessEnabled: apiAccessEnabled?.value || false,
    enableSocketScan: enableSocketScan?.value || false,
    enableSnykScan: enableSnykScan?.value || false,
    enableDevinScan: false,
    autoSecurityScan: autoSecurityScan?.value || false,
    securityScanScheduleDays: securityScanScheduleDays?.value ?? 0,
  };
}

const adminSettingsReturnValidator = v.object({
  autoAiReview: v.boolean(),
  autoApproveOnPass: v.boolean(),
  autoRejectOnFail: v.boolean(),
  autoGenerateSeoOnPendingOrInReview: v.boolean(),
  autoGenerateThumbnailOnSubmit: v.boolean(),
  rotateThumbnailTemplatesOnSubmit: v.boolean(),
  showRelatedOnDetailPage: v.boolean(),
  autoSendRewardOnApprove: v.boolean(),
  defaultRewardAmount: v.number(),
  apiAccessEnabled: v.boolean(),
  enableSocketScan: v.boolean(),
  enableSnykScan: v.boolean(),
  enableDevinScan: v.boolean(),
  autoSecurityScan: v.boolean(),
  securityScanScheduleDays: v.number(),
});

export const getAdminSettings = query({
  args: {},
  returns: adminSettingsReturnValidator,
  handler: async (ctx) => {
    return await getAdminSettingsHelper(ctx);
  },
});

export const _getAdminSettings = internalQuery({
  args: {},
  returns: adminSettingsReturnValidator,
  handler: async (ctx) => {
    return await getAdminSettingsHelper(ctx);
  },
});

// Update admin setting (boolean)
export const updateAdminSetting = mutation({
  args: {
    key: v.union(
      v.literal("autoAiReview"),
      v.literal("autoApproveOnPass"),
      v.literal("autoRejectOnFail"),
      v.literal("autoGenerateSeoOnPendingOrInReview"),
      v.literal("autoGenerateThumbnailOnSubmit"),
      v.literal("rotateThumbnailTemplatesOnSubmit"),
      v.literal("showRelatedOnDetailPage"),
      v.literal("autoSendRewardOnApprove"),
      v.literal("apiAccessEnabled"),
      v.literal("enableSocketScan"),
      v.literal("enableSnykScan"),
      v.literal("enableDevinScan"),
      v.literal("autoSecurityScan"),
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

    if (args.key === "autoAiReview" && args.value) {
      const allPackages = await ctx.db.query("packages").take(10000);
      const packagesToQueue = allPackages.filter(
        (pkg) =>
          !!pkg.repositoryUrl &&
          (!pkg.reviewStatus || pkg.reviewStatus === "pending") &&
          pkg.aiReviewStatus !== "reviewing",
      );

      for (const pkg of packagesToQueue) {
        await updateReviewStatusHelper(ctx, {
          packageId: pkg._id,
          reviewStatus: "in_review",
          reviewedBy: "AI",
          reviewNotes: "Auto AI review queued from settings",
        });
        await ctx.scheduler.runAfter(0, internal.aiReview._runAiReview, {
          packageId: pkg._id,
        });
      }
    }

    return null;
  },
});

// Update admin setting (numeric)
export const updateAdminSettingNumeric = mutation({
  args: {
    key: v.union(
      v.literal("defaultRewardAmount"),
      v.literal("securityScanScheduleDays"),
    ),
    value: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find existing setting
    const existing = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      // Update existing with direct patch
      await ctx.db.patch(existing._id, {
        value: args.value,
      });
    } else {
      // Create new setting
      await ctx.db.insert("adminSettingsNumeric", {
        key: args.key,
        value: args.value,
      });
    }

    return null;
  },
});

// ============ PRIVATE USER/ADMIN MESSAGES ============

// Query: Get private messages for a package
export const getPackageComments = query({
  args: {
    packageId: v.id("packages"),
    includeInactive: v.optional(v.boolean()),
  },
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
      userHasRead: v.optional(v.boolean()),
      status: v.optional(
        v.union(v.literal("active"), v.literal("hidden"), v.literal("archived")),
      ),
      statusUpdatedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return [];
    }

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      return [];
    }

    const adminIdentity = await getAdminIdentity(ctx);
    const isAdmin = adminIdentity?.email.endsWith("@convex.dev") ?? false;
    if (!isAdmin && !userOwnsPackage(pkg, userEmail)) {
      return [];
    }

    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("asc")
      .take(1000);

    if (args.includeInactive) {
      return comments;
    }

    return comments.filter((comment) => comment.status !== "hidden" && comment.status !== "archived");
  },
});

// Query: Get comment count for a package (for badge display)
export const getPackageCommentCount = query({
  args: { packageId: v.id("packages") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return 0;
    }

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      return 0;
    }

    const adminIdentity = await getAdminIdentity(ctx);
    const isAdmin = adminIdentity?.email.endsWith("@convex.dev") ?? false;
    if (!isAdmin && !userOwnsPackage(pkg, userEmail)) {
      return 0;
    }

    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);
    return comments.filter(
      (comment) => comment.status === undefined || comment.status === "active",
    ).length;
  },
});

// Mutation: Add a private message to a package (admin or submission owner)
export const addPackageComment = mutation({
  args: {
    packageId: v.id("packages"),
    content: v.string(),
  },
  returns: v.id("packageComments"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userEmail = identity?.email ?? null;
    if (!userEmail) {
      throw new ConvexError("Authentication required");
    }

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }

    const adminIdentity = await getAdminIdentity(ctx);
    const isAdmin = adminIdentity?.email.endsWith("@convex.dev") ?? false;
    if (!isAdmin && !userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only message for your own submissions");
    }

    // Insert a private thread message with read state.
    const commentId = await ctx.db.insert("packageComments", {
      packageId: args.packageId,
      content: args.content,
      authorEmail: userEmail,
      authorName: identity?.name ?? undefined,
      createdAt: Date.now(),
      adminHasRead: isAdmin,
      userHasRead: !isAdmin,
      status: "active",
    });

    // Notify via Slack when a private message is added.
    const fromLabel = isAdmin ? `Admin (${userEmail})` : `Submitter (${userEmail})`;
    const text = formatSlackNotification(pkg, "New private message on", fromLabel, args.content);
    await ctx.scheduler.runAfter(0, internal.slack.sendMessage, { text });

    return commentId;
  },
});

// Mutation: Delete a public comment
export const deletePackageComment = mutation({
  args: {
    commentId: v.id("packageComments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new ConvexError("Authentication required");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      return null;
    }

    const pkg = await ctx.db.get(comment.packageId);
    if (!pkg) {
      return null;
    }

    const adminIdentity = await getAdminIdentity(ctx);
    const isAdmin = adminIdentity?.email.endsWith("@convex.dev") ?? false;
    if (!isAdmin && !userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only manage messages on your own submissions");
    }

    if (comment.authorEmail !== userEmail) {
      throw new ConvexError("You can only delete your own messages");
    }

    await ctx.db.delete("packageComments", args.commentId);
    return null;
  },
});

// Mutation: Update private message status (hide, archive, or restore)
export const updatePackageCommentStatus = mutation({
  args: {
    commentId: v.id("packageComments"),
    status: v.union(v.literal("active"), v.literal("hidden"), v.literal("archived")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new ConvexError("Authentication required");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      return null;
    }

    const pkg = await ctx.db.get(comment.packageId);
    if (!pkg) {
      return null;
    }

    const adminIdentity = await getAdminIdentity(ctx);
    const isAdmin = adminIdentity?.email.endsWith("@convex.dev") ?? false;
    if (!isAdmin && !userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only manage messages on your own submissions");
    }

    if (comment.authorEmail !== userEmail) {
      throw new ConvexError("You can only update your own messages");
    }

    await ctx.db.patch(comment._id, {
      status: args.status,
      statusUpdatedAt: Date.now(),
    });
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
  args: { now: v.number() },
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
  handler: async (ctx, args) => {
    // Get refresh settings for interval
    const intervalSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "refreshIntervalDays"))
      .first();
    const intervalDays = intervalSetting?.value || 3;
    const staleThreshold = args.now - intervalDays * 24 * 60 * 60 * 1000;

    // Get all approved/visible packages
    const allPackages = await ctx.db
      .query("packages")
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
      .take(1000);

    // Exclude archived, then count packages needing refresh
    const nonArchived = allPackages.filter((pkg) => pkg.visibility !== "archived");
    const needingRefresh = nonArchived.filter(
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
      totalPackages: nonArchived.length,
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
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
      .take(5000);

    // Filter non-archived and sort by staleness (never refreshed first, then oldest)
    const stalePackages = packages
      .filter((pkg) => pkg.visibility !== "archived")
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
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
      .take(args.limit);

    return packages
      .filter((pkg) => pkg.visibility !== "archived")
      .map((pkg) => ({
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
    // Get all packages then exclude archived in JS (no negation index available)
    const packages = await ctx.db.query("packages").take(args.limit);

    return packages
      .filter((pkg) => pkg.visibility !== "archived")
      .map((pkg) => ({
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
      .take(1000);

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

// Combined mutation to update npm data + refresh timestamp in one transaction
export const _updateNpmDataAndTimestamp = internalMutation({
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
    allTimeDownloads: v.optional(v.number()),
    collaborators: v.array(
      v.object({
        name: v.string(),
        avatar: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const maintainerNames = args.collaborators.map((c) => c.name).join(" ");
    const patch: Record<string, any> = {
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
      lastRefreshedAt: Date.now(),
      refreshError: undefined,
    };
    if (args.allTimeDownloads !== undefined) {
      patch.allTimeDownloads = args.allTimeDownloads;
    }
    await ctx.db.patch(args.packageId, patch);
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
    const existingPkgsMap: Record<string, any> = await ctx.runQuery(
      internal.packages._getPackagesByIds,
      { packageIds: args.packages.map((p) => p._id) },
    );

    const results = await processRefreshBatch(ctx, args.packages, existingPkgsMap);
    await finalizeRefreshBatch(ctx, args.logId, results, args.isLastBatch);
    return null;
  },
});

type RefreshBatchResult = {
  succeeded: number;
  failed: number;
  errors: Array<{ packageId: Id<"packages">; packageName: string; error: string }>;
};

async function processRefreshBatch(
  ctx: any,
  packages: Array<{ _id: Id<"packages">; name: string }>,
  existingPkgsMap: Record<string, any>,
): Promise<RefreshBatchResult> {
  let succeeded = 0;
  let failed = 0;
  const errors: RefreshBatchResult["errors"] = [];

  for (const pkg of packages) {
    try {
      const existingPkg = existingPkgsMap[pkg._id];
      await fetchAndUpdateNpmData(ctx, pkg._id, { ...existingPkg, name: pkg.name });
      succeeded++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.packages._setPackageRefreshError, {
        packageId: pkg._id,
        error: errorMessage,
      });
      errors.push({ packageId: pkg._id, packageName: pkg.name, error: errorMessage });
      failed++;
    }
  }

  return { succeeded, failed, errors };
}

async function finalizeRefreshBatch(
  ctx: any,
  logId: Id<"refreshLogs">,
  results: RefreshBatchResult,
  isLastBatch: boolean,
) {
  await ctx.runMutation(internal.packages._updateRefreshLogBatch, {
    logId,
    succeeded: results.succeeded,
    failed: results.failed,
    errors: results.errors,
  });

  if (isLastBatch) {
    await ctx.runMutation(internal.packages._finalizeRefreshLog, {
      logId,
      status: "completed",
    });
    await ctx.runMutation(internal.packages._cleanupOldRefreshLogs, {});
  }
}

// Internal action: Scheduled refresh check (called by cron daily)
export const scheduledRefreshCheck = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.packages._getRefreshConfig);
    if (!config.enabled) {
      console.log("Auto-refresh is disabled, skipping scheduled refresh");
      return null;
    }

    const staleThreshold = Date.now() - config.intervalDays * 24 * 60 * 60 * 1000;
    const stalePackages = await ctx.runQuery(
      internal.packages._getStalePackages,
      { staleThreshold, limit: 100 },
    );

    if (stalePackages.length === 0) {
      console.log("No stale packages found, skipping refresh");
      return null;
    }

    console.log(`Found ${stalePackages.length} stale packages to refresh`);
    const logId = await ctx.runMutation(internal.packages._createRefreshLog, {
      packagesProcessed: stalePackages.length,
      isManual: false,
    });

    await scheduleRefreshBatches(ctx, stalePackages, logId);
    return null;
  },
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function scheduleRefreshBatches(ctx: any, packages: any[], logId: Id<"refreshLogs">) {
  const batches = chunkArray(packages, 10);
  for (let i = 0; i < batches.length; i++) {
    await ctx.scheduler.runAfter(
      i * 5000,
      internal.packages._refreshPackageBatch,
      {
        packages: batches[i],
        logId,
        isLastBatch: i === batches.length - 1,
      },
    );
  }
}

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

// Combined query to get refresh settings + stale packages in one call
export const _getRefreshConfig = internalQuery({
  args: {},
  returns: v.object({
    enabled: v.boolean(),
    intervalDays: v.number(),
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
      enabled: enabledSetting?.value || false,
      intervalDays: intervalSetting?.value || 3,
    };
  },
});

// Action: Manual "Refresh Approved" trigger (bypasses staleness check, approved packages only)
async function createLogAndScheduleRefresh(
  ctx: any,
  packages: { _id: Id<"packages">; name: string }[],
): Promise<{ packagesQueued: number; logId: Id<"refreshLogs"> | null }> {
  if (packages.length === 0) {
    return { packagesQueued: 0, logId: null };
  }
  const logId: Id<"refreshLogs"> = await ctx.runMutation(
    internal.packages._createRefreshLog,
    { packagesProcessed: packages.length, isManual: true },
  );
  await scheduleRefreshBatches(ctx, packages, logId);
  return { packagesQueued: packages.length, logId };
}

export const triggerManualRefreshAll = action({
  args: {},
  returns: v.object({
    packagesQueued: v.number(),
    logId: v.union(v.id("refreshLogs"), v.null()),
  }),
  handler: async (
    ctx,
  ): Promise<{ packagesQueued: number; logId: Id<"refreshLogs"> | null }> => {
    await requireAdminIdentity(ctx);
    const packages: { _id: Id<"packages">; name: string }[] =
      await ctx.runQuery(internal.packages._getAllApprovedPackages, {
        limit: 100,
      });
    return await createLogAndScheduleRefresh(ctx, packages);
  },
});

export const triggerManualRefreshAllPackages = action({
  args: {},
  returns: v.object({
    packagesQueued: v.number(),
    logId: v.union(v.id("refreshLogs"), v.null()),
  }),
  handler: async (
    ctx,
  ): Promise<{ packagesQueued: number; logId: Id<"refreshLogs"> | null }> => {
    await requireAdminIdentity(ctx);
    const packages: { _id: Id<"packages">; name: string }[] =
      await ctx.runQuery(internal.packages._getAllPackagesForRefresh, {
        limit: 100,
      });
    return await createLogAndScheduleRefresh(ctx, packages);
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
  hideThumbnailInCategory: v.optional(v.boolean()),
  convexVerified: v.optional(v.boolean()),
  communitySubmitted: v.optional(v.boolean()),
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
function sortPackages(
  packages: any[],
  sortBy: string,
  ratingMap?: Record<string, { sum: number; count: number }>,
) {
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
        new Date(b.lastPublish).getTime() - new Date(a.lastPublish).getTime(),
    );
  } else if (sortBy === "rating" && ratingMap) {
    packages.sort((a, b) => {
      const aData = ratingMap[a._id as string];
      const bData = ratingMap[b._id as string];
      const aAvg = aData ? aData.sum / aData.count : 0;
      const bAvg = bData ? bData.sum / bData.count : 0;
      if (bAvg === aAvg) {
        return (bData?.count || 0) - (aData?.count || 0);
      }
      return bAvg - aAvg;
    });
  } else if (sortBy === "verified") {
    packages.sort((a, b) => {
      const verifiedDelta =
        Number(Boolean(b.convexVerified)) - Number(Boolean(a.convexVerified));
      if (verifiedDelta !== 0) return verifiedDelta;
      return (
        (b.approvedAt ?? b.submittedAt ?? b._creationTime) -
        (a.approvedAt ?? a.submittedAt ?? a._creationTime)
      );
    });
  }
}

function toDirectoryCard(pkg: any) {
  return {
    _id: pkg._id,
    _creationTime: pkg._creationTime,
    name: pkg.name || "",
    componentName: pkg.componentName,
    description: pkg.description || "",
    slug: pkg.slug,
    category: pkg.category,
    shortDescription: pkg.shortDescription,
    thumbnailUrl: pkg.thumbnailUrl,
    hideThumbnailInCategory: pkg.hideThumbnailInCategory,
    convexVerified: pkg.convexVerified,
    communitySubmitted: pkg.communitySubmitted,
    authorUsername: pkg.authorUsername,
    authorAvatar: pkg.authorAvatar,
    weeklyDownloads: pkg.weeklyDownloads ?? 0,
    repositoryUrl: pkg.repositoryUrl,
    npmUrl: pkg.npmUrl || `https://www.npmjs.com/package/${pkg.name || ""}`,
    installCommand: pkg.installCommand || `npm install ${pkg.name || ""}`,
    featured: pkg.featured,
    tags: pkg.tags,
    demoUrl: pkg.demoUrl,
  };
}

export const listApprovedComponents = query({
  args: {
    category: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("downloads"),
        v.literal("updated"),
        v.literal("rating"),
        v.literal("verified"),
      ),
    ),
  },
  returns: v.array(directoryCardValidator),
  handler: async (ctx, args) => {
    let packages;
    if (args.category) {
      packages = await ctx.db
        .query("packages")
        .withIndex("by_category_and_visibility", (q) => q.eq("category", args.category))
        .take(1000);
      packages = packages.filter(
        (pkg) =>
          pkg.reviewStatus === "approved" &&
          (!pkg.visibility || pkg.visibility === "visible") &&
          !pkg.markedForDeletion,
      );
    } else {
      packages = await ctx.db
        .query("packages")
        .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
        .take(1000);
      packages = packages.filter(
        (pkg) =>
          (!pkg.visibility || pkg.visibility === "visible") &&
          !pkg.markedForDeletion,
      );
    }

    const sortBy = args.sortBy || "newest";
    let ratingMap: Record<string, { sum: number; count: number }> | undefined;
    if (sortBy === "rating") {
      const allRatings = await ctx.db.query("componentRatings").take(1000);
      ratingMap = {};
      for (const r of allRatings) {
        const pid = r.packageId as string;
        if (!ratingMap[pid]) ratingMap[pid] = { sum: 0, count: 0 };
        ratingMap[pid].sum += r.rating;
        ratingMap[pid].count += 1;
      }
    }
    sortPackages(packages, sortBy, ratingMap);
    return packages.map(toDirectoryCard);
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

// Lightweight validator for related component cards (no thumbnail, minimal fields)
const relatedCardValidator = v.object({
  _id: v.id("packages"),
  name: v.string(),
  componentName: v.optional(v.string()),
  slug: v.optional(v.string()),
  shortDescription: v.optional(v.string()),
  description: v.string(),
  category: v.optional(v.string()),
  authorUsername: v.optional(v.string()),
  authorAvatar: v.optional(v.string()),
  weeklyDownloads: v.number(),
  convexVerified: v.optional(v.boolean()),
  communitySubmitted: v.optional(v.boolean()),
  npmUrl: v.string(),
  repositoryUrl: v.optional(v.string()),
});

// Public query: Get up to 3 related components for a detail page
// Matching strategy: same category > shared tags > highest downloads
function scoreAndRankRelated(pkg: any, candidates: any[], limit: number) {
  const pkgTags = new Set((pkg.tags ?? []).map((t: string) => t.toLowerCase()));
  const scored = candidates.map((c) => {
    let score = 0;
    if (pkg.category && c.category === pkg.category) score += 10;
    const cTags = (c.tags ?? []).map((t: string) => t.toLowerCase());
    for (const t of cTags) {
      if (pkgTags.has(t)) score += 3;
    }
    score += Math.min(c.weeklyDownloads / 10000, 2);
    return { pkg: c, score };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.pkg.weeklyDownloads - a.pkg.weeklyDownloads;
  });
  return scored.slice(0, limit).map((s) => ({
    _id: s.pkg._id,
    name: s.pkg.name || "",
    componentName: s.pkg.componentName,
    slug: s.pkg.slug,
    shortDescription: s.pkg.shortDescription,
    description: s.pkg.description || "",
    category: s.pkg.category,
    authorUsername: s.pkg.authorUsername,
    authorAvatar: s.pkg.authorAvatar,
    weeklyDownloads: s.pkg.weeklyDownloads ?? 0,
    convexVerified: s.pkg.convexVerified,
    communitySubmitted: s.pkg.communitySubmitted,
    npmUrl: s.pkg.npmUrl || `https://www.npmjs.com/package/${s.pkg.name || ""}`,
    repositoryUrl: s.pkg.repositoryUrl,
  }));
}

export const getRelatedComponents = query({
  args: { packageId: v.id("packages") },
  returns: v.array(relatedCardValidator),
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return [];

    const showRelated = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "showRelatedOnDetailPage"))
      .first();
    if (showRelated && !showRelated.value) return [];

    const approved = await ctx.db
      .query("packages")
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
      .take(1000);

    const candidates = approved.filter(
      (c) =>
        c._id !== pkg._id &&
        (!c.visibility || c.visibility === "visible") &&
        !c.markedForDeletion,
    );
    if (candidates.length === 0) return [];

    return scoreAndRankRelated(pkg, candidates, 3);
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
  submittedShortDescription: v.optional(v.string()),
  submittedLongDescription: v.optional(v.string()),
});

// Public query: Get submissions by the authenticated user's email
// Returns packages submitted by the current user for profile page
function mergeAndDedupePackages(primary: any[], additional: any[]) {
  const seenIds = new Set(primary.map((p) => p._id));
  const merged = [...primary];
  for (const pkg of additional) {
    if (!seenIds.has(pkg._id)) merged.push(pkg);
  }
  merged.sort((a, b) => b.submittedAt - a.submittedAt);
  return merged;
}

function toSubmissionCard(pkg: any, unreadCount: number) {
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
    submittedShortDescription: pkg.submittedShortDescription,
    submittedLongDescription: pkg.submittedLongDescription,
  };
}

export const getMySubmissions = query({
  args: {},
  returns: v.array(userSubmissionValidator),
  handler: async (ctx) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) return [];

    const packagesBySubmitter = await ctx.db
      .query("packages")
      .withIndex("by_submitter_email", (q) => q.eq("submitterEmail", userEmail))
      .order("desc")
      .take(1000);

    const allPackages = await ctx.db.query("packages").take(1000);
    const packagesByAdditionalEmail = allPackages.filter(
      (pkg) =>
        pkg.additionalEmails?.includes(userEmail) &&
        pkg.submitterEmail !== userEmail,
    );

    const packages = mergeAndDedupePackages(packagesBySubmitter, packagesByAdditionalEmail);

    return await Promise.all(
      packages.map(async (pkg) => {
        const comments = await ctx.db
          .query("packageComments")
          .withIndex("by_package_and_created", (q) => q.eq("packageId", pkg._id))
          .take(1000);
        const unreadCount = comments.filter(
          (c) =>
            c.authorEmail.endsWith("@convex.dev") &&
            (c.status === undefined || c.status === "active") &&
            c.userHasRead === false,
        ).length;
        return toSubmissionCard(pkg, unreadCount);
      }),
    );
  },
});

// Mutation: Request refresh/re-review from profile page
// Creates a private message for admin team
export const requestSubmissionRefresh = mutation({
  args: {
    packageId: v.id("packages"),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userEmail = identity?.email ?? null;
    if (!userEmail) {
      throw new ConvexError("Authentication required");
    }

    // Verify the package belongs to this user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only request refresh for your own submissions");
    }

    // Create a private user<->admin message
    await ctx.db.insert("packageComments", {
      packageId: args.packageId,
      content: args.note,
      authorEmail: userEmail,
      authorName: identity?.name || undefined,
      createdAt: Date.now(),
      adminHasRead: false,
      userHasRead: true,
      status: "active",
    });

    // Notify via Slack when a private message is added.
    const text = formatSlackNotification(pkg, "New private message on", `Submitter (${userEmail})`, args.note);
    await ctx.scheduler.runAfter(0, internal.slack.sendMessage, { text });

    return null;
  },
});

// Query: Get private user<->admin messages for a package
export const getMyPackageNotes = query({
  args: {
    packageId: v.id("packages"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("packageComments"),
      content: v.string(),
      authorName: v.optional(v.string()),
      isFromAdmin: v.boolean(),
      createdAt: v.number(),
      isOwnMessage: v.boolean(),
      userHasRead: v.optional(v.boolean()),
      status: v.optional(
        v.union(v.literal("active"), v.literal("hidden"), v.literal("archived")),
      ),
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

    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) =>
        q.eq("packageId", args.packageId),
      )
      .order("asc")
      .take(1000);

    const visibleComments = args.includeInactive
      ? comments
      : comments.filter((comment) => comment.status !== "hidden" && comment.status !== "archived");

    return visibleComments.map((comment) => ({
      _id: comment._id,
      content: comment.content,
      authorName: comment.authorEmail === userEmail ? "You" : (comment.authorName ?? "Convex Team"),
      isFromAdmin: comment.authorEmail.endsWith("@convex.dev"),
      createdAt: comment.createdAt,
      isOwnMessage: comment.authorEmail === userEmail,
      userHasRead: comment.userHasRead,
      status: comment.status,
    }));
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

    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

    return comments.filter(
      (comment) =>
        comment.authorEmail.endsWith("@convex.dev") &&
        (comment.status === undefined || comment.status === "active") &&
        comment.userHasRead === false,
    ).length;
  },
});

// Mutation: Mark admin replies as read for a package
export const markPackageNotesAsRead = mutation({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new ConvexError("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg || !userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only access notes for your own submissions");
    }

    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(1000);

    // Mark unread admin messages as read
    const updates = comments
      .filter(
        (comment) =>
          comment.authorEmail.endsWith("@convex.dev") &&
          (comment.status === undefined || comment.status === "active") &&
          comment.userHasRead === false,
      )
      .map((comment) => ctx.db.patch(comment._id, { userHasRead: true }));

    await Promise.all(updates);

    return null;
  },
});

// Mutation: Submitter marks a single admin reply as read on their own submission.
// Idempotent: re-running on an already-read or user-authored comment is a no-op.
export const markPackageCommentReadForUser = mutation({
  args: { commentId: v.id("packageComments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      throw new ConvexError("Authentication required");
    }
    const comment = await ctx.db.get(args.commentId);
    if (!comment) return null;
    if (comment.userHasRead === true) return null;

    const pkg = await ctx.db.get(comment.packageId);
    if (!pkg || !userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only mark messages on your own submissions");
    }

    await ctx.db.patch(args.commentId, { userHasRead: true });
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
      throw new ConvexError("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only modify your own submissions");
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
      throw new ConvexError("Authentication required");
    }

    // Verify package belongs to user
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only delete your own submissions");
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
      throw new ConvexError("Authentication required");
    }

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) {
      throw new ConvexError("Package not found");
    }
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only manage your own submissions");
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
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(notes.map((note) => ctx.db.delete(note._id)));

    // Delete associated comments
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

    // Delete associated ratings
    const ratings = await ctx.db
      .query("componentRatings")
      .withIndex("by_package_and_session", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(ratings.map((rating) => ctx.db.delete(rating._id)));

    // Delete thumbnail jobs
    const jobs = await ctx.db
      .query("thumbnailJobs")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(jobs.map((job) => ctx.db.delete(job._id)));

    // Delete badge fetches
    const fetches = await ctx.db
      .query("badgeFetches")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .take(10000);
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
      throw new ConvexError("Package not found");
    }

    // Delete associated notes
    const notes = await ctx.db
      .query("packageNotes")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(notes.map((note) => ctx.db.delete(note._id)));

    // Delete associated comments
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

    // Delete associated ratings
    const ratings = await ctx.db
      .query("componentRatings")
      .withIndex("by_package_and_session", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(ratings.map((rating) => ctx.db.delete(rating._id)));

    // Delete thumbnail jobs
    const jobs = await ctx.db
      .query("thumbnailJobs")
      .withIndex("by_package_and_created", (q) => q.eq("packageId", args.packageId))
      .take(10000);
    await Promise.all(jobs.map((job) => ctx.db.delete(job._id)));

    // Delete badge fetches
    const fetches = await ctx.db
      .query("badgeFetches")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .take(10000);
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
      .take(1000);

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
async function deletePackageAndRelatedData(ctx: any, packageId: Id<"packages">) {
  const tables: Array<{ table: string; index: string; field: string }> = [
    { table: "packageNotes", index: "by_package_and_created", field: "packageId" },
    { table: "packageComments", index: "by_package_and_created", field: "packageId" },
    { table: "componentRatings", index: "by_package_and_session", field: "packageId" },
    { table: "thumbnailJobs", index: "by_package_and_created", field: "packageId" },
    { table: "badgeFetches", index: "by_package", field: "packageId" },
  ];
  for (const { table, index } of tables) {
    const rows = await ctx.db
      .query(table)
      .withIndex(index, (q: any) => q.eq("packageId", packageId))
      .take(10000);
    await Promise.all(rows.map((r: any) => ctx.db.delete(r._id)));
  }
  await ctx.db.delete(packageId);
}

export const scheduledDeletionCleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const autoDeleteSetting = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", "autoDeleteMarkedPackages"))
      .unique();
    if (!autoDeleteSetting?.value) return null;

    const intervalSetting = await ctx.db
      .query("adminSettingsNumeric")
      .withIndex("by_key", (q) => q.eq("key", "deleteIntervalDays"))
      .unique();
    const intervalDays = intervalSetting?.value ?? 7;
    const cutoffTime = Date.now() - intervalDays * 24 * 60 * 60 * 1000;

    const packagesToDelete = await ctx.db
      .query("packages")
      .withIndex("by_marked_for_deletion", (q) => q.eq("markedForDeletion", true))
      .take(10000);
    const eligible = packagesToDelete.filter(
      (pkg) => pkg.markedForDeletionAt && pkg.markedForDeletionAt < cutoffTime,
    );

    for (const pkg of eligible) {
      await deletePackageAndRelatedData(ctx, pkg._id);
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
      throw new ConvexError("Authentication required");
    }

    // Get all packages owned by user (not marked for deletion)
    const userPackages = await ctx.db
      .query("packages")
      .withIndex("by_submitter_email", (q) => q.eq("submitterEmail", userEmail))
      .take(10000);

    // Check if user has any active submissions (not marked for deletion)
    const activeSubmissions = userPackages.filter((pkg) => !pkg.markedForDeletion);
    if (activeSubmissions.length > 0) {
      throw new ConvexError(
        `You must delete all your components before deleting your account. You have ${activeSubmissions.length} active submission(s).`
      );
    }

    // Remove user from additionalEmails on packages they don't own
    const allPackages = await ctx.db.query("packages").take(10000);
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
function buildSubmissionUpdates(args: any, pkg: any) {
  const updates: Record<string, string | string[] | number | undefined> = {};
  const fields = [
    "componentName", "shortDescription", "longDescription", "category", "tags",
    "demoUrl", "videoUrl", "generatedDescription", "generatedUseCases",
    "generatedHowItWorks", "readmeIncludedMarkdown", "readmeIncludeSource",
  ] as const;
  for (const f of fields) {
    if (args[f] !== undefined) updates[f] = args[f];
  }

  if (
    (args.generatedDescription || args.generatedUseCases || args.generatedHowItWorks) &&
    !pkg.contentModelVersion
  ) {
    updates.contentModelVersion = 2;
    updates.contentGeneratedAt = Date.now();
    updates.contentGenerationStatus = "completed";
  }

  const desc = (args.generatedDescription ?? pkg.generatedDescription) || "";
  const useCases = (args.generatedUseCases ?? pkg.generatedUseCases) || "";
  const howItWorks = (args.generatedHowItWorks ?? pkg.generatedHowItWorks) || "";
  if (desc && useCases && howItWorks) {
    updates.skillMd = buildSkillMdFromContent(
      {
        name: pkg.name,
        componentName: (args.componentName ?? pkg.componentName) || undefined,
        shortDescription: (args.shortDescription ?? pkg.shortDescription) || undefined,
        description: pkg.description,
        repositoryUrl: pkg.repositoryUrl || undefined,
        npmUrl: pkg.npmUrl,
        demoUrl: (args.demoUrl ?? pkg.demoUrl) || undefined,
        installCommand: pkg.installCommand,
        slug: pkg.slug || undefined,
      },
      { description: desc, useCases, howItWorks },
    );
  }
  return updates;
}

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
    generatedDescription: v.optional(v.string()),
    generatedUseCases: v.optional(v.string()),
    generatedHowItWorks: v.optional(v.string()),
    readmeIncludedMarkdown: v.optional(v.string()),
    readmeIncludeSource: v.optional(
      v.union(v.literal("markers"), v.literal("full")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) throw new ConvexError("Authentication required");

    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new ConvexError("Package not found");
    if (!userOwnsPackage(pkg, userEmail)) {
      throw new ConvexError("You can only edit your own submissions");
    }

    const updates = buildSubmissionUpdates(args, pkg);
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
      logoUrl: v.optional(v.string()),
      repositoryUrl: v.optional(v.string()),
      npmUrl: v.string(),
      generatedDescription: v.optional(v.string()),
      generatedUseCases: v.optional(v.string()),
      generatedHowItWorks: v.optional(v.string()),
      readmeIncludedMarkdown: v.optional(v.string()),
      readmeIncludeSource: v.optional(
        v.union(v.literal("markers"), v.literal("full")),
      ),
      contentModelVersion: v.optional(v.number()),
      submittedShortDescription: v.optional(v.string()),
      submittedLongDescription: v.optional(v.string()),
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
      logoUrl: pkg.logoUrl,
      repositoryUrl: pkg.repositoryUrl,
      npmUrl: pkg.npmUrl,
      generatedDescription: pkg.generatedDescription,
      generatedUseCases: pkg.generatedUseCases,
      generatedHowItWorks: pkg.generatedHowItWorks,
      readmeIncludedMarkdown: pkg.readmeIncludedMarkdown,
      readmeIncludeSource: pkg.readmeIncludeSource,
      contentModelVersion: pkg.contentModelVersion,
      submittedShortDescription: pkg.submittedShortDescription,
      submittedLongDescription: pkg.submittedLongDescription,
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
      .take(1000);

    if (packages.length === 0) return 0;

    // Get unread admin messages for user's packages
    let totalUnread = 0;
    for (const pkg of packages) {
      const comments = await ctx.db
        .query("packageComments")
        .withIndex("by_package_and_created", (q) => q.eq("packageId", pkg._id))
        .take(1000);
      totalUnread += comments.filter(
        (comment) =>
          comment.authorEmail.endsWith("@convex.dev") &&
          (comment.status === undefined || comment.status === "active") &&
          comment.userHasRead === false,
      ).length;
    }

    return totalUnread;
  },
});

// Per-package unread summary for the header notifications bell (current user).
// Returns minimal metadata only (no PII, no message content).
export const getMyUnreadAdminRepliesByPackage = query({
  args: {},
  returns: v.array(
    v.object({
      packageId: v.id("packages"),
      packageName: v.string(),
      slug: v.optional(v.string()),
      unreadCount: v.number(),
      lastMessageAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userEmail = await getCurrentUserEmail(ctx);
    if (!userEmail) {
      return [];
    }

    const packages = await ctx.db
      .query("packages")
      .withIndex("by_submitter_email", (q) => q.eq("submitterEmail", userEmail))
      .take(1000);

    if (packages.length === 0) return [];

    const results: Array<{
      packageId: Id<"packages">;
      packageName: string;
      slug: string | undefined;
      unreadCount: number;
      lastMessageAt: number;
    }> = [];

    for (const pkg of packages) {
      const summary = await computeUnreadAdminReplySummary(ctx, pkg);
      if (summary) results.push(summary);
    }

    results.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return results;
  },
});

// Fetch a package's admin->user replies and return an unread summary if any
// unread messages are present. Returns null when there is nothing to surface.
async function computeUnreadAdminReplySummary(ctx: any, pkg: any) {
  const comments = await ctx.db
    .query("packageComments")
    .withIndex("by_package_and_created", (q: any) => q.eq("packageId", pkg._id))
    .take(1000);

  const unread = comments.filter(
    (comment: any) =>
      comment.authorEmail.endsWith("@convex.dev") &&
      (comment.status === undefined || comment.status === "active") &&
      comment.userHasRead === false,
  );

  if (unread.length === 0) return null;

  let lastMessageAt = 0;
  for (const c of unread) {
    if (c.createdAt > lastMessageAt) lastMessageAt = c.createdAt;
  }

  return {
    packageId: pkg._id as Id<"packages">,
    packageName: (pkg.componentName ?? pkg.name) as string,
    slug: (pkg.slug ?? undefined) as string | undefined,
    unreadCount: unread.length,
    lastMessageAt,
  };
}

// Per-package incoming message summary for admin bell dropdown.
// Groups unread submitter -> admin messages by package. Returns minimal metadata only.
export const getAdminUnreadMessagesByPackage = query({
  args: {},
  returns: v.array(
    v.object({
      packageId: v.id("packages"),
      packageName: v.string(),
      slug: v.optional(v.string()),
      unreadCount: v.number(),
      lastMessageAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return [];

    // Scan recent comments directly. Ordered by createdAt desc via the default
    // _creationTime index. Unread admin flags are rare relative to total
    // comments, so we read a bounded window and filter in memory.
    const recent = await ctx.db.query("packageComments").order("desc").take(2000);

    const grouped = new Map<
      Id<"packages">,
      { packageId: Id<"packages">; packageName: string; slug: string | undefined; unreadCount: number; lastMessageAt: number }
    >();

    // A comment is a submitter message when adminHasRead !== true. The write
    // path (addPackageComment / requestSubmissionRefresh) sets adminHasRead
    // based on whether the author is an admin, so the author's email is not a
    // reliable discriminator (e.g. an admin testing on their own submission).
    for (const comment of recent) {
      if (comment.status !== undefined && comment.status !== "active") continue;
      if (comment.adminHasRead === true) continue;

      const existing = grouped.get(comment.packageId);
      if (existing) {
        existing.unreadCount += 1;
        if (comment.createdAt > existing.lastMessageAt) {
          existing.lastMessageAt = comment.createdAt;
        }
        continue;
      }

      if (grouped.size >= 50) continue;

      const pkg = await ctx.db.get(comment.packageId);
      if (!pkg) continue;

      grouped.set(comment.packageId, {
        packageId: comment.packageId,
        packageName: pkg.componentName ?? pkg.name,
        slug: pkg.slug ?? undefined,
        unreadCount: 1,
        lastMessageAt: comment.createdAt,
      });
    }

    const results = Array.from(grouped.values());
    results.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return results;
  },
});

// Public query: List categories from admin-managed table with denormalized counts.
// Reads only the categories table (no package scan). Counts are updated by mutations.
export const listCategories = query({
  args: {},
  returns: v.array(
    v.object({
      category: v.string(),
      label: v.string(),
      description: v.string(),
      count: v.number(),
      verifiedCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const adminCategories = await ctx.db
      .query("categories")
      .withIndex("by_enabled_and_sortOrder", (q) => q.eq("enabled", true))
      .take(1000);

    return adminCategories.map((cat) => ({
      category: cat.slug,
      label: cat.label,
      description: cat.description,
      count: cat.packageCount ?? 0,
      verifiedCount: cat.verifiedCount ?? 0,
    }));
  },
});

// Public query: Get a single category by slug for category landing pages
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      slug: v.string(),
      label: v.string(),
      description: v.string(),
      count: v.number(),
      verifiedCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!category || !category.enabled) {
      return null;
    }

    // Count packages in this category
    const packages = await ctx.db
      .query("packages")
      .withIndex("by_category_and_visibility", (q) => q.eq("category", args.slug))
      .take(1000);

    const visible = packages.filter(
      (pkg) =>
        pkg.reviewStatus === "approved" &&
        (!pkg.visibility || pkg.visibility === "visible") &&
        !pkg.markedForDeletion,
    );

    const verifiedCount = visible.filter((pkg) => pkg.convexVerified).length;

    return {
      slug: category.slug,
      label: category.label,
      description: category.description,
      count: visible.length,
      verifiedCount,
    };
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
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
      .take(1000);

    const featured = packages.filter(
      (pkg) =>
        pkg.featured &&
        (!pkg.visibility || pkg.visibility === "visible") &&
        !pkg.markedForDeletion,
    );

    // Sort by admin-managed featuredSortOrder (nulls last), then newest first
    featured.sort((a, b) => {
      const orderA = a.featuredSortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.featuredSortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return b._creationTime - a._creationTime;
    });

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
      hideThumbnailInCategory: pkg.hideThumbnailInCategory,
      convexVerified: pkg.convexVerified,
      communitySubmitted: pkg.communitySubmitted,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
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
    await requireAdminIdentity(ctx);
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
    await requirePackageOwnerOrAdmin(ctx, args.packageId);

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
    await requirePackageOwnerOrAdmin(ctx, args.packageId);
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
    await requireAdminIdentity(ctx);
    const pkg = await ctx.db.get("packages", args.packageId);
    if (!pkg) return null;

    const repoUrl = pkg.repositoryUrl;
    if (!repoUrl) return null;

    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const owner = match[1];
    const authorUsername = owner;
    const authorAvatar = `https://avatars.githubusercontent.com/${owner}`;

    // Always overwrite when admin clicks auto-fill
    await ctx.db.patch("packages", args.packageId, { authorUsername, authorAvatar });

    return { authorUsername, authorAvatar };
  },
});

// ============ DIRECTORY EXPANSION: ADMIN MUTATIONS ============

// Admin mutation: Update directory-specific component details
function buildComponentDetailsPatch(updates: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) patch[key] = value;
  }
  return patch;
}

async function validateAndApplySlug(
  ctx: any,
  patch: Record<string, unknown>,
  slug: string | undefined,
  packageId: Id<"packages">,
) {
  if (slug === undefined) return;
  if (slug.trim() === "") {
    patch.slug = undefined;
  } else {
    if (await isSlugTaken(ctx, slug, packageId)) {
      throw new ConvexError(`Slug "${slug}" is already in use by another component.`);
    }
    patch.slug = slug;
  }
}

async function validateAndApplyCategory(
  ctx: any,
  patch: Record<string, unknown>,
  category: string | undefined,
) {
  if (category === undefined) return;
  const normalized = category.trim().toLowerCase();
  if (normalized === "") {
    patch.category = undefined;
  } else {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q: any) => q.eq("slug", normalized))
      .first();
    if (!existing) throw new ConvexError(`Category "${normalized}" does not exist.`);
    patch.category = normalized;
  }
}

export const updateComponentDetails = mutation({
  args: {
    packageId: v.id("packages"),
    componentName: v.optional(v.string()),
    slug: v.optional(v.string()),
    category: v.optional(v.string()),
    clearCategory: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    shortDescription: v.optional(v.string()),
    longDescription: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    clearThumbnail: v.optional(v.boolean()),
    hideThumbnailInCategory: v.optional(v.boolean()),
    convexVerified: v.optional(v.boolean()),
    communitySubmitted: v.optional(v.boolean()),
    hideSeoAndSkillContentOnDetailPage: v.optional(v.boolean()),
    authorUsername: v.optional(v.string()),
    authorAvatar: v.optional(v.string()),
    relatedComponentIds: v.optional(v.array(v.id("packages"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const { packageId, clearThumbnail, clearCategory, slug, category, ...updates } = args;
    const patch = buildComponentDetailsPatch(updates);
    await validateAndApplySlug(ctx, patch, slug, packageId);
    await validateAndApplyCategory(ctx, patch, category);
    if (clearCategory) patch.category = undefined;
    if (clearThumbnail) {
      patch.thumbnailUrl = undefined;
      patch.thumbnailStorageId = undefined;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(packageId, patch);
    }
    // Refresh denormalized category counts whenever a field that affects them changes.
    // Without this, sidebar counts (packageCount/verifiedCount) stay stale after edits.
    const affectsCategoryCounts =
      "category" in patch || "convexVerified" in patch;
    if (affectsCategoryCounts) {
      await recountCategoryStats(ctx);
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
      throw new ConvexError("Invalid email address");
    }

    await ctx.db.patch(args.packageId, { submitterEmail: email });
    return null;
  },
});

// Admin mutation: Update submitter name and discord for a package
export const updateSubmitterInfo = mutation({
  args: {
    packageId: v.id("packages"),
    submitterName: v.optional(v.string()),
    submitterDiscord: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const patch: Record<string, string | undefined> = {};
    if (args.submitterName !== undefined) {
      patch.submitterName = args.submitterName.trim() || undefined;
    }
    if (args.submitterDiscord !== undefined) {
      patch.submitterDiscord = args.submitterDiscord.trim() || undefined;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.packageId, patch);
    }
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
      .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
      .take(5000);
    return packages.filter(
      (pkg) => !pkg.visibility || pkg.visibility === "visible",
    );
  },
});

// Search across multiple search indexes and dedupe results
async function searchPackagesByTerm(ctx: QueryCtx, searchTerm: string) {
  const [nameHits, descHits, compNameHits] = await Promise.all([
    ctx.db
      .query("packages")
      .withSearchIndex("search_name", (q) =>
        q.search("name", searchTerm).eq("reviewStatus", "approved").eq("visibility", "visible"),
      )
      .take(100),
    ctx.db
      .query("packages")
      .withSearchIndex("search_description", (q) =>
        q.search("description", searchTerm).eq("reviewStatus", "approved").eq("visibility", "visible"),
      )
      .take(100),
    ctx.db
      .query("packages")
      .withSearchIndex("search_componentName", (q) =>
        q.search("componentName", searchTerm).eq("reviewStatus", "approved").eq("visibility", "visible"),
      )
      .take(100),
  ]);

  const seen = new Set<string>();
  const results: any[] = [];
  for (const pkg of [...nameHits, ...compNameHits, ...descHits]) {
    if (seen.has(pkg._id) || pkg.markedForDeletion) continue;
    seen.add(pkg._id);
    results.push(pkg);
  }
  return results;
}

function toApiSearchCard(pkg: any) {
  return {
    slug: pkg.slug || "",
    displayName: pkg.componentName || pkg.name,
    packageName: pkg.name,
    shortDescription: pkg.shortDescription,
    category: pkg.category,
    weeklyDownloads: pkg.weeklyDownloads || 0,
    convexVerified: pkg.convexVerified || false,
  };
}

// Internal query: Search approved+visible packages using search indexes (for REST API)
export const _searchApprovedPackages = internalQuery({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  returns: v.object({
    results: v.array(v.any()),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    let packages: any[];

    if (args.searchTerm.trim()) {
      packages = await searchPackagesByTerm(ctx, args.searchTerm);
    } else {
      packages = await ctx.db
        .query("packages")
        .withIndex("by_reviewStatus_and_visibility_and_markedForDeletion", (q) => q.eq("reviewStatus", "approved"))
        .take(1000);
      packages = packages.filter(
        (pkg) =>
          (!pkg.visibility || pkg.visibility === "visible") &&
          !pkg.markedForDeletion,
      );
    }

    if (args.category) {
      packages = packages.filter((pkg: any) => pkg.category === args.category);
    }

    packages.sort((a: any, b: any) => (b.weeklyDownloads || 0) - (a.weeklyDownloads || 0));
    const total = packages.length;
    const paginated = packages.slice(args.offset, args.offset + args.limit);

    return { results: paginated.map(toApiSearchCard), total };
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

// Internal mutation: Record an MCP API request for monitoring
export const _recordMcpApiRequest = internalMutation({
  args: {
    endpoint: v.string(),
    slug: v.optional(v.string()),
    query: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    referer: v.optional(v.string()),
    responseStatus: v.number(),
    responseTimeMs: v.optional(v.number()),
    apiKeyId: v.optional(v.id("apiKeys")),
    hashedIp: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mcpApiLogs", {
      endpoint: args.endpoint,
      slug: args.slug,
      query: args.query,
      userAgent: args.userAgent,
      referer: args.referer,
      requestedAt: Date.now(),
      responseStatus: args.responseStatus,
      responseTimeMs: args.responseTimeMs,
      apiKeyId: args.apiKeyId,
      hashedIp: args.hashedIp,
    });
    return null;
  },
});

// Admin query: Get badge fetch stats for a component
export const getBadgeStats = query({
  args: { packageId: v.id("packages"), now: v.number() },
  returns: v.object({
    last7Days: v.number(),
    last30Days: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = args.now;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const allFetches = await ctx.db
      .query("badgeFetches")
      .withIndex("by_package", (q) => q.eq("packageId", args.packageId))
      .take(1000);

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
      .withIndex("by_package_and_session", (q) => q.eq("packageId", args.packageId))
      .take(1000);

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
      throw new ConvexError("Rating must be between 1 and 5");
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
      .take(1000);

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
      .take(1000);

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
      packageCount: v.optional(v.number()),
      verifiedCount: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);

    return await ctx.db
      .query("categories")
      .withIndex("by_sort_order")
      .take(1000);
  },
});

// Admin: Create or update a category
async function updateExistingCategory(
  ctx: MutationCtx,
  id: Id<"categories">,
  normalizedSlug: string,
  data: { label: string; description: string; sortOrder: number; enabled: boolean },
): Promise<Id<"categories">> {
  const existing = await ctx.db.get(id);
  if (!existing) throw new ConvexError("Category not found.");
  await ctx.db.patch(id, { slug: normalizedSlug, ...data });
  if (existing.slug !== normalizedSlug) {
    const related = await ctx.db
      .query("packages")
      .withIndex("by_category_and_visibility", (q) => q.eq("category", existing.slug))
      .take(10000);
    await Promise.all(related.map((pkg) => ctx.db.patch(pkg._id, { category: normalizedSlug })));
    // Slug rename moves packages between category keys; refresh denormalized counts.
    await recountCategoryStats(ctx);
  }
  return id;
}

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
    await requireAdminIdentity(ctx);
    const normalizedSlug = args.slug.trim().toLowerCase();
    const conflict = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .first();
    if (conflict && conflict._id !== args.id) {
      throw new ConvexError(`Category slug "${normalizedSlug}" is already in use.`);
    }
    const data = { label: args.label, description: args.description, sortOrder: args.sortOrder, enabled: args.enabled };
    if (args.id) {
      return await updateExistingCategory(ctx, args.id, normalizedSlug, data);
    }
    return await ctx.db.insert("categories", { slug: normalizedSlug, ...data });
  },
});

// Admin: Delete a category
export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);

    const existingCategory = await ctx.db.get(args.id);
    if (!existingCategory) {
      return null;
    }

    const relatedPackages = await ctx.db
      .query("packages")
      .withIndex("by_category_and_visibility", (q) => q.eq("category", existingCategory.slug))
      .take(10000);

    await Promise.all(
      relatedPackages.map((pkg) =>
        ctx.db.patch(pkg._id, {
          category: undefined,
        }),
      ),
    );

    await ctx.db.delete(args.id);
    // Packages were unassigned; refresh denormalized counts on remaining categories.
    await recountCategoryStats(ctx);
    return null;
  },
});

// Admin: Seed default categories if table is empty
export const seedCategories = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);

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
async function fetchGitHubIssueCounts(
  owner: string,
  repo: string,
): Promise<{ openCount: number; closedCount: number }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ConvexComponentsDirectory",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const [openRes, closedRes] = await Promise.all([
    fetch(`https://api.github.com/search/issues?q=repo:${owner}/${repo}+type:issue+state:open`, { headers }),
    fetch(`https://api.github.com/search/issues?q=repo:${owner}/${repo}+type:issue+state:closed`, { headers }),
  ]);

  const openCount = openRes.ok ? ((await openRes.json()).total_count ?? 0) : 0;
  const closedCount = closedRes.ok ? ((await closedRes.json()).total_count ?? 0) : 0;
  return { openCount, closedCount };
}

export const refreshGitHubIssueCounts = action({
  args: { packageId: v.id("packages") },
  returns: v.object({ openCount: v.number(), closedCount: v.number() }),
  handler: async (ctx, args) => {
    const pkg = await ctx.runQuery(internal.packages._getPackage, { packageId: args.packageId });
    if (!pkg || !pkg.repositoryUrl) return { openCount: 0, closedCount: 0 };

    const parsed = parseGitHubRepo(pkg.repositoryUrl);
    if (!parsed) return { openCount: 0, closedCount: 0 };

    const counts = await fetchGitHubIssueCounts(parsed.owner, parsed.repo);
    await ctx.runMutation(internal.packages._updateGitHubIssueCounts, {
      packageId: args.packageId,
      ...counts,
    });
    return counts;
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

    const packages = await ctx.db.query("packages").take(1000);

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

    const baseSlug = generateSlugFromName(pkg.name);
    if (!baseSlug) return null;

    // Ensure uniqueness before saving
    const uniqueSlug = await generateUniqueSlug(ctx, baseSlug, args.packageId);
    await ctx.db.patch(args.packageId, { slug: uniqueSlug });
    return uniqueSlug;
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

    const packages = await ctx.db.query("packages").take(10000);

    let generated = 0;
    let skipped = 0;

    for (const pkg of packages) {
      // Skip if already has a slug
      if (pkg.slug && pkg.slug.trim() !== "") {
        skipped++;
        continue;
      }

      const baseSlug = generateSlugFromName(pkg.name);
      if (baseSlug) {
        // Ensure uniqueness before saving
        const uniqueSlug = await generateUniqueSlug(ctx, baseSlug, pkg._id);
        await ctx.db.patch(pkg._id, { slug: uniqueSlug });
        generated++;
      } else {
        skipped++;
      }
    }

    return { generated, skipped };
  },
});

// ============ AVATAR URL MIGRATION ============

// Admin mutation: Migrate old GitHub avatar URLs to the new format
// Old: https://github.com/{username}.png
// New: https://avatars.githubusercontent.com/{username}
export const migrateAvatarUrls = mutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);

    const packages = await ctx.db.query("packages").take(10000);

    let updated = 0;
    let skipped = 0;

    for (const pkg of packages) {
      const oldPattern = /^https:\/\/github\.com\/([^/]+)\.png$/;
      
      if (pkg.authorAvatar && oldPattern.test(pkg.authorAvatar)) {
        const match = pkg.authorAvatar.match(oldPattern);
        if (match) {
          const username = match[1];
          const newUrl = `https://avatars.githubusercontent.com/${username}`;
          await ctx.db.patch(pkg._id, { authorAvatar: newUrl });
          updated++;
        }
      } else {
        skipped++;
      }
    }

    return { updated, skipped };
  },
});
