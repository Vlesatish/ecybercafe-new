import React, { useState, useRef, useEffect } from 'react';
import Sortable from 'sortablejs';
import confetti from 'canvas-confetti';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  RotateCw,
  RotateCcw,
  Trash2,
  Download,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  X,
  FileCheck,
  RefreshCw,
  FileDown
} from 'lucide-react';
import {
  JpgToPdfQueueItem,
  JpgToPdfSettings,
  PageMarginOption,
  PageOrientationOption,
  PageSizeOption,
  QualityOption
} from '../../types/jpgToPdf';
import {
  analyzeUploadedFile,
  formatBytes,
  generateCombinedPdf,
  generateSingleItemPdf
} from '../../lib/jpgToPdf/jpgToPdfEngine';

interface JpgToPdfWorkspaceProps {
  onBackToHome?: () => void;
  onNavigateToCompressor?: () => void;
  onNavigateToPdfPageManager?: () => void;
  onNavigateToPassport?: () => void;
  onNavigateToIDCard?: () => void;
}

export const JpgToPdfWorkspace: React.FC<JpgToPdfWorkspaceProps> = ({
  onBackToHome,
  onNavigateToCompressor,
  onNavigateToPdfPageManager,
  onNavigateToPassport,
  onNavigateToIDCard
}) => {
  const [queue, setQueue] = useState<JpgToPdfQueueItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Settings
  const [settings, setSettings] = useState<JpgToPdfSettings>({
    pageSize: 'fit',
    orientation: 'auto',
    margin: 'none',
    quality: 'high',
    customFileName: 'combined_document.pdf'
  });
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Combine generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0, message: '' });
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [generatedPdfSize, setGeneratedPdfSize] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox preview
  const [previewItem, setPreviewItem] = useState<JpgToPdfQueueItem | null>(null);

  // Ref for Sortable container
  const cardsContainerRef = useRef<HTMLDivElement | null>(null);
  const sortableInstanceRef = useRef<Sortable | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize SortableJS
  useEffect(() => {
    if (!cardsContainerRef.current) return;

    if (sortableInstanceRef.current) {
      sortableInstanceRef.current.destroy();
      sortableInstanceRef.current = null;
    }

    sortableInstanceRef.current = new Sortable(cardsContainerRef.current, {
      animation: 220,
      draggable: '.queue-card',
      filter: '.no-drag, button, a, input, select, textarea',
      preventOnFilter: false,
      forceFallback: true,
      fallbackClass: 'sortable-card-fallback',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      touchStartThreshold: 3,
      delay: 0,
      delayOnTouchOnly: true,
      ghostClass: 'sortable-card-ghost',
      chosenClass: 'sortable-card-chosen',
      dragClass: 'sortable-card-drag',
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt;
        if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
          setQueue((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(oldIndex, 1);
            updated.splice(newIndex, 0, moved);
            return updated;
          });
        }
      }
    });

    return () => {
      if (sortableInstanceRef.current) {
        sortableInstanceRef.current.destroy();
        sortableInstanceRef.current = null;
      }
    };
  }, [queue.length]);

  // Handle file addition
  const handleFilesAdded = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setIsProcessingUploads(true);
    setErrorMessage(null);
    setDownloadBlobUrl(null);

    const newItems: JpgToPdfQueueItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgressText(`Scanning ${i + 1} of ${fileArray.length}: ${file.name}...`);
      try {
        const item = await analyzeUploadedFile(file);
        newItems.push(item);
      } catch (err: any) {
        console.error('Error analyzing file:', file.name, err);
      }
    }

    setQueue((prev) => [...prev, ...newItems]);
    setIsProcessingUploads(false);
    setUploadProgressText('');
  };

  // Reordering helpers
  const moveItem = (index: number, direction: 'left' | 'right') => {
    setQueue((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Rotation
  const rotateItem = (id: string, delta: number) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newRotation = (item.rotation + delta + 360) % 360;
        return { ...item, rotation: newRotation };
      })
    );
  };

  // Remove individual item
  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear entire queue
  const clearQueue = () => {
    if (queue.length === 0) return;
    if (window.confirm('Are you sure you want to clear all files from the queue?')) {
      setQueue([]);
      setDownloadBlobUrl(null);
      setErrorMessage(null);
    }
  };

  // Download individual single item as PDF
  const handleDownloadSingle = async (item: JpgToPdfQueueItem) => {
    try {
      const singleBytes = await generateSingleItemPdf(item, settings);
      const blob = new Blob(
        [singleBytes.buffer.slice(singleBytes.byteOffset, singleBytes.byteOffset + singleBytes.byteLength) as ArrayBuffer],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = item.fileName.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}_converted.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Could not convert ${item.fileName}: ${err.message}`);
    }
  };

  // Generate combined PDF
  const handleGenerateCombined = async () => {
    if (queue.length === 0) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setDownloadBlobUrl(null);

    try {
      const pdfBytes = await generateCombinedPdf(queue, settings, (p) => {
        setGenerateProgress(p);
      });

      const blob = new Blob(
        [pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer],
        { type: 'application/pdf' }
      );
      const blobUrl = URL.createObjectURL(blob);

      const outName = settings.customFileName?.trim() || `combined_${Date.now()}.pdf`;
      setDownloadBlobUrl(blobUrl);
      setDownloadFileName(outName);
      setGeneratedPdfSize(formatBytes(blob.size));

      // Trigger auto download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = outName.endsWith('.pdf') ? outName : `${outName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.85 }
        });
      } catch (e) {
        // Confetti non-critical
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate combined PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Statistics
  const imageCount = queue.filter((i) => i.type === 'image').length;
  const pdfCount = queue.filter((i) => i.type === 'pdf').length;
  const totalPagesEst = queue.reduce((acc, curr) => acc + (curr.pageCount || 1), 0);
  const totalRawBytes = queue.reduce((acc, curr) => acc + curr.fileSize, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-36">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>JPG to PDF & Combiner</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] tracking-wide uppercase">
                  HOT • JPG2PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Convert multiple JPGs & PDFs, drag to arrange serial sequence, and download all in 1 combined PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showSettingsPanel
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>PDF Settings</span>
            </button>

            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Clear all files from queue"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Queue</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Settings Panel (Collapsible or toggleable) */}
        {showSettingsPanel && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-900">PDF Layout & Page Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Page Size */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Page Size</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['fit', 'a4', 'letter'] as PageSizeOption[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, pageSize: size }))}
                      className={`py-1.5 px-2 rounded-lg font-bold uppercase text-[11px] transition-all cursor-pointer ${
                        settings.pageSize === size
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {size === 'fit' ? 'Fit Image' : size}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {settings.pageSize === 'fit' ? 'No white bars, exact aspect ratio' : 'Standard printing sheet'}
                </p>
              </div>

              {/* Orientation */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Page Orientation</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['auto', 'portrait', 'landscape'] as PageOrientationOption[]).map((ori) => (
                    <button
                      key={ori}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, orientation: ori }))}
                      className={`py-1.5 px-2 rounded-lg font-bold capitalize text-[11px] transition-all cursor-pointer ${
                        settings.orientation === ori
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ori}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Auto picks orientation matching each image</p>
              </div>

              {/* Margins */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Page Margins</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['none', 'small', 'standard'] as PageMarginOption[]).map((margin) => (
                    <button
                      key={margin}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, margin }))}
                      className={`py-1.5 px-2 rounded-lg font-bold capitalize text-[11px] transition-all cursor-pointer ${
                        settings.margin === margin
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {margin === 'none' ? 'None (0mm)' : margin === 'small' ? '5mm' : '12mm'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Print border spacing around photos</p>
              </div>

              {/* Output File Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Combined File Name</label>
                <input
                  type="text"
                  value={settings.customFileName || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, customFileName: e.target.value }))}
                  placeholder="combined_document.pdf"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Auto appends .pdf extension</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Zone (The classic jpg2pdf.com dropzone) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files) {
              handleFilesAdded(e.dataTransfer.files);
            }
          }}
          className={`rounded-3xl border-2 border-dashed p-6 sm:p-10 text-center transition-all ${
            isDraggingOver
              ? 'border-blue-500 bg-blue-50/80 scale-[1.005]'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg,image/png,image/webp,image/bmp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.pdf,.bmp,.gif"
            onChange={(e) => {
              if (e.target.files) {
                handleFilesAdded(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
            id="multi-file-input"
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Drop Your Files Here
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Add multiple JPG, PNG, WEBP images and multi-page PDF documents together.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingUploads}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                <span>UPLOAD FILES</span>
              </button>

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4 text-slate-500" />
                  <span>CLEAR QUEUE</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold pt-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">JPG</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">PNG</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">WEBP</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">BMP</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">PDF</span>
              <span className="text-slate-300">•</span>
              <span>100% Client-Side Processing</span>
            </div>
          </div>
        </div>

        {/* Upload Scanning Progress */}
        {isProcessingUploads && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-xs font-bold text-blue-800">{uploadProgressText}</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <p className="font-bold">Conversion Notice</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Banner if Combined PDF Ready */}
        {downloadBlobUrl && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="font-black text-base tracking-tight">Combined PDF Generated Successfully!</p>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  File: <span className="font-bold text-white">{downloadFileName}</span> ({generatedPdfSize}) • All images & pages merged in your chosen serial order.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={downloadBlobUrl}
                download={downloadFileName}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  if (downloadBlobUrl) {
                    window.open(downloadBlobUrl, '_blank');
                  }
                }}
                className="px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        )}

        {/* Queue Items Section */}
        {queue.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black text-base text-slate-900">
                    File Queue ({queue.length} files)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center gap-1 shadow-xs">
                    <span>🖱️</span> माउस दबाकर कार्ड ड्रैग करें (Drag anywhere on card)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  The files will appear in this exact top-to-bottom / left-to-right order in your final PDF.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>{imageCount} Images</span>
                <span>•</span>
                <span>{pdfCount} PDFs</span>
                <span>•</span>
                <span>{totalPagesEst} Total Pages</span>
              </div>
            </div>

            {/* Draggable Cards Grid */}
            <div
              ref={cardsContainerRef}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  data-id={item.id}
                  className="queue-card bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col overflow-hidden group select-none relative cursor-grab active:cursor-grabbing"
                >
                  {/* Top Bar on Card: Serial #, Drag Handle & Quick Actions */}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        #{index + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {item.type === 'pdf' ? `PDF • ${item.pageCount}p` : 'IMAGE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                        className="no-drag p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Preview page lightbox"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="no-drag p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove file from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div
                        className="p-1 rounded-md text-slate-400 pointer-events-none"
                        title="Drag to change sequence"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Container: Drag anywhere by pressing mouse */}
                  <div
                    className="relative aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.fileName}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ transform: `rotate(${item.rotation}deg)` }}
                        className="max-h-full max-w-full object-contain pointer-events-none select-none transition-transform duration-200"
                      />
                    ) : (
                      <div className="text-center p-4 pointer-events-none select-none">
                        {item.type === 'pdf' ? (
                          <FileText className="w-10 h-10 text-rose-400 mx-auto" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-blue-400 mx-auto" />
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block">No preview</span>
                      </div>
                    )}

                    {/* Hover overlay with Eye preview button */}
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                        className="no-drag pointer-events-auto px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-xl hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Preview</span>
                      </button>
                    </div>

                    {/* Rotation indicator badge if rotated */}
                    {item.rotation > 0 && (
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] shadow-xs pointer-events-none">
                        {item.rotation}°
                      </span>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-800 truncate" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.fileSizeFormatted}
                        {item.width && item.height ? ` • ${item.width}x${item.height}px` : ''}
                      </p>
                    </div>

                    {/* Action Buttons on Card (Rotate, Move, Download Single) */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      {/* Move left/right */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(index, 'left');
                          }}
                          className="no-drag p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          title="Move left (earlier in PDF)"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === queue.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(index, 'right');
                          }}
                          className="no-drag p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          title="Move right (later in PDF)"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Rotate */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateItem(item.id, 90);
                        }}
                        className="no-drag p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                        title="Rotate 90° clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rotate</span>
                      </button>

                      {/* Download single PDF button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(item);
                        }}
                        className="no-drag p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                        title="Convert and download only this file as PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Single</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state guidance */}
        {queue.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6">
            <div className="max-w-2xl mx-auto space-y-2">
              <h2 className="text-base font-black text-slate-800">
                How JPG to PDF Combiner Works (Just like jpg2pdf.com)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Combine your scanned photos, documents, receipts, marksheet images and existing PDF files into a single organized PDF document in 3 easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center mb-2">
                  1
                </div>
                <h4 className="text-xs font-black text-slate-800">Upload Files</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select up to 50+ JPG, PNG, WEBP images or PDF files all at once.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center mb-2">
                  2
                </div>
                <h4 className="text-xs font-black text-slate-800">Arrange Serial</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Drag cards to set the exact sequence or rotate pages with 1 click.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center mb-2">
                  3
                </div>
                <h4 className="text-xs font-black text-slate-800">Download Combined</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click the bottom COMBINED button to download your merged PDF.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links / Related Cyber Cafe Tools */}
        <div className="bg-slate-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>More Cyber Cafe PDF & Image Tools:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToPdfPageManager && (
              <button
                type="button"
                onClick={onNavigateToPdfPageManager}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              >
                📑 PDF Page Manager (Reorder/Delete Pages)
              </button>
            )}
            {onNavigateToCompressor && (
              <button
                type="button"
                onClick={onNavigateToCompressor}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              >
                🗜️ PDF & Image Compressor (100KB/200KB)
              </button>
            )}
            {onNavigateToPassport && (
              <button
                type="button"
                onClick={onNavigateToPassport}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              >
                📷 Passport Photo Studio
              </button>
            )}
            {onNavigateToIDCard && (
              <button
                type="button"
                onClick={onNavigateToIDCard}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              >
                🪪 ID Card Studio
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ICONIC BOTTOM ACTION BAR (Directly fulfills user's "dowbload boottom aall image nad pdf in pdf") */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Summary */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                {queue.length}
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-slate-900">
                  {queue.length === 0
                    ? 'No files in queue yet'
                    : `${queue.length} items (${imageCount} images, ${pdfCount} PDFs)`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {queue.length === 0
                    ? 'Upload images or PDFs above to begin'
                    : `${totalPagesEst} total pages • Raw size: ${formatBytes(totalRawBytes)}`}
                </p>
              </div>
            </div>

            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer sm:ml-4"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More</span>
              </button>
            )}
          </div>

          {/* COMBINED Action Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={queue.length === 0 || isGenerating}
              onClick={handleGenerateCombined}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 ${
                queue.length === 0 || isGenerating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white hover:shadow-blue-500/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>
                    COMBINING... {generateProgress.total > 0 ? `(${generateProgress.current}/${generateProgress.total})` : ''}
                  </span>
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 text-amber-300" />
                  <span>COMBINED (DOWNLOAD ALL IN 1 PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar during generation */}
        {isGenerating && (
          <div className="max-w-7xl mx-auto mt-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 mb-1">
              <span>{generateProgress.message || 'Generating Combined PDF...'}</span>
              <span>
                {generateProgress.total > 0
                  ? `${Math.round((generateProgress.current / generateProgress.total) * 100)}%`
                  : 'Processing...'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width:
                    generateProgress.total > 0
                      ? `${(generateProgress.current / generateProgress.total) * 100}%`
                      : '30%'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Full Preview */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-black text-sm text-slate-900 truncate">{previewItem.fileName}</p>
                <p className="text-xs text-slate-400">
                  {previewItem.fileSizeFormatted} • {previewItem.type === 'pdf' ? `PDF (${previewItem.pageCount} pages)` : 'Image'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-100 flex-1 flex items-center justify-center overflow-auto">
              {previewItem.thumbnailUrl ? (
                <img
                  src={previewItem.thumbnailUrl}
                  alt={previewItem.fileName}
                  style={{ transform: `rotate(${previewItem.rotation}deg)` }}
                  className="max-h-[60vh] object-contain shadow-lg rounded-lg transition-transform duration-200"
                />
              ) : (
                <p className="text-xs text-slate-500">Preview not available for this format</p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
              <button
                type="button"
                onClick={() => rotateItem(previewItem.id, 90)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownloadSingle(previewItem);
                  setPreviewItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download as Single PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
