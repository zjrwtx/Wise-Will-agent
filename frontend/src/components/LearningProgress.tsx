"use client";

import { useState, useEffect, useRef } from "react";
import type { ExecutionStage } from "@/hooks/useWebSocket";

interface LearningProgressProps {
  stage: ExecutionStage;
  toolName: string | null;
}

interface ToolActivity {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  timestamp: number;
  status: "running" | "done";
}

// 学习过程中的知识小贴士
const LEARNING_TIPS = [
  "可视化学习能帮助大脑建立更强的记忆连接",
  "尝试用自己的话复述刚学到的概念",
  "把新知识和已知的内容联系起来",
  "学习时保持好奇心，多问「为什么」",
  "数学的美在于它的简洁和普适性",
  "很多数学概念都有几何直观解释",
  "理解公式背后的含义比记忆更重要",
];

function getRandomTip(): string {
  return LEARNING_TIPS[Math.floor(Math.random() * LEARNING_TIPS.length)];
}

// 工具图标和显示名称
function getToolInfo(toolName: string): { icon: string; displayName: string } {
  const toolMap: Record<string, { icon: string; displayName: string }> = {
    "写入文件": { icon: "✏️", displayName: "写入文件" },
    "读取文件": { icon: "📖", displayName: "读取文件" },
    "执行命令": { icon: "⚡", displayName: "执行命令" },
    "部署到云端": { icon: "🚀", displayName: "部署中" },
    "部署到 EdgeOne": { icon: "🚀", displayName: "部署到 EdgeOne" },
  };
  
  // 检查是否包含关键词
  if (toolName.includes("写入") || toolName.toLowerCase().includes("write")) {
    return { icon: "✏️", displayName: "写入文件" };
  }
  if (toolName.includes("读取") || toolName.toLowerCase().includes("read")) {
    return { icon: "📖", displayName: "读取文件" };
  }
  if (toolName.includes("命令") || toolName.toLowerCase().includes("shell") || toolName.toLowerCase().includes("command")) {
    return { icon: "⚡", displayName: "执行命令" };
  }
  if (toolName.includes("部署") || toolName.toLowerCase().includes("deploy")) {
    return { icon: "🚀", displayName: "部署中" };
  }
  if (toolName.includes("搜索") || toolName.toLowerCase().includes("search")) {
    return { icon: "🔍", displayName: "搜索资料" };
  }
  if (toolName.includes("fetch") || toolName.includes("url")) {
    return { icon: "🌐", displayName: "获取网页" };
  }
  
  return toolMap[toolName] || { icon: "🔧", displayName: toolName };
}

// 阶段描述
const STAGE_INFO: Record<ExecutionStage, { title: string; description: string }> = {
  idle: { title: "", description: "" },
  thinking: { 
    title: "正在理解你的问题", 
    description: "分析知识点，设计最佳的可视化方案" 
  },
  writing: { 
    title: "正在构建可视化", 
    description: "创建交互式内容，让概念更容易理解" 
  },
  tool_calling: { 
    title: "正在准备教学材料", 
    description: "整理资源，确保内容准确完整" 
  },
  deploying: { 
    title: "即将呈现", 
    description: "最后的准备工作，马上就好" 
  },
  done: { 
    title: "准备就绪", 
    description: "可以开始探索了" 
  },
};

export function LearningProgress({ stage, toolName }: LearningProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tip, setTip] = useState("");
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);
  const prevToolNameRef = useRef<string | null>(null);

  // 客户端初始化 tip
  useEffect(() => {
    setTip(getRandomTip());
  }, []);

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 每 8 秒换一个 tip
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTip(getRandomTip());
    }, 8000);
    return () => clearInterval(tipTimer);
  }, []);

  // 重置计时器和工具活动
  useEffect(() => {
    if (stage === "idle") {
      setElapsedTime(0);
      setToolActivities([]);
    }
  }, [stage]);

  // 追踪工具调用
  useEffect(() => {
    console.log("[LearningProgress] toolName changed:", toolName, "prev:", prevToolNameRef.current);
    if (toolName && toolName !== prevToolNameRef.current) {
      // 将之前的工具标记为完成
      setToolActivities(prev => 
        prev.map(t => t.status === "running" ? { ...t, status: "done" as const } : t)
      );
      
      // 添加新工具
      const info = getToolInfo(toolName);
      console.log("[LearningProgress] adding tool activity:", info);
      const newActivity: ToolActivity = {
        id: `${Date.now()}-${Math.random()}`,
        name: toolName,
        displayName: info.displayName,
        icon: info.icon,
        timestamp: Date.now(),
        status: "running",
      };
      setToolActivities(prev => [...prev.slice(-4), newActivity]); // 只保留最近 5 个
    } else if (!toolName && prevToolNameRef.current) {
      // 工具完成
      setToolActivities(prev => 
        prev.map(t => t.status === "running" ? { ...t, status: "done" as const } : t)
      );
    }
    prevToolNameRef.current = toolName;
  }, [toolName]);

  const stageInfo = STAGE_INFO[stage] || STAGE_INFO.thinking;
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  // 进度百分比估算
  const getProgress = () => {
    switch (stage) {
      case "thinking": return 15;
      case "writing": return 45;
      case "tool_calling": return 70;
      case "deploying": return 90;
      case "done": return 100;
      default: return 0;
    }
  };

  if (stage === "idle" || stage === "done") return null;

  return (
    <div
      style={{
        backgroundColor: "var(--tertiary)",
        borderRadius: 16,
        padding: 20,
        border: "1px solid var(--border)",
      }}
    >
      {/* 主状态 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            position: "relative",
            width: 40,
            height: 40,
          }}
        >
          {/* 进度环 */}
          <svg style={{ width: 40, height: 40, transform: "rotate(-90deg)" }} viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeDasharray={`${getProgress()}, 100`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.5s" }}
            />
          </svg>
          {/* 中心点 */}
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
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "var(--accent)",
                animation: "pulse 1.5s infinite",
              }}
            />
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--foreground)" }}>
            {stageInfo.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--secondary)" }}>
            {stageInfo.description}
          </div>
        </div>
        
        <div style={{ fontSize: 13, color: "var(--secondary)", fontVariantNumeric: "tabular-nums" }}>
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* 进度条 */}
      <div
        style={{
          height: 4,
          backgroundColor: "var(--border)",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: toolActivities.length > 0 ? 12 : 16,
        }}
      >
        <div 
          style={{
            height: "100%",
            backgroundColor: "var(--accent)",
            borderRadius: 2,
            transition: "width 0.5s",
            width: `${getProgress()}%`,
          }}
        />
      </div>

      {/* 工具调用活动 */}
      {toolActivities.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 12,
            padding: "10px 12px",
            backgroundColor: "var(--background)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {toolActivities.map((activity) => (
            <div
              key={activity.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: activity.status === "running" ? "var(--foreground)" : "var(--secondary)",
                opacity: activity.status === "running" ? 1 : 0.7,
              }}
            >
              <span style={{ fontSize: 14 }}>{activity.icon}</span>
              <span style={{ flex: 1 }}>{activity.displayName}</span>
              {activity.status === "running" ? (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    animation: "pulse 1s infinite",
                  }}
                />
              ) : (
                <svg
                  style={{ width: 14, height: 14, color: "#22c55e" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 学习小贴士 */}
      {tip && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          <svg
            style={{ width: 16, height: 16, color: "var(--secondary)", marginTop: 2, flexShrink: 0 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p style={{ fontSize: 13, color: "var(--secondary)", lineHeight: 1.5 }}>
            {tip}
          </p>
        </div>
      )}
    </div>
  );
}
