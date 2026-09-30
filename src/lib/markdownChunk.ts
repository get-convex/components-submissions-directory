// The markdown renderer chunk, shared by the lazy Markdown wrapper and the
// pages that start loading it early.
export const loadMarkdownRenderer = () =>
  import("../components/MarkdownRenderer");

// Pages that render markdown call this on mount so the chunk downloads in
// parallel with their data instead of after it.
export function preloadMarkdown() {
  // A failed preload is retried when a Markdown block actually renders
  loadMarkdownRenderer().catch(() => {});
}
