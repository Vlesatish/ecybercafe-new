import React from 'react';
import { X, Camera } from 'lucide-react';
import { PassportErrorBoundary } from './passportPhoto/PassportErrorBoundary.js';
import { PassportPhotoWorkspace } from './passportPhoto/PassportPhotoWorkspace.js';
import { clearSavedProject } from '../lib/passportPhoto/projectStorage.js';

interface PassportPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PassportPhotoModal: React.FC<PassportPhotoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClose = async () => {
    try {
      await clearSavedProject();
    } catch (err) {
      console.warn('Could not clear saved project on close:', err);
    }
    onClose();
  };

  return (
    <div
      id="passport-photo-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="passport-photo-modal-card"
        className="relative bg-slate-50 w-full max-w-7xl max-h-[96vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
      >
        {/* Modal Header */}
        <div
          id="passport-modal-header"
          className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 shrink-0 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  eCyberCafe Passport Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Free 100% Public Access
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  AI Background & 300 DPI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Biometric sizing, AI background cutout, apparel overlays, exam imprint, and print-ready multi-photo sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="passport-modal-close-btn"
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Passport Studio (Opens fresh on next visit)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with Error Boundary */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-100/60">
          <PassportErrorBoundary onReset={() => {}}>
            <PassportPhotoWorkspace onCloseModal={handleClose} />
          </PassportErrorBoundary>
        </div>
      </div>
    </div>
  );
};

