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
| Downloads | Weekly npm downloads |
| Date | Submission date |
| Quick link | External link to component page |

## Expanded package details

Click a row to expand and see full details.

### npm information

- **Version** - Current npm version
- **License** - Package license
- **Size** - Unpacked size
- **Files** - File count in package
- **Maintainers** - npm maintainers list

### Links

| Button | Destination |
|--------|-------------|
| npm | npm package page |
| Repo | GitHub repository |
| Website | Homepage URL (if set) |
| Demo | Demo URL (if set) |

### Submitter information

- **Name** - Submitter's display name
- **Email** - Primary email (editable)
- **Discord** - Discord username (if provided)
- **Additional emails** - Secondary access emails (editable)

Click "Edit" on the submitter info to modify emails.

## Searching packages

Use the search bar to find packages by:

- Package name
- npm URL
- Submitter email
- GitHub repository URL

Search is case-insensitive and matches partial strings.

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

## Data export

Click "Export CSV" at the top of the dashboard to download all package data as a CSV file. Includes:

- All package fields
- Submitter information
- Review status
- npm statistics
