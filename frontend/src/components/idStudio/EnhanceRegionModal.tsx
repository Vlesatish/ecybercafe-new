import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Sun, Contrast, Droplet, RefreshCw, Check, X, Trash2, Crosshair } from 'lucide-react';
import { EnhanceRegion, ScanAdjustmentParams } from '../../types/idStudio';
import { applyImageFilters, DEFAULT_ADJUSTMENTS } from '../../lib/idStudio/imageProcessing';

interface EnhanceRegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  adjustments?: ScanAdjustmentParams;
  initialRegions?: EnhanceRegion[];
  onConfirm: (regions: EnhanceRegion[]) => void;
}

export const EnhanceRegionModal: React.FC<EnhanceRegionModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  adjustments = DEFAULT_ADJUSTMENTS,
  initialRegions = [],
  onConfirm
}) => {
  const [regions, setRegions] = useState<EnhanceRegion[]>(initialRegions);
  const [activeRegionIndex, setActiveRegionIndex] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  const activeRegion = regions[activeRegionIndex] || null;

  useEffect(() => {
    if (isOpen) {
      setRegions(initialRegions.length > 0 ? initialRegions : [
        {
          id: `reg_${Date.now()}`,
          x: 6,
          y: 20,
          width: 32,
          height: 55,
          targetType: 'PHOTO',
          brightness: 15,
          contrast: 10,
          overallColor: 'none',
          targetColor: 'none',
          colorLightDark: 0,
          matchingRange: 35
        }
      ]);
      setActiveRegionIndex(0);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageObjRef.current = img;
        renderCanvas();
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw base image
    ctx.drawImage(img, 0, 0);

    // Apply adjustments & regions
    applyImageFilters(ctx, canvas.width, canvas.height, adjustments, regions, false);

    // Draw bounding boxes overlays
    regions.forEach((r, idx) => {
      const rx = (r.x / 100) * canvas.width;
      const ry = (r.y / 100) * canvas.height;
      const rw = (r.width / 100) * canvas.width;
      const rh = (r.height / 100) * canvas.height;

      ctx.save();
      const isActive = idx === activeRegionIndex;
      ctx.strokeStyle = isActive ? '#3b82f6' : '#94a3b8';
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.setLineDash(isActive ? [] : [6, 6]);
      ctx.strokeRect(rx, ry, rw, rh);

      // Label badge
      ctx.fillStyle = isActive ? '#2563eb' : '#475569';
      ctx.fillRect(rx, ry - 20, Math.min(100, rw), 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${r.targetType} #${idx + 1}`, rx + 5, ry - 6);

      ctx.restore();
    });
  };

  useEffect(() => {
    if (imageObjRef.current) {
      renderCanvas();
    }
  }, [regions, activeRegionIndex]);

  const updateActiveRegion = (updates: Partial<EnhanceRegion>) => {
    if (activeRegionIndex < 0 || activeRegionIndex >= regions.length) return;
    const next = [...regions];
    next[activeRegionIndex] = {
      ...next[activeRegionIndex],
      ...updates
    };
    setRegions(next);
  };

  const handleAddNewRegion = (type: 'PHOTO' | 'TEXT_CARD') => {
    const newReg: EnhanceRegion = {
      id: `reg_${Date.now()}`,
      x: 20 + regions.length * 5,
      y: 20 + regions.length * 5,
      width: 40,
      height: 40,
      targetType: type,
      brightness: type === 'PHOTO' ? 20 : 0,
      contrast: 15,
      overallColor: 'none',
      targetColor: 'none',
      colorLightDark: 0,
      matchingRange: 35
    };
    setRegions([...regions, newReg]);
    setActiveRegionIndex(regions.length);
  };

  const handleDeleteActiveRegion = () => {
    if (regions.length <= 1) return;
    const next = regions.filter((_, i) => i !== activeRegionIndex);
    setRegions(next);
    setActiveRegionIndex(Math.max(0, activeRegionIndex - 1));
  };

  // Canvas Mouse / Touch events for drawing regions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = ((e.clientX - rect.left) * scaleX) / canvas.width * 100;
    const clickY = ((e.clientY - rect.top) * scaleY) / canvas.height * 100;

    // Check if clicked inside an existing box
    const foundIdx = regions.findIndex(
      (r) => clickX >= r.x && clickX <= r.x + r.width && clickY >= r.y && clickY <= r.y + r.height
    );

    if (foundIdx >= 0) {
      setActiveRegionIndex(foundIdx);
    } else {
      setIsDrawing(true);
      setStartPos({ x: clickX, y: clickY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = ((e.clientX - rect.left) * scaleX) / canvas.width * 100;
    const currentY = ((e.clientY - rect.top) * scaleY) / canvas.height * 100;

    const minX = Math.min(startPos.x, currentX);
    const minY = Math.min(startPos.y, currentY);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    if (w > 3 && h > 3) {
      if (activeRegionIndex >= 0 && activeRegionIndex < regions.length) {
        updateActiveRegion({ x: minX, y: minY, width: w, height: h });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    setStartPos(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Photo & Text Enhance Area Tool
              </h3>
              <p className="text-[11px] text-slate-400">
                Select Photo or Text zones to brighten face or darken faded text
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

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* Canvas Interactive Area */}
          <div className="flex-1 bg-slate-950 p-4 flex flex-col items-center justify-center overflow-auto min-h-[300px] select-none">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-xl border border-slate-800 cursor-crosshair"
            />
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
              <span>Drag on the card to adjust the selection box</span>
            </p>
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-96 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 space-y-4 overflow-y-auto">
            
            {/* Region List & Add */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                  Active Selected Areas ({regions.length})
                </label>
                {regions.length > 1 && (
                  <button
                    onClick={handleDeleteActiveRegion}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Box
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {regions.map((r, idx) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRegionIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border cursor-pointer ${
                      idx === activeRegionIndex
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {r.targetType} #{idx + 1}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => handleAddNewRegion('PHOTO')}
                  className="py-1.5 px-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-purple-300 text-xs font-bold cursor-pointer"
                >
                  + Add Photo Area
                </button>
                <button
                  onClick={() => handleAddNewRegion('TEXT_CARD')}
                  className="py-1.5 px-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-blue-300 text-xs font-bold cursor-pointer"
                >
                  + Add Text Area
                </button>
              </div>
            </div>

            {/* Region Sliders */}
            {activeRegion && (
              <div className="space-y-3.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="capitalize">{activeRegion.targetType} Adjustment</span>
                  <span className="text-[10px] text-purple-400 font-mono">Box #{activeRegionIndex + 1}</span>
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-400" /> Area Brightness</span>
                    <span className="font-mono text-blue-400">{activeRegion.brightness > 0 ? `+${activeRegion.brightness}` : activeRegion.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="50"
                    value={activeRegion.brightness}
                    onChange={(e) => updateActiveRegion({ brightness: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5"><Contrast className="w-3.5 h-3.5 text-indigo-400" /> Area Contrast</span>
                    <span className="font-mono text-blue-400">{activeRegion.contrast > 0 ? `+${activeRegion.contrast}` : activeRegion.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={activeRegion.contrast}
                    onChange={(e) => updateActiveRegion({ contrast: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                {/* Target Color Light/Dark Modifier */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Color Filter</span>
                  </label>

                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'black', label: 'Black' },
                      { id: 'yellow', label: 'Yellow' },
                      { id: 'red', label: 'Red' },
                      { id: 'blue', label: 'Blue' },
                      { id: 'green', label: 'Green' },
                      { id: 'gray', label: 'Gray' },
                      { id: 'white', label: 'White' }
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => updateActiveRegion({ targetColor: c.id })}
                        className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          activeRegion.targetColor === c.id
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {activeRegion.targetColor !== 'none' && (
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>Target Color Shift</span>
                          <span className="font-mono text-emerald-400">{activeRegion.colorLightDark > 0 ? `+${activeRegion.colorLightDark}` : activeRegion.colorLightDark}%</span>
                        </div>
                        <input
                          type="range"
                          min="-60"
                          max="60"
                          value={activeRegion.colorLightDark}
                          onChange={(e) => updateActiveRegion({ colorLightDark: parseInt(e.target.value) })}
                          className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>Matching Tolerance</span>
                          <span className="font-mono text-emerald-400">{activeRegion.matchingRange}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={activeRegion.matchingRange}
                          onChange={(e) => updateActiveRegion({ matchingRange: parseInt(e.target.value) })}
                          className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => updateActiveRegion({ brightness: 22, contrast: 14, targetColor: 'none' })}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Natural Face Light
                  </button>
                  <button
                    onClick={() => updateActiveRegion({ brightness: 0, contrast: 28, targetColor: 'black', colorLightDark: -30 })}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Deep Dark Text
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(regions);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply All Regions</span>
          </button>
        </div>

      </div>
    </div>
  );
};
