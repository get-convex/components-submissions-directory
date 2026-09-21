// Docs-style section editor for Component Directory Content.
// Renders a section the way the public component page does (uppercase heading
// plus rendered markdown) and lets the author flip that section into an
// textarea that grows with its content. The author can also drag the
// bottom-right grip to make the box taller; that manual height becomes the
// new floor so typing never snaps it back down.
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Eye, PencilSimple } from "@phosphor-icons/react";
import { Markdown } from "./Markdown";

interface DocSectionEditorProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
  placeholder?: string;
  repositoryUrl?: string;
  // Minimum textarea height in edit mode, in px
  minEditHeight?: number;
}

type Mode = "preview" | "edit";

export default function DocSectionEditor({
  title,
  value,
  onChange,
  disabled = false,
  emptyText = "Nothing written yet.",
  placeholder = "Write in markdown",
  repositoryUrl,
  minEditHeight = 160,
}: DocSectionEditorProps) {
  const [mode, setMode] = useState<Mode>("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();
  const hasContent = value.trim().length > 0;
  // Height the author set by dragging the resize grip. 0 means untouched.
  const manualHeightRef = useRef(0);

  // Fit the textarea to its content on every value change and when edit mode
  // opens. The manual drag height acts as a floor so the box only ever grows
  // from what the author chose.
  useLayoutEffect(() => {
    if (mode !== "edit") return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(
      el.scrollHeight,
      minEditHeight,
      manualHeightRef.current,
    )}px`;
  }, [value, mode, minEditHeight]);

  // The browser applies a drag resize as an inline height. Capture it when the
  // pointer lifts so the next keystroke keeps it instead of recomputing.
  const rememberManualHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    manualHeightRef.current = el.offsetHeight;
  };

  const openEdit = () => {
    setMode("edit");
    // Focus after the textarea mounts
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
          {title}
        </h3>
        <div
          role="group"
          aria-label={`${title} view`}
          className="inline-flex items-center rounded-md border border-border bg-bg-primary p-0.5 text-xs"
        >
          <button
            type="button"
            aria-pressed={mode === "preview"}
            disabled={disabled}
            onClick={() => setMode("preview")}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors disabled:opacity-50 ${
              mode === "preview"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Eye size={13} />
            Preview
          </button>
          <button
            type="button"
            aria-pressed={mode === "edit"}
            disabled={disabled}
            onClick={openEdit}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors disabled:opacity-50 ${
              mode === "edit"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <PencilSimple size={13} />
            Edit
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        hasContent ? (
          <div className="markdown-body">
            <Markdown repositoryUrl={repositoryUrl}>{value}</Markdown>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={openEdit}
            className="w-full rounded-lg border border-dashed border-border px-4 py-6 text-left text-sm text-text-tertiary transition-colors hover:border-button hover:text-text-secondary disabled:opacity-50"
          >
            {emptyText} Click to write this section.
          </button>
        )
      ) : (
        <div>
          <label htmlFor={textareaId} className="sr-only">
            {title} markdown
          </label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            spellCheck
            onPointerUp={rememberManualHeight}
            className="block w-full resize-y overflow-y-auto rounded-lg border border-border bg-bg-primary px-4 py-3 text-sm leading-relaxed text-text-primary outline-none transition-colors focus:border-button focus:ring-2 focus:ring-button/20 disabled:opacity-50"
            style={{ minHeight: minEditHeight }}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-text-tertiary">
              Markdown supported. Drag the corner for more room. Changes apply
              when you save the form.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("preview")}
              className="rounded-md border border-border px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-bg-hover disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
