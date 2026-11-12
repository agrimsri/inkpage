import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Notebook, Section, Page, Item, Container, InkGroup } from '@inkpage/format';
import {
  Sidebar,
  ToolPalette,
  Canvas,
  SearchPane,
  TagsSummaryPane,
  ImportWizard,
  ExportModal,
  M0LatencyDashboard,
  ToolType,
  MetricSample,
} from '@inkpage/ui';

const API_BASE_URL = 'http://127.0.0.1:3888';

export const App: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);

  // Tool states
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeColor, setActiveColor] = useState<string>('#2563eb');
  const [activeWidth, setActiveWidth] = useState<number>(4);

  // Panes and Modals
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showTags, setShowTags] = useState<boolean>(false);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showSpikeDashboard, setShowSpikeDashboard] = useState<boolean>(false);

  // Metrics for M0 Latency Spike
  const [metricSamples, setMetricSamples] = useState<MetricSample[]>([]);

  // History stack for Undo/Redo
  const historyRef = useRef<Page[]>([]);
  const historyIdxRef = useRef<number>(-1);

  // Load Notebooks on startup
  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebooks`);
      if (res.ok) {
        const data: Notebook[] = await res.json();
        setNotebooks(data);
        if (data.length > 0 && !activeNotebook) {
          selectNotebook(data[0]);
        }
      } else {
        fallbackToLocalDemo();
      }
    } catch {
      fallbackToLocalDemo();
    }
  };

  const fallbackToLocalDemo = () => {
    // Resilient local state if backend server isn't running
    const demoNotebook: Notebook = {
      schema: 1,
      id: 'demo-nb-1',
      title: 'Welcome to Inkpage',
      sectionOrder: ['demo-sec-1'],
      created: '2026-11-12T10:00:00Z',
      modified: '2026-11-12T10:00:00Z',
    };
    const demoSection: Section = {
      id: 'demo-sec-1',
      title: 'Quick Notes',
      color: '#6366f1',
      pageOrder: ['demo-page-1'],
    };
    const demoPage: Page = {
      schema: 1,
      id: 'demo-page-1',
      title: 'Welcome to Inkpage 🚀',
      level: 0,
      created: '2026-11-12T10:00:00Z',
      modified: '2026-11-12T10:00:00Z',
      size: { w: 'auto', h: 'auto' },
      background: { kind: 'rule', spacing: 24, color: '#e2e8f0' },
      items: [
        {
          id: 'container-1',
          kind: 'container',
          x: 60,
          y: 60,
          w: 680,
          h: 280,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0, tags: [{ type: 'todo', done: false }] },
                content: [{ type: 'text', text: 'Welcome to Inkpage! A free, open-source, local-first note-taking app.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'important', done: false }] },
                content: [{ type: 'text', text: 'Freeform 2D Canvas: Click anywhere to type notes, movable & resizable containers.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'First-Class Stylus & Ink: Pressure-sensitive pen, highlighter, eraser, and lasso.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'question', done: false }] },
                content: [{ type: 'text', text: 'OneNote Importer: Drag & drop .one, .onetoc2, .onepkg archives or OneDrive ZIP exports.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'Instant FTS5 Search & Image OCR: Fast full-text search across all notebooks.' }],
              },
            ],
          },
        },
        {
          id: 'ink-1',
          kind: 'ink',
          x: 0,
          y: 0,
          w: 1200,
          h: 800,
          z: 2,
          strokes: [
            {
              id: 'stroke-1',
              tool: 'pen',
              color: '#2563eb',
              width: 4,
              pts: [
                [100, 380, 0.5],
                [140, 390, 0.7],
                [200, 375, 0.8],
                [260, 395, 0.6],
              ],
            },
            {
              id: 'stroke-2',
              tool: 'highlighter',
              color: '#fef08a',
              width: 16,
              pts: [
                [80, 420, 0.5],
                [220, 420, 0.5],
                [360, 420, 0.5],
              ],
            },
          ],
        },
      ],
    };

    setNotebooks([demoNotebook]);
    setActiveNotebook(demoNotebook);
    setSections([demoSection]);
    setActiveSection(demoSection);
    setPages([demoPage]);
    setActivePage(demoPage);
  };

  const selectNotebook = async (nb: Notebook) => {
    setActiveNotebook(nb);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebooks/${nb.id}/sections`);
      if (res.ok) {
        const secList: Section[] = await res.json();
        setSections(secList);
        if (secList.length > 0) {
          selectSection(nb.id, secList[0]);
        } else {
          setPages([]);
          setActivePage(null);
        }
      }
    } catch {
      // Keep existing sections if offline
    }
  };

  const selectSection = async (nbId: string, sec: Section) => {
    setActiveSection(sec);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebooks/${nbId}/sections/${sec.id}/pages`);
      if (res.ok) {
        const pageList: Page[] = await res.json();
        setPages(pageList);
        if (pageList.length > 0) {
          selectPage(pageList[0]);
        } else {
          setActivePage(null);
        }
      }
    } catch {
      // Keep existing pages if offline
    }
  };

  const selectPage = (p: Page) => {
    setActivePage(p);
    historyRef.current = [p];
    historyIdxRef.current = 0;
  };

  const handleUpdatePage = useCallback(
    (updatedPage: Page) => {
      setActivePage(updatedPage);
      setPages((prev) => prev.map((p) => (p.id === updatedPage.id ? updatedPage : p)));

      // Add to undo history
      const newHistory = historyRef.current.slice(0, historyIdxRef.current + 1);
      newHistory.push(updatedPage);
      historyRef.current = newHistory;
      historyIdxRef.current = newHistory.length - 1;

      // Save to backend
      if (activeNotebook && activeSection) {
        fetch(
          `${API_BASE_URL}/api/notebooks/${activeNotebook.id}/sections/${activeSection.id}/pages/${updatedPage.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPage),
          }
        ).catch(() => {});
      }
    },
    [activeNotebook, activeSection]
  );

  const handleCreateNotebook = async (title: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const newNb: Notebook = await res.json();
        setNotebooks((prev) => [...prev, newNb]);
        selectNotebook(newNb);
      }
    } catch {
      const fallbackNb: Notebook = {
        schema: 1,
        id: `nb_${Date.now()}`,
        title,
        sectionOrder: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };
      setNotebooks((prev) => [...prev, fallbackNb]);
      selectNotebook(fallbackNb);
    }
  };

  const handleCreateSection = async (title: string, color: string) => {
    if (!activeNotebook) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebooks/${activeNotebook.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, color }),
      });
      if (res.ok) {
        const newSec: Section = await res.json();
        setSections((prev) => [...prev, newSec]);
        selectSection(activeNotebook.id, newSec);
      }
    } catch {
      const fallbackSec: Section = {
        id: `sec_${Date.now()}`,
        title,
        color,
        pageOrder: [],
      };
      setSections((prev) => [...prev, fallbackSec]);
      selectSection(activeNotebook.id, fallbackSec);
    }
  };

  const handleCreatePage = async () => {
    if (!activeNotebook || !activeSection) return;
    const newPage: Page = {
      schema: 1,
      id: `page_${Date.now()}`,
      title: 'Untitled Page',
      level: 0,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      size: { w: 'auto', h: 'auto' },
      background: { kind: 'rule', spacing: 24, color: '#e2e8f0' },
      items: [],
    };

    try {
      await fetch(
        `${API_BASE_URL}/api/notebooks/${activeNotebook.id}/sections/${activeSection.id}/pages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPage),
        }
      );
    } catch {}

    setPages((prev) => [...prev, newPage]);
    selectPage(newPage);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!activeNotebook || !activeSection) return;
    try {
      await fetch(
        `${API_BASE_URL}/api/notebooks/${activeNotebook.id}/sections/${activeSection.id}/pages/${pageId}`,
        { method: 'DELETE' }
      );
    } catch {}

    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (activePage?.id === pageId) {
      setActivePage(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleCreatePage();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'N' && e.shiftKey) {
        e.preventDefault();
        handleCreateSection('New Section', '#6366f1');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'f')) {
        e.preventDefault();
        setShowSearch(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages, activeNotebook, activeSection]);

  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      const prev = historyRef.current[historyIdxRef.current];
      setActivePage(prev);
    }
  };

  const handleRedo = () => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1;
      const next = historyRef.current[historyIdxRef.current];
      setActivePage(next);
    }
  };

  const handleRecordMetric = (
    latency: number,
    pointerType: string,
    pressure: number,
    coalesced: number
  ) => {
    setMetricSamples((prev) => [
      ...prev.slice(-99),
      { latency, pointerType, pressure, coalesced },
    ]);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Navigation Sidebar (Notebooks Rail, Sections Tabs, Pages Tree) */}
      <Sidebar
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        sections={sections}
        activeSection={activeSection}
        pages={pages}
        activePage={activePage}
        onSelectNotebook={selectNotebook}
        onCreateNotebook={handleCreateNotebook}
        onSelectSection={(sec) => selectSection(activeNotebook?.id || '', sec)}
        onCreateSection={handleCreateSection}
        onSelectPage={selectPage}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        onOpenSearch={() => setShowSearch(true)}
        onOpenTagsSummary={() => setShowTags(true)}
        onOpenImport={() => setShowImport(true)}
        onOpenExport={() => setShowExport(true)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Tool Palette Toolbar */}
        <ToolPalette
          activeTool={activeTool}
          activeColor={activeColor}
          activeWidth={activeWidth}
          onSelectTool={setActiveTool}
          onSelectColor={setActiveColor}
          onSelectWidth={setActiveWidth}
          onAddTable={() => {
            if (!activePage) return;
            const newTable: Item = {
              id: `table_${Date.now()}`,
              kind: 'table',
              x: 100,
              y: 100,
              w: 420,
              h: 180,
              z: 3,
              rows: 3,
              cols: 3,
              cells: [
                { row: 0, col: 0, text: 'Task' },
                { row: 0, col: 1, text: 'Owner' },
                { row: 0, col: 2, text: 'Status' },
                { row: 1, col: 0, text: 'Import .onepkg' },
                { row: 1, col: 1, text: 'Agent' },
                { row: 1, col: 2, text: 'Ready' },
              ],
            } as any;
            handleUpdatePage({
              ...activePage,
              items: [...activePage.items, newTable],
            });
          }}
          onAddImage={() => {
            if (!activePage) return;
            const newImage: Item = {
              id: `img_${Date.now()}`,
              kind: 'image',
              x: 120,
              y: 120,
              w: 320,
              h: 220,
              z: 3,
              asset: 'sample_asset_hash',
              alt: 'Architecture Diagram',
              ocr: 'OneNote Revision Store Header [MS-ONESTORE]',
            } as any;
            handleUpdatePage({
              ...activePage,
              items: [...activePage.items, newImage],
            });
          }}
          onAddFile={() => {
            if (!activePage) return;
            const newFile: Item = {
              id: `file_${Date.now()}`,
              kind: 'file',
              x: 140,
              y: 140,
              w: 300,
              h: 70,
              z: 3,
              asset: 'sample_file_hash',
              filename: 'Specification_v1.docx',
              mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              size: 142000,
            } as any;
            handleUpdatePage({
              ...activePage,
              items: [...activePage.items, newFile],
            });
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onToggleSpikeModal={() => setShowSpikeDashboard(true)}
        />

        {/* Page Title & Background Controls Bar */}
        {activePage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 24px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <input
              value={activePage.title}
              onChange={(e) =>
                handleUpdatePage({
                  ...activePage,
                  title: e.target.value,
                })
              }
              placeholder="Untitled Page"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#0f172a',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '60%',
              }}
            />

            {/* Background Style Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Paper:</span>
              {(['rule', 'grid', 'none'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() =>
                    handleUpdatePage({
                      ...activePage,
                      background: {
                        kind: b,
                        spacing: 24,
                        color: '#e2e8f0',
                      },
                    })
                  }
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border:
                      activePage.background?.kind === b
                        ? '1px solid #3b82f6'
                        : '1px solid #e2e8f0',
                    backgroundColor:
                      activePage.background?.kind === b ? '#eff6ff' : '#ffffff',
                    color:
                      activePage.background?.kind === b ? '#1d4ed8' : '#475569',
                    fontSize: 11,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2D Infinite Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {activePage ? (
            <Canvas
              page={activePage}
              tool={activeTool}
              activeColor={activeColor}
              activeWidth={activeWidth}
              onUpdatePage={handleUpdatePage}
              onRecordMetric={handleRecordMetric}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: 14,
              }}
            >
              No page selected. Create a new page with Ctrl+N.
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panes and Modals */}
      {showSearch && (
        <SearchPane
          onClose={() => setShowSearch(false)}
          onSelectResult={async (nbId, secId, pageId) => {
            const nb = notebooks.find((n) => n.id === nbId);
            if (nb) await selectNotebook(nb);
            const sec = sections.find((s) => s.id === secId);
            if (sec && nbId) await selectSection(nbId, sec);
            const p = pages.find((page) => page.id === pageId);
            if (p) selectPage(p);
          }}
        />
      )}

      {showTags && activeNotebook && (
        <TagsSummaryPane
          notebookId={activeNotebook.id}
          onClose={() => setShowTags(false)}
          onJumpToPage={(secId, pageId) => {
            const sec = sections.find((s) => s.id === secId);
            if (sec && activeNotebook) selectSection(activeNotebook.id, sec);
            const p = pages.find((page) => page.id === pageId);
            if (p) selectPage(p);
            setShowTags(false);
          }}
        />
      )}

      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onImportComplete={async (nbId) => {
            await fetchNotebooks();
            const imported = notebooks.find((n) => n.id === nbId);
            if (imported) selectNotebook(imported);
          }}
        />
      )}

      {showExport && (
        <ExportModal
          notebook={activeNotebook}
          activePage={activePage}
          onClose={() => setShowExport(false)}
        />
      )}

      {showSpikeDashboard && (
        <M0LatencyDashboard
          samples={metricSamples}
          onClose={() => setShowSpikeDashboard(false)}
          onClear={() => setMetricSamples([])}
        />
      )}
    </div>
  );
};
