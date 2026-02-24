# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed user email not appearing in profile/submissions after GitHub OAuth login (2026-02-23)
  - `@convex-dev/auth` stores user data in database, not JWT claims unlike WorkOS
  - Added `getAuthUserId` import from `@convex-dev/auth/server` in `convex/auth.ts`
  - Updated `loggedInUser` query to fetch user from database using `getAuthUserId`
  - Updated `isAdmin` query to use database lookup for email check
  - Updated `requireAdminIdentity` and `getAdminIdentity` helpers to use database lookup
  - Added `getCurrentUserEmail` helper function in `convex/packages.ts`
  - Updated all 15+ queries/mutations in packages.ts that used `ctx.auth.getUserIdentity()` for email
  - User submissions now correctly match by email from the users table
  - Profile page shows user info and their submissions
  - Admin page correctly identifies `@convex.dev` admins

### Changed

- Migrated authentication to official `@convex-dev/auth` library with GitHub OAuth (2026-02-23)
  - Replaced `@robelest/convex-auth` with `@convex-dev/auth` (v0.0.80) and `@auth/core` (v0.37.0)
  - Removed `arctic` dependency (now using `@auth/core` providers)
  - Updated `convex/auth.ts` to use `convexAuth()` from `@convex-dev/auth/server` with GitHub provider
  - Created `convex/auth.config.ts` for JWT provider configuration (domain and applicationID)
  - Deleted `convex/convex.config.ts` (not needed for `@convex-dev/auth`)
  - Deleted `convex/auth/session.ts` (was for `@robelest/convex-auth` client compatibility)
  - Updated `convex/http.ts` to use `auth.addHttpRoutes(http)`
  - Updated `convex/schema.ts` to use `authTables` from `@convex-dev/auth/server`
  - Updated `src/main.tsx` with `ConvexAuthProvider` from `@convex-dev/auth/react`
  - Updated `src/lib/auth.tsx` with `useAuthActions` from `@convex-dev/auth/react` and `useConvexAuth`
  - Added redirect logic in Router for paths not starting with `/components`
  - Admin access pattern preserved: `@convex.dev` email check via `isAdmin` query and `requireAdminIdentity` helper
  - Environment variables set in Convex Dashboard: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`
  - OAuth callback URL: `https://<deployment>.convex.site/api/auth/callback/github`
  - Added `jose` dev dependency for JWT key generation
  - Restored `as any` type casts in `convex/crons.ts` and `convex/http.ts` to work around deep type instantiation errors

### Added

- SKILL.md generation for AI agent integration (2026-02-23)
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

- Migrated from Convex self-hosting to Netlify hosting (2026-02-23)
  - Removed `@convex-dev/self-hosting` dependency from `package.json`
  - Simplified `convex/convex.config.ts` to basic app definition
  - Removed `registerStaticRoutes()` from `convex/http.ts`
  - Deleted `.env.production` (use Netlify Dashboard environment variables instead)
  - App now deployed at `https://components-directory.netlify.app`

- Updated Vite and Netlify configuration for SPA routing (2026-02-23)
  - Changed `vite.config.ts` to use `base: "/"` (assets served from root)
  - Updated `netlify.toml` with redirect from `/` to `/components` (301)
  - Added SPA fallback redirects for `/components` and `/components/*` to `/index.html` (200)
  - Router in `src/main.tsx` strips `/components` prefix for route matching
  - Updated `.env.local` redirect URI to `http://localhost:5173/components/callback`
  - Production routes: `/components`, `/components/submit`, `/components/profile`, `/components/submissions`, `/components/submissions/admin`, `/components/:slug`

- WorkOS callback URLs updated (2026-02-23)
  - Development: `http://localhost:5173/components/callback`
  - Production: `https://components-directory.netlify.app/components/callback`

### Added

- Slug Migration Tool for admin dashboard (2026-02-23)
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

- Admin "Marked for Deletion" filter tab (2026-02-23)
  - New "Deletion" tab in Admin filter bar to show all packages pending deletion
  - Tab displays count of packages marked for deletion
  - Package rows in admin show red "Deletion" badge next to visibility badge when marked

### Fixed

- ComponentDetailsEditor now reactively syncs slug field with backend updates (2026-02-23)
  - Added `useEffect` hook to sync local slug state when `initialSlug` prop changes
  - Slug now appears immediately after clicking "Generate Slug" button without needing refresh
  - Matches existing reactive behavior for thumbnail, logo, and template fields
- Soft deletion workflow for components (2026-02-23)
  - Users mark components for deletion instead of immediate deletion
  - Components marked for deletion are hidden from directory immediately
  - Admin can permanently delete marked components from Settings panel
  - Scheduled cron job runs daily at 2 AM UTC to auto-delete after waiting period
  - Configurable auto-delete toggle and waiting period (1, 3, 7, 14, or 30 days)
  - Users can cancel deletion request before admin processes it
  - "Pending Deletion" badge shown on marked components in profile (next to visibility badge)
- Account deletion requires deleting all components first (2026-02-23)
  - Delete Account modal shows warning if user has active submissions
  - User must delete all components before deleting their account
  - Clear guidance in Account section and modal
- Admin Deletion Management panel in Settings (2026-02-23)
  - Toggle for auto-delete marked packages
  - Configurable waiting period (days)
  - List of packages pending deletion with "Delete Now" option
  - Info about the scheduled cleanup cron job
- Header redesign with floating pill style (2026-02-23)
  - Floating pill design with `rounded-full`, white/95 background, backdrop blur, and shadow
  - Convex wordmark black SVG logo (70px height)
  - Added GitHub, Discord, and Docs icons to header navigation
  - Navigation links (Directory, Submissions, Submit) with medium font weight
  - Removed user email from profile dropdown
  - Header height set to 3.438rem
  - Mobile menu redesigned as separate dropdown card below header pill (rounded-2xl)
- SubmitForm.tsx layout improvements (2026-02-23)
  - Removed "Back to Directory" breadcrumb link
  - Moved "Submit a Component" title above the form box to match Profile.tsx style
  - Description text remains inside the form box
- FAQSection reusable component (2026-02-22)
  - Extracted from SubmitForm.tsx into `src/components/FAQSection.tsx`
  - Added to bottom of Submit.tsx (submissions directory) page
  - Expanded FAQ content: sandboxing, review process, requirements, building components, pricing, docs links
- Page layout alignment improvements (2026-02-22)
  - Submit.tsx page width now matches Directory.tsx (`max-w-7xl`)
  - SubmitForm.tsx page width now matches Profile.tsx (`max-w-3xl`)
  - Submit.tsx title styling aligned with Directory.tsx
  - Search input background changed to white on Submit.tsx
- Convex self-hosting integration for deploying the React app at `giant-grouse-674.convex.site` (2026-02-22)
  - Installed `@convex-dev/self-hosting` component for static file serving
  - Added `convex/convex.config.ts` to register the self-hosting component
  - Added `convex/staticHosting.ts` to expose upload APIs for the CLI
  - Updated `convex/http.ts` with `registerStaticRoutes()` for SPA fallback (preserves all existing API routes)
  - Updated `vite.config.ts` with environment-aware base path (`SELF_HOST=true` uses `/`)
  - Added `deploy` and `deploy:static` npm scripts for one-shot deployment
- Auto sign-in redirect for `/submit` page (2026-02-22)
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

- Header.tsx redesigned with white background, Convex wordmark logo, and social icons (2026-02-22)
- Submit.tsx page layout aligned with Directory.tsx width and styling (2026-02-22)
- SubmitForm.tsx page width aligned with Profile.tsx (2026-02-22)
- FAQSection expanded with additional questions about sandboxing, pricing, and building components (2026-02-22)

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
- WorkOS AuthKit authentication replacing `@convex-dev/auth` for convex.dev unified login experience
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
- Authentication migrated from `@convex-dev/auth` to WorkOS AuthKit (`@workos-inc/authkit-react` and `@convex-dev/workos`)
- `convex/auth.config.ts` now configures WorkOS custom JWT providers for token validation
- Admin authorization now uses `ctx.auth.getUserIdentity()` instead of `getAuthUserId()` with `authAccounts` table lookup
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
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` environment variables required in Convex dashboard for GitHub OAuth
- `JWT_PRIVATE_KEY` and `JWKS` generated via `npx @robelest/convex-auth keys` CLI command
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
