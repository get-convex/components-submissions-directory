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

/**
 * MCP directory origin for production.
 * Uses the Convex site URL directly since MCP endpoints are Convex HTTP actions.
 * The frontend UI is at convex.dev/components but API routes go to the Convex site.
 */
const MCP_CONVEX_SITE_URL = "https://third-hedgehog-429.convex.site";
const MCP_SERVER_NAME = "convex-components-directory";

/**
 * Generate Cursor MCP install deeplink.
 * Reference: https://cursor.com/docs/context/mcp/install-links
 */
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate Cursor install link for the global directory MCP server.
 */
export function generateGlobalCursorInstallLink(): {
  serverName: string;
  installLink: string;
  config: object;
} {
  const config = {
    command: "npx",
    args: ["-y", "@anthropic-ai/mcp-server-fetch", `${MCP_CONVEX_SITE_URL}/api/mcp/protocol`],
  };

  const configBase64 = base64UrlEncode(JSON.stringify(config));
  const installLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(MCP_SERVER_NAME)}&config=${configBase64}`;

  return {
    serverName: MCP_SERVER_NAME,
    installLink,
    config,
  };
}

/**
 * Generate Cursor install link for a specific component MCP context.
 */
export function generateComponentCursorInstallLink(component: ComponentData): {
  serverName: string;
  installLink: string;
  config: object;
} | null {
  if (!component.slug) {
    return null;
  }

  const serverName = `convex-component-${component.slug.replace(/\//g, "-")}`;
  const config = {
    command: "npx",
    args: ["-y", "@anthropic-ai/mcp-server-fetch", `${MCP_CONVEX_SITE_URL}/api/mcp/protocol`],
    env: {
      CONVEX_COMPONENT_SLUG: component.slug,
    },
  };

  const configBase64 = base64UrlEncode(JSON.stringify(config));
  const installLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverName)}&config=${configBase64}`;

  return {
    serverName,
    installLink,
    config,
  };
}

/**
 * Get the MCP protocol endpoint URL.
 */
export function getMcpProtocolEndpoint(): string {
  return `${MCP_CONVEX_SITE_URL}/api/mcp/protocol`;
}

/**
 * Get API endpoint for fetching Cursor install link data.
 */
export function getCursorInstallApiUrl(slug?: string): string {
  if (slug) {
    return `${MCP_CONVEX_SITE_URL}/api/mcp/cursor-install-component?slug=${encodeURIComponent(slug)}`;
  }
  return `${MCP_CONVEX_SITE_URL}/api/mcp/cursor-install`;
}

/**
 * Claude Desktop config file paths
 */
export const CLAUDE_DESKTOP_CONFIG_PATHS = {
  macos: "~/Library/Application Support/Claude/claude_desktop_config.json",
  windows: "%AppData%\\Claude\\claude_desktop_config.json",
};

/**
 * Generate Claude Desktop MCP config.
 * Users must manually edit their claude_desktop_config.json file.
 * Reference: https://modelcontextprotocol.io/quickstart/user
 */
export function generateClaudeDesktopConfig(component?: ComponentData): {
  serverName: string;
  config: object;
  configPath: { macos: string; windows: string };
  instructions: string;
} {
  const serverName = component?.slug
    ? `convex-component-${component.slug.replace(/\//g, "-")}`
    : MCP_SERVER_NAME;

  const serverConfig: Record<string, unknown> = {
    command: "npx",
    args: ["-y", "@anthropic-ai/mcp-server-fetch", `${MCP_CONVEX_SITE_URL}/api/mcp/protocol`],
  };

  if (component?.slug) {
    serverConfig.env = {
      CONVEX_COMPONENT_SLUG: component.slug,
    };
  }

  const config = {
    mcpServers: {
      [serverName]: serverConfig,
    },
  };

  return {
    serverName,
    config,
    configPath: CLAUDE_DESKTOP_CONFIG_PATHS,
    instructions: `Add to your claude_desktop_config.json file, then restart Claude Desktop.`,
  };
}

/**
 * Generate ChatGPT custom connector setup info.
 * Users add this via Settings > Apps & Connectors with Developer mode enabled.
 * Reference: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
 */
export function generateChatGPTConnectorConfig(component?: ComponentData): {
  url: string;
  instructions: string;
  requirements: string[];
} {
  const url = component?.slug
    ? `${MCP_CONVEX_SITE_URL}/api/mcp/protocol?slug=${encodeURIComponent(component.slug)}`
    : `${MCP_CONVEX_SITE_URL}/api/mcp/protocol`;

  return {
    url,
    instructions: `Settings > Apps & Connectors > Create, paste the URL as the connector endpoint.`,
    requirements: [
      "ChatGPT Plus, Pro, or Team subscription",
      "Developer mode enabled in Advanced settings",
    ],
  };
}
