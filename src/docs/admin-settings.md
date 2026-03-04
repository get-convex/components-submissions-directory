# Admin Settings

The Settings tab in the admin dashboard provides configuration options for the Components Directory.

## Accessing settings

1. Navigate to admin dashboard
2. Click the "Settings" tab
3. Scroll through settings panels

## Settings panels

### Submit Listing Settings

Controls the public Submit page (`/components/submissions`).

| Setting | Options | Description |
|---------|---------|-------------|
| Default page size | 20, 40, 60 | Items per page for public visitors |

### Deletion Management

Controls automatic deletion of marked packages.

| Setting | Description |
|---------|-------------|
| Auto-delete enabled | Toggle automatic deletion |
| Waiting period | Days before auto-delete |
| Pending deletions | List of packages in queue |

#### Managing pending deletions

- View all packages marked for deletion
- See time remaining before auto-delete
- "Delete Now" to skip waiting period
- "Cancel" to remove from queue

### Slug Migration

For packages missing URL slugs.

| Feature | Description |
|---------|-------------|
| Missing slugs count | Packages without slugs |
| Generate All | Create slugs for all |
| Individual generation | Create slug per package |

Slugs are URL-friendly identifiers derived from package names.

### AI Provider Settings

Configure AI providers for reviews and SEO.

#### Provider options

| Provider | Models |
|----------|--------|
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus |
| OpenAI | GPT-4o, GPT-4 Turbo |
| Google | Gemini Pro, Gemini 1.5 |

#### Configuration

1. Select provider
2. Enter API key
3. Choose model
4. Click Save

#### Clearing settings

Click "Clear" to remove custom configuration and use environment variables.

### AI Prompt Settings

Customize the AI review prompt.

| Feature | Description |
|---------|-------------|
| Current prompt | Active prompt text |
| Edit | Modify the prompt |
| Version history | Previous prompt versions |
| Activate | Restore a previous version |
| Reset to default | Restore original prompt |

### SEO Prompt Settings

Customize the SEO generation prompt.

| Feature | Description |
|---------|-------------|
| Current prompt | Active SEO prompt |
| Edit | Modify the prompt |
| Version history | Previous versions |
| Activate | Restore previous version |
| Reset to default | Restore original |

#### SEO prompt placeholders

The SEO prompt supports these template variables:

| Placeholder | Replaced with |
|-------------|--------------|
| `{{displayName}}` | Component display name |
| `{{packageName}}` | npm package name |
| `{{description}}` | Short description |
| `{{category}}` | Component category |

Use these placeholders in custom prompts so the AI generates content specific to each component.

### Category Management

View and manage categories.

| Info | Description |
|------|-------------|
| Category name | Display label |
| Total count | All components in category |
| Verified count | Verified components only |

### Display Settings

Control public page features.

| Setting | Description |
|---------|-------------|
| Show Related on Detail Page | Toggle related components section |

### Thumbnail Templates

Manage background templates for auto-generation.

| Action | Description |
|--------|-------------|
| View templates | See all available |
| Add template | Upload new background |
| Edit | Modify template |
| Delete | Remove template |
| Set default | Use for new generations |
| Reorder | Change display order |

## Environment variables

Some settings fall back to environment variables when not configured in the dashboard:

| Setting | Env Variable |
|---------|--------------|
| Anthropic API key | `ANTHROPIC_API_KEY` |
| OpenAI API key | `CONVEX_OPENAI_API_KEY` |
| Gemini API key | `GOOGLE_GEMINI_API_KEY` |

Dashboard settings take precedence over environment variables.

## Saving settings

Most settings save automatically when changed. Some require clicking a "Save" button.

Changes take effect immediately after saving.
