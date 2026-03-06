import { useQuery, useMutation } from "convex/react";
import { useAuth } from "../lib/auth";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import Header from "../components/Header";
import {
  Package,
  CheckCircle,
  Hourglass,
  Warning,
  X,
  Eye,
  EyeSlash,
  Archive,
  ChatCircleText,
  Plus,
  Bell,
  User,
  PencilSimple,
  Trash,
  SignOut,
  Star,
  Prohibit,
  Copy,
  Check,
} from "@phosphor-icons/react";

// Get base path for links (always /components)
function useBasePath() {
  return "/components";
}

// Badge snippet component for showing README badge markdown
function BadgeSnippet({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const badgeMarkdown = `[![Convex Component](https://www.convex.dev/components/badge/${slug})](https://www.convex.dev/components/${slug})`;
  const badgeImageUrl = `https://www.convex.dev/components/badge/${slug}`;
  const badgeTargetUrl = `https://www.convex.dev/components/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(badgeMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-text-secondary mb-2">Add badge to your README</p>
      <div className="flex items-center gap-2 rounded-md bg-[#1a1a1a] px-3 py-2 font-mono text-xs text-gray-300">
        <code className="flex-1 overflow-x-auto whitespace-nowrap">{badgeMarkdown}</code>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy markdown"}
          className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors">
          {copied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} className="text-gray-400" />
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-text-secondary">Preview:</span>
        <a href={badgeTargetUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={badgeImageUrl}
            alt="Convex Component badge"
            className="inline-block h-5"
          />
        </a>
      </div>
    </div>
  );
}

// Status badge component (synced with Submit.tsx and Admin.tsx)
function StatusBadge({ status }: { status?: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      icon: <Hourglass size={14} />,
    },
    in_review: {
      label: "In Review",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: <Eye size={14} />,
    },
    approved: {
      label: "Approved",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
      icon: <CheckCircle size={14} />,
    },
    changes_requested: {
      label: "Changes Requested",
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      icon: <Warning size={14} />,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
      icon: <Prohibit size={14} />,
    },
  };

  const config = statusConfig[status || "pending"] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Visibility badge component
function VisibilityBadge({ visibility }: { visibility?: string }) {
  if (!visibility || visibility === "visible") return null;

  const visibilityConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> =
    {
      hidden: {
        label: "Hidden",
        className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
        icon: <EyeSlash size={14} />,
      },
    };

  const config = visibilityConfig[visibility];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Request modal for sending notes to admin
function RequestModal({
  packageId,
  packageName,
  onClose,
}: {
  packageId: Id<"packages">;
  packageName: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestRefresh = useMutation(api.packages.requestSubmissionRefresh);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestRefresh({ packageId, note: note.trim() });
      toast.success("Request sent to the team");
      onClose();
    } catch (err) {
      toast.error("Failed to send request");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-12 p-4 overflow-y-auto"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-lg bg-white border border-border shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-lg font-medium text-text-primary mb-2">Request for {packageName}</h2>
        <p className="text-sm text-text-secondary mb-4">
          Send a note to the Convex team about this submission. Use this to request a re-review,
          report an issue, or ask to remove your component.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Message</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Please re-review my component, I've made updates..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20 resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-full text-sm font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="flex-1 px-4 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for viewing notes thread (user requests and admin replies)
function ViewNotesModal({
  packageId,
  packageName,
  onClose,
}: {
  packageId: Id<"packages">;
  packageName: string;
  onClose: () => void;
}) {
  const [showInactive, setShowInactive] = useState(false);
  const notes = useQuery(api.packages.getMyPackageNotes, {
    packageId,
    includeInactive: showInactive,
  });
  const markAsRead = useMutation(api.packages.markPackageNotesAsRead);
  const deleteMessage = useMutation(api.packages.deletePackageComment);
  const updateMessageStatus = useMutation(api.packages.updatePackageCommentStatus);

  // Calculate unread count in active thread
  const unreadCount =
    notes?.filter(
      (n) =>
        n.isFromAdmin &&
        n.userHasRead === false &&
        (!n.status || n.status === "active"),
    ).length ?? 0;

  // Auto-mark notes as read when modal opens
  useEffect(() => {
    if (
      notes &&
      notes.some(
        (n) =>
          n.isFromAdmin &&
          n.userHasRead === false &&
          (!n.status || n.status === "active"),
      )
    ) {
      markAsRead({ packageId });
    }
  }, [notes, packageId, markAsRead]);

  const handleMarkAllAsRead = () => {
    markAsRead({ packageId });
  };

  const handleDelete = async (messageId: Id<"packageComments">) => {
    try {
      await deleteMessage({ commentId: messageId });
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleSetStatus = async (
    messageId: Id<"packageComments">,
    status: "hidden" | "archived" | "active",
  ) => {
    try {
      await updateMessageStatus({ commentId: messageId, status });
      if (status === "active") {
        toast.success("Message restored");
      } else {
        toast.success(status === "hidden" ? "Message hidden" : "Message archived");
      }
    } catch {
      toast.error("Failed to update message");
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
    <div
      className="fixed inset-0 flex items-start justify-center pt-12 p-4 overflow-y-auto"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-lg bg-white border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              Messages
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-600">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            <p className="text-xs text-text-secondary truncate max-w-xs">{packageName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInactive((prev) => !prev)}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors">
              {showInactive ? "Hide hidden or archived" : "Show hidden or archived"}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notes === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-button"></div>
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              {showInactive
                ? "No messages yet."
                : 'No active messages yet. Use "Send Request" to contact the Convex team.'}
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note._id}
                className={`p-3 rounded-lg ${
                  note.isFromAdmin
                    ? "bg-green-50 border border-green-200 ml-4"
                    : "bg-bg-hover/50 border border-border mr-4"
                }`}>
                <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                  <User size={12} />
                  <span className="font-medium">{note.isFromAdmin ? "Convex Team" : "You"}</span>
                  <span>{formatNoteDate(note.createdAt)}</span>
                  {note.isFromAdmin && note.userHasRead === false && (
                    <span className="px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-medium">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
                {note.status && note.status !== "active" && (
                  <p className="mt-2 text-xs text-text-secondary">
                    Status: {note.status === "hidden" ? "Hidden" : "Archived"}
                  </p>
                )}
                {note.isOwnMessage && (
                  <div className="mt-2 flex items-center gap-2">
                    {(!note.status || note.status === "active") ? (
                      <>
                        <button
                          onClick={() => handleSetStatus(note._id, "hidden")}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                          <EyeSlash size={12} />
                          Hide
                        </button>
                        <button
                          onClick={() => handleSetStatus(note._id, "archived")}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                          <Archive size={12} />
                          Archive
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleSetStatus(note._id, "active")}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                        <Eye size={12} />
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      <Trash size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-text-secondary text-center">
            Use "Send Request" on your submission to send a new message.
          </p>
        </div>
      </div>
    </div>
  );
}

// Edit submission modal
function EditModal({ packageId, onClose }: { packageId: Id<"packages">; onClose: () => void }) {
  const submission = useQuery(api.packages.getMySubmissionForEdit, { packageId });
  const categories = useQuery(api.packages.listCategories);
  const updateSubmission = useMutation(api.packages.updateMySubmission);

  const [componentName, setComponentName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when data loads
  useEffect(() => {
    if (submission) {
      setComponentName(submission.componentName || "");
      setShortDescription(submission.shortDescription || "");
      setLongDescription(submission.longDescription || "");
      setCategory(submission.category || "");
      setTags(submission.tags?.join(", ") || "");
      setDemoUrl(submission.demoUrl || "");
      setVideoUrl(submission.videoUrl || "");
    }
  }, [submission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateSubmission({
        packageId,
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
      });
      toast.success("Submission updated");
      onClose();
    } catch (err) {
      toast.error("Failed to update submission");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!submission) {
    return (
      <div
        className="fixed inset-0 flex items-start justify-center pt-12 p-4 overflow-y-auto"
        style={{ zIndex: 2147483647 }}>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg p-6 rounded-lg bg-white border border-border shadow-lg">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-button"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-6 p-4 overflow-y-auto"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg p-6 rounded-lg bg-white border border-border shadow-lg my-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-lg font-medium text-text-primary mb-1">Edit Submission</h2>
        <p className="text-xs text-text-secondary mb-4">{submission.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Component Name
            </label>
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              placeholder="e.g., Convex Agent"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
            />
            <p className="text-xs text-text-tertiary mt-1">Human-readable display name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Short Description
            </label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief description shown on cards (200 chars max)"
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Long Description
            </label>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="Full description (Markdown supported)"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20">
              <option value="">Select a category</option>
              {categories?.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ai, realtime, database (comma separated)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Demo URL</label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://demo.example.com"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-button focus:ring-2 focus:ring-button/20"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-full text-sm font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Submission card component
function SubmissionCard({
  submission,
  onRequestRefresh,
  onViewNotes,
  onEdit,
  basePath,
}: {
  submission: {
    _id: Id<"packages">;
    name: string;
    componentName?: string;
    slug?: string;
    reviewStatus?: string;
    visibility?: string;
    submittedAt: number;
    thumbnailUrl?: string;
    shortDescription?: string;
    category?: string;
    unreadAdminReplies: number;
  };
  onRequestRefresh: (id: Id<"packages">, name: string) => void;
  onViewNotes: (id: Id<"packages">, name: string) => void;
  onEdit: (id: Id<"packages">) => void;
  basePath: string;
}) {
  const displayName = submission.componentName || submission.name;
  const submittedDate = new Date(submission.submittedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Show View button when approved AND visible (consistent with admin dashboard)
  const canViewDetail =
    submission.slug &&
    submission.reviewStatus === "approved" &&
    (!submission.visibility || submission.visibility === "visible");

  return (
    <div className="border border-border rounded-lg bg-white p-4 hover:border-border-hover transition-colors">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-12 flex-shrink-0 rounded bg-bg-secondary overflow-hidden">
          {submission.thumbnailUrl ? (
            <img
              src={submission.thumbnailUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary">
              <Package size={20} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {canViewDetail ? (
                <a
                  href={`${basePath}/${submission.slug}`}
                  className="text-sm font-medium text-text-primary hover:text-button transition-colors">
                  {displayName}
                </a>
              ) : (
                <span className="text-sm font-medium text-text-primary">{displayName}</span>
              )}
              <p className="text-xs text-text-tertiary mt-0.5">Submitted {submittedDate}</p>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <StatusBadge status={submission.reviewStatus} />
              <VisibilityBadge visibility={submission.visibility} />
            </div>
          </div>

          {/* Description */}
          {submission.shortDescription && (
            <p className="text-xs text-text-secondary mt-2 line-clamp-2">
              {submission.shortDescription}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => onEdit(submission._id)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
              <PencilSimple size={14} />
              Edit
            </button>
            <button
              onClick={() => onRequestRefresh(submission._id, displayName)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
              <ChatCircleText size={14} />
              Send Request
            </button>
            <button
              onClick={() => onViewNotes(submission._id, displayName)}
              className="relative inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
              <Bell size={14} />
              Messages
              {submission.unreadAdminReplies > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-green-500 text-white">
                  {submission.unreadAdminReplies > 9 ? "9+" : submission.unreadAdminReplies}
                </span>
              )}
            </button>
            {canViewDetail && (
              <a
                href={`${basePath}/${submission.slug}`}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                <Eye size={14} />
                View
              </a>
            )}
          </div>

          {/* Badge snippet for README - show when slug exists */}
          {submission.slug && <BadgeSnippet slug={submission.slug} />}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const basePath = useBasePath();
  const { isAuthenticated, isLoading: authLoading, signIn, signOut } = useAuth();
  const user = useQuery(api.auth.loggedInUser);
  const submissions = useQuery(api.packages.getMySubmissions, isAuthenticated ? {} : "skip");

  // Modal state for request
  const [requestModal, setRequestModal] = useState<{
    packageId: Id<"packages">;
    packageName: string;
  } | null>(null);

  // Modal state for viewing notes
  const [notesModal, setNotesModal] = useState<{
    packageId: Id<"packages">;
    packageName: string;
  } | null>(null);

  // Modal state for editing
  const [editModal, setEditModal] = useState<Id<"packages"> | null>(null);


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

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-text-tertiary mb-4" />
            <h1 className="text-xl font-medium text-text-primary mb-2">
              Sign in to view your profile
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              View and manage your component submissions.
            </p>
            <button
              onClick={() => {
                // Save current path to return after sign-in
                localStorage.setItem("authReturnPath", window.location.pathname);
                signIn();
              }}
              className="px-6 py-2.5 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page title with submit CTA */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-medium text-text-primary">Component Submissions</h1>
          <a
            href={`${basePath}/submit`}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-full bg-button text-white hover:bg-button-hover transition-colors">
            <Plus size={16} />
            Submit New
          </a>
        </div>

        {/* Profile info */}
        <div className="flex items-center justify-between gap-4 mb-8 p-4 rounded-lg border border-border bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-button text-white flex items-center justify-center text-lg font-medium">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-lg font-medium text-text-primary">My Profile</h1>
              <p className="text-sm text-text-secondary">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
              <SignOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Submissions section */}
        <div>
          {/* Loading */}
          {submissions === undefined && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-button mx-auto"></div>
            </div>
          )}

          {/* Empty state */}
          {submissions && submissions.length === 0 && (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Package size={32} className="mx-auto text-text-tertiary mb-3" />
              <p className="text-sm text-text-secondary mb-4">
                You haven't submitted any components yet.
              </p>
              <a
                href={`${basePath}/submit?submit=true`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-colors">
                Submit Your First Component
              </a>
            </div>
          )}

          {/* Submissions list */}
          {submissions && submissions.length > 0 && (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission._id}
                  submission={submission}
                  basePath={basePath}
                  onRequestRefresh={(id, name) =>
                    setRequestModal({ packageId: id, packageName: name })
                  }
                  onViewNotes={(id, name) => setNotesModal({ packageId: id, packageName: name })}
                  onEdit={(id) => setEditModal(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status and Visibility Guide */}
        <div className="mt-12 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-text-primary mb-3">Status Guide</h3>
          <ul className="space-y-2 text-xs mb-6">
            <li className="flex items-center gap-2">
              <StatusBadge status="pending" />
              <span className="text-text-secondary">Awaiting initial review</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="in_review" />
              <span className="text-text-secondary">Currently being evaluated</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="approved" />
              <span className="text-text-secondary">Ready to be featured</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="changes_requested" />
              <span className="text-text-secondary">Needs updates before approval</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="rejected" />
              <span className="text-text-secondary">Does not meet requirements</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Star size={14} weight="fill" />
                Featured
              </span>
              <span className="text-text-secondary">Highlighted on convex.dev/components</span>
            </li>
          </ul>

          <h3 className="text-sm font-medium text-text-primary mb-3">Visibility Guide</h3>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-600 border-green-500/20">
                <Eye size={14} />
                Visible
              </span>
              <span className="text-text-secondary">Shown in directory (if approved)</span>
            </li>
            <li className="flex items-center gap-2">
              <VisibilityBadge visibility="hidden" />
              <span className="text-text-secondary">Temporarily hidden from directory</span>
            </li>
          </ul>

          <h3 className="text-sm font-medium text-text-primary mb-3 mt-6">Badges</h3>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgb(203, 237, 182)", color: "rgb(34, 137, 9)" }}>
                Convex Verified
              </span>
              <span className="text-text-secondary">Reviewed and verified by the Convex team</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#E9DDC2", color: "rgb(87, 74, 48)" }}>
                Community
              </span>
              <span className="text-text-secondary">Submitted by a community member</span>
            </li>
          </ul>
        </div>

        {/* Account help section */}
        <div className="mt-12 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-text-primary mb-3">Need help?</h3>
          <div className="p-4 rounded-lg border border-border bg-white">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
                <ChatCircleText size={16} className="text-text-secondary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">Remove a component or close your account</h4>
                <p className="text-xs text-text-secondary mt-1">
                  To request removal of a component from the directory, use the "Send Request" button on any of your submissions above. You can also use it to request account removal or any other changes. The Convex team will follow up in your Messages thread.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster />

      {/* Request modal */}
      {requestModal && (
        <RequestModal
          packageId={requestModal.packageId}
          packageName={requestModal.packageName}
          onClose={() => setRequestModal(null)}
        />
      )}

      {/* View notes modal */}
      {notesModal && (
        <ViewNotesModal
          packageId={notesModal.packageId}
          packageName={notesModal.packageName}
          onClose={() => setNotesModal(null)}
        />
      )}

      {/* Edit modal */}
      {editModal && <EditModal packageId={editModal} onClose={() => setEditModal(null)} />}

    </div>
  );
}
