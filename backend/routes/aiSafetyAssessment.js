const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/rateLimiter');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * pageSize;

    let countResult, result;
    if (search) {
      countResult = await db.query('SELECT COUNT(*) FROM ai_safety_assessment WHERE name ILIKE $1', [`%${search}%`]);
      result = await db.query(
        'SELECT * FROM ai_safety_assessment WHERE name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [`%${search}%`, pageSize, offset]
      );
    } else {
      countResult = await db.query('SELECT COUNT(*) FROM ai_safety_assessment');
      result = await db.query(
        'SELECT * FROM ai_safety_assessment ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, offset]
      );
    }

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: result.rows,
      pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch safety assessments.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_safety_assessment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch safety assessment.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, boundary_id, scenario_description, ai_assessment, risk_level, mitigation_steps } = req.body;
    const result = await db.query(
      'INSERT INTO ai_safety_assessment (name, boundary_id, scenario_description, ai_assessment, risk_level, mitigation_steps) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, boundary_id, scenario_description || '', JSON.stringify(ai_assessment || null), risk_level || 'medium', JSON.stringify(mitigation_steps || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create safety assessment.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, boundary_id, scenario_description, ai_assessment, risk_level, mitigation_steps } = req.body;
    const result = await db.query(
      'UPDATE ai_safety_assessment SET name=$1, boundary_id=$2, scenario_description=$3, ai_assessment=$4, risk_level=$5, mitigation_steps=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, boundary_id, scenario_description, JSON.stringify(ai_assessment), risk_level, JSON.stringify(mitigation_steps), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update safety assessment.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_safety_assessment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Safety assessment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete safety assessment.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_safety_assessment WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const assessment = item.rows[0];

    const systemPrompt = 'You are an expert industrial robot safety assessment AI following ISO 10218 and ISO/TS 15066 standards. Respond with valid JSON only, no markdown.';
    const userPrompt = `Assess safety risks for scenario: "${assessment.scenario_description}". Return JSON: { "risk_level": "critical/high/medium/low/negligible", "risk_score": number 0-100, "hazard_types": [strings], "impact_severity": "catastrophic/major/moderate/minor", "probability": "frequent/probable/occasional/remote/improbable", "mitigation_steps": [strings], "ppe_required": [strings], "emergency_procedures": [strings], "compliance_status": { "iso_10218": boolean, "iso_ts_15066": boolean }, "recommended_safety_boundaries": { "max_speed_mm_s": number, "max_force_n": number, "min_distance_mm": number } }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_safety_assessment SET ai_assessment=$1, risk_level=$2, mitigation_steps=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [JSON.stringify(parsed), parsed.risk_level || 'medium', JSON.stringify(parsed.mitigation_steps || []), req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert industrial robot safety AI. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create a safety assessment for: "${description || 'human-robot collaborative welding operation'}". Return JSON: { "name": "string", "scenario_description": "string", "risk_level": "string", "mitigation_steps": [strings] }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI Safety Assessment', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_safety_assessment (name, scenario_description, ai_assessment, risk_level, mitigation_steps) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parsed.name || 'AI Safety Assessment', parsed.scenario_description || description || '', JSON.stringify(parsed), parsed.risk_level || 'medium', JSON.stringify(parsed.mitigation_steps || [])]
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

// POST /api/ai-safety-assessment/ai-evaluate
// ISO 10218/TS 15066 compliance check, risk matrix, mitigation recommendations
router.post('/ai-evaluate', auth, aiRateLimiter, async (req, res) => {
  try {
    const { workspace_data, cobot_config } = req.body;

    if (!workspace_data || typeof workspace_data !== 'object') {
      return res.status(400).json({ error: 'workspace_data (object) is required.' });
    }
    if (!cobot_config || typeof cobot_config !== 'object') {
      return res.status(400).json({ error: 'cobot_config (object) is required.' });
    }

    const systemPrompt = 'You are an expert robotics engineer and cobot programming specialist with deep knowledge of collaborative robot safety standards (ISO 10218, TS 15066), motion planning, and industrial automation. Respond with valid JSON only, no markdown.';
    const userPrompt = `Evaluate the safety of a collaborative robot workspace with the following data:\n\nWorkspace: ${JSON.stringify(workspace_data, null, 2)}\n\nCobot Configuration: ${JSON.stringify(cobot_config, null, 2)}\n\nPerform a full ISO 10218 / TS 15066 compliance assessment. Return JSON: { "compliance": { "iso_10218_1": { "compliant": boolean, "violations": [{ "clause": "string", "description": "string", "severity": "critical/major/minor" }] }, "iso_10218_2": { "compliant": boolean, "violations": [] }, "iso_ts_15066": { "compliant": boolean, "violations": [], "collaborative_operation_modes": { "safety_rated_monitored_stop": boolean, "hand_guiding": boolean, "speed_and_separation": boolean, "power_and_force_limiting": boolean } } }, "risk_matrix": [{ "hazard": "string", "likelihood": "frequent/probable/occasional/remote/improbable", "severity": "catastrophic/critical/marginal/negligible", "risk_level": "unacceptable/undesirable/acceptable/negligible", "risk_priority_number": number 1-1000 }], "overall_risk_level": "unacceptable/undesirable/acceptable/negligible", "mitigation_recommendations": [{ "priority": "immediate/short_term/long_term", "action": "string", "expected_risk_reduction": "string", "standard_reference": "string" }], "safe_operating_limits": { "max_tcp_speed_mm_s": number, "max_contact_force_n": number, "min_separation_distance_mm": number, "power_limit_w": number }, "assessment_summary": "string", "certification_ready": boolean }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    res.json({ ai_evaluation: parsed, workspace_data, cobot_config });
  } catch (err) {
    res.status(500).json({ error: 'AI safety evaluation failed: ' + err.message });
  }
});

module.exports = router;
