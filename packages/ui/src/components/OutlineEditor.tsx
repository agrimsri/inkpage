import React, { useState, useEffect, useRef } from 'react';
import type { Container, PMDocNode, NoteTag } from '@inkpage/format';
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
  onUpdate: (updatedDoc: PMDocNode) => void;
  onFocus?: () => void;
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  container,
  isSelected,
  onUpdate,
  onFocus,
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
          id: `item_${i}_${Date.now()}`,
          indent,
          tags,
          text,
        });
      }
    }

    if (parsed.length === 0) {
      parsed.push({
        id: `item_0_${Date.now()}`,
        indent: 0,
        tags: [],
        text: '',
      });
    }

    setItems(parsed);
  }, [container.doc]);

  // Synchronize back to PMDocNode
  const syncToDoc = (newItems: OutlineItemData[]) => {
    setItems(newItems);
    const content: PMDocNode[] = newItems.map((item) => ({
      type: 'outlineItem',
      attrs: {
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
        id: `item_${Date.now()}_${Math.random()}`,
        indent: current.indent,
        tags: current.tags.map((t) => (t.type === 'todo' ? { type: 'todo', done: false } : t)),
        text: '',
      };
      newItems.splice(index + 1, 0, newItem);
      syncToDoc(newItems);
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
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
          inputRefs.current[prevIndex]?.focus();
        }, 10);
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
      onClick={onFocus}
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Container Toolbar when selected */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            zIndex: 100,
          }}
        >
          <button
            title="To-Do Tag (Ctrl+1)"
            onClick={() => toggleTag(activeItemIndex, 'todo')}
            style={{
              padding: 4,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#3b82f6',
            }}
          >
            <CheckSquare size={16} />
          </button>
          <button
            title="Important Tag (Ctrl+2)"
            onClick={() => toggleTag(activeItemIndex, 'important')}
            style={{
              padding: 4,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#eab308',
            }}
          >
            <Star size={16} />
          </button>
          <button
            title="Question Tag (Ctrl+3)"
            onClick={() => toggleTag(activeItemIndex, 'question')}
            style={{
              padding: 4,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#a855f7',
            }}
          >
            <HelpCircle size={16} />
          </button>
          <div style={{ width: 1, height: 16, backgroundColor: '#e2e8f0', margin: '0 2px' }} />
          <button
            title="Indent (Tab)"
            onClick={() => {
              const newItems = [...items];
              if (newItems[activeItemIndex].indent < 8) {
                newItems[activeItemIndex].indent += 1;
                syncToDoc(newItems);
              }
            }}
            style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <Indent size={16} />
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
            style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <Outdent size={16} />
          </button>
        </div>
      )}

      {/* Outline Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              {/* Bullet / To-Do Checkbox */}
              {todoTag ? (
                <button
                  onClick={() => toggleTag(index, 'todo')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: todoTag.done ? '#16a34a' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {todoTag.done ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              ) : (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#64748b',
                    flexShrink: 0,
                    margin: '0 4px',
                  }}
                />
              )}

              {/* Tag Icons */}
              {hasImportant && <Star size={14} color="#eab308" fill="#eab308" />}
              {hasQuestion && <HelpCircle size={14} color="#a855f7" />}

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
                  fontFamily: 'inherit',
                  fontSize: 15,
                  lineHeight: '1.5',
                  color: todoTag?.done ? '#94a3b8' : '#1e293b',
                  textDecoration: todoTag?.done ? 'line-through' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
