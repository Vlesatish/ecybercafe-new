import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  generateReorderedPdf,
  reorderManagedPages,
  normalizeRotation
} from './pdfPageEngine';
import { ManagedPdfPage } from '../../types/pdfPageManager';

describe('pdfPageEngine', () => {
  it('correctly reorders pages and updates currentOrder', () => {
    const pages: ManagedPdfPage[] = [
      { id: '1', originalIndex: 0, currentOrder: 1, rotation: 0, removed: false, thumbnailUrl: '', width: 100, height: 100 },
      { id: '2', originalIndex: 1, currentOrder: 2, rotation: 0, removed: false, thumbnailUrl: '', width: 100, height: 100 },
      { id: '3', originalIndex: 2, currentOrder: 3, rotation: 0, removed: false, thumbnailUrl: '', width: 100, height: 100 },
      { id: '4', originalIndex: 3, currentOrder: 4, rotation: 0, removed: false, thumbnailUrl: '', width: 100, height: 100 }
    ];

    // Move item at index 3 (Page 4) to index 0 (Page 1)
    const reordered = reorderManagedPages(pages, 3, 0);

    expect(reordered.map(p => p.originalIndex)).toEqual([3, 0, 1, 2]);
    expect(reordered.map(p => p.currentOrder)).toEqual([1, 2, 3, 4]);
  });

  it('normalizes degrees to 0, 90, 180, 270', () => {
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
  });

  it('generates reordered PDF using pdf-lib preserving exact order and rotations', async () => {
    // Create a mock 5-page PDF with pdf-lib
    const sourceDoc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      const page = sourceDoc.addPage([200, 200]);
      // Give each page a distinct width or mark
      page.setSize(200 + i * 10, 200);
    }
    const pdfBytes = await sourceDoc.save();

    // User reorders: Page 5 (orig 4), Page 3 (orig 2), Page 1 (orig 0), Page 4 (orig 3)
    // Page 2 (orig 1) is removed!
    // Page 4 (orig 3) is rotated 90 degrees!
    const managedPages: ManagedPdfPage[] = [
      { id: 'p5', originalIndex: 4, currentOrder: 1, rotation: 0, removed: false, thumbnailUrl: '', width: 240, height: 200 },
      { id: 'p3', originalIndex: 2, currentOrder: 2, rotation: 0, removed: false, thumbnailUrl: '', width: 220, height: 200 },
      { id: 'p1', originalIndex: 0, currentOrder: 3, rotation: 0, removed: false, thumbnailUrl: '', width: 200, height: 200 },
      { id: 'p2', originalIndex: 1, currentOrder: 4, rotation: 0, removed: true, thumbnailUrl: '', width: 210, height: 200 },
      { id: 'p4', originalIndex: 3, currentOrder: 4, rotation: 90, removed: false, thumbnailUrl: '', width: 230, height: 200 }
    ];

    const generatedBytes = await generateReorderedPdf(pdfBytes.buffer as ArrayBuffer, managedPages);
    expect(generatedBytes).toBeInstanceOf(Uint8Array);
    expect(generatedBytes.length).toBeGreaterThan(0);

    // Verify generated document has exactly 4 pages in the expected sequence
    const resultDoc = await PDFDocument.load(generatedBytes);
    expect(resultDoc.getPageCount()).toBe(4);

    const page0 = resultDoc.getPage(0);
    expect(page0.getWidth()).toBe(240); // orig 4

    const page1 = resultDoc.getPage(1);
    expect(page1.getWidth()).toBe(220); // orig 2

    const page2 = resultDoc.getPage(2);
    expect(page2.getWidth()).toBe(200); // orig 0

    const page3 = resultDoc.getPage(3);
    expect(page3.getWidth()).toBe(230); // orig 3
    expect(page3.getRotation().angle).toBe(90); // rotated 90
  });
});
