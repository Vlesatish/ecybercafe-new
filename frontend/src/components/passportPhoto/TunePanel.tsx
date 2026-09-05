import React from 'react';
import {
  Sun,
  Contrast,
  Palette,
  Thermometer,
  Zap,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { TuneSettings } from '../../lib/passportPhoto/types.js';
import { DEFAULT_TUNE_SETTINGS } from '../../lib/passportPhoto/constants.js';

interface TunePanelProps {
  tune: TuneSettings;
  onChangeTune: (tune: TuneSettings) => void;
  onToggleCompare?: () => void;
  isComparing?: boolean;
}

export const TunePanel: React.FC<TunePanelProps> = ({
  tune,
  onChangeTune,
  onToggleCompare,
  isComparing = false
}) => {
  const handleSliderChange = (field: keyof TuneSettings, value: number) => {
    onChangeTune({
      ...tune,
      [field]: value
    });
  };

  const handleAutoEnhance = () => {
    onChangeTune({
      brightness: 8,
      contrast: 10,
      saturation: 6,
      exposure: 4,
      highlights: 0,
      shadows: 0,
      warmth: 4,
      sharpness: 25,
      naturalSkin: true
    });
  };

  const handleReset = () => {
    onChangeTune({ ...DEFAULT_TUNE_SETTINGS });
  };

  const sliders = [
    { key: 'brightness', label: 'Brightness', icon: Sun, min: -50, max: 50, step: 1 },
    { key: 'contrast', label: 'Contrast', icon: Contrast, min: -50, max: 50, step: 1 },
    { key: 'saturation', label: 'Color Saturation', icon: Palette, min: -50, max: 50, step: 1 },
    { key: 'exposure', label: 'Exposure', icon: Zap, min: -50, max: 50, step: 1 },
    { key: 'warmth', label: 'Warmth / White Balance', icon: Thermometer, min: -50, max: 50, step: 1 },
    { key: 'sharpness', label: 'Facial Sharpness', icon: Sparkles, min: 0, max: 100, step: 5 }
  ];

  return (
    <div id="tune-panel" className="space-y-4">
      {/* Quick Action Header */}
      <div className="flex items-center justify-between gap-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
        <button
          type="button"
          onClick={handleAutoEnhance}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Auto Portrait Enhance
        </button>

        <div className="flex items-center gap-2">
          {onToggleCompare && (
            <button
              type="button"
              onClick={onToggleCompare}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isComparing
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Compare
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            title="Reset All Adjustments"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3.5">
        {sliders.map(item => {
          const Icon = item.icon;
          const val = (tune as any)[item.key] || 0;
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  {item.label}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {val > 0 ? `+${val}` : val}
                </span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={val}
                onChange={e => handleSliderChange(item.key as keyof TuneSettings, parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
              />
            </div>
          );
        })}

        {/* Natural Skin Mode */}
        <label className="flex items-center justify-between pt-2 border-t border-slate-100 cursor-pointer">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Natural Skin Smoothing</span>
            <span className="text-[11px] text-slate-500 block">Softens facial noise and maintains natural skin tone</span>
          </div>
          <input
            type="checkbox"
            checked={tune.naturalSkin}
            onChange={e => onChangeTune({ ...tune, naturalSkin: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
        </label>
      </div>
    </div>
  );
};
