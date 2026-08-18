import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { JobRole, ResumeData, Track } from '../types';
import GlassCanvas3D from '../components/GlassCanvas3D';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const RoleSelectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const track = (searchParams.get('track') ?? 'TJI') as Track;

  const [roles, setRoles] = useState<JobRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');

  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [candidateId, setCandidateId] = useState<string>('');
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);

  // Fetch roles for the selected track
  useEffect(() => {
    setRolesLoading(true);
    api
      .get<{ roles: JobRole[] }>(`/tracks/roles?track=${track}`)
      .then((res) => {
        const filtered = res.data.roles.filter(
          (r) => !r.name.toLowerCase().includes('(hr round)')
        );
        setRoles(filtered);
      })
      .catch(() => setRolesError('Failed to load job roles. Please try again.'))
      .finally(() => setRolesLoading(false));
  }, [track]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    setIsEligible(null);
    setResumeData(null);
    setCandidateId('');
    setMatchedSkills([]);
    setUploadError('');
    setUploadState('idle');

    const chosen = e.target.files?.[0] ?? null;
    if (!chosen) return;

    const ext = chosen.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setFileError('Only PDF and DOCX files are supported.');
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const handleUpload = async () => {
    if (!selectedRole) return;
    if (!file) {
      setFileError('Please select a resume file.');
      return;
    }

    setUploadState('uploading');
    setUploadError('');

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobRoleId', selectedRole.id);
    formData.append('track', track);

    try {
      const res = await api.post<{ candidateId: string; resumeData: ResumeData }>('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const parsed = res.data.resumeData;
      setResumeData(parsed);
      setCandidateId(res.data.candidateId);

      const normalise = (s: string) => s.toLowerCase().trim();
      const required = selectedRole.requiredSkills.map(normalise);
      const candidate = parsed.skills.map(normalise);
      const matched = required.filter((s) => candidate.includes(s));

      setMatchedSkills(matched);
      setIsEligible(matched.length > 0);
      setUploadState('success');
    } catch (err: unknown) {
      setUploadState('error');
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to upload resume. Please try again.';
      setUploadError(msg);
    }
  };

  const handleProceed = () => {
    if (!selectedRole || !resumeData) return;
    navigate('/interview', {
      state: {
        candidateId,
        jobRoleId: selectedRole.id,
        track,
        roundType: track === 'TJI' ? 'technical' : 'qualifying',
        resumeData,
        matchedSkills,
      },
    });
  };

  const trackLabel = track === 'TJI' ? 'Technical Job Interview' : 'Non-Technical Job Interview';

  return (
    <div style={styles.container}>
      <GlassCanvas3D mode="mixed" />
      <button style={styles.back} onClick={() => navigate('/')}>
        ← Back
      </button>

      <h1 style={styles.title}>{trackLabel}</h1>

      {/* Step 1 – Role selection */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Step 1: Select a Job Role</h2>
        {rolesLoading && <p style={styles.muted}>Loading roles…</p>}
        {rolesError && <p style={styles.error}>{rolesError}</p>}
        <div style={styles.roleGrid}>
          {roles.map((role) => (
            <button
              key={role.id}
              style={{
                ...styles.roleCard,
                ...(selectedRole?.id === role.id ? styles.roleCardSelected : {}),
              }}
              onClick={() => {
                setSelectedRole(role);
                setIsEligible(null);
                setResumeData(null);
                setMatchedSkills([]);
                setUploadState('idle');
                setFile(null);
              }}
              aria-pressed={selectedRole?.id === role.id}
            >
              <strong style={{ color: '#f1f5f9' }}>{role.name}</strong>
              <div style={styles.skillList}>
                {role.requiredSkills.map((s) => (
                  <span key={s} style={styles.skillTag}>
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 – Resume upload (only shown after role selected) */}
      {selectedRole && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 2: Upload Your Resume</h2>
          <p style={styles.muted}>
            Required skills for <strong style={{ color: '#f1f5f9' }}>{selectedRole.name}</strong>:{' '}
            {selectedRole.requiredSkills.join(', ')}
          </p>

          <div style={styles.uploadRow}>
            <label style={styles.fileLabel} htmlFor="resume-upload">
              {file ? file.name : 'Choose PDF or DOCX file'}
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>

            <button
              style={{
                ...styles.btn,
                opacity: !file || uploadState === 'uploading' ? 0.6 : 1,
              }}
              onClick={handleUpload}
              disabled={!file || uploadState === 'uploading'}
            >
              {uploadState === 'uploading' ? 'Uploading…' : 'Upload & Check Skills'}
            </button>
          </div>

          {fileError && <p style={styles.error}>{fileError}</p>}
          {uploadError && <p style={styles.error}>{uploadError}</p>}

          {/* Skill match result */}
          {isEligible === true && (
            <div style={styles.eligible}>
              <p style={{ color: '#4ade80' }}>
                ✅ <strong>Eligible!</strong> Matched skills:{' '}
                {matchedSkills.join(', ')}
              </p>
              <button style={styles.btn} onClick={handleProceed}>
                Proceed to Interview →
              </button>
            </div>
          )}

          {isEligible === false && (
            <div style={styles.ineligible}>
              <p style={{ color: '#f87171' }}>
                ❌ <strong>Not eligible.</strong> None of your resume skills match the
                required skills for this role. Please select a different role or update
                your resume.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'var(--font-sans)',
    position: 'relative',
    color: '#f1f5f9',
  },
  back: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#60a5fa',
    cursor: 'pointer',
    fontSize: '0.95rem',
    padding: '0.5rem 1rem',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: '1.5rem',
  },
  section: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    backdropFilter: 'blur(16px)',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '1rem',
  },
  muted: { color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 500 },
  error: { color: '#fca5a5', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 },
  roleGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  roleCard: {
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    padding: '1.1rem',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    transition: 'all 0.25s ease',
  },
  roleCardSelected: {
    borderColor: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.18)',
    boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
  },
  skillList: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  skillTag: {
    background: 'rgba(96, 165, 250, 0.2)',
    color: '#93c5fd',
    borderRadius: '999px',
    padding: '0.2rem 0.7rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    border: '1px solid rgba(96, 165, 250, 0.35)',
  },
  uploadRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    marginTop: '1rem',
    flexWrap: 'wrap',
  },
  fileLabel: {
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1.5px dashed rgba(96, 165, 250, 0.5)',
    borderRadius: '12px',
    padding: '0.8rem 1.3rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: '#ffffff',
    fontWeight: 600,
  },
  btn: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '0.8rem 1.6rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
    boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  eligible: {
    marginTop: '1rem',
    background: 'rgba(74, 222, 128, 0.12)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    borderRadius: '14px',
    padding: '1.2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  ineligible: {
    marginTop: '1rem',
    background: 'rgba(248, 113, 113, 0.15)',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    borderRadius: '14px',
    padding: '1.2rem',
  },
};

export default RoleSelectionPage;
