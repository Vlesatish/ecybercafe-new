import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  formatBytes,
  generateCombinedPdf,
  generateSingleItemPdf
} from './jpgToPdfEngine';
import { JpgToPdfQueueItem, JpgToPdfSettings } from '../../types/jpgToPdf';

describe('jpgToPdfEngine', () => {
  it('correctly formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB');
  });

  it('combines multiple PDF files in specified order with rotations', async () => {
    // Create Doc 1 (2 pages)
    const doc1 = await PDFDocument.create();
    const p1 = doc1.addPage([300, 400]);
    const p2 = doc1.addPage([300, 400]);
    const doc1Bytes = await doc1.save();

    // Create Doc 2 (1 page)
    const doc2 = await PDFDocument.create();
    const p3 = doc2.addPage([500, 600]);
    const doc2Bytes = await doc2.save();

    // Create Mock File objects
    const file1 = new File([doc1Bytes.buffer as ArrayBuffer], 'doc1.pdf', { type: 'application/pdf' });
    const file2 = new File([doc2Bytes.buffer as ArrayBuffer], 'doc2.pdf', { type: 'application/pdf' });

    const queue: JpgToPdfQueueItem[] = [
      {
        id: 'q1',
        file: file2, // user put doc2 first!
        fileName: 'doc2.pdf',
        fileSize: file2.size,
        fileSizeFormatted: formatBytes(file2.size),
        type: 'pdf',
        mimeType: 'application/pdf',
        thumbnailUrl: '',
        rotation: 90,
        pageCount: 1,
        width: 500,
        height: 600,
        status: 'ready'
      },
      {
        id: 'q2',
        file: file1, // user put doc1 second
        fileName: 'doc1.pdf',
        fileSize: file1.size,
        fileSizeFormatted: formatBytes(file1.size),
        type: 'pdf',
        mimeType: 'application/pdf',
        thumbnailUrl: '',
        rotation: 0,
        pageCount: 2,
        width: 300,
        height: 400,
        status: 'ready'
      }
    ];

    const settings: JpgToPdfSettings = {
      pageSize: 'fit',
      orientation: 'auto',
      margin: 'none',
      quality: 'high',
      customFileName: 'test_combined.pdf'
    };

    const combinedBytes = await generateCombinedPdf(queue, settings);
    expect(combinedBytes).toBeInstanceOf(Uint8Array);
    expect(combinedBytes.length).toBeGreaterThan(0);

    const loadedResult = await PDFDocument.load(combinedBytes);
    expect(loadedResult.getPageCount()).toBe(3);

    // Page 0 should be from doc2, with width 500 and rotation 90
    const page0 = loadedResult.getPage(0);
    expect(page0.getWidth()).toBe(500);
    expect(page0.getRotation().angle).toBe(90);

    // Page 1 and 2 from doc1 with width 300
    const page1 = loadedResult.getPage(1);
    expect(page1.getWidth()).toBe(300);
    const page2 = loadedResult.getPage(2);
    expect(page2.getWidth()).toBe(300);
  });
});
