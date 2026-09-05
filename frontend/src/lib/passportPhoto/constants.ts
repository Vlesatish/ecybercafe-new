import {
  PassportPreset,
  PaperSizePreset,
  TuneSettings,
  BackgroundSettings,
  TextSettings,
  BorderSettings,
  PrintSheetSettings,
  SuitOverlay
} from './types.js';

export const PASSPORT_SIZE_PRESETS: PassportPreset[] = [
  {
    id: 'a4_six_per_row',
    label: 'A4 6 Photos / Row',
    country: 'Standard Print Sheet',
    widthMm: 32,
    heightMm: 41.14,
    description: '3.2 x 4.114 cm - Fits exactly 6 photos per row across A4',
    popular: true
  },
  {
    id: 'in_passport',
    label: 'India Passport / PAN / OCI',
    country: 'India',
    widthMm: 35,
    heightMm: 45,
    description: '3.5 x 4.5 cm - Standard Indian Passport, PAN card, OCI, Police clearance',
    popular: true
  },
  {
    id: 'us_passport',
    label: 'USA Passport / Visa',
    country: 'United States',
    widthMm: 50.8,
    heightMm: 50.8,
    description: '2 x 2 inch (50.8 x 50.8 mm) - US Department of State standard',
    popular: true
  },
  {
    id: 'uk_passport',
    label: 'UK Passport',
    country: 'United Kingdom',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - HM Passport Office standard',
    popular: true
  },
  {
    id: 'schengen',
    label: 'Schengen Visa',
    country: 'Europe / Schengen',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - Standard for European Schengen countries',
    popular: true
  },
  {
    id: 'canada',
    label: 'Canada Passport',
    country: 'Canada',
    widthMm: 50,
    heightMm: 70,
    description: '50 x 70 mm - Passport Canada specification'
  },
  {
    id: 'australia',
    label: 'Australia Passport',
    country: 'Australia',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - Australian Passport Office'
  },
  {
    id: 'japan',
    label: 'Japan Passport / Visa',
    country: 'Japan',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - Ministry of Foreign Affairs of Japan'
  },
  {
    id: 'china',
    label: 'China Visa',
    country: 'China',
    widthMm: 33,
    heightMm: 48,
    description: '33 x 48 mm - Chinese Embassy & Visa application'
  },
  {
    id: 'russia',
    label: 'Russia Passport',
    country: 'Russia',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - Russian Federation standard'
  },
  {
    id: 'uae',
    label: 'UAE / Dubai Visa',
    country: 'United Arab Emirates',
    widthMm: 40,
    heightMm: 60,
    description: '4 x 6 cm - UAE Embassy, Dubai Residence & Tourist Visa'
  },
  {
    id: 'saudi',
    label: 'Saudi Arabia Visa / Umrah',
    country: 'Saudi Arabia',
    widthMm: 40,
    heightMm: 60,
    description: '4 x 6 cm - Saudi Embassy, Hajj & Umrah'
  },
  {
    id: 'singapore',
    label: 'Singapore Passport',
    country: 'Singapore',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - ICA Singapore specification'
  },
  {
    id: 'malaysia',
    label: 'Malaysia Passport',
    country: 'Malaysia',
    widthMm: 35,
    heightMm: 50,
    description: '35 x 50 mm - Jabatan Imigresen Malaysia'
  },
  {
    id: 'south_korea',
    label: 'South Korea Passport',
    country: 'South Korea',
    widthMm: 35,
    heightMm: 45,
    description: '35 x 45 mm - Ministry of Foreign Affairs'
  },
  {
    id: 'brazil',
    label: 'Brazil Passport',
    country: 'Brazil',
    widthMm: 50,
    heightMm: 70,
    description: '5 x 7 cm - Policia Federal Brazil'
  },
  {
    id: 'turkey',
    label: 'Turkey Biometric Visa',
    country: 'Turkey',
    widthMm: 50,
    heightMm: 60,
    description: '50 x 60 mm - Republic of Turkey Ministry of Foreign Affairs'
  }
];

export const PAPER_SIZE_PRESETS: PaperSizePreset[] = [
  {
    id: 'a4',
    label: 'A4 Paper (210 x 297 mm)',
    widthMm: 210,
    heightMm: 297
  },
  {
    id: 'a5',
    label: 'A5 Paper (148 x 210 mm)',
    widthMm: 148,
    heightMm: 210
  },
  {
    id: '4x6',
    label: 'Photo Paper 4 x 6" (101.6 x 152.4 mm)',
    widthMm: 101.6,
    heightMm: 152.4
  },
  {
    id: '5x7',
    label: 'Photo Paper 5 x 7" (127 x 177.8 mm)',
    widthMm: 127,
    heightMm: 177.8
  },
  {
    id: 'us_letter',
    label: 'US Letter (8.5 x 11" / 215.9 x 279.4 mm)',
    widthMm: 215.9,
    heightMm: 279.4
  },
  {
    id: 'custom',
    label: 'Custom Sheet Size',
    widthMm: 210,
    heightMm: 297
  }
];

export const PASSPORT_BG_COLORS = [
  { label: 'Original', value: 'original', bgClass: 'bg-slate-200' },
  { label: 'Transparent', value: 'transparent', bgClass: 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px]' },
  { label: 'White', value: '#FFFFFF', bgClass: 'bg-white' },
  { label: 'Passport Light Blue', value: '#A0C4E2', bgClass: 'bg-[#A0C4E2]' },
  { label: 'Sky Blue', value: '#3B82F6', bgClass: 'bg-blue-500' },
  { label: 'Passport Dark Blue', value: '#1E3A8A', bgClass: 'bg-blue-900' },
  { label: 'Soft Grey', value: '#E5E7EB', bgClass: 'bg-gray-200' },
  { label: 'Red (Visa/Card)', value: '#DC2626', bgClass: 'bg-red-600' },
  { label: 'Warm Cream', value: '#FFFBEB', bgClass: 'bg-amber-50' }
];

export const DEFAULT_TUNE_SETTINGS: TuneSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  warmth: 0,
  sharpness: 0,
  naturalSkin: false
};

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: 'color',
  color: '#FFFFFF',
  blurAmount: 0,
  edgeFeather: 0
};

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
  enabled: false,
  candidateName: '',
  dateOfPhoto: new Date().toISOString().split('T')[0],
  dateOfBirth: '',
  showDopLabel: true,
  fontFamily: 'Arial, sans-serif',
  fontSize: 14,
  isBold: true,
  textColor: '#000000',
  bgColor: '#FFFFFF',
  bgOpacity: 0.95,
  position: 'bottom',
  uppercase: true
};

export const DEFAULT_BORDER_SETTINGS: BorderSettings = {
  enabled: true,
  width: 2,
  color: '#000000',
  innerBorder: false,
  innerBorderColor: '#FFFFFF',
  innerBorderWidth: 1,
  outerCutLine: true,
  cutLineStyle: 'dashed',
  cornerCropMarks: false
};

export const DEFAULT_SHEET_SETTINGS: PrintSheetSettings = {
  paperId: 'a4',
  orientation: 'portrait',
  marginTopMm: 4,
  marginBottomMm: 4,
  marginLeftMm: 4,
  marginRightMm: 4,
  equalMargins: true,
  gapXMm: 2,
  gapYMm: 2,
  showCutLines: true,
  showCropMarks: false,
  autoArrange: true,
  sixPerRowA4: false,
  sheetBackground: '#FFFFFF',
  dpi: 300
};

/**
 * Clean, high-resolution vector SVG suits / apparel overlays that render crisp at any zoom or DPI.
 */
function createSuitSvg(colorA: string, colorB: string, tieColor: string, style: 'men_tie' | 'men_nehru' | 'women_blazer' | 'women_collar' | 'student_tie' | 'kurta'): string {
  let inner = '';
  if (style === 'men_tie') {
    inner = `
      <!-- White Shirt Collar -->
      <polygon points="120,40 150,90 150,150 120,130" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
      <polygon points="180,40 150,90 150,150 180,130" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
      <!-- Tie -->
      <polygon points="144,85 156,85 160,110 140,110" fill="${tieColor}"/>
      <polygon points="140,110 160,110 168,260 150,290 132,260" fill="${tieColor}" stroke="#1E293B" stroke-width="1"/>
      <line x1="140" y1="150" x2="160" y2="170" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2"/>
      <line x1="138" y1="190" x2="162" y2="210" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2"/>
      <!-- Coat Lapels -->
      <path d="M 40 120 L 115 80 L 128 170 L 60 300 L 20 300 Z" fill="${colorA}" stroke="#0F172A" stroke-width="2"/>
      <path d="M 260 120 L 185 80 L 172 170 L 240 300 L 280 300 Z" fill="${colorA}" stroke="#0F172A" stroke-width="2"/>
      <!-- Outer Coat Body -->
      <path d="M 20 300 L 50 140 Q 90 95 120 75 L 125 180 L 150 300 Z" fill="${colorB}"/>
      <path d="M 280 300 L 250 140 Q 210 95 180 75 L 175 180 L 150 300 Z" fill="${colorB}"/>
      <!-- Buttons -->
      <circle cx="150" cy="220" r="4" fill="#E2E8F0" stroke="#0F172A"/>
      <circle cx="150" cy="255" r="4" fill="#E2E8F0" stroke="#0F172A"/>
    `;
  } else if (style === 'men_nehru') {
    inner = `
      <!-- Nehru Mandarin Collar -->
      <path d="M 115 65 Q 150 78 185 65 L 188 95 Q 150 105 112 95 Z" fill="${colorA}" stroke="#0F172A" stroke-width="2"/>
      <!-- Central placket -->
      <rect x="145" y="90" width="10" height="210" fill="${colorA}" stroke="#0F172A" stroke-width="1.5"/>
      <!-- Body -->
      <path d="M 20 300 L 45 130 Q 80 85 115 65 L 145 95 L 145 300 Z" fill="${colorB}"/>
      <path d="M 280 300 L 255 130 Q 220 85 185 65 L 155 95 L 155 300 Z" fill="${colorB}"/>
      <!-- Metallic Buttons -->
      <circle cx="150" cy="115" r="3.5" fill="#D97706" stroke="#78350F"/>
      <circle cx="150" cy="145" r="3.5" fill="#D97706" stroke="#78350F"/>
      <circle cx="150" cy="175" r="3.5" fill="#D97706" stroke="#78350F"/>
      <circle cx="150" cy="205" r="3.5" fill="#D97706" stroke="#78350F"/>
      <circle cx="150" cy="235" r="3.5" fill="#D97706" stroke="#78350F"/>
      <!-- Pocket Square -->
      <rect x="75" y="160" width="35" height="4" rx="2" fill="#FFFFFF"/>
    `;
  } else if (style === 'women_blazer') {
    inner = `
      <!-- Women V-Neck Blouse/Inner -->
      <polygon points="125,50 150,140 175,50" fill="#FFFFFF" stroke="#E2E8F0"/>
      <!-- Soft Lapels -->
      <path d="M 35 300 L 55 135 Q 90 90 120 70 L 145 180 L 110 300 Z" fill="${colorA}" stroke="#1E293B" stroke-width="1.5"/>
      <path d="M 265 300 L 245 135 Q 210 90 180 70 L 155 180 L 190 300 Z" fill="${colorA}" stroke="#1E293B" stroke-width="1.5"/>
      <!-- Body -->
      <path d="M 15 300 L 45 140 Q 80 100 120 70 L 145 180 L 150 300 Z" fill="${colorB}"/>
      <path d="M 285 300 L 255 140 Q 220 100 180 70 L 155 180 L 150 300 Z" fill="${colorB}"/>
      <!-- Single Elegant Button -->
      <circle cx="150" cy="210" r="5" fill="#0F172A" stroke="#E2E8F0"/>
    `;
  } else if (style === 'women_collar') {
    inner = `
      <!-- Crisp White Formal Shirt Collar -->
      <polygon points="105,65 145,100 135,130 95,95" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <polygon points="195,65 155,100 165,130 205,95" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <polygon points="140,95 160,95 156,300 144,300" fill="#F8FAFC" stroke="#E2E8F0"/>
      <path d="M 25 300 L 50 140 Q 80 90 105 65 L 140 100 L 145 300 Z" fill="${colorA}"/>
      <path d="M 275 300 L 250 140 Q 220 90 195 65 L 160 100 L 155 300 Z" fill="${colorA}"/>
      <circle cx="150" cy="140" r="3" fill="#FFFFFF" stroke="#94A3B8"/>
      <circle cx="150" cy="180" r="3" fill="#FFFFFF" stroke="#94A3B8"/>
      <circle cx="150" cy="220" r="3" fill="#FFFFFF" stroke="#94A3B8"/>
    `;
  } else if (style === 'student_tie') {
    inner = `
      <!-- School Shirt Collar -->
      <polygon points="115,55 145,95 135,120 105,80" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
      <polygon points="185,55 155,95 165,120 195,80" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
      <!-- Striped School Tie -->
      <polygon points="143,90 157,90 160,110 140,110" fill="${tieColor}"/>
      <polygon points="140,110 160,110 166,270 150,295 134,270" fill="${tieColor}"/>
      <!-- Tie Stripes -->
      <line x1="140" y1="130" x2="160" y2="145" stroke="#FBBF24" stroke-width="3"/>
      <line x1="138" y1="170" x2="162" y2="185" stroke="#FBBF24" stroke-width="3"/>
      <line x1="136" y1="210" x2="164" y2="225" stroke="#FBBF24" stroke-width="3"/>
      <!-- School Blazer -->
      <path d="M 25 300 L 50 140 Q 80 90 115 55 L 140 105 L 145 300 Z" fill="${colorA}" stroke="#0F172A" stroke-width="2"/>
      <path d="M 275 300 L 250 140 Q 220 90 185 55 L 160 105 L 155 300 Z" fill="${colorA}" stroke="#0F172A" stroke-width="2"/>
    `;
  } else {
    // Kurta / Traditional
    inner = `
      <!-- Traditional Collar Band -->
      <path d="M 115 65 Q 150 78 185 65 L 186 85 Q 150 96 114 85 Z" fill="${colorA}" stroke="#9A3412" stroke-width="1.5"/>
      <!-- Kurta Placket with embroidery -->
      <rect x="145" y="85" width="10" height="215" fill="${colorA}" stroke="#7C2D12"/>
      <path d="M 20 300 L 45 130 Q 80 85 115 65 L 145 85 L 145 300 Z" fill="${colorB}"/>
      <path d="M 280 300 L 255 130 Q 220 85 185 65 L 155 85 L 155 300 Z" fill="${colorB}"/>
      <!-- Wooden buttons -->
      <circle cx="150" cy="110" r="3" fill="#78350F"/>
      <circle cx="150" cy="140" r="3" fill="#78350F"/>
      <circle cx="150" cy="170" r="3" fill="#78350F"/>
      <circle cx="150" cy="200" r="3" fill="#78350F"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SUIT_PRESETS: SuitOverlay[] = [
  {
    id: 'men_suit_navy',
    name: 'Men Navy Suit & Maroon Tie',
    category: 'men',
    svgDataUri: createSuitSvg('#1E3A8A', '#172554', '#991B1B', 'men_tie'),
    x: 0,
    y: 18,
    scale: 1.05,
    rotation: 0,
    flipH: false,
    opacity: 1
  },
  {
    id: 'men_suit_black',
    name: 'Men Black Suit & Royal Tie',
    category: 'men',
    svgDataUri: createSuitSvg('#18181B', '#09090B', '#2563EB', 'men_tie'),
    x: 0,
    y: 18,
    scale: 1.05,
    rotation: 0,
    flipH: false,
    opacity: 1
  },
  {
    id: 'men_nehru_jacket',
    name: 'Men Nehru Bandhgala Jacket',
    category: 'traditional',
    svgDataUri: createSuitSvg('#334155', '#1E293B', '#D97706', 'men_nehru'),
    x: 0,
    y: 18,
    scale: 1.05,
    rotation: 0,
    flipH: false,
    opacity: 1
  },
  {
    id: 'women_blazer_charcoal',
    name: 'Women Executive Charcoal Blazer',
    category: 'women',
    svgDataUri: createSuitSvg('#334155', '#1E293B', '#FFFFFF', 'women_blazer'),
    x: 0,
    y: 18,
    scale: 1.02,
    rotation: 0,
    flipH: false,
    opacity: 1
  },
  {
    id: 'women_collar_formal',
    name: 'Women Formal White Collar Shirt',
    category: 'formal',
    svgDataUri: createSuitSvg('#0284C7', '#0369A1', '#FFFFFF', 'women_collar'),
    x: 0,
    y: 18,
    scale: 1.02,
    rotation: 0,
    flipH: false,
    opacity: 1
  },
  {
    id: 'student_blazer_tie',
    name: 'Student Uniform Blazer & Striped Tie',
    category: 'student',
    svgDataUri: createSuitSvg('#1E3A8A', '#1E293B', '#DC2626', 'student_tie'),
    x: 0,
    y: 18,
    scale: 1.04,
    rotation: 0,
    flipH: false,
    opacity: 1
  },
  {
    id: 'traditional_kurta',
    name: 'Traditional Royal Kurta',
    category: 'traditional',
    svgDataUri: createSuitSvg('#C2410C', '#9A3412', '#78350F', 'kurta'),
    x: 0,
    y: 18,
    scale: 1.05,
    rotation: 0,
    flipH: false,
    opacity: 1
  }
];
