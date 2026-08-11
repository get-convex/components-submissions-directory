import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  TrendUp,
  ArrowsClockwise,
  Play,
  ImageSquare,
  DownloadSimple,
  Copy,
  XLogo,
  Warning,
} from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Dither dot-matrix chart renderer
// The growth curve is rendered as a halftone dot field on warm cream: a faint
// grid of unfilled dots with filled orange dots rising under the cumulative
// downloads curve. Shared between the live animated canvas and the exported
// share image so both look identical.
// ---------------------------------------------------------------------------

type MonthPoint = { month: string; downloads: number; cumulative: number };

const INK = "#1a1a1a";
const INK_SOFT = "#6b6b6b";
const CREAM = "#F7EEDB";
const CREAM_LIGHT = "#FAF5EA";
const ORANGE = "#DF5D34";
const DOT_FAINT = "rgba(26, 26, 26, 0.07)";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-US");
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[(m ?? 1) - 1]} ${y}`;
}

// Linearly interpolate the cumulative value at fractional month index t (0..1)
function cumulativeAt(months: Array<MonthPoint>, t: number): number {
  if (months.length === 0) return 0;
  if (months.length === 1) return months[0].cumulative;
  const pos = t * (months.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, months.length - 1);
  const frac = pos - lo;
  return (
    months[lo].cumulative + (months[hi].cumulative - months[lo].cumulative) * frac
  );
}

type ChartLayout = {
  plotX: number;
  plotW: number;
};

// Draws the dither chart into a 2d context sized width x height (CSS pixels,
// caller handles devicePixelRatio scaling). progress sweeps 0..1 left to right.
function drawDitherChart(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    months: Array<MonthPoint>;
    progress: number;
    dotGap?: number;
    showLabels?: boolean;
    background?: string | null;
  },
): ChartLayout {
  const { width, height, months, progress } = opts;
  const dotGap = opts.dotGap ?? 10;
  const showLabels = opts.showLabels ?? true;

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const padTop = showLabels ? 26 : 8;
  const padBottom = showLabels ? 28 : 8;
  const padX = 8;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;
  if (plotW <= 0 || plotH <= 0 || months.length === 0) {
    return { plotX: padX, plotW: Math.max(plotW, 0) };
  }

  const cols = Math.max(2, Math.floor(plotW / dotGap));
  const rows = Math.max(2, Math.floor(plotH / dotGap));
  const cellW = plotW / cols;
  const cellH = plotH / rows;
  const dotR = Math.min(cellW, cellH) * 0.34;
  const maxValue = months[months.length - 1].cumulative || 1;

  // Faint background grid: every dot position, unfilled
  ctx.fillStyle = DOT_FAINT;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = padX + c * cellW + cellW / 2;
      const y = padTop + r * cellH + cellH / 2;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Filled dots under the curve, swept left to right with a per-column ease
  ctx.fillStyle = ORANGE;
  const sweep = 0.35; // portion of the timeline each column spends rising
  for (let c = 0; c < cols; c++) {
    const colStart = (c / cols) * (1 - sweep);
    const local = Math.min(Math.max((progress - colStart) / sweep, 0), 1);
    if (local === 0) continue;
    const value = cumulativeAt(months, c / (cols - 1));
    // Any nonzero value keeps at least one row so the early flat era reads
    // as a thin baseline instead of empty space
    const targetRows = Math.max(
      value > 0 ? 1 : 0,
      Math.round((value / maxValue) * rows),
    );
    const filledRows = Math.round(targetRows * easeOutCubic(local));
    for (let r = 0; r < filledRows; r++) {
      const x = padX + c * cellW + cellW / 2;
      const y = padTop + (rows - 1 - r) * cellH + cellH / 2;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (showLabels) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = `11px "GT America", ui-sans-serif, sans-serif`;
    ctx.textBaseline = "top";

    // Max value marker, top left
    ctx.textAlign = "left";
    ctx.fillText(formatCompact(maxValue), padX, 6);

    // Month ticks along the bottom
    const tickCount = Math.min(6, months.length);
    ctx.textBaseline = "alphabetic";
    for (let i = 0; i < tickCount; i++) {
      const t = tickCount === 1 ? 0 : i / (tickCount - 1);
      const idx = Math.round(t * (months.length - 1));
      const x = padX + t * plotW;
      ctx.textAlign = i === 0 ? "left" : i === tickCount - 1 ? "right" : "center";
      ctx.fillText(formatMonthLabel(months[idx].month), x, height - 8);
    }
  }

  return { plotX: padX, plotW };
}

// ---------------------------------------------------------------------------
// Share card rendering (1200 x 630 at 2x for retina-sharp social images)
// ---------------------------------------------------------------------------

const CARD_W = 1200;
const CARD_H = 630;

type ShareCardOptions = {
  months: Array<MonthPoint>;
  title: string;
  totalDownloads: number;
  packagesIncluded: number;
  generatedAt: number;
  chartOnly: boolean;
};

// Make sure the brand fonts are available to the canvas before drawing
async function loadCardFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`400 44px "Publico Headline"`),
      document.fonts.load(`300 56px "GT America"`),
      document.fonts.load(`400 18px "GT America"`),
    ]);
  } catch {
    // Fallback fonts in the font stacks below keep the card usable
  }
}

// Draws one full share card frame in CARD_W x CARD_H coordinates. progress 1
// is the finished card; the video recorder calls this per frame so the chart
// sweeps and the big total counts up.
function drawShareCardFrame(
  ctx: CanvasRenderingContext2D,
  opts: ShareCardOptions,
  progress: number,
): void {
  // Warm paper background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const dateLabel = new Date(opts.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // Count the total up alongside the sweep
  const shownTotal = Math.round(opts.totalDownloads * easeOutCubic(progress));

  if (opts.chartOnly) {
    // Just the hockey stick, edge to edge with breathing room
    ctx.save();
    ctx.translate(48, 40);
    drawDitherChart(ctx, {
      width: CARD_W - 96,
      height: CARD_H - 104,
      months: opts.months,
      progress,
      dotGap: 9,
      showLabels: true,
      background: null,
    });
    ctx.restore();

    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 15px "GT America", ui-sans-serif, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${shownTotal.toLocaleString("en-US")} all time npm downloads · ${dateLabel}`, 48, CARD_H - 28);
    ctx.textAlign = "right";
    ctx.fillText("convex.dev/components", CARD_W - 48, CARD_H - 28);
  } else {
    const pad = 56;

    // Serif headline
    ctx.fillStyle = INK;
    ctx.font = `400 40px "Publico Headline", Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(opts.title, pad, pad + 40, CARD_W - pad * 2);

    // Big total in orange with the label in ink
    ctx.fillStyle = ORANGE;
    ctx.font = `300 58px "GT America", ui-sans-serif, sans-serif`;
    const totalText = shownTotal.toLocaleString("en-US");
    ctx.fillText(totalText, pad, pad + 118);
    const totalWidth = ctx.measureText(totalText).width;
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 20px "GT America", ui-sans-serif, sans-serif`;
    ctx.fillText("all time npm downloads", pad + totalWidth + 16, pad + 118);

    // Chart
    ctx.save();
    ctx.translate(pad, 210);
    drawDitherChart(ctx, {
      width: CARD_W - pad * 2,
      height: 350,
      months: opts.months,
      progress,
      dotGap: 8,
      showLabels: true,
      background: null,
    });
    ctx.restore();

    // Footer
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 16px "GT America", ui-sans-serif, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(
      `${opts.packagesIncluded} components · as of ${dateLabel}`,
      pad,
      CARD_H - 40,
    );
    ctx.textAlign = "right";
    ctx.fillText("convex.dev/components", CARD_W - pad, CARD_H - 40);
  }
}

async function renderShareCard(opts: ShareCardOptions): Promise<Blob> {
  await loadCardFonts();

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W * scale;
  canvas.height = CARD_H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.scale(scale, scale);

  drawShareCardFrame(ctx, opts, 1);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/png",
    );
  });
}

// ---------------------------------------------------------------------------
// Replay video recording
// Records the share card animation off screen with MediaRecorder: a short
// hold on the empty grid, the sweep with the counting total, then a hold on
// the finished card. MP4 when the browser can mux it, WebM otherwise.
// ---------------------------------------------------------------------------

const VIDEO_HOLD_BEFORE_MS = 500;
const VIDEO_SWEEP_MS = 2400;
const VIDEO_HOLD_AFTER_MS = 1600;

function pickVideoMimeType(): string | undefined {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

async function recordReplayVideo(
  opts: ShareCardOptions,
): Promise<{ blob: Blob; mimeType: string }> {
  await loadCardFonts();

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  drawShareCardFrame(ctx, opts, 0);

  const stream = canvas.captureStream(30);
  const mimeType = pickVideoMimeType();
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 6_000_000,
  });
  const chunks: Array<BlobPart> = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    recorder.onerror = () => reject(new Error("Recording failed"));
  });
  recorder.start();

  // Drive the animation on the recorded canvas
  const totalMs = VIDEO_HOLD_BEFORE_MS + VIDEO_SWEEP_MS + VIDEO_HOLD_AFTER_MS;
  const startedAt = performance.now();
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(
        Math.max((elapsed - VIDEO_HOLD_BEFORE_MS) / VIDEO_SWEEP_MS, 0),
        1,
      );
      drawShareCardFrame(ctx, opts, progress);
      if (elapsed < totalMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  const blob = await stopped;
  return { blob, mimeType: recorder.mimeType };
}

// ---------------------------------------------------------------------------
// Live animated chart canvas
// ---------------------------------------------------------------------------

function AnimatedDitherChart({
  months,
  animationKey,
}: {
  months: Array<MonthPoint>;
  animationKey: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<ChartLayout>({ plotX: 0, plotW: 0 });
  const progressRef = useRef(0);
  const [hoverInfo, setHoverInfo] = useState<MonthPoint | null>(null);

  const CHART_HEIGHT = 380;
  const DURATION_MS = 2400;

  const paint = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const width = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = CHART_HEIGHT * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${CHART_HEIGHT}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      layoutRef.current = drawDitherChart(ctx, {
        width,
        height: CHART_HEIGHT,
        months,
        progress,
        dotGap: 10,
        showLabels: true,
        background: null,
      });
    },
    [months],
  );

  // Run the sweep animation on mount, on new data, and on replay
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      progressRef.current = progress;
      paint(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paint, animationKey]);

  // Repaint at the current progress when the container resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => paint(progressRef.current));
    observer.observe(container);
    return () => observer.disconnect();
  }, [paint]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { plotX, plotW } = layoutRef.current;
    if (plotW <= 0 || months.length === 0) return;
    const t = Math.min(Math.max((e.clientX - rect.left - plotX) / plotW, 0), 1);
    const idx = Math.round(t * (months.length - 1));
    setHoverInfo(months[idx]);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="block w-full cursor-crosshair"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverInfo(null)}
      />
      <div className="mt-2 flex h-5 items-center justify-end text-xs text-text-secondary tabular-nums">
        {hoverInfo && (
          <span>
            {formatMonthLabel(hoverInfo.month)} ·{" "}
            <span className="font-medium text-text-primary">
              {hoverInfo.cumulative.toLocaleString("en-US")}
            </span>{" "}
            total ·{" "}
            <span style={{ color: ORANGE }}>
              +{hoverInfo.downloads.toLocaleString("en-US")}
            </span>{" "}
            that month
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Growth tab
// ---------------------------------------------------------------------------

const DEFAULT_TITLE = "Convex Components: All Time npm Downloads";
// Components authoring launched December 2025, so the interesting growth
// window is recent; the chart, image, and video default to 2025 onward
const DEFAULT_RANGE_START = "2025-01";

export default function DownloadsGrowthTab() {
  const series = useQuery(api.downloadsGrowth.getGrowthSeries);
  const generateSeries = useAction(api.downloadsGrowth.generateGrowthSeries);

  const [isGenerating, setIsGenerating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Display range ("YYYY-MM"); null means the default window
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Share image state
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [chartOnly, setChartOnly] = useState(false);
  const [isRenderingCard, setIsRenderingCard] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  // Replay video state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Revoke stale object URLs
  useEffect(() => {
    return () => {
      if (cardUrl) URL.revokeObjectURL(cardUrl);
    };
  }, [cardUrl]);
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Months inside the selected window drive the chart, image, and video.
  // Cumulative values stay all time running totals; the range only frames
  // the view, so the default window starts at Jan 2025.
  const allMonths = series?.months ?? [];
  const seriesStart = allMonths[0]?.month ?? DEFAULT_RANGE_START;
  const seriesEnd = allMonths[allMonths.length - 1]?.month ?? DEFAULT_RANGE_START;
  const defaultStart =
    seriesStart > DEFAULT_RANGE_START ? seriesStart : DEFAULT_RANGE_START;
  const effectiveStart = rangeStart ?? (defaultStart <= seriesEnd ? defaultStart : seriesStart);
  const effectiveEnd = rangeEnd ?? seriesEnd;
  const windowedMonths = allMonths.filter(
    (m) => m.month >= effectiveStart && m.month <= effectiveEnd,
  );
  const visibleMonths = windowedMonths.length >= 2 ? windowedMonths : allMonths;
  // The card and video show the total through the end of the window
  const windowTotal =
    visibleMonths[visibleMonths.length - 1]?.cumulative ??
    series?.totalDownloads ??
    0;

  const handleRangeChange = (which: "start" | "end", value: string) => {
    if (which === "start") {
      setRangeStart(value);
      if (value > effectiveEnd) setRangeEnd(value);
    } else {
      setRangeEnd(value);
      if (value < effectiveStart) setRangeStart(value);
    }
    setAnimationKey((k) => k + 1);
  };

  // Default refresh is incremental: reads the stored all time downloads the
  // dashboard already tracks (no npm calls) and only fetches full history for
  // packages new since the last snapshot. fullRebuild forces a complete
  // refetch from npm for precise month by month attribution.
  const handleRefreshData = async (fullRebuild = false) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generateSeries(fullRebuild ? { fullRebuild } : {});
      const source =
        result.mode === "incremental"
          ? "synced from stored totals"
          : "rebuilt from npm history";
      toast.success(
        `Growth data ${source}: ${result.totalDownloads.toLocaleString("en-US")} downloads across ${result.packagesIncluded} components`,
      );
      if (result.packagesFailed.length > 0) {
        toast.warning(
          `${result.packagesFailed.length} package(s) could not be fetched from npm`,
        );
      }
      setAnimationKey((k) => k + 1);
    } catch {
      toast.error("Failed to generate growth data");
    } finally {
      setIsGenerating(false);
    }
  };

  const shareCardOptions = series
    ? {
        months: visibleMonths,
        title: title.trim() || DEFAULT_TITLE,
        totalDownloads: windowTotal,
        packagesIncluded: series.packagesIncluded,
        generatedAt: series.generatedAt,
        chartOnly,
      }
    : null;

  const handleGenerateImage = async () => {
    if (!shareCardOptions || isRenderingCard) return;
    setIsRenderingCard(true);
    try {
      const blob = await renderShareCard(shareCardOptions);
      setCardBlob(blob);
      setCardUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      toast.success("Share image ready");
    } catch {
      toast.error("Could not render the share image");
    } finally {
      setIsRenderingCard(false);
    }
  };

  // Record the share card animation to a downloadable video (~4.5s)
  const handleGenerateVideo = async () => {
    if (!shareCardOptions || isRecordingVideo) return;
    if (typeof MediaRecorder === "undefined") {
      toast.error("Video recording is not supported in this browser");
      return;
    }
    setIsRecordingVideo(true);
    try {
      const { blob } = await recordReplayVideo(shareCardOptions);
      setVideoBlob(blob);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      toast.success("Replay video ready");
    } catch {
      toast.error("Could not record the replay video");
    } finally {
      setIsRecordingVideo(false);
    }
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `convex-components-downloads-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const handleDownloadVideo = () => {
    if (!videoUrl || !videoBlob) return;
    const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `convex-components-downloads-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
  };

  const handleCopyImage = async (): Promise<boolean> => {
    if (!cardBlob) return false;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": cardBlob }),
      ]);
      toast.success("Image copied to clipboard");
      return true;
    } catch {
      handleDownload();
      toast.info("Clipboard not available, image downloaded instead");
      return false;
    }
  };

  const handlePostOnX = async () => {
    if (!series) return;
    // Best effort: put the image on the clipboard so it can be pasted into the post
    await handleCopyImage();
    const text = `${title.trim() || DEFAULT_TITLE}: ${windowTotal.toLocaleString("en-US")} and counting`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const generatedDate = series
    ? new Date(series.generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Header: the number and the controls */}
      <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-text-secondary">
              <TrendUp size={16} weight="bold" style={{ color: ORANGE }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                All Time Downloads Growth
              </p>
            </div>
            <p className="mt-2 text-4xl font-light text-text-primary tabular-nums sm:text-5xl">
              {series ? series.totalDownloads.toLocaleString("en-US") : "—"}
            </p>
            <p className="mt-1.5 text-xs text-text-secondary">
              {series
                ? `Cumulative npm downloads across ${series.packagesIncluded} approved components · generated ${generatedDate}`
                : "No growth data generated yet"}
            </p>
            {series && series.packagesFailed.length > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-orange-700">
                <Warning size={12} weight="bold" />
                {series.packagesFailed.length} package(s) skipped on the last
                run
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex gap-2">
              <button
                onClick={() => setAnimationKey((k) => k + 1)}
                disabled={!series}
                className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={14} weight="bold" />
                Replay
              </button>
              <button
                onClick={() => void handleRefreshData()}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-lg bg-button px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowsClockwise
                  size={14}
                  weight="bold"
                  className={isGenerating ? "animate-spin" : ""}
                />
                {isGenerating ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
            {series && (
              <button
                onClick={() => void handleRefreshData(true)}
                disabled={isGenerating}
                className="text-xs text-text-secondary underline-offset-2 transition-colors hover:text-text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Full rebuild from npm
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The hockey stick */}
      <div
        className="rounded-lg border border-border p-4 sm:p-6"
        style={{ backgroundColor: CREAM_LIGHT }}
      >
        {series === undefined ? (
          <div className="flex h-[380px] items-center justify-center text-sm text-text-secondary">
            Loading…
          </div>
        ) : series === null ? (
          <div className="flex h-[380px] flex-col items-center justify-center gap-3 text-center">
            <TrendUp size={28} weight="light" className="text-text-secondary" />
            <p className="max-w-sm text-sm text-text-secondary">
              No growth data yet. Generate data to build the all time downloads
              curve from npm download history for every approved component.
              After this one time build, refreshes read from the stored totals.
            </p>
            <button
              onClick={() => void handleRefreshData()}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-button px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowsClockwise
                size={14}
                weight="bold"
                className={isGenerating ? "animate-spin" : ""}
              />
              {isGenerating ? "Fetching npm history…" : "Generate data"}
            </button>
          </div>
        ) : (
          <>
            {/* Date range: frames the chart, share image, and replay video */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span className="font-medium">Range</span>
              <select
                value={effectiveStart}
                onChange={(e) => handleRangeChange("start", e.target.value)}
                className="rounded-md border border-border bg-white px-2 py-1 text-xs text-text-primary outline-none transition-colors focus:border-button"
              >
                {allMonths.map((m) => (
                  <option key={m.month} value={m.month}>
                    {formatMonthLabel(m.month)}
                  </option>
                ))}
              </select>
              <span>to</span>
              <select
                value={effectiveEnd}
                onChange={(e) => handleRangeChange("end", e.target.value)}
                className="rounded-md border border-border bg-white px-2 py-1 text-xs text-text-primary outline-none transition-colors focus:border-button"
              >
                {allMonths.map((m) => (
                  <option key={m.month} value={m.month}>
                    {formatMonthLabel(m.month)}
                  </option>
                ))}
              </select>
              {(rangeStart !== null || rangeEnd !== null) && (
                <button
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                    setAnimationKey((k) => k + 1);
                  }}
                  className="text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
                >
                  Reset
                </button>
              )}
              <span className="ml-auto tabular-nums">
                {windowTotal.toLocaleString("en-US")} through{" "}
                {formatMonthLabel(effectiveEnd)}
              </span>
            </div>
            <AnimatedDitherChart
              months={visibleMonths}
              animationKey={animationKey}
            />
          </>
        )}
      </div>

      {/* Share image builder */}
      <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-text-secondary">
          <ImageSquare size={16} weight="bold" />
          <h3 className="text-sm font-medium text-text-primary">
            Share this growth
          </h3>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          Generate a static 1200 x 630 image or an animated replay video of
          the chart for social media. Both use the range selected above.
          Adjust the title or share the graph on its own.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={chartOnly}
            placeholder={DEFAULT_TITLE}
            maxLength={80}
            className="w-full flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-button disabled:opacity-50"
          />
          <div className="flex shrink-0 items-center rounded-lg border border-border bg-white p-0.5">
            <button
              onClick={() => setChartOnly(false)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !chartOnly
                  ? "bg-button text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Full card
            </button>
            <button
              onClick={() => setChartOnly(true)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                chartOnly
                  ? "bg-button text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Chart only
            </button>
          </div>
          <button
            onClick={() => void handleGenerateImage()}
            disabled={!series || isRenderingCard}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-button-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-button-dark-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImageSquare size={14} weight="bold" />
            {isRenderingCard ? "Rendering…" : "Generate image"}
          </button>
          <button
            onClick={() => void handleGenerateVideo()}
            disabled={!series || isRecordingVideo}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={14} weight="bold" />
            {isRecordingVideo ? "Recording…" : "Generate video"}
          </button>
        </div>

        {cardUrl && (
          <div className="mt-4">
            <img
              src={cardUrl}
              alt="All time downloads share card preview"
              className="w-full max-w-2xl rounded-lg border border-border shadow-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
              >
                <DownloadSimple size={14} weight="bold" />
                Download PNG
              </button>
              <button
                onClick={() => void handleCopyImage()}
                className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
              >
                <Copy size={14} weight="bold" />
                Copy image
              </button>
              <button
                onClick={() => void handlePostOnX()}
                className="flex items-center gap-2 rounded-lg bg-button-dark px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-button-dark-hover"
              >
                <XLogo size={14} weight="bold" />
                Post on X
              </button>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              Post on X copies the image to your clipboard and opens a draft;
              paste the image into the post.
            </p>
          </div>
        )}

        {videoUrl && (
          <div className="mt-4">
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-2xl rounded-lg border border-border shadow-sm"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadVideo}
                className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
              >
                <DownloadSimple size={14} weight="bold" />
                Download video
              </button>
              <p className="text-xs text-text-secondary">
                {videoBlob?.type.includes("mp4")
                  ? "MP4, ready to attach to a post on X."
                  : "WebM (this browser cannot record MP4); convert before uploading to X."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
