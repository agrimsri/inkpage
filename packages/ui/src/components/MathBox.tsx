import React, { useState } from 'react';
import type { MathItem } from '@inkpage/format';
import { Sigma, Check, X } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

export interface MathBoxProps {
  item: MathItem;
  isSelected: boolean;
  onUpdateLatex: (latex: string) => void;
  onDelete: () => void;
}

const MATH_SYMBOLS = [
  { label: '√x', insert: '\\sqrt{x}' },
  { label: 'a/b', insert: '\\frac{a}{b}' },
  { label: 'x²', insert: 'x^2' },
  { label: 'xₙ', insert: 'x_n' },
  { label: '∫', insert: '\\int' },
  { label: '∑', insert: '\\sum' },
  { label: 'π', insert: '\\pi' },
  { label: 'α', insert: '\\alpha' },
  { label: 'β', insert: '\\beta' },
  { label: 'θ', insert: '\\theta' },
  { label: '±', insert: '\\pm' },
  { label: '≤', insert: '\\le' },
  { label: '≥', insert: '\\ge' },
  { label: '≠', insert: '\\ne' },
  { label: '∞', insert: '\\infty' },
];

export const MathBox: React.FC<MathBoxProps> = ({
  item,
  isSelected,
  onUpdateLatex,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [latexInput, setLatexInput] = useState(item.latex);

  return (
    <div
      style={{
        padding: 10,
        backgroundColor: appleTheme.colors.bgCard,
        border: isSelected ? `1.5px solid ${appleTheme.colors.purple}` : `1px solid ${appleTheme.colors.borderSubtle}`,
        borderRadius: appleTheme.radii.md,
        boxShadow: isSelected ? appleTheme.shadows.card : appleTheme.shadows.subtle,
        fontFamily: appleTheme.fonts.sans,
        transition: appleTheme.transitions.fast,
      }}
    >
      {/* Symbol Palette when editing */}
      {isSelected && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: '6px 8px',
            backgroundColor: appleTheme.colors.purpleTint,
            borderBottom: `1px solid ${appleTheme.colors.borderSubtle}`,
            marginBottom: 8,
            borderRadius: appleTheme.radii.sm,
          }}
        >
          {MATH_SYMBOLS.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                const updated = latexInput + ' ' + s.insert;
                setLatexInput(updated);
                onUpdateLatex(updated);
              }}
              style={{
                padding: '2px 8px',
                border: `1px solid ${appleTheme.colors.borderSubtle}`,
                borderRadius: appleTheme.radii.pill,
                backgroundColor: appleTheme.colors.bgCard,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'serif',
                color: appleTheme.colors.labelPrimary,
                transition: appleTheme.transitions.fast,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* LaTeX Input or Formatted Display */}
      {isEditing || isSelected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={latexInput}
            onChange={(e) => {
              setLatexInput(e.target.value);
              onUpdateLatex(e.target.value);
            }}
            placeholder="e.g. E = mc^2 or \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
            style={{
              ...appleStyles.inputField,
              flex: 1,
              fontFamily: appleTheme.fonts.mono,
              fontSize: 13,
            }}
          />
        </div>
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          style={{
            fontFamily: 'serif',
            fontSize: 18,
            color: appleTheme.colors.labelPrimary,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          {item.latex || 'Click to edit equation'}
        </div>
      )}
    </div>
  );
};
