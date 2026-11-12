import React, { useState } from 'react';
import type { Notebook, Section, Page } from '@inkpage/format';
import {
  Book,
  Plus,
  FolderPlus,
  FilePlus,
  Search,
  CheckSquare,
  Upload,
  Download,
  Trash2,
  ChevronRight,
  ChevronDown,
  Settings,
  MoreVertical,
} from 'lucide-react';

export interface SidebarProps {
  notebooks: Notebook[];
  activeNotebook: Notebook | null;
  sections: Section[];
  activeSection: Section | null;
  pages: Page[];
  activePage: Page | null;
  onSelectNotebook: (nb: Notebook) => void;
  onCreateNotebook: (title: string) => void;
  onSelectSection: (sec: Section) => void;
  onCreateSection: (title: string, color: string) => void;
  onSelectPage: (p: Page) => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
  onOpenSearch: () => void;
  onOpenTagsSummary: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notebooks,
  activeNotebook,
  sections,
  activeSection,
  pages,
  activePage,
  onSelectNotebook,
  onCreateNotebook,
  onSelectSection,
  onCreateSection,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onOpenSearch,
  onOpenTagsSummary,
  onOpenImport,
  onOpenExport,
}) => {
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#6366f1');

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        userSelect: 'none',
      }}
    >
      {/* 1. Leftmost Navigation Rail: Notebook Switcher & Utility Actions */}
      <div
        style={{
          width: 54,
          backgroundColor: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 12,
        }}
      >
        {/* App Logo / Mark */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 18,
          }}
          title="Inkpage"
        >
          In
        </div>

        <div style={{ width: 32, height: 1, backgroundColor: '#334155' }} />

        {/* Notebooks List */}
        {notebooks.map((nb) => {
          const isSelected = activeNotebook?.id === nb.id;
          return (
            <button
              key={nb.id}
              onClick={() => onSelectNotebook(nb)}
              title={nb.title}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: isSelected ? '#1e293b' : 'transparent',
                border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
                color: isSelected ? '#60a5fa' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Book size={18} />
            </button>
          );
        })}

        {/* Create Notebook Button */}
        <button
          onClick={() => setShowNewNotebookModal(true)}
          title="Create New Notebook"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: '#1e293b',
            border: '1px dashed #475569',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Actions: Search, Tags, Import, Export */}
        <button
          onClick={onOpenSearch}
          title="Search All Notes (Ctrl+E)"
          style={railIconStyle}
        >
          <Search size={18} />
        </button>

        <button
          onClick={onOpenTagsSummary}
          title="Tag Summary Pane"
          style={railIconStyle}
        >
          <CheckSquare size={18} />
        </button>

        <button
          onClick={onOpenImport}
          title="Import OneNote Files"
          style={railIconStyle}
        >
          <Upload size={18} />
        </button>

        <button
          onClick={onOpenExport}
          title="Export Notebook"
          style={railIconStyle}
        >
          <Download size={18} />
        </button>
      </div>

      {/* 2. Sections Column */}
      <div
        style={{
          width: 180,
          backgroundColor: '#f1f5f9',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Notebook Title Bar */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600,
            fontSize: 13,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeNotebook?.title || 'Notebooks'}
          </span>
          <button
            onClick={() => setShowNewSectionModal(true)}
            title="New Section (Ctrl+Shift+N)"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#3b82f6',
              padding: 2,
            }}
          >
            <FolderPlus size={16} />
          </button>
        </div>

        {/* Section Tabs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map((sec) => {
            const isSelected = activeSection?.id === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => onSelectSection(sec)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: isSelected ? '#ffffff' : 'transparent',
                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: sec.color || '#6366f1',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#0f172a' : '#475569',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sec.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Pages List Column */}
      <div
        style={{
          width: 220,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Pages Header */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            Pages ({pages.length})
          </span>
          <button
            onClick={onCreatePage}
            title="New Page (Ctrl+N)"
            style={{
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={13} />
            Page
          </button>
        </div>

        {/* Page items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {pages.map((p) => {
            const isSelected = activePage?.id === p.id;
            const indentPadding = (p.level || 0) * 16;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPage(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `8px 10px 8px ${10 + indentPadding}px`,
                  borderRadius: 6,
                  backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                  border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                  cursor: 'pointer',
                  marginBottom: 2,
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? '#1d4ed8' : '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.title || 'Untitled Page'}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {p.modified?.substring(0, 10)}
                  </div>
                </div>

                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(p.id);
                    }}
                    title="Delete Page to Recycle Bin"
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: 2,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Notebook Modal */}
      {showNewNotebookModal && (
        <div style={modalBackdropStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Create New Notebook</h3>
            <input
              autoFocus
              placeholder="Notebook Title"
              value={newNotebookTitle}
              onChange={(e) => setNewNotebookTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNotebookTitle.trim()) {
                  onCreateNotebook(newNotebookTitle.trim());
                  setShowNewNotebookModal(false);
                  setNewNotebookTitle('');
                }
              }}
              style={modalInputStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowNewNotebookModal(false)}
                style={modalCancelButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newNotebookTitle.trim()) {
                    onCreateNotebook(newNotebookTitle.trim());
                    setShowNewNotebookModal(false);
                    setNewNotebookTitle('');
                  }
                }}
                style={modalConfirmButtonStyle}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Section Modal */}
      {showNewSectionModal && (
        <div style={modalBackdropStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Create New Section</h3>
            <input
              autoFocus
              placeholder="Section Title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              style={modalInputStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Color:</span>
              {['#6366f1', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map((c) => (
                <div
                  key={c}
                  onClick={() => setNewSectionColor(c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: newSectionColor === c ? '2px solid #0f172a' : 'none',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowNewSectionModal(false)}
                style={modalCancelButtonStyle}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newSectionTitle.trim()) {
                    onCreateSection(newSectionTitle.trim(), newSectionColor);
                    setShowNewSectionModal(false);
                    setNewSectionTitle('');
                  }
                }}
                style={modalConfirmButtonStyle}
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const railIconStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  backgroundColor: 'transparent',
  border: 'none',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const modalBackdropStyle: React.CSSProperties = {
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
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: 20,
  borderRadius: 8,
  width: 320,
  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const modalCancelButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  cursor: 'pointer',
};

const modalConfirmButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 4,
  border: 'none',
  background: '#3b82f6',
  color: '#ffffff',
  fontWeight: 500,
  cursor: 'pointer',
};
