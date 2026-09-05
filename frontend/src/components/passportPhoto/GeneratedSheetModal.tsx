import React, { useEffect, useRef, useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Printer, Check, Sparkles } from 'lucide-react';
import { CustomerPhotoItem, PrintSheetSettings } from '../../lib/passportPhoto/types.js';
import {
  renderFullSheetCanvas,
  downloadSheetImage,
  downloadSheetPdf,
  printSheetDirectly
} from '../../lib/passportPhoto/exportEngine.js';
import { calculatePrintSheetLayout } from '../../lib/passportPhoto/printLayoutEngine.js';

interface GeneratedSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrintSheetSettings;
  queue: CustomerPhotoItem[];
}

export const GeneratedSheetModal: React.FC<GeneratedSheetModalProps> = ({
  isOpen,
  onClose,
  settings,
  queue
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const layout = calculatePrintSheetLayout(settings, queue);
  const paperAspect = layout.paperWidthMm / layout.paperHeightMm;

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setIsRendering(true);

    renderFullSheetCanvas(settings, queue)
      .then(sheetCanvas => {
        if (isCancelled || !canvasRef.current) return;
        const cvs = canvasRef.current;
        cvs.width = sheetCanvas.width;
        cvs.height = sheetCanvas.height;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.drawImage(sheetCanvas, 0, 0);
        }
      })
      .catch(err => {
        console.error('Failed to render sheet canvas:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsRendering(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, settings, queue]);

  if (!isOpen) return null;

  const handleDownloadJpg = async () => {
    try {
      await downloadSheetImage(settings, queue, 'jpg');
      triggerToast('A4 300 DPI sheet JPG downloaded successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadSheetPdf(settings, queue);
      triggerToast('Print-ready A4 PDF downloaded successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = async () => {
    try {
      await printSheetDirectly(settings, queue);
      triggerToast('Dispatched print job to browser.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      id="generated-sheet-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        id="generated-sheet-modal-card"
        className="relative bg-slate-900 text-white w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-900/90">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Generated Print Sheet
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Your sheet is ready for download
            </p>
          </div>

          <button
            type="button"
            id="close-generated-sheet-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {successMsg && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-900/80 border border-emerald-600/50 rounded-xl text-xs font-semibold text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body: Large Accurate Sheet Preview */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto flex items-center justify-center min-h-[360px] bg-slate-950/70">
          <div
            className="relative bg-white shadow-2xl rounded-xs border border-slate-700 overflow-hidden"
            style={{
              aspectRatio: `${paperAspect}`,
              maxWidth: '100%',
              maxHeight: '62vh'
            }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '62vh',
                aspectRatio: `${paperAspect}`,
                objectFit: 'contain'
              }}
            />

            {isRendering && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center text-xs font-semibold text-white">
                <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl shadow-lg border border-slate-700">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Rendering 300 DPI Sheet...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{settings.paperId.toUpperCase()}</span> ({layout.paperWidthMm} × {layout.paperHeightMm} mm • 300 DPI)
          </div>

          <div className="flex items-center gap-2">
            {/* JPG Button */}
            <button
              type="button"
              id="generated-modal-download-jpg"
              onClick={handleDownloadJpg}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              JPG
            </button>

            {/* PDF Button */}
            <button
              type="button"
              id="generated-modal-download-pdf"
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              PDF
            </button>

            {/* Print Button */}
            <button
              type="button"
              id="generated-modal-print-btn"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
