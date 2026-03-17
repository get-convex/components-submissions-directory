// Pure helper to build SKILL.md from v2 content model fields.
// Shared between seoContent.ts (action, "use node") and packages.ts / seoContentDb.ts (mutations).

export interface SkillMdContentInput {
  description: string;
  useCases: string;
  howItWorks: string;
}

export interface SkillMdPackageInput {
  name?: string;
  componentName?: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  repositoryUrl?: string;
  npmUrl?: string;
  demoUrl?: string;
  installCommand?: string;
  slug?: string;
}

export function buildSkillMdFromContent(
  pkg: SkillMdPackageInput,
  content: SkillMdContentInput,
): string {
  const displayName = pkg.componentName || pkg.name || "component";
  const kebabName = (pkg.name || displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const shortDesc = pkg.shortDescription || pkg.description || "";
  const repoUrl = pkg.repositoryUrl || "";
  const npmUrl = pkg.npmUrl || "";
  const installCmd = pkg.installCommand || `npm install ${pkg.name}`;

  const lines: string[] = [];

  lines.push("---");
  lines.push(`name: ${kebabName}`);
  lines.push(
    `description: ${shortDesc} Use this skill whenever working with ${displayName} or related Convex component functionality.`,
  );
  lines.push("---");
  lines.push("");
  lines.push(`# ${displayName}`);
  lines.push("");
  lines.push("## Instructions");
  lines.push("");
  lines.push(content.description);
  lines.push("");
  lines.push("### Installation");
  lines.push("");
  lines.push("```bash");
  lines.push(installCmd);
  lines.push("```");
  lines.push("");
  lines.push("## Use cases");
  lines.push("");
  lines.push(content.useCases);
  lines.push("");
  lines.push("## How it works");
  lines.push("");
  lines.push(content.howItWorks);
  lines.push("");
  lines.push("## When NOT to use");
  lines.push("");
  lines.push(
    "- When a simpler built-in solution exists for your specific use case",
  );
  lines.push("- If you are not using Convex as your backend");
  lines.push(
    `- When the functionality provided by ${displayName} is not needed`,
  );
  lines.push("");
  lines.push("## Resources");
  lines.push("");
  if (npmUrl) lines.push(`- [npm package](${npmUrl})`);
  if (repoUrl) lines.push(`- [GitHub repository](${repoUrl})`);
  if (pkg.demoUrl) lines.push(`- [Live demo](${pkg.demoUrl})`);
  if (pkg.slug) {
    lines.push(
      `- [Convex Components Directory](https://www.convex.dev/components/${pkg.slug})`,
    );
  }
  lines.push("- [Convex documentation](https://docs.convex.dev)");

  return lines.join("\n");
}
