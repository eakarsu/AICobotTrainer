import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', user_id: '' });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications');
      setItems(Array.isArray(res.data) ? res.data : (res.data.notifications || res.data.items || []));
      try {
        const c = await api.get('/notifications/unread-count');
        setUnread(c.data.count || c.data.unread || 0);
      } catch (_) {}
    } catch (e) { setError('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/notifications', form); setShowForm(false); setForm({ title: '', message: '', type: 'info', user_id: '' }); load(); }
    catch (err) { setError(err.response?.data?.error || 'Save failed'); }
  };

  const markRead = async (id) => { try { await api.put(`/notifications/${id}/read`); load(); } catch (e) { setError('Failed'); } };
  const markAllRead = async () => { try { await api.post('/notifications/mark-all-read'); load(); } catch (e) { setError('Failed'); } };
  const remove = async (id) => { if (!window.confirm('Delete?')) return; try { await api.delete(`/notifications/${id}`); load(); } catch (e) { setError('Failed'); } };

  return (
    <div style={{ color: '#e4e4e7' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🔔 Notifications</h1>
      <p style={{ color: '#a1a1aa', marginBottom: 20 }}>{unread} unread</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={markAllRead} style={btnSecondary}>Mark all read</button>
        <button onClick={() => setShowForm(s => !s)} style={btnPrimary}>{showForm ? 'Cancel' : '+ New Notification'}</button>
      </div>

      {error && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <form onSubmit={create} style={card}>
          <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
          <Field label="Message" value={form.message} onChange={v => setForm({ ...form, message: v })} required textarea />
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={input}>
              <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option>
            </select>
          </div>
          <Field label="User ID (optional)" value={form.user_id} onChange={v => setForm({ ...form, user_id: v })} />
          <button type="submit" style={btnPrimary}>Create</button>
        </form>
      )}

      {loading ? <div>Loading...</div> : (
        <div style={{ ...card, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#1e1f29' }}><Th>Title</Th><Th>Message</Th><Th>Type</Th><Th>Status</Th><Th>Created</Th><Th></Th></tr></thead>
            <tbody>
              {items.map(n => (
                <tr key={n.id} style={{ borderTop: '1px solid #2e2f3e' }}>
                  <Td><strong>{n.title}</strong></Td>
                  <Td>{n.message}</Td>
                  <Td>{n.type || 'info'}</Td>
                  <Td>{n.read || n.is_read ? 'read' : 'unread'}</Td>
                  <Td>{n.created_at ? new Date(n.created_at).toLocaleString() : '-'}</Td>
                  <Td>
                    {!(n.read || n.is_read) && <button onClick={() => markRead(n.id)} style={btnSm}>Read</button>}{' '}
                    <button onClick={() => remove(n.id)} style={btnDanger}>Delete</button>
                  </Td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#71717a' }}>No notifications</td></tr>}
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
const btnSecondary = { padding: '8px 16px', background: '#1e1f29', color: '#e4e4e7', border: '1px solid #2e2f3e', borderRadius: 6, cursor: 'pointer' };
const btnSm = { padding: '4px 10px', background: '#1e1f29', color: '#e4e4e7', border: '1px solid #2e2f3e', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const btnDanger = { ...btnSm, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' };

function Th({ children }) { return <th style={{ padding: 12, textAlign: 'left', color: '#a1a1aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{children}</th>; }
function Td({ children }) { return <td style={{ padding: 12, fontSize: 13 }}>{children}</td>; }
function Field({ label, value, onChange, required, textarea }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} required={required} rows={3} style={input} />
        : <input value={value} onChange={e => onChange(e.target.value)} required={required} style={input} />
      }
    </div>
  );
}
