import React, { useState, useRef } from 'react';
import type { AudioItem } from '@inkpage/format';
import { Play, Pause, Volume2, Mic, Trash2 } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

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
        padding: '12px 16px',
        backgroundColor: appleTheme.colors.glassBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: appleTheme.radii.lg,
        border: isSelected ? `1.5px solid ${appleTheme.colors.accent}` : `1px solid ${appleTheme.colors.borderSubtle}`,
        boxShadow: isSelected ? appleTheme.shadows.card : appleTheme.shadows.subtle,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: 360,
        userSelect: 'none',
        fontFamily: appleTheme.fonts.sans,
        transition: appleTheme.transitions.fast,
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

      {/* Play/Pause Button (Apple Blue Circle) */}
      <button
        onClick={togglePlay}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: appleTheme.colors.accent,
          border: 'none',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: appleTheme.shadows.control,
          transition: appleTheme.transitions.fast,
          flexShrink: 0,
        }}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
      </button>

      {/* Info & Progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mic size={13} color={appleTheme.colors.destructive} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: appleTheme.colors.labelPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
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
            style={{ flex: 1, accentColor: appleTheme.colors.accent, height: 4, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: appleTheme.colors.labelSecondary, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {formatTime(currentTime)} / {formatTime(item.duration || 0)}
          </span>
        </div>
      </div>

      {isSelected && (
        <button
          onClick={onDelete}
          style={{
            border: 'none',
            background: 'none',
            color: appleTheme.colors.labelTertiary,
            cursor: 'pointer',
            padding: 4,
            borderRadius: appleTheme.radii.xs,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: appleTheme.transitions.fast,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = appleTheme.colors.destructive)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = appleTheme.colors.labelTertiary)}
          title="Delete Recording"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
};
