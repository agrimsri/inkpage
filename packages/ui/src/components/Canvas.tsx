import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  Page,
  Item,
  Container,
  InkGroup,
  Stroke,
  StrokePoint,
  ImageItem,
  FileItem,
  TableItem,
  TableCell,
  MathItem,
  ShapeItem,
  ShapeType,
  AudioItem,
} from "@inkpage/format";
import { OutlineEditor } from "./OutlineEditor";
import { InkCanvas } from "./InkCanvas";
import { VirtualRuler } from "./VirtualRuler";
import { MathBox } from "./MathBox";
import { AudioPlayerWidget } from "./AudioPlayerWidget";
import { appleTheme, appleStyles } from "../theme";
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
  X,
} from "lucide-react";

export interface CanvasProps {
  page: Page;
  tool:
    | "select"
    | "text"
    | "pen"
    | "highlighter"
    | "eraser"
    | "lasso"
    | "table"
    | "math";
  activeColor: string;
  activeWidth: number;
  selectedShape?: ShapeType | null;
  onClearShape?: () => void;
  rulerVisible?: boolean;
  onToggleRuler?: () => void;
  onUpdatePage: (updatedPage: Page) => void;
  onRecordMetric?: (
    latency: number,
    pointerType: string,
    pressure: number,
    coalesced: number,
  ) => void;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onSelectTool?: (tool: any) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
}

function pointInPolygon(p: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getPolygonBBox(poly: { x: number; y: number }[]): [number, number, number, number] {
  let minX = poly[0].x, minY = poly[0].y, maxX = poly[0].x, maxY = poly[0].y;
  for (let i = 1; i < poly.length; i++) {
    const pt = poly[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  return [minX, minY, maxX, maxY];
}

function getStarPoints(
  w: number,
  h: number,
  points = 5,
  innerRatio = 0.5,
): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  let pts = "";
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < 2 * points; i++) {
    const rCurrentX = i % 2 === 0 ? rx : rx * innerRatio;
    const rCurrentY = i % 2 === 0 ? ry : ry * innerRatio;
    const x = cx + rCurrentX * Math.cos(angle);
    const y = cy + rCurrentY * Math.sin(angle);
    pts += (i === 0 ? "" : " ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    angle += step;
  }
  return pts;
}

export const Canvas: React.FC<CanvasProps> = React.memo(
  ({
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
    onSelectTool,
    zoom: propZoom,
    onZoomChange: propOnZoomChange,
    pan: propPan,
    onPanChange: propOnPanChange,
  }) => {
    const [internalZoom, setInternalZoom] = useState<number>(1.0);
    const [internalPan, setInternalPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

    const zoom = propZoom !== undefined ? propZoom : internalZoom;
    const setZoom = useCallback((action: number | ((prev: number) => number)) => {
      const next = typeof action === 'function' ? action(zoom) : action;
      if (propOnZoomChange) propOnZoomChange(next);
      else setInternalZoom(next);
    }, [zoom, propOnZoomChange]);

    const pan = propPan !== undefined ? propPan : internalPan;
    const setPan = useCallback((action: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
      const next = typeof action === 'function' ? action(pan) : action;
      if (propOnPanChange) propOnPanChange(next);
      else setInternalPan(next);
    }, [pan, propOnPanChange]);

    const selectedItemId =
      externalSelectedId !== undefined
        ? externalSelectedId
        : internalSelectedId;
    const setSelectedItemId = (id: string | null) => {
      if (externalSetSelectedId) externalSetSelectedId(id);
      else setInternalSelectedId(id);
    };

    // Multi-selection for Lasso / Marquee / Select tool
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);

    // Lasso drawing state
    const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[] | null>(null);
    const lassoPointsRef = useRef<{ x: number; y: number }[] | null>(null);
    const isLassoingRef = useRef<boolean>(false);

    // Marquee selection box
    const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);
    const marqueeBoxRef = useRef<{ startX: number; startY: number; currX: number; currY: number } | null>(null);
    const isMarqueeRef = useRef<boolean>(false);

    // Dragging whole selection (items + strokes)
    const selectionDragRef = useRef<{
      startX: number;
      startY: number;
      initialItems: { id: string; x: number; y: number }[];
      initialStrokes: { id: string; pts: StrokePoint[] }[];
    } | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const isPanningRef = useRef<boolean>(false);
    const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isSpaceDownRef = useRef<boolean>(false);
    const [isSpaceDown, setIsSpaceDown] = useState(false);

    const clearSelection = useCallback(() => {
      setSelectedItemIds([]);
      setSelectedStrokeIds([]);
      setSelectedItemId(null);
    }, [setSelectedItemId]);

    // Find or create InkGroup item for pen drawing
    const currentInkGroup = (page.items.find(
      (i) => i.kind === "ink",
    ) as InkGroup) || {
      id: "ink_group_primary",
      kind: "ink",
      x: 0,
      y: 0,
      w: 3200,
      h: 2400,
      z: 10,
      strokes: [],
    };

    const handleUpdateStrokes = useCallback(
      (strokes: any[]) => {
        const existingIndex = page.items.findIndex((i) => i.kind === "ink");
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
      },
      [page, currentInkGroup, onUpdatePage],
    );

    const deleteItem = useCallback(
      (itemId: string) => {
        onUpdatePage({
          ...page,
          items: page.items.filter((i) => i.id !== itemId),
        });
        if (selectedItemId === itemId) setSelectedItemId(null);
        setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
      },
      [page, selectedItemId, onUpdatePage],
    );

    const handleDeleteSelection = useCallback(() => {
      const remainingItems = page.items.filter(
        (i) => !selectedItemIds.includes(i.id),
      );
      const remainingStrokes = currentInkGroup.strokes.filter(
        (s) => !selectedStrokeIds.includes(s.id),
      );
      handleUpdateStrokes(remainingStrokes);
      onUpdatePage({
        ...page,
        items: remainingItems.map((i) =>
          i.kind === "ink" ? { ...i, strokes: remainingStrokes } : i,
        ),
      });
      clearSelection();
    }, [
      page,
      selectedItemIds,
      selectedStrokeIds,
      currentInkGroup.strokes,
      handleUpdateStrokes,
      onUpdatePage,
      clearSelection,
    ]);

    const compositeBBox = useMemo(() => {
      if (selectedItemIds.length === 0 && selectedStrokeIds.length === 0)
        return null;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      for (const id of selectedItemIds) {
        const item = page.items.find((i) => i.id === id);
        if (item) {
          minX = Math.min(minX, item.x);
          minY = Math.min(minY, item.y);
          maxX = Math.max(maxX, item.x + item.w);
          maxY = Math.max(maxY, item.y + (item.h || 80));
        }
      }

      for (const id of selectedStrokeIds) {
        const stroke = currentInkGroup.strokes?.find((s) => s.id === id);
        if (stroke && stroke.pts) {
          for (const pt of stroke.pts) {
            minX = Math.min(minX, pt[0]);
            minY = Math.min(minY, pt[1]);
            maxX = Math.max(maxX, pt[0]);
            maxY = Math.max(maxY, pt[1]);
          }
        }
      }

      if (minX === Infinity) return null;
      const padding = 8;
      return {
        x: minX - padding,
        y: minY - padding,
        w: maxX - minX + padding * 2,
        h: maxY - minY + padding * 2,
      };
    }, [selectedItemIds, selectedStrokeIds, page.items, currentInkGroup.strokes]);

    const startSelectionDrag = (e: React.PointerEvent) => {
      e.stopPropagation();
      const initialItems = page.items
        .filter((i) => selectedItemIds.includes(i.id))
        .map((i) => ({ id: i.id, x: i.x, y: i.y }));

      const initialStrokes = currentInkGroup.strokes
        .filter((s) => selectedStrokeIds.includes(s.id))
        .map((s) => ({ id: s.id, pts: s.pts ? [...s.pts] : [] }));

      selectionDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialItems,
        initialStrokes,
      };
    };

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement;
        const isInput =
          activeEl?.tagName === "INPUT" ||
          activeEl?.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement)?.isContentEditable;
        if (e.code === "Space" && !e.repeat && !isInput) {
          isSpaceDownRef.current = true;
          setIsSpaceDown(true);
        }
        if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
          if (
            selectedItemIds.length > 0 ||
            selectedStrokeIds.length > 0 ||
            selectedItemId
          ) {
            e.preventDefault();
            handleDeleteSelection();
          }
        }
        if (e.key === "Escape") {
          clearSelection();
        }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          isSpaceDownRef.current = false;
          setIsSpaceDown(false);
          isPanningRef.current = false;
        }
      };
      const handleBlur = () => {
        isSpaceDownRef.current = false;
        setIsSpaceDown(false);
        isPanningRef.current = false;
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("blur", handleBlur);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("blur", handleBlur);
      };
    }, [selectedItemIds, selectedStrokeIds, selectedItemId, handleDeleteSelection, clearSelection]);

    const [viewportSize, setViewportSize] = useState({ w: 1920, h: 1080 });

    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const w = containerRef.current.clientWidth || window.innerWidth;
          const h = containerRef.current.clientHeight || window.innerHeight;
          setViewportSize({ w, h });
        }
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
      }
      return () => {
        window.removeEventListener("resize", updateSize);
        observer?.disconnect();
      };
    }, []);

    // Page background & dimensions
    const pageBgColor =
      !page.pageColor || page.pageColor === "#ffffff"
        ? appleTheme.colors.bgCanvas
        : page.pageColor;
    const paperPreset = page.size?.preset || "auto";
    const sheetW =
      paperPreset === "letter" ? 816 : paperPreset === "a4" ? 794 : 0;
    const sheetH =
      paperPreset === "letter" ? 1056 : paperPreset === "a4" ? 1123 : 0;
    const sheetX = 80;
    const sheetY = 50;
    const ruleLineColor =
      !page.background?.color || page.background.color === "rgba(0, 0, 0, 0.13)"
        ? "var(--color-rule-line, rgba(0, 0, 0, 0.08))"
        : page.background.color;

    const getCanvasCoords = useCallback(
      (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        let x = (clientX - rect.left - pan.x) / zoom;
        let y = (clientY - rect.top - pan.y) / zoom;
        if (paperPreset !== "auto") {
          x -= sheetX;
          y -= sheetY;
        }
        return { x, y };
      },
      [pan.x, pan.y, zoom, paperPreset],
    );

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
      mode: "both" | "horizontal";
    } | null>(null);

    // Shape interactive drawing state
    const [drawingShape, setDrawingShape] = useState<{
      startX: number;
      startY: number;
      currX: number;
      currY: number;
    } | null>(null);
    const drawingShapeRef = useRef<{
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
      if (
        isSpaceDown ||
        isSpaceDownRef.current ||
        e.button === 1 ||
        e.buttons === 4 ||
        (e.button === 0 &&
          e.shiftKey &&
          !draggingItemRef.current &&
          !selectedShape)
      ) {
        try {
          if (e.pointerId !== undefined && e.currentTarget?.setPointerCapture) {
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        } catch {}
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
      }

      const { x: canvasX, y: canvasY } = getCanvasCoords(e.clientX, e.clientY);

      // Drawing a shape
      if (selectedShape) {
        try {
          if (e.pointerId !== undefined && e.currentTarget?.setPointerCapture) {
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        } catch {}
        const shapeData = {
          startX: canvasX,
          startY: canvasY,
          currX: canvasX,
          currY: canvasY,
        };
        drawingShapeRef.current = shapeData;
        setDrawingShape(shapeData);
        return;
      }

      // Lasso Tool: start freehand lasso path
      if (tool === "lasso") {
        if (e.button === 0) {
          try {
            if (e.pointerId !== undefined && e.currentTarget?.setPointerCapture) {
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          } catch {}
          isLassoingRef.current = true;
          lassoPointsRef.current = [{ x: canvasX, y: canvasY }];
          setLassoPath([{ x: canvasX, y: canvasY }]);
          return;
        }
      }

      // Clicking on empty canvas
      const targetEl = e.target as HTMLElement;
      const isItem = Boolean(
        targetEl.closest?.(".canvas-note-item") ||
        targetEl.closest?.(".outline-container") ||
        targetEl.closest?.(".container-move-bar") ||
        targetEl.closest?.(".lasso-composite-box")
      );
      const isBackground =
        !isItem &&
        (e.target === containerRef.current ||
          targetEl.classList?.contains?.("canvas-viewport") ||
          targetEl.classList?.contains?.("canvas-background") ||
          targetEl.classList?.contains?.("canvas-paper-sheet") ||
          Boolean(targetEl.closest?.(".canvas-background")) ||
          Boolean(targetEl.closest?.(".canvas-viewport")));

      if (isBackground) {
        if (tool === "text") {
          const newContainer: Container = {
            id: `container_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            kind: "container",
            x: Math.round(canvasX),
            y: Math.round(canvasY),
            w: 520,
            h: 180,
            z: (page.items.length || 0) + 1,
            doc: {
              type: "doc",
              content: [
                {
                  type: "outlineItem",
                  attrs: { indent: 0 },
                  content: [{ type: "text", text: "" }],
                },
              ],
            },
          };

          onUpdatePage({
            ...page,
            items: [...page.items, newContainer],
          });
          setSelectedItemId(newContainer.id);
          setSelectedItemIds([newContainer.id]);
          setSelectedStrokeIds([]);
          return;
        } else if (tool === "select") {
          try {
            if (e.pointerId !== undefined && e.currentTarget?.setPointerCapture) {
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          } catch {}
          marqueeBoxRef.current = {
            startX: canvasX,
            startY: canvasY,
            currX: canvasX,
            currY: canvasY,
          };
          isMarqueeRef.current = true;
          setMarqueeBox({
            startX: canvasX,
            startY: canvasY,
            currX: canvasX,
            currY: canvasY,
          });
          clearSelection();
        }
      }
    };

  // Global safety cleanup: release any active pan or drag state if window blur or cancel occurs globally
  useEffect(() => {
    const handleGlobalAbort = () => {
      isPanningRef.current = false;
      drawingShapeRef.current = null;
      draggingItemRef.current = null;
      resizingItemRef.current = null;
      selectionDragRef.current = null;
    };
    window.addEventListener('pointercancel', handleGlobalAbort);
    window.addEventListener('blur', handleGlobalAbort);
    return () => {
      window.removeEventListener('pointercancel', handleGlobalAbort);
      window.removeEventListener('blur', handleGlobalAbort);
    };
  }, []);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanningRef.current) {
        if (e.buttons === 0 && !isSpaceDown && !isSpaceDownRef.current) {
          isPanningRef.current = false;
          return;
        }
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      const { x: canvasX, y: canvasY } = getCanvasCoords(e.clientX, e.clientY);

      // Update active shape drawing preview
      if (drawingShapeRef.current) {
        drawingShapeRef.current.currX = canvasX;
        drawingShapeRef.current.currY = canvasY;
        setDrawingShape({ ...drawingShapeRef.current });
        return;
      }

      // Lasso Tool path accumulation
      if (isLassoingRef.current && lassoPointsRef.current) {
        lassoPointsRef.current.push({ x: canvasX, y: canvasY });
        setLassoPath([...lassoPointsRef.current]);
        return;
      }

      // Marquee box expansion
      if (isMarqueeRef.current && marqueeBoxRef.current) {
        marqueeBoxRef.current.currX = canvasX;
        marqueeBoxRef.current.currY = canvasY;
        setMarqueeBox({ ...marqueeBoxRef.current });
        return;
      }

      // Moving multiple items and strokes selected by Lasso / Marquee
      if (selectionDragRef.current) {
        const dx = (e.clientX - selectionDragRef.current.startX) / zoom;
        const dy = (e.clientY - selectionDragRef.current.startY) / zoom;

        const updatedItems = page.items.map((item) => {
          const init = selectionDragRef.current!.initialItems.find((i) => i.id === item.id);
          if (init) {
            return {
              ...item,
              x: Math.round(init.x + dx),
              y: Math.round(init.y + dy),
            };
          }
          return item;
        });

        const updatedStrokes = currentInkGroup.strokes.map((stroke) => {
          const init = selectionDragRef.current!.initialStrokes.find((s) => s.id === stroke.id);
          if (init) {
            return {
              ...stroke,
              pts: init.pts.map((pt) => [
                Math.round(pt[0] + dx),
                Math.round(pt[1] + dy),
                pt[2],
                pt[3],
                pt[4],
              ] as StrokePoint),
            };
          }
          return stroke;
        });

        handleUpdateStrokes(updatedStrokes);
        onUpdatePage({
          ...page,
          items: updatedItems.map((i) =>
            i.kind === "ink" ? { ...i, strokes: updatedStrokes } : i,
          ),
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
              x: Math.round(draggingItemRef.current!.initX + dx),
              y: Math.round(draggingItemRef.current!.initY + dy),
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
              h:
                mode === "both"
                  ? Math.max(
                      80,
                      Math.round(resizingItemRef.current!.initH + dy),
                    )
                  : item.h,
            };
          }
          return item;
        });

        onUpdatePage({ ...page, items: updatedItems });
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        if (
          e.pointerId !== undefined &&
          e.currentTarget?.hasPointerCapture?.(e.pointerId)
        ) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      isPanningRef.current = false;

      // Finalize shape creation
      const currentShape = drawingShapeRef.current;
      if (currentShape && selectedShape) {
        drawingShapeRef.current = null;
        setDrawingShape(null);

        const x = Math.min(currentShape.startX, currentShape.currX);
        const y = Math.min(currentShape.startY, currentShape.currY);
        const w = Math.max(
          24,
          Math.abs(currentShape.currX - currentShape.startX),
        );
        const h = Math.max(
          24,
          Math.abs(currentShape.currY - currentShape.startY),
        );

        const newShape: ShapeItem = {
          id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          kind: "shape",
          shapeType: selectedShape,
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
          z: 5,
          strokeColor: activeColor,
          strokeWidth: activeWidth || 2,
          fillColor: "transparent",
        };

        onUpdatePage({
          ...page,
          items: [...page.items, newShape],
        });
        if (onClearShape) onClearShape();
        return;
      }

      // Finalize Lasso Tool selection
      if (isLassoingRef.current) {
        isLassoingRef.current = false;
        const poly = lassoPointsRef.current || [];
        lassoPointsRef.current = null;
        setLassoPath(null);

        if (poly.length >= 3) {
          const polyBBox = getPolygonBBox(poly);
          const spreadX = polyBBox[2] - polyBBox[0];
          const spreadY = polyBBox[3] - polyBBox[1];

          if (spreadX > 6 || spreadY > 6) {
            const matchedItemIds: string[] = [];
            for (const item of page.items) {
              if (item.kind === "ink") continue;
              const w = item.w || 200;
              const h = item.h || 80;
              const center = { x: item.x + w / 2, y: item.y + h / 2 };
              if (
                pointInPolygon(center, poly) ||
                pointInPolygon({ x: item.x, y: item.y }, poly) ||
                pointInPolygon({ x: item.x + w, y: item.y + h }, poly)
              ) {
                matchedItemIds.push(item.id);
              }
            }

            const matchedStrokeIds: string[] = [];
            for (const stroke of currentInkGroup.strokes || []) {
              if (!stroke.pts || stroke.pts.length === 0) continue;
              const inLasso = stroke.pts.some((pt) =>
                pointInPolygon({ x: pt[0], y: pt[1] }, poly),
              );
              if (inLasso) {
                matchedStrokeIds.push(stroke.id);
              }
            }

            setSelectedItemIds(matchedItemIds);
            setSelectedStrokeIds(matchedStrokeIds);
            if (matchedItemIds.length === 1 && matchedStrokeIds.length === 0) {
              setSelectedItemId(matchedItemIds[0]);
            } else {
              setSelectedItemId(null);
            }
            return;
          }
        }

        // Click with Lasso: check if hit item or stroke
        if (poly.length > 0) {
          const pt = poly[0];
          const hitItem = page.items.find(
            (i) =>
              i.kind !== "ink" &&
              pt.x >= i.x &&
              pt.x <= i.x + i.w &&
              pt.y >= i.y &&
              pt.y <= i.y + (i.h || 80),
          );
          if (hitItem) {
            setSelectedItemIds([hitItem.id]);
            setSelectedStrokeIds([]);
            setSelectedItemId(hitItem.id);
          } else {
            const hitStroke = currentInkGroup.strokes.find((s) =>
              s.pts?.some((p) => Math.hypot(p[0] - pt.x, p[1] - pt.y) < 14),
            );
            if (hitStroke) {
              setSelectedStrokeIds([hitStroke.id]);
              setSelectedItemIds([]);
              setSelectedItemId(null);
            } else {
              clearSelection();
            }
          }
        }
        return;
      }

      // Finalize Marquee Selection Box
      if (isMarqueeRef.current) {
        isMarqueeRef.current = false;
        const box = marqueeBoxRef.current;
        marqueeBoxRef.current = null;
        setMarqueeBox(null);

        if (box) {
          const minX = Math.min(box.startX, box.currX);
          const maxX = Math.max(box.startX, box.currX);
          const minY = Math.min(box.startY, box.currY);
          const maxY = Math.max(box.startY, box.currY);

          if (maxX - minX > 8 || maxY - minY > 8) {
            const matchedItemIds: string[] = [];
            for (const item of page.items) {
              if (item.kind === "ink") continue;
              const w = item.w || 200;
              const h = item.h || 80;
              if (
                !(
                  item.x + w < minX ||
                  item.x > maxX ||
                  item.y + h < minY ||
                  item.y > maxY
                )
              ) {
                matchedItemIds.push(item.id);
              }
            }

            const matchedStrokeIds: string[] = [];
            for (const stroke of currentInkGroup.strokes || []) {
              if (!stroke.pts) continue;
              if (
                stroke.pts.some(
                  (pt) =>
                    pt[0] >= minX &&
                    pt[0] <= maxX &&
                    pt[1] >= minY &&
                    pt[1] <= maxY,
                )
              ) {
                matchedStrokeIds.push(stroke.id);
              }
            }

            setSelectedItemIds(matchedItemIds);
            setSelectedStrokeIds(matchedStrokeIds);
            if (matchedItemIds.length === 1 && matchedStrokeIds.length === 0) {
              setSelectedItemId(matchedItemIds[0]);
            } else {
              setSelectedItemId(null);
            }
          } else {
            clearSelection();
          }
        }
        return;
      }

      // Finalize selection drag
      if (selectionDragRef.current) {
        selectionDragRef.current = null;
        return;
      }

      // Handle Note Container Shift+Drag merge logic
      if (draggingItemRef.current) {
        const draggedId = draggingItemRef.current.id;
        const draggedItem = page.items.find((i) => i.id === draggedId);
        const wasShift = draggingItemRef.current.isShift || e.shiftKey;

        if (draggedItem && draggedItem.kind === "container") {
          // Check for collision with another container
          const targetContainer = page.items.find(
            (i) =>
              i.id !== draggedId &&
              i.kind === "container" &&
              Math.abs(i.x - draggedItem.x) < 200 &&
              Math.abs(i.y - draggedItem.y) < 160,
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
              .map((i) =>
                i.id === targetContainer.id ? { ...i, doc: mergedDoc } : i,
              );

            onUpdatePage({ ...page, items: remainingItems });
            setSelectedItemId(targetContainer.id);
            setSelectedItemIds([targetContainer.id]);
          }
        }

        draggingItemRef.current = null;
      }

      resizingItemRef.current = null;
    };

    const handleErasePoint = useCallback(
      (x: number, y: number) => {
        const hitMargin = 16;
        const hit = page.items.find((item) => {
          if (item.kind !== "shape") return false;
          return (
            x >= item.x - hitMargin &&
            x <= item.x + item.w + hitMargin &&
            y >= item.y - hitMargin &&
            y <= item.y + item.h + hitMargin
          );
        });
        if (hit) {
          deleteItem(hit.id);
        }
      },
      [page.items, deleteItem],
    );

    // Table Helpers
    const handleTableCellUpdate = (
      tableId: string,
      row: number,
      col: number,
      text: string,
    ) => {
      const updated = page.items.map((item) => {
        if (item.id === tableId && item.kind === "table") {
          const tbl = item as TableItem;
          const otherCells = tbl.cells.filter(
            (c) => !(c.row === row && c.col === col),
          );
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
        if (item.id === tableId && item.kind === "table") {
          const tbl = item as TableItem;
          const newRows = tbl.rows + 1;
          const newCells: TableCell[] = [...tbl.cells];
          for (let c = 0; c < tbl.cols; c++) {
            newCells.push({ row: tbl.rows, col: c, text: "" });
          }
          return { ...tbl, rows: newRows, cells: newCells };
        }
        return item;
      });
      onUpdatePage({ ...page, items: updated });
    };

    const handleTableAddCol = (tableId: string) => {
      const updated = page.items.map((item) => {
        if (item.id === tableId && item.kind === "table") {
          const tbl = item as TableItem;
          const newCols = tbl.cols + 1;
          const newCells: TableCell[] = [...tbl.cells];
          for (let r = 0; r < tbl.rows; r++) {
            newCells.push({ row: r, col: tbl.cols, text: "" });
          }
          return { ...tbl, cols: newCols, cells: newCells, w: tbl.w + 120 };
        }
        return item;
      });
      onUpdatePage({ ...page, items: updated });
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const targetEl = e.target as HTMLElement;
      const isItem = Boolean(
        targetEl.closest?.(".canvas-note-item") ||
        targetEl.closest?.(".outline-container") ||
        targetEl.closest?.(".container-move-bar") ||
        targetEl.closest?.(".lasso-composite-box")
      );
      const isBackground =
        !isItem &&
        (e.target === containerRef.current ||
          targetEl.classList?.contains?.("canvas-viewport") ||
          targetEl.classList?.contains?.("canvas-background") ||
          targetEl.classList?.contains?.("canvas-paper-sheet") ||
          Boolean(targetEl.closest?.(".canvas-background")) ||
          Boolean(targetEl.closest?.(".canvas-viewport")));

      if (!isBackground) return;

      const { x: canvasX, y: canvasY } = getCanvasCoords(e.clientX, e.clientY);

      const newContainer: Container = {
        id: `container_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        kind: "container",
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        w: 480,
        h: 200,
        z: (page.items.length || 0) + 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "outlineItem",
              attrs: { indent: 0 },
              content: [{ type: "text", text: "" }],
            },
          ],
        },
      };

      onUpdatePage({
        ...page,
        items: [...page.items, newContainer],
      });
      setSelectedItemId(newContainer.id);
      setSelectedItemIds([newContainer.id]);
      setSelectedStrokeIds([]);
      if (onSelectTool) onSelectTool("text");
    };

    const renderCanvasContent = () => (
      <>
        {/* Render Canvas Items */}
        {page.items.map((item) => {
          if (item.kind === "ink") return null;
          const isSelected = selectedItemId === item.id || selectedItemIds.includes(item.id);
          const isShape = item.kind === "shape";

          return (
            <div
              key={item.id}
              className="canvas-note-item"
              onPointerDown={(e) => {
                if (isShape && tool === "select") {
                  e.stopPropagation();
                  setSelectedItemId(item.id);
                  setSelectedItemIds([item.id]);
                  setSelectedStrokeIds([]);
                  draggingItemRef.current = {
                    id: item.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    initX: item.x,
                    initY: item.y,
                    isShift: e.shiftKey,
                  };
                }
              }}
              style={{
                position: "absolute",
                left: item.x,
                top: item.y,
                width: item.w,
                height: isShape ? item.h : undefined,
                minHeight: isShape ? undefined : item.h,
                zIndex: isShape ? 5 : item.z || 10,
                borderRadius: isShape ? 0 : appleTheme.radii.lg,
                border: isShape
                  ? isSelected && tool === "select"
                    ? `1px dashed ${appleTheme.colors.accent}`
                    : "none"
                  : isSelected
                    ? `1.5px solid ${appleTheme.colors.accent}`
                    : "1px solid transparent",
                backgroundColor: isShape
                  ? "transparent"
                  : isSelected
                    ? appleTheme.colors.bgCanvas
                    : "transparent",
                boxShadow: isShape
                  ? "none"
                  : isSelected
                    ? appleTheme.shadows.card
                    : "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                fontFamily: appleTheme.fonts.sans,
                pointerEvents: isShape
                  ? tool === "select"
                    ? "auto"
                    : "none"
                  : "auto",
              }}
              onClick={(e) => {
                if (tool === "select" || tool === "text") {
                  e.stopPropagation();
                  setSelectedItemId(item.id);
                  setSelectedItemIds([item.id]);
                  setSelectedStrokeIds([]);
                }
              }}
            >
              {/* OneNote Container Anatomy: Top Gray Move Handle Bar */}
              {(!isShape || (tool === "select" && isSelected)) && (
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 10px",
                    backgroundColor: isSelected
                      ? appleTheme.colors.bgSubtle
                      : "transparent",
                    borderTopLeftRadius: appleTheme.radii.lg - 1, // calculated nested radius
                    borderTopRightRadius: appleTheme.radii.lg - 1,
                    cursor: "grab",
                    opacity: isSelected ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: appleTheme.colors.labelSecondary,
                    }}
                  >
                    <GripHorizontal size={14} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {item.kind}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: appleTheme.colors.labelTertiary,
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: appleTheme.radii.xs,
                      transition: appleTheme.transitions.fast,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color =
                        appleTheme.colors.destructive)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.color =
                        appleTheme.colors.labelTertiary)
                    }
                    title="Delete Item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {/* Item Content Rendering */}
              <div
                style={{
                  padding: isShape ? 0 : "4px 8px",
                  width: "100%",
                  height: isShape ? "100%" : "auto",
                }}
              >
                {item.kind === "container" && (
                  <OutlineEditor
                    container={item as Container}
                    isSelected={isSelected}
                    autoFocus={isSelected && tool === "text"}
                    onUpdate={(updatedDoc) => {
                      const updatedItems = page.items.map((i) =>
                        i.id === item.id ? { ...i, doc: updatedDoc } : i,
                      );
                      onUpdatePage({ ...page, items: updatedItems });
                    }}
                    onFocus={() => setSelectedItemId(item.id)}
                  />
                )}

                {item.kind === "shape" && (
                  <div style={{ width: "100%", height: item.h }}>
                    <svg
                      width="100%"
                      height={item.h}
                      style={{ overflow: "visible" }}
                    >
                      <defs>
                        <marker
                          id={`arrowhead-${item.id}`}
                          markerWidth="8"
                          markerHeight="6"
                          refX="7"
                          refY="3"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 8 3, 0 6"
                            fill={(item as ShapeItem).strokeColor}
                          />
                        </marker>
                        <marker
                          id={`arrowhead-start-${item.id}`}
                          markerWidth="8"
                          markerHeight="6"
                          refX="1"
                          refY="3"
                          orient="auto"
                        >
                          <polygon
                            points="8 0, 0 3, 8 6"
                            fill={(item as ShapeItem).strokeColor}
                          />
                        </marker>
                      </defs>

                      {(item as ShapeItem).shapeType === "line" && (
                        <line
                          x1={0}
                          y1={0}
                          x2={item.w}
                          y2={item.h}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "arrow" && (
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

                      {(item as ShapeItem).shapeType === "doubleArrow" && (
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

                      {(item as ShapeItem).shapeType === "rect" && (
                        <rect
                          x={0}
                          y={0}
                          width={item.w}
                          height={item.h}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                          fill={(item as ShapeItem).fillColor || "transparent"}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "roundedRect" && (
                        <rect
                          x={0}
                          y={0}
                          rx={12}
                          ry={12}
                          width={item.w}
                          height={item.h}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                          fill={(item as ShapeItem).fillColor || "transparent"}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "ellipse" && (
                        <ellipse
                          cx={item.w / 2}
                          cy={item.h / 2}
                          rx={item.w / 2 - 2}
                          ry={item.h / 2 - 2}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                          fill={(item as ShapeItem).fillColor || "transparent"}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "triangle" && (
                        <polygon
                          points={`${item.w / 2},2 2,${item.h - 2} ${item.w - 2},${item.h - 2}`}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                          fill={(item as ShapeItem).fillColor || "transparent"}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "diamond" && (
                        <polygon
                          points={`${item.w / 2},2 ${item.w - 2},${item.h / 2} ${item.w / 2},${item.h - 2} 2,${item.h / 2}`}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                          fill={(item as ShapeItem).fillColor || "transparent"}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "star" && (
                        <polygon
                          points={getStarPoints(item.w, item.h, 5, 0.45)}
                          stroke={(item as ShapeItem).strokeColor}
                          strokeWidth={(item as ShapeItem).strokeWidth}
                          fill={(item as ShapeItem).fillColor || "transparent"}
                        />
                      )}

                      {(item as ShapeItem).shapeType === "grid" && (
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

                {item.kind === "audio" && (
                  <AudioPlayerWidget
                    item={item as AudioItem}
                    isSelected={isSelected}
                    onDelete={() => deleteItem(item.id)}
                  />
                )}

                {item.kind === "math" && (
                  <MathBox
                    item={item as MathItem}
                    isSelected={isSelected}
                    onUpdateLatex={(latex) => {
                      const updated = page.items.map((i) =>
                        i.id === item.id ? { ...i, latex } : i,
                      );
                      onUpdatePage({ ...page, items: updated });
                    }}
                    onDelete={() => deleteItem(item.id)}
                  />
                )}

                {item.kind === "image" && (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: appleTheme.colors.bgCard,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${appleTheme.colors.borderSubtle}`,
                        borderRadius: appleTheme.radii.md,
                        padding: 14,
                        boxShadow: appleTheme.shadows.subtle,
                      }}
                    >
                      <ImageIcon
                        size={36}
                        color={appleTheme.colors.labelTertiary}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: appleTheme.colors.labelSecondary,
                          marginTop: 6,
                          fontWeight: 500,
                        }}
                      >
                        {(item as ImageItem).alt || "Image Attachment"}
                      </span>
                      {(item as ImageItem).ocr && (
                        <div style={{ marginTop: 8 }}>
                          <span style={appleStyles.badge("accent")}>
                            OCR: {(item as ImageItem).ocr}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {item.kind === "file" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      backgroundColor: appleTheme.colors.bgCard,
                      border: `1px solid ${appleTheme.colors.borderSubtle}`,
                      borderRadius: appleTheme.radii.md,
                      boxShadow: appleTheme.shadows.subtle,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: appleTheme.radii.sm,
                          backgroundColor: appleTheme.colors.accentTint,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileBox size={20} color={appleTheme.colors.accent} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: appleTheme.colors.labelPrimary,
                          }}
                        >
                          {(item as FileItem).filename}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: appleTheme.colors.labelSecondary,
                            marginTop: 2,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {(item as FileItem).mime} •{" "}
                          {(item as FileItem).size
                            ? `${Math.round((item as FileItem).size! / 1024)} KB`
                            : "Attached"}
                        </div>
                      </div>
                    </div>
                    <button style={appleStyles.primaryButton(false, "sm")}>
                      <Download size={13} />
                      Download
                    </button>
                  </div>
                )}

                {item.kind === "table" && (
                  <div style={{ width: "100%" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <tbody>
                        {Array.from({
                          length: (item as TableItem).rows || 2,
                        }).map((_, r) => (
                          <tr key={r}>
                            {Array.from({
                              length: (item as TableItem).cols || 2,
                            }).map((_, c) => {
                              const cell = (item as TableItem).cells?.find(
                                (cell) => cell.row === r && cell.col === c,
                              );
                              return (
                                <td
                                  key={c}
                                  style={{
                                    border: `1px solid ${appleTheme.colors.borderSubtle}`,
                                    padding: "6px 8px",
                                    backgroundColor:
                                      cell?.shading ||
                                      (r === 0
                                        ? appleTheme.colors.bgSubtle
                                        : appleTheme.colors.bgCard),
                                    fontWeight: r === 0 ? 600 : 400,
                                    minWidth: 80,
                                  }}
                                >
                                  <input
                                    value={cell?.text || ""}
                                    onChange={(e) =>
                                      handleTableCellUpdate(
                                        item.id,
                                        r,
                                        c,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={`R${r}C${c}`}
                                    style={{
                                      width: "100%",
                                      border: "none",
                                      outline: "none",
                                      background: "transparent",
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
                          display: "flex",
                          gap: 6,
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: `1px solid ${appleTheme.colors.borderSubtle}`,
                        }}
                      >
                        <button
                          onClick={() => handleTableAddRow(item.id)}
                          style={appleStyles.secondaryButton(false, "sm")}
                        >
                          <Rows size={12} /> Add Row
                        </button>
                        <button
                          onClick={() => handleTableAddCol(item.id)}
                          style={appleStyles.secondaryButton(false, "sm")}
                        >
                          <Columns size={12} /> Add Col
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OneNote Container Anatomy: Right Sizing Handle Strip */}
              {isSelected && tool === "select" && !isShape && (
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    resizingItemRef.current = {
                      id: item.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initW: item.w,
                      initH: item.h,
                      mode: "horizontal",
                    };
                  }}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 14,
                    bottom: 0,
                    width: 6,
                    cursor: "ew-resize",
                    backgroundColor: "transparent",
                  }}
                  title="Drag to resize container width"
                />
              )}

              {/* Bottom-Right Corner Resize Handle */}
              {isSelected && tool === "select" && (
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    resizingItemRef.current = {
                      id: item.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initW: item.w,
                      initH: item.h,
                      mode: "both",
                    };
                  }}
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 10,
                    height: 10,
                    backgroundColor: appleTheme.colors.accent,
                    border: "1.5px solid #ffffff",
                    borderRadius: appleTheme.radii.xs,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    cursor: "se-resize",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Render Active Shape Preview when drawing */}
        {drawingShape && selectedShape && (
          <div
            style={{
              position: "absolute",
              left: Math.min(drawingShape.startX, drawingShape.currX),
              top: Math.min(drawingShape.startY, drawingShape.currY),
              width: Math.abs(drawingShape.currX - drawingShape.startX),
              height: Math.abs(drawingShape.currY - drawingShape.startY),
              border: `2px dashed ${activeColor}`,
              pointerEvents: "none",
              zIndex: 999,
            }}
          />
        )}

        {/* Render Active Lasso Path preview */}
        {lassoPath && lassoPath.length > 1 && (
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 998,
              overflow: "visible",
            }}
          >
            <polyline
              points={lassoPath.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(0, 102, 204, 0.08)"
              stroke={appleTheme.colors.accent}
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          </svg>
        )}

        {/* Render Active Marquee Selection Box */}
        {marqueeBox && (
          <div
            className="lasso-marquee-box"
            style={{
              position: "absolute",
              left: Math.min(marqueeBox.startX, marqueeBox.currX),
              top: Math.min(marqueeBox.startY, marqueeBox.currY),
              width: Math.abs(marqueeBox.currX - marqueeBox.startX),
              height: Math.abs(marqueeBox.currY - marqueeBox.startY),
              border: `1.5px dashed ${appleTheme.colors.accent}`,
              backgroundColor: "rgba(0, 102, 204, 0.08)",
              pointerEvents: "none",
              zIndex: 998,
            }}
          />
        )}

        {/* Composite Selection Bounding Box & Toolbar */}
        {compositeBBox &&
          (tool === "lasso" ||
            tool === "select" ||
            selectedStrokeIds.length > 0 ||
            selectedItemIds.length > 0) && (
            <div
              className="lasso-composite-box"
              style={{
                position: "absolute",
                left: compositeBBox.x,
                top: compositeBBox.y,
                width: compositeBBox.w,
                height: compositeBBox.h,
                border: `2px dashed ${appleTheme.colors.accent}`,
                backgroundColor: "rgba(0, 102, 204, 0.04)",
                borderRadius: appleTheme.radii.sm,
                pointerEvents: "none",
                zIndex: 60,
              }}
            >
              {/* Floating selection actions pill */}
              <div
                style={{
                  position: "absolute",
                  top: -38,
                  left: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  backgroundColor: appleTheme.colors.glassBg,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: appleTheme.radii.pill,
                  border: `1px solid ${appleTheme.colors.borderSubtle}`,
                  boxShadow: appleTheme.shadows.card,
                  fontFamily: appleTheme.fonts.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  color: appleTheme.colors.labelSecondary,
                  pointerEvents: "auto",
                }}
              >
                <div
                  onPointerDown={startSelectionDrag}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "grab",
                    padding: "2px 4px",
                  }}
                  title="Drag to move all selected items & strokes"
                >
                  <GripHorizontal size={14} color={appleTheme.colors.accent} />
                  <span>
                    {selectedItemIds.length + selectedStrokeIds.length} Selected
                  </span>
                </div>
                <div
                  style={{
                    width: 1,
                    height: 14,
                    backgroundColor: appleTheme.colors.borderMedium,
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSelection();
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: appleTheme.colors.destructive,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 4px",
                    borderRadius: appleTheme.radii.xs,
                  }}
                  title="Delete Selection (Delete / Backspace)"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: appleTheme.colors.labelTertiary,
                    display: "flex",
                    alignItems: "center",
                    padding: "2px 4px",
                  }}
                  title="Deselect (Escape)"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
      </>
    );

    return (
      <div
        ref={containerRef}
        className="canvas-viewport"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor:
            paperPreset === "auto" ? pageBgColor : appleTheme.colors.bgWindow,
          backgroundImage:
            paperPreset === "auto"
              ? page.background?.kind === "rule"
                ? `linear-gradient(${ruleLineColor} 1px, transparent 1px)`
                : page.background?.kind === "grid"
                  ? `radial-gradient(${ruleLineColor} 1.2px, transparent 1.2px)`
                  : "none"
              : "none",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundSize:
            page.background?.kind === "rule"
              ? `100% ${(page.background.spacing || 28) * zoom}px`
              : `${(page.background?.spacing || 24) * zoom}px ${(page.background?.spacing || 24) * zoom}px`,
          cursor: isSpaceDown
            ? isPanningRef.current
              ? "grabbing"
              : "grab"
            : selectedShape
              ? "crosshair"
              : tool === "text"
                ? "text"
                : tool === "lasso"
                  ? "crosshair"
                  : isPanningRef.current
                    ? "grabbing"
                    : "default",
          userSelect: "none",
        }}
      >
        {/* 2D Infinite Canvas Transform Layer */}
        <div
          className="canvas-background"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {paperPreset === "auto" ? (
            renderCanvasContent()
          ) : (
            <div
              className="canvas-paper-sheet"
              style={{
                position: "absolute",
                left: sheetX,
                top: sheetY,
                width: sheetW,
                height: sheetH,
                backgroundColor: pageBgColor,
                boxShadow:
                  "0 12px 36px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                border: `1px solid ${appleTheme.colors.borderMedium}`,
                borderRadius: 4,
                backgroundImage:
                  page.background?.kind === "rule"
                    ? `linear-gradient(${ruleLineColor} 1px, transparent 1px)`
                    : page.background?.kind === "grid"
                      ? `radial-gradient(${ruleLineColor} 1px, transparent 1px)`
                      : "none",
                backgroundSize:
                  page.background?.kind === "rule"
                    ? `100% ${page.background.spacing || 28}px`
                    : `${page.background?.spacing || 24}px ${page.background?.spacing || 24}px`,
              }}
            >
              {renderCanvasContent()}
            </div>
          )}
        </div>

        {/* Vector Ink Layer (Viewport-sized, Hardware-accelerated, Infinite-canvas) */}
        <InkCanvas
          inkGroup={currentInkGroup}
          tool={
            isSpaceDown || selectedShape
              ? "select"
              : tool === "pen" || tool === "highlighter" || tool === "eraser"
                ? tool
                : "select"
          }
          color={activeColor}
          width={activeWidth}
          zoom={zoom}
          pan={pan}
          offset={
            paperPreset !== "auto" ? { x: sheetX, y: sheetY } : { x: 0, y: 0 }
          }
          viewportWidth={viewportSize.w}
          viewportHeight={viewportSize.h}
          clipRect={
            paperPreset === "auto"
              ? null
              : { x: 0, y: 0, w: sheetW, h: sheetH }
          }
          onUpdateStrokes={handleUpdateStrokes}
          onErasePoint={handleErasePoint}
          onRecordMetric={onRecordMetric}
        />

        {/* On-screen Virtual Ruler */}
        <VirtualRuler
          visible={rulerVisible}
          onClose={onToggleRuler || (() => {})}
        />

        {/* Canvas Viewport Zoom & Reset Overlay (Apple Frosted Glass Capsule) */}
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: appleTheme.colors.glassBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "4px 12px",
            borderRadius: appleTheme.radii.pill,
            border: `1px solid ${appleTheme.colors.borderSubtle}`,
            boxShadow: appleTheme.shadows.card,
            fontFamily: appleTheme.fonts.sans,
            fontSize: 12,
            fontWeight: 600,
            color: appleTheme.colors.labelPrimary,
            userSelect: "none",
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z * 0.9))}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "2px 4px",
              color: appleTheme.colors.labelSecondary,
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: appleTheme.radii.xs,
              transition: appleTheme.transitions.fast,
            }}
            title="Zoom Out"
          >
            -
          </button>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              minWidth: 40,
              textAlign: "center",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z * 1.1))}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "2px 4px",
              color: appleTheme.colors.labelSecondary,
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: appleTheme.radii.xs,
              transition: appleTheme.transitions.fast,
            }}
            title="Zoom In"
          >
            +
          </button>
          <div
            style={{
              width: 1,
              height: 14,
              backgroundColor: appleTheme.colors.borderMedium,
              margin: "0 2px",
            }}
          />
          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: appleTheme.colors.accent,
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 4px",
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
  },
);
