import test from 'node:test';
import assert from 'node:assert';
import {
  RESERVED_CONTAINER_WIDTH,
  MIN_CONTAINER_WIDTH,
  measureTextWidth,
  calculateOutlineLineWidth,
  calculateElasticContainerWidth,
  parsePMDocToOutlineItems,
  outlineItemsToPMDoc,
  getSubtreeIndices,
  hasSubtreeChildren,
  reorderSubtree,
  toggleSubtreeCollapse,
  getVisibleOutlineItems,
  calculateRuleLineBaselineOffset,
  quantizeLineHeight,
  splitContainerDoc,
  applyInsertSpaceToPage,
} from '../dist/utils/onenote-engine.js';

// =============================================================================
// Tier 1 Tests: Elastic Note Containers & Auto-Grow
// =============================================================================

test('Tier 1: Container width expands with content when isWidthSetByUser is false', () => {
  const shortItems = [
    { id: '1', indent: 0, tags: [], text: 'Hi', collapsed: false },
  ];
  const shortWidth = calculateElasticContainerWidth(shortItems, 40, 'auto');
  assert.ok(shortWidth >= MIN_CONTAINER_WIDTH, 'Should be at least MIN_CONTAINER_WIDTH');

  const longText = 'This is a significantly longer line of text typed inside the note container to test auto expansion';
  const longItems = [
    { id: '1', indent: 0, tags: [], text: longText, collapsed: false },
  ];
  const longWidth = calculateElasticContainerWidth(longItems, 40, 'auto');
  assert.ok(longWidth > shortWidth, 'Longer content should expand container width');
});

test('Tier 1: Container width caps at reservedWidth (624px) when infinite canvas', () => {
  const hugeText = 'A'.repeat(500);
  const items = [
    { id: '1', indent: 0, tags: [], text: hugeText, collapsed: false },
  ];
  const width = calculateElasticContainerWidth(items, 40, 'auto');
  assert.strictEqual(width, RESERVED_CONTAINER_WIDTH, 'Should cap at RESERVED_CONTAINER_WIDTH');
});

test('Tier 1: Container width caps at paper right margin if paper sheet is active', () => {
  const hugeText = 'A'.repeat(500);
  const items = [
    { id: '1', indent: 0, tags: [], text: hugeText, collapsed: false },
  ];
  // Paper sheet width 500, container at x = 100 -> available = 500 - 100 - 20 = 380px
  const width = calculateElasticContainerWidth(items, 100, 500);
  assert.strictEqual(width, 380, 'Should cap at paper right margin (380px)');
});

test('Tier 1: PMDocNode parsing and PMDoc generation roundtrip', () => {
  const doc = {
    type: 'doc',
    content: [
      {
        type: 'outlineItem',
        attrs: { id: 'item_1', indent: 0, tags: [{ type: 'todo', done: false }], collapsed: false },
        content: [{ type: 'text', text: 'First task' }],
      },
      {
        type: 'outlineItem',
        attrs: { id: 'item_2', indent: 1, tags: [], collapsed: true },
        content: [{ type: 'text', text: 'Subtask' }],
      },
    ],
  };

  const parsed = parsePMDocToOutlineItems(doc, 'cont_1');
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].text, 'First task');
  assert.strictEqual(parsed[0].tags[0].type, 'todo');
  assert.strictEqual(parsed[1].indent, 1);
  assert.strictEqual(parsed[1].collapsed, true);

  const regenerated = outlineItemsToPMDoc(parsed);
  assert.strictEqual(regenerated.content.length, 2);
  assert.strictEqual(regenerated.content[0].content[0].text, 'First task');
  assert.strictEqual(regenerated.content[1].attrs.collapsed, true);
});

// =============================================================================
// Tier 2 Tests: Paragraph Grip Handles & Subtree Reordering
// =============================================================================

test('Tier 2: getSubtreeIndices correctly finds parent and all indented descendants', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'Root 1' },
    { id: '1', indent: 1, tags: [], text: 'Child 1.1' },
    { id: '2', indent: 2, tags: [], text: 'Grandchild 1.1.1' },
    { id: '3', indent: 1, tags: [], text: 'Child 1.2' },
    { id: '4', indent: 0, tags: [], text: 'Root 2' },
    { id: '5', indent: 1, tags: [], text: 'Child 2.1' },
  ];

  // Root 1 subtree should include indices [0, 1, 2, 3]
  const subtree0 = getSubtreeIndices(items, 0);
  assert.deepStrictEqual(subtree0, [0, 1, 2, 3]);

  // Child 1.1 subtree should include indices [1, 2]
  const subtree1 = getSubtreeIndices(items, 1);
  assert.deepStrictEqual(subtree1, [1, 2]);

  // Child 1.2 has no children: should be [3]
  const subtree3 = getSubtreeIndices(items, 3);
  assert.deepStrictEqual(subtree3, [3]);

  // Root 2 subtree should be [4, 5]
  const subtree4 = getSubtreeIndices(items, 4);
  assert.deepStrictEqual(subtree4, [4, 5]);
});

test('Tier 2: hasSubtreeChildren returns true only when item has indented children', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'Parent' },
    { id: '1', indent: 1, tags: [], text: 'Child' },
    { id: '2', indent: 0, tags: [], text: 'Leaf' },
  ];

  assert.strictEqual(hasSubtreeChildren(items, 0), true);
  assert.strictEqual(hasSubtreeChildren(items, 1), false);
  assert.strictEqual(hasSubtreeChildren(items, 2), false);
});

test('Tier 2: reorderSubtree moves entire subtree atomically to new location', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'P1' },
    { id: '1', indent: 1, tags: [], text: 'P1.1' },
    { id: '2', indent: 0, tags: [], text: 'P2' },
    { id: '3', indent: 1, tags: [], text: 'P2.1' },
  ];

  // Move P2 (and its child P2.1) before P1 (target drop index 0)
  const reordered = reorderSubtree(items, 2, 0);
  assert.deepStrictEqual(
    reordered.map((i) => i.text),
    ['P2', 'P2.1', 'P1', 'P1.1']
  );

  // Move P2 subtree back to end (after P1 subtree)
  const back = reorderSubtree(reordered, 0, 4);
  assert.deepStrictEqual(
    back.map((i) => i.text),
    ['P1', 'P1.1', 'P2', 'P2.1']
  );
});

test('Tier 2: reorderSubtree inside own subtree is a safe no-op', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'P1' },
    { id: '1', indent: 1, tags: [], text: 'P1.1' },
    { id: '2', indent: 2, tags: [], text: 'P1.1.1' },
  ];

  // Target inside own subtree
  const res = reorderSubtree(items, 0, 1);
  assert.deepStrictEqual(res.map((i) => i.text), ['P1', 'P1.1', 'P1.1.1']);
});

test('Tier 2: Collapse and Expand hides only child outline elements and restores them', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'Root 1', collapsed: false },
    { id: '1', indent: 1, tags: [], text: 'Child 1.1' },
    { id: '2', indent: 2, tags: [], text: 'Grandchild 1.1.1' },
    { id: '3', indent: 0, tags: [], text: 'Root 2' },
  ];

  // Initially all 4 are visible
  const visibleBefore = getVisibleOutlineItems(items);
  assert.strictEqual(visibleBefore.length, 4);

  // Collapse Root 1
  const collapsedItems = toggleSubtreeCollapse(items, 0);
  assert.strictEqual(collapsedItems[0].collapsed, true);

  // Visible items should now only be Root 1 and Root 2 (children hidden)
  const visibleAfter = getVisibleOutlineItems(collapsedItems);
  assert.strictEqual(visibleAfter.length, 2);
  assert.strictEqual(visibleAfter[0].item.text, 'Root 1');
  assert.strictEqual(visibleAfter[1].item.text, 'Root 2');

  // Expand Root 1 again
  const expandedItems = toggleSubtreeCollapse(collapsedItems, 0);
  assert.strictEqual(expandedItems[0].collapsed, false);
  const visibleRestored = getVisibleOutlineItems(expandedItems);
  assert.strictEqual(visibleRestored.length, 4);
});

// =============================================================================
// Tier 3 Tests: Rule Line Baseline Alignment
// =============================================================================

test('Tier 3: First line baseline is mathematically locked to canvas rule line', () => {
  const testSpacings = [24, 28, 32];
  const testYCoordinates = [0, 15, 42, 100, 127, 243, 580];
  const fontSize = 14;
  const headerOffset = 24;
  const baseTopPadding = 4;
  const fontAscent = Math.round(fontSize * 0.78);

  for (const ruleSpacing of testSpacings) {
    for (const containerY of testYCoordinates) {
      const offset = calculateRuleLineBaselineOffset(
        containerY,
        ruleSpacing,
        fontSize,
        headerOffset,
        baseTopPadding
      );

      assert.ok(offset >= 0, `Offset must be non-negative: ${offset}`);
      assert.ok(offset < ruleSpacing, `Offset must be strictly less than ruleSpacing: ${offset} < ${ruleSpacing}`);

      const actualBaseline = containerY + headerOffset + baseTopPadding + offset + fontAscent;
      const remainder = actualBaseline % ruleSpacing;

      assert.strictEqual(
        remainder,
        0,
        `Baseline ${actualBaseline} must sit exactly on rule line (multiple of ${ruleSpacing}) for container Y=${containerY}`
      );
    }
  }
});

test('Tier 3: quantizeLineHeight snaps line-height to integer multiples of rule line height', () => {
  // Standard 14px font on 24px and 28px rules should snap to 1x spacing (24px or 28px)
  assert.strictEqual(quantizeLineHeight(14, 24), 24);
  assert.strictEqual(quantizeLineHeight(14, 28), 28);
  assert.strictEqual(quantizeLineHeight(16, 28), 28);

  // Large heading 28px font on 24px rules should snap to 2x spacing (48px)
  assert.strictEqual(quantizeLineHeight(28, 24), 48);

  // Very large heading 48px font on 24px rules should snap to 3x spacing (72px)
  assert.strictEqual(quantizeLineHeight(48, 24), 72);
});

// =============================================================================
// Tier 4 Tests: Canvas "Insert Space" Tool
// =============================================================================

test('Tier 4: splitContainerDoc splits outline elements at cut plane into upper and lower docs', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Item 1' }] },
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Item 2' }] },
      { type: 'outlineItem', attrs: { indent: 1 }, content: [{ type: 'text', text: 'Item 3' }] },
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Item 4' }] },
    ],
  };

  // Split halfway down (relativeY0 = 70px)
  const { upperDoc, lowerDoc, splitOffsetY } = splitContainerDoc(doc, 70, 28);

  assert.ok(upperDoc.content.length > 0, 'Upper doc must have items');
  assert.ok(lowerDoc.content.length > 0, 'Lower doc must have items');
  assert.strictEqual(upperDoc.content.length + lowerDoc.content.length, 4, 'Total items must be preserved');
  assert.strictEqual(upperDoc.content[0].content[0].text, 'Item 1');
  assert.strictEqual(lowerDoc.content[lowerDoc.content.length - 1].content[0].text, 'Item 4');
  assert.ok(splitOffsetY > 0);
});

test('Tier 4: applyInsertSpaceToPage translates content below y0 and splits spanning containers', () => {
  const testPage = {
    schema: 1,
    id: 'page_1',
    title: 'Test Page',
    level: 0,
    created: '',
    modified: '',
    size: { w: 'auto', h: 'auto' },
    items: [
      // 1. Container purely above y0 (y=50, h=60 -> bottom=110, y0=150)
      {
        id: 'cont_above',
        kind: 'container',
        x: 50,
        y: 50,
        w: 300,
        h: 60,
        z: 1,
        doc: {
          type: 'doc',
          content: [
            { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Above' }] },
          ],
        },
      },
      // 2. Container spanning across y0 (y=120, h=120 -> bottom=240, spans across y0=150)
      {
        id: 'cont_spanning',
        kind: 'container',
        x: 50,
        y: 120,
        w: 300,
        h: 120,
        z: 2,
        doc: {
          type: 'doc',
          content: [
            { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P1' }] },
            { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P2' }] },
            { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P3' }] },
          ],
        },
      },
      // 3. Container purely below y0 (y=300, y0=150)
      {
        id: 'cont_below',
        kind: 'container',
        x: 50,
        y: 300,
        w: 300,
        h: 80,
        z: 3,
        doc: {
          type: 'doc',
          content: [
            { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Below' }] },
          ],
        },
      },
      // 4. Ink strokes below and above y0
      {
        id: 'ink_1',
        kind: 'ink',
        x: 0,
        y: 0,
        w: 500,
        h: 500,
        z: 4,
        strokes: [
          // Stroke purely above y0=150
          {
            id: 's_above',
            tool: 'pen',
            color: '#000000',
            width: 2,
            pts: [[100, 50, 0.5], [110, 60, 0.5]],
          },
          // Stroke purely below y0=150
          {
            id: 's_below',
            tool: 'pen',
            color: '#000000',
            width: 2,
            pts: [[100, 200, 0.5], [110, 210, 0.5]],
          },
        ],
      },
    ],
  };

  const y0 = 150;
  const dy = 80;

  const result = applyInsertSpaceToPage(testPage, y0, dy);

  // 1. Container purely above should be completely unchanged
  const contAbove = result.items.find((i) => i.id === 'cont_above');
  assert.ok(contAbove);
  assert.strictEqual(contAbove.y, 50);

  // 2. Container purely below should be translated down by dy=80 (300 + 80 = 380)
  const contBelow = result.items.find((i) => i.id === 'cont_below');
  assert.ok(contBelow);
  assert.strictEqual(contBelow.y, 380);

  // 3. Spanning container should have been split into upper and lower containers!
  const upperCont = result.items.find((i) => i.id === 'cont_spanning');
  assert.ok(upperCont, 'Original spanning container id kept for upper container');
  assert.strictEqual(upperCont.y, 120, 'Upper container stays at original Y');

  const lowerCont = result.items.find((i) => i.id.includes('lower'));
  assert.ok(lowerCont, 'Lower container must be created');
  assert.ok(lowerCont.y >= y0 + dy, `Lower container Y (${lowerCont.y}) must be >= y0 + dy (${y0 + dy})`);

  // 4. Ink stroke purely above remains at Y=50, 60; ink stroke below translated by +80 to Y=280, 290
  const ink = result.items.find((i) => i.id === 'ink_1');
  assert.ok(ink);
  const strokeAbove = ink.strokes.find((s) => s.id === 's_above');
  assert.strictEqual(strokeAbove.pts[0][1], 50);

  const strokeBelow = ink.strokes.find((s) => s.id === 's_below');
  assert.strictEqual(strokeBelow.pts[0][1], 280);
});

// =============================================================================
// Edge Cases & Deep Hardening Tests
// =============================================================================

test('Tier 1 Edge Case: calculateOutlineLineWidth measures longest line when text has soft breaks', () => {
  const itemSingleLong = {
    id: '1',
    indent: 0,
    tags: [],
    text: 'Line 1 is exactly 30 chars long\nShort line',
  };
  const width = calculateOutlineLineWidth(itemSingleLong, 14);
  assert.ok(width > 0);
  assert.ok(width < 500, 'Width should not add line lengths together');
});

test('Tier 2 Edge Case: reorderSubtree moving child to top shifts indent to 0', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'Parent' },
    { id: '1', indent: 1, tags: [], text: 'Child' },
    { id: '2', indent: 2, tags: [], text: 'Grandchild' },
    { id: '3', indent: 0, tags: [], text: 'Other' },
  ];

  // Moving Child (and its Grandchild) to index 0
  const reordered = reorderSubtree(items, 1, 0);
  assert.strictEqual(reordered[0].text, 'Child');
  assert.strictEqual(reordered[0].indent, 0, 'Moved subtree root at index 0 must have indent 0');
  assert.strictEqual(reordered[1].text, 'Grandchild');
  assert.strictEqual(reordered[1].indent, 1, 'Descendant must retain relative indent +1');
  assert.strictEqual(reordered[2].text, 'Parent');
  assert.strictEqual(reordered[3].text, 'Other');
});

test('Tier 2 Edge Case: toggleSubtreeCollapse on leaf node with no children is a no-op', () => {
  const items = [
    { id: '0', indent: 0, tags: [], text: 'Leaf node', collapsed: false },
  ];
  const toggled = toggleSubtreeCollapse(items, 0);
  assert.strictEqual(toggled[0].collapsed, false, 'Leaf node without children must NOT collapse');
});

test('Tier 3 Edge Case: calculateRuleLineBaselineOffset with halfLeading aligns precisely', () => {
  const offset = calculateRuleLineBaselineOffset(100, 28, 14, 24, 4, 7);
  assert.ok(offset >= 0 && offset < 28);
  const baseline = 100 + 24 + 4 + 7 + Math.round(14 * 0.78) + offset;
  assert.strictEqual(baseline % 28, 0, 'Baseline with half-leading must align exactly to rule spacing');
});

test('Tier 4 Edge Case: splitContainerDoc with cut inside header does NOT split and keeps items in lowerDoc', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P1' }] },
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P2' }] },
    ],
  };
  // Cut at relativeY0 = 5px (inside top padding)
  const { upperDoc, lowerDoc } = splitContainerDoc(doc, 5, 28);
  assert.strictEqual(upperDoc.content.length, 0, 'Upper doc should be empty when cut is in header');
  assert.strictEqual(lowerDoc.content.length, 2, 'All items belong in lower doc');
});

test('Tier 4 Edge Case: splitContainerDoc with cut below all items does NOT split and keeps items in upperDoc', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P1' }] },
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P2' }] },
    ],
  };
  // Cut at relativeY0 = 200px (below all items)
  const { upperDoc, lowerDoc } = splitContainerDoc(doc, 200, 28);
  assert.strictEqual(upperDoc.content.length, 2, 'All items belong in upper doc when cut is below');
  assert.strictEqual(lowerDoc.content.length, 0, 'Lower doc should be empty when cut is below');
});

test('Tier 4 Edge Case: splitContainerDoc normalizes lower container indents without orphaned levels', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Root' }] },
      { type: 'outlineItem', attrs: { indent: 1 }, content: [{ type: 'text', text: 'Child' }] },
      { type: 'outlineItem', attrs: { indent: 2 }, content: [{ type: 'text', text: 'Grandchild 1' }] },
      { type: 'outlineItem', attrs: { indent: 2 }, content: [{ type: 'text', text: 'Grandchild 2' }] },
      { type: 'outlineItem', attrs: { indent: 3 }, content: [{ type: 'text', text: 'Great-Grandchild' }] },
    ],
  };

  // Cut between Child and Grandchild 1 (relativeY0 = 70px)
  const { upperDoc, lowerDoc } = splitContainerDoc(doc, 70, 28);
  assert.strictEqual(upperDoc.content.length, 2, 'Upper doc gets Root and Child');
  assert.strictEqual(lowerDoc.content.length, 3, 'Lower doc gets grandchildren');

  const lowerIndents = lowerDoc.content.map((n) => n.attrs.indent);
  assert.strictEqual(lowerIndents[0], 0, 'Grandchild 1 must be normalized to root indent 0');
  assert.strictEqual(lowerIndents[1], 0, 'Grandchild 2 must be sibling at indent 0');
  assert.strictEqual(lowerIndents[2], 1, 'Great-Grandchild must be child at indent 1');
});

test('Tier 4 Edge Case: splitContainerDoc keeps collapsed parent and hidden children together', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'outlineItem', attrs: { indent: 0, collapsed: true }, content: [{ type: 'text', text: 'Root' }] },
      { type: 'outlineItem', attrs: { indent: 1 }, content: [{ type: 'text', text: 'Hidden 1' }] },
      { type: 'outlineItem', attrs: { indent: 1 }, content: [{ type: 'text', text: 'Hidden 2' }] },
      { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'Root 2' }] },
    ],
  };

  // Cut after Root
  const { upperDoc, lowerDoc } = splitContainerDoc(doc, 45, 28);
  assert.deepStrictEqual(
    upperDoc.content.map((n) => n.content[0].text),
    ['Root', 'Hidden 1', 'Hidden 2'],
    'Collapsed parent and all hidden children must stay together in upper doc'
  );
  assert.deepStrictEqual(
    lowerDoc.content.map((n) => n.content[0].text),
    ['Root 2'],
    'Lower doc gets Root 2'
  );
});

test('Tier 4 Edge Case: applyInsertSpaceToPage when cut is in header moves whole container without split', () => {
  const testPage = {
    schema: 1,
    id: 'page_cut_header',
    title: '',
    level: 0,
    created: '',
    modified: '',
    size: { w: 'auto', h: 'auto' },
    items: [
      {
        id: 'c1',
        kind: 'container',
        x: 50,
        y: 100,
        w: 300,
        h: 150,
        z: 1,
        doc: {
          type: 'doc',
          content: [
            { type: 'outlineItem', attrs: { indent: 0 }, content: [{ type: 'text', text: 'P1' }] },
          ],
        },
      },
    ],
  };

  // Cut at y0 = 105 (inside top 5px of container at y=100)
  const result = applyInsertSpaceToPage(testPage, 105, 50, 28);
  assert.strictEqual(result.items.length, 1, 'Must not split into 2 containers');
  assert.strictEqual(result.items[0].y, 150, 'Whole container translated down by dy=50');
});
