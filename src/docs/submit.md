# Submitting Components

Submit your Convex component to the directory for review. After approval, it appears in the public directory.

## Prerequisites

Before submitting, you need:

1. **npm package** - Your component must be published to npm
2. **GitHub repository** - Public source code repository
3. **Convex component structure** - Follow the [authoring guide](https://docs.convex.dev/components/authoring)

## Preflight checker

Before submitting, you can validate your repository at `/components/submit/check`. The preflight checker:

- Requires authentication (auto-redirects to sign in if needed)
- Analyzes your GitHub repository against the same review criteria used by admins
- Shows 9 critical criteria that must pass for a valid component
- Shows 5 advisory recommendations that do not block approval
- Rate limited to 10 checks per hour per IP
- Caches results for 30 minutes per repository URL
- Provides a "Continue to Submit" link when your repo passes

## Submission form

Navigate to `/components/submit`. If not signed in, you will be redirected to WorkOS for authentication.

### Required fields

| Field | Description |
|-------|-------------|
| Component Name | Display name for your component |
| npm Package URL | Full URL to your npm package page |
| GitHub Repository URL | Link to your public GitHub repo |
| Category | Select the best matching category |
| Short Description | One-line summary (displayed in cards) |
| Your Email | Auto-filled from your authenticated account |

### Optional fields

| Field | Description |
|-------|-------------|
| Demo URL | Live demo or documentation link |
| Tags | Comma-separated keywords |
| Video URL | YouTube or video embed URL |
| Logo | Square logo image (auto-generates thumbnail) |
| Your Name | Display name for attribution |
| Discord Username | For community contact |

## AI content generation

The submit form uses a v2 content generation workflow. After filling in the required fields:

1. Click "Generate Component Directory Content" to draft Description, Use cases, How it works, and a README preview
2. A warning modal appears before generation explaining the cooldown policy
3. The AI fetches your GitHub README, analyzes it with Convex docs context, and produces structured content
4. Each generated section is editable in a textarea before submission
5. Generated textareas are vertically resizable for longer editing sessions
6. A README preview helper explains whether content came from Convex include markers or the full README fallback

### Rate limiting

Content generation is limited to 5 times per hour per signed-in account. If you hit the limit, edit the current draft instead of regenerating. Admins are exempt from this limit.

## Checklist requirements

Before submitting, you must confirm:

1. **Read FAQ** - Reviewed the submission FAQ
2. **Guidelines compliance** - Component meets authoring guidelines
3. **Permission** - You have permission to submit this component

All three checkboxes must be checked to enable the submit button.

## After submission

1. **Pending status** - Your submission enters the review queue
2. **Auto AI review** - If enabled by admins, your submission moves to "In Review" and receives an automated AI review
3. **Review process** - The Convex team reviews your component
4. **Status update** - You can track status on your profile page

## Review timeline

Components are reviewed on a rolling basis. There is no guaranteed timeline, but most submissions are processed within a few business days.

## Editing submissions

After submitting, you can:

1. Go to your [profile page](/components/profile)
2. Find your submission in the list
3. Click "Edit" to open the dedicated full-page editor
4. Update fields, regenerate content, or edit the README preview
5. Submit changes for re-review if needed

## Security scan report

Each component on the submissions page has a "Security" button in the expanded action row (next to npm, Repo, Website, Demo). Clicking it opens a security report modal showing:

- Scan status (not scanned, safe, warnings, or alerts)
- Provider links to Socket.dev and Snyk
- Recommendations from the latest scan
- Contact author section linking to GitHub Issues

Security scans are run by admins. If a component has not been scanned, the modal shows a notice to review the repository manually.

## Submissions page pagination

The public submissions page at `/components/submissions` supports pagination:

| Setting | Options |
|---------|---------|
| Page size | 20, 40, or 60 items per page |
| Default | Configured by admins in Settings tab |
| Navigation | Previous/Next buttons at the bottom |

The default page size is controlled in the admin Settings panel under "Submit Listing Settings."

## Common rejection reasons

- Missing or invalid npm package
- Repository not accessible
- Does not follow component structure (missing `convex.config.ts` or proper entry points)
- Missing documentation
- Security concerns
