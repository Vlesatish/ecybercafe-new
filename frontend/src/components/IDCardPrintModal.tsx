import React from 'react';
import { ECyberCafeIDCardStudio } from './ECyberCafeIDCardStudio';

interface IDCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IDCardPrintModal: React.FC<IDCardPrintModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="w-full h-full max-w-[1400px] max-h-[96vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <ECyberCafeIDCardStudio onBackToHome={onClose} isModalMode={true} />
      </div>
    </div>
  );
};
