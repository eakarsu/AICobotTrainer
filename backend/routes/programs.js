const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/programs
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM programs WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM programs ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching programs:', err);
    res.status(500).json({ error: 'Failed to fetch programs.' });
  }
});

// GET /api/programs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching program:', err);
    res.status(500).json({ error: 'Failed to fetch program.' });
  }
});

// POST /api/programs
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, type, status, created_by } = req.body;
    const result = await db.query(
      'INSERT INTO programs (name, description, type, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, type || 'general', status || 'draft', created_by || req.user.name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating program:', err);
    res.status(500).json({ error: 'Failed to create program.' });
  }
});

// PUT /api/programs/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, type, status, created_by } = req.body;
    const result = await db.query(
      'UPDATE programs SET name=$1, description=$2, type=$3, status=$4, created_by=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, description, type, status, created_by, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating program:', err);
    res.status(500).json({ error: 'Failed to update program.' });
  }
});

// DELETE /api/programs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM programs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    res.json({ message: 'Program deleted successfully.' });
  } catch (err) {
    console.error('Error deleting program:', err);
    res.status(500).json({ error: 'Failed to delete program.' });
  }
});

module.exports = router;
