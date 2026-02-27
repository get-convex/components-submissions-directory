const defaultConvexCloudUrl = "https://giant-grouse-674.convex.cloud";

function toConvexSiteUrl(cloudUrl: string): string {
  return cloudUrl.replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
}

function parseSlugFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3 || segments[0] !== "components") {
    return null;
  }

  const slugParts = segments.slice(1, -1);
  const filename = segments[segments.length - 1];
  const leaf = slugParts[slugParts.length - 1];
  if (!filename.endsWith(".md") || filename !== `${leaf}.md`) {
    return null;
  }

  return slugParts.join("/");
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(request.url);
  const slug = parseSlugFromPath(url.pathname);
  if (!slug) {
    return context.next();
  }

  const convexCloudUrl = Deno.env.get("VITE_CONVEX_URL") || defaultConvexCloudUrl;
  const convexSiteUrl = toConvexSiteUrl(convexCloudUrl);
  const markdownUrl = `${convexSiteUrl}/api/markdown?slug=${encodeURIComponent(slug)}`;

  const markdownResponse = await fetch(markdownUrl, {
    headers: { accept: "text/markdown, text/plain;q=0.9, */*;q=0.8" },
  });

  const body = await markdownResponse.text();
  const headers = new Headers(markdownResponse.headers);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, s-maxage=300");

  return new Response(body, {
    status: markdownResponse.status,
    headers,
  });
};
