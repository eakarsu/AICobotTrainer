const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await db.query('SELECT * FROM ai_safety_assessment WHERE name ILIKE $1 ORDER BY created_at DESC', [`%${search}%`])
      : await db.query('SELECT * FROM ai_safety_assessment ORDER BY created_at DESC');
    res.json(result.rows);
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

module.exports = router;
