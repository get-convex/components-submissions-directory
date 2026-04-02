---
name: convex-doctor
description: Static analysis checklist for Convex backends covering 72 rules across security, performance, correctness, schema, architecture, configuration, and client-side patterns. Use when writing, reviewing, or auditing Convex code. Trigger on mentions of "convex-doctor", "health score", "static analysis", "anti-patterns", "audit convex", or before shipping backend changes.
---

# Convex Doctor Skill

Run through these checks when writing or reviewing Convex backend and client code. Based on the [convex-doctor](https://github.com/nooesc/convex-doctor) CLI which scores projects 0-100 across 72 rules in 7 categories.

## How to use this skill

1. Before shipping backend changes, scan the affected files against the rules below.
2. Flag violations by severity: **error** (must fix), **warning** (should fix), **info** (consider fixing).
3. Suggest the fix inline when flagging.
4. If the user has `convex-doctor` installed, recommend running `npx convex-doctor -v` for a full report.

## Security (13 rules, 1.5x weight)

| ID | Severity | Rule |
|---|---|---|
| missing-arg-validators | error | All query/mutation/action and internal variants must have `args` validators |
| missing-return-validators | warning | Public functions should have `returns` validators |
| missing-auth-check | warning | Public functions should call `ctx.auth.getUserIdentity()` |
| internal-api-misuse | error | Server-to-server calls must use `internal.*`, not `api.*` |
| hardcoded-secrets | error | No API keys, tokens, or secrets hardcoded in source |
| env-not-gitignored | error | `.env.local` must be in `.gitignore` |
| spoofable-access-control | warning | Do not trust client args like `userId` or `role` for access control |
| missing-table-id | warning | Use `v.id("table")` instead of `v.string()` for document references |
| missing-http-auth | error | HTTP action endpoints must include authentication |
| conditional-function-export | error | Do not conditionally export Convex functions based on environment |
| generic-mutation-args | warning | Do not use `v.any()` in public mutation args |
| overly-broad-patch | warning | Do not `ctx.db.patch` with spread args that bypass validation |
| http-missing-cors | warning | HTTP routes should include CORS headers |

## Performance (13 rules, 1.2x weight)

| ID | Severity | Rule |
|---|---|---|
| unbounded-collect | error | `.collect()` without `.take(n)` limit |
| filter-without-index | warning | `.filter()` scanning entire tables instead of using `.withIndex()` |
| date-now-in-query | error | `Date.now()` in query functions breaks caching |
| loop-run-mutation | error | `ctx.runMutation`/`ctx.runQuery` inside loops (N+1) |
| sequential-run-calls | warning | Multiple sequential `ctx.run*` calls in an action |
| unnecessary-run-action | warning | `ctx.runAction` from within an action (same runtime) |
| helper-vs-run | warning | `ctx.runQuery`/`ctx.runMutation` inside a query or mutation |
| missing-index-on-foreign-key | warning | `v.id("table")` schema field without a corresponding index |
| action-from-client | warning | Client calling actions directly instead of mutations |
| collect-then-filter | warning | `.collect()` followed by JS `.filter()` instead of DB query filters |
| large-document-write | info | Inserting documents with 20+ fields |
| no-pagination-for-list | warning | Public query with `.collect()` returning unbounded results |
| missing-pagination-opts-validator | warning | `.paginate(...)` without `paginationOptsValidator` in args |

## Correctness (20 rules, 1.5x weight)

| ID | Severity | Rule |
|---|---|---|
| unwaited-promise | error | `ctx.db.insert`, `ctx.runMutation`, etc. without `await` |
| old-function-syntax | warning | Legacy function registration syntax |
| db-in-action | error | Direct `ctx.db.*` calls inside actions |
| deprecated-api | warning | Deprecated APIs like `v.bigint()` |
| wrong-runtime-import | warning | Incompatible runtime imports |
| direct-function-ref | warning | Direct function refs instead of `api.*`/`internal.*` |
| missing-unique | warning | `.first()` where `.unique()` is appropriate |
| query-side-effect | error | Side effects (`ctx.db.insert`/`patch`/`delete`) inside queries |
| mutation-in-query | error | `ctx.runMutation` from within a query |
| cron-uses-public-api | error | Cron jobs referencing `api.*` instead of `internal.*` |
| node-query-mutation | error | Queries/mutations in `"use node"` files |
| scheduler-return-ignored | info | `ctx.scheduler.runAfter` return value not captured |
| non-deterministic-in-query | warning | `Math.random()`, `new Date()`, `crypto` in queries |
| replace-vs-patch | info | `ctx.db.replace` semantics reminder |
| generated-code-modified | error | Manual edits to `_generated/` files |
| unsupported-validator-type | error | Unsupported validators (`v.map()`, `v.set()`) |
| query-delete-unsupported | error | `.delete()` on query chains |
| cron-helper-method-usage | warning | Deprecated `crons.hourly`/`daily`/`weekly` |
| cron-direct-function-reference | error | Direct function identifiers in cron methods |
| storage-get-metadata-deprecated | warning | Deprecated `ctx.storage.getMetadata` |

## Schema (9 rules, 1.0x weight)

| ID | Severity | Rule |
|---|---|---|
| missing-schema | warning | No `schema.ts` in `convex/` |
| deep-nesting | warning | Validators nested more than 3 levels deep |
| array-relationships | warning | `v.array(v.id(...))` that may grow unbounded |
| redundant-index | warning | Index that is a prefix of another on the same table |
| too-many-indexes | info | Table with 8+ indexes |
| missing-search-index-filter | info | Search index without `filterFields` |
| optional-field-no-default-handling | warning | 5+ optional fields without undefined handling |
| missing-index-for-query | warning | Query filters on a field with no matching index |
| index-name-includes-fields | warning | Index name does not include all indexed fields in order |

## Architecture (8 rules, 0.8x weight)

| ID | Severity | Rule |
|---|---|---|
| large-handler | warning | Handler exceeding 50 lines |
| monolithic-file | warning | File with 10+ exported functions |
| duplicated-auth | warning | 3+ inline auth checks in the same file |
| action-without-scheduling | info | Action that could use `ctx.scheduler` instead |
| no-convex-error | info | `throw new Error(...)` instead of `throw new ConvexError(...)` |
| mixed-function-types | info | File mixing public and internal exports |
| no-helper-functions | info | Multiple large handlers with no shared helpers |
| deep-function-chain | warning | Action with 5+ `ctx.run*` calls |

## Configuration (5 rules, 1.0x weight)

| ID | Severity | Rule |
|---|---|---|
| missing-convex-json | warning | No `convex.json` in project root |
| missing-auth-config | error | Functions use `ctx.auth` but no `auth.config.ts` exists |
| missing-generated-code | warning | No `_generated/` directory |
| outdated-node-version | warning | Node version in config is outdated |
| missing-tsconfig | info | No `tsconfig.json` in convex directory |

## Client-Side (4 rules, 1.0x weight)

| ID | Severity | Rule |
|---|---|---|
| mutation-in-render | error | Mutation invocation during render |
| unhandled-loading-state | warning | `useQuery` result used without checking for `undefined` |
| action-instead-of-mutation | info | `useAction` where `useMutation` may suffice |
| missing-convex-provider | info | Convex hooks without `ConvexProvider` in component tree |

## Scoring

Health score is 0-100. Each finding deducts points based on severity and category weight, with per-rule caps.

| Score | Label | Meaning |
|---|---|---|
| 85-100 | Healthy | Few or no issues |
| 70-84 | Needs attention | Some issues worth addressing |
| 50-69 | Unhealthy | Significant problems |
| 0-49 | Critical | Serious issues requiring immediate attention |

## Common fix patterns

### Replace `.filter()` with `.withIndex()`

```typescript
// Bad
const docs = await ctx.db.query("tasks").filter((q) => q.eq(q.field("userId"), userId)).collect();

// Good (add index "by_userId" on ["userId"] in schema)
const docs = await ctx.db.query("tasks").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
```

### Replace loop mutations with batch

```typescript
// Bad
for (const id of ids) {
  await ctx.runMutation(internal.tasks.complete, { taskId: id });
}

// Good: single mutation that handles the batch
const updates = ids.map((id) => ctx.db.patch(id, { completed: true }));
await Promise.all(updates);
```

### Fix Date.now() in queries

```typescript
// Bad (in a query)
const cutoff = Date.now() - 86400000;

// Good: pass timestamp as an argument from the caller
args: { cutoff: v.number() },
```

### Fix unbounded collect

```typescript
// Bad
const all = await ctx.db.query("messages").collect();

// Good: paginate or limit
const recent = await ctx.db.query("messages").order("desc").take(50);
```

## CLI reference

```bash
npx convex-doctor        # basic scan
npx convex-doctor -v     # verbose with file paths and line numbers
npx convex-doctor --format json  # JSON output for CI
npx convex-doctor --score        # score only (prints a number)
npx convex-doctor --diff main    # only files changed vs base branch
```

Source: https://github.com/nooesc/convex-doctor
