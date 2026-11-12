import React from 'react';
import type { Page, PageRevision } from '@inkpage/format';
import { History, RotateCcw, X, Clock, User } from 'lucide-react';

export interface PageVersionsModalProps {
  page: Page;
  onRestoreVersion: (revision: PageRevision) => void;
  onClose: () => void;
}

export const PageVersionsModal: React.FC<PageVersionsModalProps> = ({
  page,
  onRestoreVersion,
  onClose,
}) => {
  const revisions = page.history || [];

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
          width: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <History color="#3b82f6" />
            Page Versions — {page.title}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px 0' }}>
          Historical point-in-time snapshots created during your note-taking sessions.
        </p>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {revisions.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>
              No previous revisions saved for this page yet. Revisions are recorded automatically as you take notes.
            </div>
          ) : (
            revisions.map((rev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <Clock size={13} color="#64748b" />
                    {rev.timestamp}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    <User size={11} />
                    {rev.author || 'Local User'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRestoreVersion(rev);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #3b82f6',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
