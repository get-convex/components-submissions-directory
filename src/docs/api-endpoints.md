# Public API Endpoints

The Components Directory exposes several public API endpoints for machine-readable access. These are used by AI agents, documentation tools, and external integrations.

## llms.txt endpoints

The `llms.txt` format provides structured, machine-readable component information designed for large language models and AI agents.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/llms.txt` | Full directory listing in llms.txt format |
| GET | `/components/llms.txt` | Alias for the above (Netlify redirect) |

### Component-level llms.txt

Each approved component has its own llms.txt file:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/component-llms?slug=X` | Component-specific llms.txt |
| GET | `/components/:slug/llms.txt` | Alias via Netlify redirect |

The llms.txt file for a component includes package name, description, install command, category, and documentation links formatted for LLM consumption.

## Markdown endpoints

Markdown endpoints return component content as plain markdown, useful for AI context windows and documentation pipelines.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markdown?slug=X` | Full markdown content for a specific component |
| GET | `/api/markdown-index` | Markdown index of all approved components |
| GET | `/components/:slug/*.md` | Component markdown via Netlify alias |
| GET | `/components.md` | Directory-level markdown index alias |

### Markdown content includes

For individual components, the markdown output contains:

- Component name and description
- Install command
- Category and tags
- Long description (full markdown)
- SEO content sections (if generated)
- SKILL.md content (if available)
- Links to npm, GitHub, demo

## Badge endpoint

Dynamic SVG badges that component authors can embed in their GitHub READMEs.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/badge?slug=X` | SVG badge image for a component |

### Badge format

The badge displays "Convex Components" with a verified or community indicator. It is returned as an SVG image with appropriate cache headers.

### Adding a badge to your README

```markdown
[![Convex Components](https://www.convex.dev/api/badge?slug=your-component)](https://www.convex.dev/components/your-component)
```

### Badge analytics

Each badge fetch is tracked in the `badgeFetches` table. This lets admins see which components have active README badges and how often they are loaded.

## MCP endpoints

For the full MCP (Model Context Protocol) API, see the [MCP documentation](/documentation/mcp). MCP provides JSON-RPC 2.0 tool discovery, REST search, Cursor install deeplinks, and component profiles.

## Netlify aliases

Several Netlify edge redirects provide clean URLs for the API:

| Clean URL | Redirects to |
|-----------|-------------|
| `/components/llms.txt` | `/api/llms.txt` |
| `/components.md` | `/api/markdown-index` |
| `/components/:slug/llms.txt` | `/api/component-llms?slug=:slug` |
| `/components/:slug/*.md` | `/api/markdown?slug=:slug` |

These aliases make URLs predictable for agents that follow common documentation conventions.

## CORS

All API endpoints include CORS headers allowing cross-origin requests. OPTIONS preflight requests are handled automatically.

## Rate limits

API endpoints are subject to Convex function rate limits. For high-volume integrations, use the MCP protocol endpoint which batches requests more efficiently.
