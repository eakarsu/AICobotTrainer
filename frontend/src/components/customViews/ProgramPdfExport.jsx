import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function ProgramPdfExport() {
  const [programs, setPrograms] = useState([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/programs');
        const list = Array.isArray(res.data) ? res.data : (res.data.programs || []);
        setPrograms(list);
        if (list.length > 0) setSelected(list[0].id);
      } catch (e) {
        setError('Failed to load programs');
      }
    })();
  }, []);

  const generate = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/custom-views/program-pdf/${selected}`);
      setReport(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!report?.pdf_text) return;
    const blob = new Blob([report.pdf_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-${report.program?.id || 'export'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="program-pdf-export" style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Training Program PDF Export</h3>
        <div style={styles.sub}>Generate a structured PDF-style training report</div>
      </div>

      {error && <div style={styles.err}>{error}</div>}

      <div style={styles.row}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={styles.select}>
          {programs.length === 0 && <option value="">(no programs)</option>}
          {programs.map((p) => (
            <option key={p.id} value={p.id}>#{p.id} — {p.name}</option>
          ))}
        </select>
        <button onClick={generate} disabled={!selected || loading} style={styles.btnPrimary}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
        <button onClick={download} disabled={!report} style={styles.btnSecondary}>Download .txt</button>
      </div>

      {report && (
        <div style={styles.preview}>
          <div style={styles.meta}>
            Program <strong>{report.program?.name}</strong> · {report.sequences?.length || 0} sequences ·{' '}
            {report.demonstrations?.length || 0} demos · {report.page_count} page(s)
          </div>
          <pre style={styles.pdf}>{report.pdf_text}</pre>
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
  row: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
  select: { background: '#16171f', border: '1px solid #2e2f3e', color: '#e4e4e7', borderRadius: 6, padding: '8px 10px', minWidth: 240 },
  btnPrimary: { padding: '8px 14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { padding: '8px 14px', background: '#1e1f29', color: '#e4e4e7', border: '1px solid #2e2f3e', borderRadius: 6, cursor: 'pointer' },
  preview: { background: '#0f1117', border: '1px solid #2e2f3e', borderRadius: 8, padding: 14 },
  meta: { color: '#a1a1aa', fontSize: 12, marginBottom: 8 },
  pdf: { color: '#e4e4e7', fontSize: 12, fontFamily: 'Menlo, monospace', whiteSpace: 'pre-wrap', margin: 0, maxHeight: 360, overflow: 'auto' },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
};
