import { Suspense, lazy } from "react";
import { loadMarkdownRenderer } from "../lib/markdownChunk";
import type { MarkdownProps } from "./MarkdownRenderer";

// react-markdown, rehype-raw (parse5) and the remark/micromark stack add
// roughly 290 KB of minified JS that the directory and category pages never
// use. Loading the renderer on demand keeps it off their first paint.
const MarkdownRenderer = lazy(loadMarkdownRenderer);

export type { MarkdownProps };

export function Markdown(props: MarkdownProps) {
  return (
    <Suspense fallback={null}>
      <MarkdownRenderer {...props} />
    </Suspense>
  );
}
