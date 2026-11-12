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
  encrypted?: {
    kdf: 'argon2id';
    salt: string;
    params: Record<string, unknown>;
    check: string;
  };
}

export interface PageBackground {
  kind: 'none' | 'rule' | 'grid' | 'image';
  spacing?: number;
  color?: string;
}

export interface PageSize {
  w: number | 'auto';
  h: number | 'auto';
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
  background?: PageBackground;
  items: Item[];
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

export interface NoteTag {
  type: 'todo' | 'important' | 'question' | string;
  done?: boolean;
}

export interface OutlineItemAttrs {
  indent: number;
  tags?: NoteTag[];
  bulletStyle?: 'none' | 'disc' | 'circle' | 'square' | 'number';
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
  tool: 'pen' | 'highlighter' | 'pencil';
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
  asset: string; // sha256
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
}

export interface TableItem extends Box {
  kind: 'table';
  rows: number;
  cols: number;
  cells: TableCell[];
}

export interface MathItem extends Box {
  kind: 'math';
  latex: string;
}

export interface ShapeItem extends Box {
  kind: 'shape';
  shapeType: 'rect' | 'ellipse' | 'line' | 'arrow';
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
}

export type Item =
  | Container
  | InkGroup
  | ImageItem
  | FileItem
  | TableItem
  | MathItem
  | ShapeItem;

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
  tagType: 'todo' | 'important' | 'question' | string;
  done?: boolean;
  text: string;
}
