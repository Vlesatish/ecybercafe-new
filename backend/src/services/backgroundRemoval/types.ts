export type BackgroundRemovalErrorCode =
  | 'INVALID_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'PHOTOROOM_AUTH_FAILED'
  | 'PHOTOROOM_QUOTA_EXCEEDED'
  | 'PHOTOROOM_TIMEOUT'
  | 'BACKGROUND_REMOVAL_FAILED';

export class BackgroundRemovalError extends Error {
  public code: BackgroundRemovalErrorCode;
  public statusCode: number;

  constructor(code: BackgroundRemovalErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'BackgroundRemovalError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface BackgroundRemovalProvider {
  name: string;
  removeBackground(file: Buffer, mimeType: string, signal?: AbortSignal): Promise<Buffer>;
}
