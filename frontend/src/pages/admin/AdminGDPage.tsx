import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import {
  getGDCohorts,
  GDCohort,
  scheduleAndDispatchGD,
  evaluateGDCandidate,
} from '../../utils/gdStore';

export const AdminGDPage: React.FC = () => {
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState<GDCohort[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'scheduled' | 'evaluated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Scheduling Form State keyed by cohortId
  const [scheduleInputs, setScheduleInputs] = useState<
    Record<
      string,
      {
        date: string;
        time: string;
        location: string;
        roomNumber: string;
      }
    >
  >({});

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load cohorts on mount
  useEffect(() => {
    loadCohorts();
  }, []);

  const loadCohorts = () => {
    const data = getGDCohorts();
    setCohorts(data);

    // Initialize default inputs
    const initialInputs: Record<string, any> = {};
    data.forEach((c) => {
      initialInputs[c.id] = {
        date: c.schedule?.date || '2026-08-25',
        time: c.schedule?.time || '10:30 AM',
        location: c.schedule?.location || 'Main Tech Campus - Floor 4',
        roomNumber: c.schedule?.roomNumber || 'Executive Suite 402',
      };
    });
    setScheduleInputs(initialInputs);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleInputChange = (cohortId: string, field: string, value: string) => {
    setScheduleInputs((prev) => ({
      ...prev,
      [cohortId]: {
        ...prev[cohortId],
        [field]: value,
      },
    }));
  };

  // Schedule Cohort and Dispatch Invites
  const handleScheduleCohort = async (cohortId: string) => {
    const input = scheduleInputs[cohortId];
    if (!input || !input.date || !input.time || !input.location || !input.roomNumber) {
      alert('Please fill in Date, Time, Location, and Room Number.');
      return;
    }

    setLoadingAction(`schedule-${cohortId}`);
    const res = await scheduleAndDispatchGD(cohortId, input);
    setLoadingAction(null);

    if (res.success) {
      showToast(`🎉 ${res.message}`);
      loadCohorts();
    } else {
      alert(res.message);
    }
  };

  // Admin Candidate Evaluation (Approve / Reject)
  const handleEvaluate = async (
    cohortId: string,
    candidateEmail: string,
    decision: 'approved' | 'rejected'
  ) => {
    setLoadingAction(`eval-${candidateEmail}`);
    const res = await evaluateGDCandidate(cohortId, candidateEmail, decision);
    setLoadingAction(null);

    if (res.success) {
      showToast(res.message);
      loadCohorts();
    } else {
      alert(res.message);
    }
  };

  // Filter cohorts
  const filteredCohorts = cohorts.filter((c) => {
    if (activeTab === 'pending' && c.status !== 'pending_schedule') return false;
    if (activeTab === 'scheduled' && c.status !== 'scheduled') return false;
    if (activeTab === 'evaluated' && c.status !== 'evaluated') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTeam = c.teamName.toLowerCase().includes(q);
      const matchCand = c.candidates.some(
        (cand) =>
          cand.fullName.toLowerCase().includes(q) ||
          cand.email.toLowerCase().includes(q) ||
          (cand.uniqueInterviewCode && cand.uniqueInterviewCode.toLowerCase().includes(q))
      );
      return matchTeam || matchCand;
    }

    return true;
  });

  // Calculate totals
  const totalCohorts = cohorts.length;
  const totalCandidates = cohorts.reduce((acc, c) => acc + c.candidates.length, 0);
  const totalApproved = cohorts.reduce(
    (acc, c) => acc + c.candidates.filter((cand) => cand.gdStatus === 'approved').length,
    0
  );
  const totalPending = cohorts.filter((c) => c.status === 'pending_schedule').length;

  return (
    <div style={styles.pageContainer}>
      <GlassCanvas3D mode="mixed" intensity={1.15} />

      {/* Toast Notification */}
      {toastMessage && <div style={styles.toastNotice}>{toastMessage}</div>}

      {/* Admin Top Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoIcon}>🛡️</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={styles.headerTitle}>GD Cohort Management Console</h1>
              <span style={styles.adminBadge}>ADMIN</span>
            </div>
            <p style={styles.headerSubtitle}>
              AI 5-Candidate Cohort Clustering, Venue Scheduling & Performance Approvals
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/admin/candidates')} style={styles.navBtn}>
            📋 All Candidates
          </button>
          <button onClick={() => navigate('/')} style={styles.logoutBtn}>
            🔒 Exit Admin
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainWrapper}>
        {/* Metric Cards Row */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>👥 Qualified GD Candidates</span>
            <div style={{ ...styles.metricValue, color: '#60a5fa' }}>{totalCandidates}</div>
            <span style={styles.metricSub}>Passed Aptitude Screening</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>🛡️ 5-Member GD Cohorts</span>
            <div style={{ ...styles.metricValue, color: '#c084fc' }}>{totalCohorts}</div>
            <span style={styles.metricSub}>Assigned Professional Teams</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>⏳ Pending Venue Schedule</span>
            <div style={{ ...styles.metricValue, color: '#fbbf24' }}>{totalPending}</div>
            <span style={styles.metricSub}>Awaiting Date/Time Dispatch</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>🏆 Approved for TJI / NTJI</span>
            <div style={{ ...styles.metricValue, color: '#4ade80' }}>{totalApproved}</div>
            <span style={styles.metricSub}>Unique Codes Generated</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div style={styles.controlsRow}>
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                ...styles.tabBtn,
                background: activeTab === 'all' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                borderColor: activeTab === 'all' ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === 'all' ? '#ffffff' : '#94a3b8',
              }}
            >
              All Cohorts ({cohorts.length})
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              style={{
                ...styles.tabBtn,
                background: activeTab === 'pending' ? 'rgba(251, 191, 36, 0.25)' : 'transparent',
                borderColor: activeTab === 'pending' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === 'pending' ? '#fef08a' : '#94a3b8',
              }}
            >
              ⏳ Needs Scheduling ({totalPending})
            </button>

            <button
              onClick={() => setActiveTab('scheduled')}
              style={{
                ...styles.tabBtn,
                background: activeTab === 'scheduled' ? 'rgba(96, 165, 250, 0.25)' : 'transparent',
                borderColor: activeTab === 'scheduled' ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === 'scheduled' ? '#93c5fd' : '#94a3b8',
              }}
            >
              📅 Scheduled & Active
            </button>

            <button
              onClick={() => setActiveTab('evaluated')}
              style={{
                ...styles.tabBtn,
                background: activeTab === 'evaluated' ? 'rgba(74, 222, 128, 0.25)' : 'transparent',
                borderColor: activeTab === 'evaluated' ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === 'evaluated' ? '#86efac' : '#94a3b8',
              }}
            >
              ✅ Evaluated
            </button>
          </div>

          <div style={styles.searchWrapper}>
            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by team, candidate name, email or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Cohort Cards List */}
        {filteredCohorts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffffff' }}>No GD Cohorts Found</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
              Candidates who pass the Aptitude Round (min 7/15) will automatically appear here in 5-member batches.
            </p>
          </div>
        ) : (
          filteredCohorts.map((cohort) => {
            const input = scheduleInputs[cohort.id] || {
              date: '2026-08-25',
              time: '10:30 AM',
              location: 'Main Tech Campus - Floor 4',
              roomNumber: 'Executive Suite 402',
            };

            const isScheduled = cohort.status === 'scheduled' || cohort.status === 'evaluated';

            return (
              <div key={cohort.id} style={styles.cohortCard}>
                {/* Cohort Header */}
                <div style={styles.cohortHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={styles.teamBadge}>🛡️ {cohort.teamName}</span>
                    <span
                      style={{
                        ...styles.statusPill,
                        background:
                          cohort.status === 'evaluated'
                            ? 'rgba(74, 222, 128, 0.15)'
                            : cohort.status === 'scheduled'
                            ? 'rgba(96, 165, 250, 0.15)'
                            : 'rgba(251, 191, 36, 0.15)',
                        borderColor:
                          cohort.status === 'evaluated'
                            ? '#4ade80'
                            : cohort.status === 'scheduled'
                            ? '#60a5fa'
                            : '#fbbf24',
                        color:
                          cohort.status === 'evaluated'
                            ? '#4ade80'
                            : cohort.status === 'scheduled'
                            ? '#93c5fd'
                            : '#fef08a',
                      }}
                    >
                      {cohort.status === 'evaluated'
                        ? '✅ Evaluated'
                        : cohort.status === 'scheduled'
                        ? '📅 Invites Dispatched'
                        : '⏳ Needs Venue Scheduling'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      5 Qualified Candidates
                    </span>
                  </div>

                  {cohort.schedule && (
                    <div style={styles.scheduleBadge}>
                      📍 {cohort.schedule.location} • 🚪 Room {cohort.schedule.roomNumber} • ⏰ {cohort.schedule.date} at {cohort.schedule.time}
                    </div>
                  )}
                </div>

                {/* 5-Candidate Table */}
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        <th style={styles.th}>Candidate</th>
                        <th style={styles.th}>Contact</th>
                        <th style={styles.th}>Aptitude Score</th>
                        <th style={styles.th}>Track</th>
                        <th style={styles.th}>GD Performance Status</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Admin Evaluation Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohort.candidates.map((cand) => {
                        const isApproved = cand.gdStatus === 'approved';
                        const isRejected = cand.gdStatus === 'rejected';

                        return (
                          <tr key={cand.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 800, color: '#ffffff' }}>{cand.fullName}</div>
                              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{cand.targetRole || 'Candidate'}</div>
                            </td>

                            <td style={styles.td}>
                              <div style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>{cand.email}</div>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{cand.phone}</div>
                            </td>

                            <td style={styles.td}>
                              <span style={styles.scorePill}>
                                ✓ {cand.aptitudeScore} / {cand.aptitudeTotal} Correct
                              </span>
                            </td>

                            <td style={styles.td}>
                              <span
                                style={{
                                  ...styles.trackPill,
                                  background: cand.preferredTrack === 'NTJI' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                  color: cand.preferredTrack === 'NTJI' ? '#c084fc' : '#93c5fd',
                                }}
                              >
                                {cand.preferredTrack}
                              </span>
                            </td>

                            <td style={styles.td}>
                              {isApproved ? (
                                <div>
                                  <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.85rem' }}>
                                    ✅ Approved (Good)
                                  </div>
                                  <div style={styles.uniqueCodeBadge}>
                                    🔑 Code: <strong>{cand.uniqueInterviewCode}</strong>
                                  </div>
                                </div>
                              ) : isRejected ? (
                                <div>
                                  <div style={{ color: '#f87171', fontWeight: 800, fontSize: '0.85rem' }}>
                                    ❌ Not Selected
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                    Motivational email sent
                                  </div>
                                </div>
                              ) : cand.gdStatus === 'invited' ? (
                                <span style={{ color: '#93c5fd', fontSize: '0.84rem', fontWeight: 700 }}>
                                  📬 Invited via Email
                                </span>
                              ) : (
                                <span style={{ color: '#fbbf24', fontSize: '0.84rem', fontWeight: 700 }}>
                                  ⏳ Awaiting GD Schedule
                                </span>
                              )}
                            </td>

                            <td style={{ ...styles.td, textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleEvaluate(cohort.id, cand.email, 'approved')}
                                  disabled={loadingAction === `eval-${cand.email}`}
                                  style={{
                                    ...styles.approveBtn,
                                    opacity: isApproved ? 0.6 : 1,
                                    background: isApproved
                                      ? 'rgba(74, 222, 128, 0.3)'
                                      : 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                                  }}
                                  title="Approve candidate as Good & dispatch unique TJI/NTJI access code"
                                >
                                  {isApproved ? '✓ Approved' : '👍 Approve (Good)'}
                                </button>

                                <button
                                  onClick={() => handleEvaluate(cohort.id, cand.email, 'rejected')}
                                  disabled={loadingAction === `eval-${cand.email}`}
                                  style={{
                                    ...styles.rejectBtn,
                                    opacity: isRejected ? 0.6 : 1,
                                  }}
                                  title="Mark as not selected & send polite motivational rejection email"
                                >
                                  {isRejected ? '✗ Not Selected' : '👎 Reject'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Scheduling Section for this Cohort */}
                <div style={styles.scheduleBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.96rem', fontWeight: 800 }}>
                      {isScheduled ? 'Update Venue & Schedule Details' : 'Enter Schedule & Dispatch Invites to 5 Registered Emails'}
                    </h4>
                  </div>

                  <div style={styles.scheduleInputsGrid}>
                    <div>
                      <label style={styles.inputLabel}>Session Date</label>
                      <input
                        type="date"
                        value={input.date}
                        onChange={(e) => handleInputChange(cohort.id, 'date', e.target.value)}
                        style={styles.formInput}
                      />
                    </div>

                    <div>
                      <label style={styles.inputLabel}>Session Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM"
                        value={input.time}
                        onChange={(e) => handleInputChange(cohort.id, 'time', e.target.value)}
                        style={styles.formInput}
                      />
                    </div>

                    <div>
                      <label style={styles.inputLabel}>Venue / Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Tech Campus - Floor 4"
                        value={input.location}
                        onChange={(e) => handleInputChange(cohort.id, 'location', e.target.value)}
                        style={styles.formInput}
                      />
                    </div>

                    <div>
                      <label style={styles.inputLabel}>Room Number / Virtual Room</label>
                      <input
                        type="text"
                        placeholder="e.g. Executive Boardroom 402"
                        value={input.roomNumber}
                        onChange={(e) => handleInputChange(cohort.id, 'roomNumber', e.target.value)}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleScheduleCohort(cohort.id)}
                      disabled={loadingAction === `schedule-${cohort.id}`}
                      style={styles.dispatchBtn}
                    >
                      {loadingAction === `schedule-${cohort.id}`
                        ? '📧 Dispatching Invites to 5 Emails...'
                        : isScheduled
                        ? '🔄 Re-Dispatch Updated Schedule to 5 Emails ➔'
                        : '📧 Dispatch Official Invites to 5 Candidate Emails ➔'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
  toastNotice: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
    padding: '0.85rem 1.5rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.92rem',
    zIndex: 9999,
  },
  header: {
    maxWidth: '1280px',
    margin: '1rem auto 0 auto',
    padding: '0.85rem 1.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(25px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  logoIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
  },
  headerTitle: {
    fontSize: '1.3rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: 0,
  },
  adminBadge: {
    fontSize: '0.65rem',
    fontWeight: 900,
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    background: 'rgba(251, 191, 36, 0.2)',
    color: '#fef08a',
    border: '1px solid rgba(251, 191, 36, 0.4)',
  },
  headerSubtitle: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    margin: '0.2rem 0 0 0',
  },
  navBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  logoutBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  mainWrapper: {
    maxWidth: '1280px',
    margin: '1.75rem auto 0 auto',
    padding: '0 1.25rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  metricCard: {
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '18px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  metricLabel: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    fontWeight: 700,
  },
  metricValue: {
    fontSize: '1.9rem',
    fontWeight: 900,
  },
  metricSub: {
    fontSize: '0.74rem',
    color: '#94a3b8',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '0.45rem 1rem',
    minWidth: '320px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    outline: 'none',
    fontSize: '0.86rem',
    width: '100%',
  },
  emptyState: {
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    padding: '3.5rem',
    textAlign: 'center',
  },
  cohortCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '22px',
    padding: '1.75rem',
    marginBottom: '1.75rem',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6)',
  },
  cohortHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '1rem',
  },
  teamBadge: {
    fontSize: '1.15rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  statusPill: {
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '0.76rem',
    fontWeight: 800,
  },
  scheduleBadge: {
    background: 'rgba(37, 99, 235, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(37, 99, 235, 0.35)',
    padding: '0.35rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem 0.85rem',
    fontSize: '0.76rem',
    fontWeight: 800,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  td: {
    padding: '0.85rem 0.85rem',
    verticalAlign: 'middle',
  },
  scorePill: {
    background: 'rgba(74, 222, 128, 0.15)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    padding: '0.25rem 0.65rem',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  trackPill: {
    padding: '0.25rem 0.65rem',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 800,
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  uniqueCodeBadge: {
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#fef08a',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.76rem',
    marginTop: '0.25rem',
    display: 'inline-block',
  },
  approveBtn: {
    border: 'none',
    color: '#ffffff',
    padding: '0.45rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rejectBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '0.45rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  scheduleBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.25rem',
  },
  scheduleInputsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.85rem',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.76rem',
    fontWeight: 700,
    color: '#cbd5e1',
    marginBottom: '0.3rem',
  },
  formInput: {
    width: '100%',
    padding: '0.6rem 0.85rem',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dispatchBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(37, 99, 235, 0.35)',
  },
};

export default AdminGDPage;
