"""
Data models for video processing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from datetime import datetime


class TaskStatus(str, Enum):
    """Video processing task status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStage(str, Enum):
    """Processing stage for progress tracking."""
    UPLOADING = "uploading"
    AUDIO_EXTRACT = "audio_extract"
    WHISPER_TRANSCRIBE = "whisper_transcribe"
    KEYFRAME_EXTRACT = "keyframe_extract"
    VISION_ANALYZE = "vision_analyze"
    CONTENT_MERGE = "content_merge"
    PDF_GENERATE = "pdf_generate"
    COMPLETED = "completed"


@dataclass
class TranscriptSegment:
    """A segment of transcribed audio with timestamps."""
    start: float  # Start time in seconds
    end: float    # End time in seconds
    text: str     # Transcribed text content


@dataclass
class KeyFrame:
    """A keyframe extracted from video."""
    timestamp: float      # Frame time in seconds
    image_path: str       # Path to saved frame image
    frame_index: int      # Original frame index in video
    visual_content: str = ""  # AI-analyzed visual content description


@dataclass
class MergedContent:
    """Merged content combining visual and audio information."""
    timestamp: float
    image_path: str
    visual_content: str   # Content from image analysis
    audio_content: str    # Corresponding audio transcript
    summary: str = ""     # AI-generated summary


@dataclass
class VideoTask:
    """Video processing task information."""
    task_id: str
    video_path: Path
    status: TaskStatus = TaskStatus.PENDING
    stage: ProcessingStage = ProcessingStage.UPLOADING
    progress: int = 0  # 0-100
    error_message: str | None = None
    pdf_path: Path | None = None
    created_at: datetime = field(default_factory=datetime.now)
    
    # Processing results
    transcript_segments: list[TranscriptSegment] = field(default_factory=list)
    keyframes: list[KeyFrame] = field(default_factory=list)
    merged_contents: list[MergedContent] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "stage": self.stage.value,
            "progress": self.progress,
            "error_message": self.error_message,
            "pdf_path": str(self.pdf_path) if self.pdf_path else None,
            "created_at": self.created_at.isoformat(),
        }
