import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CandidateWebcamProps {
  onStreamReady?: (stream: MediaStream) => void;
  width?: number | string;
  height?: number | string;
  isFloating?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const CandidateWebcam: React.FC<CandidateWebcamProps> = ({
  onStreamReady,
  width = 200,
  height = 145,
  isFloating = false,
  style,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [resolution, setResolution] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Enumerate video devices
  const enumerateCameras = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      if (videoInputs.length > 0 && !selectedDeviceId) {
        const physical = videoInputs.find(
          (d) =>
            !d.label.toLowerCase().includes('virtual') &&
            !d.label.toLowerCase().includes('obs') &&
            !d.label.toLowerCase().includes('ir')
        );
        setSelectedDeviceId(physical ? physical.deviceId : videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('[CandidateWebcam] Enumerate devices warning:', e);
    }
  }, [selectedDeviceId]);

  // Start Camera with constraint fallbacks
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setCameraError(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const targetDevId = deviceId || selectedDeviceId;
      let stream: MediaStream | null = null;

      try {
        const constraints: MediaStreamConstraints = {
          video: targetDevId
            ? { deviceId: { exact: targetDevId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }
            : { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        try {
          const constraints: MediaStreamConstraints = {
            video: targetDevId ? { deviceId: { exact: targetDevId } } : true,
            audio: true,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (err: any) {
            console.error('[CandidateWebcam] Camera access error:', err);
            setCameraError(err?.message || 'Camera access denied');
            setCameraActive(false);
            return;
          }
        }
      }

      if (!stream) return;

      streamRef.current = stream;
      setCameraActive(true);

      const video = videoRef.current;
      if (video) {
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;
        video.play().catch(() => {});
      }

      onStreamReady?.(stream);
      enumerateCameras();
    },
    [selectedDeviceId, onStreamReady, enumerateCameras]
  );

  useEffect(() => {
    startCamera();
    enumerateCameras();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Live Canvas Render loop
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && !video.paused) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            setResolution(`${canvas.width}x${canvas.height}`);
          }

          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          frameCount++;
          const now = performance.now();
          if (now - lastTime >= 1000) {
            setFps(frameCount);
            frameCount = 0;
            lastTime = now;
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraActive]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  const finalWidth = expanded ? 320 : width;
  const finalHeight = expanded ? 240 : height;

  const containerStyle: React.CSSProperties = isFloating
    ? {
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255, 255, 255, 0.95)',
        borderRadius: '22px',
        padding: '0.45rem',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }
    : {
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255, 255, 255, 0.95)',
        borderRadius: '22px',
        padding: '0.45rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
        display: 'inline-block',
        ...style,
      };

  return (
    <div style={containerStyle}>
      <div
        style={{
          position: 'relative',
          width: finalWidth,
          height: finalHeight,
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#090d16',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25) inset',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            opacity: 0.01,
            pointerEvents: 'none',
          }}
          aria-label="Webcam Feed Track"
        />

        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
        />

        {!cameraActive && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.75rem',
              textAlign: 'center',
              background: '#0f172a',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '1.6rem' }}>📷</span>
            <span style={{ color: cameraError ? '#f87171' : '#94a3b8', lineHeight: 1.3 }}>
              {cameraError ? 'Camera Busy / Denied' : 'Connecting Camera...'}
            </span>
            <button
              onClick={() => startCamera()}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
              }}
            >
              🔄 Start Camera
            </button>
          </div>
        )}

        {cameraActive && (
          <div
            style={{
              position: 'absolute',
              bottom: '6px',
              left: '6px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '0.15rem 0.4rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
              <span>LIVE</span>
              {fps > 0 && <span style={{ opacity: 0.7 }}>• {fps}fps</span>}
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            display: 'flex',
            gap: '4px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '2px 5px',
              fontSize: '0.68rem',
              cursor: 'pointer',
            }}
            title={expanded ? 'Minimize' : 'Expand Camera View'}
          >
            {expanded ? '↙' : '↗'}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '2px 5px',
              fontSize: '0.68rem',
              cursor: 'pointer',
            }}
            title="Camera Device Settings"
          >
            ⚙️
          </button>
        </div>

        {showSettings && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#ffffff',
              fontSize: '0.72rem',
              zIndex: 20,
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, marginBottom: '0.4rem', color: '#60a5fa' }}>
                Select Video Camera
              </div>
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '0.3rem',
                  fontSize: '0.7rem',
                  marginBottom: '0.4rem',
                }}
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Res: {resolution || 'Auto'} • FPS: {fps}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => startCamera()}
                style={{
                  flex: 1,
                  background: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  padding: '0.3rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  flex: 1,
                  background: '#334155',
                  border: 'none',
                  color: '#fff',
                  padding: '0.3rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
