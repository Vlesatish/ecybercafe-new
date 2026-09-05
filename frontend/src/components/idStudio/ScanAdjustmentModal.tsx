import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Sun, Contrast, Droplet, Sparkles, RefreshCw, Check, X, Eye } from 'lucide-react';
import { ScanAdjustmentParams } from '../../types/idStudio';
import { applyImageFilters, DEFAULT_ADJUSTMENTS } from '../../lib/idStudio/imageProcessing';

interface ScanAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  initialAdjustments?: ScanAdjustmentParams;
  onConfirm: (adjustments: ScanAdjustmentParams) => void;
}

export const ScanAdjustmentModal: React.FC<ScanAdjustmentModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  initialAdjustments = DEFAULT_ADJUSTMENTS,
  onConfirm
}) => {
  const [params, setParams] = useState<ScanAdjustmentParams>(initialAdjustments);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setParams(initialAdjustments);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageObjRef.current = img;
        renderPreview(params);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  const renderPreview = (currentParams: ScanAdjustmentParams) => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    applyImageFilters(ctx, canvas.width, canvas.height, currentParams, [], false);
  };

  const handleParamChange = (updates: Partial<ScanAdjustmentParams>) => {
    const next = { ...params, ...updates };
    setParams(next);
    renderPreview(next);
  };

  const setPresetMode = (mode: 'ORIGINAL' | 'NATURAL_MAGIC' | 'BW') => {
    let next: ScanAdjustmentParams;
    if (mode === 'ORIGINAL') {
      next = { ...DEFAULT_ADJUSTMENTS, filterMode: 'ORIGINAL' };
    } else if (mode === 'NATURAL_MAGIC') {
      next = {
        filterMode: 'NATURAL_MAGIC',
        brightness: 106,
        contrast: 112,
        saturation: 108,
        warmth: 4,
        sharpness: 25,
        clarity: 20,
        thresholdBW: 128
      };
    } else {
      next = {
        filterMode: 'BW',
        brightness: 100,
        contrast: 120,
        saturation: 0,
        warmth: 0,
        sharpness: 30,
        clarity: 20,
        thresholdBW: 128
      };
    }
    setParams(next);
    renderPreview(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Scan Adjustment & Color Tuning
              </h3>
              <p className="text-[11px] text-slate-400">
                Enhance brightness, contrast, sharpness, and B&W clarity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Canvas Preview */}
          <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[260px]">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg border border-slate-800"
            />
          </div>

          {/* Right Control Sliders */}
          <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-4 space-y-4 overflow-y-auto">
            
            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                Filter Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'ORIGINAL', label: 'Original' },
                  { id: 'NATURAL_MAGIC', label: 'Magic / Vivid' },
                  { id: 'BW', label: 'Black & White' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPresetMode(m.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                      params.filterMode === m.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1">
              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness</span>
                  <span className="font-mono text-blue-400">{params.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={params.brightness}
                  onChange={(e) => handleParamChange({ brightness: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5"><Contrast className="w-3.5 h-3.5 text-indigo-400" /> Contrast</span>
                  <span className="font-mono text-blue-400">{params.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="150"
                  value={params.contrast}
                  onChange={(e) => handleParamChange({ contrast: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Saturation */}
              {params.filterMode !== 'BW' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5"><Droplet className="w-3.5 h-3.5 text-rose-400" /> Saturation</span>
                    <span className="font-mono text-blue-400">{params.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={params.saturation}
                    onChange={(e) => handleParamChange({ saturation: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Sharpness */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Sharpness</span>
                  <span className="font-mono text-blue-400">{params.sharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={params.sharpness}
                  onChange={(e) => handleParamChange({ sharpness: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Warmth */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Color Temperature</span>
                  <span className="font-mono text-blue-400">{params.warmth > 0 ? `+${params.warmth}` : params.warmth}</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={params.warmth}
                  onChange={(e) => handleParamChange({ warmth: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

            </div>

            <button
              onClick={() => {
                setParams(DEFAULT_ADJUSTMENTS);
                renderPreview(DEFAULT_ADJUSTMENTS);
              }}
              className="w-full py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(params);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Scan</span>
          </button>
        </div>

      </div>
    </div>
  );
};
