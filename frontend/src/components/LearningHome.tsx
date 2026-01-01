"use client";

/**
 * Learning Home Page - Google-Doubao Style.
 *
 * A modern, clean homepage combining Google's color palette with
 * Doubao's centered layout pattern.
 *
 * Features:
 * - Google-style blue primary color
 * - Centered hero with greeting
 * - Pill-shaped topic suggestion chips
 * - Tool cards with hover effects
 * - Bottom-fixed chat-style input area
 */

import { useState } from "react";
import Link from "next/link";
import type { TopicRecord } from "@/hooks/useLearningProgress";
import {
  colors,
  shadows,
  radius,
  typography,
  animationKeyframes,
  getToolGradient,
} from "@/styles/design-system";

interface LearningHomeProps {
  isConnected: boolean;
  recentTopics: TopicRecord[];
  onStartLearning: (topic: string) => void;
}

/** Featured learning topics with icons */
const FEATURED_TOPICS = [
  { icon: "📐", title: "傅里叶变换" },
  { icon: "🚀", title: "牛顿运动定律" },
  { icon: "🧬", title: "DNA 复制过程" },
  { icon: "💻", title: "排序算法比较" },
  { icon: "🌱", title: "光合作用原理" },
  { icon: "📊", title: "向量的几何意义" },
];

/** Learning tools configuration */
const LEARNING_TOOLS = [
  {
    id: "video-to-pdf",
    icon: "🎬",
    title: "视频转PDF笔记",
    desc: "上传教学视频，AI自动提取关键帧和语音",
    href: "/video-to-pdf",
    color: colors.videoPdf,
  },
  {
    id: "doc-to-ppt",
    icon: "📊",
    title: "AI PPT生成器",
    desc: "描述你想要的PPT，AI自动生成，支持参考材料",
    href: "/doc-to-ppt",
    color: "#FF6B35",
  },
  {
    id: "flashnote",
    icon: "📝",
    title: "FlashNote 闪卡笔记",
    desc: "Markdown笔记转闪卡，支持公式和云同步",
    href: "/flashnote",
    color: colors.flashNote,
  },
  {
    id: "manim",
    icon: "🎥",
    title: "数学动画生成器",
    desc: "用自然语言生成3Blue1Brown风格数学视频",
    href: "/manim",
    color: colors.manim,
  },
];

/**
 * Main Learning Home component with Google-Doubao style UI.
 *
 * @param isConnected - WebSocket connection status
 * @param recentTopics - User's recent learning topics
 * @param onStartLearning - Callback when user starts learning a topic
 */
export function LearningHome({
  isConnected,
  recentTopics,
  onStartLearning,
}: LearningHomeProps) {
  const [input, setInput] = useState("");

  /**
   * Handle form submission to start learning.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    onStartLearning(input.trim());
  };

  /**
   * Handle topic chip click.
   */
  const handleTopicClick = (topic: string) => {
    if (!isConnected) return;
    onStartLearning(topic);
  };

  /**
   * Handle Enter key press in input.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && isConnected) {
        onStartLearning(input.trim());
      }
    }
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 18,
            }}
          >
            📚
          </div>
          <span
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.textPrimary,
            }}
          >
            探索学习
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            backgroundColor: isConnected
              ? colors.successLight
              : colors.warningLight,
            borderRadius: radius.full,
            fontSize: typography.fontSize.sm,
            color: isConnected ? colors.success : colors.warning,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: isConnected ? colors.success : colors.warning,
              animation: isConnected ? "none" : "pulse 1.5s infinite",
            }}
          />
          {isConnected ? "已连接" : "连接中..."}
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 24px 180px",
          overflowY: "auto",
        }}
      >
        {/* Hero Section */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 36,
            animation: "fadeIn 0.4s ease",
          }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: typography.fontWeight.semibold,
              color: colors.textPrimary,
              marginBottom: 10,
              lineHeight: typography.lineHeight.tight,
            }}
          >
            今天想探索什么？
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.lg,
              color: colors.textSecondary,
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            输入任何知识点，我会用可视化的方式帮你理解
          </p>
        </div>

        {/* Recent Topics */}
        {recentTopics.length > 0 && (
          <div
            style={{
              marginBottom: 28,
              animation: "fadeIn 0.4s ease 0.1s both",
            }}
          >
            <div
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textTertiary,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              继续学习
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                maxWidth: 600,
              }}
            >
              {recentTopics.slice(0, 5).map((record) => (
                <button
                  key={record.id}
                  onClick={() => handleTopicClick(record.topic)}
                  disabled={!isConnected}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.chip,
                    color: colors.textPrimary,
                    fontSize: typography.fontSize.md,
                    cursor: isConnected ? "pointer" : "not-allowed",
                    opacity: isConnected ? 1 : 0.5,
                    transition: "all 0.15s",
                    boxShadow: shadows.sm,
                  }}
                  onMouseEnter={(e) => {
                    if (isConnected) {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.backgroundColor =
                        colors.primaryLighter;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.backgroundColor = colors.surface;
                  }}
                >
                  🕐 {record.topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured Topics Chips */}
        <div
          style={{
            marginBottom: 48,
            animation: "fadeIn 0.4s ease 0.15s both",
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textTertiary,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            推荐探索
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              maxWidth: 680,
            }}
          >
            {FEATURED_TOPICS.map((topic, idx) => (
              <button
                key={idx}
                onClick={() => handleTopicClick(topic.title)}
                disabled={!isConnected}
                style={{
                  padding: "10px 18px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.chip,
                  color: colors.textPrimary,
                  fontSize: typography.fontSize.md,
                  cursor: isConnected ? "pointer" : "not-allowed",
                  opacity: isConnected ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s",
                  boxShadow: shadows.sm,
                }}
                onMouseEnter={(e) => {
                  if (isConnected) {
                    e.currentTarget.style.borderColor = colors.primary;
                    e.currentTarget.style.backgroundColor =
                      colors.primaryLighter;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = shadows.md;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.backgroundColor = colors.surface;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = shadows.sm;
                }}
              >
                <span>{topic.icon}</span>
                {topic.title}
              </button>
            ))}
          </div>
        </div>

        {/* Learning Tools */}
        <div
          style={{
            width: "100%",
            maxWidth: 800,
            animation: "fadeIn 0.4s ease 0.2s both",
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textTertiary,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            学习工具
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}
          >
            {LEARNING_TOOLS.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                style={{
                  padding: 20,
                  backgroundColor: colors.surface,
                  borderRadius: radius.card,
                  textDecoration: "none",
                  border: `1px solid ${colors.border}`,
                  transition: "all 0.2s",
                  boxShadow: shadows.card,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = shadows.cardHover;
                  e.currentTarget.style.borderColor = tool.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = shadows.card;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.lg,
                    background:
                      tool.id === "doc-to-ppt"
                        ? "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)"
                        : getToolGradient(
                            tool.id as "video-pdf" | "flashnote" | "manim"
                          ),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 14,
                  }}
                >
                  {tool.icon}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {tool.title}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.textSecondary,
                    lineHeight: typography.lineHeight.relaxed,
                  }}
                >
                  {tool.desc}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tips Card */}
        <div
          style={{
            width: "100%",
            maxWidth: 800,
            marginTop: 32,
            padding: 20,
            backgroundColor: colors.primaryLighter,
            borderRadius: radius.card,
            border: `1px solid ${colors.primaryLight}`,
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            animation: "fadeIn 0.4s ease 0.25s both",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            💡
          </div>
          <div>
            <div
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.medium,
                color: colors.textPrimary,
                marginBottom: 4,
              }}
            >
              学习小贴士
            </div>
            <p
              style={{
                fontSize: typography.fontSize.md,
                color: colors.textSecondary,
                lineHeight: typography.lineHeight.relaxed,
                margin: 0,
              }}
            >
              尝试用问题的形式描述你想学的内容，比如「为什么天空是蓝色的？」
              或「如何理解相对论？」我会根据你的问题设计最合适的可视化方式。
            </p>
          </div>
        </div>
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
        <form
          onSubmit={handleSubmit}
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
              alignItems: "center",
              padding: "14px 18px",
              gap: 12,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：什么是傅里叶变换？"
              disabled={!isConnected}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: typography.fontSize.lg,
                color: colors.textPrimary,
                backgroundColor: "transparent",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || !isConnected}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                backgroundColor:
                  input.trim() && isConnected
                    ? colors.primary
                    : colors.border,
                color: "white",
                cursor:
                  input.trim() && isConnected ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
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
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
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
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 15 }}>✨</span>
              AI 可视化学习
            </span>
            <span style={{ color: colors.borderLight }}>|</span>
            <span>支持数学、物理、生物等学科</span>
          </div>
        </form>
      </div>

      {/* Global Styles */}
      <style jsx global>{animationKeyframes}</style>
    </div>
  );
}
