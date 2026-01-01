"use client";

/**
 * BookmarkManager Component for FlashNote.
 *
 * Manages bookmark collections with URL extraction and
 * content import functionality.
 *
 * Example:
 *     <BookmarkManager
 *         collections={bookmarkCollections}
 *         onAddCollection={(name) => handleAddCollection(name)}
 *         onAddBookmark={(collectionId, bookmark) => handleAdd(collectionId, bookmark)}
 *         onDeleteBookmark={(collectionId, bookmarkId) => handleDelete(collectionId, bookmarkId)}
 *         onDeleteCollection={(collectionId) => handleDeleteCollection(collectionId)}
 *         onTogglePinCollection={(collectionId) => handleTogglePin(collectionId)}
 *         onImportAsNote={(content) => handleImport(content)}
 *     />
 */

import { useState } from "react";
import {
  PlusIcon,
  LinkIcon,
  XMarkIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { TrashIcon, StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { BookmarkCollection, Bookmark } from "@/types/flashnote";

interface BookmarkManagerProps {
  collections: BookmarkCollection[];
  onAddCollection: (name: string) => void;
  onAddBookmark: (
    collectionId: string,
    bookmark: Omit<Bookmark, "id" | "createdAt">
  ) => void;
  onDeleteBookmark: (collectionId: string, bookmarkId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onTogglePinCollection: (collectionId: string) => void;
  onImportAsNote: (content: string) => void;
}

/**
 * Bookmark manager component with collections and URL extraction.
 *
 * Args:
 *     collections: Array of BookmarkCollection objects.
 *     onAddCollection: Callback to add new collection.
 *     onAddBookmark: Callback to add bookmark to collection.
 *     onDeleteBookmark: Callback to delete bookmark.
 *     onDeleteCollection: Callback to delete collection.
 *     onTogglePinCollection: Callback to toggle collection pin.
 *     onImportAsNote: Callback to import extracted content as note.
 */
export function BookmarkManager({
  collections,
  onAddCollection,
  onAddBookmark,
  onDeleteBookmark,
  onDeleteCollection,
  onTogglePinCollection,
  onImportAsNote,
}: BookmarkManagerProps) {
  const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(
    null
  );
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("New Collection");
  const [newBookmark, setNewBookmark] = useState({
    title: "",
    url: "",
    description: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState("");

  /**
   * Handle adding a new collection.
   */
  const handleAddCollection = () => {
    if (newCollectionName.trim()) {
      onAddCollection(newCollectionName.trim());
      setNewCollectionName("New Collection");
      setIsAddingCollection(false);
    }
  };

  /**
   * Handle adding a new bookmark.
   */
  const handleAddBookmark = () => {
    if (!currentCollectionId || !newBookmark.url || !newBookmark.title) return;

    let url = newBookmark.url;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    onAddBookmark(currentCollectionId, {
      title: newBookmark.title,
      url,
      description: newBookmark.description,
      tags: newBookmark.tags,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
    });

    setNewBookmark({ title: "", url: "", description: "", tags: [] });
    setExtractedContent("");
    setIsAddingBookmark(false);
  };

  /**
   * Add tag to new bookmark.
   */
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setNewBookmark((prev) => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()],
    }));
    setTagInput("");
  };

  /**
   * Remove tag from new bookmark.
   */
  const handleRemoveTag = (tag: string) => {
    setNewBookmark((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  /**
   * Extract content from URL using Jina AI.
   */
  const extractUrlContent = async (url: string) => {
    if (!url) return;

    setIsExtracting(true);

    try {
      let urlToFetch = url;
      if (!/^https?:\/\//i.test(urlToFetch)) {
        urlToFetch = "https://" + urlToFetch;
      }

      const apiUrl = `https://r.jina.ai/${urlToFetch}`;
      const headers = {
        Authorization:
          "Bearer jina_adbf5d897e4b416cbe6fb7c91f0b4a7c-Ij9Q_cY9Syuo473pYUAFyi4_I_K",
        "X-Return-Format": "markdown",
      };

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.status}`);
      }

      const content = await response.text();
      setExtractedContent(content);

      // Auto-extract title
      if (!newBookmark.title) {
        const lines = content.split("\n");
        if (lines.length > 0) {
          const title = lines[0]
            .replace(/^#+\s*/, "")
            .replace(/[*_`]/g, "")
            .trim();
          setNewBookmark((prev) => ({ ...prev, title }));
        }
      }

      // Auto-extract description
      if (!newBookmark.description) {
        const description = content
          .replace(/^#+.*\n/, "")
          .replace(/[*_`#]/g, "")
          .trim()
          .slice(0, 150);
        setNewBookmark((prev) => ({ ...prev, description }));
      }
    } catch (error) {
      console.error("Failed to extract URL content:", error);
      alert(
        `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // Sort collections: pinned first, then by last modified
  const sortedCollections = [...collections].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastModified - a.lastModified;
  });

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
        <h2 style={{ fontWeight: 500 }}>Bookmarks</h2>
        <button
          onClick={() => setIsAddingCollection(true)}
          style={{
            padding: 8,
            color: "var(--fn-primary, var(--accent))",
            transition: "color 0.15s ease",
          }}
          aria-label="Add collection"
        >
          <PlusIcon style={{ width: 24, height: 24 }} />
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Add Collection Form */}
        {isAddingCollection && (
          <div
            style={{
              padding: 16,
              marginBottom: 16,
              borderRadius: 12,
              backgroundColor: "var(--fn-card-background, var(--tertiary))",
            }}
          >
            <h3 style={{ fontWeight: 500, marginBottom: 12 }}>New Collection</h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                backgroundColor: "var(--fn-background, var(--background))",
                color: "var(--fn-foreground, var(--foreground))",
                fontSize: 14,
                marginBottom: 12,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setIsAddingCollection(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "var(--fn-secondary, var(--secondary))",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCollection}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  backgroundColor: "var(--fn-primary, var(--accent))",
                  color: "var(--fn-primary-foreground, white)",
                  borderRadius: 8,
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Collections List */}
        {sortedCollections.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sortedCollections.map((collection) => (
              <div
                key={collection.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "var(--fn-card-background, var(--tertiary))",
                }}
              >
                {/* Collection Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div
                    onClick={() =>
                      setCurrentCollectionId(
                        currentCollectionId === collection.id
                          ? null
                          : collection.id
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flex: 1,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 12,
                        backgroundColor:
                          "var(--fn-secondary-background, var(--border))",
                      }}
                    >
                      <LinkIcon
                        style={{
                          width: 24,
                          height: 24,
                          color: "var(--fn-primary, var(--accent))",
                        }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <h3 style={{ fontWeight: 500 }}>{collection.name}</h3>
                        {collection.pinned && (
                          <StarIconSolid
                            style={{
                              width: 16,
                              height: 16,
                              color: "var(--fn-primary, var(--accent))",
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--fn-secondary, var(--secondary))",
                        }}
                      >
                        {collection.bookmarks.length} links
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      onClick={() => onTogglePinCollection(collection.id)}
                      title={collection.pinned ? "Unpin" : "Pin"}
                      style={{
                        padding: 8,
                        color: collection.pinned
                          ? "var(--fn-primary, var(--accent))"
                          : "var(--fn-secondary, var(--secondary))",
                      }}
                    >
                      {collection.pinned ? (
                        <StarIconSolid style={{ width: 20, height: 20 }} />
                      ) : (
                        <StarIcon style={{ width: 20, height: 20 }} />
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteCollection(collection.id)}
                      title="Delete"
                      style={{
                        padding: 8,
                        color: "var(--fn-secondary, var(--secondary))",
                      }}
                    >
                      <TrashIcon style={{ width: 20, height: 20 }} />
                    </button>
                  </div>
                </div>

                {/* Expanded Collection Content */}
                {currentCollectionId === collection.id && (
                  <div style={{ marginTop: 16 }}>
                    {/* Add Bookmark Button */}
                    <button
                      onClick={() => setIsAddingBookmark(true)}
                      style={{
                        width: "100%",
                        padding: 12,
                        border: "2px dashed var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "var(--fn-secondary, var(--secondary))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginBottom: 16,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <PlusIcon style={{ width: 16, height: 16 }} />
                      Add Link
                    </button>

                    {/* Add Bookmark Form */}
                    {isAddingBookmark && (
                      <div
                        style={{
                          padding: 16,
                          marginBottom: 16,
                          borderRadius: 8,
                          border: "1px solid var(--fn-primary, var(--accent))",
                          backgroundColor:
                            "var(--fn-background, var(--background))",
                        }}
                      >
                        <h4 style={{ fontWeight: 500, marginBottom: 12 }}>
                          Add Link
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: "var(--fn-secondary, var(--secondary))",
                                marginBottom: 4,
                              }}
                            >
                              Title
                            </label>
                            <input
                              type="text"
                              value={newBookmark.title}
                              onChange={(e) =>
                                setNewBookmark((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Link title"
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                backgroundColor:
                                  "var(--fn-card-background, var(--tertiary))",
                                color:
                                  "var(--fn-foreground, var(--foreground))",
                                fontSize: 14,
                                outline: "none",
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: "var(--fn-secondary, var(--secondary))",
                                marginBottom: 4,
                              }}
                            >
                              URL
                            </label>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <input
                                type="text"
                                value={newBookmark.url}
                                onChange={(e) =>
                                  setNewBookmark((prev) => ({
                                    ...prev,
                                    url: e.target.value,
                                  }))
                                }
                                placeholder="https://example.com"
                                style={{
                                  flex: 1,
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  border: "1px solid var(--border)",
                                  backgroundColor:
                                    "var(--fn-card-background, var(--tertiary))",
                                  color:
                                    "var(--fn-foreground, var(--foreground))",
                                  fontSize: 14,
                                  outline: "none",
                                }}
                              />
                              <button
                                onClick={() =>
                                  extractUrlContent(newBookmark.url)
                                }
                                disabled={!newBookmark.url || isExtracting}
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 13,
                                  backgroundColor:
                                    "var(--fn-primary, var(--accent))",
                                  color: "var(--fn-primary-foreground, white)",
                                  borderRadius: 8,
                                  opacity:
                                    !newBookmark.url || isExtracting ? 0.5 : 1,
                                  cursor:
                                    !newBookmark.url || isExtracting
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {isExtracting ? "Extracting..." : "Extract"}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: "var(--fn-secondary, var(--secondary))",
                                marginBottom: 4,
                              }}
                            >
                              Description (optional)
                            </label>
                            <textarea
                              value={newBookmark.description}
                              onChange={(e) =>
                                setNewBookmark((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Description"
                              rows={2}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                backgroundColor:
                                  "var(--fn-card-background, var(--tertiary))",
                                color:
                                  "var(--fn-foreground, var(--foreground))",
                                fontSize: 14,
                                resize: "none",
                                outline: "none",
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: "var(--fn-secondary, var(--secondary))",
                                marginBottom: 4,
                              }}
                            >
                              Tags (optional)
                            </label>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                              }}
                            >
                              <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTag();
                                  }
                                }}
                                placeholder="Add tag"
                                style={{
                                  flex: 1,
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  border: "1px solid var(--border)",
                                  backgroundColor:
                                    "var(--fn-card-background, var(--tertiary))",
                                  color:
                                    "var(--fn-foreground, var(--foreground))",
                                  fontSize: 14,
                                  outline: "none",
                                }}
                              />
                              <button
                                onClick={handleAddTag}
                                style={{
                                  padding: "10px 16px",
                                  fontSize: 13,
                                  backgroundColor:
                                    "var(--fn-primary, var(--accent))",
                                  color: "var(--fn-primary-foreground, white)",
                                  borderRadius: 8,
                                }}
                              >
                                Add
                              </button>
                            </div>
                            {newBookmark.tags.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                }}
                              >
                                {newBookmark.tags.map((tag) => (
                                  <div
                                    key={tag}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                      padding: "4px 8px",
                                      borderRadius: 16,
                                      backgroundColor:
                                        "var(--fn-primary, var(--accent))",
                                      opacity: 0.2,
                                      fontSize: 12,
                                    }}
                                  >
                                    <span>{tag}</span>
                                    <button
                                      onClick={() => handleRemoveTag(tag)}
                                      style={{
                                        padding: 0,
                                        color:
                                          "var(--fn-primary, var(--accent))",
                                      }}
                                    >
                                      <XMarkIcon
                                        style={{ width: 12, height: 12 }}
                                      />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Extracted Content Preview */}
                          {extractedContent && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                border:
                                  "1px solid var(--fn-primary, var(--accent))",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 8,
                                }}
                              >
                                <h5 style={{ fontSize: 13, fontWeight: 500 }}>
                                  Extracted Content
                                </h5>
                                <button
                                  onClick={() => onImportAsNote(extractedContent)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "4px 8px",
                                    fontSize: 12,
                                    color: "var(--fn-primary, var(--accent))",
                                    border:
                                      "1px solid var(--fn-primary, var(--accent))",
                                    borderRadius: 4,
                                  }}
                                >
                                  <DocumentTextIcon
                                    style={{ width: 12, height: 12 }}
                                  />
                                  Import as Note
                                </button>
                              </div>
                              <div
                                style={{
                                  maxHeight: 160,
                                  overflowY: "auto",
                                  fontSize: 12,
                                  color:
                                    "var(--fn-secondary, var(--secondary))",
                                  backgroundColor:
                                    "var(--fn-secondary-background, var(--border))",
                                  padding: 8,
                                  borderRadius: 4,
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {extractedContent.slice(0, 500)}...
                              </div>
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 8,
                            }}
                          >
                            <button
                              onClick={() => {
                                setIsAddingBookmark(false);
                                setExtractedContent("");
                                setNewBookmark({
                                  title: "",
                                  url: "",
                                  description: "",
                                  tags: [],
                                });
                              }}
                              style={{
                                padding: "8px 16px",
                                fontSize: 13,
                                color: "var(--fn-secondary, var(--secondary))",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddBookmark}
                              disabled={!newBookmark.title || !newBookmark.url}
                              style={{
                                padding: "8px 16px",
                                fontSize: 13,
                                backgroundColor:
                                  "var(--fn-primary, var(--accent))",
                                color: "var(--fn-primary-foreground, white)",
                                borderRadius: 8,
                                opacity:
                                  !newBookmark.title || !newBookmark.url
                                    ? 0.5
                                    : 1,
                                cursor:
                                  !newBookmark.title || !newBookmark.url
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bookmarks List */}
                    {collection.bookmarks.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {collection.bookmarks.map((bookmark) => (
                          <div
                            key={bookmark.id}
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              backgroundColor:
                                "var(--fn-background, var(--background))",
                              transition: "transform 0.15s ease",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 12,
                              }}
                            >
                              {bookmark.favicon && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={bookmark.favicon}
                                  alt=""
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 4,
                                  }}
                                />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <a
                                  href={bookmark.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontWeight: 500,
                                    color: "var(--fn-primary, var(--accent))",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    textDecoration: "none",
                                  }}
                                >
                                  {bookmark.title}
                                  <GlobeAltIcon
                                    style={{ width: 12, height: 12 }}
                                  />
                                </a>
                                {bookmark.description && (
                                  <p
                                    style={{
                                      fontSize: 13,
                                      color:
                                        "var(--fn-secondary, var(--secondary))",
                                      marginTop: 4,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {bookmark.description}
                                  </p>
                                )}
                                {bookmark.tags && bookmark.tags.length > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 4,
                                      marginTop: 8,
                                    }}
                                  >
                                    {bookmark.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        style={{
                                          padding: "2px 8px",
                                          borderRadius: 12,
                                          backgroundColor:
                                            "var(--fn-primary, var(--accent))",
                                          opacity: 0.2,
                                          fontSize: 11,
                                        }}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  onDeleteBookmark(collection.id, bookmark.id)
                                }
                                title="Delete"
                                style={{
                                  padding: 4,
                                  color:
                                    "var(--fn-secondary, var(--secondary))",
                                }}
                              >
                                <TrashIcon style={{ width: 16, height: 16 }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: 32,
                          color: "var(--fn-secondary, var(--secondary))",
                        }}
                      >
                        <p>No bookmarks yet</p>
                        <p style={{ fontSize: 13, marginTop: 4 }}>
                          Click above to add a link
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--fn-secondary, var(--secondary))",
            }}
          >
            <LinkIcon
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 8px",
                color: "var(--fn-primary, var(--accent))",
              }}
            />
            <h3 style={{ fontWeight: 500, marginBottom: 4 }}>No Collections</h3>
            <p style={{ fontSize: 13 }}>
              Click the + button to create a collection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
