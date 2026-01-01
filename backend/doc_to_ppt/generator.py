"""
AI-powered PPT generator using Kimi CLI.

This module uses Kimi CLI to generate presentation outlines
and fill slide content based on user requirements and reference materials.

Example:
    >>> generator = PptGenerator()
    >>> async for event in generator.generate(
    ...     prompt="Make a Python training PPT",
    ...     reference_text="Python basics...",
    ... ):
    ...     print(f"{event.event}: {event.message}")
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import AsyncGenerator, Optional

from .models import (
    SlideOutline,
    SlideContent,
    ProgressEvent,
    ProcessingStage,
)

logger = logging.getLogger(__name__)


# Prompt template for outline generation
OUTLINE_PROMPT_TEMPLATE = """请根据以下要求生成PPT大纲。

## 用户需求
{user_prompt}

## 参考材料
{reference_text}

## 输出要求
请生成一个结构清晰的PPT大纲，返回JSON格式：
```json
{{
    "title": "演示文稿标题",
    "slides": [
        {{
            "index": 0,
            "title": "幻灯片标题",
            "layout": "title|content|bullets|two_column|summary",
            "key_points": ["要点1", "要点2"],
            "notes": "备注说明"
        }}
    ]
}}
```

布局类型说明：
- title: 标题页（第一张必须是这个）
- content: 内容页（带标题和段落）
- bullets: 要点列表（3-5个要点）
- two_column: 双栏对比
- summary: 总结页（最后一张）

要求：
1. 第一张必须是标题页
2. 根据内容复杂度安排5-15张幻灯片
3. 最后一张应该是总结
4. 每张幻灯片有明确主题和2-4个要点
"""

# Prompt template for slide content generation
CONTENT_PROMPT_TEMPLATE = """请为以下幻灯片生成详细内容。

## 幻灯片信息
- 序号: {index}
- 标题: {title}
- 布局: {layout}
- 要点: {key_points}

## 参考材料
{reference_text}

## 输出要求
根据布局类型返回JSON格式：
```json
{{
    "title": "幻灯片标题",
    "content": "主要内容（content布局使用）",
    "bullet_points": ["要点1", "要点2", "要点3"],
    "left_content": "左栏内容（two_column布局使用）",
    "right_content": "右栏内容（two_column布局使用）",
    "notes": "演讲者备注"
}}
```

要求：
1. 内容简洁有力，适合PPT展示
2. 每个要点不超过2行
3. 使用专业但易懂的语言
"""


class PptGenerator:
    """
    AI-powered PPT generator using Kimi CLI.

    This class uses Kimi CLI to generate presentation outlines
    and fill content for each slide based on user requirements.

    Attributes:
        work_dir: Working directory for Kimi CLI.
        style: Default presentation style.

    Example:
        >>> generator = PptGenerator()
        >>> outline = await generator.generate_outline(
        ...     "Make a Python training PPT",
        ...     "Python is a programming language..."
        ... )
        >>> print(f"Generated {len(outline)} slides")
    """

    def __init__(
        self,
        work_dir: Path | None = None,
        style: str = "professional",
    ):
        """
        Initialize the PPT generator.

        Args:
            work_dir: Working directory for Kimi CLI.
            style: Default presentation style.

        Example:
            >>> generator = PptGenerator(style="academic")
        """
        self.work_dir = work_dir or Path.cwd()
        self.style = style

    async def generate_outline(
        self,
        user_prompt: str,
        reference_text: str = "",
        style: str = "",
        max_slides: int = 15,
    ) -> tuple[str, list[SlideOutline]]:
        """
        Generate presentation outline using Kimi CLI.

        Args:
            user_prompt: User's requirements for the PPT.
            reference_text: Reference material text.
            style: Presentation style (professional, academic, creative).
            max_slides: Maximum number of slides.

        Returns:
            Tuple of (title, list of SlideOutline objects).

        Example:
            >>> generator = PptGenerator()
            >>> title, outline = await generator.generate_outline(
            ...     "Python入门培训PPT，要求简洁专业",
            ...     "Python是一种编程语言..."
            ... )
            >>> print(f"Title: {title}, Slides: {len(outline)}")
        """
        from kimi_runner import KimiRunner

        logger.info(f"Generating outline for: {user_prompt[:50]}...")

        # Prepare the prompt
        style_hint = f"\n风格要求: {style or self.style}"
        slides_hint = f"\n幻灯片数量: 5-{max_slides}张"

        full_prompt = OUTLINE_PROMPT_TEMPLATE.format(
            user_prompt=user_prompt + style_hint + slides_hint,
            reference_text=reference_text[:8000] if reference_text else "无",
        )

        # Run Kimi CLI
        runner = KimiRunner(
            work_dir=self.work_dir,
            yolo=True,
            thinking=False,
        )

        response_text = ""
        async for event in runner.run(full_prompt):
            if event.type == "text":
                response_text += event.data.get("text", "")
            elif event.type == "error":
                raise Exception(event.data.get("message", "Kimi CLI error"))

        # Parse JSON from response
        title, outlines = self._parse_outline_response(response_text)

        logger.info(f"Generated {len(outlines)} slide outlines")
        return title, outlines

    async def fill_slide_content(
        self,
        outline: SlideOutline,
        reference_text: str = "",
        context: str = "",
    ) -> SlideContent:
        """
        Fill content for a single slide using Kimi CLI.

        Args:
            outline: Slide outline to fill.
            reference_text: Reference material text.
            context: Context from previous slides.

        Returns:
            SlideContent with filled content.

        Example:
            >>> generator = PptGenerator()
            >>> slide = await generator.fill_slide_content(outline, ref_text)
            >>> print(slide.bullet_points)
        """
        from kimi_runner import KimiRunner

        logger.info(f"Filling content for slide {outline.index}: {outline.title}")

        # Prepare the prompt
        full_prompt = CONTENT_PROMPT_TEMPLATE.format(
            index=outline.index + 1,
            title=outline.title,
            layout=outline.layout,
            key_points=", ".join(outline.key_points),
            reference_text=reference_text[:4000] if reference_text else "无",
        )

        if context:
            full_prompt += f"\n\n上下文: {context}"

        # Run Kimi CLI
        runner = KimiRunner(
            work_dir=self.work_dir,
            yolo=True,
            thinking=False,
        )

        response_text = ""
        async for event in runner.run(full_prompt):
            if event.type == "text":
                response_text += event.data.get("text", "")
            elif event.type == "error":
                logger.warning(f"Kimi CLI error: {event.data.get('message')}")

        # Parse JSON from response
        slide_content = self._parse_content_response(response_text, outline)

        return slide_content

    async def generate_all_content(
        self,
        user_prompt: str,
        reference_text: str = "",
        style: str = "",
    ) -> AsyncGenerator[ProgressEvent, None]:
        """
        Generate complete PPT content with streaming progress.

        Args:
            user_prompt: User's requirements for the PPT.
            reference_text: Reference material text.
            style: Presentation style.

        Yields:
            ProgressEvent objects for each step.

        Example:
            >>> generator = PptGenerator()
            >>> async for event in generator.generate_all_content(
            ...     "Python培训PPT", "Python是..."
            ... ):
            ...     print(f"{event.event}: {event.message}")
        """
        # Stage 1: Generate outline
        yield ProgressEvent(
            event="progress",
            message="正在生成PPT大纲...",
            stage=ProcessingStage.GENERATE_OUTLINE,
            progress=10,
        )

        title, outlines = await self.generate_outline(
            user_prompt, reference_text, style
        )

        yield ProgressEvent(
            event="outline",
            message=f"大纲生成完成，共 {len(outlines)} 张幻灯片",
            stage=ProcessingStage.GENERATE_OUTLINE,
            progress=25,
            data={
                "title": title,
                "outline": [
                    {
                        "index": o.index,
                        "title": o.title,
                        "layout": o.layout,
                        "key_points": o.key_points,
                    }
                    for o in outlines
                ],
            },
        )

        # Stage 2: Fill content for each slide
        slides = []
        context = ""

        for i, outline in enumerate(outlines):
            progress = 25 + int((i + 1) / len(outlines) * 60)

            yield ProgressEvent(
                event="progress",
                message=f"正在生成第 {i + 1}/{len(outlines)} 张幻灯片: "
                        f"{outline.title}",
                stage=ProcessingStage.FILL_SLIDES,
                progress=progress,
            )

            slide = await self.fill_slide_content(
                outline, reference_text, context
            )
            slides.append(slide)

            # Update context for next slide
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

        yield ProgressEvent(
            event="content_complete",
            message="所有幻灯片内容生成完成",
            stage=ProcessingStage.FILL_SLIDES,
            progress=85,
            data={
                "title": title,
                "slides": slides,
                "slides_count": len(slides),
            },
        )

    def _parse_outline_response(
        self, response: str
    ) -> tuple[str, list[SlideOutline]]:
        """
        Parse outline JSON from Kimi CLI response.

        Args:
            response: Raw response text from Kimi CLI.

        Returns:
            Tuple of (title, list of SlideOutline).
        """
        # Try to extract JSON from response
        json_match = re.search(
            r'```json\s*(.*?)\s*```',
            response,
            re.DOTALL
        )

        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON
            json_match = re.search(r'\{.*"slides".*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                logger.warning("No JSON found in response, using default")
                return "演示文稿", self._create_default_outline()

        try:
            data = json.loads(json_str)
            title = data.get("title", "演示文稿")

            outlines = []
            for slide_data in data.get("slides", []):
                outline = SlideOutline(
                    index=slide_data.get("index", len(outlines)),
                    title=slide_data.get("title", f"幻灯片 {len(outlines) + 1}"),
                    layout=slide_data.get("layout", "content"),
                    key_points=slide_data.get("key_points", []),
                    notes=slide_data.get("notes", ""),
                )
                outlines.append(outline)

            return title, outlines

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON: {e}")
            return "演示文稿", self._create_default_outline()

    def _parse_content_response(
        self,
        response: str,
        outline: SlideOutline,
    ) -> SlideContent:
        """
        Parse slide content JSON from Kimi CLI response.

        Args:
            response: Raw response text from Kimi CLI.
            outline: Original slide outline.

        Returns:
            SlideContent object.
        """
        # Try to extract JSON from response
        json_match = re.search(
            r'```json\s*(.*?)\s*```',
            response,
            re.DOTALL
        )

        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON
            json_match = re.search(r'\{.*"title".*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                # Return basic content from outline
                return SlideContent(
                    index=outline.index,
                    title=outline.title,
                    layout=outline.layout,
                    bullet_points=outline.key_points,
                    notes=outline.notes,
                )

        try:
            data = json.loads(json_str)

            return SlideContent(
                index=outline.index,
                title=data.get("title", outline.title),
                layout=outline.layout,
                content=data.get("content", ""),
                bullet_points=data.get("bullet_points", outline.key_points),
                left_content=data.get("left_content", ""),
                right_content=data.get("right_content", ""),
                notes=data.get("notes", outline.notes),
            )

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse content JSON: {e}")
            return SlideContent(
                index=outline.index,
                title=outline.title,
                layout=outline.layout,
                bullet_points=outline.key_points,
                notes=outline.notes,
            )

    def _create_default_outline(self) -> list[SlideOutline]:
        """Create a default outline when parsing fails."""
        return [
            SlideOutline(
                index=0,
                title="标题",
                layout="title",
                key_points=["副标题"],
                notes="",
            ),
            SlideOutline(
                index=1,
                title="目录",
                layout="bullets",
                key_points=["第一部分", "第二部分", "第三部分"],
                notes="",
            ),
            SlideOutline(
                index=2,
                title="总结",
                layout="summary",
                key_points=["要点回顾"],
                notes="",
            ),
        ]


# Keep backward compatibility with old name
OutlineGenerator = PptGenerator
