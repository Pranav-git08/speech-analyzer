import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import AIAgentChat from '../../components/AIAgentChat';
import {
  getGDCohorts,
  GDCohort,
  scheduleAndDispatchGD,
  evaluateGDCandidate,
  deleteGDCandidate,
  deleteGDCohort,
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

  // Deletion confirmation popover state
  const [confirmDeleteCandidate, setConfirmDeleteCandidate] = useState<{
    cohortId: string;
    email: string;
    name: string;
    teamName: string;
  } | null>(null);

  const [confirmDeleteCohort, setConfirmDeleteCohort] = useState<{
    cohortId: string;
    teamName: string;
  } | null>(null);

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

  // Candidate Deletion
  const handleDeleteCandidate = (cohortId: string, candidateEmail: string) => {
    const res = deleteGDCandidate(cohortId, candidateEmail);
    setConfirmDeleteCandidate(null);

    if (res.success) {
      showToast(`🗑️ ${res.message}`);
      loadCohorts();
    } else {
      alert(res.message);
    }
  };

  // Cohort Deletion
  const handleDeleteCohort = (cohortId: string) => {
    const res = deleteGDCohort(cohortId);
    setConfirmDeleteCohort(null);

    if (res.success) {
      showToast(`🗑️ ${res.message}`);
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

      {/* Candidate Delete Confirmation Modal */}
      {confirmDeleteCandidate && (
        <div style={styles.modalOverlay} onClick={() => setConfirmDeleteCandidate(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h2 style={styles.modalTitle}>Delete GD Candidate?</h2>
            <p style={styles.modalText}>
              Are you sure you want to remove <strong style={{ color: '#ffffff' }}>{confirmDeleteCandidate.name}</strong> ({confirmDeleteCandidate.email}) from <strong style={{ color: '#60a5fa' }}>{confirmDeleteCandidate.teamName}</strong>?
            </p>
            <div style={styles.modalBtnRow}>
              <button
                onClick={() => handleDeleteCandidate(confirmDeleteCandidate.cohortId, confirmDeleteCandidate.email)}
                style={styles.modalDeleteBtn}
              >
                🗑️ Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDeleteCandidate(null)}
                style={styles.modalCancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Delete Confirmation Modal */}
      {confirmDeleteCohort && (
        <div style={styles.modalOverlay} onClick={() => setConfirmDeleteCohort(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h2 style={styles.modalTitle}>Delete Entire GD Cohort?</h2>
            <p style={styles.modalText}>
              Are you sure you want to delete <strong style={{ color: '#f87171' }}>{confirmDeleteCohort.teamName}</strong> and all its candidate records? This action cannot be undone.
            </p>
            <div style={styles.modalBtnRow}>
              <button
                onClick={() => handleDeleteCohort(confirmDeleteCohort.cohortId)}
                style={styles.modalDeleteBtn}
              >
                🗑️ Delete Cohort
              </button>
              <button
                onClick={() => setConfirmDeleteCohort(null)}
                style={styles.modalCancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Top Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/admin/candidates')}
            style={styles.backBtn}
            title="Go back to candidate management"
          >
            ← Back
          </button>
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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

          <div style={styles.searchBox}>
            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by candidate name, email, team or unique code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Cohort Cards List */}
        {filteredCohorts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛡️</div>
            <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0' }}>No Cohorts Found</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              {searchQuery ? 'Try adjusting your search criteria.' : 'No candidates in this filter tab.'}
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
                      {cohort.candidates.length} Candidates
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {cohort.schedule && (
                      <div style={styles.scheduleBadge}>
                        📍 {cohort.schedule.location} • 🚪 Room {cohort.schedule.roomNumber} • ⏰ {cohort.schedule.date} at {cohort.schedule.time}
                      </div>
                    )}
                    <button
                      onClick={() => setConfirmDeleteCohort({ cohortId: cohort.id, teamName: cohort.teamName })}
                      style={styles.deleteCohortBtn}
                      title="Delete entire cohort"
                    >
                      🗑️ Delete Cohort
                    </button>
                  </div>
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
                        <th style={{ ...styles.th, textAlign: 'right' }}>Admin Evaluation & Delete Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohort.candidates.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            All candidates in this cohort have been deleted or moved.
                          </td>
                        </tr>
                      ) : (
                        cohort.candidates.map((cand) => {
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
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', alignItems: 'center' }}>
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
                                    title="Approve candidate as Good & dispatch universal unique access code"
                                  >
                                    {isApproved ? '✓ Approved' : '👍 Approve'}
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
                                    {isRejected ? '✗ Rejected' : '👎 Reject'}
                                  </button>

                                  {/* Delete Candidate Button */}
                                  <button
                                    onClick={() => setConfirmDeleteCandidate({
                                      cohortId: cohort.id,
                                      email: cand.email,
                                      name: cand.fullName,
                                      teamName: cohort.teamName,
                                    })}
                                    style={styles.deleteCandBtn}
                                    title="Delete candidate from GD cohort"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Scheduling Section for this Cohort */}
                <div style={styles.scheduleBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.96rem', fontWeight: 800 }}>
                      {isScheduled ? 'Update Venue & Schedule Details' : 'Enter Schedule & Dispatch Invites to Registered Emails'}
                    </h4>
                  </div>

                  <div style={styles.scheduleGrid}>
                    <div>
                      <label style={styles.inputLabel}>📅 Date</label>
                      <input
                        type="date"
                        value={input.date}
                        onChange={(e) => handleInputChange(cohort.id, 'date', e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div>
                      <label style={styles.inputLabel}>⏰ Time Slot</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM EST"
                        value={input.time}
                        onChange={(e) => handleInputChange(cohort.id, 'time', e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div>
                      <label style={styles.inputLabel}>📍 Location / Campus</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Tech Campus - Floor 4"
                        value={input.location}
                        onChange={(e) => handleInputChange(cohort.id, 'location', e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div>
                      <label style={styles.inputLabel}>🚪 Room Number / Meeting Link</label>
                      <input
                        type="text"
                        placeholder="e.g. Executive Suite 402"
                        value={input.roomNumber}
                        onChange={(e) => handleInputChange(cohort.id, 'roomNumber', e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleScheduleCohort(cohort.id)}
                      disabled={loadingAction === `schedule-${cohort.id}`}
                      style={{
                        ...styles.scheduleSubmitBtn,
                        opacity: loadingAction === `schedule-${cohort.id}` ? 0.7 : 1,
                      }}
                    >
                      {loadingAction === `schedule-${cohort.id}`
                        ? 'Dispatching Official Emails...'
                        : `📧 Dispatch Official Invites to ${cohort.candidates.length} Candidates in ${cohort.teamName}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Global AI Intelligence Assistant */}
      <AIAgentChat />
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
  toastNotice: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1.5px solid #60a5fa',
    color: '#ffffff',
    padding: '0.85rem 1.4rem',
    borderRadius: '16px',
    zIndex: 9999,
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(96, 165, 250, 0.4)',
    fontSize: '0.9rem',
    fontWeight: 700,
    animation: 'fadeIn 0.3s ease-out',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  modalCard: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1.5px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '24px',
    padding: '2.25rem',
    maxWidth: '440px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.25)',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  modalText: {
    fontSize: '0.9rem',
    color: '#cbd5e1',
    lineHeight: 1.5,
    margin: '0 0 1.75rem 0',
  },
  modalBtnRow: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  modalDeleteBtn: {
    background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.7rem 1.4rem',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
    boxShadow: '0 5px 15px rgba(239, 68, 68, 0.4)',
  },
  modalCancelBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0.7rem 1.4rem',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  header: {
    maxWidth: '1280px',
    margin: '1.25rem auto 0 auto',
    padding: '1rem 1.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  backBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.22)',
    color: '#e2e8f0',
    padding: '0.4rem 0.85rem',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    transition: 'all 0.2s ease',
  },
  logoIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.5)',
  },
  headerTitle: {
    fontSize: '1.35rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  adminBadge: {
    fontSize: '0.65rem',
    fontWeight: 900,
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    letterSpacing: '0.05em',
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
    padding: '0.45rem 1rem',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  logoutBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#fca5a5',
    padding: '0.45rem 1rem',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  mainWrapper: {
    maxWidth: '1280px',
    margin: '2rem auto 0 auto',
    padding: '0 1.25rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  metricCard: {
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '18px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
  },
  metricLabel: {
    fontSize: '0.82rem',
    color: '#cbd5e1',
    fontWeight: 700,
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 900,
    margin: '0.25rem 0',
  },
  metricSub: {
    fontSize: '0.74rem',
    color: '#94a3b8',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    border: '1px solid',
    fontWeight: 800,
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '14px',
    padding: '0.45rem 1rem',
    minWidth: '320px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
  },
  emptyState: {
    background: 'rgba(15, 23, 42, 0.7)',
    borderRadius: '20px',
    padding: '3rem',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cohortCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '22px',
    padding: '1.75rem',
    marginBottom: '2rem',
    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
  },
  cohortHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  teamBadge: {
    fontSize: '1.2rem',
    fontWeight: 900,
    color: '#ffffff',
  },
  statusPill: {
    padding: '0.2rem 0.65rem',
    borderRadius: '8px',
    fontSize: '0.74rem',
    fontWeight: 800,
    border: '1px solid',
  },
  scheduleBadge: {
    background: 'rgba(37, 99, 235, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(37, 99, 235, 0.35)',
    padding: '0.3rem 0.8rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  deleteCohortBtn: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#fca5a5',
    padding: '0.35rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    background: 'rgba(255, 255, 255, 0.05)',
  },
  th: {
    padding: '0.85rem 1rem',
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    transition: 'background 0.2s ease',
  },
  td: {
    padding: '0.85rem 1rem',
    fontSize: '0.88rem',
    verticalAlign: 'middle',
  },
  scorePill: {
    background: 'rgba(74, 222, 128, 0.15)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: 800,
  },
  trackPill: {
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.76rem',
    fontWeight: 900,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  uniqueCodeBadge: {
    fontSize: '0.74rem',
    color: '#fef08a',
    marginTop: '0.2rem',
    fontFamily: 'monospace',
  },
  approveBtn: {
    background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.42rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  rejectBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    padding: '0.42rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  deleteCandBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.42rem 0.65rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  scheduleBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.25rem',
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.85rem',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: '0.35rem',
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  scheduleSubmitBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    padding: '0.65rem 1.4rem',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
  },
};

export default AdminGDPage;
