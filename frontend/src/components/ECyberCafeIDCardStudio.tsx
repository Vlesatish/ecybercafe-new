import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Printer, ArrowLeft, Download, RotateCw, ZoomIn, ZoomOut, Maximize2, 
  Trash2, Plus, Eye, RefreshCw, Scissors, Sparkles, Sliders, Check, 
  ChevronRight, CreditCard, FileText, Upload, Copy, X, Layers, ShieldCheck, 
  ExternalLink, HelpCircle, Sun, Contrast, Image as ImageIcon, CheckCircle2,
  FlipHorizontal, ArrowRight, Move, AlertCircle, FileCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdjustScanWorkspace, CropBox } from './idStudio/AdjustScanWorkspace';
import { PasswordPromptModal } from './idStudio/PasswordPromptModal';
import { cropVoterCardFromSource, E_EPIC_TEMPLATE } from '../lib/idStudio/voterCardDetector';
import { loadPdfWithPassword, PdfImportCancelledError, PdfPasswordRequest } from '../lib/idStudio/loadPdfWithPassword';
import { cropNormalizedRegion, detectAadhaarFrontBack, E_AADHAAR_TEMPLATE, makeDetectionCanvas } from '../lib/idStudio/aadhaarDetector';
import { detectUtiEpanFrontBack, E_EPAN_TEMPLATE } from '../lib/idStudio/panDetector';

// CR-80 Standard Dimensions (ISO/IEC 7810 ID-1)
export const CARD_WIDTH_MM = 85.60;
export const CARD_HEIGHT_MM = 53.98;
export const CARD_RATIO = CARD_WIDTH_MM / CARD_HEIGHT_MM; // ~1.5857

/** Stretches a complete card side to fill a CR-80 canvas without cropping. */
const stretchImageToCard = (dataUrl: string): Promise<string> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const outputWidth = Math.max(1011, image.naturalWidth);
    const outputHeight = Math.round(outputWidth / CARD_RATIO);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Canvas context unavailable'));
      return;
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, outputWidth, outputHeight);
    resolve(canvas.toDataURL('image/png'));
  };
  image.onerror = () => reject(new Error('Could not load card image'));
  image.src = dataUrl;
});

export type DocumentTypePreset = 
  | 'aadhaar' 
  | 'pan' 
  | 'voter' 
  | 'ayushman' 
  | 'dl' 
  | 'eshram' 
  | 'student' 
  | 'custom';

export type PaperSize = 'a4' | '4x6' | 'pvc_single' | 'pvc_tray';

export interface CardItem {
  id: string;
  cardName: string;
  cardTypePreset: DocumentTypePreset;
  frontImage: string | null;
  backImage: string | null;
  brightness: number;  // 80 - 130 (default 100)
  contrast: number;    // 80 - 140 (default 100)
  saturation: number;  // 80 - 140 (default 100)
  textDarken: boolean; // Text darkening for crisp barcodes/QR
  addBorder: boolean;
  roundedCorners: boolean;
}

export interface PrintPage {
  id: string;
  pageNumber: number;
  cards: CardItem[];
}

interface ECyberCafeIDCardStudioProps {
  onBackToHome?: () => void;
  isModalMode?: boolean;
}

export const ECyberCafeIDCardStudio: React.FC<ECyberCafeIDCardStudioProps> = ({
  onBackToHome,
  isModalMode = false
}) => {
  // 1. Paper / Layout Settings
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [singleSideMode, setSingleSideMode] = useState<boolean>(false);
  const [mirrorPrint, setMirrorPrint] = useState<boolean>(false); // Inverted / Sublimation
  const [exportTier, setExportTier] = useState<'FREE' | 'PRO'>('FREE');

  // Card Spacing & Gap Customization
  const [cardGapMm, setCardGapMm] = useState<number>(4); // Gap between Front and Back (0 to 25 mm)
  const [topMarginMm, setTopMarginMm] = useState<number>(8); // Top margin starting from top of A4 (2 to 30 mm)
  const [rowGapMm, setRowGapMm] = useState<number>(3.5); // Gap between card rows (vertical)

  // 2. Multi-Page & Multi-Card Queue State
  const [pages, setPages] = useState<PrintPage[]>([
    {
      id: 'page_1',
      pageNumber: 1,
      cards: [
        {
          id: 'card_1',
          cardName: 'Card 1 (Aadhaar)',
          cardTypePreset: 'aadhaar',
          frontImage: null,
          backImage: null,
          brightness: 100,
          contrast: 105,
          saturation: 100,
          textDarken: true,
          addBorder: true,
          roundedCorners: true,
        }
      ]
    }
  ]);

  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);

  // Active Items
  const currentPage = pages[activePageIndex] || pages[0];
  const activeCard = currentPage?.cards[selectedCardIndex] || currentPage?.cards[0];

  // 3. Canvas & UI Controls
  const [zoomLevel, setZoomLevel] = useState<number>(65);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Paper base dimensions for pixel-perfect scale & layout
  const paperDimensions = useMemo(() => {
    switch (paperSize) {
      case 'a4':
        return { width: 595, height: 842 };
      case '4x6':
        return { width: 576, height: 384 };
      case 'pvc_single':
        return { width: 420, height: 265 };
      case 'pvc_tray':
        return { width: 600, height: 390 };
      default:
        return { width: 595, height: 842 };
    }
  }, [paperSize]);

  // Fit to screen helper (calculates optimal zoom to fit canvas viewport without scrollbars)
  const handleFitToScreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    const { clientWidth, clientHeight } = previewContainerRef.current;
    if (!clientWidth || !clientHeight) return;
    const availableW = Math.max(150, clientWidth - 56);
    const availableH = Math.max(150, clientHeight - 56);

    const scaleW = availableW / paperDimensions.width;
    const scaleH = availableH / paperDimensions.height;
    const fitScale = Math.min(scaleW, scaleH);
    const fitZoom = Math.max(30, Math.min(150, Math.floor(fitScale * 100)));
    setZoomLevel(fitZoom);
  }, [paperDimensions]);

  // Auto-fit on mount and when paperSize changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 120);
    return () => clearTimeout(timer);
  }, [handleFitToScreen]);

  // Auto-fit on window resize
  useEffect(() => {
    const onResize = () => {
      handleFitToScreen();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [handleFitToScreen]);

  // 4. Modal States
  const [showAdjustScan, setShowAdjustScan] = useState<boolean>(false);
  const [adjustScanSrc, setAdjustScanSrc] = useState<string | null>(null);
  const [adjustScanTargetSide, setAdjustScanTargetSide] = useState<'FRONT' | 'BACK' | 'SMART'>('FRONT');
  const [adjustScanBox, setAdjustScanBox] = useState<CropBox | undefined>(undefined);

  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<'AUTO_VOTER' | 'AUTO_AADHAAR' | 'AUTO_SIDE_BY_SIDE' | 'AUTO_STACKED' | 'MANUAL_FRONT' | 'MANUAL_BACK'>('AUTO_VOTER');
  const [pdfPagesCache, setPdfPagesCache] = useState<string[]>([]);
  const [selectedPdfPage, setSelectedPdfPage] = useState<number>(1);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [showPagesModal, setShowPagesModal] = useState<boolean>(false);
  const [passwordRequest, setPasswordRequest] = useState<PdfPasswordRequest | null>(null);
  const [passwordError, setPasswordError] = useState<string>();
  const [isPasswordVerifying, setIsPasswordVerifying] = useState(false);
  const processingJobRef = useRef<{ id: string; controller: AbortController; fingerprint: string } | null>(null);
  const lastCompletedRef = useRef<{ fingerprint: string; at: number } | null>(null);

  // File Inputs
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Update Active Card Properties Helper
  const updateActiveCard = (updates: Partial<CardItem>) => {
    setPages(prevPages => {
      const nextPages = [...prevPages];
      const targetPage = { ...nextPages[activePageIndex] };
      const nextCards = [...targetPage.cards];
      if (nextCards[selectedCardIndex]) {
        nextCards[selectedCardIndex] = {
          ...nextCards[selectedCardIndex],
          ...updates
        };
        targetPage.cards = nextCards;
        nextPages[activePageIndex] = targetPage;
      }
      return nextPages;
    });
  };

  // Open Adjust Scan Workspace Helper
  const openAdjustScan = (imgUrl: string, targetSide: 'FRONT' | 'BACK' | 'SMART' = 'FRONT', initialBox?: CropBox, preferCachedSource = true) => {
    // If full document source exists in pdfPagesCache, use it so user can re-crop from full document
    const sourceImg = preferCachedSource && pdfPagesCache.length > 0
      ? (targetSide === 'BACK' && pdfPagesCache[1] ? pdfPagesCache[1] : pdfPagesCache[0])
      : imgUrl;
    setAdjustScanSrc(sourceImg);
    setAdjustScanTargetSide(targetSide);

    if (initialBox) {
      setAdjustScanBox(initialBox);
    } else if (activeCard?.cardTypePreset === 'voter') {
      if (targetSide === 'FRONT' || targetSide === 'SMART') {
        setAdjustScanBox({
          x: E_EPIC_TEMPLATE.front.x * 100,
          y: E_EPIC_TEMPLATE.front.y * 100,
          width: E_EPIC_TEMPLATE.front.width * 100,
          height: E_EPIC_TEMPLATE.front.height * 100
        });
      } else {
        setAdjustScanBox({
          x: E_EPIC_TEMPLATE.back.x * 100,
          y: E_EPIC_TEMPLATE.back.y * 100,
          width: E_EPIC_TEMPLATE.back.width * 100,
          height: E_EPIC_TEMPLATE.back.height * 100
        });
      }
    } else if (activeCard?.cardTypePreset === 'aadhaar') {
      if (targetSide === 'FRONT' || targetSide === 'SMART') {
        setAdjustScanBox({ x: E_AADHAAR_TEMPLATE.front.x * 100, y: E_AADHAAR_TEMPLATE.front.y * 100, width: E_AADHAAR_TEMPLATE.front.width * 100, height: E_AADHAAR_TEMPLATE.front.height * 100 });
      } else {
        setAdjustScanBox({ x: E_AADHAAR_TEMPLATE.back.x * 100, y: E_AADHAAR_TEMPLATE.back.y * 100, width: E_AADHAAR_TEMPLATE.back.width * 100, height: E_AADHAAR_TEMPLATE.back.height * 100 });
      }
    } else if (activeCard?.cardTypePreset === 'ayushman') {
      // Ayushman PDF pages are already complete card sides. Editing starts
      // with the full page selected so no edge is lost unintentionally.
      setAdjustScanBox({ x: 0, y: 0, width: 100, height: 100 });
    } else if (activeCard?.cardTypePreset === 'pan') {
      const rect = targetSide === 'BACK' ? E_EPAN_TEMPLATE.back : E_EPAN_TEMPLATE.front;
      setAdjustScanBox({ x: rect.x * 100, y: rect.y * 100, width: rect.width * 100, height: rect.height * 100 });
    } else {
      setAdjustScanBox(undefined);
    }
    setShowAdjustScan(true);
  };

  const handleAdjustScanConfirm = async (
    croppedDataUrl: string,
    adjustments: any,
    cropBox: CropBox
  ) => {
    const finalDataUrl = activeCard?.cardTypePreset === 'ayushman' || activeCard?.cardTypePreset === 'pan'
      ? await stretchImageToCard(croppedDataUrl)
      : croppedDataUrl;
    if (adjustScanTargetSide === 'FRONT' || adjustScanTargetSide === 'SMART') {
      updateActiveCard({
        frontImage: finalDataUrl,
        brightness: adjustments.brightness || 100,
        contrast: adjustments.contrast || 100,
        saturation: adjustments.saturation || 100
      });
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Front Card cropped & enhanced!' }));
    } else if (adjustScanTargetSide === 'BACK') {
      updateActiveCard({
        backImage: finalDataUrl,
        brightness: adjustments.brightness || 100,
        contrast: adjustments.contrast || 100,
        saturation: adjustments.saturation || 100
      });
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Back Card cropped & enhanced!' }));
    }
  };

  // ----------------------------------------------------
  // SMART PDF & IMAGE PROCESSOR
  // ----------------------------------------------------
  const handleUploadedFile = async (file: File, targetSide: 'FRONT' | 'BACK' | 'SMART' = 'FRONT') => {
    if (!file) return;
    const fingerprint = `${file.name}:${file.size}:${file.lastModified}:${targetSide}:${activeCard?.id || ''}`;
    if (processingJobRef.current?.fingerprint === fingerprint) return;
    if (lastCompletedRef.current?.fingerprint === fingerprint && Date.now() - lastCompletedRef.current.at < 1500) return;
    processingJobRef.current?.controller.abort();
    const controller = new AbortController();
    const jobId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    processingJobRef.current = { id: jobId, controller, fingerprint };
    setIsProcessing(true);
    setStatusMessage(activeCard?.cardTypePreset === 'aadhaar' ? 'Reading Aadhaar PDF' : 'Reading document');

    try {
      const fileName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
      
      let primaryCanvas: HTMLCanvasElement;
      let primaryDataUrl: string;
      const pageImages: string[] = [];

      if (isPdf) {
        const pdf = await loadPdfWithPassword(file, {
          jobId,
          signal: controller.signal,
          requestPassword: (request) => {
            setPasswordError(request.reason === 'incorrect' ? 'Incorrect PDF password. Please try again.' : undefined);
            setIsPasswordVerifying(false);
            setPasswordRequest(request);
            setStatusMessage(request.reason === 'incorrect' ? 'Password Required' : 'Password Required');
          },
          onStatus: (status) => {
            if (status === 'verifying') {
              setIsPasswordVerifying(true);
              setStatusMessage('Verifying Password');
            } else if (status === 'unlocked') {
              setIsPasswordVerifying(false);
              setPasswordRequest(null);
              setPasswordError(undefined);
              setStatusMessage('PDF Unlocked');
            }
          }
        });
        if (controller.signal.aborted) throw new PdfImportCancelledError();
        setStatusMessage(activeCard?.cardTypePreset === 'aadhaar' ? 'Rendering Aadhaar' : 'Rendering PDF');

        // Render Page 1 with optimal high resolution (target max sharpness while keeping total pixels under 20M limit)
        const firstPage = await pdf.getPage(1);
        const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
        const targetScale = Math.min(4.0, Math.max(2.5, Math.sqrt(18_000_000 / (unscaledViewport.width * unscaledViewport.height))));
        const viewport = firstPage.getViewport({ scale: targetScale });
        
        primaryCanvas = document.createElement('canvas');
        primaryCanvas.width = viewport.width;
        primaryCanvas.height = viewport.height;
        const ctx = primaryCanvas.getContext('2d');
        if (ctx) {
          await firstPage.render({ canvasContext: ctx, viewport }).promise;
        }
        primaryDataUrl = primaryCanvas.toDataURL('image/png');
        pageImages.push(primaryDataUrl);

        // Render remaining pages if present (up to 5 pages)
        for (let i = 2; i <= Math.min(pdf.numPages, 5); i++) {
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1.0 });
          const pageScale = Math.min(4.0, Math.max(2.5, Math.sqrt(18_000_000 / (baseViewport.width * baseViewport.height))));
          const vp = page.getViewport({ scale: pageScale });
          const cvs = document.createElement('canvas');
          cvs.width = vp.width;
          cvs.height = vp.height;
          const c = cvs.getContext('2d');
          if (c) {
            await page.render({ canvasContext: c, viewport: vp }).promise;
            pageImages.push(cvs.toDataURL('image/png'));
          }
        }

        setPdfPagesCache(pageImages);
        setSelectedPdfPage(1);
      } else {
        // Standard Image (JPG / PNG / WEBP)
        setStatusMessage(activeCard?.cardTypePreset === 'aadhaar' ? 'Rendering Aadhaar' : 'Loading image scan');
        primaryDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = primaryDataUrl;
        });

        primaryCanvas = document.createElement('canvas');
        primaryCanvas.width = img.width;
        primaryCanvas.height = img.height;
        const ctx = primaryCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        setPdfPagesCache([primaryDataUrl]);
      }

      setCropSourceImage(primaryDataUrl);

      const W = primaryCanvas.width;
      const H = primaryCanvas.height;
      const ratio = W / H;

      // Check Document Type Preset & Filename hints
      const isExplicitVoter = activeCard?.cardTypePreset === 'voter' ||
        fileName.includes('voter') || fileName.includes('epic') || fileName.includes('eci') || fileName.includes('election');

      const isExplicitAadhaar = activeCard?.cardTypePreset === 'aadhaar' ||
        fileName.includes('aadhaar') || fileName.includes('eaadhaar') || fileName.includes('uidai');

      const isExplicitAyushman = activeCard?.cardTypePreset === 'ayushman' ||
        fileName.includes('ayushman') || fileName.includes('pmjay') || fileName.includes('pm-jay');

      const isExplicitPan = activeCard?.cardTypePreset === 'pan' ||
        fileName.includes('epan') || fileName.includes('pan_card') || fileName.includes('utiitsl');

      // ------------------------------------------------------------------
      // 1. VOTER CARD AUTO EXTRACTION WORKFLOW (e-EPIC)
      // ------------------------------------------------------------------
      if (isExplicitVoter) {
        setStatusMessage('Detecting Front and Back...');

        // If portrait page (standard e-EPIC letter)
        if (ratio < 1.0) {
          const voterOutput = await cropVoterCardFromSource(primaryCanvas);
          if (voterOutput.frontDataUrl && voterOutput.backDataUrl) {
            updateActiveCard({
              frontImage: voterOutput.frontDataUrl,
              backImage: voterOutput.backDataUrl,
              cardTypePreset: 'voter'
            });
            setSingleSideMode(false);
            window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Voter Card Front and Back detected successfully.' }));
            return;
          }
        } else if (ratio >= 1.45 && ratio <= 1.75) {
          // Single already-cropped Voter Card
          if (targetSide === 'BACK') {
            updateActiveCard({ backImage: primaryDataUrl, cardTypePreset: 'voter' });
            window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Voter Card Back loaded!' }));
          } else {
            updateActiveCard({ frontImage: primaryDataUrl, cardTypePreset: 'voter' });
            window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Voter Card Front loaded!' }));
          }
          return;
        }
      }

      // ------------------------------------------------------------------
      // 2. AADHAAR CARD AUTO EXTRACTION WORKFLOW
      // ------------------------------------------------------------------
      if (isExplicitAadhaar && ratio < 1.0) {
        setStatusMessage('Detecting Front and Back');
        const detection = detectAadhaarFrontBack(makeDetectionCanvas(primaryCanvas));
        if (!detection.front || !detection.back) {
          window.dispatchEvent(new CustomEvent('app_toast', { detail: 'Automatic Aadhaar detection failed. Please adjust the Front and Back crop.' }));
          openAdjustScan(primaryDataUrl, 'FRONT', {
            x: E_AADHAAR_TEMPLATE.front.x * 100,
            y: E_AADHAAR_TEMPLATE.front.y * 100,
            width: E_AADHAAR_TEMPLATE.front.width * 100,
            height: E_AADHAAR_TEMPLATE.front.height * 100
          });
          return;
        }

        setStatusMessage('Cropping Front');
        const frontImage = cropNormalizedRegion(primaryCanvas, detection.front.rect);
        setStatusMessage('Cropping Back');
        const backImage = cropNormalizedRegion(primaryCanvas, detection.back.rect);
        setStatusMessage('Preparing Editor');

        updateActiveCard({
          frontImage,
          backImage,
          cardTypePreset: 'aadhaar'
        });
        setSingleSideMode(false);
        lastCompletedRef.current = { fingerprint, at: Date.now() };
        window.dispatchEvent(new CustomEvent('app_toast', { detail: 'Aadhaar Front and Back detected successfully.' }));
        return;
      }

      // ------------------------------------------------------------------
      // 3. UTIITSL ePAN AUTO EXTRACTION WORKFLOW
      // ------------------------------------------------------------------
      if (isExplicitPan && ratio < 1.0) {
        setStatusMessage('Detecting PAN Front and Back');
        const detection = detectUtiEpanFrontBack(makeDetectionCanvas(primaryCanvas));
        if (detection) {
          setStatusMessage('Cropping PAN Front');
          const rawFront = cropNormalizedRegion(primaryCanvas, detection.front);
          setStatusMessage('Cropping PAN Back');
          const rawBack = cropNormalizedRegion(primaryCanvas, detection.back);
          const [frontImage, backImage] = await Promise.all([
            stretchImageToCard(rawFront),
            stretchImageToCard(rawBack)
          ]);
          updateActiveCard({ frontImage, backImage, cardTypePreset: 'pan' });
          setSingleSideMode(false);
          lastCompletedRef.current = { fingerprint, at: Date.now() };
          window.dispatchEvent(new CustomEvent('app_toast', { detail: 'PAN Front and Back detected successfully.' }));
          return;
        }
        window.dispatchEvent(new CustomEvent('app_toast', { detail: 'Automatic PAN detection failed. Please adjust the crop.' }));
        openAdjustScan(primaryDataUrl, 'FRONT', {
          x: E_EPAN_TEMPLATE.front.x * 100,
          y: E_EPAN_TEMPLATE.front.y * 100,
          width: E_EPAN_TEMPLATE.front.width * 100,
          height: E_EPAN_TEMPLATE.front.height * 100
        });
        return;
      }

      // ------------------------------------------------------------------
      // 4. AYUSHMAN CARD WORKFLOW
      // ------------------------------------------------------------------
      // Official PM-JAY downloads commonly contain a clean Front on page 1
      // and a clean Back/instructions panel on page 2. Preserve each complete
      // page: applying the e-Aadhaar lower-page template would destroy it.
      if (isExplicitAyushman) {
        setStatusMessage('Detecting Ayushman Front and Back');
        if (pageImages.length >= 2) {
          setStatusMessage('Fitting complete Ayushman card');
          const [frontImage, backImage] = await Promise.all([
            stretchImageToCard(pageImages[0]),
            stretchImageToCard(pageImages[1])
          ]);
          updateActiveCard({
            frontImage,
            backImage,
            cardTypePreset: 'ayushman'
          });
          setSingleSideMode(false);
          lastCompletedRef.current = { fingerprint, at: Date.now() };
          window.dispatchEvent(new CustomEvent('app_toast', { detail: 'Ayushman Front and Back detected successfully.' }));
          return;
        }

        // A separately downloaded side is normally a wide 2:1 card image.
        if (ratio >= 1.75 && ratio <= 2.20) {
          const fittedImage = await stretchImageToCard(primaryDataUrl);
          if (targetSide === 'BACK') {
            updateActiveCard({ backImage: fittedImage, cardTypePreset: 'ayushman' });
          } else {
            updateActiveCard({ frontImage: fittedImage, cardTypePreset: 'ayushman' });
          }
          lastCompletedRef.current = { fingerprint, at: Date.now() };
          window.dispatchEvent(new CustomEvent('app_toast', { detail: `Ayushman ${targetSide === 'BACK' ? 'Back' : 'Front'} loaded successfully.` }));
          return;
        }
      }

      // ------------------------------------------------------------------
      // 4. MULTI-PAGE PDF HANDLING
      // ------------------------------------------------------------------
      if (pageImages.length >= 2 && targetSide === 'SMART') {
        updateActiveCard({
          frontImage: pageImages[0],
          backImage: pageImages[1]
        });
        window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ 2-Page PDF loaded: Page 1 Front & Page 2 Back!' }));
        return;
      }

      // ------------------------------------------------------------------
      // 5. SINGLE CARD UPLOAD TO SPECIFIC SLOT
      // ------------------------------------------------------------------
      if (ratio >= 1.45 && ratio <= 1.75) {
        if (targetSide === 'BACK') {
          updateActiveCard({ backImage: primaryDataUrl });
          window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Back Card loaded!' }));
        } else {
          updateActiveCard({ frontImage: primaryDataUrl });
          window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Front Card loaded!' }));
        }
        return;
      }

      // ------------------------------------------------------------------
      // 6. GENERAL / MANUAL CROP FALLBACK
      // ------------------------------------------------------------------
      openAdjustScan(primaryDataUrl, targetSide, undefined, false);

    } catch (err) {
      if (!(err instanceof PdfImportCancelledError)) {
        const name = (err as Error)?.name;
        const message = name === 'InvalidPDFException'
          ? 'The PDF is corrupt or unsupported.'
          : 'Could not process this document.';
        window.dispatchEvent(new CustomEvent('app_toast', { detail: message }));
      }
    } finally {
      if (processingJobRef.current?.id === jobId) {
        processingJobRef.current = null;
        setIsProcessing(false);
        setStatusMessage('');
      }
    }
  };

  // ----------------------------------------------------
  // INTELLIGENT CROP CALCULATIONS
  // ----------------------------------------------------
  const executeCrop = (mode: 'AUTO_VOTER' | 'AUTO_AADHAAR' | 'AUTO_SIDE_BY_SIDE' | 'AUTO_STACKED' | 'MANUAL_FRONT' | 'MANUAL_BACK') => {
    if (!cropSourceImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const W = img.width;
      const H = img.height;

      if (mode === 'AUTO_VOTER') {
        try {
          const voterOutput = await cropVoterCardFromSource(img);
          if (voterOutput.frontDataUrl && voterOutput.backDataUrl) {
            updateActiveCard({
              frontImage: voterOutput.frontDataUrl,
              backImage: voterOutput.backDataUrl,
              cardTypePreset: 'voter'
            });
            window.dispatchEvent(new CustomEvent('app_toast', { detail: '✨ Voter Card Front and Back detected successfully.' }));
            setShowCropModal(false);
            setCropSourceImage(null);
            return;
          }
        } catch (err) {
          console.warn('Voter crop error:', err);
        }
      }

      if (mode === 'AUTO_AADHAAR') {
        // Official e-Aadhaar Letter Standard:
        // The ID card is located in the bottom ~30% of the A4 document.
        // Left half is Front, Right half is Back.
        const cardStartY = Math.round(H * 0.69); // bottom ~31%
        const cardH = Math.round(H * 0.285);
        const cardW = Math.round(W * 0.44); // ~44% width each side

        const leftX = Math.round(W * 0.05);
        const rightX = Math.round(W * 0.51);

        // Front Canvas
        const fCanvas = document.createElement('canvas');
        fCanvas.width = cardW;
        fCanvas.height = cardH;
        const fCtx = fCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(img, leftX, cardStartY, cardW, cardH, 0, 0, cardW, cardH);
          updateActiveCard({ frontImage: fCanvas.toDataURL('image/png') });
        }

        // Back Canvas
        const bCanvas = document.createElement('canvas');
        bCanvas.width = cardW;
        bCanvas.height = cardH;
        const bCtx = bCanvas.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(img, rightX, cardStartY, cardW, cardH, 0, 0, cardW, cardH);
          updateActiveCard({ backImage: bCanvas.toDataURL('image/png') });
        }

        window.dispatchEvent(new CustomEvent('app_toast', { detail: '🎉 e-Aadhaar Front & Back extracted perfectly!' }));

      } else if (mode === 'AUTO_SIDE_BY_SIDE') {
        // Classic Scanned Side-by-Side: Left = Front, Right = Back
        const halfW = Math.floor(W / 2);
        
        // Front
        const fCanvas = document.createElement('canvas');
        fCanvas.width = halfW;
        fCanvas.height = H;
        const fCtx = fCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(img, 0, 0, halfW, H, 0, 0, halfW, H);
          updateActiveCard({ frontImage: fCanvas.toDataURL('image/png') });
        }

        // Back
        const bCanvas = document.createElement('canvas');
        bCanvas.width = halfW;
        bCanvas.height = H;
        const bCtx = bCanvas.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(img, halfW, 0, halfW, H, 0, 0, halfW, H);
          updateActiveCard({ backImage: bCanvas.toDataURL('image/png') });
        }

        window.dispatchEvent(new CustomEvent('app_toast', { detail: '🎉 Side-by-side Front & Back separated!' }));

      } else if (mode === 'AUTO_STACKED') {
        // Stacked: Top = Front, Bottom = Back
        const halfH = Math.floor(H / 2);

        // Front
        const fCanvas = document.createElement('canvas');
        fCanvas.width = W;
        fCanvas.height = halfH;
        const fCtx = fCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(img, 0, 0, W, halfH, 0, 0, W, halfH);
          updateActiveCard({ frontImage: fCanvas.toDataURL('image/png') });
        }

        // Back
        const bCanvas = document.createElement('canvas');
        bCanvas.width = W;
        bCanvas.height = halfH;
        const bCtx = bCanvas.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(img, 0, halfH, W, halfH, 0, 0, W, halfH);
          updateActiveCard({ backImage: bCanvas.toDataURL('image/png') });
        }

        window.dispatchEvent(new CustomEvent('app_toast', { detail: '🎉 Top/Bottom Front & Back separated!' }));

      } else if (mode === 'MANUAL_FRONT') {
        updateActiveCard({ frontImage: cropSourceImage });
        window.dispatchEvent(new CustomEvent('app_toast', { detail: 'Set as Front Side!' }));
      } else if (mode === 'MANUAL_BACK') {
        updateActiveCard({ backImage: cropSourceImage });
        window.dispatchEvent(new CustomEvent('app_toast', { detail: 'Set as Back Side!' }));
      }

      setShowCropModal(false);
      setCropSourceImage(null);
    };
    img.src = cropSourceImage;
  };

  // ----------------------------------------------------
  // MULTI-CARD QUEUE CONTROLS
  // ----------------------------------------------------
  const handleAddCard = () => {
    if (currentPage.cards.length >= 5 && paperSize === 'a4') {
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '⚠️ Max 5 ID Cards per A4 sheet reached.' }));
      return;
    }

    const nextIndex = currentPage.cards.length + 1;
    const newCard: CardItem = {
      id: `card_${Date.now()}_${nextIndex}`,
      cardName: `Card ${nextIndex}`,
      cardTypePreset: activeCard?.cardTypePreset || 'aadhaar',
      frontImage: null,
      backImage: null,
      brightness: 100,
      contrast: 105,
      saturation: 100,
      textDarken: true,
      addBorder: true,
      roundedCorners: true,
    };

    setPages(prev => {
      const next = [...prev];
      next[activePageIndex] = {
        ...next[activePageIndex],
        cards: [...next[activePageIndex].cards, newCard]
      };
      return next;
    });

    setSelectedCardIndex(currentPage.cards.length);
  };

  const handleDeleteCard = (idx: number) => {
    if (currentPage.cards.length <= 1) {
      updateActiveCard({ frontImage: null, backImage: null });
      return;
    }

    setPages(prev => {
      const next = [...prev];
      next[activePageIndex] = {
        ...next[activePageIndex],
        cards: next[activePageIndex].cards.filter((_, i) => i !== idx)
      };
      return next;
    });

    setSelectedCardIndex(Math.max(0, idx - 1));
  };

  const handleAddPage = () => {
    const newNum = pages.length + 1;
    const newPage: PrintPage = {
      id: `page_${Date.now()}`,
      pageNumber: newNum,
      cards: [
        {
          id: `card_${Date.now()}_1`,
          cardName: 'Card 1',
          cardTypePreset: 'aadhaar',
          frontImage: null,
          backImage: null,
          brightness: 100,
          contrast: 105,
          saturation: 100,
          textDarken: true,
          addBorder: true,
          roundedCorners: true,
        }
      ]
    };
    setPages(prev => [...prev, newPage]);
    setActivePageIndex(pages.length);
    setSelectedCardIndex(0);
    window.dispatchEvent(new CustomEvent('app_toast', { detail: `📄 Added Page ${newNum}` }));
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) {
      updateActiveCard({ frontImage: null, backImage: null });
      return;
    }
    const newPages = pages.filter((_, idx) => idx !== activePageIndex).map((p, i) => ({
      ...p,
      pageNumber: i + 1
    }));
    setPages(newPages);
    setActivePageIndex(Math.max(0, activePageIndex - 1));
    setSelectedCardIndex(0);
    window.dispatchEvent(new CustomEvent('app_toast', { detail: '🗑️ Page deleted' }));
  };

  // ----------------------------------------------------
  // DRAW SINGLE CARD ON HIGH-RES CANVAS (300 DPI)
  // ----------------------------------------------------
  const drawCardOnCanvas = (
    ctx: CanvasRenderingContext2D,
    card: CardItem,
    startX: number,
    startY: number,
    w: number,
    h: number,
    imgSrc: string
  ): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();

        // Mirror horizontal print if enabled
        if (mirrorPrint) {
          ctx.translate(startX + w, startY);
          ctx.scale(-1, 1);
          startX = 0;
          startY = 0;
        }

        // Apply Quality Filters (Brightness, Contrast, Text Darkening)
        let filterStr = `brightness(${card.brightness}%) contrast(${card.contrast}%) saturate(${card.saturation}%)`;
        if (card.textDarken) {
          // Extra sharpness / text contrast
          filterStr += ' contrast(110%)';
        }
        ctx.filter = filterStr;

        // Draw image onto exact dimensions
        ctx.drawImage(img, startX, startY, w, h);
        ctx.restore();

        // Black cut border
        if (card.addBorder) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(startX, startY, w, h);
        }

        resolve();
      };
      img.onerror = () => resolve();
      img.src = imgSrc;
    });
  };

  // ----------------------------------------------------
  // GENERATE FULL SHEET CANVAS (300 DPI - 100% SCALE)
  // ----------------------------------------------------
  const generateCanvasForPage = async (page: PrintPage, targetDpi = 300): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    const pxPerMm = targetDpi / 25.4; // 300 DPI = 11.811 px/mm

    let sheetWidthMm = 210; // A4
    let sheetHeightMm = 297;

    if (paperSize === '4x6') {
      sheetWidthMm = 152.4; // 6 inch
      sheetHeightMm = 101.6; // 4 inch
    } else if (paperSize === 'pvc_single') {
      sheetWidthMm = CARD_WIDTH_MM;
      sheetHeightMm = CARD_HEIGHT_MM;
    } else if (paperSize === 'pvc_tray') {
      sheetWidthMm = 200;
      sheetHeightMm = 130;
    }

    const canvasWidthPx = Math.round(sheetWidthMm * pxPerMm);
    const canvasHeightPx = Math.round(sheetHeightMm * pxPerMm);

    canvas.width = canvasWidthPx;
    canvas.height = canvasHeightPx;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardWidthPx = Math.round(CARD_WIDTH_MM * pxPerMm); // ~1011 px
    const cardHeightPx = Math.round(CARD_HEIGHT_MM * pxPerMm); // ~638 px

    if (paperSize === '4x6') {
      // 4x6 Photo Paper (Side-by-side or Single)
      const gapX = Math.round(4 * pxPerMm);
      const totalW = singleSideMode ? cardWidthPx : cardWidthPx * 2 + gapX;
      const startX = Math.round((canvasWidthPx - totalW) / 2);
      const startY = Math.round((canvasHeightPx - cardHeightPx) / 2);

      const firstCard = page.cards[0];
      if (firstCard) {
        if (firstCard.frontImage) {
          await drawCardOnCanvas(ctx, firstCard, startX, startY, cardWidthPx, cardHeightPx, firstCard.frontImage);
        }
        if (!singleSideMode && firstCard.backImage) {
          await drawCardOnCanvas(ctx, firstCard, startX + cardWidthPx + gapX, startY, cardWidthPx, cardHeightPx, firstCard.backImage);
        }

        // Cutting Guideline
        if (!singleSideMode && (firstCard.frontImage || firstCard.backImage)) {
          ctx.strokeStyle = '#94a3b8';
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(startX + cardWidthPx + gapX / 2, startY - 10);
          ctx.lineTo(startX + cardWidthPx + gapX / 2, startY + cardHeightPx + 10);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

    } else if (paperSize === 'pvc_single') {
      // Single CR-80 PVC Card
      const firstCard = page.cards[0];
      if (firstCard?.frontImage) {
        await drawCardOnCanvas(ctx, firstCard, 0, 0, cardWidthPx, cardHeightPx, firstCard.frontImage);
      }

    } else if (paperSize === 'pvc_tray') {
      // Epson/Canon Plastic Tray
      const slot1X = Math.round(16 * pxPerMm);
      const slot2X = Math.round(104 * pxPerMm);
      const slotY = Math.round(38 * pxPerMm);

      const firstCard = page.cards[0];
      if (firstCard) {
        if (firstCard.frontImage) {
          await drawCardOnCanvas(ctx, firstCard, slot1X, slotY, cardWidthPx, cardHeightPx, firstCard.frontImage);
        }
        if (!singleSideMode && firstCard.backImage) {
          await drawCardOnCanvas(ctx, firstCard, slot2X, slotY, cardWidthPx, cardHeightPx, firstCard.backImage);
        }
      }

      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.round(14 * (targetDpi / 300))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Tray Slot 1 (Front Side)', slot1X + cardWidthPx / 2, slotY - 12);
      ctx.fillText('Tray Slot 2 (Back Side)', slot2X + cardWidthPx / 2, slotY - 12);

    } else {
      // A4 Sheet: Up to 5 Cards stacked vertically starting from TOP
      const topMarginPx = Math.round(topMarginMm * pxPerMm);
      const gapY = Math.round(rowGapMm * pxPerMm);
      const gapX = Math.round(cardGapMm * pxPerMm);
      const totalRowW = singleSideMode ? cardWidthPx : cardWidthPx * 2 + gapX;
      const startX = Math.round((canvasWidthPx - totalRowW) / 2);

      for (let i = 0; i < Math.min(page.cards.length, 5); i++) {
        const c = page.cards[i];
        const rowY = topMarginPx + i * (cardHeightPx + gapY);

        if (c.frontImage) {
          await drawCardOnCanvas(ctx, c, startX, rowY, cardWidthPx, cardHeightPx, c.frontImage);
        }
        if (!singleSideMode && c.backImage) {
          await drawCardOnCanvas(ctx, c, startX + cardWidthPx + gapX, rowY, cardWidthPx, cardHeightPx, c.backImage);
        }

        // Center Scissor Cut Guideline (only if gap is > 0)
        if (!singleSideMode && (c.frontImage || c.backImage) && gapX > 0) {
          ctx.strokeStyle = '#cbd5e1';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(startX + cardWidthPx + gapX / 2, rowY);
          ctx.lineTo(startX + cardWidthPx + gapX / 2, rowY + cardHeightPx);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(11 * (targetDpi / 300))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('eCyberCafe.in ID Card Print Studio • 100% Actual Size (CR-80: 85.60mm x 53.98mm)', canvasWidthPx / 2, canvasHeightPx - 20);
    }

    return canvas;
  };

  // ----------------------------------------------------
  // DIRECT 1-CLICK PRINT DIALOG
  // ----------------------------------------------------
  const handleAutoPrint = async () => {
    setIsProcessing(true);
    setStatusMessage('Preparing direct print dialog...');
    try {
      const pageImages: string[] = [];
      for (const p of pages) {
        const c = await generateCanvasForPage(p, 300);
        pageImages.push(c.toDataURL('image/jpeg', 0.98));
      }

      const isA4 = paperSize === 'a4';
      const pageSizeCss = isA4 ? 'A4 portrait' : paperSize === '4x6' ? '4in 6in landscape' : 'landscape';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>eCyberCafe.in Smart ID Print</title>
              <style>
                @page {
                  size: ${pageSizeCss};
                  margin: 0mm;
                }
                * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }
                body {
                  background: #fff;
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .page {
                  width: 100vw;
                  height: 100vh;
                  page-break-after: always;
                  page-break-inside: avoid;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .page:last-child {
                  page-break-after: auto;
                }
                img {
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
                  display: block;
                }
              </style>
            </head>
            <body>
              ${pageImages.map(src => `<div class="page"><img src="${src}" /></div>`).join('')}
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Direct print error:', err);
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '❌ Could not open print dialog' }));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ----------------------------------------------------
  // EXPORT 300 DPI PDF
  // ----------------------------------------------------
  const handleExportPDF = async () => {
    setIsProcessing(true);
    setStatusMessage('Generating High-Res PDF (300 DPI)...');
    try {
      const isA4 = paperSize === 'a4';
      const is4x6 = paperSize === '4x6';

      const doc = new jsPDF({
        orientation: isA4 ? 'portrait' : 'landscape',
        unit: 'mm',
        format: isA4 ? 'a4' : is4x6 ? [152.4, 101.6] : [200, 130]
      });

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) doc.addPage();
        const p = pages[i];
        const pageCanvas = await generateCanvasForPage(p, exportTier === 'PRO' ? 400 : 300);
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      doc.save(`eCyberCafe_ID_Card_${paperSize}_300DPI.pdf`);
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '🎉 High Quality Print PDF downloaded!' }));
    } catch (err) {
      console.error('PDF export error:', err);
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '❌ Error exporting PDF' }));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD COMBINED FRONT + BACK AS SINGLE HD PHOTO (300 DPI)
  // ----------------------------------------------------
  const handleDownloadCombinedHDPhoto = async (format: 'jpg' | 'png' = 'jpg') => {
    if (!activeCard?.frontImage && !activeCard?.backImage) {
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '⚠️ Please upload Front or Back card first' }));
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Generating Front+Back Combined HD Photo...');
    try {
      const targetDpi = exportTier === 'PRO' ? 400 : 300;
      const pxPerMm = targetDpi / 25.4;
      const cardWPx = Math.round(CARD_WIDTH_MM * pxPerMm); // ~1011 px
      const cardHPx = Math.round(CARD_HEIGHT_MM * pxPerMm); // ~638 px
      const gapXPx = Math.round(cardGapMm * pxPerMm);

      const totalWPx = singleSideMode ? cardWPx : cardWPx * 2 + gapXPx;
      const totalHPx = cardHPx;

      const canvas = document.createElement('canvas');
      canvas.width = totalWPx;
      canvas.height = totalHPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (activeCard.frontImage) {
        await drawCardOnCanvas(ctx, activeCard, 0, 0, cardWPx, cardHPx, activeCard.frontImage);
      }
      if (!singleSideMode && activeCard.backImage) {
        await drawCardOnCanvas(ctx, activeCard, cardWPx + gapXPx, 0, cardWPx, cardHPx, activeCard.backImage);
      }

      // Draw center scissor dashed cut guideline if gap > 0
      if (!singleSideMode && (activeCard.frontImage || activeCard.backImage) && gapXPx > 0) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cardWPx + gapXPx / 2, 0);
        ctx.lineTo(cardWPx + gapXPx / 2, cardHPx);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';

      const link = document.createElement('a');
      link.download = `Front_Back_Combined_${activeCard.cardTypePreset}_${targetDpi}DPI.${ext}`;
      link.href = canvas.toDataURL(mime, 0.98);
      link.click();
      window.dispatchEvent(new CustomEvent('app_toast', { detail: `🎉 Front + Back Combined HD Photo (${ext.toUpperCase()}) Downloaded!` }));
    } catch (err) {
      console.error('Combined HD photo download error:', err);
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '❌ Error generating combined photo' }));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD FULL A4 / SHEET AS HD JPG (300 DPI)
  // ----------------------------------------------------
  const handleDownloadSheetJPG = async () => {
    setIsProcessing(true);
    setStatusMessage('Generating High-Res Sheet JPG (300 DPI)...');
    try {
      const pageCanvas = await generateCanvasForPage(currentPage, exportTier === 'PRO' ? 400 : 300);
      const link = document.createElement('a');
      link.download = `eCyberCafe_Sheet_Page${activePageIndex + 1}_300DPI.jpg`;
      link.href = pageCanvas.toDataURL('image/jpeg', 0.98);
      link.click();
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '🎉 Full Sheet High-Res JPG Downloaded!' }));
    } catch (err) {
      console.error('Sheet JPG download error:', err);
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '❌ Error exporting Sheet JPG' }));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD INDIVIDUAL PVC FRONT / BACK (PNG/JPG)
  // ----------------------------------------------------
  const handleDownloadSingleSide = (side: 'FRONT' | 'BACK', format: 'png' | 'jpg' = 'png') => {
    const imgData = side === 'FRONT' ? activeCard?.frontImage : activeCard?.backImage;
    if (!imgData) {
      window.dispatchEvent(new CustomEvent('app_toast', { detail: `⚠️ ${side} side image not uploaded` }));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1011; // 85.6mm at 300 DPI
    canvas.height = 638; // 53.98mm at 300 DPI
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (mirrorPrint) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      let filterStr = `brightness(${activeCard.brightness}%) contrast(${activeCard.contrast}%) saturate(${activeCard.saturation}%)`;
      if (activeCard.textDarken) filterStr += ' contrast(110%)';
      ctx.filter = filterStr;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (activeCard.addBorder) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }

      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';

      const link = document.createElement('a');
      link.download = `PVC_${activeCard.cardTypePreset}_${side}_300DPI.${ext}`;
      link.href = canvas.toDataURL(mime, 0.98);
      link.click();
      window.dispatchEvent(new CustomEvent('app_toast', { detail: `🎉 Downloaded ${side} HD Photo (${ext.toUpperCase()})` }));
    };
    img.src = imgData;
  };

  return (
    <div className={`flex flex-col w-full bg-gradient-to-br from-white via-sky-50 to-indigo-50 text-slate-800 font-sans select-none ${isModalMode ? 'h-full max-h-[94vh]' : 'min-h-screen'}`}>
      
      {/* ======================================================== */}
      {/* 1. TOP NAVBAR BRANDING & PRIMARY ACTIONS */}
      {/* ======================================================== */}
      <header className="h-16 bg-gradient-to-r from-white via-sky-50 to-indigo-100 border-b border-sky-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-md">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button 
              onClick={onBackToHome}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Return to Portal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-indigo-900 tracking-tight leading-none">
                  eCyberCafe.in
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  SMART ID PRINT
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 hidden sm:block">
                Aadhaar, PAN, Voter, Ayushman & DL 1-Click Auto-Crop & High-Speed Direct Print
              </p>
            </div>
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2">
          
          {/* Sublimation / Mirror Toggle */}
          <button
            onClick={() => {
              setMirrorPrint(!mirrorPrint);
              window.dispatchEvent(new CustomEvent('app_toast', { detail: mirrorPrint ? 'Mirror Print Disabled' : '🔄 Mirror / Reverse Print Enabled (Sublimation)' }));
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mirrorPrint
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
                : 'bg-white hover:bg-sky-50 border-slate-300 text-slate-600 hover:text-indigo-700'
            }`}
            title="Invert / Mirror Horizontal (Sublimation & Transparent PVC Print)"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{mirrorPrint ? 'Mirror ON (उल्टा)' : 'Mirror Print'}</span>
          </button>

          {/* Premium Tools modal */}
          <button
            onClick={() => setShowPremiumModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Pro Features</span>
          </button>

          {/* Direct 1-Click Auto Print */}
          <button
            onClick={handleAutoPrint}
            disabled={isProcessing}
            className="px-4 sm:px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Auto Print</span>
          </button>

        </div>

      </header>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE: CONTROL SIDEBAR & LIVE SHEET VIEWPORT */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-gradient-to-br from-white via-sky-50 to-indigo-50">
        
        {/* =================== LEFT SIDEBAR =================== */}
        <aside className="id-studio-light w-full lg:w-[420px] bg-white/90 border-r border-sky-200 flex flex-col shrink-0 overflow-y-auto z-20 shadow-sm">
          
          <div className="p-4 sm:p-5 space-y-5 flex-1">
            
            {/* 1. DOCUMENT PRESET SELECTOR */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>SELECT CARD TYPE (दस्तावेज का प्रकार)</span>
                </span>
                <span className="text-[10px] text-blue-400 font-bold">Auto-Crop Profile</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'aadhaar', label: '🆔 Aadhaar' },
                  { id: 'pan', label: '💳 PAN Card' },
                  { id: 'voter', label: '🗳️ Voter ID' },
                  { id: 'ayushman', label: '🏥 Ayushman' },
                  { id: 'dl', label: '🚗 Driving Lic' },
                  { id: 'eshram', label: '👷 e-Shram' },
                  { id: 'student', label: '🎓 Student ID' },
                  { id: 'custom', label: '🪪 Custom CR80' }
                ].map(c => {
                  const isSelected = activeCard?.cardTypePreset === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => updateActiveCard({ cardTypePreset: c.id as DocumentTypePreset })}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer text-[11px] font-bold ${
                        isSelected
                          ? 'bg-blue-100 border-blue-500 text-blue-900 ring-2 ring-blue-200 shadow-xs'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PAPER LAYOUT SELECTION */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>PAPER & PRINT LAYOUT</span>
                </label>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'a4', label: 'A4 Paper', desc: '5 Cards' },
                  { id: '4x6', label: '4x6 Photo', desc: 'Glossy' },
                  { id: 'pvc_single', label: 'PVC Single', desc: 'CR-80' },
                  { id: 'pvc_tray', label: 'PVC Tray', desc: 'Epson/Canon' }
                ].map(item => {
                  const isSelected = paperSize === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPaperSize(item.id as PaperSize)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-blue-100 border-blue-500 text-blue-900 ring-2 ring-blue-200 shadow-xs'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[11px] font-black">{item.label}</span>
                      <span className="text-[9px] text-slate-400 leading-none mt-0.5">{item.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                {/* Single Side Toggle */}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleSideMode}
                    onChange={(e) => setSingleSideMode(e.target.checked)}
                    className="rounded accent-blue-600 bg-slate-800 border-slate-700"
                  />
                  <span>Single Side Only (केवल Front)</span>
                </label>

                {/* Mirror / Invert Toggle */}
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirrorPrint}
                    onChange={(e) => setMirrorPrint(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>Mirror Print (उल्टा)</span>
                </label>
              </div>
            </div>

            {/* 3. DOCUMENT UPLOAD & SMART CROP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>UPLOAD & AUTO-CROP</span>
                </label>
                
                <button
                  onClick={() => updateActiveCard({ frontImage: null, backImage: null })}
                  className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-wider cursor-pointer"
                >
                  CLEAR CARD
                </button>
              </div>

              {/* Universal 1-Click Smart File Dropzone */}
              <div
                onClick={() => generalFileInputRef.current?.click()}
                className="p-3 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-2 border-dashed border-blue-400 hover:border-indigo-500 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center mb-1">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-indigo-900">
                  Upload PDF or Full Image Scan
                </h4>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  1-Click Auto Crop for e-Aadhaar, PAN & Voter Cards
                </p>
                <input
                  ref={generalFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadedFile(f, 'SMART');
                  }}
                />
              </div>

              {/* Front & Back Dedicated Dropzones */}
              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Front Side */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-300">
                    <span>Front Side (आगे)</span>
                    {activeCard?.frontImage && (
                      <button
                        onClick={() => updateActiveCard({ frontImage: null })}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {activeCard?.frontImage ? (
                    <div className="group relative aspect-[85.6/54] rounded-xl overflow-hidden border border-blue-500 bg-slate-900 shadow-inner">
                      <img 
                        src={activeCard.frontImage} 
                        alt="Front" 
                        className="w-full h-full object-cover" 
                        style={{
                          filter: `brightness(${activeCard.brightness}%) contrast(${activeCard.contrast}%) saturate(${activeCard.saturation}%)`
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all backdrop-blur-2xs">
                        <button
                          onClick={() => openAdjustScan(activeCard.frontImage!, 'FRONT')}
                          className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                          title="Adjust Scan & Re-Crop"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => frontInputRef.current?.click()}
                          className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                          title="Replace Front"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadSingleSide('FRONT')}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                          title="Download PNG (300 DPI)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => frontInputRef.current?.click()}
                      className="aspect-[85.6/54] rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 hover:bg-blue-950/20 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all"
                    >
                      <Upload className="w-4 h-4 text-blue-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-300">Front Scan</span>
                    </div>
                  )}

                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadedFile(f, 'FRONT');
                    }}
                  />
                </div>

                {/* Back Side */}
                {!singleSideMode && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-300">
                      <span>Back Side (पीछे)</span>
                      {activeCard?.backImage && (
                        <button
                          onClick={() => updateActiveCard({ backImage: null })}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {activeCard?.backImage ? (
                      <div className="group relative aspect-[85.6/54] rounded-xl overflow-hidden border border-indigo-500 bg-slate-900 shadow-inner">
                        <img 
                          src={activeCard.backImage} 
                          alt="Back" 
                          className="w-full h-full object-cover" 
                          style={{
                            filter: `brightness(${activeCard.brightness}%) contrast(${activeCard.contrast}%) saturate(${activeCard.saturation}%)`
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all backdrop-blur-2xs">
                          <button
                            onClick={() => openAdjustScan(activeCard.backImage!, 'BACK')}
                            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                            title="Adjust Scan & Re-Crop"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => backInputRef.current?.click()}
                            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                            title="Replace Back"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadSingleSide('BACK')}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                            title="Download PNG (300 DPI)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => backInputRef.current?.click()}
                        className="aspect-[85.6/54] rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-indigo-950/20 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all"
                      >
                        <RotateCw className="w-4 h-4 text-indigo-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-300">Back Scan</span>
                      </div>
                    )}

                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadedFile(f, 'BACK');
                      }}
                    />
                  </div>
                )}

              </div>

              {/* Quality & Edge Enhancements */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1 text-blue-400">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Clarity & Ink Density</span>
                  </span>

                  <div className="flex items-center gap-2 text-[10px]">
                    <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeCard?.textDarken}
                        onChange={(e) => updateActiveCard({ textDarken: e.target.checked })}
                        className="accent-blue-600 rounded"
                      />
                      <span>Deep Black</span>
                    </label>
                    <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeCard?.addBorder}
                        onChange={(e) => updateActiveCard({ addBorder: e.target.checked })}
                        className="accent-blue-600 rounded"
                      />
                      <span>Cut Border</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Brightness</span>
                      <span>{activeCard?.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="125"
                      value={activeCard?.brightness || 100}
                      onChange={(e) => updateActiveCard({ brightness: parseInt(e.target.value) })}
                      className="w-full accent-blue-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Contrast</span>
                      <span>{activeCard?.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="140"
                      value={activeCard?.contrast || 105}
                      onChange={(e) => updateActiveCard({ contrast: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* CARD SPACING & MARGINS TOOL (गैप व मार्जिन एडजस्ट करें) */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <Move className="w-3.5 h-3.5" />
                    <span>Card Gap & Margins (गैप)</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
                    Gap: {cardGapMm}mm • Top: {topMarginMm}mm
                  </span>
                </div>

                {/* Front & Back Horizontal Gap */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-300">Front & Back Gap (दोनों साइड का गैप):</span>
                    <span className="font-mono text-blue-400 font-bold">{cardGapMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="0.5"
                    value={cardGapMm}
                    onChange={(e) => setCardGapMm(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  {/* Preset quick pills */}
                  <div className="flex items-center gap-1 pt-0.5">
                    {[
                      { label: '0mm (Fold/चिपका)', val: 0 },
                      { label: '2mm', val: 2 },
                      { label: '4mm (Std)', val: 4 },
                      { label: '8mm', val: 8 },
                      { label: '15mm', val: 15 }
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setCardGapMm(p.val)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                          cardGapMm === p.val
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Top Margin Controller (Start from Top) */}
                <div className="space-y-1 pt-1 border-t border-slate-900">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-300">Top Margin (ऊपर से दूरी):</span>
                    <span className="font-mono text-emerald-400 font-bold">{topMarginMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="35"
                    step="1"
                    value={topMarginMm}
                    onChange={(e) => setTopMarginMm(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  {/* Presets */}
                  <div className="flex items-center gap-1 pt-0.5">
                    {[
                      { label: '4mm (Topmost)', val: 4 },
                      { label: '8mm (Std Top)', val: 8 },
                      { label: '14mm', val: 14 },
                      { label: '22mm', val: 22 }
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setTopMarginMm(p.val)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                          topMarginMm === p.val
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* 4. MULTI-CARD BATCH QUEUE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>CARD QUEUE ({currentPage.cards.length} on Sheet)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Page {activePageIndex + 1} of {pages.length}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-[120px] overflow-y-auto">
                {currentPage.cards.map((c, idx) => {
                  const isSelected = selectedCardIndex === idx;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCardIndex(idx)}
                      className={`p-1.5 px-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/50 border-blue-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-black flex items-center justify-center text-slate-300">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold truncate">
                          {c.cardName || `Card ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {c.frontImage && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Front Ready"></span>}
                          {c.backImage && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Back Ready"></span>}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(idx);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-md cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Queue Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {paperSize === 'a4' && (
                  <button
                    onClick={handleAddCard}
                    disabled={currentPage.cards.length >= 5}
                    className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Card</span>
                  </button>
                )}

                <button
                  onClick={handleAddPage}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add Page</span>
                </button>

                <button
                  onClick={handleDeletePage}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Del Page</span>
                </button>
              </div>

            </div>

          </div>

          {/* =================== EXPORT CONTROLS (STICKY BOTTOM) =================== */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5 shrink-0">
            
            {/* Header & Quick Individual Downloads */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  DOWNLOAD & EXPORT (HD PHOTO)
                </h3>
                <p className="text-[10px] text-slate-400">CR-80 Standard • 300 DPI High-Definition</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownloadSingleSide('FRONT', 'jpg')}
                  disabled={!activeCard?.frontImage}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white rounded-lg disabled:opacity-40 cursor-pointer"
                  title="Download Front HD Photo (JPG)"
                >
                  Front HD
                </button>
                <button
                  onClick={() => handleDownloadSingleSide('BACK', 'jpg')}
                  disabled={!activeCard?.backImage || singleSideMode}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white rounded-lg disabled:opacity-40 cursor-pointer"
                  title="Download Back HD Photo (JPG)"
                >
                  Back HD
                </button>
              </div>
            </div>

            {/* COMBINED FRONT + BACK 1 PHOTO HD DOWNLOAD (KEY FEATURE) */}
            <button
              onClick={() => handleDownloadCombinedHDPhoto('jpg')}
              disabled={!activeCard?.frontImage && !activeCard?.backImage}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-700/20 active:scale-98 disabled:opacity-40"
              title="Download Front and Back as a Single Combined HD Photo"
            >
              <ImageIcon className="w-4 h-4" />
              <span>📸 Front + Back Combined HD Photo (1 Photo)</span>
            </button>

            {/* Main Export Grid (PDF, Sheet JPG, 1-Click Print) */}
            <div className="grid grid-cols-3 gap-1.5">
              
              <button
                onClick={handleDownloadSheetJPG}
                disabled={isProcessing}
                className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                title="Download full A4 Sheet as 300 DPI JPG"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Sheet JPG</span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isProcessing}
                className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                title="Download full PDF (300 DPI)"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF (300 DPI)</span>
              </button>

              <button
                onClick={handleAutoPrint}
                disabled={isProcessing}
                className="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-blue-600/30 active:scale-95"
                title="Direct Browser Print"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Direct Print</span>
              </button>

            </div>

          </div>

        </aside>

        {/* =================== RIGHT INTERACTIVE CANVAS VIEWPORT =================== */}
        <main className="id-studio-light flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-sky-50 min-w-0 min-h-0 relative overflow-hidden">
          
          {/* Top Banner with Clean Embedded Zoom Controls */}
          <div className="h-11 bg-white/95 border-b border-sky-200 px-4 flex items-center justify-between text-xs text-slate-700 shrink-0 shadow-2xs z-20">
            <div className="flex items-center gap-2">
              <span className="font-black text-indigo-900">Sheet Preview:</span>
              <span className="text-blue-600 font-bold">
                {paperSize === 'a4' ? 'A4 Paper (210 × 297 mm)' : paperSize === '4x6' ? '4×6 Photo Paper (100 × 150 mm)' : paperSize === 'pvc_single' ? 'Single Plastic PVC Card (85.6 × 54 mm)' : 'Epson/Canon Plastic Tray'}
              </span>
              {mirrorPrint && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 text-[9px] font-black uppercase">
                  MIRROR ACTIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Interactive Zoom Controls Bar */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-0.5 flex items-center gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(30, prev - 10))}
                  className="p-1 text-slate-600 hover:text-slate-950 rounded-lg hover:bg-white cursor-pointer transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-black text-slate-700 px-1 min-w-[38px] text-center select-none font-mono">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(180, prev + 10))}
                  className="p-1 text-slate-600 hover:text-slate-950 rounded-lg hover:bg-white cursor-pointer transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleFitToScreen}
                  className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md cursor-pointer border border-emerald-300 bg-white flex items-center gap-1 transition-all"
                  title="Fit whole sheet to screen"
                >
                  <Maximize2 className="w-3 h-3 text-emerald-600" />
                  <span>Fit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md cursor-pointer border transition-all ${
                    zoomLevel === 100
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 bg-white'
                  }`}
                  title="Actual 100% Size"
                >
                  100%
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                Scale: 100% (CR-80: 85.60 × 53.98 mm)
              </span>
            </div>
          </div>

          {/* Canvas Scrollable Container with Safe Flex Centering Wrapper */}
          <div 
            ref={previewContainerRef}
            className="flex-1 overflow-auto p-4 sm:p-6 bg-gradient-to-br from-slate-100 via-white to-sky-100 min-h-0 relative"
          >
            <div className="min-w-full min-h-full flex items-center justify-center">
              <div 
                className="m-auto shrink-0 flex items-center justify-center p-2 sm:p-4 transition-all duration-150"
                style={{
                  width: `${Math.round(paperDimensions.width * (zoomLevel / 100))}px`,
                  height: `${Math.round(paperDimensions.height * (zoomLevel / 100))}px`,
                }}
              >
                {/* The Actual Scaled Paper Sheet Representation */}
                <div
                  style={{
                    width: `${paperDimensions.width}px`,
                    height: `${paperDimensions.height}px`,
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.1s ease-out'
                  }}
                  className="relative bg-white text-slate-950 shadow-2xl shadow-slate-400/50 rounded-xs border border-slate-300 shrink-0 overflow-hidden"
                >
                  
                  {/* ---------------- 1. A4 SHEET LAYOUT (5 CARDS) ---------------- */}
                  {paperSize === 'a4' && (
                    <div className="w-[595px] h-[842px] p-4 flex flex-col justify-between relative select-none">
                  
                  {/* Sheet Top Branding */}
                  <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-200 text-[10px] font-mono text-slate-500 shrink-0">
                    <span className="font-black text-slate-700">eCyberCafe.in • 5-Card A4 Print Sheet</span>
                    <span>Page {activePageIndex + 1} of {pages.length}</span>
                  </div>

                  {/* Cards Stack starting from TOP with adjustable Top Margin & Gaps */}
                  <div 
                    className="flex flex-col items-center flex-1"
                    style={{
                      marginTop: `${Math.max(2, topMarginMm * 1.5)}px`,
                      gap: `${Math.max(2, rowGapMm * 1.5)}px`
                    }}
                  >
                    {currentPage.cards.map((c, cIdx) => (
                      <div 
                        key={c.id} 
                        className="flex items-center justify-center relative transition-all"
                        style={{ gap: `${Math.max(0, cardGapMm * 1.6)}px` }}
                      >
                        
                        {/* Front Side */}
                        <div 
                          className={`w-[230px] aspect-[85.6/54] bg-slate-50 border border-slate-300 relative overflow-hidden shadow-xs flex items-center justify-center ${
                            c.roundedCorners ? 'rounded-md' : 'rounded-none'
                          }`}
                        >
                          {c.frontImage ? (
                            <img
                              src={c.frontImage}
                              alt="Front"
                              className={`w-full h-full object-cover ${mirrorPrint ? 'scale-x-[-1]' : ''}`}
                              style={{
                                filter: `brightness(${c.brightness}%) contrast(${c.contrast}%) saturate(${c.saturation}%)`
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-2">
                              <span className="text-[10px] font-bold text-slate-400">Card {cIdx + 1} Front</span>
                              <span className="text-[8px] text-slate-400">85.60 × 53.98 mm</span>
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 text-[7px] font-bold text-slate-500 bg-white/90 px-1 rounded">
                            #{cIdx + 1} FRONT
                          </span>
                        </div>

                        {/* Cut Line or Fold Seam */}
                        {!singleSideMode && cardGapMm > 0 && (
                          <div className="h-10 border-r border-dashed border-slate-300 relative flex items-center justify-center">
                            <span className="absolute -top-2.5 text-[8px] text-slate-400">✂</span>
                          </div>
                        )}
                        {!singleSideMode && cardGapMm === 0 && (
                          <div className="h-8 border-r border-slate-300/60" title="Touching / Fold Seam" />
                        )}

                        {/* Back Side */}
                        {!singleSideMode && (
                          <div 
                            className={`w-[230px] aspect-[85.6/54] bg-slate-50 border border-slate-300 relative overflow-hidden shadow-xs flex items-center justify-center ${
                              c.roundedCorners ? 'rounded-md' : 'rounded-none'
                            }`}
                          >
                            {c.backImage ? (
                              <img
                                src={c.backImage}
                                alt="Back"
                                className={`w-full h-full object-cover ${mirrorPrint ? 'scale-x-[-1]' : ''}`}
                                style={{
                                  filter: `brightness(${c.brightness}%) contrast(${c.contrast}%) saturate(${c.saturation}%)`
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center p-2">
                                <span className="text-[10px] font-bold text-slate-400">Card {cIdx + 1} Back</span>
                                <span className="text-[8px] text-slate-400">85.60 × 53.98 mm</span>
                              </div>
                            )}
                            <span className="absolute bottom-1 right-1 text-[7px] font-bold text-slate-500 bg-white/90 px-1 rounded">
                              #{cIdx + 1} BACK
                            </span>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>

                  {/* Sheet Footer */}
                  <div className="text-center pt-2 border-t border-slate-200 mt-auto shrink-0">
                    <p className="text-[8px] font-mono text-slate-400">
                      Exact CR-80 Standard: 85.60 mm × 53.98 mm • Print Settings: Set Scale to '100% / Actual Size'
                    </p>
                  </div>

                </div>
              )}

              {/* ---------------- 2. 4x6 PHOTO PAPER LAYOUT ---------------- */}
              {paperSize === '4x6' && (
                <div className="w-[576px] h-[384px] p-6 flex flex-col items-center justify-center relative">
                  <div 
                    className="flex items-center justify-center my-auto transition-all"
                    style={{ gap: `${Math.max(4, cardGapMm * 1.8)}px` }}
                  >
                    
                    {/* Front */}
                    <div className="w-[240px] aspect-[85.6/54] bg-slate-50 border border-slate-300 relative overflow-hidden shadow-sm rounded-md flex items-center justify-center">
                      {currentPage.cards[0]?.frontImage ? (
                        <img
                          src={currentPage.cards[0].frontImage}
                          alt="Front"
                          className={`w-full h-full object-cover ${mirrorPrint ? 'scale-x-[-1]' : ''}`}
                          style={{
                            filter: `brightness(${currentPage.cards[0].brightness}%) contrast(${currentPage.cards[0].contrast}%) saturate(${currentPage.cards[0].saturation}%)`
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Front Side Empty</span>
                      )}
                      <span className="absolute bottom-1 right-1 text-[8px] font-bold text-slate-500 bg-white/90 px-1 rounded">
                        FRONT
                      </span>
                    </div>

                    {!singleSideMode && cardGapMm > 0 && (
                      <div className="h-28 border-r-2 border-dashed border-slate-300 relative">
                        <span className="absolute -top-3 -left-2 text-[10px] text-slate-400">✂</span>
                      </div>
                    )}

                    {/* Back */}
                    {!singleSideMode && (
                      <div className="w-[240px] aspect-[85.6/54] bg-slate-50 border border-slate-300 relative overflow-hidden shadow-sm rounded-md flex items-center justify-center">
                        {currentPage.cards[0]?.backImage ? (
                          <img
                            src={currentPage.cards[0].backImage}
                            alt="Back"
                            className={`w-full h-full object-cover ${mirrorPrint ? 'scale-x-[-1]' : ''}`}
                            style={{
                              filter: `brightness(${currentPage.cards[0].brightness}%) contrast(${currentPage.cards[0].contrast}%) saturate(${currentPage.cards[0].saturation}%)`
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Back Side Empty</span>
                        )}
                        <span className="absolute bottom-1 right-1 text-[8px] font-bold text-slate-500 bg-white/90 px-1 rounded">
                          BACK
                        </span>
                      </div>
                    )}

                  </div>

                  <span className="absolute bottom-2 text-[9px] font-mono text-slate-400">
                    4×6 Inch Photo Sheet • 100% True Scale (Lamination Ready)
                  </span>
                </div>
              )}

              {/* ---------------- 3. SINGLE PVC CARD LAYOUT ---------------- */}
              {paperSize === 'pvc_single' && (
                <div className="w-[420px] aspect-[85.6/54] bg-white border border-slate-300 rounded-xl overflow-hidden shadow-lg flex items-center justify-center relative">
                  {currentPage.cards[0]?.frontImage ? (
                    <img
                      src={currentPage.cards[0].frontImage}
                      alt="Front"
                      className={`w-full h-full object-cover ${mirrorPrint ? 'scale-x-[-1]' : ''}`}
                      style={{
                        filter: `brightness(${currentPage.cards[0].brightness}%) contrast(${currentPage.cards[0].contrast}%) saturate(${currentPage.cards[0].saturation}%)`
                      }}
                    />
                  ) : (
                    <div className="text-center p-4">
                      <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <span className="text-xs font-bold text-slate-400">Single PVC Card Preview (85.60 × 53.98 mm)</span>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- 4. PVC PLASTIC TRAY LAYOUT ---------------- */}
              {paperSize === 'pvc_tray' && (
                <div className="w-[600px] h-[390px] p-6 bg-slate-50 border-2 border-slate-300 flex flex-col justify-between relative">
                  <div className="text-center pb-2 border-b border-slate-200 text-xs font-black text-slate-700 uppercase">
                    Epson / Canon 2-Card Plastic Tray Template
                  </div>

                  <div className="flex items-center justify-center gap-8 my-auto">
                    {/* Slot 1 */}
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-600">Slot 1 (Front Side)</span>
                      <div className="w-[210px] aspect-[85.6/54] bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
                        {currentPage.cards[0]?.frontImage ? (
                          <img src={currentPage.cards[0].frontImage} alt="Front" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Slot 1 Empty</span>
                        )}
                      </div>
                    </div>

                    {/* Slot 2 */}
                    {!singleSideMode && (
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-600">Slot 2 (Back Side)</span>
                        <div className="w-[210px] aspect-[85.6/54] bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
                          {currentPage.cards[0]?.backImage ? (
                            <img src={currentPage.cards[0].backImage} alt="Back" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">Slot 2 Empty</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-2 border-t border-slate-200 text-[9px] text-slate-400">
                    Direct Slot Alignment for Epson L805, L850, L8050 & Canon G1010, G3010 Trays
                  </div>
                </div>
              )}

                </div>
              </div>
            </div>

          </div>

        </main>

      </div>

      {/* ======================================================== */}
      {/* 3. INTELLIGENT CROP & SPLIT MODAL */}
      {/* ======================================================== */}
      {showCropModal && cropSourceImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-white">
                  Smart Document Cropper (स्मार्ट कार्ड एक्सट्रैक्टर)
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowCropModal(false);
                  setCropSourceImage(null);
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crop Preset Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'AUTO_VOTER', label: '🗳️ e-EPIC Voter Card', desc: 'Auto cut top Front & Back' },
                { id: 'AUTO_AADHAAR', label: '🆔 e-Aadhaar Bottom', desc: 'Auto cut bottom strip' },
                { id: 'AUTO_SIDE_BY_SIDE', label: '↔️ Left / Right', desc: 'Front Left, Back Right' },
                { id: 'AUTO_STACKED', label: '↕️ Top / Bottom', desc: 'Front Top, Back Bottom' },
                { id: 'MANUAL_FRONT', label: '🪪 Whole As Front', desc: 'Full image as Front' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setCropMode(m.id as any)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    cropMode === m.id
                      ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-black">{m.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Document Preview with Visual Guidelines */}
            <div className="aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 p-2 relative max-h-[380px]">
              <img src={cropSourceImage} alt="Crop Source" className="max-w-full max-h-full object-contain" />
              
              {/* Visual Guidance Overlay */}
              {cropMode === 'AUTO_VOTER' && (
                <div className="absolute inset-x-8 top-4 h-[35%] flex items-center justify-between gap-3 pointer-events-none">
                  <div className="w-1/2 h-full border-2 border-emerald-400 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      VOTER FRONT (Top Left)
                    </span>
                  </div>
                  <div className="w-1/2 h-full border-2 border-blue-400 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      VOTER BACK (Top Right)
                    </span>
                  </div>
                </div>
              )}

              {cropMode === 'AUTO_AADHAAR' && (
                <div className="absolute inset-x-8 bottom-3 h-[28%] border-2 border-emerald-400 bg-emerald-500/20 rounded-lg flex items-center justify-around pointer-events-none">
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                    FRONT (Bottom Left)
                  </span>
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                    BACK (Bottom Right)
                  </span>
                </div>
              )}

              {cropMode === 'AUTO_SIDE_BY_SIDE' && (
                <div className="absolute inset-4 border-2 border-blue-400 bg-blue-500/10 rounded-lg flex items-center justify-center pointer-events-none">
                  <div className="w-1/2 h-full border-r-2 border-dashed border-blue-400 flex items-center justify-center">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      LEFT = FRONT
                    </span>
                  </div>
                  <div className="w-1/2 h-full flex items-center justify-center">
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      RIGHT = BACK
                    </span>
                  </div>
                </div>
              )}

              {cropMode === 'AUTO_STACKED' && (
                <div className="absolute inset-4 border-2 border-blue-400 bg-blue-500/10 rounded-lg flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-full h-1/2 border-b-2 border-dashed border-blue-400 flex items-center justify-center">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      TOP = FRONT
                    </span>
                  </div>
                  <div className="w-full h-1/2 flex items-center justify-center">
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      BOTTOM = BACK
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropSourceImage(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={() => executeCrop(cropMode)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Apply Smart Auto-Crop</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. PRO FEATURES INFORMATION MODAL */}
      {/* ======================================================== */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">eCyberCafe.in Smart ID Suite Features</h3>
              </div>
              <button onClick={() => setShowPremiumModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'e-Aadhaar 1-Click Bottom Crop', desc: 'Instantly cuts the bottom card area from UIDAI official e-Aadhaar PDF letters.', badge: 'FREE' },
                { title: 'Sublimation Mirror Reverse Print', desc: 'Invert the print horizontally for transparent PVC sheets and heat press sublimation.', badge: 'FREE' },
                { title: '300 DPI Native CR-80 Export', desc: 'Exact 85.60 mm × 53.98 mm millimeter scale for crisp QR code scanning.', badge: 'FREE' },
                { title: 'Epson & Canon Plastic Tray Alignment', desc: 'Pre-calibrated Slot 1 & Slot 2 coordinates for L805, L850, L8050, G1010, G3010 trays.', badge: 'PRO' },
                { title: 'Batch Multi-Card Queue', desc: 'Print up to 5 ID cards on a single A4 sheet with dashed scissor guidelines.', badge: 'PRO' }
              ].map((f, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white">{f.title}</h4>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPremiumModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Start Printing ID Cards
            </button>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ADJUST SCAN & CROP WORKSPACE (1:1 ECYBERCAFE.IN MATCH)  */}
      {/* ======================================================== */}
      {showAdjustScan && adjustScanSrc && (
        <AdjustScanWorkspace
          isOpen={showAdjustScan}
          imageSrc={adjustScanSrc}
          targetSideName={adjustScanTargetSide === 'FRONT' ? 'Front Side' : 'Back Side'}
          initialCropBox={adjustScanBox}
          onClose={() => {
            setShowAdjustScan(false);
            setAdjustScanSrc(null);
          }}
          onConfirm={async (croppedDataUrl, adjustments, box) => {
            await handleAdjustScanConfirm(croppedDataUrl, adjustments, box);
            setShowAdjustScan(false);
            setAdjustScanSrc(null);
          }}
        />
      )}

      <PasswordPromptModal
        isOpen={Boolean(passwordRequest)}
        fileName={passwordRequest?.fileName}
        isVerifying={isPasswordVerifying}
        errorMessage={passwordError}
        onUnlock={(password) => {
          const request = passwordRequest;
          if (!request || !password) return;
          setPasswordError(undefined);
          setIsPasswordVerifying(true);
          request.submitPassword(password);
        }}
        onClose={() => {
          const request = passwordRequest;
          setPasswordRequest(null);
          setPasswordError(undefined);
          setIsPasswordVerifying(false);
          request?.cancel();
          processingJobRef.current?.controller.abort();
        }}
      />

    </div>
  );
};
