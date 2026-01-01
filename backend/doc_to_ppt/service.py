"""
Main service for PPT generation.

This module provides the main service class that orchestrates
the PPT generation pipeline using Kimi CLI.

Example:
    >>> service = PptService()
    >>> task = service.create_task(
    ...     user_prompt="Make a Python training PPT",
    ...     reference_path="notes.pdf",
    ... )
    >>> async for event in service.process(task):
    ...     print(f"{event.event}: {event.message}")
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import uuid
from pathlib import Path
from typing import AsyncGenerator, Optional

from .models import (
    DocTask,
    DocTaskStatus,
    ProcessingStage,
    ProgressEvent,
    SlideContent,
)
from .parser import DocumentParser
from .generator import PptGenerator
from .ppt_builder import PptBuilder

logger = logging.getLogger(__name__)


class DocToPptService:
    """
    Main service for PPT generation using Kimi CLI.

    This class orchestrates the PPT generation pipeline:
    1. Parse reference materials (if provided)
    2. Generate presentation outline using Kimi CLI
    3. Fill content for each slide using Kimi CLI
    4. Build PowerPoint file

    Attributes:
        output_dir: Directory for output files.
        parser: Document parser instance.
        generator: PPT generator instance.
        builder: PPT builder instance.

    Example:
        >>> service = DocToPptService(output_dir="./output")
        >>> task = service.create_task(
        ...     user_prompt="Python入门培训PPT，10页，简洁风格",
        ...     reference_path="python_notes.pdf",
        ... )
        >>> async for event in service.process(task):
        ...     if event.event == "done":
        ...         print(f"PPT created: {event.data['ppt_path']}")
    """

    def __init__(
        self,
        output_dir: str | Path = "/tmp/doc_to_ppt",
        model: str = "gpt-4o-mini",  # Kept for compatibility, not used
        style: str = "professional",
    ):
        """
        Initialize the PPT generation service.

        Args:
            output_dir: Directory for output files.
            model: Model name (kept for compatibility).
            style: Default presentation style.

        Example:
            >>> service = DocToPptService(
            ...     output_dir="./ppt_output",
            ...     style="academic"
            ... )
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.parser = DocumentParser()
        self.generator = PptGenerator(
            work_dir=self.output_dir,
            style=style,
        )
        self.builder = PptBuilder(style=style)
        self.default_style = style

        # Task storage
        self._tasks: dict[str, DocTask] = {}

    def create_task(
        self,
        user_prompt: str = "",
        document_path: str | Path | None = None,
        title: str = "",
        style: str = "",
    ) -> DocTask:
        """
        Create a new PPT generation task.

        Args:
            user_prompt: User's requirements for the PPT.
            document_path: Path to reference document (optional).
            title: Presentation title (optional).
            style: Presentation style (uses default if empty).

        Returns:
            DocTask object for tracking the generation.

        Example:
            >>> service = DocToPptService()
            >>> task = service.create_task(
            ...     user_prompt="制作一个Python入门培训PPT",
            ...     document_path="notes.pdf",
            ...     title="Python入门",
            ... )
            >>> print(f"Task ID: {task.task_id}")
        """
        task_id = str(uuid.uuid4())[:8]
        task = DocTask(
            task_id=task_id,
            user_prompt=user_prompt,
            document_path=Path(document_path) if document_path else None,
            title=title,
            style=style or self.default_style,
        )
        self._tasks[task_id] = task
        logger.info(f"Created task {task_id}: {user_prompt[:50]}...")
        return task

    def get_task(self, task_id: str) -> Optional[DocTask]:
        """
        Get a task by ID.

        Args:
            task_id: Task identifier.

        Returns:
            DocTask if found, None otherwise.
        """
        return self._tasks.get(task_id)

    def get_ppt_path(self, task_id: str) -> Optional[Path]:
        """
        Get the path to the generated PPT file.

        Args:
            task_id: Task identifier.

        Returns:
            Path to PPT file if exists, None otherwise.
        """
        task = self.get_task(task_id)
        if task and task.ppt_path and task.ppt_path.exists():
            return task.ppt_path
        return None

    async def process(
        self,
        task: DocTask,
        title: str = "",
    ) -> AsyncGenerator[ProgressEvent, None]:
        """
        Process a task and generate PPT with streaming progress.

        Args:
            task: DocTask to process.
            title: Override presentation title.

        Yields:
            ProgressEvent objects for each processing step.

        Example:
            >>> service = DocToPptService()
            >>> task = service.create_task(user_prompt="Python PPT")
            >>> async for event in service.process(task):
            ...     print(f"[{event.progress}%] {event.message}")
            ...     if event.event == "done":
            ...         print(f"PPT: {event.data['ppt_path']}")
        """
        task_dir = self.output_dir / task.task_id
        task_dir.mkdir(parents=True, exist_ok=True)

        reference_text = ""

        try:
            # Stage 1: Parse reference document (if provided)
            if task.document_path and task.document_path.exists():
                task.status = DocTaskStatus.PARSING
                task.stage = ProcessingStage.PARSE_DOCUMENT

                yield ProgressEvent(
                    event="progress",
                    message="正在解析参考材料...",
                    stage=ProcessingStage.PARSE_DOCUMENT,
                    progress=5,
                )

                loop = asyncio.get_event_loop()
                task.document_content = await loop.run_in_executor(
                    None,
                    self.parser.parse,
                    task.document_path,
                )

                reference_text = task.document_content.text

                yield ProgressEvent(
                    event="parsed",
                    message=f"参考材料解析完成",
                    stage=ProcessingStage.PARSE_DOCUMENT,
                    progress=10,
                    data={
                        "sections": len(task.document_content.sections),
                        "text_length": len(reference_text),
                    },
                )
            else:
                yield ProgressEvent(
                    event="progress",
                    message="开始生成PPT...",
                    stage=ProcessingStage.GENERATE_OUTLINE,
                    progress=5,
                )

            # Stage 2: Generate outline using Kimi CLI
            task.status = DocTaskStatus.GENERATING_OUTLINE
            task.stage = ProcessingStage.GENERATE_OUTLINE

            yield ProgressEvent(
                event="progress",
                message="正在生成PPT大纲...",
                stage=ProcessingStage.GENERATE_OUTLINE,
                progress=15,
            )

            ppt_title, task.outline = await self.generator.generate_outline(
                user_prompt=task.user_prompt,
                reference_text=reference_text,
                style=task.style,
            )

            # Use provided title or generated title
            ppt_title = title or task.title or ppt_title

            yield ProgressEvent(
                event="outline",
                message=f"大纲生成完成，共 {len(task.outline)} 张幻灯片",
                stage=ProcessingStage.GENERATE_OUTLINE,
                progress=30,
                data={
                    "title": ppt_title,
                    "outline": [
                        {
                            "index": o.index,
                            "title": o.title,
                            "layout": o.layout,
                            "key_points": o.key_points,
                        }
                        for o in task.outline
                    ]
                },
            )

            # Stage 3: Fill content for each slide
            task.status = DocTaskStatus.FILLING_CONTENT
            task.stage = ProcessingStage.FILL_SLIDES

            task.slides = []
            context = ""

            for i, outline in enumerate(task.outline):
                progress = 30 + int((i + 1) / len(task.outline) * 50)

                yield ProgressEvent(
                    event="progress",
                    message=f"正在生成第 {i + 1}/{len(task.outline)} 张幻灯片: "
                            f"{outline.title}",
                    stage=ProcessingStage.FILL_SLIDES,
                    progress=progress,
                )

                slide = await self.generator.fill_slide_content(
                    outline,
                    reference_text,
                    context,
                )
                task.slides.append(slide)

                # Update context
                context = f"上一张幻灯片: {slide.title}"

                yield ProgressEvent(
                    event="slide",
                    message=f"第 {i + 1} 张幻灯片完成",
                    stage=ProcessingStage.FILL_SLIDES,
                    progress=progress,
                    data={
                        "slide": {
                            "index": slide.index,
                            "title": slide.title,
                            "layout": slide.layout,
                        }
                    },
                )

            # Stage 4: Build PPT
            task.status = DocTaskStatus.BUILDING_PPT
            task.stage = ProcessingStage.BUILD_PPT

            yield ProgressEvent(
                event="progress",
                message="正在生成PPT文件...",
                stage=ProcessingStage.BUILD_PPT,
                progress=85,
            )

            ppt_path = task_dir / f"{task.task_id}.pptx"

            # Build PPT in thread pool
            builder = PptBuilder(style=task.style)
            loop = asyncio.get_event_loop()
            task.ppt_path = await loop.run_in_executor(
                None,
                builder.build,
                task.slides,
                ppt_path,
                ppt_title,
            )

            yield ProgressEvent(
                event="progress",
                message="PPT文件生成完成",
                stage=ProcessingStage.BUILD_PPT,
                progress=95,
            )

            # Complete
            task.status = DocTaskStatus.COMPLETED
            task.stage = ProcessingStage.COMPLETED
            task.progress = 100

            yield ProgressEvent(
                event="done",
                message="PPT生成完成",
                stage=ProcessingStage.COMPLETED,
                progress=100,
                data={
                    "task_id": task.task_id,
                    "ppt_path": str(task.ppt_path),
                    "slides_count": len(task.slides),
                    "title": ppt_title,
                },
            )

        except Exception as e:
            logger.exception(f"Error generating PPT: {e}")
            task.status = DocTaskStatus.FAILED
            task.error_message = str(e)

            yield ProgressEvent(
                event="error",
                message=f"生成失败: {e}",
                stage=task.stage,
                progress=0,
                data={"error": str(e)},
            )

    def cleanup_task(self, task_id: str) -> None:
        """
        Clean up task files and remove from storage.

        Args:
            task_id: Task identifier to clean up.
        """
        task_dir = self.output_dir / task_id
        if task_dir.exists():
            shutil.rmtree(task_dir)
            logger.info(f"Cleaned up task directory: {task_dir}")

        if task_id in self._tasks:
            del self._tasks[task_id]
