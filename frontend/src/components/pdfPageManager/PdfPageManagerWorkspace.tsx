import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sortable from 'sortablejs';
import confetti from 'canvas-confetti';
import {
  FileText,
  Upload,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Undo2,
  ShieldCheck,
  Sparkles,
  Layers,
  Lock,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X
} from 'lucide-react';
import {
  ManagedPdfPage,
  PdfDocumentInfo,
  RemovedPageHistoryItem,
  PdfManagerStep
} from '../../types/pdfPageManager';
import {
  loadPdfDocumentData,
  generateReorderedPdf,
  reorderManagedPages,
  formatBytes,
  normalizeRotation
} from '../../lib/pdfPageManager/pdfPageEngine';
import { PdfPageCard } from './PdfPageCard';
import { PdfPagePreviewModal } from './PdfPagePreviewModal';

interface PdfPageManagerWorkspaceProps {
  onBackToHome?: () => void;
  onNavigateToCompressor?: () => void;
  onNavigateToIDCard?: () => void;
  onNavigateToPassport?: () => void;
  onNavigateToCrop?: () => void;
  isModalMode?: boolean;
}

export const PdfPageManagerWorkspace: React.FC<PdfPageManagerWorkspaceProps> = ({
  onBackToHome,
  onNavigateToCompressor,
  onNavigateToIDCard,
  onNavigateToPassport,
  onNavigateToCrop,
  isModalMode = false
}) => {
  // Document State
  const [docInfo, setDocInfo] = useState<PdfDocumentInfo | null>(null);
  const [pages, setPages] = useState<ManagedPdfPage[]>([]);
  const [step, setStep] = useState<PdfManagerStep>('idle');
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: ''
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selection & Interactivity
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewPage, setPreviewPage] = useState<ManagedPdfPage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Undo History Stack for removed pages
  const [undoHistory, setUndoHistory] = useState<RemovedPageHistoryItem[]>([]);
  const [lastUndoMessage, setLastUndoMessage] = useState<string | null>(null);

  // Final PDF Result State
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null);
  const [generatedPdfSize, setGeneratedPdfSize] = useState<number | null>(null);
  const [suggestedFileName, setSuggestedFileName] = useState<string>('edited-document.pdf');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Modals & Confirmations
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showUploadNewConfirm, setShowUploadNewConfirm] = useState<boolean>(false);
  const [pendingNewFile, setPendingNewFile] = useState<File | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [pendingPasswordFile, setPendingPasswordFile] = useState<File | null>(null);

  // DOM Refs
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const sortableInstanceRef = useRef<Sortable | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const activePages = pages.filter((p) => !p.removed);
  const removedPages = pages.filter((p) => p.removed);

  // Initialize and update SortableJS on the active thumbnails grid
  useEffect(() => {
    if (!gridContainerRef.current || activePages.length === 0) {
      if (sortableInstanceRef.current) {
        sortableInstanceRef.current.destroy();
        sortableInstanceRef.current = null;
      }
      return;
    }

    // Destroy existing instance to avoid duplicate listeners
    if (sortableInstanceRef.current) {
      sortableInstanceRef.current.destroy();
    }

    sortableInstanceRef.current = new Sortable(gridContainerRef.current, {
      animation: 220,
      draggable: '.page-card',
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
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
          return;
        }

        setPages((currentPages) => {
          // Find the active pages
          const nonRemoved = currentPages.filter((p) => !p.removed);
          const movedPage = nonRemoved[oldIndex];
          if (!movedPage) return currentPages;

          // Perform reordering on the nonRemoved array
          const nextActive = [...nonRemoved];
          const [removed] = nextActive.splice(oldIndex, 1);
          nextActive.splice(newIndex, 0, removed);

          // Recalculate 1-indexed currentOrder
          const updatedActive = nextActive.map((p, idx) => ({
            ...p,
            currentOrder: idx + 1
          }));

          // Merge back with removed pages if any
          const removedItems = currentPages.filter((p) => p.removed);
          return [...updatedActive, ...removedItems];
        });

        // Reset generated PDF since order changed
        setDownloadBlobUrl(null);
      }
    });

    return () => {
      if (sortableInstanceRef.current) {
        sortableInstanceRef.current.destroy();
        sortableInstanceRef.current = null;
      }
    };
  }, [activePages.length]);

  // Clean up Blob URLs on unmount
  useEffect(() => {
    return () => {
      if (downloadBlobUrl) {
        URL.revokeObjectURL(downloadBlobUrl);
      }
    };
  }, [downloadBlobUrl]);

  // Handle PDF Loading from File
  const handleLoadPdf = async (file: File, password?: string) => {
    try {
      setErrorMessage(null);
      setStep('loading');
      setLoadingProgress({ current: 0, total: 100, message: 'Opening PDF file...' });

      const result = await loadPdfDocumentData(file, password, (progress) => {
        setLoadingProgress(progress);
      });

      setDocInfo(result.docInfo);
      setPages(result.pages);
      setSelectedIds(new Set());
      setUndoHistory([]);
      setLastUndoMessage(null);
      setDownloadBlobUrl(null);
      setGeneratedPdfSize(null);

      const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
      setSuggestedFileName(`${baseName}-edited.pdf`);
      setStep('managing');
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      const errStr = String(err?.message || err);

      if (errStr.includes('password') || errStr.includes('Password') || err?.name === 'PasswordException') {
        setPendingPasswordFile(file);
        setShowPasswordModal(true);
        setStep(docInfo ? 'managing' : 'idle');
        setErrorMessage('This PDF is password-protected. Please enter password to unlock.');
      } else {
        setErrorMessage(
          errStr.includes('0 pages')
            ? 'Unable to open this PDF. The document has 0 pages.'
            : 'Unable to open this PDF. The file may be corrupted or unsupported.'
        );
        setStep(docInfo ? 'managing' : 'error');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    if (pages.length > 0) {
      setPendingNewFile(file);
      setShowUploadNewConfirm(true);
    } else {
      handleLoadPdf(file);
    }

    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  // Drag and Drop files onto upload card
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please drop a valid PDF file.');
      return;
    }

    if (pages.length > 0) {
      setPendingNewFile(file);
      setShowUploadNewConfirm(true);
    } else {
      handleLoadPdf(file);
    }
  };

  // Rotate single page
  const handleRotateLeft = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: normalizeRotation(p.rotation - 90) } : p))
    );
    setDownloadBlobUrl(null);
  };

  const handleRotateRight = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: normalizeRotation(p.rotation + 90) } : p))
    );
    setDownloadBlobUrl(null);
  };

  // Quick move left/right (accessibility & one-click nudge)
  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    setPages((prev) => reorderManagedPages(prev, index, index - 1));
    setDownloadBlobUrl(null);
  };

  const handleMoveRight = (index: number) => {
    const active = pages.filter((p) => !p.removed);
    if (index >= active.length - 1) return;
    setPages((prev) => reorderManagedPages(prev, index, index + 1));
    setDownloadBlobUrl(null);
  };

  // Remove single page with Undo capability
  const handleRemovePage = (id: string) => {
    const targetPage = pages.find((p) => p.id === id);
    if (!targetPage) return;

    const prevIndex = pages.filter((p) => !p.removed).findIndex((p) => p.id === id);

    setPages((prev) => {
      let orderCounter = 1;
      return prev.map((p) => {
        if (p.id === id) {
          return { ...p, removed: true };
        }
        if (!p.removed) {
          const updated = { ...p, currentOrder: orderCounter };
          orderCounter++;
          return updated;
        }
        return p;
      });
    });

    // Add to Undo History
    setUndoHistory((prev) => [
      ...prev,
      {
        id: `undo_${Date.now()}`,
        page: targetPage,
        prevIndex,
        timestamp: Date.now()
      }
    ]);

    setLastUndoMessage(`Page ${targetPage.currentOrder} removed.`);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDownloadBlobUrl(null);
  };

  // Undo last removal
  const handleUndoRemove = () => {
    if (undoHistory.length === 0) return;
    const lastItem = undoHistory[undoHistory.length - 1];
    const restoredId = lastItem.page.id;

    setPages((prev) => {
      // Find page and unmark removed
      const target = prev.find((p) => p.id === restoredId);
      if (!target) return prev;

      // Extract all non-removed pages
      const active = prev.filter((p) => !p.removed && p.id !== restoredId);
      // Place target back at prevIndex or end
      const insertAt = Math.min(lastItem.prevIndex, active.length);
      active.splice(insertAt, 0, { ...target, removed: false });

      // Recalculate 1-indexed order
      const updatedActive = active.map((p, idx) => ({
        ...p,
        currentOrder: idx + 1
      }));

      const remainingRemoved = prev.filter((p) => p.removed && p.id !== restoredId);
      return [...updatedActive, ...remainingRemoved];
    });

    setUndoHistory((prev) => prev.slice(0, -1));
    setLastUndoMessage(null);
    setDownloadBlobUrl(null);
  };

  // Multi-selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(activePages.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    setPages((prev) => {
      let orderCounter = 1;
      return prev.map((p) => {
        if (selectedIds.has(p.id)) {
          return { ...p, removed: true };
        }
        if (!p.removed) {
          const updated = { ...p, currentOrder: orderCounter };
          orderCounter++;
          return updated;
        }
        return p;
      });
    });

    setLastUndoMessage(`${count} page${count > 1 ? 's' : ''} removed.`);
    setSelectedIds(new Set());
    setDownloadBlobUrl(null);
  };

  const handleRotateSelected = (direction: 'left' | 'right') => {
    if (selectedIds.size === 0) return;
    const delta = direction === 'left' ? -90 : 90;
    setPages((prev) =>
      prev.map((p) => {
        if (selectedIds.has(p.id)) {
          return { ...p, rotation: normalizeRotation(p.rotation + delta) };
        }
        return p;
      })
    );
    setDownloadBlobUrl(null);
  };

  const handleResetAllRotations = () => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
    setDownloadBlobUrl(null);
  };

  // Clear workspace
  const handleClearWorkspace = () => {
    if (downloadBlobUrl) {
      URL.revokeObjectURL(downloadBlobUrl);
    }
    setDocInfo(null);
    setPages([]);
    setSelectedIds(new Set());
    setUndoHistory([]);
    setLastUndoMessage(null);
    setDownloadBlobUrl(null);
    setGeneratedPdfSize(null);
    setStep('idle');
    setErrorMessage(null);
    setShowClearConfirm(false);
  };

  // Generate & Download Final PDF using pdf-lib
  const handleGeneratePdf = async () => {
    if (!docInfo || activePages.length === 0) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const finalBytes = await generateReorderedPdf(docInfo.originalBuffer, pages);
      const blob = new Blob([finalBytes.buffer.slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setDownloadBlobUrl(blobUrl);
      setGeneratedPdfSize(blob.size);
      setStep('ready');

      // Trigger auto-download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = suggestedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Safe fallback
      }

      window.dispatchEvent(
        new CustomEvent('app_toast', {
          detail: `🎉 ${suggestedFileName} generated & downloaded successfully!`
        })
      );
    } catch (err: any) {
      console.error('Failed to create PDF:', err);
      setErrorMessage(err?.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Password Unlock Submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPasswordFile || !passwordInput) return;
    setShowPasswordModal(false);
    handleLoadPdf(pendingPasswordFile, passwordInput);
    setPasswordInput('');
    setPendingPasswordFile(null);
  };

  return (
    <div
      id="pdf-page-manager-workspace"
      className="w-full flex flex-col bg-slate-50 text-slate-800 min-h-[calc(100vh-100px)] rounded-3xl overflow-hidden shadow-xs border border-slate-200"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* 1. TOP TABS & BRANDING HEADER */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  PDF Page Manager
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  100% Client-Side
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Zero Quality Loss
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Upload PDF, rearrange pages, remove unwanted pages, and download a new PDF.
              </p>
            </div>
          </div>

          {/* Quick PDF Tools Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-2xs shrink-0 cursor-default"
            >
              📑 PDF Page Manager
            </button>

            {onNavigateToCompressor && (
              <button
                type="button"
                onClick={onNavigateToCompressor}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                🗜️ Compress PDF
              </button>
            )}

            {onNavigateToIDCard && (
              <button
                type="button"
                onClick={onNavigateToIDCard}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                💳 PVC ID Print
              </button>
            )}

            {onNavigateToPassport && (
              <button
                type="button"
                onClick={onNavigateToPassport}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                📷 Passport Photo
              </button>
            )}

            {onNavigateToCrop && (
              <button
                type="button"
                onClick={onNavigateToCrop}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                ✂️ Photo & Crop
              </button>
            )}

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0 cursor-pointer ml-1"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. ERROR BANNER */}
      {errorMessage && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 p-3 sm:p-6 flex flex-col">
        {/* CASE A: No PDF uploaded yet (Clean Upload Card) */}
        {!docInfo && step !== 'loading' && (
          <div className="max-w-2xl w-full mx-auto my-auto py-8">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center bg-white shadow-xs ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
                <Upload className="w-8 h-8" />
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-1">
                Select or drag a PDF file to upload
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6 max-w-md">
                Easily reorder pages with drag & drop, remove unwanted pages, rotate orientations, and download a crisp new PDF.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>UPLOAD PDF</span>
              </button>

              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 w-full text-center text-[11px] text-slate-500 font-medium">
                <div>
                  <span className="block font-bold text-slate-700 text-xs">Drag & Drop</span>
                  Smooth touch & mouse
                </div>
                <div>
                  <span className="block font-bold text-slate-700 text-xs">Zero Quality Loss</span>
                  Vector preservation
                </div>
                <div>
                  <span className="block font-bold text-slate-700 text-xs">100% Private</span>
                  No server upload
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 font-medium mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Your PDF is processed locally in your browser and is not permanently stored.</span>
            </p>
          </div>
        )}

        {/* CASE B: Loading / Rendering Progress */}
        {step === 'loading' && (
          <div className="max-w-md w-full mx-auto my-auto p-8 rounded-3xl bg-white border border-slate-200 text-center shadow-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 mb-1">
                Loading PDF Document...
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {loadingProgress.message || 'Preparing thumbnails for page reordering...'}
              </p>
            </div>
            {loadingProgress.total > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, Math.round((loadingProgress.current / loadingProgress.total) * 100))}%`
                  }}
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400 font-semibold">
              Rendering lightweight previews to keep your browser fast.
            </p>
          </div>
        )}

        {/* CASE C: Document Loaded & Active Management */}
        {docInfo && step !== 'loading' && (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Document Info Header Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {docInfo.fileName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span>{docInfo.fileSizeFormatted}</span>
                    <span>•</span>
                    <span>{docInfo.totalPages} Original Pages</span>
                    <span>•</span>
                    <span className="font-bold text-blue-600">
                      {activePages.length} Active {activePages.length === 1 ? 'Page' : 'Pages'}
                    </span>
                    {selectedIds.size > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-purple-600">
                          {selectedIds.size} Selected
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload New & Clear Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>UPLOAD NEW PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CLEAR</span>
                </button>
              </div>
            </div>

            {/* Selection & Bulk Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  SELECT ALL
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  DESELECT ALL
                </button>

                <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>REMOVE SELECTED ({selectedIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRotateSelected('left')}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-indigo-600" />
                  <span>Rotate Left</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRotateSelected('right')}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3 text-indigo-600" />
                  <span>Rotate Right</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAllRotations}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Reset Rotations
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <span>⋮⋮ Drag handle to reorder</span>
              </div>
            </div>

            {/* Undo Notification Banner */}
            {lastUndoMessage && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{lastUndoMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={handleUndoRemove}
                  className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  Undo
                </button>
              </div>
            )}

            {/* Zero Active Pages Warning */}
            {activePages.length === 0 && (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  All pages have been removed
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click Undo above to restore removed pages, or upload a new PDF document.
                </p>
                {undoHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoRemove}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                  >
                    Restore Last Removed Page
                  </button>
                )}
              </div>
            )}

            {/* 4. DRAGGABLE PAGE THUMBNAILS GRID */}
            {activePages.length > 0 && (
              <div
                ref={gridContainerRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 flex-1 pb-24"
              >
                {activePages.map((page, index) => (
                  <PdfPageCard
                    key={page.id}
                    page={page}
                    index={index}
                    totalActivePages={activePages.length}
                    isSelected={selectedIds.has(page.id)}
                    onToggleSelect={handleToggleSelect}
                    onRotateLeft={handleRotateLeft}
                    onRotateRight={handleRotateRight}
                    onRemove={handleRemovePage}
                    onPreview={(p) => {
                      setPreviewPage(p);
                      setIsPreviewOpen(true);
                    }}
                    onMoveLeft={handleMoveLeft}
                    onMoveRight={handleMoveRight}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. STICKY BOTTOM ACTION BAR (When Document is Loaded) */}
      {docInfo && step !== 'loading' && (
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-6 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600 font-bold">
              Current Pages:{' '}
              <span className="text-sm font-black text-slate-900">
                {activePages.length}
              </span>
              <span className="text-slate-400 font-normal ml-1">
                (of {docInfo.totalPages} original)
              </span>
            </div>

            {pages.some((p) => p.rotation !== 0) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Rotations applied
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {downloadBlobUrl && (
              <a
                href={downloadBlobUrl}
                download={suggestedFileName}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>DOWNLOAD PDF</span>
                {generatedPdfSize && (
                  <span className="opacity-80 text-[10px]">({formatBytes(generatedPdfSize)})</span>
                )}
              </a>
            )}

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={activePages.length === 0 || isGenerating}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CREATING PDF...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>CREATE PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 6. MODALS & POPUPS */}

      {/* Large Page Preview Lightbox */}
      <PdfPagePreviewModal
        page={previewPage}
        pages={pages}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSelectPage={(p) => setPreviewPage(p)}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onRemove={handleRemovePage}
      />

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Clear uploaded PDF and all edits?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This will reset all rearranged pages, rotations, and remove all files from this session.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearWorkspace}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload New File Confirmation */}
      {showUploadNewConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Replace current document?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You have active page edits in this document. Uploading a new PDF will replace them.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUploadNewConfirm(false);
                  setPendingNewFile(null);
                }}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadNewConfirm(false);
                  if (pendingNewFile) {
                    handleLoadPdf(pendingNewFile);
                    setPendingNewFile(null);
                  }
                }}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
              >
                Upload New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">
                Password Protected PDF
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the password to open and manage this PDF document.
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Enter PDF Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPendingPasswordFile(null);
                    setPasswordInput('');
                  }}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!passwordInput}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  Unlock & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
