import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, RotateCw, Maximize2, Check, X, 
  Sparkles, RefreshCw, Scissors, CheckCircle2 
} from 'lucide-react';
import { ScanAdjustmentParams } from '../../types/idStudio';
import { applyImageFilters, DEFAULT_ADJUSTMENTS } from '../../lib/idStudio/imageProcessing';
import { E_EPIC_TEMPLATE } from '../../lib/idStudio/voterCardDetector';

export interface CropBox {
  x: number;      // in percentage 0 - 100
  y: number;      // in percentage 0 - 100
  width: number;  // in percentage 0 - 100
  height: number; // in percentage 0 - 100
}

interface AdjustScanWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  targetSideName?: string; // e.g. 'Front Side' | 'Back Side'
  initialCropBox?: CropBox;
  initialAdjustments?: ScanAdjustmentParams;
  onConfirm: (croppedDataUrl: string, adjustments: ScanAdjustmentParams, cropBox: CropBox) => void;
}

export const AdjustScanWorkspace: React.FC<AdjustScanWorkspaceProps> = ({
  isOpen,
  onClose,
  imageSrc,
  targetSideName = 'Front',
  initialCropBox,
  initialAdjustments = DEFAULT_ADJUSTMENTS,
  onConfirm
}) => {
  // Preset filter mode
  const [filterMode, setFilterMode] = useState<'Orig' | 'Natural' | 'B&W'>('Natural');

  // Sliders matching screenshot:
  // Brightness (default +6 in screenshot when Natural, or 0)
  const [brightness, setBrightness] = useState<number>(6);
  // Contrast (default +14 in screenshot when Natural, or 0)
  const [contrast, setContrast] = useState<number>(14);
  // PRO Sliders:
  const [saturation, setSaturation] = useState<number>(0);
  const [warmth, setWarmth] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(0);
  const [clarity, setClarity] = useState<number>(0);

  // Rotation & Zoom
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 700, height: 450 });

  const computeFitSize = useCallback((imgW: number, imgH: number, rot: number) => {
    const stageMaxW = typeof window !== 'undefined' ? Math.max(480, Math.min(window.innerWidth * 0.58, 860)) : 800;
    const stageMaxH = typeof window !== 'undefined' ? Math.max(380, Math.min(window.innerHeight * 0.76, 680)) : 600;
    
    const isRot90 = rot === 90 || rot === 270;
    const w = isRot90 ? imgH : imgW;
    const h = isRot90 ? imgW : imgH;
    const aspect = (w > 0 && h > 0) ? (w / h) : (85.6 / 54);

    let fitW = stageMaxW;
    let fitH = fitW / aspect;

    if (fitH > stageMaxH) {
      fitH = stageMaxH;
      fitW = fitH * aspect;
    }

    return { width: Math.max(340, Math.round(fitW)), height: Math.max(220, Math.round(fitH)) };
  }, []);

  // Interactive Crop Bounding Box (percentages 0-100 of image)
  const [cropBox, setCropBox] = useState<CropBox>(() => {
    if (initialCropBox) return initialCropBox;
    // Default smart card box in center of page (approx ID Card 85.6x54 aspect ratio)
    return {
      x: 18,
      y: 42,
      width: 64,
      height: 40
    };
  });

  // Canvas & Interaction references
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Dragging state
  const [dragAction, setDragAction] = useState<string | null>(null); // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; box: CropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: cropBox
  });

  // Initialize and load image
  useEffect(() => {
    if (!isOpen) return;

    // Set initial values
    if (initialAdjustments) {
      if (initialAdjustments.filterMode === 'BW') setFilterMode('B&W');
      else if (initialAdjustments.filterMode === 'NATURAL_MAGIC') {
        setFilterMode('Natural');
        setBrightness(initialAdjustments.brightness ? initialAdjustments.brightness - 100 : 6);
        setContrast(initialAdjustments.contrast ? initialAdjustments.contrast - 100 : 14);
      } else {
        setFilterMode('Orig');
        setBrightness(0);
        setContrast(0);
      }
    } else {
      setFilterMode('Natural');
      setBrightness(6);
      setContrast(14);
      setSaturation(0);
      setWarmth(0);
      setSharpness(0);
      setClarity(0);
    }

    setRotationDeg(0);
    setZoomLevel(100);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      setBaseSize(computeFitSize(img.width, img.height, 0));
      // Auto-detect a nice crop box based on image aspect ratio
      if (!initialCropBox) {
        // Center a card-like crop bounding box
        const imgRatio = img.width / img.height;
        if (imgRatio > 1.2) {
          // Horizontal document (side-by-side or single card)
          setCropBox({ x: 10, y: 15, width: 80, height: 70 });
        } else {
          // Vertical / A4 page (e.g. marksheet, Aadhaar letter)
          setCropBox({ x: 18, y: 44, width: 64, height: 38 });
        }
      }
      renderCanvas();
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, computeFitSize]);

  // Mode changes
  const handleFilterModeChange = (mode: 'Orig' | 'Natural' | 'B&W') => {
    setFilterMode(mode);
    if (mode === 'Orig') {
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setWarmth(0);
      setSharpness(0);
      setClarity(0);
    } else if (mode === 'Natural') {
      setBrightness(6);
      setContrast(14);
      setSaturation(0);
      setWarmth(0);
      setSharpness(0);
      setClarity(0);
    } else if (mode === 'B&W') {
      setBrightness(4);
      setContrast(20);
      setSaturation(0);
      setWarmth(0);
      setSharpness(10);
      setClarity(10);
    }
  };

  const handleResetTone = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
  };

  const handleFullImage = () => {
    setCropBox({
      x: 0,
      y: 0,
      width: 100,
      height: 100
    });
  };

  const handleRotateLeft = () => {
    setRotationDeg((prev) => {
      const next = (prev - 90 + 360) % 360;
      if (originalImageRef.current) {
        setBaseSize(computeFitSize(originalImageRef.current.width, originalImageRef.current.height, next));
      }
      return next;
    });
  };

  const handleRotateRight = () => {
    setRotationDeg((prev) => {
      const next = (prev + 90) % 360;
      if (originalImageRef.current) {
        setBaseSize(computeFitSize(originalImageRef.current.width, originalImageRef.current.height, next));
      }
      return next;
    });
  };

  // Render to canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const isRotated90 = rotationDeg === 90 || rotationDeg === 270;
    const targetW = isRotated90 ? img.height : img.width;
    const targetH = isRotated90 ? img.width : img.height;

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, targetW, targetH);

    // Apply rotation
    if (rotationDeg !== 0) {
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    } else {
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();

    // Map current UI slider values into standard ScanAdjustmentParams
    const adjParams: ScanAdjustmentParams = {
      filterMode: filterMode === 'Orig' ? 'ORIGINAL' : filterMode === 'Natural' ? 'NATURAL_MAGIC' : 'BW',
      brightness: 100 + brightness,
      contrast: 100 + contrast,
      saturation: 100 + saturation,
      warmth: warmth,
      sharpness: sharpness,
      clarity: clarity,
      thresholdBW: 128
    };

    applyImageFilters(ctx, targetW, targetH, adjParams, [], false);
  }, [rotationDeg, filterMode, brightness, contrast, saturation, warmth, sharpness, clarity]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle Drag & Resizing of the Crop Bounding Box
  const handleMouseDown = (e: React.MouseEvent, action: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragAction(action);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...cropBox }
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragAction || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStartRef.current.mouseX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStartRef.current.mouseY) / rect.height) * 100;

      const orig = dragStartRef.current.box;
      let newBox = { ...orig };

      if (dragAction === 'move') {
        let nextX = orig.x + deltaXPercent;
        let nextY = orig.y + deltaYPercent;
        nextX = Math.max(0, Math.min(100 - orig.width, nextX));
        nextY = Math.max(0, Math.min(100 - orig.height, nextY));
        newBox.x = nextX;
        newBox.y = nextY;
      } else if (dragAction === 'se') {
        newBox.width = Math.max(5, Math.min(100 - orig.x, orig.width + deltaXPercent));
        newBox.height = Math.max(5, Math.min(100 - orig.y, orig.height + deltaYPercent));
      } else if (dragAction === 'sw') {
        const nextX = Math.max(0, Math.min(orig.x + orig.width - 5, orig.x + deltaXPercent));
        newBox.width = orig.width + (orig.x - nextX);
        newBox.x = nextX;
        newBox.height = Math.max(5, Math.min(100 - orig.y, orig.height + deltaYPercent));
      } else if (dragAction === 'ne') {
        newBox.width = Math.max(5, Math.min(100 - orig.x, orig.width + deltaXPercent));
        const nextY = Math.max(0, Math.min(orig.y + orig.height - 5, orig.y + deltaYPercent));
        newBox.height = orig.height + (orig.y - nextY);
        newBox.y = nextY;
      } else if (dragAction === 'nw') {
        const nextX = Math.max(0, Math.min(orig.x + orig.width - 5, orig.x + deltaXPercent));
        const nextY = Math.max(0, Math.min(orig.y + orig.height - 5, orig.y + deltaYPercent));
        newBox.width = orig.width + (orig.x - nextX);
        newBox.height = orig.height + (orig.y - nextY);
        newBox.x = nextX;
        newBox.y = nextY;
      } else if (dragAction === 'e') {
        newBox.width = Math.max(5, Math.min(100 - orig.x, orig.width + deltaXPercent));
      } else if (dragAction === 'w') {
        const nextX = Math.max(0, Math.min(orig.x + orig.width - 5, orig.x + deltaXPercent));
        newBox.width = orig.width + (orig.x - nextX);
        newBox.x = nextX;
      } else if (dragAction === 's') {
        newBox.height = Math.max(5, Math.min(100 - orig.y, orig.height + deltaYPercent));
      } else if (dragAction === 'n') {
        const nextY = Math.max(0, Math.min(orig.y + orig.height - 5, orig.y + deltaYPercent));
        newBox.height = orig.height + (orig.y - nextY);
        newBox.y = nextY;
      }

      setCropBox(newBox);
    };

    const handleMouseUp = () => {
      setDragAction(null);
    };

    if (dragAction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragAction]);

  // Execute Final Crop and Confirm
  const handleConfirmScan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.width;
    const H = canvas.height;

    // Calculate pixel coordinates from percentage cropBox
    const cropPixelX = Math.round((cropBox.x / 100) * W);
    const cropPixelY = Math.round((cropBox.y / 100) * H);
    const cropPixelW = Math.round((cropBox.width / 100) * W);
    const cropPixelH = Math.round((cropBox.height / 100) * H);

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.max(1, cropPixelW);
    croppedCanvas.height = Math.max(1, cropPixelH);
    const croppedCtx = croppedCanvas.getContext('2d');

    if (croppedCtx) {
      croppedCtx.drawImage(
        canvas,
        cropPixelX,
        cropPixelY,
        cropPixelW,
        cropPixelH,
        0,
        0,
        cropPixelW,
        cropPixelH
      );
    }

    const croppedDataUrl = croppedCanvas.toDataURL('image/png', 0.95);

    const adjustments: ScanAdjustmentParams = {
      filterMode: filterMode === 'Orig' ? 'ORIGINAL' : filterMode === 'Natural' ? 'NATURAL_MAGIC' : 'BW',
      brightness: 100 + brightness,
      contrast: 100 + contrast,
      saturation: 100 + saturation,
      warmth: warmth,
      sharpness: sharpness,
      clarity: clarity,
      thresholdBW: 128
    };

    onConfirm(croppedDataUrl, adjustments, cropBox);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#eef1f5] text-slate-800 font-sans select-none overflow-hidden animate-in fade-in">
      
      {/* ======================================================== */}
      {/* 1. LEFT / CENTER STAGE - CANVAS & CROPPER               */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col relative h-full bg-[#f0f2f5] overflow-hidden items-center justify-center p-4">
        
        {/* Top Right Zoom Controls (floating pill) */}
        <div className="absolute top-4 right-4 z-30 flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setZoomLevel(prev => Math.min(300, prev + 15))}
            className="p-2.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center border-b border-slate-100 cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(40, prev - 15))}
            className="p-2.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center border-b border-slate-100 cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="py-1 px-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 text-center select-none transition-colors border-t border-slate-100 cursor-pointer"
            title="Reset to 100% (Fit)"
          >
            {zoomLevel}%
          </button>
        </div>

        {/* Center Canvas Viewport */}
        <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-auto p-4 md:p-8 select-none">
          <div className="m-auto flex items-center justify-center p-2">
            <div 
              ref={containerRef}
              className="relative shadow-2xl bg-white rounded-lg border border-slate-300 shrink-0 select-none transition-[width,height] duration-75"
              style={{
                width: `${Math.round(baseSize.width * (zoomLevel / 100))}px`,
                height: `${Math.round(baseSize.height * (zoomLevel / 100))}px`
              }}
            >
              {/* The Rendered Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full block rounded-lg object-contain"
              />

            {/* Dark Dimmer Overlay Outside Crop Box */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(transparent, transparent)`
              }}
            >
              {/* Top Mask */}
              <div 
                className="absolute left-0 right-0 top-0 bg-black/40"
                style={{ height: `${cropBox.y}%` }}
              />
              {/* Bottom Mask */}
              <div 
                className="absolute left-0 right-0 bottom-0 bg-black/40"
                style={{ height: `${100 - (cropBox.y + cropBox.height)}%` }}
              />
              {/* Left Mask */}
              <div 
                className="absolute left-0 bg-black/40"
                style={{
                  top: `${cropBox.y}%`,
                  height: `${cropBox.height}%`,
                  width: `${cropBox.x}%`
                }}
              />
              {/* Right Mask */}
              <div 
                className="absolute right-0 bg-black/40"
                style={{
                  top: `${cropBox.y}%`,
                  height: `${cropBox.height}%`,
                  width: `${100 - (cropBox.x + cropBox.width)}%`
                }}
              />
            </div>

            {/* Interactive Resizable Bounding Box */}
            <div
              className="absolute border-2 border-blue-500 shadow-sm cursor-move select-none"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* 4 Corner Round Handles */}
              {/* NW */}
              <div
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
              />
              {/* NE */}
              <div
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
              />
              {/* SW */}
              <div
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
              />
              {/* SE */}
              <div
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
              />

              {/* 4 Midpoint Edge Handles */}
              {/* North */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-blue-500 rounded cursor-ns-resize"
                onMouseDown={(e) => handleMouseDown(e, 'n')}
              />
              {/* South */}
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-blue-500 rounded cursor-ns-resize"
                onMouseDown={(e) => handleMouseDown(e, 's')}
              />
              {/* West */}
              <div
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-4 bg-white border border-blue-500 rounded cursor-ew-resize"
                onMouseDown={(e) => handleMouseDown(e, 'w')}
              />
              {/* East */}
              <div
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-4 bg-white border border-blue-500 rounded cursor-ew-resize"
                onMouseDown={(e) => handleMouseDown(e, 'e')}
              />
            </div>
          </div>
        </div>
      </div>

        {/* Bottom Floating Toolbar: Rotate Left, FULL IMAGE, Rotate Right */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-200">
          <button
            onClick={handleRotateLeft}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleFullImage}
            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
            title="Select Entire Page"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span>FULL IMAGE</span>
          </button>

          <button
            onClick={handleRotateRight}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. RIGHT SIDEBAR - CONTROLS & ADJUST SCAN               */}
      {/* ======================================================== */}
      <div className="w-full md:w-[350px] lg:w-[380px] bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20 shrink-0">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              ADJUST SCAN
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Crop, color aur print clarity
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wider cursor-pointer"
          >
            CANCEL
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Quick Mode Filters */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
            {(['Orig', 'Natural', 'B&W'] as const).map((mode) => {
              const isActive = filterMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleFilterModeChange(mode)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Quick Alignment Presets */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
              <span>Card Alignment Presets</span>
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setCropBox({
                  x: E_EPIC_TEMPLATE.front.x * 100,
                  y: E_EPIC_TEMPLATE.front.y * 100,
                  width: E_EPIC_TEMPLATE.front.width * 100,
                  height: E_EPIC_TEMPLATE.front.height * 100
                })}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-[11px] font-bold text-slate-700 text-left transition-colors cursor-pointer"
              >
                🗳️ Voter Front
              </button>
              <button
                type="button"
                onClick={() => setCropBox({
                  x: E_EPIC_TEMPLATE.back.x * 100,
                  y: E_EPIC_TEMPLATE.back.y * 100,
                  width: E_EPIC_TEMPLATE.back.width * 100,
                  height: E_EPIC_TEMPLATE.back.height * 100
                })}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-[11px] font-bold text-slate-700 text-left transition-colors cursor-pointer"
              >
                🗳️ Voter Back
              </button>
              <button
                type="button"
                onClick={() => setCropBox({ x: 4.8, y: 68.5, width: 44.5, height: 28.8 })}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-[11px] font-bold text-slate-700 text-left transition-colors cursor-pointer"
              >
                🆔 Aadhaar Front
              </button>
              <button
                type="button"
                onClick={() => setCropBox({ x: 50.8, y: 68.5, width: 44.5, height: 28.8 })}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-[11px] font-bold text-slate-700 text-left transition-colors cursor-pointer"
              >
                🆔 Aadhaar Back
              </button>
            </div>
          </div>

          {/* Section: TONE */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  TONE
                </h3>
                <p className="text-[11px] text-slate-400">Light correction</p>
              </div>

              <button
                onClick={handleResetTone}
                className="text-[11px] font-bold text-slate-500 hover:text-blue-600 cursor-pointer uppercase transition-colors"
              >
                RESET
              </button>
            </div>

            {/* Brightness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>Brightness</span>
                <span className="font-semibold text-slate-800">{brightness}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>Contrast</span>
                <span className="font-semibold text-slate-800">{contrast}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Saturation PRO */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>Saturation</span>
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">PRO</span>
                </span>
                <span className="font-semibold text-slate-800">{saturation}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={saturation}
                onChange={(e) => setSaturation(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Warmth PRO */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>Warmth</span>
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">PRO</span>
                </span>
                <span className="font-semibold text-slate-800">{warmth}</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                value={warmth}
                onChange={(e) => setWarmth(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

          </div>

          {/* Section: DETAIL */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                DETAIL
              </h3>
              <p className="text-[11px] text-slate-400">Text sharpness</p>
            </div>

            {/* Sharpness PRO */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>Sharpness</span>
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">PRO</span>
                </span>
                <span className="font-semibold text-slate-800">{sharpness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={sharpness}
                onChange={(e) => setSharpness(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Clarity PRO */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>Clarity</span>
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">PRO</span>
                </span>
                <span className="font-semibold text-slate-800">{clarity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={clarity}
                onChange={(e) => setClarity(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

          </div>

        </div>

        {/* Sticky Bottom Action */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={handleConfirmScan}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer uppercase tracking-wider"
          >
            <span>CONFIRM SCAN</span>
            <Check className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
