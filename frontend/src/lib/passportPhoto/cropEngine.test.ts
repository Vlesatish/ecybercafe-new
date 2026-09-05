import { describe, expect, it } from 'vitest';
import {
  createDefaultCropState,
  getInitialCenteredCrop,
  BIOMETRIC_GUIDELINES
} from './cropEngine.js';

describe('cropEngine', () => {
  it('creates default crop state correctly', () => {
    const state = createDefaultCropState();
    expect(state.zoom).toBe(1);
    expect(state.rotation).toBe(0);
    expect(state.flipH).toBe(false);
    expect(state.crop).toEqual({ x: 0, y: 0 });
  });

  it('calculates initial centered crop for portrait aspect ratio', () => {
    const crop = getInitialCenteredCrop(1000, 1000, 35 / 45);
    expect(crop.width).toBeLessThan(1000);
    expect(crop.height).toBeLessThanOrEqual(1000);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1000);
    expect(crop.y + crop.height).toBeLessThanOrEqual(1000);
  });

  it('has valid biometric guideline percentages', () => {
    expect(BIOMETRIC_GUIDELINES.headTopPercent).toBeLessThan(BIOMETRIC_GUIDELINES.eyeLinePercent);
    expect(BIOMETRIC_GUIDELINES.eyeLinePercent).toBeLessThan(BIOMETRIC_GUIDELINES.chinLinePercent);
  });
});
