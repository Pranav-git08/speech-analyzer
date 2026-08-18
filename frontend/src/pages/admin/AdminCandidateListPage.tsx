import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { CandidateSummary, CandidateListResponse, Track, CandidateStatus } from '../../types/admin';
import AIAgentChat from '../../components/AIAgentChat';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import {
  getLocalCandidateSummaries,
  deleteLocalCandidate,
  deleteMultipleLocalCandidates,
  deleteLocalCandidatesByStatus,
  deleteLocalCandidateRecordings,
  getDeletedCandidateIds,
} from '../../utils/candidateStore';

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
        Delete candidate record for <strong>{candidateName}</strong>?
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
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  card: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '14px',
    padding: '1.5rem 1.75rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    minWidth: '320px',
    maxWidth: '400px',
    color: '#ffffff',
  },
  question: {
    margin: '0 0 1.25rem',
    fontSize: '0.95rem',
    color: '#ffffff',
    lineHeight: 1.5,
  },
  btnRow: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap' as const,
  },
  recBtn: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  allBtn: {
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
};

// ── Main page component ────────────────────────────────────────────────────
const AdminCandidateListPage: React.FC = () => {
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [passingThreshold, setPassingThreshold] = useState(50);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterTrack, setFilterTrack] = useState<Track | ''>('');
  const [filterStatus, setFilterStatus] = useState<CandidateStatus | ''>('');
  const [filterJobRole, setFilterJobRole] = useState('');

  // Per-candidate selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [selectionResult, setSelectionResult] = useState('');

  // Per-row inline delete
  const [rowDeleteId, setRowDeleteId] = useState<string | null>(null);

  // Cleanup state
  const [cleanupStatuses, setCleanupStatuses] = useState<CandidateStatus[]>([]);
  const [cleanupDeleteRecordings, setCleanupDeleteRecordings] = useState(true);
  const [cleanupDeleteCandidates, setCleanupDeleteCandidates] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState('');
  const [cleanupExpanded, setCleanupExpanded] = useState(false);

  // Ref for indeterminate checkbox
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const deletedIds = getDeletedCandidateIds();
    const localList = getLocalCandidateSummaries().filter((c) => !deletedIds.has(c.id));

    try {
      const params: Record<string, string> = {};
      if (filterTrack) params.track = filterTrack;
      if (filterStatus) params.status = filterStatus;
      if (filterJobRole) params.jobRoleId = filterJobRole;

      const res = await api.get<CandidateListResponse>('/admin/candidates', { params, timeout: 3000 });
      const serverList = (res.data?.candidates || []).filter((c) => !deletedIds.has(c.id));

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
    } else if (selectedVisible.length === visibleIds.length && visibleIds.length > 0) {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = true;
    } else {
      selectAllRef.current.indeterminate = selectedVisible.length > 0;
      selectAllRef.current.checked = false;
    }
  }, [candidates, selectedCandidateIds]);

  // ── Selection helpers ──────────────────────────────────────────────────
  const toggleSelectAll = () => {
    const visibleIds = candidates.map((c) => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCandidateIds.has(id));
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
  };

  // ── Bulk delete for selected candidates ───────────────────────────────
  const handleSelectionDelete = async (deleteRecordings: boolean, deleteCandidates: boolean) => {
    const ids = Array.from(selectedCandidateIds);
    if (ids.length === 0) return;

    setSelectionBusy(true);
    setSelectionResult('');

    if (deleteCandidates) {
      deleteMultipleLocalCandidates(ids);
      setCandidates((prev) => prev.filter((c) => !selectedCandidateIds.has(c.id)));
      setSelectionResult(`✅ Successfully deleted ${ids.length} candidate record(s).`);
    } else if (deleteRecordings) {
      deleteLocalCandidateRecordings(ids);
      setSelectionResult(`✅ Removed recordings for ${ids.length} candidate(s).`);
    }

    try {
      await api.post('/admin/candidates/bulk-delete', {
        candidateIds: ids,
        deleteRecordings,
        deleteCandidates,
      }, { timeout: 3000 });
    } catch {
      // Offline fallback succeeded
    } finally {
      setSelectedCandidateIds(new Set());
      setSelectionBusy(false);
      setTimeout(() => setSelectionResult(''), 5000);
    }
  };

  // ── Per-row inline delete ──────────────────────────────────────────────
  const handleRowDeleteRecording = async (candidateId: string) => {
    setRowDeleteId(null);
    deleteLocalCandidateRecordings([candidateId]);
    setSelectionResult('✅ Video recording removed for candidate.');
    try {
      await api.post('/admin/candidates/bulk-delete', {
        candidateIds: [candidateId],
        deleteRecordings: true,
        deleteCandidates: false,
      }, { timeout: 3000 });
    } catch {
      // handled
    }
    setTimeout(() => setSelectionResult(''), 5000);
  };

  const handleRowDeleteAll = async (candidateId: string) => {
    setRowDeleteId(null);
    deleteLocalCandidate(candidateId);
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    setSelectionResult('✅ Candidate record permanently deleted.');
    try {
      await api.delete(`/admin/candidate/${candidateId}`, { timeout: 3000 });
    } catch {
      // handled
    }
    setTimeout(() => setSelectionResult(''), 5000);
  };

  // ── Cleanup (bulk by status) ───────────────────────────────────────────
  const handleCleanup = async () => {
    if (cleanupStatuses.length === 0) {
      alert('Please select at least one status to clean up.');
      return;
    }

    const matchingCandidates = candidates.filter((c) => cleanupStatuses.includes(c.status));
    const affectedCount = matchingCandidates.length;

    if (affectedCount === 0) {
      setCleanupResult('No candidates matched the selected status filters.');
      setTimeout(() => setCleanupResult(''), 4000);
      return;
    }

    const action = cleanupDeleteCandidates
      ? `permanently delete ${affectedCount} candidate record(s) and ALL their data`
      : `delete recording files for ${affectedCount} candidate(s)`;

    if (!window.confirm(`⚠️ Are you sure you want to ${action}?`)) return;

    setCleanupLoading(true);
    setCleanupResult('');

    if (cleanupDeleteCandidates) {
      deleteLocalCandidatesByStatus(cleanupStatuses);
      setCandidates((prev) => prev.filter((c) => !cleanupStatuses.includes(c.status)));
      setCleanupResult(`✅ Successfully deleted ${affectedCount} candidate record(s).`);
    } else {
      deleteLocalCandidateRecordings(matchingCandidates.map((c) => c.id));
      setCleanupResult(`✅ Cleaned up recording files for ${affectedCount} candidate(s).`);
    }

    try {
      await api.post('/admin/cleanup', {
        deleteRecordings: cleanupDeleteRecordings,
        deleteCandidates: cleanupDeleteCandidates,
        statuses: cleanupStatuses,
      }, { timeout: 3000 });
    } catch {
      // handled
    } finally {
      setCleanupLoading(false);
      setTimeout(() => setCleanupResult(''), 5000);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>Unified Candidate Evaluation & Recruitment Management</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              style={styles.refreshBtn}
              onClick={fetchCandidates}
              title="Refresh candidate evaluations"
            >
              🔄 Refresh List
            </button>
          </div>
        </div>
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
          <option value="TJI">TJI (Technical Track)</option>
          <option value="NTJI">NTJI (Non-Technical Track)</option>
        </select>

        <select
          style={styles.select}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CandidateStatus | '')}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending_initial">Pending Round 1</option>
          <option value="pending_gd">Pending GD Round</option>
          <option value="pending_hr">Pending HR Round</option>
          <option value="approved">Approved for Hire</option>
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
          {cleanupExpanded ? '▲ Hide Batch Cleanup Tool' : '⚙️ Batch Status Cleanup Tool'}
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
              🗑️ Delete Selected
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

      {/* Collapsible Status Cleanup Panel */}
      {cleanupExpanded && (
        <div style={styles.cleanupCard}>
          <div style={styles.cleanupCardTitle}>Batch Cleanup by Candidate Status</div>
          <p style={styles.cleanupCardDesc}>
            Select candidate statuses below to clean up recordings or remove stale records in bulk across all tracks.
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
              <span>Delete recordings only (keep candidate scorecards and dossiers)</span>
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
                ? 'Processing Cleanup...'
                : `Run Cleanup (${affectedPreview} Candidate${affectedPreview === 1 ? '' : 's'})`}
            </button>
          </div>

          {cleanupResult && (
            <div style={styles.successBanner} role="status">{cleanupResult}</div>
          )}
        </div>
      )}

      {/* Candidate Table */}
      {loading ? (
        <div style={styles.stateMessage}>Loading candidate evaluations...</div>
      ) : candidates.length === 0 ? (
        <div style={styles.stateMessage}>
          <h3>No candidates found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {filterTrack || filterStatus || filterJobRole
              ? 'No candidates match the active filters.'
              : 'Candidate interviews will appear here as soon as they complete their evaluation.'}
          </p>
        </div>
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
                <th style={styles.th}>Candidate Name</th>
                <th style={styles.th}>Track</th>
                <th style={styles.th}>Job Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Overall Score</th>
                <th style={styles.th}>Verdict</th>
                <th style={styles.th}>Applied Date</th>
                <th style={{ ...styles.th, textAlign: 'center', width: '80px' }}>Actions</th>
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
                      background: isSelected ? 'rgba(56, 189, 248, 0.1)' : undefined,
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
                      <span style={{
                        ...styles.trackBadge,
                        background: c.track === 'TJI' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(167, 139, 250, 0.2)',
                        color: c.track === 'TJI' ? '#93c5fd' : '#c084fc',
                        border: `1px solid ${c.track === 'TJI' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(167, 139, 250, 0.3)'}`,
                      }}>
                        {c.track === 'TJI' ? '⚡ TJI (Tech)' : '🌐 NTJI (Non-Tech)'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.jobRoleName}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...(STATUS_COLORS[c.status] ?? {}) }}>
                        ● {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {c.overallGrade !== null ? (
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: c.overallGrade >= passingThreshold ? '#4ade80' : '#f87171',
                          }}
                        >
                          {c.overallGrade}/100
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {c.overallGrade !== null ? (
                        c.overallGrade >= passingThreshold ? (
                          <span style={styles.passBadge}>✓ PASS</span>
                        ) : (
                          <span style={styles.failBadge}>✗ FAIL</span>
                        )
                      ) : (
                        <span style={styles.pendingBadge}>● In Progress</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
                        {new Date(c.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td
                      style={{ ...styles.td, textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={styles.rowDeleteBtn}
                        onClick={() => setRowDeleteId(c.id)}
                        title="Delete candidate record"
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
    padding: '2.5rem',
    maxWidth: '1350px',
    margin: '0 auto',
    color: '#ffffff',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    marginBottom: '1.75rem',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.35rem 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#cbd5e1',
    margin: 0,
  },
  refreshBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '0.6rem 1.1rem',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  filterBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  select: {
    padding: '0.65rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#ffffff',
    fontSize: '0.92rem',
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
  },
  bulkToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  cleanupToggleBtn: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '8px',
    padding: '0.55rem 1rem',
    fontSize: '0.88rem',
    cursor: 'pointer',
    fontWeight: 700,
  },
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
    background: 'rgba(15, 23, 42, 0.85)',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  selectionCount: {
    fontSize: '0.9rem',
    color: '#e2e8f0',
  },
  actionBtnRec: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontWeight: 700,
  },
  actionBtnDanger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.9rem',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontWeight: 700,
  },
  clearSelectionBtn: {
    background: 'transparent',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    padding: '0.45rem 0.8rem',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  cleanupCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    padding: '1.5rem 1.75rem',
    marginBottom: '1.5rem',
    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
  },
  cleanupCardTitle: {
    fontWeight: 800,
    fontSize: '1.1rem',
    color: '#ffffff',
    marginBottom: '0.35rem',
  },
  cleanupCardDesc: {
    fontSize: '0.88rem',
    color: '#cbd5e1',
    margin: '0 0 1.25rem',
  },
  checkboxGroup: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap',
    marginBottom: '1.25rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontWeight: 600,
  },
  countBadge: {
    background: 'rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    borderRadius: '12px',
    padding: '0.15rem 0.55rem',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  optionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginBottom: '1.5rem',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.9rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  cleanupActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  runCleanupBtn: {
    background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1.5rem',
    fontSize: '0.92rem',
    fontWeight: 800,
  },
  successBanner: {
    background: 'rgba(74, 222, 128, 0.15)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    color: '#86efac',
    padding: '0.85rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.92rem',
    fontWeight: 700,
    marginBottom: '1.25rem',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.92rem',
  },
  th: {
    padding: '1rem 1.25rem',
    textAlign: 'left',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#cbd5e1',
    fontWeight: 800,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  td: {
    padding: '1.1rem 1.25rem',
    verticalAlign: 'middle',
    color: '#f1f5f9',
  },
  candidateName: {
    fontWeight: 800,
    color: '#ffffff',
    fontSize: '1rem',
  },
  candidateEmail: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    marginTop: '0.15rem',
  },
  trackBadge: {
    padding: '0.3rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 800,
    display: 'inline-block',
  },
  statusBadge: {
    padding: '0.35rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 800,
    display: 'inline-block',
  },
  passBadge: {
    background: 'rgba(74, 222, 128, 0.15)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    padding: '0.3rem 0.7rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 900,
  },
  failBadge: {
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    padding: '0.3rem 0.7rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 900,
  },
  pendingBadge: {
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#fde047',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    padding: '0.3rem 0.7rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  rowDeleteBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.4rem 0.6rem',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  stateMessage: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#ffffff',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
};

export default AdminCandidateListPage;
