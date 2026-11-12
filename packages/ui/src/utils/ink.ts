import { getStroke } from 'perfect-freehand';
import type { Stroke, StrokePoint } from '@inkpage/format';

export interface StrokeOptions {
  size?: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  simulatePressure?: boolean;
}

/**
 * Computes polygon outline points from a stroke's raw points using perfect-freehand
 */
export function getSvgPathFromStroke(stroke: Stroke, options?: StrokeOptions): string {
  if (!stroke.pts || stroke.pts.length === 0) return '';

  const outline = getStroke(stroke.pts as unknown as number[][], {
    size: stroke.width || options?.size || 4,
    thinning: stroke.tool === 'highlighter' ? 0 : options?.thinning ?? 0.5,
    smoothing: options?.smoothing ?? 0.5,
    streamline: options?.streamline ?? 0.5,
    simulatePressure: options?.simulatePressure ?? false,
  });

  const len = outline.length;
  if (len === 0) return '';

  let d = `M ${outline[0][0].toFixed(2)} ${outline[0][1].toFixed(2)}`;
  for (let i = 1; i < len; i++) {
    d += ` L ${outline[i][0].toFixed(2)} ${outline[i][1].toFixed(2)}`;
  }
  return d + ' Z';
}

/**
 * Draws stroke directly onto a Canvas 2D context for ultra-high performance
 */
export function renderStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  options?: StrokeOptions
): void {
  if (!stroke.pts || stroke.pts.length === 0) return;

  const outline = getStroke(stroke.pts as unknown as number[][], {
    size: stroke.width || options?.size || 4,
    thinning: stroke.tool === 'highlighter' ? 0 : options?.thinning ?? 0.5,
    smoothing: options?.smoothing ?? 0.5,
    streamline: options?.streamline ?? 0.5,
  });

  if (outline.length === 0) return;

  ctx.save();
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.fillStyle = stroke.color;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);

  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
