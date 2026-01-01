"use client";

/**
 * NoteEditor Component for FlashNote.
 *
 * Provides a Markdown editor for creating and editing notes.
 *
 * Example:
 *     <NoteEditor
 *         initialContent="# New Note"
 *         initialFileName="note.md"
 *         onSave={(content, fileName) => handleSave(content, fileName)}
 *         onCancel={() => setActiveTab("home")}
 *     />
 */

import { useState, useRef, useEffect } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface NoteEditorProps {
  initialContent?: string;
  initialFileName?: string;
  onSave: (content: string, fileName: string) => void;
  onCancel: () => void;
}

/**
 * Markdown note editor component.
 *
 * Args:
 *     initialContent: Initial Markdown content.
 *     initialFileName: Initial file name.
 *     onSave: Callback when save button is clicked.
 *     onCancel: Callback when cancel button is clicked.
 */
export function NoteEditor({
  initialContent = "# New Note\n\nStart writing here...",
  initialFileName = "New Note.md",
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [fileName, setFileName] = useState(initialFileName);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Focus textarea on mount.
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  /**
   * Handle save action.
   */
  const handleSave = () => {
    if (content.trim()) {
      onSave(content, fileName);
    }
  };

  /**
   * Handle keyboard shortcuts.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === "Escape") {
      onCancel();
    }
    // Tab to insert spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent =
          content.substring(0, start) + "  " + content.substring(end);
        setContent(newContent);
        // Set cursor position after the inserted spaces
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  return (
    <div style={{ height: "calc(100vh - 8rem)", paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--fn-background, var(--background))",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            padding: 8,
            marginLeft: -8,
            color: "var(--fn-secondary, var(--secondary))",
            transition: "color 0.15s ease",
          }}
          aria-label="Cancel"
        >
          <XMarkIcon style={{ width: 24, height: 24 }} />
        </button>

        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="File name"
          style={{
            flex: 1,
            marginLeft: 16,
            marginRight: 16,
            padding: "8px 12px",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            fontSize: 15,
            fontWeight: 500,
            textAlign: "center",
            color: "var(--fn-foreground, var(--foreground))",
          }}
        />

        <button
          onClick={handleSave}
          style={{
            padding: 8,
            color: "var(--fn-primary, var(--accent))",
            transition: "color 0.15s ease",
          }}
          aria-label="Save"
        >
          <CheckIcon style={{ width: 24, height: 24 }} />
        </button>
      </div>

      {/* Editor */}
      <div style={{ padding: 16, height: "calc(100% - 56px)" }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your Markdown content here..."
          style={{
            width: "100%",
            height: "100%",
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--border)",
            backgroundColor: "var(--fn-card-background, var(--tertiary))",
            color: "var(--fn-foreground, var(--foreground))",
            fontSize: 14,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            lineHeight: 1.6,
            resize: "none",
            outline: "none",
          }}
        />
      </div>

      {/* Help Text */}
      <div
        style={{
          position: "fixed",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--fn-muted, var(--secondary))",
            backgroundColor: "var(--fn-card-background, var(--tertiary))",
            padding: "4px 12px",
            borderRadius: 16,
          }}
        >
          Use # for headings • Each heading creates a new card • ⌘S to save
        </span>
      </div>
    </div>
  );
}
