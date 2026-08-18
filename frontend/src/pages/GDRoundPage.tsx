import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { IOSNavbar } from '../components/IOSNavbar';
import { CandidateWebcam } from '../components/CandidateWebcam';


export interface GDAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  bgLight: string;
  borderLight: string;
  accent: string;
  voiceGender: 'female' | 'male';
  focusArea: string;
}

export interface GDQuestion {
  id: string;
  agentId: string;
  agentName: string;
  category: string;
  questionText: string;
  followUpContext: string;
}

export interface GDEvaluation {
  confidenceScore: number;
  communicationScore: number;
  behavioralScore: number;
  criticalThinkingScore: number;
  overallScore: number;
  turnFeedback: string;
  keyObservation: string;
}

export const GDRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    candidateId?: string;
    candidateName?: string;
    track?: string;
    jobRoleId?: string;
  } | null;

  const candidateId = state?.candidateId || `cand-gd-${Date.now()}`;
  const candidateName = state?.candidateName || 'Candidate';
  const track = state?.track || 'TJI';
  const jobRoleId = state?.jobRoleId || 'role-backend-dev';

  // Game/Round states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<GDAgent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<GDAgent | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<GDQuestion | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(4);
  const [evaluating, setEvaluating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [lastEval, setLastEval] = useState<GDEvaluation | null>(null);

  // Video & Voice states
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);


  const recognitionRef = useRef<any>(null);

  // Load available system synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices();
        if (available.length > 0) {
          setVoices(available);
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);




  // Initialize GD Session
  useEffect(() => {
    api
      .post('/gd-round/start', {
        candidateId,
        candidateName,
        track,
        jobRoleId,
      })
      .then((res) => {
        setSessionId(res.data.sessionId);
        setAgents(res.data.agents);
        setCurrentAgent(res.data.firstAgent);
        setCurrentQuestion(res.data.firstQuestion);
        setTotalQuestions(res.data.totalQuestions);
        speakAgentQuestion(res.data.firstQuestion.questionText, res.data.firstAgent.id);
      })
      .catch((err) => {
        console.error('Failed to start GD round:', err);
      });
  }, []);

  // ── Multi-Agent Dynamic Speech Synthesis (Female & Male distinct voices) ──
  const speakAgentQuestion = (text: string, agentId: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const available = voices.length > 0 ? voices : window.speechSynthesis.getVoices();

    // Voice configs tailored for each AI Panelist
    if (agentId === 'agent-elena') {
      // Dr. Elena Vance: Professional, calm, articulate Female AI
      const femaleVoice = available.find(
        (v) =>
          (v.name.includes('Zira') ||
            v.name.includes('Female') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Google UK English Female')) &&
          v.lang.startsWith('en')
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.pitch = 1.15;
      utterance.rate = 0.94;
    } else if (agentId === 'agent-marcus') {
      // Marcus Thorne: Deep, authoritative, commanding Male AI Baritone
      const maleVoice = available.find(
        (v) =>
          (v.name.includes('David') ||
            v.name.includes('Male') ||
            v.name.includes('Alex') ||
            v.name.includes('Daniel') ||
            v.name.includes('Google US English')) &&
          v.lang.startsWith('en')
      );
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.72;
      utterance.rate = 0.98;
    } else if (agentId === 'agent-aria') {
      // Aria Sterling: Dynamic, bright, energetic Female AI
      const femaleVoice = available.find(
        (v) =>
          (v.name.includes('Google US English') ||
            v.name.includes('Victoria') ||
            v.name.includes('Zira') ||
            v.name.includes('Tessa') ||
            v.name.includes('Fiona') ||
            v.name.includes('Female')) &&
          v.lang.startsWith('en')
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.pitch = 1.42;
      utterance.rate = 1.06;
    } else {
      // Devon Ray: Measured, calm, psychological Male AI
      const maleVoice = available.find(
        (v) =>
          (v.name.includes('Mark') ||
            v.name.includes('George') ||
            v.name.includes('Fred') ||
            v.name.includes('Oliver') ||
            v.name.includes('Male')) &&
          v.lang.startsWith('en')
      );
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.88;
      utterance.rate = 0.90;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Toggle Speech Recognition
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your response in the box below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentText = '';
      for (let i = 0; i < event.results.length; i++) {
        currentText += event.results[i][0].transcript + ' ';
      }
      setCandidateAnswer(currentText);
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech recognition error:', e);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // Submit Answer to Panel
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || !sessionId) return;
    if (isRecording) {
      toggleSpeechRecognition();
    }
    window.speechSynthesis.cancel();

    setEvaluating(true);

    try {
      const res = await api.post('/gd-round/answer', {
        sessionId,
        answer: candidateAnswer,
      });

      setLastEval(res.data.evaluation);
      setCandidateAnswer('');

      if (res.data.isComplete) {
        setIsCompleted(true);
        setFinalReport(res.data.finalReport);
      } else {
        setTurnIndex((prev) => prev + 1);
        setCurrentAgent(res.data.nextAgent);
        setCurrentQuestion(res.data.nextQuestion);
        speakAgentQuestion(res.data.nextQuestion.questionText, res.data.nextAgent.id);
      }
    } catch (err) {
      console.error('Answer submission error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh-main)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <IOSNavbar />

      <div style={{ maxWidth: '1100px', margin: '0 auto 4rem auto', position: 'relative', zIndex: 10 }}>
        {/* Header Ribbon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#faf5ff',
                border: '1.5px solid #e9d5ff',
                padding: '0.25rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#9333ea',
                marginBottom: '0.4rem',
              }}
            >
              <span>👥</span> MULTI-AGENT GROUP DISCUSSION ARENA
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Autonomous AI Panelist Chamber
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
              4 AI Panelists (Female &amp; Male specialists) evaluate your global awareness, confidence, communication clarity, and collaborative demeanor.
            </p>
          </div>

          {/* Turn Progress Pill */}
          <div
            className="ios-glass-panel"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '20px',
              textAlign: 'right',
              border: '1px solid rgba(226, 232, 240, 0.9)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Discussion Round
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
              Turn {Math.min(turnIndex + 1, totalQuestions)} of {totalQuestions}
            </div>
          </div>
        </div>

        {/* 4 Agent Panelists Status Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          {agents.map((agent, idx) => {
            const isSpeakingAgent = currentAgent?.id === agent.id && !isCompleted;
            const isCompletedTurn = idx < turnIndex;

            return (
              <div
                key={agent.id}
                style={{
                  background: isSpeakingAgent ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                  border: isSpeakingAgent ? `2.5px solid ${agent.color}` : '1px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: '22px',
                  padding: '1.15rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSpeakingAgent
                    ? `0 15px 35px -5px ${agent.color}33, 0 0 0 1px ${agent.color} inset`
                    : '0 4px 12px rgba(0, 0, 0, 0.03)',
                  transform: isSpeakingAgent ? 'scale(1.03) translateY(-4px)' : 'none',
                }}
              >
                {isSpeakingAgent && isSpeaking && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '4px', height: '14px', background: agent.color, borderRadius: '2px', animation: 'springIn 0.5s infinite alternate' }} />
                    <span style={{ width: '4px', height: '20px', background: agent.color, borderRadius: '2px', animation: 'springIn 0.7s infinite alternate' }} />
                    <span style={{ width: '4px', height: '10px', background: agent.color, borderRadius: '2px', animation: 'springIn 0.4s infinite alternate' }} />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: agent.bgLight,
                      border: `1px solid ${agent.borderLight}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.6rem',
                    }}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: agent.color, fontWeight: 700 }}>
                      {agent.role} ({agent.voiceGender === 'female' ? '👩 Female Voice' : '👨 Male Voice'})
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                  🎯 <em>{agent.focusArea}</em>
                </div>

                <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                  <span style={{ color: isSpeakingAgent ? agent.color : isCompletedTurn ? '#16a34a' : '#94a3b8' }}>
                    {isSpeakingAgent ? '● Speaking Now' : isCompletedTurn ? '✓ Evaluated' : '○ Waiting'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Discussion Chamber */}
        {!isCompleted ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 1.1fr)',
              gap: '1.5rem',
            }}
          >
            {/* Left: Active Agent Speech & Interaction */}
            <div className="ios-glass-panel" style={{ padding: '2rem' }}>
              {currentAgent && currentQuestion && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '2rem' }}>{currentAgent.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                          {currentAgent.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: currentAgent.color, fontWeight: 700 }}>
                          Focus: {currentQuestion.category.replace('_', ' ').toUpperCase()} • Voice: {currentAgent.voiceGender.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => speakAgentQuestion(currentQuestion.questionText, currentAgent.id)}
                      style={{
                        background: currentAgent.bgLight,
                        border: `1px solid ${currentAgent.borderLight}`,
                        color: currentAgent.color,
                        padding: '0.4rem 0.8rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🔊 Replay Voice
                    </button>
                  </div>

                  {/* Question Bubble */}
                  <div
                    style={{
                      background: currentAgent.bgLight,
                      border: `1.5px solid ${currentAgent.borderLight}`,
                      borderRadius: '20px',
                      padding: '1.4rem 1.6rem',
                      fontSize: '1.12rem',
                      lineHeight: 1.65,
                      color: '#1e293b',
                      fontWeight: 600,
                      marginBottom: '1.5rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    "{currentQuestion.questionText}"
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '1.25rem' }}>
                    💡 <strong>Panel Focus:</strong> {currentQuestion.followUpContext}
                  </div>

                  {/* Candidate Input Arena */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Your Response to {currentAgent.name}
                    </label>
                    <textarea
                      rows={4}
                      className="ios-input"
                      style={{ resize: 'none', marginBottom: '1rem', lineHeight: 1.6 }}
                      placeholder="Speak using the microphone button or type your perspective clearly..."
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                    />

                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        style={{
                          background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.85rem 1.4rem',
                          borderRadius: '16px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 8px 20px rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <span>{isRecording ? '⏹️ Stop Mic' : '🎙️ Speak Answer'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        disabled={!candidateAnswer.trim() || evaluating}
                        className="ios-btn ios-btn-tji"
                        style={{
                          flex: 1,
                          padding: '0.85rem 1.5rem',
                          fontSize: '0.95rem',
                          opacity: !candidateAnswer.trim() || evaluating ? 0.6 : 1,
                        }}
                      >
                        {evaluating ? 'Analyzing Voice & Behavioral Metrics...' : 'Submit Response to Panel ➔'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Candidate Camera & Real-Time Telemetry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Candidate Live Camera Panel with Device Selector */}
              <CandidateWebcam
                width="100%"
                height={200}
                onStreamReady={(stream) => {
                  streamRef.current = stream;
                }}
              />



              {/* Real-Time Behavioral Meter */}
              <div className="ios-glass-panel" style={{ padding: '1.35rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '1rem' }}>
                  📊 Multi-Agent Evaluation Radar
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                      <span>🎯 Vocal Confidence</span>
                      <strong style={{ color: '#2563eb' }}>{lastEval ? `${lastEval.confidenceScore}%` : 'Calibrating...'}</strong>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${lastEval?.confidenceScore || 70}%`, height: '100%', background: '#2563eb', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                      <span>🗣️ Articulation Clarity</span>
                      <strong style={{ color: '#7c3aed' }}>{lastEval ? `${lastEval.communicationScore}%` : 'Calibrating...'}</strong>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${lastEval?.communicationScore || 75}%`, height: '100%', background: '#7c3aed', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                      <span>🧠 Behavioral Empathy</span>
                      <strong style={{ color: '#059669' }}>{lastEval ? `${lastEval.behavioralScore}%` : 'Calibrating...'}</strong>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${lastEval?.behavioralScore || 80}%`, height: '100%', background: '#059669', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                </div>

                {lastEval && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#334155', lineHeight: 1.4 }}>
                    📝 <strong>Panel Note:</strong> {lastEval.keyObservation}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* GD Round Completed Report (Admin Approval Required - No Direct Passcode Leak) */
          <div className="ios-glass-panel animate-spring" style={{ padding: '3rem 2.5rem', maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏆</div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Group Discussion Round Submitted!
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '580px', margin: '0.4rem auto 2rem auto', fontWeight: 500 }}>
              Your multi-agent debate performance, vocal confidence, and behavioral composure scores have been recorded.
            </p>

            {/* Score Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '18px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>Confidence</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1e40af', marginTop: '0.2rem' }}>
                  {finalReport?.overallConfidence}%
                </div>
              </div>

              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '18px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase' }}>Communication</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#6b21a8', marginTop: '0.2rem' }}>
                  {finalReport?.overallCommunication}%
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '18px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Behavioral</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#166534', marginTop: '0.2rem' }}>
                  {finalReport?.overallBehavioral}%
                </div>
              </div>

              <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '18px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#be185d', textTransform: 'uppercase' }}>Critical Depth</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#9d174d', marginTop: '0.2rem' }}>
                  {finalReport?.overallCriticalThinking}%
                </div>
              </div>
            </div>

            {/* Executive Summary Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.5rem',
                textAlign: 'left',
                marginBottom: '2rem',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                📋 Multi-Agent Evaluation Summary:
              </div>
              <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
                {finalReport?.executiveSummary}
              </p>
            </div>

            {/* Recruitment Board Review Notification (HR Code released ONLY by Admin) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
                borderRadius: '24px',
                padding: '2rem',
                color: '#ffffff',
                marginBottom: '2rem',
                boxShadow: '0 15px 35px rgba(2, 132, 199, 0.35)',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏛️</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Under Recruitment Board Review
              </div>
              <p style={{ fontSize: '0.92rem', opacity: 0.95, lineHeight: 1.6, maxWidth: '560px', margin: '0 auto' }}>
                Your Group Discussion evaluation has been submitted to the Admin Recruitment Board.
                Once officially reviewed &amp; approved by the hiring administrator, your <strong>HR Round Access Code</strong> will be released and dispatched to your registered SMS / Email.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/')}
                className="ios-btn ios-btn-glass"
                style={{ padding: '0.9rem 2rem' }}
              >
                ← Return to Home Hub
              </button>

              <button
                onClick={() => navigate('/login/hr')}
                className="ios-btn ios-btn-hr"
                style={{ padding: '0.9rem 2rem' }}
              >
                Go to HR Round Code Entry ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
