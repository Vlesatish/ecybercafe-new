import React, { useRef, useEffect, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { CustomerPhotoItem, PrintSheetSettings } from '../../lib/passportPhoto/types.js';
import { calculatePrintSheetLayout } from '../../lib/passportPhoto/printLayoutEngine.js';
import { renderFullSheetCanvas } from '../../lib/passportPhoto/exportEngine.js';

interface PrintSheetPreviewProps {
  settings: PrintSheetSettings;
  queue: CustomerPhotoItem[];
  onFillSheet?: () => void;
}

export const PrintSheetPreview: React.FC<PrintSheetPreviewProps> = ({
  settings,
  queue,
  onFillSheet
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Single source of truth pure layout calculation
  const layout = calculatePrintSheetLayout(settings, queue);

  // Render sheet preview onto canvas using exact same layout object
  useEffect(() => {
    let isCancelled = false;
    setIsRendering(true);

    const timer = setTimeout(async () => {
      try {
        const fullCanvas = await renderFullSheetCanvas(settings, queue);
        if (isCancelled || !canvasRef.current) return;

        const targetCanvas = canvasRef.current;
        // Match internal canvas pixel dimensions to exact paper dimensions
        targetCanvas.width = fullCanvas.width;
        targetCanvas.height = fullCanvas.height;

        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
          ctx.drawImage(fullCanvas, 0, 0);
        }
      } catch (err) {
        console.warn('Error rendering sheet preview canvas:', err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [settings, queue]);

  const paperAspect = layout.paperWidthMm / layout.paperHeightMm;

  return (
    <div id="print-sheet-preview-container" className="flex flex-col space-y-3">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            {layout.paperWidthMm} × {layout.paperHeightMm} mm
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-medium">
            Grid: {layout.columns} cols × {layout.rows} rows ({layout.capacity} slots)
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Filled: {layout.usedSlots}/{layout.capacity}
          </span>
          {settings.sixPerRowA4 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-semibold rounded text-[10px]">
              6-Photos/Row Preset (32×41.14mm)
            </span>
          )}
        </div>

        {/* Action and Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {onFillSheet && layout.totalRequested < layout.capacity && layout.totalRequested > 0 && (
            <button
              type="button"
              id="fill-sheet-preview-btn"
              onClick={onFillSheet}
              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded-md border border-indigo-200 flex items-center gap-1 transition-all"
              title="Fill all remaining empty slots on sheet"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Fill Sheet ({layout.capacity})
            </button>
          )}

          {/* Debug Mode Toggle */}
          <button
            type="button"
            id="debug-toggle-btn"
            onClick={() => setShowDebug(prev => !prev)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 border transition-all ${
              showDebug
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Toggle Layout Engine Debug Inspection"
          >
            <Bug className="w-3 h-3" />
            Debug
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              id="zoom-out-btn"
              onClick={() => setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-600 px-1 select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              id="zoom-in-btn"
              onClick={() => setScale(s => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="zoom-reset-btn"
              onClick={() => setScale(1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-all"
              title="Fit to view (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Warnings from Layout Engine */}
      {layout.warnings.length > 0 && (
        <div className="space-y-1">
          {layout.warnings.map((warn, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 animate-in fade-in"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Debug Mode Panel */}
      {showDebug && (
        <div
          id="layout-debug-panel"
          className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono border border-slate-800 shadow-md space-y-2 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-sans">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <Bug className="w-3.5 h-3.5" />
              Layout Engine Inspector
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                layout.fitsWithinPaper ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {layout.fitsWithinPaper ? 'PASSED: 100% Within Boundaries' : 'WARNING: Overflow Detected'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Paper Size</span>
              <span>{layout.paperWidthMm} × {layout.paperHeightMm} mm</span>
              <span className="text-slate-500 block text-[10px]">({layout.paperWidthPx} × {layout.paperHeightPx} px)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Photo Size</span>
              <span>{layout.photoWidthMm.toFixed(2)} × {layout.photoHeightMm.toFixed(2)} mm</span>
              <span className="text-slate-500 block text-[10px]">({layout.photoWidthPx} × {layout.photoHeightPx} px)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Grid & Capacity</span>
              <span>{layout.columns} cols × {layout.rows} rows</span>
              <span className="text-slate-500 block text-[10px]">({layout.capacity} Total / {layout.usedSlots} Used)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Grid Dimensions</span>
              <span>{layout.gridWidthMm.toFixed(2)} × {layout.gridHeightMm.toFixed(2)} mm</span>
              <span className="text-slate-500 block text-[10px]">({layout.gridWidthPx} × {layout.gridHeightPx} px)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Origin (Start X, Y)</span>
              <span>X: {layout.startXmm.toFixed(2)}mm, Y: {layout.startYmm.toFixed(2)}mm</span>
              <span className="text-slate-500 block text-[10px]">({layout.startXPx}px, {layout.startYPx}px)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Usable Area</span>
              <span>{layout.usableWidthMm.toFixed(2)} × {layout.usableHeightMm.toFixed(2)} mm</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Actual Gaps</span>
              <span>X: {layout.actualGapXMm.toFixed(2)}mm, Y: {layout.actualGapYMm.toFixed(2)}mm</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Overflow Value</span>
              <span className={layout.overflowMm.x > 0 || layout.overflowMm.y > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                X: {layout.overflowMm.x.toFixed(2)}mm, Y: {layout.overflowMm.y.toFixed(2)}mm
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Viewport: Preserves real paper aspect ratio with object-contain */}
      <div
        ref={containerRef}
        id="sheet-preview-viewport"
        className="relative w-full h-[450px] bg-slate-200/90 rounded-2xl border border-slate-300 overflow-auto p-4 flex items-center justify-center shadow-inner"
      >
        <div
          id="sheet-paper-stage"
          className="relative bg-white shadow-2xl transition-transform duration-150 rounded-xs border border-slate-300 shrink-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            aspectRatio: `${paperAspect}`,
            maxHeight: scale <= 1 ? '95%' : 'none',
            maxWidth: scale <= 1 ? '95%' : 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            id="sheet-preview-canvas"
            className="block"
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              aspectRatio: `${paperAspect}`
            }}
          />

          {isRendering && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow border border-slate-200">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                Rendering Print Layout...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
