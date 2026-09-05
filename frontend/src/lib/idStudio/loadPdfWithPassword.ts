import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export type PdfPasswordReason = 'required' | 'incorrect';

export interface PdfPasswordRequest {
  jobId: string;
  fileName: string;
  reason: PdfPasswordReason;
  submitPassword: (password: string) => void;
  cancel: () => void;
}

export interface LoadPdfWithPasswordOptions {
  jobId?: string;
  fileName?: string;
  signal?: AbortSignal;
  requestPassword: (request: PdfPasswordRequest) => void;
  onStatus?: (status: 'password-required' | 'verifying' | 'incorrect' | 'unlocked') => void;
}

export class PdfImportCancelledError extends Error {
  constructor() {
    super('PDF import cancelled');
    this.name = 'PdfImportCancelledError';
  }
}

/**
 * Opens a PDF once and services PDF.js password callbacks on that same loading
 * task. Passwords are forwarded directly to PDF.js and are never persisted.
 */
export async function loadPdfWithPassword(
  source: File | ArrayBuffer | Uint8Array,
  options: LoadPdfWithPasswordOptions
): Promise<pdfjsLib.PDFDocumentProxy> {
  if (options.signal?.aborted) throw new PdfImportCancelledError();

  const bytes = source instanceof File
    ? new Uint8Array(await source.arrayBuffer())
    : source instanceof Uint8Array
      ? source
      : new Uint8Array(source);
  const fileName = source instanceof File ? source.name : (options.fileName || 'Document.pdf');
  const jobId = options.jobId || `pdf-${Date.now()}`;
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  let settled = false;
  let activeRequest: PdfPasswordRequest | undefined;

  const cancel = () => {
    if (settled) return;
    activeRequest = undefined;
    void loadingTask.destroy();
  };

  const onAbort = () => cancel();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  loadingTask.onPassword = (updatePassword: (password: string) => void, response: number) => {
    const incorrect = response === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD;
    options.onStatus?.(incorrect ? 'incorrect' : 'password-required');
    activeRequest = {
      jobId,
      fileName,
      reason: incorrect ? 'incorrect' : 'required',
      submitPassword: (password: string) => {
        if (settled || options.signal?.aborted || !password) return;
        options.onStatus?.('verifying');
        updatePassword(password);
      },
      cancel
    };
    options.requestPassword(activeRequest);
  };

  try {
    const pdf = await loadingTask.promise;
    settled = true;
    activeRequest = undefined;
    options.onStatus?.('unlocked');
    return pdf;
  } catch (error) {
    if (options.signal?.aborted || (error as Error)?.name === 'AbortException') {
      throw new PdfImportCancelledError();
    }
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    activeRequest = undefined;
  }
}
