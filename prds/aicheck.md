# AI-Powered Convex Component Review

This document outlines the implementation of the AI review feature for validating npm package submissions against Convex component specifications.

## Overview

The AI review feature automatically analyzes submitted npm packages to ensure they follow Convex best practices and component specifications. It provides detailed feedback to admins, helping them make informed approval decisions.

All suggestions and feedback reference the official Convex documentation to ensure accuracy and consistency with the latest component authoring guidelines.

## Official Documentation References

The AI prompt explicitly includes these official Convex documentation URLs, ensuring all suggestions are based on current docs:

| Documentation            | URL                                                  | Purpose                      |
| ------------------------ | ---------------------------------------------------- | ---------------------------- |
| Authoring Components     | https://docs.convex.dev/components/authoring         | Primary component guide      |
| Understanding Components | https://docs.convex.dev/components/understanding     | Architecture overview        |
| Using Components         | https://docs.convex.dev/components/using             | Consumer integration         |
| Function Syntax          | https://docs.convex.dev/functions                    | Query/mutation/action syntax |
| Validation               | https://docs.convex.dev/functions/validation         | Return validators and args   |
| Actions                  | https://docs.convex.dev/functions/actions            | Action constraints           |
| Best Practices           | https://docs.convex.dev/understanding/best-practices | General patterns             |

## Convex Component Review Criteria

**What is a Convex Component?**

A Convex component is an npm package that other Convex applications can install and use. The key identifier: **"If it's installed like a component is, it's a component."**

**Key characteristics (from official docs):**

- Has `convex.config.ts` with `defineComponent()` export
- Contains Convex functions (queries, mutations, actions) in `component/` directory or root
- Published to npm (typically as `@namespace/package-name`)
- Installed by other apps via `npm install`
- Components run in isolated JavaScript contexts (no access to parent app's env vars or auth)

### The 9 Review Criteria

The AI evaluates submitted packages against these 9 criteria (defined in `convex/aiReview.ts`):

| #   | Criterion                                        | What to Check                                                                                      | Critical |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------- |
| 1   | Has `convex.config.ts` with `defineComponent()`  | Check for convex.config.ts in src/component/, src/, or root                                        | Yes      |
| 2   | Has component functions                          | TypeScript files with queries, mutations, or actions                                               | Yes      |
| 3   | Functions use new syntax                         | `query({`, `mutation({`, `action({` with args/handler                                              | Yes      |
| 4   | All functions have `returns:` validator          | Handler signatures include return validators                                                       | Yes      |
| 5   | Uses `v.null()` for void returns                 | Functions returning nothing use v.null() not undefined                                             | Yes      |
| 6   | Uses `withIndex()` not `filter()`                | Queries use indexes instead of filter                                                              | No       |
| 7   | Internal functions use `internal*`               | Sensitive functions use internalQuery, etc.                                                        | No       |
| 8   | Has TypeScript with proper types                 | Uses `Id<"table">` types, proper validators                                                        | No       |
| 9   | Uses token-based authorization (when applicable) | If component needs auth, uses token pattern like Presence component. Not all components need auth. | No       |

### Token-Based Authorization Pattern

For components that require authorization, the AI checks for the token-based pattern used by official Convex components like [Presence](https://github.com/get-convex/presence):

**Key characteristics:**

- Methods that establish sessions return tokens (e.g., `roomToken`, `sessionToken`)
- Subsequent method calls require those tokens for authorization
- The parent application handles authentication, the component handles authorization internally
- Context injection: Methods receive `ctx` from the caller via `RunMutationCtx` or `RunQueryCtx`

**Example pattern:**

```typescript
// heartbeat() returns tokens
async heartbeat(ctx: RunMutationCtx, roomId, userId, sessionId, interval): Promise<{ roomToken: string; sessionToken: string }>

// list() requires roomToken
async list(ctx: RunQueryCtx, roomToken: string): Promise<RoomData[]>

// disconnect() requires sessionToken
async disconnect(ctx: RunMutationCtx, sessionToken: string): Promise<void>
```

**Important:** Not all components need authorization. Simple utility components, data transformers, or components that don't manage user state may not require auth. The AI marks this criterion as PASS with a note explaining why auth isn't needed for such components.

## How AI Review Results Work

### Status Determination

The AI review determines one of three statuses based on which criteria pass or fail:

| Status    | Icon              | Condition                                    | Meaning                                      |
| --------- | ----------------- | -------------------------------------------- | -------------------------------------------- |
| `passed`  | Green CheckCircle | All 9 criteria pass                          | Component meets all specifications           |
| `partial` | Yellow Warning    | No critical failures, some non-critical fail | Component works but has room for improvement |
| `failed`  | Red XCircle       | At least one critical criterion fails        | Component has fundamental issues             |

### Critical vs Non-Critical Criteria

**Critical criteria** (5 total) represent fundamental component requirements. If any fail, the review status is `failed`:

1. **Has convex.config.ts with defineComponent()** - The defining characteristic of a component
2. **Has component functions** - Must have actual Convex functions to be useful
3. **Functions use new syntax** - Required for proper type safety and validation
4. **All functions have returns: validator** - All functions must declare their return type
5. **Uses v.null() for void returns** - Functions returning nothing must use v.null()

**Non-critical criteria** (4 total) represent best practices. Failing these results in `partial` status:

6. Uses withIndex() not filter()
7. Internal functions use internal\*
8. Has TypeScript with proper types
9. Uses token-based authorization (when applicable) - If component needs auth, uses token pattern. Not all components need auth.

### Auto-Approve and Auto-Reject

The admin dashboard has two automation settings:

**Auto-approve on pass** (enabled/disabled toggle):

- When enabled: If AI review status is `passed`, the package is automatically approved
- Review notes: "Auto-approved: AI review passed all criteria"
- Reviewed by: "AI"

**Auto-reject on fail** (enabled/disabled toggle):

- When enabled: If AI review status is `failed` AND at least one critical criterion fails, the package is automatically rejected
- Review notes: "Auto-rejected: AI review found critical issues"
- Reviewed by: "AI"

**Important:** `partial` status never triggers auto-approve or auto-reject. Admin must manually review.

### Automatic AI Review on Submission

When either auto-approve or auto-reject is enabled:

1. **User submits package** - Package is added to database immediately
2. **Package appears in frontend and /admin** - User sees confirmation right away
3. **AI review runs in background** - Scheduled via `ctx.scheduler.runAfter(0, ...)`
4. **Status updates automatically** - Auto-approve or auto-reject triggers if conditions met

This ensures users never think there's a bug while AI is checking. The flow:

```
Submit Package
     ↓
Package Added to DB (shows immediately)
     ↓
Check: Auto settings enabled AND has repository URL?
     ↓ Yes
Schedule AI Review (runs in background)
     ↓
AI Review Completes
     ↓
Auto-approve (if passed) or Auto-reject (if failed + critical)
```

## Backend Implementation

### File: `convex/aiReview.ts`

The AI review is implemented as a single Convex action that runs in the Node.js runtime (`"use node";`).

#### REVIEW_CRITERIA Constant

Defines all 9 criteria with:

- `name`: Display name shown in UI
- `check`: Description of what to check
- `critical`: Boolean flag for auto-reject logic

#### fetchGitHubRepo Function

Fetches source code from GitHub:

1. **Parse Repository URL**: Extracts owner and repo from GitHub URL
2. **Set Headers**: Includes GitHub token if available for higher rate limits
3. **Find convex.config.ts**: Checks multiple locations in priority order (supports deep nesting):
   - `convex/src/component/convex.config.ts` (deep nested like useautumn/typescript)
   - `convex/component/convex.config.ts`
   - `convex/convex.config.ts`
   - `src/component/convex.config.ts`
   - `src/convex.config.ts`
   - `convex.config.ts` (root)
   - `packages/component/convex.config.ts` (monorepo)
   - `lib/convex.config.ts`
4. **Fetch Component Files**: Based on config location, fetches `.ts` files from the appropriate directory
5. **Return Files Array**: Returns `{ exists, files, isComponent }`

#### runAiReview Action

Main action that orchestrates the review:

```
1. Set status to "reviewing"
2. Get package info from database
3. Check for repository URL (partial status if missing)
4. Fetch GitHub repository contents
5. Check for convex.config.ts (failed status if missing)
6. Build AI prompt with:
   - Official documentation references (7 URLs)
   - Key requirements from docs
   - Component definition
   - Package name and version
   - Criteria list with CRITICAL flags
   - Source code from fetched files
   - JSON response format specification
7. Call Anthropic Claude API (claude-sonnet-4-20250514)
8. Parse JSON response (handles markdown code blocks)
9. Determine status:
   - allPassed = all criteria passed
   - anyCriticalFailed = any critical criterion failed
   - status = "passed" | "partial" | "failed"
10. Build summary (includes suggestions if any)
11. Store results via updateAiReviewResult mutation
12. Check auto-approve/reject settings
13. If enabled, update package review status
14. Return null (or store error on exception)
```

### AI Prompt Structure

The prompt sent to Claude includes:

```
1. OFFICIAL CONVEX COMPONENT DOCUMENTATION REFERENCES
   - 7 documentation URLs
   - KEY REQUIREMENTS FROM DOCS (8 key points including token-based auth)

2. WHAT IS A CONVEX COMPONENT
   - Definition and characteristics

3. PACKAGE INFO
   - Name and version

4. CRITERIA TO CHECK
   - All 9 criteria with CRITICAL flag

5. SOURCE CODE
   - convex.config.ts content
   - Component TypeScript files

6. INSTRUCTIONS
   - Return criteria in EXACT order
   - Base suggestions on official docs
   - Reference docs for failed criteria
   - For token-based auth, mark PASS if component doesn't need auth

7. JSON RESPONSE FORMAT
   - Exact structure with all 9 criteria names
```

### JSON Response Format

The AI returns:

```json
{
  "summary": "2-3 sentence summary",
  "criteria": [
    {"name": "Has convex.config.ts with defineComponent()", "passed": true/false, "notes": "..."},
    {"name": "Has component functions", "passed": true/false, "notes": "..."},
    {"name": "Functions use new syntax", "passed": true/false, "notes": "..."},
    {"name": "All functions have returns: validator", "passed": true/false, "notes": "..."},
    {"name": "Uses v.null() for void returns", "passed": true/false, "notes": "..."},
    {"name": "Uses withIndex() not filter()", "passed": true/false, "notes": "..."},
    {"name": "Internal functions use internal*", "passed": true/false, "notes": "..."},
    {"name": "Has TypeScript with proper types", "passed": true/false, "notes": "..."},
    {"name": "Uses token-based authorization (when applicable)", "passed": true/false, "notes": "..."}
  ],
  "suggestions": "Improvement suggestions with doc references"
}
```

## Frontend Implementation

### File: `src/Admin.tsx`

#### AiReviewButton Component

- Robot icon button with loading state
- Calls `api.aiReview.runAiReview` action
- Disabled if no repository URL
- Shows "Reviewing..." during analysis

#### AiReviewStatusBadge Component

Displays current AI review status:

- `reviewing`: Gray, animated pulse
- `passed`: Green CheckCircle
- `failed`: Red XCircle
- `partial`: Yellow Warning
- `error`: Red XCircle

#### AiReviewResultsPanel Component

Expandable panel showing detailed results:

1. **Status Icon** (at start):

   - Green CheckCircle for `passed`
   - Yellow Warning for `partial`
   - Red XCircle for `failed` or `error`

2. **Header**: "AI Review Results" with date

3. **Summary**: AI-generated summary with suggestions

4. **Error Display**: Shows error message if status is `error`

5. **Criteria Checklist** (expandable):
   - Each criterion with CheckCircle (green) or XCircle (red)
   - Criterion name and notes

#### AdminSettingsPanel Component

Collapsible settings panel with:

1. **How AI Review Works**:

   - Link to official docs
   - Files checked explanation
   - Critical criteria list
   - Non-critical criteria list
   - Documentation links

2. **Review Status Icons Legend**:

   - Green CheckCircle = Passed
   - Yellow Warning = Partial
   - Red XCircle = Failed/Error

3. **Auto-approve toggle**:

   - Calls `api.packages.updateAdminSetting`

4. **Auto-reject toggle**:
   - Calls `api.packages.updateAdminSetting`

## Component Structure Detection

The AI review checks for `convex.config.ts` in multiple locations (priority order):

1. `convex/src/component/convex.config.ts` (deep nested)
2. `convex/component/convex.config.ts`
3. `convex/convex.config.ts`
4. `src/component/convex.config.ts`
5. `src/convex.config.ts`
6. `convex.config.ts` (root)
7. `packages/component/convex.config.ts` (monorepo)
8. `lib/convex.config.ts`

**Deep nested structure (like useautumn/typescript):**

```
repo-name/
├── convex/
│   └── src/
│       └── component/
│           ├── convex.config.ts   ← THE KEY FILE
│           ├── index.ts
│           └── mutations.ts
├── package.json
└── README.md
```

**Typical structure (src/component):**

```
@convex-dev/component-name/
├── src/
│   └── component/
│       ├── convex.config.ts   ← THE KEY FILE
│       ├── index.ts
│       └── mutations.ts
├── package.json
└── README.md
```

**Alternative structure (root):**

```
@convex-dev/component-name/
├── convex.config.ts          ← THE KEY FILE
├── component/
│   └── index.ts
├── package.json
└── README.md
```

## Environment Variables

Required in Convex dashboard:

| Variable            | Purpose                        | Required    |
| ------------------- | ------------------------------ | ----------- |
| `ANTHROPIC_API_KEY` | Claude API access              | Yes         |
| `GITHUB_TOKEN`      | GitHub API rate limit increase | Recommended |

## Database Schema

### packages table additions

```typescript
aiReviewStatus: v.optional(v.union(
  v.literal("not_reviewed"),
  v.literal("reviewing"),
  v.literal("passed"),
  v.literal("failed"),
  v.literal("partial"),
  v.literal("error")
)),
aiReviewSummary: v.optional(v.string()),
aiReviewCriteria: v.optional(v.array(v.object({
  name: v.string(),
  passed: v.boolean(),
  notes: v.string(),
}))),
aiReviewedAt: v.optional(v.number()),
aiReviewError: v.optional(v.string()),
```

### adminSettings table

```typescript
adminSettings: defineTable({
  key: v.union(v.literal("autoApproveOnPass"), v.literal("autoRejectOnFail")),
  value: v.boolean(),
}).index("by_key", ["key"]),
```

## Write Conflict Prevention

Following best practices:

1. **Direct patching**: All mutations use `ctx.db.patch()` without reading first
2. **Idempotent updates**: Status updates can be called multiple times safely
3. **Indexed queries**: Admin settings lookups use `withIndex("by_key")`
4. **Timestamp ordering**: Review timestamps use `Date.now()`
5. **Loading states**: Frontend prevents duplicate review triggers

## Technical Notes

- **AI Model**: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Max Tokens**: 2048
- **Response Format**: Structured JSON with criteria in exact order
- **JSON Parsing**: Handles markdown code block wrapping
- **Error Handling**: Graceful fallbacks for all failure scenarios
- **Cost**: ~$0.01-0.05 per review depending on code size

## Limitations

- Requires GitHub repository URL (npm-only packages get partial review)
- Requires `convex.config.ts` to identify as a valid Convex component
- Only analyzes component files (doesn't check test files or examples)
- AI may occasionally misinterpret complex patterns
- Rate limited by GitHub API (60/hour without token, 5000/hour with token)
