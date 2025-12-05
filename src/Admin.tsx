import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import {
  Eye,
  EyeSlash,
  Archive,
  Trash,
  GitPullRequest,
  CheckCircle,
  Warning,
  Hourglass,
  Export,
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
} from "@phosphor-icons/react";

// Review status type
type ReviewStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "changes_requested"
  | "rejected";
type Visibility = "visible" | "hidden" | "archived";

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
            </h3>
            <p className="text-xs text-text-secondary truncate max-w-xs">
              {packageName}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Internal only. Not visible to users.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <X size={20} />
          </button>
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

// Notes button with count badge
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

  return (
    <>
      <Tooltip
        content={`Admin notes (internal)${noteCount ? ` (${noteCount})` : ""}`}
      >
        <button
          onClick={() => setShowNotes(true)}
          className="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all"
        >
          <ChatText size={14} weight="bold" />
          <span className="hidden sm:inline">Notes</span>
          {noteCount !== undefined && noteCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-orange-500 text-white">
              {noteCount > 9 ? "9+" : noteCount}
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
            </h3>
            <p className="text-xs text-text-secondary truncate max-w-xs">
              {packageName}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Visible to users on the frontend.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <X size={20} />
          </button>
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

// Comments button with count badge
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

  return (
    <>
      <Tooltip
        content={`Public comments${commentCount ? ` (${commentCount})` : ""}`}
      >
        <button
          onClick={() => setShowComments(true)}
          className="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 transition-all"
        >
          <ChatCircleText size={14} weight="bold" />
          <span className="hidden sm:inline">Comments</span>
          {commentCount !== undefined && commentCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-green-500 text-white">
              {commentCount > 9 ? "9+" : commentCount}
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

// AI Review results panel
function AiReviewResultsPanel({
  aiReviewStatus,
  aiReviewSummary,
  aiReviewCriteria,
  aiReviewError,
  aiReviewedAt,
}: {
  aiReviewStatus?: AiReviewStatus;
  aiReviewSummary?: string;
  aiReviewCriteria?: Array<{ name: string; passed: boolean; notes: string }>;
  aiReviewError?: string;
  aiReviewedAt?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
        </button>
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

// Refresh NPM Data button component
function RefreshNpmButton({
  packageId,
  packageName,
}: {
  packageId: Id<"packages">;
  packageName: string;
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

  return (
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
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = useQuery(api.auth.isAdmin);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Loading state
  const isLoading = loggedInUser === undefined || isAdmin === undefined;

  // Use search query when there's a search term, otherwise use all packages
  const searchResults = useQuery(api.packages.adminSearchPackages, {
    searchTerm: searchTerm.trim(),
  });
  const allPackages = useQuery(api.packages.getAllPackages);

  // Use search results when searching, otherwise use all packages
  const packages = searchTerm.trim() ? searchResults : allPackages;

  // Export CSV handler
  const handleExportCSV = () => {
    if (!packages || packages.length === 0) {
      toast.error("No packages to export");
      return;
    }

    setIsExporting(true);
    try {
      const headers = [
        "Name",
        "Description",
        "Version",
        "License",
        "Weekly Downloads",
        "Last Publish",
        "Submitted At",
        "Review Status",
        "Visibility",
        "Reviewed By",
        "Submitter Name",
        "Submitter Email",
        "Submitter Discord",
        "NPM URL",
        "Repository URL",
        "Homepage URL",
      ];

      const escapeCSV = (value: string | undefined | null): string => {
        if (value === undefined || value === null) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = packages.map((pkg: any) => [
        escapeCSV(pkg.name),
        escapeCSV(pkg.description),
        escapeCSV(pkg.version),
        escapeCSV(pkg.license),
        pkg.weeklyDownloads.toString(),
        escapeCSV(pkg.lastPublish),
        new Date(pkg.submittedAt).toISOString(),
        escapeCSV(pkg.reviewStatus || "pending"),
        escapeCSV(pkg.visibility || "visible"),
        escapeCSV(pkg.reviewedBy),
        escapeCSV(pkg.submitterName),
        escapeCSV(pkg.submitterEmail),
        escapeCSV(pkg.submitterDiscord),
        escapeCSV(pkg.npmUrl),
        escapeCSV(pkg.repositoryUrl),
        escapeCSV(pkg.homepageUrl),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `npm-directory-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("CSV exported successfully!");
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Compact Header */}
      <header className="sticky top-0 z-10 backdrop-blur-sm  px-4 sm:px-6 py-2 bg-bg-primary">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Title */}
          <span className="text-text-primary font-medium text-sm">
            Admin
          </span>

          {/* Center: Search (when logged in as admin) */}
          {loggedInUser && isAdmin && (
            <div className="flex-1 max-w-md mx-4 hidden sm:block">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right: Export and Sign out */}
          <div className="flex items-center gap-2">
            {loggedInUser && isAdmin && (
              <Tooltip content="Export all packages to CSV">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-normal bg-button text-white hover:bg-button-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Export size={16} />
                  <span className="hidden sm:inline">
                    {isExporting ? "Exporting..." : "Export"}
                  </span>
                </button>
              </Tooltip>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
          </div>
        ) : !loggedInUser ? (
          // Not logged in - show sign in form
          <div className="max-w-md mx-auto">
            <div className="rounded-lg border border-border p-6 bg-bg-card">
              <h2 className="text-xl font-light mb-4 text-text-primary">
                Sign In
              </h2>
              <SignInForm />
            </div>
          </div>
        ) : !isAdmin ? (
          // Logged in but not admin
          <div className="max-w-md mx-auto">
            <div className="rounded-lg border border-border p-6 text-center bg-bg-card">
              <h2 className="text-xl font-light mb-4 text-text-primary">
                Access Denied
              </h2>
              <p className="mb-4 text-text-secondary">
                Admin access is restricted to @convex.dev email addresses.
              </p>
              <p className="text-sm text-text-secondary">
                Signed in as: {loggedInUser.email || "Anonymous user"}
              </p>
            </div>
          </div>
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
}: {
  visibility: Visibility | undefined;
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
    <Tooltip content={`Visibility: ${label}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    </Tooltip>
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

// Admin Settings Panel component
function AdminSettingsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const settings = useQuery(api.packages.getAdminSettings);
  const updateSetting = useMutation(api.packages.updateAdminSetting);

  const handleToggle = async (
    key: "autoApproveOnPass" | "autoRejectOnFail",
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
                  Indexes follow{" "}
                  <code className="bg-bg-primary px-1 rounded">by_field</code>{" "}
                  naming
                </li>
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
        </div>
      )}
    </div>
  );
}

// Filter type includes review statuses, all, and archived
type FilterType = ReviewStatus | "all" | "archived";

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
      value: "archived",
      label: "Archived",
      icon: <Archive size={16} />,
      tooltip: "Show archived packages",
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
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeFilter === tab.value
                  ? "bg-white/20 text-white"
                  : "bg-bg-hover text-text-secondary"
              }`}
            >
              {counts[tab.value]}
            </span>
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

  const counts: Record<FilterType, number> = {
    all: nonArchivedPackages.length,
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
    archived: archivedPackages.length,
  };

  // Filter packages based on active filter
  const filteredPackages = packages?.filter((pkg) => {
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

      {/* Admin Settings */}
      <AdminSettingsPanel />

      {/* Filter tabs */}
      <div className="mb-4">
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />
      </div>

      {/* Submissions list */}
      <div className="rounded-lg border border-border bg-light shadow-sm mb-6">
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
                      <VisibilityBadge visibility={pkg.visibility} />
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
                          {(pkg.submitterName ||
                            pkg.submitterEmail ||
                            pkg.submitterDiscord) && (
                            <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-bg-hover/50 text-xs">
                              {pkg.submitterName && (
                                <Tooltip content="Submitter name">
                                  <span className="flex items-center gap-1 text-text-secondary">
                                    <User size={12} />
                                    {pkg.submitterName}
                                  </span>
                                </Tooltip>
                              )}
                              {pkg.submitterEmail && (
                                <Tooltip content="Submitter email">
                                  <a
                                    href={`mailto:${pkg.submitterEmail}`}
                                    className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Envelope size={12} />
                                    {pkg.submitterEmail}
                                  </a>
                                </Tooltip>
                              )}
                              {pkg.submitterDiscord && (
                                <Tooltip content="Convex Discord username">
                                  <span className="flex items-center gap-1 text-text-secondary">
                                    <DiscordLogo size={12} />
                                    {pkg.submitterDiscord}
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          )}

                          {/* AI Review Results */}
                          <AiReviewResultsPanel
                            aiReviewStatus={pkg.aiReviewStatus}
                            aiReviewSummary={pkg.aiReviewSummary}
                            aiReviewCriteria={pkg.aiReviewCriteria}
                            aiReviewError={pkg.aiReviewError}
                            aiReviewedAt={pkg.aiReviewedAt}
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
                                  window.open(pkg.npmUrl, '_blank', 'noopener,noreferrer');
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
                                    window.open(pkg.repositoryUrl, '_blank', 'noopener,noreferrer');
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
                                    window.open(pkg.demoUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                                >
                                  <Browser size={12} />
                                  demo
                                </a>
                              </Tooltip>
                            )}
                            {/* Refresh NPM data button - always visible */}
                            <RefreshNpmButton
                              packageId={pkg._id}
                              packageName={pkg.name}
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
      </div>

      {/* Stats section (at bottom) */}
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

      {/* Status Legend below Stats */}
      <StatusLegend />
    </div>
  );
}
