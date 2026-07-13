const defaultConvexCloudUrl = "https://giant-grouse-674.convex.cloud";

function toConvexSiteUrl(cloudUrl: string): string {
  return cloudUrl.replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
}

// Matches /components/<slug>/<leaf>.md (component markdown doc) and
// /components/<slug>/SKILL.md (agent skill file); returns the slug plus
// which API endpoint should serve the file.
function parseSlugFromPath(
  pathname: string,
): { slug: string; kind: "markdown" | "skill" } | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3 || segments[0] !== "components") {
    return null;
  }

  const slugParts = segments.slice(1, -1);
  const filename = segments[segments.length - 1];
  const leaf = slugParts[slugParts.length - 1];
  if (filename === "SKILL.md") {
    return { slug: slugParts.join("/"), kind: "skill" };
  }
  if (!filename.endsWith(".md") || filename !== `${leaf}.md`) {
    return null;
  }

  return { slug: slugParts.join("/"), kind: "markdown" };
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(request.url);
  const parsed = parseSlugFromPath(url.pathname);
  if (!parsed) {
    return context.next();
  }

  const convexCloudUrl = Deno.env.get("VITE_CONVEX_URL") || defaultConvexCloudUrl;
  const convexSiteUrl = toConvexSiteUrl(convexCloudUrl);
  const apiPath = parsed.kind === "skill" ? "/api/skill" : "/api/markdown";
  const markdownUrl = `${convexSiteUrl}${apiPath}?slug=${encodeURIComponent(parsed.slug)}`;

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
