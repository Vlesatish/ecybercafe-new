import React from 'react';
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  Upload,
  UserCheck,
  Edit3,
  Download
} from 'lucide-react';
import { CustomerPhotoItem } from '../../lib/passportPhoto/types.js';
import { getPhotoDimensionsMm } from '../../lib/passportPhoto/printLayoutEngine.js';
import { downloadSinglePhoto } from '../../lib/passportPhoto/exportEngine.js';

interface PrintQueuePanelProps {
  queue: CustomerPhotoItem[];
  activeItemId: string | null;
  onSelectActiveItem: (id: string) => void;
  onUpdateCopies: (id: string, copies: number) => void;
  onRemoveItem: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onReEditItem: (id: string) => void;
  onAddNewCustomer: () => void;
  onClearQueue?: () => void;
  sheetCapacity: number;
}

export const PrintQueuePanel: React.FC<PrintQueuePanelProps> = ({
  queue,
  activeItemId,
  onSelectActiveItem,
  onUpdateCopies,
  onRemoveItem,
  onDuplicateItem,
  onReEditItem,
  onAddNewCustomer,
  onClearQueue,
  sheetCapacity
}) => {
  const totalCopies = queue.reduce((sum, item) => sum + (item.copies || 1), 0);
  const isOverCapacity = totalCopies > sheetCapacity;

  const handleDownloadSingle = async (e: React.MouseEvent, item: CustomerPhotoItem) => {
    e.stopPropagation();
    try {
      await downloadSinglePhoto(item, 'jpg', false);
    } catch (err) {
      console.error('Failed to download single photo:', err);
    }
  };

  return (
    <div id="print-queue-panel" className="space-y-4">
      {/* Header and Capacity Pill */}
      <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900">Multi-Customer Print Queue</h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Combine multiple customers or family members on one sheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClearQueue && queue.length > 0 && (
            <button
              type="button"
              id="queue-clear-all-btn"
              onClick={onClearQueue}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Clear all photos from queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
              isOverCapacity
                ? 'bg-amber-100 text-amber-800'
                : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            {totalCopies} / {sheetCapacity} Photos
          </span>
        </div>
      </div>

      {/* Queue Items List */}
      <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
        {queue.map((item, index) => {
          const isActive = item.id === activeItemId;
          const dim = getPhotoDimensionsMm(item);
          const widthCm = (dim.widthMm / 10).toFixed(1);
          const heightCm = (dim.heightMm / 10).toFixed(1);

          return (
            <div
              key={item.id}
              id={`queue-item-${item.id}`}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Thumbnail & Info */}
              <div
                onClick={() => onSelectActiveItem(item.id)}
                className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer group"
              >
                <div className="w-12 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative shadow-2xs">
                  <img
                    src={item.renderedDataUrl || item.transparentForegroundUrl || item.originalImageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[8px] font-bold text-center py-0.2">
                      Active
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-indigo-600">
                    {item.name || `Customer #${index + 1}`}
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 font-mono block">
                    {widthCm} × {heightCm} cm
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {item.presetId.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Stepper, Re-edit, Download, Delete */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Stepper (- qty +) */}
                <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    id={`queue-decrease-${item.id}`}
                    onClick={() => onUpdateCopies(item.id, Math.max(1, (item.copies || 1) - 1))}
                    className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    title="Decrease copies"
                  >
                    -
                  </button>
                  <span className="px-2 py-1 text-xs font-bold font-mono text-slate-800 bg-white border-x border-slate-200 min-w-[24px] text-center">
                    {item.copies || 1}
                  </span>
                  <button
                    type="button"
                    id={`queue-increase-${item.id}`}
                    onClick={() => onUpdateCopies(item.id, (item.copies || 1) + 1)}
                    className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    title="Increase copies"
                  >
                    +
                  </button>
                </div>

                {/* Re-Edit Button */}
                <button
                  type="button"
                  id={`queue-reedit-${item.id}`}
                  onClick={() => onReEditItem(item.id)}
                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200 cursor-pointer"
                  title="Re-edit photo in editor"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {/* Individual Download Button */}
                <button
                  type="button"
                  id={`queue-download-single-${item.id}`}
                  onClick={e => handleDownloadSingle(e, item)}
                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200 cursor-pointer"
                  title="Download single photo (300 DPI JPG)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  id={`queue-delete-${item.id}`}
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove this photo from queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Customer Button */}
      <button
        id="queue-add-customer-btn"
        type="button"
        onClick={onAddNewCustomer}
        className="w-full py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-xs font-semibold text-indigo-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
      >
        <Plus className="w-4 h-4" />
        Add Another Customer to Print Sheet
      </button>
    </div>
  );
};
