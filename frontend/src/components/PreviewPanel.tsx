"use client";

import type { ExecutionStage } from "@/hooks/useWebSocket";

interface PreviewPanelProps {
  url: string | null;
  htmlContent?: string | null;
  isLoading?: boolean;
  executionStage?: ExecutionStage;
}

export function PreviewPanel({ url, htmlContent, isLoading, executionStage }: PreviewPanelProps) {
  // 优先使用 htmlContent（即时预览），其次使用 url
  const hasContent = htmlContent || url;
  const showPlaceholder = !hasContent;
  const isPreparingContent = isLoading && (executionStage === "writing" || executionStage === "tool_calling" || executionStage === "deploying");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--background)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--foreground)" }}>
            可视化
          </span>
          {htmlContent && !url && (
            <span style={{ 
              fontSize: 11, 
              color: "var(--accent)", 
              backgroundColor: "rgba(0, 113, 227, 0.1)",
              padding: "2px 8px",
              borderRadius: 4,
            }}>
              即时预览
            </span>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: "var(--accent)" }}
          >
            新窗口打开
          </a>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: "relative" }}>
        {showPlaceholder ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isPreparingContent ? (
              <PreparingContent stage={executionStage} />
            ) : (
              <EmptyState />
            )}
          </div>
        ) : htmlContent ? (
          // 使用 srcdoc 即时预览 HTML 内容
          <iframe
            srcDoc={htmlContent}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Visualization Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          // 使用 URL 加载
          <iframe
            src={url!}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Visualization Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 400 }}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 24px",
          borderRadius: 16,
          backgroundColor: "var(--tertiary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg style={{ width: 32, height: 32, color: "var(--secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 500, color: "var(--foreground)", marginBottom: 8 }}>
        交互式学习区
      </h3>
      <p style={{ fontSize: 15, color: "var(--secondary)", lineHeight: 1.5 }}>
        在左侧输入你想学习的内容，可视化内容将在这里展示
      </p>
    </div>
  );
}

function PreparingContent({ stage }: { stage?: ExecutionStage }) {
  const messages: Record<string, { title: string; subtitle: string }> = {
    writing: {
      title: "正在构建可视化",
      subtitle: "设计交互元素，让概念更直观",
    },
    tool_calling: {
      title: "正在准备内容",
      subtitle: "整理教学材料",
    },
    deploying: {
      title: "即将呈现",
      subtitle: "最后的准备工作",
    },
  };

  const info = messages[stage || "writing"] || messages.writing;

  return (
    <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 400 }}>
      {/* 动画图标 */}
      <div
        style={{
          width: 80,
          height: 80,
          margin: "0 auto 24px",
          position: "relative",
        }}
      >
        {/* 外圈 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid var(--border)",
          }}
        />
        {/* 中心图标 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "rgba(0, 113, 227, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg style={{ width: 20, height: 20, color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
      
      <h3 style={{ fontSize: 17, fontWeight: 500, color: "var(--foreground)", marginBottom: 8 }}>
        {info.title}
      </h3>
      <p style={{ fontSize: 15, color: "var(--secondary)" }}>
        {info.subtitle}
      </p>
    </div>
  );
}
