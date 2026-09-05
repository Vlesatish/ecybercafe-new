import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Eraser,
  Paintbrush,
  RotateCcw,
  Check,
  ZoomIn,
  Undo2
} from 'lucide-react';

interface AdvancedEraserProps {
  imageSrc: string;
  initialMaskDataUrl?: string;
  aspectRatio: number;
  onSaveMask: (maskDataUrl: string) => void;
  onClearMask: () => void;
}

export const AdvancedEraser: React.FC<AdvancedEraserProps> = ({
  imageSrc,
  initialMaskDataUrl,
  aspectRatio,
  onSaveMask,
  onClearMask
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toolMode, setToolMode] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize mask canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = 600;
    const height = Math.round(width / aspectRatio);
    canvas.width = width;
    canvas.height = height;

    if (initialMaskDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = initialMaskDataUrl;
    } else {
      // Default: full white mask (all visible)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }
  }, [initialMaskDataUrl, aspectRatio]);

  const drawAtPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, (brushSize / 2) * scaleX, 0, Math.PI * 2);

    if (toolMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
    ctx.restore();
    setHasChanges(true);
  }, [brushSize, toolMode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    drawAtPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    drawAtPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleApplyMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveMask(dataUrl);
    setHasChanges(false);
  };

  const handleResetMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClearMask();
    setHasChanges(false);
  };

  return (
    <div id="advanced-eraser-tool" className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setToolMode('erase')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              toolMode === 'erase'
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Erase Edge
          </button>
          <button
            type="button"
            onClick={() => setToolMode('restore')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              toolMode === 'restore'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            Restore
          </button>
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-600">Brush:</span>
          <input
            type="range"
            min="6"
            max="70"
            value={brushSize}
            onChange={e => setBrushSize(parseInt(e.target.value, 10))}
            className="w-24 accent-indigo-600 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-500 w-6">{brushSize}px</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleResetMask}
            className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleApplyMask}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Brush
          </button>
        </div>
      </div>

      {/* Interactive Brush Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner flex items-center justify-center select-none touch-none cursor-crosshair"
        style={{
          maxHeight: '380px',
          maxWidth: '100%',
          aspectRatio: `${aspectRatio}`
        }}
      >
        {/* Background base image */}
        <img
          src={imageSrc}
          alt="Original preview for eraser"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-40"
        />

        {/* Mask Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full h-full object-contain z-10"
        />
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Drag your mouse or finger across the photo to fine-tune stray hairs or collar contours.
      </p>
    </div>
  );
};
