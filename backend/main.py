"""
Edu AI Platform Backend.

A FastAPI server that integrates Kimi CLI to generate educational
visualizations and capture deployed URLs for frontend embedding.
"""

from __future__ import annotations

# 加载 .env 文件（必须在其他导入之前）
from dotenv import load_dotenv
load_dotenv()

import asyncio
import json
import logging
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from kimi_runner import KimiRunner, MessageEvent
from video_processor import VideoProcessor, VideoTask, TaskStatus, ProcessingStage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting Edu AI Platform Backend...")
    yield
    logger.info("Shutting down Edu AI Platform Backend...")


app = FastAPI(
    title="Edu AI Platform",
    description="AI-powered educational visualization generator",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    session_id: str
    message: str
    url: str | None = None


class TaskHistory(BaseModel):
    """Model for task history item."""

    id: str
    title: str
    preview_url: str | None = None
    created_at: str


# In-memory storage for demo (use database in production)
task_history: list[TaskHistory] = []

# Video processor instance
video_processor = VideoProcessor(
    work_dir=Path(__file__).parent / "video_uploads",
    whisper_model="base",  # Use "small" or "medium" for better accuracy
    language="zh",
)

# Store for video processing tasks
video_tasks: dict[str, VideoTask] = {}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint to check server status."""
    return {"status": "ok", "message": "Edu AI Platform Backend"}


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/api/history")
async def get_history() -> list[TaskHistory]:
    """Get task history."""
    return task_history


@app.delete("/api/history/{task_id}")
async def delete_history_item(task_id: str) -> dict[str, str]:
    """Delete a task from history."""
    global task_history
    task_history = [t for t in task_history if t.id != task_id]
    return {"status": "deleted"}


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time chat with Kimi CLI.

    Protocol:
    1. Client sends: {"message": "...", "session_id": "..."}
    2. Server streams: {"type": "...", "data": {...}}
    
    Message types:
    - session: Session info with session_id
    - turn_begin: New conversation turn started
    - step_begin: New AI reasoning step
    - thinking: AI thinking/reasoning content (collapsible)
    - text: AI text response
    - tool_call: Tool being invoked
    - tool_call_part: Streaming tool call arguments
    - tool_result: Tool execution result
    - url_extracted: EdgeOne deployment URL found
    - status: Context usage status
    - done: Execution completed with final URLs
    - error: Error occurred
    """
    await websocket.accept()
    logger.info("WebSocket connection established")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                request = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Invalid JSON"}
                })
                continue
            
            user_message = request.get("message", "").strip()
            session_id = request.get("session_id")

            if not user_message:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Empty message"}
                })
                continue

            logger.info(f"Processing message: {user_message[:50]}...")

            # Create Kimi runner and process
            # MCP 配置在 backend 目录下
            backend_dir = Path(__file__).parent
            project_root = backend_dir.parent
            runner = KimiRunner(
                work_dir=project_root,
                mcp_config_path=backend_dir / "mcp.json",
                yolo=True,  # Auto-approve for education product
                thinking=True,  # Enable thinking mode
            )

            try:
                extracted_urls: list[str] = []
                
                async for event in runner.run(user_message, session_id):
                    # 详细日志
                    logger.info(f"[WS] Sending event: type={event.type}, data_keys={list(event.data.keys())}")
                    if event.type in ("tool_call", "tool_call_part"):
                        logger.info(f"[WS] Tool event details: {event.data}")
                    
                    # Send event to client
                    await websocket.send_json({
                        "type": event.type,
                        "data": event.data
                    })
                    
                    # Track extracted URLs
                    if event.type == "url_extracted":
                        url = event.data.get("url")
                        if url:
                            extracted_urls.append(url)
                    
                    # Store in history when done
                    if event.type == "done":
                        from datetime import datetime
                        task = TaskHistory(
                            id=event.data.get("session_id", ""),
                            title=user_message[:50] + ("..." if len(user_message) > 50 else ""),
                            preview_url=extracted_urls[0] if extracted_urls else None,
                            created_at=datetime.now().isoformat(),
                        )
                        task_history.insert(0, task)
                        # Keep only last 20 tasks
                        if len(task_history) > 20:
                            task_history.pop()
                            
            except Exception as e:
                logger.exception(f"Error processing message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": str(e)}
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")


# ============== Video to PDF API ==============

class VideoUploadResponse(BaseModel):
    """Response model for video upload."""
    task_id: str
    status: str
    message: str


class VideoStatusResponse(BaseModel):
    """Response model for video processing status."""
    task_id: str
    status: str
    stage: str
    progress: int
    error_message: str | None = None
    download_url: str | None = None


@app.post("/api/video/upload", response_model=VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(default="教学视频笔记"),
    language: str = Form(default="zh"),
):
    """
    Upload a video file for processing.
    
    Supported formats: mp4, webm, mov, avi, mkv
    """
    # Validate file type
    allowed_extensions = {".mp4", ".webm", ".mov", ".avi", ".mkv"}
    file_ext = Path(file.filename or "video.mp4").suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate task ID and save file
    task_id = str(uuid.uuid4())[:8]
    upload_dir = Path(__file__).parent / "video_uploads" / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    video_path = upload_dir / f"video{file_ext}"
    
    try:
        # Save uploaded file
        with open(video_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"Video uploaded: {video_path} ({len(content)} bytes)")
        
        # Create processing task
        task = video_processor.create_task(video_path)
        task.task_id = task_id  # Use our generated ID
        video_tasks[task_id] = task
        
        # Store title and language for later use
        task._title = title  # type: ignore
        task._language = language  # type: ignore
        
        return VideoUploadResponse(
            task_id=task_id,
            status="uploaded",
            message="视频上传成功，请调用处理接口开始转换",
        )
        
    except Exception as e:
        logger.exception(f"Failed to upload video: {e}")
        # Cleanup on failure
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/video/status/{task_id}", response_model=VideoStatusResponse)
async def get_video_status(task_id: str):
    """Get the processing status of a video task."""
    task = video_tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    download_url = None
    if task.status == TaskStatus.COMPLETED and task.pdf_path:
        download_url = f"/api/video/download/{task_id}"
    
    return VideoStatusResponse(
        task_id=task_id,
        status=task.status.value,
        stage=task.stage.value,
        progress=task.progress,
        error_message=task.error_message,
        download_url=download_url,
    )


@app.get("/api/video/download/{task_id}")
async def download_video_pdf(task_id: str):
    """Download the generated PDF for a video task."""
    task = video_tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")
    
    if not task.pdf_path or not task.pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=task.pdf_path,
        filename=f"{task_id}_notes.pdf",
        media_type="application/pdf",
    )


@app.delete("/api/video/{task_id}")
async def delete_video_task(task_id: str):
    """Delete a video task and its files."""
    task = video_tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Cleanup files
    task_dir = Path(__file__).parent / "video_uploads" / task_id
    if task_dir.exists():
        shutil.rmtree(task_dir)
    
    # Remove from storage
    del video_tasks[task_id]
    
    return {"status": "deleted", "task_id": task_id}


@app.websocket("/ws/video-to-pdf/{task_id}")
async def websocket_video_process(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint for real-time video processing progress.
    
    Protocol:
    1. Client connects with task_id
    2. Server starts processing and streams progress events
    3. Events: {"event": "progress", "stage": "...", "progress": 0-100, "message": "..."}
    4. Final event: {"event": "done", "download_url": "..."} or {"event": "error", "message": "..."}
    """
    await websocket.accept()
    logger.info(f"Video processing WebSocket connected: {task_id}")
    
    task = video_tasks.get(task_id)
    if not task:
        await websocket.send_json({
            "event": "error",
            "message": "Task not found"
        })
        await websocket.close()
        return
    
    if task.status == TaskStatus.COMPLETED:
        await websocket.send_json({
            "event": "done",
            "download_url": f"/api/video/download/{task_id}"
        })
        await websocket.close()
        return
    
    if task.status == TaskStatus.PROCESSING:
        await websocket.send_json({
            "event": "error",
            "message": "Task is already being processed"
        })
        await websocket.close()
        return
    
    try:
        # Get stored title
        title = getattr(task, '_title', '教学视频笔记')
        
        # Process video and stream progress
        async for event in video_processor.process(task, title=title):
            await websocket.send_json(event.to_dict())
            
            # Small delay to prevent overwhelming the client
            await asyncio.sleep(0.1)
        
        # Send final done event
        if task.status == TaskStatus.COMPLETED:
            await websocket.send_json({
                "event": "done",
                "download_url": f"/api/video/download/{task_id}",
                "task_id": task_id,
            })
        else:
            await websocket.send_json({
                "event": "error",
                "message": task.error_message or "Processing failed",
            })
            
    except WebSocketDisconnect:
        logger.info(f"Video processing WebSocket disconnected: {task_id}")
    except Exception as e:
        logger.exception(f"Video processing error: {e}")
        await websocket.send_json({
            "event": "error",
            "message": str(e),
        })
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
