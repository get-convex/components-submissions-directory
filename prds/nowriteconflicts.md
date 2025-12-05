# Avoiding Write Conflicts in the npm Package Directory App

## Overview

This document outlines the patterns used to prevent write conflicts in the npm package directory Convex backend. Write conflicts occur when two functions running in parallel make conflicting changes to the same document or table.

## Current Implementation Status

The app uses best practices to minimize write conflicts:

### Mutations with Direct Patching (No Read Before Write)

All admin mutations patch directly without reading first:

#### `updateReviewStatus`

```typescript
export const updateReviewStatus = mutation({
  args: {
    packageId: v.id("packages"),
    reviewStatus: v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("changes_requested")
    ),
    reviewNotes: v.optional(v.string()),
    reviewedBy: v.string(), // Identifier for who reviewed (e.g., "AI" or admin name)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Patch directly without reading first to avoid write conflicts
    await ctx.db.patch(args.packageId, {
      reviewStatus: args.reviewStatus,
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      ...(args.reviewNotes !== undefined && { reviewNotes: args.reviewNotes }),
    });
    return null;
  },
});
```

**Why it works:** The mutation patches directly using the document ID. If the document doesn't exist, `ctx.db.patch` will throw an error, which is the expected behavior.

#### `updateVisibility`

```typescript
export const updateVisibility = mutation({
  args: {
    packageId: v.id("packages"),
    visibility: v.union(
      v.literal("visible"),
      v.literal("hidden"),
      v.literal("archived")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packageId, {
      visibility: args.visibility,
    });
    return null;
  },
});
```

**Why it works:** Direct patch without unnecessary read.

#### `deletePackage`

```typescript
export const deletePackage = mutation({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.packageId);
    return null;
  },
});
```

**Why it works:** Direct delete without checking if document exists first.

### Package Submission with Indexed Queries

The `addPackage` mutation uses indexed queries to check for duplicates:

```typescript
export const addPackage = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Use indexed query for duplicate check
    const existing = await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Update existing package
      await ctx.db.patch(existing._id, { /* ... */ });
      return existing._id;
    }

    // Insert new package with timestamp-based ordering
    return await ctx.db.insert("packages", {
      ...args,
      submittedAt: Date.now(),
    });
  },
});
```

**Why it works:**
1. Uses `withIndex("by_name")` for efficient lookup
2. Timestamp-based ordering with `Date.now()` avoids reading all packages to calculate order
3. Direct patch on existing document

## Schema with Proper Indexes

```typescript
const applicationTables = {
  packages: defineTable({
    name: v.string(),
    description: v.string(),
    // ... other fields
    submittedAt: v.number(),
    reviewStatus: v.optional(v.union(/* ... */)),
    visibility: v.optional(v.union(/* ... */)),
  })
    .index("by_name", ["name"])
    .index("by_submitted_at", ["submittedAt"])
    .index("by_review_status", ["reviewStatus"])
    .index("by_visibility", ["visibility"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["visibility", "reviewStatus"],
    })
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["visibility", "reviewStatus"],
    }),
};
```

**Key patterns:**
- Indexed queries for common lookups (name, submitted_at, review_status)
- Full-text search indexes for user searches
- Filter fields on search indexes for visibility scoping

## Frontend Debouncing

For rapid user interactions, the frontend uses:

1. **Loading state tracking** to prevent duplicate submissions:

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  if (isLoading) return; // Prevent duplicate calls
  setIsLoading(true);
  try {
    await mutation();
  } finally {
    setIsLoading(false);
  }
};
```

2. **Optimistic status checks** before calling mutations:

```typescript
const handleStatusChange = async (newStatus: ReviewStatus) => {
  if (isLoading || status === newStatus) return; // Skip if same status
  // ...
};
```

## Query Patterns

### Public Search (Client-side filtering)

```typescript
export const searchPackages = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) {
      // Return visible packages sorted by newest
      const allPackages = await ctx.db.query("packages").collect();
      return allPackages
        .filter(pkg => !pkg.visibility || pkg.visibility === "visible")
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 50);
    }

    // Use full-text search indexes
    const nameResults = await ctx.db
      .query("packages")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchTerm))
      .take(50);

    // Combine and deduplicate results
    // ...
  },
});
```

**Why it works:** Queries don't cause write conflicts; they're read-only.

### Admin List (No visibility filter)

```typescript
export const getAllPackages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("packages").collect();
  },
});
```

## Best Practices Summary

### Always Do

1. **Patch directly without reading first** when you only need to update fields
2. **Use indexed queries** for lookups instead of `ctx.db.get()`
3. **Use timestamp-based ordering** with `Date.now()` for new items
4. **Track loading states** in the frontend to prevent duplicate mutations
5. **Check if update is needed** before calling mutations (idempotent checks)

### Never Do

1. ❌ Read a document before patching when you have the ID
2. ❌ Query entire tables to calculate max order values
3. ❌ Call mutations without loading state protection
4. ❌ Use `ctx.db.get()` when an indexed query would work

## Potential Future Improvements

### If High-Frequency Updates Occur

If the app grows to have many concurrent users updating packages, consider:

1. **Separate counters table** for download tracking:

```typescript
// Instead of updating weeklyDownloads on package
await ctx.db.insert("downloadEvents", {
  packageId: args.packageId,
  timestamp: Date.now(),
});
// Aggregate in a scheduled function or query
```

2. **Batch updates** for multiple status changes:

```typescript
export const batchUpdateStatus = mutation({
  args: {
    updates: v.array(v.object({
      packageId: v.id("packages"),
      status: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.updates.map((u) =>
        ctx.db.patch(u.packageId, { reviewStatus: u.status })
      )
    );
  },
});
```

## Monitoring

Check the Convex dashboard regularly for:

- **Health/Insights**: Shows retries due to write conflicts
- **Error Logs**: Permanent failures after retries
- **Function Latency**: High latency may indicate frequent retries

## Resources

- [Convex Write Conflicts Documentation](https://docs.convex.dev/error#1)
- [Optimistic Concurrency Control](https://docs.convex.dev/database/advanced/occ)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Convex Search](https://docs.convex.dev/search)

## Quick Reference

**Single-Line Prompt for Cursor:**
When creating Convex mutations, always patch directly without reading first, use indexed queries for ownership checks instead of `ctx.db.get()`, make mutations idempotent with early returns, use timestamp-based ordering for new items, and use `Promise.all()` for parallel independent operations to avoid write conflicts.
