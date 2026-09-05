import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp, { Metadata } from 'sharp';
import { getBackgroundRemovalProvider, BackgroundRemovalError } from '../services/backgroundRemoval/index.js';

export const passportPhotoRouter: Router = Router();

// Configure Multer with in-memory storage (never saves to disk)
const maxFileMb = Number(process.env.PHOTOROOM_MAX_FILE_MB) || 10;
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileMb * 1024 * 1024,
    files: 1,
  },
});

// Simple in-memory rate limiter per IP: max 30 requests per minute
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of rateLimitMap.entries()) {
    const fresh = list.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, fresh);
    }
  }
}, 5 * 60 * 1000);

// Concurrency control: Maximum 5 concurrent PhotoRoom upstream calls
let activeRequestsCount = 0;
const MAX_CONCURRENT_CALLS = 5;

// Allowed image formats
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);

/**
 * POST /api/passport-photo/remove-background
 */
passportPhotoRouter.post(
  '/remove-background',
  (req: Request, res: Response, next: any) => {
    const requestId = `bg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('X-Request-Id', requestId);

    uploadMemory.single('image')(req as any, res as any, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            message: `Uploaded image exceeds maximum size limit of ${maxFileMb}MB.`
          });
        }
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE',
          message: `File upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE',
          message: 'An error occurred while receiving the image upload.'
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const requestId = (res.getHeader('X-Request-Id') as string) || 'unknown';
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // 1. Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        code: 'PHOTOROOM_QUOTA_EXCEEDED',
        message: 'Too many background removal requests from your network. Please wait a minute and try again.'
      });
    }

    // 2. Concurrency limit
    if (activeRequestsCount >= MAX_CONCURRENT_CALLS) {
      return res.status(503).json({
        success: false,
        code: 'BACKGROUND_REMOVAL_FAILED',
        message: 'Background removal service is temporarily busy handling other photos. Please retry in a few moments.'
      });
    }

    // 3. Verify file presence
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FILE',
        message: 'No photo file was received in the "image" field.'
      });
    }

    // 4. Validate MIME type declaration
    const fileMime = (req.file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(fileMime)) {
      return res.status(415).json({
        success: false,
        code: 'UNSUPPORTED_FORMAT',
        message: 'Unsupported image format. Please upload JPG, JPEG, PNG or WEBP photos.'
      });
    }

    // 5. Inspect real file buffer using Sharp to verify integrity and prevent attacks
    let sharpInstance = sharp(req.file.buffer);
    let metadata: Metadata;
    try {
      metadata = await sharpInstance.metadata();
    } catch {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FILE',
        message: 'Corrupted or unreadable image file.'
      });
    }

    const realFormat = metadata.format?.toLowerCase();
    if (!realFormat || !['jpeg', 'png', 'webp'].includes(realFormat)) {
      return res.status(415).json({
        success: false,
        code: 'UNSUPPORTED_FORMAT',
        message: `Image format "${realFormat || 'unknown'}" is not supported. Please upload a standard JPG, PNG or WEBP file.`
      });
    }

    if (!metadata.width || !metadata.height || metadata.width < 50 || metadata.height < 50) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FILE',
        message: 'Image dimensions are too small to detect a portrait face.'
      });
    }

    // 6. Normalize image: auto-orient EXIF so portrait faces aren't rotated sideways
    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await sharp(req.file.buffer)
        .rotate() // Auto-rotates based on EXIF orientation tag
        .toBuffer();
    } catch {
      normalizedBuffer = req.file.buffer;
    }

    // 7. Track client disconnect to abort upstream call
    const clientAbortController = new AbortController();
    const handleClose = () => {
      if (!res.writableEnded) {
        clientAbortController.abort();
      }
    };
    req.on('close', handleClose);

    // 8. Execute background removal via provider
    activeRequestsCount++;
    try {
      const provider = getBackgroundRemovalProvider();
      const outputPngBuffer = await provider.removeBackground(
        normalizedBuffer,
        realFormat === 'jpeg' ? 'image/jpeg' : realFormat === 'png' ? 'image/png' : 'image/webp',
        clientAbortController.signal
      );

      if (res.writableEnded) return;

      // Verify that output is valid PNG
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).send(outputPngBuffer);
    } catch (err: any) {
      if (res.writableEnded) return;

      if (err instanceof BackgroundRemovalError) {
        return res.status(err.statusCode).json({
          success: false,
          code: err.code,
          message: err.message
        });
      }

      console.error(`[BackgroundRemoval ${requestId}] Unexpected error:`, err?.message || err);
      return res.status(500).json({
        success: false,
        code: 'BACKGROUND_REMOVAL_FAILED',
        message: 'An error occurred during background removal processing.'
      });
    } finally {
      activeRequestsCount = Math.max(0, activeRequestsCount - 1);
      req.off('close', handleClose);
    }
  }
);
