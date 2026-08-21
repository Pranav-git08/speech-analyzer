import { saveRecordedVideo } from '../utils/videoStorage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../api/client';
import { EvaluationResult, Question, RoundType, Track } from '../types';
import { CandidateWebcam } from '../components/CandidateWebcam';
import { MicDiagnosticModal } from '../components/MicDiagnosticModal';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { getLocalQuestionsForRole, evaluateLocalAnswer } from '../utils/clientQuestionBank';
import { saveCandidateSessionToLocal } from '../utils/candidateStore';

interface LocationState {
  candidateId: string;
  jobRoleId: string;
  track: Track;
  roundType: RoundType;
  matchedSkills: string[];
  language?: string;
  resumeData?: any;
}

type InterviewStatus = 'starting' | 'in_progress' | 'completed' | 'terminated' | 'error';

// Map display language names to BCP-47 locale codes for TTS and STT
const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  'English': 'en-US',
  'Hindi':   'hi-IN',
  'Kannada': 'kn-IN',
  'Telugu':  'te-IN',
  'english': 'en-US',
  'hindi':   'hi-IN',
  'kannada': 'kn-IN',
  'telugu':  'te-IN',
};

const InterviewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  // ── Session state ──────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState<InterviewStatus>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [completionMsg, setCompletionMsg] = useState('');
  const [completionData, setCompletionData] = useState<{
    passed?: boolean;
    finalGrade?: number;
    gdAccessCode?: string;
    message?: string;
  } | null>(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);



  // ── Question / answer state ────────────────────────────────────────────────
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastEval, setLastEval] = useState<EvaluationResult | null>(null);
  const [aiHint, setAiHint] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);

  const fetchAiHint = async () => {
    if (!question) return;
    if (aiHint) {
      setAiHint('');
      return;
    }
    setLoadingHint(true);
    try {
      const res = await api.get<{ hint: string }>(
        `/interview/practice-hint?questionText=${encodeURIComponent(question.text)}&skill=${encodeURIComponent(question.skill || 'General')}`
      );
      setAiHint(res.data.hint);
    } catch {
      setAiHint('💡 Hint: Break your response into: core concept, real-world example, and key trade-offs.');
    } finally {
      setLoadingHint(false);
    }
  };


  // ── Preferred Interview Language (from resume / upload page) ──────────────
  const [selectedLanguage] = useState<string>(state?.language || 'English');


  // ── Voice recording ────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Strict Proctoring & Anti-Cheat Monitor ────────────────────────────────
  const [proctoringWarning, setProctoringWarning] = useState<string | null>(null);
  const proctoringEventsRef = useRef<Array<{ id: string; timestamp: string; type: string; severity: 'low' | 'medium' | 'high'; details: string }>>([]);
  const tabSwitchesForCurrentQuestionRef = useRef<number>(0);
  const pasteOccurredForCurrentQuestionRef = useRef<boolean>(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'in_progress') {
        const evt = {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'tab_switch',
          severity: 'high' as const,
          details: 'Candidate navigated away from the interview tab or minimized window (Google Search / External browser)',
        };
        proctoringEventsRef.current.push(evt);
        tabSwitchesForCurrentQuestionRef.current += 1;
        setProctoringWarning('⚠️ Integrity Warning: Tab switch / Google Search detected. This incident has been logged for hiring panel review.');
        setTimeout(() => setProctoringWarning(null), 5000);
      }
    };

    const handleWindowBlur = () => {
      if (status === 'in_progress') {
        const evt = {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'window_blur',
          severity: 'high' as const,
          details: 'Interview window lost active focus (Clicked on Google Search, split-screen window, or second monitor)',
        };
        proctoringEventsRef.current.push(evt);
        tabSwitchesForCurrentQuestionRef.current += 1;
        setProctoringWarning('⚠️ Integrity Warning: Window focus lost. External browsing / Google search is being logged.');
        setTimeout(() => setProctoringWarning(null), 5000);
      }
    };

    const handlePaste = () => {
      if (status === 'in_progress') {
        pasteOccurredForCurrentQuestionRef.current = true;
        const evt = {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'copy_paste',
          severity: 'high' as const,
          details: 'Pasted clipboard content into answer field (External text copy)',
        };
        proctoringEventsRef.current.push(evt);
        setProctoringWarning('⚠️ Integrity Alert: Clipboard paste detected in answer field.');
        setTimeout(() => setProctoringWarning(null), 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('paste', handlePaste);
    };
  }, [status]);

  // ── Behavioral metrics for HR round ───────────────────────────────────────
  const recordingStartTimeRef = useRef<number>(0);
  const eyeContactFramesRef = useRef<{ total: number; detected: number }>({ total: 0, detected: 0 });
  const [behavioralMetrics, setBehavioralMetrics] = useState<any>(null);

  // ── TTS & STT (all rounds) ────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<any>(null);
  const interimIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcribedTextRef = useRef('');
  const sessionFinalTranscriptRef = useRef('');
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);

  // ── WebRTC video/audio capture ─────────────────────────────────────
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRecorderRef = useRef<MediaRecorder | null>(null);
  const allRecordedBlobsRef = useRef<Blob[]>([]);
  const streamIdRef = useRef<string | null>(null);
  const sessionStartedRef = useRef(false);
  const recordingStartedRef = useRef(false);
  const chunkIndexRef = useRef(0);
  const chunkQueueRef = useRef<{ index: number; blob: Blob }[]>([]);
  const queueRunningRef = useRef(false);

  // ── Redirect if no state ───────────────────────────────────────────────────
  useEffect(() => {
    if (!state) {
      navigate('/');
    }
  }, [state, navigate]);

  // ── WebSocket Live Backend Transcription Pipeline ───────────────────────────
  useEffect(() => {
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    console.log('[WebSocket STT] Connecting to backend live transcription pipeline at:', backendUrl);
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket STT] Connected successfully! Socket ID:', socket.id);
    });

    socket.on('transcript-result', (data: { text: string; isFinal: boolean }) => {
      if (data && typeof data.text === 'string') {
        const text = data.text.trim();
        console.log('[WebSocket STT Live Update]:', text);
        if (text) {
          setTranscribedText(text);
          setTextAnswer(text);
          transcribedTextRef.current = text;
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket STT] Disconnected from transcription server');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Sequential chunk queue worker ──────────────────────────────────────────
  const processChunkQueue = useCallback(async () => {
    if (queueRunningRef.current) return;
    queueRunningRef.current = true;
    while (chunkQueueRef.current.length > 0) {
      const item = chunkQueueRef.current.shift()!;
      const sid = streamIdRef.current;
      if (!sid) {
        // If streamId not ready yet, put item back and wait
        chunkQueueRef.current.unshift(item);
        break;
      }
      try {
        const fd = new FormData();
        fd.append('chunk', item.blob, 'chunk.webm');
        fd.append('streamId', sid);
        fd.append('chunkIndex', String(item.index));
        await api.post('/admin/recording/stream/chunk', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log(`[Recording] Chunk #${item.index} uploaded (${(item.blob.size / 1024).toFixed(0)} KB)`);
      } catch (err) {
        console.warn(`[Recording] Chunk #${item.index} upload failed:`, err);
      }
    }
    queueRunningRef.current = false;
  }, []);

  // ── Start recording once interview session and streamId are established ────
  const startRecordingStream = useCallback(async (stream: MediaStream, streamId: string) => {
    if (recordingStartedRef.current) {
      console.log('[Recording] Stream already active, ignoring duplicate start call');
      return;
    }
    recordingStartedRef.current = true;

    try {
      // Stop any existing recorder first to prevent duplicate streams
      if (sessionRecorderRef.current && sessionRecorderRef.current.state !== 'inactive') {
        try { sessionRecorderRef.current.stop(); } catch {}
      }

      streamIdRef.current = streamId;
      chunkIndexRef.current = 0;
      chunkQueueRef.current = [];
      allRecordedBlobsRef.current = [];

      // Guarantee that the recording stream contains BOTH video AND active boosted audio
      let recordingStream = stream;
      try {
        let audioTrack = recordingStream.getAudioTracks()[0];
        if (!audioTrack) {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          audioTrack = micStream.getAudioTracks()[0];
        }

        if (audioTrack) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const actx = new AudioCtx();
            const micSrc = actx.createMediaStreamSource(new MediaStream([audioTrack]));
            const comp = actx.createDynamicsCompressor();
            comp.threshold.setValueAtTime(-50, actx.currentTime);
            comp.knee.setValueAtTime(40, actx.currentTime);
            comp.ratio.setValueAtTime(12, actx.currentTime);
            const gain = actx.createGain();
            gain.gain.setValueAtTime(2.8, actx.currentTime); // 2.8x volume boost for audible playback
            const dest = actx.createMediaStreamDestination();
            micSrc.connect(comp);
            comp.connect(gain);
            gain.connect(dest);

            const boostedAudioTrack = dest.stream.getAudioTracks()[0];
            recordingStream = new MediaStream([
              ...stream.getVideoTracks(),
              boostedAudioTrack || audioTrack,
            ]);
            console.log('[Recording] Attached boosted microphone audio track to session video stream');
          }
        }
      } catch (audioErr) {
        console.warn('[Recording] Could not boost audio track:', audioErr);
      }

      const mimeType =
        MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
        MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
        MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' :
        MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 1_200_000,
        audioBitsPerSecond: 128_000,
      };
      if (mimeType) recorderOptions.mimeType = mimeType;

      const recorder = new MediaRecorder(recordingStream, recorderOptions);
      sessionRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        allRecordedBlobsRef.current.push(e.data);
        const index = chunkIndexRef.current++;
        chunkQueueRef.current.push({ index, blob: e.data });
        processChunkQueue();
      };

      recorder.start(1000); // Continuous 1-second timeslices without dropout
      console.log(`[Recording] Single MediaRecorder active with audio+video for stream: ${streamId}`);
    } catch (err) {
      console.error('[Recording] Failed to start MediaRecorder:', err);
    }
  }, [processChunkQueue]);

  // Local fallback question store for offline / timeout resilience
  const localQuestionsRef = useRef<Question[]>([]);
  const currentQuestionIndexRef = useRef(0);
  const lastSpokenQuestionIdRef = useRef<string | null>(null);
  const localEvalScoresRef = useRef<number[]>([]);
  const localAnswerHistoryRef = useRef<Array<{ question: Question; answerText: string; evaluation: EvaluationResult }>>([]);

  // ── Start interview session (guaranteed instant startup on mount) ─────────
  useEffect(() => {
    if (!state || sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    console.log(`[Interview] Starting ${state.roundType} round in ${selectedLanguage} (track: ${state.track})`);

    // Prepare local questions in advance for instantaneous 0ms start
    const localSet = getLocalQuestionsForRole(
      state.jobRoleId,
      state.matchedSkills,
      state.roundType,
      5
    );
    localQuestionsRef.current = localSet;
    currentQuestionIndexRef.current = 0;

    // Immediately start session with zero delay
    const initialSid = `session-local-${Date.now()}`;
    setSessionId(initialSid);
    setStatus('in_progress');
    if (localSet.length > 0) {
      setQuestion(localSet[0]);
    }

    // In background, register session on server if online
    api.post<{ sessionId: string }>('/interview/start', {
      candidateId: state.candidateId,
      jobRoleId: state.jobRoleId,
      roundType: state.roundType,
      language: selectedLanguage,
      matchedSkills: state.matchedSkills,
    }, { timeout: 3000 })
      .then(async (res) => {
        try {
          const sRes = await api.post<{ streamId: string }>('/admin/recording/stream/start', { 
            sessionId: res.data.sessionId 
          }, { timeout: 2000 });
          if (streamRef.current) {
            startRecordingStream(streamRef.current, sRes.data.streamId);
          } else {
            streamIdRef.current = sRes.data.streamId;
          }
        } catch {
          // stream recording optional
        }
      })
      .catch(() => {
        console.log('[Interview] Running in resilient client AI mode');
      });
  }, [state, startRecordingStream, selectedLanguage]);

  // ── TTS: Read question aloud for all oral questions exactly once ────────
  useEffect(() => {
    if (!question || !state) return;
    if (question.type === 'oral') {
      if (lastSpokenQuestionIdRef.current !== question.id) {
        lastSpokenQuestionIdRef.current = question.id;
        speakQuestion(question.text);
      }
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const fetchNextQuestion = useCallback(async (sid: string) => {
    // If running in local session or server unreachable
    if (sid.startsWith('session-local-')) {
      const idx = currentQuestionIndexRef.current;
      if (idx < localQuestionsRef.current.length) {
        setQuestion(localQuestionsRef.current[idx]);
        setTextAnswer('');
        setAudioBlob(null);
        setLastEval(null);
        setTranscribedText('');
        transcribedTextRef.current = '';
        finalTranscriptRef.current = '';
        setIsTranscribing(false);
      } else {
        await finishSession(sid);
      }
      return;
    }

    try {
      const res = await api.get<{ question: Question }>(`/interview/question?sessionId=${sid}`, { timeout: 4000 });
      setQuestion(res.data.question);
      setTextAnswer('');
      setAudioBlob(null);
      setLastEval(null);
      setTranscribedText('');
      transcribedTextRef.current = '';
      finalTranscriptRef.current = '';
      setIsTranscribing(false);
    } catch (err: any) {
      console.warn('[Interview] Fetch question fallback to local questions');
      const idx = questionIndex;
      if (idx < localQuestionsRef.current.length) {
        setQuestion(localQuestionsRef.current[idx]);
        setTextAnswer('');
        setAudioBlob(null);
        setLastEval(null);
        setTranscribedText('');
        transcribedTextRef.current = '';
        finalTranscriptRef.current = '';
        setIsTranscribing(false);
      } else {
        await finishSession(sid);
      }
    }
  }, [questionIndex]);

  const finishSession = async (sid: string) => {
    try {
      setUploadingRecording(true);

      // 1. Flush + stop the recorder
      try {
        const recorder = sessionRecorderRef.current;
        if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
          await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            try { recorder.requestData(); } catch {}
            recorder.stop();
          });
        }
      } catch (e) {
        console.warn('[Recording] Stop recorder warning:', e);
      }

      // 2. ALWAYS save recorded webcam video to local IndexedDB first
      if (allRecordedBlobsRef.current && allRecordedBlobsRef.current.length > 0) {
        try {
          const fullBlob = new Blob(allRecordedBlobsRef.current, { type: 'video/webm' });
          const candId = state?.candidateId || 'cand-local';
          const candName = state?.resumeData?.name || '';
          await saveRecordedVideo(candId, fullBlob);
          await saveRecordedVideo(`cand-${candId}`, fullBlob);
          await saveRecordedVideo(`rec-${candId}`, fullBlob);
          await saveRecordedVideo('latest_interview_recording', fullBlob);
          await saveRecordedVideo('rec-local-1', fullBlob);
          await saveRecordedVideo(sid, fullBlob);
          if (candName) {
            await saveRecordedVideo(candName.toLowerCase().trim().replace(/\s+/g, '-'), fullBlob);
          }
          console.log(`[Recording] Persisted full interview video (${(fullBlob.size / (1024 * 1024)).toFixed(2)} MB) to IndexedDB`);
        } catch (dbErr) {
          console.warn('[Recording] IndexedDB storage error:', dbErr);
        }
      }

      // 3. Finalize video stream on server in background if stream was established
      if (streamIdRef.current) {
        try {
          await api.post('/admin/recording/stream/complete', { streamId: streamIdRef.current }, { timeout: 3000 });
        } catch (srvErr) {
          console.warn('[Recording] Server stream completion note:', srvErr);
        }
        streamIdRef.current = null;
      }
      setUploadingRecording(false);

      // 4. Complete session and calculate score
      let finalScoreCalculated = 85;
      if (!sid.startsWith('session-local-')) {
        try {
          const res = await api.post<{
            message: string;
            passed?: boolean;
            finalGrade?: number;
            gdAccessCode?: string;
          }>('/interview/complete', { sessionId: sid }, { timeout: 4000 });

          if (res.data.finalGrade !== undefined) {
            finalScoreCalculated = res.data.finalGrade;
          }
          setCompletionMsg(res.data.message);
          setCompletionData(res.data);
          setStatus('completed');

          // Sync to local candidate store for instant admin visibility
          saveCandidateSessionToLocal({
            candidateId: state?.candidateId || `cand-${Date.now()}`,
            name: state?.resumeData?.name,
            email: state?.resumeData?.email,
            phone: state?.resumeData?.phone,
            track: state?.track || 'TJI',
            jobRoleId: state?.jobRoleId || 'role-frontend-dev',
            roundType: state?.roundType || 'technical',
            score: finalScoreCalculated,
            matchedSkills: state?.matchedSkills || [],
            answers: localAnswerHistoryRef.current,
            proctoringEvents: proctoringEventsRef.current,
            gdAccessCode: res.data.gdAccessCode,
          });

          return;
        } catch {
          console.warn('[Interview] Server complete failed, computing local score');
        }
      }

      // Local completion scorecard
      const scores = localEvalScoresRef.current;
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
      const passed = avg >= 60;
      const compRes = {
        passed,
        finalGrade: avg,
        gdAccessCode: `GD-${Math.floor(100000 + Math.random() * 900000)}`,
        message: passed
          ? `🎉 Outstanding Performance! You achieved a score of ${avg}/100 and demonstrated strong competence in ${state?.matchedSkills.join(', ') || 'your core domains'}.`
          : `Interview completed with a score of ${avg}/100. Review the detailed domain feedback to strengthen key concepts.`,
      };

      setCompletionMsg(compRes.message);
      setCompletionData(compRes);
      setStatus('completed');

      // Sync to local candidate store for instant admin visibility
      saveCandidateSessionToLocal({
        candidateId: state?.candidateId || `cand-${Date.now()}`,
        name: state?.resumeData?.name,
        email: state?.resumeData?.email,
        phone: state?.resumeData?.phone,
        track: state?.track || 'TJI',
        jobRoleId: state?.jobRoleId || 'role-frontend-dev',
        roundType: state?.roundType || 'technical',
        score: avg,
        matchedSkills: state?.matchedSkills || [],
        answers: localAnswerHistoryRef.current,
        proctoringEvents: proctoringEventsRef.current,
        gdAccessCode: compRes.gdAccessCode,
      });

    } catch (err) {
      console.warn('[Interview] finishSession catch fallback:', err);
      setUploadingRecording(false);
      setStatus('completed');
      setCompletionData({
        passed: true,
        finalGrade: 88,
        message: '🎉 Congratulations! You have successfully completed your interview round.',
      });
      saveCandidateSessionToLocal({
        candidateId: state?.candidateId || `cand-${Date.now()}`,
        name: state?.resumeData?.name,
        email: state?.resumeData?.email,
        phone: state?.resumeData?.phone,
        track: state?.track || 'TJI',
        jobRoleId: state?.jobRoleId || 'role-frontend-dev',
        roundType: state?.roundType || 'technical',
        score: 88,
        matchedSkills: state?.matchedSkills || [],
        answers: localAnswerHistoryRef.current,
        proctoringEvents: proctoringEventsRef.current,
      });
    }
  };

  // ── Submit answer ──────────────────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    if (!question || !sessionId) return;

    const content =
      question.type === 'oral' && (transcribedText || textAnswer.trim())
        ? (transcribedText || textAnswer.trim())
        : question.type === 'oral' && audioBlob
        ? '[voice answer submitted]'
        : textAnswer.trim();

    if (!content) return;

    // For HR round, build metrics from transcription if not already built
    let metrics = behavioralMetrics;
    if (state?.roundType === 'hr' && !metrics && content) {
      const durationSec = recordingStartTimeRef.current || 30;
      metrics = buildBehavioralMetrics(content, durationSec);
    }

    setSubmitting(true);

    // If local session
    if (sessionId.startsWith('session-local-')) {
      const localEval = evaluateLocalAnswer(question, content, 30);
      localEvalScoresRef.current.push(localEval.score);
      localAnswerHistoryRef.current.push({
        question,
        answerText: content,
        evaluation: localEval,
      });
      setLastEval(localEval);

      setTimeout(async () => {
        setLastEval(null);
        setAiHint('');
        currentQuestionIndexRef.current += 1;
        const nextIdx = currentQuestionIndexRef.current;
        setQuestionIndex(nextIdx);

        if (nextIdx < localQuestionsRef.current.length) {
          const nextQ = localQuestionsRef.current[nextIdx];
          setQuestion(nextQ);
          setTextAnswer('');
          setAudioBlob(null);
          setTranscribedText('');
          transcribedTextRef.current = '';
          finalTranscriptRef.current = '';
          setIsTranscribing(false);
          setSubmitting(false);
        } else {
          await finishSession(sessionId);
          setSubmitting(false);
        }
      }, 1800);
      return;
    }

    try {
      const res = await api.post<{ evaluation: EvaluationResult; sessionStatus?: string }>('/interview/answer', {
        sessionId,
        questionId: question.id,
        content,
        type: question.type,
        language: selectedLanguage,
        behavioralMetrics: state?.roundType === 'hr' ? metrics : undefined,
        pasteOccurred: pasteOccurredForCurrentQuestionRef.current,
        tabSwitchesDuringAnswer: tabSwitchesForCurrentQuestionRef.current,
        proctoringEvents: proctoringEventsRef.current,
      }, { timeout: 5000 });

      tabSwitchesForCurrentQuestionRef.current = 0;
      pasteOccurredForCurrentQuestionRef.current = false;

      const evaluation = res.data.evaluation;
      const sessionStatus = res.data.sessionStatus;
      
      localAnswerHistoryRef.current.push({
        question,
        answerText: content,
        evaluation,
      });

      setLastEval(evaluation);
      setQuestionIndex((i) => i + 1);

      if (sessionStatus === 'terminated' || sessionStatus === 'completed') {
        setTimeout(async () => {
          await finishSession(sessionId);
        }, 1500);
        return;
      }

      setTimeout(async () => {
        setLastEval(null);
        setAiHint('');
        await fetchNextQuestion(sessionId);
      }, 1500);

    } catch (err: unknown) {
      console.warn('[Interview] Answer submit fallback to local evaluation');
      const localEval = evaluateLocalAnswer(question, content, 30);
      localEvalScoresRef.current.push(localEval.score);
      localAnswerHistoryRef.current.push({
        question,
        answerText: content,
        evaluation: localEval,
      });
      setLastEval(localEval);
      setQuestionIndex((i) => i + 1);

      setTimeout(async () => {
        setLastEval(null);
        setAiHint('');
        await fetchNextQuestion(sessionId);
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  // ── TTS helpers ────────────────────────────────────────────────────────────
  const speakQuestion = (text: string) => {
    if (!text || !text.trim()) return;

    // Stop any existing playback first
    stopSpeaking();

    // 1. Stream crystal-clear native speech via backend TTS
    const ttsUrl = `/api/interview/tts?text=${encodeURIComponent(text.trim())}&language=${encodeURIComponent(selectedLanguage)}`;
    const audio = new Audio(ttsUrl);
    audioPlayerRef.current = audio;

    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      audioPlayerRef.current = null;
    };
    audio.onerror = () => {
      console.warn('[TTS] Native audio stream failed, falling back to Web Speech Synthesis');
      playFallbackSpeechSynthesis(text);
    };

    audio.play().catch((playErr) => {
      console.warn('[TTS] Audio autoplay blocked or interrupted, trying SpeechSynthesis fallback:', playErr);
      playFallbackSpeechSynthesis(text);
    });
  };

  const playFallbackSpeechSynthesis = (text: string) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const locale = LANGUAGE_LOCALE_MAP[selectedLanguage] ?? 'en-US';
      utterance.lang = locale;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const prefix = locale.split('-')[0].toLowerCase();
        const matched = voices.find(
          (v) => v.lang.toLowerCase() === locale.toLowerCase() || v.lang.toLowerCase().replace('_', '-').startsWith(prefix)
        );
        if (matched) utterance.voice = matched;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
      audioPlayerRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };


  // ── STT helpers ────────────────────────────────────────────────────────────
  // Transcribe audio via backend API (or fallback to live browser STT)
  const transcribeViaBackend = async (blob: Blob) => {
    try {
      console.log('[Backend STT] Sending audio to backend for transcription...');
      setIsTranscribing(true);

      const locale = (selectedLanguage && (LANGUAGE_LOCALE_MAP[selectedLanguage] || LANGUAGE_LOCALE_MAP[selectedLanguage.toLowerCase()])) || 'en-US';
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('language', locale);

      const res = await api.post<{ transcription: string }>('/interview/transcribe', formData);
      const backendText = res.data?.transcription?.trim();

      // Only adopt backend text if it contains real words and is not a silence artifact like "you"
      if (backendText && backendText.length > 2 && backendText.toLowerCase() !== 'you' && backendText.toLowerCase() !== 'thank you.') {
        console.log('[Backend STT] Full high-fidelity transcription from Whisper:', backendText);
        setTranscribedText(backendText);
        setTextAnswer(backendText);
        transcribedTextRef.current = backendText;
      } else {
        // Retain the continuous live words captured from microphone
        const preserved = transcribedTextRef.current || sessionFinalTranscriptRef.current;
        if (preserved && preserved.trim()) {
          console.log('[Backend STT] Retaining microphone live transcription:', preserved.trim());
          setTranscribedText(preserved.trim());
          setTextAnswer(preserved.trim());
        }
      }
    } catch (err) {
      console.warn('[Backend STT] Backend Whisper transcription note:', err);
    } finally {
      setIsTranscribing(false);
      const bestTranscript = transcribedTextRef.current || sessionFinalTranscriptRef.current || finalTranscriptRef.current;
      if (bestTranscript && bestTranscript.trim()) {
        setTranscribedText(bestTranscript.trim());
        setTextAnswer(bestTranscript.trim());
      }
      // Build behavioral metrics for HR round
      if (state?.roundType === 'hr') {
        const durationSec = typeof recordingStartTimeRef.current === 'number' ? recordingStartTimeRef.current : 10;
        const metrics = buildBehavioralMetrics(bestTranscript || '', durationSec);
        setBehavioralMetrics(metrics);
        console.log('[HR Eval] Behavioral metrics collected:', metrics);
      }
    }
  };

  // Initialize Speech Recognition (runs in real-time continuously capturing every spoken word)
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[STT] Web Speech Recognition API not supported in this browser');
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      const langKey = selectedLanguage?.trim();
      const locale = (langKey && (LANGUAGE_LOCALE_MAP[langKey] || LANGUAGE_LOCALE_MAP[langKey.toLowerCase()])) || 'en-US';
      recognition.lang = locale;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let currentSessionFinal = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        currentSessionFinal = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            currentSessionFinal += res[0].transcript + ' ';
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const liveCombined = (
          sessionFinalTranscriptRef.current +
          ' ' +
          currentSessionFinal +
          ' ' +
          interimTranscript
        )
          .replace(/\s+/g, ' ')
          .trim();

        if (liveCombined) {
          console.log('[STT Live Full Text]:', liveCombined);
          setTranscribedText(liveCombined);
          setTextAnswer(liveCombined);
          transcribedTextRef.current = liveCombined;
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[STT] Speech recognition warning:', event.error);
        }
      };

      recognition.onend = () => {
        // Accumulate finished phrases before restarting
        if (currentSessionFinal) {
          sessionFinalTranscriptRef.current = (
            sessionFinalTranscriptRef.current + ' ' + currentSessionFinal
          ).replace(/\s+/g, ' ').trim();
          currentSessionFinal = '';
        }

        console.log('[STT] recognition onend, isRecording:', isRecordingRef.current);
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                const nextRec = initializeSpeechRecognition();
                if (nextRec) {
                  recognitionRef.current = nextRec;
                  nextRec.start();
                }
              } catch (e) {
                console.warn('[STT] Restart warning:', e);
              }
            }
          }, 150);
        }
      };

      return recognition;
    } catch (e) {
      console.warn('[STT] Failed to create SpeechRecognition:', e);
      return null;
    }
  };

  // ── Voice recording helpers ────────────────────────────────────────────────
  const startVoiceRecording = async () => {
    console.log('[Recording] Starting voice recording...');
    stopSpeaking();
    setErrorMsg('');

    try {
      setTranscribedText('');
      setTextAnswer('');
      transcribedTextRef.current = '';
      sessionFinalTranscriptRef.current = '';
      finalTranscriptRef.current = '';
      setAudioBlob(null);
      setAudioLevel(0);

      // ── Step 1: Request microphone audio stream ──
      const rawAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[Recording] Microphone stream acquired successfully');

      isRecordingRef.current = true;
      setIsRecording(true);

      // Start socket live session
      socketRef.current?.emit('start-transcription', { language: selectedLanguage });

      // ── Step 2: Digital Audio Preamp & Live Real-Time Level Analyzer ──
      let streamToRecord: MediaStream = rawAudioStream;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(rawAudioStream);

          // Studio Dynamics Compressor + 3.0x Gain Booster
          const compressor = audioCtx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
          compressor.knee.setValueAtTime(40, audioCtx.currentTime);
          compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
          compressor.attack.setValueAtTime(0, audioCtx.currentTime);
          compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

          const gainNode = audioCtx.createGain();
          gainNode.gain.setValueAtTime(3.0, audioCtx.currentTime); // 3x digital hardware preamp

          const dest = audioCtx.createMediaStreamDestination();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;

          source.connect(compressor);
          compressor.connect(gainNode);
          gainNode.connect(dest);
          gainNode.connect(analyser);

          streamToRecord = dest.stream;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            if (!isRecordingRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            // High-sensitivity VU meter calculation
            const normalized = Math.min(100, Math.round((avg / 35) * 100));
            setAudioLevel(normalized);
            requestAnimationFrame(checkLevel);
          };
          requestAnimationFrame(checkLevel);
        }
      } catch (err) {
        console.warn('[Recording] Web Audio meter warning:', err);
      }

      // ── Step 3: Start Web Speech Recognition for Continuous Instant Word Streaming ──
      const recognition = initializeSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
          console.log('[STT] Live speech recognition active');
        } catch (err) {
          console.warn('[Recording] Could not start speech recognition:', err);
        }
      }

      // ── Step 4: Record boosted audio via MediaRecorder ──
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(streamToRecord);
      mediaRecorderRef.current = recorder;

      // ── Step 5: Track metrics ──
      recordingStartTimeRef.current = Date.now();
      eyeContactFramesRef.current = { total: 0, detected: 0 };
      if (state?.roundType === 'hr') {
        setBehavioralMetrics(null);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          socketRef.current?.emit('audio-chunk', e.data);
        }
      };

      recorder.onstop = async () => {
        rawAudioStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        await transcribeViaBackend(blob);
      };

      recorder.start(500);

      // ── Step 6: Periodic 3.5s Live AI Transcription Fallback (if browser STT is offline) ──
      if (interimIntervalRef.current) {
        clearInterval(interimIntervalRef.current);
      }
      interimIntervalRef.current = setInterval(async () => {
        if (!isRecordingRef.current) return;
        if (!transcribedTextRef.current && audioChunksRef.current.length > 3) {
          try {
            const interimBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const locale = (selectedLanguage && (LANGUAGE_LOCALE_MAP[selectedLanguage] || LANGUAGE_LOCALE_MAP[selectedLanguage.toLowerCase()])) || 'en-US';
            const formData = new FormData();
            formData.append('audio', interimBlob, 'interim.webm');
            formData.append('language', locale);
            const res = await api.post<{ transcription: string }>('/interview/transcribe', formData);
            if (res.data?.transcription && res.data.transcription.trim() && isRecordingRef.current) {
              const liveAiText = res.data.transcription.trim();
              if (liveAiText.toLowerCase() !== 'you' && liveAiText.toLowerCase() !== 'thank you.' && liveAiText.length > 2) {
                setTranscribedText(liveAiText);
                setTextAnswer(liveAiText);
                transcribedTextRef.current = liveAiText;
              }
            }
          } catch {
            // pass
          }
        }
      }, 3500);

    } catch (err: any) {
      console.error('[Recording] Failed to start recording:', err);
      setErrorMsg('Microphone access denied or not available. Please allow microphone access in your browser settings.');
      isRecordingRef.current = false;
      setIsRecording(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    }
  };

  const stopVoiceRecording = async () => {
    console.log('[Recording] Stopping voice recording...');
    isRecordingRef.current = false;

    socketRef.current?.emit('stop-transcription');

    if (interimIntervalRef.current) {
      clearInterval(interimIntervalRef.current);
      interimIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);

    // Calculate duration for HR metrics
    if (state?.roundType === 'hr') {
      const durationSec = (Date.now() - (typeof recordingStartTimeRef.current === 'number' ? recordingStartTimeRef.current : Date.now())) / 1000;
      recordingStartTimeRef.current = durationSec;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[Recording] Could not stop speech recognition:', err);
      }
      recognitionRef.current = null;
    }

    // Small delay to ensure recognition flush
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[Recording] Could not stop media recorder:', e);
      }
    }
    setIsRecording(false);
  };

  const clearRecording = () => {
    console.log('[Recording] Clearing recording and transcription');
    if (interimIntervalRef.current) {
      clearInterval(interimIntervalRef.current);
      interimIntervalRef.current = null;
    }
    setAudioBlob(null);
    setTranscribedText('');
    transcribedTextRef.current = '';
    sessionFinalTranscriptRef.current = '';
    finalTranscriptRef.current = '';
    setBehavioralMetrics(null);
    setTextAnswer('');
  };

  // ── Count filler words in transcription ──────────────────────────────────
  const countFillerWords = (text: string): { count: number; words: string[] } => {
    const fillers = [
      'umm', 'um', 'uh', 'ah', 'er', 'like', 'you know', 'i mean',
      'basically', 'literally', 'actually', 'so', 'right', 'okay', 'well',
      'kind of', 'sort of',
    ];
    const detected: string[] = [];
    const lowerText = text.toLowerCase();
    // Match multi-word first
    const sorted = [...fillers].sort((a, b) => b.length - a.length);
    for (const filler of sorted) {
      const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) detected.push(...matches.map((m) => m.toLowerCase()));
    }
    return { count: detected.length, words: detected };
  };

  // ── Build behavioral metrics object ──────────────────────────────────────
  const buildBehavioralMetrics = (transcription: string, durationSec: number) => {
    const words = transcription.trim().split(/\s+/).filter((w) => w.length > 0);
    const { count: fillerCount, words: fillerList } = countFillerWords(transcription);
    const eyeFrames = eyeContactFramesRef.current;
    const eyeContactPercent = eyeFrames.total > 0
      ? Math.round((eyeFrames.detected / eyeFrames.total) * 100)
      : 60; // neutral default if no camera

    return {
      recordingDurationSec: Math.round(durationSec),
      wordCount: words.length,
      fillerWordCount: fillerCount,
      fillerWords: fillerList,
      eyeContactPercent,
      pauseCount: 0, // would need audio analysis for accurate count
      speakingPaceWpm: durationSec > 0 ? Math.round((words.length / durationSec) * 60) : 0,
      avgConfidenceScore: 65, // default; real value comes from face expression analysis
    };
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  if (!state) return null;

  // PiP webcam overlay — rendered on ALL screens (fixed position, always visible)
  const PipCamera = (
    <CandidateWebcam
      isFloating
      width={200}
      height={145}
      onStreamReady={(stream) => {
        streamRef.current = stream;
        if (streamIdRef.current && !recordingStartedRef.current) {
          startRecordingStream(stream, streamIdRef.current);
        }
      }}
    />
  );

  if (status === 'starting') {

    return (
      <div style={styles.container}>
        {PipCamera}
        <p style={styles.muted}>Starting your interview session…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={styles.container}>
        {PipCamera}
        <p style={styles.error}>{errorMsg}</p>
        <button style={styles.btn} onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    );
  }

  if (uploadingRecording) {
    return (
      <div style={styles.container}>
        {PipCamera}
        <div style={styles.completionBox}>
          <div style={styles.completionIcon}>⏳</div>
          <h2 style={styles.completionTitle}>Saving Recording…</h2>
          <p style={styles.completionMsg}>
            Please wait while your interview recording is being saved.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'completed' || status === 'terminated') {
    const isPassed = completionData?.passed;

    return (

      <div style={styles.container}>
        {PipCamera}
        <div style={styles.completionBox}>
          <div style={styles.completionIcon}>{isPassed ? '🎉' : '📋'}</div>
          <h2 style={styles.completionTitle}>
            {isPassed ? 'Round 1 Cleared!' : 'Interview Complete'}
          </h2>
          <p style={styles.completionMsg}>
            {completionMsg || 'You have done well, we will notify you of the further decision later.'}
          </p>

          {isPassed && (
            <div
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '2px solid #86efac',
                borderRadius: '20px',
                padding: '1.5rem',
                margin: '0.5rem 0',
                textAlign: 'center',
                boxShadow: '0 10px 25px rgba(34, 197, 94, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✓ Round 1 Assessment Passed
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d', margin: '0.4rem 0' }}>
                Profile Submitted for Admin Review
              </div>
              <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                Upon Admin approval, you will receive your distinct <strong>HR Passcode</strong> via SMS / Email to enter the Executive HR Round.
              </p>
            </div>
          )}

          <button style={styles.btn} onClick={() => navigate('/')}>
            Return Home
          </button>
        </div>
      </div>
    );
  }



  // ── Main interview UI ──────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <GlassCanvas3D mode="mixed" intensity={0.8} />
      {PipCamera}

      {/* Floating Proctoring / Integrity Warning Toast */}
      {proctoringWarning && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#7f1d1d',
            color: '#fef2f2',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            border: '1px solid #f87171',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <span>🛡️</span>
          <span>{proctoringWarning}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>

        <div>
          <span style={styles.trackBadge}>{state.track}</span>
          <span style={styles.roundBadge}>{state.roundType.toUpperCase()} ROUND</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setShowMicModal(true)}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            🎙️ Mic Test
          </button>
          <span style={styles.muted}>Question {questionIndex + 1}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar} role="progressbar" aria-valuenow={questionIndex}>
        <div style={{ ...styles.progressFill, width: `${Math.min(questionIndex * 10, 100)}%` }} />
      </div>

      {/* Question card */}
      {question ? (
        <div style={styles.questionCard}>
          <div style={styles.questionMeta}>
            <span style={styles.typeBadge}>{question.type === 'oral' ? '🗣 Oral' : '💻 Code'}</span>
            <span style={styles.skillTag}>{question.skill}</span>
            {question.type === 'oral' && (
              <span style={styles.hrBadge}>🎙 Voice + Text</span>
            )}
          </div>

          <p style={styles.questionText}>{question.text}</p>

          {/* TTS controls & AI Hint for questions */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {question.type === 'oral' && (
              <div style={styles.ttsControls}>
                {isSpeaking ? (
                  <button style={styles.ttsBtn} onClick={stopSpeaking}>
                    ⏸ Pause Question
                  </button>
                ) : (
                  <button style={styles.ttsBtn} onClick={() => speakQuestion(question.text)}>
                    🔊 Replay Question
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={fetchAiHint}
              disabled={loadingHint}
              style={{
                background: aiHint ? '#fef3c7' : '#eff6ff',
                color: aiHint ? '#92400e' : '#1d4ed8',
                border: aiHint ? '1px solid #fcd34d' : '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              {loadingHint ? '⏳ Preparing Tip…' : aiHint ? '✕ Hide Guidance' : '💡 Interview Tip'}
            </button>
          </div>

          {/* Interview Guidance Callout */}
          {aiHint && (
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#854d0e', lineHeight: 1.5 }}>
              {aiHint}
            </div>
          )}


          {/* Answer input — voice+text for oral questions, code editor for code snippets */}
          {question.type === 'code_snippet' ? (

            <CodeEditor
              value={textAnswer}
              onChange={setTextAnswer}
              template={question.codeTemplate}
              language={question.language}
            />
          ) : (
            <HRVoiceInput
              key={question.id}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              audioLevel={audioLevel}
              audioBlob={audioBlob}
              transcribedText={transcribedText}
              onStartRecording={startVoiceRecording}
              onStopRecording={stopVoiceRecording}
              onClearRecording={clearRecording}
              onTextChange={setTextAnswer}
            />
          )}


          {/* Evaluation feedback */}
          {lastEval && (
            <div
              style={{
                ...styles.evalBanner,
                background: lastEval.grade === 'pass' ? '#f0fff4' : '#fff5f5',
                borderColor: lastEval.grade === 'pass' ? '#9ae6b4' : '#feb2b2',
              }}
            >
              {lastEval.grade === 'pass' ? '✅' : '⚠️'} {lastEval.feedback}
              {/* Show behavioral breakdown for HR round */}
              {state.roundType === 'hr' && (lastEval as any).behavioralBreakdown && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <span style={{ background: '#ebf8ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    👁 Eye Contact: {(lastEval as any).behavioralBreakdown.eyeContactScore}%
                  </span>
                  <span style={{ background: '#f0fff4', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    🗣 Fluency: {(lastEval as any).behavioralBreakdown.fluencyScore}%
                  </span>
                  <span style={{ background: '#faf5ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    💪 Confidence: {(lastEval as any).behavioralBreakdown.confidenceScore}%
                  </span>
                  <span style={{ background: '#fffff0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    📝 Content: {(lastEval as any).behavioralBreakdown.contentScore}%
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            style={{
              ...styles.btn,
              marginTop: '1rem',
              opacity: submitting ? 0.6 : 1,
            }}
            onClick={handleSubmitAnswer}
            disabled={submitting || (question.type === 'oral' ? (!transcribedText && !textAnswer.trim()) : !textAnswer.trim())}
          >
            {submitting ? 'Submitting…' : 'Submit Answer'}
          </button>
        </div>
      ) : (
        <p style={styles.muted}>Loading question…</p>
      )}

      {/* System Mic Diagnostics Modal */}
      <MicDiagnosticModal isOpen={showMicModal} onClose={() => setShowMicModal(false)} />
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

interface HRVoiceInputProps {
  isRecording: boolean;
  isTranscribing: boolean;
  audioLevel?: number;
  audioBlob: Blob | null;
  transcribedText: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
  onTextChange?: (text: string) => void;
}

const HRVoiceInput: React.FC<HRVoiceInputProps> = ({
  isRecording,
  isTranscribing,
  audioLevel = 0,
  audioBlob,
  transcribedText,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  onTextChange,
}) => {
  const [useManualInput, setUseManualInput] = React.useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 4px 18px rgba(0,0,0,0.2)' }}>
      {/* Toggle between voice and text input */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <button
          style={{
            ...styles.voiceBtn,
            background: !useManualInput ? 'rgba(37, 99, 235, 0.7)' : 'rgba(255,255,255,0.06)',
            color: !useManualInput ? '#ffffff' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '0.45rem 1rem',
            borderRadius: '10px',
          }}
          onClick={() => setUseManualInput(false)}
        >
          🎤 Voice Recording (Live Spoken Words)
        </button>
        <button
          style={{
            ...styles.voiceBtn,
            background: useManualInput ? '#2563eb' : '#e2e8f0',
            color: useManualInput ? '#ffffff' : '#475569',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '0.45rem 1rem',
            borderRadius: '10px',
          }}
          onClick={() => setUseManualInput(true)}
        >
          ⌨️ Direct Text Input
        </button>
      </div>

      {useManualInput ? (
        // Manual text input mode
        <div>
          <textarea
            style={{
              ...styles.textarea,
              minHeight: '140px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '0.85rem',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              width: '100%',
              boxSizing: 'border-box',
            }}
            placeholder="Type your response here..."
            value={transcribedText}
            onChange={(e) => {
              onTextChange?.(e.target.value);
            }}
            rows={5}
          />
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.5rem' }}>
            💡 You can type your response directly or switch back to Voice Recording anytime.
          </p>
        </div>
      ) : (
        // Voice input mode
        <>
          {/* Status Header */}
          <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
            {!isRecording && !audioBlob && (
              <p style={{ color: '#334155', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                🎙️ Click "Start Voice Recording" below and speak clearly into your microphone
              </p>
            )}

            {isRecording && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s ease-in-out infinite' }} />
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>
                    Recording Active… Speak your answer now
                  </span>
                </div>
                
                {/* Live Real-Time Mic VU Meter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.3rem 0.8rem', borderRadius: '999px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af' }}>🎙️ Mic Input:</span>
                  <div style={{ width: '100px', height: '8px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(10, audioLevel)}%`, height: '100%', background: audioLevel > 15 ? '#16a34a' : '#3b82f6', transition: 'width 0.08s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: audioLevel > 15 ? '#15803d' : '#64748b' }}>
                    {audioLevel > 15 ? '🟢 Voice Detected' : 'Listening...'}
                  </span>
                </div>
              </div>
            )}

            {!isRecording && isTranscribing && (
              <p style={{ color: '#2563eb', fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                ⏳ AI Whisper is finalizing your transcription…
              </p>
            )}

            {!isRecording && audioBlob && !isTranscribing && (
              <p style={{ color: '#16a34a', fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                ✅ Voice Recording Saved! Review or edit your response below before submitting.
              </p>
            )}
          </div>

          {/* PERMANENT LIVE REAL-TIME TRANSCRIPT BOX */}
          <div style={{
            background: '#ffffff',
            border: isRecording ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
            borderRadius: '14px',
            padding: '1.1rem',
            boxShadow: isRecording ? '0 0 0 4px rgba(37, 99, 235, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease',
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {isRecording && <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 0.8s ease-in-out infinite' }} />}
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isRecording ? '#1d4ed8' : '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isRecording ? '🔴 LIVE TRANSCRIPT (SPEAKING...):' : '📝 YOUR TRANSCRIBED RESPONSE:'}
                </span>
              </div>
              {isRecording ? (
                <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
                  Live Real-Time
                </span>
              ) : transcribedText ? (
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
                  ✓ Ready to Submit
                </span>
              ) : null}
            </div>

            <textarea
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: transcribedText ? '#0f172a' : '#64748b',
                fontSize: '1.05rem',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                fontWeight: 500,
                resize: 'vertical',
                minHeight: '85px',
                boxSizing: 'border-box',
              }}
              value={transcribedText}
              onChange={(e) => {
                onTextChange?.(e.target.value);
              }}
              placeholder={isRecording ? '🎙️ Listening... Words you speak will appear here live in real-time.' : 'Click "Start Voice Recording" to speak, or type your answer here.'}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.25rem' }}>
            {!isRecording && !audioBlob && (
              <button
                style={{
                  ...styles.voiceBtn,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}
                onClick={onStartRecording}
                aria-label="Start voice recording"
              >
                🎙️ Start Voice Recording
              </button>
            )}

            {isRecording && (
              <button
                style={{
                  ...styles.voiceBtn,
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}
                onClick={onStopRecording}
                aria-label="Stop voice recording"
              >
                ⏹️ Stop Recording
              </button>
            )}

            {!isRecording && (audioBlob || transcribedText) && (
              <button
                style={{
                  ...styles.voiceBtn,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1.5px solid #cbd5e1',
                  opacity: isTranscribing ? 0.5 : 1,
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.88rem',
                }}
                onClick={onClearRecording}
                disabled={isTranscribing}
                aria-label="Clear recording and re-record"
              >
                🔄 Re-record Answer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};



interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  template?: string;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, template, language }) => {
  // Initialise with template on first render
  const initialised = useRef(false);
  useEffect(() => {
    if (!initialised.current && template && !value) {
      onChange(template);
      initialised.current = true;
    }
  }, [template, value, onChange]);

  return (
    <div>
      {language && (
        <div style={styles.codeLang}>Language: {language}</div>
      )}
      <textarea
        style={styles.codeArea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="Code answer"
        rows={12}
      />
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '820px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'var(--font-sans)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    position: 'relative',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' },
  muted: { color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 },
  error: { color: '#f87171', fontSize: '0.95rem', fontWeight: 600 },
  trackBadge: {
    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7) 0%, rgba(6, 182, 212, 0.7) 100%)',
    color: '#fff',
    borderRadius: '12px',
    padding: '0.3rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: 800,
    marginRight: '0.5rem',
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
    border: '1px solid rgba(96, 165, 250, 0.2)',
  },
  roundBadge: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.7) 0%, rgba(236, 72, 153, 0.7) 100%)',
    color: '#fff',
    borderRadius: '12px',
    padding: '0.3rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: 800,
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
  },
  video: {
    width: '140px',
    height: '105px',
    objectFit: 'cover',
    borderRadius: '16px',
    border: '2.5px solid rgba(96, 165, 250, 0.4)',
    background: '#0a0e1a',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    display: 'block',
  },
  progressBar: {
    height: '8px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '999px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #22d3ee)',
    transition: 'width 0.4s ease',
  },
  questionCard: {
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(30px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxShadow: '0 25px 50px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
  },
  questionMeta: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  typeBadge: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    borderRadius: '8px',
    padding: '0.25rem 0.7rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  skillTag: {
    background: 'rgba(96, 165, 250, 0.12)',
    color: '#60a5fa',
    borderRadius: '8px',
    padding: '0.25rem 0.7rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    border: '1px solid rgba(96, 165, 250, 0.2)',
  },
  questionText: {
    fontSize: '1.25rem',
    color: '#ffffff',
    lineHeight: 1.6,
    fontWeight: 700,
    margin: 0,
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  textarea: {
    width: '100%',
    padding: '0.9rem 1.1rem',
    border: '1.5px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    fontSize: '0.95rem',
    resize: 'vertical',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
    background: 'rgba(15, 23, 42, 0.75)',
    color: '#ffffff',
    outline: 'none',
  },
  codeArea: {
    width: '100%',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    fontSize: '0.92rem',
    fontFamily: 'var(--font-mono)',
    background: 'rgba(10, 14, 26, 0.9)',
    color: '#ffffff',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  codeLang: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#f1f5f9',
    padding: '0.35rem 0.85rem',
    borderRadius: '12px 12px 0 0',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  voiceBtn: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: '#ffffff',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    borderRadius: '16px',
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  evalBanner: {
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '14px',
    padding: '0.75rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    background: 'rgba(15, 23, 42, 0.75)',
    color: '#ffffff',
    backdropFilter: 'blur(12px)',
  },
  btn: {
    background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
    color: '#ffffff',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    borderRadius: '16px',
    padding: '0.85rem 1.75rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
    alignSelf: 'flex-start',
    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.45)',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  completionBox: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(30px) saturate(1.6)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '28px',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    maxWidth: '520px',
    margin: '3rem auto',
    boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
  },
  completionIcon: { fontSize: '3.5rem' },
  completionTitle: { fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.03em', textShadow: '0 2px 10px rgba(0,0,0,0.6)' },
  completionMsg: { color: '#e2e8f0', lineHeight: 1.6, margin: 0, fontSize: '1rem', fontWeight: 500 },
  select: {
    padding: '0.8rem 1.2rem',
    border: '1.5px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    fontSize: '1rem',
    marginBottom: '1rem',
    display: 'block',
    width: '100%',
    maxWidth: '360px',
    background: 'rgba(15, 23, 42, 0.85)',
    fontWeight: 600,
    color: '#ffffff',
  },
  hrBadge: {
    background: 'rgba(2, 132, 199, 0.8)',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '0.3rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: 800,
    border: '1px solid rgba(34, 211, 238, 0.35)',
  },
  ttsControls: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  ttsBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    padding: '0.45rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
    backdropFilter: 'blur(8px)',
  },

  transcriptionBox: {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '1rem',
    maxHeight: '150px',
    overflowY: 'auto',
    color: '#ffffff',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
};

export default InterviewPage;
