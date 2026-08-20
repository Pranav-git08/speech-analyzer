import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { getCurrentUser } from '../utils/userStore';
import { getCandidateGDInfo, enrollCandidateInGD, GDCohort, GDCandidateMember } from '../utils/gdStore';

export const GDCandidatePortalPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // Intake / Verification Form state
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('Student / Final Year');
  const [customProfession, setCustomProfession] = useState('');
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // GD Cohort & Candidate status
  const [cohort, setCohort] = useState<GDCohort | null>(null);
  const [candidate, setCandidate] = useState<GDCandidateMember | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [formError, setFormError] = useState('');

  // Initial load - Pre-populate form fields from logged in candidate but ALWAYS show the form first
  useEffect(() => {
    const activeEmail = email || currentUser?.email;
    if (activeEmail) {
      const { candidate: cand } = getCandidateGDInfo(activeEmail);
      if (cand) {
        if (cand.fullName && !fullName) setFullName(cand.fullName);
        if (cand.email && !email) setEmail(cand.email);
        if (cand.phone && !phone) setPhone(cand.phone);
        if (cand.address && !address) setAddress(cand.address);
        if (cand.targetRole) setProfession(cand.targetRole);
      }
    }
  }, [currentUser]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid registered email address.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter your phone number.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please enter your residential address / city.');
      return;
    }

    const finalProfession = profession === 'Other' ? (customProfession || 'Other') : profession;

    // Get aptitude score if recorded
    let aptScore = 12;
    try {
      const savedScore = localStorage.getItem('SPEECH_ANALYZER_LAST_SCORE');
      if (savedScore) aptScore = parseInt(savedScore, 10) || 12;
    } catch {}

    enrollCandidateInGD({
      id: currentUser?.id || `cand-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      aptitudeScore: aptScore,
      aptitudeTotal: 15,
      preferredTrack: currentUser?.preferredTrack || 'TJI',
      targetRole: finalProfession,
    });

    const { cohort: updatedCohort, candidate: updatedCand } = getCandidateGDInfo(email.trim().toLowerCase());
    setCohort(updatedCohort);
    setCandidate(updatedCand);
    setIsFormSubmitted(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const isApproved = candidate?.gdStatus === 'approved';
  const isRejected = candidate?.gdStatus === 'rejected';
  const isScheduled = cohort?.status === 'scheduled' || !!cohort?.schedule;

  return (
    <div style={styles.pageContainer}>
      <GlassCanvas3D mode="mixed" intensity={1.2} />

      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={styles.logoIcon}>🎙️</div>
            <span style={styles.logoText}>VOXIS<span style={{ color: '#60a5fa' }}>.AI</span></span>
            <span style={styles.stagePill}>STAGE 02: GD (GROUP DISCUSSION) ROUND</span>
          </div>
          <button
            onClick={() => {
              if (isFormSubmitted && !currentUser) {
                setIsFormSubmitted(false);
              } else if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            style={styles.backBtn}
            title="Go back to previous screen"
          >
            ← Back
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={styles.candBadge}>👤 {fullName || currentUser?.fullName || 'Candidate'}</span>
          <button onClick={() => navigate('/')} style={styles.homeBtn}>Home</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainWrapper}>
        {/* ── STEP 1: INTAKE & BASIC DETAILS CONFIRMATION FORM ── */}
        {!isFormSubmitted ? (
          <div style={styles.formCard} className="animate-spring">
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={styles.gdIconBadge}>👥</div>
              <span style={styles.formPill}>STAGE 02 INTAKE</span>
              <h1 style={styles.formTitle}>Group Discussion (GD) Profile Verification</h1>
              <p style={styles.formSubtitle}>
                Congratulations on clearing the Aptitude Round! Please verify your basic registered details to be placed into your AI 5-member GD Cohort.
              </p>
            </div>

            {formError && (
              <div style={styles.errorBanner}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={styles.formGrid}>
              {/* Full Name */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Full Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  required
                  style={styles.textInput}
                />
              </div>

              {/* Registered Email ID */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Registered Email Address <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. candidate@university.edu"
                  required
                  style={styles.textInput}
                />
                <span style={styles.inputHint}>
                  Venue date, time, and room details will be officially dispatched to this email.
                </span>
              </div>

              {/* Phone Number */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Phone / Mobile Number <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  required
                  style={styles.textInput}
                />
              </div>

              {/* Residential Address / City */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Candidate Address / City <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 142 Tech Innovation Blvd, Apt 4B, Seattle, WA 98101"
                  required
                  rows={2}
                  style={{ ...styles.textInput, resize: 'vertical' }}
                />
              </div>

              {/* Current Working / Profession */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  Current Working / Profession <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="Student / Final Year">🎓 Student / Final Year Undergrad</option>
                  <option value="Postgraduate / Master's Student">📚 Postgraduate / Master's Student</option>
                  <option value="Working Professional (Software / Tech)">💻 Working Professional (Software / Tech)</option>
                  <option value="Working Professional (Business / Non-Tech)">📊 Working Professional (Business / Non-Tech)</option>
                  <option value="Fresher / Active Job Seeker">🚀 Fresher / Active Job Seeker</option>
                  <option value="Other">💼 Other (Specify below)</option>
                </select>
              </div>

              {profession === 'Other' && (
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Specify Current Profession / Role</label>
                  <input
                    type="text"
                    value={customProfession}
                    onChange={(e) => setCustomProfession(e.target.value)}
                    placeholder="e.g. Freelance Consultant / Data Analyst"
                    style={styles.textInput}
                  />
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                style={styles.submitBtn}
              >
                <span>🛡️ Confirm Details &amp; Enter GD Cohort</span>
                <span style={{ fontSize: '1.1rem' }}>➔</span>
              </button>
            </form>
          </div>
        ) : (
          /* ── STEP 2: COHORT DETAILS, SCHEDULE & STATUS DASHBOARD ── */
          <div>
            {/* ── CASE 1: APPROVED BY ADMIN (GOOD PERFORMANCE) ── */}
            {isApproved && candidate?.uniqueInterviewCode ? (
              <div style={styles.approvedCard}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏆</div>
                <h1 style={styles.cardTitle}>GD Round Cleared &amp; Approved!</h1>
                <p style={styles.cardSubtitle}>
                  Congratulations, <strong style={{ color: '#ffffff' }}>{candidate.fullName}</strong>! The administrative evaluation team approved your performance in <strong style={{ color: '#93c5fd' }}>{cohort?.teamName}</strong>.
                </p>

                {/* Unique Interview Access Code Display */}
                <div style={styles.codeRevealBox}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Your Official Interview Access Code
                  </span>
                  <div style={styles.codeDisplay}>
                    {candidate.uniqueInterviewCode}
                  </div>
                  <button
                    onClick={() => handleCopyCode(candidate.uniqueInterviewCode!)}
                    style={styles.copyBtn}
                  >
                    {copiedCode ? '✓ Copied to Clipboard!' : '📋 Copy Access Code'}
                  </button>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    This universal code has also been emailed to <strong>{candidate.email}</strong>. Use it to enter either interview track.
                  </p>
                </div>

                {/* Navigation to TJI or NTJI */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate('/login/tji')}
                    style={styles.primaryActionBtn}
                  >
                    Launch Technical Job Interview (TJI) ➔
                  </button>
                  <button
                    onClick={() => navigate('/login/ntji')}
                    style={styles.secondaryActionBtn}
                  >
                    Launch Non-Technical Interview (NTJI) ➔
                  </button>
                </div>
              </div>
            ) : isRejected ? (
              /* ── CASE 2: REJECTED FEEDBACK ── */
              <div style={styles.rejectedCard}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>💙</div>
                <h1 style={styles.rejectedTitle}>Assessment Feedback &amp; Update</h1>
                <p style={styles.rejectedSubtitle}>
                  VOXIS.AI Group Discussion Evaluation for <strong style={{ color: '#ffffff' }}>{cohort?.teamName}</strong>
                </p>

                <div style={styles.motivationalBox}>
                  <h3 style={{ margin: '0 0 0.6rem 0', color: '#93c5fd', fontSize: '1.05rem', fontWeight: 800 }}>
                    🌱 Thank You for Your Dedication &amp; Participation
                  </h3>
                  <p style={{ margin: '0 0 0.85rem 0', color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    Dear <strong>{candidate?.fullName || 'Candidate'}</strong>, thank you for your active participation and valuable perspectives during the Group Discussion round. While you demonstrated good engagement and articulation, due to exceptionally high cohort competition, we are unable to advance your candidacy to the next interview round in this hiring cycle.
                  </p>
                  <blockquote style={styles.quoteBox}>
                    <em>"Every setback is a setup for a greater comeback."</em>
                  </blockquote>
                  <p style={{ margin: '0.85rem 0 0 0', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    We truly appreciate the effort you invested with us. Please continue sharpening your domain skills, leadership presence, and technical acumen—we look forward to welcoming your application in future recruitment cycles!
                  </p>
                </div>

                <button onClick={() => navigate('/')} style={styles.returnHomeBtn}>
                  Return to Candidate Home
                </button>
              </div>
            ) : (
              /* ── CASE 3: SCHEDULED / PENDING GD VIEW ── */
              <div style={styles.statusCard}>
                <div style={styles.teamHeaderBox}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                  <span style={styles.cohortTag}>AI ASSIGNED GD COHORT</span>
                  <h1 style={styles.teamTitle}>{cohort?.teamName || 'Cohort Alpha: Quantum Synergy'}</h1>
                  <p style={styles.teamDesc}>
                    You have been placed into this 5-candidate professional discussion group based on your verified aptitude performance.
                  </p>
                  
                  {/* Verified Candidate Profile Bar */}
                  <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <span style={styles.profileChip}>👤 {candidate?.fullName || fullName}</span>
                    <span style={styles.profileChip}>📧 {candidate?.email || email}</span>
                    <span style={styles.profileChip}>📱 {candidate?.phone || phone}</span>
                    {candidate?.address && <span style={styles.profileChip}>📍 {candidate.address}</span>}
                    <span style={styles.profileChip}>💼 {candidate?.targetRole || profession}</span>
                  </div>

                  <div style={{ marginTop: '0.85rem' }}>
                    <button
                      onClick={() => setIsFormSubmitted(false)}
                      style={styles.editDetailsBtn}
                    >
                      ✏️ Edit My Contact, Address &amp; Profession
                    </button>
                  </div>
                </div>

                {/* Venue & Schedule Card */}
                {isScheduled && cohort?.schedule ? (
                  <div style={styles.schedulePassBox}>
                    <div style={styles.scheduleHeaderRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>🎟️</span>
                        <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>Official GD Session Pass</strong>
                      </div>
                      <span style={styles.confirmedPill}>✓ Venue Confirmed</span>
                    </div>

                    <div style={styles.scheduleGrid}>
                      <div style={styles.scheduleItem}>
                        <span style={styles.scheduleLabel}>📅 Date</span>
                        <strong style={styles.scheduleVal}>{cohort.schedule.date}</strong>
                      </div>
                      <div style={styles.scheduleItem}>
                        <span style={styles.scheduleLabel}>⏰ Time</span>
                        <strong style={styles.scheduleVal}>{cohort.schedule.time}</strong>
                      </div>
                      <div style={styles.scheduleItem}>
                        <span style={styles.scheduleLabel}>📍 Venue Location</span>
                        <strong style={styles.scheduleVal}>{cohort.schedule.location}</strong>
                      </div>
                      <div style={styles.scheduleItem}>
                        <span style={styles.scheduleLabel}>🚪 Room Number</span>
                        <strong style={{ ...styles.scheduleVal, color: '#fef08a' }}>{cohort.schedule.roomNumber}</strong>
                      </div>
                    </div>

                    <div style={styles.invitationNotice}>
                      📧 Official invitations with these venue details have been dispatched to your email (<strong>{candidate?.email || email}</strong>).
                    </div>
                  </div>
                ) : (
                  <div style={styles.pendingScheduleBox}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>⏳</div>
                    <strong style={{ color: '#fef08a', fontSize: '0.98rem' }}>
                      Awaiting Administrative Venue &amp; Time Slot Assignment
                    </strong>
                    <p style={{ margin: '0.4rem 0 0 0', color: '#cbd5e1', fontSize: '0.86rem' }}>
                      The administrative proctor is currently scheduling the date, time, and room number for <strong>{cohort?.teamName}</strong>. You will receive an email notification the moment the schedule is confirmed.
                    </p>
                  </div>
                )}

                {/* 5-Member Team Roster */}
                <div style={styles.teamRosterBox}>
                  <div style={styles.rosterHeaderRow}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: 900 }}>
                      👥 5-Member Cohort Roster ({cohort?.candidates.length || 0} / 5 Assigned)
                    </h3>
                    <span style={styles.rosterTag}>AI BALANCED PEERS</span>
                  </div>

                  <div style={styles.candidateGrid}>
                    {cohort?.candidates.map((cand, idx) => {
                      const isMe = cand.email.toLowerCase() === (email || currentUser?.email || '').toLowerCase();
                      return (
                        <div
                          key={cand.id || idx}
                          style={{
                            ...styles.candidateCard,
                            borderColor: isMe ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                            background: isMe ? 'rgba(37, 99, 235, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ ...styles.avatarCircle, background: isMe ? '#2563eb' : 'rgba(255, 255, 255, 0.12)' }}>
                              {cand.fullName.charAt(0)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>{cand.fullName}</strong>
                                {isMe && <span style={styles.youBadge}>YOU</span>}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                                {cand.targetRole || 'Candidate'}
                              </div>
                            </div>
                          </div>

                          <div style={styles.candScoreTag}>
                            Aptitude: {cand.aptitudeScore}/{cand.aptitudeTotal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
    paddingBottom: '4rem',
    color: '#ffffff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 900,
    color: '#ffffff',
  },
  stagePill: {
    fontSize: '0.72rem',
    fontWeight: 900,
    background: 'rgba(236, 72, 153, 0.2)',
    color: '#f472b6',
    border: '1px solid rgba(236, 72, 153, 0.4)',
    padding: '0.2rem 0.65rem',
    borderRadius: '6px',
    letterSpacing: '0.06em',
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#f1f5f9',
    padding: '0.35rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  candBadge: {
    fontSize: '0.84rem',
    color: '#cbd5e1',
    fontWeight: 700,
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.35rem 0.8rem',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  homeBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    padding: '0.35rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  mainWrapper: {
    maxWidth: '850px',
    margin: '2.5rem auto',
    padding: '0 1.25rem',
  },
  formCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    padding: '2.5rem 2rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(236, 72, 153, 0.2)',
  },
  gdIconBadge: {
    fontSize: '2.8rem',
    marginBottom: '0.5rem',
  },
  formPill: {
    fontSize: '0.72rem',
    fontWeight: 900,
    background: 'rgba(236, 72, 153, 0.2)',
    color: '#f472b6',
    border: '1px solid rgba(236, 72, 153, 0.4)',
    padding: '0.2rem 0.75rem',
    borderRadius: '6px',
    letterSpacing: '0.08em',
  },
  formTitle: {
    fontSize: '1.8rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0.6rem 0 0.4rem 0',
  },
  formSubtitle: {
    fontSize: '0.9rem',
    color: '#cbd5e1',
    maxWidth: '620px',
    margin: '0 auto',
    lineHeight: 1.55,
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '0.86rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  inputLabel: {
    fontSize: '0.84rem',
    fontWeight: 800,
    color: '#e2e8f0',
  },
  textInput: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  selectInput: {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  inputHint: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.15rem',
  },
  submitBtn: {
    marginTop: '0.75rem',
    background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '14px',
    padding: '1.05rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.65rem',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(219, 39, 119, 0.4)',
  },
  statusCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    padding: '2.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
  },
  teamHeaderBox: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  cohortTag: {
    fontSize: '0.7rem',
    fontWeight: 900,
    background: 'rgba(236, 72, 153, 0.2)',
    color: '#f472b6',
    border: '1px solid rgba(236, 72, 153, 0.4)',
    padding: '0.2rem 0.75rem',
    borderRadius: '6px',
    letterSpacing: '0.08em',
  },
  teamTitle: {
    fontSize: '1.9rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0.6rem 0 0.4rem 0',
  },
  teamDesc: {
    fontSize: '0.88rem',
    color: '#cbd5e1',
    maxWidth: '560px',
    margin: '0 auto',
  },
  editDetailsBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#93c5fd',
    padding: '0.35rem 0.85rem',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  profileChip: {
    fontSize: '0.78rem',
    color: '#e2e8f0',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '0.28rem 0.65rem',
    borderRadius: '8px',
    fontWeight: 600,
  },
  schedulePassBox: {
    background: 'rgba(37, 99, 235, 0.12)',
    border: '1.5px solid rgba(96, 165, 250, 0.4)',
    borderRadius: '20px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.25)',
  },
  scheduleHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  confirmedPill: {
    background: 'rgba(74, 222, 128, 0.2)',
    border: '1px solid rgba(74, 222, 128, 0.5)',
    color: '#4ade80',
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '0.25rem 0.65rem',
    borderRadius: '6px',
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  scheduleItem: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  scheduleLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 700,
  },
  scheduleVal: {
    fontSize: '0.95rem',
    color: '#ffffff',
    fontWeight: 800,
  },
  invitationNotice: {
    fontSize: '0.82rem',
    color: '#93c5fd',
    background: 'rgba(37, 99, 235, 0.2)',
    padding: '0.65rem 0.95rem',
    borderRadius: '10px',
    border: '1px solid rgba(96, 165, 250, 0.3)',
  },
  pendingScheduleBox: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1.5px solid rgba(245, 158, 11, 0.35)',
    borderRadius: '18px',
    padding: '1.4rem',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  teamRosterBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '18px',
    padding: '1.5rem',
  },
  rosterHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  rosterTag: {
    fontSize: '0.68rem',
    fontWeight: 800,
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
  },
  candidateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '0.85rem',
  },
  candidateCard: {
    border: '1px solid',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    color: '#ffffff',
    fontSize: '0.95rem',
  },
  youBadge: {
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '0.62rem',
    fontWeight: 900,
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
  },
  candScoreTag: {
    fontSize: '0.74rem',
    fontWeight: 800,
    color: '#4ade80',
    background: 'rgba(74, 222, 128, 0.15)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
  },
  approvedCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(74, 222, 128, 0.3)',
    borderRadius: '24px',
    padding: '2.5rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(74, 222, 128, 0.2)',
  },
  cardTitle: {
    fontSize: '1.9rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  cardSubtitle: {
    fontSize: '0.95rem',
    color: '#cbd5e1',
    maxWidth: '580px',
    margin: '0 auto 2rem auto',
    lineHeight: 1.55,
  },
  codeRevealBox: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1.5px dashed rgba(96, 165, 250, 0.5)',
    borderRadius: '18px',
    padding: '1.75rem',
    maxWidth: '480px',
    margin: '0 auto 2rem auto',
  },
  codeDisplay: {
    fontSize: '2rem',
    fontWeight: 950,
    color: '#60a5fa',
    letterSpacing: '0.08em',
    margin: '0.6rem 0 1rem 0',
  },
  copyBtn: {
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
    padding: '0.55rem 1.25rem',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '0.84rem',
    cursor: 'pointer',
  },
  primaryActionBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
    padding: '0.85rem 1.5rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
  },
  secondaryActionBtn: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
    padding: '0.85rem 1.5rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(124, 58, 237, 0.4)',
  },
  rejectedCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '24px',
    padding: '2.5rem',
    textAlign: 'center',
  },
  rejectedTitle: {
    fontSize: '1.9rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  rejectedSubtitle: {
    fontSize: '0.92rem',
    color: '#94a3b8',
    marginBottom: '1.5rem',
  },
  motivationalBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.5rem',
    textAlign: 'left',
    maxWidth: '620px',
    margin: '0 auto 1.75rem auto',
  },
  quoteBox: {
    margin: '1rem 0',
    padding: '0.75rem 1rem',
    borderLeft: '3px solid #60a5fa',
    background: 'rgba(37, 99, 235, 0.1)',
    borderRadius: '0 8px 8px 0',
    color: '#93c5fd',
  },
  returnHomeBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
};

export default GDCandidatePortalPage;
