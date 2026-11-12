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
  onUpdateStrokes: (strokes: Stroke[]) => void;
  onRecordMetric?: (latency: number, pointerType: string, pressure: number, coalesced: number) => void;
}

export const InkCanvas: React.FC<InkCanvasProps> = ({
  inkGroup,
  tool,
  color,
  width,
  zoom,
  onUpdateStrokes,
  onRecordMetric,
}) => {
  // Double-buffering canvases:
  // 1. completedCanvasRef: Renders all saved strokes (only redrawn on stroke changes)
  // 2. activeCanvasRef: Renders ONLY the current in-progress stroke during pointermove (0 React state updates)
  const completedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const lastPenTimeRef = useRef<number>(0);

  const canvasWidth = Math.max(inkGroup.w || 3200, 3200);
  const canvasHeight = Math.max(inkGroup.h || 2400, 2400);

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
    redrawCompletedStrokes();
  }, [redrawCompletedStrokes]);

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

    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const px = (ev.clientX - rect.left) / zoom;
      const py = (ev.clientY - rect.top) / zoom;
      const pressure = ev.pressure > 0 ? ev.pressure : 0.5;
      newPoints.push([px, py, pressure, ev.tiltX || 0, ev.timeStamp || now]);
    }

    activeStrokeRef.current.pts.push(...newPoints);

    // Direct Canvas 2D render - NO React state re-renders during active stroke!
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const actCtx = activeCanvas.getContext('2d');
      if (actCtx) {
        actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
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

  // Stroke Eraser with 18px radius collision
  const eraseStrokeAt = (x: number, y: number) => {
    const thresholdSq = 18 * 18;
    const remaining = inkGroup.strokes.filter((stroke) => {
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
        pointerEvents: tool === 'select' ? 'none' : 'auto',
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
