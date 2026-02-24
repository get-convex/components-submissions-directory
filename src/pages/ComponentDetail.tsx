// Component detail page at /components/:slug
// Layout: wide sidebar left with thumbnail + metadata, content right
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { InstallCommand } from "../components/InstallCommand";
import { VerifiedBadge } from "../components/VerifiedBadge";
import Header from "../components/Header";
import { useDirectoryCategories, getCategoryLabel } from "../lib/categories";
import {
  setComponentSeoTags,
  injectJsonLd,
  buildComponentJsonLd,
} from "../lib/seo";
import {
  ArrowLeftIcon,
  GitHubLogoIcon,
  ExternalLinkIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  FileTextIcon,
  ClipboardIcon,
  EyeOpenIcon,
} from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface ComponentDetailProps {
  slug: string;
}

// Build a full markdown document from component data (includes AI SEO content)
function buildMarkdownDoc(c: {
  name: string;
  componentName?: string;
  description: string;
  shortDescription?: string;
  installCommand: string;
  repositoryUrl?: string;
  npmUrl: string;
  longDescription?: string;
  slug?: string;
  version: string;
  weeklyDownloads: number;
  authorUsername?: string;
  category?: string;
  tags?: string[];
  seoValueProp?: string;
  seoBenefits?: string[];
  seoUseCases?: { query: string; answer: string }[];
  seoFaq?: { question: string; answer: string }[];
  seoResourceLinks?: { label: string; url: string }[];
  seoGenerationStatus?: string;
}): string {
  const lines: string[] = [];
  lines.push(`# ${c.componentName || c.name}\n`);
  if (c.shortDescription) lines.push(`${c.shortDescription}\n`);

  lines.push(`## Install\n`);
  lines.push("```bash");
  lines.push(c.installCommand);
  lines.push("```\n");

  lines.push(`## Links\n`);
  lines.push(`- [npm package](${c.npmUrl})`);
  if (c.repositoryUrl) lines.push(`- [GitHub repository](${c.repositoryUrl})`);
  if (c.slug)
    lines.push(`- [Convex Components Directory](https://www.convex.dev/components/${c.slug})`);
  lines.push("");

  if (c.authorUsername) lines.push(`**Author:** ${c.authorUsername}\n`);
  if (c.category) lines.push(`**Category:** ${getCategoryLabel(c.category)}\n`);
  lines.push(`**Version:** ${c.version}  `);
  lines.push(`**Weekly downloads:** ${c.weeklyDownloads.toLocaleString()}\n`);

  if (c.tags && c.tags.length > 0) {
    lines.push(`**Tags:** ${c.tags.join(", ")}\n`);
  }

  // AI-generated SEO content (if available)
  if (c.seoGenerationStatus === "completed") {
    if (c.seoValueProp) {
      lines.push(`---\n`);
      lines.push(`> ${c.seoValueProp}\n`);
    }
    if (c.seoBenefits && c.seoBenefits.length > 0) {
      lines.push(`## Benefits\n`);
      for (const b of c.seoBenefits) lines.push(`- ${b}`);
      lines.push("");
    }
    if (c.seoUseCases && c.seoUseCases.length > 0) {
      lines.push(`## Use cases\n`);
      for (const uc of c.seoUseCases) {
        lines.push(`### ${uc.query}\n`);
        lines.push(`${uc.answer}\n`);
      }
    }
    if (c.seoFaq && c.seoFaq.length > 0) {
      lines.push(`## FAQ\n`);
      for (const faq of c.seoFaq) {
        lines.push(`**Q: ${faq.question}**\n`);
        lines.push(`${faq.answer}\n`);
      }
    }
    if (c.seoResourceLinks && c.seoResourceLinks.length > 0) {
      lines.push(`## Resources\n`);
      for (const link of c.seoResourceLinks) {
        lines.push(`- [${link.label}](${link.url})`);
      }
      lines.push("");
    }
  }

  if (c.longDescription) {
    lines.push(`---\n`);
    lines.push(c.longDescription);
  }

  // Badge disabled until endpoint is working
  // if (c.slug) {
  //   lines.push(`\n---\n`);
  //   lines.push(
  //     `[![Convex Component](https://www.convex.dev/components/badge/${c.slug})](https://www.convex.dev/components/${c.slug})`
  //   );
  // }

  return lines.join("\n");
}

// npm logo base path (works with Vite base path)
const npmLogoSrc = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/npm.svg";

// Generate a stable anonymous session ID for rating
function getSessionId(): string {
  const key = "convex_components_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// Star rating component
function StarRating({
  packageId,
}: {
  packageId: string;
}) {
  const rating = useQuery(api.packages.getComponentRating, {
    packageId: packageId as any,
  });
  const submitRating = useMutation(api.packages.rateComponent);
  const [hovered, setHovered] = useState(0);
  const sessionId = useMemo(() => getSessionId(), []);

  const handleRate = async (value: number) => {
    try {
      await submitRating({
        packageId: packageId as any,
        rating: value,
        sessionId,
      });
    } catch {
      // Silent fail
    }
  };

  if (!rating) return null;

  return (
    <div>
      <p className="text-xs font-medium text-text-primary mb-1.5">Rating</p>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleRate(star)}
              className="p-0 border-0 bg-transparent cursor-pointer transition-transform hover:scale-110"
              title={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            >
              <svg
                viewBox="0 0 20 20"
                className="w-4 h-4"
                fill={star <= (hovered || Math.round(rating.average)) ? "rgb(243, 176, 28)" : "none"}
                stroke={star <= (hovered || Math.round(rating.average)) ? "rgb(243, 176, 28)" : "currentColor"}
                strokeWidth="1.5"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        <span className="text-sm font-medium text-text-primary">
          {rating.average > 0 ? rating.average.toFixed(1) : ""}
        </span>
        {rating.count > 0 && (
          <span className="text-xs text-text-secondary">
            ({rating.count})
          </span>
        )}
      </div>
    </div>
  );
}

// GitHub issue shape (matches backend validator)
interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  user?: string;
  labels: string[];
  comments: number;
}

export default function ComponentDetail({ slug }: ComponentDetailProps) {
  const component = useQuery(api.packages.getComponentBySlug, { slug });
  const dynamicCategories = useDirectoryCategories();
  const getDynamicCategoryLabel = (id: string) =>
    dynamicCategories.find((c) => c.id === id)?.label || id;
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [pageCopied, setPageCopied] = useState(false);
  const [mdCopied, setMdCopied] = useState(false);
  const [skillCopied, setSkillCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // GitHub issues state
  const [showIssues, setShowIssues] = useState(false);
  const [issueFilter, setIssueFilter] = useState<"open" | "closed">("open");
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesHasMore, setIssuesHasMore] = useState(false);
  const [issuesPage, setIssuesPage] = useState(1);
  const fetchGitHubIssues = useAction(api.packages.fetchGitHubIssues);
  const refreshIssueCounts = useAction(api.packages.refreshGitHubIssueCounts);
  const issueCountRefreshed = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Set SEO meta tags + JSON-LD structured data (SoftwareSourceCode + FAQPage)
  useEffect(() => {
    if (component) {
      const displayName = component.componentName || component.name;
      const canonicalUrl = `https://www.convex.dev/components/${component.slug || ""}`;
      // Prefer AI-generated value prop for meta description
      const metaDesc =
        component.seoValueProp ||
        component.shortDescription ||
        component.description ||
        "";

      // Set all SEO tags: title, description, OG, Twitter cards, canonical URL
      setComponentSeoTags({
        title: displayName,
        description: metaDesc,
        url: canonicalUrl,
        image: component.thumbnailUrl,
      });

      // Inject dual JSON-LD: SoftwareSourceCode + FAQPage (if FAQ exists)
      const jsonLd = buildComponentJsonLd({
        name: displayName,
        description: metaDesc,
        url: canonicalUrl,
        repositoryUrl: component.repositoryUrl,
        npmUrl: component.npmUrl,
        version: component.version,
        license: component.license,
        authorName: component.authorUsername,
        installCommand: component.installCommand,
        faq: component.seoFaq,
      });
      injectJsonLd(jsonLd);
    }
  }, [component]);

  // Refresh GitHub issue counts once per page load (if stale or missing)
  useEffect(() => {
    if (!component || !component.repositoryUrl || issueCountRefreshed.current) return;
    // Refresh if never fetched or older than 1 hour
    const oneHour = 60 * 60 * 1000;
    const isStale =
      !component.githubIssuesFetchedAt ||
      Date.now() - component.githubIssuesFetchedAt > oneHour;
    if (isStale) {
      issueCountRefreshed.current = true;
      refreshIssueCounts({ packageId: component._id }).catch(() => {
        // Silent fail for count refresh
      });
    }
  }, [component, refreshIssueCounts]);

  // Fetch issues when the issues tab is opened or filter/page changes
  const loadIssues = useCallback(
    async (state: "open" | "closed", page: number, append = false) => {
      if (!component?.repositoryUrl) return;
      setIssuesLoading(true);
      try {
        const result = await fetchGitHubIssues({
          repositoryUrl: component.repositoryUrl,
          state,
          page,
        });
        setIssues((prev) => (append ? [...prev, ...result.issues] : result.issues));
        setIssuesHasMore(result.hasMore);
      } catch {
        setIssues([]);
        setIssuesHasMore(false);
      } finally {
        setIssuesLoading(false);
      }
    },
    [component?.repositoryUrl, fetchGitHubIssues],
  );

  // Load issues when tab opens or filter changes
  useEffect(() => {
    if (showIssues && component?.repositoryUrl) {
      setIssuesPage(1);
      loadIssues(issueFilter, 1);
    }
  }, [showIssues, issueFilter, component?.repositoryUrl, loadIssues]);

  // Load more issues handler
  const handleLoadMoreIssues = () => {
    const nextPage = issuesPage + 1;
    setIssuesPage(nextPage);
    loadIssues(issueFilter, nextPage, true);
  };

  const basePath = window.location.pathname.startsWith("/components") ? "/components/" : "/";

  const badgeMarkdown = component?.slug
    ? `[![Convex Component](https://www.convex.dev/components/badge/${component.slug})](https://www.convex.dev/components/${component.slug})`
    : "";
  const badgeImageUrl = component?.slug
    ? `https://www.convex.dev/components/badge/${component.slug}`
    : "";
  const badgeTargetUrl = component?.slug
    ? `https://www.convex.dev/components/${component.slug}`
    : "";

  const handleCopyBadge = async () => {
    try {
      await navigator.clipboard.writeText(badgeMarkdown);
      setBadgeCopied(true);
      setTimeout(() => setBadgeCopied(false), 2000);
    } catch {}
  };

  const handleCopySkill = async () => {
    if (!component?.skillMd) return;
    try {
      await navigator.clipboard.writeText(component.skillMd);
      setSkillCopied(true);
      setTimeout(() => setSkillCopied(false), 2000);
    } catch {}
  };

  const authorGitHubUrl = component?.authorUsername
    ? `https://github.com/${component.authorUsername}`
    : null;

  // Generate full markdown doc
  const markdownDoc = component ? buildMarkdownDoc(component) : "";

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownDoc);
      setPageCopied(true);
      setCopyMenuOpen(false);
      setTimeout(() => setPageCopied(false), 2000);
    } catch {}
  };

  // Copy markdown from the source view block
  const handleCopyMdInline = async () => {
    try {
      await navigator.clipboard.writeText(markdownDoc);
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 2000);
    } catch {}
  };

  const handleCopyPageUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setPageCopied(true);
      setCopyMenuOpen(false);
      setTimeout(() => setPageCopied(false), 2000);
    } catch {}
  };

  // Loading state
  if (component === undefined) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-bg-secondary rounded w-48" />
            <div className="h-4 bg-bg-secondary rounded w-96" />
            <div className="h-64 bg-bg-secondary rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (component === null) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-4xl font-light text-text-primary mb-2">404</h1>
            <p className="text-text-secondary mb-4">Component not found</p>
            <a
              href={basePath}
              className="text-sm font-medium underline text-text-primary hover:text-text-secondary">
              Back to Components
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="component-detail-page min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-6xl mx-auto pl-4 pr-4 sm:pl-8 sm:pr-6 py-6">
        {/* 2-column layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left sidebar: thumbnail + metadata */}
          <aside className="w-full lg:w-[240px] shrink-0 space-y-5 order-2 lg:order-1 lg:sticky lg:top-6 lg:self-start">
            {/* Thumbnail inside sidebar */}
            {component.thumbnailUrl && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={component.thumbnailUrl}
                  alt={component.name}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            {/* Component name with repo link */}
            {component.repositoryUrl ? (
              <a
                href={component.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base font-bold text-text-primary hover:underline">
                {component.name}
              </a>
            ) : (
              <span className="block text-base font-bold text-text-primary">
                {component.name}
              </span>
            )}

            {/* Verified */}
            {component.convexVerified && <VerifiedBadge size="md" />}

            {/* Stats */}
            <div className="space-y-1.5 text-sm text-text-secondary">
              <div className="flex items-center gap-1.5">
                <DownloadIcon className="w-3.5 h-3.5" />
                {component.weeklyDownloads.toLocaleString()} / week
              </div>
            </div>

            {/* Source link */}
            {component.repositoryUrl && (
              <a
                href={component.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-text-primary hover:underline">
                <GitHubLogoIcon className="w-4 h-4" />
                View Repo
                <ExternalLinkIcon className="w-3 h-3 text-text-secondary" />
              </a>
            )}
            {/* npm link with real npm logo */}
            <a
              href={component.npmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-text-primary hover:underline">
              <img src={npmLogoSrc} alt="npm" className="w-4 h-4 shrink-0" />
              View package
            </a>

            {/* Demo link */}
            {component.demoUrl && (
              <a
                href={component.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-text-primary hover:underline">
                <ExternalLinkIcon className="w-4 h-4" />
                Live demo
              </a>
            )}

            {/* Category -- bordered pill with hover */}
            {component.category && (
              <div>
                <p className="text-xs font-medium text-text-primary mb-1.5">Category</p>
                <span className="inline-block text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-primary hover:bg-bg-hover hover:border-text-secondary transition-colors cursor-default">
                  {getDynamicCategoryLabel(component.category)}
                </span>
              </div>
            )}

            {/* Rating stars */}
            <StarRating packageId={component._id} />

            {/* Back to Components (bottom of sidebar) */}
            <a
              href={basePath}
              className="hidden lg:inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors pt-2">
              <ArrowLeftIcon className="w-3 h-3" />
              Back to Components
            </a>
          </aside>

          {/* Right main content */}
          <main className="flex-1 min-w-0 order-1 lg:order-2">
            {/* Component title (componentName or fallback to name) */}
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {component.componentName || component.name}
            </h1>
            {/* Short description */}
            <p className="text-sm text-text-secondary mb-4">
              {component.shortDescription || component.description}
            </p>

            {/* npm package name + author row */}
            <div className="flex items-center gap-3 mb-4">
              <a
                href={
                  component.repositoryUrl ||
                  `https://github.com/${component.authorUsername}/${component.name}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-text-secondary hover:text-text-primary hover:underline">
                {component.name}
              </a>
              {component.authorUsername && (
                <>
                  <span className="text-text-secondary/40">|</span>
                  <span className="text-sm text-text-secondary">Made by</span>
                  <a
                    href={authorGitHubUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 group">
                    {component.authorAvatar && (
                      <img
                        src={component.authorAvatar}
                        alt={component.authorUsername}
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-text-primary group-hover:underline">
                      {component.authorUsername}
                    </span>
                  </a>
                </>
              )}

              {/* Markdown dropdown */}
              <span className="text-text-secondary/40">|</span>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setCopyMenuOpen(!copyMenuOpen)}
                  className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
                  {pageCopied ? (
                    <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <ClipboardIcon className="w-3.5 h-3.5" />
                  )}
                  {pageCopied ? "Copied" : "Markdown"}
                  <ChevronDownIcon className="w-3 h-3" />
                </button>

                {copyMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-52 rounded-lg bg-white shadow-hover py-1 z-20">
                    <button
                      onClick={() => {
                        setShowMarkdown(!showMarkdown);
                        setCopyMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors text-left">
                      <EyeOpenIcon className="w-3.5 h-3.5 text-text-secondary" />
                      {showMarkdown ? "View rendered" : "View as Markdown"}
                    </button>
                    <button
                      onClick={handleCopyMarkdown}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors text-left">
                      <FileTextIcon className="w-3.5 h-3.5 text-text-secondary" />
                      Copy as Markdown
                    </button>
                    <button
                      onClick={handleCopyPageUrl}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors text-left">
                      <CopyIcon className="w-3.5 h-3.5 text-text-secondary" />
                      Copy page URL
                    </button>
                  </div>
                )}
              </div>

              {/* GitHub issues badge - commented out
              {component.repositoryUrl && (
                <>
                  <span className="text-text-secondary/40">|</span>
                  <button
                    onClick={() => setShowIssues(!showIssues)}
                    className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                      showIssues
                        ? "text-text-primary font-medium"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                    title={`${component.githubOpenIssues ?? 0} open issues`}>
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      aria-hidden="true">
                      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                    </svg>
                    Issues ({component.githubOpenIssues ?? 0})
                  </button>
                </>
              )}
              */}
            </div>

            {/* Install command */}
            <div className="mb-6">
              <InstallCommand command={component.installCommand} />
            </div>

            {/* GitHub Issues panel - commented out
            {showIssues && component.repositoryUrl && (
              <section
                aria-label={`GitHub Issues for ${component.componentName || component.name}`}
                className="mb-6">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-bg-secondary px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setIssueFilter("open")}
                        className={`text-sm font-medium transition-colors ${
                          issueFilter === "open"
                            ? "text-text-primary"
                            : "text-text-secondary hover:text-text-primary"
                        }`}>
                        <span className="inline-flex items-center gap-1.5">
                          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                          </svg>
                          {component.githubOpenIssues ?? 0} Open
                        </span>
                      </button>
                      <button
                        onClick={() => setIssueFilter("closed")}
                        className={`text-sm font-medium transition-colors ${
                          issueFilter === "closed"
                            ? "text-text-primary"
                            : "text-text-secondary hover:text-text-primary"
                        }`}>
                        <span className="inline-flex items-center gap-1.5">
                          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                            <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
                          </svg>
                          {component.githubClosedIssues ?? 0} Closed
                        </span>
                      </button>
                    </div>
                    <a
                      href={`${component.repositoryUrl}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1">
                      View on GitHub
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="divide-y divide-border">
                    {issuesLoading && issues.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="inline-block w-5 h-5 border-2 border-text-secondary/30 border-t-text-primary rounded-full animate-spin" />
                        <p className="text-sm text-text-secondary mt-2">Loading issues...</p>
                      </div>
                    ) : issues.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-text-secondary">
                          No {issueFilter} issues found.
                        </p>
                      </div>
                    ) : (
                      issues.map((issue) => (
                        <a
                          key={issue.number}
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors group">
                          {issue.state === "open" ? (
                            <svg viewBox="0 0 16 16" className="w-4 h-4 mt-0.5 text-green-600 shrink-0" fill="currentColor">
                              <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 16 16" className="w-4 h-4 mt-0.5 text-purple-600 shrink-0" fill="currentColor">
                              <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
                              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
                            </svg>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary group-hover:text-[rgb(33,34,181)] transition-colors">
                              {issue.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-text-secondary">
                                #{issue.number}
                              </span>
                              {issue.user && (
                                <span className="text-xs text-text-secondary">
                                  by {issue.user}
                                </span>
                              )}
                              <span className="text-xs text-text-secondary">
                                {new Date(issue.created_at).toLocaleDateString()}
                              </span>
                              {issue.comments > 0 && (
                                <span className="text-xs text-text-secondary inline-flex items-center gap-0.5">
                                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                                    <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
                                  </svg>
                                  {issue.comments}
                                </span>
                              )}
                              {issue.labels.slice(0, 3).map((label) => (
                                <span
                                  key={label}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ExternalLinkIcon className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                        </a>
                      ))
                    )}
                  </div>

                  {issuesHasMore && !issuesLoading && (
                    <div className="px-4 py-3 border-t border-border bg-bg-secondary text-center">
                      <button
                        onClick={handleLoadMoreIssues}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                        Load more issues...
                      </button>
                    </div>
                  )}
                  {issuesLoading && issues.length > 0 && (
                    <div className="px-4 py-3 border-t border-border bg-bg-secondary text-center">
                      <div className="inline-block w-4 h-4 border-2 border-text-secondary/30 border-t-text-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </section>
            )}
            */}

            {/* Long description title (below install command) */}
            {component.longDescription && (
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                {component.componentName || component.name} Description
              </h2>
            )}

            {/* Markdown source view toggle */}
            {showMarkdown ? (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-secondary uppercase tracking-wider">
                    Markdown source
                  </span>
                  <button
                    onClick={() => setShowMarkdown(false)}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                    View rendered
                  </button>
                </div>
                <div className="relative rounded-lg bg-[#1a1a1a] text-gray-300">
                  <button
                    onClick={handleCopyMdInline}
                    className="absolute top-3 right-3 p-1.5 rounded hover:bg-white/10 transition-colors"
                    title={mdCopied ? "Copied" : "Copy Markdown"}>
                    {mdCopied ? (
                      <CheckIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <CopyIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <pre className="p-4 pr-12 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                    {markdownDoc}
                  </pre>
                </div>
              </div>
            ) : (
              <>
                {/* Long description markdown content */}
                {component.longDescription && (
                  <div className="prose prose-sm max-w-none text-text-primary prose-headings:text-text-primary prose-a:text-[rgb(33,34,181)] prose-code:text-sm prose-code:bg-bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#1a1a1a] prose-pre:text-gray-300 prose-p:mb-4 prose-p:leading-relaxed mb-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {component.longDescription}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Divider before AI SEO content */}
                {component.seoGenerationStatus === "completed" && (
                  <hr className="border-border mb-6" />
                )}

                {/* AI-generated SEO/AEO/GEO structured content (visible for search engines) */}
                {component.seoGenerationStatus === "completed" && (
                  <div className="mb-6 space-y-6">
                    {/* Value prop highlight */}
                    {component.seoValueProp && (
                      <p className="text-base text-text-primary leading-relaxed border-l-2 border-border pl-4 italic">
                        {component.seoValueProp}
                      </p>
                    )}

                    {/* Benefits block */}
                    {component.seoBenefits && component.seoBenefits.length > 0 && (
                      <section>
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-2">
                          Benefits
                        </h2>
                        <ul className="space-y-1.5">
                          {component.seoBenefits.map((benefit: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-text-secondary">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-text-secondary shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* Use cases (visible section for SEO) */}
                    {component.seoUseCases && component.seoUseCases.length > 0 && (
                      <section>
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
                          Use cases
                        </h2>
                        <div className="space-y-4">
                          {component.seoUseCases.map(
                            (uc: { query: string; answer: string }, i: number) => (
                              <div key={i}>
                                <h3 className="text-sm font-medium text-text-primary mb-1">
                                  {uc.query}
                                </h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                  {uc.answer}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    )}

                    {/* FAQ (visible section for SEO/AEO rich snippets) */}
                    {component.seoFaq && component.seoFaq.length > 0 && (
                      <section>
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
                          FAQ
                        </h2>
                        <div className="space-y-4">
                          {component.seoFaq.map(
                            (faq: { question: string; answer: string }, i: number) => (
                              <div key={i}>
                                <h3 className="text-sm font-medium text-text-primary mb-1">
                                  {faq.question}
                                </h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    )}

                    {/* Resource links as bullet list */}
                    {component.seoResourceLinks &&
                      component.seoResourceLinks.length > 0 && (
                        <section>
                          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-2">
                            Resources
                          </h2>
                          <ul className="space-y-1.5">
                            {component.seoResourceLinks.map(
                              (link: { label: string; url: string }, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <span className="mt-1.5 w-1 h-1 rounded-full bg-text-secondary shrink-0" />
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-text-secondary hover:text-text-primary transition-colors">
                                    {link.label}
                                  </a>
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                      )}
                  </div>
                )}
              </>
            )}

            {/* Video embed (below AI content) */}
            {component.videoUrl && (
              <div className="rounded-lg overflow-hidden mb-6">
                <div className="aspect-video">
                  <iframe
                    src={component.videoUrl
                      .replace("watch?v=", "embed/")
                      .replace("youtu.be/", "youtube.com/embed/")}
                    className="w-full h-full"
                    allowFullScreen
                    title={`${component.name} demo`}
                  />
                </div>
              </div>
            )}

            {/* Keywords */}
            {component.tags && component.tags.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                  Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {component.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SKILL.md for Claude agents */}
            {component.skillMd && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-primary mb-2">
                  Agent Skill (SKILL.md)
                </h3>
                <p className="text-xs text-text-secondary mb-2">
                  Copy this SKILL.md file to teach Claude how to use this component.
                </p>
                <div className="relative rounded-md bg-[#1a1a1a] text-gray-300">
                  <button
                    onClick={handleCopySkill}
                    className="absolute top-2 right-2 p-1.5 rounded hover:bg-white/10 transition-colors"
                    title={skillCopied ? "Copied" : "Copy SKILL.md"}>
                    {skillCopied ? (
                      <CheckIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <CopyIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <pre className="p-3 pr-10 text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {component.skillMd}
                  </pre>
                </div>
              </div>
            )}

            {/* Badge snippet - commented out until badge endpoint is working
            {badgeMarkdown && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">
                  Add badge to your README
                </h3>
                <div className="flex items-center gap-2 rounded-md bg-[#1a1a1a] px-3 py-2 font-mono text-xs text-gray-300">
                  <code className="flex-1 overflow-x-auto whitespace-nowrap">{badgeMarkdown}</code>
                  <button
                    onClick={handleCopyBadge}
                    className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors">
                    {badgeCopied ? (
                      <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <CopyIcon className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
            */}
          </main>
        </div>
      </div>
    </div>
  );
}
