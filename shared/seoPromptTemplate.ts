export const SEO_PROMPT_PLACEHOLDERS = [
  "{{displayName}}",
  "{{packageName}}",
  "{{category}}",
  "{{tags}}",
  "{{shortDesc}}",
  "{{longDesc}}",
  "{{repoUrl}}",
  "{{installCmd}}",
  "{{npmUrl}}",
  "{{demoUrl}}",
  "{{githubReadme}}",
  "{{convexDocsContext}}",
] as const;

export const DEFAULT_SEO_PROMPT_TEMPLATE = `You are writing structured content for a Convex developer component page. This content will be used for SEO (Google), AEO (answer engine optimization for AI search), and GEO (generative engine optimization for LLMs).

SOURCE PRIORITY:
1. GitHub README and package docs excerpt
2. Component metadata provided below
3. Convex docs context for canonical terminology

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

GITHUB README AND PACKAGE DOCS EXCERPT:
{{githubReadme}}

CONVEX DOCS CONTEXT:
{{convexDocsContext}}

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
- resourceLinks: include npm, GitHub repo, and relevant Convex docs links where available
- Use the GitHub README as the primary source of truth when available
- Use the short description and full description as secondary context
- If the README conflicts with metadata, prefer the README for capabilities, setup, API names, and examples
- Cross-check Convex terminology against the Convex docs context before writing
- Never claim a feature unless it appears in the README or the provided component data
- Write for senior developers, especially full stack developers
- No marketing language
- No hype
- Be specific and technical
- No em dashes
- No emojis
- Output valid JSON only`;

// New component directory content prompt template (v2 content model)
export const CONTENT_PROMPT_PLACEHOLDERS = [
  "{{displayName}}",
  "{{packageName}}",
  "{{category}}",
  "{{tags}}",
  "{{shortDesc}}",
  "{{repoUrl}}",
  "{{installCmd}}",
  "{{npmUrl}}",
  "{{demoUrl}}",
  "{{githubReadme}}",
  "{{convexDocsContext}}",
] as const;

export const DEFAULT_CONTENT_PROMPT_TEMPLATE = `You are writing component directory content for a Convex developer component page. This content helps developers understand what the component does, when to use it, and how it works.

SOURCE PRIORITY:
1. GitHub README (primary source of truth for capabilities, API surface, and setup)
2. Component metadata provided below
3. Convex docs context for canonical terminology

COMPONENT DATA:
- Display name: {{displayName}}
- npm package: {{packageName}}
- Category: {{category}}
- Tags: {{tags}}
- Short description: {{shortDesc}}
- Repository: {{repoUrl}}
- Install command: {{installCmd}}
- npm URL: {{npmUrl}}
- Demo URL: {{demoUrl}}

GITHUB README AND PACKAGE DOCS EXCERPT:
{{githubReadme}}

CONVEX DOCS CONTEXT:
{{convexDocsContext}}

Generate the following as valid JSON (no markdown fences, just raw JSON):

{
  "description": "A 2-4 sentence technical description of this component. Explain what it does, what problem it solves, and what the developer gets. Use specifics from the README when available. Do not repeat the short description verbatim.",

  "useCases": "A markdown section (no heading) with 3-5 bullet points. Each bullet describes a concrete scenario where a developer would reach for this component. Be specific about the technical problem being solved. Use real developer language.",

  "howItWorks": "A markdown section (no heading) with 2-4 short paragraphs explaining the technical approach. Cover the key APIs, architecture decisions, and integration pattern. Reference actual function names, config options, or setup steps from the README when available. Keep it factual."
}

Rules:
- description: 2-4 sentences, technical, specific. Under 500 characters.
- useCases: 3-5 markdown bullet points starting with a use case verb or scenario
- howItWorks: 2-4 paragraphs, reference actual APIs and patterns from the README
- Never claim a feature unless it appears in the README or the provided component data
- Cross-check Convex terminology against the Convex docs context before writing
- Write for senior developers, especially full stack developers
- No marketing language
- No hype
- Be specific and technical
- No em dashes
- No emojis
- Output valid JSON only`;
