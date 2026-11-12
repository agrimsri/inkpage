import React, { useState, useRef } from 'react';
import type { AudioItem } from '@inkpage/format';
import { Play, Pause, Volume2, Mic, Trash2 } from 'lucide-react';

export interface AudioPlayerWidgetProps {
  item: AudioItem;
  isSelected: boolean;
  onDelete: () => void;
}

export const AudioPlayerWidget: React.FC<AudioPlayerWidgetProps> = ({
  item,
  isSelected,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      style={{
        padding: '10px 14px',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
        boxShadow: isSelected ? '0 4px 16px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: 340,
        userSelect: 'none',
      }}
    >
      {item.audioUrl && (
        <audio
          ref={audioRef}
          src={item.audioUrl}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: 'none',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      {/* Info & Progress */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mic size={13} color="#dc2626" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
            {item.filename || 'Audio Recording'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <input
            type="range"
            min={0}
            max={item.duration || 60}
            value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            style={{ flex: 1, accentColor: '#3b82f6', height: 4 }}
          />
          <span style={{ fontSize: 11, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(currentTime)} / {formatTime(item.duration || 0)}
          </span>
        </div>
      </div>

      {isSelected && (
        <button
          onClick={onDelete}
          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
          title="Delete Recording"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
};
