import React, { useState } from 'react';
import api from '../api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const TOOLS = [
  {
    key: 'motion-replay',
    name: 'Motion Path Replay',
    desc: 'Re-emit AI-generated paths as time-indexed playback frames + URDF skeleton.',
    icon: '\u{1F39E}',
    color: '#8b5cf6',
    fields: [
      { name: 'motion_plan_id', label: 'Motion Plan ID', type: 'number', required: true },
      { name: 'fps', label: 'FPS (default 30)', type: 'number' },
      { name: 'export_urdf', label: 'Export URDF', type: 'select', options: ['true', 'false'] },
    ],
    run: (form) =>
      api.post(`/ai-advanced/motion-replay/${form.motion_plan_id}`, {
        fps: form.fps ? Number(form.fps) : 30,
        export_urdf: form.export_urdf !== 'false',
      }),
  },
  {
    key: 'task-batch',
    name: 'Task Optimisation Batch',
    desc: 'Queue many task sequences for AI optimisation overnight.',
    icon: '\u{1F4E6}',
    color: '#f59e0b',
    fields: [
      { name: 'task_ids', label: 'Task IDs (comma-separated)', type: 'text', required: true },
      {
        name: 'optimization_type',
        label: 'Optimisation Type',
        type: 'select',
        options: ['time', 'energy', 'quality', 'throughput', 'wear'],
      },
    ],
    run: (form) =>
      api.post('/ai-advanced/task-batch', {
        task_ids: String(form.task_ids)
          .split(',')
          .map((s) => Number(s.trim()))
          .filter(Boolean),
        optimization_type: form.optimization_type || 'time',
      }),
  },
  {
    key: 'safety-boundary-auto',
    name: 'Safety Boundary Auto-Generator',
    desc: 'Generate ISO-compliant safety zones from cell + robot specs.',
    icon: '\u{1F6E1}',
    color: '#ef4444',
    fields: [
      { name: 'cell_id', label: 'Cell ID (optional)', type: 'number' },
      {
        name: 'robot_dimensions',
        label: 'Robot Dimensions (JSON)',
        type: 'textarea',
        required: true,
        placeholder: '{ "reach_mm": 850, "base_x": 0, "base_y": 0 }',
      },
      {
        name: 'workspace_limits',
        label: 'Workspace Limits (JSON)',
        type: 'textarea',
        required: true,
        placeholder: '{ "min": {"x":-1000,"y":-1000,"z":0}, "max": {"x":1000,"y":1000,"z":2000} }',
      },
    ],
    run: (form) => {
      let robot, ws;
      try {
        robot = JSON.parse(form.robot_dimensions);
      } catch {
        return Promise.reject(new Error('robot_dimensions must be valid JSON'));
      }
      try {
        ws = JSON.parse(form.workspace_limits);
      } catch {
        return Promise.reject(new Error('workspace_limits must be valid JSON'));
      }
      return api.post('/ai-advanced/safety-boundary-auto', {
        cell_id: form.cell_id ? Number(form.cell_id) : null,
        robot_dimensions: robot,
        workspace_limits: ws,
      });
    },
  },
  {
    key: 'predictive-schedule',
    name: 'Predictive Maintenance Scheduler',
    desc: 'Prioritised 30-day schedule for maintenance.',
    icon: '\u{1F4C5}',
    color: '#22c55e',
    fields: [
      { name: 'component_filter', label: 'Component name filter (optional)', type: 'text' },
      { name: 'confidence_threshold', label: 'Confidence threshold (0-1)', type: 'number' },
    ],
    run: (form) =>
      api.post('/ai-advanced/predictive-schedule', {
        component_filter: form.component_filter || null,
        confidence_threshold: form.confidence_threshold ? Number(form.confidence_threshold) : 0.7,
      }),
  },
  {
    key: 'cross-model-plan',
    name: 'Cross-Model Motion Planner',
    desc: 'Adapt one motion plan across robot models; suggest best-fit.',
    icon: '\u{1F501}',
    color: '#3b82f6',
    fields: [
      { name: 'motion_plan_id', label: 'Motion Plan ID', type: 'number', required: true },
      {
        name: 'target_models',
        label: 'Target Models (comma-separated)',
        type: 'text',
        required: true,
        placeholder: 'UR5e, FANUC CRX-10iA, KUKA LBR iiwa',
      },
    ],
    run: (form) =>
      api.post('/ai-advanced/cross-model-plan', {
        motion_plan_id: Number(form.motion_plan_id),
        target_models: String(form.target_models)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
  },
  {
    key: 'quality-checkpoint-design',
    name: 'Quality Checkpoint Auto-Designer',
    desc: 'Auto-design QA checkpoints + waypoints + checklist from product spec.',
    icon: '\u2705',
    color: '#06b6d4',
    fields: [
      {
        name: 'product_spec',
        label: 'Product Spec',
        type: 'textarea',
        required: true,
        placeholder: 'Aluminum housing 200x150x80mm, requires flatness < 0.05mm and chamfered edges',
      },
      { name: 'program_id', label: 'Program ID (optional)', type: 'number' },
    ],
    run: (form) =>
      api.post('/ai-advanced/quality-checkpoint-design', {
        product_spec: form.product_spec,
        program_id: form.program_id ? Number(form.program_id) : null,
      }),
  },
  {
    key: 'nl-program-debug',
    name: 'NL Program Debugger',
    desc: 'Generate program from intent, simulate, predict failures.',
    icon: '\u{1F41B}',
    color: '#ec4899',
    fields: [
      {
        name: 'intent',
        label: 'Robot Intent (plain English)',
        type: 'textarea',
        required: true,
        placeholder: 'Pick a 2kg part from conveyor A and place it on pallet position B3',
      },
    ],
    run: (form) => api.post('/ai-advanced/nl-program-debug', { intent: form.intent }),
  },
  // Apply pass 4 — mechanical backlog
  {
    key: 'agentic-program-generator',
    name: 'Agentic Program Generator',
    desc: 'Synthesise a task sequence from one or more recorded demonstrations.',
    icon: '\u{1F9E9}',
    color: '#10b981',
    fields: [
      { name: 'demonstration_ids', label: 'Demonstration IDs (comma-separated)', type: 'text', required: true, placeholder: '1,2,3' },
      { name: 'program_name', label: 'Program Name (optional)', type: 'text' },
      { name: 'goal', label: 'Goal / Description', type: 'textarea', placeholder: 'Compose a pick-and-place sequence ready for assembly cell #2' },
    ],
    run: (form) =>
      api.post('/ai-advanced/agentic-program-generator', {
        demonstration_ids: String(form.demonstration_ids || '')
          .split(',')
          .map((s) => Number(s.trim()))
          .filter(Boolean),
        program_name: form.program_name || null,
        goal: form.goal || null,
      }),
  },
  {
    key: 'failure-root-cause',
    name: 'Failure Root-Cause Analyzer',
    desc: 'Rank likely causes for a recorded anomaly with a remediation plan.',
    icon: '\u{1F50D}',
    color: '#f43f5e',
    fields: [
      { name: 'anomaly_id', label: 'Anomaly Detection ID', type: 'number', required: true },
    ],
    run: (form) => api.post('/ai-advanced/failure-root-cause', { anomaly_id: Number(form.anomaly_id) }),
  },
  {
    key: 'cycle-time-estimator',
    name: 'Cycle-Time Estimator',
    desc: 'Estimate cycle time + bottlenecks for a task sequence.',
    icon: '\u{23F1}',
    color: '#0ea5e9',
    fields: [
      { name: 'sequence_id', label: 'Sequence ID (or paste steps below)', type: 'number' },
      { name: 'steps', label: 'Steps (JSON array, optional override)', type: 'textarea', placeholder: '[{"action":"move","x":100,"y":200,"z":50}]' },
    ],
    run: (form) => {
      const body = {};
      if (form.sequence_id) body.sequence_id = Number(form.sequence_id);
      if (form.steps && form.steps.trim()) {
        try { body.steps = JSON.parse(form.steps); }
        catch { return Promise.reject(new Error('steps must be valid JSON')); }
      }
      if (!body.sequence_id && !body.steps) {
        return Promise.reject(new Error('Provide sequence_id or steps.'));
      }
      return api.post('/ai-advanced/cycle-time-estimator', body);
    },
  },
  {
    key: 'operator-training-brief',
    name: 'Operator Training Brief',
    desc: 'Generate a printable operator training brief for a program.',
    icon: '\u{1F393}',
    color: '#a855f7',
    fields: [
      { name: 'program_id', label: 'Program ID', type: 'number', required: true },
      { name: 'audience', label: 'Audience', type: 'select', options: ['novice', 'intermediate', 'expert'] },
    ],
    run: (form) =>
      api.post('/ai-advanced/operator-training-brief', {
        program_id: Number(form.program_id),
        audience: form.audience || 'intermediate',
      }),
  },
];

export default function AIAdvancedPage() {
  const [active, setActive] = useState(TOOLS[0]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await active.run(form);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>AI Advanced Tools</h1>
        <p style={styles.subtitle}>{TOOLS.length} non-CRUD AI workflows</p>
      </div>

      <div style={styles.grid}>
        {TOOLS.map((t) => (
          <div
            key={t.key}
            style={{
              ...styles.card,
              borderColor: active.key === t.key ? t.color : '#2e2f3e',
              boxShadow: active.key === t.key ? `0 8px 25px -5px ${t.color}33` : 'none',
            }}
            onClick={() => {
              setActive(t);
              setForm({});
              setResult(null);
              setError(null);
            }}
          >
            <div style={{ ...styles.cardIcon, background: `${t.color}20` }}>{t.icon}</div>
            <div style={styles.cardTitle}>{t.name}</div>
            <div style={styles.cardDesc}>{t.desc}</div>
          </div>
        ))}
      </div>

      <div style={styles.panel}>
        <h2 style={{ color: '#e4e4e7', marginBottom: 6 }}>
          {active.icon} {active.name}
        </h2>
        <p style={{ color: '#a1a1aa', marginBottom: 16 }}>{active.desc}</p>

        {active.fields.map((f) => (
          <div key={f.name} style={{ marginBottom: 12 }}>
            <label style={styles.label}>
              {f.label}
              {f.required && <span style={{ color: '#ef4444' }}> *</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                value={form[f.name] || ''}
                placeholder={f.placeholder}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                rows={4}
                style={styles.textarea}
              />
            ) : f.type === 'select' ? (
              <select
                value={form[f.name] || ''}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                style={styles.input}
              >
                <option value="">Select…</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={form[f.name] || ''}
                placeholder={f.placeholder}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                style={styles.input}
              />
            )}
          </div>
        ))}

        <button onClick={run} disabled={loading} style={styles.runBtn}>
          {loading ? 'Running...' : 'Run AI Workflow'}
        </button>

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={styles.result}>
            <div style={styles.resultHeader}>AI RESULT</div>
            <AIResponseDisplay data={result} />
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, color: '#e4e4e7' },
  subtitle: { color: '#71717a', fontSize: 13, marginTop: 4 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 14,
    marginBottom: 24,
  },
  card: {
    background: '#21222d',
    borderRadius: 12,
    padding: 18,
    border: '1px solid #2e2f3e',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    marginBottom: 10,
  },
  cardTitle: { color: '#e4e4e7', fontWeight: 600, fontSize: 14, marginBottom: 4 },
  cardDesc: { color: '#71717a', fontSize: 12, lineHeight: 1.5 },
  panel: {
    background: '#21222d',
    borderRadius: 12,
    border: '1px solid #2e2f3e',
    padding: 24,
  },
  label: {
    display: 'block',
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    background: '#1a1b23',
    border: '1px solid #2e2f3e',
    borderRadius: 8,
    color: '#e4e4e7',
    fontSize: 14,
    padding: '10px 14px',
  },
  textarea: {
    width: '100%',
    background: '#1a1b23',
    border: '1px solid #2e2f3e',
    borderRadius: 8,
    color: '#e4e4e7',
    fontSize: 13,
    padding: '10px 14px',
    fontFamily: 'monospace',
  },
  runBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: {
    marginTop: 16,
    padding: 14,
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    borderRadius: 8,
    border: '1px solid rgba(239,68,68,0.3)',
  },
  result: {
    marginTop: 20,
    background: '#1a1b23',
    border: '1px solid #2e2f3e',
    borderRadius: 10,
    padding: 16,
  },
  resultHeader: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 10,
  },
};
