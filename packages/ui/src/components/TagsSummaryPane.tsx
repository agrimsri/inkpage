import React, { useState, useEffect } from 'react';
import type { TagSummaryItem } from '@inkpage/format';
import { CheckSquare, Square, Star, HelpCircle, X } from 'lucide-react';

export interface TagsSummaryPaneProps {
  notebookId: string;
  onClose: () => void;
  onJumpToPage: (sectionId: string, pageId: string) => void;
  apiBaseUrl?: string;
}

export const TagsSummaryPane: React.FC<TagsSummaryPaneProps> = ({
  notebookId,
  onClose,
  onJumpToPage,
  apiBaseUrl = 'http://127.0.0.1:3888',
}) => {
  const [tags, setTags] = useState<TagSummaryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'important' | 'question'>('all');

  useEffect(() => {
    fetchTags();
  }, [notebookId]);

  const fetchTags = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/tags?nb=${encodeURIComponent(notebookId)}`);
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const filteredTags = tags.filter((t) => {
    if (filter === 'all') return true;
    return t.tagType === filter;
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 380,
        height: '100%',
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
          <CheckSquare size={18} color="#16a34a" />
          Tags Summary Pane
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 16px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc',
        }}
      >
        {(['all', 'todo', 'important', 'question'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: filter === tab ? '1px solid #cbd5e1' : '1px solid transparent',
              backgroundColor: filter === tab ? '#ffffff' : 'transparent',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'capitalize',
              cursor: 'pointer',
              color: filter === tab ? '#0f172a' : '#64748b',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tag Items List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {filteredTags.length === 0 && (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No tags found in this notebook.</div>
        )}

        {filteredTags.map((tag, idx) => (
          <div
            key={idx}
            onClick={() => onJumpToPage(tag.sectionId, tag.pageId)}
            style={{
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              marginBottom: 8,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tag.tagType === 'todo' ? (
                tag.done ? (
                  <CheckSquare size={16} color="#16a34a" />
                ) : (
                  <Square size={16} color="#64748b" />
                )
              ) : tag.tagType === 'important' ? (
                <Star size={16} color="#eab308" fill="#eab308" />
              ) : (
                <HelpCircle size={16} color="#a855f7" />
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: tag.done ? '#94a3b8' : '#1e293b',
                  textDecoration: tag.done ? 'line-through' : 'none',
                }}
              >
                {tag.text || '(empty)'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                fontSize: 11,
                color: '#64748b',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: tag.sectionColor || '#6366f1',
                }}
              />
              <span>{tag.sectionTitle}</span>
              <span>•</span>
              <span style={{ fontWeight: 500 }}>{tag.pageTitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
