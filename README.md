# Convex Components Directory App

Build a reusable component for developers to drop into their projects.

## What are Convex Components

Convex Components are self-contained TypeScript modules that add backend functionality to Convex app. Think of them as npm packages for your backend: authentication, file storage, rate limiting, analytics, or any reusable pattern you find yourself rebuilding across projects.

Components have their own tables, functions, and scheduled jobs. They install with npm and wire into your existing Convex app without touching your schema.
  
## Components Authoring

See a list of **[component ideas or request from the team and community.](https://github.com/orgs/get-convex/projects/1/views/1)**

We're looking for developers to build and submit components.

Each categories focuses on a specific use case or pattern in the following categories:

- Auth / Identity
- AI / Agent Infrastructure
- Analytics
- Backend
- API Usage
- Content Management
- Full-Stack Drop-In Features
- Storage
- Third-Party Sync

## Components Directory

Selected components could be featured in the Components Directory. We are no longer providing rewards or prizes for components.

Visit the [Components Directory](https://www.convex.dev/components) to see existing components and find inspiration.

## How to Submit

1. Build a convex component you need or pick one from the **[ components challenge list](https://github.com/orgs/get-convex/projects/1/views/1)**
2. Follow the [authoring guide](https://docs.convex.dev/components/authoring) to structure your component
3. Publish to npm
4. [Submit your component](https://www.convex.dev/components/submit) for review

## Resources

Learn how components work and how to build them:

| Resource                                                                     | Description                                              |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| [Understanding Components](https://docs.convex.dev/components/understanding) | Architecture and concepts behind Convex Components       |
| [Using Components](https://docs.convex.dev/components/using)                 | How to install and integrate components into your app    |
| [Authoring Components](https://docs.convex.dev/components/authoring)         | Step by step guide to building your own component        |
| [Submit a Component](https://www.convex.dev/components/submit)               | Submit your component for review and potential featuring |
| [Components Directory](https://www.convex.dev/components)                    | Browse existing components                               |

## Component Requirements

A valid Convex Component needs:

- A `convex.config.ts` that defines the component
- Exported functions that other apps can call
- Published to npm with the right entry points
- Documentation showing how to install and use it

The [authoring guide](https://docs.convex.dev/components/authoring) covers the full specification.

## About this app (Convex Components Directory App)

This is a full stack directory app built with React, Vite, TypeScript, and Convex. If you fork it, you get a working starting point for any searchable catalog or listing site.

- Real time data powered by Convex with no polling or manual refreshes
- Search, filtering, and category browsing out of the box
- Auth, submissions, and admin review flows already wired up
- Deploys to Netlify or any static host with a Convex backend

The app includes built in AI features you can use or strip out:

- AI powered component reviews using Anthropic, OpenAI, or Gemini with automatic provider fallback
- SEO and description generation that writes page content, use cases, and FAQ from package metadata
- SKILL.md generation for agent tooling so each component can be installed via MCP or copied as a prompt
- Open in ChatGPT, Claude, or Perplexity links on every component detail page
- Admin panel for managing AI provider keys, models, and generation settings
- `llms.txt` HTTP endpoint that exposes the full directory as structured context for LLM tools

Swap out the component data for whatever you want to list and you have a production ready directory.

## Questions

Join the [Convex Discord](https://convex.dev/community) and ask in the component authoring channel.
