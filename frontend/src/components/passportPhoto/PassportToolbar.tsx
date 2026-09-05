import React from 'react';
import {
  Crop,
  SlidersHorizontal,
  Paintbrush,
  Sparkles,
  Eraser,
  Type,
  Maximize2,
  FileSpreadsheet,
  Users,
  Shirt
} from 'lucide-react';
import { EditorTab, CustomerPhotoItem } from '../../lib/passportPhoto/types.js';

interface PassportToolbarProps {
  activeTab: EditorTab;
  onSelectTab: (tab: EditorTab) => void;
  activeItem: CustomerPhotoItem | null;
  queueCount: number;
}

export const PassportToolbar: React.FC<PassportToolbarProps> = ({
  activeTab,
  onSelectTab,
  activeItem,
  queueCount
}) => {
  const tabs: Array<{ id: EditorTab; label: string; icon: React.FC<{ className?: string }>; badge?: boolean | number }> = [
    { id: 'size', label: '1. Size', icon: Maximize2 },
    { id: 'dress', label: '2. Dress', icon: Shirt, badge: Boolean(activeItem?.suit) },
    { id: 'erase', label: '3. Erase', icon: Eraser, badge: Boolean(activeItem?.maskCanvasDataUrl) },
    { id: 'color', label: '4. Color', icon: Paintbrush, badge: activeItem?.background.mode !== 'original' },
    { id: 'text', label: '5. Info', icon: Type, badge: Boolean(activeItem?.text.enabled) },
    { id: 'border', label: '6. Border', icon: Sparkles, badge: Boolean(activeItem?.border.enabled) },
    {
      id: 'tune',
      label: 'Enhance',
      icon: SlidersHorizontal,
      badge: Boolean(
        activeItem &&
        (activeItem.tune.brightness !== 0 ||
          activeItem.tune.contrast !== 0 ||
          activeItem.tune.saturation !== 0 ||
          activeItem.tune.sharpness > 0)
      )
    }
  ];

  return (
    <div
      id="passport-editor-toolbar"
      className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner scrollbar-none"
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`passport-tab-${tab.id}`}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 ${
              isActive
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            )}
            {typeof tab.badge === 'number' && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
