import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MicDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MicDiagnosticModal: React.FC<MicDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'live' | 'playback' | 'troubleshoot'>('live');

  // Playback test states
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [sampleSecondsLeft, setSampleSecondsLeft] = useState<number>(5);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sampleTimerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Check browser permissions
  const checkPermissions = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionStatus(status.state as any);
        status.onchange = () => {
          setPermissionStatus(status.state as any);
        };
      }
    } catch {
      setPermissionStatus('unknown');
    }
  }, []);

  // Enumerate audio input devices
  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('[MicTest] Could not list audio devices:', e);
    }
  }, [selectedDeviceId]);

  // Stop all active streams & audio context
  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
    setIsSpeaking(false);
  }, []);

  // Start live microphone testing
  const startLiveMic = useCallback(async (deviceId?: string) => {
    stopAudio();
    setErrorMessage('');

    try {
      const targetDevId = deviceId || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        audio: targetDevId
          ? {
              deviceId: { exact: targetDevId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionStatus('granted');
      setIsListening(true);

      // Web Audio API Frequency & Volume Analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 90) * 100));
        setAudioLevel(normalized);
        setIsSpeaking(normalized > 12);

        // Draw frequency bars on canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const canvasCtx = canvas.getContext('2d');
          if (canvasCtx) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 1.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * canvas.height;
              const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
              gradient.addColorStop(0, '#3b82f6');
              gradient.addColorStop(0.7, '#10b981');
              gradient.addColorStop(1, '#ef4444');

              canvasCtx.fillStyle = gradient;
              canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
              x += barWidth;
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
      };

      drawVisualizer();

      // Start Web Speech Recognition test
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript + ' ';
            }
            if (text.trim()) {
              setLiveTranscript(text.trim());
            }
          };

          recognition.onerror = (err: any) => {
            console.warn('[MicTest] Speech API warning:', err?.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (sttErr) {
          console.warn('[MicTest] STT error:', sttErr);
        }
      }

      refreshDevices();
    } catch (err: any) {
      console.error('[MicTest] getUserMedia error:', err);
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was denied by browser or Windows permissions.'
          : err?.name === 'NotFoundError'
          ? 'No microphone hardware found on your system.'
          : err?.message || 'Failed to access microphone.'
      );
      setPermissionStatus('denied');
      setIsListening(false);
    }
  }, [selectedDeviceId, refreshDevices, stopAudio]);

  // Record 5s sample & playback
  const startPlaybackTest = async () => {
    setSampleAudioUrl(null);
    audioChunksRef.current = [];
    setIsRecordingSample(true);
    setSampleSecondsLeft(5);

    try {
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false, // Turn off cancellation for natural playback
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setSampleAudioUrl(url);
        setIsRecordingSample(false);
      };

      recorder.start(250);

      let countdown = 5;
      sampleTimerRef.current = setInterval(() => {
        countdown -= 1;
        setSampleSecondsLeft(countdown);
        if (countdown <= 0) {
          clearInterval(sampleTimerRef.current);
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }
      }, 1000);
    } catch (err: any) {
      console.error('[MicTest] Playback test recording error:', err);
      setIsRecordingSample(false);
      setErrorMessage('Could not record audio sample. Check microphone access.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkPermissions();
      refreshDevices();
      startLiveMic();
    } else {
      stopAudio();
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
      if (sampleAudioUrl) URL.revokeObjectURL(sampleAudioUrl);
    }

    return () => {
      stopAudio();
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAudio();
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '1.3rem',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
              }}
            >
              🎙️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                System Microphone Diagnostic & Tester
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Test audio levels, verify live speech recognition & troubleshoot mic hardware
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              color: '#64748b',
              cursor: 'pointer',
              fontWeight: 700,
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            padding: '0.75rem 1.75rem 0 1.75rem',
            borderBottom: '1px solid #e2e8f0',
            gap: '1rem',
          }}
        >
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '0.65rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'live' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'live' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📊 Live Audio VU Meter
          </button>
          <button
            onClick={() => setActiveTab('playback')}
            style={{
              padding: '0.65rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'playback' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'playback' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🎧 5-Sec Voice Loopback Test
          </button>
          <button
            onClick={() => setActiveTab('troubleshoot')}
            style={{
              padding: '0.65rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'troubleshoot' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'troubleshoot' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🛠️ Troubleshooting Guide
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Device Selection Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              padding: '0.85rem 1.25rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Select Input Device:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startLiveMic(e.target.value);
                }}
                style={{
                  padding: '0.45rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                  flex: 1,
                  maxWidth: '320px',
                }}
              >
                {devices.length === 0 ? (
                  <option value="">Default System Microphone</option>
                ) : (
                  devices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Microphone ${idx + 1} (${d.deviceId.slice(0, 8)}...)`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.7rem',
                  borderRadius: '999px',
                  background: permissionStatus === 'granted' ? '#dcfce7' : '#fee2e2',
                  color: permissionStatus === 'granted' ? '#15803d' : '#b91c1c',
                }}
              >
                {permissionStatus === 'granted' ? '● Mic Access: Granted' : '● Mic Access: Required'}
              </span>
              <button
                onClick={() => startLiveMic()}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔄 Refresh Mic
              </button>
            </div>
          </div>

          {/* Error Banner if any */}
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '0.85rem 1.1rem',
                color: '#991b1b',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span style={{ fontWeight: 600 }}>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: LIVE VU METER & SPECTRUM */}
          {activeTab === 'live' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Visualizer Card */}
              <div
                style={{
                  background: '#0f172a',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: isListening ? (isSpeaking ? '#10b981' : '#3b82f6') : '#ef4444',
                        boxShadow: isSpeaking ? '0 0 12px #10b981' : 'none',
                        transition: 'all 0.1s ease',
                      }}
                    />
                    <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.95rem' }}>
                      {isListening
                        ? isSpeaking
                          ? '🟢 SPEAKING DETECTED (Audio Input Active)'
                          : '🔵 LISTENING (Speak into your mic to test)'
                        : '🔴 Microphone Inactive'}
                    </span>
                  </div>

                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                    Volume: <strong style={{ color: '#ffffff' }}>{audioLevel}%</strong>
                  </span>
                </div>

                {/* Main Volume Level Bar */}
                <div
                  style={{
                    height: '22px',
                    background: '#1e293b',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid #334155',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${audioLevel}%`,
                      background:
                        audioLevel > 85
                          ? 'linear-gradient(90deg, #10b981 0%, #eab308 70%, #ef4444 100%)'
                          : audioLevel > 15
                          ? 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)'
                          : '#3b82f6',
                      borderRadius: '8px',
                      transition: 'width 0.06s ease-out',
                    }}
                  />
                </div>

                {/* Real-time FFT Audio Spectrum Canvas */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Real-Time Audio Frequency Bands (FFT Spectrum):
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={65}
                    style={{
                      width: '100%',
                      height: '65px',
                      background: '#020617',
                      borderRadius: '10px',
                      display: 'block',
                    }}
                  />
                </div>
              </div>

              {/* Live STT Test Box */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '1.5px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                    🎙️ Live Speech Recognition Test:
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Try saying: <em>"Testing my microphone for the interview"</em>
                  </span>
                </div>
                <div
                  style={{
                    minHeight: '70px',
                    padding: '0.85rem',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: liveTranscript ? '#0f172a' : '#94a3b8',
                    fontStyle: liveTranscript ? 'normal' : 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  {liveTranscript || 'Words you speak will appear here in real-time...'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 5-SEC PLAYBACK LOOPBACK TEST */}
          {activeTab === 'playback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '20px',
                  padding: '2rem 1.5rem',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isRecordingSample ? '#fee2e2' : '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                  }}
                >
                  {isRecordingSample ? '🔴' : '🎧'}
                </div>

                <div>
                  <h3 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontWeight: 800 }}>
                    {isRecordingSample ? `Recording Audio... (${sampleSecondsLeft}s)` : 'Audio Playback Loopback Test'}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', maxWidth: '440px' }}>
                    Click below to record a 5-second voice sample, then listen back to confirm your voice is loud, clear, and distortion-free.
                  </p>
                </div>

                {!isRecordingSample ? (
                  <button
                    onClick={startPlaybackTest}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.8rem 1.75rem',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    🎙️ Record 5-Second Test Sample
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'pulse 1s infinite',
                      }}
                    />
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>
                      Speak now... Stopping in {sampleSecondsLeft}s
                    </span>
                  </div>
                )}

                {/* Audio Player for recorded sample */}
                {sampleAudioUrl && (
                  <div
                    style={{
                      marginTop: '1rem',
                      width: '100%',
                      maxWidth: '480px',
                      background: '#ffffff',
                      padding: '1rem',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', marginBottom: '0.6rem' }}>
                      ✅ Sample Recorded! Play it below:
                    </div>
                    <audio
                      src={sampleAudioUrl}
                      controls
                      autoPlay
                      style={{ width: '100%', outline: 'none' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP TROUBLESHOOTING GUIDE */}
          {activeTab === 'troubleshoot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1.1rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>1️⃣</span> Check Windows Microphone Privacy & Volume Settings
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.4rem', color: '#475569', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <li>Open <strong>Windows Settings</strong> &gt; <strong>Privacy & Security</strong> &gt; <strong>Microphone</strong>.</li>
                  <li>Ensure <strong>"Microphone access"</strong> is turned <strong>ON</strong>.</li>
                  <li>Ensure <strong>"Let desktop apps access your microphone"</strong> is turned <strong>ON</strong>.</li>
                  <li>In <strong>Windows Settings &gt; System &gt; Sound</strong>, check that <strong>Input Volume</strong> is set to <strong>80%–100%</strong>.</li>
                </ul>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1.1rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>2️⃣</span> Check Browser Permissions (Chrome / Edge / Opera)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.4rem', color: '#475569', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <li>Click the <strong>Lock 🔒 / Tune ⚙️ icon</strong> in your browser's address bar next to <code>http://localhost:3000</code>.</li>
                  <li>Ensure <strong>Microphone</strong> is set to <strong>"Allow"</strong> (not "Block" or "Ask").</li>
                  <li>If prompted, refresh the page and select your active Realtek/headset microphone.</li>
                </ul>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1.1rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>3️⃣</span> Check Physical Mute Keys & Laptop Fn Keys
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.4rem', color: '#475569', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <li>On Lenovo laptops, check the <strong>Fn + F4</strong> or <strong>F4</strong> key which has a microphone mute LED indicator.</li>
                  <li>Ensure any inline headset mute slider is in the <strong>Unmuted</strong> position.</li>
                </ul>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1.1rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>4️⃣</span> Close Other Apps Using the Microphone
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.4rem', color: '#475569', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <li>If Zoom, Microsoft Teams, Discord, or Skype are running in the background, close or leave any active calls so they don't lock your microphone hardware.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {audioLevel > 15 ? '🟢 Microphone is working and detecting voice!' : '⚪ Speak into mic to verify levels.'}
          </div>
          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.55rem 1.4rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Done / Close Tester
          </button>
        </div>
      </div>
    </div>
  );
};
