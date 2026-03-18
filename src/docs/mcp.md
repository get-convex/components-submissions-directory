# MCP (Model Context Protocol)

The Components Directory was designed with MCP support for AI tools and agents to discover, query, and install Convex components programmatically. MCP backend routes and frontend install UI are currently disabled while public host routing is resolved. The code is preserved in the codebase for re-enablement.

## Current status

**All MCP endpoints are disabled.** The `/api/mcp/*` routes have been removed from `convex/http.ts`. The frontend MCP install buttons, MCP ready badge, and multi-platform config tabs in `AgentInstallSection.tsx` are commented out.

**What still works:**

- The "Copy prompt" button on component detail pages (generates an agent-friendly prompt with package name, install command, and docs links)
- The Components REST API at `/api/components/*` (search, detail, install, docs, categories, info)
- llms.txt endpoints for AI agent discovery
- Markdown endpoints for component content
- All shared MCP types and utility code in the codebase

**What is disabled:**

- `/api/mcp/protocol` JSON-RPC 2.0 endpoint
- `/api/mcp/search`, `/api/mcp/component`, `/api/mcp/install-command`, `/api/mcp/docs`, `/api/mcp/info`
- `/api/mcp/cursor-install`, `/api/mcp/cursor-install-component`
- "Install in Cursor" button on component detail pages
- "MCP ready" badge on component cards
- Multi-platform MCP config tabs (Cursor, Claude Desktop, ChatGPT)

## What is MCP

MCP is a JSON-RPC 2.0 based protocol that lets AI coding assistants (Cursor, Claude, etc.) interact with external services through a standard interface. When re-enabled, the directory would expose a protocol endpoint that supports tool discovery and invocation, so agents can search for components, read documentation, and generate install commands without leaving the editor.

## Designed protocol endpoint

The MCP entry point was designed to support Streamable HTTP transport, accepting both GET (server discovery) and POST (JSON-RPC 2.0) requests.

**Direct Convex endpoint (not currently routed):** `https://giant-grouse-674.convex.site/api/mcp/protocol`

### Designed methods

| Method | Description |
|--------|-------------|
| `initialize` | Returns server capabilities and protocol version |
| `tools/list` | Returns all available MCP tools with their input schemas |
| `tools/call` | Invokes a tool by name with the given arguments |

## Designed MCP tools

These tools were built but are not currently routed:

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_components` | Search components by name, description, tags, or category | `q`, `category`, `limit`, `offset` |
| `get_component` | Get full component profile with install info and trust signals | `slug` (required) |
| `get_install_command` | Get the install command for a component | `slug` (required) |
| `get_docs` | Get documentation URLs (markdown, llms.txt, detail page) | `slug` (required) |
| `list_categories` | List all component categories | none |

## Components REST API (active)

For programmatic access to the directory, use the authenticated REST API at `/api/components/*` which replaced the MCP REST endpoints. See the [API endpoints documentation](/components/documentation/api-endpoints) for details on search, detail, install, docs, categories, info endpoints, authentication with API keys, and rate limits.

## Agent Install section (partially active)

On each component detail page, the "Use with agents and CLI" section currently provides:

1. **Copy prompt** button with a pre-formatted agent prompt including package name, install command, and documentation links

The following are commented out and will return when MCP routing is fixed:

- "Install in Cursor" button with a one-click deeplink
- Multi-platform MCP config tabs (Cursor, Claude Desktop, ChatGPT)
- "Copy config" button that adapts to the selected platform
- "MCP ready" badge on eligible components

### Feature flags

The agent install features are controlled by environment variables:

| Flag | Env Variable | Effect |
|------|-------------|--------|
| Agent Install Section | `VITE_AGENT_INSTALL_ENABLED` | Shows or hides the entire section |
| MCP Badges | `VITE_MCP_BADGES_ENABLED` | Shows "MCP ready" badge (currently no effect while commented out) |
| MCP Install | `VITE_MCP_ENABLED` | Shows Cursor install and config buttons (currently no effect while commented out) |

## MCP config format (for re-enablement)

When re-enabled, the directory would use Streamable HTTP transport with no npm packages or local processes needed.

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "convex-components-directory": {
      "url": "https://giant-grouse-674.convex.site/api/mcp/protocol"
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "convex-components-directory": {
      "url": "https://giant-grouse-674.convex.site/api/mcp/protocol"
    }
  }
}
```

**ChatGPT**: Use the connector URL in Settings > Apps and Connectors > Create.

## MCP types

The shared type definitions in `shared/mcpTypes.ts` define the data contracts and remain in the codebase:

| Type | Purpose |
|------|---------|
| `McpComponentProfile` | Full component profile for API responses |
| `McpSearchResult` | Lightweight search result |
| `McpToolDefinition` | Tool schema for protocol discovery |
| `McpServerConfig` | Server configuration object |
| `McpUniversalPrompt` | Generated agent prompt |
| `CursorInstallLink` | Cursor deeplink response |
| `McpDirectoryInfo` | Directory-level server info |

## Re-enabling MCP

To bring MCP back online:

1. Re-register the `/api/mcp/*` routes in `convex/http.ts` (the handler functions still exist in the file)
2. Uncomment the MCP badge and multi-platform install sections in `src/components/AgentInstallSection.tsx`
3. Verify Netlify proxy rules for `/api/mcp/*` and `/components/api/mcp/*` are active in `netlify.toml`
4. Test that `www.convex.dev/components/api/mcp/protocol` returns JSON-RPC responses instead of SPA HTML

## API logging

All REST API requests are logged to the `mcpApiLogs` table in Convex for analytics and debugging. Logs capture the endpoint path, parameters, response metadata, API key ID (for authenticated requests), and hashed IP for rate limiting.
