export function resolveRepositoryMarkdownHref(
  href?: string,
  repositoryUrl?: string,
): string | undefined {
  if (!href) return href;
  if (
    href.startsWith("#") ||
    href.startsWith("/") ||
    href.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)
  ) {
    return href;
  }
  if (!repositoryUrl) return href;

  try {
    return new URL(href, `${repositoryUrl.replace(/\/$/, "")}/blob/main/README.md`).toString();
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
    src.startsWith("/") ||
    src.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(src)
  ) {
    return src;
  }
  if (!repositoryUrl) return src;

  const match = repositoryUrl.match(/github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/i);
  if (!match) return src;
  const [, owner, repo] = match;

  try {
    const base = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`;
    return new URL(src.replace(/^\.\//, ""), base).toString();
  } catch {
    return src;
  }
}
