import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import "./index.css";
// Build hash refresh: 2026-02-27
import Directory from "./pages/Directory";
import Submit from "./pages/Submit";
import SubmitForm from "./pages/SubmitForm";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import ComponentDetail from "./pages/ComponentDetail";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";
import { isReservedRoute, parseSlugFromPath } from "./lib/slugs";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
  verbose: true,
});

// Route mapping for the components directory
// Production: Netlify at components-directory.netlify.app/components/*
// Local dev: localhost:5173/components/*
function Router() {
  const path = window.location.pathname;

  // Always use /components as base path (both local and production)
  const basePath = "/components";

  // Redirect paths that don't start with /components to the prefixed version
  if (!path.startsWith(basePath)) {
    const redirectPath = basePath + (path === "/" ? "" : path);
    window.location.replace(redirectPath);
    return null;
  }

  const normalizedPath = path.slice(basePath.length) || "/";

  // Split path into segments (filter empty strings)
  const segments = normalizedPath
    .split("/")
    .filter((s) => s.length > 0);

  // Handle OAuth callback route (kept for post-auth redirect handling)
  if (segments[0] === "callback") {
    return <AuthCallback />;
  }

  // No segments: directory listing (public)
  if (segments.length === 0) {
    return <Directory />;
  }

  // Submissions routes
  if (segments[0] === "submissions") {
    // /submissions/admin = Admin dashboard (requires @convex.dev email)
    if (segments.length === 2 && segments[1] === "admin") {
      return <Admin />;
    }
    // /submissions = Public submissions directory (table view)
    return <Submit />;
  }

  // /submit = Auth-gated submission form
  if (segments[0] === "submit") {
    return <SubmitForm />;
  }

  // Profile page for managing user submissions
  if (segments[0] === "profile") {
    return <Profile />;
  }

  // Badge routes are handled server-side (Convex HTTP), never reach here
  if (segments[0] === "badge") {
    return <NotFound />;
  }

  // Everything else is a slug lookup (single or two-segment)
  if (segments.length <= 2 && !isReservedRoute(segments[0])) {
    const slug = parseSlugFromPath(segments);
    if (slug) {
      return <ComponentDetail slug={slug} />;
    }
  }

  return <NotFound />;
}

// Callback component handles post-OAuth redirect
function AuthCallback() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [authFailed, setAuthFailed] = useState(false);
  const hasAuthCode = useMemo(
    () => new URLSearchParams(window.location.search).has("code"),
    []
  );
  
  // Get the return path from localStorage (set before sign-in) or default to submit
  const returnPath = useMemo(() => {
    const storedPath = localStorage.getItem("authReturnPath");
    
    // Clear the stored path after reading
    if (storedPath) {
      localStorage.removeItem("authReturnPath");
      return storedPath;
    }
    
    // Default to submit page (always under /components)
    return "/components/submit";
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Redirect after authenticated session is established
    if (isAuthenticated) {
      window.location.replace(returnPath);
      return;
    }

    // If we had a callback code but still not authenticated, auth exchange failed
    if (hasAuthCode) {
      setAuthFailed(true);
      return;
    }

    // Callback route without code: send user back to the return path
    window.location.replace(returnPath);
  }, [hasAuthCode, isLoading, returnPath, isAuthenticated]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-sm text-text-secondary mb-4">
          {authFailed ? "Sign in could not be completed." : "Finishing sign in..."}
        </div>
        {authFailed && (
          <button
            onClick={() => void signIn("github")}
            className="px-4 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <div className="antialiased min-h-screen flex flex-col">
      <div className="flex-1">
        <Router />
      </div>
      <div className="pt-[50px]">
        <Footer />
      </div>
    </div>
  </ConvexAuthProvider>
);
