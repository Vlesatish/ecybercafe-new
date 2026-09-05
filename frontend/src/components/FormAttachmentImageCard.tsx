import React, { useState } from 'react';
import { Eye, Crop, Download, Sparkles, Sliders, ExternalLink } from 'lucide-react';
import { resizeToUtiPhoto, resizeToUtiSignature, downloadDataUrl } from '../utils/utiPanResizer';

interface FormAttachmentImageCardProps {
  fieldLabel: string;
  imgUrl: string;
  requestNumber?: string | number;
  onRequestOpenResizer?: (imgUrl: string) => void;
  onZoom: (imgUrl: string) => void;
}

export const FormAttachmentImageCard: React.FC<FormAttachmentImageCardProps> = ({
  fieldLabel,
  imgUrl,
  requestNumber = '0000',
  onRequestOpenResizer,
  onZoom
}) => {
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isProcessingSig, setIsProcessingSig] = useState(false);

  const handleDownloadPhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsProcessingPhoto(true);
      const res = await resizeToUtiPhoto(imgUrl);
      downloadDataUrl(res.dataUrl, `UTI_Photo_213x213_Req${requestNumber}.jpg`);
    } catch (err) {
      console.error('Failed to resize photo:', err);
      alert('Could not resize photo automatically. Opening editor...');
      if (onRequestOpenResizer) onRequestOpenResizer(imgUrl);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleDownloadSig = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsProcessingSig(true);
      const res = await resizeToUtiSignature(imgUrl, 1, 25, true, 400, 200);
      downloadDataUrl(res.dataUrl, `UTI_Signature_400x200_600DPI_Req${requestNumber}.jpg`);
    } catch (err) {
      console.error('Failed to resize signature:', err);
      alert('Could not resize signature automatically. Opening editor...');
      if (onRequestOpenResizer) onRequestOpenResizer(imgUrl);
    } finally {
      setIsProcessingSig(false);
    }
  };

  return (
    <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider truncate" title={fieldLabel}>
          {fieldLabel}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
            IMAGE
          </span>
          <a
            href={imgUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Open image in new tab (नई टैब में खोलें)"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Thumbnail */}
      <div 
        onClick={() => onZoom(imgUrl)}
        className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer aspect-video flex items-center justify-center"
      >
        <img src={imgUrl} alt={fieldLabel} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
          <Eye className="w-4 h-4" />
          <span>Zoom Original</span>
        </div>
      </div>

      {/* Quick Download & Resizer Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={handleDownloadPhoto}
          disabled={isProcessingPhoto}
          className="flex-1 min-w-[110px] px-2 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all border border-amber-300 shadow-xs cursor-pointer"
          title="Instantly convert & download as UTI Photo (213x213 px <= 30KB)"
        >
          <Crop className="w-3 h-3 text-slate-950 shrink-0" />
          <span>{isProcessingPhoto ? 'Resizing...' : '⚡ UTI Photo (213x213)'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadSig}
          disabled={isProcessingSig}
          className="flex-1 min-w-[110px] px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all border border-indigo-400 shadow-xs cursor-pointer"
          title="Instantly convert & download as UTI Signature (400x200 px <= 60KB)"
        >
          <Crop className="w-3 h-3 text-white shrink-0" />
          <span>{isProcessingSig ? 'Resizing...' : '⚡ UTI Sig (400x200)'}</span>
        </button>

        {onRequestOpenResizer && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestOpenResizer(imgUrl);
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-700"
            title="Open in UTI PAN Resizer Tool for manual zoom/crop/brightness adjustment"
          >
            <Sliders className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Adjust</span>
          </button>
        )}
      </div>
    </div>
  );
};
