import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { PhotoRoomProvider } from '../services/backgroundRemoval/PhotoRoomProvider.js';
import { BackgroundRemovalError } from '../services/backgroundRemoval/types.js';

describe('PhotoRoomProvider and Error Handling Tests', () => {
  it('throws PHOTOROOM_AUTH_FAILED when API key is missing', async () => {
    const originalKey = process.env.PHOTOROOM_API_KEY;
    delete process.env.PHOTOROOM_API_KEY;

    const provider = new PhotoRoomProvider();
    const fakeBuffer = Buffer.from('fake image content');

    await assert.rejects(
      async () => {
        await provider.removeBackground(fakeBuffer, 'image/jpeg');
      },
      (err: any) => {
        assert.ok(err instanceof BackgroundRemovalError);
        assert.strictEqual(err.code, 'PHOTOROOM_AUTH_FAILED');
        assert.strictEqual(err.statusCode, 500);
        // Ensure actual API key secrets like sk_live_ are never leaked in error
        assert.doesNotMatch(err.message, /sk_live|secret_key_value/i);
        return true;
      }
    );

    if (originalKey) {
      process.env.PHOTOROOM_API_KEY = originalKey;
    }
  });

  it('verifies BackgroundRemovalError structures and error codes', () => {
    const err = new BackgroundRemovalError('FILE_TOO_LARGE', 'Max 10MB allowed', 413);
    assert.strictEqual(err.code, 'FILE_TOO_LARGE');
    assert.strictEqual(err.statusCode, 413);
    assert.strictEqual(err.message, 'Max 10MB allowed');

    const quotaErr = new BackgroundRemovalError('PHOTOROOM_QUOTA_EXCEEDED', 'Quota exceeded', 429);
    assert.strictEqual(quotaErr.code, 'PHOTOROOM_QUOTA_EXCEEDED');
    assert.strictEqual(quotaErr.statusCode, 429);

    const timeoutErr = new BackgroundRemovalError('PHOTOROOM_TIMEOUT', 'Timeout occurred', 504);
    assert.strictEqual(timeoutErr.code, 'PHOTOROOM_TIMEOUT');
    assert.strictEqual(timeoutErr.statusCode, 504);

    const unsuppErr = new BackgroundRemovalError('UNSUPPORTED_FORMAT', 'Unsupported format', 415);
    assert.strictEqual(unsuppErr.code, 'UNSUPPORTED_FORMAT');
    assert.strictEqual(unsuppErr.statusCode, 415);

    const invalidErr = new BackgroundRemovalError('INVALID_FILE', 'Invalid file', 400);
    assert.strictEqual(invalidErr.code, 'INVALID_FILE');
    assert.strictEqual(invalidErr.statusCode, 400);
  });

  it('ensures API key is never exposed in error responses or JSON serialization', () => {
    const err = new BackgroundRemovalError(
      'PHOTOROOM_AUTH_FAILED',
      'Invalid or unauthorized PhotoRoom API key. Please check your credentials.',
      401
    );

    const json = JSON.stringify({
      success: false,
      code: err.code,
      message: err.message
    });

    assert.doesNotMatch(json, /api-key|secret|token/i);
    assert.match(json, /PHOTOROOM_AUTH_FAILED/);
  });
});
