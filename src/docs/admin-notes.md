# Notes and Comments

The admin dashboard includes two communication systems: Notes and Comments.

## Notes vs Comments

| Feature | Notes | Comments |
|---------|-------|----------|
| Visibility | Admin-only | Admin + submitter |
| Purpose | Internal review notes | Communication with submitter |
| Notification | No | Yes (unread badge) |

## Admin Notes

### Purpose

Admin notes are internal annotations visible only to admins. Use them for:

- Review observations
- Follow-up reminders
- Historical context
- Communication between admins

### Adding notes

1. Expand the package row
2. Find the "Admin Notes" panel
3. Type your note
4. Click "Add Note"

### Note features

- **Timestamp** - When the note was added
- **Author** - Admin who wrote it
- **Delete** - Remove the note

### Viewing notes

Notes appear in reverse chronological order (newest first).

## Comments (User Messages)

### Purpose

Comments enable two-way communication between admins and submitters.

### Submitter actions

Submitters can:

- Send requests via "Send Request" button
- View thread via "View Notes" button
- Hide/archive their own messages
- See unread reply notifications

### Admin actions

Admins can:

- View all messages in the Comments panel
- Reply to submitter messages
- Hide/archive messages
- View hidden/archived messages (toggle)
- Mark messages as read

### Message lifecycle

Messages support a full status lifecycle managed by both submitters and admins:

| State | Description |
|-------|-------------|
| Active | Visible in default view |
| Hidden | Hidden from default view |
| Archived | Archived, hidden from default |
| Deleted | Permanently removed |

### Unread badges

The admin dashboard shows unread counts:

- Per-package badge in the Comments panel
- Total unread count in the tab header

### Managing messages

#### Hiding messages

1. Find the message
2. Click "Hide"
3. Message moves to hidden state

#### Archiving messages

1. Find the message
2. Click "Archive"
3. Message moves to archived state

#### Viewing hidden/archived

1. Toggle "Show inactive"
2. Hidden and archived messages appear
3. Click "Restore" to make active again

#### Deleting messages

1. Find the message
2. Click "Delete"
3. Message is permanently removed

## Reply workflow

### Replying to submitters

1. Expand the package row
2. Find the Comments panel
3. Type your reply in the text area
4. Click "Reply"

### Reply visibility

Replies are visible to:

- The submitter (in their profile)
- All admins (in the dashboard)

### Notification

When you reply:

- Submitter sees unread badge on profile
- Message thread updates in real-time

## GitHub issue messaging

Most submitters do not come back to their profile page after submitting. They do read GitHub notifications. So the Comments panel can mirror a private message as an issue on the submitter's repo, and replies on that issue flow back into the same thread.

### Sending a message as a GitHub issue

The checkbox appears under the reply box whenever the package has a github.com repository URL. It is checked by default, so a normal reply also goes to GitHub. Untick it to keep a message in the private thread only.

1. Expand the package row and find the Comments panel
2. Type your message
3. Leave the box checked, or untick it for a private message
4. Click "Reply"

The message saves to the thread first, then the issue opens in the background. The message shows its GitHub state as it changes:

| State | Meaning |
|-------|---------|
| Opening GitHub issue... | Request in flight |
| Sent as GitHub issue | Issue opened, link goes to it |
| Sent as GitHub comment | Posted as a comment on the existing open issue |
| Closed | The issue this message lives on has since been closed |
| GitHub issue failed | GitHub refused; the reason is shown. The message is still in the thread |

A GitHub failure never blocks the message. The submitter still sees it in their profile thread.

### One open issue per package

The checkbox label tells you what will happen before you send:

| Label | What happens |
|-------|--------------|
| Also send as a GitHub issue | No issue exists yet. A new one opens |
| Also reply on the open GitHub issue | An issue is open. Your message posts as a comment there |
| Open a new GitHub issue (previous one is closed) | The last issue was closed on GitHub. A fresh one opens |

This keeps the conversation on one issue instead of stacking a new issue on the submitter's repo for every admin reply.

### Issue contents

The issue body is your message plus a short footer linking the component's directory listing and the submitter's profile thread, so the submitter can answer either on GitHub or in the directory.

### Replies coming back from GitHub

When the submitter replies on the issue, the reply appears in the package's Comments panel within a couple of minutes. Mirrored replies:

- Show a "via GitHub @login" pill linking to the original comment
- Count as unread submitter messages, so the header bell and per package badge light up
- Post to Slack once, with the comment URL

Replies are matched by comment id, so a reply is never mirrored twice. Comments by the token account itself and by bots are skipped so the sync cannot echo its own issues. Edits and deletions on GitHub are not synced; the mirrored copy stands.

Reply sync is off by default and needs a token with the right scope. See [GitHub Broadcast](/components/documentation/admin-broadcast#reply-sync) for setup and the Test connection button.

### Broadcasting an issue to many submitters

To open the same issue on every repo for a review status (for example, all Rejected components), use the Broadcast tab next to Logs. Replies to broadcast issues route to each package's own thread, never a shared inbox. See [GitHub Broadcast](/components/documentation/admin-broadcast).

## Best practices

### Notes

- Keep notes factual and professional
- Include relevant context for other admins
- Document significant decisions
- Use for review history tracking

### Comments

- Respond promptly to submitter questions
- Be clear about required changes
- Provide helpful guidance
- Mark messages as read to clear badges

## Search and filter

Notes and comments are visible when expanding individual packages. There is no global search across all notes/comments.

To find communications about a specific topic:

1. Search for the package by name
2. Expand the package row
3. Review the Notes and Comments panels
