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

export function useComponentBySlug(slug: string) {
  // Reactive value: drives live updates once the websocket connects.
  const live = useQuery(api.packages.getComponentBySlug, { slug });

  // One-shot HTTP fallback: resolves even when the websocket cannot connect.
  const [http, setHttp] = useState<typeof live>(undefined);

  useEffect(() => {
    let cancelled = false;
    // Reset so a slug change does not briefly show the previous component.
    setHttp(undefined);
    httpClient
      .query(api.packages.getComponentBySlug, { slug })
      .then((result) => {
        if (!cancelled) setHttp(result);
      })
      .catch(() => {
        // Ignore: the live subscription remains the source of truth.
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

// A stalled request should still reach the fallback instead of leaving the
// page on its loading skeleton.
const DIRECTORY_PAGE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
export async function fetchDirectoryPage(
  sortBy: DirectorySort,
  category?: string,
): Promise<DirectoryPageData> {
  const url = directoryPageUrl(sortBy, category);
  const prefetch = window.__directoryPrefetch;
  let request: Promise<Response | null>;
  if (prefetch?.url === url) {
    window.__directoryPrefetch = undefined;
    request = prefetch.response;
  } else {
    request = fetch(url);
  }
  const data = await withTimeout(
    readDirectoryPage(request),
    DIRECTORY_PAGE_TIMEOUT_MS,
  ).catch(() => null);
  if (data) return data;

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
