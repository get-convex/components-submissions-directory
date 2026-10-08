// Allowlist for raw HTML in rendered markdown (README blocks, descriptions,
// use cases). Submitters control this content and rehype-raw turns their HTML
// into real elements on www.convex.dev, so everything goes through
// rehype-sanitize with this schema after rehype-raw.
//
// Starts from rehype-sanitize's GitHub-style defaultSchema, so READMEs render
// the way they do on GitHub (images, picture/source, tables, details/summary,
// kbd, sup/sub, align attributes, task lists, footnotes). Anything not listed
// is dropped: <script>, <style>, <iframe>, <object>, <embed>, <form>, <meta>,
// <link>, <base>, srcdoc, on* handlers, style attributes and javascript: URLs.
import { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeSchema } from "rehype-sanitize";

const defaultAttributes = defaultSchema.attributes ?? {};

// Prefix rehype-sanitize adds to user-supplied id and name attributes so they
// can't clobber globals like window.someName or document lookups by id.
export const USER_CONTENT_ID_PREFIX = "user-content-";

export const markdownSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: USER_CONTENT_ID_PREFIX,
  // Removed together with their contents instead of being unwrapped, so
  // inline CSS, iframe fallback text and form contents never show up as text
  strip: [
    "script",
    "style",
    "iframe",
    "frame",
    "frameset",
    "object",
    "embed",
    "applet",
    "form",
    "template",
    "noscript",
    "noembed",
    "noframes",
    "textarea",
    "title",
    "xmp",
    "plaintext",
  ],
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // READMEs embed demo videos; src is limited to http(s) below
    "video",
    // Icons that remark-github-blockquote-alert adds to [!NOTE] style alerts
    "svg",
    "path",
  ],
  attributes: {
    ...defaultAttributes,
    // remark-github-blockquote-alert wrappers and titles
    div: [
      ...(defaultAttributes.div ?? []),
      ["className", "markdown-alert", /^markdown-alert-[a-z]+$/],
    ],
    p: [...(defaultAttributes.p ?? []), ["className", "markdown-alert-title"]],
    svg: [["className", "octicon"], "viewBox", "width", "height", "ariaHidden"],
    path: ["d"],
    video: ["src", "poster", "controls", "loop", "muted", "playsInline"],
    source: [...(defaultAttributes.source ?? []), "src", "type"],
  },
  protocols: {
    ...defaultSchema.protocols,
    poster: ["http", "https"],
  },
};

// rehype-sanitize prefixes every id and name, so in-page links like "#usage"
// (to an explicit <a name="usage">) or GFM footnote links need the same prefix
// to keep working. GitHub does the same rewrite with JavaScript. Footnotes
// rely on the renderer passing clobberPrefix: "" to remark-rehype, so their
// ids are only prefixed once.
export function toUserContentHash(href: string): string {
  if (!href.startsWith("#") || href.length === 1) return href;
  return `#${USER_CONTENT_ID_PREFIX}${href.slice(1)}`;
}
