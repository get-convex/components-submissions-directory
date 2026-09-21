// Resolves links and image sources inside rendered README markdown against the
// source repository (GitHub or GitLab). Handles plain repo URLs as well as
// monorepo subdirectory URLs (e.g. ".../tree/main/packages/convex" or
// ".../-/tree/main/packages/convex"), so relative links like
// "../../examples/foo" climb from the README's actual location instead of
// resolving against the app origin (which 404s).

import { parseRepoUrl, repoBlobUrl, repoRawUrl } from "../../shared/repoUrl";

/**
 * Resolve a relative/root-relative target to a repo-relative path (incl. any
 * query/hash), anchored at the README's directory. Uses a dummy origin so URL
 * semantics handle "./", "../", and leading "/" the same way the hosts do.
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

  const repo = parseRepoUrl(repositoryUrl);
  if (!repo) return href;

  try {
    // Split query/hash off so path segments alone get URL-encoded.
    const resolved = resolveWithinRepo(href, repo.dir);
    const suffixIndex = resolved.search(/[?#]/);
    const path = suffixIndex === -1 ? resolved : resolved.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : resolved.slice(suffixIndex);
    return `${repoBlobUrl(repo, path)}${suffix}`;
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

  const repo = parseRepoUrl(repositoryUrl);
  if (!repo) return src;

  try {
    const resolved = resolveWithinRepo(src, repo.dir);
    const suffixIndex = resolved.search(/[?#]/);
    const path = suffixIndex === -1 ? resolved : resolved.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : resolved.slice(suffixIndex);
    return `${repoRawUrl(repo, path)}${suffix}`;
  } catch {
    return src;
  }
}
