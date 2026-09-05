export type SizeUnit = 'mm' | 'cm' | 'inch' | 'px';

export interface PassportPreset {
  id: string;
  label: string;
  country: string;
  widthMm: number;
  heightMm: number;
  description: string;
  defaultDpi?: number;
  popular?: boolean;
}

export interface CustomSizeSettings {
  width: number;
  height: number;
  unit: SizeUnit;
  dpi: number;
  lockAspectRatio: boolean;
}

export interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  flipH: boolean;
  croppedAreaPixels?: CropAreaPixels;
}

export interface TuneSettings {
  brightness: number; // -100 to 100 (0 default)
  contrast: number;   // -100 to 100 (0 default)
  saturation: number; // -100 to 100 (0 default)
  exposure: number;   // -100 to 100 (0 default)
  highlights: number; // -100 to 100 (0 default)
  shadows: number;    // -100 to 100 (0 default)
  warmth: number;     // -100 to 100 (0 default)
  sharpness: number;  // 0 to 100 (0 default)
  naturalSkin: boolean;
}

export type BackgroundMode = 'original' | 'color' | 'custom_image' | 'transparent';

export interface BackgroundSettings {
  mode: BackgroundMode;
  color: string;
  customImageUrl?: string;
  blurAmount: number; // 0 to 20px
  edgeFeather: number; // 0 to 10px
}

export type SuitCategory = 'all' | 'men' | 'women' | 'student' | 'formal' | 'traditional';

export interface SuitOverlay {
  id: string;
  name: string;
  category: 'men' | 'women' | 'student' | 'formal' | 'traditional';
  svgDataUri: string;
  x: number;       // Offset X percent (-100 to 100)
  y: number;       // Offset Y percent (-100 to 100)
  scale: number;   // 0.2 to 3.0
  rotation: number;// -180 to 180
  flipH: boolean;
  opacity: number; // 0.1 to 1.0
}

export interface TextSettings {
  enabled: boolean;
  candidateName: string;
  dateOfPhoto: string;
  dateOfBirth?: string;
  showDopLabel: boolean;
  fontFamily: string;
  fontSize: number; // pt scale
  isBold: boolean;
  textColor: string;
  bgColor: string;
  bgOpacity: number;
  position: 'bottom' | 'top';
  uppercase: boolean;
}

export interface BorderSettings {
  enabled: boolean;
  width: number; // 1 to 20px
  color: string;
  innerBorder: boolean;
  innerBorderColor: string;
  innerBorderWidth: number;
  outerCutLine: boolean;
  cutLineStyle: 'solid' | 'dashed';
  cornerCropMarks: boolean;
}

export interface PaperSizePreset {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface PrintSheetSettings {
  paperId: string;
  customPaperWidthMm?: number;
  customPaperHeightMm?: number;
  orientation: 'portrait' | 'landscape';
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  equalMargins: boolean;
  gapXMm: number;
  gapYMm: number;
  showCutLines: boolean;
  showCropMarks: boolean;
  autoArrange: boolean;
  sixPerRowA4: boolean;
  requestedRows?: number;
  requestedColumns?: number;
  sheetBackground: string;
  dpi: number;
}

export interface CustomerPhotoItem {
  id: string;
  name: string;
  originalImageUrl: string;
  originalImageBlob?: Blob;
  transparentForegroundUrl?: string;
  transparentForegroundBlob?: Blob;
  maskCanvasDataUrl?: string; // from custom eraser/restore tool
  crop: CropState;
  presetId: string;
  customSize?: CustomSizeSettings;
  tune: TuneSettings;
  background: BackgroundSettings;
  suit?: SuitOverlay;
  text: TextSettings;
  border: BorderSettings;
  copies: number;
  createdAt: number;
  renderedDataUrl?: string;
}

export type EditorTab =
  | 'size'
  | 'crop'
  | 'dress'
  | 'erase'
  | 'color'
  | 'background'
  | 'info'
  | 'text'
  | 'border'
  | 'tune'
  | 'sheet'
  | 'queue';
