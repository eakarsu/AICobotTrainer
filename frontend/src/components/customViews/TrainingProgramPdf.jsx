import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function TrainingProgramPdf() {
  const [programs, setPrograms] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPrograms = async () => {
    try {
      const res = await api.get('/programs');
      const list = res.data?.data || res.data || [];
      setPrograms(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0 && !selectedId) {
        setSelectedId(String(list[0].id));
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load programs');
    }
  };

  const loadPdf = async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/custom-views/training-program-pdf/${id}`);
      setPdf(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to generate training program PDF');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPrograms(); }, []);
  useEffect(() => { if (selectedId) loadPdf(selectedId); }, [selectedId]);

  const downloadTxt = () => {
    if (!pdf?.pdf_text) return;
    const blob = new Blob([pdf.pdf_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-program-${selectedId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="training-program-pdf" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Training Program PDF</h3>
          <div style={styles.sub}>
            {pdf
              ? `${pdf.page_count} page(s) • generated ${new Date(pdf.generated_at).toLocaleString()}`
              : ' '}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={styles.select}>
            <option value="">Select program...</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>#{p.id} {p.name}</option>
            ))}
          </select>
          <button onClick={downloadTxt} disabled={!pdf} style={styles.btn}>Download</button>
        </div>
      </div>

      {error && <div style={styles.err}>{error}</div>}
      {loading && <div style={styles.muted}>Generating...</div>}

      {!loading && pdf && (
        <pre style={styles.preview}>{pdf.pdf_text}</pre>
      )}
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10, flexWrap: 'wrap' },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  select: { background: '#16171f', border: '1px solid #2e2f3e', color: '#e4e4e7', borderRadius: 6, padding: '6px 10px', maxWidth: 220 },
  btn: { background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  preview: {
    background: '#0f1015',
    color: '#cbd5e1',
    border: '1px solid #2e2f3e',
    borderRadius: 6,
    padding: 12,
    fontSize: 11,
    lineHeight: 1.4,
    maxHeight: 360,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
  },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  muted: { color: '#71717a', fontSize: 13 },
};
