import { describe, expect, it } from 'vitest';
import { E_AADHAAR_TEMPLATE, normalizedRectToPixels } from './aadhaarDetector';

describe('eAadhaar template mapping', () => {
  it('maps the reference page to the expected lower-left Front and lower-right Back crops', () => {
    const front = normalizedRectToPixels(E_AADHAAR_TEMPLATE.front, 1275, 1650);
    const back = normalizedRectToPixels(E_AADHAAR_TEMPLATE.back, 1275, 1650);
    expect(front).toEqual({ x: 100, y: 1194, width: 528, height: 334 });
    expect(back).toEqual({ x: 647, y: 1194, width: 530, height: 334 });
    expect(front.x).toBeLessThan(back.x);
    expect(front.x + front.width).toBeLessThan(back.x);
  });

  it('preserves CR-80 aspect ratio and excludes the upper page', () => {
    for (const rect of Object.values(E_AADHAAR_TEMPLATE)) {
      const pixelRatio = (rect.width * 1275) / (rect.height * 1650);
      expect(pixelRatio).toBeGreaterThan(1.48);
      expect(pixelRatio).toBeLessThan(1.70);
      expect(rect.y).toBeGreaterThan(0.70);
      expect(rect.y + rect.height).toBeLessThan(0.95);
    }
  });
});

