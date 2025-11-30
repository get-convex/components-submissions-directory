# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- 10 criteria checklist for Convex component validation
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

