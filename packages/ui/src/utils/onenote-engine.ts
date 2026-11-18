import type {
  Page,
  Item,
  Container,
  InkGroup,
  Stroke,
  StrokePoint,
  PMDocNode,
  NoteTag,
} from '@inkpage/format';

export const RESERVED_CONTAINER_WIDTH = 624;
export const MIN_CONTAINER_WIDTH = 160;

export interface OutlineItemData {
  id: string;
  indent: number;
  tags: NoteTag[];
  text: string;
  bulletStyle?: 'none' | 'disc' | 'number';
  collapsed?: boolean;
}

// -----------------------------------------------------------------------------
// Tier 1: Elastic Note Containers & Auto-Grow
// -----------------------------------------------------------------------------

/**
 * Accurately measures text width using canvas 2D context or proportional fallback.
 */
export function measureTextWidth(
  text: string,
  fontSize: number = 14,
  fontFamily: string = 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif',
  isBold: boolean = false
): number {
  if (!text) return 0;

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
        return Math.ceil(ctx.measureText(text).width);
      }
    } catch {
      // Fall through to heuristic if canvas is not available in test runner
    }
  }

  // Heuristic text measurement fallback
  const charWidth = fontSize * (isBold ? 0.62 : 0.56);
  return Math.ceil(text.length * charWidth);
}

/**
 * Calculates line width for a single outline item including grip gutter,
 * indentation, bullet/tags, text, and right padding.
 */
export function calculateOutlineLineWidth(
  item: OutlineItemData,
  fontSize: number = 14,
  fontFamily?: string,
  isBold: boolean = false
): number {
  const gutterWidth = 24; // paragraph grip handle gutter
  const indentWidth = (item.indent || 0) * 24;
  const tagCount = (item.tags || []).filter((t) => t.type !== 'todo').length;
  const bulletOrTodoWidth = 24;
  const tagsWidth = tagCount * 20;

  // Measure longest line if text contains soft breaks (\n)
  const lines = (item.text || '').split('\n');
  let maxTextWidth = 0;
  for (const line of lines) {
    const w = measureTextWidth(line, fontSize, fontFamily, isBold);
    if (w > maxTextWidth) maxTextWidth = w;
  }
  const rightPadding = 32;

  return gutterWidth + indentWidth + bulletOrTodoWidth + tagsWidth + maxTextWidth + rightPadding;
}

/**
 * Computes the elastic width for a container based on its outline items.
 * Caps at reservedWidth (~624px) or paper right margin when isWidthSetByUser is false.
 */
export function calculateElasticContainerWidth(
  items: OutlineItemData[],
  currentX: number,
  paperWidth?: number | 'auto',
  fontSize: number = 14,
  fontFamily?: string,
  isBold: boolean = false
): number {
  let maxLineWidth = MIN_CONTAINER_WIDTH;

  for (const item of items) {
    const lineWidth = calculateOutlineLineWidth(item, fontSize, fontFamily, isBold);
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }
  }

  const maxAllowed =
    typeof paperWidth === 'number' && paperWidth > 0
      ? Math.min(RESERVED_CONTAINER_WIDTH, Math.max(MIN_CONTAINER_WIDTH, paperWidth - currentX - 20))
      : RESERVED_CONTAINER_WIDTH;

  return Math.min(maxAllowed, Math.max(MIN_CONTAINER_WIDTH, maxLineWidth));
}

/**
 * Parses PMDocNode content to OutlineItemData array.
 */
export function parsePMDocToOutlineItems(doc: PMDocNode, containerId: string): OutlineItemData[] {
  const parsed: OutlineItemData[] = [];
  const content = doc.content || [];

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (node.type === 'outlineItem') {
      const indent = (node.attrs?.indent as number) || 0;
      const tags = (node.attrs?.tags as NoteTag[]) || [];
      const collapsed = Boolean(node.attrs?.collapsed);
      let text = '';
      if (node.content) {
        for (const inline of node.content) {
          if (inline.text) text += inline.text;
        }
      }
      parsed.push({
        id: (node.attrs?.id as string) || `outline_node_${containerId}_${i}`,
        indent,
        tags,
        text,
        collapsed,
      });
    }
  }

  if (parsed.length === 0) {
    parsed.push({
      id: `outline_node_${containerId}_0`,
      indent: 0,
      tags: [],
      text: '',
      collapsed: false,
    });
  }

  return parsed;
}

/**
 * Converts OutlineItemData array back to PMDocNode.
 */
export function outlineItemsToPMDoc(items: OutlineItemData[]): PMDocNode {
  return {
    type: 'doc',
    content: items.map((item) => ({
      type: 'outlineItem',
      attrs: {
        id: item.id,
        indent: item.indent,
        tags: item.tags,
        collapsed: item.collapsed,
      },
      content: item.text
        ? [
            {
              type: 'text',
              text: item.text,
            },
          ]
        : [],
    })),
  };
}

// -----------------------------------------------------------------------------
// Tier 2: Paragraph Grip Handles & Subtree Reordering
// -----------------------------------------------------------------------------

/**
 * Returns all indices that belong to the subtree rooted at rootIndex.
 * Includes rootIndex and all subsequent items with strictly greater indentation.
 */
export function getSubtreeIndices(items: OutlineItemData[], rootIndex: number): number[] {
  if (rootIndex < 0 || rootIndex >= items.length) return [];
  const indices = [rootIndex];
  const rootIndent = items[rootIndex].indent;

  for (let i = rootIndex + 1; i < items.length; i++) {
    if (items[i].indent > rootIndent) {
      indices.push(i);
    } else {
      break;
    }
  }
  return indices;
}

/**
 * Returns whether the outline item has child outline items (indented descendants).
 */
export function hasSubtreeChildren(items: OutlineItemData[], rootIndex: number): boolean {
  if (rootIndex < 0 || rootIndex >= items.length - 1) return false;
  return items[rootIndex + 1].indent > items[rootIndex].indent;
}

/**
 * Atomically reorders a paragraph subtree to targetDropIndex.
 */
export function reorderSubtree(
  items: OutlineItemData[],
  rootIndex: number,
  targetDropIndex: number
): OutlineItemData[] {
  const subtreeIndices = getSubtreeIndices(items, rootIndex);
  if (subtreeIndices.length === 0) return items;

  const subtreeLen = subtreeIndices.length;
  // If target is inside the subtree, no-op
  if (targetDropIndex >= rootIndex && targetDropIndex <= rootIndex + subtreeLen) {
    return items;
  }

  const subtree = items.slice(rootIndex, rootIndex + subtreeLen);
  const remaining = items.filter((_, i) => i < rootIndex || i >= rootIndex + subtreeLen);

  const adjustedTarget = targetDropIndex > rootIndex ? targetDropIndex - subtreeLen : targetDropIndex;
  const clampedTarget = Math.max(0, Math.min(remaining.length, adjustedTarget));

  // If dropped at index 0 (top of document), the dropped root must have indent = 0
  let adjustedSubtree = subtree;
  if (clampedTarget === 0 && subtree[0].indent > 0) {
    const shift = subtree[0].indent;
    adjustedSubtree = subtree.map((item) => ({
      ...item,
      indent: Math.max(0, item.indent - shift),
    }));
  }

  remaining.splice(clampedTarget, 0, ...adjustedSubtree);
  return remaining;
}

/**
 * Toggles the collapsed status of a paragraph outline subtree.
 * Only toggles if the element actually has child outline elements.
 */
export function toggleSubtreeCollapse(
  items: OutlineItemData[],
  rootIndex: number
): OutlineItemData[] {
  if (rootIndex < 0 || rootIndex >= items.length) return items;
  if (!hasSubtreeChildren(items, rootIndex)) return items;

  const newItems = [...items];
  newItems[rootIndex] = {
    ...newItems[rootIndex],
    collapsed: !newItems[rootIndex].collapsed,
  };
  return newItems;
}

/**
 * Returns only the visible outline items, skipping children of collapsed parents.
 */
export function getVisibleOutlineItems(
  items: OutlineItemData[]
): { item: OutlineItemData; originalIndex: number }[] {
  const visible: { item: OutlineItemData; originalIndex: number }[] = [];
  let collapsedIndentThreshold: number | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (collapsedIndentThreshold !== null) {
      if (item.indent > collapsedIndentThreshold) {
        // Child of a collapsed element: skip
        continue;
      } else {
        collapsedIndentThreshold = null;
      }
    }

    visible.push({ item, originalIndex: i });

    if (item.collapsed && hasSubtreeChildren(items, i)) {
      collapsedIndentThreshold = item.indent;
    }
  }

  return visible;
}

// -----------------------------------------------------------------------------
// Tier 3: Rule Line Baseline Alignment
// -----------------------------------------------------------------------------

/**
 * Calculates container top padding offset so the first line's baseline sits directly
 * on a canvas rule line without vertical drift.
 */
export function calculateRuleLineBaselineOffset(
  containerY: number,
  ruleSpacing: number,
  fontSize: number = 14,
  headerOffset: number = 24,
  baseTopPadding: number = 4,
  halfLeading: number = 0
): number {
  if (ruleSpacing <= 0) return 0;

  const fontAscent = Math.round(fontSize * 0.78);
  const unadjustedBaseline = containerY + headerOffset + baseTopPadding + halfLeading + fontAscent;
  const targetBaseline = Math.ceil(unadjustedBaseline / ruleSpacing) * ruleSpacing;
  const offset = targetBaseline - unadjustedBaseline;

  return offset >= 0 ? offset : 0;
}

/**
 * Quantizes outline paragraph line-height to integer multiples of the rule line height
 * so text baselines remain synchronized with background lines.
 */
export function quantizeLineHeight(fontSize: number, ruleSpacing: number): number {
  if (ruleSpacing <= 0) return Math.round(fontSize * 1.5);
  const requiredHeight = fontSize * 1.25;
  const multiplier = Math.max(1, Math.ceil(requiredHeight / ruleSpacing));
  return multiplier * ruleSpacing;
}

// -----------------------------------------------------------------------------
// Tier 4: Canvas "Insert Space" Tool & Splitting
// -----------------------------------------------------------------------------

/**
 * Splits a Container's PMDocNode at relativeY0 into upper and lower doc trees.
 * - If cut line is within header bar (relativeY0 <= 28), the whole container remains intact in lowerDoc.
 * - If cut line is below all outline elements, the whole container remains intact in upperDoc.
 * - Slices between outline paragraphs at the cut plane.
 * - Keeps collapsed parent elements and their hidden children together in the same doc.
 * - Normalizes lowerDoc indentations so no orphaned indentation levels exist.
 */
export function splitContainerDoc(
  doc: PMDocNode,
  relativeY0: number,
  estimatedItemHeight: number = 28
): { upperDoc: PMDocNode; lowerDoc: PMDocNode; splitOffsetY: number } {
  const content = doc.content || [];
  const topOffset = 16;
  const N = content.length;

  if (N === 0) {
    return {
      upperDoc: { type: 'doc', content: [] },
      lowerDoc: { type: 'doc', content: [] },
      splitOffsetY: 0,
    };
  }

  // Find nearest paragraph boundary
  let splitIndex = Math.round((relativeY0 - topOffset) / estimatedItemHeight);
  splitIndex = Math.max(0, Math.min(N, splitIndex));

  // If cut line is within top padding/header, all items remain in lowerDoc
  if (splitIndex === 0) {
    return {
      upperDoc: { type: 'doc', content: [] },
      lowerDoc: doc,
      splitOffsetY: 0,
    };
  }

  // If cut line is below all outline items, all items remain in upperDoc
  if (splitIndex >= N) {
    return {
      upperDoc: doc,
      lowerDoc: { type: 'doc', content: [] },
      splitOffsetY: topOffset + N * estimatedItemHeight,
    };
  }

  // If splitIndex falls within a collapsed parent's hidden children,
  // push splitIndex past the hidden children so they stay with their parent
  while (splitIndex < N) {
    let parentCollapsed = false;
    let parentIndent = -1;
    for (let p = splitIndex - 1; p >= 0; p--) {
      const pIndent = (content[p].attrs?.indent as number) || 0;
      if (content[p].attrs?.collapsed) {
        parentCollapsed = true;
        parentIndent = pIndent;
        break;
      }
    }
    const currIndent = (content[splitIndex].attrs?.indent as number) || 0;
    if (parentCollapsed && currIndent > parentIndent) {
      splitIndex++;
    } else {
      break;
    }
  }

  if (splitIndex >= N) {
    return {
      upperDoc: doc,
      lowerDoc: { type: 'doc', content: [] },
      splitOffsetY: topOffset + N * estimatedItemHeight,
    };
  }

  const upperContent = content.slice(0, splitIndex);
  const rawLowerContent = content.slice(splitIndex);

  // Normalize lower container indents to eliminate orphaned levels
  const lowerBaseIndent = (rawLowerContent[0].attrs?.indent as number) || 0;
  let prevIndent = 0;

  const lowerContent = rawLowerContent.map((node, idx) => {
    const rawIndent = (node.attrs?.indent as number) || 0;
    let normalizedIndent = Math.max(0, rawIndent - lowerBaseIndent);
    if (idx === 0) {
      normalizedIndent = 0;
    } else {
      normalizedIndent = Math.min(normalizedIndent, prevIndent + 1);
    }
    prevIndent = normalizedIndent;

    return {
      ...node,
      attrs: {
        ...node.attrs,
        indent: normalizedIndent,
      },
    };
  });

  const splitOffsetY = splitIndex * estimatedItemHeight;

  return {
    upperDoc: { type: 'doc', content: upperContent },
    lowerDoc: { type: 'doc', content: lowerContent },
    splitOffsetY,
  };
}

/**
 * Applies the spatial displacement algorithm for "Insert Space":
 * - Translates all entities below y0 down by dy.
 * - Slices ink strokes and translates points below y0.
 * - Splits containers spanning across y0 into upper and lower containers.
 */
export function applyInsertSpaceToPage(
  page: Page,
  y0: number,
  dy: number,
  estimatedItemHeight: number = 28
): Page {
  if (dy === 0) return page;

  const updatedItems: Item[] = [];

  for (const item of page.items) {
    if (item.kind === 'container') {
      const container = item as Container;
      const contTop = container.y;
      const contBottom = container.y + container.h;

      if (contBottom <= y0) {
        // Purely above y0: keep unchanged
        updatedItems.push(container);
      } else if (contTop >= y0) {
        // Purely below y0: translate down by dy
        updatedItems.push({
          ...container,
          y: Math.round(container.y + dy),
        });
      } else {
        // Spans across y0: Split container!
        const relativeY0 = y0 - contTop;
        const { upperDoc, lowerDoc, splitOffsetY } = splitContainerDoc(
          container.doc,
          relativeY0,
          estimatedItemHeight
        );

        if (!lowerDoc.content || lowerDoc.content.length === 0) {
          // All items remained above y0
          updatedItems.push(container);
        } else if (!upperDoc.content || upperDoc.content.length === 0) {
          // All items were below y0: move whole container down
          updatedItems.push({
            ...container,
            y: Math.round(container.y + dy),
          });
        } else {
          const upperH = Math.max(50, Math.round(y0 - contTop));
          const lowerH = Math.max(50, Math.round(contBottom - y0));

          const upperContainer: Container = {
            ...container,
            id: container.id,
            doc: upperDoc,
            h: upperH,
          };

          const lowerContainer: Container = {
            ...container,
            id: `container_${Date.now()}_lower_${Math.random().toString(36).substring(2, 6)}`,
            y: Math.round(y0 + dy),
            doc: lowerDoc,
            h: lowerH,
            z: container.z + 1,
            isWidthSetByUser: container.isWidthSetByUser,
          };

          updatedItems.push(upperContainer);
          updatedItems.push(lowerContainer);
        }
      }
    } else if (item.kind === 'ink') {
      const inkGroup = item as InkGroup;
      const newStrokes: Stroke[] = [];

      for (const stroke of inkGroup.strokes || []) {
        const pts = stroke.pts || [];
        if (pts.length === 0) {
          newStrokes.push(stroke);
          continue;
        }

        let minY = Infinity;
        let maxY = -Infinity;
        let sumY = 0;
        for (const p of pts) {
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
          sumY += p[1];
        }
        const centroidY = sumY / pts.length;

        if (maxY < y0) {
          // Entire stroke above y0
          newStrokes.push(stroke);
        } else if (minY >= y0 || centroidY >= y0) {
          // Entire stroke or majority below y0
          newStrokes.push({
            ...stroke,
            pts: pts.map((p) => [p[0], p[1] + dy, ...p.slice(2)] as StrokePoint),
          });
        } else {
          // Intersecting stroke: translate points at or below y0
          newStrokes.push({
            ...stroke,
            pts: pts.map((p) =>
              p[1] >= y0 ? ([p[0], p[1] + dy, ...p.slice(2)] as StrokePoint) : p
            ),
          });
        }
      }

      let newY = inkGroup.y;
      let newH = inkGroup.h;
      if (inkGroup.y >= y0) {
        newY += dy;
      } else if (inkGroup.y + inkGroup.h > y0) {
        newH += dy;
      }

      updatedItems.push({
        ...inkGroup,
        y: Math.round(newY),
        h: Math.round(newH),
        strokes: newStrokes,
      });
    } else {
      // Box items: image, table, math, shape, file, audio, video
      const itemTop = item.y;
      const itemBottom = item.y + item.h;

      if (itemTop >= y0) {
        updatedItems.push({
          ...item,
          y: Math.round(item.y + dy),
        });
      } else if (itemBottom > y0) {
        // Center-based split heuristic for non-container atomic items
        if (itemTop + item.h / 2 >= y0) {
          updatedItems.push({
            ...item,
            y: Math.round(item.y + dy),
          });
        } else {
          updatedItems.push(item);
        }
      } else {
        updatedItems.push(item);
      }
    }
  }

  return { ...page, items: updatedItems };
}
