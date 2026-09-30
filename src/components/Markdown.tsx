import { Component, Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { loadMarkdownRenderer } from "../lib/markdownChunk";
import type { MarkdownProps } from "./MarkdownRenderer";

// react-markdown, rehype-raw (parse5) and the remark/micromark stack add
// roughly 290 KB of minified JS that the directory and category pages never
// use. Loading the renderer on demand keeps it off their first paint.
const MarkdownRenderer = lazy(loadMarkdownRenderer);

export type { MarkdownProps };

// If the renderer chunk fails to load (offline, or a deploy removed the old
// file), show the raw text rather than letting the error unmount pages that
// have no error boundary of their own, like the submit form preview.
class MarkdownLoadBoundary extends Component<
  { text: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="whitespace-pre-wrap">{this.props.text}</div>
    ) : (
      this.props.children
    );
  }
}

export function Markdown(props: MarkdownProps) {
  return (
    <MarkdownLoadBoundary text={props.children}>
      <Suspense fallback={null}>
        <MarkdownRenderer {...props} />
      </Suspense>
    </MarkdownLoadBoundary>
  );
}
