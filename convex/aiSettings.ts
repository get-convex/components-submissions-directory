import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

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
  returns: v.string(),
  handler: async () => {
    return DEFAULT_REVIEW_PROMPT;
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
      };
    }

    return {
      content: DEFAULT_REVIEW_PROMPT,
      isDefault: true,
      versionId: undefined,
      createdAt: undefined,
      createdBy: undefined,
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

// Default review prompt (extracted from aiReview.ts)
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
2. Component structure: convex.config.ts at root or src/component/, with functions in component/ directory
3. Functions must use new syntax: query({ args: {}, returns: v.null(), handler: async (ctx, args) => {} })
4. All functions MUST have explicit 'returns' validator (use v.null() for functions that don't return values)
5. Functions returning nothing MUST use v.null() as the return validator, not undefined
6. Internal functions should use internalQuery, internalMutation, internalAction
7. If component needs authorization, use token-based pattern (like Presence component): methods return tokens, subsequent calls require tokens. Note: Not all components need authorization.

WHAT IS A CONVEX COMPONENT:
A Convex component is an npm package that:
- Has convex.config.ts with defineComponent() at root, src/, or src/component/
- Contains Convex functions (queries, mutations, actions) in the component
- Is installed by other Convex apps via npm install
- Exports functionality through the component definition
- Can include schema, client code, and HTTP endpoints

Analyze this code and provide a structured review with:
1. Overall summary (2-3 sentences about component quality and compliance with official Convex component specs)
2. For each criterion IN THE EXACT ORDER LISTED ABOVE, indicate PASS or FAIL with a brief note
3. Suggestions for improvement based on the OFFICIAL DOCUMENTATION REFERENCES above

IMPORTANT: 
- Return criteria in the EXACT same order as listed above
- Base all suggestions on the official Convex documentation links provided
- For any failed criterion, reference the specific documentation URL that explains the correct approach

Respond in this exact JSON format:
{
  "summary": "Your 2-3 sentence summary here",
  "criteria": [
    {"name": "Has convex.config.ts with defineComponent()", "passed": true/false, "notes": "Your note"},
    {"name": "Has component functions", "passed": true/false, "notes": "Your note"},
    {"name": "Functions use new syntax", "passed": true/false, "notes": "Your note"},
    {"name": "All functions have returns: validator", "passed": true/false, "notes": "Your note"},
    {"name": "Uses v.null() for void returns", "passed": true/false, "notes": "Your note"},
    {"name": "Uses withIndex() not filter()", "passed": true/false, "notes": "Your note"},
    {"name": "Internal functions use internal*", "passed": true/false, "notes": "Your note"},
    {"name": "Has TypeScript with proper types", "passed": true/false, "notes": "Your note"},
    {"name": "Uses token-based authorization (when applicable)", "passed": true/false, "notes": "Your note - if component doesn't need auth, mark as PASS with note explaining why auth isn't needed"}
  ],
  "suggestions": "Improvement suggestions with references to official docs (e.g., 'See https://docs.convex.dev/components/authoring for...')"
}`;
