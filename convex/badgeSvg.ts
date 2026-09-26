// Shields.io "flat" badge renderer. Output matches badge-maker's flat style so
// README badges sit cleanly next to other shields badges.

// Verdana 11px normal widths for char codes 32..126 (from anafanafo, the table
// shields.io uses to size badge text).
const VERDANA_11_WIDTHS: ReadonlyArray<number> = [
  3.87, 4.33, 5.05, 9, 6.99, 11.84, 7.99, 2.95, 5, 5, 6.99, 9, 4, 5, 4, 5, 6.99,
  6.99, 6.99, 6.99, 6.99, 6.99, 6.99, 6.99, 6.99, 6.99, 5, 5, 9, 9, 9, 6, 11,
  7.52, 7.54, 7.68, 8.48, 6.96, 6.32, 8.53, 8.27, 4.63, 5, 7.62, 6.12, 9.27,
  8.23, 8.66, 6.63, 8.66, 7.65, 7.52, 6.78, 8.05, 7.52, 10.88, 7.54, 6.77, 7.54,
  5, 5, 5, 9, 6.99, 6.99, 6.61, 6.85, 5.73, 6.85, 6.55, 3.87, 6.85, 6.96, 3.02,
  3.79, 6.51, 3.02, 10.7, 6.96, 6.68, 6.85, 6.85, 4.69, 5.73, 4.33, 6.96, 6.51,
  9, 6.51, 6.51, 5.78, 6.98, 5, 6.98, 9,
];

// Unknown characters are sized like "m", same as shields guess mode
const FALLBACK_WIDTH = 10.7;

export const BADGE_LABEL_COLOR = "#555";

export const BADGE_COLORS = {
  approved: "#4c1",
  in_review: "#2563eb",
  changes_requested: "#ea580c",
  pending: "#ca8a04",
  rejected: "#dc2626",
  not_found: "#6b6b6b",
} as const;

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function measureText(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0;
    width += VERDANA_11_WIDTHS[code - 32] ?? FALLBACK_WIDTH;
  }
  return width;
}

// Shields floors the measured width then bumps even values to odd so text centers on a pixel
function preferredWidthOf(str: string): number {
  const width = Math.floor(measureText(str));
  return width % 2 === 0 ? width + 1 : width;
}

export function renderShieldsBadge({
  label,
  message,
  color,
}: {
  label: string;
  message: string;
  color: string;
}): string {
  const horizPadding = 5;
  const labelText = label.trim();
  const messageText = message.trim();

  const labelWidth = preferredWidthOf(labelText);
  const messageWidth = preferredWidthOf(messageText);
  const leftWidth = labelWidth + 2 * horizPadding;
  const rightWidth = messageWidth + 2 * horizPadding;
  const width = leftWidth + rightWidth;

  // Text is drawn at 10x size then scaled down for sub-pixel accurate placement
  const labelX = 10 * (1 + labelWidth / 2 + horizPadding);
  const messageX = 10 * (leftWidth - 1 + messageWidth / 2 + horizPadding);

  const safeLabel = escapeXml(labelText);
  const safeMessage = escapeXml(messageText);
  const accessibleText = `${safeLabel}: ${safeMessage}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${accessibleText}"><title>${accessibleText}</title><filter id="blur"><feGaussianBlur stdDeviation="16"/></filter><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="${leftWidth}" height="20" fill="${BADGE_LABEL_COLOR}"/><rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/><rect width="${width}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">${textGroup(labelX, labelWidth * 10, safeLabel)}${textGroup(messageX, messageWidth * 10, safeMessage)}</g></svg>`;
}

// Soft blurred shadow, crisp 30% shadow 1px lower, then white text on top.
// Every BADGE_COLORS value is dark enough for white text by shields' brightness rule.
function textGroup(x: number, textLength: number, content: string): string {
  return `<g transform="scale(.1)"><g aria-hidden="true" fill="#010101"><text x="${x}" y="150" fill-opacity=".8" filter="url(#blur)" textLength="${textLength}">${content}</text><text x="${x}" y="150" fill-opacity=".3" textLength="${textLength}">${content}</text></g><text x="${x}" y="140" textLength="${textLength}">${content}</text></g>`;
}
