# README Badges

Component authors can add a dynamic SVG badge to their GitHub README that links back to their listing in the Components Directory.

## Badge endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/components/badge/your-slug` | Returns an SVG badge image |

Replace `your-slug` with your component's slug (the URL-safe identifier shown in your component's directory URL).

## Adding a badge to your README

Paste this markdown into your `README.md`, replacing `your-component` with your slug:

```markdown
[![Convex Component](https://www.convex.dev/components/badge/your-component)](https://www.convex.dev/components/your-component)
```

The badge renders as an inline SVG showing your component's review status.

## Badge styles

| Status | Color | Description |
|--------|-------|-------------|
| Approved | Blue | Component has been approved |
| In Review | Purple | Component is currently being reviewed |
| Changes Requested | Orange | Changes have been requested |
| Pending | Yellow | Awaiting review |
| Rejected | Red | Component was rejected |

The badge automatically reflects your current review status. When an admin updates your status, the badge updates on the next load.

## Badge analytics

Every badge load is recorded in the `badgeFetches` table. Admins can see:

- Which components have active badges
- How often each badge is loaded
- Referrer information (when available)

This helps the team understand which component authors are actively promoting their listings.

## Cache behavior

Badges are served with short-lived cache headers so updates to verified or community status propagate within minutes. GitHub and other Markdown renderers may apply their own image caching on top of this.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Badge shows "not found" | Verify the slug matches your directory URL exactly |
| Badge not updating | Clear browser cache or append a query param to bust cache |
| Badge not rendering on GitHub | Ensure the URL uses `https://` and the slug is correct |
