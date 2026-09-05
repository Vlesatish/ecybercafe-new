import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  JpgToPdfQueueItem,
  JpgToPdfSettings,
  PageMarginOption,
  PageOrientationOption,
  PageSizeOption,
  QualityOption
} from '../../types/jpgToPdf';

// Ensure PDF.js worker is registered
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

export interface ProgressCallback {
  (progress: { current: number; total: number; message: string }): void;
}

/**
 * Parses an image file and extracts thumbnail, dimensions, and metadata
 */
async function processImageFile(file: File): Promise<{
  thumbnailUrl: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 800;
        const height = img.naturalHeight || img.height || 600;

        // Render compact thumbnail
        const maxDim = Math.max(width, height);
        const scale = Math.min(1, 360 / maxDim);
        const thumbWidth = Math.max(1, Math.round(width * scale));
        const thumbHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({
            thumbnailUrl: objectUrl,
            width,
            height
          });
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, thumbWidth, thumbHeight);
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(objectUrl);

        resolve({
          thumbnailUrl,
          width,
          height
        });
      } catch (err) {
        resolve({
          thumbnailUrl: objectUrl,
          width: 800,
          height: 600
        });
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Parses a PDF file, extracts page count and renders first page as thumbnail
 */
async function processPdfFile(file: File): Promise<{
  thumbnailUrl: string;
  pageCount: number;
  width: number;
  height: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer.slice(0))
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  if (pageCount === 0) {
    throw new Error('PDF file has no pages.');
  }

  const firstPage = await pdf.getPage(1);
  const baseViewport = firstPage.getViewport({ scale: 1 });

  const maxDim = Math.max(baseViewport.width, baseViewport.height);
  const scale = Math.min(1.2, 360 / maxDim);
  const viewport = firstPage.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available for PDF rendering.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await firstPage.render({
    canvasContext: ctx,
    viewport,
    canvas
  } as any).promise;

  const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.88);

  return {
    thumbnailUrl,
    pageCount,
    width: baseViewport.width,
    height: baseViewport.height
  };
}

/**
 * Inspects and prepares any uploaded file (Image or PDF)
 */
export async function analyzeUploadedFile(file: File): Promise<JpgToPdfQueueItem> {
  const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const { thumbnailUrl, pageCount, width, height } = await processPdfFile(file);
      return {
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: formatBytes(file.size),
        type: 'pdf',
        mimeType: 'application/pdf',
        thumbnailUrl,
        rotation: 0,
        pageCount,
        width,
        height,
        status: 'ready'
      };
    } catch (err: any) {
      return {
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: formatBytes(file.size),
        type: 'pdf',
        mimeType: 'application/pdf',
        thumbnailUrl: '',
        rotation: 0,
        pageCount: 1,
        status: 'error',
        errorMessage: err?.message || 'Unable to parse PDF'
      };
    }
  } else {
    // Image file
    try {
      const { thumbnailUrl, width, height } = await processImageFile(file);
      return {
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: formatBytes(file.size),
        type: 'image',
        mimeType: file.type || 'image/jpeg',
        thumbnailUrl,
        rotation: 0,
        pageCount: 1,
        width,
        height,
        status: 'ready'
      };
    } catch (err: any) {
      return {
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: formatBytes(file.size),
        type: 'image',
        mimeType: file.type || 'image/jpeg',
        thumbnailUrl: '',
        rotation: 0,
        pageCount: 1,
        status: 'error',
        errorMessage: err?.message || 'Unable to load image'
      };
    }
  }
}

/**
 * Converts an image file with optional rotation into a JPEG ArrayBuffer ready to embed into pdf-lib
 */
async function prepareImageBytes(
  file: File,
  rotation: number,
  quality: QualityOption
): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  const qualityMap: Record<QualityOption, number> = {
    high: 0.94,
    balanced: 0.82,
    low: 0.65
  };
  const compressionRatio = qualityMap[quality] ?? 0.85;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        const isRotated90or270 = rotation === 90 || rotation === 270;
        const targetWidth = isRotated90or270 ? origHeight : origWidth;
        const targetHeight = isRotated90or270 ? origWidth : origHeight;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Apply rotation
        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -origWidth / 2, -origHeight / 2);
        ctx.restore();

        canvas.toBlob(
          async (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }
            const buffer = await blob.arrayBuffer();
            resolve({
              bytes: buffer,
              width: targetWidth,
              height: targetHeight
            });
          },
          'image/jpeg',
          compressionRatio
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Gets points dimensions for standard page sizes
 */
function getStandardPageDimensions(
  pageSize: PageSizeOption,
  orientation: PageOrientationOption,
  contentWidth: number,
  contentHeight: number
): { pageWidth: number; pageHeight: number } {
  if (pageSize === 'fit') {
    // 1 pixel ~ 0.75 points (96 DPI to 72 DPI), or direct mapping
    return {
      pageWidth: contentWidth * 0.75,
      pageHeight: contentHeight * 0.75
    };
  }

  // Base dimensions in points (72 points = 1 inch)
  // A4: 210mm x 297mm = 595.28 x 841.89 points
  // Letter: 8.5" x 11" = 612 x 792 points
  let baseW = pageSize === 'letter' ? 612 : 595.28;
  let baseH = pageSize === 'letter' ? 792 : 841.89;

  let isLandscape = false;
  if (orientation === 'landscape') {
    isLandscape = true;
  } else if (orientation === 'portrait') {
    isLandscape = false;
  } else {
    // 'auto' orientation: if content is wider than it is tall, choose landscape
    isLandscape = contentWidth > contentHeight;
  }

  return {
    pageWidth: isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH),
    pageHeight: isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH)
  };
}

/**
 * Gets margin in points
 */
function getMarginPoints(margin: PageMarginOption, pageSize: PageSizeOption): number {
  if (pageSize === 'fit' || margin === 'none') return 0;
  if (margin === 'small') return 14.17; // ~5mm
  return 34.01; // ~12mm standard
}

/**
 * Generates a unified combined PDF document containing all images & PDFs in exact queue sequence
 */
export async function generateCombinedPdf(
  items: JpgToPdfQueueItem[],
  settings: JpgToPdfSettings,
  onProgress?: ProgressCallback
): Promise<Uint8Array> {
  const activeItems = items.filter((i) => i.status === 'ready');
  if (activeItems.length === 0) {
    throw new Error('No valid files in queue to combine.');
  }

  const pdfDoc = await PDFDocument.create();

  // Set standard PDF document metadata
  pdfDoc.setTitle(settings.customFileName || 'Combined_eCyberCafe_Document');
  pdfDoc.setAuthor('eCyberCafe.in PDF Engine');
  pdfDoc.setCreator('eCyberCafe JPG to PDF Combiner (jpg2pdf)');
  pdfDoc.setProducer('pdf-lib + eCyberCafe');

  const total = activeItems.length;

  for (let idx = 0; idx < total; idx++) {
    const item = activeItems[idx];
    onProgress?.({
      current: idx + 1,
      total,
      message: `Processing file ${idx + 1} of ${total}: ${item.fileName}...`
    });

    if (item.type === 'pdf') {
      try {
        const fileBuffer = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const pageIndices = srcDoc.getPageIndices();

        const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);

        for (const page of copiedPages) {
          if (item.rotation > 0) {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + item.rotation) % 360));
          }
          pdfDoc.addPage(page);
        }
      } catch (err: any) {
        console.warn(`Error appending PDF ${item.fileName}:`, err);
      }
    } else {
      // Image item
      try {
        const { bytes, width: imgW, height: imgH } = await prepareImageBytes(
          item.file,
          item.rotation,
          settings.quality
        );

        const embeddedImage = await pdfDoc.embedJpg(bytes);

        const margin = getMarginPoints(settings.margin, settings.pageSize);
        const { pageWidth, pageHeight } = getStandardPageDimensions(
          settings.pageSize,
          settings.orientation,
          imgW,
          imgH
        );

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        if (settings.pageSize === 'fit') {
          // Fill page exactly
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight
          });
        } else {
          // Fit inside printable area with margin, preserving aspect ratio
          const availW = Math.max(10, pageWidth - margin * 2);
          const availH = Math.max(10, pageHeight - margin * 2);

          const scale = Math.min(availW / imgW, availH / imgH);
          const drawW = imgW * scale;
          const drawH = imgH * scale;

          const posX = margin + (availW - drawW) / 2;
          const posY = margin + (availH - drawH) / 2;

          page.drawImage(embeddedImage, {
            x: posX,
            y: posY,
            width: drawW,
            height: drawH
          });
        }
      } catch (err: any) {
        console.warn(`Error converting image ${item.fileName}:`, err);
      }
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    throw new Error('Generated PDF contains 0 pages. Please verify uploaded files.');
  }

  onProgress?.({
    current: total,
    total,
    message: 'Finalizing PDF output...'
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Generates an individual single-file PDF for one queue item
 */
export async function generateSingleItemPdf(
  item: JpgToPdfQueueItem,
  settings: JpgToPdfSettings
): Promise<Uint8Array> {
  return generateCombinedPdf([item], settings);
}
