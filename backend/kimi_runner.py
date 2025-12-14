"""
Kimi CLI Runner - Wrapper for integrating Kimi CLI with the backend.

This module provides a clean interface to run Kimi CLI and extract
EdgeOne deployment URLs from the wire messages.
"""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncGenerator

from kaos.path import KaosPath
from kosong.message import TextPart, ThinkPart, ToolCall, ToolCallPart
from kosong.tooling import ToolResult

from kimi_cli.app import KimiCLI
from kimi_cli.session import Session
from kimi_cli.wire.message import (
    TurnBegin,
    StepBegin,
    StepInterrupted,
    CompactionBegin,
    CompactionEnd,
    StatusUpdate,
    ApprovalRequest,
    ApprovalRequestResolved,
    SubagentEvent,
)


# Pattern to match EdgeOne Pages deployment URLs
EDGEONE_URL_PATTERN = re.compile(
    r'https://[a-zA-Z0-9_-]+\.edgeone\.site(?:/[^\s"\'<>]*)?'
)

# Alternative pattern for mcp.edgeone.site share URLs
MCP_EDGEONE_URL_PATTERN = re.compile(
    r'https://mcp\.edgeone\.site/share/[a-zA-Z0-9_-]+'
)

# Pattern to extract concept map from AI response
CONCEPT_MAP_PATTERN = re.compile(
    r'<!--CONCEPT_MAP\s*\n(.*?)\nCONCEPT_MAP-->',
    re.DOTALL
)

# Default agent file for education visualization
DEFAULT_EDU_AGENT_FILE = Path(__file__).parent / "agent" / "agent.yaml"


@dataclass
class MessageEvent:
    """Event emitted during Kimi CLI execution."""
    
    type: str
    data: dict[str, Any] = field(default_factory=dict)


class KimiRunner:
    """
    Wrapper for running Kimi CLI and streaming wire messages.
    
    This class handles:
    - Creating/resuming Kimi CLI sessions
    - Streaming wire messages to the frontend
    - Extracting EdgeOne deployment URLs from tool results
    """
    
    def __init__(
        self,
        work_dir: Path | None = None,
        mcp_config_path: Path | None = None,
        agent_file: Path | None = None,
        yolo: bool = True,
        thinking: bool = True,
    ):
        self.work_dir = work_dir or Path.cwd()
        self.mcp_config_path = mcp_config_path
        self.agent_file = agent_file or DEFAULT_EDU_AGENT_FILE
        self.yolo = yolo
        self.thinking = thinking
        self._session: Session | None = None
        self._instance: KimiCLI | None = None
        self._extracted_urls: list[str] = []
        self._pending_html_files: dict[str, str] = {}  # tool_call_id -> file_path
    
    async def _get_mcp_configs(self) -> list[dict[str, Any]]:
        """Load MCP configurations."""
        import logging
        configs = []
        
        # Check for mcp.json in work directory
        default_mcp_path = self.work_dir / "mcp.json"
        config_path = self.mcp_config_path or default_mcp_path
        
        logging.info(f"[KimiRunner] Looking for MCP config at: {config_path}")
        logging.info(f"[KimiRunner] Config exists: {config_path.exists()}")
        
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
                logging.info(f"[KimiRunner] Loaded MCP config: {config}")
                # Handle both single config and array of configs
                if isinstance(config, list):
                    configs.extend(config)
                else:
                    configs.append(config)
        
        logging.info(f"[KimiRunner] Final MCP configs count: {len(configs)}")
        return configs
    
    async def _create_instance(self, session_id: str | None = None) -> KimiCLI:
        """Create or resume a Kimi CLI instance."""
        kaos_path = KaosPath(self.work_dir)
        
        if session_id:
            # Try to resume existing session
            try:
                self._session = await Session.find(kaos_path, session_id)
            except Exception:
                # Session not found, create new one
                self._session = await Session.create(kaos_path)
        else:
            self._session = await Session.create(kaos_path)
        
        mcp_configs = await self._get_mcp_configs()
        
        self._instance = await KimiCLI.create(
            self._session,
            yolo=self.yolo,
            mcp_configs=mcp_configs,
            thinking=self.thinking,
            agent_file=self.agent_file,
        )
        
        return self._instance
    
    def _extract_urls(self, text: str) -> list[str]:
        """Extract EdgeOne URLs from text."""
        urls = []
        
        # Try MCP share URLs first
        for match in MCP_EDGEONE_URL_PATTERN.finditer(text):
            urls.append(match.group(0))
        
        # Then try general EdgeOne URLs
        for match in EDGEONE_URL_PATTERN.finditer(text):
            url = match.group(0)
            if url not in urls:
                urls.append(url)
        
        return urls
    
    def _process_tool_result(self, result: ToolResult) -> tuple[MessageEvent, MessageEvent | None]:
        """Process a ToolResult message and extract URLs. Returns (tool_result_event, html_content_event or None)."""
        import logging
        rv = result.return_value
        
        # Combine all text fields for URL extraction
        text_parts = []
        if rv.output:
            text_parts.append(str(rv.output))
        if rv.message:
            text_parts.append(str(rv.message))
        
        combined_text = " ".join(text_parts)
        urls = self._extract_urls(combined_text)
        
        # Store extracted URLs
        for url in urls:
            if url not in self._extracted_urls:
                self._extracted_urls.append(url)
        
        tool_result_event = MessageEvent(
            type="tool_result",
            data={
                "tool_call_id": result.tool_call_id,
                "is_error": rv.is_error,
                "output": rv.output if isinstance(rv.output, str) else str(rv.output) if rv.output else None,
                "message": str(rv.message) if rv.message else None,
                "urls": urls,
            }
        )
        
        # 检查是否是 HTML 文件写入完成，如果是则读取内容
        html_content_event = None
        if result.tool_call_id in self._pending_html_files and not rv.is_error:
            file_path = self._pending_html_files.pop(result.tool_call_id)
            try:
                html_path = Path(file_path)
                if html_path.exists():
                    html_content = html_path.read_text(encoding="utf-8")
                    html_content_event = MessageEvent(
                        type="html_content",
                        data={
                            "file_path": file_path,
                            "content": html_content,
                        }
                    )
                    logging.info(f"[KimiRunner] Read HTML content from {file_path}, size: {len(html_content)}")
            except Exception as e:
                logging.warning(f"[KimiRunner] Failed to read HTML file {file_path}: {e}")
        
        return tool_result_event, html_content_event
    
    def _process_content_part(self, part: TextPart | ThinkPart) -> list[MessageEvent]:
        """Process a ContentPart message (TextPart or ThinkPart). May return multiple events."""
        import logging
        events = []
        
        if isinstance(part, TextPart):
            text = part.text
            
            # 检查是否包含概念地图数据
            map_match = CONCEPT_MAP_PATTERN.search(text)
            if map_match:
                try:
                    map_json = map_match.group(1).strip()
                    map_data = json.loads(map_json)
                    events.append(MessageEvent(
                        type="map_update",
                        data=map_data
                    ))
                    logging.info(f"[KimiRunner] Extracted concept map: {len(map_data.get('nodes', []))} nodes")
                    
                    # 从文本中移除概念地图标记
                    text = CONCEPT_MAP_PATTERN.sub('', text).strip()
                except json.JSONDecodeError as e:
                    logging.warning(f"[KimiRunner] Failed to parse concept map JSON: {e}")
            
            # 只有非空文本才发送
            if text:
                events.append(MessageEvent(
                    type="text",
                    data={"text": text}
                ))
                
        elif isinstance(part, ThinkPart):
            events.append(MessageEvent(
                type="thinking",
                data={"thinking": part.think}
            ))
        else:
            events.append(MessageEvent(
                type="content",
                data={"content": str(part)}
            ))
        
        return events
    
    def _process_tool_call(self, call: ToolCall) -> MessageEvent:
        """Process a ToolCall message."""
        import logging
        logging.info(f"[KimiRunner] tool_call: {call.function.name}")
        
        # 追踪 WriteFile 调用，记录文件路径
        if call.function.name == "WriteFile" and call.function.arguments:
            try:
                args = call.function.arguments
                if isinstance(args, str):
                    args = json.loads(args)
                file_path = args.get("file_path") or args.get("path")
                if file_path and file_path.endswith(".html"):
                    self._pending_html_files[call.id] = file_path
                    logging.info(f"[KimiRunner] Tracking HTML file write: {file_path}")
            except Exception as e:
                logging.warning(f"[KimiRunner] Failed to parse WriteFile args: {e}")
        
        return MessageEvent(
            type="tool_call",
            data={
                "id": call.id,
                "name": call.function.name,
                "arguments": call.function.arguments,
            }
        )
    
    def _process_tool_call_part(self, part: ToolCallPart) -> MessageEvent:
        """Process a ToolCallPart message (streaming tool call)."""
        import logging
        name = part.function.name if part.function else None
        if name:
            logging.info(f"[KimiRunner] tool_call_part: {name}")
        return MessageEvent(
            type="tool_call_part",
            data={
                "id": part.id,
                "name": name,
                "arguments_delta": part.function.arguments if part.function else None,
            }
        )
    
    async def run(
        self,
        user_input: str,
        session_id: str | None = None,
    ) -> AsyncGenerator[MessageEvent, None]:
        """
        Run Kimi CLI with the given input and stream events.
        
        Yields MessageEvent objects with the following types:
        - turn_begin: New turn started
        - step_begin: New step started
        - thinking: AI thinking content
        - text: AI text response
        - tool_call: Tool being called
        - tool_call_part: Streaming tool call arguments
        - tool_result: Tool execution result (may contain URLs)
        - url_extracted: EdgeOne URL extracted from results
        - status: Status update (context usage)
        - done: Execution completed
        - error: Error occurred
        """
        self._extracted_urls = []
        
        try:
            instance = await self._create_instance(session_id)
            cancel_event = asyncio.Event()
            
            # Yield session info
            yield MessageEvent(
                type="session",
                data={"session_id": self._session.id if self._session else None}
            )
            
            async for msg in instance.run(
                user_input=user_input,
                cancel_event=cancel_event,
                merge_wire_messages=True,
            ):
                events = self._convert_wire_message(msg)
                for event in events:
                    yield event
                    
                    # If we extracted URLs, send a separate event
                    if event.type == "tool_result" and event.data.get("urls"):
                        for url in event.data["urls"]:
                            yield MessageEvent(
                                type="url_extracted",
                                data={"url": url}
                            )
            
            # Final event with all extracted URLs
            yield MessageEvent(
                type="done",
                data={
                    "urls": self._extracted_urls,
                    "session_id": self._session.id if self._session else None,
                }
            )
            
        except Exception as e:
            yield MessageEvent(
                type="error",
                data={"message": str(e)}
            )
    
    def _convert_wire_message(self, msg: Any) -> list[MessageEvent]:
        """Convert a wire message to MessageEvent(s)."""
        
        if isinstance(msg, TurnBegin):
            return [MessageEvent(
                type="turn_begin",
                data={"user_input": str(msg.user_input)}
            )]
        
        elif isinstance(msg, StepBegin):
            return [MessageEvent(
                type="step_begin",
                data={"step": msg.n}
            )]
        
        elif isinstance(msg, StepInterrupted):
            return [MessageEvent(
                type="step_interrupted",
                data={}
            )]
        
        elif isinstance(msg, CompactionBegin):
            return [MessageEvent(
                type="compaction_begin",
                data={}
            )]
        
        elif isinstance(msg, CompactionEnd):
            return [MessageEvent(
                type="compaction_end",
                data={}
            )]
        
        elif isinstance(msg, StatusUpdate):
            return [MessageEvent(
                type="status",
                data={"context_usage": msg.context_usage}
            )]
        
        elif isinstance(msg, (TextPart, ThinkPart)):
            return self._process_content_part(msg)
        
        elif isinstance(msg, ToolCall):
            return [self._process_tool_call(msg)]
        
        elif isinstance(msg, ToolCallPart):
            return [self._process_tool_call_part(msg)]
        
        elif isinstance(msg, ToolResult):
            tool_result_event, html_content_event = self._process_tool_result(msg)
            events = [tool_result_event]
            if html_content_event:
                events.append(html_content_event)
            return events
        
        elif isinstance(msg, ApprovalRequest):
            return [MessageEvent(
                type="approval_request",
                data={
                    "id": msg.id,
                    "tool_name": msg.tool_name,
                    "action_name": msg.action_name,
                    "description": msg.description,
                }
            )]
        
        elif isinstance(msg, ApprovalRequestResolved):
            return [MessageEvent(
                type="approval_resolved",
                data={
                    "id": msg.id,
                    "approved": msg.approved,
                }
            )]
        
        elif isinstance(msg, SubagentEvent):
            return [MessageEvent(
                type="subagent",
                data={"event": str(msg)}
            )]
        
        # Unknown message type
        return [MessageEvent(
            type="unknown",
            data={"message": str(msg)}
        )]
