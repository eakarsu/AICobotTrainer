const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/dashboard
// Returns aggregate stats: motion plans, safety assessments, anomalies detected, maintenance alerts
router.get('/', auth, async (req, res) => {
  try {
    const tables = [
      { key: 'motion_plans', table: 'ai_motion_planning' },
      { key: 'task_optimizations', table: 'ai_task_optimization' },
      { key: 'quality_analyses', table: 'ai_quality_analysis' },
      { key: 'safety_assessments', table: 'ai_safety_assessment' },
      { key: 'anomalies_detected', table: 'ai_anomaly_detection' },
      { key: 'maintenance_records', table: 'ai_predictive_maintenance' },
      { key: 'nl_programs', table: 'ai_nl_programming' },
      { key: 'programs', table: 'programs' },
      { key: 'waypoints', table: 'waypoints' },
      { key: 'work_cells', table: 'work_cells' },
    ];

    const stats = {};
    const errors = [];

    for (const t of tables) {
      try {
        const r = await db.query(`SELECT COUNT(*) FROM ${t.table}`);
        stats[t.key] = parseInt(r.rows[0].count);
      } catch (err) {
        // Table may not exist yet — report 0 rather than crashing
        stats[t.key] = 0;
        errors.push(`${t.table}: ${err.message}`);
      }
    }

    // Maintenance alerts: records where failure is predicted soon
    let maintenanceAlerts = 0;
    try {
      const alertResult = await db.query(
        `SELECT COUNT(*) FROM ai_predictive_maintenance
         WHERE next_maintenance_date IS NOT NULL
           AND next_maintenance_date <= NOW() + INTERVAL '7 days'`
      );
      maintenanceAlerts = parseInt(alertResult.rows[0].count);
    } catch (_) {
      maintenanceAlerts = 0;
    }
    stats.maintenance_alerts_next_7_days = maintenanceAlerts;

    // Critical anomalies
    let criticalAnomalies = 0;
    try {
      const critResult = await db.query(
        `SELECT COUNT(*) FROM ai_anomaly_detection WHERE severity IN ('critical', 'high')`
      );
      criticalAnomalies = parseInt(critResult.rows[0].count);
    } catch (_) {
      criticalAnomalies = 0;
    }
    stats.critical_anomalies = criticalAnomalies;

    // High/critical safety risks
    let highRiskAssessments = 0;
    try {
      const riskResult = await db.query(
        `SELECT COUNT(*) FROM ai_safety_assessment WHERE risk_level IN ('critical', 'high')`
      );
      highRiskAssessments = parseInt(riskResult.rows[0].count);
    } catch (_) {
      highRiskAssessments = 0;
    }
    stats.high_risk_assessments = highRiskAssessments;

    // Recent activity (last 24h)
    let recentActivity = 0;
    try {
      const activityTables = [
        'ai_motion_planning', 'ai_safety_assessment', 'ai_anomaly_detection',
        'ai_predictive_maintenance', 'ai_quality_analysis', 'ai_nl_programming',
      ];
      for (const table of activityTables) {
        try {
          const r = await db.query(
            `SELECT COUNT(*) FROM ${table} WHERE created_at >= NOW() - INTERVAL '24 hours'`
          );
          recentActivity += parseInt(r.rows[0].count);
        } catch (_) { /* skip if table doesn't exist */ }
      }
    } catch (_) {
      recentActivity = 0;
    }
    stats.activity_last_24h = recentActivity;

    const response = { stats, generated_at: new Date().toISOString() };
    if (errors.length > 0) response.warnings = errors;

    res.json(response);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

module.exports = router;
