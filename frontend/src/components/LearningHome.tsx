"use client";

import { useState } from "react";
import Link from "next/link";
import type { TopicRecord } from "@/hooks/useLearningProgress";

interface LearningHomeProps {
  isConnected: boolean;
  recentTopics: TopicRecord[];
  onStartLearning: (topic: string) => void;
}

// 推荐的学习主题
const FEATURED_TOPICS = [
  { id: 1, title: "傅里叶变换", subtitle: "理解信号分解的奥秘", category: "数学" },
  { id: 2, title: "牛顿运动定律", subtitle: "探索力与运动的关系", category: "物理" },
  { id: 3, title: "DNA 复制过程", subtitle: "生命遗传的核心机制", category: "生物" },
  { id: 4, title: "排序算法比较", subtitle: "可视化算法效率差异", category: "计算机" },
  { id: 5, title: "光合作用原理", subtitle: "植物如何获取能量", category: "生物" },
  { id: 6, title: "向量的几何意义", subtitle: "从图形理解向量运算", category: "数学" },
];

export function LearningHome({
  isConnected,
  recentTopics,
  onStartLearning,
}: LearningHomeProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    onStartLearning(input.trim());
  };

  const handleTopicClick = (topic: string) => {
    if (!isConnected) return;
    onStartLearning(topic);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--background)",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 56,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg style={{ width: 16, height: 16, color: "white" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>
            探索学习
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--secondary)" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isConnected ? "#22c55e" : "#f97316",
            }}
          />
          {isConnected ? "已连接" : "连接中..."}
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "48px 24px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Hero Section */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "var(--foreground)",
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              今天想探索什么？
            </h1>
            <p style={{ fontSize: 18, color: "var(--secondary)", marginBottom: 32 }}>
              输入任何知识点，我会用可视化的方式帮你理解
            </p>

            {/* Search Input */}
            <form onSubmit={handleSubmit} style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：什么是傅里叶变换？"
                disabled={!isConnected}
                style={{
                  width: "100%",
                  height: 56,
                  paddingLeft: 20,
                  paddingRight: 56,
                  fontSize: 16,
                  backgroundColor: "var(--tertiary)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  outline: "none",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || !isConnected}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: "var(--accent)",
                  color: "white",
                  opacity: !input.trim() || !isConnected ? 0.4 : 1,
                  cursor: !input.trim() || !isConnected ? "not-allowed" : "pointer",
                }}
              >
                <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>

          {/* Recent Topics */}
          {recentTopics.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--secondary)", marginBottom: 16 }}>
                继续学习
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recentTopics.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => handleTopicClick(record.topic)}
                    disabled={!isConnected}
                    style={{
                      padding: "8px 16px",
                      fontSize: 14,
                      color: "var(--foreground)",
                      backgroundColor: "var(--tertiary)",
                      borderRadius: 20,
                      cursor: isConnected ? "pointer" : "not-allowed",
                      opacity: isConnected ? 1 : 0.5,
                    }}
                  >
                    {record.topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Topics */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--secondary)", marginBottom: 16 }}>
              推荐探索
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {FEATURED_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic.title)}
                  disabled={!isConnected}
                  style={{
                    padding: 20,
                    textAlign: "left",
                    backgroundColor: "var(--tertiary)",
                    borderRadius: 16,
                    cursor: isConnected ? "pointer" : "not-allowed",
                    opacity: isConnected ? 1 : 0.5,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, marginBottom: 8 }}>
                    {topic.category}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>
                    {topic.title}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--secondary)" }}>
                    {topic.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div
            style={{
              padding: 24,
              backgroundColor: "var(--tertiary)",
              borderRadius: 16,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              marginBottom: 24,
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
                flexShrink: 0,
              }}
            >
              <svg style={{ width: 20, height: 20, color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>
                学习小贴士
              </div>
              <p style={{ fontSize: 14, color: "var(--secondary)", lineHeight: 1.6 }}>
                尝试用问题的形式描述你想学的内容，比如「为什么天空是蓝色的？」或「如何理解相对论？」我会根据你的问题设计最合适的可视化方式。
              </p>
            </div>
          </div>

          {/* Tools Section */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--secondary)", marginBottom: 16 }}>
              学习工具
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
              }}
            >
              {/* Video to PDF Tool */}
              <Link
                href="/video-to-pdf"
                style={{
                  display: "flex",
                  padding: 24,
                  backgroundColor: "var(--tertiary)",
                  borderRadius: 16,
                  gap: 16,
                  alignItems: "center",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 24,
                  }}
                >
                  🎬
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>
                    视频转PDF笔记
                  </div>
                  <p style={{ fontSize: 14, color: "var(--secondary)" }}>
                    上传教学视频，AI自动提取关键帧和语音
                  </p>
                </div>
                <svg style={{ width: 20, height: 20, color: "var(--secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* FlashNote Tool */}
              <Link
                href="/flashnote"
                style={{
                  display: "flex",
                  padding: 24,
                  backgroundColor: "var(--tertiary)",
                  borderRadius: 16,
                  gap: 16,
                  alignItems: "center",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 24,
                  }}
                >
                  📝
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>
                    FlashNote 闪卡笔记
                  </div>
                  <p style={{ fontSize: 14, color: "var(--secondary)" }}>
                    Markdown笔记转闪卡，支持公式和云同步
                  </p>
                </div>
                <svg style={{ width: 20, height: 20, color: "var(--secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
