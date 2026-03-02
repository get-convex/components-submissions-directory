/**
 * Feature Flags for MCP and Agent Install UX
 * Allows controlled rollout and easy rollback.
 *
 * ROLLBACK INSTRUCTIONS:
 * To disable MCP features, set VITE_MCP_ENABLED=false in .env
 * The MCP HTTP endpoints will still exist but the UI will hide the features.
 *
 * For complete rollback:
 * 1. Set VITE_MCP_ENABLED=false in .env
 * 2. Redeploy the frontend
 * 3. MCP endpoints remain available (backwards compatible) but hidden from UI
 *
 * Existing routes preserved (no changes):
 * - /api/markdown
 * - /api/llms.txt
 * - /api/component-llms
 * - /api/badge
 * - /components/:slug.md (Netlify redirect)
 * - /components/:slug/llms.txt (Netlify redirect)
 */

// MCP and agent install features
export const MCP_ENABLED =
  import.meta.env.VITE_MCP_ENABLED !== "false";

// Agent install section in ComponentDetail
export const AGENT_INSTALL_SECTION_ENABLED =
  import.meta.env.VITE_AGENT_INSTALL_ENABLED !== "false";

// Metadata quality scoring display
export const METADATA_SCORING_ENABLED =
  import.meta.env.VITE_METADATA_SCORING_ENABLED !== "false";

// Copy prompts feature
export const COPY_PROMPTS_ENABLED =
  import.meta.env.VITE_COPY_PROMPTS_ENABLED !== "false";

// MCP badges display
export const MCP_BADGES_ENABLED =
  import.meta.env.VITE_MCP_BADGES_ENABLED !== "false";

// Feature check helper
export function isFeatureEnabled(feature: string): boolean {
  switch (feature) {
    case "mcp":
      return MCP_ENABLED;
    case "agentInstallSection":
      return AGENT_INSTALL_SECTION_ENABLED;
    case "metadataScoring":
      return METADATA_SCORING_ENABLED;
    case "copyPrompts":
      return COPY_PROMPTS_ENABLED;
    case "mcpBadges":
      return MCP_BADGES_ENABLED;
    default:
      return false;
  }
}
