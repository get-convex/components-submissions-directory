# Task List

## to do

- [x] add admin settings jump navigation (2026-03-08 00:49 UTC)
  - Added anchored section wrappers for each block in the Admin settings tab
  - Added a sticky jump bar for smaller screens and switched the desktop settings nav to a sticky in-layout sidebar on extra-wide screens
  - Moved sticky positioning onto the desktop sidebar container so the rail stays pinned while scrolling the settings page
  - Kept existing settings panels and feature behavior unchanged while making the long page easier to navigate
- [x] setup tremendous (`prds/tremendous-rewards-working-setup.md`) (2026-03-07 02:25 UTC)
  - Working setup uses `convex/payments.ts` for Node actions and `convex/paymentsDb.ts` for queries and mutations
  - Uses Tremendous REST API via `fetch()` with normalized sandbox or production base URLs
  - Campaign safe payload now avoids sending `products` when `TREMENDOUS_CAMPAIGN_ID` is present
  - Admin UI includes Send Reward, PaymentBadge, RewardSettingsPanel, reward history modal, and settings-only test reward flow
- [x] add Tremendous settings test reward (`prds/tremendous-settings-test-reward.md`) (2026-03-08 00:41 UTC)
  - Added settings-only `Send Test Reward` action in `RewardSettingsPanel`
  - Test reward sends to `TREMENDOUS_TEST_RECIPIENT_EMAIL` and records a `payments` row with `isTest: true`
  - Test payments do not patch `packages.rewardStatus` or `packages.rewardTotalAmount`
  - Test payments are excluded from reward stats totals
- [x] add reward history modal and count in admin (`prds/admin-reward-history-modal.md`) (2026-03-07 06:10 UTC)
  - Added reward history count pill next to the Reward button in `src/pages/Admin.tsx`
  - Added reward history modal showing past payment attempts, including test payments, statuses, amounts, recipient email, notes, and Tremendous link when available
  - Reused existing `api.paymentsDb.getPaymentsForPackage` query and existing admin modal styling
- [ ] fix logout on submit page
- [ ] add admin
- [x] Admin dashboard default filter changed from "pending" to "all" (2026-03-07 00:35 UTC)
- [x] Directory category sections now show 3 rows before "Load more" (2026-03-07 00:35 UTC)
  - Changed `groupedCardsPerLoad` from `gridColumns * 2` to `gridColumns * 3`
- [x] fix image meta (2026-03-06 UTC)
  - Final fix reverts `og:image` back to the known working raw `thumbnailUrl` storage format
  - Updated `og-meta.ts` edge function to emit `component.thumbnailUrl` directly
  - Updated `ComponentDetail.tsx` client-side SEO to use `component.thumbnailUrl` again
  - Removed the unused `/api/og-image` endpoint and `/components/og/*` Netlify redirect
  - Social crawlers now see the original working image URL format like `https://giant-grouse-674.convex.cloud/api/storage/...`
- [x] revert OG image proxy path to raw thumbnail URLs (`prds/og-image-meta-revert.md`) (2026-03-06 22:54 UTC)
  - Reverted both server side and client side OG image generation to direct storage URLs
  - Removed the unused OG proxy backend and Netlify route
  - Kept badge routing unchanged since the dedicated badge edge proxy is the known working pattern
- [ ] share
- [ ] test submitting
  - Commented out MCP ready badge in AgentInstallSection.tsx
  - Commented out all MCP routes in convex/http.ts
  - Kept Copy prompt, Agent friendly summary, llms.txt, and markdown features working
- [ ] npm security scanner
- [ ] check api ai model
- [ ] add posthog

- [x] Updated badge SVG colors to match frontend status pills and shields.io styling (2026-03-06 21:45 UTC)
  - Changed left box from `#2a2825` to `#555555` (shields.io gray)
  - Approved: `#228909` (Convex Verified green)
  - In Review: `#2563eb` (frontend blue pill)
  - Changes Requested: `#ea580c` (frontend orange pill)
  - Updated `badge-palette-preview.html` preview file
- [x] Replace Delete Account with "Need help?" guidance on Profile page (2026-03-06 UTC)
  - Removed DeleteAccountModal component and all delete account state/logic
  - Replaced red "Delete Account" section with neutral "Need help?" section
  - Users now use existing "Send Request" button to contact Convex team for component removal or account changes
  - Removed unused `UserMinus` and `useMemo` imports
- [x] Removed MCP Server references from `/api/llms.txt` and `/api/markdown-index` endpoints (2026-03-06 UTC)
  - Endpoints were still advertising disabled MCP protocol URLs
  - Removed "MCP Server" section from llms.txt output
  - Removed "MCP Server Integration" section from markdown-index output
  - Kept `MCP_DIRECT_ORIGIN` constant for future MCP re-enablement
- [x] fix mcp (2026-03-06 06:45 UTC)
- [x] badge shield on each component page (2026-03-06 09:15 UTC)
- [x] Added badge preview with image to ComponentDetail.tsx
- [x]Fixed edge function conflict blocking badge endpoint
- [x] Updated og-meta.ts to skip both "badge" and "badge/\*" paths so badge redirects work
- [x] Updated badge endpoint docs in src/docs/badges.md and src/docs/api-endpoints.md to use /components/badge/<slug>
- [x] Added dedicated Netlify edge function `component-badge.ts` for `/components/badge/*` to bypass SPA fallback and proxy badge SVG directly
- [x]Verified production build passes with `npm run build` (2026-03-06 UTC)
- [x] Updated fix plan and PRD with final working badge routing pattern
- [x] Added local `badge-palette-preview.html` with badge/status color previews and added it to `.gitignore`
- [x] Submission badge sync rollout (2026-03-06 01:45 UTC)
  - Added `isSlugTaken()` and `generateUniqueSlug()` helpers for slug uniqueness in `convex/packages.ts`
  - Updated `addPackage`, `generateSlugForPackage`, `generateMissingSlugs`, `updateComponentDetails` for collision safe slug handling
  - Added `BadgeSnippet` component to `src/pages/Submit.tsx` for README badge copy and preview
  - Added `BadgeSnippet` component to `src/pages/Profile.tsx` for owner facing badge access
  - Badges auto sync with review status at request time (no caching)
  - Admin backfill through existing slug migration UI now uses uniqueness guards
- [x] Temporarily disable MCP UI and backend routes (2026-03-06 UTC)
- [x] Removed MCP Server references from public llms.txt and markdown-index endpoints (2026-03-06 UTC)
- [x] Show package license above category in `src/pages/ComponentDetail.tsx` (2026-03-06 UTC)
  - Added License metadata block in the sidebar above Category
  - Reads from existing `getComponentBySlug` package payload, so Admin auto refresh updates license automatically on detail pages
- [x] Updated `files.md`, `changelog.md`, and `task.md` for this session change (2026-03-06 UTC)

- [x]check all routes for mcp and md and llms.text

### MCP Streamable HTTP migration (PRD: prds/mcp-streamable-http-migration.md)

- [x] Diagnosed `@anthropic-ai/mcp-server-fetch` removed from npm (404) breaking all MCP installs (2026-03-06 06:30 UTC)
- [x] Wrote PRD at `prds/mcp-streamable-http-migration.md` (2026-03-06 06:30 UTC)
- [x] Added GET handler for `/api/mcp/protocol` returning server discovery info (2026-03-06 06:40 UTC)
- [x] Updated protocol version to `2025-03-26` (MCP Streamable HTTP spec) (2026-03-06 06:40 UTC)
- [x] Updated CORS headers for MCP transport (`Accept`, `Mcp-Session-Id`, `Mcp-Protocol-Version`) (2026-03-06 06:40 UTC)
- [x] Migrated `cursor-install` and `cursor-install-component` endpoints from command/args to url config (2026-03-06 06:40 UTC)
- [x] Migrated `src/lib/mcpProfile.ts`: all 4 generator functions now use url-based config (2026-03-06 06:42 UTC)
- [x] Updated `shared/mcpTypes.ts` `CursorInstallLink` interface to `{url: string}` (2026-03-06 06:43 UTC)
- [x] Updated `src/docs/mcp.md` with new config examples for Cursor, Claude Desktop, ChatGPT (2026-03-06 06:44 UTC)
- [x] Zero type errors, zero remaining references to dead package (2026-03-06 06:45 UTC)
- [x] Updated `files.md`, `changelog.md`, `task.md` (2026-03-06 06:50 UTC)

### Netlify proxy routing fix (dev to prod)

- [x] Changed all `netlify.toml` redirect targets from `third-hedgehog-429.convex.site` (dev) to `giant-grouse-674.convex.site` (prod) (2026-03-06 07:15 UTC)
- [x] Added MCP API proxy redirects `/api/mcp/*` and `/components/api/mcp/*` before SPA fallback (2026-03-06 07:15 UTC)
- [x] Added badge API proxy redirect `/components/badge/*` (2026-03-06 07:15 UTC)
- [x] Verified build passes with zero type errors (2026-03-06 07:15 UTC)
- [x] Updated `changelog.md`, `task.md` (2026-03-06 07:15 UTC)

### MCP live endpoint verification and fallback

- [x] Read `prds/deploy-commands.md` and confirmed production app host mapping (`components-directory.netlify.app`) (2026-03-06 08:00 UTC)
- [x] Verified `https://www.convex.dev/components/api/mcp/protocol` returns SPA HTML, not MCP JSON (2026-03-06 08:00 UTC)
- [x] Verified `https://components-directory.netlify.app/components/api/mcp/protocol` returns SPA HTML and `/api/mcp/protocol` returns Netlify 404 (2026-03-06 08:00 UTC)
- [x] Verified direct Convex MCP endpoint `https://giant-grouse-674.convex.site/api/mcp/protocol` works for both GET discovery and POST initialize (2026-03-06 08:00 UTC)
- [x] Updated `files.md`, `changelog.md`, and `task.md` with session findings and immediate fallback guidance (2026-03-06 08:00 UTC)

### MCP direct Convex endpoint fallback (PRD: prds/mcp-direct-convex-endpoint-fallback.md)

- [x] Created PRD for temporary direct MCP fallback rollout (2026-03-06 08:17 UTC)
- [x] Updated `src/lib/mcpProfile.ts` so Cursor, Claude Desktop, and ChatGPT configs use `https://giant-grouse-674.convex.site/api/mcp/protocol` (2026-03-06 08:17 UTC)
- [x] Updated `convex/http.ts` MCP discovery metadata and backend Cursor install payloads to use the same direct MCP origin (2026-03-06 08:17 UTC)
- [x] Updated `src/docs/mcp.md`, `files.md`, `changelog.md`, and `task.md` to document the temporary fallback (2026-03-06 08:17 UTC)
- [ ] Verify deployed install flow in Cursor, Claude Desktop, and ChatGPT against the direct endpoint

### SKILL.md generation improvements (Anthropic guidelines)

- [x] Analyzed current `buildSkillMd()` implementation against Anthropic skill creator guidelines (2026-03-06 UTC)
- [x] Added `buildTriggerContexts()` helper for "pushy" description fields (2026-03-06 UTC)
- [x] Updated description field to include dynamic trigger contexts from category, tags, and use cases (2026-03-06 UTC)
- [x] Changed instructions to imperative form per Anthropic guidelines (2026-03-06 UTC)
- [x] Added "When NOT to use" section to prevent over-triggering (2026-03-06 UTC)
- [x] Updated SEO + SKILL.md Prompt panel description in Admin.tsx to document new format (2026-03-06 UTC)
- [x] Updated `files.md`, `changelog.md`, and `task.md` (2026-03-06 UTC)

### OpenGraph meta tags for social crawlers

- [x] Created `netlify/edge-functions/og-meta.ts` to serve dynamic OG tags to bots (2026-03-05 23:45 UTC)
- [x] Updated `netlify.toml` with edge function registration on `/components/*` (2026-03-05 23:45 UTC)
- [x] Updated `files.md`, `changelog.md`, `task.md` (2026-03-05 23:50 UTC)
      [x] fix opengraph view (2026-03-06 06:15 UTC)

### OpenGraph meta fix v2: HTML injection approach

- [x] Diagnosed v1 failure: opengraph.xyz uses headless Chrome without bot UA (2026-03-06 06:05 UTC)
- [x] Rewrote `og-meta.ts` to inject meta tags into SPA HTML for all requests (2026-03-06 06:10 UTC)
- [x] Verified regex handles multi-line meta tags in production HTML (2026-03-06 06:12 UTC)
- [x] Verified slug extraction excludes static assets and reserved paths (2026-03-06 06:13 UTC)
- [x] Created PRD at `prds/opengraph-meta-fix.md` (2026-03-06 06:15 UTC)
- [x] Updated `files.md`, `changelog.md`, `task.md` (2026-03-06 06:15 UTC)
- [ ] Deploy and verify with opengraph.xyz

### AI review prompt v2 update (PRD: prds/ai-review-prompt-v1.md)

- [x] Archived original AI review prompt to `prds/ai-review-prompt-v1.md` (2025-03-05 21:30 UTC)
- [x] Updated `convex/aiSettings.ts` DEFAULT_REVIEW_PROMPT to v2 (2025-03-05 21:30 UTC)
- [x] Updated `convex/aiReview.ts` REVIEW_CRITERIA and default prompt template to v2 (2025-03-05 21:30 UTC)
- [x] Fixed false negative: only exported query/mutation/action need returns validators, not helper functions (2025-03-05 21:30 UTC)
- [x] Fixed false positive: public API functions should NOT use internal\* (2025-03-05 21:30 UTC)
- [x] Added ctx.auth unavailability note and auth callback pattern guidance (2025-03-05 21:30 UTC)
- [x] Updated "How AI Review Works" section in Admin settings panel to match v2 criteria (2025-03-05 22:00 UTC)
- [x] Updated `files.md`, `changelog.md`, and `task.md` (2025-03-05 22:00 UTC)

### Admin search enhancement (PRD: prds/admin-search-enhancement.md)

- [x] Add `search_componentName` index to schema (2026-03-05 22:12 UTC)
- [x] Add `search_repositoryUrl` index to schema (2026-03-05 22:12 UTC)
- [x] Update `adminSearchPackages` to search componentName and repositoryUrl (2026-03-05 22:12 UTC)
- [x] Verify Convex functions compile successfully (2026-03-05 22:12 UTC)
- [x] Update `files.md`, `changelog.md`, and `task.md` (2026-03-05 22:15 UTC)
- [x] Fix submit form markdown mini preview rendering (headings, lists) and add 500 char limit (2026-03-05 23:25 UTC)
- [x] update routes for mcp
- [x] Fix long description markdown line breaks and purple hover-link styling on component detail page (PRD: `prds/markdown-long-description-rendering-and-preview.md`) (2026-03-05 23:08 UTC)
- [x] Add safe markdown long description support notes and mini preview in submit form (PRD: `prds/markdown-long-description-rendering-and-preview.md`) (2026-03-05 23:08 UTC)
- [x] Verify markdown rendering behavior and update docs (`task.md`, `changelog.md`, `files.md`) (2026-03-05 23:08 UTC)

### Multi-platform MCP install section (PRD: prds/multi-platform-mcp-install.md)

- [x] Add platform toggle tabs (Cursor, Claude, ChatGPT) to AgentInstallSection (2026-03-04 20:10 UTC)
- [x] Add Claude Desktop config generator and manual setup instructions (2026-03-04 20:08 UTC)
- [x] Add ChatGPT custom connector setup instructions (2026-03-04 20:08 UTC)
- [x] Test all three platform MCP install flows (2026-03-04 20:15 UTC)
- [x] Update files.md, changelog.md, task.md (2026-03-04 20:15 UTC)
- [x] Switch MCP install URLs to live public `/components/api` path and refresh docs (2026-03-05 00:10 UTC)

### Documentation full feature coverage update

- [x] Audited all docs against files.md and changelog.md for missing features (2026-03-04 22:30 UTC)
- [x] Created mcp.md covering MCP protocol, REST API, Cursor install, agent prompts (2026-03-04 22:30 UTC)
- [x] Created api-endpoints.md covering llms.txt, markdown, badge SVG, Netlify aliases (2026-03-04 22:30 UTC)
- [x] Created badges.md covering README badge endpoint, usage, and analytics (2026-03-04 22:30 UTC)
- [x] Updated 9 existing docs with missing feature details (2026-03-04 22:30 UTC)
- [x] Added "Integrations" nav group in Documentation.tsx (2026-03-04 22:30 UTC)
- [x] Verified build passes and updated files.md, changelog.md, task.md (2026-03-04 22:30 UTC)

### Documentation markdown rendering improvements (PRD: prds/docs-markdown-rendering-improvements.md)

- [x] Improve Documentation.tsx markdown rendering for tables, code blocks, lists, blockquotes, and related rich markdown formats (2026-03-04 21:24 UTC)
- [x] Verify `npm run build` passes after markdown rendering updates (2026-03-04 21:24 UTC)
- [x] Update `files.md`, `changelog.md`, and `task.md` with session changes (2026-03-04 21:24 UTC)

### Admin filter bar UX fix

- [x] Changed filter tabs from horizontal scroll to flex wrap (2026-03-04 19:00 UTC)
- [x] Changed filter tab tooltips to position above instead of below (2026-03-04 19:00 UTC)

### Admin submissions sort dropdown update

- [x] Added `verified`, `community`, and `featured` sort modes in `src/pages/Admin.tsx` (2026-03-05 21:53 UTC)
- [x] Added dropdown options `Verified first`, `Community first`, and `Featured first` (2026-03-05 21:53 UTC)
- [x] Verified sort stability with newest-date fallback tie-breaker (2026-03-05 21:53 UTC)
- [x] Updated `files.md`, `changelog.md`, and `task.md` for this session (2026-03-05 21:53 UTC)

### Admin documentation system (PRD: prds/admin-documentation-system.md)

- [x] Create PRD with UI design and file structure plan (2026-03-04 12:00 UTC)
- [x] Create 13 markdown documentation files in `src/docs/` covering user guide and admin guide topics (2026-03-04 12:15 UTC)
- [x] Create `Documentation.tsx` component with admin gating and markdown rendering (2026-03-04 12:20 UTC)
- [x] Add documentation route to `main.tsx` router at `/components/documentation/:section?` (2026-03-04 12:25 UTC)
- [x] Add "documentation" to reserved routes in `src/lib/slugs.ts` (2026-03-04 12:25 UTC)
- [x] Add TypeScript declarations for `*.md?raw` imports (2026-03-04 12:25 UTC)
- [x] Add "Docs" link to Header.tsx nav bar for admins (2026-03-04 12:35 UTC)
- [x] Use client-side section navigation in Documentation.tsx to avoid full reload and spinner between doc pages (2026-03-04 19:20 UTC)
- [x] Update `files.md`, `changelog.md`, and `task.md` (2026-03-04 12:35 UTC)

### AI provider runtime failover (PRD: prds/ai-provider-runtime-failover.md)

- [x] Add internal provider settings query for failover candidate selection in `convex/aiSettings.ts` (2026-03-04 02:29 UTC)
- [x] Add shared failover helper to build candidate chain and execute fallback in `convex/aiProviderFallback.ts` (2026-03-04 02:29 UTC)
- [x] Wire failover chain into `convex/aiReview.ts` so runtime provider errors fall through to next candidate (2026-03-04 02:29 UTC)
- [x] Wire failover chain into `convex/seoContent.ts` so generation can continue on provider failure (2026-03-04 02:29 UTC)
- [x] Verify with `npx convex codegen`, `npx tsc -p convex/tsconfig.json --noEmit --pretty false`, and `npx tsc -p . --noEmit --pretty false` (2026-03-04 02:29 UTC)

### Directory sort by verified and category verified counts (PRD: prds/directory-sort-verified-and-category-verified-count.md)

- [x] Add `verified` sort mode in directory backend query and UI dropdowns (2026-03-03 07:47 UTC)
- [x] Add `verifiedCount` to category aggregation used by Category Management (2026-03-03 07:47 UTC)
- [x] Update admin category row display to include verified counts (2026-03-03 07:47 UTC)
- [x] Verify existing sort modes and verified toggles still work (2026-03-03 07:47 UTC)
- [x] Update docs: `task.md`, `changelog.md`, and `files.md` after verification (2026-03-03 07:47 UTC)

### Private profile admin messages and admin notes separation (PRD: prds/private-profile-admin-messages-and-admin-notes.md)

- [x] Route profile user messages to admin comments thread in `packageComments` and keep admin notes in `packageNotes` only (2026-03-03 06:24 UTC)
- [x] Remove public comment rendering from `src/pages/Submit.tsx` so user admin messages stay private (2026-03-03 06:24 UTC)
- [x] Add ownership based message actions (hide, archive, delete) for both profile and admin comment UIs (2026-03-03 06:24 UTC)
- [x] Enforce backend authorization for message lifecycle actions (no client trusted author fields) (2026-03-03 06:24 UTC)
- [x] Update docs: `task.md`, `changelog.md`, and `files.md` after verification (2026-03-03 06:24 UTC)

### WorkOS Connect migration for Convex app auth (PRD: prds/workos-connect-convex-migration.md)

- [x] Implement Connect OAuth PKCE provider and callback handling (2026-03-03 00:22 UTC)
- [x] Bridge Connect tokens into Convex auth client (2026-03-03 00:23 UTC)
- [x] Update Convex JWT provider configuration for Connect issuer/JWKS (2026-03-03 00:23 UTC)
- [x] Verify route access behavior remains unchanged (2026-03-03 00:25 UTC)
- [x] Update task, changelog, and files docs with timestamps (2026-03-03 00:26 UTC)

### WorkOS AuthKit migration for components routes (PRD: prds/workos-authkit-migration-components-routes.md)

- [x] Swap frontend auth provider from legacy Convex Auth to WorkOS AuthKit and keep `/components/callback` return path behavior (2026-03-02 23:36 UTC)
- [x] Replace backend auth helpers and admin checks to use `ctx.auth.getUserIdentity()` email claims (2026-03-02 23:37 UTC)
- [x] Remove legacy auth schema and HTTP route coupling (`authTables`, `auth.addHttpRoutes`) (2026-03-02 23:37 UTC)
- [x] Update dependencies and auth config for WorkOS JWT providers (2026-03-02 23:40 UTC)
- [x] Verify public, auth-gated, and admin routes plus markdown alias route safety (2026-03-02 23:41 UTC)
- [x] Update `task.md`, `changelog.md`, and `files.md` with completion timestamps (2026-03-02 23:42 UTC)

### WorkOS Convex environment runbook (PRD: prds/workos-convex-environment-runbook.md)

- [x] Create runbook PRD with staging and production WorkOS setup for redirects, CORS, and JWT email claim requirements (2026-03-02 22:30 UTC)
- [x] Document exact Convex deployment environment variables for staging and production including required and optional AuthKit auto-provision keys (2026-03-02 22:30 UTC)
- [x] Document frontend environment variables for local and Netlify production along with route verification checklist (2026-03-02 22:30 UTC)
- [x] Update `task.md`, `changelog.md`, and `files.md` to include this runbook deliverable (2026-03-02 22:30 UTC)

### PRD and docs timestamp tracking (PRD: prds/prd-doc-timestamp-tracking.md)

- [x] Add PRD metadata requirements with date and time format in workflow and create-prd skill (2026-03-02 22:18 UTC)
- [x] Add timestamp guidance for task completion logging in task workflow docs (2026-03-02 22:18 UTC)
- [x] Add timestamp guidance for changelog updates in update-project-docs skill and workflow rule (2026-03-02 22:18 UTC)
- [x] Update project docs (`task.md`, `changelog.md`, `files.md`) to reflect this process update (2026-03-02 22:18 UTC)
- [x] Backfill timestamp metadata across existing PRDs in `prds/` (2026-03-02 22:24 UTC)
- [x] Backfill legacy completed task entries with timestamp format in `task.md` (2026-03-02 22:25 UTC)
- [x] Normalize legacy date-only changelog bullets to timestamp format in `changelog.md` (2026-03-02 22:26 UTC)

### MCP and Agent Install UX (PRD: prds/mcp-agent-install-ux.md)

- [x] Create PRD for read-only MCP, ComponentDetail UX, and rollback constraints (2026-02-28 12:00 UTC)
- [x] Define exact SubmitForm to MCP public field mapping and strip non-public submitter fields (2026-02-28 12:00 UTC)
- [x] Add per-component MCP profile generation (`src/lib/mcpProfile.ts`) (2026-02-28 12:00 UTC)
- [x] Build universal prompt composer with deterministic fallback (`src/lib/promptComposer.ts`) (2026-02-28 12:00 UTC)
- [x] Add MCP HTTP endpoints (`convex/http.ts`) (2026-02-28 12:00 UTC)
- [x] Add Use with agents and CLI section in ComponentDetail with badges, prompts, and copy actions (2026-02-28 12:00 UTC)
- [x] Add install snippets for CLI and agent apps (2026-02-28 12:00 UTC)
- [x] Add IP-based rate limiting and request logging for MCP endpoints (2026-02-28 12:00 UTC)
- [x] Ship behind feature flags with documented rollback steps (2026-02-28 12:00 UTC)
- [x] Verify route safety: markdown alias, llms.txt, SPA routes all work (2026-02-28 12:00 UTC)
- [x] Update task.md, changelog.md, and files.md (2026-02-28 12:00 UTC)
- [x] Simplified AgentInstallSection UI: single copy prompt, MCP badge in header, removed toggle (2026-03-02 12:00 UTC)
- [x] Moved Use with agents and CLI section above Keywords for SEO/AEO/GEO (2026-03-02 12:00 UTC)
- [x] Added Use with AI anchor link with ClipboardText icon in header navigation (2026-03-02 12:00 UTC)
- [x] Reordered sections: Use with agents and CLI, then Agent Skill (SKILL.md), then Keywords (2026-03-02 12:00 UTC)

Acceptance checks:

- [x] Component detail route works
- [x] Markdown alias resolves via Netlify Edge Function (unchanged)
- [x] llms.txt routes work (per-component and directory-wide) (unchanged)
- [x] Admin/profile/submission routes unchanged
- [x] MCP endpoints return valid JSON responses
- [x] Universal prompt generates with fallback when SEO enrichment missing
- [x] Copy actions work on detail page

### Submit page pagination and default page size (PRD: prds/submit-pagination-admin-page-size-setting.md)

- [x] Add paginated submissions queries for list and search in `convex/packages.ts`
- [x] Add admin and public settings queries for Submit page default page size (20, 40, 60)
- [x] Update `src/pages/Submit.tsx` to use paging controls and default page size setting
- [x] Add a settings panel in `src/pages/Admin.tsx` to change default Submit page size
- [x] Verify pagination behavior and update docs (`task.md`, `changelog.md`, `files.md`)

### Component URL centralization (PRD: prds/component-url-centralization.md)

- [x] Add shared helper for component detail, markdown alias, and llms URLs
- [x] Update `ComponentDetail.tsx` dropdown with open markdown and AI-link actions using helper
- [x] Add llms link below Keywords in `ComponentDetail.tsx`
- [x] Update `convex/http.ts` markdown and llms link emission to use helper
- [x] Run build and Convex typecheck verification

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

- [x] Unified font sizes between AI generated SEO content and long description markdown in ComponentDetail.tsx (2026-03-05 UTC)

  - Replaced `prose prose-sm` with explicit `text-sm text-text-secondary` selectors
  - Long description now matches SEO content styling
  - Changed "Made by" to "by" in author row

- [x] Updated "Live Demo URL" label to "Live Demo URL or Example App" in SubmitForm.tsx and ComponentDetailsEditor.tsx (2026-03-05 17:45 UTC)

- [x] Fixed long package name overflow in ComponentDetail author row (2026-03-05 15:30 UTC)

  - Added `flex-wrap` to author row so items wrap gracefully instead of overflowing
  - Added `truncate max-w-[280px] sm:max-w-none` to repo name link (truncates on mobile, full on desktop)
  - Added `title` attribute for hover tooltip showing full name when truncated

- [x] Fixed long description markdown rendering and added submit form mini preview (2026-03-05 23:08 UTC)

  - `ComponentDetail.tsx`: long description markdown now preserves line breaks and uses purple links (`#8D2676`) with hover underline
  - `SubmitForm.tsx`: long description now includes safe markdown support guidance and live mini markdown preview
  - Supports headings, bullet lists, line breaks, and markdown links in author-facing submit flow

- [x] Implemented MCP Additive Rollout Phase 1 (2026-03-03 18:00 UTC)

  - Added MCP protocol endpoint at `/api/mcp/protocol` with JSON-RPC 2.0 interface
  - Implemented `initialize`, `tools/list`, and `tools/call` methods
  - Added 5 tools: `search_components`, `get_component`, `get_install_command`, `get_docs`, `list_categories`
  - Added Cursor install link endpoints: `/api/mcp/cursor-install` (global) and `/api/mcp/cursor-install-component` (per-component)
  - Updated `AgentInstallSection` with Cursor install button and config copy
  - Added MCP capability sections to `/api/llms.txt` and `/api/markdown-index`
  - All endpoints log to `mcpApiLogs` table with tool, slug, query, and timing data
  - Preserved all existing routes and UI unchanged
  - PRD: `prds/mcp-additive-rollout-phase1.md`

- [x] Added runtime AI provider failover across admin settings and environment vars (2026-03-04 02:29 UTC)

  - Added `convex/aiProviderFallback.ts` for candidate chain building and sequential fallback execution
  - Added `_getProviderSettingsForFallback` internal query in `convex/aiSettings.ts`
  - Updated `convex/aiReview.ts` and `convex/seoContent.ts` to try active admin, backup admin, then env providers on runtime failures
  - Regenerated Convex bindings (`convex/_generated/api.d.ts`) via `npx convex codegen`
  - Verified via Convex codegen and TypeScript checks

- [x] Fixed TypeScript errors in AgentInstallSection.tsx (2026-03-03 09:30 UTC)

  - Removed undefined `PromptComponentData` type reference
  - Made `npmUrl`, `version`, `description`, `weeklyDownloads` required in local interface
  - Build verified passing (tsc and npm run build)

- [x] Synced Status Legend, Visibility Guide, and Badges across Profile.tsx, Submit.tsx, and Admin.tsx (2026-03-03 09:15 UTC)

  - Profile.tsx: removed Archived and Pending Deletion from Visibility Guide
  - Profile.tsx: added Featured status, updated rejected icon to Prohibit for consistency
  - Profile.tsx: removed DeletionBadge component and markedForDeletion SubmissionCard props
  - Profile.tsx and Submit.tsx: added Badges section (Convex Verified, Community)
  - Verified all three pages share identical status definitions and styling
  - Build verified passing (tsc and npm run build)

- [x] Rebuilt Footer.tsx to match official Convex.dev footer design (2026-03-03 08:25 UTC)

  - Dark background (`#141414`) with Convex design system tokens
  - White Convex wordmark logo, 4 link columns (Product, Developers, Company, Social)
  - Social icons from `/public/*.svg`, external links with `ExternalLinkIcon`
  - "A Trusted Solution" section with green checkmark badges (SOC 2, HIPAA, GDPR)
  - Responsive grid layout, dynamic copyright year
  - Fixed asset paths for Vite base URL (`/components/` prefix)
  - Original footer saved as `FooterBackup.tsx`

- [x] Updated Directory sort label text from "Verified first" to "Verified" and revalidated production build (2026-03-03 07:52 UTC)

  - Updated desktop and mobile sort display labels in `src/pages/Directory.tsx`
  - Confirmed `npm run build` passes for Netlify style output

- [x] Added Related Components section to component detail pages (2026-03-03 07:29 UTC)

  - New `getRelatedComponents` query scoring by category, tags, and downloads
  - Compact no-thumbnail cards (max 3) below View llms.txt with border divider
  - New `showRelatedOnDetailPage` admin setting with toggle in AI Review Settings panel (on by default)
  - Updated `getAdminSettings` and `updateAdminSetting` to support new key
  - Updated `files.md`, `changelog.md`, and `task.md`
  - Build verified passing

- [x] Added Component Authoring Challenge banner to Directory page (2026-03-03 07:15 UTC)

  - Created `src/components/ChallengeBanner.tsx` with dark background, grid texture, and pink bordered CTA button
  - Uses inline SVG data URL based on `public/banner-grid.svg` with boosted stroke visibility for dark backgrounds
  - Placed above FAQSection in `src/pages/Directory.tsx`
  - Updated `files.md`, `changelog.md`, and `task.md`
  - Build verified passing

- [x] Fixed Convex return validator mismatch for private message thread payloads (2026-03-03 06:44 UTC)

  - Updated `getPackageComments` return validator in `convex/packages.ts` to include optional `statusUpdatedAt`
  - Resolved runtime `ReturnsValidationError` caused by archived or hidden message records
  - Verified with local build and Convex function validation

- [x] Updated Directory badge placement for community-only component cards (2026-03-03 06:32 UTC)

  - Adjusted `src/components/ComponentCard.tsx` so Community-only listings render in the same right-side badge slot as Verified
  - Preserved dual-badge order when both badges are present (Community then Verified)
  - Verified with production build

- [x] Added hidden or archived message toggle and restore controls in Profile and Admin message modals (2026-03-03 06:32 UTC)

  - Added `Show hidden or archived` toggle in both modals
  - Added `Restore` action for owned hidden and archived messages
  - Updated backend message queries to support optional `includeInactive`
  - Confirmed admin own notes deletion remains enforced in backend and UI

- [x] Fixed private message routing and ownership controls between Profile and Admin (2026-03-03 06:24 UTC)

  - Profile requests now write to private `packageComments` message thread
  - Admin `Comments` panel now represents private submitter/admin messages, not public frontend comments
  - `Submit.tsx` no longer renders package comments publicly
  - Added message lifecycle controls for authored messages: hide, archive, delete
  - Enforced backend authorization for note/comment ownership operations

- [x] Published team handoff guide for WorkOS Connect with Convex and Netlify (2026-03-03 01:28 UTC)

  - Updated `prds/workos-convex-environment-runbook.md` with final working configuration and explicit route policy
  - Added `prds/workos-connect-convex-netlify-how-to.md` with development, staging, and production setup sections
  - Included route matrix for public, authenticated, admin, and non app alias routes
  - Excluded secrets and used placeholders for safe sharing in Notion

- [x] Added Community badge toggle to Admin Actions row (2026-03-03)

  - Added `communitySubmitted` prop to `InlineActions` component
  - Added `handleToggleCommunity` handler calling `updateComponentDetails` mutation
  - Added Community toggle button with `Users` icon and Community badge color scheme
  - Button positioned next to Convex Verified toggle in Actions row
  - Passed `communitySubmitted` prop through to `InlineActions` from package data
  - Build verified passing

- [x] Finalized Connect environment variable guidance after admin doc cross-check (2026-03-03 01:12 UTC)

  - Confirmed this app uses WorkOS Connect OAuth client credentials with AuthKit domain based OAuth endpoints
  - Validated local `.env.local` requires `VITE_WORKOS_CLIENT_ID`, `VITE_WORKOS_REDIRECT_URI`, and `VITE_WORKOS_AUTHKIT_DOMAIN`
  - Confirmed Convex dev and prod require `WORKOS_CLIENT_ID` and `WORKOS_AUTHKIT_DOMAIN`
  - Updated session docs to reflect Connect domain requirements in runbook and migration PRD

- [x] Switched app auth flow to WorkOS Connect OAuth with PKCE and Convex token bridge (2026-03-03 00:26 UTC)

  - Added `src/lib/connectAuth.tsx` provider and hook for OAuth authorize, callback exchange, token storage, and sign out
  - Updated `src/main.tsx` to use `ConnectAuthProvider` + `ConvexProviderWithAuthKit` with custom connect hook
  - Updated `src/lib/auth.tsx` to use connect `signIn`/`signOut` while keeping `useConvexAuth` auth state
  - Updated `convex/auth.config.ts` to validate JWT with `WORKOS_AUTHKIT_DOMAIN` issuer and `/oauth2/jwks`
  - Updated `.env.local` example and runbook with `VITE_WORKOS_AUTHKIT_DOMAIN` and `WORKOS_AUTHKIT_DOMAIN`
  - Removed direct `@workos-inc/authkit-react` dependency
  - Verification: `tsc -p convex`, `tsc -p .`, and `npm run build` passed

- [x] Migrated auth wiring from legacy Convex Auth to WorkOS AuthKit across frontend and Convex backend (2026-03-02 23:42 UTC)

  - Updated `src/main.tsx` provider stack to `AuthKitProvider` + `ConvexProviderWithAuthKit`
  - Updated `src/lib/auth.tsx` to use WorkOS `signIn` and `signOut`
  - Reworked `convex/auth.ts` admin and user checks to use `ctx.auth.getUserIdentity()`
  - Updated `convex/auth.config.ts` to WorkOS dual JWT providers with `WORKOS_CLIENT_ID`
  - Removed legacy auth coupling from `convex/http.ts` and `convex/schema.ts`
  - Updated `convex/packages.ts` ownership email resolution to identity claims
  - Verified with `npm run lint`

- [x] Added Community badge feature for community-submitted components (2026-03-02 12:00 UTC)

  - New `communitySubmitted` field on packages schema
  - Created `CommunityBadge` component with `#E9DDC2` background color
  - Badge appears between downloads and Verified on Directory cards
  - Badge appears below Verified and above downloads in ComponentDetail sidebar
  - Admin checkbox in ComponentDetailsEditor for toggling Community status
  - Updated all validators and helper functions (`directoryCardValidator`, `publicPackageValidator`, `adminPackageValidator`, `toPublicPackage`, `toAdminPackage`)
  - Updated queries (`listApprovedComponents`, `getFeaturedComponents`) and mutation (`updateComponentDetails`)
  - Passed through Admin.tsx `PackageComponentDetailsEditor` wrapper
  - Build verified passing

- [x] Fixed `View llms.txt` visibility when keywords are missing (2026-02-27 12:00 UTC)

  - Moved llms link out of the Keywords conditional in `src/pages/ComponentDetail.tsx`
  - Link now renders whenever component links are available, regardless of tags
  - Verified with `npx tsc -p . --noEmit --pretty false`

- [x] Synced session docs for pagination and markdown link updates (2026-02-27 12:00 UTC)

  - Updated `files.md` with Submit pagination APIs and admin setting query coverage
  - Updated PRD index in `files.md` with session PRDs
  - Updated `changelog.md` unreleased notes to reflect completed session documentation

- [x] Updated Netlify markdown alias PRD with centralized helper and local fallback notes (2026-02-27 12:00 UTC)

  - Documented why alias URLs are production-only and why localhost must use Convex API endpoints
  - Added guidance for shared URL helper usage to prevent route drift across frontend and Convex HTTP output
  - Captured verification matrix for local and production link behavior

- [x] Fixed localhost markdown and llms dropdown links after URL centralization (2026-02-27 12:00 UTC)

  - Added client-aware URL strategy in `shared/componentUrls.ts`
  - Localhost now resolves markdown and llms links to Convex HTTP endpoints
  - Netlify production remains on alias URLs backed by edge function and redirects
  - Verified with `npx tsc -p . --noEmit`, `npx tsc -p convex/tsconfig.json --noEmit`, and `npm run build`

- [x] Added Submit page pagination with admin default page size control (2026-02-27 12:00 UTC)

  - Added paginated public queries in `convex/packages.ts` for Submit list and search views
  - Added admin and public setting queries plus admin mutation for Submit default page size (`20`, `40`, `60`)
  - Updated `src/pages/Submit.tsx` to load paged results with Previous and Next controls
  - Updated `src/pages/Admin.tsx` with a new Settings panel to configure Submit default page size
  - Verified with `npx tsc -p convex -noEmit --pretty false` and `npx tsc -p . -noEmit --pretty false`

- [x] Centralized component markdown and llms URL generation (2026-02-27 12:00 UTC)

  - Added shared helper at `shared/componentUrls.ts` for detail, markdown alias, and llms URL construction
  - Updated `src/pages/ComponentDetail.tsx` dropdown with `Open markdown file`, `Open in ChatGPT`, `Open in Claude`, and `Open in Perplexity`
  - Added `View llms.txt` link below Keywords on component detail page
  - Updated `convex/http.ts` to use centralized URL generation in `/api/markdown-index` and `/api/component-llms`
  - Verified with `npm run build`, `npx tsc -p convex/tsconfig.json --noEmit`, and `npx tsc -p . --noEmit`

- [x] Kept markdown alias URL on Netlify domain (2026-02-27 12:00 UTC)

  - Added Netlify Edge Function mapping for `/components/*/*.md`
  - Added `netlify/edge-functions/component-markdown.ts` to resolve markdown by slug
  - Removed client-side redirect for markdown alias from router
  - Alias now serves markdown without switching browser URL to Convex domain

- [x] Added markdown alias URL support for component slugs (2026-02-27 12:00 UTC)

  - Added route handling for `/components/<slug>/<slug>.md`
  - Client router now redirects alias URL to Convex markdown endpoint
  - Keeps SPA/admin routes stable while providing markdown access path

- [x] Fixed Netlify SPA routing and GitHub avatar URLs (2026-02-27 12:00 UTC)

  - Fixed routes like `/components/submissions/admin` returning 404 markdown
  - Replaced greedy named-parameter redirect rules with explicit splat suffix rules:
    - `/components/*.md` for markdown
    - `/components/*/llms.txt` for per-component llms
  - Changed avatar URL format to `https://avatars.githubusercontent.com/{username}` (more reliable CDN)
  - Added `migrateAvatarUrls` admin mutation to fix existing database records
  - Main `/components/llms.txt` and `/components.md` still work

- [x] Created Tremendous Rewards Integration PRD (2026-02-27 12:00 UTC)

  - Full PRD at `prds/tremendous-rewards-integration.md`
  - Documents Tremendous API setup, SDK usage, and environment variables
  - Defines new `payments` table schema and package reward fields
  - Specifies Send Reward button placement in Admin Actions row
  - Includes PaymentBadge, RewardSettingsPanel, and auto-send feature specs
  - Links to official Tremendous docs: API reference, Node SDK, sandbox testing
  - Ready for implementation

- [x] Applied Convex return validator best practices to internal functions (2026-02-26 12:00 UTC)

  - Removed redundant `returns: v.null()` from 5 internal mutations (`_saveSeoContent`, `_updateSeoStatus`, `_setSeoError`, `_updateThumbnailJob`, `_saveGeneratedThumbnail`)
  - Removed `returns: v.union(v.null(), v.any())` from 2 internal queries (`_getPackage`, `_getPackageByName`)
  - Fixed `ctx.db.patch` API bugs in `seoContentDb.ts` (was incorrectly passing table name as first argument)
  - Fixed `ctx.db.get` API bug in `packages.ts` (was incorrectly passing table name before ID)
  - Added `.cursor/skills/convex-return-validators/SKILL.md` for future reference
  - No behavioral changes; TypeScript inference handles return types for internal functions

- [x] AI Review Results panel collapsed by default in Admin dashboard (2026-02-26 12:00 UTC)

  - Entire panel now collapsed by default, showing only status icon, label, and date
  - Single toggle expands/collapses all content (summary, error, and criteria)
  - Removed nested toggle (previously had outer panel + inner criteria toggle)
  - Copy button accessible on collapsed header row via stopPropagation
  - Reduces vertical space in admin package rows

- [x] Removed user visibility controls from Profile page (2026-02-26 12:00 UTC)

  - Removed Hide, Show, Delete, and Cancel Deletion buttons from user profile
  - Users must contact admin via "Send Request" to manage component visibility
  - Removed `ConfirmModal` component (no longer needed)
  - Removed `setVisibility`, `deleteSubmission`, `cancelDeleteSubmission` mutations from Profile
  - Removed `onHide`, `onShow`, `onDelete`, `onCancelDelete` props from SubmissionCard
  - Removed `ArrowCounterClockwise` icon import
  - Updated deletion message to guide users to contact admin
  - Admin retains full control via Admin dashboard
  - Build verified passing

- [x] Added Download Skill button for SKILL.md files (2026-02-25 12:00 UTC)

  - Download button with Phosphor FileArrowDown icon next to Markdown dropdown in author row
  - Button only appears when SKILL.md has been generated (after SEO content generation runs)
  - SKILL.md section now has both copy and download buttons
  - Downloads as `SKILL.md` file for easy saving to project
  - Uses browser Blob API for client-side file generation

- [x] Directory sidebar sticky position adjusted (2026-02-25 12:00 UTC)

  - Changed sticky top from `top-6` to `top-20` (80px from viewport top)
  - Submit button now remains visible below the header when scrolling
  - Entire sidebar (Submit, Search, Sort, Categories) stays sticky together

- [x] SEO Prompt Versioning and Multi-Provider AI support (2026-02-25 12:00 UTC)

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

- [x] Added Actions row to Admin InlineActions panel (2026-02-25 12:00 UTC)

  - New "Actions" row above Status and Visibility rows in expanded package view
  - Convex Verified toggle button (teal, shows fill when verified)
  - Regenerate SEO + Skill button (shows spinner during generation, green when completed)
  - Combined Auto-fill button (fills author from GitHub and description from npm in parallel)
  - Hide Thumbnail toggle (orange, only shows when thumbnail exists, hides in category but shows in Featured)
  - Auto-fill shows what was filled in success toast
  - All buttons match existing Admin theme with Phosphor icons
  - Added useEffect hooks for author/avatar/verified field sync in ComponentDetailsEditor
  - PRD: `prds/admin-actions-row.md`

- [x] Added hide from submissions page feature for admin control (2026-02-25 12:00 UTC)

  - New `hideFromSubmissions` field on packages schema
  - `toggleHideFromSubmissions` mutation to toggle visibility on Submit.tsx
  - `listPackages` and `searchPackages` filter out hidden packages
  - Toggle button in Admin.tsx package row labeled "Sub Hide" / "Sub Hidden" to differentiate from directory Hide
  - Hidden packages still appear in Directory if approved
  - Admin panel shows all packages regardless of this setting
  - PRD: `prds/hide-from-submissions.md`

- [x] Added featured components sort order for admin control (2026-02-25 12:00 UTC)

  - New `featuredSortOrder` field on packages schema
  - `getFeaturedComponents` query sorts by `featuredSortOrder` (nulls last), then newest first
  - `setFeaturedSortOrder` mutation for admin to set order value
  - Sort order input in Admin.tsx next to Featured toggle (only shown when featured)
  - Dropdown sort (downloads, newest, etc.) does NOT affect Featured section order
  - PRD: `prds/featured-sort-order.md`

- [x] Added hide thumbnail in category option for components (2026-02-25 12:00 UTC)

  - New `hideThumbnailInCategory` field on packages schema
  - Checkbox in Admin Component Details editor (visible when thumbnail exists)
  - Thumbnails always shown in Featured section
  - Thumbnails hidden in category listings when checkbox is checked
  - Fixed: Added field to `directoryCardValidator` and query return maps (`listApprovedComponents`, `getFeaturedComponents`)
  - Updated `ComponentCard` with `showThumbnail` prop override
  - PRD: `prds/hide-thumbnail-in-category.md`

- [x] Imported 41 official Convex components to production database (2026-02-24 12:00 UTC)

  - Created `seedOfficialComponents` internal action with `importAsPending` and `dryRun` flags
  - Added `browser-use` component (AI category) and synced with convex.dev/components source
  - Renamed `_upsertSeededComponent` to `_upsertOfficialComponent` with improved logic
  - Preserves existing `reviewStatus` on updates, only sets new status on inserts
  - Returns detailed stats: total, created, updated, failed, dryRun, wouldImport
  - Legacy `seedExistingComponents` alias preserved for backward compatibility
  - Production import: 27 created as pending, 14 updated, 0 failed
  - Run: `npx convex run --prod seed:seedOfficialComponents '{"importAsPending": true}'`

- [x] Added pagination with configurable items per page to Admin panel (2026-02-24 12:00 UTC)
  - Package list now shows 20 items per page by default
  - Page navigation with Previous/Next buttons and numbered page buttons
  - Items per page dropdown (5, 10, 20, 40, 100) next to sort dropdown
  - Each filter tab (All, Pending, Review, Approved, Changes, Rejected, Deletion, Archived) maintains its own page state
  - "Showing X-Y of Z" counter updates based on current page and items per page
  - Page resets to 1 when changing filter or items per page
- [x] Reordered icons in Admin package rows (2026-02-24 12:00 UTC)
  - Moved ComponentDetailQuickLink (external link icon) to be last in the badge group
  - Order is now: StatusBadge, VisibilityBadge, UnrepliedNotesIndicator, ComponentDetailQuickLink
  - Icon remains before the downloads/date section on the far right
- [x] Added LLMs.txt and Markdown clean URL support (2026-02-24 12:00 UTC)
  - New `/api/markdown-index` endpoint for directory-wide markdown
  - New `/api/component-llms` endpoint for per-component llms.txt
  - Added 6 Netlify redirects for clean URLs: `/components/llms.txt`, `/components.md`, `/components/:slug/llms.txt`, `/components/:slug.md`, plus scoped package variants
  - All endpoints tested and working via Convex site URL
- [x] Moved Keywords section below Agent Skill (SKILL.md) section on ComponentDetail.tsx (2026-02-24 12:00 UTC)
  - Keywords tags now appear after the SKILL.md copyable snippet
  - Improves page hierarchy: SEO content > SKILL.md > Keywords
- [x] Moved Markdown dropdown to author row on ComponentDetail.tsx (2026-02-24 12:00 UTC)
  - Dropdown relocated from sidebar to main content area (author row)
  - Appears after author info with separator
  - Same functionality: View as Markdown, Copy as Markdown, Copy page URL
- [x] Commented out GitHub Issues feature on ComponentDetail.tsx (2026-02-24 12:00 UTC)
  - Issues badge button in author row commented out
  - Full issues panel (open/closed tabs, issue list, pagination) commented out
  - Code preserved for future re-enabling
- [x] Added clear logo button in Component Details editor (2026-02-24 12:00 UTC)
  - Clear button next to download button when logo exists
  - New `clearLogo` mutation in `convex/packages.ts` to remove logo URL and storage reference
  - Added `clearingLogo` state and `handleClearLogo` handler in `ComponentDetailsEditor.tsx`
  - Matches existing thumbnail clear functionality
- [x] Fixed SubmitForm.tsx success modal button layout (2026-02-23 12:00 UTC)
  - Buttons now display horizontally with `flex-row` instead of stacked
  - Improved spacing with `gap-3` and `inline-flex` for alignment
  - Changed font weight to medium and text color to primary for outline button
- [x] Fixed SubmitForm.tsx tags validator mismatch (2026-02-23 12:00 UTC)
  - Backend `submitPackage` expects `tags: v.optional(v.string())` (comma-separated string)
  - SubmitForm.tsx was incorrectly sending tags as an array
  - Changed to `tags.trim() || undefined` to match the validator
  - Fixes "ArgumentValidationError: Value does not match validator" on live site submissions
- [x] Enhanced SEO support for ComponentDetail pages (2026-02-24 12:00 UTC)
  - Added Twitter Card meta tags (summary_large_image with thumbnail)
  - Added canonical URL tag for duplicate content prevention
  - Added og:site_name and og:image:alt tags for better sharing
  - New `setComponentSeoTags()` consolidated helper in seo.ts
  - New `setTwitterTags()` and `setCanonicalUrl()` functions
  - Fixed index.html Twitter meta tags (changed `property` to `name`)
  - Updated index.html URLs to production domain (www.convex.dev/components)
- [x] AI Provider Settings and Prompt Versioning feature (2026-02-23 12:00 UTC)
  - Added `aiProviderSettings` and `aiPromptVersions` tables to schema
  - Created `convex/aiSettings.ts` with provider and prompt management functions
  - Updated `convex/aiReview.ts` to support Anthropic, OpenAI, and Google Gemini
  - Added `AiProviderSettingsPanel` in Admin Settings (API key, model, docs links)
  - Added `AiPromptSettingsPanel` in Admin Settings (edit, version history, restore)
  - Environment variables still work as default fallback
  - PRD: `prds/ai-provider-settings-and-prompt-versioning.md`
- [x] Commented out badge section on ComponentDetail.tsx until endpoint is working (2026-02-23 12:00 UTC)
  - "Add badge to your README" UI section hidden
  - Badge markdown line in buildMarkdownDoc function also commented out
  - Ready to re-enable when badge feature is implemented
- [x] Added auto-fill description button in Component Details editor (2026-02-23 12:00 UTC)
  - "Auto-fill from Package" button next to Long Description field
  - Copies npm/repo description from Package Metadata into Long Description
  - Admin can then edit the description before saving
  - Updated `ComponentDetailsEditor.tsx` with new `npmDescription` prop
  - Updated `PackageComponentDetailsEditor` in Admin.tsx to pass `pkg.description`
- [x] Fixed production legacy GitHub OAuth "Missing sign-in verifier" error (2026-02-23 12:00 UTC)
  - Updated the legacy auth package to resolve verifier handling
  - Configured GitHub OAuth callback URL: `https://giant-grouse-674.convex.site/api/auth/callback/github`
  - Generated production JWT keys with the legacy auth CLI
  - Set `SITE_URL` to `https://components-directory.netlify.app/components`
  - Created `prds/authfix-2026-02-23.md` documenting the fix
- [x] Added router redirect for paths without `/components` prefix (2026-02-23 12:00 UTC)
  - `/dodo` now redirects to `/components/dodo`
  - Ensures consistent URL structure across local and production
  - Updated `prds/routes-components-fix.md` with new redirect behavior
- [x] Moved FAQSection from Submit.tsx to Directory.tsx (2026-02-23 12:00 UTC)
  - FAQ now displays below component cards on the main directory page
  - Removed from submissions page
  - Updated heading font to `font-semibold` to match "Components" section heading
- [x] Expanded FAQSection to 8 questions (2026-02-23 12:00 UTC)
  - Added: sandboxing, what projects should use, pricing
  - Updated "Can I build my own?" with fuller text
  - Updated "What happens after I submit?" with authoring guidelines link
  - Updated `prds/faq-questions.md` to match
- [x] Added site footer with Convex links (2026-02-23 12:00 UTC)
  - Created `src/components/Footer.tsx` component
  - Convex wordmark logo (40px height) on the left linking to convex.dev
  - GitHub repo and Discord links on the right
  - 50px top padding above footer
  - Responsive layout for mobile/desktop
  - Integrated into global layout in `src/main.tsx`
- [x] Fixed user email not appearing in profile/submissions after legacy GitHub OAuth (2026-02-23 12:00 UTC)
  - Legacy auth stored user data in database rather than JWT claims
  - Added legacy user id lookup helper to fetch user email from database
  - Updated `loggedInUser` and `isAdmin` queries to use database lookup
  - Updated `requireAdminIdentity` and `getAdminIdentity` helpers
  - Added `getCurrentUserEmail` helper in packages.ts
  - Updated all queries/mutations that used `ctx.auth.getUserIdentity()` for email
  - Submissions now correctly match by email from the users table
- [x] Verified GitHub OAuth sign-in flow works end to end (2026-02-23 12:00 UTC)
- [x] Verified admin access for `wayne@convex.dev` at `/components/submissions/admin` (2026-02-23 12:00 UTC)
- [x] Set `SITE_URL` to `http://localhost:5173/components` for correct OAuth redirect (2026-02-23 12:00 UTC)
- [x] Migrated authentication from an older auth provider to a prior legacy GitHub auth stack (2026-02-23 12:00 UTC)
  - Replaced the previous auth integration with a GitHub OAuth based stack
  - Updated `convex/auth.ts` to use provider based OAuth wiring
  - Created `convex/auth.config.ts` for JWT provider configuration
  - Deleted `convex/convex.config.ts` (not needed for that legacy auth stack)
  - Deleted `convex/auth/session.ts` (legacy compatibility cleanup)
  - Updated `convex/http.ts` to use `auth.addHttpRoutes(http)`
  - Updated `convex/schema.ts` to include legacy auth tables
  - Updated `src/main.tsx` with legacy auth provider wiring
  - Updated `src/lib/auth.tsx` with legacy auth action hooks and `useConvexAuth`
  - Added redirect logic in Router for paths not starting with `/components`
  - Generated and set legacy JWT signing environment variables in Convex Dashboard
  - Restored `as any` type casts in `convex/crons.ts` and `convex/http.ts` for type inference issues
  - Cleared Vite dependency cache (`node_modules/.vite`) to fix 504 Outdated Optimize Dep error
  - Added `jose` dev dependency for JWT key generation
- [x] Migrated from Convex self-hosting to Netlify (2026-02-23 12:00 UTC)
  - Removed `@convex-dev/self-hosting` dependency
  - Simplified `convex/convex.config.ts` (no components)
  - Removed `registerStaticRoutes()` from `convex/http.ts`
  - Deleted `.env.production` (use Netlify Dashboard env vars)
  - Changed `vite.config.ts` to `base: "/"` for asset serving
  - Updated `netlify.toml` with proper SPA routing redirects
  - Production URL: `https://components-directory.netlify.app`
  - WorkOS callback: `https://components-directory.netlify.app/components/callback`
- [x] SKILL.md generation for AI agent integration (2026-02-23 12:00 UTC)
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
- [x] Configured Netlify SPA routing for /components/\* (2026-02-23 12:00 UTC)
  - Router in `src/main.tsx` strips `/components` prefix for route matching
  - `netlify.toml` redirects `/` to `/components` (301)
  - `netlify.toml` redirects `/components` and `/components/*` to `/index.html` (200)
  - Netlify env vars required: `VITE_CONVEX_URL`, `VITE_WORKOS_CLIENT_ID`, `VITE_WORKOS_REDIRECT_URI`
- [x] Slug Migration Tool for admin dashboard (2026-02-23 12:00 UTC)
  - Added `SlugMigrationPanel` component to Admin Settings tab
  - Displays count and list of packages missing URL slugs
  - "Generate All Slugs" button for bulk slug generation
  - Individual "Generate" button per package in the migration panel
  - Added `GenerateSlugButton` component to package cards (orange, next to npm/repo/demo/refresh)
  - Button only shows when package has no slug, disappears after generation
  - New backend functions: `getPackagesWithoutSlugs`, `generateSlugForPackage`, `generateMissingSlugs`
  - Added `LinkSimple` icon import from phosphor-icons
- [x] Fixed ComponentDetailsEditor reactive slug sync (2026-02-23 12:00 UTC)
  - Added `useEffect` hook to sync local slug state when `initialSlug` prop changes from backend
  - Slug now appears immediately after clicking "Generate Slug" without needing page refresh
  - Matches existing reactive behavior for thumbnail, logo, and template fields
- [x] Soft deletion workflow for components (2026-02-23 12:00 UTC)
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
- [x] Account deletion requires deleting all components first (2026-02-23 12:00 UTC)
  - Delete Account modal shows warning if user has active submissions
  - User must delete all components before deleting their account
  - `deleteMyAccount` mutation now throws error if active submissions exist
  - Updated Account section and modal text to explain new flow
- [x] Admin Deletion Management panel in Settings (2026-02-23 12:00 UTC)
  - Added `DeletionManagementPanel` component to Admin.tsx Settings tab
  - Toggle for auto-delete marked packages (`autoDeleteMarkedPackages` setting)
  - Configurable waiting period (1, 3, 7, 14, or 30 days)
  - List of packages pending deletion with "Delete Now" button
  - Added `adminPermanentlyDeletePackage` mutation for admin manual deletion
  - Added `getPackagesMarkedForDeletion` query
  - Added `getDeletionCleanupSettings` query
  - Added `updateDeletionCleanupSetting` mutation
- [x] Admin "Marked for Deletion" filter tab (2026-02-23 12:00 UTC)
  - Added "Deletion" tab to Admin filter bar with Clock icon
  - Tab shows count of packages marked for deletion
  - Filter displays only packages with `markedForDeletion: true`
  - Package rows show red "Deletion" badge next to visibility badge when marked
  - Updated `VisibilityBadge` component to accept `markedForDeletion` prop
- [x] Updated Profile.tsx deletion badge display (2026-02-23 12:00 UTC)
  - "Pending Deletion" badge now shown next to status and visibility badges
  - Badges no longer conditionally hidden when marked for deletion
- [x] Scheduled deletion cleanup cron job (2026-02-23 12:00 UTC)
  - Added `cleanup-marked-for-deletion` cron job in `convex/crons.ts`
  - Runs daily at 2 AM UTC
  - Deletes packages past the configurable waiting period
  - Gated by `autoDeleteMarkedPackages` admin setting
  - Added `scheduledDeletionCleanup` internal mutation
- [x] Header floating pill redesign (2026-02-23 12:00 UTC)
  - Floating pill design with `rounded-full`, white/95 background, backdrop blur, and shadow
  - Convex wordmark black SVG logo (70px height)
  - Added GitHub, Discord, and Docs icons to right side of header
  - Navigation links (Directory, Submissions, Submit) with medium font weight
  - Removed user email from profile dropdown
  - Header height: 3.438rem
  - Mobile menu fixed: separate dropdown card below header pill (rounded-2xl)
- [x] SubmitForm.tsx layout improvements (2026-02-23 12:00 UTC)
  - Removed "Back to Directory" breadcrumb link
  - Moved "Submit a Component" title above the form box to match Profile.tsx style
  - Description text remains inside the form box
- [x] FAQSection component extraction and expansion (2026-02-22 12:00 UTC)
  - Extracted FAQ section from SubmitForm.tsx into reusable `src/components/FAQSection.tsx`
  - Added FAQSection to bottom of Submit.tsx (submissions directory page)
  - Expanded FAQ content with new questions:
    - How are components sandboxed?
    - Can I build my own?
    - Do components cost money to use?
  - Updated review process answer to mention rolling basis review
  - Updated requirements answer to remove demo requirement
- [x] Page layout alignment (2026-02-22 12:00 UTC)
  - Submit.tsx page width now matches Directory.tsx (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`)
  - SubmitForm.tsx page width now matches Profile.tsx (`max-w-3xl`)
  - Submit.tsx title "Components Submissions Directory" styled to match Directory.tsx
  - Search input background changed to white on Submit.tsx
- [x] Convex self-hosting integration (2026-02-22 12:00 UTC)
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
- [x] Auto sign-in redirect for `/submit` page (2026-02-22 12:00 UTC)
  - Unauthenticated users visiting `/submit` now auto-redirect to WorkOS sign-in
  - `useEffect` hook in `SubmitForm.tsx` triggers `signIn()` automatically when not authenticated
  - Stores current path in localStorage before redirect
  - `AuthCallback` reads stored path and returns user to `/submit` after auth
  - Replaced sign-in gate UI with "Redirecting to sign in..." loading spinner
- [x] Mark as read notifications (2026-02-22 12:00 UTC)
  - Added `adminHasRead` field to `packageNotes` and `packageComments` schemas
  - Admin Notes panel auto-marks user notes as read when opened
  - Admin Comments panel auto-marks comments as read when opened
  - User Profile Messages modal shows unread count and "Mark all read" button
  - Notes button shows blue badge for unread user notes (red for unreplied requests)
  - Comments button shows blue badge for unread comments
  - Added `markNotesAsReadForAdmin`, `markCommentsAsReadForAdmin` mutations
  - Added `getUnreadUserNotesCount`, `getUnreadCommentsCount` queries
- [x] Admin submitter email editor (2026-02-22 12:00 UTC)
  - Added `SubmitterEmailEditor` component in Admin panel for editing submitter emails
  - Admin can edit primary submitter email to link submissions to user accounts
  - Admin can add additional emails for multi-account access
  - Added `updateSubmitterEmail` mutation for changing primary email
  - Useful for submissions created before auth was added
- [x] Admin page UX improvements (2026-02-22 12:00 UTC)
  - Changed sign-in message from "Sign in with your @convex.dev email..." to "Admin access only"
  - Non-admin users are now automatically redirected to `/profile` instead of seeing "Access Denied"
  - Added `RedirectToProfile` component for seamless redirect with loading spinner
- [x] User profile enhancements (2026-02-22 12:00 UTC)
  - Fixed duplicate "My Submissions" title and "Submit New" button
  - Added user-controlled visibility: hide/show submissions from directory
  - Added delete submission with confirmation modal
  - Added edit submission modal (component name, description, category, tags, demo/video URLs)
  - Added additionalEmails field to schema for multi-account access
  - Updated getMySubmissions to check both submitterEmail and additionalEmails
  - Added visibility guide to status guide section
  - Users can now manage only their own submissions
- [x] Changed admin route from `/submit/admin` to `/submissions/admin` (2026-02-22 12:00 UTC)
  - Admin dashboard now accessible at `/submissions/admin`
  - Note: WorkOS JWT template must include `"email": {{ user.email }}` for admin auth to work
- [x] Fixed WorkOS AuthKit sign-in flow (2026-02-22 12:00 UTC)
  - OAuth callback component now waits for AuthKit session before redirecting to `/submit`
  - Sign-in buttons call `signIn()` directly per Convex WorkOS docs
  - Added `VITE_WORKOS_REDIRECT_URI` env variable for explicit redirect configuration
  - Removed `getSignInUrl()` workaround in favor of direct `signIn()` calls
  - Profile page sign-in now works correctly
- [x] Reorganized submission routes (2026-02-22 12:00 UTC)
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

- [x] SubmitForm.tsx layout update (2026-02-22 12:00 UTC)
  - Checkboxes moved inside form, above submit button
  - Submit button disabled until all 3 checkboxes checked
  - FAQ section below form, Terms links at bottom
- [x] Refactored auth flow with shared Header component (2026-02-22 12:00 UTC)
  - Created `src/components/Header.tsx` with global navigation and user menu
  - Header displays on all pages: Directory, Submit, Profile, Admin, ComponentDetail, NotFound
  - User menu shows avatar, email, My Submissions link, Sign Out button
  - Sign In button for unauthenticated users
- [x] Submit form refactored to dedicated page (2026-02-22 12:00 UTC)
  - Replaced `Submit.tsx` modal approach with `SubmitForm.tsx` page
  - Auth gate: shows sign-in UI for unauthenticated users
  - Full form for authenticated users
  - Success modal links to profile page
- [x] WorkOS AuthKit integration replacing the legacy auth stack (2026-02-22 12:00 UTC)
  - Installed `@workos-inc/authkit-react` and `@convex-dev/workos`
  - Configured `convex/auth.config.ts` with WorkOS JWT providers
  - Updated admin authorization to use `ctx.auth.getUserIdentity()`
  - Dynamic Vite base path (`/` local, `/components/` production)
- [x] User profile page at `/profile` for managing submissions (2026-02-22 12:00 UTC)
  - Lists user's submitted components with status badges
  - "Send Request" button to message admin team
  - `getMySubmissions` query and `requestSubmissionRefresh` mutation
  - `by_submitter_email` index on packages table
- [x] OAuth callback redirect to `/submit` (2026-02-22 12:00 UTC)
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
