import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import IOSNavbar from '../components/IOSNavbar';
import InteractiveRoadmapCanvas from '../components/InteractiveRoadmapCanvas';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Dynamic Cycling Text state
  const headlines = [
    'Autonomous Multi-Modal Speech & Vocal Telemetry',
    '30-Minute Anti-Cheat Aptitude Screening (7/15 Cutoff)',
    'AI Automated 5-Member Group Discussion (GD) Cohorts',
    'Universal VOXIS-INT Access for TJI & NTJI Tracks',
    'Executive HR Intelligence & Offer Letter Dispatch',
  ];
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % headlines.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [headlines.length]);

  return (
    <div style={styles.pageContainer}>
      {/* 3D Dynamic Floating Canvas */}
      <GlassCanvas3D mode="mixed" intensity={1.3} />

      {/* Global iOS Navbar */}
      <IOSNavbar />

      {/* Main Unified Viewport: Hero + Single CTA + Interactive Roadmap Together */}
      <main style={styles.mainContent}>
        {/* Compact Hero Header */}
        <section style={styles.heroHeader}>
          <div style={styles.badgeContainer}>
            <span style={styles.badgePulse} />
            <span style={styles.badgeText}>✨ NEXT-GEN AI MULTI-MODAL RECRUITMENT PLATFORM</span>
          </div>

          {/* BOLD ANIMATED PROJECT TITLE */}
          <h1 style={styles.mainTitle}>
            <span style={styles.titleGradient}>VOXIS</span>
            <span style={styles.titleAi}>.AI</span>
          </h1>

          {/* Dynamic Headline Ticker */}
          <div style={styles.headlineTickerBox}>
            <span style={styles.tickerIcon}>⚡</span>
            <span key={headlineIndex} style={styles.animatedHeadline}>
              {headlines[headlineIndex]}
            </span>
          </div>

          {/* SINGLE HERO ENTRY POINT CTA BUTTON */}
          <div style={styles.singleCtaWrapper}>
            <button
              onClick={() => navigate('/register')}
              style={styles.mainHeroCta}
              title="Launch candidate portal - Register, Sign In, or Enter Unique GD Code"
            >
              <div style={styles.ctaIconBox}>
                <span style={{ fontSize: '1.75rem' }}>🚀</span>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={styles.heroCtaTitle}>Begin Candidate Journey</div>
                <div style={styles.heroCtaSub}>
                  Register with Email OTP &amp; Start Aptitude Round / Sign In with GD Code
                </div>
              </div>
              <div style={styles.ctaArrowCircle}>
                ➔
              </div>
            </button>
          </div>
        </section>

        {/* 6-Stage Recruitment Pipeline Interactive Visualizer with Canvas Beam */}
        <section style={styles.pipelineSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionPill}>INTERACTIVE ROADMAP</span>
            <h2 style={styles.sectionTitle}>6-Stage Autonomous Assessment Pathway</h2>
          </div>

          {/* Animated Canvas Holographic Pathway Component */}
          <InteractiveRoadmapCanvas />
        </section>

        {/* Global MNC Standards & Market Fit Section */}
        <section style={styles.marketSection}>
          <div style={styles.marketCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🏢</span>
              <div>
                <h3 style={styles.marketTitle}>Engineered for Global MNC &amp; University Standards</h3>
                <p style={styles.marketSub}>FAANG/MAANG, Fortune 500 Consulting, and Premier Engineering Colleges</p>
              </div>
            </div>

            <div style={styles.marketGrid}>
              <div style={styles.marketPillar}>
                <div style={styles.pillarTitle}>💻 Big Tech (FAANG / MAANG)</div>
                <p style={styles.pillarText}>
                  Rigorous testing aligned with Amazon Leadership Principles, Google analytical problem decomposition, and Meta high-velocity coding.
                </p>
              </div>

              <div style={styles.marketPillar}>
                <div style={styles.pillarTitle}>📊 Global Consulting &amp; Big 4</div>
                <p style={styles.pillarText}>
                  Assessing structured communication via STAR &amp; PESTEL frameworks, client readiness, and executive poise during GD rounds.
                </p>
              </div>

              <div style={styles.marketPillar}>
                <div style={styles.pillarTitle}>🎓 Premier College Placements</div>
                <p style={styles.pillarText}>
                  Equipping fresh graduates and students from Tier-1 and Tier-2/3 institutions to prove competence through verified talent data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    paddingBottom: '3.5rem',
    color: '#ffffff',
    overflowX: 'hidden',
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '1.25rem auto 0 auto',
    padding: '0 1.25rem',
  },
  heroHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  badgeContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(37, 99, 235, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    padding: '0.35rem 0.95rem',
    borderRadius: '999px',
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)',
    marginBottom: '0.75rem',
  },
  badgePulse: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#4ade80',
    boxShadow: '0 0 8px #4ade80',
  },
  badgeText: {
    fontSize: '0.72rem',
    fontWeight: 900,
    color: '#93c5fd',
    letterSpacing: '0.05em',
  },
  mainTitle: {
    fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)',
    fontWeight: 950,
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  titleGradient: {
    background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 40%, #c084fc 75%, #f472b6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 35px rgba(147, 197, 253, 0.3)',
  },
  titleAi: {
    color: '#38bdf8',
    textShadow: '0 0 25px rgba(56, 189, 248, 0.6)',
  },
  headlineTickerBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '0.45rem 1.1rem',
    borderRadius: '14px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
    marginBottom: '1.25rem',
  },
  tickerIcon: {
    fontSize: '1rem',
    color: '#facc15',
  },
  animatedHeadline: {
    fontSize: '0.92rem',
    fontWeight: 800,
    color: '#f1f5f9',
    letterSpacing: '-0.01em',
  },
  singleCtaWrapper: {
    width: '100%',
    maxWidth: '540px',
    display: 'flex',
    justifyContent: 'center',
    margin: '0.25rem auto 0 auto',
  },
  mainHeroCta: {
    width: '100%',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #6366f1 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '20px',
    padding: '1rem 1.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    color: '#ffffff',
    boxShadow: '0 15px 40px rgba(37, 99, 235, 0.45), 0 0 30px rgba(124, 58, 237, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaIconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  heroCtaTitle: {
    fontSize: '1.15rem',
    fontWeight: 950,
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  heroCtaSub: {
    fontSize: '0.76rem',
    color: '#e0e7ff',
    marginTop: '0.15rem',
    lineHeight: 1.35,
  },
  ctaArrowCircle: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    color: '#ffffff',
    flexShrink: 0,
  },
  pipelineSection: {
    width: '100%',
    margin: '1.75rem auto 2rem auto',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '1.25rem',
  },
  sectionPill: {
    fontSize: '0.68rem',
    fontWeight: 900,
    background: 'rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    padding: '0.15rem 0.65rem',
    borderRadius: '6px',
    letterSpacing: '0.08em',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0.35rem 0 0 0',
    letterSpacing: '-0.02em',
  },
  marketSection: {
    width: '100%',
    margin: '2rem auto 1rem auto',
  },
  marketCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '22px',
    padding: '1.75rem',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
  },
  marketTitle: {
    fontSize: '1.2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: 0,
  },
  marketSub: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    margin: '0.15rem 0 0 0',
  },
  marketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1rem',
    marginTop: '1.25rem',
  },
  marketPillar: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1rem 1.15rem',
  },
  pillarTitle: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#93c5fd',
    marginBottom: '0.3rem',
  },
  pillarText: {
    fontSize: '0.78rem',
    color: '#cbd5e1',
    lineHeight: 1.45,
    margin: 0,
  },
};

export default LandingPage;
