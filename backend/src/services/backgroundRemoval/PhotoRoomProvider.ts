import { BackgroundRemovalProvider, BackgroundRemovalError } from './types.js';

export class PhotoRoomProvider implements BackgroundRemovalProvider {
  public readonly name = 'PhotoRoom';

  private getApiKey(): string {
    return (process.env.PHOTOROOM_API_KEY || '').trim();
  }

  private getApiUrl(): string {
    return (process.env.PHOTOROOM_API_URL || 'https://sdk.photoroom.com/v1/segment').trim();
  }

  private getTimeoutMs(): number {
    const raw = Number(process.env.PHOTOROOM_TIMEOUT_MS);
    return !isNaN(raw) && raw > 0 ? raw : 30000;
  }

  public async removeBackground(file: Buffer, mimeType: string, signal?: AbortSignal): Promise<Buffer> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new BackgroundRemovalError(
        'PHOTOROOM_AUTH_FAILED',
        'PhotoRoom API key is not configured on the server. Please set PHOTOROOM_API_KEY in environment variables.',
        500
      );
    }

    const apiUrl = this.getApiUrl();
    const timeoutMs = this.getTimeoutMs();

    const executeCall = async (isRetry = false): Promise<Response> => {
      const timeoutController = new AbortController();
      const timer = setTimeout(() => {
        timeoutController.abort(new Error('PhotoRoom request timed out'));
      }, timeoutMs);

      const abortHandler = () => {
        timeoutController.abort(new Error('Client aborted request'));
      };

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      try {
        const formData = new FormData();
        const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const blob = new Blob([file as unknown as BlobPart], { type: mimeType });
        formData.append('image_file', blob, `image.${extension}`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'image/png, application/json'
          },
          body: formData,
          signal: timeoutController.signal
        });

        clearTimeout(timer);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }

        return response;
      } catch (err: any) {
        clearTimeout(timer);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }

        if (signal?.aborted) {
          throw new BackgroundRemovalError('BACKGROUND_REMOVAL_FAILED', 'Operation aborted by user.', 499);
        }

        if (err.name === 'AbortError' || timeoutController.signal.aborted) {
          throw new BackgroundRemovalError(
            'PHOTOROOM_TIMEOUT',
            `PhotoRoom API timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
            504
          );
        }

        if (!isRetry) {
          // Wait 1.5s and retry once for network glitch
          await new Promise(res => setTimeout(res, 1500));
          return executeCall(true);
        }

        throw new BackgroundRemovalError(
          'BACKGROUND_REMOVAL_FAILED',
          'Failed to communicate with PhotoRoom background removal service.',
          502
        );
      }
    };

    let response = await executeCall(false);

    // If 429 or 5xx, retry once
    if ((response.status === 429 || response.status >= 500) && response.status !== 501) {
      // Exponential backoff 2 seconds
      await new Promise(res => setTimeout(res, 2000));
      response = await executeCall(true);
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        throw new BackgroundRemovalError(
          'PHOTOROOM_AUTH_FAILED',
          'Invalid or unauthorized PhotoRoom API key. Please check your credentials.',
          401
        );
      }

      if (status === 402 || status === 429) {
        throw new BackgroundRemovalError(
          'PHOTOROOM_QUOTA_EXCEEDED',
          'Background removal quota is currently unavailable or rate limit reached.',
          429
        );
      }

      if (status === 400) {
        throw new BackgroundRemovalError(
          'INVALID_FILE',
          'PhotoRoom rejected image format or dimensions. Please provide a clear portrait photo.',
          400
        );
      }

      throw new BackgroundRemovalError(
        'BACKGROUND_REMOVAL_FAILED',
        `Background removal service returned error (HTTP ${status}).`,
        status >= 500 ? 502 : status
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
