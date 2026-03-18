const defaultConvexCloudUrl = "https://giant-grouse-674.convex.cloud";

const SITE_NAME = "Convex Components";
const SITE_ORIGIN = "https://www.convex.dev";

function getOgImageUrl(title: string): string {
  return `https://www.convex.dev/api/og?title=${encodeURIComponent(title)}`;
}

type ReviewStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "changes_requested"
  | "rejected";

function extractSlug(pathname: string): string | null {
  const match = pathname.match(/^\/components\/([^/.]+(?:\/[^/.]+)*)$/);
  if (!match) return null;
  const slug = match[1];
  const reserved = [
    "submit",
    "admin",
    "login",
    "callback",
    "profile",
    "submissions",
    "documentation",
    "badge",
    "categories",
  ];
  if (
    reserved.includes(slug) ||
    slug.startsWith("submissions/") ||
    slug.startsWith("badge/") ||
    slug.startsWith("categories/")
  ) {
    return null;
  }
  return slug;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface ComponentData {
  componentName?: string;
  name: string;
  shortDescription?: string;
  description: string;
  seoValueProp?: string;
  thumbnailUrl?: string;
  slug?: string;
  reviewStatus?: ReviewStatus;
}

function getRobotsContent(reviewStatus?: ReviewStatus): string {
  return reviewStatus === "approved" ? "index, follow" : "noindex, nofollow";
}

async function fetchComponent(slug: string): Promise<ComponentData | null> {
  const convexCloudUrl =
    Deno.env.get("VITE_CONVEX_URL") || defaultConvexCloudUrl;
  const apiUrl = `${convexCloudUrl}/api/query`;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "packages:getComponentBySlug",
        args: { slug },
        format: "json",
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === "success" && json.value) {
      return json.value as ComponentData;
    }
    return null;
  } catch {
    return null;
  }
}

// Replace meta tags in HTML with component-specific values.
// Works by finding all <meta ...> tags (including multiline) and replacing
// the ones that match known OG/Twitter attributes.
function injectMetaTags(html: string, component: ComponentData): string {
  const title = escapeAttr(component.componentName || component.name);
  const fullTitle = `${title} | ${SITE_NAME}`;
  const description = escapeAttr(
    component.seoValueProp ||
      component.shortDescription ||
      component.description ||
      ""
  );
  const url = escapeAttr(`${SITE_ORIGIN}/components/${component.slug || ""}`);
  const componentName = component.componentName || component.name;
  const image = escapeAttr(
    component.thumbnailUrl || getOgImageUrl(componentName)
  );
  const robots = escapeAttr(getRobotsContent(component.reviewStatus));

  // Replacement pairs: attribute identifier -> new full tag
  // Ordered with more specific identifiers first to avoid partial matches
  // (e.g. twitter:image:alt must come before twitter:image)
  const replacements: Array<[string, string]> = [
    ['name="title"', `<meta name="title" content="${fullTitle}" />`],
    [
      'name="description"',
      `<meta name="description" content="${description}" />`,
    ],
    ['name="robots"', `<meta name="robots" content="${robots}" />`],
    ['property="og:url"', `<meta property="og:url" content="${url}" />`],
    ['property="og:title"', `<meta property="og:title" content="${title}" />`],
    [
      'property="og:description"',
      `<meta property="og:description" content="${description}" />`,
    ],
    ['property="og:image"', `<meta property="og:image" content="${image}" />`],
    [
      'name="twitter:title"',
      `<meta name="twitter:title" content="${title}" />`,
    ],
    [
      'name="twitter:description"',
      `<meta name="twitter:description" content="${description}" />`,
    ],
    [
      'name="twitter:image:alt"',
      `<meta name="twitter:image:alt" content="${title}" />`,
    ],
    [
      'name="twitter:image"',
      `<meta name="twitter:image" content="${image}" />`,
    ],
  ];

  // Match all meta tags including multiline ones.
  // This regex finds <meta followed by content up to the next /> or >
  // Using a global replace to process each tag individually.
  // Matches <meta ...> or <meta .../> including newlines between attributes
  const metaTagPattern = /<meta\b[\s\S]*?(?:\/>|>)/g;

  html = html.replace(metaTagPattern, (match) => {
    for (const [identifier, replacement] of replacements) {
      if (match.includes(identifier)) {
        return replacement;
      }
    }
    return match;
  });

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`);

  if (!html.includes('name="robots"')) {
    html = html.replace(
      "</head>",
      `  <meta name="robots" content="${robots}" />\n</head>`
    );
  }

  return html;
}

function getConvexSiteUrl(): string {
  return (
    Deno.env.get("VITE_CONVEX_URL")?.replace(".convex.cloud", ".convex.site") ||
    defaultConvexCloudUrl.replace(".convex.cloud", ".convex.site")
  );
}

export default async (
  request: Request,
  context: { next: () => Promise<Response> }
) => {
  const url = new URL(request.url);
  const siteUrl = getConvexSiteUrl();

  // Proxy sitemap.xml directly to Convex (redirects don't fire after edge fns)
  if (url.pathname === "/components/sitemap.xml") {
    const res = await fetch(`${siteUrl}/api/sitemap.xml`);
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  // Proxy llms.txt to Convex (redirects don't fire after edge fns)
  if (url.pathname === "/components/llms.txt") {
    const res = await fetch(`${siteUrl}/api/llms.txt`);
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  }
  const llmsMatch = url.pathname.match(/^\/components\/(.+)\/llms\.txt$/);
  if (llmsMatch) {
    const slug = llmsMatch[1];
    const res = await fetch(
      `${siteUrl}/api/component-llms?slug=${encodeURIComponent(slug)}`
    );
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  }

  // Inject noindex for admin-only documentation routes
  if (
    url.pathname === "/components/documentation" ||
    url.pathname.startsWith("/components/documentation/")
  ) {
    const response = await context.next();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let html = await response.text();
      if (html.includes('name="robots"')) {
        html = html.replace(
          /<meta\b[^>]*name="robots"[^>]*\/?>/,
          '<meta name="robots" content="noindex, nofollow" />'
        );
      } else {
        html = html.replace(
          "</head>",
          '  <meta name="robots" content="noindex, nofollow" />\n</head>'
        );
      }
      const headers = new Headers(response.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(html, { status: response.status, headers });
    }
    return response;
  }

  const slug = extractSlug(url.pathname);

  if (!slug) {
    return context.next();
  }

  // Fetch component data and SPA response in parallel
  const [component, response] = await Promise.all([
    fetchComponent(slug),
    context.next(),
  ]);

  if (!component) {
    return response;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const originalHtml = await response.text();
  const modifiedHtml = injectMetaTags(originalHtml, component);

  // Preserve original headers but update content-type and caching
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set(
    "cache-control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );

  return new Response(modifiedHtml, {
    status: response.status,
    headers,
  });
};
