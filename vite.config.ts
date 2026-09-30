import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Netlify reads _headers and _redirects from the publish root (dist/), but
// Vite builds into dist/components and would copy public/ files there, where
// Netlify never sees them. Copy the rules files from netlify/ after the build.
function netlifyRootFiles(): Plugin {
  return {
    name: "netlify-root-files",
    apply: "build",
    closeBundle() {
      for (const file of ["_headers", "_redirects"]) {
        fs.copyFileSync(
          path.resolve(__dirname, "netlify", file),
          path.resolve(__dirname, "dist", file),
        );
      }
    },
  };
}

export default defineConfig({
  // All URLs under /components/ (HTML, assets, routing)
  base: "/components/",
  build: {
    outDir: "dist/components",
    rollupOptions: {
      // convex's package.json says "sideEffects": false, but Vite only applies
      // that to bare imports like "convex/values". Relative imports inside
      // convex read convex/dist/esm/package.json, which has no sideEffects
      // field. Rollup keeps whichever import of a file resolves first, so
      // chunk contents and hashes changed between builds of the same code.
      treeshake: {
        moduleSideEffects: (id) => !id.includes("/node_modules/convex/"),
      },
    },
  },
  plugins: [react(), netlifyRootFiles()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
