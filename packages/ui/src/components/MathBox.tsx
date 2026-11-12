import React, { useState } from 'react';
import type { MathItem } from '@inkpage/format';
import { Sigma, Check, X } from 'lucide-react';

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
        padding: 8,
        backgroundColor: '#ffffff',
        border: isSelected ? '1px solid #7c3aed' : '1px solid #e2e8f0',
        borderRadius: 6,
        boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.12)' : 'none',
      }}
    >
      {/* Symbol Palette when editing */}
      {isSelected && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: '4px 6px',
            backgroundColor: '#faf5ff',
            borderBottom: '1px solid #e9d5ff',
            marginBottom: 6,
            borderRadius: 4,
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
                padding: '2px 6px',
                border: '1px solid #d8b4fe',
                borderRadius: 4,
                backgroundColor: '#ffffff',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'serif',
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
              flex: 1,
              padding: '6px 8px',
              fontFamily: 'monospace',
              fontSize: 13,
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              outline: 'none',
            }}
          />
        </div>
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          style={{
            fontFamily: 'serif',
            fontSize: 18,
            color: '#1e293b',
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
