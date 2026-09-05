import React, { useState, useRef, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterCanvasDataUrl?: string;
  aspectRatio: number;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeSrc,
  afterCanvasDataUrl,
  aspectRatio
}) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      id="before-after-slider-container"
      className="relative select-none overflow-hidden rounded-xl border border-slate-200 shadow-md bg-slate-100 touch-none mx-auto"
      style={{
        aspectRatio: `${aspectRatio}`,
        maxHeight: '360px',
        maxWidth: '100%'
      }}
    >
      {/* After Image (Full width background) */}
      {afterCanvasDataUrl && (
        <img
          src={afterCanvasDataUrl}
          alt="After processing"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Before Image (Clipped by slider position) */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeSrc}
          alt="Before processing"
          className="absolute inset-y-0 left-0 max-w-none h-full object-contain pointer-events-none"
          style={{ width: containerRef.current?.offsetWidth || '100%' }}
        />
      </div>

      {/* Divider Bar & Handle */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-lg cursor-ew-resize flex items-center justify-center -translate-x-1/2"
        style={{ left: `${sliderPos}%` }}
        onPointerDown={handlePointerDown}
      >
        <div className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700 select-none">
          ↔
        </div>
      </div>

      {/* Badges */}
      <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-black/60 text-white rounded-md backdrop-blur-xs">
        Original
      </span>
      <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-600/90 text-white rounded-md backdrop-blur-xs">
        Enhanced
      </span>
    </div>
  );
};
