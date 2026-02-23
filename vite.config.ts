import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Base path configuration:
  // - Self-hosting (SELF_HOST=true): Uses "/" for deployment at giant-grouse-674.convex.site
  // - Production (npm run build): Uses "/components/" for deployment at convex.dev/components/*
  // - Development (npm run dev): Uses "/" for local development at localhost:5173
  base: process.env.SELF_HOST === "true"
    ? "/"
    : process.env.NODE_ENV === "production"
      ? "/components/"
      : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
