import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import { registerCandidate, isEmailRegistered } from '../../utils/userStore';
import { Track } from '../../types';

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

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

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
    const isValidFormat = /^[^s@]+@[^s@]+.[^s@]+$/.test(val.trim());
    if (isValidFormat && isEmailRegistered(val.trim())) {
      setEmailError('⚠️ This email is already registered. Please log in instead.');
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

  const handleSubmit = (e: React.FormEvent) => {
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
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }
    if (isEmailRegistered(email.trim())) {
      setFormError(`An account with email "${email.trim()}" already exists. Please log in.`);
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

  const handleProceedToInterview = () => {
    if (preferredTrack === 'TJI') {
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
        {/* Success Modal Card */}
        {registeredSuccess ? (
          <div style={styles.successCard}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Registration Successful!</h2>
            <p style={styles.successDesc}>
              Welcome, <strong style={{ color: '#ffffff' }}>{fullName}</strong>! Your candidate account with{' '}
              <strong style={{ color: '#93c5fd' }}>{email}</strong> has been registered.
            </p>

            <div style={styles.successBadgeRow}>
              <div style={styles.successBadge}>
                <span>🎯 Track:</span>
                <strong>{preferredTrack === 'TJI' ? 'Technical (TJI)' : 'Non-Technical (NTJI)'}</strong>
              </div>
              <div style={styles.successBadge}>
                <span>💼 Role:</span>
                <strong>{targetRole}</strong>
              </div>
            </div>

            <button onClick={handleProceedToInterview} style={styles.primaryBtn}>
              Proceed to Interview Room ➔
            </button>
          </div>
        ) : (
          <div style={styles.formCard}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={styles.topBadge}>
                <span>✨ CANDIDATE ONBOARDING</span>
              </div>
              <h1 style={styles.title}>Create Candidate Account</h1>
              <p style={styles.subtitle}>
                Register once with your official email to unlock AI voice assessments, live coding sandboxes, and direct HR fast-tracking.
              </p>
            </div>

            {formError && <div style={styles.errorBanner}>{formError}</div>}

            <form onSubmit={handleSubmit}>
              {/* Row 1: Name & Phone */}
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

              {/* Row 2: Email (With Live Duplicate Warning) */}
              <div style={{ marginTop: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>
                    Email Address <span style={{ color: '#f87171' }}>* (Unique per candidate)</span>
                  </label>
                  {email && !emailError && /^[^s@]+@[^s@]+.[^s@]+$/.test(email.trim()) && (
                    <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
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

              {/* Row 3: Track Selection Tabs */}
              <div style={{ marginTop: '1.25rem' }}>
                <label style={styles.label}>
                  Select Assessment Track <span style={{ color: '#f87171' }}>*</span>
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
                      <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>Technical Track (TJI)</div>
                      <div style={{ fontSize: '0.74rem', opacity: 0.8 }}>Coding, DSA, Full Stack, Backend</div>
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
                      <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>Non-Technical (NTJI)</div>
                      <div style={{ fontSize: '0.74rem', opacity: 0.8 }}>Sales, HR, Marketing, Operations</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Row 4: Target Role & Experience Level */}
              <div style={{ ...styles.grid2, marginTop: '1.2rem' }}>
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
                    <option value="Fresher" style={{ background: '#0f172a', color: '#fff' }}>
                      Fresher / Student (0 Yrs)
                    </option>
                    <option value="1-3 Years" style={{ background: '#0f172a', color: '#fff' }}>
                      Junior (1 - 3 Yrs)
                    </option>
                    <option value="3-5 Years" style={{ background: '#0f172a', color: '#fff' }}>
                      Mid-Level (3 - 5 Yrs)
                    </option>
                    <option value="5+ Years" style={{ background: '#0f172a', color: '#fff' }}>
                      Senior / Lead (5+ Yrs)
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 5: College or Company */}
              <div style={{ marginTop: '1.1rem' }}>
                <label style={styles.label}>College / Current Organization (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. IIT Bombay / TechVision Solutions Pvt. Ltd."
                  value={collegeOrCompany}
                  onChange={(e) => setCollegeOrCompany(e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Row 6: Password & Confirm Password */}
              <div style={{ ...styles.grid2, marginTop: '1.1rem' }}>
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
                    <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <div style={{ fontSize: '0.72rem', color: '#4ade80', marginTop: '0.35rem', fontWeight: 700 }}>
                      ✓ Passwords match
                    </div>
                  )}
                  {passwordsMismatch && (
                    <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.35rem', fontWeight: 700 }}>
                      ✗ Passwords do not match
                    </div>
                  )}
                </div>
              </div>

              {/* Consent Checkbox */}
              <div style={{ marginTop: '1.25rem' }}>
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !!emailError}
                style={{
                  ...styles.primaryBtn,
                  marginTop: '1.5rem',
                  opacity: submitting || emailError ? 0.6 : 1,
                  cursor: submitting || emailError ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Registering Account...' : 'Create Account & Enter Assessment ➔'}
              </button>

              {/* Footer Switch to Login */}
              <div style={styles.footerRow}>
                <span>Already have a candidate account?</span>
                <Link to="/login" style={styles.loginLink}>
                  Sign In Here ➔
                </Link>
              </div>
            </form>
          </div>
        )}
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
    maxWidth: '720px',
    margin: '2rem auto 0',
    padding: '0 1.25rem',
  },
  formCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    padding: '2.25rem 2.5rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(59, 130, 246, 0.15)',
  },
  topBadge: {
    display: 'inline-flex',
    padding: '0.35rem 0.9rem',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    color: '#93c5fd',
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.06em',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: '#cbd5e1',
    lineHeight: 1.55,
    margin: 0,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.1rem',
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
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
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
    gap: '0.85rem',
  },
  trackTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    borderRadius: '14px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  showPassBtn: {
    background: 'transparent',
    border: 'none',
    color: '#93c5fd',
    fontSize: '0.75rem',
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
    fontSize: '0.82rem',
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
  fieldError: {
    color: '#f87171',
    fontSize: '0.78rem',
    fontWeight: 700,
    marginTop: '0.35rem',
  },
  footerRow: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.88rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
  },
  loginLink: {
    color: '#60a5fa',
    fontWeight: 700,
    textDecoration: 'none',
  },
  successCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(74, 222, 128, 0.2)',
  },
  successIcon: {
    fontSize: '3.5rem',
    marginBottom: '1rem',
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.6rem 0',
  },
  successDesc: {
    fontSize: '1rem',
    color: '#cbd5e1',
    lineHeight: 1.6,
    margin: '0 0 1.75rem 0',
  },
  successBadgeRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '2rem',
  },
  successBadge: {
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

export default RegisterPage;
