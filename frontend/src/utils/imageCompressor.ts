/**
 * Image Compressor Utility
 * Compresses images client-side using HTML5 Canvas
 * Reduces large phone camera photos (5-10MB) down to under 200-500KB with high visual clarity.
 */

export interface CompressionResult {
  file: File;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  savedPercentage: number; // e.g. 85%
  dataUrl: string;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.72,
    mimeType = 'image/jpeg'
  } = options;

  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPG, PNG, WEBP) can be compressed directly.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image for compression'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D Context initialization failed'));
          return;
        }

        // Fill background with white for PNG transparency handling
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image smoothly onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed to generate output blob'));
              return;
            }

            // Create new File with compressed name
            const originalName = file.name;
            const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
            const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            const newFileName = `${baseName}_compressed${ext}`;

            const compressedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now()
            });

            const originalSize = file.size;
            const compressedSize = compressedFile.size;
            const savedPercentage = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            const dataUrl = canvas.toDataURL(mimeType, quality);

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              savedPercentage,
              dataUrl,
              originalSizeFormatted: formatBytes(originalSize),
              compressedSizeFormatted: formatBytes(compressedSize)
            });
          },
          mimeType,
          quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
