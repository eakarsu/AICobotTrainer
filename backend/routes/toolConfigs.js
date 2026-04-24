const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/tool-configs
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM tool_configs WHERE name ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM tool_configs ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tool configs:', err);
    res.status(500).json({ error: 'Failed to fetch tool configurations.' });
  }
});

// GET /api/tool-configs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tool_configs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool configuration not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching tool config:', err);
    res.status(500).json({ error: 'Failed to fetch tool configuration.' });
  }
});

// POST /api/tool-configs
router.post('/', auth, async (req, res) => {
  try {
    const { name, tool_type, payload_kg, tcp_offset, grip_force, is_active } = req.body;
    const result = await db.query(
      'INSERT INTO tool_configs (name, tool_type, payload_kg, tcp_offset, grip_force, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, tool_type || 'gripper', payload_kg || 0, JSON.stringify(tcp_offset || {}), grip_force || 0, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating tool config:', err);
    res.status(500).json({ error: 'Failed to create tool configuration.' });
  }
});

// PUT /api/tool-configs/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, tool_type, payload_kg, tcp_offset, grip_force, is_active } = req.body;
    const result = await db.query(
      'UPDATE tool_configs SET name=$1, tool_type=$2, payload_kg=$3, tcp_offset=$4, grip_force=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, tool_type, payload_kg, JSON.stringify(tcp_offset), grip_force, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool configuration not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating tool config:', err);
    res.status(500).json({ error: 'Failed to update tool configuration.' });
  }
});

// DELETE /api/tool-configs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tool_configs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool configuration not found.' });
    }
    res.json({ message: 'Tool configuration deleted successfully.' });
  } catch (err) {
    console.error('Error deleting tool config:', err);
    res.status(500).json({ error: 'Failed to delete tool configuration.' });
  }
});

module.exports = router;
