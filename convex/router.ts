import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/export-csv",
  method: "GET",
  handler: httpAction(async (ctx) => {
    // Fetch all packages
    const packages = await ctx.runQuery(api.packages.getAllPackages);

    // CSV header
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

    // Helper to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
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
// Serves a plain-text index of all approved components for AI agent discovery
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

    // Sort alphabetically by name
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
// Serves raw markdown for a component slug (for agents, LLMs, tools)
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

    // Build markdown document server-side
    const md = buildComponentMarkdown(pkg);

    return new Response(md, {
      status: 200,
      headers: markdownHeaders(),
    });
  }),
});

// Category label lookup (inline, mirrors src/lib/categories.ts)
const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI",
  auth: "Auth",
  backend: "Backend",
  database: "Database",
  "durable-functions": "Durable Functions",
  integrations: "Integrations",
  payments: "Payments",
};

// Build a full markdown document from package data
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

  // AI-generated SEO content sections
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

// Markdown response headers
function markdownHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
  };
}

// ============ BADGE SERVICE ============
// Dynamic SVG badge endpoint for component READMEs
// Vercel rewrite maps convex.dev/components/badge/* -> this endpoint
http.route({
  path: "/api/badge",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract slug from query params (Vercel rewrite passes it)
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      return new Response(generateBadgeSvg("unknown", "Not Found", "#6b6b6b"), {
        status: 200,
        headers: svgHeaders(),
      });
    }

    // Lookup package by slug
    const pkg = await ctx.runQuery(internal.packages._getPackageBySlug, {
      slug,
    });

    // Determine badge status and color
    let statusLabel = "Not Found";
    let statusColor = "#6b6b6b"; // gray

    if (pkg) {
      if (pkg.convexVerified) {
        statusLabel = "Verified";
        statusColor = "#228909"; // green-700
      } else if (pkg.reviewStatus === "approved") {
        statusLabel = "Approved";
        statusColor = "#074ee8"; // blue-500
      } else if (pkg.reviewStatus === "pending" || !pkg.reviewStatus) {
        statusLabel = "Pending";
        statusColor = "#d57115"; // yellow-700
      } else {
        statusLabel = "Submitted";
        statusColor = "#6b6b6b";
      }
    }

    const displayName = pkg?.name || slug;

    // Record badge fetch asynchronously (fire and forget via scheduler)
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

// Generate dynamic SVG badge (shields.io style)
function generateBadgeSvg(
  name: string,
  status: string,
  statusColor: string,
): string {
  // Calculate text widths (approximate: 6.5px per character at 11px font)
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

// Escape XML special characters for SVG text content
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// SVG response headers with short cache (5 min) to balance traffic and freshness
function svgHeaders(): Record<string, string> {
  return {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
  };
}

export default http;
