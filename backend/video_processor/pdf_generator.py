"""
PDF generation from merged video content.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    PageBreak,
    Table,
    TableStyle,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from .models import MergedContent

logger = logging.getLogger(__name__)


class PDFGenerator:
    """Generate PDF documents from merged video content."""
    
    # Common Chinese font paths for different systems
    FONT_PATHS = [
        # macOS
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        # Linux
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        # Windows
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simsun.ttc",
    ]
    
    def __init__(self):
        """Initialize PDF generator with Chinese font support."""
        self.styles = getSampleStyleSheet()
        self._register_chinese_font()
        self._setup_styles()
    
    def _register_chinese_font(self):
        """Register Chinese font for PDF generation."""
        font_registered = False
        
        for font_path in self.FONT_PATHS:
            if Path(font_path).exists():
                try:
                    pdfmetrics.registerFont(TTFont('ChineseFont', font_path))
                    font_registered = True
                    logger.info(f"Registered Chinese font: {font_path}")
                    break
                except Exception as e:
                    logger.debug(f"Failed to register font {font_path}: {e}")
                    continue
        
        if not font_registered:
            logger.warning("No Chinese font found, using default font")
            self.chinese_font = "Helvetica"
        else:
            self.chinese_font = "ChineseFont"
    
    def _setup_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='ChineseTitle',
            fontName=self.chinese_font,
            fontSize=24,
            leading=30,
            alignment=1,  # Center
            spaceAfter=20,
        ))
        
        self.styles.add(ParagraphStyle(
            name='ChineseHeading',
            fontName=self.chinese_font,
            fontSize=16,
            leading=22,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#333333'),
        ))
        
        self.styles.add(ParagraphStyle(
            name='ChineseBody',
            fontName=self.chinese_font,
            fontSize=11,
            leading=18,
            spaceBefore=5,
            spaceAfter=5,
            textColor=colors.HexColor('#444444'),
        ))
        
        self.styles.add(ParagraphStyle(
            name='ChineseCaption',
            fontName=self.chinese_font,
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=colors.HexColor('#666666'),
        ))
        
        self.styles.add(ParagraphStyle(
            name='Timestamp',
            fontName=self.chinese_font,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#0066cc'),
        ))
    
    def generate(
        self,
        merged_contents: list[MergedContent],
        output_path: str | Path,
        title: str = "教学视频笔记",
        duration: float = 0,
        progress_callback: Callable[[int], None] | None = None,
    ) -> Path:
        """
        Generate PDF from merged content.
        
        Args:
            merged_contents: List of merged content items
            output_path: Path for output PDF file
            title: Document title
            duration: Video duration in seconds
            progress_callback: Optional callback for progress updates
            
        Returns:
            Path to generated PDF
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Generating PDF: {output_path}")
        
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )
        
        story = []
        total_items = len(merged_contents) + 2  # +2 for cover and TOC
        
        # Cover page
        story.extend(self._create_cover(title, duration, len(merged_contents)))
        story.append(PageBreak())
        
        if progress_callback:
            progress_callback(10)
        
        # Table of contents
        story.extend(self._create_toc(merged_contents))
        story.append(PageBreak())
        
        if progress_callback:
            progress_callback(20)
        
        # Content pages
        for i, content in enumerate(merged_contents):
            story.extend(self._create_content_section(content, i + 1))
            story.append(Spacer(1, 20))
            
            if progress_callback:
                progress = 20 + int((i + 1) / len(merged_contents) * 70)
                progress_callback(progress)
        
        # Appendix: Full transcript
        if any(c.audio_content for c in merged_contents):
            story.append(PageBreak())
            story.extend(self._create_transcript_appendix(merged_contents))
        
        # Build PDF
        doc.build(story)
        
        if progress_callback:
            progress_callback(100)
        
        logger.info(f"PDF generated: {output_path}")
        return output_path
    
    def _create_cover(
        self,
        title: str,
        duration: float,
        section_count: int,
    ) -> list:
        """Create cover page elements."""
        elements = []
        
        elements.append(Spacer(1, 100))
        elements.append(Paragraph(title, self.styles['ChineseTitle']))
        elements.append(Spacer(1, 30))
        
        # Video info
        duration_str = self._format_duration(duration)
        info_text = f"视频时长: {duration_str} | 共 {section_count} 个知识点"
        elements.append(Paragraph(info_text, self.styles['ChineseCaption']))
        
        elements.append(Spacer(1, 50))
        elements.append(Paragraph(
            "由 AI 自动生成",
            self.styles['ChineseCaption']
        ))
        
        return elements
    
    def _create_toc(self, merged_contents: list[MergedContent]) -> list:
        """Create table of contents."""
        elements = []
        
        elements.append(Paragraph("目录", self.styles['ChineseHeading']))
        elements.append(Spacer(1, 15))
        
        for i, content in enumerate(merged_contents):
            time_str = self._format_duration(content.timestamp)
            
            # Use summary first line as title, or default
            if content.summary:
                title = content.summary.split("。")[0][:30]
            elif content.visual_content:
                title = content.visual_content[:30]
            else:
                title = f"第 {i + 1} 节"
            
            toc_line = f"{i + 1}. {title}... {time_str}"
            elements.append(Paragraph(toc_line, self.styles['ChineseBody']))
        
        return elements
    
    def _create_content_section(
        self,
        content: MergedContent,
        section_num: int,
    ) -> list:
        """Create content section for a single merged content item."""
        elements = []
        
        # Section header with timestamp
        time_str = self._format_duration(content.timestamp)
        elements.append(Paragraph(
            f"📍 {time_str}",
            self.styles['Timestamp']
        ))
        
        # Image
        if content.image_path and Path(content.image_path).exists():
            try:
                img = Image(content.image_path)
                # Scale to fit page width while maintaining aspect ratio
                img_width = 16 * cm
                aspect = img.imageHeight / img.imageWidth
                img_height = img_width * aspect
                
                # Limit max height
                if img_height > 10 * cm:
                    img_height = 10 * cm
                    img_width = img_height / aspect
                
                img.drawWidth = img_width
                img.drawHeight = img_height
                elements.append(img)
                elements.append(Spacer(1, 10))
            except Exception as e:
                logger.warning(f"Failed to add image: {e}")
        
        # Visual content
        if content.visual_content:
            elements.append(Paragraph(
                "📷 画面内容",
                self.styles['ChineseHeading']
            ))
            elements.append(Paragraph(
                content.visual_content,
                self.styles['ChineseBody']
            ))
        
        # Audio content
        if content.audio_content:
            elements.append(Paragraph(
                "🎤 讲解内容",
                self.styles['ChineseHeading']
            ))
            elements.append(Paragraph(
                content.audio_content,
                self.styles['ChineseBody']
            ))
        
        # Summary
        if content.summary:
            elements.append(Paragraph(
                "💡 知识点总结",
                self.styles['ChineseHeading']
            ))
            elements.append(Paragraph(
                content.summary,
                self.styles['ChineseBody']
            ))
        
        return elements
    
    def _create_transcript_appendix(
        self,
        merged_contents: list[MergedContent],
    ) -> list:
        """Create appendix with full transcript."""
        elements = []
        
        elements.append(Paragraph("附录：完整语音稿", self.styles['ChineseTitle']))
        elements.append(Spacer(1, 20))
        
        for content in merged_contents:
            if content.audio_content:
                time_str = self._format_duration(content.timestamp)
                elements.append(Paragraph(
                    f"[{time_str}]",
                    self.styles['Timestamp']
                ))
                elements.append(Paragraph(
                    content.audio_content,
                    self.styles['ChineseBody']
                ))
                elements.append(Spacer(1, 10))
        
        return elements
    
    def _format_duration(self, seconds: float) -> str:
        """Format seconds to HH:MM:SS or MM:SS."""
        total_seconds = int(seconds)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, secs = divmod(remainder, 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"
