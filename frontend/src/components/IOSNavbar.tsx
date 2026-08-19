import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemDiagnosticModal, DiagnosticTab } from './SystemDiagnosticModal';

interface IOSNavbarProps {
  activeTrack?: string;
}

export const IOSNavbar: React.FC<IOSNavbarProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [initialDiagTab, setInitialDiagTab] = useState<DiagnosticTab>('mic');

  const isCurrent = (path: string) => location.pathname === path;

  // Determine if on TJI, NTJI, GD, Aptitude, or Interview pages to hide registration option
  const isInterviewOrAuthTrack = [
    '/login/tji',
    '/tji',
    '/login/ntji',
    '/ntji',
    '/interview',
    '/roles',
    '/gd',
    '/gd-cohort',
    '/aptitude',
    '/aptitude-round',
  ].some((p) => location.pathname.startsWith(p));

  const openDiagnostic = (tab: DiagnosticTab) => {
    setInitialDiagTab(tab);
    setDiagnosticOpen(true);
  };

  const navBtnStyle = (active: boolean, hue: string): React.CSSProperties => ({
    background: active
      ? `rgba(${hue}, 0.25)`
      : 'rgba(255, 255, 255, 0.06)',
    color: active ? '#ffffff' : '#f1f5f9',
    border: active
      ? `1.5px solid rgba(${hue}, 0.6)`
      : '1px solid rgba(255, 255, 255, 0.14)',
    padding: '0.45rem 1rem',
    borderRadius: '16px',
    fontSize: '0.84rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    backdropFilter: 'blur(12px)',
    boxShadow: active ? `0 0 20px rgba(${hue}, 0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
  });

  return (
    <>
      <nav
        className="ios-navbar animate-spring"
        style={{
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 35px -5px rgba(96, 165, 250, 0.15), 0 1px 1px rgba(255, 255, 255, 0.2) inset',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        {/* Brand Logo & Title with Live Beacon + Back Button on the Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                boxShadow: '0 0 25px rgba(124, 58, 237, 0.6), inset 0 1px 1px rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              🎙️
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.03em', color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                VOXIS<span style={{ color: '#60a5fa' }}>.AI</span>
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)',
                  color: '#93c5fd',
                  border: '1px solid rgba(96, 165, 250, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  boxShadow: '0 0 10px rgba(96, 165, 250, 0.3)',
                }}
              >
                PRO
              </span>
            </div>
          </div>

          {/* Going Back Option at the top left beside the logo */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f1f5f9',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              padding: '0.38rem 0.85rem',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            }}
            title="Go back to previous page"
          >
            <span>←</span> <span>Back</span>
          </button>
        </div>

        {/* Essential Pre-Interview Hardware Diagnostics & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* 1. Microphone Diagnostic */}
          <button
            onClick={() => openDiagnostic('mic')}
            style={navBtnStyle(false, '96, 165, 250')}
            className="glass-clickable"
            title="Test Microphone audio levels & digital boost"
          >
            🎙️ Mic Test
          </button>

          {/* 2. Camera Diagnostic */}
          <button
            onClick={() => openDiagnostic('camera')}
            style={navBtnStyle(false, '167, 139, 250')}
            className="glass-clickable"
            title="Verify webcam stream & face framing"
          >
            📹 Camera Test
          </button>

          {/* 3. Speaker Diagnostic */}
          <button
            onClick={() => openDiagnostic('speaker')}
            style={navBtnStyle(false, '74, 222, 128')}
            className="glass-clickable"
            title="Test speaker output tone & clarity"
          >
            🔊 Speaker Test
          </button>

          {/* 4. Network & System Diagnostic */}
          <button
            onClick={() => openDiagnostic('network')}
            style={navBtnStyle(false, '56, 189, 248')}
            className="glass-clickable"
            title="Check ping latency, WebRTC & system readiness"
          >
            📶 System Check
          </button>

          {/* 5. Candidate Register Button (REMOVED/HIDDEN on TJI, NTJI, GD & Interview stages) */}
          {!isInterviewOrAuthTrack && (
            <button
              onClick={() => navigate('/register')}
              style={{
                ...navBtnStyle(isCurrent('/register') || isCurrent('/signup'), '59, 130, 246'),
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.4) 0%, rgba(124, 58, 237, 0.4) 100%)',
                color: '#ffffff',
                border: '1.5px solid rgba(96, 165, 250, 0.6)',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.35)',
              }}
              className="luxury-sheen-btn glass-clickable"
              title="Candidate Account Registration"
            >
              📝 Register
            </button>
          )}

          {/* 6. Admin Console Login (Positioned at the very last) */}
          <button
            onClick={() => navigate('/login/admin')}
            style={{
              ...navBtnStyle(isCurrent('/admin') || isCurrent('/login/admin') || isCurrent('/admin/login'), '251, 191, 36'),
              background: isCurrent('/admin') || isCurrent('/login/admin') || isCurrent('/admin/login')
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(217, 119, 6, 0.4) 100%)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
              color: '#fef08a',
              border: '1.5px solid rgba(251, 191, 36, 0.55)',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), inset 0 1px 1px rgba(255,255,255,0.4)',
              marginLeft: '0.25rem',
            }}
            className="luxury-sheen-btn glass-clickable"
            title="Administrative Talent Console"
          >
            🔒 Admin Login
          </button>
        </div>
      </nav>

      {/* Global Pre-Interview System Diagnostics Modal */}
      <SystemDiagnosticModal
        isOpen={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        initialTab={initialDiagTab}
      />
    </>
  );
};

export default IOSNavbar;
