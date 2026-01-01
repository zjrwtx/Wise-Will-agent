"""
Data models for document to PPT conversion.

This module defines the data structures used throughout the
document-to-PPT conversion pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class DocTaskStatus(Enum):
    """Status of a document processing task.

    Attributes:
        PENDING: Task created but not started.
        PARSING: Parsing the input document.
        GENERATING_OUTLINE: AI is generating the presentation outline.
        FILLING_CONTENT: AI is filling content for each slide.
        BUILDING_PPT: Building the final PowerPoint file.
        COMPLETED: Task completed successfully.
        FAILED: Task failed with an error.
    """

    PENDING = "pending"
    PARSING = "parsing"
    GENERATING_OUTLINE = "generating_outline"
    FILLING_CONTENT = "filling_content"
    BUILDING_PPT = "building_ppt"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStage(Enum):
    """Processing stages for progress tracking.

    Attributes:
        PARSE_DOCUMENT: Parsing the input document.
        GENERATE_OUTLINE: Generating presentation outline.
        FILL_SLIDES: Filling content for slides.
        BUILD_PPT: Building the PowerPoint file.
        COMPLETED: All stages completed.
    """

    PARSE_DOCUMENT = "parse_document"
    GENERATE_OUTLINE = "generate_outline"
    FILL_SLIDES = "fill_slides"
    BUILD_PPT = "build_ppt"
    COMPLETED = "completed"


@dataclass
class SlideOutline:
    """Outline for a single slide.

    Attributes:
        index: Slide index (0-based).
        title: Slide title.
        layout: Slide layout type (title, content, two_column, etc.).
        key_points: List of key points to cover.
        notes: Speaker notes or additional context.

    Example:
        >>> outline = SlideOutline(
        ...     index=0,
        ...     title="Introduction",
        ...     layout="title",
        ...     key_points=["Welcome", "Overview"],
        ... )
    """

    index: int
    title: str
    layout: str = "content"  # title, content, two_column, image, bullets
    key_points: list[str] = field(default_factory=list)
    notes: str = ""


@dataclass
class SlideContent:
    """Full content for a single slide.

    Attributes:
        index: Slide index (0-based).
        title: Slide title.
        layout: Slide layout type.
        content: Main content text or HTML.
        bullet_points: List of bullet points.
        left_content: Content for left column (two_column layout).
        right_content: Content for right column (two_column layout).
        image_description: Description for image generation.
        notes: Speaker notes.

    Example:
        >>> content = SlideContent(
        ...     index=1,
        ...     title="Key Features",
        ...     layout="bullets",
        ...     bullet_points=["Feature 1", "Feature 2", "Feature 3"],
        ... )
    """

    index: int
    title: str
    layout: str = "content"
    content: str = ""
    bullet_points: list[str] = field(default_factory=list)
    left_content: str = ""
    right_content: str = ""
    image_description: str = ""
    notes: str = ""


@dataclass
class DocumentContent:
    """Parsed content from a document.

    Attributes:
        text: Full text content.
        title: Document title if detected.
        sections: List of section titles and content.
        metadata: Additional metadata (author, date, etc.).

    Example:
        >>> doc = DocumentContent(
        ...     text="Full document text...",
        ...     title="My Document",
        ...     sections=[("Introduction", "Intro text...")],
        ... )
    """

    text: str
    title: str = ""
    sections: list[tuple[str, str]] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class DocTask:
    """A PPT generation task.

    Attributes:
        task_id: Unique task identifier.
        user_prompt: User's requirements for the PPT.
        document_path: Path to reference document (optional).
        status: Current task status.
        stage: Current processing stage.
        progress: Overall progress (0-100).
        document_content: Parsed document content (if reference provided).
        outline: List of slide outlines.
        slides: List of filled slide contents.
        ppt_path: Path to the generated PPT file.
        error_message: Error message if failed.
        title: Presentation title.
        style: Presentation style/theme.

    Example:
        >>> task = DocTask(
        ...     task_id="abc123",
        ...     user_prompt="Make a Python training PPT",
        ... )
        >>> task.status
        <DocTaskStatus.PENDING: 'pending'>
    """

    task_id: str
    user_prompt: str = ""  # User's requirements for the PPT
    document_path: Optional[Path] = None  # Optional reference material
    status: DocTaskStatus = DocTaskStatus.PENDING
    stage: ProcessingStage = ProcessingStage.PARSE_DOCUMENT
    progress: int = 0
    document_content: Optional[DocumentContent] = None
    outline: list[SlideOutline] = field(default_factory=list)
    slides: list[SlideContent] = field(default_factory=list)
    ppt_path: Optional[Path] = None
    error_message: Optional[str] = None
    title: str = ""
    style: str = "professional"  # professional, academic, creative


@dataclass
class ProgressEvent:
    """Event for streaming progress updates.

    Attributes:
        event: Event type (progress, outline, slide, done, error).
        message: Human-readable message.
        stage: Current processing stage.
        progress: Progress percentage (0-100).
        data: Additional event data.

    Example:
        >>> event = ProgressEvent(
        ...     event="progress",
        ...     message="Generating outline...",
        ...     stage=ProcessingStage.GENERATE_OUTLINE,
        ...     progress=30,
        ... )
    """

    event: str
    message: str
    stage: ProcessingStage = ProcessingStage.PARSE_DOCUMENT
    progress: int = 0
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert event to dictionary for JSON serialization.

        Returns:
            Dictionary representation of the event.
        """
        return {
            "event": self.event,
            "message": self.message,
            "stage": self.stage.value,
            "progress": self.progress,
            "data": self.data,
        }
