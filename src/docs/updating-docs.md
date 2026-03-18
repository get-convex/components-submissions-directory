# Updating the Documentation

This guide covers how the documentation system works and how to add or edit docs.

## How docs are built

Documentation lives as plain Markdown files in `src/docs/`. Vite imports them at build time using the `?raw` suffix, so the content is bundled as static strings. No server-side rendering or CMS is involved.

The documentation viewer at `/components/documentation` renders these files with:

- Left sidebar navigation grouped into Getting Started, User Guide, Admin Guide, and Integrations
- Main content area with rendered Markdown
- Right sidebar showing H2/H3 headings from the current doc as anchor links
- Client-side section routing (no full page reloads between docs)
- Copy as Markdown and Download as Markdown buttons
- `noindex, nofollow` meta tag set both client-side (via `useEffect`) and server-side (via Netlify edge function) so crawlers that do not execute JavaScript also see the directive

## File structure

All doc files live in `src/docs/`:

| File | Section | Group |
|------|---------|-------|
| `index.md` | Overview | Getting Started |
| `directory.md` | Using the Directory | User Guide |
| `submit.md` | Submitting Components | User Guide |
| `profile.md` | Managing Your Profile | User Guide |
| `component-detail.md` | Component Pages | User Guide |
| `admin-dashboard.md` | Dashboard Overview | Admin Guide |
| `admin-packages.md` | Package Management | Admin Guide |
| `admin-review.md` | Review Workflow | Admin Guide |
| `admin-ai-review.md` | AI Review System | Admin Guide |
| `admin-seo.md` | Content Generation | Admin Guide |
| `admin-thumbnails.md` | Thumbnails | Admin Guide |
| `admin-settings.md` | Settings | Admin Guide |
| `admin-notes.md` | Notes and Comments | Admin Guide |
| `mcp.md` | MCP (Model Context Protocol) | Integrations |
| `api-endpoints.md` | Public API Endpoints | Integrations |
| `badges.md` | README Badges | Integrations |
| `updating-docs.md` | Updating the Documentation | Getting Started |

## Editing an existing doc

1. Open the Markdown file in `src/docs/`
2. Edit the content using standard Markdown (GFM tables, code blocks, headings)
3. The docs viewer supports H1 for page titles, H2 for sections, and H3 for subsections
4. H2 and H3 headings automatically appear in the right sidebar outline
5. Run `npm run build` to verify no build errors
6. Changes appear after the next deploy

### Markdown rendering

The docs viewer uses the same rendering pipeline as the component detail page:

- **Code blocks** render with [Pierre Diffs](https://diffs.com/) (`@pierre/diffs`) for syntax highlighting, line numbers, and a built-in copy button. Fenced code blocks with a language tag (e.g. ` ```typescript `) get full syntax coloring.
- **GFM tables** render with borders, header backgrounds, and alternating row shading
- **Inline HTML** is supported via `rehype-raw` (e.g. `<div>`, `<strong>`, badge images)
- **Video URLs** (`.mp4`, `.webm`, `.mov`) render as native `<video>` elements instead of broken images
- **Inline code** uses backtick styling with a subtle background
- **Blockquotes** render with a left border and background
- **Images** are supported with lazy loading and rounded borders

## Adding a new doc page

Adding a new doc requires changes in three places:

### 1. Create the Markdown file

Create a new `.md` file in `src/docs/`. Use a descriptive kebab-case name like `new-feature.md`. Start with an H1 title.

### 2. Register in Documentation.tsx

Open `src/pages/Documentation.tsx` and make two additions:

**Add the import** (with the other doc imports near the top):

```typescript
import newFeatureDoc from "../docs/new-feature.md?raw";
```

**Add to the docs array** (in the appropriate position):

```typescript
{ id: "new-feature", title: "New Feature", content: newFeatureDoc, group: "user-guide" },
```

The `id` becomes the URL path segment: `/components/documentation/new-feature`.

The `group` determines which sidebar section the doc appears in:

| Group | Section |
|-------|---------|
| `getting-started` | Getting Started |
| `user-guide` | User Guide |
| `admin-guide` | Admin Guide |
| `integrations` | Integrations |

### 3. Add a link in index.md

Open `src/docs/index.md` and add a link under the appropriate Quick Links section:

```markdown
- [New feature](/components/documentation/new-feature) - Brief description
```

### 4. Update files.md

Add a line for the new file in the `src/docs/` section of `files.md`:

```markdown
- `new-feature.md` - Brief description of what the doc covers
```

## When to update docs

Update docs after any of these changes:

- New user-facing feature or page
- New admin setting or panel
- New API endpoint or integration
- Changed workflow (submission flow, review process, content generation)
- New schema table that affects user-visible behavior
- Bug fix that changes documented behavior

## What to include

Each doc page should cover:

- **What it is** and where to find it (URL path)
- **How to use it** (step-by-step when relevant)
- **Configuration options** (tables work well for settings)
- **Troubleshooting** (common issues and solutions for technical pages)

Keep language direct. Use tables for structured data. Avoid repeating content that belongs in another doc; link to it instead.

## Keeping docs in sync

The project workflow rule requires updating three files after every feature or fix:

1. `task.md` for task tracking
2. `changelog.md` for the public changelog
3. `files.md` for file descriptions

Docs in `src/docs/` should be updated alongside these when the change affects documented behavior. The easiest way to check what needs updating is to read the recent changelog entries and compare against the current doc content.
