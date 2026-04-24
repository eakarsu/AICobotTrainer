const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await db.query('SELECT * FROM ai_anomaly_detection WHERE name ILIKE $1 ORDER BY created_at DESC', [`%${search}%`])
      : await db.query('SELECT * FROM ai_anomaly_detection ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch anomaly detections.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_anomaly_detection WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch anomaly detection.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, sensor_data, ai_detected_anomalies, severity } = req.body;
    const result = await db.query(
      'INSERT INTO ai_anomaly_detection (name, sensor_data, ai_detected_anomalies, severity) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, JSON.stringify(sensor_data || {}), JSON.stringify(ai_detected_anomalies || null), severity || 'low']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create anomaly detection.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, sensor_data, ai_detected_anomalies, severity } = req.body;
    const result = await db.query(
      'UPDATE ai_anomaly_detection SET name=$1, sensor_data=$2, ai_detected_anomalies=$3, severity=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, JSON.stringify(sensor_data), JSON.stringify(ai_detected_anomalies), severity, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update anomaly detection.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_anomaly_detection WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Anomaly detection deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete anomaly detection.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_anomaly_detection WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const detection = item.rows[0];

    const systemPrompt = 'You are an expert industrial anomaly detection AI. Analyze sensor data from robot arms to detect anomalies. Respond with valid JSON only, no markdown.';
    const userPrompt = `Analyze sensor data for anomalies: ${JSON.stringify(detection.sensor_data)}. Return JSON: { "anomalies_found": number, "anomaly_details": [{ "type": "string", "location": "string", "confidence": number, "description": "string" }], "severity": "critical/high/medium/low", "overall_health_score": number 0-100, "trending": "improving/stable/degrading", "recommended_actions": [strings], "estimated_downtime_risk_hours": number }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_anomaly_detection SET ai_detected_anomalies=$1, severity=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [JSON.stringify(parsed), parsed.severity || 'low', req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert anomaly detection AI. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create an anomaly detection scenario for: "${description || 'robot arm joint vibration monitoring'}". Return JSON: { "name": "string", "sensor_data": { "temperature": [], "vibration": [], "current": [] }, "severity": "string" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI Anomaly Detection', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_anomaly_detection (name, sensor_data, ai_detected_anomalies, severity) VALUES ($1, $2, $3, $4) RETURNING *',
      [parsed.name || 'AI Anomaly Detection', JSON.stringify(parsed.sensor_data || {}), JSON.stringify(parsed), parsed.severity || 'low']
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
