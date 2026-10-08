// Write-time cleanup of raw HTML in submitter-controlled markdown (README
// blocks, long descriptions, use cases, how it works).
//
// The detail page sanitizes again when it renders (rehype-sanitize with the
// allowlist in src/lib/markdownSanitize.ts), and that is what keeps
// www.convex.dev safe. This is defense in depth: it keeps script-capable HTML
// out of the stored copy that the REST API, llms.txt, SKILL.md and the
// markdown exports hand to other consumers.
//
// Only raw HTML is touched. The markdown parser finds the HTML nodes, so code
// blocks and inline code that show <script> or <iframe> examples are kept.
// Used by the Convex backend (default and Node runtimes), so no DOM APIs.
import { fromMarkdown } from "mdast-util-from-markdown";

// Removed together with everything up to their closing tag
const ELEMENTS_WITH_CONTENT = [
  "script",
  "style",
  "iframe",
  "object",
  "applet",
  "form",
  "template",
  "noscript",
  "noembed",
  "noframes",
  "frameset",
  "textarea",
  "title",
  "xmp",
  "svg",
  "math",
];

// Removed wherever a tag for them appears (opening, closing or void).
// Inline HTML reaches us one tag at a time, so SVG children that can run
// script are listed too, for when their <svg> wrapper is a separate tag.
const BLOCKED_TAGS = [
  ...ELEMENTS_WITH_CONTENT,
  "embed",
  "frame",
  "base",
  "meta",
  "link",
  "param",
  "plaintext",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
  "use",
  "foreignobject",
];

// Attribute values can contain ">", so quoted values are matched as a unit
const TAG_BODY = String.raw`(?:"[^"]*"|'[^']*'|[^"'>])*`;

// The content stops at the next tag of the same name, which keeps matching
// linear on inputs with many unclosed tags
const ELEMENT_WITH_CONTENT_RE = new RegExp(
  String.raw`<(${ELEMENTS_WITH_CONTENT.join("|")})\b${TAG_BODY}>(?:(?!<\/?\1[\s/>])[\s\S])*<\/\1\b[^>]*>`,
  "gi",
);
const BLOCKED_TAG_RE = new RegExp(
  String.raw`<\/?(?:${BLOCKED_TAGS.join("|")})\b${TAG_BODY}>?`,
  "gi",
);
// Any opening tag. An unbalanced quote runs to the next ">", like a browser.
const OPEN_TAG_RE = new RegExp(
  String.raw`<[a-zA-Z][^\s/>]*${TAG_BODY}(?:["'][^>]*)?>?`,
  "g",
);
// Event handlers, srcdoc and formaction. Browsers also accept "/" or a closing
// quote between attributes, so those count as separators too.
const SCRIPT_ATTR_RE =
  /([\s"'/])(?:on[a-z0-9_-]+|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
const URL_ATTR_RE =
  /([\s"'/])(?:href|src|action|poster|data|background|xlink:href|lowsrc|dynsrc|codebase)\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;
const UNSAFE_URL_RE = /^(?:javascript|vbscript|data):/i;

// Enough entity decoding to see through "&#106;avascript:" style tricks
function decodeUrlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);?/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&colon;/gi, ":")
    .replace(/&(?:tab|newline);/gi, "");
}

function isUnsafeUrl(rawValue: string): boolean {
  const unquoted = rawValue.replace(/^["']|["']$/g, "");
  // Browsers skip whitespace and control characters inside a URL scheme
  // eslint-disable-next-line no-control-regex
  const compact = decodeUrlEntities(unquoted).replace(/[\x00-\x20]/g, "");
  return UNSAFE_URL_RE.test(compact);
}

function cleanTag(tag: string): string {
  return tag
    .replace(SCRIPT_ATTR_RE, "$1")
    .replace(URL_ATTR_RE, (attr: string, separator: string, value: string) =>
      isUnsafeUrl(value) ? separator : attr,
    );
}

function cleanHtml(html: string): string {
  let current = html;
  // Removing one construct can expose another (e.g. "<scr<script>ipt>"), so
  // repeat until nothing changes. Each pass only removes text.
  for (let pass = 0; pass < 10; pass++) {
    const next = current
      .replace(ELEMENT_WITH_CONTENT_RE, "")
      .replace(BLOCKED_TAG_RE, "")
      .replace(OPEN_TAG_RE, cleanTag);
    if (next === current) return next;
    current = next;
  }
  // Still changing after 10 passes: deliberately obfuscated, keep nothing
  return "";
}

interface MarkdownNode {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: MarkdownNode[];
}

function collectHtmlRanges(node: MarkdownNode, ranges: Array<[number, number]>) {
  if (node.type === "html") {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) ranges.push([start, end]);
    return;
  }
  for (const child of node.children ?? []) collectHtmlRanges(child, ranges);
}

function cleanHtmlNodes(markdown: string): string {
  const ranges: Array<[number, number]> = [];
  collectHtmlRanges(fromMarkdown(markdown) as MarkdownNode, ranges);

  // Splice from the end so earlier offsets stay valid
  ranges.sort((a, b) => b[0] - a[0]);
  let result = markdown;
  for (const [start, end] of ranges) {
    const html = result.slice(start, end);
    const cleaned = cleanHtml(html);
    if (cleaned !== html) {
      result = result.slice(0, start) + cleaned + result.slice(end);
    }
  }
  return result;
}

/** Remove script-capable HTML from the raw HTML parts of a markdown string. */
export function stripUnsafeHtml(markdown: string): string {
  let current = markdown;
  // Removing a tag can turn the text around it into a new HTML node
  // (e.g. "<a href=x<script></script>>"), so parse again until stable
  for (let pass = 0; pass < 5; pass++) {
    if (!current || !current.includes("<")) return current;
    const next = cleanHtmlNodes(current);
    if (next === current) return next;
    current = next;
  }
  return current;
}
