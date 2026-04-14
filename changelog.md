# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- Pre-Oct 2025 stat card from admin dashboard (2026-04-14)
  - Cleaned up `convex/dashboard.ts` return value and `src/pages/Dashboard.tsx` UI

### Added

- All-time download tracking for packages (2026-04-14)
  - New `allTimeDownloads` optional field on packages schema
  - `fetchNpmPackageHandler` now fetches cumulative downloads from npm date-range API alongside weekly
  - Dashboard shows both "Weekly Downloads" and "All Time Downloads" stat cards
  - All-time counts populate on next npm data refresh (manual or scheduled)
  - Files: `convex/schema.ts`, `convex/packages.ts`, `convex/dashboard.ts`, `src/pages/Dashboard.tsx`

- CSV and PDF export for admin dashboard filtered view (2026-04-14)
  - CSV button exports current filtered Components table as a downloadable `.csv` file
  - PDF button opens a print-friendly report in a new window with active filter summary
  - Both exports respect all active filters (search, type, status, date range, author exclusions)
  - Files: `src/pages/Dashboard.tsx`

### Fixed

- Fix security report modal stacking on component detail and submissions pages (2026-04-13)
  - Modal rendered inside sticky sidebar created a local stacking context, letting main content code blocks overlap it
  - Wrapped `SecurityReportModal` and `SubmitSecurityReportModal` in `createPortal(..., document.body)` so they mount at document root
  - Ref: [PR #22](https://github.com/get-convex/components-submissions-directory/pull/22)
  - Files: `src/pages/ComponentDetail.tsx`, `src/pages/Submit.tsx`

### Changed

- Renamed "Security Analyze" to "Community scan via Socket" on component detail and submissions pages (2026-04-13)
  - Removed shield icon from sidebar button and modal header in `ComponentDetail.tsx` and `Submit.tsx`
  - Removed scan date from public security modals (admin still sees dates)
  - Reframed label to attribute scan to Socket, not Convex
  - Files: `src/pages/ComponentDetail.tsx`, `src/pages/Submit.tsx`

### Added

- Takedown, removal, and review flow FAQ items added to public FAQ section and documentation (2026-04-13)
  - New FAQ entries: report flagged components (contact Convex), who decides removal, review flow
  - Added to `src/components/FAQSection.tsx` (Directory and SubmitForm pages)
  - Added to `src/docs/submit.md` (admin Documentation page)
  - Updated `src/docs/component-detail.md`, `src/docs/admin-security-scan.md`, `src/docs/index.md` to reflect renamed scan label
  - Files: `src/components/FAQSection.tsx`, `src/docs/submit.md`, `src/docs/component-detail.md`, `src/docs/admin-security-scan.md`, `src/docs/index.md`

- Community approved/rejected stats and review status filter on dashboard (2026-04-13 22:15 UTC)
  - New stat cards: "Community Approved" and "Community Rejected" with counts and sublabels
  - New "Status" dropdown filter (All / Approved / Not approved / Pending / In review / Changes requested / Rejected) integrates with existing filters
  - Updated `component-report.html` with approval/rejection counts, per-row status badges, and status filter/sort controls
  - Files: `src/pages/Dashboard.tsx`, `component-report.html`

- Admin analytics dashboard at `/components/dashboard` for team reporting (2026-04-13 21:00 UTC)
  - Stat cards: total components, community count, get-convex count, get-convex since Oct 2025, total weekly downloads, pre-Oct 2025 count
  - Sortable components table with columns for name, author, type, submitted date, weekly downloads, last published, review status
  - Author summary table with component count, total downloads, and team/community badge per author
  - Monthly submission timeline with stacked bars showing get-convex vs community splits
  - Filters: search by name/author, type (all/community/get-convex), date range with custom date picker, multi-select author exclusion checklist
  - Refresh button wired to `triggerManualRefreshAll` to pull live npm download data
  - Admin-only auth gate (@convex.dev emails), `bg-bg-primary` background matching app design system
  - Dashboard link added to Header nav (desktop + mobile) next to Docs for admin users
  - Info banner explaining live data and post-deploy refresh workflow
  - New backend query `convex/dashboard.ts` with server-side aggregation
  - Files: `convex/dashboard.ts` (new), `src/pages/Dashboard.tsx` (new), `src/main.tsx`, `src/components/Header.tsx`

### Changed

- Remove status labels from public Security Analyze modals (2026-04-04 00:30 UTC)
  - Removed "Status: Safe as of..." / "Status: Alerts" / "Status: Not scanned" line from ComponentDetail.tsx and Submit.tsx modals
  - Public modals now show only "Not yet scanned" or "Scanned [date]" with no safe/warning/unsafe indicator
  - Admin Security Analyze reports and status kept unchanged
  - Files changed: `src/pages/ComponentDetail.tsx`, `src/pages/Submit.tsx`

### Fixed

- Fix infinite re-render loop on Admin API tab causing spinner and 1,300+ console logs (2026-04-03 14:10 UTC)
  - `Date.now()` called in render body caused `useQuery` args to change every frame, triggering React "Too many re-renders" error
  - Stabilized timestamp with `useMemo` rounded to nearest minute so query args stay stable
  - Replaced `.take(1000)` + JS `.filter()` in `countKeysAndGrants` with `by_status` index query
  - Files changed: `src/pages/Admin.tsx`, `convex/apiKeys.ts`

- Fix production crash on `listAllDirectoryCategories` return validator (2026-04-02 08:00 UTC)
  - Return validator was missing `packageCount` and `verifiedCount` optional fields that exist on the `categories` schema
  - When any category had denormalized counts populated, the strict validator rejected the response and threw a server error
  - Added `packageCount: v.optional(v.number())` and `verifiedCount: v.optional(v.number())` to the return validator
  - File changed: `convex/packages.ts`

### Added

- Security scanning documentation page and docs updates (2026-04-02 07:30 UTC)
  - New `src/docs/admin-security-scan.md` covering providers, manual/batch/auto/scheduled scanning, settings, results, public visibility, env vars, data model, and troubleshooting
  - Registered new doc in `src/pages/Documentation.tsx` under Admin Guide section
  - Updated `src/docs/index.md` with Security scanning link
  - Updated `src/docs/admin-settings.md` with Security Scan Settings panel and env variables
  - Updated `src/docs/admin-dashboard.md` with Review row in expanded package view
  - Updated `src/docs/admin-review.md` with Review row section for AI Review, Security Scan, and Review history
  - Updated `src/docs/component-detail.md` with Security Analyze sidebar entry and modal section
  - Updated `src/docs/submit.md` with Security scan report section

- Security Analyze button and modal on Submit page for each component (2026-04-02 05:15 UTC)
  - New "Security" button in the expanded action buttons row next to Demo, matching existing secondary button style
  - Opens a security report modal with scan status, providers, recommendations, and contact author section
  - Uses `getLatestSecurityScan` query per expanded row for on-demand loading

- Security scan backlog queue and tracker in Admin Security Scan Settings (2026-04-02 05:15 UTC)
  - New `getSecurityScanBacklogStats` query returns counts: unscanned, scanning, scanned, errors, total with repo
  - New `runSecurityScanBacklog` mutation queues unscanned/errored packages per batch
  - Backlog section shows badge counts, configurable batch size dropdown (5/10/20/50/100), and a "Scan next N" button
  - Shows green checkmark when all packages with repos have been scanned

### Removed

- Devin AI integration removed from security scan system (2026-04-02 04:15 UTC)
  - Removed Devin AI toggle from Admin.tsx Security Scan Settings panel
  - Removed Devin provider display from ComponentDetail.tsx security report modal
  - Removed Devin from securityScan.ts orchestrator task list so it never runs
  - Hardcoded `enableDevinScan: false` in admin settings helper
  - Removed Devin from scheduled scan provider check
  - Schema fields kept optional for backward compatibility with existing scan history
  - Socket.dev and Snyk continue to work as before

### Changed

- Moved "How to get help" above Security Analyze in ComponentDetail.tsx sidebar (2026-04-02 06:00 UTC)
  - Removed scan date subtitle from the Security Analyze sidebar box
  - Simplified the security box to a single-line clickable label without status text

- Refined the public Component Detail security scan UI to use neutral scan language and provider links (2026-04-02 00:24 UTC)
  - Updated `src/pages/ComponentDetail.tsx` so the sidebar now shows `Security Analyze` with only scan presence and date
  - Renamed the modal title to `Security Analyze`, moved the scan date above the providers list, and linked providers to their external scan sites
  - Removed `safe` or `unsafe` wording from the sidebar and provider rows while keeping a modal-only status line with `Confirmed`, `Not scanned`, and `Alerts`
  - Made the unscanned state open the same modal and hid the page Markdown dropdown while the modal is open

### Added

- Security scan system with Socket.dev and Snyk integration (2026-03-31 22:30 UTC)
  - New `convex/securityScan.ts` with provider adapters, parallel execution via `Promise.allSettled`, and normalized finding model
  - New `securityScanRuns` table for historical scan audit trail
  - Security scan fields on `packages` table (denormalized latest snapshot: `securityScanStatus`, `securityScanSummary`, etc.)
  - Admin settings: per-provider toggles (`enableSocketScan`, `enableSnykScan`), auto-scan on submission, configurable schedule (manual/3/5/7 days)
  - New "Review" row in Admin.tsx between Status and Visibility with AI Review, Security Scan, and combined Review history buttons
  - Security Scan Settings panel in admin settings with provider toggles and schedule dropdown
  - Review history panel now has tabs for AI Reviews and Security Scans
  - Public security report box in ComponentDetail.tsx sidebar (between ratings and "How to get help") with shield icons
  - Security report modal matching existing design: provider results, recommendations, contact author section, third party notice
  - Scheduled security scan cron (daily at 5 AM UTC, gated by `securityScanScheduleDays` setting)
  - Auto security scan on submission when `autoSecurityScan` is enabled
  - Convex env vars needed: `SOCKET_API_KEY`, `SNYK_TOKEN`, `SNYK_ORG_ID`

### Fixed

- Socket.dev security scans now use the documented PURL endpoint and parse Socket's NDJSON response correctly (2026-04-01 22:05 UTC)
  - Root cause: `convex/securityScan.ts` was calling `/v0/report/supported`, which returns `404 API route not found`
  - Switched to `/v0/purl?alerts=true&compact=true` with bearer auth
  - Updated parsing to handle `application/x-ndjson` responses and empty success bodies without turning them into `socket: error`
  - Verified by rerunning the `@convex-dev/stripe` security scan and confirming Convex now stores `socket: safe`

- Search results now scroll to top when typing in the search box while scrolled down on Directory and Category pages (2026-03-28 20:00 UTC)
  - Added smooth scroll-to-top in the existing `useEffect` that resets paging state on search term change
  - Files changed: `src/pages/Directory.tsx`, `src/pages/CategoryPage.tsx`
- Page now starts at top when navigating between categories or clicking back to the directory (2026-03-28 20:00 UTC)
  - Set `history.scrollRestoration = "manual"` in `src/main.tsx` to disable browser auto-restoring previous scroll positions
  - Added `window.scrollTo(0, 0)` on app init so every full-page navigation starts at the top
  - File changed: `src/main.tsx`

### Added

- Slack notifications for directory activity (2026-04-02 12:00 UTC)
  - `slack.sendMessage` posts to `SLACK_WEBHOOK_URL`; scheduled from: new submissions (`submitPackage`), new private messages (`addPackageComment`), completed security scans (`_saveSecurityScanResultAndRun` in `convex/packages.ts` after Socket/Snyk runs)
  - Files: `convex/slack.ts`, `convex/packages.ts`

- Admin "Update README" action button to refresh README content from GitHub without regenerating AI content (2026-03-27 00:15 UTC)
  - New `refreshReadme` internal action and `refreshReadmeContent` public action in `convex/seoContent.ts`
  - New `_updateReadmeOnly` internal mutation in `convex/seoContentDb.ts` patches only the README fields
  - Button placed next to Generate Content in the admin Actions row
  - Useful for pulling in updated READMEs after upstream changes without waiting for full AI regeneration

### Changed

- Removed 20k character cap on stored README content so full READMEs display without truncation (2026-03-27 01:00 UTC)
  - Removed `.slice(0, 20000)` from both `generateDirectoryContent` and `refreshReadme` save paths in `convex/seoContent.ts`
  - Convex string fields support up to 1MB, so no practical limit is needed
- README section on component detail page now renders independently of v2 AI content generation (2026-03-27 00:45 UTC)
  - Moved `readmeIncludedMarkdown` rendering outside the `contentModelVersion === 2 && generatedDescription` gate in `src/pages/ComponentDetail.tsx`
  - Components with only a README (no AI content yet) now show the README on their detail page

### Fixed

- Full README content now stored and displayed on component detail pages instead of truncating at 12k characters (2026-03-26 22:00 UTC)
  - Split `sanitizeReadmeForPrompt` into `sanitizeReadme` (clean only) and `sanitizeReadmeForPrompt` (clean plus truncate) in `convex/seoContent.ts`
  - `fetchGitHubReadme` now returns `fullContent` (untruncated) alongside `rawContent` (truncated for AI prompts)
  - `fetchContentContext` and `fetchPreviewContext` use `fullContent` for `readmeIncludedMarkdown` extraction
  - AI prompts still receive the 12k truncated version to stay within token limits
  - Packages with large READMEs (e.g. `@convex-dev/workflow`) no longer show `[README truncated for prompt length]` on the detail page after regeneration

### Changed

- Scale optimization: reduced bandwidth and subscription costs following OpenClaw patterns (2026-03-21 00:30 UTC)
  - Added compound indexes for `reviewStatus` + `visibility` + `markedForDeletion` filter patterns on packages table
  - Added `by_featured_and_reviewStatus`, `by_enabled_and_sortOrder`, `by_status` (apiKeys), `by_revoked` (apiAccessGrants) indexes
  - Swapped Directory and CategoryPage from reactive `useQuery` subscriptions to one-shot `convex.query()` fetches
  - Added change detection in `updateNpmDataHelper` to skip no-op patches that would invalidate subscriptions
  - Denormalized category counts (`packageCount`, `verifiedCount`) into `categories` table; `listCategories` no longer scans all packages
  - REST API `/api/components/search` now uses Convex search indexes instead of loading 5000+ full documents and filtering in JS
  - Added `_searchApprovedPackages` internal query and `backfillCategoryCounts` internal migration

### Fixed

- Duplicate package submission now shows a clear, actionable error message instead of generic "Server Error Called by client" (2026-03-21)
  - Backend error includes the npm package name and tells the submitter to check their profile or contact support
  - Frontend now properly extracts ConvexError.data for human-readable messages in both submit and generate content flows

### Changed

- Improved convex-doctor health score from 39/100 to 100/100 with zero issues (2026-03-21 06:10 UTC)
  - Achieved perfect score across 20 files with no warnings, errors, or info findings
  - Extracted 40+ helper functions from large handlers across `packages.ts`, `seoContent.ts`, `seoContentDb.ts`, `thumbnailGenerator.ts`, `seed.ts`, `paymentsDb.ts`, and `apiKeys.ts`
  - Refactored `triggerManualRefreshAll` and `triggerManualRefreshAllPackages` into shared `createLogAndScheduleRefresh` helper
  - Refactored `listApprovedComponents` sorting into `sortPackages` and mapping into `toDirectoryCard`
  - Refactored `getRelatedComponents` scoring into `scoreAndRankRelated`
  - Refactored `getMySubmissions` merging into `mergeAndDedupePackages` and `toSubmissionCard`
  - Refactored `scheduledDeletionCleanup` into `deletePackageAndRelatedData` (table-driven cascade delete)
  - Refactored `updateMySubmission` field building into `buildSubmissionUpdates`
  - Refactored `updateComponentDetails` into `buildComponentDetailsPatch`, `validateAndApplySlug`, `validateAndApplyCategory`
  - Refactored `upsertCategory` into `updateExistingCategory`
  - Refactored `refreshGitHubIssueCounts` into `fetchGitHubIssueCounts`
  - Refactored `backfillRewardStatusFromPayments` into `aggregatePaymentsByPackage` and `reconcileRewardStatuses`
  - Refactored `_upsertOfficialComponent` into `patchExistingOfficialComponent` and `insertNewOfficialComponent`
  - Refactored `seedOfficialComponents` into `buildDryRunResult`, `seedSingleComponent`, `seedAllComponents`
  - Refactored `generateSeoContent` into `fetchSeoContext`, `buildSeoCandidates`, `parseSeoAiResponse`
  - Refactored `generateDirectoryContent` into `fetchContentContext`, `parseContentAiResponse`
  - Refactored `previewDirectoryContent` into `fetchPreviewContext` with reused `buildSeoCandidates` and `parseContentAiResponse`
  - Refactored `migrateToContentModel` into `tryBuildSkillMd` and `buildMigrationPatch`
  - Refactored `_generateThumbnailForPackage` into `resolveTemplate`, `loadLogoPngBuffer`, `composeAndUploadThumbnail`
  - Refactored `_autoGenerateThumbnail` into `checkAutoGenPrereqs` with reused composition helpers
  - Refactored `_autoGenerateThumbnailWithTemplate` to reuse `resolveTemplate`, `loadLogoPngBuffer`, `composeAndUploadThumbnail`
  - Removed inline debug logging (`fetch` to localhost) from `thumbnailGenerator.ts` reducing handler line count
  - Added strategic suppressions in `convex-doctor.toml` for intentional patterns: array relationships, deep nesting, monolithic file, mixed function types, large document writes, duplicated auth, scheduler return values, deep function chains, sequential run calls

- Improved convex-doctor health score from 39/100 to 80/100 (2026-03-20)
  - Replaced `throw new Error` with `throw new ConvexError` across all Convex handler files for proper structured client errors
  - Replaced `api.*` references with `internal.*` for all server-to-server calls including `fetchNpmPackage`, `runAiReview`, and scheduler calls
  - Added `.take(n)` bounds to all 40 unbounded `.collect()` calls to prevent unbounded bandwidth
  - Replaced database `.filter()` with `.withIndex()` in 7+ locations for better query performance
  - Fixed `Date.now()` in query functions (`getBadgeStats`, `getRefreshStats`, `getApiAnalytics`) by accepting `now` as an argument
  - Added missing `returns:` validators to 10+ functions across multiple files, including `submitPackage`
  - Batched `runAiReview` action mutations from 13 sequential ctx.run* calls down to 8
  - Parallelized AI provider settings queries with `Promise.all`
  - Extracted `fetchNpmPackage` handler into shared helper with both public + internal action registrations
  - Extracted `runAiReview` handler into shared helper with both public (auth-checked) + internal action registrations
  - Added auth checks (`requireAdminIdentity`) to all 15 public functions in `aiSettings.ts`
  - Added auth checks to public `fetchNpmPackage` and `runAiReview` actions
  - Converted `logApiRequest` from fire-and-forget to properly awaited pattern in HTTP handlers
  - Removed 8 redundant prefix indexes from schema (e.g., `by_package` when `by_package_and_created` exists)
  - Updated 24 query references from removed `by_package` index to use compound index equivalents

### Added

- `convex.json` deployment configuration file (2026-03-20)
- `convex-doctor.toml` static analysis configuration with intentional suppressions for optional fields, index naming, storage FK indexes, `.first()` usage, httpAction determinism, and public directory auth (2026-03-20)
- `by_isDefault` index on `aiPromptVersions` and `seoPromptVersions` tables for direct lookup (2026-03-20)
- `by_tokenIdentifier_and_status` compound index on `apiKeys` table (2026-03-20)
- CORS OPTIONS handlers for 7 HTTP routes that were missing preflight support (2026-03-20)
- `_getAdminSettings`, `_getAllPackages`, `_saveAiReviewResultAndRun`, `_fetchNpmPackage`, `_runAiReview` internal functions (2026-03-20)
- Restructured `.claude/skills/` to standard Agent Skills directory format with YAML frontmatter (2026-03-19 07:15 UTC)
  - All 6 existing skills migrated from flat `name.md` to `name/SKILL.md` with proper `name` and `description` frontmatter
  - Added `real-time-backend/SKILL.md` from get-convex/real-time-backend-skill: backend architecture principles, anti-patterns, and implementation guidance
  - Added `convex-quickstart/SKILL.md` from get-convex/agent-skills: project scaffolding with templates for React, Next.js, and bare backends
  - Added `convex-setup-auth/SKILL.md` from get-convex/agent-skills: auth provider setup with Convex Auth, Clerk, WorkOS, and Auth0
  - Added `schema-builder/SKILL.md` from get-convex/convex-agent-plugins: schema design patterns, validator reference, and index strategy
  - Added `function-creator/SKILL.md` from get-convex/convex-agent-plugins: query/mutation/action creation with auth, validation, and error handling
  - Added `migration-helper/SKILL.md` from get-convex/convex-agent-plugins: safe migration patterns with batch processing and dual-write
  - Added `react-effect-decision/SKILL.md` from humanagent project: decision tree for avoiding direct `useEffect` in favor of derived state, handlers, `key`, memoization, and Convex hooks

### Changed

- Existing Claude skills restructured from flat markdown files to directory based SKILL.md format following https://code.claude.com/docs/en/skills (2026-03-19 07:15 UTC)

### Fixed

- `/components/components.md` now proxies directly from `og-meta.ts` to Convex `/api/markdown-index` so the deployed URL returns markdown instead of SPA HTML (2026-03-18 02:16 UTC)
  - Root cause: Netlify redirects do not fire after the `/components/*` edge function runs and calls `context.next()`
  - The existing `llms.txt` route already used this direct-proxy pattern, but the directory markdown index route did not
  - Verified `npm run build` still passes after the edge routing fix

### Changed

- Documentation viewer now uses Pierre Diffs (`@pierre/diffs`) for syntax-highlighted code blocks with line numbers and copy button, matching the ComponentDetail page renderer (2026-03-18 02:00 UTC)
- Documentation viewer now supports inline HTML via `rehype-raw` (2026-03-18 02:00 UTC)
- Documentation viewer now detects video URLs (`.mp4`, `.webm`, `.mov`) and renders native `<video>` elements (2026-03-18 02:00 UTC)
- Documentation viewer table rendering upgraded with header backgrounds and alternating row shading (2026-03-18 02:00 UTC)
- Updated `updating-docs.md` to document Pierre Diffs rendering pipeline and supported markdown features (2026-03-18 02:00 UTC)

### Fixed

- API Usage Modal now links to `/components/components.md` instead of the old `/components.md` path (2026-03-18 00:45 UTC)

### Changed

- Profile page account removal help text now includes direct contact email (2026-03-18 00:40 UTC)

### Added

- Admin API access controls with global toggle, per-user grants, and analytics dashboard (2026-03-18 00:30 UTC)
  - New "API" tab in Admin page with a global on/off toggle for the REST API (defaults to off)
  - Admin user search to find submitters and grant/revoke individual API access by email
  - API analytics dashboard showing 24h/7d request counts, endpoint breakdown, and recent requests table
  - `apiAccessGrants` table in schema for email-based admin grants
  - `apiAccessEnabled` admin setting key to control global API availability
  - REST API endpoints return 503 when global toggle is off
  - Profile page API Access section only visible when global toggle is on AND user has been granted access
  - "For Agents" section on Directory page below FAQ linking to `/components/llms.txt` and `/components/components.md`

### Fixed

- `/components.md` was returning 404 due to missing `force = true` on the Netlify redirect (2026-03-17 23:30 UTC)
  - The Convex `/api/markdown-index` endpoint worked fine, but the proxy rule never fired without force
  - Also added `/components/components.md` as an alias path to the same endpoint

### Added

- Per-user REST API for the Components Directory at `/api/components/*` (2026-03-17 23:00 UTC)
  - Six endpoints: search, detail, install, docs, categories, info
  - API key management on the Profile page with generate, view, and revoke flows
  - Two-tier rate limiting: 100 req/min with API key, 10 req/min anonymous
  - Keys use SHA-256 hashed storage with `cdk_` prefix for identification
  - API Usage Guide modal on Profile page with endpoint docs and curl examples
  - New `apiKeys` table in schema, extended `mcpApiLogs` with `apiKeyId` and `hashedIp` fields
  - Netlify proxy rules for `/api/components/*`

### Fixed

- Raw HTML tags in GitHub READMEs now render correctly on component detail pages (2026-03-17 22:15 UTC)
  - Added `rehype-raw` plugin to all `ReactMarkdown` instances in `ComponentDetail.tsx`
  - Tags like `<div align="center">`, `<strong>`, and inline `<img>` were previously displayed as literal text instead of rendered HTML
  - Affects Use Cases, How it Works, From the README, and v1 long description sections

### Changed

- README preview source toggle now opens by default on SubmitForm and ProfileEditSubmission pages (2026-03-17 21:00 UTC)
  - `ReadmePreviewNotice` component default state changed from collapsed to expanded
  - Helps submitters see the README source explanation without needing to click

### Removed

- Removed "View markdown source" option from the Markdown dropdown on component detail page (2026-03-17 20:15 UTC)
  - Option was broken after the unified markdown rendering refactor and no longer toggled properly
  - Cleaned up unused `showMarkdown` state, `mdCopied` state, `handleCopyMdInline` function, `EyeOpenIcon` import, and the markdown source view panel
  - Remaining dropdown options (Open markdown file, Copy as Markdown, Copy page URL, Open in ChatGPT/Claude/Perplexity) are unchanged

### Changed

- Hidden "Add badge to your README" section on component detail page (2026-03-17 19:30 UTC)
  - Badge markdown snippet, copy button, and preview image removed from `ComponentDetail.tsx`
  - Standalone `View llms.txt` link remains visible
  - Badge section still present on Profile, Submit, and other surfaces

### Fixed

- SKILL.md (Download Skill) now generated during submit, profile edit, and content model migration (2026-03-17 18:45 UTC)
  - Previously `buildSkillMdFromContent` was only called inside `generateDirectoryContent` (admin regeneration), so packages submitted with v2 content or migrated to v2 never got a `skillMd` until an admin regenerated
  - Extracted `buildSkillMdFromContent` to `shared/buildSkillMd.ts` for reuse across "use node" actions and mutation files
  - `submitPackage` builds `skillMd` when v2 content is present at submission
  - `updateMySubmission` rebuilds `skillMd` when users edit v2 content from their profile
  - `migrateToContentModel` backfills `skillMd` for packages already having v2 content fields
  - `updateGeneratedContent` (admin) auto-rebuilds `skillMd` when content fields change
  - `_addPackage` now accepts optional `skillMd` argument

### Changed

- Component detail markdown rendering now uses a unified `markdown-body` CSS class with GitHub-style typography (2026-03-17 17:53 UTC)
  - Added `.markdown-body` class in `src/index.css` with proper heading hierarchy (h1 1.5rem with bottom border, h2 1.25rem with bottom border, h3 1.1rem, h4 1rem), paragraph spacing, nested list bullet progression (disc, circle, square), inline code styling, blockquote borders, GFM table zebra striping, task list checkbox support, and comfortable 1.7 line-height
  - Replaced 4 duplicated inline Tailwind `[&_*]` class blocks in `src/pages/ComponentDetail.tsx` with single `markdown-body` wrapper divs on Use Cases, How it Works, From the README, and v1 long description sections
  - Fixed heading hierarchy: v1 long description headings were forced to `text-sm uppercase` which made README h1/h2 unreadable; now renders at proper sizes matching GitHub README appearance
  - Simplified `src/components/markdownComponents.tsx` by removing heading, paragraph, list, and blockquote overrides (now handled by CSS) and adding shared `img` component with video detection
  - Removed duplicated `img`, `p` component definitions from ComponentDetail v1 section since shared markdownComponents now handles these

- ProfileEditSubmission content editor now shows editor and preview side by side on desktop, stacked on mobile (2026-03-17 15:25 UTC)
  - Description, Use Cases, and How it Works use a two-column grid (`lg:grid-cols-2`) with labeled Edit and Preview panes
  - Description gets a live markdown preview for the first time
  - Preview panes have independent scroll with `min-h` and `max-h` constraints for balanced layout
  - README preview remains full-width (read-only)
- Package, Repo, and npm values in ProfileEditSubmission info box are now clickable links (2026-03-17 15:28 UTC)
  - Package links to the component detail page, Repo and npm open in new tabs

- Admin, submit, and profile content generation are now unified on the same v2 prompt and flow (2026-03-17 06:44 UTC)
  - Admin action bar button switched from `regenerateSeoContent` (v1 SEO) to `regenerateDirectoryContent` (v2 content), renamed to "Generate Content"
  - `buildContentPrompt` now accepts an admin custom template; both `generateDirectoryContent` and `previewDirectoryContent` load the admin prompt via `_getSeoActivePromptContent`
  - Admin prompt settings panel renamed to "Component Directory Content Prompt" with v2 placeholders and description
  - Default prompt in `convex/aiSettings.ts` switched to `DEFAULT_CONTENT_PROMPT_TEMPLATE`
  - User rate limit raised from 1 to 5 generations per hour; warning modal text updated in `src/pages/SubmitForm.tsx` and `src/pages/ProfileEditSubmission.tsx`
  - Admin remains exempt from rate limiting

- README and generated markdown now renders with GitHub-style tables, proper heading spacing, and shared component overrides (2026-03-17 06:26 UTC)
  - Created `src/components/markdownComponents.tsx` with shared `react-markdown` component overrides for code blocks, GFM tables (borders, header background, alternating rows), headings with top margin, lists, blockquotes, and horizontal rules
  - `src/pages/SubmitForm.tsx`, `src/pages/ProfileEditSubmission.tsx`, and `src/pages/ComponentDetail.tsx` now use the shared components instead of duplicated inline overrides
  - Detail page README wrapper classes updated with full heading and list spacing to match GitHub rendering

- Component detail page now shows an hr separator and "From the README.md" heading above imported README content (2026-03-17 06:15 UTC)
  - Added `<hr>` and `<h3>` to the rendered detail page and the `buildComponentMarkdown` export for llms.txt

- AI generation surfaces now show a pulsing DotsNine loading indicator instead of static "Generating..." text (2026-03-17 06:08 UTC)
  - Created shared `src/components/AiLoadingDots.tsx` using Phosphor `DotsNine` with `animate-pulse`
  - Applied to the generate buttons and warning modal confirm buttons in `src/pages/SubmitForm.tsx` and `src/pages/ProfileEditSubmission.tsx`
  - Applied to the Regenerate SEO + Skill button and content migration Generate button in `src/pages/Admin.tsx`

- Generated content preview is now rate limited and warned before use on submit and profile edit surfaces (2026-03-17 05:53 UTC)
  - Added `contentGenerationRequests` in `convex/schema.ts` plus new helper functions in `convex/contentGenerationLimits.ts` to enforce a `once per hour per signed-in account` cooldown
  - Updated `convex/seoContent.ts` so `previewDirectoryContent` requires authentication, records each request, and returns a clearer retry message when the cooldown is active
  - `src/pages/SubmitForm.tsx` and `src/pages/ProfileEditSubmission.tsx` now show a matching warning modal before generation that tells users not to abuse regeneration and to edit the current draft when possible
  - Updated remaining `previewDirectoryContent` callers to pass source metadata so the new action contract stays consistent

- Submit, profile, agent prompt, and imported README rendering were polished for the v2 content workflow (2026-03-17 05:43 UTC)
  - `src/pages/SubmitForm.tsx`, `src/pages/Profile.tsx`, and `src/pages/ProfileEditSubmission.tsx` now use the same wide `max-w-7xl` shell pattern as `src/pages/Submit.tsx`
  - Generated-content textareas in submit and profile edit are now vertically resizable for longer editing sessions
  - `src/components/ReadmePreviewNotice.tsx` now uses toggle icons to make its expand or collapse behavior more obvious
  - `src/components/CodeBlock.tsx` now includes a copy control, and `src/components/AgentInstallSection.tsx` now renders the visible prompt block with the shared Diffs-based code UI
  - `src/pages/ComponentDetail.tsx` now resolves relative imported README links like `CONTRIBUTING.md` against the GitHub repository instead of sending users to local 404 routes

- The v2 content editing flow is now aligned across detail, submit, admin, and profile surfaces (2026-03-17 05:21 UTC)
  - `src/pages/ComponentDetail.tsx` now places `View llms.txt` inside the badge section, and README source copy now reads more naturally via `convex/seoContent.ts`
  - `src/pages/SubmitForm.tsx` now uses a `1200px` layout and a shared README preview helper linked to the official Convex component template
  - `src/components/ComponentDetailsEditor.tsx`, `src/pages/Admin.tsx`, and `convex/seoContentDb.ts` now support the v2 generated content model for migrated packages instead of only the old AI SEO editor
  - Added `src/pages/ProfileEditSubmission.tsx` plus a new route in `src/main.tsx` so submitters edit on a dedicated full page instead of a modal

- AI SEO generation now grounds output on the submission README before package metadata and cross checks Convex terminology against Convex docs context (2026-03-16 23:05 UTC)
  - Added shared fallback prompt template in `shared/seoPromptTemplate.ts` so `convex/aiSettings.ts` and `convex/seoContent.ts` stay aligned
  - `convex/seoContent.ts` now fetches GitHub README content on demand, supports common GitHub `blob` and `tree` README paths, and adds best effort docs grounding from `https://docs.convex.dev/llms.txt` plus a reachability check for `https://docs.convex.dev/`
  - Updated the Admin SEO Prompt Settings help text and placeholder list in `src/pages/Admin.tsx` to match the new README first prompt behavior
  - Verified with `npm run build`

### Added

- Editable AI SEO content fields in admin Component Details editor (2026-03-14 UTC)
  - New `updateSeoContent` admin mutation in `convex/seoContentDb.ts` for directly patching SEO fields without regenerating via AI
  - New `SeoContentSection` component in `src/components/ComponentDetailsEditor.tsx` with inline editing for value prop, benefits, use cases, FAQ, resource links, and SKILL.md
  - All SEO text fields use `resize-y` textareas so admins can drag to expand any field
  - Edit button appears next to generated SEO content header; Save and Cancel controls at the bottom
  - Local edit state syncs with backend on regeneration so fresh AI output flows through when not editing
  - Passed `seoBenefits`, `seoUseCases`, `seoFaq`, and `seoResourceLinks` from admin query through `PackageComponentDetailsEditor` to the editor component
  - Read-only summary shows value prop preview, benefit bullets, use case and FAQ counts, and SKILL.md status
  - AI SEO generation still only triggers from the Regenerate button or the auto-generate admin setting; manual edits never call the AI

### Fixed

- Stored README markdown no longer includes the prompt prefix text "From the README.md" (2026-03-17 06:04 UTC)
  - `fetchGitHubReadme` in `convex/seoContent.ts` now returns separate `content` (for AI prompt) and `rawContent` (for storage) fields
  - Both `extractReadmeIncludeBlock` call sites updated to use `rawContent`

- React hooks order error in `src/pages/ProfileEditSubmission.tsx` fixed by moving `canGenerate` and `handleOpenGenerateWarning` above all early returns (2026-03-17 06:00 UTC)

- Migrated component detail pages now render README code blocks safely and no longer show legacy Resources or SEO blocks after moving to the v2 content model (2026-03-17 03:50 UTC)
  - Fixed `src/components/CodeBlock.tsx` to pass the correct `name` field into `@pierre/diffs`, which resolves the runtime `Cannot read properties of undefined (reading 'match')` crash during README code rendering
  - Updated `src/pages/ComponentDetail.tsx` so old visible SEO sections only render for the legacy content model
  - Removed obsolete Resources output from the legacy markdown builders in `convex/http.ts` and `convex/router.ts` so exported markdown matches the visible detail page

- Hiding detail page SEO visibility now also hides the `llms.txt` link on component detail pages (2026-03-16 22:49 UTC)
  - Updated `src/pages/ComponentDetail.tsx` so the standalone `View llms.txt` link respects the same `hideSeoAndSkillContentOnDetailPage` flag as the visible SEO and SKILL sections
  - Verified with `npm run build` and confirmed the Netlify production build passes

- Component detail long description heading now capitalizes the visible component name instead of using raw package casing (2026-03-16 21:47 UTC)
  - Added `capitalizeHeadingText()` in `src/pages/ComponentDetail.tsx` and applied it only to the visible `{Component Name} Description` heading
  - Left AI generated SEO content unchanged
  - Verified with `npm run build` and confirmed the Netlify production build passes

- Admin can now hide generated SEO and SKILL content from the public detail page without deleting it (2026-03-16 21:37 UTC)
  - Added a new Actions row toggle in `src/pages/Admin.tsx` to hide or show generated SEO and SKILL content on `src/pages/ComponentDetail.tsx`
  - Added `hideSeoAndSkillContentOnDetailPage` to package data in `convex/schema.ts` and `convex/packages.ts`
  - `src/pages/ComponentDetail.tsx` now hides the visible SEO blocks, `For Agents` link, `AgentInstallSection`, SKILL download action, and `SKILL.md` block when the toggle is enabled
  - Detail-page meta description and FAQ JSON-LD now respect the same hidden state so draft SEO changes stay off the public page
  - Verified with `npx convex codegen`, `npx tsc --noEmit`, and `npm run build` (2026-03-16 21:37 UTC)

- Submit form category dropdown now saves the selected admin-managed category correctly (2026-03-16 17:27 UTC)
  - Updated `src/pages/SubmitForm.tsx` to use category `id` values from `useDirectoryCategories()` for label lookup, option keys, and selection state
  - Brings the public submit flow back in sync with the admin category editor and backend category storage
  - Verified with `npm run build`

- Admin submissions can now be viewed by approval date from the sort dropdown (2026-03-13 22:33 UTC)
  - Added a `Recently approved` sort option in `src/pages/Admin.tsx` backed by the existing `approvedAt` field
  - When selected, package cards show the approval date in the row summary and expanded calendar tooltip instead of the submitted date
  - Verified the Netlify production build with `npm run build` (2026-03-13 22:35 UTC)

- Admin package cards no longer duplicate the `Reviewed by` label outside AI review history (2026-03-13 21:40 UTC)
  - Removed the inline `Reviewed by` line from the expanded package card in `src/pages/Admin.tsx`
  - Kept the same reviewer attribution visible in the AI Review History drawer detail pane so the metadata still appears during run inspection

- Reward sending now gated by package reviewStatus (2026-03-13 20:00 UTC)
  - Rewards can only be sent for packages with `in_review` or `approved` status, preventing payouts for pending or rejected submissions
  - Backend guard in `convex/payments.ts` returns descriptive error if status is wrong
  - Admin UI disables the Send Reward button with tooltip when status does not qualify
  - Added `backfillRewardStatusFromPayments` mutation to reconcile packages where Tremendous succeeded but `rewardStatus`/`rewardTotalAmount` fell out of sync

### Changed

- Admin collapsible toggle boxes now expand on full row click (2026-03-13 21:30 UTC)
  - Component Author, Component Details, and Package Metadata sections all use the same click-anywhere-to-expand pattern
  - Replaced inner `<button>` elements with clickable `<div>` wrappers with keyboard accessibility (`Enter`/`Space`)
  - Pill label on the right still visually indicates the toggle state

- Collapsed author info behind a toggle in admin package cards (2026-03-13 20:15 UTC)
  - New `AuthorToggleSection` component in `src/pages/Admin.tsx` wraps submitter email, name, and Discord fields behind a show/hide button
  - Styled to match Component Details and Package Metadata boxes (rounded border, bg-bg-hover/30, uppercase header, subtitle)
  - Defaults to hidden, reducing card clutter and protecting PII at a glance

### Added

- Video support in long description markdown rendering on component detail pages (2026-03-12 22:45 UTC)
  - Added `img` component override to `ReactMarkdown` in `src/pages/ComponentDetail.tsx` that renders native `<video>` elements for `.mp4`, `.webm`, and `.mov` source URLs instead of broken `<img>` tags
  - Added `a` component override that does the same for links pointing to video files (GitHub sometimes wraps video references in anchor tags)
  - Both video elements include `controls` and `playsInline` for playback on desktop and mobile
  - Fixes gray box issue where GitHub README videos (like `SelfHosting.mp4` on `get-convex/static-hosting`) were rendered as unsupported image tags
  - Non-video images continue to render normally with lazy loading

- Shareable WorkOS admin auth feedback PRD for team review (2026-03-10 01:04 UTC)
  - Added `prds/workos-admin-feedback-request.md` with the current admin access rule, WorkOS claim dependency, and a short question list for WorkOS best practice feedback
  - Documents that admin access comes from `identity.email` in Convex and currently allows authenticated `@convex.dev` accounts

- Component detail help modal for support and install guidance (2026-03-09 22:22 UTC)
  - Added a small `How to get help` trigger below the rating block in `src/pages/ComponentDetail.tsx`
  - The new modal points users to the component author's GitHub Issues page when a repository URL is available
  - Added a Convex community support link plus a smaller third party component notice for community installs

- Shareable Netlify `llms.txt` redirect checklist for dev handoff (2026-03-09 17:53 UTC)
  - Added `prds/netlify-llms-redirect-checklist.md` with a concise "What to fix" summary, dashboard checks, redeploy steps, and verification commands for the stale redirect issue
  - Documents why markdown and badge routes can still work while `llms.txt` fails, and when to replace the redirect with an edge-function proxy

- Discord username display on component detail pages (2026-03-09 21:55 UTC)
  - When a submitter provides a Discord username, it now appears in the sidebar below the repo link and above the Verified/Community badges
  - Displays the Phosphor `DiscordLogo` icon and links to the Convex community Discord at `https://www.convex.dev/community/`
  - Added `submitterDiscord` to `publicPackageValidator` and `toPublicPackage()` in `convex/packages.ts`

- Admin editable submitter name and Discord in Submitter Info section (2026-03-09 21:55 UTC)
  - `SubmitterEmailEditor` in `src/pages/Admin.tsx` now includes Name and Discord fields alongside email editing
  - Name and Discord display with copy buttons in the non-editing view, consolidated into the same editable section
  - Added `updateSubmitterInfo` admin mutation in `convex/packages.ts` for patching `submitterName` and `submitterDiscord`

- Public preflight checker for validating component repos before submission (2026-03-08 22:30 UTC)
  - New page at `/components/submit/check` where developers can test their GitHub repo against review criteria
  - Requires authentication (auto-redirects to sign in if not authenticated)
  - Uses same AI review logic as admin reviews via shared `runReviewOnRepo` helper extracted from `convex/aiReview.ts`
  - Added `runPreflightCheck` internal action that runs review without persisting results to `packages` table
  - Added `preflightChecks` table in `convex/schema.ts` for rate limiting (hashed IP) and 30-minute result caching
  - Added `/api/preflight` HTTP endpoint with authentication check, IP-based throttling: 10 checks per hour per IP, 1 concurrent check limit
  - Created `convex/preflight.ts` with helpers for IP hashing (`hashIp`), URL normalization (`normalizeRepoUrl`), and internal queries and mutations (`_checkRateLimit`, `_getCachedResult`, `_createPreflightCheck`, `_updatePreflightCheck`, `_hasInFlightCheck`)
  - Created `src/pages/SubmitCheck.tsx` with auth gate, repo input form, loading states, and detailed results UI showing pass or fail status, summary, critical vs advisory criteria breakdown, and suggestions
  - Added route at `/components/submit/check` in `src/main.tsx`
  - Added prominent preflight check link in `src/pages/SubmitForm.tsx` below the page header with icon and helper text
  - Security: Returns only status, summary, criteria, and suggestions. Does not expose provider names, model names, or raw LLM output. Stores only hashed IPs. Requires valid auth token.
  - PRD: `prds/public-preflight-checker.md`

### Changed

- AI review prompt moved to v6 with package entry point checks and wrapper-aware component guidance (2026-03-13 04:39 UTC)
  - Updated `convex/aiReview.ts` review criteria and prompt text to add a critical `package.json` entry point check for `./convex.config.js` and `./_generated/component.js`, while calling out `/test` support explicitly
  - Reframed component source discovery so a top-level `convex/` directory is no longer treated as a normal packaged component pattern unless surrounding package evidence supports it
  - Clarified that React hooks, classes, and helper APIs may be exported by a component package even though component functions remain server-only across the boundary
  - Expanded GitHub repo snapshots in `convex/aiReview.ts` to include `package.json` plus visible client and test entry files so entry point and wrapper checks are based on visible evidence
  - Mirrored the same v6 default review prompt in `convex/aiSettings.ts`, bumped `shared/aiReviewPromptMeta.ts`, and added PRD `prds/ai-review-prompt-v6.md`

- AI review prompt moved to v5 with component source detection and split validator criteria (2026-03-09 21:16 UTC)
  - Updated `convex/aiReview.ts` so repository discovery checks all visible `convex.config.ts` files and prefers the config that uses `defineComponent()` over consumer apps that only use `defineApp()`
  - Updated the default review prompt in both `convex/aiReview.ts` and `convex/aiSettings.ts` to add component source discovery guidance, keep 8 critical pass criteria, and expand advisory notes from 4 to 5 by splitting args validators from returns validators
  - Clarified that missing public `returns` validators are advisory only, while missing public `args` validators remain a critical failure
  - Updated the Admin AI Review Settings help text in `src/pages/Admin.tsx` to match the v5 review model
  - Added shared prompt metadata in `shared/aiReviewPromptMeta.ts` so the review version label and updated date stay in sync across backend prompt files and the Admin prompt panel
  - Verified with `npx tsc -p convex/tsconfig.json --noEmit --pretty false` and `npm run build`, which is the build command configured in `netlify.toml`

- Submit page table now hides the desktop `Published` column and shows publish dates inside expanded submission details (2026-03-09 08:03 UTC)
  - Rebalanced the collapsed desktop table so `Maintainer`, `Downloads`, `Submitted`, and `Status` use equal-width columns in `src/pages/Submit.tsx`
  - Kept publish metadata available by moving it into the expanded details grid when a user opens a submission row
  - Verified with `npm run build`

- AI review prompt updated to v4 to prevent false failures on internal functions (2026-03-09 06:45 UTC)
  - Criterion 5 (public component functions have validators) now explicitly exempts `internalQuery`, `internalMutation`, and `internalAction` from the validator requirement
  - Added new IMPORTANT bullet in system prompt clarifying only public `query`/`mutation`/`action` functions that cross the component boundary require explicit args and returns validators
  - Updated JSON response template notes for criterion 5 to document the exemption
  - Applied identically to both `convex/aiReview.ts` (inline fallback prompt and `REVIEW_CRITERIA` array) and `convex/aiSettings.ts` (`DEFAULT_REVIEW_PROMPT` constant)

### Fixed

- Submit success modal action buttons now use the standard rounded button shape instead of pill styling (2026-03-12 17:06 UTC)
  - Updated `src/pages/SubmitForm.tsx` so `View My Submissions` and `Back to Directory` use `rounded-lg`, which matches the modal's surrounding shape language more closely
  - Synced `task.md`, `changelog.md`, and `files.md` and rechecked the Netlify build with `npm run build`

- Thumbnail generation from the admin component editor now queues through a public Convex wrapper action instead of calling the worker path directly (2026-03-12 17:05 UTC)
  - Updated `convex/thumbnailGenerator.ts` so `generateThumbnailForPackage` verifies admin access and schedules new internal worker `_generateThumbnailForPackage`
  - Keeps the real image composition work on the private worker path, which avoids the runtime `Called by client` failure seen from `src/components/ComponentDetailsEditor.tsx`
  - Updated the editor success toast to reflect queued behavior with `Thumbnail generation started`
  - Verified Convex sync passes with `npx convex dev --once --typecheck disable`

- Tremendous reward notes now reach recipients as custom message copy instead of staying local to payment history only (2026-03-09 20:58 UTC)
  - `convex/payments.ts` now forwards the optional note to Tremendous `delivery.meta.message` so the message appears in the reward email and landing page when provided
  - The reward payload stays unchanged for sends without a note, which preserves existing package rewards and test reward behavior
  - Updated reward and test reward modal labels in `src/pages/Admin.tsx` to clarify the field is a recipient-facing message
  - Verified with `npm run build`

- Profile submissions can now add or replace logos after the initial submit without losing owner-only protections (2026-03-09 06:25 UTC)
  - Added logo upload, replace, and clear controls to the edit modal in `src/pages/Profile.tsx`
  - Extended `getMySubmissionForEdit` in `convex/packages.ts` to return the current `logoUrl` so the profile editor can reflect saved state
  - Reused the existing Convex upload URL flow so user edits match the initial submit experience

- Package write authorization is now enforced on the backend instead of relying on frontend routes alone (2026-03-09 06:25 UTC)
  - Hardened admin-only package mutations in `convex/packages.ts`, including review status, visibility, featured controls, submit listing visibility, thumbnail save, and manual refresh actions
  - Shared logo writes now require package ownership or admin access, which preserves Admin capabilities while blocking cross-package edits from non-admin users
  - Moved submit, refresh, and AI review system writes onto internal mutations and derived submission ownership from the authenticated email in `submitPackage`
  - Verified with `npx convex codegen` and `npm run build`

- Submit form packages now default to Community in Admin (2026-03-09 05:51 UTC)
  - `convex/packages.ts` now passes `communitySubmitted: true` from `submitPackage` into `addPackage` for public submissions
  - Newly submitted packages now load with the Community toggle enabled in the Admin Actions row and `ComponentDetailsEditor` without extra UI-only defaults
  - Verified with `npx convex codegen` and `npm run build`

- Component detail category links and admin category slug lifecycle now stay in sync with category pages (2026-03-09 05:19 UTC)
  - `src/pages/ComponentDetail.tsx` now links the sidebar category pill to `/components/categories/:slug` only when the package category still maps to an enabled public category
  - Detail page markdown export now uses the same resolved admin-managed category label shown in the UI
  - `convex/packages.ts` now validates admin category updates, migrates related package category slugs on category slug edits, and clears related package category values on delete to avoid orphaned category routes
  - Hardened category admin APIs so `listAllDirectoryCategories`, `upsertCategory`, `deleteCategory`, and `seedCategories` require admin identity

- Category pages now show 24 components before pagination and return to the correct `/components/` root (2026-03-09 05:11 UTC)
  - Increased `src/pages/CategoryPage.tsx` pagination from 12 to 24 items per page
  - Normalized breadcrumb, back links, mobile "All" chips, shared category sidebar root links, and router redirects to `/components/`
  - Kept category detail routes on `/components/categories/:slug`

- Directory categories now open category landing pages instead of falling back to the old filtered load more view (2026-03-09 05:02 UTC)
  - `src/pages/Directory.tsx` now uses direct category links in the desktop sidebar and mobile category pills
  - The main `/components` overview keeps the 12 card preview plus `View all` behavior for grouped category sections
  - `Load more` remains only for featured and search driven flat result views

- Review-state detail pages now stay shareable without exposing full agent UI or indexable metadata before approval (2026-03-09 01:58 UTC)
  - `src/pages/ComponentDetail.tsx` now sets `noindex, nofollow` for `pending`, `in_review`, `changes_requested`, and `rejected`, while only `approved` keeps indexable robots behavior and JSON-LD injection
  - `For Agents`, `Use with agents and CLI`, SKILL download actions, and the `SKILL.md` block now render only for `in_review` and `approved`
  - `netlify/edge-functions/og-meta.ts` now injects matching robots meta into crawler-visible HTML so Netlify edge output stays in sync with the SPA
  - Verified `npm run build` passes and confirmed the sitemap still lists approved packages only

- Admin category saves now stay visible in crowded categories on localhost (2026-03-08 23:25 UTC)
  - Kept the admin editor in sync with reactive package detail updates and preserved explicit clear category handling in the save flow
  - Added a remount key in `src/pages/Admin.tsx` so saved package detail props reset the editor instance cleanly
  - Restored pagination for all Directory views including selected categories (12 cards initially, "Load more" for additional items) (2026-03-09 06:15 UTC)

- Directory category selection now scrolls back to the top of the page so filtered results are visible immediately (2026-03-08 22:13 UTC)
  - Updated `src/pages/Directory.tsx` to route category changes through a shared selection handler
  - Added a smooth scroll reset to the directory header when users choose a sidebar category or mobile category pill

- Fixed preflight.ts crypto module error in Convex runtime (2026-03-08 23:15 UTC)
  - Changed `hashIp` function from Node.js `crypto.createHash()` to Web Crypto API `crypto.subtle.digest()`
  - The default Convex runtime (V8) does not have access to Node.js built-in modules like `crypto`
  - Function is now async and uses `TextEncoder` and `crypto.subtle.digest("SHA-256", data)` for hashing
  - Updated `convex/http.ts` to await the now-async `hashIp` call
  - Verified with `npx convex codegen`, `npx tsc -p convex/tsconfig.json --noEmit --pretty false`, and `npm run build`

- Shared Git and Cursor collaboration workflow PRD for multi developer repo work (2026-03-08 17:39 UTC)
  - Added `prds/git-cursor-shared-repo-workflow.md` with a branch first team workflow, a safe direct to `main` fallback, conflict handling steps, and explicit guidance for Cursor's Commit and Sync controls
  - Includes exact Git commands for fetch, status, rebase, push, stash, and conflict recovery when another developer is pushing to the same repo

- Admin AI review history drawer with persistent run logging (2026-03-08 06:06 UTC)
  - Added `aiReviewRuns` table in `convex/schema.ts` to store every saved AI review result per package, including status, criteria, provider metadata, and raw model output
  - Updated `convex/aiReview.ts` to create history records for successful reviews, partial reviews, invalid component checks, and runtime errors while keeping the existing latest review snapshot fields on `packages`
  - Added `getAiReviewRunsForPackage` admin query and `_createAiReviewRun` internal mutation in `convex/packages.ts`
  - Added a right-side `AI Review History` drawer in `src/pages/Admin.tsx` with a run list, score summary, criteria checklist, provider/model details, and raw output view
  - Verified with `npx convex codegen`, `npx tsc -p convex/tsconfig.json --noEmit --pretty false`, and `npm run build`

### Changed

- Admin AI automation now uses a three-toggle workflow with `Auto AI review` off by default (2026-03-08 22:01 UTC)
  - Restored `Auto-approve on pass` and `Auto-reject on fail` as optional outcome controls in `src/pages/Admin.tsx`
  - Kept `Auto AI review` as the top level trigger and visually disabled the outcome toggles until it is enabled
  - Updated `convex/packages.ts` so admin settings now track `autoAiReview`, `autoApproveOnPass`, and `autoRejectOnFail`
  - Updated `convex/aiReview.ts` so automatic approval or rejection only runs after review completion when `autoAiReview` is enabled and the matching outcome toggle is on
  - Kept `Auto AI review` false by default by preserving fallback defaults in `getAdminSettings`
  - Clarified the thumbnail automation setting so it explicitly states that auto-generation only runs for submissions that include a logo
  - Verified with `npx convex codegen`, `npx tsc -p convex/tsconfig.json --noEmit --pretty false`, and `npm run build`

- AI review prompt moved to v3 with repo-based critical pass criteria and advisory notes (2026-03-08 17:16 UTC)
  - Archived the previous default prompt into `prds/ai-review-prompt-v3.md`
  - Updated `convex/aiReview.ts` and `convex/aiSettings.ts` so the default review prompt now explicitly judges component validity from the linked GitHub repository contents rather than implying npm tarball inspection
  - Split the review into 8 critical pass criteria and 4 advisory notes while keeping the existing Admin JSON response shape unchanged
  - Updated `convex/aiReview.ts` runtime scoring so advisory misses no longer block a valid component from receiving `passed`
  - Verified with `npx convex codegen`, `npx tsc -p convex/tsconfig.json --noEmit --pretty false`, and `npm run build`
  - Smoke tested the review flow against the stored `@convex-dev/stripe` package linked to `https://github.com/get-convex/stripe` and confirmed the new review completed with `aiReviewStatus: "passed"`

- Admin AI review history now supports deleting older saved runs without removing the current latest snapshot (2026-03-08 17:04 UTC)
  - Added `deleteAiReviewRun` mutation in `convex/packages.ts` with a backend guard that blocks deletion of the latest saved review entry for a package
  - Updated the AI review history drawer in `src/pages/Admin.tsx` to show delete controls for past runs and a confirmation flow before removal
  - Verified with `npx convex codegen`, `npx tsc -p convex/tsconfig.json --noEmit --pretty false`, and `npm run build`

- AI review history drawer now closes on `Escape` in the admin dashboard (2026-03-08 17:05 UTC)
  - Updated `src/pages/Admin.tsx` so admins can dismiss the AI review history drawer with the keyboard
  - Keeps the delete confirmation flow safe by not closing the drawer when the confirm modal is open
  - Verified with `npm run build`

- Clarified Convex component function visibility guidance in the AI review prompts (2026-03-08 01:18 UTC)
  - Updated `convex/aiReview.ts` and `convex/aiSettings.ts` default review guidance to better reflect component boundary rules from the Convex docs
  - Wrapper or app code crossing a component boundary must target public component functions, even though those functions are not browser-client-accessible
  - `internal*` functions are only for same-component implementation details
  - Verified `npm run build` passes for Netlify output; the only remaining build note is the existing Vite chunk size warning

### Added

- Tremendous rewards integration for submitter payouts (2026-03-07 UTC)
  - New `payments` table in `convex/schema.ts` for tracking reward payments
  - Added `rewardStatus` and `rewardTotalAmount` fields to `packages` table
  - New `convex/payments.ts` and `convex/paymentsDb.ts` split Node actions from default-runtime queries and mutations
  - `sendReward` now uses direct `fetch()` to Tremendous instead of the Tremendous SDK
  - Added base URL normalization for Tremendous sandbox and production hosts
  - Fixed campaign payload handling so `campaign_id` does not conflict with `products`
  - Added `isTest` payment support and optional `packageId` handling so settings-level test rewards can be recorded without changing component reward state
  - Auto-send hook in `updateReviewStatus` mutation when package becomes approved and visible
  - Admin UI in `src/pages/Admin.tsx`:
    - "Send Reward" button in Actions row with confirmation modal (amount/note inputs)
    - `PaymentBadge` component showing Paid/Failed status in collapsed row header
    - `RewardSettingsPanel` in Settings tab with auto-send toggle, default amount input, and payment stats
    - Reward history count button next to the Reward action with modal showing past reward attempts and statuses
    - Settings-only `Send Test Reward` button in `RewardSettingsPanel` for fixed env recipient verification
  - New admin settings: `autoSendRewardOnApprove` (boolean) and `defaultRewardAmount` (numeric)
  - Safe test flow documented: sandbox first, manual send first, settings-level test reward for fixed env recipient verification, auto-send only after one successful payment
  - Test payments are stored with `isTest: true`, excluded from reward totals, and do not update package reward state
  - Environment variables required: `TREMENDOUS_API_KEY`, `TREMENDOUS_CAMPAIGN_ID`, `TREMENDOUS_FUNDING_SOURCE_ID`, optional `TREMENDOUS_BASE_URL`, `TREMENDOUS_TEST_RECIPIENT_EMAIL`

### Changed

- Admin settings tab now includes sticky section jump navigation for the long settings stack (2026-03-08 00:49 UTC)
  - Added anchored section IDs across the existing settings panels in `src/pages/Admin.tsx`
  - Added a sticky jump bar for smaller screens and a sticky in-layout right-side nav on extra-wide screens
  - Moved sticky behavior to the desktop sidebar container so the settings rail stays pinned while the page scrolls
  - Active section highlighting follows scroll position so admins can see where they are in the settings page
- Admin dashboard default filter changed from "pending" to "all" for complete submission overview (2026-03-07 00:35 UTC)
- Directory category sections now show 3 rows of cards initially before "Load more" button (2026-03-07 00:35 UTC)
  - Changed `groupedCardsPerLoad` from `gridColumns * 2` to `gridColumns * 3`
  - Shows 12 cards on 4-column desktop, 9 on 3-column, 6 on 2-column, 3 on mobile

### Fixed

- Reverted component OG image tags to the known working raw Convex storage URL format after the `/components/og/*` proxy path failed in production (2026-03-06 22:54 UTC)
  - Updated `netlify/edge-functions/og-meta.ts` to emit `component.thumbnailUrl` directly for `og:image`
  - Updated `src/pages/ComponentDetail.tsx` client-side SEO to use `component.thumbnailUrl` again
  - Removed the unused `/api/og-image` endpoint from `convex/http.ts`
  - Removed the unused Netlify redirect for `/components/og/*`
  - Removed temporary `og` route exclusions from `og-meta.ts`
  - Final stable behavior matches the original working image URLs like `https://giant-grouse-674.convex.cloud/api/storage/...`

### Changed

- Updated badge SVG colors to match frontend status pills and shields.io styling (2026-03-06 21:45 UTC)
  - Changed left box (Convex label) from `#2a2825` to `#555555` for shields.io look
  - Approved: changed from `#074ee8` (blue) to `#228909` (Convex Verified green)
  - In Review: changed from `#7c3aed` (purple) to `#2563eb` (frontend blue pill)
  - Changes Requested: changed from `#d57115` to `#ea580c` (frontend orange pill)
  - Pending and Rejected colors unchanged (already matched frontend)
  - Updated `badge-palette-preview.html` with new color values and shields.io reference

### Added

- Submission badge sync rollout for new and existing component submissions (2026-03-06 01:45 UTC)
  - Added `isSlugTaken()` and `generateUniqueSlug()` helper functions to `convex/packages.ts` for robust slug uniqueness enforcement
  - Updated `addPackage`, `generateSlugForPackage`, `generateMissingSlugs`, and `updateComponentDetails` mutations to use collision safe slug generation
  - Admin slug edits now throw error if slug is already in use by another component
  - Added `BadgeSnippet` component to `src/pages/Submit.tsx` showing README badge markdown, copy button, and live preview for submitted packages with slugs
  - Added `BadgeSnippet` component to `src/pages/Profile.tsx` so authors can copy badge markdown for their own submissions
  - Badge display stays in sync with review status at request time (no status caching)
  - Admin slug backfill through existing `SlugMigrationPanel` now uses uniqueness guards to prevent collision on legacy packages
  - Documentation updated in PRD `prds/netlify-markdown-alias-edge-function.md` under new "Submission badge sync rollout" section

### Changed

- Profile page: replaced Delete Account section with "Need help?" guidance (2026-03-06 UTC)
  - Removed `DeleteAccountModal` component and all self-service account deletion logic
  - Replaced red danger zone with neutral section directing users to use "Send Request" on their submissions to contact the Convex team for component removal or account changes
  - Cleaned up unused imports (`UserMinus`, `useMemo`)

- Component detail sidebar now shows package license above category (2026-03-06 UTC)
  - Updated `src/pages/ComponentDetail.tsx` to render a License block in the left sidebar above Category
  - Uses existing reactive `getComponentBySlug` data, so license updates from admin npm metadata refresh appear automatically on detail pages

- Updated badge implementation planning docs with final working routing pattern (2026-03-06 UTC)
  - Updated `.cursor/plans/fix_badge_system_af9c2908.plan.md` with final outcome details
  - Updated `prds/netlify-markdown-alias-edge-function.md` with the working badge proxy approach

- Temporarily disabled MCP UI and backend routes while public host routing is being debugged (2026-03-06 UTC)
  - Commented out MCP Install section with platform tabs (Cursor, Claude, ChatGPT) in AgentInstallSection.tsx
  - Commented out MCP ready badge in AgentInstallSection.tsx header
  - Commented out all `/api/mcp/*` routes in convex/http.ts (search, component, install-command, docs, info, protocol, cursor-install)
  - Copy prompt, Agent friendly summary, llms.txt, and markdown features remain fully functional
  - MCP code preserved in comments for easy re-enablement when routing is fixed

- Removed MCP Server references from `/api/llms.txt` and `/api/markdown-index` endpoints (2026-03-06 UTC)
  - These endpoints were still advertising disabled MCP protocol URLs
  - Removed "MCP Server" section from llms.txt output
  - Removed "MCP Server Integration" section from markdown-index output
  - `MCP_DIRECT_ORIGIN` constant kept for when MCP is re-enabled

### Fixed

- Added local badge palette preview file for design review and ignored it from git tracking (2026-03-06 UTC)
  - Added `badge-palette-preview.html` with badge status colors, hex values, and Tailwind/site mappings
  - Added `badge-palette-preview.html` to `.gitignore` for local-only review

- Badge route fallback to SPA HTML on Netlify for `/components/badge/*` (2026-03-06 09:05 UTC)
  - Added dedicated Netlify Edge Function `component-badge` for `/components/badge/*`
  - Badge edge function now proxies directly to `https://giant-grouse-674.convex.site/api/badge?slug=<slug>`
  - This avoids redirect and edge ordering conflicts with `/components/*` OG metadata injection
  - Verified `npm run build` passes for Netlify production build

- Component Detail MCP installs now use the verified direct Convex endpoint as a temporary fallback (2026-03-06 08:17 UTC)
  - Updated Cursor deeplink config generation to use `https://giant-grouse-674.convex.site/api/mcp/protocol`
  - Updated Claude Desktop config generation to use the same direct endpoint
  - Updated ChatGPT connector URL generation to use the same direct endpoint
  - Updated backend MCP discovery metadata and Cursor install endpoints to stop advertising broken `www.convex.dev` MCP protocol URLs
  - Updated MCP docs and project tracking docs to mark this as a temporary unblock until public host routing is fixed

- Badge endpoint not working on deployed Netlify site (2026-03-06 09:15 UTC)
  - Root cause: Netlify Edge Function `og-meta.ts` was intercepting `/components/badge/*` requests before the redirect rule could apply
  - Fix: Updated `extractSlug()` to skip both `/components/badge` and `/components/badge/*` (`"badge"` + `slug.startsWith("badge/")`) so requests pass through to the Netlify redirect
  - Badge requests now correctly proxy to `https://giant-grouse-674.convex.site/api/badge?slug=:splat`
  - Enabled README badge section in `ComponentDetail.tsx` above Related Components with border separators and live preview image
  - Updated badge docs to the public URL format `/components/badge/<slug>` in `src/docs/badges.md` and `src/docs/api-endpoints.md`

- MCP endpoint host mismatch diagnosis and fallback guidance (2026-03-06 08:00 UTC)
  - Verified live behavior: `https://www.convex.dev/components/api/mcp/protocol` currently returns SPA HTML instead of MCP JSON
  - Verified live behavior: `https://components-directory.netlify.app/components/api/mcp/protocol` currently returns SPA HTML and `/api/mcp/protocol` returns Netlify 404
  - Verified working MCP transport endpoint: `https://giant-grouse-674.convex.site/api/mcp/protocol` responds correctly to both `GET` and JSON-RPC `POST initialize`
  - Documented direct Convex MCP URL as immediate unblock path for Cursor/Claude/ChatGPT installs while public host routing propagation is finalized

- Netlify proxy redirects pointing to wrong Convex deployment (2026-03-06 07:15 UTC)
  - Changed all `netlify.toml` redirect targets from dev (`third-hedgehog-429.convex.site`) to production (`giant-grouse-674.convex.site`)
  - Added MCP API proxy redirects (`/api/mcp/*` and `/components/api/mcp/*`) before SPA fallback so Cursor/Claude/ChatGPT can reach the Convex MCP protocol endpoint
  - Added badge API proxy redirect (`/components/badge/*`) for SVG badge endpoint
  - Without these redirects, MCP clients hit Netlify's SPA fallback or 404 page instead of the Convex backend

- MCP install flow for Cursor, Claude Desktop, and ChatGPT (2026-03-06 06:45 UTC)
  - Removed all references to `@anthropic-ai/mcp-server-fetch` which was deleted from npm (404 error)
  - Migrated from `command`/`args` proxy pattern to direct URL-based Streamable HTTP transport
  - All three platforms now connect directly via `url: "https://www.convex.dev/components/api/mcp/protocol"` with no npm package dependency
  - Added GET handler for `/api/mcp/protocol` so browsers and discovery clients get server info instead of a 404
  - Updated protocol version from `2024-11-05` to `2025-03-26` (MCP Streamable HTTP spec)
  - Updated CORS headers to support MCP transport headers (`Accept`, `Mcp-Session-Id`, `Mcp-Protocol-Version`)
  - Updated Cursor install deeplink endpoints to emit url-based config
  - Updated `shared/mcpTypes.ts` `CursorInstallLink` interface to match new config shape
  - Updated `src/docs/mcp.md` documentation with new config examples for all three platforms
  - All existing REST MCP endpoints preserved unchanged (`/api/mcp/search`, `/api/mcp/component`, etc.)
  - PRD: `prds/mcp-streamable-http-migration.md`

### Changed

- Improved SKILL.md generation following Anthropic skill creator guidelines (2026-03-06 UTC)
  - Description field now uses "pushy" trigger contexts per Anthropic recommendation to prevent under-triggering
  - Added `buildTriggerContexts()` helper that extracts trigger phrases from category, tags, and use case queries
  - Instructions now use imperative form ("Use X to..." instead of "X is a component that...")
  - Added "When NOT to use" section to prevent over-triggering on unrelated queries
  - Updated SEO + SKILL.md Prompt panel in Admin.tsx settings to document the new SKILL.md format
  - Reference: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md

### Added

- Dynamic OpenGraph meta tags via Netlify Edge Function HTML injection (2026-03-06 06:15 UTC)
  - Rewrote `netlify/edge-functions/og-meta.ts` from bot detection approach to universal HTML injection
  - Edge function now intercepts ALL `/components/{slug}` requests, fetches component data from Convex, and replaces default meta tags in the SPA HTML with component-specific values
  - Works for all clients: headless browsers (opengraph.xyz), social crawlers, and regular browsers
  - Previous bot-detection approach failed because opengraph.xyz uses headless Chrome with standard browser UA
  - Fetches component data and SPA HTML in parallel for minimal latency impact
  - CDN cached at 60s browser / 300s edge
  - Static assets, reserved routes, and non-component paths bypass the function entirely
  - PRD: `prds/opengraph-meta-fix.md`

### Changed

- Updated AI review prompt to v2 with improved accuracy (2025-03-05 21:30 UTC)
  - Fixed false negative: now only checks exported query/mutation/action for `returns` validators, not helper functions
  - Fixed false positive: functions intentionally in public API no longer flagged for not using `internal*`
  - Added documentation that components cannot use `ctx.auth`
  - Added auth callback pattern guidance for re-exported functions
  - Renamed criteria for clarity: "Exported functions have returns: validator", "Internal-only functions use internal*", "Uses auth pattern (when applicable)"
  - Archived original prompt to `prds/ai-review-prompt-v1.md`
  - Updated "How AI Review Works" section in Admin settings panel to match v2 criteria (2025-03-05 22:00 UTC)

### Added

- Admin search now supports component name and repository URL searches (2026-03-05 22:12 UTC)
  - Added `search_componentName` and `search_repositoryUrl` indexes to `convex/schema.ts`
  - Updated `adminSearchPackages` query to search across five fields: package name, description, maintainer names, component name, and repository URL
  - Admins can now search by human readable names like "Convex Agent" or repo paths like "gilhrpenner/convex-files"

### Changed

- Unified font sizes between AI generated SEO content and long description markdown in ComponentDetail.tsx (2026-03-05 UTC)
  - Long description now uses `text-sm text-text-secondary` matching SEO content styling
  - Removed prose typography classes in favor of explicit size selectors
  - Changed "Made by" to "by" in author row for cleaner display
- Updated "Live Demo URL" field label to "Live Demo URL or Example App" in SubmitForm.tsx and ComponentDetailsEditor.tsx (2026-03-05 17:45 UTC)

### Added

- Multi-platform MCP install section with toggle tabs (2026-03-04 20:15 UTC)
  - Replaced single "Install in Cursor" with tabbed interface: Cursor | Claude | ChatGPT
  - Cursor tab: deeplink install button + config copy (existing functionality)
  - Claude Desktop tab: manual JSON config with file path instructions for macOS/Windows
  - ChatGPT tab: custom connector URL with Developer mode setup steps
  - Added `generateClaudeDesktopConfig()` and `generateChatGPTConnectorConfig()` to `src/lib/mcpProfile.ts`
  - Platform-aware copy button copies appropriate config/URL for selected tab
  - PRD: `prds/multi-platform-mcp-install.md`

### Fixed

- Long package names in ComponentDetail author row now truncate gracefully instead of wrapping awkwardly (2026-03-05 15:30 UTC)
  - Added `flex-wrap` to author row container for graceful line breaks
  - Added `truncate max-w-[280px] sm:max-w-none` to repo name link (truncates on mobile, full on desktop)
  - Added `title` attribute for hover tooltip when name is truncated

- Submit form long description markdown preview now renders headings, lists, and links correctly (2026-03-05 23:25 UTC)
  - Added explicit component renderers for `h1`, `h2`, `h3`, `ul`, `ol`, `li` in `src/pages/SubmitForm.tsx`
  - Added 500 character max limit with live counter
  - Preview only shows when content is entered

- Long description markdown now preserves line breaks on component detail pages and links use purple hover-underlined styling (2026-03-05 23:08 UTC)
  - Updated `src/pages/ComponentDetail.tsx` markdown rendering to preserve author-entered line breaks
  - Updated markdown link styling to `#8D2676` with underline on hover

- Admin submissions sort dropdown now includes Verified, Community, and Featured options (2026-03-05 21:53 UTC)
  - Added three sort modes in `src/pages/Admin.tsx`: `verified`, `community`, and `featured`
  - Added dropdown labels: `Verified first`, `Community first`, `Featured first`
  - Added stable sorting with newest (`submittedAt`) as tie-breaker to preserve list behavior

- MCP install URLs now use live Components public path (2026-03-05 00:10 UTC)
  - Updated all MCP install generators to use `https://www.convex.dev/components/api/mcp/protocol`
  - Applies to Cursor install config, Claude Desktop JSON config, and ChatGPT connector URL
  - Aligns install output with live app routing under `/components`

- MCP endpoint URLs now use Convex site URL directly (2026-03-04 21:00 UTC)
  - Changed from `https://www.convex.dev/api/mcp/protocol` to `https://third-hedgehog-429.convex.site/api/mcp/protocol`
  - Fixes 404 issue since there's no Netlify proxy for `/api/mcp/*` routes
  - Matches existing pattern used by `llms.txt` and markdown routes in `netlify.toml`
  - Updated all MCP config generators in `src/lib/mcpProfile.ts` to use `MCP_CONVEX_SITE_URL`
  - Superseded by 2026-03-05 update to use public `/components/api` MCP URL

- Comprehensive documentation coverage for all app features (2026-03-04 22:30 UTC)
  - Added 3 new docs: MCP (Model Context Protocol), Public API Endpoints, README Badges
  - New "Integrations" nav group in Documentation.tsx for MCP, API, and badge docs
  - Updated 9 existing docs with missing feature details: agent install feature flags, llms.txt URLs, submissions pagination, Sub Hide toggle, AI provider failover, SEO prompt placeholders, user deletion request flow, category verified counts, soft deletion from user side

### Fixed

- Admin filter tabs bar no longer scrolls horizontally, tabs wrap instead (2026-03-04 19:00 UTC)
- Admin filter tab tooltips now appear above the bar instead of below (2026-03-04 19:00 UTC)
- Documentation section links now use client-side route updates to prevent full page reload and repeated auth spinner between docs pages (2026-03-04 19:20 UTC)

### Added

- Documentation page markdown presentation refresh for improved readability (2026-03-04 21:24 UTC)
  - Expanded markdown rendering styles in `src/pages/Documentation.tsx` for tables, code blocks, inline code, lists, blockquotes, horizontal rules, and images
  - Kept `remarkGfm` support and improved table/code wrappers for cleaner spacing and better visual hierarchy

- Admin-only documentation system at `/components/documentation` (2026-03-04 12:30 UTC)
  - 13 markdown documentation files covering user guide and admin guide topics
  - Documentation page with admin gating via `api.auth.isAdmin` query
  - Three-column layout: left navigation sidebar, main content, right "On this page" outline
  - Navigation grouped into Getting Started, User Guide, and Admin Guide sections
  - Copy as Markdown and Download as Markdown buttons per page
  - `<meta name="robots" content="noindex, nofollow">` prevents search indexing
  - Mobile responsive with collapsible navigation
  - Styled with Convex design system (warm cream background, GT America typography)
  - Added "documentation" to reserved routes in `src/lib/slugs.ts`
  - TypeScript declarations for `*.md?raw` imports in `vite-env.d.ts`
  - Added "Docs" link to Header.tsx nav bar (admin-only, next to Admin link)
  - PRD: `prds/admin-documentation-system.md`

- MCP Additive Rollout Phase 1 (2026-03-03 18:00 UTC)
  - Added standards-based MCP protocol endpoint at `/api/mcp/protocol` implementing JSON-RPC 2.0 interface
  - Protocol supports `initialize` (server capabilities), `tools/list` (available tools), and `tools/call` (tool invocation)
  - Five tools available: `search_components`, `get_component`, `get_install_command`, `get_docs`, `list_categories`
  - Added Cursor MCP install link endpoints: `/api/mcp/cursor-install` (global directory server) and `/api/mcp/cursor-install-component?slug=X` (per-component)
  - Updated `AgentInstallSection.tsx` with Cursor install button and MCP config copy functionality
  - Added Cursor install link generators to `src/lib/mcpProfile.ts`: `generateGlobalCursorInstallLink()`, `generateComponentCursorInstallLink()`
  - Extended MCP types in `shared/mcpTypes.ts` with `CursorInstallLink` and `McpDirectoryInfo` interfaces
  - Added MCP capability sections to `/api/llms.txt` and `/api/markdown-index` listing protocol endpoint, tools, and Cursor install link
  - All new MCP endpoints log to `mcpApiLogs` table with endpoint, tool, slug, query, status, and timing
  - Existing REST MCP endpoints (`/api/mcp/search`, `/api/mcp/component`, etc.) and markdown/llms aliases preserved unchanged
  - PRD: `prds/mcp-additive-rollout-phase1.md` documents Phase 2 MCP Apps UI and Phase 3 Ecosystem Growth as roadmap only

- Fixed TypeScript errors in AgentInstallSection.tsx (2026-03-03 09:30 UTC)
  - Removed reference to non-exported `PromptComponentData` type from `promptComposer.ts`
  - Made `npmUrl`, `version`, `description`, and `weeklyDownloads` required in local `ComponentData` interface to match actual data contract from `getComponentBySlug`
  - Used `Parameters<typeof isMcpReady>[0]` cast for `isMcpReady` call to bridge local and module type definitions

- Synced Status Legend, Visibility Guide, and Badges section across Profile.tsx, Submit.tsx, and Admin.tsx (2026-03-03 09:15 UTC)
  - Profile.tsx: removed Archived and Pending Deletion from Visibility Guide (features removed)
  - Profile.tsx: added Featured status to Status Guide, updated rejected icon to Prohibit for consistency
  - Profile.tsx: removed DeletionBadge component and markedForDeletion references from SubmissionCard
  - Profile.tsx and Submit.tsx: added Badges section with Convex Verified and Community badge explanations
  - All three pages now share identical status definitions and badge styling

- Full Convex.dev-style footer matching official site design (2026-03-03 08:25 UTC)
  - Dark background (`#141414`) using Convex design system tokens
  - White Convex wordmark logo linking to convex.dev
  - Four link columns: Product (9 links), Developers (11 links), Company (9 links), Social (6 links with icons)
  - External links display `ExternalLinkIcon` from `@radix-ui/react-icons`
  - Social links use SVG icons from `/public/` (Twitter, Discord, YouTube, Luma, LinkedIn, GitHub)
  - "A Trusted Solution" section with green checkmark badges (SOC 2 Type II, HIPAA, GDPR)
  - Dynamic copyright year
  - Responsive grid layout (6 cols xl, 5 lg, 4 md, 2 mobile)
  - Original footer saved as `FooterBackup.tsx` for reference

- Directory `Verified` sort and category verified counts (2026-03-03 07:47 UTC)
  - Added `verified` sort option to `src/pages/Directory.tsx` for both desktop and mobile sort dropdowns
  - Extended `listApprovedComponents` sort validator and backend sort logic in `convex/packages.ts` to prioritize `convexVerified` packages
  - Extended shared `sortPublicPackages` helper with `verified` mode for consistent package sorting behavior
  - Added `verifiedCount` to `listCategories` response in `convex/packages.ts` using the same visible approved package set as total counts
  - Updated Admin Category Management in `src/pages/Admin.tsx` to display both total and verified component counts per category
  - Updated directory dropdown display label from `Verified first` to `Verified` in desktop and mobile sort controls (2026-03-03 07:52 UTC)

- Related Components section on component detail pages (2026-03-03 07:29 UTC)
  - Shows up to 3 related components below the View llms.txt link on detail pages
  - Compact no-thumbnail card grid matching Directory card style
  - Relatedness scored by shared category (+10), overlapping tags (+3 each), and download count as tiebreaker
  - New `getRelatedComponents` public query in `convex/packages.ts`
  - New `showRelatedOnDetailPage` admin setting (on by default) in AI Review Settings panel
  - Admin toggle in `src/pages/Admin.tsx` to enable or disable the section globally
  - Query returns empty array when admin setting is off, so no frontend conditional needed

- Component Authoring Challenge banner on Directory page (2026-03-03 07:15 UTC)
  - New `ChallengeBanner` component at `src/components/ChallengeBanner.tsx`
  - Dark background with repeating grid texture from `public/banner-grid.svg` (inline SVG data URL with boosted stroke visibility)
  - Left side: bold white title and two line gray subtitle, right side: "Learn more" pill button with solid dark fill and bright pink/magenta border
  - Placed above FAQSection on the Directory page
  - Responsive layout: stacks vertically on mobile, horizontal on desktop

- Private message inactive state controls in admin and profile threads (2026-03-03 06:32 UTC)
  - Added `includeInactive` option to private message queries so UIs can toggle active-only vs all messages
  - Added restore flow for hidden and archived authored messages (`status: "active"`)
  - Added Admin message thread toggle to show or hide inactive messages in `src/pages/Admin.tsx`
  - Updated empty states and status labels for inactive private messages

- Shareable WorkOS Connect setup guide for Convex team handoff (2026-03-03 01:28 UTC)
  - Updated `prds/workos-convex-environment-runbook.md` with final working Connect configuration and explicit route policy
  - Added `prds/workos-connect-convex-netlify-how-to.md` with development, staging, and production setup sections
  - Added route sections for public, auth required, admin only, and Netlify alias routes
  - Kept all examples secret free with placeholders only

- Community badge toggle in Admin Actions row (2026-03-03)
  - Added Community toggle button next to Convex Verified in Admin InlineActions
  - Uses `Users` icon from Phosphor with Community badge color scheme (`#E9DDC2` background)
  - Toggle calls `updateComponentDetails` mutation with `communitySubmitted` field
  - Shows tooltip and success toast on toggle

- Connect environment variable alignment with admin OAuth docs (2026-03-03 01:12 UTC)
  - Confirmed Connect client id flow is expected for this app and documented required domain based OAuth config
  - Finalized required local vars: `VITE_WORKOS_CLIENT_ID`, `VITE_WORKOS_REDIRECT_URI`, and `VITE_WORKOS_AUTHKIT_DOMAIN`
  - Finalized required Convex vars for both deployments: `WORKOS_CLIENT_ID` and `WORKOS_AUTHKIT_DOMAIN`
  - Recorded guidance that domain host and full `https://` domain forms are accepted by normalization logic

- WorkOS Connect OAuth PKCE flow for app authentication and Convex integration (2026-03-03 00:26 UTC)
  - Added `src/lib/connectAuth.tsx` with Connect authorize redirect, callback token exchange, PKCE/state validation, and local session storage
  - Updated `src/main.tsx` to use `ConnectAuthProvider` and connect-driven token bridge into `ConvexProviderWithAuthKit`
  - Updated `src/lib/auth.tsx` to use connect `signIn` and `signOut` while preserving `useConvexAuth` for backend auth state
  - Updated `convex/auth.config.ts` to validate JWTs using `WORKOS_AUTHKIT_DOMAIN` issuer and `/oauth2/jwks`
  - Added `WORKOS_AUTHKIT_DOMAIN` and `VITE_WORKOS_AUTHKIT_DOMAIN` requirements to `prds/workos-convex-environment-runbook.md`
  - Removed direct frontend dependency on `@workos-inc/authkit-react`
  - Verified with TypeScript checks for Convex and app plus frontend production build

- WorkOS AuthKit migration replacing legacy Convex auth wiring (2026-03-02 23:42 UTC)
  - Replaced frontend auth provider wiring in `src/main.tsx` with `AuthKitProvider` and `ConvexProviderWithAuthKit`
  - Updated shared auth hook in `src/lib/auth.tsx` to use WorkOS `signIn()` and `signOut()`
  - Replaced backend auth helpers in `convex/auth.ts` to use `ctx.auth.getUserIdentity()` claims for user and admin checks
  - Updated `convex/auth.config.ts` to WorkOS dual JWT provider configuration using `WORKOS_CLIENT_ID`
  - Removed legacy auth coupling in `convex/http.ts` (`auth.addHttpRoutes`) and `convex/schema.ts` (`authTables`)
  - Updated package dependencies to remove legacy auth packages and add `@convex-dev/workos` and `@workos-inc/authkit-react`
  - Verified with `npm run lint` (Convex typecheck, app typecheck, `convex dev --once`, and production build)

- WorkOS and Convex staging and production environment runbook PRD (2026-03-02 22:30 UTC)
  - Added `prds/workos-convex-environment-runbook.md` with exact setup for WorkOS staging and production environments
  - Added Convex deployment environment variable matrix for staging (`third-hedgehog-429`) and production (`giant-grouse-674`)
  - Added frontend environment variable matrix for local and Netlify production callback routing under `/components/callback`
  - Added verification checklist for public routes, auth-gated routes, and `@convex.dev` admin-only route access
  - Included official Convex and WorkOS reference docs for setup and troubleshooting

- Documentation workflow timestamp tracking for PRDs and project docs (2026-03-02 22:18 UTC)
  - Added PRD timestamp requirements in `.cursor/rules/workflow.mdc` and `.cursor/skills/create-prd/SKILL.md`
  - Added task completion timestamp guidance in `.cursor/rules/task.mdc`
  - Added changelog timestamp guidance in `.cursor/skills/update-project-docs/SKILL.md` and `.cursor/rules/dev2.mdc`
  - Added implementation PRD: `prds/prd-doc-timestamp-tracking.md`
  - Backfilled timestamp metadata across existing `prds/*.md` files (2026-03-02 22:24 UTC)
  - Backfilled legacy date-only completed entries in `task.md` to timestamp format using `12:00 UTC` as neutral historical time (2026-03-02 22:25 UTC)
  - Normalized legacy date-only bullets in `changelog.md` to timestamp format using `12:00 UTC` as neutral historical time (2026-03-02 22:26 UTC)

- Community badge for community-submitted components (2026-03-02 12:00 UTC)
  - New `communitySubmitted` field on packages schema
  - New `CommunityBadge` component with `#E9DDC2` background color and PersonIcon
  - Badge appears between downloads and Verified badge on Directory cards
  - Badge appears below Verified badge and above downloads in ComponentDetail sidebar
  - Admin checkbox in ComponentDetailsEditor for toggling Community status
  - Updated `directoryCardValidator`, `publicPackageValidator`, `adminPackageValidator`
  - Updated `toPublicPackage()` and `toAdminPackage()` helper functions
  - Updated `listApprovedComponents` and `getFeaturedComponents` queries to return `communitySubmitted`
  - Added to `updateComponentDetails` mutation args

- MCP and Agent Install UX for AI-assisted component installation (2026-03-02 12:00 UTC)
  - Added "Use with agents and CLI" section on ComponentDetail page (always visible, no toggle)
  - Reordered sections: Use with agents and CLI, then Agent Skill (SKILL.md), then Keywords
  - Added "Use with AI" anchor link with ClipboardText icon in header navigation
  - Simplified UI: single copy prompt optimized for agents (Claude style)
  - MCP ready badge shown in section header when component qualifies
  - Agent friendly summary with install command, setup steps, and verification checklist
  - Read-only MCP HTTP API endpoints:
    - `/api/mcp/search`: Search components by query, category with pagination
    - `/api/mcp/component`: Get full component profile
    - `/api/mcp/install-command`: Get install command for a component
    - `/api/mcp/docs`: Get documentation URLs
    - `/api/mcp/info`: Server info and tool definitions
  - Feature flags for controlled rollout (VITE_MCP_ENABLED, VITE_AGENT_INSTALL_ENABLED, etc.)
  - MCP API request logging for monitoring
  - PRD: `prds/mcp-agent-install-ux.md`
  - New files:
    - `shared/mcpTypes.ts`: MCP type definitions
    - `src/lib/mcpProfile.ts`: MCP profile builder utilities
    - `src/lib/promptComposer.ts`: Universal prompt generation
    - `src/lib/metadataScoring.ts`: Metadata quality scoring
    - `src/lib/featureFlags.ts`: Feature flag utilities
    - `src/components/AgentInstallSection.tsx`: Agent install UI component
  - Schema addition: `mcpApiLogs` table for request monitoring

- Submit page pagination and admin page size setting (2026-02-27 12:00 UTC)
  - Added paginated public queries for submissions list and search in `convex/packages.ts`
  - Added public and admin settings APIs for Submit default page size with allowed values `20`, `40`, and `60`
  - Updated `src/pages/Submit.tsx` to render page controls with default 40 items per page
  - Added a Submit Listing Settings panel in `src/pages/Admin.tsx` to manage the default page size
  - Documented query and settings coverage updates in `files.md`

### Fixed

- Runtime AI provider failover for AI Review and SEO generation (2026-03-04 02:29 UTC)
  - Added shared fallback orchestration in `convex/aiProviderFallback.ts`
  - Added internal provider settings query `_getProviderSettingsForFallback` in `convex/aiSettings.ts`
  - Updated `convex/aiReview.ts` and `convex/seoContent.ts` to fail over on runtime provider errors, not only missing keys
  - New fallback order: active admin provider, backup admin providers, then environment providers
  - Regenerated Convex API bindings in `convex/_generated/api.d.ts`

- Convex private message query return validator mismatch (2026-03-03 06:44 UTC)
  - Added `statusUpdatedAt` to `getPackageComments` return validator in `convex/packages.ts`
  - Fixed runtime `ReturnsValidationError` for archived or hidden messages returned to the client

- Directory badge placement for community-only components (2026-03-03 06:32 UTC)
  - Updated `ComponentCard` badge rendering so a community-only component uses the same right-side badge slot as verified
  - Preserved existing dual-badge behavior so Community still appears before Verified when both are present

- Private message and notes separation across Profile, Admin, and Submit pages (2026-03-03 06:24 UTC)
  - Routed profile "Send Request" and message thread reads to private `packageComments` channel for submitter/admin communication
  - Kept `packageNotes` as admin-only internal notes and removed user-unread note coupling from admin notes UI
  - Updated `Submit.tsx` to stop rendering package comments publicly
  - Added authored message lifecycle controls (hide, archive, delete) in profile and admin message UIs
  - Enforced backend ownership and auth checks for adding, deleting, and updating message status
  - Added modal-level filter to show hidden or archived messages with restore action for authored messages (2026-03-03 06:32 UTC)
  - Added optional `includeInactive` query support for private message retrieval (2026-03-03 06:32 UTC)

- Made `View llms.txt` independent from Keywords on component detail page (2026-02-27 12:00 UTC)
  - Moved llms link rendering outside the tags conditional in `src/pages/ComponentDetail.tsx`
  - Link now appears even when a component has no keywords
  - Verified with app typecheck and Netlify offline build flow

- Restored local `.md` and `llms.txt` link behavior for component detail dropdown (2026-02-27 12:00 UTC)
  - Added local development fallback in `shared/componentUrls.ts` via `buildComponentClientUrls`
  - Localhost now uses Convex HTTP endpoints directly:
    - `/api/markdown?slug=<slug>`
    - `/api/component-llms?slug=<slug>`
  - Production keeps Netlify alias URLs:
    - `/components/<slug>/<leaf>.md`
    - `/components/<slug>/llms.txt`
  - Updated `src/pages/ComponentDetail.tsx` to use client-aware URL strategy
  - Keeps production behavior documented in `prds/netlify-markdown-alias-edge-function.md` while avoiding local Vite route 404s

- Centralized component markdown and llms URL construction to prevent route drift (2026-02-27 12:00 UTC)
  - Added shared URL helper in `shared/componentUrls.ts` for detail, markdown alias (`/components/<slug>/<leaf>.md`), and llms paths
  - Updated `src/pages/ComponentDetail.tsx` markdown dropdown with:
    - Open markdown file
    - Open in ChatGPT
    - Open in Claude
    - Open in Perplexity
  - Added a `View llms.txt` link below Keywords in `ComponentDetail.tsx`
  - Updated `convex/http.ts` link emission in `/api/markdown-index` and `/api/component-llms` to use shared URL builder
  - Verified with frontend build and TypeScript checks for app and Convex

- Keep markdown alias URL on Netlify domain (2026-02-27 12:00 UTC)
  - Replaced unreliable markdown rewrites with Netlify Edge Function routing for `/components/*/*.md`
  - Added `netlify/edge-functions/component-markdown.ts` to proxy alias paths to Convex markdown endpoint by slug
  - Removed client-side markdown alias redirect in router
  - Markdown alias now stays on `components-directory.netlify.app` while serving raw markdown

- Markdown alias route for component slugs in production (2026-02-27 12:00 UTC)
  - Added client-side alias support for `/components/<slug>/<slug>.md`
  - Route now redirects to Convex markdown endpoint: `/api/markdown?slug=<slug>`
  - Preserves working SPA routes and avoids rewrite collisions with admin/submissions paths

- Netlify SPA routing broken by greedy markdown proxy rules (2026-02-27 12:00 UTC)
  - Routes like `/components/submissions/admin` and `/components/browser-use-convex-component` were returning 404 with markdown content
  - Root cause: Netlify redirect patterns `:slug.md` and `:scope/:name.md` matched paths without `.md` extension
  - Replaced named-parameter markdown/llms redirects with explicit splat suffix rules:
    - `/components/*.md` -> `/api/markdown?slug=:splat`
    - `/components/*/llms.txt` -> `/api/component-llms?slug=:splat`
  - Main `/components/llms.txt` and `/components.md` routes still work
  - All SPA client-side routes now correctly serve index.html

- GitHub avatar URLs updated to use reliable CDN (2026-02-27 12:00 UTC)
  - Changed avatar URL format from `https://github.com/{username}.png` to `https://avatars.githubusercontent.com/{username}`
  - Fixes `ERR_HTTP2_SERVER_REFUSED_STREAM` errors when loading author avatars
  - Added `migrateAvatarUrls` admin mutation to fix existing records in database
  - Run migration via: `npx convex run packages:migrateAvatarUrls`

### Added

- Tremendous Rewards Integration PRD (2026-02-27 12:00 UTC)
  - Full product requirements document at `prds/tremendous-rewards-integration.md`
  - Defines Tremendous API integration for sending rewards to component submitters
  - Send Reward button spec for Admin Actions row (same row as Convex Verified, Regenerate SEO)
  - New `payments` table schema with order tracking and status
  - Package reward fields: `rewardStatus`, `rewardTotalAmount`
  - PaymentBadge in collapsed row header showing Paid/Failed status
  - RewardSettingsPanel with auto-send toggle and default amount config
  - Auto-send on approved + visible (optional admin setting)
  - Links to Tremendous API docs, Node SDK, and sandbox testing

### Changed

- Applied Convex return validator best practices to internal functions (2026-02-26 12:00 UTC)
  - Removed redundant `returns: v.null()` from internal mutations in `seoContentDb.ts` and `thumbnails.ts`
  - Removed `returns: v.union(v.null(), v.any())` from internal queries `_getPackage` and `_getPackageByName` in `packages.ts`
  - TypeScript inference now handles return types for internal functions (non-client-facing)
  - Fixed `ctx.db.patch` API usage bugs (was passing table name as first argument)
  - Fixed `ctx.db.get` API usage bugs (was passing table name before ID)
  - No behavioral changes; improves code clarity and follows updated Convex guidance

- AI Review Results panel collapsed by default in Admin dashboard (2026-02-26 12:00 UTC)
  - Entire panel now collapsed by default, showing only status icon, label, and date
  - Single toggle expands/collapses all content (summary, error, and criteria)
  - Reduces vertical space in package rows
  - Copy button still accessible on collapsed header row

- Removed user visibility controls from Profile page (2026-02-26 12:00 UTC)
  - Hide, Show, Delete, and Cancel Deletion buttons removed from user profile
  - Users must now contact admin via "Send Request" to manage component visibility
  - Reduces user confusion and prevents accidental visibility changes
  - Admin retains full visibility control via Admin dashboard
  - Code completely removed (not just hidden) so users cannot find controls in source

### Added

- Download Skill button for SKILL.md files on ComponentDetail page (2026-02-25 12:00 UTC)
  - Download button with Phosphor FileArrowDown icon next to Markdown dropdown in author row
  - Button only appears when SKILL.md has been generated (after SEO content generation)
  - SKILL.md section also includes both copy and download buttons
  - Downloads file as `SKILL.md` for easy saving to project

### Changed

- Directory sidebar sticky position adjusted (2026-02-25 12:00 UTC)
  - Changed sticky top from `top-6` to `top-20` (80px)
  - Submit button now remains visible below the header when scrolling
  - Entire sidebar (Submit, Search, Sort, Categories) stays sticky together

### Added

- SEO Prompt Settings panel in Admin Settings (2026-02-25 12:00 UTC)
  - View and customize the AI SEO/SKILL.md generation prompt
  - Edit prompt with save as new version (includes change notes)
  - Version history with timestamps and restore functionality
  - Reset to default prompt option
  - Custom prompts stored in database with version tracking
  - Uses placeholders like `{{displayName}}`, `{{packageName}}` for dynamic content
  - New `seoPromptVersions` table in schema for version tracking

- Multi-provider AI support across all AI features (2026-02-25 12:00 UTC)
  - Support for Anthropic Claude, OpenAI GPT, and Google Gemini in both AI Review and SEO Content generation
  - Provider selection prioritizes admin settings (AI Provider Settings panel), then falls back to environment variables (ANTHROPIC_API_KEY, CONVEX_OPENAI_API_KEY)
  - Both `convex/aiReview.ts` and `convex/seoContent.ts` use the same provider configuration
  - New `callAiProvider` helper function in both files for unified provider calls

- Confirmation modal for clearing AI provider settings (2026-02-25 12:00 UTC)
  - Clear (use env) buttons now show red styling to indicate destructive action
  - Clicking Clear shows confirmation modal warning that API keys will be deleted
  - Modal explains fallback to environment variables and that all AI features are affected
  - Prevents accidental deletion of API key configuration

- Moved Refresh and Generate Slug buttons to InlineActions component (2026-02-25 12:00 UTC)
  - Refresh npm data button now in Actions row of expanded package view
  - Generate Slug button in Actions row (only shows when package has no slug)
  - Removed standalone button components from package card row
  - Shows last refresh time and any refresh errors

- Admin Actions row in expanded package view (2026-02-25 12:00 UTC)
  - New "Actions" row above Status and Visibility rows in InlineActions panel
  - Convex Verified toggle button with teal styling (fill icon when verified)
  - Regenerate SEO + Skill button with loading spinner and completion indicator
  - Combined Auto-fill button that fills both author from GitHub and description from npm
  - Hide Thumbnail toggle (orange, only shows when thumbnail exists) for hiding in category but showing in Featured
  - Auto-fill runs both operations in parallel and reports what was filled in toast
  - All buttons use Phosphor icons and match existing Admin theme styling
  - Added useEffect hooks in ComponentDetailsEditor to sync author/avatar/verified fields from backend updates

- Hide from Submissions page feature for admin control (2026-02-25 12:00 UTC)
  - New `hideFromSubmissions` field on packages schema
  - Admin toggle button labeled "Sub Hide" / "Sub Hidden" in package row to differentiate from directory Hide
  - `listPackages` and `searchPackages` queries filter out hidden packages
  - Hidden packages still appear in Directory if approved (uses separate `listApprovedComponents`)
  - All admin features remain fully functional for hidden packages

- Featured components sort order for admin control (2026-02-25 12:00 UTC)
  - New `featuredSortOrder` field on packages schema for admin-managed ordering
  - Featured section in Directory respects admin sort order (lower numbers first)
  - Sort order input appears next to Featured toggle in Admin when package is featured
  - Dropdown sort (downloads, newest, etc.) only affects category sections, not Featured
  - Packages without sort order default to the end, sorted by newest first

- Hide thumbnail in category option for components (2026-02-25 12:00 UTC)
  - New `hideThumbnailInCategory` field on packages schema
  - Checkbox in Admin Component Details editor (appears when thumbnail exists)
  - Thumbnails always display in Featured section regardless of setting
  - Category, search, and other listings respect the hide flag
  - Added field to `directoryCardValidator` and query return maps for proper data flow
  - `ComponentCard` accepts `showThumbnail` prop for conditional rendering
  - Allows components to have thumbnails for Featured without cluttering category views

- Official Convex Components import system (2026-02-24 12:00 UTC)
  - `seedOfficialComponents` internal action for importing 41 components from convex.dev/components
  - `importAsPending` flag to import new components as "pending" for admin review
  - `dryRun` flag to preview imports without making changes
  - Preserves existing `reviewStatus` on updates, only sets new status on inserts
  - Added `browser-use` component (AI category) and synced with upstream source
  - Run: `npx convex run seed:seedOfficialComponents '{"importAsPending": true}'`
  - Production: `npx convex run --prod seed:seedOfficialComponents '{"importAsPending": true}'`

- Admin panel pagination with configurable items per page (2026-02-24 12:00 UTC)
  - Package list shows 20 items per page by default
  - Pagination controls with Previous/Next buttons and numbered page buttons
  - Items per page dropdown selector (5, 10, 20, 40, 100 options)
  - Each filter tab maintains independent page state
  - "Showing X-Y of Z" counter reflects current pagination
  - Page resets to 1 when changing filter or items per page

### Changed

- Reordered icons in Admin package rows (2026-02-24 12:00 UTC)
  - Moved ComponentDetailQuickLink (external link icon) to be last in the badge group
  - Order is now: StatusBadge, VisibilityBadge, UnrepliedNotesIndicator, ComponentDetailQuickLink
  - Keeps the external link icon before the downloads/date section on the far right

### Added

- LLMs.txt and Markdown clean URL support (2026-02-24 12:00 UTC)
  - `/components/llms.txt` serves main directory index for AI agents
  - `/components.md` serves markdown listing of all approved components
  - `/components/<slug>/llms.txt` serves per-component llms.txt
  - `/components/<slug>.md` serves per-component markdown
  - New `/api/markdown-index` endpoint for directory-wide markdown
  - New `/api/component-llms` endpoint for per-component llms.txt
  - Netlify redirects proxy clean URLs to Convex HTTP endpoints
  - Supports both single-segment and scoped package slugs

### Changed

- Moved Keywords section below Agent Skill (SKILL.md) section on ComponentDetail.tsx (2026-02-24 12:00 UTC)
  - Keywords tags now appear after the SKILL.md copyable snippet
  - Improves page hierarchy: SEO content > SKILL.md > Keywords

- Moved Markdown dropdown from sidebar to author row on ComponentDetail.tsx (2026-02-24 12:00 UTC)
  - Dropdown now appears in the same row as package name and author info
  - Separator added before dropdown for visual consistency
  - Same functionality: View as Markdown, Copy as Markdown, Copy page URL

- Commented out GitHub Issues feature on ComponentDetail.tsx (2026-02-24 12:00 UTC)
  - Issues badge button in author row commented out
  - Issues panel (open/closed tabs, issue list, load more) commented out
  - Feature preserved in code for future re-enabling

### Added

- Clear logo button in Component Details editor (2026-02-24 12:00 UTC)
  - Clear button appears next to download button when logo exists
  - Calls new `clearLogo` mutation to remove logo URL and storage reference
  - Matches existing clear thumbnail functionality
  - New `clearLogo` mutation in `convex/packages.ts`

### Fixed

- Fixed SubmitForm.tsx success modal button layout (2026-02-23 12:00 UTC)
  - Buttons now display horizontally side by side instead of stacked vertically
  - Added `flex-row` and `inline-flex` for proper alignment
  - Improved button spacing and font weight for better visual hierarchy

- Fixed SubmitForm.tsx sending tags as array instead of string (2026-02-23 12:00 UTC)
  - Backend `submitPackage` action expects `tags: v.optional(v.string())` (comma-separated)
  - SubmitForm.tsx was sending `.split(",").map(...).filter(...)` (array)
  - Changed to `tags.trim() || undefined` to match validator
  - Fixes "ArgumentValidationError: Value does not match validator" on component submission

### Added

- Enhanced SEO support for ComponentDetail pages (2026-02-24 12:00 UTC)
  - Twitter Card meta tags (summary_large_image with thumbnail)
  - Canonical URL tag for duplicate content prevention
  - og:site_name and og:image:alt tags for better sharing
  - New `setComponentSeoTags()` consolidated helper in seo.ts
  - New `setTwitterTags()` and `setCanonicalUrl()` functions

### Changed

- Updated index.html fallback meta tags (2026-02-24 12:00 UTC)
  - Fixed Twitter meta tags to use `name` attribute (was `property`)
  - Updated URLs to production domain (www.convex.dev/components)
  - Added twitter:image:alt for accessibility

### Added

- AI Provider Settings panel in Admin Settings (2026-02-23 12:00 UTC)
  - Configure Anthropic, OpenAI, or Google Gemini as AI provider
  - Override environment variables with custom API keys and models
  - Links to model documentation for each provider
  - Clear settings to revert to environment variable defaults
  - Active provider indicator badge

- AI Prompt Settings panel in Admin Settings (2026-02-23 12:00 UTC)
  - View and customize the AI review prompt
  - Edit prompt with save as new version
  - Version history with timestamps and change notes
  - Restore any previous prompt version
  - Reset to default prompt option
  - Custom prompts stored in database with version tracking

- New database tables for AI configuration (2026-02-23 12:00 UTC)
  - `aiProviderSettings`: stores API keys and models for each provider
  - `aiPromptVersions`: stores prompt versions with history

- Multi-provider AI support in aiReview.ts (2026-02-23 12:00 UTC)
  - Support for Anthropic Claude, OpenAI GPT, and Google Gemini
  - Provider selection prioritizes custom settings, then env vars
  - Custom prompt support with fallback to default

### Changed

- Commented out "Add badge to your README" section on ComponentDetail.tsx (2026-02-23 12:00 UTC)
  - Badge snippet UI hidden until badge endpoint is working
  - Badge markdown line in buildMarkdownDoc also commented out
  - Can be re-enabled later when badge feature is ready

### Added

- Auto-fill description button in Component Details editor (2026-02-23 12:00 UTC)
  - "Auto-fill from Package" button next to Long Description field
  - Copies description from Package Metadata to Long Description for editing
  - Only shown in admin mode when package has a description
  - Button click populates field and shows success toast

### Fixed

- Fixed production legacy GitHub OAuth authentication failing with "Missing sign-in verifier" error (2026-02-23 12:00 UTC)
  - Updated the legacy auth package to resolve verifier handling
  - Configured GitHub OAuth callback URL to point to Convex backend (`https://giant-grouse-674.convex.site/api/auth/callback/github`)
  - Generated and set JWT signing keys for production deployment via the legacy auth CLI
  - Set `SITE_URL` to `https://components-directory.netlify.app/components` for correct post-auth redirect
  - Documented fix in `prds/authfix-2026-02-23.md`

### Changed

- Router now redirects any path without `/components` prefix to the prefixed version (2026-02-23 12:00 UTC)
  - `/dodo` redirects to `/components/dodo`
  - `/submit` redirects to `/components/submit`
  - Ensures consistent URL structure for both local development and production

### Added

- Site footer with Convex links (2026-02-23 12:00 UTC)
  - Footer component at `src/components/Footer.tsx`
  - Convex wordmark logo (40px height) on the left side linking to convex.dev
  - GitHub repo (get-convex/convex-backend) and Discord links on the right side
  - 50px top padding above footer
  - Responsive layout (stacks on mobile, side by side on desktop)
  - Added to global layout in `src/main.tsx`

### Changed

- Moved FAQSection from Submit.tsx to Directory.tsx (2026-02-23 12:00 UTC)
  - FAQ section now displays below component cards on the main directory page
  - Removed FAQSection import and usage from submissions page
  - Updated FAQ heading font to `font-semibold` to match "Components" section heading

- Expanded FAQSection to 8 questions (2026-02-23 12:00 UTC)
  - Added: How are components sandboxed? (Convex runtime data isolation)
  - Added: What projects should use Components? (check component docs)
  - Added: Do components cost money to use? (open source, usage-based)
  - Updated: Can I build my own? (now mentions other developers can drop into any project)
  - Updated: What happens after I submit? (added authoring guidelines link)
  - Updated `prds/faq-questions.md` to match component content

### Fixed

- Fixed user email not appearing in profile/submissions after legacy GitHub OAuth login (2026-02-23 12:00 UTC)
  - Legacy auth stored user data in database, not JWT claims
  - Added user id lookup helper import in `convex/auth.ts`
  - Updated `loggedInUser` query to fetch user from database with the legacy helper
  - Updated `isAdmin` query to use database lookup for email check
  - Updated `requireAdminIdentity` and `getAdminIdentity` helpers to use database lookup
  - Added `getCurrentUserEmail` helper function in `convex/packages.ts`
  - Updated all 15+ queries/mutations in packages.ts that used `ctx.auth.getUserIdentity()` for email
  - User submissions now correctly match by email from the users table
  - Profile page shows user info and their submissions
  - Admin page correctly identifies `@convex.dev` admins

### Changed

- Migrated authentication to a prior legacy GitHub OAuth stack (2026-02-23 12:00 UTC)
  - Replaced the previous auth integration with a GitHub OAuth based stack
  - Removed unused legacy dependency from the old provider
  - Updated `convex/auth.ts` to use provider based OAuth wiring
  - Created `convex/auth.config.ts` for JWT provider configuration (domain and applicationID)
  - Deleted `convex/convex.config.ts` (not needed for that legacy auth stack)
  - Deleted `convex/auth/session.ts` (legacy compatibility cleanup)
  - Updated `convex/http.ts` to use `auth.addHttpRoutes(http)`
  - Updated `convex/schema.ts` to include legacy auth tables
  - Updated `src/main.tsx` with legacy auth provider wiring
  - Updated `src/lib/auth.tsx` with legacy auth action hooks and `useConvexAuth`
  - Added redirect logic in Router for paths not starting with `/components`
  - Admin access pattern preserved: `@convex.dev` email check via `isAdmin` query and `requireAdminIdentity` helper
  - Environment variables set in Convex Dashboard for legacy GitHub OAuth and JWT signing
  - OAuth callback URL: `https://<deployment>.convex.site/api/auth/callback/github`
  - Added `jose` dev dependency for JWT key generation
  - Restored `as any` type casts in `convex/crons.ts` and `convex/http.ts` to work around deep type instantiation errors

### Added

- SKILL.md generation for AI agent integration (2026-02-23 12:00 UTC)
  - AI SEO content generation now also generates SKILL.md content for Claude agent skills
  - SKILL.md follows the Agent Skills specification with YAML frontmatter and Markdown body
  - Content includes component description, installation, usage patterns, key features, and API reference
  - Copyable SKILL.md snippet displayed on ComponentDetail.tsx above the badge section
  - "SKILL.md generated" status indicator in ComponentDetailsEditor.tsx
  - Button text updated to "Generate SEO + Skill" / "Regenerate SEO + Skill"
  - New `skillMd` field added to packages schema
  - `buildSkillMd()` helper function in `convex/seoContent.ts`
  - Public queries now include `skillMd` field for frontend access

### Changed

- Migrated from Convex self-hosting to Netlify hosting (2026-02-23 12:00 UTC)
  - Removed `@convex-dev/self-hosting` dependency from `package.json`
  - Simplified `convex/convex.config.ts` to basic app definition
  - Removed `registerStaticRoutes()` from `convex/http.ts`
  - Deleted `.env.production` (use Netlify Dashboard environment variables instead)
  - App now deployed at `https://components-directory.netlify.app`

- Updated Vite and Netlify configuration for SPA routing (2026-02-23 12:00 UTC)
  - Changed `vite.config.ts` to use `base: "/"` (assets served from root)
  - Updated `netlify.toml` with redirect from `/` to `/components` (301)
  - Added SPA fallback redirects for `/components` and `/components/*` to `/index.html` (200)
  - Router in `src/main.tsx` strips `/components` prefix for route matching
  - Updated `.env.local` redirect URI to `http://localhost:5173/components/callback`
  - Production routes: `/components`, `/components/submit`, `/components/profile`, `/components/submissions`, `/components/submissions/admin`, `/components/:slug`

- WorkOS callback URLs updated (2026-02-23 12:00 UTC)
  - Development: `http://localhost:5173/components/callback`
  - Production: `https://components-directory.netlify.app/components/callback`

### Added

- Slug Migration Tool for admin dashboard (2026-02-23 12:00 UTC)
  - New SlugMigrationPanel in Admin Settings tab to identify and fix packages without URL slugs
  - Displays count and list of packages missing slugs
  - "Generate All Slugs" button to bulk generate slugs for all packages missing them
  - Individual "Generate" button per package in the migration panel
  - "Generate Slug" button on package cards (orange, shown only when slug is missing)
  - Button appears next to npm/repo/demo/refresh buttons
  - Uses existing `generateSlugFromName()` logic from submission flow
  - After generation, slug is editable in Component Details editor
  - New backend functions: `getPackagesWithoutSlugs` (query), `generateSlugForPackage` (mutation), `generateMissingSlugs` (mutation)

### Added

- Admin "Marked for Deletion" filter tab (2026-02-23 12:00 UTC)
  - New "Deletion" tab in Admin filter bar to show all packages pending deletion
  - Tab displays count of packages marked for deletion
  - Package rows in admin show red "Deletion" badge next to visibility badge when marked

### Fixed

- ComponentDetailsEditor now reactively syncs slug field with backend updates (2026-02-23 12:00 UTC)
  - Added `useEffect` hook to sync local slug state when `initialSlug` prop changes
  - Slug now appears immediately after clicking "Generate Slug" button without needing refresh
  - Matches existing reactive behavior for thumbnail, logo, and template fields
- Soft deletion workflow for components (2026-02-23 12:00 UTC)
  - Users mark components for deletion instead of immediate deletion
  - Components marked for deletion are hidden from directory immediately
  - Admin can permanently delete marked components from Settings panel
  - Scheduled cron job runs daily at 2 AM UTC to auto-delete after waiting period
  - Configurable auto-delete toggle and waiting period (1, 3, 7, 14, or 30 days)
  - Users can cancel deletion request before admin processes it
  - "Pending Deletion" badge shown on marked components in profile (next to visibility badge)
- Account deletion requires deleting all components first (2026-02-23 12:00 UTC)
  - Delete Account modal shows warning if user has active submissions
  - User must delete all components before deleting their account
  - Clear guidance in Account section and modal
- Admin Deletion Management panel in Settings (2026-02-23 12:00 UTC)
  - Toggle for auto-delete marked packages
  - Configurable waiting period (days)
  - List of packages pending deletion with "Delete Now" option
  - Info about the scheduled cleanup cron job
- Header redesign with floating pill style (2026-02-23 12:00 UTC)
  - Floating pill design with `rounded-full`, white/95 background, backdrop blur, and shadow
  - Convex wordmark black SVG logo (70px height)
  - Added GitHub, Discord, and Docs icons to header navigation
  - Navigation links (Directory, Submissions, Submit) with medium font weight
  - Removed user email from profile dropdown
  - Header height set to 3.438rem
  - Mobile menu redesigned as separate dropdown card below header pill (rounded-2xl)
- SubmitForm.tsx layout improvements (2026-02-23 12:00 UTC)
  - Removed "Back to Directory" breadcrumb link
  - Moved "Submit a Component" title above the form box to match Profile.tsx style
  - Description text remains inside the form box
- FAQSection reusable component (2026-02-22 12:00 UTC)
  - Extracted from SubmitForm.tsx into `src/components/FAQSection.tsx`
  - Added to bottom of Submit.tsx (submissions directory) page
  - Expanded FAQ content: sandboxing, review process, requirements, building components, pricing, docs links
- Page layout alignment improvements (2026-02-22 12:00 UTC)
  - Submit.tsx page width now matches Directory.tsx (`max-w-7xl`)
  - SubmitForm.tsx page width now matches Profile.tsx (`max-w-3xl`)
  - Submit.tsx title styling aligned with Directory.tsx
  - Search input background changed to white on Submit.tsx
- Convex self-hosting integration for deploying the React app at `giant-grouse-674.convex.site` (2026-02-22 12:00 UTC)
  - Installed `@convex-dev/self-hosting` component for static file serving
  - Added `convex/convex.config.ts` to register the self-hosting component
  - Added `convex/staticHosting.ts` to expose upload APIs for the CLI
  - Updated `convex/http.ts` with `registerStaticRoutes()` for SPA fallback (preserves all existing API routes)
  - Updated `vite.config.ts` with environment-aware base path (`SELF_HOST=true` uses `/`)
  - Added `deploy` and `deploy:static` npm scripts for one-shot deployment
- Auto sign-in redirect for `/submit` page (2026-02-22 12:00 UTC)
  - Unauthenticated users visiting `/submit` are now automatically redirected to WorkOS sign-in
  - After authentication, users are returned to `/submit` to complete their submission
  - No longer requires clicking "Sign in to Submit" button first
- Mark as read notification system
  - `adminHasRead` field on `packageNotes` for admin read tracking
  - `adminHasRead` field on `packageComments` for admin read tracking
  - `markNotesAsReadForAdmin` mutation to mark user notes as admin-read
  - `markCommentsAsReadForAdmin` mutation to mark comments as admin-read
  - `getUnreadUserNotesCount` query for unread user notes count
  - `getUnreadCommentsCount` query for unread comments count
  - Auto-mark as read when admin opens Notes or Comments panels
  - "Mark all read" button in Notes and Comments panel headers
  - Unread count badges on Notes button (blue) and Comments button (blue)
  - User Profile Messages modal shows unread count with "Mark all read" button
- User profile enhancements
  - Edit submission modal for users to update their own submissions
  - Hide/show visibility controls with confirmation modals
  - Delete submission functionality with confirmation
  - Visibility guide section in status guide
- `additionalEmails` field on packages schema for multi-account access
- `setMySubmissionVisibility` mutation for users to hide/show their submissions
- `requestDeleteMySubmission` mutation for users to delete their submissions
- `updateMySubmission` mutation for users to edit submission fields
- `getMySubmissionForEdit` query to fetch editable submission data
- `updateSubmitterEmail` admin mutation for changing primary submitter email
- `updateAdditionalEmails` admin mutation for managing multi-account access
- `SubmitterEmailEditor` component in Admin panel for editing submitter emails
- `userOwnsPackage` helper function for checking ownership via submitterEmail or additionalEmails
- Shared `Header` component (`src/components/Header.tsx`) with auth state, navigation, and user menu
- `FAQSection` component (`src/components/FAQSection.tsx`) for reusable FAQ display

### Changed

- Header.tsx redesigned with white background, Convex wordmark logo, and social icons (2026-02-22 12:00 UTC)
- Submit.tsx page layout aligned with Directory.tsx width and styling (2026-02-22 12:00 UTC)
- SubmitForm.tsx page width aligned with Profile.tsx (2026-02-22 12:00 UTC)
- FAQSection expanded with additional questions about sandboxing, pricing, and building components (2026-02-22 12:00 UTC)

- `SubmitForm.tsx` now auto-triggers sign-in flow when accessed by unauthenticated users
  - Replaced sign-in gate UI with "Redirecting to sign in..." loading state
  - `useEffect` hook stores return path in localStorage and calls `signIn()` automatically
  - `AuthCallback` component reads stored path and redirects back after authentication
- `getMySubmissions` query now checks both submitterEmail and additionalEmails for user access
- Profile page: removed duplicate "My Submissions" header and "Submit New" button
- Profile page: added Edit, Hide/Show, and Delete buttons to submission cards
- Profile page: status guide now includes visibility states (Visible, Hidden, Archived)
- Admin panel: submitter info section replaced with editable `SubmitterEmailEditor` component
- Admin panel: `additionalEmails` field now included in admin package data
- Admin dashboard route changed from `/submit/admin` to `/submissions/admin`
- Admin page sign-in prompt simplified to "Admin access only" (removed @convex.dev email mention)
- Non-admin users visiting `/submissions/admin` are now automatically redirected to `/profile` instead of seeing an "Access Denied" message
- Global navigation with Directory, Submit, and Docs links across all pages
- User menu in header showing avatar, email, My Submissions link, and Sign Out button
- Consistent auth flow across all pages using shared Header component
- `SubmitForm.tsx` dedicated submission page (replaced `Submit.tsx` modal approach)
- Sign-in gate for unauthenticated users on Submit page
- WorkOS AuthKit authentication replacing the legacy auth stack for convex.dev unified login experience
- User profile page at `/profile` for managing submitted components
- Submissions link in header navigation pointing to `/submissions`
- `getMySubmissions` query to fetch packages by authenticated user's email
- `requestSubmissionRefresh` mutation for users to send notes to admin team (request re-review, removal, updates)
- `by_submitter_email` index on packages table for efficient user submission lookups
- OAuth callback component that waits for AuthKit session before redirecting to `/submit`
- Submission checklist in Submit page with 3 checkboxes (FAQ acknowledgment, Authoring Components compliance, permission to share)
- FAQ section on Submit page with 4 questions about review process, requirements, post-submission flow, and learning resources
- Terms of Service and Privacy Policy links on Submit page
- Architecture overview document with mermaid diagrams (`prds/architecture-overview.md`) for team documentation

### Changed

- Refactored auth flow: Submit page now requires authentication (dedicated form page instead of modal)
- All pages now use shared Header component for consistent navigation and auth UI
- Directory page (`/`) publicly accessible without auth, has shared Header
- Component detail pages (`/:slug`) publicly accessible without auth, has shared Header
- Profile page (`/profile`) requires auth, shows user's own submissions with management options
- Route reorganization: `/submissions` for public table directory, `/submit` for auth-gated form
- Submit.tsx (table directory) moved to `/submissions` route with Header added
- SubmitForm.tsx: checkboxes now inside form above submit button, button disabled until all checked
- Admin page (`/submit/admin`) requires @convex.dev email, has shared Header with admin search bar
- 404 page now includes shared Header for consistent UX
- Authentication migrated from the legacy auth stack to WorkOS AuthKit (`@workos-inc/authkit-react` and `@convex-dev/workos`)
- `convex/auth.config.ts` now configures WorkOS custom JWT providers for token validation
- Admin authorization now uses `ctx.auth.getUserIdentity()` instead of legacy user id table lookup
- `vite.config.ts` base path now dynamic: `/` for local dev, `/components/` for production
- Removed `SignInForm.tsx` and `Submit.tsx` (modal approach replaced with dedicated page)
- `SignOutButton.tsx` updated to use WorkOS `signOut()`
- Logo upload on submit form (png, webp, svg) replacing the previous 16:9 thumbnail upload
- Sign-in buttons now call `signIn()` directly per Convex WorkOS docs (removed `getSignInUrl()` workaround)
- AuthKit configuration now uses `VITE_WORKOS_REDIRECT_URI` env variable instead of computed redirect

### Fixed

- Sign-in flow now properly redirects to WorkOS hosted login page
- OAuth callback no longer redirects prematurely before session is established
- Profile page sign-in button now works correctly

### Technical Details

- Legacy auth tables (`authSessions`, `authAccounts`, `authRefreshTokens`, etc.) preserved in schema during migration
- Admin identity helpers (`requireAdminIdentity`, `getAdminIdentity`) now use `auth.user.current()` and `auth.user.get()` to check `@convex.dev` email
- Legacy GitHub OAuth environment variables were required in Convex dashboard during earlier auth phases
- Legacy JWT signing keys were generated via a prior auth CLI flow
- `SITE_URL` environment variable required for OAuth redirect (production: `https://components-directory.netlify.app`)
- GitHub OAuth App callback URL: `https://<deployment>.convex.site/api/auth/callback/github`
- Admin thumbnail template management panel: upload, enable/disable, set default, delete background templates
- Auto-generate thumbnail toggle in admin settings: when enabled, composites user logo onto default template on submission
- Thumbnail generation action using Jimp and resvg-wasm for server-side 16:9 image composition with SVG support
- Logo management section in `ComponentDetailsEditor`: upload/replace logo, download, and generate thumbnail from template picker
- Batch regenerate all thumbnails button in admin template panel
- `thumbnailTemplates` table for admin-managed background images with safe area fields
- `thumbnailJobs` table for tracking generation status and history
- Schema fields on packages: `logoStorageId`, `logoUrl`, `selectedTemplateId`, `thumbnailGenerationVersion`, `thumbnailGeneratedAt`, `thumbnailGeneratedBy`
- Weekly cron job to clean up failed thumbnail jobs older than 7 days
- Admin thumbnail clear button in `ComponentDetailsEditor` so editors can remove an existing thumbnail before saving

## [2.2.0] 2026-02-13

### Added

- AI-generated SEO/AEO/GEO structured content layer for component detail pages
- Five content blocks per component: value prop, benefits, use cases, FAQ, and resource links
- Anthropic Claude integration in `convex/seoContent.ts` to generate structured content from submitted component data
- Dual JSON-LD schema (`SoftwareSourceCode` + `FAQPage`) on detail pages for Google rich results
- `/api/llms.txt` HTTP endpoint for AI agent discovery of the full component index
- Enhanced `/api/markdown` endpoint with AI-generated SEO sections (benefits, use cases, FAQ, resources)
- `SeoAccordion` component on `ComponentDetail.tsx` for collapsible use cases and FAQ sections
- `buildComponentJsonLd()` helper in `seo.ts` for dual `@graph` structured data
- SEO generation button and status display in admin `ComponentDetailsEditor`
- Auto-trigger: SEO content generates automatically when a package is approved for the first time
- `regenerateSeoContent` public action for admin-triggered content regeneration

### Changed

- Schema: added 8 new optional fields to packages table (`seoValueProp`, `seoBenefits`, `seoUseCases`, `seoFaq`, `seoResourceLinks`, `seoGeneratedAt`, `seoGenerationStatus`, `seoGenerationError`)
- Public and admin package validators updated to include SEO content fields
- `ComponentDetail.tsx` meta description now prefers AI-generated value prop over short description
- `updateReviewStatus` mutation now schedules SEO generation on first approval

## [2.1.0] 2026-02-13

### Added

- GitHub Issues integration on component detail pages
- Issues badge next to author showing open issue count from the component's GitHub repository
- Tabbed issues panel (Open/Closed) that renders below the install command when clicked
- Each issue links directly to GitHub in a new tab with title, author, date, labels, and comment count
- Paginated issue loading with "Load more" button
- Cached GitHub issue counts in database (refreshed hourly) for instant display on page load
- `fetchGitHubIssues` action to fetch issues from GitHub REST API (supports optional GITHUB_TOKEN env var for higher rate limits)
- `refreshGitHubIssueCounts` action to fetch and cache open/closed counts using GitHub Search API
- JSON-LD structured data (SoftwareSourceCode schema) on detail pages for SEO/AEO/GEO
- `injectJsonLd()` helper in seo.ts for managing structured data script tags

### Changed

- Schema: added `githubOpenIssues`, `githubClosedIssues`, `githubIssuesFetchedAt` fields to packages table
- Public and admin package validators updated to include GitHub issue count fields

## [2.0.0] 2026-02-12

### Added

- Convex Components Directory: full public-facing directory at /components/ with category sidebar, search, sort, featured section, and component cards
- Component detail pages at /components/:slug with sidebar metadata layout, thumbnail, install command, and markdown rendering
- Dynamic SVG badge service at /api/badge?slug=X for component README badges
- Badge analytics tracking via badgeFetches table
- Markdown HTTP endpoint at /api/markdown?slug=X serving raw markdown for agents, LLMs, and tools
- Share dropdown on detail pages with View as Markdown, Copy as Markdown, and Copy page URL
- Markdown source view with copy button on component detail pages
- Component thumbnail upload (Convex file storage) in both admin editor and public submission form
- Auto-fill author info from GitHub repository URL in admin editor
- Convex Verified badge display on component cards and detail pages
- Component seed script for migrating existing components into the directory
- Client-side slug generation for URL-safe component names (handles scoped packages)
- Server-side slug generation helper in packages.ts
- SEO meta tags (title, description, Open Graph) on component detail pages
- Category system with 7 categories (AI, Auth, Backend, Database, Durable Functions, Integrations, Payments)
- New schema fields: slug, category, tags, shortDescription, longDescription, videoUrl, thumbnailUrl, thumbnailStorageId, convexVerified, authorUsername, authorAvatar, relatedComponentIds
- New indexes: by_slug, by_category, by_category_and_visibility
- New pages: Directory.tsx, ComponentDetail.tsx, NotFound.tsx
- New components: ComponentCard.tsx, CategorySidebar.tsx, SearchBar.tsx, VerifiedBadge.tsx, InstallCommand.tsx, ComponentDetailsEditor.tsx
- New lib files: categories.ts, slugs.ts, seo.ts
- Submit form now collects category, short/long descriptions, tags, video URL, and thumbnail
- Submit modal auto-opens when navigating to /submit?submit=true from directory sidebar
- Admin thumbnail preview in package list rows
- Vite base path set to /components/ for convex.dev deployment

### Changed

- Component detail page sidebar widened to 280px to match reference design
- Thumbnail moved from main content to sidebar top, sized to fit sidebar width
- npm "View package" link now uses official npm SVG logo instead of inline red badge
- Category tag redesigned: bordered pill with uppercase monospace text matching reference
- Back to Components link and title moved to full-width top section above the 2-column layout
- Install command and content area positioned below the 2-column sidebar section
- Frontend restructured into src/pages/ and src/components/ directories
- Client-side router updated with pathname-based routing for /, /submit, /submit/admin, and /:slug
- getComponentBySlug query relaxed to show non-approved packages with slugs (only hides hidden/archived)
- Dropdown and input styling updated to use bg-bg-primary and focus:ring-1 focus:ring-button
- Removed non-existent border-border-primary classes throughout UI

## [1.3.11] 2026-01-26

### Changed

- Rewrote README.md to focus on the Convex Components Challenge
- Added challenge categories (Auth/Identity, AI/Agent Infrastructure, Analytics, API Usage, Content Management, Full-Stack Drop-In Features, Storage, Third-Party Sync)
- Added rewards section (featured placement, $100+ gift card, swag)
- Added links to component documentation (authoring, understanding, using, submit)
- Added link to GitHub project board for challenge details
- Removed previous application-focused documentation

## [1.3.10] 2025-01-17

### Fixed

- NPM refresh now preserves existing repositoryUrl and homepageUrl instead of overwriting with npm data
- Single package refresh now properly updates lastRefreshedAt timestamp
- AI review now handles various GitHub URL formats (git+ prefix, trailing slashes, branch paths)

### Added

- Monorepo package discovery for AI review: automatically detects packages in `packages/<name>/` directories
- AI review now finds convex.config.ts in monorepo structures like `packages/<name>/src/component/`
- Debug logging for AI review to help troubleshoot repository parsing issues

### Technical Details

- Updated `refreshNpmData` action to query existing package data and preserve URLs
- Updated `_refreshPackageBatch` internal action to also preserve URLs during batch refresh
- Improved URL normalization in `fetchGitHubRepo` to handle git+, .git suffix, trailing slashes, tree/blob paths, and hash fragments
- AI review now queries GitHub packages directory to discover monorepo subdirectories dynamically

## [1.3.9] 2025-01-08

### Added

- Copy button on AI review results panel to copy formatted review for Notion
- Copied content includes: package name, status, maintainers, npm URL, GitHub URL, summary, and criteria checklist
- Uses Notion-friendly markdown format with checkboxes for criteria

## [1.3.8] 2025-01-08

### Changed

- Changed aiReview.ts model to claude-opus-4-5-20251101

## [1.3.7] 2025-01-08

### Removed

- Removed "Indexes follow naming convention" criterion from AI review checks
- This criterion was non-critical and added unnecessary noise to review results

### Changed

- AI review now validates against 9 criteria (5 critical, 4 non-critical) instead of 10
- Updated admin panel settings explanation to reflect the removed criterion
- Updated all documentation (aicheck.md, howitworks.md, files.md, README.md, task.md)

## [1.3.6] 2025-12-05

### Documentation

- Updated `.cursor/rules/sec-check.mdc` with comprehensive security guidelines for Convex apps
- Added Row-Level Security (RLS) section with convex-helpers patterns for read/modify/insert rules
- Added AI-Assisted Development Security section for vibe coding with Cursor/Copilot
- Added Convex Auth Token Security section for XSS prevention and refresh token protection
- Added Dependency and Supply Chain Security section for npm audit and version locking
- Added Error Handling Security section for generic error messages
- Enhanced security checklist with RLS, AI-assisted development, token security, and dependency checks

### Technical Details

- Security guidelines reference: [stack.convex.dev/row-level-security](https://stack.convex.dev/row-level-security)
- Added wrapDatabaseReader and wrapDatabaseWriter patterns from convex-helpers
- Added default deny policy configuration for strict RLS
- Added prompting guidance for secure AI-generated code
- Added Cursor rules configuration for enforcing security patterns

## [1.3.5] 2025-12-04

### Security

- Fixed data exposure vulnerability: public queries now strip all PII (submitter email, name, Discord) before returning data to clients
- AI review details (summary, criteria, errors) excluded from public responses; only status field (pass/fail/partial) is exposed
- Created internal queries (`_getPackage`, `_getPackageByName`) for backend operations that need full data access
- Public queries now use explicit return validators to enforce safe data shapes
- Renamed `reviewerEmail` field to `reviewedBy` for clarity; AI actions now use "AI" identifier instead of fake email format

### Technical Details

- Added `toPublicPackage()` helper function to strip sensitive fields from query responses
- Added `publicPackageValidator` for type-safe public query returns
- Updated `listPackages`, `searchPackages`, `getPackage`, `getPackageByName` to return sanitized data
- AI review action (`runAiReview`) now uses internal query for full package data access
- Backend mutations (`submitPackage`, `refreshNpmData`) now use internal queries
- Updated security guidelines in `.cursor/rules/sec-check.mdc` with AI system recommendations

## [1.3.4] 2025-12-02

### Fixed

- External links (npm, repo, website, demo) now open in new tabs even when app is embedded in an iframe
- Thank you success modal now displays correctly after package submission (fixed z-index layering)

### Added

- Email privacy notice in submit form: "Not displayed publicly. Used by the Convex team to contact you about your submission."

### Technical Details

- Changed external link buttons to use `window.open()` with `onClick` handlers instead of relying solely on `target="_blank"` for iframe compatibility
- SuccessModal now uses maximum z-index (2147483647) matching the submit modal for iframe support
- Submit modal form is hidden when success modal is displayed to prevent layering issues

## [1.3.3] 2025-12-02

### Changed

- Simplified frontend layout: removed header (Convex logo, GitHub icon, Start Building button) and footer
- Moved toolbar controls (info icon, search, sort dropdown, submit button) directly above package listing
- Title "Components npm Submissions Directory" now displays inline with controls
- Submit modal opens at top of page instead of center for better iframe support
- About modal opens at top of page for consistency
- Submit modal uses maximum z-index (2147483647) to ensure it appears on top in iframes
- Admin page: removed breadcrumb navigation, shows only "Admin" text
- Admin page: moved status legend below Stats section, removed footer
- Improved mobile responsiveness for compact toolbar layout

### Technical Details

- Frontend App.tsx restructured with compact toolbar above Content component
- Modal positioning changed from `items-center` to `items-start` with top padding
- Admin.tsx StatusLegend component moved inside AdminDashboard below Stats
- Removed Footer component from Admin page

## [1.3.2] 2025-11-30

### Added

- Admin NPM data refresh button to pull latest package information from npm
- ArrowClockwise icon button in admin panel for each package
- Refresh updates version, downloads, description, license, maintainers without affecting review status or submitter info

### Technical Details

- Added `refreshNpmData` action in `convex/packages.ts` to fetch fresh npm data for a specific package
- Added `updateNpmData` mutation to patch only npm-sourced fields while preserving admin data
- Updated `prds/howitworks.md` with refresh feature documentation

## [1.3.1] 2025-11-29

### Changed

- Simplified Vite configuration with hardcoded base path for deployment
- Updated base path toggle for localhost vs convex.dev deployment

## [1.3.0] 2025-11-28

### Added

- AI Review feature for validating npm packages against Convex component specifications
- AI Review button in admin panel to trigger automated code analysis
- AI Review status badges (passed, failed, partial, reviewing, error)
- AI Review results panel with expandable criteria checklist
- Admin settings panel with auto-approve and auto-reject toggles
- AI Review documentation referencing official Convex docs
- Support for analyzing GitHub repositories with convex.config.ts detection
- 9 criteria checklist for Convex component validation
- Admin settings table for AI automation preferences
- Expanded convex.config.ts detection for various component structures
- Live demo URL field for package submissions (optional but suggested)
- Demo link button in package details and admin panel

### Technical Details

- Added `convex/aiReview.ts` with runAiReview action using Anthropic Claude API
- Added AI review fields to packages schema (aiReviewStatus, aiReviewSummary, aiReviewCriteria, aiReviewedAt, aiReviewError)
- Added adminSettings table for auto-approve/reject configuration
- Added `updateAiReviewStatus` and `updateAiReviewResult` mutations
- Added `getAdminSettings` query and `updateAdminSetting` mutation
- GitHub API integration for fetching component source files
- Supports multiple convex.config.ts locations: convex/src/component/, convex/component/, convex/, src/component/, src/, root, packages/, lib/
- Added demoUrl field to packages schema and submission form

## [1.2.0] 2025-11-28

### Added

- About modal with app description and status legend explanations
- About link (info icon) in header next to app title
- Featured status for packages (only approved packages can be featured)
- Star icon display for featured packages with tooltip
- Status legend bar above footer with grid background pattern
- Featured toggle button in admin panel with Star icon
- Public comments system visible on frontend package details

### Changed

- Updated app title to "components npm submissions directory" (lowercase styling)
- Removed login/signup options from public frontend header (admin authentication via /admin route only)
- Featured packages now highlighted on convex.dev/components
- Admin footer legend updated to include Featured status
- Simplified About modal footer (removed instruction text)

### Technical Details

- Added `featured` field to packages schema
- Added `toggleFeatured` mutation with approval check
- Updated query return validators to include featured field
- Improved admin inline actions with Featured toggle

## [1.1.0] 2025-11-28

### Added

- Review status system with five states (pending, in_review, approved, changes_requested, rejected)
- Visibility control system (visible, hidden, archived)
- Package notes system with threaded replies for admin use
- Public comments system for packages visible on frontend
- Submitter information collection (name, email, optional Discord username)
- Admin package notes panel with reply functionality
- Note count badges on admin package table
- Review status filtering in admin dashboard
- Inline action buttons for review status and visibility changes
- Phosphor icons replacing emojis throughout the application
- Custom modal components for confirmations and alerts
- Keyboard shortcuts (Cmd+K for search focus)
- Enhanced admin search across all packages regardless of visibility
- Public search filtering to only show visible packages

### Changed

- Replaced emoji icons with Phosphor icons throughout the application
- Package submissions now collect submitter information (name, email, Discord)
- Public package listings filter out hidden and archived packages
- Admin dashboard defaults to showing pending submissions
- Search functionality expanded to include package descriptions
- Review status workflow integrated into admin interface

## [1.0.0] 2025-11-28

### Added

- Initial project setup with Chef and Convex
- Package submission functionality via npm URL
- Automatic package metadata fetching from npm registry
- Package listing with search and sort capabilities
- Expandable package cards with detailed information
- Admin dashboard for @convex.dev email addresses
- CSV export functionality for all packages
- Authentication system with Password and Anonymous providers
- Real-time package updates using Convex queries
- Full-text search on package names and descriptions
- Package statistics display (downloads, size, files)
- Maintainer information with Gravatar avatars
- Copy-to-clipboard install command
- Loading states and skeleton screens
- Toast notifications for user feedback
- Responsive design with Tailwind CSS
- Type-safe Convex functions with validators
- Database indexes for performance optimization
- HTTP endpoint for CSV export
- Admin access control based on email domain

### Technical Details

- Built with React 19 and TypeScript
- Backend powered by Convex with real-time reactivity
- Styled with Tailwind CSS and custom design system
- Authentication via Convex Auth (submissions don't require login)
- Package data fetched from npm Registry API and npm Downloads API
- Database schema with indexes for name lookup, date sorting, review status filtering, visibility filtering, and full-text search on name and description
- Package notes table with threading support via parent note references
- Package comments table for public comments
- HTTP routes for CSV export functionality
- Development workflow with Chef AI assistance
- Configured for Netlify deployment
- Phosphor Icons library for consistent iconography
