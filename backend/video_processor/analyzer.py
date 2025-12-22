"""
AI-powered content analysis for keyframes using Kimi Vision API.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from pathlib import Path
from typing import Callable

from openai import AsyncOpenAI

from .models import KeyFrame

logger = logging.getLogger(__name__)


class ContentAnalyzer:
    """Analyze keyframe content using Kimi Vision API."""
    
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://api.moonshot.cn/v1",
        model: str = "moonshot-v1-8k-vision-preview",
        max_concurrent: int = 3,
    ):
        """
        Initialize the content analyzer.
        
        Args:
            api_key: Kimi API key (defaults to MOONSHOT_API_KEY env var)
            base_url: API base URL
            model: Vision model to use
            max_concurrent: Maximum concurrent API calls
        """
        self.api_key = api_key or os.getenv("MOONSHOT_API_KEY")
        if not self.api_key:
            raise ValueError("MOONSHOT_API_KEY environment variable is required")
        
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=base_url,
        )
        self.model = model
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
    
    async def analyze_keyframe(self, keyframe: KeyFrame) -> str:
        """
        Analyze a single keyframe image.
        
        Args:
            keyframe: KeyFrame object with image path
            
        Returns:
            Description of the visual content
        """
        async with self._semaphore:
            image_path = Path(keyframe.image_path)
            
            if not image_path.exists():
                logger.warning(f"Image not found: {image_path}")
                return ""
            
            # Read and encode image
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
            
            # Determine image type
            suffix = image_path.suffix.lower()
            media_type = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
            }.get(suffix, "image/jpeg")
            
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "你是一个教育内容分析专家。请分析图片中的教学内容，"
                                "提取关键信息、文字、图表、公式等。"
                                "用简洁的中文描述图片的主要内容和知识点。"
                                "如果图片中有文字，请完整提取出来。"
                            ),
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{media_type};base64,{image_data}"
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": "请分析这张教学视频截图的内容，提取关键知识点和文字信息。",
                                },
                            ],
                        },
                    ],
                    max_tokens=1000,
                )
                
                content = response.choices[0].message.content or ""
                logger.debug(f"Analyzed frame at {keyframe.timestamp:.2f}s")
                return content
                
            except Exception as e:
                logger.error(f"Failed to analyze keyframe: {e}")
                return ""
    
    async def analyze_keyframes(
        self,
        keyframes: list[KeyFrame],
        progress_callback: Callable[[int], None] | None = None,
    ) -> list[KeyFrame]:
        """
        Analyze multiple keyframes concurrently.
        
        Args:
            keyframes: List of KeyFrame objects
            progress_callback: Optional callback for progress updates
            
        Returns:
            Updated KeyFrame objects with visual_content filled
        """
        logger.info(f"Analyzing {len(keyframes)} keyframes")
        
        total = len(keyframes)
        completed = 0
        
        async def analyze_with_progress(kf: KeyFrame) -> KeyFrame:
            nonlocal completed
            content = await self.analyze_keyframe(kf)
            kf.visual_content = content
            completed += 1
            
            if progress_callback:
                progress = int(completed / total * 100)
                progress_callback(progress)
            
            return kf
        
        # Process concurrently with semaphore limiting
        tasks = [analyze_with_progress(kf) for kf in keyframes]
        results = await asyncio.gather(*tasks)
        
        logger.info(f"Completed analysis of {len(results)} keyframes")
        return list(results)
