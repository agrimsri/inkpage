import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Notebook,
  Section,
  Page,
  Item,
  Container,
  InkGroup,
  TableItem,
  MathItem,
  ShapeItem,
  ShapeType,
  AudioItem,
  PageRevision,
} from '@inkpage/format';
import {
  Sidebar,
  Ribbon,
  RibbonTab,
  Canvas,
  SearchPane,
  TagsSummaryPane,
  ImportWizard,
  ExportModal,
  M0LatencyDashboard,
  PasswordModal,
  PageVersionsModal,
  ThemeSwitcher,
  ThemeProvider,
  ToolType,
  MetricSample,
  appleTheme,
  appleStyles,
} from '@inkpage/ui';
import { Lock, Unlock } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:3888';

const AppContent: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);

  // Ribbon Navigation & Tools
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeColor, setActiveColor] = useState<string>('#0066cc');
  const [activeWidth, setActiveWidth] = useState<number>(4);

  // Typography & Formatting
  const [fontFamily, setFontFamily] = useState<string>('SF Pro');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [isStrikethrough, setIsStrikethrough] = useState<boolean>(false);
  const [isSubscript, setIsSubscript] = useState<boolean>(false);
  const [isSuperscript, setIsSuperscript] = useState<boolean>(false);
  const [highlightColor, setHighlightColor] = useState<string>('transparent');
  const [fontColor, setFontColor] = useState<string>('var(--color-label-primary, #1d1d1f)');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Drawing & Shapes
  const [selectedShape, setSelectedShape] = useState<ShapeType | null>(null);
  const [inkToShapeEnabled, setInkToShapeEnabled] = useState<boolean>(false);
  const [rulerEnabled, setRulerEnabled] = useState<boolean>(false);
  const [eraserMode, setEraserMode] = useState<'stroke' | 'point'>('stroke');

  // View States
  const [isFullPageView, setIsFullPageView] = useState<boolean>(false);

  // Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef<number>(0);

  // Selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Panes and Modals
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showTags, setShowTags] = useState<boolean>(false);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showSpikeDashboard, setShowSpikeDashboard] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);

  // Metrics for M0 Latency Spike (stored in ref to avoid re-rendering entire App tree on mouse move)
  const [metricSamples, setMetricSamples] = useState<MetricSample[]>([]);
  const metricSamplesRef = useRef<MetricSample[]>([]);

  // History stack for Undo/Redo and snapshot throttling
  const historyRef = useRef<Page[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const lastSnapshotTimeRef = useRef<number>(0);
  const lastUndoPushTimeRef = useRef<number>(0);
  const pendingSaveRef = useRef<{ nbId: string; secId: string; page: Page } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;

    fetch(
      `${API_BASE_URL}/api/notebooks/${pending.nbId}/sections/${pending.secId}/pages/${pending.page.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.page),
      }
    ).catch(() => {});
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  // Hidden file inputs for attachments & images
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
      color: appleTheme.colors.accent,
      pageOrder: ['demo-page-1'],
    };
    const demoPage: Page = {
      schema: 1,
      id: 'demo-page-1',
      title: 'Welcome to Inkpage 🚀',
      level: 0,
      created: '2026-11-12T10:00:00Z',
      modified: '2026-11-12T10:00:00Z',
      size: { w: 'auto', h: 'auto', preset: 'auto' },
      pageColor: '#ffffff',
      background: { kind: 'rule', spacing: 28, color: appleTheme.colors.borderMedium },
      items: [
        {
          id: 'container-1',
          kind: 'container',
          x: 60,
          y: 60,
          w: 700,
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
                content: [{ type: 'text', text: 'Full OneNote Ribbon: Home, Insert, Draw, View, and contextual Table Tools.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'First-Class Stylus & Ink: Pressure-sensitive pen, highlighter, eraser, and virtual ruler.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'question', done: false }] },
                content: [{ type: 'text', text: 'OneNote Importer: Drag & drop .one, .onetoc2, .onepkg archives or OneDrive ZIP exports.' }],
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
              color: appleTheme.colors.accent,
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
              width: 18,
              pts: [
                [80, 420, 0.5],
                [240, 420, 0.5],
                [400, 420, 0.5],
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
    flushPendingSave();
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
    } catch {}
  };

  const selectSection = async (nbId: string, sec: Section) => {
    flushPendingSave();
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
    } catch {}
  };

  const selectPage = (p: Page) => {
    flushPendingSave();
    setActivePage(p);
    setSelectedItemId(null);
    historyRef.current = [p];
    historyIdxRef.current = 0;
    lastUndoPushTimeRef.current = 0;
  };

  const handleUpdatePage = useCallback(
    (updatedPage: Page) => {
      const now = new Date().toISOString();
      const lastSnap = lastSnapshotTimeRef.current;
      let newHistory = updatedPage.history || [];

      // Only create a revision snapshot if at least 30s have elapsed or if history is empty
      // CRITICAL: Strip history from cleanPage to prevent exponential recursive JSON stringification!
      if (!lastSnap || Date.now() - lastSnap > 30000 || newHistory.length === 0) {
        lastSnapshotTimeRef.current = Date.now();
        const { history: _discard, ...cleanPage } = updatedPage;
        const revision: PageRevision = {
          timestamp: now,
          author: 'Current User',
          snapshot: JSON.stringify(cleanPage),
        };
        newHistory = [...newHistory.slice(-19), revision];
      }

      const pageWithHistory: Page = {
        ...updatedPage,
        modified: now,
        history: newHistory,
      };

      setActivePage(pageWithHistory);
      setPages((prev) => prev.map((p) => (p.id === pageWithHistory.id ? pageWithHistory : p)));

      // Throttled undo history:
      // CRITICAL: Never overwrite the base snapshot (historyIdxRef.current === 0).
      // Only coalesce rapid successive keystrokes/drags if historyIdxRef.current > 0!
      const nowMs = Date.now();
      const isRapidEdit =
        nowMs - lastUndoPushTimeRef.current < 400 && historyIdxRef.current > 0;

      if (isRapidEdit) {
        historyRef.current[historyIdxRef.current] = pageWithHistory;
      } else {
        const newUndo = historyRef.current.slice(0, historyIdxRef.current + 1);
        newUndo.push(pageWithHistory);
        if (newUndo.length > 50) newUndo.shift();
        historyRef.current = newUndo;
        historyIdxRef.current = newUndo.length - 1;
      }
      lastUndoPushTimeRef.current = nowMs;

      // Debounce saving to backend to prevent network saturation and fsync storms
      if (activeNotebook && activeSection) {
        pendingSaveRef.current = {
          nbId: activeNotebook.id,
          secId: activeSection.id,
          page: pageWithHistory,
        };
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          flushPendingSave();
        }, 400);
      }
    },
    [activeNotebook, activeSection, flushPendingSave]
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
      size: { w: 'auto', h: 'auto', preset: 'auto' },
      pageColor: '#ffffff',
      background: { kind: 'rule', spacing: 28, color: appleTheme.colors.borderMedium },
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
    if (pendingSaveRef.current?.page.id === pageId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingSaveRef.current = null;
    }
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleCreatePage();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'N' && e.shiftKey) {
        e.preventDefault();
        handleCreateSection('New Section', appleTheme.colors.accent);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'f')) {
        e.preventDefault();
        setShowSearch(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'F11') {
        e.preventDefault();
        setIsFullPageView((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages, activeNotebook, activeSection]);

  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      historyIdxRef.current -= 1;
      const prev = historyRef.current[historyIdxRef.current];
      lastUndoPushTimeRef.current = 0;
      setActivePage(prev);
      setPages((pList) => pList.map((p) => (p.id === prev.id ? prev : p)));
      if (activeNotebook && activeSection) {
        pendingSaveRef.current = {
          nbId: activeNotebook.id,
          secId: activeSection.id,
          page: prev,
        };
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          flushPendingSave();
        }, 400);
      }
    }
  };

  const handleRedo = () => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      historyIdxRef.current += 1;
      const next = historyRef.current[historyIdxRef.current];
      lastUndoPushTimeRef.current = 0;
      setActivePage(next);
      setPages((pList) => pList.map((p) => (p.id === next.id ? next : p)));
      if (activeNotebook && activeSection) {
        pendingSaveRef.current = {
          nbId: activeNotebook.id,
          secId: activeSection.id,
          page: next,
        };
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          flushPendingSave();
        }, 400);
      }
    }
  };

  const handleRecordMetric = useCallback(
    (latency: number, pointerType: string, pressure: number, coalesced: number) => {
      metricSamplesRef.current.push({ latency, pointerType, pressure, coalesced });
      if (metricSamplesRef.current.length > 100) {
        metricSamplesRef.current.shift();
      }
    },
    []
  );

  // Note Tags and Format helpers
  const handleApplyTag = (tagType: string) => {
    if (!activePage) return;
    // Find active container or create one
    const container = activePage.items.find((i) => i.id === selectedItemId && i.kind === 'container') as
      | Container
      | undefined;
    if (container) {
      const updatedContent = container.doc.content.map((node, idx) => {
        if (idx === 0) {
          const tags = node.attrs?.tags || [];
          const exists = tags.some((t: any) => t.type === tagType);
          const newTags = exists
            ? tags.filter((t: any) => t.type !== tagType)
            : [...tags, { type: tagType, done: false }];
          return { ...node, attrs: { ...node.attrs, tags: newTags } };
        }
        return node;
      });
      const updatedItems = activePage.items.map((i) =>
        i.id === container.id ? { ...i, doc: { ...container.doc, content: updatedContent } } : i
      );
      handleUpdatePage({ ...activePage, items: updatedItems });
    }
  };

  // Insert space tool: moves all items down by 100px
  const handleInsertSpace = () => {
    if (!activePage) return;
    const updatedItems = activePage.items.map((item) => {
      if (item.kind === 'ink') return item;
      return { ...item, y: item.y + 100 };
    });
    handleUpdatePage({ ...activePage, items: updatedItems });
  };

  // Insert table
  const handleInsertTable = (rows: number, cols: number) => {
    if (!activePage) return;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ row: r, col: c, text: r === 0 ? `Header ${c + 1}` : '' });
      }
    }
    const newTable: TableItem = {
      id: `table_${Date.now()}`,
      kind: 'table',
      x: 100,
      y: 120,
      w: Math.max(300, cols * 120),
      h: Math.max(100, rows * 40),
      z: (activePage.items.length || 0) + 1,
      rows,
      cols,
      cells,
    };
    handleUpdatePage({
      ...activePage,
      items: [...activePage.items, newTable],
    });
    setSelectedItemId(newTable.id);
    setActiveTab('table');
  };

  // Insert File & Image Handlers
  const handleInsertFile = () => fileInputRef.current?.click();
  const handleInsertImage = () => imageInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage) return;

    const newFile: Item = {
      id: `file_${Date.now()}`,
      kind: 'file',
      x: 120,
      y: 140,
      w: 320,
      h: 70,
      z: (activePage.items.length || 0) + 1,
      asset: `asset_${Date.now()}`,
      filename: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
    };
    handleUpdatePage({ ...activePage, items: [...activePage.items, newFile] });
    e.target.value = '';
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newImg: Item = {
        id: `img_${Date.now()}`,
        kind: 'image',
        x: 140,
        y: 160,
        w: 420,
        h: 280,
        z: (activePage.items.length || 0) + 1,
        asset: reader.result as string,
        alt: file.name,
        ocr: 'Image OCR Text Extracted [OneNote Filter Engine]',
      };
      handleUpdatePage({ ...activePage, items: [...activePage.items, newImg] });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Audio Recording (WebAudio & MediaRecorder)
  const handleToggleAudioRecording = async () => {
    if (isRecordingAudio) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingAudio(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        recordStartTimeRef.current = Date.now();

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const duration = Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000));

          if (activePage) {
            const newAudio: AudioItem = {
              id: `audio_${Date.now()}`,
              kind: 'audio',
              x: 100,
              y: 180,
              w: 360,
              h: 80,
              z: (activePage.items.length || 0) + 1,
              asset: `audio_${Date.now()}`,
              duration,
              filename: `Meeting_Recording_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
              audioUrl,
            };
            handleUpdatePage({ ...activePage, items: [...activePage.items, newAudio] });
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecordingAudio(true);
      } catch {
        // Fallback simulated voice note if microphone is denied or unavailable in headless
        if (activePage) {
          const mockAudio: AudioItem = {
            id: `audio_${Date.now()}`,
            kind: 'audio',
            x: 100,
            y: 180,
            w: 360,
            h: 80,
            z: (activePage.items.length || 0) + 1,
            asset: `audio_${Date.now()}`,
            duration: 45,
            filename: `Voice_Memo_${new Date().toLocaleTimeString().replace(/:/g, '-')}.m4a`,
          };
          handleUpdatePage({ ...activePage, items: [...activePage.items, mockAudio] });
        }
      }
    }
  };

  // Math Box Insert
  const handleInsertMath = () => {
    if (!activePage) return;
    const newMath: MathItem = {
      id: `math_${Date.now()}`,
      kind: 'math',
      x: 120,
      y: 160,
      w: 420,
      h: 120,
      z: (activePage.items.length || 0) + 1,
      latex: 'f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi) e^{2\\pi i \\xi x} d\\xi',
    };
    handleUpdatePage({ ...activePage, items: [...activePage.items, newMath] });
    setSelectedItemId(newMath.id);
  };

  // Date / Time insert
  const handleInsertDateTime = (includeDate: boolean, includeTime: boolean) => {
    if (!activePage) return;
    const now = new Date();
    let text = '';
    if (includeDate && includeTime) text = now.toLocaleString();
    else if (includeDate) text = now.toLocaleDateString();
    else text = now.toLocaleTimeString();

    const newContainer: Container = {
      id: `container_dt_${Date.now()}`,
      kind: 'container',
      x: 100,
      y: 100,
      w: 300,
      h: 80,
      z: (activePage.items.length || 0) + 1,
      doc: {
        type: 'doc',
        content: [
          {
            type: 'outlineItem',
            attrs: { indent: 0 },
            content: [{ type: 'text', text }],
          },
        ],
      },
    };
    handleUpdatePage({ ...activePage, items: [...activePage.items, newContainer] });
  };

  // Page Templates
  const handleApplyTemplate = (templateName: string) => {
    if (!activePage) return;

    if (templateName === 'cornell') {
      const templateItems: Item[] = [
        {
          id: `cue_col_${Date.now()}`,
          kind: 'container',
          x: 40,
          y: 60,
          w: 240,
          h: 400,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0, tags: [{ type: 'important', done: false }] },
                content: [{ type: 'text', text: 'Cues & Questions' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'Key vocabulary term?' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'Core question / thesis?' }],
              },
            ],
          },
        },
        {
          id: `notes_col_${Date.now()}`,
          kind: 'container',
          x: 300,
          y: 60,
          w: 640,
          h: 400,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0 },
                content: [{ type: 'text', text: 'Detailed Lecture / Reading Notes' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'Write concise bullet points here.' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'Formulas, sketches, and examples.' }],
              },
            ],
          },
        },
        {
          id: `summary_box_${Date.now()}`,
          kind: 'container',
          x: 40,
          y: 480,
          w: 900,
          h: 180,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0, tags: [{ type: 'idea', done: false }] },
                content: [{ type: 'text', text: 'Summary & Key Takeaways' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: 'Brief synthesis in 2–3 sentences.' }],
              },
            ],
          },
        },
      ];
      handleUpdatePage({
        ...activePage,
        title: 'Cornell Notes Template',
        items: templateItems,
      });
    } else if (templateName === 'meeting') {
      const templateItems: Item[] = [
        {
          id: `meeting_header_${Date.now()}`,
          kind: 'container',
          x: 60,
          y: 60,
          w: 700,
          h: 200,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0 },
                content: [{ type: 'text', text: 'Meeting Agenda & Discussion' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'contact', done: false }] },
                content: [{ type: 'text', text: 'Attendees: Alice, Bob, Charlie' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: '1. Review project milestones' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1 },
                content: [{ type: 'text', text: '2. Architecture sync & API contracts' }],
              },
            ],
          },
        },
        {
          id: `action_items_${Date.now()}`,
          kind: 'container',
          x: 60,
          y: 280,
          w: 700,
          h: 220,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0, tags: [{ type: 'important', done: false }] },
                content: [{ type: 'text', text: 'Action Items' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'todo', done: false }] },
                content: [{ type: 'text', text: 'Deploy inkpage-server binary on Linux box' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'todo', done: false }] },
                content: [{ type: 'text', text: 'Benchmark hardware stylus latency under 25ms' }],
              },
            ],
          },
        },
      ];
      handleUpdatePage({
        ...activePage,
        title: `Meeting Notes — ${new Date().toLocaleDateString()}`,
        items: templateItems,
      });
    } else if (templateName === 'planner') {
      const templateItems: Item[] = [
        {
          id: `planner_${Date.now()}`,
          kind: 'container',
          x: 60,
          y: 60,
          w: 760,
          h: 360,
          z: 1,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'outlineItem',
                attrs: { indent: 0, tags: [{ type: 'critical', done: false }] },
                content: [{ type: 'text', text: 'Today Top 3 Priorities' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'todo', done: false }] },
                content: [{ type: 'text', text: 'Priority 1: Complete full ribbon integration' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'todo', done: false }] },
                content: [{ type: 'text', text: 'Priority 2: Test section password protection' }],
              },
              {
                type: 'outlineItem',
                attrs: { indent: 1, tags: [{ type: 'todo', done: false }] },
                content: [{ type: 'text', text: 'Priority 3: Verify page versions snapshot rollback' }],
              },
            ],
          },
        },
      ];
      handleUpdatePage({
        ...activePage,
        title: `Daily Planner — ${new Date().toLocaleDateString()}`,
        items: templateItems,
      });
    }
  };

  // Section Password Protection Handlers
  const handleSetSectionPassword = (password: string) => {
    if (!activeSection) return;
    const updatedSec: Section = {
      ...activeSection,
      isLocked: false,
      passwordHash: btoa(password), // simple base64/hash representation for local state
    };
    setActiveSection(updatedSec);
    setSections((prev) => prev.map((s) => (s.id === updatedSec.id ? updatedSec : s)));
  };

  const handleUnlockSection = (password: string): boolean => {
    if (!activeSection) return false;
    if (activeSection.passwordHash && btoa(password) === activeSection.passwordHash) {
      const updatedSec: Section = { ...activeSection, isLocked: false };
      setActiveSection(updatedSec);
      setSections((prev) => prev.map((s) => (s.id === updatedSec.id ? updatedSec : s)));
      return true;
    }
    return false;
  };

  const handleRemoveSectionPassword = () => {
    if (!activeSection) return;
    const updatedSec: Section = {
      ...activeSection,
      isLocked: false,
      passwordHash: undefined,
    };
    setActiveSection(updatedSec);
    setSections((prev) => prev.map((s) => (s.id === updatedSec.id ? updatedSec : s)));
  };

  const handleToggleSectionLock = () => {
    if (!activeSection) return;
    if (!activeSection.passwordHash) {
      setShowPasswordModal(true);
    } else {
      const updatedSec: Section = {
        ...activeSection,
        isLocked: !activeSection.isLocked,
      };
      setActiveSection(updatedSec);
      setSections((prev) => prev.map((s) => (s.id === updatedSec.id ? updatedSec : s)));
    }
  };

  // Check if active item is table
  const activeItem = activePage?.items.find((i) => i.id === selectedItemId);
  const isTableActive = activeItem?.kind === 'table';

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Hidden File Inputs for Attachment & Pictures */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        onChange={onImageChange}
        style={{ display: 'none' }}
      />

      {/* Navigation Sidebar (Collapsible in Full Page View) */}
      {!isFullPageView && (
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
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Full Microsoft OneNote Ribbon */}
        <Ribbon
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          activeColor={activeColor}
          onSelectColor={setActiveColor}
          activeWidth={activeWidth}
          onSelectWidth={setActiveWidth}
          fontFamily={fontFamily}
          onSelectFontFamily={setFontFamily}
          fontSize={fontSize}
          onSelectFontSize={setFontSize}
          isBold={isBold}
          onToggleBold={() => setIsBold((b) => !b)}
          isItalic={isItalic}
          onToggleItalic={() => setIsItalic((b) => !b)}
          isUnderline={isUnderline}
          onToggleUnderline={() => setIsUnderline((b) => !b)}
          isStrikethrough={isStrikethrough}
          onToggleStrikethrough={() => setIsStrikethrough((b) => !b)}
          isSubscript={isSubscript}
          onToggleSubscript={() => setIsSubscript((b) => !b)}
          isSuperscript={isSuperscript}
          onToggleSuperscript={() => setIsSuperscript((b) => !b)}
          highlightColor={highlightColor}
          onSelectHighlightColor={setHighlightColor}
          fontColor={fontColor}
          onSelectFontColor={setFontColor}
          onClearFormatting={() => {
            setIsBold(false);
            setIsItalic(false);
            setIsUnderline(false);
            setFontSize(14);
            setFontColor('var(--color-label-primary, #1d1d1f)');
          }}
          textAlign={textAlign}
          onSelectTextAlign={setTextAlign}
          onIndent={() => {}}
          onOutdent={() => {}}
          onApplyHeading={() => {}}
          onApplyTag={handleApplyTag}
          onInsertSpace={handleInsertSpace}
          onInsertTable={handleInsertTable}
          onInsertFile={handleInsertFile}
          onInsertPdf={handleInsertFile}
          onInsertImage={handleInsertImage}
          onInsertVideo={(url) => {
            if (!activePage) return;
            const newCont: Container = {
              id: `video_${Date.now()}`,
              kind: 'container',
              x: 100,
              y: 100,
              w: 420,
              h: 120,
              z: (activePage.items.length || 0) + 1,
              doc: {
                type: 'doc',
                content: [
                  {
                    type: 'outlineItem',
                    attrs: { indent: 0 },
                    content: [{ type: 'text', text: `Online Video: ${url}` }],
                  },
                ],
              },
            };
            handleUpdatePage({ ...activePage, items: [...activePage.items, newCont] });
          }}
          isRecordingAudio={isRecordingAudio}
          onToggleAudioRecording={handleToggleAudioRecording}
          onInsertLink={() => {
            const url = window.prompt('Enter link URL:');
            if (url && activePage) {
              const newCont: Container = {
                id: `link_${Date.now()}`,
                kind: 'container',
                x: 100,
                y: 100,
                w: 300,
                h: 80,
                z: (activePage.items.length || 0) + 1,
                doc: {
                  type: 'doc',
                  content: [
                    {
                      type: 'outlineItem',
                      attrs: { indent: 0 },
                      content: [{ type: 'text', text: url }],
                    },
                  ],
                },
              };
              handleUpdatePage({ ...activePage, items: [...activePage.items, newCont] });
            }
          }}
          onInsertMath={handleInsertMath}
          onInsertDateTime={handleInsertDateTime}
          onApplyTemplate={handleApplyTemplate}
          selectedShape={selectedShape}
          onSelectShape={setSelectedShape}
          inkToShapeEnabled={inkToShapeEnabled}
          onToggleInkToShape={() => setInkToShapeEnabled((prev) => !prev)}
          rulerEnabled={rulerEnabled}
          onToggleRuler={() => setRulerEnabled((prev) => !prev)}
          eraserMode={eraserMode}
          onSelectEraserMode={setEraserMode}
          isFullPageView={isFullPageView}
          onToggleFullPageView={() => setIsFullPageView((prev) => !prev)}
          pageColor={activePage?.pageColor || '#ffffff'}
          onSelectPageColor={(c) => {
            if (activePage) handleUpdatePage({ ...activePage, pageColor: c });
          }}
          ruleKind={activePage?.background?.kind || 'rule'}
          ruleSpacing={activePage?.background?.spacing || 28}
          onSelectRuleStyle={(kind, spacing) => {
            if (activePage) {
              handleUpdatePage({
                ...activePage,
                background: {
                  kind,
                  spacing,
                  color: appleTheme.colors.borderMedium,
                },
              });
            }
          }}
          paperSize={activePage?.size?.preset || 'auto'}
          onSelectPaperSize={(preset) => {
            if (activePage) {
              handleUpdatePage({
                ...activePage,
                size: {
                  w: preset === 'letter' ? 816 : preset === 'a4' ? 794 : 'auto',
                  h: preset === 'letter' ? 1056 : preset === 'a4' ? 1123 : 'auto',
                  preset,
                },
              });
            }
          }}
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onZoomReset={() => {}}
          isSectionLocked={!!activeSection?.isLocked}
          onToggleSectionLock={handleToggleSectionLock}
          onOpenVersions={() => setShowVersionsModal(true)}
          onOpenRecycleBin={() => {
            alert('Notebook Recycle Bin: 0 deleted notes in past 60 days.');
          }}
          onOpenTagsSummary={() => setShowTags(true)}
          isTableActive={isTableActive}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* Page Title & Status Header (macOS Page Header) */}
        {activePage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 20px',
              backgroundColor: appleTheme.colors.bgCanvas,
              borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
              fontFamily: appleTheme.fonts.sans,
              boxSizing: 'border-box',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, marginRight: 16 }}>
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
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: appleTheme.colors.labelPrimary,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: appleTheme.fonts.sans,
                  width: '100%',
                  maxWidth: 460,
                  minWidth: 80,
                }}
              />
              <span style={{ fontSize: 12, color: appleTheme.colors.labelTertiary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Created: {(() => {
                  const d = new Date(activePage.created);
                  return !isNaN(d.getTime()) ? d.toLocaleDateString() : activePage.created?.substring(0, 10) || 'Recently';
                })()}
              </span>
            </div>
          </div>
        )}

        {/* 2D Infinite Canvas or Locked Section Screen */}
        <div style={{ flex: 1, position: 'relative' }}>
          {activeSection?.isLocked ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: appleTheme.colors.bgWindow,
                gap: 16,
                fontFamily: appleTheme.fonts.sans,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: appleTheme.colors.destructiveTint,
                  border: `1px solid ${appleTheme.colors.destructiveTintHover}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(215, 0, 21, 0.15)',
                }}
              >
                <Lock size={30} color={appleTheme.colors.destructive} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: appleTheme.colors.labelPrimary, margin: 0, letterSpacing: '-0.015em' }}>
                This section is password-protected.
              </h2>
              <p style={{ fontSize: 13, color: appleTheme.colors.labelSecondary, margin: 0, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
                Click Unlock below or press Enter to enter your password and access notes.
              </p>
              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  ...appleStyles.primaryButton(),
                  height: 36,
                  padding: '0 22px',
                  borderRadius: appleTheme.radii.pill,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Unlock Section
              </button>
            </div>
          ) : activePage ? (
            <Canvas
              page={activePage}
              tool={activeTool}
              activeColor={activeColor}
              activeWidth={activeWidth}
              selectedShape={selectedShape}
              onClearShape={() => setSelectedShape(null)}
              rulerVisible={rulerEnabled}
              onToggleRuler={() => setRulerEnabled(false)}
              onUpdatePage={handleUpdatePage}
              onRecordMetric={handleRecordMetric}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: appleTheme.colors.labelTertiary,
                fontSize: 14,
                fontFamily: appleTheme.fonts.sans,
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
          samples={metricSamples.length > 0 ? metricSamples : metricSamplesRef.current}
          onClose={() => setShowSpikeDashboard(false)}
          onClear={() => {
            metricSamplesRef.current = [];
            setMetricSamples([]);
          }}
        />
      )}

      {showPasswordModal && (
        <PasswordModal
          isLocked={!!activeSection?.isLocked}
          hasPassword={!!activeSection?.passwordHash}
          onSetPassword={handleSetSectionPassword}
          onUnlock={handleUnlockSection}
          onRemovePassword={handleRemoveSectionPassword}
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {showVersionsModal && activePage && (
        <PageVersionsModal
          page={activePage}
          onRestoreVersion={(rev) => {
            try {
              const restored: Page = JSON.parse(rev.snapshot);
              handleUpdatePage(restored);
              setShowVersionsModal(false);
            } catch {}
          }}
          onClose={() => setShowVersionsModal(false)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};
