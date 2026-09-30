// Client-side navigation for the directory SPA.
//
// Every page used to be a full load: plain <a href> links, and main.tsx read
// window.location once. Each click re-downloaded the HTML, re-ran the JS and
// reopened the Convex websocket (~900ms from Australia). Now links to app
// pages update history instead, the Router re-renders from useLocation(), and
// the websocket, JS and cached data stay alive between pages.
//
// Anything that isn't an app page (files, API routes, the OAuth callback,
// other sites, the Next.js convex.dev pages) still does a normal full load.
import { useLayoutEffect, useSyncExternalStore } from "react";
import { setCanonicalUrl } from "./seo";

const NAVIGATE_EVENT = "directory:navigate";
const APP_ROOT = "/components";
const SITE_ORIGIN = "https://www.convex.dev";
// How long the pointer has to rest on a link before its data is prefetched
const HOVER_INTENT_MS = 80;

// Paths under /components that are served by Netlify or Convex, not the app
const NON_APP_PREFIXES = [
  "/components/callback",
  "/components/badge/",
  "/components/assets/",
  "/components/fonts/",
  "/components/images/",
  "/components/_img/",
  "/components/_src/",
  "/components/api/",
];

export function isAppPath(pathname: string): boolean {
  if (pathname !== APP_ROOT && !pathname.startsWith(`${APP_ROOT}/`)) {
    return false;
  }
  if (NON_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  // Files such as get-convex.md, llms.txt or sitemap.xml
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !/\.[a-z0-9]+$/i.test(lastSegment);
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

function getLocationSnapshot() {
  return window.location.pathname + window.location.search;
}

// Current pathname and search, re-rendering on navigate() and Back/Forward
export function useLocation() {
  const snapshot = useSyncExternalStore(subscribe, getLocationSnapshot);
  const queryStart = snapshot.indexOf("?");
  return queryStart === -1
    ? { pathname: snapshot, search: "" }
    : {
        pathname: snapshot.slice(0, queryStart),
        search: snapshot.slice(queryStart),
      };
}

// Merge values into the current history entry's state (scroll position,
// directory filters) so Back can restore them
export function updateHistoryState(values: Record<string, unknown>) {
  const current = (window.history.state ?? {}) as Record<string, unknown>;
  try {
    window.history.replaceState({ ...current, ...values }, "");
  } catch {
    // Safari throttles replaceState (e.g. while typing a search); losing one
    // update only means Back restores slightly older state
  }
}

export function readHistoryState<T>(key: string): T | undefined {
  const state = window.history.state as Record<string, unknown> | null;
  return state?.[key] as T | undefined;
}

function updateCanonical(pathname: string) {
  setCanonicalUrl(`${SITE_ORIGIN}${pathname.replace(/\/+$/, "") || APP_ROOT}`);
}

// Where to scroll once the next page has rendered: the top (or a #hash) for
// a new page, or the saved position when going Back/Forward. Applied by
// useScrollOnNavigate after React commits, so it never scrolls the old page.
let pendingScroll: (() => number) | null = null;

function hashTarget(hash: string): number {
  const element = hash
    ? document.getElementById(decodeURIComponent(hash.slice(1)))
    : null;
  return element ? element.getBoundingClientRect().top + window.scrollY : 0;
}

// Pages restored from cache are tall enough straight away; give slower
// content up to ~1.5s to grow before settling for the closest position
function scrollWhenReady(getTarget: () => number, attempt = 0) {
  const target = getTarget();
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (target <= maxScroll || attempt >= 30) {
    window.scrollTo(0, Math.min(target, Math.max(maxScroll, 0)));
    return;
  }
  setTimeout(() => scrollWhenReady(getTarget, attempt + 1), 50);
}

// Call from the Router with the current location so each navigation scrolls
// after its page is in the DOM but before the browser paints it
export function useScrollOnNavigate(locationKey: string) {
  useLayoutEffect(() => {
    const getTarget = pendingScroll;
    pendingScroll = null;
    if (getTarget) scrollWhenReady(getTarget);
  }, [locationKey]);
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin || !isAppPath(url.pathname)) {
    if (options.replace) window.location.replace(url.href);
    else window.location.assign(url.href);
    return;
  }
  const path = url.pathname + url.search + url.hash;
  if (path === getLocationSnapshot() + window.location.hash) {
    // Same page: like a normal link to the current URL, no new history
    // entry, and nothing re-renders, so scroll straight away
    window.scrollTo(0, hashTarget(url.hash));
    return;
  }
  if (options.replace) {
    window.history.replaceState(null, "", path);
  } else {
    // Remember where we were so Back returns to the same spot
    updateHistoryState({ scrollY: window.scrollY });
    window.history.pushState(null, "", path);
  }
  updateCanonical(url.pathname);
  pendingScroll = () => hashTarget(url.hash);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

// Links that should keep their default browser behaviour
function shouldHandleClick(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href);
  if (url.origin !== window.location.origin || !isAppPath(url.pathname)) {
    return false;
  }
  // In-page anchors on the current page are left to the browser
  const samePage =
    url.pathname === window.location.pathname &&
    url.search === window.location.search;
  return !(samePage && url.hash);
}

function closestAnchor(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<HTMLAnchorElement>("a[href]")
    : null;
}

// Wire up link interception, Back/Forward scroll restoration and prefetch on
// hover or touch. Call once before rendering the app.
export function installNavigation(
  onIntent: (pathname: string) => void = () => {},
) {
  document.addEventListener("click", (event) => {
    const anchor = closestAnchor(event.target);
    if (!anchor || !shouldHandleClick(event, anchor)) return;
    event.preventDefault();
    const url = new URL(anchor.href);
    navigate(url.pathname + url.search + url.hash);
  });

  // Registered before React subscribes, so this runs before the re-render
  window.addEventListener("popstate", () => {
    updateCanonical(window.location.pathname);
    pendingScroll = () => readHistoryState<number>("scrollY") ?? 0;
  });

  // Start loading a page's data as soon as someone shows intent to open it:
  // resting the pointer on a link (the delay skips links the mouse only
  // passes over on its way across the grid) or touching it
  const intentPath = (anchor: HTMLAnchorElement | null) => {
    if (!anchor) return null;
    const url = new URL(anchor.href);
    return url.origin === window.location.origin && isAppPath(url.pathname)
      ? url.pathname
      : null;
  };
  let hoverAnchor: HTMLAnchorElement | null = null;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  document.addEventListener(
    "pointerover",
    (event) => {
      const anchor = closestAnchor(event.target);
      if (anchor === hoverAnchor) return;
      hoverAnchor = anchor;
      clearTimeout(hoverTimer);
      const path = intentPath(anchor);
      if (path) hoverTimer = setTimeout(() => onIntent(path), HOVER_INTENT_MS);
    },
    { passive: true },
  );
  document.addEventListener(
    "touchstart",
    (event) => {
      const path = intentPath(closestAnchor(event.target));
      if (path) onIntent(path);
    },
    { passive: true },
  );
}
