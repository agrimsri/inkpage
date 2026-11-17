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

  const isDarkCanvas =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  ctx.save();
  if (stroke.tool === 'highlighter') {
    if (isDarkCanvas) {
      // In dark mode, multiply blending darkens into blackness; source-over gives rich translucent highlight
      ctx.globalAlpha = 0.45;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = 'multiply';
    }
  } else {
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  let drawColor = stroke.color;
  // If in dark mode and ink stroke was drawn with black / dark charcoal, adapt to crisp high-contrast light ink
  if (isDarkCanvas && stroke.tool !== 'highlighter') {
    const lower = drawColor?.toLowerCase();
    if (lower === '#1d1d1f' || lower === '#000000' || lower === '#111111' || lower === '#1c1c1e' || lower === 'black') {
      drawColor = '#f5f5f7';
    }
  } else if (!isDarkCanvas && stroke.tool !== 'highlighter') {
    const lower = drawColor?.toLowerCase();
    if (lower === '#f5f5f7' || lower === '#ffffff' || lower === 'white') {
      drawColor = '#1d1d1f';
    }
  }

  ctx.fillStyle = drawColor;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);

  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
