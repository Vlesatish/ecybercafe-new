import { describe, expect, it } from 'vitest';
import {
  mmToPx,
  pxToMm,
  calculateCropPixels,
  formatDimensions,
  aspectRatioFromDimensions
} from './unitConversion.js';

describe('Passport Photo unitConversion', () => {
  it('converts mm to pixels accurately at 300 DPI', () => {
    // 25.4 mm = 1 inch = 300 px at 300 DPI
    expect(mmToPx(25.4, 300)).toBe(300);
    // 35mm passport photo width: 35 * 300 / 25.4 = 413.38 -> rounded 413
    expect(mmToPx(35, 300)).toBe(413);
    // 45mm passport photo height: 45 * 300 / 25.4 = 531.49 -> rounded 531
    expect(mmToPx(45, 300)).toBe(531);
  });

  it('converts pixels back to mm', () => {
    const mm = pxToMm(300, 300);
    expect(mm).toBe(25.4);
  });

  it('calculates crop pixel dimensions maintaining aspect ratio', () => {
    const { width, height } = calculateCropPixels(35, 45, 300);
    expect(width).toBe(413);
    expect(height).toBe(531);
  });

  it('formats dimensions with units', () => {
    expect(formatDimensions(35, 45, 'mm')).toBe('35 × 45 mm');
    expect(formatDimensions(2, 2, 'inch')).toBe('2 × 2 inch');
  });

  it('calculates aspect ratios correctly', () => {
    const aspect = aspectRatioFromDimensions(35, 45);
    expect(aspect).toBeCloseTo(0.7777, 3);
  });
});
