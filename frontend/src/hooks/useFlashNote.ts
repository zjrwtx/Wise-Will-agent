"use client";

/**
 * useFlashNote Hook.
 *
 * Custom hook for managing FlashNote state including files,
 * bookmarks, themes, and storage sync.
 *
 * Example:
 *     const {
 *         files,
 *         currentFile,
 *         addFile,
 *         deleteFile,
 *         ...
 *     } = useFlashNote();
 */

import { useState, useEffect, useCallback } from "react";
import {
  FileData,
  BookmarkCollection,
  Bookmark,
  Theme,
  StorageProvider,
  FlashNoteTab,
} from "@/types/flashnote";
import { parseMarkdown, cardsToMarkdown } from "@/utils/markdown";
import { themes, applyTheme, loadSavedTheme } from "@/utils/themes";
import { StorageManager } from "@/utils/webdav";

// Storage keys
const FILES_STORAGE_KEY = "flashnote-files";
const BOOKMARKS_STORAGE_KEY = "flashnote-bookmarks";

/**
 * Default guide note for new users.
 */
const createDefaultGuideNote = (): FileData => ({
  id: Date.now().toString(),
  name: "FlashNote Guide.md",
  cards: [
    {
      id: "guide-1",
      title: "Welcome to FlashNote",
      content:
        "Welcome to FlashNote! This is a learning tool that converts " +
        "Markdown documents into flashcards for efficient studying.",
      level: 1,
    },
    {
      id: "guide-2",
      title: "Creating Notes",
      content:
        "You can create notes in several ways:\n\n" +
        "1. Click the **+** button to create a new note\n" +
        "2. Import existing Markdown files\n" +
        "3. Extract content from web pages\n\n" +
        "Each heading (# or ##) creates a new flashcard.",
      level: 2,
    },
    {
      id: "guide-3",
      title: "Markdown Support",
      content:
        "FlashNote supports rich Markdown syntax:\n\n" +
        "- **Bold** and *italic* text\n" +
        "- Lists and numbered items\n" +
        "- Code blocks with syntax highlighting\n" +
        "- Math formulas: $E = mc^2$\n" +
        "- Tables and images\n\n" +
        "Block math:\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$",
      level: 2,
    },
    {
      id: "guide-4",
      title: "Bookmarks",
      content:
        "Save and organize web links:\n\n" +
        "1. Go to the **Bookmarks** tab\n" +
        "2. Create a collection\n" +
        "3. Add links with tags\n" +
        "4. Extract content to import as notes\n\n" +
        "Perfect for saving articles and resources!",
      level: 2,
    },
    {
      id: "guide-5",
      title: "Cloud Sync",
      content:
        "Sync your notes across devices:\n\n" +
        "1. Click the **Cloud** icon\n" +
        "2. Add a WebDAV server\n" +
        "3. Your notes sync automatically\n\n" +
        "Works with Nextcloud, ownCloud, and more!",
      level: 2,
    },
  ],
  lastModified: Date.now(),
  currentIndex: 0,
  pinned: true,
});

/**
 * FlashNote state management hook.
 *
 * Returns:
 *     Object containing all state and handlers for FlashNote.
 */
export function useFlashNote() {
  // Core state
  const [files, setFiles] = useState<FileData[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FlashNoteTab>("home");

  // Bookmark state
  const [bookmarkCollections, setBookmarkCollections] = useState<
    BookmarkCollection[]
  >([]);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [showThemes, setShowThemes] = useState(false);

  // Storage state
  const [storageManager] = useState(() => new StorageManager());
  const [activeStorageProvider, setActiveStorageProvider] =
    useState<StorageProvider | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);

  // Edit state
  const [editContent, setEditContent] = useState("");
  const [editFileName, setEditFileName] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  /**
   * Load data from localStorage on mount.
   */
  useEffect(() => {
    // Load files
    const savedFiles = localStorage.getItem(FILES_STORAGE_KEY);
    if (savedFiles) {
      try {
        setFiles(JSON.parse(savedFiles));
      } catch (error) {
        console.error("Failed to load files:", error);
      }
    } else {
      // Add default guide for new users
      setFiles([createDefaultGuideNote()]);
    }

    // Load bookmarks
    const savedBookmarks = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (savedBookmarks) {
      try {
        setBookmarkCollections(JSON.parse(savedBookmarks));
      } catch (error) {
        console.error("Failed to load bookmarks:", error);
      }
    }

    // Load theme
    const savedTheme = loadSavedTheme();
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);

    // Load storage provider
    const provider = storageManager.getActiveProvider();
    setActiveStorageProvider(provider);
  }, [storageManager]);

  /**
   * Save files to localStorage and sync to WebDAV.
   */
  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));

      // Sync to WebDAV if active
      if (activeStorageProvider?.type === "webdav") {
        files.forEach((file) => {
          storageManager.syncFile(file).catch((error) => {
            console.error("Failed to sync file:", error);
          });
        });
      }
    } else {
      localStorage.removeItem(FILES_STORAGE_KEY);
    }
  }, [files, activeStorageProvider, storageManager]);

  /**
   * Save bookmarks to localStorage and sync to WebDAV.
   */
  useEffect(() => {
    if (bookmarkCollections.length > 0) {
      localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify(bookmarkCollections)
      );

      // Sync to WebDAV if active
      if (activeStorageProvider?.type === "webdav") {
        storageManager.syncBookmarks(bookmarkCollections).catch((error) => {
          console.error("Failed to sync bookmarks:", error);
        });
      }
    } else {
      localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    }
  }, [bookmarkCollections, activeStorageProvider, storageManager]);

  // Get current file
  const currentFile = files.find((f) => f.id === currentFileId) || null;

  // ==================== File Operations ====================

  /**
   * Add a new file from Markdown content.
   */
  const addFile = useCallback((content: string, fileName?: string) => {
    const { cards } = parseMarkdown(content);

    // Extract title from first heading
    let name = fileName || "New Note.md";
    if (!fileName && cards.length > 0 && cards[0].level === 1) {
      name = `${cards[0].title}.md`;
    }

    const newFile: FileData = {
      id: Date.now().toString(),
      name,
      cards,
      lastModified: Date.now(),
      currentIndex: 0,
    };

    setFiles((prev) => [...prev, newFile]);
    setCurrentFileId(newFile.id);
    setActiveTab("study");

    return newFile;
  }, []);

  /**
   * Import files from file input.
   */
  const importFiles = useCallback(
    async (fileList: FileList) => {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const text = await file.text();
        addFile(text, file.name);
      }
    },
    [addFile]
  );

  /**
   * Update a file's content.
   */
  const updateFile = useCallback(
    (fileId: string, content: string, fileName?: string) => {
      const { cards } = parseMarkdown(content);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                name: fileName || f.name,
                cards,
                lastModified: Date.now(),
              }
            : f
        )
      );
    },
    []
  );

  /**
   * Delete a file.
   */
  const deleteFile = useCallback(
    (fileId: string) => {
      if (window.confirm("Are you sure you want to delete this file?")) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        if (currentFileId === fileId) {
          setCurrentFileId(null);
          setActiveTab("home");
        }
      }
    },
    [currentFileId]
  );

  /**
   * Export a file as Markdown.
   */
  const exportFile = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      const content = cardsToMarkdown(file.cards);
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [files]
  );

  /**
   * Export all files.
   */
  const exportAllFiles = useCallback(() => {
    files.forEach((file) => {
      const content = cardsToMarkdown(file.cards);
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }, [files]);

  /**
   * Toggle file pin status.
   */
  const togglePinFile = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, pinned: !f.pinned } : f))
    );
  }, []);

  /**
   * Update current card index for a file.
   */
  const updateCardIndex = useCallback((fileId: string, index: number) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, currentIndex: index } : f))
    );
  }, []);

  /**
   * Clear all files.
   */
  const clearAllFiles = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all files?")) {
      setFiles([]);
      setCurrentFileId(null);
      setActiveTab("home");
    }
  }, []);

  // ==================== Edit Operations ====================

  /**
   * Start editing a file.
   */
  const startEditFile = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      const content = cardsToMarkdown(file.cards);
      setEditContent(content);
      setEditFileName(file.name);
      setEditingFileId(fileId);
      setActiveTab("edit");
    },
    [files]
  );

  /**
   * Start creating a new file.
   */
  const startNewFile = useCallback(() => {
    setEditContent("# New Note\n\nStart writing here...");
    setEditFileName("New Note.md");
    setEditingFileId(null);
    setActiveTab("edit");
  }, []);

  /**
   * Save edited content.
   */
  const saveEdit = useCallback(() => {
    if (editingFileId) {
      updateFile(editingFileId, editContent, editFileName);
      setCurrentFileId(editingFileId);
    } else {
      addFile(editContent, editFileName);
    }
    setActiveTab("study");
    setEditingFileId(null);
  }, [editingFileId, editContent, editFileName, updateFile, addFile]);

  /**
   * Cancel editing.
   */
  const cancelEdit = useCallback(() => {
    setEditContent("");
    setEditFileName("");
    setEditingFileId(null);
    setActiveTab("home");
  }, []);

  // ==================== Bookmark Operations ====================

  /**
   * Add a bookmark collection.
   */
  const addBookmarkCollection = useCallback((name: string) => {
    const newCollection: BookmarkCollection = {
      id: Date.now().toString(),
      name,
      bookmarks: [],
      lastModified: Date.now(),
    };
    setBookmarkCollections((prev) => [...prev, newCollection]);
  }, []);

  /**
   * Add a bookmark to a collection.
   */
  const addBookmark = useCallback(
    (collectionId: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => {
      const newBookmark: Bookmark = {
        ...bookmark,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };

      setBookmarkCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId
            ? {
                ...c,
                bookmarks: [...c.bookmarks, newBookmark],
                lastModified: Date.now(),
              }
            : c
        )
      );
    },
    []
  );

  /**
   * Delete a bookmark.
   */
  const deleteBookmark = useCallback(
    (collectionId: string, bookmarkId: string) => {
      if (window.confirm("Are you sure you want to delete this bookmark?")) {
        setBookmarkCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  bookmarks: c.bookmarks.filter((b) => b.id !== bookmarkId),
                  lastModified: Date.now(),
                }
              : c
          )
        );
      }
    },
    []
  );

  /**
   * Delete a bookmark collection.
   */
  const deleteBookmarkCollection = useCallback((collectionId: string) => {
    if (window.confirm("Are you sure you want to delete this collection?")) {
      setBookmarkCollections((prev) =>
        prev.filter((c) => c.id !== collectionId)
      );
    }
  }, []);

  /**
   * Toggle collection pin status.
   */
  const togglePinCollection = useCallback((collectionId: string) => {
    setBookmarkCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, pinned: !c.pinned } : c
      )
    );
  }, []);

  /**
   * Import extracted content as a note.
   */
  const importExtractedContent = useCallback(
    (content: string) => {
      const file = addFile(content);
      alert(`Successfully imported as note: ${file.name}`);
    },
    [addFile]
  );

  // ==================== Theme Operations ====================

  /**
   * Change the current theme.
   */
  const changeTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    setShowThemes(false);
  }, []);

  // ==================== Storage Operations ====================

  /**
   * Handle storage provider change.
   */
  const handleStorageProviderChange = useCallback(
    (provider: StorageProvider | null) => {
      setActiveStorageProvider(provider);
    },
    []
  );

  return {
    // State
    files,
    currentFile,
    currentFileId,
    activeTab,
    bookmarkCollections,
    currentTheme,
    showThemes,
    showStorageModal,
    activeStorageProvider,
    editContent,
    editFileName,
    editingFileId,

    // Setters
    setCurrentFileId,
    setActiveTab,
    setShowThemes,
    setShowStorageModal,
    setEditContent,
    setEditFileName,

    // File operations
    addFile,
    importFiles,
    updateFile,
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
  };
}
