import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// ---------------------------------------------------------
// BASE PATH CONFIGURATION
// ---------------------------------------------------------
// For localhost development, use: base: "/"
// For convex.dev/components/submit deployment, use: base: "/components/submit/"
// ---------------------------------------------------------

export default defineConfig({
  // LOCALHOST: uncomment below, comment out the /components/submit/ line
  // base: "/",

  // CONVEX.DEV DEPLOYMENT
  base: "/components/submit/",

  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
