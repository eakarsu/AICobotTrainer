import React, { useEffect, useState } from 'react';
import api from '../../api';

function cellColor(score) {
  if (score >= 80) return 'rgba(34,197,94,0.85)';
  if (score >= 60) return 'rgba(59,130,246,0.75)';
  if (score >= 40) return 'rgba(245,158,11,0.75)';
  if (score > 0) return 'rgba(239,68,68,0.75)';
  return '#2e2f3e';
}

export default function SensorCalibrationHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/custom-views/sensor-calibration-heatmap');
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load sensor calibration heatmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sensors = data?.sensors || [];
  const stations = data?.stations || [];
  const grid = data?.grid || [];

  return (
    <div data-testid="sensor-calibration-heatmap" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Sensor Calibration Heatmap</h3>
          <div style={styles.sub}>
            {data
              ? `${sensors.length} sensors × ${stations.length} stations • fleet calibration ${data.fleet_avg_calibration}/100`
              : ' '}
          </div>
        </div>
        <button onClick={load} style={styles.btn}>Refresh</button>
      </div>

      {error && <div style={styles.err}>{error}</div>}
      {loading && <div style={styles.muted}>Loading...</div>}

      {!loading && grid.length > 0 && stations.length > 0 && (
        <div style={styles.scrollWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sensor \\ Station</th>
                {stations.map((s) => (
                  <th key={s.id} style={styles.th} title={`${s.name} (${s.status})`}>
                    {s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name}
                  </th>
                ))}
                <th style={styles.th}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.sensor}>
                  <td style={styles.thRow}>{row.sensor}</td>
                  {row.cells.map((cell) => (
                    <td
                      key={`${row.sensor}-${cell.station_id}`}
                      style={{
                        ...styles.cell,
                        background: cellColor(cell.calibration_score),
                      }}
                      title={`${row.sensor} × ${cell.station_name}: ${cell.calibration_score}`}
                    >
                      {cell.calibration_score}
                    </td>
                  ))}
                  <td style={styles.avg}>{row.avg_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.legend}>
        <span style={styles.legendItem}><span style={{ ...styles.dot, background: 'rgba(34,197,94,0.85)' }} /> 80-100</span>
        <span style={styles.legendItem}><span style={{ ...styles.dot, background: 'rgba(59,130,246,0.75)' }} /> 60-79</span>
        <span style={styles.legendItem}><span style={{ ...styles.dot, background: 'rgba(245,158,11,0.75)' }} /> 40-59</span>
        <span style={styles.legendItem}><span style={{ ...styles.dot, background: 'rgba(239,68,68,0.75)' }} /> &lt;40</span>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  btn: { background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  scrollWrap: { overflowX: 'auto' },
  table: { borderCollapse: 'collapse', minWidth: '100%' },
  th: { color: '#71717a', fontSize: 10, fontWeight: 600, padding: 6, textAlign: 'center', borderBottom: '1px solid #2e2f3e' },
  thRow: { color: '#e4e4e7', fontSize: 11, fontWeight: 600, padding: 6, textAlign: 'left', whiteSpace: 'nowrap' },
  cell: { padding: 8, textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 4, minWidth: 36 },
  avg: { color: '#a1a1aa', fontSize: 11, fontWeight: 600, padding: 6, textAlign: 'center' },
  legend: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: 11 },
  dot: { display: 'inline-block', width: 10, height: 10, borderRadius: 2 },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  muted: { color: '#71717a', fontSize: 13 },
};
