# GitHub Broadcast

The Broadcast tab sits next to Logs on the admin dashboard. Use it to open one GitHub issue on every matching submitter repo, watch the send, and pull replies back into each package thread. Per message issues are covered in [Notes and Comments](/components/documentation/admin-notes#github-issue-messaging).

## Opening the tab

1. Go to `/components/submissions/admin`
2. Click Broadcast, next to Logs
3. Compose, reply sync, and history are all on that page. Nothing to expand

Old links to Settings with `#settings-github-broadcast` still open this tab.

A sending pill appears on the Broadcast tab while a job is running, so you can see it from any other admin view.

## Sending a broadcast

1. Pick a filter: Approved, Pending, Rejected, or All. Pending covers pending, in review, and packages with no status yet
2. Read the count. The card shows how many components have a GitHub repo and will get the issue, how many will be skipped, and a time estimate
3. Enter an issue title and body
4. Click Send and confirm the exact count in the modal

Issues open one at a time, 10 seconds apart. That is 6 per minute, well under GitHub's content creation limits (about 80 per minute and 500 per hour). A 300 repo broadcast takes about 50 minutes. If GitHub answers with a rate limit anyway, the worker waits the time GitHub asks for and retries the same repo, up to 3 attempts, before marking it failed.

Only one broadcast runs at a time. The Send button is disabled while one is in progress.

## Reading the history

Each broadcast in the list shows a status pill, a live progress bar, and sent, failed, skipped, and replies counts. Expand a row to see every package with its issue link, reply count, or the error GitHub returned.

| Error | Cause |
|-------|-------|
| 401 | `GITHUB_TOKEN` is invalid or expired |
| 403 without rate limit headers | Token cannot write issues on that repo |
| 404 | Repo is private, renamed, or deleted |
| 410 | Repo has issues disabled |

None of these are retried. Fix the cause and send a new broadcast to those packages.

## Cancel, archive, restore, delete

| Action | When available | Effect |
|--------|----------------|--------|
| Cancel | Running | Stops before the next send. Issues already opened stay on GitHub |
| Archive | Completed or cancelled | Hides the row from the default list. Reply sync keeps working |
| Restore | Archived | Brings it back |
| Delete | Anything not running | Removes the broadcast and its per package records |

Use the Show archived toggle to see archived rows.

Delete has one side effect worth knowing. Replies to a broadcast issue are matched through that broadcast's records. Once they are gone, a late reply on one of its issues has nothing to match and stays unread on GitHub. Mirrored replies already in package threads are kept. If the issues are still open, archive instead. Neither action touches anything on GitHub.

## Reply sync

Reply sync polls GitHub for replies on issues the directory opened (single messages and broadcasts) and mirrors them into the right package thread. Each mirrored reply also posts to Slack and counts as an unread submitter message.

The card shows:

| Field | Meaning |
|-------|---------|
| On / Off | Whether the poller runs. Off by default |
| Token | The GitHub login the token belongs to and which env variable it came from |
| Last poll | When the poller last ran |
| Last result | Threads seen, replies inserted, duplicates skipped, unmatched threads |
| Last error | The most recent failure, in plain words |

Setup:

1. Create a personal access token (classic) with the `notifications` scope. `repo` also works. Fine grained tokens are refused by GitHub's notifications API, and so is `public_repo` on its own
2. Set it as `GITHUB_NOTIFICATIONS_TOKEN` in Convex. If that variable is missing the poller falls back to `GITHUB_TOKEN`
3. Click Test connection. It reports the login and whether the notifications scope worked
4. Turn Reply sync on
5. Click Sync now to catch up on the last 24 hours instead of waiting for the next poll

The poller runs every 2 minutes and respects the poll interval GitHub sends back. When nothing changed GitHub returns an empty 304, which costs nothing against the rate limit. Notifications for pull requests, releases, or issues the directory did not open are left alone and reported as unmatched.

## Environment variables

| Setting | Env Variable |
|---------|--------------|
| GitHub issue creation (messages and broadcasts) | `GITHUB_TOKEN` (needs `public_repo` classic or Issues: write fine grained on the target repos) |
| GitHub reply sync | `GITHUB_NOTIFICATIONS_TOKEN` (classic token with `notifications` scope; falls back to `GITHUB_TOKEN`) |
| Slack posts for new messages and mirrored GitHub replies | `SLACK_WEBHOOK_URL` |

The same variables are listed in [Settings](/components/documentation/admin-settings#environment-variables).
