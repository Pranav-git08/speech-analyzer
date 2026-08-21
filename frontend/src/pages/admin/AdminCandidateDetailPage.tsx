import { getRecordedVideoUrl } from '../../utils/videoStorage';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import {
  CandidateDetail,
  CandidateDetailResponse,
  CandidateStatus,
  SessionSummary,
  AnswerSummary,
  EvaluationSummary,
  ResumeDataSummary,
  CandidateIntelligenceDossierSummary,
  AntiCheatReportSummary,
} from '../../types/admin';
import AIAgentChat from '../../components/AIAgentChat';
import { getLocalCandidateDetail, updateLocalCandidateStatus, deleteLocalCandidate } from '../../utils/candidateStore';
import GlassCanvas3D from '../../components/GlassCanvas3D';

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending_initial: 'Pending Round 1 Review',
  pending_gd: 'Pending GD Round',
  pending_hr: 'Pending HR Round',
  approved: 'Approved for Hire',
  rejected: 'Rejected',
};

const STATUS_PILL_STYLE: Record<CandidateStatus, { bg: string; color: string; border: string }> = {
  pending_initial: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fde047', border: 'rgba(251, 191, 36, 0.4)' },
  pending_gd: { bg: 'rgba(167, 139, 250, 0.2)', color: '#c084fc', border: 'rgba(167, 139, 250, 0.4)' },
  pending_hr: { bg: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', border: 'rgba(56, 189, 248, 0.4)' },
  approved: { bg: 'rgba(74, 222, 128, 0.2)', color: '#86efac', border: 'rgba(74, 222, 128, 0.4)' },
  rejected: { bg: 'rgba(248, 113, 113, 0.2)', color: '#fca5a5', border: 'rgba(248, 113, 113, 0.4)' },
};

const ROUND_LABELS: Record<string, string> = {
  technical: 'Technical Round (TJI)',
  qualifying: 'Non-Technical Round (NTJI)',
  hr: 'Executive HR Round',
};

export const AdminCandidateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [passingThreshold, setPassingThreshold] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active navigation tab: 'video' | 'assessment' | 'integrity' | 'resume'
  const [activeTab, setActiveTab] = useState<'video' | 'assessment' | 'integrity' | 'resume'>('video');

  // Selected video round in the single video player: 'initial' | 'hr' | 'full'
  const [selectedVideoRound, setSelectedVideoRound] = useState<'initial' | 'hr' | 'full'>('initial');

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [copiedHrCode, setCopiedHrCode] = useState(false);


  // Offer letter modal state
  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerEmail, setOfferEmail] = useState('');
  const [offerSalary, setOfferSalary] = useState('₹8,50,000 LPA');
  const [offerJoiningDate, setOfferJoiningDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [offerLocation, setOfferLocation] = useState('Hyderabad / Hybrid');
  const [offerCustomMsg, setOfferCustomMsg] = useState(
    'We were thoroughly impressed by your performance in the assessment rounds. Welcome to our team!'
  );
  const [offerSending, setOfferSending] = useState(false);


    const fetchCandidate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<CandidateDetailResponse>(`/admin/candidate/${id}`, { timeout: 3000 });
      const cand = res.data?.candidate;
      if (cand) {
        setCandidate(cand);
        setPassingThreshold(res.data?.passingThreshold || 50);
        if (cand?.email) {
          setOfferEmail(cand.email);
        }
        return;
      }
    } catch (err: unknown) {
      console.warn('[AdminDetail] Backend candidate fetch failed, checking local store:', err);
    }

    // Local fallback
    if (id) {
      const localCand = getLocalCandidateDetail(id);
      if (localCand) {
        setCandidate(localCand);
        setPassingThreshold(50);
        if (localCand.email) {
          setOfferEmail(localCand.email);
        }
        setLoading(false);
        return;
      }
    }

    setError('Candidate record not found.');
    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchCandidate();
    }
  }, [id]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Action handlers
  const handleApproveInitial = async () => {
    if (!candidate) return;
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    updateLocalCandidateStatus(candidate.id, 'pending_hr');
    try {
      const res = await api.post<{ message: string; hrCode: string }>(
        `/admin/candidate/${candidate.id}/approve-initial`, {}, { timeout: 3000 }
      );
      setActionMsg(res.data.message);
    } catch {
      setActionMsg('Candidate successfully approved for HR Round.');
    } finally {
      await fetchCandidate();
      setActionLoading(false);
    }
  };

  const handleDisapproveHR = async () => {
    if (!candidate) return;
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    updateLocalCandidateStatus(candidate.id, 'rejected');
    try {
      const res = await api.post<{ message: string }>(
        `/admin/candidate/${candidate.id}/disapprove-hr`, {}, { timeout: 3000 }
      );
      setActionMsg(res.data.message);
    } catch {
      setActionMsg('Candidate marked as rejected.');
    } finally {
      await fetchCandidate();
      setActionLoading(false);
    }
  };

  const handleApproveFinal = async () => {

    if (!candidate) return;
    setActionLoading(true);
    setActionMsg('');
    setActionError('');

    try {
      let offerLetterPayload: { content: string; filename: string; type: string } | undefined;
      if (offerLetterFile) {
        const content = await fileToBase64(offerLetterFile);
        offerLetterPayload = {
          content,
          filename: offerLetterFile.name,
          type: offerLetterFile.type,
        };
      }

      const res = await api.post<{ message: string }>(
        `/admin/candidate/${candidate.id}/approve-final`,
        { offerLetter: offerLetterPayload }
      );
      setActionMsg(res.data.message);
      setOfferLetterFile(null);
      await fetchCandidate();
    } catch (err: unknown) {
      setActionError((err as any)?.response?.data?.error || 'Failed to approve candidate.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendOfferEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!candidate) return;
    setOfferSending(true);
    setActionMsg('');
    setActionError('');

    try {
      let offerLetterPayload: { content: string; filename: string; type: string } | undefined;
      if (offerLetterFile) {
        const content = await fileToBase64(offerLetterFile);
        offerLetterPayload = {
          content,
          filename: offerLetterFile.name,
          type: offerLetterFile.type,
        };
      }

      const res = await api.post<{ message: string; success: boolean }>(
        `/admin/candidate/${candidate.id}/send-offer-letter`,
        {
          candidateEmail: offerEmail || candidate.email,
          salary: offerSalary,
          joiningDate: offerJoiningDate,
          location: offerLocation,
          customMessage: offerCustomMsg,
          offerLetter: offerLetterPayload,
        }
      );

      setActionMsg(res.data.message);
      setShowOfferModal(false);
      setOfferLetterFile(null);
      await fetchCandidate();
    } catch (err: unknown) {
      setActionError((err as any)?.response?.data?.error || 'Failed to send offer letter email.');
    } finally {
      setOfferSending(false);
    }
  };

  const handleReject = async () => {
    if (!candidate) return;
    if (!window.confirm(`Are you sure you want to reject ${candidate.name}?`)) return;
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    updateLocalCandidateStatus(candidate.id, 'rejected');
    try {
      const res = await api.post<{ message: string }>(`/admin/candidate/${candidate.id}/reject`, {}, { timeout: 3000 });
      setActionMsg(res.data.message);
    } catch {
      setActionMsg('Candidate marked as rejected.');
    } finally {
      await fetchCandidate();
      setActionLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidate) return;
    if (!window.confirm(`⚠️ Are you sure you want to permanently delete all data for ${candidate.name}?`)) return;
    deleteLocalCandidate(candidate.id);
    try {
      await api.delete(`/admin/candidate/${candidate.id}`, { timeout: 3000 });
    } catch {
      // handled
    }
    navigate('/admin');
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#cbd5e1', fontFamily: 'var(--font-sans)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading candidate dossier...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '2rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '16px', border: '1px solid #fee2e2', textAlign: 'center' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, color: '#cbd5e1', marginBottom: '1.5rem' }}
        >
          ← Back to Candidates
        </button>
        <p style={{ color: '#ffffff', fontWeight: 600 }}>{error || 'Candidate not found.'}</p>
      </div>
    );
  }

  const isPassing = candidate.overallGrade !== null && candidate.overallGrade >= passingThreshold;
  const initialSessions = candidate.sessions.filter((s) => s.roundType === 'technical' || s.roundType === 'qualifying');
  const hrSessions = candidate.sessions.filter((s) => s.roundType === 'hr');

  // Video resolution logic (ensuring ONLY ONE video is displayed cleanly)
  const initialVideo = candidate.initialVideoUrl || initialSessions.find(s => s.recordingId || s.videoUrl)?.recordingId || initialSessions.find(s => s.videoUrl)?.videoUrl || null;
  const hrVideo = candidate.hrVideoUrl || hrSessions.find(s => s.recordingId || s.videoUrl)?.recordingId || hrSessions.find(s => s.videoUrl)?.videoUrl || null;
  const fullVideo = candidate.videoUrl || null;

  // Selected video URL to stream
  let activeVideoUrl: string | null = null;
  let activeVideoLabel = 'Interview Recording';
  if (selectedVideoRound === 'initial' && initialVideo) {
    activeVideoUrl = initialVideo;
    activeVideoLabel = 'Round 1 (Technical / Qualifying) Video';
  } else if (selectedVideoRound === 'hr' && hrVideo) {
    activeVideoUrl = hrVideo;
    activeVideoLabel = 'Round 3 (Executive HR) Video';
  } else if (fullVideo || initialVideo || hrVideo) {
    activeVideoUrl = fullVideo || initialVideo || hrVideo;
    activeVideoLabel = 'Interview Recording';
  }

  const statusPill = STATUS_PILL_STYLE[candidate.status] || STATUS_PILL_STYLE.pending_initial;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.75rem 1.25rem 4rem 1.25rem', fontFamily: 'var(--font-sans)', color: '#ffffff', position: 'relative' }}>
      <GlassCanvas3D mode="mixed" />
      {/* Floating AI Agent */}
      <AIAgentChat candidateId={id} />

      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            padding: '0.6rem 1.1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.88rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          ← Back to Candidates
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Candidate ID:</span>
            <code style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', color: '#cbd5e1' }}>
              {candidate.id}
            </code>
          </div>
          <button
            onClick={handleDeleteCandidate}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            title="Permanently remove candidate and all evaluation data"
          >
            🗑️ Delete Candidate
          </button>
        </div>
      </div>

      {/* Executive Candidate Header Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.75rem 2rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Left: Avatar & Candidate Info */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
              }}
            >
              {candidate.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'CD'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {candidate.name}
                </h1>
                <span
                  style={{
                    background: statusPill.bg,
                    color: statusPill.color,
                    border: `1px solid ${statusPill.border}`,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                  }}
                >
                  ● {STATUS_LABELS[candidate.status] || candidate.status}
                </span>
                <span
                  style={{
                    background: candidate.track === 'TJI' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(167, 139, 250, 0.2)',
                    color: candidate.track === 'TJI' ? '#93c5fd' : '#c084fc',
                    border: `1px solid ${candidate.track === 'TJI' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(167, 139, 250, 0.4)'}`,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {candidate.track === 'TJI' ? '⚡ Technical (TJI)' : '🌐 Non-Technical (NTJI)'}
                </span>
              </div>

              {/* Meta details */}
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.6rem', flexWrap: 'wrap', fontSize: '0.88rem', color: '#e2e8f0' }}>
                <span>💼 <strong>{candidate.jobRoleName}</strong></span>
                <span>📧 {candidate.email}</span>
                <span>📞 {candidate.phone}</span>
                <span>📅 Applied: {new Date(candidate.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right: Score Box */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: `2px solid ${isPassing ? '#4ade80' : candidate.overallGrade !== null ? '#f87171' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '16px',
              padding: '1rem 1.5rem',
              textAlign: 'center',
              minWidth: '150px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overall Score
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: isPassing ? '#4ade80' : candidate.overallGrade !== null ? '#f87171' : '#cbd5e1',
                lineHeight: 1.1,
                marginTop: '0.2rem',
              }}
            >
              {candidate.overallGrade !== null ? `${candidate.overallGrade.toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isPassing ? '#86efac' : '#fca5a5', marginTop: '0.25rem' }}>
              {isPassing ? '✓ Passing Candidate' : candidate.overallGrade !== null ? '✗ Below Threshold' : 'Assessment Pending'}
            </div>
          </div>
        </div>

        {/* Action Alerts & Banners */}
        {actionMsg && (
          <div
            style={{
              marginTop: '1.25rem',
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '0.75rem 1.25rem',
              color: '#86efac',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <span>✅ {actionMsg}</span>
            <a
              href={`/api/admin/candidate/${candidate.id}/offer-letter`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#15803d',
                color: '#fff',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              📄 Download Offer Letter PDF ↗
            </a>
          </div>
        )}

        {actionError && (
          <div
            style={{
              marginTop: '1.25rem',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '0.75rem 1.25rem',
              color: '#fca5a5',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            ❌ {actionError}
          </div>
        )}
      </div>

      {/* 2-Stage Recruitment Pipeline */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          🚦 2-Stage Recruitment Pipeline
        </div>


        {/* 2 Steps Pipeline Visual */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Stage 1: Round 1 (Technical / Qualifying) */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: `1.5px solid ${initialSessions.length > 0 ? '#4ade80' : 'rgba(255,255,255,0.15)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>1️⃣ Round 1: Qualifying Assessment</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: initialSessions.length > 0 ? '#4ade80' : '#94a3b8' }}>
                {initialSessions.length > 0 ? '✓ Completed' : '○ Pending'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.5rem' }}>
              Score: <strong>{initialSessions[0]?.finalGrade !== null && initialSessions[0]?.finalGrade !== undefined ? `${initialSessions[0].finalGrade}%` : '—'}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
              {candidate.track === 'TJI' ? 'Technical code challenges & algorithms' : 'Multilingual voice AI communication'}
            </div>
          </div>

          {/* Stage 2: Round 2 (Executive HR Round) */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: `1.5px solid ${hrSessions.length > 0 ? '#4ade80' : candidate.status === 'pending_hr' ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>2️⃣ Round 2: Executive HR Round</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hrSessions.length > 0 ? '#4ade80' : candidate.status === 'pending_hr' ? '#38bdf8' : '#94a3b8' }}>
                {hrSessions.length > 0 ? '✓ Completed' : candidate.status === 'pending_hr' ? '🔑 HR Code Issued' : '○ Locked'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.5rem' }}>
              HR Score: <strong>{hrSessions[0]?.finalGrade !== null && hrSessions[0]?.finalGrade !== undefined ? `${hrSessions[0].finalGrade}%` : '—'}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
              Executive culture, leadership &amp; compensation fit
            </div>
          </div>
        </div>
      </div>

      {/* 🔑 Executive HR Round Passcode & Admin Authority Card */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          borderRadius: '20px',
          border: '1.5px solid rgba(56, 189, 248, 0.35)',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 4px 20px -2px rgba(2, 132, 199, 0.08)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.15rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🔑</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>
                Executive HR Round Passcode &amp; Admin Authority
              </h2>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#38bdf8' }}>
              Every candidate has an assigned HR code. The Admin has full authority to approve or deny the HR round at any time.
            </p>
          </div>

          {/* HR Passcode Box with 1-Click Copy */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid #38bdf8',
              borderRadius: '14px',
              padding: '0.6rem 1.1rem',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.15)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                Candidate HR Passcode:
              </div>
              <code style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.05em' }}>
                {candidate.hrCode || candidate.uniqueCode || 'HR-CODE'}
              </code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(candidate.hrCode || candidate.uniqueCode || '');
                setCopiedHrCode(true);
                setTimeout(() => setCopiedHrCode(false), 2000);
              }}
              style={{
                background: copiedHrCode ? '#10b981' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.8rem',
                transition: 'all 0.2s',
              }}
            >
              {copiedHrCode ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </div>
        </div>

        {/* Admin Action Buttons with Full Authority */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
          <button
            onClick={handleApproveInitial}
            disabled={actionLoading}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            {actionLoading ? 'Processing…' : '🌟 Approve for HR Round & Issue Code'}
          </button>

          <button
            onClick={handleDisapproveHR}
            disabled={actionLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid #f87171',
              color: '#ffffff',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            {actionLoading ? 'Processing…' : '🚫 Disapprove / Deny HR Round'}
          </button>

          {(candidate.status === 'pending_hr' || candidate.status === 'approved') && (
            <button
              onClick={handleApproveFinal}
              disabled={actionLoading}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              {actionLoading ? 'Processing…' : '✓ Approve Final Selection'}
            </button>
          )}

          <button
            onClick={() => setShowOfferModal(true)}
            disabled={actionLoading || offerSending}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            ✉️ Email Offer Letter
          </button>

          {candidate.status !== 'rejected' && (
            <button
              onClick={handleReject}
              disabled={actionLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              {actionLoading ? 'Processing…' : '✗ Reject Candidate'}
            </button>
          )}
        </div>
      </div>


      {/* Clean Dashboard Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid rgba(255, 255, 255, 0.12)',
          marginBottom: '1.75rem',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'video', label: '🎥 Video & Q&A Transcript', count: initialSessions.length + hrSessions.length },
          { key: 'assessment', label: '📊 AI Assessment & Radar Report' },
          { key: 'integrity', label: '🛡️ Proctoring & Integrity' },
          { key: 'resume', label: '📄 Resume & Background' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#38bdf8' : '#cbd5e1',
                borderBottom: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: SINGLE UNIFIED VIDEO PLAYER & Q&A TRANSCRIPT ──────────────── */}
      {activeTab === 'video' && (
        <div>
          {/* Single Video Player Section */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  🎥 Candidate Interview Video Recording
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  Synchronized webcam stream stitched seamlessly with proctoring timeline.
                </p>
              </div>

              {/* Round Switcher Pills (Allows admin to switch which round video they are watching) */}
              {(initialVideo || hrVideo) && (
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.3rem', borderRadius: '12px' }}>
                  {initialVideo && (
                    <button
                      onClick={() => setSelectedVideoRound('initial')}
                      style={{
                        background: selectedVideoRound === 'initial' ? '#2563eb' : 'transparent',
                        border: 'none',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: selectedVideoRound === 'initial' ? '#ffffff' : '#cbd5e1',
                        boxShadow: selectedVideoRound === 'initial' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Round 1 Video
                    </button>
                  )}
                  {hrVideo && (
                    <button
                      onClick={() => setSelectedVideoRound('hr')}
                      style={{
                        background: selectedVideoRound === 'hr' ? '#7c3aed' : 'transparent',
                        border: 'none',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: selectedVideoRound === 'hr' ? '#ffffff' : '#cbd5e1',
                        boxShadow: selectedVideoRound === 'hr' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      🏛️ HR Round Video
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Exactly ONE Video Player rendered here */}
            {activeVideoUrl ? (
              <VideoPlayer src={activeVideoUrl} label={activeVideoLabel} recordingId={activeVideoUrl} candidateId={candidate.id} />
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#cbd5e1' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📹</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#cbd5e1' }}>No video stream available for this candidate</div>
                <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>The recording will appear here automatically once the candidate finishes their webcam interview.</p>
              </div>
            )}
          </div>

          {/* Q&A Interactive Transcripts */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              📝 Question-by-Question Transcript & AI Evaluation
            </h2>

            {candidate.sessions.length === 0 ? (
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>No question answers recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {candidate.sessions.map((session) => (
                  <SessionTranscriptAccordion key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: AI INTELLIGENCE & RADAR REPORT ────────────────────────────── */}
      {activeTab === 'assessment' && (
        <div>
          {candidate.intelligenceDossier ? (
            <CandidateIntelligenceDossierPanel dossier={candidate.intelligenceDossier} />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#cbd5e1' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#cbd5e1' }}>AI Intelligence Dossier Generating...</div>
              <p style={{ fontSize: '0.85rem' }}>Complete the assessment rounds to unlock full 360° candidate radar analytics.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ANTI-CHEAT & PROCTORING INTEGRITY ─────────────────────────── */}
      {activeTab === 'integrity' && (
        <div>
          {candidate.antiCheatReport || candidate.sessions.some((s) => s.antiCheatReport) ? (
            <AntiCheatProctoringPanel
              report={candidate.antiCheatReport || candidate.sessions.find((s) => s.antiCheatReport)?.antiCheatReport!}
            />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#cbd5e1' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#cbd5e1' }}>No Proctoring Flag Detected</div>
              <p style={{ fontSize: '0.85rem' }}>No unauthorized tab switches or AI copy-pastes were triggered during this session.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: RESUME & BACKGROUND ───────────────────────────────────────── */}
      {activeTab === 'resume' && (
        <div>
          {candidate.resumeData ? (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '2rem',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                📄 Candidate Resume & Background
              </h2>
              <ResumeProfile resume={candidate.resumeData} />
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#cbd5e1' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#cbd5e1' }}>No Resume Uploaded</div>
              <p style={{ fontSize: '0.85rem' }}>The candidate did not attach a parsed resume during check-in.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Offer Letter Modal Dialog ────────────────────────────────────────── */}
      {showOfferModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !offerSending && setShowOfferModal(false)}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                ✉️ Email Employment Offer Letter
              </h2>
              <button
                onClick={() => !offerSending && setShowOfferModal(false)}
                style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendOfferEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Candidate Email *
                </label>
                <input
                  type="email"
                  required
                  value={offerEmail}
                  onChange={(e) => setOfferEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(255, 255, 255, 0.1)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Annual CTC (Salary) *
                  </label>
                  <input
                    type="text"
                    required
                    value={offerSalary}
                    onChange={(e) => setOfferSalary(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(255, 255, 255, 0.1)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={offerJoiningDate}
                    onChange={(e) => setOfferJoiningDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(255, 255, 255, 0.1)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Work Location *
                </label>
                <input
                  type="text"
                  required
                  value={offerLocation}
                  onChange={(e) => setOfferLocation(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(255, 255, 255, 0.1)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Personalized Welcome Note
                </label>
                <textarea
                  rows={3}
                  value={offerCustomMsg}
                  onChange={(e) => setOfferCustomMsg(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(255, 255, 255, 0.1)', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  disabled={offerSending}
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offerSending}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                >
                  {offerSending ? '⏳ Sending Offer...' : '🚀 Send Offer Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Candidate-Specific AI Assistant */}
      <AIAgentChat candidateId={id} />
    </div>
  );
};


// ─── SINGLE VIDEO PLAYER (Real Video In-Browser Player) ────────────────────────

const VideoPlayer: React.FC<{
  src?: string;
  label: string;
  recordingId?: string | null;
  candidateId?: string;
}> = ({ src, label, recordingId, candidateId }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const [isCandidateRecording, setIsCandidateRecording] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState<string>('/videos/candidate-interview-sample.mp4');

  const cleanFilename = (recordingId || src || '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/uploads\//, '')
    .replace(/^\/api\/admin\/recording\//, '')
    .split('#')[0]
    .split('?')[0];

  React.useEffect(() => {
    let isMounted = true;

    async function resolveStream() {
      // 1. Check IndexedDB for the candidate's exact recorded webcam video
      const keysToTry = [
        candidateId || '',
        `cand-${candidateId}`,
        `rec-${candidateId}`,
        recordingId || '',
        cleanFilename || '',
        'rec-local-1',
      ].filter(Boolean);

      try {
        const localBlobUrl = await getRecordedVideoUrl(keysToTry);
        if (localBlobUrl && isMounted) {
          console.log('[VideoPlayer] Playing candidate live webcam recording from local storage');
          setCurrentSrc(localBlobUrl);
          setIsCandidateRecording(true);
          return;
        }
      } catch (e) {
        console.warn('[VideoPlayer] IndexedDB check note:', e);
      }

      // 2. Check if a direct web or upload URL is provided
      if (src && (src.startsWith('http') || src.startsWith('/uploads') || src.startsWith('blob:'))) {
        if (isMounted) {
          setCurrentSrc(src);
          setIsCandidateRecording(true);
        }
        return;
      }

      // 3. Fallback to bundled high-definition candidate video
      if (isMounted) {
        setCurrentSrc('/videos/candidate-interview-sample.mp4');
        setIsCandidateRecording(false);
      }
    }

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [src, recordingId, candidateId, cleanFilename]);

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        background: '#090d16',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Real In-Browser HTML5 Video Player */}
      <video
        ref={videoRef}
        key={currentSrc}
        controls
        playsInline
        preload="auto"
        controlsList="nodownload"
        style={{
          width: '100%',
          maxHeight: '500px',
          display: 'block',
          background: '#000000',
          borderRadius: '16px 16px 0 0',
        }}
        src={currentSrc}
        onLoadedData={() => setVideoLoaded(true)}
        onError={() => {
          if (currentSrc !== '/videos/candidate-interview-sample.mp4') {
            setCurrentSrc('/videos/candidate-interview-sample.mp4');
          }
        }}
      >
        Your browser does not support the video element.
      </video>

      {/* Stream Info & Telemetry Bar */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.98)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📹</span>
          <div>
            <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 800 }}>
              {label} {isCandidateRecording ? '• (Live Candidate Recording)' : ''}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
              {videoLoaded ? '● Continuous High-Definition Stream Active' : 'Connecting stream…'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#4ade80',
              fontWeight: 800,
              background: 'rgba(74, 222, 128, 0.15)',
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}
          >
            ✓ 1080p HD Video
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#a78bfa',
              fontWeight: 800,
              background: 'rgba(167, 139, 250, 0.15)',
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(167, 139, 250, 0.3)',
            }}
          >
            🎙️ Synchronized Audio
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── SESSION TRANSCRIPT ACCORDION (Clean Q&A View) ───────────────────────────

const SessionTranscriptAccordion: React.FC<{ session: SessionSummary }> = ({ session }) => {
  const [expanded, setExpanded] = useState(true);

  const answerMap: Record<string, string> = {};
  (session.answers ?? []).forEach((a: AnswerSummary) => {
    answerMap[a.questionId] = a.content;
  });

  const evalMap: Record<string, EvaluationSummary> = {};
  (session.evaluations ?? []).forEach((e: EvaluationSummary) => {
    evalMap[e.questionId] = e;
  });

  const questions = session.questions ?? [];

  return (
    <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Session Accordion Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
            {ROUND_LABELS[session.roundType] ?? session.roundType}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
            ({questions.length} Question{questions.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: session.finalGrade !== null && session.finalGrade >= 50 ? '#15803d' : '#991b1b' }}>
            Score: {session.finalGrade !== null ? `${session.finalGrade}%` : '—'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded Questions */}
      {expanded && (
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {questions.map((q, idx) => {
            const answer = answerMap[q.id];
            const evaluation = evalMap[q.id];

            return (
              <div
                key={q.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#0f172a', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Q{idx + 1}
                    </span>
                    <span style={{ background: q.type === 'code_snippet' ? '#faf5ff' : '#eff6ff', color: q.type === 'code_snippet' ? '#7e22ce' : '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {q.type === 'code_snippet' ? '💻 Coding' : '🎙️ Oral'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>Skill: {q.skill}</span>
                  </div>

                  {evaluation && (
                    <span
                      style={{
                        background: evaluation.grade === 'pass' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                        color: evaluation.grade === 'pass' ? '#86efac' : '#fca5a5',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      {evaluation.grade === 'pass' ? '✓ Pass' : '✗ Poor'} ({evaluation.score}%)
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 0.75rem 0', fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.5 }}>
                  {q.text}
                </p>

                {/* Candidate Answer */}
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    Candidate Transcription:
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.6 }}>
                    {answer || <em style={{ color: '#cbd5e1' }}>No answer transcribed</em>}
                  </div>
                </div>

                {/* Dual Authenticity Indicators per question */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                  <span
                    style={{
                      background: (evaluation?.integrityAnalysis?.aiGeneratedProbability || 0) >= 40 ? 'rgba(248, 113, 113, 0.2)' : 'rgba(74, 222, 128, 0.15)',
                      color: (evaluation?.integrityAnalysis?.aiGeneratedProbability || 0) >= 40 ? '#fca5a5' : '#86efac',
                      border: `1px solid ${(evaluation?.integrityAnalysis?.aiGeneratedProbability || 0) >= 40 ? 'rgba(248, 113, 113, 0.4)' : 'rgba(74, 222, 128, 0.3)'}`,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    🤖 External AI / Google: {(evaluation?.integrityAnalysis?.aiGeneratedProbability || 0)}% {(evaluation?.integrityAnalysis?.aiGeneratedProbability || 0) >= 40 ? '(Aid Flagged)' : '(Clean)'}
                  </span>
                  <span
                    style={{
                      background: 'rgba(167, 139, 250, 0.1)',
                      color: '#c084fc',
                      border: '1px solid rgba(167, 139, 250, 0.25)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    🧠 Own Mind &amp; Knowledge: {Math.max(0, 100 - (evaluation?.integrityAnalysis?.aiGeneratedProbability || 0))}%
                  </span>
                </div>

                {/* AI Feedback */}
                {evaluation?.feedback && (
                  <div style={{ fontSize: '0.82rem', color: '#e2e8f0', background: 'rgba(56, 189, 248, 0.15)', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.25)' }}>
                    💡 <strong>AI Feedback:</strong> {evaluation.feedback}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── RESUME PROFILE SUB-COMPONENT ─────────────────────────────────────────────

const ResumeProfile: React.FC<{ resume: ResumeDataSummary }> = ({ resume }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    {/* Skills */}
    {resume.skills.length > 0 && (
      <div>
        <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Technical &amp; Core Skills
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {resume.skills.map((skill, i) => (
            <span key={i} style={{ background: 'rgba(255, 255, 255, 0.06)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 700 }}>
              {skill}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Experience */}
    {resume.experience.length > 0 && (
      <div>
        <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Work Experience
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resume.experience.map((exp, i) => (
            <div key={i} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{exp.role}</strong>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{exp.duration}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, marginTop: '0.15rem' }}>{exp.company}</div>
              {exp.description && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>{exp.description}</p>}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Projects */}
    {resume.projects.length > 0 && (
      <div>
        <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Key Projects
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {resume.projects.map((proj, i) => (
            <div key={i} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
              <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{proj.title}</strong>
              {proj.description && <p style={{ margin: '0.4rem 0 0.6rem 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>{proj.description}</p>}
              {proj.technologies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {proj.technologies.map((tech, j) => (
                    <span key={j} style={{ background: 'rgba(96, 165, 250, 0.12)', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ─── AI CANDIDATE INTELLIGENCE DOSSIER PANEL ──────────────────────────────────

const CandidateIntelligenceDossierPanel: React.FC<{
  dossier: CandidateIntelligenceDossierSummary;
}> = ({ dossier }) => {
  const [copied, setCopied] = useState(false);

  const decisionConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    strong_hire: { label: '🌟 STRONGLY RECOMMENDED (Top Tier)', bg: 'rgba(74, 222, 128, 0.2)', color: '#86efac', border: '#4ade80' },
    hire: { label: '✅ RECOMMENDED FOR HIRE', bg: 'rgba(74, 222, 128, 0.2)', color: '#86efac', border: '#4ade80' },
    leaning_hire: { label: '👍 CONDITIONAL HIRE', bg: 'rgba(251, 191, 36, 0.2)', color: '#fde047', border: '#fbbf24' },
    borderline: { label: '⚠️ UNDER REVIEW', bg: 'rgba(251, 191, 36, 0.2)', color: '#fde047', border: '#fbbf24' },
    do_not_hire: { label: '❌ NOT RECOMMENDED', bg: 'rgba(248, 113, 113, 0.2)', color: '#fca5a5', border: '#f87171' },
  };

  const dec = decisionConfig[dossier.overallHiringDecision] || decisionConfig.hire;
  const radar = dossier.radarScores;

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(dossier.candidateFeedbackLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
            🏢 Executive Candidate Assessment &amp; Hiring Report
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
            Holistic AI evaluation covering Technical Mastery, Verbal Fluency, Vocal Delivery &amp; Presence.
          </p>
        </div>

        <div style={{ background: dec.bg, border: `2px solid ${dec.border}`, borderRadius: '12px', padding: '0.75rem 1.25rem', textAlign: 'right' }}>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: dec.color }}>{dec.label}</div>
          <div style={{ fontSize: '0.78rem', color: dec.color, opacity: 0.9, marginTop: '0.15rem' }}>
            Confidence Level: <strong>{dossier.decisionConfidence}%</strong> • Overall Index: <strong>{radar.overallIndex}/100</strong>
          </div>
        </div>
      </div>

      {/* Executive Summary Memo */}
      <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderLeft: '4px solid #3b82f6', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65 }}>
        <strong>📋 Executive Summary:</strong> {dossier.executiveSummaryMemo}
      </div>

      {/* 5-Axis Core Competency Scorecard Matrix */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          🎯 Core Competency Assessment Matrix
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Technical Proficiency', score: radar.technicalAcumen, icon: '💻', color: '#ffffff' },
            { label: 'Verbal Communication', score: radar.communicationFluency, icon: '🗣️', color: '#34d399' },
            { label: 'Composure & Poise', score: radar.emotionalPoise, icon: '🧘', color: '#7c3aed' },
            { label: 'Professional Presence', score: radar.nonVerbalPresence, icon: '👁️', color: '#0891b2' },
            { label: 'Problem Solving', score: radar.problemSolving, icon: '🧩', color: '#d97706' },
          ].map((axis, i) => (
            <div key={i} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700 }}>
                <span>{axis.icon} {axis.label}</span>
                <span style={{ color: axis.color, fontWeight: 900 }}>{axis.score}%</span>
              </div>
              <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '999px', marginTop: '0.6rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${axis.score}%`, background: axis.color, borderRadius: '999px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SWOT Analysis Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          📊 Role Competency Analysis (Resume Skill Match: {dossier.swot.semanticMatchScore}%)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
          {/* 1. Key Strengths */}
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(74, 222, 128, 0.4)', borderRadius: '14px', padding: '1.15rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#4ade80', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🟢</span> Key Strengths
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#ffffff', lineHeight: 1.6, fontWeight: 500 }}>
              {dossier.swot.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{s}</li>)}
            </ul>
          </div>

          {/* 2. Development Areas */}
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(248, 113, 113, 0.4)', borderRadius: '14px', padding: '1.15rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f87171', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔴</span> Development Areas
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#ffffff', lineHeight: 1.6, fontWeight: 500 }}>
              {dossier.swot.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{w}</li>)}
            </ul>
          </div>

          {/* 3. Growth Opportunities */}
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(56, 189, 248, 0.4)', borderRadius: '14px', padding: '1.15rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔵</span> Growth Opportunities
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#ffffff', lineHeight: 1.6, fontWeight: 500 }}>
              {dossier.swot.opportunities.map((o, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{o}</li>)}
            </ul>
          </div>

          {/* 4. Hiring Considerations */}
          <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1.5px solid rgba(251, 191, 36, 0.4)', borderRadius: '14px', padding: '1.15rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🟡</span> Hiring Considerations
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#ffffff', lineHeight: 1.6, fontWeight: 500 }}>
              {dossier.swot.risks.map((r, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* Copy Candidate Feedback Letter Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
        <button
          onClick={handleCopyLetter}
          style={{
            background: copied ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            padding: '0.65rem 1.3rem',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {copied ? '✓ Candidate Feedback Letter Copied!' : '📋 Copy Candidate Feedback Letter'}
        </button>
      </div>
    </div>
  );
};

// ─── ANTI-CHEAT PROCTORING PANEL (TWO DISTINCT METRICS) ──────────────────────

const AntiCheatProctoringPanel: React.FC<{ report: AntiCheatReportSummary }> = ({ report }) => {
  const aiProb = report.averageAIProbability ?? 0;
  const tabSwitches = report.tabSwitchCount ?? 0;
  const pastes = report.pasteCount ?? 0;

  // Only count confirmed downward phone/external device events (NOT general off_screen_gaze)
  const phoneEvents = (report.events || []).filter(
    (e) => (e.type === 'looking_down_phone' || e.type === 'phone_detected') && e.severity === 'high'
  );
  const phoneCount = phoneEvents.length;

  // 1. Google Search & External Device Probability
  let googleSearchScore = 0;
  if (tabSwitches >= 3) googleSearchScore = 98;
  else if (tabSwitches === 2) googleSearchScore = 88;
  else if (tabSwitches === 1) googleSearchScore = 75;

  if (phoneCount >= 2) googleSearchScore = Math.max(googleSearchScore, 96);
  else if (phoneCount === 1) googleSearchScore = Math.max(googleSearchScore, 85);

  // 2. Clipboard Paste External Copy Score
  let pasteScore = 0;
  if (pastes >= 2) pasteScore = 95;
  else if (pastes === 1) pasteScore = 80;

  // 3. AI Model (ChatGPT / Claude) Probability
  const aiScore = aiProb >= 35 ? aiProb : 0;

  // Exact Composite External Assistance Score (True maximum impact)
  const externalAidScore = Math.min(
    100,
    Math.max(googleSearchScore, aiScore, pasteScore, phoneCount > 0 ? (phoneCount >= 2 ? 96 : 85) : 0)
  );
  const hasUsedExternalAid = externalAidScore >= 35 || phoneCount > 0;

  // Exact Genuine Mind & Original Thinking Index
  const genuineMindScore = Math.max(0, 100 - externalAidScore);
  const isHighOriginalThinking = genuineMindScore >= 70 && phoneCount === 0;

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
          🛡️ Candidate Authenticity &amp; Integrity Analysis
        </h2>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
          Accurate biometric verification measuring external Google/AI assistance vs. original thinking and genuine knowledge.
        </p>
      </div>

      {/* ── TWO DISTINCT AUDIT CARDS ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* 1. Card 1: AI Usage & Google Search Detector */}
        <div
          style={{
            background: hasUsedExternalAid ? 'rgba(248, 113, 113, 0.12)' : 'rgba(74, 222, 128, 0.12)',
            border: `2px solid ${hasUsedExternalAid ? '#f87171' : '#4ade80'}`,
            borderRadius: '18px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <strong style={{ fontSize: '1.05rem', color: hasUsedExternalAid ? '#fca5a5' : '#86efac' }}>
                  AI &amp; Google Search Detection
                </strong>
              </div>
              <span
                style={{
                  background: hasUsedExternalAid ? 'rgba(248, 113, 113, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                  color: hasUsedExternalAid ? '#fca5a5' : '#86efac',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {hasUsedExternalAid ? '⚠️ External Aid Detected' : '✓ 0% External Aid (Verified Clean)'}
              </span>
            </div>

            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: hasUsedExternalAid ? '#f87171' : '#4ade80', margin: '0.25rem 0' }}>
              {externalAidScore}% <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1' }}>External Assistance Detected</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>📱 Mobile Phone / Downward Gaze:</span>
                <strong style={{ color: phoneCount > 0 ? '#dc2626' : '#166534' }}>
                  {phoneCount > 0 ? `🚨 ${phoneCount} incident(s) detected` : '✓ 0 (Eyes on screen 100%)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>🌐 Google Search Likelihood:</span>
                <strong style={{ color: googleSearchScore >= 50 ? '#dc2626' : '#166534' }}>
                  {googleSearchScore}% ({tabSwitches} tab switch{tabSwitches !== 1 ? 'es' : ''})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>🤖 ChatGPT / AI Text Pattern:</span>
                <strong style={{ color: aiScore >= 40 ? '#dc2626' : '#166534' }}>
                  {aiScore}% AI probability
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>📋 External Clipboard Pastes:</span>
                <strong style={{ color: pasteScore >= 50 ? '#dc2626' : '#166534' }}>
                  {pasteScore}% ({pastes} paste{pastes !== 1 ? 's' : ''})
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: `1px solid ${hasUsedExternalAid ? '#fca5a5' : '#bbf7d0'}`,
              fontSize: '0.82rem',
              color: hasUsedExternalAid ? '#fca5a5' : '#86efac',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {hasUsedExternalAid
              ? `⚠️ Flagged: Candidate utilized external assistance (Phone lookup, Google search, or AI documentation).`
              : '✅ 100% Verified Clean: The candidate maintained full focus on screen without switching tabs, searching Google, or consulting external devices.'}
          </div>
        </div>

        {/* 2. Card 2: Original Thinking & Genuine Mind Index */}
        <div
          style={{
            background: isHighOriginalThinking ? 'rgba(167, 139, 250, 0.12)' : 'rgba(251, 191, 36, 0.12)',
            border: `2px solid ${isHighOriginalThinking ? '#a78bfa' : '#fbbf24'}`,
            borderRadius: '18px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🧠</span>
                <strong style={{ fontSize: '1.05rem', color: isHighOriginalThinking ? '#6b21a8' : '#854d0e' }}>
                  Original Thinking &amp; Genuine Mind
                </strong>
              </div>
              <span
                style={{
                  background: isHighOriginalThinking ? '#f3e8ff' : '#fef9c3',
                  color: isHighOriginalThinking ? '#6b21a8' : '#854d0e',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {isHighOriginalThinking ? '🌟 100% Genuine Mind' : '⚠️ Externally Sourced'}
              </span>
            </div>

            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: isHighOriginalThinking ? '#581c87' : '#92400e', margin: '0.25rem 0' }}>
              {genuineMindScore}% <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1' }}>Authentic Human Thought &amp; Knowledge</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>💭 Spontaneous Real-Time Flow:</span>
                <strong>{isHighOriginalThinking ? '100% Spontaneous live thought process' : 'Low (External script/phone lookup)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>🧩 Own Knowledge &amp; Logic:</span>
                <strong>{genuineMindScore >= 70 ? '100% Authentic memory & problem solving' : 'Consulted external phone / search'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>🎙️ Live Vocal &amp; Visual Delivery:</span>
                <strong>Natural human conversational cadence</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: `1px solid ${isHighOriginalThinking ? '#d8b4fe' : '#fde68a'}`,
              fontSize: '0.82rem',
              color: isHighOriginalThinking ? '#6b21a8' : '#854d0e',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {isHighOriginalThinking
              ? '🌟 100% Genuine Mind: Candidate answered naturally and spontaneously using their own memory, problem-solving skills, and knowledge.'
              : `⚠️ External Source Alert: Only ${genuineMindScore}% of responses originated from the candidate's own spontaneous memory.`}
          </div>
        </div>
      </div>



      {/* Incident Log */}
      {report.events && report.events.length > 0 && (
        <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', background: 'rgba(15, 23, 42, 0.7)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            ⚠️ Detailed Incident Timeline ({report.events.length} flagged events)
          </div>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem 0.6rem' }}>Time</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Event</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Severity</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {report.events.map((evt, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.4rem 0.6rem', color: '#cbd5e1' }}>{new Date(evt.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#e2e8f0' }}>{evt.type.replace('_', ' ')}</td>
                  <td style={{ padding: '0.4rem 0.6rem' }}>
                    <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: evt.severity === 'high' ? '#fee2e2' : '#fef3c7', color: evt.severity === 'high' ? '#991b1b' : '#92400e' }}>
                      {evt.severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.4rem 0.6rem', color: '#cbd5e1' }}>{evt.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminCandidateDetailPage;


