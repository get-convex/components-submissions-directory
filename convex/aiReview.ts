"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildProviderCandidates, executeWithProviderFallback, ProviderSettingsForFallback, AiProvider, AiProviderSource } from "./aiProviderFallback";

// Helper function to call different AI providers
export async function callAiProvider(
  provider: "anthropic" | "openai" | "gemini",
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  switch (provider) {
    case "anthropic": {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }
      return content.text;
    }

    case "openai": {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }
      return content;
    }

    case "gemini": {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      if (!text) {
        throw new Error("No content in Gemini response");
      }
      return text;
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Convex component review criteria (v4 - updated 2026-03-08)
export const REVIEW_CRITERIA = [
  {
    name: "Has convex.config.ts with defineComponent()",
    check: "Check for convex.config.ts in root with defineComponent() export",
    critical: true,
  },
  {
    name: "Has component functions",
    check: "Check for TypeScript files with queries, mutations, or actions in component/ or root",
    critical: true,
  },
  {
    name: "Component functions import builders from ./_generated/server",
    check:
      "Check that component functions import query, mutation, action, and internal* builders from the component's own ./_generated/server, not an app-level generated server path",
    critical: true,
  },
  {
    name: "Functions use object-style syntax",
    check:
      "Check for query({ ... }), mutation({ ... }), action({ ... }), internalQuery({ ... }), internalMutation({ ... }), or internalAction({ ... }) object-style definitions",
    critical: true,
  },
  {
    name: "Public component functions have validators",
    check:
      "Check that exported public query, mutation, and action functions have explicit args and returns validators. Regular TypeScript helper functions do NOT need function-level validators.",
    critical: true,
  },
  {
    name: "Uses v.null() for void returns",
    check: "Functions returning nothing use v.null() rather than undefined",
    critical: true,
  },
  {
    name: "Does not use ctx.auth in component code",
    check:
      "Check that component implementation does not call ctx.auth. Components must receive auth-derived identifiers from the app instead.",
    critical: true,
  },
  {
    name: "Cross-boundary visibility uses public vs internal correctly",
    check:
      "Functions called by app code or wrapper classes across the component boundary must be public query/mutation/action. Functions used only inside the same component should use internalQuery/internalMutation/internalAction.",
    critical: true,
  },
  {
    name: "Queries prefer withIndex() over filter()",
    check: "Use withIndex() when the query pattern clearly calls for an index; avoid filter() when an index-based query is the better fit",
    critical: false,
  },
  {
    name: "Has clear TypeScript types and validator-driven shapes",
    check:
      "Types, validators, and return shapes should be clear and consistent. Prefer validator-driven contracts and avoid loose typing when stronger types are visible from the repo.",
    critical: false,
  },
  {
    name: "Uses auth callback or app-side auth wrapper when needed",
    check:
      "If auth is needed for app-facing or re-exported APIs, prefer an app-side wrapper or auth callback pattern. If auth is not relevant, mark this as passed with a note saying it is not applicable.",
    critical: false,
  },
  {
    name: "Package exports or client helpers look publish-ready",
    check:
      "When visible in the repo, package.json exports, client helpers, and component entry points should look ready for apps to consume. If packaging details are not present, treat this as advisory and explain the uncertainty.",
    critical: false,
  },
];

// Types for shared review results
export interface ReviewCriterion {
  name: string;
  passed: boolean;
  notes: string;
}

export interface ReviewResult {
  status: "passed" | "failed" | "partial" | "error";
  summary: string;
  criteria: ReviewCriterion[];
  error?: string;
}

// Fetch repository contents from GitHub (for Convex components)
export async function fetchGitHubRepo(repoUrl: string, githubToken?: string) {
  // Normalize the URL to handle various formats
  const normalizedUrl = repoUrl
    .replace(/^git\+/, "") // Remove git+ prefix (npm style)
    .replace(/\.git$/, "") // Remove .git suffix
    .replace(/\/$/, "") // Remove trailing slash
    .replace(/\/tree\/[^/]+.*$/, "") // Remove /tree/branch paths
    .replace(/\/blob\/[^/]+.*$/, "") // Remove /blob/branch/file paths
    .replace(/#.*$/, ""); // Remove hash fragments

  // Extract owner and repo from URL
  // Supports: github.com/owner/repo, www.github.com/owner/repo
  const match = normalizedUrl.match(/github\.com\/([^/]+)\/([^/]+)$/);
  if (!match) {
    console.error("Failed to parse GitHub URL:", repoUrl, "->", normalizedUrl);
    throw new Error(
      `Invalid GitHub repository URL: ${repoUrl}. Expected format: https://github.com/owner/repo`
    );
  }

  const [, owner, repo] = match;
  console.log("Fetching GitHub repo:", owner, "/", repo, "from URL:", repoUrl);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Convex-NPM-Directory",
  };

  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  const files: Array<{ name: string; content: string }> = [];

  // Helper to fetch file content
  async function fetchFileContent(path: string): Promise<{ found: boolean; content: string }> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { found: false, content: "" };
    }
    const data = await response.json();
    if (data.type === "file" && data.download_url) {
      const contentResponse = await fetch(data.download_url, { headers });
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        return { found: true, content };
      }
    }
    return { found: false, content: "" };
  }

  // Helper to fetch directory contents
  async function fetchDirContents(
    path: string
  ): Promise<Array<{ name: string; download_url: string }>> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data
        .filter((item: any) => item.type === "file" && item.name.endsWith(".ts"))
        .map((item: any) => ({
          name: item.name,
          download_url: item.download_url,
        }));
    }
    return [];
  }

  // First, try to discover monorepo package directories
  const monorepoPackages: string[] = [];
  const packagesUrl = `https://api.github.com/repos/${owner}/${repo}/contents/packages`;
  const packagesResponse = await fetch(packagesUrl, { headers });
  if (packagesResponse.ok) {
    const packagesData = await packagesResponse.json();
    if (Array.isArray(packagesData)) {
      for (const item of packagesData) {
        if (item.type === "dir") {
          monorepoPackages.push(item.name);
        }
      }
    }
  }

  // All possible paths for convex.config.ts (check in priority order)
  // Supports various component structures including deeply nested ones
  const configPaths = [
    // Monorepo structures (packages/<name>/src/component/)
    ...monorepoPackages.map((pkg) => `packages/${pkg}/src/component/convex.config.ts`),
    ...monorepoPackages.map((pkg) => `packages/${pkg}/convex.config.ts`),
    ...monorepoPackages.map((pkg) => `packages/${pkg}/component/convex.config.ts`),
    // Deep nested structures (like useautumn/typescript: convex/src/component/)
    "convex/src/component/convex.config.ts",
    "convex/component/convex.config.ts",
    "convex/convex.config.ts",
    // Standard structures
    "src/component/convex.config.ts",
    "src/convex.config.ts",
    // Root level
    "convex.config.ts",
    // Additional patterns
    "packages/component/convex.config.ts",
    "lib/convex.config.ts",
  ];

  let foundConfigPath = "";

  // Find convex.config.ts
  for (const configPath of configPaths) {
    const result = await fetchFileContent(configPath);
    if (result.found) {
      foundConfigPath = configPath;
      files.push({ name: configPath, content: result.content });
      break;
    }
  }

  if (!foundConfigPath) {
    console.log(
      "No convex.config.ts found in repo",
      owner,
      "/",
      repo,
      "- checked paths:",
      configPaths
    );
    return { exists: false, files: [], isComponent: false };
  }

  console.log("Found convex.config.ts at:", foundConfigPath);

  // Determine component directory based on config location
  // Extract the directory containing convex.config.ts
  const configDir = foundConfigPath.replace("/convex.config.ts", "");
  const componentDirPaths: string[] = [];

  if (foundConfigPath.includes("/src/component/")) {
    // Config is in .../src/component/, component files are siblings
    componentDirPaths.push(configDir);
  } else if (foundConfigPath.startsWith("convex/src/component/")) {
    // Config is in convex/src/component/, look for siblings
    componentDirPaths.push("convex/src/component");
  } else if (foundConfigPath.startsWith("convex/component/")) {
    // Config is in convex/component/
    componentDirPaths.push("convex/component");
  } else if (foundConfigPath.startsWith("convex/")) {
    // Config is in convex/, check convex/component/ first, then convex/
    componentDirPaths.push("convex/src/component", "convex/component", "convex");
  } else if (foundConfigPath.startsWith("src/component/")) {
    // Config is in src/component/, component files are likely siblings
    componentDirPaths.push("src/component");
  } else if (foundConfigPath.startsWith("src/")) {
    // Config is in src/, check src/component/ first, then src/
    componentDirPaths.push("src/component", "src");
  } else if (foundConfigPath.startsWith("packages/")) {
    // Monorepo structure - use the config directory
    componentDirPaths.push(configDir);
  } else if (foundConfigPath.startsWith("lib/")) {
    componentDirPaths.push("lib");
  } else {
    // Config is at root, check component/ first, then root
    componentDirPaths.push("component", "");
  }

  // Fetch component files
  for (const dirPath of componentDirPaths) {
    const dirFiles = await fetchDirContents(dirPath);
    if (dirFiles.length > 0) {
      for (const file of dirFiles) {
        // Skip the config file if it's in this directory
        if (file.name === "convex.config.ts") continue;
        const contentResponse = await fetch(file.download_url, { headers });
        if (contentResponse.ok) {
          const content = await contentResponse.text();
          const fullPath = dirPath ? `${dirPath}/${file.name}` : file.name;
          files.push({ name: fullPath, content });
        }
      }
      break; // Found files in this directory, stop looking
    }
  }

  return {
    exists: true,
    files,
    isComponent: files.length > 0,
  };
}

// Build the AI review prompt from repo files
export function buildReviewPrompt(
  repoFiles: Array<{ name: string; content: string }>,
  packageName: string,
  version: string,
  customPromptContent?: string
): string {
  const filesContext = repoFiles
    .map((f) => `File: ${f.name}\n\`\`\`typescript\n${f.content}\n\`\`\``)
    .join("\n\n");

  const criteriaList = REVIEW_CRITERIA.map(
    (c, i) => `${i + 1}. ${c.name}: ${c.check}${c.critical ? " (CRITICAL)" : ""}`
  ).join("\n");

  let basePrompt: string;
  if (customPromptContent) {
    basePrompt = customPromptContent;
  } else {
    const docsReference = `
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
2. Component structure: convex.config.ts at root or src/component/, with functions in the component's own code
3. Component functions should import query/mutation/action/internal* builders from the component's own ./_generated/server
4. Functions must use object-style syntax, e.g. query({ args: {}, returns: v.string(), handler: async (ctx, args) => {} })
5. Public component functions should have explicit args and returns validators
6. Functions returning nothing must use v.null() as the return validator, not undefined
7. Components do NOT have access to ctx.auth. Authentication must be done in the app, with identifiers or tokens passed into the component.
8. Component function visibility differs from regular Convex apps. Public component functions are not browser-client-accessible, but they ARE callable across the component boundary via ctx.runQuery, ctx.runMutation, or ctx.runAction from the app or wrapper code. Internal functions are hidden even from the parent app.
9. If a component provides functions for apps to re-export (makeXXXAPI pattern), it should use an app-side auth wrapper or accept an auth callback option where appropriate.
`;

    basePrompt = `You are reviewing a Convex component package against official Convex component specifications.

${docsReference}

REVIEW SCOPE:
- This review starts from a stored package record, but the actual component validity check is based on the linked GitHub repository contents included below.
- Do NOT assume the published npm tarball was scanned.
- Judge whether the repository passes as a valid Convex component. Use npm/package-level details only when they are visible in the repository.

IMPORTANT DISTINCTIONS:
- Public component functions become internal references at the app level and are called across the component boundary with ctx.runQuery, ctx.runMutation, or ctx.runAction
- Functions called by apps or client wrapper classes across the component boundary = MUST use query/mutation/action
- Functions called ONLY by other functions within the same component = use internalQuery/internalMutation/internalAction
- Component functions should be defined with builders imported from the component's own ./_generated/server
- EXPORTED public component functions should have validators
- Regular TypeScript helper functions do NOT need validators or explicit return type annotations just because they exist in the repository
- Do NOT confuse "called automatically by wrapper code" with "internal." Wrapper/client code runs in the app's environment and calls across the component boundary, which requires public visibility.
- Docstrings like "Called automatically when..." do NOT indicate a function should be internal. Check WHO calls it.

COMPONENT FUNCTION VISIBILITY REFERENCE:
| Who calls the function?                                    | Required visibility                                    |
|------------------------------------------------------------|--------------------------------------------------------|
| Browser/React client directly                              | Not possible - all component functions are server-only at the app level |
| App server code or client wrapper class (across boundary)  | query / mutation / action (public)                     |
| Other functions inside the same component only             | internalQuery / internalMutation / internalAction      |

CRITICAL PASS CRITERIA:
1. Has convex.config.ts with defineComponent()
2. Has component functions
3. Component functions import builders from ./_generated/server
4. Functions use object-style syntax
5. Public component functions have validators (internalQuery/internalMutation/internalAction are exempt)
6. Uses v.null() for void returns
7. Does not use ctx.auth in component code
8. Cross-boundary visibility uses public vs internal correctly

ADVISORY NOTES:
9. Queries prefer withIndex() over filter()
10. Has clear TypeScript types and validator-driven shapes
11. Uses auth callback or app-side auth wrapper when needed
12. Package exports or client helpers look publish-ready

Analyze this code and provide a structured review with:
1. Overall summary (2-3 sentences answering whether the repository PASSES the critical component checks. Mention advisory improvements separately.)
2. For each criterion IN THE EXACT ORDER LISTED ABOVE, indicate PASS or FAIL with a brief note
3. Suggestions for improvement based on the OFFICIAL DOCUMENTATION REFERENCES above

IMPORTANT: 
- Return criteria in the EXACT same order as listed above
- Base all suggestions on the official Convex documentation links provided
- For any failed criterion, reference the specific documentation URL that explains the correct approach
- Criteria 1-8 are the actual pass/fail gate for whether the repo passes as a Convex component
- Criteria 9-12 are advisory only and should NOT by themselves cause the repository to fail
- Do NOT flag regular helper functions for missing validators
- Do NOT fail criterion 5 for missing validators on internalQuery, internalMutation, or internalAction functions. Only public query/mutation/action functions that cross the component boundary require explicit args and returns validators for this review.
- Do NOT flag public API functions for not using internal* (they are intentionally public across the component boundary)
- For criterion 11, if auth is not relevant, mark it passed and say it is not applicable
- For criterion 12, if packaging details are not visible in the repository, treat it as advisory and explain the uncertainty rather than failing the repo on that basis

Respond in this exact JSON format:
{
  "summary": "Your 2-3 sentence summary here",
  "criteria": [
    {"name": "Has convex.config.ts with defineComponent()", "passed": true/false, "notes": "Your note"},
    {"name": "Has component functions", "passed": true/false, "notes": "Your note"},
    {"name": "Component functions import builders from ./_generated/server", "passed": true/false, "notes": "Your note"},
    {"name": "Functions use object-style syntax", "passed": true/false, "notes": "Your note"},
    {"name": "Public component functions have validators", "passed": true/false, "notes": "Your note - only check exported public query/mutation/action functions. Internal functions (internalQuery, internalMutation, internalAction) and regular helper functions are exempt from this requirement."},
    {"name": "Uses v.null() for void returns", "passed": true/false, "notes": "Your note"},
    {"name": "Does not use ctx.auth in component code", "passed": true/false, "notes": "Your note - components should receive auth-derived identifiers from the app instead"},
    {"name": "Cross-boundary visibility uses public vs internal correctly", "passed": true/false, "notes": "Your note - functions called by apps or wrapper classes across the component boundary must remain public"},
    {"name": "Queries prefer withIndex() over filter()", "passed": true/false, "notes": "Your note - advisory only"},
    {"name": "Has clear TypeScript types and validator-driven shapes", "passed": true/false, "notes": "Your note - advisory only"},
    {"name": "Uses auth callback or app-side auth wrapper when needed", "passed": true/false, "notes": "Your note - advisory only; if auth is not relevant, say not applicable"},
    {"name": "Package exports or client helpers look publish-ready", "passed": true/false, "notes": "Your note - advisory only; if packaging details are not visible in the repository, explain the uncertainty"}
  ],
  "suggestions": "Improvement suggestions with references to official docs (e.g., 'See https://docs.convex.dev/components/authoring for...')"
}`;
  }

  return `${basePrompt}

PACKAGE: ${packageName}
VERSION: ${version}

CRITERIA TO CHECK (in order, marking critical ones):
${criteriaList}

SOURCE CODE (convex.config.ts + component files):
${filesContext}`;
}

// Parse AI response and determine review result
export function parseReviewResponse(aiResponseText: string): ReviewResult {
  let jsonText = aiResponseText.trim();
  const jsonMatch =
    jsonText.match(/```json\n?([\s\S]*?)\n?```/) || jsonText.match(/```\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  const aiResponse = JSON.parse(jsonText) as {
    summary: string;
    criteria: Array<{ name: string; passed: boolean; notes: string }>;
    suggestions?: string;
  };

  const criticalCriteriaResults = aiResponse.criteria.filter(
    (_criterion, index) => REVIEW_CRITERIA[index]?.critical
  );
  const anyCriticalFailed = criticalCriteriaResults.some((criterion) => !criterion.passed);

  let status: "passed" | "failed" | "partial" = "passed";
  if (anyCriticalFailed) {
    status = "failed";
  }

  let summary = aiResponse.summary;
  if (aiResponse.suggestions) {
    summary += `\n\nSuggestions: ${aiResponse.suggestions}`;
  }

  return {
    status,
    summary,
    criteria: aiResponse.criteria,
  };
}

// Shared helper for running the AI review on a repo
// Used by both admin reviews and public preflight checks
export async function runReviewOnRepo(
  repoUrl: string,
  packageName: string,
  version: string,
  providerSettings: ProviderSettingsForFallback[] | null,
  customPromptContent?: string
): Promise<ReviewResult & { provider?: AiProvider; model?: string; source?: AiProviderSource; rawOutput?: string }> {
  const githubToken = process.env.GITHUB_TOKEN;
  const repoData = await fetchGitHubRepo(repoUrl, githubToken);

  if (!repoData.exists || !repoData.isComponent || repoData.files.length === 0) {
    return {
      status: "failed",
      summary:
        "Review failed: No convex.config.ts found in repository. This package is not a valid Convex component. Components must have convex.config.ts with defineComponent().",
      criteria: REVIEW_CRITERIA.map((c) => ({
        name: c.name,
        passed: false,
        notes:
          c.name === "Has convex.config.ts with defineComponent()"
            ? "Failed: No convex.config.ts found"
            : "Unable to check: Not a Convex component",
      })),
    };
  }

  const prompt = buildReviewPrompt(repoData.files, packageName, version, customPromptContent);

  const candidates = buildProviderCandidates({
    adminProviders: providerSettings ?? [],
    envKeys: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.CONVEX_OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY ?? process.env.CONVEX_GEMINI_API_KEY,
    },
    defaultEnvModels: {
      anthropic: "claude-opus-4-6",
      openai: "gpt-5.2",
      gemini: "gemini-3-pro",
    },
  });

  const {
    result: aiResponseText,
    usedProvider,
    usedModel,
    usedSource,
  } = await executeWithProviderFallback({
    candidates,
    run: async (candidate) =>
      callAiProvider(candidate.provider, candidate.apiKey, candidate.model, prompt),
  });

  console.log(`AI review provider selected: ${usedProvider} (${usedSource}) model=${usedModel}`);

  const reviewResult = parseReviewResponse(aiResponseText);

  return {
    ...reviewResult,
    provider: usedProvider,
    model: usedModel,
    source: usedSource,
    rawOutput: aiResponseText,
  };
}

// Internal action for public preflight checks
// Does not persist to packages table, only returns result
export const runPreflightCheck = internalAction({
  args: {
    repoUrl: v.string(),
    packageName: v.optional(v.string()),
  },
  returns: v.object({
    status: v.union(
      v.literal("passed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("error"),
    ),
    summary: v.string(),
    criteria: v.array(
      v.object({
        name: v.string(),
        passed: v.boolean(),
        notes: v.string(),
      }),
    ),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const providerSettings = await ctx.runQuery(
        internal.aiSettings._getProviderSettingsForFallback
      );
      const customPromptContent = await ctx.runQuery(internal.aiSettings._getActivePromptContent);

      const result = await runReviewOnRepo(
        args.repoUrl,
        args.packageName || "Unknown Package",
        "0.0.0",
        providerSettings,
        customPromptContent ?? undefined
      );

      return {
        status: result.status,
        summary: result.summary,
        criteria: result.criteria,
        error: result.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "error" as const,
        summary: "Preflight check encountered an error",
        criteria: [],
        error: message,
      };
    }
  },
});

// Run AI review using configured provider (Anthropic, OpenAI, or Gemini)
// Uses the shared runReviewOnRepo helper but persists results to the package record
export const runAiReview = action({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reviewCreatedAt = Date.now();

    // Set status to reviewing
    await ctx.runMutation(api.packages.updateAiReviewStatus, {
      packageId: args.packageId,
      status: "reviewing",
    });

    try {
      // SECURITY: Use internal query to get full package data including repositoryUrl
      const pkg = await ctx.runQuery(internal.packages._getPackage, {
        packageId: args.packageId,
      });

      if (!pkg) {
        throw new Error("Package not found");
      }

      // Check if package has GitHub repository URL
      if (!pkg.repositoryUrl) {
        const summary =
          "Cannot perform full review: Package does not have a GitHub repository URL. Only npm metadata is available.";
        const criteria = REVIEW_CRITERIA.map((c) => ({
          name: c.name,
          passed: false,
          notes: "Unable to check: No repository URL provided",
        }));

        await ctx.runMutation(api.packages.updateAiReviewResult, {
          packageId: args.packageId,
          status: "partial",
          summary,
          criteria,
          error: undefined,
        });
        await ctx.runMutation(internal.packages._createAiReviewRun, {
          packageId: args.packageId,
          createdAt: reviewCreatedAt,
          status: "partial",
          summary,
          criteria,
          error: undefined,
          provider: undefined,
          model: undefined,
          source: undefined,
          rawOutput: undefined,
        });
        return null;
      }

      // Get provider settings and prompt from aiSettings
      const providerSettings = await ctx.runQuery(
        internal.aiSettings._getProviderSettingsForFallback
      );
      const customPromptContent = await ctx.runQuery(internal.aiSettings._getActivePromptContent);

      // Use the shared review helper
      const result = await runReviewOnRepo(
        pkg.repositoryUrl,
        pkg.name,
        pkg.version,
        providerSettings,
        customPromptContent ?? undefined
      );

      // Store review results
      await ctx.runMutation(api.packages.updateAiReviewResult, {
        packageId: args.packageId,
        status: result.status,
        summary: result.summary,
        criteria: result.criteria,
        error: result.error,
      });
      await ctx.runMutation(internal.packages._createAiReviewRun, {
        packageId: args.packageId,
        createdAt: reviewCreatedAt,
        status: result.status,
        summary: result.summary,
        criteria: result.criteria,
        error: result.error,
        provider: result.provider,
        model: result.model,
        source: result.source,
        rawOutput: result.rawOutput,
      });

      const settings = await ctx.runQuery(api.packages.getAdminSettings);
      if (settings.autoAiReview) {
        if (result.status === "passed" && settings.autoApproveOnPass) {
          await ctx.runMutation(api.packages.updateReviewStatus, {
            packageId: args.packageId,
            reviewStatus: "approved",
            reviewedBy: "AI",
            reviewNotes: "Auto-approved after AI review passed all critical checks",
          });
        } else if (result.status === "failed" && settings.autoRejectOnFail) {
          await ctx.runMutation(api.packages.updateReviewStatus, {
            packageId: args.packageId,
            reviewStatus: "rejected",
            reviewedBy: "AI",
            reviewNotes: "Auto-rejected after AI review failed critical checks",
          });
        }
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const summary = "AI review encountered an error";

      // Store error
      await ctx.runMutation(api.packages.updateAiReviewResult, {
        packageId: args.packageId,
        status: "error",
        summary,
        criteria: [],
        error: message,
      });
      await ctx.runMutation(internal.packages._createAiReviewRun, {
        packageId: args.packageId,
        createdAt: reviewCreatedAt,
        status: "error",
        summary,
        criteria: [],
        error: message,
        provider: undefined,
        model: undefined,
        source: undefined,
        rawOutput: undefined,
      });
      return null;
    }
  },
});
