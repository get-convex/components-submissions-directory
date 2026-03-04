# Admin Dashboard Overview

The admin dashboard at `/components/submissions/admin` provides full control over the Components Directory. Access requires a @convex.dev email address.

## Accessing the dashboard

1. Sign in with your @convex.dev email
2. Navigate to `/components/submissions/admin`
3. Or click "Admin" in the header (visible only to admins)

Non-admin users are automatically redirected to their profile page.

## Dashboard layout

### Header bar

- **Search** - Search packages by name, npm URL, or submitter email
- **Stats** - Quick overview of package counts
- **Tabs** - Filter by status (All, Pending, In Review, Approved, etc.)

### Filter tabs

| Tab | Shows |
|-----|-------|
| All | All packages |
| Pending | Awaiting initial review |
| In Review | Currently being reviewed |
| Approved | Live in directory |
| Changes | Changes requested |
| Rejected | Did not meet criteria |
| Featured | Featured components |
| Hidden | Hidden from directory |
| Deletion | Marked for deletion |
| Settings | Admin settings panel |

Each tab shows a count badge with the number of packages.

### Package list

Packages display as expandable rows showing:

- Package name
- Status badge
- Visibility badge
- Deletion badge (if marked)
- Downloads count
- Creation date
- Quick link to component page

### Expanded package view

Click a row to expand and see:

- **npm info** - Version, license, size, files
- **Links** - npm, GitHub, demo, website
- **Submitter info** - Name, email, Discord
- **Actions row** - Quick actions
- **Status row** - Review status controls
- **Visibility row** - Show/hide controls
- **Featured row** - Featured toggle and sort order
- **AI Review panel** - AI review results
- **Notes panel** - Admin-only notes
- **Comments panel** - User/admin messages
- **Component Details editor** - Edit fields

## Pagination

- Select items per page: 5, 10, 20, 40, or 100
- Navigate with Previous/Next buttons
- Each filter tab maintains its own page state

## Quick actions

The Actions row provides:

| Action | Description |
|--------|-------------|
| Convex Verified | Toggle verified badge |
| Community | Toggle community badge |
| Regenerate SEO + Skill | Re-run AI SEO generation |
| Auto-fill | Fill author from GitHub |
| Refresh npm | Refresh npm package data |
| Generate Slug | Create URL slug (if missing) |
| Sub Hide | Toggle visibility on the public Submissions page |

## Stats overview

At the top of the page:

- Total packages count
- Pending review count
- Approved count
- Downloads total
