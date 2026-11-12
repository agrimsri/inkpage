import React, { useState, useEffect } from 'react';
import type { SearchMatch } from '@inkpage/format';
import { Search as SearchIcon, X, FileText, ArrowRight } from 'lucide-react';

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
        width: 360,
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
          <SearchIcon size={18} color="#3b82f6" />
          Full Text Search (FTS5)
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Query input */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <input
          autoFocus
          placeholder="Search outline text, titles, OCR..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {isLoading && <div style={{ fontSize: 13, color: '#94a3b8' }}>Searching FTS5 index...</div>}

        {!isLoading && query && results.length === 0 && (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No matches found.</div>
        )}

        {results.map((res, i) => (
          <div
            key={i}
            onClick={() => {
              onSelectResult(res.notebookId, res.sectionId, res.pageId);
              onClose();
            }}
            style={{
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              marginBottom: 8,
              cursor: 'pointer',
              transition: 'background-color 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{res.pageTitle}</span>
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                }}
              >
                {res.itemKind}
              </span>
            </div>

            {/* Snippet with highlight */}
            <div
              style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.4 }}
              dangerouslySetInnerHTML={{ __html: res.snippet }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
