import React, { useEffect, useState } from 'react';
import api from '../../api';

function cellColor(count, max) {
  if (count === 0) return '#16171f';
  const ratio = max === 0 ? 0 : count / max;
  // interpolate indigo→pink heat
  const h = 250 - Math.round(ratio * 100);
  const l = 28 + Math.round(ratio * 30);
  return `hsl(${h}, 70%, ${l}%)`;
}

export default function TaskSuccessHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/custom-views/task-success-heatmap');
        if (alive) setData(res.data);
      } catch (e) {
        if (alive) setError(e?.response?.data?.error || 'Failed to load heatmap');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const outcomes = data?.outcomes || [];
  const grid = data?.grid || [];
  const max = grid.reduce((m, row) => {
    return outcomes.reduce((mm, o) => Math.max(mm, row.cells[o] || 0), m);
  }, 0);

  return (
    <div data-testid="task-success-heatmap" style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Task Success Heatmap</h3>
        <div style={styles.sub}>Demonstrations per program × outcome</div>
      </div>

      {error && <div style={styles.err}>{error}</div>}
      {loading && <div style={styles.muted}>Loading...</div>}

      {!loading && grid.length === 0 && <div style={styles.muted}>No programs yet.</div>}

      {!loading && grid.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Program</th>
                {outcomes.map((o) => (
                  <th key={o} style={styles.th}>{o}</th>
                ))}
                <th style={styles.th}>Success</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.program_id}>
                  <td style={styles.tdName} title={row.program_type || ''}>{row.program_name}</td>
                  {outcomes.map((o) => {
                    const v = row.cells[o] || 0;
                    return (
                      <td key={o} style={{ ...styles.tdCell, background: cellColor(v, max) }}>
                        {v > 0 ? v : ''}
                      </td>
                    );
                  })}
                  <td style={styles.tdSuccess}>{Math.round((row.success_ratio || 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { marginBottom: 12 },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 2 },
  th: { color: '#a1a1aa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '6px 8px', textAlign: 'left' },
  tdName: { color: '#e4e4e7', fontSize: 12, padding: '6px 8px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdCell: { color: '#e4e4e7', fontSize: 12, padding: '8px 10px', textAlign: 'center', borderRadius: 4, minWidth: 42 },
  tdSuccess: { color: '#22c55e', fontSize: 12, padding: '6px 10px', fontWeight: 600 },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  muted: { color: '#71717a', fontSize: 13 },
};
