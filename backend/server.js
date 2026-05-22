require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS from env (comma-separated). Defaults to FRONTEND_PORT-based localhost.
const defaultOrigin = `http://localhost:${process.env.FRONTEND_PORT || 3000}`;
const corsOrigins = (process.env.CORS_ORIGIN || defaultOrigin)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/task-sequences', require('./routes/taskSequences'));
app.use('/api/safety-boundaries', require('./routes/safetyBoundaries'));
app.use('/api/quality-checkpoints', require('./routes/qualityCheckpoints'));
app.use('/api/demonstrations', require('./routes/demonstrations'));
app.use('/api/waypoints', require('./routes/waypoints'));
app.use('/api/tool-configs', require('./routes/toolConfigs'));
app.use('/api/work-cells', require('./routes/workCells'));
app.use('/api/ai-motion-planning', require('./routes/aiMotionPlanning'));
app.use('/api/ai-quality-analysis', require('./routes/aiQualityAnalysis'));
app.use('/api/ai-safety-assessment', require('./routes/aiSafetyAssessment'));
app.use('/api/ai-task-optimization', require('./routes/aiTaskOptimization'));
app.use('/api/ai-anomaly-detection', require('./routes/aiAnomalyDetection'));
app.use('/api/ai-nl-programming', require('./routes/aiNlProgramming'));
app.use('/api/ai-predictive-maintenance', require('./routes/aiPredictiveMaintenance'));
app.use('/api/ai-advanced', require('./routes/aiAdvanced'));

app.use('/api/dashboard', require('./routes/dashboard'));

// Audit-recommended additions (notifications, webhooks)
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Custom synthesized "Cobot Views" (timeline, heatmap, PDF, wizard)
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/fixture-changeover-coach', require('./routes/fixtureChangeoverCoach'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


app.use('/api/nl-to-motion', require('./routes/nlToMotionAgent')); // apply pass 6 — audit custom suggestion

app.use('/api/robot-docs-rag', require('./routes/robotDocsRag')); // apply pass 6 — audit custom suggestion

app.use('/api/torque-anomaly', require('./routes/torqueAnomalyStream')); // apply pass 6 — audit custom suggestion

app.use('/api/integrator-sdk', require('./routes/integratorSdk')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
  console.log(`AI Cobot Trainer backend running on port ${PORT}`);
});

module.exports = app;


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-eight-ai-route-files-but-0-mounted-chat-style-ai-e', require('./routes/gap_eight_ai_route_files_but_0_mounted_chat_style_ai_e'));
app.use('/api/gap-no-ai-vision-based-pick-place-training-from-human-', require('./routes/gap_no_ai_vision_based_pick_place_training_from_human_'));
app.use('/api/gap-no-ai-safety-violation-classification-from-operato', require('./routes/gap_no_ai_safety_violation_classification_from_operato'));
app.use('/api/gap-no-ai-digital-twin-simulation-for-offline-programm', require('./routes/gap_no_ai_digital_twin_simulation_for_offline_programm'));
app.use('/api/gap-only-6-frontend-pages-vs-20-backend-routes-severe-', require('./routes/gap_only_6_frontend_pages_vs_20_backend_routes_severe_'));
app.use('/api/gap-notification-routes-exist-but-no-email-sms-deliver', require('./routes/gap_notification_routes_exist_but_no_email_sms_deliver'));
app.use('/api/gap-no-direct-opc-ua-mqtt-industrial-protocol-bridge', require('./routes/gap_no_direct_opc_ua_mqtt_industrial_protocol_bridge'));
app.use('/api/gap-no-teach-pendant-or-graphical-motion-editor-in-fro', require('./routes/gap_no_teach_pendant_or_graphical_motion_editor_in_fro'));
app.use('/api/gap-no-simulator-vr-view-for-path-validation', require('./routes/gap_no_simulator_vr_view_for_path_validation'));
