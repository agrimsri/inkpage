import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode, appleTheme } from '../theme';

export interface ThemeSwitcherProps {
  value?: ThemeMode;
  onChange?: (theme: ThemeMode) => void;
  size?: 'sm' | 'md';
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  value,
  onChange,
  size = 'sm',
  compact = false,
}) => {
  const themeCtx = useTheme();
  const currentTheme = value !== undefined ? value : themeCtx.theme;
  const isSm = size === 'sm';

  const handleSelect = (mode: ThemeMode) => {
    if (onChange) {
      onChange(mode);
    } else {
      themeCtx.setTheme(mode);
    }
  };

  const options: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
    { mode: 'light', label: 'Light', icon: <Sun size={isSm ? 12 : 14} /> },
    { mode: 'dark', label: 'Dark', icon: <Moon size={isSm ? 12 : 14} /> },
    { mode: 'system', label: 'Auto', icon: <Monitor size={isSm ? 12 : 14} /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Appearance Theme Selection"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        backgroundColor: appleTheme.colors.bgSubtle,
        borderRadius: isSm ? appleTheme.radii.md : appleTheme.radii.lg,
        border: `1px solid ${appleTheme.colors.borderSubtle}`,
        gap: 2,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {options.map((opt) => {
        const isActive = currentTheme === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(opt.mode)}
            title={`Switch to ${opt.label} Theme`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isSm ? 4 : 6,
              height: isSm ? 24 : 28,
              padding: compact ? '0 6px' : isSm ? '0 8px' : '0 10px',
              borderRadius: isSm ? appleTheme.radii.sm : appleTheme.radii.md,
              border: 'none',
              backgroundColor: isActive ? appleTheme.colors.bgCard : 'transparent',
              color: isActive ? appleTheme.colors.labelPrimary : appleTheme.colors.labelSecondary,
              boxShadow: isActive ? appleTheme.shadows.segmented : 'none',
              fontFamily: appleTheme.fonts.sans,
              fontSize: isSm ? 11 : 12,
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
              whiteSpace: 'nowrap',
              outline: 'none',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: isActive ? appleTheme.colors.accent : 'inherit',
              }}
            >
              {opt.icon}
            </span>
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
