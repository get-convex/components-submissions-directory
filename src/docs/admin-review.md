# Review Workflow

The review workflow manages component submissions from pending to approval or rejection.

## Review statuses

| Status | Description | Directory visibility |
|--------|-------------|---------------------|
| Pending | New submission, not yet reviewed | Hidden |
| In Review | Admin is actively reviewing | Hidden |
| Approved | Meets criteria, live in directory | Visible |
| Changes Requested | Admin requested updates | Hidden |
| Rejected | Does not meet criteria | Hidden |

## Status transitions

```
Pending → In Review → Approved
                   → Changes Requested → In Review
                   → Rejected
```

Any status can transition to any other status as needed.

## Changing status

1. Expand the package row
2. Find the "Status" row
3. Click the appropriate status button

The current status is highlighted. Click a different status to change it.

## Review process

### Initial review (Pending → In Review)

1. Open the package details
2. Check npm URL and GitHub repo
3. Verify component structure
4. Run AI review if not done
5. Set status to "In Review"

### Approval (In Review → Approved)

1. Verify all requirements met
2. Generate slug if missing
3. Add category if not set
4. Set Convex Verified or Community badge
5. Generate SEO content
6. Set status to "Approved"

### Requesting changes

1. Set status to "Changes Requested"
2. Add a note explaining what needs to change
3. User receives notification
4. Wait for user to update and request re-review

### Rejection

1. Set status to "Rejected"
2. Add a note explaining rejection reason
3. User receives notification

## Visibility controls

Separate from status, visibility controls whether an approved component appears in the directory:

| Visibility | Effect |
|------------|--------|
| Visible | Appears in directory (default for approved) |
| Hidden | Does not appear in directory |

Use visibility to temporarily hide a component without changing its review status.

## Featured components

Featured components appear in the Featured section on the directory homepage.

### Making a component featured

1. Expand the package row
2. Find the "Featured" row
3. Toggle "Featured" on
4. Set sort order (lower numbers appear first)

### Featured sort order

The sort order field determines position in the Featured section:

- **1** - First position
- **10** - Later position
- Empty - Appears after ordered items

Featured sort order is independent of the directory sort dropdown.

## Review checklist

Before approving, verify:

- [ ] npm package exists and is accessible
- [ ] GitHub repo is public and accessible
- [ ] Package follows Convex component structure
- [ ] Has convex.config.ts file
- [ ] Documentation is adequate
- [ ] No security concerns
- [ ] Category is appropriate
- [ ] Description is accurate

## Soft deletion from user side

Users can request deletion of their own submissions through the profile page:

1. User clicks "Send Request" and submits a deletion request
2. Admin receives notification in the Notes panel
3. Admin marks the component for deletion (or the user's request triggers it directly via `requestDeleteMySubmission`)
4. Component enters a configurable waiting period
5. After the waiting period, the component is permanently deleted

### Canceling user-requested deletion

During the waiting period, either the user (via `cancelDeleteMySubmission`) or an admin can cancel the deletion. The component returns to its previous review status and visibility.

Pending deletions appear in the admin Deletion tab with the time remaining and who requested the deletion.

## Notes for reviewers

Use the Notes panel to add internal reviewer notes:

- Assessment observations
- Follow-up items
- Historical context
- Communication with other admins

Notes are admin-only and not visible to submitters.
