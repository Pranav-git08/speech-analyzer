import React, { useRef, useEffect, useCallback } from 'react';

interface GlassCanvas3DProps {
  mode?: 'light' | 'dark' | 'mixed';
  intensity?: number;
}

interface Orb {
  x: number; y: number; z: number;
  radius: number; vx: number; vy: number; vz: number;
  hue: number; saturation: number; lightness: number;
  alpha: number; phase: number;
}

interface Crystal {
  x: number; y: number; z: number;
  size: number; rotation: number; rotSpeed: number;
  hue: number; alpha: number; sides: number;
  vx: number; vy: number;
}

interface LightRay {
  x: number; y: number; angle: number;
  length: number; width: number;
  hue: number; alpha: number; speed: number;
}

const GlassCanvas3D: React.FC<GlassCanvas3DProps> = ({ mode = 'mixed', intensity = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const isDark = mode === 'dark' || mode === 'mixed';

  const createOrbs = useCallback((w: number, h: number): Orb[] => {
    const count = Math.min(Math.floor((w * h) / 50000), 16);
    return Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      z: Math.random() * 400 + 100,
      radius: Math.random() * 80 + 35,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.25,
      vz: (Math.random() - 0.5) * 0.4,
      hue: Math.random() * 360,
      saturation: 55 + Math.random() * 35,
      lightness: isDark ? 38 + Math.random() * 22 : 65 + Math.random() * 25,
      alpha: 0.07 + Math.random() * 0.13,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [isDark]);

  const createCrystals = useCallback((w: number, h: number): Crystal[] => {
    const count = Math.min(Math.floor((w * h) / 90000), 10);
    return Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      z: Math.random() * 300 + 50,
      size: Math.random() * 30 + 12,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.006,
      hue: [200, 220, 260, 280, 320, 180][Math.floor(Math.random() * 6)],
      alpha: 0.05 + Math.random() * 0.08,
      sides: [4, 5, 6, 8][Math.floor(Math.random() * 4)],
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.2,
    }));
  }, []);

  const createLightRays = useCallback((w: number, h: number): LightRay[] => {
    return Array.from({ length: 5 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      angle: Math.random() * Math.PI * 2,
      length: Math.random() * 300 + 200,
      width: Math.random() * 2 + 0.5,
      hue: [210, 240, 270, 300, 180][Math.floor(Math.random() * 5)],
      alpha: 0.025 + Math.random() * 0.04,
      speed: (Math.random() - 0.5) * 0.002,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let orbs = createOrbs(w, h);
    let crystals = createCrystals(w, h);
    let lightRays = createLightRays(w, h);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      orbs = createOrbs(w, h);
      crystals = createCrystals(w, h);
      lightRays = createLightRays(w, h);
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouse);

    const drawOrb = (orb: Orb, t: number) => {
      const scale = 500 / (500 + orb.z);
      const sx = orb.x * scale + (w * (1 - scale)) / 2;
      const sy = orb.y * scale + (h * (1 - scale)) / 2;
      const pulse = 1 + Math.sin(t * 0.001 + orb.phase) * 0.15;
      const r = orb.radius * scale * pulse * intensity;
      const mx = (mouseRef.current.x - w / 2) * 0.02 * scale;
      const my = (mouseRef.current.y - h / 2) * 0.02 * scale;
      const px = sx + mx;
      const py = sy + my;
      const baseL = orb.lightness;

      // Outer glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 2.5);
      glow.addColorStop(0, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL}%, ${orb.alpha * 0.5})`);
      glow.addColorStop(0.5, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL}%, ${orb.alpha * 0.15})`);
      glow.addColorStop(1, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL}%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Glass body
      const body = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
      body.addColorStop(0, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL + 25}%, ${orb.alpha * 1.1})`);
      body.addColorStop(0.4, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL + 10}%, ${orb.alpha * 0.7})`);
      body.addColorStop(0.8, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL}%, ${orb.alpha * 0.3})`);
      body.addColorStop(1, `hsla(${orb.hue}, ${orb.saturation}%, ${baseL}%, 0)`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight
      const hl = ctx.createRadialGradient(px - r * 0.25, py - r * 0.35, 0, px - r * 0.25, py - r * 0.35, r * 0.4);
      hl.addColorStop(0, `rgba(255,255,255,${isDark ? 0.12 : 0.3})`);
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(px - r * 0.25, py - r * 0.35, r * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.strokeStyle = `hsla(${orb.hue}, ${orb.saturation}%, ${isDark ? 65 : 90}%, ${orb.alpha * 0.4})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawCrystal = (c: Crystal, t: number) => {
      const scale = 500 / (500 + c.z);
      const sx = c.x * scale + (w * (1 - scale)) / 2;
      const sy = c.y * scale + (h * (1 - scale)) / 2;
      const mx = (mouseRef.current.x - w / 2) * 0.012 * scale;
      const my = (mouseRef.current.y - h / 2) * 0.012 * scale;
      const rot = c.rotation + t * c.rotSpeed;

      ctx.save();
      ctx.translate(sx + mx, sy + my);
      ctx.rotate(rot);

      ctx.beginPath();
      for (let i = 0; i <= c.sides; i++) {
        const a = (Math.PI * 2 * i) / c.sides;
        const cr = c.size * scale * (1 + Math.sin(t * 0.0005 + i) * 0.08);
        const cx = Math.cos(a) * cr;
        const cy = Math.sin(a) * cr;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.closePath();

      const sz = c.size * scale;
      const cg = ctx.createLinearGradient(-sz, -sz, sz, sz);
      cg.addColorStop(0, `hsla(${c.hue}, 65%, ${isDark ? 32 : 82}%, ${c.alpha * 0.7})`);
      cg.addColorStop(0.5, `hsla(${c.hue + 30}, 55%, ${isDark ? 42 : 90}%, ${c.alpha * 0.35})`);
      cg.addColorStop(1, `hsla(${c.hue + 60}, 45%, ${isDark ? 28 : 78}%, ${c.alpha * 0.15})`);
      ctx.fillStyle = cg;
      ctx.fill();

      ctx.strokeStyle = `hsla(${c.hue}, 55%, ${isDark ? 55 : 92}%, ${c.alpha * 0.5})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      ctx.restore();
    };

    const drawRay = (ray: LightRay, t: number) => {
      const a = ray.angle + t * ray.speed;
      const ex = ray.x + Math.cos(a) * ray.length;
      const ey = ray.y + Math.sin(a) * ray.length;
      const pulse = 0.6 + Math.sin(t * 0.0007 + ray.angle) * 0.4;

      const g = ctx.createLinearGradient(ray.x, ray.y, ex, ey);
      g.addColorStop(0, `hsla(${ray.hue}, 75%, ${isDark ? 55 : 78}%, 0)`);
      g.addColorStop(0.5, `hsla(${ray.hue}, 75%, ${isDark ? 55 : 78}%, ${ray.alpha * pulse})`);
      g.addColorStop(1, `hsla(${ray.hue}, 75%, ${isDark ? 55 : 78}%, 0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = ray.width;
      ctx.beginPath();
      ctx.moveTo(ray.x, ray.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    };

    const animate = (ts: number) => {
      ctx.clearRect(0, 0, w, h);

      lightRays.forEach((r) => drawRay(r, ts));

      const all = [
        ...orbs.map((o) => ({ type: 'orb' as const, item: o, z: o.z })),
        ...crystals.map((c) => ({ type: 'crystal' as const, item: c, z: c.z })),
      ].sort((a, b) => b.z - a.z);

      all.forEach(({ type, item }) => {
        if (type === 'orb') drawOrb(item as Orb, ts);
        else drawCrystal(item as Crystal, ts);
      });

      // Update
      orbs.forEach((o) => {
        o.x += o.vx; o.y += o.vy; o.z += o.vz;
        o.hue = (o.hue + 0.015) % 360;
        if (o.x < -100 || o.x > w + 100) o.vx *= -1;
        if (o.y < -100 || o.y > h + 100) o.vy *= -1;
        if (o.z < 50 || o.z > 500) o.vz *= -1;
      });

      crystals.forEach((c) => {
        c.x += c.vx; c.y += c.vy; c.rotation += c.rotSpeed;
        if (c.x < -50 || c.x > w + 50) c.vx *= -1;
        if (c.y < -50 || c.y > h + 50) c.vy *= -1;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, [isDark, intensity, createOrbs, createCrystals, createLightRays]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default GlassCanvas3D;
