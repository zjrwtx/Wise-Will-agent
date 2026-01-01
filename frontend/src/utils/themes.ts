/**
 * Theme System for FlashNote.
 *
 * Provides multiple color themes for the application with
 * support for persistence and dynamic switching.
 *
 * Example:
 *     import { themes, applyTheme } from "@/utils/themes";
 *     applyTheme(themes[0]); // Apply "Classic Black" theme
 */

import { Theme } from "@/types/flashnote";

/**
 * Available themes for the application.
 *
 * Each theme includes colors for:
 * - background/foreground: Main app colors
 * - cardBackground: Card surface color
 * - primary/accent: Highlight colors
 * - secondary/muted: Subdued text colors
 * - destructive: Error/delete action color
 */
export const themes: Theme[] = [
  {
    name: "Classic Black",
    colors: {
      background: "#000000",
      foreground: "#ffffff",
      cardBackground: "#1c1c1e",
      secondaryBackground: "#2c2c2e",
      primary: "#0a84ff",
      primaryForeground: "#ffffff",
      secondary: "#636366",
      accent: "#30d158",
      destructive: "#ff453a",
      muted: "#8e8e93",
    },
  },
  {
    name: "Fresh Green",
    colors: {
      background: "#f0fff4",
      foreground: "#234e52",
      cardBackground: "#ffffff",
      secondaryBackground: "#e6fffa",
      primary: "#38b2ac",
      primaryForeground: "#ffffff",
      secondary: "#718096",
      accent: "#48bb78",
      destructive: "#f56565",
      muted: "#a0aec0",
    },
  },
  {
    name: "Dream Purple",
    colors: {
      background: "#faf5ff",
      foreground: "#44337a",
      cardBackground: "#ffffff",
      secondaryBackground: "#f3ebff",
      primary: "#805ad5",
      primaryForeground: "#ffffff",
      secondary: "#718096",
      accent: "#9f7aea",
      destructive: "#f56565",
      muted: "#a0aec0",
    },
  },
  {
    name: "Vibrant Orange",
    colors: {
      background: "#fffaf0",
      foreground: "#7b341e",
      cardBackground: "#ffffff",
      secondaryBackground: "#fff5eb",
      primary: "#ed8936",
      primaryForeground: "#ffffff",
      secondary: "#718096",
      accent: "#f6ad55",
      destructive: "#f56565",
      muted: "#a0aec0",
    },
  },
  {
    name: "Ocean Blue",
    colors: {
      background: "#ebf8ff",
      foreground: "#2a4365",
      cardBackground: "#ffffff",
      secondaryBackground: "#e6f6ff",
      primary: "#4299e1",
      primaryForeground: "#ffffff",
      secondary: "#718096",
      accent: "#63b3ed",
      destructive: "#f56565",
      muted: "#a0aec0",
    },
  },
];

/**
 * Storage key for persisting theme preference.
 */
export const THEME_STORAGE_KEY = "flashnote-theme";

/**
 * Apply a theme to the document.
 *
 * Sets CSS custom properties on the root element for each color.
 * Also persists the theme name to localStorage.
 *
 * Args:
 *     theme: Theme object to apply.
 *
 * Example:
 *     applyTheme(themes[2]); // Apply "Dream Purple"
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssVar = `--fn-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });

  // Persist theme preference
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, theme.name);
  }
}

/**
 * Load saved theme from localStorage.
 *
 * Returns:
 *     Saved Theme object or the first theme as default.
 *
 * Example:
 *     const theme = loadSavedTheme();
 *     applyTheme(theme);
 */
export function loadSavedTheme(): Theme {
  if (typeof localStorage === "undefined") {
    return themes[0];
  }

  const savedName = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedName) {
    const theme = themes.find((t) => t.name === savedName);
    if (theme) return theme;
  }

  return themes[0];
}

/**
 * Get theme by name.
 *
 * Args:
 *     name: Theme name to find.
 *
 * Returns:
 *     Theme object or undefined if not found.
 *
 * Example:
 *     const theme = getThemeByName("Ocean Blue");
 */
export function getThemeByName(name: string): Theme | undefined {
  return themes.find((t) => t.name === name);
}
