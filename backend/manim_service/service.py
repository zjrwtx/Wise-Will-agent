"""
Manim Service.

High-level service that orchestrates code generation and execution
to create mathematical animation videos from natural language.

Example:
    >>> service = ManimService()
    >>> async for event in service.generate("解释勾股定理"):
    ...     print(event)
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import AsyncIterator

from .executor import ExecutionEvent, ManimExecutor
from .generator import ManimCodeGenerator

logger = logging.getLogger(__name__)


class ManimTaskStatus(Enum):
    """Status of a Manim generation task."""
    PENDING = "pending"
    GENERATING_CODE = "generating_code"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ManimTask:
    """
    Represents a Manim video generation task.
    
    Attributes:
        task_id: Unique task identifier
        prompt: User's natural language prompt
        status: Current task status
        code: Generated Manim code
        video_path: Path to generated video
        error_message: Error message if failed
        created_at: Task creation timestamp
        
    Example:
        >>> task = ManimTask(
        ...     task_id="abc123",
        ...     prompt="解释勾股定理"
        ... )
    """
    task_id: str
    prompt: str
    status: ManimTaskStatus = ManimTaskStatus.PENDING
    code: str | None = None
    video_path: Path | None = None
    error_message: str | None = None
    created_at: datetime = field(default_factory=datetime.now)
    progress: int = 0


class ManimServiceEvent:
    """
    Event emitted during Manim service operations.
    
    Attributes:
        event: Event type
        message: Human-readable message
        data: Additional event data
    """
    
    def __init__(
        self,
        event: str,
        message: str,
        data: dict | None = None,
    ):
        """
        Initialize event.
        
        Args:
            event: Event type string
            message: Description message
            data: Optional additional data
        """
        self.event = event
        self.message = message
        self.data = data or {}
        
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "event": self.event,
            "message": self.message,
            **self.data,
        }


class ManimService:
    """
    High-level service for generating math animation videos.
    
    Combines LLM code generation with Manim execution to create
    educational math videos from natural language descriptions.
    
    Attributes:
        generator: Code generator instance
        executor: Code executor instance
        tasks: Dictionary of active tasks
        
    Example:
        >>> service = ManimService()
        >>> task = service.create_task("解释微积分基本定理")
        >>> async for event in service.process(task):
        ...     print(f"{event.event}: {event.message}")
    """
    
    def __init__(
        self,
        output_dir: Path | None = None,
        quality: str = "m",
    ):
        """
        Initialize the Manim service.
        
        Args:
            output_dir: Directory for output videos
            quality: Video quality (l/m/h/p)
        """
        self.generator = ManimCodeGenerator()
        self.executor = ManimExecutor(
            output_dir=output_dir,
            quality=quality,
        )
        self.tasks: dict[str, ManimTask] = {}
        
    def create_task(self, prompt: str) -> ManimTask:
        """
        Create a new generation task.
        
        Args:
            prompt: Natural language description
            
        Returns:
            New ManimTask instance
            
        Example:
            >>> task = service.create_task("画一个正弦波动画")
            >>> print(task.task_id)
        """
        task_id = str(uuid.uuid4())[:8]
        task = ManimTask(
            task_id=task_id,
            prompt=prompt,
        )
        self.tasks[task_id] = task
        logger.info(f"Created task {task_id}: {prompt[:50]}...")
        return task
    
    def get_task(self, task_id: str) -> ManimTask | None:
        """
        Get task by ID.
        
        Args:
            task_id: Task identifier
            
        Returns:
            ManimTask or None if not found
        """
        return self.tasks.get(task_id)
    
    async def process(
        self,
        task: ManimTask,
    ) -> AsyncIterator[ManimServiceEvent]:
        """
        Process a task: generate code and render video.
        
        Args:
            task: Task to process
            
        Yields:
            ManimServiceEvent objects for progress tracking
            
        Example:
            >>> async for event in service.process(task):
            ...     if event.event == "done":
            ...         print(f"Video: {event.data['video_path']}")
        """
        try:
            # Stage 1: Generate code
            task.status = ManimTaskStatus.GENERATING_CODE
            task.progress = 10
            
            yield ManimServiceEvent(
                event="progress",
                message="正在生成动画代码...",
                data={
                    "stage": "generating_code",
                    "progress": 10,
                    "task_id": task.task_id,
                },
            )
            
            # Stream code generation
            code_chunks = []
            async for chunk in self.generator.generate_stream(task.prompt):
                code_chunks.append(chunk)
                yield ManimServiceEvent(
                    event="code_chunk",
                    message=chunk,
                    data={"chunk": chunk},
                )
                
            raw_code = "".join(code_chunks)
            
            # Extract and validate code
            try:
                task.code = self.generator._extract_code(raw_code)
                is_valid, error = self.generator._validate_code(task.code)
                
                if not is_valid:
                    # Retry with full generation
                    logger.warning(f"Streaming code invalid: {error}")
                    task.code = await self.generator.generate(task.prompt)
                    
            except Exception as e:
                logger.warning(f"Code extraction failed: {e}, retrying...")
                task.code = await self.generator.generate(task.prompt)
            
            task.progress = 30
            
            yield ManimServiceEvent(
                event="code_complete",
                message="代码生成完成",
                data={
                    "code": task.code,
                    "progress": 30,
                },
            )
            
            # Stage 2: Render video
            task.status = ManimTaskStatus.RENDERING
            
            yield ManimServiceEvent(
                event="progress",
                message="正在渲染视频...",
                data={
                    "stage": "rendering",
                    "progress": 40,
                },
            )
            
            # Execute and stream progress
            async for exec_event in self.executor.execute(
                task.code,
                task.task_id,
            ):
                if exec_event.event == "error":
                    task.status = ManimTaskStatus.FAILED
                    task.error_message = exec_event.message
                    yield ManimServiceEvent(
                        event="error",
                        message=exec_event.message,
                        data=exec_event.data,
                    )
                    return
                    
                elif exec_event.event == "done":
                    task.status = ManimTaskStatus.COMPLETED
                    task.video_path = Path(exec_event.data["video_path"])
                    task.progress = 100
                    
                    yield ManimServiceEvent(
                        event="done",
                        message="视频生成完成",
                        data={
                            "task_id": task.task_id,
                            "video_path": str(task.video_path),
                            "download_url": f"/api/manim/video/{task.task_id}",
                            "progress": 100,
                        },
                    )
                    return
                    
                elif exec_event.event == "progress":
                    # Map executor progress (10-100) to overall (40-100)
                    exec_progress = exec_event.data.get("progress", 0)
                    overall_progress = 40 + int(exec_progress * 0.6)
                    task.progress = overall_progress
                    
                    yield ManimServiceEvent(
                        event="progress",
                        message=exec_event.message,
                        data={
                            "stage": exec_event.data.get("stage"),
                            "progress": overall_progress,
                        },
                    )
                    
                else:
                    # Forward other events
                    yield ManimServiceEvent(
                        event=exec_event.event,
                        message=exec_event.message,
                        data=exec_event.data,
                    )
                    
        except Exception as e:
            logger.exception(f"Task processing failed: {e}")
            task.status = ManimTaskStatus.FAILED
            task.error_message = str(e)
            
            yield ManimServiceEvent(
                event="error",
                message=f"处理失败: {str(e)}",
                data={"task_id": task.task_id},
            )
    
    async def generate(
        self,
        prompt: str,
    ) -> AsyncIterator[ManimServiceEvent]:
        """
        Convenience method: create task and process.
        
        Args:
            prompt: Natural language description
            
        Yields:
            ManimServiceEvent objects
            
        Example:
            >>> async for event in service.generate("解释欧拉公式"):
            ...     print(event.to_dict())
        """
        task = self.create_task(prompt)
        async for event in self.process(task):
            yield event
            
    def get_video_path(self, task_id: str) -> Path | None:
        """
        Get video path for completed task.
        
        Args:
            task_id: Task identifier
            
        Returns:
            Path to video or None
        """
        task = self.tasks.get(task_id)
        if task and task.video_path and task.video_path.exists():
            return task.video_path
        return self.executor.get_video_path(task_id)
    
    def cleanup_task(self, task_id: str) -> None:
        """
        Clean up task and its files.
        
        Args:
            task_id: Task identifier
        """
        if task_id in self.tasks:
            del self.tasks[task_id]
        self.executor.cleanup_task(task_id)
