"use node";

// AI-generated SEO/AEO/GEO content for component detail pages.
// Uses Anthropic Claude to generate structured content from submitted component data.
// Mutations live in seoContentDb.ts (mutations cannot be in "use node" files).

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// ============ SEO CONTENT GENERATION ============

// Structured output shape from Claude
interface SeoContentResponse {
  valueProp: string;
  benefits: string[];
  useCases: { query: string; answer: string }[];
  faq: { question: string; answer: string }[];
  resourceLinks: { label: string; url: string }[];
}

// Internal action: Generate SEO content for a package using Claude
export const generateSeoContent = internalAction({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Set status to generating
    await ctx.runMutation(internal.seoContentDb._updateSeoStatus, {
      packageId: args.packageId,
      status: "generating",
    });

    try {
      // Fetch full package data
      const pkg = await ctx.runQuery(internal.packages._getPackage, {
        packageId: args.packageId,
      });

      if (!pkg) {
        throw new Error("Package not found");
      }

      const anthropic = new Anthropic();

      // Build the prompt with all available component data
      const prompt = buildSeoPrompt(pkg);

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Extract text content from response
      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in AI response");
      }

      // Parse JSON from response (strip markdown fences if present)
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }

      const parsed: SeoContentResponse = JSON.parse(jsonStr);

      // Validate required fields
      if (
        !parsed.valueProp ||
        !Array.isArray(parsed.benefits) ||
        !Array.isArray(parsed.useCases) ||
        !Array.isArray(parsed.faq)
      ) {
        throw new Error("AI response missing required fields");
      }

      // Build resource links from package data + any AI suggested links
      const resourceLinks = buildResourceLinks(pkg, parsed.resourceLinks);

      // Save generated content to the database
      await ctx.runMutation(internal.seoContentDb._saveSeoContent, {
        packageId: args.packageId,
        valueProp: parsed.valueProp.slice(0, 160),
        benefits: parsed.benefits.slice(0, 4),
        useCases: parsed.useCases.slice(0, 4).map((uc) => ({
          query: uc.query,
          answer: uc.answer,
        })),
        faq: parsed.faq.slice(0, 5).map((f) => ({
          question: f.question,
          answer: f.answer,
        })),
        resourceLinks,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("SEO content generation failed:", errorMessage);

      // Save error state
      await ctx.runMutation(internal.seoContentDb._setSeoError, {
        packageId: args.packageId,
        error: errorMessage,
      });
    }

    return null;
  },
});

// Public action: Admin triggers SEO content generation (or regeneration)
export const regenerateSeoContent = action({
  args: { packageId: v.id("packages") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Schedule the generation to run immediately
    await ctx.scheduler.runAfter(0, internal.seoContent.generateSeoContent, {
      packageId: args.packageId,
    });
    return null;
  },
});

// ============ PROMPT BUILDER ============

function buildSeoPrompt(pkg: any): string {
  const displayName = pkg.componentName || pkg.name || "Unknown Component";
  const category = pkg.category || "general";
  const tags = pkg.tags?.join(", ") || "";
  const shortDesc = pkg.shortDescription || pkg.description || "";
  const longDesc = pkg.longDescription || "";
  const repoUrl = pkg.repositoryUrl || "";
  const installCmd = pkg.installCommand || `npm install ${pkg.name}`;
  const npmUrl = pkg.npmUrl || "";
  const demoUrl = pkg.demoUrl || "";

  return `You are writing structured content for a Convex developer component page. This content will be used for SEO (Google), AEO (answer engine optimization for AI search), and GEO (generative engine optimization for LLMs).

COMPONENT DATA:
- Display name: ${displayName}
- npm package: ${pkg.name}
- Category: ${category}
- Tags: ${tags}
- Short description: ${shortDesc}
- Full description: ${longDesc}
- Repository: ${repoUrl}
- Install command: ${installCmd}
- npm URL: ${npmUrl}
- Demo URL: ${demoUrl}

Generate the following as valid JSON (no markdown fences, just raw JSON):

{
  "valueProp": "A single sentence under 155 characters that explains what this component does and why a developer would use it. This becomes the meta description and the sentence AI search engines cite. Be specific and technical, not generic.",

  "benefits": ["Array of 3-4 strings. Each is an outcome-focused benefit starting with a verb. Focus on what developers get: faster development, fewer bugs, specific capabilities. No filler words."],

  "useCases": [{"query": "A real search phrase a developer would type, like 'how to add retry logic to Convex mutations'", "answer": "2-3 sentences explaining how this component solves the problem. Be specific about the API and what it enables."}],

  "faq": [{"question": "A question developers actually ask about this type of component", "answer": "A self-contained answer that makes sense without any other context. 2-4 sentences. Include the component name so AI engines can cite it directly."}],

  "resourceLinks": [{"label": "Display text", "url": "Full URL"}]
}

Rules:
- valueProp must be under 155 characters
- benefits: exactly 3-4 items
- useCases: 2-4 items, queries should match real search intent
- faq: 3-5 items, answers must be self-contained (no "as mentioned above")
- resourceLinks: include npm, GitHub repo, and Convex docs links where available
- Write for senior developers who dislike hype
- Be specific and technical
- No em dashes
- No emojis
- Output valid JSON only`;
}

// Build consistent resource links from package data
function buildResourceLinks(
  pkg: any,
  aiLinks: { label: string; url: string }[] = [],
): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];

  // Always include npm
  if (pkg.npmUrl) {
    links.push({ label: "npm package", url: pkg.npmUrl });
  }

  // GitHub repo
  if (pkg.repositoryUrl) {
    links.push({ label: "GitHub repository", url: pkg.repositoryUrl });
  }

  // Demo URL
  if (pkg.demoUrl) {
    links.push({ label: "Live demo", url: pkg.demoUrl });
  }

  // Component directory page
  if (pkg.slug) {
    links.push({
      label: "Convex Components Directory",
      url: `https://www.convex.dev/components/${pkg.slug}`,
    });
  }

  // Always include Convex docs
  links.push({
    label: "Convex documentation",
    url: "https://docs.convex.dev",
  });

  // Add any unique AI-suggested links not already present
  const existingUrls = new Set(links.map((l) => l.url));
  for (const aiLink of aiLinks) {
    if (aiLink.url && !existingUrls.has(aiLink.url)) {
      links.push(aiLink);
      existingUrls.add(aiLink.url);
    }
  }

  return links;
}
