/**
 * Advanced AI routes — proposed NEW custom non-CRUD features for AICobotTrainer.
 *
 * Endpoints:
 *  POST /api/ai-advanced/motion-replay/:id          — produce 3D playback frames + URDF export
 *  POST /api/ai-advanced/task-batch                 — queue many sequences for AI optimisation
 *  POST /api/ai-advanced/safety-boundary-auto      — auto-generate safety zones from cell+robot specs
 *  POST /api/ai-advanced/predictive-schedule       — prioritised maintenance schedule
 *  POST /api/ai-advanced/cross-model-plan          — adapt one motion plan across robot models
 *  POST /api/ai-advanced/quality-checkpoint-design — auto-design inspection waypoints from product spec
 *  POST /api/ai-advanced/nl-program-debug          — generate program, simulate, predict failures
 *  POST /api/ai-advanced/agentic-program-generator — synthesise demonstrations into a task sequence (apply4)
 *  POST /api/ai-advanced/failure-root-cause        — root-cause analysis for an anomaly record (apply4)
 *  POST /api/ai-advanced/cycle-time-estimator      — estimate cycle time of a sequence + bottlenecks (apply4)
 *  POST /api/ai-advanced/operator-training-brief   — generate operator training brief for a program (apply4)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/rateLimiter');
const { callOpenRouter } = require('../utils/openrouter');

// Apply pass 4: 503 short-circuit when OPENROUTER_API_KEY is unset/placeholder.
function requireAiKey(req, res) {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k || /^your[-_].*key[-_]here$/i.test(k) || /^(sk-)?your-/i.test(k) || k.length < 20) {
    res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY is not configured.' });
    return false;
  }
  return true;
}

// 3-strategy JSON parser
function parseAIJson(text) {
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (e) {}
  const stripped = text
    .replace(/```(?:json)?\n?/g, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (e) {}
  }
  return null;
}

/**
 * POST /api/ai-advanced/motion-replay/:id
 * Body: { fps?: number = 30, export_urdf?: boolean = true }
 * Re-emit the AI-generated path as time-indexed playback frames + URDF skeleton.
 */
router.post('/motion-replay/:id', auth, async (req, res) => {
  try {
    const { fps = 30, export_urdf = true } = req.body || {};
    const sane_fps = Math.min(120, Math.max(1, parseInt(fps) || 30));

    const r = await db.query('SELECT * FROM ai_motion_planning WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Motion plan not found.' });

    const plan = r.rows[0];
    const path = plan.ai_generated_path?.path_points || plan.ai_generated_path?.path || [];
    const totalDistance = plan.ai_generated_path?.total_distance_mm || 0;
    const estTime = plan.ai_generated_path?.estimated_time_seconds || Math.max(1, totalDistance / 250);

    // Build playback frames by linear interpolation through waypoints
    const totalFrames = Math.max(2, Math.ceil(estTime * sane_fps));
    const frames = [];
    if (path.length >= 2) {
      for (let f = 0; f < totalFrames; f++) {
        const t = f / (totalFrames - 1);
        const segIndex = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
        const segT = (t * (path.length - 1)) - segIndex;
        const a = path[segIndex];
        const b = path[segIndex + 1];
        const lerp = (k) =>
          a[k] !== undefined && b[k] !== undefined ? a[k] + (b[k] - a[k]) * segT : (a[k] ?? 0);
        frames.push({
          frame: f,
          time_s: Number((f / sane_fps).toFixed(3)),
          x: lerp('x'),
          y: lerp('y'),
          z: lerp('z'),
          rx: lerp('rx'),
          ry: lerp('ry'),
          rz: lerp('rz'),
        });
      }
    }

    let urdf = null;
    if (export_urdf) {
      urdf = `<?xml version="1.0"?>\n<robot name="cobot_${plan.id}">\n  <link name="base_link"/>\n  <joint name="fixed_base" type="fixed">\n    <parent link="base_link"/>\n    <child link="tcp_link"/>\n    <origin xyz="${plan.start_point?.x || 0} ${plan.start_point?.y || 0} ${plan.start_point?.z || 0}" rpy="0 0 0"/>\n  </joint>\n  <link name="tcp_link"/>\n  <!-- waypoints encoded as comments, total ${path.length} points -->\n${path
        .map(
          (p, i) =>
            `  <!-- wp${i}: ${p.x ?? 0} ${p.y ?? 0} ${p.z ?? 0} rpy ${p.rx ?? 0} ${p.ry ?? 0} ${p.rz ?? 0} -->`
        )
        .join('\n')}\n</robot>\n`;
    }

    res.json({
      id: plan.id,
      name: plan.name,
      fps: sane_fps,
      total_frames: frames.length,
      estimated_duration_s: estTime,
      waypoints: path.length,
      frames,
      urdf,
    });
  } catch (err) {
    console.error('motion-replay error:', err);
    res.status(500).json({ error: 'Replay generation failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/task-batch
 * Body: { task_ids: number[], optimization_type? }
 * Queue many task sequences for AI optimisation. Each runs sequentially through callOpenRouter.
 */
router.post('/task-batch', auth, aiRateLimiter, async (req, res) => {
  try {
    const { task_ids, optimization_type = 'time' } = req.body || {};
    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return res.status(400).json({ error: 'task_ids (non-empty array) is required.' });
    }
    const cap = task_ids.slice(0, 25);

    const results = [];
    for (const id of cap) {
      const r = await db.query('SELECT * FROM ai_task_optimization WHERE id = $1', [id]);
      if (r.rows.length === 0) {
        results.push({ id, status: 'not_found' });
        continue;
      }
      const opt = r.rows[0];
      try {
        const ai = await callOpenRouter(
          'You optimise robot task sequences for ' +
            optimization_type +
            '. Respond with valid JSON only, no markdown.',
          `Optimise this sequence: ${JSON.stringify(opt.original_sequence)}.\nReturn JSON: { "optimized_sequence": [{step,task,duration_s}], "improvement_percentage": number, "bottlenecks": [string], "notes": string }`
        );
        const parsed = parseAIJson(ai) || { raw: ai };
        const updated = await db.query(
          'UPDATE ai_task_optimization SET ai_optimized_sequence=$1, improvement_percentage=$2, optimization_type=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, improvement_percentage, optimization_type',
          [
            JSON.stringify(parsed),
            parsed.improvement_percentage || opt.improvement_percentage || 10,
            optimization_type,
            id,
          ]
        );
        results.push({ id, status: 'optimised', summary: updated.rows[0] });
      } catch (e) {
        results.push({ id, status: 'failed', error: e.message });
      }
    }

    const ok = results.filter((r) => r.status === 'optimised').length;
    res.json({
      requested: task_ids.length,
      processed: cap.length,
      successful: ok,
      failed: cap.length - ok,
      results,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Batch optimisation failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/safety-boundary-auto
 * Body: { cell_id?, robot_dimensions: {reach_mm, base_x, base_y, ...}, workspace_limits: {min,max} }
 * AI auto-generates safety zones (restricted/warning/collaborative) from spec.
 */
router.post('/safety-boundary-auto', auth, aiRateLimiter, async (req, res) => {
  try {
    const { cell_id, robot_dimensions, workspace_limits } = req.body || {};
    if (!robot_dimensions || typeof robot_dimensions !== 'object') {
      return res.status(400).json({ error: 'robot_dimensions (object) is required.' });
    }
    if (!workspace_limits || typeof workspace_limits !== 'object') {
      return res.status(400).json({ error: 'workspace_limits (object) is required.' });
    }

    let cell = null;
    if (cell_id) {
      const r = await db.query('SELECT * FROM work_cells WHERE id = $1', [cell_id]);
      if (r.rows.length > 0) cell = r.rows[0];
    }

    const ai = await callOpenRouter(
      'You generate ISO 10218 / TS 15066 compliant safety boundaries for collaborative robots. Respond with valid JSON only.',
      `Generate safety zones.\nRobot: ${JSON.stringify(robot_dimensions)}\nWorkspace limits: ${JSON.stringify(workspace_limits)}\nCell: ${cell ? JSON.stringify({ name: cell.name, model: cell.robot_model, max_reach_mm: cell.max_reach_mm }) : 'none'}\nReturn JSON: { "boundaries": [ { "name": string, "zone_type": "restricted|warning|collaborative|exclusion|reduced_speed", "coordinates": { "min": {x,y,z}, "max": {x,y,z} }, "max_speed_mm_s": number, "max_force_n": number, "rationale": string } ], "iso_compliance_summary": string, "validation_notes": string }`
    );
    const parsed = parseAIJson(ai) || { raw: ai, boundaries: [] };

    // Auto-persist generated boundaries (flagged inactive — operator must review)
    const persisted = [];
    if (Array.isArray(parsed.boundaries)) {
      for (const b of parsed.boundaries) {
        try {
          const ins = await db.query(
            'INSERT INTO safety_boundaries (name, zone_type, coordinates, max_speed, max_force, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, zone_type, is_active',
            [
              b.name || 'AI Generated Zone',
              b.zone_type || 'warning',
              JSON.stringify(b.coordinates || {}),
              b.max_speed_mm_s ?? null,
              b.max_force_n ?? null,
              false, // require manual activation
            ]
          );
          persisted.push(ins.rows[0]);
        } catch (e) {
          /* ignore single-row failures */
        }
      }
    }

    res.json({
      generated: parsed,
      persisted_inactive: persisted,
      cell: cell ? { id: cell.id, name: cell.name } : null,
      note: 'Generated boundaries are persisted as inactive — review and enable before production use.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Safety boundary auto-gen failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/predictive-schedule
 * Body: { component_filter?, confidence_threshold?: number = 0.7 }
 * Build a prioritised maintenance schedule from predictive maintenance records.
 */
router.post('/predictive-schedule', auth, aiRateLimiter, async (req, res) => {
  try {
    const { component_filter, confidence_threshold = 0.7 } = req.body || {};
    const params = [];
    let where = '';
    if (component_filter) {
      params.push(`%${component_filter}%`);
      where = `WHERE component ILIKE $${params.length}`;
    }
    const r = await db.query(
      `SELECT * FROM ai_predictive_maintenance ${where} ORDER BY next_maintenance_date ASC NULLS LAST LIMIT 100`,
      params
    );

    const items = r.rows.map((row) => {
      const pred = row.ai_prediction || {};
      const failureRisk = parseFloat(pred.failure_risk) || 0;
      const remainingPct = parseFloat(pred.remaining_life_percent);
      const priority =
        failureRisk >= 0.7 || (remainingPct !== undefined && remainingPct < 15)
          ? 'urgent'
          : failureRisk >= 0.4 || (remainingPct !== undefined && remainingPct < 35)
          ? 'high'
          : failureRisk >= 0.2
          ? 'medium'
          : 'low';
      return {
        id: row.id,
        component: row.component,
        operational_hours: row.operational_hours,
        next_maintenance_date: row.next_maintenance_date,
        failure_risk: failureRisk,
        remaining_life_percent: remainingPct,
        wear_level: pred.wear_level,
        priority,
        meets_confidence: failureRisk >= confidence_threshold,
      };
    });

    items.sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority] || (b.failure_risk - a.failure_risk);
    });

    const ai = await callOpenRouter(
      'You build practical, cost-aware predictive-maintenance schedules for industrial robots. Respond with valid JSON only.',
      `Given these predicted-wear records, propose a 30-day schedule grouping similar components and minimising downtime.\n\nRecords: ${JSON.stringify(items.slice(0, 20))}\n\nReturn JSON: { "schedule": [ { "week": number, "actions": [ { "component_ids": [number], "action": string, "estimated_downtime_hours": number, "spare_parts": [string] } ] } ], "downtime_summary": string, "cost_optimisation_notes": string }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };

    res.json({
      items,
      counts: {
        urgent: items.filter((i) => i.priority === 'urgent').length,
        high: items.filter((i) => i.priority === 'high').length,
        medium: items.filter((i) => i.priority === 'medium').length,
        low: items.filter((i) => i.priority === 'low').length,
      },
      ai_schedule: parsed,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Predictive scheduling failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/cross-model-plan
 * Body: { motion_plan_id, target_models: string[] }
 * Adapt a motion plan across multiple robot models; suggest best-fit.
 */
router.post('/cross-model-plan', auth, aiRateLimiter, async (req, res) => {
  try {
    const { motion_plan_id, target_models } = req.body || {};
    if (!motion_plan_id) return res.status(400).json({ error: 'motion_plan_id is required.' });
    if (!Array.isArray(target_models) || target_models.length === 0) {
      return res.status(400).json({ error: 'target_models (non-empty array) is required.' });
    }

    const r = await db.query('SELECT * FROM ai_motion_planning WHERE id = $1', [motion_plan_id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Motion plan not found.' });
    const plan = r.rows[0];

    const ai = await callOpenRouter(
      'You adapt robot motion plans across vendors (ABB, FANUC, KUKA, UR, Doosan) accounting for kinematics, reach, and payload. Respond with valid JSON only.',
      `Adapt this motion plan to each model and rank fit.\n\nOriginal start=${JSON.stringify(plan.start_point)} end=${JSON.stringify(plan.end_point)} constraints=${JSON.stringify(plan.constraints)} score=${plan.optimization_score}\n\nTargets: ${JSON.stringify(target_models)}\n\nReturn JSON: { "adaptations": [ { "model": string, "feasibility": "high|medium|low|infeasible", "reach_check": string, "payload_check": string, "modified_constraints": object, "fit_score": number, "notes": string } ], "best_fit": string, "reasoning": string }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };

    res.json({
      motion_plan_id,
      models_evaluated: target_models.length,
      adaptation: parsed,
    });
  } catch (err) {
    res.status(500).json({ error: 'Cross-model adaptation failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/quality-checkpoint-design
 * Body: { product_spec, program_id? }
 * Auto-design quality checkpoints + waypoints + checklist from a product spec.
 */
router.post('/quality-checkpoint-design', auth, aiRateLimiter, async (req, res) => {
  try {
    const { product_spec, program_id } = req.body || {};
    if (!product_spec || typeof product_spec !== 'string' || product_spec.length < 20) {
      return res.status(400).json({
        error: 'product_spec (string, min 20 chars) is required.',
      });
    }

    const ai = await callOpenRouter(
      'You design robot inspection waypoints and quality checkpoints for industrial QA. Respond with valid JSON only.',
      `Design checkpoints for this product:\n\n${product_spec}\n\nReturn JSON: { "checkpoints": [ { "name": string, "inspection_type": "visual|dimensional|force|torque|surface", "tolerance": number, "measurement_unit": string, "pass_criteria": string } ], "waypoints": [ { "name": string, "x": number, "y": number, "z": number, "rx": number, "ry": number, "rz": number, "speed": number } ], "checklist": [string] }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };

    // Persist checkpoints + waypoints when present
    const createdCheckpoints = [];
    if (Array.isArray(parsed.checkpoints)) {
      for (const c of parsed.checkpoints) {
        try {
          const ins = await db.query(
            'INSERT INTO quality_checkpoints (name, inspection_type, tolerance, measurement_unit, pass_criteria, program_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name',
            [
              c.name || 'AI Checkpoint',
              c.inspection_type || 'visual',
              c.tolerance ?? 0.05,
              c.measurement_unit || 'mm',
              c.pass_criteria || '',
              program_id || null,
            ]
          );
          createdCheckpoints.push(ins.rows[0]);
        } catch (e) {
          /* keep going */
        }
      }
    }
    const createdWaypoints = [];
    if (Array.isArray(parsed.waypoints)) {
      for (const w of parsed.waypoints) {
        try {
          const ins = await db.query(
            'INSERT INTO waypoints (name, x, y, z, rx, ry, rz, speed, program_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name',
            [
              w.name || 'AI Waypoint',
              w.x ?? 0,
              w.y ?? 0,
              w.z ?? 0,
              w.rx ?? 0,
              w.ry ?? 0,
              w.rz ?? 0,
              w.speed ?? 100,
              program_id || null,
            ]
          );
          createdWaypoints.push(ins.rows[0]);
        } catch (e) {}
      }
    }

    res.json({
      design: parsed,
      persisted: {
        checkpoints: createdCheckpoints,
        waypoints: createdWaypoints,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Checkpoint design failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/nl-program-debug
 * Body: { intent: string }
 * Generate NL→program, simulate execution, predict failures, suggest fixes.
 */
router.post('/nl-program-debug', auth, aiRateLimiter, async (req, res) => {
  try {
    const { intent } = req.body || {};
    if (!intent || typeof intent !== 'string' || intent.length < 5) {
      return res.status(400).json({ error: 'intent (string, min 5 chars) is required.' });
    }

    const ai = await callOpenRouter(
      'You generate cobot programs from natural language, simulate execution, predict failures, and suggest fixes. Respond with valid JSON only.',
      `Intent: "${intent}"\n\nReturn JSON: { "program_code": string, "explanation": string, "simulated_execution": [ { "step": number, "action": string, "expected_state": object, "duration_ms": number } ], "predicted_failures": [ { "failure_mode": string, "likelihood": "high|medium|low", "consequence": string, "fix_suggestion": string } ], "preflight_checklist": [string], "estimated_cycle_time_s": number, "confidence_score": number }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };

    // Optionally persist as an NL programming record
    let persisted = null;
    try {
      const ins = await db.query(
        'INSERT INTO ai_nl_programming (name, natural_language_input, ai_generated_code, ai_explanation) VALUES ($1,$2,$3,$4) RETURNING id, name',
        [
          intent.slice(0, 80),
          intent,
          parsed.program_code || '',
          parsed.explanation || '',
        ]
      );
      persisted = ins.rows[0];
    } catch (e) {
      /* non-fatal */
    }

    res.json({
      intent,
      analysis: parsed,
      persisted,
    });
  } catch (err) {
    res.status(500).json({ error: 'NL program debug failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/agentic-program-generator
 * Body: { demonstration_ids: number[], program_name?, goal? }
 * Synthesise a task sequence from one or more recorded demonstrations.
 */
router.post('/agentic-program-generator', auth, aiRateLimiter, async (req, res) => {
  if (!requireAiKey(req, res)) return;
  try {
    const { demonstration_ids, program_name, goal } = req.body || {};
    if (!Array.isArray(demonstration_ids) || demonstration_ids.length === 0) {
      return res.status(400).json({ error: 'demonstration_ids (non-empty array) is required.' });
    }
    let demos = [];
    try {
      const r = await db.query(
        'SELECT id, name, duration_seconds, waypoint_count, status, recording_data FROM demonstrations WHERE id = ANY($1::int[])',
        [demonstration_ids]
      );
      demos = r.rows;
    } catch (e) {
      demos = [];
    }
    const ai = await callOpenRouter(
      'You synthesise robot task sequences from demonstration recordings. Respond with valid JSON only.',
      `Goal: ${goal || 'compose an executable task sequence from the demonstrations'}\n\nDemonstrations: ${JSON.stringify(demos).slice(0, 6000)}\n\nReturn JSON: { "program_name": string, "steps": [ { "order": number, "action": string, "params": object, "estimated_duration_s": number, "source_demo_id": number } ], "preconditions": [string], "validation_checks": [string], "estimated_total_seconds": number, "confidence": number }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };
    let persisted = null;
    try {
      const ins = await db.query(
        'INSERT INTO task_sequences (name, priority, status, steps) VALUES ($1,$2,$3,$4) RETURNING id, name',
        [
          parsed.program_name || program_name || 'AI-Generated Sequence',
          1,
          'draft',
          JSON.stringify(parsed.steps || []),
        ]
      );
      persisted = ins.rows[0];
    } catch (e) { /* non-fatal */ }
    res.json({ generated: parsed, persisted, demos_used: demos.length });
  } catch (err) {
    res.status(500).json({ error: 'Agentic program generation failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/failure-root-cause
 * Body: { anomaly_id: number }
 * Produce a root-cause analysis for a previously recorded anomaly.
 */
router.post('/failure-root-cause', auth, aiRateLimiter, async (req, res) => {
  if (!requireAiKey(req, res)) return;
  try {
    const { anomaly_id } = req.body || {};
    if (!anomaly_id) return res.status(400).json({ error: 'anomaly_id is required.' });
    let anomaly = null;
    try {
      const r = await db.query('SELECT * FROM ai_anomaly_detection WHERE id = $1', [anomaly_id]);
      anomaly = r.rows[0] || null;
    } catch (e) { /* table may not exist */ }
    if (!anomaly) return res.status(404).json({ error: 'Anomaly not found.' });
    const ai = await callOpenRouter(
      'You perform root-cause analysis for industrial robot anomalies. Respond with valid JSON only.',
      `Anomaly: ${JSON.stringify(anomaly).slice(0, 6000)}\n\nReturn JSON: { "ranked_causes": [ { "cause": string, "likelihood": "high|medium|low", "evidence": string, "category": "mechanical|electrical|software|environmental|operator" } ], "remediation_plan": [ { "step": number, "action": string, "owner": string, "estimated_minutes": number } ], "preventive_measures": [string], "ttl_recommendation_hours": number, "confidence": number }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };
    res.json({ anomaly_id, analysis: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failure RCA failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/cycle-time-estimator
 * Body: { sequence_id: number } OR { steps: object[] }
 * Estimate cycle time and identify bottlenecks for a task sequence.
 */
router.post('/cycle-time-estimator', auth, aiRateLimiter, async (req, res) => {
  if (!requireAiKey(req, res)) return;
  try {
    const { sequence_id, steps } = req.body || {};
    let seqSteps = Array.isArray(steps) ? steps : null;
    let sequence_name = null;
    if (!seqSteps && sequence_id) {
      try {
        const r = await db.query('SELECT id, name, steps FROM task_sequences WHERE id = $1', [sequence_id]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Sequence not found.' });
        sequence_name = r.rows[0].name;
        const raw = r.rows[0].steps;
        seqSteps = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch (e) { return []; } })() : (raw || []);
      } catch (e) { /* DB optional */ }
    }
    if (!seqSteps || seqSteps.length === 0) {
      return res.status(400).json({ error: 'Provide steps[] or a valid sequence_id.' });
    }
    const ai = await callOpenRouter(
      'You estimate cobot task cycle times and surface bottlenecks. Respond with valid JSON only.',
      `Sequence ${sequence_name || ''}\nSteps: ${JSON.stringify(seqSteps).slice(0, 6000)}\n\nReturn JSON: { "estimated_cycle_time_s": number, "per_step": [ { "order": number, "action": string, "estimated_s": number, "is_bottleneck": boolean, "reason": string } ], "bottlenecks": [ { "order": number, "saving_potential_s": number, "suggestion": string } ], "throughput_per_hour": number, "assumptions": [string] }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };
    res.json({ sequence_id: sequence_id || null, estimate: parsed, steps_count: seqSteps.length });
  } catch (err) {
    res.status(500).json({ error: 'Cycle-time estimate failed: ' + err.message });
  }
});

/**
 * POST /api/ai-advanced/operator-training-brief
 * Body: { program_id: number, audience?: 'novice'|'intermediate'|'expert' }
 * Generate a printable operator training brief for a program.
 */
router.post('/operator-training-brief', auth, aiRateLimiter, async (req, res) => {
  if (!requireAiKey(req, res)) return;
  try {
    const { program_id, audience = 'intermediate' } = req.body || {};
    if (!program_id) return res.status(400).json({ error: 'program_id is required.' });
    let program = null;
    try {
      const r = await db.query('SELECT * FROM programs WHERE id = $1', [program_id]);
      program = r.rows[0] || null;
    } catch (e) { /* table optional */ }
    if (!program) return res.status(404).json({ error: 'Program not found.' });
    let safety = [];
    try {
      const s = await db.query('SELECT name, zone_type, max_speed, max_force FROM safety_boundaries WHERE is_active = true LIMIT 20');
      safety = s.rows;
    } catch (e) { /* optional */ }
    const ai = await callOpenRouter(
      'You write robot operator training briefs. Respond with valid JSON only.',
      `Audience: ${audience}\nProgram: ${JSON.stringify(program).slice(0, 4000)}\nActive safety boundaries: ${JSON.stringify(safety).slice(0, 2000)}\n\nReturn JSON: { "title": string, "audience": string, "duration_minutes": number, "learning_objectives": [string], "prerequisites": [string], "modules": [ { "module": string, "summary": string, "key_points": [string], "hands_on_drill": string, "estimated_minutes": number } ], "safety_callouts": [string], "knowledge_check": [ { "question": string, "answer": string } ], "sign_off_checklist": [string] }`
    );
    const parsed = parseAIJson(ai) || { raw: ai };
    res.json({ program_id, brief: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Operator training brief failed: ' + err.message });
  }
});

module.exports = router;
