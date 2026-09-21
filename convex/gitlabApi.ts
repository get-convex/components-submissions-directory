import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { parseRepoUrl, type ParsedRepoUrl } from "../shared/repoUrl";

// GitLab REST v4 read helpers. Public projects need no token. An optional
// GITLAB_TOKEN (read_api scope) only raises the rate limit. Every helper here
// mirrors the shape of the GitHub equivalents so callers can dispatch on
// provider without changing their own return types.

export const GITLAB_API = "https://gitlab.com/api/v4";

const USER_AGENT = "convex-components-directory (+https://www.convex.dev/components)";

export function gitlabToken(): string | undefined {
  const token = process.env.GITLAB_TOKEN?.trim();
  return token ? token : undefined;
}

/** URL-encoded project id ("group%2Fsubgroup%2Fproject"). */
export function gitlabProjectId(parsed: ParsedRepoUrl): string {
  return encodeURIComponent(parsed.projectPath);
}

function encodeFilePath(path: string): string {
  return encodeURIComponent(path.replace(/^\/+/, ""));
}

// Retries once without the token when GitLab rejects it (401), matching the
// GitHub fetchers so a stale token never turns a public repo into "not found".
async function gitlabFetch(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (token) headers["PRIVATE-TOKEN"] = token;
  let response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (response.status === 401 && token) {
    console.warn(
      "GitLab token rejected with 401. Retrying without authentication. Update GITLAB_TOKEN in Convex environment variables."
    );
    delete headers["PRIVATE-TOKEN"];
    response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  }
  if (response.status === 429) {
    throw new Error("GitLab API rate limit reached. Set GITLAB_TOKEN to raise the limit and retry.");
  }
  return response;
}

/** Raw file contents at a path, or null when missing. ref=HEAD is the default branch. */
export async function fetchGitLabFile(
  parsed: ParsedRepoUrl,
  path: string,
  ref: string = parsed.ref ?? "HEAD",
  token: string | undefined = gitlabToken()
): Promise<string | null> {
  const url = `${GITLAB_API}/projects/${gitlabProjectId(parsed)}/repository/files/${encodeFilePath(path)}/raw?ref=${encodeURIComponent(ref)}`;
  const response = await gitlabFetch(url, token);
  if (!response.ok) return null;
  return await response.text();
}

export type GitLabTreeEntry = {
  name: string;
  path: string;
  type: "tree" | "blob";
};

/** Directory listing. Missing paths return an empty array (GitLab 17.7+ sends 404). */
export async function fetchGitLabTree(
  parsed: ParsedRepoUrl,
  path: string,
  ref: string = parsed.ref ?? "HEAD",
  token: string | undefined = gitlabToken()
): Promise<GitLabTreeEntry[]> {
  const params = new URLSearchParams({ ref, per_page: "100" });
  if (path) params.set("path", path);
  const url = `${GITLAB_API}/projects/${gitlabProjectId(parsed)}/repository/tree?${params.toString()}`;
  const response = await gitlabFetch(url, token);
  if (!response.ok) return [];
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is { name: string; path: string; type: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { path?: unknown }).path === "string" &&
        typeof (item as { type?: unknown }).type === "string"
    )
    .map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "tree" ? ("tree" as const) : ("blob" as const),
    }));
}

// Same shape as githubIssueValidator in packages.ts so the detail page issues
// tab renders either provider without changes.
export type RepoIssue = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  user?: string;
  labels: string[];
  comments: number;
};

export async function fetchGitLabIssues(
  parsed: ParsedRepoUrl,
  state: "open" | "closed",
  page: number,
  token: string | undefined = gitlabToken()
): Promise<{ issues: RepoIssue[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    state: state === "open" ? "opened" : "closed",
    per_page: "25",
    page: String(page),
    order_by: "created_at",
    sort: "desc",
  });
  const url = `${GITLAB_API}/projects/${gitlabProjectId(parsed)}/issues?${params.toString()}`;
  const response = await gitlabFetch(url, token);
  if (!response.ok) {
    console.error(`GitLab API error: ${response.status} ${response.statusText}`);
    return { issues: [], hasMore: false };
  }
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) return { issues: [], hasMore: false };

  // GitLab keeps merge requests on a separate endpoint, so no PR filtering.
  const issues: RepoIssue[] = data.map((item: any) => ({
    number: Number(item.iid ?? item.id ?? 0),
    title: String(item.title ?? ""),
    state: item.state === "opened" ? "open" : String(item.state ?? "closed"),
    html_url: String(item.web_url ?? ""),
    created_at: String(item.created_at ?? ""),
    user: typeof item.author?.username === "string" ? item.author.username : undefined,
    labels: Array.isArray(item.labels)
      ? item.labels.map((label: unknown) =>
          typeof label === "string" ? label : String((label as { name?: string })?.name ?? "")
        )
      : [],
    comments: Number(item.user_notes_count ?? 0),
  }));

  const nextPage = response.headers.get("x-next-page");
  const hasMore = nextPage ? nextPage.trim() !== "" : issues.length === 25;
  return { issues, hasMore };
}

type GitLabProject = {
  avatar_url?: string | null;
  namespace?: { avatar_url?: string | null } | null;
};

async function fetchGitLabProject(
  parsed: ParsedRepoUrl,
  token: string | undefined
): Promise<GitLabProject | null> {
  const url = `${GITLAB_API}/projects/${gitlabProjectId(parsed)}`;
  const response = await gitlabFetch(url, token);
  if (!response.ok) return null;
  return (await response.json()) as GitLabProject;
}

// Both counts read the x-total header of a one item page. The project record's
// open_issues_count is omitted for unauthenticated callers on gitlab.com, and
// issues_statistics needs auth, so the header is the only reliable public source.
async function fetchIssueTotal(
  parsed: ParsedRepoUrl,
  state: "opened" | "closed",
  token: string | undefined
): Promise<number> {
  const url = `${GITLAB_API}/projects/${gitlabProjectId(parsed)}/issues?state=${state}&per_page=1`;
  const response = await gitlabFetch(url, token);
  if (!response.ok) return 0;
  const total = Number(response.headers.get("x-total") ?? 0);
  return Number.isFinite(total) ? total : 0;
}

export async function fetchGitLabIssueCounts(
  parsed: ParsedRepoUrl,
  token: string | undefined = gitlabToken()
): Promise<{ openCount: number; closedCount: number }> {
  const [openCount, closedCount] = await Promise.all([
    fetchIssueTotal(parsed, "opened", token),
    fetchIssueTotal(parsed, "closed", token),
  ]);
  return { openCount, closedCount };
}

// GitLab has no github.com/{user}.png equivalent. The project record carries
// the namespace avatar for both user and group namespaces. Group avatars come
// back as relative "/uploads/..." paths, so those are resolved against the host.
export async function fetchGitLabNamespaceAvatar(
  parsed: ParsedRepoUrl,
  token: string | undefined = gitlabToken()
): Promise<string | null> {
  const project = await fetchGitLabProject(parsed, token);
  const candidate = project?.namespace?.avatar_url ?? project?.avatar_url ?? null;
  if (!candidate) return null;
  if (/^https?:\/\//.test(candidate)) return candidate;
  if (candidate.startsWith("/")) return `https://${parsed.host}${candidate}`;
  return null;
}

// Mutations cannot fetch, so submit and admin auto-fill schedule this action
// to backfill the avatar after the package row exists.
export const fillGitLabAuthorAvatar = internalAction({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pkg = await ctx.runQuery(internal.packages._getPackage, {
      packageId: args.packageId,
    });
    if (!pkg?.repositoryUrl) return null;
    const parsed = parseRepoUrl(pkg.repositoryUrl);
    if (!parsed || parsed.provider !== "gitlab") return null;
    const avatar = await fetchGitLabNamespaceAvatar(parsed);
    if (!avatar) return null;
    await ctx.runMutation(internal.gitlabApi._setAuthorAvatar, {
      packageId: args.packageId,
      authorAvatar: avatar,
    });
    return null;
  },
});

export const _setAuthorAvatar = internalMutation({
  args: { packageId: v.id("packages"), authorAvatar: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("packages", args.packageId, { authorAvatar: args.authorAvatar });
    return null;
  },
});
