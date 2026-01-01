"use client";

/**
 * NoteList Component for FlashNote.
 *
 * Displays a list of note files with search, pin, edit, export,
 * and delete functionality.
 *
 * Example:
 *     <NoteList
 *         files={files}
 *         onSelectFile={(id) => setCurrentFileId(id)}
 *         onEditFile={(id) => handleEdit(id)}
 *         onDeleteFile={(id) => handleDelete(id)}
 *         onExportFile={(id) => handleExport(id)}
 *         onTogglePin={(id) => handleTogglePin(id)}
 *     />
 */

import { useState } from "react";
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  StarIcon as StarIconSolid,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { FileData, SearchResult } from "@/types/flashnote";

interface NoteListProps {
  files: FileData[];
  onSelectFile: (fileId: string) => void;
  onEditFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onExportFile: (fileId: string) => void;
  onExportAll: () => void;
  onTogglePin: (fileId: string) => void;
}

/**
 * Note list component with search and file management.
 *
 * Args:
 *     files: Array of FileData objects to display.
 *     onSelectFile: Callback when a file is selected for study.
 *     onEditFile: Callback when edit button is clicked.
 *     onDeleteFile: Callback when delete button is clicked.
 *     onExportFile: Callback when export button is clicked.
 *     onExportAll: Callback to export all files.
 *     onTogglePin: Callback to toggle file pin status.
 */
export function NoteList({
  files,
  onSelectFile,
  onEditFile,
  onDeleteFile,
  onExportFile,
  onExportAll,
  onTogglePin,
}: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  /**
   * Handle search input and find matching cards.
   */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const searchRegex = new RegExp(query, "gi");

    files.forEach((file) => {
      file.cards.forEach((card, cardIndex) => {
        const contentToSearch = `${card.title}\n${card.content}`;
        const matches = [...contentToSearch.matchAll(searchRegex)];

        if (matches.length > 0) {
          const matchPositions = matches.map((match) => ({
            start: match.index!,
            end: match.index! + match[0].length,
          }));

          results.push({
            fileId: file.id,
            fileName: file.name,
            cardIndex,
            title: card.title,
            content: contentToSearch,
            matchPositions,
          });
        }
      });
    });

    setSearchResults(results);
  };

  /**
   * Highlight matching text in search results.
   */
  const highlightText = (
    text: string,
    positions: { start: number; end: number }[]
  ) => {
    let lastIndex = 0;
    const parts: React.ReactNode[] = [];

    positions.forEach((pos, i) => {
      if (pos.start > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>{text.slice(lastIndex, pos.start)}</span>
        );
      }
      parts.push(
        <span
          key={`highlight-${i}`}
          style={{
            backgroundColor: "var(--fn-primary, var(--accent))",
            opacity: 0.2,
            borderRadius: 2,
            padding: "0 2px",
          }}
        >
          {text.slice(pos.start, pos.end)}
        </span>
      );
      lastIndex = pos.end;
    });

    if (lastIndex < text.length) {
      parts.push(<span key="text-last">{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  // Sort files: pinned first, then by last modified
  const sortedFiles = [...files].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastModified - a.lastModified;
  });

  return (
    <div style={{ padding: "0 16px", paddingBottom: 80 }}>
      {/* Search Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "8px 0",
          backgroundColor: "var(--fn-background, var(--background))",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search notes..."
            style={{
              width: "100%",
              padding: "10px 40px 10px 16px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              backgroundColor: "var(--fn-card-background, var(--tertiary))",
              color: "var(--fn-foreground, var(--foreground))",
              fontSize: 14,
              outline: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fn-secondary, var(--secondary))",
            }}
          >
            {searchQuery ? (
              <button
                onClick={() => handleSearch("")}
                style={{
                  padding: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <XMarkIcon style={{ width: 16, height: 16 }} />
              </button>
            ) : (
              <MagnifyingGlassIcon style={{ width: 16, height: 16 }} />
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div style={{ marginTop: 16 }}>
          {searchResults.length > 0 ? (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fn-secondary, var(--secondary))",
                  marginBottom: 12,
                }}
              >
                Found {searchResults.length} results
              </p>
              {searchResults.map((result, index) => (
                <div
                  key={`${result.fileId}-${result.cardIndex}-${index}`}
                  onClick={() => onSelectFile(result.fileId)}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 12,
                    backgroundColor:
                      "var(--fn-card-background, var(--tertiary))",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <DocumentTextIcon
                      style={{
                        width: 16,
                        height: 16,
                        color: "var(--fn-primary, var(--accent))",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--fn-secondary, var(--secondary))",
                      }}
                    >
                      {result.fileName}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 500, marginBottom: 4 }}>
                    {highlightText(
                      result.title,
                      result.matchPositions.filter(
                        (pos) => pos.start < result.title.length
                      )
                    )}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--fn-secondary, var(--secondary))",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {highlightText(
                      result.content.slice(result.title.length + 1, 150),
                      result.matchPositions
                        .filter((pos) => pos.start > result.title.length)
                        .map((pos) => ({
                          start: pos.start - result.title.length - 1,
                          end: pos.end - result.title.length - 1,
                        }))
                        .filter((pos) => pos.start < 150)
                    )}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--fn-secondary, var(--secondary))",
              }}
            >
              <p>No matching content found</p>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {!searchQuery && (
        <>
          {files.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 16,
              }}
            >
              <button
                onClick={onExportAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "var(--fn-primary, var(--accent))",
                  borderRadius: 8,
                  transition: "opacity 0.15s ease",
                }}
              >
                <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                Export All
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "var(--fn-card-background, var(--tertiary))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    onClick={() => onSelectFile(file.id)}
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
                      <DocumentTextIcon
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
                        <h3 style={{ fontWeight: 500 }}>{file.name}</h3>
                        {file.pinned && (
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
                        {file.cards.length} cards
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      onClick={() => onTogglePin(file.id)}
                      title={file.pinned ? "Unpin" : "Pin"}
                      style={{
                        padding: 8,
                        color: file.pinned
                          ? "var(--fn-primary, var(--accent))"
                          : "var(--fn-secondary, var(--secondary))",
                        transition: "color 0.15s ease",
                      }}
                    >
                      {file.pinned ? (
                        <StarIconSolid style={{ width: 20, height: 20 }} />
                      ) : (
                        <StarIcon style={{ width: 20, height: 20 }} />
                      )}
                    </button>
                    <button
                      onClick={() => onEditFile(file.id)}
                      title="Edit"
                      style={{
                        padding: 8,
                        color: "var(--fn-secondary, var(--secondary))",
                        transition: "color 0.15s ease",
                      }}
                    >
                      <PencilIcon style={{ width: 20, height: 20 }} />
                    </button>
                    <button
                      onClick={() => onExportFile(file.id)}
                      title="Export"
                      style={{
                        padding: 8,
                        color: "var(--fn-secondary, var(--secondary))",
                        transition: "color 0.15s ease",
                      }}
                    >
                      <ArrowDownTrayIcon style={{ width: 20, height: 20 }} />
                    </button>
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      title="Delete"
                      style={{
                        padding: 8,
                        color: "var(--fn-secondary, var(--secondary))",
                        transition: "color 0.15s ease",
                      }}
                    >
                      <TrashIcon style={{ width: 20, height: 20 }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
