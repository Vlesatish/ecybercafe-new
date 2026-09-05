import React from 'react';
import { Layers, Plus, Trash2, Copy, Check, X, FileText } from 'lucide-react';
import { PrintPage } from '../../types/idStudio';

interface PageThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PrintPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
}

export const PageThumbnailModal: React.FC<PageThumbnailModalProps> = ({
  isOpen,
  onClose,
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Multi-Page Queue Manager ({pages.length} Pages)
              </h3>
              <p className="text-[11px] text-slate-400">
                Organize, duplicate, or delete print sheets before final export
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

        {/* Page Grid */}
        <div className="p-5 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 bg-slate-950">
          {pages.map((page, idx) => {
            const isActive = idx === activePageIndex;
            const filledCount = page.cards.filter(c => c.frontImage || c.backImage).length;

            return (
              <div
                key={page.id}
                onClick={() => {
                  onSelectPage(idx);
                  onClose();
                }}
                className={`group relative rounded-2xl border transition-all cursor-pointer flex flex-col overflow-hidden bg-slate-900 ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Mini A4 Sheet Representation */}
                <div className="aspect-[210/297] bg-white p-2 flex flex-col gap-1 overflow-hidden relative shadow-inner">
                  {page.cards.slice(0, 5).map((card, cIdx) => (
                    <div key={card.id || cIdx} className="flex gap-1 h-3.5">
                      <div className={`flex-1 rounded-2xs ${card.frontImage ? 'bg-blue-600' : 'bg-slate-200'}`} />
                      <div className={`flex-1 rounded-2xs ${card.backImage ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    </div>
                  ))}

                  {/* Active Badge */}
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white">Page {idx + 1}</span>
                    <p className="text-[10px] text-slate-400">{page.cards.length} cards ({filledCount} loaded)</p>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(idx);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded cursor-pointer"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded cursor-pointer"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}

          {/* Add New Page Card */}
          <button
            onClick={onAddPage}
            className="aspect-[210/297] rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500 bg-slate-900/40 hover:bg-blue-950/20 flex flex-col items-center justify-center gap-2 text-center p-4 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-200">Add Next Page</span>
            <span className="text-[10px] text-slate-400">Creates Page {pages.length + 1}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Active: <b className="text-white">Page {activePageIndex + 1}</b>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
          >
            Close Manager
          </button>
        </div>

      </div>
    </div>
  );
};
