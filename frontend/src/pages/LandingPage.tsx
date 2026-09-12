import React from 'react';
import { useNavigate } from 'react-router-dom';
import IOSNavbar from '../components/IOSNavbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={styles.pageContainer}>
      <IOSNavbar />
      <main style={styles.main}>
        <section style={styles.card}>
          <h1 style={styles.title}>AI Assistant for Interview Evaluation</h1>
          <p style={styles.subtitle}>
            Enterprise‑grade AI that autonomously conducts, analyses, and scores candidate interviews with zero bias.
          </p>
          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={() => navigate('/register')}>Start Interview</button>
            <button style={styles.secondaryBtn} onClick={() => navigate('/admin')}>Dashboard</button>
          </div>
        </section>
        <footer style={styles.footer}>© 2026 AI Assistant for Interview Evaluation – All rights reserved.</footer>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#202020',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '3rem 2rem',
    maxWidth: '800px',
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  title: {
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    fontWeight: 800,
    marginBottom: '1rem',
    color: '#111827',
  },
  subtitle: {
    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
    color: '#4b5563',
    marginBottom: '2rem',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    color: '#ffffff',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '999px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  secondaryBtn: {
    backgroundColor: '#ffffff',
    color: '#2563EB',
    border: '2px solid #2563EB',
    padding: '12px 28px',
    borderRadius: '999px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  footer: {
    textAlign: 'center',
    padding: '1rem',
    fontSize: '0.85rem',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    marginTop: '2rem',
  },
};

// Simple hover effect injection
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = 'button:hover { opacity: 0.85; }';
  document.head.appendChild(styleTag);
}

export default LandingPage;
