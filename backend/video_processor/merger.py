"""
Content merger for aligning visual and audio content on timeline.
"""

from __future__ import annotations

import logging
import os
from typing import Callable

from openai import OpenAI

from .models import KeyFrame, TranscriptSegment, MergedContent

logger = logging.getLogger(__name__)


class ContentMerger:
    """Merge visual and audio content based on timestamps."""
    
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://api.moonshot.cn/v1",
        model: str = "moonshot-v1-8k",
    ):
        """
        Initialize the content merger.
        
        Args:
            api_key: Kimi API key (defaults to MOONSHOT_API_KEY env var)
            base_url: API base URL
            model: Model to use for content summarization
        """
        self.api_key = api_key or os.getenv("MOONSHOT_API_KEY")
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=base_url,
        ) if self.api_key else None
        self.model = model
    
    def align_content(
        self,
        keyframes: list[KeyFrame],
        transcripts: list[TranscriptSegment],
    ) -> list[MergedContent]:
        """
        Align keyframes with transcript segments based on timestamps.
        
        Args:
            keyframes: List of keyframes with timestamps
            transcripts: List of transcript segments with timestamps
            
        Returns:
            List of merged content objects
        """
        if not keyframes:
            return []
        
        logger.info(f"Aligning {len(keyframes)} keyframes with {len(transcripts)} transcript segments")
        
        merged: list[MergedContent] = []
        
        for i, frame in enumerate(keyframes):
            # Determine time range for this keyframe
            start_time = frame.timestamp
            if i + 1 < len(keyframes):
                end_time = keyframes[i + 1].timestamp
            else:
                # Last frame: extend to end of video or last transcript
                end_time = transcripts[-1].end if transcripts else start_time + 60
            
            # Collect transcript segments in this time range
            audio_texts = []
            for seg in transcripts:
                # Include segment if it overlaps with the time range
                if seg.end > start_time and seg.start < end_time:
                    audio_texts.append(seg.text)
            
            merged.append(MergedContent(
                timestamp=frame.timestamp,
                image_path=frame.image_path,
                visual_content=frame.visual_content,
                audio_content=" ".join(audio_texts),
            ))
        
        logger.info(f"Created {len(merged)} merged content items")
        return merged
    
    def generate_summaries(
        self,
        merged_contents: list[MergedContent],
        progress_callback: Callable[[int], None] | None = None,
    ) -> list[MergedContent]:
        """
        Generate AI summaries for merged content.
        
        Args:
            merged_contents: List of merged content objects
            progress_callback: Optional callback for progress updates
            
        Returns:
            Updated merged content with summaries
        """
        if not self.client:
            logger.warning("No API key configured, skipping summary generation")
            return merged_contents
        
        logger.info(f"Generating summaries for {len(merged_contents)} items")
        
        for i, content in enumerate(merged_contents):
            if content.visual_content or content.audio_content:
                content.summary = self._generate_summary(content)
            
            if progress_callback:
                progress = int((i + 1) / len(merged_contents) * 100)
                progress_callback(progress)
        
        return merged_contents
    
    def _generate_summary(self, content: MergedContent) -> str:
        """Generate summary for a single merged content item."""
        if not self.client:
            return ""
        
        prompt = f"""请根据以下教学视频片段的内容，生成一个简洁的知识点总结（50-100字）：

画面内容：
{content.visual_content or '(无)'}

讲解内容：
{content.audio_content or '(无)'}

请提取核心知识点，用简洁的语言总结。"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个教育内容总结专家，擅长提炼知识点。"},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=200,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return ""
    
    def generate_document_outline(
        self,
        merged_contents: list[MergedContent],
        video_title: str = "教学视频",
    ) -> dict:
        """
        Generate document outline and metadata.
        
        Args:
            merged_contents: List of merged content
            video_title: Title of the video
            
        Returns:
            Document metadata dictionary
        """
        # Calculate total duration
        if merged_contents:
            duration = merged_contents[-1].timestamp
        else:
            duration = 0
        
        # Generate chapter titles based on content
        chapters = []
        for i, content in enumerate(merged_contents):
            chapter_title = f"第{i + 1}节"
            if content.summary:
                # Extract first sentence as title
                first_sentence = content.summary.split("。")[0]
                if len(first_sentence) <= 20:
                    chapter_title = first_sentence
            chapters.append({
                "index": i + 1,
                "title": chapter_title,
                "timestamp": content.timestamp,
            })
        
        return {
            "title": video_title,
            "duration": duration,
            "total_sections": len(merged_contents),
            "chapters": chapters,
        }
