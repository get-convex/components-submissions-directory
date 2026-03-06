const defaultConvexCloudUrl = "https://giant-grouse-674.convex.cloud";

const SITE_NAME = "Convex Components";
const SITE_ORIGIN = "https://www.convex.dev";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/components/og-preview.png`;

const BOT_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "WhatsApp",
  "TelegramBot",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "Applebot",
  "Pinterestbot",
  "redditbot",
  "Embedly",
  "Quora Link Preview",
  "outbrain",
  "vkShare",
  "W3C_Validator",
  "Iframely",
  "opengraph",
  "OpenGraphCheck",
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot.toLowerCase()));
}

function extractSlug(pathname: string): string | null {
  const match = pathname.match(/^\/components\/([^/.]+(?:\/[^/.]+)*)$/);
  if (!match) return null;
  const slug = match[1];
  if (slug === "submit" || slug === "admin" || slug === "login") return null;
  return slug;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function buildOgHtml(component: ComponentData): string {
  const title = escapeHtml(component.componentName || component.name);
  const fullTitle = `${title} | ${SITE_NAME}`;
  const description = escapeHtml(
    component.seoValueProp ||
      component.shortDescription ||
      component.description ||
      ""
  );
  const url = `${SITE_ORIGIN}/components/${component.slug || ""}`;
  const image = component.thumbnailUrl || DEFAULT_OG_IMAGE;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${fullTitle}</title>
<meta name="description" content="${description}" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:site_name" content="${SITE_NAME}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta name="twitter:image:alt" content="${title}" />

<link rel="canonical" href="${escapeHtml(url)}" />
</head>
<body>
<p>${fullTitle}</p>
<p>${description}</p>
</body>
</html>`;
}

export default async (
  request: Request,
  context: { next: () => Promise<Response> }
) => {
  const userAgent = request.headers.get("user-agent") || "";
  if (!isBot(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const slug = extractSlug(url.pathname);
  if (!slug) {
    return context.next();
  }

  const component = await fetchComponent(slug);
  if (!component) {
    return context.next();
  }

  const html = buildOgHtml(component);
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
};
