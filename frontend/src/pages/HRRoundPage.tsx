import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

const HRRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your unique code.');
      return;
    }

    setVerifyState('verifying');
    setErrorMsg('');

    try {
      const response = await api.post('/hr-round/verify-code', { code: trimmed });
      setVerifyState('success');
      
      // Navigate to interview with candidate information from backend
      const { candidate } = response.data;
      setTimeout(() => {
        navigate('/interview', {
          state: {
            candidateId: candidate.candidateId,
            jobRoleId: candidate.jobRoleId,
            track: candidate.track,
            roundType: 'hr',
            matchedSkills: candidate.matchedSkills || [],
          },
        });
      }, 1500); // Give user time to see success message
    } catch (err: unknown) {
      setVerifyState('error');
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setErrorMsg('Invalid or expired code. Please check the SMS you received and try again.');
      } else if (status === 409) {
        setErrorMsg('This code has already been used. Please contact the administrator.');
      } else {
        setErrorMsg('Unable to verify code. Please try again later.');
      }
    }
  };

  if (verifyState === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.icon}>✅</div>
          <h2 style={styles.heading}>Code Verified</h2>
          <p style={styles.body}>
            Starting your HR Round interview...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={() => navigate('/')}>
        ← Back
      </button>

      <div style={styles.card}>
        <div style={styles.icon}>🔑</div>
        <h1 style={styles.heading}>HR Round Access</h1>
        <p style={styles.body}>
          Enter the unique code you received via SMS to access the HR Round.
        </p>

        <form onSubmit={handleVerify} style={styles.form} noValidate>
          <label htmlFor="unique-code" style={styles.label}>
            Unique Code
          </label>
          <input
            id="unique-code"
            type="text"
            style={{
              ...styles.input,
              borderColor: verifyState === 'error' ? '#e53e3e' : '#e2e8f0',
            }}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErrorMsg('');
              setVerifyState('idle');
            }}
            placeholder="e.g. ABC123XYZ"
            autoComplete="off"
            aria-describedby={errorMsg ? 'code-error' : undefined}
            aria-invalid={verifyState === 'error'}
          />

          {errorMsg && (
            <p id="code-error" style={styles.error} role="alert">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            style={{
              ...styles.btn,
              opacity: verifyState === 'verifying' ? 0.6 : 1,
            }}
            disabled={verifyState === 'verifying'}
          >
            {verifyState === 'verifying' ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f4f8',
    padding: '2rem',
    fontFamily: 'sans-serif',
  },
  back: {
    position: 'absolute',
    top: '1.5rem',
    left: '1.5rem',
    background: 'none',
    border: 'none',
    color: '#4299e1',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'center',
  },
  icon: { fontSize: '3rem' },
  heading: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
  },
  body: {
    color: '#4a5568',
    lineHeight: 1.6,
    margin: 0,
    fontSize: '0.95rem',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  label: {
    textAlign: 'left',
    fontWeight: 600,
    color: '#2d3748',
    fontSize: '0.9rem',
  },
  input: {
    padding: '0.7rem 1rem',
    border: '2px solid',
    borderRadius: '6px',
    fontSize: '1rem',
    letterSpacing: '0.1em',
    textAlign: 'center',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e53e3e',
    fontSize: '0.875rem',
    margin: 0,
    textAlign: 'left',
  },
  btn: {
    background: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.7rem 1.4rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
    width: '100%',
    marginTop: '0.25rem',
  },
};

export default HRRoundPage;
