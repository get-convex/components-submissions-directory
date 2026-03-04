# README Badges

Component authors can add a dynamic SVG badge to their GitHub README that links back to their listing in the Components Directory.

## Badge endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/badge?slug=X` | Returns an SVG badge image |

Replace `X` with your component's slug (the URL-safe identifier shown in your component's directory URL).

## Adding a badge to your README

Paste this markdown into your `README.md`, replacing `your-component` with your slug:

```markdown
[![Convex Components](https://www.convex.dev/api/badge?slug=your-component)](https://www.convex.dev/components/your-component)
```

The badge renders as an inline SVG showing "Convex Components" with a verified or community indicator based on your listing status.

## Badge styles

| Status | Appearance |
|--------|------------|
| Convex Verified | Badge with verified indicator |
| Community | Badge with community indicator |

The badge automatically reflects your current listing status. If an admin changes your verified or community flag, the badge updates on the next load.

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
