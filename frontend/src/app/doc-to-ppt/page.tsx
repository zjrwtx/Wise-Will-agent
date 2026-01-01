"use client";

/**
 * PPT Generation Page - Google-Doubao Style.
 *
 * A modern page for generating PowerPoint presentations using AI.
 * Users describe what PPT they want, optionally upload reference materials.
 *
 * Features:
 * - User prompt input for PPT requirements
 * - Optional reference document upload (Word, PDF, text)
 * - Real-time outline preview
 * - Progress stages with icons
 * - Consistent Google-style colors
 */

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  colors,
  shadows,
  radius,
  typography,
  animationKeyframes,
} from "@/styles/design-system";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL?.replace("/ws/chat", "") ||
  "ws://localhost:8000";

interface ProgressEvent {
  event: string;
  stage?: string;
  progress?: number;
  message?: string;
  data?: {
    outline?: SlideOutline[];
    slide?: { index: number; title: string; layout: string };
    ppt_path?: string;
    download_url?: string;
    task_id?: string;
    title?: string;
    slides_count?: number;
  };
}

interface SlideOutline {
  index: number;
  title: string;
  layout: string;
  key_points: string[];
}

interface ProcessingStage {
  key: string;
  label: string;
  icon: string;
}

const STAGES: ProcessingStage[] = [
  { key: "parse_document", label: "解析参考材料", icon: "📄" },
  { key: "generate_outline", label: "生成大纲", icon: "📝" },
  { key: "fill_slides", label: "填充内容", icon: "✍️" },
  { key: "build_ppt", label: "生成PPT", icon: "📊" },
];

/** Supported document formats for reference */
const SUPPORTED_FORMATS = ["DOCX", "PDF", "TXT", "MD"];

/** Presentation styles */
const STYLES = [
  { value: "professional", label: "商务专业", icon: "💼" },
  { value: "academic", label: "学术风格", icon: "🎓" },
  { value: "creative", label: "创意设计", icon: "🎨" },
];

/** Example prompts for users */
const EXAMPLE_PROMPTS = [
  "制作一个Python入门培训PPT，10页左右，简洁专业风格",
  "做一个关于人工智能发展历程的演示文稿，要有时间线",
  "帮我做一个项目汇报PPT，包含背景、进展、成果和下一步计划",
  "制作一个产品介绍PPT，突出核心功能和优势",
];

/**
 * PPT Generation page component.
 */
export default function DocToPptPage() {
  // User input states
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("professional");

  // Task states
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [outline, setOutline] = useState<SlideOutline[]>([]);
  const [currentSlide, setCurrentSlide] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  /**
   * Handle drag events.
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle file drop.
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isDocumentFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("请上传文档文件 (docx, pdf, txt, md)");
    }
  }, []);

  /**
   * Check if file is a valid document.
   */
  const isDocumentFile = (file: File): boolean => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];
    const validExtensions = [".docx", ".pdf", ".txt", ".md"];
    return (
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  };

  /**
   * Handle file selection from input.
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isDocumentFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError("请上传文档文件 (docx, pdf, txt, md)");
    }
  };

  /**
   * Remove selected file.
   */
  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Submit and start processing.
   */
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError("请输入PPT需求描述");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let responseTaskId: string;

      if (file) {
        // Upload with reference document
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prompt", prompt);
        formData.append("title", title);
        formData.append("style", style);

        const response = await fetch(`${API_BASE}/api/doc-to-ppt/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || "上传失败");
        }

        const data = await response.json();
        responseTaskId = data.task_id;
      } else {
        // Create task without reference document
        const response = await fetch(`${API_BASE}/api/doc-to-ppt/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, title, style }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || "创建失败");
        }

        const data = await response.json();
        responseTaskId = data.task_id;
      }

      setTaskId(responseTaskId);
      setStatusMessage("任务创建成功，开始生成...");
      startProcessing(responseTaskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Start WebSocket processing.
   */
  const startProcessing = (id: string) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStage(null);
    setDownloadUrl(null);
    setOutline([]);
    setCurrentSlide(-1);

    const ws = new WebSocket(`${WS_BASE}/ws/doc-to-ppt/${id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data: ProgressEvent = JSON.parse(event.data);

      if (data.event === "progress") {
        setCurrentStage(data.stage || null);
        setProgress(data.progress || 0);
        setStatusMessage(data.message || "");
      } else if (data.event === "parsed") {
        setStatusMessage(data.message || "参考材料解析完成");
      } else if (data.event === "outline") {
        if (data.data?.outline) {
          setOutline(data.data.outline);
        }
        setStatusMessage(data.message || "大纲生成完成");
      } else if (data.event === "slide") {
        if (data.data?.slide) {
          setCurrentSlide(data.data.slide.index);
        }
      } else if (data.event === "done") {
        setIsProcessing(false);
        setCurrentStage("completed");
        setProgress(100);
        setStatusMessage("PPT生成完成！");
        if (data.data?.task_id) {
          setDownloadUrl(
            `${API_BASE}/api/doc-to-ppt/download/${data.data.task_id}`
          );
        }
        ws.close();
      } else if (data.event === "error") {
        setIsProcessing(false);
        setError(data.message || "生成失败");
        ws.close();
      }
    };

    ws.onerror = () => {
      setError("连接错误，请重试");
      setIsProcessing(false);
    };
  };

  /**
   * Reset all state.
   */
  const handleReset = () => {
    setPrompt("");
    setFile(null);
    setTitle("");
    setTaskId(null);
    setIsProcessing(false);
    setCurrentStage(null);
    setProgress(0);
    setStatusMessage("");
    setDownloadUrl(null);
    setError(null);
    setOutline([]);
    setCurrentSlide(-1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Use example prompt.
   */
  const handleExampleClick = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  /**
   * Format file size for display.
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  /**
   * Get current stage index.
   */
  const getStageIndex = (stage: string | null): number => {
    if (!stage) return -1;
    return STAGES.findIndex((s) => s.key === stage);
  };

  /**
   * Get file icon based on extension.
   */
  const getFileIcon = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "📕";
      case "docx":
        return "📘";
      case "txt":
        return "📝";
      case "md":
        return "📋";
      default:
        return "📄";
    }
  };

  const hasStarted = taskId !== null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.backgroundGradient,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colors.borderLight}`,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: colors.textSecondary,
            textDecoration: "none",
            fontSize: typography.fontSize.md,
            padding: "6px 10px",
            borderRadius: radius.md,
            transition: "all 0.15s",
          }}
        >
          <svg
            width="20"
            height="20"
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
          返回
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            📊
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: hasStarted ? "flex-start" : "center",
          padding: hasStarted ? "32px 24px" : "0 24px",
          paddingBottom: hasStarted ? 32 : 100,
          transition: "all 0.3s ease",
        }}
      >
        {/* Hero Section - Only show when not started */}
        {!hasStarted && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
              animation: "fadeIn 0.4s ease",
            }}
          >
            <h1
              style={{
                fontSize: 28,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textPrimary,
                marginBottom: 10,
              }}
            >
              AI PPT 生成器
            </h1>
            <p
              style={{
                fontSize: typography.fontSize.lg,
                color: colors.textSecondary,
                maxWidth: 480,
              }}
            >
              描述你想要的PPT，AI帮你自动生成。可上传参考材料辅助生成。
            </p>
          </div>
        )}

        {/* Input Area - Only show when not started */}
        {!hasStarted && (
          <div
            style={{
              width: "100%",
              maxWidth: 640,
              animation: "fadeIn 0.4s ease 0.1s both",
            }}
          >
            {/* Main Input Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.xl,
                padding: 24,
                boxShadow: shadows.card,
                border: `1px solid ${colors.border}`,
                marginBottom: 20,
              }}
            >
              {/* Prompt Input */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  描述你想要的PPT *
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：制作一个Python入门培训PPT，10页左右，简洁专业风格"
                  style={{
                    width: "100%",
                    minHeight: 100,
                    padding: "12px 16px",
                    fontSize: typography.fontSize.md,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.lg,
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    outline: "none",
                    resize: "none",
                    transition: "border-color 0.15s",
                    lineHeight: typography.lineHeight.relaxed,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = colors.primary)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = colors.border)
                  }
                />
              </div>

              {/* Example Prompts */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.textTertiary,
                    marginBottom: 8,
                  }}
                >
                  示例提示：
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {EXAMPLE_PROMPTS.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(example)}
                      style={{
                        padding: "6px 12px",
                        fontSize: typography.fontSize.sm,
                        backgroundColor: colors.borderLight,
                        border: "none",
                        borderRadius: radius.chip,
                        color: colors.textSecondary,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          colors.primaryLight;
                        e.currentTarget.style.color = colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          colors.borderLight;
                        e.currentTarget.style.color = colors.textSecondary;
                      }}
                    >
                      {example.length > 30
                        ? example.substring(0, 30) + "..."
                        : example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Document Upload */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  参考材料（可选）
                </label>

                {file ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      backgroundColor: colors.borderLight,
                      borderRadius: radius.md,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>
                      {getFileIcon(file.name)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.md,
                          color: colors.textPrimary,
                        }}
                      >
                        {file.name}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textSecondary,
                        }}
                      >
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      style={{
                        padding: "6px 12px",
                        fontSize: typography.fontSize.sm,
                        backgroundColor: "transparent",
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.md,
                        color: colors.textSecondary,
                        cursor: "pointer",
                      }}
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "20px",
                      border: `2px dashed ${
                        dragActive ? colors.primary : colors.border
                      }`,
                      borderRadius: radius.md,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor: dragActive
                        ? colors.primaryLighter
                        : "transparent",
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.pdf,.txt,.md"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                    <div
                      style={{
                        fontSize: typography.fontSize.md,
                        color: colors.textSecondary,
                      }}
                    >
                      拖拽或点击上传参考文档
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.textTertiary,
                        marginTop: 4,
                      }}
                    >
                      支持 {SUPPORTED_FORMATS.join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Options Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    PPT标题（可选）
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="自动生成"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: typography.fontSize.md,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    演示风格
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: typography.fontSize.md,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: "12px 16px",
                    backgroundColor: colors.errorLight,
                    borderRadius: radius.md,
                    color: colors.error,
                    fontSize: typography.fontSize.md,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isSubmitting}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.medium,
                  backgroundColor:
                    prompt.trim() && !isSubmitting ? "#FF6B35" : colors.border,
                  color:
                    prompt.trim() && !isSubmitting
                      ? "white"
                      : colors.textDisabled,
                  border: "none",
                  borderRadius: radius.md,
                  cursor:
                    prompt.trim() && !isSubmitting ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                {isSubmitting ? "创建中..." : "🚀 开始生成PPT"}
              </button>
            </div>
          </div>
        )}

        {/* Processing Section */}
        {hasStarted && (
          <div
            style={{
              width: "100%",
              maxWidth: 700,
              animation: "slideUp 0.3s ease",
            }}
          >
            {/* Status Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.xl,
                padding: 24,
                boxShadow: shadows.card,
                border: `1px solid ${colors.border}`,
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.textPrimary,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {downloadUrl ? (
                  <>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        backgroundColor: colors.successLight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                      }}
                    >
                      ✓
                    </span>
                    PPT生成完成
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        backgroundColor: colors.primaryLight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        animation: "pulse 1.5s infinite",
                      }}
                    >
                      ⏳
                    </span>
                    正在生成...
                  </>
                )}
              </h3>

              {/* Progress Stages */}
              <div style={{ marginBottom: 24 }}>
                {STAGES.map((stage, index) => {
                  const currentIndex = getStageIndex(currentStage);
                  const isCompleted =
                    currentIndex > index || currentStage === "completed";
                  const isCurrent = currentIndex === index;

                  // Skip parse_document stage if no file was uploaded
                  if (stage.key === "parse_document" && !file) {
                    return null;
                  }

                  return (
                    <div
                      key={stage.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "10px 0",
                        opacity: isCompleted || isCurrent ? 1 : 0.4,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isCompleted
                            ? colors.successLight
                            : isCurrent
                            ? colors.primaryLight
                            : colors.borderLight,
                          fontSize: 16,
                          transition: "all 0.2s",
                        }}
                      >
                        {isCompleted ? "✓" : stage.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.medium,
                            color: colors.textPrimary,
                          }}
                        >
                          {stage.label}
                        </div>
                        {isCurrent && statusMessage && (
                          <div
                            style={{
                              fontSize: typography.fontSize.sm,
                              color: colors.textSecondary,
                              marginTop: 2,
                            }}
                          >
                            {statusMessage}
                          </div>
                        )}
                      </div>
                      {isCurrent && (
                        <div
                          style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.primary,
                            fontWeight: typography.fontWeight.medium,
                          }}
                        >
                          {progress}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Overall Progress Bar */}
              {isProcessing && (
                <div
                  style={{
                    height: 4,
                    backgroundColor: colors.borderLight,
                    borderRadius: 2,
                    overflow: "hidden",
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      backgroundColor: "#FF6B35",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              )}

              {/* Error Display */}
              {error && !isProcessing && !downloadUrl && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: colors.errorLight,
                    borderRadius: radius.md,
                    color: colors.error,
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Download Button */}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "14px 24px",
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.medium,
                    backgroundColor: colors.success,
                    color: "white",
                    border: "none",
                    borderRadius: radius.md,
                    textAlign: "center",
                    textDecoration: "none",
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  📥 下载PPT文件
                </a>
              )}

              {/* Reset Button */}
              <button
                onClick={handleReset}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  fontSize: typography.fontSize.md,
                  backgroundColor: "transparent",
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                生成新的PPT
              </button>
            </div>

            {/* Outline Preview */}
            {outline.length > 0 && (
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.xl,
                  padding: 24,
                  boxShadow: shadows.card,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <h4
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.textPrimary,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  📋 PPT大纲预览
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textSecondary,
                      fontWeight: typography.fontWeight.normal,
                    }}
                  >
                    ({outline.length} 张幻灯片)
                  </span>
                </h4>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {outline.map((slide, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        backgroundColor:
                          currentSlide === idx
                            ? colors.primaryLight
                            : colors.borderLight,
                        borderRadius: radius.md,
                        transition: "all 0.2s",
                        border:
                          currentSlide === idx
                            ? `1px solid ${colors.primary}`
                            : "1px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor:
                            currentSlide > idx
                              ? colors.success
                              : currentSlide === idx
                              ? colors.primary
                              : colors.border,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: typography.fontWeight.medium,
                          flexShrink: 0,
                        }}
                      >
                        {currentSlide > idx ? "✓" : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: typography.fontSize.md,
                            fontWeight: typography.fontWeight.medium,
                            color: colors.textPrimary,
                            marginBottom: 4,
                          }}
                        >
                          {slide.title}
                        </div>
                        {slide.key_points.length > 0 && (
                          <div
                            style={{
                              fontSize: typography.fontSize.sm,
                              color: colors.textSecondary,
                            }}
                          >
                            {slide.key_points.slice(0, 2).join(" · ")}
                            {slide.key_points.length > 2 && " ..."}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textTertiary,
                          backgroundColor: colors.surface,
                          padding: "2px 8px",
                          borderRadius: radius.sm,
                        }}
                      >
                        {slide.layout}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Styles */}
      <style jsx global>{animationKeyframes}</style>
    </div>
  );
}
