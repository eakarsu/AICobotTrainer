const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/quality-checkpoints
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM quality_checkpoints WHERE name ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM quality_checkpoints ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quality checkpoints:', err);
    res.status(500).json({ error: 'Failed to fetch quality checkpoints.' });
  }
});

// GET /api/quality-checkpoints/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM quality_checkpoints WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quality checkpoint not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching quality checkpoint:', err);
    res.status(500).json({ error: 'Failed to fetch quality checkpoint.' });
  }
});

// POST /api/quality-checkpoints
router.post('/', auth, async (req, res) => {
  try {
    const { name, inspection_type, tolerance, measurement_unit, pass_criteria, program_id } = req.body;
    const result = await db.query(
      'INSERT INTO quality_checkpoints (name, inspection_type, tolerance, measurement_unit, pass_criteria, program_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, inspection_type || 'visual', tolerance, measurement_unit || 'mm', pass_criteria, program_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating quality checkpoint:', err);
    res.status(500).json({ error: 'Failed to create quality checkpoint.' });
  }
});

// PUT /api/quality-checkpoints/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, inspection_type, tolerance, measurement_unit, pass_criteria, program_id } = req.body;
    const result = await db.query(
      'UPDATE quality_checkpoints SET name=$1, inspection_type=$2, tolerance=$3, measurement_unit=$4, pass_criteria=$5, program_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, inspection_type, tolerance, measurement_unit, pass_criteria, program_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quality checkpoint not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quality checkpoint:', err);
    res.status(500).json({ error: 'Failed to update quality checkpoint.' });
  }
});

// DELETE /api/quality-checkpoints/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM quality_checkpoints WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quality checkpoint not found.' });
    }
    res.json({ message: 'Quality checkpoint deleted successfully.' });
  } catch (err) {
    console.error('Error deleting quality checkpoint:', err);
    res.status(500).json({ error: 'Failed to delete quality checkpoint.' });
  }
});

module.exports = router;
