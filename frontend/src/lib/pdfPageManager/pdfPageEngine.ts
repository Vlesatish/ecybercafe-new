import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { ManagedPdfPage, PdfDocumentInfo } from '../../types/pdfPageManager';

// Configure worker for pdfjs-dist
if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn('PDF.js worker initialization warning:', e);
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface LoadPdfProgress {
  current: number;
  total: number;
  message: string;
}

export async function loadPdfDocumentData(
  file: File,
  password?: string,
  onProgress?: (progress: LoadPdfProgress) => void
): Promise<{ docInfo: PdfDocumentInfo; pages: ManagedPdfPage[] }> {
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({
    current: 0,
    total: 100,
    message: 'Reading PDF document...'
  });

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer.slice(0)),
    password: password || undefined
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  if (totalPages === 0) {
    throw new Error('This PDF contains 0 pages.');
  }

  const pages: ManagedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      current: pageNum,
      total: totalPages,
      message: `Rendering page ${pageNum} of ${totalPages}...`
    });

    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });

    // Render thumbnail with target width of ~300px for crisp rendering and low memory
    const maxDim = Math.max(baseViewport.width, baseViewport.height);
    const targetDim = 320;
    const scale = Math.max(0.25, Math.min(1.5, targetDim / maxDim));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('Canvas context 2D not available for rendering thumbnail.');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas
    } as any).promise;

    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.88);

    pages.push({
      id: `page_${pageNum - 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      originalIndex: pageNum - 1, // 0-based index
      currentOrder: pageNum, // 1-based order
      rotation: 0,
      removed: false,
      thumbnailUrl,
      width: baseViewport.width,
      height: baseViewport.height
    });
  }

  const docInfo: PdfDocumentInfo = {
    fileName: file.name,
    fileSize: file.size,
    fileSizeFormatted: formatBytes(file.size),
    totalPages,
    originalBuffer: arrayBuffer
  };

  return { docInfo, pages };
}

/**
 * Generates the final PDF preserving original page vector quality
 * by copying pages directly with pdf-lib.
 */
export async function generateReorderedPdf(
  originalBuffer: ArrayBuffer,
  pages: ManagedPdfPage[]
): Promise<Uint8Array> {
  const activePages = pages.filter((p) => !p.removed);

  if (activePages.length === 0) {
    throw new Error('Cannot create PDF: All pages have been removed.');
  }

  // Load original document with pdf-lib
  const srcDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true });
  const destDoc = await PDFDocument.create();

  // Copy each page in active sequence
  const pageIndices = activePages.map((p) => p.originalIndex);
  const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);

  copiedPages.forEach((page, idx) => {
    const pageConfig = activePages[idx];
    if (pageConfig.rotation !== 0) {
      const currentAngle = page.getRotation().angle || 0;
      const targetAngle = ((currentAngle + pageConfig.rotation) % 360 + 360) % 360;
      page.setRotation(degrees(targetAngle));
    }
    destDoc.addPage(page);
  });

  return await destDoc.save();
}

/**
 * Reorders a list of pages and updates currentOrder dynamically
 */
export function reorderManagedPages(
  pages: ManagedPdfPage[],
  fromIndex: number,
  toIndex: number
): ManagedPdfPage[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= pages.length || toIndex >= pages.length) {
    return pages;
  }

  const next = [...pages];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  // Recalculate 1-indexed currentOrder
  let orderCounter = 1;
  return next.map((p) => {
    if (!p.removed) {
      const updated = { ...p, currentOrder: orderCounter };
      orderCounter++;
      return updated;
    }
    return p;
  });
}

/**
 * Normalizes rotation to 0, 90, 180, 270
 */
export function normalizeRotation(deg: number): number {
  const rem = deg % 360;
  return rem < 0 ? rem + 360 : rem;
}
