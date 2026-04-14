# Security Scanning

The security scan system analyzes package repositories using external security providers. Scan results are visible to admins in the review workflow and to users on component detail and submissions pages.

## Providers

Two providers are currently supported:

| Provider | What it checks | Env variables |
|----------|---------------|---------------|
| Socket.dev | Supply chain risks, known malware, CVEs, license violations | `SOCKET_API_KEY` |
| Snyk | Known vulnerabilities, dependency security | `SNYK_TOKEN`, `SNYK_ORG_ID` |

Each provider can be enabled or disabled independently in admin settings. At least one provider must be enabled for scanning to work.

## Running a scan

### Manual scan (per package)

1. Expand the package row in the admin dashboard
2. Find the "Review" row
3. Click the "Security Scan" button (shield icon)
4. The scan queues in the background and the button shows a loading state
5. Results appear in the Review history panel

The security scan button is disabled when no repository URL is available or when a scan is already in progress.

### Backlog scanner (batch)

For catching up on existing packages that predate the security scan feature:

1. Go to Settings tab
2. Open "Security Scan Settings"
3. The backlog section shows counts of unscanned, scanning, scanned, and errored packages
4. Select a batch size (5, 10, 20, 50, or 100) from the dropdown
5. Click "Scan next N" to queue a batch of unscanned packages
6. Repeat until all packages are covered

The backlog scanner also re-queues packages with previous scan errors.

### Auto scan on submission

When "Auto scan on submission" is enabled, new packages with a repository URL are automatically queued for scanning when submitted.

### Scheduled scanning

Set a scan schedule (every 3, 5, or 7 days) to re-scan packages automatically. A daily cron job at 5 AM UTC checks which packages are stale and queues up to 20 per run.

## Security Scan Settings

Located in the admin Settings tab under "Security Scan Settings":

| Setting | Description |
|---------|-------------|
| Socket.dev toggle | Enable or disable Socket.dev provider |
| Snyk toggle | Enable or disable Snyk provider |
| Auto scan on submission | Scan new packages automatically |
| Scan schedule | Manual only, every 3, 5, or 7 days |
| Backlog queue | Batch scan unscanned packages with configurable batch size |

## Results and history

### Review history panel

The Review history panel (accessed from the "Review history" button in the Review row) has two tabs:

- **AI Reviews** tab shows AI review runs
- **Security Scans** tab shows security scan runs with provider breakdown, findings by severity, and recommendations

Each scan run shows:

- Overall status (safe, warning, unsafe, error)
- Per-provider status badges
- Individual findings grouped by severity
- Recommendations list

### Package status

Security scan status is stored on each package as a denormalized snapshot:

| Status | Meaning |
|--------|---------|
| Not scanned | No scan has been run |
| Scanning | Scan is in progress |
| Safe | No issues found |
| Warning | Minor issues found |
| Unsafe | Significant issues found |
| Error | Scan failed |

## Public visibility

### Component detail page

The sidebar shows a "Community scan via Socket.dev" link that opens a modal with:

- Scan status and date
- Provider links (to Socket.dev and Snyk for self-service scanning)
- Recommendations (if any)
- Contact author section with GitHub Issues link (when findings exist)
- Third-party component notice

The label is intentionally attributed to Socket.dev to make it clear this is a community scan, not a Convex endorsement.

### Submissions page

Each expanded package row includes a "Security" button in the action buttons area (next to npm, Repo, Website, Demo). Clicking it opens the same community scan modal.

## Environment variables

Set these in the Convex dashboard (not `.env.local`):

| Variable | Required for |
|----------|-------------|
| `SOCKET_API_KEY` | Socket.dev scans |
| `SNYK_TOKEN` | Snyk scans |
| `SNYK_ORG_ID` | Snyk scans |

## Data model

Scan results are stored in two places:

1. **packages table** (denormalized snapshot): `securityScanStatus`, `securityScanSummary`, `securityScanUpdatedAt`, `socketScanStatus`, `snykScanStatus`
2. **securityScanRuns table** (full history): complete findings, recommendations, per-provider metadata, and timestamps

The `securityScanRuns` table is indexed by `packageId` and `createdAt` for efficient history queries.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Scan stuck on "Scanning" | Check Convex function logs for errors. The scan runs in the background via scheduler. |
| Socket.dev errors | Verify `SOCKET_API_KEY` is set and the key has the correct scopes |
| Snyk errors | Verify `SNYK_TOKEN` and `SNYK_ORG_ID` are set |
| No providers enabled warning | Enable at least one provider in Security Scan Settings |
| Backlog shows 0 unscanned | All packages with repository URLs have been scanned |
