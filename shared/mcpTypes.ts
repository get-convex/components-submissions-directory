/**
 * MCP (Machine-Coded Protocol) types for component install intelligence.
 * These types define the public data contract for agent and CLI consumption.
 */

/**
 * Public component profile for MCP responses.
 * Contains only fields safe for public exposure.
 * Excludes submitter PII and internal moderation fields.
 */
export interface McpComponentProfile {
  slug: string;
  displayName: string;
  packageName: string;
  description: string;
  shortDescription?: string;
  category?: string;
  tags?: string[];
  install: {
    command: string;
    packageManager: "npm" | "yarn" | "pnpm" | "bun";
  };
  docs: {
    markdownUrl: string;
    llmsUrl: string;
    detailUrl: string;
  };
  links: {
    npm: string;
    repository?: string;
    demo?: string;
    video?: string;
  };
  metadata: {
    version: string;
    weeklyDownloads: number;
    lastPublish?: string;
    authorUsername?: string;
  };
  trustSignals: {
    convexVerified: boolean;
    hasSkillMd: boolean;
    hasSeoContent: boolean;
    lastUpdated?: number;
  };
}

/**
 * MCP tool definitions for read-only component operations.
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

/**
 * MCP server configuration for a component.
 * Used by CLI and agent apps to connect to the read-only MCP server.
 */
export interface McpServerConfig {
  name: string;
  version: string;
  description: string;
  tools: McpToolDefinition[];
  baseUrl: string;
}

/**
 * Search result for MCP component search.
 */
export interface McpSearchResult {
  slug: string;
  displayName: string;
  packageName: string;
  shortDescription?: string;
  category?: string;
  weeklyDownloads: number;
  convexVerified: boolean;
}

/**
 * Universal install prompt for agents.
 * Generated per-component with customized content.
 */
export interface McpUniversalPrompt {
  promptText: string;
  sourceFieldsUsed: string[];
  fallbackUsed: boolean;
  componentSlug: string;
}

/**
 * Fields explicitly excluded from MCP responses.
 * These contain PII or internal moderation data.
 */
export const MCP_EXCLUDED_FIELDS = [
  "submitterName",
  "submitterEmail",
  "submitterDiscord",
  "additionalEmails",
  "reviewNotes",
  "reviewedBy",
  "reviewedAt",
  "markedForDeletion",
  "markedForDeletionAt",
  "markedForDeletionBy",
  "aiReviewSummary",
  "aiReviewCriteria",
  "aiReviewError",
] as const;

/**
 * Fields from SubmitForm that map to public MCP profile.
 */
export const MCP_PUBLIC_SUBMIT_FIELDS = [
  "componentName",
  "repositoryUrl",
  "npmUrl",
  "demoUrl",
  "category",
  "shortDescription",
  "longDescription",
  "tags",
  "videoUrl",
] as const;
