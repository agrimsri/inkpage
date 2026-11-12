export type ID = string;

export interface Notebook {
  schema: 1;
  id: ID;
  title: string;
  sectionOrder: ID[];
  created: string;
  modified: string;
}

export interface Section {
  id: ID;
  title: string;
  color: string;
  parentGroup?: ID | null;
  pageOrder: ID[];
  isLocked?: boolean;
  passwordHash?: string;
  encrypted?: {
    kdf: 'argon2id' | 'sha256';
    salt: string;
    params: Record<string, unknown>;
    check: string;
  };
}

export interface PageBackground {
  kind: 'none' | 'rule' | 'grid' | 'image';
  spacing?: number; // 16px narrow, 20px college, 24px standard, 28px wide; or 8, 16, 24, 32px grid
  color?: string; // line color
}

export interface PageSize {
  w: number | 'auto';
  h: number | 'auto';
  preset?: 'auto' | 'letter' | 'a4' | 'legal';
}

export interface PageRevision {
  timestamp: string;
  author: string;
  snapshot: string; // JSON string of Page
}

export interface Page {
  schema: 1;
  id: ID;
  title: string;
  parentPage?: ID | null;
  level: 0 | 1 | 2; // subpage depth
  created: string;
  modified: string;
  size: PageSize;
  pageColor?: string; // pastel tint
  background?: PageBackground;
  items: Item[];
  isDeleted?: boolean;
  deletedAt?: string;
  history?: PageRevision[];
  meta?: Record<string, unknown>;
}

export interface Box {
  id: ID;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

export type TagType =
  | 'todo'
  | 'important'
  | 'question'
  | 'remember'
  | 'definition'
  | 'highlight'
  | 'contact'
  | 'address'
  | 'phone'
  | 'idea'
  | 'critical'
  | 'password'
  | string;

export interface NoteTag {
  type: TagType;
  done?: boolean;
  label?: string;
}

export interface OutlineItemAttrs {
  indent: number;
  tags?: NoteTag[];
  bulletStyle?: 'none' | 'disc' | 'circle' | 'square' | 'diamond' | 'star' | 'arrow' | 'number';
  collapsed?: boolean;
}

export interface PMDocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMDocNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
}

export interface Container extends Box {
  kind: 'container';
  doc: PMDocNode;
}

export type StrokePoint = [
  x: number,
  y: number,
  pressure: number,
  tilt?: number,
  t?: number
];

export interface Stroke {
  id: ID;
  tool: 'pen' | 'highlighter' | 'pencil' | 'laser';
  color: string;
  width: number;
  pts: StrokePoint[];
}

export interface InkGroup extends Box {
  kind: 'ink';
  strokes: Stroke[];
}

export interface ImageItem extends Box {
  kind: 'image';
  asset: string; // sha256 or base64 data url
  alt?: string;
  ocr?: string;
}

export interface FileItem extends Box {
  kind: 'file';
  asset: string;
  filename: string;
  mime: string;
  size?: number;
}

export interface TableCell {
  row: number;
  col: number;
  text: string;
  shading?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface TableItem extends Box {
  kind: 'table';
  rows: number;
  cols: number;
  cells: TableCell[];
  hasHeaderRow?: boolean;
  showBorders?: boolean;
}

export interface MathItem extends Box {
  kind: 'math';
  latex: string;
}

export type ShapeType =
  | 'line'
  | 'arrow'
  | 'doubleArrow'
  | 'rect'
  | 'roundedRect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'grid';

export interface ShapeItem extends Box {
  kind: 'shape';
  shapeType: ShapeType;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
}

export interface AudioItem extends Box {
  kind: 'audio';
  asset: string;
  duration: number; // in seconds
  filename: string;
  audioUrl?: string;
  timestamps?: Array<{ time: number; noteId: string }>;
}

export interface VideoItem extends Box {
  kind: 'video';
  url: string;
  title?: string;
}

export type Item =
  | Container
  | InkGroup
  | ImageItem
  | FileItem
  | TableItem
  | MathItem
  | ShapeItem
  | AudioItem
  | VideoItem;

export interface ImportWarning {
  code: string;
  message: string;
  context?: string;
}

export interface ImportReport {
  notebookTitle: string;
  sectionsCount: number;
  pagesCount: number;
  itemsCount: number;
  imagesCount: number;
  attachmentsCount: number;
  inkStrokesCount: number;
  unmappedPropertyIds: string[];
  warnings: ImportWarning[];
  durationMs: number;
}

export interface SearchMatch {
  notebookId: string;
  sectionId: string;
  pageId: string;
  pageTitle: string;
  itemKind: string;
  snippet: string;
  rank: number;
}

export interface TagSummaryItem {
  pageId: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  sectionColor: string;
  tagType: TagType;
  done?: boolean;
  text: string;
}
