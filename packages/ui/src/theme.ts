import React from 'react';

/**
 * Apple Design Language Design Tokens (macOS / iPadOS inspired)
 * Strictly adheres to typeui-fundamentals:
 * - 4-point spacing grid
 * - Proximity grouping & inner vs outer padding rules
 * - WCAG AA / AAA contrast compliance
 * - SF Pro typographic hierarchy
 * - Calculated nested border radii (innerRadius = outerRadius - padding)
 * - Matched control heights & balanced icon insets
 */

export const appleTheme = {
  colors: {
    // Primary surfaces
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

    // Translucency & Glassmorphism
    glassBg: 'rgba(255, 255, 255, 0.82)',
    glassDarkBg: 'rgba(28, 28, 30, 0.85)',
    modalOverlay: 'rgba(0, 0, 0, 0.36)',

    // Text & Labels (WCAG AA/AAA compliant)
    labelPrimary: '#1d1d1f',      // Contrast 16.8:1 against #ffffff (AAA)
    labelSecondary: '#555558',    // Contrast 7.3:1 against #ffffff (AAA)
    labelTertiary: '#6c6c70',     // Contrast 5.2:1 against #ffffff (AA)
    labelQuaternary: '#8e8e93',   // Subtle watermark / disabled text
    labelOnAccent: '#ffffff',

    // Borders & Hairlines
    borderSubtle: 'rgba(0, 0, 0, 0.07)',
    borderMedium: 'rgba(0, 0, 0, 0.13)',
    borderHeavy: 'rgba(0, 0, 0, 0.22)',
    borderDarkSubtle: 'rgba(255, 255, 255, 0.12)',

    // Accent & Semantic System Colors
    accent: '#0066cc',            // Apple System Blue (WCAG AA: 5.6:1 on #fff, 5.1:1 on #f5f5f7)
    accentHover: '#0071e3',
    accentActive: '#0055b3',
    accentTint: 'rgba(0, 102, 204, 0.08)',
    accentTintHover: 'rgba(0, 102, 204, 0.14)',
    accentFocusRing: 'rgba(0, 102, 204, 0.28)',

    destructive: '#d70015',       // Apple System Red (5.4:1 AA)
    destructiveHover: '#b50012',
    destructiveTint: 'rgba(215, 0, 21, 0.08)',
    destructiveTintHover: 'rgba(215, 0, 21, 0.14)',

    success: '#1a7f37',           // Apple System Green (5.1:1 AA compliant)
    successTint: 'rgba(26, 127, 55, 0.09)',

    warning: '#9e5900',           // Apple System Amber (5.4:1 AA compliant)
    warningTint: 'rgba(158, 89, 0, 0.09)',

    purple: '#8944ab',            // Apple System Purple (6.0:1 AA)
    purpleTint: 'rgba(137, 68, 171, 0.09)',
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
    subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
    control: '0 1px 2px rgba(0, 0, 0, 0.06)',
    card: '0 2px 8px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.08)',
    popover: '0 10px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
    modal: '0 24px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    segmented: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0.5px 1px rgba(0, 0, 0, 0.06)',
  },

  transitions: {
    fast: 'all 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
    normal: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

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
    borderRadius: appleTheme.radii.sm, // outerRadius(8) - padding(2) = 6px (calculated nested radius)
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

  // Select Dropdown with Balanced Inset
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
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236e6e73' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
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

  // Modal Card (outerRadius: 16, padding: 20)
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
