import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth";
import { useConnectAuth } from "../lib/connectAuth";
import { buildNpmUrl, parseNpmPackageInput } from "../lib/npmPackage";
import Header from "../components/Header";
import {
  CheckCircle,
  XCircle,
  Warning,
  ArrowRight,
  Spinner,
  Package,
  ArrowLeft,
  Info,
  UserCircle,
  SignIn,
} from "@phosphor-icons/react";
import { RepoHostIcon } from "../components/RepoHostIcon";
import { isSupportedRepoUrl, parseRepoUrl } from "../../shared/repoUrl";

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
  guest?: boolean;
  error?: string;
  // Folder and branch the review read ("root" is the repo root)
  reviewedPath?: string;
  reviewedRef?: string;
  // Package folder URL to submit instead, when a monorepo root URL was checked
  suggestedRepoUrl?: string;
}

// Fix URLs returned with a 422 when the URL doesn't resolve to one component
interface PreflightSuggestion {
  label: string;
  url: string;
}

function displayPath(path: string): string {
  return path === "root" || path === "" ? "repo root" : path;
}

// Send signed out visitors to login and bring them back to the checker
function signInHere(signIn: () => Promise<void> | void) {
  localStorage.setItem("authReturnPath", window.location.pathname);
  void signIn();
}

// Critical criteria (indices 0-7) vs advisory (indices 8-11)
const CRITICAL_CRITERIA_COUNT = 8;

export default function SubmitCheck() {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const { getAccessToken } = useConnectAuth();
  // Admins (@convex.dev) bypass the rate limit and cache on the backend
  const isAdmin = useQuery(api.auth.isAdmin) ?? false;
  // Guest availability and limits (admin kill switch lives in AI Review Settings)
  const access = useQuery(api.packages.getPreflightAccess);
  const isGuest = !authLoading && !isAuthenticated;
  const [repoUrl, setRepoUrl] = useState("");
  const [npmPackageName, setNpmPackageName] = useState("");
  // Honeypot: hidden from people, bots that fill every field get rejected
  const [website, setWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorNeedsSignIn, setErrorNeedsSignIn] = useState(false);
  const [suggestions, setSuggestions] = useState<PreflightSuggestion[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  // Local parse only, so the branch and folder hint updates as you type
  const parsedRepo = parseRepoUrl(repoUrl.trim());

  // Validate inputs then open the usage warning modal
  const handleOpenWarning = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorNeedsSignIn(false);
    setSuggestions([]);
    setResult(null);

    if (!repoUrl.trim()) {
      setError("Please enter a GitHub or GitLab repository URL");
      return;
    }

    if (!isSupportedRepoUrl(repoUrl.trim())) {
      setError(
        "Please enter a valid GitHub or GitLab repository URL (e.g., https://github.com/owner/repo or https://gitlab.com/owner/repo)"
      );
      return;
    }

    setShowWarning(true);
  };

  // Runs the preflight check after the user confirms the warning modal
  const runPreflightCheck = async () => {
    setError(null);
    setErrorNeedsSignIn(false);
    setSuggestions([]);
    setIsLoading(true);

    try {
      // Signed in users send their token; guests call without one
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isAuthenticated) {
        const token = await getAccessToken();
        if (!token) {
          setError("Authentication required. Please sign in to use the preflight checker.");
          return;
        }
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_CONVEX_URL?.replace(".cloud", ".site")}/api/preflight`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            repoUrl: repoUrl.trim(),
            npmUrl: npmPackageName.trim() ? buildNpmUrl(npmPackageName) : undefined,
            ...(isAuthenticated ? {} : { website }),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorNeedsSignIn(!isAuthenticated && data.requiresSignIn === true);
        if (response.status === 401) {
          setError("Authentication required. Please sign in to use the preflight checker.");
        } else if (response.status === 429) {
          setError(data.error || "Rate limit exceeded. Please try again later.");
        } else if (response.status === 422) {
          // The URL didn't resolve to one component; offer the fix URLs
          setError(data.error || "We couldn't find a Convex component at that URL.");
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
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
      setShowWarning(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setErrorNeedsSignIn(false);
    setSuggestions([]);
  };

  // Swap in a suggested folder URL and reopen the confirmation modal
  const checkSuggestion = (url: string) => {
    setRepoUrl(url);
    setError(null);
    setSuggestions([]);
    setShowWarning(true);
  };

  // Wait for auth, and for guests the access settings, so the form never flashes
  if (authLoading || (isGuest && access === undefined)) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Spinner size={24} className="animate-spin text-text-secondary" />
            <span className="ml-3 text-text-secondary">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const guestPaused = isGuest && access?.guestEnabled === false;

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

        {/* Guest mode notice with sign in upgrade */}
        {isGuest && !guestPaused && access && !result && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 px-4 py-3 rounded-lg border border-border bg-bg-card">
            <UserCircle size={20} className="text-text-secondary shrink-0 hidden sm:block" />
            <p className="flex-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Testing as a guest.</span>{" "}
              {access.guestLimitPerHour} checks per hour per network. Sign in for{" "}
              {access.signedInLimitPerHour} per hour.
            </p>
            <button
              type="button"
              onClick={() => signInHere(signIn)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-normal border border-border text-text-primary hover:bg-bg-hover transition-colors shrink-0">
              <SignIn size={14} />
              Sign in
            </button>
          </div>
        )}

        {/* Form, paused guest notice, or Results */}
        {guestPaused ? (
          <div className="bg-white border border-border rounded-lg p-6 text-center">
            <UserCircle size={32} className="mx-auto text-text-secondary" />
            <h2 className="mt-3 text-base font-medium text-text-primary">
              Sign in to run a preflight check
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Guest checks are paused right now. Signed in accounts get{" "}
              {access?.signedInLimitPerHour ?? 10} checks per hour.
            </p>
            <button
              type="button"
              onClick={() => signInHere(signIn)}
              className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
              <SignIn size={16} />
              Sign in
            </button>
          </div>
        ) : !result ? (
          <div className="bg-white border border-border rounded-lg p-6">
            <form onSubmit={handleOpenWarning} className="relative space-y-4">
              {/* Honeypot field, off screen and skipped by keyboard and screen readers */}
              {isGuest && (
                <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </label>
                </div>
              )}
              {/* Repository URL (GitHub or GitLab); the icon follows the host as you type */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Repository URL <span className="text-red-500">*</span>
                  <span className="ml-1.5 text-xs font-normal text-text-secondary">GitHub or GitLab</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    <RepoHostIcon repositoryUrl={repoUrl} size={18} />
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
                <p className="text-xs text-text-tertiary mt-1">
                  {parsedRepo && (parsedRepo.ref || parsedRepo.dir) ? (
                    <>
                      Checking{" "}
                      <code className="font-mono text-text-secondary">{displayPath(parsedRepo.dir)}</code>
                      {parsedRepo.ref && (
                        <>
                          {" "}
                          on branch <code className="font-mono text-text-secondary">{parsedRepo.ref}</code>
                        </>
                      )}
                    </>
                  ) : (
                    "Monorepo? Paste the folder URL, for example https://github.com/owner/repo/tree/main/packages/your-component"
                  )}
                </p>
              </div>

              {/* npm package name (optional, URL is built from it) */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  npm package name{" "}
                  <span className="text-text-secondary text-xs font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    <Package size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="@your-scope/your-package"
                    value={npmPackageName}
                    onChange={(e) => setNpmPackageName(parseNpmPackageInput(e.target.value))}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Provide if your package is already published to include its name in the review. In a
                  monorepo it also picks the matching package.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{error}</p>
                    {suggestions.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {suggestions.map((suggestion) => (
                          <li
                            key={suggestion.url}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/70 border border-red-100 px-2.5 py-1.5">
                            <a
                              href={suggestion.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 break-all text-sm text-red-800 underline underline-offset-2 hover:text-red-900">
                              {suggestion.label}
                            </a>
                            <button
                              type="button"
                              onClick={() => checkSuggestion(suggestion.url)}
                              className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-button text-white hover:bg-button-hover transition-colors">
                              Check this one
                              <ArrowRight size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {errorNeedsSignIn && (
                      <button
                        type="button"
                        onClick={() => signInHere(signIn)}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800">
                        <SignIn size={14} />
                        Sign in to keep going
                      </button>
                    )}
                  </div>
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
            onUseRepoUrl={setRepoUrl}
            onRetry={handleRetry}
            basePath={basePath}
          />
        )}
      </div>

      {/* Usage warning shown before the check runs */}
      {showWarning && (
        <PreflightWarningModal
          onClose={() => setShowWarning(false)}
          onConfirm={() => void runPreflightCheck()}
          isLoading={isLoading}
          isAdmin={isAdmin}
          guestLimitPerHour={isGuest ? access?.guestLimitPerHour : undefined}
        />
      )}
    </div>
  );
}

// Confirmation modal that surfaces the rate limit and cache behavior
function PreflightWarningModal({
  onClose,
  onConfirm,
  isLoading,
  isAdmin,
  guestLimitPerHour,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  // Set only for signed out visitors
  guestLimitPerHour?: number;
}) {
  // Close on ESC unless a request is in flight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isLoading]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="relative w-full max-w-md p-6 rounded-lg bg-white border border-border shadow-lg">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-3 right-3 p-1 rounded-full text-text-secondary hover:bg-bg-hover disabled:opacity-50">
          <XCircle size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-amber-600">
            <Warning size={22} weight="fill" />
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Run preflight check</h3>
              <p className="mt-1 text-sm text-text-secondary">
                {isAdmin
                  ? "This analysis checks your repository against Convex component requirements. As an admin you have no rate limit and every run is fresh, bypassing the 30 minute cache."
                  : guestLimitPerHour !== undefined
                    ? `This analysis checks your repository against Convex component requirements. As a guest you get ${guestLimitPerHour} checks per hour per network, and one check at a time. Results for the same repository are cached for 30 minutes, so re-running within that window returns the cached result and does not count against your limit.`
                    : "This analysis checks your repository against Convex component requirements. It is limited to 10 checks per hour per IP. Results for the same repository are cached for 30 minutes, so re-running within that window returns the cached result and does not count against your limit."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <>
                    <Spinner size={14} className="animate-spin mr-2" />
                    Running...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Results component
function PreflightResults({
  result,
  repoUrl,
  onUseRepoUrl,
  onRetry,
  basePath,
}: {
  result: PreflightResult;
  repoUrl: string;
  onUseRepoUrl: (url: string) => void;
  onRetry: () => void;
  basePath: string;
}) {
  const suggestedUrl = result.suggestedRepoUrl;
  const suggestedFolder = suggestedUrl ? parseRepoUrl(suggestedUrl)?.dir : undefined;
  const usingSuggestedUrl = suggestedUrl !== undefined && repoUrl.trim() === suggestedUrl;
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
            {result.reviewedPath && (
              <p className="text-xs text-text-secondary mt-2">
                Reviewed{" "}
                <code className="font-mono text-text-primary">{displayPath(result.reviewedPath)}</code>
                {result.reviewedRef && (
                  <>
                    {" "}
                    on <code className="font-mono text-text-primary">{result.reviewedRef}</code>
                  </>
                )}
              </p>
            )}
            {result.cached && (
              <p className="text-xs text-text-tertiary mt-2">
                Cached result from {new Date(result.cachedAt!).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Monorepo tip: submit the package folder, not the repo root */}
      {suggestedUrl && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 text-sm text-blue-800">
              <p className="font-medium">
                {usingSuggestedUrl ? "Submitting with the folder URL" : "Tip: submit the folder URL"}
              </p>
              <p className="mt-1 text-blue-700">
                Your component lives in{" "}
                <code className="font-mono">{suggestedFolder || "a subfolder"}</code>. Use the folder URL
                when you submit so the directory shows your component's own README, and its links and
                images resolve from the right folder.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={suggestedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-all font-mono text-xs text-blue-800 underline underline-offset-2 hover:text-blue-900">
                  {suggestedUrl}
                </a>
                {usingSuggestedUrl ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <CheckCircle size={14} weight="fill" />
                    Continue to Submit will use this URL
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUseRepoUrl(suggestedUrl)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-button text-white hover:bg-button-hover transition-colors">
                    Use folder URL
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
          href={`${basePath}/submit?repoUrl=${encodeURIComponent(repoUrl.trim())}`}
          className="flex-1 px-6 py-3 rounded-full font-normal bg-button text-white hover:bg-button-hover transition-colors text-sm flex items-center justify-center gap-2">
          Continue to Submit
          <ArrowRight size={18} />
        </a>
      </div>

      {/* Rate limit info */}
      {result.remaining !== undefined && (
        <p className="text-xs text-text-tertiary text-center">
          {result.remaining} {result.guest ? "guest " : ""}preflight{" "}
          {result.remaining === 1 ? "check" : "checks"} remaining this hour
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
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">
              {criterion.notes}
            </p>
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
