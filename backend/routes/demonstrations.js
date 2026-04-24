const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/demonstrations
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM demonstrations WHERE name ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM demonstrations ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching demonstrations:', err);
    res.status(500).json({ error: 'Failed to fetch demonstrations.' });
  }
});

// GET /api/demonstrations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM demonstrations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demonstration not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching demonstration:', err);
    res.status(500).json({ error: 'Failed to fetch demonstration.' });
  }
});

// POST /api/demonstrations
router.post('/', auth, async (req, res) => {
  try {
    const { name, program_id, duration_seconds, waypoint_count, recording_data, status } = req.body;
    const result = await db.query(
      'INSERT INTO demonstrations (name, program_id, duration_seconds, waypoint_count, recording_data, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, program_id, duration_seconds || 0, waypoint_count || 0, JSON.stringify(recording_data || {}), status || 'recorded']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating demonstration:', err);
    res.status(500).json({ error: 'Failed to create demonstration.' });
  }
});

// PUT /api/demonstrations/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, program_id, duration_seconds, waypoint_count, recording_data, status } = req.body;
    const result = await db.query(
      'UPDATE demonstrations SET name=$1, program_id=$2, duration_seconds=$3, waypoint_count=$4, recording_data=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, program_id, duration_seconds, waypoint_count, JSON.stringify(recording_data), status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demonstration not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating demonstration:', err);
    res.status(500).json({ error: 'Failed to update demonstration.' });
  }
});

// DELETE /api/demonstrations/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM demonstrations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demonstration not found.' });
    }
    res.json({ message: 'Demonstration deleted successfully.' });
  } catch (err) {
    console.error('Error deleting demonstration:', err);
    res.status(500).json({ error: 'Failed to delete demonstration.' });
  }
});

module.exports = router;
