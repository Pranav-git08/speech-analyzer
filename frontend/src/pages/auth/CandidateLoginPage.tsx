import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import { loginCandidate } from '../../utils/userStore';
import { getCandidateGDInfo, validateInterviewAccessCode } from '../../utils/gdStore';

export const CandidateLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<'password' | 'unique_code'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uniqueCode, setUniqueCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [verifiedCodeInfo, setVerifiedCodeInfo] = useState<{
    valid: boolean;
    candidateName?: string;
    email?: string;
    code: string;
  } | null>(null);

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

    // Check candidate GD status for intelligent routing
    const { candidate: gdCand } = getCandidateGDInfo(email);
    if (gdCand?.gdStatus === 'approved') {
      navigate('/gd');
    } else if (gdCand) {
      navigate('/gd');
    } else {
      navigate('/aptitude');
    }
  };

  const handleCodeEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!uniqueCode.trim()) {
      setError('Please enter your Unique Interview Code.');
      return;
    }

    const check = validateInterviewAccessCode(uniqueCode.trim());
    if (!check.valid) {
      setError('⚠️ Invalid or unrecognized Unique Code. Please check the code provided by the administrator.');
      return;
    }

    sessionStorage.setItem('VOXIS_VERIFIED_INTERVIEW_CODE', uniqueCode.trim().toUpperCase());

    // Show track selection choice screen!
    setVerifiedCodeInfo({
      valid: true,
      candidateName: check.candidateName,
      email: check.email,
      code: uniqueCode.trim().toUpperCase(),
    });
  };

  const handleLaunchTrack = (track: 'TJI' | 'NTJI') => {
    if (track === 'TJI') {
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
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={styles.iconCircle}>🔑</div>
            <h1 style={styles.title}>Candidate Portal Entry</h1>
            <p style={styles.subtitle}>
              Access your personalized AI interview portal with your credentials or unique GD access code.
            </p>
          </div>

          {verifiedCodeInfo ? (
            /* Track Decision View */
            <div>
              <div style={styles.verifiedBadgeBox}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Verified Interview Code
                </span>
                <div style={styles.verifiedCodeText}>{verifiedCodeInfo.code}</div>
                <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 800 }}>
                  ✓ Universal Access: Choose Your Preferred Track
                </span>
              </div>

              <div style={styles.trackChoiceGrid}>
                {/* Option 1: TJI */}
                <div style={styles.trackCard} onClick={() => handleLaunchTrack('TJI')}>
                  <div style={styles.trackIcon}>💻</div>
                  <h3 style={styles.trackTitle}>Technical (TJI)</h3>
                  <p style={styles.trackDesc}>
                    Frontend, Backend, Full Stack & Engineering.
                  </p>
                  <button style={styles.tjiSelectBtn}>
                    Launch TJI ➔
                  </button>
                </div>

                {/* Option 2: NTJI */}
                <div style={styles.trackCard} onClick={() => handleLaunchTrack('NTJI')}>
                  <div style={{ ...styles.trackIcon, background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' }}>🎙️</div>
                  <h3 style={styles.trackTitle}>Non-Technical (NTJI)</h3>
                  <p style={styles.trackDesc}>
                    Product, Business, Operations & Strategy.
                  </p>
                  <button style={styles.ntjiSelectBtn}>
                    Launch NTJI ➔
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setVerifiedCodeInfo(null)}
                  style={styles.switchBtn}
                >
                  ✏️ Enter a different code
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Tabs */}
              <div style={styles.tabGrid}>
                <button
                  onClick={() => { setMode('password'); setError(''); }}
                  style={{
                    ...styles.tabBtn,
                    background: mode === 'password' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'transparent',
                    color: mode === 'password' ? '#ffffff' : '#94a3b8',
                  }}
                >
                  🔑 Email & Password
                </button>
                <button
                  onClick={() => { setMode('unique_code'); setError(''); }}
                  style={{
                    ...styles.tabBtn,
                    background: mode === 'unique_code' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                    color: mode === 'unique_code' ? '#ffffff' : '#94a3b8',
                  }}
                >
                  🎟️ GD Unique Code
                </button>
              </div>

              {error && <div style={styles.errorBanner}>{error}</div>}

              {mode === 'password' ? (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={styles.label}>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. alex.smith@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: '1.75rem' }}>
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
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.submitBtn,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Authenticating...' : 'Sign In ➔'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCodeEntry}>
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <label style={{ ...styles.label, marginBottom: '0.5rem' }}>
                      Admin-Issued Unique Interview Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VOXIS-INT-8842 or VOXIS-TJI-8842"
                      value={uniqueCode}
                      onChange={(e) => setUniqueCode(e.target.value.toUpperCase())}
                      style={styles.codeInput}
                    />
                    <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Universal code for both TJI and NTJI. Enter code to choose your interview track.
                    </p>
                  </div>

                  <button
                    type="submit"
                    style={{
                      ...styles.submitBtn,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    Verify Code & Choose Track ➔
                  </button>
                </form>
              )}
            </>
          )}

          <div style={styles.footer}>
            <span>Don't have an account?</span>{' '}
            <Link to="/" style={styles.link}>
              Register New Account ➔
            </Link>
          </div>
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
  },
  contentWrapper: {
    maxWidth: '540px',
    margin: '3.5rem auto',
    padding: '0 1rem',
  },
  card: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '2.5rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  tabGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.4rem',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.3rem',
    borderRadius: '14px',
    marginBottom: '1.75rem',
  },
  tabBtn: {
    padding: '0.65rem 0.5rem',
    borderRadius: '10px',
    border: 'none',
    fontWeight: 800,
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.75rem',
    marginBottom: '1rem',
    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#f1f5f9',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#cbd5e1',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  codeInput: {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '14px',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '2px solid #fbbf24',
    color: '#fef08a',
    fontSize: '1.2rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
    textAlign: 'center',
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  showPassBtn: {
    background: 'transparent',
    border: 'none',
    color: '#93c5fd',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    padding: '0.95rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: 'none',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.35)',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    textAlign: 'center',
  },
  verifiedBadgeBox: {
    background: 'rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    borderRadius: '16px',
    padding: '1.2rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  verifiedCodeText: {
    fontSize: '1.85rem',
    fontWeight: 900,
    color: '#fef08a',
    letterSpacing: '0.08em',
    fontFamily: 'monospace',
    margin: '0.4rem 0',
  },
  trackChoiceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  trackCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '18px',
    padding: '1.25rem 1rem',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  trackIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    margin: '0 auto 0.6rem auto',
    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
  },
  trackTitle: {
    fontSize: '0.96rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.35rem 0',
  },
  trackDesc: {
    fontSize: '0.74rem',
    color: '#cbd5e1',
    lineHeight: 1.4,
    margin: '0 0 1rem 0',
    flex: 1,
  },
  tjiSelectBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.55rem 0.75rem',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  ntjiSelectBtn: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.55rem 0.75rem',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  switchBtn: {
    background: 'transparent',
    border: 'none',
    color: '#60a5fa',
    fontWeight: 800,
    fontSize: '0.84rem',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontWeight: 600,
  },
};

export default CandidateLoginPage;
