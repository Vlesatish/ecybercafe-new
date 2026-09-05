import React from 'react';
import { PdfPageManagerWorkspace } from './pdfPageManager/PdfPageManagerWorkspace';

interface PdfPageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCompressor?: () => void;
  onNavigateToIDCard?: () => void;
  onNavigateToPassport?: () => void;
  onNavigateToCrop?: () => void;
}

export const PdfPageManagerModal: React.FC<PdfPageManagerModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCompressor,
  onNavigateToIDCard,
  onNavigateToPassport,
  onNavigateToCrop
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pdf-page-manager-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        id="pdf-page-manager-modal-card"
        className="w-full h-full max-w-7xl max-h-[96vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-50 flex flex-col animate-in zoom-in-95 duration-150"
      >
        <PdfPageManagerWorkspace
          onBackToHome={onClose}
          onNavigateToCompressor={onNavigateToCompressor}
          onNavigateToIDCard={onNavigateToIDCard}
          onNavigateToPassport={onNavigateToPassport}
          onNavigateToCrop={onNavigateToCrop}
          isModalMode={true}
        />
      </div>
    </div>
  );
};
