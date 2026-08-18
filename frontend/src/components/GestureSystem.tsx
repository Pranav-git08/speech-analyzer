import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemDiagnosticModal, DiagnosticTab } from './SystemDiagnosticModal';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
  decay: number;
}

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
}

interface GestureSystemProps {
  enableCursorTrail?: boolean;
}

export const GestureSystem: React.FC<GestureSystemProps> = ({ enableCursorTrail = true }) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const mouseRef = useRef({ x: -100, y: -100, targetX: -100, targetY: -100 });
  const trailRef = useRef({ x: -100, y: -100, size: 28, targetSize: 28 });
  const isClickingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const hoverTextRef = useRef<string | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<ClickRipple[]>([]);
  const lastEmitRef = useRef(0);

  const [showGestureHUD, setShowGestureHUD] = useState(false);
  const [activeGestureToast, setActiveGestureToast] = useState<string | null>(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagTab, setDiagTab] = useState<DiagnosticTab>('mic');

  const openDiag = (tab: DiagnosticTab, label: string) => {
    setDiagTab(tab);
    setDiagnosticOpen(true);
    triggerGestureToast(`🛠️ Gesture: Opened ${label}`);
  };

  const triggerGestureToast = (msg: string) => {
    setActiveGestureToast(msg);
    setTimeout(() => setActiveGestureToast(null), 2200);
  };

  useEffect(() => {
    if (!enableCursorTrail) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      // Detect hover over interactive elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.onclick !== null ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.ios-btn') ||
          target.closest('.luxury-sheen-btn') ||
          target.closest('.ios-glass-card') ||
          target.closest('.luxury-glass-card-premium') ||
          target.closest('.glass-clickable') ||
          target.classList.contains('glass-clickable'))
      ) {
        isHoveringRef.current = true;
        trailRef.current.targetSize = 48;
        const clickable = target.closest('button') || target.closest('a') || target;
        const text = clickable.getAttribute('title') || clickable.innerText?.slice(0, 18);
        hoverTextRef.current = text && text.length > 2 ? text : null;
      } else {
        isHoveringRef.current = false;
        trailRef.current.targetSize = 28;
        hoverTextRef.current = null;
      }

      // Emit floating stardust particles
      const now = performance.now();
      if (now - lastEmitRef.current > 30) {
        lastEmitRef.current = now;
        const hues = [200, 240, 280, 320, 180, 45];
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push({
            x: e.clientX + (Math.random() - 0.5) * 8,
            y: e.clientY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2 - 0.6,
            radius: Math.random() * 3.5 + 2,
            hue: hues[Math.floor(Math.random() * hues.length)],
            alpha: 0.9,
            decay: Math.random() * 0.03 + 0.02,
          });
        }
        if (particlesRef.current.length > 40) {
          particlesRef.current = particlesRef.current.slice(-40);
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isClickingRef.current = true;
      trailRef.current.targetSize = 20;

      // Add energy shockwave ripple
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 6,
        maxRadius: 75,
        alpha: 1,
        hue: isHoveringRef.current ? 280 : 210,
      });
    };

    const handleMouseUp = () => {
      isClickingRef.current = false;
      trailRef.current.targetSize = isHoveringRef.current ? 48 : 28;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // ── 60/120 FPS High-Precision Particle & Cursor Render Loop ──────────────
    const render = () => {
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Smooth lerp for trailing ring
      trailRef.current.x += (mx - trailRef.current.x) * 0.22;
      trailRef.current.y += (my - trailRef.current.y) * 0.22;
      trailRef.current.size += (trailRef.current.targetSize - trailRef.current.size) * 0.2;

      const tx = trailRef.current.x;
      const ty = trailRef.current.y;
      const ts = trailRef.current.size;

      // 1. Render Click Shockwave Ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += (r.maxRadius - r.radius) * 0.14 + 1.2;
        r.alpha -= 0.045;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue}, 90%, 65%, ${r.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsla(${r.hue}, 90%, 65%, 0.8)`;
        ctx.shadowBlur = 15;
        ctx.stroke();

        // Inner secondary pulse ring
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue + 30}, 90%, 75%, ${r.alpha * 0.6})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Render Floating Stardust Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.radius = Math.max(0, p.radius - 0.05);

        if (p.alpha <= 0 || p.radius <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 75%, ${p.alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 95%, 65%, 0.9)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // 3. Render Trailing Magnetic Lens Ring
      if (mx >= 0 && my >= 0) {
        ctx.save();

        // Outer ambient glow
        const glowGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, ts * 1.6);
        const glowColor = isHoveringRef.current ? 'rgba(168, 85, 247, ' : 'rgba(56, 189, 248, ';
        glowGrad.addColorStop(0, `${glowColor}0.35)`);
        glowGrad.addColorStop(0.6, `${glowColor}0.1)`);
        glowGrad.addColorStop(1, `${glowColor}0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(tx, ty, ts * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Lens Border Ring
        ctx.beginPath();
        ctx.arc(tx, ty, ts, 0, Math.PI * 2);
        ctx.strokeStyle = isHoveringRef.current
          ? 'rgba(192, 132, 252, 0.85)'
          : isClickingRef.current
          ? 'rgba(56, 189, 248, 0.95)'
          : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = isHoveringRef.current ? 2.2 : 1.5;
        ctx.shadowColor = isHoveringRef.current ? '#c084fc' : '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 4. Render Laser Sharp Core Dot
        ctx.beginPath();
        ctx.arc(mx, my, isClickingRef.current ? 3.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fill();

        // White specular center
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Hover tooltip label
        if (hoverTextRef.current && isHoveringRef.current) {
          ctx.font = 'bold 11px system-ui, sans-serif';
          const text = hoverTextRef.current;
          const textWidth = ctx.measureText(text).width;
          const px = tx - textWidth / 2 - 8;
          const py = ty - ts - 22;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) { ctx.roundRect(px, py, textWidth + 16, 20, 6); } else { ctx.rect(px, py, textWidth + 16, 20); }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#93c5fd';
          ctx.shadowBlur = 0;
          ctx.fillText(text, px + 8, py + 14);
        }

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animRef.current);
    };
  }, [enableCursorTrail]);

  // ── Keyboard Gesture Shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        setShowGestureHUD((prev) => !prev);
        triggerGestureToast('🖐️ Gesture HUD Toggled');
      }

      if (e.altKey && e.key === '1') {
        e.preventDefault();
        openDiag('mic', 'Microphone Diagnostic');
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        openDiag('camera', 'Camera Diagnostic');
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        openDiag('speaker', 'Speaker Diagnostic');
      }
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        openDiag('network', 'System Check');
      }
      if (e.altKey && e.key === '5') {
        e.preventDefault();
        navigate('/login/admin');
        triggerGestureToast('🔒 Gesture: Jumped to Admin Console');
      }
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        navigate('/');
        triggerGestureToast('🏠 Gesture: Returned to Home');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <>
      {/* High-Performance Canvas Overlay for Cursor, Particles & Shockwaves */}
      {enableCursorTrail && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999999,
          }}
        />
      )}

      {/* Gesture Notification Toast */}
      {activeGestureToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(96, 165, 250, 0.5)',
            borderRadius: '16px',
            padding: '0.7rem 1.35rem',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.88rem',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(96, 165, 250, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            animation: 'toastSpring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {activeGestureToast}
        </div>
      )}

      {/* Interactive Gesture HUD (Press 'G') */}
      {showGestureHUD && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 999998,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(28px)',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '24px',
            padding: '1.5rem',
            maxWidth: '340px',
            color: '#ffffff',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(96, 165, 250, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 900, fontSize: '0.92rem', color: '#93c5fd' }}>
              🖐️ Pro Gesture Matrix
            </span>
            <button
              onClick={() => setShowGestureHUD(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              ESC / G
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
            {[
              { key: 'Alt + 1', desc: 'Microphone Diagnostic' },
              { key: 'Alt + 2', desc: 'Camera Diagnostic' },
              { key: 'Alt + 3', desc: 'Speaker Diagnostic' },
              { key: 'Alt + 4', desc: 'System & WebRTC Check' },
              { key: 'Alt + 5', desc: 'Admin Console' },
              { key: 'Alt + H', desc: 'Home Screen' },
              { key: 'G', desc: 'Toggle Gesture Hub' },
            ].map((s, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cbd5e1' }}>{s.desc}</span>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '0.15rem 0.45rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#fef08a',
                  }}
                >
                  {s.key}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Pre-Interview System Diagnostics Modal */}
      <SystemDiagnosticModal
        isOpen={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        initialTab={diagTab}
      />
    </>
  );
};

export default GestureSystem;
