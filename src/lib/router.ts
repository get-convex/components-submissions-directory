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
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { resetPageMetadata, setCanonicalUrl } from "./seo";

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

function currentPath() {
  return (
    window.location.pathname + window.location.search + window.location.hash
  );
}

// The URL plus the history entry's id, so moving between two entries with the
// same URL, or only a different #hash, still re-renders and scrolls
function getLocationSnapshot() {
  return `${currentPath()}\n${currentEntryKey}`;
}

// Current location, re-rendering on navigate() and Back/Forward. entryKey
// identifies the history entry, for state that belongs to one entry.
export function useLocation() {
  const snapshot = useSyncExternalStore(subscribe, getLocationSnapshot);
  const [path, entryKey] = snapshot.split("\n");
  const url = new URL(path, window.location.origin);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    entryKey,
  };
}

// History writes can throw: Safari refuses them when they come too fast
function writeHistory(write: () => void): boolean {
  try {
    write();
    return true;
  } catch {
    return false;
  }
}

function historyState(): Record<string, unknown> {
  return (window.history.state ?? {}) as Record<string, unknown>;
}

function readHistoryState<T>(name: string): T | undefined {
  return historyState()[name] as T | undefined;
}

// ---- Per-entry state ----
// Each history entry gets an id in history.state. When an entry is left, by a
// link or by Back/Forward, its scroll position and any page state registered
// with useEntryState are recorded under that id, so returning to the entry
// restores them. Nothing is written while a page is in use (Safari limits
// how often history can be written); values are also copied into the entry
// itself when a link is followed, so they survive a reload.
let currentEntryKey = "";
const entryStates = new Map<string, Record<string, unknown>>();
const stateReaders = new Map<string, () => unknown>();

function newEntryKey() {
  return Math.random().toString(36).slice(2);
}

function collectEntryState() {
  const state: Record<string, unknown> = { scrollY: window.scrollY };
  for (const [name, read] of stateReaders) state[name] = read();
  entryStates.set(currentEntryKey, state);
  return state;
}

// State saved for the current history entry, if any
export function readEntryState<T>(name: string): T | undefined {
  const saved = entryStates.get(currentEntryKey);
  return saved && name in saved
    ? (saved[name] as T)
    : readHistoryState<T>(name);
}

// Save this page state with the history entry whenever it's left
export function useEntryState(name: string, value: unknown) {
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  useEffect(() => {
    stateReaders.set(name, () => latest.current);
    return () => {
      stateReaders.delete(name);
    };
  }, [name]);
}

// ---- Scrolling ----
// Where to scroll once the next page has rendered: the top (or a #hash) for
// a new page, or the saved position when going Back/Forward. Applied by
// useScrollOnNavigate after React commits, so it never scrolls the old page.
let pendingScroll: (() => number | null) | null = null;

// Where a #hash points, 0 without one, or null while its element hasn't
// rendered yet (a page can still be showing its previous content)
function hashTarget(hash: string): number | null {
  if (!hash) return 0;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape like #%: look for the id as written
  }
  const element = document.getElementById(id);
  if (!element) return null;
  // Leave the gap the page asks for (like scroll-mt-24 below the sticky
  // header), the way the browser does when it follows an #anchor
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  return Math.max(
    0,
    element.getBoundingClientRect().top + window.scrollY - margin,
  );
}

// Bumped by every navigation and every scroll it starts, so retries left
// over from an earlier navigation stop instead of scrolling the page that
// replaced it
let scrollGeneration = 0;

// Set where the next page scrolls, or null to leave the scroll alone
function setPendingScroll(getTarget: (() => number | null) | null) {
  scrollGeneration++;
  pendingScroll = getTarget;
}

// Pages restored from cache are tall enough straight away; give slower
// content (or a #hash target that hasn't rendered yet) up to ~1.5s before
// settling for the closest position
function scrollWhenReady(
  getTarget: () => number | null,
  generation = ++scrollGeneration,
  attempt = 0,
) {
  if (generation !== scrollGeneration) return;
  const target = getTarget();
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const ready = target !== null && target <= maxScroll;
  if (ready || attempt >= 30) {
    window.scrollTo(0, Math.min(target ?? 0, Math.max(maxScroll, 0)));
    return;
  }
  setTimeout(() => scrollWhenReady(getTarget, generation, attempt + 1), 50);
}

// Call once from the Router so each navigation scrolls after its page is in
// the DOM but before the browser paints it
export function useScrollOnNavigate() {
  const snapshot = useSyncExternalStore(subscribe, getLocationSnapshot);
  useLayoutEffect(() => {
    const getTarget = pendingScroll;
    pendingScroll = null;
    if (getTarget) scrollWhenReady(getTarget);
  }, [snapshot]);
}

// ---- Navigating ----
// The page the app last showed, to tell a new page from an in-page change
let shownPathname = "";
let shownSearch = "";

// Keep head tags in step with the page: the canonical link always, and the
// rest reset to the site defaults when the page changes, before the new page
// sets its own. Pages without their own tags then don't keep the last one's.
// /components/x and /components/x/ are the same page
function pagePath(pathname: string) {
  return pathname.replace(/\/+$/, "") || APP_ROOT;
}

function onLocationChange() {
  const page = pagePath(window.location.pathname);
  const canonical = `${SITE_ORIGIN}${page}`;
  if (page !== pagePath(shownPathname)) resetPageMetadata(canonical);
  setCanonicalUrl(canonical);
  shownPathname = window.location.pathname;
  shownSearch = window.location.search;
}

export function navigate(
  to: string,
  options: { replace?: boolean; scroll?: boolean } = {},
) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin || !isAppPath(url.pathname)) {
    if (options.replace) window.location.replace(url.href);
    else window.location.assign(url.href);
    return;
  }
  const path = url.pathname + url.search + url.hash;
  const samePath = path === currentPath();
  if (samePath && (options.replace || url.hash)) {
    // Already there: a redirect has nothing to do, and a #hash link to the
    // current URL only scrolls, like it does in the browser
    if (!options.replace && options.scroll !== false) {
      scrollWhenReady(() => hashTarget(url.hash));
    }
    return;
  }
  // A link to the current URL starts the page over in the same history
  // entry, like the full load it used to be, so the directory's search and
  // filters reset
  if (options.replace || samePath) {
    // The entry now shows a new page, so it gets a new id and drops what
    // was saved for the old one
    entryStates.delete(currentEntryKey);
    const key = newEntryKey();
    if (!writeHistory(() => window.history.replaceState({ key }, "", path))) {
      window.location.replace(url.href);
      return;
    }
    currentEntryKey = key;
  } else {
    // Remember where we were (and the page's state) so Back returns there
    const leaving = collectEntryState();
    writeHistory(() =>
      window.history.replaceState({ ...historyState(), ...leaving }, ""),
    );
    const key = newEntryKey();
    if (!writeHistory(() => window.history.pushState({ key }, "", path))) {
      // Rather than lose the click, fall back to a normal page load
      window.location.assign(url.href);
      return;
    }
    currentEntryKey = key;
  }
  onLocationChange();
  setPendingScroll(
    options.scroll === false ? null : () => hashTarget(url.hash),
  );
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

// A plain click on a #anchor link within the current page
function isInPageHashLink(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (anchor.target && anchor.target !== "_self")
  ) {
    return false;
  }
  const url = new URL(anchor.href);
  return (
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash !== ""
  );
}

function closestAnchor(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<HTMLAnchorElement>("a[href]")
    : null;
}

// Wire up link interception, Back/Forward restoration and prefetch on hover
// or touch. Call once before rendering the app.
export function installNavigation(
  onIntent: (pathname: string) => void = () => {},
) {
  document.addEventListener("click", (event) => {
    const anchor = closestAnchor(event.target);
    if (!anchor) return;
    if (shouldHandleClick(event, anchor)) {
      event.preventDefault();
      const url = new URL(anchor.href);
      navigate(url.pathname + url.search + url.hash);
    } else if (isInPageHashLink(event, anchor)) {
      // The browser follows in-page #anchor links itself (and fires
      // hashchange, which some pages listen for). Save the position first,
      // since it has already scrolled to the anchor by the time popstate fires
      collectEntryState();
    }
  });

  currentEntryKey = readHistoryState<string>("key") ?? newEntryKey();
  writeHistory(() =>
    window.history.replaceState(
      { ...historyState(), key: currentEntryKey },
      "",
    ),
  );
  shownPathname = window.location.pathname;
  shownSearch = window.location.search;

  // Registered before React subscribes, so this runs before the re-render,
  // while the page being left is still on screen
  window.addEventListener("popstate", () => {
    const existingKey = readHistoryState<string>("key");
    const samePage =
      window.location.pathname === shownPathname &&
      window.location.search === shownSearch;
    if (!existingKey && samePage) {
      // A brand-new entry: the browser just followed an in-page #anchor link
      // and has already scrolled to it, and the click handler saved where we
      // were. Give the entry an id so Back/Forward can find it later.
      currentEntryKey = newEntryKey();
      writeHistory(() =>
        window.history.replaceState(
          { ...historyState(), key: currentEntryKey },
          "",
        ),
      );
      setPendingScroll(null);
      return;
    }
    collectEntryState();
    const key = existingKey ?? newEntryKey();
    currentEntryKey = key;
    if (!existingKey) {
      // An entry written by other code: adopt it
      writeHistory(() =>
        window.history.replaceState({ ...historyState(), key }, ""),
      );
    }
    onLocationChange();
    setPendingScroll(
      () =>
        (entryStates.get(key)?.scrollY as number | undefined) ??
        readHistoryState<number>("scrollY") ??
        0,
    );
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
