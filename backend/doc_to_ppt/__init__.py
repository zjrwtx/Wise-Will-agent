"""
Document to PPT conversion service.

This module provides functionality to convert Word documents, PDFs,
and text files into PowerPoint presentations using AI-powered
outline generation and content filling.

Example:
    >>> from doc_to_ppt import DocToPptService
    >>> service = DocToPptService()
    >>> task = service.create_task("my_document.pdf")
    >>> async for event in service.process(task):
    ...     print(f"{event.event}: {event.message}")
"""

from .service import DocToPptService
from .models import (
    DocTask,
    DocTaskStatus,
    ProcessingStage,
    SlideOutline,
    SlideContent,
)
from .parser import DocumentParser
from .generator import OutlineGenerator
from .ppt_builder import PptBuilder

__all__ = [
    "DocToPptService",
    "DocTask",
    "DocTaskStatus",
    "ProcessingStage",
    "SlideOutline",
    "SlideContent",
    "DocumentParser",
    "OutlineGenerator",
    "PptBuilder",
]
