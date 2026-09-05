import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from './imageCompressor';

// Configure worker for pdfjs-dist v3
if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  } catch (e) {
    console.warn('PDF.js worker initialization warning:', e);
  }
}

export interface PdfCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  pageCount: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  dataUrl?: string;
}

export interface PdfCompressionOptions {
  qualityPreset?: 'standard' | 'high' | 'max_compress';
  quality?: number; // 0.1 to 1.0
  maxDimension?: number; // max canvas width/height in px
}

export async function compressPdfFile(
  file: File,
  options: PdfCompressionOptions = {}
): Promise<PdfCompressionResult> {
  const {
    qualityPreset = 'standard',
  } = options;

  let quality = 0.68;
  let maxDim = 1300;
  let scaleFactor = 1.3;

  if (qualityPreset === 'high') {
    quality = 0.85;
    maxDim = 1800;
    scaleFactor = 1.8;
  } else if (qualityPreset === 'max_compress') {
    quality = 0.50;
    maxDim = 1000;
    scaleFactor = 1.0;
  }

  if (options.quality) quality = options.quality;
  if (options.maxDimension) maxDim = options.maxDimension;

  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Only PDF files (.pdf) can be compressed with PDF compressor.');
  }

  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF with PDF.js
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (numPages === 0) {
    throw new Error('The selected PDF file is empty or corrupted.');
  }

  // Create new compressed PDF document with pdf-lib
  const newPdf = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Calculate dynamic scaling based on target max dimension
    const currentMax = Math.max(unscaledViewport.width, unscaledViewport.height);
    let renderScale = scaleFactor;
    
    if (currentMax * renderScale > maxDim) {
      renderScale = maxDim / currentMax;
    }

    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context creation failed during PDF compression');
    }

    // Fill background with white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render page
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas
    };

    await (page.render(renderContext as any).promise);

    // Export rendered page as compressed JPEG
    const jpgDataUrl = canvas.toDataURL('image/jpeg', quality);

    // Embed into new pdf-lib PDF
    const jpgImage = await newPdf.embedJpg(jpgDataUrl);
    const pdfPage = newPdf.addPage([jpgImage.width, jpgImage.height]);
    pdfPage.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: jpgImage.width,
      height: jpgImage.height,
    });
  }

  // Save new PDF
  const compressedPdfBytes = await newPdf.save();
  const pdfArrayBuffer = compressedPdfBytes.buffer.slice(
    compressedPdfBytes.byteOffset,
    compressedPdfBytes.byteOffset + compressedPdfBytes.byteLength
  ) as ArrayBuffer;
  const compressedBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

  const originalName = file.name;
  const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  const newFileName = `${baseName}_compressed.pdf`;

  const compressedFile = new File([compressedBlob], newFileName, {
    type: 'application/pdf',
    lastModified: Date.now()
  });

  const originalSize = file.size;
  const compressedSize = compressedFile.size;
  const savedPercentage = Math.max(
    0,
    Math.round(((originalSize - compressedSize) / originalSize) * 100)
  );

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    savedPercentage,
    pageCount: numPages,
    originalSizeFormatted: formatBytes(originalSize),
    compressedSizeFormatted: formatBytes(compressedSize)
  };
}
