"use client";

/**
 * StorageProviderModal Component for FlashNote.
 *
 * Modal dialog for configuring WebDAV storage providers.
 *
 * Example:
 *     <StorageProviderModal
 *         isOpen={showStorageModal}
 *         onClose={() => setShowStorageModal(false)}
 *         onProviderChange={(provider) => handleProviderChange(provider)}
 *     />
 */

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import {
  CloudIcon,
  ComputerDesktopIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";
import { WebDAVConfig, StorageProvider } from "@/types/flashnote";
import { StorageManager } from "@/utils/webdav";

interface StorageProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChange?: (provider: StorageProvider | null) => void;
}

/**
 * Storage provider configuration modal.
 *
 * Args:
 *     isOpen: Whether the modal is open.
 *     onClose: Callback to close the modal.
 *     onProviderChange: Callback when provider changes.
 */
export function StorageProviderModal({
  isOpen,
  onClose,
  onProviderChange,
}: StorageProviderModalProps) {
  const [storageManager] = useState(() => new StorageManager());
  const [providers, setProviders] = useState<StorageProvider[]>([]);
  const [activeProvider, setActiveProvider] =
    useState<StorageProvider | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // WebDAV config form state
  const [webdavConfig, setWebdavConfig] = useState<Omit<WebDAVConfig, "id">>({
    name: "",
    serverUrl: "",
    username: "",
    password: "",
    basePath: "/flashnote",
    syncInterval: 300000,
    useProxy: true,
  });

  /**
   * Load providers when modal opens.
   */
  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  /**
   * Load storage providers from manager.
   */
  const loadProviders = () => {
    const allProviders = storageManager.getStorageProviders();
    const currentActive = storageManager.getActiveProvider();
    setProviders(allProviders);
    setActiveProvider(currentActive);
  };

  /**
   * Handle adding a new WebDAV provider.
   */
  const handleAddProvider = async () => {
    if (
      !webdavConfig.name ||
      !webdavConfig.serverUrl ||
      !webdavConfig.username
    ) {
      setConnectionError("Please fill in all required fields");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const newProvider: StorageProvider = {
        id: Date.now().toString(),
        name: webdavConfig.name,
        type: "webdav",
        config: {
          ...webdavConfig,
          id: Date.now().toString(),
        },
        isActive: false,
      };

      await storageManager.addStorageProvider(newProvider);
      loadProviders();
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Connection failed"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Handle setting active provider.
   */
  const handleSetActiveProvider = async (providerId: string) => {
    try {
      await storageManager.setActiveProvider(providerId);
      loadProviders();
      onProviderChange?.(storageManager.getActiveProvider());
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Failed to set provider"
      );
    }
  };

  /**
   * Handle deleting a provider.
   */
  const handleDeleteProvider = (providerId: string) => {
    if (confirm("Are you sure you want to delete this storage provider?")) {
      try {
        storageManager.deleteStorageProvider(providerId);
        loadProviders();
        onProviderChange?.(storageManager.getActiveProvider());
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Failed to delete provider"
        );
      }
    }
  };

  /**
   * Reset the add form.
   */
  const resetForm = () => {
    setWebdavConfig({
      name: "",
      serverUrl: "",
      username: "",
      password: "",
      basePath: "/flashnote",
      syncInterval: 300000,
      useProxy: true,
    });
    setConnectionError(null);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          style={{
            maxWidth: 640,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            backgroundColor: "var(--fn-background, var(--background))",
            borderRadius: 16,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 24,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <Dialog.Title
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--fn-foreground, var(--foreground))",
              }}
            >
              Storage Settings
            </Dialog.Title>
            <button
              onClick={onClose}
              style={{
                padding: 8,
                color: "var(--fn-secondary, var(--secondary))",
              }}
            >
              <XMarkIcon style={{ width: 24, height: 24 }} />
            </button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Active Provider */}
            {activeProvider && (
              <div
                style={{
                  marginBottom: 24,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <CheckIcon
                    style={{
                      width: 20,
                      height: 20,
                      color: "#22c55e",
                      marginRight: 8,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#22c55e",
                      }}
                    >
                      Active Provider
                    </p>
                    <p style={{ fontSize: 13, color: "#22c55e", opacity: 0.8 }}>
                      {activeProvider.name} (
                      {activeProvider.type === "webdav"
                        ? "WebDAV"
                        : "Local Storage"}
                      )
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Provider List */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--fn-foreground, var(--foreground))",
                  }}
                >
                  Storage Providers
                </h3>
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    fontSize: 13,
                    backgroundColor: "var(--fn-primary, var(--accent))",
                    color: "var(--fn-primary-foreground, white)",
                    borderRadius: 8,
                  }}
                >
                  <PlusIcon style={{ width: 16, height: 16 }} />
                  Add
                </button>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {/* Local Storage - Default */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <ComputerDesktopIcon
                      style={{
                        width: 20,
                        height: 20,
                        color: "var(--fn-secondary, var(--secondary))",
                        marginRight: 12,
                      }}
                    />
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--fn-foreground, var(--foreground))",
                        }}
                      >
                        Local Storage
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--fn-secondary, var(--secondary))",
                        }}
                      >
                        Browser local storage
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSetActiveProvider("local")}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      borderRadius: 6,
                      backgroundColor:
                        activeProvider?.type === "local" || !activeProvider
                          ? "var(--fn-primary, var(--accent))"
                          : "var(--fn-secondary-background, var(--border))",
                      color:
                        activeProvider?.type === "local" || !activeProvider
                          ? "var(--fn-primary-foreground, white)"
                          : "var(--fn-foreground, var(--foreground))",
                    }}
                  >
                    {!activeProvider
                      ? "Default"
                      : activeProvider.type === "local"
                        ? "Active"
                        : "Switch"}
                  </button>
                </div>

                {/* WebDAV Providers */}
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      <CloudIcon
                        style={{
                          width: 20,
                          height: 20,
                          color: "var(--fn-secondary, var(--secondary))",
                          marginRight: 12,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--fn-foreground, var(--foreground))",
                          }}
                        >
                          {provider.name}
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--fn-secondary, var(--secondary))",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {provider.config?.serverUrl}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => handleSetActiveProvider(provider.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          borderRadius: 6,
                          backgroundColor:
                            activeProvider?.id === provider.id
                              ? "var(--fn-primary, var(--accent))"
                              : "var(--fn-secondary-background, var(--border))",
                          color:
                            activeProvider?.id === provider.id
                              ? "var(--fn-primary-foreground, white)"
                              : "var(--fn-foreground, var(--foreground))",
                        }}
                      >
                        {activeProvider?.id === provider.id
                          ? "Active"
                          : "Switch"}
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        style={{
                          padding: 4,
                          color: "var(--fn-secondary, var(--secondary))",
                        }}
                      >
                        <TrashIcon style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add WebDAV Form */}
            {showAddForm && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  marginBottom: 24,
                }}
              >
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 16,
                    color: "var(--fn-foreground, var(--foreground))",
                  }}
                >
                  Add WebDAV Storage
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--fn-foreground, var(--foreground))",
                      }}
                    >
                      Name *
                    </label>
                    <input
                      type="text"
                      value={webdavConfig.name}
                      onChange={(e) =>
                        setWebdavConfig({
                          ...webdavConfig,
                          name: e.target.value,
                        })
                      }
                      placeholder="My WebDAV Server"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        backgroundColor:
                          "var(--fn-card-background, var(--tertiary))",
                        color: "var(--fn-foreground, var(--foreground))",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--fn-foreground, var(--foreground))",
                      }}
                    >
                      Server URL *
                    </label>
                    <input
                      type="url"
                      value={webdavConfig.serverUrl}
                      onChange={(e) =>
                        setWebdavConfig({
                          ...webdavConfig,
                          serverUrl: e.target.value,
                        })
                      }
                      placeholder="https://example.com/webdav"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        backgroundColor:
                          "var(--fn-card-background, var(--tertiary))",
                        color: "var(--fn-foreground, var(--foreground))",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--fn-foreground, var(--foreground))",
                      }}
                    >
                      Username *
                    </label>
                    <input
                      type="text"
                      value={webdavConfig.username}
                      onChange={(e) =>
                        setWebdavConfig({
                          ...webdavConfig,
                          username: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        backgroundColor:
                          "var(--fn-card-background, var(--tertiary))",
                        color: "var(--fn-foreground, var(--foreground))",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--fn-foreground, var(--foreground))",
                      }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      value={webdavConfig.password}
                      onChange={(e) =>
                        setWebdavConfig({
                          ...webdavConfig,
                          password: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        backgroundColor:
                          "var(--fn-card-background, var(--tertiary))",
                        color: "var(--fn-foreground, var(--foreground))",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "var(--fn-foreground, var(--foreground))",
                      }}
                    >
                      Base Path
                    </label>
                    <input
                      type="text"
                      value={webdavConfig.basePath}
                      onChange={(e) =>
                        setWebdavConfig({
                          ...webdavConfig,
                          basePath: e.target.value,
                        })
                      }
                      placeholder="/flashnote"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        backgroundColor:
                          "var(--fn-card-background, var(--tertiary))",
                        color: "var(--fn-foreground, var(--foreground))",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={webdavConfig.useProxy}
                        onChange={(e) =>
                          setWebdavConfig({
                            ...webdavConfig,
                            useProxy: e.target.checked,
                          })
                        }
                        style={{ width: 16, height: 16 }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--fn-foreground, var(--foreground))",
                        }}
                      >
                        Use local proxy (for CORS bypass)
                      </span>
                    </label>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--fn-secondary, var(--secondary))",
                        marginTop: 4,
                        marginLeft: 24,
                      }}
                    >
                      Requires local proxy server on port 3002
                    </p>
                  </div>

                  {connectionError && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#ef4444",
                      }}
                    >
                      {connectionError}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        color: "var(--fn-secondary, var(--secondary))",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProvider}
                      disabled={isConnecting}
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        backgroundColor: "var(--fn-primary, var(--accent))",
                        color: "var(--fn-primary-foreground, white)",
                        borderRadius: 8,
                        opacity: isConnecting ? 0.5 : 1,
                      }}
                    >
                      {isConnecting ? "Connecting..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Usage Info */}
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#3b82f6",
                  marginBottom: 8,
                }}
              >
                Usage Guide
              </h4>
              <ul
                style={{
                  fontSize: 13,
                  color: "#3b82f6",
                  opacity: 0.8,
                  listStyleType: "disc",
                  paddingLeft: 20,
                }}
              >
                <li>Local Storage: Data saved in browser, no network needed</li>
                <li>WebDAV: Sync to WebDAV server for multi-device access</li>
                <li>Switch providers anytime, data syncs automatically</li>
                <li>WebDAV credentials are stored locally and encrypted</li>
              </ul>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
