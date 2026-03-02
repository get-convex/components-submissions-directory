import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import { buildComponentUrls } from "../shared/componentUrls";

const http = httpRouter();
const DIRECTORY_ORIGIN = "https://www.convex.dev";

// Register auth HTTP routes (OAuth callbacks, sign-in/sign-out endpoints)
auth.addHttpRoutes(http);

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
      const desc =
        pkg.seoValueProp || pkg.shortDescription || pkg.description || "";
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

  if (pkg.seoResourceLinks && pkg.seoResourceLinks.length > 0) {
    lines.push(`\n## Resources\n`);
    for (const link of pkg.seoResourceLinks) {
      lines.push(`- [${link.label}](${link.url})`);
    }
    lines.push("");
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

    if (pkg.seoResourceLinks && pkg.seoResourceLinks.length > 0) {
      lines.push("## Resources");
      for (const link of pkg.seoResourceLinks) {
        lines.push(`- ${link.label}: ${link.url}`);
      }
      lines.push("");
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
      if (pkg.convexVerified) {
        statusLabel = "Verified";
        statusColor = "#228909";
      } else if (pkg.reviewStatus === "approved") {
        statusLabel = "Approved";
        statusColor = "#074ee8";
      } else if (pkg.reviewStatus === "pending" || !pkg.reviewStatus) {
        statusLabel = "Pending";
        statusColor = "#d57115";
      } else {
        statusLabel = "Submitted";
        statusColor = "#6b6b6b";
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
    <rect width="${leftWidth}" height="20" fill="#2a2825"/>
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

// MCP: Search components
http.route({
  path: "/api/mcp/search",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const packages = await ctx.runQuery(
      internal.packages._listApprovedPackages,
    );

    // Filter by search query
    let filtered = packages;
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((pkg: any) => {
        const name = (pkg.name || "").toLowerCase();
        const componentName = (pkg.componentName || "").toLowerCase();
        const desc = (pkg.shortDescription || pkg.description || "").toLowerCase();
        const tags = (pkg.tags || []).join(" ").toLowerCase();
        return (
          name.includes(q) ||
          componentName.includes(q) ||
          desc.includes(q) ||
          tags.includes(q)
        );
      });
    }

    // Filter by category
    if (category) {
      filtered = filtered.filter((pkg: any) => pkg.category === category);
    }

    // Sort by downloads (most popular first)
    filtered.sort((a: any, b: any) => (b.weeklyDownloads || 0) - (a.weeklyDownloads || 0));

    // Paginate
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Build search results (lighter than full profile)
    const results = paginated.map((pkg: any) => ({
      slug: pkg.slug || "",
      displayName: pkg.componentName || pkg.name,
      packageName: pkg.name,
      shortDescription: pkg.shortDescription,
      category: pkg.category,
      weeklyDownloads: pkg.weeklyDownloads || 0,
      convexVerified: pkg.convexVerified || false,
    }));

    // Log request asynchronously (don't wait)
    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "search",
      query: query || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        results,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }),
      { status: 200, headers: mcpJsonHeaders() },
    );
  }),
});

// MCP: Get single component profile
http.route({
  path: "/api/mcp/component",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "component",
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 400,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: mcpJsonHeaders() },
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "component",
        slug,
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 404,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: mcpJsonHeaders() },
      );
    }

    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "component",
      slug,
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ component: buildMcpProfile(pkg) }),
      { status: 200, headers: mcpJsonHeaders() },
    );
  }),
});

// MCP: Get install command
http.route({
  path: "/api/mcp/install-command",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "install-command",
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 400,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: mcpJsonHeaders() },
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "install-command",
        slug,
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 404,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: mcpJsonHeaders() },
      );
    }

    const command = pkg.installCommand || `npm install ${pkg.name}`;

    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "install-command",
      slug,
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        slug,
        packageName: pkg.name,
        installCommand: command,
        packageManager: detectPackageManager(command),
      }),
      { status: 200, headers: mcpJsonHeaders() },
    );
  }),
});

// MCP: Get component markdown documentation URL
http.route({
  path: "/api/mcp/docs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "docs",
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 400,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: mcpJsonHeaders() },
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "docs",
        slug,
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 404,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: mcpJsonHeaders() },
      );
    }

    const componentLinks = buildComponentUrls(slug, DIRECTORY_ORIGIN);

    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "docs",
      slug,
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

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
      { status: 200, headers: mcpJsonHeaders() },
    );
  }),
});

// MCP: Server info and tool definitions
http.route({
  path: "/api/mcp/info",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        name: "convex-components-directory",
        version: "1.0.0",
        description: "Read-only MCP server for Convex Components Directory. Provides component discovery, documentation, and install commands.",
        baseUrl: DIRECTORY_ORIGIN,
        tools: [
          {
            name: "search_components",
            description: "Search for Convex components by name, description, or category",
            inputSchema: {
              type: "object",
              properties: {
                q: { type: "string", description: "Search query" },
                category: { type: "string", description: "Filter by category" },
                limit: { type: "number", description: "Max results (default 20, max 50)" },
                offset: { type: "number", description: "Pagination offset" },
              },
            },
          },
          {
            name: "get_component",
            description: "Get full component profile including install command, docs, and trust signals",
            inputSchema: {
              type: "object",
              properties: {
                slug: { type: "string", description: "Component slug" },
              },
              required: ["slug"],
            },
          },
          {
            name: "get_install_command",
            description: "Get the install command for a component",
            inputSchema: {
              type: "object",
              properties: {
                slug: { type: "string", description: "Component slug" },
              },
              required: ["slug"],
            },
          },
          {
            name: "get_docs",
            description: "Get documentation URLs for a component",
            inputSchema: {
              type: "object",
              properties: {
                slug: { type: "string", description: "Component slug" },
              },
              required: ["slug"],
            },
          },
        ],
      }),
      { status: 200, headers: mcpJsonHeaders() },
    );
  }),
});

// CORS preflight for MCP endpoints
http.route({
  path: "/api/mcp/search",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

http.route({
  path: "/api/mcp/component",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

http.route({
  path: "/api/mcp/install-command",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

http.route({
  path: "/api/mcp/docs",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

http.route({
  path: "/api/mcp/info",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

export default http;
