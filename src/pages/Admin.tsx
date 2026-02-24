import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth";
import { Toaster, toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { ComponentDetailsEditor } from "../components/ComponentDetailsEditor";
import Header from "../components/Header";
import {
  Eye,
  EyeSlash,
  Archive,
  Trash,
  GitPullRequest,
  CheckCircle,
  Warning,
  Hourglass,
  Package,
  DownloadSimple,
  CalendarBlank,
  List,
  CaretRight,
  CaretDown,
  MagnifyingGlass,
  X,
  GithubLogo,
  User,
  Envelope,
  DiscordLogo,
  ChatText,
  PaperPlaneTilt,
  ArrowBendUpLeft,
  Files,
  Scales,
  ArrowSquareOut,
  Globe,
  Prohibit,
  ChatCircleText,
  Star,
  SortAscending,
  Robot,
  Gear,
  XCircle,
  CaretUp,
  Browser,
  ArrowClockwise,
  Lightning,
  ClockCounterClockwise,
  ArrowsClockwise,
  Copy,
  Plus,
  PencilSimple,
  TrashSimple,
  Image,
  Upload,
  ArrowsDownUp,
  Clock,
  LinkSimple,
} from "@phosphor-icons/react";
import {
  ExternalLinkIcon as RadixExternalLinkIcon,
} from "@radix-ui/react-icons";

// Review status type
type ReviewStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "changes_requested"
  | "rejected";
type Visibility = "visible" | "hidden" | "archived";

// Get base path for navigation (always /components)
function useBasePath() {
  return "/components";
}

// Redirect non-admin users to their profile
function RedirectToProfile() {
  const basePath = useBasePath();
  
  useEffect(() => {
    window.location.replace(`${basePath}/profile`);
  }, [basePath]);
  
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
    </div>
  );
}

function PackageComponentDetailsEditor({
  packageId,
  componentName,
  slug,
  category,
  tags,
  shortDescription,
  longDescription,
  videoUrl,
  demoUrl,
  thumbnailUrl,
  convexVerified,
  authorUsername,
  authorAvatar,
  logoUrl,
  logoStorageId,
  selectedTemplateId,
  thumbnailGeneratedAt,
  seoGenerationStatus,
  seoGeneratedAt,
  seoGenerationError,
  seoValueProp,
  skillMd,
  npmDescription,
}: {
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
  logoUrl?: string;
  logoStorageId?: Id<"_storage">;
  selectedTemplateId?: Id<"thumbnailTemplates">;
  thumbnailGeneratedAt?: number;
  seoGenerationStatus?: string;
  seoGeneratedAt?: number;
  seoGenerationError?: string;
  seoValueProp?: string;
  skillMd?: string;
  npmDescription?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 p-3 rounded-lg bg-bg-hover/30 border border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Component Details
          </h4>
          <p className="text-xs text-text-secondary mt-1">
            Edit submitter provided component details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors"
        >
          {isOpen ? "Hide editor" : "Edit details"}
        </button>
      </div>

      {isOpen && (
        <ComponentDetailsEditor
          packageId={packageId}
          componentName={componentName}
          slug={slug}
          category={category}
          tags={tags}
          shortDescription={shortDescription}
          longDescription={longDescription}
          videoUrl={videoUrl}
          demoUrl={demoUrl}
          thumbnailUrl={thumbnailUrl}
          convexVerified={convexVerified}
          authorUsername={authorUsername}
          authorAvatar={authorAvatar}
          logoUrl={logoUrl}
          logoStorageId={logoStorageId}
          selectedTemplateId={selectedTemplateId}
          thumbnailGeneratedAt={thumbnailGeneratedAt}
          seoGenerationStatus={seoGenerationStatus}
          seoGeneratedAt={seoGeneratedAt}
          seoGenerationError={seoGenerationError}
          seoValueProp={seoValueProp}
          skillMd={skillMd}
          npmDescription={npmDescription}
        />
      )}
    </div>
  );
}

// Submitter email editor component for admin
function SubmitterEmailEditor({
  packageId,
  submitterEmail,
  additionalEmails,
}: {
  packageId: Id<"packages">;
  submitterEmail?: string;
  additionalEmails?: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(submitterEmail || "");
  const [addEmails, setAddEmails] = useState(additionalEmails?.join(", ") || "");
  const [isSaving, setIsSaving] = useState(false);

  const updateSubmitterEmail = useMutation(api.packages.updateSubmitterEmail);
  const updateAdditionalEmails = useMutation(api.packages.updateAdditionalEmails);

  // Reset form when props change
  useEffect(() => {
    setEmail(submitterEmail || "");
    setAddEmails(additionalEmails?.join(", ") || "");
  }, [submitterEmail, additionalEmails]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update primary email if changed
      if (email !== submitterEmail) {
        await updateSubmitterEmail({ packageId, submitterEmail: email });
      }
      // Update additional emails
      const emailList = addEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@"));
      await updateAdditionalEmails({ packageId, additionalEmails: emailList });
      toast.success("Submitter info updated");
      setIsEditing(false);
    } catch (err) {
      toast.error("Failed to update submitter info");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-bg-hover/50 text-xs">
        <span className="flex items-center gap-1 text-text-secondary">
          <Envelope size={12} />
          <span className="font-medium">Primary:</span>
          {submitterEmail ? (
            <a
              href={`mailto:${submitterEmail}`}
              className="hover:text-text-primary"
              onClick={(e) => e.stopPropagation()}>
              {submitterEmail}
            </a>
          ) : (
            <span className="text-text-tertiary italic">Not set</span>
          )}
        </span>
        {additionalEmails && additionalEmails.length > 0 && (
          <span className="flex items-center gap-1 text-text-secondary">
            <Plus size={10} />
            <span className="font-medium">Additional:</span>
            {additionalEmails.join(", ")}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-border hover:bg-bg-hover transition-colors">
          <PencilSimple size={12} />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-lg bg-bg-hover/50 space-y-3"
      onClick={(e) => e.stopPropagation()}>
      <div className="text-xs font-medium text-text-primary">Edit Submitter Info</div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">
          Primary Email (links to user profile)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-primary text-text-primary outline-none focus:border-button"
        />
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">
          Additional Emails (comma separated, for multi-account access)
        </label>
        <input
          type="text"
          value={addEmails}
          onChange={(e) => setAddEmails(e.target.value)}
          placeholder="other@example.com, another@example.com"
          className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-primary text-text-primary outline-none focus:border-button"
        />
        <p className="text-[10px] text-text-tertiary mt-1">
          Users can access this submission from their profile using any of these emails.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(false)}
          disabled={isSaving}
          className="px-3 py-1 text-xs rounded border border-border text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !email}
          className="px-3 py-1 text-xs rounded bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50">
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function PackageMetadataEditor({
  packageId,
  initialName,
  initialDescription,
  initialNpmUrl,
  initialRepositoryUrl,
  initialHomepageUrl,
  initialInstallCommand,
  initialVersion,
  initialLicense,
  initialWeeklyDownloads,
  initialTotalFiles,
  initialLastPublish,
  initialCollaborators,
}: {
  packageId: Id<"packages">;
  initialName?: string;
  initialDescription?: string;
  initialNpmUrl?: string;
  initialRepositoryUrl?: string;
  initialHomepageUrl?: string;
  initialInstallCommand?: string;
  initialVersion?: string;
  initialLicense?: string;
  initialWeeklyDownloads?: number;
  initialTotalFiles?: number;
  initialLastPublish?: string;
  initialCollaborators?: Array<{ name: string; avatar: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [npmUrl, setNpmUrl] = useState(initialNpmUrl ?? "");
  const [repositoryUrl, setRepositoryUrl] = useState(initialRepositoryUrl ?? "");
  const [homepageUrl, setHomepageUrl] = useState(initialHomepageUrl ?? "");
  const [installCommand, setInstallCommand] = useState(initialInstallCommand ?? "");
  const [version, setVersion] = useState(initialVersion ?? "");
  const [license, setLicense] = useState(initialLicense ?? "");
  const [weeklyDownloads, setWeeklyDownloads] = useState(
    initialWeeklyDownloads?.toString() ?? "",
  );
  const [totalFiles, setTotalFiles] = useState(initialTotalFiles?.toString() ?? "");
  const [lastPublish, setLastPublish] = useState(initialLastPublish ?? "");
  const [collaboratorsText, setCollaboratorsText] = useState(() =>
    (initialCollaborators ?? [])
      .map((c) => `${c.name} | ${c.avatar}`)
      .join("\n"),
  );
  const updateMetadata = useMutation(api.packages.updatePackageSourceMetadata);

  const parseNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : NaN;
  };

  const parseCollaborators = (value: string) => {
    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: Array<{ name: string; avatar: string }> = [];
    for (const line of lines) {
      const [namePart, avatarPart] = line.split("|").map((part) => part.trim());
      if (!namePart || !avatarPart) {
        return null;
      }
      parsed.push({ name: namePart, avatar: avatarPart });
    }
    return parsed;
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-bg-hover/30 border border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Package Metadata
          </h4>
          <p className="text-xs text-text-secondary mt-1">
            Manual override for npm and repository sourced fields.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors"
        >
          {isOpen ? "Hide editor" : "Edit metadata"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Package Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary resize-y outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                npm URL
              </label>
              <input
                type="text"
                value={npmUrl}
                onChange={(e) => setNpmUrl(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Repository URL
              </label>
              <input
                type="text"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Homepage URL
              </label>
              <input
                type="text"
                value={homepageUrl}
                onChange={(e) => setHomepageUrl(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Install Command
              </label>
              <input
                type="text"
                value={installCommand}
                onChange={(e) => setInstallCommand(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                License
              </label>
              <input
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Weekly Downloads
              </label>
              <input
                type="number"
                min="0"
                value={weeklyDownloads}
                onChange={(e) => setWeeklyDownloads(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                File Count
              </label>
              <input
                type="number"
                min="0"
                value={totalFiles}
                onChange={(e) => setTotalFiles(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Last Publish (ISO datetime)
              </label>
              <input
                type="text"
                value={lastPublish}
                onChange={(e) => setLastPublish(e.target.value)}
                placeholder="2026-02-14T12:00:00.000Z"
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
                Collaborators (one per line: Name | Avatar URL)
              </label>
              <textarea
                value={collaboratorsText}
                onChange={(e) => setCollaboratorsText(e.target.value)}
                rows={4}
                placeholder={"Jane Doe | https://example.com/avatar.png"}
                className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary resize-y outline-none focus:ring-1 focus:ring-button"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  try {
                    const parsedWeeklyDownloads = parseNumber(weeklyDownloads);
                    if (Number.isNaN(parsedWeeklyDownloads)) {
                      toast.error("Weekly downloads must be a valid number");
                      return;
                    }
                    const parsedTotalFiles = parseNumber(totalFiles);
                    if (Number.isNaN(parsedTotalFiles)) {
                      toast.error("File count must be a valid number");
                      return;
                    }

                    const parsedCollaborators = parseCollaborators(collaboratorsText);
                    if (parsedCollaborators === null) {
                      toast.error(
                        "Each collaborator line must be in the format: Name | Avatar URL",
                      );
                      return;
                    }

                    await updateMetadata({
                      packageId,
                      name: name.trim() || undefined,
                      description: description.trim() || undefined,
                      npmUrl: npmUrl.trim() || undefined,
                      repositoryUrl: repositoryUrl.trim() || undefined,
                      homepageUrl: homepageUrl.trim() || undefined,
                      installCommand: installCommand.trim() || undefined,
                      version: version.trim() || undefined,
                      license: license.trim() || undefined,
                      weeklyDownloads: parsedWeeklyDownloads,
                      totalFiles: parsedTotalFiles,
                      lastPublish: lastPublish.trim() || undefined,
                      collaborators:
                        parsedCollaborators.length > 0
                          ? parsedCollaborators
                          : undefined,
                    });
                    toast.success("Package metadata saved");
                  } catch (error) {
                    const msg =
                      error instanceof Error
                        ? error.message
                        : "Could not save package metadata";
                    toast.error(msg);
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-full bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save metadata"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComponentDetailQuickLink({ slug }: { slug?: string }) {
  if (!slug) return null;

  const basePath = window.location.pathname.startsWith("/components")
    ? "/components"
    : "";
  const detailUrl = `${basePath}/${slug}`;

  return (
    <Tooltip content="Open component detail page" position="top">
      <a
        href={detailUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Open component detail page in a new tab"
        className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
      >
        <RadixExternalLinkIcon className="w-3.5 h-3.5" />
      </a>
    </Tooltip>
  );
}

// Custom tooltip component - supports top/bottom positioning
function Tooltip({
  children,
  content,
  position = "bottom",
}: {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom";
}) {
  return (
    <div className="relative group">
      {children}
      {position === "top" ? (
        <div className="absolute z-50 px-2 py-1 text-xs font-normal text-white bg-dark rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-1">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark" />
        </div>
      ) : (
        <div className="absolute z-50 px-2 py-1 text-xs font-normal text-white bg-dark rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap top-full left-1/2 -translate-x-1/2 mt-1">
          {content}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-dark" />
        </div>
      )}
    </div>
  );
}

// Custom confirmation modal
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes",
  cancelText = "No",
  type = "warning",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger";
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm p-6 rounded-container bg-white border border-border shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`shrink-0 ${type === "danger" ? "text-red-600" : "text-yellow-600"}`}
          >
            <Warning size={24} weight="bold" />
          </div>
          <div>
            <h3 className="text-lg font-normal text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-normal border border-border text-text-primary hover:bg-bg-hover transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-full text-sm font-normal text-white transition-colors ${
              type === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-button hover:bg-button-hover"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Notes panel for package - shows threaded notes with reply capability
function NotesPanel({
  packageId,
  packageName,
  userEmail,
  userName,
  isOpen,
  onClose,
}: {
  packageId: Id<"packages">;
  packageName: string;
  userEmail: string;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newNote, setNewNote] = useState("");
  const [replyingTo, setReplyingTo] = useState<Id<"packageNotes"> | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notes = useQuery(api.packages.getPackageNotes, { packageId });
  const addNote = useMutation(api.packages.addPackageNote);
  const deleteNote = useMutation(api.packages.deletePackageNote);
  const markAsRead = useMutation(api.packages.markNotesAsReadForAdmin);
  const unreadCount = useQuery(api.packages.getUnreadUserNotesCount, { packageId });

  // Auto-mark as read when panel opens and there are unread notes
  useEffect(() => {
    if (isOpen && unreadCount && unreadCount > 0) {
      markAsRead({ packageId });
    }
  }, [isOpen, unreadCount, packageId, markAsRead]);

  // Handle ESC key to close panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Separate top-level notes and replies
  const topLevelNotes = notes?.filter((n) => !n.parentNoteId) || [];
  const getReplies = (parentId: Id<"packageNotes">) =>
    notes?.filter((n) => n.parentNoteId === parentId) || [];

  const handleAddNote = async () => {
    if (!newNote.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addNote({
        packageId,
        content: newNote.trim(),
        authorEmail: userEmail,
        authorName: userName,
      });
      setNewNote("");
      toast.success("Note added");
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentNoteId: Id<"packageNotes">) => {
    if (!replyContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addNote({
        packageId,
        content: replyContent.trim(),
        authorEmail: userEmail,
        authorName: userName,
        parentNoteId,
      });
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Reply added");
    } catch (error) {
      toast.error("Failed to add reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: Id<"packageNotes">) => {
    try {
      await deleteNote({ noteId });
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const formatNoteDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-container bg-white border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-lg font-normal text-text-primary">
              Admin Notes
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            <p className="text-xs text-text-secondary truncate max-w-xs">
              {packageName}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Internal only. Not visible to users.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount !== undefined && unreadCount > 0 && (
              <button
                onClick={() => markAsRead({ packageId })}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notes === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-button"></div>
            </div>
          ) : topLevelNotes.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No notes yet. Add the first note below.
            </p>
          ) : (
            topLevelNotes.map((note) => (
              <div key={note._id} className="space-y-2">
                {/* Main note */}
                <div className="p-3 rounded-lg bg-bg-hover/50 border border-border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <User size={12} />
                      <span className="font-medium">
                        {note.authorName || note.authorEmail.split("@")[0]}
                      </span>
                      <span>{formatNoteDate(note.createdAt)}</span>
                    </div>
                    {note.authorEmail === userEmail && (
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-text-secondary hover:text-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setReplyingTo(replyingTo === note._id ? null : note._id)
                      }
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <ArrowBendUpLeft size={12} />
                      Reply
                      {note.replyCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-bg-primary text-text-secondary">
                          {note.replyCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {getReplies(note._id).length > 0 && (
                  <div className="ml-4 space-y-2 border-l-2 border-border pl-3">
                    {getReplies(note._id).map((reply) => (
                      <div
                        key={reply._id}
                        className="p-2 rounded-lg bg-bg-primary border border-border"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <User size={10} />
                            <span className="font-medium">
                              {reply.authorName ||
                                reply.authorEmail.split("@")[0]}
                            </span>
                            <span>{formatNoteDate(reply.createdAt)}</span>
                          </div>
                          {reply.authorEmail === userEmail && (
                            <button
                              onClick={() => handleDeleteNote(reply._id)}
                              className="text-text-secondary hover:text-red-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === note._id && (
                  <div className="ml-4 flex gap-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply... (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button transition-colors resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddReply(note._id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddReply(note._id)}
                      disabled={isSubmitting || !replyContent.trim()}
                      className="px-3 py-2 rounded-lg bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 self-end"
                    >
                      <PaperPlaneTilt size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add note input */}
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-text-secondary mb-2">
            Press Enter to send, Shift+Enter for new line
          </p>
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button transition-colors resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <button
              onClick={handleAddNote}
              disabled={isSubmitting || !newNote.trim()}
              className="px-4 py-2 rounded-lg bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 self-end"
            >
              <PaperPlaneTilt size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notes button with count badge and unreplied user request indicator
function NotesButton({
  packageId,
  packageName,
  userEmail,
  userName,
}: {
  packageId: Id<"packages">;
  packageName: string;
  userEmail: string;
  userName?: string;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const noteCount = useQuery(api.packages.getPackageNoteCount, { packageId });
  const unrepliedCount = useQuery(api.packages.getUnrepliedUserRequestCount, { packageId });
  const unreadCount = useQuery(api.packages.getUnreadUserNotesCount, { packageId });

  // Show red badge if there are unreplied user requests or unread notes, otherwise orange for total notes
  const hasUnreplied = unrepliedCount !== undefined && unrepliedCount > 0;
  const hasUnread = unreadCount !== undefined && unreadCount > 0;
  const badgeCount = hasUnreplied ? unrepliedCount : hasUnread ? unreadCount : noteCount;
  const badgeColor = hasUnreplied ? "bg-red-500" : hasUnread ? "bg-blue-500" : "bg-orange-500";

  return (
    <>
      <Tooltip
        content={
          hasUnreplied
            ? `${unrepliedCount} unreplied user request${unrepliedCount > 1 ? "s" : ""}`
            : hasUnread
              ? `${unreadCount} unread user note${unreadCount > 1 ? "s" : ""}`
              : `Admin notes (internal)${noteCount ? ` (${noteCount})` : ""}`
        }
      >
        <button
          onClick={() => setShowNotes(true)}
          className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            hasUnreplied
              ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              : hasUnread
                ? "border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                : "border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          }`}
        >
          <ChatText size={14} weight="bold" />
          <span className="hidden sm:inline">Notes</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span
              className={`absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full ${badgeColor} text-white`}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      </Tooltip>

      <NotesPanel
        packageId={packageId}
        packageName={packageName}
        userEmail={userEmail}
        userName={userName}
        isOpen={showNotes}
        onClose={() => setShowNotes(false)}
      />
    </>
  );
}

// Small indicator for unreplied user requests (shown in collapsed package row)
function UnrepliedNotesIndicator({ packageId }: { packageId: Id<"packages"> }) {
  const unrepliedCount = useQuery(api.packages.getUnrepliedUserRequestCount, { packageId });

  if (!unrepliedCount || unrepliedCount === 0) return null;

  return (
    <Tooltip content={`${unrepliedCount} unreplied user request${unrepliedCount > 1 ? "s" : ""}`}>
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600 border border-red-200 shrink-0">
        <ChatText size={10} weight="bold" />
        {unrepliedCount}
      </span>
    </Tooltip>
  );
}

// Comments panel for package - public comments visible on frontend
function CommentsPanel({
  packageId,
  packageName,
  userEmail,
  userName,
  isOpen,
  onClose,
}: {
  packageId: Id<"packages">;
  packageName: string;
  userEmail: string;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = useQuery(api.packages.getPackageComments, { packageId });
  const addComment = useMutation(api.packages.addPackageComment);
  const deleteComment = useMutation(api.packages.deletePackageComment);
  const markAsRead = useMutation(api.packages.markCommentsAsReadForAdmin);
  const unreadCount = useQuery(api.packages.getUnreadCommentsCount, { packageId });

  // Auto-mark as read when panel opens and there are unread comments
  useEffect(() => {
    if (isOpen && unreadCount && unreadCount > 0) {
      markAsRead({ packageId });
    }
  }, [isOpen, unreadCount, packageId, markAsRead]);

  // Handle ESC key to close panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addComment({
        packageId,
        content: newComment.trim(),
        authorEmail: userEmail,
        authorName: userName,
      });
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: Id<"packageComments">) => {
    try {
      await deleteComment({ commentId });
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const formatCommentDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-container bg-white border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-lg font-normal text-text-primary">
              Public Comments
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-600">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            <p className="text-xs text-text-secondary truncate max-w-xs">
              {packageName}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Visible to users on the frontend.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount !== undefined && unreadCount > 0 && (
              <button
                onClick={() => markAsRead({ packageId })}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-button"></div>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No comments yet. Add the first comment below.
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment._id}
                className="p-3 rounded-lg bg-bg-hover/50 border border-border"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <User size={12} />
                    <span className="font-medium">
                      {comment.authorName || comment.authorEmail.split("@")[0]}
                    </span>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                  </div>
                  {comment.authorEmail === userEmail && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-text-secondary hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Add comment input */}
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-text-secondary mb-2">
            Press Enter to send, Shift+Enter for new line
          </p>
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a public comment..."
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button transition-colors resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || !newComment.trim()}
              className="px-4 py-2 rounded-lg bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 self-end"
            >
              <PaperPlaneTilt size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Comments button with count badge and unread indicator
function CommentsButton({
  packageId,
  packageName,
  userEmail,
  userName,
}: {
  packageId: Id<"packages">;
  packageName: string;
  userEmail: string;
  userName?: string;
}) {
  const [showComments, setShowComments] = useState(false);
  const commentCount = useQuery(api.packages.getPackageCommentCount, {
    packageId,
  });
  const unreadCount = useQuery(api.packages.getUnreadCommentsCount, {
    packageId,
  });

  const hasUnread = unreadCount !== undefined && unreadCount > 0;
  const badgeCount = hasUnread ? unreadCount : commentCount;
  const badgeColor = hasUnread ? "bg-blue-500" : "bg-green-500";

  return (
    <>
      <Tooltip
        content={
          hasUnread
            ? `${unreadCount} unread comment${unreadCount > 1 ? "s" : ""}`
            : `Public comments${commentCount ? ` (${commentCount})` : ""}`
        }
      >
        <button
          onClick={() => setShowComments(true)}
          className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            hasUnread
              ? "border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              : "border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
          }`}
        >
          <ChatCircleText size={14} weight="bold" />
          <span className="hidden sm:inline">Comments</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full ${badgeColor} text-white`}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      </Tooltip>

      <CommentsPanel
        packageId={packageId}
        packageName={packageName}
        userEmail={userEmail}
        userName={userName}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  );
}

// AI Review status type
type AiReviewStatus =
  | "not_reviewed"
  | "reviewing"
  | "passed"
  | "failed"
  | "partial"
  | "error";

// AI Review button component
function AiReviewButton({
  packageId,
  packageName,
  repositoryUrl,
}: {
  packageId: Id<"packages">;
  packageName: string;
  repositoryUrl?: string;
}) {
  const [isReviewing, setIsReviewing] = useState(false);
  const runAiReview = useAction(api.aiReview.runAiReview);

  const handleReview = async () => {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      await runAiReview({ packageId });
      toast.success("AI review completed!");
    } catch (error) {
      toast.error("AI review failed");
    } finally {
      setIsReviewing(false);
    }
  };

  const tooltipContent = !repositoryUrl
    ? "No repository URL available for AI review"
    : isReviewing
      ? "AI review in progress..."
      : "Run AI review against Convex component specs";

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={handleReview}
        disabled={isReviewing || !repositoryUrl}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Robot
          size={14}
          weight="bold"
          className={isReviewing ? "animate-pulse" : ""}
        />
        <span className="hidden sm:inline">
          {isReviewing ? "Reviewing..." : "AI Review"}
        </span>
      </button>
    </Tooltip>
  );
}

// AI Review status badge
function AiReviewStatusBadge({
  status,
}: {
  status: AiReviewStatus | undefined;
}) {
  if (!status || status === "not_reviewed") return null;

  const config: Record<
    Exclude<AiReviewStatus, "not_reviewed">,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    reviewing: {
      icon: <Robot size={12} weight="bold" className="animate-pulse" />,
      label: "AI Reviewing...",
      className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    },
    passed: {
      icon: <CheckCircle size={12} weight="bold" />,
      label: "AI Passed",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    failed: {
      icon: <XCircle size={12} weight="bold" />,
      label: "AI Failed",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
    partial: {
      icon: <Warning size={12} weight="bold" />,
      label: "AI Partial",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
    error: {
      icon: <XCircle size={12} weight="bold" />,
      label: "AI Error",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
  };

  const { icon, label, className } = config[status];

  return (
    <Tooltip content={`AI Review Status: ${label}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    </Tooltip>
  );
}

// AI Review results panel with copy functionality
function AiReviewResultsPanel({
  aiReviewStatus,
  aiReviewSummary,
  aiReviewCriteria,
  aiReviewError,
  aiReviewedAt,
  packageName,
  collaborators,
  npmUrl,
  repositoryUrl,
}: {
  aiReviewStatus?: AiReviewStatus;
  aiReviewSummary?: string;
  aiReviewCriteria?: Array<{ name: string; passed: boolean; notes: string }>;
  aiReviewError?: string;
  aiReviewedAt?: number;
  packageName?: string;
  collaborators?: Array<{ name: string; avatar: string }>;
  npmUrl?: string;
  repositoryUrl?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copy AI review results to clipboard in Notion-friendly format
  const handleCopyResults = () => {
    const statusText =
      aiReviewStatus === "passed"
        ? "PASSED"
        : aiReviewStatus === "partial"
          ? "PARTIAL"
          : aiReviewStatus === "failed"
            ? "FAILED"
            : aiReviewStatus?.toUpperCase() || "UNKNOWN";

    const maintainerList =
      collaborators && collaborators.length > 0
        ? collaborators.map((c) => c.name).join(", ")
        : "N/A";

    const criteriaList =
      aiReviewCriteria && aiReviewCriteria.length > 0
        ? aiReviewCriteria
            .map((c) => `${c.passed ? "[x]" : "[ ]"} ${c.name}\n    ${c.notes}`)
            .join("\n")
        : "No criteria available";

    const reviewDate = aiReviewedAt
      ? new Date(aiReviewedAt).toLocaleDateString()
      : "N/A";

    const text = `## AI Review: ${packageName || "Unknown Package"}

**Status:** ${statusText}
**Reviewed:** ${reviewDate}

### Package Info
- **npm:** ${npmUrl || "N/A"}
- **GitHub:** ${repositoryUrl || "N/A"}
- **Maintainers:** ${maintainerList}

### Summary
${aiReviewSummary || "No summary available"}

### Criteria Checklist
${criteriaList}
${aiReviewError ? `\n### Error\n${aiReviewError}` : ""}
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("AI review copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!aiReviewStatus || aiReviewStatus === "not_reviewed") {
    return null;
  }

  if (aiReviewStatus === "reviewing") {
    return (
      <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <Robot size={16} weight="bold" className="animate-pulse" />
          <span className="text-sm font-medium">AI Review in progress...</span>
        </div>
      </div>
    );
  }

  // Determine pass/fail icon based on status
  const statusIcon =
    aiReviewStatus === "passed" ? (
      <CheckCircle size={18} weight="bold" className="text-green-600" />
    ) : aiReviewStatus === "partial" ? (
      <Warning size={18} weight="bold" className="text-yellow-600" />
    ) : (
      <XCircle size={18} weight="bold" className="text-red-600" />
    );

  return (
    <div className="mt-3 p-3 rounded-lg bg-bg-hover border border-border">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Pass/Fail icon at start */}
          {statusIcon}
          <span className="text-sm font-medium text-text-primary">
            AI Review Results
          </span>
          {aiReviewedAt && (
            <span className="text-xs text-text-secondary">
              {new Date(aiReviewedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Copy button */}
          <Tooltip content={copied ? "Copied!" : "Copy results for Notion"}>
            <button
              onClick={handleCopyResults}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors rounded hover:bg-bg-primary"
            >
              <Copy size={16} weight={copied ? "fill" : "regular"} />
            </button>
          </Tooltip>
          {/* Expand/collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </button>
        </div>
      </div>

      {/* Summary */}
      {aiReviewSummary && (
        <div className="text-sm text-text-secondary mb-2 whitespace-pre-wrap">
          {aiReviewSummary}
        </div>
      )}

      {/* Error */}
      {aiReviewError && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-sm text-red-600 mb-2">
          <strong>Error:</strong> {aiReviewError}
        </div>
      )}

      {/* Expanded criteria */}
      {isExpanded && aiReviewCriteria && aiReviewCriteria.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-text-secondary mb-2">
            Criteria Checklist
          </div>
          {aiReviewCriteria.map((criterion, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 rounded bg-bg-primary"
            >
              {criterion.passed ? (
                <CheckCircle
                  size={14}
                  weight="bold"
                  className="text-green-600 shrink-0 mt-0.5"
                />
              ) : (
                <XCircle
                  size={14}
                  weight="bold"
                  className="text-red-600 shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">
                  {criterion.name}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {criterion.notes}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Refresh NPM Data button component with status indicator
function RefreshNpmButton({
  packageId,
  packageName,
  lastRefreshedAt,
  refreshError,
}: {
  packageId: Id<"packages">;
  packageName: string;
  lastRefreshedAt?: number;
  refreshError?: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshNpmData = useAction(api.packages.refreshNpmData);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshNpmData({ packageId });
      toast.success("NPM data refreshed!");
    } catch (error) {
      toast.error("Failed to refresh NPM data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Refresh error indicator */}
      {refreshError && (
        <Tooltip content={`Refresh failed: ${refreshError}`}>
          <div className="flex items-center text-orange-500">
            <Warning size={14} weight="bold" />
          </div>
        </Tooltip>
      )}

      {/* Last refreshed time */}
      {lastRefreshedAt && !refreshError && (
        <span className="text-[10px] text-text-secondary hidden lg:inline">
          {formatRelativeTime(lastRefreshedAt)}
        </span>
      )}

      {/* Refresh button */}
      <Tooltip content="Refresh package data from npm">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowClockwise
            size={12}
            className={isRefreshing ? "animate-spin" : ""}
          />
          <span className="hidden sm:inline">
            {isRefreshing ? "Refreshing..." : "refresh"}
          </span>
        </button>
      </Tooltip>
    </div>
  );
}

// Generate Slug button component (shown when package has no slug)
function GenerateSlugButton({
  packageId,
  packageName,
  currentSlug,
}: {
  packageId: Id<"packages">;
  packageName: string;
  currentSlug?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateSlug = useMutation(api.packages.generateSlugForPackage);

  // Only show button if there's no slug
  if (currentSlug && currentSlug.trim() !== "") {
    return null;
  }

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const slug = await generateSlug({ packageId });
      if (slug) {
        toast.success(`Slug generated: ${slug}`);
      } else {
        toast.error("Could not generate slug");
      }
    } catch {
      toast.error("Failed to generate slug");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Tooltip content="Generate URL slug for detail page">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleGenerate();
        }}
        disabled={isGenerating}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LinkSimple size={12} className={isGenerating ? "animate-pulse" : ""} />
        <span className="hidden sm:inline">
          {isGenerating ? "..." : "slug"}
        </span>
      </button>
    </Tooltip>
  );
}

// Status Legend component for admin dashboard
function StatusLegend() {
  const legendItems: {
    label: string;
    color: string;
  }[] = [
    { label: "Approved", color: "bg-green-500" },
    { label: "In Review", color: "bg-blue-500" },
    { label: "Changes", color: "bg-orange-500" },
    { label: "Pending", color: "bg-yellow-500" },
    { label: "Rejected", color: "bg-red-500" },
    { label: "Featured", color: "bg-amber-500" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-3 px-4 rounded-lg border border-border bg-bg-card mt-4">
      <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
        Status
      </span>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
          <span className="text-xs text-text-secondary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { isAuthenticated, isLoading: authLoading, signIn, signOut } = useAuth();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = useQuery(api.auth.isAdmin);
  const [searchTerm, setSearchTerm] = useState("");

  // Loading state
  const isLoading = authLoading || (isAuthenticated && (loggedInUser === undefined || isAdmin === undefined));

  // Use search query when there's a search term, otherwise use all packages
  const searchResults = useQuery(api.packages.adminSearchPackages, {
    searchTerm: searchTerm.trim(),
  });
  const allPackages = useQuery(api.packages.getAllPackages);

  // Use search results when searching, otherwise use all packages
  const packages = searchTerm.trim() ? searchResults : allPackages;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Global header with auth */}
      <Header />

      {/* Admin-specific search bar */}
      {loggedInUser && isAdmin && (
        <div className="sticky top-14 z-10 backdrop-blur-sm px-4 sm:px-6 py-2 bg-bg-primary border-b border-border">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <span className="text-text-primary font-medium text-sm">Admin Dashboard</span>
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="text"
                  placeholder="Search packages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-full border border-border bg-bg-card text-text-primary text-sm outline-none focus:border-button transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
          </div>
        ) : !isAuthenticated ? (
          // Not logged in - show sign in button
          <div className="max-w-md mx-auto">
            <div className="rounded-lg border border-border p-6 bg-bg-card">
              <h2 className="text-xl font-light mb-4 text-text-primary">
                Admin Sign In
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Admin access only.
              </p>
              <button
                onClick={() => {
                  // Save current path to return after sign-in
                  localStorage.setItem("authReturnPath", window.location.pathname);
                  signIn();
                }}
                className="w-full px-6 py-3 rounded-full font-normal bg-button text-white hover:bg-button-hover transition-colors text-sm">
                Sign In
              </button>
            </div>
          </div>
        ) : !isAdmin ? (
          // Logged in but not admin - redirect to profile
          <RedirectToProfile />
        ) : (
          // Admin dashboard
          <AdminDashboard
            userEmail={loggedInUser.email}
            packages={packages}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}

// Status badge component with GitHub-like styling
function StatusBadge({ status }: { status: ReviewStatus | undefined }) {
  const displayStatus = status || "pending";

  const config: Record<
    ReviewStatus,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    pending: {
      icon: <Hourglass size={14} weight="bold" />,
      label: "Pending",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
    in_review: {
      icon: <GitPullRequest size={14} weight="bold" />,
      label: "In Review",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    approved: {
      icon: <CheckCircle size={14} weight="bold" />,
      label: "Approved",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    changes_requested: {
      icon: <Warning size={14} weight="bold" />,
      label: "Changes",
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
    rejected: {
      icon: <Prohibit size={14} weight="bold" />,
      label: "Rejected",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
  };

  const { icon, label, className } = config[displayStatus];

  return (
    <Tooltip content={`Review Status: ${label}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    </Tooltip>
  );
}

// Visibility badge component
function VisibilityBadge({
  visibility,
  markedForDeletion,
}: {
  visibility: Visibility | undefined;
  markedForDeletion?: boolean;
}) {
  const displayVisibility = visibility || "visible";

  const config: Record<
    Visibility,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    visible: {
      icon: <Eye size={14} weight="bold" />,
      label: "Visible",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    hidden: {
      icon: <EyeSlash size={14} weight="bold" />,
      label: "Hidden",
      className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    },
    archived: {
      icon: <Archive size={14} weight="bold" />,
      label: "Archived",
      className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
  };

  const { icon, label, className } = config[displayVisibility];

  return (
    <div className="flex items-center gap-1">
      <Tooltip content={`Visibility: ${label}`}>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </span>
      </Tooltip>
      {markedForDeletion && (
        <Tooltip content="Marked for deletion by user">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-red-500/10 text-red-600 border-red-500/20">
            <Clock size={14} weight="bold" />
            <span className="hidden sm:inline">Deletion</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
}

// Inline action buttons component (replaces dropdown)
function InlineActions({
  packageId,
  currentStatus,
  currentVisibility,
  currentFeatured,
  userEmail,
  packageName,
  repositoryUrl,
  isArchivedView,
}: {
  packageId: Id<"packages">;
  currentStatus: ReviewStatus | undefined;
  currentVisibility: Visibility | undefined;
  currentFeatured: boolean | undefined;
  userEmail: string;
  packageName: string;
  repositoryUrl?: string;
  isArchivedView?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateReviewStatus = useMutation(api.packages.updateReviewStatus);
  const updateVisibility = useMutation(api.packages.updateVisibility);
  const deletePackage = useMutation(api.packages.deletePackage);
  const toggleFeatured = useMutation(api.packages.toggleFeatured);

  const status = currentStatus || "pending";
  const visibility = currentVisibility || "visible";
  const featured = currentFeatured || false;

  const handleUnarchive = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateVisibility({ packageId, visibility: "visible" });
      toast.success("Package unarchived");
    } catch (error) {
      toast.error("Failed to unarchive package");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ReviewStatus) => {
    if (isLoading || status === newStatus) return;
    setIsLoading(true);
    try {
      await updateReviewStatus({
        packageId,
        reviewStatus: newStatus,
        reviewedBy: userEmail,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: Visibility) => {
    if (isLoading || visibility === newVisibility) return;
    setIsLoading(true);
    try {
      await updateVisibility({ packageId, visibility: newVisibility });
      toast.success(
        `Package ${newVisibility === "visible" ? "shown" : newVisibility}`,
      );
    } catch (error) {
      toast.error("Failed to update visibility");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await deletePackage({ packageId });
      toast.success("Package deleted permanently");
    } catch (error) {
      toast.error("Failed to delete package");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = async () => {
    if (isLoading) return;
    // Only approved packages can be featured
    if (status !== "approved") {
      toast.error("Only approved packages can be featured");
      return;
    }
    setIsLoading(true);
    try {
      await toggleFeatured({ packageId });
      toast.success(featured ? "Package unfeatured" : "Package featured");
    } catch (error) {
      toast.error("Failed to toggle featured status");
    } finally {
      setIsLoading(false);
    }
  };

  // Review status button configs
  const statusButtons: {
    value: ReviewStatus;
    icon: React.ReactNode;
    label: string;
    activeClass: string;
    tooltip: string;
  }[] = [
    {
      value: "approved",
      icon: <CheckCircle size={14} weight="bold" />,
      label: "Approve",
      activeClass: "bg-green-600 text-white border-green-600",
      tooltip: "Mark as approved",
    },
    {
      value: "in_review",
      icon: <GitPullRequest size={14} weight="bold" />,
      label: "Review",
      activeClass: "bg-blue-600 text-white border-blue-600",
      tooltip: "Mark as in review",
    },
    {
      value: "changes_requested",
      icon: <Warning size={14} weight="bold" />,
      label: "Changes",
      activeClass: "bg-orange-600 text-white border-orange-600",
      tooltip: "Request changes",
    },
    {
      value: "pending",
      icon: <Hourglass size={14} weight="bold" />,
      label: "Pending",
      activeClass: "bg-yellow-600 text-white border-yellow-600",
      tooltip: "Reset to pending",
    },
    {
      value: "rejected",
      icon: <Prohibit size={14} weight="bold" />,
      label: "Reject",
      activeClass: "bg-red-600 text-white border-red-600",
      tooltip: "Reject this package",
    },
  ];

  // Visibility button configs
  const visibilityButtons: {
    value: Visibility;
    icon: React.ReactNode;
    label: string;
    activeClass: string;
    tooltip: string;
  }[] = [
    {
      value: "visible",
      icon: <Eye size={14} weight="bold" />,
      label: "Show",
      activeClass: "bg-green-600 text-white border-green-600",
      tooltip: "Make package visible",
    },
    {
      value: "hidden",
      icon: <EyeSlash size={14} weight="bold" />,
      label: "Hide",
      activeClass: "bg-gray-600 text-white border-gray-600",
      tooltip: "Hide from public view",
    },
    {
      value: "archived",
      icon: <Archive size={14} weight="bold" />,
      label: "Archive",
      activeClass: "bg-purple-600 text-white border-purple-600",
      tooltip: "Archive this package",
    },
  ];

  return (
    <>
      {/* Actions section with warm background */}
      <div className="mt-4 pt-4 px-4 pb-4 bg-[#FDFBF7] border-t border-border rounded-b-lg">
        {/* Review Status Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
          <span className="text-xs font-medium text-text-secondary w-16 shrink-0">
            Status
          </span>
          <div className="flex gap-1 flex-wrap">
            {statusButtons.map((btn) => (
              <Tooltip key={btn.value} content={btn.tooltip}>
                <button
                  onClick={() => handleStatusChange(btn.value)}
                  disabled={isLoading}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 ${
                    status === btn.value
                      ? btn.activeClass
                      : "border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  {btn.icon}
                  <span className="hidden sm:inline">{btn.label}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Visibility Buttons + Notes */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2">
          <span className="text-xs font-medium text-text-secondary w-16 shrink-0">
            {isArchivedView ? "Actions" : "Visibility"}
          </span>
          <div className="flex gap-1 flex-wrap">
            {isArchivedView ? (
              // Show Unarchive button for archived packages
              <Tooltip content="Restore package to main list">
                <button
                  onClick={handleUnarchive}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200 text-green-600 hover:bg-green-50 transition-all disabled:opacity-50"
                >
                  <Archive size={14} weight="bold" />
                  <span className="hidden sm:inline">Unarchive</span>
                </button>
              </Tooltip>
            ) : (
              // Show normal visibility buttons
              visibilityButtons.map((btn) => (
                <Tooltip key={btn.value} content={btn.tooltip}>
                  <button
                    onClick={() => handleVisibilityChange(btn.value)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 ${
                      visibility === btn.value
                        ? btn.activeClass
                        : "border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    {btn.icon}
                    <span className="hidden sm:inline">{btn.label}</span>
                  </button>
                </Tooltip>
              ))
            )}
            {/* Featured Button - only for approved packages */}
            <Tooltip
              content={
                status !== "approved"
                  ? "Only approved packages can be featured"
                  : featured
                    ? "Remove from featured"
                    : "Mark as featured"
              }
            >
              <button
                onClick={handleToggleFeatured}
                disabled={isLoading || status !== "approved"}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 ${
                  featured
                    ? "bg-amber-600 text-white border-amber-600"
                    : status === "approved"
                      ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                      : "border-border text-text-secondary cursor-not-allowed"
                }`}
              >
                <Star size={14} weight={featured ? "fill" : "bold"} />
                <span className="hidden sm:inline">
                  {featured ? "Featured" : "Feature"}
                </span>
              </button>
            </Tooltip>
            {/* Notes Button - admin only (internal) */}
            <NotesButton
              packageId={packageId}
              packageName={packageName}
              userEmail={userEmail}
            />
            {/* Comments Button - public, visible on frontend */}
            <CommentsButton
              packageId={packageId}
              packageName={packageName}
              userEmail={userEmail}
            />
            {/* AI Review Button */}
            <AiReviewButton
              packageId={packageId}
              packageName={packageName}
              repositoryUrl={repositoryUrl}
            />
          </div>

          {/* Delete Button */}
          <div className="mt-2 sm:mt-0 sm:ml-auto">
            <Tooltip content="Permanently delete this package">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <Trash size={14} weight="bold" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Package?"
        message={`Are you sure you want to permanently delete "${packageName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}

// Inline edit form for a single category row
function CategoryEditForm({
  editingId,
  slug,
  label,
  description,
  sortOrder,
  enabled,
  saving,
  onSlugChange,
  onLabelChange,
  onDescriptionChange,
  onSortOrderChange,
  onEnabledChange,
  onSave,
  onCancel,
}: {
  editingId: string | null;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
  saving: boolean;
  onSlugChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSortOrderChange: (v: number) => void;
  onEnabledChange: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const formId = editingId || "new";
  return (
    <div className="rounded-lg border border-button/30 bg-bg-hover/50 p-4 space-y-3">
      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        {editingId ? "Edit Category" : "New Category"}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Slug (unique ID)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="e.g. ai"
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g. AI"
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Short description of this category"
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5 block">
            Sort Order
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => onSortOrderChange(Number(e.target.value))}
            className="w-full text-xs px-2 py-1.5 rounded bg-bg-primary text-text-primary outline-none focus:ring-1 focus:ring-button"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`cat-enabled-${formId}`}
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="rounded"
          />
          <label htmlFor={`cat-enabled-${formId}`} className="text-xs text-text-primary">
            Enabled (visible to public)
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-xs px-4 py-1.5 rounded-full bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : editingId ? "Update" : "Add"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Category Management Panel for admin settings
function CategoryManagementPanel() {
  const allCategories = useQuery(api.packages.listAllDirectoryCategories);
  // Fetch counts (same query the directory sidebar uses)
  const categoryCounts = useQuery(api.packages.listCategories);
  const upsertCategory = useMutation(api.packages.upsertCategory);
  const deleteCategory = useMutation(api.packages.deleteCategory);
  const seedCategories = useMutation(api.packages.seedCategories);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editEnabled, setEditEnabled] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Build a count map from the listCategories query (matches Directory sidebar)
  const countMap: Record<string, number> = {};
  if (categoryCounts) {
    for (const c of categoryCounts) {
      countMap[c.category] = c.count;
    }
  }

  // Seed defaults if empty
  useEffect(() => {
    if (allCategories && allCategories.length === 0) {
      seedCategories();
    }
  }, [allCategories, seedCategories]);

  // Start editing a category (inline)
  const startEdit = (cat: {
    _id: string;
    slug: string;
    label: string;
    description: string;
    sortOrder: number;
    enabled: boolean;
  }) => {
    setEditingId(cat._id);
    setEditSlug(cat.slug);
    setEditLabel(cat.label);
    setEditDescription(cat.description);
    setEditSortOrder(cat.sortOrder);
    setEditEnabled(cat.enabled);
    setShowAddForm(false);
  };

  // Start adding a new category (form at top)
  const startAdd = () => {
    setEditingId(null);
    setEditSlug("");
    setEditLabel("");
    setEditDescription("");
    setEditSortOrder(allCategories ? allCategories.length : 0);
    setEditEnabled(true);
    setShowAddForm(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!editSlug.trim() || !editLabel.trim()) {
      toast.error("Slug and label are required");
      return;
    }
    setSaving(true);
    try {
      await upsertCategory({
        id: editingId ? (editingId as Id<"categories">) : undefined,
        slug: editSlug.trim().toLowerCase().replace(/\s+/g, "-"),
        label: editLabel.trim(),
        description: editDescription.trim(),
        sortOrder: editSortOrder,
        enabled: editEnabled,
      });
      toast.success(editingId ? "Category updated" : "Category added");
      setEditingId(null);
      setShowAddForm(false);
    } catch (error) {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // Delete a category
  const handleDelete = async (id: string) => {
    try {
      await deleteCategory({ id: id as Id<"categories"> });
      toast.success("Category deleted");
      if (editingId === id) {
        setEditingId(null);
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
  };

  if (!allCategories) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-4 mb-6">
        <div className="animate-pulse h-6 bg-bg-secondary rounded w-40" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-primary">
          Category Management
        </h3>
        <button
          onClick={startAdd}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-button text-white hover:bg-button-hover transition-colors"
        >
          <Plus size={12} weight="bold" />
          Add Category
        </button>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        Manage categories that appear in the Submit form, Component Details
        editor, and the Directory page. Disabled categories are hidden from
        public views.
      </p>

      {/* New category form at top (only for adding, not editing) */}
      {showAddForm && !editingId && (
        <div className="mb-4">
          <CategoryEditForm
            editingId={null}
            slug={editSlug}
            label={editLabel}
            description={editDescription}
            sortOrder={editSortOrder}
            enabled={editEnabled}
            saving={saving}
            onSlugChange={setEditSlug}
            onLabelChange={setEditLabel}
            onDescriptionChange={setEditDescription}
            onSortOrderChange={setEditSortOrder}
            onEnabledChange={setEditEnabled}
            onSave={handleSave}
            onCancel={cancelEdit}
          />
        </div>
      )}

      {/* Category list with inline editing */}
      <div className="space-y-2">
        {allCategories.map((cat) => {
          const isEditing = editingId === cat._id;
          const componentCount = countMap[cat.slug] ?? 0;

          // Show inline edit form for this row
          if (isEditing) {
            return (
              <CategoryEditForm
                key={cat._id}
                editingId={cat._id}
                slug={editSlug}
                label={editLabel}
                description={editDescription}
                sortOrder={editSortOrder}
                enabled={editEnabled}
                saving={saving}
                onSlugChange={setEditSlug}
                onLabelChange={setEditLabel}
                onDescriptionChange={setEditDescription}
                onSortOrderChange={setEditSortOrder}
                onEnabledChange={setEditEnabled}
                onSave={handleSave}
                onCancel={cancelEdit}
              />
            );
          }

          // Normal category row
          return (
            <div
              key={cat._id}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                !cat.enabled
                  ? "border-border/50 bg-bg-primary/50 opacity-60"
                  : "border-border bg-bg-primary"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-text-primary">
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-mono text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded">
                    {cat.slug}
                  </span>
                  <span className="text-[10px] font-medium text-text-secondary bg-bg-secondary px-1.5 py-0.5 rounded">
                    {componentCount} {componentCount === 1 ? "component" : "components"}
                  </span>
                  {!cat.enabled && (
                    <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary truncate">
                  {cat.description}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                  title="Edit"
                >
                  <PencilSimple size={14} />
                </button>
                <button
                  onClick={() => handleDelete(cat._id)}
                  className="p-1.5 rounded text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <TrashSimple size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Auto-Refresh Settings Panel component
function AutoRefreshSettingsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRefreshApprovedConfirm, setShowRefreshApprovedConfirm] =
    useState(false);
  const [showRefreshAllConfirm, setShowRefreshAllConfirm] = useState(false);
  const [isRefreshingApproved, setIsRefreshingApproved] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const refreshSettings = useQuery(api.packages.getRefreshSettings);
  const refreshStats = useQuery(api.packages.getRefreshStats);
  const recentLogs = useQuery(api.packages.getRecentRefreshLogs);
  const updateRefreshSetting = useMutation(api.packages.updateRefreshSetting);
  const triggerRefreshApproved = useAction(
    api.packages.triggerManualRefreshAll,
  );
  const triggerRefreshAllPackages = useAction(
    api.packages.triggerManualRefreshAllPackages,
  );

  const handleToggleEnabled = async () => {
    if (!refreshSettings) return;
    try {
      await updateRefreshSetting({
        key: "autoRefreshEnabled",
        value: !refreshSettings.autoRefreshEnabled,
      });
      toast.success(
        refreshSettings.autoRefreshEnabled
          ? "Auto-refresh disabled"
          : "Auto-refresh enabled",
      );
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  const handleIntervalChange = async (days: number) => {
    try {
      await updateRefreshSetting({
        key: "refreshIntervalDays",
        value: days,
      });
      toast.success(`Refresh interval set to ${days} days`);
    } catch (error) {
      toast.error("Failed to update interval");
    }
  };

  // Refresh only approved packages
  const handleRefreshApproved = async () => {
    setShowRefreshApprovedConfirm(false);
    setIsRefreshingApproved(true);
    try {
      const result = await triggerRefreshApproved({});
      if (result.packagesQueued === 0) {
        toast.info("No approved packages to refresh");
      } else {
        toast.success(
          `Queued ${result.packagesQueued} approved packages for refresh`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start refresh",
      );
    } finally {
      setIsRefreshingApproved(false);
    }
  };

  // Refresh all packages regardless of status
  const handleRefreshAll = async () => {
    setShowRefreshAllConfirm(false);
    setIsRefreshingAll(true);
    try {
      const result = await triggerRefreshAllPackages({});
      if (result.packagesQueued === 0) {
        toast.info("No packages to refresh");
      } else {
        toast.success(`Queued ${result.packagesQueued} packages for refresh`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start refresh",
      );
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!refreshSettings || !refreshStats) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightning size={16} weight="bold" className="text-yellow-500" />
          <span className="text-sm font-medium text-text-primary">
            Auto-Refresh Settings
          </span>
          {refreshSettings.autoRefreshEnabled && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
              ON
            </span>
          )}
        </div>
        {isExpanded ? (
          <CaretUp size={16} className="text-text-secondary" />
        ) : (
          <CaretDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Info section */}
          <div className="p-3 rounded-lg bg-bg-hover text-xs text-text-secondary space-y-2">
            <p>
              Auto-refresh automatically updates npm package data (version,
              downloads, etc.) for approved packages on a schedule.
            </p>
            <p>
              The scheduler runs once per day (3:00 AM UTC), and the interval
              below controls which packages are considered stale.
            </p>
            <p>
              Only packages that haven't been refreshed within the interval will
              be updated. Maximum 100 packages per run.
            </p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Enable Auto-Refresh
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically refresh stale package data
              </p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                refreshSettings.autoRefreshEnabled
                  ? "bg-green-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  refreshSettings.autoRefreshEnabled
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Interval selector */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Refresh Interval
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                How often to refresh package data
              </p>
            </div>
            <select
              value={refreshSettings.refreshIntervalDays}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-white text-text-primary focus:outline-none focus:border-button"
            >
              <option value={3}>Every 3 days</option>
              <option value={5}>Every 5 days</option>
              <option value={7}>Every 7 days</option>
            </select>
          </div>

          {/* Stats section */}
          <div className="p-3 rounded-lg border border-border bg-white">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary text-xs">Needs Refresh</p>
                <p className="font-medium text-text-primary">
                  {refreshStats.packagesNeedingRefresh} of{" "}
                  {refreshStats.totalPackages}
                </p>
              </div>
              <div>
                <p className="text-text-secondary text-xs">Last Run</p>
                <p className="font-medium text-text-primary">
                  {refreshStats.lastRefreshRun
                    ? formatRelativeTime(refreshStats.lastRefreshRun.runAt)
                    : "Never"}
                </p>
              </div>
            </div>
            {refreshStats.lastRefreshRun && (
              <div className="mt-2 pt-2 border-t border-border text-xs text-text-secondary">
                Last run: {refreshStats.lastRefreshRun.packagesSucceeded}{" "}
                succeeded
                {refreshStats.lastRefreshRun.packagesFailed > 0 && (
                  <span className="text-red-600">
                    , {refreshStats.lastRefreshRun.packagesFailed} failed
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Manual refresh buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Refresh All Packages button */}
            <button
              onClick={() => setShowRefreshAllConfirm(true)}
              disabled={isRefreshingAll || isRefreshingApproved}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border bg-white text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowsClockwise
                size={16}
                className={isRefreshingAll ? "animate-spin" : ""}
              />
              {isRefreshingAll ? "Refreshing..." : "Refresh All Packages"}
            </button>
            {/* Refresh Approved Only button */}
            <button
              onClick={() => setShowRefreshApprovedConfirm(true)}
              disabled={isRefreshingApproved || isRefreshingAll}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-green-200 bg-white text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle
                size={16}
                weight="bold"
                className={isRefreshingApproved ? "animate-pulse" : ""}
              />
              {isRefreshingApproved ? "Refreshing..." : "Refresh Approved Only"}
            </button>
          </div>

          {/* Recent logs toggle */}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {showLogs ? <CaretDown size={12} /> : <CaretRight size={12} />}
            <ClockCounterClockwise size={12} />
            <span>Recent Refresh Logs ({recentLogs?.length || 0})</span>
          </button>

          {/* Recent logs list */}
          {showLogs && recentLogs && recentLogs.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log._id}
                  className="p-2 rounded-lg border border-border bg-white text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.status === "running" ? (
                        <ArrowsClockwise
                          size={12}
                          className="text-blue-500 animate-spin"
                        />
                      ) : log.packagesFailed > 0 ? (
                        <Warning size={12} className="text-yellow-500" />
                      ) : (
                        <CheckCircle size={12} className="text-green-500" />
                      )}
                      <span className="text-text-secondary">
                        {formatRelativeTime(log.runAt)}
                      </span>
                      {log.isManual && (
                        <span className="px-1 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                          manual
                        </span>
                      )}
                    </div>
                    <span className="text-text-primary">
                      {log.packagesSucceeded}/{log.packagesProcessed}
                    </span>
                  </div>
                  {log.errors.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-border">
                      <p className="text-red-600">
                        Failed:{" "}
                        {log.errors.map((e) => e.packageName).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh All Packages Confirmation Modal */}
      <ConfirmModal
        isOpen={showRefreshAllConfirm}
        onClose={() => setShowRefreshAllConfirm(false)}
        onConfirm={handleRefreshAll}
        title="Refresh All Packages?"
        message="This will refresh npm data for ALL packages (pending, in review, approved, changes requested, rejected), regardless of status or when they were last updated. This may take several minutes."
        confirmText="Refresh All"
        cancelText="Cancel"
        type="warning"
      />

      {/* Refresh Approved Only Confirmation Modal */}
      <ConfirmModal
        isOpen={showRefreshApprovedConfirm}
        onClose={() => setShowRefreshApprovedConfirm(false)}
        onConfirm={handleRefreshApproved}
        title="Refresh Approved Packages?"
        message={`This will refresh npm data for ${refreshStats.totalPackages} approved packages only, regardless of when they were last updated. This may take several minutes.`}
        confirmText="Refresh Approved"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
}

// Admin Settings Panel component
function AdminSettingsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const settings = useQuery(api.packages.getAdminSettings);
  const updateSetting = useMutation(api.packages.updateAdminSetting);

  const handleToggle = async (
    key:
      | "autoApproveOnPass"
      | "autoRejectOnFail"
      | "autoGenerateSeoOnPendingOrInReview"
      | "autoGenerateThumbnailOnSubmit"
      | "rotateThumbnailTemplatesOnSubmit",
    currentValue: boolean,
  ) => {
    try {
      await updateSetting({ key, value: !currentValue });
      toast.success("Setting updated");
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  if (!settings) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <Gear size={16} weight="bold" className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            AI Review Settings
          </span>
        </div>
        {isExpanded ? (
          <CaretUp size={16} className="text-text-secondary" />
        ) : (
          <CaretDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Info section */}
          <div className="p-3 rounded-lg bg-bg-hover text-xs text-text-secondary space-y-3">
            <div>
              <p className="font-medium text-text-primary">
                How AI Review Works
              </p>
              <p className="mt-1">
                The AI analyzes the package's GitHub repository against official{" "}
                <a
                  href="https://docs.convex.dev/components/authoring"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button hover:underline"
                >
                  Convex component specifications
                </a>
                . Suggestions reference the official documentation.
              </p>
            </div>

            <div>
              <p className="font-medium text-text-primary">Files Checked</p>
              <ul className="list-disc list-inside space-y-1 ml-1 mt-1">
                <li>
                  <code className="bg-bg-primary px-1 rounded">
                    convex.config.ts
                  </code>{" "}
                  in{" "}
                  <code className="bg-bg-primary px-1 rounded">
                    src/component/
                  </code>
                  , <code className="bg-bg-primary px-1 rounded">src/</code>, or
                  root (required)
                </li>
                <li>
                  Component files in{" "}
                  <code className="bg-bg-primary px-1 rounded">
                    src/component/
                  </code>{" "}
                  or{" "}
                  <code className="bg-bg-primary px-1 rounded">component/</code>{" "}
                  directory
                </li>
                <li>Root TypeScript files (fallback if no component dir)</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-text-primary">
                Critical Criteria (auto-reject if failed)
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1 mt-1">
                <li>
                  Has{" "}
                  <code className="bg-bg-primary px-1 rounded">
                    convex.config.ts
                  </code>{" "}
                  with{" "}
                  <code className="bg-bg-primary px-1 rounded">
                    defineComponent()
                  </code>
                </li>
                <li>Has component functions (queries, mutations, actions)</li>
                <li>
                  Functions use new syntax:{" "}
                  <code className="bg-bg-primary px-1 rounded">
                    query({"{ args, returns, handler }"})
                  </code>
                </li>
                <li>
                  All functions have{" "}
                  <code className="bg-bg-primary px-1 rounded">returns:</code>{" "}
                  validator
                </li>
                <li>
                  Uses{" "}
                  <code className="bg-bg-primary px-1 rounded">v.null()</code>{" "}
                  for void returns
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-text-primary">
                Non-Critical Criteria (partial pass if failed)
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1 mt-1">
                <li>
                  Uses{" "}
                  <code className="bg-bg-primary px-1 rounded">
                    withIndex()
                  </code>{" "}
                  not{" "}
                  <code className="bg-bg-primary px-1 rounded">filter()</code>
                </li>
                <li>Internal functions use internalQuery, etc.</li>
                <li>
                  Proper TypeScript types (
                  <code className="bg-bg-primary px-1 rounded">
                    Id&lt;"table"&gt;
                  </code>
                  )
                </li>
                <li>
                  Token-based authorization (when applicable, not all components
                  need auth)
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="font-medium text-text-primary">
                Official Documentation
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                <a
                  href="https://docs.convex.dev/components/authoring"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button hover:underline"
                >
                  Authoring
                </a>
                <a
                  href="https://docs.convex.dev/components/understanding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button hover:underline"
                >
                  Understanding
                </a>
                <a
                  href="https://docs.convex.dev/functions/validation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button hover:underline"
                >
                  Validation
                </a>
                <a
                  href="https://docs.convex.dev/understanding/best-practices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button hover:underline"
                >
                  Best Practices
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="font-medium text-text-primary">
                Review Status Icons
              </p>
              <div className="flex flex-wrap gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle
                    size={14}
                    weight="bold"
                    className="text-green-600"
                  />
                  <span>Passed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Warning
                    size={14}
                    weight="bold"
                    className="text-yellow-600"
                  />
                  <span>Partial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle size={14} weight="bold" className="text-red-600" />
                  <span>Failed/Error</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-approve toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Auto-approve on pass
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically approve packages when AI review passes all
                criteria
              </p>
            </div>
            <button
              onClick={() =>
                handleToggle("autoApproveOnPass", settings.autoApproveOnPass)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoApproveOnPass ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoApproveOnPass ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Auto-reject toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Auto-reject on fail
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically reject packages when AI review finds critical
                issues
              </p>
            </div>
            <button
              onClick={() =>
                handleToggle("autoRejectOnFail", settings.autoRejectOnFail)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoRejectOnFail ? "bg-red-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoRejectOnFail ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Auto-generate SEO on pending/in_review */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Auto-generate AI SEO on pending or in review
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically generate AI SEO content when review status changes
                to pending or in_review
              </p>
            </div>
            <button
              onClick={() =>
                handleToggle(
                  "autoGenerateSeoOnPendingOrInReview",
                  settings.autoGenerateSeoOnPendingOrInReview,
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoGenerateSeoOnPendingOrInReview
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoGenerateSeoOnPendingOrInReview
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Auto-generate thumbnail on submit */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Auto-generate thumbnail on submit
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically compose a thumbnail from the uploaded logo and
                default template when a component is submitted
              </p>
            </div>
            <button
              onClick={() =>
                handleToggle(
                  "autoGenerateThumbnailOnSubmit",
                  settings.autoGenerateThumbnailOnSubmit,
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoGenerateThumbnailOnSubmit
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoGenerateThumbnailOnSubmit
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Rotate templates on submit */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Rotate active templates on submit
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                If enabled, auto-generated thumbnails rotate across active
                templates instead of always using the default template
              </p>
            </div>
            <button
              onClick={() =>
                handleToggle(
                  "rotateThumbnailTemplatesOnSubmit",
                  settings.rotateThumbnailTemplatesOnSubmit,
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.rotateThumbnailTemplatesOnSubmit
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.rotateThumbnailTemplatesOnSubmit
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Deletion Management Panel component
function DeletionManagementPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const deletionSettings = useQuery(api.packages.getDeletionCleanupSettings);
  const packagesMarkedForDeletion = useQuery(api.packages.getPackagesMarkedForDeletion);
  const updateDeletionSetting = useMutation(api.packages.updateDeletionCleanupSetting);
  const permanentlyDelete = useMutation(api.packages.adminPermanentlyDeletePackage);

  const handleToggleAutoDelete = async () => {
    if (!deletionSettings) return;
    try {
      await updateDeletionSetting({
        key: "autoDeleteMarkedPackages",
        value: !deletionSettings.autoDeleteEnabled,
      });
      toast.success(
        deletionSettings.autoDeleteEnabled
          ? "Auto-delete disabled"
          : "Auto-delete enabled",
      );
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const handleIntervalChange = async (days: number) => {
    try {
      await updateDeletionSetting({
        key: "deleteIntervalDays",
        value: days,
      });
      toast.success(`Delete interval set to ${days} days`);
    } catch {
      toast.error("Failed to update interval");
    }
  };

  const handlePermanentDelete = async (packageId: Id<"packages">, packageName: string) => {
    if (!confirm(`Permanently delete "${packageName}"? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(packageId);
    try {
      await permanentlyDelete({ packageId });
      toast.success(`"${packageName}" permanently deleted`);
    } catch {
      toast.error("Failed to delete package");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const markedCount = packagesMarkedForDeletion?.length ?? 0;

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trash size={16} weight="bold" className="text-red-500" />
          <span className="text-sm font-medium text-text-primary">
            Deletion Management
          </span>
          {markedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
              {markedCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <CaretUp size={16} className="text-text-secondary" />
        ) : (
          <CaretDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && deletionSettings && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Auto-delete toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Auto-delete marked packages
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically delete packages after the waiting period
              </p>
            </div>
            <button
              onClick={handleToggleAutoDelete}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                deletionSettings.autoDeleteEnabled
                  ? "bg-red-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  deletionSettings.autoDeleteEnabled
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Waiting period interval */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Waiting period
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Days to wait before permanent deletion
              </p>
            </div>
            <select
              value={deletionSettings.deleteIntervalDays}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-white text-text-primary focus:outline-none focus:border-button"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days (default)</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          {/* Packages marked for deletion */}
          {markedCount > 0 ? (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Packages Marked for Deletion ({markedCount})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {packagesMarkedForDeletion?.map((pkg) => (
                  <div
                    key={pkg._id}
                    className="flex items-center justify-between p-2 rounded-lg border border-red-100 bg-red-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {pkg.componentName || pkg.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Marked: {formatDate(pkg.markedForDeletionAt)} by {pkg.markedForDeletionBy || "user"}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePermanentDelete(pkg._id, pkg.componentName || pkg.name)}
                      disabled={isDeleting === pkg._id}
                      className="ml-2 px-2 py-1 text-xs rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isDeleting === pkg._id ? "Deleting..." : "Delete Now"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-text-secondary text-center py-4">
                No packages are currently marked for deletion.
              </p>
            </div>
          )}

          {/* Info about cron */}
          <div className="p-3 rounded-lg bg-bg-hover text-xs text-text-secondary">
            <p>
              A scheduled job runs daily at 2 AM UTC to permanently delete packages
              that have been marked for deletion and have passed the waiting period.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SLUG MIGRATION PANEL ============

function SlugMigrationPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState<string | null>(null);

  const packagesWithoutSlugs = useQuery(api.packages.getPackagesWithoutSlugs);
  const generateSlugForPackage = useMutation(api.packages.generateSlugForPackage);
  const generateMissingSlugs = useMutation(api.packages.generateMissingSlugs);

  const missingCount = packagesWithoutSlugs?.length ?? 0;

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    try {
      const result = await generateMissingSlugs({});
      toast.success(`Generated ${result.generated} slugs (${result.skipped} skipped)`);
    } catch {
      toast.error("Failed to generate slugs");
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleGenerateSingle = async (packageId: Id<"packages">, packageName: string) => {
    setIsGeneratingSingle(packageId);
    try {
      const slug = await generateSlugForPackage({ packageId });
      if (slug) {
        toast.success(`Slug generated: ${slug}`);
      } else {
        toast.error("Could not generate slug");
      }
    } catch {
      toast.error("Failed to generate slug");
    } finally {
      setIsGeneratingSingle(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <LinkSimple size={16} weight="bold" className="text-orange-500" />
          <span className="text-sm font-medium text-text-primary">
            Slug Migration
          </span>
          {missingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">
              {missingCount} missing
            </span>
          )}
        </div>
        {isExpanded ? (
          <CaretUp size={16} className="text-text-secondary" />
        ) : (
          <CaretDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Info section */}
          <div className="p-3 rounded-lg bg-bg-hover text-xs text-text-secondary">
            <p>
              Components without URL slugs will not have detail pages at /components/:slug.
              Use this tool to auto-generate slugs from package names.
            </p>
          </div>

          {/* Generate all button */}
          {missingCount > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-text-primary">
                  Generate All Missing Slugs
                </label>
                <p className="text-xs text-text-secondary mt-0.5">
                  Auto-generate slugs for {missingCount} packages
                </p>
              </div>
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isGeneratingAll ? "Generating..." : `Generate ${missingCount} Slugs`}
              </button>
            </div>
          )}

          {/* Packages missing slugs list */}
          {missingCount > 0 ? (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Packages Missing Slugs ({missingCount})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {packagesWithoutSlugs?.map((pkg) => (
                  <div
                    key={pkg._id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-bg-primary"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {pkg.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Submitted {formatDate(pkg.submittedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={pkg.npmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs rounded border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                      >
                        npm
                      </a>
                      <button
                        onClick={() => handleGenerateSingle(pkg._id, pkg.name)}
                        disabled={isGeneratingSingle === pkg._id}
                        className="px-3 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingSingle === pkg._id ? "..." : "Generate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-green-600 text-center py-4 flex items-center justify-center gap-2">
                <CheckCircle size={16} />
                All packages have slugs. No migration needed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ THUMBNAIL TEMPLATE MANAGEMENT ============

function ThumbnailTemplatePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const templates = useQuery(api.thumbnails.listTemplates);
  const allPackages = useQuery(api.packages.getAllPackages);
  const generateUploadUrl = useMutation(api.packages.generateUploadUrl);
  const createTemplate = useMutation(api.thumbnails.createTemplate);
  const deleteTemplate = useMutation(api.thumbnails.deleteTemplate);
  const setDefaultTemplate = useMutation(api.thumbnails.setDefaultTemplate);
  const updateTemplate = useMutation(api.thumbnails.updateTemplate);
  const regenerateSelected = useAction(
    api.thumbnailGenerator.regenerateSelectedThumbnails,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    Id<"thumbnailTemplates"> | ""
  >("");
  const [componentDropdownOpen, setComponentDropdownOpen] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedPackageIds, setSelectedPackageIds] = useState<
    Array<Id<"packages">>
  >([]);
  const [isGeneratingSelected, setIsGeneratingSelected] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Upload a new background template
  const handleUploadTemplate = async (file: File) => {
    if (!newTemplateName.trim()) {
      toast.error("Enter a template name first");
      return;
    }
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResult.ok) throw new Error("Upload failed");
      const { storageId } = await uploadResult.json();
      await createTemplate({
        name: newTemplateName.trim(),
        storageId,
        isDefault: !templates || templates.length === 0,
      });
      setNewTemplateName("");
      toast.success("Template added");
    } catch {
      toast.error("Failed to upload template");
    } finally {
      setIsUploading(false);
    }
  };

  // Set a template as default
  const handleSetDefault = async (templateId: Id<"thumbnailTemplates">) => {
    try {
      await setDefaultTemplate({ templateId });
      toast.success("Default template updated");
    } catch {
      toast.error("Failed to set default");
    }
  };

  // Delete a template
  const handleDelete = async (templateId: Id<"thumbnailTemplates">) => {
    try {
      await deleteTemplate({ templateId });
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  // Toggle active state
  const handleToggleActive = async (
    templateId: Id<"thumbnailTemplates">,
    currentActive: boolean,
  ) => {
    try {
      await updateTemplate({ templateId, active: !currentActive });
      toast.success(currentActive ? "Template disabled" : "Template enabled");
    } catch {
      toast.error("Failed to update template");
    }
  };

  // Generate thumbnails for selected components from chosen template.
  const handleGenerateSelected = async () => {
    if (selectedPackageIds.length === 0) {
      toast.error("Select at least one component");
      return;
    }
    setIsGeneratingSelected(true);
    try {
      const result = await regenerateSelected({
        packageIds: selectedPackageIds,
        templateId: selectedTemplateId || undefined,
      });
      toast.success(`Queued ${result.queued} selected components`);
    } catch {
      toast.error("Failed to start selected generation");
    } finally {
      setIsGeneratingSelected(false);
    }
  };

  const filteredPackages =
    allPackages?.filter((pkg) => {
      if (!componentSearch.trim()) return true;
      const term = componentSearch.trim().toLowerCase();
      return (
        pkg.name.toLowerCase().includes(term) ||
        (pkg.componentName || "").toLowerCase().includes(term)
      );
    }) || [];

  const togglePackageSelection = (packageId: Id<"packages">) => {
    setSelectedPackageIds((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId],
    );
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <Image size={16} weight="bold" className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            Thumbnail Templates
          </span>
          {templates && (
            <span className="text-xs text-text-secondary">
              ({templates.filter((t) => t.active).length} active)
            </span>
          )}
        </div>
        {isExpanded ? (
          <CaretUp size={16} className="text-text-secondary" />
        ) : (
          <CaretDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Info */}
          <div className="p-3 rounded-lg bg-bg-hover text-xs text-text-secondary">
            <p>
              Upload background images that serve as templates for auto-generated
              thumbnails. User logos are centered on top of the selected template
              to create 16:9 thumbnails.
            </p>
          </div>

          {/* Add template */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Template name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-bg-primary text-text-primary"
            />
            <label className="cursor-pointer text-sm px-3 py-1.5 rounded-lg bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors border border-border flex items-center gap-1">
              <Upload size={14} />
              {isUploading ? "Uploading..." : "Upload"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error("Template images must be under 5MB");
                    return;
                  }
                  handleUploadTemplate(file);
                }}
              />
            </label>
          </div>

          {/* Template list */}
          {templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${
                    template.isDefault
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-border"
                  }`}
                >
                  {/* Preview */}
                  {template.previewUrl ? (
                    <img
                      src={template.previewUrl}
                      alt={template.name}
                      className="w-20 h-11 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-11 rounded bg-bg-hover flex-shrink-0 flex items-center justify-center">
                      <Image size={16} className="text-text-secondary" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {template.name}
                      </span>
                      {template.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
                          DEFAULT
                        </span>
                      )}
                      {!template.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500 font-medium">
                          DISABLED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!template.isDefault && (
                      <button
                        onClick={() => handleSetDefault(template._id)}
                        className="text-xs px-2 py-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                        title="Set as default"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleToggleActive(template._id, template.active)
                      }
                      className="p-1 rounded hover:bg-bg-hover transition-colors"
                      title={template.active ? "Disable" : "Enable"}
                    >
                      {template.active ? (
                        <Eye size={14} className="text-text-secondary" />
                      ) : (
                        <EyeSlash size={14} className="text-text-secondary" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="p-1 rounded hover:bg-bg-hover transition-colors"
                      title="Delete template"
                    >
                      <TrashSimple
                        size={14}
                        className="text-text-secondary hover:text-red-500"
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-secondary text-center py-4">
              No templates yet. Upload a background image to get started.
            </p>
          )}

          {/* Selected component thumbnail generation */}
          {templates && templates.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <label className="text-xs text-text-secondary">
                Generate selected component thumbnails
              </label>

              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) =>
                    setSelectedTemplateId(
                      e.target.value as Id<"thumbnailTemplates"> | "",
                    )
                  }
                  className="text-xs px-2 py-1.5 rounded border border-border bg-bg-primary text-text-primary"
                >
                  <option value="">Default template</option>
                  {templates
                    .filter((t) => t.active)
                    .map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                        {template.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                </select>

                <button
                  onClick={() => setComponentDropdownOpen((prev) => !prev)}
                  className="text-xs px-3 py-1.5 rounded border border-border bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors"
                >
                  Select components ({selectedPackageIds.length})
                </button>

                <button
                  onClick={() => {
                    setSelectedPackageIds([]);
                    setComponentSearch("");
                    setComponentDropdownOpen(false);
                  }}
                  disabled={selectedPackageIds.length === 0}
                  className="text-xs px-3 py-1.5 rounded border border-border bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  onClick={handleGenerateSelected}
                  disabled={isGeneratingSelected || selectedPackageIds.length === 0}
                  className="text-xs px-3 py-1.5 rounded-lg bg-bg-primary text-text-primary hover:bg-bg-hover transition-colors border border-border flex items-center gap-1 disabled:opacity-50"
                >
                  <ArrowsClockwise
                    size={12}
                    className={isGeneratingSelected ? "animate-spin" : ""}
                  />
                  {isGeneratingSelected ? "Queueing..." : "Generate selected"}
                </button>
              </div>

              {componentDropdownOpen && (
                <div className="rounded-lg border border-border bg-bg-primary p-2 space-y-2">
                  <input
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Search components..."
                    className="w-full text-xs px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredPackages.length === 0 ? (
                      <p className="text-xs text-text-secondary px-1 py-2">
                        No components found
                      </p>
                    ) : (
                      filteredPackages.map((pkg) => (
                        <label
                          key={pkg._id}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-bg-hover text-xs"
                        >
                          <span className="truncate text-text-primary">
                            {pkg.componentName || pkg.name}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] ${
                                pkg.logoUrl
                                  ? "text-green-600"
                                  : "text-text-secondary"
                              }`}
                            >
                              {pkg.logoUrl ? "logo" : "no logo"}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedPackageIds.includes(pkg._id)}
                              onChange={() => togglePackageSelection(pkg._id)}
                            />
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Filter type includes review statuses, all, archived, marked_for_deletion, and settings
type FilterType = ReviewStatus | "all" | "archived" | "marked_for_deletion" | "settings";

// Filter tabs component
function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}) {
  const tabs: {
    value: FilterType;
    label: string;
    icon: React.ReactNode;
    tooltip: string;
  }[] = [
    {
      value: "all",
      label: "All",
      icon: <Package size={16} />,
      tooltip: "Show all packages (excluding archived)",
    },
    {
      value: "pending",
      label: "Pending",
      icon: <Hourglass size={16} />,
      tooltip: "Show pending packages",
    },
    {
      value: "in_review",
      label: "Review",
      icon: <GitPullRequest size={16} />,
      tooltip: "Show packages in review",
    },
    {
      value: "approved",
      label: "Approved",
      icon: <CheckCircle size={16} />,
      tooltip: "Show approved packages",
    },
    {
      value: "changes_requested",
      label: "Changes",
      icon: <Warning size={16} />,
      tooltip: "Show packages needing changes",
    },
    {
      value: "rejected",
      label: "Rejected",
      icon: <Prohibit size={16} />,
      tooltip: "Show rejected packages",
    },
    {
      value: "marked_for_deletion",
      label: "Deletion",
      icon: <Clock size={16} />,
      tooltip: "Show packages marked for deletion",
    },
    {
      value: "archived",
      label: "Archived",
      icon: <Archive size={16} />,
      tooltip: "Show archived packages",
    },
    {
      value: "settings",
      label: "Settings",
      icon: <Gear size={16} />,
      tooltip: "Auto-refresh, AI review, and stats",
    },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-bg-card border border-border overflow-x-auto">
      {tabs.map((tab) => (
        <Tooltip key={tab.value} content={tab.tooltip}>
          <button
            onClick={() => onFilterChange(tab.value)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === tab.value
                ? "bg-button text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.value !== "settings" && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-bg-hover text-text-secondary"
                }`}
              >
                {counts[tab.value]}
              </span>
            )}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

// Admin dashboard component
function AdminDashboard({
  userEmail,
  packages,
  searchTerm,
  setSearchTerm,
}: {
  userEmail?: string;
  packages: any[] | undefined;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) {
  // Default to pending to show new submissions first
  const [activeFilter, setActiveFilter] = useState<FilterType>("pending");
  // Track which packages are expanded (open)
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
    new Set(),
  );
  // Sort option state
  type SortOption =
    | "newest"
    | "oldest"
    | "name_asc"
    | "name_desc"
    | "downloads";
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Sort options config
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
    { value: "downloads", label: "Most downloads" },
  ];

  // Toggle a package's expanded state
  const togglePackage = (packageId: string) => {
    setExpandedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }
      return next;
    });
  };

  // Helper to check if package is archived (visibility = "archived")
  const isArchived = (pkg: any) => pkg.visibility === "archived";

  // Calculate counts for each status - archived are excluded from other counts
  const nonArchivedPackages = packages?.filter((p) => !isArchived(p)) ?? [];
  const archivedPackages = packages?.filter((p) => isArchived(p)) ?? [];

  // Packages marked for deletion (across all statuses)
  const markedForDeletionPackages = packages?.filter((p) => p.markedForDeletion) ?? [];

  const counts: Record<FilterType, number> = {
    all: nonArchivedPackages.length,
    settings: 0, // Settings tab doesn't have a count
    pending: nonArchivedPackages.filter(
      (p) => !p.reviewStatus || p.reviewStatus === "pending",
    ).length,
    in_review: nonArchivedPackages.filter((p) => p.reviewStatus === "in_review")
      .length,
    approved: nonArchivedPackages.filter((p) => p.reviewStatus === "approved")
      .length,
    changes_requested: nonArchivedPackages.filter(
      (p) => p.reviewStatus === "changes_requested",
    ).length,
    rejected: nonArchivedPackages.filter((p) => p.reviewStatus === "rejected")
      .length,
    marked_for_deletion: markedForDeletionPackages.length,
    archived: archivedPackages.length,
  };

  // Filter packages based on active filter
  const filteredPackages = packages?.filter((pkg) => {
    // Settings tab shows nothing (no package list)
    if (activeFilter === "settings") return false;
    // Marked for deletion tab shows only packages marked for deletion
    if (activeFilter === "marked_for_deletion") return pkg.markedForDeletion === true;
    // Archived tab shows only archived packages
    if (activeFilter === "archived") return isArchived(pkg);
    // All other tabs exclude archived packages
    if (isArchived(pkg)) return false;
    if (activeFilter === "all") return true;
    const status = pkg.reviewStatus || "pending";
    return status === activeFilter;
  });

  // Sort packages based on selected sort option
  const sortPackages = (pkgs: any[]) => {
    return [...pkgs].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.submittedAt - a.submittedAt;
        case "oldest":
          return a.submittedAt - b.submittedAt;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "downloads":
          return b.weeklyDownloads - a.weeklyDownloads;
        default:
          return b.submittedAt - a.submittedAt;
      }
    });
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Mobile search bar */}
      <div className="mb-4 sm:hidden">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm outline-none focus:border-button transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4">
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />
      </div>

      {/* Submissions list (hidden in settings view) */}
      {activeFilter !== "settings" && <div className="rounded-lg border border-border bg-light shadow-sm mb-6">
        <div className="p-3 border-b border-border bg-bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-base font-light text-text-primary">
            Package Submissions
          </h2>
          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              >
                <SortAscending size={14} />
                <span className="hidden sm:inline">
                  {sortOptions.find((o) => o.value === sortBy)?.label}
                </span>
                <CaretDown
                  size={12}
                  className={`transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
                />
              </button>
              {showSortDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] py-1 rounded-lg border border-border bg-white shadow-lg">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                          sortBy === option.value
                            ? "bg-bg-hover text-text-primary font-medium"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className="text-xs text-text-secondary">
              Showing {filteredPackages?.length ?? 0} of {packages?.length ?? 0}
            </span>
          </div>
        </div>

        {packages === undefined ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto border-button"></div>
          </div>
        ) : filteredPackages?.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            {searchTerm
              ? "No packages found matching your search."
              : "No packages found for this filter."}
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {sortPackages(filteredPackages || []).map((pkg) => {
              const isExpanded = expandedPackages.has(pkg._id);
              return (
                <div
                  key={pkg._id}
                  className="rounded-lg border border-border bg-white"
                >
                  {/* Collapsible header - always visible */}
                  <button
                    onClick={() => togglePackage(pkg._id)}
                    className="w-full p-4 flex items-center justify-between gap-4 hover:bg-bg-hover/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Expand/collapse icon */}
                      <CaretRight
                        size={16}
                        weight="bold"
                        className={`shrink-0 text-text-secondary transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                      {/* Thumbnail preview */}
                      {pkg.thumbnailUrl && (
                        <img
                          src={pkg.thumbnailUrl}
                          alt=""
                          className="w-8 h-5 object-cover rounded shrink-0"
                        />
                      )}
                      {pkg.featured && (
                        <Star
                          size={16}
                          weight="fill"
                          className="text-amber-500 shrink-0"
                        />
                      )}
                      <span className="font-medium text-text-primary truncate">
                        {pkg.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bg-primary text-text-secondary border border-border shrink-0">
                        v{pkg.version}
                      </span>
                      <StatusBadge status={pkg.reviewStatus} />
                      <ComponentDetailQuickLink slug={pkg.slug} />
                      <VisibilityBadge visibility={pkg.visibility} markedForDeletion={pkg.markedForDeletion} />
                      {/* Show unreplied notes indicator when collapsed */}
                      {!isExpanded && (
                        <UnrepliedNotesIndicator packageId={pkg._id} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-text-secondary">
                      <span className="hidden sm:inline">
                        {pkg.weeklyDownloads.toLocaleString()}/wk
                      </span>
                      <span>{formatDate(pkg.submittedAt)}</span>
                    </div>
                  </button>

                  {/* Expandable content */}
                  {isExpanded && (
                    <div>
                      {/* Package details */}
                      <div className="px-4 flex flex-col sm:flex-row items-start justify-between gap-4 pb-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                            {pkg.description}
                          </p>
                          {pkg.reviewedBy && (
                            <p className="text-xs text-text-secondary mb-3">
                              Reviewed by {pkg.reviewedBy}
                            </p>
                          )}

                          {/* Submitter Info */}
                          <div className="space-y-2 mb-3">
                            {/* Name and Discord row */}
                            {(pkg.submitterName || pkg.submitterDiscord) && (
                              <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-bg-hover/50 text-xs">
                                {pkg.submitterName && (
                                  <Tooltip content="Submitter name">
                                    <span className="flex items-center gap-1 text-text-secondary">
                                      <User size={12} />
                                      {pkg.submitterName}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(
                                            pkg.submitterName || "",
                                          );
                                          toast.success(
                                            "Name copied to clipboard",
                                          );
                                        }}
                                        className="ml-1 p-0.5 rounded hover:bg-bg-hover hover:text-text-primary transition-colors"
                                        title="Copy name"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </span>
                                  </Tooltip>
                                )}
                                {pkg.submitterDiscord && (
                                  <Tooltip content="Convex Discord username">
                                    <span className="flex items-center gap-1 text-text-secondary">
                                      <DiscordLogo size={12} />
                                      {pkg.submitterDiscord}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(
                                            pkg.submitterDiscord || "",
                                          );
                                          toast.success(
                                            "Discord username copied to clipboard",
                                          );
                                        }}
                                        className="ml-1 p-0.5 rounded hover:bg-bg-hover hover:text-text-primary transition-colors"
                                        title="Copy Discord username"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </span>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                            {/* Editable email section */}
                            <SubmitterEmailEditor
                              packageId={pkg._id}
                              submitterEmail={pkg.submitterEmail}
                              additionalEmails={pkg.additionalEmails}
                            />
                          </div>

                          {/* AI Review Results */}
                          <AiReviewResultsPanel
                            aiReviewStatus={pkg.aiReviewStatus}
                            aiReviewSummary={pkg.aiReviewSummary}
                            aiReviewCriteria={pkg.aiReviewCriteria}
                            aiReviewError={pkg.aiReviewError}
                            aiReviewedAt={pkg.aiReviewedAt}
                            packageName={pkg.name}
                            collaborators={pkg.collaborators}
                            npmUrl={pkg.npmUrl}
                            repositoryUrl={pkg.repositoryUrl}
                          />

                          <PackageComponentDetailsEditor
                            packageId={pkg._id}
                            componentName={pkg.componentName}
                            slug={pkg.slug}
                            category={pkg.category}
                            tags={pkg.tags}
                            shortDescription={pkg.shortDescription}
                            longDescription={pkg.longDescription}
                            videoUrl={pkg.videoUrl}
                            demoUrl={pkg.demoUrl}
                            thumbnailUrl={pkg.thumbnailUrl}
                            convexVerified={pkg.convexVerified}
                            authorUsername={pkg.authorUsername}
                            authorAvatar={pkg.authorAvatar}
                            logoUrl={pkg.logoUrl}
                            logoStorageId={pkg.logoStorageId}
                            selectedTemplateId={pkg.selectedTemplateId}
                            thumbnailGeneratedAt={pkg.thumbnailGeneratedAt}
                            seoGenerationStatus={pkg.seoGenerationStatus}
                            seoGeneratedAt={pkg.seoGeneratedAt}
                            seoGenerationError={pkg.seoGenerationError}
                            seoValueProp={pkg.seoValueProp}
                            skillMd={pkg.skillMd}
                            npmDescription={pkg.description}
                          />
                          <PackageMetadataEditor
                            packageId={pkg._id}
                            initialName={pkg.name}
                            initialDescription={pkg.description}
                            initialNpmUrl={pkg.npmUrl}
                            initialRepositoryUrl={pkg.repositoryUrl}
                            initialHomepageUrl={pkg.homepageUrl}
                            initialInstallCommand={pkg.installCommand}
                            initialVersion={pkg.version}
                            initialLicense={pkg.license}
                            initialWeeklyDownloads={pkg.weeklyDownloads}
                            initialTotalFiles={pkg.totalFiles}
                            initialLastPublish={pkg.lastPublish}
                            initialCollaborators={pkg.collaborators}
                          />
                        </div>

                        {/* Stats and links */}
                        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-sm text-text-secondary">
                            <Tooltip content="Weekly downloads">
                              <div className="flex items-center gap-1">
                                <DownloadSimple size={14} />
                                <span>
                                  {pkg.weeklyDownloads.toLocaleString()}/wk
                                </span>
                              </div>
                            </Tooltip>
                            <Tooltip
                              content={`Submitted: ${formatDate(pkg.submittedAt)}`}
                            >
                              <div className="flex items-center gap-1">
                                <CalendarBlank size={14} />
                                <span>{formatDate(pkg.submittedAt)}</span>
                              </div>
                            </Tooltip>
                          </div>

                          {/* Links */}
                          <div className="flex gap-1 ml-auto sm:ml-0">
                            <Tooltip content="View on npm">
                              <a
                                href={pkg.npmUrl}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(
                                    pkg.npmUrl,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-button text-white hover:bg-button-hover transition-colors cursor-pointer"
                              >
                                npm
                              </a>
                            </Tooltip>
                            {pkg.repositoryUrl && (
                              <Tooltip content="View repository">
                                <a
                                  href={pkg.repositoryUrl}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(
                                      pkg.repositoryUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  }}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                                >
                                  repo
                                </a>
                              </Tooltip>
                            )}
                            {pkg.demoUrl && (
                              <Tooltip content="View live demo">
                                <a
                                  href={pkg.demoUrl}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(
                                      pkg.demoUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                                >
                                  <Browser size={12} />
                                  demo
                                </a>
                              </Tooltip>
                            )}
                            {/* Refresh NPM data button with status - always visible */}
                            <RefreshNpmButton
                              packageId={pkg._id}
                              packageName={pkg.name}
                              lastRefreshedAt={pkg.lastRefreshedAt}
                              refreshError={pkg.refreshError}
                            />
                            {/* Generate slug button - shown when package has no slug */}
                            <GenerateSlugButton
                              packageId={pkg._id}
                              packageName={pkg.name}
                              currentSlug={pkg.slug}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Inline action buttons */}
                      <InlineActions
                        packageId={pkg._id}
                        currentStatus={pkg.reviewStatus}
                        currentVisibility={pkg.visibility}
                        currentFeatured={pkg.featured}
                        userEmail={userEmail || ""}
                        packageName={pkg.name}
                        repositoryUrl={pkg.repositoryUrl}
                        isArchivedView={activeFilter === "archived"}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* Settings view: Categories, Auto-Refresh, AI Review, Stats */}
      {activeFilter === "settings" && (
        <>
          {/* Category Management */}
          <CategoryManagementPanel />

          {/* Auto-Refresh Settings */}
          <AutoRefreshSettingsPanel />

          {/* AI Review Settings */}
          <AdminSettingsPanel />

          {/* Deletion Management */}
          <DeletionManagementPanel />

          {/* Slug Migration */}
          <SlugMigrationPanel />

          {/* Thumbnail Template Management */}
          <ThumbnailTemplatePanel />

          {/* Stats section */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <Tooltip content="Total packages (excluding archived)" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <Package size={12} />
                    <p className="text-xs">Total</p>
                  </div>
                  <p className="text-lg font-light text-text-primary">
                    {counts.all}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Packages awaiting review" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <Hourglass size={12} />
                    <p className="text-xs">Pending</p>
                  </div>
                  <p className="text-lg font-light text-yellow-600">
                    {counts.pending}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Packages in review" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <GitPullRequest size={12} />
                    <p className="text-xs">Review</p>
                  </div>
                  <p className="text-lg font-light text-blue-600">
                    {counts.in_review}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Approved packages" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <CheckCircle size={12} />
                    <p className="text-xs">Approved</p>
                  </div>
                  <p className="text-lg font-light text-green-600">
                    {counts.approved}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Packages needing changes" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <Warning size={12} />
                    <p className="text-xs">Changes</p>
                  </div>
                  <p className="text-lg font-light text-orange-600">
                    {counts.changes_requested}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Rejected packages" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <Prohibit size={12} />
                    <p className="text-xs">Rejected</p>
                  </div>
                  <p className="text-lg font-light text-red-600">
                    {counts.rejected}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Archived packages" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <Archive size={12} />
                    <p className="text-xs">Archived</p>
                  </div>
                  <p className="text-lg font-light text-purple-600">
                    {counts.archived}
                  </p>
                </div>
              </Tooltip>
              <Tooltip content="Combined weekly downloads" position="top">
                <div className="rounded-lg border border-border p-2 bg-bg-primary">
                  <div className="flex items-center gap-1 text-text-secondary mb-1">
                    <DownloadSimple size={12} />
                    <p className="text-xs">Downloads</p>
                  </div>
                  <p className="text-lg font-light text-text-primary">
                    {nonArchivedPackages
                      .reduce((sum, pkg) => sum + pkg.weeklyDownloads, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </Tooltip>
            </div>
          </div>

          {/* Status Legend */}
          <StatusLegend />
        </>
      )}
    </div>
  );
}
