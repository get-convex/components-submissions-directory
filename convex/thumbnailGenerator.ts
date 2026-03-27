"use node";

// Node action for composing 16:9 thumbnails from template + logo
// Uses Jimp for image composition and @resvg/resvg-wasm for SVG rendering
import { v, ConvexError } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdminIdentity } from "./auth";
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
    await requireAdminIdentity(ctx);

    await ctx.scheduler.runAfter(
      0,
      internal.thumbnailGenerator._generateThumbnailForPackage,
      args,
    );

    return null;
  },
});

// Internal worker used by the public admin action.
async function resolveTemplate(ctx: any, templateId?: Id<"thumbnailTemplates">) {
  const template = templateId
    ? await ctx.runQuery(internal.thumbnails._getTemplateById, { templateId })
    : await ctx.runQuery(internal.thumbnails._getDefaultTemplate, {});
  if (!template) throw new ConvexError("No template found. Upload a background template first.");
  return template;
}

async function loadLogoPngBuffer(ctx: any, logoData: any): Promise<Buffer | undefined> {
  if (!logoData) return undefined;
  const logoUrl = await ctx.storage.getUrl(logoData.logoStorageId);
  if (!logoUrl) return undefined;
  const logoResponse = await fetch(logoUrl);
  const logoArrayBuffer = await logoResponse.arrayBuffer();
  const contentType = logoResponse.headers.get("content-type") || "";
  const isSvg =
    contentType.includes("svg") ||
    contentType.includes("xml") ||
    new TextDecoder().decode(logoArrayBuffer.slice(0, 100)).trimStart().startsWith("<");
  return isSvg ? await svgToPngBuffer(Buffer.from(logoArrayBuffer)) : Buffer.from(logoArrayBuffer);
}

async function composeAndUploadThumbnail(ctx: any, template: any, logoPngBuffer: Buffer | undefined) {
  const bgUrl = await ctx.storage.getUrl(template.storageId);
  if (!bgUrl) throw new ConvexError("Could not resolve template URL from storage");
  const bgResponse = await fetch(bgUrl);
  const bgArrayBuffer = await bgResponse.arrayBuffer();
  const resultBuffer = await composeThumbnail(
    Buffer.from(bgArrayBuffer),
    logoPngBuffer,
    template.safeAreaX,
    template.safeAreaY,
    template.safeAreaWidth,
    template.safeAreaHeight,
  );
  const blob = new Blob([resultBuffer], { type: "image/png" });
  return await ctx.storage.store(blob);
}

export const _generateThumbnailForPackage = internalAction({
  args: {
    packageId: v.id("packages"),
    templateId: v.optional(v.id("thumbnailTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jobId: Id<"thumbnailJobs"> = await ctx.runMutation(
      internal.thumbnails._createThumbnailJob,
      { packageId: args.packageId, templateId: args.templateId },
    );

    try {
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "processing" });

      const [logoData, template] = await Promise.all([
        ctx.runQuery(internal.thumbnails._getPackageLogo, { packageId: args.packageId }),
        resolveTemplate(ctx, args.templateId),
      ]);

      // #region agent log
      fetch("http://127.0.0.1:7557/ingest/496d4f8a-92e4-4a9c-a7be-0c1a3758fbbe",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"10e84f"},body:JSON.stringify({sessionId:"10e84f",runId:"pre-fix",hypothesisId:"H2",location:"convex/thumbnailGenerator.ts:99",message:"manual thumbnail worker resolved template and logo prereqs",data:{packageId:args.packageId,jobId,requestedTemplateId:args.templateId ?? null,resolvedTemplateId:template._id,hasLogoData:Boolean(logoData),logoStorageId:logoData?.logoStorageId ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const logoPngBuffer = await loadLogoPngBuffer(ctx, logoData);
      const storageId = await composeAndUploadThumbnail(ctx, template, logoPngBuffer);

      // #region agent log
      fetch("http://127.0.0.1:7557/ingest/496d4f8a-92e4-4a9c-a7be-0c1a3758fbbe",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"10e84f"},body:JSON.stringify({sessionId:"10e84f",runId:"pre-fix",hypothesisId:"H3",location:"convex/thumbnailGenerator.ts:103",message:"manual thumbnail worker composed and uploaded image",data:{packageId:args.packageId,jobId,resolvedTemplateId:template._id,hasLogoPngBuffer:Boolean(logoPngBuffer),storageId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      await ctx.runMutation(internal.thumbnails._saveGeneratedThumbnail, {
        packageId: args.packageId,
        storageId,
        templateId: template._id,
        generatedBy: "admin",
      });

      // #region agent log
      fetch("http://127.0.0.1:7557/ingest/496d4f8a-92e4-4a9c-a7be-0c1a3758fbbe",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"10e84f"},body:JSON.stringify({sessionId:"10e84f",runId:"pre-fix",hypothesisId:"H1",location:"convex/thumbnailGenerator.ts:111",message:"manual thumbnail worker saved package thumbnail metadata",data:{packageId:args.packageId,jobId,storageId,templateId:template._id},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "completed" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      // #region agent log
      fetch("http://127.0.0.1:7557/ingest/496d4f8a-92e4-4a9c-a7be-0c1a3758fbbe",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"10e84f"},body:JSON.stringify({sessionId:"10e84f",runId:"pre-fix",hypothesisId:"H1",location:"convex/thumbnailGenerator.ts:115",message:"manual thumbnail worker failed",data:{packageId:args.packageId,jobId,error:msg},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "failed", error: msg });
      throw error;
    }
    return null;
  },
});

// ============ INTERNAL ACTION: Auto-generation on submit ============

async function checkAutoGenPrereqs(ctx: any, packageId: Id<"packages">) {
  const enabled: boolean = await ctx.runQuery(internal.thumbnails._getAutoGenerateThumbnailEnabled, {});
  if (!enabled) return null;
  const logoData = await ctx.runQuery(internal.thumbnails._getPackageLogo, { packageId });
  if (!logoData) return null;
  const template = await ctx.runQuery(internal.thumbnails._getTemplateForSubmit, { packageId });
  if (!template) return null;
  return { logoData, template };
}

export const _autoGenerateThumbnail = internalAction({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prereqs = await checkAutoGenPrereqs(ctx, args.packageId);
    if (!prereqs) return null;
    const { logoData, template } = prereqs;

    const jobId: Id<"thumbnailJobs"> = await ctx.runMutation(
      internal.thumbnails._createThumbnailJob,
      { packageId: args.packageId, templateId: template._id },
    );

    try {
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "processing" });

      const logoPngBuffer = await loadLogoPngBuffer(ctx, logoData);
      const storageId = await composeAndUploadThumbnail(ctx, template, logoPngBuffer);

      await ctx.runMutation(internal.thumbnails._saveGeneratedThumbnail, {
        packageId: args.packageId,
        storageId,
        templateId: template._id,
        generatedBy: "auto",
      });
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "completed" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "failed", error: msg });
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


export const _autoGenerateThumbnailWithTemplate = internalAction({
  args: {
    packageId: v.id("packages"),
    templateId: v.optional(v.id("thumbnailTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const [logoData, template] = await Promise.all([
      ctx.runQuery(internal.thumbnails._getPackageLogo, { packageId: args.packageId }),
      resolveTemplate(ctx, args.templateId).catch(() => null),
    ]);
    if (!template) return null;

    const jobId: Id<"thumbnailJobs"> = await ctx.runMutation(
      internal.thumbnails._createThumbnailJob,
      { packageId: args.packageId, templateId: template._id },
    );

    try {
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "processing" });

      const logoPngBuffer = await loadLogoPngBuffer(ctx, logoData);
      const storageId = await composeAndUploadThumbnail(ctx, template, logoPngBuffer);

      await ctx.runMutation(internal.thumbnails._saveGeneratedThumbnail, {
        packageId: args.packageId,
        storageId,
        templateId: template._id,
        generatedBy: "batch",
      });
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "completed" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.thumbnails._updateThumbnailJob, { jobId, status: "failed", error: msg });
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
