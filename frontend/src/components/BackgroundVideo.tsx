import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface BackgroundVideoProps {
  src?: string;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  src = 'https://stream.mux.com/kimF2ha9zLrX64H00UgLGPflCzNtl1T0215MlAmeOztv8.m3u8',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      video.src = src;
    } else if (Hls.isSupported()) {
      // Use hls.js for Chrome, Firefox, Edge, etc.
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback: already muted, continue
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover opacity-100"
      />
    </div>
  );
};

export default BackgroundVideo;
