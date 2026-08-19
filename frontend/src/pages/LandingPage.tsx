import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { registerCandidate, loginCandidate, isEmailRegistered } from '../utils/userStore';
import { Track } from '../types';

const ROLES_BY_TRACK: Record<Track, string[]> = {
  TJI: [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Software Development Engineer (SDE)',
    'DevOps / Cloud Engineer',
  ],
  NTJI: [
    'Senior Sales Executive',
    'HR Executive / Talent Acquisition',
    'Marketing Specialist',
    'Customer Success Manager',
    'Business Development Executive',
  ],
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'register' (default) or 'signin'
  const [mode, setMode] = useState<'register' | 'signin'>('register');

  // Registration form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [preferredTrack, setPreferredTrack] = useState<Track>('TJI');
  const [targetRole, setTargetRole] = useState(ROLES_BY_TRACK.TJI[0]);
  const [experienceLevel, setExperienceLevel] = useState('1-3 Years');
  const [collegeOrCompany, setCollegeOrCompany] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Sign in form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Feedback states
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Real-time email uniqueness check
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val.trim()) {
      setEmailError('');
      return;
    }
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    if (isValidFormat && isEmailRegistered(val.trim())) {
      setEmailError('⚠️ This email is already registered. Please switch to Sign In.');
    } else {
      setEmailError('');
    }
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'None', color: '#94a3b8' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#f87171' };
    if (score <= 4) return { score: 2, label: 'Good', color: '#fbbf24' };
    return { score: 3, label: 'Strong', color: '#4ade80' };
  };

  const strength = getPasswordStrength();
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleTrackChange = (track: Track) => {
    setPreferredTrack(track);
    setTargetRole(ROLES_BY_TRACK[track][0]);
  };

  // Handle Registration Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }
    if (isEmailRegistered(email.trim())) {
      setFormError(`An account with email "${email.trim()}" is already registered. Please switch to Sign In.`);
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreeTerms) {
      setFormError('Please accept the candidate evaluation terms to proceed.');
      return;
    }

    setSubmitting(true);

    const result = registerCandidate({
      fullName,
      email,
      phone,
      password,
      preferredTrack,
      targetRole,
      experienceLevel,
      collegeOrCompany,
    });

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Registration failed.');
      return;
    }

    setRegisteredSuccess(true);
  };

  // Handle Sign In Submit
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!signInEmail.trim()) {
      setFormError('Please enter your registered email.');
      return;
    }
    if (!signInPassword) {
      setFormError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    const result = loginCandidate(signInEmail, signInPassword);
    setSubmitting(false);

    if (!result.success || !result.user) {
      setFormError(result.error || 'Invalid email or password.');
      return;
    }

    // Direct to assessment room
    if (result.user.preferredTrack === 'TJI') {
      navigate('/login/tji');
    } else {
      navigate('/login/ntji');
    }
  };

  const handleProceedToAssessment = () => {
    if (preferredTrack === 'TJI') {
      navigate('/login/tji');
    } else {
      navigate('/login/ntji');
    }
  };

  return (
    <div style={styles.pageContainer}>
      <GlassCanvas3D mode="mixed" intensity={1.2} />

      {/* Top Floating Glass Header */}
      <header style={styles.topHeader}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>🎙️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={styles.logoText}>VOXIS<span style={{ color: '#60a5fa' }}>.AI</span></span>
            <span style={styles.proPill}>PRO</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/login/admin')}
            style={styles.adminNavBtn}
            title="Administrative Talent Console"
          >
            🔒 Admin Login
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={styles.mainWrapper}>
        {registeredSuccess ? (
          /* Success Screen */
          <div style={styles.successCard}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Registration Complete!</h2>
            <p style={styles.successDesc}>
              Welcome, <strong style={{ color: '#ffffff' }}>{fullName}</strong>! Your candidate account with{' '}
              <strong style={{ color: '#93c5fd' }}>{email}</strong> is ready.
            </p>

            <div style={styles.badgeRow}>
              <div style={styles.infoBadge}>
                <span>🎯 Track:</span>
                <strong>{preferredTrack === 'TJI' ? 'Technical (TJI)' : 'Non-Technical (NTJI)'}</strong>
              </div>
              <div style={styles.infoBadge}>
                <span>💼 Role:</span>
                <strong>{targetRole}</strong>
              </div>
            </div>

            <button onClick={handleProceedToAssessment} style={styles.primaryBtn}>
              Enter Interview Room ➔
            </button>
          </div>
        ) : (
          /* Main Auth Card (Register or Sign In) */
          <div style={styles.authCard}>
            {/* Mode Switcher Tabs */}
            <div style={styles.tabContainer}>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError('');
                }}
                style={{
                  ...styles.tabBtn,
                  background: mode === 'register' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'transparent',
                  color: mode === 'register' ? '#ffffff' : '#94a3b8',
                  boxShadow: mode === 'register' ? '0 4px 15px rgba(37, 99, 235, 0.4)' : 'none',
                }}
              >
                📝 Register (New Candidate)
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setFormError('');
                }}
                style={{
                  ...styles.tabBtn,
                  background: mode === 'signin' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'transparent',
                  color: mode === 'signin' ? '#ffffff' : '#94a3b8',
                  boxShadow: mode === 'signin' ? '0 4px 15px rgba(37, 99, 235, 0.4)' : 'none',
                }}
              >
                🔑 Already Registered? Sign In
              </button>
            </div>

            {/* Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 style={styles.authTitle}>
                {mode === 'register' ? 'Candidate Registration' : 'Candidate Sign In'}
              </h1>
              <p style={styles.authSubtitle}>
                {mode === 'register'
                  ? 'Register once with your official email to access the autonomous AI evaluation portal.'
                  : 'Enter your registered email and password to jump straight into your assessment.'}
              </p>
            </div>

            {formError && <div style={styles.errorBanner}>{formError}</div>}

            {/* MODE 1: REGISTRATION FORM */}
            {mode === 'register' ? (
              <form onSubmit={handleRegisterSubmit}>
                {/* Full Name & Phone */}
                <div style={styles.grid2}>
                  <div>
                    <label style={styles.label}>
                      Full Name <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Srinivas Pranav Vaidyam"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 95910 50952"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Email (Unique Enforcement) */}
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.label}>
                      Email Address <span style={{ color: '#f87171' }}>* (Unique per candidate)</span>
                    </label>
                    {email && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                      <span style={{ fontSize: '0.74rem', color: '#4ade80', fontWeight: 700 }}>
                        ✓ Email available
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. pranavvaidyam08@gmail.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    style={{
                      ...styles.input,
                      borderColor: emailError ? '#f87171' : undefined,
                    }}
                  />
                  {emailError && <div style={styles.fieldError}>{emailError}</div>}
                </div>

                {/* Track Selection */}
                <div style={{ marginTop: '1.1rem' }}>
                  <label style={styles.label}>
                    Assessment Track <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={styles.trackTabs}>
                    <button
                      type="button"
                      onClick={() => handleTrackChange('TJI')}
                      style={{
                        ...styles.trackTabBtn,
                        background:
                          preferredTrack === 'TJI'
                            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.4) 0%, rgba(29, 78, 216, 0.5) 100%)'
                            : 'rgba(255, 255, 255, 0.04)',
                        borderColor: preferredTrack === 'TJI' ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                        color: preferredTrack === 'TJI' ? '#ffffff' : '#cbd5e1',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>⚡</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Technical Track (TJI)</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Frontend, Backend, Full Stack, SDE</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTrackChange('NTJI')}
                      style={{
                        ...styles.trackTabBtn,
                        background:
                          preferredTrack === 'NTJI'
                            ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.4) 0%, rgba(126, 34, 206, 0.5) 100%)'
                            : 'rgba(255, 255, 255, 0.04)',
                        borderColor: preferredTrack === 'NTJI' ? '#c084fc' : 'rgba(255, 255, 255, 0.1)',
                        color: preferredTrack === 'NTJI' ? '#ffffff' : '#cbd5e1',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🌐</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Non-Technical (NTJI)</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Sales, HR, Marketing, Operations</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Role & Experience */}
                <div style={{ ...styles.grid2, marginTop: '1.1rem' }}>
                  <div>
                    <label style={styles.label}>Target Job Role</label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      style={styles.select}
                    >
                      {ROLES_BY_TRACK[preferredTrack].map((r) => (
                        <option key={r} value={r} style={{ background: '#0f172a', color: '#fff' }}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      style={styles.select}
                    >
                      <option value="Fresher" style={{ background: '#0f172a', color: '#fff' }}>Fresher / Student (0 Yrs)</option>
                      <option value="1-3 Years" style={{ background: '#0f172a', color: '#fff' }}>Junior (1 - 3 Yrs)</option>
                      <option value="3-5 Years" style={{ background: '#0f172a', color: '#fff' }}>Mid-Level (3 - 5 Yrs)</option>
                      <option value="5+ Years" style={{ background: '#0f172a', color: '#fff' }}>Senior / Lead (5+ Yrs)</option>
                    </select>
                  </div>
                </div>

                {/* College / Organization */}
                <div style={{ marginTop: '1rem' }}>
                  <label style={styles.label}>College / Current Organization (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TechVision Solutions Pvt. Ltd. / IIT"
                    value={collegeOrCompany}
                    onChange={(e) => setCollegeOrCompany(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Password & Confirm */}
                <div style={{ ...styles.grid2, marginTop: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={styles.label}>
                        Password <span style={{ color: '#f87171' }}>*</span>
                      </label>
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
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.input}
                    />

                    {password && (
                      <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={styles.strengthTrack}>
                          <div
                            style={{
                              height: '100%',
                              width: strength.score === 1 ? '33%' : strength.score === 2 ? '66%' : '100%',
                              background: strength.color,
                              borderRadius: '4px',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 700 }}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={styles.label}>
                      Confirm Password <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        ...styles.input,
                        borderColor: passwordsMismatch ? '#f87171' : passwordsMatch ? '#4ade80' : undefined,
                      }}
                    />
                    {passwordsMatch && (
                      <div style={{ fontSize: '0.72rem', color: '#4ade80', marginTop: '0.3rem', fontWeight: 700 }}>
                        ✓ Passwords match
                      </div>
                    )}
                    {passwordsMismatch && (
                      <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.3rem', fontWeight: 700 }}>
                        ✗ Passwords do not match
                      </div>
                    )}
                  </div>
                </div>

                {/* Consent */}
                <div style={{ marginTop: '1.2rem' }}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                    />
                    <span>
                      I consent to AI voice evaluation, proctoring telemetry, and recruitment scoring under the assessment charter.
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !!emailError}
                  style={{
                    ...styles.primaryBtn,
                    marginTop: '1.4rem',
                    opacity: submitting || emailError ? 0.6 : 1,
                    cursor: submitting || emailError ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Registering...' : 'Register & Enter Interview Room ➔'}
                </button>

                {/* Switch to Sign In */}
                <div style={styles.footerNote}>
                  <span>Already registered?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setFormError('');
                    }}
                    style={styles.switchBtn}
                  >
                    Click Here to Sign In ➔
                  </button>
                </div>
              </form>
            ) : (
              /* MODE 2: SIGN IN FORM */
              <form onSubmit={handleSignInSubmit}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={styles.label}>Registered Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. pranavvaidyam08@gmail.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.label}>Password</label>
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      style={styles.showPassBtn}
                    >
                      {showSignInPassword ? '👁️ Hide' : '👁️ Show'}
                    </button>
                  </div>
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.primaryBtn,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Signing In...' : 'Sign In & Enter Interview Room ➔'}
                </button>

                {/* Switch to Register */}
                <div style={styles.footerNote}>
                  <span>Need a new account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setFormError('');
                    }}
                    style={styles.switchBtn}
                  >
                    Click Here to Register ➔
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    paddingBottom: '3rem',
  },
  topHeader: {
    maxWidth: '1200px',
    margin: '1rem auto 0 auto',
    padding: '0.75rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    boxShadow: '0 0 15px rgba(37, 99, 235, 0.5)',
  },
  logoText: {
    fontSize: '1.2rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  proPill: {
    fontSize: '0.62rem',
    fontWeight: 900,
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    background: 'rgba(96, 165, 250, 0.2)',
    color: '#93c5fd',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    textTransform: 'uppercase',
  },
  adminNavBtn: {
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
    color: '#fef08a',
    border: '1px solid rgba(251, 191, 36, 0.4)',
    borderRadius: '12px',
    padding: '0.45rem 1rem',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  mainWrapper: {
    maxWidth: '680px',
    margin: '2rem auto 0 auto',
    padding: '0 1.25rem',
  },
  authCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    padding: '2.25rem 2.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(37, 99, 235, 0.15)',
  },
  tabContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.35rem',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '1.75rem',
  },
  tabBtn: {
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  authTitle: {
    fontSize: '1.9rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.4rem 0',
    letterSpacing: '-0.02em',
  },
  authSubtitle: {
    fontSize: '0.88rem',
    color: '#cbd5e1',
    lineHeight: 1.5,
    margin: 0,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '0.35rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  trackTabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  trackTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.75rem 0.85rem',
    borderRadius: '12px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  showPassBtn: {
    background: 'transparent',
    border: 'none',
    color: '#93c5fd',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  strengthTrack: {
    flex: 1,
    height: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    fontSize: '0.8rem',
    color: '#cbd5e1',
    lineHeight: 1.45,
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
    fontSize: '0.98rem',
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
    fontSize: '0.85rem',
    fontWeight: 700,
    marginBottom: '1.25rem',
  },
  fieldError: {
    color: '#f87171',
    fontSize: '0.76rem',
    fontWeight: 700,
    marginTop: '0.35rem',
  },
  footerNote: {
    marginTop: '1.4rem',
    textAlign: 'center',
    fontSize: '0.86rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.4rem',
  },
  switchBtn: {
    background: 'transparent',
    border: 'none',
    color: '#60a5fa',
    fontWeight: 800,
    fontSize: '0.86rem',
    cursor: 'pointer',
  },
  successCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(74, 222, 128, 0.35)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(74, 222, 128, 0.2)',
  },
  successIcon: {
    fontSize: '3.5rem',
    marginBottom: '0.75rem',
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  successDesc: {
    fontSize: '0.96rem',
    color: '#cbd5e1',
    lineHeight: 1.6,
    margin: '0 0 1.75rem 0',
  },
  badgeRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '2rem',
  },
  infoBadge: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    fontSize: '0.84rem',
    color: '#e2e8f0',
    display: 'flex',
    gap: '0.4rem',
  },
};

export default LandingPage;
