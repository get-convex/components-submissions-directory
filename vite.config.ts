import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Netlify reads _headers and _redirects from the publish root (dist/), but
// Vite builds into dist/components and would copy public/ files there, where
// Netlify never sees them. Copy the rules files from netlify/ after the build
// into the folder above outDir: dist/ by default, or the parent of a custom
// --outDir.
function netlifyRootFiles(): Plugin {
  let publishRoot = "";
  return {
    name: "netlify-root-files",
    apply: "build",
    configResolved(config) {
      publishRoot = path.dirname(
        path.resolve(config.root, config.build.outDir),
      );
    },
    closeBundle(error) {
      // Rollup calls this when the build fails too, and a copy error thrown
      // here would be reported instead of the real one
      if (error) return;
      for (const file of ["_headers", "_redirects"]) {
        fs.copyFileSync(
          path.resolve(__dirname, "netlify", file),
          path.resolve(publishRoot, file),
        );
      }
    },
  };
}

// Content Security Policy for the app's HTML, as a <meta> tag added at build
// time. A header would not reach the pages: every HTML route goes through the
// og-meta edge function, and netlify/_headers rules skip edge function
// responses. The meta tag travels inside the HTML, through og-meta and the
// www.convex.dev proxy.
//
// script-src is what matters: injected markup (an <iframe srcdoc> inherits
// this policy) can't run inline script or load script from another origin.
// Inline scripts in index.html are allowed by hash, computed here after Vite
// has filled in the %VITE_*% values. PostHog (@convex-internal/web-analytics)
// loads its config and extensions from https://ap.convex.dev, and session
// replay may start a blob: worker.
function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const inlineScripts = html.matchAll(
          /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
        );
        const hashes = [...inlineScripts].map(
          ([, body]) =>
            `'sha256-${crypto.createHash("sha256").update(body).digest("base64")}'`,
        );
        const policy = [
          ["script-src", "'self'", ...hashes, "https://ap.convex.dev"],
          ["worker-src", "'self'", "blob:"],
          ["object-src", "'none'"],
          ["base-uri", "'self'"],
        ]
          .map((directive) => directive.join(" "))
          .join("; ");
        return {
          html,
          tags: [
            {
              tag: "meta",
              attrs: { "http-equiv": "Content-Security-Policy", content: policy },
              injectTo: "head-prepend",
            },
          ],
        };
      },
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
  plugins: [react(), netlifyRootFiles(), contentSecurityPolicy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
