import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import Directory from "./pages/Directory";
import Submit from "./pages/Submit";
import SubmitForm from "./pages/SubmitForm";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import ComponentDetail from "./pages/ComponentDetail";
import NotFound from "./pages/NotFound";
import { isReservedRoute, parseSlugFromPath } from "./lib/slugs";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Route mapping for the components directory
// Production: hosted at /components/* on convex.dev
// Local dev: hosted at /* on localhost
function Router() {
  const path = window.location.pathname;

  // Detect base path: production uses /components, local dev uses /
  const basePath = "/components";
  const normalizedPath = path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;

  // Split path into segments (filter empty strings)
  const segments = normalizedPath
    .split("/")
    .filter((s) => s.length > 0);

  // Handle OAuth callback route
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

// Callback component handles OAuth redirect from WorkOS
function AuthCallback() {
  const { isLoading, user, signIn } = useAuth();
  const [authFailed, setAuthFailed] = useState(false);
  const hasAuthCode = useMemo(
    () => new URLSearchParams(window.location.search).has("code"),
    []
  );
  
  // Get the return path from localStorage (set before sign-in) or default to submit
  const returnPath = useMemo(() => {
    const basePath = window.location.origin.includes("convex.dev") ? "/components" : "";
    const storedPath = localStorage.getItem("authReturnPath");
    
    // Clear the stored path after reading
    if (storedPath) {
      localStorage.removeItem("authReturnPath");
      return storedPath;
    }
    
    // Default to submit page
    return `${basePath}/submit`;
  }, []);

  useEffect(() => {
    // Wait for AuthKit to finish processing the callback
    if (isLoading) {
      return;
    }

    // Redirect after authenticated session is established
    if (user) {
      window.location.replace(returnPath);
      return;
    }

    // If we had a callback code but still no user, auth exchange failed
    if (hasAuthCode) {
      setAuthFailed(true);
      return;
    }

    // Callback route without code: send user back to the return path
    window.location.replace(returnPath);
  }, [hasAuthCode, isLoading, returnPath, user]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-sm text-text-secondary mb-4">
          {authFailed ? "Sign in could not be completed." : "Finishing sign in..."}
        </div>
        {authFailed && (
          <button
            onClick={() => signIn()}
            className="px-4 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// Use redirect URI from env variable as recommended by Convex docs
const redirectUri = import.meta.env.VITE_WORKOS_REDIRECT_URI as string;

createRoot(document.getElementById("root")!).render(
  <AuthKitProvider
    clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
    redirectUri={redirectUri}
  >
    <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
      <div className="antialiased">
        <Router />
      </div>
    </ConvexProviderWithAuthKit>
  </AuthKitProvider>
);
