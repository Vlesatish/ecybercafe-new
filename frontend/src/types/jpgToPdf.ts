export type QueueItemType = 'image' | 'pdf';

export interface JpgToPdfQueueItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  type: QueueItemType;
  mimeType: string;
  thumbnailUrl: string;
  rotation: number; // 0, 90, 180, 270
  pageCount: number; // 1 for image, >= 1 for PDF
  width?: number;
  height?: number;
  status: 'ready' | 'processing' | 'error';
  errorMessage?: string;
}

export type PageSizeOption = 'fit' | 'a4' | 'letter';
export type PageOrientationOption = 'auto' | 'portrait' | 'landscape';
export type PageMarginOption = 'none' | 'small' | 'standard';
export type QualityOption = 'high' | 'balanced' | 'low';

export interface JpgToPdfSettings {
  pageSize: PageSizeOption;
  orientation: PageOrientationOption;
  margin: PageMarginOption;
  quality: QualityOption;
  customFileName?: string;
}
