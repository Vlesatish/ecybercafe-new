import { describe, expect, it } from 'vitest';
import { validateImageFile } from './validation.js';

describe('Passport Photo validation', () => {
  it('accepts valid JPEG and PNG files within 10MB limit', () => {
    const validJpg = new File([new ArrayBuffer(1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(validJpg);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects unsupported file types like pdf or text', () => {
    const invalidPdf = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' });
    const result = validateImageFile(invalidPdf);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file format');
  });

  it('rejects files exceeding the maximum size limit', () => {
    // 15MB file exceeds 10MB limit
    const oversizedFile = new File([new ArrayBuffer(15 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(oversizedFile, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maximum allowed size');
  });
});
