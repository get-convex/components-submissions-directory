import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import "remark-github-blockquote-alert/alert.css";
import rehypeRaw from "rehype-raw";
import CodeBlock from "./CodeBlock";
import {
  resolveRepositoryImageSrc,
  resolveRepositoryMarkdownHref,
} from "../lib/markdownLinks";

type MdProps = {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

function buildComponents(repositoryUrl?: string) {
  return {
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
      const resolved = resolveRepositoryImageSrc(src, repositoryUrl);
      if (resolved && VIDEO_EXT_RE.test(resolved)) {
        return (
          <video
            src={resolved}
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
          src={resolved}
          alt={alt || ""}
          className="max-w-full rounded-lg"
          loading="lazy"
        />
      );
    },
    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      if (href && VIDEO_EXT_RE.test(href)) {
        return (
          <video
            src={href}
            controls
            playsInline
            className="w-full rounded-lg my-4"
            title={typeof children === "string" ? children : "Video"}
          >
            Your browser does not support the video tag.
          </video>
        );
      }
      const resolved = resolveRepositoryMarkdownHref(href, repositoryUrl);
      const isExternal = Boolean(resolved?.startsWith("http"));
      return (
        <a
          href={resolved}
          className="text-[#8D2676] hover:underline"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {children}
        </a>
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
}

export interface MarkdownProps {
  children: string;
  /** GitHub repo URL. When set, relative image src / link href resolve against it. */
  repositoryUrl?: string;
  /** Wrapper class. Defaults to "markdown-body". Pass "" to render without a wrapper class. */
  className?: string;
}

export function Markdown({ children, repositoryUrl, className }: MarkdownProps) {
  const components = useMemo(() => buildComponents(repositoryUrl), [repositoryUrl]);
  return (
    <div className={className ?? "markdown-body"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAlert]}
        rehypePlugins={[rehypeRaw]}
        components={components as never}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
