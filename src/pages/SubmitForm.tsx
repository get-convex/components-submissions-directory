// Submit form page - requires authentication
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "../lib/auth";
import { api } from "../../convex/_generated/api";
import { Toaster, toast } from "sonner";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDirectoryCategories } from "../lib/categories";
import Header from "../components/Header";
import { FAQSection } from "../components/FAQSection";
import {
  CheckCircle,
  CaretDown,
  X,
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
            <div className="mt-4 flex gap-2">
              <a
                href={`${basePath}/profile`}
                className="px-4 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
                View My Submissions
              </a>
              <a
                href={`${basePath}/`}
                className="px-4 py-2 rounded-full text-sm font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors">
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
  const [longDescription, setLongDescription] = useState("");
  const [tags, setTags] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submitPackage = useAction(api.packages.submitPackage);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !componentName.trim() ||
      !repositoryUrl.trim() ||
      !npmUrl.trim() ||
      !demoUrl.trim() ||
      !shortDescription.trim() ||
      !longDescription.trim() ||
      !submitterName.trim() ||
      !submitterEmail.trim()
    ) {
      setErrorMessage("Please fill in all required fields.");
      setShowError(true);
      return;
    }

    if (!validateGitHubRepoUrl(repositoryUrl.trim())) {
      setErrorMessage(
        "Please enter a valid GitHub repository URL. Expected format: https://github.com/owner/repo"
      );
      setShowError(true);
      return;
    }

    if (!validateNpmUrl(npmUrl.trim())) {
      setErrorMessage(
        "Please enter a valid npm URL. Expected format: https://www.npmjs.com/package/package-name"
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
        "Please enter a valid URL for the live demo (must start with http:// or https://)."
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
        longDescription: longDescription.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
        videoUrl: videoUrl.trim() || undefined,
        demoUrl: demoUrl.trim(),
        componentName: componentName.trim(),
      };

      const result = await submitPackage(payload);

      // If logo file selected, upload it
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
      // Reset form
      setComponentName("");
      setRepositoryUrl("");
      setNpmUrl("");
      setDemoUrl("");
      setSubmitterName("");
      setSubmitterEmail(user?.email || "");
      setSubmitterDiscord("");
      setCategory("");
      setShortDescription("");
      setLongDescription("");
      setTags("");
      setVideoUrl("");
      setLogoFile(null);
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page title */}
        <h1 className="text-xl font-medium text-text-primary mb-6">Submit a Component</h1>

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
                Live Demo URL <span className="text-red-500">*</span>
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
                      ? dynamicCategories.find((c) => c.slug === category)?.label || category
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
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          setCategory(cat.slug);
                          setCategoryOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-bg-hover ${
                          category === cat.slug
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

            {/* Long Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Long Description <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Detailed description of your component, features, and use cases"
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                required
                disabled={isLoading}
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-none"
              />
            </div>

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
    </div>
  );
}
