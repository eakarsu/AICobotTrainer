const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

let rows = [
  {
    id: 1,
    name: 'UR10e bracket fixture changeover',
    work_cell: 'Cell A3',
    robot_model: 'UR10e',
    fixture_family: 'Bracket welding',
    estimated_minutes: 18,
    risk_level: 'medium',
    status: 'ready',
    coaching_steps: ['Lockout gripper power', 'Scan fixture QR', 'Verify datum pins', 'Run dry path at 20 percent speed'],
    ai_tip: 'Stage torque wrench and vision target before teardown to reduce idle robot time.',
  },
  {
    id: 2,
    name: 'Collaborative screwdriving nest swap',
    work_cell: 'Cell B1',
    robot_model: 'FANUC CRX-10iA',
    fixture_family: 'Electronics tray',
    estimated_minutes: 12,
    risk_level: 'low',
    status: 'training',
    coaching_steps: ['Confirm tray revision', 'Load new TCP offset', 'Validate first-piece torque sample'],
    ai_tip: 'Use last successful waypoint set as the baseline before operator teach-in.',
  },
];

const nextId = () => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

router.use(auth);

router.get('/', (req, res) => res.json(rows));
router.get('/:id', (req, res) => {
  const row = rows.find((item) => item.id === Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Fixture changeover plan not found.' });
  res.json(row);
});
router.post('/', (req, res) => {
  const row = { id: nextId(), ...req.body };
  rows.unshift(row);
  res.status(201).json(row);
});
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = rows.findIndex((item) => item.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Fixture changeover plan not found.' });
  rows[idx] = { ...rows[idx], ...req.body, id };
  res.json(rows[idx]);
});
router.delete('/:id', (req, res) => {
  rows = rows.filter((item) => item.id !== Number(req.params.id));
  res.json({ message: 'Fixture changeover plan deleted.' });
});

module.exports = router;
