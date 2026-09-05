import React from 'react';
import { Loader2, X } from 'lucide-react';

interface ProcessingOverlayProps {
  isProcessing: boolean;
  message: string;
  subMessage?: string;
  onCancel?: () => void;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isProcessing,
  message,
  subMessage,
  onCancel
}) => {
  if (!isProcessing) return null;

  return (
    <div
      id="passport-processing-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-slate-100 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h4 className="text-base font-bold text-slate-800 mb-1">{message}</h4>
        {subMessage && (
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">{subMessage}</p>
        )}
        {onCancel && (
          <button
            id="passport-processing-cancel-btn"
            type="button"
            onClick={onCancel}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel Operation
          </button>
        )}
      </div>
    </div>
  );
};
