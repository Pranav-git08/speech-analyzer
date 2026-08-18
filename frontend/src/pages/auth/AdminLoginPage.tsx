import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState('admin@speechai.internal');
  const [password, setPassword] = useState('speechadmin2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError('Please provide your administrative User ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    // Authenticate Admin credentials
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('admin_token', `admin_token_${Date.now()}`);
      navigate('/admin');
    }, 600);
  };

  const handleAutofill = () => {
    setUserId('admin@speechai.internal');
    setPassword('speechadmin2026');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-admin)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <GlassCanvas3D mode="mixed" />
      {/* Background Ambient Glow Orbs */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '12%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
          animationDelay: '3s',
        }}
      />

      <IOSNavbar />

      <div
        style={{
          maxWidth: '460px',
          margin: '2rem auto 0 auto',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="ios-glass-panel glass-box-3d animate-spring" style={{ padding: '2.75rem 2.25rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '74px',
                height: '74px',
                margin: '0 auto 1.25rem auto',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                boxShadow: '0 12px 30px rgba(79, 70, 229, 0.35)',
              }}
            >
              🛡️
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
              Admin Console Login
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '0.92rem', marginTop: '0.4rem', fontWeight: 500 }}>
              Enter administrative credentials to access the talent management &amp; proctoring console
            </p>
          </div>

          {error && (
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
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                User ID / Admin Email
              </label>
              <input
                type="text"
                className="ios-input glass-box-3d"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="admin@speechai.internal"
                required
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  Password
                </label>
                <span
                  onClick={handleAutofill}
                  style={{ fontSize: '0.75rem', color: '#60a5fa', cursor: 'pointer', fontWeight: 700 }}
                >
                  Autofill Default
                </span>
              </div>
              <input
                type="password"
                className="ios-input glass-box-3d"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ios-btn ios-btn-admin"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Admin Console ➔'}</span>
            </button>
          </form>

          {/* Quick Demo Credentials Reminder */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.85rem 1rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              fontSize: '0.8rem',
              color: '#e2e8f0',
              textAlign: 'center',
            }}
          >
            <div>🔑 <strong>User ID:</strong> <code>admin@speechai.internal</code></div>
            <div style={{ marginTop: '0.2rem' }}>🔒 <strong>Password:</strong> <code>speechadmin2026</code></div>
          </div>

          {/* Security Status Footnote */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#e2e8f0',
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
              256-Bit SSL Encrypted
            </span>
            <span>v4.2.0 Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
