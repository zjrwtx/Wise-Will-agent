"""
Manim Code Executor.

Safely executes Manim code and generates video files.

Example:
    >>> executor = ManimExecutor()
    >>> video_path = await executor.execute(manim_code)
    >>> print(video_path)
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path
from typing import AsyncIterator, NamedTuple

logger = logging.getLogger(__name__)


class ExecutionEvent(NamedTuple):
    """
    Event emitted during Manim execution.
    
    Attributes:
        event: Event type (progress, output, error, done)
        message: Human-readable message
        data: Additional event data
    """
    event: str
    message: str
    data: dict | None = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "event": self.event,
            "message": self.message,
            "data": self.data or {},
        }


class ManimExecutor:
    """
    Execute Manim code to generate video files.
    
    Attributes:
        output_dir: Directory to store generated videos
        quality: Video quality preset (l/m/h/p for low/medium/high/4k)
        
    Example:
        >>> executor = ManimExecutor(output_dir=Path("./videos"))
        >>> video_path = await executor.execute(code, task_id="abc123")
    """
    
    def __init__(
        self,
        output_dir: Path | None = None,
        quality: str = "l",
    ):
        """
        Initialize the executor.
        
        Args:
            output_dir: Directory for output videos. Defaults to temp dir.
            quality: Video quality (l=480p15, m=720p30, h=1080p60, p=4k60)
                     Default is 'l' for faster rendering.
        """
        self.output_dir = output_dir or Path(
            tempfile.gettempdir()
        ) / "manim_videos"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.quality = quality
        
    def _get_quality_flag(self) -> str:
        """Get manim quality flag."""
        quality_map = {
            "l": "-ql",   # 480p15
            "m": "-qm",   # 720p30
            "h": "-qh",   # 1080p60
            "p": "-qp",   # 4k60
        }
        return quality_map.get(self.quality, "-qm")
    
    async def check_manim_installed(self) -> bool:
        """
        Check if Manim is installed and accessible.
        
        Returns:
            True if manim command is available
        """
        try:
            proc = await asyncio.create_subprocess_exec(
                "manim", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
            return proc.returncode == 0
        except FileNotFoundError:
            return False
            
    async def execute(
        self,
        code: str,
        task_id: str,
    ) -> AsyncIterator[ExecutionEvent]:
        """
        Execute Manim code and generate video.
        
        Args:
            code: Valid Manim Python code
            task_id: Unique task identifier
            
        Yields:
            ExecutionEvent objects for progress tracking
            
        Example:
            >>> async for event in executor.execute(code, "task123"):
            ...     if event.event == "done":
            ...         print(f"Video: {event.data['video_path']}")
        """
        # Check manim installation
        if not await self.check_manim_installed():
            yield ExecutionEvent(
                event="error",
                message="Manim is not installed. Run: pip install manim",
            )
            return
            
        # Create task directory
        task_dir = self.output_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        
        scene_file = task_dir / "scene.py"
        
        try:
            yield ExecutionEvent(
                event="progress",
                message="正在准备渲染环境...",
                data={"stage": "preparing", "progress": 10},
            )
            
            # Write code to file
            scene_file.write_text(code, encoding="utf-8")
            logger.info(f"Wrote scene file: {scene_file}")
            
            yield ExecutionEvent(
                event="progress",
                message="正在渲染动画...",
                data={"stage": "rendering", "progress": 30},
            )
            
            # Run manim
            quality_flag = self._get_quality_flag()
            cmd = [
                "manim",
                quality_flag,
                "--disable_caching",
                "-o", f"{task_id}",
                "scene.py",  # Use relative path since cwd is task_dir
                "MainScene",
            ]
            
            logger.info(f"Running: {' '.join(cmd)} in {task_dir}")
            
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(task_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            # Track animation progress
            animation_count = 0
            estimated_animations = 10  # Default estimate
            
            # Stream output with progress parsing
            async def read_stream(stream, is_stderr=False):
                nonlocal animation_count, estimated_animations
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    text = line.decode("utf-8", errors="ignore").strip()
                    if text:
                        logger.info(f"Manim: {text}")
                        
                        # Parse animation progress from output
                        # Format: "Animation X : Partial movie file..."
                        if "Animation" in text and "Partial" in text:
                            try:
                                # Extract animation number
                                parts = text.split()
                                for i, p in enumerate(parts):
                                    if p == "Animation" and i + 1 < len(parts):
                                        num = int(parts[i + 1])
                                        animation_count = max(animation_count, num + 1)
                                        # Calculate progress (30-80 range)
                                        anim_progress = 30 + int(
                                            (animation_count / estimated_animations) * 50
                                        )
                                        anim_progress = min(anim_progress, 75)
                                        yield ExecutionEvent(
                                            event="progress",
                                            message=f"正在渲染动画 {animation_count}...",
                                            data={
                                                "stage": "rendering",
                                                "progress": anim_progress,
                                            },
                                        )
                                        break
                            except (ValueError, IndexError):
                                pass
                        
                        # Check for total animation count
                        if "Played" in text and "animations" in text:
                            try:
                                parts = text.split()
                                for i, p in enumerate(parts):
                                    if p == "Played" and i + 1 < len(parts):
                                        estimated_animations = int(parts[i + 1])
                                        break
                            except (ValueError, IndexError):
                                pass
                        
                        yield ExecutionEvent(
                            event="output",
                            message=text,
                            data={"stderr": is_stderr},
                        )
                        
            # Read both streams
            stderr_output = []
            async for event in read_stream(proc.stdout):
                yield event
            async for event in read_stream(proc.stderr, True):
                stderr_output.append(event.message)
                yield event
                
            # Wait for completion
            await proc.wait()
            
            yield ExecutionEvent(
                event="progress",
                message="正在处理输出文件...",
                data={"stage": "finalizing", "progress": 80},
            )
            
            if proc.returncode != 0:
                error_msg = "\n".join(stderr_output[-5:])
                yield ExecutionEvent(
                    event="error",
                    message=f"Manim渲染失败: {error_msg}",
                    data={"returncode": proc.returncode},
                )
                return
                
            # Find output video
            video_path = await self._find_video(task_dir, task_id)
            
            if not video_path:
                yield ExecutionEvent(
                    event="error",
                    message="未找到生成的视频文件",
                )
                return
                
            # Move to final location
            final_path = task_dir / f"{task_id}.mp4"
            if video_path != final_path:
                shutil.move(str(video_path), str(final_path))
                
            logger.info(f"Video generated: {final_path}")
            
            yield ExecutionEvent(
                event="done",
                message="视频生成完成",
                data={
                    "video_path": str(final_path),
                    "task_id": task_id,
                    "progress": 100,
                },
            )
            
        except Exception as e:
            logger.exception(f"Execution error: {e}")
            yield ExecutionEvent(
                event="error",
                message=f"执行错误: {str(e)}",
            )
            
    async def _find_video(
        self,
        task_dir: Path,
        task_id: str,
    ) -> Path | None:
        """
        Find the generated video file.
        
        Args:
            task_dir: Task working directory
            task_id: Task identifier
            
        Returns:
            Path to video file or None if not found
        """
        # Check common output locations
        search_patterns = [
            task_dir / "media" / "videos" / "**" / "*.mp4",
            task_dir / "**" / f"{task_id}.mp4",
            task_dir / "**" / "MainScene.mp4",
        ]
        
        for pattern in search_patterns:
            matches = list(task_dir.glob(
                str(pattern).replace(str(task_dir) + "/", "")
            ))
            if matches:
                # Return the most recent file
                return max(matches, key=lambda p: p.stat().st_mtime)
                
        # Fallback: find any mp4
        mp4_files = list(task_dir.rglob("*.mp4"))
        if mp4_files:
            return max(mp4_files, key=lambda p: p.stat().st_mtime)
            
        return None
    
    def get_video_path(self, task_id: str) -> Path | None:
        """
        Get the video path for a completed task.
        
        Args:
            task_id: Task identifier
            
        Returns:
            Path to video file or None
        """
        # First check the expected final location
        video_path = self.output_dir / task_id / f"{task_id}.mp4"
        if video_path.exists():
            return video_path
        
        # Fallback: search for any mp4 in task directory
        task_dir = self.output_dir / task_id
        if task_dir.exists():
            mp4_files = list(task_dir.rglob("*.mp4"))
            # Filter out partial_movie_files
            mp4_files = [
                f for f in mp4_files
                if "partial_movie_files" not in str(f)
            ]
            if mp4_files:
                return max(mp4_files, key=lambda p: p.stat().st_mtime)
        
        return None
    
    def cleanup_task(self, task_id: str) -> None:
        """
        Clean up task files.
        
        Args:
            task_id: Task identifier
        """
        task_dir = self.output_dir / task_id
        if task_dir.exists():
            shutil.rmtree(task_dir)
            logger.info(f"Cleaned up task: {task_id}")
