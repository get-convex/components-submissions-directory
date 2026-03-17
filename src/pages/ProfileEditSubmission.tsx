import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  ArrowLeft,
  Lightning,
  PencilSimple,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AiLoadingDots from "../components/AiLoadingDots";
import { useAuth } from "../lib/auth";
import Header from "../components/Header";
import { markdownComponents } from "../components/markdownComponents";
import ReadmePreviewNotice from "../components/ReadmePreviewNotice";

function useBasePath() {
  return "/components";
}


interface ProfileEditSubmissionProps {
  packageId: string;
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
              <h3 className="text-lg font-medium text-text-primary">Regenerate content</h3>
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

export default function ProfileEditSubmission({
  packageId,
}: ProfileEditSubmissionProps) {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const typedPackageId = packageId as Id<"packages">;
  const submission = useQuery(
    api.packages.getMySubmissionForEdit,
    isAuthenticated ? { packageId: typedPackageId } : "skip",
  );
  const categories = useQuery(api.packages.listCategories);
  const updateSubmission = useMutation(api.packages.updateMySubmission);
  const generateUploadUrl = useMutation(api.packages.generateUploadUrl);
  const saveLogo = useMutation(api.packages.saveLogo);
  const clearLogo = useMutation(api.packages.clearLogo);
  const previewContent = useAction(api.seoContent.previewDirectoryContent);

  const [componentName, setComponentName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [clearExistingLogo, setClearExistingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedUseCases, setGeneratedUseCases] = useState("");
  const [generatedHowItWorks, setGeneratedHowItWorks] = useState("");
  const [readmeIncludedMarkdown, setReadmeIncludedMarkdown] = useState("");
  const [readmeIncludeSource, setReadmeIncludeSource] = useState<
    "markers" | "full" | ""
  >("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showContentSection, setShowContentSection] = useState(false);
  const [showGenerateWarning, setShowGenerateWarning] = useState(false);
  const [showOriginalText, setShowOriginalText] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      localStorage.setItem("authReturnPath", window.location.pathname);
      signIn();
    }
  }, [authLoading, isAuthenticated, signIn]);

  useEffect(() => {
    if (submission) {
      setComponentName(submission.componentName || "");
      setShortDescription(submission.shortDescription || "");
      setLongDescription(submission.longDescription || "");
      setCategory(submission.category || "");
      setTags(submission.tags?.join(", ") || "");
      setDemoUrl(submission.demoUrl || "");
      setVideoUrl(submission.videoUrl || "");
      setCurrentLogoUrl(submission.logoUrl || "");
      setLogoFile(null);
      setClearExistingLogo(false);
      setGeneratedDescription(submission.generatedDescription || "");
      setGeneratedUseCases(submission.generatedUseCases || "");
      setGeneratedHowItWorks(submission.generatedHowItWorks || "");
      setReadmeIncludedMarkdown(submission.readmeIncludedMarkdown || "");
      setReadmeIncludeSource(submission.readmeIncludeSource || "");
      setShowContentSection(
        Boolean(
          submission.generatedDescription ||
            submission.generatedUseCases ||
            submission.generatedHowItWorks ||
            submission.contentModelVersion === 2,
        ),
      );
    }
  }, [submission]);

  const handleGenerateContent = useCallback(async () => {
    if (!submission) return;
    const repoUrl = submission.repositoryUrl;
    const npmUrl = submission.npmUrl;
    const name = componentName || submission.componentName || submission.name;
    const desc = shortDescription || submission.shortDescription || "";

    if (!repoUrl || !npmUrl || !name || !desc) {
      toast.error(
        "Need repo URL, npm URL, component name, and short description to generate content",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const result = await previewContent({
        repositoryUrl: repoUrl,
        npmUrl,
        componentName: name,
        shortDescription: desc,
        source: "profile",
      });
      setGeneratedDescription(result.description);
      setGeneratedUseCases(result.useCases);
      setGeneratedHowItWorks(result.howItWorks);
      setReadmeIncludedMarkdown(result.readmeIncludedMarkdown || "");
      setReadmeIncludeSource(result.readmeIncludeSource || "");
      setShowContentSection(true);
      toast.success("Content generated");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate content",
      );
    } finally {
      setIsGenerating(false);
      setShowGenerateWarning(false);
    }
  }, [submission, componentName, shortDescription, previewContent]);

  const canGenerate = Boolean(
    submission &&
      submission.repositoryUrl &&
      submission.npmUrl &&
      (componentName || submission.componentName) &&
      (shortDescription || submission.shortDescription),
  );

  const handleOpenGenerateWarning = useCallback(() => {
    if (!canGenerate || isGenerating || isSubmitting) return;
    setShowGenerateWarning(true);
  }, [canGenerate, isGenerating, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateSubmission({
        packageId: typedPackageId,
        componentName: componentName || undefined,
        shortDescription: shortDescription || undefined,
        longDescription: longDescription || undefined,
        category: category || undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        demoUrl: demoUrl || undefined,
        videoUrl: videoUrl || undefined,
        generatedDescription: generatedDescription || undefined,
        generatedUseCases: generatedUseCases || undefined,
        generatedHowItWorks: generatedHowItWorks || undefined,
        readmeIncludedMarkdown: readmeIncludedMarkdown || undefined,
        readmeIncludeSource: readmeIncludeSource || undefined,
      });

      if (clearExistingLogo && currentLogoUrl && !logoFile) {
        await clearLogo({ packageId: typedPackageId });
      }

      if (logoFile) {
        const uploadUrl = await generateUploadUrl();
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });

        if (!uploadRes.ok) {
          throw new Error("Logo upload failed");
        }

        const { storageId } = await uploadRes.json();
        await saveLogo({ packageId: typedPackageId, storageId });
      }

      toast.success("Submission updated");
    } catch (error) {
      toast.error("Failed to update submission");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (submission === undefined) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
          </div>
        </div>
      </div>
    );
  }

  if (submission === null) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a
            href={`${basePath}/profile`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Back to Profile
          </a>
          <div className="rounded-lg border border-border bg-white p-6">
            <h1 className="text-xl font-medium text-text-primary mb-2">
              Submission not found
            </h1>
            <p className="text-sm text-text-secondary">
              This submission is unavailable or you do not have permission to edit it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a
          href={`${basePath}/profile`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Profile
        </a>

        <div className="flex flex-col gap-6 mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-text-primary">Edit Submission</h1>
            <p className="text-sm text-text-secondary mt-1">
              Review your generated content, update package details, and save changes for
              re-review.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-text-secondary overflow-hidden">
            <p className="truncate">
              <span className="font-medium text-text-primary">Package:</span>{" "}
              <a
                href={`${basePath}/${submission.name}`}
                className="text-button hover:underline"
              >
                {submission.name}
              </a>
            </p>
            <p className="mt-1 truncate">
              <span className="font-medium text-text-primary">Repo:</span>{" "}
              {submission.repositoryUrl ? (
                <a
                  href={submission.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button hover:underline"
                >
                  {submission.repositoryUrl}
                </a>
              ) : (
                "Not available"
              )}
            </p>
            <p className="mt-1 truncate">
              <span className="font-medium text-text-primary">npm:</span>{" "}
              <a
                href={submission.npmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-button hover:underline"
              >
                {submission.npmUrl}
              </a>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  placeholder="e.g., Convex Agent"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
                />
                <p className="text-xs text-text-tertiary mt-1">Human-readable display name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
                >
                  <option value="">Select a category</option>
                  {categories?.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Short Description
              </label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20 resize-y"
              />
            </div>

            {!showContentSection && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Long Description
                </label>
                <textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20 resize-y"
                />
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                <div className="min-w-0">
                  <label className="text-sm font-medium text-text-primary">
                    Component Directory Content
                  </label>
                  <p className="text-xs text-text-secondary mt-1">
                    Generate or refine the same Description, Use cases, How it works, and README
                    content used on the public component page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGenerateWarning}
                  disabled={!canGenerate || isGenerating || isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isGenerating ? (
                    <AiLoadingDots />
                  ) : (
                    <>
                      <Lightning size={16} weight="bold" />
                      {showContentSection ? "Regenerate Content" : "Generate Content"}
                    </>
                  )}
                </button>
              </div>

              {!canGenerate && (
                <p className="text-xs text-text-tertiary mb-3">
                  Requires the saved repository URL, npm URL, component name, and short
                  description.
                </p>
              )}

              {showContentSection && (
                <div className="space-y-6 rounded-lg border border-border bg-white p-4">
                  {/* Description: side-by-side editor + preview */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-2">
                      <PencilSimple size={14} /> Description
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                          Edit
                        </p>
                        <textarea
                          value={generatedDescription}
                          onChange={(e) => setGeneratedDescription(e.target.value)}
                          disabled={isSubmitting}
                          rows={4}
                          className="w-full flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-y min-h-[100px]"
                        />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                          Preview
                        </p>
                        <div className="flex-1 rounded-lg border border-border bg-bg-primary p-3 overflow-y-auto min-h-[100px]">
                          <div className="prose prose-sm max-w-none text-text-primary text-xs">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              components={markdownComponents as never}
                            >
                              {generatedDescription || "*No description yet*"}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Use Cases: side-by-side editor + preview */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-2">
                      <PencilSimple size={14} /> Use Cases
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                          Edit
                        </p>
                        <textarea
                          value={generatedUseCases}
                          onChange={(e) => setGeneratedUseCases(e.target.value)}
                          disabled={isSubmitting}
                          rows={8}
                          className="w-full flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-y min-h-[180px]"
                        />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                          Preview
                        </p>
                        <div className="flex-1 rounded-lg border border-border bg-bg-primary p-3 overflow-y-auto min-h-[180px] max-h-[400px]">
                          <div className="prose prose-sm max-w-none text-text-primary text-xs">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              components={markdownComponents as never}
                            >
                              {generatedUseCases || "*No use cases yet*"}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* How it Works: side-by-side editor + preview */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary mb-2">
                      <PencilSimple size={14} /> How it Works
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                          Edit
                        </p>
                        <textarea
                          value={generatedHowItWorks}
                          onChange={(e) => setGeneratedHowItWorks(e.target.value)}
                          disabled={isSubmitting}
                          rows={8}
                          className="w-full flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none transition-all disabled:opacity-50 focus:border-button focus:ring-2 focus:ring-button/20 resize-y min-h-[180px]"
                        />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                          Preview
                        </p>
                        <div className="flex-1 rounded-lg border border-border bg-bg-primary p-3 overflow-y-auto min-h-[180px] max-h-[400px]">
                          <div className="prose prose-sm max-w-none text-text-primary text-xs">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              components={markdownComponents as never}
                            >
                              {generatedHowItWorks || "*No content yet*"}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* README: full-width preview (read-only) */}
                  {readmeIncludedMarkdown && (
                    <div>
                      <label className="text-sm font-medium text-text-primary mb-1 block">
                        README Preview
                      </label>
                      <ReadmePreviewNotice readmeIncludeSource={readmeIncludeSource} />
                      <div className="rounded-lg border border-border bg-bg-primary p-3 max-h-64 overflow-y-auto">
                        <div className="prose prose-sm max-w-none text-text-primary text-xs">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="ai, realtime, database"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Demo URL
                </label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://demo.example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Video URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Logo</label>
              <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-3">
                {currentLogoUrl && !clearExistingLogo && !logoFile && (
                  <div className="flex items-center gap-3">
                    <img
                      src={currentLogoUrl}
                      alt={`${submission.name} logo`}
                      className="h-14 w-14 rounded border border-border bg-white object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setClearExistingLogo(true);
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-full text-xs font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50"
                    >
                      Remove current logo
                    </button>
                  </div>
                )}

                {clearExistingLogo && !logoFile && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2">
                    <p className="text-xs text-text-secondary">
                      Current logo will be removed when you save.
                    </p>
                    <button
                      type="button"
                      onClick={() => setClearExistingLogo(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-full text-xs font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50"
                    >
                      Keep logo
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const nextFile = e.target.files?.[0] || null;
                    setLogoFile(nextFile);
                    if (nextFile) {
                      setClearExistingLogo(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-bg-secondary file:text-text-primary hover:file:bg-bg-hover"
                />

                {logoFile && (
                  <p className="text-xs text-text-secondary">
                    Selected logo: <span className="text-text-primary">{logoFile.name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Original submitted text (read-only reference, shown when available) */}
            {(submission?.submittedShortDescription || submission?.submittedLongDescription) && (
              <div className="pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowOriginalText(!showOriginalText)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Lightning
                    size={12}
                    className={`transition-transform ${showOriginalText ? "rotate-180" : ""}`}
                  />
                  Original Submitted Text
                </button>
                {showOriginalText && (
                  <div className="mt-2 space-y-2 p-3 rounded-lg bg-bg-secondary/50 border border-border/50">
                    {submission.submittedShortDescription && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-0.5">
                          Short Description
                        </p>
                        <p className="text-xs text-text-secondary">
                          {submission.submittedShortDescription}
                        </p>
                      </div>
                    )}
                    {submission.submittedLongDescription && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-0.5">
                          Long Description
                        </p>
                        <p className="text-xs text-text-secondary whitespace-pre-wrap">
                          {submission.submittedLongDescription}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <a
                href={`${basePath}/profile`}
                className="px-4 py-2 rounded-full text-sm font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Back
              </a>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toaster />

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
