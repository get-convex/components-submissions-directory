// Admin component for editing directory-specific fields on a package
import { useState, useRef, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { CaretDown, DownloadSimple, Image, ArrowsClockwise } from "@phosphor-icons/react";
import { useDirectoryCategories } from "../lib/categories";

// Max file size: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/webp", "image/png", "image/jpeg"];
const LOGO_ALLOWED_TYPES = ["image/png", "image/webp", "image/svg+xml"];

interface ComponentDetailsEditorProps {
  packageId: Id<"packages">;
  componentName?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  shortDescription?: string;
  longDescription?: string;
  videoUrl?: string;
  demoUrl?: string;
  thumbnailUrl?: string;
  convexVerified?: boolean;
  authorUsername?: string;
  authorAvatar?: string;
  // Logo and thumbnail generation fields
  logoUrl?: string;
  logoStorageId?: Id<"_storage">;
  selectedTemplateId?: Id<"thumbnailTemplates">;
  thumbnailGeneratedAt?: number;
  // SEO generation fields
  seoGenerationStatus?: string;
  seoGeneratedAt?: number;
  seoGenerationError?: string;
  seoValueProp?: string;
  // SKILL.md generation
  skillMd?: string;
  mode?: "full" | "submission";
  // Package metadata for auto-fill
  npmDescription?: string;
}

export function ComponentDetailsEditor({
  packageId,
  componentName: initialComponentName,
  slug: initialSlug,
  category: initialCategory,
  tags: initialTags,
  shortDescription: initialShortDesc,
  longDescription: initialLongDesc,
  videoUrl: initialVideoUrl,
  demoUrl: initialDemoUrl,
  thumbnailUrl: initialThumbUrl,
  convexVerified: initialVerified,
  authorUsername: initialAuthorUser,
  authorAvatar: initialAuthorAvatar,
  logoUrl: initialLogoUrl,
  logoStorageId: initialLogoStorageId,
  selectedTemplateId: initialSelectedTemplateId,
  thumbnailGeneratedAt,
  seoGenerationStatus,
  seoGeneratedAt,
  seoGenerationError,
  seoValueProp,
  skillMd,
  mode = "full",
  npmDescription,
}: ComponentDetailsEditorProps) {
  const isSubmissionMode = mode === "submission";
  const [componentName, setComponentName] = useState(initialComponentName || "");
  const [slug, setSlug] = useState(initialSlug || "");
  const [category, setCategory] = useState(initialCategory || "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [tags, setTags] = useState((initialTags || []).join(", "));
  const [shortDescription, setShortDescription] = useState(
    initialShortDesc || "",
  );
  const [longDescription, setLongDescription] = useState(
    initialLongDesc || "",
  );
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl || "");
  const [demoUrl, setDemoUrl] = useState(initialDemoUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbUrl || "");
  const [savedThumbnailUrl, setSavedThumbnailUrl] = useState(initialThumbUrl || "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [convexVerified, setConvexVerified] = useState(
    initialVerified || false,
  );
  const [authorUsername, setAuthorUsername] = useState(
    initialAuthorUser || "",
  );
  const [authorAvatar, setAuthorAvatar] = useState(
    initialAuthorAvatar || "",
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [clearingLogo, setClearingLogo] = useState(false);
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [selectedGenTemplate, setSelectedGenTemplate] = useState<Id<"thumbnailTemplates"> | "">(
    initialSelectedTemplateId || "",
  );
  const [fillingAuthor, setFillingAuthor] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic categories from DB
  const dynamicCategories = useDirectoryCategories();

  // Close category dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep local state synced with reactive backend updates.
  useEffect(() => {
    setSlug(initialSlug || "");
  }, [initialSlug]);

  useEffect(() => {
    setThumbnailUrl(initialThumbUrl || "");
    setSavedThumbnailUrl(initialThumbUrl || "");
  }, [initialThumbUrl]);

  useEffect(() => {
    setLogoUrl(initialLogoUrl || "");
  }, [initialLogoUrl]);

  useEffect(() => {
    setSelectedGenTemplate(initialSelectedTemplateId || "");
  }, [initialSelectedTemplateId]);

  const updateDetails = useMutation(api.packages.updateComponentDetails);
  const generateUploadUrl = useMutation(api.packages.generateUploadUrl);
  const saveThumbnail = useMutation(api.packages.saveThumbnail);
  const saveLogo = useMutation(api.packages.saveLogo);
  const clearLogo = useMutation(api.packages.clearLogo);
  const autoFillAuthor = useMutation(api.packages.autoFillAuthorFromRepo);
  const regenerateSeo = useAction(api.seoContent.regenerateSeoContent);
  const generateThumbnail = useAction(api.thumbnailGenerator.generateThumbnailForPackage);
  // Fetch active templates for picker
  const activeTemplates = useQuery(api.thumbnails.listActiveTemplates);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: {
        packageId: Id<"packages">;
        componentName?: string;
        category?: string;
        tags?: string[];
        shortDescription?: string;
        longDescription?: string;
        videoUrl?: string;
        demoUrl?: string;
        thumbnailUrl?: string;
        clearThumbnail?: boolean;
        slug?: string;
        convexVerified?: boolean;
        authorUsername?: string;
        authorAvatar?: string;
      } = {
        packageId,
        componentName: componentName || undefined,
        category: category || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        shortDescription: shortDescription || undefined,
        longDescription: longDescription || undefined,
        videoUrl: videoUrl || undefined,
        demoUrl: demoUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        clearThumbnail:
          savedThumbnailUrl !== "" && thumbnailUrl === "" ? true : undefined,
      };

      if (!isSubmissionMode) {
        payload.slug = slug || undefined;
        payload.convexVerified = convexVerified;
        payload.authorUsername = authorUsername || undefined;
        payload.authorAvatar = authorAvatar || undefined;
      }

      await updateDetails(payload);
      setSavedThumbnailUrl(thumbnailUrl);
      toast.success("Component details saved");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Handle thumbnail file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only .webp, .png, and .jpg files are allowed");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 3MB");
      return;
    }

    setUploading(true);
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Save to the package
      await saveThumbnail({ packageId, storageId });
      toast.success("Thumbnail uploaded");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle logo file upload
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only .png, .webp, and .svg files are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 3MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();
      await saveLogo({ packageId, storageId });
      // Optimistic preview so admins see the newly uploaded logo immediately.
      setLogoUrl(URL.createObjectURL(file));
      toast.success("Logo uploaded");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // Clear logo from package
  const handleClearLogo = async () => {
    setClearingLogo(true);
    try {
      await clearLogo({ packageId });
      setLogoUrl("");
      toast.success("Logo cleared");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Clear failed";
      toast.error(msg);
    } finally {
      setClearingLogo(false);
    }
  };

  // Generate thumbnail from logo + template
  const handleGenerateThumbnail = async () => {
    setGeneratingThumb(true);
    try {
      await generateThumbnail({
        packageId,
        templateId: selectedGenTemplate
          ? (selectedGenTemplate as Id<"thumbnailTemplates">)
          : undefined,
      });
      toast.success("Thumbnail generated");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Generation failed";
      toast.error(msg);
    } finally {
      setGeneratingThumb(false);
    }
  };

  // Auto-fill author from GitHub repo URL
  // Updates local state immediately from mutation return value
  const handleAutoFillAuthor = async () => {
    setFillingAuthor(true);
    try {
      const result = await autoFillAuthor({ packageId });
      if (result) {
        setAuthorUsername(result.authorUsername);
        setAuthorAvatar(result.authorAvatar);
        toast.success("Author info populated from GitHub");
      } else {
        toast.error("No GitHub repository URL found on this package");
      }
    } catch {
      toast.error("Could not extract author from repository URL");
    } finally {
      setFillingAuthor(false);
    }
  };

  // Badge markdown snippet
  const badgeSnippet = slug
    ? `[![Convex Component](https://www.convex.dev/components/badge/${slug})](https://www.convex.dev/components/${slug})`
    : "";

  return (
    <div className="mt-4 p-3 rounded-lg bg-bg-hover/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Component Details
        </h4>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-3 py-1 rounded-full bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Component Name */}
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Component Name
          </label>
          <input
            type="text" 
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            placeholder="Convex Agent"
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>

        {!isSubmissionMode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
              URL Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="agent"
              className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
            />
          </div>
        )}

        {/* Category (custom dropdown) */}
        <div ref={categoryDropdownRef} className="relative">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Category
          </label>
          <button
            type="button"
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          >
            <span className={category ? "text-text-primary" : "text-text-secondary"}>
              {category
                ? dynamicCategories.find((c) => c.id === category)?.label || category
                : "None"}
            </span>
            <CaretDown
              size={12}
              className={`text-text-secondary transition-transform ${categoryOpen ? "rotate-180" : ""}`}
            />
          </button>
          {categoryOpen && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-white shadow-lg py-1 max-h-48 overflow-y-auto">
              {[{ id: "", label: "None" }, ...dynamicCategories].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setCategory(opt.id);
                    setCategoryOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-bg-hover ${
                    category === opt.id ? "text-text-primary font-medium" : "text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isSubmissionMode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
              Author GitHub Username
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={authorUsername}
                onChange={(e) => setAuthorUsername(e.target.value)}
                placeholder="get-convex"
                className="flex-1 text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
              <button
                onClick={handleAutoFillAuthor}
                disabled={fillingAuthor}
                title="Auto-fill from repository URL"
                className="text-[10px] px-2 py-1 rounded bg-bg-primary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {fillingAuthor ? "..." : "Auto-fill"}
              </button>
            </div>
          </div>
        )}

        {!isSubmissionMode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
              Author Avatar URL
            </label>
            <input
              type="text"
              value={authorAvatar}
              onChange={(e) => setAuthorAvatar(e.target.value)}
              placeholder="https://github.com/get-convex.png"
              className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
            />
          </div>
        )}

        {/* Video URL */}
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Video Demo URL
          </label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>

        {/* Live Demo URL */}
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Live Demo URL
          </label>
          <input
            type="text"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://your-demo.com"
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>
      </div>

      {/* Logo management (admin only) */}
      {!isSubmissionMode && (
        <div className="pt-2 border-t border-border space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Component Logo
          </label>
          <div className="flex items-center gap-3">
            {/* Logo preview */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded border border-border bg-white p-0.5"
              />
            ) : (
              <div className="w-10 h-10 rounded border border-dashed border-border flex items-center justify-center">
                <Image size={14} className="text-text-secondary" />
              </div>
            )}

            {/* Upload / replace logo */}
            <input
              ref={logoInputRef}
              type="file"
              accept=".png,.webp,.svg"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="text-xs px-3 py-1.5 rounded bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              {uploadingLogo
                ? "Uploading..."
                : logoUrl
                  ? "Replace logo"
                  : "Upload logo"}
            </button>

            {/* Download logo */}
            {logoUrl && (
              <a
                href={logoUrl}
                download
                className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                title="Download logo"
              >
                <DownloadSimple size={14} className="text-text-secondary" />
              </a>
            )}

            {/* Clear logo */}
            {logoUrl && (
              <button
                onClick={handleClearLogo}
                disabled={clearingLogo || uploadingLogo}
                className="text-xs px-3 py-1.5 rounded bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
              >
                {clearingLogo ? "Clearing..." : "Clear"}
              </button>
            )}

            <span className="text-[10px] text-text-secondary">
              .png, .webp, .svg
            </span>
          </div>

          {/* Thumbnail generation controls */}
          {logoUrl && (
            <div className="mt-2 space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-text-secondary block">
                Generate Thumbnail
              </label>
              <div className="flex items-center gap-2">
                {/* Template picker */}
                <select
                  value={selectedGenTemplate}
                  onChange={(e) =>
                    setSelectedGenTemplate(
                      e.target.value as Id<"thumbnailTemplates"> | "",
                    )
                  }
                  className="flex-1 text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary border border-border outline-none focus:ring-1 focus:ring-button"
                >
                  <option value="">Default template</option>
                  {activeTemplates?.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                      {t.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateThumbnail}
                  disabled={generatingThumb}
                  className="text-xs px-3 py-1.5 rounded bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                >
                  <ArrowsClockwise
                    size={12}
                    className={generatingThumb ? "animate-spin" : ""}
                  />
                  {generatingThumb ? "Generating..." : "Generate"}
                </button>
              </div>

              {/* Generation info */}
              {thumbnailGeneratedAt && (
                <p className="text-[10px] text-text-secondary">
                  Last generated:{" "}
                  {new Date(thumbnailGeneratedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Thumbnail upload (manual override) */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
          Component Thumbnail (16:9, 1536x864, max 3MB)
        </label>
        <div className="flex items-center gap-2">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Thumbnail preview"
              className="w-20 h-[45px] object-cover rounded"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".webp,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-1.5 rounded bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading..." : thumbnailUrl ? "Replace" : "Upload"}
          </button>
          {thumbnailUrl && (
            <button
              onClick={() => setThumbnailUrl("")}
              disabled={uploading || saving}
              className="text-xs px-3 py-1.5 rounded bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-text-secondary">
            .webp, .png, .jpg
          </span>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
          Keywords (comma-separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="ai, real-time, streaming"
          className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
        />
      </div>

      {/* Short description */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
          Short Description ({shortDescription.length}/200)
        </label>
        <textarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value.slice(0, 200))}
          placeholder="One-line summary"
          rows={2}
          className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary resize-none outline-none focus:ring-1 focus:ring-button"
        />
      </div>

      {/* Long description */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary">
            Long Description (markdown)
          </label>
          {!isSubmissionMode && npmDescription && (
            <button
              type="button"
              onClick={() => {
                setLongDescription(npmDescription);
                toast.success("Description auto-filled from package metadata");
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-bg-primary text-text-secondary hover:text-text-primary transition-colors border border-border hover:border-button"
              title="Copy description from Package Metadata"
            >
              Auto-fill from Package
            </button>
          )}
        </div>
        <textarea
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          placeholder="Full markdown description"
          rows={4}
          className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary resize-y outline-none focus:ring-1 focus:ring-button"
        />
      </div>

      {!isSubmissionMode && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`verified-${packageId}`}
            checked={convexVerified}
            onChange={(e) => setConvexVerified(e.target.checked)}
            className="rounded"
          />
          <label
            htmlFor={`verified-${packageId}`}
            className="text-xs text-text-primary"
          >
            Convex Verified
          </label>
        </div>
      )}

      {!isSubmissionMode && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider text-text-secondary">
              AI SEO Content + SKILL.md
            </label>
            {seoGenerationStatus === "completed" && seoGeneratedAt && (
              <span className="text-[10px] text-text-secondary">
                Generated {new Date(seoGeneratedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {seoGenerationStatus === "generating" && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 border-2 border-text-secondary/30 border-t-text-primary rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Generating content...</span>
            </div>
          )}
          {seoGenerationStatus === "error" && seoGenerationError && (
            <p className="text-xs text-red-600 mb-2">{seoGenerationError}</p>
          )}
          {seoGenerationStatus === "completed" && seoValueProp && (
            <p className="text-xs text-text-secondary italic mb-2 line-clamp-2">
              {seoValueProp}
            </p>
          )}
          {seoGenerationStatus === "completed" && skillMd && (
            <p className="text-[10px] text-green-600 mb-2">
              SKILL.md generated
            </p>
          )}

          <button
            onClick={async () => {
              setGeneratingSeo(true);
              try {
                await regenerateSeo({ packageId });
                toast.success("SEO content + SKILL.md generation started");
              } catch {
                toast.error("Failed to start generation");
              } finally {
                setGeneratingSeo(false);
              }
            }}
            disabled={generatingSeo || seoGenerationStatus === "generating"}
            className="text-xs px-3 py-1.5 rounded bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50">
            {seoGenerationStatus === "generating"
              ? "Generating..."
              : seoGenerationStatus === "completed"
                ? "Regenerate SEO + Skill"
                : "Generate SEO + Skill"}
          </button>
        </div>
      )}

      {!isSubmissionMode && badgeSnippet && (
        <div className="pt-2">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Badge Markdown
          </label>
          <div className="flex items-center gap-1">
            <code className="flex-1 text-[10px] text-text-secondary bg-bg-primary px-2 py-1 rounded overflow-x-auto whitespace-nowrap">
              {badgeSnippet}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(badgeSnippet);
                toast.success("Badge copied");
              }}
              className="shrink-0 text-xs px-2 py-1 rounded text-text-secondary hover:text-text-primary transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
