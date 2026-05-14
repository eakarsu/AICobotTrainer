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
      countResult = await db.query('SELECT COUNT(*) FROM ai_quality_analysis WHERE name ILIKE $1', [`%${search}%`]);
      result = await db.query(
        'SELECT * FROM ai_quality_analysis WHERE name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [`%${search}%`, pageSize, offset]
      );
    } else {
      countResult = await db.query('SELECT COUNT(*) FROM ai_quality_analysis');
      result = await db.query(
        'SELECT * FROM ai_quality_analysis ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, offset]
      );
    }

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: result.rows,
      pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quality analyses.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ai_quality_analysis WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quality analysis not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quality analysis.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, checkpoint_id, measurement_data, ai_analysis, confidence_score, recommendation } = req.body;
    const result = await db.query(
      'INSERT INTO ai_quality_analysis (name, checkpoint_id, measurement_data, ai_analysis, confidence_score, recommendation) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, checkpoint_id, JSON.stringify(measurement_data || {}), JSON.stringify(ai_analysis || null), confidence_score || 0, recommendation || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quality analysis.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, checkpoint_id, measurement_data, ai_analysis, confidence_score, recommendation } = req.body;
    const result = await db.query(
      'UPDATE ai_quality_analysis SET name=$1, checkpoint_id=$2, measurement_data=$3, ai_analysis=$4, confidence_score=$5, recommendation=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, checkpoint_id, JSON.stringify(measurement_data), JSON.stringify(ai_analysis), confidence_score, recommendation, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quality analysis not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quality analysis.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ai_quality_analysis WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quality analysis not found.' });
    res.json({ message: 'Quality analysis deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quality analysis.' });
  }
});

router.post('/:id/generate', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT * FROM ai_quality_analysis WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const analysis = item.rows[0];

    const systemPrompt = 'You are an expert manufacturing quality analysis AI. Analyze measurement data and provide quality assessments for robot arm operations. Respond with valid JSON only, no markdown.';
    const userPrompt = `Analyze quality measurement data: ${JSON.stringify(analysis.measurement_data)}. Provide a detailed quality analysis. Return JSON: { "overall_quality": "excellent/good/acceptable/poor/reject", "defect_probability": number 0-1, "dimensional_accuracy": number percentage, "surface_quality_score": number 0-100, "root_causes": [array of strings], "corrective_actions": [array of strings], "confidence": number 0-1, "detailed_metrics": { "tolerance_compliance": boolean, "repeatability_index": number, "process_capability": number } }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    const updated = await db.query(
      'UPDATE ai_quality_analysis SET ai_analysis=$1, confidence_score=$2, recommendation=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [JSON.stringify(parsed), parsed.confidence || 0.85, parsed.corrective_actions?.join('; ') || 'Review measurements', req.params.id]
    );
    res.json({ item: updated.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

router.post('/generate-new', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = 'You are an expert manufacturing quality analysis AI. Respond with valid JSON only, no markdown.';
    const userPrompt = `Create a quality analysis scenario for: "${description || 'automotive part inspection'}". Return JSON: { "name": "string", "measurement_data": { "dimensions": {}, "surface_roughness": number, "hardness": number }, "confidence_score": number 0-1, "recommendation": "string" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { name: description || 'AI Generated Analysis', raw_response: aiResponse }; }

    const result = await db.query(
      'INSERT INTO ai_quality_analysis (name, measurement_data, ai_analysis, confidence_score, recommendation) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parsed.name || 'AI Quality Analysis', JSON.stringify(parsed.measurement_data || {}), JSON.stringify(parsed), parsed.confidence_score || 0.85, parsed.recommendation || '']
    );
    res.status(201).json({ item: result.rows[0], ai_response: parsed });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

// POST /api/ai-quality-analysis/ai-inspect
// Input validation + AI defect detection, quality score, rejection criteria
router.post('/ai-inspect', auth, aiRateLimiter, async (req, res) => {
  try {
    const { inspection_data, equipment_type } = req.body;

    if (!inspection_data || typeof inspection_data !== 'object') {
      return res.status(400).json({ error: 'inspection_data (object) is required.' });
    }
    if (!equipment_type || typeof equipment_type !== 'string') {
      return res.status(400).json({ error: 'equipment_type (string) is required.' });
    }
    if (equipment_type.length > 200) {
      return res.status(400).json({ error: 'equipment_type must be under 200 characters.' });
    }

    const systemPrompt = 'You are an expert robotics engineer and cobot programming specialist with deep knowledge of collaborative robot safety standards (ISO 10218, TS 15066), motion planning, and industrial automation. Respond with valid JSON only, no markdown.';
    const userPrompt = `Perform an AI quality inspection for equipment type "${equipment_type}" using the following inspection data:\n${JSON.stringify(inspection_data, null, 2)}\n\nReturn JSON: { "defects_detected": [{ "type": "string", "location": "string", "severity": "critical/major/minor", "confidence": number 0-1, "description": "string" }], "quality_score": number 0-100, "overall_grade": "A/B/C/D/F", "rejection_criteria_triggered": [{ "criterion": "string", "triggered": boolean, "threshold": "string", "measured_value": "string" }], "pass_fail": "pass/fail/conditional", "root_cause_analysis": [{ "issue": "string", "probable_cause": "string", "recommended_action": "string" }], "confidence": number 0-1, "inspection_summary": "string" }`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    let parsed;
    try { parsed = JSON.parse(aiResponse); } catch { parsed = { raw_response: aiResponse }; }

    res.json({ ai_inspection: parsed, equipment_type, inspection_data });
  } catch (err) {
    res.status(500).json({ error: 'AI inspection failed: ' + err.message });
  }
});

module.exports = router;
