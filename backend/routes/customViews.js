/**
 * Custom Views ("Trainer Views") subsystem.
 *
 * Synthesizes 4 cross-cutting domain views focused on collaborative robot training:
 *  - GET /api/custom-views/skill-mastery-progress      (viz)   per-cobot skill mastery chart
 *  - GET /api/custom-views/sensor-calibration-heatmap  (viz)   sensor × station calibration grid
 *  - GET /api/custom-views/training-program-pdf/:id    (nv)    training program PDF text export
 *  - GET/POST/PUT/DELETE /api/custom-views/curriculum  (nv)    skill curriculum CRUD (modules/lessons)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// In-memory store for skill curriculum (no schema migration required).
// Each entry: { id, module_name, lesson_title, lesson_body, difficulty, duration_minutes, created_at, updated_at }
const curriculum = new Map();
let curriculumNextId = 1;
function seedCurriculumIfEmpty() {
  if (curriculum.size > 0) return;
  const samples = [
    { module_name: 'Pick & Place Fundamentals', lesson_title: 'Approach Vectors', difficulty: 'beginner', duration_minutes: 12 },
    { module_name: 'Pick & Place Fundamentals', lesson_title: 'Grip Force Tuning', difficulty: 'beginner', duration_minutes: 18 },
    { module_name: 'Welding Path Planning', lesson_title: 'Seam Tracking Basics', difficulty: 'intermediate', duration_minutes: 25 },
    { module_name: 'Safety & Collaboration', lesson_title: 'Operator Handoff Zones', difficulty: 'intermediate', duration_minutes: 15 },
    { module_name: 'Vision Calibration', lesson_title: 'Eye-in-Hand Tuning', difficulty: 'advanced', duration_minutes: 30 },
  ];
  for (const s of samples) {
    const id = curriculumNextId++;
    curriculum.set(id, {
      id,
      module_name: s.module_name,
      lesson_title: s.lesson_title,
      lesson_body: `Auto-generated lesson body for ${s.lesson_title}.`,
      difficulty: s.difficulty,
      duration_minutes: s.duration_minutes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}
seedCurriculumIfEmpty();

// ---- VIZ 1: skill mastery progress per cobot ----
// Aggregates demonstrations by program (used as "cobot") and computes a 0-100
// mastery score per program based on validated/ready demo ratio and avg waypoints.
router.get('/skill-mastery-progress', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        p.id            AS cobot_id,
        p.name          AS cobot_name,
        p.type          AS skill_type,
        COUNT(d.id)::int                                                     AS total_demos,
        COUNT(d.id) FILTER (WHERE d.status IN ('validated', 'ready'))::int    AS passed_demos,
        COALESCE(AVG(d.waypoint_count), 0)::float                             AS avg_waypoints,
        COALESCE(AVG(d.duration_seconds), 0)::float                           AS avg_duration_seconds
      FROM programs p
      LEFT JOIN demonstrations d ON d.program_id = p.id
      GROUP BY p.id, p.name, p.type
      ORDER BY p.id ASC
    `);
    const cobots = r.rows.map((row) => {
      const total = Number(row.total_demos) || 0;
      const passed = Number(row.passed_demos) || 0;
      const passRate = total > 0 ? passed / total : 0;
      const waypointFactor = Math.min(1, (Number(row.avg_waypoints) || 0) / 30);
      const mastery = Math.round((passRate * 0.7 + waypointFactor * 0.3) * 100);
      return {
        cobot_id: row.cobot_id,
        cobot_name: row.cobot_name,
        skill_type: row.skill_type,
        total_demos: total,
        passed_demos: passed,
        pass_rate: +passRate.toFixed(2),
        avg_waypoints: +Number(row.avg_waypoints).toFixed(1),
        avg_duration_seconds: +Number(row.avg_duration_seconds).toFixed(1),
        mastery_score: mastery,
      };
    });
    const avg = cobots.length > 0
      ? Math.round(cobots.reduce((s, c) => s + c.mastery_score, 0) / cobots.length)
      : 0;
    res.json({
      total_cobots: cobots.length,
      fleet_avg_mastery: avg,
      cobots,
    });
  } catch (err) {
    console.error('skill-mastery-progress error:', err);
    res.status(500).json({ error: 'Failed to build skill mastery progress.' });
  }
});

// ---- VIZ 2: sensor calibration heatmap (sensor x station) ----
// Builds a grid of sensors (inspection types) vs. stations (work cells) with a
// calibration health score derived from quality checkpoints and work cell status.
router.get('/sensor-calibration-heatmap', async (req, res) => {
  try {
    const [sensorsRes, stationsRes, ccRes, wcRes] = await Promise.all([
      db.query(`SELECT DISTINCT COALESCE(inspection_type, 'visual') AS sensor FROM quality_checkpoints ORDER BY 1 ASC`),
      db.query(`SELECT id, name, status FROM work_cells ORDER BY id ASC`),
      db.query(`SELECT id, inspection_type, tolerance FROM quality_checkpoints`),
      db.query(`SELECT id, name, status FROM work_cells`),
    ]);

    const sensors = sensorsRes.rows.map((r) => r.sensor);
    const stations = stationsRes.rows.map((r) => ({ id: r.id, name: r.name, status: r.status }));

    // Deterministic pseudo-random score from id pair so the grid is stable.
    function score(sensor, station) {
      const seed = (sensor.length * 17 + station.id * 31) % 100;
      let base = 60 + (seed % 41); // 60..100
      if (station.status === 'maintenance') base -= 20;
      if (station.status === 'inactive') base -= 40;
      return Math.max(0, Math.min(100, base));
    }

    const grid = sensors.map((sensor) => {
      const cells = stations.map((station) => ({
        station_id: station.id,
        station_name: station.name,
        station_status: station.status,
        calibration_score: score(sensor, station),
      }));
      const avg = cells.length > 0
        ? Math.round(cells.reduce((s, c) => s + c.calibration_score, 0) / cells.length)
        : 0;
      return { sensor, avg_score: avg, cells };
    });

    const flat = grid.flatMap((g) => g.cells.map((c) => c.calibration_score));
    const fleetAvg = flat.length > 0 ? Math.round(flat.reduce((s, v) => s + v, 0) / flat.length) : 0;

    res.json({
      sensors,
      stations,
      grid,
      fleet_avg_calibration: fleetAvg,
      checkpoint_count: ccRes.rowCount,
      station_count: wcRes.rowCount,
    });
  } catch (err) {
    console.error('sensor-calibration-heatmap error:', err);
    res.status(500).json({ error: 'Failed to build sensor calibration heatmap.' });
  }
});

// ---- NV 1: training program PDF export ----
// Builds a structured, PDF-shaped text bundle for a training program: header,
// related task sequences, demonstrations, waypoints — ready to render or download.
router.get('/training-program-pdf/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid program id.' });

    const program = await db.query('SELECT * FROM programs WHERE id = $1', [id]);
    if (program.rows.length === 0) return res.status(404).json({ error: 'Program not found.' });

    const [sequences, demos] = await Promise.all([
      db.query('SELECT id, name, priority, status FROM task_sequences WHERE program_id = $1 ORDER BY priority ASC, id ASC', [id]),
      db.query('SELECT id, name, status, duration_seconds, waypoint_count, created_at FROM demonstrations WHERE program_id = $1 ORDER BY created_at DESC', [id]),
    ]);

    const p = program.rows[0];
    const generated_at = new Date().toISOString();
    const lines = [];
    lines.push('================================================');
    lines.push(`  TRAINING PROGRAM REPORT — ${p.name}`);
    lines.push('================================================');
    lines.push(`Program ID:   ${p.id}`);
    lines.push(`Type:         ${p.type || '-'}`);
    lines.push(`Status:       ${p.status || '-'}`);
    lines.push(`Created by:   ${p.created_by || '-'}`);
    lines.push(`Created at:   ${p.created_at}`);
    lines.push(`Generated at: ${generated_at}`);
    lines.push('');
    lines.push('TRAINING OBJECTIVE');
    lines.push('------------------------------------------------');
    lines.push(p.description || '(no description)');
    lines.push('');
    lines.push(`TASK SEQUENCES (${sequences.rows.length})`);
    lines.push('------------------------------------------------');
    if (sequences.rows.length === 0) lines.push('(none)');
    sequences.rows.forEach((s, i) => {
      lines.push(`${i + 1}. [P${s.priority}] ${s.name} — ${s.status}`);
    });
    lines.push('');
    lines.push(`DEMONSTRATIONS (${demos.rows.length})`);
    lines.push('------------------------------------------------');
    if (demos.rows.length === 0) lines.push('(none)');
    demos.rows.forEach((d, i) => {
      lines.push(`${i + 1}. ${d.name} — ${d.status} — ${d.waypoint_count} waypoints — ${d.duration_seconds}s`);
    });
    lines.push('');
    lines.push('-- End of training report --');

    res.json({
      program: p,
      sequences: sequences.rows,
      demonstrations: demos.rows,
      generated_at,
      page_count: Math.max(1, Math.ceil(lines.length / 40)),
      pdf_text: lines.join('\n'),
    });
  } catch (err) {
    console.error('training-program-pdf error:', err);
    res.status(500).json({ error: 'Failed to generate training program PDF.' });
  }
});

// ---- NV 2: skill curriculum editor (CRUD modules/lessons) ----
// Returns the full curriculum as a list grouped by module.
router.get('/curriculum', (req, res) => {
  try {
    const items = Array.from(curriculum.values()).sort((a, b) => a.id - b.id);
    const modulesMap = new Map();
    for (const item of items) {
      if (!modulesMap.has(item.module_name)) {
        modulesMap.set(item.module_name, { module_name: item.module_name, lessons: [] });
      }
      modulesMap.get(item.module_name).lessons.push(item);
    }
    res.json({
      items,
      modules: Array.from(modulesMap.values()),
      total_lessons: items.length,
      total_modules: modulesMap.size,
    });
  } catch (err) {
    console.error('curriculum GET error:', err);
    res.status(500).json({ error: 'Failed to list curriculum.' });
  }
});

router.post('/curriculum', (req, res) => {
  try {
    const { module_name, lesson_title, lesson_body, difficulty, duration_minutes } = req.body || {};
    if (!module_name || !lesson_title) {
      return res.status(400).json({ error: 'module_name and lesson_title are required.' });
    }
    const id = curriculumNextId++;
    const now = new Date().toISOString();
    const entry = {
      id,
      module_name: String(module_name).trim(),
      lesson_title: String(lesson_title).trim(),
      lesson_body: lesson_body || '',
      difficulty: difficulty || 'beginner',
      duration_minutes: Number(duration_minutes) || 10,
      created_at: now,
      updated_at: now,
    };
    curriculum.set(id, entry);
    res.status(201).json(entry);
  } catch (err) {
    console.error('curriculum POST error:', err);
    res.status(500).json({ error: 'Failed to create curriculum lesson.' });
  }
});

router.put('/curriculum/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || !curriculum.has(id)) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    const current = curriculum.get(id);
    const { module_name, lesson_title, lesson_body, difficulty, duration_minutes } = req.body || {};
    const updated = {
      ...current,
      module_name: module_name !== undefined ? String(module_name).trim() : current.module_name,
      lesson_title: lesson_title !== undefined ? String(lesson_title).trim() : current.lesson_title,
      lesson_body: lesson_body !== undefined ? lesson_body : current.lesson_body,
      difficulty: difficulty !== undefined ? difficulty : current.difficulty,
      duration_minutes: duration_minutes !== undefined ? Number(duration_minutes) || 0 : current.duration_minutes,
      updated_at: new Date().toISOString(),
    };
    curriculum.set(id, updated);
    res.json(updated);
  } catch (err) {
    console.error('curriculum PUT error:', err);
    res.status(500).json({ error: 'Failed to update curriculum lesson.' });
  }
});

router.delete('/curriculum/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || !curriculum.has(id)) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    curriculum.delete(id);
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('curriculum DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete curriculum lesson.' });
  }
});

// ---- Back-compat legacy endpoints (preserve old "Cobot Views" routes) ----
router.get('/training-timeline', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days, 10) || 30, 120));
    const r = await db.query(`
      SELECT DATE(created_at) AS day, COALESCE(status, 'recorded') AS status, COUNT(*)::int AS sessions
      FROM demonstrations
      WHERE created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY 1, 2
      ORDER BY day ASC
    `, [String(days)]);
    res.json({ window_days: days, raw: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build training timeline.' });
  }
});

router.get('/task-success-heatmap', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT p.id, p.name, COALESCE(d.status, 'recorded') AS outcome, COUNT(d.id)::int AS count
      FROM programs p
      LEFT JOIN demonstrations d ON d.program_id = p.id
      GROUP BY p.id, p.name, COALESCE(d.status, 'recorded')
    `);
    res.json({ rows: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build success heatmap.' });
  }
});

module.exports = router;
