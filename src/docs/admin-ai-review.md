# AI Review System

The AI review system automatically analyzes submitted components using AI providers.

## Overview

When triggered, the AI review:

1. Fetches the GitHub repository contents
2. Analyzes code structure and quality
3. Evaluates against review criteria
4. Generates a summary and checklist
5. Stores results for admin review

## Running AI review

### Manual trigger

1. Expand the package row
2. Find the "AI Review" panel
3. Click "Run AI Review"
4. Wait for processing (may take 30-60 seconds)

### Review results

After completion, the panel shows:

- **Status icon** - Success (green) or error (red)
- **Date** - When the review was run
- **Summary** - AI-generated assessment
- **Criteria checklist** - Pass/fail for each criterion

Click the panel header to expand/collapse details.

## Review criteria

The AI evaluates:

| Criterion | Description |
|-----------|-------------|
| Component structure | Has proper convex.config.ts |
| Documentation | README and inline docs |
| Type safety | TypeScript usage |
| Error handling | Proper error management |
| Security | No obvious vulnerabilities |
| Best practices | Follows Convex patterns |

Each criterion shows:

- **Check mark** - Passed
- **X mark** - Failed or needs attention
- **Description** - Details about the assessment

## AI providers

The system supports multiple AI providers with automatic failover:

| Provider | Model |
|----------|-------|
| Anthropic | Claude 3.5 Sonnet |
| OpenAI | GPT-4o |
| Google | Gemini Pro |

### Provider priority

1. Active admin-configured provider
2. Backup admin providers
3. Environment variable providers

If one provider fails, the system automatically tries the next.

## Configuring providers

In the Settings tab, AI Provider Settings panel:

1. **Select provider** - Choose Anthropic, OpenAI, or Gemini
2. **Enter API key** - Your provider API key
3. **Select model** - Choose model version
4. **Save** - Apply settings

### Clearing provider settings

Click "Clear" to remove custom settings and revert to environment variables.

## Custom prompts

The AI review uses a customizable prompt. To modify:

1. Go to Settings tab
2. Find "AI Prompt Settings"
3. View current prompt
4. Edit and save new version
5. Previous versions are saved for history

### Prompt variables

The prompt supports placeholders:

- `{packageName}` - Component name
- `{repositoryUrl}` - GitHub URL
- `{codeContent}` - Repository file contents

### Reverting prompts

Click "Reset to Default" to restore the original prompt.

## Monorepo support

The AI review handles monorepo structures:

- Detects packages in subdirectories
- Follows package.json paths
- Finds component code within workspace

## Error handling

If AI review fails:

- Error message is displayed
- Review can be retried
- Manual review is still possible

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| Repository not accessible | Private repo or invalid URL | Check repo visibility |
| Rate limit exceeded | Too many API calls | Wait and retry |
| Invalid API key | Incorrect provider key | Update in settings |
| Timeout | Large repository | Retry or review manually |

## Viewing history

Each AI review is timestamped. The most recent review is shown. Previous reviews are replaced when re-run.
