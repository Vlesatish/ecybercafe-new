import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { 
  X, Crop, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, 
  ZoomIn, ZoomOut, Camera, Check, RefreshCw, Sun, SunMedium, Sliders,
  Image as ImageIcon, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move,
  Lock, Unlock, Maximize2, Info
} from 'lucide-react';
import { uploadFileToServer } from '../utils/upload';
import { renderPdfFirstPageAsImageFile } from '../utils/pdfCompressor';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: File | string | null;
  onApplyCroppedImage: (croppedFile: File, uploadResult?: { url: string; filename: string; size: string }) => void;
  title?: string;
  maxSizeMb?: number;
  autoUpload?: boolean;
  initialType?: 'photo' | 'signature' | 'document' | 'auto';
  fieldId?: string | null;
}

type AspectRatioPreset = 'FREE' | 'CUSTOM' | '3:4' | '1:1' | '4:3' | '3:1';
type ResizeMode = 'crop' | 'stretch';
type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  filters = { brightness: 100, contrast: 100 }
): Promise<HTMLCanvasElement> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d canvas context');
  }

  const rotRad = (rotation * Math.PI) / 180;

  // Calculate bounding box of rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = Math.round(bBoxWidth);
  canvas.height = Math.round(bBoxHeight);

  // Apply CSS filters (brightness / contrast)
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;

  // Translate canvas context to center for rotation & flip
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw full rotated image onto temp canvas
  ctx.drawImage(image, 0, 0);

  // Create final cropped canvas
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No 2d canvas context for cropped canvas');
  }

  croppedCanvas.width = Math.max(1, Math.round(pixelCrop.width));
  croppedCanvas.height = Math.max(1, Math.round(pixelCrop.height));

  // Fill with clean white background in case crop bounds extend outside image border
  croppedCtx.fillStyle = '#FFFFFF';
  croppedCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);

  // Extract pixel region from rotated image canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height
  );

  return croppedCanvas;
}

async function getFullImageCanvas(
  imageSrc: string,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  filters = { brightness: 100, contrast: 100 }
): Promise<HTMLCanvasElement> {
  const image = await createImage(imageSrc);
  const { width, height } = rotateSize(image.width, image.height, rotation);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d canvas context');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  return canvas;
}

function resizeCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(width));
  output.height = Math.max(1, Math.round(height));
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('No 2d canvas context');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, output.width, output.height);
  return output;
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: OutputFormat, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

async function compressCanvasToTarget(
  source: HTMLCanvasElement,
  type: Exclude<OutputFormat, 'image/png'>,
  requestedQuality: number,
  targetBytes: number
): Promise<Blob | null> {
  let canvas = source;
  let fallback: Blob | null = null;

  for (let resizeAttempt = 0; resizeAttempt < 12; resizeAttempt += 1) {
    const requestedBlob = await canvasToBlob(canvas, type, requestedQuality);
    if (requestedBlob && requestedBlob.size <= targetBytes) return requestedBlob;

    let low = 0.04;
    let high = requestedQuality;
    let best: Blob | null = null;
    fallback = await canvasToBlob(canvas, type, low);

    if (fallback && fallback.size <= targetBytes) {
      best = fallback;
      for (let pass = 0; pass < 9; pass += 1) {
        const middle = (low + high) / 2;
        const candidate = await canvasToBlob(canvas, type, middle);
        if (candidate && candidate.size <= targetBytes) {
          best = candidate;
          low = middle;
        } else {
          high = middle;
        }
      }
      return best;
    }

    if (canvas.width <= 160 || canvas.height <= 160) break;
    canvas = resizeCanvas(canvas, Math.round(canvas.width * 0.82), Math.round(canvas.height * 0.82));
  }

  return fallback;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  onApplyCroppedImage,
  title = 'Crop & Edit Photo (फोटो क्रॉप व एडिट करें)',
  maxSizeMb = 2,
  autoUpload = true,
  initialType = 'auto',
  fieldId = null
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('cropped-photo.jpg');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cropper states
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('3:4');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('crop');
  const [outputWidth, setOutputWidth] = useState<number>(600);
  const [outputHeight, setOutputHeight] = useState<number>(800);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/jpeg');
  const [outputQuality, setOutputQuality] = useState<number>(90);
  const [maxKb, setMaxKb] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setCrop({ x: 0, y: 0 });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setCroppedAreaPixels(null);
      setResizeMode('crop');
      setOutputFormat('image/jpeg');
      setOutputQuality(90);
      setMaxKb(0);

      // Determine default aspect ratio based on signature vs photo
      let imgName = 'cropped-photo.jpg';
      if (initialImage && initialImage instanceof File) {
        imgName = initialImage.name;
      }

      const checkStr = ((fieldId || '') + ' ' + (title || '') + ' ' + (imgName || '')).toLowerCase();
      const isSignature = initialType === 'signature' || checkStr.includes('sign') || checkStr.includes('sig') || checkStr.includes('thumb') || checkStr.includes('हस्ताक्षर');
      
      if (isSignature) {
        setAspectPreset('3:1');
        setZoom(1.2);
        setOutputWidth(900);
        setOutputHeight(300);
      } else {
        // Default to Passport Photo 3:4 for photos
        setAspectPreset('3:4');
        setZoom(1.0);
        setOutputWidth(600);
        setOutputHeight(800);
      }

      if (initialImage) {
        if (typeof initialImage === 'string') {
          setImageSrc(initialImage);
          setOriginalFileName(isSignature ? 'cropped-signature.jpg' : 'cropped-photo.jpg');
        } else if (initialImage instanceof File) {
          setOriginalFileName(initialImage.name || (isSignature ? 'cropped-signature.jpg' : 'cropped-photo.jpg'));
          const reader = new FileReader();
          reader.onload = () => {
            setImageSrc(reader.result as string);
          };
          reader.readAsDataURL(initialImage);
        }
      } else {
        setImageSrc(null);
      }
    } else {
      stopCamera();
    }
  }, [isOpen, initialImage, fieldId, title, initialType]);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Direct camera failed, opening native input:', err);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setErrorMsg('Camera access unavailable. Please choose an image file.');
      }
    }
  };

  const capturePhotoFromCamera = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setImageSrc(dataUrl);
        setOriginalFileName(`camera-photo-${Date.now()}.jpg`);
      }
      stopCamera();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!file.type.startsWith('image/') && !isPdf) {
        setErrorMsg('Please select JPG, PNG, WEBP or PDF file.');
        return;
      }
      if (isPdf) {
        setIsProcessing(true);
        setErrorMsg('PDF का पहला पेज editor के लिए तैयार हो रहा है...');
        try {
          file = await renderPdfFirstPageAsImageFile(file);
        } catch (error: any) {
          setErrorMsg(error?.message || 'PDF editor में नहीं खुल सका।');
          setIsProcessing(false);
          return;
        }
        setIsProcessing(false);
        setOutputFormat('image/png');
        setOutputQuality(100);
      } else {
        setOutputFormat(file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
        setOutputQuality(95);
      }
      setOriginalFileName(file.name);
      const reader = new FileReader();
      reader.onload = async () => {
        const source = reader.result as string;
        setImageSrc(source);
        if (initialType === 'auto' && !fieldId) {
          try {
            const loadedImage = await createImage(source);
            setOutputWidth(Math.min(10000, loadedImage.naturalWidth || loadedImage.width));
            setOutputHeight(Math.min(10000, loadedImage.naturalHeight || loadedImage.height));
            setAspectPreset('CUSTOM');
            setLockRatio(true);
          } catch (_) {
            // The editor can still work even if natural-size detection fails.
          }
        }
        stopCamera();
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setErrorMsg('Please select or capture a photo first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const baseCanvas = resizeMode === 'stretch'
        ? await getFullImageCanvas(imageSrc, rotation, { horizontal: flipH, vertical: flipV }, { brightness, contrast })
        : await getCroppedImg(imageSrc, croppedAreaPixels, rotation, { horizontal: flipH, vertical: flipV }, { brightness, contrast });
      const canvas = resizeCanvas(baseCanvas, outputWidth, outputHeight);
      const effectiveFormat: OutputFormat = maxKb > 0 && outputFormat === 'image/png' ? 'image/jpeg' : outputFormat;
      const quality = outputQuality / 100;
      const blob = maxKb > 0 && effectiveFormat !== 'image/png'
        ? await compressCanvasToTarget(canvas, effectiveFormat, quality, maxKb * 1024)
        : await canvasToBlob(canvas, effectiveFormat, quality);

      (async () => {
        if (!blob) {
          setIsProcessing(false);
          setErrorMsg('Cropping failed. Please try again.');
          return;
        }

        const extension = effectiveFormat === 'image/png' ? 'png' : effectiveFormat === 'image/webp' ? 'webp' : 'jpg';
        const cleanName = `${originalFileName.replace(/\.[^/.]+$/, '')}-${resizeMode}.${extension}`;
        const croppedFile = new File([blob], cleanName, { type: effectiveFormat, lastModified: Date.now() });

        if (autoUpload) {
          try {
            const uploadResult = await uploadFileToServer(croppedFile, maxSizeMb);
            onApplyCroppedImage(croppedFile, uploadResult);
            onClose();
          } catch (uploadErr: any) {
            setErrorMsg(`Upload Error: ${uploadErr.message || 'Server error'}`);
          } finally {
            setIsProcessing(false);
          }
        } else {
          onApplyCroppedImage(croppedFile);
          setIsProcessing(false);
          onClose();
        }
      })();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error rendering cropped photo. Please try again.');
      setIsProcessing(false);
    }
  };

  const getAspectVal = (): number | undefined => {
    switch (aspectPreset) {
      case '3:4': return 3 / 4;
      case '1:1': return 1 / 1;
      case '4:3': return 4 / 3;
      case '3:1': return 3 / 1;
      case 'CUSTOM': return outputWidth > 0 && outputHeight > 0 ? outputWidth / outputHeight : undefined;
      default: return undefined;
    }
  };

  const moveCrop = (dx: number, dy: number) => {
    setCrop(c => ({ x: c.x + dx, y: c.y + dy }));
  };

  const setPresetAndSize = (preset: AspectRatioPreset) => {
    setAspectPreset(preset);
    if (preset === 'CUSTOM') { setLockRatio(false); }
    if (preset === '3:1') { setOutputWidth(900); setOutputHeight(300); setZoom(1.4); }
    if (preset === '3:4') { setOutputWidth(600); setOutputHeight(800); }
    if (preset === '1:1') { setOutputWidth(600); setOutputHeight(600); }
    if (preset === '4:3') { setOutputWidth(800); setOutputHeight(600); }
  };

  const updateWidth = (value: number) => {
    const next = Math.max(1, Math.min(10000, value || 1));
    const ratio = outputWidth / outputHeight;
    setAspectPreset('CUSTOM');
    setOutputWidth(next);
    if (lockRatio && ratio > 0) setOutputHeight(Math.max(1, Math.round(next / ratio)));
  };

  const updateHeight = (value: number) => {
    const next = Math.max(1, Math.min(10000, value || 1));
    const ratio = outputWidth / outputHeight;
    setAspectPreset('CUSTOM');
    setOutputHeight(next);
    if (lockRatio && ratio > 0) setOutputWidth(Math.max(1, Math.round(next * ratio)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-4xl bg-white border border-sky-200 rounded-3xl shadow-2xl text-slate-800 overflow-hidden my-auto flex flex-col max-h-[98vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-white via-sky-50 to-indigo-50 border-b border-sky-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-indigo-800 flex items-center gap-1.5">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Passport photo, Document ya signature shape me crop karein
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 overflow-y-auto space-y-3 flex-1 bg-gradient-to-br from-slate-50 via-white to-sky-50">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <X className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* No Image State */}
          {!imageSrc && !cameraActive && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
              }}
              className="p-10 border-2 border-dashed border-sky-400 hover:border-amber-500 rounded-3xl bg-gradient-to-br from-white via-sky-50 to-amber-50 hover:from-sky-50 hover:to-amber-100 flex flex-col items-center justify-center gap-4 text-center transition-all cursor-pointer shadow-inner min-h-[300px]"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 border-4 border-white">
                <ImageIcon className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-xl text-indigo-700">🖼️ यहाँ पर दबाएँ</p>
                <p className="text-sm font-bold text-rose-500">📁 Photo या PDF Upload करें</p>
              </div>
            </div>
          )}

          {/* Live Camera View */}
          {cameraActive && (
            <div className="relative bg-black rounded-2xl overflow-hidden min-h-[280px] flex flex-col items-center justify-center border border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-h-[380px] object-contain"
              />
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4 bg-slate-950/70 py-2.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={capturePhotoFromCamera}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Snap Photo (फोटो खींचें)</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Cropper Container */}
          {imageSrc && !cameraActive && (
            <div className="space-y-2.5">
              {/* Aspect Preset Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white border border-sky-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider px-1">Type:</span>
                  {(['3:1', '3:4', '1:1', '4:3', 'FREE', 'CUSTOM'] as AspectRatioPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPresetAndSize(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        aspectPreset === preset
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-sky-100 border border-slate-200'
                      }`}
                    >
                      {preset === '3:1' ? '🖊️ Signature (हस्ताक्षर)' : preset === '3:4' ? '🪪 Passport Photo' : preset === '1:1' ? '🔳 Square' : preset === '4:3' ? '📄 Document' : preset === 'CUSTOM' ? '✏️ Custom Size' : '📐 Free Crop'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Camera</span>
                  </button>
                </div>
              </div>

              {/* Helpful hint for signature / dragging */}
              <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-800 gap-2">
                <span className="font-semibold">
                  💡 <b>नीचे हस्ताक्षर (Signature) या फोटो सेट करने के लिए:</b> माउस/उंगली से फोटो खींचें (Drag) या <b>⬆️ ⬇️ बटन्स</b> से एडजस्ट करें।
                </span>
                <span className="shrink-0 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                  Free Drag Allowed
                </span>
              </div>

              {/* Easy Cropper Canvas */}
              <div
                className="relative mx-auto bg-slate-950 border border-slate-800 rounded-2xl overflow-visible shadow-inner select-none transition-[width,height] duration-200"
                style={{
                  width: `min(100%, ${300 * (outputWidth / Math.max(1, outputHeight))}px)`,
                  aspectRatio: `${Math.max(1, outputWidth)} / ${Math.max(1, outputHeight)}`,
                  maxHeight: '300px',
                  filter: resizeMode === 'crop' ? `brightness(${brightness}%) contrast(${contrast}%)` : undefined,
                  transform: resizeMode === 'crop' ? `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` : undefined
                }}
              >
                {resizeMode === 'crop' ? (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={getAspectVal()}
                    onCropChange={setCrop}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    minZoom={0.2}
                    maxZoom={6}
                    zoomWithScroll={false}
                    restrictPosition={false}
                  />
                ) : (
                  <img
                    src={imageSrc}
                    alt="Live stretched preview"
                    className="absolute inset-0 w-full h-full object-fill transition-all duration-200"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`
                    }}
                  />
                )}

                {/* Left-Side Floating Quick Tools Panel: Zoom In, Zoom Out, Brightness, Rotate, Reset */}
                <div className="absolute top-1 left-2 lg:-left-28 z-30 flex flex-col items-center gap-1.5 bg-slate-900/95 border border-slate-700/90 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
                  <div className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1 pb-1 border-b border-slate-800 w-full justify-center">
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>Tools</span>
                  </div>

                  {/* Zoom In Button */}
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(6, +(z + 0.15).toFixed(2)))}
                    title="Zoom In (ज़ूम इन करें)"
                    className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1 w-full"
                  >
                    <ZoomIn className="w-4 h-4 text-amber-400 group-hover:text-slate-950" />
                    <span className="text-[10px] font-black">+</span>
                  </button>

                  {/* Zoom Out Button */}
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(0.2, +(z - 0.15).toFixed(2)))}
                    title="Zoom Out (ज़ूम आउट करें)"
                    className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1 w-full"
                  >
                    <ZoomOut className="w-4 h-4 text-amber-400 group-hover:text-slate-950" />
                    <span className="text-[10px] font-black">-</span>
                  </button>

                  <div className="w-full h-px bg-slate-800 my-0.5" />

                  {/* Brightness Up Button */}
                  <button
                    type="button"
                    onClick={() => setBrightness(b => Math.min(180, b + 10))}
                    title="Increase Brightness (ब्राइटनेस बढ़ाएं)"
                    className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-0.5 w-full"
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-black">+</span>
                  </button>

                  {/* Brightness Down Button */}
                  <button
                    type="button"
                    onClick={() => setBrightness(b => Math.max(40, b - 10))}
                    title="Decrease Brightness (ब्राइटनेस कम करें)"
                    className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-0.5 w-full"
                  >
                    <SunMedium className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black">-</span>
                  </button>

                  <div className="w-full h-px bg-slate-800 my-0.5" />

                  {/* Rotate Button */}
                  <button
                    type="button"
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    title="Rotate 90° (फोटो घुमाएं)"
                    className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center w-full"
                  >
                    <RotateCw className="w-4 h-4 text-amber-400" />
                  </button>

                  {/* Reset Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setBrightness(100);
                      setContrast(100);
                      setRotation(0);
                      setCrop({ x: 0, y: 0 });
                      setFlipH(false);
                      setFlipV(false);
                    }}
                    title="Reset All (रीसेट करें)"
                    className="px-1.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer text-[9px] font-black w-full text-center border border-rose-500/30"
                  >
                    Reset
                  </button>
                </div>

                {/* Right-Side Directional Position Nudge Buttons */}
                {resizeMode === 'crop' && (
                  <div className="absolute bottom-2 right-2 lg:-right-36 z-20 flex flex-col items-center gap-1 bg-slate-900/95 border border-slate-700/90 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
                    <div className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-0.5">
                      <Move className="w-3 h-3" /> Position
                    </div>
                    <button
                      type="button"
                      onClick={() => moveCrop(0, 50)}
                      title="Move Image UP"
                      className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all active:scale-90 cursor-pointer shadow-sm"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveCrop(50, 0)}
                        title="Move Image LEFT"
                        className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all active:scale-90 cursor-pointer shadow-sm"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrop({ x: 0, y: 0 })}
                        title="Reset Position"
                        className="px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCrop(-50, 0)}
                        title="Move Image RIGHT"
                        className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all active:scale-90 cursor-pointer shadow-sm"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => moveCrop(0, -50)}
                      title="Move Image DOWN"
                      className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all active:scale-90 cursor-pointer shadow-sm"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Controls Toolbar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-white border border-sky-200 rounded-2xl shadow-sm">
                {/* Zoom */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-700">
                    <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Zoom</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-700">
                    <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="150"
                    step="5"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Rotate */}
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-700 block">Rotate (घुमाएं)</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> -90°
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" /> +90°
                    </button>
                  </div>
                </div>

                {/* Flip */}
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-700 block">Flip (उलटें)</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setFlipH(!flipH)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        flipH ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" /> Horiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlipV(!flipV)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        flipV ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" /> Vert
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-sky-200 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-indigo-950 block">Resize & Output (नया साइज़ व फ़ॉर्मेट)</span>
                      <span className="text-[10px] text-slate-500 font-medium">फ़ोटो की चौड़ाई, ऊँचाई और फ़ाइल साइज़ सेट करें</span>
                    </div>
                  </div>
                  <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setResizeMode('crop')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        resizeMode === 'crop' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ✂️ Crop
                    </button>
                    <button
                      type="button"
                      onClick={() => setResizeMode('stretch')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        resizeMode === 'stretch' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ↔ Stretch
                    </button>
                  </div>
                </div>

                {resizeMode === 'stretch' && (
                  <div className="text-xs text-cyan-950 bg-cyan-100/80 border border-cyan-400 rounded-xl px-3 py-2 flex items-center gap-2 font-bold shadow-xs">
                    <Info className="w-4 h-4 text-cyan-800 shrink-0" />
                    <span><b>Stretch मोड:</b> पूरी फ़ोटो बिना कटे ठीक दिए गए Width × Height में खिंचकर (Stretch होकर) फ़िट होगी।</span>
                  </div>
                )}

                {aspectPreset === 'CUSTOM' && (
                  <div className="text-xs text-amber-950 bg-amber-100/80 border border-amber-400 rounded-xl px-3 py-2 flex items-center gap-2 font-bold shadow-xs">
                    <Info className="w-4 h-4 text-amber-800 shrink-0" />
                    <span><b>Custom Size:</b> नीचे इच्छानुसार exact Width और Height (पिक्सल में) डालें।</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-0.5">
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-800">
                    <span className="flex items-center justify-between text-slate-700 font-extrabold">
                      Width (चौड़ाई) <span className="text-[10px] text-slate-500 font-normal">px</span>
                    </span>
                    <input
                      aria-label="Output width"
                      type="number"
                      min="1"
                      max="10000"
                      value={outputWidth}
                      onChange={(e) => updateWidth(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 px-2.5 py-1.5 text-xs font-bold text-slate-900 transition-all shadow-xs"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-800">
                    <span className="flex items-center justify-between text-slate-700 font-extrabold">
                      Height (ऊँचाई) <span className="text-[10px] text-slate-500 font-normal">px</span>
                    </span>
                    <input
                      aria-label="Output height"
                      type="number"
                      min="1"
                      max="10000"
                      value={outputHeight}
                      onChange={(e) => updateHeight(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 px-2.5 py-1.5 text-xs font-bold text-slate-900 transition-all shadow-xs"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-800">
                    <span className="text-slate-700 font-extrabold">Format (फ़ॉर्मेट)</span>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                      className="w-full rounded-xl bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 px-2.5 py-1.5 text-xs font-bold text-slate-900 transition-all cursor-pointer shadow-xs"
                    >
                      <option value="image/jpeg">JPG (Standard)</option>
                      <option value="image/png">PNG (High Quality)</option>
                      <option value="image/webp">WEBP (Compact)</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-800">
                    <span className="flex items-center justify-between text-slate-700 font-extrabold">
                      Quality <span className="text-amber-700 font-black">{outputQuality}%</span>
                    </span>
                    <input
                      aria-label="Output quality"
                      type="range"
                      min="25"
                      max="100"
                      value={outputQuality}
                      onChange={(e) => setOutputQuality(Number(e.target.value))}
                      className="mt-2 w-full accent-amber-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-800">
                    <span className="text-slate-700 font-extrabold">
                      Max KB <span className="text-[10px] text-slate-500 font-normal">(ऐच्छिक)</span>
                    </span>
                    <input
                      aria-label="Maximum KB"
                      type="number"
                      min="0"
                      value={maxKb}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value));
                        setMaxKb(value);
                        if (value > 0 && outputFormat === 'image/png') setOutputFormat('image/jpeg');
                      }}
                      placeholder="e.g. 50 या 100"
                      className="w-full rounded-xl bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 px-2.5 py-1.5 text-xs font-bold text-slate-900 transition-all shadow-xs"
                    />
                  </label>
                </div>

                {maxKb > 0 && (
                  <div className="text-xs font-bold text-emerald-950 bg-emerald-100/80 border border-emerald-400 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xs">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>✓ Download फ़ाइल को <b>{maxKb} KB</b> या उससे कम रखने के लिए quality अपने आप optimize होगी।</span>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 cursor-pointer transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={lockRatio}
                      onChange={(e) => setLockRatio(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                      {lockRatio ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                      {lockRatio ? 'Lock Aspect Ratio (लंबाई-चौड़ाई का अनुपात लॉक रखें)' : 'Unlock Ratio (फ्री साइज़ - Width और Height अलग-अलग सेट करें)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-sky-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Cancel (रद्द करें)
          </button>

          {imageSrc && !cameraActive && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyCrop}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{resizeMode === 'stretch' ? '↔ Stretch & Apply Photo' : '✂️ Crop, Resize & Apply Photo'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
