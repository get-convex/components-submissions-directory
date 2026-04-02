# Admin Settings

The Settings tab in the admin dashboard provides configuration options for the Components Directory. The settings view has anchored section wrappers, a sticky jump bar on smaller screens, and a sticky right-side section nav on extra-wide screens.

## Accessing settings

1. Navigate to admin dashboard
2. Click the "Settings" tab
3. Scroll through settings panels or use the section nav to jump

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

Configure AI providers for reviews and content generation.

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

Click "Clear" to remove custom configuration and use environment variables. A confirmation modal appears before clearing.

### AI Review Settings

Controls the AI automation workflow.

| Setting | Description |
|---------|-------------|
| Auto AI review | Queues eligible submissions for review, moves to "In Review" |
| Auto-approve on pass | Approves automatically when all critical criteria pass (requires Auto AI review) |
| Auto-reject on fail | Rejects automatically when critical criteria fail (requires Auto AI review) |

Auto AI review defaults to off. When enabled, it also queues current pending packages with repository URLs.

Help text matches the v6 review model, including repo-wide `defineComponent()` source detection, the critical `package.json` entry point check, 9 critical plus 5 advisory criteria split, and the shared status label.

### AI Prompt Settings

Customize the AI review prompt.

| Feature | Description |
|---------|-------------|
| Current prompt | Active prompt text with v6 status label |
| Edit | Modify the prompt |
| Version history | Previous prompt versions |
| Activate | Restore a previous version |
| Reset to default | Restore original prompt |

### Component Directory Content Prompt

Customize the content generation prompt (formerly "SEO Prompt Settings").

| Feature | Description |
|---------|-------------|
| Current prompt | Active content prompt |
| Edit | Modify the prompt |
| Version history | Previous versions |
| Activate | Restore previous version |
| Reset to default | Restore original |

The help text and placeholder reference describe README-first grounding and Convex docs context placeholders.

#### Content prompt placeholders

| Placeholder | Replaced with |
|-------------|--------------|
| `{{displayName}}` | Component display name |
| `{{packageName}}` | npm package name |
| `{{description}}` | Short description |
| `{{category}}` | Component category |
| `{{readmeContent}}` | GitHub README content |
| `{{convexDocsContext}}` | Convex documentation context |

### Category Management

View and manage directory categories.

| Info | Description |
|------|-------------|
| Category name | Display label |
| Slug | URL-safe identifier |
| Total count | All components in category |
| Verified count | Verified components only |

When a category slug is edited, package category references are migrated. When a category is deleted, package category references are cleared so public category pages do not orphan records.

### Security Scan Settings

Configure security scanning providers and automation. See [Security scanning](/components/documentation/admin-security-scan) for full details.

| Setting | Description |
|---------|-------------|
| Socket.dev | Toggle Socket.dev supply chain scanning |
| Snyk | Toggle Snyk vulnerability monitoring |
| Auto scan on submission | Run scans on new packages automatically |
| Scan schedule | Manual only, every 3, 5, or 7 days |
| Backlog queue | Batch scan unscanned packages (configurable batch size) |

Environment variables required: `SOCKET_API_KEY`, `SNYK_TOKEN`, `SNYK_ORG_ID`.

### Display Settings

Control public page features.

| Setting | Description |
|---------|-------------|
| Show Related on Detail Page | Toggle related components section (on by default) |

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

### Tremendous Reward Settings

Configure submitter payout rewards via Tremendous API.

| Setting | Description |
|---------|-------------|
| Auto-send on approve | Toggle automatic reward when a component is approved |
| Default reward amount | Gift card value |
| Payment stats | Aggregate statistics for completed real rewards |
| Send Test Reward | Sends to `TREMENDOUS_TEST_RECIPIENT_EMAIL` (creates `isTest` payment, does not change component state) |

## Environment variables

Some settings fall back to environment variables when not configured in the dashboard:

| Setting | Env Variable |
|---------|--------------|
| Anthropic API key | `ANTHROPIC_API_KEY` |
| OpenAI API key | `CONVEX_OPENAI_API_KEY` |
| Gemini API key | `GOOGLE_GEMINI_API_KEY` |
| Tremendous API key | `TREMENDOUS_API_KEY` |
| Tremendous campaign ID | `TREMENDOUS_CAMPAIGN_ID` |
| Tremendous funding source | `TREMENDOUS_FUNDING_SOURCE_ID` |
| Socket.dev API key | `SOCKET_API_KEY` |
| Snyk token | `SNYK_TOKEN` |
| Snyk organization | `SNYK_ORG_ID` |

Dashboard settings take precedence over environment variables.

## Saving settings

Most settings save automatically when changed. Some require clicking a "Save" button.

Changes take effect immediately after saving.
