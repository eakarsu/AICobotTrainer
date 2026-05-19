import React from 'react';
import SkillMasteryProgress from '../components/customViews/SkillMasteryProgress';
import SensorCalibrationHeatmap from '../components/customViews/SensorCalibrationHeatmap';
import TrainingProgramPdf from '../components/customViews/TrainingProgramPdf';
import SkillCurriculumEditor from '../components/customViews/SkillCurriculumEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ color: '#e4e4e7' }}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Trainer Views</h1>
        <p style={styles.sub}>Synthesized cross-cutting views for collaborative robot training programs</p>
      </div>

      <div style={styles.grid}>
        <div style={styles.col}>
          <SkillMasteryProgress />
          <TrainingProgramPdf />
        </div>
        <div style={styles.col}>
          <SensorCalibrationHeatmap />
          <SkillCurriculumEditor />
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: 18 },
  h1: { fontSize: 28, margin: 0, marginBottom: 6 },
  sub: { color: '#a1a1aa', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 },
  col: { display: 'flex', flexDirection: 'column' },
};
