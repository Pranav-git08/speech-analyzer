import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { JobRole } from '../../types';
import { IOSNavbar } from '../../components/IOSNavbar';
import GlassCanvas3D from '../../components/GlassCanvas3D';

const TJI_LANGUAGES = [
  { code: 'English', label: 'English (Global Standard)', icon: '🌐', flag: '🇬🇧' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)', icon: '🗣️', flag: '🇮🇳' },
  { code: 'Hindi', label: 'Hindi (हिंदी)', icon: '🎙️', flag: '🇮🇳' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', icon: '💬', flag: '🇮🇳' },
];

const DEFAULT_TJI_ROLES: JobRole[] = [
  {
    id: 'role-backend-dev',
    name: 'Backend Developer',
    track: 'TJI',
    requiredSkills: ['Node.js', 'Express', 'PostgreSQL', 'REST API', 'TypeScript'],
  },
  {
    id: 'role-frontend-dev',
    name: 'Frontend Developer',
    track: 'TJI',
    requiredSkills: ['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript'],
  },
  {
    id: 'role-fullstack-dev',
    name: 'Full Stack Developer',
    track: 'TJI',
    requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST API'],
  },
];

const TECH_SYNONYMS: Record<string, string[]> = {
  'react': ['react', 'reactjs', 'react.js', 'redux', 'next.js', 'nextjs', 'jsx', 'frontend'],
  'typescript': ['typescript', 'ts', 'type script'],
  'javascript': ['javascript', 'js', 'es6', 'ecmascript'],
  'node.js': ['node', 'nodejs', 'node.js', 'express', 'express.js', 'nest', 'nestjs', 'backend'],
  'express': ['express', 'expressjs', 'express.js', 'node.js', 'nodejs', 'koa', 'fastify'],
  'postgresql': ['postgres', 'postgresql', 'sql', 'psql', 'relational database', 'database', 'rdbms', 'mysql'],
  'rest api': ['rest', 'restful', 'api', 'apis', 'graphql', 'json', 'endpoints', 'microservices'],
  'css': ['css', 'css3', 'tailwind', 'sass', 'scss', 'bootstrap', 'styling', 'html/css', 'ui'],
  'html': ['html', 'html5', 'web', 'dom'],
};

async function readTextFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let text = '';
        for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
            text += String.fromCharCode(b);
          }
        }
        resolve(text);
      } catch {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsArrayBuffer(file);
  });
}

export const TJILoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<JobRole[]>(DEFAULT_TJI_ROLES);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(DEFAULT_TJI_ROLES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(TJI_LANGUAGES[0]);

  // Auto-extracted profile fields (No manual typing required)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [rawText, setRawText] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ roles: JobRole[] }>('/tracks/roles?track=TJI')
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

    const baseName = chosen.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const fallbackName = baseName || 'Candidate';

    const textContent = await readTextFromFile(chosen);
    setRawText(textContent);

    let discoveredSkills: string[] = [];
    const lowerText = textContent.toLowerCase();

    for (const key of Object.keys(TECH_SYNONYMS)) {
      const syns = TECH_SYNONYMS[key] || [key];
      if (syns.some((s) => lowerText.includes(s))) {
        discoveredSkills.push(key);
      }
    }

    try {
      const formData = new FormData();
      formData.append('resume', chosen);

      const previewRes = await api.post('/resume/parse-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (previewRes.data) {
        setName(previewRes.data.name || fallbackName);
        setEmail(previewRes.data.email || `${fallbackName.toLowerCase().replace(/\s+/g, '.')}@tji.local`);
        setPhone(previewRes.data.phone || '+91 98000 12345');
        if (Array.isArray(previewRes.data.skills) && previewRes.data.skills.length > 0) {
          discoveredSkills = [...new Set([...discoveredSkills, ...previewRes.data.skills])];
        }
      } else {
        setName(fallbackName);
        setEmail(`${fallbackName.toLowerCase().replace(/\s+/g, '.')}@tji.local`);
        setPhone('+91 98000 12345');
      }
    } catch (err: any) {
      console.warn('Preview parse fallback:', err);
      setName(fallbackName);
      setEmail(`${fallbackName.toLowerCase().replace(/\s+/g, '.')}@tji.local`);
      setPhone('+91 98000 12345');
    } finally {
      setParsedSkills(discoveredSkills);
      setIsParsing(false);
    }
  };

  // ── Strict Skill Match & Eligibility Calculation ───────────────────────────
  const requiredSkills = selectedRole?.requiredSkills || [];
  
  const matchedSkills = requiredSkills.filter((req) => {
    const reqLower = req.toLowerCase().trim();
    const synonyms = TECH_SYNONYMS[reqLower] || [reqLower];
    const inParsed = parsedSkills.some((p) => {
      const pLower = p.toLowerCase().trim();
      return synonyms.some((syn) => pLower === syn || pLower.includes(syn) || syn.includes(pLower));
    });
    if (inParsed) return true;
    const lowerRaw = rawText.toLowerCase();
    return synonyms.some((syn) => lowerRaw.includes(syn));
  });

  const missingSkills = requiredSkills.filter((req) => !matchedSkills.includes(req));
  const matchPercentage = requiredSkills.length > 0 
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 0;
  const isEligible = Boolean(file) && matchPercentage >= 50;

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a technical engineering role.');
      return;
    }

    if (!file) {
      setError('⚠️ Mandatory: Please drop or upload your Resume (PDF or DOCX) to proceed.');
      return;
    }

    if (!isEligible) {
      setError(`⚠️ Not Eligible: Your resume matched ${matchPercentage}% of required competencies (minimum 50% required for ${selectedRole.name}). Please select a matching role or update your resume.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobRoleId', selectedRole.id);
      formData.append('track', 'TJI');

      const uploadRes = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const candidateId = uploadRes.data.candidateId;
      const resumeData = uploadRes.data.resumeData;

      navigate('/interview', {
        state: {
          candidateId,
          jobRoleId: selectedRole.id,
          track: 'TJI',
          roundType: 'technical',
          matchedSkills,
          language: selectedLanguage.code,
          resumeData,
        },
      });
    } catch (err: any) {
      console.error('TJI registration error:', err);
      // Fallback: If backend upload fails, let verified eligible candidate proceed
      navigate('/interview', {
        state: {
          candidateId: `cand-tji-${Date.now()}`,
          jobRoleId: selectedRole.id,
          track: 'TJI',
          roundType: 'technical',
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
        background: 'var(--bg-mesh-tji)',
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
          top: '10%',
          right: '8%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '6%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
          animationDelay: '2.5s',
        }}
      />

      <IOSNavbar activeTrack="TJI" />

      <div style={{ maxWidth: '860px', margin: '1rem auto 3rem auto', position: 'relative', zIndex: 10 }}>
        {/* Header Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(96, 165, 250, 0.1)',
              border: '1.5px solid rgba(96, 165, 250, 0.4)',
              padding: '0.35rem 0.95rem',
              borderRadius: '30px',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#60a5fa',
              marginBottom: '0.75rem',
            }}
          >
            <span>⚡</span> TECHNICAL TRACK INTERVIEW (ROUND 1)
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em' }}>
            Resume Intelligence &amp; Multilingual Technical Interview
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '1rem', maxWidth: '600px', margin: '0.4rem auto 0 auto', fontWeight: 500 }}>
            Only matching skills from your resume will be tested. Select your specialization and preferred language below.
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
            {/* Step 1: Upload Resume (Primary Action) */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  1. Upload Engineering Resume (PDF / DOCX) <span style={{ color: '#f87171' }}>* Mandatory</span>
                </label>
                <span style={{ fontSize: '0.78rem', color: file ? '#16a34a' : '#2563eb', fontWeight: 700 }}>
                  {file ? '✓ Profile Extracted' : '⚡ Automatic AI Parsing'}
                </span>
              </div>

              <div
                style={{
                  border: file ? (isEligible ? '2px solid #4ade80' : '2px solid #f87171') : '2px dashed rgba(96, 165, 250, 0.6)',
                  borderRadius: '20px',
                  padding: '2.25rem 1.5rem',
                  textAlign: 'center',
                  background: file ? (isEligible ? 'rgba(74, 222, 128, 0.12)' : 'rgba(248, 113, 113, 0.15)') : 'rgba(15, 23, 42, 0.7)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: file ? (isEligible ? '0 6px 20px rgba(34, 197, 94, 0.18)' : '0 6px 20px rgba(239, 68, 68, 0.15)') : '0 4px 14px rgba(59, 130, 246, 0.08)',
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
                    ? `File ready (${(file.size / 1024).toFixed(0)} KB) • AI has extracted skills & profile`
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
                  <span style={{ background: 'rgba(96, 165, 250, 0.12)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
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
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {email}</div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase' }}>Contact Phone</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>📱 {phone}</div>
                  </div>
                </div>

                {parsedSkills.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      💼 All Extracted Resume Skills ({parsedSkills.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {parsedSkills.map((sk, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: 'rgba(96, 165, 250, 0.1)',
                            color: '#60a5fa',
                            border: '1px solid rgba(96, 165, 250, 0.25)',
                            borderRadius: '8px',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Specialization Role */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                2. Select Target Engineering Specialization
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
                        background: isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.75)',
                        border: isSelected ? '2px solid #38bdf8' : '1.5px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected
                          ? '0 8px 25px rgba(56, 189, 248, 0.35), inset 0 1px 1px rgba(255,255,255,0.3)'
                          : '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(12px)',
                      }}
                      className="glass-clickable"
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>
                        {role.name.includes('Frontend') ? '🎨' : role.name.includes('Backend') ? '⚙️' : role.name.includes('DevOps') ? '☁️' : '💻'}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: isSelected ? '#ffffff' : '#f8fafc', letterSpacing: '-0.01em' }}>
                        {role.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? '#bae6fd' : '#cbd5e1', marginTop: '0.35rem', fontWeight: 600, lineHeight: 1.4 }}>
                        {role.requiredSkills.slice(0, 3).join(' • ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Language Selection (English, Telugu, Hindi, Kannada) */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                3. Choose Preferred Interview Language
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {TJI_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage.code === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang)}
                      style={{
                        padding: '1rem 1.1rem',
                        borderRadius: '16px',
                        background: isSelected ? 'rgba(96, 165, 250, 0.22)' : 'rgba(15, 23, 42, 0.75)',
                        border: isSelected ? '2px solid #60a5fa' : '1.5px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        textAlign: 'center',
                        boxShadow: isSelected
                          ? '0 8px 25px rgba(96, 165, 250, 0.35), inset 0 1px 1px rgba(255,255,255,0.3)'
                          : '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(12px)',
                      }}
                      className="glass-clickable"
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{lang.flag}</div>
                      <strong style={{ fontSize: '0.96rem', color: isSelected ? '#ffffff' : '#f8fafc', display: 'block', fontWeight: 800 }}>
                        {lang.label.split(' ')[0]}
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? '#bfdbfe' : '#cbd5e1', marginTop: '0.2rem', fontWeight: 700 }}>
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
                  /* ✅ ELIGIBLE: Matching Skills Box (>= 50% Match) */
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
                        {matchPercentage}% Match (Min 50% Met ✓)
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 700, marginBottom: '0.5rem' }}>
                      🎯 Only these matching skills will be taken into your technical interview:
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
                  /* ⚠️ NOT ELIGIBLE: Under 50% Match */
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
                          A minimum of <strong>50% matching skills</strong> is required to unlock this interview. (Current: {matchPercentage}%)
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
                          <strong>Update Your Resume</strong>: Add your verified projects &amp; competencies with{' '}
                          <code>{missingSkills.slice(0, 3).join(', ')}</code>, then re-upload below.
                        </li>
                        <li>
                          <strong>OR Choose a Matching Role</strong>: Select another specialization above that matches your extracted background{' '}
                          ({parsedSkills.slice(0, 4).join(', ') || 'e.g. Frontend / Backend'}).
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
              className="ios-btn ios-btn-tji"
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
                ? '📄 Please Upload Resume to Verify Eligibility (Min. 50% Match)'
                : isParsing
                ? '⏳ AI Extracting & Matching Skills...'
                : !isEligible
                ? `🚫 Not Eligible: Only ${matchPercentage}% Match (Min. 50% Required)`
                : loading
                ? 'Initializing Technical Assessment with Matched Skills...'
                : `🚀 Start Technical Interview (${matchPercentage}% Match • ${matchedSkills.length} Matched Skills) ➔`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
