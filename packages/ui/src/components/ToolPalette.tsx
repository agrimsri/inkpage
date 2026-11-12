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

const PEN_COLORS = ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#9333ea'];
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
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Undo / Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 8 }}>
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          style={buttonStyle(false)}
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          style={buttonStyle(false)}
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: '#e2e8f0', marginRight: 8 }} />

      {/* Main Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onSelectTool('select')}
          title="Select / Move (V)"
          style={buttonStyle(activeTool === 'select')}
        >
          <MousePointer size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Select</span>
        </button>

        <button
          onClick={() => onSelectTool('text')}
          title="Text Outline Container (T)"
          style={buttonStyle(activeTool === 'text')}
        >
          <Type size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Text</span>
        </button>

        <button
          onClick={() => {
            onSelectTool('pen');
            if (!PEN_COLORS.includes(activeColor)) onSelectColor('#2563eb');
          }}
          title="Stylus Pen (P)"
          style={buttonStyle(activeTool === 'pen')}
        >
          <Pen size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Pen</span>
        </button>

        <button
          onClick={() => {
            onSelectTool('highlighter');
            if (!HIGHLIGHTER_COLORS.includes(activeColor)) onSelectColor('#fef08a');
          }}
          title="Highlighter (H)"
          style={buttonStyle(activeTool === 'highlighter')}
        >
          <Highlighter size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Highlighter</span>
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          title="Stroke Eraser (E)"
          style={buttonStyle(activeTool === 'eraser')}
        >
          <Eraser size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Eraser</span>
        </button>
      </div>

      {/* Color and Width Presets when Pen/Highlighter Active */}
      {(activeTool === 'pen' || activeTool === 'highlighter') && (
        <>
          <div style={{ width: 1, height: 20, backgroundColor: '#e2e8f0', margin: '0 8px' }} />

          {/* Color swatches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {(activeTool === 'pen' ? PEN_COLORS : HIGHLIGHTER_COLORS).map((c) => (
              <button
                key={c}
                onClick={() => onSelectColor(c)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: activeColor === c ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transform: activeColor === c ? 'scale(1.15)' : 'none',
                  transition: 'transform 0.1s',
                }}
              />
            ))}
          </div>

          {/* Width presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            {PEN_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => onSelectWidth(w)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: activeWidth === w ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: activeWidth === w ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: w * 2,
                    height: w * 2,
                    borderRadius: '50%',
                    backgroundColor: activeColor,
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ width: 1, height: 20, backgroundColor: '#e2e8f0', margin: '0 8px' }} />

      {/* Insertables: Table, Image, File */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={onAddTable}
          title="Insert Table"
          style={buttonStyle(false)}
        >
          <TableIcon size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Table</span>
        </button>

        <button
          onClick={onAddImage}
          title="Insert Image"
          style={buttonStyle(false)}
        >
          <ImageIcon size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Image</span>
        </button>

        <button
          onClick={onAddFile}
          title="Attach File"
          style={buttonStyle(false)}
        >
          <Paperclip size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>File</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* M0 Ink Latency Spike Dashboard Button */}
      {onToggleSpikeModal && (
        <button
          onClick={onToggleSpikeModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 6,
            color: '#1d4ed8',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
          title="View M0 Pointer Latency & Stylus Metrics"
        >
          <Activity size={15} />
          M0 Ink Latency Spike
        </button>
      )}
    </div>
  );
};

const buttonStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 6,
  border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
  backgroundColor: isActive ? '#eff6ff' : 'transparent',
  color: isActive ? '#1d4ed8' : '#334155',
  cursor: 'pointer',
  transition: 'background-color 0.1s, color 0.1s',
});
