"""
Keyframe extraction from video using OpenCV.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable

import cv2
import numpy as np

from .models import KeyFrame

logger = logging.getLogger(__name__)


class KeyFrameExtractor:
    """Extract keyframes from video based on scene changes."""
    
    def __init__(
        self,
        threshold: float = 30.0,
        min_interval: float = 2.0,
        max_frames: int = 50,
    ):
        """
        Initialize the keyframe extractor.
        
        Args:
            threshold: Histogram difference threshold for scene change detection.
                       Higher values = fewer keyframes.
            min_interval: Minimum interval between keyframes in seconds.
            max_frames: Maximum number of keyframes to extract.
        """
        self.threshold = threshold
        self.min_interval = min_interval
        self.max_frames = max_frames
    
    def extract(
        self,
        video_path: str | Path,
        output_dir: str | Path,
        progress_callback: Callable[[int], None] | None = None,
    ) -> list[KeyFrame]:
        """
        Extract keyframes from video.
        
        Args:
            video_path: Path to input video file
            output_dir: Directory to save extracted frames
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of KeyFrame objects
        """
        video_path = Path(video_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Extracting keyframes from {video_path}")
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        min_frame_interval = int(fps * self.min_interval)
        
        logger.info(f"Video info: {total_frames} frames, {fps:.2f} FPS")
        
        keyframes: list[KeyFrame] = []
        prev_hist = None
        last_keyframe_idx = -min_frame_interval  # Allow first frame
        frame_idx = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Update progress
                if progress_callback and total_frames > 0:
                    progress = int(frame_idx / total_frames * 100)
                    progress_callback(progress)
                
                # Calculate histogram
                hist = self._calculate_histogram(frame)
                
                # Check for scene change
                is_keyframe = False
                if prev_hist is None:
                    is_keyframe = True  # First frame
                elif frame_idx - last_keyframe_idx >= min_frame_interval:
                    diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CHISQR)
                    if diff > self.threshold:
                        is_keyframe = True
                
                if is_keyframe and len(keyframes) < self.max_frames:
                    timestamp = frame_idx / fps
                    image_path = output_dir / f"frame_{frame_idx:06d}.jpg"
                    
                    # Save frame
                    cv2.imwrite(str(image_path), frame)
                    
                    keyframes.append(KeyFrame(
                        timestamp=timestamp,
                        image_path=str(image_path),
                        frame_index=frame_idx,
                    ))
                    
                    last_keyframe_idx = frame_idx
                    logger.debug(f"Keyframe extracted at {timestamp:.2f}s")
                
                prev_hist = hist
                frame_idx += 1
        finally:
            cap.release()
        
        logger.info(f"Extracted {len(keyframes)} keyframes")
        
        # If too few keyframes, extract at regular intervals
        if len(keyframes) < 5 and total_frames > 0:
            logger.info("Too few keyframes detected, extracting at regular intervals")
            keyframes = self._extract_regular_intervals(
                video_path, output_dir, total_frames, fps
            )
        
        return keyframes
    
    def _calculate_histogram(self, frame: np.ndarray) -> np.ndarray:
        """Calculate color histogram for a frame."""
        hist = cv2.calcHist(
            [frame],
            [0, 1, 2],
            None,
            [8, 8, 8],
            [0, 256, 0, 256, 0, 256]
        )
        hist = cv2.normalize(hist, hist).flatten()
        return hist
    
    def _extract_regular_intervals(
        self,
        video_path: Path,
        output_dir: Path,
        total_frames: int,
        fps: float,
        target_count: int = 10,
    ) -> list[KeyFrame]:
        """Extract frames at regular intervals as fallback."""
        cap = cv2.VideoCapture(str(video_path))
        keyframes: list[KeyFrame] = []
        
        interval = total_frames // target_count
        
        try:
            for i in range(target_count):
                frame_idx = i * interval
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if ret:
                    timestamp = frame_idx / fps
                    image_path = output_dir / f"frame_{frame_idx:06d}.jpg"
                    cv2.imwrite(str(image_path), frame)
                    
                    keyframes.append(KeyFrame(
                        timestamp=timestamp,
                        image_path=str(image_path),
                        frame_index=frame_idx,
                    ))
        finally:
            cap.release()
        
        return keyframes
    
    def get_video_duration(self, video_path: str | Path) -> float:
        """Get video duration in seconds."""
        cap = cv2.VideoCapture(str(video_path))
        try:
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            return total_frames / fps if fps > 0 else 0
        finally:
            cap.release()
