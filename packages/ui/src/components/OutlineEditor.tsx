import React, { useState, useEffect, useRef } from 'react';
import type { Container, PMDocNode, NoteTag } from '@inkpage/format';
import { appleTheme, appleStyles } from '../theme';
import {
  CheckSquare,
  Square,
  Star,
  HelpCircle,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Indent,
  Outdent,
  Plus,
  Trash2,
} from 'lucide-react';

export interface OutlineItemData {
  id: string;
  indent: number;
  tags: NoteTag[];
  text: string;
  bulletStyle?: 'none' | 'disc' | 'number';
}

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
  onUpdate: (updatedDoc: PMDocNode) => void;
  onFocus?: () => void;
  onDelete?: () => void;
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  container,
  isSelected,
  autoFocus = true,
  fontFamily,
  fontSize,
  isBold,
  isItalic,
  isUnderline,
  isStrikethrough,
  fontColor,
  textAlign,
  onUpdate,
  onFocus,
  onDelete,
}) => {
  const [items, setItems] = useState<OutlineItemData[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Parse PMDocNode to flat outline items
  useEffect(() => {
    const parsed: OutlineItemData[] = [];
    const content = container.doc.content || [];

    for (let i = 0; i < content.length; i++) {
      const node = content[i];
      if (node.type === 'outlineItem') {
        const indent = (node.attrs?.indent as number) || 0;
        const tags = (node.attrs?.tags as NoteTag[]) || [];
        let text = '';
        if (node.content) {
          for (const inline of node.content) {
            if (inline.text) text += inline.text;
          }
        }
        parsed.push({
          id: (node.attrs?.id as string) || `outline_node_${container.id}_${i}`,
          indent,
          tags,
          text,
        });
      }
    }

    if (parsed.length === 0) {
      parsed.push({
        id: `outline_node_${container.id}_0`,
        indent: 0,
        tags: [],
        text: '',
      });
    }

    setItems(parsed);
  }, [container.doc, container.id]);

  // Autofocus input when container becomes selected and autoFocus is enabled
  useEffect(() => {
    if (isSelected && autoFocus) {
      const targetIndex = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : 0;
      const el = inputRefs.current[targetIndex] || inputRefs.current[0];
      if (el && document.activeElement !== el) {
        const timer = setTimeout(() => {
          el.focus({ preventScroll: true });
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [isSelected, autoFocus, items.length]);

  // Synchronize back to PMDocNode
  const syncToDoc = (newItems: OutlineItemData[]) => {
    setItems(newItems);
    const content: PMDocNode[] = newItems.map((item) => ({
      type: 'outlineItem',
      attrs: {
        id: item.id,
        indent: item.indent,
        tags: item.tags,
      },
      content: item.text
        ? [
            {
              type: 'text',
              text: item.text,
            },
          ]
        : [],
    }));

    onUpdate({
      type: 'doc',
      content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const current = items[index];
      const newItems = [...items];
      const newItem: OutlineItemData = {
        id: `outline_node_${container.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        indent: current.indent,
        tags: current.tags.map((t) => (t.type === 'todo' ? { type: 'todo', done: false } : t)),
        text: '',
      };
      newItems.splice(index + 1, 0, newItem);
      syncToDoc(newItems);
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus({ preventScroll: true });
      }, 10);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const newItems = [...items];
      if (e.shiftKey) {
        // Outdent
        if (newItems[index].indent > 0) {
          newItems[index].indent -= 1;
          syncToDoc(newItems);
        }
      } else {
        // Indent
        if (newItems[index].indent < 8) {
          newItems[index].indent += 1;
          syncToDoc(newItems);
        }
      }
    } else if (e.key === 'Backspace' && items[index].text === '') {
      if (items[index].indent > 0) {
        e.preventDefault();
        const newItems = [...items];
        newItems[index].indent -= 1;
        syncToDoc(newItems);
      } else if (items.length > 1) {
        e.preventDefault();
        const newItems = items.filter((_, i) => i !== index);
        syncToDoc(newItems);
        const prevIndex = Math.max(0, index - 1);
        setTimeout(() => {
          inputRefs.current[prevIndex]?.focus({ preventScroll: true });
        }, 10);
      } else if (items.length === 1 && onDelete) {
        e.preventDefault();
        onDelete();
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

  return (
    <div
      className="outline-container"
      onClick={(e) => {
        onFocus?.();
        // If clicking container blank space, focus active or last input
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName !== 'INPUT') {
          const idx = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : Math.max(0, items.length - 1);
          inputRefs.current[idx]?.focus({ preventScroll: true });
        }
      }}
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
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
          <div style={{ width: 1, height: 16, backgroundColor: appleTheme.colors.borderMedium, margin: '0 4px' }} />
          <button
            title="Indent (Tab)"
            onClick={() => {
              const newItems = [...items];
              if (newItems[activeItemIndex].indent < 8) {
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
              if (newItems[activeItemIndex].indent > 0) {
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
              <div style={{ width: 1, height: 16, backgroundColor: appleTheme.colors.borderMedium, margin: '0 4px' }} />
              <button
                type="button"
                title="Delete Container (Delete / Backspace)"
                onClick={(e) => {
                  e.stopPropagation();
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: appleTheme.fonts.sans }}>
        {items.map((item, index) => {
          const todoTag = item.tags.find((t) => t.type === 'todo');
          const hasImportant = item.tags.some((t) => t.type === 'important');
          const hasQuestion = item.tags.some((t) => t.type === 'question');

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingLeft: item.indent * 24,
                gap: 6,
              }}
            >
              {/* Bullet / To-Do Checkbox (Apple Reminders style) */}
              {todoTag ? (
                <button
                  onClick={() => toggleTag(index, 'todo')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: todoTag.done ? appleTheme.colors.success : appleTheme.colors.labelTertiary,
                    display: 'flex',
                    alignItems: 'center',
                    transition: appleTheme.transitions.fast,
                  }}
                >
                  {todoTag.done ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              ) : (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: appleTheme.colors.labelTertiary,
                    flexShrink: 0,
                    margin: '0 5px',
                  }}
                />
              )}

              {/* Tag Icons */}
              {hasImportant && <Star size={14} color="#ff9500" fill="#ff9500" />}
              {hasQuestion && <HelpCircle size={14} color={appleTheme.colors.purple} />}

              {/* Text Field */}
              <input
                ref={(el) => (inputRefs.current[index] = el)}
                value={item.text}
                placeholder={index === 0 && items.length === 1 ? 'Type notes or outline...' : ''}
                onFocus={() => setActiveItemIndex(index)}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].text = e.target.value;
                  syncToDoc(newItems);
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: isSelected && fontFamily ? fontFamily : 'inherit',
                  fontSize: isSelected && fontSize ? fontSize : 15,
                  fontWeight: isSelected && isBold ? 700 : 400,
                  fontStyle: isSelected && isItalic ? 'italic' : 'normal',
                  lineHeight: '1.5',
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
      </div>
    </div>
  );
};

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
