# NPM Package Directory

A curated directory application for submitting and reviewing npm packages built for the Convex Components challenge. This app allows users to submit npm packages by URL, automatically fetches package metadata from the npm registry, and provides an admin interface for managing submissions.

## What It Does

The NPM Package Directory is a submission platform where users can:

- Submit npm packages by providing their npmjs.com URL (no login required)
- Browse submitted packages with search and filtering capabilities
- View detailed package information including downloads, version, maintainers, and repository links
- See review status badges on package cards (pending, in review, approved, changes requested, rejected)
- View featured packages highlighted with a star icon
- Access About modal with app description and status legend
- Access an admin dashboard (restricted to @convex.dev email addresses) to review submissions, manage package visibility, feature approved packages, add threaded notes, and export data

## Features

### Public Features

- **Package Submission**: Submit any npm package by entering its npmjs.com URL. No login required. The app automatically fetches metadata from the npm registry. Submissions require name, email, optional Discord username, and optional live demo URL
- **Package Discovery**: Browse submitted packages with real-time search functionality (searches both package names and descriptions)
- **Sorting Options**: Sort packages by newest submissions, weekly downloads, or last publish date
- **Review Status Display**: Visual badges showing package review status (pending, in review, approved, changes requested, rejected)
- **Featured Packages**: Star icon highlighting packages featured on convex.dev/components
- **About Modal**: App description and complete status legend explaining each review status (accessible via info icon)
- **Streamlined Layout**: Compact toolbar with title, info, search, sort, and submit controls directly above package listing
- **Iframe Support**: Modals open at top of page with maximum z-index for embedding in iframes
- **No Login Required**: Public frontend has no authentication UI (admin access via /admin route only)
- **Package Details**: Expandable cards showing full package information including:
  - Version and description
  - Weekly download statistics
  - License information
  - Package size and file count
  - Maintainer information with avatars
  - Direct links to npm, repository, homepage, and live demo
  - Copy-to-clipboard install command
  - Review status badge

### Security Features

- **Data Privacy**: Public queries strip all PII (submitter emails, names, contact info) before returning data to clients
- **Internal/Public Query Separation**: Sensitive backend operations use internal queries; public queries enforce safe data shapes
- **AI Review Privacy**: AI review details (summaries, criteria) are admin-only; public sees status only (pass/fail/partial)
- **Type-Safe Validators**: All public queries use explicit return validators to enforce secure data shapes
- **Security Guidelines**: Comprehensive `.cursor/rules/sec-check.mdc` with Row-Level Security patterns, AI-assisted development security, and pre-deployment checklist

### Admin Features

- **Admin Authentication**: Secure admin access restricted to @convex.dev email addresses
- **Dashboard Overview**: View statistics including total packages, total downloads, and last submission date
- **Package Management**: View all submitted packages in a sortable table with filtering by review status
- **Review Workflow**: Manage package review status with five states:
  - Pending (default for new submissions)
  - In Review
  - Approved
  - Changes Requested
  - Rejected
- **Featured Management**: Mark approved packages as featured (shown with star icon, highlighted on convex.dev/components)
- **Visibility Controls**: Control package visibility with three options:
  - Visible (default, shown on public directory)
  - Hidden (not shown publicly but kept in database)
  - Archived (permanently archived)
- **Package Notes**: Add threaded notes to packages for internal team communication (not visible to users). Notes support replies and show author information
- **Public Comments**: Add comments visible on the frontend package details
- **Submitter Information**: View submitter details (name, email, Discord username) for each package submission
- **AI Review**: Automated code analysis against Convex component specifications using Claude AI
  - Validates packages against 9 criteria (5 critical, 4 non-critical)
  - Fetches source code from GitHub repositories
  - Detects convex.config.ts in multiple locations
  - Shows detailed results with criteria checklist
  - Auto-approve on pass and auto-reject on fail options
- **Refresh NPM Data**: Pull latest package information from npm without affecting review status, submitter info, or AI review results
- **CSV Export**: Export all package data to CSV format for analysis

## Tech Stack

### Frontend

- **React 19**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **React Router DOM**: Client-side routing
- **Sonner**: Toast notifications
- **Phosphor Icons**: Icon library for UI elements

### Backend

- **Convex**: Real-time backend with automatic reactivity
- **Convex Auth**: Authentication system with Password provider
- **npm Registry API**: Integration with npmjs.org for package metadata
- **npm Downloads API**: Weekly download statistics

### Development Tools

- **Cursor**: AI-powered code editor
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting

## How It Was Built

MVP built with [Chef](https://chef.convex.dev), then developed further using [Cursor](https://cursor.com). The app follows Convex best practices with type-safe functions, indexed queries, and real-time reactivity.

## Deployment

### Netlify Deployment

This app is configured for deployment to Netlify:

1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`
3. **Environment Variables**:
   - `VITE_CONVEX_URL`: Your Convex deployment URL
   - `CONVEX_SITE_URL`: Your site URL for auth configuration

## How It Works

### Package Submission Flow

1. User enters an npm package URL (e.g., `https://www.npmjs.com/package/react`)
2. The app extracts the package name from the URL
3. An action (`submitPackage`) is called which:
   - Checks if the package already exists
   - Calls `fetchNpmPackage` action to retrieve metadata from npm registry
   - Fetches package metadata including version, description, license, size, etc.
   - Fetches weekly download statistics from npm downloads API
   - Extracts maintainer information and generates Gravatar avatars
   - Inserts or updates the package in the database

### Data Fetching

The `fetchNpmPackage` action makes parallel requests to:

- **npm Registry API**: `https://registry.npmjs.org/{packageName}` for package metadata
- **npm Downloads API**: `https://api.npmjs.org/downloads/point/last-week/{packageName}` for download statistics

### Real-time Updates

All package listings use Convex queries that automatically update when new packages are submitted. The app uses:

- `listPackages`: Queries visible packages with sorting options (excludes hidden/archived)
- `searchPackages`: Full-text search on visible packages using Convex search indexes
- `getAllPackages`: Admin query to fetch all packages regardless of visibility
- `getPackagesByStatus`: Admin query to filter packages by review status
- `adminSearchPackages`: Admin full-text search across all packages
- `getPackageNotes`: Query to fetch threaded notes for a package
- `updateReviewStatus`: Mutation to change package review status
- `updateVisibility`: Mutation to change package visibility

### Authentication

The app uses Convex Auth with Password provider for admin access. Package submissions do not require authentication. Users provide their name, email, and optional Discord username when submitting. The public frontend has no login/signup UI. Admin access is available via the `/admin` route and is restricted to users with @convex.dev email addresses.

### Database Schema

The app uses two main tables:

**packages** table with:

- Package metadata (name, description, version, license)
- URLs (npm, repository, homepage)
- Statistics (downloads, size, file count)
- Maintainer information
- Submission timestamp
- Submitter information (name, email, Discord username)
- Live demo URL (optional)
- Review status (pending, in_review, approved, changes_requested, rejected)
- Visibility (visible, hidden, archived)
- Featured flag (only for approved packages)
- Review metadata (reviewed by, reviewed at, review notes)
- AI review fields (status, summary, criteria results, error)

**packageNotes** table with:

- Package reference
- Note content and author information
- Threading support via parent note references
- Timestamps for chronological ordering

**packageComments** table with:

- Package reference
- Comment content and author information
- Timestamps for chronological ordering

Indexes are created for:

- Package name (unique lookup)
- Submission date (sorting)
- Review status (filtering)
- Visibility (filtering)
- Full-text search on package name and description
- Package notes by package ID and creation date
- Note threading via parent note ID
- Admin settings by key (for auto-approve/reject)

## Project Structure

```
├── convex/           # Backend Convex functions
│   ├── auth.ts       # Authentication configuration
│   ├── aiReview.ts   # AI-powered package review using Claude
│   ├── packages.ts   # Package-related queries, mutations, and actions
│   ├── router.ts     # HTTP routes (CSV export)
│   ├── schema.ts     # Database schema definition
│   └── http.ts       # HTTP router setup
├── src/              # Frontend React application
│   ├── App.tsx       # Main package directory interface
│   ├── Admin.tsx     # Admin dashboard with AI review integration
│   ├── SignInForm.tsx # Authentication form
│   └── lib/          # Utility functions
└── dist/             # Production build output
```

## Development

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development servers:

```bash
npm run dev
```

This runs both the frontend (Vite) and backend (Convex) in parallel.

### Available Scripts

- `npm run dev`: Start both frontend and backend
- `npm run dev:frontend`: Start only Vite dev server
- `npm run dev:backend`: Start only Convex dev server
- `npm run build`: Build for production
- `npm run lint`: Type check and lint code

### Environment Setup

Create a `.env.local` file with:

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

## HTTP API

The app exposes an HTTP endpoint for CSV export:

- `GET /api/export-csv`: Exports all packages to CSV format

User-defined HTTP routes are in `convex/router.ts`, while authentication routes are handled in `convex/http.ts`.

## Security

This project includes comprehensive security guidelines in `.cursor/rules/sec-check.mdc`. Use `@sec-check` in Cursor to audit code for vulnerabilities.

Key security patterns implemented:
- Row-Level Security (RLS) patterns using convex-helpers
- PII stripping with `toPublicPackage()` helper
- Internal queries for backend operations
- Explicit return validators on all public queries
- AI-assisted development security guidelines

## Learn More

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Auth](https://auth.convex.dev/)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Row-Level Security](https://stack.convex.dev/row-level-security)
- [Convex Auth Security](https://labs.convex.dev/auth/security)
