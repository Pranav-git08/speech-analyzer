import { useEffect, useRef, useState, useLayoutEffect } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

// Register GSAP plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable);
}

interface JellySqueezeProps {
  /**
   * Whether to show the bottom controls
   * @default true
   */
  showControls?: boolean;
  /**
   * Background color or custom styling
   */
  className?: string;
  /**
   * Title text to display above the jelly
   * @default "Drag vertically to squeeze"
   */
  title?: string;
}

export function JellySqueeze({ 
  showControls = true, 
  className = "",
  title = "Drag vertically to squeeze" 
}: JellySqueezeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragTriggerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followMouse, setFollowMouse] = useState(false);
  const [, setImagesLoaded] = useState(0);

  // Animation refs to persist across renders
  const animState = useRef({
    totalFrames: 215,
    startFrame: 70,
    images: [] as HTMLImageElement[],
    currentFrame: -1,
    dragFrame: 70, // Start at startFrame
    displayFrame: 70, // Start at startFrame
    dragSensitivity: 5.2,
    smoothing: 0.11,
    startTime: 0,
    rafId: 0,
    isMounted: false
  });

  // Preload images
  useEffect(() => {
    animState.current.isMounted = true;
    const totalFrames = animState.current.totalFrames;
    let loaded = 0;
    const images: HTMLImageElement[] = [];

    const loadImages = async () => {
      for (let i = 0; i < totalFrames; i++) {
        if (!animState.current.isMounted) return;
        
        const img = new Image();
        img.src = `https://cerpow.github.io/cerpow-img/jelly/jelly_${i
          .toString()
          .padStart(5, "0")}.jpg`;
        
        img.onload = () => {
          loaded++;
          setImagesLoaded(prev => prev + 1);
          if (loaded === totalFrames) {
            setIsLoading(false);
          }
        };
        img.onerror = () => {
          loaded++; 
          setImagesLoaded(prev => prev + 1);
          if (loaded === totalFrames) setIsLoading(false);
        };
        
        images[i] = img;
      }
      
      animState.current.images = images;
    };

    loadImages();

    return () => {
      animState.current.isMounted = false;
      cancelAnimationFrame(animState.current.rafId);
    };
  }, []);

  // Initialize Canvas & GSAP
  useLayoutEffect(() => {
    if (isLoading || !canvasRef.current || !dragTriggerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const state = animState.current;
    
    // Initial GSAP setup
    gsap.set(canvas, { y: state.startFrame / state.dragSensitivity });

    // Helper to clamp frame
    const resetWithinBounds = (frame: number) => {
      return Math.max(0, Math.min(state.totalFrames - 1, Math.floor(frame)));
    };

    // Canvas sizing
    const setCanvasSize = () => {
      if (!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = width * (3 / 4); // Force 4:3
      
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.height = `${height}px`;
      
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
      }
      
      state.currentFrame = -1; // Force redraw
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Draggable setup
    const draggable = Draggable.create(canvas, {
      trigger: dragTriggerRef.current,
      type: "y",
      inertia: true,
      bounds: { minY: 0, maxY: (state.totalFrames - 1) / state.dragSensitivity },
      allowNativeTouchScrolling: false,
      dragResistance: 0.5,
      edgeResistance: 1,
      minDuration: 0.4,
      onDrag: function() {
        state.dragFrame = this.y * state.dragSensitivity;
      },
      onThrowUpdate: function() {
        state.dragFrame = this.y * state.dragSensitivity;
      }
    })[0];

    // Animation Loop
    state.startTime = Date.now();
    const animate = () => {
      if (!state.isMounted) return;
      
      const now = Date.now();
      const dt = (now - state.startTime) / 1000;
      state.startTime = now;

      // Dampening logic
      const dampening = 1.0 - Math.exp(-state.smoothing * 60 * dt);
      state.displayFrame += (state.dragFrame - state.displayFrame) * dampening;

      const newFrame = resetWithinBounds(state.displayFrame);

      if (newFrame !== state.currentFrame && state.images[newFrame]?.complete && ctx) {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        ctx.drawImage(
          state.images[newFrame],
          0,
          0,
          canvas.clientWidth,
          canvas.clientHeight
        );
        state.currentFrame = newFrame;
      }

      state.rafId = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Mouse move handler for "Follow Mouse" mode
    const handleMouseMove = (e: MouseEvent) => {
      if (followMouse) {
        const normalizedY = e.clientY / window.innerHeight;
        state.dragFrame = normalizedY * (state.totalFrames - 1);
      }
    };
    
    if (followMouse) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    // Toggle Draggable based on followMouse
    if (followMouse) {
      draggable.disable();
    } else {
      draggable.enable();
      gsap.set(canvas, { y: state.displayFrame / state.dragSensitivity });
      draggable.update();
    }

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(state.rafId);
      draggable.kill();
    };
  }, [isLoading, followMouse]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full overflow-hidden select-none ${className}`}
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        borderRadius: '24px',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div 
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.7s ease',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ✨ Tactile 3D Physics Simulation
        </span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0.25rem 0 0 0' }}>
          {title}
        </h2>
      </div>

      {/* Canvas Container */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          aspectRatio: '4/3',
          zIndex: 10,
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            opacity: isLoading ? 0 : 1,
            transform: 'scale3d(1, 1, 1)',
            transition: 'opacity 1s ease-out',
          }}
        />
        
        {/* Invisible Drag Trigger */}
        <div 
          ref={dragTriggerRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -49%)',
            width: '56%',
            height: '52%',
            borderRadius: '50%',
            cursor: 'grab',
            zIndex: 20,
          }}
          aria-label="Drag to squeeze"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#cbd5e1',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(167, 139, 250, 0.2)', borderTopColor: '#c084fc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span>Preloading 3D Tactile Frames...</span>
        </div>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <div 
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            zIndex: 20,
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 1s ease 0.3s',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={followMouse}
              onChange={(e) => setFollowMouse(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
            />
            <span>Follow mouse cursor vertically</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default JellySqueeze;
