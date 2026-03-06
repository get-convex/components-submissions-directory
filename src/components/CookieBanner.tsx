import { useEffect, useState } from "react";
import { useAnalyticsCookies } from "../lib/useAnalyticsCookies";

export default function CookieBanner() {
  const { allowsCookies, setAllowsCookies } = useAnalyticsCookies();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    setShouldShow(allowsCookies === undefined);
  }, [allowsCookies]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-container border border-border bg-white p-3 text-text-primary shadow-md backdrop-blur-sm sm:left-auto sm:max-w-[24rem]">
      <p className="mb-2 text-sm leading-tight">
        We use third-party cookies to understand how people interact with our
        site.
      </p>
      <p className="mb-4 text-sm leading-tight">
        See our{" "}
        <a
          href="https://convex.dev/legal/privacy/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-text-secondary"
        >
          Privacy Policy
        </a>{" "}
        to learn more.
      </p>
      <div className="flex justify-end gap-3">
        <button
          className="rounded-full bg-bg-card px-4 py-2.5 text-sm font-medium leading-none text-text-primary transition-colors hover:bg-bg-card-hover"
          onClick={() => setAllowsCookies(false)}
        >
          Decline
        </button>
        <button
          className="rounded-full bg-button px-4 py-2.5 text-sm font-medium leading-none text-white transition-colors hover:bg-button-hover"
          onClick={() => setAllowsCookies(true)}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
