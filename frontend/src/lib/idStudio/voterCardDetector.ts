/**
 * voterCardDetector.ts
 * 
 * Intelligent Voter Card (e-EPIC) Front & Back Automatic Detection & Cropper
 * Designed for 1-Click extraction from full e-EPIC PDF and image scans.
 */

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedCardSide {
  side: 'front' | 'back';
  rect: NormalizedRect;
  confidence: number;
  method: 'contour' | 'template' | 'single-card';
}

export interface VoterDetectionResult {
  front?: DetectedCardSide;
  back?: DetectedCardSide;
  confidence: number;
  requiresManualCrop: boolean;
  isSingleCard?: boolean;
}

export interface VoterCropOutput {
  frontDataUrl: string | null;
  backDataUrl: string | null;
  frontRect: NormalizedRect;
  backRect: NormalizedRect;
  confidence: number;
  method: 'contour' | 'template' | 'single-card';
}

/**
 * Standard e-EPIC Normalized Template Coordinates
 * Measured on official Election Commission of India e-EPIC A4 documents.
 */
export const E_EPIC_TEMPLATE = {
  front: {
    x: 0.0525,
    y: 0.1118,
    width: 0.4158,
    height: 0.1848
  },
  back: {
    x: 0.5483,
    y: 0.1118,
    width: 0.4150,
    height: 0.1848
  }
};

/**
 * Detect Front and Back cards on an e-EPIC canvas / image bitmap.
 * Order of operation:
 * 1. Single card detection (if aspect ratio ~ 1.586)
 * 2. Border / Edge detection for dual cards on upper portion of A4
 * 3. Normalized e-EPIC template fallback
 */
export function detectVoterFrontBack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): VoterDetectionResult {
  const pageRatio = width / height;

  // 1. Single already-cropped Voter card (CR-80 ratio: ~1.45 to 1.75)
  if (pageRatio >= 1.45 && pageRatio <= 1.75) {
    return {
      front: {
        side: 'front',
        rect: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 0.95,
        method: 'single-card'
      },
      confidence: 0.95,
      requiresManualCrop: false,
      isSingleCard: true
    };
  }

  // 2. Dual card detection on portrait e-EPIC page (ratio ~ 0.65 to 0.85)
  try {
    const edgeResult = detectCardBordersViaEdges(ctx, width, height);
    if (edgeResult && edgeResult.confidence >= 0.8) {
      return edgeResult;
    }
  } catch (err) {
    console.warn('Voter edge detection error, falling back to template:', err);
  }

  // 3. Robust Template Fallback
  return {
    front: {
      side: 'front',
      rect: { ...E_EPIC_TEMPLATE.front },
      confidence: 0.92,
      method: 'template'
    },
    back: {
      side: 'back',
      rect: { ...E_EPIC_TEMPLATE.back },
      confidence: 0.92,
      method: 'template'
    },
    confidence: 0.92,
    requiresManualCrop: false,
    isSingleCard: false
  };
}

/**
 * Fine border and edge scan around the expected card bounds
 */
function detectCardBordersViaEdges(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): VoterDetectionResult | null {
  // Grab pixel data for the upper 40% of the document where the ID cards are located
  const scanHeight = Math.min(height, Math.round(height * 0.40));
  const imgData = ctx.getImageData(0, 0, width, scanHeight);
  const data = imgData.data;

  // Helper to get pixel luminance
  const getLum = (x: number, y: number) => {
    const px = Math.min(width - 1, Math.max(0, Math.round(x)));
    const py = Math.min(scanHeight - 1, Math.max(0, Math.round(y)));
    const idx = (py * width + px) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  };

  // Helper: Find strong dark border transition along vertical search line
  const findVerticalBorder = (x: number, startY: number, endY: number): number | null => {
    let maxGrad = 0;
    let bestY = null;
    for (let y = startY; y < endY; y += 1) {
      const grad = Math.abs(getLum(x, y - 2) - getLum(x, y + 2));
      const lum = getLum(x, y);
      // Look for dark border line (lum < 170) with sharp gradient
      if (grad > 35 && lum < 185 && grad > maxGrad) {
        maxGrad = grad;
        bestY = y;
      }
    }
    return bestY;
  };

  // Helper: Find strong dark border transition along horizontal search line
  const findHorizontalBorder = (y: number, startX: number, endX: number): number | null => {
    let maxGrad = 0;
    let bestX = null;
    for (let x = startX; x < endX; x += 1) {
      const grad = Math.abs(getLum(x - 2, y) - getLum(x + 2, y));
      const lum = getLum(x, y);
      if (grad > 35 && lum < 185 && grad > maxGrad) {
        maxGrad = grad;
        bestX = x;
      }
    }
    return bestX;
  };

  // 1. Scan for Front Card Top-Left and Bottom-Right
  const fMidX = width * 0.26;
  const fMidY = height * 0.20;

  const fTopY = findVerticalBorder(fMidX, Math.round(height * 0.08), Math.round(height * 0.14));
  const fBottomY = findVerticalBorder(fMidX, Math.round(height * 0.27), Math.round(height * 0.33));
  const fLeftX = findHorizontalBorder(fMidY, Math.round(width * 0.03), Math.round(width * 0.08));
  const fRightX = findHorizontalBorder(fMidY, Math.round(width * 0.44), Math.round(width * 0.49));

  // 2. Scan for Back Card Top-Left and Bottom-Right
  const bMidX = width * 0.75;
  const bMidY = height * 0.20;

  const bTopY = findVerticalBorder(bMidX, Math.round(height * 0.08), Math.round(height * 0.14));
  const bBottomY = findVerticalBorder(bMidX, Math.round(height * 0.27), Math.round(height * 0.33));
  const bLeftX = findHorizontalBorder(bMidY, Math.round(width * 0.52), Math.round(width * 0.57));
  const bRightX = findHorizontalBorder(bMidY, Math.round(width * 0.93), Math.round(width * 0.98));

  // If we found sharp borders for both cards
  if (fTopY && fBottomY && fLeftX && fRightX && bTopY && bBottomY && bLeftX && bRightX) {
    const fW = fRightX - fLeftX;
    const fH = fBottomY - fTopY;
    const bW = bRightX - bLeftX;
    const bH = bBottomY - bTopY;

    const fRatio = (fW * (height / width)) / fH;
    const bRatio = (bW * (height / width)) / bH;

    // Check if detected dimensions are realistic card rectangles (Aspect ratio ~1.45 to 1.75)
    if (fRatio >= 1.35 && fRatio <= 1.80 && bRatio >= 1.35 && bRatio <= 1.80) {
      // Small safety padding (0.2%)
      const padX = 0.002;
      const padY = 0.002;

      const frontRect: NormalizedRect = {
        x: Math.max(0, fLeftX / width - padX),
        y: Math.max(0, fTopY / height - padY),
        width: Math.min(1, fW / width + padX * 2),
        height: Math.min(1, fH / height + padY * 2)
      };

      const backRect: NormalizedRect = {
        x: Math.max(0, bLeftX / width - padX),
        y: Math.max(0, bTopY / height - padY),
        width: Math.min(1, bW / width + padX * 2),
        height: Math.min(1, bH / height + padY * 2)
      };

      return {
        front: { side: 'front', rect: frontRect, confidence: 0.96, method: 'contour' },
        back: { side: 'back', rect: backRect, confidence: 0.96, method: 'contour' },
        confidence: 0.96,
        requiresManualCrop: false,
        isSingleCard: false
      };
    }
  }

  return null;
}

/**
 * Execute full high-resolution crop of Voter Card from a Canvas / Image source
 */
export async function cropVoterCardFromSource(
  sourceCanvas: HTMLCanvasElement | HTMLImageElement,
  customDetection?: VoterDetectionResult
): Promise<VoterCropOutput> {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;

  // Render to a temporary canvas if source is image
  let fullCanvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  if (sourceCanvas instanceof HTMLCanvasElement) {
    fullCanvas = sourceCanvas;
    ctx = fullCanvas.getContext('2d')!;
  } else {
    fullCanvas = document.createElement('canvas');
    fullCanvas.width = W;
    fullCanvas.height = H;
    ctx = fullCanvas.getContext('2d')!;
    ctx.drawImage(sourceCanvas, 0, 0, W, H);
  }

  // Detect card positions
  const detection = customDetection || detectVoterFrontBack(ctx, W, H);

  // If single card
  if (detection.isSingleCard || !detection.back) {
    const fCanvas = document.createElement('canvas');
    fCanvas.width = W;
    fCanvas.height = H;
    const fCtx = fCanvas.getContext('2d')!;
    fCtx.drawImage(fullCanvas, 0, 0, W, H);

    return {
      frontDataUrl: fCanvas.toDataURL('image/png'),
      backDataUrl: null,
      frontRect: { x: 0, y: 0, width: 1, height: 1 },
      backRect: { x: 0, y: 0, width: 0, height: 0 },
      confidence: detection.confidence,
      method: 'single-card'
    };
  }

  const frontRect = detection.front?.rect || E_EPIC_TEMPLATE.front;
  const backRect = detection.back?.rect || E_EPIC_TEMPLATE.back;

  // 1. Crop Front Card (High Resolution)
  const fPixelX = Math.round(frontRect.x * W);
  const fPixelY = Math.round(frontRect.y * H);
  const fPixelW = Math.round(frontRect.width * W);
  const fPixelH = Math.round(frontRect.height * H);

  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = fPixelW;
  frontCanvas.height = fPixelH;
  const frontCtx = frontCanvas.getContext('2d')!;
  frontCtx.drawImage(fullCanvas, fPixelX, fPixelY, fPixelW, fPixelH, 0, 0, fPixelW, fPixelH);

  // 2. Crop Back Card (High Resolution)
  const bPixelX = Math.round(backRect.x * W);
  const bPixelY = Math.round(backRect.y * H);
  const bPixelW = Math.round(backRect.width * W);
  const bPixelH = Math.round(backRect.height * H);

  const backCanvas = document.createElement('canvas');
  backCanvas.width = bPixelW;
  backCanvas.height = bPixelH;
  const backCtx = backCanvas.getContext('2d')!;
  backCtx.drawImage(fullCanvas, bPixelX, bPixelY, bPixelW, bPixelH, 0, 0, bPixelW, bPixelH);

  return {
    frontDataUrl: frontCanvas.toDataURL('image/png'),
    backDataUrl: backCanvas.toDataURL('image/png'),
    frontRect,
    backRect,
    confidence: detection.confidence,
    method: detection.front?.method || 'template'
  };
}
