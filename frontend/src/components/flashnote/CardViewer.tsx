"use client";

/**
 * CardViewer Component for FlashNote.
 *
 * Displays flashcards with navigation, table of contents,
 * and Markdown rendering including math formulas.
 *
 * Example:
 *     <CardViewer
 *         file={currentFile}
 *         onBack={() => setActiveTab("home")}
 *         onUpdateIndex={(index) => updateIndex(file.id, index)}
 *     />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { FileData } from "@/types/flashnote";

interface CardViewerProps {
  file: FileData;
  onBack: () => void;
  onUpdateIndex: (index: number) => void;
}

/**
 * Flashcard viewer with navigation and TOC.
 *
 * Args:
 *     file: FileData object containing cards to display.
 *     onBack: Callback when back button is clicked.
 *     onUpdateIndex: Callback to update current card index.
 */
export function CardViewer({ file, onBack, onUpdateIndex }: CardViewerProps) {
  const [showToc, setShowToc] = useState(false);

  const currentCard = file.cards[file.currentIndex];

  /**
   * Navigate to next card.
   */
  const nextCard = () => {
    if (file.currentIndex < file.cards.length - 1) {
      onUpdateIndex(file.currentIndex + 1);
    }
  };

  /**
   * Navigate to previous card.
   */
  const prevCard = () => {
    if (file.currentIndex > 0) {
      onUpdateIndex(file.currentIndex - 1);
    }
  };

  /**
   * Jump to specific card by index.
   */
  const jumpToCard = (index: number) => {
    onUpdateIndex(index);
    setShowToc(false);
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
          onClick={() => setShowToc((prev) => !prev)}
          style={{
            padding: 8,
            marginLeft: -8,
            color: "var(--fn-secondary, var(--secondary))",
            transition: "color 0.15s ease",
          }}
          aria-label={showToc ? "Close TOC" : "Open TOC"}
        >
          {showToc ? (
            <XMarkIcon style={{ width: 24, height: 24 }} />
          ) : (
            <Bars3Icon style={{ width: 24, height: 24 }} />
          )}
        </button>
        <h2
          style={{
            fontWeight: 500,
            flex: 1,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.name}
        </h2>
        <button
          onClick={onBack}
          style={{
            padding: "6px 12px",
            fontSize: 13,
            color: "var(--fn-primary, var(--accent))",
            borderRadius: 8,
          }}
        >
          Back
        </button>
      </div>

      <div style={{ position: "relative", height: "100%", display: "flex" }}>
        {/* Table of Contents Sidebar */}
        <AnimatePresence>
          {showToc && (
            <>
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 280,
                  height: "100%",
                  backgroundColor: "var(--fn-background, var(--background))",
                  borderRight: "1px solid var(--border)",
                  zIndex: 20,
                  overflowY: "auto",
                }}
              >
                <div style={{ padding: 16 }}>
                  <h3
                    style={{
                      fontWeight: 500,
                      color: "var(--fn-secondary, var(--secondary))",
                      marginBottom: 8,
                    }}
                  >
                    Table of Contents
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {file.cards.map((card, index) => (
                      <button
                        key={card.id}
                        onClick={() => jumpToCard(index)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 12px",
                          paddingLeft: `${(card.level - 1) * 16 + 12}px`,
                          borderRadius: 8,
                          fontSize: 14,
                          backgroundColor:
                            index === file.currentIndex
                              ? "var(--fn-primary, var(--accent))"
                              : "transparent",
                          color:
                            index === file.currentIndex
                              ? "var(--fn-primary-foreground, white)"
                              : "var(--fn-foreground, var(--foreground))",
                          opacity: index === file.currentIndex ? 1 : 0.8,
                          fontWeight: index === file.currentIndex ? 500 : 400,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {card.title}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowToc(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  backdropFilter: "blur(4px)",
                  zIndex: 10,
                }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div style={{ flex: 1, position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={file.currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{ height: "100%", overflowY: "auto" }}
            >
              <div
                style={{
                  padding: 16,
                  minHeight: "100%",
                  backgroundColor: "var(--fn-card-background, var(--tertiary))",
                  borderRadius: 12,
                  margin: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    marginBottom: 16,
                    color: "var(--fn-foreground, var(--foreground))",
                  }}
                >
                  {currentCard.title}
                </h2>
                <div
                  className="prose prose-sm max-w-none"
                  style={{
                    color: "var(--fn-foreground, var(--foreground))",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => (
                        <div style={{ marginBottom: 16 }}>{children}</div>
                      ),
                      h1: ({ children }) => (
                        <h1
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            marginTop: 32,
                            marginBottom: 16,
                          }}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            marginTop: 24,
                            marginBottom: 12,
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 500,
                            marginTop: 16,
                            marginBottom: 8,
                          }}
                        >
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            listStyleType: "disc",
                            paddingLeft: 24,
                            marginBottom: 16,
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol
                          style={{
                            listStyleType: "decimal",
                            paddingLeft: 24,
                            marginBottom: 16,
                          }}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: 4 }}>{children}</li>
                      ),
                      code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code
                            style={{
                              backgroundColor:
                                "var(--fn-secondary-background, var(--border))",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 13,
                              fontFamily: "monospace",
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code
                            style={{
                              display: "block",
                              backgroundColor:
                                "var(--fn-secondary-background, var(--border))",
                              padding: 16,
                              borderRadius: 8,
                              fontSize: 13,
                              fontFamily: "monospace",
                              overflowX: "auto",
                              marginBottom: 16,
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => (
                        <pre
                          style={{
                            backgroundColor:
                              "var(--fn-secondary-background, var(--border))",
                            padding: 16,
                            borderRadius: 8,
                            overflowX: "auto",
                            marginBottom: 16,
                          }}
                        >
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote
                          style={{
                            borderLeft: `4px solid var(--fn-primary, var(--accent))`,
                            paddingLeft: 16,
                            marginLeft: 0,
                            marginBottom: 16,
                            fontStyle: "italic",
                            color: "var(--fn-secondary, var(--secondary))",
                          }}
                        >
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div style={{ overflowX: "auto", marginBottom: 16 }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th
                          style={{
                            border: "1px solid var(--border)",
                            padding: 8,
                            backgroundColor:
                              "var(--fn-secondary-background, var(--border))",
                            fontWeight: 600,
                          }}
                        >
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td
                          style={{
                            border: "1px solid var(--border)",
                            padding: 8,
                          }}
                        >
                          {children}
                        </td>
                      ),
                      img: ({ src, alt }) => (
                        <div style={{ margin: "24px 0", textAlign: "center" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={alt || ""}
                            style={{
                              maxWidth: "100%",
                              height: "auto",
                              borderRadius: 8,
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                            }}
                          />
                          {alt && (
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: 13,
                                color: "var(--fn-secondary, var(--secondary))",
                              }}
                            >
                              {alt}
                            </div>
                          )}
                        </div>
                      ),
                    }}
                  >
                    {currentCard.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div
        style={{
          position: "fixed",
          bottom: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          padding: "0 16px",
        }}
      >
        <button
          onClick={prevCard}
          disabled={file.currentIndex === 0}
          style={{
            padding: 16,
            borderRadius: "50%",
            backgroundColor: "var(--fn-card-background, var(--tertiary))",
            border: "1px solid var(--border)",
            opacity: file.currentIndex === 0 ? 0.5 : 1,
            cursor: file.currentIndex === 0 ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
          aria-label="Previous card"
        >
          <ChevronUpIcon style={{ width: 24, height: 24 }} />
        </button>
        <button
          onClick={nextCard}
          disabled={file.currentIndex === file.cards.length - 1}
          style={{
            padding: 16,
            borderRadius: "50%",
            backgroundColor: "var(--fn-card-background, var(--tertiary))",
            border: "1px solid var(--border)",
            opacity: file.currentIndex === file.cards.length - 1 ? 0.5 : 1,
            cursor:
              file.currentIndex === file.cards.length - 1
                ? "not-allowed"
                : "pointer",
            transition: "all 0.15s ease",
          }}
          aria-label="Next card"
        >
          <ChevronDownIcon style={{ width: 24, height: 24 }} />
        </button>
      </div>

      {/* Progress Indicator */}
      <div
        style={{
          position: "fixed",
          bottom: 140,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--fn-secondary, var(--secondary))",
            backgroundColor: "var(--fn-card-background, var(--tertiary))",
            padding: "4px 12px",
            borderRadius: 16,
          }}
        >
          {file.currentIndex + 1} / {file.cards.length}
        </span>
      </div>
    </div>
  );
}
