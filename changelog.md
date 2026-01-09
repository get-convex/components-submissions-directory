# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.8] 2025-01-08

### changed

- Changed aiReviews.ts model to opus

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
