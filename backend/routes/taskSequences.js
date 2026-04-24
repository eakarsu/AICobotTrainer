const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/task-sequences
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await db.query(
        'SELECT * FROM task_sequences WHERE name ILIKE $1 ORDER BY created_at DESC',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT * FROM task_sequences ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching task sequences:', err);
    res.status(500).json({ error: 'Failed to fetch task sequences.' });
  }
});

// GET /api/task-sequences/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM task_sequences WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task sequence not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching task sequence:', err);
    res.status(500).json({ error: 'Failed to fetch task sequence.' });
  }
});

// POST /api/task-sequences
router.post('/', auth, async (req, res) => {
  try {
    const { name, steps, program_id, priority, status } = req.body;
    const result = await db.query(
      'INSERT INTO task_sequences (name, steps, program_id, priority, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, JSON.stringify(steps || []), program_id, priority || 1, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating task sequence:', err);
    res.status(500).json({ error: 'Failed to create task sequence.' });
  }
});

// PUT /api/task-sequences/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, steps, program_id, priority, status } = req.body;
    const result = await db.query(
      'UPDATE task_sequences SET name=$1, steps=$2, program_id=$3, priority=$4, status=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, JSON.stringify(steps), program_id, priority, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task sequence not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task sequence:', err);
    res.status(500).json({ error: 'Failed to update task sequence.' });
  }
});

// DELETE /api/task-sequences/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM task_sequences WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task sequence not found.' });
    }
    res.json({ message: 'Task sequence deleted successfully.' });
  } catch (err) {
    console.error('Error deleting task sequence:', err);
    res.status(500).json({ error: 'Failed to delete task sequence.' });
  }
});

module.exports = router;
