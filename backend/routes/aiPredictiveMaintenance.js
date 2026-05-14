const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/rateLimiter');
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

// POST /api/ai-predictive-maintenance/ai-forecast
// Takes {equipment_history[], current_readings} → failure probability, maintenance window, parts needed
router.post('/ai-forecast', auth, aiRateLimiter, async (req, res) => {
  try {
    const { equipment_history, current_readings } = req.body;

    if (!Array.isArray(equipment_history) || equipment_history.length === 0) {
      return res.status(400).json({ error: 'equipment_history (non-empty array) is required.' });
    }
    if (equipment_history.length > 5000) {
      return res.status(400).json({ error: 'equipment_history must not exceed 5000 entries.' });
    }
    if (!current_readings || typeof current_readings !== 'object') {
      return res.status(400).json({ error: 'current_readings (object) is required.' });
    }

    const systemPrompt = 'You are an expert robotics engineer and cobot programming specialist with deep knowledge of collaborative robot safety standards (ISO 10218, TS 15066), motion planning, and industrial automation. Respond with valid JSON only, no markdown.';
    const userPrompt = `Forecast maintenance needs based on equipment history and current readings.\n\nEquipment History (${equipment_history.length} records, showing most recent 50): ${JSON.stringify(equipment_history.slice(-50), null, 2)}\n\nCurrent Readings: ${JSON.stringify(current_readings, null, 2)}\n\nReturn JSON: { "failure_probability": { "next_24h": number 0-1, "next_7_days": number 0-1, "next_30_days": number 0-1, "next_90_days": number 0-1 }, "predicted_failure_modes": [{ "mode": "string", "probability": number 0-1, "estimated_time_to_failure_hours": number, "failure_impact": "catastrophic/critical/major/minor" }], "maintenance_window": { "recommended_start": "YYYY-MM-DD", "recommended_end": "YYYY-MM-DD", "urgency": "immediate/this_week/this_month/routine", "estimated_duration_hours": number, "can_defer": boolean, "max_defer_days": number | null }, "parts_needed": [{ "part_name": "string", "part_number": "string", "quantity": number, "priority": "critical/high/medium/low", "lead_time_days": number, "estimated_cost_usd": number }], "maintenance_actions": [{ "action": "string", "type": "inspection/lubrication/replacement/calibration/overhaul", "estimated_time_minutes": number }], "current_health_score": number 0-100, "rul_hours": number, "cost_of_delay_per_day_usd": number, "total_estimated_cost_usd": number, "forecast_summary": "string", "confidence": number 0-1 }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    res.json({ ai_forecast: parsed, history_records_analyzed: equipment_history.length });
  } catch (err) {
    res.status(500).json({ error: 'AI maintenance forecast failed: ' + err.message });
  }
});

module.exports = router;
