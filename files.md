# Files Overview

This document provides a brief description of each file in the codebase and how it works.

## Root Configuration Files

### `package.json`

Defines project dependencies, scripts, and metadata. Includes React, Convex, Vite, TypeScript, WorkOS Connect integration utilities, and development tools. Key scripts:
- `dev`: Parallel dev server (frontend + backend)
- `build`: Production build for Netlify
- `deploy:backend`: Deploy Convex backend only (`npx convex deploy`)

Key auth dependencies: `@convex-dev/workos` for Convex auth bridging with a custom Connect OAuth provider.

### `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

TypeScript configuration files for different parts of the project. `tsconfig.json` is the base config, `tsconfig.app.json` is for the React app, and `tsconfig.node.json` is for Node.js tooling.

### `vite.config.ts`

Vite build configuration. Sets up React plugin, path aliases, and base path `/` for Netlify hosting. Assets are served from root, SPA routing is handled by Netlify redirects.

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

### `netlify.toml`

Netlify deployment configuration. Sets build command (`npm run build`), publish directory (`dist`), Node version (20), and redirects:
- Root `/` redirects to `/components` (301)
- Main LLMs.txt and Markdown proxies to Convex HTTP endpoints:
  - `/components/llms.txt` -> `/api/llms.txt`
  - `/components.md` -> `/api/markdown-index`
  - `/components/*/llms.txt` -> `/api/component-llms?slug=:splat` (single and scoped slugs)
- `/components` and `/components/*` fall back to `/index.html` for SPA routing (200)
- Edge Function mapping:
  - `/components/*` -> `netlify/edge-functions/og-meta.ts` (injects component-specific OG meta tags into SPA HTML for all requests)
  - `/components/*/*.md` -> `netlify/edge-functions/component-markdown.ts` (keeps Netlify URL, proxies markdown by slug)

Environment variables must be set in Netlify Dashboard:
- `VITE_CONVEX_URL`: Convex deployment URL
- `VITE_WORKOS_CLIENT_ID`: WorkOS Connect OAuth client id for the frontend
- `VITE_WORKOS_REDIRECT_URI`: Callback URL under `/components/callback`
- `VITE_WORKOS_AUTHKIT_DOMAIN`: WorkOS auth domain used for `/oauth2/authorize` and `/oauth2/token`

Environment variables must be set in Convex Dashboard:
- `WORKOS_CLIENT_ID`: WorkOS client id used for JWT provider config
- `WORKOS_AUTHKIT_DOMAIN`: WorkOS auth domain used as issuer and JWKS host
- Local `.env.local` should mirror the same Connect values as frontend build vars.

### `index.html`

Main HTML entry point. Loads the React app and CSS. Includes Open Graph meta tags for social sharing.

## Convex Backend Files

### `convex/schema.ts`

Database schema definition. Defines the `packages` table with all package fields including slug, category, tags, shortDescription, longDescription, videoUrl, thumbnailUrl, thumbnailStorageId, hideThumbnailInCategory (controls thumbnail visibility in category listings vs Featured section), hideFromSubmissions (hides from Submit.tsx page only, not Directory), logoStorageId, logoUrl, selectedTemplateId, thumbnailGenerationVersion, thumbnailGeneratedAt, thumbnailGeneratedBy, convexVerified, communitySubmitted (marks community-built components), authorUsername, authorAvatar, relatedComponentIds, submitter information (submitterName, submitterEmail, submitterDiscord, additionalEmails for multi-account access), review status, visibility, featured flag, featuredSortOrder (admin-managed numeric order for Featured section display), demoUrl, AI review fields, cached GitHub issue counts, AI-generated SEO/AEO/GEO fields, skillMd (AI-generated SKILL.md content for Claude agent skills), and soft deletion fields (markedForDeletion, markedForDeletionAt, markedForDeletionBy). Also defines `packageNotes` (admin-only internal notes) and `packageComments` (private submitter/admin message thread with read state and status lifecycle fields), plus `adminSettings`, `adminSettingsNumeric`, `badgeFetches`, `thumbnailTemplates`, `thumbnailJobs`, `aiProviderSettings` (API keys and models for Anthropic, OpenAI, Gemini), `aiPromptVersions` (versioned AI review prompts), `seoPromptVersions` (versioned SEO/SKILL.md generation prompts), and `mcpApiLogs` (MCP API request logging for monitoring) tables. Search indexes include `search_name`, `search_description`, `search_maintainers`, `search_componentName`, and `search_repositoryUrl` for admin full-text search.

### `src/pages/SubmitForm.tsx`

Public component submission form. Collects package name, npm URL, category, short description, long description (markdown with 500 char limit and live preview), tags, video URL):
- Markdown preview supports headings, bullet/numbered lists, line breaks, and links (purple `#8D2676` hover underline)
- Character counter shows `{n}/500 characters`
- Preview conditionally renders only when content is entered
- Live Demo URL field label reads "Live Demo URL or Example App"

### `convex/auth.ts`

Authentication and admin helper utilities based on `ctx.auth.getUserIdentity()`. Exposes `loggedInUser` and `isAdmin` queries plus `requireAdminIdentity` and `getAdminIdentity` helpers that enforce `@convex.dev` admin access using email claims from WorkOS JWTs.

### `convex/auth.config.ts`

JWT provider configuration for WorkOS Connect token validation. Uses `WORKOS_CLIENT_ID` and `WORKOS_AUTHKIT_DOMAIN` with a `customJwt` provider (`issuer=https://<domain>`, `jwks=https://<domain>/oauth2/jwks`).

### `convex/aiReview.ts`

AI-powered package review system (v2). Contains review criteria, GitHub repo fetcher with monorepo support, and `runAiReview` action. Supports multiple AI providers (Anthropic Claude, OpenAI GPT, Google Gemini) via the `callAiProvider` helper function. Provider selection uses runtime failover: active admin provider first, then backup admin providers, then environment providers (ANTHROPIC_API_KEY, CONVEX_OPENAI_API_KEY, optional Gemini env key). Uses custom prompts from `aiPromptVersions` table when configured. Shares the same failover and provider configuration as `seoContent.ts` for consistent AI behavior across all features.

Review criteria (v2) clarifies: only exported query/mutation/action need `returns` validators (not helper functions), functions intentionally in public API should NOT use `internal*`, and components cannot use `ctx.auth` so must use token or auth callback patterns.

### `convex/aiSettings.ts`

AI provider and prompt management. Contains:
- `getAiProviderSettings`: Query to get configured providers (masks API keys for security)
- `updateAiProviderSettings`: Mutation to save provider API key and model
- `clearProviderSettings`: Mutation to remove custom settings and revert to env vars
- `getDefaultPrompt`: Query to get the default AI review prompt
- `getActivePrompt`: Query to get current active AI review prompt (custom or default)
- `getPromptVersions`: Query to list AI review prompt version history
- `savePromptVersion`: Mutation to save new AI review prompt version
- `activatePromptVersion`: Mutation to restore a previous AI review prompt version
- `resetToDefaultPrompt`: Mutation to revert to default AI review prompt
- `getSeoDefaultPrompt`: Query to get the default SEO/SKILL.md prompt
- `getSeoActivePrompt`: Query to get current active SEO prompt (custom or default)
- `getSeoPromptVersions`: Query to list SEO prompt version history
- `saveSeoPromptVersion`: Mutation to save new SEO prompt version
- `activateSeoPromptVersion`: Mutation to restore a previous SEO prompt version
- `resetSeoToDefaultPrompt`: Mutation to revert to default SEO prompt
- Internal queries for aiReview action: `_getActiveProviderSettings`, `_getActivePromptContent`
- Internal query for runtime provider failover: `_getProviderSettingsForFallback`
- Internal queries for seoContent action: `_getSeoActivePromptContent`

### `convex/aiProviderFallback.ts`

Shared provider failover utilities for AI actions. Builds an ordered provider candidate chain from admin settings and environment variables, de-duplicates candidates, and executes sequential fallback attempts until one provider succeeds or all fail with an aggregated error. Used by both `convex/aiReview.ts` and `convex/seoContent.ts`.

### `convex/packages.ts`

Main package business logic. Contains:

**Internal Queries:** `_getPackage`, `_getPackageByName`, `_getPackageBySlug` (for badge/markdown endpoints). Internal queries omit `returns:` validators per Convex best practices (TypeScript inference suffices for non-client-facing functions).

**Public Queries:** `listPackages`, `searchPackages`, `getSubmitPackagesPage`, `searchSubmitPackagesPage`, `getSubmitPageSizeSetting`, `getPackage`, `getPackageByName`, `listApprovedComponents` (includes `verified` sort mode), `getComponentBySlug`, `getRelatedComponents`, `getMySubmissions`, `listCategories` (includes total `count` and `verifiedCount` per category), `getFeaturedComponents`, `getPackagesMarkedForDeletion`, `getDeletionCleanupSettings`

**User Mutations:** `requestSubmissionRefresh` (sends private message to admin team from profile page), `setMySubmissionVisibility` (hide/show own submissions), `requestDeleteMySubmission` (marks submission for deletion), `cancelDeleteMySubmission` (cancels deletion request), `updateMySubmission` (edit own submission fields), `deleteMyAccount` (requires no active submissions)

**User Queries:** `getMyPackageNotes` (private user/admin message thread for a submission, with optional inactive-message visibility), `getMySubmissionForEdit` (editable submission data), `getUnreadAdminReplyCount`, `getTotalUnreadAdminReplies`

**Admin Queries:** `getAllPackages`, `adminSearchPackages` (searches name, description, maintainerNames, componentName, and repositoryUrl), `getPackagesByStatus`, `getBadgeStats`, `getUnreadUserNotesCount`, `getUnreadCommentsCount` (for read tracking badges), `getPackagesWithoutSlugs`, `getSubmitPageSizeAdminSetting`

**Admin Mutations:** `adminPermanentlyDeletePackage`, `updateDeletionCleanupSetting`, `updateSubmitPageSizeSetting`, `generateSlugForPackage`, `generateMissingSlugs`

**Internal Mutations:** `_permanentlyDeletePackage`, `scheduledDeletionCleanup`

**Actions:** `fetchNpmPackage`, `refreshNpmData`, `submitPackage`, `fetchGitHubIssues`, `refreshGitHubIssueCounts`

**Mutations:** `addPackage`, `updateNpmData`, `updateReviewStatus`, `updateVisibility`, `deletePackage`, `toggleFeatured`, `setFeaturedSortOrder` (admin: set numeric order for Featured section), `toggleHideFromSubmissions` (admin: hide from Submit.tsx but not Directory), `updateComponentDetails` (supports `clearThumbnail` to remove thumbnail URL and storage reference), `generateUploadUrl`, `saveThumbnail`, `saveLogo` (uploads logo and triggers auto thumbnail generation if enabled), `clearLogo` (removes logo URL and storage reference), `autoFillAuthorFromRepo`, `updateSubmitterEmail` (admin: change primary email), `updateAdditionalEmails` (admin: manage multi-account access), `updatePackageCommentStatus` (message hide/archive/restore lifecycle), `markNotesAsReadForAdmin`, `markCommentsAsReadForAdmin`, note/comment/settings mutations

**Helper Functions:** `toPublicPackage()`, `toAdminPackage()`, `generateSlugFromName()`, `userOwnsPackage()` (checks submitterEmail and additionalEmails), `getCurrentUserEmail()` (reads identity email claims), validators

### `convex/crons.ts`

Scheduled cron jobs for background tasks:
- `check-and-refresh-packages`: Daily at 3 AM UTC, checks for stale packages to refresh npm data
- `cleanup-old-thumbnail-jobs`: Weekly on Sundays at 4 AM UTC, removes failed thumbnail jobs
- `cleanup-marked-for-deletion`: Daily at 2 AM UTC, permanently deletes packages past the waiting period (configurable via admin settings)

### `convex/seed.ts`

Seed script for importing official Convex components from convex.dev/components. Contains `seedOfficialComponents` internal action with support for:
- `importAsPending: boolean` flag to control whether new components enter as "pending" (for admin review) or "approved"
- `dryRun: boolean` flag to preview what would be imported without making changes
- Fetches live npm data for each component
- Uses existing `by_name` index for duplicate detection
- Preserves existing `reviewStatus` on updates, only sets new status on inserts
- Legacy `seedExistingComponents` alias for backward compatibility

Run via CLI: `npx convex run seed:seedOfficialComponents '{"importAsPending": true}'`
Production: `npx convex run --prod seed:seedOfficialComponents '{"importAsPending": true}'`

### `convex/thumbnails.ts`

Thumbnail template management and generation API. Contains admin CRUD mutations for background templates (create, update, delete, reorder, set default), internal queries/mutations for logo and template data, thumbnail job tracking, and a cleanup job for failed jobs. Internal mutations omit `returns:` validators per Convex best practices (TypeScript inference suffices). All queries and mutations run in the default Convex runtime.

### `convex/thumbnailGenerator.ts`

Node.js action module for composing 16:9 thumbnails. Uses Jimp for raster image composition and @resvg/resvg-wasm for SVG to PNG conversion. Contains `generateThumbnailForPackage` (admin-triggered), `_autoGenerateThumbnail` (submit flow), `regenerateAllThumbnails` (batch), and `_autoGenerateThumbnailWithTemplate` (batch per-package). Runs in Node.js runtime.

### `convex/seoContent.ts`

AI-generated SEO/AEO/GEO content action supporting multiple AI providers. Contains `generateSeoContent` internal action and `regenerateSeoContent` public action. Supports custom prompts from database with fallback to hardcoded default. Supports Anthropic Claude, OpenAI GPT, and Google Gemini with runtime failover across admin settings and environment variables (ANTHROPIC_API_KEY, CONVEX_OPENAI_API_KEY, optional Gemini env key). Builds structured prompts from component data using placeholder substitution and parses AI responses into value props, benefits, use cases, FAQ, and resource links. Generates SKILL.md content for AI agent integration using the `buildSkillMd()` and `buildTriggerContexts()` helper functions following Anthropic skill creator guidelines: "pushy" description fields with dynamic trigger contexts from category/tags/use cases, imperative instructions, and "When NOT to use" section to prevent over-triggering. Runs in Node.js runtime.

### `convex/seoContentDb.ts`

Internal mutations for persisting AI-generated SEO content. Separated from `seoContent.ts` because Convex mutations cannot live in `"use node"` files. Contains `_saveSeoContent` (saves SEO fields and SKILL.md content), `_updateSeoStatus`, and `_setSeoError`. Internal mutations omit `returns:` validators per Convex best practices (TypeScript inference suffices for non-client-facing functions).

### `convex/router.ts`

HTTP router configuration. Defines:
- `/api/export-csv` endpoint for CSV export of all packages
- `/api/badge` endpoint for dynamic SVG badge generation with analytics tracking
- `/api/markdown` endpoint serving raw markdown (`Content-Type: text/markdown`) for component data, enhanced with AI-generated SEO sections
- `/api/llms.txt` endpoint serving a plain-text index of all approved components for AI agent discovery

### `convex/http.ts`

Main HTTP router with all API endpoints. Defines:
- `/api/export-csv` endpoint for CSV export of all packages
- `/api/badge` endpoint for dynamic SVG badge generation with analytics tracking
- `/api/markdown?slug=<slug>` endpoint serving raw markdown for a single component
- `/api/markdown-index` endpoint serving markdown listing of all approved components (includes MCP capability section)
- `/api/llms.txt` endpoint serving a plain-text index of all approved components (includes MCP capability section)
- `/api/component-llms?slug=<slug>` endpoint serving llms.txt format for a single component
- Read-only REST MCP API endpoints (JSON responses):
  - `/api/mcp/search`: Search components with pagination (query, category, limit, offset)
  - `/api/mcp/component`: Get full MCP component profile by slug
  - `/api/mcp/install-command`: Get install command by slug
  - `/api/mcp/docs`: Get documentation URLs by slug
  - `/api/mcp/info`: Server info and tool definitions
- MCP Protocol endpoint (JSON-RPC 2.0):
  - `/api/mcp/protocol`: Standards-based MCP server implementing `initialize`, `tools/list`, and `tools/call` methods
  - Tools: `search_components`, `get_component`, `get_install_command`, `get_docs`, `list_categories`
- Cursor MCP install link endpoints:
  - `/api/mcp/cursor-install`: Generate Cursor deeplink for global directory server
  - `/api/mcp/cursor-install-component?slug=<slug>`: Generate Cursor deeplink for per-component context
- All MCP endpoints log to `mcpApiLogs` table with endpoint, tool, slug, query, status, and timing

### `convex/convex.config.ts`

**Note:** This file was deleted during a previous auth migration and is no longer needed with the current WorkOS setup.

### `convex/tsconfig.json`

TypeScript config for Convex functions.

### `convex/_generated/`

Auto-generated files by Convex: `api.d.ts`, `api.js`, `dataModel.d.ts`, `server.d.ts`, `server.js`. Regenerated whenever Convex modules change (including shared AI failover helper imports used by actions).

## Frontend Source Files

### `src/main.tsx`

Application entry point. Sets up Convex React client with a custom Connect OAuth provider (`ConnectAuthProvider`) and `ConvexProviderWithAuthKit` token bridge. Includes global Footer component with 50px top padding. All routes live under `/components/*`:
- `/components` = Directory (approved components, public)
- `/components/submissions` = Submit.tsx (submissions directory with table view, public)
- `/components/submissions/admin` = Admin.tsx (requires @convex.dev email)
- `/components/submit` = SubmitForm.tsx (auto sign-in redirect for unauthenticated users)
- `/components/profile` = Profile.tsx (user's submissions, auth required)
- `/components/documentation` = Documentation.tsx (admin-only docs, not indexed)
- `/components/documentation/:section` = Individual doc sections
- `/components/callback` = OAuth callback handler (reads `authReturnPath` from localStorage to redirect after auth)
- `/components/:slug` = ComponentDetail (public)

### `src/lib/auth.tsx`

React auth hooks for Connect integration. Re-exports `useConvexAuth` from `convex/react` and provides a custom `useAuth` hook that combines connect `signIn` and `signOut` with Convex authenticated state.

### `src/lib/connectAuth.tsx`

Custom WorkOS Connect OAuth PKCE provider. Handles authorize redirect, callback code exchange, PKCE/state validation, JWT parsing for basic user claims, token persistence, sign out, and exposes `getAccessToken` for Convex auth bridging.

### `src/components/Header.tsx`

Shared header component with auth state management. Uses `useAuth()` from `src/lib/auth` for auth state and sign in/out, and `useQuery(api.auth.loggedInUser)` for user data. Features:
- Floating pill design with `rounded-full`, white/95 background, backdrop blur, and shadow
- Convex wordmark logo (black SVG, 70px height)
- Navigation links (Directory, Submissions, Submit) with medium font weight
- Admin-only navigation links (Admin, Docs) visible only to @convex.dev users
- Social icons (GitHub, Discord) and Docs icon linking to external resources
- User menu with avatar, My Submissions link, and Sign Out button
- Sticky positioning with top padding for floating effect
- Mobile responsive with separate dropdown menu card (rounded-2xl) below header pill
- Header height: 3.438rem

### `src/components/FAQSection.tsx`

Reusable FAQ section component displayed on the Directory page (below components). Displays 8 frequently asked questions:
- What happens after I submit? (rolling basis review with authoring guidelines link)
- What are the requirements? (npm, GitHub, authoring guidelines)
- How are components sandboxed? (Convex runtime data isolation)
- What projects should use Components? (check component docs)
- Can I build my own? (link to authoring docs)
- Do components cost money to use? (open source, usage-based)
- Can I update my submission? (link to profile page)
- Where can I learn more? (link to Components documentation)

### `src/components/Footer.tsx`

Full Convex.dev-style site footer matching the official convex.dev design. Dark background (`#141414`), white Convex wordmark logo linking to convex.dev, four link columns (Product, Developers, Company, Social with icons), "A Trusted Solution" section with green checkmark badges (SOC 2 Type II Compliant, HIPAA Compliant, GDPR Verified), and copyright. Uses Convex design system tokens for colors. External links show `ExternalLinkIcon` from `@radix-ui/react-icons`. Social icons loaded from `/public/*.svg`. Responsive grid layout (6 cols xl, 5 lg, 4 md, 2 mobile).

### `src/components/FooterBackup.tsx`

Backup of the original simple footer component (not used). Kept for reference.

### `src/App.tsx`

Main package submission interface. Compact toolbar, package submission form, search, sort, package card list, modals, and mobile responsive design.

### `src/pages/Directory.tsx`

Component directory listing page at `/components/`. Features shared Header component, search, sort (newest, downloads, updated, rating, and verified), category sidebar, featured section, component cards grid, submit link, ChallengeBanner (above FAQ), and FAQSection at the bottom. No auth required to view. Sidebar uses `sticky top-20` positioning so Submit button remains visible below the header when scrolling.


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
- Long Description field supports safe markdown authoring (headings, lists, links, line breaks) with a live mini preview rendered via `react-markdown` + `remark-gfm` + `remark-breaks`
- Tags sent as comma-separated string (matching `submitPackage` validator `v.optional(v.string())`)
- Success modal with horizontal button layout (View My Submissions, Back to Directory)
- Error modal for submission failures

### `src/pages/Submit.tsx`

Public submissions directory at `/submissions`. Table-based UI showing submitted components with expandable rows. Features:
- Shared Header component with auth state
- Page layout matching Directory.tsx width (`max-w-7xl`)
- Title "Components Submissions Directory" styled to match Directory page
- Search and sort controls with white background search input
- Pagination with default page size loaded from admin setting (20, 40, or 60)
- Page navigation controls with range display and previous/next actions
- Expandable package rows with install command, license, size, files, maintainers
- npm/Repo/Website/Demo action buttons per package
- Status badges (pending, in review, approved, changes requested, rejected)
- Submit button links to `/submit` (auth-gated form page)
- About modal with status legend and Badges section (Convex Verified, Community)

### `src/pages/Profile.tsx`

User profile page for managing submitted components. Accessible at `/profile`. Features:
- Shared Header component with auth state
- Sign-in gate for unauthenticated users with Sign In button calling `signIn()` directly
- Lists all components submitted by the authenticated user (via submitterEmail or additionalEmails)
- Shows review status (pending, in_review, approved, changes_requested, rejected) and visibility badges using consistent styling synced with Submit.tsx and Admin.tsx
- "Send Request" button to send notes to admin team (request re-review, removal, or updates)
- "View Notes" modal showing private user/admin messages with notification badge for unread admin replies
- Message lifecycle controls on user-authored messages: hide, archive, and delete
- "Edit" button to update submission details (name, descriptions, category, tags, URLs)
- Links to view approved components
- Status Guide with all 6 statuses (Pending, In Review, Approved, Changes Requested, Rejected, Featured) synced with Submit.tsx and Admin.tsx
- Visibility Guide (Visible, Hidden) with removed Archived and Pending Deletion states
- Badges section showing Convex Verified and Community badge explanations
- Account section with Delete Account button (requires all components deleted first)
- Delete Account modal with warning if active submissions exist
- Submit New button linking to submission form
- Note: Visibility controls (Hide/Show/Delete) removed from user profile; users must contact admin via "Send Request" to manage visibility

### `src/pages/Admin.tsx`

Admin dashboard at `/submissions/admin` (requires @convex.dev email). Features shared Header component, admin-specific search bar, stats, package management, review status, visibility controls, AI review, component details editor, thumbnail preview in list, admin-only notes, private submitter/admin messages, CSV export, and SubmitterEmailEditor for managing primary submitter email and additional emails. Pagination with configurable items per page (5, 10, 20, 40, 100) and page navigation controls; each filter tab maintains independent page state. Filter tabs wrap instead of horizontally scrolling, and tooltips appear above the bar for better visibility. Filter tabs include a "Deletion" tab (Clock icon) to show packages marked for deletion, with count badge. The submissions sort dropdown supports `newest`, `oldest`, `name_asc`, `name_desc`, `downloads`, `verified`, `community`, and `featured` (UI labels include Verified first, Community first, and Featured first). Package rows display badges in order: StatusBadge, VisibilityBadge, and ComponentDetailQuickLink (external link icon) as the last item before the downloads/date section. A red "Deletion" badge appears next to the visibility badge when marked for deletion. Featured toggle shows a sort order input when package is featured (lower numbers appear first in Featured section, independent of directory dropdown sort). Expanded package InlineActions includes Actions row (above Status row) with Convex Verified toggle, Community toggle, Regenerate SEO + Skill button, combined Auto-fill button, Refresh npm data button, and Generate Slug button (when no slug exists). Category Management now shows both total component counts and verified component counts per category. AI Review Results panel is collapsed by default showing only status icon, label, and date; clicking expands to reveal summary, error, and criteria checklist. Settings tab includes Submit Listing Settings for controlling the default page size on `Submit.tsx` (20, 40, 60), Deletion Management panel for managing packages marked for deletion (auto-delete toggle, waiting period config, list of pending deletions with "Delete Now" option), Slug Migration panel for detecting packages without URL slugs and generating them in bulk or individually, AI Provider Settings panel for configuring Anthropic/OpenAI/Gemini providers, AI Prompt Settings panel for versioning AI review prompts, SEO Prompt Settings panel for versioning SEO/SKILL.md generation prompts, and a `showRelatedOnDetailPage` toggle (on by default) that controls visibility of the Related Components section on detail pages. Private message panels support authored message lifecycle actions (hide, archive, restore, delete) plus a toggle to include hidden and archived messages in the thread view. Non-admin users are automatically redirected to their profile page. Unauthenticated users see a simple "Admin access only" sign-in prompt.

### `src/pages/Documentation.tsx`

Admin-only documentation viewer at `/components/documentation`. Features:
- Admin gating via `api.auth.isAdmin` query
- Non-admins see "Admin Access Required" message with link back to directory
- Markdown content loaded from `src/docs/*.md` files via Vite raw imports
- Three-column layout: left navigation sidebar, main content, right "On this page" outline
- Left sidebar groups docs into Getting Started, User Guide, Admin Guide, and Integrations sections
- Active navigation item highlighting
- Client-side section routing for docs sidebar navigation to avoid full page reloads and repeated auth spinner on section clicks
- Right sidebar shows H2/H3 headings from current doc with anchor links
- Enhanced markdown rendering with polished formatting for GFM tables, code blocks, inline code, blockquotes, ordered and unordered lists, horizontal rules, and images
- Copy as Markdown button copies raw markdown to clipboard
- Download as Markdown button downloads .md file
- Sets `<meta name="robots" content="noindex, nofollow">` to prevent indexing
- Mobile responsive with collapsible navigation
- Styled with Convex design system (warm cream background, GT America font)

### `src/docs/`

Markdown documentation files for the admin documentation system:
- `index.md` - Overview and quick links
- `directory.md` - Using the public directory (search, filter, categories)
- `submit.md` - How to submit components
- `profile.md` - Managing user profile and submissions
- `component-detail.md` - Component detail page features
- `admin-dashboard.md` - Admin dashboard overview
- `admin-packages.md` - Package management
- `admin-review.md` - Review workflow and statuses
- `admin-ai-review.md` - AI review system configuration
- `admin-seo.md` - SEO content generation
- `admin-thumbnails.md` - Thumbnail management
- `admin-settings.md` - Admin settings panel
- `admin-notes.md` - Notes and comments system
- `mcp.md` - MCP (Model Context Protocol) endpoints, tools, Cursor integration, and agent install features
- `api-endpoints.md` - Public API endpoints (llms.txt, markdown, badge SVG, Netlify aliases)
- `badges.md` - README badge endpoint, usage, and analytics

### `src/pages/NotFound.tsx`

404 page component with shared Header and navigation back to directory.

### `src/pages/ComponentDetail.tsx`

Component detail page at `/components/:slug`. Features shared Header component, narrow sidebar (left) with npm link, category, stats, verified badge, community badge, source link, rating stars, and Back link. Community badge appears below the verified badge and above the downloads count in the sidebar. Main area (right) with author row (package name, "by" author info, Markdown dropdown, Download Skill button), title, install command, AI-generated SEO content layer, rendered long description, video embed, SKILL.md section with copy and download buttons, and keywords tags. Long description markdown and AI-generated SEO content use unified `text-sm text-text-secondary` styling for consistent font sizes. Long description markdown rendering preserves line breaks and uses purple links (`#8D2676`) with hover underline for consistency. The author row uses `flex-wrap` so long package names truncate gracefully on mobile (`max-w-[280px]` with title tooltip) instead of pushing other elements or causing awkward double wrapping. Markdown dropdown in author row provides view markdown source toggle, open markdown file, copy as Markdown, copy page URL, and quick actions to open the markdown link in ChatGPT, Claude, and Perplexity. A standalone `View llms.txt` link is rendered independently from Keywords so it appears even when no tags exist. Below the llms.txt link, a Related Components section shows up to 3 related components in a no-thumbnail compact card grid; relatedness is scored by shared category, overlapping tags, and download count. The section is controlled by an admin setting (`showRelatedOnDetailPage`, on by default) in the AI Review Settings panel. Link generation now uses a shared client-aware URL helper so localhost opens Convex API endpoints while production uses Netlify alias URLs. Download Skill button appears next to Markdown dropdown when SKILL.md has been generated (uses Phosphor FileArrowDown icon). SKILL.md section includes both copy to clipboard and download as file options. GitHub issues feature and README badge snippet are currently commented out. Includes full SEO support: dual JSON-LD structured data (SoftwareSourceCode + FAQPage), Open Graph tags, Twitter Card tags, canonical URL, and meta description using AI-generated seoValueProp or shortDescription fallback.

### `src/components/ComponentCard.tsx`

Component card for directory listing. Shows thumbnail, name, description, downloads, version, verified badge, and community badge. Supports `showThumbnail` prop to conditionally hide thumbnails (used for hiding thumbnails in category listings while showing them in Featured section). Badge placement behavior: when a component has only Community, it uses the same right-side badge position as Verified; when both badges are present, Community appears before Verified.

### `src/components/CategorySidebar.tsx`

Category filter sidebar for the directory page. Uses category totals from `listCategories` and accepts verified counts in the query contract for consistency with admin category metrics.

### `src/components/SearchBar.tsx`

Reusable search input with clear button.

### `src/components/VerifiedBadge.tsx`

Reusable "Convex Verified" badge component with green background styling.

### `src/components/ChallengeBanner.tsx`

Promotional banner for the Component Authoring Challenge. Dark background with grid pattern (uses `/banner-grid.svg`), white title, gray description, and "Learn more" button with pink/magenta glow border. Responsive layout with column stacking on mobile. Placed at the bottom of the Directory page above the footer.

### `src/components/CommunityBadge.tsx`

Reusable "Community" badge component for community-submitted components. Displays with `#E9DDC2` background color and PersonIcon. Supports `sm` and `md` size variants.

### `src/components/InstallCommand.tsx`

Copy-to-clipboard install command component.

### `src/components/ComponentDetailsEditor.tsx`

Admin editor for directory-specific fields: slug, category, tags, descriptions, video URL, verified badge, community badge, featured status, thumbnail upload with preview, thumbnail clear option (applies after Save), "Hide thumbnail in category listings" checkbox (shows thumbnail only in Featured section when checked), logo upload with clear option, auto-fill author from GitHub, auto-fill long description from package metadata, and AI SEO + SKILL.md content generation trigger with status display. Shows "SKILL.md generated" indicator when content exists. All fields reactively sync with backend updates via `useEffect` hooks, so changes from external mutations (like slug generation) appear immediately without refresh. The "Auto-fill from Package" button copies the npm/repo description into the Long Description field for editing. The logo section includes upload, download, and clear buttons for managing component logos. Convex Verified and Community checkboxes appear side by side for admin-only badge control. Live Demo URL field label reads "Live Demo URL or Example App".

### `src/components/AgentInstallSection.tsx`

"Use with agents and CLI" section for ComponentDetail page. Always visible (no toggle) for SEO/AEO/GEO. Shows single copy prompt optimized for AI agents (Claude style), MCP ready badge in header, and agent-friendly summary with install command, setup steps, and verification checklist. Includes multi-platform MCP install section with toggle tabs for Cursor (deeplink install), Claude Desktop (manual JSON config), and ChatGPT (custom connector URL). Platform-aware copy button adapts to selected tab. Respects feature flags (VITE_AGENT_INSTALL_ENABLED, VITE_MCP_BADGES_ENABLED, VITE_MCP_ENABLED) for controlled rollout.

### `src/lib/categories.ts`

Static category definitions and `getCategoryLabel` helper.

### `src/lib/slugs.ts`

Client-side slug generation and parsing utilities for URL-safe component slugs.

### `src/lib/seo.ts`

Client-side utilities to manage document title, meta description, Open Graph tags, Twitter Card tags, canonical URLs, JSON-LD structured data injection, and `buildComponentJsonLd()` helper that creates a dual `@graph` schema combining SoftwareSourceCode and FAQPage for SEO/AEO/GEO. Includes `setComponentSeoTags()` consolidated helper that sets all SEO tags at once (title, description, OG, Twitter, canonical).

### `src/Admin.tsx`

Legacy admin file (re-exports from pages/Admin.tsx or contains full admin logic).

### `src/SignOutButton.tsx`

Sign-out button component using `useAuth().signOut()` from `src/lib/auth`.

### `src/index.css`

Global CSS with Tailwind directives and design system variables.

### `src/lib/utils.ts`

Utility functions including `cn` for Tailwind class merging.

### `src/lib/mcpProfile.ts`

MCP profile builder utilities. Builds MCP-compatible component profiles from package data for agent consumption. Uses `MCP_PUBLIC_COMPONENTS_BASE_URL` constant so MCP install configs point to the live public route (`https://www.convex.dev/components/api/mcp/protocol`). Includes:
- `buildMcpProfile`: Builds full MCP component profile for agent consumption
- `buildMcpSearchResult`: Builds lightweight search result items
- `isMcpReady`/`hasAiInstallSupport`: Badge readiness checks
- `generateGlobalCursorInstallLink`: Generates Cursor MCP install deeplink for directory server
- `generateComponentCursorInstallLink`: Generates Cursor MCP install deeplink for specific component
- `generateClaudeDesktopConfig`: Generates Claude Desktop JSON config for manual file editing (mcpServers wrapper)
- `generateChatGPTConnectorConfig`: Generates ChatGPT custom connector URL with Developer mode setup steps
- `CLAUDE_DESKTOP_CONFIG_PATHS`: macOS and Windows config file paths
- `getMcpProtocolEndpoint`/`getCursorInstallApiUrl`: URL helpers for MCP endpoints (use public `/components/api` path)

### `src/lib/promptComposer.ts`

Universal prompt composer for AI agent installation. Generates Cursor, Claude, and manual safety prompts per-component using layered sources (SEO content, then fallback to basic fields). Returns metadata about source fields used and whether fallback was needed.

### `src/lib/metadataScoring.ts`

Metadata quality scoring v1. Calculates completeness scores for components based on field presence and weights. Returns grade (A-F), confidence notes, and recommendations for missing data. Used by trust signals in the agent install section.

### `src/lib/featureFlags.ts`

Feature flags for MCP and agent install features. Controls rollout via environment variables (VITE_MCP_ENABLED, VITE_AGENT_INSTALL_ENABLED, VITE_METADATA_SCORING_ENABLED, VITE_COPY_PROMPTS_ENABLED, VITE_MCP_BADGES_ENABLED). Includes rollback documentation.

### `shared/componentUrls.ts`

Shared URL builder used by frontend and Convex HTTP code to generate consistent component detail, markdown alias, and llms URLs. Handles scoped slug paths and derives the markdown filename leaf safely from the slug. Includes client-aware behavior for `ComponentDetail`: localhost uses Convex API endpoints (`/api/markdown` and `/api/component-llms`) while production keeps Netlify alias URLs (`/components/<slug>/<leaf>.md` and `/components/<slug>/llms.txt`). This prevents local 404s without changing production routing.

### `shared/mcpTypes.ts`

TypeScript types for MCP (Model Context Protocol) data structures. Defines `McpComponentProfile` (public profile for agent consumption), `McpSearchResult`, `McpToolDefinition`, `McpServerConfig`, `McpUniversalPrompt`, `CursorInstallLink` (Cursor deeplink config and instructions), and `McpDirectoryInfo` (directory-level MCP server metadata). Also includes `MCP_EXCLUDED_FIELDS` and `MCP_PUBLIC_SUBMIT_FIELDS` constants documenting the data contract.

### `src/vite-env.d.ts`

TypeScript declarations for Vite environment variables.

## Netlify Edge Functions

### `netlify/edge-functions/og-meta.ts`

Netlify Edge Function that injects component-specific OpenGraph and Twitter Card meta tags into the SPA HTML for all requests to `/components/{slug}`. Fetches component data from the Convex public `getComponentBySlug` query via HTTP API in parallel with the SPA response, then replaces default meta tags (`og:title`, `og:description`, `og:image`, `twitter:card`, `<title>`, etc.) in the HTML before serving. Works for all clients including headless browsers, social crawlers, and regular browsers. Falls back to default SPA behavior if the component is not found or if the path is a reserved route or static asset. CDN cached for 5 minutes. Required because the SPA sets meta tags via client-side JavaScript which crawlers do not execute.

### `netlify/edge-functions/component-markdown.ts`

Netlify Edge Function that proxies markdown alias paths (`/components/<slug>/<leaf>.md`) to the Convex HTTP markdown endpoint by slug. Keeps the URL on the Netlify domain while serving raw markdown content. Parses slug from the URL path and forwards to `{convexSiteUrl}/api/markdown?slug={slug}`. Cached for 5 minutes.

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
- `auth-migration-env-vars.md`: Legacy auth environment notes from an older GitHub OAuth phase (kept for historical context only)
- `routes-components-fix.md`: SPA routing configuration for Netlify deployment with `/components` prefix enforcement
- `authfix-2026-02-23.md`: Production OAuth fix documentation including GitHub OAuth callback URL configuration, JWT key generation, and admin access control via `@convex.dev` email domain
- `featured-sort-order.md`: Featured components sort order feature for admin-controlled ordering independent of directory dropdown sort
- `admin-actions-row.md`: Admin Actions row feature moving Convex Verified, Regenerate SEO, and Auto-fill buttons to InlineActions panel above Status row
- `component-url-centralization.md`: Shared URL helper plan for component detail, markdown alias, and llms links across frontend and Convex HTTP output
- `netlify-markdown-alias-edge-function.md`: Netlify edge strategy for markdown alias paths and production/local behavior expectations
- `submit-pagination-admin-page-size-setting.md`: Submit page pagination and admin-configurable default page size (`20`, `40`, `60`)
- `tremendous-rewards-integration.md`: Tremendous API integration for sending rewards to component submitters, including SDK setup, environment variables, schema changes, and Admin UI specs
- `prd-doc-timestamp-tracking.md`: Workflow update plan that standardizes date and time tracking across PRDs, task updates, and changelog entries for agent session traceability
- `workos-convex-environment-runbook.md`: Runbook for WorkOS and Convex staging and production environments, including exact environment variable matrices, callback and CORS requirements, and route verification checklist
- `workos-authkit-migration-components-routes.md`: WorkOS cutover implementation PRD for removing legacy Convex Auth wiring while preserving `/components` route behavior and admin gating
- `workos-connect-convex-migration.md`: Connect specific migration PRD for OAuth PKCE frontend flow, Convex token bridge, and Connect issuer/JWKS validation
- `workos-connect-convex-netlify-how-to.md`: Shareable how-to guide for setting up WorkOS Connect with Convex and Netlify across development, staging, and production, including route access policy and alias route behavior
- `ai-provider-runtime-failover.md`: Runtime failover PRD for AI provider orchestration across admin and env configurations to keep AI Review and SEO generation available during provider outages or key failures
- `ai-review-prompt-v1.md`: Archived original AI review prompt (v1) before updates. Documents known issues fixed in v2 including false negatives on helper function return validators and false positives on public API functions.

All PRDs in this folder now include metadata headers (`Created`, `Last Updated`, `Status`) and a `Task completion log` section for agent session traceability.

### `.cursor/rules/`

Cursor rules for development guidelines including `sec-check.mdc`, `dev2.mdc`, `help.mdc`, `gitrules.mdc`, `convex2.mdc`, `rulesforconvex.mdc`.

### `.cursor/plans/`

Plan documents including `components_directory_expansion_dd445bcc.plan.md` for the full directory expansion project.
