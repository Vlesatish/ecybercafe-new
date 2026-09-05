import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CustomerPhotoItem,
  PassportPreset,
  CustomSizeSettings,
  CropState,
  TuneSettings,
  BackgroundSettings,
  SuitOverlay,
  TextSettings,
  BorderSettings,
  PrintSheetSettings,
  EditorTab
} from '../../lib/passportPhoto/types.js';
import {
  DEFAULT_TUNE_SETTINGS,
  DEFAULT_BACKGROUND_SETTINGS,
  DEFAULT_TEXT_SETTINGS,
  DEFAULT_BORDER_SETTINGS,
  DEFAULT_SHEET_SETTINGS,
  PASSPORT_SIZE_PRESETS
} from '../../lib/passportPhoto/constants.js';
import { createDefaultCropState, getInitialCenteredCrop } from '../../lib/passportPhoto/cropEngine.js';
import { loadFileAsImage, createTrackedBlobUrl } from '../../lib/passportPhoto/imageLoader.js';
import { renderPassportPhoto } from '../../lib/passportPhoto/canvasRenderer.js';
import { removeBackgroundApi } from '../../lib/passportPhoto/backgroundApi.js';
import { clearSavedProject } from '../../lib/passportPhoto/projectStorage.js';
import { getPhotoDimensionsMm, calculatePrintSheetLayout } from '../../lib/passportPhoto/printLayoutEngine.js';
import {
  downloadSheetImage,
  downloadSheetPdf,
  printSheetDirectly
} from '../../lib/passportPhoto/exportEngine.js';

import { PassportToolbar } from './PassportToolbar.js';
import { SizePresetPanel } from './SizePresetPanel.js';
import { PassportCropEditor } from './PassportCropEditor.js';
import { TunePanel } from './TunePanel.js';
import { BackgroundPanel } from './BackgroundPanel.js';
import { AdvancedEraser } from './AdvancedEraser.js';
import { SuitOverlayPanel } from './SuitOverlayPanel.js';
import { PhotoTextPanel } from './PhotoTextPanel.js';
import { BorderPanel } from './BorderPanel.js';
import { PrintQueuePanel } from './PrintQueuePanel.js';
import { PrintSheetSettingsPanel } from './PrintSheetSettings.js';
import { PrintSheetPreview } from './PrintSheetPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PassportUploadPanel } from './PassportUploadPanel.js';
import { BeforeAfterSlider } from './BeforeAfterSlider.js';
import { ProcessingOverlay } from './ProcessingOverlay.js';
import { GeneratedSheetModal } from './GeneratedSheetModal.js';

import {
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Check,
  ArrowRight,
  Edit3,
  FileSpreadsheet,
  Sliders,
  Maximize2
} from 'lucide-react';

interface PassportPhotoWorkspaceProps {
  onCloseModal?: () => void;
}

export const PassportPhotoWorkspace: React.FC<PassportPhotoWorkspaceProps> = ({
  onCloseModal
}) => {
  const [queue, setQueue] = useState<CustomerPhotoItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'sheet'>('editor');
  const [activeTab, setActiveTab] = useState<EditorTab>('size');
  const [leftEditorView, setLeftEditorView] = useState<'crop' | 'preview'>('crop');
  const [isManualMode, setIsManualMode] = useState(false);
  const [sheetSettings, setSheetSettings] = useState<PrintSheetSettings>(DEFAULT_SHEET_SETTINGS);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null);
  const [isComparingBeforeAfter, setIsComparingBeforeAfter] = useState(false);
  const [liveCanvasDataUrl, setLiveCanvasDataUrl] = useState<string>('');
  const [isGeneratedModalOpen, setIsGeneratedModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeItem = queue.find(it => it.id === activeItemId) || queue[0] || null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // When closing/cutting the studio modal, ensure storage is cleanly wiped
  // so that reopening is always 100% brand new and fresh
  useEffect(() => {
    return () => {
      clearSavedProject().catch(() => {});
    };
  }, []);

  // Handler to clear all customer photos and start completely fresh
  const handleStartFresh = useCallback(async () => {
    // Revoke object URLs in queue to free up memory
    queue.forEach(item => {
      if (item.originalImageUrl && item.originalImageUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.originalImageUrl); } catch (_) {}
      }
      if (item.transparentForegroundUrl && item.transparentForegroundUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.transparentForegroundUrl); } catch (_) {}
      }
    });

    try {
      await clearSavedProject();
    } catch (_) {}

    setQueue([]);
    setActiveItemId(null);
    setViewMode('editor');
    setActiveTab('size');
    setSheetSettings(DEFAULT_SHEET_SETTINGS);
    setIsComparingBeforeAfter(false);
    showToast('Cleared! Ready for a new photo.');
  }, [queue]);

  // Update active item in queue
  const updateActiveItem = useCallback((updater: (prev: CustomerPhotoItem) => CustomerPhotoItem) => {
    if (!activeItemId) return;
    setQueue(prevQueue =>
      prevQueue.map(item => (item.id === activeItemId ? updater(item) : item))
    );
  }, [activeItemId]);

  // Add loaded file to queue: FIRST OPENS PHOTO EDITOR!
  const handleAddFilesToQueue = async (files: File[]) => {
    setIsProcessing(true);
    setProcessingMessage('Importing uploaded portrait photo...');
    try {
      const newItems: CustomerPhotoItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const loaded = await loadFileAsImage(file);
        const preset = PASSPORT_SIZE_PRESETS[1]; // India Passport 3.5x4.5 default
        const initialCrop = getInitialCenteredCrop(loaded.width, loaded.height, preset.widthMm / preset.heightMm);

        const newItem: CustomerPhotoItem = {
          id: 'photo_' + Date.now() + '_' + i,
          name: file.name.replace(/\.[^/.]+$/, ''),
          originalImageUrl: loaded.objectUrl || '',
          originalImageBlob: file,
          crop: {
            crop: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0,
            flipH: false,
            croppedAreaPixels: initialCrop
          },
          presetId: preset.id,
          tune: { ...DEFAULT_TUNE_SETTINGS },
          background: { ...DEFAULT_BACKGROUND_SETTINGS },
          text: { ...DEFAULT_TEXT_SETTINGS },
          border: { ...DEFAULT_BORDER_SETTINGS },
          copies: 6,
          createdAt: Date.now()
        };

        newItems.push(newItem);
      }

      setQueue(prev => [...prev, ...newItems]);
      if (newItems.length > 0) {
        setActiveItemId(newItems[0].id);
      }
      // Mandatory requirement: after upload, DO NOT immediately add to sheet, FIRST OPEN PHOTO EDITOR!
      setViewMode('editor');
      setActiveTab('size');
      setLeftEditorView('crop');
    } catch (err) {
      console.error('Error adding file to queue:', err);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Sample portrait generator for instant testing
  const handleUseSampleImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Soft studio background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 750);
    bgGrad.addColorStop(0, '#CBD5E1');
    bgGrad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 750);

    // Body / Shoulders
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(300, 720, 240, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // White collar
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(270, 560);
    ctx.lineTo(300, 640);
    ctx.lineTo(330, 560);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#E2B18E';
    ctx.fillRect(260, 480, 80, 100);

    // Face
    ctx.fillStyle = '#F5CBA7';
    ctx.beginPath();
    ctx.ellipse(300, 360, 130, 170, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#262626';
    ctx.beginPath();
    ctx.ellipse(300, 240, 140, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(250, 350, 14, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(350, 350, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(300, 430, 35, 0.2, Math.PI - 0.2);
    ctx.stroke();

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'candidate_sample_photo.jpg', { type: 'image/jpeg' });
        handleAddFilesToQueue([file]);
      }
    }, 'image/jpeg', 0.95);
  };

  // Live photo preview renderer
  useEffect(() => {
    if (!activeItem) return;
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const dim = getPhotoDimensionsMm(activeItem);
        const wPx = 420;
        const hPx = Math.round(wPx * (dim.heightMm / dim.widthMm));

        const rendered = await renderPassportPhoto(activeItem, {
          width: wPx,
          height: hPx,
          dpi: 300
        });

        if (isCancelled) return;
        const dataUrl = rendered.toDataURL('image/jpeg', 0.92);
        setLiveCanvasDataUrl(dataUrl);

        if (previewCanvasRef.current) {
          const cvs = previewCanvasRef.current;
          cvs.width = rendered.width;
          cvs.height = rendered.height;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(rendered, 0, 0);
          }
        }
      } catch (err) {
        console.warn('Could not render live passport photo:', err);
      }
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeItem]);

  // AI Background Removal execution
  const handleTriggerRemoveBackground = async () => {
    if (!activeItem) return;

    setBgRemovalError(null);
    setIsProcessing(true);
    setProcessingMessage('AI Background Removal in progress...');

    abortControllerRef.current = new AbortController();

    try {
      let imageBlob = activeItem.originalImageBlob;
      if (!imageBlob && activeItem.originalImageUrl) {
        const res = await fetch(activeItem.originalImageUrl);
        imageBlob = await res.blob();
      }

      if (!imageBlob) {
        throw new Error('Image data not found');
      }

      const result = await removeBackgroundApi(imageBlob, abortControllerRef.current.signal);

      if (result.success && result.transparentUrl) {
        updateActiveItem(item => ({
          ...item,
          transparentForegroundUrl: result.transparentUrl,
          transparentForegroundBlob: result.transparentBlob,
          background: {
            ...item.background,
            mode: 'color',
            color: item.background.color || '#FFFFFF'
          }
        }));
        showToast('Background removed successfully! You can pick colors or adjust edges.');
      } else {
        setBgRemovalError(result.error || 'Could not remove background automatically.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setBgRemovalError('Background removal failed. You can still use the manual Eraser brush.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
  };

  const handleRestoreOriginalBackground = () => {
    updateActiveItem(item => ({
      ...item,
      background: {
        ...item.background,
        mode: 'original'
      }
    }));
  };

  // Dimensions & Sheet calculations
  const photoDim = activeItem ? getPhotoDimensionsMm(activeItem) : { widthMm: 35, heightMm: 45 };
  const photoAspect = photoDim.widthMm / photoDim.heightMm;
  const layout = calculatePrintSheetLayout(sheetSettings, queue);

  // ACTION: "Add to Queue" (Renders final processed image state and navigates to Print Queue / A4 sheet)
  const handleAddToQueue = async () => {
    if (!activeItem) return;
    setIsProcessing(true);
    setProcessingMessage('Rendering finalized high-resolution passport photo...');

    try {
      const dim = getPhotoDimensionsMm(activeItem);
      // High-resolution 300 DPI render for printing & preview
      const targetWidthPx = Math.round((dim.widthMm / 25.4) * 300);
      const targetHeightPx = Math.round((dim.heightMm / 25.4) * 300);

      const finalCanvas = await renderPassportPhoto(activeItem, {
        width: targetWidthPx,
        height: targetHeightPx,
        dpi: 300
      });

      const finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.96);

      // Save processed image state in queue item
      updateActiveItem(item => ({
        ...item,
        renderedDataUrl: finalDataUrl
      }));

      // Switch view to Print Queue & A4 Live Sheet Preview
      setViewMode('sheet');
      showToast(`"${activeItem.name}" finalized and added to Print Queue!`);
    } catch (err) {
      console.error('Error rendering finalized photo:', err);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleFillSheet = () => {
    if (queue.length === 0) return;
    const targetCapacity = layout.capacity;
    if (queue.length === 1) {
      setQueue(prev => [{ ...prev[0], copies: targetCapacity }]);
    } else {
      const otherCopies = queue
        .filter(q => q.id !== activeItemId)
        .reduce((sum, q) => sum + (q.copies || 1), 0);
      const needed = Math.max(1, targetCapacity - otherCopies);
      setQueue(prev => prev.map(q => (q.id === activeItemId ? { ...q, copies: needed } : q)));
    }
    showToast(`Sheet filled to capacity (${layout.capacity} photos).`);
  };

  const handleAddNewCustomer = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = e => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleAddFilesToQueue(Array.from(files));
      }
    };
    input.click();
  };

  const handleReEditItem = (id: string) => {
    setActiveItemId(id);
    setViewMode('editor');
    setActiveTab('size');
  };

  return (
    <div id="passport-photo-workspace" className="flex flex-col h-full max-w-7xl mx-auto">
      {/* Loading Overlay */}
      <ProcessingOverlay
        isProcessing={isProcessing}
        message={processingMessage}
        onCancel={handleCancelProcessing}
      />

      {/* Generated Print Sheet Modal */}
      <GeneratedSheetModal
        isOpen={isGeneratedModalOpen}
        onClose={() => setIsGeneratedModalOpen(false)}
        settings={sheetSettings}
        queue={queue}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Area */}
      {queue.length === 0 ? (
        /* Empty State: Upload Panel */
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <PassportUploadPanel
            onFilesSelected={handleAddFilesToQueue}
            onUseSampleImage={handleUseSampleImage}
          />
        </div>
      ) : viewMode === 'editor' && activeItem ? (
        /* ============================================================ */
        /* 1. PHOTO EDITOR VIEW (Left = Large Editor/Preview, Right = Tools) */
        /* ============================================================ */
        <div className="flex-1 flex flex-col space-y-3 p-3 sm:p-5 overflow-hidden min-h-0">
          {/* Top Bar for Editor */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800">
                Photo Editor: <span className="text-indigo-600 font-mono">{activeItem.name}</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                {photoDim.widthMm.toFixed(1)} × {photoDim.heightMm.toFixed(1)} mm
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Manual Mode Toggle */}
              <button
                type="button"
                id="passport-manual-mode-toggle"
                onClick={() => setIsManualMode(!isManualMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isManualMode
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Manual Mode: {isManualMode ? 'ON' : 'OFF'}
              </button>

              {/* Back to Print Sheet button (if queue has photos) */}
              {queue.length > 0 && (
                <button
                  type="button"
                  id="editor-view-sheet-btn"
                  onClick={() => setViewMode('sheet')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  View Print Sheet ({queue.reduce((s, it) => s + (it.copies || 1), 0)} Photos)
                </button>
              )}

              {/* Start Fresh / Clear Current Session */}
              <button
                type="button"
                id="editor-start-fresh-btn"
                onClick={handleStartFresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                title="Clear all photos and start completely fresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                New / Fresh Start
              </button>
            </div>
          </div>

          {/* Desktop 2-Column Layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden min-h-0">
            {/* LEFT COLUMN: Large Photo Preview / Interactive Editor */}
            <div className="lg:w-5/12 flex flex-col space-y-3 shrink-0">
              {/* Left View Mode Switch (Crop & Biometric Frame vs Live Rendered Result) */}
              <div className="flex items-center justify-between p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLeftEditorView('crop')}
                    className={`px-3 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
                      leftEditorView === 'crop'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Crop & Biometric Frame
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftEditorView('preview')}
                    className={`px-3 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
                      leftEditorView === 'preview'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Live Rendered Photo
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsComparingBeforeAfter(!isComparingBeforeAfter)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    isComparingBeforeAfter
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isComparingBeforeAfter ? 'Close Compare' : 'Before / After'}
                </button>
              </div>

              {/* Viewport Box */}
              <div className="flex-1 bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-inner overflow-hidden min-h-[380px]">
                {isComparingBeforeAfter ? (
                  /* Before/After Split Comparison View */
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <BeforeAfterSlider
                      beforeSrc={activeItem.originalImageUrl}
                      afterCanvasDataUrl={liveCanvasDataUrl}
                      aspectRatio={photoAspect}
                    />
                  </div>
                ) : leftEditorView === 'crop' ? (
                  /* Cropper Viewport with Biometric Guidelines */
                  <div className="w-full h-full flex items-center justify-center">
                    <PassportCropEditor
                      imageSrc={activeItem.originalImageUrl}
                      cropState={activeItem.crop}
                      targetAspect={photoAspect}
                      onChangeCropState={newCrop =>
                        updateActiveItem(item => ({
                          ...item,
                          crop: newCrop
                        }))
                      }
                    />
                  </div>
                ) : (
                  /* Live Rendered Canvas Result View */
                  <div className="relative flex items-center justify-center max-h-full max-w-full">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-h-[360px] sm:max-h-[420px] max-w-full rounded-xl shadow-2xl object-contain border border-slate-700/50"
                      style={{ aspectRatio: `${photoAspect}` }}
                    />

                    {/* Active Dimension Badge */}
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-[11px] font-mono text-slate-200">
                      {photoDim.widthMm.toFixed(1)} × {photoDim.heightMm.toFixed(1)} mm • 300 DPI
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Editing Tools & Control Panel */}
            <div className="lg:w-7/12 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Editor Tabs Toolbar (1. Size, 2. Dress, 3. Erase, 4. Color, 5. Info, 6. Border, Enhance) */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <PassportToolbar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  activeItem={activeItem}
                  queueCount={queue.length}
                />
              </div>

              {/* Active Tab Panel Content */}
              <div className="p-4 flex-1 overflow-y-auto max-h-[520px]">
                {/* 1. SIZE TAB */}
                {activeTab === 'size' && (
                  <SizePresetPanel
                    selectedPresetId={activeItem.presetId}
                    onSelectPreset={preset => {
                      updateActiveItem(item => ({
                        ...item,
                        presetId: preset.id,
                        customSize: undefined
                      }));
                      setLeftEditorView('crop');
                    }}
                    customSize={activeItem.customSize}
                    onChangeCustomSize={custom => {
                      updateActiveItem(item => ({
                        ...item,
                        presetId: 'custom',
                        customSize: custom
                      }));
                      setLeftEditorView('crop');
                    }}
                  />
                )}

                {/* 2. DRESS & SUIT TAB */}
                {activeTab === 'dress' && (
                  <SuitOverlayPanel
                    currentSuit={activeItem.suit}
                    onChangeSuit={suit => {
                      updateActiveItem(item => ({
                        ...item,
                        suit
                      }));
                      setLeftEditorView('preview');
                    }}
                  />
                )}

                {/* 3. ERASE & MASK TAB */}
                {activeTab === 'erase' && (
                  <AdvancedEraser
                    imageSrc={activeItem.transparentForegroundUrl || activeItem.originalImageUrl}
                    initialMaskDataUrl={activeItem.maskCanvasDataUrl}
                    aspectRatio={photoAspect}
                    onSaveMask={maskDataUrl => {
                      updateActiveItem(item => ({
                        ...item,
                        maskCanvasDataUrl: maskDataUrl
                      }));
                      setLeftEditorView('preview');
                    }}
                    onClearMask={() => {
                      updateActiveItem(item => ({
                        ...item,
                        maskCanvasDataUrl: undefined
                      }));
                    }}
                  />
                )}

                {/* 4. COLOR & BACKGROUND TAB */}
                {activeTab === 'color' && (
                  <BackgroundPanel
                    background={activeItem.background}
                    onChangeBackground={newBg => {
                      updateActiveItem(item => ({
                        ...item,
                        background: newBg
                      }));
                      setLeftEditorView('preview');
                    }}
                    hasTransparentForeground={Boolean(activeItem.transparentForegroundUrl)}
                    onTriggerRemoveBackground={handleTriggerRemoveBackground}
                    isRemovingBackground={isProcessing}
                    onRestoreOriginal={handleRestoreOriginalBackground}
                    errorMessage={bgRemovalError}
                  />
                )}

                {/* 5. INFO / CANDIDATE NAME & DOP TAB */}
                {activeTab === 'text' && (
                  <PhotoTextPanel
                    text={activeItem.text}
                    onChangeText={newText => {
                      updateActiveItem(item => ({
                        ...item,
                        text: newText
                      }));
                      setLeftEditorView('preview');
                    }}
                  />
                )}

                {/* 6. BORDER TAB */}
                {activeTab === 'border' && (
                  <BorderPanel
                    border={activeItem.border}
                    onChangeBorder={newBorder => {
                      updateActiveItem(item => ({
                        ...item,
                        border: newBorder
                      }));
                      setLeftEditorView('preview');
                    }}
                  />
                )}

                {/* ENHANCE / TUNE TAB */}
                {activeTab === 'tune' && (
                  <TunePanel
                    tune={activeItem.tune}
                    onChangeTune={newTune => {
                      updateActiveItem(item => ({
                        ...item,
                        tune: newTune
                      }));
                      setLeftEditorView('preview');
                    }}
                    onToggleCompare={() => setIsComparingBeforeAfter(!isComparingBeforeAfter)}
                    isComparing={isComparingBeforeAfter}
                  />
                )}
              </div>

              {/* Bottom Sticky Action: MAIN GREEN ACTION BUTTON: "Add to Queue" */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Ready to print? Finalize photo and add to A4 sheet queue
                </div>

                <button
                  type="button"
                  id="passport-add-to-queue-btn"
                  onClick={handleAddToQueue}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Add to Queue</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. PRINT QUEUE & A4 LIVE PRINT PREVIEW VIEW */
        /* ============================================================ */
        <div className="flex-1 flex flex-col space-y-3 p-3 sm:p-5 overflow-hidden min-h-0">
          {/* Top Bar for Print Sheet */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                A4 Passport Photo Print Sheet
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold">
                {layout.slots.length} Photos Placed / Capacity: {layout.capacity}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Re-open Editor Button */}
              {activeItem && (
                <button
                  type="button"
                  id="sheet-back-to-editor-btn"
                  onClick={() => {
                    setViewMode('editor');
                    setActiveTab('size');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  ← Back to Photo Editor
                </button>
              )}

              {/* Fill Sheet Button */}
              <button
                type="button"
                id="sheet-fill-capacity-btn"
                onClick={handleFillSheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Fill Sheet
              </button>

              {/* Download HD Button (Opens Generated Sheet Modal) */}
              <button
                type="button"
                id="sheet-download-hd-btn"
                onClick={() => setIsGeneratedModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download HD / Print
              </button>

              {/* Start Fresh / Clear All Photos */}
              <button
                type="button"
                id="sheet-start-fresh-btn"
                onClick={handleStartFresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                title="Clear all photos and start completely fresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                New / Fresh Start
              </button>
            </div>
          </div>

          {/* 2-Column Responsive Layout: Left = Queue, Right = A4 Preview */}
          <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden min-h-0">
            {/* LEFT COLUMN: Print Queue Panel */}
            <div className="lg:w-4/12 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs p-4 overflow-y-auto">
              <PrintQueuePanel
                queue={queue}
                activeItemId={activeItemId}
                onSelectActiveItem={setActiveItemId}
                onUpdateCopies={(id, copies) => {
                  setQueue(prev =>
                    prev.map(it => (it.id === id ? { ...it, copies } : it))
                  );
                }}
                onRemoveItem={id => {
                  setQueue(prev => {
                    const next = prev.filter(it => it.id !== id);
                    if (next.length > 0 && activeItemId === id) {
                      setActiveItemId(next[0].id);
                    }
                    return next;
                  });
                }}
                onReEditItem={handleReEditItem}
                onAddNewCustomer={handleAddNewCustomer}
                onClearQueue={handleStartFresh}
                sheetCapacity={layout.capacity}
              />
            </div>

            {/* RIGHT COLUMN: A4 Live Print Preview & Sheet Settings */}
            <div className="lg:w-8/12 flex flex-col space-y-4 overflow-y-auto pr-1">
              {/* Live A4 Print Preview Viewport */}
              <div className="p-4 bg-slate-900 rounded-2xl shadow-inner flex items-center justify-center min-h-[440px]">
                <PrintSheetPreview
                  settings={sheetSettings}
                  queue={queue}
                  onFillSheet={handleFillSheet}
                />
              </div>

              {/* Action Bar (Download HD, Print, PDF, JPG) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-800">
                  Export Options (300 DPI High-Definition)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="quick-download-jpg-btn"
                    onClick={async () => {
                      await downloadSheetImage(sheetSettings, queue, 'jpg');
                      showToast('A4 sheet JPG downloaded at 300 DPI.');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    JPG
                  </button>

                  <button
                    type="button"
                    id="quick-download-pdf-btn"
                    onClick={async () => {
                      await downloadSheetPdf(sheetSettings, queue);
                      showToast('Print-ready A4 PDF downloaded.');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    PDF
                  </button>

                  <button
                    type="button"
                    id="quick-print-btn"
                    onClick={async () => {
                      await printSheetDirectly(sheetSettings, queue);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Print
                  </button>

                  <button
                    type="button"
                    id="open-generated-modal-btn"
                    onClick={() => setIsGeneratedModalOpen(true)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Download HD Modal
                  </button>
                </div>
              </div>

              {/* Sheet Margins, Gaps & Orientation Controls */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <PrintSheetSettingsPanel
                  settings={sheetSettings}
                  onChangeSettings={setSheetSettings}
                  calculatedCols={layout.cols}
                  calculatedRows={layout.rows}
                  capacity={layout.capacity}
                  totalRequested={layout.totalRequested}
                  onFillSheet={handleFillSheet}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
