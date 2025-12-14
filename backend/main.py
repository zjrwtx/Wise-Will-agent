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
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from kimi_runner import KimiRunner, MessageEvent

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
