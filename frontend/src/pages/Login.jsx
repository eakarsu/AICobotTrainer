import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAutoFill = () => {
    setEmail('admin@cobottrainer.com');
    setPassword('admin123');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logo}>🤖</div>
          <h1 style={styles.title}>AI Cobot Trainer</h1>
          <p style={styles.subtitle}>No-Code Robot Arm Programming Platform</p>
        </div>
        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
              required
            />
          </div>
          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" onClick={handleAutoFill} style={styles.autoFillBtn}>
            Auto-Fill Demo Credentials
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f1117 0%, #1a1b2e 50%, #0f1117 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 30% 40%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(139,92,246,0.1) 0%, transparent 50%)',
  },
  card: {
    background: 'rgba(33, 34, 45, 0.95)',
    borderRadius: 20,
    padding: '48px 40px',
    width: 420,
    maxWidth: '90vw',
    border: '1px solid rgba(99,102,241,0.2)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 36,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e4e4e7',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    letterSpacing: '0.5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    background: '#1a1b23',
    border: '1px solid #2e2f3e',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#e4e4e7',
    fontSize: 15,
  },
  loginBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  autoFillBtn: {
    background: 'transparent',
    color: '#6366f1',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 10,
    padding: '12px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
  },
};
