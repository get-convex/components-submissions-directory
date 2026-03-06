import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { useEffect } from "react";
import PostHogPageView from "./PostHogPageView";
import { useAnalyticsCookies } from "../lib/useAnalyticsCookies";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { allowsCookies } = useAnalyticsCookies();

  useEffect(() => {
    const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
    const apiHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
    const isProduction = import.meta.env.PROD;

    if (!isProduction || !key || !apiHost) {
      return;
    }

    posthog.init(key, {
      api_host: apiHost,
      ui_host: "https://us.posthog.com/",
      debug: false,
      capture_pageview: false,
      // Cookieless tracking by default until consent is given.
      // https://posthog.com/tutorials/cookieless-tracking
      persistence: "memory",
    });
  }, []);

  useEffect(() => {
    if (allowsCookies === true) {
      posthog.set_config({
        persistence: "localStorage+cookie",
      });
    }
  }, [allowsCookies]);

  return (
    <Provider client={posthog}>
      <PostHogPageView />
      {children}
    </Provider>
  );
}
