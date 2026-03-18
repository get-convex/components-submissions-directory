# Managing Your Profile

The profile page at `/components/profile` lets you manage all your submitted components.

## Accessing your profile

1. Sign in via the header
2. Click your avatar/name in the header
3. Select "My Submissions" from the dropdown

Or navigate directly to `/components/profile`.

## Submission list

Your profile shows all components you have submitted, including:

- **Pending** - Awaiting review
- **In Review** - Currently being reviewed
- **Approved** - Live in the directory
- **Changes Requested** - Needs updates
- **Rejected** - Did not meet criteria

## Submission row

Each submission row shows:

| Element | Description |
|---------|-------------|
| Name | Component name with link to detail page (if approved) |
| Status badge | Current review status |
| Visibility badge | Hidden status if applicable |
| Actions | Edit, Send Request, View Notes buttons |
| Badge snippet | README markdown, copy button, and live preview (for packages with slugs) |

## Editing submissions

Click "Edit" to open a dedicated full-page editor at `/profile/edit/:packageId`. The editor includes:

- Package, Repo, and npm info as clickable links
- Component name, short description, category, tags, demo URL, video URL
- v2 content generation with "Generate Component Directory Content" button
- Side-by-side editor and live markdown preview for Description, Use Cases, and How it Works on desktop (stacks on mobile)
- README preview section (read-only)
- Logo upload and management
- Vertically resizable textareas for longer editing

### Content regeneration

The profile editor uses the same v2 content flow as the submit form. Regeneration opens a warning modal and is subject to the 5 per hour per account cooldown. Edit the current draft when possible instead of regenerating.

## Sending requests

Click "Send Request" to message the admin team. Use this to:

- Request re-review after making updates
- Ask questions about your submission
- Request removal of your component
- Report issues

## Viewing notes

Click "View Notes" to see the conversation thread between you and admins. Features:

- **Notification badge** - Shows count of unread admin replies
- **Message history** - Full thread of notes
- **Hide/Archive** - Manage old messages
- **Mark as read** - Clears notification badge

## Status guide

| Status | Meaning |
|--------|---------|
| Pending | Awaiting initial review |
| In Review | Actively being reviewed |
| Approved | Live in the directory |
| Changes Requested | Admin has requested updates |
| Rejected | Did not meet criteria |
| Featured | Approved and featured on homepage |

## Visibility guide

| Visibility | Meaning |
|------------|---------|
| Visible | Appears in directory |
| Hidden | Temporarily hidden from directory |

## API access

When the admin has enabled the REST API and granted your account access, an API Access section appears on the profile page. You can:

- Generate a personal API key (one active key at a time)
- View your key prefix and creation date
- Revoke your key at any time
- Open the API Usage Guide modal with endpoint documentation, curl examples, and rate limit info

API keys use the `cdk_` prefix, are hashed at rest, and support two-tier rate limiting: 100 requests per minute with a key, 10 per minute anonymous.

## Requesting help

At the bottom of the profile page, a "Need help?" section directs you to use "Send Request" for component removal or account changes. Direct contact email is also provided.

## Multi-account access

If you have multiple email addresses, an admin can add additional emails to your submissions. This allows:

- Accessing submissions from different accounts
- Team access to shared components
