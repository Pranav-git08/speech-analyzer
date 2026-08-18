import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { JobRole } from '../../types';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';
import { extractResumeData } from '../../utils/resumeExtractor';

const NTJI_LANGUAGES = [
  { code: 'English', label: 'English (Global Standard)', icon: '🌐', flag: '🇬🇧' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)', icon: '🗣️', flag: '🇮🇳' },
  { code: 'Hindi', label: 'Hindi (हिंदी)', icon: '🎙️', flag: '🇮🇳' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', icon: '💬', flag: '🇮🇳' },
];

const DEFAULT_NTJI_ROLES: JobRole[] = [
  {
    id: 'role-hr-executive',
    name: 'HR Executive',
    track: 'NTJI',
    requiredSkills: ['Recruitment', 'Communication', 'HR Policies', 'Onboarding'],
  },
  {
    id: 'role-marketing',
    name: 'Marketing Executive',
    track: 'NTJI',
    requiredSkills: ['Digital Marketing', 'SEO', 'Content Writing', 'Social Media'],
  },
  {
    id: 'role-sales',
    name: 'Sales Executive',
    track: 'NTJI',
    requiredSkills: ['Sales', 'Communication', 'Negotiation', 'CRM'],
  },
];

const NON_TECH_SYNONYMS: Record<string, string[]> = {
  'recruitment': ['recruitment', 'recruiter', 'recruiting', 'talent acquisition', 'sourcing', 'hiring', 'interviewing', 'staffing', 'headhunting', 'human resources', 'hr'],
  'communication': ['communication', 'interpersonal', 'presentation', 'verbal', 'written', 'collaboration', 'stakeholder', 'english', 'public speaking'],
  'hr policies': ['hr', 'human resources', 'hr policies', 'compliance', 'employee relations', 'onboarding', 'payroll', 'labor law', 'recruitment'],
  'onboarding': ['onboarding', 'induction', 'training', 'hr', 'orientation', 'offboarding', 'recruitment', 'human resources'],
  'digital marketing': ['digital marketing', 'marketing', 'seo', 'sem', 'google ads', 'meta ads', 'analytics', 'growth', 'campaigns', 'social media', 'advertising'],
  'seo': ['seo', 'search engine', 'keyword research', 'backlinks', 'ranking', 'organic traffic', 'serp', 'sem', 'marketing'],
  'content writing': ['content', 'content writing', 'copywriting', 'blogging', 'articles', 'storytelling', 'creative writing', 'marketing'],
  'social media': ['social media', 'smm', 'instagram', 'linkedin', 'facebook', 'twitter', 'content creation', 'community', 'marketing'],
  'sales': ['sales', 'sale', 'selling', 'b2b', 'b2c', 'business development', 'revenue', 'closing', 'cold calling', 'prospecting', 'negotiation', 'client', 'sales representative', 'senior sales', 'sales executive', 'lead generation'],
  'negotiation': ['negotiation', 'deal closing', 'client management', 'pricing', 'contracts', 'pitching', 'sales', 'closing techniques'],
  'crm': ['crm', 'salesforce', 'hubspot', 'zoho', 'pipeline', 'lead management', 'leads', 'sales', 'pos', 'crm management', 'crm software'],
};

export const NTJILoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<JobRole[]>(DEFAULT_NTJI_ROLES);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(DEFAULT_NTJI_ROLES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(NTJI_LANGUAGES[0]);

  // Auto-extracted profile fields (No manual typing required)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [rawText, setRawText] = useState('');
  const [customSkill, setCustomSkill] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ roles: JobRole[] }>('/tracks/roles?track=NTJI')
      .then((res) => {
        if (res.data && res.data.roles && res.data.roles.length > 0) {
          const filtered = res.data.roles.filter((r) => !r.name.toLowerCase().includes('(hr round)'));
          if (filtered.length > 0) {
            setRoles(filtered);
            setSelectedRole((prev) => prev || filtered[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('API roles load failed, using local defaults:', err);
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] || null;
    if (!chosen) return;
    setFile(chosen);
    setIsParsing(true);
    setError('');

    // High-precision client-side extraction using PDF.js
    const extracted = await extractResumeData(chosen);
    setRawText(extracted.text);
    setName(extracted.name);
    setEmail(extracted.email);
    setPhone(extracted.phone);

    let discoveredSkills: string[] = [...extracted.skills];

    try {
      const formData = new FormData();
      formData.append('resume', chosen);

      const previewRes = await api.post('/resume/parse-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (previewRes.data) {
        if (previewRes.data.name) setName(previewRes.data.name);
        if (previewRes.data.email) setEmail(previewRes.data.email);
        if (previewRes.data.phone) setPhone(previewRes.data.phone);
        if (Array.isArray(previewRes.data.skills) && previewRes.data.skills.length > 0) {
          discoveredSkills = [...new Set([...discoveredSkills, ...previewRes.data.skills])];
        }
      }
    } finally {
      const finalSkills = [...new Set(discoveredSkills)];
      setParsedSkills(finalSkills);

      // Auto-select best matching role for candidate
      if (roles && roles.length > 0) {
        let bestRole = roles[0];
        let maxScore = -1;
        const lowerRaw = extracted.text.toLowerCase();

        for (const r of roles) {
          const reqs = r.requiredSkills || [];
          const matches = reqs.filter((req) => {
            const reqLower = req.toLowerCase().trim();
            const synonyms = NON_TECH_SYNONYMS[reqLower] || [reqLower];
            const inParsed = finalSkills.some((p) => {
              const pLower = p.toLowerCase().trim();
              return synonyms.some((syn) => pLower === syn || pLower.includes(syn) || syn.includes(pLower));
            });
            if (inParsed) return true;
            return synonyms.some((syn) => lowerRaw.includes(syn.toLowerCase()));
          }).length;

          const pct = reqs.length > 0 ? (matches / reqs.length) * 100 : 0;
          if (pct > maxScore) {
            maxScore = pct;
            bestRole = r;
          }
        }

        if (bestRole && maxScore >= 35) {
          setSelectedRole(bestRole);
        }
      }

      setIsParsing(false);
    }
  };

  // ── Robust Skill Match & Eligibility Calculation ───────────────────────────
  const requiredSkills = selectedRole?.requiredSkills || [];
  
  const matchedSkills = requiredSkills.filter((req) => {
    const reqLower = req.toLowerCase().trim();
    const synonyms = NON_TECH_SYNONYMS[reqLower] || [reqLower];
    const inParsed = parsedSkills.some((p) => {
      const pLower = p.toLowerCase().trim();
      return synonyms.some((syn) => pLower === syn || pLower.includes(syn) || syn.includes(pLower));
    });
    if (inParsed) return true;
    const lowerRaw = rawText.toLowerCase();
    return synonyms.some((syn) => lowerRaw.includes(syn.toLowerCase()));
  });

  const missingSkills = requiredSkills.filter((req) => !matchedSkills.includes(req));
  const matchPercentage = requiredSkills.length > 0 
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 0;
  const isEligible = Boolean(file) && matchPercentage >= 35;

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a business / non-technical role.');
      return;
    }

    if (!file) {
      setError('⚠️ Mandatory: Please drop or upload your Resume (PDF or DOCX) to proceed.');
      return;
    }

    if (!isEligible) {
      setError(`⚠️ Not Eligible: Your resume matched ${matchPercentage}% of required competencies (minimum 35% required for ${selectedRole.name}). Please select a matching role or update your resume.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobRoleId', selectedRole.id);
      formData.append('track', 'NTJI');

      const uploadRes = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const candidateId = uploadRes.data.candidateId;
      const resumeData = uploadRes.data.resumeData;

      navigate('/interview', {
        state: {
          candidateId,
          jobRoleId: selectedRole.id,
          track: 'NTJI',
          roundType: 'conversational',
          matchedSkills,
          language: selectedLanguage.code,
          resumeData,
        },
      });
    } catch (err: any) {
      console.error('NTJI registration error:', err);
      // Fallback: If backend upload fails, let verified eligible candidate proceed
      navigate('/interview', {
        state: {
          candidateId: `cand-ntji-${Date.now()}`,
          jobRoleId: selectedRole.id,
          track: 'NTJI',
          roundType: 'conversational',
          matchedSkills,
          language: selectedLanguage.code,
          resumeData: { name: name || 'Candidate', skills: matchedSkills },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-ntji)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <GlassCanvas3D mode="mixed" />
      {/* Background Orbs */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '12%',
          left: '8%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '8%',
          right: '8%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
          animationDelay: '2s',
        }}
      />

      <IOSNavbar activeTrack="NTJI" />

      <div style={{ maxWidth: '860px', margin: '1rem auto 3rem auto', position: 'relative', zIndex: 10 }}>
        {/* Header Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1.5px solid #e9d5ff',
              padding: '0.35rem 0.95rem',
              borderRadius: '30px',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#c084fc',
              marginBottom: '0.75rem',
            }}
          >
            <span>🌐</span> NON-TECHNICAL TRACK INTERVIEW (ROUND 1)
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em' }}>
            Resume Intelligence &amp; Multilingual Interview
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '1rem', maxWidth: '600px', margin: '0.4rem auto 0 auto', fontWeight: 500 }}>
            Only matching skills from your resume will be tested. If skills do not match, update your resume or choose another role.
          </p>
        </div>

        <div className="ios-glass-panel glass-box-3d animate-spring" style={{ padding: '2.5rem' }}>
          {error && (
            <div
              style={{
                background: 'rgba(248, 113, 113, 0.15)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
                borderRadius: '14px',
                padding: '0.85rem 1.25rem',
                color: '#fca5a5',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleStartInterview}>
            {/* Step 1: Upload Resume */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  1. Upload Professional Resume (PDF / DOCX) <span style={{ color: '#f87171' }}>* Mandatory</span>
                </label>
                <span style={{ fontSize: '0.78rem', color: file ? '#16a34a' : '#9333ea', fontWeight: 700 }}>
                  {file ? '✓ Profile Extracted' : '⚡ Automatic AI Parsing'}
                </span>
              </div>

              <div
                style={{
                  border: file ? (isEligible ? '2px solid #22c55e' : '2px solid #ef4444') : '2.5px dashed #a855f7',
                  borderRadius: '20px',
                  padding: '2.25rem 1.5rem',
                  textAlign: 'center',
                  background: file ? (isEligible ? 'rgba(74, 222, 128, 0.12)' : 'rgba(248, 113, 113, 0.15)') : 'rgba(15, 23, 42, 0.7)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: file ? (isEligible ? '0 6px 20px rgba(34, 197, 94, 0.18)' : '0 6px 20px rgba(239, 68, 68, 0.15)') : '0 4px 14px rgba(168, 85, 247, 0.08)',
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  required
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                <div style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>
                  {isParsing ? '⏳' : file ? (isEligible ? '📄' : '⚠️') : '📁'}
                </div>
                <div style={{ fontWeight: 800, color: file ? (isEligible ? '#4ade80' : '#fca5a5') : '#ffffff', fontSize: '1.1rem' }}>
                  {isParsing
                    ? 'AI is Parsing Resume & Verifying Competencies...'
                    : file
                    ? file.name
                    : 'Click or Drag & Drop Resume (PDF / DOCX)'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: '0.35rem', fontWeight: 500 }}>
                  {file
                    ? `File ready (${(file.size / 1024).toFixed(0)} KB) • AI has extracted competencies & profile`
                    : 'Zero manual typing • Full Name, Email, Phone, and Skills are extracted automatically'}
                </div>
              </div>
            </div>

            {/* Step 2: Auto-Extracted Profile Details */}
            {name && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1.5px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>👤</span>
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>Extracted Candidate Dossier</strong>
                  </div>
                  <span style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                    AUTO-PARSED
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase' }}>Candidate Name</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>👤 {name}</div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase' }}>Email Address</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {email}</div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase' }}>Contact Phone</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>📱 {phone}</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 800, textTransform: 'uppercase' }}>
                      💼 Extracted &amp; Verified Competencies ({parsedSkills.length}):
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#c084fc' }}>
                      Click ✕ to remove or type to add missing skills from your resume
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {parsedSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(167, 139, 250, 0.15)',
                          color: '#a78bfa',
                          border: '1px solid rgba(167, 139, 250, 0.35)',
                          borderRadius: '8px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {sk}
                        <button
                          type="button"
                          onClick={() => setParsedSkills((prev) => prev.filter((s) => s !== sk))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.85rem',
                            lineHeight: 1,
                          }}
                          title="Remove skill"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add skill input & 1-click suggestion pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
                      <input
                        type="text"
                        placeholder="Type skill name from your resume..."
                        value={customSkill}
                        onChange={(e) => setCustomSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customSkill.trim()) {
                              setParsedSkills((prev) => [...new Set([...prev, customSkill.trim()])]);
                              setCustomSkill('');
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customSkill.trim()) {
                            setParsedSkills((prev) => [...new Set([...prev, customSkill.trim()])]);
                            setCustomSkill('');
                          }
                        }}
                        style={{
                          background: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.45rem 0.9rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    {/* Quick suggestion pills from target role if missing */}
                    {missingSkills.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Quick add:</span>
                        {missingSkills.map((sk, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setParsedSkills((prev) => [...new Set([...prev, sk])])}
                            style={{
                              background: 'rgba(167, 139, 250, 0.1)',
                              color: '#c084fc',
                              border: '1px dashed rgba(167, 139, 250, 0.4)',
                              borderRadius: '6px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + {sk}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Select Non-Technical Business Role */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                2. Select Business Specialization
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                {roles.map((role) => {
                  const isSelected = selectedRole?.id === role.id;
                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '18px',
                        background: isSelected ? 'rgba(167, 139, 250, 0.22)' : 'rgba(15, 23, 42, 0.75)',
                        border: isSelected ? '2px solid #c084fc' : '1.5px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected
                          ? '0 8px 25px rgba(167, 139, 250, 0.35), inset 0 1px 1px rgba(255,255,255,0.3)'
                          : '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(12px)',
                      }}
                      className="glass-clickable"
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>
                        {role.name.includes('HR') ? '👥' : role.name.includes('Marketing') ? '📈' : role.name.includes('Sales') ? '🤝' : '💼'}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: isSelected ? '#ffffff' : '#f8fafc', letterSpacing: '-0.01em' }}>
                        {role.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? '#e9d5ff' : '#cbd5e1', marginTop: '0.35rem', fontWeight: 600, lineHeight: 1.4 }}>
                        {role.requiredSkills.slice(0, 3).join(' • ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Language Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                3. Choose Preferred Interview Language
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {NTJI_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage.code === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang)}
                      style={{
                        padding: '1rem 1.1rem',
                        borderRadius: '16px',
                        background: isSelected ? 'rgba(217, 70, 239, 0.22)' : 'rgba(15, 23, 42, 0.75)',
                        border: isSelected ? '2px solid #f472b6' : '1.5px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        textAlign: 'center',
                        boxShadow: isSelected
                          ? '0 8px 25px rgba(217, 70, 239, 0.35), inset 0 1px 1px rgba(255,255,255,0.3)'
                          : '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(12px)',
                      }}
                      className="glass-clickable"
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{lang.flag}</div>
                      <strong style={{ fontSize: '0.96rem', color: isSelected ? '#ffffff' : '#f8fafc', display: 'block', fontWeight: 800 }}>
                        {lang.label.split(' ')[0]}
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? '#fbcfe8' : '#cbd5e1', marginTop: '0.2rem', fontWeight: 700 }}>
                        {lang.label.includes('(') ? lang.label.match(/\((.*?)\)/)?.[1] : 'Global Standard'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 5: ROLE-SKILL MATCHING & ELIGIBILITY VERIFICATION PANEL */}
            {file && selectedRole && (
              <div>
                {isEligible ? (
                  /* ✅ ELIGIBLE: Matching Skills Box (>= 35% Match) */
                  <div
                    style={{
                      background: 'rgba(74, 222, 128, 0.1)',
                      border: '2px solid rgba(74, 222, 128, 0.4)',
                      borderRadius: '18px',
                      padding: '1.5rem',
                      marginBottom: '2rem',
                      boxShadow: '0 6px 18px rgba(34, 197, 94, 0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.35rem' }}>✅</span>
                        <strong style={{ color: '#86efac', fontSize: '1rem' }}>
                          ELIGIBILITY STATUS: ELIGIBLE FOR {selectedRole.name.toUpperCase()}
                        </strong>
                      </div>
                      <span style={{ background: '#22c55e', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}>
                        {matchPercentage}% Match (Min 35% Met ✓)
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 700, marginBottom: '0.5rem' }}>
                      🎯 Only these matching skills will be taken into your non-technical interview:
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {matchedSkills.map((sk, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            borderRadius: '8px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          ✓ {sk} (Included in Interview)
                        </span>
                      ))}
                    </div>

                    {missingSkills.length > 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: '0.5rem' }}>
                        ℹ️ Other optional role skills: <em>{missingSkills.join(', ')}</em> (will not be asked).
                      </div>
                    )}
                  </div>
                ) : (
                  /* ⚠️ NOT ELIGIBLE: Under 35% Match */
                  <div
                    style={{
                      background: 'rgba(248, 113, 113, 0.15)',
                      border: '2px solid rgba(248, 113, 113, 0.5)',
                      borderRadius: '18px',
                      padding: '1.75rem',
                      marginBottom: '2rem',
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                      <div>
                        <strong style={{ color: '#fca5a5', fontSize: '1.05rem', display: 'block' }}>
                          ELIGIBILITY STATUS: NOT ELIGIBLE FOR {selectedRole.name.toUpperCase()} ({matchPercentage}% Match)
                        </strong>
                        <span style={{ fontSize: '0.84rem', color: '#f87171' }}>
                          A minimum of <strong>35% matching competencies</strong> is required to qualify for this role. (Current: {matchPercentage}%)
                        </span>
                      </div>
                    </div>

                    <div style={{ margin: '1rem 0' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                        ❌ Required Skills Missing in Your Resume:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {missingSkills.map((sk, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(248, 113, 113, 0.15)',
                              color: '#fca5a5',
                              border: '1px solid #fca5a5',
                              borderRadius: '8px',
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                            }}
                          >
                            ✗ {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        borderRadius: '14px',
                        padding: '1.2rem',
                        border: '1.5px solid rgba(248, 113, 113, 0.4)',
                        fontSize: '0.88rem',
                        color: '#fca5a5',
                      }}
                    >
                      <strong style={{ fontSize: '0.92rem' }}>💡 Actions to Qualify:</strong>
                      <ol style={{ margin: '0.5rem 0 0.85rem 0', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                        <li>
                          <strong>Update Your Resume</strong>: Add your verified background &amp; competencies with{' '}
                          <code>{missingSkills.slice(0, 3).join(', ')}</code>, then re-upload below.
                        </li>
                        <li>
                          <strong>OR Choose a Matching Role</strong>: Select another business track above that matches your extracted background{' '}
                          ({parsedSkills.slice(0, 4).join(', ') || 'e.g. HR / Marketing / Sales'}).
                        </li>
                      </ol>

                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#dc2626',
                          color: '#ffffff',
                          padding: '0.55rem 1.15rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                        }}
                      >
                        <span>🔄</span> Click Here to Upload Updated Resume
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Launch Button */}
            <button
              type="submit"
              disabled={loading || !file || isParsing || !isEligible}
              className="ios-btn ios-btn-ntji"
              style={{
                width: '100%',
                padding: '1.1rem',
                fontSize: '1.05rem',
                opacity: !file || loading || isParsing || !isEligible ? 0.55 : 1,
                cursor: !file || !isEligible ? 'not-allowed' : 'pointer',
                background: !isEligible && file ? '#94a3b8' : undefined,
              }}
            >
              {!file
                ? '📄 Please Upload Resume to Verify Eligibility (Min. 35% Match)'
                : isParsing
                ? '⏳ AI Extracting & Matching Competencies...'
                : !isEligible
                ? `🚫 Not Eligible: Only ${matchPercentage}% Match (Min. 35% Required)`
                : loading
                ? 'Initializing Qualifying Assessment with Matched Skills...'
                : `🚀 Start Non-Technical Interview (${matchPercentage}% Match • ${matchedSkills.length} Matched Skills) ➔`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
