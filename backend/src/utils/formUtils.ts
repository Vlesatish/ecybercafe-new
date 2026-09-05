import { CitizenService } from '../types';

export function getFormFieldLabel(fieldKey: string, service?: CitizenService, fieldIndex?: number): string {
  if (!fieldKey) return '';

  // Skip helper metadata keys
  if (fieldKey.endsWith('_filename') || fieldKey.endsWith('_filesize')) {
    return '';
  }

  // Standard common field overrides
  const commonLabels: Record<string, string> = {
    aadhaar_no: 'Aadhaar Number / आधार नंबर',
    aadhaar: 'Aadhaar Number / आधार नंबर',
    mobile_no: 'Mobile Number / मोबाइल नंबर',
    mobile: 'Mobile Number / मोबाइल नंबर',
    applicant_name: 'Applicant Name / आवेदक का नाम',
    fullName: 'Full Name / पूरा नाम',
    name: 'Full Name / नाम',
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
    photo: 'Applicant Photo / फोटो',
    document: 'Uploaded Document / दस्तावेज',
  };

  if (commonLabels[fieldKey]) return commonLabels[fieldKey];

  if (service && service.fields && Array.isArray(service.fields)) {
    // 1. Direct ID match
    const matchedById = service.fields.find(f => f.id === fieldKey || f.id.toLowerCase() === fieldKey.toLowerCase());
    if (matchedById?.label) return matchedById.label;

    // 2. Check index based on f_1, f_2, f_3 pattern
    const fMatch = fieldKey.match(/^f_?(\d+)$/i);
    if (fMatch) {
      const idx = parseInt(fMatch[1], 10) - 1;
      if (idx >= 0 && idx < service.fields.length && service.fields[idx]?.label) {
        return service.fields[idx].label;
      }
    }

    // 3. Positional fallback matching by order of form field
    if (typeof fieldIndex === 'number' && fieldIndex >= 0 && fieldIndex < service.fields.length) {
      if (service.fields[fieldIndex]?.label) {
        return service.fields[fieldIndex].label;
      }
    }
  }

  // 4. Humanize snake_case or camelCase if it's a descriptive key
  if (!/^f_?\d+/i.test(fieldKey)) {
    return fieldKey
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // 5. Clean readable fallback label instead of raw internal IDs like "INPUT FIELD (F_1785289450218_790)"
  if (typeof fieldIndex === 'number') {
    return `Form Field #${fieldIndex + 1}`;
  }

  const fNumMatch = fieldKey.match(/^f_?(\d+)$/i);
  if (fNumMatch) {
    return `Form Field #${fNumMatch[1]}`;
  }

  return `Submitted Field Details`;
}
