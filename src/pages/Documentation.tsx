import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth";
import Header from "../components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  DownloadSimple,
  FileText,
  House,
  CaretRight,
  Folder,
  List,
} from "@phosphor-icons/react";

// Import all docs as raw strings
import indexDoc from "../docs/index.md?raw";
import directoryDoc from "../docs/directory.md?raw";
import submitDoc from "../docs/submit.md?raw";
import profileDoc from "../docs/profile.md?raw";
import componentDetailDoc from "../docs/component-detail.md?raw";
import adminDashboardDoc from "../docs/admin-dashboard.md?raw";
import adminPackagesDoc from "../docs/admin-packages.md?raw";
import adminReviewDoc from "../docs/admin-review.md?raw";
import adminAiReviewDoc from "../docs/admin-ai-review.md?raw";
import adminSeoDoc from "../docs/admin-seo.md?raw";
import adminThumbnailsDoc from "../docs/admin-thumbnails.md?raw";
import adminSettingsDoc from "../docs/admin-settings.md?raw";
import adminNotesDoc from "../docs/admin-notes.md?raw";

type DocSection = {
  id: string;
  title: string;
  content: string;
  group: "getting-started" | "user-guide" | "admin-guide";
};

const docs: DocSection[] = [
  { id: "index", title: "Overview", content: indexDoc, group: "getting-started" },
  { id: "directory", title: "Using the Directory", content: directoryDoc, group: "user-guide" },
  { id: "submit", title: "Submitting Components", content: submitDoc, group: "user-guide" },
  { id: "profile", title: "Managing Your Profile", content: profileDoc, group: "user-guide" },
  { id: "component-detail", title: "Component Pages", content: componentDetailDoc, group: "user-guide" },
  { id: "admin-dashboard", title: "Dashboard Overview", content: adminDashboardDoc, group: "admin-guide" },
  { id: "admin-packages", title: "Package Management", content: adminPackagesDoc, group: "admin-guide" },
  { id: "admin-review", title: "Review Workflow", content: adminReviewDoc, group: "admin-guide" },
  { id: "admin-ai-review", title: "AI Review System", content: adminAiReviewDoc, group: "admin-guide" },
  { id: "admin-seo", title: "SEO Content", content: adminSeoDoc, group: "admin-guide" },
  { id: "admin-thumbnails", title: "Thumbnails", content: adminThumbnailsDoc, group: "admin-guide" },
  { id: "admin-settings", title: "Settings", content: adminSettingsDoc, group: "admin-guide" },
  { id: "admin-notes", title: "Notes and Comments", content: adminNotesDoc, group: "admin-guide" },
];

function extractHeadings(markdown: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const lines = markdown.split("\n");
  
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      headings.push({ id, text, level });
    }
  }
  
  return headings;
}

function useBasePath() {
  return "/components";
}

interface DocumentationProps {
  section?: string;
}

export default function Documentation({ section }: DocumentationProps) {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = useQuery(api.auth.isAdmin);
  const [copied, setCopied] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Determine current doc
  const currentDoc = useMemo(() => {
    if (!section) return docs[0];
    return docs.find((d) => d.id === section) || docs[0];
  }, [section]);

  // Extract headings for "On this page"
  const headings = useMemo(() => extractHeadings(currentDoc.content), [currentDoc]);

  // Set noindex meta tag
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");

    return () => {
      meta?.setAttribute("content", "index, follow");
    };
  }, []);

  // Set page title
  useEffect(() => {
    document.title = `${currentDoc.title} | Documentation | Convex Components`;
  }, [currentDoc.title]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Download as markdown
  const handleDownload = () => {
    const blob = new Blob([currentDoc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentDoc.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (authLoading || isAdmin === undefined) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <FileText size={48} className="mx-auto text-text-tertiary mb-4" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            Documentation
          </h1>
          <p className="text-text-secondary mb-6">
            Sign in with an admin account to access documentation.
          </p>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <FileText size={48} className="mx-auto text-text-tertiary mb-4" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            Admin Access Required
          </h1>
          <p className="text-text-secondary mb-6">
            Documentation is only available to administrators with @convex.dev email addresses.
          </p>
          <a
            href={`${basePath}/`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-button text-white hover:bg-button-hover transition-colors"
          >
            <House size={16} />
            Back to Directory
          </a>
        </div>
      </div>
    );
  }

  // Group docs by category
  const gettingStarted = docs.filter((d) => d.group === "getting-started");
  const userGuide = docs.filter((d) => d.group === "user-guide");
  const adminGuide = docs.filter((d) => d.group === "admin-guide");

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      {/* Mobile nav toggle */}
      <div className="lg:hidden sticky top-0 z-40 bg-bg-primary border-b border-border px-4 py-3">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="flex items-center gap-2 text-sm font-medium text-text-primary"
        >
          <List size={20} />
          {currentDoc.title}
          <CaretRight
            size={16}
            className={`transition-transform ${mobileNavOpen ? "rotate-90" : ""}`}
          />
        </button>

        {mobileNavOpen && (
          <nav className="mt-3 pb-2 space-y-4">
            <NavSection
              title="Getting Started"
              items={gettingStarted}
              currentId={currentDoc.id}
              basePath={basePath}
              onNavigate={() => setMobileNavOpen(false)}
            />
            <NavSection
              title="User Guide"
              items={userGuide}
              currentId={currentDoc.id}
              basePath={basePath}
              onNavigate={() => setMobileNavOpen(false)}
            />
            <NavSection
              title="Admin Guide"
              items={adminGuide}
              currentId={currentDoc.id}
              basePath={basePath}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </nav>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left sidebar - navigation */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Documentation
              </h2>
              <nav className="space-y-6">
                <NavSection
                  title="Getting Started"
                  items={gettingStarted}
                  currentId={currentDoc.id}
                  basePath={basePath}
                />
                <NavSection
                  title="User Guide"
                  items={userGuide}
                  currentId={currentDoc.id}
                  basePath={basePath}
                />
                <NavSection
                  title="Admin Guide"
                  items={adminGuide}
                  currentId={currentDoc.id}
                  basePath={basePath}
                />
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Actions bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Folder size={14} />
                <span>{currentDoc.group.replace("-", " ")}</span>
                <CaretRight size={12} />
                <span className="text-text-primary font-medium">{currentDoc.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy as Markdown
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  <DownloadSimple size={14} />
                  Download
                </button>
              </div>
            </div>

            {/* Markdown content */}
            <article className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-text-primary prose-p:text-text-secondary prose-li:text-text-secondary prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-text-primary prose-code:bg-bg-hover prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[rgb(30,28,26)] prose-pre:text-white prose-table:text-sm prose-th:text-text-primary prose-th:font-medium prose-th:bg-bg-hover prose-td:border-border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-semibold text-text-primary mb-4 mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => {
                    const text = String(children);
                    const id = text
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .replace(/\s+/g, "-");
                    return (
                      <h2
                        id={id}
                        className="text-xl font-semibold text-text-primary mt-8 mb-4 scroll-mt-24"
                      >
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children }) => {
                    const text = String(children);
                    const id = text
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .replace(/\s+/g, "-");
                    return (
                      <h3
                        id={id}
                        className="text-lg font-semibold text-text-primary mt-6 mb-3 scroll-mt-24"
                      >
                        {children}
                      </h3>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-border rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-blue-600 hover:underline"
                      target={href?.startsWith("http") ? "_blank" : undefined}
                      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {currentDoc.content}
              </ReactMarkdown>
            </article>
          </main>

          {/* Right sidebar - On this page */}
          <aside className="hidden xl:block w-48 shrink-0">
            <div className="sticky top-20">
              {headings.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                    On this page
                  </h3>
                  <nav className="space-y-1">
                    {headings.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`block text-xs text-text-secondary hover:text-text-primary transition-colors ${
                          heading.level === 3 ? "pl-3" : ""
                        }`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Navigation section component
function NavSection({
  title,
  items,
  currentId,
  basePath,
  onNavigate,
}: {
  title: string;
  items: DocSection[];
  currentId: string;
  basePath: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={
                item.id === "index"
                  ? `${basePath}/documentation`
                  : `${basePath}/documentation/${item.id}`
              }
              onClick={onNavigate}
              className={`block px-2 py-1.5 rounded-md text-sm transition-colors ${
                currentId === item.id
                  ? "bg-button/10 text-button font-medium"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
