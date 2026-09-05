const waitForImages = async (document: Document) => {
  const images = Array.from(document.images);
  await Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));
};

/** Prints one DOM preview as one exact A4 page without printing the app shell. */
export const printElementAsA4 = async (source: HTMLElement, title: string) => {
  const oldFrame = document.getElementById('a4-print-frame');
  oldFrame?.remove();

  const frame = document.createElement('iframe');
  frame.id = 'a4-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);

  const printDocument = frame.contentDocument;
  const printWindow = frame.contentWindow;
  if (!printDocument || !printWindow) {
    frame.remove();
    window.alert('Print window open nahi ho paaya. Kripya dobara try karein.');
    return;
  }

  const page = source.cloneNode(true) as HTMLElement;
  page.removeAttribute('id');
  const stylesheetLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map(link => `<link rel="stylesheet" href="${link.href}">`)
    .join('');
  const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>('style'))
    .map(style => style.outerHTML)
    .join('');

  printDocument.open();
  printDocument.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <base href="${document.baseURI}">
        <title>${title.replace(/[<>&"]/g, '')}</title>
        ${stylesheetLinks}
        ${inlineStyles}
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
          body { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          #print-root { width: 210mm !important; height: 297mm !important; overflow: hidden !important; break-after: avoid !important; page-break-after: avoid !important; }
          #print-root > * { box-sizing: border-box !important; width: 210mm !important; height: 297mm !important; min-width: 210mm !important; min-height: 297mm !important; max-width: 210mm !important; max-height: 297mm !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: hidden !important; break-inside: avoid !important; page-break-inside: avoid !important; }
        </style>
      </head>
      <body><main id="print-root"></main></body>
    </html>`);
  printDocument.close();
  printDocument.getElementById('print-root')?.appendChild(page);

  await printDocument.fonts?.ready;
  await waitForImages(printDocument);
  await new Promise(resolve => window.setTimeout(resolve, 250));

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };
  printWindow.addEventListener('afterprint', cleanup, { once: true });
  printWindow.focus();
  printWindow.print();
  window.setTimeout(cleanup, 120000);
};
