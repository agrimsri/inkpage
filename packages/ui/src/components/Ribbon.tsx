import React, { useState } from 'react';
import type { ToolType } from './ToolPalette';
import type { ShapeType } from '@inkpage/format';
import {
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Paintbrush,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter as HighlightIcon,
  Palette,
  RemoveFormatting,
  List,
  ListOrdered,
  Indent,
  Outdent,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CheckSquare,
  Star,
  HelpCircle,
  Bookmark,
  BookOpen,
  User,
  MapPin,
  Phone,
  AlertOctagon,
  Lightbulb,
  Key,
  MoveVertical,
  Table as TableIcon,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  MicOff,
  Link,
  Sigma,
  Calendar,
  Clock,
  LayoutTemplate,
  MousePointer,
  Lasso,
  Pen,
  Highlighter,
  Eraser,
  Sparkles,
  Slash,
  ArrowRight,
  MoveHorizontal,
  Square,
  Circle,
  Triangle,
  Grid,
  Maximize2,
  Eye,
  Lock,
  Unlock,
  History,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Ruler,
  ChevronDown,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

export type RibbonTab = 'home' | 'insert' | 'draw' | 'view' | 'table';

export interface RibbonProps {
  activeTab: RibbonTab;
  onSelectTab: (tab: RibbonTab) => void;
  // State
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  activeWidth: number;
  onSelectWidth: (width: number) => void;
  // Font & Style
  fontFamily: string;
  onSelectFontFamily: (font: string) => void;
  fontSize: number;
  onSelectFontSize: (size: number) => void;
  isBold: boolean;
  onToggleBold: () => void;
  isItalic: boolean;
  onToggleItalic: () => void;
  isUnderline: boolean;
  onToggleUnderline: () => void;
  isStrikethrough: boolean;
  onToggleStrikethrough: () => void;
  isSubscript: boolean;
  onToggleSubscript: () => void;
  isSuperscript: boolean;
  onToggleSuperscript: () => void;
  highlightColor: string;
  onSelectHighlightColor: (color: string) => void;
  fontColor: string;
  onSelectFontColor: (color: string) => void;
  onClearFormatting: () => void;
  // Alignment & Lists
  textAlign: 'left' | 'center' | 'right';
  onSelectTextAlign: (align: 'left' | 'center' | 'right') => void;
  onIndent: () => void;
  onOutdent: () => void;
  onApplyHeading: (level: number) => void;
  onApplyTag: (tagType: string) => void;
  // Insert Actions
  onInsertSpace: () => void;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertFile: () => void;
  onInsertPdf: () => void;
  onInsertImage: () => void;
  onInsertVideo: (url: string) => void;
  isRecordingAudio: boolean;
  onToggleAudioRecording: () => void;
  onInsertLink: () => void;
  onInsertMath: () => void;
  onInsertDateTime: (includeTime: boolean, includeDate: boolean) => void;
  onApplyTemplate: (templateName: string) => void;
  // Draw Actions
  selectedShape: ShapeType | null;
  onSelectShape: (shape: ShapeType | null) => void;
  inkToShapeEnabled: boolean;
  onToggleInkToShape: () => void;
  rulerEnabled: boolean;
  onToggleRuler: () => void;
  eraserMode: 'stroke' | 'point';
  onSelectEraserMode: (mode: 'stroke' | 'point') => void;
  // View Actions
  isFullPageView: boolean;
  onToggleFullPageView: () => void;
  pageColor: string;
  onSelectPageColor: (color: string) => void;
  ruleKind: 'none' | 'rule' | 'grid';
  ruleSpacing: number;
  onSelectRuleStyle: (kind: 'none' | 'rule' | 'grid', spacing: number) => void;
  paperSize: 'auto' | 'letter' | 'a4';
  onSelectPaperSize: (size: 'auto' | 'letter' | 'a4') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  // Section Password & Versions
  isSectionLocked: boolean;
  onToggleSectionLock: () => void;
  onOpenVersions: () => void;
  onOpenRecycleBin: () => void;
  onOpenTagsSummary: () => void;
  // Table Tools Contextual
  isTableActive: boolean;
  onTableInsertRowAbove?: () => void;
  onTableInsertRowBelow?: () => void;
  onTableInsertColLeft?: () => void;
  onTableInsertColRight?: () => void;
  onTableDeleteRow?: () => void;
  onTableDeleteCol?: () => void;
  onTableDeleteTable?: () => void;
  onTableSortAscending?: () => void;
  onTableSortDescending?: () => void;
  onTableCellShading?: (color: string) => void;
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
}

const FONTS = [
  'Segoe UI',
  'Calibri',
  'Arial',
  'Times New Roman',
  'Georgia',
  'Fira Code',
  'Courier New',
  'Comic Sans MS',
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];

const PASTEL_PAGE_COLORS = [
  { name: 'None', color: '#ffffff' },
  { name: 'Yellow', color: '#fef9c3' },
  { name: 'Lime', color: '#ecfccb' },
  { name: 'Mint', color: '#f0fdf4' },
  { name: 'Cyan', color: '#ecfeff' },
  { name: 'Blue', color: '#eff6ff' },
  { name: 'Purple', color: '#faf5ff' },
  { name: 'Pink', color: '#fdf2f8' },
  { name: 'Peach', color: '#fff7ed' },
  { name: 'Gray', color: '#f8fafc' },
];

const PEN_COLORS = ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#fed7aa'];
const PEN_WIDTHS = [2, 4, 8, 14];

export const Ribbon: React.FC<RibbonProps> = React.memo((props) => {
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [hoverGrid, setHoverGrid] = useState<{ r: number; c: number }>({ r: 3, c: 3 });
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showPageColorMenu, setShowPageColorMenu] = useState(false);
  const [showRuleMenu, setShowRuleMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #cbd5e1',
        userSelect: 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* 1. Ribbon Tab Headers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          gap: 2,
        }}
      >
        {/* Quick Access Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
          <button onClick={props.onUndo} title="Undo (Ctrl+Z)" style={iconButtonStyle}>
            <Undo2 size={15} />
          </button>
          <button onClick={props.onRedo} title="Redo (Ctrl+Y)" style={iconButtonStyle}>
            <Redo2 size={15} />
          </button>
        </div>

        <div style={{ width: 1, height: 18, backgroundColor: '#cbd5e1', marginRight: 8 }} />

        {/* Tab Buttons */}
        {(['home', 'insert', 'draw', 'view'] as const).map((tab) => {
          const isActive = props.activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => props.onSelectTab(tab)}
              style={{
                padding: '6px 16px',
                border: 'none',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                color: isActive ? '#1d4ed8' : '#475569',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'color 0.1s',
              }}
            >
              {tab}
            </button>
          );
        })}

        {/* Contextual Table Tools Tab */}
        {props.isTableActive && (
          <button
            onClick={() => props.onSelectTab('table')}
            style={{
              padding: '6px 16px',
              border: 'none',
              backgroundColor: props.activeTab === 'table' ? '#ffffff' : '#f0fdf4',
              borderBottom: props.activeTab === 'table' ? '2px solid #16a34a' : '2px solid transparent',
              fontWeight: 600,
              fontSize: 13,
              color: '#16a34a',
              cursor: 'pointer',
            }}
          >
            Table Tools
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Full Page View Button */}
        <button
          onClick={props.onToggleFullPageView}
          title="Full Page View (F11)"
          style={{ ...iconButtonStyle, gap: 4 }}
        >
          <Maximize2 size={14} />
          <span style={{ fontSize: 11, fontWeight: 500 }}>Full Page</span>
        </button>
      </div>

      {/* 2. Ribbon Action Body */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 14px',
          gap: 12,
          minHeight: 52,
          overflowX: 'auto',
        }}
      >
        {/* ==================== HOME TAB ==================== */}
        {props.activeTab === 'home' && (
          <>
            {/* Clipboard Group */}
            <RibbonGroup title="Clipboard">
              <button
                onClick={() => navigator.clipboard.readText().then(props.onClearFormatting)}
                title="Paste (Ctrl+V)"
                style={actionButtonStyle}
              >
                <Clipboard size={16} color="#3b82f6" />
                <span>Paste</span>
              </button>
            </RibbonGroup>

            <Divider />

            {/* Basic Text & Font Group */}
            <RibbonGroup title="Basic Text">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Font row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <select
                    value={props.fontFamily}
                    onChange={(e) => props.onSelectFontFamily(e.target.value)}
                    style={selectStyle}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  <select
                    value={props.fontSize}
                    onChange={(e) => props.onSelectFontSize(Number(e.target.value))}
                    style={{ ...selectStyle, width: 56 }}
                  >
                    {FONT_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s} pt
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inline styles row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={props.onToggleBold}
                    style={activeToggleStyle(props.isBold)}
                    title="Bold (Ctrl+B)"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    onClick={props.onToggleItalic}
                    style={activeToggleStyle(props.isItalic)}
                    title="Italic (Ctrl+I)"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    onClick={props.onToggleUnderline}
                    style={activeToggleStyle(props.isUnderline)}
                    title="Underline (Ctrl+U)"
                  >
                    <Underline size={14} />
                  </button>
                  <button
                    onClick={props.onToggleStrikethrough}
                    style={activeToggleStyle(props.isStrikethrough)}
                    title="Strikethrough (Alt+-)"
                  >
                    <Strikethrough size={14} />
                  </button>
                  <button
                    onClick={props.onToggleSubscript}
                    style={activeToggleStyle(props.isSubscript)}
                    title="Subscript (Ctrl+=)"
                  >
                    <Subscript size={14} />
                  </button>
                  <button
                    onClick={props.onToggleSuperscript}
                    style={activeToggleStyle(props.isSuperscript)}
                    title="Superscript (Ctrl+Shift+=)"
                  >
                    <Superscript size={14} />
                  </button>
                  <button
                    onClick={props.onClearFormatting}
                    style={actionButtonStyle}
                    title="Clear Formatting (Ctrl+Shift+N)"
                  >
                    <RemoveFormatting size={14} />
                  </button>
                </div>
              </div>
            </RibbonGroup>

            <Divider />

            {/* Paragraph & Lists */}
            <RibbonGroup title="Paragraph">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={props.onIndent} title="Indent (Tab)" style={actionButtonStyle}>
                    <Indent size={15} />
                  </button>
                  <button onClick={props.onOutdent} title="Outdent (Shift+Tab)" style={actionButtonStyle}>
                    <Outdent size={15} />
                  </button>
                  <button
                    onClick={() => props.onSelectTextAlign('left')}
                    style={activeToggleStyle(props.textAlign === 'left')}
                    title="Align Left (Ctrl+L)"
                  >
                    <AlignLeft size={15} />
                  </button>
                  <button
                    onClick={() => props.onSelectTextAlign('center')}
                    style={activeToggleStyle(props.textAlign === 'center')}
                    title="Align Center (Ctrl+E)"
                  >
                    <AlignCenter size={15} />
                  </button>
                  <button
                    onClick={() => props.onSelectTextAlign('right')}
                    style={activeToggleStyle(props.textAlign === 'right')}
                    title="Align Right (Ctrl+R)"
                  >
                    <AlignRight size={15} />
                  </button>
                </div>
              </div>
            </RibbonGroup>

            <Divider />

            {/* Styles & Headings Gallery */}
            <RibbonGroup title="Styles">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => props.onApplyHeading(0)}
                  style={{ ...actionButtonStyle, fontSize: 12, padding: '4px 8px' }}
                >
                  Normal
                </button>
                <button
                  onClick={() => props.onApplyHeading(1)}
                  style={{ ...actionButtonStyle, fontSize: 13, fontWeight: 700, padding: '4px 8px', color: '#1d4ed8' }}
                >
                  Heading 1
                </button>
                <button
                  onClick={() => props.onApplyHeading(2)}
                  style={{ ...actionButtonStyle, fontSize: 12, fontWeight: 600, padding: '4px 8px', color: '#2563eb' }}
                >
                  Heading 2
                </button>
              </div>
            </RibbonGroup>

            <Divider />

            {/* Note Tags Library */}
            <RibbonGroup title="Tags">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => props.onApplyTag('todo')}
                  title="To-Do Tag (Ctrl+1)"
                  style={{ ...actionButtonStyle, color: '#16a34a' }}
                >
                  <CheckSquare size={16} />
                  <span>To-Do</span>
                </button>
                <button
                  onClick={() => props.onApplyTag('important')}
                  title="Important Tag (Ctrl+2)"
                  style={{ ...actionButtonStyle, color: '#eab308' }}
                >
                  <Star size={16} />
                  <span>Important</span>
                </button>
                <button
                  onClick={() => props.onApplyTag('question')}
                  title="Question Tag (Ctrl+3)"
                  style={{ ...actionButtonStyle, color: '#a855f7' }}
                >
                  <HelpCircle size={16} />
                  <span>Question</span>
                </button>
                <button
                  onClick={props.onOpenTagsSummary}
                  title="Find Tags Summary Pane"
                  style={{ ...actionButtonStyle, backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                >
                  <Layers size={15} />
                  <span>Tag Summary</span>
                </button>
              </div>
            </RibbonGroup>
          </>
        )}

        {/* ==================== INSERT TAB ==================== */}
        {props.activeTab === 'insert' && (
          <>
            {/* Space Tool */}
            <RibbonGroup title="Space">
              <button
                onClick={props.onInsertSpace}
                title="Insert Space (Drag down on canvas to insert vertical space)"
                style={actionButtonStyle}
              >
                <MoveVertical size={16} color="#3b82f6" />
                <span>Insert Space</span>
              </button>
            </RibbonGroup>

            <Divider />

            {/* Tables */}
            <RibbonGroup title="Table">
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTablePicker(!showTablePicker)}
                  style={actionButtonStyle}
                >
                  <TableIcon size={16} color="#3b82f6" />
                  <span>Table</span>
                  <ChevronDown size={12} />
                </button>

                {/* 10x8 Table Hover Matrix */}
                {showTablePicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 36,
                      left: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                      {hoverGrid.r} × {hoverGrid.c} Table
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 16px)', gap: 3 }}>
                      {Array.from({ length: 8 }).map((_, r) =>
                        Array.from({ length: 10 }).map((_, c) => (
                          <div
                            key={`${r}-${c}`}
                            onMouseEnter={() => setHoverGrid({ r: r + 1, c: c + 1 })}
                            onClick={() => {
                              props.onInsertTable(r + 1, c + 1);
                              setShowTablePicker(false);
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              border: '1px solid #94a3b8',
                              backgroundColor:
                                r < hoverGrid.r && c < hoverGrid.c ? '#bfdbfe' : '#ffffff',
                              cursor: 'pointer',
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </RibbonGroup>

            <Divider />

            {/* Files & Media */}
            <RibbonGroup title="Files & Media">
              <button onClick={props.onInsertFile} style={actionButtonStyle} title="Attach File">
                <Paperclip size={16} color="#64748b" />
                <span>File Attachment</span>
              </button>
              <button onClick={props.onInsertPdf} style={actionButtonStyle} title="PDF Printout">
                <FileText size={16} color="#ef4444" />
                <span>PDF Printout</span>
              </button>
              <button onClick={props.onInsertImage} style={actionButtonStyle} title="Insert Picture">
                <ImageIcon size={16} color="#16a34a" />
                <span>Picture</span>
              </button>
              <button
                onClick={() => {
                  const url = prompt('Enter Online Video URL (YouTube, Vimeo):');
                  if (url) props.onInsertVideo(url);
                }}
                style={actionButtonStyle}
                title="Embed Online Video"
              >
                <Video size={16} color="#dc2626" />
                <span>Online Video</span>
              </button>
              <button
                onClick={props.onToggleAudioRecording}
                style={{
                  ...actionButtonStyle,
                  backgroundColor: props.isRecordingAudio ? '#fee2e2' : 'transparent',
                  color: props.isRecordingAudio ? '#dc2626' : 'inherit',
                }}
                title="Record Meeting Audio"
              >
                {props.isRecordingAudio ? <MicOff size={16} color="#dc2626" /> : <Mic size={16} />}
                <span>{props.isRecordingAudio ? 'Stop Recording' : 'Record Audio'}</span>
              </button>
            </RibbonGroup>

            <Divider />

            {/* Math & Links */}
            <RibbonGroup title="Links & Math">
              <button onClick={props.onInsertLink} style={actionButtonStyle} title="Insert Link (Ctrl+K)">
                <Link size={16} color="#2563eb" />
                <span>Link</span>
              </button>
              <button onClick={props.onInsertMath} style={actionButtonStyle} title="Insert LaTeX Equation (Alt+=)">
                <Sigma size={16} color="#7c3aed" />
                <span>Equation</span>
              </button>
            </RibbonGroup>

            <Divider />

            {/* Date / Time & Templates */}
            <RibbonGroup title="Templates & Time">
              <button
                onClick={() => props.onInsertDateTime(false, true)}
                style={actionButtonStyle}
                title="Insert Date (Alt+Shift+D)"
              >
                <Calendar size={15} />
                <span>Date</span>
              </button>
              <button
                onClick={() => props.onInsertDateTime(true, false)}
                style={actionButtonStyle}
                title="Insert Time (Alt+Shift+T)"
              >
                <Clock size={15} />
                <span>Time</span>
              </button>
              <button
                onClick={() => {
                  const t = prompt('Choose Template: Cornell, Meeting, Lecture, Planner');
                  if (t) props.onApplyTemplate(t);
                }}
                style={actionButtonStyle}
                title="Page Templates"
              >
                <LayoutTemplate size={16} color="#f59e0b" />
                <span>Templates</span>
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ==================== DRAW TAB ==================== */}
        {props.activeTab === 'draw' && (
          <>
            {/* Tools */}
            <RibbonGroup title="Tools">
              <button
                onClick={() => props.onSelectTool('select')}
                style={activeToggleStyle(props.activeTool === 'select')}
                title="Type / Select (V)"
              >
                <MousePointer size={16} />
                <span>Select</span>
              </button>
              <button
                onClick={() => props.onSelectTool('lasso')}
                style={activeToggleStyle(props.activeTool === 'lasso')}
                title="Lasso Selection (L)"
              >
                <Lasso size={16} />
                <span>Lasso</span>
              </button>
              <button
                onClick={() => props.onSelectTool('eraser')}
                style={activeToggleStyle(props.activeTool === 'eraser')}
                title="Stroke Eraser (E)"
              >
                <Eraser size={16} />
                <span>Eraser</span>
              </button>
            </RibbonGroup>

            <Divider />

            {/* Pens & Highlighters */}
            <RibbonGroup title="Pens">
              <button
                onClick={() => props.onSelectTool('pen')}
                style={activeToggleStyle(props.activeTool === 'pen')}
                title="Stylus Pen (P)"
              >
                <Pen size={16} />
                <span>Pen</span>
              </button>
              <button
                onClick={() => props.onSelectTool('highlighter')}
                style={activeToggleStyle(props.activeTool === 'highlighter')}
                title="Highlighter (H)"
              >
                <Highlighter size={16} />
                <span>Highlighter</span>
              </button>

              {/* Color swatches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
                {(props.activeTool === 'highlighter' ? HIGHLIGHT_COLORS : PEN_COLORS).map((c) => (
                  <button
                    key={c}
                    onClick={() => props.onSelectColor(c)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: props.activeColor === c ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              {/* Thickness selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
                {PEN_WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => props.onSelectWidth(w)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: props.activeWidth === w ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: props.activeWidth === w ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: Math.min(14, w * 1.5),
                        height: Math.min(14, w * 1.5),
                        borderRadius: '50%',
                        backgroundColor: props.activeColor,
                      }}
                    />
                  </button>
                ))}
              </div>
            </RibbonGroup>

            <Divider />

            {/* Shapes Palette */}
            <RibbonGroup title="Shapes">
              <button
                onClick={() => props.onSelectShape('line')}
                style={activeToggleStyle(props.selectedShape === 'line')}
                title="Line"
              >
                <Slash size={15} />
              </button>
              <button
                onClick={() => props.onSelectShape('arrow')}
                style={activeToggleStyle(props.selectedShape === 'arrow')}
                title="Arrow"
              >
                <ArrowRight size={15} />
              </button>
              <button
                onClick={() => props.onSelectShape('doubleArrow')}
                style={activeToggleStyle(props.selectedShape === 'doubleArrow')}
                title="Double Arrow"
              >
                <MoveHorizontal size={15} />
              </button>
              <button
                onClick={() => props.onSelectShape('rect')}
                style={activeToggleStyle(props.selectedShape === 'rect')}
                title="Rectangle"
              >
                <Square size={15} />
              </button>
              <button
                onClick={() => props.onSelectShape('ellipse')}
                style={activeToggleStyle(props.selectedShape === 'ellipse')}
                title="Oval / Ellipse"
              >
                <Circle size={15} />
              </button>
              <button
                onClick={() => props.onSelectShape('triangle')}
                style={activeToggleStyle(props.selectedShape === 'triangle')}
                title="Triangle"
              >
                <Triangle size={15} />
              </button>
              <button
                onClick={() => props.onSelectShape('grid')}
                style={activeToggleStyle(props.selectedShape === 'grid')}
                title="2D Coordinate Grid"
              >
                <Grid size={15} />
              </button>
            </RibbonGroup>

            <Divider />

            {/* Ink Intelligence & Ruler */}
            <RibbonGroup title="Ink Intelligence">
              <button
                onClick={props.onToggleInkToShape}
                style={activeToggleStyle(props.inkToShapeEnabled)}
                title="Ink to Shape (Draw-and-Hold Recognition)"
              >
                <Sparkles size={16} color="#eab308" />
                <span>Ink to Shape</span>
              </button>
              <button
                onClick={props.onToggleRuler}
                style={activeToggleStyle(props.rulerEnabled)}
                title="Virtual On-Screen Ruler (Snap straight lines)"
              >
                <Ruler size={16} color="#3b82f6" />
                <span>Ruler</span>
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ==================== VIEW TAB ==================== */}
        {props.activeTab === 'view' && (
          <>
            {/* Page Setup: Color & Rule Lines */}
            <RibbonGroup title="Page Setup">
              {/* Page Color */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPageColorMenu(!showPageColorMenu)}
                  style={actionButtonStyle}
                >
                  <Palette size={16} color="#3b82f6" />
                  <span>Page Color</span>
                  <ChevronDown size={12} />
                </button>

                {showPageColorMenu && (
                  <div style={dropdownStyle}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: 6 }}>
                      {PASTEL_PAGE_COLORS.map((p) => (
                        <div
                          key={p.name}
                          onClick={() => {
                            props.onSelectPageColor(p.color);
                            setShowPageColorMenu(false);
                          }}
                          title={p.name}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            backgroundColor: p.color,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rule Lines */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowRuleMenu(!showRuleMenu)} style={actionButtonStyle}>
                  <LayoutTemplate size={16} color="#64748b" />
                  <span>Rule Lines</span>
                  <ChevronDown size={12} />
                </button>

                {showRuleMenu && (
                  <div style={{ ...dropdownStyle, width: 180 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                      Rule Spacing
                    </div>
                    <button
                      onClick={() => {
                        props.onSelectRuleStyle('none', 0);
                        setShowRuleMenu(false);
                      }}
                      style={menuItemStyle}
                    >
                      None (Blank)
                    </button>
                    <button
                      onClick={() => {
                        props.onSelectRuleStyle('rule', 16);
                        setShowRuleMenu(false);
                      }}
                      style={menuItemStyle}
                    >
                      Narrow Rule (16px)
                    </button>
                    <button
                      onClick={() => {
                        props.onSelectRuleStyle('rule', 20);
                        setShowRuleMenu(false);
                      }}
                      style={menuItemStyle}
                    >
                      College Rule (20px)
                    </button>
                    <button
                      onClick={() => {
                        props.onSelectRuleStyle('rule', 24);
                        setShowRuleMenu(false);
                      }}
                      style={menuItemStyle}
                    >
                      Standard Rule (24px)
                    </button>
                    <button
                      onClick={() => {
                        props.onSelectRuleStyle('grid', 20);
                        setShowRuleMenu(false);
                      }}
                      style={menuItemStyle}
                    >
                      Grid Lines (20px)
                    </button>
                  </div>
                )}
              </div>

              {/* Paper Size */}
              <select
                value={props.paperSize}
                onChange={(e) => props.onSelectPaperSize(e.target.value as any)}
                style={selectStyle}
              >
                <option value="auto">Auto (Infinite 2D)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="a4">A4 Paper</option>
              </select>
            </RibbonGroup>

            <Divider />

            {/* Zoom Controls */}
            <RibbonGroup title="Zoom">
              <button onClick={props.onZoomIn} style={actionButtonStyle} title="Zoom In (Ctrl++)">
                <ZoomIn size={16} />
                <span>Zoom In</span>
              </button>
              <button onClick={props.onZoomOut} style={actionButtonStyle} title="Zoom Out (Ctrl+-)">
                <ZoomOut size={16} />
                <span>Zoom Out</span>
              </button>
              <button onClick={props.onZoomReset} style={actionButtonStyle} title="100% Zoom (Ctrl+0)">
                <Maximize size={16} />
                <span>100%</span>
              </button>
            </RibbonGroup>

            <Divider />

            {/* Security & History */}
            <RibbonGroup title="Section Security & History">
              <button
                onClick={props.onToggleSectionLock}
                style={{
                  ...actionButtonStyle,
                  color: props.isSectionLocked ? '#dc2626' : '#16a34a',
                }}
                title="Password Protect Section"
              >
                {props.isSectionLocked ? <Lock size={16} /> : <Unlock size={16} />}
                <span>{props.isSectionLocked ? 'Locked Section' : 'Protect Section'}</span>
              </button>
              <button onClick={props.onOpenVersions} style={actionButtonStyle} title="Page Version History">
                <History size={16} color="#3b82f6" />
                <span>Page Versions</span>
              </button>
              <button onClick={props.onOpenRecycleBin} style={actionButtonStyle} title="Notebook Recycle Bin">
                <Trash2 size={16} color="#64748b" />
                <span>Recycle Bin</span>
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ==================== TABLE TOOLS CONTEXTUAL TAB ==================== */}
        {props.activeTab === 'table' && props.isTableActive && (
          <>
            <RibbonGroup title="Insert Rows & Columns">
              <button onClick={props.onTableInsertRowAbove} style={actionButtonStyle}>
                Insert Above
              </button>
              <button onClick={props.onTableInsertRowBelow} style={actionButtonStyle}>
                Insert Below
              </button>
              <button onClick={props.onTableInsertColLeft} style={actionButtonStyle}>
                Insert Left
              </button>
              <button onClick={props.onTableInsertColRight} style={actionButtonStyle}>
                Insert Right
              </button>
            </RibbonGroup>

            <Divider />

            <RibbonGroup title="Delete">
              <button onClick={props.onTableDeleteRow} style={{ ...actionButtonStyle, color: '#dc2626' }}>
                Delete Row
              </button>
              <button onClick={props.onTableDeleteCol} style={{ ...actionButtonStyle, color: '#dc2626' }}>
                Delete Column
              </button>
              <button onClick={props.onTableDeleteTable} style={{ ...actionButtonStyle, color: '#dc2626' }}>
                Delete Table
              </button>
            </RibbonGroup>

            <Divider />

            <RibbonGroup title="Format & Shading">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {['#ffffff', '#f1f5f9', '#fef08a', '#bbf7d0', '#bae6fd'].map((c) => (
                  <button
                    key={c}
                    onClick={() => props.onTableCellShading?.(c)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: c,
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </RibbonGroup>

            <Divider />

            <RibbonGroup title="Sort">
              <button onClick={props.onTableSortAscending} style={actionButtonStyle} title="Sort Ascending A-Z">
                <ArrowUpDown size={15} />
                <span>Sort A-Z</span>
              </button>
              <button onClick={props.onTableSortDescending} style={actionButtonStyle} title="Sort Descending Z-A">
                <ArrowUpDown size={15} />
                <span>Sort Z-A</span>
              </button>
            </RibbonGroup>
          </>
        )}
      </div>
    </div>
  );
});

const RibbonGroup: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
    <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{title}</span>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ width: 1, height: 40, backgroundColor: '#e2e8f0', margin: '0 4px' }} />
);

const actionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 8px',
  borderRadius: 5,
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  color: '#334155',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const activeToggleStyle = (isActive: boolean): React.CSSProperties => ({
  ...actionButtonStyle,
  border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
  backgroundColor: isActive ? '#eff6ff' : 'transparent',
  color: isActive ? '#1d4ed8' : '#334155',
});

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 6px',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#64748b',
};

const selectStyle: React.CSSProperties = {
  padding: '3px 6px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  fontSize: 12,
  backgroundColor: '#ffffff',
  outline: 'none',
  cursor: 'pointer',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 36,
  left: 0,
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  zIndex: 1000,
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '5px 8px',
  border: 'none',
  background: 'none',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};
