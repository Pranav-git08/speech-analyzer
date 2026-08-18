import React, { useState } from 'react';
import { SystemDiagnosticModal } from '../components/SystemDiagnosticModal';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { IOSNavbar } from '../components/IOSNavbar';

const MicTestPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-main)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
      }}
    >
      <GlassCanvas3D mode="mixed" />
      <IOSNavbar />

      <div
        style={{
          maxWidth: '640px',
          margin: '3rem auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
        className="animate-spring"
      >
        <div
          className="ios-glass-panel glass-box-3d"
          style={{ padding: '2.5rem 2rem', border: '1.5px solid rgba(96, 165, 250, 0.4)' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛠️</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem', color: '#ffffff' }}>
            Pre-Interview System Diagnostics
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Test and verify your microphone voice gain, webcam lighting &amp; face centering, spatial speaker audio output, and network connection speed before starting your assessment.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="ios-btn ios-btn-tji"
              style={{ padding: '0.85rem 1.8rem', fontSize: '0.95rem' }}
            >
              🚀 Launch Full Diagnostics
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.85rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <SystemDiagnosticModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab="mic"
      />
    </div>
  );
};

export default MicTestPage;
