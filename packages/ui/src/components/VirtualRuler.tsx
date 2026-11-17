import React, { useState, useRef } from 'react';
import { RotateCw, X } from 'lucide-react';
import { appleTheme } from '../theme';

export interface VirtualRulerProps {
  visible: boolean;
  onClose: () => void;
}

export const VirtualRuler: React.FC<VirtualRulerProps> = ({ visible, onClose }) => {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 300, y: 250 });
  const [angle, setAngle] = useState<number>(0); // 0 to 360 degrees
  const draggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotatingRef = useRef<boolean>(false);

  if (!visible) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      setPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    rotatingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 5 : -5;
    setAngle((prev) => (prev + delta + 360) % 360);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 520,
        height: 74,
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: appleTheme.radii.lg,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
        cursor: 'grab',
        zIndex: 1000,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '6px 12px',
        fontFamily: appleTheme.fonts.sans,
      }}
    >
      {/* Top Metric Ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: 16 }}>
        {Array.from({ length: 27 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 1,
              height: i % 5 === 0 ? 14 : 7,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
            }}
          />
        ))}
      </div>

      {/* Center Degree readout & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: appleTheme.radii.pill,
            backgroundColor: 'rgba(0, 0, 0, 0.06)',
            fontSize: 13,
            fontWeight: 700,
            color: appleTheme.colors.labelPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {angle}°
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setAngle((a) => (a + 45) % 360)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 24,
              padding: '0 8px',
              borderRadius: appleTheme.radii.pill,
              border: `1px solid ${appleTheme.colors.borderMedium}`,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              color: appleTheme.colors.labelPrimary,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: appleTheme.transitions.fast,
            }}
          >
            <RotateCw size={11} /> +45°
          </button>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: appleTheme.colors.labelTertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: appleTheme.transitions.fast,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = appleTheme.colors.destructive)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = appleTheme.colors.labelTertiary)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Metric Ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: 16 }}>
        {Array.from({ length: 27 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 1,
              height: i % 5 === 0 ? 14 : 7,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
