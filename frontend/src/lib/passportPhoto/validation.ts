export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates file size and format before loading.
 */
export function validateImageFile(file: File, maxSizeMb?: number): ValidationResult {
  if (!file) {
    return { valid: false, error: 'Please select an image file to upload.' };
  }

  const maxBytes = maxSizeMb ? maxSizeMb * 1024 * 1024 : MAX_UPLOAD_FILE_BYTES;
  const limitMb = maxSizeMb || 10;

  // Validate size
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `The selected photo (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed size limit of ${limitMb} MB.`
    };
  }

  // Validate extension and type
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  const hasValidMime = (ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/')) && file.type !== 'application/pdf';

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP photos.'
    };
  }

  return { valid: true };
}

/**
 * Inspects loaded dimensions and returns warnings if low resolution.
 */
export function inspectImageResolution(width: number, height: number): ValidationResult {
  if (width < 100 || height < 100) {
    return {
      valid: false,
      error: 'Image dimensions are too small for biometric or passport printing.'
    };
  }

  if (width < 350 || height < 450) {
    return {
      valid: true,
      warning: 'Photo resolution is low. For crisp passport prints, a higher-resolution portrait photo is recommended.'
    };
  }

  return { valid: true };
}
