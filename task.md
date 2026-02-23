# Task List

## to do
- [ ] check url slug, 
- [ ] vercel.json in website can point to repo app
- [ ] package name is slug
- [ ] give package name read https://www.npmjs.com/package/

- [ ]  fix ai check
- docs for badges
- add image builder
- [ ] add image builder from https://component-thumbnail-gen.netlify.app/ and https://github.com/waynesutton/component-directory-image-generator

- [ ] add incre
- header and footer
- [ ] fix font colros a
- [ ] npm run typecheck
- [ ] add fonts
- [ ] add plugin
- [ ] prod checklist
- [ ] tailwind css form github
- [ ] iimport exiting compons
- [ ] - [ ] add payments api

## Recent updates

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
