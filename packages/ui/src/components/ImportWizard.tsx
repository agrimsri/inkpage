import React, { useState } from 'react';
import type { ImportReport } from '@inkpage/format';
import { Upload, FileCode, CheckCircle2, AlertTriangle, X, ArrowRight } from 'lucide-react';

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
          width: 520,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 16 }}>
            <Upload size={20} color="#3b82f6" />
            Import OneNote Notebook
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {!report ? (
            <div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginTop: 0 }}>
                Import your existing notebooks from Microsoft OneNote. Supported inputs:
              </p>
              <ul style={{ fontSize: 12, color: '#64748b', paddingLeft: 20, margin: '8px 0 16px 0' }}>
                <li><b>.onepkg</b> (Cabinet packages from OneNote Desktop)</li>
                <li><b>.one</b> (Individual Section files)</li>
                <li><b>.onetoc2</b> (Notebook Table of Contents folders)</li>
                <li><b>.zip</b> (Notebook folders exported from OneDrive Web)</li>
              </ul>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  File or Directory Path:
                </label>
                <input
                  autoFocus
                  placeholder="/home/user/Documents/MyNotebook.onepkg or .onetoc2"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Notebook Name Override (optional):
                </label>
                <input
                  placeholder="Leave blank to use original name"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {errorMsg && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: 12,
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={onClose} style={cancelBtnStyle}>
                  Cancel
                </button>
                <button
                  disabled={!filePath.trim() || isImporting}
                  onClick={handleStartImport}
                  style={isImporting || !filePath.trim() ? disabledBtnStyle : primaryBtnStyle}
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
                  color: '#16a34a',
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 12,
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#b45309', marginBottom: 4 }}>
                    Warnings ({report.warnings.length}):
                  </div>
                  <div
                    style={{
                      maxHeight: 100,
                      overflowY: 'auto',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: 6,
                      padding: 8,
                      fontSize: 11,
                      color: '#92400e',
                    }}
                  >
                    {report.warnings.map((w, i) => (
                      <div key={i}>• [{w.code}] {w.message}</div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={onClose} style={cancelBtnStyle}>
                  Close
                </button>
                {importedNotebookId && (
                  <button
                    onClick={() => {
                      onImportComplete(importedNotebookId);
                      onClose();
                    }}
                    style={primaryBtnStyle}
                  >
                    Open Notebook <ArrowRight size={14} style={{ marginLeft: 4 }} />
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
      padding: '8px 12px',
      backgroundColor: '#f8fafc',
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: 13,
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: '#3b82f6',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const disabledBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  background: '#94a3b8',
  cursor: 'not-allowed',
};
