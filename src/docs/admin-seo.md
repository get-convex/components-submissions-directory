# Content Generation

The content generation system creates structured component directory content using AI, grounded on GitHub README data and Convex documentation context.

## Content model (v2)

The v2 content model generates three structured sections for each component:

| Section | Description |
|---------|-------------|
| Description | Component overview grounded on the README |
| Use cases | Common scenarios and applications |
| How it works | Technical explanation |

Additional generated outputs:

| Output | Description |
|--------|-------------|
| README preview | Imported README content (from Convex include markers or full README fallback) |
| SKILL.md | AI agent integration file for Claude, Cursor, etc. |

## Generation workflow

Content generation is unified across all three surfaces (admin, submit, profile edit) using the same v2 prompt and flow.

### How it works

1. Fetches the GitHub README content on demand
2. Looks for Convex include markers in the README; falls back to the full README
3. Fetches best-effort Convex docs grounding from `https://docs.convex.dev/llms.txt`
4. Sends the context to the active AI provider with the admin custom prompt (or default template)
5. Parses structured output into Description, Use cases, and How it works
6. Builds SKILL.md from the generated content fields

### Running generation

**From admin Actions row:**
1. Expand the package row
2. Click "Generate Content" in the Actions row
3. Wait for processing
4. View results in the Component Details editor

**From submit or profile edit:**
1. Fill in required fields (repo URL is essential)
2. Click "Generate Component Directory Content"
3. Acknowledge the warning modal
4. Review and edit each generated section before saving

### Rate limiting

| Surface | Limit |
|---------|-------|
| Admin | No limit (exempt) |
| Submit form | 5 per hour per account |
| Profile edit | 5 per hour per account |

## Content status indicators

| Status | Meaning |
|--------|---------|
| Not started | Content not yet generated |
| Processing | Currently generating |
| Completed | Successfully generated |
| Error | Generation failed |

## SKILL.md generation

SKILL.md is built automatically from the v2 content fields whenever content is generated or edited:

- During submission (when v2 content is present)
- During profile edit (when v2 content fields are saved)
- During admin regeneration
- During content model migration (backfills for existing v2 packages)

### Content structure

The SKILL.md file includes the component name, description, when to use it, installation steps, quick start guide, and key features, formatted for AI agent consumption.

### Viewing SKILL.md

- **Admin** - SKILL.md status shown in Component Details editor
- **Public** - Download Skill button on component detail page (when visible)

## Custom content prompts

Customize the generation prompt in Settings:

1. Go to Settings tab
2. Find "Component Directory Content Prompt" (formerly "SEO Prompt Settings")
3. View or edit the prompt
4. Save new versions
5. View version history

### Prompt placeholders

The default prompt template supports these variables:

| Placeholder | Replaced with |
|-------------|--------------|
| `{{displayName}}` | Component display name |
| `{{packageName}}` | npm package name |
| `{{description}}` | Short description |
| `{{category}}` | Component category |
| `{{readmeContent}}` | GitHub README content |
| `{{convexDocsContext}}` | Convex documentation context |

### Reverting prompts

Click "Reset to Default" to restore the original prompt. The default template uses README-first grounding with strict no-marketing-language guidance.

## AI providers

Content generation uses the same provider configuration and failover logic as AI Review:

1. Admin-configured provider (primary)
2. Backup providers (failover)
3. Environment providers (fallback)

## Editing generated content

### In admin

The Component Details editor includes a v2 content section with:

- Editable Description, Use cases, and How it works fields
- README preview editing
- Regenerate button
- SKILL.md status and content

### On detail pages

Generated content appears on public component pages with GitHub-style markdown rendering. Content can be hidden from the public page via the admin SEO visibility toggle while remaining editable in the dashboard.

## SEO on component pages

Generated content feeds into:

- Visible content sections (Description, Use cases, How it works)
- JSON-LD structured data (SoftwareSourceCode + FAQPage)
- Meta description (uses value prop or short description fallback)
- Open Graph and Twitter Card tags

## Legacy v1 SEO

Packages that have not been migrated to the v2 content model retain the original SEO fields (value proposition, benefits, use cases, FAQ, resource links). The admin editor shows a legacy `SeoContentSection` for these packages.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Generation stuck | API timeout | Retry |
| Empty content | Parse error | Check AI response, retry |
| Low quality | Insufficient README | Add better README content first |
| Provider error | Invalid API key | Check AI Provider Settings |
| Rate limit hit | Too many regenerations | Wait for cooldown or edit the current draft |
