import React from "react";
import CodeBlock from "./CodeBlock";

type MdProps = {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

/**
 * Shared react-markdown `components` override used across submit preview,
 * detail page, and profile edit. Handles fenced code blocks via Pierre Diffs,
 * renders GFM tables with proper borders, and handles media embeds.
 *
 * Heading, paragraph, list, and blockquote styles are provided by the
 * parent `.markdown-body` CSS class in index.css. These component overrides
 * only handle elements that need React logic (code blocks, images, tables).
 */
export const markdownComponents = {
  code({ className, children, ...rest }: MdProps) {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    if (match || code.includes("\n")) {
      return <CodeBlock code={code} language={match?.[1]} />;
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
  pre({ children }: MdProps) {
    return <>{children}</>;
  },
  img({ src, alt }: { src?: string; alt?: string }) {
    if (src && /\.(mp4|webm|mov)(\?.*)?$/i.test(src)) {
      return (
        <video
          src={src}
          controls
          playsInline
          className="w-full rounded-lg my-4"
          title={alt || "Video"}
        >
          Your browser does not support the video tag.
        </video>
      );
    }
    return (
      <img
        src={src}
        alt={alt || ""}
        className="max-w-full rounded-lg"
        loading="lazy"
      />
    );
  },
  table({ children }: MdProps) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }: MdProps) {
    return <thead className="bg-bg-secondary">{children}</thead>;
  },
  th({ children }: MdProps) {
    return (
      <th className="border border-border px-3 py-2 text-left text-xs font-semibold text-text-primary">
        {children}
      </th>
    );
  },
  td({ children }: MdProps) {
    return (
      <td className="border border-border px-3 py-2 text-xs text-text-secondary">
        {children}
      </td>
    );
  },
  tr({ children }: MdProps) {
    return <tr className="even:bg-bg-secondary/50">{children}</tr>;
  },
};
