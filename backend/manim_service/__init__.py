"""
Manim Service Module.

Provides functionality to generate mathematical animation videos
from natural language descriptions using Manim and LLM.

Example:
    >>> from manim_service import ManimService
    >>> service = ManimService()
    >>> async for event in service.generate("解释勾股定理"):
    ...     print(event)
"""

from .service import ManimService, ManimTask, ManimTaskStatus
from .generator import ManimCodeGenerator
from .executor import ManimExecutor
from .templates import MANIM_TEMPLATES

__all__ = [
    "ManimService",
    "ManimTask",
    "ManimTaskStatus",
    "ManimCodeGenerator",
    "ManimExecutor",
    "MANIM_TEMPLATES",
]
