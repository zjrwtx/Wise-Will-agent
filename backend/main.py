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
from manim_service import ManimService, ManimTask, ManimTaskStatus
from doc_to_ppt import DocToPptService, DocTask, DocTaskStatus

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

# Manim service instance
manim_service = ManimService(
    output_dir=Path(__file__).parent / "manim_videos",
    quality="m",  # 720p30
)

# Document to PPT service instance
doc_to_ppt_service = DocToPptService(
    output_dir=Path(__file__).parent / "doc_uploads",
    model="gpt-4o-mini",
    style="professional",
)

# Store for document tasks
doc_tasks: dict[str, DocTask] = {}


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


# ============== Manim Math Video API ==============

class ManimGenerateRequest(BaseModel):
    """Request model for Manim video generation."""
    prompt: str
    quality: str = "m"  # l=480p, m=720p, h=1080p


class ManimTaskResponse(BaseModel):
    """Response model for Manim task."""
    task_id: str
    status: str
    prompt: str
    progress: int = 0
    code: str | None = None
    video_url: str | None = None
    error_message: str | None = None


@app.post("/api/manim/generate", response_model=ManimTaskResponse)
async def create_manim_task(request: ManimGenerateRequest):
    """
    Create a new Manim video generation task.
    
    The task will be processed via WebSocket for real-time progress.
    """
    task = manim_service.create_task(request.prompt)
    
    return ManimTaskResponse(
        task_id=task.task_id,
        status=task.status.value,
        prompt=task.prompt,
        progress=0,
    )


@app.get("/api/manim/status/{task_id}", response_model=ManimTaskResponse)
async def get_manim_status(task_id: str):
    """Get the status of a Manim generation task."""
    task = manim_service.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    video_url = None
    if task.status == ManimTaskStatus.COMPLETED and task.video_path:
        video_url = f"/api/manim/video/{task_id}"
    
    return ManimTaskResponse(
        task_id=task.task_id,
        status=task.status.value,
        prompt=task.prompt,
        progress=task.progress,
        code=task.code,
        video_url=video_url,
        error_message=task.error_message,
    )


@app.get("/api/manim/video/{task_id}")
async def get_manim_video(task_id: str):
    """Download or stream the generated Manim video."""
    video_path = manim_service.get_video_path(task_id)
    
    if not video_path or not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(
        path=video_path,
        filename=f"math_animation_{task_id}.mp4",
        media_type="video/mp4",
    )


@app.delete("/api/manim/{task_id}")
async def delete_manim_task(task_id: str):
    """Delete a Manim task and its files."""
    task = manim_service.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    manim_service.cleanup_task(task_id)
    
    return {"status": "deleted", "task_id": task_id}


@app.websocket("/ws/manim/{task_id}")
async def websocket_manim_process(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint for real-time Manim video generation.
    
    Protocol:
    1. Client connects with task_id
    2. Server generates code and renders video, streaming progress
    3. Events:
       - {"event": "progress", "message": "...", "stage": "...", "progress": 0-100}
       - {"event": "code_chunk", "message": "...", "chunk": "..."}
       - {"event": "code_complete", "code": "...", "progress": 30}
       - {"event": "output", "message": "..."} (manim stdout/stderr)
       - {"event": "done", "video_url": "...", "task_id": "..."}
       - {"event": "error", "message": "..."}
    """
    await websocket.accept()
    logger.info(f"Manim WebSocket connected: {task_id}")
    
    task = manim_service.get_task(task_id)
    if not task:
        await websocket.send_json({
            "event": "error",
            "message": "Task not found"
        })
        await websocket.close()
        return
    
    if task.status == ManimTaskStatus.COMPLETED:
        await websocket.send_json({
            "event": "done",
            "video_url": f"/api/manim/video/{task_id}",
            "task_id": task_id,
        })
        await websocket.close()
        return
    
    if task.status in (
        ManimTaskStatus.GENERATING_CODE,
        ManimTaskStatus.RENDERING
    ):
        await websocket.send_json({
            "event": "error",
            "message": "Task is already being processed"
        })
        await websocket.close()
        return
    
    try:
        # Process task and stream events
        async for event in manim_service.process(task):
            await websocket.send_json(event.to_dict())
            
            # Small delay to prevent overwhelming client
            await asyncio.sleep(0.05)
            
    except WebSocketDisconnect:
        logger.info(f"Manim WebSocket disconnected: {task_id}")
    except Exception as e:
        logger.exception(f"Manim processing error: {e}")
        try:
            await websocket.send_json({
                "event": "error",
                "message": str(e),
            })
        except RuntimeError:
            # WebSocket already closed
            pass


@app.get("/api/manim/check")
async def check_manim_installation():
    """Check if Manim and LaTeX are properly installed."""
    from manim_service.generator import is_latex_available
    
    is_installed = await manim_service.executor.check_manim_installed()
    latex_available = is_latex_available()
    
    return {
        "installed": is_installed,
        "latex_available": latex_available,
        "message": (
            "Manim is ready" if is_installed
            else "Manim not found. Install with: pip install manim"
        ),
        "latex_message": (
            "LaTeX is available for math formulas" if latex_available
            else "LaTeX not installed. Using Unicode math symbols. "
            "For better math rendering, install: brew install --cask mactex-no-gui"
        ),
    }


# ============== PPT Generation API ==============

class PptCreateRequest(BaseModel):
    """Request model for PPT generation."""
    prompt: str  # User's requirements for the PPT
    title: str = ""  # Optional title
    style: str = "professional"  # professional, academic, creative


class PptCreateResponse(BaseModel):
    """Response model for PPT creation."""
    task_id: str
    status: str
    message: str


class DocUploadResponse(BaseModel):
    """Response model for document upload."""
    task_id: str
    status: str
    message: str
    filename: str


class DocStatusResponse(BaseModel):
    """Response model for document processing status."""
    task_id: str
    status: str
    stage: str
    progress: int
    error_message: str | None = None
    download_url: str | None = None
    slides_count: int = 0


class OutlineResponse(BaseModel):
    """Response model for PPT outline."""
    task_id: str
    outline: list[dict]


@app.post("/api/doc-to-ppt/create", response_model=PptCreateResponse)
async def create_ppt_task(request: PptCreateRequest):
    """
    Create a PPT generation task based on user requirements.
    
    Args:
        request: PptCreateRequest with prompt, title, and style.
    
    Returns:
        PptCreateResponse with task_id for tracking.
    
    Example:
        POST /api/doc-to-ppt/create
        {
            "prompt": "Make a Python training PPT, 10 slides, professional",
            "title": "Python Training",
            "style": "professional"
        }
    """
    task_id = str(uuid.uuid4())[:8]
    upload_dir = Path(__file__).parent / "doc_uploads" / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Create task with user prompt (no document required)
        task = doc_to_ppt_service.create_task(
            user_prompt=request.prompt,
            title=request.title,
            style=request.style,
        )
        task.task_id = task_id
        doc_tasks[task_id] = task
        
        logger.info(f"PPT task created: {task_id}, prompt: {request.prompt[:50]}...")
        
        return PptCreateResponse(
            task_id=task_id,
            status="created",
            message="任务创建成功，请通过WebSocket开始生成",
        )
        
    except Exception as e:
        logger.exception(f"Failed to create PPT task: {e}")
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/doc-to-ppt/upload", response_model=DocUploadResponse)
async def upload_reference_document(
    file: UploadFile = File(...),
    prompt: str = Form(...),  # Required: user's requirements
    title: str = Form(default=""),
    style: str = Form(default="professional"),
):
    """
    Upload a reference document and create PPT generation task.
    
    The document serves as reference material for PPT generation.
    The AI will use user's prompt to determine what PPT to create.
    
    Supported formats: .docx, .pdf, .txt, .md
    
    Args:
        file: Reference document file.
        prompt: User's requirements for the PPT (required).
        title: Presentation title (optional).
        style: Presentation style (professional, academic, creative).
    
    Returns:
        DocUploadResponse with task_id for tracking.
    
    Example:
        POST /api/doc-to-ppt/upload
        - file: notes.pdf
        - prompt: "Based on this document, create a training PPT"
        - title: "Training Session"
        - style: "professional"
    """
    # Validate file type
    allowed_extensions = {".docx", ".pdf", ".txt", ".md"}
    file_ext = Path(file.filename or "document.txt").suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate task ID and save file
    task_id = str(uuid.uuid4())[:8]
    upload_dir = Path(__file__).parent / "doc_uploads" / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    doc_path = upload_dir / f"document{file_ext}"
    
    try:
        # Save uploaded file
        with open(doc_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"Reference uploaded: {doc_path} ({len(content)} bytes)")
        
        # Create task with user prompt AND reference document
        task = doc_to_ppt_service.create_task(
            user_prompt=prompt,
            document_path=doc_path,
            title=title,
            style=style,
        )
        task.task_id = task_id
        doc_tasks[task_id] = task
        
        return DocUploadResponse(
            task_id=task_id,
            status="uploaded",
            message="参考材料上传成功，请通过WebSocket开始生成",
            filename=file.filename or "document",
        )
        
    except Exception as e:
        logger.exception(f"Failed to upload reference: {e}")
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/doc-to-ppt/status/{task_id}", response_model=DocStatusResponse)
async def get_doc_status(task_id: str):
    """Get the processing status of a document task."""
    task = doc_tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    download_url = None
    if task.status == DocTaskStatus.COMPLETED and task.ppt_path:
        download_url = f"/api/doc-to-ppt/download/{task_id}"
    
    return DocStatusResponse(
        task_id=task_id,
        status=task.status.value,
        stage=task.stage.value,
        progress=task.progress,
        error_message=task.error_message,
        download_url=download_url,
        slides_count=len(task.slides),
    )


@app.get("/api/doc-to-ppt/download/{task_id}")
async def download_ppt(task_id: str):
    """Download the generated PPT file."""
    task = doc_tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != DocTaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")
    
    if not task.ppt_path or not task.ppt_path.exists():
        raise HTTPException(status_code=404, detail="PPT file not found")
    
    # Use title for filename if available
    filename = f"{task.title or task_id}.pptx"
    
    return FileResponse(
        path=task.ppt_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument."
                   "presentationml.presentation",
    )


@app.delete("/api/doc-to-ppt/{task_id}")
async def delete_doc_task(task_id: str):
    """Delete a document task and its files."""
    task = doc_tasks.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Cleanup files
    doc_to_ppt_service.cleanup_task(task_id)
    
    # Remove from storage
    if task_id in doc_tasks:
        del doc_tasks[task_id]
    
    return {"status": "deleted", "task_id": task_id}


@app.websocket("/ws/doc-to-ppt/{task_id}")
async def websocket_doc_process(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint for real-time document to PPT conversion.
    
    Protocol:
    1. Client connects with task_id
    2. Server processes document and streams progress
    3. Events:
       - {"event": "progress", "message": "...", "stage": "...", "progress": 0-100}
       - {"event": "parsed", "message": "...", "data": {...}}
       - {"event": "outline", "message": "...", "data": {"outline": [...]}}
       - {"event": "slide", "message": "...", "data": {"slide": {...}}}
       - {"event": "done", "data": {"ppt_path": "...", "task_id": "..."}}
       - {"event": "error", "message": "..."}
    """
    await websocket.accept()
    logger.info(f"Doc-to-PPT WebSocket connected: {task_id}")
    
    task = doc_tasks.get(task_id)
    if not task:
        await websocket.send_json({
            "event": "error",
            "message": "Task not found"
        })
        await websocket.close()
        return
    
    if task.status == DocTaskStatus.COMPLETED:
        await websocket.send_json({
            "event": "done",
            "data": {
                "download_url": f"/api/doc-to-ppt/download/{task_id}",
                "task_id": task_id,
            }
        })
        await websocket.close()
        return
    
    if task.status in (
        DocTaskStatus.PARSING,
        DocTaskStatus.GENERATING_OUTLINE,
        DocTaskStatus.FILLING_CONTENT,
        DocTaskStatus.BUILDING_PPT,
    ):
        await websocket.send_json({
            "event": "error",
            "message": "Task is already being processed"
        })
        await websocket.close()
        return
    
    try:
        # Process document and stream events
        async for event in doc_to_ppt_service.process(task, title=task.title):
            await websocket.send_json(event.to_dict())
            
            # Small delay to prevent overwhelming client
            await asyncio.sleep(0.05)
            
    except WebSocketDisconnect:
        logger.info(f"Doc-to-PPT WebSocket disconnected: {task_id}")
    except Exception as e:
        logger.exception(f"Doc-to-PPT processing error: {e}")
        try:
            await websocket.send_json({
                "event": "error",
                "message": str(e),
            })
        except RuntimeError:
            # WebSocket already closed
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
