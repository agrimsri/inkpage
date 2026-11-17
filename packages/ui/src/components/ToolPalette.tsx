import React from 'react';
import {
  MousePointer,
  Type,
  Pen,
  Highlighter,
  Eraser,
  Table as TableIcon,
  Image as ImageIcon,
  Paperclip,
  Undo2,
  Redo2,
  Activity,
  Layers,
} from 'lucide-react';
import { appleTheme, appleStyles, useTheme } from '../theme';

export type ToolType = 'select' | 'text' | 'pen' | 'highlighter' | 'eraser' | 'lasso';

export interface ToolPaletteProps {
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
  onSelectWidth: (width: number) => void;
  onAddTable: () => void;
  onAddImage: () => void;
  onAddFile: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleSpikeModal?: () => void;
}

const LIGHT_PEN_COLORS = ['#1d1d1f', '#0071e3', '#d70015', '#1a7f37', '#8944ab'];
const DARK_PEN_COLORS = ['#f5f5f7', '#2997ff', '#ff453a', '#32d74b', '#bf5af2'];
const HIGHLIGHTER_COLORS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8'];
const PEN_WIDTHS = [2, 4, 8];

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  activeColor,
  activeWidth,
  onSelectTool,
  onSelectColor,
  onSelectWidth,
  onAddTable,
  onAddImage,
  onAddFile,
  onUndo,
  onRedo,
  onToggleSpikeModal,
}) => {
  const { isDark } = useTheme();
  const penColors = isDark ? DARK_PEN_COLORS : LIGHT_PEN_COLORS;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        backgroundColor: appleTheme.colors.bgCanvas,
        borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
        boxShadow: appleTheme.shadows.subtle,
        fontFamily: appleTheme.fonts.sans,
      }}
    >
      {/* Undo / Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 6 }}>
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          style={buttonStyle(false)}
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          style={buttonStyle(false)}
        >
          <Redo2 size={15} />
        </button>
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: appleTheme.colors.borderSubtle, marginRight: 4 }} />

      {/* Main Tools (Apple Segmented Track) */}
      <div style={appleStyles.segmentedControlTrack}>
        <button
          onClick={() => onSelectTool('select')}
          title="Select / Move (V)"
          style={appleStyles.segmentedControlItem(activeTool === 'select')}
        >
          <MousePointer size={14} style={{ marginRight: 4 }} />
          <span>Select</span>
        </button>

        <button
          onClick={() => onSelectTool('text')}
          title="Text Outline Container (T)"
          style={appleStyles.segmentedControlItem(activeTool === 'text')}
        >
          <Type size={14} style={{ marginRight: 4 }} />
          <span>Type</span>
        </button>

        <button
          onClick={() => onSelectTool('pen')}
          title="Pressure-sensitive Inking Pen (P)"
          style={appleStyles.segmentedControlItem(activeTool === 'pen')}
        >
          <Pen size={14} style={{ marginRight: 4 }} />
          <span>Pen</span>
        </button>

        <button
          onClick={() => onSelectTool('highlighter')}
          title="Translucent Inking Highlighter (H)"
          style={appleStyles.segmentedControlItem(activeTool === 'highlighter')}
        >
          <Highlighter size={14} style={{ marginRight: 4 }} />
          <span>Highlight</span>
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          title="Stroke Eraser (E)"
          style={appleStyles.segmentedControlItem(activeTool === 'eraser')}
        >
          <Eraser size={14} style={{ marginRight: 4 }} />
          <span>Eraser</span>
        </button>
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: appleTheme.colors.borderSubtle, margin: '0 4px' }} />

      {/* Pen Color Swatches */}
      {(activeTool === 'pen' || activeTool === 'select') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {penColors.map((c) => (
            <button
              key={c}
              onClick={() => onSelectColor(c)}
              title={c}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: c,
                border: activeColor === c ? '2.5px solid #ffffff' : '1px solid transparent',
                boxShadow: activeColor === c ? `0 0 0 2px ${c}` : 'none',
                cursor: 'pointer',
                padding: 0,
                transition: appleTheme.transitions.fast,
              }}
            />
          ))}
        </div>
      )}

      {/* Highlighter Color Swatches */}
      {activeTool === 'highlighter' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {HIGHLIGHTER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onSelectColor(c)}
              title={c}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: c,
                border: activeColor === c ? '2.5px solid #ffffff' : `1px solid ${appleTheme.colors.borderMedium}`,
                boxShadow: activeColor === c ? `0 0 0 2px ${appleTheme.colors.accent}` : 'none',
                cursor: 'pointer',
                padding: 0,
                transition: appleTheme.transitions.fast,
              }}
            />
          ))}
        </div>
      )}

      {/* Pen Stroke Widths */}
      {(activeTool === 'pen' || activeTool === 'highlighter') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          {PEN_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => onSelectWidth(w)}
              style={{
                width: 24,
                height: 24,
                borderRadius: appleTheme.radii.xs,
                border: activeWidth === w ? `1.5px solid ${appleTheme.colors.accent}` : `1px solid ${appleTheme.colors.borderSubtle}`,
                backgroundColor: activeWidth === w ? appleTheme.colors.accentTint : appleTheme.colors.bgCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: appleTheme.transitions.fast,
              }}
              title={`${w}px width`}
            >
              <div
                style={{
                  width: Math.min(16, w * 2.5),
                  height: Math.min(16, w * 2.5),
                  borderRadius: '50%',
                  backgroundColor: appleTheme.colors.labelPrimary,
                }}
              />
            </button>
          ))}
        </div>
      )}

      <div style={{ width: 1, height: 20, backgroundColor: appleTheme.colors.borderSubtle, margin: '0 4px' }} />

      {/* Inserts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={onAddTable}
          title="Insert Table"
          style={buttonStyle(false)}
        >
          <TableIcon size={14} />
          <span>Table</span>
        </button>

        <button
          onClick={onAddImage}
          title="Insert Image"
          style={buttonStyle(false)}
        >
          <ImageIcon size={14} />
          <span>Image</span>
        </button>

        <button
          onClick={onAddFile}
          title="Attach File"
          style={buttonStyle(false)}
        >
          <Paperclip size={14} />
          <span>File</span>
        </button>
      </div>
    </div>
  );
};

const buttonStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  height: 28,
  padding: '0 8px',
  borderRadius: appleTheme.radii.sm,
  border: isActive ? `1.5px solid ${appleTheme.colors.accentTintHover}` : '1px solid transparent',
  backgroundColor: isActive ? appleTheme.colors.accentTint : 'transparent',
  color: isActive ? appleTheme.colors.accent : appleTheme.colors.labelPrimary,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: isActive ? 600 : 500,
  transition: appleTheme.transitions.fast,
  whiteSpace: 'nowrap',
  flexShrink: 0,
});
