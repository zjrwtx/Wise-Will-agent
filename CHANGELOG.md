# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
