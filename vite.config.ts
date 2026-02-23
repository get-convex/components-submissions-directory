import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Base path configuration:
  // - Production (npm run build): Uses "/components/" for deployment at convex.dev/components/*
  // - Development (npm run dev): Uses "/" for local development at localhost:5173
  // NODE_ENV is automatically set to "production" during build and "development" during dev
  base: process.env.NODE_ENV === "production" ? "/components/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
