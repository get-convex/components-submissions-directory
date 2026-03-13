# WorkOS admin auth feedback request

Created: 2026-03-10 01:04 UTC
Last Updated: 2026-03-10 01:04 UTC
Status: Done

## Summary

This is a short shareable PRD for the WorkOS team. It explains how this app authenticates users with WorkOS, how it grants admin access to `@convex.dev` accounts, and where we want feedback on best practices.

## Problem

The app currently uses the authenticated user's email claim to decide admin access. We want to confirm whether this is a solid pattern for WorkOS plus Convex, or whether we should move to a more explicit admin claim, role, group, or organization based check.

## Current implementation

1. Frontend auth uses WorkOS Connect OAuth with PKCE and passes the WorkOS access token into Convex.
2. Convex validates the JWT using `WORKOS_CLIENT_ID` and `WORKOS_AUTHKIT_DOMAIN`.
3. Backend admin checks call `ctx.auth.getUserIdentity()` and read `identity.email`.
4. The app does not hardcode one specific email address. Any authenticated user whose `identity.email` ends with `@convex.dev` is treated as an admin.
5. If the JWT does not include an `email` claim, admin access fails even when the signed in WorkOS account is the right person.

## Source of truth

- `convex/auth.ts`
  - `requireAdminIdentity(ctx)` throws unless `identity.email?.endsWith("@convex.dev")`
  - `getAdminIdentity(ctx)` returns `null` for non admin users
  - `isAdmin` returns a boolean for frontend gating
- `convex/auth.config.ts`
  - validates JWTs with `issuer=https://<WORKOS_AUTHKIT_DOMAIN>` and `jwks=https://<WORKOS_AUTHKIT_DOMAIN>/oauth2/jwks`
- `src/pages/Admin.tsx`
  - admin page uses the backend admin query for access checks
- `src/components/Header.tsx`
  - admin nav visibility depends on `api.auth.isAdmin`

## What WorkOS needs to know

- Admin access depends on the WorkOS JWT exposing `email` as `identity.email` inside Convex.
- The app uses domain based admin gating, not a single allowlisted email.
- The current rule is for internal Convex team access only:
  - `@convex.dev` email => admin
  - any other email => non admin

## Known gotchas

- Missing `email` in the JWT template breaks admin access.
- Convex environment variables validate tokens, but they do not add missing claims.
- If claim names vary across WorkOS environments, we may need a fallback resolver such as:

```ts
const adminEmail = identity.email ?? identity["workos_email"];
```

## Feedback requested from WorkOS

1. Is checking `identity.email.endsWith("@convex.dev")` an acceptable pattern for a small internal admin surface?
2. Would WorkOS recommend moving to a dedicated admin claim, org role, or group mapping instead of relying on email domain?
3. What is the cleanest way to keep admin claims stable across local, staging, and production environments?
4. Is there a preferred JWT template shape for Convex apps that need admin checks plus normal profile fields?
5. If a shared template is required across apps, is a fallback claim like `workos_email` reasonable, or should we standardize on `email` only?
