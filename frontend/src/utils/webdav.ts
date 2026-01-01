/**
 * WebDAV Storage Manager for FlashNote.
 *
 * Provides WebDAV client functionality for syncing notes and bookmarks
 * to remote WebDAV servers like Nextcloud, ownCloud, etc.
 *
 * Example:
 *     const manager = new StorageManager();
 *     await manager.addStorageProvider(provider);
 *     await manager.syncFile(fileData);
 */

import { createClient, WebDAVClient } from "webdav";
import {
  WebDAVConfig,
  FileData,
  BookmarkCollection,
  StorageProvider,
} from "@/types/flashnote";

/**
 * Storage keys for localStorage persistence.
 */
const STORAGE_PROVIDERS_KEY = "flashnote-storage-providers";

/**
 * WebDAV Storage class for direct WebDAV operations.
 *
 * Handles connection, file upload/download, and directory management.
 *
 * Example:
 *     const storage = new WebDAVStorage();
 *     await storage.initialize(config);
 *     await storage.uploadFileData(fileData);
 */
export class WebDAVStorage {
  private client: WebDAVClient | null = null;
  private config: WebDAVConfig | null = null;

  /**
   * Initialize WebDAV client with configuration.
   *
   * Args:
   *     config: WebDAV server configuration.
   *
   * Raises:
   *     Error: If initialization or connection test fails.
   */
  async initialize(config: WebDAVConfig): Promise<void> {
    try {
      this.config = config;

      // Use proxy if enabled (for CORS bypass)
      const serverUrl = config.useProxy
        ? "http://localhost:3002/webdav/"
        : config.serverUrl;

      this.client = createClient(serverUrl, {
        username: config.username,
        password: config.password,
      });

      await this.testConnection();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`WebDAV initialization failed: ${msg}`);
    }
  }

  /**
   * Test WebDAV connection by listing root directory.
   *
   * Returns:
   *     True if connection is successful.
   *
   * Raises:
   *     Error: If connection test fails.
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error("WebDAV client not initialized");
    }

    try {
      const items = await this.client.getDirectoryContents("/");
      return Array.isArray(items);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`WebDAV connection test failed: ${msg}`);
    }
  }

  /**
   * Ensure base directory structure exists on server.
   *
   * Creates /flashnote and subdirectories if they don't exist.
   */
  private async ensureBaseDirectory(): Promise<void> {
    if (!this.client || !this.config) return;

    try {
      const basePath = this.config.basePath || "/flashnote";
      const exists = await this.client.exists(basePath);

      if (!exists) {
        await this.client.createDirectory(basePath);
      }

      // Create subdirectories
      const subdirs = ["files", "bookmarks", "config"];
      for (const subdir of subdirs) {
        const subdirPath = `${basePath}/${subdir}`;
        const subdirExists = await this.client.exists(subdirPath);
        if (!subdirExists) {
          await this.client.createDirectory(subdirPath);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create directory: ${msg}`);
    }
  }

  /**
   * Upload file data to WebDAV server.
   *
   * Args:
   *     fileData: FileData object to upload.
   *
   * Raises:
   *     Error: If upload fails.
   */
  async uploadFileData(fileData: FileData): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error("WebDAV not initialized");
    }

    try {
      await this.ensureBaseDirectory();

      const filePath = `${this.config.basePath}/files/${fileData.id}.json`;
      const content = JSON.stringify(fileData, null, 2);

      await this.client.putFileContents(filePath, content, {
        overwrite: true,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to upload file: ${msg}`);
    }
  }

  /**
   * Download file data from WebDAV server.
   *
   * Args:
   *     fileId: ID of the file to download.
   *
   * Returns:
   *     FileData object or null if not found.
   */
  async downloadFileData(fileId: string): Promise<FileData | null> {
    if (!this.client || !this.config) {
      throw new Error("WebDAV not initialized");
    }

    try {
      const filePath = `${this.config.basePath}/files/${fileId}.json`;
      const exists = await this.client.exists(filePath);

      if (!exists) {
        return null;
      }

      const content = (await this.client.getFileContents(filePath, {
        format: "text",
      })) as string;

      return JSON.parse(content) as FileData;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to download file: ${msg}`);
    }
  }

  /**
   * Upload bookmarks to WebDAV server.
   *
   * Args:
   *     bookmarks: Array of BookmarkCollection to upload.
   */
  async uploadBookmarks(bookmarks: BookmarkCollection[]): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error("WebDAV not initialized");
    }

    try {
      await this.ensureBaseDirectory();

      const filePath = `${this.config.basePath}/bookmarks/bookmarks.json`;
      const content = JSON.stringify(bookmarks, null, 2);

      await this.client.putFileContents(filePath, content, {
        overwrite: true,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to upload bookmarks: ${msg}`);
    }
  }

  /**
   * Download bookmarks from WebDAV server.
   *
   * Returns:
   *     Array of BookmarkCollection or null if not found.
   */
  async downloadBookmarks(): Promise<BookmarkCollection[] | null> {
    if (!this.client || !this.config) {
      throw new Error("WebDAV not initialized");
    }

    try {
      const filePath = `${this.config.basePath}/bookmarks/bookmarks.json`;
      const exists = await this.client.exists(filePath);

      if (!exists) {
        return null;
      }

      const content = (await this.client.getFileContents(filePath, {
        format: "text",
      })) as string;

      return JSON.parse(content) as BookmarkCollection[];
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to download bookmarks: ${msg}`);
    }
  }

  /**
   * List all file IDs on the server.
   *
   * Returns:
   *     Array of file IDs.
   */
  async listFiles(): Promise<string[]> {
    if (!this.client || !this.config) {
      throw new Error("WebDAV not initialized");
    }

    try {
      const filesPath = `${this.config.basePath}/files`;
      const exists = await this.client.exists(filesPath);

      if (!exists) {
        return [];
      }

      const items = (await this.client.getDirectoryContents(filesPath)) as {
        type: string;
        filename: string;
      }[];
      return items
        .filter(
          (item) => item.type === "file" && item.filename.endsWith(".json")
        )
        .map(
          (item) => item.filename.split("/").pop()?.replace(".json", "") || ""
        );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to list files: ${msg}`);
    }
  }

  /**
   * Delete a file from WebDAV server.
   *
   * Args:
   *     fileId: ID of the file to delete.
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error("WebDAV not initialized");
    }

    try {
      const filePath = `${this.config.basePath}/files/${fileId}.json`;
      await this.client.deleteFile(filePath);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to delete file: ${msg}`);
    }
  }
}

/**
 * Storage Manager for unified local and WebDAV storage.
 *
 * Manages multiple storage providers and handles sync operations.
 *
 * Example:
 *     const manager = new StorageManager();
 *     const providers = manager.getStorageProviders();
 *     await manager.syncFile(fileData);
 */
export class StorageManager {
  private webDAVStorage: WebDAVStorage | null = null;
  private storageProviders: StorageProvider[] = [];
  private activeProvider: StorageProvider | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadStorageProviders();
    }
  }

  /**
   * Check if running in browser environment.
   */
  private isClient(): boolean {
    return (
      typeof window !== "undefined" && typeof localStorage !== "undefined"
    );
  }

  /**
   * Load storage providers from localStorage.
   */
  private loadStorageProviders(): void {
    if (!this.isClient()) return;

    try {
      const stored = localStorage.getItem(STORAGE_PROVIDERS_KEY);
      if (stored) {
        this.storageProviders = JSON.parse(stored);
        this.activeProvider =
          this.storageProviders.find((p) => p.isActive) || null;

        // Initialize WebDAV if active
        if (
          this.activeProvider &&
          this.activeProvider.type === "webdav" &&
          this.activeProvider.config
        ) {
          this.webDAVStorage = new WebDAVStorage();
          this.webDAVStorage
            .initialize(this.activeProvider.config)
            .catch((error) => {
              console.error("WebDAV initialization failed:", error);
              this.webDAVStorage = null;
            });
        }
      }
    } catch (error) {
      console.error("Failed to load storage providers:", error);
    }
  }

  /**
   * Save storage providers to localStorage.
   */
  private saveStorageProviders(): void {
    if (!this.isClient()) return;

    try {
      localStorage.setItem(
        STORAGE_PROVIDERS_KEY,
        JSON.stringify(this.storageProviders)
      );
    } catch (error) {
      console.error("Failed to save storage providers:", error);
    }
  }

  /**
   * Ensure providers are loaded.
   */
  private ensureLoaded(): void {
    if (!this.isClient()) return;

    if (this.storageProviders.length === 0 && !this.activeProvider) {
      this.loadStorageProviders();
    }
  }

  /**
   * Add a new storage provider.
   *
   * Args:
   *     provider: StorageProvider to add.
   */
  async addStorageProvider(provider: StorageProvider): Promise<void> {
    this.ensureLoaded();

    try {
      if (provider.isActive) {
        this.storageProviders.forEach((p) => (p.isActive = false));
      }

      this.storageProviders.push(provider);
      this.saveStorageProviders();

      if (provider.type === "webdav" && provider.config) {
        this.webDAVStorage = new WebDAVStorage();
        await this.webDAVStorage.initialize(provider.config);
      }

      this.activeProvider = provider;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to add storage provider: ${msg}`);
    }
  }

  /**
   * Get all storage providers.
   *
   * Returns:
   *     Array of StorageProvider objects.
   */
  getStorageProviders(): StorageProvider[] {
    this.ensureLoaded();
    return [...this.storageProviders];
  }

  /**
   * Get the active storage provider.
   *
   * Returns:
   *     Active StorageProvider or null.
   */
  getActiveProvider(): StorageProvider | null {
    this.ensureLoaded();
    return this.activeProvider;
  }

  /**
   * Delete a storage provider.
   *
   * Args:
   *     providerId: ID of the provider to delete.
   */
  deleteStorageProvider(providerId: string): void {
    this.ensureLoaded();

    const index = this.storageProviders.findIndex((p) => p.id === providerId);
    if (index === -1) {
      throw new Error("Storage provider not found");
    }

    const provider = this.storageProviders[index];

    if (provider.isActive) {
      this.activeProvider = null;
      this.webDAVStorage = null;
    }

    this.storageProviders.splice(index, 1);
    this.saveStorageProviders();
  }

  /**
   * Set the active storage provider.
   *
   * Args:
   *     providerId: ID of the provider to activate.
   */
  async setActiveProvider(providerId: string): Promise<void> {
    this.ensureLoaded();

    const provider = this.storageProviders.find((p) => p.id === providerId);
    if (!provider) {
      throw new Error("Storage provider not found");
    }

    try {
      this.storageProviders.forEach((p) => (p.isActive = false));
      provider.isActive = true;
      this.activeProvider = provider;

      if (provider.type === "webdav" && provider.config) {
        this.webDAVStorage = new WebDAVStorage();
        await this.webDAVStorage.initialize(provider.config);
      } else {
        this.webDAVStorage = null;
      }

      this.saveStorageProviders();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to set active provider: ${msg}`);
    }
  }

  /**
   * Sync a file to remote storage.
   *
   * Args:
   *     fileData: FileData to sync.
   */
  async syncFile(fileData: FileData): Promise<void> {
    if (
      !this.webDAVStorage ||
      !this.activeProvider ||
      this.activeProvider.type !== "webdav"
    ) {
      return;
    }

    try {
      await this.webDAVStorage.uploadFileData(fileData);
    } catch (error) {
      console.error("Failed to sync file:", error);
      throw error;
    }
  }

  /**
   * Download a file from remote storage.
   *
   * Args:
   *     fileId: ID of the file to download.
   *
   * Returns:
   *     FileData or null.
   */
  async downloadFile(fileId: string): Promise<FileData | null> {
    if (
      !this.webDAVStorage ||
      !this.activeProvider ||
      this.activeProvider.type !== "webdav"
    ) {
      return null;
    }

    try {
      return await this.webDAVStorage.downloadFileData(fileId);
    } catch (error) {
      console.error("Failed to download file:", error);
      throw error;
    }
  }

  /**
   * Sync bookmarks to remote storage.
   *
   * Args:
   *     bookmarks: Array of BookmarkCollection to sync.
   */
  async syncBookmarks(bookmarks: BookmarkCollection[]): Promise<void> {
    if (
      !this.webDAVStorage ||
      !this.activeProvider ||
      this.activeProvider.type !== "webdav"
    ) {
      return;
    }

    try {
      await this.webDAVStorage.uploadBookmarks(bookmarks);
    } catch (error) {
      console.error("Failed to sync bookmarks:", error);
      throw error;
    }
  }

  /**
   * Check WebDAV connection status.
   *
   * Returns:
   *     True if connected, false otherwise.
   */
  async checkWebDAVConnection(): Promise<boolean> {
    if (
      !this.webDAVStorage ||
      !this.activeProvider ||
      this.activeProvider.type !== "webdav"
    ) {
      return false;
    }

    try {
      return await this.webDAVStorage.testConnection();
    } catch (error) {
      console.error("WebDAV connection check failed:", error);
      return false;
    }
  }
}
