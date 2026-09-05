import React from 'react';
import {
  FileSpreadsheet,
  Maximize2,
  Columns,
  Scissors,
  Layers,
  Sparkles,
  RotateCw
} from 'lucide-react';
import { PrintSheetSettings } from '../../lib/passportPhoto/types.js';
import { PAPER_SIZE_PRESETS } from '../../lib/passportPhoto/constants.js';

interface PrintSheetSettingsPanelProps {
  settings: PrintSheetSettings;
  onChangeSettings: (settings: PrintSheetSettings) => void;
  calculatedCols: number;
  calculatedRows: number;
  capacity: number;
  totalRequested: number;
  onFillSheet?: () => void;
}

export const PrintSheetSettingsPanel: React.FC<PrintSheetSettingsPanelProps> = ({
  settings,
  onChangeSettings,
  calculatedCols,
  calculatedRows,
  capacity,
  totalRequested,
  onFillSheet
}) => {
  const handleChange = (field: keyof PrintSheetSettings, val: any) => {
    let updated = {
      ...settings,
      [field]: val
    };

    // If changing away from A4 or portrait, disable sixPerRowA4
    if (field === 'paperId' && val !== 'a4') {
      updated.sixPerRowA4 = false;
    }
    if (field === 'orientation' && val !== 'portrait') {
      updated.sixPerRowA4 = false;
    }

    onChangeSettings(updated);
  };

  const handleMarginChange = (side: 'marginTopMm' | 'marginBottomMm' | 'marginLeftMm' | 'marginRightMm', val: number) => {
    if (settings.equalMargins) {
      onChangeSettings({
        ...settings,
        marginTopMm: val,
        marginBottomMm: val,
        marginLeftMm: val,
        marginRightMm: val
      });
    } else {
      onChangeSettings({
        ...settings,
        [side]: val
      });
    }
  };

  const handleA4SixPhotosPerRow = (rowsCount?: number) => {
    onChangeSettings({
      ...settings,
      paperId: 'a4',
      orientation: 'portrait',
      marginTopMm: 4,
      marginBottomMm: 4,
      marginLeftMm: 4,
      marginRightMm: 4,
      equalMargins: false,
      gapXMm: 1.5,
      gapYMm: 2,
      sixPerRowA4: true,
      requestedRows: rowsCount,
      autoArrange: true
    });
  };

  return (
    <div id="print-sheet-settings-panel" className="space-y-4">
      {/* Capacity & Quick Summary Card */}
      <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {calculatedCols} Cols × {calculatedRows} Rows ({capacity} Slots)
            </h4>
            <p className="text-[11px] text-slate-500">
              {totalRequested} photos queued for printing {totalRequested > capacity && `(${totalRequested - capacity} overflow)`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onFillSheet && totalRequested < capacity && totalRequested > 0 && (
            <button
              type="button"
              id="fill-sheet-settings-btn"
              onClick={onFillSheet}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold rounded-lg shadow-2xs flex items-center gap-1 transition-all"
              title="Fill all remaining empty slots on sheet"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Fill Sheet ({capacity})
            </button>
          )}

          <button
            type="button"
            id="a4-six-photos-full-btn"
            onClick={() => handleA4SixPhotosPerRow(undefined)}
            className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg shadow-xs flex items-center gap-1 transition-all ${
              settings.sixPerRowA4 && settings.paperId === 'a4' && settings.orientation === 'portrait' && (!settings.requestedRows || settings.requestedRows === 6)
                ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Set Full A4 (6 Columns × 6 Rows = 36 Photos) to utilize whole page down to the bottom"
          >
            <Sparkles className="w-3 h-3" />
            Full A4 (36 Photos)
          </button>

          <button
            type="button"
            id="a4-five-rows-btn"
            onClick={() => handleA4SixPhotosPerRow(5)}
            className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg shadow-xs flex items-center gap-1 transition-all ${
              settings.sixPerRowA4 && settings.paperId === 'a4' && settings.orientation === 'portrait' && settings.requestedRows === 5
                ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Set A4 5 Rows (30 Photos) preset"
          >
            30 Photos (5 Rows)
          </button>
        </div>
      </div>

      {/* Paper Preset & Orientation */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paper Size Preset
            </label>
            <select
              value={settings.paperId}
              onChange={e => handleChange('paperId', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200"
            >
              {PAPER_SIZE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paper Orientation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('orientation', 'portrait')}
                className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  settings.orientation === 'portrait'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => handleChange('orientation', 'landscape')}
                className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  settings.orientation === 'landscape'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>

        {/* Custom Paper Dimensions */}
        {settings.paperId === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Width (mm)</label>
              <input
                type="number"
                min="50"
                max="1000"
                value={settings.customPaperWidthMm || 210}
                onChange={e => handleChange('customPaperWidthMm', parseFloat(e.target.value) || 210)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Height (mm)</label>
              <input
                type="number"
                min="50"
                max="1000"
                value={settings.customPaperHeightMm || 297}
                onChange={e => handleChange('customPaperHeightMm', parseFloat(e.target.value) || 297)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Margins & Spacing */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-800">Sheet Margins (mm)</label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.equalMargins}
              onChange={e => handleChange('equalMargins', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Equal on all sides</span>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Top:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={settings.marginTopMm}
              onChange={e => handleMarginChange('marginTopMm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-slate-50 rounded border border-slate-200 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Bottom:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={settings.marginBottomMm}
              onChange={e => handleMarginChange('marginBottomMm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-slate-50 rounded border border-slate-200 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Left:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={settings.marginLeftMm}
              onChange={e => handleMarginChange('marginLeftMm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-slate-50 rounded border border-slate-200 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Right:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={settings.marginRightMm}
              onChange={e => handleMarginChange('marginRightMm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-xs bg-slate-50 rounded border border-slate-200 font-mono"
            />
          </div>
        </div>

        {/* Photo Gaps */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-1">Horizontal Gap (mm)</span>
            <input
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={settings.gapXMm}
              onChange={e => handleChange('gapXMm', parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 font-mono"
            />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-1">Vertical Gap (mm)</span>
            <input
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={settings.gapYMm}
              onChange={e => handleChange('gapYMm', parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 font-mono"
            />
          </div>
        </div>

        {/* Rows Count / Full Sheet Fill */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">Sheet Rows (Height Fill)</span>
            <span className="text-[10px] text-slate-500">Fill paper height down to bottom with all rows</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="rows-auto-btn"
              onClick={() => handleChange('requestedRows', undefined)}
              className={`px-2 py-1 text-xs rounded-md border font-medium transition-all ${
                !settings.requestedRows
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Auto ({calculatedRows} Rows)
            </button>
            <button
              type="button"
              id="rows-5-btn"
              onClick={() => handleChange('requestedRows', 5)}
              className={`px-2 py-1 text-xs rounded-md border font-medium transition-all ${
                settings.requestedRows === 5
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              5 Rows
            </button>
            <button
              type="button"
              id="rows-6-btn"
              onClick={() => handleChange('requestedRows', 6)}
              className={`px-2 py-1 text-xs rounded-md border font-medium transition-all ${
                settings.requestedRows === 6
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              6 Rows (Full Page)
            </button>
          </div>
        </div>

        {/* Guides Toggles */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showCutLines}
              onChange={e => handleChange('showCutLines', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Dashed Cutting Lines</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showCropMarks}
              onChange={e => handleChange('showCropMarks', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Corner Crop Marks</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoArrange}
              onChange={e => handleChange('autoArrange', e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Auto-Fit Margins & Gaps</span>
          </label>
        </div>
      </div>
    </div>
  );
};
