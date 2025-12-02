# Convex Component Authoring Challenge Categories

Build reusable Convex components that others can drop into their projects. These categories are guidance, not limits. Build any component you think will push the ecosystem forward.

## Quick Reference

1. **Storage**: Build a component that handles file uploads, folder organization, metadata, and access control.
2. **Email**: Create a component that processes inbound emails, tracks threads, and manages delivery workflows.
3. **Third Party Sync**: Develop a component that syncs external service data with Convex using reactive queries and async workflows.
4. **Comments and Reactions**: Author a full stack component with schema, functions, and UI helpers for social interactions.
5. **Analytics**: Build a component that tracks events, stores metrics, and generates reports without external services.
6. **Content Management**: Create a component for structured content with custom fields, draft states, and publishing workflows.
7. **API**: Build a component for secure API key storage, rotation, usage tracking, and access control.

---

## About Convex Components

Convex components are self-contained backend modules that bundle functions, schemas, and data together. They let you add complex functionality to your app without implementing everything from scratch.

---

## Why Convex Components Change the Game

Components are a unique feature of Convex that no other backend platform offers. They let you pull in prebuilt, self-contained features directly into your own app.

**Not just libraries.** Components look like npm packages, but they are fundamentally different. A component is a complete Convex app in miniature. It has its own database, scheduler, and all the Convex infrastructure you would expect. When you install a component, you get a living backend system, not just a bundle of functions.

**Nested composition.** Components can contain other components. A reactions component might use an aggregate component internally. That aggregate component could use something else. This nesting lets you build complex features from simple, well-tested building blocks.

**Write once, share everywhere.** Common backend patterns like rate limiting, presence tracking, and AI agent workflows only need to be solved once. After that, any Convex developer can drop the component into their project and move on to the unique parts of their app.

**Isolation by design.** Each component has its own schema and data. You cannot accidentally overwrite component data from your main app. The frontend cannot call component functions directly. Everything flows through your own queries and mutations, giving you full control over access patterns and business logic.

---

## Benefits for Developers

**Ship faster.** Instead of implementing file storage, analytics, or comment threads from scratch, install a component and wire it up in minutes. The hard problems are already solved.

**Cleaner architecture.** Components encourage separation of concerns. Your main Convex folder handles your application logic. Components handle the generic infrastructure. Your codebase stays focused on what makes your app unique.

**Battle-tested patterns.** Components in the marketplace have been used across many projects. Edge cases and performance issues get discovered and fixed by the community, not just by you.

**Easier onboarding.** New team members can understand your app faster when common features are abstracted into named components. "We use the rate limiter component" is easier to grok than a custom implementation spread across multiple files.

---

## Benefits for Convex

**Ecosystem growth.** Every component makes Convex more valuable for the next developer. Rate limiting, presence, AI agents: these features attract developers who want batteries-included infrastructure.

**Community contribution.** Component authoring is now open to everyone. Developers can solve problems once and share the solution. The best components become part of how Convex apps are built.

**Reduced support burden.** When common patterns live in well-maintained components, fewer developers need to ask how to implement those patterns from scratch. Documentation and examples come with the component.

---

## Component Types

### Sibling Components

These live alongside your Convex code in the same repository. Create a folder at the same level as your `convex/` directory, add a `convex.config.ts` file, and start writing. Sibling components are great for modularizing larger projects and iterating quickly.

### NPM Packages

Distribute your component as a standalone package on npm. This is what you want if you are sharing with the community. Install with npm, import the config, and use it like any other component.

### Hybrid Components

Combine shared npm code with local customization. The component installs into your convex folder directly so you can modify it. Better Auth uses this pattern because authentication often needs custom logic.

---

## Building Your Own Component

**Start with a schema.** Components are isolated, so your schema will not conflict with the main app. Define the tables your component needs and keep them focused.

**Wrap with a client.** Instead of requiring users to call `ctx.runMutation(components.foo.bar, args)`, provide a client class that wraps these calls. This makes your component easier to use and documents the intended API.

**Understand transaction boundaries.** When your app calls into a component, understand what rolls back on error. The Convex docs cover this in detail.

**Mind function call costs.** Every call between your app and a component counts as a separate function call. If your mutation calls a component, and that component calls another component, you have three function calls. Convex function calls are cheap, but this is worth knowing for high-frequency operations.

**Do not over-componentize.** Components shine for common patterns that benefit from shared implementation. Breaking every feature into its own component adds complexity without clear benefit for most projects.

---

## Broad Category Themes

These themes from Ian Macartney guide what makes a strong component submission:

1. **Third Party Integrations**: For anything where an integration wants to keep track of state, needs reactive status, or async workflows. Make it easier to use.

2. **SaaS Killer**: Clone a SaaS product as a component so users have one less account to manage. Examples: calendar sync, form builders, analytics dashboards.

3. **Full Stack Features**: Features like comments/reactions where there's UI + DB + functions all working together.

---

## Challenge Categories

### 1. Storage

**Theme:** Full Stack Feature

**Description:** Organized file storage with folders, metadata, and access control.

**Build ideas:** Folder hierarchies with drag and drop, file versioning, storage quotas per user, thumbnail generation, share links with expiration. Cloudflare R2 component handles basic storage, so focus on organization and user experience layers.

---

### 2. Email

**Theme:** Third Party Integration

**Description:** Inbound email processing and thread management.

**Build ideas:** Parse incoming emails via webhook, track email threads with reply detection, bounce and complaint handling, email scheduling with send windows. Resend component handles outbound, so focus on inbound workflows.

---

### 3. Third Party Sync

**Theme:** Third Party Integration / SaaS Killer

**Description:** Two-way sync between external services and Convex with reactive status.

**Build ideas:** Conflict resolution for bidirectional updates, webhook ingestion with deduplication.

---

### 4. Comments and Reactions

**Theme:** Full Stack Feature

**Description:** Threaded comments and emoji reactions for any content type.

**Build ideas:** Nested comment threads with mentions, emoji reaction picker with counts, comment moderation queue, edit history, real-time updates.

---

### 5. Analytics

**Theme:** SaaS Killer

**Description:** Event tracking and usage metrics without external services.

**Build ideas:** Track custom events, build funnels, retention charts, session recording metadata, user journey mapping, exportable reports.

---

### 6. Content Management

**Theme:** SaaS Killer

**Description:** Headless CMS for structured content.

**Build ideas:** Content types with custom fields, draft/publish workflow, revision history, scheduled publishing, media library integration.

---

## Categories Under Consideration

### Voice

**Theme:** Third Party Integration

**Description:** Voice input or output workflows.

**Build ideas:** Save transcription chunks, voice command parsing, text-to-speech job queues.

**Status:** Challenging due to streaming limitations. Audio streaming must happen in the main app. Components can only handle saved audio chunks or transcribed text. May leave participants thinking components are too limited.

---

### AI Tooling

**Theme:** Third Party Integration

**Description:** AI workflow utilities beyond existing components.

**Build ideas:** API key vault with rotation, prompt versioning, usage tracking per key, model fallback chains.

**Status:** AI Agent and RAG components already exist. Submissions should clearly differentiate from existing functionality.

---

## Removed Categories

### Feature Flags

**Reason:** LaunchDarkly component already exists at https://www.convex.dev/components/launchdarkly

---

### Rate Limiting

**Reason:** Rate Limiter component already exists with 21k+ weekly downloads.

---

### Background Jobs

**Reason:** Workpool, Workflow, and Action Retrier components already cover durable functions and job queues.

---

### Push Notifications

**Reason:** Expo Push Notifications component already exists.

---

### Payments

**Reason:** Already crowded with Dodo, Autumn, and Polar components. Those repos may not represent ideal component authoring patterns for new developers.

---

### UI Components

**Reason:** Confusing distinction between React Components and Convex Components. Building dashboards for existing components is possible but not well documented yet.

---

## Existing Components Reference

Before building, check https://www.convex.dev/components for existing solutions:

| Category          | Existing Components                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durable Functions | Workpool, Workflow, Action Retrier, Crons                                                                                                         |
| Database          | Migrations, Aggregate, Presence, RAG, Sharded Counter, Geospatial                                                                                 |
| Integrations      | Resend, Cloudflare R2, Collaborative Text Editor Sync, Expo Push Notifications, Polar, Autumn, Twilio SMS, OSS Stats, LaunchDarkly, Dodo Payments |
| Backend           | Rate Limiter, AI Agent, Action Cache, Persistent Text Streaming                                                                                   |

---

## References

These resources are essential reading for anyone building or using Convex components.

**Official Documentation:**

- Understanding Components: https://docs.convex.dev/components/understanding
- Using Components: https://docs.convex.dev/components/using
- Authoring Components: https://docs.convex.dev/components/authoring

**Component Marketplace:**

- Browse existing components: https://www.convex.dev/components

**Video Overview:**

- Component Authoring Deep Dive by Tom Ballinger: https://youtu.be/H4JiHUxZZ6k

This video covers the three component types, building a sibling component from scratch, the client wrapper pattern, transaction boundaries, and practical considerations for when to use components.
