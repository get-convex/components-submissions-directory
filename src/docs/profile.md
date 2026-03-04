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

## Editing submissions

Click "Edit" to open the edit modal with fields:

- Component name
- Short description
- Long description
- Category
- Tags
- Demo URL
- Video URL

Changes are saved immediately. If the component was previously approved, consider sending a note to request re-review.

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

## Requesting deletion

You can request deletion of your own submissions:

1. Click "Send Request" on the submission you want removed
2. Type a deletion request message
3. The admin team is notified
4. The component enters a waiting period before permanent deletion

### Canceling a deletion request

If you change your mind before the waiting period expires:

1. Go to your profile
2. Find the submission with a deletion badge
3. Click "Cancel Deletion Request"
4. The component returns to its previous state

The waiting period duration is configured by admins in the Deletion Management settings.

## Account management

At the bottom of the profile page:

- **Delete Account** - Remove your account (requires all submissions deleted first)

To delete your account:

1. Delete or request removal of all submissions
2. Click "Delete Account"
3. Confirm the action

## Multi-account access

If you have multiple email addresses, an admin can add additional emails to your submissions. This allows:

- Accessing submissions from different accounts
- Team access to shared components
