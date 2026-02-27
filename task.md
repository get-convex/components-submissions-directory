# Task List

## to do

### AI Provider Settings and Prompt Versioning (PRD: prds/ai-provider-settings-and-prompt-versioning.md)
- [x] Add `aiProviderSettings` table to schema
- [x] Add `aiPromptVersions` table to schema
- [x] Create `convex/aiSettings.ts` with provider and prompt queries/mutations
- [x] Update `convex/aiReview.ts` to use custom provider settings and prompts
- [x] Add `AiProviderSettingsPanel` component to Admin.tsx
- [x] Add `AiPromptSettingsPanel` component to Admin.tsx
- [ ] Test default behavior unchanged (env vars work)
- [ ] Test provider override (Anthropic, OpenAI, Gemini)
- [ ] Test prompt versioning and restore

### Existing tasks
- [ ] vercel.json in website can point to repo app
- [ ] fix ai check
- docs for badges
- add image builder
- [ ] add image builder from https://component-thumbnail-gen.netlify.app/ and https://github.com/waynesutton/component-directory-image-generator
- [ ] add incre
- [x] header and footer
- [ ] fix font colros a
- [ ] npm run typecheck
- [ ] add fonts
- [ ] add plugin
- [ ] prod checklist
- [ ] tailwind css form github
- [ ] iimport exiting compons
- [ ] - [ ] add payments api

## Recent updates

- [x] Removed user visibility controls from Profile page (2026-02-26)
  - Removed Hide, Show, Delete, and Cancel Deletion buttons from user profile
  - Users must contact admin via "Send Request" to manage component visibility
  - Removed `ConfirmModal` component (no longer needed)
  - Removed `setVisibility`, `deleteSubmission`, `cancelDeleteSubmission` mutations from Profile
  - Removed `onHide`, `onShow`, `onDelete`, `onCancelDelete` props from SubmissionCard
  - Removed `ArrowCounterClockwise` icon import
  - Updated deletion message to guide users to contact admin
  - Admin retains full control via Admin dashboard
  - Build verified passing

- [x] Added Download Skill button for SKILL.md files (2026-02-25)
  - Download button with Phosphor FileArrowDown icon next to Markdown dropdown in author row
  - Button only appears when SKILL.md has been generated (after SEO content generation runs)
  - SKILL.md section now has both copy and download buttons
  - Downloads as `SKILL.md` file for easy saving to project
  - Uses browser Blob API for client-side file generation

- [x] Directory sidebar sticky position adjusted (2026-02-25)
  - Changed sticky top from `top-6` to `top-20` (80px from viewport top)
  - Submit button now remains visible below the header when scrolling
  - Entire sidebar (Submit, Search, Sort, Categories) stays sticky together

- [x] SEO Prompt Versioning and Multi-Provider AI support (2026-02-25)
  - Added `seoPromptVersions` table to schema for SEO prompt version history
  - Added SEO prompt queries/mutations to `convex/aiSettings.ts`: `getSeoDefaultPrompt`, `getSeoActivePrompt`, `getSeoPromptVersions`, `saveSeoPromptVersion`, `activateSeoPromptVersion`, `resetSeoToDefaultPrompt`
  - Added `DEFAULT_SEO_PROMPT` constant with placeholder substitution (e.g., `{{displayName}}`, `{{packageName}}`)
  - Updated `convex/seoContent.ts` to use custom prompt from database and support multi-provider (Anthropic, OpenAI, Gemini)
  - Added `callAiProvider` helper function for unified API calls across providers
  - Added `SeoPromptSettingsPanel` component to Admin Settings view
  - Panel includes: edit mode, version history, notes, restore, reset to default
  - Moved Refresh npm data and Generate Slug buttons from package card row to InlineActions Actions row
  - Removed standalone `RefreshNpmButton` and `GenerateSlugButton` components
  - Auto-refresh settings verified to update all package metadata fields (File Count, Weekly Downloads, etc.)
  - Multi-provider AI support works for ALL AI features (AI Review + SEO Content): both use same admin provider settings or env var fallback
  - Added confirmation modal for "Clear (use env)" buttons with danger styling and warning message

- [x] Added Actions row to Admin InlineActions panel (2026-02-25)
  - New "Actions" row above Status and Visibility rows in expanded package view
  - Convex Verified toggle button (teal, shows fill when verified)
  - Regenerate SEO + Skill button (shows spinner during generation, green when completed)
  - Combined Auto-fill button (fills author from GitHub and description from npm in parallel)
  - Hide Thumbnail toggle (orange, only shows when thumbnail exists, hides in category but shows in Featured)
  - Auto-fill shows what was filled in success toast
  - All buttons match existing Admin theme with Phosphor icons
  - Added useEffect hooks for author/avatar/verified field sync in ComponentDetailsEditor
  - PRD: `prds/admin-actions-row.md`

- [x] Added hide from submissions page feature for admin control (2026-02-25)
  - New `hideFromSubmissions` field on packages schema
  - `toggleHideFromSubmissions` mutation to toggle visibility on Submit.tsx
  - `listPackages` and `searchPackages` filter out hidden packages
  - Toggle button in Admin.tsx package row labeled "Sub Hide" / "Sub Hidden" to differentiate from directory Hide
  - Hidden packages still appear in Directory if approved
  - Admin panel shows all packages regardless of this setting
  - PRD: `prds/hide-from-submissions.md`

- [x] Added featured components sort order for admin control (2026-02-25)
  - New `featuredSortOrder` field on packages schema
  - `getFeaturedComponents` query sorts by `featuredSortOrder` (nulls last), then newest first
  - `setFeaturedSortOrder` mutation for admin to set order value
  - Sort order input in Admin.tsx next to Featured toggle (only shown when featured)
  - Dropdown sort (downloads, newest, etc.) does NOT affect Featured section order
  - PRD: `prds/featured-sort-order.md`

- [x] Added hide thumbnail in category option for components (2026-02-25)
  - New `hideThumbnailInCategory` field on packages schema
  - Checkbox in Admin Component Details editor (visible when thumbnail exists)
  - Thumbnails always shown in Featured section
  - Thumbnails hidden in category listings when checkbox is checked
  - Fixed: Added field to `directoryCardValidator` and query return maps (`listApprovedComponents`, `getFeaturedComponents`)
  - Updated `ComponentCard` with `showThumbnail` prop override
  - PRD: `prds/hide-thumbnail-in-category.md`

- [x] Imported 41 official Convex components to production database (2026-02-24)
  - Created `seedOfficialComponents` internal action with `importAsPending` and `dryRun` flags
  - Added `browser-use` component (AI category) and synced with convex.dev/components source
  - Renamed `_upsertSeededComponent` to `_upsertOfficialComponent` with improved logic
  - Preserves existing `reviewStatus` on updates, only sets new status on inserts
  - Returns detailed stats: total, created, updated, failed, dryRun, wouldImport
  - Legacy `seedExistingComponents` alias preserved for backward compatibility
  - Production import: 27 created as pending, 14 updated, 0 failed
  - Run: `npx convex run --prod seed:seedOfficialComponents '{"importAsPending": true}'`

- [x] Added pagination with configurable items per page to Admin panel (2026-02-24)
  - Package list now shows 20 items per page by default
  - Page navigation with Previous/Next buttons and numbered page buttons
  - Items per page dropdown (5, 10, 20, 40, 100) next to sort dropdown
  - Each filter tab (All, Pending, Review, Approved, Changes, Rejected, Deletion, Archived) maintains its own page state
  - "Showing X-Y of Z" counter updates based on current page and items per page
  - Page resets to 1 when changing filter or items per page
- [x] Reordered icons in Admin package rows (2026-02-24)
  - Moved ComponentDetailQuickLink (external link icon) to be last in the badge group
  - Order is now: StatusBadge, VisibilityBadge, UnrepliedNotesIndicator, ComponentDetailQuickLink
  - Icon remains before the downloads/date section on the far right
- [x] Added LLMs.txt and Markdown clean URL support (2026-02-24)
  - New `/api/markdown-index` endpoint for directory-wide markdown
  - New `/api/component-llms` endpoint for per-component llms.txt
  - Added 6 Netlify redirects for clean URLs: `/components/llms.txt`, `/components.md`, `/components/:slug/llms.txt`, `/components/:slug.md`, plus scoped package variants
  - All endpoints tested and working via Convex site URL
- [x] Moved Keywords section below Agent Skill (SKILL.md) section on ComponentDetail.tsx (2026-02-24)
  - Keywords tags now appear after the SKILL.md copyable snippet
  - Improves page hierarchy: SEO content > SKILL.md > Keywords
- [x] Moved Markdown dropdown to author row on ComponentDetail.tsx (2026-02-24)
  - Dropdown relocated from sidebar to main content area (author row)
  - Appears after author info with separator
  - Same functionality: View as Markdown, Copy as Markdown, Copy page URL
- [x] Commented out GitHub Issues feature on ComponentDetail.tsx (2026-02-24)
  - Issues badge button in author row commented out
  - Full issues panel (open/closed tabs, issue list, pagination) commented out
  - Code preserved for future re-enabling
- [x] Added clear logo button in Component Details editor (2026-02-24)
  - Clear button next to download button when logo exists
  - New `clearLogo` mutation in `convex/packages.ts` to remove logo URL and storage reference
  - Added `clearingLogo` state and `handleClearLogo` handler in `ComponentDetailsEditor.tsx`
  - Matches existing thumbnail clear functionality
- [x] Fixed SubmitForm.tsx success modal button layout (2026-02-23)
  - Buttons now display horizontally with `flex-row` instead of stacked
  - Improved spacing with `gap-3` and `inline-flex` for alignment
  - Changed font weight to medium and text color to primary for outline button
- [x] Fixed SubmitForm.tsx tags validator mismatch (2026-02-23)
  - Backend `submitPackage` expects `tags: v.optional(v.string())` (comma-separated string)
  - SubmitForm.tsx was incorrectly sending tags as an array
  - Changed to `tags.trim() || undefined` to match the validator
  - Fixes "ArgumentValidationError: Value does not match validator" on live site submissions
- [x] Enhanced SEO support for ComponentDetail pages (2026-02-24)
  - Added Twitter Card meta tags (summary_large_image with thumbnail)
  - Added canonical URL tag for duplicate content prevention
  - Added og:site_name and og:image:alt tags for better sharing
  - New `setComponentSeoTags()` consolidated helper in seo.ts
  - New `setTwitterTags()` and `setCanonicalUrl()` functions
  - Fixed index.html Twitter meta tags (changed `property` to `name`)
  - Updated index.html URLs to production domain (www.convex.dev/components)
- [x] AI Provider Settings and Prompt Versioning feature (2026-02-23)
  - Added `aiProviderSettings` and `aiPromptVersions` tables to schema
  - Created `convex/aiSettings.ts` with provider and prompt management functions
  - Updated `convex/aiReview.ts` to support Anthropic, OpenAI, and Google Gemini
  - Added `AiProviderSettingsPanel` in Admin Settings (API key, model, docs links)
  - Added `AiPromptSettingsPanel` in Admin Settings (edit, version history, restore)
  - Environment variables still work as default fallback
  - PRD: `prds/ai-provider-settings-and-prompt-versioning.md`
- [x] Commented out badge section on ComponentDetail.tsx until endpoint is working (2026-02-23)
  - "Add badge to your README" UI section hidden
  - Badge markdown line in buildMarkdownDoc function also commented out
  - Ready to re-enable when badge feature is implemented
- [x] Added auto-fill description button in Component Details editor (2026-02-23)
  - "Auto-fill from Package" button next to Long Description field
  - Copies npm/repo description from Package Metadata into Long Description
  - Admin can then edit the description before saving
  - Updated `ComponentDetailsEditor.tsx` with new `npmDescription` prop
  - Updated `PackageComponentDetailsEditor` in Admin.tsx to pass `pkg.description`
- [x] Fixed production GitHub OAuth "Missing sign-in verifier" error (2026-02-23)
  - Updated `@convex-dev/auth` from v0.0.80 to v0.0.90
  - Configured GitHub OAuth callback URL: `https://giant-grouse-674.convex.site/api/auth/callback/github`
  - Generated production JWT keys via `npx @convex-dev/auth --prod`
  - Set `SITE_URL` to `https://components-directory.netlify.app/components`
  - Created `prds/authfix-2026-02-23.md` documenting the fix
- [x] Added router redirect for paths without `/components` prefix (2026-02-23)
  - `/dodo` now redirects to `/components/dodo`
  - Ensures consistent URL structure across local and production
  - Updated `prds/routes-components-fix.md` with new redirect behavior
- [x] Moved FAQSection from Submit.tsx to Directory.tsx (2026-02-23)
  - FAQ now displays below component cards on the main directory page
  - Removed from submissions page
  - Updated heading font to `font-semibold` to match "Components" section heading
- [x] Expanded FAQSection to 8 questions (2026-02-23)
  - Added: sandboxing, what projects should use, pricing
  - Updated "Can I build my own?" with fuller text
  - Updated "What happens after I submit?" with authoring guidelines link
  - Updated `prds/faq-questions.md` to match
- [x] Added site footer with Convex links (2026-02-23)
  - Created `src/components/Footer.tsx` component
  - Convex wordmark logo (40px height) on the left linking to convex.dev
  - GitHub repo and Discord links on the right
  - 50px top padding above footer
  - Responsive layout for mobile/desktop
  - Integrated into global layout in `src/main.tsx`
- [x] Fixed user email not appearing in profile/submissions after GitHub OAuth (2026-02-23)
  - `@convex-dev/auth` stores user data in database, not JWT claims unlike WorkOS
  - Added `getAuthUserId` from `@convex-dev/auth/server` to fetch user from database
  - Updated `loggedInUser` and `isAdmin` queries to use database lookup
  - Updated `requireAdminIdentity` and `getAdminIdentity` helpers
  - Added `getCurrentUserEmail` helper in packages.ts
  - Updated all queries/mutations that used `ctx.auth.getUserIdentity()` for email
  - Submissions now correctly match by email from the users table
- [x] Verified GitHub OAuth sign-in flow works end to end (2026-02-23)
- [x] Verified admin access for `wayne@convex.dev` at `/components/submissions/admin` (2026-02-23)
- [x] Set `SITE_URL` to `http://localhost:5173/components` for correct OAuth redirect (2026-02-23)
- [x] Migrated authentication from `@robelest/convex-auth` to official `@convex-dev/auth` (2026-02-23)
  - Replaced `@robelest/convex-auth` and `arctic` with `@convex-dev/auth` (v0.0.90) and `@auth/core` (v0.37.0)
  - Updated `convex/auth.ts` to use `convexAuth()` with GitHub provider from `@auth/core`
  - Created `convex/auth.config.ts` for JWT provider configuration
  - Deleted `convex/convex.config.ts` (not needed for `@convex-dev/auth`)
  - Deleted `convex/auth/session.ts` (was for `@robelest/convex-auth` compatibility)
  - Updated `convex/http.ts` to use `auth.addHttpRoutes(http)`
  - Updated `convex/schema.ts` to use `authTables` from `@convex-dev/auth/server`
  - Updated `src/main.tsx` with `ConvexAuthProvider` from `@convex-dev/auth/react`
  - Updated `src/lib/auth.tsx` with `useAuthActions` and `useConvexAuth` hooks
  - Added redirect logic in Router for paths not starting with `/components`
  - Generated and set `JWT_PRIVATE_KEY` and `JWKS` environment variables in Convex Dashboard
  - Restored `as any` type casts in `convex/crons.ts` and `convex/http.ts` for type inference issues
  - Cleared Vite dependency cache (`node_modules/.vite`) to fix 504 Outdated Optimize Dep error
  - Added `jose` dev dependency for JWT key generation
- [x] Migrated from Convex self-hosting to Netlify (2026-02-23)
  - Removed `@convex-dev/self-hosting` dependency
  - Simplified `convex/convex.config.ts` (no components)
  - Removed `registerStaticRoutes()` from `convex/http.ts`
  - Deleted `.env.production` (use Netlify Dashboard env vars)
  - Changed `vite.config.ts` to `base: "/"` for asset serving
  - Updated `netlify.toml` with proper SPA routing redirects
  - Production URL: `https://components-directory.netlify.app`
  - WorkOS callback: `https://components-directory.netlify.app/components/callback`
- [x] SKILL.md generation for AI agent integration (2026-02-23)
  - AI SEO content generation now also generates SKILL.md content
  - SKILL.md follows Agent Skills specification with YAML frontmatter and Markdown body
  - Includes component description, installation, usage patterns, key features, API reference
  - Copyable SKILL.md snippet on ComponentDetail.tsx (above badge section)
  - "SKILL.md generated" status indicator in admin ComponentDetailsEditor
  - Button text updated to "Generate SEO + Skill" / "Regenerate SEO + Skill"
  - Added `skillMd` field to packages schema
  - Added `buildSkillMd()` helper in `convex/seoContent.ts`
  - Updated `_saveSeoContent` in `convex/seoContentDb.ts` to persist skillMd
  - Updated `publicPackageValidator` and `toPublicPackage()` in `convex/packages.ts`
  - Updated ComponentDetail.tsx with copy button and pre-formatted display
  - Updated ComponentDetailsEditor.tsx with skillMd prop and status display
  - Updated Admin.tsx to pass skillMd prop to editor
- [x] Configured Netlify SPA routing for /components/* (2026-02-23)
  - Router in `src/main.tsx` strips `/components` prefix for route matching
  - `netlify.toml` redirects `/` to `/components` (301)
  - `netlify.toml` redirects `/components` and `/components/*` to `/index.html` (200)
  - Netlify env vars required: `VITE_CONVEX_URL`, `VITE_WORKOS_CLIENT_ID`, `VITE_WORKOS_REDIRECT_URI`
- [x] Slug Migration Tool for admin dashboard (2026-02-23)
  - Added `SlugMigrationPanel` component to Admin Settings tab
  - Displays count and list of packages missing URL slugs
  - "Generate All Slugs" button for bulk slug generation
  - Individual "Generate" button per package in the migration panel
  - Added `GenerateSlugButton` component to package cards (orange, next to npm/repo/demo/refresh)
  - Button only shows when package has no slug, disappears after generation
  - New backend functions: `getPackagesWithoutSlugs`, `generateSlugForPackage`, `generateMissingSlugs`
  - Added `LinkSimple` icon import from phosphor-icons
- [x] Fixed ComponentDetailsEditor reactive slug sync (2026-02-23)
  - Added `useEffect` hook to sync local slug state when `initialSlug` prop changes from backend
  - Slug now appears immediately after clicking "Generate Slug" without needing page refresh
  - Matches existing reactive behavior for thumbnail, logo, and template fields
- [x] Soft deletion workflow for components (2026-02-23)
  - Users mark components for deletion instead of immediate delete
  - Components marked for deletion are hidden from directory immediately
  - "Pending Deletion" badge shown on marked components in Profile
  - Users can cancel deletion request via "Cancel Deletion" button
  - Added schema fields: `markedForDeletion`, `markedForDeletionAt`, `markedForDeletionBy`
  - Added `by_marked_for_deletion` index on packages table
  - Updated `requestDeleteMySubmission` to mark for deletion instead of delete
  - Added `cancelDeleteMySubmission` mutation for users to undo deletion
  - Added `_permanentlyDeletePackage` internal mutation
  - Updated public queries to exclude marked-for-deletion packages
- [x] Account deletion requires deleting all components first (2026-02-23)
  - Delete Account modal shows warning if user has active submissions
  - User must delete all components before deleting their account
  - `deleteMyAccount` mutation now throws error if active submissions exist
  - Updated Account section and modal text to explain new flow
- [x] Admin Deletion Management panel in Settings (2026-02-23)
  - Added `DeletionManagementPanel` component to Admin.tsx Settings tab
  - Toggle for auto-delete marked packages (`autoDeleteMarkedPackages` setting)
  - Configurable waiting period (1, 3, 7, 14, or 30 days)
  - List of packages pending deletion with "Delete Now" button
  - Added `adminPermanentlyDeletePackage` mutation for admin manual deletion
  - Added `getPackagesMarkedForDeletion` query
  - Added `getDeletionCleanupSettings` query
  - Added `updateDeletionCleanupSetting` mutation
- [x] Admin "Marked for Deletion" filter tab (2026-02-23)
  - Added "Deletion" tab to Admin filter bar with Clock icon
  - Tab shows count of packages marked for deletion
  - Filter displays only packages with `markedForDeletion: true`
  - Package rows show red "Deletion" badge next to visibility badge when marked
  - Updated `VisibilityBadge` component to accept `markedForDeletion` prop
- [x] Updated Profile.tsx deletion badge display (2026-02-23)
  - "Pending Deletion" badge now shown next to status and visibility badges
  - Badges no longer conditionally hidden when marked for deletion
- [x] Scheduled deletion cleanup cron job (2026-02-23)
  - Added `cleanup-marked-for-deletion` cron job in `convex/crons.ts`
  - Runs daily at 2 AM UTC
  - Deletes packages past the configurable waiting period
  - Gated by `autoDeleteMarkedPackages` admin setting
  - Added `scheduledDeletionCleanup` internal mutation
- [x] Header floating pill redesign (2026-02-23)
  - Floating pill design with `rounded-full`, white/95 background, backdrop blur, and shadow
  - Convex wordmark black SVG logo (70px height)
  - Added GitHub, Discord, and Docs icons to right side of header
  - Navigation links (Directory, Submissions, Submit) with medium font weight
  - Removed user email from profile dropdown
  - Header height: 3.438rem
  - Mobile menu fixed: separate dropdown card below header pill (rounded-2xl)
- [x] SubmitForm.tsx layout improvements (2026-02-23)
  - Removed "Back to Directory" breadcrumb link
  - Moved "Submit a Component" title above the form box to match Profile.tsx style
  - Description text remains inside the form box
- [x] FAQSection component extraction and expansion (2026-02-22)
  - Extracted FAQ section from SubmitForm.tsx into reusable `src/components/FAQSection.tsx`
  - Added FAQSection to bottom of Submit.tsx (submissions directory page)
  - Expanded FAQ content with new questions:
    - How are components sandboxed?
    - Can I build my own?
    - Do components cost money to use?
  - Updated review process answer to mention rolling basis review
  - Updated requirements answer to remove demo requirement
- [x] Page layout alignment (2026-02-22)
  - Submit.tsx page width now matches Directory.tsx (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`)
  - SubmitForm.tsx page width now matches Profile.tsx (`max-w-3xl`)
  - Submit.tsx title "Components Submissions Directory" styled to match Directory.tsx
  - Search input background changed to white on Submit.tsx
- [x] Convex self-hosting integration (2026-02-22)
  - Installed `@convex-dev/self-hosting` for static file serving at `giant-grouse-674.convex.site`
  - Created `convex/convex.config.ts` to register the self-hosting component
  - Created `convex/staticHosting.ts` to expose upload APIs for the CLI
  - Updated `convex/http.ts` with `registerStaticRoutes()` (preserves existing API routes)
  - Updated `vite.config.ts` with environment-aware base path (`SELF_HOST=true` uses `/`)
  - Added `deploy` script: `SELF_HOST=true npx @convex-dev/self-hosting deploy`
  - Added `deploy:static` script: `SELF_HOST=true npx @convex-dev/self-hosting upload --build --prod`
  - Updated `files.md` with new files and modified descriptions
  - WorkOS production setup: Add `https://giant-grouse-674.convex.site/callback` to WorkOS dashboard
  - Convex production setup: Set `WORKOS_CLIENT_ID` env var in Convex dashboard
- [x] Auto sign-in redirect for `/submit` page (2026-02-22)
  - Unauthenticated users visiting `/submit` now auto-redirect to WorkOS sign-in
  - `useEffect` hook in `SubmitForm.tsx` triggers `signIn()` automatically when not authenticated
  - Stores current path in localStorage before redirect
  - `AuthCallback` reads stored path and returns user to `/submit` after auth
  - Replaced sign-in gate UI with "Redirecting to sign in..." loading spinner
- [x] Mark as read notifications (2026-02-22)
  - Added `adminHasRead` field to `packageNotes` and `packageComments` schemas
  - Admin Notes panel auto-marks user notes as read when opened
  - Admin Comments panel auto-marks comments as read when opened
  - User Profile Messages modal shows unread count and "Mark all read" button
  - Notes button shows blue badge for unread user notes (red for unreplied requests)
  - Comments button shows blue badge for unread comments
  - Added `markNotesAsReadForAdmin`, `markCommentsAsReadForAdmin` mutations
  - Added `getUnreadUserNotesCount`, `getUnreadCommentsCount` queries
- [x] Admin submitter email editor (2026-02-22)
  - Added `SubmitterEmailEditor` component in Admin panel for editing submitter emails
  - Admin can edit primary submitter email to link submissions to user accounts
  - Admin can add additional emails for multi-account access
  - Added `updateSubmitterEmail` mutation for changing primary email
  - Useful for submissions created before auth was added
- [x] Admin page UX improvements (2026-02-22)
  - Changed sign-in message from "Sign in with your @convex.dev email..." to "Admin access only"
  - Non-admin users are now automatically redirected to `/profile` instead of seeing "Access Denied"
  - Added `RedirectToProfile` component for seamless redirect with loading spinner
- [x] User profile enhancements (2026-02-22)
  - Fixed duplicate "My Submissions" title and "Submit New" button
  - Added user-controlled visibility: hide/show submissions from directory
  - Added delete submission with confirmation modal
  - Added edit submission modal (component name, description, category, tags, demo/video URLs)
  - Added additionalEmails field to schema for multi-account access
  - Updated getMySubmissions to check both submitterEmail and additionalEmails
  - Added visibility guide to status guide section
  - Users can now manage only their own submissions
- [x] Changed admin route from `/submit/admin` to `/submissions/admin` (2026-02-22)
  - Admin dashboard now accessible at `/submissions/admin`
  - Note: WorkOS JWT template must include `"email": {{ user.email }}` for admin auth to work
- [x] Fixed WorkOS AuthKit sign-in flow (2026-02-22)
  - OAuth callback component now waits for AuthKit session before redirecting to `/submit`
  - Sign-in buttons call `signIn()` directly per Convex WorkOS docs
  - Added `VITE_WORKOS_REDIRECT_URI` env variable for explicit redirect configuration
  - Removed `getSignInUrl()` workaround in favor of direct `signIn()` calls
  - Profile page sign-in now works correctly
- [x] Reorganized submission routes (2026-02-22)
  - `/submissions` = Submit.tsx (public table-based directory with Header)
  - `/submissions/admin` = Admin.tsx (requires @convex.dev email)
  - `/submit` = SubmitForm.tsx (auth-gated form)
  - Submit button on directory links to `/submit` form page
  - Added Submissions link to Header navigation

### WorkOS JWT Template Configuration Required

For admin auth to work, configure your WorkOS JWT template to include the email claim:

1. Go to WorkOS Dashboard > Authentication > Sessions > Configure JWT Template
2. Add these claims to your template:
   ```json
   {
     "email": {{ user.email }},
     "name": "{{ user.first_name }} {{ user.last_name }}"
   }
   ```
3. Save and sign out/in to get a new token

- [x] SubmitForm.tsx layout update (2026-02-22)
  - Checkboxes moved inside form, above submit button
  - Submit button disabled until all 3 checkboxes checked
  - FAQ section below form, Terms links at bottom
- [x] Refactored auth flow with shared Header component (2026-02-22)
  - Created `src/components/Header.tsx` with global navigation and user menu
  - Header displays on all pages: Directory, Submit, Profile, Admin, ComponentDetail, NotFound
  - User menu shows avatar, email, My Submissions link, Sign Out button
  - Sign In button for unauthenticated users
- [x] Submit form refactored to dedicated page (2026-02-22)
  - Replaced `Submit.tsx` modal approach with `SubmitForm.tsx` page
  - Auth gate: shows sign-in UI for unauthenticated users
  - Full form for authenticated users
  - Success modal links to profile page
- [x] WorkOS AuthKit integration replacing `@convex-dev/auth` (2026-02-22)
  - Installed `@workos-inc/authkit-react` and `@convex-dev/workos`
  - Configured `convex/auth.config.ts` with WorkOS JWT providers
  - Updated admin authorization to use `ctx.auth.getUserIdentity()`
  - Dynamic Vite base path (`/` local, `/components/` production)
- [x] User profile page at `/profile` for managing submissions (2026-02-22)
  - Lists user's submitted components with status badges
  - "Send Request" button to message admin team
  - `getMySubmissions` query and `requestSubmissionRefresh` mutation
  - `by_submitter_email` index on packages table
- [x] OAuth callback redirect to `/submit` (2026-02-22)
- [x] Add submission checklist with 3 checkboxes (FAQ, Authoring Components compliance, permission to share)
- [x] Add FAQ section to Submit page with 4 questions about review process, requirements, post-submission, and learning resources
- [x] Add Terms of Service and Privacy Policy links on Submit page
- [x] Add clear thumbnail option in admin `ComponentDetailsEditor`
- [x] Persist thumbnail removal on Save by wiring `clearThumbnail` through `updateComponentDetails`



## Components Directory Expansion (v2.0.0)

- [x] Update packages schema with directory fields (slug, category, tags, descriptions, thumbnail, author, verified)
- [x] Add new indexes (by_slug, by_category, by_category_and_visibility)
- [x] Add badgeFetches table for badge analytics
- [x] Build public queries (listApprovedComponents, getComponentBySlug, listCategories, getFeaturedComponents)
- [x] Build admin mutation (updateComponentDetails)
- [x] Build thumbnail upload mutations (generateUploadUrl, saveThumbnail)
- [x] Build autoFillAuthorFromRepo mutation
- [x] Build internal queries (\_getPackageBySlug, \_recordBadgeFetch, getBadgeStats)
- [x] Restructure frontend into src/pages/ and src/components/
- [x] Update client-side router for /, /submit, /submit/admin, /:slug routes
- [x] Build Directory.tsx page with search, sort, categories, featured section
- [x] Build ComponentDetail.tsx page with sidebar + content layout
- [x] Build ComponentCard.tsx, CategorySidebar.tsx, SearchBar.tsx, VerifiedBadge.tsx, InstallCommand.tsx
- [x] Build ComponentDetailsEditor.tsx for admin
- [x] Create categories.ts, slugs.ts, seo.ts lib files
- [x] Add dynamic SVG badge HTTP endpoint (/api/badge)
- [x] Add markdown HTTP endpoint (/api/markdown) for agents and LLMs
- [x] Add Share dropdown with View as Markdown, Copy as Markdown, Copy page URL
- [x] Add markdown source view with copy button
- [x] Update submission form with category, descriptions, tags, video URL, thumbnail upload
- [x] Auto-open submit modal from directory sidebar link
- [x] Add admin thumbnail preview in package list
- [x] Fix slug 404 for admin-created slugs (relaxed visibility check)
- [x] Fix auto-fill to update UI instantly without manual toggle
- [x] Fix Back to Components trailing slash
- [x] Remove invalid border-border-primary classes
- [x] Update dropdown styling to match design system
- [x] Move verified badge below downloads in cards
- [x] Redesign component detail page layout (sidebar left, content right)
- [x] Link authorUsername to GitHub profile
- [x] Make thumbnail half-width and left-aligned
- [x] Left-align badge snippet section
- [x] Rename Copy page to Share
- [x] Set Vite base path to /components/
- [x] Build seed script for existing components
- [x] Update files.md with all new files
- [x] Update changelog.md with v2.0.0 entry
- [x] Update task.md with directory expansion tasks

## Previous Tasks

- [x] Update README.md to focus on Convex Components Challenge
- [x] Switch to WorkOS AuthKit (completed 2026-02-22)
- [x] Change submit button back to DF5D34
- [x] Add link to demo app on form and admin
- [x] Remove open graph url link
- [x] Push to GitHub
- [x] Add submit collects users names and email and Convex Discord name
- [x] Admin sees name and admin Convex Discord name
- [x] Add About modal with app description and status legend
- [x] Add Featured status for packages
- [x] Add Status legend bar above footer
- [x] Remove login/signup from frontend header
- [x] Add AI Review feature for validating Convex components
- [x] Update changelog.md with correct dates from git history
- [x] Update files.md with current file descriptions
- [x] Run TypeScript type checks
- [x] Verify build readiness
- [x] Add refresh NPM data button
- [x] Streamline frontend layout for iframe embedding
- [x] Move toolbar controls above package listing
- [x] Update modals to open at top of page
- [x] Simplify Admin page header
- [x] Move Admin status legend below Stats section
- [x] Fix external links to open in new tabs in iframes
- [x] Fix success modal display after submission
- [x] Add email privacy notice to submit form
- [x] Security fix: Strip PII from public queries
- [x] Security fix: Exclude AI review details from public responses
- [x] Security fix: Create internal queries for backend operations
- [x] Security fix: Rename reviewerEmail to reviewedBy
- [x] Updated sec-check.mdc with RLS patterns
- [x] Added AI-Assisted Development Security section
- [x] Added Convex Auth Token Security section
- [x] Added Dependency and Supply Chain Security section
- [x] Enhanced security checklist

## Review Status Flow

1. New submissions are marked as "pending" by default and visible on the frontend
2. Admins can change status to: pending, in_review, approved, changes_requested, rejected
3. Admins can change visibility to: visible, hidden, archived
4. Only hidden and archived packages are excluded from the public frontend
5. Only approved packages can be marked as "Featured"
6. Featured packages show a star icon and are highlighted on convex.dev/components

## AI Review Flow

1. Admin clicks "AI Review" button on a package (requires GitHub repository URL)
2. System fetches source code from GitHub (convex.config.ts + component files)
3. Claude analyzes code against 9 Convex component criteria
4. Results show passed/failed/partial status with detailed notes
5. Auto-approve triggers if all criteria pass (when enabled)
6. Auto-reject triggers if critical criteria fail (when enabled)

-

## Prod release checklist for directory sort refresh

- [ ] Confirm local changes are merged and pushed
- [ ] Deploy backend and frontend
  - `npx convex deploy`
  - `npm run build` (or your normal frontend deploy flow)
- [ ] Run one time production backfill
  - `npx convex run packages:backfillPackageReliabilityFields '{}' --prod`
- [ ] Verify production data paths
  - Directory sort `Newest` uses newest approved order
  - `Most downloads` and `Recently updated` still sort correctly
  - Rating sort still works with unrated items at the bottom
- [ ] Verify admin behavior
  - Approving a package sets `approvedAt`
  - New submissions default to pending and visible
  - Auto refresh panel still works as expected
- [ ] Spot check 3 to 5 legacy packages for safe defaults
  - `reviewStatus`
  - `visibility`
  - `submittedAt`
  - `weeklyDownloads`
  - `lastPublish`
- [ ] Monitor logs for 10 to 15 minutes after release
