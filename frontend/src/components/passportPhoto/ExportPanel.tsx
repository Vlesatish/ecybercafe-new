import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';
import { CustomerPhotoItem, PrintSheetSettings } from '../../lib/passportPhoto/types.js';
import {
  downloadSinglePhoto,
  downloadSheetImage,
  downloadSheetPdf,
  printSheetDirectly
} from '../../lib/passportPhoto/exportEngine.js';

interface ExportPanelProps {
  activeItem: CustomerPhotoItem | null;
  queue: CustomerPhotoItem[];
  sheetSettings: PrintSheetSettings;
  onSetProcessing: (isProcessing: boolean, message: string) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  activeItem,
  queue,
  sheetSettings,
  onSetProcessing
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleDownloadSingleJpg = async () => {
    if (!activeItem) return;
    try {
      onSetProcessing(true, 'Rendering 300 DPI Photo...');
      await downloadSinglePhoto(activeItem, 'jpg', false);
      triggerFeedback('Single photo downloaded in HD 300 DPI JPG format.');
    } catch (err) {
      console.error(err);
    } finally {
      onSetProcessing(false, '');
    }
  };

  const handleDownloadSinglePng = async (transparent = false) => {
    if (!activeItem) return;
    try {
      onSetProcessing(true, 'Exporting PNG...');
      await downloadSinglePhoto(activeItem, 'png', transparent);
      triggerFeedback(`Single photo downloaded as ${transparent ? 'Transparent ' : ''}PNG.`);
    } catch (err) {
      console.error(err);
    } finally {
      onSetProcessing(false, '');
    }
  };

  const handleDownloadSheetPdf = async () => {
    try {
      onSetProcessing(true, 'Generating Print-Ready PDF...');
      await downloadSheetPdf(sheetSettings, queue);
      triggerFeedback('Print-ready PDF with exact physical dimensions created.');
    } catch (err) {
      console.error(err);
    } finally {
      onSetProcessing(false, '');
    }
  };

  const handleDownloadSheetJpg = async () => {
    try {
      onSetProcessing(true, 'Rendering 300 DPI Print Sheet...');
      await downloadSheetImage(sheetSettings, queue, 'jpg');
      triggerFeedback('High-resolution print sheet image downloaded.');
    } catch (err) {
      console.error(err);
    } finally {
      onSetProcessing(false, '');
    }
  };

  const handleDirectPrint = async () => {
    try {
      onSetProcessing(true, 'Preparing Direct Print...');
      await printSheetDirectly(sheetSettings, queue);
      triggerFeedback('Print dialog dispatched to connected printer.');
    } catch (err) {
      console.error(err);
    } finally {
      onSetProcessing(false, '');
    }
  };

  return (
    <div id="export-panel" className="space-y-4">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Print Actions Card */}
      <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg space-y-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300">
            Print Ready Output
          </span>
          <h3 className="text-base font-bold text-white mt-0.5">
            Print Sheet ({sheetSettings.paperId.toUpperCase()} • 300 DPI)
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Generated with exact physical millimetre measurements, edge-to-edge layout, and precision cutting marks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Direct Print */}
          <button
            id="passport-direct-print-btn"
            type="button"
            onClick={handleDirectPrint}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Directly
          </button>

          {/* Download PDF */}
          <button
            id="passport-download-pdf-btn"
            type="button"
            onClick={handleDownloadSheetPdf}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            Download PDF
          </button>

          {/* Download Sheet Image */}
          <button
            id="passport-download-sheet-img-btn"
            type="button"
            onClick={handleDownloadSheetJpg}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            Sheet Image (JPG)
          </button>
        </div>
      </div>

      {/* Single Photo Downloads Card */}
      {activeItem && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900">
              Export Single Photo: {activeItem.name}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              300 DPI Studio Quality
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              id="download-single-jpg"
              type="button"
              onClick={handleDownloadSingleJpg}
              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Single JPG
            </button>

            <button
              id="download-single-png"
              type="button"
              onClick={() => handleDownloadSinglePng(false)}
              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Single PNG
            </button>

            {activeItem.transparentForegroundUrl && (
              <button
                id="download-single-transparent-png"
                type="button"
                onClick={() => handleDownloadSinglePng(true)}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Transparent Cutout
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
