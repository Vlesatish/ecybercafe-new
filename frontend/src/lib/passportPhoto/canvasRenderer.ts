import {
  CustomerPhotoItem,
  TuneSettings,
  BackgroundSettings,
  TextSettings,
  BorderSettings,
  SuitOverlay
} from './types.js';
import { renderCroppedCanvas } from './cropEngine.js';
import { loadImageFromSrc } from './imageLoader.js';

export interface RenderOptions {
  width: number;
  height: number;
  dpi?: number;
  transparentBackground?: boolean;
}

/**
 * Builds CSS filter string from TuneSettings.
 */
export function buildCssFilterString(tune: TuneSettings): string {
  const brightness = 1 + (tune.brightness + tune.exposure) / 100;
  const contrast = 1 + tune.contrast / 100;
  const saturate = 1 + tune.saturation / 100;
  const sepia = tune.warmth > 0 ? tune.warmth / 200 : 0;
  const hueRotate = tune.warmth < 0 ? tune.warmth / 4 : 0;

  return `brightness(${Math.max(0.1, brightness)}) contrast(${Math.max(0.1, contrast)}) saturate(${Math.max(0, saturate)}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;
}

/**
 * Applies fine sharpness to a canvas context using a 3x3 convolution filter.
 */
export function applySharpness(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number): void {
  if (amount <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = width;
  dstCanvas.height = height;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) return;

  const output = dstCtx.createImageData(width, height);
  const out = output.data;

  // Sharpness factor k
  const k = (amount / 100) * 0.8;
  // Kernel: [0, -k, 0, -k, 1+4k, -k, 0, -k, 0]
  const center = 1 + 4 * k;
  const edge = -k;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = src[((y - 1) * width + x) * 4 + c];
        const bottom = src[((y + 1) * width + x) * 4 + c];
        const left = src[(y * width + (x - 1)) * 4 + c];
        const right = src[(y * width + (x + 1)) * 4 + c];
        const mid = src[idx + c];

        const val = mid * center + (top + bottom + left + right) * edge;
        out[idx + c] = Math.min(255, Math.max(0, val));
      }
      out[idx + 3] = src[idx + 3]; // Alpha
    }
  }

  ctx.putImageData(output, 0, 0);
}

/**
 * High-fidelity Passport Photo renderer.
 * Strictly respects the 2-layer background separation architecture:
 * Layer 1: Background (Color, custom image, transparent, or original)
 * Layer 2: Person foreground (transparentForeground or cropped source)
 * Layer 3: Tune filters
 * Layer 4: Suit apparel overlay
 * Layer 5: Name and Date of Photo
 * Layer 6: Border and Cut Lines
 */
export async function renderPassportPhoto(
  item: CustomerPhotoItem,
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const { width, height, transparentBackground = false } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Load original image
  const originalImg = await loadImageFromSrc(item.originalImageUrl);

  // Check if transparent foreground is available
  let fgImg: HTMLImageElement | null = null;
  if (item.transparentForegroundUrl && item.background.mode !== 'original') {
    try {
      fgImg = await loadImageFromSrc(item.transparentForegroundUrl);
    } catch {
      fgImg = null;
    }
  }

  // --- LAYER 1: BACKGROUND ---
  if (!transparentBackground) {
    if (item.background.mode === 'color') {
      ctx.fillStyle = item.background.color || '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    } else if (item.background.mode === 'custom_image' && item.background.customImageUrl) {
      try {
        const bgImg = await loadImageFromSrc(item.background.customImageUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
      } catch {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
    } else if (item.background.mode === 'transparent') {
      ctx.clearRect(0, 0, width, height);
    } else {
      // 'original' mode: draw cropped original image directly as background
      const croppedOrig = renderCroppedCanvas(originalImg, item.crop, width, height);
      ctx.drawImage(croppedOrig, 0, 0);
    }
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // --- LAYER 2: FOREGROUND SUBJECT ---
  // If mode is NOT original, render the foreground person layer above the background
  if (item.background.mode !== 'original') {
    const subjectSource = fgImg || originalImg;
    const croppedSubject = renderCroppedCanvas(subjectSource, item.crop, width, height);

    // Create temporary foreground canvas for filtering and custom mask
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = width;
    fgCanvas.height = height;
    const fgCtx = fgCanvas.getContext('2d');
    if (fgCtx) {
      fgCtx.imageSmoothingEnabled = true;
      fgCtx.imageSmoothingQuality = 'high';

      // Apply CSS tune filters to the subject
      fgCtx.filter = buildCssFilterString(item.tune);
      fgCtx.drawImage(croppedSubject, 0, 0);
      fgCtx.filter = 'none';

      // If custom eraser mask exists, apply alpha mask
      if (item.maskCanvasDataUrl) {
        try {
          const maskImg = await loadImageFromSrc(item.maskCanvasDataUrl);
          fgCtx.globalCompositeOperation = 'destination-in';
          fgCtx.drawImage(maskImg, 0, 0, width, height);
          fgCtx.globalCompositeOperation = 'source-over';
        } catch {
          // Ignored
        }
      }

      // If sharpness requested, apply to foreground
      if (item.tune.sharpness > 0) {
        applySharpness(fgCtx, width, height, item.tune.sharpness);
      }

      ctx.drawImage(fgCanvas, 0, 0);
    }
  } else {
    // In original mode, apply tune filter to the whole frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.filter = buildCssFilterString(item.tune);
      tempCtx.drawImage(canvas, 0, 0);
      if (item.tune.sharpness > 0) {
        applySharpness(tempCtx, width, height, item.tune.sharpness);
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  // --- LAYER 3: SUIT & APPAREL OVERLAY ---
  if (item.suit && item.suit.svgDataUri) {
    try {
      const suitImg = await loadImageFromSrc(item.suit.svgDataUri);
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1, item.suit.opacity ?? 1));

      const cx = width / 2 + (item.suit.x / 100) * width;
      const cy = height / 2 + (item.suit.y / 100) * height;
      ctx.translate(cx, cy);

      if (item.suit.rotation) {
        ctx.rotate((item.suit.rotation * Math.PI) / 180);
      }
      if (item.suit.flipH) {
        ctx.scale(-1, 1);
      }

      const suitScale = item.suit.scale || 1;
      const sWidth = width * suitScale;
      const sHeight = height * suitScale;

      ctx.drawImage(suitImg, -sWidth / 2, -sHeight / 2, sWidth, sHeight);
      ctx.restore();
    } catch {
      // Ignored
    }
  }

  // --- LAYER 4: CANDIDATE NAME & DATE OF PHOTO (DOP) ---
  if (item.text && item.text.enabled && (item.text.candidateName || item.text.dateOfPhoto)) {
    renderTextStrip(ctx, item.text, width, height);
  }

  // --- LAYER 5: BORDER & CUT MARKS ---
  if (item.border && item.border.enabled) {
    renderBorder(ctx, item.border, width, height);
  }

  return canvas;
}

/**
 * Draws the candidate name and Date of Photo strip.
 */
function renderTextStrip(
  ctx: CanvasRenderingContext2D,
  text: TextSettings,
  width: number,
  height: number
): void {
  const scale = width / 400; // Base reference scale
  const stripHeight = Math.max(30 * scale, (text.fontSize * 2.2 + 8) * scale);
  const y = text.position === 'top' ? 0 : height - stripHeight;

  // Background banner
  ctx.save();
  ctx.fillStyle = text.bgColor || '#FFFFFF';
  ctx.globalAlpha = Math.max(0.2, Math.min(1, text.bgOpacity ?? 0.95));
  ctx.fillRect(0, y, width, stripHeight);
  ctx.restore();

  // Text setup
  ctx.save();
  ctx.fillStyle = text.textColor || '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const weight = text.isBold ? 'bold' : 'normal';
  const sizePx = Math.max(10, Math.round(text.fontSize * scale));
  ctx.font = `${weight} ${sizePx}px ${text.fontFamily || 'Arial, sans-serif'}`;

  const displayName = text.uppercase
    ? (text.candidateName || '').toUpperCase()
    : text.candidateName || '';

  const dateLabel = text.showDopLabel ? 'D.O.P: ' : '';
  let formattedDate = text.dateOfPhoto || '';
  if (formattedDate.includes('-')) {
    const parts = formattedDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const displayDate = formattedDate ? `${dateLabel}${formattedDate}` : '';

  if (displayName && displayDate) {
    // Two lines of text
    const lineSpacing = sizePx * 0.55;
    ctx.fillText(displayName, width / 2, y + stripHeight / 2 - lineSpacing);
    ctx.font = `normal ${Math.max(9, Math.round(sizePx * 0.85))}px ${text.fontFamily || 'Arial, sans-serif'}`;
    ctx.fillText(displayDate, width / 2, y + stripHeight / 2 + lineSpacing);
  } else {
    // Single line
    ctx.fillText(displayName || displayDate, width / 2, y + stripHeight / 2);
  }
  ctx.restore();
}

/**
 * Draws borders, inner frame, or corner cutting marks.
 */
function renderBorder(
  ctx: CanvasRenderingContext2D,
  border: BorderSettings,
  width: number,
  height: number
): void {
  ctx.save();

  // Outer primary border
  if (border.width > 0) {
    ctx.strokeStyle = border.color || '#000000';
    ctx.lineWidth = border.width;
    const half = border.width / 2;
    ctx.strokeRect(half, half, width - border.width, height - border.width);
  }

  // Inner border
  if (border.innerBorder && border.innerBorderWidth > 0) {
    ctx.strokeStyle = border.innerBorderColor || '#FFFFFF';
    ctx.lineWidth = border.innerBorderWidth;
    const offset = border.width + border.innerBorderWidth / 2;
    ctx.strokeRect(offset, offset, width - offset * 2, height - offset * 2);
  }

  // Corner crop marks
  if (border.cornerCropMarks) {
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1;
    const markLen = Math.min(20, width * 0.1);

    // Top-left
    ctx.beginPath();
    ctx.moveTo(0, markLen);
    ctx.lineTo(0, 0);
    ctx.lineTo(markLen, 0);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - markLen, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, markLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(0, height - markLen);
    ctx.lineTo(0, height);
    ctx.lineTo(markLen, height);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - markLen, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, height - markLen);
    ctx.stroke();
  }

  ctx.restore();
}
