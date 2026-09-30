import { Suspense, lazy, useEffect, useState } from "react";

// The shared analytics package pulls in posthog-js (~180 KB minified), which
// used to sit in the entry bundle every visitor downloads before the first
// render. Nothing in the app reads its consent context, so the provider can
// render on its own (it initialises PostHog and shows the consent banner) and
// load once the page has finished loading.
const WebAnalytics = lazy(() =>
  import("@convex-internal/web-analytics/react").then((module) => ({
    default: function WebAnalytics() {
      return <module.WebAnalyticsProvider>{null}</module.WebAnalyticsProvider>;
    },
  })),
);

export default function DeferredWebAnalytics() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for the load event and then an idle moment, so analytics never
    // competes with the directory's first render
    const start = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      } else {
        setTimeout(() => setReady(true), 0);
      }
    };
    if (document.readyState === "complete") {
      start();
      return;
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  return ready ? (
    <Suspense fallback={null}>
      <WebAnalytics />
    </Suspense>
  ) : null;
}
