/**
 * MCP Profile Builder Utilities
 * Builds MCP-compatible profiles from component data for agent consumption.
 */

import type { McpComponentProfile, McpSearchResult } from "../../shared/mcpTypes";
import { buildComponentClientUrls } from "../../shared/componentUrls";

/**
 * Component data from Convex query (public package shape)
 */
interface ComponentData {
  _id: string;
  name: string;
  componentName?: string;
  description: string;
  shortDescription?: string;
  longDescription?: string;
  installCommand: string;
  repositoryUrl?: string;
  npmUrl: string;
  demoUrl?: string;
  videoUrl?: string;
  version: string;
  weeklyDownloads: number;
  lastPublish?: string;
  category?: string;
  tags?: string[];
  slug?: string;
  authorUsername?: string;
  convexVerified?: boolean;
  skillMd?: string;
  seoGenerationStatus?: string;
}

/**
 * Build an MCP component profile from component data.
 * Only includes fields safe for public exposure.
 */
export function buildMcpProfile(
  component: ComponentData,
  origin: string,
  convexUrl?: string,
): McpComponentProfile | null {
  if (!component.slug) {
    return null;
  }

  const urls = buildComponentClientUrls(component.slug, origin, convexUrl);

  return {
    slug: component.slug,
    displayName: component.componentName || component.name,
    packageName: component.name,
    description: component.longDescription || component.description,
    shortDescription: component.shortDescription,
    category: component.category,
    tags: component.tags,
    install: {
      command: component.installCommand,
      packageManager: detectPackageManager(component.installCommand),
    },
    docs: {
      markdownUrl: urls.markdownUrl,
      llmsUrl: urls.llmsUrl,
      detailUrl: urls.detailUrl,
    },
    links: {
      npm: component.npmUrl,
      repository: component.repositoryUrl,
      demo: component.demoUrl,
      video: component.videoUrl,
    },
    metadata: {
      version: component.version,
      weeklyDownloads: component.weeklyDownloads,
      lastPublish: component.lastPublish,
      authorUsername: component.authorUsername,
    },
    trustSignals: {
      convexVerified: component.convexVerified || false,
      hasSkillMd: Boolean(component.skillMd),
      hasSeoContent: component.seoGenerationStatus === "completed",
      lastUpdated: component.lastPublish
        ? new Date(component.lastPublish).getTime()
        : undefined,
    },
  };
}

/**
 * Build a search result item from component data.
 */
export function buildMcpSearchResult(component: ComponentData): McpSearchResult | null {
  if (!component.slug) {
    return null;
  }

  return {
    slug: component.slug,
    displayName: component.componentName || component.name,
    packageName: component.name,
    shortDescription: component.shortDescription,
    category: component.category,
    weeklyDownloads: component.weeklyDownloads,
    convexVerified: component.convexVerified || false,
  };
}

/**
 * Detect package manager from install command.
 */
function detectPackageManager(
  command: string,
): "npm" | "yarn" | "pnpm" | "bun" {
  if (command.startsWith("yarn ")) return "yarn";
  if (command.startsWith("pnpm ")) return "pnpm";
  if (command.startsWith("bun ")) return "bun";
  return "npm";
}

/**
 * Generate MCP server configuration JSON for a component.
 * Used by CLI and agent apps to connect to the read-only MCP server.
 */
export function generateMcpServerConfig(
  component: ComponentData,
  baseUrl: string,
): string {
  if (!component.slug) {
    return "";
  }

  const config = {
    mcpServers: {
      "convex-component": {
        command: "npx",
        args: ["-y", "@anthropic-ai/mcp-server-fetch"],
        env: {
          CONVEX_COMPONENT_SLUG: component.slug,
          CONVEX_MCP_BASE_URL: baseUrl,
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate CLI install snippet for a component.
 */
export function generateCliInstallSnippet(component: ComponentData): string {
  return component.installCommand;
}

/**
 * Check if a component is MCP ready.
 * A component is MCP ready if it has a slug and install command.
 */
export function isMcpReady(component: ComponentData): boolean {
  return Boolean(component.slug && component.installCommand);
}

/**
 * Check if a component has AI install support.
 * A component has AI install support if it has SKILL.md or SEO content.
 */
export function hasAiInstallSupport(component: ComponentData): boolean {
  return Boolean(component.skillMd || component.seoGenerationStatus === "completed");
}
