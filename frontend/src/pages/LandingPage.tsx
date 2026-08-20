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
    'Enterprise-Grade Proctoring & FAANG Assessment Standards',
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

      {/* Hero Section */}
      <section style={styles.heroSection}>
        {/* Animated Pill Badge */}
        <div style={styles.badgeContainer}>
          <span style={styles.badgePulse} />
          <span style={styles.badgeText}>✨ NEXT-GEN AI MULTI-MODAL RECRUITMENT PLATFORM</span>
        </div>

        {/* BOLD ANIMATED PROJECT TITLE */}
        <h1 style={styles.mainTitle}>
          <span style={styles.titleGradient}>VOXIS</span>
          <span style={styles.titleAi}>.AI</span>
        </h1>

        {/* Dynamic Animated Subtitle Banner */}
        <div style={styles.headlineTickerBox}>
          <span style={styles.tickerIcon}>⚡</span>
          <span key={headlineIndex} style={styles.animatedHeadline}>
            {headlines[headlineIndex]}
          </span>
        </div>

        {/* Descriptive Tagline */}
        <p style={styles.heroDescription}>
          The world's most advanced autonomous talent evaluation engine. Seamlessly blending 
          <strong> AI-proctored aptitude assessments</strong>, <strong>5-member GD cohort clustering</strong>, 
          and <strong>real-time acoustic vocal speech analysis</strong> for global MNCs and elite colleges.
        </p>

        {/* SINGLE HERO ENTRY POINT CTA */}
        <div style={styles.singleCtaWrapper}>
          <button
            onClick={() => navigate('/register')}
            style={styles.mainHeroCta}
            title="Launch candidate portal - Register, Sign In, or Enter Unique GD Code"
          >
            <div style={styles.ctaIconBox}>
              <span style={{ fontSize: '2rem' }}>🚀</span>
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

        {/* Quick Platform Metrics Banner */}
        <div style={styles.metricsBar}>
          <div style={styles.metricItem}>
            <div style={styles.metricNumber}>15 Qs</div>
            <div style={styles.metricLabel}>Anti-Cheat Aptitude Round</div>
          </div>
          <div style={styles.metricDivider} />
          <div style={styles.metricItem}>
            <div style={styles.metricNumber}>5 Members</div>
            <div style={styles.metricLabel}>Automated GD Cohorts</div>
          </div>
          <div style={styles.metricDivider} />
          <div style={styles.metricItem}>
            <div style={styles.metricNumber}>VOXIS-INT</div>
            <div style={styles.metricLabel}>Universal Track Tokens</div>
          </div>
          <div style={styles.metricDivider} />
          <div style={styles.metricItem}>
            <div style={styles.metricNumber}>&lt; 50ms</div>
            <div style={styles.metricLabel}>Real-Time Acoustic Telemetry</div>
          </div>
        </div>
      </section>

      {/* 5-Stage Recruitment Pipeline Interactive Visualizer with Canvas Beam */}
      <section style={styles.pipelineSection}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionPill}>INTERACTIVE ROADMAP</span>
          <h2 style={styles.sectionTitle}>5-Stage Autonomous Assessment Pathway</h2>
          <p style={styles.sectionDesc}>
            Explore the holographic candidate journey. Select any stage station below or let the energy beam guide you through the process:
          </p>
        </div>

        {/* Animated Canvas Holographic Pathway Component */}
        <InteractiveRoadmapCanvas />
      </section>

      {/* Global MNC Standards & Market Fit Section */}
      <section style={styles.marketSection}>
        <div style={styles.marketCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🏢</span>
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
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    paddingBottom: '5rem',
    color: '#ffffff',
    overflowX: 'hidden',
  },
  heroSection: {
    maxWidth: '1200px',
    margin: '3.5rem auto 2rem auto',
    padding: '0 1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  badgeContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: 'rgba(37, 99, 235, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    padding: '0.45rem 1.1rem',
    borderRadius: '999px',
    boxShadow: '0 0 25px rgba(37, 99, 235, 0.25)',
    marginBottom: '1.5rem',
  },
  badgePulse: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ade80',
    boxShadow: '0 0 10px #4ade80',
  },
  badgeText: {
    fontSize: '0.78rem',
    fontWeight: 900,
    color: '#93c5fd',
    letterSpacing: '0.06em',
  },
  mainTitle: {
    fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
    fontWeight: 950,
    margin: '0 0 1rem 0',
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  titleGradient: {
    background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 40%, #c084fc 75%, #f472b6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 40px rgba(147, 197, 253, 0.3)',
  },
  titleAi: {
    color: '#38bdf8',
    textShadow: '0 0 30px rgba(56, 189, 248, 0.6)',
  },
  headlineTickerBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    padding: '0.65rem 1.4rem',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    marginBottom: '1.75rem',
  },
  tickerIcon: {
    fontSize: '1.1rem',
    color: '#facc15',
  },
  animatedHeadline: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#f1f5f9',
    letterSpacing: '-0.01em',
  },
  heroDescription: {
    maxWidth: '780px',
    fontSize: '1.12rem',
    color: '#cbd5e1',
    lineHeight: 1.65,
    margin: '0 auto 2.75rem auto',
    fontWeight: 400,
  },
  singleCtaWrapper: {
    width: '100%',
    maxWidth: '560px',
    marginBottom: '3.5rem',
    display: 'flex',
    justifyContent: 'center',
  },
  mainHeroCta: {
    width: '100%',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #6366f1 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '24px',
    padding: '1.4rem 1.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    cursor: 'pointer',
    color: '#ffffff',
    boxShadow: '0 20px 50px rgba(37, 99, 235, 0.5), 0 0 35px rgba(124, 58, 237, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaIconBox: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  heroCtaTitle: {
    fontSize: '1.25rem',
    fontWeight: 950,
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  heroCtaSub: {
    fontSize: '0.82rem',
    color: '#e0e7ff',
    marginTop: '0.25rem',
    lineHeight: 1.4,
  },
  ctaArrowCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    color: '#ffffff',
    flexShrink: 0,
  },
  metricsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1000px',
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(25px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '1.5rem 2rem',
    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  metricItem: {
    textAlign: 'center',
  },
  metricNumber: {
    fontSize: '1.75rem',
    fontWeight: 950,
    background: 'linear-gradient(135deg, #60a5fa 0%, #c084fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  metricLabel: {
    fontSize: '0.76rem',
    color: '#94a3b8',
    fontWeight: 700,
    marginTop: '0.2rem',
  },
  metricDivider: {
    width: '1px',
    height: '35px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  pipelineSection: {
    maxWidth: '1280px',
    margin: '4rem auto 3rem auto',
    padding: '0 1.5rem',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  sectionPill: {
    fontSize: '0.72rem',
    fontWeight: 900,
    background: 'rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    padding: '0.2rem 0.75rem',
    borderRadius: '6px',
    letterSpacing: '0.08em',
  },
  sectionTitle: {
    fontSize: '2.2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0.6rem 0 0.4rem 0',
    letterSpacing: '-0.02em',
  },
  sectionDesc: {
    fontSize: '0.95rem',
    color: '#94a3b8',
    maxWidth: '680px',
    margin: '0 auto',
  },
  marketSection: {
    maxWidth: '1280px',
    margin: '3rem auto 2rem auto',
    padding: '0 1.5rem',
  },
  marketCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '24px',
    padding: '2.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
  },
  marketTitle: {
    fontSize: '1.35rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: 0,
  },
  marketSub: {
    fontSize: '0.84rem',
    color: '#94a3b8',
    margin: '0.2rem 0 0 0',
  },
  marketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
    marginTop: '1.5rem',
  },
  marketPillar: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.25rem',
  },
  pillarTitle: {
    fontSize: '0.95rem',
    fontWeight: 800,
    color: '#93c5fd',
    marginBottom: '0.4rem',
  },
  pillarText: {
    fontSize: '0.82rem',
    color: '#cbd5e1',
    lineHeight: 1.5,
    margin: 0,
  },
};

export default LandingPage;
