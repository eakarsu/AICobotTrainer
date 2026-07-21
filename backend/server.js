require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

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
app.use('/api/governed-operations', require('./routes/governedOperations'));

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
