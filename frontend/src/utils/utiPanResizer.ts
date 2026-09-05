/**
 * Utility functions for UTI PSA / NSDL PAN Card Photo & Signature Resizing
 * Specifications:
 * - UTI Photo: 213 x 213 pixels, 300 DPI, JPEG, Size 12 KB - 29 KB
 * - UTI Signature: 400 x 200 pixels (600 DPI) or 1023 x 360 pixels (300 DPI), JPEG, Size 15 KB - 58 KB
 * - NSDL Photo: 213 x 213 pixels, 200 DPI, JPEG, Size 20 KB - 48 KB
 * - NSDL Signature: 400 x 200 pixels, 200 DPI, JPEG, Size 20 KB - 48 KB
 */

export interface ResizeResult {
  dataUrl: string;
  sizeKb: number;
}

export type PortalType = 'UTI' | 'NSDL' | 'CUSTOM';

/**
 * Injects or updates JFIF APP0 resolution headers in a JPEG image to force 200 DPI / 300 DPI / 600 DPI.
 * Also pads file size safely with a JPEG Comment (0xFF 0xFE) segment if file size is below portal minimums
 * (e.g. >= 12KB for UTI photo, >= 20KB for NSDL photo) to prevent portal rejection ("size sahi kare" error).
 */
export function injectDpiToJpeg(
  dataUrl: string,
  dpi: number = 300,
  minBytes: number = 0
): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) {
    return dataUrl;
  }

  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return dataUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Must start with JPEG SOI marker 0xFF 0xD8
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      return dataUrl;
    }

    const dpiHi = (dpi >> 8) & 0xFF;
    const dpiLo = dpi & 0xFF;

    // Strip any existing APP0..APP15 segments (0xFF 0xE0..0xEF) immediately after SOI (bytes 0,1)
    let offset = 2;
    while (offset < bytes.length - 4) {
      if (bytes[offset] === 0xFF) {
        const marker = bytes[offset + 1];
        if (marker >= 0xE0 && marker <= 0xEF) {
          const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
          offset += 2 + segLen;
          continue;
        }
      }
      break;
    }

    // Construct a 100% compliant, pristine 18-byte JFIF APP0 segment
    // Byte 0..1: 0xFF 0xE0 (APP0 marker)
    // Byte 2..3: 0x00 0x10 (Length = 16)
    // Byte 4..8: "JFIF\0"
    // Byte 9..10: 0x01 0x01 (Version 1.01)
    // Byte 11: 0x01 (Units = 1 = Dots Per Inch)
    // Byte 12..13: X density (dpiHi, dpiLo)
    // Byte 14..15: Y density (dpiHi, dpiLo)
    // Byte 16..17: 0x00 0x00 (Thumbnail size = 0)
    const app0 = new Uint8Array([
      0xFF, 0xE0,
      0x00, 0x10,
      0x4A, 0x46, 0x49, 0x46, 0x00,
      0x01, 0x01,
      0x01, // Units = 1 (DPI)
      dpiHi, dpiLo,
      dpiHi, dpiLo,
      0x00, 0x00
    ]);

    const restOfImage = bytes.subarray(offset);
    let modifiedBytes = new Uint8Array(2 + app0.length + restOfImage.length);
    modifiedBytes[0] = 0xFF;
    modifiedBytes[1] = 0xD8; // SOI
    modifiedBytes.set(app0, 2);
    modifiedBytes.set(restOfImage, 2 + app0.length);

    // Pad file size safely with JPEG Comment (0xFF 0xFE) segment if size < minBytes
    if (minBytes > 0 && modifiedBytes.length < minBytes) {
      const neededPadding = minBytes - modifiedBytes.length;
      if (neededPadding > 4) {
        const commentLen = Math.min(65533, neededPadding);
        const commentSeg = new Uint8Array(2 + commentLen);
        commentSeg[0] = 0xFF;
        commentSeg[1] = 0xFE; // COM (Comment) marker
        commentSeg[2] = (commentLen >> 8) & 0xFF;
        commentSeg[3] = commentLen & 0xFF;

        const filler = "eCyberCafe PAN Resizer Portal Compliant Header ";
        for (let k = 4; k < 2 + commentLen; k++) {
          commentSeg[k] = filler.charCodeAt((k - 4) % filler.length);
        }

        const padded = new Uint8Array(modifiedBytes.length + commentSeg.length);
        padded.set(modifiedBytes.subarray(0, 2), 0); // SOI
        padded.set(commentSeg, 2); // Insert COM segment right after SOI
        padded.set(modifiedBytes.subarray(2), 2 + commentSeg.length);
        modifiedBytes = padded;
      }
    }

    // Convert updated bytes back to Base64 data URL
    let updatedBinaryStr = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < modifiedBytes.length; i += chunkSize) {
      updatedBinaryStr += String.fromCharCode.apply(
        null,
        modifiedBytes.subarray(i, i + chunkSize) as any
      );
    }
    const base64 = btoa(updatedBinaryStr);
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error('Failed to inject DPI into JPEG:', e);
    return dataUrl;
  }
}

/**
 * Resizes any uploaded image to official UTI/NSDL PAN Photo specs
 */
export async function resizeToUtiPhoto(
  imgSrc: string,
  zoom = 1,
  brightness = 0,
  contrast = 0,
  rotateDeg = 0,
  offsetX = 0,
  offsetY = 0,
  portal: PortalType = 'UTI',
  targetWidth = 213,
  targetHeight = 213,
  targetDpi = 300,
  minKb = 15,
  maxKb = 29
): Promise<ResizeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        // Fill background white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate((rotateDeg * Math.PI) / 180);

        ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;

        const scale = (Math.max(targetWidth / img.width, targetHeight / img.height)) * zoom;
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = -drawW / 2 + offsetX;
        const drawY = -drawH / 2 + offsetY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Target size bounds
        const targetMaxBytes = maxKb * 1024;
        const targetMinBytes = minKb * 1024;

        let quality = 0.95;
        let rawDataUrl = canvas.toDataURL('image/jpeg', quality);
        let dataUrl = injectDpiToJpeg(rawDataUrl, targetDpi, targetMinBytes);
        let sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

        // Compress down if exceeds maxKb
        while (sizeBytes > targetMaxBytes && quality > 0.1) {
          quality -= 0.04;
          rawDataUrl = canvas.toDataURL('image/jpeg', quality);
          dataUrl = injectDpiToJpeg(rawDataUrl, targetDpi, targetMinBytes);
          sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        }

        // If still under minKb, re-apply padding
        if (sizeBytes < targetMinBytes) {
          dataUrl = injectDpiToJpeg(rawDataUrl, targetDpi, targetMinBytes);
          sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        }

        resolve({
          dataUrl,
          sizeKb: Math.round(sizeBytes / 1024)
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for photo resizing'));
    img.src = imgSrc;
  });
}

/**
 * Resizes any uploaded image to official UTI/NSDL PAN Signature specs
 */
export async function resizeToUtiSignature(
  imgSrc: string,
  zoom = 1,
  contrast = 25,
  cleanBg = true,
  targetWidth = 400,
  targetHeight = 200,
  rotateDeg = 0,
  offsetX = 0,
  offsetY = 0,
  targetDpi = 600,
  minKb = 20,
  maxKb = 58
): Promise<ResizeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        // Fill background white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate((rotateDeg * Math.PI) / 180);

        const scale = Math.min(targetWidth / img.width, targetHeight / img.height) * zoom;
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = -drawW / 2 + offsetX;
        const drawY = -drawH / 2 + offsetY;

        ctx.filter = `contrast(${100 + contrast}%) brightness(105%)`;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        if (cleanBg) {
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Convert off-white paper background to pure white
            if (r > 160 && g > 160 && b > 160) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const targetMaxBytes = maxKb * 1024;
        const targetMinBytes = minKb * 1024;

        let quality = 0.95;
        let rawDataUrl = canvas.toDataURL('image/jpeg', quality);
        let dataUrl = injectDpiToJpeg(rawDataUrl, targetDpi, targetMinBytes);
        let sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

        while (sizeBytes > targetMaxBytes && quality > 0.1) {
          quality -= 0.04;
          rawDataUrl = canvas.toDataURL('image/jpeg', quality);
          dataUrl = injectDpiToJpeg(rawDataUrl, targetDpi, targetMinBytes);
          sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        }

        if (sizeBytes < targetMinBytes) {
          dataUrl = injectDpiToJpeg(rawDataUrl, targetDpi, targetMinBytes);
          sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        }

        resolve({
          dataUrl,
          sizeKb: Math.round(sizeBytes / 1024)
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for signature resizing'));
    img.src = imgSrc;
  });
}

/**
 * Trigger file download helper with DPI / size compliance
 */
export function downloadDataUrl(dataUrl: string, filename: string, dpi: number = 300, minBytes = 0) {
  const finalDataUrl = injectDpiToJpeg(dataUrl, dpi, minBytes);

  try {
    const parts = finalDataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binaryStr = atob(parts[1]);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  } catch (err) {
    console.error('Blob download failed, falling back to data URL:', err);
    const link = document.createElement('a');
    link.href = finalDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}


