import { CitizenService, ServiceRequest } from '../types';

export interface FormFieldEntry {
  key: string;
  label: string;
  value: any;
  isImage: boolean;
  isPdf: boolean;
  isFile?: boolean;
  filename?: string;
}

export function cleanAdminRemarks(remarks?: string): string {
  if (!remarks) return '';
  return remarks.replace(/,?\s*App No\s*=\s*[^,]+/gi, '').trim();
}

export function getRequestPdfUrl(req: Partial<ServiceRequest> | undefined | null): string | undefined {
  if (!req) return undefined;
  if (req.outputAttachmentUrl && typeof req.outputAttachmentUrl === 'string' && req.outputAttachmentUrl.trim() !== '') {
    return req.outputAttachmentUrl.trim();
  }
  const asAny = req as any;
  if (asAny.outputFileUrl && typeof asAny.outputFileUrl === 'string' && asAny.outputFileUrl.trim() !== '') {
    return asAny.outputFileUrl.trim();
  }
  if (req.formData && typeof req.formData === 'object') {
    const fd = req.formData as Record<string, any>;
    const candidate = fd.pdfUrl || fd.pdf_url || fd.pdf || fd.outputPdfUrl || fd.outputFileUrl || fd.outputAttachmentUrl;
    if (candidate && typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim();
    }
  }
  return undefined;
}

export function getFormFieldLabel(fieldKey: string, service?: CitizenService, fieldIndex?: number): string {
  if (!fieldKey) return '';

  // Skip helper metadata keys
  if (fieldKey.endsWith('_filename') || fieldKey.endsWith('_filesize')) {
    return '';
  }

  // 1. Direct match with service.fields by ID or case-insensitive match
  if (service && service.fields && Array.isArray(service.fields)) {
    const matchedById = service.fields.find(f => f.id === fieldKey || f.id.toLowerCase() === fieldKey.toLowerCase());
    if (matchedById?.label) return matchedById.label;

    // 2. Check pattern f_1, f_2, f_3 matching explicitly 1-based index in service.fields
    const fMatch = fieldKey.match(/^f_?(\d+)$/i);
    if (fMatch) {
      const idx = parseInt(fMatch[1], 10) - 1;
      if (idx >= 0 && idx < service.fields.length && service.fields[idx]?.label) {
        return service.fields[idx].label;
      }
    }
  }

  // 3. Standard common field overrides
  const commonLabels: Record<string, string> = {
    aadhaar_no: 'Aadhaar Number / आधार नंबर',
    aadhaar: 'Aadhaar Number / आधार नंबर',
    aadhar_no: 'Aadhaar Number / आधार नंबर',
    aadhar: 'Aadhaar Number / आधार नंबर',
    aadhaar_number: 'Aadhaar Number / आधार नंबर',
    aadhar_number: 'Aadhaar Number / आधार नंबर',
    mobile_no: 'Mobile Number / मोबाइल नंबर',
    mobile: 'Mobile Number / मोबाइल नंबर',
    applicant_name: 'Applicant Name / आवेदक का नाम',
    fullName: 'Full Name / पूरा नाम',
    name: 'Full Name / नाम',
    father_name: 'Father Name / पिता का नाम',
    husband_name: 'Husband Name / पति का नाम',
    epic_number: 'EPIC / Voter ID Number',
    voter_id: 'Voter ID Number / वोटर आईडी',
    ration_number: 'Ration Card Number / राशन कार्ड',
    dob: 'Date of Birth / जन्म तिथि',
    date_of_birth: 'Date of Birth / जन्म तिथि',
    address: 'Address / पूरा पता',
    remarks: 'Notes / Special Instructions',
    state: 'State / राज्य',
    district: 'District / जिला',
    block: 'Block / ब्लॉक',
    app_prefix: 'Application Prefix',
    app_number: 'Application Number / आवेदन संख्या',
    application_number: 'Application Number / आवेदन संख्या',
    photo: 'Applicant Photo / फोटो',
    document: 'Uploaded Document / दस्तावेज',
  };

  if (commonLabels[fieldKey]) return commonLabels[fieldKey];
  const fieldKeyLower = fieldKey.toLowerCase();
  if (commonLabels[fieldKeyLower]) return commonLabels[fieldKeyLower];

  // 4. Humanize snake_case or camelCase if it's a descriptive key
  if (!/^f_?\d+/i.test(fieldKey)) {
    return fieldKey
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // 5. Clean readable fallback label instead of raw internal IDs
  const fNumMatch = fieldKey.match(/^f_?(\d+)$/i);
  if (fNumMatch) {
    return `Form Field #${fNumMatch[1]}`;
  }

  return `Submitted Field Details`;
}

export function getFilteredFormDataEntries(
  formData: Record<string, any> | undefined | null,
  service?: CitizenService
): FormFieldEntry[] {
  if (!formData || typeof formData !== 'object') return [];

  const entries: FormFieldEntry[] = [];
  const seenFingerprints = new Set<string>();
  const seenKeys = new Set<string>();

  // Helper to identify semantic concept of a key/label/value
  const getConcept = (key: string, label: string, strVal: string): string => {
    const kLower = key.toLowerCase();
    const lLower = label.toLowerCase();
    const cleanDigits = strVal.replace(/\D/g, '');

    // 1. Detect 12-digit number -> Aadhaar Number
    if (cleanDigits.length === 12) {
      return 'aadhaar';
    }
    // 2. Detect 10-digit Indian Mobile Number
    if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) {
      return 'mobile';
    }
    // 3. Detect PAN Card format
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(strVal.trim())) {
      return 'pan';
    }

    if (kLower.includes('aadhaar') || kLower.includes('aadhar') || lLower.includes('aadhaar') || lLower.includes('aadhar') || lLower.includes('आधार')) {
      return 'aadhaar';
    }
    if (kLower.includes('pan') || lLower.includes('pan') || lLower.includes('पैन')) {
      return 'pan';
    }
    if (kLower.includes('mobile') || kLower.includes('phone') || lLower.includes('mobile') || lLower.includes('मोबाइल')) {
      return 'mobile';
    }
    if (kLower.includes('app_number') || kLower.includes('application_number') || lLower.includes('application number') || lLower.includes('आवेदन संख्या')) {
      return 'app_number';
    }
    if (kLower.includes('app_prefix') || lLower.includes('application prefix') || lLower.includes('application code')) {
      return 'app_prefix';
    }
    if (kLower.includes('epic') || kLower.includes('voter') || lLower.includes('epic') || lLower.includes('voter')) {
      return 'voter_id';
    }
    if (kLower.includes('father') || lLower.includes('father') || lLower.includes('पिता')) {
      return 'father_name';
    }
    if (kLower.includes('husband') || lLower.includes('husband') || lLower.includes('पति')) {
      return 'husband_name';
    }
    if (kLower.includes('dob') || kLower.includes('birth') || lLower.includes('birth') || lLower.includes('जन्म तिथि')) {
      return 'dob';
    }
    if (kLower.includes('name') || lLower.includes('name') || lLower.includes('नाम')) {
      return 'applicant_name';
    }
    return kLower;
  };

  const skippedKeys = new Set([
    'sessionToken', 'adminSessionToken', 'autoProcessedAt', 'requiredAmount',
    'currentBalance', 'error', 'success', 'priceNote', 'pan_found',
    'pdfUrl', 'pdf_url', 'pdf', 'application_no', 'app_no', 'application_number',
    'outputPdfUrl', 'outputFileUrl', 'outputAttachmentUrl', 'download_url'
  ]);

  const rawEntries = Object.entries(formData).filter(([k, v]) => {
    if (!k || v === undefined || v === null || v === '') return false;
    if (typeof v === 'object') return false;
    if (k.endsWith('_filename') || k.endsWith('_filesize')) return false;
    if (skippedKeys.has(k)) return false;
    return true;
  });

  // Sort raw entries: Primary fields defined in service.fields come FIRST (in their declared order),
  // followed by generic form fields, followed by backend-added helper keys.
  rawEntries.sort(([kA], [kB]) => {
    const idxA = service?.fields?.findIndex(f => f.id === kA || f.id.toLowerCase() === kA.toLowerCase()) ?? -1;
    const idxB = service?.fields?.findIndex(f => f.id === kB || f.id.toLowerCase() === kB.toLowerCase()) ?? -1;

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    const isGenericA = /^f_\d+/i.test(kA);
    const isGenericB = /^f_\d+/i.test(kB);
    if (isGenericA && !isGenericB) return -1;
    if (!isGenericA && isGenericB) return 1;

    return 0;
  });

  rawEntries.forEach(([key, val], idx) => {
    if (seenKeys.has(key)) return;

    const label = getFormFieldLabel(key, service, idx);
    const strVal = String(val).trim();
    if (!strVal) return;

    const cleanNormalizedVal = strVal.replace(/[\s\-\_]/g, '').toLowerCase();
    const cleanDigitsVal = strVal.replace(/\D/g, '');
    const concept = getConcept(key, label, strVal);

    // DEDUPLICATION FINGERPRINTS
    const valFingerprint = `${concept}:${cleanNormalizedVal}`;
    const digitsFingerprint = `${concept}:${cleanDigitsVal}`;
    const labelValFingerprint = `${label.toLowerCase().trim()}:${cleanNormalizedVal}`;

    if (
      seenFingerprints.has(valFingerprint) ||
      (cleanDigitsVal.length >= 10 && seenFingerprints.has(digitsFingerprint)) ||
      seenFingerprints.has(labelValFingerprint)
    ) {
      // Duplicate concept/value or label/value -> Skip duplicate entry!
      return;
    }

    seenFingerprints.add(valFingerprint);
    if (cleanDigitsVal.length >= 10) seenFingerprints.add(digitsFingerprint);
    seenFingerprints.add(labelValFingerprint);
    seenKeys.add(key);

    const valStr = typeof val === 'string' ? val.trim() : '';
    const isImage = typeof val === 'string' && (
      val.startsWith('data:image/') ||
      /\.(jpeg|jpg|gif|png|webp|bmp|svg)($|\?)/i.test(val) ||
      (val.startsWith('/uploads/') && /\.(jpeg|jpg|gif|png|webp|bmp|svg)/i.test(val))
    );

    const isPdf = typeof val === 'string' && !isImage && (
      val.startsWith('data:application/pdf') ||
      /\.pdf($|\?)/i.test(val) ||
      val.startsWith('/uploads/') ||
      ((key.toLowerCase().includes('pdf') || key.toLowerCase().includes('doc') || key.toLowerCase().includes('file') || key.toLowerCase().includes('attach') || key.toLowerCase().includes('upload') || label.toLowerCase().includes('pdf') || label.toLowerCase().includes('doc') || label.toLowerCase().includes('file') || label.toLowerCase().includes('attach') || label.toLowerCase().includes('upload') || label.toLowerCase().includes('document')) && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')))
    );

    const isFile = isImage || isPdf || (typeof val === 'string' && (val.startsWith('/uploads/') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')));

    entries.push({
      key,
      label,
      value: val,
      isImage: !!isImage,
      isPdf: !!isPdf,
      isFile: !!isFile
    });
  });

  return entries;
}

