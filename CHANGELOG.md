# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed - AI PPT Generator Redesign (2026-01-01)

Redesigned the PPT generation feature to be prompt-driven instead of
document-to-PPT conversion. Now uses Kimi CLI for AI generation.

#### New Flow

1. **User describes what PPT they want** (required)
   - Example: "Make a Python training PPT, 10 slides, professional style"
   - AI generates outline and content based on requirements

2. **Optional reference materials**
   - Upload Word/PDF/text as reference (not required)
   - AI uses reference to enhance content generation

3. **Kimi CLI Integration**
   - Uses Kimi CLI instead of raw OpenAI API
   - Better context handling and response quality
   - Streaming progress updates

#### API Changes

- `POST /api/doc-to-ppt/create` - Create task with prompt only (NEW)
- `POST /api/doc-to-ppt/upload` - Upload with prompt + reference file
  - Now requires `prompt` field (user's requirements)
  - `file` is reference material, not source document
- Other endpoints unchanged

#### Frontend Changes

- New prompt input textarea with example suggestions
- Reference document upload is now optional
- Clearer UI showing the prompt-driven workflow

### Added - Document to PPT Conversion (2026-01-01)

New feature to convert Word documents, PDFs, and text files into PowerPoint
presentations using AI-powered outline generation and content filling.

#### Features

1. **Document Parsing**
   - Supports `.docx` (Word), `.pdf`, `.txt`, and `.md` files
   - Extracts text, sections, and metadata
   - Auto-detects document structure and titles

2. **AI-Powered Outline Generation**
   - Uses GPT-4o-mini to generate presentation outlines
   - Automatically determines optimal number of slides (5-15)
   - Supports multiple layouts: title, content, bullets, two_column, summary

3. **Content Filling**
   - AI fills each slide with relevant content from the document
   - Maintains context between slides for coherent flow
   - Generates speaker notes

4. **PPT Building**
   - Creates professional PowerPoint files using python-pptx
   - Three style themes: professional, academic, creative
   - 16:9 aspect ratio with modern design

5. **Real-time Progress**
   - WebSocket streaming for live progress updates
   - Shows outline preview during generation
   - Tracks individual slide completion

#### API Endpoints

- `POST /api/doc-to-ppt/upload` - Upload document
- `GET /api/doc-to-ppt/status/{task_id}` - Get processing status
- `GET /api/doc-to-ppt/download/{task_id}` - Download generated PPT
- `DELETE /api/doc-to-ppt/{task_id}` - Delete task
- `WebSocket /ws/doc-to-ppt/{task_id}` - Real-time progress

#### Dependencies Added

- `python-pptx>=1.0.0` - PowerPoint generation
- `python-docx>=1.1.0` - Word document parsing
- `pymupdf>=1.24.0` - PDF parsing

### Fixed - Manim Rendering Bug (2026-01-01)

Fixed critical bug where Manim video rendering would fail or get stuck.

#### Bug Fixes

1. **Path Resolution Bug**
   - Fixed: Scene file path was being duplicated when passed to Manim
   - Before: `/path/task_id/path/task_id/scene.py` (wrong)
   - After: Uses relative path `scene.py` with correct `cwd`

2. **Granular Progress Updates**
   - Now parses Manim output to track individual animation rendering
   - Progress updates for each animation (e.g., "正在渲染动画 3...")
   - Progress range: 30-75% during rendering, 80% for finalization

3. **Better User Feedback**
   - Shows animation count during rendering
   - More responsive progress bar updates
   - Clearer status messages

### Changed - Unified Design System (2026-01-01)

Created a unified design system combining Google-style colors with Doubao layout patterns.
All pages now share consistent visual language.

#### New Design System (`/styles/design-system.ts`)

1. **Color Palette (Google-inspired)**
   - Primary: `#1a73e8` (Google Blue)
   - Text: `#202124` (primary), `#5f6368` (secondary)
   - Borders: `#e8eaed` (light gray)
   - Tool accents: Red (video), Green (flashnote), Purple (manim)

2. **Shared Components**
   - Consistent shadows, border radius, spacing
   - Reusable animation keyframes
   - Typography scale and font weights

3. **Layout Pattern (Doubao-style)**
   - Centered hero with greeting
   - Pill-shaped suggestion chips
   - Bottom-fixed chat-style input
   - Card-based content sections

#### Pages Redesigned

| Page | Key Changes |
|------|-------------|
| Homepage | Google blue primary, clean tool cards |
| Video-to-PDF | Red accent, drag-drop upload zone |
| FlashNote | Green accent, centered empty state |
| Manim | Purple accent, progress visualization |

#### Visual Consistency

- All pages use same background gradient
- Unified header with back button and tool icon
- Consistent chip hover effects (border color + lift)
- Same input container style across all tools
- Shared animation timing (0.15s fast, 0.2s normal)

### Fixed - LaTeX Dependency Issue (2026-01-01)

Fixed Manim video rendering failure when LaTeX is not installed.

#### Changes

1. **LaTeX Detection**
   - Added `check_latex_available()` function in `generator.py`
   - System now auto-detects if LaTeX (pdflatex/xelatex) is installed

2. **Fallback to Unicode Math**
   - When LaTeX is not available, LLM generates code using `Text()` with Unicode
   - Uses Unicode math symbols: ² ³ √ π θ α β γ ∑ ∫ ∞ ≤ ≥ ≠ ± × ÷
   - Vector notation: a⃗ b⃗ (using combining arrow character)

3. **Updated System Prompts**
   - `MANIM_SYSTEM_PROMPT_LATEX` - For systems with LaTeX
   - `MANIM_SYSTEM_PROMPT_NO_LATEX` - For systems without LaTeX

4. **Enhanced `/api/manim/check` Endpoint**
   - Now reports both Manim and LaTeX availability
   - Provides installation guidance for missing components

5. **Video Path Resolution Fix**
   - Changed default quality from `m` (720p) to `l` (480p) for faster rendering
   - Improved `get_video_path()` to search recursively for video files
   - Filters out partial_movie_files from search results

6. **Enhanced Frontend Logging**
   - Logs panel now shows all logs (not just during processing)
   - Increased log display area (250px max height)
   - Added log numbering for easier tracking
   - Shows Manim render output with `[Manim]` prefix
   - Added emoji indicators for success/error states

#### Root Cause

The original code used `MathTex()` for mathematical formulas, which requires
LaTeX to render. On systems without LaTeX installed, rendering would fail with:
```
Writing \vec{a} to media/Tex/xxx.tex
[Error during LaTeX compilation]
```

### Added - Manim Math Video Generator (2026-01-01)

Integrated Manim (Mathematical Animation Engine) to generate 3Blue1Brown-style
math animation videos from natural language descriptions.

#### New Features

1. **Math Video Generator Page** (`/manim`)
   - Natural language input for describing animations
   - Real-time code generation preview (streaming)
   - Video rendering progress tracking
   - Video playback and download

2. **Backend Manim Service**
   - LLM-powered Manim code generation
   - Code validation and safety checks
   - Async video rendering with progress events
   - WebSocket for real-time updates

3. **API Endpoints**
   - `POST /api/manim/generate` - Create generation task
   - `GET /api/manim/status/{task_id}` - Check task status
   - `GET /api/manim/video/{task_id}` - Download video
   - `WS /ws/manim/{task_id}` - Real-time progress
   - `GET /api/manim/check` - Check Manim installation

4. **Code Templates**
   - Pythagorean theorem example
   - Quadratic formula example
   - Function graph plotting
   - Derivative visualization
   - Vector addition

#### New Dependencies (backend)

- `manim>=0.18.0` - Mathematical Animation Engine

#### New Files

```
backend/manim_service/
├── __init__.py           # Module exports
├── service.py            # High-level orchestration
├── generator.py          # LLM code generation
├── executor.py           # Manim code execution
└── templates.py          # Code templates & prompts

frontend/src/app/manim/
└── page.tsx              # Math Video Generator UI
```

#### System Requirements

```bash
# Install Manim (required)
pip install manim

# Install system dependencies
# macOS
brew install ffmpeg
brew install --cask mactex  # Optional, for LaTeX

# Ubuntu
apt install ffmpeg texlive-full
```

#### Usage

1. Navigate to home page
2. Click "数学动画生成器" in the tools section
3. Enter a description like "解释勾股定理"
4. Watch the code generate and video render
5. Download or share the generated video

---

### Added - FlashNote Integration (2026-01-01)

Integrated FlashNote learning system from `flashnote-main` project into
edu-ai-platform, providing Markdown-based flashcard learning capabilities.

#### New Features

1. **FlashNote Page** (`/flashnote`)
   - Full-featured flashcard learning system
   - Accessible from the main learning home page

2. **Note Management**
   - Import multiple Markdown files
   - Create and edit notes with Markdown editor
   - Export notes as Markdown files
   - Pin/unpin notes for quick access
   - Full-text search across all notes

3. **Flashcard Study Mode**
   - Card-based navigation with up/down buttons
   - Table of contents sidebar
   - Progress indicator
   - Smooth animations between cards

4. **Markdown Rendering**
   - GitHub Flavored Markdown (GFM) support
   - Math formulas with KaTeX ($inline$ and $$block$$)
   - Code blocks with syntax highlighting
   - Tables, lists, images, and blockquotes

5. **Bookmark Collections**
   - Create bookmark collections/folders
   - Save URLs with title, description, and tags
   - Extract web content using Jina AI
   - Import extracted content as flashcard notes

6. **Theme System**
   - 5 color themes: Classic Black, Fresh Green, Dream Purple,
     Vibrant Orange, Ocean Blue
   - Theme preference persistence

7. **Cloud Sync (WebDAV)**
   - Configure WebDAV storage providers
   - Automatic sync of notes and bookmarks
   - Support for Nextcloud, ownCloud, and other WebDAV servers

#### New Dependencies (frontend)

- `@headlessui/react` - Accessible UI components
- `@heroicons/react` - Icon library
- `framer-motion` - Animation library
- `katex` - Math formula rendering
- `rehype-katex` - Rehype plugin for KaTeX
- `remark-math` - Remark plugin for math
- `remark-gfm` - GitHub Flavored Markdown
- `webdav` - WebDAV client
- `@tailwindcss/typography` - Prose styling

#### New Files

```
frontend/src/
├── app/flashnote/
│   └── page.tsx                    # FlashNote main page
├── components/flashnote/
│   ├── index.ts                    # Component exports
│   ├── NoteList.tsx                # File list with search
│   ├── CardViewer.tsx              # Flashcard study view
│   ├── NoteEditor.tsx              # Markdown editor
│   ├── BookmarkManager.tsx         # Bookmark collections
│   ├── ThemeSelector.tsx           # Theme picker
│   └── StorageProviderModal.tsx    # WebDAV config
├── hooks/
│   └── useFlashNote.ts             # FlashNote state hook
├── types/
│   └── flashnote.ts                # TypeScript definitions
└── utils/
    ├── markdown.ts                 # Markdown parser
    ├── themes.ts                   # Theme system
    └── webdav.ts                   # WebDAV storage manager
```

#### Updated Files

- `frontend/src/components/LearningHome.tsx` - Added FlashNote link
- `frontend/src/hooks/index.ts` - Export useFlashNote hook
- `frontend/package.json` - Added new dependencies

#### Architecture

The FlashNote integration follows the existing project structure:
- Uses Next.js App Router
- TypeScript with strict typing
- Tailwind CSS for styling (inline styles for components)
- React hooks for state management
- Local storage for data persistence
- Optional WebDAV for cloud sync

#### Usage

1. Navigate to the home page
2. Click "FlashNote 闪卡笔记" in the tools section
3. Import Markdown files or create new notes
4. Study flashcards with card navigation
5. (Optional) Configure WebDAV for cloud sync
