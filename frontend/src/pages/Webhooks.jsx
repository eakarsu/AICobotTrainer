import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Webhooks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: '', active: true });
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/webhooks');
      setItems(Array.isArray(res.data) ? res.data : (res.data.webhooks || res.data.items || []));
    } catch (e) { setError('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    const body = { ...form, events: form.events.split(',').map(s => s.trim()).filter(Boolean) };
    try { await api.post('/webhooks', body); setShowForm(false); setForm({ name: '', url: '', events: '', active: true }); load(); }
    catch (err) { setError(err.response?.data?.error || 'Save failed'); }
  };

  const remove = async (id) => { if (!window.confirm('Delete?')) return; try { await api.delete(`/webhooks/${id}`); load(); } catch (e) { setError('Failed'); } };

  const testDeliver = async (id) => {
    setTestResult(null);
    try { const res = await api.post(`/webhooks/${id}/test`, { event: 'test', payload: { hello: 'world' } }); setTestResult({ id, ok: true, data: res.data }); }
    catch (err) { setTestResult({ id, ok: false, data: err.response?.data || { error: err.message } }); }
  };

  return (
    <div style={{ color: '#e4e4e7' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🪝 Webhooks</h1>
      <p style={{ color: '#a1a1aa', marginBottom: 20 }}>Outbound webhook registry</p>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowForm(s => !s)} style={btnPrimary}>{showForm ? 'Cancel' : '+ New Webhook'}</button>
      </div>

      {error && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <form onSubmit={create} style={card}>
          <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <Field label="URL" value={form.url} onChange={v => setForm({ ...form, url: v })} required placeholder="https://..." />
          <Field label="Events (comma-separated)" value={form.events} onChange={v => setForm({ ...form, events: v })} placeholder="boundary.breach" />
          <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active
          </label>
          <button type="submit" style={btnPrimary}>Create</button>
        </form>
      )}

      {testResult && (
        <div style={{ ...card, background: testResult.ok ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)' }}>
          <strong>Test #{testResult.id}: {testResult.ok ? 'OK' : 'Failed'}</strong>
          <pre style={{ overflow: 'auto', fontSize: 12, marginTop: 8 }}>{JSON.stringify(testResult.data, null, 2)}</pre>
        </div>
      )}

      {loading ? <div>Loading...</div> : (
        <div style={{ ...card, padding: 0, maxWidth: 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#1e1f29' }}><Th>Name</Th><Th>URL</Th><Th>Events</Th><Th>Active</Th><Th></Th></tr></thead>
            <tbody>
              {items.map(w => (
                <tr key={w.id} style={{ borderTop: '1px solid #2e2f3e' }}>
                  <Td><strong>{w.name}</strong></Td>
                  <Td><span style={{ display: 'inline-block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</span></Td>
                  <Td>{(w.events || []).join(', ')}</Td>
                  <Td>{w.active ? 'yes' : 'no'}</Td>
                  <Td>
                    <button onClick={() => testDeliver(w.id)} style={btnSm}>Test</button>{' '}
                    <button onClick={() => remove(w.id)} style={btnDanger}>Delete</button>
                  </Td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#71717a' }}>No webhooks</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const card = { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 8, padding: 20, marginBottom: 16, maxWidth: 600 };
const lbl = { display: 'block', marginBottom: 6, fontSize: 13, color: '#a1a1aa' };
const input = { width: '100%', padding: 10, background: '#16171f', border: '1px solid #2e2f3e', borderRadius: 6, color: '#e4e4e7' };
const btnPrimary = { padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 };
const btnSm = { padding: '4px 10px', background: '#1e1f29', color: '#e4e4e7', border: '1px solid #2e2f3e', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnDanger = { ...btnSm, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' };

function Th({ children }) { return <th style={{ padding: 12, textAlign: 'left', color: '#a1a1aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{children}</th>; }
function Td({ children }) { return <td style={{ padding: 12, fontSize: 13 }}>{children}</td>; }
function Field({ label, value, onChange, required, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} style={input} />
    </div>
  );
}
