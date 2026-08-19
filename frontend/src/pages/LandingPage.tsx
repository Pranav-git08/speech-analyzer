import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { sendOtpEmail } from '../utils/emailService';
import {
  registerCandidate,
  loginCandidate,
  isEmailRegistered,
  sendRegistrationOTP,
  verifyRegistrationOTP,
} from '../utils/userStore';
import { getCandidateGDInfo, validateInterviewAccessCode } from '../utils/gdStore';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'register' | 'signin' | 'code_entry'
  const [mode, setMode] = useState<'register' | 'signin' | 'code_entry'>('register');

  // Registration step: 'form' | 'otp' | 'success'
  const [regStep, setRegStep] = useState<'form' | 'otp' | 'success'>('form');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP states
  const [enteredOTP, setEnteredOTP] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Unique Code Direct Entry
  const [directCode, setDirectCode] = useState('');
  const [codeError, setCodeError] = useState('');

  // Feedback states
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (regStep === 'otp' && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [regStep, resendTimer]);

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

  // Step 1: Send OTP to candidate's Email & Phone
  const handleInitiateOTP = (e: React.FormEvent) => {
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
      setFormError('Please enter a valid email address (e.g. alex.smith@example.com).');
      return;
    }
    if (isEmailRegistered(email.trim())) {
      setFormError(`An account with email "${email.trim()}" is already registered. Please switch to Sign In.`);
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter your phone number.');
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

    setSubmitting(true);
    const otp = sendRegistrationOTP(email, phone);
    sendOtpEmail(email, fullName, otp);

    setResendTimer(60);
    setEnteredOTP('');
    setOtpError('');
    setSubmitting(false);
    setRegStep('otp');
  };

  // Step 2: Resend OTP
  const handleResendOTP = () => {
    if (resendTimer > 0) return;
    const otp = sendRegistrationOTP(email, phone);
    sendOtpEmail(email, fullName, otp);
    setResendTimer(60);
    setOtpError('');
  };

  // Step 3: Verify OTP and finalize Registration
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (!enteredOTP.trim() || enteredOTP.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    setSubmitting(true);
    const verification = verifyRegistrationOTP(email, enteredOTP);

    if (!verification.valid) {
      setSubmitting(false);
      setOtpError(verification.error || 'Invalid OTP code. Please check your email inbox.');
      return;
    }

    const result = registerCandidate({
      fullName,
      email,
      phone,
      password,
    });

    setSubmitting(false);

    if (!result.success) {
      setOtpError(result.error || 'Registration failed.');
      return;
    }

    setRegStep('success');
  };

  // Intelligent Sign In Handler
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

    // Check candidate's GD & Aptitude status for intelligent routing
    const { candidate: gdCand } = getCandidateGDInfo(signInEmail);

    if (gdCand?.gdStatus === 'approved' && gdCand.uniqueInterviewCode) {
      // Approved in GD -> go to GD Portal with unlocked interview
      navigate('/gd');
    } else if (gdCand) {
      // In GD Cohort -> go to GD portal
      navigate('/gd');
    } else {
      // New / Standard candidate -> go to Aptitude round
      navigate('/aptitude');
    }
  };

  // Direct Unique Access Code Entry Handler
  const handleDirectCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');

    if (!directCode.trim()) {
      setCodeError('Please enter your Unique Access Code (e.g. VOXIS-TJI-8842 or VOXIS-NTJI-7419).');
      return;
    }

    const check = validateInterviewAccessCode(directCode.trim());
    if (!check.valid) {
      setCodeError('⚠️ Invalid or unrecognized Unique Code. Please check the code provided in your GD approval email.');
      return;
    }

    // Store verified code in session
    sessionStorage.setItem('VOXIS_VERIFIED_INTERVIEW_CODE', directCode.trim().toUpperCase());

    if (check.track === 'NTJI') {
      navigate('/login/ntji');
    } else {
      navigate('/login/tji');
    }
  };

  const handleProceedToAssessment = () => {
    navigate('/aptitude');
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

      {/* Main Content Area */}
      <main style={styles.mainWrapper}>
        {regStep === 'success' ? (
          /* SUCCESS SCREEN */
          <div style={styles.successCard}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Email Verified & Registered!</h2>
            <p style={styles.successDesc}>
              Welcome, <strong style={{ color: '#ffffff' }}>{fullName}</strong>! Your candidate account has been created.
            </p>

            <button onClick={handleProceedToAssessment} style={styles.primaryBtn}>
              Enter Stage 1: Aptitude Assessment Round ➔
            </button>
          </div>
        ) : regStep === 'otp' ? (
          /* OTP VERIFICATION VIEW (CODE IS IN USER'S EMAIL) */
          <div style={styles.authCard}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={styles.iconCircle}>📬</div>
              <h1 style={styles.authTitle}>Check Your Email</h1>
              <p style={styles.authSubtitle}>
                We have sent a 6-digit confirmation code to:
              </p>
              <div style={styles.emailBadge}>{email}</div>
              <p style={{ ...styles.authSubtitle, fontSize: '0.82rem', marginTop: '0.5rem', color: '#94a3b8' }}>
                Please check your inbox (and Spam/Junk folder) and enter the code below.
              </p>
            </div>

            {otpError && <div style={styles.errorBanner}>{otpError}</div>}

            <form onSubmit={handleVerifyOTP}>
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <label style={{ ...styles.label, marginBottom: '0.75rem' }}>Enter 6-Digit Email OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="• • • • • •"
                  value={enteredOTP}
                  onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, ''))}
                  style={styles.otpInput}
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
                {submitting ? 'Verifying Code...' : 'Verify OTP & Complete Registration ➔'}
              </button>

              <div style={styles.footerNote}>
                {resendTimer > 0 ? (
                  <span style={{ color: '#94a3b8' }}>Resend email code in {resendTimer}s</span>
                ) : (
                  <button type="button" onClick={handleResendOTP} style={styles.switchBtn}>
                    🔄 Resend OTP Email
                  </button>
                )}
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setRegStep('form');
                    setOtpError('');
                  }}
                  style={styles.switchBtn}
                >
                  ✏️ Change Email
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* MAIN FORM CARD (REGISTER, SIGN IN, OR DIRECT CODE ENTRY) */
          <div style={styles.authCard}>
            {/* Mode Switcher Tabs */}
            <div style={styles.tabContainer}>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError('');
                  setCodeError('');
                }}
                style={{
                  ...styles.tabBtn,
                  background: mode === 'register' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'transparent',
                  color: mode === 'register' ? '#ffffff' : '#94a3b8',
                  boxShadow: mode === 'register' ? '0 4px 15px rgba(37, 99, 235, 0.4)' : 'none',
                }}
              >
                📝 Register
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setFormError('');
                  setCodeError('');
                }}
                style={{
                  ...styles.tabBtn,
                  background: mode === 'signin' ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : 'transparent',
                  color: mode === 'signin' ? '#ffffff' : '#94a3b8',
                  boxShadow: mode === 'signin' ? '0 4px 15px rgba(37, 99, 235, 0.4)' : 'none',
                }}
              >
                🔑 Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('code_entry');
                  setFormError('');
                  setCodeError('');
                }}
                style={{
                  ...styles.tabBtn,
                  background: mode === 'code_entry' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                  color: mode === 'code_entry' ? '#ffffff' : '#94a3b8',
                  boxShadow: mode === 'code_entry' ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none',
                }}
              >
                🎟️ Unique Code
              </button>
            </div>

            {/* Title & Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 style={styles.authTitle}>
                {mode === 'register'
                  ? 'Candidate Registration'
                  : mode === 'signin'
                  ? 'Candidate Sign In'
                  : 'GD-Approved Interview Entry'}
              </h1>
              <p style={styles.authSubtitle}>
                {mode === 'register'
                  ? 'Submit your details to receive an email confirmation OTP and create your account.'
                  : mode === 'signin'
                  ? 'Enter your registered email and password to access your assessment.'
                  : 'Enter the unique access code given by the administrator after clearing Aptitude & GD.'}
              </p>
            </div>

            {formError && <div style={styles.errorBanner}>{formError}</div>}
            {codeError && <div style={styles.errorBanner}>{codeError}</div>}

            {/* ── MODE 1: REGISTRATION ── */}
            {mode === 'register' && (
              <form onSubmit={handleInitiateOTP}>
                {/* Full Name */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.label}>
                    Full Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Email Address (Unique) */}
                <div style={{ marginBottom: '1rem' }}>
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
                    placeholder="e.g. alex.smith@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    style={{
                      ...styles.input,
                      borderColor: emailError ? '#f87171' : undefined,
                    }}
                  />
                  {emailError && <div style={styles.fieldError}>{emailError}</div>}
                </div>

                {/* Phone Number */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.label}>
                    Phone Number <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (555) 234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Password & Confirm Password */}
                <div style={{ ...styles.grid2, marginBottom: '1.25rem' }}>
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

                {/* Submit to Send OTP */}
                <button
                  type="submit"
                  disabled={submitting || !!emailError}
                  style={{
                    ...styles.primaryBtn,
                    opacity: submitting || emailError ? 0.6 : 1,
                    cursor: submitting || emailError ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Sending OTP to Email...' : 'Send Confirmation OTP to Email ➔'}
                </button>

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
                    Sign In ➔
                  </button>
                </div>
              </form>
            )}

            {/* ── MODE 2: SIGN IN ── */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={styles.label}>Registered Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex.smith@example.com"
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
                  {submitting ? 'Signing In...' : 'Sign In & Access Assessment ➔'}
                </button>

                {/* Quick Link to Unique Code entry */}
                <div style={styles.uniqueCodePromptBox}>
                  <div style={{ fontSize: '0.84rem', color: '#fef08a', fontWeight: 800, marginBottom: '0.3rem' }}>
                    🎟️ Cleared GD & Received an Admin Unique Code?
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('code_entry');
                      setFormError('');
                    }}
                    style={styles.enterCodeLinkBtn}
                  >
                    Click Here to Enter with Unique Code ➔
                  </button>
                </div>

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
                    Register Here ➔
                  </button>
                </div>
              </form>
            )}

            {/* ── MODE 3: DIRECT UNIQUE CODE ENTRY (GD APPROVED) ── */}
            {mode === 'code_entry' && (
              <form onSubmit={handleDirectCodeSubmit}>
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <label style={{ ...styles.label, marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                    Admin-Provided Unique Interview Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VOXIS-TJI-8842 or VOXIS-NTJI-7419"
                    value={directCode}
                    onChange={(e) => setDirectCode(e.target.value.toUpperCase())}
                    style={styles.codeInput}
                  />
                  <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    This unique code is dispatched to your registered email upon being approved in the Group Discussion round.
                  </p>
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.primaryBtn,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  Verify Code & Launch Interview Room ➔
                </button>

                <div style={styles.footerNote}>
                  <span>Return to standard login?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setCodeError('');
                    }}
                    style={styles.switchBtn}
                  >
                    Candidate Sign In ➔
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
    maxWidth: '1100px',
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
    maxWidth: '580px',
    margin: '2.5rem auto 0 auto',
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
    gridTemplateColumns: '1fr 1fr 1.2fr',
    gap: '0.4rem',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.35rem',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '1.75rem',
  },
  tabBtn: {
    padding: '0.65rem 0.4rem',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 800,
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  iconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.6rem',
    marginBottom: '0.85rem',
    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
  },
  authTitle: {
    fontSize: '1.85rem',
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
  emailBadge: {
    display: 'inline-block',
    background: 'rgba(96, 165, 250, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    padding: '0.35rem 1rem',
    borderRadius: '999px',
    fontWeight: 800,
    fontSize: '0.92rem',
    marginTop: '0.5rem',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
  codeInput: {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '14px',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '2px solid #fbbf24',
    color: '#fef08a',
    fontSize: '1.25rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    textAlign: 'center',
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
    boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
  },
  otpInput: {
    width: '240px',
    margin: '0 auto',
    display: 'block',
    padding: '0.85rem 1rem',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '2px solid #60a5fa',
    color: '#ffffff',
    fontSize: '1.5rem',
    fontWeight: 900,
    letterSpacing: '0.45em',
    textAlign: 'center',
    outline: 'none',
    boxShadow: '0 0 20px rgba(96, 165, 250, 0.3)',
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
  uniqueCodePromptBox: {
    marginTop: '1.25rem',
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    textAlign: 'center',
  },
  enterCodeLinkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fef08a',
    fontWeight: 900,
    fontSize: '0.86rem',
    cursor: 'pointer',
    textDecoration: 'underline',
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
    gap: '0.5rem',
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
    fontSize: '1.9rem',
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
};

export default LandingPage;
