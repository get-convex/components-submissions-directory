import { useCookies } from "react-cookie";

// Shared cookie name across convex.dev properties to avoid repeated banners.
const COOKIE_NAME = "allowsCookies";

export function useAnalyticsCookies() {
  const [cookies, setCookie] = useCookies([COOKIE_NAME]);

  // undefined means the user has not yet accepted or rejected the banner.
  const allowsCookies = cookies[COOKIE_NAME];

  const setAllowsCookies = (value: boolean) => {
    if (typeof window === "undefined") {
      return;
    }

    const hostname = window.location.hostname;
    const isConvex =
      hostname === "convex.dev" || hostname.endsWith(".convex.dev");

    setCookie(COOKIE_NAME, value, {
      domain: isConvex ? ".convex.dev" : undefined,
      path: "/",
      maxAge: 34560000,
      secure: hostname !== "localhost",
    });
  };

  return { allowsCookies, setAllowsCookies };
}
