"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";

// Convex component review criteria
const REVIEW_CRITERIA = [
  {
    name: "Has convex.config.ts with defineComponent()",
    check: "Check for convex.config.ts in root with defineComponent() export",
    critical: true,
  },
  {
    name: "Has component functions",
    check:
      "Check for TypeScript files with queries, mutations, or actions in component/ or root",
    critical: true,
  },
  {
    name: "Functions use new syntax",
    check: "Check for query({, mutation({, action({ with args/handler",
    critical: true,
  },
  {
    name: "All functions have returns: validator",
    check: "Check handler signatures include return validators",
    critical: true,
  },
  {
    name: "Uses v.null() for void returns",
    check: "Functions returning nothing use v.null() not undefined",
    critical: true,
  },
  {
    name: "Indexes follow naming convention",
    check: "If schema exists, index names match by_field1_and_field2 pattern",
    critical: false,
  },
  {
    name: "Uses withIndex() not filter()",
    check: "Queries use indexes instead of filter",
    critical: false,
  },
  {
    name: "Internal functions use internal*",
    check: "Sensitive functions use internalQuery, etc.",
    critical: false,
  },
  {
    name: "Has TypeScript with proper types",
    check: 'Uses Id<"table"> types, proper validators',
    critical: false,
  },
  {
    name: "Uses token-based authorization (when applicable)",
    check:
      "If component needs auth, uses token-based pattern like Presence component (heartbeat returns tokens, methods require tokens). Not all components need auth.",
    critical: false,
  },
];

// Fetch repository contents from GitHub (for Convex components)
async function fetchGitHubRepo(repoUrl: string, githubToken?: string) {
  // Extract owner and repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  const [, owner, repo] = match;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Convex-NPM-Directory",
  };

  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  const files: Array<{ name: string; content: string }> = [];

  // Helper to fetch file content
  async function fetchFileContent(
    path: string,
  ): Promise<{ found: boolean; content: string }> {
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
    path: string,
  ): Promise<Array<{ name: string; download_url: string }>> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data
        .filter(
          (item: any) => item.type === "file" && item.name.endsWith(".ts"),
        )
        .map((item: any) => ({
          name: item.name,
          download_url: item.download_url,
        }));
    }
    return [];
  }

  // All possible paths for convex.config.ts (check in priority order)
  // Supports various component structures including deeply nested ones
  const configPaths = [
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
    return { exists: false, files: [], isComponent: false };
  }

  // Determine component directory based on config location
  // Extract the directory containing convex.config.ts
  const configDir = foundConfigPath.replace("/convex.config.ts", "");
  const componentDirPaths: string[] = [];

  if (foundConfigPath.startsWith("convex/src/component/")) {
    // Config is in convex/src/component/, look for siblings
    componentDirPaths.push("convex/src/component");
  } else if (foundConfigPath.startsWith("convex/component/")) {
    // Config is in convex/component/
    componentDirPaths.push("convex/component");
  } else if (foundConfigPath.startsWith("convex/")) {
    // Config is in convex/, check convex/component/ first, then convex/
    componentDirPaths.push(
      "convex/src/component",
      "convex/component",
      "convex",
    );
  } else if (foundConfigPath.startsWith("src/component/")) {
    // Config is in src/component/, component files are likely siblings
    componentDirPaths.push("src/component");
  } else if (foundConfigPath.startsWith("src/")) {
    // Config is in src/, check src/component/ first, then src/
    componentDirPaths.push("src/component", "src");
  } else if (foundConfigPath.startsWith("packages/")) {
    // Monorepo structure
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

// Run AI review using Anthropic Claude
export const runAiReview = action({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Set status to reviewing
    await ctx.runMutation(api.packages.updateAiReviewStatus, {
      packageId: args.packageId,
      status: "reviewing",
    });

    try {
      // Get package info
      const pkg = await ctx.runQuery(api.packages.getPackage, {
        packageId: args.packageId,
      });

      if (!pkg) {
        throw new Error("Package not found");
      }

      // Check if package has GitHub repository URL
      if (!pkg.repositoryUrl) {
        await ctx.runMutation(api.packages.updateAiReviewResult, {
          packageId: args.packageId,
          status: "partial",
          summary:
            "Cannot perform full review: Package does not have a GitHub repository URL. Only npm metadata is available.",
          criteria: REVIEW_CRITERIA.map((c) => ({
            name: c.name,
            passed: false,
            notes: "Unable to check: No repository URL provided",
          })),
          error: undefined,
        });
        return null;
      }

      // Fetch GitHub repository contents
      const githubToken = process.env.GITHUB_TOKEN;
      const repoData = await fetchGitHubRepo(pkg.repositoryUrl, githubToken);

      if (
        !repoData.exists ||
        !repoData.isComponent ||
        repoData.files.length === 0
      ) {
        await ctx.runMutation(api.packages.updateAiReviewResult, {
          packageId: args.packageId,
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
          error: undefined,
        });
        return null;
      }

      // Prepare AI prompt
      const filesContext = repoData.files
        .map((f) => `File: ${f.name}\n\`\`\`typescript\n${f.content}\n\`\`\``)
        .join("\n\n");

      const criteriaList = REVIEW_CRITERIA.map(
        (c, i) =>
          `${i + 1}. ${c.name}: ${c.check}${c.critical ? " (CRITICAL)" : ""}`,
      ).join("\n");

      // Build the official documentation reference for AI context
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
2. Component structure: convex.config.ts at root or src/component/, with functions in component/ directory
3. Functions must use new syntax: query({ args: {}, returns: v.null(), handler: async (ctx, args) => {} })
4. All functions MUST have explicit 'returns' validator (use v.null() for functions that don't return values)
5. Functions returning nothing MUST use v.null() as the return validator, not undefined
6. Internal functions should use internalQuery, internalMutation, internalAction
7. Indexes should follow naming convention: by_field1_and_field2
8. If component needs authorization, use token-based pattern (like Presence component): methods return tokens, subsequent calls require tokens. Note: Not all components need authorization.
`;

      const prompt = `You are reviewing a Convex component package against official Convex component specifications.

${docsReference}

WHAT IS A CONVEX COMPONENT:
A Convex component is an npm package that:
- Has convex.config.ts with defineComponent() at root, src/, or src/component/
- Contains Convex functions (queries, mutations, actions) in the component
- Is installed by other Convex apps via npm install
- Exports functionality through the component definition
- Can include schema, client code, and HTTP endpoints

PACKAGE: ${pkg.name}
VERSION: ${pkg.version}

CRITERIA TO CHECK (in order, marking critical ones):
${criteriaList}

SOURCE CODE (convex.config.ts + component files):
${filesContext}

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
    {"name": "Indexes follow naming convention", "passed": true/false, "notes": "Your note"},
    {"name": "Uses withIndex() not filter()", "passed": true/false, "notes": "Your note"},
    {"name": "Internal functions use internal*", "passed": true/false, "notes": "Your note"},
    {"name": "Has TypeScript with proper types", "passed": true/false, "notes": "Your note"},
    {"name": "Uses token-based authorization (when applicable)", "passed": true/false, "notes": "Your note - if component doesn't need auth, mark as PASS with note explaining why auth isn't needed"}
  ],
  "suggestions": "Improvement suggestions with references to official docs (e.g., 'See https://docs.convex.dev/components/authoring for...')"
}`;

      // Call Anthropic Claude API
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        throw new Error("ANTHROPIC_API_KEY not configured");
      }

      const anthropic = new Anthropic({ apiKey: anthropicKey });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Parse AI response
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      // Extract JSON from response (it might be wrapped in markdown code blocks)
      let jsonText = content.text.trim();
      const jsonMatch =
        jsonText.match(/```json\n?([\s\S]*?)\n?```/) ||
        jsonText.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const aiResponse = JSON.parse(jsonText);

      // Determine overall status
      const allPassed = aiResponse.criteria.every((c: any) => c.passed);
      const anyCriticalFailed = aiResponse.criteria.some(
        (c: any, i: number) => !c.passed && REVIEW_CRITERIA[i]?.critical,
      );

      let status: "passed" | "failed" | "partial" = "passed";
      if (anyCriticalFailed) {
        status = "failed";
      } else if (!allPassed) {
        status = "partial";
      }

      // Build summary
      let summary = aiResponse.summary;
      if (aiResponse.suggestions) {
        summary += `\n\nSuggestions: ${aiResponse.suggestions}`;
      }

      // Store review results
      await ctx.runMutation(api.packages.updateAiReviewResult, {
        packageId: args.packageId,
        status,
        summary,
        criteria: aiResponse.criteria,
        error: undefined,
      });

      // Check auto-approve/reject settings
      const settings = await ctx.runQuery(api.packages.getAdminSettings);
      const autoApprove = settings.autoApproveOnPass || false;
      const autoReject = settings.autoRejectOnFail || false;

      if (status === "passed" && autoApprove) {
        await ctx.runMutation(api.packages.updateReviewStatus, {
          packageId: args.packageId,
          reviewStatus: "approved",
          reviewerEmail: "ai@convex.dev",
          reviewNotes: "Auto-approved: AI review passed all criteria",
        });
      } else if (status === "failed" && autoReject && anyCriticalFailed) {
        await ctx.runMutation(api.packages.updateReviewStatus, {
          packageId: args.packageId,
          reviewStatus: "rejected",
          reviewerEmail: "ai@convex.dev",
          reviewNotes: "Auto-rejected: AI review found critical issues",
        });
      }

      return null;
    } catch (error) {
      // Store error
      await ctx.runMutation(api.packages.updateAiReviewResult, {
        packageId: args.packageId,
        status: "error",
        summary: "AI review encountered an error",
        criteria: [],
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
});
