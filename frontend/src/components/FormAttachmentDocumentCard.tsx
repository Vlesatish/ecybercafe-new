import React from 'react';
import { FileText, Eye, ExternalLink, Download } from 'lucide-react';

interface FormAttachmentDocumentCardProps {
  fieldLabel: string;
  fileUrl: string;
  onPreview: (url: string, label: string) => void;
  fileName?: string;
}

export const FormAttachmentDocumentCard: React.FC<FormAttachmentDocumentCardProps> = ({
  fieldLabel,
  fileUrl,
  onPreview,
  fileName
}) => {
  const cleanFileName = fileName || fileUrl.split('/').pop()?.split('?')[0] || 'document.pdf';
  const isPdf = Boolean(
    fileUrl.toLowerCase().includes('.pdf') || 
    fileUrl.startsWith('data:application/pdf') || 
    !fileUrl.match(/\.(png|jpe?g|webp|gif|svg)$/i)
  );

  return (
    <div className="p-2.5 bg-white border border-indigo-200/90 rounded-xl space-y-2 shadow-2xs hover:border-indigo-400 transition-all min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider truncate block" title={fieldLabel}>
          {fieldLabel}
        </span>
        <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/70 shrink-0">
          {isPdf ? '📄 PDF DOC' : '📎 ATTACHMENT'}
        </span>
      </div>

      {/* File info banner */}
      <div 
        onClick={() => onPreview(fileUrl, fieldLabel)}
        className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-lg cursor-pointer transition-colors group"
      >
        <div className="p-1.5 bg-red-100/90 text-red-600 rounded-md shrink-0 group-hover:scale-105 transition-transform">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-mono text-slate-800 font-bold truncate block group-hover:text-indigo-600 transition-colors">
            {cleanFileName}
          </span>
          <span className="text-[9px] text-slate-400 block">
            Click to preview document
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => onPreview(fileUrl, fieldLabel)}
          className="flex-1 min-w-[95px] px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-[10px] rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
          title="Preview PDF in full lightbox viewer"
        >
          <Eye className="w-3 h-3 shrink-0" />
          <span>Preview PDF</span>
        </button>

        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[85px] px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 font-extrabold text-[10px] rounded-lg border border-slate-300 hover:border-indigo-300 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
          title="Open directly in a new browser tab (नई टैब में खोलें)"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span>New Tab</span>
        </a>

        <a
          href={fileUrl}
          download={cleanFileName}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center justify-center transition-colors shadow-2xs"
          title="Download original file (डाउनलोड)"
        >
          <Download className="w-3 h-3 shrink-0" />
        </a>
      </div>
    </div>
  );
};
