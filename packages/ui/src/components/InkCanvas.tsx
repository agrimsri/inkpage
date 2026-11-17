import React, { useRef, useEffect, useCallback } from 'react';
import type { Stroke, StrokePoint, InkGroup } from '@inkpage/format';
import { renderStrokeToCanvas } from '../utils/ink';

export interface InkCanvasProps {
  inkGroup: InkGroup;
  tool: 'select' | 'pen' | 'highlighter' | 'eraser' | 'lasso';
  color: string;
  width: number;
  zoom: number;
  pan: { x: number; y: number };
  canvasWidth?: number;
  canvasHeight?: number;
  onUpdateStrokes: (strokes: Stroke[]) => void;
  onErasePoint?: (x: number, y: number) => void;
  onRecordMetric?: (latency: number, pointerType: string, pressure: number, coalesced: number) => void;
}

export const InkCanvas: React.FC<InkCanvasProps> = ({
  inkGroup,
  tool,
  color,
  width,
  zoom,
  canvasWidth: propCanvasWidth,
  canvasHeight: propCanvasHeight,
  onUpdateStrokes,
  onErasePoint,
  onRecordMetric,
}) => {
  // Double-buffering canvases:
  // 1. completedCanvasRef: Renders all saved strokes (only redrawn on stroke changes)
  // 2. activeCanvasRef: Renders ONLY the current in-progress stroke during pointermove (0 React state updates)
  const completedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activeDirtyRectRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const lastPenTimeRef = useRef<number>(0);
  const strokeBBoxesRef = useRef<Map<string, [number, number, number, number]>>(new Map());

  const getStrokeBBox = (stroke: Stroke): [number, number, number, number] => {
    let bbox = strokeBBoxesRef.current.get(stroke.id);
    if (!bbox) {
      if (!stroke.pts || stroke.pts.length === 0) {
        bbox = [0, 0, 0, 0];
      } else {
        let minX = stroke.pts[0][0],
          minY = stroke.pts[0][1],
          maxX = stroke.pts[0][0],
          maxY = stroke.pts[0][1];
        for (let i = 1; i < stroke.pts.length; i++) {
          const pt = stroke.pts[i];
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
        bbox = [minX, minY, maxX, maxY];
      }
      strokeBBoxesRef.current.set(stroke.id, bbox);
    }
    return bbox;
  };

  let dynamicMaxW = 8000;
  let dynamicMaxH = 8000;
  if (!propCanvasWidth && inkGroup.strokes) {
    for (let i = 0; i < inkGroup.strokes.length; i++) {
      const s = inkGroup.strokes[i];
      if (s.pts) {
        for (let j = 0; j < s.pts.length; j++) {
          if (s.pts[j][0] > dynamicMaxW - 600) dynamicMaxW = Math.ceil(s.pts[j][0] + 2000);
          if (s.pts[j][1] > dynamicMaxH - 600) dynamicMaxH = Math.ceil(s.pts[j][1] + 2000);
        }
      }
    }
  }

  const canvasWidth = propCanvasWidth || dynamicMaxW;
  const canvasHeight = propCanvasHeight || dynamicMaxH;

  // Redraw all completed strokes onto the background canvas
  const redrawCompletedStrokes = useCallback(() => {
    const canvas = completedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < inkGroup.strokes.length; i++) {
      renderStrokeToCanvas(ctx, inkGroup.strokes[i]);
    }
  }, [inkGroup.strokes]);

  useEffect(() => {
    if (strokeBBoxesRef.current.size > 1000) {
      const activeIds = new Set(inkGroup.strokes.map((s) => s.id));
      for (const key of Array.from(strokeBBoxesRef.current.keys())) {
        if (!activeIds.has(key)) {
          strokeBBoxesRef.current.delete(key);
        }
      }
    }
    redrawCompletedStrokes();
  }, [redrawCompletedStrokes, inkGroup.strokes]);

  // Pointer Down: Start active stroke
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'select' || tool === 'lasso') return;

    // Palm Rejection: Ignore touch if stylus/pen was active in last 800ms
    const now = performance.now();
    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = now;
    } else if (e.pointerType === 'touch' && now - lastPenTimeRef.current < 800) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    isDrawingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      eraseStrokeAt(x, y);
      return;
    }

    const strokeWidth = tool === 'highlighter' ? Math.max(width * 3, 16) : width;
    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: tool === 'highlighter' ? 'highlighter' : 'pen',
      color,
      width: strokeWidth,
      pts: [[x, y, pressure, e.tiltX || 0, e.timeStamp || now]],
    };

    activeStrokeRef.current = newStroke;
    activeDirtyRectRef.current = { minX: x, minY: y, maxX: x, maxY: y };

    // Draw initial point onto the active canvas
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const actCtx = activeCanvas.getContext('2d');
      if (actCtx) {
        actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        renderStrokeToCanvas(actCtx, newStroke);
      }
    }

    if (onRecordMetric && e.timeStamp > 0) {
      const latency = performance.now() - e.timeStamp;
      onRecordMetric(Math.max(0, latency), e.pointerType, pressure, 1);
    }
  };

  // Pointer Move: Ultra-high frequency updates directly to active Canvas context
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const now = performance.now();
    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = now;
    } else if (e.pointerType === 'touch' && now - lastPenTimeRef.current < 800) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    if (tool === 'eraser') {
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      eraseStrokeAt(x, y);
      return;
    }

    if (!activeStrokeRef.current) return;

    // Extract coalesced points from high-precision stylus hardware
    const rawEvents = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
      : [e.nativeEvent];

    const coalescedCount = rawEvents.length;
    const newPoints: StrokePoint[] = [];

    const dirty = activeDirtyRectRef.current;

    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const px = (ev.clientX - rect.left) / zoom;
      const py = (ev.clientY - rect.top) / zoom;
      const pressure = ev.pressure > 0 ? ev.pressure : 0.5;
      newPoints.push([px, py, pressure, ev.tiltX || 0, ev.timeStamp || now]);

      if (dirty) {
        if (px < dirty.minX) dirty.minX = px;
        if (px > dirty.maxX) dirty.maxX = px;
        if (py < dirty.minY) dirty.minY = py;
        if (py > dirty.maxY) dirty.maxY = py;
      }
    }

    activeStrokeRef.current.pts.push(...newPoints);

    // Direct Canvas 2D render - NO React state re-renders during active stroke!
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const actCtx = activeCanvas.getContext('2d');
      if (actCtx) {
        // High-performance dirty rect clearing: clear only the active stroke bounding box with padding
        if (dirty) {
          const margin = Math.max(activeStrokeRef.current.width * 2, 40);
          const cx = Math.max(0, Math.floor(dirty.minX - margin));
          const cy = Math.max(0, Math.floor(dirty.minY - margin));
          const cw = Math.min(activeCanvas.width - cx, Math.ceil(dirty.maxX - dirty.minX + margin * 2));
          const ch = Math.min(activeCanvas.height - cy, Math.ceil(dirty.maxY - dirty.minY + margin * 2));
          actCtx.clearRect(cx, cy, cw, ch);
        } else {
          actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        }
        renderStrokeToCanvas(actCtx, activeStrokeRef.current);
      }
    }

    if (onRecordMetric && e.timeStamp > 0) {
      const latency = performance.now() - e.timeStamp;
      onRecordMetric(Math.max(0, latency), e.pointerType, e.pressure, coalescedCount);
    }
  };

  // Pointer Up: Finalize stroke and commit to page data
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const finishedStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    activeDirtyRectRef.current = null;

    // Clear active stroke canvas layer
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const actCtx = activeCanvas.getContext('2d');
      if (actCtx) {
        actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      }
    }

    // Commit finished stroke to inkGroup state
    if (finishedStroke && finishedStroke.pts.length > 0) {
      onUpdateStrokes([...inkGroup.strokes, finishedStroke]);
    }
  };

  // Optimized Stroke Eraser with AABB pre-filtering and 18px radius collision
  const eraseStrokeAt = (x: number, y: number) => {
    if (onErasePoint) {
      onErasePoint(x, y);
    }

    const threshold = 18;
    const thresholdSq = threshold * threshold;
    const remaining = inkGroup.strokes.filter((stroke) => {
      if (!stroke.pts || stroke.pts.length === 0) return false;
      const bbox = getStrokeBBox(stroke);
      // Fast AABB rejection: if eraser point is outside stroke bbox + threshold, skip point checks
      if (
        x < bbox[0] - threshold ||
        x > bbox[2] + threshold ||
        y < bbox[1] - threshold ||
        y > bbox[3] + threshold
      ) {
        return true;
      }

      return !stroke.pts.some((pt) => {
        const dx = pt[0] - x;
        const dy = pt[1] - y;
        return dx * dx + dy * dy < thresholdSq;
      });
    });

    if (remaining.length !== inkGroup.strokes.length) {
      onUpdateStrokes(remaining);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: inkGroup.x || 0,
        top: inkGroup.y || 0,
        width: canvasWidth,
        height: canvasHeight,
        zIndex: 20,
        pointerEvents: (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') ? 'auto' : 'none',
      }}
    >
      {/* Background Layer: All Completed Saved Strokes */}
      <canvas
        ref={completedCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Foreground Layer: Active In-Progress Stroke */}
      <canvas
        ref={activeCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor:
            tool === 'pen' || tool === 'highlighter'
              ? 'crosshair'
              : tool === 'eraser'
              ? 'cell'
              : 'default',
        }}
      />
    </div>
  );
};
