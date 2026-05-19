import React, { useEffect, useState } from 'react';
import api from '../../api';

function masteryColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function SkillMasteryProgress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/custom-views/skill-mastery-progress');
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load skill mastery progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cobots = data?.cobots || [];

  return (
    <div data-testid="skill-mastery-progress" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Skill Mastery Progress</h3>
          <div style={styles.sub}>
            {data
              ? `${data.total_cobots} cobots • fleet avg mastery ${data.fleet_avg_mastery}/100`
              : ' '}
          </div>
        </div>
        <button onClick={load} style={styles.btn}>Refresh</button>
      </div>

      {error && <div style={styles.err}>{error}</div>}
      {loading && <div style={styles.muted}>Loading...</div>}

      {!loading && cobots.length === 0 && <div style={styles.muted}>No cobots yet.</div>}

      {!loading && cobots.length > 0 && (
        <div style={styles.list}>
          {cobots.map((c) => (
            <div key={c.cobot_id} style={styles.row}>
              <div style={styles.rowHead}>
                <div style={styles.cobotName} title={c.cobot_name}>
                  #{c.cobot_id} {c.cobot_name}
                </div>
                <div style={styles.skillTag}>{c.skill_type || 'general'}</div>
                <div style={{ ...styles.score, color: masteryColor(c.mastery_score) }}>
                  {c.mastery_score}
                </div>
              </div>
              <div style={styles.barBg}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${c.mastery_score}%`,
                    background: masteryColor(c.mastery_score),
                  }}
                />
              </div>
              <div style={styles.meta}>
                {c.passed_demos}/{c.total_demos} demos passed • {c.avg_waypoints} avg waypoints
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  btn: { background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: { background: '#16171f', border: '1px solid #2e2f3e', borderRadius: 8, padding: 10 },
  rowHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  cobotName: { color: '#e4e4e7', fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  skillTag: { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 10, padding: '2px 6px', borderRadius: 4 },
  score: { fontSize: 16, fontWeight: 700, minWidth: 36, textAlign: 'right' },
  barBg: { background: '#2e2f3e', height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', transition: 'width 0.3s' },
  meta: { color: '#71717a', fontSize: 11, marginTop: 6 },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  muted: { color: '#71717a', fontSize: 13 },
};
