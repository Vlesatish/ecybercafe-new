import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { printElementAsA4 } from './printA4';

/**
 * Converts any modern color (OKLCH, modern hex, color-mix) to standard sRGB rgba(...)
 */
function sanitizeColorString(colorStr: string, helperCtx?: CanvasRenderingContext2D | null): string {
  if (!colorStr) return colorStr;
  
  // If it's already standard hex or rgb
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorStr)) return colorStr;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(colorStr)) return colorStr;

  // If 8-digit hex (#RRGGBBAA)
  if (/^#[0-9a-f]{8}$/i.test(colorStr)) {
    const r = parseInt(colorStr.slice(1, 3), 16);
    const g = parseInt(colorStr.slice(3, 5), 16);
    const b = parseInt(colorStr.slice(5, 7), 16);
    const a = (parseInt(colorStr.slice(7, 9), 16) / 255).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Convert via 2D canvas context if oklch or other modern syntax
  if (helperCtx && (colorStr.includes('oklch') || colorStr.includes('color-mix') || colorStr.includes('lab'))) {
    try {
      helperCtx.clearRect(0, 0, 1, 1);
      helperCtx.fillStyle = colorStr;
      helperCtx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = helperCtx.getImageData(0, 0, 1, 1).data;
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
    } catch {
      return colorStr;
    }
  }

  return colorStr;
}

/**
 * Downloads a DOM element as a 100% exact, high-resolution A4 PDF.
 * If html2canvas fails due to browser environment restrictions,
 * seamlessly falls back to 1-Click Print A4 (Save as PDF) so the user never gets an error.
 */
export async function downloadElementAsPdf(
  source: HTMLElement,
  filename: string,
  backgroundColor = '#ffffff'
): Promise<void> {
  try {
    const helperCanvas = document.createElement('canvas');
    helperCanvas.width = 1;
    helperCanvas.height = 1;
    const helperCtx = helperCanvas.getContext('2d', { willReadFrequently: true });

    const canvas = await html2canvas(source, {
      scale: 2.5, // Crisp 240 DPI output, smooth on all browsers without memory crash
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor,
      onclone: (clonedDoc) => {
        const root = clonedDoc.getElementById('marriage-biodata-print-area') 
          || clonedDoc.querySelector('.marriage-biodata-sheet')
          || clonedDoc.querySelector('.resume-print-sheet')
          || clonedDoc.body.firstElementChild;

        if (root instanceof HTMLElement) {
          root.style.width = '794px';
          root.style.maxWidth = '794px';
          root.style.minWidth = '794px';
          root.style.height = '1123px';
          root.style.maxHeight = '1123px';
          root.style.minHeight = '1123px';
          root.style.aspectRatio = 'unset';
          root.style.transform = 'none';
          root.style.boxShadow = 'none';
          root.style.borderRadius = '0px';
        }

        // Sanitize all computed and inline styles to prevent html2canvas color parse errors
        const elements = clonedDoc.querySelectorAll<HTMLElement>('*');
        elements.forEach(el => {
          const comp = window.getComputedStyle(el);
          if (comp.color && (comp.color.includes('oklch') || comp.color.startsWith('#'))) {
            el.style.color = sanitizeColorString(comp.color, helperCtx);
          }
          if (comp.backgroundColor && (comp.backgroundColor.includes('oklch') || comp.backgroundColor.startsWith('#'))) {
            el.style.backgroundColor = sanitizeColorString(comp.backgroundColor, helperCtx);
          }
          if (comp.borderColor && (comp.borderColor.includes('oklch') || comp.borderColor.startsWith('#'))) {
            el.style.borderColor = sanitizeColorString(comp.borderColor, helperCtx);
          }
        });
      }
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.97);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    
    const safeName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeName);
  } catch (err) {
    console.warn('Direct canvas PDF export encountered a browser limitation. Launching Print A4 / Save as PDF:', err);
    // Automatic seamless fallback
    await printElementAsA4(source, filename);
  }
}
