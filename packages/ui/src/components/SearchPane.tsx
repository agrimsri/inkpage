import React, { useState, useEffect } from 'react';
import type { SearchMatch } from '@inkpage/format';
import { Search as SearchIcon, X, FileText, ArrowRight } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

export interface SearchPaneProps {
  onClose: () => void;
  onSelectResult: (notebookId: string, sectionId: string, pageId: string) => void;
  apiBaseUrl?: string;
}

export const SearchPane: React.FC<SearchPaneProps> = ({
  onClose,
  onSelectResult,
  apiBaseUrl = 'http://127.0.0.1:3888',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search request failed', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, apiBaseUrl]);

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
      {/* Header (macOS Panel Header) */}
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
          <SearchIcon size={18} color={appleTheme.colors.accent} />
          Search Notes
        </div>
        <button
          onClick={onClose}
          title="Close Search Pane"
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

      {/* Query input (Apple Spotlight Style) */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${appleTheme.colors.borderSubtle}` }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <SearchIcon
            size={16}
            color={appleTheme.colors.labelTertiary}
            style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}
          />
          <input
            autoFocus
            placeholder="Search notes, outlines, OCR text..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              ...appleStyles.inputField,
              width: '100%',
              paddingLeft: 34, // iconInset(10) + iconWidth(16) + iconInset(8) per typeui balanced inset rule
              paddingRight: 28,
              borderRadius: appleTheme.radii.pill,
              backgroundColor: appleTheme.colors.bgSubtle,
              border: `1px solid ${appleTheme.colors.borderSubtle}`,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: appleTheme.colors.labelTertiary,
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading && (
          <div style={{ fontSize: 13, color: appleTheme.colors.labelTertiary, textAlign: 'center', padding: '24px 0' }}>
            Searching FTS5 index...
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div style={{ fontSize: 13, color: appleTheme.colors.labelTertiary, textAlign: 'center', padding: '24px 0' }}>
            No matches found for "{query}".
          </div>
        )}

        {!query && (
          <div style={{ fontSize: 13, color: appleTheme.colors.labelTertiary, textAlign: 'center', padding: '32px 16px' }}>
            Type keywords above to search across all notebooks, sections, containers, and ink notes.
          </div>
        )}

        {results.map((res, i) => (
          <div
            key={i}
            onClick={() => {
              onSelectResult(res.notebookId, res.sectionId, res.pageId);
              onClose();
            }}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>
                {res.pageTitle || 'Untitled Page'}
              </span>
              <span style={appleStyles.badge('default')}>
                {res.itemKind}
              </span>
            </div>

            {/* Snippet with highlight */}
            <div
              style={{
                fontSize: 12,
                color: appleTheme.colors.labelSecondary,
                marginTop: 6,
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{ __html: res.snippet }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
