import React, { useMemo, useRef, useState } from 'react';
import { 
  X, Heart, Upload, Download, Printer, RotateCcw, Plus, Trash2, 
  Palette, Sparkles, Camera, ArrowUp, ArrowDown, Check, Sliders
} from 'lucide-react';
import { printElementAsA4 } from '../lib/printA4';
import { downloadElementAsPdf } from '../lib/exportPdf';

interface MarriageBiodataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type TemplateStyle = 'royal' | 'sidebar' | 'floral' | 'classic';
export type ThemeColor = 'maroon' | 'gold' | 'emerald' | 'rose' | 'sapphire';
export type FontScale = 'full' | 'large' | 'medium' | 'compact';

export interface BiodataField {
  id: string;
  label: string;
  value: string;
}

export interface BiodataSection {
  id: string;
  title: string;
  fields: BiodataField[];
}

const INVOCATION_OPTIONS = [
  '॥ Shree Ganeshay Namah ॥',
  '॥ Shri Ganeshaya Namah ॥',
  '॥ Om Shree Ganeshay Namah ॥',
  '|| Om ||',
  '|| Jai Shree Ram ||',
  '|| Jai Mata Di ||',
  '|| Om Namah Siddhebhyah ||',
  '|| Jai Jinendra ||',
  '|| Ik Onkar Satgur Prasad ||',
  'Bismillah-ir-Rahman-ir-Rahim',
  '|| Biodata for Marriage ||',
  'None'
];

const TITLE_OPTIONS = [
  'MARRIAGE BIODATA',
  'BIODATA',
  'BIODATA FOR MARRIAGE',
  'CURRICULUM VITAE'
];

// Initial default sections in clean English
const createGroomSections = (): BiodataSection[] => [
  {
    id: 'personal',
    title: 'Personal Details',
    fields: [
      { id: 'name', label: 'Full Name', value: 'RAHUL SHARMA' },
      { id: 'gender', label: 'Gender', value: 'Male' },
      { id: 'dob', label: 'Date of Birth', value: '18 April 1996' },
      { id: 'birthTime', label: 'Time of Birth', value: '06:45 AM' },
      { id: 'birthPlace', label: 'Place of Birth', value: 'Patna, Bihar' },
      { id: 'height', label: 'Height', value: "5 ft 10 in (178 cm)" },
      { id: 'complexion', label: 'Complexion', value: 'Fair' },
      { id: 'bloodGroup', label: 'Blood Group', value: 'B +ve' },
      { id: 'maritalStatus', label: 'Marital Status', value: 'Never Married' }
    ]
  },
  {
    id: 'kundali',
    title: 'Horoscope & Religious Details',
    fields: [
      { id: 'religion', label: 'Religion & Caste', value: 'Hindu - Brahmin' },
      { id: 'subCaste', label: 'Sub-Caste', value: 'Kanyakubja' },
      { id: 'gotra', label: 'Gotra (Self)', value: 'Kashyap' },
      { id: 'mamaGotra', label: 'Maternal Gotra (Mama)', value: 'Vats' },
      { id: 'rashi', label: 'Rashi', value: 'Aries (Mesha)' },
      { id: 'nakshatra', label: 'Nakshatra', value: 'Bharani' },
      { id: 'manglik', label: 'Manglik Status', value: 'Non-Manglik' }
    ]
  },
  {
    id: 'education',
    title: 'Education & Profession',
    fields: [
      { id: 'education', label: 'Highest Qualification', value: 'B.Tech in Computer Science (NIT Patna)' },
      { id: 'occupation', label: 'Occupation / Role', value: 'Senior Software Engineer' },
      { id: 'company', label: 'Company / Firm', value: 'Microsoft India' },
      { id: 'income', label: 'Annual Income', value: '₹ 22 Lakh / Annum (22 LPA)' },
      { id: 'workCity', label: 'Work Location', value: 'Gurugram, Haryana' }
    ]
  },
  {
    id: 'family',
    title: 'Family Background',
    fields: [
      { id: 'fatherName', label: "Father's Name", value: 'Shri Rajesh Sharma (Senior Branch Manager, SBI Retd.)' },
      { id: 'motherName', label: "Mother's Name", value: 'Smt. Sunita Sharma (Homemaker)' },
      { id: 'grandfatherName', label: "Grandfather's Name", value: 'Late Pt. Ram Prakash Sharma' },
      { id: 'nativePlace', label: 'Native Place', value: 'Patna, Bihar' },
      { id: 'familyType', label: 'Family Type', value: 'Nuclear Family' },
      { id: 'brothers', label: 'Brothers', value: '1 Younger Brother (B.Tech, Preparing for UPSC)' },
      { id: 'sisters', label: 'Sisters', value: '1 Elder Sister (Married, Banking Professional)' },
      { id: 'nanihal', label: 'Maternal Family (Nanihal)', value: 'Shri Rameshwar Mishra, Sigra, Varanasi (UP)' }
    ]
  },
  {
    id: 'contact',
    title: 'Contact Information',
    fields: [
      { id: 'contactPerson', label: 'Contact Person', value: 'Shri Rajesh Sharma (Father)' },
      { id: 'phone', label: 'Mobile Number', value: '+91 9876543210' },
      { id: 'altPhone', label: 'Alternate Mobile', value: '+91 9431012345' },
      { id: 'email', label: 'Email Address', value: 'sharma.family.patna@gmail.com' },
      { id: 'address', label: 'Residential Address', value: 'House No. 302, Royal Enclave, Boring Road, Patna, Bihar - 800001' }
    ]
  }
];

const createBrideSections = (): BiodataSection[] => [
  {
    id: 'personal',
    title: 'Personal Details',
    fields: [
      { id: 'name', label: 'Full Name', value: 'PRIYA VERMA' },
      { id: 'gender', label: 'Gender', value: 'Female' },
      { id: 'dob', label: 'Date of Birth', value: '22 September 1998' },
      { id: 'birthTime', label: 'Time of Birth', value: '08:15 AM' },
      { id: 'birthPlace', label: 'Place of Birth', value: 'Varanasi, UP' },
      { id: 'height', label: 'Height', value: "5 ft 4 in (163 cm)" },
      { id: 'complexion', label: 'Complexion', value: 'Very Fair' },
      { id: 'bloodGroup', label: 'Blood Group', value: 'O +ve' },
      { id: 'maritalStatus', label: 'Marital Status', value: 'Never Married' }
    ]
  },
  {
    id: 'kundali',
    title: 'Horoscope & Religious Details',
    fields: [
      { id: 'religion', label: 'Religion & Caste', value: 'Hindu - Kayastha' },
      { id: 'subCaste', label: 'Sub-Caste', value: 'Srivastava' },
      { id: 'gotra', label: 'Gotra (Self)', value: 'Kashyap' },
      { id: 'mamaGotra', label: 'Maternal Gotra (Mama)', value: 'Garg' },
      { id: 'rashi', label: 'Rashi', value: 'Virgo (Kanya)' },
      { id: 'nakshatra', label: 'Nakshatra', value: 'Hasta' },
      { id: 'manglik', label: 'Manglik Status', value: 'Non-Manglik' }
    ]
  },
  {
    id: 'education',
    title: 'Education & Profession',
    fields: [
      { id: 'education', label: 'Highest Qualification', value: 'M.Sc in Mathematics & B.Ed (Gold Medalist, BHU)' },
      { id: 'occupation', label: 'Occupation / Role', value: 'Senior Secondary Teacher (Grade-I)' },
      { id: 'company', label: 'Organization', value: 'Department of Education, Govt. of UP' },
      { id: 'income', label: 'Annual Income', value: '₹ 8.5 Lakh / Annum' },
      { id: 'workCity', label: 'Work Location', value: 'Varanasi, UP' }
    ]
  },
  {
    id: 'family',
    title: 'Family Background',
    fields: [
      { id: 'fatherName', label: "Father's Name", value: 'Shri Mahendra Verma (Businessman, Wholesale Cloth)' },
      { id: 'motherName', label: "Mother's Name", value: 'Smt. Rekha Verma (Govt. Primary School Principal)' },
      { id: 'grandfatherName', label: "Grandfather's Name", value: 'Late Shri Devendra Verma' },
      { id: 'nativePlace', label: 'Native Place', value: 'Varanasi, Uttar Pradesh' },
      { id: 'brothers', label: 'Brothers', value: '1 Elder Brother (Chartered Accountant, Married)' },
      { id: 'sisters', label: 'Sisters', value: '1 Younger Sister (Pursuing MBA, Delhi University)' },
      { id: 'nanihal', label: 'Maternal Family (Nanihal)', value: 'Shri Satish Chandra Pandey, Prayagraj (UP)' }
    ]
  },
  {
    id: 'contact',
    title: 'Contact Information',
    fields: [
      { id: 'contactPerson', label: 'Contact Person', value: 'Shri Mahendra Verma (Father)' },
      { id: 'phone', label: 'Mobile Number', value: '+91 9839012345' },
      { id: 'altPhone', label: 'Alternate Mobile', value: '+91 9450123456' },
      { id: 'email', label: 'Email Address', value: 'verma.family.vns@gmail.com' },
      { id: 'address', label: 'Residential Address', value: 'B-12, Anand Vihar Colony, Sigra, Varanasi, UP - 221010' }
    ]
  }
];

// Helper to convert hex to rgba without 8-digit hex issues
const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

// Theme Color Palettes (Standard RGBA to guarantee 100% canvas & print compatibility)
const THEMES: Record<ThemeColor, { name: string; page: string; primary: string; accent: string; border: string; bannerBg: string; textDark: string }> = {
  maroon: {
    name: 'Royal Maroon',
    page: '#fffaf5',
    primary: '#7f1d1d',
    accent: '#b45309',
    border: '#991b1b',
    bannerBg: 'rgba(127, 29, 29, 0.08)',
    textDark: '#450a0a'
  },
  gold: {
    name: 'Classic Gold',
    page: '#fffdf2',
    primary: '#78350f',
    accent: '#d97706',
    border: '#ca8a04',
    bannerBg: 'rgba(120, 53, 15, 0.08)',
    textDark: '#451a03'
  },
  emerald: {
    name: 'Royal Emerald',
    page: '#f6fff9',
    primary: '#065f46',
    accent: '#c08a24',
    border: '#047857',
    bannerBg: 'rgba(6, 95, 70, 0.08)',
    textDark: '#022c22'
  },
  rose: {
    name: 'Rose Floral',
    page: '#fff7fb',
    primary: '#9d174d',
    accent: '#db2777',
    border: '#f472b6',
    bannerBg: 'rgba(157, 23, 77, 0.08)',
    textDark: '#500724'
  },
  sapphire: {
    name: 'Sapphire Blue',
    page: '#f8faff',
    primary: '#1e3a8a',
    accent: '#d97706',
    border: '#1d4ed8',
    bannerBg: 'rgba(30, 58, 138, 0.08)',
    textDark: '#0f172a'
  }
};

export const MarriageBiodataModal: React.FC<MarriageBiodataModalProps> = ({ isOpen, onClose }) => {
  // Invocation & Title
  const [invocation, setInvocation] = useState<string>('॥ Shree Ganeshay Namah ॥');
  const [title, setTitle] = useState<string>('MARRIAGE BIODATA');

  // Dynamic sections with reordering and add/remove capabilities
  const [sections, setSections] = useState<BiodataSection[]>(createGroomSections);

  // Settings
  const [template, setTemplate] = useState<TemplateStyle>('royal');
  const [themeColor, setThemeColor] = useState<ThemeColor>('maroon');
  const [fontScale, setFontScale] = useState<FontScale>('full');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhotoBox, setShowPhotoBox] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const theme = THEMES[themeColor];

  // Helper to filter non-empty fields
  const getVisibleFields = (fields: BiodataField[]) => {
    return fields.filter(f => f.value && f.value.trim() !== '');
  };

  // Helper to get person's name for file naming
  const personName = useMemo(() => {
    const pSec = sections.find(s => s.id === 'personal');
    const nameField = pSec?.fields.find(f => f.id === 'name' || f.label.toLowerCase().includes('name'));
    return nameField?.value || 'Marriage_Biodata';
  }, [sections]);

  // Total active non-empty fields across all sections
  const totalActiveFields = useMemo(() => {
    return sections.reduce((acc, sec) => acc + getVisibleFields(sec.fields).length, 0);
  }, [sections]);

  // Update Field Value
  const updateFieldValue = (sectionId: string, fieldId: string, value: string) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        fields: sec.fields.map(f => f.id === fieldId ? { ...f, value } : f)
      };
    }));
  };

  // Update Field Label
  const updateFieldLabel = (sectionId: string, fieldId: string, label: string) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        fields: sec.fields.map(f => f.id === fieldId ? { ...f, label } : f)
      };
    }));
  };

  // Move Field Up (Align Upar)
  const moveFieldUp = (sectionId: string, index: number) => {
    if (index === 0) return;
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      const newFields = [...sec.fields];
      const temp = newFields[index - 1];
      newFields[index - 1] = newFields[index];
      newFields[index] = temp;
      return { ...sec, fields: newFields };
    }));
  };

  // Move Field Down (Align Niche)
  const moveFieldDown = (sectionId: string, index: number) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      if (index >= sec.fields.length - 1) return sec;
      const newFields = [...sec.fields];
      const temp = newFields[index + 1];
      newFields[index + 1] = newFields[index];
      newFields[index] = temp;
      return { ...sec, fields: newFields };
    }));
  };

  // Add Field to ANY Section (sab me add field)
  const addFieldToSection = (sectionId: string) => {
    const newField: BiodataField = {
      id: `field-${Date.now()}`,
      label: 'New Detail',
      value: ''
    };
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        fields: [...sec.fields, newField]
      };
    }));
  };

  // Remove Field from Section
  const removeFieldFromSection = (sectionId: string, fieldId: string) => {
    setSections(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        fields: sec.fields.filter(f => f.id !== fieldId)
      };
    }));
  };

  // Upload photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 1-Click Print A4
  const handlePrint = () => {
    if (!previewRef.current) return;
    void printElementAsA4(previewRef.current, `${personName} - Biodata`);
  };

  // Direct High-Resolution A4 PDF Download
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const filename = `${personName.trim().replace(/\s+/g, '_')}_Biodata.pdf`;
      await downloadElementAsPdf(previewRef.current, filename, theme.page);
    } catch (err) {
      console.error('PDF export fallback failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // True Full-Page A4 Scaling Engine:
  // Calibrated so that on a 297mm A4 page, the biodata fills 95% - 98% of the height gracefully.
  // Eliminates blank voids and provides even, harmonious vertical distribution across sections.
  const density = useMemo(() => {
    if (fontScale === 'compact') {
      return {
        sheetPad: 'p-3.5 sm:p-4',
        innerPad: 'p-2.5 sm:p-3',
        sectionGap: 'space-y-1',
        labelFont: 'text-[11.5px] sm:text-[12px] font-bold text-slate-900 leading-snug',
        valFont: 'text-[11.5px] sm:text-[12px] font-bold text-slate-950 leading-snug',
        headFont: 'text-[11px] sm:text-[11.5px] font-black uppercase tracking-wider py-0.5 px-2.5',
        titleFont: 'text-xl sm:text-2xl font-black tracking-widest',
        invocationFont: 'text-[11px] font-bold tracking-wide',
        rowLine: 'py-[1px] min-h-[19px]',
        labelWidthPhoto: '130px',
        labelWidthFull: '165px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-1.5 py-0.5',
      };
    } else if (fontScale === 'medium') {
      return {
        sheetPad: 'p-3.5 sm:p-4.5',
        innerPad: 'p-3 sm:p-3.5',
        sectionGap: 'space-y-1.5',
        labelFont: 'text-[12px] sm:text-[12.5px] font-bold text-slate-900 leading-snug',
        valFont: 'text-[12px] sm:text-[12.5px] font-bold text-slate-950 leading-snug',
        headFont: 'text-xs sm:text-[12px] font-black uppercase tracking-wider py-1 px-3',
        titleFont: 'text-2xl sm:text-[25px] font-black tracking-widest',
        invocationFont: 'text-xs font-bold tracking-wide',
        rowLine: 'py-[1.5px] min-h-[22px]',
        labelWidthPhoto: '130px',
        labelWidthFull: '190px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-2 py-0.5',
      };
    } else if (fontScale === 'large') {
      return {
        sheetPad: 'p-4 sm:p-5',
        innerPad: 'p-3.5 sm:p-4',
        sectionGap: 'space-y-2',
        labelFont: 'text-[13px] sm:text-[13.5px] font-bold text-slate-900 leading-snug',
        valFont: 'text-[13px] sm:text-[13.5px] font-bold text-slate-950 leading-snug',
        headFont: 'text-xs sm:text-[13px] font-black uppercase tracking-wider py-1.5 px-3.5',
        titleFont: 'text-2xl sm:text-3xl font-black tracking-widest',
        invocationFont: 'text-xs sm:text-sm font-bold tracking-wide',
        rowLine: 'py-[2px] min-h-[24px]',
        labelWidthPhoto: '135px',
        labelWidthFull: '205px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-2.5 py-1',
      };
    }

    // Default: 'full' (True Full-Page A4 Smart Calibration based on field count)
    if (totalActiveFields > 34) {
      return {
        sheetPad: 'p-3 sm:p-3.5',
        innerPad: 'p-2.5 sm:p-3',
        sectionGap: 'space-y-1',
        labelFont: 'text-[11.5px] sm:text-[12px] font-bold text-slate-900 leading-snug',
        valFont: 'text-[11.5px] sm:text-[12px] font-bold text-slate-950 leading-snug',
        headFont: 'text-[11.5px] sm:text-[12px] font-black uppercase tracking-wider py-0.5 px-2.5',
        titleFont: 'text-xl sm:text-[22px] font-black tracking-widest',
        invocationFont: 'text-xs font-bold tracking-wide',
        rowLine: 'py-[0.5px] min-h-[19px]',
        labelWidthPhoto: '125px',
        labelWidthFull: '185px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-1 py-0.5',
      };
    } else if (totalActiveFields >= 25) {
      // 25 to 34 fields (Standard Groom / Bride data)
      return {
        sheetPad: 'p-3.5 sm:p-4',
        innerPad: 'p-3 sm:p-3.5',
        sectionGap: 'space-y-1.5',
        labelFont: 'text-[12.5px] sm:text-[13px] font-bold text-slate-900 leading-snug',
        valFont: 'text-[12.5px] sm:text-[13px] font-bold text-slate-950 leading-snug',
        headFont: 'text-xs sm:text-[12.5px] font-black uppercase tracking-wider py-1 px-3',
        titleFont: 'text-2xl sm:text-[25px] font-black tracking-widest',
        invocationFont: 'text-xs sm:text-sm font-bold tracking-wide',
        rowLine: 'py-[1.5px] min-h-[22px]',
        labelWidthPhoto: '130px',
        labelWidthFull: '195px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-1.5 py-0.5',
      };
    } else if (totalActiveFields >= 16) {
      // 16 to 24 fields
      return {
        sheetPad: 'p-4 sm:p-5',
        innerPad: 'p-3.5 sm:p-4',
        sectionGap: 'space-y-2',
        labelFont: 'text-[13px] sm:text-[13.5px] font-bold text-slate-900 leading-snug',
        valFont: 'text-[13px] sm:text-[13.5px] font-bold text-slate-950 leading-snug',
        headFont: 'text-xs sm:text-[13px] font-black uppercase tracking-wider py-1.5 px-3.5',
        titleFont: 'text-2xl sm:text-3xl font-black tracking-widest',
        invocationFont: 'text-xs sm:text-sm font-bold tracking-wide',
        rowLine: 'py-[2px] min-h-[25px]',
        labelWidthPhoto: '135px',
        labelWidthFull: '200px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-2 py-1',
      };
    } else {
      // < 16 fields
      return {
        sheetPad: 'p-5 sm:p-6',
        innerPad: 'p-4 sm:p-5',
        sectionGap: 'space-y-3',
        labelFont: 'text-sm font-bold text-slate-900 leading-snug',
        valFont: 'text-sm font-bold text-slate-950 leading-snug',
        headFont: 'text-sm font-black uppercase tracking-wider py-1.5 px-4',
        titleFont: 'text-3xl sm:text-4xl font-black tracking-widest',
        invocationFont: 'text-sm font-bold tracking-wide',
        rowLine: 'py-[3px] min-h-[28px]',
        labelWidthPhoto: '140px',
        labelWidthFull: '210px',
        middleClass: 'flex-1 flex flex-col justify-start space-y-2.5 py-1.5',
      };
    }
  }, [fontScale, totalActiveFields]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Banner */}
        <div className="px-5 py-3 bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 text-white flex items-center justify-between border-b border-rose-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Marriage Biodata Studio (English Edition)
                </h3>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase">
                  Full Page A4 Fill • Zero Blank Gaps
                </span>
              </div>
              <p className="text-xs text-rose-200">
                100% full-page A4 fill • Uniform straight colons • Move fields Up/Down • Zero empty gaps at bottom.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>1-Click Print A4</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'PDF Download'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-rose-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-slate-100">
          
          {/* Left Column: Form Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-3 overflow-y-auto max-h-[85vh] pr-1">
            
            {/* Quick Presets (Groom / Bride / Clear) */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-2.5 rounded-2xl border border-rose-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-900">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span>Quick Fill:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setSections(createGroomSections()); setFontScale('full'); }}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  👦 Groom Preset
                </button>
                <button
                  type="button"
                  onClick={() => { setSections(createBrideSections()); setFontScale('full'); }}
                  className="px-2.5 py-1 bg-white hover:bg-pink-100 text-pink-800 border border-pink-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  👧 Bride Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSections(prev => prev.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f, value: '' })) })));
                    setPhoto(null);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Clear all values"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Header & Photo Controls */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Top Header & Photo
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPhotoBox}
                      onChange={(e) => setShowPhotoBox(e.target.checked)}
                      className="accent-rose-600 rounded"
                    />
                    <span>Show Photo Frame</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Top Invocation / Blessing</label>
                  <select
                    value={invocation}
                    onChange={(e) => setInvocation(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    {INVOCATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Main Title</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    {TITLE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Sections with "Add Field", "Move Up/Down", and "Blank Auto-Hide" */}
            {sections.map((section) => (
              <div key={section.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                
                {/* Section Header with Add Field button */}
                <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      {section.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400">
                      ({section.fields.filter(f => f.value.trim()).length}/{section.fields.length} active)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => addFieldToSection(section.id)}
                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="Add new field in this section"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Field</span>
                  </button>
                </div>

                {/* Section Field List with Up/Down/Delete */}
                <div className="space-y-1.5">
                  {section.fields.map((field, idx) => (
                    <div 
                      key={field.id} 
                      className={`p-1.5 rounded-xl border transition-all ${
                        field.value.trim() 
                          ? 'bg-slate-50/90 border-slate-200' 
                          : 'bg-amber-50/40 border-dashed border-amber-200 opacity-75'
                      }`}
                    >
                      {/* Top Row: Label input + Up/Down/Delete buttons */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldLabel(section.id, field.id, e.target.value)}
                          className="px-1.5 py-0.5 text-[11px] font-bold bg-white border border-slate-200 rounded text-slate-700 focus:outline-hidden focus:border-indigo-400 w-[55%]"
                          placeholder="Field Label"
                        />

                        {/* Align Upar / Niche (Reorder) & Delete */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveFieldUp(section.id, idx)}
                            className="p-1 rounded bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Field Up (ऊपर करें)"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === section.fields.length - 1}
                            onClick={() => moveFieldDown(section.id, idx)}
                            className="p-1 rounded bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Field Down (नीचे करें)"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFieldFromSection(section.id, field.id)}
                            className="p-1 rounded bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Value input */}
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateFieldValue(section.id, field.id, e.target.value)}
                        placeholder="Leave blank to hide this field from print..."
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:border-rose-400"
                      />
                    </div>
                  ))}
                </div>

              </div>
            ))}

          </div>

          {/* Right Column: Live A4 Sheet Preview (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-2 overflow-hidden">
            
            {/* Top Toolbar: Template Style, Color, Font Scale */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
              
              {/* Template Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTemplate('royal')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    template === 'royal'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Royal Traditional Frame"
                >
                  👑 Royal Frame
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('sidebar')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    template === 'sidebar'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="2-Column Modern Layout"
                >
                  📋 2-Column
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('floral')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    template === 'floral'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Floral Curved Frame"
                >
                  🌸 Floral
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('classic')}
                  className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    template === 'classic'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Classic Sober Layout"
                >
                  ✨ Classic
                </button>
              </div>

              {/* Theme Color Palette */}
              <div className="flex items-center gap-1">
                {(Object.keys(THEMES) as ThemeColor[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setThemeColor(c)}
                    title={THEMES[c].name}
                    className={`w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer ${
                      themeColor === c ? 'ring-2 ring-rose-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: THEMES[c].primary }}
                  />
                ))}
              </div>

              {/* Page Fill / Font Scale */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 px-1">Page Fill:</span>
                {(['full', 'large', 'medium', 'compact'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFontScale(s)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      fontScale === s
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {s === 'full' ? '⚡ Auto Fit (A4)' : s === 'large' ? '🌟 Large' : s === 'medium' ? '📄 Medium' : '📑 Compact'}
                  </button>
                ))}
              </div>

            </div>

            {/* Live A4 Sheet Preview Container */}
            <div className="flex-1 bg-slate-300/80 p-2 sm:p-3 rounded-2xl overflow-y-auto max-h-[78vh] flex items-center justify-center">
              
              {/* ========================================================================= */}
              {/* TEMPLATE 1: 👑 ROYAL TRADITIONAL (Full Page A4 Fill, Zero Blank Gaps)     */}
              {/* ========================================================================= */}
              {template === 'royal' && (
                <div
                  id="marriage-biodata-print-area"
                  ref={previewRef}
                  className={`marriage-biodata-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-2xl text-slate-900 leading-snug flex flex-col ${density.sheetPad} overflow-hidden select-none relative`}
                  style={{ backgroundColor: theme.page }}
                >
                  <div 
                    className={`h-full border-[3px] ${density.innerPad} rounded-xs flex flex-col justify-between overflow-hidden relative`}
                    style={{ borderColor: theme.border }}
                  >
                    {/* Inner Accent Line */}
                    <div 
                      className="absolute inset-1 border pointer-events-none"
                      style={{ borderColor: theme.accent }}
                    />

                    {/* Corner Ornaments */}
                    <div className="absolute top-1.5 left-1.5 text-xs opacity-75 font-bold" style={{ color: theme.accent }}>卐</div>
                    <div className="absolute top-1.5 right-1.5 text-xs opacity-75 font-bold" style={{ color: theme.accent }}>卐</div>
                    <div className="absolute bottom-1.5 left-1.5 text-xs opacity-75 font-bold" style={{ color: theme.accent }}>卐</div>
                    <div className="absolute bottom-1.5 right-1.5 text-xs opacity-75 font-bold" style={{ color: theme.accent }}>卐</div>

                    {/* Top Header */}
                    <div className="text-center pb-2 mb-1.5 shrink-0 border-b relative z-10" style={{ borderColor: hexToRgba(theme.accent, 0.45) }}>
                      {invocation && invocation !== 'None' && (
                        <div className={density.invocationFont} style={{ color: theme.accent }}>
                          {invocation}
                        </div>
                      )}
                      <h1 
                        className={`${density.titleFont} font-black uppercase text-center mt-0.5 tracking-wider`}
                        style={{ color: theme.primary }}
                      >
                        {title}
                      </h1>
                      <div className="mx-auto mt-1 h-0.5 w-32 rounded-full" style={{ backgroundColor: theme.accent }} />
                    </div>

                    {/* Middle Content Flow: Distribute sections gracefully to fill A4 sheet */}
                    <div className={`${density.middleClass} relative z-10`}>
                      
                      {sections.map((section, sIdx) => {
                        const visibleFields = getVisibleFields(section.fields);
                        // If no fields in this section have a value, omit the section completely!
                        if (visibleFields.length === 0) return null;

                        const isFirst = sIdx === 0;

                        return (
                          <div key={section.id}>
                            {/* Section Banner */}
                            <div 
                              className={`${density.headFont} font-black rounded-xs mb-1.5 flex items-center gap-2`}
                              style={{ backgroundColor: theme.bannerBg }}
                            >
                              <div className="w-1.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: theme.primary }} />
                              <span className="tracking-wider uppercase" style={{ color: theme.primary }}>{section.title}</span>
                            </div>

                            {/* Section Content */}
                            {isFirst && showPhotoBox ? (
                              /* Personal Details with Photo side-by-side */
                              <div className="flex gap-2.5 items-start">
                                <div className="flex-1 space-y-0">
                                  {visibleFields.map(field => {
                                    const isNameField = field.id === 'name' || field.label.toLowerCase().includes('name');
                                    return (
                                      <React.Fragment key={field.id}>
                                        <div className={`flex items-baseline ${density.rowLine}`}>
                                          <div className={`${density.labelFont} shrink-0 text-slate-900 flex justify-between pr-2`} style={{ width: density.labelWidthPhoto }}>
                                            <span>{field.label}</span>
                                            <span className="font-bold">:</span>
                                          </div>
                                          <div 
                                            className={`${density.valFont} min-w-0 flex-1 break-words pl-1.5 ${isNameField ? 'text-[13px] sm:text-[14px] font-black uppercase tracking-wider' : 'font-bold'}`} 
                                            style={isNameField ? { color: theme.primary } : undefined}
                                          >
                                            {field.value}
                                          </div>
                                        </div>
                                        {isNameField && (
                                          <div className="w-full my-1 border-b" style={{ borderColor: hexToRgba(theme.accent, 0.45) }} />
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>

                                {/* Passport Photo Frame */}
                                <div 
                                  className="w-24 h-30 sm:w-26 sm:h-34 shrink-0 border-2 border-dashed rounded-md bg-white p-1 shadow-xs flex flex-col items-center justify-center text-center overflow-hidden"
                                  style={{ borderColor: theme.accent }}
                                >
                                  {photo ? (
                                    <img src={photo} alt="Photo" className="w-full h-full object-cover rounded-xs" />
                                  ) : (
                                    <div className="space-y-1 text-slate-400 p-1.5">
                                      <Camera className="w-6 h-6 mx-auto" width={24} height={24} style={{ color: theme.accent }} />
                                      <span className="text-[9.5px] font-bold block leading-tight tracking-wider uppercase" style={{ color: theme.textDark }}>
                                        Passport Photo
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Uniform Single-Column rows with perfectly straight colons! */
                              <div className="space-y-0">
                                {visibleFields.map(field => {
                                  const isNameField = isFirst && (field.id === 'name' || field.label.toLowerCase().includes('name'));
                                  return (
                                    <React.Fragment key={field.id}>
                                      <div className={`flex items-baseline ${density.rowLine}`}>
                                        <div className={`${density.labelFont} shrink-0 text-slate-900 flex justify-between pr-3`} style={{ width: density.labelWidthFull }}>
                                          <span>{field.label}</span>
                                          <span className="font-bold">:</span>
                                        </div>
                                        <div 
                                          className={`${density.valFont} min-w-0 flex-1 break-words pl-2 ${isNameField ? 'text-[13.5px] sm:text-[14.5px] font-black uppercase tracking-wider' : 'font-bold'}`} 
                                          style={isNameField ? { color: theme.primary } : undefined}
                                        >
                                          {field.value}
                                        </div>
                                      </div>
                                      {isNameField && (
                                        <div className="w-full my-1 border-b" style={{ borderColor: hexToRgba(theme.accent, 0.45) }} />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}

                    </div>

                    {/* Bottom Auspicious Footer - Sits naturally below content with elegant margin */}
                    <div className="mt-auto pt-2 border-t text-center shrink-0 relative z-10" style={{ borderColor: hexToRgba(theme.accent, 0.4) }}>
                      <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase" style={{ color: theme.primary }}>
                        ॥ SHUBH MANGALAM ॥
                      </span>
                    </div>

                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE 2: 📋 2-COLUMN MODERN LAYOUT (100% Filled, Zero Blank Voids)     */}
              {/* ========================================================================= */}
              {template === 'sidebar' && (
                <div
                  id="marriage-biodata-print-area"
                  ref={previewRef}
                  className="marriage-biodata-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-2xl text-slate-900 leading-snug flex overflow-hidden border border-slate-400 select-none relative"
                  style={{ backgroundColor: theme.page }}
                >
                  {/* Left Column (36%) */}
                  <div 
                    className="w-[36%] border-r p-4 sm:p-5 flex flex-col justify-between shrink-0 space-y-3"
                    style={{ backgroundColor: theme.bannerBg, borderColor: hexToRgba(theme.accent, 0.3) }}
                  >
                    <div className="space-y-3">
                      {/* Photo */}
                      {showPhotoBox && (
                        <div 
                          className="w-24 h-28 mx-auto overflow-hidden rounded-md border-2 bg-white shadow-xs flex items-center justify-center"
                          style={{ borderColor: theme.primary }}
                        >
                          {photo ? (
                            <img src={photo} alt="Photo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2 text-slate-400">
                              <Camera className="w-5 h-5 mx-auto mb-0.5" style={{ color: theme.accent }} />
                              <span className="text-[9px] font-bold block" style={{ color: theme.textDark }}>Passport Photo</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sections 0 & 1 on the left side: Personal & Kundali */}
                      {sections.slice(0, 2).map(sec => {
                        const visibleFields = getVisibleFields(sec.fields);
                        if (visibleFields.length === 0) return null;

                        return (
                          <div key={sec.id} className="space-y-1">
                            <h4 className="text-[11.5px] font-black uppercase border-b pb-0.5" style={{ color: theme.primary, borderColor: theme.accent }}>
                              {sec.title}
                            </h4>
                            <div className="text-[11.5px] space-y-1 pt-0.5" style={{ color: theme.textDark }}>
                              {visibleFields.map(f => {
                                const isName = sec.id === 'personal' && (f.id === 'name' || f.label.toLowerCase().includes('name'));
                                return (
                                  <React.Fragment key={f.id}>
                                    <p className="break-words font-bold">
                                      <span className="font-extrabold">{f.label}:</span>{' '}
                                      <span style={isName ? { color: theme.primary, fontWeight: 900 } : undefined}>{f.value}</span>
                                    </p>
                                    {isName && (
                                      <div className="w-full my-1 border-b" style={{ borderColor: hexToRgba(theme.accent, 0.45) }} />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Contact on the left bottom */}
                      {(() => {
                        const contactSec = sections.find(s => s.id === 'contact');
                        if (!contactSec) return null;
                        const visibleFields = getVisibleFields(contactSec.fields);
                        if (visibleFields.length === 0) return null;

                        return (
                          <div className="space-y-1">
                            <h4 className="text-[11.5px] font-black uppercase border-b pb-0.5" style={{ color: theme.primary, borderColor: theme.accent }}>
                              {contactSec.title}
                            </h4>
                            <div className="text-[11.5px] space-y-1 pt-0.5 font-bold" style={{ color: theme.textDark }}>
                              {visibleFields.map(f => (
                                <p key={f.id} className="break-words">
                                  <span className="font-extrabold">{f.label}:</span> {f.value}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    </div>

                    <div className="text-center text-[10.5px] font-bold opacity-80" style={{ color: theme.primary }}>
                      ॥ SHUBH VIVAH ॥
                    </div>
                  </div>

                  {/* Right Column (64%) */}
                  <div className="w-[64%] p-5 sm:p-6 flex flex-col justify-between space-y-3.5 overflow-hidden">
                    
                    {/* Header Banner */}
                    <div className="border-b-2 pb-2" style={{ borderColor: theme.accent }}>
                      {invocation && invocation !== 'None' && (
                        <p className="text-xs font-bold" style={{ color: theme.accent }}>{invocation}</p>
                      )}
                      <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: theme.primary }}>
                        {personName}
                      </h2>
                      <p className="text-xs font-bold text-slate-700">{title}</p>
                    </div>

                    {/* Remaining Sections: Education & Family */}
                    <div className="space-y-3">
                      {sections.slice(2, 4).map(sec => {
                        const visibleFields = getVisibleFields(sec.fields);
                        if (visibleFields.length === 0) return null;

                        return (
                          <div key={sec.id} className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: theme.primary }}>
                              {sec.title}
                            </h4>
                            <div className="space-y-1 text-xs text-slate-900">
                              {visibleFields.map(f => (
                                <div key={f.id} className="grid grid-cols-[36%_1fr] gap-1">
                                  <span className="font-extrabold text-slate-800">{f.label} :</span>
                                  <span className="font-bold text-slate-950">{f.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Blessing Footer */}
                    <div className="border-t pt-2 text-center text-xs font-bold" style={{ borderColor: hexToRgba(theme.accent, 0.4), color: theme.primary }}>
                      ॥ SHUBH MANGALAM ॥
                    </div>

                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE 3: 🌸 FLORAL & 4: ✨ CLASSIC                                     */}
              {/* ========================================================================= */}
              {(template === 'floral' || template === 'classic') && (
                <div
                  id="marriage-biodata-print-area"
                  ref={previewRef}
                  className={`marriage-biodata-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-2xl text-slate-900 leading-snug flex flex-col p-4 sm:p-5 overflow-hidden select-none relative`}
                  style={{ backgroundColor: theme.page }}
                >
                  <div 
                    className={`h-full p-4 sm:p-5 flex flex-col justify-between overflow-hidden ${
                      template === 'floral'
                        ? 'border-4 border-dashed rounded-2xl'
                        : 'border-2 border-slate-900'
                    }`}
                    style={{ borderColor: template === 'floral' ? theme.border : theme.primary }}
                  >
                    {/* Header */}
                    <div className="text-center pb-1.5 border-b-2" style={{ borderColor: theme.accent }}>
                      {invocation && invocation !== 'None' && (
                        <p className="text-xs font-bold" style={{ color: theme.accent }}>{invocation}</p>
                      )}
                      <h1 className="text-xl sm:text-2xl font-black tracking-widest uppercase" style={{ color: theme.primary }}>
                        {title}
                      </h1>
                    </div>

                    {/* Content Flow */}
                    <div className={`${density.middleClass} relative z-10`}>
                      {sections.map((sec, sIdx) => {
                        const visibleFields = getVisibleFields(sec.fields);
                        if (visibleFields.length === 0) return null;

                        const isFirst = sIdx === 0;

                        return (
                          <div key={sec.id} className="border-t pt-1.5 space-y-1 first:border-t-0 first:pt-0" style={{ borderColor: hexToRgba(theme.accent, 0.25) }}>
                            <h4 className={`${density.headFont} font-black uppercase`} style={{ color: theme.primary }}>
                              {sec.title}
                            </h4>

                            {isFirst && showPhotoBox ? (
                              <div className="flex justify-between items-start gap-2.5">
                                <div className="flex-1 space-y-0">
                                  {visibleFields.map(f => (
                                    <div key={f.id} className={`flex items-baseline ${density.rowLine}`}>
                                      <div className={`${density.labelFont} font-bold text-slate-700 shrink-0 flex justify-between pr-2`} style={{ width: density.labelWidthPhoto }}>
                                        <span>{f.label}</span>
                                        <span>:</span>
                                      </div>
                                      <div className={`${density.valFont} font-semibold text-slate-900 min-w-0 flex-1 break-words pl-1.5`}>
                                        {f.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="w-22 h-26 border-2 border-dashed rounded-md bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden" style={{ borderColor: theme.accent }}>
                                  {photo ? <img src={photo} alt="Photo" className="w-full h-full object-cover" /> : <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Photo</span>}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0">
                                {visibleFields.map(f => (
                                  <div key={f.id} className={`flex items-baseline ${density.rowLine}`}>
                                    <div className={`${density.labelFont} font-bold text-slate-700 shrink-0 flex justify-between pr-3`} style={{ width: density.labelWidthFull }}>
                                      <span>{f.label}</span>
                                      <span>:</span>
                                    </div>
                                    <div className={`${density.valFont} font-semibold text-slate-900 min-w-0 flex-1 break-words pl-2`}>
                                      {f.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="border-t pt-2 text-center text-xs font-bold shrink-0 relative z-10" style={{ borderColor: theme.accent, color: theme.primary }}>
                      ॥ SHUBH MANGALAM ॥
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
