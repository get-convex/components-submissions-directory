// One-shot HTTP loading for component detail data.
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
import { api } from "../../convex/_generated/api";

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
