import React from 'react';
import type { Page, PageRevision } from '@inkpage/format';
import { History, RotateCcw, X, Clock, User } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

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
    <div style={appleStyles.modalBackdrop}>
      <div
        style={{
          ...appleStyles.modalCard,
          width: 500,
          maxHeight: '80vh',
          fontFamily: appleTheme.fonts.sans,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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
              <History size={16} color={appleTheme.colors.accent} />
            </div>
            <span>Page Versions — {page.title}</span>
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

        <p style={{ fontSize: 13, color: appleTheme.colors.labelSecondary, margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Historical point-in-time snapshots created automatically during note-taking sessions.
        </p>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {revisions.length === 0 ? (
            <div style={{ fontSize: 13, color: appleTheme.colors.labelTertiary, textAlign: 'center', padding: '36px 0' }}>
              No previous revisions saved for this page yet.
            </div>
          ) : (
            revisions.map((rev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: appleTheme.colors.bgCard,
                  border: `1px solid ${appleTheme.colors.borderSubtle}`,
                  borderRadius: appleTheme.radii.md,
                  boxShadow: appleTheme.shadows.card,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>
                    <Clock size={13} color={appleTheme.colors.labelSecondary} />
                    {rev.timestamp}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: appleTheme.colors.labelTertiary, marginTop: 4 }}>
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
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    height: 28,
                    padding: '0 12px',
                    borderRadius: appleTheme.radii.pill,
                    border: `1px solid ${appleTheme.colors.accentTintHover}`,
                    backgroundColor: appleTheme.colors.accentTint,
                    color: appleTheme.colors.accent,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: appleTheme.transitions.fast,
                  }}
                >
                  <RotateCcw size={12} />
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
