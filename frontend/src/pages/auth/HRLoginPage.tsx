import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';

export const HRLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedCandidate, setVerifiedCandidate] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your unique 6-character HR access code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await api.post('/hr-round/verify-code', { code: trimmed });
      const { candidate } = response.data;
      setVerifiedCandidate(candidate);

      setTimeout(() => {
        navigate('/interview', {
          state: {
            candidateId: candidate.candidateId,
            jobRoleId: candidate.jobRoleId,
            track: candidate.track,
            roundType: 'hr',
            matchedSkills: candidate.matchedSkills || [],
          },
        });
      }, 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Invalid or expired HR Access Code. You must clear the Group Discussion round and receive Admin approval before accessing the Executive HR round.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-hr)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <GlassCanvas3D mode="mixed" />
      {/* Background Orbs */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '12%',
          right: '10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
          animationDelay: '2.8s',
        }}
      />

      <IOSNavbar />

      <div style={{ maxWidth: '480px', margin: '2rem auto 0 auto', position: 'relative', zIndex: 10 }}>
        <div className="ios-glass-panel glass-box-3d animate-spring" style={{ padding: '2.5rem 2.25rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                margin: '0 auto 1rem auto',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 25px rgba(2, 132, 199, 0.3)',
              }}
            >
              🔑
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
              HR Round Access
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', marginTop: '0.35rem', fontWeight: 500 }}>
              Enter the unique verification code received via SMS following your initial round
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{
                background: 'rgba(248, 113, 113, 0.15)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
                borderRadius: '14px',
                padding: '0.75rem 1rem',
                color: '#fca5a5',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          {verifiedCandidate ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80' }}>
                Code Verified Successfully!
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.88rem', marginTop: '0.3rem', fontWeight: 500 }}>
                Launching your executive HR interview environment...
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerify}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Unique Verification Code
                </label>
                <input
                  type="text"
                  className="ios-input glass-box-3d"
                  style={{
                    textAlign: 'center',
                    letterSpacing: '0.2em',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '0.9rem',
                    color: '#ffffff',
                    border: '2px solid #cbd5e1',
                  }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HR-A1B2C3"
                  maxLength={20}
                  required
                />
              </div>


              {/* Hardware Diagnostic Indicator Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Pre-Flight Hardware Check
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                  <span>📹 Camera: <strong style={{ color: '#4ade80' }}>Ready</strong></span>
                  <span>🎙️ Mic: <strong style={{ color: '#4ade80' }}>Active</strong></span>
                  <span>📶 Network: <strong style={{ color: '#38bdf8' }}>Fast</strong></span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="ios-btn ios-btn-hr"
                style={{ width: '100%', fontSize: '1rem', padding: '0.95rem' }}
              >
                {loading ? 'Validating Token...' : 'Verify Code & Start HR Round ➔'}
              </button>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 500 }}>
              Didn't receive a code? Check with your recruitment coordinator or admin.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
