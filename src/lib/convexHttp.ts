// One-shot HTTP loading for public directory and component detail data.
//
// The detail page normally reads component data through a reactive websocket
// subscription (`useQuery`). Search engine renderers (notably Googlebot) often
// never complete the websocket handshake within their render budget, so the
// page renders empty and cannot be indexed. To make the content crawlable, we
// also fetch the same public query over plain HTTP (the `/api/query` endpoint,
// the same path the `og-meta` edge function uses) and render whichever result
// arrives first, preferring the live subscription once it is connected.
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { jsonToConvex } from "convex/values";
import { api } from "../../convex/_generated/api";

declare global {
  interface Window {
    // Directory page request started by the inline script in index.html,
    // keyed by URL. Consumed once by the first fetchDirectoryPage call.
    __directoryPrefetch?: { url: string; response: Promise<Response | null> };
  }
}

// Module-level singleton so we do not reconnect per render/navigation.
const httpClient = new ConvexHttpClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

type ComponentBySlug = FunctionReturnType<
  typeof api.packages.getComponentBySlug
>;

// One-shot HTTP results for component pages, keyed by slug. Filled when a
// link is hovered or touched (prefetchComponent) and when a page opens, so
// in-app navigation can render straight away while the live query catches up.
const componentRequests = new Map<
  string,
  Promise<ComponentBySlug | undefined>
>();
const componentResults = new Map<string, ComponentBySlug>();

function requestComponent(slug: string) {
  let request = componentRequests.get(slug);
  if (!request) {
    request = httpClient
      .query(api.packages.getComponentBySlug, { slug })
      .then((result) => {
        componentResults.set(slug, result);
        return result;
      })
      .catch(() => {
        // Allow a retry later; the live subscription remains the source of truth
        componentRequests.delete(slug);
        return undefined;
      });
    componentRequests.set(slug, request);
  }
  return request;
}

export function prefetchComponent(slug: string) {
  void requestComponent(slug);
}

export function useComponentBySlug(slug: string) {
  // Reactive value: drives live updates once the websocket connects.
  const live = useQuery(api.packages.getComponentBySlug, { slug });

  // One-shot HTTP fallback: resolves even when the websocket cannot connect.
  const [http, setHttp] = useState<ComponentBySlug | undefined>(() =>
    componentResults.get(slug),
  );

  useEffect(() => {
    let cancelled = false;
    // Show a prefetched result straight away, and never the previous slug's.
    setHttp(componentResults.get(slug));
    void requestComponent(slug).then((result) => {
      if (!cancelled && result !== undefined) setHttp(result);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Prefer the live (reactive) value once available; fall back to HTTP.
  // Returns `undefined` while both are pending (loading), `null` when the
  // component is not found, or the document otherwise.
  return live !== undefined ? live : http;
}

export type DirectorySort =
  | "newest"
  | "downloads"
  | "updated"
  | "rating"
  | "verified";

export type DirectoryPageData = {
  components: FunctionReturnType<typeof api.packages.listApprovedComponents>;
  categories: FunctionReturnType<typeof api.packages.listCategories>;
  featured: FunctionReturnType<
    typeof api.packages.getFeaturedComponents
  > | null;
  downloadsDisplay: FunctionReturnType<
    typeof api.packages.getDownloadsDisplaySettings
  >;
  listViewSettings: FunctionReturnType<
    typeof api.packages.getListViewSettings
  > | null;
  categoryData: FunctionReturnType<
    typeof api.packages.getCategoryBySlug
  > | null;
};

// How long the bootstrap endpoint gets before the individual queries also
// start. It keeps running after that and can still win.
const DIRECTORY_PAGE_TIMEOUT_MS = 8000;
// How long an attempt can stay pending before another starts alongside it
const ATTEMPT_PATIENCE_MS = 20_000;

// Returns null for anything that isn't a usable page payload, so a bad
// response falls back instead of rendering an empty directory.
async function readDirectoryPage(
  response: Promise<Response | null>,
): Promise<DirectoryPageData | null> {
  const res = await response;
  if (!res?.ok) return null;
  const data = jsonToConvex(await res.json()) as Partial<DirectoryPageData>;
  const isValid =
    Array.isArray(data?.components) &&
    Array.isArray(data.categories) &&
    typeof data.downloadsDisplay === "object" &&
    data.downloadsDisplay !== null;
  return isValid ? (data as DirectoryPageData) : null;
}

// How long a loaded catalog counts as fresh before focus, tab switches or
// revisits refetch it
export const CATALOG_REFRESH_AFTER_MS = 60_000;

// Last successful catalog response per URL, so going Back to the directory
// or a category renders straight away instead of showing a skeleton.
const directoryPageCache = new Map<
  string,
  { data: DirectoryPageData; loadedAt: number }
>();

export function getCachedDirectoryPage(
  sortBy: DirectorySort,
  category?: string,
) {
  return directoryPageCache.get(directoryPageUrl(sortBy, category));
}

// Must build the exact same URL as the inline script in index.html.
function directoryPageUrl(sortBy: DirectorySort, category?: string) {
  const siteUrl =
    (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ||
    (import.meta.env.VITE_CONVEX_URL as string).replace(
      ".convex.cloud",
      ".convex.site",
    );
  let url = `${siteUrl}/api/directory-page?sortBy=${sortBy}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return url;
}

// Catalog data for the directory and category pages in one plain GET
// (convex/http.ts /api/directory-page).
//
// Over the websocket this took ~1.5s from Australia: the socket needs an extra
// round trip to the deployment before it can answer, and only starts once the
// JS bundle has loaded. index.html starts this request while the bundle is
// still downloading, so the first call usually resolves straight away. Falls
// back to the individual queries if the endpoint fails, stalls or returns
// something unexpected.
export function fetchDirectoryPage(
  sortBy: DirectorySort,
  category?: string,
  signal?: AbortSignal,
): Promise<DirectoryPageData> {
  // Like the websocket client this replaced, keep trying through a dropped
  // connection instead of failing and leaving the page on its skeleton. A
  // failed attempt is retried with backoff (and straight away when the
  // browser comes back online). A slow one keeps running, since a late
  // success still counts, but after a while another starts alongside it.
  // Aborting the signal (a newer request replaced this one) stops it all.
  return new Promise((resolve, reject) => {
    let settled = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      settled = true;
      clearTimeout(retryTimer);
      window.removeEventListener("online", startAttempt);
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      if (settled) return;
      finish();
      reject(new DOMException("Aborted", "AbortError"));
    };
    function startAttempt() {
      if (settled) return;
      const attempt = attempts++;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(startAttempt, ATTEMPT_PATIENCE_MS);
      loadDirectoryPage(sortBy, category, signal).then(
        (data) => {
          if (settled) return;
          finish();
          directoryPageCache.set(directoryPageUrl(sortBy, category), {
            data,
            loadedAt: Date.now(),
          });
          resolve(data);
        },
        (error) => {
          // Only the newest attempt decides when to try again
          if (settled || attempt !== attempts - 1) return;
          console.warn("[fetchDirectoryPage] Retrying after error", error);
          clearTimeout(retryTimer);
          retryTimer = setTimeout(
            startAttempt,
            Math.min(30_000, 1_000 * 2 ** attempt),
          );
        },
      );
    }

    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", abort);
    window.addEventListener("online", startAttempt);
    startAttempt();
  });
}

// One attempt: the bootstrap endpoint, then the individual queries alongside
// it once it has had DIRECTORY_PAGE_TIMEOUT_MS (or as soon as it fails).
// Whichever returns usable data first wins, so a slow response that turns up
// late is still used. Rejects only when both have failed.
function loadDirectoryPage(
  sortBy: DirectorySort,
  category: string | undefined,
  signal: AbortSignal | undefined,
): Promise<DirectoryPageData> {
  const url = directoryPageUrl(sortBy, category);
  const prefetch = window.__directoryPrefetch;
  let request: Promise<Response | null>;
  if (prefetch?.url === url) {
    window.__directoryPrefetch = undefined;
    request = prefetch.response;
  } else {
    request = fetch(url, { signal });
  }

  return new Promise((resolve, reject) => {
    let failures = 0;
    let fallbackStarted = false;
    const stop = () => {
      clearTimeout(fallbackTimer);
      signal?.removeEventListener("abort", onAbort);
    };
    // A newer load replaced this one: don't start the queries at all
    const onAbort = () => {
      stop();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const succeed = (data: DirectoryPageData) => {
      stop();
      resolve(data);
    };
    const fail = () => {
      failures += 1;
      if (!fallbackStarted) {
        startFallback();
      } else if (failures >= 2) {
        stop();
        reject(new Error("Directory data failed to load"));
      }
    };
    const startFallback = () => {
      if (fallbackStarted || signal?.aborted) return;
      fallbackStarted = true;
      loadDirectoryQueries(sortBy, category).then(succeed, fail);
    };
    const fallbackTimer = setTimeout(startFallback, DIRECTORY_PAGE_TIMEOUT_MS);
    signal?.addEventListener("abort", onAbort);
    readDirectoryPage(request).then(
      (data) => (data ? succeed(data) : fail()),
      fail,
    );
  });
}

async function loadDirectoryQueries(
  sortBy: DirectorySort,
  category?: string,
): Promise<DirectoryPageData> {
  const [
    components,
    categories,
    featured,
    downloadsDisplay,
    listViewSettings,
    categoryData,
  ] = await Promise.all([
    httpClient.query(api.packages.listApprovedComponents, { category, sortBy }),
    httpClient.query(api.packages.listCategories, {}),
    category ? null : httpClient.query(api.packages.getFeaturedComponents, {}),
    httpClient.query(api.packages.getDownloadsDisplaySettings, {}),
    category ? null : httpClient.query(api.packages.getListViewSettings, {}),
    category
      ? httpClient.query(api.packages.getCategoryBySlug, { slug: category })
      : null,
  ]);
  return {
    components,
    categories,
    featured,
    downloadsDisplay,
    listViewSettings,
    categoryData,
  };
}
