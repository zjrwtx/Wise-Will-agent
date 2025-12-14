"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { LearningHome } from "@/components/LearningHome";
import { ConceptMap } from "@/components/ConceptMap";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLearningProgress } from "@/hooks/useLearningProgress";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat";

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  
  const {
    messages,
    isConnected,
    isLoading,
    currentUrl,
    htmlContent,
    executionStage,
    currentToolName,
    conceptMap,
    sendMessage,
    exploreNode,
    clearMessages,
  } = useWebSocket({
    url: WS_URL,
    onError: (e) => console.error("WebSocket error:", e),
  });

  const { progress, addTopic, getRecentTopics } = useLearningProgress();

  const handleStartLearning = (topic: string) => {
    setHasStarted(true);
    addTopic(topic);
    sendMessage(topic);
  };

  const handleSendMessage = (message: string) => {
    sendMessage(message);
  };

  const handleNewSession = () => {
    clearMessages();
    setHasStarted(false);
  };

  // 如果还没开始学习，显示学习首页
  if (!hasStarted && messages.length === 0) {
    return (
      <LearningHome
        isConnected={isConnected}
        recentTopics={getRecentTopics()}
        onStartLearning={handleStartLearning}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "var(--background)",
      }}
    >
      {/* Header */}
      <header
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
        <button
          onClick={handleNewSession}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--secondary)",
            cursor: "pointer",
          }}
        >
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500 }}>返回</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--secondary)" }}>
            已学习 {progress.topicsLearned} 个知识点
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: isConnected ? "#22c55e" : "#ef4444",
            }}
          />
        </div>
      </header>

      {/* Main Content - 概念地图 + 对话 + 预览 */}
      <main
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Concept Map Panel - 左侧 */}
        <div
          style={{
            width: 280,
            borderRight: "1px solid var(--border)",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <ConceptMap
            data={conceptMap}
            onNodeClick={exploreNode}
            isLoading={isLoading}
          />
        </div>

        {/* Chat Panel - 中间 */}
        <div
          style={{
            flex: 1,
            borderRight: "1px solid var(--border)",
            height: "100%",
            minWidth: 0,
          }}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            isConnected={isConnected}
            executionStage={executionStage}
            currentToolName={currentToolName}
            onSendMessage={handleSendMessage}
            onClear={clearMessages}
          />
        </div>

        {/* Preview Panel - 右侧 */}
        <div
          style={{
            width: "40%",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <PreviewPanel 
            url={currentUrl}
            htmlContent={htmlContent}
            isLoading={isLoading}
            executionStage={executionStage}
          />
        </div>
      </main>
    </div>
  );
}
