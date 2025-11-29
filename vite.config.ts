import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
// ---------------------------------------------------------
// BASE PATH CONFIGURATION
// ---------------------------------------------------------
// For localhost development, use: base: "/"
// For convex.dev/components/submit deployment, use: base: "/components/submit/"
// ---------------------------------------------------------

// LOCALHOST (uncomment for local development)
// const BASE_PATH = "/";

// CONVEX.DEV DEPLOYMENT (uncomment for production)
const BASE_PATH = "/components/submit/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
