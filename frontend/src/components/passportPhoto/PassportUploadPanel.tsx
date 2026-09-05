import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import { validateImageFile } from '../../lib/passportPhoto/validation.js';

interface PassportUploadPanelProps {
  onFilesSelected: (files: File[]) => void;
  onUseSampleImage?: () => void;
}

export const PassportUploadPanel: React.FC<PassportUploadPanelProps> = ({
  onFilesSelected,
  onUseSampleImage
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const processFileList = (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    let err: string | null = null;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const res = validateImageFile(file);
      if (res.valid) {
        validFiles.push(file);
      } else {
        err = res.error || 'Invalid file uploaded.';
      }
    }

    if (err) {
      setErrorMessage(err);
    } else {
      setErrorMessage(null);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  // Live Camera handlers
  const handleStartCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setErrorMessage('Camera access was denied or is unavailable on this device.');
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `webcam_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleStopCamera();
        onFilesSelected([file]);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div id="passport-upload-panel" className="max-w-xl mx-auto py-4 px-2 space-y-4">
      {/* Error notification */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Camera Viewfinder Modal / View */}
      {isCameraActive ? (
        <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Live Camera Viewfinder
            </span>
            <button
              type="button"
              onClick={handleStopCamera}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            {/* Guide oval overlay for face alignment */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-44 h-56 border-2 border-dashed border-white/60 rounded-full" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Capture Photo
            </button>
            <button
              type="button"
              onClick={handleStopCamera}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Drag and drop upload zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/70 shadow-md scale-[1.01]'
              : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Online Passport Photo Maker with A4 6-Photo Print Sheet
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
            Auto-crop a JPG, PNG or WEBP photo, choose 35×45 mm, 2×2 inch or a custom size, then arrange photos on an A4 print sheet with equal margins and adjustable gaps.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition-all active:scale-95">
              <ImageIcon className="w-4 h-4" />
              Browse Image Files
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleStartCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-all"
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              Take Photo via Camera
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>Supports JPG, PNG, WEBP up to 10 MB</span>
            {onUseSampleImage && (
              <button
                type="button"
                onClick={onUseSampleImage}
                className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Load Demo Portrait Sample
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
