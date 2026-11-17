import React, { useState, useRef } from 'react';
import type {
  Page,
  Item,
  Container,
  InkGroup,
  ImageItem,
  FileItem,
  TableItem,
  TableCell,
  MathItem,
  ShapeItem,
  ShapeType,
  AudioItem,
} from '@inkpage/format';
import { OutlineEditor } from './OutlineEditor';
import { InkCanvas } from './InkCanvas';
import { VirtualRuler } from './VirtualRuler';
import { MathBox } from './MathBox';
import { AudioPlayerWidget } from './AudioPlayerWidget';
import { appleTheme, appleStyles } from '../theme';
import {
  GripHorizontal,
  Trash2,
  Download,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  Maximize2,
  FileBox,
  Rows,
  Columns,
  Palette,
} from 'lucide-react';

export interface CanvasProps {
  page: Page;
  tool: 'select' | 'text' | 'pen' | 'highlighter' | 'eraser' | 'lasso' | 'table' | 'math';
  activeColor: string;
  activeWidth: number;
  selectedShape?: ShapeType | null;
  onClearShape?: () => void;
  rulerVisible?: boolean;
  onToggleRuler?: () => void;
  onUpdatePage: (updatedPage: Page) => void;
  onRecordMetric?: (latency: number, pointerType: string, pressure: number, coalesced: number) => void;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
}

function getStarPoints(w: number, h: number, points = 5, innerRatio = 0.5): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  let pts = '';
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < 2 * points; i++) {
    const rCurrentX = i % 2 === 0 ? rx : rx * innerRatio;
    const rCurrentY = i % 2 === 0 ? ry : ry * innerRatio;
    const x = cx + rCurrentX * Math.cos(angle);
    const y = cy + rCurrentY * Math.sin(angle);
    pts += (i === 0 ? '' : ' ') + `${x.toFixed(1)},${y.toFixed(1)}`;
    angle += step;
  }
  return pts;
}

export const Canvas: React.FC<CanvasProps> = React.memo(({
  page,
  tool,
  activeColor,
  activeWidth,
  selectedShape,
  onClearShape,
  rulerVisible = false,
  onToggleRuler,
  onUpdatePage,
  onRecordMetric,
  selectedItemId: externalSelectedId,
  onSelectItem: externalSetSelectedId,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  const selectedItemId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const setSelectedItemId = (id: string | null) => {
    if (externalSetSelectedId) externalSetSelectedId(id);
    else setInternalSelectedId(id);
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingItemRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    isShift: boolean;
  } | null>(null);
  const resizingItemRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initW: number;
    initH: number;
    mode: 'both' | 'horizontal';
  } | null>(null);

  // Shape interactive drawing state
  const [drawingShape, setDrawingShape] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((prev) => Math.min(3.0, Math.max(0.25, prev * zoomFactor)));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Canvas-level pointer events for panning, creating items & shapes
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If Space key is held or middle click, start panning
    if (e.button === 1 || e.buttons === 4 || (e.button === 0 && e.shiftKey && !draggingItemRef.current && !selectedShape)) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    // Drawing a shape
    if (selectedShape) {
      setDrawingShape({
        startX: canvasX,
        startY: canvasY,
        currX: canvasX,
        currY: canvasY,
      });
      return;
    }

    // Clicking on empty canvas
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).classList.contains('canvas-background') ||
      (e.target as HTMLElement).classList.contains('canvas-paper-sheet');

    if (isBackground) {
      if (tool === 'text') {
        const newContainer: Container = {
          id: `container_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          kind: 'container',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          w: 520,
          h: 240,
          z: (page.items.length || 0) + 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0 },
                content: [{ type: 'text', text: '' }],
              },
            ],
          },
        };

        onUpdatePage({
          ...page,
          items: [...page.items, newContainer],
        });
        setSelectedItemId(newContainer.id);
      } else if (tool === 'select') {
        setSelectedItemId(null);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    // Update active shape drawing preview
    if (drawingShape) {
      setDrawingShape({
        ...drawingShape,
        currX: canvasX,
        currY: canvasY,
      });
      return;
    }

    // Dragging item
    if (draggingItemRef.current) {
      const dx = (e.clientX - draggingItemRef.current.startX) / zoom;
      const dy = (e.clientY - draggingItemRef.current.startY) / zoom;
      const itemId = draggingItemRef.current.id;

      const updatedItems = page.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            x: Math.max(10, Math.round(draggingItemRef.current!.initX + dx)),
            y: Math.max(10, Math.round(draggingItemRef.current!.initY + dy)),
          };
        }
        return item;
      });

      onUpdatePage({ ...page, items: updatedItems });
      return;
    }

    // Resizing item
    if (resizingItemRef.current) {
      const dx = (e.clientX - resizingItemRef.current.startX) / zoom;
      const dy = (e.clientY - resizingItemRef.current.startY) / zoom;
      const itemId = resizingItemRef.current.id;
      const mode = resizingItemRef.current.mode;

      const updatedItems = page.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            w: Math.max(160, Math.round(resizingItemRef.current!.initW + dx)),
            h: mode === 'both' ? Math.max(80, Math.round(resizingItemRef.current!.initH + dy)) : item.h,
          };
        }
        return item;
      });

      onUpdatePage({ ...page, items: updatedItems });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;

    // Finalize shape creation
    if (drawingShape && selectedShape) {
      const x = Math.min(drawingShape.startX, drawingShape.currX);
      const y = Math.min(drawingShape.startY, drawingShape.currY);
      const w = Math.max(24, Math.abs(drawingShape.currX - drawingShape.startX));
      const h = Math.max(24, Math.abs(drawingShape.currY - drawingShape.startY));

      const newShape: ShapeItem = {
        id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        kind: 'shape',
        shapeType: selectedShape,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
        z: (page.items.length || 0) + 1,
        strokeColor: activeColor,
        strokeWidth: activeWidth || 2,
        fillColor: 'transparent',
      };

      onUpdatePage({
        ...page,
        items: [...page.items, newShape],
      });
      setDrawingShape(null);
      if (onClearShape) onClearShape();
      return;
    }

    // Handle Note Container Shift+Drag merge logic
    if (draggingItemRef.current) {
      const draggedId = draggingItemRef.current.id;
      const draggedItem = page.items.find((i) => i.id === draggedId);
      const wasShift = draggingItemRef.current.isShift || e.shiftKey;

      if (draggedItem && draggedItem.kind === 'container') {
        // Check for collision with another container
        const targetContainer = page.items.find(
          (i) =>
            i.id !== draggedId &&
            i.kind === 'container' &&
            Math.abs(i.x - draggedItem.x) < 200 &&
            Math.abs(i.y - draggedItem.y) < 160
        ) as Container | undefined;

        if (targetContainer && wasShift) {
          // Merge draggedContainer paragraphs into targetContainer
          const mergedDoc = {
            ...targetContainer.doc,
            content: [
              ...(targetContainer.doc.content || []),
              ...((draggedItem as Container).doc.content || []),
            ],
          };

          const remainingItems = page.items
            .filter((i) => i.id !== draggedId)
            .map((i) => (i.id === targetContainer.id ? { ...i, doc: mergedDoc } : i));

          onUpdatePage({ ...page, items: remainingItems });
          setSelectedItemId(targetContainer.id);
        }
      }

      draggingItemRef.current = null;
    }

    resizingItemRef.current = null;
  };

  // Find or create InkGroup item for pen drawing
  const currentInkGroup = (page.items.find((i) => i.kind === 'ink') as InkGroup) || {
    id: 'ink_group_primary',
    kind: 'ink',
    x: 0,
    y: 0,
    w: 3200,
    h: 2400,
    z: 10,
    strokes: [],
  };

  const handleUpdateStrokes = (strokes: any[]) => {
    const existingIndex = page.items.findIndex((i) => i.kind === 'ink');
    const updatedGroup: InkGroup = {
      ...currentInkGroup,
      strokes,
    };

    let newItems = [...page.items];
    if (existingIndex >= 0) {
      newItems[existingIndex] = updatedGroup;
    } else {
      newItems.push(updatedGroup);
    }

    onUpdatePage({
      ...page,
      items: newItems,
    });
  };

  const deleteItem = (itemId: string) => {
    onUpdatePage({
      ...page,
      items: page.items.filter((i) => i.id !== itemId),
    });
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  // Table Helpers
  const handleTableCellUpdate = (tableId: string, row: number, col: number, text: string) => {
    const updated = page.items.map((item) => {
      if (item.id === tableId && item.kind === 'table') {
        const tbl = item as TableItem;
        const otherCells = tbl.cells.filter((c) => !(c.row === row && c.col === col));
        return {
          ...tbl,
          cells: [...otherCells, { row, col, text }],
        };
      }
      return item;
    });
    onUpdatePage({ ...page, items: updated });
  };

  const handleTableAddRow = (tableId: string) => {
    const updated = page.items.map((item) => {
      if (item.id === tableId && item.kind === 'table') {
        const tbl = item as TableItem;
        const newRows = tbl.rows + 1;
        const newCells: TableCell[] = [...tbl.cells];
        for (let c = 0; c < tbl.cols; c++) {
          newCells.push({ row: tbl.rows, col: c, text: '' });
        }
        return { ...tbl, rows: newRows, cells: newCells };
      }
      return item;
    });
    onUpdatePage({ ...page, items: updated });
  };

  const handleTableAddCol = (tableId: string) => {
    const updated = page.items.map((item) => {
      if (item.id === tableId && item.kind === 'table') {
        const tbl = item as TableItem;
        const newCols = tbl.cols + 1;
        const newCells: TableCell[] = [...tbl.cells];
        for (let r = 0; r < tbl.rows; r++) {
          newCells.push({ row: r, col: tbl.cols, text: '' });
        }
        return { ...tbl, cols: newCols, cells: newCells, w: tbl.w + 120 };
      }
      return item;
    });
    onUpdatePage({ ...page, items: updated });
  };

  // Page background & dimensions
  const pageBgColor = page.pageColor || '#ffffff';
  const paperPreset = page.size?.preset || 'auto';
  const paperWidth = paperPreset === 'letter' ? 816 : paperPreset === 'a4' ? 794 : '100%';
  const paperMinHeight = paperPreset === 'letter' ? 1056 : paperPreset === 'a4' ? 1123 : '100%';

  return (
    <div
      ref={containerRef}
      className="canvas-viewport"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: appleTheme.colors.bgWindow,
        cursor: selectedShape
          ? 'crosshair'
          : tool === 'text'
          ? 'text'
          : isPanningRef.current
          ? 'grabbing'
          : 'default',
        userSelect: 'none',
      }}
    >
      {/* 2D Infinite Canvas Transform Layer */}
      <div
        className="canvas-background"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Paper Sheet Representation */}
        <div
          className="canvas-paper-sheet"
          style={{
            position: 'relative',
            width: paperWidth,
            minHeight: paperMinHeight,
            minWidth: 1600,
            backgroundColor: pageBgColor,
            boxShadow: paperPreset !== 'auto' ? '0 10px 40px rgba(0,0,0,0.08)' : 'none',
            border: paperPreset !== 'auto' ? `1px solid ${appleTheme.colors.borderMedium}` : 'none',
            backgroundImage:
              page.background?.kind === 'rule'
                ? `linear-gradient(${page.background.color || appleTheme.colors.borderMedium} 1px, transparent 1px)`
                : page.background?.kind === 'grid'
                ? `radial-gradient(${page.background.color || appleTheme.colors.borderMedium} 1px, transparent 1px)`
                : 'none',
            backgroundSize:
              page.background?.kind === 'rule'
                ? `100% ${page.background.spacing || 28}px`
                : `${page.background?.spacing || 24}px ${page.background?.spacing || 24}px`,
          }}
        >
          {/* Vector Ink Canvas Layer */}
          <InkCanvas
            inkGroup={currentInkGroup}
            tool={tool === 'pen' || tool === 'highlighter' || tool === 'eraser' ? tool : 'select'}
            color={activeColor}
            width={activeWidth}
            zoom={zoom}
            pan={pan}
            onUpdateStrokes={handleUpdateStrokes}
            onRecordMetric={onRecordMetric}
          />

          {/* Render Active Shape Preview when drawing */}
          {drawingShape && selectedShape && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(drawingShape.startX, drawingShape.currX),
                top: Math.min(drawingShape.startY, drawingShape.currY),
                width: Math.abs(drawingShape.currX - drawingShape.startX),
                height: Math.abs(drawingShape.currY - drawingShape.startY),
                border: `2px dashed ${activeColor}`,
                pointerEvents: 'none',
                zIndex: 999,
              }}
            />
          )}

          {/* Render Canvas Items */}
          {page.items.map((item) => {
            if (item.kind === 'ink') return null;
            const isSelected = selectedItemId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  width: item.w,
                  minHeight: item.h,
                  zIndex: item.z || 1,
                  borderRadius: appleTheme.radii.lg,
                  border: isSelected ? `1.5px solid ${appleTheme.colors.accent}` : '1px solid transparent',
                  backgroundColor: isSelected ? appleTheme.colors.bgCanvas : 'transparent',
                  boxShadow: isSelected ? appleTheme.shadows.card : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: appleTheme.fonts.sans,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemId(item.id);
                }}
              >
                {/* OneNote Container Anatomy: Top Gray Move Handle Bar */}
                <div
                  className="container-move-bar"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    draggingItemRef.current = {
                      id: item.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initX: item.x,
                      initY: item.y,
                      isShift: e.shiftKey,
                    };
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 10px',
                    backgroundColor: isSelected ? appleTheme.colors.bgSubtle : 'transparent',
                    borderTopLeftRadius: appleTheme.radii.lg - 1, // calculated nested radius
                    borderTopRightRadius: appleTheme.radii.lg - 1,
                    cursor: 'grab',
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: appleTheme.colors.labelSecondary }}>
                    <GripHorizontal size={14} />
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.01em' }}>
                      {item.kind}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: appleTheme.colors.labelTertiary,
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: appleTheme.radii.xs,
                      transition: appleTheme.transitions.fast,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = appleTheme.colors.destructive)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = appleTheme.colors.labelTertiary)}
                    title="Delete Item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Item Content Rendering */}
                <div style={{ padding: '4px 8px' }}>
                  {item.kind === 'container' && (
                    <OutlineEditor
                      container={item as Container}
                      isSelected={isSelected}
                      onUpdate={(updatedDoc) => {
                        const updatedItems = page.items.map((i) =>
                          i.id === item.id ? { ...i, doc: updatedDoc } : i
                        );
                        onUpdatePage({ ...page, items: updatedItems });
                      }}
                      onFocus={() => setSelectedItemId(item.id)}
                    />
                  )}

                  {item.kind === 'shape' && (
                    <div style={{ width: '100%', height: item.h }}>
                      <svg width="100%" height={item.h} style={{ overflow: 'visible' }}>
                        <defs>
                          <marker
                            id={`arrowhead-${item.id}`}
                            markerWidth="8"
                            markerHeight="6"
                            refX="7"
                            refY="3"
                            orient="auto"
                          >
                            <polygon points="0 0, 8 3, 0 6" fill={(item as ShapeItem).strokeColor} />
                          </marker>
                          <marker
                            id={`arrowhead-start-${item.id}`}
                            markerWidth="8"
                            markerHeight="6"
                            refX="1"
                            refY="3"
                            orient="auto"
                          >
                            <polygon points="8 0, 0 3, 8 6" fill={(item as ShapeItem).strokeColor} />
                          </marker>
                        </defs>

                        {(item as ShapeItem).shapeType === 'line' && (
                          <line
                            x1={0}
                            y1={0}
                            x2={item.w}
                            y2={item.h}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'arrow' && (
                          <line
                            x1={0}
                            y1={0}
                            x2={item.w}
                            y2={item.h}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            markerEnd={`url(#arrowhead-${item.id})`}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'doubleArrow' && (
                          <line
                            x1={0}
                            y1={0}
                            x2={item.w}
                            y2={item.h}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            markerStart={`url(#arrowhead-start-${item.id})`}
                            markerEnd={`url(#arrowhead-${item.id})`}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'rect' && (
                          <rect
                            x={0}
                            y={0}
                            width={item.w}
                            height={item.h}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            fill={(item as ShapeItem).fillColor || 'transparent'}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'roundedRect' && (
                          <rect
                            x={0}
                            y={0}
                            rx={12}
                            ry={12}
                            width={item.w}
                            height={item.h}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            fill={(item as ShapeItem).fillColor || 'transparent'}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'ellipse' && (
                          <ellipse
                            cx={item.w / 2}
                            cy={item.h / 2}
                            rx={item.w / 2 - 2}
                            ry={item.h / 2 - 2}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            fill={(item as ShapeItem).fillColor || 'transparent'}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'triangle' && (
                          <polygon
                            points={`${item.w / 2},2 2,${item.h - 2} ${item.w - 2},${item.h - 2}`}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            fill={(item as ShapeItem).fillColor || 'transparent'}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'diamond' && (
                          <polygon
                            points={`${item.w / 2},2 ${item.w - 2},${item.h / 2} ${item.w / 2},${item.h - 2} 2,${item.h / 2}`}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            fill={(item as ShapeItem).fillColor || 'transparent'}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'star' && (
                          <polygon
                            points={getStarPoints(item.w, item.h, 5, 0.45)}
                            stroke={(item as ShapeItem).strokeColor}
                            strokeWidth={(item as ShapeItem).strokeWidth}
                            fill={(item as ShapeItem).fillColor || 'transparent'}
                          />
                        )}

                        {(item as ShapeItem).shapeType === 'grid' && (
                          <g>
                            <line
                              x1={0}
                              y1={item.h / 2}
                              x2={item.w}
                              y2={item.h / 2}
                              stroke={(item as ShapeItem).strokeColor}
                              strokeWidth={2}
                              markerEnd="url(#arrowhead)"
                            />
                            <line
                              x1={item.w / 2}
                              y1={item.h}
                              x2={item.w / 2}
                              y2={0}
                              stroke={(item as ShapeItem).strokeColor}
                              strokeWidth={2}
                              markerEnd="url(#arrowhead)"
                            />
                            {/* Grid lines */}
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <React.Fragment key={idx}>
                                <line
                                  x1={(item.w / 6) * (idx + 1)}
                                  y1={item.h / 2 - 4}
                                  x2={(item.w / 6) * (idx + 1)}
                                  y2={item.h / 2 + 4}
                                  stroke={(item as ShapeItem).strokeColor}
                                  strokeWidth={1}
                                />
                                <line
                                  x1={item.w / 2 - 4}
                                  y1={(item.h / 6) * (idx + 1)}
                                  x2={item.w / 2 + 4}
                                  y2={(item.h / 6) * (idx + 1)}
                                  stroke={(item as ShapeItem).strokeColor}
                                  strokeWidth={1}
                                />
                              </React.Fragment>
                            ))}
                          </g>
                        )}
                      </svg>
                    </div>
                  )}

                  {item.kind === 'audio' && (
                    <AudioPlayerWidget
                      item={item as AudioItem}
                      isSelected={isSelected}
                      onDelete={() => deleteItem(item.id)}
                    />
                  )}

                  {item.kind === 'math' && (
                    <MathBox
                      item={item as MathItem}
                      isSelected={isSelected}
                      onUpdateLatex={(latex) => {
                        const updated = page.items.map((i) =>
                          i.id === item.id ? { ...i, latex } : i
                        );
                        onUpdatePage({ ...page, items: updated });
                      }}
                      onDelete={() => deleteItem(item.id)}
                    />
                  )}

                  {item.kind === 'image' && (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: appleTheme.colors.bgCard,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${appleTheme.colors.borderSubtle}`,
                          borderRadius: appleTheme.radii.md,
                          padding: 14,
                          boxShadow: appleTheme.shadows.subtle,
                        }}
                      >
                        <ImageIcon size={36} color={appleTheme.colors.labelTertiary} />
                        <span style={{ fontSize: 12, color: appleTheme.colors.labelSecondary, marginTop: 6, fontWeight: 500 }}>
                          {(item as ImageItem).alt || 'Image Attachment'}
                        </span>
                        {(item as ImageItem).ocr && (
                          <div style={{ marginTop: 8 }}>
                            <span style={appleStyles.badge('accent')}>
                              OCR: {(item as ImageItem).ocr}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {item.kind === 'file' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: appleTheme.colors.bgCard,
                        border: `1px solid ${appleTheme.colors.borderSubtle}`,
                        borderRadius: appleTheme.radii.md,
                        boxShadow: appleTheme.shadows.subtle,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: appleTheme.radii.sm,
                            backgroundColor: appleTheme.colors.accentTint,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileBox size={20} color={appleTheme.colors.accent} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>
                            {(item as FileItem).filename}
                          </div>
                          <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {(item as FileItem).mime} •{' '}
                            {(item as FileItem).size ? `${Math.round((item as FileItem).size! / 1024)} KB` : 'Attached'}
                          </div>
                        </div>
                      </div>
                      <button style={appleStyles.primaryButton(false, 'sm')}>
                        <Download size={13} />
                        Download
                      </button>
                    </div>
                  )}

                  {item.kind === 'table' && (
                    <div style={{ width: '100%' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 13,
                        }}
                      >
                        <tbody>
                          {Array.from({ length: (item as TableItem).rows || 2 }).map((_, r) => (
                            <tr key={r}>
                              {Array.from({ length: (item as TableItem).cols || 2 }).map((_, c) => {
                                const cell = (item as TableItem).cells?.find(
                                  (cell) => cell.row === r && cell.col === c
                                );
                                return (
                                  <td
                                    key={c}
                                    style={{
                                      border: `1px solid ${appleTheme.colors.borderSubtle}`,
                                      padding: '6px 8px',
                                      backgroundColor: cell?.shading || (r === 0 ? appleTheme.colors.bgSubtle : appleTheme.colors.bgCard),
                                      fontWeight: r === 0 ? 600 : 400,
                                      minWidth: 80,
                                    }}
                                  >
                                    <input
                                      value={cell?.text || ''}
                                      onChange={(e) =>
                                        handleTableCellUpdate(item.id, r, c, e.target.value)
                                      }
                                      placeholder={`R${r}C${c}`}
                                      style={{
                                        width: '100%',
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        fontSize: 13,
                                        fontFamily: appleTheme.fonts.sans,
                                        color: appleTheme.colors.labelPrimary,
                                      }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Contextual Table Tools Buttons */}
                      {isSelected && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: `1px solid ${appleTheme.colors.borderSubtle}`,
                          }}
                        >
                          <button
                            onClick={() => handleTableAddRow(item.id)}
                            style={appleStyles.secondaryButton(false, 'sm')}
                          >
                            <Rows size={12} /> Add Row
                          </button>
                          <button
                            onClick={() => handleTableAddCol(item.id)}
                            style={appleStyles.secondaryButton(false, 'sm')}
                          >
                            <Columns size={12} /> Add Col
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* OneNote Container Anatomy: Right Sizing Handle Strip */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      resizingItemRef.current = {
                        id: item.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initW: item.w,
                        initH: item.h,
                        mode: 'horizontal',
                      };
                    }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 14,
                      bottom: 0,
                      width: 6,
                      cursor: 'ew-resize',
                      backgroundColor: 'transparent',
                    }}
                    title="Drag to resize container width"
                  />
                )}

                {/* Bottom-Right Corner Resize Handle */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      resizingItemRef.current = {
                        id: item.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initW: item.w,
                        initH: item.h,
                        mode: 'both',
                      };
                    }}
                    style={{
                      position: 'absolute',
                      right: -4,
                      bottom: -4,
                      width: 10,
                      height: 10,
                      backgroundColor: appleTheme.colors.accent,
                      border: '1.5px solid #ffffff',
                      borderRadius: appleTheme.radii.xs,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      cursor: 'se-resize',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* On-screen Virtual Ruler */}
      <VirtualRuler visible={rulerVisible} onClose={onToggleRuler || (() => {})} />

      {/* Canvas Viewport Zoom & Reset Overlay (Apple Frosted Glass Capsule) */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: appleTheme.colors.glassBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '4px 12px',
          borderRadius: appleTheme.radii.pill,
          border: `1px solid ${appleTheme.colors.borderSubtle}`,
          boxShadow: appleTheme.shadows.card,
          fontFamily: appleTheme.fonts.sans,
          fontSize: 12,
          fontWeight: 600,
          color: appleTheme.colors.labelPrimary,
          userSelect: 'none',
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z * 0.9))}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: appleTheme.colors.labelSecondary,
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: appleTheme.radii.xs,
            transition: appleTheme.transitions.fast,
          }}
          title="Zoom Out"
        >
          -
        </button>
        <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z * 1.1))}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: appleTheme.colors.labelSecondary,
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: appleTheme.radii.xs,
            transition: appleTheme.transitions.fast,
          }}
          title="Zoom In"
        >
          +
        </button>
        <div style={{ width: 1, height: 14, backgroundColor: appleTheme.colors.borderMedium, margin: '0 2px' }} />
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: appleTheme.colors.accent,
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 4px',
            borderRadius: appleTheme.radii.xs,
            transition: appleTheme.transitions.fast,
          }}
          title="Reset Zoom (Ctrl+0)"
        >
          Reset
        </button>
      </div>
    </div>
  );
});
