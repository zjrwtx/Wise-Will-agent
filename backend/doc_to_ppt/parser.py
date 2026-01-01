"""
Document parser for various file formats.

This module provides functionality to parse Word documents (.docx),
PDF files, and plain text files into a unified DocumentContent format.

Example:
    >>> parser = DocumentParser()
    >>> content = parser.parse("document.pdf")
    >>> print(content.title)
    >>> print(content.text[:100])
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

from .models import DocumentContent

logger = logging.getLogger(__name__)


class DocumentParser:
    """Parser for Word, PDF, and text documents.

    This class provides methods to parse various document formats
    and extract structured content including text, sections, and metadata.

    Attributes:
        supported_formats: Set of supported file extensions.

    Example:
        >>> parser = DocumentParser()
        >>> content = parser.parse("report.docx")
        >>> print(f"Title: {content.title}")
        >>> print(f"Sections: {len(content.sections)}")
    """

    supported_formats = {".docx", ".pdf", ".txt", ".md"}

    def parse(self, file_path: str | Path) -> DocumentContent:
        """Parse a document file and extract content.

        Args:
            file_path: Path to the document file.

        Returns:
            DocumentContent with extracted text and structure.

        Raises:
            ValueError: If file format is not supported.
            FileNotFoundError: If file does not exist.

        Example:
            >>> parser = DocumentParser()
            >>> content = parser.parse("document.pdf")
            >>> print(content.text[:200])
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = file_path.suffix.lower()

        if ext not in self.supported_formats:
            raise ValueError(
                f"Unsupported format: {ext}. "
                f"Supported: {', '.join(self.supported_formats)}"
            )

        logger.info(f"Parsing document: {file_path}")

        if ext == ".docx":
            return self._parse_docx(file_path)
        elif ext == ".pdf":
            return self._parse_pdf(file_path)
        elif ext in (".txt", ".md"):
            return self._parse_text(file_path)
        else:
            raise ValueError(f"Unsupported format: {ext}")

    def _parse_docx(self, file_path: Path) -> DocumentContent:
        """Parse a Word document (.docx).

        Args:
            file_path: Path to the .docx file.

        Returns:
            DocumentContent with extracted content.

        Example:
            >>> parser = DocumentParser()
            >>> content = parser._parse_docx(Path("report.docx"))
        """
        try:
            from docx import Document
        except ImportError:
            raise ImportError(
                "python-docx is required for Word documents. "
                "Install with: pip install python-docx"
            )

        doc = Document(file_path)

        # Extract metadata
        metadata = {}
        if doc.core_properties.title:
            metadata["title"] = doc.core_properties.title
        if doc.core_properties.author:
            metadata["author"] = doc.core_properties.author

        # Extract text and sections
        full_text = []
        sections = []
        current_section_title = ""
        current_section_content = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # Detect headings
            if para.style.name.startswith("Heading"):
                # Save previous section
                if current_section_title or current_section_content:
                    sections.append((
                        current_section_title,
                        "\n".join(current_section_content)
                    ))

                current_section_title = text
                current_section_content = []
            else:
                current_section_content.append(text)

            full_text.append(text)

        # Save last section
        if current_section_title or current_section_content:
            sections.append((
                current_section_title,
                "\n".join(current_section_content)
            ))

        # Detect title from first heading or metadata
        title = metadata.get("title", "")
        if not title and sections and sections[0][0]:
            title = sections[0][0]

        logger.info(
            f"Parsed DOCX: {len(full_text)} paragraphs, "
            f"{len(sections)} sections"
        )

        return DocumentContent(
            text="\n\n".join(full_text),
            title=title,
            sections=sections,
            metadata=metadata,
        )

    def _parse_pdf(self, file_path: Path) -> DocumentContent:
        """Parse a PDF document.

        Args:
            file_path: Path to the PDF file.

        Returns:
            DocumentContent with extracted content.

        Example:
            >>> parser = DocumentParser()
            >>> content = parser._parse_pdf(Path("report.pdf"))
        """
        try:
            import pymupdf  # PyMuPDF
        except ImportError:
            raise ImportError(
                "PyMuPDF is required for PDF parsing. "
                "Install with: pip install pymupdf"
            )

        doc = pymupdf.open(file_path)

        # Extract metadata
        metadata = {}
        if doc.metadata:
            if doc.metadata.get("title"):
                metadata["title"] = doc.metadata["title"]
            if doc.metadata.get("author"):
                metadata["author"] = doc.metadata["author"]

        # Extract text from all pages
        full_text = []
        for page in doc:
            text = page.get_text()
            if text.strip():
                full_text.append(text.strip())

        doc.close()

        combined_text = "\n\n".join(full_text)

        # Try to detect sections from the text
        sections = self._detect_sections(combined_text)

        # Detect title
        title = metadata.get("title", "")
        if not title:
            # Try first line as title
            lines = combined_text.split("\n")
            if lines:
                first_line = lines[0].strip()
                if len(first_line) < 100:
                    title = first_line

        logger.info(
            f"Parsed PDF: {doc.page_count} pages, "
            f"{len(sections)} sections detected"
        )

        return DocumentContent(
            text=combined_text,
            title=title,
            sections=sections,
            metadata=metadata,
        )

    def _parse_text(self, file_path: Path) -> DocumentContent:
        """Parse a plain text or markdown file.

        Args:
            file_path: Path to the text file.

        Returns:
            DocumentContent with extracted content.

        Example:
            >>> parser = DocumentParser()
            >>> content = parser._parse_text(Path("notes.txt"))
        """
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        # Detect sections
        sections = self._detect_sections(text)

        # Detect title from first line or markdown header
        title = ""
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Markdown header
            if line.startswith("# "):
                title = line[2:].strip()
                break
            # First non-empty line
            if len(line) < 100:
                title = line
                break

        logger.info(
            f"Parsed text: {len(text)} chars, "
            f"{len(sections)} sections detected"
        )

        return DocumentContent(
            text=text,
            title=title,
            sections=sections,
            metadata={},
        )

    def _detect_sections(self, text: str) -> list[tuple[str, str]]:
        """Detect sections from text using common patterns.

        Args:
            text: Full document text.

        Returns:
            List of (section_title, section_content) tuples.

        Example:
            >>> parser = DocumentParser()
            >>> sections = parser._detect_sections("# Intro\\nText...")
            >>> print(sections[0][0])  # "Intro"
        """
        sections = []

        # Patterns for section headers
        patterns = [
            # Markdown headers
            r"^#{1,3}\s+(.+)$",
            # Numbered sections: 1. Title, 1.1 Title
            r"^(\d+\.?\d*\.?\s+.+)$",
            # All caps headers
            r"^([A-Z][A-Z\s]{3,50})$",
            # Chinese numbered sections: 一、标题
            r"^([一二三四五六七八九十]+[、.]\s*.+)$",
        ]

        combined_pattern = "|".join(f"({p})" for p in patterns)

        lines = text.split("\n")
        current_title = ""
        current_content = []

        for line in lines:
            line_stripped = line.strip()

            # Check if line matches any header pattern
            is_header = False
            header_text = ""

            for pattern in patterns:
                match = re.match(pattern, line_stripped, re.MULTILINE)
                if match:
                    is_header = True
                    header_text = match.group(1).strip()
                    # Clean markdown headers
                    header_text = re.sub(r"^#+\s*", "", header_text)
                    break

            if is_header and len(header_text) < 100:
                # Save previous section
                if current_title or current_content:
                    sections.append((
                        current_title,
                        "\n".join(current_content).strip()
                    ))
                current_title = header_text
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_title or current_content:
            sections.append((
                current_title,
                "\n".join(current_content).strip()
            ))

        return sections

    def get_summary_for_ai(
        self,
        content: DocumentContent,
        max_chars: int = 8000,
    ) -> str:
        """Get a summarized version of content for AI processing.

        Args:
            content: Parsed document content.
            max_chars: Maximum characters to include.

        Returns:
            Summarized text suitable for AI processing.

        Example:
            >>> parser = DocumentParser()
            >>> content = parser.parse("long_doc.pdf")
            >>> summary = parser.get_summary_for_ai(content, max_chars=4000)
        """
        result = []

        if content.title:
            result.append(f"标题: {content.title}\n")

        if content.sections:
            result.append("文档结构:")
            for i, (title, _) in enumerate(content.sections[:20]):
                if title:
                    result.append(f"  {i+1}. {title}")
            result.append("")

        # Add text content
        remaining = max_chars - len("\n".join(result))
        if remaining > 0:
            text = content.text[:remaining]
            result.append("内容摘要:")
            result.append(text)

        return "\n".join(result)
