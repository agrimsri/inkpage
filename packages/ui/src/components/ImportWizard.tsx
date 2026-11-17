import React, { useState } from 'react';
import type { ImportReport } from '@inkpage/format';
import { Upload, FileCode, CheckCircle2, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

export interface ImportWizardProps {
  onClose: () => void;
  onImportComplete: (notebookId: string) => void;
  apiBaseUrl?: string;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  onClose,
  onImportComplete,
  apiBaseUrl = 'http://127.0.0.1:3888',
}) => {
  const [filePath, setFilePath] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importedNotebookId, setImportedNotebookId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartImport = async () => {
    if (!filePath.trim()) return;

    setIsImporting(true);
    setErrorMsg(null);
    setReport(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath.trim(),
          title: titleOverride.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        setImportedNotebookId(data.notebook.id);
      } else {
        const err = await res.text();
        setErrorMsg(`Import failed: ${err || 'Invalid file format or file not found.'}`);
      }
    } catch (err: any) {
      setErrorMsg(`Import error: ${err.message || 'Network error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={appleStyles.modalBackdrop}>
      <div
        style={{
          ...appleStyles.modalCard,
          width: 540,
          maxHeight: '85vh',
          fontFamily: appleTheme.fonts.sans,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
            backgroundColor: appleTheme.colors.bgSidebar,
          }}
        >
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
              <Upload size={16} color={appleTheme.colors.accent} />
            </div>
            <span>Import OneNote Notebook</span>
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

        {/* Content */}
        <div style={{ padding: 22, overflowY: 'auto' }}>
          {!report ? (
            <div>
              <p style={{ fontSize: 13, color: appleTheme.colors.labelSecondary, lineHeight: 1.5, marginTop: 0 }}>
                Import notes from Microsoft OneNote into Inkpage. Supported formats:
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 18px 0' }}>
                <span style={appleStyles.badge('default')}>.onepkg (Cabinet package)</span>
                <span style={appleStyles.badge('default')}>.one (Section file)</span>
                <span style={appleStyles.badge('default')}>.onetoc2 (Notebook folder)</span>
                <span style={appleStyles.badge('default')}>.zip (OneDrive export)</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: appleTheme.colors.labelSecondary, marginBottom: 6 }}>
                  File or Directory Path:
                </label>
                <input
                  autoFocus
                  placeholder="/home/user/Documents/MyNotebook.onepkg or .onetoc2"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  style={{ ...appleStyles.inputField, width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: appleTheme.colors.labelSecondary, marginBottom: 6 }}>
                  Notebook Name Override (optional):
                </label>
                <input
                  placeholder="Leave blank to use original name"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  style={{ ...appleStyles.inputField, width: '100%' }}
                />
              </div>

              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: appleTheme.radii.md,
                    backgroundColor: appleTheme.colors.destructiveTint,
                    border: `1px solid ${appleTheme.colors.destructiveTintHover}`,
                    color: appleTheme.colors.destructive,
                    fontSize: 12,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={onClose} style={appleStyles.secondaryButton()}>
                  Cancel
                </button>
                <button
                  disabled={!filePath.trim() || isImporting}
                  onClick={handleStartImport}
                  style={appleStyles.primaryButton(!filePath.trim() || isImporting)}
                >
                  {isImporting ? 'Importing Notebook...' : 'Start Import'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Import Report Screen */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: appleTheme.colors.success,
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 16,
                }}
              >
                <CheckCircle2 size={20} />
                Import Completed Successfully!
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <MetricBox label="Sections" value={report.sectionsCount} />
                <MetricBox label="Pages" value={report.pagesCount} />
                <MetricBox label="Ink Strokes" value={report.inkStrokesCount} />
                <MetricBox label="Images" value={report.imagesCount} />
                <MetricBox label="Attachments" value={report.attachmentsCount} />
                <MetricBox label="Duration" value={`${report.durationMs} ms`} />
              </div>

              {report.warnings && report.warnings.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: appleTheme.colors.warning, marginBottom: 4 }}>
                    Warnings ({report.warnings.length}):
                  </div>
                  <div
                    style={{
                      maxHeight: 100,
                      overflowY: 'auto',
                      backgroundColor: appleTheme.colors.warningTint,
                      border: `1px solid ${appleTheme.colors.borderSubtle}`,
                      borderRadius: appleTheme.radii.sm,
                      padding: 10,
                      fontSize: 11,
                      color: appleTheme.colors.warning,
                      lineHeight: 1.4,
                    }}
                  >
                    {report.warnings.map((w, i) => (
                      <div key={i}>• [{w.code}] {w.message}</div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={onClose} style={appleStyles.secondaryButton()}>
                  Close
                </button>
                {importedNotebookId && (
                  <button
                    onClick={() => {
                      onImportComplete(importedNotebookId);
                      onClose();
                    }}
                    style={appleStyles.primaryButton()}
                  >
                    Open Notebook <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricBox = ({ label, value }: { label: string; value: any }) => (
  <div
    style={{
      padding: '10px 12px',
      backgroundColor: appleTheme.colors.bgSubtle,
      borderRadius: appleTheme.radii.md,
      border: `1px solid ${appleTheme.colors.borderSubtle}`,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 600, color: appleTheme.colors.labelPrimary, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </div>
  </div>
);
