"use client";

/**
 * Manim Math Video Generator Page - Google-Doubao Style.
 *
 * A modern, clean UI for generating mathematical animation videos
 * from natural language descriptions using Manim.
 *
 * Features:
 * - Unified Google-style color palette
 * - Centered hero layout with greeting
 * - Pill-shaped suggestion chips
 * - Bottom-fixed input area
 * - Real-time progress and video preview
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  colors,
  shadows,
  radius,
  typography,
  animationKeyframes,
  getToolGradient,
} from "@/styles/design-system";

/** Task status enum matching backend */
type TaskStatus =
  | "pending"
  | "generating_code"
  | "rendering"
  | "completed"
  | "failed";

/** WebSocket event from backend */
interface ManimEvent {
  event: string;
  message: string;
  stage?: string;
  progress?: number;
  code?: string;
  chunk?: string;
  video_url?: string;
  task_id?: string;
  download_url?: string;
}

/** Example prompts for users */
const EXAMPLE_PROMPTS = [
  { icon: "📐", text: "解释勾股定理 a² + b² = c²" },
  { icon: "📈", text: "画正弦函数 y = sin(x) 的图像" },
  { icon: "➡️", text: "演示向量加法的平行四边形法则" },
  { icon: "📊", text: "展示二次函数 y = x² 的图像" },
  { icon: "📉", text: "解释导数的几何意义" },
  { icon: "⭕", text: "演示圆的面积公式 πr²" },
];

/**
 * Main Manim page component with Google-Doubao style UI.
 */
export default function ManimPage() {
  const [prompt, setPrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [progress, setProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCode, setShowCode] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  /**
   * Auto-resize textarea.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  /**
   * Create task and start WebSocket processing.
   */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isProcessing) return;

    // Reset state
    setError(null);
    setGeneratedCode("");
    setVideoUrl(null);
    setProgress(0);
    setLogs([]);
    setIsProcessing(true);
    setStatus("pending");
    setShowCode(false);

    try {
      // Create task
      const response = await fetch(
        "http://localhost:8000/api/manim/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const data = await response.json();
      setTaskId(data.task_id);

      // Connect WebSocket
      const ws = new WebSocket(
        `ws://localhost:8000/ws/manim/${data.task_id}`
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg: ManimEvent = JSON.parse(event.data);

        switch (msg.event) {
          case "progress":
            setProgress(msg.progress || 0);
            setStatus((msg.stage as TaskStatus) || "rendering");
            setLogs((prev) => [...prev, msg.message]);
            break;

          case "code_chunk":
            setStatus("generating_code");
            setGeneratedCode((prev) => prev + (msg.chunk || msg.message));
            break;

          case "code_complete":
            setGeneratedCode(msg.code || "");
            setProgress(msg.progress || 30);
            setLogs((prev) => [...prev, "✅ 代码生成完成"]);
            break;

          case "output":
            setLogs((prev) => [...prev, msg.message]);
            break;

          case "done":
            setStatus("completed");
            setProgress(100);
            setVideoUrl(
              `http://localhost:8000${msg.video_url || msg.download_url}`
            );
            setIsProcessing(false);
            setLogs((prev) => [...prev, "🎉 视频生成完成！"]);
            break;

          case "error":
            setStatus("failed");
            setError(msg.message);
            setIsProcessing(false);
            setLogs((prev) => [...prev, `❌ ${msg.message}`]);
            break;

          default:
            setLogs((prev) => [...prev, msg.message]);
        }
      };

      ws.onerror = () => {
        setError("连接错误，请重试");
        setIsProcessing(false);
      };

      ws.onclose = () => {
        if (isProcessing && status !== "completed") {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsProcessing(false);
    }
  }, [prompt, isProcessing, status]);

  /**
   * Handle Enter key.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  /**
   * Get status display info.
   */
  const getStatusInfo = () => {
    switch (status) {
      case "generating_code":
        return { text: "正在生成代码...", color: colors.warning };
      case "rendering":
        return { text: "正在渲染视频...", color: colors.manim };
      case "completed":
        return { text: "完成", color: colors.success };
      case "failed":
        return { text: "失败", color: colors.error };
      default:
        return { text: "准备中", color: colors.textTertiary };
    }
  };

  const statusInfo = getStatusInfo();
  const hasStarted = isProcessing || videoUrl || error;

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
            color: colors.textSecondary,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: typography.fontSize.md,
            transition: "color 0.15s",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: getToolGradient("manim"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
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
          padding: "0 24px",
          paddingBottom: 160,
          transition: "all 0.3s ease",
        }}
      >
        {/* Hero Section - Only show when not started */}
        {!hasStarted && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 36,
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
              想要什么数学动画？
            </h1>
            <p
              style={{
                fontSize: typography.fontSize.lg,
                color: colors.textSecondary,
              }}
            >
              用自然语言描述，AI 帮你生成 3Blue1Brown 风格的数学视频
            </p>
          </div>
        )}

        {/* Suggestion Chips - Only show when not started */}
        {!hasStarted && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              maxWidth: 680,
              animation: "fadeIn 0.4s ease 0.1s both",
            }}
          >
            {EXAMPLE_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(item.text)}
                style={{
                  padding: "10px 18px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.chip,
                  color: colors.textPrimary,
                  fontSize: typography.fontSize.md,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                  boxShadow: shadows.sm,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.manim;
                  e.currentTarget.style.backgroundColor = "rgba(147,52,233,0.05)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = shadows.md;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.backgroundColor = colors.surface;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
              >
                <span>{item.icon}</span>
                {item.text}
              </button>
            ))}
          </div>
        )}

        {/* Processing/Result Section */}
        {hasStarted && (
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              marginTop: 24,
              animation: "slideUp 0.3s ease",
            }}
          >
            {/* Current Prompt Display */}
            <div
              style={{
                padding: "16px 20px",
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                marginBottom: 16,
                boxShadow: shadows.card,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.textTertiary,
                  marginBottom: 4,
                }}
              >
                你的请求
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.lg,
                  color: colors.textPrimary,
                }}
              >
                {prompt}
              </div>
            </div>

            {/* Progress Card */}
            {isProcessing && (
              <div
                style={{
                  padding: 20,
                  backgroundColor: colors.surface,
                  borderRadius: radius.card,
                  marginBottom: 16,
                  boxShadow: shadows.card,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: statusInfo.color,
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: typography.fontSize.md,
                        color: colors.textPrimary,
                      }}
                    >
                      {statusInfo.text}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textTertiary,
                    }}
                  >
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    backgroundColor: colors.borderLight,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: getToolGradient("manim"),
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Logs */}
                {logs.length > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      maxHeight: 150,
                      overflowY: "auto",
                      fontSize: typography.fontSize.sm,
                      fontFamily: typography.fontMono,
                      color: colors.textSecondary,
                      backgroundColor: colors.surfaceHover,
                      padding: 12,
                      borderRadius: radius.md,
                    }}
                  >
                    {logs.slice(-8).map((log, idx) => (
                      <div key={idx} style={{ marginBottom: 4 }}>
                        {log}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                style={{
                  padding: "16px 20px",
                  backgroundColor: colors.errorLight,
                  border: `1px solid ${colors.error}`,
                  borderRadius: radius.card,
                  marginBottom: 16,
                  color: colors.error,
                  fontSize: typography.fontSize.md,
                }}
              >
                <strong>出错了：</strong> {error}
              </div>
            )}

            {/* Video Result */}
            {videoUrl && (
              <div
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.card,
                  overflow: "hidden",
                  boxShadow: shadows.lg,
                  border: `1px solid ${colors.border}`,
                  marginBottom: 16,
                }}
              >
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  style={{
                    width: "100%",
                    display: "block",
                    backgroundColor: "#000",
                  }}
                />
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.success,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: colors.success,
                      }}
                    />
                    视频已生成
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setShowCode(!showCode)}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: colors.surfaceHover,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.md,
                        fontSize: typography.fontSize.sm,
                        color: colors.textPrimary,
                        cursor: "pointer",
                      }}
                    >
                      {showCode ? "隐藏代码" : "查看代码"}
                    </button>
                    <a
                      href={videoUrl}
                      download={`math_animation_${taskId}.mp4`}
                      style={{
                        padding: "8px 14px",
                        background: getToolGradient("manim"),
                        border: "none",
                        borderRadius: radius.md,
                        fontSize: typography.fontSize.sm,
                        color: "white",
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                    >
                      下载视频
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Code Preview */}
            {showCode && generatedCode && (
              <div
                style={{
                  backgroundColor: "#1e1e1e",
                  borderRadius: radius.card,
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#2d2d2d",
                    fontSize: typography.fontSize.sm,
                    color: colors.textTertiary,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: colors.success }}>●</span>
                  scene.py
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 16,
                    fontSize: typography.fontSize.sm,
                    fontFamily: typography.fontMono,
                    color: "#d4d4d4",
                    overflowX: "auto",
                    maxHeight: 300,
                  }}
                >
                  {generatedCode}
                </pre>
              </div>
            )}

            {/* New Generation Button */}
            {(videoUrl || error) && !isProcessing && (
              <button
                onClick={() => {
                  setPrompt("");
                  setVideoUrl(null);
                  setError(null);
                  setGeneratedCode("");
                  setLogs([]);
                  setStatus("pending");
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: typography.fontSize.md,
                  color: colors.textPrimary,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                生成新的动画
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Input Area */}
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
            maxWidth: 680,
            margin: "0 auto",
            backgroundColor: colors.surface,
            borderRadius: radius.xxl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.lg,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              padding: "14px 18px",
              gap: 12,
            }}
          >
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的数学动画..."
              disabled={isProcessing}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: typography.fontSize.lg,
                color: colors.textPrimary,
                backgroundColor: "transparent",
                lineHeight: 1.5,
                maxHeight: 120,
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isProcessing}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                background:
                  prompt.trim() && !isProcessing
                    ? getToolGradient("manim")
                    : colors.border,
                color: "white",
                cursor:
                  prompt.trim() && !isProcessing ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              {isProcessing ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid white",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
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
                    d="M5 12h14M12 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Bottom toolbar */}
          <div
            style={{
              padding: "10px 18px",
              borderTop: `1px solid ${colors.borderLight}`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: typography.fontSize.sm,
              color: colors.textTertiary,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15 }}>🎬</span>
              数学动画
            </span>
            <span style={{ color: colors.borderLight }}>|</span>
            <span>Powered by Manim</span>
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{animationKeyframes}</style>
    </div>
  );
}
