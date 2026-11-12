import React from 'react';
import { Activity, X, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          width: 560,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Activity color="#3b82f6" />
            M0 De-risking Spike: Stylus & Pointer Event Monitor
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 }}>
          Measures real-time hardware stylus latency (pen-down to render delta via PointerEvents API),
          pressure sensitivity, and coalesced event batches per SPEC §12 M0. Target acceptance: ≤ 25 ms p95 latency.
        </p>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatBox label="Samples" value={count.toString()} />
          <StatBox label="p50 Latency" value={`${p50.toFixed(1)} ms`} />
          <StatBox
            label="p95 Latency"
            value={`${p95.toFixed(1)} ms`}
            highlight={p95 > 25 ? '#ef4444' : '#16a34a'}
          />
          <StatBox label="Max Latency" value={`${max.toFixed(1)} ms`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Stylus Pen Events</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
              {penCount} / {count} ({count > 0 ? Math.round((penCount / count) * 100) : 0}%)
            </div>
          </div>
          <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Avg Coalesced Events/Frame</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
              {avgCoalesced} events
            </div>
          </div>
        </div>

        {/* Gate Status */}
        <div
          style={{
            padding: 12,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor:
              passesGate === true
                ? '#f0fdf4'
                : passesGate === false
                ? '#fef2f2'
                : '#f8fafc',
            border:
              passesGate === true
                ? '1px solid #bbf7d0'
                : passesGate === false
                ? '1px solid #fecaca'
                : '1px solid #e2e8f0',
          }}
        >
          {passesGate === true ? (
            <CheckCircle color="#16a34a" size={20} />
          ) : passesGate === false ? (
            <AlertCircle color="#dc2626" size={20} />
          ) : (
            <Activity color="#94a3b8" size={20} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
              {passesGate === true
                ? 'M0 Latency Acceptance Gate: PASSED'
                : passesGate === false
                ? 'M0 Latency Acceptance Gate: FAILED (p95 > 25ms)'
                : 'M0 Latency Status: Draw with Pen to measure'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Measured p95: {p95.toFixed(1)} ms (Threshold: ≤ 25 ms)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClear}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Clear Samples
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
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
      padding: '10px 12px',
      backgroundColor: '#f8fafc',
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: highlight || '#0f172a',
        marginTop: 2,
      }}
    >
      {value}
    </div>
  </div>
);
