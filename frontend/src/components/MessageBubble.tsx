"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, ToolCallInfo } from "@/hooks/useWebSocket";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "90%", width: isUser ? "auto" : "100%" }}>
        {isUser ? (
          <UserMessage content={message.content} />
        ) : (
          <AssistantMessage message={message} />
        )}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "var(--accent)",
        color: "white",
        borderRadius: "16px 16px 4px 16px",
      }}
    >
      <p style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{content}</p>
    </div>
  );
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const hasThinking = message.thinking && message.thinking.length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasContent = message.content && message.content.length > 0;
  const hasUrls = message.urls && message.urls.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {hasThinking && <ThinkingSection thinking={message.thinking!} />}
      {hasToolCalls && <ToolCallsSection toolCalls={message.toolCalls!} isStreaming={message.isStreaming} />}
      {hasContent && <ContentSection content={message.content} isStreaming={message.isStreaming} />}
      {hasUrls && <VisualizationReady urls={message.urls!} />}
    </div>
  );
}

function ContentSection({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: "var(--tertiary)",
        borderRadius: "16px 16px 16px 4px",
        padding: 16,
      }}
    >
      <div 
        className="markdown-content"
        style={{ fontSize: 15, lineHeight: 1.6, color: "var(--foreground)" }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ marginBottom: 12 }}>{children}</p>,
            h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, marginTop: 16 }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10, marginTop: 14 }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>{children}</h3>,
            ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
            code: ({ className, children }) => {
              const isInline = !className;
              return isInline ? (
                <code style={{ 
                  backgroundColor: "var(--border)", 
                  padding: "2px 6px", 
                  borderRadius: 4, 
                  fontSize: 14,
                  fontFamily: "monospace"
                }}>{children}</code>
              ) : (
                <code style={{ 
                  display: "block",
                  backgroundColor: "var(--background)", 
                  padding: 12, 
                  borderRadius: 8, 
                  fontSize: 14,
                  fontFamily: "monospace",
                  overflowX: "auto",
                  marginBottom: 12
                }}>{children}</code>
              );
            },
            pre: ({ children }) => <pre style={{ marginBottom: 12 }}>{children}</pre>,
            blockquote: ({ children }) => (
              <blockquote style={{ 
                borderLeft: "3px solid var(--accent)", 
                paddingLeft: 12, 
                marginLeft: 0,
                marginBottom: 12,
                color: "var(--secondary)"
              }}>{children}</blockquote>
            ),
            strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 16,
              marginLeft: 2,
              backgroundColor: "var(--accent)",
              verticalAlign: "middle",
              animation: "pulse 1s infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

function ThinkingSection({ thinking }: { thinking: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = thinking.length > 0 ? thinking[0].slice(0, 60) + (thinking[0].length > 60 ? "..." : "") : "";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "var(--background)",
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: "rgba(168, 85, 247, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg style={{ width: 14, height: 14, color: "#a855f7" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>分析思路</div>
          {!isExpanded && summary && (
            <div style={{ fontSize: 12, color: "var(--secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {summary}
            </div>
          )}
        </div>
        <svg
          style={{
            width: 16,
            height: 16,
            color: "var(--secondary)",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid var(--border)" }}>
          {thinking.map((thought, index) => (
            <p
              key={index}
              style={{
                fontSize: 13,
                color: "var(--secondary)",
                lineHeight: 1.5,
                padding: "8px 0",
                borderBottom: index < thinking.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {thought}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCallsSection({ toolCalls, isStreaming }: { toolCalls: ToolCallInfo[]; isStreaming?: boolean }) {
  const completedCount = toolCalls.filter(tc => tc.result).length;
  const isComplete = completedCount === toolCalls.length && !isStreaming;
  const currentTool = toolCalls.find(tc => !tc.result);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        backgroundColor: "var(--tertiary)",
        borderRadius: 12,
      }}
    >
      {!isComplete ? (
        <>
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid var(--accent)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: 14, color: "var(--foreground)" }}>
            {currentTool ? getToolDisplayName(currentTool.name) : "处理中..."}
          </span>
          {currentTool?.startTime && <ElapsedTime startTime={currentTool.startTime} />}
        </>
      ) : (
        <>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg style={{ width: 12, height: 12, color: "white" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span style={{ fontSize: 14, color: "var(--foreground)" }}>准备工作已完成</span>
        </>
      )}
    </div>
  );
}

function ElapsedTime({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (elapsed < 2) return null;

  const formatTime = (s: number) => {
    if (s < 60) return `${s}秒`;
    return `${Math.floor(s / 60)}分${s % 60}秒`;
  };

  return (
    <span style={{ fontSize: 12, color: "var(--secondary)", marginLeft: "auto" }}>
      {formatTime(elapsed)}
    </span>
  );
}

function VisualizationReady({ urls }: { urls: string[] }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))",
        border: "1px solid rgba(34, 197, 94, 0.2)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg style={{ width: 20, height: 20, color: "white" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--foreground)" }}>
            可视化已准备好
          </div>
          <div style={{ fontSize: 13, color: "var(--secondary)" }}>
            在右侧面板中探索和互动
          </div>
        </div>
      </div>
      
      {urls.map((url, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              fontSize: 13,
              color: "#16a34a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </a>
          <CopyButton url={url} />
        </div>
      ))}
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        color: "var(--secondary)",
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {copied ? "已复制" : "复制链接"}
    </button>
  );
}

function getToolDisplayName(toolName: string): string {
  if (toolName.toLowerCase().includes("deploy")) return "正在部署可视化...";
  if (toolName.toLowerCase().includes("write")) return "正在生成内容...";
  if (toolName.toLowerCase().includes("read")) return "正在读取资料...";
  return "正在处理...";
}
