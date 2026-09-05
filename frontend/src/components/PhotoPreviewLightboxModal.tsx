import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, FileText, Image as ImageIcon, Eye, ExternalLink } from 'lucide-react';

interface PhotoPreviewLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  filename?: string;
  filesize?: string;
}

export const PhotoPreviewLightboxModal: React.FC<PhotoPreviewLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Photo / Document Preview',
  filename,
  filesize
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !imageUrl) return null;

  const isPdf = Boolean(
    (typeof filename === 'string' && filename.toLowerCase().endsWith('.pdf')) ||
    (typeof imageUrl === 'string' && (
      imageUrl.toLowerCase().endsWith('.pdf') ||
      imageUrl.toLowerCase().includes('.pdf?') ||
      imageUrl.startsWith('data:application/pdf') ||
      imageUrl.startsWith('/uploads/') ||
      !imageUrl.match(/\.(png|jpe?g|webp|gif|svg)$/i)
    ))
  );

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename || 'document_file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="w-full max-w-5xl bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-white shadow-2xl shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
            {isPdf ? <FileText className="w-5 h-5 text-red-400" /> : <ImageIcon className="w-5 h-5 text-amber-400" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
              {title}
            </h3>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-2">
              <span className="text-indigo-300 font-mono font-bold">{filename || (isPdf ? 'PDF Document' : 'Attached Photo')}</span>
              {filesize && <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold">{filesize}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer transition-colors border border-slate-700"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer transition-colors border border-slate-700"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer transition-colors border border-slate-700"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset View"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors border border-slate-700 hidden sm:inline-block"
              >
                100%
              </button>
            </>
          )}

          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open directly in a new tab (नई टैब में खोलें)"
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">New Tab</span>
          </a>

          <button
            type="button"
            onClick={handleDownload}
            title="Download Original File"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer transition-colors border border-slate-700"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Preview (Esc)"
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer transition-colors shadow-xs ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image / Document Canvas */}
      <div
        className="flex-1 w-full max-w-5xl flex items-center justify-center p-2 sm:p-4 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf ? (
          <div className="w-full h-full max-h-[82vh] bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
            {/* Header info bar */}
            <div className="bg-slate-800/95 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-400" />
                <span className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md">{filename || 'PDF Document'}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full PDF in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            {/* Embedded PDF iframe */}
            <div className="flex-1 w-full bg-slate-950 min-h-[400px]">
              <iframe
                src={`${imageUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full min-h-[450px] border-0"
                title={filename || 'PDF Preview'}
              />
            </div>
          </div>
        ) : (
          <div className="relative max-w-full max-h-[78vh] flex items-center justify-center overflow-auto p-2">
            <img
              src={imageUrl}
              alt={filename || 'Photo Preview'}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-slate-700/60 select-none"
            />
          </div>
        )}
      </div>

      {/* Bottom status indicator */}
      <div
        className="text-center py-1.5 px-4 bg-slate-900/80 border border-slate-700/60 rounded-full text-xs font-semibold text-slate-300 shadow-md shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span>💡 Preview Mode • Click Outside or </span>
        <button
          type="button"
          onClick={onClose}
          className="text-rose-400 hover:underline font-bold ml-1 cursor-pointer"
        >
          Close (बंद करें)
        </button>
      </div>
    </div>
  );
};
