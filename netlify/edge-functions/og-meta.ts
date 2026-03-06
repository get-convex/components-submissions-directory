const defaultConvexCloudUrl = "https://giant-grouse-674.convex.cloud";

const SITE_NAME = "Convex Components";
const SITE_ORIGIN = "https://www.convex.dev";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/components/og-preview.png`;

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
  ];
  if (
    reserved.includes(slug) ||
    slug.startsWith("submissions/") ||
    slug.startsWith("badge/")
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
  const image = escapeAttr(component.thumbnailUrl || DEFAULT_OG_IMAGE);

  // Replacement pairs: attribute identifier -> new full tag
  // Ordered with more specific identifiers first to avoid partial matches
  // (e.g. twitter:image:alt must come before twitter:image)
  const replacements: Array<[string, string]> = [
    ['name="title"', `<meta name="title" content="${fullTitle}" />`],
    ['name="description"', `<meta name="description" content="${description}" />`],
    ['property="og:url"', `<meta property="og:url" content="${url}" />`],
    ['property="og:title"', `<meta property="og:title" content="${title}" />`],
    ['property="og:description"', `<meta property="og:description" content="${description}" />`],
    ['property="og:image"', `<meta property="og:image" content="${image}" />`],
    ['name="twitter:title"', `<meta name="twitter:title" content="${title}" />`],
    ['name="twitter:description"', `<meta name="twitter:description" content="${description}" />`],
    ['name="twitter:image:alt"', `<meta name="twitter:image:alt" content="${title}" />`],
    ['name="twitter:image"', `<meta name="twitter:image" content="${image}" />`],
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

  return html;
}

export default async (
  request: Request,
  context: { next: () => Promise<Response> }
) => {
  const url = new URL(request.url);
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
