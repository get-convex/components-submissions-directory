import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { buildComponentUrls } from "../shared/componentUrls";

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

// MCP routes temporarily disabled - see prds/mcp-ui-rollback.md
/*
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

// ============ MCP PROTOCOL ENDPOINT ============
// Standards-based MCP protocol surface (additive to existing REST endpoints)
// Implements JSON-RPC 2.0 style interface for MCP tool discovery and invocation
// Reference: https://modelcontextprotocol.io/docs/develop/build-server

const MCP_SERVER_VERSION = "1.1.0";
const MCP_SERVER_NAME = "convex-components-directory";
const MCP_PROTOCOL_VERSION = "2025-03-26";

interface McpJsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpJsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

function buildMcpJsonRpcResponse(
  id: string | number,
  result: unknown
): McpJsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function buildMcpJsonRpcError(
  id: string | number,
  code: number,
  message: string,
  data?: unknown
): McpJsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

// MCP protocol error codes
const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

// MCP Protocol endpoint: handles tool discovery and invocation via JSON-RPC
http.route({
  path: "/api/mcp/protocol",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    let requestId: string | number = 0;
    let method = "unknown";

    try {
      const body = await request.json() as McpJsonRpcRequest;
      requestId = body.id || 0;
      method = body.method || "unknown";

      if (body.jsonrpc !== "2.0") {
        return new Response(
          JSON.stringify(
            buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.INVALID_REQUEST, "Invalid JSON-RPC version")
          ),
          { status: 200, headers: mcpJsonHeaders() }
        );
      }

      // Handle MCP protocol methods
      switch (body.method) {
        case "initialize": {
          const result = {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: MCP_SERVER_NAME,
              version: MCP_SERVER_VERSION,
            },
          };
          ctx.runMutation(internal.packages._recordMcpApiRequest, {
            endpoint: "protocol/initialize",
            userAgent: request.headers.get("user-agent") || undefined,
            referer: request.headers.get("referer") || undefined,
            responseStatus: 200,
            responseTimeMs: Date.now() - startTime,
          });
          return new Response(
            JSON.stringify(buildMcpJsonRpcResponse(requestId, result)),
            { status: 200, headers: mcpJsonHeaders() }
          );
        }

        case "tools/list": {
          // Return list of available tools
          const tools = [
            {
              name: "search_components",
              description: "Search for Convex components by name, description, or category. Returns a list of matching components with basic metadata.",
              inputSchema: {
                type: "object",
                properties: {
                  q: { type: "string", description: "Search query (searches name, description, tags)" },
                  category: { type: "string", description: "Filter by category (ai, auth, backend, database, durable-functions, integrations, payments)" },
                  limit: { type: "number", description: "Max results to return (default 20, max 50)" },
                  offset: { type: "number", description: "Pagination offset (default 0)" },
                },
              },
            },
            {
              name: "get_component",
              description: "Get full profile for a specific component including install command, documentation URLs, metadata, and trust signals.",
              inputSchema: {
                type: "object",
                properties: {
                  slug: { type: "string", description: "Component slug (e.g. 'agent', 'convex-helpers')" },
                },
                required: ["slug"],
              },
            },
            {
              name: "get_install_command",
              description: "Get the install command for a specific component. Returns the npm/yarn/pnpm/bun install command.",
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
              description: "Get documentation URLs for a component including markdown docs, llms.txt, and directory page link.",
              inputSchema: {
                type: "object",
                properties: {
                  slug: { type: "string", description: "Component slug" },
                },
                required: ["slug"],
              },
            },
            {
              name: "list_categories",
              description: "List all available component categories with their labels and component counts.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
          ];
          ctx.runMutation(internal.packages._recordMcpApiRequest, {
            endpoint: "protocol/tools/list",
            userAgent: request.headers.get("user-agent") || undefined,
            referer: request.headers.get("referer") || undefined,
            responseStatus: 200,
            responseTimeMs: Date.now() - startTime,
          });
          return new Response(
            JSON.stringify(buildMcpJsonRpcResponse(requestId, { tools })),
            { status: 200, headers: mcpJsonHeaders() }
          );
        }

        case "tools/call": {
          const params = body.params as { name: string; arguments?: Record<string, unknown> } | undefined;
          if (!params?.name) {
            return new Response(
              JSON.stringify(
                buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.INVALID_PARAMS, "Missing tool name")
              ),
              { status: 200, headers: mcpJsonHeaders() }
            );
          }

          const toolArgs = params.arguments || {};
          let toolResult: unknown;

          switch (params.name) {
            case "search_components": {
              const query = (toolArgs.q as string) || "";
              const category = (toolArgs.category as string) || "";
              const limit = Math.min(Math.max(1, (toolArgs.limit as number) || 20), 50);
              const offset = Math.max(0, (toolArgs.offset as number) || 0);

              const packages = await ctx.runQuery(internal.packages._listApprovedPackages);
              let filtered = packages;

              if (query) {
                const q = query.toLowerCase();
                filtered = filtered.filter((pkg: any) => {
                  const name = (pkg.name || "").toLowerCase();
                  const componentName = (pkg.componentName || "").toLowerCase();
                  const desc = (pkg.shortDescription || pkg.description || "").toLowerCase();
                  const tags = (pkg.tags || []).join(" ").toLowerCase();
                  return name.includes(q) || componentName.includes(q) || desc.includes(q) || tags.includes(q);
                });
              }

              if (category) {
                filtered = filtered.filter((pkg: any) => pkg.category === category);
              }

              filtered.sort((a: any, b: any) => (b.weeklyDownloads || 0) - (a.weeklyDownloads || 0));
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

              toolResult = {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({ results, pagination: { total, limit, offset, hasMore: offset + limit < total } }, null, 2),
                  },
                ],
              };

              ctx.runMutation(internal.packages._recordMcpApiRequest, {
                endpoint: "protocol/tools/call/search_components",
                query: query || undefined,
                userAgent: request.headers.get("user-agent") || undefined,
                referer: request.headers.get("referer") || undefined,
                responseStatus: 200,
                responseTimeMs: Date.now() - startTime,
              });
              break;
            }

            case "get_component": {
              const slug = toolArgs.slug as string;
              if (!slug) {
                return new Response(
                  JSON.stringify(
                    buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.INVALID_PARAMS, "Missing slug parameter")
                  ),
                  { status: 200, headers: mcpJsonHeaders() }
                );
              }

              const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, { slug });
              if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
                toolResult = {
                  content: [{ type: "text", text: JSON.stringify({ error: "Component not found" }) }],
                  isError: true,
                };
              } else {
                toolResult = {
                  content: [{ type: "text", text: JSON.stringify({ component: buildMcpProfile(pkg) }, null, 2) }],
                };
              }

              ctx.runMutation(internal.packages._recordMcpApiRequest, {
                endpoint: "protocol/tools/call/get_component",
                slug,
                userAgent: request.headers.get("user-agent") || undefined,
                referer: request.headers.get("referer") || undefined,
                responseStatus: pkg ? 200 : 404,
                responseTimeMs: Date.now() - startTime,
              });
              break;
            }

            case "get_install_command": {
              const slug = toolArgs.slug as string;
              if (!slug) {
                return new Response(
                  JSON.stringify(
                    buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.INVALID_PARAMS, "Missing slug parameter")
                  ),
                  { status: 200, headers: mcpJsonHeaders() }
                );
              }

              const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, { slug });
              if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
                toolResult = {
                  content: [{ type: "text", text: JSON.stringify({ error: "Component not found" }) }],
                  isError: true,
                };
              } else {
                const command = pkg.installCommand || `npm install ${pkg.name}`;
                toolResult = {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        slug,
                        packageName: pkg.name,
                        installCommand: command,
                        packageManager: detectPackageManager(command),
                      }, null, 2),
                    },
                  ],
                };
              }

              ctx.runMutation(internal.packages._recordMcpApiRequest, {
                endpoint: "protocol/tools/call/get_install_command",
                slug,
                userAgent: request.headers.get("user-agent") || undefined,
                referer: request.headers.get("referer") || undefined,
                responseStatus: pkg ? 200 : 404,
                responseTimeMs: Date.now() - startTime,
              });
              break;
            }

            case "get_docs": {
              const slug = toolArgs.slug as string;
              if (!slug) {
                return new Response(
                  JSON.stringify(
                    buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.INVALID_PARAMS, "Missing slug parameter")
                  ),
                  { status: 200, headers: mcpJsonHeaders() }
                );
              }

              const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, { slug });
              if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
                toolResult = {
                  content: [{ type: "text", text: JSON.stringify({ error: "Component not found" }) }],
                  isError: true,
                };
              } else {
                const componentLinks = buildComponentUrls(slug, DIRECTORY_ORIGIN);
                toolResult = {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
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
                      }, null, 2),
                    },
                  ],
                };
              }

              ctx.runMutation(internal.packages._recordMcpApiRequest, {
                endpoint: "protocol/tools/call/get_docs",
                slug,
                userAgent: request.headers.get("user-agent") || undefined,
                referer: request.headers.get("referer") || undefined,
                responseStatus: pkg ? 200 : 404,
                responseTimeMs: Date.now() - startTime,
              });
              break;
            }

            case "list_categories": {
              const packages = await ctx.runQuery(internal.packages._listApprovedPackages);
              const categoryCounts: Record<string, number> = {};
              for (const pkg of packages) {
                const cat = (pkg as any).category || "general";
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
              }

              const categories = Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({
                slug,
                label,
                componentCount: categoryCounts[slug] || 0,
              }));

              toolResult = {
                content: [{ type: "text", text: JSON.stringify({ categories }, null, 2) }],
              };

              ctx.runMutation(internal.packages._recordMcpApiRequest, {
                endpoint: "protocol/tools/call/list_categories",
                userAgent: request.headers.get("user-agent") || undefined,
                referer: request.headers.get("referer") || undefined,
                responseStatus: 200,
                responseTimeMs: Date.now() - startTime,
              });
              break;
            }

            default:
              return new Response(
                JSON.stringify(
                  buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown tool: ${params.name}`)
                ),
                { status: 200, headers: mcpJsonHeaders() }
              );
          }

          return new Response(
            JSON.stringify(buildMcpJsonRpcResponse(requestId, toolResult)),
            { status: 200, headers: mcpJsonHeaders() }
          );
        }

        default:
          ctx.runMutation(internal.packages._recordMcpApiRequest, {
            endpoint: `protocol/${method}`,
            userAgent: request.headers.get("user-agent") || undefined,
            referer: request.headers.get("referer") || undefined,
            responseStatus: 400,
            responseTimeMs: Date.now() - startTime,
          });
          return new Response(
            JSON.stringify(
              buildMcpJsonRpcError(requestId, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown method: ${body.method}`)
            ),
            { status: 200, headers: mcpJsonHeaders() }
          );
      }
    } catch (error) {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: `protocol/${method}`,
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 500,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify(
          buildMcpJsonRpcError(
            requestId,
            MCP_ERROR_CODES.INTERNAL_ERROR,
            error instanceof Error ? error.message : "Internal server error"
          )
        ),
        { status: 200, headers: mcpJsonHeaders() }
      );
    }
  }),
});

// MCP Protocol: GET handler for server discovery (Streamable HTTP transport)
// Browsers and MCP clients can GET this endpoint to discover server capabilities
http.route({
  path: "/api/mcp/protocol",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "protocol/GET",
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
      responseStatus: 200,
      responseTimeMs: 0,
    });

    return new Response(
      JSON.stringify({
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
        protocolVersion: MCP_PROTOCOL_VERSION,
        description: "Read-only MCP server for the Convex Components Directory. Provides component discovery, documentation, and install commands for AI agents.",
        transport: "streamable-http",
        capabilities: {
          tools: {},
        },
        tools: [
          "search_components",
          "get_component",
          "get_install_command",
          "get_docs",
          "list_categories",
        ],
        endpoints: {
          protocol: `${MCP_DIRECT_ORIGIN}/api/mcp/protocol`,
          search: `${MCP_DIRECT_ORIGIN}/api/mcp/search`,
          component: `${MCP_DIRECT_ORIGIN}/api/mcp/component`,
          installCommand: `${MCP_DIRECT_ORIGIN}/api/mcp/install-command`,
          docs: `${MCP_DIRECT_ORIGIN}/api/mcp/docs`,
          info: `${MCP_DIRECT_ORIGIN}/api/mcp/info`,
        },
      }, null, 2),
      { status: 200, headers: mcpJsonHeaders() }
    );
  }),
});

// MCP Protocol: CORS preflight
http.route({
  path: "/api/mcp/protocol",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

// ============ CURSOR INSTALL LINK GENERATOR ============
// Returns Cursor deeplink for installing this MCP server
// Reference: https://cursor.com/docs/context/mcp/install-links

function generateCursorInstallLink(serverName: string, config: object): string {
  const configBase64 = Buffer.from(JSON.stringify(config)).toString("base64url");
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverName)}&config=${configBase64}`;
}

// Cursor install link for global directory server (url-based, no npm dependency)
http.route({
  path: "/api/mcp/cursor-install",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();

    const config = {
      url: `${MCP_DIRECT_ORIGIN}/api/mcp/protocol`,
    };

    const installLink = generateCursorInstallLink(MCP_SERVER_NAME, config);

    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "cursor-install",
      userAgent: request.headers.get("user-agent") || undefined,
      referer: request.headers.get("referer") || undefined,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
        installLink,
        config,
        instructions: "Click the install link or copy the config to your Cursor MCP settings.",
      }),
      { status: 200, headers: mcpJsonHeaders() }
    );
  }),
});

// Cursor install link for a specific component
http.route({
  path: "/api/mcp/cursor-install-component",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "cursor-install-component",
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 400,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Missing slug parameter" }),
        { status: 400, headers: mcpJsonHeaders() }
      );
    }

    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, { slug });
    if (!pkg || pkg.visibility === "hidden" || pkg.visibility === "archived") {
      ctx.runMutation(internal.packages._recordMcpApiRequest, {
        endpoint: "cursor-install-component",
        slug,
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        responseStatus: 404,
        responseTimeMs: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ error: "Component not found" }),
        { status: 404, headers: mcpJsonHeaders() }
      );
    }

    const componentServerName = `convex-component-${slug.replace(/\//g, "-")}`;
    const config = {
      url: `${MCP_DIRECT_ORIGIN}/api/mcp/protocol`,
    };

    const installLink = generateCursorInstallLink(componentServerName, config);

    ctx.runMutation(internal.packages._recordMcpApiRequest, {
      endpoint: "cursor-install-component",
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
        serverName: componentServerName,
        installLink,
        config,
        instructions: `Click the install link to add ${pkg.componentName || pkg.name} MCP server to Cursor.`,
      }),
      { status: 200, headers: mcpJsonHeaders() }
    );
  }),
});

// CORS preflight for Cursor install endpoints
http.route({
  path: "/api/mcp/cursor-install",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});

http.route({
  path: "/api/mcp/cursor-install-component",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: mcpJsonHeaders() });
  }),
});
*/
// End of temporarily disabled MCP routes

export default http;
