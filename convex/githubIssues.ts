// GitHub issue creation for admin to submitter communication.
//
// Two flows share the same POST /repos/{owner}/{repo}/issues helper:
//
// 1. A single private message mirrored as an issue on the submitter's repo
//    (addPackageComment schedules createIssueForComment).
// 2. A broadcast: one issue on every repo matching a review status filter,
//    sent one at a time with a fixed stagger so GitHub's content creation
//    limits (about 80 per minute, 500 per hour) are never approached.
//
// GitHub writes need GITHUB_TOKEN with issue write access (classic
// `public_repo` or a fine grained token with Issues: write on the repos).

import { v, ConvexError } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getAdminIdentity, requireAdminIdentity } from "./auth";

// ============ Constants ============

// Delay between broadcast sends. 10s is 6 per minute and 360 per hour, far
// under GitHub's secondary limits, leaving headroom for README refreshes and
// AI review fetches that share the same token.
const BROADCAST_STAGGER_MS = 10_000;
// Give up on a single repo after this many rate limited attempts.
const MAX_ATTEMPTS = 3;
// Bounds for the wait GitHub asks for on 403/429.
const MIN_RETRY_WAIT_MS = 30_000;
const MAX_RETRY_WAIT_MS = 15 * 60_000;
const DEFAULT_RETRY_WAIT_MS = 60_000;
const SITE_URL = "https://www.convex.dev/components";
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 20_000;
// Upper bound on packages read when building a broadcast target list.
const MAX_PACKAGES = 5000;

export const broadcastFilterValidator = v.union(
  v.literal("approved"),
  v.literal("pending"),
  v.literal("rejected"),
  v.literal("all"),
);
type BroadcastFilter = "approved" | "pending" | "rejected" | "all";

// ============ GitHub helpers ============

type RepoRef = { owner: string; repo: string };

// Accepts https://github.com/owner/repo, with or without .git, trailing
// slashes, or a deeper path (tree/main/...). Anything not on github.com is
// rejected so we never POST to another host.
export function parseGitHubRepo(repositoryUrl?: string | null): RepoRef | null {
  if (!repositoryUrl) return null;
  const cleaned = repositoryUrl
    .trim()
    .replace(/^git\+/, "")
    .replace(/^git@github\.com:/, "https://github.com/");
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return null;
  }
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return null;
  }
  const [owner, repoRaw] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repoRaw) return null;
  const repo = repoRaw.replace(/\.git$/, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  return { owner, repo };
}

// Canonical "owner/repo#n" key shared by packageComments.githubIssueKey and
// githubBroadcastItems.issueKey. Accepts the html_url GitHub returns on
// create (github.com/o/r/issues/12, optionally with #issuecomment-...) and the
// API url found in notification subjects (api.github.com/repos/o/r/issues/12).
export function issueKeyFromUrl(issueUrl?: string | null): string | null {
  if (!issueUrl) return null;
  const match = issueUrl.match(
    /github\.com\/(?:repos\/)?([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/,
  );
  if (!match) return null;
  return `${match[1]}/${match[2]}#${match[3]}`;
}

export type IssueRef = RepoRef & { number: number };

export function parseIssueKey(key: string): IssueRef | null {
  const match = key.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}

export const GITHUB_API = "https://api.github.com";

export function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent":
      "convex-components-directory (+https://www.convex.dev/components)",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

type IssueResult =
  | { ok: true; issueUrl: string }
  | { ok: false; kind: "rate_limited"; waitMs: number; message: string }
  | { ok: false; kind: "failed"; message: string };

function clampWait(ms: number): number {
  return Math.min(MAX_RETRY_WAIT_MS, Math.max(MIN_RETRY_WAIT_MS, ms));
}

// Reads GitHub's rate limit hints. Retry-After is seconds; X-RateLimit-Reset
// is a unix timestamp in seconds.
function rateLimitWaitMs(response: Response): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return clampWait(seconds * 1000);
    }
  }
  const reset = response.headers.get("x-ratelimit-reset");
  if (reset) {
    const resetMs = Number(reset) * 1000;
    if (Number.isFinite(resetMs) && resetMs > Date.now()) {
      return clampWait(resetMs - Date.now());
    }
  }
  return DEFAULT_RETRY_WAIT_MS;
}

async function readGitHubMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  } catch {
    // Non JSON body, fall through to the status text.
  }
  return response.statusText || `HTTP ${response.status}`;
}

// POST content (an issue or an issue comment). Never throws for GitHub level
// failures so callers can record the outcome; only unexpected errors surface.
// Both endpoints return 201 with an html_url on success.
async function postGitHubContent(
  path: string,
  payload: Record<string, string>,
): Promise<IssueResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      kind: "failed",
      message: "GITHUB_TOKEN is not set on the Convex deployment",
    };
  }

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      method: "POST",
      headers: { ...githubHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return {
      ok: false,
      kind: "failed",
      message: `Network error reaching GitHub: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (response.status === 201) {
    const data = (await response.json()) as { html_url?: unknown };
    if (typeof data.html_url === "string") {
      return { ok: true, issueUrl: data.html_url };
    }
    return {
      ok: false,
      kind: "failed",
      message: "GitHub created the issue but returned no URL",
    };
  }

  const message = await readGitHubMessage(response);
  const remaining = response.headers.get("x-ratelimit-remaining");
  const looksRateLimited =
    response.status === 429 ||
    (response.status === 403 &&
      (remaining === "0" ||
        response.headers.has("retry-after") ||
        /rate limit|abuse/i.test(message)));

  if (looksRateLimited) {
    return {
      ok: false,
      kind: "rate_limited",
      waitMs: rateLimitWaitMs(response),
      message: `GitHub rate limit: ${message}`,
    };
  }

  switch (response.status) {
    case 401:
      return {
        ok: false,
        kind: "failed",
        message: "GitHub rejected the token (401). Check GITHUB_TOKEN.",
      };
    case 403:
      return {
        ok: false,
        kind: "failed",
        message: `GitHub forbade the request (403): ${message}. The token may lack issue write access.`,
      };
    case 404:
      return {
        ok: false,
        kind: "failed",
        message:
          "Repository not found (404). It may be private, renamed, or deleted.",
      };
    case 410:
      return {
        ok: false,
        kind: "failed",
        message: "Issues are disabled on this repository (410).",
      };
    default:
      return {
        ok: false,
        kind: "failed",
        message: `GitHub returned ${response.status}: ${message}`,
      };
  }
}

async function createGitHubIssue(
  repo: RepoRef,
  title: string,
  body: string,
): Promise<IssueResult> {
  return postGitHubContent(`/repos/${repo.owner}/${repo.repo}/issues`, {
    title,
    body,
  });
}

async function createGitHubIssueComment(
  issue: IssueRef,
  body: string,
): Promise<IssueResult> {
  return postGitHubContent(
    `/repos/${issue.owner}/${issue.repo}/issues/${issue.number}/comments`,
    { body },
  );
}

export type IssueState = "open" | "closed";

// One GET to learn whether an issue is still open. Returns null when GitHub
// cannot answer (deleted repo, bad token, network) so callers fall back to
// opening a fresh issue rather than commenting into the void.
export async function getGitHubIssueState(
  issue: IssueRef,
  token?: string,
): Promise<IssueState | null> {
  const auth = (token ?? process.env.GITHUB_TOKEN)?.trim();
  if (!auth) return null;
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${issue.owner}/${issue.repo}/issues/${issue.number}`,
      { headers: githubHeaders(auth), signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: unknown };
    return data.state === "open" || data.state === "closed" ? data.state : null;
  } catch {
    return null;
  }
}

function componentLink(pkg: { slug?: string; name: string }): string {
  return `${SITE_URL}/${pkg.slug ?? encodeURIComponent(pkg.name)}`;
}

function displayName(pkg: { componentName?: string; name: string }): string {
  return pkg.componentName ?? pkg.name;
}

function commentIssueBody(
  content: string,
  pkg: { slug?: string; name: string; componentName?: string },
  previousIssueUrl?: string,
): string {
  return (
    `${content.trim()}\n\n---\n` +
    `This message is from the Convex Components Directory team about your listing for **${displayName(pkg)}**.\n` +
    `Listing: ${componentLink(pkg)}\n` +
    (previousIssueUrl ? `Previous conversation: ${previousIssueUrl}\n` : "") +
    `You can also reply in the private thread on your directory profile: ${SITE_URL}/profile`
  );
}

// Follow ups posted as comments keep the footer short; the issue already
// carries the listing context.
function followUpCommentBody(content: string): string {
  return `${content.trim()}\n\n---\nReply from the Convex Components Directory team. You can also answer in the private thread on your directory profile: ${SITE_URL}/profile`;
}

// Most recent issue this package's thread or a broadcast opened, if any.
// Thread issues win over broadcast issues because they are the direct
// conversation; the action still checks state before commenting.
async function findIssueCandidates(
  ctx: QueryCtx | MutationCtx,
  packageId: Id<"packages">,
): Promise<Array<{ key: string; url: string; state?: IssueState }>> {
  const candidates: Array<{ key: string; url: string; state?: IssueState }> =
    [];
  const seen = new Set<string>();

  const comments = await ctx.db
    .query("packageComments")
    .withIndex("by_package_and_created", (q) => q.eq("packageId", packageId))
    .order("desc")
    .take(200);
  for (const comment of comments) {
    if (
      comment.githubIssueKey &&
      comment.githubIssueUrl &&
      comment.githubIssueStatus === "created" &&
      !seen.has(comment.githubIssueKey)
    ) {
      seen.add(comment.githubIssueKey);
      candidates.push({
        key: comment.githubIssueKey,
        // Strip a #issuecomment fragment so the link points at the issue.
        url: comment.githubIssueUrl.split("#")[0],
        state: comment.githubIssueState,
      });
      break;
    }
  }

  const items = await ctx.db
    .query("githubBroadcastItems")
    .withIndex("by_package", (q) => q.eq("packageId", packageId))
    .order("desc")
    .take(50);
  for (const item of items) {
    if (
      item.status === "sent" &&
      item.issueKey &&
      item.issueUrl &&
      !seen.has(item.issueKey)
    ) {
      seen.add(item.issueKey);
      candidates.push({
        key: item.issueKey,
        url: item.issueUrl,
        state: item.issueState,
      });
      break;
    }
  }
  return candidates;
}

function broadcastIssueBody(
  body: string,
  pkg: { slug?: string; name: string; componentName?: string },
): string {
  return (
    `${body.trim()}\n\n---\n` +
    `Sent to maintainers of components listed in the Convex Components Directory. ` +
    `This repo is linked from the listing for **${displayName(pkg)}**: ${componentLink(pkg)}`
  );
}

// ============ Feature 1: single message mirrored as an issue ============

const issueStateValidator = v.union(v.literal("open"), v.literal("closed"));

type CommentIssueContext = {
  content: string;
  repo: RepoRef | null;
  pkg: { name: string; componentName?: string; slug?: string };
  candidates: Array<{ key: string; url: string; state?: IssueState }>;
};

export const _getCommentIssueContext = internalQuery({
  args: { commentId: v.id("packageComments") },
  returns: v.union(
    v.null(),
    v.object({
      content: v.string(),
      repo: v.union(v.null(), v.object({ owner: v.string(), repo: v.string() })),
      pkg: v.object({
        name: v.string(),
        componentName: v.optional(v.string()),
        slug: v.optional(v.string()),
      }),
      candidates: v.array(
        v.object({
          key: v.string(),
          url: v.string(),
          state: v.optional(issueStateValidator),
        }),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<CommentIssueContext | null> => {
    const comment = await ctx.db.get("packageComments", args.commentId);
    if (!comment) return null;
    const pkg = await ctx.db.get("packages", comment.packageId);
    if (!pkg) return null;
    return {
      content: comment.content,
      repo: parseGitHubRepo(pkg.repositoryUrl),
      pkg: { name: pkg.name, componentName: pkg.componentName, slug: pkg.slug },
      candidates: await findIssueCandidates(ctx, comment.packageId),
    };
  },
});

export const _recordCommentIssueResult = internalMutation({
  args: {
    commentId: v.id("packageComments"),
    status: v.union(v.literal("created"), v.literal("failed")),
    issueUrl: v.optional(v.string()),
    mirrorKind: v.optional(v.union(v.literal("issue"), v.literal("comment"))),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get("packageComments", args.commentId);
    if (!comment) return null;
    const key = issueKeyFromUrl(args.issueUrl) ?? undefined;
    await ctx.db.patch("packageComments", args.commentId, {
      githubIssueStatus: args.status,
      githubIssueUrl: args.issueUrl,
      githubIssueError: args.error,
      githubIssueKey: key,
      githubMirrorKind: args.status === "created" ? args.mirrorKind : undefined,
      githubIssueState: args.status === "created" ? "open" : undefined,
    });
    return null;
  },
});

// Records a fresh open/closed observation on every row that references the
// issue (thread rows and broadcast items) so the checkbox label and pills
// agree. Bounded: one issue rarely has more than a handful of rows.
export const _setIssueState = internalMutation({
  args: { issueKey: v.string(), state: issueStateValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("packageComments")
      .withIndex("by_github_issue_key", (q) =>
        q.eq("githubIssueKey", args.issueKey),
      )
      .take(100);
    const items = await ctx.db
      .query("githubBroadcastItems")
      .withIndex("by_issue_key", (q) => q.eq("issueKey", args.issueKey))
      .take(20);
    await Promise.all([
      ...comments
        .filter((c) => c.githubIssueState !== args.state)
        .map((c) =>
          ctx.db.patch("packageComments", c._id, {
            githubIssueState: args.state,
          }),
        ),
      ...items
        .filter((i) => i.issueState !== args.state)
        .map((i) =>
          ctx.db.patch("githubBroadcastItems", i._id, {
            issueState: args.state,
          }),
        ),
    ]);
    return null;
  },
});

// Scheduled by addPackageComment. If the package already has an open GitHub
// issue (from an earlier message or a broadcast) the message is posted there
// as a comment; otherwise a new issue is opened. Retries once on a GitHub
// rate limit, then records the failure on the comment so the admin sees why.
export const createIssueForComment = internalAction({
  args: {
    commentId: v.id("packageComments"),
    attempt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
    const context: CommentIssueContext | null = await ctx.runQuery(
      internal.githubIssues._getCommentIssueContext,
      { commentId: args.commentId },
    );
    if (!context) return null;

    if (!context.repo) {
      await ctx.runMutation(internal.githubIssues._recordCommentIssueResult, {
        commentId: args.commentId,
        status: "failed",
        error: "Package has no GitHub repository URL",
      });
      return null;
    }

    // Prefer commenting on an open issue. Check live state so a submitter
    // who closed the issue gets a fresh one instead of a comment on a closed
    // thread they may never revisit.
    let openIssue: IssueRef | null = null;
    let previousIssueUrl: string | undefined;
    for (const candidate of context.candidates) {
      const ref = parseIssueKey(candidate.key);
      if (!ref) continue;
      const state = await getGitHubIssueState(ref);
      if (state) {
        await ctx.runMutation(internal.githubIssues._setIssueState, {
          issueKey: candidate.key,
          state,
        });
      }
      if (state === "open") {
        openIssue = ref;
        break;
      }
      previousIssueUrl ??= candidate.url;
    }

    const result = openIssue
      ? await createGitHubIssueComment(
          openIssue,
          followUpCommentBody(context.content),
        )
      : await createGitHubIssue(
          context.repo,
          `Message about ${displayName(context.pkg)} from the Convex Components Directory`.slice(
            0,
            MAX_TITLE_LENGTH,
          ),
          commentIssueBody(context.content, context.pkg, previousIssueUrl),
        );

    if (result.ok) {
      await ctx.runMutation(internal.githubIssues._recordCommentIssueResult, {
        commentId: args.commentId,
        status: "created",
        issueUrl: result.issueUrl,
        mirrorKind: openIssue ? "comment" : "issue",
      });
      return null;
    }

    if (result.kind === "rate_limited" && attempt < 2) {
      console.warn(
        `GitHub issue for comment ${args.commentId} rate limited, retrying in ${result.waitMs}ms`,
      );
      await ctx.scheduler.runAfter(
        result.waitMs,
        internal.githubIssues.createIssueForComment,
        { commentId: args.commentId, attempt: attempt + 1 },
      );
      return null;
    }

    await ctx.runMutation(internal.githubIssues._recordCommentIssueResult, {
      commentId: args.commentId,
      status: "failed",
      error: result.message,
    });
    return null;
  },
});

// ============ Feature 2: broadcast ============

// Shared by the preview count and the start mutation so the two can never
// disagree about who receives the issue. Archived and deletion-marked
// packages are excluded since they are no longer part of the directory.
function matchesFilter(pkg: Doc<"packages">, filter: BroadcastFilter): boolean {
  if (pkg.visibility === "archived" || pkg.markedForDeletion) return false;
  switch (filter) {
    case "approved":
      return pkg.reviewStatus === "approved";
    case "pending":
      return (
        pkg.reviewStatus === undefined ||
        pkg.reviewStatus === "pending" ||
        pkg.reviewStatus === "in_review"
      );
    case "rejected":
      return pkg.reviewStatus === "rejected";
    case "all":
      return true;
  }
}

async function collectBroadcastTargets(
  ctx: QueryCtx | MutationCtx,
  filter: BroadcastFilter,
): Promise<Array<{ pkg: Doc<"packages">; repo: RepoRef | null }>> {
  const packages = await ctx.db.query("packages").take(MAX_PACKAGES);
  return packages
    .filter((pkg) => matchesFilter(pkg, filter))
    .map((pkg) => ({ pkg, repo: parseGitHubRepo(pkg.repositoryUrl) }));
}

// Preview shown next to the filter pills before sending.
export const getBroadcastTargetCount = query({
  args: { statusFilter: broadcastFilterValidator },
  returns: v.object({ eligible: v.number(), missingRepo: v.number() }),
  handler: async (ctx, args) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return { eligible: 0, missingRepo: 0 };
    const targets = await collectBroadcastTargets(ctx, args.statusFilter);
    let eligible = 0;
    let missingRepo = 0;
    for (const target of targets) {
      if (target.repo) eligible += 1;
      else missingRepo += 1;
    }
    return { eligible, missingRepo };
  },
});

export const startGithubBroadcast = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    statusFilter: broadcastFilterValidator,
  },
  returns: v.id("githubBroadcasts"),
  handler: async (ctx, args) => {
    const { email } = await requireAdminIdentity(ctx);
    const title = args.title.trim();
    const body = args.body.trim();
    if (!title) throw new ConvexError("Issue title is required");
    if (!body) throw new ConvexError("Issue message is required");
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ConvexError(`Title must be under ${MAX_TITLE_LENGTH} characters`);
    }
    if (body.length > MAX_BODY_LENGTH) {
      throw new ConvexError(`Message must be under ${MAX_BODY_LENGTH} characters`);
    }

    const targets = await collectBroadcastTargets(ctx, args.statusFilter);
    if (targets.length === 0) {
      throw new ConvexError("No components match that filter");
    }

    const now = Date.now();
    const skipped = targets.filter((t) => t.repo === null).length;
    const broadcastId = await ctx.db.insert("githubBroadcasts", {
      title,
      body,
      statusFilter: args.statusFilter,
      status: "running",
      total: targets.length,
      sent: 0,
      failed: 0,
      skipped,
      createdBy: email,
      createdAt: now,
    });

    for (const target of targets) {
      await ctx.db.insert("githubBroadcastItems", {
        broadcastId,
        packageId: target.pkg._id,
        packageName: displayName(target.pkg),
        repo: target.repo ? `${target.repo.owner}/${target.repo.repo}` : undefined,
        status: target.repo ? "queued" : "skipped",
        attempts: 0,
        error: target.repo ? undefined : "No GitHub repository URL",
        updatedAt: now,
      });
    }

    if (skipped === targets.length) {
      await ctx.db.patch("githubBroadcasts", broadcastId, {
        status: "completed",
        completedAt: now,
      });
      return broadcastId;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.githubIssues.processNextBroadcastItem,
      { broadcastId },
    );
    return broadcastId;
  },
});

export const cancelGithubBroadcast = mutation({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const broadcast = await ctx.db.get("githubBroadcasts", args.broadcastId);
    if (!broadcast || broadcast.status !== "running") return null;
    await ctx.db.patch("githubBroadcasts", args.broadcastId, {
      status: "cancelled",
      completedAt: Date.now(),
    });
    return null;
  },
});

type NextBroadcastItem = {
  status: "running" | "completed" | "cancelled";
  title: string;
  body: string;
  item: {
    _id: Id<"githubBroadcastItems">;
    packageId: Id<"packages">;
    repo?: string;
    attempts: number;
  } | null;
};

export const _getNextBroadcastItem = internalQuery({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("running"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      title: v.string(),
      body: v.string(),
      item: v.union(
        v.null(),
        v.object({
          _id: v.id("githubBroadcastItems"),
          packageId: v.id("packages"),
          repo: v.optional(v.string()),
          attempts: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<NextBroadcastItem | null> => {
    const broadcast = await ctx.db.get("githubBroadcasts", args.broadcastId);
    if (!broadcast) return null;
    const item = await ctx.db
      .query("githubBroadcastItems")
      .withIndex("by_broadcast_and_status", (q) =>
        q.eq("broadcastId", args.broadcastId).eq("status", "queued"),
      )
      .first();
    return {
      status: broadcast.status,
      title: broadcast.title,
      body: broadcast.body,
      item: item
        ? {
            _id: item._id,
            packageId: item.packageId,
            repo: item.repo,
            attempts: item.attempts,
          }
        : null,
    };
  },
});

// Patches the item and the broadcast counters in one transaction and reports
// whether any queued items remain so the worker knows to reschedule.
export const _recordBroadcastItemResult = internalMutation({
  args: {
    itemId: v.id("githubBroadcastItems"),
    outcome: v.union(v.literal("sent"), v.literal("failed"), v.literal("retry")),
    issueUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.object({ remaining: v.boolean() }),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("githubBroadcastItems", args.itemId);
    if (!item) return { remaining: false };
    const now = Date.now();

    if (args.outcome === "retry") {
      await ctx.db.patch("githubBroadcastItems", args.itemId, {
        attempts: item.attempts + 1,
        error: args.error,
        updatedAt: now,
      });
      return { remaining: true };
    }

    await ctx.db.patch("githubBroadcastItems", args.itemId, {
      status: args.outcome,
      attempts: item.attempts + 1,
      issueUrl: args.issueUrl,
      issueKey: issueKeyFromUrl(args.issueUrl) ?? undefined,
      issueState: args.outcome === "sent" ? "open" : undefined,
      error: args.error,
      updatedAt: now,
    });

    const broadcast = await ctx.db.get("githubBroadcasts", item.broadcastId);
    if (!broadcast) return { remaining: false };

    const nextQueued = await ctx.db
      .query("githubBroadcastItems")
      .withIndex("by_broadcast_and_status", (q) =>
        q.eq("broadcastId", item.broadcastId).eq("status", "queued"),
      )
      .first();
    const remaining = nextQueued !== null;

    await ctx.db.patch("githubBroadcasts", item.broadcastId, {
      sent: broadcast.sent + (args.outcome === "sent" ? 1 : 0),
      failed: broadcast.failed + (args.outcome === "failed" ? 1 : 0),
      ...(remaining || broadcast.status !== "running"
        ? {}
        : { status: "completed" as const, completedAt: now }),
    });

    return { remaining };
  },
});

export const _finalizeBroadcast = internalMutation({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const broadcast = await ctx.db.get("githubBroadcasts", args.broadcastId);
    if (!broadcast || broadcast.status !== "running") return null;
    await ctx.db.patch("githubBroadcasts", args.broadcastId, {
      status: "completed",
      completedAt: Date.now(),
    });
    return null;
  },
});

// Sequential worker: one GitHub call per run, then reschedule. Stops when the
// broadcast is cancelled or no queued items remain.
export const processNextBroadcastItem = internalAction({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const next: NextBroadcastItem | null = await ctx.runQuery(
      internal.githubIssues._getNextBroadcastItem,
      { broadcastId: args.broadcastId },
    );
    if (!next || next.status !== "running") return null;
    if (!next.item) {
      await ctx.runMutation(internal.githubIssues._finalizeBroadcast, {
        broadcastId: args.broadcastId,
      });
      return null;
    }

    const item = next.item;
    const [owner, repoName] = (item.repo ?? "").split("/");
    const repo: RepoRef | null =
      owner && repoName ? { owner, repo: repoName } : null;

    // Package is fetched for the body footer (name, slug). If it was deleted
    // mid run, still send without the listing link rather than stall.
    const pkg: Doc<"packages"> | null = await ctx.runQuery(
      internal.packages._getPackage,
      { packageId: item.packageId },
    );
    const pkgInfo = pkg
      ? { name: pkg.name, componentName: pkg.componentName, slug: pkg.slug }
      : { name: repoName ?? "component" };

    let outcome: "sent" | "failed" | "retry";
    let issueUrl: string | undefined;
    let error: string | undefined;
    let retryWaitMs = 0;

    if (!repo) {
      outcome = "failed";
      error = "No GitHub repository URL";
    } else {
      const result = await createGitHubIssue(
        repo,
        next.title,
        broadcastIssueBody(next.body, pkgInfo),
      );
      if (result.ok) {
        outcome = "sent";
        issueUrl = result.issueUrl;
      } else if (
        result.kind === "rate_limited" &&
        item.attempts + 1 < MAX_ATTEMPTS
      ) {
        outcome = "retry";
        error = result.message;
        retryWaitMs = result.waitMs;
      } else {
        outcome = "failed";
        error = result.message;
      }
    }

    const record: { remaining: boolean } = await ctx.runMutation(
      internal.githubIssues._recordBroadcastItemResult,
      { itemId: item._id, outcome, issueUrl, error },
    );

    if (outcome === "retry") {
      console.warn(
        `Broadcast ${args.broadcastId}: rate limited on ${item.repo}, waiting ${retryWaitMs}ms`,
      );
      await ctx.scheduler.runAfter(
        retryWaitMs,
        internal.githubIssues.processNextBroadcastItem,
        { broadcastId: args.broadcastId },
      );
      return null;
    }

    if (record.remaining) {
      await ctx.scheduler.runAfter(
        BROADCAST_STAGGER_MS,
        internal.githubIssues.processNextBroadcastItem,
        { broadcastId: args.broadcastId },
      );
    }
    return null;
  },
});

// ============ Admin read queries ============

const broadcastValidator = v.object({
  _id: v.id("githubBroadcasts"),
  _creationTime: v.number(),
  title: v.string(),
  body: v.string(),
  statusFilter: broadcastFilterValidator,
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("cancelled"),
  ),
  total: v.number(),
  sent: v.number(),
  failed: v.number(),
  skipped: v.number(),
  createdBy: v.string(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
  replies: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
});

const HISTORY_LIMIT = 25;

export const listGithubBroadcasts = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(broadcastValidator),
  handler: async (ctx, args) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return [];
    // Read a little past the limit so hiding archived rows still fills the list.
    const recent = await ctx.db
      .query("githubBroadcasts")
      .withIndex("by_created")
      .order("desc")
      .take(args.includeArchived ? HISTORY_LIMIT : HISTORY_LIMIT * 3);
    const visible = args.includeArchived
      ? recent
      : recent.filter((b) => b.archivedAt === undefined);
    return visible.slice(0, HISTORY_LIMIT);
  },
});

// Stored view of the package's current GitHub issue, used for the checkbox
// label in the admin thread. No network call; the action re-checks live state
// when it actually sends.
export const getOpenIssueForPackage = query({
  args: { packageId: v.id("packages") },
  returns: v.union(
    v.null(),
    v.object({
      issueKey: v.string(),
      issueUrl: v.string(),
      state: v.union(issueStateValidator, v.literal("unknown")),
    }),
  ),
  handler: async (ctx, args) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return null;
    const candidates = await findIssueCandidates(ctx, args.packageId);
    // Same preference order as the action: first open, else the newest.
    const open = candidates.find((c) => c.state === "open");
    const pick = open ?? candidates[0];
    if (!pick) return null;
    const state: IssueState | "unknown" = pick.state ?? "unknown";
    return { issueKey: pick.key, issueUrl: pick.url, state };
  },
});

// One off: rows created before issueKey existed get keys from their URLs.
// Run from the dashboard; safe to repeat.
export const backfillGithubIssueKeys = internalMutation({
  args: {},
  returns: v.object({ comments: v.number(), items: v.number() }),
  handler: async (ctx) => {
    const comments = await ctx.db.query("packageComments").take(5000);
    const items = await ctx.db.query("githubBroadcastItems").take(5000);
    const commentPatches = comments
      .filter(
        (c) =>
          c.githubIssueStatus === "created" &&
          c.githubIssueUrl &&
          !c.githubIssueKey,
      )
      .map((c) =>
        ctx.db.patch("packageComments", c._id, {
          githubIssueKey: issueKeyFromUrl(c.githubIssueUrl) ?? undefined,
          githubMirrorKind: c.githubMirrorKind ?? "issue",
        }),
      );
    const itemPatches = items
      .filter((i) => i.status === "sent" && i.issueUrl && !i.issueKey)
      .map((i) =>
        ctx.db.patch("githubBroadcastItems", i._id, {
          issueKey: issueKeyFromUrl(i.issueUrl) ?? undefined,
        }),
      );
    await Promise.all([...commentPatches, ...itemPatches]);
    return { comments: commentPatches.length, items: itemPatches.length };
  },
});

// ============ Broadcast lifecycle: archive, restore, delete ============

const DELETE_BATCH = 500;

export const archiveGithubBroadcast = mutation({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const broadcast = await ctx.db.get("githubBroadcasts", args.broadcastId);
    if (!broadcast || broadcast.archivedAt !== undefined) return null;
    if (broadcast.status === "running") {
      throw new ConvexError("Cancel the broadcast before archiving it");
    }
    await ctx.db.patch("githubBroadcasts", args.broadcastId, {
      archivedAt: Date.now(),
    });
    return null;
  },
});

export const restoreGithubBroadcast = mutation({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const broadcast = await ctx.db.get("githubBroadcasts", args.broadcastId);
    if (!broadcast || broadcast.archivedAt === undefined) return null;
    await ctx.db.patch("githubBroadcasts", args.broadcastId, {
      archivedAt: undefined,
    });
    return null;
  },
});

// Removes the broadcast row now and its items in the background. Mirrored
// GitHub replies stay in the package threads; they just lose the pointer to
// the deleted broadcast. Issues already on GitHub are untouched.
export const deleteGithubBroadcast = mutation({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx);
    const broadcast = await ctx.db.get("githubBroadcasts", args.broadcastId);
    if (!broadcast) return null;
    if (broadcast.status === "running") {
      throw new ConvexError("Cancel the broadcast before deleting it");
    }
    await ctx.db.delete("githubBroadcasts", args.broadcastId);
    await ctx.scheduler.runAfter(
      0,
      internal.githubIssues._deleteBroadcastItemsBatch,
      { broadcastId: args.broadcastId },
    );
    return null;
  },
});

export const _deleteBroadcastItemsBatch = internalMutation({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("githubBroadcastItems")
      .withIndex("by_broadcast", (q) => q.eq("broadcastId", args.broadcastId))
      .take(DELETE_BATCH);
    const replies = await ctx.db
      .query("packageComments")
      .withIndex("by_github_broadcast", (q) =>
        q.eq("githubBroadcastId", args.broadcastId),
      )
      .take(DELETE_BATCH);
    await Promise.all([
      ...items.map((item) => ctx.db.delete("githubBroadcastItems", item._id)),
      ...replies.map((reply) =>
        ctx.db.patch("packageComments", reply._id, {
          githubBroadcastId: undefined,
        }),
      ),
    ]);
    if (items.length === DELETE_BATCH || replies.length === DELETE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.githubIssues._deleteBroadcastItemsBatch,
        { broadcastId: args.broadcastId },
      );
    }
    return null;
  },
});

export const getBroadcastItems = query({
  args: { broadcastId: v.id("githubBroadcasts") },
  returns: v.array(
    v.object({
      _id: v.id("githubBroadcastItems"),
      _creationTime: v.number(),
      broadcastId: v.id("githubBroadcasts"),
      packageId: v.id("packages"),
      packageName: v.string(),
      repo: v.optional(v.string()),
      status: v.union(
        v.literal("queued"),
        v.literal("sent"),
        v.literal("failed"),
        v.literal("skipped"),
      ),
      attempts: v.number(),
      issueUrl: v.optional(v.string()),
      issueKey: v.optional(v.string()),
      issueState: v.optional(issueStateValidator),
      replyCount: v.optional(v.number()),
      error: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const admin = await getAdminIdentity(ctx);
    if (!admin) return [];
    return await ctx.db
      .query("githubBroadcastItems")
      .withIndex("by_broadcast", (q) => q.eq("broadcastId", args.broadcastId))
      .take(MAX_PACKAGES);
  },
});
