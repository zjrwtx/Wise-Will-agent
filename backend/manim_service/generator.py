"""
Manim Code Generator.

Uses LLM to generate Manim code from natural language descriptions.

Example:
    >>> generator = ManimCodeGenerator()
    >>> code = await generator.generate("解释勾股定理")
    >>> print(code)
"""

from __future__ import annotations

import logging
import os
import re
import shutil
from typing import AsyncIterator

from openai import AsyncOpenAI

from .templates import (
    MANIM_SYSTEM_PROMPT_LATEX,
    MANIM_SYSTEM_PROMPT_NO_LATEX,
    MANIM_TEMPLATES,
)

logger = logging.getLogger(__name__)


def check_latex_available() -> bool:
    """
    Check if LaTeX is available on the system.
    
    Returns:
        True if LaTeX (pdflatex or xelatex) is installed
        
    Example:
        >>> has_latex = check_latex_available()
        >>> print(f"LaTeX available: {has_latex}")
    """
    return (
        shutil.which("pdflatex") is not None
        or shutil.which("xelatex") is not None
        or shutil.which("latex") is not None
    )


# Cache the LaTeX check result
_LATEX_AVAILABLE: bool | None = None


def is_latex_available() -> bool:
    """
    Check if LaTeX is available (cached).
    
    Returns:
        True if LaTeX is installed on the system
    """
    global _LATEX_AVAILABLE
    if _LATEX_AVAILABLE is None:
        _LATEX_AVAILABLE = check_latex_available()
        logger.info(f"LaTeX availability: {_LATEX_AVAILABLE}")
    return _LATEX_AVAILABLE


class ManimCodeGenerator:
    """
    Generate Manim code from natural language using LLM.
    
    Attributes:
        client: OpenAI-compatible async client
        model: Model name to use for generation
        latex_available: Whether LaTeX is available on the system
        
    Example:
        >>> generator = ManimCodeGenerator()
        >>> code = await generator.generate("画一个正弦函数图像")
        >>> print(code)
    """
    
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ):
        """
        Initialize the code generator.
        
        Args:
            api_key: API key for LLM service. Defaults to env var.
            base_url: Base URL for API. Defaults to env var.
            model: Model name. Defaults to env var.
        """
        self.api_key = api_key or os.getenv(
            "KIMI_API_KEY",
            os.getenv("OPENAI_API_KEY", "")
        )
        self.base_url = base_url or os.getenv(
            "OPENAI_BASE_URL",
            "https://api.moonshot.cn/v1"
        )
        self.model = model or os.getenv(
            "KIMI_MODEL_NAME",
            os.getenv("OPENAI_MODEL_NAME", "moonshot-v1-8k")
        )
        
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )
        
        # Check LaTeX availability
        self.latex_available = is_latex_available()
        
    def _get_system_prompt(self) -> str:
        """
        Get the appropriate system prompt based on LaTeX availability.
        
        Returns:
            System prompt string for LLM
        """
        if self.latex_available:
            return MANIM_SYSTEM_PROMPT_LATEX
        return MANIM_SYSTEM_PROMPT_NO_LATEX
        
    def _build_prompt(self, description: str) -> str:
        """
        Build the user prompt with examples.
        
        Args:
            description: User's description of desired animation
            
        Returns:
            Formatted prompt string
        """
        # Select relevant example based on keywords
        example = ""
        desc_lower = description.lower()
        
        if any(kw in desc_lower for kw in ["勾股", "pythagorean", "直角三角"]):
            example = MANIM_TEMPLATES["pythagorean"]
        elif any(kw in desc_lower for kw in ["二次", "quadratic", "求根"]):
            example = MANIM_TEMPLATES["quadratic"]
        elif any(kw in desc_lower for kw in ["函数", "图像", "graph", "plot"]):
            example = MANIM_TEMPLATES["function_graph"]
        elif any(kw in desc_lower for kw in ["导数", "derivative", "切线"]):
            example = MANIM_TEMPLATES["derivative"]
        elif any(kw in desc_lower for kw in ["向量", "vector"]):
            example = MANIM_TEMPLATES["vector"]
            
        prompt = f"请生成Manim代码来制作以下数学动画：\n\n{description}"
        
        if example:
            prompt += f"\n\n参考示例（可以借鉴但不要完全复制）：\n```python{example}```"
            
        return prompt
    
    def _extract_code(self, response: str) -> str:
        """
        Extract Python code from LLM response.
        
        Args:
            response: Raw LLM response text
            
        Returns:
            Extracted Python code
        """
        # Try to extract code block
        code_pattern = r"```(?:python)?\s*([\s\S]*?)```"
        matches = re.findall(code_pattern, response)
        
        if matches:
            code = matches[0].strip()
        else:
            # Assume entire response is code
            code = response.strip()
            
        # Validate basic structure
        if "class MainScene" not in code:
            # Try to wrap in template
            if "def construct" in code:
                # Extract construct body
                code = MANIM_TEMPLATES["basic_scene"].format(
                    content=code
                )
            else:
                raise ValueError(
                    "Generated code missing MainScene class"
                )
                
        return code
    
    def _validate_code(self, code: str) -> tuple[bool, str]:
        """
        Validate generated Manim code for safety and correctness.
        
        Args:
            code: Python code to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check for dangerous imports/operations
        dangerous_patterns = [
            r"import\s+os",
            r"import\s+subprocess",
            r"import\s+sys",
            r"__import__",
            r"eval\s*\(",
            r"exec\s*\(",
            r"open\s*\(",
            r"file\s*\(",
            r"input\s*\(",
            r"\.read\s*\(",
            r"\.write\s*\(",
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, code):
                return False, f"Dangerous pattern detected: {pattern}"
                
        # Check required elements
        if "from manim import" not in code:
            return False, "Missing 'from manim import *'"
            
        if "class MainScene" not in code:
            return False, "Missing 'class MainScene'"
            
        if "def construct" not in code:
            return False, "Missing 'def construct' method"
            
        return True, ""
    
    async def generate(
        self,
        description: str,
        max_retries: int = 2,
    ) -> str:
        """
        Generate Manim code from description.
        
        Args:
            description: Natural language description of animation
            max_retries: Maximum retry attempts on failure
            
        Returns:
            Valid Manim Python code
            
        Raises:
            ValueError: If code generation fails after retries
            
        Example:
            >>> code = await generator.generate("画一个圆变成正方形")
            >>> print(code)
        """
        prompt = self._build_prompt(description)
        last_error = ""
        
        for attempt in range(max_retries + 1):
            try:
                # Add error context for retries
                if attempt > 0 and last_error:
                    prompt = (
                        f"{prompt}\n\n"
                        f"上次生成的代码有错误：{last_error}\n"
                        f"请修正并重新生成。"
                    )
                
                logger.info(
                    f"Generating Manim code (attempt {attempt + 1})"
                )
                
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": self._get_system_prompt()
                        },
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000,
                )
                
                raw_code = response.choices[0].message.content or ""
                code = self._extract_code(raw_code)
                
                # Validate
                is_valid, error = self._validate_code(code)
                if not is_valid:
                    last_error = error
                    logger.warning(f"Code validation failed: {error}")
                    continue
                    
                logger.info("Manim code generated successfully")
                return code
                
            except Exception as e:
                last_error = str(e)
                logger.exception(f"Code generation error: {e}")
                
        raise ValueError(
            f"Failed to generate valid code after {max_retries + 1} attempts. "
            f"Last error: {last_error}"
        )
    
    async def generate_stream(
        self,
        description: str,
    ) -> AsyncIterator[str]:
        """
        Stream Manim code generation.
        
        Args:
            description: Natural language description
            
        Yields:
            Code chunks as they are generated
            
        Example:
            >>> async for chunk in generator.generate_stream("解释积分"):
            ...     print(chunk, end="")
        """
        prompt = self._build_prompt(description)
        
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=True,
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
