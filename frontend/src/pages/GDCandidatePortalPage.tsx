import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { getCurrentUser } from '../utils/userStore';
import { getCandidateGDInfo, getGDCohorts, GDCohort, GDCandidateMember } from '../utils/gdStore';

export const GDCandidatePortalPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [cohort, setCohort] = useState<GDCohort | null>(null);
  const [candidate, setCandidate] = useState<GDCandidateMember | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (currentUser?.email) {
      const { cohort: c, candidate: cand } = getCandidateGDInfo(currentUser.email);
      setCohort(c);
      setCandidate(cand);
    } else {
      // Demo fallback: show top cohort
      const all = getGDCohorts();
      if (all.length > 0) {
        setCohort(all[0]);
        setCandidate(all[0].candidates[0]);
      }
    }
  }, [currentUser]);

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
            <span style={styles.stagePill}>STAGE 2: GROUP DISCUSSION</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={styles.backBtn}
            title="Go back to previous screen"
          >
            ← Back
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={styles.candBadge}>👤 {currentUser?.fullName || candidate?.fullName || 'Candidate'}</span>
          <button onClick={() => navigate('/')} style={styles.homeBtn}>Home</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainWrapper}>
        {/* ── CASE 1: APPROVED BY ADMIN (GOOD PERFORMANCE) ── */}
        {isApproved && candidate?.uniqueInterviewCode ? (
          <div style={styles.approvedCard}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏆</div>
            <h1 style={styles.cardTitle}>GD Round Cleared & Approved!</h1>
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
                This code has also been emailed to <strong>{candidate.email}</strong>. Use it to enter your next round.
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
          /* ── CASE 2: REJECTED (POLITE & MOTIVATIONAL FEEDBACK) ── */
          <div style={styles.rejectedCard}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>💙</div>
            <h1 style={styles.rejectedTitle}>Assessment Feedback & Update</h1>
            <p style={styles.rejectedSubtitle}>
              VOXIS.AI Group Discussion Evaluation for <strong style={{ color: '#ffffff' }}>{cohort?.teamName}</strong>
            </p>

            <div style={styles.motivationalBox}>
              <h3 style={{ margin: '0 0 0.6rem 0', color: '#93c5fd', fontSize: '1.05rem', fontWeight: 800 }}>
                🌱 Thank You for Your Dedication & Participation
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
                You have been placed into this 5-candidate professional discussion group based on your qualified aptitude score.
              </p>
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
                  📧 Official invitations with these details have been dispatched to your email address (<strong>{currentUser?.email || candidate?.email}</strong>).
                </div>
              </div>
            ) : (
              <div style={styles.pendingScheduleBox}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>⏳</div>
                <strong style={{ color: '#fef08a', fontSize: '0.98rem' }}>
                  Awaiting Administrative Venue & Time Slot Assignment
                </strong>
                <p style={{ margin: '0.4rem 0 0 0', color: '#cbd5e1', fontSize: '0.86rem' }}>
                  The administrative proctor is currently locking in the date, time, and room number for <strong>{cohort?.teamName}</strong>. You will receive an email notification the moment the schedule is confirmed.
                </p>
              </div>
            )}

            {/* 5-Member Team Roster */}
            <div style={styles.teamRosterBox}>
              <h3 style={styles.rosterTitle}>
                👥 5 Cohort Members ({cohort?.candidates.length || 5}/5)
              </h3>
              <div style={styles.rosterList}>
                {cohort?.candidates.map((m) => {
                  const isMe = m.email.toLowerCase() === (currentUser?.email || '').toLowerCase();
                  return (
                    <div
                      key={m.id}
                      style={{
                        ...styles.memberRow,
                        background: isMe ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        borderColor: isMe ? '#60a5fa' : 'rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={styles.memberAvatar}>
                        {m.fullName.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>{m.fullName}</strong>
                          {isMe && <span style={styles.youBadge}>YOU</span>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          Aptitude Score: {m.aptitudeScore}/{m.aptitudeTotal} • Track: {m.preferredTrack}
                        </div>
                      </div>
                      <div>
                        <span style={styles.memberStatusBadge}>
                          {m.gdStatus === 'approved'
                            ? '✅ Approved'
                            : m.gdStatus === 'invited'
                            ? '📬 Invited'
                            : '🛡️ Ready'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Console Shortcut for Demonstration */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Are you an Administrator?</span>{' '}
              <button onClick={() => navigate('/admin/gd')} style={styles.adminLinkBtn}>
                Open Admin Evaluation & Scheduling Console ➔
              </button>
            </div>
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
  header: {
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
    gap: '0.85rem',
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#e2e8f0',
    padding: '0.35rem 0.8rem',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    transition: 'all 0.2s ease',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  logoText: {
    fontSize: '1.15rem',
    fontWeight: 900,
    color: '#ffffff',
  },
  stagePill: {
    fontSize: '0.62rem',
    fontWeight: 900,
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    background: 'rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.4)',
  },
  candBadge: {
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  homeBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    padding: '0.4rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  mainWrapper: {
    maxWidth: '820px',
    margin: '2rem auto 0 auto',
    padding: '0 1.25rem',
  },
  statusCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '24px',
    padding: '2.5rem 2.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
  },
  teamHeaderBox: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  cohortTag: {
    display: 'inline-block',
    fontSize: '0.74rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#60a5fa',
    background: 'rgba(59, 130, 246, 0.15)',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    marginBottom: '0.6rem',
  },
  teamTitle: {
    fontSize: '1.9rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  teamDesc: {
    fontSize: '0.9rem',
    color: '#cbd5e1',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: 1.5,
  },
  schedulePassBox: {
    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
    border: '1.5px solid rgba(96, 165, 250, 0.4)',
    borderRadius: '20px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  scheduleHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  confirmedPill: {
    background: 'rgba(74, 222, 128, 0.2)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  scheduleItem: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.85rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  scheduleLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 600,
  },
  scheduleVal: {
    fontSize: '0.98rem',
    color: '#ffffff',
  },
  invitationNotice: {
    background: 'rgba(0, 0, 0, 0.25)',
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    fontSize: '0.82rem',
    color: '#93c5fd',
  },
  pendingScheduleBox: {
    background: 'rgba(251, 191, 36, 0.12)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    padding: '1.5rem',
    borderRadius: '18px',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  teamRosterBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '18px',
    padding: '1.25rem',
  },
  rosterTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  rosterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0.75rem 1rem',
    borderRadius: '14px',
    border: '1px solid',
  },
  memberAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '0.9rem',
  },
  youBadge: {
    background: 'rgba(96, 165, 250, 0.25)',
    color: '#93c5fd',
    fontSize: '0.68rem',
    fontWeight: 900,
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    border: '1px solid rgba(96, 165, 250, 0.5)',
  },
  memberStatusBadge: {
    fontSize: '0.76rem',
    fontWeight: 700,
    color: '#cbd5e1',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
  },
  approvedCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1.5px solid rgba(74, 222, 128, 0.4)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(74, 222, 128, 0.25)',
  },
  cardTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  cardSubtitle: {
    fontSize: '0.95rem',
    color: '#cbd5e1',
    lineHeight: 1.6,
    margin: '0 0 2rem 0',
  },
  codeRevealBox: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1.5px solid rgba(251, 191, 36, 0.4)',
    borderRadius: '20px',
    padding: '1.75rem',
    maxWidth: '460px',
    margin: '0 auto 2rem auto',
  },
  codeDisplay: {
    fontSize: '2rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#fef08a',
    margin: '0.75rem 0',
    fontFamily: 'monospace',
  },
  copyBtn: {
    background: 'rgba(251, 191, 36, 0.2)',
    color: '#fef08a',
    border: '1px solid rgba(251, 191, 36, 0.5)',
    padding: '0.55rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  primaryActionBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.85rem 1.5rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.92rem',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
  },
  secondaryActionBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    padding: '0.85rem 1.5rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.92rem',
    cursor: 'pointer',
  },
  rejectedCard: {
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '24px',
    padding: '3rem 2.25rem',
    textAlign: 'center',
  },
  rejectedTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  rejectedSubtitle: {
    fontSize: '0.94rem',
    color: '#cbd5e1',
    margin: '0 0 1.75rem 0',
  },
  motivationalBox: {
    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '16px',
    padding: '1.5rem',
    textAlign: 'left',
    marginBottom: '2rem',
  },
  quoteBox: {
    margin: '0.75rem 0',
    padding: '0.75rem 1.25rem',
    background: 'rgba(0, 0, 0, 0.25)',
    borderLeft: '4px solid #60a5fa',
    borderRadius: '0 10px 10px 0',
    color: '#fef08a',
    fontSize: '0.92rem',
  },
  returnHomeBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    padding: '0.9rem 2.25rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.96rem',
    cursor: 'pointer',
  },
  adminLinkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#60a5fa',
    fontWeight: 800,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
};

export default GDCandidatePortalPage;
