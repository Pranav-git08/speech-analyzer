import React from 'react';
import { useNavigate } from 'react-router-dom';
import IOSNavbar from '../components/IOSNavbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.pageContainer}>
      {/* Background Aura Effects */}
      <div style={{...styles.aura, ...styles.aura1}}></div>
      <div style={{...styles.aura, ...styles.aura2}}></div>
      <div style={{...styles.aura, ...styles.aura3}}></div>
      
      {/* Frosted Glass Overlay */}
      <div style={styles.glassOverlay}></div>

      <IOSNavbar />
      
      <main style={styles.mainContent}>
        <div style={styles.heroWrapper}>
          <div style={styles.badge}>
            <span style={styles.badgeSparkle}>✨</span>
            AI Assistant for Interview Evaluation
          </div>
          
          <h1 style={styles.headline}>
            Evaluate Talent with<br/>
            <span style={styles.headlineHighlight}>Superhuman Precision.</span>
          </h1>
          
          <p style={styles.subhead}>
            The next-generation AI Assistant designed to autonomously conduct, analyze, and score candidate interviews with zero human bias.
          </p>
          
          <div style={styles.ctaGroup}>
            <button style={styles.primaryBtn} onClick={() => navigate('/register')}>
              Start Interview
            </button>
            <button style={styles.secondaryBtn} onClick={() => navigate('/admin')}>
              Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#050505',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  aura: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(120px)',
    opacity: 0.5,
    zIndex: 0,
    animation: 'pulse 10s ease-in-out infinite alternate',
  },
  aura1: {
    top: '-10%',
    left: '-10%',
    width: '600px',
    height: '600px',
    backgroundColor: '#4f46e5', // Indigo
  },
  aura2: {
    bottom: '-20%',
    right: '-10%',
    width: '700px',
    height: '700px',
    backgroundColor: '#9333ea', // Purple
    animationDelay: '2s',
  },
  aura3: {
    top: '30%',
    left: '40%',
    width: '500px',
    height: '500px',
    backgroundColor: '#0ea5e9', // Sky blue
    animationDelay: '5s',
  },
  glassOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.4)',
    backdropFilter: 'blur(80px)',
    WebkitBackdropFilter: 'blur(80px)',
    zIndex: 1,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 2rem',
    position: 'relative',
    zIndex: 10,
  },
  heroWrapper: {
    maxWidth: '900px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    animation: 'fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: '2rem',
    backdropFilter: 'blur(10px)',
  },
  badgeSparkle: {
    fontSize: '1rem',
  },
  headline: {
    fontSize: 'clamp(3rem, 7vw, 5.5rem)',
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    margin: '0 0 1.5rem 0',
    color: '#ffffff',
  },
  headlineHighlight: {
    background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
  },
  subhead: {
    fontSize: 'clamp(1.1rem, 1.5vw, 1.35rem)',
    color: '#cbd5e1',
    maxWidth: '650px',
    lineHeight: 1.6,
    margin: '0 0 3rem 0',
    fontWeight: 400,
  },
  ctaGroup: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
    color: '#000000',
    border: 'none',
    padding: '16px 36px',
    borderRadius: '999px',
    fontSize: '1.05rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 30px rgba(255, 255, 255, 0.15)',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '16px 36px',
    borderRadius: '999px',
    fontSize: '1.05rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
};

// Add global keyframes directly to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = `
    @keyframes pulse {
      0% { transform: scale(1) translate(0, 0); }
      100% { transform: scale(1.1) translate(20px, -20px); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    button:hover {
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(styleSheet);
}

export default LandingPage;
