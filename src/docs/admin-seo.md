# SEO Content Generation

The SEO system generates optimized content for component detail pages using AI.

## Generated content

The SEO generator creates:

| Content | Description |
|---------|-------------|
| Value proposition | One-line benefit statement |
| Benefits | List of key advantages |
| Use cases | Common scenarios with explanations |
| FAQ | Frequently asked questions |
| Resource links | Related documentation links |
| SKILL.md | AI agent integration file |

## Running SEO generation

### From the Actions row

1. Expand the package row
2. Click "Regenerate SEO + Skill" in Actions
3. Wait for processing
4. View results in the Component Details editor

### From Component Details editor

1. Open Component Details editor
2. Find the SEO section
3. Click "Generate SEO Content"
4. View status and generated content

## SEO status indicators

| Status | Meaning |
|--------|---------|
| Not started | SEO not yet generated |
| Processing | Currently generating |
| Completed | Successfully generated |
| Error | Generation failed |

## Viewing generated content

After generation, view the content:

1. **In admin dashboard** - Component Details editor shows SEO fields
2. **On component page** - Public component detail page displays content
3. **In markdown** - Markdown export includes SEO sections

## SKILL.md generation

SKILL.md is a special file for AI agent integration (Claude, Cursor).

### Content structure

```markdown
---
name: component-name
description: Brief description for agents
---

# Component Name

## When to use
...

## Installation
...

## Quick start
...

## Key features
...
```

### Viewing SKILL.md

- **Admin** - "SKILL.md generated" indicator in Component Details
- **Public** - Download SKILL button on component page

## Custom SEO prompts

Customize the SEO generation prompt in Settings:

1. Go to Settings tab
2. Find "SEO Prompt Settings"
3. View or edit the prompt
4. Save new versions
5. View version history

### Prompt placeholders

- `{name}` - Component name
- `{description}` - Package description
- `{repositoryUrl}` - GitHub URL
- `{npmUrl}` - npm URL
- `{category}` - Component category
- `{tags}` - Component tags

## AI providers

SEO generation uses the same provider configuration as AI Review:

1. Admin-configured provider (primary)
2. Backup providers (failover)
3. Environment providers (fallback)

## Re-generating content

To regenerate SEO content:

1. Click "Regenerate SEO + Skill"
2. Previous content is replaced
3. New content appears on all pages

Use re-generation when:

- Component has significant updates
- Initial generation had errors
- Content needs improvement

## SEO on component pages

Generated content appears on public component pages:

- **Value prop** - Highlighted quote block
- **Benefits** - Bulleted list
- **Use cases** - Q&A format sections
- **FAQ** - Accordion-style FAQ
- **Resources** - Link list

Content is also included in:

- JSON-LD structured data
- Meta description (value prop)
- Open Graph tags

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Generation stuck | API timeout | Retry |
| Empty content | Parse error | Check AI response, retry |
| Low quality | Insufficient data | Add better descriptions first |
| Provider error | Invalid API key | Check AI Provider Settings |
