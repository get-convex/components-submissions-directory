# AI Review System

The AI review system automatically analyzes submitted components using AI providers. It evaluates GitHub repository contents against the v6 review criteria.

## Overview

When triggered, the AI review:

1. Fetches the GitHub repository contents
2. Detects the real component source directory (looks for `defineComponent()`)
3. Analyzes code structure, entry points, and quality
4. Evaluates against 9 critical criteria and 5 advisory notes
5. Generates a summary and checklist
6. Stores results as a persistent review run for admin audit

## Running AI review

### Automatic trigger

When "Auto AI review" is enabled in Settings, new submissions with a repository URL automatically move to "In Review" and queue an AI review. Enabling the setting also queues review for existing pending packages that have repository URLs.

### Manual trigger

1. Expand the package row
2. Find the "AI Review" panel
3. Click "Run AI Review"
4. Wait for processing (may take 30-60 seconds)

### Review results

After completion, the panel shows:

- **Status icon** - Success (green), partial (yellow), or error (red)
- **Date** - When the review was run
- **Summary** - AI-generated assessment (must state the identified component source directory)
- **Criteria checklist** - Pass/fail for each criterion

Click the panel header to expand/collapse details. The panel is collapsed by default showing only the status icon, label, and date.

## Review criteria (v6)

The AI evaluates components from the linked GitHub repository (not the published npm tarball).

### Critical criteria (9)

These must pass for a valid component:

| Criterion | Description |
|-----------|-------------|
| Component structure | Has proper `convex.config.ts` with `defineComponent()` |
| Package entry points | `package.json` exports `./convex.config.js` and `./_generated/component.js` |
| Documentation | README and inline docs |
| Type safety | TypeScript usage and argument validators |
| Error handling | Proper error management |
| Security | No obvious vulnerabilities |
| Best practices | Follows Convex patterns |
| Exported API | Has exported hooks, classes, or helper APIs |
| Source directory | Correct component source detection (not just a top-level `convex/` folder) |

### Advisory criteria (5)

Recommendations that do not block approval:

- Return validators on public functions
- Test coverage
- Example usage
- Wrapper or client-side helpers
- Code organization

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
3. Environment variable providers (`ANTHROPIC_API_KEY`, `CONVEX_OPENAI_API_KEY`, optional Gemini)

If one provider fails, the system automatically tries the next via the shared `aiProviderFallback.ts` module. The same failover logic is used by both AI review and content generation.

## Configuring providers

In the Settings tab, AI Provider Settings panel:

1. **Select provider** - Choose Anthropic, OpenAI, or Gemini
2. **Enter API key** - Your provider API key
3. **Select model** - Choose model version
4. **Save** - Apply settings

### Clearing provider settings

Click "Clear" to remove custom settings and revert to environment variables. A confirmation modal appears before clearing.

## Custom prompts

The AI review uses a customizable prompt. To modify:

1. Go to Settings tab
2. Find "AI Prompt Settings"
3. View current prompt (shows v6 review model status label)
4. Edit and save new version
5. Previous versions are saved for history

### Prompt variables

The prompt supports placeholders:

- `{packageName}` - Component name
- `{repositoryUrl}` - GitHub URL
- `{codeContent}` - Repository file contents (includes nearby `package.json`, client entry files, and test files)

### Reverting prompts

Click "Reset to Default" to restore the original prompt.

## AI automation workflow

The Settings tab provides a three-toggle automation system:

| Setting | Description |
|---------|-------------|
| Auto AI review | Queues eligible submissions for AI review and moves them to "In Review" |
| Auto-approve on pass | Automatically approves if all critical criteria pass (requires Auto AI review) |
| Auto-reject on fail | Automatically rejects if critical criteria fail (requires Auto AI review) |

Auto AI review defaults to off. The approve and reject toggles stay disabled until auto review is enabled and remain optional.

## Review history

Each AI review creates a persistent record in the `aiReviewRuns` table. The admin can:

- View all previous review runs via the AI review history drawer (right-side panel)
- See score summaries, provider/model metadata, and reviewer attribution per run
- Expand criteria checklists and raw model output for each run
- Delete older runs while the latest review snapshot is always protected
- Close the drawer with Escape (unless a delete confirmation modal is open)

## Monorepo support

The AI review handles monorepo structures:

- Detects packages in subdirectories
- Follows `package.json` paths
- Prefers the directory using `defineComponent()` as the component source

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
