import React from 'react';
import { ManagedPdfPage } from '../../types/pdfPageManager';
import { GripVertical, RotateCcw, RotateCw, Trash2, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

interface PdfPageCardProps {
  page: ManagedPdfPage;
  index: number;
  totalActivePages: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRotateLeft: (id: string) => void;
  onRotateRight: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview: (page: ManagedPdfPage) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
}

export const PdfPageCard: React.FC<PdfPageCardProps> = ({
  page,
  index,
  totalActivePages,
  isSelected,
  onToggleSelect,
  onRotateLeft,
  onRotateRight,
  onRemove,
  onPreview,
  onMoveLeft,
  onMoveRight
}) => {
  return (
    <div
      data-id={page.id}
      data-index={index}
      className={`page-card group relative flex flex-col bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md select-none overflow-hidden cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Card Header: Page Number Badge & Trash Button */}
      <div className="flex items-center justify-between px-2.5 py-2 bg-slate-50/90 border-b border-slate-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(page.id)}
            className="no-drag w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
            aria-label={`Select page ${page.currentOrder}`}
          />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-2xs">
            Page {page.currentOrder}
          </span>
          <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md">
            Orig #{page.originalIndex + 1}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(page.id);
          }}
          className="no-drag p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          title={`Remove Page ${page.currentOrder}`}
          aria-label={`Remove Page ${page.currentOrder}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Card Thumbnail Area with Zoom on Click */}
      <div
        className="relative flex-1 bg-slate-100/60 p-2 sm:p-3 flex items-center justify-center min-h-[160px] sm:min-h-[190px] cursor-grab active:cursor-grabbing group/thumb overflow-hidden select-none"
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ease-out pointer-events-none select-none"
          style={{
            transform: `rotate(${page.rotation}deg)`
          }}
        >
          {page.thumbnailUrl ? (
            <img
              src={page.thumbnailUrl}
              alt={`Page ${page.currentOrder}`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="max-h-[150px] sm:max-h-[180px] w-auto max-w-full object-contain rounded-md shadow-xs bg-white pointer-events-none select-none"
              loading="lazy"
            />
          ) : (
            <div className="w-28 h-36 bg-white border border-slate-200 rounded flex items-center justify-center text-xs text-slate-400 pointer-events-none select-none">
              Loading...
            </div>
          )}
        </div>

        {/* Hover zoom overlay indicator */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(page);
            }}
            className="no-drag pointer-events-auto px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1 shadow-lg cursor-pointer"
          >
            <ZoomIn className="w-3 h-3 text-blue-300" />
            Preview
          </button>
        </div>

        {/* Rotation indicator badge if rotated */}
        {page.rotation !== 0 && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] shadow-2xs pointer-events-none">
            {page.rotation}°
          </div>
        )}
      </div>

      {/* Card Footer: Drag Handle & Quick Actions */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border-t border-slate-100 text-slate-600 text-xs">
        {/* Drag Handle: Explicit class for SortableJS */}
        <div
          className="drag-handle flex items-center gap-1 px-1.5 py-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors pointer-events-none shrink-0"
          title="Drag to rearrange order (टच या माउस से खींचकर क्रम बदलें)"
        >
          <GripVertical className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Move</span>
        </div>

        {/* Card Actions: Quick Nudge Left/Right + Rotations */}
        <div className="flex items-center gap-0.5">
          {/* Quick left/right nudge for accessibility on touch */}
          {onMoveLeft && index > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveLeft(index);
              }}
              className="no-drag p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Move Left (बाएं खिसकाएं)"
              aria-label="Move Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {onMoveRight && index < totalActivePages - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveRight(index);
              }}
              className="no-drag p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Move Right (दाएं खिसकाएं)"
              aria-label="Move Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotateLeft(page.id);
            }}
            className="no-drag p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
            title="Rotate Left 90° (बाएं घुमाएं)"
            aria-label="Rotate Left 90°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotateRight(page.id);
            }}
            className="no-drag p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
            title="Rotate Right 90° (दाएं घुमाएं)"
            aria-label="Rotate Right 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
