/**
 * Unified Design System - Google-style colors with Doubao layout.
 *
 * This module provides consistent design tokens, colors, and styles
 * across all pages of the edu-ai-platform.
 *
 * Design Philosophy:
 * - Google-style color palette (clean blues, grays)
 * - Doubao layout pattern (centered hero, chips, bottom input)
 * - Consistent spacing, typography, and animations
 *
 * Example:
 *     import { colors, shadows, animations } from '@/styles/design-system';
 *
 *     <div style={{ backgroundColor: colors.background }}>
 *       <button style={{ background: colors.primary }}>Click</button>
 *     </div>
 */

/** Primary color palette - Google-inspired blues and grays */
export const colors = {
  // Primary blue (Google blue)
  primary: "#1a73e8",
  primaryHover: "#1557b0",
  primaryLight: "rgba(26, 115, 232, 0.1)",
  primaryLighter: "rgba(26, 115, 232, 0.05)",

  // Secondary colors
  secondary: "#5f6368",
  secondaryLight: "#80868b",

  // Backgrounds
  background: "#ffffff",
  backgroundGradient: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  surface: "#ffffff",
  surfaceHover: "#f8fafc",

  // Borders
  border: "#e8eaed",
  borderLight: "#f1f3f4",
  borderFocus: "#1a73e8",

  // Text
  textPrimary: "#202124",
  textSecondary: "#5f6368",
  textTertiary: "#80868b",
  textDisabled: "#9aa0a6",

  // Status colors
  success: "#34a853",
  successLight: "rgba(52, 168, 83, 0.1)",
  warning: "#fbbc04",
  warningLight: "rgba(251, 188, 4, 0.1)",
  error: "#ea4335",
  errorLight: "rgba(234, 67, 53, 0.1)",
  info: "#4285f4",
  infoLight: "rgba(66, 133, 244, 0.1)",

  // Tool-specific accent colors
  videoPdf: "#ea4335",    // Red for video
  flashNote: "#34a853",   // Green for notes
  manim: "#9334e9",       // Purple for math
} as const;

/** Shadow styles */
export const shadows = {
  sm: "0 1px 2px rgba(60, 64, 67, 0.1)",
  md: "0 2px 6px rgba(60, 64, 67, 0.15)",
  lg: "0 4px 12px rgba(60, 64, 67, 0.15)",
  xl: "0 8px 24px rgba(60, 64, 67, 0.15)",
  card: "0 1px 3px rgba(60, 64, 67, 0.08), 0 4px 8px rgba(60, 64, 67, 0.08)",
  cardHover: "0 2px 8px rgba(60, 64, 67, 0.12), 0 8px 16px rgba(60, 64, 67, 0.12)",
  input: "0 1px 3px rgba(60, 64, 67, 0.1)",
  inputFocus: "0 1px 3px rgba(26, 115, 232, 0.3)",
} as const;

/** Border radius values */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
  chip: 20,
  card: 12,
  button: 8,
  input: 8,
} as const;

/** Spacing scale (in pixels) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Typography styles */
export const typography = {
  // Font family
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, " +
    "'Helvetica Neue', Arial, sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",

  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

/** Animation keyframes (CSS string) */
export const animationKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

/** Animation timing values */
export const animations = {
  duration: {
    fast: "0.15s",
    normal: "0.2s",
    slow: "0.3s",
  },
  easing: {
    default: "ease",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

/** Common component styles */
export const componentStyles = {
  /** Page container style */
  pageContainer: {
    minHeight: "100vh",
    background: colors.backgroundGradient,
    display: "flex",
    flexDirection: "column" as const,
  },

  /** Header style */
  header: {
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${colors.borderLight}`,
    backgroundColor: colors.background,
  },

  /** Back button style */
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: radius.md,
    transition: `all ${animations.duration.fast}`,
  },

  /** Card style */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.card,
    transition: `all ${animations.duration.normal}`,
  },

  /** Chip/pill button style */
  chip: {
    padding: "10px 18px",
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.chip,
    color: colors.textPrimary,
    fontSize: typography.fontSize.md,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: `all ${animations.duration.fast}`,
    boxShadow: shadows.sm,
  },

  /** Primary button style */
  buttonPrimary: {
    padding: "12px 24px",
    backgroundColor: colors.primary,
    color: "#ffffff",
    border: "none",
    borderRadius: radius.button,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    cursor: "pointer",
    transition: `all ${animations.duration.fast}`,
  },

  /** Secondary button style */
  buttonSecondary: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    color: colors.primary,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.button,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    cursor: "pointer",
    transition: `all ${animations.duration.fast}`,
  },

  /** Input field style */
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.input,
    outline: "none",
    transition: `all ${animations.duration.fast}`,
  },

  /** Bottom fixed input area */
  bottomInputArea: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: "16px 20px 24px",
    background: "linear-gradient(180deg, transparent 0%, white 30%)",
  },

  /** Input container (chat-style) */
  inputContainer: {
    maxWidth: 680,
    margin: "0 auto",
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.lg,
    overflow: "hidden",
  },
} as const;

/**
 * Get tool-specific accent color.
 *
 * @param tool - Tool identifier
 * @returns Accent color for the tool
 *
 * Example:
 *     getToolColor('manim') // returns '#9334e9'
 */
export function getToolColor(
  tool: "video-pdf" | "flashnote" | "manim" | "default"
): string {
  switch (tool) {
    case "video-pdf":
      return colors.videoPdf;
    case "flashnote":
      return colors.flashNote;
    case "manim":
      return colors.manim;
    default:
      return colors.primary;
  }
}

/**
 * Get tool-specific gradient.
 *
 * @param tool - Tool identifier
 * @returns CSS gradient string
 */
export function getToolGradient(
  tool: "video-pdf" | "flashnote" | "manim" | "default"
): string {
  switch (tool) {
    case "video-pdf":
      return "linear-gradient(135deg, #ea4335 0%, #ff6d5a 100%)";
    case "flashnote":
      return "linear-gradient(135deg, #34a853 0%, #4ecb71 100%)";
    case "manim":
      return "linear-gradient(135deg, #9334e9 0%, #c084fc 100%)";
    default:
      return "linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)";
  }
}
