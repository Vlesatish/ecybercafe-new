import { loadPdfWithPassword, LoadPdfWithPasswordOptions, PdfImportCancelledError } from './loadPdfWithPassword';

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfProcessResult {
  success: boolean;
  isEncrypted: boolean;
  pages: RenderedPdfPage[];
  error?: string;
}

/**
 * Render all pages of a PDF into high-res data URLs
 * Handles password-protected PDFs gracefully
 */
export async function renderPdfPages(
  arrayBuffer: ArrayBuffer,
  options: LoadPdfWithPasswordOptions,
  scale = 2.5
): Promise<PdfProcessResult> {
  try {
    const pdf = await loadPdfWithPassword(arrayBuffer, options);
    const pages: RenderedPdfPage[] = [];

    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height
        });
      }
    }

    return {
      success: true,
      isEncrypted: false,
      pages
    };
  } catch (err: any) {
    if (err instanceof PdfImportCancelledError) {
      return {
        success: false,
        isEncrypted: true,
        pages: [],
        error: 'PDF_IMPORT_CANCELLED'
      };
    }
    return {
      success: false,
      isEncrypted: false,
      pages: [],
      error: err?.message || 'Failed to render PDF'
    };
  }
}

/**
 * Extract e-Aadhaar Front and Back cards from standard UIDAI letter PDF
 */
export async function extractAadhaarFromPageImage(
  imageDataUrl: string
): Promise<{ front: string; back: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.width;
      const H = img.height;

      // Standard e-Aadhaar Letter: ID card is in the bottom ~31% of the page
      const cardStartY = Math.round(H * 0.685);
      const cardH = Math.round(H * 0.288);
      const cardW = Math.round(W * 0.445);

      const leftX = Math.round(W * 0.048);
      const rightX = Math.round(W * 0.508);

      // Front
      const fCanvas = document.createElement('canvas');
      fCanvas.width = cardW;
      fCanvas.height = cardH;
      const fCtx = fCanvas.getContext('2d');
      if (fCtx) {
        fCtx.drawImage(img, leftX, cardStartY, cardW, cardH, 0, 0, cardW, cardH);
      }

      // Back
      const bCanvas = document.createElement('canvas');
      bCanvas.width = cardW;
      bCanvas.height = cardH;
      const bCtx = bCanvas.getContext('2d');
      if (bCtx) {
        bCtx.drawImage(img, rightX, cardStartY, cardW, cardH, 0, 0, cardW, cardH);
      }

      resolve({
        front: fCanvas.toDataURL('image/png'),
        back: bCanvas.toDataURL('image/png')
      });
    };
    img.onerror = (err) => reject(err);
    img.src = imageDataUrl;
  });
}
