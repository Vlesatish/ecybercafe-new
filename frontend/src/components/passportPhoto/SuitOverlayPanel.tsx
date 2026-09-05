import React, { useState } from 'react';
import {
  Shirt,
  Trash2,
  Upload,
  FlipHorizontal,
  RotateCw,
  Move,
  Maximize2
} from 'lucide-react';
import { SuitOverlay, SuitCategory } from '../../lib/passportPhoto/types.js';
import { SUIT_PRESETS } from '../../lib/passportPhoto/constants.js';

interface SuitOverlayPanelProps {
  currentSuit?: SuitOverlay;
  onChangeSuit: (suit?: SuitOverlay) => void;
}

export const SuitOverlayPanel: React.FC<SuitOverlayPanelProps> = ({
  currentSuit,
  onChangeSuit
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SuitCategory>('all');

  const categories: Array<{ id: SuitCategory; label: string }> = [
    { id: 'all', label: 'All Apparel' },
    { id: 'men', label: 'Men Formal' },
    { id: 'women', label: 'Women' },
    { id: 'student', label: 'Student' },
    { id: 'traditional', label: 'Traditional' }
  ];

  const filteredSuits = SUIT_PRESETS.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const handleSelectPreset = (preset: SuitOverlay) => {
    onChangeSuit({
      ...preset,
      x: currentSuit?.x || 0,
      y: currentSuit?.y || 18,
      scale: currentSuit?.scale || 1.05,
      rotation: currentSuit?.rotation || 0,
      flipH: currentSuit?.flipH || false,
      opacity: currentSuit?.opacity || 1
    });
  };

  const handleUpdateCurrent = (field: keyof SuitOverlay, val: any) => {
    if (!currentSuit) return;
    onChangeSuit({
      ...currentSuit,
      [field]: val
    });
  };

  const handleCustomSuitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      onChangeSuit({
        id: 'custom_suit_' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        category: 'formal',
        svgDataUri: dataUri,
        x: 0,
        y: 18,
        scale: 1.05,
        rotation: 0,
        flipH: false,
        opacity: 1
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div id="suit-overlay-panel" className="space-y-4">
      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
        {filteredSuits.map(preset => {
          const isSelected = currentSuit?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-1">
                <img
                  src={preset.svgDataUri}
                  alt={preset.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Transform Adjustments for Active Suit */}
      {currentSuit && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-indigo-600" />
              Adjust Suit Alignment on Subject
            </span>
            <button
              type="button"
              onClick={() => onChangeSuit(undefined)}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Suit
            </button>
          </div>

          {/* Vertical Y Position */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Vertical Position (Neck / Collar):</span>
              <span className="font-mono text-[11px]">{currentSuit.y}%</span>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              value={currentSuit.y}
              onChange={e => handleUpdateCurrent('y', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Horizontal X Position */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Horizontal Centering:</span>
              <span className="font-mono text-[11px]">{currentSuit.x}%</span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              value={currentSuit.x}
              onChange={e => handleUpdateCurrent('x', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Scale */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Suit Scale / Fit:</span>
              <span className="font-mono text-[11px]">{(currentSuit.scale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.02"
              value={currentSuit.scale}
              onChange={e => handleUpdateCurrent('scale', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Rotation & Flip */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleUpdateCurrent('flipH', !currentSuit.flipH)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                currentSuit.flipH
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Flip Suit
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Tilt:</span>
              <input
                type="range"
                min="-20"
                max="20"
                value={currentSuit.rotation}
                onChange={e => handleUpdateCurrent('rotation', parseInt(e.target.value, 10))}
                className="w-20 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-500 w-7">{currentSuit.rotation}°</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Suit Upload */}
      <div className="pt-1">
        <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50/70 hover:bg-indigo-50/40 transition-colors">
          <Upload className="w-4 h-4 text-indigo-600" />
          <span>Upload Custom Suit / Uniform (PNG / SVG)</span>
          <input
            type="file"
            accept="image/png,image/svg+xml"
            onChange={handleCustomSuitUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};
