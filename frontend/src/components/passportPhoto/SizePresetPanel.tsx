import React, { useState } from 'react';
import { Search, Info, Check, Sliders } from 'lucide-react';
import { PASSPORT_SIZE_PRESETS } from '../../lib/passportPhoto/constants.js';
import { PassportPreset, CustomSizeSettings, SizeUnit } from '../../lib/passportPhoto/types.js';

interface SizePresetPanelProps {
  selectedPresetId: string;
  onSelectPreset: (preset: PassportPreset) => void;
  customSize?: CustomSizeSettings;
  onChangeCustomSize: (custom: CustomSizeSettings) => void;
}

export const SizePresetPanel: React.FC<SizePresetPanelProps> = ({
  selectedPresetId,
  onSelectPreset,
  customSize,
  onChangeCustomSize
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(selectedPresetId === 'custom');

  const filteredPresets = PASSPORT_SIZE_PRESETS.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.label.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const handleCustomChange = (field: keyof CustomSizeSettings, value: any) => {
    const updated: CustomSizeSettings = {
      width: customSize?.width || 35,
      height: customSize?.height || 45,
      unit: customSize?.unit || 'mm',
      dpi: customSize?.dpi || 300,
      lockAspectRatio: customSize?.lockAspectRatio || false,
      [field]: value
    };
    onChangeCustomSize(updated);
  };

  return (
    <div id="size-preset-panel" className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setIsCustomMode(false)}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            !isCustomMode ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Country & Standard Presets
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(true);
            if (!customSize) {
              onChangeCustomSize({ width: 35, height: 45, unit: 'mm', dpi: 300, lockAspectRatio: false });
            }
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            isCustomMode ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Custom Dimensions
        </button>
      </div>

      {!isCustomMode ? (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by country or format (India, USA, Schengen...)"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          {/* Presets List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredPresets.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  id={`preset-${preset.id}`}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="font-bold text-slate-900 block leading-tight">{preset.label}</span>
                      <span className="text-[11px] font-medium text-indigo-600">{preset.country}</span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* Custom Size Controls */
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 mb-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Configure Exact Photo Dimensions</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Width</label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="2000"
                value={customSize?.width || 35}
                onChange={e => handleCustomChange('width', parseFloat(e.target.value) || 35)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Height</label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="2000"
                value={customSize?.height || 45}
                onChange={e => handleCustomChange('height', parseFloat(e.target.value) || 45)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Measurement Unit</label>
              <select
                value={customSize?.unit || 'mm'}
                onChange={e => handleCustomChange('unit', e.target.value as SizeUnit)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="mm">Millimetres (mm)</option>
                <option value="cm">Centimetres (cm)</option>
                <option value="inch">Inches (in)</option>
                <option value="px">Pixels (px)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Print Resolution</label>
              <select
                value={customSize?.dpi || 300}
                onChange={e => handleCustomChange('dpi', parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="300">300 DPI (Photo Quality - High)</option>
                <option value="600">600 DPI (Ultra Fine Studio)</option>
                <option value="150">150 DPI (Fast Proof)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(customSize?.lockAspectRatio)}
              onChange={e => handleCustomChange('lockAspectRatio', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-700 select-none">Lock aspect ratio</span>
          </label>
        </div>
      )}

      {/* Advisory Note */}
      <div className="flex items-start gap-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Advisory Note:</strong> Country presets are standard formatting and dimension helpers based on international specifications. Please verify particular portal requirements before submission.
        </span>
      </div>
    </div>
  );
};
