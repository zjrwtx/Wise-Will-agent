"use client";

/**
 * Video to PDF Page - Google-Doubao Style.
 *
 * A modern page for converting educational videos to PDF notes
 * with unified design system.
 *
 * Features:
 * - Centered hero layout with drag-drop upload
 * - Progress stages with icons
 * - Bottom action area
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
  getToolGradient,
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
  download_url?: string;
  task_id?: string;
}

interface ProcessingStage {
  key: string;
  label: string;
  icon: string;
}

const STAGES: ProcessingStage[] = [
  { key: "audio_extract", label: "提取音频", icon: "🎵" },
  { key: "whisper_transcribe", label: "语音识别", icon: "🎤" },
  { key: "keyframe_extract", label: "提取关键帧", icon: "🖼️" },
  { key: "vision_analyze", label: "分析画面", icon: "👁️" },
  { key: "content_merge", label: "整合内容", icon: "🔗" },
  { key: "pdf_generate", label: "生成PDF", icon: "📄" },
];

/** Example video formats */
const SUPPORTED_FORMATS = ["MP4", "WebM", "MOV", "AVI", "MKV"];

/**
 * Video to PDF page component.
 */
export default function VideoToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("zh");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && isVideoFile(droppedFile)) {
        setFile(droppedFile);
        setError(null);
        if (!title) {
          const name = droppedFile.name.replace(/\.[^/.]+$/, "");
          setTitle(name);
        }
      } else {
        setError("请上传视频文件 (mp4, webm, mov, avi, mkv)");
      }
    },
    [title]
  );

  /**
   * Check if file is a valid video.
   */
  const isVideoFile = (file: File): boolean => {
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
    ];
    const validExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
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
    if (selectedFile && isVideoFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
      if (!title) {
        const name = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(name);
      }
    } else if (selectedFile) {
      setError("请上传视频文件 (mp4, webm, mov, avi, mkv)");
    }
  };

  /**
   * Upload file and start processing.
   */
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    formData.append("language", language);

    try {
      const response = await fetch(`${API_BASE}/api/video/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "上传失败");
      }

      const data = await response.json();
      setTaskId(data.task_id);
      setStatusMessage("上传成功，开始处理...");
      startProcessing(data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
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

    const ws = new WebSocket(`${WS_BASE}/ws/video-to-pdf/${id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data: ProgressEvent = JSON.parse(event.data);

      if (data.event === "progress") {
        setCurrentStage(data.stage || null);
        setProgress(data.progress || 0);
        setStatusMessage(data.message || "");
      } else if (data.event === "done") {
        setIsProcessing(false);
        setCurrentStage("completed");
        setProgress(100);
        setStatusMessage("处理完成！");
        if (data.download_url) {
          setDownloadUrl(`${API_BASE}${data.download_url}`);
        }
        ws.close();
      } else if (data.event === "error") {
        setIsProcessing(false);
        setError(data.message || "处理失败");
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
    setFile(null);
    setTitle("");
    setTaskId(null);
    setIsProcessing(false);
    setCurrentStage(null);
    setProgress(0);
    setStatusMessage("");
    setDownloadUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
              background: getToolGradient("video-pdf"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🎬
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
          paddingBottom: hasStarted ? 32 : 160,
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
              视频转PDF笔记
            </h1>
            <p
              style={{
                fontSize: typography.fontSize.lg,
                color: colors.textSecondary,
                maxWidth: 400,
              }}
            >
              上传教学视频，AI自动提取关键帧、识别语音，生成结构化PDF笔记
            </p>
          </div>
        )}

        {/* Format Chips - Only show when not started */}
        {!hasStarted && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 32,
              animation: "fadeIn 0.4s ease 0.1s both",
            }}
          >
            {SUPPORTED_FORMATS.map((format) => (
              <span
                key={format}
                style={{
                  padding: "6px 14px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.chip,
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                }}
              >
                {format}
              </span>
            ))}
          </div>
        )}

        {/* Upload Area - Only show when not started */}
        {!hasStarted && (
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              animation: "fadeIn 0.4s ease 0.15s both",
            }}
          >
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: colors.surface,
                border: `2px dashed ${
                  dragActive ? colors.primary : colors.border
                }`,
                borderRadius: radius.xl,
                padding: 48,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: dragActive ? shadows.md : shadows.sm,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {file ? (
                <div>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      margin: "0 auto 16px",
                      borderRadius: radius.lg,
                      background: getToolGradient("video-pdf"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    🎬
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                      marginBottom: 4,
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
              ) : (
                <div>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      margin: "0 auto 16px",
                      borderRadius: radius.lg,
                      backgroundColor: colors.primaryLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    📹
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                      marginBottom: 4,
                    }}
                  >
                    拖拽视频文件到这里
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    或点击选择文件
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
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
                  文档标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入PDF标题（可选）"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: typography.fontSize.md,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = colors.primary)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = colors.border)
                  }
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
                  语音语言
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  marginTop: 16,
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

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "14px 24px",
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.medium,
                backgroundColor:
                  file && !isUploading ? colors.videoPdf : colors.border,
                color: file && !isUploading ? "white" : colors.textDisabled,
                border: "none",
                borderRadius: radius.md,
                cursor: file && !isUploading ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              {isUploading ? "上传中..." : "开始转换"}
            </button>
          </div>
        )}

        {/* Processing Section */}
        {hasStarted && (
          <div
            style={{
              width: "100%",
              maxWidth: 560,
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
                    处理完成
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
                    正在处理...
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
                      width: `${
                        ((getStageIndex(currentStage) + 1) / STAGES.length) *
                        100
                      }%`,
                      backgroundColor: colors.videoPdf,
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
                  📥 下载PDF笔记
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
                转换新视频
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Info - Only show when not started */}
      {!hasStarted && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 24px 28px",
            background: "linear-gradient(180deg, transparent 0%, white 30%)",
          }}
        >
          <div
            style={{
              maxWidth: 560,
              margin: "0 auto",
              padding: "14px 20px",
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.md,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              fontSize: typography.fontSize.sm,
              color: colors.textTertiary,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15 }}>🎬</span>
              视频转PDF
            </span>
            <span style={{ color: colors.borderLight }}>|</span>
            <span>AI 自动提取关键帧和语音</span>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style jsx global>{animationKeyframes}</style>
    </div>
  );
}
