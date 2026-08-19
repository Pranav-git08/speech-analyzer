import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import { loginCandidate } from '../../utils/userStore';

export const CandidateLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const result = loginCandidate(email, password);
    setLoading(false);

    if (!result.success || !result.user) {
      setError(result.error || 'Login failed. Please check your credentials.');
      return;
    }

    // Redirect to candidate's track
    if (result.user.preferredTrack === 'TJI') {
      navigate('/login/tji');
    } else {
      navigate('/login/ntji');
    }
  };

  return (
    <div style={styles.pageContainer}>
      <GlassCanvas3D mode="mixed" />
      <IOSNavbar />

      <div style={styles.contentWrapper}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={styles.iconCircle}>🔑</div>
            <h1 style={styles.title}>Candidate Sign In</h1>
            <p style={styles.subtitle}>
              Access your personalized AI interview portal with your registered credentials.
            </p>
          </div>

          {error && <div style={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={styles.label}>Registered Email</label>
              <input
                type="email"
                required
                placeholder="e.g. pranavvaidyam08@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.showPassBtn}
                >
                  {showPassword ? '👁️ Hide' : '👁️ Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.primaryBtn,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In & Enter Portal ➔'}
            </button>

            {/* Switch to Register */}
            <div style={styles.footerRow}>
              <span>New candidate without an account?</span>
              <Link to="/register" style={styles.registerLink}>
                Register Here ➔
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    paddingBottom: '4rem',
  },
  contentWrapper: {
    maxWidth: '480px',
    margin: '3.5rem auto 0',
    padding: '0 1.25rem',
  },
  card: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    padding: '2.5rem 2.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(59, 130, 246, 0.15)',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.75rem',
    marginBottom: '1rem',
    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
  },
  title: {
    fontSize: '1.85rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.4rem 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#cbd5e1',
    lineHeight: 1.5,
    margin: 0,
  },
  label: {
    display: 'block',
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontSize: '0.94rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  showPassBtn: {
    background: 'transparent',
    border: 'none',
    color: '#93c5fd',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryBtn: {
    width: '100%',
    padding: '0.95rem 1.5rem',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    fontWeight: 800,
    fontSize: '1rem',
    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.86rem',
    fontWeight: 700,
    marginBottom: '1.25rem',
  },
  footerRow: {
    marginTop: '1.75rem',
    textAlign: 'center',
    fontSize: '0.88rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
  },
  registerLink: {
    color: '#60a5fa',
    fontWeight: 700,
    textDecoration: 'none',
  },
};

export default CandidateLoginPage;
