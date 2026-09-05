import { describe, expect, it } from 'vitest';
import { normalizedRectToPixels } from './aadhaarDetector';
import { E_EPAN_TEMPLATE } from './panDetector';

describe('UTIITSL ePAN template', () => {
  it('maps the A4 reference render to lower-left Front and lower-right Back', () => {
    const front = normalizedRectToPixels(E_EPAN_TEMPLATE.front, 1323, 1872);
    const back = normalizedRectToPixels(E_EPAN_TEMPLATE.back, 1323, 1872);
    expect(front).toEqual({ x: 81, y: 1465, width: 543, height: 338 });
    expect(back).toEqual({ x: 700, y: 1465, width: 542, height: 338 });
    expect(front.x + front.width).toBeLessThan(back.x);
  });
});

