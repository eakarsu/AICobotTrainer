const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/safety-boundaries
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM safety_boundaries WHERE name ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM safety_boundaries ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching safety boundaries:', err);
    res.status(500).json({ error: 'Failed to fetch safety boundaries.' });
  }
});

// GET /api/safety-boundaries/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM safety_boundaries WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Safety boundary not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching safety boundary:', err);
    res.status(500).json({ error: 'Failed to fetch safety boundary.' });
  }
});

// POST /api/safety-boundaries
router.post('/', auth, async (req, res) => {
  try {
    const { name, zone_type, coordinates, max_speed, max_force, is_active } = req.body;
    const result = await db.query(
      'INSERT INTO safety_boundaries (name, zone_type, coordinates, max_speed, max_force, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, zone_type || 'restricted', JSON.stringify(coordinates || {}), max_speed, max_force, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating safety boundary:', err);
    res.status(500).json({ error: 'Failed to create safety boundary.' });
  }
});

// PUT /api/safety-boundaries/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, zone_type, coordinates, max_speed, max_force, is_active } = req.body;
    const result = await db.query(
      'UPDATE safety_boundaries SET name=$1, zone_type=$2, coordinates=$3, max_speed=$4, max_force=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, zone_type, JSON.stringify(coordinates), max_speed, max_force, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Safety boundary not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating safety boundary:', err);
    res.status(500).json({ error: 'Failed to update safety boundary.' });
  }
});

// DELETE /api/safety-boundaries/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM safety_boundaries WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Safety boundary not found.' });
    }
    res.json({ message: 'Safety boundary deleted successfully.' });
  } catch (err) {
    console.error('Error deleting safety boundary:', err);
    res.status(500).json({ error: 'Failed to delete safety boundary.' });
  }
});

module.exports = router;
