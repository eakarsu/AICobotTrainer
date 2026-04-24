const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query('SELECT * FROM ai_motion_planning WHERE name ILIKE $1 ORDER BY created_at DESC', [`%${search}%`]);
    } else {
      result = await db.query('SELECT * FROM ai_motion_planning ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching motion plans:', err);
    res.status(500).json({ error: 'Failed to fetch motion plans.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_motion_planning WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Motion plan not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch motion plan.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, start_point, end_point, constraints, ai_generated_path, optimization_score } = req.body;
    const result = await db.query(
      'INSERT INTO ai_motion_planning (name, start_point, end_point, constraints, ai_generated_path, optimization_score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, JSON.stringify(start_point || {}), JSON.stringify(end_point || {}), JSON.stringify(constraints || {}), JSON.stringify(ai_generated_path || null), optimization_score || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create motion plan.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, start_point, end_point, constraints, ai_generated_path, optimization_score } = req.body;
    const result = await db.query(
      'UPDATE ai_motion_planning SET name=$1, start_point=$2, end_point=$3, constraints=$4, ai_generated_path=$5, optimization_score=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, JSON.stringify(start_point), JSON.stringify(end_point), JSON.stringify(constraints), JSON.stringify(ai_generated_path), optimization_score, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Motion plan not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update motion plan.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_motion_planning WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Motion plan not found.' });
    res.json({ message: 'Motion plan deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete motion plan.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_motion_planning WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Motion plan not found.' });
    const plan = item.rows[0];

    const systemPrompt = 'You are an expert robot motion planning AI. Generate optimal collision-free motion paths for industrial robot arms. Respond with valid JSON only, no markdown.';
    const userPrompt = `Generate an optimal motion path for a robot arm moving from start point ${JSON.stringify(plan.start_point)} to end point ${JSON.stringify(plan.end_point)} with constraints ${JSON.stringify(plan.constraints)}. Return JSON with: { "path_points": [array of {x,y,z,rx,ry,rz} waypoints], "total_distance_mm": number, "estimated_time_seconds": number, "collision_risk": "low/medium/high", "optimization_notes": "string", "velocity_profile": [array of speeds], "smoothness_score": number 0-100 }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_motion_planning SET ai_generated_path=$1, optimization_score=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [JSON.stringify(parsed), parsed.smoothness_score || 85, req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    console.error('AI Motion Planning error:', err);
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert robot motion planning AI. Generate motion planning configurations. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create a new robot arm motion plan for: "${description || 'a standard pick and place operation'}". Return JSON with: { "name": "string", "start_point": {x,y,z,rx,ry,rz}, "end_point": {x,y,z,rx,ry,rz}, "constraints": { "max_velocity": number, "max_acceleration": number, "avoid_zones": [] }, "path_points": [array of waypoints], "optimization_score": number 0-100, "notes": "string" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI Generated Plan', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_motion_planning (name, start_point, end_point, constraints, ai_generated_path, optimization_score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [parsed.name || 'AI Generated Motion Plan', JSON.stringify(parsed.start_point || {}), JSON.stringify(parsed.end_point || {}), JSON.stringify(parsed.constraints || {}), JSON.stringify(parsed), parsed.optimization_score || 85]
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
