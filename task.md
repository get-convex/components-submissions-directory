# Task List

- [x] change submit button back to DF5D34
- [x] add link to demo app on form and admin for Link to Demo app showing how your component works
- [x] remove open graph url link https://convex-components.dev
- [x] Push to GitHub
- [ ] Upload to Netlify
- [x] Add submit collects users names and email and Convex Discord name
- [x] Admin sees name and admin Convex Discord name
- [x] Add About modal with app description and status legend
- [x] Add Featured status for packages (admin only, approved packages only)
- [x] Add Status legend bar above footer
- [x] Remove login/signup from frontend header (keep admin auth)
- [x] Add AI Review feature for validating Convex components
- [x] Update changelog.md with correct dates from git history
- [x] Update files.md with current file descriptions
- [x] Run TypeScript type checks
- [x] Verify Netlify build readiness (build passes, no 404 errors with _redirects)
- [x] Add refresh NPM data button for admin to pull latest package info from npm
- [x] Streamline frontend layout for iframe embedding (remove header/footer)
- [x] Move toolbar controls above package listing
- [x] Update modals to open at top of page for iframe support
- [x] Simplify Admin page header (remove breadcrumb)
- [x] Move Admin status legend below Stats section
- [x] Fix external links to open in new tabs even in iframes
- [x] Fix thank you success modal not displaying after submission
- [x] Add email privacy notice to submit form
- [x] Security fix: Strip PII from public queries (submitter emails, names, Discord)
- [x] Security fix: Exclude AI review details from public responses (status only)
- [x] Security fix: Create internal queries for backend operations
- [x] Security fix: Rename reviewerEmail to reviewedBy, use "AI" identifier

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
- [x] Add live demo URL field to submission form
- [x] Add demo link button in package details
- [x] Ensure mobile responsive design throughout
- [x] Add refresh NPM data button in admin panel
- [x] Fix external links for iframe compatibility (window.open)
- [x] Fix success modal z-index for iframe support
- [x] Add email privacy notice to submission form
- [x] Security: Strip submitter PII from public query responses
- [x] Security: Create internal queries for backend data access
- [x] Security: Use "AI" identifier instead of fake email for automated actions
- [x] Security: Add explicit return validators to all public queries

## Summary of Recent Changes

### Frontend (App.tsx)

- Streamlined layout: removed header and footer for iframe embedding
- Compact toolbar above package listing with title, info, search, sort, submit controls
- Submit modal opens at top of page with max z-index for iframe support
- About modal opens at top of page for consistency
- Added About modal with app description and complete status legend
- Added star icon on featured packages (both mobile and desktop layouts)
- Added public comments display on package details
- Added live demo URL field to submission form (optional but suggested)
- Added Demo button for packages with live demos
- Mobile responsive design with proper breakpoints
- Fixed external links (npm, repo, website, demo) to open in new tabs in iframes using window.open()
- Fixed thank you success modal display (z-index layering issue)
- Added email privacy notice: "Not displayed publicly. Used by the Convex team to contact you about your submission."

### Admin (Admin.tsx)

- Simplified header: removed breadcrumb, shows only "Admin" text
- Moved status legend below Stats section
- Removed footer for streamlined layout
- Added Featured toggle button (Star icon) in inline actions
- Featured button only enabled for approved packages
- Added star icon next to featured package names in list
- Added public comments management panel
- Added AI Review button to trigger automated code analysis
- Added AI Review status badges (passed, failed, partial, reviewing, error)
- Added AI Review results panel with expandable criteria checklist
- Added Admin Settings panel with auto-approve/reject toggles
- Added demo link button for packages with live demos
- Mobile responsive collapsible package rows

### Backend (convex/packages.ts)

- Added `featured` field to packages schema
- Added `demoUrl` field to packages schema
- Added `toggleFeatured` mutation (only approved packages can be featured)
- Updated query return validators to include featured and demoUrl fields
- Added public comments queries and mutations
- Added AI review mutations (updateAiReviewStatus, updateAiReviewResult)
- Added admin settings queries and mutations (getAdminSettings, updateAdminSetting)
- Mutations patch directly without reading first to avoid write conflicts

### Backend (convex/aiReview.ts)

- Added runAiReview action using Anthropic Claude API
- 10 criteria for Convex component validation (4 critical, 6 non-critical)
- GitHub API integration for fetching component source files
- Supports convex.config.ts detection in multiple locations
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
