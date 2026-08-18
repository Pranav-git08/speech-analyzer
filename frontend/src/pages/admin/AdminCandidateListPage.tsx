import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { CandidateSummary, CandidateListResponse, Track, CandidateStatus } from '../../types/admin';
import AIAgentChat from '../../components/AIAgentChat';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import { getLocalCandidateSummaries, deleteLocalCandidate } from '../../utils/candidateStore';

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
    const localList = getLocalCandidateSummaries();

    try {
      const params: Record<string, string> = {};
      if (filterTrack) params.track = filterTrack;
      if (filterStatus) params.status = filterStatus;
      if (filterJobRole) params.jobRoleId = filterJobRole;

      const res = await api.get<CandidateListResponse>('/admin/candidates', { params, timeout: 3000 });
      const serverList = res.data?.candidates || [];

      const map = new Map<string, CandidateSummary>();
      serverList.forEach((c) => map.set(c.id, c));
      localList.forEach((c) => map.set(c.id, c));

      let combined = Array.from(map.values());
      if (filterTrack) combined = combined.filter((c) => c.track === filterTrack);
      if (filterStatus) combined = combined.filter((c) => c.status === filterStatus);
      if (filterJobRole) combined = combined.filter((c) => c.jobRoleId === filterJobRole);

      setCandidates(combined);
      setPassingThreshold(res.data?.passingThreshold || 50);
    } catch {
      let combined = localList;
      if (filterTrack) combined = combined.filter((c) => c.track === filterTrack);
      if (filterStatus) combined = combined.filter((c) => c.status === filterStatus);
      if (filterJobRole) combined = combined.filter((c) => c.jobRoleId === filterJobRole);

      setCandidates(combined);
      setPassingThreshold(50);
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

    if (deleteCandidates) {
      ids.forEach((id) => deleteLocalCandidate(id));
    }

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
      }, { timeout: 3000 });
      const d = res.data;
      const parts = [`Affected ${d.affectedCandidates} candidate(s)`];
      if (d.deletedRecordings > 0) parts.push(`deleted ${d.deletedRecordings} recording file(s)`);
      if (d.deletedCandidates > 0) parts.push(`removed ${d.deletedCandidates} candidate record(s)`);
      setSelectionResult(parts.join(' · ') + '.');
    } catch {
      setSelectionResult(`Removed ${ids.length} candidate(s).`);
    } finally {
      setSelectedCandidateIds(new Set());
      await fetchCandidates();
      setSelectionBusy(false);
    }
  };

  // ── Per-row inline delete ──────────────────────────────────────────────
  const handleRowDeleteRecording = async (candidateId: string) => {
    setRowDeleteId(null);
    try {
      await api.post('/admin/candidates/bulk-delete', {
        candidateIds: [candidateId],
        deleteRecordings: true,
        deleteCandidates: false,
      }, { timeout: 3000 });
      await fetchCandidates();
    } catch {
      await fetchCandidates();
    }
  };

  const handleRowDeleteAll = async (candidateId: string) => {
    setRowDeleteId(null);
    deleteLocalCandidate(candidateId);
    try {
      await api.delete(`/admin/candidate/${candidateId}`, { timeout: 3000 });
      await fetchCandidates();
    } catch {
      await fetchCandidates();
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
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk action toolbar */}
      <div style={styles.bulkToolbar}>
        <button
          style={styles.cleanupToggleBtn}
          onClick={() => setCleanupExpanded((v) => !v)}
          aria-expanded={cleanupExpanded}
        >
          {cleanupExpanded ? '▲ Hide Status Cleanup' : '▼ Status Cleanup Tool'}
        </button>

        {selectedCount > 0 && (
          <div style={styles.selectionBar}>
            <span style={styles.selectionCount}>
              <strong>{selectedCount}</strong> candidate{selectedCount > 1 ? 's' : ''} selected
            </span>
            <button
              style={styles.actionBtnRec}
              onClick={() => handleSelectionDelete(true, false)}
              disabled={selectionBusy}
              title="Delete video/audio recordings for selected candidates while preserving candidate records"
            >
              🎥 Delete Recordings
            </button>
            <button
              style={styles.actionBtnDanger}
              onClick={() => handleSelectionDelete(true, true)}
              disabled={selectionBusy}
              title="Permanently remove selected candidates and all their data"
            >
              ⚠️ Delete Selected
            </button>
            <button
              style={styles.clearSelectionBtn}
              onClick={clearSelection}
              disabled={selectionBusy}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {selectionResult && (
        <div style={styles.successBanner} role="status">{selectionResult}</div>
      )}
      {selectionError && (
        <div style={styles.errorBanner} role="alert">{selectionError}</div>
      )}

      {/* Collapsible Status Cleanup Panel */}
      {cleanupExpanded && (
        <div style={styles.cleanupCard}>
          <div style={styles.cleanupCardTitle}>Batch Cleanup by Status</div>
          <p style={styles.cleanupCardDesc}>
            Select candidate statuses below to clean up recordings or remove stale records in bulk.
          </p>

          <div style={styles.checkboxGroup}>
            {(['pending_initial', 'pending_gd', 'pending_hr', 'approved', 'rejected'] as CandidateStatus[]).map(
              (s) => (
                <label key={s} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cleanupStatuses.includes(s)}
                    onChange={() => toggleCleanupStatus(s)}
                  />
                  <span>{STATUS_LABELS[s]}</span>
                  <span style={styles.countBadge}>{statusCounts[s]}</span>
                </label>
              )
            )}
          </div>

          <div style={styles.optionsRow}>
            <label style={styles.radioOption}>
              <input
                type="radio"
                name="cleanupType"
                checked={cleanupDeleteRecordings && !cleanupDeleteCandidates}
                onChange={() => {
                  setCleanupDeleteRecordings(true);
                  setCleanupDeleteCandidates(false);
                }}
              />
              <span>Delete recordings only (keep candidate records)</span>
            </label>
            <label style={styles.radioOption}>
              <input
                type="radio"
                name="cleanupType"
                checked={cleanupDeleteCandidates}
                onChange={() => {
                  setCleanupDeleteRecordings(true);
                  setCleanupDeleteCandidates(true);
                }}
              />
              <span style={{ color: '#fca5a5' }}>
                ⚠️ Delete entire candidate records (irreversible)
              </span>
            </label>
          </div>

          <div style={styles.cleanupActions}>
            <button
              style={{
                ...styles.runCleanupBtn,
                opacity: cleanupStatuses.length === 0 || cleanupLoading ? 0.6 : 1,
                cursor: cleanupStatuses.length === 0 || cleanupLoading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleCleanup}
              disabled={cleanupStatuses.length === 0 || cleanupLoading}
            >
              {cleanupLoading
                ? 'Processing...'
                : `Run Cleanup (${affectedPreview} candidate${affectedPreview === 1 ? '' : 's'})`}
            </button>
          </div>

          {cleanupResult && (
            <div style={styles.successBanner} role="status">{cleanupResult}</div>
          )}
          {cleanupError && (
            <div style={styles.errorBanner} role="alert">{cleanupError}</div>
          )}
        </div>
      )}

      {/* Candidate Table */}
      {loading ? (
        <div style={styles.stateMessage}>Loading candidates...</div>
      ) : error ? (
        <div style={styles.errorMessage}>{error}</div>
      ) : candidates.length === 0 ? (
        <div style={styles.stateMessage}>No candidates found matching the criteria.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    onChange={toggleSelectAll}
                    aria-label="Select all candidates"
                  />
                </th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Track</th>
                <th style={styles.th}>Job Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>R1 Score</th>
                <th style={styles.th}>Final Score</th>
                <th style={styles.th}>Result</th>
                <th style={styles.th}>Date</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const isSelected = selectedCandidateIds.has(c.id);
                return (
                  <tr
                    key={c.id}
                    style={{
                      ...styles.tr,
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : undefined,
                    }}
                    onClick={() => navigate(`/admin/candidate/${c.id}`)}
                  >
                    <td
                      style={{ ...styles.td, textAlign: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectOne(c.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(c.id)}
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.candidateName}>{c.name}</div>
                      <div style={styles.candidateEmail}>{c.email}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.trackBadge}>{c.track}</span>
                    </td>
                    <td style={styles.td}>{c.jobRoleName}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...(STATUS_COLORS[c.status] ?? {}) }}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {c.overallGrade !== null ? `${c.overallGrade}/100` : '—'}
                    </td>
                    <td style={styles.td}>
                      {c.overallGrade !== null ? (
                        <span
                          style={{
                            fontWeight: 'bold',
                            color: c.overallGrade >= passingThreshold ? '#48bb78' : '#f56565',
                          }}
                        >
                          {c.overallGrade}/100
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={styles.td}>
                      {c.overallGrade !== null ? (
                        c.overallGrade >= passingThreshold ? (
                          <span style={styles.passBadge}>PASS</span>
                        ) : (
                          <span style={styles.failBadge}>FAIL</span>
                        )
                      ) : (
                        <span style={styles.pendingBadge}>In Progress</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td
                      style={{ ...styles.td, textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={styles.rowDeleteBtn}
                        onClick={() => setRowDeleteId(c.id)}
                        title="Delete recording or remove candidate"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '2rem',
    maxWidth: '1300px',
    margin: '0 auto',
    color: '#ffffff',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 0.25rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#cbd5e1',
    margin: 0,
  },
  filterBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  select: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#ffffff',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  bulkToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  cleanupToggleBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#90cdf4',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  selectionCount: {
    fontSize: '0.85rem',
    color: '#e2e8f0',
  },
  actionBtnRec: {
    background: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  actionBtnDanger: {
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  clearSelectionBtn: {
    background: 'transparent',
    color: '#a0aec0',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '5px',
    padding: '0.35rem 0.6rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  cleanupCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
  },
  cleanupCardTitle: {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#ffffff',
    marginBottom: '0.35rem',
  },
  cleanupCardDesc: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    margin: '0 0 1rem',
  },
  checkboxGroup: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.88rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  countBadge: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#a0aec0',
    borderRadius: '10px',
    padding: '0.1rem 0.45rem',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  optionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1.25rem',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.88rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  cleanupActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  runCleanupBtn: {
    background: '#dd6b20',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  successBanner: {
    background: 'rgba(74, 222, 128, 0.15)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    color: '#86efac',
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    fontSize: '0.88rem',
    marginBottom: '1rem',
  },
  errorBanner: {
    background: 'rgba(248, 113, 113, 0.15)',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    color: '#fca5a5',
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    fontSize: '0.88rem',
    marginBottom: '1rem',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    padding: '0.85rem 1rem',
    textAlign: 'left',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#cbd5e1',
    fontWeight: 600,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  td: {
    padding: '0.85rem 1rem',
    verticalAlign: 'middle',
    color: '#e2e8f0',
  },
  candidateName: {
    fontWeight: 600,
    color: '#ffffff',
  },
  candidateEmail: {
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  trackBadge: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#90cdf4',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.78rem',
    fontWeight: 600,
    display: 'inline-block',
  },
  passBadge: {
    background: 'rgba(74, 222, 128, 0.15)',
    color: '#86efac',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.78rem',
    fontWeight: 'bold',
  },
  failBadge: {
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#fca5a5',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.78rem',
    fontWeight: 'bold',
  },
  pendingBadge: {
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#fde047',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.78rem',
  },
  rowDeleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    opacity: 0.7,
  },
  stateMessage: {
    textAlign: 'center',
    padding: '3rem',
    color: '#cbd5e1',
  },
  errorMessage: {
    textAlign: 'center',
    padding: '2rem',
    color: '#fca5a5',
  },
};

export default AdminCandidateListPage;
