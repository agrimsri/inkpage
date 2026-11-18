import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Container, PMDocNode, NoteTag } from '@inkpage/format';
import { appleTheme, appleStyles } from '../theme';
import {
  calculateElasticContainerWidth,
  getSubtreeIndices,
  hasSubtreeChildren,
  reorderSubtree,
  toggleSubtreeCollapse,
  getVisibleOutlineItems,
  quantizeLineHeight,
  parsePMDocToOutlineItems,
  outlineItemsToPMDoc,
  type OutlineItemData,
} from '../utils/onenote-engine';
import {
  CheckSquare,
  Square,
  Star,
  HelpCircle,
  Indent,
  Outdent,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';

export { type OutlineItemData } from '../utils/onenote-engine';

export interface OutlineEditorProps {
  container: Container;
  isSelected: boolean;
  autoFocus?: boolean;
  fontFamily?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  fontColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  ruleSpacing?: number;
  containerTopOffset?: number;
  paperWidth?: number | 'auto';
  onUpdate: (updatedDoc: PMDocNode, autoWidth?: number) => void;
  onFocus?: () => void;
  onDelete?: () => void;
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  container,
  isSelected,
  autoFocus = true,
  fontFamily,
  fontSize = 14,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  isStrikethrough = false,
  fontColor,
  textAlign = 'left',
  ruleSpacing,
  containerTopOffset = 0,
  paperWidth = 'auto',
  onUpdate,
  onFocus,
  onDelete,
}) => {
  const [items, setItems] = useState<OutlineItemData[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [selectedSubtreeIndices, setSelectedSubtreeIndices] = useState<number[]>([]);
  const [dragState, setDragState] = useState<{
    rootIndex: number;
    dropTargetIndex: number;
  } | null>(null);

  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize internal state with container doc
  useEffect(() => {
    const parsed = parsePMDocToOutlineItems(container.doc, container.id);
    setItems(parsed);
  }, [container.doc, container.id]);

  // Autofocus input when container becomes selected and autoFocus is enabled
  useEffect(() => {
    if (isSelected && autoFocus) {
      const targetIndex =
        activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : 0;
      const el = inputRefs.current[targetIndex] || inputRefs.current[0];
      if (el && document.activeElement !== el) {
        const timer = setTimeout(() => {
          el.focus({ preventScroll: true });
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [isSelected, autoFocus, items.length]);

  // Adjust textarea heights to content
  useEffect(() => {
    inputRefs.current.forEach((el) => {
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    });
  }, [items, fontSize, fontFamily]);

  // Synchronize back to PMDocNode with elastic auto-width calculation
  const syncToDoc = useCallback(
    (newItems: OutlineItemData[], forcedAutoWidth?: number) => {
      setItems(newItems);
      const doc = outlineItemsToPMDoc(newItems);

      let autoWidth = forcedAutoWidth;
      if (autoWidth === undefined && !container.isWidthSetByUser) {
        autoWidth = calculateElasticContainerWidth(
          newItems,
          container.x,
          paperWidth,
          fontSize,
          fontFamily,
          isBold
        );
      }

      onUpdate(doc, autoWidth);
    },
    [container.x, container.isWidthSetByUser, paperWidth, fontSize, fontFamily, isBold, onUpdate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    // Typing clears subtree selection
    if (selectedSubtreeIndices.length > 0 && e.key !== 'Tab' && e.key !== 'Backspace' && e.key !== 'Delete') {
      setSelectedSubtreeIndices([]);
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const current = items[index];
      const pos = e.currentTarget.selectionStart ?? current.text.length;
      const textBefore = current.text.slice(0, pos);
      const textAfter = current.text.slice(pos);

      const newItems = [...items];
      newItems[index] = {
        ...current,
        text: textBefore,
      };

      const newItem: OutlineItemData = {
        id: `outline_node_${container.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        indent: current.indent,
        tags: current.tags.map((t) => (t.type === 'todo' ? { type: 'todo', done: false } : t)),
        text: textAfter,
        collapsed: false,
      };
      newItems.splice(index + 1, 0, newItem);
      syncToDoc(newItems);
      setTimeout(() => {
        const nextEl = inputRefs.current[index + 1];
        if (nextEl) {
          nextEl.focus({ preventScroll: true });
          nextEl.setSelectionRange(0, 0);
        }
      }, 10);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const newItems = [...items];

      if (selectedSubtreeIndices.length > 0) {
        // Tab operates on selected subtree
        if (e.shiftKey) {
          const minIndent = Math.min(...selectedSubtreeIndices.map((idx) => newItems[idx]?.indent ?? 0));
          if (minIndent > 0) {
            selectedSubtreeIndices.forEach((idx) => {
              if (newItems[idx]) newItems[idx].indent -= 1;
            });
            syncToDoc(newItems);
          }
        } else {
          const maxIndent = Math.max(...selectedSubtreeIndices.map((idx) => newItems[idx]?.indent ?? 0));
          if (maxIndent < 8) {
            selectedSubtreeIndices.forEach((idx) => {
              if (newItems[idx]) newItems[idx].indent += 1;
            });
            syncToDoc(newItems);
          }
        }
        return;
      }

      if (e.shiftKey) {
        // Outdent single item
        if (newItems[index].indent > 0) {
          newItems[index].indent -= 1;
          syncToDoc(newItems);
        }
      } else {
        // Indent single item
        if (newItems[index].indent < 8) {
          newItems[index].indent += 1;
          syncToDoc(newItems);
        }
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      if (selectedSubtreeIndices.length > 0) {
        e.preventDefault();
        if (selectedSubtreeIndices.length < items.length) {
          const newItems = items.filter((_, idx) => !selectedSubtreeIndices.includes(idx));
          setSelectedSubtreeIndices([]);
          syncToDoc(newItems);
        } else if (onDelete) {
          onDelete();
        }
        return;
      }

      const pos = e.currentTarget.selectionStart ?? 0;
      const endPos = e.currentTarget.selectionEnd ?? 0;

      if (e.key === 'Backspace' && pos === 0 && endPos === 0) {
        if (items[index].indent > 0) {
          e.preventDefault();
          const newItems = [...items];
          newItems[index].indent -= 1;
          syncToDoc(newItems);
        } else if (index > 0) {
          e.preventDefault();
          const prevLen = items[index - 1].text.length;
          const newItems = [...items];
          newItems[index - 1] = {
            ...newItems[index - 1],
            text: newItems[index - 1].text + items[index].text,
          };
          newItems.splice(index, 1);
          syncToDoc(newItems);
          setTimeout(() => {
            const prevEl = inputRefs.current[index - 1];
            if (prevEl) {
              prevEl.focus({ preventScroll: true });
              prevEl.setSelectionRange(prevLen, prevLen);
            }
          }, 10);
        } else if (items.length === 1 && items[0].text === '' && onDelete) {
          e.preventDefault();
          onDelete();
        }
      }
    } else if (e.ctrlKey && e.key === '1') {
      e.preventDefault();
      toggleTag(index, 'todo');
    } else if (e.ctrlKey && e.key === '2') {
      e.preventDefault();
      toggleTag(index, 'important');
    } else if (e.ctrlKey && e.key === '3') {
      e.preventDefault();
      toggleTag(index, 'question');
    }
  };

  const toggleTag = (index: number, tagType: 'todo' | 'important' | 'question') => {
    const newItems = [...items];
    const existing = newItems[index].tags.find((t) => t.type === tagType);

    if (tagType === 'todo') {
      if (existing) {
        if (!existing.done) {
          existing.done = true;
        } else {
          newItems[index].tags = newItems[index].tags.filter((t) => t.type !== 'todo');
        }
      } else {
        newItems[index].tags.push({ type: 'todo', done: false });
      }
    } else {
      if (existing) {
        newItems[index].tags = newItems[index].tags.filter((t) => t.type !== tagType);
      } else {
        newItems[index].tags.push({ type: tagType });
      }
    }

    syncToDoc(newItems);
  };

  // Tier 2: Grip Single-Click selects subtree
  const handleGripClick = (originalIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus?.();
    const subtree = getSubtreeIndices(items, originalIndex);
    setSelectedSubtreeIndices(subtree);
  };

  // Tier 2: Grip Double-Click collapses/expands subtree
  const handleGripDoubleClick = (originalIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasSubtreeChildren(items, originalIndex)) return;
    const updated = toggleSubtreeCollapse(items, originalIndex);
    syncToDoc(updated);
  };

  // Tier 2: Drag and drop subtree reordering
  const handleGripPointerDown = (originalIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      if (e.pointerId !== undefined && (e.currentTarget as HTMLElement)?.setPointerCapture) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    } catch {}

    const subtree = getSubtreeIndices(items, originalIndex);
    setSelectedSubtreeIndices(subtree);
    setDragState({
      rootIndex: originalIndex,
      dropTargetIndex: originalIndex,
    });
  };

  const handleGripPointerMove = (e: React.PointerEvent) => {
    if (!dragState || !containerRef.current) return;
    e.stopPropagation();

    const clientY = e.clientY;
    let targetIndex = items.length;

    for (let i = 0; i < items.length; i++) {
      const el = rowRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex !== dragState.dropTargetIndex) {
      setDragState({
        ...dragState,
        dropTargetIndex: targetIndex,
      });
    }
  };

  const handleGripPointerUp = (e: React.PointerEvent) => {
    try {
      if (
        e.pointerId !== undefined &&
        (e.currentTarget as HTMLElement)?.hasPointerCapture?.(e.pointerId)
      ) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (dragState) {
      if (dragState.dropTargetIndex !== dragState.rootIndex) {
        const rootId = items[dragState.rootIndex]?.id;
        const reordered = reorderSubtree(items, dragState.rootIndex, dragState.dropTargetIndex);
        syncToDoc(reordered);
        if (rootId) {
          const newRootIdx = reordered.findIndex((it) => it.id === rootId);
          if (newRootIdx !== -1) {
            setSelectedSubtreeIndices(getSubtreeIndices(reordered, newRootIdx));
          }
        }
      }
      setDragState(null);
    }
  };

  // Visible items filtered for collapsed ancestors
  const visibleItems = getVisibleOutlineItems(items);

  // Line height quantization for Tier 3
  const isRuleActive = Boolean(ruleSpacing && ruleSpacing > 0);
  const quantizedHeight = isRuleActive ? quantizeLineHeight(fontSize, ruleSpacing!) : undefined;
  const lineStyleHeight = quantizedHeight ? `${quantizedHeight}px` : undefined;

  return (
    <div
      ref={containerRef}
      className="outline-container"
      onClick={(e) => {
        onFocus?.();
        // Clear subtree selection if clicked on blank space
        if (selectedSubtreeIndices.length > 0) {
          setSelectedSubtreeIndices([]);
        }
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName !== 'INPUT') {
          const idx =
            activeItemIndex >= 0 && activeItemIndex < items.length
              ? activeItemIndex
              : Math.max(0, items.length - 1);
          inputRefs.current[idx]?.focus({ preventScroll: true });
        }
      }}
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: isRuleActive ? containerTopOffset : 4,
        position: 'relative',
      }}
    >
      {/* Container Floating Toolbar when selected (Apple Frosted Glass Capsule) */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -38,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '3px 6px',
            backgroundColor: appleTheme.colors.glassBg,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${appleTheme.colors.borderSubtle}`,
            borderRadius: appleTheme.radii.pill,
            boxShadow: appleTheme.shadows.card,
            zIndex: 100,
          }}
        >
          <button
            title="To-Do Tag (Ctrl+1)"
            onClick={() => toggleTag(activeItemIndex, 'todo')}
            style={quickToolbarBtnStyle}
          >
            <CheckSquare size={15} color={appleTheme.colors.accent} />
          </button>
          <button
            title="Important Tag (Ctrl+2)"
            onClick={() => toggleTag(activeItemIndex, 'important')}
            style={quickToolbarBtnStyle}
          >
            <Star size={15} color="#ff9500" />
          </button>
          <button
            title="Question Tag (Ctrl+3)"
            onClick={() => toggleTag(activeItemIndex, 'question')}
            style={quickToolbarBtnStyle}
          >
            <HelpCircle size={15} color={appleTheme.colors.purple} />
          </button>
          <div
            style={{
              width: 1,
              height: 16,
              backgroundColor: appleTheme.colors.borderMedium,
              margin: '0 4px',
            }}
          />
          <button
            title="Indent (Tab)"
            onClick={() => {
              const newItems = [...items];
              if (selectedSubtreeIndices.length > 0) {
                const maxIndent = Math.max(...selectedSubtreeIndices.map((idx) => newItems[idx]?.indent ?? 0));
                if (maxIndent < 8) {
                  selectedSubtreeIndices.forEach((idx) => {
                    if (newItems[idx]) newItems[idx].indent += 1;
                  });
                  syncToDoc(newItems);
                }
                return;
              }
              if (newItems[activeItemIndex]?.indent < 8) {
                newItems[activeItemIndex].indent += 1;
                syncToDoc(newItems);
              }
            }}
            style={quickToolbarBtnStyle}
          >
            <Indent size={15} color={appleTheme.colors.labelSecondary} />
          </button>
          <button
            title="Outdent (Shift+Tab)"
            onClick={() => {
              const newItems = [...items];
              if (selectedSubtreeIndices.length > 0) {
                const minIndent = Math.min(...selectedSubtreeIndices.map((idx) => newItems[idx]?.indent ?? 0));
                if (minIndent > 0) {
                  selectedSubtreeIndices.forEach((idx) => {
                    if (newItems[idx]) newItems[idx].indent -= 1;
                  });
                  syncToDoc(newItems);
                }
                return;
              }
              if (newItems[activeItemIndex]?.indent > 0) {
                newItems[activeItemIndex].indent -= 1;
                syncToDoc(newItems);
              }
            }}
            style={quickToolbarBtnStyle}
          >
            <Outdent size={15} color={appleTheme.colors.labelSecondary} />
          </button>
          {onDelete && (
            <>
              <div
                style={{
                  width: 1,
                  height: 16,
                  backgroundColor: appleTheme.colors.borderMedium,
                  margin: '0 4px',
                }}
              />
              <button
                type="button"
                title="Delete Container (Delete / Backspace)"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedSubtreeIndices.length > 0 && selectedSubtreeIndices.length < items.length) {
                    const newItems = items.filter((_, idx) => !selectedSubtreeIndices.includes(idx));
                    setSelectedSubtreeIndices([]);
                    syncToDoc(newItems);
                    return;
                  }
                  onDelete();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                style={{
                  ...quickToolbarBtnStyle,
                  color: appleTheme.colors.destructive,
                }}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Outline Items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isRuleActive ? 0 : 4,
          fontFamily: appleTheme.fonts.sans,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, originalIndex }) => {
          const todoTag = item.tags.find((t) => t.type === 'todo');
          const hasImportant = item.tags.some((t) => t.type === 'important');
          const hasQuestion = item.tags.some((t) => t.type === 'question');
          const isSubtreeSelected = selectedSubtreeIndices.includes(originalIndex);
          const hasChildren = hasSubtreeChildren(items, originalIndex);
          const isCollapsed = Boolean(item.collapsed);

          return (
            <div
              key={item.id}
              ref={(el) => (rowRefs.current[originalIndex] = el)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                paddingLeft: item.indent * 24,
                gap: 4,
                minHeight: lineStyleHeight || 24,
                backgroundColor: isSubtreeSelected
                  ? 'rgba(0, 102, 204, 0.08)'
                  : 'transparent',
                borderRadius: appleTheme.radii.xs,
                transition: 'background-color 0.15s ease',
                position: 'relative',
              }}
            >
              {/* Tier 2: Paragraph Grip Handle in Left Gutter */}
              <div
                className="paragraph-grip-gutter"
                onClick={(e) => handleGripClick(originalIndex, e)}
                onDoubleClick={(e) => handleGripDoubleClick(originalIndex, e)}
                onPointerDown={(e) => handleGripPointerDown(originalIndex, e)}
                onPointerMove={handleGripPointerMove}
                onPointerUp={handleGripPointerUp}
                title={
                  hasChildren
                    ? isCollapsed
                      ? 'Double-click to expand outline subtree (+)'
                      : 'Drag to reorder subtree, Click to select subtree, Double-click to collapse'
                    : 'Drag to reorder subtree, Click to select subtree'
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: lineStyleHeight || 24,
                  cursor: 'grab',
                  color: isSubtreeSelected
                    ? appleTheme.colors.accent
                    : appleTheme.colors.labelTertiary,
                  position: 'relative',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                {/* Grip Icon */}
                <GripVertical size={13} />

                {/* Tier 2: '+' badge indicator when child outline elements are collapsed */}
                {isCollapsed && hasChildren && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = toggleSubtreeCollapse(items, originalIndex);
                      syncToDoc(updated);
                    }}
                    title="Collapsed outline element: Click to expand children"
                    style={{
                      position: 'absolute',
                      right: -3,
                      top: 1,
                      width: 11,
                      height: 11,
                      backgroundColor: appleTheme.colors.accent,
                      color: '#ffffff',
                      borderRadius: '50%',
                      fontSize: 9,
                      fontWeight: 800,
                      lineHeight: '11px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </span>
                )}
              </div>

              {/* Bullet / To-Do Checkbox */}
              {todoTag ? (
                <button
                  type="button"
                  onClick={() => toggleTag(originalIndex, 'todo')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: todoTag.done
                      ? appleTheme.colors.success
                      : appleTheme.colors.labelTertiary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: lineStyleHeight || 24,
                    flexShrink: 0,
                    transition: appleTheme.transitions.fast,
                  }}
                >
                  {todoTag.done ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              ) : (
                <div
                  style={{
                    height: lineStyleHeight || 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: appleTheme.colors.labelTertiary,
                      margin: '0 4px',
                    }}
                  />
                </div>
              )}

              {/* Tag Icons */}
              {hasImportant && (
                <div style={{ height: lineStyleHeight || 24, display: 'flex', alignItems: 'center' }}>
                  <Star size={14} color="#ff9500" fill="#ff9500" />
                </div>
              )}
              {hasQuestion && (
                <div style={{ height: lineStyleHeight || 24, display: 'flex', alignItems: 'center' }}>
                  <HelpCircle size={14} color={appleTheme.colors.purple} />
                </div>
              )}

              {/* Text Field with dynamic width auto-expansion & soft-wrapping */}
              <textarea
                ref={(el) => (inputRefs.current[originalIndex] = el)}
                value={item.text}
                rows={1}
                placeholder={
                  originalIndex === 0 && items.length === 1 ? 'Type notes or outline...' : ''
                }
                onFocus={() => {
                  setActiveItemIndex(originalIndex);
                  if (selectedSubtreeIndices.length > 0) {
                    setSelectedSubtreeIndices([]);
                  }
                }}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  const newItems = [...items];
                  newItems[originalIndex] = {
                    ...newItems[originalIndex],
                    text: e.target.value,
                  };
                  syncToDoc(newItems);
                }}
                onKeyDown={(e) => handleKeyDown(e, originalIndex)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  resize: 'none',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  padding: 0,
                  margin: 0,
                  fontFamily: isSelected && fontFamily ? fontFamily : 'inherit',
                  fontSize: isSelected && fontSize ? fontSize : 14,
                  fontWeight: isSelected && isBold ? 700 : 400,
                  fontStyle: isSelected && isItalic ? 'italic' : 'normal',
                  lineHeight: lineStyleHeight || '1.5',
                  minHeight: lineStyleHeight || 24,
                  textAlign: isSelected && textAlign ? textAlign : 'left',
                  color: todoTag?.done
                    ? appleTheme.colors.labelQuaternary
                    : isSelected && fontColor
                      ? fontColor
                      : appleTheme.colors.labelPrimary,
                  textDecoration: todoTag?.done
                    ? 'line-through'
                    : isSelected && isUnderline
                      ? 'underline'
                      : isSelected && isStrikethrough
                        ? 'line-through'
                        : 'none',
                }}
              />
            </div>
          );
        })}

        {/* Tier 2: Visual Insertion Drop Line during Drag & Drop Reordering */}
        {dragState && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: getDropLineY(rowRefs.current, dragState.dropTargetIndex, items.length),
              height: 2,
              backgroundColor: appleTheme.colors.accent,
              boxShadow: '0 0 4px rgba(0, 102, 204, 0.4)',
              zIndex: 50,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Visual circle pip at start of line */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: appleTheme.colors.accent,
                position: 'absolute',
                left: -3,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function getDropLineY(
  rowEls: (HTMLDivElement | null)[],
  targetIndex: number,
  totalItems: number
): number {
  if (targetIndex <= 0) return 0;
  for (let i = targetIndex - 1; i >= 0; i--) {
    const el = rowEls[i];
    if (el) {
      return el.offsetTop + el.offsetHeight;
    }
  }
  for (let i = targetIndex; i < totalItems; i++) {
    const el = rowEls[i];
    if (el) {
      return el.offsetTop;
    }
  }
  return 0;
}

const quickToolbarBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  padding: 0,
  border: 'none',
  background: 'transparent',
  borderRadius: appleTheme.radii.xs,
  cursor: 'pointer',
  transition: appleTheme.transitions.fast,
};
