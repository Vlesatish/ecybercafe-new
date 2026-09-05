import { BackgroundRemovalProvider, BackgroundRemovalError } from './types.js';

/**
 * Placeholder / Adapter for self-hosted local models (e.g. RMBG-1.4, BiRefNet, or ONNX Runtime).
 * When active, this provider runs locally or connects to a self-hosted inference microservice.
 */
export class LocalFallbackProvider implements BackgroundRemovalProvider {
  public readonly name = 'LocalBiRefNetRMBG';

  public async removeBackground(file: Buffer, _mimeType: string, _signal?: AbortSignal): Promise<Buffer> {
    const localEndpoint = process.env.LOCAL_RMBG_URL;
    if (!localEndpoint) {
      throw new BackgroundRemovalError(
        'BACKGROUND_REMOVAL_FAILED',
        'Local background removal engine is not configured on this host.',
        503
      );
    }

    try {
      const response = await fetch(localEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(file),
      });

      if (!response.ok) {
        throw new Error(`Local inference returned status ${response.status}`);
      }

      const arr = await response.arrayBuffer();
      return Buffer.from(arr);
    } catch (err: any) {
      throw new BackgroundRemovalError(
        'BACKGROUND_REMOVAL_FAILED',
        `Local removal engine failure: ${err.message || 'Unknown'}`,
        500
      );
    }
  }
}
