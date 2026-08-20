import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StageInfo {
  id: number;
  stageNum: string;
  shortLabel: string;
  icon: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  gradient: string;
  highlights: string[];
  metrics: string;
  ctaText: string;
  ctaPath: string;
}

const STAGES: StageInfo[] = [
  {
    id: 0,
    stageNum: 'STAGE 00',
    shortLabel: 'Registration',
    icon: '📝',
    title: 'Candidate Registration & Email OTP',
    subtitle: 'Secure applicant onboarding with instant 6-digit Email OTP confirmation, real-time password strength diagnostics, and step-by-step Back navigation.',
    tag: 'VERIFICATION',
    tagColor: '#60a5fa',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    highlights: ['6-Digit Instant Email OTP', 'Real-Time Strength Meter', 'Step-by-Step Back Navigation'],
    metrics: '100% Verified Identity',
    ctaText: 'Launch Registration ➔',
    ctaPath: '/register',
  },
  {
    id: 1,
    stageNum: 'STAGE 01',
    shortLabel: 'Aptitude',
    icon: '🧠',
    title: '30-Min Anti-Cheat Aptitude Round',
    subtitle: '15 adaptive intellectual questions across Mathematical Reasoning, Time/Money/Relations, and Verbal fluency with automated anti-cheat monitoring.',
    tag: 'SCREENING',
    tagColor: '#c084fc',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    highlights: ['Strict ≥ 7/15 Passing Cutoff', 'Instant Tab-Switch Disqualification', '3 Sections (Math, Logic, Verbal)'],
    metrics: '30 Mins • 15 Questions',
    ctaText: 'Take Aptitude Screening ➔',
    ctaPath: '/register',
  },
  {
    id: 2,
    stageNum: 'STAGE 02',
    shortLabel: 'GD Cohorts',
    icon: '🛡️',
    title: 'AI 5-Member Group Discussion (GD) Round',
    subtitle: 'Automated clustering of qualified candidates into distinguished teams (*Quantum Synergy*, *Nexus Vanguard*) with admin scheduling and venue email dispatches.',
    tag: 'COLLABORATION',
    tagColor: '#f472b6',
    gradient: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)',
    highlights: ['Automated 5-Candidate Cohorts', 'Venue, Date & Room Scheduling', 'Admin Performance Approvals'],
    metrics: '5 Members Per Team',
    ctaText: 'Explore GD Round ➔',
    ctaPath: '/register',
  },
  {
    id: 3,
    stageNum: 'STAGE 03',
    shortLabel: 'Access Token',
    icon: '🔑',
    title: 'Universal VOXIS-INT Access Token',
    subtitle: 'Single verified unique access token issued upon GD approval, unlocking candidate freedom to select either Technical or Non-Technical tracks.',
    tag: 'TRACK CHOICE',
    tagColor: '#fbbf24',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    highlights: ['VOXIS-INT-XXXX Format', 'Universal Track Freedom', 'Instant Candidate Portal Access'],
    metrics: 'Dual Track Unlocked',
    ctaText: 'Enter Access Token ➔',
    ctaPath: '/register',
  },
  {
    id: 4,
    stageNum: 'STAGE 04',
    shortLabel: 'TJI & NTJI',
    icon: '🎙️',
    title: 'TJI (Technical Job Interview) & NTJI (Non-Technical Job Interview) AI Rounds',
    subtitle: 'Autonomous speech interview evaluation with acoustic vocal telemetry (pitch variation, cadence, silence ratio) and live facial eye-contact proctoring.',
    tag: 'AI INTERVIEW',
    tagColor: '#4ade80',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    highlights: [
      'TJI: Technical Job Interview (English Standard)',
      'NTJI: Non-Technical Job Interview',
      'Real-Time Acoustic Pitch & Cadence Telemetry',
    ],
    metrics: '< 50ms Telemetry Latency',
    ctaText: 'Start Interview Track ➔',
    ctaPath: '/register',
  },
  {
    id: 5,
    stageNum: 'STAGE 05',
    shortLabel: 'HR Final Round',
    icon: '🏆',
    title: 'Executive HR Final Round & Intelligence Dossier',
    subtitle: 'Final stage comprehensive candidate evaluation featuring automated SWOT analysis, radar match index, video playback, and official PDF offer letter generation.',
    tag: 'FINAL ROUND',
    tagColor: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    highlights: [
      'Executive HR Performance Evaluation',
      'Automated SWOT Intelligence & Radar Scores',
      'Official PDF Offer Letter Dispatch',
    ],
    metrics: 'Final Hiring Decision',
    ctaText: 'View Candidate Journey ➔',
    ctaPath: '/register',
  },
];

export const InteractiveRoadmapCanvas: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto cycle stages every 4.5 seconds unless paused
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // Canvas Animation: Particle Energy Beam & Holographic Nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 950);
    let height = (canvas.height = 140);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 950;
      height = canvas.height = 140;
    };
    window.addEventListener('resize', handleResize);

    // Particles moving along the beam
    const particles: { x: number; t: number; speed: number; size: number; hue: number }[] = Array.from(
      { length: 30 },
      () => ({
        x: 0,
        t: Math.random(),
        speed: 0.0025 + Math.random() * 0.0035,
        size: 1.5 + Math.random() * 2.5,
        hue: [210, 260, 290, 45, 150, 195][Math.floor(Math.random() * 6)],
      })
    );

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const paddingX = Math.min(width * 0.06, 50);
      const startX = paddingX;
      const endX = width - paddingX;
      const nodeY = height / 2;
      const stageSpacing = (endX - startX) / (STAGES.length - 1);

      // 1. Draw glowing background track line
      const trackGrad = ctx.createLinearGradient(startX, 0, endX, 0);
      trackGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      trackGrad.addColorStop(0.2, 'rgba(168, 85, 247, 0.25)');
      trackGrad.addColorStop(0.4, 'rgba(236, 72, 153, 0.25)');
      trackGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)');
      trackGrad.addColorStop(0.8, 'rgba(16, 185, 129, 0.25)');
      trackGrad.addColorStop(1, 'rgba(56, 189, 248, 0.25)');

      ctx.beginPath();
      ctx.moveTo(startX, nodeY);
      ctx.lineTo(endX, nodeY);
      ctx.strokeStyle = trackGrad;
      ctx.lineWidth = 4;
      ctx.stroke();

      // 2. Draw energy progress line up to active stage
      const activeX = startX + activeStage * stageSpacing;
      const progressGrad = ctx.createLinearGradient(startX, 0, activeX, 0);
      progressGrad.addColorStop(0, '#3b82f6');
      progressGrad.addColorStop(0.5, '#c084fc');
      progressGrad.addColorStop(1, '#38bdf8');

      ctx.beginPath();
      ctx.moveTo(startX, nodeY);
      ctx.lineTo(activeX, nodeY);
      ctx.strokeStyle = progressGrad;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // 3. Render moving energy particles
      particles.forEach((p) => {
        p.t = (p.t + p.speed) % 1;
        const px = startX + p.t * (endX - startX);
        const py = nodeY + Math.sin(p.t * Math.PI * 4 + time) * 6;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, 0.85)`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, 1)`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Render Holographic Stage Nodes (00 to 05)
      STAGES.forEach((s, idx) => {
        const nx = startX + idx * stageSpacing;
        const isActive = idx === activeStage;
        const isPassed = idx < activeStage;

        // Outer pulsing ring for active node
        if (isActive) {
          const pulseR = 22 + Math.sin(time * 3) * 5;
          ctx.beginPath();
          ctx.arc(nx, nodeY, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Outer glowing aura
          const auraGrad = ctx.createRadialGradient(nx, nodeY, 0, nx, nodeY, 35);
          auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(nx, nodeY, 35, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node circle body
        ctx.beginPath();
        ctx.arc(nx, nodeY, isActive ? 15 : 10, 0, Math.PI * 2);
        if (isActive) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
        } else if (isPassed) {
          ctx.fillStyle = '#3b82f6';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Node border
        ctx.strokeStyle = isActive ? '#38bdf8' : isPassed ? '#60a5fa' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.stroke();

        // Node Number Label
        ctx.font = `${isActive ? '900 11px' : '700 9px'} sans-serif`;
        ctx.fillStyle = isActive ? '#0f172a' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`0${idx}`, nx, nodeY);

        // Stage Title below node
        ctx.font = `${isActive ? '800 10.5px' : '600 9.5px'} sans-serif`;
        ctx.fillStyle = isActive ? '#ffffff' : '#94a3b8';
        ctx.fillText(s.shortLabel, nx, nodeY + 28);
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeStage]);

  const current = STAGES[activeStage];

  return (
    <div style={styles.roadmapWrapper}>
      {/* Interactive Header & Stage Quick Selector */}
      <div style={styles.topControlRow}>
        <div style={styles.stageTabs}>
          {STAGES.map((s, idx) => {
            const isActive = idx === activeStage;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveStage(idx);
                  setIsAutoPlaying(false);
                }}
                style={{
                  ...styles.stageTabBtn,
                  background: isActive ? 'rgba(37, 99, 235, 0.35)' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                  color: isActive ? '#ffffff' : '#94a3b8',
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>{s.icon}</span>
                <span>{s.stageNum}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              setActiveStage((prev) => (prev === 0 ? STAGES.length - 1 : prev - 1));
              setIsAutoPlaying(false);
            }}
            style={styles.navArrowBtn}
            title="Previous Stage"
          >
            ←
          </button>
          <button
            onClick={() => {
              setActiveStage((prev) => (prev + 1) % STAGES.length);
              setIsAutoPlaying(false);
            }}
            style={styles.navArrowBtn}
            title="Next Stage"
          >
            ➔
          </button>
          <button
            onClick={() => setIsAutoPlaying((p) => !p)}
            style={{
              ...styles.autoPlayBtn,
              color: isAutoPlaying ? '#4ade80' : '#94a3b8',
            }}
            title={isAutoPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
          >
            {isAutoPlaying ? '⏸ Auto' : '▶ Play'}
          </button>
        </div>
      </div>

      {/* Dynamic Animated Canvas Beam */}
      <div style={styles.canvasContainer}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '140px', display: 'block' }} />
      </div>

      {/* Active Stage Holographic Glass Display Card */}
      <div
        key={current.id}
        style={styles.activeDisplayCard}
        className="animate-spring"
      >
        <div style={styles.cardHeaderRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={styles.cardIconCircle}>{current.icon}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ ...styles.cardTag, color: current.tagColor, borderColor: current.tagColor }}>
                  {current.tag}
                </span>
                <span style={styles.cardStageNum}>{current.stageNum}</span>
              </div>
              <h3 style={styles.cardTitle}>{current.title}</h3>
            </div>
          </div>

          <div style={styles.metricsBadge}>
            ⚡ {current.metrics}
          </div>
        </div>

        <p style={styles.cardSubtitle}>{current.subtitle}</p>

        {/* Feature Highlights Grid */}
        <div style={styles.highlightsGrid}>
          {current.highlights.map((h, i) => (
            <div key={i} style={styles.highlightPill}>
              <span style={{ color: current.tagColor, fontWeight: 900 }}>✓</span>
              <span>{h}</span>
            </div>
          ))}
        </div>

        {/* Action Link Row */}
        <div style={styles.cardActionRow}>
          <div style={styles.progressIndicator}>
            <span>Progress: {Math.round(((activeStage + 1) / STAGES.length) * 100)}% Complete</span>
            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${((activeStage + 1) / STAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <button
            onClick={() => navigate(current.ctaPath)}
            style={styles.cardCtaBtn}
          >
            {current.ctaText}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  roadmapWrapper: {
    width: '100%',
    maxWidth: '1050px',
    margin: '0 auto',
  },
  topControlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  stageTabs: {
    display: 'flex',
    gap: '0.45rem',
    flexWrap: 'wrap',
  },
  stageTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.42rem 0.8rem',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '0.76rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  navArrowBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 900,
  },
  autoPlayBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '0.35rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  canvasContainer: {
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '0.5rem 1rem',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
    marginBottom: '1.25rem',
  },
  activeDisplayCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    padding: '1.75rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(37, 99, 235, 0.2)',
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  cardIconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.6rem',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  cardTag: {
    fontSize: '0.68rem',
    fontWeight: 900,
    padding: '0.12rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid',
    letterSpacing: '0.06em',
  },
  cardStageNum: {
    fontSize: '0.74rem',
    fontWeight: 800,
    color: '#94a3b8',
    letterSpacing: '0.05em',
  },
  cardTitle: {
    margin: '0.2rem 0 0 0',
    fontSize: '1.28rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  metricsBadge: {
    background: 'rgba(37, 99, 235, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    color: '#93c5fd',
    padding: '0.35rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 800,
  },
  cardSubtitle: {
    fontSize: '0.92rem',
    color: '#cbd5e1',
    lineHeight: 1.55,
    margin: '0 0 1.25rem 0',
  },
  highlightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.65rem',
    marginBottom: '1.5rem',
  },
  highlightPill: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '0.55rem 0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: '#e2e8f0',
    fontWeight: 700,
  },
  cardActionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  progressIndicator: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 700,
  },
  progressBarTrack: {
    width: '180px',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #a855f7 50%, #38bdf8 100%)',
    borderRadius: '999px',
    transition: 'width 0.3s ease',
  },
  cardCtaBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
    padding: '0.65rem 1.35rem',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '0.86rem',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.2s ease',
  },
};

export default InteractiveRoadmapCanvas;
