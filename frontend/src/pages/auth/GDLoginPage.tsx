import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/client';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';

export const GDLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If redirected with code in query or state
  const initialCode = (location.state as any)?.code || new URLSearchParams(location.search).get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedCandidate, setVerifiedCandidate] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your Unique GD Access Code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await api.post('/gd-round/verify-code', { code: trimmed });
      const { candidate } = response.data;
      setVerifiedCandidate(candidate);

      setTimeout(() => {
        navigate('/gd-interview', {
          state: {
            candidateId: candidate.candidateId,
            candidateName: candidate.candidateName,
            email: candidate.email,
            phone: candidate.phone,
            track: candidate.track,
            jobRoleId: candidate.jobRoleId,
          },
        });
      }, 1000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Invalid or expired GD Access Code. You must clear the Technical / Non-Technical round first to qualify.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-main)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <GlassCanvas3D mode="mixed" />
      <IOSNavbar />

      <div style={{ maxWidth: '520px', margin: '2rem auto 0 auto', position: 'relative', zIndex: 10 }}>
        <div className="ios-glass-panel glass-box-3d animate-spring" style={{ padding: '2.5rem 2.25rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                margin: '0 auto 1rem auto',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #db2777 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
              }}
            >
              👥
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
              Group Discussion (GD) Round
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', marginTop: '0.35rem', fontWeight: 500 }}>
              Round 2 Access: Enter the <strong>Unique GD Code</strong> you earned by passing the Technical or Non-Technical qualifying interview.
            </p>
          </div>

          {errorMsg && (
            <div
              className="ios-badge"
              style={{
                display: 'block',
                background: 'rgba(248, 113, 113, 0.15)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
                color: '#f87171',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {verifiedCandidate && (
            <div
              style={{
                background: 'rgba(74, 222, 128, 0.1)',
                border: '1.5px solid #86efac',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>✅</div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '1.05rem' }}>
                {verifiedCandidate.candidateName}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#4ade80', marginTop: '0.2rem' }}>
                Track: <strong>{verifiedCandidate.track}</strong> • Verified Candidate
              </div>
              <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '0.4rem', fontWeight: 600 }}>
                🚀 Launching Multi-Agent AI Chamber...
              </div>
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '1.75rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#e2e8f0',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.04em',
                }}
              >
                Unique GD Access Code
              </label>
              <input
                type="text"
                className="ios-input glass-box-3d"
                placeholder="e.g. GD-9X2B4K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                style={{
                  fontSize: '1.2rem',
                  letterSpacing: '0.1em',
                  fontWeight: 800,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '0.5rem', textAlign: 'center' }}>
                🔑 Provided on screen and dispatched to your phone/email when you clear Round 1 (Score ≥ 60%).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !!verifiedCandidate}
              className="ios-btn"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #db2777 100%)',
                color: '#ffffff',
                boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Verifying GD Code...' : 'Enter AI Group Discussion Chamber ➔'}
            </button>
          </form>

          {/* Helper links */}
          <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.82rem', color: '#e2e8f0' }}>
            Haven't taken Round 1 yet?{' '}
            <span
              onClick={() => navigate('/login/tji')}
              style={{ color: '#60a5fa', fontWeight: 700, cursor: 'pointer' }}
            >
              Take Technical Round
            </span>{' '}
            or{' '}
            <span
              onClick={() => navigate('/login/ntji')}
              style={{ color: '#db2777', fontWeight: 700, cursor: 'pointer' }}
            >
              Non-Technical Round
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
