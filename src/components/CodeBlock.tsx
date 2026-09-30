import { File as PierreFile } from "@pierre/diffs/react";
import type { FileContents } from "@pierre/diffs";
import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { bundledLanguages } from "shiki";

// Language detection from fenced code block info string or filename hint
const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  zsh: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  html: "html",
  sql: "sql",
  graphql: "graphql",
  dockerfile: "dockerfile",
  env: "shell",
};

// Shiki treats all of these as plain text, but @pierre/diffs only knows "text"
const PLAIN_TEXT_LANGS = new Set(["text", "txt", "plaintext", "plain"]);

// @pierre/diffs looks every language up in Shiki's bundle and, when it isn't
// there, throws an uncaught rejection and renders an empty block. So anything
// Shiki can't load falls back to plain text. "ansi" is built into Shiki.
function isHighlightable(lang: string): boolean {
  return (
    lang === "ansi" ||
    Object.prototype.hasOwnProperty.call(bundledLanguages, lang)
  );
}

function detectLanguage(langHint?: string | null): string {
  const lower = langHint?.toLowerCase().trim();
  if (!lower || PLAIN_TEXT_LANGS.has(lower)) return "text";
  const lang = LANG_MAP[lower] || lower;
  return isHighlightable(lang) ? lang : "text";
}

interface CodeBlockProps {
  code: string;
  language?: string | null;
  filename?: string;
}

export default function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lang = detectLanguage(language);
  const displayName = filename || `code.${lang === "text" ? "txt" : lang}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  const copyButton = (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[11px] text-white transition-colors hover:bg-black/70"
      title={copied ? "Copied" : "Copy code"}
    >
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );

  // Plain text / no language / unsupported language: use a simple <pre> to avoid syntax highlighter issues
  if (lang === "text") {
    return (
      <div className="relative rounded-lg overflow-hidden my-3 border border-border">
        {copyButton}
        <pre className="bg-[#1e1e2e] text-[#cdd6f4] p-4 overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre">
          {code}
        </pre>
      </div>
    );
  }

  const file: FileContents = {
    name: displayName,
    contents: code,
    lang: lang as FileContents["lang"],
  };

  return (
    <div className="relative rounded-lg overflow-hidden my-3 border border-border">
      {copyButton}
      <PierreFile
        file={file}
        options={{
          theme: "pierre-dark",
        }}
      />
    </div>
  );
}
