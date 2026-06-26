/** Parse the owner/repo slug from a GitHub repository URL. */
function parseGitHubSlug(
  repositoryUrl?: string,
): { owner: string; repo: string } | undefined {
  if (!repositoryUrl) return undefined;
  const match = repositoryUrl.match(
    /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/i,
  );
  if (!match) return undefined;
  return { owner: match[1], repo: match[2] };
}

export function resolveRepositoryMarkdownHref(
  href?: string,
  repositoryUrl?: string,
): string | undefined {
  if (!href) return href;
  // Anchors, protocol-relative URLs, and absolute URLs (http:, mailto:, etc.)
  // are already meaningful as-is and must not be rewritten.
  if (
    href.startsWith("#") ||
    href.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)
  ) {
    return href;
  }

  const slug = parseGitHubSlug(repositoryUrl);
  if (!slug) return href;

  // Both relative ("example/README.md") and root-relative ("/example/README.md")
  // links in a README are resolved by GitHub against the repository root.
  // Use "HEAD" so the link works regardless of default branch (main vs master).
  const path = href.replace(/^\/+/, "").replace(/^\.\//, "");
  try {
    const base = `https://github.com/${slug.owner}/${slug.repo}/blob/HEAD/`;
    return new URL(path, base).toString();
  } catch {
    return href;
  }
}

export function resolveRepositoryImageSrc(
  src?: string,
  repositoryUrl?: string,
): string | undefined {
  if (!src) return src;
  if (
    src.startsWith("#") ||
    src.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(src)
  ) {
    return src;
  }

  const slug = parseGitHubSlug(repositoryUrl);
  if (!slug) return src;

  // Relative and root-relative image paths resolve against the repo root.
  const path = src.replace(/^\/+/, "").replace(/^\.\//, "");
  try {
    const base = `https://raw.githubusercontent.com/${slug.owner}/${slug.repo}/HEAD/`;
    return new URL(path, base).toString();
  } catch {
    return src;
  }
}
