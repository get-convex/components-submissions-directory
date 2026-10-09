// Serves Convex storage files at /components/_src/<storageId>, the path
// Netlify Image CDN reads thumbnails from (see netlify/_redirects and
// src/lib/images.ts).
//
// This path is on www.convex.dev and any signed-in user can upload a file to
// storage, so passing storage responses straight through would let an
// uploaded HTML or SVG file run as a page on that origin. Only raster images
// are served, with nosniff and a sandbox CSP so a response can never act as
// a document. It has to be an edge function: Netlify doesn't apply _headers
// rules to proxied responses.
//
// Browsers always reach this function, since edge functions run before
// redirects. The _src rewrite in _redirects stays as a fallback in case Image
// CDN's own source fetches skip edge functions.

// Same deployment as the _src rewrite and src/lib/images.ts
const storageBaseUrl = "https://giant-grouse-674.convex.cloud/api/storage/";
const STORAGE_ID_RE = /^[\w-]+$/;
const RASTER_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const PASSTHROUGH_HEADERS = [
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
];

function safeHeaders(): Headers {
  return new Headers({
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
  });
}

function notFound(): Response {
  const headers = safeHeaders();
  headers.set("content-type", "text/plain; charset=utf-8");
  return new Response("Not found", { status: 404, headers });
}

export default async (request: Request) => {
  // Expected: /components/_src/<storageId>
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const storageId = segments.length === 3 ? segments[2] : "";
  if (!STORAGE_ID_RE.test(storageId)) return notFound();

  const upstream = await fetch(`${storageBaseUrl}${storageId}`);
  const contentType = (upstream.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!upstream.ok || !RASTER_IMAGE_TYPES.has(contentType)) {
    await upstream.body?.cancel();
    return notFound();
  }

  const headers = safeHeaders();
  headers.set("content-type", contentType);
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
};
