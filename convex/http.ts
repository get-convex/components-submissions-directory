import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { buildComponentUrls } from "../shared/componentUrls";
import { resolveApiCaller, rateLimitHeaders, type ApiCallerResult } from "./apiKeys";

const http = httpRouter();
const DIRECTORY_ORIGIN = "https://www.convex.dev";
const MCP_DIRECT_ORIGIN = "https://giant-grouse-674.convex.site";

http.route({
  path: "/api/export-csv",
  method: "GET",
  handler: httpAction(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packages = await ctx.runQuery(api.packages.getAllPackages as any);

    const headers = [
      "name",
      "description",
      "version",
      "license",
      "weeklyDownloads",
      "unpackedSize",
      "totalFiles",
      "lastPublish",
      "repositoryUrl",
      "homepageUrl",
      "npmUrl",
      "submittedAt"
    ];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(",")];
    
    for (const pkg of packages) {
      const row = [
        escapeCSV(pkg.name),
        escapeCSV(pkg.description),
        escapeCSV(pkg.version),
        escapeCSV(pkg.license),
        escapeCSV(pkg.weeklyDownloads),
        escapeCSV(pkg.unpackedSize),
        escapeCSV(pkg.totalFiles),
        escapeCSV(pkg.lastPublish),
        escapeCSV(pkg.repositoryUrl || ""),
        escapeCSV(pkg.homepageUrl || ""),
        escapeCSV(pkg.npmUrl),
        escapeCSV(new Date(pkg.submittedAt).toISOString())
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=npm-directory-export.csv"
      }
    });
  })
});

// ============ LLMs.txt ENDPOINT ============
http.route({
  path: "/api/llms.txt",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const packages = await ctx.runQuery(
      internal.packages._listApprovedPackages,
    );

    const lines: string[] = [];
    lines.push("# Convex Components Directory");
    lines.push(
      "# A curated index of open-source components for the Convex backend platform.",
    );
    lines.push(
      `# ${packages.length} components | Updated ${new Date().toISOString().slice(0, 10)}`,
    );
    lines.push("");

    const sorted = [...packages].sort((a: any, b: any) =>
      (a.name || "").localeCompare(b.name || ""),
    );

    for (const pkg of sorted) {
      const name = pkg.componentName || pkg.name || "Unknown";
      const slug = pkg.slug || "";
      const desc = (pkg.contentModelVersion === 2 && pkg.generatedDescription)
        ? pkg.generatedDescription.slice(0, 200)
        : (pkg.seoValueProp || pkg.shortDescription || pkg.description || "");
      const category = pkg.category || "general";
      const url = slug
        ? `https://www.convex.dev/components/${slug}`
        : pkg.npmUrl;
      const mdUrl = slug
        ? `https://www.convex.dev/api/markdown?slug=${slug}`
        : "";

      lines.push(`## ${name}`);
      lines.push(`- URL: ${url}`);
      if (mdUrl) lines.push(`- Markdown: ${mdUrl}`);
      lines.push(`- npm: ${pkg.npmUrl || ""}`);
      lines.push(`- Category: ${category}`);
      lines.push(`- Description: ${desc}`);
      lines.push("");
    }

    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// ============ MARKDOWN ENDPOINT ============
http.route({
  path: "/api/markdown",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      return new Response("# Not Found\n\nNo slug provided.", {
        status: 404,
        headers: markdownHeaders(),
      });
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      return new Response(`# Not Found\n\nComponent "${slug}" not found.`, {
        status: 404,
        headers: markdownHeaders(),
      });
    }

    const md = buildComponentMarkdown(pkg);

    return new Response(md, {
      status: 200,
      headers: markdownHeaders(),
    });
  }),
});

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI",
  auth: "Auth",
  backend: "Backend",
  database: "Database",
  "durable-functions": "Durable Functions",
  integrations: "Integrations",
  payments: "Payments",
};

function buildComponentMarkdown(pkg: any): string {
  const lines: string[] = [];
  lines.push(`# ${pkg.name}\n`);
  if (pkg.shortDescription) lines.push(`${pkg.shortDescription}\n`);
  else if (pkg.description) lines.push(`${pkg.description}\n`);

  lines.push(`## Install\n`);
  lines.push("```bash");
  lines.push(pkg.installCommand || `npm install ${pkg.name}`);
  lines.push("```\n");

  lines.push(`## Links\n`);
  lines.push(`- [npm package](${pkg.npmUrl})`);
  if (pkg.repositoryUrl)
    lines.push(`- [GitHub repository](${pkg.repositoryUrl})`);
  if (pkg.slug)
    lines.push(
      `- [Convex Components Directory](https://www.convex.dev/components/${pkg.slug})`,
    );
  if (pkg.demoUrl) lines.push(`- [Live demo](${pkg.demoUrl})`);
  lines.push("");

  if (pkg.authorUsername) lines.push(`**Author:** ${pkg.authorUsername}\n`);
  const catLabel = pkg.category
    ? CATEGORY_LABELS[pkg.category] || pkg.category
    : null;
  if (catLabel) lines.push(`**Category:** ${catLabel}\n`);
  lines.push(`**Version:** ${pkg.version || "0.0.0"}  `);
  lines.push(
    `**Weekly downloads:** ${(pkg.weeklyDownloads || 0).toLocaleString()}\n`,
  );

  if (pkg.tags && pkg.tags.length > 0) {
    lines.push(`**Tags:** ${pkg.tags.join(", ")}\n`);
  }

  // Prefer v2 content model
  if (pkg.contentModelVersion === 2 && pkg.generatedDescription) {
    lines.push(`---\n`);
    lines.push(`## Description\n`);
    lines.push(`${pkg.generatedDescription}\n`);

    if (pkg.generatedUseCases) {
      lines.push(`## Use cases\n`);
      lines.push(`${pkg.generatedUseCases}\n`);
    }

    if (pkg.generatedHowItWorks) {
      lines.push(`## How it works\n`);
      lines.push(`${pkg.generatedHowItWorks}\n`);
    }

    if (pkg.readmeIncludedMarkdown) {
      lines.push(`---\n`);
      lines.push(pkg.readmeIncludedMarkdown);
    }
  } else {
    // Fallback: old SEO model
    if (pkg.seoValueProp) {
      lines.push(`---\n`);
      lines.push(`> ${pkg.seoValueProp}\n`);
    }

    if (pkg.seoBenefits && pkg.seoBenefits.length > 0) {
      lines.push(`## Benefits\n`);
      for (const benefit of pkg.seoBenefits) {
        lines.push(`- ${benefit}`);
      }
      lines.push("");
    }

    if (pkg.seoUseCases && pkg.seoUseCases.length > 0) {
      lines.push(`## Use cases\n`);
      for (const uc of pkg.seoUseCases) {
        lines.push(`### ${uc.query}\n`);
        lines.push(`${uc.answer}\n`);
      }
    }

    if (pkg.seoFaq && pkg.seoFaq.length > 0) {
      lines.push(`## FAQ\n`);
      for (const faq of pkg.seoFaq) {
        lines.push(`**Q: ${faq.question}**\n`);
        lines.push(`${faq.answer}\n`);
      }
    }

    if (pkg.longDescription) {
      lines.push(`---\n`);
      lines.push(pkg.longDescription);
    }

  }

  if (pkg.slug) {
    lines.push(`\n---\n`);
    lines.push(
      `[![Convex Component](https://www.convex.dev/components/badge/${pkg.slug})](https://www.convex.dev/components/${pkg.slug})`,
    );
  }

  return lines.join("\n");
}

function markdownHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
  };
}

// ============ MARKDOWN INDEX ENDPOINT ============
// Returns markdown listing all approved components (for /components.md)
http.route({
  path: "/api/markdown-index",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const packages = await ctx.runQuery(
      internal.packages._listApprovedPackages,
    );

    const lines: string[] = [];
    lines.push("# Convex Components Directory\n");
    lines.push("A curated index of open-source components for the Convex backend platform.\n");
    lines.push(`**${packages.length} components** | Updated ${new Date().toISOString().slice(0, 10)}\n`);

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const pkg of packages) {
      const cat = pkg.category || "general";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(pkg);
    }

    // Sort categories alphabetically
    const sortedCategories = Object.keys(byCategory).sort();

    for (const category of sortedCategories) {
      const catLabel = CATEGORY_LABELS[category] || category;
      lines.push(`## ${catLabel}\n`);

      // Sort packages within category by name
      const sortedPkgs = byCategory[category].sort((a: any, b: any) =>
        (a.name || "").localeCompare(b.name || ""),
      );

      for (const pkg of sortedPkgs) {
        const name = pkg.componentName || pkg.name || "Unknown";
        const desc = pkg.shortDescription || pkg.description || "";
        const slug = pkg.slug || "";
        const componentLinks = slug
          ? buildComponentUrls(slug, DIRECTORY_ORIGIN)
          : null;
        const detailUrl = slug
          ? componentLinks?.detailUrl || pkg.npmUrl
          : pkg.npmUrl;
        const mdUrl = slug
          ? componentLinks?.markdownUrl || ""
          : "";

        lines.push(`### [${name}](${detailUrl})\n`);
        if (desc) lines.push(`${desc}\n`);
        lines.push(`- Install: \`${pkg.installCommand || `npm install ${pkg.name}`}\``);
        lines.push(`- [npm](${pkg.npmUrl})`);
        if (pkg.repositoryUrl) lines.push(` | [GitHub](${pkg.repositoryUrl})`);
        if (mdUrl) lines.push(` | [Markdown](${mdUrl})`);
        lines.push("\n");
      }
    }

    lines.push("---\n");
    lines.push("[View full directory](https://www.convex.dev/components)\n");

    return new Response(lines.join("\n"), {
      status: 200,
      headers: markdownHeaders(),
    });
  }),
});

// ============ COMPONENT LLMs.txt ENDPOINT ============
// Returns llms.txt format for a single component (for /components/<slug>/llms.txt)
http.route({
  path: "/api/component-llms",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      return new Response("# Not Found\n\nNo slug provided.", {
        status: 404,
        headers: llmsTxtHeaders(),
      });
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      return new Response(`# Not Found\n\nComponent "${slug}" not found.`, {
        status: 404,
        headers: llmsTxtHeaders(),
      });
    }

    const lines: string[] = [];
    const name = pkg.componentName || pkg.name || "Unknown";
    const desc = pkg.seoValueProp || pkg.shortDescription || pkg.description || "";
    const catLabel = pkg.category ? CATEGORY_LABELS[pkg.category] || pkg.category : "general";

    lines.push(`# ${name}`);
    lines.push(`# ${desc}`);
    lines.push(`# Category: ${catLabel}`);
    lines.push("");

    lines.push("## Install");
    lines.push(`- Command: ${pkg.installCommand || `npm install ${pkg.name}`}`);
    lines.push("");

    lines.push("## Links");
    const componentLinks = buildComponentUrls(slug, DIRECTORY_ORIGIN);
    lines.push(`- Directory: ${componentLinks.detailUrl}`);
    lines.push(`- Markdown: ${componentLinks.markdownUrl}`);
    lines.push(`- llms.txt: ${componentLinks.llmsUrl}`);
    lines.push(`- npm: ${pkg.npmUrl || ""}`);
    if (pkg.repositoryUrl) lines.push(`- GitHub: ${pkg.repositoryUrl}`);
    if (pkg.demoUrl) lines.push(`- Demo: ${pkg.demoUrl}`);
    lines.push("");

    lines.push("## Details");
    lines.push(`- Version: ${pkg.version || "0.0.0"}`);
    lines.push(`- Weekly downloads: ${(pkg.weeklyDownloads || 0).toLocaleString()}`);
    if (pkg.authorUsername) lines.push(`- Author: ${pkg.authorUsername}`);
    if (pkg.tags && pkg.tags.length > 0) lines.push(`- Tags: ${pkg.tags.join(", ")}`);
    lines.push("");

    // Prefer v2 content model for llms output
    if (pkg.contentModelVersion === 2 && pkg.generatedDescription) {
      lines.push("## Description");
      lines.push(pkg.generatedDescription);
      lines.push("");

      if (pkg.generatedUseCases) {
        lines.push("## Use Cases");
        lines.push(pkg.generatedUseCases);
        lines.push("");
      }

      if (pkg.generatedHowItWorks) {
        lines.push("## How It Works");
        lines.push(pkg.generatedHowItWorks);
        lines.push("");
      }
    } else {
      // Fallback: old SEO model
      if (pkg.seoBenefits && pkg.seoBenefits.length > 0) {
        lines.push("## Benefits");
        for (const benefit of pkg.seoBenefits) {
          lines.push(`- ${benefit}`);
        }
        lines.push("");
      }

      if (pkg.seoUseCases && pkg.seoUseCases.length > 0) {
        lines.push("## Use Cases");
        for (const uc of pkg.seoUseCases) {
          lines.push(`- Q: ${uc.query}`);
          lines.push(`  A: ${uc.answer}`);
        }
        lines.push("");
      }

      if (pkg.seoFaq && pkg.seoFaq.length > 0) {
        lines.push("## FAQ");
        for (const faq of pkg.seoFaq) {
          lines.push(`- Q: ${faq.question}`);
          lines.push(`  A: ${faq.answer}`);
        }
        lines.push("");
      }

    }

    return new Response(lines.join("\n"), {
      status: 200,
      headers: llmsTxtHeaders(),
    });
  }),
});

function llmsTxtHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
  };
}

// ============ BADGE SERVICE ============
http.route({
  path: "/api/badge",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      return new Response(generateBadgeSvg("unknown", "Not Found", "#6b6b6b"), {
        status: 200,
        headers: svgHeaders(),
      });
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    let statusLabel = "Not Found";
    let statusColor = "#6b6b6b";

    if (pkg) {
      if (pkg.reviewStatus === "approved") {
        statusLabel = "Approved";
        statusColor = "#228909";
      } else if (pkg.reviewStatus === "in_review") {
        statusLabel = "In Review";
        statusColor = "#2563eb";
      } else if (pkg.reviewStatus === "changes_requested") {
        statusLabel = "Changes Requested";
        statusColor = "#ea580c";
      } else if (pkg.reviewStatus === "rejected") {
        statusLabel = "Rejected";
        statusColor = "#dc2626";
      } else {
        statusLabel = "Pending";
        statusColor = "#ca8a04";
      }
    }

    const displayName = pkg?.name || slug;

    await ctx.runMutation(internal.packages._recordBadgeFetch, {
      slug,
      packageId: pkg?._id,
      referrer: request.headers.get("referer") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return new Response(generateBadgeSvg(displayName, statusLabel, statusColor), {
      status: 200,
      headers: svgHeaders(),
    });
  }),
});

function generateBadgeSvg(
  name: string,
  status: string,
  statusColor: string,
): string {
  const leftText = "Convex";
  const rightText = `${status}: ${name}`;
  const leftWidth = leftText.length * 7 + 14;
  const rightWidth = rightText.length * 6.2 + 14;
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${statusColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${leftWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftWidth / 2}" y="14">${leftText}</text>
    <text aria-hidden="true" x="${leftWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(rightText)}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14">${escapeXml(rightText)}</text>
  </g>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgHeaders(): Record<string, string> {
  return {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
  };
}

// ============ MCP API ENDPOINTS ============
// Read-only MCP tools for agent and CLI consumption

function mcpJsonHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
  };
}

function buildMcpProfile(pkg: any): any {
  const slug = pkg.slug || "";
  const componentLinks = slug
    ? buildComponentUrls(slug, DIRECTORY_ORIGIN)
    : null;

  return {
    slug,
    displayName: pkg.componentName || pkg.name,
    packageName: pkg.name,
    description: pkg.longDescription || pkg.description || "",
    shortDescription: pkg.shortDescription,
    category: pkg.category,
    tags: pkg.tags || [],
    install: {
      command: pkg.installCommand || `npm install ${pkg.name}`,
      packageManager: detectPackageManager(pkg.installCommand || ""),
    },
    docs: {
      markdownUrl: componentLinks?.markdownUrl || "",
      llmsUrl: componentLinks?.llmsUrl || "",
      detailUrl: componentLinks?.detailUrl || "",
    },
    links: {
      npm: pkg.npmUrl,
      repository: pkg.repositoryUrl,
      demo: pkg.demoUrl,
      video: pkg.videoUrl,
    },
    metadata: {
      version: pkg.version || "0.0.0",
      weeklyDownloads: pkg.weeklyDownloads || 0,
      lastPublish: pkg.lastPublish,
      authorUsername: pkg.authorUsername,
    },
    trustSignals: {
      convexVerified: pkg.convexVerified || false,
      hasSkillMd: Boolean(pkg.skillMd),
      hasSeoContent: pkg.seoGenerationStatus === "completed",
      lastUpdated: pkg.lastPublish
        ? new Date(pkg.lastPublish).getTime()
        : undefined,
    },
  };
}

function detectPackageManager(command: string): "npm" | "yarn" | "pnpm" | "bun" {
  if (command.startsWith("yarn ")) return "yarn";
  if (command.startsWith("pnpm ")) return "pnpm";
  if (command.startsWith("bun ")) return "bun";
  return "npm";
}

// ============ REST API ENDPOINTS ============
// Authenticated JSON API for agents, CLI tools, and developers
// Uses API keys from the apiKeys table, with anonymous fallback at lower rate limits

function apiJsonHeaders(
  rl?: ApiCallerResult["rateLimit"],
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization",
    ...(rl ? rateLimitHeaders(rl) : {}),
  };
}

function apiOptionsHandler() {
  return httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: apiJsonHeaders(),
    });
  });
}

// Shared helper: check global toggle, auth, rate limit. Returns 503 if API is off.
async function enforceRateLimit(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
): Promise<
  | { caller: ApiCallerResult; response?: undefined }
  | { caller: ApiCallerResult; response: Response }
> {
  // Check global API toggle
  const apiEnabled = await ctx.runQuery(internal.apiKeys._isApiEnabled);
  if (!apiEnabled) {
    const caller = await resolveApiCaller(ctx, request);
    return {
      caller,
      response: new Response(
        JSON.stringify({
          error: "The Components API is currently unavailable.",
        }),
        { status: 503, headers: apiJsonHeaders() },
      ),
    };
  }

  const caller = await resolveApiCaller(ctx, request);

  if (!caller.rateLimit.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((caller.rateLimit.resetAt - Date.now()) / 1000),
    );
    return {
      caller,
      response: new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          retryAfterSeconds: retryAfter,
          remaining: 0,
        }),
        {
          status: 429,
          headers: {
            ...apiJsonHeaders(caller.rateLimit),
            "Retry-After": String(retryAfter),
          },
        },
      ),
    };
  }

  return { caller };
}

function logApiRequest(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  caller: ApiCallerResult,
  endpoint: string,
  status: number,
  startTime: number,
  slug?: string,
  searchQuery?: string,
) {
  ctx.runMutation(internal.packages._recordMcpApiRequest, {
    endpoint,
    slug,
    query: searchQuery,
    userAgent: request.headers.get("user-agent") || undefined,
    referer: request.headers.get("referer") || undefined,
    responseStatus: status,
    responseTimeMs: Date.now() - startTime,
    apiKeyId: caller.apiKeyId,
    hashedIp: caller.hashedIp,
  });
}

// REST API: Search components
http.route({
  path: "/api/components/search",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const result = await enforceRateLimit(ctx, request);
    if (result.response) return result.response;
    const { caller } = result;

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20", 10),
      50,
    );
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const packages = await ctx.runQuery(
      internal.packages._listApprovedPackages,
    );

    let filtered = packages;
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((pkg: any) => {
        const name = (pkg.name || "").toLowerCase();
        const componentName = (pkg.componentName || "").toLowerCase();
        const desc = (
          pkg.shortDescription ||
          pkg.description ||
          ""
        ).toLowerCase();
        const tags = (pkg.tags || []).join(" ").toLowerCase();
        return (
          name.includes(q) ||
          componentName.includes(q) ||
          desc.includes(q) ||
          tags.includes(q)
        );
      });
    }

    if (category) {
      filtered = filtered.filter((pkg: any) => pkg.category === category);
    }

    filtered.sort(
      (a: any, b: any) =>
        (b.weeklyDownloads || 0) - (a.weeklyDownloads || 0),
    );

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const results = paginated.map((pkg: any) => ({
      slug: pkg.slug || "",
      displayName: pkg.componentName || pkg.name,
      packageName: pkg.name,
      shortDescription: pkg.shortDescription,
      category: pkg.category,
      weeklyDownloads: pkg.weeklyDownloads || 0,
      convexVerified: pkg.convexVerified || false,
    }));

    logApiRequest(ctx, request, caller, "search", 200, startTime, undefined, query || undefined);

    return new Response(
      JSON.stringify({
        results,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      }),
      { status: 200, headers: apiJsonHeaders(caller.rateLimit) },
    );
  }),
});

http.route({
  path: "/api/components/search",
  method: "OPTIONS",
  handler: apiOptionsHandler(),
});

// REST API: Get single component profile
http.route({
  path: "/api/components/detail",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const result = await enforceRateLimit(ctx, request);
    if (result.response) return result.response;
    const { caller } = result;

    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      logApiRequest(ctx, request, caller, "detail", 400, startTime);
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: apiJsonHeaders(caller.rateLimit) },
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      logApiRequest(ctx, request, caller, "detail", 404, startTime, slug);
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: apiJsonHeaders(caller.rateLimit) },
      );
    }

    logApiRequest(ctx, request, caller, "detail", 200, startTime, slug);

    return new Response(
      JSON.stringify({ component: buildMcpProfile(pkg) }),
      { status: 200, headers: apiJsonHeaders(caller.rateLimit) },
    );
  }),
});

http.route({
  path: "/api/components/detail",
  method: "OPTIONS",
  handler: apiOptionsHandler(),
});

// REST API: Get install command
http.route({
  path: "/api/components/install",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const result = await enforceRateLimit(ctx, request);
    if (result.response) return result.response;
    const { caller } = result;

    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      logApiRequest(ctx, request, caller, "install", 400, startTime);
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: apiJsonHeaders(caller.rateLimit) },
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      logApiRequest(ctx, request, caller, "install", 404, startTime, slug);
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: apiJsonHeaders(caller.rateLimit) },
      );
    }

    const command = pkg.installCommand || `npm install ${pkg.name}`;

    logApiRequest(ctx, request, caller, "install", 200, startTime, slug);

    return new Response(
      JSON.stringify({
        slug,
        packageName: pkg.name,
        installCommand: command,
        packageManager: detectPackageManager(command),
      }),
      { status: 200, headers: apiJsonHeaders(caller.rateLimit) },
    );
  }),
});

http.route({
  path: "/api/components/install",
  method: "OPTIONS",
  handler: apiOptionsHandler(),
});

// REST API: Get component docs URLs
http.route({
  path: "/api/components/docs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const result = await enforceRateLimit(ctx, request);
    if (result.response) return result.response;
    const { caller } = result;

    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      logApiRequest(ctx, request, caller, "docs", 400, startTime);
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: apiJsonHeaders(caller.rateLimit) },
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      logApiRequest(ctx, request, caller, "docs", 404, startTime, slug);
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: apiJsonHeaders(caller.rateLimit) },
      );
    }

    const componentLinks = buildComponentUrls(slug, DIRECTORY_ORIGIN);

    logApiRequest(ctx, request, caller, "docs", 200, startTime, slug);

    return new Response(
      JSON.stringify({
        slug,
        displayName: pkg.componentName || pkg.name,
        docs: {
          markdownUrl: componentLinks.markdownUrl,
          llmsUrl: componentLinks.llmsUrl,
          detailUrl: componentLinks.detailUrl,
        },
        links: {
          npm: pkg.npmUrl,
          repository: pkg.repositoryUrl,
          demo: pkg.demoUrl,
        },
      }),
      { status: 200, headers: apiJsonHeaders(caller.rateLimit) },
    );
  }),
});

http.route({
  path: "/api/components/docs",
  method: "OPTIONS",
  handler: apiOptionsHandler(),
});

// REST API: List categories
http.route({
  path: "/api/components/categories",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const result = await enforceRateLimit(ctx, request);
    if (result.response) return result.response;
    const { caller } = result;

    const packages = await ctx.runQuery(
      internal.packages._listApprovedPackages,
    );
    const categoryCounts: Record<string, number> = {};
    for (const pkg of packages) {
      const cat = (pkg as any).category || "general";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const categories = Object.entries(CATEGORY_LABELS).map(
      ([slug, label]) => ({
        slug,
        label,
        componentCount: categoryCounts[slug] || 0,
      }),
    );

    logApiRequest(ctx, request, caller, "categories", 200, startTime);

    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: apiJsonHeaders(caller.rateLimit),
    });
  }),
});

http.route({
  path: "/api/components/categories",
  method: "OPTIONS",
  handler: apiOptionsHandler(),
});

// REST API: Server info and endpoint directory
http.route({
  path: "/api/components/info",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const result = await enforceRateLimit(ctx, request);
    if (result.response) return result.response;
    const { caller } = result;

    logApiRequest(ctx, request, caller, "info", 200, startTime);

    return new Response(
      JSON.stringify({
        name: "convex-components-api",
        version: "1.0.0",
        description:
          "REST API for the Convex Components Directory. Search, browse, and get install commands for approved Convex components.",
        baseUrl: DIRECTORY_ORIGIN,
        endpoints: {
          search: `${DIRECTORY_ORIGIN}/api/components/search`,
          detail: `${DIRECTORY_ORIGIN}/api/components/detail`,
          install: `${DIRECTORY_ORIGIN}/api/components/install`,
          docs: `${DIRECTORY_ORIGIN}/api/components/docs`,
          categories: `${DIRECTORY_ORIGIN}/api/components/categories`,
          info: `${DIRECTORY_ORIGIN}/api/components/info`,
        },
        contentEndpoints: {
          llmsTxt: `${DIRECTORY_ORIGIN}/components/llms.txt`,
          markdownIndex: `${DIRECTORY_ORIGIN}/components.md`,
        },
        authentication: {
          type: "bearer",
          header: "Authorization: Bearer YOUR_API_KEY",
          description:
            "Generate an API key from your profile page at /components/profile. Anonymous access is allowed at lower rate limits.",
        },
        rateLimits: {
          authenticated: "100 requests/minute",
          anonymous: "10 requests/minute",
        },
      }),
      { status: 200, headers: apiJsonHeaders(caller.rateLimit) },
    );
  }),
});

http.route({
  path: "/api/components/info",
  method: "OPTIONS",
  handler: apiOptionsHandler(),
});

// ============ PUBLIC PREFLIGHT CHECK ENDPOINT ============
// Allows developers to test their repo against component review criteria before submission
// Rate limited by hashed IP, results cached for 30 minutes

function preflightJsonHeaders(request?: Request): Record<string, string> {
  // Get the origin from the request, or default to allow all
  const origin = request?.headers.get("Origin") || "*";
  
  // For localhost development or production, allow the specific origin
  const allowedOrigin = origin.includes("localhost") || origin.includes("convex.dev") || origin.includes("netlify.app")
    ? origin
    : "*";

  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Helper to extract IP from request headers (Convex/Cloudflare headers)
function getClientIp(request: Request): string {
  // Try Cloudflare headers first
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Try X-Forwarded-For (take first IP if comma-separated)
  const xffHeader = request.headers.get("x-forwarded-for");
  if (xffHeader) {
    const firstIp = xffHeader.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Try X-Real-IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback: use a hash of user-agent + timestamp (not ideal but allows testing)
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `ua-fallback-${userAgent.slice(0, 50)}`;
}

http.route({
  path: "/api/preflight",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const corsHeaders = preflightJsonHeaders(request);
    try {
      // Require authentication
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return new Response(
          JSON.stringify({ error: "Authentication required. Please sign in to use the preflight checker." }),
          { status: 401, headers: corsHeaders }
        );
      }

      const body = (await request.json()) as { repoUrl?: string; npmUrl?: string };

      if (!body.repoUrl) {
        return new Response(
          JSON.stringify({ error: "Missing repoUrl parameter" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate URL format
      const urlPattern = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/;
      if (!urlPattern.test(body.repoUrl)) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid GitHub repository URL. Expected format: https://github.com/owner/repo",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Hash the client IP for rate limiting
      const clientIp = getClientIp(request);
      const { hashIp, normalizeRepoUrl } = await import("./preflight");
      const hashedIp = await hashIp(clientIp);
      const normalizedUrl = normalizeRepoUrl(body.repoUrl!);

      // Check rate limit
      const rateLimitCheck = await ctx.runQuery(internal.preflight._checkRateLimit, {
        hashedIp,
      });

      if (!rateLimitCheck.allowed) {
        const retryAfter = rateLimitCheck.resetAt
          ? Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)
          : 3600;

        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
            retryAfterSeconds: retryAfter,
            remaining: 0,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": String(retryAfter),
            },
          }
        );
      }

      // Check for in-flight request from same IP
      const hasInFlight = await ctx.runQuery(internal.preflight._hasInFlightCheck, {
        hashedIp,
      });

      if (hasInFlight) {
        return new Response(
          JSON.stringify({
            error: "A preflight check is already in progress. Please wait for it to complete.",
          }),
          { status: 429, headers: corsHeaders }
        );
      }

      // Check for cached result
      const cachedResult = await ctx.runQuery(internal.preflight._getCachedResult, {
        normalizedRepoUrl: normalizedUrl,
      });

      if (cachedResult) {
        return new Response(
          JSON.stringify({
            status: cachedResult.status,
            summary: cachedResult.summary,
            criteria: cachedResult.criteria,
            cached: true,
            cachedAt: cachedResult.cachedAt,
            expiresAt: cachedResult.expiresAt,
            remaining: rateLimitCheck.remaining,
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      // Create a pending check record
      const checkId = await ctx.runMutation(internal.preflight._createPreflightCheck, {
        normalizedRepoUrl: normalizedUrl,
        hashedIp,
      });

      // Run the actual preflight check
      const result = await ctx.runAction(internal.aiReview.runPreflightCheck, {
        repoUrl: body.repoUrl,
        packageName: body.npmUrl ? extractPackageNameFromNpmUrl(body.npmUrl) : undefined,
      });

      // Update the check record with the result
      await ctx.runMutation(internal.preflight._updatePreflightCheck, {
        checkId,
        status: result.status,
        summary: result.summary,
        criteria: result.criteria,
      });

      return new Response(
        JSON.stringify({
          status: result.status,
          summary: result.summary,
          criteria: result.criteria,
          cached: false,
          remaining: rateLimitCheck.remaining - 1,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error("Preflight check error:", error);
      return new Response(
        JSON.stringify({
          error: "An error occurred during the preflight check",
          status: "error",
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  }),
});

// Helper to extract package name from npm URL
function extractPackageNameFromNpmUrl(npmUrl: string): string | undefined {
  const match = npmUrl.match(/npmjs\.com\/package\/(@?[^/]+(?:\/[^/]+)?)/);
  return match ? match[1] : undefined;
}

// CORS preflight for preflight endpoint
http.route({
  path: "/api/preflight",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, { status: 204, headers: preflightJsonHeaders(request) });
  }),
});

// ============ SITEMAP.XML ENDPOINT ============
http.route({
  path: "/api/sitemap.xml",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const packages = await ctx.runQuery(
      internal.packages._listApprovedPackages
    );

    const origin = DIRECTORY_ORIGIN;
    const today = new Date().toISOString().slice(0, 10);

    const staticPages = [
      { loc: `${origin}/components`, changefreq: "daily", priority: "1.0" },
      {
        loc: `${origin}/components/submit`,
        changefreq: "monthly",
        priority: "0.5",
      },
      {
        loc: `${origin}/components/submissions`,
        changefreq: "weekly",
        priority: "0.4",
      },
      {
        loc: `${origin}/components/documentation`,
        changefreq: "monthly",
        priority: "0.4",
      },
    ];

    const urls: string[] = [];
    for (const page of staticPages) {
      urls.push(
        `  <url>\n    <loc>${page.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
      );
    }

    const sorted = [...packages].sort((a: any, b: any) =>
      (a.name || "").localeCompare(b.name || "")
    );

    for (const pkg of sorted) {
      const slug = (pkg as any).slug;
      if (!slug) continue;
      const lastmod = (pkg as any).lastPublish
        ? new Date((pkg as any).lastPublish).toISOString().slice(0, 10)
        : today;
      urls.push(
        `  <url>\n    <loc>${origin}/components/${escapeXml(slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }),
});

export default http;
