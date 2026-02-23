"use node";

// Node action for composing 16:9 thumbnails from template + logo
// Uses Jimp for image composition and @resvg/resvg-wasm for SVG rendering
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { Jimp } from "jimp";

// Canvas dimensions for 16:9 thumbnail
const CANVAS_WIDTH = 1536;
const CANVAS_HEIGHT = 864;
// Max logo size relative to safe area (60%)
const LOGO_MAX_RATIO = 0.6;

// ============ PUBLIC ACTION: Admin-triggered generation ============

// Generate a thumbnail for a single package
export const generateThumbnailForPackage = action({
  args: {
    packageId: v.id("packages"),
    templateId: v.optional(v.id("thumbnailTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create job record
    const jobId: Id<"thumbnailJobs"> = await ctx.runMutation(
      internal.thumbnails._createThumbnailJob,
      { packageId: args.packageId, templateId: args.templateId },
    );

    try {
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "processing",
      });

      // Get logo (optional for admin-triggered generation)
      const logoData = await ctx.runQuery(
        internal.thumbnails._getPackageLogo,
        { packageId: args.packageId },
      );

      // Get template
      let template;
      if (args.templateId) {
        template = await ctx.runQuery(internal.thumbnails._getTemplateById, {
          templateId: args.templateId,
        });
      } else {
        template = await ctx.runQuery(
          internal.thumbnails._getDefaultTemplate,
          {},
        );
      }
      if (!template)
        throw new Error("No template found. Upload a background template first.");

      // Load background and optional logo
      const bgUrl = await ctx.storage.getUrl(template.storageId);
      if (!bgUrl) throw new Error("Could not resolve template URL from storage");

      const bgResponse = await fetch(bgUrl);
      const bgArrayBuffer = await bgResponse.arrayBuffer();

      let logoPngBuffer: Buffer | undefined;
      if (logoData) {
        const logoUrl = await ctx.storage.getUrl(logoData.logoStorageId);
        if (logoUrl) {
          const logoResponse = await fetch(logoUrl);
          const logoArrayBuffer = await logoResponse.arrayBuffer();

          // Detect SVG content type
          const logoContentType = logoResponse.headers.get("content-type") || "";
          const isSvg =
            logoContentType.includes("svg") ||
            logoContentType.includes("xml") ||
            new TextDecoder()
              .decode(logoArrayBuffer.slice(0, 100))
              .trimStart()
              .startsWith("<");

          // Convert logo to PNG buffer if SVG
          if (isSvg) {
            logoPngBuffer = await svgToPngBuffer(Buffer.from(logoArrayBuffer));
          } else {
            logoPngBuffer = Buffer.from(logoArrayBuffer);
          }
        }
      }

      // Compose the thumbnail
      const resultBuffer = await composeThumbnail(
        Buffer.from(bgArrayBuffer),
        logoPngBuffer,
        template.safeAreaX,
        template.safeAreaY,
        template.safeAreaWidth,
        template.safeAreaHeight,
      );

      // Upload result to Convex storage
      const blob = new Blob([resultBuffer], { type: "image/png" });
      const storageId = await ctx.storage.store(blob);

      // Save to package
      await ctx.runMutation(internal.thumbnails._saveGeneratedThumbnail, {
        packageId: args.packageId,
        storageId,
        templateId: template._id,
        generatedBy: "admin",
      });

      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "completed",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "failed",
        error: msg,
      });
      throw error;
    }

    return null;
  },
});

// ============ INTERNAL ACTION: Auto-generation on submit ============

export const _autoGenerateThumbnail = internalAction({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if auto-generate is enabled
    const enabled: boolean = await ctx.runQuery(
      internal.thumbnails._getAutoGenerateThumbnailEnabled,
      {},
    );
    if (!enabled) return null;

    // Get logo
    const logoData = await ctx.runQuery(
      internal.thumbnails._getPackageLogo,
      { packageId: args.packageId },
    );
    if (!logoData) return null;

    // Get default template or rotated template (based on admin setting)
    const template = await ctx.runQuery(
      internal.thumbnails._getTemplateForSubmit,
      { packageId: args.packageId },
    );
    if (!template) return null;

    // Create job
    const jobId: Id<"thumbnailJobs"> = await ctx.runMutation(
      internal.thumbnails._createThumbnailJob,
      { packageId: args.packageId, templateId: template._id },
    );

    try {
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "processing",
      });

      const [logoUrl, bgUrl] = await Promise.all([
        ctx.storage.getUrl(logoData.logoStorageId),
        ctx.storage.getUrl(template.storageId),
      ]);
      if (!logoUrl || !bgUrl) throw new Error("Could not resolve image URLs");

      const [logoRes, bgRes] = await Promise.all([
        fetch(logoUrl),
        fetch(bgUrl),
      ]);
      const [logoAB, bgAB] = await Promise.all([
        logoRes.arrayBuffer(),
        bgRes.arrayBuffer(),
      ]);

      const logoContentType = logoRes.headers.get("content-type") || "";
      const isSvg =
        logoContentType.includes("svg") ||
        new TextDecoder().decode(logoAB.slice(0, 100)).trimStart().startsWith("<");

      let logoPngBuffer: Buffer;
      if (isSvg) {
        logoPngBuffer = await svgToPngBuffer(Buffer.from(logoAB));
      } else {
        logoPngBuffer = Buffer.from(logoAB);
      }

      const resultBuffer = await composeThumbnail(
        Buffer.from(bgAB),
        logoPngBuffer,
        template.safeAreaX,
        template.safeAreaY,
        template.safeAreaWidth,
        template.safeAreaHeight,
      );

      const blob = new Blob([resultBuffer], { type: "image/png" });
      const storageId = await ctx.storage.store(blob);

      await ctx.runMutation(internal.thumbnails._saveGeneratedThumbnail, {
        packageId: args.packageId,
        storageId,
        templateId: template._id,
        generatedBy: "auto",
      });

      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "completed",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "failed",
        error: msg,
      });
    }

    return null;
  },
});

// ============ BATCH REGENERATION ============

export const regenerateAllThumbnails = action({
  args: {
    templateId: v.optional(v.id("thumbnailTemplates")),
    onlyMissing: v.optional(v.boolean()),
  },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    const packages: Array<{
      _id: Id<"packages">;
      thumbnailUrl?: string;
    }> = await ctx.runQuery(
      internal.thumbnails._getPackagesWithLogos,
      {},
    );

    let toProcess = packages;
    if (args.onlyMissing) {
      toProcess = packages.filter((p) => !p.thumbnailUrl);
    }

    // Schedule staggered to avoid overload
    for (let i = 0; i < toProcess.length; i++) {
      const delay = i * 2000;
      await ctx.scheduler.runAfter(
        delay,
        internal.thumbnailGenerator._autoGenerateThumbnailWithTemplate,
        { packageId: toProcess[i]._id, templateId: args.templateId },
      );
    }

    return { queued: toProcess.length };
  },
});

// Batch regenerate thumbnails for selected packages.
// If package has logo, compose template + logo. If not, generate template-only thumbnail.
export const regenerateSelectedThumbnails = action({
  args: {
    packageIds: v.array(v.id("packages")),
    templateId: v.optional(v.id("thumbnailTemplates")),
  },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    const uniquePackageIds = Array.from(new Set(args.packageIds));
    for (let i = 0; i < uniquePackageIds.length; i++) {
      const delay = i * 2000;
      await ctx.scheduler.runAfter(
        delay,
        internal.thumbnailGenerator._autoGenerateThumbnailWithTemplate,
        { packageId: uniquePackageIds[i], templateId: args.templateId },
      );
    }
    return { queued: uniquePackageIds.length };
  },
});


// Internal: generate thumbnail with specific or default template (for batch)
export const _autoGenerateThumbnailWithTemplate = internalAction({
  args: {
    packageId: v.id("packages"),
    templateId: v.optional(v.id("thumbnailTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Logo is optional for batch. If missing, generate template-only thumbnail.
    const logoData = await ctx.runQuery(
      internal.thumbnails._getPackageLogo,
      { packageId: args.packageId },
    );

    let template;
    if (args.templateId) {
      template = await ctx.runQuery(internal.thumbnails._getTemplateById, {
        templateId: args.templateId,
      });
    } else {
      template = await ctx.runQuery(
        internal.thumbnails._getDefaultTemplate,
        {},
      );
    }
    if (!template) return null;

    const jobId: Id<"thumbnailJobs"> = await ctx.runMutation(
      internal.thumbnails._createThumbnailJob,
      { packageId: args.packageId, templateId: template._id },
    );

    try {
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "processing",
      });

      const bgUrl = await ctx.storage.getUrl(template.storageId);
      if (!bgUrl) throw new Error("Could not resolve template URL");
      const bgRes = await fetch(bgUrl);
      const bgAB = await bgRes.arrayBuffer();

      let logoPngBuffer: Buffer | undefined;
      if (logoData) {
        const logoUrl = await ctx.storage.getUrl(logoData.logoStorageId);
        if (logoUrl) {
          const logoRes = await fetch(logoUrl);
          const logoAB = await logoRes.arrayBuffer();

          const logoContentType = logoRes.headers.get("content-type") || "";
          const isSvg =
            logoContentType.includes("svg") ||
            new TextDecoder()
              .decode(logoAB.slice(0, 100))
              .trimStart()
              .startsWith("<");

          if (isSvg) {
            logoPngBuffer = await svgToPngBuffer(Buffer.from(logoAB));
          } else {
            logoPngBuffer = Buffer.from(logoAB);
          }
        }
      }

      const result = await composeThumbnail(
        Buffer.from(bgAB),
        logoPngBuffer,
        template.safeAreaX,
        template.safeAreaY,
        template.safeAreaWidth,
        template.safeAreaHeight,
      );

      const blob = new Blob([result], { type: "image/png" });
      const storageId = await ctx.storage.store(blob);

      await ctx.runMutation(internal.thumbnails._saveGeneratedThumbnail, {
        packageId: args.packageId,
        storageId,
        templateId: template._id,
        generatedBy: "batch",
      });

      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "completed",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, {
        jobId,
        status: "failed",
        error: msg,
      });
    }

    return null;
  },
});

// ============ SVG TO PNG CONVERSION ============

// Convert SVG buffer to PNG using @resvg/resvg-wasm
let resvgInitialized = false;

async function svgToPngBuffer(svgBuffer: Buffer): Promise<Buffer> {
  // Dynamically import resvg-wasm (lazy load)
  const { Resvg, initWasm } = await import("@resvg/resvg-wasm");

  if (!resvgInitialized) {
    // Load WASM binary from node_modules
    const fs = await import("fs");
    const path = await import("path");
    const wasmPath = path.join(
      process.cwd(),
      "node_modules",
      "@resvg",
      "resvg-wasm",
      "index_bg.wasm",
    );
    const wasmBuffer = fs.readFileSync(wasmPath);
    await initWasm(wasmBuffer);
    resvgInitialized = true;
  }

  const svgString = svgBuffer.toString("utf-8");
  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width", value: 800 },
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

// ============ IMAGE COMPOSITION ============

// Compose a 16:9 thumbnail by centering logo on background template
async function composeThumbnail(
  bgBuffer: Buffer,
  logoBuffer?: Buffer,
  safeAreaX?: number,
  safeAreaY?: number,
  safeAreaWidth?: number,
  safeAreaHeight?: number,
): Promise<Buffer> {
  // Load background and resize to 16:9 canvas
  const background = await Jimp.read(bgBuffer);
  background.resize({ w: CANVAS_WIDTH, h: CANVAS_HEIGHT });

  // Determine safe area
  const areaX = safeAreaX ?? 0;
  const areaY = safeAreaY ?? 0;
  const areaW = safeAreaWidth ?? CANVAS_WIDTH;
  const areaH = safeAreaHeight ?? CANVAS_HEIGHT;

  if (logoBuffer) {
    // Max logo dimensions
    const maxLogoW = Math.round(areaW * LOGO_MAX_RATIO);
    const maxLogoH = Math.round(areaH * LOGO_MAX_RATIO);

    // Load logo and fit within max dims preserving aspect ratio
    const logo = await Jimp.read(logoBuffer);
    const logoW = logo.width;
    const logoH = logo.height;
    const scale = Math.min(maxLogoW / logoW, maxLogoH / logoH, 1);
    const newW = Math.round(logoW * scale);
    const newH = Math.round(logoH * scale);

    if (scale < 1) {
      logo.resize({ w: newW, h: newH });
    }

    // Center logo within the safe area
    const left = Math.round(areaX + (areaW - (scale < 1 ? newW : logoW)) / 2);
    const top = Math.round(areaY + (areaH - (scale < 1 ? newH : logoH)) / 2);

    // Composite logo on background
    background.composite(logo, left, top);
  }

  // Output as PNG buffer
  const outputBuffer = await background.getBuffer("image/png");
  return outputBuffer;
}
