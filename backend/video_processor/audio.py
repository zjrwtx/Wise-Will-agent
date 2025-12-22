"""
Audio extraction and Whisper transcription.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path
from typing import Callable

import whisper
import ffmpeg

from .models import TranscriptSegment

logger = logging.getLogger(__name__)


def find_ffmpeg() -> str:
    """Find ffmpeg executable path."""
    # Check if ffmpeg is in PATH
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        return ffmpeg_path
    
    # Common installation paths on macOS
    common_paths = [
        "/opt/homebrew/bin/ffmpeg",  # Apple Silicon Homebrew
        "/usr/local/bin/ffmpeg",      # Intel Homebrew
        "/usr/bin/ffmpeg",            # System
    ]
    
    for path in common_paths:
        if Path(path).exists():
            return path
    
    raise RuntimeError(
        "FFmpeg not found. Please install it:\n"
        "  macOS: brew install ffmpeg\n"
        "  Ubuntu: apt install ffmpeg\n"
        "  Windows: choco install ffmpeg"
    )


class AudioProcessor:
    """Process audio from video files using FFmpeg and Whisper."""
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize the audio processor.
        
        Args:
            model_size: Whisper model size. Options:
                - "tiny": Fastest, lowest accuracy (~39MB)
                - "base": Fast, decent accuracy (~74MB)
                - "small": Balanced (~244MB)
                - "medium": Good accuracy (~769MB)
                - "large-v3": Best accuracy (~1.5GB)
        """
        self.model_size = model_size
        self._model: whisper.Whisper | None = None
        self._ffmpeg_path: str | None = None
    
    @property
    def ffmpeg_path(self) -> str:
        """Get ffmpeg executable path."""
        if self._ffmpeg_path is None:
            self._ffmpeg_path = find_ffmpeg()
            logger.info(f"Using FFmpeg at: {self._ffmpeg_path}")
        return self._ffmpeg_path
    
    @property
    def model(self) -> whisper.Whisper:
        """Lazy load Whisper model."""
        if self._model is None:
            logger.info(f"Loading Whisper model: {self.model_size}")
            self._model = whisper.load_model(self.model_size)
            logger.info("Whisper model loaded successfully")
        return self._model
    
    def extract_audio(self, video_path: str | Path, output_path: str | Path) -> Path:
        """
        Extract audio from video file using FFmpeg.
        
        Args:
            video_path: Path to input video file
            output_path: Path for output audio file (WAV format)
            
        Returns:
            Path to extracted audio file
        """
        video_path = Path(video_path)
        output_path = Path(output_path)
        
        logger.info(f"Extracting audio from {video_path}")
        
        # Use subprocess directly with explicit ffmpeg path
        cmd = [
            self.ffmpeg_path,
            "-i", str(video_path),
            "-vn",                    # No video
            "-acodec", "pcm_s16le",   # 16-bit PCM
            "-ar", "16000",           # 16kHz sample rate
            "-ac", "1",               # Mono channel
            "-y",                     # Overwrite output
            str(output_path)
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                check=True,
            )
            logger.info(f"Audio extracted to {output_path}")
            return output_path
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            logger.error(f"FFmpeg error: {error_msg}")
            raise RuntimeError(f"Failed to extract audio: {error_msg}")
    
    def transcribe(
        self,
        audio_path: str | Path,
        language: str = "zh",
        progress_callback: Callable[[int], None] | None = None,
    ) -> list[TranscriptSegment]:
        """
        Transcribe audio using Whisper.
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "zh" for Chinese, "en" for English)
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of transcript segments with timestamps
        """
        audio_path = Path(audio_path)
        logger.info(f"Transcribing audio: {audio_path}")
        
        result = self.model.transcribe(
            str(audio_path),
            language=language,
            word_timestamps=True,
            verbose=False,
        )
        
        segments = []
        total_segments = len(result["segments"])
        
        for i, seg in enumerate(result["segments"]):
            segments.append(TranscriptSegment(
                start=seg["start"],
                end=seg["end"],
                text=seg["text"].strip(),
            ))
            
            if progress_callback and total_segments > 0:
                progress = int((i + 1) / total_segments * 100)
                progress_callback(progress)
        
        logger.info(f"Transcription complete: {len(segments)} segments")
        return segments
    
    def process_video(
        self,
        video_path: str | Path,
        language: str = "zh",
        progress_callback: Callable[[int], None] | None = None,
    ) -> list[TranscriptSegment]:
        """
        Complete audio processing pipeline: extract audio and transcribe.
        
        Args:
            video_path: Path to video file
            language: Language code for transcription
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of transcript segments
        """
        video_path = Path(video_path)
        audio_path = video_path.with_suffix(".wav")
        
        try:
            # Extract audio
            self.extract_audio(video_path, audio_path)
            
            # Transcribe
            segments = self.transcribe(audio_path, language, progress_callback)
            
            return segments
        finally:
            # Clean up temporary audio file
            if audio_path.exists():
                audio_path.unlink()
                logger.info(f"Cleaned up temporary audio file: {audio_path}")
