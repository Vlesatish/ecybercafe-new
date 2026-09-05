import { beforeEach, describe, expect, it, vi } from 'vitest';

const pdfMock = vi.hoisted(() => ({
  loadingTask: undefined as any,
  getDocument: vi.fn(),
  PasswordResponses: { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 },
  GlobalWorkerOptions: { workerSrc: '' }
}));

vi.mock('pdfjs-dist', () => pdfMock);
vi.mock('pdfjs-dist/build/pdf.worker.min.js?url', () => ({ default: 'worker.js' }));

import { loadPdfWithPassword, PdfImportCancelledError, PdfPasswordRequest } from './loadPdfWithPassword';

const makeTask = () => {
  let resolve!: (value: any) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  const task: any = {
    promise,
    onPassword: undefined,
    destroy: vi.fn(() => {
      reject(Object.assign(new Error('cancelled'), { name: 'AbortException' }));
      return Promise.resolve();
    })
  };
  pdfMock.loadingTask = task;
  pdfMock.getDocument.mockReturnValue(task);
  return { task, resolve };
};

describe('loadPdfWithPassword', () => {
  beforeEach(() => pdfMock.getDocument.mockReset());

  it('keeps one loading task across required, incorrect, and successful attempts', async () => {
    const { task, resolve } = makeTask();
    let request!: PdfPasswordRequest;
    const statuses: string[] = [];
    const loading = loadPdfWithPassword(new ArrayBuffer(4), {
      fileName: 'protected.pdf',
      requestPassword: (next) => { request = next; },
      onStatus: (status) => statuses.push(status)
    });

    task.onPassword(vi.fn(), pdfMock.PasswordResponses.NEED_PASSWORD);
    expect(request.reason).toBe('required');
    request.submitPassword('wrong-attempt');
    task.onPassword(vi.fn(), pdfMock.PasswordResponses.INCORRECT_PASSWORD);
    expect(request.reason).toBe('incorrect');
    request.submitPassword('correct-attempt');
    resolve({ numPages: 1 });

    await expect(loading).resolves.toEqual({ numPages: 1 });
    expect(pdfMock.getDocument).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(expect.arrayContaining(['password-required', 'verifying', 'incorrect', 'unlocked']));
  });

  it('destroys the active PDF.js task when cancelled', async () => {
    const { task } = makeTask();
    let request!: PdfPasswordRequest;
    const loading = loadPdfWithPassword(new ArrayBuffer(4), {
      requestPassword: (next) => { request = next; }
    });
    task.onPassword(vi.fn(), pdfMock.PasswordResponses.NEED_PASSWORD);
    request.cancel();
    await expect(loading).rejects.toBeInstanceOf(PdfImportCancelledError);
    expect(task.destroy).toHaveBeenCalledOnce();
  });
});

