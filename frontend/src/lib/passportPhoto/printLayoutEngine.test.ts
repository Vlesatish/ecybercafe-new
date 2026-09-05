import { describe, expect, it } from 'vitest';
import {
  calculatePrintLayout,
  calculatePrintSheetLayout,
  PrintLayoutResult
} from './printLayoutEngine.js';
import { CustomerPhotoItem, PrintSheetSettings } from './types.js';

// Helper to mock a customer photo item
function createMockPhoto(id: string, copies = 1, widthMm = 35, heightMm = 45): CustomerPhotoItem {
  return {
    id,
    name: `Customer ${id}`,
    originalImageUrl: 'data:image/png;base64,mock',
    presetId: 'in_passport',
    copies,
    crop: {
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      flipH: false
    },
    createdAt: Date.now(),
    customSize: {
      width: widthMm,
      height: heightMm,
      unit: 'mm',
      dpi: 300,
      lockAspectRatio: true
    },
    tune: {
      brightness: 0,
      contrast: 0,
      exposure: 0,
      saturation: 0,
      warmth: 0,
      sharpness: 0,
      highlights: 0,
      shadows: 0,
      naturalSkin: false
    },
    background: {
      mode: 'original',
      color: '#ffffff',
      blurAmount: 0,
      edgeFeather: 0
    },
    text: {
      enabled: false,
      candidateName: '',
      dateOfPhoto: '',
      showDopLabel: false,
      fontFamily: 'Inter',
      fontSize: 12,
      isBold: false,
      textColor: '#000000',
      bgColor: '#ffffff',
      bgOpacity: 0.8,
      position: 'bottom',
      uppercase: false
    },
    border: {
      enabled: false,
      color: '#000000',
      width: 1,
      innerBorder: false,
      innerBorderColor: '#ffffff',
      innerBorderWidth: 1,
      outerCutLine: false,
      cutLineStyle: 'dashed',
      cornerCropMarks: false
    }
  };
}

describe('calculatePrintLayout & Boundary Validation Engine', () => {
  // 1. A4 portrait, 35x45mm, 5 columns
  it('correctly calculates A4 portrait with 35×45mm photos fitting 5 columns without clipping', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      orientation: 'portrait',
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 10,
      rightMarginMm: 10,
      topMarginMm: 10,
      bottomMarginMm: 10,
      gapXmm: 3,
      gapYmm: 4,
      requestedColumns: 5,
      photoItems: [createMockPhoto('1', 25)]
    });

    expect(layout.columns).toBe(5);
    expect(layout.fitsWithinPaper).toBe(true);
    expect(layout.overflowMm.x).toBe(0);
    expect(layout.overflowMm.y).toBe(0);

    // Every rectangle must be inside the paper bounds
    layout.slots.forEach(slot => {
      expect(slot.xMm).toBeGreaterThanOrEqual(0);
      expect(slot.yMm).toBeGreaterThanOrEqual(0);
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(210.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(297.001);
      expect(slot.xPx + slot.widthPx).toBeLessThanOrEqual(layout.paperWidthPx + 1);
      expect(slot.yPx + slot.heightPx).toBeLessThanOrEqual(layout.paperHeightPx + 1);
    });
  });

  // 2. A4 portrait, 32x41.14mm, 6 columns (A4 6-Photos/Row preset)
  it('correctly calculates A4 portrait with 32×41.14mm preset for 6 columns and 30 slots', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      orientation: 'portrait',
      sixPerRowA4: true,
      leftMarginMm: 6,
      rightMarginMm: 6,
      topMarginMm: 10,
      bottomMarginMm: 10,
      gapXmm: 1.2,
      gapYmm: 3,
      requestedColumns: 6,
      requestedRows: 5,
      photoItems: [createMockPhoto('1', 30, 32, 41.14)]
    });

    expect(layout.columns).toBe(6);
    expect(layout.rows).toBe(5);
    expect(layout.capacity).toBe(30);
    expect(layout.fitsWithinPaper).toBe(true);
    expect(layout.overflowMm.x).toBe(0);
    expect(layout.overflowMm.y).toBe(0);

    // Validate 30 slots placement across 5 rows and 6 columns
    expect(layout.slots.length).toBe(30);
    layout.slots.forEach(slot => {
      expect(slot.xMm).toBeGreaterThanOrEqual(0);
      expect(slot.yMm).toBeGreaterThanOrEqual(0);
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(210.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(297.001);
    });

    // Check that photos are placed across rows, not all in row 0
    const rowCounts = new Array(5).fill(0);
    layout.slots.forEach(slot => {
      rowCounts[slot.row]++;
    });
    expect(rowCounts).toEqual([6, 6, 6, 6, 6]);
  });

  // 2b. A4 portrait, 32x41.14mm, 6 columns with auto full sheet rows (6 rows = 36 slots)
  it('fills full A4 sheet with 6 rows (36 photos) down to the bottom without capping', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      orientation: 'portrait',
      sixPerRowA4: true,
      leftMarginMm: 4,
      rightMarginMm: 4,
      topMarginMm: 4,
      bottomMarginMm: 4,
      gapXmm: 1.5,
      gapYmm: 2,
      photoItems: [createMockPhoto('1', 36, 32, 41.14)]
    });

    expect(layout.columns).toBe(6);
    expect(layout.rows).toBe(6);
    expect(layout.capacity).toBe(36);
    expect(layout.slots.length).toBe(36);
    expect(layout.fitsWithinPaper).toBe(true);

    // Row 5 (the 6th row) must exist and fit within 297mm
    const row5Slots = layout.slots.filter(s => s.row === 5);
    expect(row5Slots.length).toBe(6);
    row5Slots.forEach(slot => {
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(297.001);
    });
  });

  // 3. A4 landscape
  it('handles A4 landscape orientation cleanly', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      orientation: 'landscape',
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 10,
      rightMarginMm: 10,
      topMarginMm: 10,
      bottomMarginMm: 10,
      gapXmm: 3,
      gapYmm: 3,
      photoItems: [createMockPhoto('1', 20)]
    });

    expect(layout.paperWidthMm).toBe(297);
    expect(layout.paperHeightMm).toBe(210);
    expect(layout.columns).toBeGreaterThanOrEqual(6);
    expect(layout.fitsWithinPaper).toBe(true);

    layout.slots.forEach(slot => {
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(297.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(210.001);
    });
  });

  // 4. 4x6 sheet (101.6 x 152.4 mm)
  it('correctly calculates 4×6 photo sheet (typically 2 columns x 3 rows = 6 photos)', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 101.6,
      paperHeightMm: 152.4,
      orientation: 'portrait',
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 6,
      rightMarginMm: 6,
      topMarginMm: 6,
      bottomMarginMm: 6,
      gapXmm: 2,
      gapYmm: 2,
      photoItems: [createMockPhoto('1', 6)]
    });

    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(3);
    expect(layout.capacity).toBe(6);
    expect(layout.fitsWithinPaper).toBe(true);

    layout.slots.forEach(slot => {
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(101.601);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(152.401);
    });
  });

  // 5. 5x7 sheet (127 x 177.8 mm)
  it('calculates 5×7 sheet layout within safe physical limits', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 127,
      paperHeightMm: 177.8,
      orientation: 'portrait',
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 6,
      rightMarginMm: 6,
      topMarginMm: 6,
      bottomMarginMm: 6,
      gapXmm: 2,
      gapYmm: 2,
      photoItems: [createMockPhoto('1', 9)]
    });

    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(3);
    expect(layout.capacity).toBe(9);
    expect(layout.fitsWithinPaper).toBe(true);

    layout.slots.forEach(slot => {
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(127.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(177.801);
    });
  });

  // 6. Custom paper dimensions
  it('supports custom paper dimensions with exact user values', () => {
    const layout = calculatePrintLayout({
      paperId: 'custom',
      customPaperWidthMm: 180,
      customPaperHeightMm: 240,
      orientation: 'portrait',
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 8,
      rightMarginMm: 8,
      topMarginMm: 8,
      bottomMarginMm: 8,
      gapXmm: 3,
      gapYmm: 3,
      photoItems: [createMockPhoto('1', 12)]
    });

    expect(layout.paperWidthMm).toBe(180);
    expect(layout.paperHeightMm).toBe(240);
    expect(layout.fitsWithinPaper).toBe(true);

    layout.slots.forEach(slot => {
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(180.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(240.001);
    });
  });

  // 7. Large margins
  it('handles large margins safely without negative coordinates or out of bound coords', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 70,
      rightMarginMm: 70,
      topMarginMm: 100,
      bottomMarginMm: 100,
      gapXmm: 5,
      gapYmm: 5,
      photoItems: [createMockPhoto('1', 2)]
    });

    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(2);
    expect(layout.fitsWithinPaper).toBe(true);

    layout.slots.forEach(slot => {
      expect(slot.xMm).toBeGreaterThanOrEqual(0);
      expect(slot.yMm).toBeGreaterThanOrEqual(0);
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(210.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(297.001);
    });
  });

  // 8. Large gaps
  it('handles large gaps safely by adjusting columns or gaps', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 10,
      rightMarginMm: 10,
      topMarginMm: 10,
      bottomMarginMm: 10,
      gapXmm: 40,
      gapYmm: 40,
      autoFit: true,
      photoItems: [createMockPhoto('1', 6)]
    });

    expect(layout.fitsWithinPaper).toBe(true);
    layout.slots.forEach(slot => {
      expect(slot.xMm + slot.widthMm).toBeLessThanOrEqual(210.001);
      expect(slot.yMm + slot.heightMm).toBeLessThanOrEqual(297.001);
    });
  });

  // 9. More photos than available slots (over capacity)
  it('safely handles more photos than available slots without drawing out of bounds', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 101.6,
      paperHeightMm: 152.4, // 4x6 paper fits 6 slots
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 5,
      rightMarginMm: 5,
      topMarginMm: 5,
      bottomMarginMm: 5,
      gapXmm: 2,
      gapYmm: 2,
      photoItems: [createMockPhoto('1', 50)] // 50 photos requested
    });

    expect(layout.totalRequested).toBe(50);
    expect(layout.capacity).toBe(6);
    expect(layout.usedSlots).toBe(6);
    expect(layout.isOverCapacity).toBe(true);
    expect(layout.slots.length).toBe(6);
    expect(layout.fitsWithinPaper).toBe(true);
  });

  // 10. Mixed copy counts across different customers
  it('places mixed copies from different customers sequentially across rows', () => {
    const queue = [
      createMockPhoto('cust_A', 3), // 3 copies
      createMockPhoto('cust_B', 5), // 5 copies
      createMockPhoto('cust_C', 4)  // 4 copies
    ];

    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      photoWidthMm: 35,
      photoHeightMm: 45,
      leftMarginMm: 10,
      rightMarginMm: 10,
      topMarginMm: 10,
      bottomMarginMm: 10,
      gapXmm: 2,
      gapYmm: 3,
      requestedColumns: 5,
      photoItems: queue
    });

    expect(layout.totalRequested).toBe(12);
    expect(layout.slots.length).toBe(12);

    // Slots 0,1,2 should be customer A
    expect(layout.slots[0].item.id).toBe('cust_A');
    expect(layout.slots[1].item.id).toBe('cust_A');
    expect(layout.slots[2].item.id).toBe('cust_A');

    // Slots 3,4,5,6,7 should be customer B
    expect(layout.slots[3].item.id).toBe('cust_B');
    expect(layout.slots[4].item.id).toBe('cust_B');
    expect(layout.slots[5].item.id).toBe('cust_B'); // Col 0, Row 1 (sequential across rows!)
    expect(layout.slots[5].col).toBe(0);
    expect(layout.slots[5].row).toBe(1);

    // Slots 8,9,10,11 should be customer C
    expect(layout.slots[11].item.id).toBe('cust_C');
    expect(layout.slots[11].col).toBe(1);
    expect(layout.slots[11].row).toBe(2);
  });

  // 11. Zero photos
  it('handles zero photos without throwing or creating invalid slots', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      photoWidthMm: 35,
      photoHeightMm: 45,
      photoItems: []
    });

    expect(layout.totalRequested).toBe(0);
    expect(layout.usedSlots).toBe(0);
    expect(layout.slots).toEqual([]);
    expect(layout.capacity).toBeGreaterThan(0);
    expect(layout.fitsWithinPaper).toBe(true);
  });

  // 12. Exactly one photo
  it('places a single photo at startX, startY without errors', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      photoWidthMm: 35,
      photoHeightMm: 45,
      photoItems: [createMockPhoto('1', 1)]
    });

    expect(layout.slots.length).toBe(1);
    expect(layout.slots[0].col).toBe(0);
    expect(layout.slots[0].row).toBe(0);
    expect(layout.slots[0].xMm).toBeCloseTo(layout.startXmm, 3);
    expect(layout.slots[0].yMm).toBeCloseTo(layout.startYmm, 3);
  });

  // 13. Exactly 30 queued photos on A4
  it('fills all 30 slots on A4 with 6 columns × 5 rows', () => {
    const layout = calculatePrintLayout({
      paperWidthMm: 210,
      paperHeightMm: 297,
      orientation: 'portrait',
      sixPerRowA4: true,
      leftMarginMm: 6,
      rightMarginMm: 6,
      topMarginMm: 10,
      bottomMarginMm: 10,
      gapXmm: 1.2,
      gapYmm: 3,
      requestedColumns: 6,
      requestedRows: 5,
      photoItems: [createMockPhoto('1', 30, 32, 41.14)]
    });

    expect(layout.slots.length).toBe(30);
    expect(layout.capacity).toBe(30);
    expect(layout.usedSlots).toBe(30);

    // Slot 29 should be Col 5, Row 4
    const lastSlot = layout.slots[29];
    expect(lastSlot.col).toBe(5);
    expect(lastSlot.row).toBe(4);
    expect(lastSlot.xMm + lastSlot.widthMm).toBeLessThanOrEqual(210.001);
    expect(lastSlot.yMm + lastSlot.heightMm).toBeLessThanOrEqual(297.001);
  });

  // 14. Preview / export rectangle equality test
  it('guarantees preview, JPG, PNG, PDF, and Print use identical rectangle coordinates', () => {
    const settings: PrintSheetSettings = {
      paperId: 'a4',
      orientation: 'portrait',
      marginTopMm: 10,
      marginBottomMm: 10,
      marginLeftMm: 6,
      marginRightMm: 6,
      equalMargins: false,
      gapXMm: 1.2,
      gapYMm: 3,
      showCutLines: true,
      showCropMarks: true,
      dpi: 300,
      sheetBackground: '#ffffff',
      sixPerRowA4: true,
      autoArrange: true
    };

    const queue = [createMockPhoto('cust_1', 12, 32, 41.14)];

    // Preview calculation
    const previewLayout = calculatePrintSheetLayout(settings, queue);

    // Export calculation
    const exportLayout = calculatePrintSheetLayout(settings, queue);

    // Print calculation
    const printLayout = calculatePrintSheetLayout(settings, queue);

    expect(previewLayout.slots.length).toBe(exportLayout.slots.length);
    expect(exportLayout.slots.length).toBe(printLayout.slots.length);

    for (let i = 0; i < previewLayout.slots.length; i++) {
      const pSlot = previewLayout.slots[i];
      const eSlot = exportLayout.slots[i];
      const prSlot = printLayout.slots[i];

      expect(pSlot.xMm).toBe(eSlot.xMm);
      expect(eSlot.xMm).toBe(prSlot.xMm);

      expect(pSlot.yMm).toBe(eSlot.yMm);
      expect(eSlot.yMm).toBe(prSlot.yMm);

      expect(pSlot.xPx).toBe(eSlot.xPx);
      expect(eSlot.xPx).toBe(prSlot.xPx);

      expect(pSlot.yPx).toBe(eSlot.yPx);
      expect(eSlot.yPx).toBe(prSlot.yPx);

      expect(pSlot.widthPx).toBe(eSlot.widthPx);
      expect(pSlot.heightPx).toBe(eSlot.heightPx);
    }
  });

  // 15. Exact Margin Top placement tests (0mm, 2mm, 4mm, 10mm) - No vertical centering
  it('strictly starts row 0 at marginTop without unwanted vertical centering', () => {
    const testMargins = [0, 2, 4, 10];
    const photoWidth = 35;
    const photoHeight = 45;
    const gapY = 2;
    const gapX = 2;

    for (const marginTop of testMargins) {
      const layout = calculatePrintLayout({
        paperWidthMm: 210,
        paperHeightMm: 297,
        orientation: 'portrait',
        photoWidthMm: photoWidth,
        photoHeightMm: photoHeight,
        topMarginMm: marginTop,
        leftMarginMm: 4,
        bottomMarginMm: 4,
        rightMarginMm: 4,
        gapXmm: gapX,
        gapYmm: gapY,
        photoItems: [createMockPhoto('item1', 12)] // 12 photos (e.g. multiple rows)
      });

      expect(layout.startYmm).toBe(marginTop);
      expect(layout.startXmm).toBe(4);

      // Row 0 must start exactly at marginTop
      const row0Slots = layout.slots.filter(s => s.row === 0);
      expect(row0Slots.length).toBeGreaterThan(0);
      row0Slots.forEach(s => {
        expect(s.yMm).toBe(marginTop);
        expect(s.yPx).toBe(Math.round((marginTop / 25.4) * 300));
      });

      // Row 1 must start at marginTop + photoHeight + gapY
      const row1Slots = layout.slots.filter(s => s.row === 1);
      if (row1Slots.length > 0) {
        row1Slots.forEach(s => {
          expect(s.yMm).toBe(marginTop + photoHeight + gapY);
          expect(s.yPx).toBe(Math.round(((marginTop + photoHeight + gapY) / 25.4) * 300));
        });
      }

      // Row 2 must start at marginTop + 2 * (photoHeight + gapY)
      const row2Slots = layout.slots.filter(s => s.row === 2);
      if (row2Slots.length > 0) {
        row2Slots.forEach(s => {
          expect(s.yMm).toBe(marginTop + 2 * (photoHeight + gapY));
          expect(s.yPx).toBe(Math.round(((marginTop + 2 * (photoHeight + gapY)) / 25.4) * 300));
        });
      }
    }
  });
});
