"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL?.replace("/ws/chat", "") || "ws://localhost:8000";

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

export function VideoToPdf() {
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isVideoFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
      // Auto-fill title from filename
      if (!title) {
        const name = droppedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(name);
      }
    } else {
      setError("请上传视频文件 (mp4, webm, mov, avi, mkv)");
    }
  }, [title]);

  const isVideoFile = (file: File): boolean => {
    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    const validExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
    return validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

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
      
      // Start processing via WebSocket
      startProcessing(data.task_id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const startProcessing = (id: string) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStage(null);
    setDownloadUrl(null);
    
    const ws = new WebSocket(`${WS_BASE}/ws/video-to-pdf/${id}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log("WebSocket connected for video processing");
    };
    
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
    
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("连接错误，请重试");
      setIsProcessing(false);
    };
    
    ws.onclose = () => {
      console.log("WebSocket closed");
    };
  };

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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStageIndex = (stage: string | null): number => {
    if (!stage) return -1;
    return STAGES.findIndex(s => s.key === stage);
  };

  return (
    <div style={{
      maxWidth: 600,
      margin: "0 auto",
      padding: 24,
    }}>
      <h1 style={{
        fontSize: 28,
        fontWeight: 600,
        marginBottom: 8,
        color: "var(--foreground)",
      }}>
        视频转PDF笔记
      </h1>
      <p style={{
        fontSize: 14,
        color: "var(--secondary)",
        marginBottom: 32,
      }}>
        上传教学视频，AI自动提取关键帧、识别语音，生成结构化PDF笔记
      </p>

      {/* Upload Area */}
      {!taskId && (
        <>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: dragActive ? "rgba(59, 130, 246, 0.05)" : "transparent",
              transition: "all 0.2s",
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
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--secondary)" }}>
                  {formatFileSize(file.size)}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                  拖拽视频文件到这里
                </div>
                <div style={{ fontSize: 13, color: "var(--secondary)" }}>
                  或点击选择文件 (支持 mp4, webm, mov, avi, mkv)
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{ marginTop: 24 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
            }}>
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
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
            }}>
              语音语言
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginTop: 16,
              padding: "12px 16px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            style={{
              width: "100%",
              marginTop: 24,
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: file && !isUploading ? "var(--accent)" : "var(--border)",
              color: file && !isUploading ? "white" : "var(--secondary)",
              border: "none",
              borderRadius: 10,
              cursor: file && !isUploading ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {isUploading ? "上传中..." : "开始转换"}
          </button>
        </>
      )}

      {/* Processing Progress */}
      {taskId && (isProcessing || downloadUrl) && (
        <div style={{
          backgroundColor: "var(--card)",
          borderRadius: 12,
          padding: 24,
          border: "1px solid var(--border)",
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 500,
            marginBottom: 20,
          }}>
            {downloadUrl ? "✅ 处理完成" : "⏳ 正在处理..."}
          </h3>

          {/* Progress Stages */}
          <div style={{ marginBottom: 24 }}>
            {STAGES.map((stage, index) => {
              const currentIndex = getStageIndex(currentStage);
              const isCompleted = currentIndex > index || currentStage === "completed";
              const isCurrent = currentIndex === index;
              
              return (
                <div
                  key={stage.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 0",
                    opacity: isCompleted || isCurrent ? 1 : 0.4,
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isCompleted ? "rgba(34, 197, 94, 0.1)" : isCurrent ? "rgba(59, 130, 246, 0.1)" : "var(--border)",
                    fontSize: 16,
                  }}>
                    {isCompleted ? "✓" : stage.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {stage.label}
                    </div>
                    {isCurrent && statusMessage && (
                      <div style={{ fontSize: 12, color: "var(--secondary)" }}>
                        {statusMessage}
                      </div>
                    )}
                  </div>
                  {isCurrent && (
                    <div style={{
                      fontSize: 13,
                      color: "var(--accent)",
                      fontWeight: 500,
                    }}>
                      {progress}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall Progress Bar */}
          {isProcessing && (
            <div style={{
              height: 4,
              backgroundColor: "var(--border)",
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: 24,
            }}>
              <div style={{
                height: "100%",
                width: `${(getStageIndex(currentStage) + 1) / STAGES.length * 100}%`,
                backgroundColor: "var(--accent)",
                transition: "width 0.3s",
              }} />
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
                fontSize: 16,
                fontWeight: 500,
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 10,
                textAlign: "center",
                textDecoration: "none",
                cursor: "pointer",
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
              marginTop: 12,
              padding: "12px 24px",
              fontSize: 14,
              backgroundColor: "transparent",
              color: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            转换新视频
          </button>
        </div>
      )}

      {/* Error during processing */}
      {taskId && error && !isProcessing && !downloadUrl && (
        <div style={{
          backgroundColor: "var(--card)",
          borderRadius: 12,
          padding: 24,
          border: "1px solid var(--border)",
        }}>
          <div style={{
            fontSize: 48,
            textAlign: "center",
            marginBottom: 16,
          }}>
            ❌
          </div>
          <div style={{
            textAlign: "center",
            color: "#ef4444",
            marginBottom: 24,
          }}>
            {error}
          </div>
          <button
            onClick={handleReset}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            重新上传
          </button>
        </div>
      )}
    </div>
  );
}
