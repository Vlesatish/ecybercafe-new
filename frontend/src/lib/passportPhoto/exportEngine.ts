import { jsPDF } from 'jspdf';
import { CustomerPhotoItem, PrintSheetSettings } from './types.js';
import { mmToPixels } from './unitConversion.js';
import { renderPassportPhoto } from './canvasRenderer.js';
import {
  calculatePrintSheetLayout,
  getPaperDimensionsMm,
  getPhotoDimensionsMm,
  PrintLayoutResult
} from './printLayoutEngine.js';

/**
 * Triggers a browser file download from a Blob or Data URI.
 */
export function triggerBrowserDownload(dataUrlOrBlob: string | Blob, filename: string): void {
  const url = typeof dataUrlOrBlob === 'string'
    ? dataUrlOrBlob
    : URL.createObjectURL(dataUrlOrBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (typeof dataUrlOrBlob !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/**
 * Generates an HD Canvas for a single photo at target dimensions.
 */
export async function generateSinglePhotoCanvas(
  item: CustomerPhotoItem,
  dpi = 300,
  transparentBg = false
): Promise<HTMLCanvasElement> {
  const dim = getPhotoDimensionsMm(item);
  const widthPx = mmToPixels(dim.widthMm, dpi);
  const heightPx = mmToPixels(dim.heightMm, dpi);

  return renderPassportPhoto(item, {
    width: widthPx,
    height: heightPx,
    dpi,
    transparentBackground: transparentBg
  });
}

/**
 * Downloads a single photo as JPG or PNG.
 */
export async function downloadSinglePhoto(
  item: CustomerPhotoItem,
  format: 'jpg' | 'png',
  transparent = false
): Promise<void> {
  const canvas = await generateSinglePhotoCanvas(item, 300, transparent);
  const cleanName = (item.name || 'passport_photo').replace(/[^a-zA-Z0-9_-]/g, '_');

  if (format === 'jpg') {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    triggerBrowserDownload(dataUrl, `${cleanName}_300dpi.jpg`);
  } else {
    const dataUrl = canvas.toDataURL('image/png');
    triggerBrowserDownload(dataUrl, `${cleanName}_${transparent ? 'transparent' : 'hd'}.png`);
  }
}

/**
 * Renders the entire print sheet canvas using the single source of truth layout at target DPI.
 */
export async function renderFullSheetCanvas(
  settings: PrintSheetSettings,
  queue: CustomerPhotoItem[]
): Promise<HTMLCanvasElement> {
  const layout = calculatePrintSheetLayout(settings, queue);
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = layout.paperWidthPx;
  sheetCanvas.height = layout.paperHeightPx;

  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) return sheetCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Fill complete sheet background
  ctx.fillStyle = settings.sheetBackground || '#FFFFFF';
  ctx.fillRect(0, 0, layout.paperWidthPx, layout.paperHeightPx);

  // 2. Cache rendered photo canvases by item.id and dimensions
  const photoCanvasCache = new Map<string, HTMLCanvasElement>();

  for (const slot of layout.slots) {
    const cacheKey = `${slot.item.id}_${slot.widthPx}_${slot.heightPx}`;
    let photoCanvas = photoCanvasCache.get(cacheKey);
    if (!photoCanvas) {
      photoCanvas = await renderPassportPhoto(slot.item, {
        width: slot.widthPx,
        height: slot.heightPx,
        dpi: settings.dpi || 300
      });
      photoCanvasCache.set(cacheKey, photoCanvas);
    }

    // Clip draw operation to slot rectangle so no drawing bleeds outside
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.xPx, slot.yPx, slot.widthPx, slot.heightPx);
    ctx.clip();
    ctx.drawImage(photoCanvas, slot.xPx, slot.yPx, slot.widthPx, slot.heightPx);
    ctx.restore();

    // 3. Dashed cutting lines around each photo if requested
    if (settings.showCutLines) {
      ctx.save();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      // Stroke precisely around the slot rectangle
      ctx.strokeRect(slot.xPx, slot.yPx, slot.widthPx, slot.heightPx);
      ctx.restore();
    }
  }

  // 4. Corner crop marks (drawn inward, never outside paper, never negative coordinates)
  if (settings.showCropMarks) {
    ctx.save();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    const markLength = Math.max(8, mmToPixels(5, settings.dpi || 300));

    // Margins in pixels
    const topPx = Math.max(0, mmToPixels(settings.marginTopMm, settings.dpi || 300));
    const bottomPx = Math.min(layout.paperHeightPx, layout.paperHeightPx - mmToPixels(settings.marginBottomMm, settings.dpi || 300));
    const leftPx = Math.max(0, mmToPixels(settings.marginLeftMm, settings.dpi || 300));
    const rightPx = Math.min(layout.paperWidthPx, layout.paperWidthPx - mmToPixels(settings.marginRightMm, settings.dpi || 300));

    // Top-Left (drawn inward)
    ctx.beginPath();
    ctx.moveTo(leftPx, topPx);
    ctx.lineTo(Math.min(layout.paperWidthPx, leftPx + markLength), topPx);
    ctx.moveTo(leftPx, topPx);
    ctx.lineTo(leftPx, Math.min(layout.paperHeightPx, topPx + markLength));
    ctx.stroke();

    // Top-Right (drawn inward)
    ctx.beginPath();
    ctx.moveTo(rightPx, topPx);
    ctx.lineTo(Math.max(0, rightPx - markLength), topPx);
    ctx.moveTo(rightPx, topPx);
    ctx.lineTo(rightPx, Math.min(layout.paperHeightPx, topPx + markLength));
    ctx.stroke();

    // Bottom-Left (drawn inward)
    ctx.beginPath();
    ctx.moveTo(leftPx, bottomPx);
    ctx.lineTo(Math.min(layout.paperWidthPx, leftPx + markLength), bottomPx);
    ctx.moveTo(leftPx, bottomPx);
    ctx.lineTo(leftPx, Math.max(0, bottomPx - markLength));
    ctx.stroke();

    // Bottom-Right (drawn inward)
    ctx.beginPath();
    ctx.moveTo(rightPx, bottomPx);
    ctx.lineTo(Math.max(0, rightPx - markLength), bottomPx);
    ctx.moveTo(rightPx, bottomPx);
    ctx.lineTo(rightPx, Math.max(0, bottomPx - markLength));
    ctx.stroke();

    ctx.restore();
  }

  return sheetCanvas;
}

/**
 * Downloads the full print sheet as high-res JPG or PNG.
 */
export async function downloadSheetImage(
  settings: PrintSheetSettings,
  queue: CustomerPhotoItem[],
  format: 'jpg' | 'png'
): Promise<void> {
  const sheetCanvas = await renderFullSheetCanvas(settings, queue);
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? 0.98 : 1.0;
  const dataUrl = sheetCanvas.toDataURL(mime, quality);

  triggerBrowserDownload(dataUrl, `passport_sheet_${settings.paperId}_300dpi.${ext}`);
}

/**
 * Exports print sheet as a print-ready PDF using jsPDF with exact physical dimensions.
 */
export async function downloadSheetPdf(
  settings: PrintSheetSettings,
  queue: CustomerPhotoItem[]
): Promise<void> {
  const layout = calculatePrintSheetLayout(settings, queue);
  const widthMm = layout.paperWidthMm;
  const heightMm = layout.paperHeightMm;
  const sheetCanvas = await renderFullSheetCanvas(settings, queue);
  const imgData = sheetCanvas.toDataURL('image/jpeg', 0.98);

  const orientation = widthMm > heightMm ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  pdf.save(`passport_print_sheet_${settings.paperId}_${Math.round(widthMm)}x${Math.round(heightMm)}mm.pdf`);
}

/**
 * Direct browser print: Opens a dedicated clean iframe to trigger native print dialog
 * without disrupting or showing the application shell or other page content.
 */
export async function printSheetDirectly(
  settings: PrintSheetSettings,
  queue: CustomerPhotoItem[]
): Promise<void> {
  const layout = calculatePrintSheetLayout(settings, queue);
  const widthMm = layout.paperWidthMm;
  const heightMm = layout.paperHeightMm;
  const sheetCanvas = await renderFullSheetCanvas(settings, queue);
  const imgData = sheetCanvas.toDataURL('image/png');

  // Create temporary hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Passport Photo Print Sheet</title>
        <style>
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
            height: 100%;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-sheet {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible;
            page-break-after: always;
          }
          .print-sheet img,
          .print-sheet canvas {
            display: block;
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            max-width: none;
            object-fit: fill;
            margin: 0 !important;
            padding: 0 !important;
          }
        </style>
      </head>
      <body>
        <div class="print-sheet">
          <img id="print-sheet-img" src="${imgData}" alt="Passport Photo Print Sheet" />
        </div>
        <script>
          const img = document.getElementById('print-sheet-img');
          function triggerPrint() {
            window.focus();
            window.print();
          }
          if (img.complete) {
            setTimeout(triggerPrint, 150);
          } else {
            img.onload = () => setTimeout(triggerPrint, 150);
            img.onerror = () => setTimeout(triggerPrint, 150);
          }
        </script>
      </body>
    </html>
  `);
  doc.close();

  // Remove iframe after 30 seconds
  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // Ignored
    }
  }, 30000);
}
