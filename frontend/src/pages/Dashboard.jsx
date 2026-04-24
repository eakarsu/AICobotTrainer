import React from 'react';
import { useNavigate } from 'react-router-dom';
import { features } from '../features';

export default function Dashboard() {
  const navigate = useNavigate();

  const nonAI = features.filter(f => !f.isAI);
  const ai = features.filter(f => f.isAI);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>AI Cobot Trainer - No-Code Robot Arm Programming Platform</p>
      </div>

      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #6366f1' }}>
          <div style={styles.statNumber}>{features.length}</div>
          <div style={styles.statLabel}>Total Features</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #3b82f6' }}>
          <div style={styles.statNumber}>{nonAI.length}</div>
          <div style={styles.statLabel}>Core Features</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #8b5cf6' }}>
          <div style={styles.statNumber}>{ai.length}</div>
          <div style={styles.statLabel}>AI Features</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #22c55e' }}>
          <div style={styles.statNumber}>225</div>
          <div style={styles.statLabel}>Seeded Records</div>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Core Features</h2>
      <div style={styles.grid}>
        {nonAI.map(f => (
          <div
            key={f.key}
            style={styles.card}
            onClick={() => navigate(`/feature/${f.key}`)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = f.color;
              e.currentTarget.style.boxShadow = `0 8px 25px -5px ${f.color}33`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#2e2f3e';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ ...styles.cardIcon, background: `${f.color}20` }}>{f.icon}</div>
            <h3 style={styles.cardTitle}>{f.name}</h3>
            <p style={styles.cardDesc}>{f.description}</p>
            <div style={{ ...styles.cardBadge, background: `${f.color}20`, color: f.color }}>
              Manage
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>
        AI-Powered Features
        <span style={styles.aiTag}>OpenRouter</span>
      </h2>
      <div style={styles.grid}>
        {ai.map(f => (
          <div
            key={f.key}
            style={{ ...styles.card, borderColor: `${f.color}33` }}
            onClick={() => navigate(`/feature/${f.key}`)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = f.color;
              e.currentTarget.style.boxShadow = `0 8px 25px -5px ${f.color}33`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = `${f.color}33`;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.aiIndicator}>
              <span style={styles.aiDot} />
              AI Powered
            </div>
            <div style={{ ...styles.cardIcon, background: `${f.color}20` }}>{f.icon}</div>
            <h3 style={styles.cardTitle}>{f.name}</h3>
            <p style={styles.cardDesc}>{f.description}</p>
            <div style={{ ...styles.cardBadge, background: 'linear-gradient(135deg, #8b5cf620, #ec489920)', color: '#c084fc' }}>
              AI Generate
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: 32 },
  title: { fontSize: 30, fontWeight: 700, color: '#e4e4e7', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#71717a' },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 36,
  },
  statCard: {
    background: '#21222d',
    borderRadius: 12,
    padding: '20px 24px',
    border: '1px solid #2e2f3e',
  },
  statNumber: { fontSize: 28, fontWeight: 700, color: '#e4e4e7' },
  statLabel: { fontSize: 13, color: '#71717a', marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e4e4e7',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  aiTag: {
    fontSize: 10,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: 'white',
    padding: '3px 8px',
    borderRadius: 4,
    letterSpacing: '0.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#21222d',
    borderRadius: 14,
    padding: '24px',
    border: '1px solid #2e2f3e',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    position: 'relative',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e4e4e7',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 1.5,
    marginBottom: 14,
  },
  cardBadge: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 6,
  },
  aiIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    fontWeight: 600,
    color: '#c084fc',
    letterSpacing: '0.3px',
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#c084fc',
    boxShadow: '0 0 8px #c084fc',
  },
};
