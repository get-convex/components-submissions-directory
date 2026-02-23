# Files Overview

This document provides a brief description of each file in the codebase and how it works.

## Root Configuration Files

### `package.json`

Defines project dependencies, scripts, and metadata. Includes React, Convex, Vite, TypeScript, `@convex-dev/self-hosting`, and development tools. Key scripts:
- `dev`: Parallel dev server (frontend + backend)
- `build`: Production build for Netlify/Vercel
- `deploy`: One-shot deploy to Convex self-hosting (backend + static files)
- `deploy:static`: Upload static files only to Convex storage

### `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

TypeScript configuration files for different parts of the project. `tsconfig.json` is the base config, `tsconfig.app.json` is for the React app, and `tsconfig.node.json` is for Node.js tooling.

### `vite.config.ts`

Vite build configuration. Sets up React plugin, path aliases, and environment-aware base path:
- `SELF_HOST=true`: Uses `/` for deployment at `giant-grouse-674.convex.site`
- Production (`npm run build`): Uses `/components/` for Netlify/Vercel deployment
- Development (`npm run dev`): Uses `/` for local development at `localhost:5173`

### `tailwind.config.js`

Tailwind CSS configuration with custom design system colors and theme settings. Defines color palette for the app's black and white design aesthetic.

### `eslint.config.js`

ESLint configuration with TypeScript support, React hooks rules, and relaxed settings for Convex development patterns.

### `postcss.config.cjs`

PostCSS configuration for processing Tailwind CSS.

### `components.json`

shadcn/ui component library configuration. Defines style preferences, aliases, and component paths.

### `.gitignore`

Git ignore patterns for node_modules, dist, build artifacts, and editor files.

### `index.html`

Main HTML entry point. Loads the React app and CSS. Includes Open Graph meta tags for social sharing.

## Convex Backend Files

### `convex/schema.ts`

Database schema definition. Defines the `packages` table with all package fields including slug, category, tags, shortDescription, longDescription, videoUrl, thumbnailUrl, thumbnailStorageId, logoStorageId, logoUrl, selectedTemplateId, thumbnailGenerationVersion, thumbnailGeneratedAt, thumbnailGeneratedBy, convexVerified, authorUsername, authorAvatar, relatedComponentIds, submitter information (submitterName, submitterEmail, submitterDiscord, additionalEmails for multi-account access), review status, visibility, featured flag, demoUrl, AI review fields, cached GitHub issue counts, and AI-generated SEO/AEO/GEO fields. Also defines `packageNotes` (with isAdminReply and userHasRead for notification tracking), `packageComments`, `adminSettings`, `badgeFetches`, `thumbnailTemplates`, and `thumbnailJobs` tables.

### `convex/auth.ts`

Authentication helpers using WorkOS AuthKit. Exports `loggedInUser` query, `isAdmin` query, and admin identity helpers (`requireAdminIdentity`, `getAdminIdentity`) for checking `@convex.dev` email addresses.

### `convex/auth.config.ts`

Auth configuration file for WorkOS AuthKit JWT validation. Configures custom JWT providers with WorkOS issuer and JWKS endpoints.

### `convex/aiReview.ts`

AI-powered package review system. Contains review criteria, GitHub repo fetcher with monorepo support, and `runAiReview` action using Anthropic Claude API.

### `convex/packages.ts`

Main package business logic. Contains:

**Internal Queries:** `_getPackage`, `_getPackageByName`, `_getPackageBySlug` (for badge/markdown endpoints)

**Public Queries:** `listPackages`, `searchPackages`, `getPackage`, `getPackageByName`, `listApprovedComponents`, `getComponentBySlug`, `getMySubmissions`, `listCategories`, `getFeaturedComponents`

**User Mutations:** `requestSubmissionRefresh` (sends note to admin team from profile page), `setMySubmissionVisibility` (hide/show own submissions), `requestDeleteMySubmission` (delete own submission), `updateMySubmission` (edit own submission fields)

**User Queries:** `getMyPackageNotes` (thread of user requests and admin replies), `getMySubmissionForEdit` (editable submission data), `getUnreadAdminReplyCount`, `getTotalUnreadAdminReplies`

**Admin Queries:** `getAllPackages`, `adminSearchPackages`, `getPackagesByStatus`, `getBadgeStats`

**Actions:** `fetchNpmPackage`, `refreshNpmData`, `submitPackage`, `fetchGitHubIssues`, `refreshGitHubIssueCounts`

**Mutations:** `addPackage`, `updateNpmData`, `updateReviewStatus`, `updateVisibility`, `deletePackage`, `toggleFeatured`, `updateComponentDetails` (supports `clearThumbnail` to remove thumbnail URL and storage reference), `generateUploadUrl`, `saveThumbnail`, `saveLogo` (uploads logo and triggers auto thumbnail generation if enabled), `autoFillAuthorFromRepo`, `updateSubmitterEmail` (admin: change primary email), `updateAdditionalEmails` (admin: manage multi-account access), `markNotesAsReadForAdmin`, `markCommentsAsReadForAdmin`, note/comment/settings mutations

**Admin Queries:** `getUnreadUserNotesCount`, `getUnreadCommentsCount` (for read tracking badges)

**Helper Functions:** `toPublicPackage()`, `toAdminPackage()`, `generateSlugFromName()`, `userOwnsPackage()` (checks submitterEmail and additionalEmails), validators

### `convex/seed.ts`

Seed script (`seedExistingComponents` internal action) for migrating existing component data into the packages table. Fetches npm data, generates slugs, sets categories, and upserts into the database.

### `convex/thumbnails.ts`

Thumbnail template management and generation API. Contains admin CRUD mutations for background templates (create, update, delete, reorder, set default), internal queries/mutations for logo and template data, thumbnail job tracking, and a cleanup job for failed jobs. All queries and mutations run in the default Convex runtime.

### `convex/thumbnailGenerator.ts`

Node.js action module for composing 16:9 thumbnails. Uses Jimp for raster image composition and @resvg/resvg-wasm for SVG to PNG conversion. Contains `generateThumbnailForPackage` (admin-triggered), `_autoGenerateThumbnail` (submit flow), `regenerateAllThumbnails` (batch), and `_autoGenerateThumbnailWithTemplate` (batch per-package). Runs in Node.js runtime.

### `convex/seoContent.ts`

AI-generated SEO/AEO/GEO content action using Anthropic Claude. Contains `generateSeoContent` internal action and `regenerateSeoContent` public action. Builds structured prompts from component data and parses Claude responses into value props, benefits, use cases, FAQ, and resource links. Runs in Node.js runtime.

### `convex/seoContentDb.ts`

Internal mutations for persisting AI-generated SEO content. Separated from `seoContent.ts` because Convex mutations cannot live in `"use node"` files. Contains `_saveSeoContent`, `_updateSeoStatus`, and `_setSeoError`.

### `convex/router.ts`

HTTP router configuration. Defines:
- `/api/export-csv` endpoint for CSV export of all packages
- `/api/badge` endpoint for dynamic SVG badge generation with analytics tracking
- `/api/markdown` endpoint serving raw markdown (`Content-Type: text/markdown`) for component data, enhanced with AI-generated SEO sections
- `/api/llms.txt` endpoint serving a plain-text index of all approved components for AI agent discovery

### `convex/http.ts`

Main HTTP router with all API endpoints and static file serving. Defines:
- `/api/export-csv` endpoint for CSV export of all packages
- `/api/badge` endpoint for dynamic SVG badge generation with analytics tracking
- `/api/markdown` endpoint serving raw markdown for component data
- `/api/llms.txt` endpoint serving a plain-text index of all approved components
- Static file routes via `@convex-dev/self-hosting` for serving the React app at `.convex.site`

### `convex/convex.config.ts`

Convex app configuration file that registers the self-hosting component for static file serving.

### `convex/staticHosting.ts`

Exposes internal upload APIs and deployment query for the self-hosting component. Used by the CLI to upload built static files to Convex storage.

### `convex/tsconfig.json`

TypeScript config for Convex functions.

### `convex/_generated/`

Auto-generated files by Convex: `api.d.ts`, `api.js`, `dataModel.d.ts`, `server.d.ts`, `server.js`.

## Frontend Source Files

### `src/main.tsx`

Application entry point. Sets up Convex React client with WorkOS AuthKit (`AuthKitProvider` and `ConvexProviderWithAuthKit`). Uses env variables `VITE_WORKOS_CLIENT_ID` and `VITE_WORKOS_REDIRECT_URI` for auth configuration. Pathname-based routing:
- `/` = Directory (approved components, public)
- `/submissions` = Submit.tsx (submissions directory with table view, public)
- `/submissions/admin` = Admin.tsx (requires @convex.dev email)
- `/submit` = SubmitForm.tsx (auto sign-in redirect for unauthenticated users)
- `/profile` = Profile.tsx (user's submissions, auth required)
- `/callback` = OAuth callback handler (reads `authReturnPath` from localStorage to redirect after auth)
- `/:slug` = ComponentDetail (public)

### `src/components/Header.tsx`

Shared header component with auth state management. Uses `useConvexAuth()` for auth state and `useAuth()` from WorkOS for user data and sign in/out. Features:
- Floating pill design with `rounded-full`, white/95 background, backdrop blur, and shadow
- Convex wordmark logo (black SVG, 70px height)
- Navigation links (Directory, Submissions, Submit) with medium font weight
- Social icons (GitHub, Discord) and Docs icon linking to external resources
- User menu with avatar, My Submissions link, and Sign Out button
- Sticky positioning with top padding for floating effect
- Mobile responsive with separate dropdown menu card (rounded-2xl) below header pill
- Header height: 3.438rem

### `src/components/FAQSection.tsx`

Reusable FAQ section component extracted from SubmitForm.tsx. Displays frequently asked questions about component submissions with expandable answers covering:
- Component sandboxing and data isolation
- Submission review process (rolling basis review)
- Requirements for submission
- Building custom components
- Updating submissions via profile page
- Component pricing (open source, usage-based)
- Links to documentation resources

### `src/App.tsx`

Main package submission interface. Compact toolbar, package submission form, search, sort, package card list, modals, and mobile responsive design.

### `src/pages/Directory.tsx`

Component directory listing page at `/components/`. Features shared Header component, search, sort, category sidebar, featured section, component cards grid, and submit link. No auth required to view.


### `src/pages/SubmitForm.tsx`

Dedicated component submission form page at `/submit`. Features:
- Shared Header component with auth state
- Page layout matching Profile.tsx width (`max-w-3xl`)
- Auto sign-in redirect: unauthenticated users are automatically redirected to WorkOS sign-in via `useEffect` hook
- Stores return path in localStorage before redirect; `AuthCallback` returns user to `/submit` after auth
- For unauthenticated users: shows "Redirecting to sign in..." loading state
- For authenticated users:
  - Full submission form with all fields
  - 3 checkboxes at bottom of form (FAQ read, guidelines compliance, permission to share)
  - Submit button disabled until all 3 checkboxes are checked
  - FAQSection component below form
  - Terms of Service and Privacy Policy links at bottom
- Form collects: component name, GitHub repo, npm URL, demo URL, category, descriptions, tags, video URL, logo upload, submitter info
- Success/error modals with links to profile page

### `src/pages/Submit.tsx`

Public submissions directory at `/submissions`. Table-based UI showing all submitted components with expandable rows. Features:
- Shared Header component with auth state
- Page layout matching Directory.tsx width (`max-w-7xl`)
- Title "Components Submissions Directory" styled to match Directory page
- Search and sort controls with white background search input
- Expandable package rows with install command, license, size, files, maintainers
- npm/Repo/Website/Demo action buttons per package
- Status badges (pending, in review, approved, changes requested, rejected)
- Submit button links to `/submit` (auth-gated form page)
- About modal with status legend
- FAQSection component at bottom of page

### `src/pages/Profile.tsx`

User profile page for managing submitted components. Accessible at `/profile`. Features:
- Shared Header component with auth state
- Sign-in gate for unauthenticated users with Sign In button calling `signIn()` directly
- Lists all components submitted by the authenticated user (via submitterEmail or additionalEmails)
- Shows review status (pending, in_review, approved, changes_requested, rejected) and visibility badges
- "Send Request" button to send notes to admin team (request re-review, removal, or updates)
- "View Notes" modal showing threaded admin replies with notification badge for unread replies
- "Edit" button to update submission details (name, descriptions, category, tags, URLs)
- "Hide/Show" toggle to control visibility in the directory with confirmation
- "Delete" button to remove submission completely with confirmation
- Links to view approved components
- Status guide explaining each review state with visibility guide (Visible, Hidden, Archived)
- Submit New button linking to submission form

### `src/pages/Admin.tsx`

Admin dashboard at `/submissions/admin` (requires @convex.dev email). Features shared Header component, admin-specific search bar, stats, package management, review status, visibility controls, AI review, component details editor, thumbnail preview in list, notes, comments, CSV export, and SubmitterEmailEditor for managing primary submitter email and additional emails. Non-admin users are automatically redirected to their profile page. Unauthenticated users see a simple "Admin access only" sign-in prompt.

### `src/pages/NotFound.tsx`

404 page component with shared Header and navigation back to directory.

### `src/pages/ComponentDetail.tsx`

Component detail page at `/components/:slug`. Features shared Header component, narrow sidebar (left) with npm link, category, stats, verified badge, source link, Share dropdown, and Back link. Main area (right) with author, title, install command, GitHub issues tab, AI-generated SEO content layer, rendered long description, video embed, tags, and README badge snippet. Includes dual JSON-LD structured data for SEO.

### `src/components/ComponentCard.tsx`

Component card for directory listing. Shows thumbnail, name, description, downloads, version, verified badge.

### `src/components/CategorySidebar.tsx`

Category filter sidebar for the directory page.

### `src/components/SearchBar.tsx`

Reusable search input with clear button.

### `src/components/VerifiedBadge.tsx`

Reusable "Convex Verified" badge component.

### `src/components/InstallCommand.tsx`

Copy-to-clipboard install command component.

### `src/components/ComponentDetailsEditor.tsx`

Admin editor for directory-specific fields: slug, category, tags, descriptions, video URL, verified badge, featured status, thumbnail upload with preview, thumbnail clear option (applies after Save), auto-fill author from GitHub, and AI SEO content generation trigger with status display.

### `src/lib/categories.ts`

Static category definitions and `getCategoryLabel` helper.

### `src/lib/slugs.ts`

Client-side slug generation and parsing utilities for URL-safe component slugs.

### `src/lib/seo.ts`

Client-side utilities to manage document title, meta description, Open Graph tags, JSON-LD structured data injection, and `buildComponentJsonLd()` helper that creates a dual `@graph` schema combining SoftwareSourceCode and FAQPage for SEO/AEO/GEO.

### `src/Admin.tsx`

Legacy admin file (re-exports from pages/Admin.tsx or contains full admin logic).

### `src/SignOutButton.tsx`

Sign-out button component using WorkOS AuthKit `signOut()`.

### `src/index.css`

Global CSS with Tailwind directives and design system variables.

### `src/lib/utils.ts`

Utility functions including `cn` for Tailwind class merging.

### `src/vite-env.d.ts`

TypeScript declarations for Vite environment variables.

## Build Output

### `dist/`

Production build output directory.

### `node_modules/`

NPM package dependencies. Not tracked in git.

## Development Files

### `setup.mjs`

Setup script for initial project configuration.

### `README.md`

Convex Components Challenge documentation.

### `files.md`

This file. Overview of all files in the codebase.

### `changelog.md`

Changelog tracking features and changes over time.

### `task.md`

Task list for tracking project progress and completed features.

### `prds/`

Product requirements documents:
- `architecture-overview.md`: Comprehensive architecture documentation with mermaid diagrams showing user flows, admin flows, AI integration, auth, and database schema
- `aicheck.md`: AI Review feature specification
- `howitworks.md`: Technical documentation for data fetching, AI review process
- `nowriteconflicts.md`: Guidelines for preventing Convex write conflicts
- `token-based-auth-checks.md`: Token-based authentication guidelines
- `env-deploy-fix.md`: Environment and deployment configuration
- `2026-02-22-workos-auth-issues.md`: WorkOS AuthKit integration issues and solutions including JWT claims, dual provider config, callback timing, admin checks, and environment setup
- `user-profile-enhancements.md`: User profile features including hide/show/delete submissions, edit modal, multi-account access via additionalEmails, and admin email editor

### `.cursor/rules/`

Cursor rules for development guidelines including `sec-check.mdc`, `dev2.mdc`, `help.mdc`, `gitrules.mdc`, `convex2.mdc`, `rulesforconvex.mdc`.

### `.cursor/plans/`

Plan documents including `components_directory_expansion_dd445bcc.plan.md` for the full directory expansion project.
