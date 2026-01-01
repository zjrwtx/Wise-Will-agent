"use client";

/**
 * ThemeSelector Component for FlashNote.
 *
 * Displays a grid of available themes for selection.
 *
 * Example:
 *     <ThemeSelector
 *         currentTheme={currentTheme}
 *         onSelectTheme={(theme) => handleThemeChange(theme)}
 *         onClose={() => setShowThemes(false)}
 *     />
 */

import { motion } from "framer-motion";
import { Theme } from "@/types/flashnote";
import { themes } from "@/utils/themes";

interface ThemeSelectorProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onClose: () => void;
}

/**
 * Theme selection panel component.
 *
 * Args:
 *     currentTheme: Currently active theme.
 *     onSelectTheme: Callback when a theme is selected.
 *     onClose: Callback to close the selector.
 */
export function ThemeSelector({
  currentTheme,
  onSelectTheme,
  onClose,
}: ThemeSelectorProps) {
  /**
   * Handle theme selection.
   */
  const handleSelect = (theme: Theme) => {
    onSelectTheme(theme);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: "var(--fn-card-background, var(--tertiary))",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {themes.map((theme) => (
          <button
            key={theme.name}
            onClick={() => handleSelect(theme)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: theme.colors.primary,
                border:
                  theme.name === currentTheme.name
                    ? `3px solid var(--fn-foreground, var(--foreground))`
                    : "2px solid transparent",
                boxShadow:
                  theme.name === currentTheme.name
                    ? "0 4px 12px rgba(0, 0, 0, 0.15)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: theme.name === currentTheme.name ? 600 : 400,
                color:
                  theme.name === currentTheme.name
                    ? "var(--fn-foreground, var(--foreground))"
                    : "var(--fn-secondary, var(--secondary))",
              }}
            >
              {theme.name}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
