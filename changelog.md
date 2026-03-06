# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Improved SKILL.md generation following Anthropic skill creator guidelines (2026-03-06 UTC)
  - Description field now uses "pushy" trigger contexts per Anthropic recommendation to prevent under-triggering
  - Added `buildTriggerContexts()` helper that extracts trigger phrases from category, tags, and use case queries
  - Instructions now use imperative form ("Use X to..." instead of "X is a component that...")
  - Added "When NOT to use" section to prevent over-triggering on unrelated queries
  - Updated SEO + SKILL.md Prompt panel in Admin.tsx settings to document the new SKILL.md format
  - Reference: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md

### Added

- Dynamic OpenGraph meta tags for social crawlers via Netlify Edge Function (2026-03-05 23:45 UTC)
  - New `netlify/edge-functions/og-meta.ts` serves correct `og:title`, `og:description`, `og:image`, and Twitter Card tags to bots
  - Detects crawlers by user agent (Facebook, Twitter, LinkedIn, Slack, Discord, Google, OpenGraph checkers, etc.)
  - Fetches component data from Convex `getComponentBySlug` public query via HTTP API
  - Non-bot requests pass through to the SPA unchanged
  - Fixes issue where social link previews showed generic site metadata instead of component-specific data
  - Registered in `netlify.toml` as edge function on `/components/*` path (runs before SPA fallback)

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
