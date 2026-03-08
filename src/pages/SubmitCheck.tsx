import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { useConnectAuth } from "../lib/connectAuth";
import Header from "../components/Header";
import {
  CheckCircle,
  XCircle,
  Warning,
  ArrowRight,
  Spinner,
  GithubLogo,
  Package,
  ArrowLeft,
  Info,
} from "@phosphor-icons/react";

// Get base path for links (always /components)
function useBasePath() {
  return "/components";
}

// Types for preflight result
interface PreflightCriterion {
  name: string;
  passed: boolean;
  notes: string;
}

interface PreflightResult {
  status: "passed" | "failed" | "partial" | "error";
  summary: string;
  criteria: PreflightCriterion[];
  cached?: boolean;
  cachedAt?: number;
  expiresAt?: number;
  remaining?: number;
  error?: string;
}

// Critical criteria (indices 0-7) vs advisory (indices 8-11)
const CRITICAL_CRITERIA_COUNT = 8;

export default function SubmitCheck() {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const { getAccessToken } = useConnectAuth();
  const [repoUrl, setRepoUrl] = useState("");
  const [npmUrl, setNpmUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect to sign-in when unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      localStorage.setItem("authReturnPath", window.location.pathname);
      signIn();
    }
  }, [authLoading, isAuthenticated, signIn]);

  const validateGitHubRepoUrl = (url: string): boolean => {
    const pattern = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/;
    return pattern.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!repoUrl.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    if (!validateGitHubRepoUrl(repoUrl.trim())) {
      setError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)");
      return;
    }

    setIsLoading(true);

    try {
      // Get auth token for the request
      const token = await getAccessToken();
      if (!token) {
        setError("Authentication required. Please sign in to use the preflight checker.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_CONVEX_URL?.replace(".cloud", ".site")}/api/preflight`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            repoUrl: repoUrl.trim(),
            npmUrl: npmUrl.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Authentication required. Please sign in to use the preflight checker.");
        } else if (response.status === 429) {
          setError(data.error || "Rate limit exceeded. Please try again later.");
        } else {
          setError(data.error || "An error occurred during the preflight check");
        }
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Failed to connect to the preflight service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
  };

  // Show loading state while auth is being checked or user is being redirected
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Spinner size={24} className="animate-spin text-text-secondary" />
            <span className="ml-3 text-text-secondary">Redirecting to sign in...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <a
          href={`${basePath}/submit`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6">
          <ArrowLeft size={16} />
          Back to Submit
        </a>

        {/* Page title */}
        <h1 className="text-xl font-medium text-text-primary mb-2">Component Preflight Check</h1>
        <p className="text-sm text-text-secondary mb-6">
          Test your repository against Convex component requirements before submitting. This check
          uses the same criteria as our review process.
        </p>

        {/* Form or Results */}
        {!result ? (
          <div className="bg-white border border-border rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* GitHub Repository URL */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  GitHub Repository URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    <GithubLogo size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
                  />
                </div>
              </div>

              {/* npm URL (optional) */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  npm Package URL{" "}
                  <span className="text-text-secondary text-xs font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    <Package size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="https://www.npmjs.com/package/your-package"
                    value={npmUrl}
                    onChange={(e) => setNpmUrl(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Provide if your package is already published to include its name in the review.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 rounded-full font-normal bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Spinner size={18} className="animate-spin" />
                    Running preflight check...
                  </>
                ) : (
                  <>
                    Run Preflight Check
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Info box */}
            <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-2">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">What does this check?</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                    <li>Presence of convex.config.ts with defineComponent()</li>
                    <li>Component function structure and imports</li>
                    <li>Object-style function syntax</li>
                    <li>Argument and return validators</li>
                    <li>Proper use of v.null() for void returns</li>
                    <li>Auth patterns and visibility rules</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PreflightResults
            result={result}
            repoUrl={repoUrl}
            onRetry={handleRetry}
            basePath={basePath}
          />
        )}
      </div>
    </div>
  );
}

// Results component
function PreflightResults({
  result,
  repoUrl,
  onRetry,
  basePath,
}: {
  result: PreflightResult;
  repoUrl: string;
  onRetry: () => void;
  basePath: string;
}) {
  const criticalCriteria = result.criteria.slice(0, CRITICAL_CRITERIA_COUNT);
  const advisoryCriteria = result.criteria.slice(CRITICAL_CRITERIA_COUNT);

  const criticalPassed = criticalCriteria.filter((c) => c.passed).length;
  const advisoryPassed = advisoryCriteria.filter((c) => c.passed).length;

  const statusConfig = {
    passed: {
      icon: <CheckCircle size={32} weight="fill" />,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "Passed",
      description: "Your component passes all critical checks and is ready for submission.",
    },
    failed: {
      icon: <XCircle size={32} weight="fill" />,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      label: "Failed",
      description: "Your component has critical issues that need to be fixed before submission.",
    },
    partial: {
      icon: <Warning size={32} weight="fill" />,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      label: "Partial",
      description: "Some checks could not be completed. Review the details below.",
    },
    error: {
      icon: <XCircle size={32} weight="fill" />,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      label: "Error",
      description: "An error occurred during the check. Please try again.",
    },
  };

  const config = statusConfig[result.status];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
        <div className="flex items-start gap-3">
          <div className={config.color}>{config.icon}</div>
          <div className="flex-1">
            <h2 className={`text-lg font-medium ${config.color}`}>{config.label}</h2>
            <p className="text-sm text-text-secondary mt-1">{config.description}</p>
            {result.cached && (
              <p className="text-xs text-text-tertiary mt-2">
                Cached result from {new Date(result.cachedAt!).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="bg-white border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2">Summary</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{result.summary}</p>
        </div>
      )}

      {/* Critical Checks */}
      {criticalCriteria.length > 0 && (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-bg-card border-b border-border">
            <h3 className="text-sm font-medium text-text-primary">
              Critical Requirements ({criticalPassed}/{CRITICAL_CRITERIA_COUNT} passed)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              All critical requirements must pass for your component to be accepted.
            </p>
          </div>
          <div className="divide-y divide-border">
            {criticalCriteria.map((criterion, index) => (
              <CriterionRow key={index} criterion={criterion} />
            ))}
          </div>
        </div>
      )}

      {/* Advisory Checks */}
      {advisoryCriteria.length > 0 && (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-bg-card border-b border-border">
            <h3 className="text-sm font-medium text-text-primary">
              Suggested Improvements ({advisoryPassed}/{advisoryCriteria.length} passed)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              These are recommendations that improve your component but are not required.
            </p>
          </div>
          <div className="divide-y divide-border">
            {advisoryCriteria.map((criterion, index) => (
              <CriterionRow key={index} criterion={criterion} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRetry}
          className="flex-1 px-6 py-3 rounded-full font-normal border border-border text-text-primary hover:bg-bg-hover transition-colors text-sm flex items-center justify-center gap-2">
          <ArrowLeft size={18} />
          Check Another Repo
        </button>
        <a
          href={`${basePath}/submit`}
          className="flex-1 px-6 py-3 rounded-full font-normal bg-button text-white hover:bg-button-hover transition-colors text-sm flex items-center justify-center gap-2">
          Continue to Submit
          <ArrowRight size={18} />
        </a>
      </div>

      {/* Rate limit info */}
      {result.remaining !== undefined && (
        <p className="text-xs text-text-tertiary text-center">
          {result.remaining} preflight checks remaining this hour
        </p>
      )}
    </div>
  );
}

// Individual criterion row
function CriterionRow({ criterion }: { criterion: PreflightCriterion }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 text-left">
        <div className="shrink-0 mt-0.5">
          {criterion.passed ? (
            <CheckCircle size={18} weight="fill" className="text-green-600" />
          ) : (
            <XCircle size={18} weight="fill" className="text-red-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{criterion.name}</p>
          {isExpanded && (
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{criterion.notes}</p>
          )}
        </div>
        <div className="shrink-0 text-text-secondary">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
