import { Suspense, lazy } from "react";

// CodeBlock pulls in @pierre/diffs plus the Shiki highlighter engine and its
// grammar registry, which is far too heavy for the initial bundle. Loading it
// on demand keeps that cost off the first paint of every page.
const CodeBlock = lazy(() => import("./CodeBlock"));

interface CodeBlockLazyProps {
  code: string;
  language?: string | null;
  filename?: string;
}

// Mirrors CodeBlock's own plain-text branch so an unhighlighted block paints
// immediately at the same size; syntax colors appear when the chunk lands.
function PlainCodeFallback({ code }: { code: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden my-3 border border-border">
      <pre className="bg-[#1e1e2e] text-[#cdd6f4] p-4 overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

export default function CodeBlockLazy(props: CodeBlockLazyProps) {
  return (
    <Suspense fallback={<PlainCodeFallback code={props.code} />}>
      <CodeBlock {...props} />
    </Suspense>
  );
}
