import React, { useState, useRef } from 'react';
import { RotateCw, X } from 'lucide-react';

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
        width: 500,
        height: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #94a3b8',
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
        cursor: 'grab',
        zIndex: 1000,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4px 8px',
      }}
    >
      {/* Top Metric Ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: 16 }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 1,
              height: i % 5 === 0 ? 14 : 7,
              backgroundColor: '#334155',
            }}
          />
        ))}
      </div>

      {/* Center Degree readout & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {angle}°
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setAngle((a) => (a + 45) % 360)}
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <RotateCw size={11} /> +45°
          </button>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 2,
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Bottom Metric Ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: 16 }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 1,
              height: i % 5 === 0 ? 14 : 7,
              backgroundColor: '#334155',
            }}
          />
        ))}
      </div>
    </div>
  );
};
