import { DocumentTypePreset } from '../../types/idStudio';
import { cropVoterCardFromSource, E_EPIC_TEMPLATE } from './voterCardDetector';

export interface DetectedDocumentInfo {
  detectedType: DocumentTypePreset;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedCropMode: 'AUTO_AADHAAR' | 'AUTO_VOTER' | 'AUTO_SIDE_BY_SIDE' | 'AUTO_STACKED' | 'SINGLE_CARD';
  reason: string;
}

export interface CropBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect Document Type and Optimal Crop Split from Filename & Dimensions
 */
export function detectDocumentType(
  filename: string,
  width: number,
  height: number
): DetectedDocumentInfo {
  const name = filename.toLowerCase();
  const ratio = width / height;

  // 1. Filename explicit hints
  if (name.includes('voter') || name.includes('epic') || name.includes('eci') || name.includes('election')) {
    return {
      detectedType: 'voter',
      confidence: 'HIGH',
      recommendedCropMode: ratio < 0.9 ? 'AUTO_VOTER' : (ratio > 2.5 ? 'AUTO_SIDE_BY_SIDE' : 'SINGLE_CARD'),
      reason: 'Matched Election Commission e-EPIC Voter Card format'
    };
  }

  if (name.includes('aadhaar') || name.includes('eaadhaar') || name.includes('uidai')) {
    return {
      detectedType: 'aadhaar',
      confidence: 'HIGH',
      recommendedCropMode: ratio < 0.9 ? 'AUTO_AADHAAR' : 'AUTO_SIDE_BY_SIDE',
      reason: 'Matched Aadhaar UIDAI document pattern'
    };
  }

  if (name.includes('pan') || name.includes('nsdl') || name.includes('uti') || name.includes('utiitsl')) {
    return {
      detectedType: 'pan',
      confidence: 'HIGH',
      recommendedCropMode: ratio > 2.5 ? 'AUTO_SIDE_BY_SIDE' : 'SINGLE_CARD',
      reason: 'Matched Income Tax / PAN Card format'
    };
  }

  if (name.includes('ayushman') || name.includes('pmjay') || name.includes('abha')) {
    return {
      detectedType: 'ayushman',
      confidence: 'HIGH',
      recommendedCropMode: ratio < 0.9 ? 'AUTO_STACKED' : 'AUTO_SIDE_BY_SIDE',
      reason: 'Matched PMJAY Ayushman Bharat Card'
    };
  }

  if (name.includes('driving') || name.includes('dl') || name.includes('license') || name.includes('licence') || name.includes('parivahan')) {
    return {
      detectedType: 'dl',
      confidence: 'HIGH',
      recommendedCropMode: ratio > 2.5 ? 'AUTO_SIDE_BY_SIDE' : 'SINGLE_CARD',
      reason: 'Matched Driving Licence format'
    };
  }

  if (name.includes('shram') || name.includes('eshram')) {
    return {
      detectedType: 'eshram',
      confidence: 'HIGH',
      recommendedCropMode: ratio < 0.9 ? 'AUTO_AADHAAR' : 'AUTO_SIDE_BY_SIDE',
      reason: 'Matched Ministry of Labour e-Shram Card'
    };
  }

  // 2. Aspect Ratio Heuristics
  // Standard A4 portrait scan (0.707)
  if (ratio >= 0.65 && ratio <= 0.75) {
    return {
      detectedType: 'aadhaar',
      confidence: 'MEDIUM',
      recommendedCropMode: 'AUTO_AADHAAR',
      reason: 'Standard A4 Letter Portrait detected'
    };
  }

  // Dual card side-by-side scan (~3.17)
  if (ratio >= 2.6 && ratio <= 3.6) {
    return {
      detectedType: 'pan',
      confidence: 'MEDIUM',
      recommendedCropMode: 'AUTO_SIDE_BY_SIDE',
      reason: 'Dual Card Side-by-Side scan detected'
    };
  }

  // Dual card stacked scan (~0.79)
  if (ratio >= 0.75 && ratio <= 0.85) {
    return {
      detectedType: 'ayushman',
      confidence: 'MEDIUM',
      recommendedCropMode: 'AUTO_STACKED',
      reason: 'Stacked Front & Back scan detected'
    };
  }

  // Standard CR-80 Single ID Card (~1.586)
  if (ratio >= 1.45 && ratio <= 1.75) {
    return {
      detectedType: 'custom',
      confidence: 'MEDIUM',
      recommendedCropMode: 'SINGLE_CARD',
      reason: 'CR-80 Single ID Card format detected'
    };
  }

  return {
    detectedType: 'custom',
    confidence: 'LOW',
    recommendedCropMode: 'AUTO_SIDE_BY_SIDE',
    reason: 'Standard Card Layout'
  };
}

/**
 * Split Image by specific Crop Mode
 */
export async function splitCardImage(
  sourceDataUrl: string,
  mode: 'AUTO_AADHAAR' | 'AUTO_VOTER' | 'AUTO_SIDE_BY_SIDE' | 'AUTO_STACKED' | 'SINGLE_CARD'
): Promise<{ front: string; back: string | null }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const W = img.width;
      const H = img.height;

      if (mode === 'SINGLE_CARD') {
        resolve({ front: sourceDataUrl, back: null });
        return;
      }

      if (mode === 'AUTO_VOTER') {
        try {
          const voterOutput = await cropVoterCardFromSource(img);
          if (voterOutput.frontDataUrl) {
            resolve({
              front: voterOutput.frontDataUrl,
              back: voterOutput.backDataUrl
            });
            return;
          }
        } catch (err) {
          console.warn('cropVoterCardFromSource error, using template directly:', err);
        }

        // Direct template fallback
        const fPixelX = Math.round(E_EPIC_TEMPLATE.front.x * W);
        const fPixelY = Math.round(E_EPIC_TEMPLATE.front.y * H);
        const fPixelW = Math.round(E_EPIC_TEMPLATE.front.width * W);
        const fPixelH = Math.round(E_EPIC_TEMPLATE.front.height * H);

        const fCanvas = document.createElement('canvas');
        fCanvas.width = fPixelW;
        fCanvas.height = fPixelH;
        fCanvas.getContext('2d')?.drawImage(img, fPixelX, fPixelY, fPixelW, fPixelH, 0, 0, fPixelW, fPixelH);

        const bPixelX = Math.round(E_EPIC_TEMPLATE.back.x * W);
        const bPixelY = Math.round(E_EPIC_TEMPLATE.back.y * H);
        const bPixelW = Math.round(E_EPIC_TEMPLATE.back.width * W);
        const bPixelH = Math.round(E_EPIC_TEMPLATE.back.height * H);

        const bCanvas = document.createElement('canvas');
        bCanvas.width = bPixelW;
        bCanvas.height = bPixelH;
        bCanvas.getContext('2d')?.drawImage(img, bPixelX, bPixelY, bPixelW, bPixelH, 0, 0, bPixelW, bPixelH);

        resolve({
          front: fCanvas.toDataURL('image/png'),
          back: bCanvas.toDataURL('image/png')
        });
        return;
      }

      if (mode === 'AUTO_AADHAAR') {
        const cardStartY = Math.round(H * 0.685);
        const cardH = Math.round(H * 0.288);
        const cardW = Math.round(W * 0.445);
        const leftX = Math.round(W * 0.048);
        const rightX = Math.round(W * 0.508);

        const fCanvas = document.createElement('canvas');
        fCanvas.width = cardW;
        fCanvas.height = cardH;
        fCanvas.getContext('2d')?.drawImage(img, leftX, cardStartY, cardW, cardH, 0, 0, cardW, cardH);

        const bCanvas = document.createElement('canvas');
        bCanvas.width = cardW;
        bCanvas.height = cardH;
        bCanvas.getContext('2d')?.drawImage(img, rightX, cardStartY, cardW, cardH, 0, 0, cardW, cardH);

        resolve({
          front: fCanvas.toDataURL('image/png'),
          back: bCanvas.toDataURL('image/png')
        });
        return;
      }

      if (mode === 'AUTO_SIDE_BY_SIDE') {
        const halfW = Math.floor(W / 2);

        const fCanvas = document.createElement('canvas');
        fCanvas.width = halfW;
        fCanvas.height = H;
        fCanvas.getContext('2d')?.drawImage(img, 0, 0, halfW, H, 0, 0, halfW, H);

        const bCanvas = document.createElement('canvas');
        bCanvas.width = halfW;
        bCanvas.height = H;
        bCanvas.getContext('2d')?.drawImage(img, halfW, 0, halfW, H, 0, 0, halfW, H);

        resolve({
          front: fCanvas.toDataURL('image/png'),
          back: bCanvas.toDataURL('image/png')
        });
        return;
      }

      if (mode === 'AUTO_STACKED') {
        const halfH = Math.floor(H / 2);

        const fCanvas = document.createElement('canvas');
        fCanvas.width = W;
        fCanvas.height = halfH;
        fCanvas.getContext('2d')?.drawImage(img, 0, 0, W, halfH, 0, 0, W, halfH);

        const bCanvas = document.createElement('canvas');
        bCanvas.width = W;
        bCanvas.height = halfH;
        bCanvas.getContext('2d')?.drawImage(img, 0, halfH, W, halfH, 0, 0, W, halfH);

        resolve({
          front: fCanvas.toDataURL('image/png'),
          back: bCanvas.toDataURL('image/png')
        });
        return;
      }

      resolve({ front: sourceDataUrl, back: null });
    };
    img.onerror = (e) => reject(e);
    img.src = sourceDataUrl;
  });
}
