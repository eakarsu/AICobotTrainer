import React, { useEffect, useState } from 'react';
import api from '../../api';

const EMPTY = { module_name: '', lesson_title: '', lesson_body: '', difficulty: 'beginner', duration_minutes: 10 };

export default function SkillCurriculumEditor() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/custom-views/curriculum');
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.module_name.trim() || !form.lesson_title.trim()) {
      setError('module_name and lesson_title are required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/custom-views/curriculum/${editingId}`, form);
      } else {
        await api.post('/custom-views/curriculum', form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({
      module_name: item.module_name,
      lesson_title: item.lesson_title,
      lesson_body: item.lesson_body,
      difficulty: item.difficulty,
      duration_minutes: item.duration_minutes,
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this lesson?')) return;
    setBusy(true);
    try {
      await api.delete(`/custom-views/curriculum/${id}`);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const modules = data?.modules || [];

  return (
    <div data-testid="skill-curriculum-editor" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Skill Curriculum Editor</h3>
          <div style={styles.sub}>
            {data ? `${data.total_modules} modules • ${data.total_lessons} lessons` : ' '}
          </div>
        </div>
      </div>

      {error && <div style={styles.err}>{error}</div>}

      <form onSubmit={submit} style={styles.form}>
        <div style={styles.formRow}>
          <input
            placeholder="Module name"
            value={form.module_name}
            onChange={(e) => setForm({ ...form, module_name: e.target.value })}
            style={styles.input}
          />
          <input
            placeholder="Lesson title"
            value={form.lesson_title}
            onChange={(e) => setForm({ ...form, lesson_title: e.target.value })}
            style={styles.input}
          />
        </div>
        <textarea
          placeholder="Lesson body / training notes"
          value={form.lesson_body}
          onChange={(e) => setForm({ ...form, lesson_body: e.target.value })}
          rows={2}
          style={{ ...styles.input, width: '100%', resize: 'vertical' }}
        />
        <div style={styles.formRow}>
          <select
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            style={styles.input}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input
            type="number"
            min={1}
            placeholder="Duration (min)"
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            style={styles.input}
          />
          <button type="submit" disabled={busy} style={styles.btnPrimary}>
            {editingId ? 'Update' : 'Add Lesson'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={styles.btnGhost}>Cancel</button>
          )}
        </div>
      </form>

      {loading && <div style={styles.muted}>Loading...</div>}

      {!loading && modules.length === 0 && <div style={styles.muted}>No lessons yet.</div>}

      {!loading && modules.map((m) => (
        <div key={m.module_name} style={styles.module}>
          <div style={styles.moduleHeader}>{m.module_name} <span style={styles.moduleCount}>({m.lessons.length})</span></div>
          {m.lessons.map((l) => (
            <div key={l.id} style={styles.lesson}>
              <div style={styles.lessonMain}>
                <div style={styles.lessonTitle}>{l.lesson_title}</div>
                <div style={styles.lessonMeta}>
                  {l.difficulty} • {l.duration_minutes} min
                </div>
                {l.lesson_body && <div style={styles.lessonBody}>{l.lesson_body}</div>}
              </div>
              <div style={styles.lessonActions}>
                <button onClick={() => edit(l)} style={styles.btnSmall}>Edit</button>
                <button onClick={() => remove(l.id)} style={styles.btnSmallDanger}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  form: { background: '#16171f', border: '1px solid #2e2f3e', borderRadius: 8, padding: 12, marginBottom: 12 },
  formRow: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 120, background: '#0f1015', border: '1px solid #2e2f3e', color: '#e4e4e7', borderRadius: 6, padding: '6px 10px', fontSize: 12 },
  btnPrimary: { background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnGhost: { background: 'transparent', color: '#a1a1aa', border: '1px solid #2e2f3e', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  btnSmall: { background: '#374151', color: '#e4e4e7', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' },
  btnSmallDanger: { background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' },
  module: { background: '#16171f', border: '1px solid #2e2f3e', borderRadius: 8, padding: 10, marginBottom: 10 },
  moduleHeader: { color: '#a5b4fc', fontSize: 13, fontWeight: 600, marginBottom: 8 },
  moduleCount: { color: '#71717a', fontWeight: 400, fontSize: 11 },
  lesson: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: 8, borderTop: '1px solid #2e2f3e' },
  lessonMain: { flex: 1 },
  lessonTitle: { color: '#e4e4e7', fontSize: 12, fontWeight: 500 },
  lessonMeta: { color: '#71717a', fontSize: 10, marginTop: 2 },
  lessonBody: { color: '#a1a1aa', fontSize: 11, marginTop: 4 },
  lessonActions: { display: 'flex', gap: 6, alignItems: 'flex-start' },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  muted: { color: '#71717a', fontSize: 13 },
};
