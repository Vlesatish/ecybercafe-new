import {
  PrintSheetSettings,
  CustomerPhotoItem,
  PassportPreset
} from './types.js';
import { mmToPixels, pixelsToMm, MM_PER_INCH } from './unitConversion.js';
import { PASSPORT_SIZE_PRESETS, PAPER_SIZE_PRESETS } from './constants.js';

export interface LayoutSlot {
  index: number;
  item: CustomerPhotoItem;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  col: number;
  row: number;
}

export interface CalculatePrintLayoutOptions {
  paperWidthMm?: number;
  paperHeightMm?: number;
  paperId?: string;
  customPaperWidthMm?: number;
  customPaperHeightMm?: number;
  orientation?: 'portrait' | 'landscape';
  photoWidthMm?: number;
  photoHeightMm?: number;
  topMarginMm?: number;
  rightMarginMm?: number;
  bottomMarginMm?: number;
  leftMarginMm?: number;
  gapXmm?: number;
  gapYmm?: number;
  requestedColumns?: number;
  requestedRows?: number;
  photoItems?: CustomerPhotoItem[] | Array<{ id: string; name?: string; copies?: number; [key: string]: any }>;
  autoFit?: boolean;
  sixPerRowA4?: boolean;
  equalMargins?: boolean;
  dpi?: number;
}

export interface PrintLayoutResult {
  paperWidthMm: number;
  paperHeightMm: number;
  paperWidthPx: number;
  paperHeightPx: number;
  photoWidthMm: number;
  photoHeightMm: number;
  photoWidthPx: number;
  photoHeightPx: number;
  dpi: number;
  columns: number;
  rows: number;
  // Aliases for compatibility
  cols: number;
  capacity: number;
  totalRequested: number;
  usedSlots: number;
  isOverCapacity: boolean;
  gridWidthMm: number;
  gridHeightMm: number;
  gridWidthPx: number;
  gridHeightPx: number;
  startXmm: number;
  startYmm: number;
  startXPx: number;
  startYPx: number;
  usableWidthMm: number;
  usableHeightMm: number;
  actualGapXMm: number;
  actualGapYMm: number;
  fitsWithinPaper: boolean;
  overflowMm: { x: number; y: number };
  warnings: string[];
  slots: LayoutSlot[];
}

export type SheetCalculationResult = PrintLayoutResult;

/**
 * Resolves paper dimensions in millimetres considering orientation.
 */
export function getPaperDimensionsMm(settings: {
  paperId?: string;
  customPaperWidthMm?: number;
  customPaperHeightMm?: number;
  orientation?: 'portrait' | 'landscape';
  paperWidthMm?: number;
  paperHeightMm?: number;
}): { widthMm: number; heightMm: number } {
  let w = 210;
  let h = 297;

  if (settings.paperWidthMm && settings.paperHeightMm) {
    w = settings.paperWidthMm;
    h = settings.paperHeightMm;
  } else if (settings.paperId === 'custom') {
    w = settings.customPaperWidthMm || 210;
    h = settings.customPaperHeightMm || 297;
  } else if (settings.paperId) {
    const preset = PAPER_SIZE_PRESETS.find(p => p.id === settings.paperId);
    if (preset) {
      w = preset.widthMm;
      h = preset.heightMm;
    }
  }

  if (settings.orientation === 'landscape') {
    return {
      widthMm: Math.max(w, h),
      heightMm: Math.min(w, h)
    };
  }

  return {
    widthMm: Math.min(w, h),
    heightMm: Math.max(w, h)
  };
}

/**
 * Resolves photo dimensions in millimetres for a given photo item.
 */
export function getPhotoDimensionsMm(item: CustomerPhotoItem): { widthMm: number; heightMm: number } {
  if (item.customSize) {
    let w = item.customSize.width;
    let h = item.customSize.height;
    if (item.customSize.unit === 'cm') {
      w *= 10;
      h *= 10;
    } else if (item.customSize.unit === 'inch') {
      w *= 25.4;
      h *= 25.4;
    } else if (item.customSize.unit === 'px') {
      w = (w * 25.4) / (item.customSize.dpi || 300);
      h = (h * 25.4) / (item.customSize.dpi || 300);
    }
    return { widthMm: w, heightMm: h };
  }

  const preset = PASSPORT_SIZE_PRESETS.find(p => p.id === item.presetId) || PASSPORT_SIZE_PRESETS[1];
  return { widthMm: preset.widthMm, heightMm: preset.heightMm };
}

/**
 * SINGLE SOURCE OF TRUTH PURE LAYOUT FUNCTION:
 * Calculates print sheet dimensions, columns, rows, positions, and slots.
 * Validates against paper boundaries to ensure photos are NEVER clipped.
 */
export function calculatePrintLayout(options: CalculatePrintLayoutOptions): PrintLayoutResult {
  const dpi = options.dpi || 300;
  const orientation = options.orientation || 'portrait';

  // 1. Resolve canonical paper dimensions in millimetres
  const paperDims = getPaperDimensionsMm({
    paperId: options.paperId,
    paperWidthMm: options.paperWidthMm,
    paperHeightMm: options.paperHeightMm,
    customPaperWidthMm: options.customPaperWidthMm,
    customPaperHeightMm: options.customPaperHeightMm,
    orientation
  });

  const paperWidthMm = paperDims.widthMm;
  const paperHeightMm = paperDims.heightMm;
  const paperWidthPx = Math.round((paperWidthMm / MM_PER_INCH) * dpi);
  const paperHeightPx = Math.round((paperHeightMm / MM_PER_INCH) * dpi);

  const warnings: string[] = [];

  // Flatten queued photo items respecting individual copy counts
  const rawItems = (options.photoItems || []) as CustomerPhotoItem[];
  const flattenedPhotos: CustomerPhotoItem[] = [];
  rawItems.forEach(item => {
    const copies = Math.max(1, item.copies || 1);
    for (let c = 0; c < copies; c++) {
      flattenedPhotos.push(item);
    }
  });
  const totalRequested = flattenedPhotos.length;

  // 2. Resolve photo dimensions
  let photoWidthMm = options.photoWidthMm;
  let photoHeightMm = options.photoHeightMm;

  if (!photoWidthMm || !photoHeightMm) {
    if (flattenedPhotos.length > 0) {
      const dim = getPhotoDimensionsMm(flattenedPhotos[0]);
      photoWidthMm = dim.widthMm;
      photoHeightMm = dim.heightMm;
    } else {
      photoWidthMm = 35;
      photoHeightMm = 45;
    }
  }

  // 3. Preset "A4 6-Photos/Row" handling:
  // The intended dimensions for 6 photos across an A4 sheet are 32 x 41.14 mm
  // (maintains standard ~35:45 ratio, and 6 * 32 = 192mm fits within A4's 198mm usable width).
  const isA4Portrait = (options.paperId === 'a4' || (paperWidthMm === 210 && paperHeightMm === 297)) && orientation === 'portrait';
  const isSixPerRowRequested = Boolean(options.sixPerRowA4 || options.requestedColumns === 6);

  if (options.sixPerRowA4 && isA4Portrait) {
    photoWidthMm = 32;
    photoHeightMm = 41.14;
  }

  // 4. Margins & Usable Printable Area
  let topMarginMm = Math.max(0, options.topMarginMm ?? 4);
  let bottomMarginMm = Math.max(0, options.bottomMarginMm ?? 4);
  let leftMarginMm = Math.max(0, options.leftMarginMm ?? 4);
  let rightMarginMm = Math.max(0, options.rightMarginMm ?? 4);

  if (options.equalMargins) {
    const uniformMargin = leftMarginMm;
    topMarginMm = uniformMargin;
    bottomMarginMm = uniformMargin;
    rightMarginMm = uniformMargin;
  }

  let gapXmm = Math.max(0, options.gapXmm ?? 2);
  let gapYmm = Math.max(0, options.gapYmm ?? 2);
  const autoFit = options.autoFit !== false;

  let usableWidthMm = Math.max(0, paperWidthMm - leftMarginMm - rightMarginMm);
  let usableHeightMm = Math.max(0, paperHeightMm - topMarginMm - bottomMarginMm);

  // If margins exceed paper size, adjust them safely without increasing top/left offsets
  if (usableWidthMm < photoWidthMm) {
    if (autoFit && paperWidthMm > photoWidthMm) {
      const remainingForMargins = Math.max(0, paperWidthMm - photoWidthMm);
      leftMarginMm = Math.min(leftMarginMm, remainingForMargins / 2);
      rightMarginMm = Math.min(rightMarginMm, remainingForMargins / 2);
      usableWidthMm = paperWidthMm - leftMarginMm - rightMarginMm;
      warnings.push('Horizontal margins adjusted to fit at least one column.');
    }
  }

  if (usableHeightMm < photoHeightMm) {
    if (autoFit && paperHeightMm > photoHeightMm) {
      const remainingForMargins = Math.max(0, paperHeightMm - photoHeightMm);
      topMarginMm = Math.min(topMarginMm, remainingForMargins / 2);
      bottomMarginMm = Math.min(bottomMarginMm, remainingForMargins / 2);
      usableHeightMm = paperHeightMm - topMarginMm - bottomMarginMm;
      warnings.push('Vertical margins adjusted to fit at least one row.');
    }
  }

  // 5. Calculate Maximum Safe Columns & Rows
  let maxColumns = Math.max(1, Math.floor((usableWidthMm + gapXmm) / (photoWidthMm + gapXmm)));
  let maxRows = Math.max(1, Math.floor((usableHeightMm + gapYmm) / (photoHeightMm + gapYmm)));

  // Check if 6 columns were requested for 35mm photos on A4
  if (isSixPerRowRequested && photoWidthMm >= 35 && isA4Portrait && !options.sixPerRowA4) {
    // 35mm photos physically cannot fit 6 columns across A4 width (6 * 35 = 210mm = full paper width with 0 margin)
    // Automatically clamp to safe max columns (5) and warn
    maxColumns = Math.min(maxColumns, 5);
    warnings.push('35×45mm photos cannot fit 6 columns across A4 without clipping. Safely adjusted to 5 columns. Use A4 6-Photos/Row preset (32×41.14mm) for 6 columns.');
  }

  // If "sixPerRowA4" is active, ensure 6 columns fit by tuning gaps if needed
  if (options.sixPerRowA4 && isA4Portrait && photoWidthMm <= 32.5) {
    const requiredPhotoWidth = 6 * photoWidthMm;
    if (requiredPhotoWidth <= usableWidthMm) {
      const remainingWidthForGaps = usableWidthMm - requiredPhotoWidth;
      const safeGapX = Math.min(gapXmm, Math.max(0.5, remainingWidthForGaps / 5));
      gapXmm = safeGapX;
      maxColumns = 6;
    }
  }

  let columns = options.requestedColumns
    ? Math.max(1, Math.min(options.requestedColumns, maxColumns))
    : maxColumns;

  let rows = options.requestedRows
    ? Math.max(1, Math.min(options.requestedRows, maxRows))
    : maxRows;

  // 6. Grid size & Auto-Fit gap adjustment
  let requiredWidthMm = columns * photoWidthMm + (columns - 1) * gapXmm;
  let requiredHeightMm = rows * photoHeightMm + (rows - 1) * gapYmm;

  // Auto-fit gap adjustment if needed
  if (autoFit && columns > 1 && requiredWidthMm > usableWidthMm) {
    const availableForGaps = usableWidthMm - columns * photoWidthMm;
    if (availableForGaps > 0) {
      gapXmm = availableForGaps / (columns - 1);
      requiredWidthMm = columns * photoWidthMm + (columns - 1) * gapXmm;
    } else {
      // Must reduce columns
      columns = Math.max(1, Math.floor((usableWidthMm + gapXmm) / (photoWidthMm + gapXmm)));
      requiredWidthMm = columns * photoWidthMm + (columns - 1) * gapXmm;
      warnings.push('Columns reduced to prevent horizontal clipping.');
    }
  }

  if (autoFit && rows > 1 && requiredHeightMm > usableHeightMm) {
    const availableForGaps = usableHeightMm - rows * photoHeightMm;
    if (availableForGaps > 0) {
      gapYmm = availableForGaps / (rows - 1);
      requiredHeightMm = rows * photoHeightMm + (rows - 1) * gapYmm;
    } else {
      rows = Math.max(1, Math.floor((usableHeightMm + gapYmm) / (photoHeightMm + gapYmm)));
      requiredHeightMm = rows * photoHeightMm + (rows - 1) * gapYmm;
      warnings.push('Rows reduced to prevent vertical clipping.');
    }
  }

  const gridWidthMm = requiredWidthMm;
  const gridHeightMm = requiredHeightMm;

  // 7. Grid origin aligns from TOP -> LEFT according to margins (no vertical or horizontal centering)
  const startXmm = leftMarginMm;
  const startYmm = topMarginMm;

  const capacity = columns * rows;
  const usedSlots = Math.min(totalRequested, capacity);
  const isOverCapacity = totalRequested > capacity;

  if (isOverCapacity) {
    warnings.push(`Queue has ${totalRequested} photos, but sheet fits ${capacity} slots. First ${capacity} will be placed.`);
  }

  // 8. Sequential Slot Filling using placementIndex
  const slots: LayoutSlot[] = [];
  let fitsWithinPaper = true;
  let maxExtentXMm = 0;
  let maxExtentYMm = 0;

  for (let placementIndex = 0; placementIndex < usedSlots; placementIndex++) {
    const col = placementIndex % columns;
    const row = Math.floor(placementIndex / columns);

    const xMm = startXmm + col * (photoWidthMm + gapXmm);
    const yMm = startYmm + row * (photoHeightMm + gapYmm);

    const slotExtentXMm = xMm + photoWidthMm;
    const slotExtentYMm = yMm + photoHeightMm;

    if (slotExtentXMm > maxExtentXMm) maxExtentXMm = slotExtentXMm;
    if (slotExtentYMm > maxExtentYMm) maxExtentYMm = slotExtentYMm;

    // Strict boundary validation: no negative coords, no overflow beyond paper canvas
    if (xMm < 0 || yMm < 0 || slotExtentXMm > paperWidthMm + 0.001 || slotExtentYMm > paperHeightMm + 0.001) {
      fitsWithinPaper = false;
      warnings.push(`Slot ${placementIndex} (Col ${col}, Row ${row}) bounds exceed physical paper dimensions.`);
    }

    const xPx = Math.round((xMm / MM_PER_INCH) * dpi);
    const yPx = Math.round((yMm / MM_PER_INCH) * dpi);
    const widthPx = Math.round((photoWidthMm / MM_PER_INCH) * dpi);
    const heightPx = Math.round((photoHeightMm / MM_PER_INCH) * dpi);

    slots.push({
      index: placementIndex,
      item: flattenedPhotos[placementIndex],
      xMm,
      yMm,
      widthMm: photoWidthMm,
      heightMm: photoHeightMm,
      xPx,
      yPx,
      widthPx,
      heightPx,
      col,
      row
    });
  }

  const overflowX = Math.max(0, maxExtentXMm - paperWidthMm);
  const overflowY = Math.max(0, maxExtentYMm - paperHeightMm);
  if (overflowX > 0 || overflowY > 0) {
    fitsWithinPaper = false;
  }

  return {
    paperWidthMm,
    paperHeightMm,
    paperWidthPx,
    paperHeightPx,
    photoWidthMm,
    photoHeightMm,
    photoWidthPx: Math.round((photoWidthMm / MM_PER_INCH) * dpi),
    photoHeightPx: Math.round((photoHeightMm / MM_PER_INCH) * dpi),
    dpi,
    columns,
    rows,
    cols: columns,
    capacity,
    totalRequested,
    usedSlots,
    isOverCapacity,
    gridWidthMm,
    gridHeightMm,
    gridWidthPx: Math.round((gridWidthMm / MM_PER_INCH) * dpi),
    gridHeightPx: Math.round((gridHeightMm / MM_PER_INCH) * dpi),
    startXmm,
    startYmm,
    startXPx: Math.round((startXmm / MM_PER_INCH) * dpi),
    startYPx: Math.round((startYmm / MM_PER_INCH) * dpi),
    usableWidthMm,
    usableHeightMm,
    actualGapXMm: gapXmm,
    actualGapYMm: gapYmm,
    fitsWithinPaper,
    overflowMm: { x: overflowX, y: overflowY },
    warnings,
    slots
  };
}

/**
 * Backwards-compatible wrapper calling the canonical calculatePrintLayout pure function.
 */
export function calculatePrintSheetLayout(
  settings: PrintSheetSettings,
  queue: CustomerPhotoItem[]
): PrintLayoutResult {
  const firstItem = queue[0];
  let photoWidthMm = 35;
  let photoHeightMm = 45;

  if (firstItem) {
    const dim = getPhotoDimensionsMm(firstItem);
    photoWidthMm = dim.widthMm;
    photoHeightMm = dim.heightMm;
  }

  return calculatePrintLayout({
    paperId: settings.paperId,
    customPaperWidthMm: settings.customPaperWidthMm,
    customPaperHeightMm: settings.customPaperHeightMm,
    orientation: settings.orientation,
    photoWidthMm,
    photoHeightMm,
    topMarginMm: settings.marginTopMm,
    bottomMarginMm: settings.marginBottomMm,
    leftMarginMm: settings.marginLeftMm,
    rightMarginMm: settings.marginRightMm,
    equalMargins: settings.equalMargins,
    gapXmm: settings.gapXMm,
    gapYmm: settings.gapYMm,
    autoFit: settings.autoArrange,
    sixPerRowA4: settings.sixPerRowA4,
    requestedRows: settings.requestedRows,
    requestedColumns: settings.requestedColumns,
    dpi: settings.dpi || 300,
    photoItems: queue
  });
}
