import React, { useState } from 'react';
import type { Notebook, Page } from '@inkpage/format';
import { Download, FileText, CheckCircle2, X } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

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
    <div style={appleStyles.modalBackdrop}>
      <div
        style={{
          ...appleStyles.modalCard,
          width: 480,
          fontFamily: appleTheme.fonts.sans,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 16, color: appleTheme.colors.labelPrimary }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: appleTheme.colors.accentTint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={16} color={appleTheme.colors.accent} />
            </div>
            <span>Export Notebook</span>
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
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: appleTheme.colors.labelSecondary, margin: 0 }}>
          Export <b>{notebook?.title}</b> into open, documented formats:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: appleTheme.radii.md,
              border: format === 'native' ? `1.5px solid ${appleTheme.colors.accent}` : `1px solid ${appleTheme.colors.borderSubtle}`,
              backgroundColor: format === 'native' ? appleTheme.colors.accentTint : appleTheme.colors.bgCard,
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === 'native'}
              onChange={() => setFormat('native')}
              style={{ accentColor: appleTheme.colors.accent }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>Native .inkbook Folder</div>
              <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary, marginTop: 2 }}>
                Full local-first folder structure with notebook.json, sections, pages, and assets.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: appleTheme.radii.md,
              border: format === 'md' ? `1.5px solid ${appleTheme.colors.accent}` : `1px solid ${appleTheme.colors.borderSubtle}`,
              backgroundColor: format === 'md' ? appleTheme.colors.accentTint : appleTheme.colors.bgCard,
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === 'md'}
              onChange={() => setFormat('md')}
              style={{ accentColor: appleTheme.colors.accent }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>Markdown Bundle (Obsidian / Joplin compatible)</div>
              <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary, marginTop: 2 }}>
                One .md file per page, YAML frontmatter, GFM tables, task lists, and SVG ink drawings.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: appleTheme.radii.md,
              border: format === 'json' ? `1.5px solid ${appleTheme.colors.accent}` : `1px solid ${appleTheme.colors.borderSubtle}`,
              backgroundColor: format === 'json' ? appleTheme.colors.accentTint : appleTheme.colors.bgCard,
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              style={{ accentColor: appleTheme.colors.accent }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>Canonical JSON</div>
              <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary, marginTop: 2 }}>
                Single raw JSON snapshot of the entire notebook tree.
              </div>
            </div>
          </label>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: appleTheme.radii.md,
              backgroundColor: appleTheme.colors.successTint,
              border: `1px solid ${appleTheme.colors.borderSubtle}`,
              color: appleTheme.colors.success,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={appleStyles.secondaryButton()}>
            Cancel
          </button>
          <button onClick={handleExport} style={appleStyles.primaryButton()}>
            Export Now
          </button>
        </div>
      </div>
    </div>
  );
};
