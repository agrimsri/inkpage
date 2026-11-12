import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Stroke, StrokePoint, InkGroup } from '@inkpage/format';
import { getSvgPathFromStroke, renderStrokeToCanvas } from '../utils/ink';

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
  pan,
  onUpdateStrokes,
  onRecordMetric,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const lastPenTimeRef = useRef<number>(0);
  const isDrawingRef = useRef<boolean>(false);

  // Redraw all completed strokes to canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of inkGroup.strokes) {
      renderStrokeToCanvas(ctx, stroke);
    }

    if (currentStroke) {
      renderStrokeToCanvas(ctx, currentStroke);
    }
  }, [inkGroup.strokes, currentStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'select' || tool === 'lasso') return;

    // Palm rejection: Ignore touch if pen was active in last 800ms
    const now = performance.now();
    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = now;
    } else if (e.pointerType === 'touch' && now - lastPenTimeRef.current < 800) {
      return;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      // Stroke eraser: remove any stroke near (x, y)
      eraseStrokeAt(x, y);
      return;
    }

    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: tool === 'highlighter' ? 'highlighter' : 'pen',
      color: tool === 'highlighter' ? color : color,
      width: tool === 'highlighter' ? Math.max(width * 3, 14) : width,
      pts: [[x, y, pressure, e.tiltX, e.timeStamp]],
    };

    setCurrentStroke(newStroke);

    // Record latency metric
    if (onRecordMetric && e.timeStamp > 0) {
      const latency = performance.now() - e.timeStamp;
      onRecordMetric(Math.max(0, latency), e.pointerType, pressure, 1);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const now = performance.now();
    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = now;
    } else if (e.pointerType === 'touch' && now - lastPenTimeRef.current < 800) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    // Use coalesced events if available for high-frequency tablet events
    const rawEvents = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
      : [e.nativeEvent];

    const coalescedCount = rawEvents.length;

    if (tool === 'eraser') {
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      eraseStrokeAt(x, y);
      return;
    }

    if (!currentStroke) return;

    const newPoints: StrokePoint[] = [];
    for (const ev of rawEvents) {
      const px = (ev.clientX - rect.left) / zoom;
      const py = (ev.clientY - rect.top) / zoom;
      const pressure = ev.pressure > 0 ? ev.pressure : 0.5;
      newPoints.push([px, py, pressure, ev.tiltX, ev.timeStamp]);
    }

    const updated: Stroke = {
      ...currentStroke,
      pts: [...currentStroke.pts, ...newPoints],
    };

    setCurrentStroke(updated);

    if (onRecordMetric && e.timeStamp > 0) {
      const latency = performance.now() - e.timeStamp;
      onRecordMetric(Math.max(0, latency), e.pointerType, e.pressure, coalescedCount);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (currentStroke && currentStroke.pts.length > 0) {
      onUpdateStrokes([...inkGroup.strokes, currentStroke]);
      setCurrentStroke(null);
    }
  };

  const eraseStrokeAt = (x: number, y: number) => {
    const threshold = 16;
    const remaining = inkGroup.strokes.filter((stroke) => {
      return !stroke.pts.some((pt) => {
        const dx = pt[0] - x;
        const dy = pt[1] - y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
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
        left: inkGroup.x,
        top: inkGroup.y,
        width: Math.max(inkGroup.w, 800),
        height: Math.max(inkGroup.h, 600),
        pointerEvents: tool === 'select' ? 'none' : 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={Math.max(inkGroup.w, 800)}
        height={Math.max(inkGroup.h, 600)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor:
            tool === 'pen'
              ? 'crosshair'
              : tool === 'highlighter'
              ? 'crosshair'
              : tool === 'eraser'
              ? 'cell'
              : 'default',
        }}
      />
    </div>
  );
};
