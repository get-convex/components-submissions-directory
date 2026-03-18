# Public API Endpoints

The Components Directory exposes several public API endpoints for machine-readable access. These are used by AI agents, documentation tools, external integrations, and developer tooling.

## REST API

Authenticated REST API for programmatic access to the Components Directory.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/components/search` | Search components. Params: `q`, `category`, `limit` (max 50), `offset` |
| GET | `/api/components/detail` | Full component profile. Params: `slug` |
| GET | `/api/components/install` | Install command. Params: `slug` |
| GET | `/api/components/docs` | Documentation URLs. Params: `slug` |
| GET | `/api/components/categories` | List all categories |
| GET | `/api/components/info` | Server info |

### Authentication

Pass your API key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer cdk_your_key_here" \
  https://www.convex.dev/api/components/search?q=auth
```

### Rate limits

| Tier | Limit |
|------|-------|
| Authenticated (API key) | 100 requests per minute |
| Anonymous (no key) | 10 requests per minute |

### Getting an API key

1. Sign in to your profile at `/components/profile`
2. The admin must enable the REST API globally and grant your account access
3. Click "Generate API Key" in the API Access section
4. Copy your key (shown once, stored as SHA-256 hash)
5. One active key per user; revoke and regenerate as needed

Keys use the `cdk_` prefix for identification.

### Access control

The REST API is gated behind:

1. **Global toggle** - Admins enable/disable the API from the API tab (defaults to off, returns 503 when disabled)
2. **Per-user grants** - Admins grant individual users API access by email

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
| GET | `/components/:slug/*.md` | Component markdown via Netlify edge function |
| GET | `/components/components.md` | Directory-level markdown index alias |
| GET | `/components.md` | Directory-level markdown index alias (legacy) |

### Markdown content includes

For individual components, the markdown output contains:

- Component name and description
- Install command
- Category and tags
- Long description (full markdown)
- "From the README.md" section with imported README content
- v2 content sections (Description, Use cases, How it works) when available
- SKILL.md content (if available)
- Links to npm, GitHub, demo

## Badge endpoint

Dynamic SVG badges that component authors can embed in their GitHub READMEs.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/components/badge/your-slug` | SVG badge image for a component |

### Badge format

The badge uses shields.io styling with a `#555555` left box and status-specific colors. It is returned as an SVG image with appropriate cache headers via a Netlify edge function proxy.

### Adding a badge to your README

```markdown
[![Convex Component](https://www.convex.dev/components/badge/your-component)](https://www.convex.dev/components/your-component)
```

### Badge analytics

Each badge fetch is tracked in the `badgeFetches` table. This lets admins see which components have active README badges and how often they are loaded.

## Preflight check endpoint

The preflight checker API validates a GitHub repository against review criteria.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/preflight` | Run preflight check (requires auth token) |

Accepts `repoUrl` and optional `npmUrl`. Returns status, summary, and criteria results. Rate limited to 10 checks per hour per IP, with 30-minute result caching by normalized repo URL.

## MCP endpoints

For the full MCP (Model Context Protocol) API, see the [MCP documentation](/components/documentation/mcp). MCP endpoints are temporarily disabled on the public host while routing is being debugged. The direct Convex endpoint remains functional.

## Netlify aliases and edge functions

| Clean URL | Proxied to |
|-----------|-------------|
| `/components/llms.txt` | `/api/llms.txt` |
| `/components/components.md` | `/api/markdown-index` |
| `/components.md` | `/api/markdown-index` |
| `/components/:slug/llms.txt` | `/api/component-llms?slug=:slug` |
| `/components/:slug/*.md` | `/api/markdown?slug=:slug` (edge function) |
| `/components/badge/:slug` | `/api/badge?slug=:slug` (edge function) |
| `/components/:slug` | OG meta injection edge function |
| `/api/components/*` | REST API proxy to Convex |

## CORS

All API endpoints include CORS headers allowing cross-origin requests. OPTIONS preflight requests are handled automatically.

## Rate limits

Content and MCP endpoints are subject to Convex function rate limits. The REST API has its own two-tier rate limiting. For high-volume integrations, use an API key.
