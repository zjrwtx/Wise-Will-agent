"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// localStorage keys
const STORAGE_KEYS = {
  MESSAGES: "edu-ai-messages",
  PREVIEW_URL: "edu-ai-preview-url",
  SESSION_ID: "edu-ai-session-id",
};

export type MessageType =
  | "session"
  | "turn_begin"
  | "step_begin"
  | "step_interrupted"
  | "thinking"
  | "text"
  | "content"
  | "tool_call"
  | "tool_call_part"
  | "tool_result"
  | "html_content"
  | "url_extracted"
  | "map_update"
  | "status"
  | "compaction_begin"
  | "compaction_end"
  | "approval_request"
  | "approval_resolved"
  | "subagent"
  | "done"
  | "error"
  | "unknown";

export interface WireMessage {
  type: MessageType;
  data: Record<string, unknown>;
}

// 执行阶段
export type ExecutionStage = 
  | "idle"
  | "thinking"      // AI 正在思考
  | "writing"       // 正在生成代码/内容
  | "tool_calling"  // 正在调用工具
  | "deploying"     // 正在部署
  | "done";         // 完成

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string[];
  toolCalls?: ToolCallInfo[];
  urls?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments?: string;
  result?: string;
  isError?: boolean;
  startTime?: number;
}

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WireMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

// 概念地图类型
export interface ConceptNode {
  id: string;
  label: string;
  description?: string;
  status: "unexplored" | "explored" | "current";
}

export interface ConceptEdge {
  source: string;
  target: string;
  relation: string;
}

export interface ConceptMapData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  currentFocus?: string;
}

export interface UseWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  currentUrl: string | null;
  htmlContent: string | null;
  sessionId: string | null;
  executionStage: ExecutionStage;
  currentToolName: string | null;
  conceptMap: ConceptMapData;
  sendMessage: (message: string) => void;
  exploreNode: (nodeId: string) => void;
  clearMessages: () => void;
}

// 工具名称映射为用户友好的描述
function getToolDisplayName(toolName: string): string {
  if (!toolName) return "";
  
  const toolMap: Record<string, string> = {
    // kimi 工具名
    "WriteFile": "写入文件",
    "ReadFile": "读取文件",
    "Shell": "执行命令",
    "StrReplaceFile": "修改文件",
    "SearchWeb": "搜索资料",
    "FetchURL": "获取网页",
  };
  
  // 检查是否是部署相关的工具
  if (toolName.toLowerCase().includes("deploy")) {
    return "部署到云端";
  }
  
  return toolMap[toolName] || toolName;
}

// 判断是否是部署工具
function isDeployTool(toolName: string): boolean {
  return toolName.toLowerCase().includes("deploy");
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
  } = options;

  // 初始状态为空，通过 useEffect 在客户端加载
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [executionStage, setExecutionStage] = useState<ExecutionStage>("idle");
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [conceptMap, setConceptMap] = useState<ConceptMapData>({
    nodes: [],
    edges: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const currentAssistantMessageRef = useRef<ChatMessage | null>(null);
  const messageIdRef = useRef(0);

  // 客户端 hydration 后从 localStorage 加载数据
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          isStreaming: false,
        })));
      }
      
      const savedUrl = localStorage.getItem(STORAGE_KEYS.PREVIEW_URL);
      if (savedUrl) {
        setCurrentUrl(savedUrl);
      }
      
      const savedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      if (savedSessionId) {
        setSessionId(savedSessionId);
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
    setIsHydrated(true);
  }, []);

  // 保存消息到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const toSave = messages.filter(m => !m.isStreaming);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save messages to localStorage:", e);
    }
  }, [messages, isHydrated]);

  // 保存预览 URL 到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (currentUrl) {
        localStorage.setItem(STORAGE_KEYS.PREVIEW_URL, currentUrl);
      }
    } catch (e) {
      console.error("Failed to save preview URL to localStorage:", e);
    }
  }, [currentUrl, isHydrated]);

  // 保存 session ID 到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (sessionId) {
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
      }
    } catch (e) {
      console.error("Failed to save session ID to localStorage:", e);
    }
  }, [sessionId, isHydrated]);

  const generateId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg-${Date.now()}-${messageIdRef.current}`;
  }, []);

  const ensureAssistantMessage = useCallback(() => {
    if (!currentAssistantMessageRef.current) {
      currentAssistantMessageRef.current = {
        id: generateId(),
        role: "assistant",
        content: "",
        thinking: [],
        toolCalls: [],
        urls: [],
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, currentAssistantMessageRef.current!]);
    }
    return currentAssistantMessageRef.current;
  }, [generateId]);

  const updateCurrentMessage = useCallback(() => {
    if (currentAssistantMessageRef.current) {
      const currentMsg = currentAssistantMessageRef.current;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === currentMsg.id);
        if (idx >= 0) {
          const newMessages = [...prev];
          newMessages[idx] = { ...currentMsg };
          return newMessages;
        }
        return prev;
      });
    }
  }, []);

  const handleMessage = useCallback(
    (message: WireMessage) => {
      const { type, data } = message;

      switch (type) {
        case "session":
          setSessionId(data.session_id as string);
          break;

        case "turn_begin":
          currentAssistantMessageRef.current = {
            id: generateId(),
            role: "assistant",
            content: "",
            thinking: [],
            toolCalls: [],
            urls: [],
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages((prev) => [...prev, currentAssistantMessageRef.current!]);
          setExecutionStage("thinking");
          break;

        case "thinking": {
          const msg = ensureAssistantMessage();
          const thinking = data.thinking as string;
          if (thinking) {
            msg.thinking = [...(msg.thinking || []), thinking];
            updateCurrentMessage();
          }
          setExecutionStage("thinking");
          break;
        }

        case "text": {
          const msg = ensureAssistantMessage();
          const text = data.text as string;
          if (text) {
            msg.content += text;
            updateCurrentMessage();
          }
          setExecutionStage("writing");
          break;
        }

        case "content": {
          const msg = ensureAssistantMessage();
          const content = data.content as string;
          if (content) {
            msg.content += content;
            updateCurrentMessage();
          }
          setExecutionStage("writing");
          break;
        }

        case "tool_call": {
          const msg = ensureAssistantMessage();
          const toolName = data.name as string;
          console.log("[WebSocket] tool_call received:", toolName);
          const toolCall: ToolCallInfo = {
            id: (data.id as string) || generateId(),
            name: toolName,
            arguments: data.arguments
              ? JSON.stringify(data.arguments, null, 2)
              : undefined,
            startTime: Date.now(),
          };
          msg.toolCalls = [...(msg.toolCalls || []), toolCall];
          updateCurrentMessage();
          
          // 更新执行阶段
          const displayName = getToolDisplayName(toolName);
          console.log("[WebSocket] setting currentToolName:", displayName);
          setCurrentToolName(displayName);
          if (isDeployTool(toolName)) {
            setExecutionStage("deploying");
          } else {
            setExecutionStage("tool_calling");
          }
          break;
        }

        case "tool_call_part": {
          const msg = ensureAssistantMessage();
          const toolCalls = msg.toolCalls || [];
          const toolName = data.name as string;
          const existingCall = toolCalls.find((tc) => tc.id === data.id);
          if (existingCall) {
            existingCall.arguments =
              (existingCall.arguments || "") + (data.arguments_delta as string);
          } else {
            toolCalls.push({
              id: (data.id as string) || generateId(),
              name: toolName,
              arguments: data.arguments_delta as string,
              startTime: Date.now(),
            });
          }
          msg.toolCalls = toolCalls;
          updateCurrentMessage();
          
          if (toolName) {
            setCurrentToolName(getToolDisplayName(toolName));
            if (isDeployTool(toolName)) {
              setExecutionStage("deploying");
            } else {
              setExecutionStage("tool_calling");
            }
          }
          break;
        }

        case "tool_result": {
          const msg = ensureAssistantMessage();
          const toolCalls = msg.toolCalls || [];
          const existingCall = toolCalls.find(
            (tc) => tc.id === data.tool_call_id
          );
          if (existingCall) {
            existingCall.result = data.output as string;
            existingCall.isError = data.is_error as boolean;
          }
          msg.toolCalls = toolCalls;
          updateCurrentMessage();
          
          // 工具完成后回到思考状态（等待下一步）
          setCurrentToolName(null);
          setExecutionStage("thinking");
          break;
        }

        case "html_content": {
          // 收到 HTML 内容，立即显示预览
          // 只在有非空内容时才更新，保留上一个可视化
          const content = data.content as string;
          if (content && content.trim()) {
            setHtmlContent(content);
            console.log("[WebSocket] Received HTML content, size:", content.length);
          }
          break;
        }

        case "url_extracted": {
          const extractedUrl = data.url as string;
          if (extractedUrl) {
            setCurrentUrl(extractedUrl);
            const msg = ensureAssistantMessage();
            msg.urls = [...(msg.urls || []), extractedUrl];
            updateCurrentMessage();
          }
          break;
        }

        case "map_update": {
          // 更新概念地图
          const mapData = data as {
            nodes?: ConceptNode[];
            edges?: ConceptEdge[];
            currentFocus?: string;
          };
          
          setConceptMap((prev) => {
            const newNodes = [...prev.nodes];
            const newEdges = [...prev.edges];
            
            // 合并新节点
            if (mapData.nodes) {
              for (const node of mapData.nodes) {
                const existingIndex = newNodes.findIndex((n) => n.id === node.id);
                if (existingIndex >= 0) {
                  newNodes[existingIndex] = { ...newNodes[existingIndex], ...node };
                } else {
                  newNodes.push(node);
                }
              }
            }
            
            // 合并新边
            if (mapData.edges) {
              for (const edge of mapData.edges) {
                const exists = newEdges.some(
                  (e) => e.source === edge.source && e.target === edge.target
                );
                if (!exists) {
                  newEdges.push(edge);
                }
              }
            }
            
            // 更新当前焦点
            if (mapData.currentFocus) {
              newNodes.forEach((n) => {
                if (n.id === mapData.currentFocus) {
                  n.status = "current";
                } else if (n.status === "current") {
                  n.status = "explored";
                }
              });
            }
            
            return {
              nodes: newNodes,
              edges: newEdges,
              currentFocus: mapData.currentFocus || prev.currentFocus,
            };
          });
          
          console.log("[WebSocket] Map updated:", mapData);
          break;
        }

        case "done":
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.isStreaming = false;
            updateCurrentMessage();
          }
          setIsLoading(false);
          setExecutionStage("done");
          setCurrentToolName(null);
          currentAssistantMessageRef.current = null;
          
          // 短暂延迟后重置为 idle
          setTimeout(() => setExecutionStage("idle"), 1000);
          break;

        case "error":
          setIsLoading(false);
          setExecutionStage("idle");
          setCurrentToolName(null);
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.content +=
              `\n\n错误: ${data.message}`;
            currentAssistantMessageRef.current.isStreaming = false;
            updateCurrentMessage();
          } else {
            const errorMsg: ChatMessage = {
              id: generateId(),
              role: "assistant",
              content: `错误: ${data.message}`,
              timestamp: new Date(),
              isStreaming: false,
            };
            setMessages((prev) => [...prev, errorMsg]);
          }
          currentAssistantMessageRef.current = null;
          break;

        default:
          break;
      }
    },
    [generateId, ensureAssistantMessage, updateCurrentMessage]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectCountRef.current = 0;
      onOpen?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      onClose?.();

      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = (event) => {
      onError?.(event);
    };

    ws.onmessage = (event) => {
      try {
        const message: WireMessage = JSON.parse(event.data);
        // 详细日志
        console.log("[WS] Received:", message.type, message.data);
        if (message.type === "tool_call" || message.type === "tool_call_part") {
          console.log("[WS] Tool message details:", JSON.stringify(message.data));
        }
        handleMessage(message);
        onMessage?.(message);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    wsRef.current = ws;
  }, [
    url,
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts,
    reconnectInterval,
    handleMessage,
  ]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected");
        return;
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setCurrentUrl(null);
      setHtmlContent(null);
      setExecutionStage("thinking");

      wsRef.current.send(
        JSON.stringify({
          message,
          session_id: sessionId,
        })
      );
    },
    [sessionId, generateId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentUrl(null);
    setHtmlContent(null);
    setSessionId(null);
    setExecutionStage("idle");
    setCurrentToolName(null);
    setConceptMap({ nodes: [], edges: [] });
    currentAssistantMessageRef.current = null;
    
    // 清除 localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        localStorage.removeItem(STORAGE_KEYS.PREVIEW_URL);
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      } catch (e) {
        console.error("Failed to clear localStorage:", e);
      }
    }
  }, []);

  // 探索概念地图中的节点
  const exploreNode = useCallback(
    (nodeId: string) => {
      const node = conceptMap.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // 发送探索请求
      const exploreMessage = `请详细解释一下「${node.label}」这个概念，并更新知识地图`;
      sendMessage(exploreMessage);
    },
    [conceptMap.nodes, sendMessage]
  );

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    messages,
    isConnected,
    isLoading,
    currentUrl,
    htmlContent,
    sessionId,
    executionStage,
    currentToolName,
    conceptMap,
    sendMessage,
    exploreNode,
    clearMessages,
  };
}
