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
  const pts = stroke.pts.map((p) => [p[0], p[1], p[2] || 0.5]);

  const outline = getStroke(pts, {
    size: stroke.width || options?.size || 4,
    thinning: stroke.tool === 'highlighter' ? 0 : options?.thinning ?? 0.5,
    smoothing: options?.smoothing ?? 0.5,
    streamline: options?.streamline ?? 0.5,
    simulatePressure: options?.simulatePressure ?? false,
  });

  if (outline.length === 0) return '';

  const d: string[] = [];
  const [first, ...rest] = outline;
  d.push(`M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`);

  for (let i = 0; i < rest.length; i++) {
    const pt = rest[i];
    d.push(`L ${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`);
  }
  d.push('Z');

  return d.join(' ');
}

/**
 * Draws stroke directly onto a Canvas 2D context for ultra-high performance
 */
export function renderStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  options?: StrokeOptions
): void {
  const pts = stroke.pts.map((p) => [p[0], p[1], p[2] || 0.5]);

  const outline = getStroke(pts, {
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
