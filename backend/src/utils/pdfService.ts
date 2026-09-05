import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { PDFDocument, rgb, StandardFonts, PDFName, PDFNumber } from 'pdf-lib';
import sharp from 'sharp';
import { ServiceRequest } from '../types.js';

// Directory constants powered by process.env.STORAGE_DIR
const baseStorageDir = process.env.STORAGE_DIR || (fs.existsSync('/var/lib/ecybercafe') ? '/var/lib/ecybercafe' : path.join(process.cwd(), 'storage'));
const UPLOADS_DIR = path.join(baseStorageDir, 'uploads');
const TEMPLATES_DIR = path.join(baseStorageDir, 'uploads', 'templates');
const GENERATED_DIR = path.join(baseStorageDir, 'uploads', 'generated');

// Also sync with local workspace directory for development resilience
const localUploadsDir = path.join(process.cwd(), 'uploads');
const localTemplatesDir = path.join(process.cwd(), 'uploads', 'templates');
const localGeneratedDir = path.join(process.cwd(), 'uploads', 'generated');

[UPLOADS_DIR, TEMPLATES_DIR, GENERATED_DIR, localUploadsDir, localTemplatesDir, localGeneratedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.error('Error creating directory:', dir, e);
    }
  }
});

export const DEFAULT_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'default_government_form.pdf');

/**
 * Sanitizes string for pdf-lib WinAnsi encoding.
 * StandardFonts (Helvetica) in pdf-lib only support WinAnsi (ASCII / Latin-1 subset).
 * Non-WinAnsi characters like Devanagari (Hindi), Rupee symbol (₹), or special unicode bullets (•)
 * will throw "WinAnsi cannot encode ..." unless stripped or replaced.
 */
export function sanitizeTextForWinAnsi(text: any): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/₹/g, 'Rs. ')
    .replace(/•/g, '-')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) || code === 10 || code === 13) {
        return ch;
      }
      return '';
    })
    .join('');
}

/**
 * Creates a clean 2-page Government Citizen Application Form template PDF if missing.
 */
export async function ensureDefaultTemplateExists(forceRecreate = false): Promise<string> {
  if (!forceRecreate && fs.existsSync(DEFAULT_TEMPLATE_PATH) && fs.statSync(DEFAULT_TEMPLATE_PATH).size > 1000) {
    try {
      // Test if current default template can be parsed cleanly
      const existingBytes = fs.readFileSync(DEFAULT_TEMPLATE_PATH);
      await PDFDocument.load(existingBytes);
      return DEFAULT_TEMPLATE_PATH;
    } catch (e) {
      console.warn('Existing default template is corrupted or unreadable, re-creating...');
    }
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // PAGE 1: Application Form
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points (72 DPI)
    const { width, height } = page1.getSize();

    // Outer Border
    page1.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderWidth: 2,
      borderColor: rgb(0.1, 0.2, 0.5),
    });

    // Top Header Banner
    page1.drawRectangle({
      x: 20,
      y: height - 90,
      width: width - 40,
      height: 70,
      color: rgb(0.9, 0.94, 0.98),
      borderWidth: 1,
      borderColor: rgb(0.1, 0.2, 0.5),
    });

    page1.drawText('GOVERNMENT OF INDIA / BHARAT SARKAR', {
      x: 35,
      y: height - 45,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });

    page1.drawText('CITIZEN SERVICE REGISTRATION & APPLICATION FORM', {
      x: 35,
      y: height - 65,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.4),
    });

    page1.drawText('Official Government Portal - E-Governance Division', {
      x: 35,
      y: height - 80,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Passport Photo Box (Top Right)
    const photoBoxX = 445;
    const photoBoxY = height - 215;
    const photoBoxW = 115;
    const photoBoxH = 135;

    page1.drawRectangle({
      x: photoBoxX,
      y: photoBoxY,
      width: photoBoxW,
      height: photoBoxH,
      borderWidth: 1.5,
      borderColor: rgb(0.3, 0.3, 0.3),
      color: rgb(0.97, 0.97, 0.97),
    });

    page1.drawText('APPLICANT PHOTO', {
      x: photoBoxX + 10,
      y: photoBoxY + photoBoxH / 2 + 5,
      size: 9,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
    });
    page1.drawText('(PASSPORT SIZE)', {
      x: photoBoxX + 15,
      y: photoBoxY + photoBoxH / 2 - 10,
      size: 8,
      font: fontRegular,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Application Reference Bar
    page1.drawRectangle({
      x: 35,
      y: height - 125,
      width: 395,
      height: 30,
      color: rgb(0.95, 0.95, 0.95),
      borderWidth: 1,
      borderColor: rgb(0.8, 0.8, 0.8),
    });

    page1.drawText('Application Ref No:', {
      x: 45,
      y: height - 113,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page1.drawText('Submission Date:', {
      x: 240,
      y: height - 113,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // SECTION 1: Personal Details Header
    let currentY = height - 150;
    page1.drawRectangle({
      x: 35,
      y: currentY - 20,
      width: 395,
      height: 20,
      color: rgb(0.1, 0.2, 0.5),
    });
    page1.drawText('SECTION 1: APPLICANT PERSONAL INFORMATION', {
      x: 45,
      y: currentY - 14,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Form Fields Grid (Page 1)
    const fields = [
      { label: 'Full Applicant Name:', y: height - 200, key: 'name' },
      { label: "Father's Name:", y: height - 235, key: 'fatherName' },
      { label: "Mother's Name:", y: height - 270, key: 'motherName' },
      { label: 'Date of Birth (DD/MM/YYYY):', y: height - 305, key: 'dob' },
      { label: 'Gender:', y: height - 340, key: 'gender' },
      { label: 'Mobile Number:', y: height - 375, key: 'mobile' },
      { label: 'Aadhaar Number:', y: height - 410, key: 'aadhaar' },
    ];

    fields.forEach((f) => {
      page1.drawText(f.label, {
        x: 35,
        y: f.y + 12,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.3),
      });

      page1.drawRectangle({
        x: 35,
        y: f.y - 12,
        width: 525,
        height: 22,
        borderWidth: 0.8,
        borderColor: rgb(0.7, 0.7, 0.7),
        color: rgb(0.99, 0.99, 1),
      });
    });

    // SECTION 2: Address Information
    currentY = height - 460;
    page1.drawRectangle({
      x: 35,
      y: currentY - 20,
      width: 525,
      height: 20,
      color: rgb(0.1, 0.2, 0.5),
    });
    page1.drawText('SECTION 2: RESIDENTIAL & ADDRESS DETAILS', {
      x: 45,
      y: currentY - 14,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const addrFields = [
      { label: 'Full Residential Address:', y: height - 510, h: 40 },
      { label: 'Village / Town / Ward:', y: height - 575, h: 22 },
      { label: 'Block / Tehsil:', y: height - 610, h: 22 },
      { label: 'District:', y: height - 645, h: 22 },
      { label: 'State & Pin Code:', y: height - 680, h: 22 },
    ];

    addrFields.forEach((f) => {
      page1.drawText(f.label, {
        x: 35,
        y: f.y + f.h - 10,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.3),
      });

      page1.drawRectangle({
        x: 35,
        y: f.y - 10,
        width: 525,
        height: f.h,
        borderWidth: 0.8,
        borderColor: rgb(0.7, 0.7, 0.7),
        color: rgb(0.99, 0.99, 1),
      });
    });

    // Page 1 Footer Note
    page1.drawText('Page 1 of 2 - Official Citizen Form - Keep receiving copy safely', {
      x: 160,
      y: 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    // PAGE 2: Service Details, Declaration & Signature
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    
    // Outer Border Page 2
    page2.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderWidth: 2,
      borderColor: rgb(0.1, 0.2, 0.5),
    });

    // Page 2 Header
    page2.drawRectangle({
      x: 20,
      y: height - 70,
      width: width - 40,
      height: 50,
      color: rgb(0.9, 0.94, 0.98),
      borderWidth: 1,
      borderColor: rgb(0.1, 0.2, 0.5),
    });

    page2.drawText('SECTION 3: SERVICE APPLICATION & SUPPORTING DOCUMENTS', {
      x: 35,
      y: height - 45,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });

    page2.drawText('Service Title & Application Verification Details', {
      x: 35,
      y: height - 60,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Service Title Box
    page2.drawText('Applied Service Name:', {
      x: 35,
      y: height - 95,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.3),
    });
    page2.drawRectangle({
      x: 35,
      y: height - 120,
      width: 525,
      height: 22,
      borderWidth: 0.8,
      borderColor: rgb(0.7, 0.7, 0.7),
      color: rgb(0.99, 0.99, 1),
    });

    // Additional Form Data Fields Box
    page2.drawText('Additional Form Fields & Application Details:', {
      x: 35,
      y: height - 140,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.3),
    });

    page2.drawRectangle({
      x: 35,
      y: height - 360,
      width: 525,
      height: 210,
      borderWidth: 0.8,
      borderColor: rgb(0.7, 0.7, 0.7),
      color: rgb(0.99, 0.99, 1),
    });

    // Declaration Section
    page2.drawRectangle({
      x: 35,
      y: height - 400,
      width: 525,
      height: 20,
      color: rgb(0.1, 0.2, 0.5),
    });
    page2.drawText('SECTION 4: APPLICANT DECLARATION', {
      x: 45,
      y: height - 394,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const declText = 
      'I hereby declare that all the information furnished above is true, correct, and complete to the best of my knowledge and belief.\n' +
      'Nothing has been concealed or suppressed. In case any information is found false or misleading at any stage, my application\n' +
      'shall be liable for rejection and legal proceedings as per law.';

    page2.drawText(declText, {
      x: 35,
      y: height - 430,
      size: 8,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
      lineHeight: 12,
    });

    // Date & Place
    page2.drawText('Date: _______________________', {
      x: 35,
      y: height - 510,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.3),
    });
    page2.drawText('Place: _______________________', {
      x: 35,
      y: height - 530,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.3),
    });

    // Signature Placeholder Box (Bottom Right)
    const sigBoxX = 360;
    const sigBoxY = height - 560;
    const sigBoxW = 200;
    const sigBoxH = 75;

    page2.drawRectangle({
      x: sigBoxX,
      y: sigBoxY,
      width: sigBoxW,
      height: sigBoxH,
      borderWidth: 1.2,
      borderColor: rgb(0.3, 0.3, 0.3),
      color: rgb(0.98, 0.98, 0.98),
    });

    page2.drawText('APPLICANT SIGNATURE', {
      x: sigBoxX + 15,
      y: sigBoxY + 10,
      size: 8,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Official Seal Box (Bottom Left)
    page2.drawRectangle({
      x: 35,
      y: height - 700,
      width: 250,
      height: 110,
      borderWidth: 1,
      borderColor: rgb(0.6, 0.6, 0.6),
      color: rgb(0.96, 0.96, 0.96),
    });

    page2.drawText('OFFICIAL SEAL & OPERATOR VERIFICATION STAMP', {
      x: 45,
      y: height - 610,
      size: 8,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    page2.drawText('Verified by Cyber Cafe Operator / Admin', {
      x: 45,
      y: height - 685,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Footer Page 2
    page2.drawText('Page 2 of 2 - Retailer supporting documents attached on next page(s) - Authorized Output', {
      x: 100,
      y: 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(DEFAULT_TEMPLATE_PATH, pdfBytes);
    console.log('✅ Generated default 2-page government application form template at:', DEFAULT_TEMPLATE_PATH);
    return DEFAULT_TEMPLATE_PATH;
  } catch (err) {
    console.error('Error creating default template PDF:', err);
    return DEFAULT_TEMPLATE_PATH;
  }
}

/**
 * Extracts and normalizes text fields, images, and attached retailer PDFs from a request.
 */
export function extractDataFromRequest(request: ServiceRequest) {
  const fd = request.formData || {};

  // Text fields extraction
  const name = String(
    fd.applicant_name || fd.full_name || fd.name || fd.customer_name || request.retailerName || 'N/A'
  ).trim();

  const fatherName = String(
    fd.father_name || fd.fatherName || fd.father || fd.father_husband_name || 'N/A'
  ).trim();

  const motherName = String(
    fd.mother_name || fd.motherName || fd.mother || 'N/A'
  ).trim();

  const dob = String(
    fd.dob || fd.date_of_birth || fd.birth_date || 'N/A'
  ).trim();

  const gender = String(
    fd.gender || fd.sex || 'Male'
  ).trim();

  const mobile = String(
    fd.mobile_no || fd.mobile || fd.mobileNumber || fd.phone || request.retailerMobile || 'N/A'
  ).trim();

  const aadhaar = String(
    fd.aadhaar_no || fd.aadhaar || fd.aadhar_no || fd.aadhar || fd.uid || 'N/A'
  ).trim();

  // Address
  const village = fd.village || fd.town || fd.ward || '';
  const block = fd.block || fd.block_name || '';
  const district = fd.district || '';
  const state = fd.state || '';
  const pincode = fd.pincode || fd.pin || '';

  let address = String(fd.address || fd.full_address || '').trim();
  if (!address) {
    const parts = [village, block, district, state, pincode].filter(Boolean);
    address = parts.length > 0 ? parts.join(', ') : 'N/A';
  }

  // Extract photo URL or base64
  let photoUrlOrBase64: string | null = null;
  let signatureUrlOrBase64: string | null = null;
  const retailerPdfs: string[] = [];

  // Iterate over formData entries
  for (const [key, val] of Object.entries(fd)) {
    if (typeof val === 'string' && val.trim().length > 0) {
      const kLower = key.toLowerCase();

      // Photo
      if (
        kLower.includes('photo') ||
        kLower.includes('passport') ||
        kLower.includes('image') ||
        kLower.includes('avatar') ||
        kLower === 'f_photo'
      ) {
        if (!photoUrlOrBase64 && (val.startsWith('data:image/') || val.startsWith('/uploads/') || val.startsWith('http'))) {
          photoUrlOrBase64 = val;
        }
      }

      // Signature
      if (
        kLower.includes('sign') ||
        kLower.includes('signature') ||
        kLower === 'f_sign'
      ) {
        if (!signatureUrlOrBase64 && (val.startsWith('data:image/') || val.startsWith('/uploads/') || val.startsWith('http'))) {
          signatureUrlOrBase64 = val;
        }
      }

      // Supporting PDF files uploaded by retailer
      if (
        val.startsWith('data:application/pdf') ||
        val.toLowerCase().endsWith('.pdf') ||
        kLower.includes('pdf') ||
        kLower.includes('slip') ||
        kLower.includes('document') ||
        kLower.includes('doc')
      ) {
        if (val.startsWith('data:application/pdf') || val.startsWith('/uploads/') || val.startsWith('http')) {
          retailerPdfs.push(val);
        }
      }
    }
  }

  // Fallback: check general image fields if photo or signature missing
  if (!photoUrlOrBase64) {
    for (const [key, val] of Object.entries(fd)) {
      if (typeof val === 'string' && (val.startsWith('data:image/') || val.match(/\.(jpeg|jpg|png|webp)($|\?)/i))) {
        photoUrlOrBase64 = val;
        break;
      }
    }
  }

  return {
    name,
    fatherName,
    motherName,
    dob,
    gender,
    mobile,
    aadhaar,
    address,
    village,
    block,
    district,
    state,
    pincode,
    photoUrlOrBase64,
    signatureUrlOrBase64,
    retailerPdfs,
    otherFields: Object.entries(fd).filter(([k, v]) => 
      !['applicant_name', 'full_name', 'name', 'father_name', 'mother_name', 'dob', 'gender', 'mobile_no', 'mobile', 'aadhaar_no', 'aadhaar', 'address', 'photo', 'signature'].includes(k) &&
      !k.endsWith('_filename') && !k.endsWith('_filesize')
    )
  };
}

/**
 * Converts image source (Data URL, local path, or HTTP URL) into a clean Image Buffer.
 */
export async function loadImageBuffer(src: string): Promise<Buffer | null> {
  try {
    if (!src || typeof src !== 'string') return null;

    // 1. Data URL (base64)
    if (src.startsWith('data:')) {
      const parts = src.split(',');
      if (parts.length > 1) {
        return Buffer.from(parts[1], 'base64');
      }
    }

    // 2. Direct filesystem path check
    if (fs.existsSync(src)) {
      return fs.readFileSync(src);
    }

    // 3. Relative uploads or storage path check
    const cleanSrc = src.replace(/^\//, '');
    const filename = path.basename(src);

    const possiblePaths = [
      path.join(process.cwd(), 'public', cleanSrc),
      path.join(process.cwd(), cleanSrc),
      path.join(UPLOADS_DIR, filename),
      path.join(localUploadsDir, filename),
      path.join(GENERATED_DIR, filename),
      path.join(localGeneratedDir, filename),
      path.join(TEMPLATES_DIR, filename),
      path.join(localTemplatesDir, filename),
      path.join(process.cwd(), 'public', 'uploads', filename),
      path.join(process.cwd(), 'public', 'uploads', 'generated', filename),
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'uploads', 'generated', filename),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const stats = fs.statSync(p);
          if (stats.isFile() && stats.size > 0) {
            return fs.readFileSync(p);
          }
        } catch (e) {}
      }
    }

    // 4. HTTP or HTTPS
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const response = await fetch(src);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    }

    return null;
  } catch (err) {
    console.error('Error loading image/file buffer for PDF:', err);
    return null;
  }
}

/**
 * Main function to generate the final single merged PDF.
 */
export async function generateFinalPdf(params: {
  request: ServiceRequest;
  templateBufferOrPath?: Buffer | string;
  customCoordinates?: {
    photo?: { x: number; y: number; width: number; height: number; page?: number };
    signature?: { x: number; y: number; width: number; height: number; page?: number };
    fields?: Record<string, { x: number; y: number; page?: number; fontSize?: number }>;
  };
}): Promise<{ pdfUrl: string; filename: string; totalPages: number }> {
  const { request, templateBufferOrPath, customCoordinates } = params;

  // Ensure default template exists if not supplied
  const defaultPath = await ensureDefaultTemplateExists();
  
  let templateBytes: Uint8Array;
  if (templateBufferOrPath) {
    if (typeof templateBufferOrPath === 'string') {
      templateBytes = fs.readFileSync(templateBufferOrPath);
    } else {
      templateBytes = templateBufferOrPath;
    }
  } else {
    templateBytes = fs.readFileSync(defaultPath);
  }

  // Load Template PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(templateBytes);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const reqData = extractDataFromRequest(request);
  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages.length > 1 ? pages[1] : pages[0];
  const { height: p1Height } = page1.getSize();
  const { height: p2Height } = page2.getSize();

  // STEP 2: Process & Insert Applicant Photo (Page 1)
  if (reqData.photoUrlOrBase64) {
    const rawPhotoBuf = await loadImageBuffer(reqData.photoUrlOrBase64);
    if (rawPhotoBuf) {
      try {
        // High Quality Sharp Crop/Resize to fit passport size box without distortion
        const processedPhoto = await sharp(rawPhotoBuf)
          .resize({ width: 300, height: 360, fit: 'cover', position: 'center' })
          .jpeg({ quality: 95 })
          .toBuffer();

        const pdfImage = await pdfDoc.embedJpg(processedPhoto);
        
        const photoBox = customCoordinates?.photo || {
          x: 445,
          y: p1Height - 215,
          width: 115,
          height: 135,
          page: 1,
        };

        const photoPage = (photoBox.page && photoBox.page <= pages.length) ? pages[photoBox.page - 1] : page1;

        // Auto-fit maintaining proper dimensions
        photoPage.drawImage(pdfImage, {
          x: photoBox.x,
          y: photoBox.y,
          width: photoBox.width,
          height: photoBox.height,
        });
      } catch (e) {
        console.error('Error embedding photo in PDF:', e);
      }
    }
  }

  // STEP 3: Process & Insert Signature Image (Page 2)
  if (reqData.signatureUrlOrBase64) {
    const rawSignBuf = await loadImageBuffer(reqData.signatureUrlOrBase64);
    if (rawSignBuf) {
      try {
        // Process signature: Trim white borders & convert to PNG with transparent background
        const processedSign = await sharp(rawSignBuf)
          .resize({ width: 400, height: 160, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();

        const pdfSignImage = await pdfDoc.embedPng(processedSign);

        const sigBox = customCoordinates?.signature || {
          x: 360,
          y: p2Height - 560,
          width: 200,
          height: 75,
          page: pages.length > 1 ? 2 : 1,
        };

        const sigPage = (sigBox.page && sigBox.page <= pages.length) ? pages[sigBox.page - 1] : page2;

        sigPage.drawImage(pdfSignImage, {
          x: sigBox.x,
          y: sigBox.y,
          width: sigBox.width,
          height: sigBox.height,
        });
      } catch (e) {
        console.error('Error embedding signature in PDF:', e);
      }
    }
  }

  // STEP 4: Fill Text Fields into Template
  // Check if AcroForm exists in the template
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    if (fields.length > 0) {
      // Map form fields dynamically
      fields.forEach((field) => {
        const name = field.getName().toLowerCase();
        if (name.includes('name') && !name.includes('father') && !name.includes('mother')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.name)); } catch (e) {}
        } else if (name.includes('father')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.fatherName)); } catch (e) {}
        } else if (name.includes('mother')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.motherName)); } catch (e) {}
        } else if (name.includes('dob') || name.includes('birth')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.dob)); } catch (e) {}
        } else if (name.includes('gender') || name.includes('sex')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.gender)); } catch (e) {}
        } else if (name.includes('mobile') || name.includes('phone')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.mobile)); } catch (e) {}
        } else if (name.includes('aadhaar') || name.includes('aadhar')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.aadhaar)); } catch (e) {}
        } else if (name.includes('address')) {
          try { form.getTextField(field.getName()).setText(sanitizeTextForWinAnsi(reqData.address)); } catch (e) {}
        }
      });
      form.flatten();
    }
  } catch (e) {
    // Non-interactive PDF template or no form fields
  }

  // Overlay text fields at exact positions on Page 1 & Page 2
  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Page 1 Text Overlays
  page1.drawText(sanitizeTextForWinAnsi(`#${request.requestNumber} (${request.id})`), { x: 135, y: p1Height - 113, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.6) });
  page1.drawText(sanitizeTextForWinAnsi(todayStr), { x: 330, y: p1Height - 113, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.6) });

  page1.drawText(sanitizeTextForWinAnsi(reqData.name), { x: 45, y: p1Height - 195, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.fatherName), { x: 45, y: p1Height - 230, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.motherName), { x: 45, y: p1Height - 265, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.dob), { x: 45, y: p1Height - 300, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.gender), { x: 45, y: p1Height - 335, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.mobile), { x: 45, y: p1Height - 370, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.aadhaar), { x: 45, y: p1Height - 405, size: 10, font: fontBold, color: rgb(0, 0, 0) });

  const cleanAddress = sanitizeTextForWinAnsi(reqData.address);
  page1.drawText(cleanAddress.slice(0, 85), { x: 45, y: p1Height - 485, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
  if (cleanAddress.length > 85) {
    page1.drawText(cleanAddress.slice(85, 170), { x: 45, y: p1Height - 497, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
  }

  page1.drawText(sanitizeTextForWinAnsi(reqData.village || 'N/A'), { x: 45, y: p1Height - 565, size: 9, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.block || 'N/A'), { x: 45, y: p1Height - 600, size: 9, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(reqData.district || 'N/A'), { x: 45, y: p1Height - 635, size: 9, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText(sanitizeTextForWinAnsi(`${reqData.state || 'N/A'} - ${reqData.pincode || ''}`), { x: 45, y: p1Height - 670, size: 9, font: fontBold, color: rgb(0, 0, 0) });

  // Page 2 Text Overlays
  page2.drawText(sanitizeTextForWinAnsi(`${request.serviceTitle} (${request.category})`), { x: 45, y: p2Height - 113, size: 10, font: fontBold, color: rgb(0.1, 0.2, 0.6) });

  let addlY = p2Height - 160;
  reqData.otherFields.slice(0, 8).forEach(([k, v]) => {
    const cleanK = sanitizeTextForWinAnsi(k.replace(/_/g, ' ').toUpperCase());
    const cleanV = sanitizeTextForWinAnsi(String(v || '')).slice(0, 60);
    page2.drawText(`- ${cleanK}: ${cleanV}`, {
      x: 45,
      y: addlY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.2),
    });
    addlY -= 18;
  });

  page2.drawText(sanitizeTextForWinAnsi(todayStr), { x: 105, y: p2Height - 510, size: 9, font: fontBold, color: rgb(0, 0, 0) });
  page2.drawText(sanitizeTextForWinAnsi(reqData.district || reqData.block || 'Cyber Cafe Portal'), { x: 105, y: p2Height - 530, size: 9, font: fontBold, color: rgb(0, 0, 0) });

  // Official Seal Mark
  page2.drawText('eCyberCafe VERIFIED STAMP', { x: 55, y: p2Height - 635, size: 10, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
  page2.drawText(sanitizeTextForWinAnsi(`Ref: #${request.requestNumber} - Fee Paid Rs. ${request.price.toFixed(2)}`), { x: 55, y: p2Height - 655, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

  // STEP 6: Take retailer uploaded supporting PDF(s) and append AFTER the generated template
  if (reqData.retailerPdfs.length > 0) {
    for (const pdfSrc of reqData.retailerPdfs) {
      try {
        const retailerPdfBuf = await loadImageBuffer(pdfSrc);
        if (retailerPdfBuf) {
          const retailerPdfDoc = await PDFDocument.load(retailerPdfBuf);
          const copiedPages = await pdfDoc.copyPages(retailerPdfDoc, retailerPdfDoc.getPageIndices());
          copiedPages.forEach((p) => pdfDoc.addPage(p));
        }
      } catch (err) {
        console.error('Error appending retailer PDF to final document:', err);
      }
    }
  }

  // Save Final Merged Single PDF
  const finalPdfBytes = await pdfDoc.save();
  const timestamp = Date.now();
  const filename = `generated_${request.id}_${timestamp}.pdf`;
  const relativeUrl = `/uploads/generated/${filename}`;

  const destPath = path.join(GENERATED_DIR, filename);
  fs.writeFileSync(destPath, finalPdfBytes);

  // Sync to public/uploads/generated if needed
  const publicGenDir = path.join(process.cwd(), 'public', 'uploads', 'generated');
  if (!fs.existsSync(publicGenDir)) {
    try { fs.mkdirSync(publicGenDir, { recursive: true }); } catch (e) {}
  }
  try { fs.writeFileSync(path.join(publicGenDir, filename), finalPdfBytes); } catch (e) {}

  return {
    pdfUrl: relativeUrl,
    filename,
    totalPages: pdfDoc.getPageCount(),
  };
}

/**
 * Generates TWO PDF outputs for PAN / Govt Application workflow:
 * PDF 1: Form PDF (2 Pages) with Left Photo, Right Photo, Signature 1 across Photo, Signature 2 on Page 2.
 * PDF 2: Complete Document PDF (Form PDF Pages 1&2 + appended Aadhaar Card & DOB Proof pages as Page 3&4).
 */
export async function generatePanTwoPdfs(params: {
  request?: ServiceRequest | null;
  formPdfBufferOrPath?: Buffer | string;
  photoUrlOrBase64?: string | null;
  signatureUrlOrBase64?: string | null;
  aadhaarDocUrlOrBase64?: string | null;
  dobDocUrlOrBase64?: string | null;
  customCoordinates?: {
    leftPhoto?: { x: number; y: number; width: number; height: number; page?: number };
    rightPhoto?: { x: number; y: number; width: number; height: number; page?: number };
    leftSignature?: { x: number; y: number; width: number; height: number; page?: number };
    rightSignature?: { x: number; y: number; width: number; height: number; page?: number };
  };
}): Promise<{
  pdf1Url: string;
  pdf2Url: string;
  filename1: string;
  filename2: string;
  pdf1Pages: number;
  pdf2Pages: number;
}> {
  const {
    request,
    formPdfBufferOrPath,
    photoUrlOrBase64: paramPhoto,
    signatureUrlOrBase64: paramSig,
    aadhaarDocUrlOrBase64: paramAadhaar,
    dobDocUrlOrBase64: paramDob,
    customCoordinates,
  } = params;

  // Extract from request if provided and param is missing
  let reqData: any = null;
  if (request) {
    reqData = extractDataFromRequest(request);
  }

  const finalPhotoSrc = paramPhoto || reqData?.photoUrlOrBase64 || null;
  const finalSigSrc = paramSig || reqData?.signatureUrlOrBase64 || null;
  const finalAadhaarSrc = paramAadhaar || (reqData?.retailerPdfs && reqData.retailerPdfs[0]) || null;
  const finalDobSrc = paramDob || (reqData?.retailerPdfs && reqData.retailerPdfs[1]) || null;

  // Load Form PDF (uploaded pre-filled form, request generated form, or default template)
  const defaultPath = await ensureDefaultTemplateExists();
  let templateBytes: Uint8Array | null = null;

  if (formPdfBufferOrPath) {
    if (typeof formPdfBufferOrPath === 'string') {
      const buf = await loadImageBuffer(formPdfBufferOrPath);
      if (buf) templateBytes = buf;
    } else if (Buffer.isBuffer(formPdfBufferOrPath)) {
      templateBytes = formPdfBufferOrPath;
    }
  }

  // If no uploaded form, check if request already has a filled PDF form (generatedPdf or outputAttachmentUrl)
  if (!templateBytes && request) {
    const candidatePdfUrl = request.generatedPdf || request.outputAttachmentUrl;
    if (candidatePdfUrl) {
      const candidateBuf = await loadImageBuffer(candidatePdfUrl);
      if (candidateBuf && candidateBuf.slice(0, 5).toString('utf-8') === '%PDF-') {
        templateBytes = candidateBuf;
      }
    }
  }

  // Fallback to standard 2-page template if no custom/prefilled PDF provided
  if (!templateBytes) {
    templateBytes = fs.readFileSync(defaultPath);
  }

  // PDF 1: The Form with Photos & Signatures
  const pdfDoc1 = await PDFDocument.load(templateBytes);
  const pages1 = pdfDoc1.getPages();
  const page1 = pages1[0];
  const page2 = pages1.length > 1 ? pages1[1] : pages1[0];
  const { height: p1Height } = page1.getSize();
  const { height: p2Height } = page2.getSize();

  const fontRegular = await pdfDoc1.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc1.embedFont(StandardFonts.HelveticaBold);

  // Process Photo
  let embeddedJpgPhoto: any = null;
  if (finalPhotoSrc) {
    const rawPhotoBuf = await loadImageBuffer(finalPhotoSrc);
    if (rawPhotoBuf) {
      try {
        const processedPhoto = await sharp(rawPhotoBuf)
          .resize({ width: 300, height: 360, fit: 'cover', position: 'center' })
          .jpeg({ quality: 95 })
          .toBuffer();
        embeddedJpgPhoto = await pdfDoc1.embedJpg(processedPhoto);
      } catch (e) {
        console.error('Error processing photo for 2-PDF generator:', e);
      }
    }
  }

  // Default coordinate boxes for Form 49A / Govt Form (A4 595x842)
  const leftPhotoBox = customCoordinates?.leftPhoto || {
    x: 25,
    y: 825,
    width: 105,
    height: 130,
    page: 1,
  };

  const rightPhotoBox = customCoordinates?.rightPhoto || {
    x: 630,
    y: 810,
    width: 105,
    height: 130,
    page: 1,
  };

  if (embeddedJpgPhoto) {
    const photoPage = (leftPhotoBox.page && leftPhotoBox.page <= pages1.length) ? pages1[leftPhotoBox.page - 1] : page1;
    // Draw Photo 1 (Left Box)
    photoPage.drawImage(embeddedJpgPhoto, {
      x: leftPhotoBox.x,
      y: leftPhotoBox.y,
      width: leftPhotoBox.width,
      height: leftPhotoBox.height,
    });

    // Draw Photo 2 (Right Box)
    const photoPage2 = (rightPhotoBox.page && rightPhotoBox.page <= pages1.length) ? pages1[rightPhotoBox.page - 1] : page1;
    photoPage2.drawImage(embeddedJpgPhoto, {
      x: rightPhotoBox.x,
      y: rightPhotoBox.y,
      width: rightPhotoBox.width,
      height: rightPhotoBox.height,
    });
  }

  // Process Signature
  let embeddedPngSig: any = null;
  if (finalSigSrc) {
    const rawSigBuf = await loadImageBuffer(finalSigSrc);
    if (rawSigBuf) {
      try {
        const processedSig = await sharp(rawSigBuf)
          .resize({ width: 400, height: 160, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        embeddedPngSig = await pdfDoc1.embedPng(processedSig);
      } catch (e) {
        console.error('Error processing signature for 2-PDF generator:', e);
      }
    }
  }

  const leftSigBox = customCoordinates?.leftSignature || {
    x: 20,
    y: 780,
    width: 125,
    height: 50,
    page: 1,
  };

  const rightSigBox = customCoordinates?.rightSignature || {
    x: 550,
    y: 70,
    width: 195,
    height: 55,
    page: pages1.length > 1 ? 2 : 1,
  };

  if (embeddedPngSig) {
    // Draw Signature 1 (Across Left Photo / Box on Page 1)
    const sigPage1 = (leftSigBox.page && leftSigBox.page <= pages1.length) ? pages1[leftSigBox.page - 1] : page1;
    sigPage1.drawImage(embeddedPngSig, {
      x: leftSigBox.x,
      y: leftSigBox.y,
      width: leftSigBox.width,
      height: leftSigBox.height,
    });

    // Draw Signature 2 (Bottom Right Box on Page 2)
    const sigPage2 = (rightSigBox.page && rightSigBox.page <= pages1.length) ? pages1[rightSigBox.page - 1] : page2;
    sigPage2.drawImage(embeddedPngSig, {
      x: rightSigBox.x,
      y: rightSigBox.y,
      width: rightSigBox.width,
      height: rightSigBox.height,
    });
  }

  // Save PDF 1 Bytes with 100% original quality
  const pdf1Bytes = await pdfDoc1.save();

  // PDF 2: Complete Document PDF = Form PDF (PDF 1) + Appended Aadhaar Card & DOB Proof documents
  const pdfDoc2 = await PDFDocument.load(pdf1Bytes);

  // Helper function to append attachment (Image or PDF) to a target PDF document with high resolution
  const appendAttachmentToDoc = async (
    targetPdfDoc: PDFDocument,
    docSrc: string | null,
    docLabel: string,
    maxDimension = 2400,
    quality = 90
  ) => {
    if (!docSrc) return;
    try {
      const buf = await loadImageBuffer(docSrc);
      if (!buf) return;

      // Check if buffer is a PDF
      if (buf.slice(0, 5).toString('utf-8') === '%PDF-') {
        const attachedPdf = await PDFDocument.load(buf);
        const copiedPages = await targetPdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());
        copiedPages.forEach((p) => targetPdfDoc.addPage(p));
      } else {
        // Assume Image (JPEG / PNG / WebP) -> Create a new A4 page and render image centered at high clarity
        const newPage = targetPdfDoc.addPage([595.28, 841.89]);
        const { width: pageW, height: pageH } = newPage.getSize();

        // Convert and optimize image using sharp at high clarity
        const imgJpeg = await sharp(buf)
          .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        const embedImg = await targetPdfDoc.embedJpg(imgJpeg);

        // Scale to fit within page margins (leaving 20pt margin)
        const maxW = pageW - 40;
        const maxH = pageH - 40;
        const imgAspect = embedImg.width / embedImg.height;

        let drawW = maxW;
        let drawH = drawW / imgAspect;

        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * imgAspect;
        }

        const posX = (pageW - drawW) / 2;
        const posY = (pageH - drawH) / 2;

        newPage.drawImage(embedImg, {
          x: posX,
          y: posY,
          width: drawW,
          height: drawH,
        });
      }
    } catch (err) {
      console.error(`Error appending ${docLabel} to PDF 2:`, err);
    }
  };

  // Append Aadhaar and DOB Proofs at full clarity
  if (finalAadhaarSrc) {
    await appendAttachmentToDoc(pdfDoc2, finalAadhaarSrc, 'Aadhaar Document', 2400, 90);
  }

  if (finalDobSrc && finalDobSrc !== finalAadhaarSrc) {
    await appendAttachmentToDoc(pdfDoc2, finalDobSrc, 'DOB Proof Document', 2400, 90);
  }

  const pdf2Bytes = await pdfDoc2.save();

  // Save both files to disk
  const timestamp = Date.now();
  const reqTag = request ? request.id : 'custom';
  const filename1 = `Form_Signed_${reqTag}_${timestamp}.pdf`;
  const filename2 = `Complete_Application_${reqTag}_${timestamp}.pdf`;

  const path1 = path.join(GENERATED_DIR, filename1);
  const path2 = path.join(GENERATED_DIR, filename2);

  fs.writeFileSync(path1, pdf1Bytes);
  fs.writeFileSync(path2, pdf2Bytes);

  // Sync to public/uploads/generated directory
  const publicGenDir = path.join(process.cwd(), 'public', 'uploads', 'generated');
  if (!fs.existsSync(publicGenDir)) {
    try { fs.mkdirSync(publicGenDir, { recursive: true }); } catch (e) {}
  }
  try { fs.writeFileSync(path.join(publicGenDir, filename1), pdf1Bytes); } catch (e) {}
  try { fs.writeFileSync(path.join(publicGenDir, filename2), pdf2Bytes); } catch (e) {}

  return {
    pdf1Url: `/uploads/generated/${filename1}`,
    pdf2Url: `/uploads/generated/${filename2}`,
    filename1,
    filename2,
    pdf1Pages: pdfDoc1.getPageCount(),
    pdf2Pages: pdfDoc2.getPageCount(),
  };
}
