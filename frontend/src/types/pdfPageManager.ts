export interface ManagedPdfPage {
  id: string;
  originalIndex: number; // 0-based index in original PDF
  currentOrder: number; // 1-based visible order in UI
  rotation: number; // 0, 90, 180, 270 degrees
  removed: boolean;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface PdfDocumentInfo {
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  totalPages: number;
  originalBuffer: ArrayBuffer;
}

export interface RemovedPageHistoryItem {
  id: string;
  page: ManagedPdfPage;
  prevIndex: number;
  timestamp: number;
}

export type PdfManagerStep = 'idle' | 'loading' | 'managing' | 'generating' | 'ready' | 'error';
