export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AadhaarDetectionMethod = 'geometry' | 'template' | 'single-card';

export interface AadhaarDetectionResult {
  front?: { side: 'front'; rect: NormalizedRect; confidence: number; method: AadhaarDetectionMethod };
  back?: { side: 'back'; rect: NormalizedRect; confidence: number; method: AadhaarDetectionMethod };
  confidence: number;
  requiresManualCrop: boolean;
}

export const E_AADHAAR_TEMPLATE = {
  front: { x: 0.0784, y: 0.7236, width: 0.4141, height: 0.2024 },
  back: { x: 0.5075, y: 0.7236, width: 0.4157, height: 0.2024 }
} satisfies Record<'front' | 'back', NormalizedRect>;

export const normalizedRectToPixels = (rect: NormalizedRect, width: number, height: number) => ({
  x: Math.max(0, Math.round(rect.x * width)),
  y: Math.max(0, Math.round(rect.y * height)),
  width: Math.max(1, Math.min(width, Math.round(rect.width * width))),
  height: Math.max(1, Math.min(height, Math.round(rect.height * height)))
});

const regionStats = (canvas: HTMLCanvasElement, rect: NormalizedRect) => {
  const pixels = normalizedRectToPixels(rect, canvas.width, canvas.height);
  const sample = document.createElement('canvas');
  sample.width = 160;
  sample.height = 100;
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) return { ink: 0, transitions: 0 };
  context.drawImage(canvas, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, sample.width, sample.height);
  const data = context.getImageData(0, 0, sample.width, sample.height).data;
  let ink = 0;
  let transitions = 0;
  let previousDark = false;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
    const dark = gray < 225;
    if (dark) ink++;
    if (i > 0 && dark !== previousDark) transitions++;
    previousDark = dark;
  }
  const count = data.length / 4;
  return { ink: ink / count, transitions: transitions / count };
};

const validTemplate = (canvas: HTMLCanvasElement) => {
  if (canvas.width >= canvas.height) return false;
  const front = regionStats(canvas, E_AADHAAR_TEMPLATE.front);
  const back = regionStats(canvas, E_AADHAAR_TEMPLATE.back);
  return front.ink > 0.035 && back.ink > 0.035 &&
    front.ink < 0.82 && back.ink < 0.82 &&
    front.transitions > 0.025 && back.transitions > 0.025;
};

/** Local-only geometry/density detector; document pixels never leave the browser. */
export function detectAadhaarFrontBack(canvas: HTMLCanvasElement): AadhaarDetectionResult {
  const pageRatio = canvas.width / canvas.height;
  if (pageRatio >= 1.48 && pageRatio <= 1.70) {
    return { confidence: 0.7, requiresManualCrop: false };
  }
  if (pageRatio >= 1 || !validTemplate(canvas)) {
    return { confidence: 0, requiresManualCrop: true };
  }

  // Search a ±2% neighbourhood for the pair with the strongest card-like
  // content. Both rectangles always remain aligned and separated by the gutter.
  let best = { score: -1, dx: 0, dy: 0 };
  for (let dy = -0.02; dy <= 0.0201; dy += 0.005) {
    for (let dx = -0.02; dx <= 0.0201; dx += 0.005) {
      const f = { ...E_AADHAAR_TEMPLATE.front, x: E_AADHAAR_TEMPLATE.front.x + dx, y: E_AADHAAR_TEMPLATE.front.y + dy };
      const b = { ...E_AADHAAR_TEMPLATE.back, x: E_AADHAAR_TEMPLATE.back.x - dx, y: E_AADHAAR_TEMPLATE.back.y + dy };
      const fs = regionStats(canvas, f);
      const bs = regionStats(canvas, b);
      const similarity = 1 - Math.min(1, Math.abs(fs.ink - bs.ink));
      const score = fs.ink + bs.ink + (fs.transitions + bs.transitions) * 0.35 + similarity * 0.08;
      if (score > best.score) best = { score, dx, dy };
    }
  }

  // A maximum on the edge of the search window usually means text density,
  // not a physical card boundary. Reject it and use the validated template so
  // card content is never clipped merely to gain a higher ink score.
  const useGeometry = best.score > 0.18 && Math.abs(best.dx) <= 0.0075 && Math.abs(best.dy) <= 0.0075;
  const method: AadhaarDetectionMethod = useGeometry ? 'geometry' : 'template';
  const frontRect = useGeometry
    ? { ...E_AADHAAR_TEMPLATE.front, x: E_AADHAAR_TEMPLATE.front.x + best.dx, y: E_AADHAAR_TEMPLATE.front.y + best.dy }
    : E_AADHAAR_TEMPLATE.front;
  const backRect = useGeometry
    ? { ...E_AADHAAR_TEMPLATE.back, x: E_AADHAAR_TEMPLATE.back.x - best.dx, y: E_AADHAAR_TEMPLATE.back.y + best.dy }
    : E_AADHAAR_TEMPLATE.back;
  const confidence = useGeometry ? 0.9 : 0.78;
  return {
    front: { side: 'front', rect: frontRect, confidence, method },
    back: { side: 'back', rect: backRect, confidence, method },
    confidence,
    requiresManualCrop: false
  };
}

export function cropNormalizedRegion(canvas: HTMLCanvasElement, rect: NormalizedRect): string {
  const p = normalizedRectToPixels(rect, canvas.width, canvas.height);
  p.width = Math.min(p.width, canvas.width - p.x);
  p.height = Math.min(p.height, canvas.height - p.y);
  const output = document.createElement('canvas');
  output.width = p.width;
  output.height = p.height;
  const context = output.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable');
  context.drawImage(canvas, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
  return output.toDataURL('image/png');
}

export function makeDetectionCanvas(source: HTMLCanvasElement, targetWidth = 1400): HTMLCanvasElement {
  if (source.width <= targetWidth) return source;
  const output = document.createElement('canvas');
  output.width = targetWidth;
  output.height = Math.round(source.height * targetWidth / source.width);
  output.getContext('2d')?.drawImage(source, 0, 0, output.width, output.height);
  return output;
}
