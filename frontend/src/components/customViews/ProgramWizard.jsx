import React, { useState } from 'react';
import api from '../../api';

const STEPS = ['Program Basics', 'Operational Details', 'First Task Sequence', 'Review & Submit'];
const TYPES = ['general', 'pick_and_place', 'welding', 'assembly', 'painting', 'inspection', 'palletizing', 'polishing', 'dispensing'];
const STATUSES = ['draft', 'active', 'testing', 'archived'];

export default function ProgramWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'general',
    status: 'draft',
    first_sequence_name: '',
    first_sequence_priority: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/custom-views/program-wizard', form);
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Wizard failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setError('');
    setForm({ name: '', description: '', type: 'general', status: 'draft', first_sequence_name: '', first_sequence_priority: 1 });
  };

  return (
    <div data-testid="program-wizard" style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Training Program Wizard</h3>
        <div style={styles.sub}>Guided multi-step program creation</div>
      </div>

      <div style={styles.steps}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ ...styles.step, ...(i === step ? styles.stepActive : (i < step ? styles.stepDone : {})) }}>
            <span style={styles.stepNum}>{i + 1}</span>
            <span style={styles.stepLabel}>{label}</span>
          </div>
        ))}
      </div>

      {error && <div style={styles.err}>{error}</div>}

      {result ? (
        <div style={styles.success}>
          <div style={styles.successTitle}>Program created</div>
          <div style={styles.successBody}>
            Program <strong>#{result.program?.id} {result.program?.name}</strong>
            {result.sequence && (
              <> with seed sequence <strong>#{result.sequence.id} {result.sequence.name}</strong></>
            )}.
          </div>
          <button onClick={reset} style={styles.btnPrimary}>Create another</button>
        </div>
      ) : (
        <>
          {step === 0 && (
            <div style={styles.body}>
              <Field label="Program Name" required value={form.name} onChange={set('name')} placeholder="e.g. Pallet stacking v2" />
              <Field label="Description" textarea value={form.description} onChange={set('description')} placeholder="What does this program do?" />
            </div>
          )}
          {step === 1 && (
            <div style={styles.body}>
              <Select label="Type" value={form.type} onChange={set('type')} options={TYPES} />
              <Select label="Initial status" value={form.status} onChange={set('status')} options={STATUSES} />
            </div>
          )}
          {step === 2 && (
            <div style={styles.body}>
              <Field label="First Sequence Name (optional)" value={form.first_sequence_name} onChange={set('first_sequence_name')} placeholder="e.g. Approach + grip" />
              <Field label="Priority" type="number" value={form.first_sequence_priority} onChange={set('first_sequence_priority')} />
            </div>
          )}
          {step === 3 && (
            <div style={styles.body}>
              <ReviewRow k="Name" v={form.name} />
              <ReviewRow k="Description" v={form.description || '(none)'} />
              <ReviewRow k="Type" v={form.type} />
              <ReviewRow k="Status" v={form.status} />
              <ReviewRow k="First sequence" v={form.first_sequence_name || '(none)'} />
              <ReviewRow k="Priority" v={form.first_sequence_priority} />
            </div>
          )}

          <div style={styles.actions}>
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={styles.btnSecondary}>Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canNext()} style={styles.btnPrimary}>Next</button>
            ) : (
              <button onClick={submit} disabled={submitting} style={styles.btnPrimary}>
                {submitting ? 'Submitting...' : 'Create Program'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, textarea, type = 'text', placeholder }) {
  return (
    <div style={styles.field}>
      <label style={styles.lbl}>{label}{required ? ' *' : ''}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} rows={3} style={styles.input} placeholder={placeholder} />
        : <input type={type} value={value} onChange={onChange} style={styles.input} placeholder={placeholder} />
      }
    </div>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <div style={styles.field}>
      <label style={styles.lbl}>{label}</label>
      <select value={value} onChange={onChange} style={styles.input}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function ReviewRow({ k, v }) {
  return (
    <div style={styles.reviewRow}>
      <div style={styles.reviewK}>{k}</div>
      <div style={styles.reviewV}>{String(v)}</div>
    </div>
  );
}

const styles = {
  card: { background: '#1e1f29', border: '1px solid #2e2f3e', borderRadius: 10, padding: 20, marginBottom: 16 },
  header: { marginBottom: 16 },
  title: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, margin: 0 },
  sub: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  steps: { display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  step: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: '#16171f', color: '#71717a', fontSize: 12, border: '1px solid #2e2f3e' },
  stepActive: { background: 'rgba(99,102,241,0.18)', color: '#e4e4e7', border: '1px solid rgba(99,102,241,0.4)' },
  stepDone: { background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' },
  stepNum: { fontWeight: 700 },
  stepLabel: { fontSize: 12 },
  body: { marginBottom: 14 },
  field: { marginBottom: 12 },
  lbl: { display: 'block', marginBottom: 6, fontSize: 13, color: '#a1a1aa' },
  input: { width: '100%', padding: 10, background: '#16171f', border: '1px solid #2e2f3e', borderRadius: 6, color: '#e4e4e7', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  btnPrimary: { padding: '8px 18px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { padding: '8px 18px', background: '#1e1f29', color: '#e4e4e7', border: '1px solid #2e2f3e', borderRadius: 6, cursor: 'pointer' },
  err: { background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13 },
  success: { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 16 },
  successTitle: { color: '#86efac', fontWeight: 600, marginBottom: 6 },
  successBody: { color: '#e4e4e7', fontSize: 14, marginBottom: 12 },
  reviewRow: { display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px dashed #2e2f3e' },
  reviewK: { color: '#a1a1aa', fontSize: 12, width: 140 },
  reviewV: { color: '#e4e4e7', fontSize: 13, flex: 1 },
};
