import React, { useEffect, useState } from 'react';
import api from '../../api';

const STATUS_COLORS = {
  recorded: '#6366f1',
  validated: '#22c55e',
  processing: '#f59e0b',
  ready: '#3b82f6',
  archived: '#71717a',
};

export default function TrainingTimeline() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (d) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/custom-views/training-timeline?days=${d}`);
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load training timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const tl = data?.timeline || [];
  const maxTotal = tl.reduce((m, d) => Math.max(m, d.total), 0) || 1;
  const statuses = Array.from(new Set(tl.flatMap(d => Object.keys(d.byStatus)))).sort();

  return (
    <div data-testid="training-timeline" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Training Session Timeline</h3>
          <div style={styles.sub}>
            {data ? `${data.total_sessions} sessions • ${Math.round((data.total_seconds || 0) / 60)} min over ${data.window_days} days` : ' '}
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} style={styles.select}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <div style={styles.err}>{error}</div>}
      {loading && <div style={styles.muted}>Loading...</div>}

      {!loading && tl.length === 0 && <div style={styles.muted}>No training sessions in window.</div>}

      {!loading && tl.length > 0 && (
        <>
          <div style={styles.chart}>
            {tl.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.total} sessions`} style={styles.col}>
                <div style={styles.stack}>
                  {statuses.map((s) => {
                    const v = d.byStatus[s] || 0;
                    if (v === 0) return null;
                    const h = Math.round((v / maxTotal) * 150);
                    return (
                      <div
                        key={s}
                        style={{
                          ...styles.bar,
                          height: h,
                          background: STATUS_COLORS[s] || '#8b5cf6',
                        }}
                      />
                    );
                  })}
                </div>
                <div style={styles.day}>{d.day.slice(5)}</div>
              </div>
            ))}
          </div>
          <div style={styles.legend}>
            {statuses.map((s) => (
              <div key={s} style={styles.legendItem}>
                <span style={{ ...styles.dot, background: STATUS_COLORS[s] || '#8b5cf6' }} />
                {s}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  select: { background: '#16171f', border: '1px solid #2e2f3e', color: '#e4e4e7', borderRadius: 6, padding: '6px 10px' },
  chart: { display: 'flex', alignItems: 'flex-end', gap: 4, padding: '8px 0', minHeight: 180, overflowX: 'auto' },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 22 },
  stack: { display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-start', height: 150 },
  bar: { width: 18, borderRadius: '3px 3px 0 0' },
  day: { color: '#71717a', fontSize: 9, marginTop: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' },
  legend: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: 12 },
  dot: { display: 'inline-block', width: 10, height: 10, borderRadius: 2 },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  muted: { color: '#71717a', fontSize: 13 },
};
