"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, ExecutionStage } from "@/hooks/useWebSocket";
import { MessageBubble } from "./MessageBubble";
import { LearningProgress } from "./LearningProgress";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean;
  executionStage: ExecutionStage;
  currentToolName: string | null;
  onSendMessage: (message: string) => void;
  onClear: () => void;
}

// 根据上下文生成的后续问题
function generateFollowUpQuestions(messages: ChatMessage[]): string[] {
  if (messages.length === 0) return [];
  
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
  if (!lastUserMessage) return [];
  
  const topic = lastUserMessage.content;
  
  const followUps: Record<string, string[]> = {
    "傅里叶": ["傅里叶变换有什么实际应用？", "如何理解频域和时域？"],
    "排序": ["哪种排序算法最快？", "什么是稳定排序？"],
    "DNA": ["DNA 和 RNA 有什么区别？", "基因突变是如何发生的？"],
    "牛顿": ["牛顿三大定律之间有什么联系？", "牛顿定律在太空中还适用吗？"],
    "函数": ["什么是反函数？", "如何判断函数的奇偶性？"],
    "细胞": ["细胞是如何获取能量的？", "干细胞有什么特别之处？"],
  };
  
  for (const [keyword, questions] of Object.entries(followUps)) {
    if (topic.includes(keyword)) {
      return questions;
    }
  }
  
  return ["能再详细解释一下吗？", "有什么相关的知识点？"];
}

export function ChatPanel({
  messages,
  isLoading,
  isConnected,
  executionStage,
  currentToolName,
  onSendMessage,
  onClear,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, executionStage]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isConnected) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const followUpQuestions = !isLoading ? generateFollowUpQuestions(messages) : [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--background)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 48,
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--foreground)" }}>对话</span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            style={{ fontSize: 13, color: "var(--secondary)", cursor: "pointer" }}
          >
            新话题
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {/* 学习进度指示器 */}
          {isLoading && (
            <LearningProgress 
              stage={executionStage} 
              toolName={currentToolName}
            />
          )}
          
          {/* 后续问题建议 */}
          {!isLoading && messages.length > 0 && followUpQuestions.length > 0 && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: "var(--secondary)", marginBottom: 8 }}>继续探索</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {followUpQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => onSendMessage(question)}
                    disabled={!isConnected}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 14,
                      color: "var(--foreground)",
                      backgroundColor: "var(--tertiary)",
                      borderRadius: 12,
                      cursor: isConnected ? "pointer" : "not-allowed",
                      opacity: isConnected ? 1 : 0.5,
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: 16,
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "继续提问..." : "连接中..."}
            disabled={!isConnected || isLoading}
            rows={1}
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: 15,
              backgroundColor: "var(--tertiary)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              resize: "none",
              outline: "none",
              color: "var(--foreground)",
              opacity: !isConnected || isLoading ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isConnected}
            style={{
              padding: "12px 20px",
              fontSize: 15,
              fontWeight: 500,
              color: "white",
              backgroundColor: "var(--accent)",
              borderRadius: 12,
              cursor: !input.trim() || isLoading || !isConnected ? "not-allowed" : "pointer",
              opacity: !input.trim() || isLoading || !isConnected ? 0.4 : 1,
            }}
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
}
