import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { CandidateSummary, CandidateListResponse, Track, CandidateStatus } from '../../types/admin';
import AIAgentChat from '../../components/AIAgentChat';
import GlassCanvas3D from '../../components/GlassCanvas3D';

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending_initial: 'Pending Round 1',
  pending_gd: 'Pending GD',
  pending_hr: 'Pending HR',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<CandidateStatus, React.CSSProperties> = {
  pending_initial: { background: 'rgba(251, 191, 36, 0.2)', color: '#fde047', border: '1px solid rgba(251, 191, 36, 0.4)' },
  pending_gd: { background: 'rgba(167, 139, 250, 0.2)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.4)' },
  pending_hr: { background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.4)' },
  approved: { background: 'rgba(74, 222, 128, 0.2)', color: '#86efac', border: '1px solid rgba(74, 222, 128, 0.4)' },
  rejected: { background: 'rgba(248, 113, 113, 0.2)', color: '#fca5a5', border: '1px solid rgba(248, 113, 113, 0.4)' },
};

// ── Inline delete-confirm popover shown per table row ──────────────────────
interface RowDeletePopoverProps {
  candidateName: string;
  onDeleteRecording: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
}

const RowDeletePopover: React.FC<RowDeletePopoverProps> = ({
  candidateName,
  onDeleteRecording,
  onDeleteAll,
  onCancel,
}) => (
  <div style={popoverStyles.overlay} onClick={onCancel}>
    <div style={popoverStyles.card} onClick={(e) => e.stopPropagation()}>
      <p style={popoverStyles.question}>
        Delete for <strong>{candidateName}</strong>?
      </p>
      <div style={popoverStyles.btnRow}>
        <button style={popoverStyles.recBtn} onClick={onDeleteRecording}>
          🎥 Recording only
        </button>
        <button style={popoverStyles.allBtn} onClick={onDeleteAll}>
          ⚠️ All data
        </button>
        <button style={popoverStyles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const popoverStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    minWidth: '300px',
    maxWidth: '360px',
  },
  question: {
    margin: '0 0 1rem',
    fontSize: '0.93rem',
    color: '#ffffff',
    lineHeight: 1.5,
  },
  btnRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  recBtn: {
    background: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 600,
  },
  allBtn: {
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 600,
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 600,
  },
};

// ── Main page component ────────────────────────────────────────────────────
const AdminCandidateListPage: React.FC = () => {
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [passingThreshold, setPassingThreshold] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filterTrack, setFilterTrack] = useState<Track | ''>('');
  const [filterStatus, setFilterStatus] = useState<CandidateStatus | ''>('');
  const [filterJobRole, setFilterJobRole] = useState('');

  // Per-candidate selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [selectionResult, setSelectionResult] = useState('');
  const [selectionError, setSelectionError] = useState('');

  // Per-row inline delete
  const [rowDeleteId, setRowDeleteId] = useState<string | null>(null);

  // Cleanup state
  const [cleanupStatuses, setCleanupStatuses] = useState<CandidateStatus[]>([]);
  const [cleanupDeleteRecordings, setCleanupDeleteRecordings] = useState(true);
  const [cleanupDeleteCandidates, setCleanupDeleteCandidates] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState('');
  const [cleanupError, setCleanupError] = useState('');
  const [cleanupExpanded, setCleanupExpanded] = useState(false);

  // Ref for indeterminate checkbox
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filterTrack) params.track = filterTrack;
      if (filterStatus) params.status = filterStatus;
      if (filterJobRole) params.jobRoleId = filterJobRole;

      const res = await api.get<CandidateListResponse>('/admin/candidates', { params });
      setCandidates(res.data.candidates);
      setPassingThreshold(res.data.passingThreshold);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to load candidates. Please ensure the backend server is running on port 3001.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterTrack, filterStatus, filterJobRole]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Keep selectAll checkbox indeterminate state in sync
  useEffect(() => {
    if (!selectAllRef.current) return;
    const visibleIds = candidates.map((c) => c.id);
    const selectedVisible = visibleIds.filter((id) => selectedCandidateIds.has(id));
    if (selectedVisible.length === 0) {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = false;
    } else if (selectedVisible.length === visibleIds.length) {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = true;
    } else {
      selectAllRef.current.indeterminate = true;
      selectAllRef.current.checked = false;
    }
  }, [candidates, selectedCandidateIds]);

  // ── Selection helpers ──────────────────────────────────────────────────
  const toggleSelectAll = () => {
    const visibleIds = candidates.map((c) => c.id);
    const allSelected = visibleIds.every((id) => selectedCandidateIds.has(id));
    if (allSelected) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(visibleIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedCandidateIds(new Set());
    setSelectionResult('');
    setSelectionError('');
  };

  // ── Bulk delete for selected candidates ───────────────────────────────
  const handleSelectionDelete = async (deleteRecordings: boolean, deleteCandidates: boolean) => {
    const ids = Array.from(selectedCandidateIds);
    if (ids.length === 0) return;

    setSelectionBusy(true);
    setSelectionResult('');
    setSelectionError('');
    try {
      const res = await api.post<{
        message: string;
        deletedCandidates: number;
        deletedRecordings: number;
        affectedCandidates: number;
      }>('/admin/candidates/bulk-delete', {
        candidateIds: ids,
        deleteRecordings,
        deleteCandidates,
      });
      const d = res.data;
      const parts = [`Affected ${d.affectedCandidates} candidate(s)`];
      if (d.deletedRecordings > 0) parts.push(`deleted ${d.deletedRecordings} recording file(s)`);
      if (d.deletedCandidates > 0) parts.push(`removed ${d.deletedCandidates} candidate record(s)`);
      setSelectionResult(parts.join(' · ') + '.');
      setSelectedCandidateIds(new Set());
      await fetchCandidates();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Delete operation failed.';
      setSelectionError(msg);
    } finally {
      setSelectionBusy(false);
    }
  };

  // ── Per-row inline delete ──────────────────────────────────────────────
  const handleRowDeleteRecording = async (candidateId: string) => {
    setRowDeleteId(null);
    try {
      // Get sessions for this candidate to find recording IDs, then delete via bulk-delete
      await api.post('/admin/candidates/bulk-delete', {
        candidateIds: [candidateId],
        deleteRecordings: true,
        deleteCandidates: false,
      });
      await fetchCandidates();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to delete recording.';
      setSelectionError(msg);
    }
  };

  const handleRowDeleteAll = async (candidateId: string) => {
    setRowDeleteId(null);
    try {
      await api.delete(`/admin/candidate/${candidateId}`);
      await fetchCandidates();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to delete candidate.';
      setSelectionError(msg);
    }
  };

  // ── Cleanup (bulk by status) ───────────────────────────────────────────
  const handleCleanup = async () => {
    if (cleanupStatuses.length === 0) {
      setCleanupError('Select at least one status to clean up.');
      return;
    }

    const affectedCount = cleanupStatuses.reduce((sum, s) => sum + statusCounts[s], 0);
    const action = cleanupDeleteCandidates
      ? `permanently delete ${affectedCount} candidate record(s) and ALL their data`
      : `delete recording files for ${affectedCount} candidate(s)`;

    if (!window.confirm(`⚠️ This will ${action}.\n\nThis cannot be undone. Continue?`)) return;

    setCleanupLoading(true);
    setCleanupResult('');
    setCleanupError('');
    try {
      const res = await api.post<{
        message: string;
        deletedCandidates: number;
        deletedRecordings: number;
        affectedCandidates: number;
      }>('/admin/cleanup', {
        deleteRecordings: cleanupDeleteRecordings,
        deleteCandidates: cleanupDeleteCandidates,
        statuses: cleanupStatuses,
      });
      const d = res.data;
      const parts = [`Affected ${d.affectedCandidates} candidate(s)`];
      if (d.deletedRecordings > 0) parts.push(`deleted ${d.deletedRecordings} recording file(s)`);
      if (d.deletedCandidates > 0) parts.push(`removed ${d.deletedCandidates} candidate record(s)`);
      setCleanupResult(parts.join(' · ') + '.');
      await fetchCandidates();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Cleanup failed.';
      setCleanupError(msg);
    } finally {
      setCleanupLoading(false);
    }
  };

  const toggleCleanupStatus = (s: CandidateStatus) => {
    setCleanupStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // Count candidates per status for the cleanup preview
  const statusCounts: Record<CandidateStatus, number> = {
    pending_initial: 0, pending_gd: 0, pending_hr: 0, approved: 0, rejected: 0,
  };

  candidates.forEach((c) => {
    if (c.status in statusCounts) statusCounts[c.status as CandidateStatus]++;
  });
  const affectedPreview = cleanupStatuses.reduce((sum, s) => sum + statusCounts[s], 0);

  // Unique job roles for filter dropdown
  const jobRoleOptions = Array.from(
    new Map(candidates.map((c) => [c.jobRoleId, c.jobRoleName])).entries()
  );

  const selectedCount = selectedCandidateIds.size;
  const rowDeleteCandidate = candidates.find((c) => c.id === rowDeleteId) ?? null;

  return (
    <div style={styles.page}>
      <GlassCanvas3D mode="mixed" />
      {/* AI Agent floating chat widget */}
      <AIAgentChat />
      {/* Inline delete popover */}
      {rowDeleteId && rowDeleteCandidate && (
        <RowDeletePopover
          candidateName={rowDeleteCandidate.name}
          onDeleteRecording={() => handleRowDeleteRecording(rowDeleteId)}
          onDeleteAll={() => handleRowDeleteAll(rowDeleteId)}
          onCancel={() => setRowDeleteId(null)}
        />
      )}

      <header style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.subtitle}>Candidate Evaluations</p>
      </header>

      {/* Filters */}
      <div style={styles.filterBar} role="search" aria-label="Filter candidates">
        <select
          style={styles.select}
          value={filterTrack}
          onChange={(e) => setFilterTrack(e.target.value as Track | '')}
          aria-label="Filter by track"
        >
          <option value="">All Tracks</option>
          <option value="TJI">TJI</option>
          <option value="NTJI">NTJI</option>
        </select>

        <select
          style={styles.select}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CandidateStatus | '')}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending_initial">Pending Initial</option>
          <option value="pending_hr">Pending HR</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          style={styles.select}
          value={filterJobRole}
          onChange={(e) => setFilterJobRole(e.target.value)}
          aria-label="Filter by job role"
        >
          <option value="">All Job Roles</option>
          {jobRoleOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <button style={styles.clearBtn} onClick={() => {
          setFilterTrack('');
          setFilterStatus('');
          setFilterJobRole('');
        }}>
          Clear Filters
        </button>
      </div>

      {/* ── Selection summary bar ──────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div style={styles.selectionBar} role="region" aria-label="Selection actions">
          <span style={styles.selectionCount}>
            {selectedCount} candidate{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div style={styles.selectionActions}>
            <button
              style={{ ...styles.selActionBtn, ...styles.selDeleteRecBtn }}
              onClick={() => handleSelectionDelete(true, false)}
              disabled={selectionBusy}
              aria-label="Delete recordings for selected candidates"
            >
              🎥 Delete Recordings
            </button>
            <button
              style={{ ...styles.selActionBtn, ...styles.selDeleteAllBtn }}
              onClick={() => handleSelectionDelete(true, true)}
              disabled={selectionBusy}
              aria-label="Delete all data for selected candidates"
            >
              ⚠️ Delete All Data
            </button>
            <button
              style={{ ...styles.selActionBtn, ...styles.selClearBtn }}
              onClick={clearSelection}
              disabled={selectionBusy}
            >
              Clear selection
            </button>
          </div>
          {selectionBusy && <span style={styles.selBusy}>⏳ Working…</span>}
          {selectionResult && <span style={styles.selSuccess}>✅ {selectionResult}</span>}
          {selectionError && <span style={styles.selError}>❌ {selectionError}</span>}
        </div>
      )}

      {/* Content */}
      {loading && <p style={styles.muted}>Loading candidates…</p>}
      {error && <p style={styles.errorMsg} role="alert">{error}</p>}

      {!loading && !error && candidates.length === 0 && (
        <p style={styles.muted}>No candidates found matching the selected filters.</p>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table} aria-label="Candidates table">
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.checkboxTh }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="Select all candidates"
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Job Role</th>
                <th style={styles.th}>Track</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>HR Passcode</th>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Result</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    ...styles.tr,
                    ...(selectedCandidateIds.has(c.id) ? styles.trSelected : {}),
                    ...(c.isPassing && !selectedCandidateIds.has(c.id) ? styles.trPassing : {}),
                  }}
                >
                  <td style={{ ...styles.td, ...styles.checkboxTd }}>
                    <input
                      type="checkbox"
                      checked={selectedCandidateIds.has(c.id)}
                      onChange={() => toggleSelectOne(c.id)}
                      aria-label={`Select ${c.name}`}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <span style={styles.name}>{c.name}</span>
                      <span style={styles.email}>{c.email}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{c.jobRoleName}</td>
                  <td style={styles.td}>
                    <span style={styles.trackBadge}>{c.track}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...STATUS_COLORS[c.status as CandidateStatus] }}>
                      {STATUS_LABELS[c.status as CandidateStatus] ?? c.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f0f9ff', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                      <code style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                        {c.hrCode || c.uniqueCode || '—'}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(c.hrCode || c.uniqueCode || '');
                        }}
                        title="Copy HR code"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0, color: '#38bdf8' }}
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  <td style={styles.td}>

                    {c.overallGrade !== null ? (
                      <span style={{
                        ...styles.grade,
                        color: c.overallGrade >= passingThreshold ? '#22543d' : '#742a2a',
                      }}>
                        {c.overallGrade.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={styles.muted}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {c.overallGrade !== null ? (
                      <span style={{
                        ...styles.resultBadge,
                        ...(c.isPassing
                          ? { background: 'rgba(74, 222, 128, 0.2)', color: '#86efac' }
                          : { background: '#fed7d7', color: '#fca5a5' }),
                      }}>
                        {c.isPassing ? '✓ Passing' : '✗ Failing'}
                      </span>
                    ) : (
                      <span style={styles.muted}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      <button
                        style={styles.viewBtn}
                        onClick={() => navigate(`/admin/candidate/${c.id}`)}
                        aria-label={`View details for ${c.name}`}
                      >
                        View Details
                      </button>
                      {(c.status === 'pending_hr' || c.status === 'approved' || c.isPassing) && (
                        <button
                          style={{
                            ...styles.viewBtn,
                            background: 'rgba(56, 189, 248, 0.18)',
                            color: '#2b6cb0',
                            borderColor: '#bee3f8',
                            fontWeight: 600,
                          }}
                          onClick={() => navigate(`/admin/candidate/${c.id}`)}
                          aria-label={`Send offer letter to ${c.name}`}
                          title="Open candidate detail to customize and send offer letter"
                        >
                          ✉️ Offer
                        </button>
                      )}
                      <button
                        style={styles.rowDeleteBtn}
                        onClick={() => setRowDeleteId(c.id)}
                        aria-label={`Delete data for ${c.name}`}
                        title="Delete recording or all data"
                      >
                        🗑
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Data Cleanup Section ─────────────────────────────────────── */}
      <div style={styles.cleanupSection}>
        <button
          style={styles.cleanupToggle}
          onClick={() => setCleanupExpanded((v) => !v)}
          aria-expanded={cleanupExpanded}
        >
          🗑️ Database & Storage Cleanup
          <span style={styles.cleanupToggleHint}>
            {cleanupExpanded ? '▲ collapse' : '▼ expand'}
          </span>
        </button>

        {cleanupExpanded && (
          <div style={styles.cleanupBody}>
            {/* Status counts overview */}
            <div style={styles.cleanupOverview}>
              <span style={styles.cleanupOverviewTitle}>Current database summary</span>
              <div style={styles.cleanupStatGrid}>
                {(Object.entries(STATUS_LABELS) as [CandidateStatus, string][]).map(([s, label]) => (
                  <div key={s} style={{ ...styles.cleanupStat, ...STATUS_COLORS[s] }}>
                    <span style={styles.cleanupStatCount}>{statusCounts[s]}</span>
                    <span style={styles.cleanupStatLabel}>{label}</span>
                  </div>
                ))}
                <div style={{ ...styles.cleanupStat, background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}>
                  <span style={styles.cleanupStatCount}>{candidates.length}</span>
                  <span style={styles.cleanupStatLabel}>Total</span>
                </div>
              </div>
            </div>

            <div style={styles.cleanupDivider} />

            {/* Step 1: Choose which candidates to target */}
            <div style={styles.cleanupStep}>
              <div style={styles.cleanupStepHeader}>
                <span style={styles.cleanupStepNum}>1</span>
                <span style={styles.cleanupStepTitle}>Select candidate statuses to target</span>
              </div>
              <p style={styles.cleanupStepDesc}>
                Only candidates with the selected status(es) will be affected.
                Recommended: target <strong>Approved</strong> and <strong>Rejected</strong> —
                candidates whose process is fully complete.
              </p>
              <div style={styles.statusCardGrid}>
                {(Object.entries(STATUS_LABELS) as [CandidateStatus, string][]).map(([s, label]) => {
                  const selected = cleanupStatuses.includes(s);
                  return (
                    <button
                      key={s}
                      style={{
                        ...styles.statusCard,
                        ...(selected ? styles.statusCardSelected : {}),
                        ...(statusCounts[s] === 0 ? styles.statusCardEmpty : {}),
                      }}
                      onClick={() => toggleCleanupStatus(s)}
                      aria-pressed={selected}
                    >
                      <span style={styles.statusCardCount}>{statusCounts[s]}</span>
                      <span style={styles.statusCardLabel}>{label}</span>
                      {selected && <span style={styles.statusCardCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.cleanupDivider} />

            {/* Step 2: Choose what to delete */}
            <div style={styles.cleanupStep}>
              <div style={styles.cleanupStepHeader}>
                <span style={styles.cleanupStepNum}>2</span>
                <span style={styles.cleanupStepTitle}>Choose what to delete</span>
              </div>

              <div style={styles.cleanupOptions}>
                {/* Option A: Recordings only */}
                <div
                  style={{
                    ...styles.cleanupOption,
                    ...(cleanupDeleteRecordings && !cleanupDeleteCandidates ? styles.cleanupOptionSelected : {}),
                  }}
                  onClick={() => { setCleanupDeleteRecordings(true); setCleanupDeleteCandidates(false); }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.cleanupOptionHeader}>
                    <span style={styles.cleanupOptionIcon}>🎥</span>
                    <span style={styles.cleanupOptionTitle}>Recordings only</span>
                    <span style={styles.cleanupOptionBadge}>Recommended</span>
                  </div>
                  <p style={styles.cleanupOptionDesc}>
                    Deletes the video recording files from disk to free up storage space.
                    All interview data (Q&amp;A, grades, evaluations) is <strong>kept intact</strong>.
                    You can still review candidate performance — just not replay the video.
                  </p>
                  <div style={styles.cleanupOptionImpact}>
                    ✅ Keeps: candidate profile, interview scores, Q&amp;A, grade history<br />
                    🗑 Removes: video files only
                  </div>
                </div>

                {/* Option B: Everything */}
                <div
                  style={{
                    ...styles.cleanupOption,
                    ...(cleanupDeleteCandidates ? styles.cleanupOptionDanger : {}),
                  }}
                  onClick={() => { setCleanupDeleteRecordings(true); setCleanupDeleteCandidates(true); }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.cleanupOptionHeader}>
                    <span style={styles.cleanupOptionIcon}>⚠️</span>
                    <span style={styles.cleanupOptionTitle}>Full deletion</span>
                    <span style={{ ...styles.cleanupOptionBadge, background: '#fed7d7', color: '#fca5a5' }}>Irreversible</span>
                  </div>
                  <p style={styles.cleanupOptionDesc}>
                    Permanently deletes the candidate record, all interview sessions, evaluation data,
                    Q&amp;A history, and video files. Use this to fully remove candidates from the system.
                  </p>
                  <div style={{ ...styles.cleanupOptionImpact, color: '#fca5a5' }}>
                    🗑 Removes: everything — candidate profile, all scores, Q&amp;A, video files
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.cleanupDivider} />

            {/* Step 3: Preview & confirm */}
            <div style={styles.cleanupStep}>
              <div style={styles.cleanupStepHeader}>
                <span style={styles.cleanupStepNum}>3</span>
                <span style={styles.cleanupStepTitle}>Preview & confirm</span>
              </div>

              <div style={{
                ...styles.cleanupPreview,
                borderColor: cleanupDeleteCandidates ? '#fc8181' : '#90cdf4',
                background: cleanupDeleteCandidates ? '#fff5f5' : '#ebf8ff',
              }}>
                {cleanupStatuses.length === 0 ? (
                  <span style={{ color: '#cbd5e1' }}>← Select at least one status above to preview impact</span>
                ) : (
                  <>
                    <strong>{cleanupDeleteCandidates ? '⚠️ Full deletion' : '🎥 Recording cleanup'}</strong>
                    {' '}will affect{' '}
                    <strong style={{ fontSize: '1.1rem' }}>{affectedPreview}</strong>
                    {' '}candidate(s) with status:{' '}
                    <strong>{cleanupStatuses.map((s) => STATUS_LABELS[s]).join(', ')}</strong>.
                    {cleanupDeleteCandidates
                      ? ' Their profiles, sessions, and video files will be permanently removed.'
                      : ' Only video recording files will be deleted; all interview data remains.'}
                  </>
                )}
              </div>

              {cleanupResult && (
                <div style={styles.cleanupSuccess}>✅ {cleanupResult}</div>
              )}
              {cleanupError && (
                <div style={styles.cleanupError}>❌ {cleanupError}</div>
              )}

              <button
                style={{
                  ...styles.cleanupBtn,
                  ...(cleanupDeleteCandidates ? styles.cleanupBtnDanger : {}),
                  opacity: (cleanupLoading || cleanupStatuses.length === 0 || affectedPreview === 0) ? 0.5 : 1,
                }}
                onClick={handleCleanup}
                disabled={cleanupLoading || cleanupStatuses.length === 0 || affectedPreview === 0}
                aria-label="Run data cleanup"
              >
                {cleanupLoading
                  ? '⏳ Running cleanup…'
                  : cleanupDeleteCandidates
                  ? `⚠️ Permanently Delete ${affectedPreview} Candidate(s)`
                  : `🗑 Delete Recordings for ${affectedPreview} Candidate(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'sans-serif',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    color: '#cbd5e1',
    marginTop: '0.25rem',
    fontSize: '1rem',
  },
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
    alignItems: 'center',
  },
  select: {
    padding: '0.5rem 0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    fontSize: '0.9rem',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#ffffff',
    cursor: 'pointer',
  },
  clearBtn: {
    padding: '0.5rem 0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    fontSize: '0.9rem',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  // ── Selection bar ────────────────────────────────────────────────────
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    background: 'rgba(56, 189, 248, 0.18)',
    border: '1px solid #90cdf4',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    marginBottom: '0.75rem',
    fontSize: '0.88rem',
  },
  selectionCount: {
    fontWeight: 700,
    color: '#7dd3fc',
    marginRight: '0.25rem',
  },
  selectionActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  selActionBtn: {
    border: 'none',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 600,
  },
  selDeleteRecBtn: {
    background: '#4299e1',
    color: '#fff',
  },
  selDeleteAllBtn: {
    background: '#e53e3e',
    color: '#fff',
  },
  selClearBtn: {
    background: '#e2e8f0',
    color: '#e2e8f0',
  },
  selBusy: {
    color: '#7dd3fc',
    fontSize: '0.83rem',
  },
  selSuccess: {
    color: '#86efac',
    fontWeight: 600,
    fontSize: '0.83rem',
  },
  selError: {
    color: '#fca5a5',
    fontWeight: 600,
    fontSize: '0.83rem',
  },
  // ── Table ─────────────────────────────────────────────────────────────
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(255, 255, 255, 0.04)',
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    background: 'rgba(15, 23, 42, 0.7)',
  },
  checkboxTh: {
    width: '40px',
    padding: '0.75rem 0.5rem 0.75rem 1rem',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.15s',
  },
  trPassing: {
    background: 'rgba(74, 222, 128, 0.15)',
  },
  trSelected: {
    background: 'rgba(56, 189, 248, 0.18)',
  },
  td: {
    padding: '0.85rem 1rem',
    fontSize: '0.9rem',
    color: '#ffffff',
    verticalAlign: 'middle',
  },
  checkboxTd: {
    padding: '0.85rem 0.5rem 0.85rem 1rem',
    width: '40px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#4299e1',
  },
  nameCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  name: {
    fontWeight: 600,
    color: '#ffffff',
  },
  email: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
  },
  trackBadge: {
    background: '#e9d8fd',
    color: '#553c9a',
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  statusBadge: {
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  grade: {
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  resultBadge: {
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  actionsCell: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
  },
  viewBtn: {
    background: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.4rem 0.85rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  rowDeleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '0.35rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    lineHeight: 1,
    color: '#cbd5e1',
    transition: 'border-color 0.15s, color 0.15s',
  },
  muted: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
  },
  errorMsg: {
    color: '#e53e3e',
    fontSize: '0.9rem',
  },
  // ── Cleanup section ───────────────────────────────────────────────────
  cleanupSection: {
    marginTop: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cleanupToggle: {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.7)',
    border: 'none',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 1.25rem',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cleanupToggleHint: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    fontWeight: 400,
  },
  cleanupBody: {
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  cleanupOverview: {
    marginBottom: '1.25rem',
  },
  cleanupOverviewTitle: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#cbd5e1',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '0.6rem',
  },
  cleanupStatGrid: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap' as const,
  },
  cleanupStat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '0.5rem 0.9rem',
    borderRadius: '8px',
    minWidth: '80px',
  },
  cleanupStatCount: {
    fontSize: '1.4rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  cleanupStatLabel: {
    fontSize: '0.72rem',
    fontWeight: 500,
    marginTop: '0.2rem',
    textAlign: 'center' as const,
  },
  cleanupDivider: {
    height: '1px',
    background: '#e2e8f0',
    margin: '1.25rem 0',
  },
  cleanupStep: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  cleanupStepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  cleanupStepNum: {
    background: '#4299e1',
    color: '#fff',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  cleanupStepTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  cleanupStepDesc: {
    fontSize: '0.86rem',
    color: '#e2e8f0',
    lineHeight: 1.55,
    margin: 0,
  },
  statusCardGrid: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap' as const,
  },
  statusCard: {
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    background: 'rgba(255, 255, 255, 0.04)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: '110px',
    position: 'relative' as const,
    transition: 'all 0.15s',
  },
  statusCardSelected: {
    border: '2px solid #38bdf8',
    background: 'rgba(56, 189, 248, 0.18)',
  },
  statusCardEmpty: {
    opacity: 0.45,
    cursor: 'default',
  },
  statusCardCount: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1,
  },
  statusCardLabel: {
    fontSize: '0.75rem',
    color: '#cbd5e1',
    marginTop: '0.2rem',
    textAlign: 'center' as const,
  },
  statusCardCheck: {
    position: 'absolute' as const,
    top: '4px',
    right: '6px',
    color: '#4299e1',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  cleanupOptions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  cleanupOption: {
    flex: '1 1 280px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '1rem',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.04)',
    transition: 'all 0.15s',
  },
  cleanupOptionSelected: {
    border: '2px solid #38bdf8',
    background: 'rgba(56, 189, 248, 0.18)',
  },
  cleanupOptionDanger: {
    border: '2px solid #f87171',
    background: 'rgba(248, 113, 113, 0.15)',
  },
  cleanupOptionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  cleanupOptionIcon: {
    fontSize: '1.2rem',
  },
  cleanupOptionTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#ffffff',
    flex: 1,
  },
  cleanupOptionBadge: {
    background: 'rgba(74, 222, 128, 0.2)',
    color: '#86efac',
    borderRadius: '999px',
    padding: '0.1rem 0.5rem',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  cleanupOptionDesc: {
    fontSize: '0.84rem',
    color: '#e2e8f0',
    lineHeight: 1.5,
    margin: '0 0 0.5rem 0',
  },
  cleanupOptionImpact: {
    fontSize: '0.8rem',
    color: '#ffffff',
    background: 'rgba(15, 23, 42, 0.7)',
    borderRadius: '6px',
    padding: '0.4rem 0.6rem',
    lineHeight: 1.6,
  },
  cleanupPreview: {
    border: '1.5px solid rgba(56, 189, 248, 0.4)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.88rem',
    color: '#ffffff',
    lineHeight: 1.55,
  },
  cleanupSuccess: {
    background: 'rgba(74, 222, 128, 0.15)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    fontSize: '0.88rem',
    color: '#86efac',
  },
  cleanupError: {
    background: 'rgba(248, 113, 113, 0.15)',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    fontSize: '0.88rem',
    color: '#fca5a5',
  },
  cleanupBtn: {
    background: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.4rem',
    cursor: 'pointer',
    fontSize: '0.92rem',
    fontWeight: 700,
    alignSelf: 'flex-start' as const,
    marginTop: '0.25rem',
  },
  cleanupBtnDanger: {
    background: '#e53e3e',
  },
};

export default AdminCandidateListPage;
