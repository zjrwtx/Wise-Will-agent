"use client";

/**
 * FlashNote Page - Google-Doubao Style.
 *
 * Main page for the FlashNote learning system with note management,
 * flashcard study, bookmarks, themes, and cloud sync.
 *
 * Features:
 * - Unified Google-style color palette
 * - Doubao-style centered layout for empty state
 * - Bottom navigation bar
 * - Consistent card and button styles
 */

import { useRef } from "react";
import Link from "next/link";
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
import {
  colors,
  shadows,
  radius,
  typography,
  animationKeyframes,
  getToolGradient,
} from "@/styles/design-system";

/** Example markdown format */
const EXAMPLE_FORMAT = `# Title 1
This is the first card content
- Supports lists
- **Bold text**
- Math: $E = mc^2$

## Title 2
This is the second card
Inline math: $\\alpha + \\beta$`;

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
   * Render empty state with Doubao-style centered layout.
   */
  const renderEmptyState = () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        animation: "fadeIn 0.4s ease",
      }}
    >
      {/* Hero */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: radius.xl,
          background: getToolGradient("flashnote"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          marginBottom: 24,
        }}
      >
        📝
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: typography.fontWeight.semibold,
          color: colors.textPrimary,
          marginBottom: 8,
        }}
      >
        开始学习
      </h2>
      <p
        style={{
          fontSize: typography.fontSize.lg,
          color: colors.textSecondary,
          marginBottom: 32,
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        导入 Markdown 文件创建闪卡，高效记忆知识点
      </p>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "12px 24px",
            backgroundColor: colors.flashNote,
            color: "white",
            borderRadius: radius.md,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ArrowUpTrayIcon style={{ width: 18, height: 18 }} />
          导入文件
        </button>
        <button
          onClick={startNewFile}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            color: colors.flashNote,
            borderRadius: radius.md,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
            cursor: "pointer",
            border: `1px solid ${colors.flashNote}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PlusIcon style={{ width: 18, height: 18 }} />
          新建笔记
        </button>
      </div>

      {/* Format Example */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          border: `1px solid ${colors.border}`,
          padding: 20,
          maxWidth: 400,
          width: "100%",
          boxShadow: shadows.card,
        }}
      >
        <p
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.textSecondary,
            marginBottom: 12,
          }}
        >
          支持的 Markdown 格式：
        </p>
        <pre
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textTertiary,
            whiteSpace: "pre-wrap",
            fontFamily: typography.fontMono,
            lineHeight: typography.lineHeight.relaxed,
            margin: 0,
          }}
        >
          {EXAMPLE_FORMAT}
        </pre>
      </div>
    </div>
  );

  /**
   * Render main content based on active tab.
   */
  const renderMainContent = () => {
    // Empty state
    if (files.length === 0 && activeTab === "home") {
      return renderEmptyState();
    }

    // Home tab - file list
    if (activeTab === "home") {
      return (
        <div style={{ padding: 16 }}>
          <NoteList
            files={files}
            onSelectFile={handleSelectFile}
            onEditFile={startEditFile}
            onDeleteFile={deleteFile}
            onExportFile={exportFile}
            onExportAll={exportAllFiles}
            onTogglePin={togglePinFile}
          />
        </div>
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
        <div style={{ padding: 16 }}>
          <BookmarkManager
            collections={bookmarkCollections}
            onAddCollection={addBookmarkCollection}
            onAddBookmark={addBookmark}
            onDeleteBookmark={deleteBookmark}
            onDeleteCollection={deleteBookmarkCollection}
            onTogglePinCollection={togglePinCollection}
            onImportAsNote={importExtractedContent}
          />
        </div>
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

    return null;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.backgroundGradient,
        display: "flex",
        flexDirection: "column",
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
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colors.borderLight}`,
          backgroundColor: colors.surface,
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: colors.textSecondary,
              fontSize: typography.fontSize.md,
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: radius.sm,
              transition: "all 0.15s",
            }}
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.md,
                background: getToolGradient("flashnote"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              📝
            </div>
            <h1
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textPrimary,
              }}
            >
              FlashNote
            </h1>
          </div>
        </div>
        {files.length > 0 && activeTab === "home" && (
          <button
            onClick={clearAllFiles}
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.error,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: radius.sm,
            }}
          >
            清空全部
          </button>
        )}
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          paddingBottom: 90,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderMainContent()}
      </div>

      {/* Bottom Navigation */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.borderLight}`,
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
            padding: "10px 16px 14px",
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
                activeTab === "home" ? colors.flashNote : colors.textTertiary,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {activeTab === "home" ? (
              <HomeIconSolid style={{ width: 24, height: 24 }} />
            ) : (
              <HomeIcon style={{ width: 24, height: 24 }} />
            )}
            <span style={{ fontSize: 11, marginTop: 4 }}>首页</span>
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
                  ? colors.flashNote
                  : colors.textTertiary,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {activeTab === "bookmarks" ? (
              <LinkIconSolid style={{ width: 24, height: 24 }} />
            ) : (
              <LinkIcon style={{ width: 24, height: 24 }} />
            )}
            <span style={{ fontSize: 11, marginTop: 4 }}>书签</span>
          </button>

          {/* New Note (Center Button) */}
          <button
            onClick={startNewFile}
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: -20,
              padding: 14,
              background: getToolGradient("flashnote"),
              color: "white",
              borderRadius: radius.lg,
              boxShadow: shadows.lg,
              border: "none",
              cursor: "pointer",
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
                activeTab === "study" ? colors.flashNote : colors.textTertiary,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              opacity: currentFile ? 1 : 0.5,
            }}
          >
            {activeTab === "study" ? (
              <DocumentTextIconSolid style={{ width: 24, height: 24 }} />
            ) : (
              <DocumentTextIcon style={{ width: 24, height: 24 }} />
            )}
            <span style={{ fontSize: 11, marginTop: 4 }}>学习</span>
          </button>

          {/* Cloud */}
          <button
            onClick={() => setShowStorageModal(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              color: showStorageModal ? colors.flashNote : colors.textTertiary,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <CloudIcon style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 11, marginTop: 4 }}>云端</span>
          </button>
        </div>
      </div>

      {/* Storage Provider Modal */}
      <StorageProviderModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        onProviderChange={handleStorageProviderChange}
      />

      {/* Global Styles */}
      <style jsx global>{animationKeyframes}</style>
    </main>
  );
}
