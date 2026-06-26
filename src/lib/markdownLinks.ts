// Resolves links and image sources inside rendered README markdown against the
// source GitHub repository. Handles plain repo URLs as well as monorepo
// subdirectory URLs (e.g. ".../tree/main/packages/convex"), so relative links
// like "../../examples/foo" climb from the README's actual location instead of
// resolving against the app origin (which 404s).

interface GitHubRepoRef {
  owner: string;
  repo: string;
  /** Git ref (branch/tag/sha). Defaults to "HEAD" so it works for main/master. */
  ref: string;
  /** Repo-relative directory the README lives in ("" for repo root). */
  dir: string;
}

/** Parse owner/repo plus optional tree/blob ref + subdirectory from a GitHub URL. */
function parseGitHubRepo(repositoryUrl?: string): GitHubRepoRef | undefined {
  if (!repositoryUrl) return undefined;
  const ownerRepo = repositoryUrl.match(/github\.com[/:]([^/]+)\/([^/?#]+)/i);
  if (!ownerRepo) return undefined;

  const owner = ownerRepo[1];
  const repo = ownerRepo[2].replace(/\.git$/i, "");

  let ref = "HEAD";
  let dir = "";
  const treeOrBlob = repositoryUrl.match(
    /\/(?:tree|blob)\/([^/?#]+)((?:\/[^?#]*)?)/i,
  );
  if (treeOrBlob) {
    ref = treeOrBlob[1];
    dir = (treeOrBlob[2] || "").replace(/^\/+/, "").replace(/\/+$/, "");
  }

  return { owner, repo, ref, dir };
}

/**
 * Resolve a relative/root-relative target to a repo-relative path (incl. any
 * query/hash), anchored at the README's directory. Uses a dummy origin so URL
 * semantics handle "./", "../", and leading "/" the same way GitHub does.
 */
function resolveWithinRepo(target: string, dir: string): string {
  const base = `https://example.invalid/${dir ? `${dir}/` : ""}`;
  const url = new URL(target.replace(/^\.\//, ""), base);
  const path = url.pathname.replace(/^\/+/, "");
  return `${path}${url.search}${url.hash}`;
}

/** Hrefs that are already meaningful as-is and must never be rewritten. */
function isAbsoluteOrAnchor(value: string): boolean {
  return (
    value.startsWith("#") ||
    value.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
  );
}

export function resolveRepositoryMarkdownHref(
  href?: string,
  repositoryUrl?: string,
): string | undefined {
  if (!href) return href;
  if (isAbsoluteOrAnchor(href)) return href;

  const repo = parseGitHubRepo(repositoryUrl);
  if (!repo) return href;

  try {
    const path = resolveWithinRepo(href, repo.dir);
    // GitHub serves files via /blob and 301-redirects directories to /tree,
    // so /blob works for both.
    return `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.ref}/${path}`;
  } catch {
    return href;
  }
}

export function resolveRepositoryImageSrc(
  src?: string,
  repositoryUrl?: string,
): string | undefined {
  if (!src) return src;
  if (isAbsoluteOrAnchor(src)) return src;

  const repo = parseGitHubRepo(repositoryUrl);
  if (!repo) return src;

  try {
    const path = resolveWithinRepo(src, repo.dir);
    return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.ref}/${path}`;
  } catch {
    return src;
  }
}
