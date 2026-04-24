const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await db.query('SELECT * FROM ai_predictive_maintenance WHERE name ILIKE $1 ORDER BY created_at DESC', [`%${search}%`])
      : await db.query('SELECT * FROM ai_predictive_maintenance ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictive maintenance records.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_predictive_maintenance WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch record.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, component, operational_hours, sensor_readings, ai_prediction, next_maintenance_date } = req.body;
    const result = await db.query(
      'INSERT INTO ai_predictive_maintenance (name, component, operational_hours, sensor_readings, ai_prediction, next_maintenance_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, component || '', operational_hours || 0, JSON.stringify(sensor_readings || {}), JSON.stringify(ai_prediction || null), next_maintenance_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create record.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, component, operational_hours, sensor_readings, ai_prediction, next_maintenance_date } = req.body;
    const result = await db.query(
      'UPDATE ai_predictive_maintenance SET name=$1, component=$2, operational_hours=$3, sensor_readings=$4, ai_prediction=$5, next_maintenance_date=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, component, operational_hours, JSON.stringify(sensor_readings), JSON.stringify(ai_prediction), next_maintenance_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update record.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_predictive_maintenance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_predictive_maintenance WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const maint = item.rows[0];

    const systemPrompt = 'You are an expert predictive maintenance AI for industrial robots. Analyze sensor data and operational history to predict maintenance needs. Respond with valid JSON only, no markdown.';
    const userPrompt = `Predict maintenance for component "${maint.component}" with ${maint.operational_hours} operational hours and sensor readings: ${JSON.stringify(maint.sensor_readings)}. Return JSON: { "remaining_useful_life_hours": number, "failure_probability_30_days": number 0-1, "wear_level": "new/good/moderate/worn/critical", "next_maintenance_date": "YYYY-MM-DD", "maintenance_type": "preventive/corrective/overhaul", "parts_to_replace": [strings], "estimated_cost_usd": number, "risk_if_delayed": "low/medium/high/critical", "health_indicators": { "vibration_status": "string", "temperature_status": "string", "lubrication_status": "string" } }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_predictive_maintenance SET ai_prediction=$1, next_maintenance_date=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [JSON.stringify(parsed), parsed.next_maintenance_date || null, req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert predictive maintenance AI. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create a predictive maintenance scenario for: "${description || 'robot arm joint 3 servo motor'}". Return JSON: { "name": "string", "component": "string", "operational_hours": number, "sensor_readings": { "temperature_c": [], "vibration_mm_s": [], "current_a": [] }, "next_maintenance_date": "YYYY-MM-DD" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI Maintenance', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_predictive_maintenance (name, component, operational_hours, sensor_readings, ai_prediction, next_maintenance_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [parsed.name || 'AI Maintenance', parsed.component || '', parsed.operational_hours || 0, JSON.stringify(parsed.sensor_readings || {}), JSON.stringify(parsed), parsed.next_maintenance_date || null]
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
