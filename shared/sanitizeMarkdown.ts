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
// Markdown parsers disagree about what counts as HTML (GFM footnotes, and the
// normalizeMarkdown pass the page runs first), so every view the page or a
// plain CommonMark reader could take is checked.
// Used by the Convex backend (default and Node runtimes), so no DOM APIs.
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { normalizeMarkdown } from "./normalizeMarkdown";

// Removed together with everything up to their closing tag
const ELEMENTS_WITH_CONTENT = new Set([
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
]);

// Removed wherever a tag for them appears (opening, closing or void).
// Inline HTML reaches us one tag at a time, so SVG children that can run
// script are listed too, for when their <svg> wrapper is a separate tag.
const BLOCKED_TAGS = new Set([
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
]);

// Event handlers, srcdoc and formaction. Browsers also accept "/" or a closing
// quote between attributes, so those count as separators too. Applied to one
// tag at a time, and deliberately also matches inside quoted values.
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

// The tokenizer below follows the HTML spec's tokenizer for the parts that
// decide where a tag or comment ends, so a tag is seen exactly where a
// browser sees one. It never backtracks: each character is visited a bounded
// number of times, so cleaning stays linear on hostile input.

function isHtmlSpace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\f" || ch === "\r";
}

function isAsciiAlpha(ch: string | undefined): boolean {
  return ch !== undefined && /^[a-zA-Z]$/.test(ch);
}

interface Tag {
  name: string;
  closing: boolean;
  // Index just past the tag's ">", or the end of the input
  end: number;
}

// Reads the tag starting at html[start] ("<" then a letter, or "</" then a
// letter). Quotes only open a value right after "=", and a quoted value can
// hold ">" and "<". A tag that never ends runs to the end of the input.
function readTag(html: string, start: number): Tag {
  const length = html.length;
  const closing = html[start + 1] === "/";
  let i = start + (closing ? 2 : 1);
  const nameStart = i;
  while (i < length && !isHtmlSpace(html[i]) && html[i] !== "/" && html[i] !== ">") {
    i++;
  }
  const name = html.slice(nameStart, i).toLowerCase();

  while (i < length) {
    const ch = html[i];
    if (ch === ">") return { name, closing, end: i + 1 };
    if (isHtmlSpace(ch) || ch === "/") {
      i++;
      continue;
    }
    // Attribute name. Its first character is taken as is, even "=".
    i++;
    while (
      i < length &&
      !isHtmlSpace(html[i]) &&
      html[i] !== "/" &&
      html[i] !== ">" &&
      html[i] !== "="
    ) {
      i++;
    }
    while (isHtmlSpace(html[i])) i++;
    if (html[i] !== "=") continue;
    i++;
    while (isHtmlSpace(html[i])) i++;
    const quote = html[i];
    if (quote === '"' || quote === "'") {
      const close = html.indexOf(quote, i + 1);
      if (close === -1) return { name, closing, end: length };
      i = close + 1;
    } else {
      while (i < length && !isHtmlSpace(html[i]) && html[i] !== ">") i++;
    }
  }
  return { name, closing, end: length };
}

// Where a "<!" declaration ends. Comments end at the first "-->" or "--!>"
// ("<!-->" and "<!--->" are empty comments); doctypes and CDATA outside SVG
// end at the next ">".
function declarationEnd(html: string, start: number): number {
  if (html.startsWith("<!--", start)) {
    const body = start + 4;
    if (html[body] === ">") return body + 1;
    if (html.startsWith("->", body)) return body + 2;
    let dashes = html.indexOf("--", body);
    while (dashes !== -1) {
      if (html[dashes + 2] === ">") return dashes + 3;
      if (html[dashes + 2] === "!" && html[dashes + 3] === ">") return dashes + 4;
      dashes = html.indexOf("--", dashes + 1);
    }
    return html.length;
  }
  return bogusCommentEnd(html, start + 2);
}

function bogusCommentEnd(html: string, from: number): number {
  const close = html.indexOf(">", from);
  return close === -1 ? html.length : close + 1;
}

const VALID_TAG_NAME_RE = /^[a-z][a-z0-9-]*$/;

const sameNameTagRes = new Map<string, RegExp>();

// End of an element whose tag was removed along with its content: through
// the next tag with the same name if that is a closing tag. Returns undefined
// when the element isn't closed before another one opens, so only the opening
// tag goes and whatever follows is still scanned.
function elementEnd(html: string, tag: Tag): number | undefined {
  let re = sameNameTagRes.get(tag.name);
  if (!re) {
    re = new RegExp(`<(/?)${tag.name}(?=[\\t\\n\\f\\r />]|$)`, "gi");
    sameNameTagRes.set(tag.name, re);
  }
  re.lastIndex = tag.end;
  const next = re.exec(html);
  if (!next || next[1] !== "/") return undefined;
  return readTag(html, next.index).end;
}

function cleanHtmlOnce(html: string): string {
  let out = "";
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf("<", i);
    if (open === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, open);
    const next = html[open + 1];
    const afterSlash = html[open + 2];

    // Comments, doctypes and other declarations are inert. Keep them whole
    // so nothing inside them is mistaken for a tag.
    let end: number | undefined;
    if (next === "!") end = declarationEnd(html, open);
    else if (next === "?") end = bogusCommentEnd(html, open + 2);
    else if (next === "/" && afterSlash !== undefined && !isAsciiAlpha(afterSlash)) {
      end = bogusCommentEnd(html, open + 2);
    }
    if (end !== undefined) {
      out += html.slice(open, end);
      i = end;
      continue;
    }

    // Not a tag: a literal "<"
    if (!isAsciiAlpha(next) && !(next === "/" && isAsciiAlpha(afterSlash))) {
      out += "<";
      i = open + 1;
      continue;
    }

    const tag = readTag(html, open);
    // Names like "scr<script" are real tags to a browser, but never real
    // content, and React refuses to render them
    if (!VALID_TAG_NAME_RE.test(tag.name)) {
      i = tag.end;
      continue;
    }
    if (BLOCKED_TAGS.has(tag.name)) {
      const withContent = !tag.closing && ELEMENTS_WITH_CONTENT.has(tag.name);
      i = (withContent ? elementEnd(html, tag) : undefined) ?? tag.end;
      continue;
    }
    const text = html.slice(open, tag.end);
    out += tag.closing ? text : cleanTag(text);
    i = tag.end;
  }
  return out;
}

function cleanHtml(html: string): string {
  let current = html;
  // Removing one construct can expose another (e.g. "<scr<script>ipt>"), so
  // repeat until nothing changes. Each pass only removes text.
  for (let pass = 0; pass < 10; pass++) {
    const next = cleanHtmlOnce(current);
    if (next === current) return next;
    current = next;
  }
  // Still changing after 10 passes: deliberately obfuscated, keep nothing
  return "";
}

type ParseOptions = NonNullable<Parameters<typeof fromMarkdown>[1]>;

// What the page's remark-gfm sees, and what a plain CommonMark reader sees
const GFM_PARSE: ParseOptions = {
  extensions: [gfm()],
  mdastExtensions: [gfmFromMarkdown()],
};
const COMMONMARK_PARSE: ParseOptions = {};

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

function cleanHtmlNodes(markdown: string, parse: ParseOptions): string {
  const ranges: Array<[number, number]> = [];
  collectHtmlRanges(fromMarkdown(markdown, parse) as MarkdownNode, ranges);

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
  for (let pass = 0; pass < 6; pass++) {
    if (!current || !current.includes("<")) return current;
    let next = cleanHtmlNodes(
      cleanHtmlNodes(current, GFM_PARSE),
      COMMONMARK_PARSE,
    );
    if (next === current) {
      // The page runs normalizeMarkdown before parsing, which can turn text
      // into HTML (inline code split into list items at " • ", say). Only
      // then is the normalized text kept, so other markdown is stored as
      // written.
      const normalized = normalizeMarkdown(current);
      if (
        normalized === current ||
        cleanHtmlNodes(normalized, GFM_PARSE) === normalized
      ) {
        return current;
      }
      next = normalized;
    }
    current = next;
  }
  // Still changing: deliberately obfuscated. With every "<" escaped there is
  // no raw HTML left for any reader to run.
  return current.replace(/</g, "&lt;");
}
