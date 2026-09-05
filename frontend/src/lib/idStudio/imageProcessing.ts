import { ScanAdjustmentParams, EnhanceRegion, CardBorderConfig } from '../../types/idStudio';

export const DEFAULT_ADJUSTMENTS: ScanAdjustmentParams = {
  filterMode: 'ORIGINAL',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  sharpness: 0,
  clarity: 0,
  thresholdBW: 128
};

// Target Color Preset Hex Values
export const TARGET_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  gray: [128, 128, 128],
  white: [255, 255, 255],
  red: [220, 38, 38],
  blue: [37, 99, 235],
  green: [22, 163, 74],
  yellow: [234, 179, 8],
  orange: [249, 115, 22],
  purple: [147, 51, 234],
  cyan: [6, 182, 212]
};

// Helper: Convert Hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Compute Euclidean color distance in RGB space
export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * Apply Full Non-Destructive Pixel Processing Pipeline on an HTML5 Canvas
 */
export function applyImageFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: ScanAdjustmentParams,
  enhanceRegions: EnhanceRegion[] = [],
  textDarken = false
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const {
    filterMode,
    brightness,
    contrast,
    saturation,
    warmth,
    thresholdBW
  } = adjustments;

  // 1. Global Pre-Calculations
  const brightMult = brightness / 100;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const satMult = saturation / 100;

  // Process Each Pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const pixelIndex = i / 4;
    const px = pixelIndex % width;
    const py = Math.floor(pixelIndex / width);
    const relX = (px / width) * 100;
    const relY = (py / height) * 100;

    // A. B&W / Threshold Modes
    if (filterMode === 'BW') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    // B. Brightness & Contrast
    if (brightness !== 100) {
      r = Math.min(255, Math.max(0, r * brightMult));
      g = Math.min(255, Math.max(0, g * brightMult));
      b = Math.min(255, Math.max(0, b * brightMult));
    }

    if (contrast !== 100) {
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
    }

    // C. Saturation
    if (saturation !== 100 && filterMode !== 'BW') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = Math.min(255, Math.max(0, gray + (r - gray) * satMult));
      g = Math.min(255, Math.max(0, gray + (g - gray) * satMult));
      b = Math.min(255, Math.max(0, gray + (b - gray) * satMult));
    }

    // D. Warmth / Temperature
    if (warmth !== 0) {
      r = Math.min(255, Math.max(0, r + warmth * 0.8));
      b = Math.min(255, Math.max(0, b - warmth * 0.8));
    }

    // E. Deep Black & Text Darken Optimization (Ideal for Barcodes, QR Codes & Official Seals)
    if (textDarken) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (gray < 90) {
        // Deepen dark text & barcode lines
        r = r * 0.65;
        g = g * 0.65;
        b = b * 0.65;
      } else if (gray > 220) {
        // Clean paper background
        r = 255;
        g = 255;
        b = 255;
      }
    }

    // F. Regional Enhancements (Photo Area / Text Area / Targeted Color Replacement)
    for (const region of enhanceRegions) {
      if (
        relX >= region.x &&
        relX <= region.x + region.width &&
        relY >= region.y &&
        relY <= region.y + region.height
      ) {
        // Apply regional brightness
        if (region.brightness !== 0) {
          const factor = 1 + region.brightness / 100;
          r = Math.min(255, Math.max(0, r * factor));
          g = Math.min(255, Math.max(0, g * factor));
          b = Math.min(255, Math.max(0, b * factor));
        }

        // Apply regional contrast
        if (region.contrast !== 0) {
          const cF = (259 * (region.contrast + 255)) / (255 * (259 - region.contrast));
          r = Math.min(255, Math.max(0, cF * (r - 128) + 128));
          g = Math.min(255, Math.max(0, cF * (g - 128) + 128));
          b = Math.min(255, Math.max(0, cF * (b - 128) + 128));
        }

        // Target Color Lighting Modification (Selective Color Adjustment)
        if (region.targetColor && region.targetColor !== 'none') {
          let targetRgb: [number, number, number] | null = null;
          if (region.targetColor === 'custom' && region.customTargetColorHex) {
            targetRgb = hexToRgb(region.customTargetColorHex);
          } else if (TARGET_COLORS[region.targetColor]) {
            targetRgb = TARGET_COLORS[region.targetColor];
          }

          if (targetRgb) {
            const dist = colorDistance(r, g, b, targetRgb[0], targetRgb[1], targetRgb[2]);
            const maxTolerance = (region.matchingRange / 100) * 441.67; // max distance is ~441

            if (dist <= maxTolerance) {
              const weight = 1 - dist / maxTolerance;
              const shift = (region.colorLightDark / 100) * 128 * weight;
              r = Math.min(255, Math.max(0, r + shift));
              g = Math.min(255, Math.max(0, g + shift));
              b = Math.min(255, Math.max(0, b + shift));
            }
          }
        }
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);

  // 2. Convolution Sharpening (Unsharp Mask if requested)
  if (adjustments.sharpness > 0) {
    applySharpenConvolution(ctx, width, height, adjustments.sharpness);
  }
}

/**
 * 3x3 Convolution Sharpening Kernel
 */
function applySharpenConvolution(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const srcData = src.data;
  const dstData = dst.data;

  const strength = (amount / 100) * 0.8;
  const kEdge = -strength;
  const kCenter = 1 + 4 * strength;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = ((y - 1) * width + x) * 4 + c;
        const bottom = ((y + 1) * width + x) * 4 + c;
        const left = (y * width + (x - 1)) * 4 + c;
        const right = (y * width + (x + 1)) * 4 + c;

        const val =
          srcData[top] * kEdge +
          srcData[left] * kEdge +
          srcData[idx + c] * kCenter +
          srcData[right] * kEdge +
          srcData[bottom] * kEdge;

        dstData[idx + c] = Math.min(255, Math.max(0, val));
      }
      dstData[idx + 3] = srcData[idx + 3];
    }
  }

  ctx.putImageData(dst, 0, 0);
}

/**
 * Render Image onto Canvas with Mirror and Border Support
 */
export function renderProcessedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  mirror: boolean,
  border: CardBorderConfig,
  roundedCorners = false
) {
  ctx.save();

  if (roundedCorners) {
    const radius = Math.round(w * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
  }

  if (mirror) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }

  ctx.restore();

  // Draw Card Border if enabled
  if (border && border.enabled) {
    ctx.save();
    ctx.strokeStyle = border.color || '#000000';
    ctx.lineWidth = border.thicknessPx || 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}
