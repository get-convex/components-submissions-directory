const defaultConvexSiteUrl = "https://giant-grouse-674.convex.site";

export default async (
  request: Request,
  context: { next: () => Promise<Response> },
) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  // Expected: /components/badge/<slug...>
  if (parts.length < 3 || parts[0] !== "components" || parts[1] !== "badge") {
    return context.next();
  }

  const slug = parts.slice(2).join("/");
  if (!slug) {
    return context.next();
  }

  const convexSiteUrl =
    Deno.env.get("VITE_CONVEX_URL")?.replace(".convex.cloud", ".convex.site") ||
    defaultConvexSiteUrl;
  const badgeUrl = `${convexSiteUrl}/api/badge?slug=${encodeURIComponent(slug)}`;

  const upstream = await fetch(badgeUrl);
  const body = await upstream.text();
  const headers = new Headers(upstream.headers);
  headers.set("content-type", "image/svg+xml");

  return new Response(body, {
    status: upstream.status,
    headers,
  });
};
