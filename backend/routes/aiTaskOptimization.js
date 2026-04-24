const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await db.query('SELECT * FROM ai_task_optimization WHERE name ILIKE $1 ORDER BY created_at DESC', [`%${search}%`])
      : await db.query('SELECT * FROM ai_task_optimization ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task optimizations.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_task_optimization WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task optimization.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, original_sequence, ai_optimized_sequence, improvement_percentage, optimization_type } = req.body;
    const result = await db.query(
      'INSERT INTO ai_task_optimization (name, original_sequence, ai_optimized_sequence, improvement_percentage, optimization_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, JSON.stringify(original_sequence || []), JSON.stringify(ai_optimized_sequence || null), improvement_percentage || 0, optimization_type || 'time']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task optimization.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, original_sequence, ai_optimized_sequence, improvement_percentage, optimization_type } = req.body;
    const result = await db.query(
      'UPDATE ai_task_optimization SET name=$1, original_sequence=$2, ai_optimized_sequence=$3, improvement_percentage=$4, optimization_type=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, JSON.stringify(original_sequence), JSON.stringify(ai_optimized_sequence), improvement_percentage, optimization_type, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task optimization.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_task_optimization WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Task optimization deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task optimization.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_task_optimization WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const opt = item.rows[0];

    const systemPrompt = 'You are an expert manufacturing process optimization AI. Optimize robot task sequences for efficiency. Respond with valid JSON only, no markdown.';
    const userPrompt = `Optimize this task sequence: ${JSON.stringify(opt.original_sequence)}. Optimization type: ${opt.optimization_type}. Return JSON: { "optimized_sequence": [{ "step": number, "task": "string", "duration_s": number, "improvements": "string" }], "improvement_percentage": number, "total_time_saved_s": number, "energy_savings_percent": number, "bottlenecks_removed": [strings], "parallel_opportunities": [strings], "optimization_notes": "string" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_task_optimization SET ai_optimized_sequence=$1, improvement_percentage=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [JSON.stringify(parsed), parsed.improvement_percentage || 15, req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert manufacturing optimization AI. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create a task optimization scenario for: "${description || 'assembly line pick and place'}". Return JSON: { "name": "string", "original_sequence": [{ "step": number, "task": "string", "duration_s": number }], "optimization_type": "time/energy/quality", "improvement_percentage": number }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI Optimization', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_task_optimization (name, original_sequence, ai_optimized_sequence, improvement_percentage, optimization_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parsed.name || 'AI Task Optimization', JSON.stringify(parsed.original_sequence || []), JSON.stringify(parsed), parsed.improvement_percentage || 0, parsed.optimization_type || 'time']
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
