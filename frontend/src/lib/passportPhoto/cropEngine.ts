import { CropState, CropAreaPixels } from './types.js';

export interface GuideLinesConfig {
  headTopPercent: number; // e.g. 15% from top
  eyeLinePercent: number; // e.g. 35% from top
  chinLinePercent: number;// e.g. 70% from top
}

export const BIOMETRIC_GUIDELINES: GuideLinesConfig = {
  headTopPercent: 12,
  eyeLinePercent: 36,
  chinLinePercent: 72
};

/**
 * Creates a default centered crop state.
 */
export function createDefaultCropState(): CropState {
  return {
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0,
    flipH: false
  };
}

/**
 * Calculates a crop area in pixel coordinates based on image natural dimensions and target aspect ratio.
 */
export function getInitialCenteredCrop(
  imageWidth: number,
  imageHeight: number,
  targetAspect: number // width / height
): CropAreaPixels {
  const imageAspect = imageWidth / imageHeight;
  let cropWidth = imageWidth;
  let cropHeight = imageHeight;

  if (imageAspect > targetAspect) {
    // Image is wider than target aspect ratio: fit height, center horizontally
    cropHeight = imageHeight * 0.9;
    cropWidth = cropHeight * targetAspect;
  } else {
    // Image is taller: fit width, position towards top for portraits (around 10% from top)
    cropWidth = imageWidth * 0.9;
    cropHeight = cropWidth / targetAspect;
  }

  const x = Math.max(0, (imageWidth - cropWidth) / 2);
  // Default bias slightly towards top for headshots (head is usually in upper half)
  const y = Math.max(0, Math.min(imageHeight - cropHeight, (imageHeight - cropHeight) * 0.25));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight)
  };
}

/**
 * Renders the cropped and oriented source image onto an off-screen canvas.
 */
export function renderCroppedCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  cropState: CropState,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const pixelCrop = cropState.croppedAreaPixels;

  if (pixelCrop && pixelCrop.width > 0 && pixelCrop.height > 0) {
    // Use precise pixel crop directly
    ctx.save();
    if (cropState.flipH) {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      sourceImage,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
    ctx.restore();
    return canvas;
  }

  // Fallback parametric transform
  const imgW = (sourceImage as HTMLImageElement).naturalWidth || sourceImage.width;
  const imgH = (sourceImage as HTMLImageElement).naturalHeight || sourceImage.height;

  ctx.save();
  ctx.translate(targetWidth / 2, targetHeight / 2);
  if (cropState.rotation) {
    ctx.rotate((cropState.rotation * Math.PI) / 180);
  }
  if (cropState.flipH) {
    ctx.scale(-1, 1);
  }
  const scale = cropState.zoom || 1;
  const renderW = targetWidth * scale;
  const renderH = (renderW * imgH) / imgW;

  const offsetX = (cropState.crop.x / 100) * targetWidth;
  const offsetY = (cropState.crop.y / 100) * targetHeight;

  ctx.drawImage(
    sourceImage,
    -renderW / 2 + offsetX,
    -renderH / 2 + offsetY,
    renderW,
    renderH
  );
  ctx.restore();

  return canvas;
}
