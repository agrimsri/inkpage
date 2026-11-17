import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

/**
 * Apple Design Language Design Tokens (macOS / iPadOS inspired)
 * Strictly adheres to typeui-fundamentals:
 * - 4-point spacing grid
 * - Proximity grouping & inner vs outer padding rules
 * - WCAG AA / AAA contrast compliance
 * - SF Pro typographic hierarchy
 * - Calculated nested border radii (innerRadius = outerRadius - padding)
 * - Matched control heights & balanced icon insets
 * - Complete macOS Dark Mode support with deep dark surfaces, soft border highlights, and vibrant accents
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Primary surfaces
  bgCanvas: string;
  bgWindow: string;
  bgSidebar: string;
  bgSidebarRail: string;
  bgCard: string;
  bgCardHover: string;
  bgCardActive: string;
  bgSubtle: string;
  bgSubtleHover: string;
  bgSubtleActive: string;

  // Translucency & Glassmorphism
  glassBg: string;
  glassDarkBg: string;
  modalOverlay: string;

  // Text & Labels (WCAG AA/AAA compliant)
  labelPrimary: string;
  labelSecondary: string;
  labelTertiary: string;
  labelQuaternary: string;
  labelOnAccent: string;

  // Borders & Hairlines
  borderSubtle: string;
  borderMedium: string;
  borderHeavy: string;
  borderDarkSubtle: string;

  // Accent & Semantic System Colors
  accent: string;
  accentHover: string;
  accentActive: string;
  accentTint: string;
  accentTintHover: string;
  accentFocusRing: string;

  destructive: string;
  destructiveHover: string;
  destructiveTint: string;
  destructiveTintHover: string;

  success: string;
  successTint: string;

  warning: string;
  warningTint: string;

  purple: string;
  purpleTint: string;
}

export interface ThemeShadows {
  subtle: string;
  control: string;
  card: string;
  popover: string;
  modal: string;
  segmented: string;
}

/**
 * Apple macOS Light Theme Colors
 */
export const appleLightThemeColors: ThemeColors = {
  bgCanvas: '#ffffff',
  bgWindow: '#f5f5f7',
  bgSidebar: '#f6f6f8',
  bgSidebarRail: '#1c1c1e',
  bgCard: '#ffffff',
  bgCardHover: '#f5f5f7',
  bgCardActive: '#e5e5ea',
  bgSubtle: 'rgba(0, 0, 0, 0.04)',
  bgSubtleHover: 'rgba(0, 0, 0, 0.07)',
  bgSubtleActive: 'rgba(0, 0, 0, 0.12)',

  glassBg: 'rgba(255, 255, 255, 0.82)',
  glassDarkBg: 'rgba(28, 28, 30, 0.85)',
  modalOverlay: 'rgba(0, 0, 0, 0.36)',

  labelPrimary: '#1d1d1f',
  labelSecondary: '#555558',
  labelTertiary: '#6c6c70',
  labelQuaternary: '#8e8e93',
  labelOnAccent: '#ffffff',

  borderSubtle: 'rgba(0, 0, 0, 0.07)',
  borderMedium: 'rgba(0, 0, 0, 0.13)',
  borderHeavy: 'rgba(0, 0, 0, 0.22)',
  borderDarkSubtle: 'rgba(255, 255, 255, 0.12)',

  accent: '#0066cc',
  accentHover: '#0071e3',
  accentActive: '#0055b3',
  accentTint: 'rgba(0, 102, 204, 0.08)',
  accentTintHover: 'rgba(0, 102, 204, 0.14)',
  accentFocusRing: 'rgba(0, 102, 204, 0.28)',

  destructive: '#d70015',
  destructiveHover: '#b50012',
  destructiveTint: 'rgba(215, 0, 21, 0.08)',
  destructiveTintHover: 'rgba(215, 0, 21, 0.14)',

  success: '#1a7f37',
  successTint: 'rgba(26, 127, 55, 0.09)',

  warning: '#9e5900',
  warningTint: 'rgba(158, 89, 0, 0.09)',

  purple: '#8944ab',
  purpleTint: 'rgba(137, 68, 171, 0.09)',
};

/**
 * Apple macOS Dark Theme Colors (Deep dark surfaces, soft borders, vibrant accents)
 */
export const appleDarkThemeColors: ThemeColors = {
  bgCanvas: '#1c1c1e',
  bgWindow: '#141416',
  bgSidebar: '#1a1a1c',
  bgSidebarRail: '#121214',
  bgCard: '#252528',
  bgCardHover: '#2c2c2e',
  bgCardActive: '#36363a',
  bgSubtle: 'rgba(255, 255, 255, 0.06)',
  bgSubtleHover: 'rgba(255, 255, 255, 0.10)',
  bgSubtleActive: 'rgba(255, 255, 255, 0.16)',

  glassBg: 'rgba(32, 32, 36, 0.85)',
  glassDarkBg: 'rgba(18, 18, 20, 0.90)',
  modalOverlay: 'rgba(0, 0, 0, 0.65)',

  labelPrimary: '#f5f5f7',
  labelSecondary: '#a1a1a6',
  labelTertiary: '#8e8e93',
  labelQuaternary: '#636366',
  labelOnAccent: '#ffffff',

  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.14)',
  borderHeavy: 'rgba(255, 255, 255, 0.24)',
  borderDarkSubtle: 'rgba(255, 255, 255, 0.08)',

  accent: '#2997ff',
  accentHover: '#40a9ff',
  accentActive: '#147ce5',
  accentTint: 'rgba(41, 151, 255, 0.16)',
  accentTintHover: 'rgba(41, 151, 255, 0.26)',
  accentFocusRing: 'rgba(41, 151, 255, 0.38)',

  destructive: '#ff453a',
  destructiveHover: '#ff6961',
  destructiveTint: 'rgba(255, 69, 58, 0.16)',
  destructiveTintHover: 'rgba(255, 69, 58, 0.26)',

  success: '#32d74b',
  successTint: 'rgba(50, 215, 75, 0.16)',

  warning: '#ffd60a',
  warningTint: 'rgba(255, 214, 10, 0.16)',

  purple: '#bf5af2',
  purpleTint: 'rgba(191, 90, 242, 0.16)',
};

export const appleLightShadows: ThemeShadows = {
  subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
  control: '0 1px 2px rgba(0, 0, 0, 0.06)',
  card: '0 2px 8px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.08)',
  popover: '0 10px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
  modal: '0 24px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)',
  segmented: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0.5px 1px rgba(0, 0, 0, 0.06)',
};

export const appleDarkShadows: ThemeShadows = {
  subtle: '0 1px 2px rgba(0, 0, 0, 0.25)',
  control: '0 1px 2px rgba(0, 0, 0, 0.35)',
  card: '0 2px 8px rgba(0, 0, 0, 0.40), 0 0 1px rgba(255, 255, 255, 0.08)',
  popover: '0 12px 32px rgba(0, 0, 0, 0.60), 0 0 0 1px rgba(255, 255, 255, 0.10)',
  modal: '0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.12)',
  segmented: '0 1px 3px rgba(0, 0, 0, 0.40), 0 0.5px 1px rgba(255, 255, 255, 0.06)',
};

/**
 * Universal Theme Tokens
 * Colors and shadows dynamically bind to CSS variables with light theme fallbacks,
 * enabling instantaneous zero-flicker theme switching across all components.
 */
export const appleTheme = {
  colors: {
    bgCanvas: 'var(--color-bg-canvas, #ffffff)',
    bgWindow: 'var(--color-bg-window, #f5f5f7)',
    bgSidebar: 'var(--color-bg-sidebar, #f6f6f8)',
    bgSidebarRail: 'var(--color-bg-sidebar-rail, #1c1c1e)',
    bgCard: 'var(--color-bg-card, #ffffff)',
    bgCardHover: 'var(--color-bg-card-hover, #f5f5f7)',
    bgCardActive: 'var(--color-bg-card-active, #e5e5ea)',
    bgSubtle: 'var(--color-bg-subtle, rgba(0, 0, 0, 0.04))',
    bgSubtleHover: 'var(--color-bg-subtle-hover, rgba(0, 0, 0, 0.07))',
    bgSubtleActive: 'var(--color-bg-subtle-active, rgba(0, 0, 0, 0.12))',

    glassBg: 'var(--color-glass-bg, rgba(255, 255, 255, 0.82))',
    glassDarkBg: 'var(--color-glass-dark-bg, rgba(28, 28, 30, 0.85))',
    modalOverlay: 'var(--color-modal-overlay, rgba(0, 0, 0, 0.36))',

    labelPrimary: 'var(--color-label-primary, #1d1d1f)',
    labelSecondary: 'var(--color-label-secondary, #555558)',
    labelTertiary: 'var(--color-label-tertiary, #6c6c70)',
    labelQuaternary: 'var(--color-label-quaternary, #8e8e93)',
    labelOnAccent: 'var(--color-label-on-accent, #ffffff)',

    borderSubtle: 'var(--color-border-subtle, rgba(0, 0, 0, 0.07))',
    borderMedium: 'var(--color-border-medium, rgba(0, 0, 0, 0.13))',
    borderHeavy: 'var(--color-border-heavy, rgba(0, 0, 0, 0.22))',
    borderDarkSubtle: 'var(--color-border-dark-subtle, rgba(255, 255, 255, 0.12))',

    accent: 'var(--color-accent, #0066cc)',
    accentHover: 'var(--color-accent-hover, #0071e3)',
    accentActive: 'var(--color-accent-active, #0055b3)',
    accentTint: 'var(--color-accent-tint, rgba(0, 102, 204, 0.08))',
    accentTintHover: 'var(--color-accent-tint-hover, rgba(0, 102, 204, 0.14))',
    accentFocusRing: 'var(--color-accent-focus-ring, rgba(0, 102, 204, 0.28))',

    destructive: 'var(--color-destructive, #d70015)',
    destructiveHover: 'var(--color-destructive-hover, #b50012)',
    destructiveTint: 'var(--color-destructive-tint, rgba(215, 0, 21, 0.08))',
    destructiveTintHover: 'var(--color-destructive-tint-hover, rgba(215, 0, 21, 0.14))',

    success: 'var(--color-success, #1a7f37)',
    successTint: 'var(--color-success-tint, rgba(26, 127, 55, 0.09))',

    warning: 'var(--color-warning, #9e5900)',
    warningTint: 'var(--color-warning-tint, rgba(158, 89, 0, 0.09))',

    purple: 'var(--color-purple, #8944ab)',
    purpleTint: 'var(--color-purple-tint, rgba(137, 68, 171, 0.09))',
  },

  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
  },

  radii: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 22,
    pill: 9999,
  },

  shadows: {
    subtle: 'var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04))',
    control: 'var(--shadow-control, 0 1px 2px rgba(0, 0, 0, 0.06))',
    card: 'var(--shadow-card, 0 2px 8px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.08))',
    popover: 'var(--shadow-popover, 0 10px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06))',
    modal: 'var(--shadow-modal, 0 24px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08))',
    segmented: 'var(--shadow-segmented, 0 1px 3px rgba(0, 0, 0, 0.08), 0 0.5px 1px rgba(0, 0, 0, 0.06))',
  },

  transitions: {
    fast: 'all 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
    normal: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

/**
 * CSS Variables Generator for Document Injection
 */
export function generateThemeCss(): string {
  const lightColorVars = Object.entries(appleLightThemeColors)
    .map(([key, value]) => `  --color-${toKebabCase(key)}: ${value};`)
    .join('\n');
  const lightShadowVars = Object.entries(appleLightShadows)
    .map(([key, value]) => `  --shadow-${toKebabCase(key)}: ${value};`)
    .join('\n');

  const darkColorVars = Object.entries(appleDarkThemeColors)
    .map(([key, value]) => `  --color-${toKebabCase(key)}: ${value};`)
    .join('\n');
  const darkShadowVars = Object.entries(appleDarkShadows)
    .map(([key, value]) => `  --shadow-${toKebabCase(key)}: ${value};`)
    .join('\n');

  return `
:root, [data-theme='light'] {
${lightColorVars}
${lightShadowVars}
  --color-rule-line: rgba(0, 0, 0, 0.08);
  --select-arrow-icon: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236e6e73' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  --scrollbar-thumb: rgba(0, 0, 0, 0.16);
  --scrollbar-thumb-hover: rgba(0, 0, 0, 0.28);
}

[data-theme='dark'] {
${darkColorVars}
${darkShadowVars}
  --color-rule-line: rgba(255, 255, 255, 0.08);
  --select-arrow-icon: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23a1a1a6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  --scrollbar-thumb: rgba(255, 255, 255, 0.20);
  --scrollbar-thumb-hover: rgba(255, 255, 255, 0.35);
}

/* Ensure smooth theme transition */
html, body, #root {
  background-color: var(--color-bg-window);
  color: var(--color-label-primary);
  transition: background-color 0.2s ease, color 0.2s ease;
}

[data-theme='dark'] ::selection {
  background-color: rgba(41, 151, 255, 0.32);
}

[data-theme='dark'] input::placeholder,
[data-theme='dark'] textarea::placeholder {
  color: var(--color-label-tertiary);
}
`;
}

function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Injects theme CSS tokens into the document head if not already present.
 */
export function injectThemeStyles(): void {
  if (typeof document === 'undefined') return;
  const STYLE_ID = 'inkpage-theme-tokens';
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = generateThemeCss();
    document.head.appendChild(styleEl);
  }
}

// Automatically inject styles upon module initialization in browser environments
if (typeof document !== 'undefined') {
  injectThemeStyles();
}

/**
 * LocalStorage and System Theme Helpers
 */
const THEME_STORAGE_KEY = 'inkpage_theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {}
  return 'system';
}

export function setStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const resolved = resolveTheme(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  }
  return resolved;
}

/**
 * Theme Context and Provider
 */
export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode; defaultTheme?: ThemeMode }> = ({
  children,
  defaultTheme,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return defaultTheme || getStoredTheme();
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    return applyTheme(theme);
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    setStoredTheme(mode);
    const resolved = applyTheme(mode);
    setResolvedTheme(resolved);
  };

  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);

    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        const nextResolved = applyTheme('system');
        setResolvedTheme(nextResolved);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      isDark: resolvedTheme === 'dark',
    }),
    [theme, resolvedTheme]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Reusable Apple-styled CSS property generators
 */
export const appleStyles = {
  // Primary Action Pill / Rounded Button
  primaryButton: (disabled = false, size: 'sm' | 'md' = 'md'): React.CSSProperties => {
    const isSm = size === 'sm';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isSm ? 5 : 6,
      height: isSm ? 28 : 32,
      padding: isSm ? '0 10px' : '0 14px',
      borderRadius: isSm ? appleTheme.radii.sm : appleTheme.radii.md,
      border: 'none',
      backgroundColor: disabled ? appleTheme.colors.labelQuaternary : appleTheme.colors.accent,
      color: appleTheme.colors.labelOnAccent,
      fontFamily: appleTheme.fonts.sans,
      fontSize: isSm ? 12 : 13,
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : appleTheme.shadows.control,
      transition: appleTheme.transitions.fast,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      userSelect: 'none',
      textDecoration: 'none',
    };
  },

  // Secondary Button
  secondaryButton: (disabled = false, size: 'sm' | 'md' = 'md'): React.CSSProperties => {
    const isSm = size === 'sm';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isSm ? 5 : 6,
      height: isSm ? 28 : 32,
      padding: isSm ? '0 10px' : '0 12px',
      borderRadius: isSm ? appleTheme.radii.sm : appleTheme.radii.md,
      border: `1px solid ${appleTheme.colors.borderMedium}`,
      backgroundColor: appleTheme.colors.bgCard,
      color: disabled ? appleTheme.colors.labelQuaternary : appleTheme.colors.labelPrimary,
      fontFamily: appleTheme.fonts.sans,
      fontSize: isSm ? 12 : 13,
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: appleTheme.shadows.subtle,
      transition: appleTheme.transitions.fast,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      userSelect: 'none',
      textDecoration: 'none',
    };
  },

  // Destructive Button
  destructiveButton: (disabled = false, size: 'sm' | 'md' = 'md'): React.CSSProperties => {
    const isSm = size === 'sm';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isSm ? 5 : 6,
      height: isSm ? 28 : 32,
      padding: isSm ? '0 10px' : '0 12px',
      borderRadius: isSm ? appleTheme.radii.sm : appleTheme.radii.md,
      border: `1px solid ${appleTheme.colors.destructiveTint}`,
      backgroundColor: appleTheme.colors.destructiveTint,
      color: disabled ? appleTheme.colors.labelQuaternary : appleTheme.colors.destructive,
      fontFamily: appleTheme.fonts.sans,
      fontSize: isSm ? 12 : 13,
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: appleTheme.transitions.fast,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      userSelect: 'none',
      textDecoration: 'none',
    };
  },

  // Ghost / Toolbar Icon Button
  toolbarButton: (active = false, size = 30): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: size,
    minWidth: size,
    padding: '0 6px',
    borderRadius: appleTheme.radii.sm,
    border: active ? `1px solid ${appleTheme.colors.accentTintHover}` : '1px solid transparent',
    backgroundColor: active ? appleTheme.colors.accentTint : 'transparent',
    color: active ? appleTheme.colors.accent : appleTheme.colors.labelPrimary,
    fontFamily: appleTheme.fonts.sans,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    transition: appleTheme.transitions.fast,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    userSelect: 'none',
    textDecoration: 'none',
  }),

  // Apple Segmented Control Container (Inset Pill Track)
  segmentedControlTrack: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 2,
    backgroundColor: appleTheme.colors.bgSubtle,
    borderRadius: appleTheme.radii.md,
    gap: 2,
    border: `1px solid ${appleTheme.colors.borderSubtle}`,
  } as React.CSSProperties,

  // Apple Segmented Control Item (Pill Button)
  segmentedControlItem: (active = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    borderRadius: appleTheme.radii.sm,
    border: 'none',
    backgroundColor: active ? appleTheme.colors.bgCard : 'transparent',
    color: active ? appleTheme.colors.labelPrimary : appleTheme.colors.labelSecondary,
    boxShadow: active ? appleTheme.shadows.segmented : 'none',
    fontFamily: appleTheme.fonts.sans,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    transition: appleTheme.transitions.fast,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }),

  // Input Field with Balanced Inset
  inputField: {
    height: 32,
    padding: '0 10px',
    borderRadius: appleTheme.radii.md,
    border: `1px solid ${appleTheme.colors.borderMedium}`,
    backgroundColor: appleTheme.colors.bgCard,
    color: appleTheme.colors.labelPrimary,
    fontFamily: appleTheme.fonts.sans,
    fontSize: 13,
    outline: 'none',
    transition: appleTheme.transitions.fast,
    boxSizing: 'border-box',
  } as React.CSSProperties,

  // Select Dropdown with Balanced Inset and Dynamic Theme Arrow
  selectField: {
    height: 30,
    padding: '0 24px 0 8px',
    borderRadius: appleTheme.radii.sm,
    border: `1px solid ${appleTheme.colors.borderMedium}`,
    backgroundColor: appleTheme.colors.bgCard,
    color: appleTheme.colors.labelPrimary,
    fontFamily: appleTheme.fonts.sans,
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
    transition: appleTheme.transitions.fast,
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: 'var(--select-arrow-icon)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
  } as React.CSSProperties,

  // Modal Backdrop
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: appleTheme.colors.modalOverlay,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  } as React.CSSProperties,

  // Modal Card (outerRadius: 16, padding: 24)
  modalCard: {
    backgroundColor: appleTheme.colors.bgCard,
    borderRadius: appleTheme.radii.xl,
    padding: 24,
    boxShadow: appleTheme.shadows.modal,
    border: `1px solid ${appleTheme.colors.borderSubtle}`,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  // Floating Popover Card
  popoverCard: {
    position: 'absolute',
    backgroundColor: appleTheme.colors.bgCard,
    border: `1px solid ${appleTheme.colors.borderMedium}`,
    borderRadius: appleTheme.radii.lg,
    padding: 10,
    boxShadow: appleTheme.shadows.popover,
    zIndex: 1000,
    fontFamily: appleTheme.fonts.sans,
  } as React.CSSProperties,

  // Content-hugging Inline Badge (TypeUI non-negotiable rule: never full width)
  badge: (type: 'default' | 'accent' | 'success' | 'destructive' = 'default'): React.CSSProperties => {
    let bg = appleTheme.colors.bgSubtle;
    let color = appleTheme.colors.labelSecondary;

    if (type === 'accent') {
      bg = appleTheme.colors.accentTint;
      color = appleTheme.colors.accent;
    } else if (type === 'success') {
      bg = appleTheme.colors.successTint;
      color = appleTheme.colors.success;
    } else if (type === 'destructive') {
      bg = appleTheme.colors.destructiveTint;
      color = appleTheme.colors.destructive;
    }

    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      width: 'fit-content',
      maxWidth: 'max-content',
      padding: '2px 8px',
      borderRadius: appleTheme.radii.pill,
      backgroundColor: bg,
      color,
      fontFamily: appleTheme.fonts.sans,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      lineHeight: '16px',
    };
  },
};
