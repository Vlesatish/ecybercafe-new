import React from 'react';
import { Sparkles, Square, Scissors } from 'lucide-react';
import { BorderSettings } from '../../lib/passportPhoto/types.js';

interface BorderPanelProps {
  border: BorderSettings;
  onChangeBorder: (border: BorderSettings) => void;
}

export const BorderPanel: React.FC<BorderPanelProps> = ({
  border,
  onChangeBorder
}) => {
  const handleChange = (field: keyof BorderSettings, val: any) => {
    onChangeBorder({
      ...border,
      [field]: val
    });
  };

  const presetColors = [
    { label: 'Black', value: '#000000' },
    { label: 'Slate Grey', value: '#64748B' },
    { label: 'White', value: '#FFFFFF' },
    { label: 'Navy', value: '#1E3A8A' }
  ];

  return (
    <div id="border-panel" className="space-y-4">
      {/* Quick Border Presets Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-900">Border Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* No Border */}
          <button
            type="button"
            id="border-preset-none"
            onClick={() => onChangeBorder({ ...border, enabled: false })}
            className={`p-2.5 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              !border.enabled
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px]">
              None
            </div>
            <span>No Border</span>
          </button>

          {/* Thin Black Border */}
          <button
            type="button"
            id="border-preset-black"
            onClick={() =>
              onChangeBorder({
                ...border,
                enabled: true,
                width: 1,
                color: '#000000'
              })
            }
            className={`p-2.5 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              border.enabled && border.width === 1 && border.color.toLowerCase() === '#000000'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded border-2 border-black bg-slate-50 flex items-center justify-center text-[10px]">
              1px
            </div>
            <span>Thin Black</span>
          </button>

          {/* Thin Gray Border */}
          <button
            type="button"
            id="border-preset-gray"
            onClick={() =>
              onChangeBorder({
                ...border,
                enabled: true,
                width: 1,
                color: '#64748B'
              })
            }
            className={`p-2.5 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              border.enabled && border.width === 1 && border.color.toLowerCase() === '#64748b'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded border-2 border-slate-400 bg-slate-50 flex items-center justify-center text-slate-600 text-[10px]">
              1px
            </div>
            <span>Thin Gray</span>
          </button>

          {/* Custom Border */}
          <button
            type="button"
            id="border-preset-custom"
            onClick={() =>
              onChangeBorder({
                ...border,
                enabled: true,
                width: border.width > 1 ? border.width : 2
              })
            }
            className={`p-2.5 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              border.enabled && (border.width > 1 || (border.color.toLowerCase() !== '#000000' && border.color.toLowerCase() !== '#64748b'))
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded border-2 border-indigo-500 bg-indigo-50/50 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
              Custom
            </div>
            <span>Custom</span>
          </button>
        </div>
      </div>

      {border.enabled && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3.5 animate-in fade-in">
          {/* Border Width */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold">Border Width:</span>
              <span className="font-mono text-[11px]">{border.width}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={border.width}
              onChange={e => handleChange('width', parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Border Colors */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Border Color</label>
            <div className="flex items-center gap-2">
              {presetColors.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleChange('color', c.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all ${
                    border.color.toLowerCase() === c.value.toLowerCase()
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/30'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300"
                    style={{ backgroundColor: c.value }}
                  />
                  {c.label}
                </button>
              ))}
              <input
                type="color"
                value={border.color}
                onChange={e => handleChange('color', e.target.value)}
                className="w-7 h-7 rounded-md border border-slate-300 cursor-pointer p-0.5"
                title="Custom Color"
              />
            </div>
          </div>

          {/* Inner Keyline Frame */}
          <label className="flex items-center justify-between pt-2 border-t border-slate-100 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 block">Inner White Keyline</span>
              <span className="text-[11px] text-slate-500 block">
                Adds a thin white highlight between border and portrait
              </span>
            </div>
            <input
              type="checkbox"
              checked={border.innerBorder}
              onChange={e => handleChange('innerBorder', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
          </label>

          {/* Corner Crop Marks */}
          <label className="flex items-center justify-between pt-2 border-t border-slate-100 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-800 block">Corner Crop Marks</span>
              <span className="text-[11px] text-slate-500 block">
                Four L-shaped guide lines for precision paper cutters
              </span>
            </div>
            <input
              type="checkbox"
              checked={border.cornerCropMarks}
              onChange={e => handleChange('cornerCropMarks', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
          </label>
        </div>
      )}
    </div>
  );
};
