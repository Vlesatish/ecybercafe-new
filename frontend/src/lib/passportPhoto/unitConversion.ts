import { SizeUnit } from './types.js';

export const MM_PER_INCH = 25.4;

/**
 * Converts millimetres to pixels at the specified DPI.
 */
export function mmToPixels(mm: number, dpi = 300): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/**
 * Converts inches to pixels at the specified DPI.
 */
export function inchesToPixels(inches: number, dpi = 300): number {
  return Math.round(inches * dpi);
}

/**
 * Converts centimetres to pixels at the specified DPI.
 */
export function cmToPixels(cm: number, dpi = 300): number {
  return mmToPixels(cm * 10, dpi);
}

/**
 * Converts pixels to millimetres at the specified DPI.
 */
export function pixelsToMm(pixels: number, dpi = 300): number {
  return (pixels * MM_PER_INCH) / dpi;
}

/**
 * Converts pixels to inches at the specified DPI.
 */
export function pixelsToInches(pixels: number, dpi = 300): number {
  return pixels / dpi;
}

/**
 * Normalizes any dimension value and unit to millimetres.
 */
export function toMm(val: number, unit: SizeUnit, dpi = 300): number {
  switch (unit) {
    case 'mm':
      return val;
    case 'cm':
      return val * 10;
    case 'inch':
      return val * MM_PER_INCH;
    case 'px':
      return (val * MM_PER_INCH) / dpi;
    default:
      return val;
  }
}

/**
 * Normalizes any dimension value and unit to pixels at a given DPI.
 */
export function toPixels(val: number, unit: SizeUnit, dpi = 300): number {
  switch (unit) {
    case 'mm':
      return mmToPixels(val, dpi);
    case 'cm':
      return cmToPixels(val, dpi);
    case 'inch':
      return inchesToPixels(val, dpi);
    case 'px':
      return Math.round(val);
    default:
      return Math.round(val);
  }
}

export const mmToPx = mmToPixels;
export const pxToMm = pixelsToMm;

/**
 * Calculates crop pixel dimensions for given mm dimensions at a specific DPI.
 */
export function calculateCropPixels(widthMm: number, heightMm: number, dpi = 300): { width: number; height: number } {
  return {
    width: mmToPixels(widthMm, dpi),
    height: mmToPixels(heightMm, dpi)
  };
}

/**
 * Formats width and height with their unit.
 */
export function formatDimensions(width: number, height: number, unit: SizeUnit): string {
  return `${width} × ${height} ${unit}`;
}

/**
 * Calculates aspect ratio from width and height.
 */
export function aspectRatioFromDimensions(width: number, height: number): number {
  if (height <= 0) return 1;
  return width / height;
}
