import React, { useEffect } from 'react';
import { ManagedPdfPage } from '../../types/pdfPageManager';
import { X, ChevronLeft, ChevronRight, RotateCcw, RotateCw, Trash2, ZoomIn } from 'lucide-react';

interface PdfPagePreviewModalProps {
  page: ManagedPdfPage | null;
  pages: ManagedPdfPage[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: ManagedPdfPage) => void;
  onRotateLeft: (id: string) => void;
  onRotateRight: (id: string) => void;
  onRemove: (id: string) => void;
}

export const PdfPagePreviewModal: React.FC<PdfPagePreviewModalProps> = ({
  page,
  pages,
  isOpen,
  onClose,
  onSelectPage,
  onRotateLeft,
  onRotateRight,
  onRemove
}) => {
  useEffect(() => {
    if (!isOpen || !page) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, page, pages]);

  if (!isOpen || !page) return null;

  const activePages = pages.filter((p) => !p.removed);
  const currentIndex = activePages.findIndex((p) => p.id === page.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activePages.length - 1;

  const goToPrev = () => {
    if (hasPrev) {
      onSelectPage(activePages[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      onSelectPage(activePages[currentIndex + 1]);
    }
  };

  return (
    <div
      id="pdf-page-preview-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="pdf-page-preview-card"
        className="relative bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              <ZoomIn className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Page Preview (पेज पूर्वावलोकन)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
                  Page {page.currentOrder} of {activePages.length}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  Original #{page.originalIndex + 1}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Large Preview Canvas / Image */}
        <div className="relative flex-1 bg-slate-900/95 p-4 sm:p-6 flex items-center justify-center overflow-auto min-h-[350px] sm:min-h-[460px]">
          {/* Navigation Overlay Buttons */}
          {hasPrev && (
            <button
              type="button"
              onClick={goToPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Previous Page (ArrowLeft)"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {hasNext && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Next Page (ArrowRight)"
              aria-label="Next Page"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Page Image with CSS Rotation */}
          <div
            className="transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
            style={{
              transform: `rotate(${page.rotation}deg)`
            }}
          >
            {page.thumbnailUrl ? (
              <img
                src={page.thumbnailUrl}
                alt={`Page ${page.currentOrder}`}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl bg-white select-none pointer-events-none"
              />
            ) : (
              <div className="text-white text-sm">Preview not available</div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRotateLeft(page.id)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Rotate Left 90°"
            >
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              <span>Rotate Left</span>
            </button>

            <button
              type="button"
              onClick={() => onRotateRight(page.id)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Rotate Right 90°"
            >
              <RotateCw className="w-4 h-4 text-indigo-600" />
              <span>Rotate Right</span>
            </button>

            {page.rotation !== 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                Current: {page.rotation}°
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRemove(page.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove This Page</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
