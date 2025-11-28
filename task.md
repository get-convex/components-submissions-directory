# Task List

- [ ] update open graph url https://convex-components.dev

- [x] Push to GitHub
- [ ] Upload to Netlify
- [x] Add submit collects users names and email and Convex Discord name
- [x] Admin sees name and admin Convex Discord name
- [x] Add About modal with app description and status legend
- [x] Add Featured status for packages (admin only, approved packages only)
- [x] Add Status legend bar above footer
- [x] Remove login/signup from frontend header (keep admin auth)
- [x] Add AI Review feature for validating Convex components

## Completed

- [x] Replace emojis with Phosphor icons in App.tsx
- [x] Update Admin.tsx to show pending submissions by default
- [x] Add review status badges to frontend PackageCard component
- [x] Update backend listPackages query to show all visible submissions (pending included)
- [x] Create task.md file
- [x] Add About modal with status legend explanations
- [x] Add Featured toggle in admin panel
- [x] Show star icon on featured packages
- [x] Add status legend bar with grid background above footer
- [x] Remove login/signup buttons from public frontend header
- [x] Add public comments system for packages
- [x] Add AI Review with Anthropic Claude integration
- [x] Add AI Review status badges and results panel
- [x] Add admin settings for auto-approve/reject automation

## Summary of Recent Changes

### Frontend (App.tsx)

- Added About modal with app description and complete status legend
- Added About link (info icon) next to app title in header
- Added StatusLegendBar component above footer with grid background
- Added star icon on featured packages (both mobile and desktop layouts)
- Removed login/signup buttons from header (admin authentication remains unchanged)
- Added public comments display on package details

### Admin (Admin.tsx)

- Added Featured toggle button (Star icon) in inline actions
- Featured button only enabled for approved packages
- Added star icon next to featured package names in list
- Updated footer legend to include Featured status
- Added public comments management panel
- Added AI Review button to trigger automated code analysis
- Added AI Review status badges (passed, failed, partial, reviewing, error)
- Added AI Review results panel with expandable criteria checklist
- Added Admin Settings panel with auto-approve/reject toggles

### Backend (convex/packages.ts)

- Added `featured` field to packages schema
- Added `toggleFeatured` mutation (only approved packages can be featured)
- Updated query return validators to include featured field
- Added public comments queries and mutations
- Added AI review mutations (updateAiReviewStatus, updateAiReviewResult)
- Added admin settings queries and mutations (getAdminSettings, updateAdminSetting)

### Backend (convex/aiReview.ts)

- Added runAiReview action using Anthropic Claude API
- 10 criteria for Convex component validation (4 critical, 6 non-critical)
- GitHub API integration for fetching component source files
- Supports convex.config.ts detection in src/component/, src/, or root
- Auto-approve on pass and auto-reject on critical failures

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
3. Claude analyzes code against 10 Convex component criteria
4. Results show passed/failed/partial status with detailed notes
5. Auto-approve triggers if all criteria pass (when enabled)
6. Auto-reject triggers if critical criteria fail (when enabled)
