import { useQuery, useMutation } from "convex/react";
import { useAuth } from "../lib/auth";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useMemo, useEffect } from "react";
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
  UserMinus,
  Clock,
} from "@phosphor-icons/react";

// Get base path for links (always /components)
function useBasePath() {
  return "/components";
}

// Status badge component
function StatusBadge({ status }: { status?: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800",
      icon: <Hourglass size={14} />,
    },
    in_review: {
      label: "In Review",
      color: "bg-blue-100 text-blue-800",
      icon: <Eye size={14} />,
    },
    approved: {
      label: "Approved",
      color: "bg-green-100 text-green-800",
      icon: <CheckCircle size={14} />,
    },
    changes_requested: {
      label: "Changes Requested",
      color: "bg-orange-100 text-orange-800",
      icon: <Warning size={14} />,
    },
    rejected: {
      label: "Rejected",
      color: "bg-red-100 text-red-800",
      icon: <X size={14} />,
    },
  };

  const config = statusConfig[status || "pending"] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Visibility badge component
function VisibilityBadge({ visibility }: { visibility?: string }) {
  if (!visibility || visibility === "visible") return null;

  const visibilityConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> =
    {
      hidden: {
        label: "Hidden",
        color: "bg-gray-100 text-gray-600",
        icon: <EyeSlash size={14} />,
      },
      archived: {
        label: "Archived",
        color: "bg-gray-200 text-gray-700",
        icon: <Archive size={14} />,
      },
    };

  const config = visibilityConfig[visibility];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Marked for deletion badge component
function DeletionBadge({ markedForDeletionAt }: { markedForDeletionAt?: number }) {
  if (!markedForDeletionAt) return null;

  const deletionDate = new Date(markedForDeletionAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <Clock size={14} />
      Pending Deletion ({deletionDate})
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
  const notes = useQuery(api.packages.getMyPackageNotes, { packageId });
  const markAsRead = useMutation(api.packages.markPackageNotesAsRead);

  // Calculate unread count
  const unreadCount = notes?.filter((n) => n.isFromAdmin && n.userHasRead === false).length ?? 0;

  // Auto-mark notes as read when modal opens
  useEffect(() => {
    if (notes && notes.some((n) => n.isFromAdmin && n.userHasRead === false)) {
      markAsRead({ packageId });
    }
  }, [notes, packageId, markAsRead]);

  const handleMarkAllAsRead = () => {
    markAsRead({ packageId });
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
              No messages yet. Use "Send Request" to contact the Convex team.
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

// Delete account confirmation modal with typed confirmation
function DeleteAccountModal({
  onConfirm,
  onClose,
  isLoading,
  activeSubmissionsCount,
}: {
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
  activeSubmissionsCount: number;
}) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText === "DELETE";
  const hasActiveSubmissions = activeSubmissionsCount > 0;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-12 p-4 overflow-y-auto"
      style={{ zIndex: 2147483647 }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-lg bg-white border border-border shadow-lg">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <UserMinus size={20} className="text-red-600" />
          </div>
          <h2 className="text-lg font-medium text-text-primary">Delete Account</h2>
        </div>

        {hasActiveSubmissions ? (
          // Warning: Must delete submissions first
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="flex gap-3">
                <Warning size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Delete your components first
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have {activeSubmissionsCount} active component
                    {activeSubmissionsCount > 1 ? "s" : ""} that must be deleted before you can
                    delete your account.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-text-secondary">
              To delete your account, go to each of your submissions and click the Delete button.
              Once all your components are marked for deletion, you can return here to delete your
              account.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 rounded-full text-sm font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors">
              Close
            </button>
          </div>
        ) : (
          // Normal deletion flow
          <>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-text-secondary">
                This action is permanent and cannot be undone. Deleting your account will:
              </p>
              <ul className="text-sm text-text-secondary list-disc list-inside space-y-1">
                <li>Remove your access from any shared submissions</li>
                <li>Sign you out of this application</li>
              </ul>
              <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                All your components have been marked for deletion and will be permanently removed by
                our admin team.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={isLoading}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-full text-sm font-normal border border-border text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading || !isConfirmed}
                className="flex-1 px-4 py-2 rounded-full text-sm font-normal bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </>
        )}
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
    markedForDeletion?: boolean;
    markedForDeletionAt?: number;
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
              {submission.markedForDeletion && (
                <DeletionBadge markedForDeletionAt={submission.markedForDeletionAt} />
              )}
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
            {submission.markedForDeletion ? (
              // Component is scheduled for deletion by admin
              <div className="flex-1 text-xs text-red-600">
                This component is scheduled for permanent deletion. Contact the Convex team via
                "Send Request" if you need to cancel this.
              </div>
            ) : (
              // Normal action buttonss
              <>
                {/* Edit button */}
                <button
                  onClick={() => onEdit(submission._id)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                  <PencilSimple size={14} />
                  Edit
                </button>
                {/* Send Request button */}
                <button
                  onClick={() => onRequestRefresh(submission._id, displayName)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                  <ChatCircleText size={14} />
                  Send Request
                </button>
                {/* View Messages button with notification badge */}
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
                {/* View component link - only when approved AND visible */}
                {canViewDetail && (
                  <a
                    href={`${basePath}/${submission.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                    <Eye size={14} />
                    View
                  </a>
                )}
                {/* 
                  Visibility controls (Hide/Show/Delete) are admin-only features.
                  Users should contact admin via "Send Request" to manage visibility.
                */}
              </>
            )}
          </div>
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

  // Mutations for user actions (visibility controls removed - admin only)
  const deleteAccount = useMutation(api.packages.deleteMyAccount);

  // Count active (not marked for deletion) submissions
  const activeSubmissions = useMemo(() => {
    return submissions?.filter((s) => !s.markedForDeletion) ?? [];
  }, [submissions]);

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

  // Delete account modal state
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Handle delete account
  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      await deleteAccount({});
      toast.success("Your account has been deleted");
      setDeleteAccountModal(false);
      // Sign out and redirect to home
      signOut();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setDeleteAccountLoading(false);
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
              <span className="text-text-secondary">Awaiting review</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="in_review" />
              <span className="text-text-secondary">Being reviewed</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="approved" />
              <span className="text-text-secondary">Published</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="changes_requested" />
              <span className="text-text-secondary">Needs updates</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusBadge status="rejected" />
              <span className="text-text-secondary">Not accepted</span>
            </li>
          </ul>

          <h3 className="text-sm font-medium text-text-primary mb-3">Visibility Guide</h3>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Eye size={14} />
                Visible
              </span>
              <span className="text-text-secondary">Shown in directory (if approved)</span>
            </li>
            <li className="flex items-center gap-2">
              <VisibilityBadge visibility="hidden" />
              <span className="text-text-secondary">Temporarily hidden from directory</span>
            </li>
            <li className="flex items-center gap-2">
              <VisibilityBadge visibility="archived" />
              <span className="text-text-secondary">Archived by admin</span>
            </li>
            <li className="flex items-center gap-2">
              <DeletionBadge markedForDeletionAt={Date.now()} />
              <span className="text-text-secondary">Scheduled for permanent deletion by admin</span>
            </li>
          </ul>
        </div>

        {/* Account section */}
        <div className="mt-12 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-text-primary mb-3">Account</h3>
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <UserMinus size={16} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">Delete Account</h4>
                <p className="text-xs text-red-700 mt-1 mb-3">
                  To delete your account, first delete all your component submissions using the
                  Delete button on each component. Once all components are marked for deletion, you
                  can delete your account.
                </p>
                <button
                  onClick={() => setDeleteAccountModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                  <Trash size={14} />
                  Delete My Account
                </button>
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

      {/* Delete account modal */}
      {deleteAccountModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onClose={() => setDeleteAccountModal(false)}
          isLoading={deleteAccountLoading}
          activeSubmissionsCount={activeSubmissions.length}
        />
      )}
    </div>
  );
}
