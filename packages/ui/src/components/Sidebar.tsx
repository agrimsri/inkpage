import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  Columns,
  ChevronLeft,
  ChevronRight,
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
  notebooksWidth?: number;
  onNotebooksWidthChange?: (width: number) => void;
  isNotebooksExpanded?: boolean;
  onToggleNotebooksExpanded?: () => void;
  sectionsWidth?: number;
  onSectionsWidthChange?: (width: number) => void;
  isSectionsCollapsed?: boolean;
  onToggleSectionsCollapsed?: () => void;
  pagesWidth?: number;
  onPagesWidthChange?: (width: number) => void;
  isPagesCollapsed?: boolean;
  onTogglePagesCollapsed?: () => void;
}

const DEFAULT_NOTEBOOKS_WIDTH = 180;
const MIN_NOTEBOOKS_WIDTH = 130;
const MAX_NOTEBOOKS_WIDTH = 300;
const COMPACT_NOTEBOOKS_WIDTH = 54;

const DEFAULT_SECTIONS_WIDTH = 190;
const MIN_SECTIONS_WIDTH = 130;
const MAX_SECTIONS_WIDTH = 380;

const DEFAULT_PAGES_WIDTH = 230;
const MIN_PAGES_WIDTH = 150;
const MAX_PAGES_WIDTH = 440;

const STORAGE_KEYS = {
  notebooksWidth: 'inkpage_notebooks_width',
  notebooksExpanded: 'inkpage_notebooks_expanded',
  sectionsWidth: 'inkpage_sections_width',
  sectionsCollapsed: 'inkpage_sections_collapsed',
  pagesWidth: 'inkpage_pages_width',
  pagesCollapsed: 'inkpage_pages_collapsed',
};

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
  notebooksWidth: controlledNotebooksWidth,
  onNotebooksWidthChange,
  isNotebooksExpanded: controlledNotebooksExpanded,
  onToggleNotebooksExpanded,
  sectionsWidth: controlledSectionsWidth,
  onSectionsWidthChange,
  isSectionsCollapsed: controlledSectionsCollapsed,
  onToggleSectionsCollapsed,
  pagesWidth: controlledPagesWidth,
  onPagesWidthChange,
  isPagesCollapsed: controlledPagesCollapsed,
  onTogglePagesCollapsed,
}) => {
  // Modal states
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#0071e3');

  // Internal persistent resize and collapse states
  const [internalNotebooksWidth, setInternalNotebooksWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_NOTEBOOKS_WIDTH;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.notebooksWidth);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= MIN_NOTEBOOKS_WIDTH && parsed <= MAX_NOTEBOOKS_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_NOTEBOOKS_WIDTH;
  });

  const [internalNotebooksExpanded, setInternalNotebooksExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.notebooksExpanded) === 'true';
    } catch {}
    return false;
  });

  const [internalSectionsWidth, setInternalSectionsWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SECTIONS_WIDTH;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.sectionsWidth);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= MIN_SECTIONS_WIDTH && parsed <= MAX_SECTIONS_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_SECTIONS_WIDTH;
  });

  const [internalSectionsCollapsed, setInternalSectionsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.sectionsCollapsed) === 'true';
    } catch {}
    return false;
  });

  const [internalPagesWidth, setInternalPagesWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAGES_WIDTH;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.pagesWidth);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= MIN_PAGES_WIDTH && parsed <= MAX_PAGES_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_PAGES_WIDTH;
  });

  const [internalPagesCollapsed, setInternalPagesCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.pagesCollapsed) === 'true';
    } catch {}
    return false;
  });

  // Effective values
  const notebooksWidth = controlledNotebooksWidth !== undefined ? controlledNotebooksWidth : internalNotebooksWidth;
  const isNotebooksExpanded = controlledNotebooksExpanded !== undefined ? controlledNotebooksExpanded : internalNotebooksExpanded;

  const sectionsWidth = controlledSectionsWidth !== undefined ? controlledSectionsWidth : internalSectionsWidth;
  const isSectionsCollapsed = controlledSectionsCollapsed !== undefined ? controlledSectionsCollapsed : internalSectionsCollapsed;

  const pagesWidth = controlledPagesWidth !== undefined ? controlledPagesWidth : internalPagesWidth;
  const isPagesCollapsed = controlledPagesCollapsed !== undefined ? controlledPagesCollapsed : internalPagesCollapsed;

  // Toggle handlers with persistence
  const toggleNotebooks = useCallback(() => {
    if (onToggleNotebooksExpanded) {
      onToggleNotebooksExpanded();
    } else {
      setInternalNotebooksExpanded((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_KEYS.notebooksExpanded, String(next));
        } catch {}
        return next;
      });
    }
  }, [onToggleNotebooksExpanded]);

  const toggleSections = useCallback(() => {
    if (onToggleSectionsCollapsed) {
      onToggleSectionsCollapsed();
    } else {
      setInternalSectionsCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_KEYS.sectionsCollapsed, String(next));
        } catch {}
        return next;
      });
    }
  }, [onToggleSectionsCollapsed]);

  const togglePages = useCallback(() => {
    if (onTogglePagesCollapsed) {
      onTogglePagesCollapsed();
    } else {
      setInternalPagesCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_KEYS.pagesCollapsed, String(next));
        } catch {}
        return next;
      });
    }
  }, [onTogglePagesCollapsed]);

  // 1. Drag logic for Notebooks rail resizing
  const [isDraggingNotebooks, setIsDraggingNotebooks] = useState(false);
  const notebooksDragRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });
  const latestNotebooksWidthRef = useRef<number>(notebooksWidth);
  latestNotebooksWidthRef.current = notebooksWidth;

  const handleMouseDownNotebooks = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingNotebooks(true);
      notebooksDragRef.current = {
        startX: e.clientX,
        startWidth: isNotebooksExpanded ? notebooksWidth : COMPACT_NOTEBOOKS_WIDTH,
      };
    },
    [isNotebooksExpanded, notebooksWidth]
  );

  useEffect(() => {
    if (!isDraggingNotebooks) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - notebooksDragRef.current.startX;
      const targetWidth = notebooksDragRef.current.startWidth + delta;

      if (targetWidth < 90) {
        if (isNotebooksExpanded) {
          toggleNotebooks();
        }
        return;
      }

      if (!isNotebooksExpanded && targetWidth >= 100) {
        toggleNotebooks();
      }

      const clamped = Math.max(MIN_NOTEBOOKS_WIDTH, Math.min(MAX_NOTEBOOKS_WIDTH, targetWidth));
      latestNotebooksWidthRef.current = clamped;
      if (onNotebooksWidthChange) {
        onNotebooksWidthChange(clamped);
      } else {
        setInternalNotebooksWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingNotebooks(false);
      try {
        localStorage.setItem(STORAGE_KEYS.notebooksWidth, String(latestNotebooksWidthRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingNotebooks, isNotebooksExpanded, onNotebooksWidthChange, toggleNotebooks]);

  // 2. Drag logic for Sections resizing
  const [isDraggingSections, setIsDraggingSections] = useState(false);
  const sectionsDragRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });
  const latestSectionsWidthRef = useRef<number>(sectionsWidth);
  latestSectionsWidthRef.current = sectionsWidth;

  const handleMouseDownSections = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingSections(true);
      sectionsDragRef.current = {
        startX: e.clientX,
        startWidth: sectionsWidth,
      };
    },
    [sectionsWidth]
  );

  useEffect(() => {
    if (!isDraggingSections) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - sectionsDragRef.current.startX;
      const targetWidth = sectionsDragRef.current.startWidth + delta;

      if (targetWidth < 70) {
        if (!isSectionsCollapsed) {
          toggleSections();
        }
        return;
      }

      if (isSectionsCollapsed && targetWidth >= MIN_SECTIONS_WIDTH) {
        toggleSections();
      }

      const clamped = Math.max(MIN_SECTIONS_WIDTH, Math.min(MAX_SECTIONS_WIDTH, targetWidth));
      latestSectionsWidthRef.current = clamped;
      if (onSectionsWidthChange) {
        onSectionsWidthChange(clamped);
      } else {
        setInternalSectionsWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSections(false);
      try {
        localStorage.setItem(STORAGE_KEYS.sectionsWidth, String(latestSectionsWidthRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSections, isSectionsCollapsed, onSectionsWidthChange, toggleSections]);

  // 3. Drag logic for Pages resizing
  const [isDraggingPages, setIsDraggingPages] = useState(false);
  const pagesDragRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });
  const latestPagesWidthRef = useRef<number>(pagesWidth);
  latestPagesWidthRef.current = pagesWidth;

  const handleMouseDownPages = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingPages(true);
      pagesDragRef.current = {
        startX: e.clientX,
        startWidth: pagesWidth,
      };
    },
    [pagesWidth]
  );

  useEffect(() => {
    if (!isDraggingPages) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - pagesDragRef.current.startX;
      const targetWidth = pagesDragRef.current.startWidth + delta;

      if (targetWidth < 70) {
        if (!isPagesCollapsed) {
          togglePages();
        }
        return;
      }

      if (isPagesCollapsed && targetWidth >= MIN_PAGES_WIDTH) {
        togglePages();
      }

      const clamped = Math.max(MIN_PAGES_WIDTH, Math.min(MAX_PAGES_WIDTH, targetWidth));
      latestPagesWidthRef.current = clamped;
      if (onPagesWidthChange) {
        onPagesWidthChange(clamped);
      } else {
        setInternalPagesWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPages(false);
      try {
        localStorage.setItem(STORAGE_KEYS.pagesWidth, String(latestPagesWidthRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingPages, isPagesCollapsed, onPagesWidthChange, togglePages]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: appleTheme.colors.bgSidebar,
        userSelect: 'none',
        fontFamily: appleTheme.fonts.sans,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* 1. Leftmost Navigation Column: Resizable & Expandable macOS Rail / Notebooks List */}
      <div
        style={{
          width: isNotebooksExpanded ? notebooksWidth : COMPACT_NOTEBOOKS_WIDTH,
          minWidth: isNotebooksExpanded ? MIN_NOTEBOOKS_WIDTH : COMPACT_NOTEBOOKS_WIDTH,
          maxWidth: isNotebooksExpanded ? MAX_NOTEBOOKS_WIDTH : COMPACT_NOTEBOOKS_WIDTH,
          backgroundColor: appleTheme.colors.bgSidebarRail,
          borderRight: `1px solid ${appleTheme.colors.borderDarkSubtle}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isNotebooksExpanded ? 'stretch' : 'center',
          padding: isNotebooksExpanded ? 0 : '14px 0',
          gap: isNotebooksExpanded ? 0 : 12,
          flexShrink: 0,
          zIndex: 4,
          transition: isDraggingNotebooks ? 'none' : 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {!isNotebooksExpanded ? (
          /* Compact Rail (54px) */
          <>
            {/* App Logo */}
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
                flexShrink: 0,
              }}
              title="Inkpage"
            >
              In
            </div>

            <div style={{ width: 28, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: '2px 0', flexShrink: 0 }} />

            {/* Notebooks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', overflowY: 'auto', flex: 1, width: '100%' }}>
              {notebooks.map((nb) => (
                <NotebookRailItem
                  key={nb.id}
                  notebook={nb}
                  isSelected={activeNotebook?.id === nb.id}
                  onSelect={() => onSelectNotebook(nb)}
                />
              ))}

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
                  flexShrink: 0,
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

            {/* Rail Collapse / Expand Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginBottom: 6, flexShrink: 0 }}>
              <RailIconButton
                onClick={toggleNotebooks}
                title="Expand Notebooks List"
                active={false}
              >
                <PanelLeft size={17} />
              </RailIconButton>

              <RailIconButton
                onClick={toggleSections}
                title={isSectionsCollapsed ? 'Expand Sections List' : 'Collapse Sections List'}
                active={!isSectionsCollapsed}
              >
                {isSectionsCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </RailIconButton>

              <RailIconButton
                onClick={togglePages}
                title={isPagesCollapsed ? 'Expand Pages List' : 'Collapse Pages List'}
                active={!isPagesCollapsed}
              >
                <Columns size={17} />
              </RailIconButton>
            </div>

            <div style={{ width: 28, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: '2px 0', flexShrink: 0 }} />

            {/* Actions: Search, Tags, Import, Export */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <RailIconButton onClick={onOpenSearch} title="Search All Notes (Ctrl+E)">
                <Search size={17} />
              </RailIconButton>
              <RailIconButton onClick={onOpenTagsSummary} title="Tag Summary Pane">
                <CheckSquare size={17} />
              </RailIconButton>
              <RailIconButton onClick={onOpenImport} title="Import OneNote Files">
                <Upload size={17} />
              </RailIconButton>
              <RailIconButton onClick={onOpenExport} title="Export Notebook">
                <Download size={17} />
              </RailIconButton>
            </div>
          </>
        ) : (
          /* Expanded Notebooks Column */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Header matching Sections & Pages height */}
            <div
              style={{
                height: 44,
                padding: '10px 12px',
                borderBottom: `1px solid ${appleTheme.colors.borderDarkSubtle}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #0071e3 0%, #38bdf8 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  In
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Notebooks
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setShowNewNotebookModal(true)}
                  title="New Notebook"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: appleTheme.colors.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    borderRadius: appleTheme.radii.xs,
                    transition: appleTheme.transitions.fast,
                  }}
                >
                  <Plus size={16} />
                </button>

                <button
                  onClick={toggleNotebooks}
                  title="Collapse to Rail"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.60)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    borderRadius: appleTheme.radii.xs,
                    transition: appleTheme.transitions.fast,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.60)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            </div>

            {/* Expanded Notebooks List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {notebooks.map((nb) => (
                <NotebookExpandedItem
                  key={nb.id}
                  notebook={nb}
                  isSelected={activeNotebook?.id === nb.id}
                  onSelect={() => onSelectNotebook(nb)}
                />
              ))}

              <button
                onClick={() => setShowNewNotebookModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: appleTheme.radii.md,
                  border: '1px dashed rgba(255, 255, 255, 0.20)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'rgba(255, 255, 255, 0.70)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  transition: appleTheme.transitions.fast,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.70)';
                }}
              >
                <Plus size={14} />
                <span>New Notebook</span>
              </button>
            </div>

            {/* Bottom Actions with text labels */}
            <div
              style={{
                padding: '8px 8px',
                borderTop: `1px solid ${appleTheme.colors.borderDarkSubtle}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                flexShrink: 0,
              }}
            >
              <SidebarActionButton
                onClick={onOpenSearch}
                title="Search All Notes (Ctrl+E)"
                icon={<Search size={15} />}
                label="Search Notes"
              />
              <SidebarActionButton
                onClick={onOpenTagsSummary}
                title="Tag Summary Pane"
                icon={<CheckSquare size={15} />}
                label="Tag Summary"
              />
              <SidebarActionButton
                onClick={onOpenImport}
                title="Import OneNote Files"
                icon={<Upload size={15} />}
                label="Import OneNote"
              />
              <SidebarActionButton
                onClick={onOpenExport}
                title="Export Notebook"
                icon={<Download size={15} />}
                label="Export Notebook"
              />
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle 0: Between Notebooks Column and Sections Column */}
      <ResizeHandle
        isDragging={isDraggingNotebooks}
        onMouseDown={handleMouseDownNotebooks}
        onDoubleClick={() => {
          if (isNotebooksExpanded) {
            toggleNotebooks();
          } else {
            toggleNotebooks();
            if (onNotebooksWidthChange) onNotebooksWidthChange(DEFAULT_NOTEBOOKS_WIDTH);
            else setInternalNotebooksWidth(DEFAULT_NOTEBOOKS_WIDTH);
          }
        }}
        title="Drag to resize Notebooks column (Double-click to toggle)"
      />

      {/* 2. Sections Column: Resizable & Collapsible Apple macOS Sidebar List */}
      <div
        style={{
          width: isSectionsCollapsed ? 0 : sectionsWidth,
          minWidth: isSectionsCollapsed ? 0 : MIN_SECTIONS_WIDTH,
          maxWidth: MAX_SECTIONS_WIDTH,
          backgroundColor: appleTheme.colors.bgSidebar,
          borderRight: isSectionsCollapsed ? 'none' : `1px solid ${appleTheme.colors.borderSubtle}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: isSectionsCollapsed ? 0 : 1,
          pointerEvents: isSectionsCollapsed ? 'none' : 'auto',
          transition: isDraggingSections ? 'none' : 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Notebook Title Bar & Column Controls */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '-0.01em',
            color: appleTheme.colors.labelSecondary,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: 6,
            }}
          >
            {activeNotebook?.title || 'Notebook'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                padding: 4,
                borderRadius: appleTheme.radii.xs,
                transition: appleTheme.transitions.fast,
              }}
            >
              <FolderPlus size={16} />
            </button>

            {/* Quick Collapse Sections Button */}
            <button
              onClick={toggleSections}
              title="Collapse Sections"
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: appleTheme.colors.labelTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: appleTheme.radii.xs,
                transition: appleTheme.transitions.fast,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = appleTheme.colors.labelPrimary;
                e.currentTarget.style.backgroundColor = appleTheme.colors.bgSubtleHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = appleTheme.colors.labelTertiary;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
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

      {/* Resize Handle 1: Between Sections and Pages */}
      {!isSectionsCollapsed && (
        <ResizeHandle
          isDragging={isDraggingSections}
          onMouseDown={handleMouseDownSections}
          onDoubleClick={() => {
            if (onSectionsWidthChange) onSectionsWidthChange(DEFAULT_SECTIONS_WIDTH);
            else setInternalSectionsWidth(DEFAULT_SECTIONS_WIDTH);
          }}
          title="Drag to resize Sections (Double-click to reset)"
        />
      )}

      {/* 3. Pages List Column: Resizable & Collapsible Apple Notes List */}
      <div
        style={{
          width: isPagesCollapsed ? 0 : pagesWidth,
          minWidth: isPagesCollapsed ? 0 : MIN_PAGES_WIDTH,
          maxWidth: MAX_PAGES_WIDTH,
          backgroundColor: appleTheme.colors.bgCanvas,
          borderRight: isPagesCollapsed ? 'none' : `1px solid ${appleTheme.colors.borderSubtle}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: isPagesCollapsed ? 0 : 1,
          pointerEvents: isPagesCollapsed ? 'none' : 'auto',
          transition: isDraggingPages ? 'none' : 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Pages Header */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: appleTheme.colors.labelSecondary, textTransform: 'uppercase' }}>
            Pages ({pages.length})
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={onCreatePage}
              title="New Page (Ctrl+N)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 26,
                padding: '0 8px',
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

            {/* Quick Collapse Pages Button */}
            <button
              onClick={togglePages}
              title="Collapse Pages"
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: appleTheme.colors.labelTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: appleTheme.radii.xs,
                transition: appleTheme.transitions.fast,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = appleTheme.colors.labelPrimary;
                e.currentTarget.style.backgroundColor = appleTheme.colors.bgSubtleHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = appleTheme.colors.labelTertiary;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
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

      {/* Resize Handle 2: Between Pages and Canvas */}
      {!isPagesCollapsed && (
        <ResizeHandle
          isDragging={isDraggingPages}
          onMouseDown={handleMouseDownPages}
          onDoubleClick={() => {
            if (onPagesWidthChange) onPagesWidthChange(DEFAULT_PAGES_WIDTH);
            else setInternalPagesWidth(DEFAULT_PAGES_WIDTH);
          }}
          title="Drag to resize Pages (Double-click to reset)"
        />
      )}

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

/**
 * Split-Pane Draggable Resize Handle
 */
const ResizeHandle: React.FC<{
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  title: string;
}> = ({ isDragging, onMouseDown, onDoubleClick, title }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 8,
        marginLeft: -4,
        marginRight: -4,
        height: '100%',
        cursor: 'col-resize',
        position: 'relative',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <div
        style={{
          width: isDragging ? 3 : hovered ? 2 : 1,
          height: '100%',
          backgroundColor: isDragging
            ? appleTheme.colors.accent
            : hovered
            ? appleTheme.colors.accentHover
            : 'transparent',
          borderRadius: 1,
          transition: 'background-color 0.15s ease, width 0.15s ease',
        }}
      />
    </div>
  );
};

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

const NotebookExpandedItem: React.FC<{
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
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: appleTheme.radii.md,
        border: isSelected ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid transparent',
        backgroundColor: isSelected
          ? 'rgba(255, 255, 255, 0.16)'
          : hovered
          ? 'rgba(255, 255, 255, 0.08)'
          : 'transparent',
        boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: appleTheme.transitions.fast,
        boxSizing: 'border-box',
        color: isSelected ? '#ffffff' : hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
      }}
    >
      <Book size={16} color={isSelected ? '#38bdf8' : 'currentColor'} />
      <span
        style={{
          fontSize: 13,
          fontWeight: isSelected ? 600 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {notebook.title}
      </span>
    </button>
  );
};

const SidebarActionButton: React.FC<{
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
}> = ({ title, onClick, icon, label, active }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: label ? '100%' : 36,
        height: 32,
        padding: label ? '0 8px' : 0,
        borderRadius: appleTheme.radii.md,
        backgroundColor: active
          ? 'rgba(255, 255, 255, 0.16)'
          : hovered
          ? 'rgba(255, 255, 255, 0.10)'
          : 'transparent',
        border: 'none',
        color: active ? '#ffffff' : hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.70)',
        cursor: 'pointer',
        transition: appleTheme.transitions.fast,
        boxSizing: 'border-box',
        justifyContent: label ? 'flex-start' : 'center',
        textAlign: 'left',
      }}
    >
      {icon}
      {label && (
        <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
    </button>
  );
};

const RailIconButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}> = ({ title, onClick, children, active }) => {
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
        backgroundColor: active
          ? 'rgba(255, 255, 255, 0.16)'
          : hovered
          ? 'rgba(255, 255, 255, 0.10)'
          : 'transparent',
        border: 'none',
        color: active ? '#ffffff' : hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.70)',
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
        boxSizing: 'border-box',
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
        boxSizing: 'border-box',
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
