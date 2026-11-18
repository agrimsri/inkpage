import React, { useRef, useEffect, useCallback } from "react";
import type { Stroke, StrokePoint, InkGroup } from "@inkpage/format";
import { renderStrokeToCanvas } from "../utils/ink";

export interface InkCanvasProps {
  inkGroup: InkGroup;
  tool: "select" | "pen" | "highlighter" | "eraser" | "lasso";
  color: string;
  width: number;
  zoom: number;
  pan: { x: number; y: number };
  offset?: { x: number; y: number };
  viewportWidth?: number;
  viewportHeight?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  clipRect?: { x: number; y: number; w: number; h: number } | null;
  onUpdateStrokes: (strokes: Stroke[]) => void;
  onErasePoint?: (x: number, y: number) => void;
  onRecordMetric?: (
    latency: number,
    pointerType: string,
    pressure: number,
    coalesced: number,
  ) => void;
}

export const InkCanvas: React.FC<InkCanvasProps> = ({
  inkGroup,
  tool,
  color,
  width,
  zoom,
  pan,
  offset,
  viewportWidth,
  viewportHeight,
  canvasWidth: propCanvasWidth,
  canvasHeight: propCanvasHeight,
  clipRect,
  onUpdateStrokes,
  onErasePoint,
  onRecordMetric,
}) => {
  // Double-buffering canvases sized strictly to viewport:
  // 1. completedCanvasRef: Renders all saved strokes transformed by pan & zoom
  // 2. activeCanvasRef: Renders ONLY the current in-progress stroke with 0 React state updates
  const completedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activeDirtyRectRef = useRef<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>(null);
  const lastPenTimeRef = useRef<number>(0);
  const capturedPointerIdRef = useRef<number | null>(null);
  const strokeBBoxesRef = useRef<Map<string, [number, number, number, number]>>(
    new Map(),
  );

  const canvasWidth = viewportWidth || propCanvasWidth || 1920;
  const canvasHeight = viewportHeight || propCanvasHeight || 1080;

  const originX = pan.x + (offset?.x || 0) * zoom;
  const originY = pan.y + (offset?.y || 0) * zoom;

  const isPointerContact = (e: React.PointerEvent | PointerEvent): boolean => {
    if (e.pointerType === "touch") return true;
    if (e.pointerType === "pen") {
      // Stylus is active if pen tip pressure > 0.01 OR primary contact button is down
      return e.pressure > 0.01 || (e.buttons & 1) !== 0;
    }
    // Mouse: primary button (left button) must be down
    return (e.buttons & 1) !== 0;
  };

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

  const inkGroupRef = useRef(inkGroup);
  inkGroupRef.current = inkGroup;
  const onUpdateStrokesRef = useRef(onUpdateStrokes);
  onUpdateStrokesRef.current = onUpdateStrokes;
  const lastRenderedStrokesRef = useRef<Stroke[] | null>(null);

  // Redraw all completed strokes transformed into viewport space with frustum culling
  const redrawCompletedStrokes = useCallback(() => {
    const canvas = completedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(zoom, 0, 0, zoom, originX, originY);

    if (clipRect) {
      ctx.beginPath();
      ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
      ctx.clip();
    }

    const strokes = inkGroupRef.current.strokes || [];
    const margin = 100;
    const viewMinX = -originX / zoom - margin;
    const viewMaxX = (canvas.width - originX) / zoom + margin;
    const viewMinY = -originY / zoom - margin;
    const viewMaxY = (canvas.height - originY) / zoom + margin;

    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      if (!stroke.pts || stroke.pts.length === 0) continue;
      const bbox = getStrokeBBox(stroke);
      // Viewport frustum culling: skip offscreen strokes
      if (
        bbox[2] < viewMinX ||
        bbox[0] > viewMaxX ||
        bbox[3] < viewMinY ||
        bbox[1] > viewMaxY
      ) {
        continue;
      }
      renderStrokeToCanvas(ctx, stroke);
    }
    ctx.restore();
  }, [zoom, originX, originY, clipRect]);

  useEffect(() => {
    if (strokeBBoxesRef.current.size > 1000) {
      const activeIds = new Set((inkGroup.strokes || []).map((s) => s.id));
      for (const key of Array.from(strokeBBoxesRef.current.keys())) {
        if (!activeIds.has(key)) {
          strokeBBoxesRef.current.delete(key);
        }
      }
    }
    redrawCompletedStrokes();
    lastRenderedStrokesRef.current = inkGroup.strokes;
  }, [redrawCompletedStrokes, inkGroup.strokes, canvasWidth, canvasHeight]);

  // Safely stop active stroke and commit finished stroke to page data
  const commitActiveStroke = useCallback(() => {
    // Release pointer capture immediately to prevent input traps
    if (capturedPointerIdRef.current !== null && activeCanvasRef.current) {
      try {
        if (activeCanvasRef.current.hasPointerCapture(capturedPointerIdRef.current)) {
          activeCanvasRef.current.releasePointerCapture(capturedPointerIdRef.current);
        }
      } catch {}
      capturedPointerIdRef.current = null;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const finishedStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    activeDirtyRectRef.current = null;

    // Render finished stroke to completed canvas and commit to page data
    if (finishedStroke && finishedStroke.pts && finishedStroke.pts.length > 0) {
      const compCanvas = completedCanvasRef.current;
      if (compCanvas) {
        const compCtx = compCanvas.getContext("2d");
        if (compCtx) {
          compCtx.save();
          compCtx.setTransform(zoom, 0, 0, zoom, originX, originY);
          if (clipRect) {
            compCtx.beginPath();
            compCtx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
            compCtx.clip();
          }
          renderStrokeToCanvas(compCtx, finishedStroke);
          compCtx.restore();
        }
      }

      const currentStrokes = inkGroupRef.current.strokes || [];
      const updatedStrokes = [...currentStrokes, finishedStroke];
      inkGroupRef.current = {
        ...inkGroupRef.current,
        strokes: updatedStrokes,
      };
      lastRenderedStrokesRef.current = updatedStrokes;
      onUpdateStrokesRef.current(updatedStrokes);
    }

    // Clear active stroke canvas layer
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const actCtx = activeCanvas.getContext("2d");
      if (actCtx) {
        actCtx.save();
        actCtx.setTransform(1, 0, 0, 1, 0, 0);
        actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        actCtx.restore();
      }
    }
  }, [zoom, originX, originY, clipRect]);

  // Pointer Down: Start active stroke
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "pen" && tool !== "highlighter" && tool !== "eraser") return;

    // Right-click or middle-click should not draw
    if (e.button === 1 || e.button === 2) return;

    // Reject hovering stylus in the air and unclicked mouse
    if (!isPointerContact(e)) return;

    // If a stroke was somehow still active, finalize it safely before starting the new one
    if (isDrawingRef.current) {
      commitActiveStroke();
    }

    // Palm Rejection: Ignore touch if stylus/pen was active in last 800ms
    const now = performance.now();
    if (e.pointerType === "pen") {
      lastPenTimeRef.current = now;
    } else if (
      e.pointerType === "touch" &&
      now - lastPenTimeRef.current < 800
    ) {
      return;
    }

    // Stop propagation so parent viewport does not intercept or steal pointer capture
    e.stopPropagation();
    (e.nativeEvent as any).__handled = true;
    (e.nativeEvent as any).__pointerHandled = true;

    try {
      if (e.pointerId !== undefined && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId);
        capturedPointerIdRef.current = e.pointerId;
      }
    } catch {}

    isDrawingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - originX) / zoom;
    const y = (e.clientY - rect.top - originY) / zoom;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    // If fixed paper preset is active, verify contact is inside paper sheet (with edge tolerance buffer)
    if (clipRect) {
      const buffer = 30;
      if (
        x < clipRect.x - buffer ||
        x > clipRect.x + clipRect.w + buffer ||
        y < clipRect.y - buffer ||
        y > clipRect.y + clipRect.h + buffer
      ) {
        commitActiveStroke();
        return;
      }
    }

    if (tool === "eraser") {
      eraseStrokeAt(x, y);
      return;
    }

    const strokeWidth =
      tool === "highlighter" ? Math.max(width * 3, 16) : width;
    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: tool === "highlighter" ? "highlighter" : "pen",
      color,
      width: strokeWidth,
      pts: [[x, y, pressure, e.tiltX || 0, e.timeStamp || now]],
    };

    activeStrokeRef.current = newStroke;
    activeDirtyRectRef.current = { minX: x, minY: y, maxX: x, maxY: y };

    // Draw initial point onto the active canvas
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const actCtx = activeCanvas.getContext("2d");
      if (actCtx) {
        actCtx.save();
        actCtx.setTransform(1, 0, 0, 1, 0, 0);
        actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        actCtx.setTransform(zoom, 0, 0, zoom, originX, originY);
        if (clipRect) {
          actCtx.beginPath();
          actCtx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
          actCtx.clip();
        }
        renderStrokeToCanvas(actCtx, newStroke);
        actCtx.restore();
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

    // Contact lost (stylus lifted into air or mouse button released)
    if (!isPointerContact(e)) {
      commitActiveStroke();
      return;
    }

    const now = performance.now();
    if (e.pointerType === "pen") {
      lastPenTimeRef.current = now;
    } else if (
      e.pointerType === "touch" &&
      now - lastPenTimeRef.current < 800
    ) {
      return;
    }

    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    if (tool === "eraser") {
      const x = (e.clientX - rect.left - originX) / zoom;
      const y = (e.clientY - rect.top - originY) / zoom;
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
      const px = (ev.clientX - rect.left - originX) / zoom;
      const py = (ev.clientY - rect.top - originY) / zoom;
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
      const actCtx = activeCanvas.getContext("2d");
      if (actCtx) {
        actCtx.save();
        if (dirty) {
          const margin = Math.max((activeStrokeRef.current?.width || 4) * 2, 50);
          const screenMinX = (dirty.minX - margin) * zoom + originX;
          const screenMinY = (dirty.minY - margin) * zoom + originY;
          const screenMaxX = (dirty.maxX + margin) * zoom + originX;
          const screenMaxY = (dirty.maxY + margin) * zoom + originY;

          const cx = Math.max(0, Math.floor(screenMinX));
          const cy = Math.max(0, Math.floor(screenMinY));
          const cw = Math.min(
            activeCanvas.width - cx,
            Math.ceil(screenMaxX - screenMinX),
          );
          const ch = Math.min(
            activeCanvas.height - cy,
            Math.ceil(screenMaxY - screenMinY),
          );

          actCtx.setTransform(1, 0, 0, 1, 0, 0);
          actCtx.clearRect(cx, cy, cw, ch);
        } else {
          actCtx.setTransform(1, 0, 0, 1, 0, 0);
          actCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        }

        actCtx.setTransform(zoom, 0, 0, zoom, originX, originY);
        if (clipRect) {
          actCtx.beginPath();
          actCtx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
          actCtx.clip();
        }
        renderStrokeToCanvas(actCtx, activeStrokeRef.current);
        actCtx.restore();
      }
    }

    if (onRecordMetric && e.timeStamp > 0) {
      const latency = performance.now() - e.timeStamp;
      onRecordMetric(
        Math.max(0, latency),
        e.pointerType,
        e.pressure,
        coalescedCount,
      );
    }
  };

  // Pointer Up: Finalize stroke and commit to page data
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    try {
      if (
        e.pointerId !== undefined &&
        e.currentTarget?.hasPointerCapture?.(e.pointerId)
      ) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    capturedPointerIdRef.current = null;

    commitActiveStroke();
  };

  // Reset drawing state if active tool changes
  useEffect(() => {
    commitActiveStroke();
  }, [tool, commitActiveStroke]);

  // Window-level safety cleanup: if pointerup/cancel/blur/escape fires globally, finalize any stroke
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      commitActiveStroke();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Escape") {
        commitActiveStroke();
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    window.addEventListener("blur", handleGlobalPointerUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      window.removeEventListener("blur", handleGlobalPointerUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [commitActiveStroke]);

  // Optimized Stroke Eraser with AABB pre-filtering and 18px radius collision
  const eraseStrokeAt = (x: number, y: number) => {
    if (onErasePoint) {
      onErasePoint(x, y);
    }

    const currentStrokes = inkGroupRef.current.strokes || [];
    const threshold = 18;
    const thresholdSq = threshold * threshold;
    const remaining = currentStrokes.filter((stroke) => {
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

    if (remaining.length !== currentStrokes.length) {
      inkGroupRef.current = {
        ...inkGroupRef.current,
        strokes: remaining,
      };
      lastRenderedStrokesRef.current = remaining;
      onUpdateStrokesRef.current(remaining);
      redrawCompletedStrokes();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        zIndex: 20,
        pointerEvents:
          tool === "pen" || tool === "highlighter" || tool === "eraser"
            ? "auto"
            : "none",
      }}
    >
      {/* Background Layer: All Completed Saved Strokes */}
      <canvas
        ref={completedCanvasRef}
        data-canvas-type="completed"
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Foreground Layer: Active In-Progress Stroke */}
      <canvas
        ref={activeCanvasRef}
        data-canvas-type="active"
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor:
            tool === "pen" || tool === "highlighter"
              ? "crosshair"
              : tool === "eraser"
                ? "cell"
                : "default",
        }}
      />
    </div>
  );
};
