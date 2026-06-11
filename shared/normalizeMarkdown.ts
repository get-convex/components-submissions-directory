// Composable markdown cleanup for LLM- and user-authored content before parsing.
// Add new normalizers to DEFAULT_MARKDOWN_NORMALIZERS when we find more quirks.

export type MarkdownNormalizer = (markdown: string) => string;

/** Normalize CRLF / legacy Mac line endings. */
export function normalizeLineEndings(markdown: string): string {
  if (!markdown) return markdown;
  return markdown.replace(/\r\n?/g, "\n");
}

// LLMs often emit Unicode bullets (•) instead of markdown list markers (-).
export function normalizeUnicodeBullets(markdown: string): string {
  if (!markdown) return markdown;

  const UNICODE_BULLET_RE = /^(\s*)[•·▪‣◦⁃]\s+/;
  const INLINE_BULLET_SPLIT_RE = /\s+•\s+/;

  const lines = markdown.split("\n");
  const normalized: string[] = [];

  for (const line of lines) {
    const bulletMatch = line.match(UNICODE_BULLET_RE);
    if (bulletMatch) {
      const [, indent = ""] = bulletMatch;
      normalized.push(`${indent}- ${line.slice(bulletMatch[0].length)}`);
      continue;
    }

    if (line.includes("•")) {
      const parts = line.split(INLINE_BULLET_SPLIT_RE).map((part) => part.trim());
      if (parts.length > 1) {
        for (const part of parts) {
          if (part) normalized.push(`- ${part}`);
        }
        continue;
      }
    }

    normalized.push(line);
  }

  return normalized.join("\n");
}

/** Default pipeline applied to markdown before remark-gfm parses it. */
export const DEFAULT_MARKDOWN_NORMALIZERS: MarkdownNormalizer[] = [
  normalizeLineEndings,
  normalizeUnicodeBullets,
];

export function normalizeMarkdown(
  markdown: string,
  normalizers: MarkdownNormalizer[] = DEFAULT_MARKDOWN_NORMALIZERS,
): string {
  if (!markdown) return markdown;
  return normalizers.reduce((text, normalize) => normalize(text), markdown);
}