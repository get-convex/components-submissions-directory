import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import {
  AI_REVIEW_PROMPT_STATUS_LABEL,
  AI_REVIEW_PROMPT_UPDATED_AT,
  AI_REVIEW_PROMPT_VERSION,
} from "../shared/aiReviewPromptMeta";
import { DEFAULT_SEO_PROMPT_TEMPLATE, DEFAULT_CONTENT_PROMPT_TEMPLATE } from "../shared/seoPromptTemplate";

// Provider types
const providerValidator = v.union(
  v.literal("anthropic"),
  v.literal("openai"),
  v.literal("gemini"),
);

// Get all AI provider settings
export const getAiProviderSettings = query({
  args: {},
  returns: v.object({
    anthropic: v.object({
      apiKey: v.optional(v.string()),
      model: v.optional(v.string()),
      isEnabled: v.boolean(),
    }),
    openai: v.object({
      apiKey: v.optional(v.string()),
      model: v.optional(v.string()),
      isEnabled: v.boolean(),
    }),
    gemini: v.object({
      apiKey: v.optional(v.string()),
      model: v.optional(v.string()),
      isEnabled: v.boolean(),
    }),
    activeProvider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("gemini"),
      v.null(),
    ),
  }),
  handler: async (ctx) => {
    const providers = ["anthropic", "openai", "gemini"] as const;
    const result: Record<
      string,
      { apiKey?: string; model?: string; isEnabled: boolean }
    > = {};
    let activeProvider: "anthropic" | "openai" | "gemini" | null = null;

    for (const provider of providers) {
      const setting = await ctx.db
        .query("aiProviderSettings")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .first();

      result[provider] = {
        apiKey: setting?.apiKey ? "••••••••" : undefined, // mask for security
        model: setting?.model,
        isEnabled: setting?.isEnabled ?? false,
      };

      if (setting?.isEnabled) {
        activeProvider = provider;
      }
    }

    return {
      anthropic: result.anthropic as {
        apiKey?: string;
        model?: string;
        isEnabled: boolean;
      },
      openai: result.openai as {
        apiKey?: string;
        model?: string;
        isEnabled: boolean;
      },
      gemini: result.gemini as {
        apiKey?: string;
        model?: string;
        isEnabled: boolean;
      },
      activeProvider,
    };
  },
});

// Update AI provider settings (admin only)
export const updateAiProviderSettings = mutation({
  args: {
    provider: providerValidator,
    apiKey: v.optional(v.string()),
    model: v.optional(v.string()),
    isEnabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiProviderSettings")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    // If enabling this provider, disable others
    if (args.isEnabled) {
      const allProviders = await ctx.db.query("aiProviderSettings").collect();
      for (const p of allProviders) {
        if (p.provider !== args.provider && p.isEnabled) {
          await ctx.db.patch(p._id, { isEnabled: false });
        }
      }
    }

    if (existing) {
      // Only update apiKey if provided (not masked value)
      const updates: {
        model?: string;
        isEnabled: boolean;
        updatedAt: number;
        apiKey?: string;
      } = {
        model: args.model,
        isEnabled: args.isEnabled,
        updatedAt: Date.now(),
      };

      // Only update API key if it's not the masked value
      if (args.apiKey && !args.apiKey.includes("••••")) {
        updates.apiKey = args.apiKey;
      }

      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("aiProviderSettings", {
        provider: args.provider,
        apiKey: args.apiKey,
        model: args.model,
        isEnabled: args.isEnabled,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

// Clear provider settings (revert to env var)
export const clearProviderSettings = mutation({
  args: {
    provider: providerValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiProviderSettings")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

// Get the default prompt from aiReview.ts (hardcoded)
export const getDefaultPrompt = query({
  args: {},
  returns: v.object({
    content: v.string(),
    statusLabel: v.string(),
    version: v.string(),
    updatedAt: v.string(),
  }),
  handler: async () => {
    return {
      content: DEFAULT_REVIEW_PROMPT,
      statusLabel: AI_REVIEW_PROMPT_STATUS_LABEL,
      version: AI_REVIEW_PROMPT_VERSION,
      updatedAt: AI_REVIEW_PROMPT_UPDATED_AT,
    };
  },
});

// Get the active prompt (custom or default)
export const getActivePrompt = query({
  args: {},
  returns: v.object({
    content: v.string(),
    isDefault: v.boolean(),
    versionId: v.optional(v.id("aiPromptVersions")),
    createdAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    statusLabel: v.string(),
    version: v.string(),
    promptUpdatedAt: v.string(),
  }),
  handler: async (ctx) => {
    const activeVersion = await ctx.db
      .query("aiPromptVersions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (activeVersion && !activeVersion.isDefault) {
      return {
        content: activeVersion.content,
        isDefault: false,
        versionId: activeVersion._id,
        createdAt: activeVersion.createdAt,
        createdBy: activeVersion.createdBy,
        statusLabel: AI_REVIEW_PROMPT_STATUS_LABEL,
        version: AI_REVIEW_PROMPT_VERSION,
        promptUpdatedAt: AI_REVIEW_PROMPT_UPDATED_AT,
      };
    }

    return {
      content: DEFAULT_REVIEW_PROMPT,
      isDefault: true,
      versionId: undefined,
      createdAt: undefined,
      createdBy: undefined,
      statusLabel: AI_REVIEW_PROMPT_STATUS_LABEL,
      version: AI_REVIEW_PROMPT_VERSION,
      promptUpdatedAt: AI_REVIEW_PROMPT_UPDATED_AT,
    };
  },
});

// Get all prompt versions for history
export const getPromptVersions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("aiPromptVersions"),
      content: v.string(),
      isActive: v.boolean(),
      isDefault: v.boolean(),
      createdAt: v.number(),
      createdBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const versions = await ctx.db
      .query("aiPromptVersions")
      .withIndex("by_created_at")
      .order("desc")
      .take(50);

    return versions;
  },
});

// Save a new prompt version
export const savePromptVersion = mutation({
  args: {
    content: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  returns: v.id("aiPromptVersions"),
  handler: async (ctx, args) => {
    if (!args.content.trim()) {
      throw new Error("Prompt content cannot be empty");
    }

    // Deactivate all existing versions
    const existingVersions = await ctx.db.query("aiPromptVersions").collect();
    for (const v of existingVersions) {
      if (v.isActive) {
        await ctx.db.patch(v._id, { isActive: false });
      }
    }

    // Insert new version as active
    const id = await ctx.db.insert("aiPromptVersions", {
      content: args.content,
      isActive: true,
      isDefault: false,
      createdAt: Date.now(),
      createdBy: args.createdBy,
      notes: args.notes,
    });

    return id;
  },
});

// Activate a specific prompt version
export const activatePromptVersion = mutation({
  args: {
    versionId: v.id("aiPromptVersions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("Prompt version not found");
    }

    // Deactivate all versions
    const allVersions = await ctx.db.query("aiPromptVersions").collect();
    for (const v of allVersions) {
      if (v.isActive) {
        await ctx.db.patch(v._id, { isActive: false });
      }
    }

    // Activate the selected version
    await ctx.db.patch(args.versionId, { isActive: true });

    return null;
  },
});

// Reset to default prompt
export const resetToDefaultPrompt = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Deactivate all custom versions
    const allVersions = await ctx.db.query("aiPromptVersions").collect();
    for (const v of allVersions) {
      if (v.isActive) {
        await ctx.db.patch(v._id, { isActive: false });
      }
    }

    // Check if default version exists
    const defaultVersion = await ctx.db
      .query("aiPromptVersions")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (defaultVersion) {
      await ctx.db.patch(defaultVersion._id, { isActive: true });
    } else {
      // Create default version
      await ctx.db.insert("aiPromptVersions", {
        content: DEFAULT_REVIEW_PROMPT,
        isActive: true,
        isDefault: true,
        createdAt: Date.now(),
        createdBy: "system",
        notes: "Default prompt",
      });
    }

    return null;
  },
});

// Internal query to get active provider settings (with actual API key)
// Used by aiReview action
export const _getActiveProviderSettings = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      provider: v.union(
        v.literal("anthropic"),
        v.literal("openai"),
        v.literal("gemini"),
      ),
      apiKey: v.string(),
      model: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const providers = ["anthropic", "openai", "gemini"] as const;

    for (const provider of providers) {
      const setting = await ctx.db
        .query("aiProviderSettings")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .first();

      if (setting?.isEnabled && setting.apiKey && setting.model) {
        return {
          provider,
          apiKey: setting.apiKey,
          model: setting.model,
        };
      }
    }

    return null;
  },
});

// Internal query to get all provider settings for runtime failover
// Used by aiReview and seoContent actions
export const _getProviderSettingsForFallback = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      provider: v.union(
        v.literal("anthropic"),
        v.literal("openai"),
        v.literal("gemini"),
      ),
      apiKey: v.optional(v.string()),
      model: v.optional(v.string()),
      isEnabled: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const providers = ["anthropic", "openai", "gemini"] as const;
    const settings: Array<{
      provider: "anthropic" | "openai" | "gemini";
      apiKey?: string;
      model?: string;
      isEnabled: boolean;
    }> = [];

    for (const provider of providers) {
      const setting = await ctx.db
        .query("aiProviderSettings")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .first();

      settings.push({
        provider,
        apiKey: setting?.apiKey,
        model: setting?.model,
        isEnabled: setting?.isEnabled ?? false,
      });
    }

    return settings;
  },
});

// Internal query to get active prompt content
// Used by aiReview action
export const _getActivePromptContent = internalQuery({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const activeVersion = await ctx.db
      .query("aiPromptVersions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (activeVersion && !activeVersion.isDefault) {
      return activeVersion.content;
    }

    // Return empty string to indicate use default
    return "";
  },
});

// ============ SEO PROMPT MANAGEMENT ============

// Get the default SEO prompt
export const getSeoDefaultPrompt = query({
  args: {},
  returns: v.string(),
  handler: async () => {
    return DEFAULT_SEO_PROMPT;
  },
});

// Get the active SEO prompt (custom or default)
export const getSeoActivePrompt = query({
  args: {},
  returns: v.object({
    content: v.string(),
    isDefault: v.boolean(),
    versionId: v.optional(v.id("seoPromptVersions")),
    createdAt: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const activeVersion = await ctx.db
      .query("seoPromptVersions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (activeVersion && !activeVersion.isDefault) {
      return {
        content: activeVersion.content,
        isDefault: false,
        versionId: activeVersion._id,
        createdAt: activeVersion.createdAt,
        createdBy: activeVersion.createdBy,
      };
    }

    return {
      content: DEFAULT_SEO_PROMPT,
      isDefault: true,
      versionId: undefined,
      createdAt: undefined,
      createdBy: undefined,
    };
  },
});

// Get all SEO prompt versions for history
export const getSeoPromptVersions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("seoPromptVersions"),
      content: v.string(),
      isActive: v.boolean(),
      isDefault: v.boolean(),
      createdAt: v.number(),
      createdBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const versions = await ctx.db
      .query("seoPromptVersions")
      .withIndex("by_created_at")
      .order("desc")
      .take(50);

    return versions;
  },
});

// Save a new SEO prompt version
export const saveSeoPromptVersion = mutation({
  args: {
    content: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  returns: v.id("seoPromptVersions"),
  handler: async (ctx, args) => {
    if (!args.content.trim()) {
      throw new Error("Prompt content cannot be empty");
    }

    // Deactivate all existing versions
    const existingVersions = await ctx.db.query("seoPromptVersions").collect();
    for (const ver of existingVersions) {
      if (ver.isActive) {
        await ctx.db.patch(ver._id, { isActive: false });
      }
    }

    // Insert new version as active
    const id = await ctx.db.insert("seoPromptVersions", {
      content: args.content,
      isActive: true,
      isDefault: false,
      createdAt: Date.now(),
      createdBy: args.createdBy,
      notes: args.notes,
    });

    return id;
  },
});

// Activate a specific SEO prompt version
export const activateSeoPromptVersion = mutation({
  args: {
    versionId: v.id("seoPromptVersions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error("SEO prompt version not found");
    }

    // Deactivate all versions
    const allVersions = await ctx.db.query("seoPromptVersions").collect();
    for (const ver of allVersions) {
      if (ver.isActive) {
        await ctx.db.patch(ver._id, { isActive: false });
      }
    }

    // Activate the selected version
    await ctx.db.patch(args.versionId, { isActive: true });

    return null;
  },
});

// Reset SEO prompt to default
export const resetSeoToDefaultPrompt = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Deactivate all custom versions
    const allVersions = await ctx.db.query("seoPromptVersions").collect();
    for (const ver of allVersions) {
      if (ver.isActive) {
        await ctx.db.patch(ver._id, { isActive: false });
      }
    }

    // Check if default version exists
    const defaultVersion = await ctx.db
      .query("seoPromptVersions")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (defaultVersion) {
      await ctx.db.patch(defaultVersion._id, { isActive: true });
    } else {
      // Create default version
      await ctx.db.insert("seoPromptVersions", {
        content: DEFAULT_SEO_PROMPT,
        isActive: true,
        isDefault: true,
        createdAt: Date.now(),
        createdBy: "system",
        notes: "Default SEO prompt",
      });
    }

    return null;
  },
});

// Internal query to get active SEO prompt content
// Used by seoContent action
export const _getSeoActivePromptContent = internalQuery({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const activeVersion = await ctx.db
      .query("seoPromptVersions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (activeVersion && !activeVersion.isDefault) {
      return activeVersion.content;
    }

    // Return empty string to indicate use default
    return "";
  },
});

// Default content prompt template (v2 component directory content model)
const DEFAULT_SEO_PROMPT = DEFAULT_CONTENT_PROMPT_TEMPLATE;

// ============ AI REVIEW PROMPT ============

// Default review prompt v6 (updated 2026-03-13)
// Changes from v5:
// - Adds a critical package entry point check for package.json exports
// - Reframes top-level convex/ guidance so it is not treated as a normal packaged component pattern
// - Clarifies that React hooks, helpers, and wrapper APIs may exist in the package without implying direct browser access to component functions
const DEFAULT_REVIEW_PROMPT = `You are reviewing a Convex component package against official Convex component specifications.

OFFICIAL CONVEX COMPONENT DOCUMENTATION REFERENCES:
- Authoring Components: https://docs.convex.dev/components/authoring
- Understanding Components: https://docs.convex.dev/components/understanding
- Using Components: https://docs.convex.dev/components/using
- Function Syntax: https://docs.convex.dev/functions
- Validation: https://docs.convex.dev/functions/validation
- Actions: https://docs.convex.dev/functions/actions
- Best Practices: https://docs.convex.dev/understanding/best-practices

KEY REQUIREMENTS FROM DOCS:
1. Components must have convex.config.ts with defineComponent() export
2. Published component packages should expose entry points in package.json, especially ./convex.config.js and ./_generated/component.js. ./test is strongly recommended for convex-test helpers.
3. Component functions should import query/mutation/action/internal* builders from the component's own ./_generated/server
4. Functions must use object-style syntax, e.g. query({ args: {}, returns: v.string(), handler: async (ctx, args) => {} })
5. Public component functions must have explicit args validators (security-critical)
6. Functions returning nothing must use v.null() as the return validator, not undefined
7. Components do NOT have access to ctx.auth. Authentication must be done in the app, with identifiers or tokens passed into the component.
8. Component function visibility differs from regular Convex apps. Public component functions are server-only across the boundary, but they ARE callable from app-side wrappers or server code via ctx.runQuery, ctx.runMutation, or ctx.runAction. Internal functions are hidden even from the parent app.
9. Components may export React hooks, classes, helper functions, or makeXXXAPI wrappers. Those helpers run in the app or browser environment and must ultimately call public component functions across the boundary.
10. If a component provides functions for apps to re-export (makeXXXAPI pattern), it should use an app-side auth wrapper or accept an auth callback option where appropriate.

REVIEW SCOPE:
- This review starts from a stored package record, but the actual component validity check is based on the linked GitHub repository contents included below.
- Do NOT assume the published npm tarball was scanned.
- Judge whether the repository passes as a valid Convex component. Use npm/package-level details only when they are visible in the repository.
- CRITICAL: Before evaluating ANY criteria, first locate the component source code using the LOCATING THE COMPONENT SOURCE CODE steps below. Do not review example/demo app code as if it were the component itself.

LOCATING THE COMPONENT SOURCE CODE:
- The component's own code is identified by its convex.config.ts file containing defineComponent().
- Do NOT confuse the component source with an example/demo app that CONSUMES the component. A consuming app will have convex.config.ts with defineApp() and app.use(...).
- Common component source locations:
  1. src/component/ inside the package that will be published
  2. A dedicated package directory in a monorepo (e.g., packages/component-name/)
  3. A local component folder in an app repo, such as convex/components/myComponent/
- Common CONSUMER/EXAMPLE locations (these are NOT the component source):
  1. example/ or example-react/ or example-svelte/
  2. A top-level convex/ directory that imports the component via npm package name and uses defineApp() + app.use(...)
  3. A top-level convex/ directory that mainly contains example app code or local app wiring
- A top-level convex/ directory in a single-package repo is more likely an app or local-development layout than publishable component package source. Only treat it as the component source when that exact convex.config.ts uses defineComponent() and the nearby package evidence supports it.
- DISCOVERY STEPS (follow in order):
  1. Search the ENTIRE repository for files named convex.config.ts
  2. For each one, check whether it calls defineComponent() or defineApp()
  3. The file calling defineComponent() marks the component source directory
  4. The file calling defineApp() marks a consuming app (example/demo). Do NOT review this as the component
  5. Review ONLY the component source directory plus nearby package files like package.json, client wrappers, and test helpers for criteria 1-9
  6. If no defineComponent() is found anywhere in the repo, THEN fail criterion 1
- If the repo has both a component source and example apps, base ALL critical criteria (1-9) on the component source. Example app code is irrelevant to the component review except as evidence of usage patterns.
- IMPORTANT: State which directory you identified as the component source in your summary so the reviewer can verify.

IMPORTANT DISTINCTIONS:
- Public component functions become internal references at the app level and are called across the component boundary with ctx.runQuery, ctx.runMutation, or ctx.runAction
- Functions called by apps or app-side wrapper classes across the component boundary = MUST use query/mutation/action
- Functions called ONLY by other functions within the same component = use internalQuery/internalMutation/internalAction
- Component functions should be defined with builders imported from the component's own ./_generated/server
- Components may export React hooks, classes, helper functions, or re-export factories. Those are app-side helpers, not component functions, and should not be mistaken for direct browser access to component functions.
- EXPORTED public component functions should have validators
- Regular TypeScript helper functions do NOT need validators or explicit return type annotations just because they exist in the repository
- Do NOT confuse "called automatically by wrapper code" with "internal." Wrapper/client code runs in the app's environment and calls across the component boundary, which requires public visibility.
- Docstrings like "Called automatically when..." do NOT indicate a function should be internal. Check WHO calls it.

COMPONENT FUNCTION VISIBILITY REFERENCE:
| Who calls the function?                                    | Required visibility                                    |
|------------------------------------------------------------|--------------------------------------------------------|
| Browser/React code calling component functions directly    | Not possible - component functions are server-only across the boundary |
| Browser/React code via exported hooks, classes, or helpers | Allowed if those helpers run in the app environment and call public component functions across the boundary |
| App server code or wrapper class (across boundary)         | query / mutation / action (public)                     |
| Other functions inside the same component only             | internalQuery / internalMutation / internalAction      |

CRITICAL PASS CRITERIA:
1. Has convex.config.ts with defineComponent()
2. Package exports required component entry points
3. Has component functions
4. Component functions import builders from ./_generated/server
5. Functions use object-style syntax
6. Public component functions have args validators
7. Uses v.null() for void returns
8. Does not use ctx.auth in component code
9. Cross-boundary visibility uses public vs internal correctly

ADVISORY NOTES:
10. Queries prefer withIndex() over filter()
11. Has clear TypeScript types and validator-driven shapes
12. Uses auth callback or app-side auth wrapper when needed
13. Client wrappers or helpers follow component usage patterns
14. Public component functions have returns validators for type safety

Analyze this code and provide a structured review with:
1. Overall summary (2-3 sentences answering whether the repository PASSES the critical component checks. Mention advisory improvements separately. STATE WHICH DIRECTORY YOU IDENTIFIED AS THE COMPONENT SOURCE.)
2. For each criterion IN THE EXACT ORDER LISTED ABOVE, indicate PASS or FAIL with a brief note
3. Suggestions for improvement based on the OFFICIAL DOCUMENTATION REFERENCES above

IMPORTANT: 
- Return criteria in the EXACT same order as listed above
- Base all suggestions on the official Convex documentation links provided
- For any failed criterion, reference the specific documentation URL that explains the correct approach
- Criteria 1-9 are the actual pass/fail gate for whether the repo passes as a Convex component
- Criteria 10-14 are advisory only and should NOT by themselves cause the repository to fail
- Do NOT flag regular helper functions for missing validators
- Criterion 2 should use visible package.json exports and nearby package files as evidence. Missing ./convex.config.js or ./_generated/component.js in package exports is a failure for a package review. Missing ./test should be called out clearly, and can count against the criterion when the package claims test helper support or otherwise appears intended for package distribution.
- Criterion 6 only checks args validators on public query/mutation/action functions. Missing returns validators are advisory (criterion 14), not a failure. Internal functions (internalQuery, internalMutation, internalAction) and regular helper functions are exempt from both checks.
- Do NOT flag public API functions for not using internal* (they are intentionally public across the component boundary)
- For criterion 12, if auth is not relevant, mark it passed and say it is not applicable
- For criterion 13, if no client helpers are present, treat it as advisory and explain the uncertainty rather than failing the repo on that basis

Respond in this exact JSON format:
{
  "summary": "Your 2-3 sentence summary here. STATE THE COMPONENT SOURCE DIRECTORY (e.g., 'Component source identified at src/component/').",
  "criteria": [
    {"name": "Has convex.config.ts with defineComponent()", "passed": true/false, "notes": "Your note"},
    {"name": "Package exports required component entry points", "passed": true/false, "notes": "Your note - inspect package.json exports for ./convex.config.js and ./_generated/component.js. Mention ./test clearly when present or missing."},
    {"name": "Has component functions", "passed": true/false, "notes": "Your note"},
    {"name": "Component functions import builders from ./_generated/server", "passed": true/false, "notes": "Your note"},
    {"name": "Functions use object-style syntax", "passed": true/false, "notes": "Your note"},
    {"name": "Public component functions have args validators", "passed": true/false, "notes": "Your note - only check args on exported public query/mutation/action functions. Missing returns validators are tracked separately as advisory. Internal functions are exempt."},
    {"name": "Uses v.null() for void returns", "passed": true/false, "notes": "Your note - only fail this when a returns validator is present but uses the wrong type for a void return. If no returns validator exists at all, track that under criterion 14 instead."},
    {"name": "Does not use ctx.auth in component code", "passed": true/false, "notes": "Your note - components should receive auth-derived identifiers from the app instead"},
    {"name": "Cross-boundary visibility uses public vs internal correctly", "passed": true/false, "notes": "Your note - functions called by apps or wrapper classes across the component boundary must remain public"},
    {"name": "Queries prefer withIndex() over filter()", "passed": true/false, "notes": "Your note - advisory only"},
    {"name": "Has clear TypeScript types and validator-driven shapes", "passed": true/false, "notes": "Your note - advisory only"},
    {"name": "Uses auth callback or app-side auth wrapper when needed", "passed": true/false, "notes": "Your note - advisory only; if auth is not relevant, say not applicable"},
    {"name": "Client wrappers or helpers follow component usage patterns", "passed": true/false, "notes": "Your note - advisory only; if no client helpers are present, explain the uncertainty"},
    {"name": "Public component functions have returns validators", "passed": true/false, "notes": "Your note - advisory only. The Convex docs recommend returns validators for type safety but do not require them. Missing returns should not fail the review."}
  ],
  "suggestions": "Improvement suggestions with references to official docs (e.g., 'See https://docs.convex.dev/components/authoring for...')"
}`;
