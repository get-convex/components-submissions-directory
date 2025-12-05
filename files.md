# Files Overview

This document provides a brief description of each file in the codebase and how it works.

## Root Configuration Files

### `package.json`

Defines project dependencies, scripts, and metadata. Includes React, Convex, Vite, TypeScript, and development tools. Scripts handle parallel dev server execution and production builds.

### `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

TypeScript configuration files for different parts of the project. `tsconfig.json` is the base config, `tsconfig.app.json` is for the React app, and `tsconfig.node.json` is for Node.js tooling.

### `vite.config.ts`

Vite build configuration. Sets up React plugin, path aliases, and configurable base path for deployment. Toggle between "/" for localhost and "/components/submit/" for convex.dev deployment by commenting/uncommenting the base path lines.

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

Database schema definition. Defines the `packages` table with all package fields including submitter information (name, email, Discord), review status (pending, in_review, approved, changes_requested, rejected), visibility (visible, hidden, archived), featured flag, demoUrl for live demos, and AI review fields (aiReviewStatus, aiReviewSummary, aiReviewCriteria, aiReviewedAt, aiReviewError). Also defines `packageNotes` table for threaded admin notes, `packageComments` table for public comments, and `adminSettings` table for AI automation preferences. Includes indexes for name lookup, submission date sorting, review status filtering, visibility filtering, admin settings lookup, and full-text search on name, description, and maintainer names. Also includes auth tables from Convex Auth.

### `convex/auth.ts`

Authentication setup using Convex Auth. Configures Password and Anonymous providers. Exports `loggedInUser` query to get current user info and `isAdmin` query to check if user has @convex.dev email.

### `convex/auth.config.ts`

Auth configuration file. Currently minimal, can be expanded for additional auth providers.

### `convex/aiReview.ts`

AI-powered package review system with security best practices. Contains:

- `REVIEW_CRITERIA`: 10 criteria for validating Convex components (4 critical, 6 non-critical)
- `fetchGitHubRepo`: Fetches source code from GitHub repositories, detects convex.config.ts in multiple locations (convex/src/component/, convex/component/, convex/, src/component/, src/, root, packages/, lib/)
- `runAiReview`: Action that orchestrates the AI review process using Anthropic Claude API
- Uses internal query (`internal.packages._getPackage`) for full package data access including repositoryUrl
- AI prompts only include code and package metadata (never user PII like submitter emails)
- Auto-approve/reject actions use "AI" identifier (not fake email format)
- Analyzes packages against official Convex component specifications
- References official Convex documentation in AI prompt for accurate suggestions
- Handles deeply nested component structures (like useautumn/typescript patterns)

### `convex/packages.ts`

Main package business logic with security-focused design. Contains:

**Internal Queries (for backend use only, full data access):**

- `_getPackage`: Internal query returning full package data including sensitive fields (used by AI review, backend actions)
- `_getPackageByName`: Internal query for duplicate checking with full data access

**Public Queries (sanitized, safe for clients):**

- `listPackages`: Returns visible packages with PII stripped (excludes submitter email, name, Discord, AI review details)
- `searchPackages`: Full-text search on visible packages with sanitized returns
- `getPackage`: Returns single package with sensitive fields removed
- `getPackageByName`: Public lookup with safe data only

**Admin Queries:**

- `getAllPackages`: Admin query returning all packages regardless of visibility
- `adminSearchPackages`: Admin full-text search across all packages
- `getPackagesByStatus`: Admin query to filter packages by review status

**Actions:**

- `fetchNpmPackage`: Fetches package metadata from npm registry and downloads API
- `refreshNpmData`: Refreshes npm data for a specific package (uses internal query for full access)
- `submitPackage`: Validates URL, checks for duplicates using internal query, fetches data, and inserts package

**Mutations:**

- `addPackage`: Inserts or updates package in database with submitter info and demoUrl
- `updateNpmData`: Updates only npm-sourced fields without affecting admin data
- `updateReviewStatus`: Admin mutation to change package review status (uses `reviewedBy` field, not email)
- `updateVisibility`: Admin mutation to change package visibility (visible, hidden, archived)
- `deletePackage`: Admin mutation to permanently delete a package
- `toggleFeatured`: Admin mutation to toggle featured status (only for approved packages)
- `addPackageNote`, `deletePackageNote`: Note management with timestamp-based ordering
- `addPackageComment`, `deletePackageComment`: Public comment management
- `updateAiReviewStatus`, `updateAiReviewResult`: AI review status mutations
- `updateAdminSetting`: Toggle auto-approve/reject preferences

**Helper Functions:**

- `toPublicPackage()`: Strips sensitive fields (submitterEmail, submitterName, submitterDiscord, AI review details) from package data
- `publicPackageValidator`: Type-safe validator for public query returns

### `convex/router.ts`

HTTP router configuration. Defines `/api/export-csv` endpoint that fetches all packages and returns CSV format with proper escaping and headers.

### `convex/http.ts`

Main HTTP router setup. Integrates auth routes and exports the router.

### `convex/tsconfig.json`

TypeScript config for Convex functions. Uses ESNext target and includes DOM types for Convex runtime.

### `convex/_generated/`

Auto-generated files by Convex:

- `api.d.ts`, `api.js`: Type definitions and runtime for public API
- `dataModel.d.ts`: TypeScript types for database schema
- `server.d.ts`, `server.js`: Server-side function definitions

## Frontend Source Files

### `src/main.tsx`

Application entry point. Sets up Convex React client, ConvexAuthProvider, and simple pathname-based routing to switch between App and Admin components.

### `src/App.tsx`

Main package directory interface. Includes:

- Compact toolbar above package listing with title, info icon, search, sort dropdown, and submit button
- App title: "Components npm Submissions Directory" inline with controls
- Package submission form with submitter information fields (name, email with privacy notice, optional Discord) and optional live demo URL
- Submit modal opens at top of page with max z-index for iframe support
- Success modal with max z-index displays after submission (auto-closes after 3 seconds)
- About modal opens at top of page with status legend
- Search input with keyboard shortcut (Cmd+K) and real-time filtering
- Sort dropdown (newest, downloads, updated)
- Package card list with expandable details showing review status badges
- Review status badges using Phosphor icons (pending, in review, approved, changes requested, rejected)
- Featured star icon on featured packages with tooltip
- Demo link button for packages with live demos
- External links (npm, repo, website, demo) use window.open() for iframe compatibility
- Public comments display on package details
- Loading skeleton states
- Empty state when no packages found
- Custom modal components for errors and confirmations
- Phosphor icons throughout (replacing emojis)
- No header or footer (streamlined for iframe embedding)
- Fully mobile responsive design

### `src/Admin.tsx`

Admin dashboard component. Shows:

- Simple "Admin" text header (no breadcrumb or navigation links)
- Authentication check and sign-in form
- Access denied message for non-admin users
- Admin dashboard with statistics cards (total packages by status, downloads)
- Status legend centered below Stats section
- Package submissions table with filtering by review status (all, pending, in_review, approved, changes_requested, rejected, archived)
- Review status management with inline action buttons (approve, review, changes, pending, reject)
- Visibility controls with inline buttons (show, hide, archive)
- Featured toggle button (Star icon) for approved packages only
- AI Review button to trigger automated code analysis against Convex specs
- AI Review status badges (passed, failed, partial, reviewing, error)
- AI Review results panel with expandable criteria checklist and suggestions
- Admin settings panel with auto-approve/reject toggles for AI automation
- Refresh NPM data button (ArrowClockwise icon) to pull latest package info from npm
- Package deletion with confirmation modal
- Submitter information display (name, email, Discord username) for each package
- External links (npm, repo, demo) use window.open() for iframe compatibility
- Demo link button for packages with live demos
- Package notes panel with threaded notes support (internal, admin only)
- Public comments panel for managing frontend visible comments
- Notes and comments buttons with count badges on each package row
- Add note/reply functionality with author information
- Delete note functionality
- Star icon display next to featured package names
- CSV export functionality
- Custom tooltips and confirmation modals
- Phosphor icons for all UI elements
- No footer (streamlined layout)
- Mobile responsive design with collapsible package rows

### `src/SignInForm.tsx`

Authentication form component. Supports email/password sign-in and sign-up, plus anonymous authentication. Uses Convex Auth hooks.

### `src/SignOutButton.tsx`

Simple sign-out button component using Convex Auth.

### `src/index.css`

Global CSS styles. Includes Tailwind directives and custom CSS variables for the design system (colors, spacing, etc.).

### `src/lib/utils.ts`

Utility functions. Currently contains `cn` function for merging Tailwind classes with clsx and tailwind-merge.

### `src/vite-env.d.ts`

TypeScript declarations for Vite environment variables.

## Build Output

### `dist/`

Production build output directory. Contains optimized HTML, CSS, and JavaScript bundles ready for deployment to Netlify.

### `node_modules/`

NPM package dependencies. Not tracked in git.

## Development Files

### `setup.mjs`

Setup script (if present) for initial project configuration.

### `README.md`

Project documentation and setup instructions.

### `files.md`

This file. Overview of all files in the codebase.

### `changelog.md`

Changelog tracking features and changes over time.

### `task.md`

Task list for tracking project progress and completed features.

### `prds/`

Product requirements documents folder containing:

- `aicheck.md`: AI Review feature specification
- `howitworks.md`: Technical documentation for data fetching from npm and GitHub, rate limit concerns, and AI review process
- `nowriteconflicts.md`: Guidelines for preventing Convex write conflicts
- `token-based-auth-checks.md`: Token-based authentication guidelines

## Cursor Rules

### `.cursor/rules/sec-check.mdc`

Comprehensive security guidelines for Convex applications. Activate with `@sec-check` to audit code for vulnerabilities, scan for PII exposure, and verify auth patterns. Includes:

- Authentication and authorization patterns (identity verification, indexed ownership checks)
- Input validation and sanitization
- Public vs internal function separation
- Data exposure prevention and PII stripping with `toPublicData()` helpers
- Row-Level Security (RLS) patterns using convex-helpers (`wrapDatabaseReader`, `wrapDatabaseWriter`)
- AI-Assisted Development Security for vibe coding with Cursor/Copilot
- Convex Auth token security (XSS prevention, refresh token protection)
- Dependency and supply chain security (npm audit, version locking)
- Error handling security (generic error messages, server-side logging)
- Security checklist for pre-deployment verification
