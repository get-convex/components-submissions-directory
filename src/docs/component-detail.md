# Component Detail Pages

Each approved component has a detail page at `/components/:slug` showing full information and installation instructions.

## Page layout

The detail page has two columns:

### Left sidebar

- **Back link** - Returns to directory
- **npm link** - Direct link to npm package
- **Category** - Component category with link
- **Verified badge** - If Convex verified
- **Community badge** - If community submitted
- **Downloads** - Weekly npm download count
- **Files/Size** - Package statistics
- **Repository link** - GitHub repo link
- **Rating** - Star rating system

### Main content

- **Author row** - Package name, author info, Markdown dropdown
- **Title** - Large component name
- **Install command** - Copy-to-clipboard npm install command
- **SEO content** - AI-generated value proposition, benefits, use cases
- **Long description** - Rendered markdown content
- **Video** - Embedded video if available
- **SKILL.md** - AI agent integration content
- **Agent install section** - Agent-friendly prompts
- **Keywords** - Tag links
- **Related components** - Similar components

## Install command

The install command box shows the npm install command. Click the copy icon to copy to clipboard.

```bash
npm install @convex-dev/component-name
```

## Markdown dropdown

Click the dropdown arrow next to the author info to access:

| Option | Description |
|--------|-------------|
| View markdown source | Toggle raw markdown view |
| Open markdown file | Open .md file in new tab |
| Copy as Markdown | Copy full markdown to clipboard |
| Copy page URL | Copy component page URL |
| Open in ChatGPT | Open markdown URL in ChatGPT |
| Open in Claude | Open markdown URL in Claude |
| Open in Perplexity | Open markdown URL in Perplexity |

## Download SKILL.md

If the component has AI-generated SKILL.md content, a download button appears. This file is designed for AI agent integration (Claude, Cursor, etc.).

## SEO content sections

AI-generated content includes:

- **Value proposition** - One-line benefit statement
- **Benefits** - List of key benefits
- **Use cases** - Common use case scenarios with answers
- **FAQ** - Frequently asked questions
- **Resources** - Related documentation links

## Rating system

Users can rate components 1-5 stars. Ratings are:

- Anonymous (tied to browser session)
- Averaged across all ratings
- Displayed as filled/unfilled stars

## Agent install section

The "Use with agents and CLI" section provides AI-friendly tools for installing components via coding assistants.

### Features

- **Copy prompt** button generates a pre-formatted prompt with package name, install command, and documentation URLs ready to paste into Claude, ChatGPT, or any AI assistant
- **Install in Cursor** button opens a deeplink that configures the MCP server in Cursor with one click
- **Copy MCP config** copies the JSON config block for manual Cursor MCP setup
- **MCP ready** badge appears on components that have a slug and install command

### Feature flags

These features are controlled by environment variables:

| Flag | Env Variable | Effect |
|------|-------------|--------|
| Agent Install Section | `VITE_AGENT_INSTALL_ENABLED` | Shows or hides the entire section |
| MCP Badges | `VITE_MCP_BADGES_ENABLED` | Shows "MCP ready" badge on eligible components |
| MCP Install | `VITE_MCP_ENABLED` | Shows Cursor install and config copy buttons |

When all flags are enabled and the component qualifies, the full agent install experience is available.

## Related components

At the bottom, up to 3 related components are shown based on:

- Shared category
- Overlapping tags
- Download popularity

This section can be toggled on/off in admin settings.

## llms.txt

A link to view the component's llms.txt file appears below keywords. This provides machine-readable component information for AI systems.

The llms.txt file is available at:

- `/api/component-llms?slug=component-slug` (direct API)
- `/components/component-slug/llms.txt` (clean URL via Netlify alias)

It includes package name, description, install command, category, documentation links, and SKILL.md content formatted for LLM context windows.

## SEO features

Each component page includes:

- JSON-LD structured data (SoftwareSourceCode + FAQPage)
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URL
- Meta description
