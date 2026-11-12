import React, { useState, useRef, useEffect } from 'react';
import type { Page, Item, Container, InkGroup, ImageItem, FileItem, TableItem, MathItem, ShapeItem } from '@inkpage/format';
import { OutlineEditor } from './OutlineEditor';
import { InkCanvas } from './InkCanvas';
import {
  FileText,
  GripHorizontal,
  Trash2,
  Download,
  Image as ImageIcon,
  Table as TableIcon,
  Maximize2,
  FileBox,
} from 'lucide-react';

export interface CanvasProps {
  page: Page;
  tool: 'select' | 'text' | 'pen' | 'highlighter' | 'eraser' | 'lasso' | 'table' | 'math';
  activeColor: string;
  activeWidth: number;
  onUpdatePage: (updatedPage: Page) => void;
  onRecordMetric?: (latency: number, pointerType: string, pressure: number, coalesced: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  page,
  tool,
  activeColor,
  activeWidth,
  onUpdatePage,
  onRecordMetric,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingItemRef = useRef<{ id: string; startX: number; startY: number; initX: number; initY: number } | null>(null);
  const resizingItemRef = useRef<{ id: string; startX: number; startY: number; initW: number; initH: number } | null>(null);

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

  // Canvas-level pointer events for panning and creating items
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If Space key is held or middle click, start panning
    if (e.button === 1 || e.buttons === 4 || (e.button === 0 && e.shiftKey)) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    // If clicking on empty canvas with 'text' or 'select' tool
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      if (tool === 'text') {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;

        const newContainer: Container = {
          id: `container_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          kind: 'container',
          x: Math.round(x),
          y: Math.round(y),
          w: 500,
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

    if (draggingItemRef.current) {
      const dx = (e.clientX - draggingItemRef.current.startX) / zoom;
      const dy = (e.clientY - draggingItemRef.current.startY) / zoom;
      const itemId = draggingItemRef.current.id;

      const updatedItems = page.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            x: Math.max(20, Math.round(draggingItemRef.current!.initX + dx)),
            y: Math.max(20, Math.round(draggingItemRef.current!.initY + dy)),
          };
        }
        return item;
      });

      onUpdatePage({ ...page, items: updatedItems });
      return;
    }

    if (resizingItemRef.current) {
      const dx = (e.clientX - resizingItemRef.current.startX) / zoom;
      const dy = (e.clientY - resizingItemRef.current.startY) / zoom;
      const itemId = resizingItemRef.current.id;

      const updatedItems = page.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            w: Math.max(160, Math.round(resizingItemRef.current!.initW + dx)),
            h: Math.max(80, Math.round(resizingItemRef.current!.initH + dy)),
          };
        }
        return item;
      });

      onUpdatePage({ ...page, items: updatedItems });
    }
  };

  const handlePointerUp = () => {
    isPanningRef.current = false;
    draggingItemRef.current = null;
    resizingItemRef.current = null;
  };

  // Find or create InkGroup item for pen drawing
  const currentInkGroup = (page.items.find((i) => i.kind === 'ink') as InkGroup) || {
    id: 'ink_group_primary',
    kind: 'ink',
    x: 0,
    y: 0,
    w: 2400,
    h: 1800,
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
        backgroundColor: '#ffffff',
        cursor: tool === 'text' ? 'text' : isPanningRef.current ? 'grabbing' : 'default',
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
          backgroundImage:
            page.background?.kind === 'rule'
              ? 'linear-gradient(#e2e8f0 1px, transparent 1px)'
              : page.background?.kind === 'grid'
              ? 'radial-gradient(#cbd5e1 1px, transparent 1px)'
              : 'none',
          backgroundSize:
            page.background?.kind === 'rule'
              ? `100% ${page.background.spacing || 28}px`
              : '24px 24px',
        }}
      >
        {/* Render Vector Ink Canvas */}
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

        {/* Render Canvas Items */}
        {page.items.map((item) => {
          if (item.kind === 'ink') return null; // Rendered via InkCanvas above
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
                border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                borderRadius: 6,
                backgroundColor: isSelected ? '#ffffff' : 'transparent',
                boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.1)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItemId(item.id);
              }}
            >
              {/* Item Drag Handle & Actions */}
              {isSelected && (
                <div
                  className="item-header"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    draggingItemRef.current = {
                      id: item.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initX: item.x,
                      initY: item.y,
                    };
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 8px',
                    backgroundColor: '#f1f5f9',
                    borderTopLeftRadius: 5,
                    borderTopRightRadius: 5,
                    cursor: 'grab',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                    <GripHorizontal size={14} />
                    <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>
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
                      color: '#ef4444',
                      padding: 2,
                    }}
                    title="Delete Item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {/* Item Content Rendering by Kind */}
              <div style={{ padding: 8 }}>
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

                {item.kind === 'image' && (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e2e8f0',
                        borderRadius: 4,
                        padding: 12,
                      }}
                    >
                      <ImageIcon size={36} color="#94a3b8" />
                      <span style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                        {(item as ImageItem).alt || 'Image Attachment'}
                      </span>
                      {(item as ImageItem).ocr && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '4px 8px',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 4,
                            fontSize: 11,
                            color: '#1d4ed8',
                          }}
                        >
                          OCR: {(item as ImageItem).ocr}
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
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileBox size={24} color="#3b82f6" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                          {(item as FileItem).filename}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {(item as FileItem).mime} •{' '}
                          {((item as FileItem).size ? `${Math.round((item as FileItem).size! / 1024)} KB` : 'Attached')}
                        </div>
                      </div>
                    </div>
                    <button
                      style={{
                        border: 'none',
                        background: '#3b82f6',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Download size={13} />
                      Download
                    </button>
                  </div>
                )}

                {item.kind === 'table' && (
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
                                  border: '1px solid #cbd5e1',
                                  padding: '6px 10px',
                                  backgroundColor: r === 0 ? '#f8fafc' : '#ffffff',
                                  fontWeight: r === 0 ? 600 : 400,
                                }}
                              >
                                {cell?.text || `Cell R${r}C${c}`}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Resize Handle */}
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
                    };
                  }}
                  style={{
                    position: 'absolute',
                    right: -4,
                    bottom: -4,
                    width: 10,
                    height: 10,
                    backgroundColor: '#3b82f6',
                    borderRadius: 2,
                    cursor: 'se-resize',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Canvas Viewport Zoom Overlay */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#ffffff',
          padding: '4px 10px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          fontSize: 12,
          fontWeight: 600,
          color: '#475569',
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z * 0.9))}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px' }}
        >
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z * 1.1))}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px' }}
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: 4, color: '#3b82f6' }}
          title="Reset Zoom (Ctrl+0)"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
