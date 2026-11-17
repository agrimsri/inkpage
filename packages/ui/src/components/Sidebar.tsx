import React, { useState } from 'react';
import type { Notebook, Section, Page } from '@inkpage/format';
import {
  Book,
  Plus,
  FolderPlus,
  Search,
  CheckSquare,
  Upload,
  Download,
  Trash2,
} from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

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

export const Sidebar: React.FC<SidebarProps> = React.memo(({
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
  const [newSectionColor, setNewSectionColor] = useState('#0071e3');

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: appleTheme.colors.bgSidebar,
        borderRight: `1px solid ${appleTheme.colors.borderSubtle}`,
        userSelect: 'none',
        fontFamily: appleTheme.fonts.sans,
      }}
    >
      {/* 1. Leftmost Navigation Rail: macOS Dark Graphite Rail */}
      <div
        style={{
          width: 54,
          backgroundColor: appleTheme.colors.bgSidebarRail,
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 0',
          gap: 12,
        }}
      >
        {/* App Logo / Mark */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #0071e3 0%, #38bdf8 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '-0.02em',
            boxShadow: '0 2px 8px rgba(0, 113, 227, 0.35)',
            cursor: 'default',
          }}
          title="Inkpage"
        >
          In
        </div>

        <div style={{ width: 28, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: '2px 0' }} />

        {/* Notebooks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {notebooks.map((nb) => (
            <NotebookRailItem
              key={nb.id}
              notebook={nb}
              isSelected={activeNotebook?.id === nb.id}
              onSelect={() => onSelectNotebook(nb)}
            />
          ))}

          {/* Create Notebook Button */}
          <button
            onClick={() => setShowNewNotebookModal(true)}
            title="Create New Notebook"
            style={{
              width: 36,
              height: 36,
              borderRadius: appleTheme.radii.md,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px dashed rgba(255, 255, 255, 0.22)',
              color: 'rgba(255, 255, 255, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions: Search, Tags, Import, Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <RailIconButton
            onClick={onOpenSearch}
            title="Search All Notes (Ctrl+E)"
          >
            <Search size={17} />
          </RailIconButton>

          <RailIconButton
            onClick={onOpenTagsSummary}
            title="Tag Summary Pane"
          >
            <CheckSquare size={17} />
          </RailIconButton>

          <RailIconButton
            onClick={onOpenImport}
            title="Import OneNote Files"
          >
            <Upload size={17} />
          </RailIconButton>

          <RailIconButton
            onClick={onOpenExport}
            title="Export Notebook"
          >
            <Download size={17} />
          </RailIconButton>
        </div>
      </div>

      {/* 2. Sections Column: Apple macOS Sidebar List */}
      <div
        style={{
          width: 184,
          backgroundColor: appleTheme.colors.bgSidebar,
          borderRight: `1px solid ${appleTheme.colors.borderSubtle}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Notebook Title Bar */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '-0.01em',
            color: appleTheme.colors.labelSecondary,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeNotebook?.title || 'Notebook'}
          </span>
          <button
            onClick={() => setShowNewSectionModal(true)}
            title="New Section (Ctrl+Shift+N)"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: appleTheme.colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 2,
              borderRadius: appleTheme.radii.xs,
              transition: appleTheme.transitions.fast,
            }}
          >
            <FolderPlus size={16} />
          </button>
        </div>

        {/* Section List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sections.map((sec) => (
            <SectionItem
              key={sec.id}
              section={sec}
              isSelected={activeSection?.id === sec.id}
              onSelect={() => onSelectSection(sec)}
            />
          ))}
        </div>
      </div>

      {/* 3. Pages List Column: Apple Notes List */}
      <div
        style={{
          width: 224,
          backgroundColor: appleTheme.colors.bgCanvas,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Pages Header */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: appleTheme.colors.labelSecondary, textTransform: 'uppercase' }}>
            Pages ({pages.length})
          </span>
          <button
            onClick={onCreatePage}
            title="New Page (Ctrl+N)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 26,
              padding: '0 10px',
              borderRadius: appleTheme.radii.pill,
              border: 'none',
              backgroundColor: appleTheme.colors.accent,
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: appleTheme.shadows.subtle,
              transition: appleTheme.transitions.fast,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Plus size={13} />
            Page
          </button>
        </div>

        {/* Page items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {pages.map((p) => (
            <PageListItem
              key={p.id}
              page={p}
              isSelected={activePage?.id === p.id}
              onSelect={() => onSelectPage(p)}
              onDelete={() => onDeletePage(p.id)}
            />
          ))}
        </div>
      </div>

      {/* New Notebook Modal */}
      {showNewNotebookModal && (
        <div style={appleStyles.modalBackdrop}>
          <div style={{ ...appleStyles.modalCard, width: 340 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>
              Create New Notebook
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: appleTheme.colors.labelSecondary }}>
              Enter a name for your local notebook repository.
            </p>
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
              style={appleStyles.inputField}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setShowNewNotebookModal(false)}
                style={appleStyles.secondaryButton()}
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
                style={appleStyles.primaryButton(!newNotebookTitle.trim())}
                disabled={!newNotebookTitle.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Section Modal */}
      {showNewSectionModal && (
        <div style={appleStyles.modalBackdrop}>
          <div style={{ ...appleStyles.modalCard, width: 350 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>
              Create New Section
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: appleTheme.colors.labelSecondary }}>
              Group notes under a distinct section and color.
            </p>
            <input
              autoFocus
              placeholder="Section Title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              style={appleStyles.inputField}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 12, color: appleTheme.colors.labelSecondary }}>Color:</span>
              {['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewSectionColor(c)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: newSectionColor === c ? '2.5px solid #ffffff' : '1px solid transparent',
                    boxShadow: newSectionColor === c ? `0 0 0 2px ${c}` : 'none',
                    padding: 0,
                    transition: appleTheme.transitions.fast,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setShowNewSectionModal(false)}
                style={appleStyles.secondaryButton()}
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
                style={appleStyles.primaryButton(!newSectionTitle.trim())}
                disabled={!newSectionTitle.trim()}
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const NotebookRailItem: React.FC<{
  notebook: Notebook;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ notebook, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      title={notebook.title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 36,
        height: 36,
        borderRadius: appleTheme.radii.md,
        backgroundColor: isSelected
          ? 'rgba(255, 255, 255, 0.20)'
          : hovered
          ? 'rgba(255, 255, 255, 0.10)'
          : 'transparent',
        border: isSelected ? `1.5px solid ${appleTheme.colors.accent}` : '1.5px solid transparent',
        color: isSelected ? '#ffffff' : hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: appleTheme.transitions.fast,
        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      <Book size={17} />
    </button>
  );
};

const RailIconButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 36,
        height: 36,
        borderRadius: appleTheme.radii.md,
        backgroundColor: hovered ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
        border: 'none',
        color: hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.70)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: appleTheme.transitions.fast,
      }}
    >
      {children}
    </button>
  );
};

const SectionItem: React.FC<{
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ section, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: appleTheme.radii.md,
        border: isSelected ? `1px solid ${appleTheme.colors.borderSubtle}` : '1px solid transparent',
        backgroundColor: isSelected
          ? appleTheme.colors.bgCard
          : hovered
          ? appleTheme.colors.bgSubtleHover
          : 'transparent',
        boxShadow: isSelected ? appleTheme.shadows.card : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: appleTheme.transitions.fast,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: section.color || appleTheme.colors.accent,
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${section.color ? `${section.color}33` : 'rgba(0, 113, 227, 0.2)'}`,
        }}
      />
      <span
        style={{
          fontSize: 13,
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? appleTheme.colors.labelPrimary : appleTheme.colors.labelSecondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {section.title}
      </span>
    </button>
  );
};

const PageListItem: React.FC<{
  page: Page;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ page, isSelected, onSelect, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const indentPadding = (page.level || 0) * 14;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `8px 10px 8px ${10 + indentPadding}px`,
        borderRadius: appleTheme.radii.md,
        backgroundColor: isSelected
          ? appleTheme.colors.accentTint
          : hovered
          ? appleTheme.colors.bgSubtle
          : 'transparent',
        border: isSelected
          ? `1px solid ${appleTheme.colors.accentTintHover}`
          : '1px solid transparent',
        cursor: 'pointer',
        transition: appleTheme.transitions.fast,
      }}
    >
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: isSelected ? 600 : 500,
            color: isSelected ? appleTheme.colors.accent : appleTheme.colors.labelPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}
        >
          {page.title || 'Untitled Page'}
        </div>
        <div
          style={{
            fontSize: 11,
            color: appleTheme.colors.labelTertiary,
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {page.modified?.substring(0, 10)}
        </div>
      </div>

      {(isSelected || hovered) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete Page to Recycle Bin"
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: appleTheme.colors.labelTertiary,
            padding: 4,
            borderRadius: appleTheme.radii.xs,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: appleTheme.transitions.fast,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = appleTheme.colors.destructive;
            e.currentTarget.style.backgroundColor = appleTheme.colors.destructiveTint;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = appleTheme.colors.labelTertiary;
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
};
