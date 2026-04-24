import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { features } from '../features';
import AIResponseDisplay from '../components/AIResponseDisplay';

export default function FeaturePage() {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const feature = features.find(f => f.key === featureKey);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiGenerate, setShowAiGenerate] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!feature) return;
    try {
      setLoading(true);
      const res = await api.get(`${feature.api}${search ? `?search=${search}` : ''}`);
      setItems(res.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [feature, search]);

  useEffect(() => {
    setSelected(null);
    setShowForm(false);
    setEditItem(null);
    setAiResult(null);
    setShowAiGenerate(false);
    fetchItems();
  }, [featureKey, fetchItems]);

  if (!feature) {
    return <div style={{ padding: 40, color: '#ef4444' }}>Feature not found</div>;
  }

  const handleNew = () => {
    const initial = {};
    feature.fields.forEach(f => {
      if (f.type === 'json') initial[f.name] = '';
      else if (f.type === 'boolean') initial[f.name] = true;
      else if (f.type === 'number') initial[f.name] = '';
      else initial[f.name] = '';
    });
    setFormData(initial);
    setEditItem(null);
    setShowForm(true);
    setSelected(null);
  };

  const handleEdit = (item) => {
    const data = {};
    feature.fields.forEach(f => {
      if (f.type === 'json') {
        data[f.name] = typeof item[f.name] === 'object' ? JSON.stringify(item[f.name], null, 2) : (item[f.name] || '');
      } else {
        data[f.name] = item[f.name] ?? '';
      }
    });
    setFormData(data);
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`${feature.api}/${id}`);
      setSelected(null);
      fetchItems();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      feature.fields.forEach(f => {
        if (f.type === 'json' && typeof payload[f.name] === 'string' && payload[f.name]) {
          try { payload[f.name] = JSON.parse(payload[f.name]); } catch {}
        }
        if (f.type === 'number' && payload[f.name] !== '') {
          payload[f.name] = Number(payload[f.name]);
        }
      });

      if (editItem) {
        await api.put(`${feature.api}/${editItem.id}`, payload);
      } else {
        await api.post(feature.api, payload);
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAiGenerate = async (id) => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const res = await api.post(`${feature.api}/${id}/generate`);
      setAiResult(res.data.ai_response);
      if (res.data.item) {
        setSelected(res.data.item);
        fetchItems();
      }
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiGenerateNew = async () => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const res = await api.post(`${feature.api}/generate-new`, { description: aiPrompt });
      setAiResult(res.data.ai_response);
      setShowAiGenerate(false);
      setAiPrompt('');
      fetchItems();
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const truncate = (str, len = 60) => {
    const s = String(str || '');
    return s.length > len ? s.substring(0, len) + '...' : s;
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
          <div style={{ ...styles.featureIcon, background: `${feature.color}20` }}>{feature.icon}</div>
          <div>
            <h1 style={styles.title}>
              {feature.name}
              {feature.isAI && <span style={styles.aiBadge}>AI Powered</span>}
            </h1>
            <p style={styles.subtitle}>{feature.description}</p>
          </div>
        </div>
        <div style={styles.headerActions}>
          {feature.isAI && (
            <button onClick={() => { setShowAiGenerate(true); setShowForm(false); setSelected(null); }} style={styles.aiBtn}>
              ✨ AI Generate New
            </button>
          )}
          <button onClick={handleNew} style={styles.newBtn}>+ New Item</button>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder={`Search ${feature.name.toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchItems()}
          style={styles.searchInput}
        />
        <button onClick={fetchItems} style={styles.searchBtn}>Search</button>
      </div>

      <div style={styles.content}>
        {/* Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{feature.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>No items found</div>
              <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>Create a new item to get started</div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  {feature.columns.map(col => (
                    <th key={col} style={styles.th}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
                  ))}
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      ...styles.tr,
                      ...(selected?.id === item.id ? styles.trSelected : {}),
                    }}
                    onClick={() => { setSelected(item); setShowForm(false); setShowAiGenerate(false); setAiResult(null); }}
                  >
                    <td style={styles.td}>{idx + 1}</td>
                    {feature.columns.map(col => (
                      <td key={col} style={styles.td}>{truncate(formatValue(item[col]))}</td>
                    ))}
                    <td style={styles.td}>
                      <div style={styles.rowActions}>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} style={styles.editRowBtn}>Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={styles.deleteRowBtn}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && !showForm && !showAiGenerate && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>Item Details</h3>
              <button onClick={() => setSelected(null)} style={styles.closeBtn}>×</button>
            </div>
            <div style={styles.detailBody}>
              {Object.entries(selected).map(([key, value]) => {
                if (key === 'id' || key === 'created_at' || key === 'updated_at') {
                  return (
                    <div key={key} style={styles.detailField}>
                      <div style={styles.detailLabel}>{key.replace(/_/g, ' ').toUpperCase()}</div>
                      <div style={styles.detailValue}>{key === 'id' ? value : new Date(value).toLocaleString()}</div>
                    </div>
                  );
                }
                const isJsonField = typeof value === 'object' && value !== null;
                return (
                  <div key={key} style={styles.detailField}>
                    <div style={styles.detailLabel}>{key.replace(/_/g, ' ').toUpperCase()}</div>
                    {isJsonField ? (
                      <AIResponseDisplay data={value} />
                    ) : (
                      <div style={styles.detailValue}>{formatValue(value)}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={styles.detailActions}>
              <button onClick={() => handleEdit(selected)} style={styles.editBtn}>Edit</button>
              {feature.isAI && (
                <button
                  onClick={() => handleAiGenerate(selected.id)}
                  disabled={aiLoading}
                  style={styles.generateBtn}
                >
                  {aiLoading ? '⏳ Generating...' : '✨ Run AI Analysis'}
                </button>
              )}
              <button onClick={() => handleDelete(selected.id)} style={styles.deleteBtnDetail}>Delete</button>
            </div>
            {aiResult && (
              <div style={styles.aiResultSection}>
                <h4 style={styles.aiResultTitle}>
                  <span style={styles.aiResultDot} />
                  AI Analysis Result
                </h4>
                <AIResponseDisplay data={aiResult} />
              </div>
            )}
          </div>
        )}

        {/* AI Generate New Panel */}
        {showAiGenerate && feature.isAI && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>✨ AI Generate New Item</h3>
              <button onClick={() => setShowAiGenerate(false)} style={styles.closeBtn}>×</button>
            </div>
            <div style={styles.detailBody}>
              <div style={styles.aiPromptSection}>
                <label style={styles.fieldLabel}>{feature.aiPromptLabel || 'Describe what you need'}</label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Enter your description..."
                  style={styles.aiPromptInput}
                  rows={4}
                />
                <button
                  onClick={handleAiGenerateNew}
                  disabled={aiLoading || !aiPrompt.trim()}
                  style={styles.generateFullBtn}
                >
                  {aiLoading ? '⏳ AI is generating...' : '✨ Generate with AI'}
                </button>
              </div>
            </div>
            {aiResult && (
              <div style={styles.aiResultSection}>
                <h4 style={styles.aiResultTitle}>
                  <span style={styles.aiResultDot} />
                  AI Generated Result
                </h4>
                <AIResponseDisplay data={aiResult} />
              </div>
            )}
          </div>
        )}

        {/* Form Panel */}
        {showForm && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>{editItem ? 'Edit Item' : 'New Item'}</h3>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.detailBody}>
              {feature.fields.map(f => (
                <div key={f.name} style={styles.formField}>
                  <label style={styles.fieldLabel}>
                    {f.label}
                    {f.required && <span style={{ color: '#ef4444' }}> *</span>}
                  </label>
                  {f.type === 'textarea' || f.type === 'json' ? (
                    <textarea
                      value={formData[f.name] || ''}
                      onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                      placeholder={f.type === 'json' ? '{"key": "value"}' : ''}
                      style={styles.formTextarea}
                      rows={f.type === 'json' ? 4 : 3}
                      required={f.required}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      value={formData[f.name] || ''}
                      onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                      style={styles.formInput}
                    >
                      <option value="">Select...</option>
                      {f.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : f.type === 'boolean' ? (
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData[f.name] === true || formData[f.name] === 'true'}
                        onChange={e => setFormData({ ...formData, [f.name]: e.target.checked })}
                      />
                      <span style={{ marginLeft: 8 }}>Enabled</span>
                    </label>
                  ) : (
                    <input
                      type={f.type}
                      value={formData[f.name] || ''}
                      onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                      style={styles.formInput}
                      required={f.required}
                    />
                  )}
                </div>
              ))}
              <div style={styles.formActions}>
                <button type="submit" style={styles.saveBtn}>
                  {editItem ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} style={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  backBtn: {
    background: 'transparent',
    color: '#a1a1aa',
    border: '1px solid #2e2f3e',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
    marginRight: 4,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#e4e4e7',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: { fontSize: 13, color: '#71717a', marginTop: 2 },
  aiBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: 'white',
    padding: '3px 8px',
    borderRadius: 5,
  },
  headerActions: { display: 'flex', gap: 10 },
  newBtn: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
  },
  aiBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
  },
  searchBar: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    background: '#21222d',
    border: '1px solid #2e2f3e',
    borderRadius: 10,
    padding: '10px 16px',
    color: '#e4e4e7',
    fontSize: 14,
  },
  searchBtn: {
    background: '#21222d',
    color: '#a1a1aa',
    border: '1px solid #2e2f3e',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
  },
  content: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  tableContainer: {
    flex: 1,
    background: '#21222d',
    borderRadius: 14,
    border: '1px solid #2e2f3e',
    overflow: 'hidden',
    minHeight: 300,
  },
  loadingState: {
    padding: 60,
    textAlign: 'center',
    color: '#71717a',
    fontSize: 15,
  },
  emptyState: {
    padding: 60,
    textAlign: 'center',
    color: '#a1a1aa',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #2e2f3e',
    background: '#1a1b23',
  },
  tr: {
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid #2a2b35',
  },
  trSelected: {
    background: 'rgba(99,102,241,0.1)',
  },
  td: {
    padding: '11px 16px',
    fontSize: 13,
    color: '#d4d4d8',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowActions: { display: 'flex', gap: 6 },
  editRowBtn: {
    background: 'rgba(99,102,241,0.15)',
    color: '#818cf8',
    border: 'none',
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
  },
  deleteRowBtn: {
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: 'none',
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
  },
  detailPanel: {
    width: 440,
    minWidth: 440,
    background: '#21222d',
    borderRadius: 14,
    border: '1px solid #2e2f3e',
    overflow: 'hidden',
    maxHeight: 'calc(100vh - 160px)',
    overflowY: 'auto',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #2e2f3e',
    background: '#1a1b23',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  detailTitle: { fontSize: 15, fontWeight: 600, color: '#e4e4e7' },
  closeBtn: {
    background: 'none',
    color: '#71717a',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    lineHeight: 1,
  },
  detailBody: { padding: '16px 20px' },
  detailField: { marginBottom: 14 },
  detailLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#71717a',
    letterSpacing: '0.5px',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#d4d4d8',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
  detailActions: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid #2e2f3e',
    flexWrap: 'wrap',
  },
  editBtn: {
    background: 'rgba(99,102,241,0.15)',
    color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
  },
  generateBtn: {
    background: 'linear-gradient(135deg, #8b5cf620, #ec489920)',
    color: '#c084fc',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
  },
  deleteBtnDetail: {
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    marginLeft: 'auto',
  },
  aiResultSection: {
    padding: '16px 20px',
    borderTop: '1px solid #2e2f3e',
  },
  aiResultTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#c084fc',
    marginBottom: 12,
  },
  aiResultDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#c084fc',
    boxShadow: '0 0 10px #c084fc',
  },
  formField: { marginBottom: 14 },
  fieldLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#a1a1aa',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  formInput: {
    width: '100%',
    background: '#1a1b23',
    border: '1px solid #2e2f3e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: 14,
  },
  formTextarea: {
    width: '100%',
    background: '#1a1b23',
    border: '1px solid #2e2f3e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: 13,
    fontFamily: 'monospace',
    resize: 'vertical',
    minHeight: 70,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#d4d4d8',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: 10,
    marginTop: 18,
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
  },
  cancelBtn: {
    background: '#1a1b23',
    color: '#a1a1aa',
    border: '1px solid #2e2f3e',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
  },
  aiPromptSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  aiPromptInput: {
    width: '100%',
    background: '#1a1b23',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 10,
    padding: '14px 16px',
    color: '#e4e4e7',
    fontSize: 14,
    resize: 'vertical',
    minHeight: 100,
  },
  generateFullBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
