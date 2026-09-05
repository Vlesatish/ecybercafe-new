import { jsPDF } from 'jspdf';
import { PrintPage, CardItem, PaperSize } from '../../types/idStudio';
import { applyImageFilters, renderProcessedImage } from './imageProcessing';

export const CARD_WIDTH_MM = 85.60;
export const CARD_HEIGHT_MM = 53.98;

export interface SheetDimensions {
  widthMm: number;
  heightMm: number;
  orientation: 'portrait' | 'landscape';
}

export function getSheetDimensions(paperSize: PaperSize, page?: PrintPage): SheetDimensions {
  if (paperSize === '4x6') {
    return { widthMm: 152.4, heightMm: 101.6, orientation: 'landscape' };
  }
  if (paperSize === 'pvc_single') {
    return { widthMm: CARD_WIDTH_MM, heightMm: CARD_HEIGHT_MM, orientation: 'landscape' };
  }
  if (paperSize === 'pvc_tray') {
    return { widthMm: 200, heightMm: 130, orientation: 'landscape' };
  }
  if (paperSize === 'custom' && page?.customDimensionsMm) {
    const { width, height } = page.customDimensionsMm;
    return {
      widthMm: width,
      heightMm: height,
      orientation: width > height ? 'landscape' : 'portrait'
    };
  }
  // Default A4
  return { widthMm: 210, heightMm: 297, orientation: 'portrait' };
}

/**
 * Render a single Card (Front or Back) onto Canvas with full filters and boundary
 */
export function drawProcessedCardItem(
  ctx: CanvasRenderingContext2D,
  card: CardItem,
  startX: number,
  startY: number,
  widthPx: number,
  heightPx: number,
  imageSrc: string,
  isBackSide = false
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1. Offscreen canvas to apply filters on the card bitmap first
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = widthPx;
      cardCanvas.height = heightPx;
      const cCtx = cardCanvas.getContext('2d');

      if (!cCtx) {
        resolve();
        return;
      }

      // Draw original image into offscreen canvas
      cCtx.drawImage(img, 0, 0, widthPx, heightPx);

      // Apply pixel adjustments and enhance regions
      applyImageFilters(
        cCtx,
        widthPx,
        heightPx,
        card.adjustments,
        card.enhanceRegions,
        card.textDarken
      );

      // 2. Render onto Main Sheet with Mirror / Rounded corners / Border
      const isMirror = isBackSide ? card.mirrorBack : card.mirrorFront;

      const filteredImg = new Image();
      filteredImg.onload = () => {
        renderProcessedImage(
          ctx,
          filteredImg,
          startX,
          startY,
          widthPx,
          heightPx,
          isMirror,
          card.border,
          card.roundedCorners
        );
        resolve();
      };
      filteredImg.src = cardCanvas.toDataURL('image/png');
    };
    img.onerror = () => resolve();
    img.src = imageSrc;
  });
}

/**
 * Generate High-Resolution Sheet Canvas (300 DPI - 100% Exact Scale)
 */
export async function renderPageCanvas(
  page: PrintPage,
  paperSize: PaperSize,
  singleSideMode: boolean,
  targetDpi = 300
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const pxPerMm = targetDpi / 25.4;
  const sheet = getSheetDimensions(paperSize, page);

  const canvasWidthPx = Math.round(sheet.widthMm * pxPerMm);
  const canvasHeightPx = Math.round(sheet.heightMm * pxPerMm);

  canvas.width = canvasWidthPx;
  canvas.height = canvasHeightPx;

  // Solid White Canvas Base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cardWidthPx = Math.round(CARD_WIDTH_MM * pxPerMm);
  const cardHeightPx = Math.round(CARD_HEIGHT_MM * pxPerMm);

  // 1. 4x6 Photo Glossy Layout
  if (paperSize === '4x6') {
    const gapX = Math.round(4 * pxPerMm);
    const totalW = singleSideMode ? cardWidthPx : cardWidthPx * 2 + gapX;
    const startX = Math.round((canvasWidthPx - totalW) / 2);
    const startY = Math.round((canvasHeightPx - cardHeightPx) / 2);

    const firstCard = page.cards[0];
    if (firstCard) {
      if (firstCard.frontImage) {
        await drawProcessedCardItem(ctx, firstCard, startX, startY, cardWidthPx, cardHeightPx, firstCard.frontImage, false);
      }
      if (!singleSideMode && firstCard.backImage) {
        await drawProcessedCardItem(ctx, firstCard, startX + cardWidthPx + gapX, startY, cardWidthPx, cardHeightPx, firstCard.backImage, true);
      }

      // Cut Guideline
      if (!singleSideMode && (firstCard.frontImage || firstCard.backImage)) {
        ctx.save();
        ctx.strokeStyle = '#cbd5e1';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(startX + cardWidthPx + gapX / 2, startY - 10);
        ctx.lineTo(startX + cardWidthPx + gapX / 2, startY + cardHeightPx + 10);
        ctx.stroke();
        ctx.restore();
      }
    }

  // 2. PVC Single Card (Direct CR-80)
  } else if (paperSize === 'pvc_single') {
    const firstCard = page.cards[0];
    if (firstCard?.frontImage) {
      await drawProcessedCardItem(ctx, firstCard, 0, 0, cardWidthPx, cardHeightPx, firstCard.frontImage, false);
    }

  // 3. PVC Tray (Epson / Canon Tray Slots)
  } else if (paperSize === 'pvc_tray') {
    const slot1X = Math.round(16 * pxPerMm);
    const slot2X = Math.round(104 * pxPerMm);
    const slotY = Math.round(38 * pxPerMm);

    const firstCard = page.cards[0];
    if (firstCard) {
      if (firstCard.frontImage) {
        await drawProcessedCardItem(ctx, firstCard, slot1X, slotY, cardWidthPx, cardHeightPx, firstCard.frontImage, false);
      }
      if (!singleSideMode && firstCard.backImage) {
        await drawProcessedCardItem(ctx, firstCard, slot2X, slotY, cardWidthPx, cardHeightPx, firstCard.backImage, true);
      }
    }

    // Tray Alignment Guides
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.round(12 * (targetDpi / 300))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('PVC Tray Slot 1 (Front Side)', slot1X + cardWidthPx / 2, slotY - 10);
    ctx.fillText('PVC Tray Slot 2 (Back Side)', slot2X + cardWidthPx / 2, slotY - 10);

  // 4. Default A4 Multi-Card Album (Up to 5 Cards Stacked)
  } else {
    const topMarginPx = Math.round(14 * pxPerMm);
    const gapY = Math.round(3.5 * pxPerMm);
    const gapX = Math.round(5 * pxPerMm);
    const totalRowW = singleSideMode ? cardWidthPx : cardWidthPx * 2 + gapX;
    const startX = Math.round((canvasWidthPx - totalRowW) / 2);

    for (let i = 0; i < Math.min(page.cards.length, 5); i++) {
      const c = page.cards[i];
      const rowY = topMarginPx + i * (cardHeightPx + gapY);

      if (c.frontImage) {
        await drawProcessedCardItem(ctx, c, startX, rowY, cardWidthPx, cardHeightPx, c.frontImage, false);
      }
      if (!singleSideMode && c.backImage) {
        await drawProcessedCardItem(ctx, c, startX + cardWidthPx + gapX, rowY, cardWidthPx, cardHeightPx, c.backImage, true);
      }

      // Center Scissor Cutting Line
      if (!singleSideMode && (c.frontImage || c.backImage)) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startX + cardWidthPx + gapX / 2, rowY);
        ctx.lineTo(startX + cardWidthPx + gapX / 2, rowY + cardHeightPx);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Footer Watermark / Scale Stamp
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.round(10 * (targetDpi / 300))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('eCyberCafe.in ID Card Print Studio • 100% Actual Scale (CR-80: 85.60mm x 53.98mm)', canvasWidthPx / 2, canvasHeightPx - 20);
  }

  return canvas;
}

/**
 * Generate Multi-Page High Quality PDF (jsPDF)
 */
export async function exportDocumentPdf(
  pages: PrintPage[],
  paperSize: PaperSize,
  singleSideMode: boolean,
  isPro = false
): Promise<Blob> {
  const targetDpi = isPro ? 400 : 300;
  const sheet = getSheetDimensions(paperSize, pages[0]);

  const doc = new jsPDF({
    orientation: sheet.orientation,
    unit: 'mm',
    format: paperSize === 'a4' ? 'a4' : [sheet.widthMm, sheet.heightMm]
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      doc.addPage([sheet.widthMm, sheet.heightMm], sheet.orientation);
    }
    const pageCanvas = await renderPageCanvas(pages[i], paperSize, singleSideMode, targetDpi);
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  return doc.output('blob');
}

/**
 * Open Direct Browser Native Print Window with Perfect CSS Margins
 */
export async function triggerDirectPrint(
  pages: PrintPage[],
  paperSize: PaperSize,
  singleSideMode: boolean
): Promise<void> {
  const pageImages: string[] = [];
  for (const p of pages) {
    const canvas = await renderPageCanvas(p, paperSize, singleSideMode, 300);
    pageImages.push(canvas.toDataURL('image/jpeg', 0.98));
  }

  const sheet = getSheetDimensions(paperSize, pages[0]);
  const pageSizeCss = paperSize === 'a4' ? 'A4 portrait' : `${sheet.widthMm}mm ${sheet.heightMm}mm ${sheet.orientation}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Pop-up window blocked by browser');
  }

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
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page {
            width: 100vw;
            height: 100vh;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .print-page:last-child {
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
        ${pageImages.map(src => `<div class="print-page"><img src="${src}" /></div>`).join('')}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
