const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/waypoints
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM waypoints WHERE name ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM waypoints ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching waypoints:', err);
    res.status(500).json({ error: 'Failed to fetch waypoints.' });
  }
});

// GET /api/waypoints/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM waypoints WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waypoint not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching waypoint:', err);
    res.status(500).json({ error: 'Failed to fetch waypoint.' });
  }
});

// POST /api/waypoints
router.post('/', auth, async (req, res) => {
  try {
    const { name, x, y, z, rx, ry, rz, speed, program_id } = req.body;
    const result = await db.query(
      'INSERT INTO waypoints (name, x, y, z, rx, ry, rz, speed, program_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, x || 0, y || 0, z || 0, rx || 0, ry || 0, rz || 0, speed || 100, program_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating waypoint:', err);
    res.status(500).json({ error: 'Failed to create waypoint.' });
  }
});

// PUT /api/waypoints/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, x, y, z, rx, ry, rz, speed, program_id } = req.body;
    const result = await db.query(
      'UPDATE waypoints SET name=$1, x=$2, y=$3, z=$4, rx=$5, ry=$6, rz=$7, speed=$8, program_id=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
      [name, x, y, z, rx, ry, rz, speed, program_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waypoint not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating waypoint:', err);
    res.status(500).json({ error: 'Failed to update waypoint.' });
  }
});

// DELETE /api/waypoints/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM waypoints WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waypoint not found.' });
    }
    res.json({ message: 'Waypoint deleted successfully.' });
  } catch (err) {
    console.error('Error deleting waypoint:', err);
    res.status(500).json({ error: 'Failed to delete waypoint.' });
  }
});

module.exports = router;
