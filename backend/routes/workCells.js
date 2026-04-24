const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/work-cells
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM work_cells WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM work_cells ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching work cells:', err);
    res.status(500).json({ error: 'Failed to fetch work cells.' });
  }
});

// GET /api/work-cells/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM work_cells WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work cell not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching work cell:', err);
    res.status(500).json({ error: 'Failed to fetch work cell.' });
  }
});

// POST /api/work-cells
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, dimensions, robot_model, max_reach_mm, status } = req.body;
    const result = await db.query(
      'INSERT INTO work_cells (name, description, dimensions, robot_model, max_reach_mm, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, JSON.stringify(dimensions || {}), robot_model, max_reach_mm || 0, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating work cell:', err);
    res.status(500).json({ error: 'Failed to create work cell.' });
  }
});

// PUT /api/work-cells/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, dimensions, robot_model, max_reach_mm, status } = req.body;
    const result = await db.query(
      'UPDATE work_cells SET name=$1, description=$2, dimensions=$3, robot_model=$4, max_reach_mm=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, description, JSON.stringify(dimensions), robot_model, max_reach_mm, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work cell not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating work cell:', err);
    res.status(500).json({ error: 'Failed to update work cell.' });
  }
});

// DELETE /api/work-cells/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM work_cells WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work cell not found.' });
    }
    res.json({ message: 'Work cell deleted successfully.' });
  } catch (err) {
    console.error('Error deleting work cell:', err);
    res.status(500).json({ error: 'Failed to delete work cell.' });
  }
});

module.exports = router;
