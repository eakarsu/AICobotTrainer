import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { features } from '../features';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={styles.wrapper}>
      <nav style={styles.sidebar}>
        <Link to="/" style={styles.brand}>
          <span style={styles.brandIcon}>🤖</span>
          <span style={styles.brandText}>AI Cobot Trainer</span>
        </Link>

        <div style={styles.sidebarSection}>
          <div style={styles.sectionLabel}>CORE FEATURES</div>
          {features.filter(f => !f.isAI).map(f => (
            <Link
              key={f.key}
              to={`/feature/${f.key}`}
              style={{
                ...styles.navItem,
                ...(location.pathname === `/feature/${f.key}` ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{f.icon}</span>
              <span>{f.name}</span>
            </Link>
          ))}
        </div>

        <div style={styles.sidebarSection}>
          <div style={styles.sectionLabel}>AI FEATURES</div>
          {features.filter(f => f.isAI).map(f => (
            <Link
              key={f.key}
              to={`/feature/${f.key}`}
              style={{
                ...styles.navItem,
                ...(location.pathname === `/feature/${f.key}` ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{f.icon}</span>
              <span>{f.name}</span>
              <span style={styles.aiBadge}>AI</span>
            </Link>
          ))}
          <Link
            to={`/ai-advanced`}
            style={{
              ...styles.navItem,
              ...(location.pathname === '/ai-advanced' ? styles.navItemActive : {}),
            }}
          >
            <span style={styles.navIcon}>{'\u2728'}</span>
            <span>AI Advanced</span>
            <span style={styles.aiBadge}>NEW</span>
          </Link>
        </div>

        <div style={styles.sidebarSection}>
          <div style={styles.sectionLabel}>SYSTEM</div>
          <Link to="/notifications" style={{ ...styles.navItem, ...(location.pathname === '/notifications' ? styles.navItemActive : {}) }}>
            <span style={styles.navIcon}>\ud83d\udd14</span>
            <span>Notifications</span>
          </Link>
          <Link to="/webhooks" style={{ ...styles.navItem, ...(location.pathname === '/webhooks' ? styles.navItemActive : {}) }}>
            <span style={styles.navIcon}>\ud83e\ude9d</span>
            <span>Webhooks</span>
          </Link>
        </div>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user.name?.[0] || 'A'}</div>
            <div>
              <div style={styles.userName}>{user.name || 'Admin'}</div>
              <div style={styles.userEmail}>{user.email || ''}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  wrapper: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 280,
    background: '#16171f',
    borderRight: '1px solid #2e2f3e',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    overflowY: 'auto',
    zIndex: 10,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 20px 16px',
    borderBottom: '1px solid #2e2f3e',
    textDecoration: 'none',
    color: '#e4e4e7',
  },
  brandIcon: { fontSize: 28 },
  brandText: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' },
  sidebarSection: { padding: '12px 10px 4px' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#71717a',
    letterSpacing: '1px',
    padding: '8px 10px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 13,
    color: '#a1a1aa',
    textDecoration: 'none',
    transition: 'all 0.15s',
    marginBottom: 2,
  },
  navItemActive: {
    background: 'rgba(99,102,241,0.15)',
    color: '#e4e4e7',
  },
  navIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  aiBadge: {
    marginLeft: 'auto',
    fontSize: 9,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.5px',
  },
  userSection: {
    marginTop: 'auto',
    padding: '16px',
    borderTop: '1px solid #2e2f3e',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 15,
    color: 'white',
  },
  userName: { fontSize: 13, fontWeight: 600, color: '#e4e4e7' },
  userEmail: { fontSize: 11, color: '#71717a' },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    marginLeft: 280,
    padding: '24px 32px',
    minHeight: '100vh',
  },
};
