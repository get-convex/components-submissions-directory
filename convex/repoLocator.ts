import { ConvexError } from "convex/values";
import { parseRepoUrl, type ParsedRepoUrl } from "../shared/repoUrl";
import { fetchGitLabDefaultBranch, fetchGitLabFile, fetchGitLabRecursiveTree } from "./gitlabApi";

// Finds the Convex component inside a GitHub or GitLab repo from one recursive
// tree listing. Honors the branch and folder in /tree and /blob URLs, groups
// component configs by package root, and returns a specific problem with fix
// URLs when it can't pick exactly one. Shared by the preflight check and the
// admin AI review. Plain helpers only, so any runtime can import it.

export type RepoConfigKind = "component" | "app" | "unknown";

export type LocatorProblemCode =
  | "repo_not_found"
  | "branch_not_found"
  | "multiple_components"
  | "dir_has_no_component";

export type LocatorSuggestion = { label: string; url: string };

export type LocatorProblem = {
  code: LocatorProblemCode;
  message: string;
  suggestions: LocatorSuggestion[];
};

export type LocateResult =
  | { kind: "problem"; problem: LocatorProblem }
  | { kind: "no_config"; ref: string; hint: string }
  | { kind: "app_only"; ref: string; hint: string; foundConfigPaths: string[] }
  | {
      kind: "located";
      ref: string;
      /** Folder holding the component convex.config.ts ("root" for the repo root). */
      componentSourceDir: string;
      files: Array<{ name: string; content: string }>;
      foundConfigPaths: string[];
      /** Package folder URL, set when the component lives in a subfolder the URL didn't point at. */
      suggestedRepoUrl?: string;
    };

const MAX_CONFIGS_TO_CLASSIFY = 20;
// The legacy fetcher had no cap (largest approved component reads 55 files);
// this only guards against runaway prompts. Tests sort last so they drop first.
const MAX_FILES = 100;
const MAX_SUGGESTIONS = 6;
const MAX_REF_SEGMENTS = 5;
const FETCH_CONCURRENCY = 8;

const SKIPPED_SEGMENTS = new Set(["node_modules", "dist", "build", "_generated"]);
const EXAMPLE_SEGMENT = /^(examples?|example-.+|demos?|fixtures?|tests?|__tests__)$/;

// Same client and test entry points the legacy fetcher read, relative to the package root
const PACKAGE_FILE_CANDIDATES = [
  "package.json",
  "src/client/index.ts",
  "src/client/index.tsx",
  "src/client.ts",
  "src/client.tsx",
  "src/react.ts",
  "src/react.tsx",
  "src/index.ts",
  "src/index.tsx",
  "src/test.ts",
  "src/test.tsx",
  "test.ts",
  "test.tsx",
];

export function classifyConvexConfig(content: string): RepoConfigKind {
  if (/defineComponent\s*\(/.test(content)) return "component";
  if (/defineApp\s*\(/.test(content)) return "app";
  return "unknown";
}

function dirOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function isUnder(path: string, dir: string): boolean {
  return dir === "" || path === dir || path.startsWith(`${dir}/`);
}

function depth(dir: string): number {
  return dir === "" ? 0 : dir.split("/").length;
}

// Ranks config folders in the order the legacy fetcher probed them, so a
// single-package repo reviews the same folder it always did.
function legacyRank(configDir: string): number {
  if (/^packages\/[^/]+\/src\/component$/.test(configDir)) return 0;
  if (/^packages\/[^/]+$/.test(configDir)) return 1;
  if (/^packages\/[^/]+\/component$/.test(configDir)) return 2;
  const fixed = ["convex/src/component", "convex/component", "convex", "src/component", "src", ""];
  const index = fixed.indexOf(configDir);
  if (index !== -1) return 3 + index;
  if (configDir === "lib") return 10;
  return 100 + depth(configDir);
}

function byLegacyRank(a: string, b: string): number {
  return legacyRank(a) - legacyRank(b) || a.localeCompare(b);
}

// Legacy lookup order for the component source files next to a config
function componentDirCandidates(configDir: string): string[] {
  if (configDir === "convex") return ["convex/src/component", "convex/component", "convex"];
  if (configDir === "src") return ["src/component", "src"];
  if (configDir === "") return ["component", ""];
  return [configDir];
}

function encodeSegments(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** Browser URL for a folder at a ref, used for clickable suggestions. */
export function repoTreeUrl(parsed: ParsedRepoUrl, ref: string, dir: string): string {
  const marker = parsed.provider === "github" ? "tree" : "-/tree";
  const tail = dir ? `/${encodeSegments(dir)}` : "";
  return `${parsed.webUrl}/${marker}/${encodeSegments(ref)}${tail}`;
}

// Runs async work over a list with bounded parallelism
async function mapLimited<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Provider access: default branch, recursive tree, and raw file reads
type RepoAccess = {
  defaultBranch(): Promise<string | null>;
  tree(ref: string): Promise<string[] | null>;
  file(ref: string, path: string): Promise<string | null>;
};

function githubAccess(parsed: ParsedRepoUrl, githubToken?: string): RepoAccess {
  // An expired or revoked token makes GitHub return 401 even for public repos,
  // so fall back to unauthenticated requests instead of reporting "not found".
  let useToken = Boolean(githubToken);

  async function githubFetch(url: string, accept = "application/vnd.github.v3+json"): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: accept,
      "User-Agent": "Convex-NPM-Directory",
    };
    if (githubToken && useToken) headers["Authorization"] = `Bearer ${githubToken}`;
    let response = await fetch(url, { headers });
    if (response.status === 401 && githubToken && useToken) {
      console.warn(
        "GitHub token rejected with 401 (expired or revoked). Retrying without authentication. Update GITHUB_TOKEN in Convex environment variables."
      );
      useToken = false;
      delete headers["Authorization"];
      response = await fetch(url, { headers });
    }
    if (response.status === 403 || response.status === 429) {
      throw new ConvexError(
        "GitHub API rate limit reached or access forbidden while fetching repository contents. Check the GITHUB_TOKEN environment variable and retry."
      );
    }
    return response;
  }

  const api = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  return {
    async defaultBranch() {
      const response = await githubFetch(api);
      if (!response.ok) return null;
      const data = (await response.json()) as { default_branch?: string };
      return data.default_branch || "HEAD";
    },
    async tree(ref) {
      const response = await githubFetch(`${api}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
      if (!response.ok) return null;
      const data = (await response.json()) as {
        tree?: Array<{ path?: string; type?: string }>;
        truncated?: boolean;
      };
      if (data.truncated) {
        console.warn(`GitHub tree for ${parsed.projectPath}@${ref} was truncated; using the partial listing`);
      }
      return (data.tree ?? [])
        .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
        .map((entry) => entry.path as string);
    },
    // Paths come from the tree, so they exist. Raw reads skip the API quota;
    // the Contents API fallback covers private repos the raw host refuses.
    async file(ref, path) {
      const raw = await githubFetch(
        `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeSegments(ref)}/${encodeSegments(path)}`,
        "*/*"
      );
      if (raw.ok) return await raw.text();
      const response = await githubFetch(
        `${api}/contents/${encodeSegments(path)}?ref=${encodeURIComponent(ref)}`,
        "application/vnd.github.raw+json"
      );
      if (!response.ok) return null;
      return await response.text();
    },
  };
}

function gitlabAccess(parsed: ParsedRepoUrl): RepoAccess {
  return {
    defaultBranch: () => fetchGitLabDefaultBranch(parsed),
    tree: (ref) => fetchGitLabRecursiveTree(parsed, ref),
    file: (ref, path) => fetchGitLabFile(parsed, path, ref),
  };
}

// Resolve the URL ref and dir. Branch names with slashes get split across ref
// and dir by the URL parser, so retry with more segments joined into the ref.
async function resolveRefAndTree(
  access: RepoAccess,
  parsed: ParsedRepoUrl,
  defaultBranch: string
): Promise<{ ref: string; dir: string; paths: string[] } | null> {
  if (!parsed.ref) {
    const paths = await access.tree(defaultBranch);
    return paths ? { ref: defaultBranch, dir: parsed.dir, paths } : null;
  }
  const segments = [parsed.ref, ...parsed.dir.split("/").filter(Boolean)];
  for (let count = 1; count <= Math.min(segments.length, MAX_REF_SEGMENTS); count++) {
    const ref = segments.slice(0, count).join("/");
    const paths = await access.tree(ref);
    if (paths) return { ref, dir: segments.slice(count).join("/"), paths };
  }
  return null;
}

function isSkipped(path: string): boolean {
  return path.split("/").some((segment) => SKIPPED_SEGMENTS.has(segment) || segment.startsWith("."));
}

function isExampleLike(configDir: string): boolean {
  return configDir.split("/").some((segment) => EXAMPLE_SEGMENT.test(segment));
}

// Nearest folder at or above configDir that has a package.json
function packageRootOf(configDir: string, packageJsonDirs: Set<string>): string {
  let current = configDir;
  while (true) {
    if (packageJsonDirs.has(current)) return current;
    if (current === "") return "";
    current = dirOf(current);
  }
}

function readPackageName(content: string | null): string | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

function locationLabel(root: string, name?: string): string {
  const where = root || "repo root";
  return name ? `${name} (${where})` : where;
}

export type LocateOptions = {
  /** npm package name, used to pick between several packages in a monorepo. */
  packageName?: string;
  githubToken?: string;
};

export async function locateComponent(repoUrl: string, options: LocateOptions = {}): Promise<LocateResult> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    throw new ConvexError(
      `Invalid repository URL: ${repoUrl}. Expected https://github.com/owner/repo or https://gitlab.com/owner/repo`
    );
  }
  const access = parsed.provider === "github" ? githubAccess(parsed, options.githubToken) : gitlabAccess(parsed);

  const defaultBranch = await access.defaultBranch();
  if (!defaultBranch) {
    return {
      kind: "problem",
      problem: {
        code: "repo_not_found",
        message: `We couldn't find ${parsed.projectPath}. Check the URL and make sure the repository is public.`,
        suggestions: [],
      },
    };
  }

  const resolved = await resolveRefAndTree(access, parsed, defaultBranch);
  if (!resolved) {
    const suggestions: LocatorSuggestion[] = [];
    if (parsed.dir) {
      suggestions.push({
        label: `${parsed.dir} on ${defaultBranch}`,
        url: repoTreeUrl(parsed, defaultBranch, parsed.dir),
      });
    }
    suggestions.push({ label: `Repo root on ${defaultBranch}`, url: parsed.webUrl });
    return {
      kind: "problem",
      problem: {
        code: "branch_not_found",
        message: `Branch "${parsed.ref}" was not found in ${parsed.projectPath}. The default branch is ${defaultBranch}.`,
        suggestions,
      },
    };
  }

  const { ref, dir, paths } = resolved;
  const visiblePaths = paths.filter((path) => !isSkipped(path));
  const pathSet = new Set(visiblePaths);
  const packageJsonDirs = new Set(
    visiblePaths.filter((path) => path === "package.json" || path.endsWith("/package.json")).map(dirOf)
  );

  // Classify convex.config.ts files, in-scope ones first so they always get read
  const configPaths = visiblePaths
    .filter((path) => path === "convex.config.ts" || path.endsWith("/convex.config.ts"))
    .sort((a, b) => {
      const scopeA = isUnder(dirOf(a), dir) ? 0 : 1;
      const scopeB = isUnder(dirOf(b), dir) ? 0 : 1;
      return scopeA - scopeB || byLegacyRank(dirOf(a), dirOf(b));
    });

  const configContents = new Map<string, string>();
  const configs = (
    await mapLimited(configPaths.slice(0, MAX_CONFIGS_TO_CLASSIFY), FETCH_CONCURRENCY, async (path) => {
      const content = await access.file(ref, path);
      if (content === null) return null;
      configContents.set(path, content);
      return { path, dir: dirOf(path), kind: classifyConvexConfig(content) };
    })
  ).filter((config): config is { path: string; dir: string; kind: RepoConfigKind } => config !== null);

  const foundConfigPaths = configs.map((config) => config.path).sort(byLegacyRank);
  const allComponents = configs.filter((config) => config.kind === "component");

  const folderHint = `If the component lives in a subfolder or on another branch, paste that folder URL, for example ${repoTreeUrl(parsed, ref, "packages/your-component")}.`;

  if (allComponents.length === 0) {
    if (configs.length === 0) {
      return { kind: "no_config", ref, hint: folderHint };
    }
    return { kind: "app_only", ref, hint: folderHint, foundConfigPaths };
  }

  // Scope to the URL folder: configs under it, else the deepest one above it
  let candidates = allComponents;
  if (dir) {
    const under = allComponents.filter((config) => isUnder(config.dir, dir));
    const above = allComponents
      .filter((config) => config.dir !== dir && isUnder(dir, config.dir))
      .sort((a, b) => depth(b.dir) - depth(a.dir));
    candidates = under.length > 0 ? under : above.slice(0, 1);
  }

  if (candidates.length === 0) {
    const roots = Array.from(new Set(allComponents.map((config) => packageRootOf(config.dir, packageJsonDirs))));
    const folderExists = visiblePaths.some((path) => isUnder(path, dir) && path !== dir);
    return {
      kind: "problem",
      problem: {
        code: "dir_has_no_component",
        message: folderExists
          ? `No Convex component was found in "${dir}" on ${ref}.`
          : `The folder "${dir}" was not found on ${ref}.`,
        suggestions: roots
          .sort(byLegacyRank)
          .slice(0, MAX_SUGGESTIONS)
          .map((root) => ({ label: locationLabel(root), url: repoTreeUrl(parsed, ref, root) })),
      },
    };
  }

  // Example apps sometimes ship their own local components; ignore them when a real one exists
  const nonExample = candidates.filter((config) => !isExampleLike(config.dir));
  if (nonExample.length > 0) candidates = nonExample;

  const byRoot = new Map<string, typeof candidates>();
  for (const config of candidates) {
    const root = packageRootOf(config.dir, packageJsonDirs);
    byRoot.set(root, [...(byRoot.get(root) ?? []), config]);
  }

  let chosenRoot: string | undefined;
  if (byRoot.size === 1) {
    chosenRoot = Array.from(byRoot.keys())[0];
  } else {
    const roots = Array.from(byRoot.keys()).sort(byLegacyRank);
    const names = await mapLimited(roots, FETCH_CONCURRENCY, async (root) =>
      readPackageName(await access.file(ref, root ? `${root}/package.json` : "package.json"))
    );
    const wanted = options.packageName?.trim().toLowerCase();
    const matchIndex = wanted ? names.findIndex((name) => name?.toLowerCase() === wanted) : -1;
    if (matchIndex === -1) {
      return {
        kind: "problem",
        problem: {
          code: "multiple_components",
          message: `This repository has ${roots.length} Convex components. Pick the one you want checked.`,
          suggestions: roots.slice(0, MAX_SUGGESTIONS).map((root, index) => ({
            label: locationLabel(root, names[index]),
            url: repoTreeUrl(parsed, ref, root),
          })),
        },
      };
    }
    chosenRoot = roots[matchIndex];
  }

  const rootConfigs = byRoot.get(chosenRoot) ?? [];
  const chosen = [...rootConfigs].sort((a, b) => byLegacyRank(a.dir, b.dir))[0];
  const files = await gatherFiles(access, ref, chosen, chosenRoot, pathSet, configs, configContents);

  return {
    kind: "located",
    ref,
    componentSourceDir: chosen.dir || "root",
    files,
    foundConfigPaths,
    // README, links and badges resolve from the URL folder, so point at the package itself
    suggestedRepoUrl: chosenRoot && chosenRoot !== dir ? repoTreeUrl(parsed, ref, chosenRoot) : undefined,
  };
}

// Config files in the package, package entry points, then the component source files
async function gatherFiles(
  access: RepoAccess,
  ref: string,
  chosen: { path: string; dir: string },
  packageRoot: string,
  pathSet: Set<string>,
  configs: Array<{ path: string; dir: string }>,
  configContents: Map<string, string>
): Promise<Array<{ name: string; content: string }>> {
  const files: Array<{ name: string; content: string }> = [];
  const seen = new Set<string>();

  const relatedConfigs = [chosen, ...configs.filter((config) => config.path !== chosen.path && isUnder(config.dir, packageRoot))];
  for (const config of relatedConfigs) {
    const content = configContents.get(config.path);
    if (content !== undefined && !seen.has(config.path)) {
      seen.add(config.path);
      files.push({ name: config.path, content });
    }
  }

  const prefix = packageRoot ? `${packageRoot}/` : "";
  const packageFiles = PACKAGE_FILE_CANDIDATES.map((name) => `${prefix}${name}`).filter((path) => pathSet.has(path));

  let sourceFiles: string[] = [];
  for (const candidateDir of componentDirCandidates(chosen.dir)) {
    const direct = Array.from(pathSet).filter(
      (path) => dirOf(path) === candidateDir && path.endsWith(".ts") && !path.endsWith("/convex.config.ts") && path !== "convex.config.ts"
    );
    if (direct.length > 0) {
      const isTest = (path: string) => /\.(test|spec)\.ts$/.test(path);
      sourceFiles = direct.sort((a, b) => Number(isTest(a)) - Number(isTest(b)) || a.localeCompare(b));
      break;
    }
  }

  const toFetch = [...packageFiles, ...sourceFiles]
    .filter((path) => !seen.has(path))
    .slice(0, Math.max(0, MAX_FILES - files.length));
  const contents = await mapLimited(toFetch, FETCH_CONCURRENCY, (path) => access.file(ref, path));
  toFetch.forEach((path, index) => {
    const content = contents[index];
    if (content !== null && !seen.has(path)) {
      seen.add(path);
      files.push({ name: path, content });
    }
  });
  return files;
}
