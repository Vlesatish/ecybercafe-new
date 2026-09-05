import React, { useState } from 'react';
import {
  Paintbrush,
  Sparkles,
  RotateCcw,
  Upload,
  Check,
  Info,
  AlertCircle
} from 'lucide-react';
import { BackgroundSettings } from '../../lib/passportPhoto/types.js';
import { PASSPORT_BG_COLORS } from '../../lib/passportPhoto/constants.js';

interface BackgroundPanelProps {
  background: BackgroundSettings;
  onChangeBackground: (bg: BackgroundSettings) => void;
  hasTransparentForeground: boolean;
  onTriggerRemoveBackground: () => void;
  isRemovingBackground: boolean;
  onRestoreOriginal: () => void;
  errorMessage?: string | null;
}

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
  background,
  onChangeBackground,
  hasTransparentForeground,
  onTriggerRemoveBackground,
  isRemovingBackground,
  onRestoreOriginal,
  errorMessage
}) => {
  const [customHex, setCustomHex] = useState(background.color || '#FFFFFF');

  const handleSelectColor = (colorValue: string) => {
    if (colorValue === 'original') {
      onChangeBackground({
        ...background,
        mode: 'original'
      });
      return;
    }

    if (colorValue === 'transparent') {
      onChangeBackground({
        ...background,
        mode: 'transparent'
      });
      return;
    }

    onChangeBackground({
      ...background,
      mode: 'color',
      color: colorValue
    });
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChangeBackground({
        ...background,
        mode: 'color',
        color: hex
      });
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChangeBackground({
      ...background,
      mode: 'custom_image',
      customImageUrl: url
    });
  };

  return (
    <div id="background-panel" className="space-y-4">
      {/* AI Background Removal Action Card */}
      <div className="p-4 bg-gradient-to-br from-indigo-50 via-white to-sky-50 rounded-2xl border border-indigo-100/90 shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">AI Background Removal</h4>
              <p className="text-[11px] text-slate-500">
                {hasTransparentForeground
                  ? 'Transparent portrait cutout active'
                  : 'Remove complex background to apply solid studio colors'}
              </p>
            </div>
          </div>

          {hasTransparentForeground && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <Check className="w-3 h-3" />
              Cutout Ready
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Fast Background Removal */}
          <button
            id="passport-remove-bg-fast-btn"
            type="button"
            disabled={isRemovingBackground}
            onClick={onTriggerRemoveBackground}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isRemovingBackground ? 'Processing...' : 'Remove BG (Fast)'}
          </button>

          {/* HD Ultra Cut Pro Action */}
          <button
            id="passport-hd-ultra-cut-btn"
            type="button"
            disabled={isRemovingBackground}
            onClick={onTriggerRemoveBackground}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer border border-amber-400/40"
            title="HD Ultra Cut: Enhanced high-definition edge detection for complex hair and garments"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span>HD Ultra Cut</span>
            <span className="px-1.5 py-0.2 bg-black/30 rounded text-[9px] font-extrabold uppercase tracking-wider text-amber-200">PRO</span>
          </button>

          {hasTransparentForeground && (
            <button
              type="button"
              id="passport-restore-bg-btn"
              onClick={onRestoreOriginal}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Original
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-[11px] text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Preset Colors Grid */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Paintbrush className="w-3.5 h-3.5 text-indigo-600" />
            Studio Background Colors
          </span>
          {background.mode === 'color' && (
            <span className="font-mono text-[11px] text-slate-500 uppercase">{background.color}</span>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PASSPORT_BG_COLORS.map(color => {
            const isSelected =
              (color.value === 'original' && background.mode === 'original') ||
              (color.value === 'transparent' && background.mode === 'transparent') ||
              (background.mode === 'color' && background.color.toLowerCase() === color.value.toLowerCase());

            return (
              <button
                key={color.value}
                id={`bg-color-${color.value.replace('#', '')}`}
                type="button"
                onClick={() => handleSelectColor(color.value)}
                className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-center ${color.bgClass}`}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        color.value === '#FFFFFF' || color.value === '#FFFBEB' || color.value === '#E5E7EB'
                          ? 'text-slate-900'
                          : 'text-white'
                      }`}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium text-slate-700 leading-tight">
                  {color.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Color Picker */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
          <label className="text-xs font-medium text-slate-700">Custom Color:</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customHex}
              onChange={e => handleCustomHexChange(e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={customHex}
              maxLength={7}
              onChange={e => handleCustomHexChange(e.target.value)}
              placeholder="#FFFFFF"
              className="w-20 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <label className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload BG</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleCustomBgUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Background Layer Architecture Tip */}
      <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <span>
          <strong>Pro Tip:</strong> When you select White, Light Blue, or any studio color, the background is placed cleanly behind your portrait cutout without affecting your face or clothing.
        </span>
      </div>
    </div>
  );
};
