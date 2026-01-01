/**
 * FlashNote Types
 *
 * Type definitions for the FlashNote learning system including
 * cards, files, bookmarks, themes, and storage providers.
 *
 * Example:
 *     const card: Card = {
 *         id: "card-1",
 *         title: "Introduction",
 *         content: "Welcome to FlashNote!",
 *         level: 1
 *     };
 */

/**
 * Represents a single flashcard parsed from Markdown.
 *
 * Attributes:
 *     id (string): Unique identifier for the card.
 *     title (string): Card title extracted from Markdown heading.
 *     content (string): Card content in Markdown format.
 *     level (number): Heading level (1-6) from Markdown.
 */
export interface Card {
  id: string;
  title: string;
  content: string;
  level: number;
}

/**
 * Result of parsing a Markdown document.
 *
 * Attributes:
 *     cards (Card[]): Array of parsed flashcards.
 *     originalContent (string): Original Markdown content.
 */
export interface ParsedMarkdown {
  cards: Card[];
  originalContent: string;
}

/**
 * Represents a note file containing multiple flashcards.
 *
 * Attributes:
 *     id (string): Unique identifier for the file.
 *     name (string): File name (e.g., "notes.md").
 *     cards (Card[]): Array of flashcards in this file.
 *     lastModified (number): Unix timestamp of last modification.
 *     currentIndex (number): Currently viewed card index.
 *     pinned (boolean): Whether the file is pinned to top.
 */
export interface FileData {
  id: string;
  name: string;
  cards: Card[];
  lastModified: number;
  currentIndex: number;
  pinned?: boolean;
}

/**
 * Represents a saved bookmark/link.
 *
 * Attributes:
 *     id (string): Unique identifier for the bookmark.
 *     title (string): Bookmark title.
 *     url (string): URL of the bookmarked page.
 *     description (string): Optional description.
 *     tags (string[]): Optional array of tags.
 *     createdAt (number): Unix timestamp of creation.
 *     favicon (string): Optional favicon URL.
 */
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  favicon?: string;
}

/**
 * Represents a collection of bookmarks (folder).
 *
 * Attributes:
 *     id (string): Unique identifier for the collection.
 *     name (string): Collection name.
 *     bookmarks (Bookmark[]): Array of bookmarks.
 *     lastModified (number): Unix timestamp of last modification.
 *     pinned (boolean): Whether the collection is pinned.
 */
export interface BookmarkCollection {
  id: string;
  name: string;
  bookmarks: Bookmark[];
  lastModified: number;
  pinned?: boolean;
}

/**
 * WebDAV server configuration.
 *
 * Attributes:
 *     id (string): Unique identifier for the config.
 *     name (string): Display name for the server.
 *     serverUrl (string): WebDAV server URL.
 *     username (string): Authentication username.
 *     password (string): Authentication password.
 *     basePath (string): Base path on the server.
 *     syncInterval (number): Sync interval in milliseconds.
 *     lastSync (number): Unix timestamp of last sync.
 *     useProxy (boolean): Whether to use local proxy.
 */
export interface WebDAVConfig {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  basePath: string;
  syncInterval?: number;
  lastSync?: number;
  useProxy?: boolean;
}

/**
 * Storage provider configuration.
 *
 * Attributes:
 *     id (string): Unique identifier for the provider.
 *     name (string): Display name.
 *     type (string): Provider type ('local' or 'webdav').
 *     config (WebDAVConfig): Optional WebDAV configuration.
 *     isActive (boolean): Whether this provider is active.
 */
export interface StorageProvider {
  id: string;
  name: string;
  type: "local" | "webdav";
  config?: WebDAVConfig;
  isActive: boolean;
}

/**
 * Sync status information.
 *
 * Attributes:
 *     isSyncing (boolean): Whether sync is in progress.
 *     lastSync (number | null): Unix timestamp of last sync.
 *     error (string | null): Error message if any.
 *     pendingChanges (number): Number of pending changes.
 */
export interface SyncStatus {
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
  pendingChanges: number;
}

/**
 * Theme color configuration.
 *
 * Attributes:
 *     background (string): Background color.
 *     foreground (string): Text color.
 *     cardBackground (string): Card background color.
 *     secondaryBackground (string): Secondary background.
 *     primary (string): Primary accent color.
 *     primaryForeground (string): Text on primary color.
 *     secondary (string): Secondary text color.
 *     accent (string): Accent color.
 *     destructive (string): Destructive action color.
 *     muted (string): Muted text color.
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  cardBackground: string;
  secondaryBackground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  destructive: string;
  muted: string;
}

/**
 * Theme definition.
 *
 * Attributes:
 *     name (string): Theme display name.
 *     colors (ThemeColors): Color configuration.
 */
export interface Theme {
  name: string;
  colors: ThemeColors;
}

/**
 * Search result item.
 *
 * Attributes:
 *     fileId (string): ID of the file containing the match.
 *     fileName (string): Name of the file.
 *     cardIndex (number): Index of the matching card.
 *     title (string): Card title.
 *     content (string): Card content.
 *     matchPositions (array): Array of match positions.
 */
export interface SearchResult {
  fileId: string;
  fileName: string;
  cardIndex: number;
  title: string;
  content: string;
  matchPositions: { start: number; end: number }[];
}

/**
 * FlashNote tab types.
 */
export type FlashNoteTab = "home" | "study" | "edit" | "bookmarks";
