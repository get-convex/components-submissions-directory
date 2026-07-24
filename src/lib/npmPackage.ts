// Helpers for npm package name input fields.
// Users type a package name (e.g. "@convex-dev/agent") and we build the npm URL ourselves.

// Official npm package name pattern (supports scoped packages)
const NPM_NAME_PATTERN = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

// Matches a pasted npm package URL so we can pull the name out of it
const NPM_URL_PATTERN = /^https?:\/\/(?:www\.)?npmjs\.com\/package\/(.+?)\/?$/i;

/** True when the string is a valid npm package name (plain or scoped). */
export function isValidNpmPackageName(name: string): boolean {
  return name.length > 0 && name.length <= 214 && NPM_NAME_PATTERN.test(name);
}

/**
 * Normalize user input into a package name.
 * Accepts a plain name or a pasted npmjs.com URL and returns the name.
 */
export function parseNpmPackageInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = NPM_URL_PATTERN.exec(trimmed);
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]);
  }
  return trimmed;
}

/** Build the canonical npm URL for a package name. */
export function buildNpmUrl(name: string): string {
  return `https://www.npmjs.com/package/${name.trim()}`;
}
