import React, { useMemo, type ComponentPropsWithoutRef } from "react";
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

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

function buildComponents(repositoryUrl?: string) {
  return {
    code({ className, children, ...rest }: ComponentPropsWithoutRef<"code">) {
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
    pre({ children }: { children?: React.ReactNode }) {
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
    table({ children }: { children?: React.ReactNode }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      );
    },
    thead({ children }: { children?: React.ReactNode }) {
      return <thead className="bg-bg-secondary">{children}</thead>;
    },
    th({ children }: { children?: React.ReactNode }) {
      return (
        <th className="border border-border px-3 py-2 text-left text-xs font-semibold text-text-primary">
          {children}
        </th>
      );
    },
    td({ children }: { children?: React.ReactNode }) {
      return (
        <td className="border border-border px-3 py-2 text-xs text-text-secondary">
          {children}
        </td>
      );
    },
    tr({ children }: { children?: React.ReactNode }) {
      return <tr className="even:bg-bg-secondary/50">{children}</tr>;
    },
  };
}

export interface MarkdownProps {
  children: string;
  /** GitHub repo URL. When set, relative image src / link href resolve against it. */
  repositoryUrl?: string;
}

export function Markdown({ children, repositoryUrl }: MarkdownProps) {
  const components = useMemo(
    () => buildComponents(repositoryUrl),
    [repositoryUrl],
  );
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkAlert]}
      rehypePlugins={[rehypeRaw]}
      components={components as never}
    >
      {children}
    </ReactMarkdown>
  );
}
