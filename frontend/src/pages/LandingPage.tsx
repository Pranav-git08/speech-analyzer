import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IOSNavbar } from '../components/IOSNavbar';
import GlassCanvas3D from '../components/GlassCanvas3D';

// ── Interactive 3D Magnetic Tilt Card Component ──────────────────────────────
interface TiltCardProps {
  children: React.ReactNode;
  borderColor: string;
  gradientBg: string;
  onClick?: () => void;
}

const TiltCard: React.FC<TiltCardProps> = ({ children, borderColor, gradientBg, onClick }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, glareX, glareY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.025 : 1}, ${isHovered ? 1.025 : 1}, 1)`,
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      className="luxury-glass-card-premium cursor-pointer"
    >
      <div
        style={{
          padding: '2.4rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '440px',
          border: `1.5px solid ${borderColor}`,
          background: gradientBg,
          position: 'relative',
          borderRadius: '28px',
          overflow: 'hidden',
        }}
      >
        {/* Dynamic Interactive Specular Glare Follower */}
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle 280px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.18), transparent 70%)`,
              mixBlendMode: 'overlay',
              zIndex: 1,
            }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-main)',
        padding: '1.25rem',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* 3D Floating Glass & Particle Canvas Background */}
      <GlassCanvas3D mode="mixed" intensity={1.25} />

      {/* Top Floating Glass Navigation Bar */}
      <IOSNavbar />

      <div style={{ maxWidth: '1200px', margin: '0.5rem auto 4rem auto', position: 'relative', zIndex: 10 }}>
        
        {/* ── 1. Candidate Motivation & Confidence Booster Ticker ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
            padding: '0.55rem 1.6rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
            borderRadius: '999px',
            border: '1.5px solid rgba(167, 139, 250, 0.35)',
            maxWidth: '920px',
            margin: '0 auto 2.25rem auto',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(167, 139, 250, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '1rem' }}>🔥</span>
            <strong style={{ fontSize: '0.82rem', color: '#fef08a', fontWeight: 900, letterSpacing: '0.02em' }}>
              YOUR STAGE TO SHINE
            </strong>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#e2e8f0' }}>
            <span>⚡</span>
            <strong style={{ color: '#60a5fa', fontWeight: 800 }}>100% Merit-Based</strong>
            <span style={{ color: '#cbd5e1' }}>Zero Bias Evaluation</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#e2e8f0' }}>
            <span>🎯</span>
            <strong style={{ color: '#86efac', fontWeight: 800 }}>Skills Over Resume</strong>
            <span style={{ color: '#cbd5e1' }}>Real Practical Talent</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#e2e8f0' }}>
            <span>🚀</span>
            <strong style={{ color: '#f472b6', fontWeight: 800 }}>Direct Fast-Track</strong>
            <span style={{ color: '#cbd5e1' }}>Instant HR Offer Round</span>
          </div>
        </div>

        {/* ── 2. Cinematic Hero Section ── */}
        <div style={{ textAlign: 'center', marginBottom: '3.75rem' }} className="animate-spring">
          {/* Holographic Iridescent Badge */}
          <div
            className="luxury-glow-badge animate-border-glow"
            style={{
              padding: '0.55rem 1.6rem',
              fontSize: '0.9rem',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🤖 Autonomous recruitment by Pranav 🔥😎</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.4vw, 4.4rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              maxWidth: '920px',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <span className="animated-mood-title">
              Autonomous AI
            </span>
            <span className="animated-mood-subtitle">
              Next-Gen Recruitment
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.2rem',
              color: '#e2e8f0',
              maxWidth: '720px',
              margin: '0 auto 2.25rem auto',
              lineHeight: 1.65,
              fontWeight: 500,
              textShadow: '0 2px 10px rgba(0,0,0,0.6)',
            }}
          >
            Step into an interview built to highlight your true superpower. Real-time conversational AI designed to evaluate your practical skills fairly, celebrate your knowledge, and fast-track you directly to leadership rounds.
          </p>

          {/* Live Audio Visualizer Wave Simulation in Hero */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              background: 'rgba(15, 23, 42, 0.75)',
              borderRadius: '999px',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              boxShadow: '0 0 25px rgba(96, 165, 250, 0.25)',
              marginBottom: '2.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#93c5fd' }}>
              🎙️ LIVE SYNTHESIS ENGINE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '20px' }}>
              {[12, 22, 16, 26, 18, 28, 14, 24, 19, 27, 15, 23].map((h, i) => (
                <div
                  key={i}
                  className="soundwave-bar"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    height: `${h}px`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80' }}>
              HD 48kHz
            </span>
          </div>

          {/* Registration & Login Quick CTA */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            <button
              onClick={() => navigate('/register')}
              className="luxury-sheen-btn"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '0.85rem 1.75rem',
                borderRadius: '16px',
                fontSize: '0.98rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(37, 99, 235, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>📝</span> Register as New Candidate ➔
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '0.85rem 1.6rem',
                borderRadius: '16px',
                fontSize: '0.98rem',
                fontWeight: 800,
                cursor: 'pointer',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>🔑</span> Candidate Sign In
            </button>
          </div>
        </div>

        {/* ── 3. The 3 Core Masterclass Interview Tracks (Interactive 3D Magnetic Tilt Cards) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.75rem',
            marginBottom: '4rem',
          }}
        >
          {/* Card 1: Technical Track (TJI) */}
          <TiltCard
            borderColor="rgba(96, 165, 250, 0.4)"
            gradientBg="linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.25) 100%)"
            onClick={() => navigate('/login/tji')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span
                  style={{
                    background: 'rgba(96, 165, 250, 0.2)',
                    color: '#93c5fd',
                    border: '1px solid rgba(96, 165, 250, 0.5)',
                    padding: '0.3rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                  }}
                >
                  ⚡ ROUND 1 • TECHNICAL
                </span>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 800 }}>
                  ● LIVE SANDBOX
                </span>
              </div>

              <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>⚡</div>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Technical Track (TJI)
              </h2>
              <p style={{ color: '#e2e8f0', fontSize: '0.94rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
                Adaptive software engineering evaluation with live code execution, data structures, algorithms, and real-time voice proctoring.
              </p>
            </div>

            <div>
              {/* Feature Tags */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                {['Live Code Runner', 'DSA & System Design', 'Python / JS / Java / C++', 'Sub-100ms Voice AI'].map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/login/tji');
                }}
                className="luxury-sheen-btn"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  fontWeight: 900,
                  padding: '0.95rem 1.75rem',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 30px rgba(37, 99, 235, 0.5), inset 0 1px 1px rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
              >
                Launch Technical Round ➔
              </button>
            </div>
          </TiltCard>

          {/* Card 2: Non-Technical Track (NTJI) */}
          <TiltCard
            borderColor="rgba(167, 139, 250, 0.4)"
            gradientBg="linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(88, 28, 135, 0.25) 100%)"
            onClick={() => navigate('/login/ntji')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span
                  style={{
                    background: 'rgba(167, 139, 250, 0.2)',
                    color: '#c084fc',
                    border: '1px solid rgba(167, 139, 250, 0.5)',
                    padding: '0.3rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                  }}
                >
                  🌐 ROUND 1 • GLOBAL TRACK
                </span>
                <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 800 }}>
                  ● 12+ LANGUAGES
                </span>
              </div>

              <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🌐</div>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Non-Technical Track (NTJI)
              </h2>
              <p style={{ color: '#e2e8f0', fontSize: '0.94rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
                Evaluates product, marketing, finance, and operations talent with multilingual voice synthesis, behavioral logic, and communication poise.
              </p>
            </div>

            <div>
              {/* Feature Tags */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                {['Multilingual AI', 'Cognitive Fluency Radar', 'Behavioral Scenarios', 'Clarity Index'].map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/login/ntji');
                }}
                className="luxury-sheen-btn"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  fontWeight: 900,
                  padding: '0.95rem 1.75rem',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 30px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
              >
                Launch Global Round ➔
              </button>
            </div>
          </TiltCard>

          {/* Card 3: Executive HR Round */}
          <TiltCard
            borderColor="rgba(74, 222, 128, 0.4)"
            gradientBg="linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(6, 78, 59, 0.25) 100%)"
            onClick={() => navigate('/login/hr')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span
                  style={{
                    background: 'rgba(74, 222, 128, 0.2)',
                    color: '#86efac',
                    border: '1px solid rgba(74, 222, 128, 0.5)',
                    padding: '0.3rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                  }}
                >
                  🏛️ STAGE 2 • PASSCODE REQUIRED
                </span>
                <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 800 }}>
                  ● EXECUTIVE FINAL
                </span>
              </div>

              <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🏛️</div>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Executive HR Round
              </h2>
              <p style={{ color: '#e2e8f0', fontSize: '0.94rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
                Executive leadership appraisal, corporate culture alignment, and compensation negotiation for qualified Stage-1 candidates.
              </p>
            </div>

            <div>
              {/* Feature Tags */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                {['Culture & Leadership Fit', 'Compensation Analysis', 'Passcode-Protected', 'Instant Offer Generation'].map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/login/hr');
                }}
                className="luxury-sheen-btn"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  fontWeight: 900,
                  padding: '0.95rem 1.75rem',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 30px rgba(5, 150, 105, 0.5), inset 0 1px 1px rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
              >
                Enter HR Executive Room ➔
              </button>
            </div>
          </TiltCard>
        </div>

        {/* ── 4. Candidate Experience & Interactive Intelligence Showcases ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
            marginBottom: '3.5rem',
          }}
        >
          {/* Showcase 1: Conversational AI & Poise Radar */}
          <div className="feature-interactive-card glass-clickable">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)',
                  border: '1.5px solid rgba(96, 165, 250, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  boxShadow: '0 0 20px rgba(96, 165, 250, 0.3)',
                }}
              >
                🎙️
              </div>
              {/* Animated Live Voice Orb */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: 'rgba(96, 165, 250, 0.15)',
                  border: '1px solid rgba(96, 165, 250, 0.35)',
                }}
              >
                {[10, 18, 14, 22, 12].map((h, i) => (
                  <div
                    key={i}
                    className="soundwave-bar"
                    style={{
                      animationDelay: `${i * 0.15}s`,
                      height: `${h}px`,
                      width: '3px',
                      background: '#60a5fa',
                    }}
                  />
                ))}
                <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 800, marginLeft: '0.2rem' }}>
                  ADAPTIVE
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>
              Natural Duplex Voice Mentor
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Speak freely and naturally. The AI adapts to your speaking pace, lets you clarify your thoughts without pressure, and evaluates your practical problem-solving logic.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['🗣️ Interruption-Friendly', '🎯 Thought Clarity Radar', '🌐 Multi-Dialect Support'].map((t, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(96, 165, 250, 0.1)',
                    color: '#93c5fd',
                    border: '1px solid rgba(96, 165, 250, 0.25)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Showcase 2: Smart Skill Recognition */}
          <div className="feature-interactive-card glass-clickable">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
                  border: '1.5px solid rgba(167, 139, 250, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  boxShadow: '0 0 20px rgba(167, 139, 250, 0.3)',
                }}
              >
                🧠
              </div>
              {/* Dynamic Skill Match Indicator */}
              <div
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.35)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#c084fc',
                }}
              >
                ✨ 100% MERIT-DRIVEN
              </div>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>
              Real Skills, Zero Keyword Traps
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              No automated rejection for missing resume buzzwords. The system detects your authentic engineering, leadership, and operational strengths through live scenario challenges.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['📄 Beyond Keyword Traps', '⚖️ Unbiased Evaluation', '💻 Live Sandbox Compiler'].map((t, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(167, 139, 250, 0.1)',
                    color: '#c084fc',
                    border: '1px solid rgba(167, 139, 250, 0.25)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Showcase 3: Fast-Track Offer Pipeline */}
          <div className="feature-interactive-card glass-clickable">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)',
                  border: '1.5px solid rgba(251, 191, 36, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
                }}
              >
                🏆
              </div>
              {/* Glowing Seal Badge */}
              <div
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: '#fef08a',
                }}
              >
                ★ FAST-TRACK OFFER
              </div>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>
              Instant Dossier &amp; Fast-Track Offer
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Say goodbye to weeks of waiting. Receive immediate SWOT strengths feedback and unlock direct passcode access to the executive HR round for final offer alignment.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['📊 Instant SWOT Radar', '🏛️ 1-Click HR Passcode', '⚡ Zero-Ghosting Pipeline'].map((t, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    color: '#fef08a',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 5. Enterprise Trust & Security Footer Badges ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#4ade80' }}>✔</span>
            <span>SOC-2 Type II Certified</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#60a5fa' }}>🔒</span>
            <span>WebRTC 256-Bit Encrypted</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#c084fc' }}>⚡</span>
            <span>Zero-Knowledge Biometric Vault</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#fbbf24' }}>★</span>
            <span>Enterprise SLA 99.99%</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
