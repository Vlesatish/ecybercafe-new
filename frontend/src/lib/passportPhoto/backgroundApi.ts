import { createTrackedBlobUrl } from './imageLoader.js';

export interface BackgroundRemovalResult {
  success: boolean;
  transparentBlob?: Blob;
  transparentUrl?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Removes background using the server-side PhotoRoom API route.
 * Never leaks the API key to the client.
 */
export async function removeBackgroundApi(
  imageSource: Blob | File,
  signal?: AbortSignal
): Promise<BackgroundRemovalResult> {
  try {
    const formData = new FormData();
    formData.append('image', imageSource, 'photo.jpg');

    const response = await fetch('/api/passport-photo/remove-background', {
      method: 'POST',
      body: formData,
      signal
    });

    if (!response.ok) {
      let errData: any = {};
      try {
        errData = await response.json();
      } catch {
        // Ignored
      }

      const code = errData.code || 'BACKGROUND_REMOVAL_FAILED';
      let message = errData.message || 'Failed to remove background from photo.';

      if (code === 'PHOTOROOM_AUTH_FAILED') {
        message = 'PhotoRoom API is not configured on this server. You can still use original photo background, solid color, or the manual Eraser brush.';
      } else if (code === 'PHOTOROOM_QUOTA_EXCEEDED') {
        message = 'AI Background removal limit reached for the moment. Please try again shortly or use the Eraser brush.';
      } else if (code === 'PHOTOROOM_TIMEOUT') {
        message = 'The background removal request timed out. Please check your network and try again.';
      } else if (code === 'FILE_TOO_LARGE') {
        message = 'Image is too large. Maximum supported photo size is 10 MB.';
      }

      return {
        success: false,
        errorCode: code,
        error: message
      };
    }

    const pngBlob = await response.blob();
    const transparentUrl = createTrackedBlobUrl(pngBlob);

    return {
      success: true,
      transparentBlob: pngBlob,
      transparentUrl
    };
  } catch (err: any) {
    if (signal?.aborted || err.name === 'AbortError') {
      return {
        success: false,
        errorCode: 'ABORTED',
        error: 'Background removal was cancelled.'
      };
    }

    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: 'Network error connecting to background removal service. Please check your connection.'
    };
  }
}

/**
 * Client-side fallback: creates a transparent cutout using an off-screen canvas thresholding technique
 * if the external AI service is unavailable, allowing users to continue work without hard roadblocks.
 */
export async function createClientFallbackCutout(img: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Sample top-left and top-right corner pixels as candidate background colors
  const cornerR = (data[0] + data[(canvas.width - 1) * 4]) / 2;
  const cornerG = (data[1] + data[(canvas.width - 1) * 4 + 1]) / 2;
  const cornerB = (data[2] + data[(canvas.width - 1) * 4 + 2]) / 2;

  const threshold = 35;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - cornerR, 2) +
      Math.pow(g - cornerG, 2) +
      Math.pow(b - cornerB, 2)
    );

    if (dist < threshold) {
      data[i + 3] = 0; // Make transparent
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create fallback cutout blob'));
    }, 'image/png');
  });
}
