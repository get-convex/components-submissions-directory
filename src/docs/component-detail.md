# Component Detail Pages

Each approved component has a detail page at `/components/:slug` showing full information and installation instructions.

## Page layout

The detail page has two columns:

### Left sidebar

- **Back link** - Returns to directory
- **npm link** - Direct link to npm package
- **Discord username** - Links to Convex community Discord (if provided)
- **License** - Package license (renders above category when available)
- **Category** - Component category with link to category landing page (when category is enabled)
- **Verified badge** - If Convex verified
- **Community badge** - If community submitted (appears below verified badge)
- **Downloads** - Weekly npm download count
- **Files/Size** - Package statistics
- **Repository link** - GitHub repo link
- **Rating** - Star rating system
- **How to get help** - Small modal trigger for support guidance
- **Security Analyze** - Opens a security report modal with scan status, providers, and recommendations

### Main content

- **Author row** - Package name, author info, Markdown dropdown, conditional Download Skill button
- **Title** - Large component name
- **Install command** - Copy-to-clipboard npm install command
- **AI-generated content** - Description, Use cases, How it works sections (v2 content model)
- **Long description** - Rendered markdown with GitHub-style typography
- **From the README** - Imported README content with separator heading
- **Video** - Embedded video if available
- **For Agents** - Agent-friendly section (when visible)
- **Agent install section** - Copy prompt for AI assistants
- **SKILL.md** - AI agent integration content block
- **Keywords** - Tag links
- **View llms.txt** - Link to machine-readable component data
- **Related components** - Up to 3 related components

## Install command

The install command box shows the npm install command. Click the copy icon to copy to clipboard.

```bash
npm install @convex-dev/component-name
```

## Markdown dropdown

Click the dropdown arrow next to the author info to access:

| Option | Description |
|--------|-------------|
| Open markdown file | Open .md file in new tab |
| Copy as Markdown | Copy full markdown to clipboard |
| Copy page URL | Copy component page URL |
| Open in ChatGPT | Open markdown URL in ChatGPT |
| Open in Claude | Open markdown URL in Claude |
| Open in Perplexity | Open markdown URL in Perplexity |

## Download SKILL.md

If the component has AI-generated SKILL.md content, a download button appears in the author row. This file is designed for AI agent integration (Claude, Cursor, etc.). SKILL.md is generated during submit, profile edit, admin regeneration, and content model migration.

## Content sections

The v2 content model generates structured sections using AI grounded on the GitHub README and Convex docs context:

- **Description** - Component overview
- **Use cases** - Common scenarios and applications
- **How it works** - Technical explanation of the component

All content sections render with GitHub-style markdown typography using the `.markdown-body` CSS class, including proper heading hierarchy, nested list bullets, inline code, blockquotes, GFM tables, and task list checkboxes.

### README rendering

README content supports:

- GitHub Flavored Markdown tables with borders and alternating row shading
- Inline HTML from GitHub READMEs (`<div align="center">`, `<strong>`, badge images) via `rehype-raw`
- Video URLs (`.mp4`, `.webm`, `.mov`) rendered as native `<video>` elements instead of broken images
- Relative links like `CONTRIBUTING.md` resolved against the GitHub repository

## Help modal

The "How to get help" modal in the sidebar:

- Points to GitHub Issues when a repository URL exists
- Links to the Convex community at `https://convex.dev/community`
- Shows a third-party component notice for community submissions

## Security Analyze

The "Security Analyze" link in the sidebar opens a modal showing the latest security scan results for the component:

- **Status** line indicating whether the component has been scanned and the result
- **Providers** section listing Socket.dev and Snyk with links to run your own scan
- **Recommendations** from the automated scan (when available)
- **Contact the component author** section with a link to GitHub Issues (shown when findings or recommendations exist)
- **Third-party component notice** reminding users that community components are not maintained by Convex

If the component has not been scanned yet, the modal shows a notice to review the repository manually.

## Rating system

Users can rate components 1-5 stars. Ratings are:

- Anonymous (tied to browser session)
- Averaged across all ratings
- Displayed as filled/unfilled stars

## Agent install section

The "Use with agents and CLI" section provides AI-friendly tools for installing components via coding assistants.

### Features

- **Copy prompt** button generates a pre-formatted prompt with package name, install command, and documentation URLs ready to paste into Claude, ChatGPT, or any AI assistant
- **Agent-friendly summary** with install command, setup steps, and verification checklist

Multi-platform MCP install buttons (Cursor, Claude Desktop, ChatGPT tabs) are temporarily hidden while public host MCP routing is being debugged.

### Feature flags

These features are controlled by environment variables:

| Flag | Env Variable | Effect |
|------|-------------|--------|
| Agent Install Section | `VITE_AGENT_INSTALL_ENABLED` | Shows or hides the entire section |
| MCP Badges | `VITE_MCP_BADGES_ENABLED` | Shows "MCP ready" badge on eligible components |
| MCP Install | `VITE_MCP_ENABLED` | Shows Cursor install and config copy buttons |

## Related components

At the bottom, up to 3 related components are shown based on:

- Shared category
- Overlapping tags
- Download popularity

This section can be toggled on or off in admin settings (`showRelatedOnDetailPage`, on by default).

## Admin visibility controls

Admins can hide generated SEO and SKILL content from the public detail page while keeping it editable in the admin dashboard. When hidden, the For Agents section, Agent Install section, SKILL download, SKILL.md block, and View llms.txt link are all hidden together.

## Review state handling

- **Approved** pages are indexable by search engines and include JSON-LD structured data
- **Pending, In Review, Changes Requested, Rejected** pages remain routable by slug but set `noindex, nofollow`

## SEO features

Each component page includes:

- JSON-LD structured data (SoftwareSourceCode + FAQPage dual `@graph`)
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URL
- Meta description using AI-generated content or short description fallback

## llms.txt

A link to view the component's llms.txt file appears below keywords. This provides machine-readable component information for AI systems.

The llms.txt file is available at:

- `/api/component-llms?slug=component-slug` (direct API)
- `/components/component-slug/llms.txt` (clean URL via Netlify alias)

It includes package name, description, install command, category, documentation links, and SKILL.md content formatted for LLM context windows.
