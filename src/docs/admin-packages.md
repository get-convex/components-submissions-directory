# Package Management

Managing packages in the admin dashboard.

## Package row information

Each package row displays:

| Field | Description |
|-------|-------------|
| Name | Component display name |
| Status | Review status badge |
| Visibility | Visibility badge (if not visible) |
| Deletion | Red badge if marked for deletion |
| Quick link | External link icon to component detail page |
| Downloads | Weekly npm downloads |
| Date | Submission date (or approval date in "Recently approved" sort) |

Badges appear in order: StatusBadge, VisibilityBadge, ComponentDetailQuickLink.

## Expanded package details

Click a row to expand and see full details.

### npm information

- **Version** - Current npm version
- **License** - Package license
- **Size** - Unpacked size
- **Files** - File count in package
- **Published** - Last npm publish date
- **Maintainers** - npm maintainers list

### Links

| Button | Destination |
|--------|-------------|
| npm | npm package page |
| Repo | GitHub repository |
| Website | Homepage URL (if set) |
| Demo | Demo URL (if set) |

### Author information

Collapsed behind an `AuthorToggleSection` toggle to reduce clutter and protect PII at a glance. Click to expand and view:

- **Name** - Submitter's display name
- **Email** - Primary email (editable)
- **Discord** - Discord username (if provided)
- **Additional emails** - Secondary access emails (editable)

All three collapsible admin sections (Component Author, Component Details, Package Metadata) use a consistent click-anywhere-to-expand pattern.

## Searching packages

Use the search bar to find packages by:

- Package name
- Description
- Maintainer names
- Component name
- GitHub repository URL

Search uses Convex full-text search indexes and is case-insensitive.

## Bulk operations

### Slug generation

In the Settings tab, the Slug Migration panel lets you:

1. View packages without URL slugs
2. Generate slugs individually
3. Generate all missing slugs at once

### npm data refresh

Click "Refresh npm" on individual packages to update:

- Version number
- Download counts
- Package size
- Maintainers list

## Deletion workflow

### Marking for deletion

1. Find the package in the list
2. Expand the row
3. In the visibility section, click "Mark for Deletion"
4. Package enters waiting period

### Deletion queue

View packages marked for deletion in the "Deletion" tab. Each shows:

- Time marked for deletion
- Marked by (admin email)
- Days until auto-delete

### Manual deletion

Click "Delete Now" to immediately delete a package bypassing the waiting period.

### Canceling deletion

1. Find the package in Deletion tab
2. Click "Cancel Deletion"
3. Package returns to previous state

## Hide from Submissions

The "Sub Hide" toggle hides a package from the public Submissions page (`/components/submissions`) only. The component remains visible in the main directory if approved.

| Toggle | Effect |
|--------|--------|
| Sub Hide ON | Hidden from the submissions listing page |
| Sub Hide OFF | Visible on the submissions listing page (default) |

This is useful for keeping approved components in the directory while removing them from the submissions view. The toggle appears in the Actions row of the expanded package view.

## Component Details editor

The expanded view includes a full Component Details editor for:

- Slug, category, tags, descriptions
- Video URL, Live Demo URL
- Verified badge, Community badge, Featured status
- Thumbnail upload with preview and clear option
- Logo upload, download, and clear
- "Hide thumbnail in category listings" checkbox
- Auto-fill author from GitHub
- v2 content generation with regenerate, editable sections, README preview, and SKILL.md support
- SEO visibility toggle for hiding generated content from the public detail page
- Legacy `SeoContentSection` for v1 packages

## Rewards

The Send Reward button in the Actions row sends gift card rewards via Tremendous. It is disabled for packages not in `in_review` or `approved` status. A reward history button shows past attempts, statuses, notes, and Tremendous links.

## Data export

Click "Export CSV" at the top of the dashboard to download all package data as a CSV file. Includes:

- All package fields
- Submitter information
- Review status
- npm statistics
