import React from 'react';
import { Activity, X, CheckCircle, AlertCircle } from 'lucide-react';
import { appleTheme, appleStyles } from '../theme';

export interface MetricSample {
  latency: number;
  pointerType: string;
  pressure: number;
  coalesced: number;
}

export interface M0LatencyDashboardProps {
  samples: MetricSample[];
  onClose: () => void;
  onClear: () => void;
}

export const M0LatencyDashboard: React.FC<M0LatencyDashboardProps> = ({
  samples,
  onClose,
  onClear,
}) => {
  const latencies = samples.map((s) => s.latency).sort((a, b) => a - b);
  const count = latencies.length;

  const p50 = count > 0 ? latencies[Math.floor(count * 0.5)] : 0;
  const p95 = count > 0 ? latencies[Math.floor(count * 0.95)] : 0;
  const max = count > 0 ? latencies[count - 1] : 0;
  const penCount = samples.filter((s) => s.pointerType === 'pen').length;
  const avgCoalesced =
    count > 0 ? (samples.reduce((acc, s) => acc + s.coalesced, 0) / count).toFixed(1) : '1.0';

  const passesGate = count >= 10 ? p95 <= 25.0 : null;

  return (
    <div style={appleStyles.modalBackdrop}>
      <div
        style={{
          ...appleStyles.modalCard,
          width: 580,
          fontFamily: appleTheme.fonts.sans,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 16, color: appleTheme.colors.labelPrimary }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: appleTheme.colors.accentTint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={16} color={appleTheme.colors.accent} />
            </div>
            <span>Stylus Latency & Pointer Monitor (SPEC §12)</span>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: appleTheme.colors.labelTertiary,
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: appleTheme.transitions.fast,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: appleTheme.colors.labelSecondary, margin: 0, lineHeight: 1.5 }}>
          Measures real-time hardware stylus latency (pen-down to render delta via PointerEvents API),
          pressure sensitivity, and coalesced event batches. Target acceptance: ≤ 25 ms p95 latency.
        </p>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatBox label="Samples" value={count.toString()} />
          <StatBox label="p50 Latency" value={`${p50.toFixed(1)} ms`} />
          <StatBox
            label="p95 Latency"
            value={`${p95.toFixed(1)} ms`}
            highlight={p95 > 25 ? appleTheme.colors.destructive : appleTheme.colors.success}
          />
          <StatBox label="Max Latency" value={`${max.toFixed(1)} ms`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <div style={{ padding: '12px 14px', backgroundColor: appleTheme.colors.bgSubtle, borderRadius: appleTheme.radii.md, border: `1px solid ${appleTheme.colors.borderSubtle}` }}>
            <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary }}>Stylus Pen Events</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: appleTheme.colors.labelPrimary, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {penCount} / {count} ({count > 0 ? Math.round((penCount / count) * 100) : 0}%)
            </div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: appleTheme.colors.bgSubtle, borderRadius: appleTheme.radii.md, border: `1px solid ${appleTheme.colors.borderSubtle}` }}>
            <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary }}>Avg Coalesced Events/Frame</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: appleTheme.colors.labelPrimary, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {avgCoalesced} events
            </div>
          </div>
        </div>

        {/* Gate Status */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: appleTheme.radii.md,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor:
              passesGate === true
                ? appleTheme.colors.successTint
                : passesGate === false
                ? appleTheme.colors.destructiveTint
                : appleTheme.colors.bgSubtle,
            border:
              passesGate === true
                ? `1px solid ${appleTheme.colors.borderSubtle}`
                : passesGate === false
                ? `1px solid ${appleTheme.colors.destructiveTintHover}`
                : `1px solid ${appleTheme.colors.borderSubtle}`,
          }}
        >
          {passesGate === true ? (
            <CheckCircle color={appleTheme.colors.success} size={22} style={{ flexShrink: 0 }} />
          ) : passesGate === false ? (
            <AlertCircle color={appleTheme.colors.destructive} size={22} style={{ flexShrink: 0 }} />
          ) : (
            <Activity color={appleTheme.colors.labelTertiary} size={22} style={{ flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: appleTheme.colors.labelPrimary }}>
              {passesGate === true
                ? 'M0 Latency Acceptance Gate: PASSED'
                : passesGate === false
                ? 'M0 Latency Acceptance Gate: FAILED (p95 > 25ms)'
                : 'M0 Latency Status: Draw with Pen to measure'}
            </div>
            <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary, marginTop: 2 }}>
              Measured p95: {p95.toFixed(1)} ms (SPEC Threshold: ≤ 25 ms)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClear} style={appleStyles.secondaryButton()}>
            Clear Samples
          </button>
          <button onClick={onClose} style={appleStyles.primaryButton()}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) => (
  <div
    style={{
      padding: '12px 14px',
      backgroundColor: appleTheme.colors.bgSubtle,
      borderRadius: appleTheme.radii.md,
      border: `1px solid ${appleTheme.colors.borderSubtle}`,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 11, color: appleTheme.colors.labelSecondary }}>{label}</div>
    <div
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: highlight || appleTheme.colors.labelPrimary,
        marginTop: 2,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </div>
  </div>
);
