import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import Admin from "./Admin";
import NotFound from "./NotFound";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Simple routing based on pathname
function Router() {
  const path = window.location.pathname;

  // Known routes
  if (path === "/" || path === "") {
    return <App />;
  }

  if (path === "/admin") {
    return <Admin />;
  }

  // Unknown routes show 404
  return <NotFound />;
}

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <Router />
  </ConvexAuthProvider>,
);
