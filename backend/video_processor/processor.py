"""
Main video processor orchestrating all processing steps.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import uuid
from pathlib import Path
from typing import AsyncGenerator, Callable

from .models import (
    VideoTask,
    TaskStatus,
    ProcessingStage,
    TranscriptSegment,
    KeyFrame,
    MergedContent,
)
from .audio import AudioProcessor
from .extractor import KeyFrameExtractor
from .analyzer import ContentAnalyzer
from .merger import ContentMerger
from .pdf_generator import PDFGenerator

logger = logging.getLogger(__name__)


class ProgressEvent:
    """Progress event for streaming updates."""
    
    def __init__(
        self,
        stage: ProcessingStage,
        progress: int,
        message: str = "",
        task_id: str = "",
    ):
        self.stage = stage
        self.progress = progress
        self.message = message
        self.task_id = task_id
    
    def to_dict(self) -> dict:
        return {
            "event": "progress",
            "stage": self.stage.value,
            "progress": self.progress,
            "message": self.message,
            "task_id": self.task_id,
        }


class VideoProcessor:
    """
    Main video processor that orchestrates the entire pipeline.
    
    Pipeline:
    1. Audio extraction (FFmpeg)
    2. Speech-to-text (Whisper)
    3. Keyframe extraction (OpenCV)
    4. Visual analysis (Kimi Vision API)
    5. Content merging (Timeline alignment)
    6. PDF generation (ReportLab)
    """
    
    def __init__(
        self,
        work_dir: str | Path = "/tmp/video_processor",
        whisper_model: str = "base",
        language: str = "zh",
    ):
        """
        Initialize the video processor.
        
        Args:
            work_dir: Working directory for temporary files
            whisper_model: Whisper model size (tiny/base/small/medium/large)
            language: Language code for transcription
        """
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        self.language = language
        
        # Initialize components (lazy loading for heavy ones)
        self._audio_processor: AudioProcessor | None = None
        self._whisper_model = whisper_model
        self._keyframe_extractor = KeyFrameExtractor()
        self._content_analyzer: ContentAnalyzer | None = None
        self._content_merger = ContentMerger()
        self._pdf_generator = PDFGenerator()
        
        # Task storage
        self._tasks: dict[str, VideoTask] = {}
    
    @property
    def audio_processor(self) -> AudioProcessor:
        """Lazy load audio processor."""
        if self._audio_processor is None:
            self._audio_processor = AudioProcessor(model_size=self._whisper_model)
        return self._audio_processor
    
    @property
    def content_analyzer(self) -> ContentAnalyzer:
        """Lazy load content analyzer."""
        if self._content_analyzer is None:
            self._content_analyzer = ContentAnalyzer()
        return self._content_analyzer
    
    def create_task(self, video_path: str | Path) -> VideoTask:
        """
        Create a new video processing task.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            VideoTask object
        """
        task_id = str(uuid.uuid4())[:8]
        task = VideoTask(
            task_id=task_id,
            video_path=Path(video_path),
        )
        self._tasks[task_id] = task
        return task
    
    def get_task(self, task_id: str) -> VideoTask | None:
        """Get task by ID."""
        return self._tasks.get(task_id)
    
    async def process(
        self,
        task: VideoTask,
        title: str = "教学视频笔记",
    ) -> AsyncGenerator[ProgressEvent, None]:
        """
        Process video and generate PDF with progress streaming.
        
        Args:
            task: VideoTask object
            title: Title for the generated PDF
            
        Yields:
            ProgressEvent objects for each stage
        """
        task.status = TaskStatus.PROCESSING
        task_dir = self.work_dir / task.task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        frames_dir = task_dir / "frames"
        frames_dir.mkdir(exist_ok=True)
        
        try:
            # Stage 1: Extract audio
            task.stage = ProcessingStage.AUDIO_EXTRACT
            yield ProgressEvent(
                stage=ProcessingStage.AUDIO_EXTRACT,
                progress=0,
                message="正在提取音频...",
                task_id=task.task_id,
            )
            
            audio_path = task_dir / "audio.wav"
            self.audio_processor.extract_audio(task.video_path, audio_path)
            
            yield ProgressEvent(
                stage=ProcessingStage.AUDIO_EXTRACT,
                progress=100,
                message="音频提取完成",
                task_id=task.task_id,
            )
            
            # Stage 2: Whisper transcription
            task.stage = ProcessingStage.WHISPER_TRANSCRIBE
            yield ProgressEvent(
                stage=ProcessingStage.WHISPER_TRANSCRIBE,
                progress=0,
                message="正在识别语音...",
                task_id=task.task_id,
            )
            
            def whisper_progress(p: int):
                pass  # Progress handled by yield below
            
            # Run transcription in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            task.transcript_segments = await loop.run_in_executor(
                None,
                lambda: self.audio_processor.transcribe(
                    audio_path,
                    self.language,
                    whisper_progress,
                )
            )
            
            yield ProgressEvent(
                stage=ProcessingStage.WHISPER_TRANSCRIBE,
                progress=100,
                message=f"语音识别完成，共 {len(task.transcript_segments)} 段",
                task_id=task.task_id,
            )
            
            # Stage 3: Keyframe extraction
            task.stage = ProcessingStage.KEYFRAME_EXTRACT
            yield ProgressEvent(
                stage=ProcessingStage.KEYFRAME_EXTRACT,
                progress=0,
                message="正在提取关键帧...",
                task_id=task.task_id,
            )
            
            task.keyframes = await loop.run_in_executor(
                None,
                lambda: self._keyframe_extractor.extract(
                    task.video_path,
                    frames_dir,
                )
            )
            
            yield ProgressEvent(
                stage=ProcessingStage.KEYFRAME_EXTRACT,
                progress=100,
                message=f"提取了 {len(task.keyframes)} 个关键帧",
                task_id=task.task_id,
            )
            
            # Stage 4: Visual analysis
            task.stage = ProcessingStage.VISION_ANALYZE
            yield ProgressEvent(
                stage=ProcessingStage.VISION_ANALYZE,
                progress=0,
                message="正在分析画面内容...",
                task_id=task.task_id,
            )
            
            analyzed_count = 0
            total_frames = len(task.keyframes)
            
            async def analyze_progress(p: int):
                nonlocal analyzed_count
                analyzed_count = int(p / 100 * total_frames)
            
            task.keyframes = await self.content_analyzer.analyze_keyframes(
                task.keyframes,
            )
            
            yield ProgressEvent(
                stage=ProcessingStage.VISION_ANALYZE,
                progress=100,
                message="画面分析完成",
                task_id=task.task_id,
            )
            
            # Stage 5: Content merging
            task.stage = ProcessingStage.CONTENT_MERGE
            yield ProgressEvent(
                stage=ProcessingStage.CONTENT_MERGE,
                progress=0,
                message="正在整合内容...",
                task_id=task.task_id,
            )
            
            task.merged_contents = self._content_merger.align_content(
                task.keyframes,
                task.transcript_segments,
            )
            
            # Generate summaries
            task.merged_contents = self._content_merger.generate_summaries(
                task.merged_contents,
            )
            
            yield ProgressEvent(
                stage=ProcessingStage.CONTENT_MERGE,
                progress=100,
                message="内容整合完成",
                task_id=task.task_id,
            )
            
            # Stage 6: PDF generation
            task.stage = ProcessingStage.PDF_GENERATE
            yield ProgressEvent(
                stage=ProcessingStage.PDF_GENERATE,
                progress=0,
                message="正在生成PDF...",
                task_id=task.task_id,
            )
            
            duration = self._keyframe_extractor.get_video_duration(task.video_path)
            pdf_path = task_dir / f"{task.task_id}.pdf"
            
            task.pdf_path = self._pdf_generator.generate(
                task.merged_contents,
                pdf_path,
                title=title,
                duration=duration,
            )
            
            yield ProgressEvent(
                stage=ProcessingStage.PDF_GENERATE,
                progress=100,
                message="PDF生成完成",
                task_id=task.task_id,
            )
            
            # Complete
            task.status = TaskStatus.COMPLETED
            task.stage = ProcessingStage.COMPLETED
            task.progress = 100
            
            yield ProgressEvent(
                stage=ProcessingStage.COMPLETED,
                progress=100,
                message="处理完成",
                task_id=task.task_id,
            )
            
        except Exception as e:
            logger.exception(f"Error processing video: {e}")
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            
            yield ProgressEvent(
                stage=task.stage,
                progress=0,
                message=f"处理失败: {e}",
                task_id=task.task_id,
            )
    
    def cleanup_task(self, task_id: str):
        """Clean up task files."""
        task_dir = self.work_dir / task_id
        if task_dir.exists():
            shutil.rmtree(task_dir)
            logger.info(f"Cleaned up task directory: {task_dir}")
        
        if task_id in self._tasks:
            del self._tasks[task_id]
