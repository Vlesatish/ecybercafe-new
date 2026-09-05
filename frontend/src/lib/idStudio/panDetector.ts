import { NormalizedRect } from './aadhaarDetector';

/** UTIITSL A4 ePAN printable cards: lower-left Front, lower-right Back. */
export const E_EPAN_TEMPLATE = {
  front: { x: 0.0612, y: 0.7826, width: 0.4104, height: 0.1806 },
  back: { x: 0.5291, y: 0.7826, width: 0.4097, height: 0.1806 }
} satisfies Record<'front' | 'back', NormalizedRect>;

const inkDensity = (canvas: HTMLCanvasElement, rect: NormalizedRect) => {
  const sample = document.createElement('canvas');
  sample.width = 120;
  sample.height = 76;
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) return 0;
  context.drawImage(
    canvas,
    rect.x * canvas.width,
    rect.y * canvas.height,
    rect.width * canvas.width,
    rect.height * canvas.height,
    0,
    0,
    sample.width,
    sample.height
  );
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let nonWhite = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < 238 || pixels[i + 1] < 238 || pixels[i + 2] < 238) nonWhite++;
  }
  return nonWhite / (pixels.length / 4);
};

export function detectUtiEpanFrontBack(canvas: HTMLCanvasElement) {
  const ratio = canvas.width / canvas.height;
  if (ratio < 0.65 || ratio > 0.80) return null;
  const frontDensity = inkDensity(canvas, E_EPAN_TEMPLATE.front);
  const backDensity = inkDensity(canvas, E_EPAN_TEMPLATE.back);
  if (frontDensity < 0.15 || backDensity < 0.15) return null;
  return {
    front: E_EPAN_TEMPLATE.front,
    back: E_EPAN_TEMPLATE.back,
    confidence: Math.min(0.96, 0.72 + Math.min(frontDensity, backDensity) * 0.3)
  };
}

