// Submit form page - requires authentication
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "../lib/auth";
import { api } from "../../convex/_generated/api";
import { Toaster, toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDirectoryCategories } from "../lib/categories";
import Header from "../components/Header";
import { markdownComponents } from "../components/markdownComponents";
import ReadmePreviewNotice from "../components/ReadmePreviewNotice";
import AiLoadingDots from "../components/AiLoadingDots";
import { FAQSection } from "../components/FAQSection";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  CheckCircle,
  CaretDown,
  X,
  Checks,
  ArrowRight,
  Lightning,
  PencilSimple,
  SpinnerGap,
} from "@phosphor-icons/react";

// Get base path for links (always /components)
function useBasePath() {
  return "/components";
}

// Success modal after submission
function SuccessModal({ onClose }: { onClose: () => void }) {
  const basePath = useBasePath();
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm p-6 rounded-lg bg-white border border-border shadow-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-green-600">
            <CheckCircle size={24} weight="bold" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary">Thank You!</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Your component is now pending for review. We'll notify you via email once it's been reviewed.
            </p>
            <div className="mt-4 flex flex-row gap-3">
              <a
                href={`${basePath}/profile`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-button text-white hover:bg-button-hover transition-colors">
                View My Submissions
              </a>
              <a
                href={`${basePath}/`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors">
                Back to Directory
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error modal
function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm p-6 rounded-lg bg-white border border-border shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-text-secondary hover:bg-bg-hover">
          <X size={16} />
        </button>
        <h3 className="text-lg font-medium text-red-600 mb-2">Error</h3>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

function GenerateWarningModal({
  onClose,
  onConfirm,
  isLoading,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-lg bg-white border border-border shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-text-secondary hover:bg-bg-hover">
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-amber-600">
            <Lightning size={22} weight="fill" />
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Generate content</h3>
              <p className="mt-1 text-sm text-text-secondary">
                This uses shared AI generation and is limited to 5 times per hour per account.
                Please only regenerate when you really need a fresh draft and edit the current
                content when you can.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <AiLoadingDots size={14} /> : "Continue"}
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

export default function SubmitForm() {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const user = useQuery(api.auth.loggedInUser);

  // Auto-redirect to sign-in when unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Store the current path so we return here after sign-in
      localStorage.setItem("authReturnPath", window.location.pathname);
      // Trigger the sign-in flow automatically
      signIn();
    }
  }, [authLoading, isAuthenticated, signIn]);

  // Checklist state (all three must be checked to enable form)
  const [readFaq, setReadFaq] = useState(false);
  const [compliesGuidelines, setCompliesGuidelines] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const allChecklistsComplete = readFaq && compliesGuidelines && hasPermission;

  // Form state
  const [componentName, setComponentName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [npmUrl, setNpmUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterDiscord, setSubmitterDiscord] = useState("");
  const dynamicCategories = useDirectoryCategories();
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [shortDescription, setShortDescription] = useState("");
  const [tags, setTags] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showGenerateWarning, setShowGenerateWarning] = useState(false);

  // V2 generated content state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedUseCases, setGeneratedUseCases] = useState("");
  const [generatedHowItWorks, setGeneratedHowItWorks] = useState("");
  const [readmeIncludedMarkdown, setReadmeIncludedMarkdown] = useState("");
  const [readmeIncludeSource, setReadmeIncludeSource] = useState<"markers" | "full" | "">("");
  const [contentGenerated, setContentGenerated] = useState(false);

  const submitPackage = useAction(api.packages.submitPackage);
  const previewContent = useAction(api.seoContent.previewDirectoryContent);
  const generateUploadUrl = useMutation(api.packages.generateUploadUrl);
  const saveLogo = useMutation(api.packages.saveLogo);

  // Pre-fill email from authenticated user
  useEffect(() => {
    if (user?.email && !submitterEmail) {
      setSubmitterEmail(user.email);
    }
  }, [user?.email, submitterEmail]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Validation helpers
  const validateNpmUrl = (url: string): boolean => {
    const pattern = /^https?:\/\/(www\.)?npmjs\.com\/package\/.+/;
    return pattern.test(url);
  };

  const validateEmail = (email: string): boolean => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const validateGitHubRepoUrl = (url: string): boolean => {
    const pattern = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?(\.git)?$/;
    return pattern.test(url);
  };

  const validateUrl = (url: string): boolean => {
    const pattern = /^https?:\/\/.+/;
    return pattern.test(url);
  };

  const canGenerate =
    componentName.trim() &&
    repositoryUrl.trim() &&
    npmUrl.trim() &&
    shortDescription.trim() &&
    validateGitHubRepoUrl(repositoryUrl.trim()) &&
    validateNpmUrl(npmUrl.trim());

  const handleGenerateContent = useCallback(async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const result = await previewContent({
        repositoryUrl: repositoryUrl.trim(),
        npmUrl: npmUrl.trim(),
        componentName: componentName.trim(),
        shortDescription: shortDescription.trim(),
        source: "submit",
      });
      setGeneratedDescription(result.description);
      setGeneratedUseCases(result.useCases);
      setGeneratedHowItWorks(result.howItWorks);
      setReadmeIncludedMarkdown(result.readmeIncludedMarkdown || "");
      setReadmeIncludeSource(result.readmeIncludeSource || "");
      setContentGenerated(true);
      toast.success("Content generated. Review and edit below before submitting.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate content",
      );
      setShowError(true);
    } finally {
      setIsGenerating(false);
      setShowGenerateWarning(false);
    }
  }, [canGenerate, previewContent, repositoryUrl, npmUrl, componentName, shortDescription]);

  const handleOpenGenerateWarning = useCallback(() => {
    if (!canGenerate || isGenerating || isLoading) return;
    setShowGenerateWarning(true);
  }, [canGenerate, isGenerating, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !componentName.trim() ||
      !repositoryUrl.trim() ||
      !npmUrl.trim() ||
      !demoUrl.trim() ||
      !shortDescription.trim() ||
      !submitterName.trim() ||
      !submitterEmail.trim()
    ) {
      setErrorMessage("Please fill in all required fields.");
      setShowError(true);
      return;
    }

    if (!validateGitHubRepoUrl(repositoryUrl.trim())) {
      setErrorMessage(
        "Please enter a valid GitHub repository URL. Expected format: https://github.com/owner/repo",
      );
      setShowError(true);
      return;
    }

    if (!validateNpmUrl(npmUrl.trim())) {
      setErrorMessage(
        "Please enter a valid npm URL. Expected format: https://www.npmjs.com/package/package-name",
      );
      setShowError(true);
      return;
    }

    if (!validateEmail(submitterEmail.trim())) {
      setErrorMessage("Please enter a valid email address.");
      setShowError(true);
      return;
    }

    if (!validateUrl(demoUrl.trim())) {
      setErrorMessage(
        "Please enter a valid URL for the live demo (must start with http:// or https://).",
      );
      setShowError(true);
      return;
    }

    setIsLoading(true);
    try {
      const payload: Parameters<typeof submitPackage>[0] = {
        repositoryUrl: repositoryUrl.trim(),
        npmUrl: npmUrl.trim(),
        submitterName: submitterName.trim(),
        submitterEmail: submitterEmail.trim(),
        submitterDiscord: submitterDiscord.trim() || undefined,
        category: category || undefined,
        shortDescription: shortDescription.trim(),
        tags: tags.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        demoUrl: demoUrl.trim(),
        componentName: componentName.trim(),
        // V2 generated content
        generatedDescription: generatedDescription || undefined,
        generatedUseCases: generatedUseCases || undefined,
        generatedHowItWorks: generatedHowItWorks || undefined,
        readmeIncludedMarkdown: readmeIncludedMarkdown || undefined,
        readmeIncludeSource: (readmeIncludeSource as "markers" | "full") || undefined,
      };

      const result = await submitPackage(payload);

      if (logoFile && result) {
        const uploadUrl = await generateUploadUrl();
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });
        if (uploadRes.ok) {
          const { storageId } = await uploadRes.json();
          await saveLogo({ packageId: result, storageId });
        }
      }

      setShowSuccess(true);
      setComponentName("");
      setRepositoryUrl("");
      setNpmUrl("");
      setDemoUrl("");
      setSubmitterName("");
      setSubmitterEmail(user?.email || "");
      setSubmitterDiscord("");
      setCategory("");
      setShortDescription("");
      setTags("");
      setVideoUrl("");
      setLogoFile(null);
      setGeneratedDescription("");
      setGeneratedUseCases("");
      setGeneratedHowItWorks("");
      setReadmeIncludedMarkdown("");
      setReadmeIncludeSource("");
      setContentGenerated(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit component");
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
        </div>
      </div>
    );
  }

  // Not authenticated - show redirecting state (auto sign-in is triggered via useEffect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button mx-auto mb-4"></div>
            <p className="text-sm text-text-secondary">Redirecting to sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show form
  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <h1 className="text-xl font-medium text-text-primary mb-4">Submit a Component</h1>

        {/* Preflight check link */}
        <a
          href={`${basePath}/submit/check`}
          className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-border bg-blue-50 hover:bg-blue-100 transition-colors group">
          <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
            <Checks size={20} weight="bold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              Check your component before submitting
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Run a preflight check to validate your repo against our review criteria
            </p>
          </div>
          <ArrowRight size={18} className="text-text-secondary group-hover:text-text-primary transition-colors" />
        </a>

        {/* Form container */}
        <div className="bg-white border border-border rounded-lg p-6">
          <p className="text-sm text-text-secondary mb-6">
            Submit your npm package to the Convex components directory for review.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Component Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Component Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Convex Agent"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            {/* GitHub Repository URL */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                GitHub Repo URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="https://github.com/owner/repo"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            {/* NPM URL */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                npm package URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="https://www.npmjs.com/package/your-package"
                value={npmUrl}
                onChange={(e) => setNpmUrl(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            {/* Live Demo URL */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Live Demo URL or Example App <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="https://your-demo-site.com"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            {/* Category */}
            <div ref={categoryRef}>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Category
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryOpen(!categoryOpen)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20">
                  <span className={category ? "text-text-primary" : "text-text-tertiary"}>
                    {category
                      ? dynamicCategories.find((c) => c.id === category)?.label || category
                      : "Select a category"}
                  </span>
                  <CaretDown
                    size={16}
                    className={`text-text-secondary transition-transform ${categoryOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {categoryOpen && (
                  <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-border bg-white shadow-lg py-1 z-30 max-h-48 overflow-y-auto">
                    {dynamicCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          setCategoryOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-bg-hover ${
                          category === cat.id
                            ? "text-text-primary font-medium"
                            : "text-text-secondary"
                        }`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Short Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="A brief one-line description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                required
                disabled={isLoading}
                maxLength={160}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
              <p className="text-xs text-text-tertiary mt-1">
                {shortDescription.length}/160 characters
              </p>
            </div>

            {/* Generate Component Directory Content */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-primary">
                  Component Directory Content
                </label>
                {contentGenerated && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle size={14} weight="bold" /> Generated
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Generate a description, use cases, and "how it works" section from your GitHub README and npm package. You can edit the results before submitting.
              </p>
              <button
                type="button"
                onClick={handleOpenGenerateWarning}
                disabled={!canGenerate || isGenerating || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? (
                  <AiLoadingDots />
                ) : contentGenerated ? (
                  <>
                    <Lightning size={16} weight="bold" />
                    Regenerate Content
                  </>
                ) : (
                  <>
                    <Lightning size={16} weight="bold" />
                    Generate Component Directory Content
                  </>
                )}
              </button>
              {!canGenerate && !contentGenerated && (
                <p className="text-xs text-text-tertiary mt-2">
                  Fill in Component Name, GitHub Repo URL, npm package URL, and Short Description first.
                </p>
              )}
            </div>

            {/* Generated Content Preview / Edit */}
            {contentGenerated && (
              <div className="space-y-4 rounded-lg border border-border bg-white p-4">
                {/* Description */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-1">
                    <PencilSimple size={14} /> Description
                  </label>
                  <textarea
                    value={generatedDescription}
                    onChange={(e) => setGeneratedDescription(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-y"
                  />
                </div>

                {/* Use Cases */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-1">
                    <PencilSimple size={14} /> Use Cases
                  </label>
                  <textarea
                    value={generatedUseCases}
                    onChange={(e) => setGeneratedUseCases(e.target.value)}
                    disabled={isLoading}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-y"
                  />
                  <div className="mt-1 rounded border border-border bg-bg-primary p-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Preview</p>
                    <div className="prose prose-sm max-w-none text-text-primary text-xs">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={markdownComponents as never}
                      >
                        {generatedUseCases}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* How it Works */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-1">
                    <PencilSimple size={14} /> How it Works
                  </label>
                  <textarea
                    value={generatedHowItWorks}
                    onChange={(e) => setGeneratedHowItWorks(e.target.value)}
                    disabled={isLoading}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-y"
                  />
                  <div className="mt-1 rounded border border-border bg-bg-primary p-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Preview</p>
                    <div className="prose prose-sm max-w-none text-text-primary text-xs">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={markdownComponents as never}
                      >
                        {generatedHowItWorks}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* README Include Preview */}
                {readmeIncludedMarkdown && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-sm font-medium text-text-primary">
                        README Preview
                      </label>
                    </div>
                    <ReadmePreviewNotice readmeIncludeSource={readmeIncludeSource} />
                    <div className="rounded-lg border border-border bg-bg-primary p-3 max-h-64 overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-text-primary">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={markdownComponents as never}
                        >
                          {readmeIncludedMarkdown}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Tags
              </label>
              <input
                type="text"
                placeholder="ai, agent, workflow (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Video URL (optional)
              </label>
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Logo (optional)
              </label>
              <input
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                disabled={isLoading}
                className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-bg-secondary file:text-text-primary hover:file:bg-bg-hover"
              />
              <p className="text-xs text-text-tertiary mt-1">
                PNG, WebP, or SVG. Will be used for thumbnail generation.
              </p>
            </div>

            {/* Submitter Info Section */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Your Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    Not displayed publicly. Used to contact you about your submission.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Discord Username (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="username#1234"
                    value={submitterDiscord}
                    onChange={(e) => setSubmitterDiscord(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20"
                  />
                </div>
              </div>
            </div>

            {/* Submission checklist */}
            <div className="pt-4 border-t border-border mt-4">
              <div className="space-y-3 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readFaq}
                    onChange={(e) => setReadFaq(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-border text-button focus:ring-button/50"
                  />
                  <span className="text-sm text-text-secondary">
                    I have read the{" "}
                    <a href="#faq" className="text-button hover:underline">
                      Frequently Asked Questions
                    </a>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compliesGuidelines}
                    onChange={(e) => setCompliesGuidelines(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-border text-button focus:ring-button/50"
                  />
                  <span className="text-sm text-text-secondary">
                    This component complies with the{" "}
                    <a
                      href="https://docs.convex.dev/components/authoring"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-button hover:underline">
                      Authoring Components
                    </a>{" "}
                    guidelines.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPermission}
                    onChange={(e) => setHasPermission(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-border text-button focus:ring-button/50"
                  />
                  <span className="text-sm text-text-secondary">
                    I have permission to submit this component for others to use and share.
                  </span>
                </label>
              </div>

              {/* Submit button - disabled until all checkboxes checked */}
              <button
                type="submit"
                disabled={isLoading || !allChecklistsComplete}
                className="w-full px-6 py-3 rounded-full font-normal bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {isLoading ? "Submitting..." : "Submit Component"}
              </button>
            </div>
          </form>
        </div>

        <FAQSection />

        {/* Terms and Privacy links below checklist */}
        <p className="text-xs text-text-secondary mt-6 text-center">
          <a
            href="https://www.convex.dev/legal/tos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-button hover:underline">
            Terms of Service
          </a>
          {" | "}
          <a
            href="https://www.convex.dev/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-button hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>

      <Toaster />

      {/* Success modal */}
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}

      {/* Error modal */}
      {showError && (
        <ErrorModal message={errorMessage} onClose={() => setShowError(false)} />
      )}

      {showGenerateWarning && (
        <GenerateWarningModal
          onClose={() => setShowGenerateWarning(false)}
          onConfirm={handleGenerateContent}
          isLoading={isGenerating}
        />
      )}
    </div>
  );
}
