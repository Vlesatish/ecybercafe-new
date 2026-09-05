import React from 'react';
import { Type, Calendar, AlignCenter, Bold } from 'lucide-react';
import { TextSettings } from '../../lib/passportPhoto/types.js';

interface PhotoTextPanelProps {
  text: TextSettings;
  onChangeText: (text: TextSettings) => void;
}

export const PhotoTextPanel: React.FC<PhotoTextPanelProps> = ({
  text,
  onChangeText
}) => {
  const handleChange = (field: keyof TextSettings, val: any) => {
    onChangeText({
      ...text,
      [field]: val
    });
  };

  return (
    <div id="photo-text-panel" className="space-y-4">
      {/* Enable Toggle Header */}
      <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-slate-900">Name & Date of Photo Strip</h4>
          <p className="text-[11px] text-slate-500">
            Mandatory for many Indian competitive exams, NEET, JEE, SSC, and police recruitments
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={text.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {text.enabled && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3.5 animate-in fade-in">
          {/* Candidate Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Candidate Full Name
            </label>
            <input
              type="text"
              value={text.candidateName}
              onChange={e => handleChange('candidateName', e.target.value)}
              placeholder="e.g. RAHUL SHARMA"
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
            />
          </div>

          {/* Date of Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Photo (D.O.P)
              </label>
              <input
                type="date"
                value={text.dateOfPhoto}
                onChange={e => handleChange('dateOfPhoto', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                value={text.dateOfBirth || ''}
                onChange={e => handleChange('dateOfBirth', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          {/* Formatting Options */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Banner Position</label>
              <select
                value={text.position}
                onChange={e => handleChange('position', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200"
              >
                <option value="bottom">Bottom of Photo</option>
                <option value="top">Top of Photo</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Font Size</label>
              <input
                type="range"
                min="10"
                max="22"
                value={text.fontSize}
                onChange={e => handleChange('fontSize', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={text.uppercase}
                onChange={e => handleChange('uppercase', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>UPPERCASE Name</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={text.showDopLabel}
                onChange={e => handleChange('showDopLabel', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include "D.O.P:" Prefix</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={text.isBold}
                onChange={e => handleChange('isBold', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-bold">Bold Typography</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
