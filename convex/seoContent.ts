"use node";

// AI-generated SEO/AEO/GEO content for component detail pages.
// Uses configurable AI providers (Anthropic, OpenAI, Gemini) to generate structured content.
// Mutations live in seoContentDb.ts (mutations cannot be in "use node" files).

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Helper to call AI provider with unified interface
async function callAiProvider(
  provider: "anthropic" | "openai" | "gemini",
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Anthropic response");
    }
    return textBlock.text;
  }

  if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    return content;
  }

  if (provider === "gemini") {
    // Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000 },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No text content in Gemini response");
    }
    return text;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ============ SEO CONTENT GENERATION ============

// Structured output shape from Claude
interface SeoContentResponse {
  valueProp: string;
  benefits: string[];
  useCases: { query: string; answer: string }[];
  faq: { question: string; answer: string }[];
  resourceLinks: { label: string; url: string }[];
}

// Build SKILL.md content following Agent Skills spec
function buildSkillMd(pkg: any, seoContent: SeoContentResponse): string {
  const displayName = pkg.componentName || pkg.name || "component";
  const kebabName = (pkg.name || displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  const description = seoContent.valueProp || pkg.shortDescription || pkg.description || "";
  const category = pkg.category || "development";
  const tags = pkg.tags || [];
  const repoUrl = pkg.repositoryUrl || "";
  const npmUrl = pkg.npmUrl || "";
  const installCmd = pkg.installCommand || `npm install ${pkg.name}`;

  const lines: string[] = [];
  
  // YAML frontmatter
  lines.push("---");
  lines.push(`name: ${kebabName}`);
  lines.push(`description: ${description} Use when working with ${category} features, ${tags.slice(0, 3).join(", ") || displayName}.`);
  lines.push("---");
  lines.push("");
  
  // Main title
  lines.push(`# ${displayName}`);
  lines.push("");
  
  // Instructions section
  lines.push("## Instructions");
  lines.push("");
  lines.push(`${displayName} is a Convex component that provides ${description.toLowerCase()}`);
  lines.push("");
  
  // Installation
  lines.push("### Installation");
  lines.push("");
  lines.push("```bash");
  lines.push(installCmd);
  lines.push("```");
  lines.push("");
  
  // Benefits/capabilities
  if (seoContent.benefits && seoContent.benefits.length > 0) {
    lines.push("### Capabilities");
    lines.push("");
    for (const benefit of seoContent.benefits) {
      lines.push(`- ${benefit}`);
    }
    lines.push("");
  }
  
  // Use cases as examples
  if (seoContent.useCases && seoContent.useCases.length > 0) {
    lines.push("## Examples");
    lines.push("");
    for (const uc of seoContent.useCases) {
      lines.push(`### ${uc.query}`);
      lines.push("");
      lines.push(uc.answer);
      lines.push("");
    }
  }
  
  // FAQ as troubleshooting
  if (seoContent.faq && seoContent.faq.length > 0) {
    lines.push("## Troubleshooting");
    lines.push("");
    for (const faq of seoContent.faq) {
      lines.push(`**${faq.question}**`);
      lines.push("");
      lines.push(faq.answer);
      lines.push("");
    }
  }
  
  // Resources
  lines.push("## Resources");
  lines.push("");
  if (npmUrl) {
    lines.push(`- [npm package](${npmUrl})`);
  }
  if (repoUrl) {
    lines.push(`- [GitHub repository](${repoUrl})`);
  }
  if (pkg.demoUrl) {
    lines.push(`- [Live demo](${pkg.demoUrl})`);
  }
  if (pkg.slug) {
    lines.push(`- [Convex Components Directory](https://www.convex.dev/components/${pkg.slug})`);
  }
  lines.push("- [Convex documentation](https://docs.convex.dev)");
  
  return lines.join("\n");
}

// Internal action: Generate SEO content for a package using configured AI provider
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

      // Get custom prompt from database (empty string means use default)
      const customPromptTemplate = await ctx.runQuery(
        internal.aiSettings._getSeoActivePromptContent,
      );

      // Build the prompt with package data (using custom template or default)
      const prompt = buildSeoPrompt(pkg, customPromptTemplate);

      // Get custom provider settings from database
      const customProvider = await ctx.runQuery(
        internal.aiSettings._getActiveProviderSettings,
      );

      let aiResponseText: string;

      if (customProvider) {
        // Use custom provider from admin settings
        aiResponseText = await callAiProvider(
          customProvider.provider,
          customProvider.apiKey,
          customProvider.model,
          prompt,
        );
      } else {
        // Fall back to environment variables
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const openaiKey = process.env.CONVEX_OPENAI_API_KEY;

        if (anthropicKey) {
          const anthropic = new Anthropic({ apiKey: anthropicKey });
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
          });
          const textBlock = message.content.find((b) => b.type === "text");
          if (!textBlock || textBlock.type !== "text") {
            throw new Error("No text content in AI response");
          }
          aiResponseText = textBlock.text;
        } else if (openaiKey) {
          const openai = new OpenAI({ apiKey: openaiKey });
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
          });
          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No content in OpenAI response");
          }
          aiResponseText = content;
        } else {
          throw new Error(
            "No AI provider configured. Set ANTHROPIC_API_KEY or CONVEX_OPENAI_API_KEY, or configure a provider in admin settings.",
          );
        }
      }

      // Parse JSON from response (strip markdown fences if present)
      let jsonStr = aiResponseText.trim();
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

      // Build SKILL.md content from parsed SEO data
      const skillMd = buildSkillMd(pkg, parsed);

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
        skillMd,
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

// Default SEO prompt template (used when no custom prompt is set)
const DEFAULT_SEO_PROMPT_TEMPLATE = `You are writing structured content for a Convex developer component page. This content will be used for SEO (Google), AEO (answer engine optimization for AI search), and GEO (generative engine optimization for LLMs).

COMPONENT DATA:
- Display name: {{displayName}}
- npm package: {{packageName}}
- Category: {{category}}
- Tags: {{tags}}
- Short description: {{shortDesc}}
- Full description: {{longDesc}}
- Repository: {{repoUrl}}
- Install command: {{installCmd}}
- npm URL: {{npmUrl}}
- Demo URL: {{demoUrl}}

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

// Build SEO prompt by replacing placeholders with package data
function buildSeoPrompt(pkg: any, customTemplate?: string): string {
  const displayName = pkg.componentName || pkg.name || "Unknown Component";
  const category = pkg.category || "general";
  const tags = pkg.tags?.join(", ") || "";
  const shortDesc = pkg.shortDescription || pkg.description || "";
  const longDesc = pkg.longDescription || "";
  const repoUrl = pkg.repositoryUrl || "";
  const installCmd = pkg.installCommand || `npm install ${pkg.name}`;
  const npmUrl = pkg.npmUrl || "";
  const demoUrl = pkg.demoUrl || "";

  // Use custom template if provided and not empty, otherwise use default
  const template = customTemplate && customTemplate.trim() 
    ? customTemplate 
    : DEFAULT_SEO_PROMPT_TEMPLATE;

  // Replace placeholders with actual values
  return template
    .replace(/\{\{displayName\}\}/g, displayName)
    .replace(/\{\{packageName\}\}/g, pkg.name || "")
    .replace(/\{\{category\}\}/g, category)
    .replace(/\{\{tags\}\}/g, tags)
    .replace(/\{\{shortDesc\}\}/g, shortDesc)
    .replace(/\{\{longDesc\}\}/g, longDesc)
    .replace(/\{\{repoUrl\}\}/g, repoUrl)
    .replace(/\{\{installCmd\}\}/g, installCmd)
    .replace(/\{\{npmUrl\}\}/g, npmUrl)
    .replace(/\{\{demoUrl\}\}/g, demoUrl);
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
