const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../utils/openrouter');

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await db.query('SELECT * FROM ai_nl_programming WHERE name ILIKE $1 ORDER BY created_at DESC', [`%${search}%`])
      : await db.query('SELECT * FROM ai_nl_programming ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NL programs.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_nl_programming WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NL program.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, natural_language_input, ai_generated_code, ai_explanation, program_id } = req.body;
    const result = await db.query(
      'INSERT INTO ai_nl_programming (name, natural_language_input, ai_generated_code, ai_explanation, program_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, natural_language_input || '', ai_generated_code || '', ai_explanation || '', program_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create NL program.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, natural_language_input, ai_generated_code, ai_explanation, program_id } = req.body;
    const result = await db.query(
      'UPDATE ai_nl_programming SET name=$1, natural_language_input=$2, ai_generated_code=$3, ai_explanation=$4, program_id=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, natural_language_input, ai_generated_code, ai_explanation, program_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update NL program.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_nl_programming WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'NL program deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete NL program.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_nl_programming WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const nlProg = item.rows[0];

    const systemPrompt = 'You are an expert robot programming AI. Convert natural language instructions into robot arm code (similar to URScript or Python robotics). Respond with valid JSON only, no markdown.';
    const userPrompt = `Convert this natural language instruction into robot code: "${nlProg.natural_language_input}". Return JSON: { "generated_code": "string (multi-line robot code)", "explanation": "string explaining each step", "estimated_cycle_time_s": number, "safety_warnings": [strings], "required_tools": [strings], "waypoints_count": number, "code_language": "URScript/Python", "complexity": "simple/moderate/complex" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_nl_programming SET ai_generated_code=$1, ai_explanation=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [parsed.generated_code || aiResponse, parsed.explanation || '', req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert robot programming AI. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create a natural language programming example for: "${description || 'pick up the red part from conveyor and place it in the bin'}". Return JSON: { "name": "string", "natural_language_input": "string", "ai_generated_code": "string", "ai_explanation": "string" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI NL Program', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_nl_programming (name, natural_language_input, ai_generated_code, ai_explanation) VALUES ($1, $2, $3, $4) RETURNING *',
      [parsed.name || 'AI NL Program', parsed.natural_language_input || description || '', parsed.ai_generated_code || '', parsed.ai_explanation || '']
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
