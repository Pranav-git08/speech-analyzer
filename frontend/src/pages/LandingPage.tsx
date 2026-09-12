import React from 'react';
import { useNavigate } from 'react-router-dom';
import IOSNavbar from '../components/IOSNavbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.pageContainer}>
      <IOSNavbar />
      
      <main style={styles.mainContent}>
        <div style={styles.heroWrapper}>
          <div style={styles.badge}>
            <span style={styles.badgeDot}></span>
            VOXIS ENTERPRISE AI
          </div>
          
          <h1 style={styles.headline}>
            Intelligence,<br/>Designed to Evolve.
          </h1>
          
          <p style={styles.subhead}>
            The autonomous vocal telemetry and behavioral assessment platform built for Fortune 500 enterprises. Scale your talent acquisition with zero human bias.
          </p>
          
          <div style={styles.ctaGroup}>
            <button style={styles.primaryBtn} onClick={() => navigate('/register')}>
              Start Assessment
            </button>
            <button style={styles.secondaryBtn} onClick={() => navigate('/admin')}>
              Enterprise Login
            </button>
          </div>
        </div>

        <div style={styles.trustSection}>
          <p style={styles.trustText}>TRUSTED BY INDUSTRY LEADERS</p>
          <div style={styles.trustLogos}>
            <span style={styles.logo}>Microsoft</span>
            <span style={styles.logo}>Amazon</span>
            <span style={styles.logo}>Google</span>
            <span style={styles.logo}>McKinsey &amp; Company</span>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#000000',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
    marginTop: '-4rem', // Offset navbar slightly for perfect center
  },
  heroWrapper: {
    maxWidth: '800px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#a1a1aa',
    marginBottom: '2rem',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
  },
  headline: {
    fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
    margin: '0 0 1.5rem 0',
    color: '#ffffff',
  },
  subhead: {
    fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
    color: '#a1a1aa',
    maxWidth: '600px',
    lineHeight: 1.6,
    margin: '0 0 3rem 0',
    fontWeight: 400,
  },
  ctaGroup: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    color: '#000000',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '999px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 1)',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '14px 32px',
    borderRadius: '999px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  trustSection: {
    marginTop: '6rem',
    textAlign: 'center',
    opacity: 0.6,
  },
  trustText: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.15em',
    color: '#71717a',
    marginBottom: '1.5rem',
  },
  trustLogos: {
    display: 'flex',
    gap: '3rem',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#a1a1aa',
    fontFamily: '"Instrument Serif", serif',
    letterSpacing: '-0.02em',
  }
};

export default LandingPage;
