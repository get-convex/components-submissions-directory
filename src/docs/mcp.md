# MCP (Model Context Protocol)

The Components Directory implements the Model Context Protocol, a standard for AI tools and agents to discover, query, and install Convex components programmatically. MCP powers the Cursor install buttons, agent prompts, and machine-readable component profiles across the site.

## What is MCP

MCP is a JSON-RPC 2.0 based protocol that lets AI coding assistants (Cursor, Claude, etc.) interact with external services through a standard interface. The directory exposes a protocol endpoint that supports tool discovery and invocation, so agents can search for components, read documentation, and generate install commands without leaving the editor.

## Protocol endpoint

The main MCP entry point is a POST endpoint that accepts JSON-RPC 2.0 requests.

**Endpoint:** `POST /api/mcp/protocol`

### Supported methods

| Method | Description |
|--------|-------------|
| `initialize` | Returns server capabilities and protocol version (`2024-11-05`) |
| `tools/list` | Returns all available MCP tools with their input schemas |
| `tools/call` | Invokes a tool by name with the given arguments |

### Example request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_components",
    "arguments": { "q": "auth", "limit": 5 }
  }
}
```

## Available MCP tools

These tools are callable through the protocol endpoint or directly via REST.

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_components` | Search components by name, description, tags, or category | `q`, `category`, `limit`, `offset` |
| `get_component` | Get full component profile with install info and trust signals | `slug` (required) |
| `get_install_command` | Get the install command for a component | `slug` (required) |
| `get_docs` | Get documentation URLs (markdown, llms.txt, detail page) | `slug` (required) |
| `list_categories` | List all component categories | none |

## REST API endpoints

Each MCP tool is also available as a standalone REST endpoint for simpler integrations.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mcp/search` | Search components. Params: `q`, `category`, `limit` (max 50), `offset` |
| GET | `/api/mcp/component` | Full component profile. Params: `slug` |
| GET | `/api/mcp/install-command` | Install command. Params: `slug` |
| GET | `/api/mcp/docs` | Documentation URLs. Params: `slug` |
| GET | `/api/mcp/info` | Server info with tool definitions |
| GET | `/api/mcp/cursor-install` | Cursor deeplink for the global directory MCP server |
| GET | `/api/mcp/cursor-install-component` | Cursor deeplink for a specific component. Params: `slug` |

All endpoints return JSON and include CORS headers for cross-origin access.

## Cursor integration

The directory generates Cursor IDE deeplinks that let users install the MCP server with one click.

### Global install

The global install link configures Cursor to connect to the full directory. Users can then search, browse, and install any component from within Cursor.

**Link:** `/api/mcp/cursor-install`

### Component-specific install

Each component with a slug and install command gets its own Cursor install link. This pre-configures the MCP server with the component's slug in the environment.

**Link:** `/api/mcp/cursor-install-component?slug=component-slug`

### Cursor MCP config format

The generated config follows Cursor's MCP server format:

```json
{
  "mcpServers": {
    "convex-component": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-fetch", "https://www.convex.dev/api/mcp/protocol"],
      "env": {
        "CONVEX_COMPONENT_SLUG": "component-slug"
      }
    }
  }
}
```

## Component profiles

Each component gets an MCP profile containing structured data for agents. The profile includes:

| Field | Description |
|-------|-------------|
| `slug` | URL-safe identifier |
| `displayName` | Human-readable component name |
| `packageName` | npm package name |
| `description` | Short description |
| `install` | Install command with detected package manager |
| `docs` | URLs for markdown, llms.txt, and detail page |
| `links` | npm, GitHub, demo, and website URLs |
| `metadata` | Category, version, weekly downloads, license |
| `trustSignals` | Convex verified status, community status, rating |

Profiles exclude sensitive data like submitter PII and moderation fields (defined in `MCP_EXCLUDED_FIELDS`).

## Agent Install section

On each component detail page, the "Use with agents and CLI" section provides:

1. **Copy prompt** button with a pre-formatted agent prompt including package name, install command, and documentation links
2. **Install in Cursor** button with a one-click deeplink (when MCP is enabled)
3. **Copy MCP config** for manual Cursor setup
4. **MCP ready** badge for components that have a slug and install command

### Feature flags

The agent install features are controlled by environment variables:

| Flag | Env Variable | Effect |
|------|-------------|--------|
| Agent Install Section | `VITE_AGENT_INSTALL_ENABLED` | Shows or hides the entire section |
| MCP Badges | `VITE_MCP_BADGES_ENABLED` | Shows "MCP ready" badge on eligible components |
| MCP Install | `VITE_MCP_ENABLED` | Shows "Install in Cursor" and config copy buttons |

## MCP types

The shared type definitions in `shared/mcpTypes.ts` define the data contracts:

| Type | Purpose |
|------|---------|
| `McpComponentProfile` | Full component profile for API responses |
| `McpSearchResult` | Lightweight search result |
| `McpToolDefinition` | Tool schema for protocol discovery |
| `McpServerConfig` | Server configuration object |
| `McpUniversalPrompt` | Generated agent prompt |
| `CursorInstallLink` | Cursor deeplink response |
| `McpDirectoryInfo` | Directory-level server info |

## API logging

All MCP API requests are logged to the `mcpApiLogs` table in Convex for analytics and debugging. Logs capture the endpoint path, parameters, and response metadata.
