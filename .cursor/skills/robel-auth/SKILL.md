---
name: robel-auth
description: Integrate and maintain Robelest Convex Auth in apps by always checking upstream before implementation. Use when adding auth setup, updating auth wiring, migrating between upstream patterns, or troubleshooting @robelest/convex-auth behavior across projects.
---

# Robel auth skill

Use this skill when a user asks to implement, update, or debug auth based on `robelest/convex-auth`.

This skill is designed to be copied into other repos.

## Non negotiable upstream check before any auth change

Run this every time before proposing code or commands.

Preferred command:

```bash
bash .cursor/skills/robel-auth/scripts/check-upstream.sh
```

Manual checklist if script is unavailable:

1. Read latest `main` README:
   - `https://raw.githubusercontent.com/robelest/convex-auth/main/README.md`
2. Read latest `release` README:
   - `https://raw.githubusercontent.com/robelest/convex-auth/release/README.md`
3. Check branch level differences:
   - `https://github.com/robelest/convex-auth/compare/release...main`
4. Read current self hosting docs if portal or static hosting is involved:
   - `https://raw.githubusercontent.com/get-convex/self-hosting/main/INTEGRATION.md`
   - `https://github.com/get-convex/self-hosting`

If `main` and `release` conflict, prefer the branch requested by the user. If unspecified, use `release` for stability and explain that choice.

## Important assumptions for this skill

- Treat GitHub as source of truth every time.
- Do not assume npm package availability.
- Validate package availability at execution time.
- If npm is unavailable, use a GitHub source install pinned to a branch or commit.
- Keep all Convex code type safe and validator complete.

## Clarifying questions to ask first

Ask these before editing:

1. Which branch is source of truth for this task, `release` or `main`.
2. Is this a new integration or an update to an existing auth setup.
3. Which framework is used, Vite, Next.js, Expo web, or other.
4. Is self hosted portal/static delivery needed now.
5. Are they okay pinning dependency to a specific Git commit for reproducibility.

## Install and dependency strategy

Never assume one install path.

1. Try package registry lookup:
   - `npm view @robelest/convex-auth version`
2. If package is unavailable or blocked, install from GitHub:
   - `npm install github:robelest/convex-auth#release`
3. For deterministic builds, pin a commit SHA:
   - `npm install github:robelest/convex-auth#<commit-sha>`

If the project uses pnpm or bun, translate the same GitHub dependency pinning pattern.

## GitHub OAuth setup instructions for end users

When the user asks for clearer GitHub auth onboarding text, include this guidance in the README where OAuth providers are explained.

Required link:

- `https://github.com/settings/developers`

Recommended README content:

1. Go to GitHub Developer Settings:
   - `https://github.com/settings/developers`
2. Create a new OAuth App.
3. Set:
   - Homepage URL = app frontend URL (same as `SITE_URL`)
   - Authorization callback URL = `https://<deployment>.convex.site/api/auth/callback/github`
4. Copy Client ID and Client Secret.
5. Set Convex env vars:
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
6. Confirm `SITE_URL` is configured.
7. Deploy and test sign in.

Important implementation note for this repo:

- GitHub auth should be documented with callback path `/api/auth/callback/github`.
- In this codebase, GitHub OAuth is conditionally enabled only when `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `CONVEX_SITE_URL` are present.

## Baseline Convex wiring patterns

Always verify exact API names from upstream before coding. API names can change over time.

Core files typically involved:

1. `convex/convex.config.ts`
2. `convex/auth.ts`
3. `convex/http.ts`
4. frontend auth bootstrap file

Expected patterns to verify against upstream docs:

- Component registration in `defineApp()`
- Auth instance construction
- Exported auth helpers
- HTTP route registration method name

Do not hardcode historical method names without checking current docs first.

## Migration guardrails

When upgrading existing apps:

1. Snapshot current auth wiring before edits.
2. Update one surface at a time, config, auth module, then HTTP routes.
3. Keep old and new API mismatch notes in task output.
4. Verify sign in flow and callback routes before moving on.
5. Keep migrations minimal and focused to auth wiring only.

## Self hosting decision point

Use `get-convex/self-hosting` only when:

- user asks for self hosted static assets, or
- auth portal hosting requires it in the selected upstream version.

When needed, follow the latest upstream integration docs:

- `https://github.com/get-convex/self-hosting`
- `https://raw.githubusercontent.com/get-convex/self-hosting/main/INTEGRATION.md`

## Output requirements for any task using this skill

Before finishing, always report:

1. Retrieval timestamp for upstream docs.
2. Which branch was used as source of truth and why.
3. Install path selected, npm or GitHub pin, and why.
4. Exact files changed.
5. Exact commands the user should run next.

Never claim completion without these five items.

## Source links

- `https://github.com/robelest/convex-auth`
- `https://github.com/robelest/convex-auth/tree/release`
- `https://raw.githubusercontent.com/robelest/convex-auth/main/README.md`
- `https://raw.githubusercontent.com/robelest/convex-auth/release/README.md`
- `https://github.com/get-convex/self-hosting`
- `https://raw.githubusercontent.com/get-convex/self-hosting/main/INTEGRATION.md`
- `https://agentskills.io/home`
