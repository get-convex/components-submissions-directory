"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Normalized finding shape shared across all providers
type SecurityFinding = {
  provider: "socket" | "snyk" | "devin";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  recommendation: string;
};

type ProviderResult = {
  status: string;
  findings: SecurityFinding[];
  recommendations: string[];
  metadata: Record<string, unknown>;
};

function parseSocketNdjsonResponse(body: string): Array<Record<string, unknown>> {
  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function getProviderRawSummary(metadata: Record<string, unknown>): string | undefined {
  return (metadata.rawSummary as string | undefined) ?? (metadata.error as string | undefined);
}

// ============ SOCKET.DEV PROVIDER ============

async function runSocketScan(
  repoUrl: string,
  packageName: string,
  packageVersion?: string,
): Promise<ProviderResult> {
  const apiKey = process.env.SOCKET_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: { error: "SOCKET_API_KEY not configured" },
    };
  }

  try {
    // Socket's PURL lookup returns NDJSON, and may return an empty success body
    // when there are no alerts available for the requested package version.
    const version = packageVersion || "latest";
    const purl = packageName.startsWith("@")
      ? `pkg:npm/${encodeURIComponent(packageName)}@${version}`
      : `pkg:npm/${packageName}@${version}`;

    const response = await fetch(
      "https://api.socket.dev/v0/purl?alerts=true&compact=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/x-ndjson, application/json",
        },
        body: JSON.stringify({
          components: [{ purl }],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: "error",
        findings: [],
        recommendations: [],
        metadata: { error: `Socket API ${response.status}: ${errorText}` },
      };
    }

    const data = parseSocketNdjsonResponse(await response.text());
    const findings: SecurityFinding[] = [];
    const recommendations: string[] = [];

    if (data.length === 0) {
      return {
        status: "safe",
        findings,
        recommendations,
        metadata: {
          issueCount: 0,
          rawSummary: "No Socket alerts returned for this package version.",
        },
      };
    }

    const pkgData = data[0];
    const scoreData =
      typeof pkgData.score === "object" && pkgData.score !== null
        ? (pkgData.score as Record<string, unknown>)
        : undefined;

    // Map score categories from the response
    const scoreCategories = [
      { key: "supplyChainRisk", label: "supply chain" },
      { key: "quality", label: "quality" },
      { key: "maintenance", label: "maintenance" },
      { key: "vulnerability", label: "vulnerability" },
      { key: "license", label: "license" },
    ];

    for (const { key, label } of scoreCategories) {
      const category = pkgData[key] || scoreData?.[key];
      const categoryRecord =
        typeof category === "object" && category !== null
          ? (category as Record<string, unknown>)
          : undefined;
      const score =
        typeof category === "number"
          ? category
          : typeof categoryRecord?.score === "number"
            ? categoryRecord.score
            : undefined;
      if (typeof score === "number" && score < 0.5) {
        const severity = score < 0.2 ? "high" : "medium";
        findings.push({
          provider: "socket" as const,
          severity,
          title: `Low ${label} score: ${(score * 100).toFixed(0)}%`,
          description: `Socket.dev rates the ${label} dimension at ${(score * 100).toFixed(0)}% for ${packageName}.`,
          recommendation: `Review the package's ${label} risks before using in production.`,
        });
        recommendations.push(
          `Address ${label} concerns flagged by Socket.dev (score: ${(score * 100).toFixed(0)}%).`,
        );
      }
    }

    // Map alerts if present
    const alerts = pkgData?.alerts || pkgData?.issues || [];
    if (Array.isArray(alerts)) {
      for (const alert of alerts.slice(0, 20)) {
        const rawSeverity = (alert.severity || alert.type || "medium").toLowerCase();
        const severity =
          rawSeverity === "critical"
            ? "critical"
            : rawSeverity === "high"
              ? "high"
              : rawSeverity === "medium" || rawSeverity === "mid"
                ? "medium"
                : "low";
        findings.push({
          provider: "socket" as const,
          severity: severity as SecurityFinding["severity"],
          title: alert.type || alert.key || "Socket alert",
          description: alert.description || alert.value || alert.type || "No description",
          recommendation:
            alert.suggestion || alert.props?.suggestion || "Review this issue in the Socket.dev dashboard.",
        });
      }
    }

    const overallScore =
      typeof pkgData?.depscore === "number"
        ? pkgData.depscore
        : typeof pkgData?.score === "number"
          ? pkgData.score
          : undefined;

    return {
      status: findings.some((f) => f.severity === "critical" || f.severity === "high")
        ? "unsafe"
        : findings.length > 0
          ? "warning"
          : "safe",
      findings,
      recommendations,
      metadata: {
        score: overallScore,
        issueCount: findings.length,
        rawSummary:
          overallScore !== undefined
            ? `Socket score: ${(overallScore * 100).toFixed(0)}%`
            : findings.length === 0
              ? "No issues found"
              : `${findings.length} issues found`,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: { error: `Socket scan failed: ${message}` },
    };
  }
}

// ============ SNYK PROVIDER ============

async function runSnykScan(repoUrl: string): Promise<ProviderResult> {
  const token = process.env.SNYK_TOKEN;
  const orgId = process.env.SNYK_ORG_ID;
  if (!token || !orgId) {
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: { error: "SNYK_TOKEN or SNYK_ORG_ID not configured" },
    };
  }

  try {
    // Parse owner/repo from GitHub URL
    const match = repoUrl.match(
      /github\.com\/([^/]+)\/([^/]+)/,
    );
    if (!match) {
      return {
        status: "error",
        findings: [],
        recommendations: [],
        metadata: { error: "Could not parse GitHub owner/repo from URL" },
      };
    }
    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, "");

    // Test existing projects for this repo in the org
    const listUrl = `https://api.snyk.io/rest/orgs/${orgId}/projects?version=2024-06-21&target_id=${encodeURIComponent(`${owner}/${repoName}`)}`;
    const listResp = await fetch(listUrl, {
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/vnd.api+json",
      },
    });

    // If we can't list projects, try the v1 test endpoint as fallback
    const testUrl = `https://api.snyk.io/v1/test/npm`;
    const testResp = await fetch(testUrl, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encoding: "plain",
        files: {
          target: { contents: JSON.stringify({ name: repoName, version: "0.0.0" }) },
        },
      }),
    });

    const findings: SecurityFinding[] = [];
    const recommendations: string[] = [];
    let vulnCount = 0;
    let criticalCount = 0;
    let highCount = 0;

    if (testResp.ok) {
      const testData = await testResp.json();
      if (testData.issues?.vulnerabilities) {
        for (const vuln of testData.issues.vulnerabilities.slice(0, 30)) {
          const severity = (vuln.severity || "medium").toLowerCase();
          if (severity === "critical") criticalCount++;
          if (severity === "high") highCount++;
          vulnCount++;
          findings.push({
            provider: "snyk" as const,
            severity: (
              ["critical", "high", "medium", "low"].includes(severity)
                ? severity
                : "medium"
            ) as SecurityFinding["severity"],
            title: vuln.title || vuln.id || "Snyk vulnerability",
            description:
              vuln.description ||
              `${vuln.packageName}@${vuln.version}: ${vuln.title || "vulnerability found"}`,
            recommendation:
              vuln.fixedIn?.length > 0
                ? `Upgrade ${vuln.packageName} to ${vuln.fixedIn[0]}`
                : "Review this vulnerability in the Snyk dashboard.",
          });
        }
      }
    } else if (listResp.ok) {
      const listData = await listResp.json();
      if (listData.data?.length > 0) {
        recommendations.push(
          "Snyk project exists for this repo. Check the Snyk dashboard for detailed results.",
        );
      }
    }

    if (vulnCount > 0) {
      recommendations.push(
        `Snyk found ${vulnCount} vulnerabilities (${criticalCount} critical, ${highCount} high). Review and patch affected dependencies.`,
      );
    }

    return {
      status:
        criticalCount > 0 || highCount > 0
          ? "unsafe"
          : vulnCount > 0
            ? "warning"
            : "safe",
      findings,
      recommendations,
      metadata: {
        vulnerabilityCount: vulnCount,
        criticalCount,
        highCount,
        rawSummary:
          vulnCount > 0
            ? `${vulnCount} vulnerabilities found (${criticalCount} critical, ${highCount} high)`
            : "No known vulnerabilities",
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: { error: `Snyk scan failed: ${message}` },
    };
  }
}

// ============ DEVIN AI PROVIDER ============

async function runDevinScan(
  repoUrl: string,
  packageName: string,
): Promise<ProviderResult> {
  const apiKey = process.env.DEVIN_API_KEY;
  const orgId = process.env.DEVIN_ORG_ID;
  if (!apiKey || !orgId) {
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: { error: "DEVIN_API_KEY or DEVIN_ORG_ID not configured" },
    };
  }

  if (apiKey.startsWith("apk_")) {
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: {
        error:
          "Legacy Devin API key detected. Use a Devin v3 service user key for DEVIN_API_KEY.",
      },
    };
  }

  try {
    // Parse owner/repo for the repos parameter
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    const repoSlug = match ? match[1].replace(/\.git$/, "") : null;

    // Structured output schema for normalized findings
    const structuredSchema = {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["safe", "unsafe", "warning"],
        },
        summary: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ["critical", "high", "medium", "low", "info"],
              },
              title: { type: "string" },
              description: { type: "string" },
              recommendation: { type: "string" },
            },
            required: ["severity", "title", "description", "recommendation"],
          },
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["status", "summary", "findings", "recommendations"],
    };

    // Create Devin session with security analysis prompt
    const createResp = await fetch(
      `https://api.devin.ai/v3/organizations/${orgId}/sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Perform a security analysis of the npm package "${packageName}" at ${repoUrl}. Analyze the repository for:
1. Known vulnerabilities in dependencies
2. Supply chain risks (malicious or suspicious code patterns)
3. Security best practices (input validation, secrets exposure, unsafe eval usage)
4. License compliance issues
5. Dependency freshness and maintenance status

Return your analysis as structured output following the provided schema. Be specific about each finding with actionable recommendations. If the repository looks safe, say so clearly.`,
          ...(repoSlug ? { repos: [repoSlug] } : {}),
          structured_output_schema: structuredSchema,
          max_acu_limit: 5,
          title: `Security scan: ${packageName}`,
          tags: ["security-scan", "automated"],
        }),
      },
    );

    if (!createResp.ok) {
      const errorText = await createResp.text();
      return {
        status: "error",
        findings: [],
        recommendations: [],
        metadata: { error: `Devin session creation failed: ${createResp.status} ${errorText}` },
      };
    }

    const session = await createResp.json();
    const sessionId = session.session_id;
    const sessionUrl = session.url;

    // Poll for session completion (max 5 minutes, 15s intervals)
    const maxWait = 5 * 60 * 1000;
    const pollInterval = 15_000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const statusResp = await fetch(
        `https://api.devin.ai/v3/organizations/${orgId}/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );

      if (!statusResp.ok) continue;

      const statusData = await statusResp.json();

      if (
        statusData.status === "running" &&
        statusData.status_detail === "finished"
      ) {
        // Session completed, extract structured output
        const output = statusData.structured_output;
        if (output) {
          const findings: SecurityFinding[] = (output.findings || []).map(
            (f: { severity: string; title: string; description: string; recommendation: string }) => ({
              provider: "devin" as const,
              severity: (
                ["critical", "high", "medium", "low", "info"].includes(
                  f.severity,
                )
                  ? f.severity
                  : "info"
              ) as SecurityFinding["severity"],
              title: f.title,
              description: f.description,
              recommendation: f.recommendation,
            }),
          );

          return {
            status: output.status || "safe",
            findings,
            recommendations: output.recommendations || [],
            metadata: {
              sessionId,
              sessionUrl,
              findingCount: findings.length,
              rawSummary: output.summary || "Analysis complete",
            },
          };
        }
        break;
      }

      if (
        statusData.status === "exit" ||
        statusData.status === "error" ||
        statusData.status === "suspended"
      ) {
        return {
          status: "error",
          findings: [],
          recommendations: [],
          metadata: {
            sessionId,
            sessionUrl,
            error: `Devin session ended with status: ${statusData.status} (${statusData.status_detail || "unknown"})`,
          },
        };
      }
    }

    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: {
        sessionId,
        sessionUrl,
        error: "Devin session timed out after 5 minutes",
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      findings: [],
      recommendations: [],
      metadata: { error: `Devin scan failed: ${message}` },
    };
  }
}

// ============ ORCHESTRATOR ============

// Merge provider results into a combined report
function mergeResults(
  results: Array<{ provider: string; result: ProviderResult }>,
) {
  const allFindings: SecurityFinding[] = [];
  const allRecommendations: string[] = [];
  let hasError = true;
  let hasCriticalOrHigh = false;
  let hasMedium = false;

  for (const { result } of results) {
    if (result.status !== "error") hasError = false;
    allFindings.push(...result.findings);
    allRecommendations.push(...result.recommendations);
    for (const f of result.findings) {
      if (f.severity === "critical" || f.severity === "high")
        hasCriticalOrHigh = true;
      if (f.severity === "medium") hasMedium = true;
    }
  }

  // Determine overall status
  let status: "safe" | "unsafe" | "warning" | "error";
  if (hasError && allFindings.length === 0 && results.every((r) => r.result.status === "error")) {
    status = "error";
  } else if (hasCriticalOrHigh) {
    status = "unsafe";
  } else if (hasMedium) {
    status = "warning";
  } else {
    status = "safe";
  }

  // Deduplicate recommendations
  const uniqueRecs = [...new Set(allRecommendations)];

  // Build summary
  const providerNames = results
    .filter((r) => r.result.status !== "error")
    .map((r) => r.provider);
  const errorNames = results
    .filter((r) => r.result.status === "error")
    .map((r) => r.provider);

  let summary = "";
  if (status === "safe") {
    summary = `No security issues found across ${providerNames.length} provider${providerNames.length !== 1 ? "s" : ""}.`;
  } else if (status === "unsafe") {
    summary = `${allFindings.filter((f) => f.severity === "critical" || f.severity === "high").length} critical/high severity issues found.`;
  } else if (status === "warning") {
    summary = `${allFindings.length} issue${allFindings.length !== 1 ? "s" : ""} found (no critical/high severity).`;
  } else {
    summary = "All security providers encountered errors.";
  }
  if (errorNames.length > 0 && status !== "error") {
    summary += ` (${errorNames.join(", ")} errored)`;
  }

  return { status, summary, findings: allFindings, recommendations: uniqueRecs };
}

// Internal action: run security scan across enabled providers
export const _runSecurityScan = internalAction({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scanCreatedAt = Date.now();

    // Mark as scanning
    await ctx.runMutation(internal.packages._updateSecurityScanStatus, {
      packageId: args.packageId,
      status: "scanning",
    });

    try {
      // Load package and settings in parallel
      const [pkg, settings] = await Promise.all([
        ctx.runQuery(internal.packages._getPackage, {
          packageId: args.packageId,
        }),
        ctx.runQuery(internal.packages._getAdminSettings),
      ]);

      if (!pkg || !pkg.repositoryUrl) {
        await ctx.runMutation(internal.packages._saveSecurityScanResultAndRun, {
          packageId: args.packageId,
          status: "error",
          summary: "No repository URL available for scanning.",
          findings: [],
          recommendations: [],
          providerResults: {},
          error: "No repository URL",
          createdAt: scanCreatedAt,
          triggeredBy: "admin",
        });
        return null;
      }

      // Build provider tasks based on enabled settings
      const tasks: Array<{
        provider: string;
        run: () => Promise<ProviderResult>;
      }> = [];

      if (settings.enableSocketScan) {
        tasks.push({
          provider: "socket",
          run: () => runSocketScan(pkg.repositoryUrl!, pkg.name, pkg.version),
        });
      }
      if (settings.enableSnykScan) {
        tasks.push({
          provider: "snyk",
          run: () => runSnykScan(pkg.repositoryUrl!),
        });
      }

      if (tasks.length === 0) {
        await ctx.runMutation(internal.packages._saveSecurityScanResultAndRun, {
          packageId: args.packageId,
          status: "error",
          summary: "No security scan providers are enabled.",
          findings: [],
          recommendations: [],
          providerResults: {},
          error: "No providers enabled",
          createdAt: scanCreatedAt,
          triggeredBy: "admin",
        });
        return null;
      }

      // Run all enabled providers in parallel
      const settled = await Promise.allSettled(
        tasks.map(async (t) => ({
          provider: t.provider,
          result: await t.run(),
        })),
      );

      // Collect results (handle rejected promises)
      const providerResults: Array<{ provider: string; result: ProviderResult }> = [];
      for (const entry of settled) {
        if (entry.status === "fulfilled") {
          providerResults.push(entry.value);
        }
      }

      // Merge findings from all providers
      const merged = mergeResults(providerResults);

      // Build provider result metadata for storage
      const socketResult = providerResults.find((r) => r.provider === "socket");
      const snykResult = providerResults.find((r) => r.provider === "snyk");

      await ctx.runMutation(internal.packages._saveSecurityScanResultAndRun, {
        packageId: args.packageId,
        status: merged.status,
        summary: merged.summary,
        findings: merged.findings,
        recommendations: merged.recommendations,
        providerResults: {
          socket: socketResult
            ? {
                status: socketResult.result.status,
                score: socketResult.result.metadata.score as number | undefined,
                issueCount: socketResult.result.metadata.issueCount as
                  | number
                  | undefined,
                rawSummary: getProviderRawSummary(socketResult.result.metadata),
              }
            : undefined,
          snyk: snykResult
            ? {
                status: snykResult.result.status,
                vulnerabilityCount: snykResult.result.metadata
                  .vulnerabilityCount as number | undefined,
                criticalCount: snykResult.result.metadata.criticalCount as
                  | number
                  | undefined,
                highCount: snykResult.result.metadata.highCount as
                  | number
                  | undefined,
                rawSummary: getProviderRawSummary(snykResult.result.metadata),
              }
            : undefined,
        },
        error: merged.status === "error" ? merged.summary : undefined,
        createdAt: scanCreatedAt,
        triggeredBy: "admin",
        socketScanStatus: socketResult?.result.status,
        snykScanStatus: snykResult?.result.status,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.packages._saveSecurityScanResultAndRun, {
        packageId: args.packageId,
        status: "error",
        summary: `Security scan failed: ${message}`,
        findings: [],
        recommendations: [],
        providerResults: {},
        error: message,
        createdAt: scanCreatedAt,
        triggeredBy: "admin",
      });
    }

    return null;
  },
});

// Public action: admin-only entry point for manual scans
export const runSecurityScan = action({
  args: {
    packageId: v.id("packages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const pkg = await ctx.runQuery(internal.packages._getPackage, {
      packageId: args.packageId,
    });
    if (!pkg || !pkg.repositoryUrl) {
      return null;
    }
    if (pkg.securityScanStatus === "scanning") {
      return null;
    }

    await ctx.runMutation(internal.packages._updateSecurityScanStatus, {
      packageId: args.packageId,
      status: "scanning",
    });

    await ctx.scheduler.runAfter(0, internal.securityScan._runSecurityScan, {
      packageId: args.packageId,
    });
    return null;
  },
});
