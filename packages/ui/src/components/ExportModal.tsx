import React, { useState } from 'react';
import type { Notebook, Page } from '@inkpage/format';
import { Download, FileText, CheckCircle2, X } from 'lucide-react';

export interface ExportModalProps {
  notebook: Notebook | null;
  activePage: Page | null;
  onClose: () => void;
  apiBaseUrl?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  notebook,
  activePage,
  onClose,
  apiBaseUrl = 'http://127.0.0.1:3888',
}) => {
  const [format, setFormat] = useState<'native' | 'md' | 'json'>('native');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleExport = () => {
    if (!notebook) return;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(notebook, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${notebook.title || 'notebook'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('JSON exported directly to your downloads!');
    } else {
      setStatusMsg(
        `Exported ${format === 'native' ? '.inkbook folder' : 'Markdown bundle'} to data directory!`
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          width: 460,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Download color="#3b82f6" />
            Export Notebook Notes
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          Export <b>{notebook?.title}</b> into open, documented formats:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              border: format === 'native' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              backgroundColor: format === 'native' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === 'native'}
              onChange={() => setFormat('native')}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Native .inkbook Folder</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Full local-first folder structure with notebook.json, sections, pages, and assets.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              border: format === 'md' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              backgroundColor: format === 'md' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === 'md'}
              onChange={() => setFormat('md')}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Markdown Bundle (Obsidian / Joplin compatible)</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                One .md file per page, YAML frontmatter, GFM tables, task lists, and SVG ink drawings.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              border: format === 'json' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              backgroundColor: format === 'json' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Canonical JSON</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Single raw JSON snapshot of the entire notebook tree.
              </div>
            </div>
          </label>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#16a34a',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={16} />
            {statusMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export Now
          </button>
        </div>
      </div>
    </div>
  );
};
