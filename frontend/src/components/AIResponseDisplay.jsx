import React from 'react';

export default function AIResponseDisplay({ data }) {
  if (!data) return null;

  if (data.error) {
    return (
      <div style={styles.errorBox}>
        <div style={styles.errorIcon}>!</div>
        <div style={styles.errorText}>{data.error}</div>
      </div>
    );
  }

  if (data.raw_response && typeof data.raw_response === 'string') {
    return (
      <div style={styles.rawBox}>
        <pre style={styles.rawText}>{data.raw_response}</pre>
      </div>
    );
  }

  return <div style={styles.container}>{renderValue(data, 0)}</div>;
}

function renderValue(value, depth = 0) {
  if (value === null || value === undefined) return <span style={styles.nullVal}>—</span>;
  if (typeof value === 'boolean') return <BooleanBadge value={value} />;
  if (typeof value === 'number') return <NumberDisplay value={value} />;
  if (typeof value === 'string') return <StringDisplay value={value} />;
  if (Array.isArray(value)) return <ArrayDisplay items={value} depth={depth} />;
  if (typeof value === 'object') return <ObjectDisplay obj={value} depth={depth} />;
  return <span>{String(value)}</span>;
}

function BooleanBadge({ value }) {
  return (
    <span style={{
      ...styles.badge,
      background: value ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      color: value ? '#4ade80' : '#f87171',
      borderColor: value ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    }}>
      {value ? 'Yes' : 'No'}
    </span>
  );
}

function NumberDisplay({ value }) {
  const isPercentage = value > 0 && value <= 100;
  const isScore = value >= 0 && value <= 1;

  if (isScore && value < 1) {
    const pct = (value * 100).toFixed(1);
    return (
      <div style={styles.scoreContainer}>
        <div style={styles.scoreBarBg}>
          <div style={{ ...styles.scoreBarFill, width: `${pct}%`, background: getScoreColor(value) }} />
        </div>
        <span style={{ ...styles.scoreText, color: getScoreColor(value) }}>{pct}%</span>
      </div>
    );
  }

  if (isPercentage && Number.isInteger(value) === false) {
    return (
      <span style={{ ...styles.numberVal, color: getScoreColor(value / 100) }}>
        {value.toFixed(1)}%
      </span>
    );
  }

  return <span style={styles.numberVal}>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}</span>;
}

function StringDisplay({ value }) {
  const riskColors = {
    critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e', negligible: '#06b6d4',
    excellent: '#22c55e', good: '#4ade80', acceptable: '#f59e0b', poor: '#f97316', reject: '#ef4444',
    new: '#22c55e', moderate: '#f59e0b', worn: '#f97316', degrading: '#ef4444',
    improving: '#22c55e', stable: '#3b82f6',
  };

  const lower = value.toLowerCase();
  if (riskColors[lower]) {
    return (
      <span style={{
        ...styles.badge,
        background: `${riskColors[lower]}20`,
        color: riskColors[lower],
        borderColor: `${riskColors[lower]}40`,
      }}>
        {value}
      </span>
    );
  }

  if (value.includes('\n') || value.length > 100) {
    return <pre style={styles.longText}>{value}</pre>;
  }

  return <span style={styles.stringVal}>{value}</span>;
}

function ArrayDisplay({ items, depth }) {
  if (items.length === 0) return <span style={styles.nullVal}>Empty</span>;

  const allStrings = items.every(i => typeof i === 'string');
  if (allStrings) {
    return (
      <div style={styles.tagList}>
        {items.map((item, idx) => (
          <span key={idx} style={styles.tag}>{item}</span>
        ))}
      </div>
    );
  }

  const allNumbers = items.every(i => typeof i === 'number');
  if (allNumbers && items.length <= 20) {
    return (
      <div style={styles.numberList}>
        {items.map((n, idx) => (
          <span key={idx} style={styles.numberTag}>
            {typeof n === 'number' && !Number.isInteger(n) ? n.toFixed(1) : n}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...styles.arrayContainer, marginLeft: depth > 0 ? 8 : 0 }}>
      {items.map((item, idx) => (
        <div key={idx} style={styles.arrayItem}>
          <span style={styles.arrayIndex}>{idx + 1}</span>
          <div style={styles.arrayContent}>{renderValue(item, depth + 1)}</div>
        </div>
      ))}
    </div>
  );
}

function ObjectDisplay({ obj, depth }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return <span style={styles.nullVal}>Empty</span>;

  return (
    <div style={{ ...styles.objectContainer, marginLeft: depth > 0 ? 0 : 0 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={styles.objectField}>
          <div style={styles.objectKey}>
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div style={styles.objectValue}>{renderValue(value, depth + 1)}</div>
        </div>
      ))}
    </div>
  );
}

function getScoreColor(value) {
  if (value >= 0.8) return '#22c55e';
  if (value >= 0.6) return '#f59e0b';
  if (value >= 0.4) return '#f97316';
  return '#ef4444';
}

const styles = {
  container: {
    background: '#1a1b23',
    borderRadius: 10,
    padding: 16,
    border: '1px solid #2e2f3e',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10,
    padding: '12px 16px',
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#ef4444',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  rawBox: {
    background: '#1a1b23',
    borderRadius: 10,
    padding: 16,
    border: '1px solid #2e2f3e',
  },
  rawText: {
    fontSize: 12,
    color: '#d4d4d8',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    fontFamily: "'SF Mono', 'Monaco', 'Menlo', monospace",
    lineHeight: 1.6,
  },
  nullVal: { color: '#52525b', fontSize: 13, fontStyle: 'italic' },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid',
    letterSpacing: '0.3px',
    textTransform: 'capitalize',
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  scoreBarBg: {
    flex: 1,
    height: 6,
    background: '#2e2f3e',
    borderRadius: 3,
    overflow: 'hidden',
    maxWidth: 120,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  scoreText: { fontSize: 13, fontWeight: 600 },
  numberVal: {
    fontSize: 14,
    fontWeight: 600,
    color: '#60a5fa',
    fontVariantNumeric: 'tabular-nums',
  },
  stringVal: { fontSize: 13, color: '#d4d4d8', lineHeight: 1.5 },
  longText: {
    fontSize: 12,
    color: '#d4d4d8',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    background: '#16171f',
    padding: 12,
    borderRadius: 8,
    lineHeight: 1.6,
    fontFamily: "'SF Mono', 'Monaco', 'Menlo', monospace",
  },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    background: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid rgba(99,102,241,0.2)',
  },
  numberList: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  numberTag: {
    background: 'rgba(59,130,246,0.1)',
    color: '#93c5fd',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
  },
  arrayContainer: { display: 'flex', flexDirection: 'column', gap: 6 },
  arrayItem: {
    display: 'flex',
    gap: 10,
    padding: '8px 10px',
    background: '#16171f',
    borderRadius: 8,
    border: '1px solid #252630',
  },
  arrayIndex: {
    fontSize: 10,
    fontWeight: 700,
    color: '#6366f1',
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    background: 'rgba(99,102,241,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  arrayContent: { flex: 1 },
  objectContainer: { display: 'flex', flexDirection: 'column', gap: 8 },
  objectField: {
    padding: '6px 0',
    borderBottom: '1px solid #252630',
  },
  objectKey: {
    fontSize: 11,
    fontWeight: 600,
    color: '#71717a',
    letterSpacing: '0.3px',
    marginBottom: 3,
  },
  objectValue: {},
};
