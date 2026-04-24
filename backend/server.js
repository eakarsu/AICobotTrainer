require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware
app.use(cors({
  origin: [`http://localhost:${process.env.FRONTEND_PORT || 3000}`],
  credentials: true,
}));
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AI Cobot Trainer backend running on port ${PORT}`);
});

module.exports = app;
