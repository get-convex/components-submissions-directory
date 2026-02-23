// Slug generation and URL handling for scoped and unscoped npm packages

// Generate a slug from an npm package name
// Rules:
// - @convex-dev/agent -> "agent" (strip first-party scope)
// - @scope/name -> "scope/name" (preserve third-party scope)
// - unscoped-name -> "unscoped-name" (use as-is)
export function generateSlug(npmPackageName: string): string {
  if (!npmPackageName) return "";

  // Scoped package
  if (npmPackageName.startsWith("@")) {
    const parts = npmPackageName.slice(1).split("/");
    if (parts.length !== 2) return npmPackageName;

    const [scope, name] = parts;

    // First-party @convex-dev packages: strip scope
    if (scope === "convex-dev") {
      return name;
    }

    // Third-party scoped: scope/name
    return `${scope}/${name}`;
  }

  // Unscoped package: use name as-is
  return npmPackageName;
}

// Parse slug from URL path segments
// Returns the slug string from path segments after the base
export function parseSlugFromPath(segments: string[]): string {
  if (segments.length === 1) return segments[0];
  if (segments.length === 2) return `${segments[0]}/${segments[1]}`;
  return "";
}

// Check if a path segment is a reserved route (not a slug)
const RESERVED_ROUTES = new Set(["submit", "badge"]);

export function isReservedRoute(segment: string): boolean {
  return RESERVED_ROUTES.has(segment);
}
