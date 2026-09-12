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
    backgroundColor: '#000000',
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '3rem auto 0 auto',
    padding: '0 1.25rem',
  },
  heroHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2.5rem',
  },
  badgeContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.35rem 0.95rem',
    borderRadius: '999px',
    marginBottom: '1.25rem',
  },
  badgePulse: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 0 10px #ffffff',
  },
  badgeText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#a1a1aa',
    letterSpacing: '0.02em',
  },
  mainTitle: {
    fontSize: 'clamp(3rem, 6vw, 5.5rem)',
    fontWeight: 800,
    margin: '0 0 1rem 0',
    letterSpacing: '-0.04em',
    lineHeight: 1.05,
  },
  titleGradient: {
    color: '#ffffff',
  },
  titleAi: {
    color: '#71717a',
  },
  headlineTickerBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '0.5rem 1.25rem',
    borderRadius: '999px',
    marginBottom: '2rem',
  },
  tickerIcon: {
    fontSize: '1rem',
    color: '#ffffff',
  },
  animatedHeadline: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#d4d4d8',
    letterSpacing: '-0.01em',
  },
  singleCtaWrapper: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    justifyContent: 'center',
    margin: '1rem auto 0 auto',
  },
  mainHeroCta: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid #ffffff',
    borderRadius: '999px',
    padding: '0.75rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    color: '#000000',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroCtaTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#000000',
    letterSpacing: '-0.01em',
  },
  heroCtaSub: {
    fontSize: '0.75rem',
    color: '#52525b',
    marginTop: '0.1rem',
  },
  ctaArrowCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    color: '#ffffff',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  pipelineSection: {
    width: '100%',
    margin: '4rem auto 2rem auto',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  sectionPill: {
    fontSize: '0.7rem',
    fontWeight: 600,
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#a1a1aa',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    letterSpacing: '0.05em',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: '1rem 0 0 0',
    letterSpacing: '-0.03em',
  },
  marketSection: {
    width: '100%',
    margin: '3rem auto 1rem auto',
  },
  marketCard: {
    background: 'rgba(25, 25, 25, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '2.5rem',
  },
  marketTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  marketSub: {
    fontSize: '0.85rem',
    color: '#a1a1aa',
    margin: '0.25rem 0 0 0',
  },
  marketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  marketPillar: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '1.5rem',
  },
  pillarTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#e4e4e7',
    marginBottom: '0.5rem',
  },
  pillarText: {
    fontSize: '0.85rem',
    color: '#a1a1aa',
    lineHeight: 1.5,
    margin: 0,
  },
};

export default LandingPage;
