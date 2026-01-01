"use client";

/**
 * FlashNote Page.
 *
 * Main page for the FlashNote learning system with note management,
 * flashcard study, bookmarks, themes, and cloud sync.
 *
 * Features:
 *     - Import/export Markdown files
 *     - Create and edit notes
 *     - Study flashcards with navigation
 *     - Bookmark collections with URL extraction
 *     - Multiple themes
 *     - WebDAV cloud sync
 */

import { useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  HomeIcon,
  PlusIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  LinkIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  LinkIcon as LinkIconSolid,
} from "@heroicons/react/24/solid";

import {
  NoteList,
  CardViewer,
  NoteEditor,
  BookmarkManager,
  ThemeSelector,
  StorageProviderModal,
} from "@/components/flashnote";
import { useFlashNote } from "@/hooks/useFlashNote";

/**
 * FlashNote main page component.
 */
export default function FlashNotePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    // State
    files,
    currentFile,
    activeTab,
    bookmarkCollections,
    currentTheme,
    showThemes,
    showStorageModal,
    editContent,
    editFileName,

    // Setters
    setCurrentFileId,
    setActiveTab,
    setShowThemes,
    setShowStorageModal,
    setEditContent,
    setEditFileName,

    // File operations
    importFiles,
    deleteFile,
    exportFile,
    exportAllFiles,
    togglePinFile,
    updateCardIndex,
    clearAllFiles,

    // Edit operations
    startEditFile,
    startNewFile,
    saveEdit,
    cancelEdit,

    // Bookmark operations
    addBookmarkCollection,
    addBookmark,
    deleteBookmark,
    deleteBookmarkCollection,
    togglePinCollection,
    importExtractedContent,

    // Theme operations
    changeTheme,
    themes,

    // Storage operations
    handleStorageProviderChange,
  } = useFlashNote();

  /**
   * Handle file input change.
   */
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      await importFiles(fileList);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Handle file selection for study.
   */
  const handleSelectFile = (fileId: string) => {
    setCurrentFileId(fileId);
    setActiveTab("study");
  };

  /**
   * Render main content based on active tab.
   */
  const renderMainContent = () => {
    // Empty state
    if (files.length === 0 && activeTab === "home") {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "64px 16px",
          }}
        >
          <DocumentTextIcon
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              color: "var(--fn-primary, var(--accent))",
            }}
          />
          <h2
            style={{
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Start Learning
          </h2>
          <p
            style={{
              color: "var(--fn-secondary, var(--secondary))",
              marginBottom: 32,
            }}
          >
            Import Markdown files to create flashcards
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "12px 24px",
              backgroundColor: "var(--fn-primary, var(--accent))",
              color: "var(--fn-primary-foreground, white)",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Import Markdown Files
          </button>

          <div
            style={{
              marginTop: 32,
              padding: 16,
              borderRadius: 12,
              backgroundColor: "var(--fn-card-background, var(--tertiary))",
              textAlign: "left",
              maxWidth: 400,
              margin: "32px auto 0",
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              Supported Format:
            </p>
            <pre
              style={{
                fontSize: 12,
                color: "var(--fn-secondary, var(--secondary))",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
              }}
            >
              {`# Title 1
This is the first card content
- Supports lists
- **Bold text**
- Math: $E = mc^2$

## Title 2
This is the second card
Inline math: $\\alpha + \\beta$
Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`}
            </pre>
          </div>
        </div>
      );
    }

    // Home tab - file list
    if (activeTab === "home") {
      return (
        <NoteList
          files={files}
          onSelectFile={handleSelectFile}
          onEditFile={startEditFile}
          onDeleteFile={deleteFile}
          onExportFile={exportFile}
          onExportAll={exportAllFiles}
          onTogglePin={togglePinFile}
        />
      );
    }

    // Edit tab
    if (activeTab === "edit") {
      return (
        <NoteEditor
          initialContent={editContent}
          initialFileName={editFileName}
          onSave={(content, fileName) => {
            setEditContent(content);
            setEditFileName(fileName);
            saveEdit();
          }}
          onCancel={cancelEdit}
        />
      );
    }

    // Bookmarks tab
    if (activeTab === "bookmarks") {
      return (
        <BookmarkManager
          collections={bookmarkCollections}
          onAddCollection={addBookmarkCollection}
          onAddBookmark={addBookmark}
          onDeleteBookmark={deleteBookmark}
          onDeleteCollection={deleteBookmarkCollection}
          onTogglePinCollection={togglePinCollection}
          onImportAsNote={importExtractedContent}
        />
      );
    }

    // Study tab - card viewer
    if (activeTab === "study" && currentFile) {
      return (
        <CardViewer
          file={currentFile}
          onBack={() => setActiveTab("home")}
          onUpdateIndex={(index) => updateCardIndex(currentFile.id, index)}
        />
      );
    }

    // Default to home
    return null;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--fn-background, var(--background))",
        color: "var(--fn-foreground, var(--foreground))",
      }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        accept=".md"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-label="Import Markdown files"
      />

      {/* Header */}
      <header
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--fn-background, var(--background))",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--fn-secondary, var(--secondary))",
              fontSize: 14,
            }}
          >
            ← Back
          </a>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            FlashNote
          </h1>
        </div>
        {files.length > 0 && activeTab === "home" && (
          <button
            onClick={clearAllFiles}
            style={{
              fontSize: 13,
              color: "var(--fn-destructive, #ef4444)",
            }}
          >
            Clear All
          </button>
        )}
      </header>

      {/* Main Content */}
      <div style={{ paddingBottom: 80 }}>{renderMainContent()}</div>

      {/* Bottom Navigation */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "var(--fn-card-background, var(--tertiary))",
          borderTop: "1px solid var(--border)",
          zIndex: 40,
        }}
      >
        {/* Theme Selector */}
        <AnimatePresence>
          {showThemes && (
            <ThemeSelector
              currentTheme={currentTheme}
              onSelectTheme={changeTheme}
              onClose={() => setShowThemes(false)}
            />
          )}
        </AnimatePresence>

        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "8px 16px",
            maxWidth: 480,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* Home */}
          <button
            onClick={() => {
              setActiveTab("home");
              setCurrentFileId(null);
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color:
                activeTab === "home"
                  ? "var(--fn-primary, var(--accent))"
                  : "var(--fn-secondary, var(--secondary))",
            }}
          >
            {activeTab === "home" ? (
              <HomeIconSolid style={{ width: 24, height: 24 }} />
            ) : (
              <HomeIcon style={{ width: 24, height: 24 }} />
            )}
            <span style={{ fontSize: 11, marginTop: 2 }}>Home</span>
          </button>

          {/* Bookmarks */}
          <button
            onClick={() => setActiveTab("bookmarks")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color:
                activeTab === "bookmarks"
                  ? "var(--fn-primary, var(--accent))"
                  : "var(--fn-secondary, var(--secondary))",
            }}
          >
            {activeTab === "bookmarks" ? (
              <LinkIconSolid style={{ width: 24, height: 24 }} />
            ) : (
              <LinkIcon style={{ width: 24, height: 24 }} />
            )}
            <span style={{ fontSize: 11, marginTop: 2 }}>Bookmarks</span>
          </button>

          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color: "var(--fn-secondary, var(--secondary))",
            }}
          >
            <ArrowUpTrayIcon style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 11, marginTop: 2 }}>Import</span>
          </button>

          {/* New Note (Center Button) */}
          <button
            onClick={startNewFile}
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: -24,
              padding: 16,
              backgroundColor: "var(--fn-primary, var(--accent))",
              color: "var(--fn-primary-foreground, white)",
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
            aria-label="New note"
          >
            <PlusIcon style={{ width: 24, height: 24 }} />
          </button>

          {/* Study */}
          <button
            onClick={() => {
              if (currentFile) {
                setActiveTab("study");
              }
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color:
                activeTab === "study"
                  ? "var(--fn-primary, var(--accent))"
                  : "var(--fn-secondary, var(--secondary))",
              opacity: currentFile ? 1 : 0.5,
            }}
          >
            {activeTab === "study" ? (
              <DocumentTextIconSolid style={{ width: 24, height: 24 }} />
            ) : (
              <DocumentTextIcon style={{ width: 24, height: 24 }} />
            )}
            <span style={{ fontSize: 11, marginTop: 2 }}>Study</span>
          </button>

          {/* Cloud */}
          <button
            onClick={() => setShowStorageModal(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color: showStorageModal
                ? "var(--fn-primary, var(--accent))"
                : "var(--fn-secondary, var(--secondary))",
            }}
          >
            <CloudIcon style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 11, marginTop: 2 }}>Cloud</span>
          </button>

          {/* Theme */}
          <button
            onClick={() => setShowThemes((prev) => !prev)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color: showThemes
                ? "var(--fn-primary, var(--accent))"
                : "var(--fn-secondary, var(--secondary))",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: currentTheme.colors.primary,
                border: "2px solid currentColor",
              }}
            />
            <span style={{ fontSize: 11, marginTop: 2 }}>Theme</span>
          </button>
        </div>
      </div>

      {/* Storage Provider Modal */}
      <StorageProviderModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        onProviderChange={handleStorageProviderChange}
      />
    </main>
  );
}
