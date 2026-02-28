const DEFAULT_COMPONENTS_BASE_PATH = "/components";

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === "/") {
    return DEFAULT_COMPONENTS_BASE_PATH;
  }
  const trimmed = basePath.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getComponentSlugLeaf(slug: string): string {
  const parts = slug.split("/").filter((part) => part.length > 0);
  return parts[parts.length - 1] || slug;
}

export function buildComponentPaths(
  slug: string,
  basePath = DEFAULT_COMPONENTS_BASE_PATH,
): {
  detailPath: string;
  markdownPath: string;
  llmsPath: string;
} {
  const cleanBasePath = normalizeBasePath(basePath);
  const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
  const leaf = getComponentSlugLeaf(cleanSlug);

  const detailPath = `${cleanBasePath}/${cleanSlug}`;
  return {
    detailPath,
    markdownPath: `${detailPath}/${leaf}.md`,
    llmsPath: `${detailPath}/llms.txt`,
  };
}

export function buildComponentUrls(
  slug: string,
  origin: string,
  basePath = DEFAULT_COMPONENTS_BASE_PATH,
): {
  detailUrl: string;
  markdownUrl: string;
  llmsUrl: string;
} {
  const paths = buildComponentPaths(slug, basePath);
  return {
    detailUrl: new URL(paths.detailPath, origin).toString(),
    markdownUrl: new URL(paths.markdownPath, origin).toString(),
    llmsUrl: new URL(paths.llmsPath, origin).toString(),
  };
}

function toConvexSiteOrigin(convexUrl: string): string {
  return convexUrl
    .replace(".convex.cloud", ".convex.site")
    .replace(/\/$/, "");
}

function isLocalOrigin(origin: string): boolean {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function buildComponentApiUrls(
  slug: string,
  convexUrl: string,
): {
  markdownUrl: string;
  llmsUrl: string;
} {
  const convexSiteOrigin = toConvexSiteOrigin(convexUrl);
  const encodedSlug = encodeURIComponent(slug);
  return {
    markdownUrl: `${convexSiteOrigin}/api/markdown?slug=${encodedSlug}`,
    llmsUrl: `${convexSiteOrigin}/api/component-llms?slug=${encodedSlug}`,
  };
}

export function buildComponentClientUrls(
  slug: string,
  appOrigin: string,
  convexUrl?: string,
): {
  detailUrl: string;
  markdownUrl: string;
  llmsUrl: string;
} {
  const aliasUrls = buildComponentUrls(slug, appOrigin);
  if (convexUrl && isLocalOrigin(appOrigin)) {
    const apiUrls = buildComponentApiUrls(slug, convexUrl);
    return {
      detailUrl: aliasUrls.detailUrl,
      markdownUrl: apiUrls.markdownUrl,
      llmsUrl: apiUrls.llmsUrl,
    };
  }
  return aliasUrls;
}
