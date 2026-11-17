import React, { useState, useEffect } from 'react';
import type { TagSummaryItem } from '@inkpage/format';
import { CheckSquare, Square, Star, HelpCircle, X } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

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
        backgroundColor: appleTheme.colors.bgCanvas,
        borderLeft: `1px solid ${appleTheme.colors.borderSubtle}`,
        boxShadow: appleTheme.shadows.modal,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
        fontFamily: appleTheme.fonts.sans,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
          backgroundColor: appleTheme.colors.bgSidebar,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, color: appleTheme.colors.labelPrimary }}>
          <CheckSquare size={18} color={appleTheme.colors.success} />
          Tags Summary
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: appleTheme.colors.labelTertiary,
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: appleTheme.transitions.fast,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = appleTheme.colors.bgSubtleHover)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter Tabs (Apple Segmented Control) */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
          backgroundColor: appleTheme.colors.bgCanvas,
        }}
      >
        <div style={{ ...appleStyles.segmentedControlTrack, width: '100%', justifyContent: 'space-between' }}>
          {(['all', 'todo', 'important', 'question'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                ...appleStyles.segmentedControlItem(filter === tab),
                flex: 1,
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tag Items List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredTags.length === 0 && (
          <div style={{ fontSize: 13, color: appleTheme.colors.labelTertiary, textAlign: 'center', padding: '32px 0' }}>
            No tags found in this notebook.
          </div>
        )}

        {filteredTags.map((tag, idx) => (
          <div
            key={idx}
            onClick={() => onJumpToPage(tag.sectionId, tag.pageId)}
            style={{
              padding: '12px 14px',
              backgroundColor: appleTheme.colors.bgCard,
              borderRadius: appleTheme.radii.md,
              border: `1px solid ${appleTheme.colors.borderSubtle}`,
              boxShadow: appleTheme.shadows.card,
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = appleTheme.colors.accent;
              (e.currentTarget as HTMLElement).style.backgroundColor = appleTheme.colors.accentTint;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = appleTheme.colors.borderSubtle;
              (e.currentTarget as HTMLElement).style.backgroundColor = appleTheme.colors.bgCard;
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tag.tagType === 'todo' ? (
                tag.done ? (
                  <CheckSquare size={16} color={appleTheme.colors.success} />
                ) : (
                  <Square size={16} color={appleTheme.colors.labelTertiary} />
                )
              ) : tag.tagType === 'important' ? (
                <Star size={16} color="#ff9500" fill="#ff9500" />
              ) : (
                <HelpCircle size={16} color={appleTheme.colors.purple} />
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: tag.done ? appleTheme.colors.labelQuaternary : appleTheme.colors.labelPrimary,
                  textDecoration: tag.done ? 'line-through' : 'none',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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
                color: appleTheme.colors.labelSecondary,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: tag.sectionColor || appleTheme.colors.accent,
                }}
              />
              <span>{tag.sectionTitle}</span>
              <span>•</span>
              <span style={{ fontWeight: 500, color: appleTheme.colors.labelPrimary }}>{tag.pageTitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
