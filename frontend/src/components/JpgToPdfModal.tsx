import React from 'react';
import { JpgToPdfWorkspace } from './jpgToPdf/JpgToPdfWorkspace';

interface JpgToPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCompressor?: () => void;
  onNavigateToPdfPageManager?: () => void;
  onNavigateToPassport?: () => void;
  onNavigateToIDCard?: () => void;
}

export const JpgToPdfModal: React.FC<JpgToPdfModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCompressor,
  onNavigateToPdfPageManager,
  onNavigateToPassport,
  onNavigateToIDCard
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="jpg-to-pdf-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        id="jpg-to-pdf-modal-card"
        className="w-full h-full max-w-7xl max-h-[96vh] rounded-3xl overflow-y-auto shadow-2xl border border-slate-800 bg-slate-50 flex flex-col animate-in zoom-in-95 duration-150"
      >
        <JpgToPdfWorkspace
          onBackToHome={onClose}
          onNavigateToCompressor={onNavigateToCompressor}
          onNavigateToPdfPageManager={onNavigateToPdfPageManager}
          onNavigateToPassport={onNavigateToPassport}
          onNavigateToIDCard={onNavigateToIDCard}
        />
      </div>
    </div>
  );
};
