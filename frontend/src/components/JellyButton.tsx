import React, { useRef } from 'react';
import gsap from 'gsap';

interface JellyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  intensity?: number;
  variant?: 'primary' | 'secondary' | 'glass' | 'emerald' | 'purple' | 'amber';
  customStyle?: React.CSSProperties;
}

export const JellyButton: React.FC<JellyButtonProps> = ({
  children,
  intensity = 1,
  variant = 'primary',
  customStyle = {},
  onClick,
  className = '',
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseDown = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scaleX: 1 + 0.18 * intensity,
      scaleY: 1 - 0.18 * intensity,
      y: 3,
      duration: 0.1,
      ease: 'power1.out',
    });
  };

  const handleMouseUp = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      duration: 0.8,
      ease: 'elastic.out(1.2, 0.4)',
    });
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 25px rgba(37, 99, 235, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        };
      case 'purple':
        return {
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 25px rgba(124, 58, 237, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        };
      case 'emerald':
        return {
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 25px rgba(5, 150, 105, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        };
      case 'amber':
        return {
          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 25px rgba(217, 119, 6, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        };
      case 'glass':
      default:
        return {
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#ffffff',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        };
    }
  };

  return (
    <button
      ref={btnRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={onClick}
      className={`jelly-btn glass-clickable ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.6rem',
        borderRadius: '16px',
        fontWeight: 800,
        fontSize: '0.92rem',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transformOrigin: 'center center',
        willChange: 'transform',
        ...getVariantStyles(),
        ...customStyle,
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

export default JellyButton;
