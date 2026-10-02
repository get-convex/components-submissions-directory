---
name: directory-load-performance
description: Make public, read heavy Convex + Vite pages load fast on first visit, return visit and in app navigation. Use when a public page feels slow, when adding a new public page, analytics, images, markdown or other heavy dependencies, when touching index.html, netlify.toml, _headers, _redirects or vite.config.ts, or when the user mentions "slow", "load time", "LCP", "bundle size", "waterfall", "websocket handshake", "cache headers", "thumbnails" or "far from the deployment".
---

# Directory load performance

Playbook from the 2026-09-30 perf pass on this repo. Full retro: `prds/directory-load-performance-retro.md`.

Results: cards on screen ~1.5s to ~0.9s, return visits ~890ms to ~190ms, entry bundle 1,096 KB to 625 KB, no reload between pages.

## The core idea

A public page should never wait in line. The default Convex SPA waterfall is:

```
HTML -> JS bundle -> open websocket (~900ms from Australia) -> N queries
```

Break every arrow. Start data in the HTML, keep the bundle small, reuse the connection across pages, and render cached data before anything arrives.

## Checklist for any public page

Run through this before calling a public page done.

1. **One bootstrap request.** Read everything the page needs in one `internalQuery`, serve it from a `GET` HTTP action, and start the fetch from an inline script in `index.html`.
2. **Fallback to public queries.** If the bootstrap fails, stalls (8s here) or returns the wrong shape, run the normal public queries. Never leave a blank page.
3. **Cache the default view.** Save it to localStorage under a versioned key with a max age and a shape check. Render it immediately, then revalidate.
4. **Client side navigation.** Links between app pages push history. Files, API routes, auth callbacks, other origins and modified clicks still do full loads.
5. **Prefetch on intent.** Hover (~80ms) or touch on a link starts the next page's data and lazy chunks.
6. **Lazy load non first paint code.** Analytics after `load` + `requestIdleCallback`, wrapped in an error boundary. Markdown, syntax highlighting and admin in their own chunks.
7. **Size images for their slot.** `srcset`, `sizes`, a CDN resize route, `onError` fallback to the original. Eager plus `fetchpriority="high"` only for the likely LCP image.
8. **Preconnect** to the Convex deployment. Preload only fonts used above the fold on public pages.
9. **Verify headers live** with `curl -I`. Config files lie.
10. **Measure from far away.** DevTools Slow 4G or WebPageTest from Sydney.

## Pattern: bootstrap endpoint

Backend, one snapshot for the whole page:

```ts
// convex/directoryPage.ts
export const _getDirectoryPageData = internalQuery({
  args: { sortBy: directorySortValidator, category: v.optional(v.string()) },
  handler: async (ctx, { sortBy, category }): Promise<DirectoryPageData> => {
    const [components, categories /* ... */] = await Promise.all([
      ctx.runQuery(api.packages.listApprovedComponents, { category, sortBy }),
      ctx.runQuery(api.packages.listCategories, {}),
      // ...
    ]);
    return { components, categories /* ... */ };
  },
});
```

HTTP action. A simple `GET` skips the CORS preflight a `POST /api/query` triggers:

```ts
// convex/http.ts
http.route({
  path: "/api/directory-page",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const sortBy = new URL(request.url).searchParams.get("sortBy") ?? "downloads";
    if (!DIRECTORY_SORTS.includes(sortBy as DirectorySort)) {
      return new Response("Invalid sortBy", { status: 400 });
    }
    const data = await ctx.runQuery(internal.directoryPage._getDirectoryPageData, {
      sortBy: sortBy as DirectorySort,
    });
    return new Response(JSON.stringify(convexToJson(data as Value)), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  }),
});
```

Rules:

- Only compose public, already sanitized queries. The endpoint is public, so it must never return admin or PII fields.
- Validate every query param against an allowlist.
- Serialize with `convexToJson` and parse with `jsonToConvex` so ids and numbers round trip.
- Prefer plain TypeScript helpers over `ctx.runQuery` inside a query when you write a new one. Convex docs say to use `ctx.runQuery` sparingly in queries.

Frontend, start the fetch before the bundle:

```html
<!-- index.html -->
<link rel="preconnect" href="%VITE_CONVEX_URL%" crossorigin />
<script>
  (function () {
    var match = location.pathname.match(/^\/components(?:\/categories\/([^/]+))?\/?$/);
    if (!match || !window.fetch) return;
    var url = "<site url>/api/directory-page?sortBy=downloads";
    if (match[1]) url += "&category=" + encodeURIComponent(match[1]);
    window.__directoryPrefetch = { url: url, response: fetch(url).catch(function () { return null; }) };
  })();
</script>
```

The client consumes `window.__directoryPrefetch` once, only when its URL matches. Keep the URL builder in `index.html` and `src/lib/convexHttp.ts` in sync. A mismatch costs one extra fetch, nothing breaks.

## Pattern: lazy analytics

```tsx
const WebAnalytics = lazy(() => import("@convex-internal/web-analytics/react").then(/* ... */));

// Render after load + idle, inside an error boundary that renders null on failure
```

Render it next to the app, not around it. A provider that wraps the tree forces its package into the entry bundle.

## Pattern: thumbnails

Use `thumbnailImageProps(url, CARD_THUMBNAIL)` from `src/lib/images.ts` for every component thumbnail. Pick or add a `ThumbnailSizing` that matches the real rendered width. Use `avatarUrl()` for GitHub avatars.

Netlify rewrites in `netlify/_redirects`:

```
/components/_src/:id         https://<deployment>.convex.cloud/api/storage/:id    200!
/components/_img/:width/:id  /.netlify/images?url=/components/_src/:id&w=:width   200!
```

## Netlify gotchas on this site

- `[[headers]]` and `[[redirects]]` in `netlify.toml` are ignored. Put rules in `netlify/_headers` and `netlify/_redirects`. The `netlifyRootFiles` plugin in `vite.config.ts` copies them to `dist/`.
- Custom headers don't apply to responses from an edge function. Exclude assets and fonts from `og-meta`, or set headers in the function.
- Redirect proxies don't fire after an edge function handles a path.
- Deploy log line "No header rules processed" means your rules aren't live.

Verify after every deploy:

```bash
curl -sI https://www.convex.dev/components/assets/<hashed>.js | grep -i cache-control
# expect: public, max-age=31536000, immutable
```

## Type safety that protects perf work

- Helpers feeding public queries take `Doc<"table">` and return `Infer<typeof validator>`. Convex types the client from the handler's return, not the `returns` validator, so `pkg: any` leaks `any` to every caller.
- `npm run lint` uses `tsc -b`. A root tsconfig with only references makes `tsc -p .` check nothing.

## Anti patterns

| Don't | Do |
| --- | --- |
| `useQuery` for first paint of a public catalog | Bootstrap GET, then optional live query |
| Five queries in parallel from the client | One internal query, one request |
| Analytics provider wrapping `<App>` | Deferred sibling with error boundary |
| Static import of react-markdown on a shared component | Lazy chunk, preload on the page that needs it |
| `<img src={fullSizePng}>` | `srcset` + `sizes` + CDN + fallback |
| Plain `<a href>` between app pages | Router push, full load for non app paths |
| `pageshow` refetch on every load | Skip when in flight or under a minute old |
| Trusting `netlify.toml` | `curl -I` the live response |

## Before you ship a public page change

- [ ] `npm run lint` passes (typecheck convex, typecheck app, build)
- [ ] Entry chunk size didn't grow without a reason (`vite build` output, `index-*.js`)
- [ ] DevTools Slow 4G: content visible without waiting on the websocket
- [ ] Back button restores scroll and filters
- [ ] Images in DevTools Network are WebP/AVIF and sized near the slot
- [ ] After deploy: `curl -I` a hashed asset shows `immutable`

## Key files

- `convex/directoryPage.ts`, `convex/http.ts` (`/api/directory-page`)
- `index.html` (prefetch script, preconnect)
- `src/lib/convexHttp.ts` (bootstrap pickup, fallback, localStorage cache, component prefetch)
- `src/lib/router.ts` (client navigation, history state, hover prefetch)
- `src/lib/images.ts` (thumbnail sizing, avatars)
- `src/components/DeferredWebAnalytics.tsx`, `src/components/MarkdownRenderer.tsx`, `src/lib/markdownChunk.ts`
- `netlify/_headers`, `netlify/_redirects`, `vite.config.ts`

## Sources

- https://docs.convex.dev/understanding/best-practices/
- https://docs.convex.dev/functions/http-actions
- https://docs.netlify.com/routing/headers/
- https://docs.netlify.com/image-cdn/overview/
