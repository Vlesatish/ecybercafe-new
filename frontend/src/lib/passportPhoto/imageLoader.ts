export interface LoadedImageInfo {
  image: HTMLImageElement;
  width: number;
  height: number;
  aspectRatio: number;
  objectUrl?: string;
}

const activeObjectUrls = new Set<string>();

/**
 * Creates a trackable object URL that can be systematically cleaned up.
 */
export function createTrackedBlobUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.add(url);
  return url;
}

/**
 * Revokes a specific object URL if created by this module.
 */
export function revokeTrackedBlobUrl(url?: string): void {
  if (url && activeObjectUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignored
    }
    activeObjectUrls.delete(url);
  }
}

/**
 * Cleans up all tracked object URLs.
 */
export function cleanupAllBlobUrls(): void {
  for (const url of activeObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignored
    }
  }
  activeObjectUrls.clear();
}

/**
 * Loads an image from a URL or data URI into an HTMLImageElement.
 */
export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image from source: ' + String(err)));
    img.src = src;
  });
}

/**
 * Reads a File as an object URL and loads its image element.
 */
export async function loadFileAsImage(file: File): Promise<LoadedImageInfo> {
  const objectUrl = createTrackedBlobUrl(file);
  const image = await loadImageFromSrc(objectUrl);
  return {
    image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    aspectRatio: (image.naturalWidth || 1) / (image.naturalHeight || 1),
    objectUrl
  };
}
