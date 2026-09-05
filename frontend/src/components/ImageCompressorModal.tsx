import React, { useState } from 'react';
import { FileUp, Zap, CheckCircle2, Download, RefreshCw, X, FileCheck, ArrowRight, Image as ImageIcon, Sliders, FileText, Crop } from 'lucide-react';
import { compressImageFile, CompressionResult, formatBytes } from '../utils/imageCompressor';
import { compressPdfFile, renderPdfFirstPageAsImageFile } from '../utils/pdfCompressor';
import { uploadFileToServer } from '../utils/upload';
import { ImageCropModal } from './ImageCropModal';

interface ImageCompressorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  onApplyCompressedFile?: (compressedFile: File, uploadResult?: { url: string; filename: string; size: string }) => void;
  maxSizeLimitMb?: number;
}

type UnifiedCompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  dataUrl?: string;
  isPdf: boolean;
  pageCount?: number;
};

export const ImageCompressorModal: React.FC<ImageCompressorModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  onApplyCompressedFile,
  maxSizeLimitMb = 2
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [qualityPreset, setQualityPreset] = useState<'standard' | 'high' | 'max_compress'>('standard');

  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionResult, setCompressionResult] = useState<UnifiedCompressionResult | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [cropModalOpen, setCropModalOpen] = useState<boolean>(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState<boolean>(false);

  const isPdfFile = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImageFile = (file: File) => file.type.startsWith('image/');

  const openFileInEditor = async (file: File) => {
    if (isImageFile(file)) {
      setSelectedFile(file);
      setCropModalOpen(true);
      return;
    }
    setIsPreparingPdf(true);
    setErrorMsg('PDF का पहला पेज फोटो में बदल रहा है...');
    try {
      const pageImage = await renderPdfFirstPageAsImageFile(file);
      setSelectedFile(pageImage);
      setCompressionResult(null);
      setErrorMsg('');
      setCropModalOpen(true);
    } catch (error: any) {
      setSelectedFile(file);
      setErrorMsg(error?.message || 'PDF page editor में नहीं खुल सका।');
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleApplyCroppedFileInModal = (croppedFile: File) => {
    setSelectedFile(croppedFile);
    setCompressionResult(null);
    setErrorMsg('');
  };

  // Sync initial file if updated
  React.useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      setCompressionResult(null);
      setErrorMsg('');
    }
  }, [initialFile]);

  React.useEffect(() => {
    if (isOpen && selectedFile && isPdfFile(selectedFile) && !isPreparingPdf) {
      void openFileInEditor(selectedFile);
    }
    // Only re-check when the modal is opened; selected files are handled directly below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isImageFile(file) && !isPdfFile(file)) {
        setErrorMsg('Invalid file format. Please select an Image (JPG, PNG, WEBP) or PDF file (.pdf).');
        return;
      }
      setCompressionResult(null);
      setErrorMsg('');
      await openFileInEditor(file);
    }
  };

  const handleCompress = async () => {
    if (!selectedFile) return;

    setIsCompressing(true);
    setErrorMsg('');

    try {
      if (isPdfFile(selectedFile)) {
        // Compress PDF file using PDF.js & pdf-lib
        const pdfRes = await compressPdfFile(selectedFile, { qualityPreset });
        setCompressionResult({
          file: pdfRes.file,
          originalSize: pdfRes.originalSize,
          compressedSize: pdfRes.compressedSize,
          savedPercentage: pdfRes.savedPercentage,
          originalSizeFormatted: pdfRes.originalSizeFormatted,
          compressedSizeFormatted: pdfRes.compressedSizeFormatted,
          isPdf: true,
          pageCount: pdfRes.pageCount
        });
      } else {
        // Compress Image file using Canvas
        let q = 0.70;
        let dim = 1400;

        if (qualityPreset === 'high') {
          q = 0.85;
          dim = 1800;
        } else if (qualityPreset === 'max_compress') {
          q = 0.55;
          dim = 1000;
        }

        const imgRes = await compressImageFile(selectedFile, {
          maxWidth: dim,
          maxHeight: dim,
          quality: q,
          mimeType: 'image/jpeg'
        });

        setCompressionResult({
          file: imgRes.file,
          originalSize: imgRes.originalSize,
          compressedSize: imgRes.compressedSize,
          savedPercentage: imgRes.savedPercentage,
          originalSizeFormatted: imgRes.originalSizeFormatted,
          compressedSizeFormatted: imgRes.compressedSizeFormatted,
          dataUrl: imgRes.dataUrl,
          isPdf: false
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Compression failed. Please check the file and try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleApplyAndUpload = async () => {
    if (!compressionResult) return;

    setIsUploading(true);
    try {
      // Upload compressed file to server
      const uploaded = await uploadFileToServer(compressionResult.file, maxSizeLimitMb);
      if (onApplyCompressedFile) {
        onApplyCompressedFile(compressionResult.file, uploaded);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(`Upload Error: ${err.message || 'Server error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadOnly = () => {
    if (!compressionResult) return;

    if (compressionResult.dataUrl && !compressionResult.isPdf) {
      const a = document.createElement('a');
      a.href = compressionResult.dataUrl;
      a.download = compressionResult.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const url = URL.createObjectURL(compressionResult.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = compressionResult.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>Photo Crop, Resize & Compressor</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase">
                  साइज कम करें
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Crop, exact Width × Height, JPG/PNG/WEBP, quality, KB limit aur extra Stretch mode.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-xs text-rose-200 font-semibold flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: File Selection */}
          {!selectedFile ? (
            <label className="border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950/40 hover:bg-slate-800/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
              <div className="w-14 h-14 rounded-full bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors mb-3">
                <FileUp className="w-7 h-7" />
              </div>
              <span className="font-black text-sm text-white">
                Select Photo or PDF to Crop / Resize / Stretch
              </span>
              <span className="text-xs text-slate-400 mt-1">
                PDF का पहला पेज या JPG/PNG/WEBP editor में अपने आप खुलेगा
              </span>
              <span className="text-[10px] text-amber-400 font-bold mt-2 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full">
                ⚡ Scanned PDF / Photo Document (5MB+) ko ~200KB me badlein
              </span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-4">

              {/* Selected File Card */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${
                    isPdfFile(selectedFile)
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-amber-400'
                  }`}>
                    {isPdfFile(selectedFile) ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-sm text-white truncate flex items-center gap-2">
                      <span>{selectedFile.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase border ${
                        isPdfFile(selectedFile) ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {isPdfFile(selectedFile) ? 'PDF DOC' : 'IMAGE'}
                      </span>
                    </p>
                    <p className="text-xs text-amber-400 font-mono font-semibold">
                      Original Size: {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isPdfFile(selectedFile) && (
                    <button
                      type="button"
                      onClick={() => setCropModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-amber-500/30 flex items-center gap-1"
                    >
                      <Crop className="w-3.5 h-3.5 text-amber-400" />
                      <span>Crop / Resize / Stretch</span>
                    </button>
                  )}
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0">
                    Change File
                    <input type="file" accept="image/*,.pdf,application/pdf" onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Preset Selector */}
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-3">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Select Compression Strength / साइज़ कितना कम करना है:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQualityPreset('standard')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      qualityPreset === 'standard'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-black text-xs text-amber-300 flex items-center justify-between">
                      <span>⚡ Standard (Recommended)</span>
                      {qualityPreset === 'standard' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Best clarity, ~75% size reduction (Ideal for Govt forms)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQualityPreset('max_compress')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      qualityPreset === 'max_compress'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-black text-xs text-amber-300 flex items-center justify-between">
                      <span>🔥 Maximum Small (&lt;200KB)</span>
                      {qualityPreset === 'max_compress' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Max space saving, ~90% reduction (For strict 100-200KB limit)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQualityPreset('high')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      qualityPreset === 'high'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-black text-xs text-amber-300 flex items-center justify-between">
                      <span>✨ High Quality HD</span>
                      {qualityPreset === 'high' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ultra sharp clarity, ~50% reduction
                    </p>
                  </button>
                </div>

                {/* Compress Trigger Button */}
                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={isCompressing}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isCompressing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>
                        {isPdfFile(selectedFile)
                          ? 'Compressing PDF document pages... (PDF कंप्रेस हो रहा है...)'
                          : 'Compressing Photo... (फोटो का साइज़ कम हो रहा है...)'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>
                        {isPdfFile(selectedFile) ? 'COMPRESS PDF NOW (PDF कंप्रेस करें)' : 'COMPRESS IMAGE NOW (साइज़ कम करें)'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Compression Result Section */}
              {compressionResult && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-400" />
                      <span className="font-black text-xs text-emerald-300">
                        SUCCESSFULLY COMPRESSED! (सफलतापूर्वक कंप्रेस हो गया)
                      </span>
                    </div>
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Saved {compressionResult.savedPercentage}% Space 🚀
                    </span>
                  </div>

                  {/* Before vs After stats */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Original Size (पहला साइज़)</p>
                      <p className="text-sm font-black text-rose-400 font-mono mt-0.5">
                        {compressionResult.originalSizeFormatted}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-900/40 rounded-xl border border-emerald-500/50">
                      <p className="text-[10px] text-emerald-300 uppercase font-bold">New Compressed Size (नया साइज़)</p>
                      <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                        {compressionResult.compressedSizeFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Thumbnail / Info Card */}
                  <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                    {compressionResult.isPdf ? (
                      <div className="w-12 h-12 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-700">
                        <img src={compressionResult.dataUrl} alt="Compressed preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white truncate">{compressionResult.file.name}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">
                        {compressionResult.isPdf
                          ? `Compressed PDF (${compressionResult.pageCount || 1} Page${(compressionResult.pageCount || 1) > 1 ? 's' : ''}) ready for submission!`
                          : 'Compressed Image ready for upload!'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    {onApplyCompressedFile && (
                      <button
                        type="button"
                        onClick={handleApplyAndUpload}
                        disabled={isUploading}
                        className="w-full sm:flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Uploading to Form...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-slate-950" />
                            <span>USE COMPRESSED FILE & UPLOAD (फॉर्म में लगाएं)</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadOnly}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Save to Device (डाउनलोड)</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Max Form Limit: <strong className="text-amber-400">{maxSizeLimitMb} MB</strong></span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold cursor-pointer"
          >
            Close ✕
          </button>
        </div>

      </div>

      {/* Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        initialImage={selectedFile}
        autoUpload={false}
        onApplyCroppedImage={handleApplyCroppedFileInModal}
      />
    </div>
  );
};
