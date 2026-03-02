/**
 * Universal Prompt Composer
 * Generates custom per-component prompts for AI agent installation.
 * Uses layered source strategy with deterministic fallback.
 */

import type { McpUniversalPrompt } from "../../shared/mcpTypes";
import { buildComponentClientUrls } from "../../shared/componentUrls";

/**
 * Component data for prompt generation
 */
interface PromptComponentData {
  name: string;
  componentName?: string;
  shortDescription?: string;
  longDescription?: string;
  installCommand: string;
  repositoryUrl?: string;
  npmUrl: string;
  demoUrl?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  version: string;
  authorUsername?: string;
  seoValueProp?: string;
  seoBenefits?: string[];
  skillMd?: string;
}

/**
 * Generate a universal install prompt for a component.
 * This prompt is generic and does not mention specific tool or IDE names.
 * Uses AI enrichment when available, falls back to deterministic template.
 */
export function generateUniversalPrompt(
  component: PromptComponentData,
  origin: string,
  convexUrl?: string,
): McpUniversalPrompt {
  const displayName = component.componentName || component.name;
  const sourceFieldsUsed: string[] = [];
  let fallbackUsed = false;

  // Build description from layered sources
  let description = "";
  if (component.seoValueProp) {
    description = component.seoValueProp;
    sourceFieldsUsed.push("seoValueProp");
  } else if (component.shortDescription) {
    description = component.shortDescription;
    sourceFieldsUsed.push("shortDescription");
    fallbackUsed = true;
  } else {
    description = `A Convex component for ${component.category || "backend"} functionality.`;
    fallbackUsed = true;
  }

  // Build benefits list from SEO content or generate from tags
  let benefitsList = "";
  if (component.seoBenefits && component.seoBenefits.length > 0) {
    benefitsList = component.seoBenefits.map((b) => `- ${b}`).join("\n");
    sourceFieldsUsed.push("seoBenefits");
  } else if (component.tags && component.tags.length > 0) {
    benefitsList = component.tags.slice(0, 3).map((t) => `- ${t} support`).join("\n");
    sourceFieldsUsed.push("tags");
    fallbackUsed = true;
  }

  // Get documentation URLs
  const urls = component.slug
    ? buildComponentClientUrls(component.slug, origin, convexUrl)
    : null;

  // Build the prompt
  const promptParts: string[] = [];

  promptParts.push(`Install the ${displayName} component in my Convex project.`);
  promptParts.push("");
  promptParts.push(`Component: ${displayName}`);
  promptParts.push(`Package: ${component.name}`);
  promptParts.push(`Version: ${component.version}`);
  promptParts.push("");
  promptParts.push(`Description: ${description}`);

  if (benefitsList) {
    promptParts.push("");
    promptParts.push("Key features:");
    promptParts.push(benefitsList);
  }

  promptParts.push("");
  promptParts.push("Install command:");
  promptParts.push(`\`${component.installCommand}\``);

  if (urls) {
    promptParts.push("");
    promptParts.push("Documentation:");
    promptParts.push(`- Markdown: ${urls.markdownUrl}`);
    promptParts.push(`- LLMs.txt: ${urls.llmsUrl}`);
  }

  if (component.repositoryUrl) {
    promptParts.push(`- Repository: ${component.repositoryUrl}`);
    sourceFieldsUsed.push("repositoryUrl");
  }

  promptParts.push("");
  promptParts.push("Instructions:");
  promptParts.push("1. Read the documentation links above to understand the component");
  promptParts.push("2. Run the install command in the project directory");
  promptParts.push("3. Follow any setup steps from the documentation");
  promptParts.push("4. Return a verification checklist of completed steps");
  promptParts.push("");
  promptParts.push("Use read-only operations. Show the plan before making any edits.");

  sourceFieldsUsed.push("name", "installCommand");

  return {
    promptText: promptParts.join("\n"),
    sourceFieldsUsed,
    fallbackUsed,
    componentSlug: component.slug || component.name,
  };
}

/**
 * Generate a Cursor-specific prompt.
 * Read-only, plan-first approach.
 */
export function generateCursorPrompt(
  component: PromptComponentData,
  origin: string,
  convexUrl?: string,
): string {
  const displayName = component.componentName || component.name;
  const urls = component.slug
    ? buildComponentClientUrls(component.slug, origin, convexUrl)
    : null;

  const parts: string[] = [];
  parts.push(`Install ${displayName} (${component.name}) in this project.`);
  parts.push("");
  parts.push(`Install: ${component.installCommand}`);

  if (urls) {
    parts.push("");
    parts.push(`Read the docs first: ${urls.markdownUrl}`);
  }

  parts.push("");
  parts.push("Use read-only steps only. Show the plan before any edits.");

  return parts.join("\n");
}

/**
 * Generate a Claude-specific prompt.
 * Retrieves command, markdown, llms and generates setup checklist.
 */
export function generateClaudePrompt(
  component: PromptComponentData,
  origin: string,
  convexUrl?: string,
): string {
  const displayName = component.componentName || component.name;
  const urls = component.slug
    ? buildComponentClientUrls(component.slug, origin, convexUrl)
    : null;

  const parts: string[] = [];
  parts.push(`Help me install the ${displayName} component.`);
  parts.push("");
  parts.push(`Package: ${component.name}`);
  parts.push(`Install: ${component.installCommand}`);

  if (urls) {
    parts.push("");
    parts.push("Documentation:");
    parts.push(`- ${urls.markdownUrl}`);
    parts.push(`- ${urls.llmsUrl}`);
  }

  parts.push("");
  parts.push("Please:");
  parts.push("1. Retrieve the install command and documentation");
  parts.push("2. Generate an exact setup checklist for this component");
  parts.push("3. List any required environment variables");
  parts.push("4. Provide verification steps");

  return parts.join("\n");
}

/**
 * Generate a manual safety prompt.
 * No file writes, only lists commands and file changes.
 */
export function generateManualSafetyPrompt(
  component: PromptComponentData,
  origin: string,
  convexUrl?: string,
): string {
  const displayName = component.componentName || component.name;
  const urls = component.slug
    ? buildComponentClientUrls(component.slug, origin, convexUrl)
    : null;

  const parts: string[] = [];
  parts.push(`Show me how to install ${displayName} (${component.name}).`);
  parts.push("");
  parts.push("Requirements:");
  parts.push("- No file writes");
  parts.push("- Only list the commands I need to run");
  parts.push("- Only list the file changes I need to make manually");

  if (urls) {
    parts.push("");
    parts.push(`Reference: ${urls.markdownUrl}`);
  }

  parts.push("");
  parts.push(`Install command: ${component.installCommand}`);

  return parts.join("\n");
}
