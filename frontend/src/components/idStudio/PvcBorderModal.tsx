import React, { useState } from 'react';
import { ShieldCheck, Check, X, Palette } from 'lucide-react';
import { CardBorderConfig } from '../../types/idStudio';

interface PvcBorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBorder: CardBorderConfig;
  onConfirm: (border: CardBorderConfig) => void;
}

export const PvcBorderModal: React.FC<PvcBorderModalProps> = ({
  isOpen,
  onClose,
  initialBorder,
  onConfirm
}) => {
  const [border, setBorder] = useState<CardBorderConfig>(initialBorder || {
    enabled: true,
    color: '#000000',
    thicknessPx: 1.5
  });

  if (!isOpen) return null;

  const colorPresets = [
    { label: 'Black', hex: '#000000' },
    { label: 'Dark Slate', hex: '#1e293b' },
    { label: 'Classic Blue', hex: '#1d4ed8' },
    { label: 'Dark Red', hex: '#991b1b' },
    { label: 'Forest Green', hex: '#166534' },
    { label: 'Gold Bronze', hex: '#ca8a04' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                PVC Card Border & Outline
              </h3>
              <p className="text-[11px] text-slate-400">
                Add clean cutting guide or solid frame around ID cards
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
        <div className="p-5 space-y-4">
          
          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-black text-white">Enable Card Border</span>
              <p className="text-[10px] text-slate-400">Draws solid stroke around CR-80 boundaries</p>
            </div>
            <input
              type="checkbox"
              checked={border.enabled}
              onChange={(e) => setBorder({ ...border, enabled: e.target.checked })}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          {border.enabled && (
            <>
              {/* Color Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  <span>Border Color</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setBorder({ ...border, color: c.hex })}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                        border.color === c.hex
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thickness */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Border Thickness</span>
                  <span className="font-mono text-blue-400">{border.thicknessPx} px</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={border.thicknessPx}
                  onChange={(e) => setBorder({ ...border, thicknessPx: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center">
                <div
                  className="w-36 h-22 bg-white rounded-xs flex items-center justify-center text-[10px] text-slate-500 font-bold"
                  style={{
                    border: `${border.thicknessPx}px solid ${border.color}`
                  }}
                >
                  CR-80 Preview
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(border);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Border</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
