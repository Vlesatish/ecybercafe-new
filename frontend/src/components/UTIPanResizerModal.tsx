import React, { useState, useEffect, useRef } from 'react';
import { X, Crop, Image as ImageIcon, FileCheck, Download, Sparkles, RefreshCw, Upload, Sliders, CheckCircle2, RotateCw, Move, Check, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceRequest } from '../types';
import { injectDpiToJpeg, downloadDataUrl, PortalType } from '../utils/utiPanResizer';

interface UTIPanResizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: ServiceRequest | null;
  initialPhoto?: string | null;
  initialSig?: string | null;
}

export const UTIPanResizerModal: React.FC<UTIPanResizerModalProps> = ({
  isOpen,
  onClose,
  request,
  initialPhoto,
  initialSig
}) => {
  // Portal Target Preset: 'UTI' or 'NSDL' or 'CUSTOM'
  const [portalMode, setPortalMode] = useState<PortalType>('UTI');

  // Photo states
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [photoBrightness, setPhotoBrightness] = useState<number>(0);
  const [photoContrast, setPhotoContrast] = useState<number>(0);
  const [photoRotate, setPhotoRotate] = useState<number>(0);
  const [photoOffsetX, setPhotoOffsetX] = useState<number>(0);
  const [photoOffsetY, setPhotoOffsetY] = useState<number>(0);
  const [photoWidth, setPhotoWidth] = useState<number>(213);
  const [photoHeight, setPhotoHeight] = useState<number>(213);
  const [photoDpi, setPhotoDpi] = useState<number>(300);
  const [photoMinKb, setPhotoMinKb] = useState<number>(15);
  const [photoMaxKb, setPhotoMaxKb] = useState<number>(29);
  const [photoSizeKb, setPhotoSizeKb] = useState<number>(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // Signature states
  const [sigSrc, setSigSrc] = useState<string | null>(null);
  const [sigZoom, setSigZoom] = useState<number>(1);
  const [sigContrast, setSigContrast] = useState<number>(25);
  const [sigRotate, setSigRotate] = useState<number>(0);
  const [sigOffsetX, setSigOffsetX] = useState<number>(0);
  const [sigOffsetY, setSigOffsetY] = useState<number>(0);
  const [sigCleanBg, setSigCleanBg] = useState<boolean>(true);
  const [sigWidth, setSigWidth] = useState<number>(400); // 400x200
  const [sigHeight, setSigHeight] = useState<number>(200);
  const [sigDpi, setSigDpi] = useState<number>(600);
  const [sigMinKb, setSigMinKb] = useState<number>(20);
  const [sigMaxKb, setSigMaxKb] = useState<number>(58);
  const [sigSizeKb, setSigSizeKb] = useState<number>(0);
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);

  // Dragging states
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoDragStart = useRef<{ x: number; y: number; ox: number; oy: number }>({ x: 0, y: 0, ox: 0, oy: 0 });

  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const sigDragStart = useRef<{ x: number; y: number; ox: number; oy: number }>({ x: 0, y: 0, ox: 0, oy: 0 });

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [autoLoadedNotice, setAutoLoadedNotice] = useState<string>('');

  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update preset parameters when portalMode changes
  useEffect(() => {
    if (portalMode === 'UTI') {
      setPhotoWidth(213);
      setPhotoHeight(213);
      setPhotoDpi(300);
      setPhotoMinKb(15);
      setPhotoMaxKb(29);

      setSigWidth(400);
      setSigHeight(200);
      setSigDpi(600);
      setSigMinKb(20);
      setSigMaxKb(58);
    } else if (portalMode === 'NSDL') {
      setPhotoWidth(213);
      setPhotoHeight(213);
      setPhotoDpi(200);
      setPhotoMinKb(22);
      setPhotoMaxKb(48);

      setSigWidth(400);
      setSigHeight(200);
      setSigDpi(200);
      setSigMinKb(22);
      setSigMaxKb(48);
    }
  }, [portalMode]);

  // Extract uploaded attachments if request or initial props are provided
  useEffect(() => {
    if (isOpen) {
      if (initialPhoto) setPhotoSrc(initialPhoto);
      if (initialSig) setSigSrc(initialSig);

      if (request) {
        let foundPhoto: string | null = initialPhoto || null;
        let foundSig: string | null = initialSig || null;

        if (request.formData) {
          Object.entries(request.formData).forEach(([key, val]) => {
            if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
              const lowerKey = key.toLowerCase();
              if (!foundPhoto && (lowerKey.includes('photo') || lowerKey.includes('pic') || lowerKey.includes('passport') || lowerKey.includes('image'))) {
                foundPhoto = val;
              } else if (!foundSig && (lowerKey.includes('sign') || lowerKey.includes('thumb') || lowerKey.includes('sig'))) {
                foundSig = val;
              } else if (!foundPhoto) {
                foundPhoto = val;
              } else if (!foundSig) {
                foundSig = val;
              }
            }
          });
        }

        if (foundPhoto) setPhotoSrc(foundPhoto);
        if (foundSig) setSigSrc(foundSig);

        if (foundPhoto || foundSig) {
          setAutoLoadedNotice(`Auto-loaded uploaded attachments from Request #${request.requestNumber} (${request.serviceTitle})`);
        } else {
          setAutoLoadedNotice('');
        }
      }
    }
  }, [isOpen, request, initialPhoto, initialSig]);

  // Re-generate photo canvas whenever parameters change
  useEffect(() => {
    if (!photoSrc) {
      setPhotoDataUrl(null);
      setPhotoSizeKb(0);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = photoWidth;
      canvas.height = photoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, photoWidth, photoHeight);

      ctx.save();
      ctx.translate(photoWidth / 2, photoHeight / 2);
      ctx.rotate((photoRotate * Math.PI) / 180);

      ctx.filter = `brightness(${100 + photoBrightness}%) contrast(${100 + photoContrast}%)`;

      const scale = (Math.max(photoWidth / img.width, photoHeight / img.height)) * photoZoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = -drawW / 2 + photoOffsetX;
      const drawY = -drawH / 2 + photoOffsetY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      const minBytes = photoMinKb * 1024;
      const maxBytes = photoMaxKb * 1024;

      let quality = 0.96;
      let rawDataUrl = canvas.toDataURL('image/jpeg', quality);
      let dataUrl = injectDpiToJpeg(rawDataUrl, photoDpi, minBytes);
      let sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

      while (sizeBytes > maxBytes && quality > 0.1) {
        quality -= 0.04;
        rawDataUrl = canvas.toDataURL('image/jpeg', quality);
        dataUrl = injectDpiToJpeg(rawDataUrl, photoDpi, minBytes);
        sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
      }

      if (sizeBytes < minBytes) {
        dataUrl = injectDpiToJpeg(rawDataUrl, photoDpi, minBytes);
        sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
      }

      setPhotoDataUrl(dataUrl);
      setPhotoSizeKb(Math.round(sizeBytes / 1024));

      if (photoCanvasRef.current) {
        const pCtx = photoCanvasRef.current.getContext('2d');
        if (pCtx) {
          photoCanvasRef.current.width = photoWidth;
          photoCanvasRef.current.height = photoHeight;
          pCtx.drawImage(canvas, 0, 0);
        }
      }
    };
    img.src = photoSrc;
  }, [photoSrc, photoZoom, photoBrightness, photoContrast, photoRotate, photoOffsetX, photoOffsetY, photoWidth, photoHeight, photoDpi, photoMinKb, photoMaxKb]);

  // Re-generate signature canvas whenever parameters change
  useEffect(() => {
    if (!sigSrc) {
      setSigDataUrl(null);
      setSigSizeKb(0);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sigWidth;
      canvas.height = sigHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sigWidth, sigHeight);

      ctx.save();
      ctx.translate(sigWidth / 2, sigHeight / 2);
      ctx.rotate((sigRotate * Math.PI) / 180);

      const scale = Math.min(sigWidth / img.width, sigHeight / img.height) * sigZoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = -drawW / 2 + sigOffsetX;
      const drawY = -drawH / 2 + sigOffsetY;

      ctx.filter = `contrast(${100 + sigContrast}%) brightness(105%)`;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      if (sigCleanBg) {
        const imgData = ctx.getImageData(0, 0, sigWidth, sigHeight);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 160 && g > 160 && b > 160) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const minBytes = sigMinKb * 1024;
      const maxBytes = sigMaxKb * 1024;

      let quality = 0.96;
      let rawDataUrl = canvas.toDataURL('image/jpeg', quality);
      let dataUrl = injectDpiToJpeg(rawDataUrl, sigDpi, minBytes);
      let sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

      while (sizeBytes > maxBytes && quality > 0.1) {
        quality -= 0.04;
        rawDataUrl = canvas.toDataURL('image/jpeg', quality);
        dataUrl = injectDpiToJpeg(rawDataUrl, sigDpi, minBytes);
        sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
      }

      if (sizeBytes < minBytes) {
        dataUrl = injectDpiToJpeg(rawDataUrl, sigDpi, minBytes);
        sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
      }

      setSigDataUrl(dataUrl);
      setSigSizeKb(Math.round(sizeBytes / 1024));

      if (sigCanvasRef.current) {
        const sCtx = sigCanvasRef.current.getContext('2d');
        if (sCtx) {
          sigCanvasRef.current.width = sigWidth;
          sigCanvasRef.current.height = sigHeight;
          sCtx.drawImage(canvas, 0, 0);
        }
      }
    };
    img.src = sigSrc;
  }, [sigSrc, sigZoom, sigContrast, sigCleanBg, sigRotate, sigOffsetX, sigOffsetY, sigWidth, sigHeight, sigDpi, sigMinKb, sigMaxKb]);

  if (!isOpen) return null;

  // File Upload Handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotoSrc(ev.target.result as string);
          setPhotoOffsetX(0);
          setPhotoOffsetY(0);
          setPhotoRotate(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSigSrc(ev.target.result as string);
          setSigOffsetX(0);
          setSigOffsetY(0);
          setSigRotate(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag Handlers for Photo Canvas
  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPhoto(true);
    photoDragStart.current = { x: e.clientX, y: e.clientY, ox: photoOffsetX, oy: photoOffsetY };
  };

  const handlePhotoMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPhoto) return;
    const dx = e.clientX - photoDragStart.current.x;
    const dy = e.clientY - photoDragStart.current.y;
    setPhotoOffsetX(photoDragStart.current.ox + dx);
    setPhotoOffsetY(photoDragStart.current.oy + dy);
  };

  const handlePhotoMouseUp = () => {
    setIsDraggingPhoto(false);
  };

  // Drag Handlers for Sig Canvas
  const handleSigMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSig(true);
    sigDragStart.current = { x: e.clientX, y: e.clientY, ox: sigOffsetX, oy: sigOffsetY };
  };

  const handleSigMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSig) return;
    const dx = e.clientX - sigDragStart.current.x;
    const dy = e.clientY - sigDragStart.current.y;
    setSigOffsetX(sigDragStart.current.ox + dx);
    setSigOffsetY(sigDragStart.current.oy + dy);
  };

  const handleSigMouseUp = () => {
    setIsDraggingSig(false);
  };

  const handleDownloadPhoto = () => {
    if (!photoDataUrl) return;
    const reqNo = request ? `_Req${request.requestNumber}` : '';
    downloadDataUrl(photoDataUrl, `${portalMode}_Photo_${photoWidth}x${photoHeight}_${photoDpi}DPI${reqNo}.jpg`, photoDpi, photoMinKb * 1024);
  };

  const handleDownloadSig = () => {
    if (!sigDataUrl) return;
    const reqNo = request ? `_Req${request.requestNumber}` : '';
    downloadDataUrl(sigDataUrl, `${portalMode}_Signature_${sigWidth}x${sigHeight}_${sigDpi}DPI${reqNo}.jpg`, sigDpi, sigMinKb * 1024);
  };

  const handleDownloadBoth = () => {
    if (!photoDataUrl && !sigDataUrl) return;
    setIsProcessing(true);
    const reqNo = request ? `_Req${request.requestNumber}` : '';

    if (photoDataUrl) {
      downloadDataUrl(photoDataUrl, `${portalMode}_Photo_${photoWidth}x${photoHeight}_${photoDpi}DPI${reqNo}.jpg`, photoDpi, photoMinKb * 1024);
    }

    setTimeout(() => {
      if (sigDataUrl) {
        downloadDataUrl(sigDataUrl, `${portalMode}_Signature_${sigWidth}x${sigHeight}_${sigDpi}DPI${reqNo}.jpg`, sigDpi, sigMinKb * 1024);
      }
      setIsProcessing(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-slate-950 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <Crop className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                    PAN Card Photo & Signature Resizer Tool
                  </h2>
                  <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                    100% COMPLIANT
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  UTI PSA & NSDL / Protean Govt Portal Official Specs Resizer
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Portal Selector Tabs */}
          <div className="px-4 md:px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Target Govt Portal:</span>
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setPortalMode('UTI')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${portalMode === 'UTI' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  🏛️ UTI PSA Portal (300/600 DPI)
                </button>
                <button
                  type="button"
                  onClick={() => setPortalMode('NSDL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${portalMode === 'NSDL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  🏢 NSDL / Protean Portal (200 DPI)
                </button>
                <button
                  type="button"
                  onClick={() => setPortalMode('CUSTOM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${portalMode === 'CUSTOM' ? 'bg-slate-700 text-amber-300 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  ⚙️ Custom Specs
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Exact DPI & KB Padding Enabled</span>
            </div>
          </div>

          {autoLoadedNotice && (
            <div className="px-6 py-2 bg-indigo-950/80 border-b border-indigo-800/50 text-indigo-200 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>{autoLoadedNotice}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 md:p-6 space-y-6 max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SECTION 1: PHOTO RESIZER */}
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <h3 className="font-extrabold text-white text-sm">1. Photo Output Specs</h3>
                    </div>
                    <span className="text-[11px] font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {photoWidth}×{photoHeight} px • {photoDpi} DPI • {photoMinKb}–{photoMaxKb} KB
                    </span>
                  </div>

                  {/* Photo Preview Canvas */}
                  <div className="mt-4 flex flex-col items-center">
                    <div 
                      className={`relative w-[213px] h-[213px] rounded-xl border-2 overflow-hidden bg-slate-800 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing ${isDraggingPhoto ? 'border-amber-400' : 'border-slate-700'}`}
                      onMouseDown={handlePhotoMouseDown}
                      onMouseMove={handlePhotoMouseMove}
                      onMouseUp={handlePhotoMouseUp}
                      onMouseLeave={handlePhotoMouseUp}
                    >
                      {photoSrc ? (
                        <>
                          <canvas ref={photoCanvasRef} className="w-[213px] h-[213px] pointer-events-none" />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900/90 backdrop-blur-xs rounded text-[10px] font-mono text-amber-300 border border-amber-500/40 font-bold">
                            {photoSizeKb} KB ({photoDpi} DPI)
                          </div>
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs rounded text-[9px] font-mono text-slate-300 flex items-center gap-1 border border-slate-700">
                            <Move className="w-2.5 h-2.5 text-amber-400" />
                            <span>Drag to pan</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-400">No Photo Selected</p>
                          <p className="text-[10px] text-slate-500 mt-1">Upload applicant passport photo</p>
                        </div>
                      )}
                    </div>

                    <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs rounded-xl border border-slate-700 cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{photoSrc ? 'Change Photo' : 'Upload Passport Photo'}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>

                  {/* Photo Controls */}
                  {photoSrc && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-slate-800">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                          <span>Zoom / Crop Level</span>
                          <span className="text-amber-400">{Math.round(photoZoom * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={photoZoom}
                          onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                            <span>Brightness</span>
                            <span>{photoBrightness}</span>
                          </div>
                          <input
                            type="range"
                            min="-40"
                            max="40"
                            step="1"
                            value={photoBrightness}
                            onChange={(e) => setPhotoBrightness(parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                            <span>Contrast</span>
                            <span>{photoContrast}</span>
                          </div>
                          <input
                            type="range"
                            min="-30"
                            max="50"
                            step="1"
                            value={photoContrast}
                            onChange={(e) => setPhotoContrast(parseInt(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {portalMode === 'CUSTOM' && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">DPI</label>
                            <select
                              value={photoDpi}
                              onChange={(e) => setPhotoDpi(parseInt(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs font-bold"
                            >
                              <option value={200}>200 DPI</option>
                              <option value={300}>300 DPI</option>
                              <option value={600}>600 DPI</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Min KB</label>
                            <input
                              type="number"
                              value={photoMinKb}
                              onChange={(e) => setPhotoMinKb(parseInt(e.target.value) || 10)}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Max KB</label>
                            <input
                              type="number"
                              value={photoMaxKb}
                              onChange={(e) => setPhotoMaxKb(parseInt(e.target.value) || 30)}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setPhotoRotate((prev) => (prev + 90) % 360)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Rotate ({photoRotate}°)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPhotoZoom(1);
                            setPhotoBrightness(0);
                            setPhotoContrast(0);
                            setPhotoRotate(0);
                            setPhotoOffsetX(0);
                            setPhotoOffsetY(0);
                          }}
                          className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Reset Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={!photoDataUrl}
                    onClick={handleDownloadPhoto}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Download Photo ({photoWidth}×{photoHeight} • {photoDpi}DPI • {photoSizeKb}KB)</span>
                  </button>
                </div>
              </div>


              {/* SECTION 2: SIGNATURE RESIZER */}
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Crop className="w-4 h-4 text-indigo-400" />
                      <h3 className="font-extrabold text-white text-sm">2. Signature Output Specs</h3>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {sigWidth}×{sigHeight} px • {sigDpi} DPI • {sigMinKb}–{sigMaxKb} KB
                    </span>
                  </div>

                  {/* Dimension selector pills */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSigWidth(400);
                        setSigHeight(200);
                        if (portalMode === 'UTI') setSigDpi(600);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${sigWidth === 400 ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                    >
                      400×200 px ({sigDpi} DPI)
                    </button>
                    {portalMode === 'UTI' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSigWidth(1023);
                          setSigHeight(360);
                          setSigDpi(300);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${sigWidth === 1023 ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                      >
                        1023×360 px (300 DPI)
                      </button>
                    )}
                  </div>

                  {/* Signature Preview Canvas */}
                  <div className="mt-3 flex flex-col items-center">
                    <div 
                      className={`relative w-full h-[140px] rounded-xl border-2 overflow-hidden bg-white shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing ${isDraggingSig ? 'border-indigo-500' : 'border-slate-700'}`}
                      onMouseDown={handleSigMouseDown}
                      onMouseMove={handleSigMouseMove}
                      onMouseUp={handleSigMouseUp}
                      onMouseLeave={handleSigMouseUp}
                    >
                      {sigSrc ? (
                        <>
                          <canvas ref={sigCanvasRef} className="max-w-full max-h-full object-contain pointer-events-none" />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900/90 backdrop-blur-xs rounded text-[10px] font-mono text-indigo-300 border border-indigo-500/40 font-bold">
                            {sigSizeKb} KB ({sigDpi} DPI)
                          </div>
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs rounded text-[9px] font-mono text-slate-800 flex items-center gap-1 border border-slate-300">
                            <Move className="w-2.5 h-2.5 text-indigo-600" />
                            <span>Drag to pan</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <Crop className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600">No Signature Selected</p>
                          <p className="text-[10px] text-slate-500 mt-1">Upload applicant signature / thumb image</p>
                        </div>
                      )}
                    </div>

                    <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-extrabold text-xs rounded-xl border border-slate-700 cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{sigSrc ? 'Change Signature' : 'Upload Signature'}</span>
                      <input type="file" accept="image/*" onChange={handleSigUpload} className="hidden" />
                    </label>
                  </div>

                  {/* Signature Controls */}
                  {sigSrc && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-slate-800">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                          <span>Zoom Level</span>
                          <span className="text-indigo-400">{Math.round(sigZoom * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={sigZoom}
                          onChange={(e) => setSigZoom(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Enhance Ink Sharpness & Contrast</span>
                          <span>+{sigContrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          step="2"
                          value={sigContrast}
                          onChange={(e) => setSigContrast(parseInt(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {portalMode === 'CUSTOM' && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">DPI</label>
                            <select
                              value={sigDpi}
                              onChange={(e) => setSigDpi(parseInt(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs font-bold"
                            >
                              <option value={200}>200 DPI</option>
                              <option value={300}>300 DPI</option>
                              <option value={600}>600 DPI</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Min KB</label>
                            <input
                              type="number"
                              value={sigMinKb}
                              onChange={(e) => setSigMinKb(parseInt(e.target.value) || 10)}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block font-bold">Max KB</label>
                            <input
                              type="number"
                              value={sigMaxKb}
                              onChange={(e) => setSigMaxKb(parseInt(e.target.value) || 60)}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                          <input
                            type="checkbox"
                            checked={sigCleanBg}
                            onChange={(e) => setSigCleanBg(e.target.checked)}
                            className="rounded accent-indigo-600 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Auto-Clean Paper to Pure White</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setSigRotate((prev) => (prev + 90) % 360)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3 text-indigo-400" />
                          <span>Rotate ({sigRotate}°)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={!sigDataUrl}
                    onClick={handleDownloadSig}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer border border-indigo-400/30"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Download Signature ({sigWidth}×{sigHeight} • {sigDpi}DPI • {sigSizeKb}KB)</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Spec Info Banner */}
            <div className="p-4 bg-amber-950/30 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-200/90">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold text-amber-300">
                  Official Government PAN Portal Upload Guidelines ({portalMode} Mode):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-200/80">
                  <p>• <strong>Photo Specs:</strong> {photoWidth}×{photoHeight} px, {photoDpi} DPI, JPEG format, size strictly between {photoMinKb} KB and {photoMaxKb} KB.</p>
                  <p>• <strong>Signature Specs:</strong> {sigWidth}×{sigHeight} px, {sigDpi} DPI, JPEG format, size strictly between {sigMinKb} KB and {sigMaxKb} KB on clean white background.</p>
                  <p className="sm:col-span-2 text-[10px] text-emerald-300 font-mono">
                    ✓ Automatic APP0 JFIF DPI Header Injection & Safe KB Padding are active to prevent portal upload rejections ("size sahi kare" error).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 bg-slate-950 border-t border-slate-800 gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Compliant with {portalMode} PAN Portal Validations</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={!photoDataUrl && !sigDataUrl}
                onClick={handleDownloadBoth}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer border border-amber-300 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isProcessing ? 'Downloading...' : 'Download Both Resized Files'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

