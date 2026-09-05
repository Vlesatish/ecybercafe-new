import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  Grid, 
  User as UserIcon, 
  Sparkles, 
  Flame, 
  ExternalLink, 
  Printer, 
  Scissors, 
  FileText, 
  QrCode, 
  Briefcase, 
  GraduationCap, 
  Image as ImageIcon, 
  FolderPlus, 
  Layers, 
  CreditCard, 
  Lock, 
  CheckCircle2, 
  Camera, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Fingerprint,
  HeartPulse,
  Vote,
  Car,
  Wheat,
  X,
  FileCheck,
  Building2,
  Phone,
  Flame as FlameIcon,
  Award,
  Zap,
  HelpCircle,
  MessageCircle,
  Share2,
  BookOpen,
  Landmark,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  Check,
  Download,
  Eye
} from 'lucide-react';
import { PortalSubItem, PublicGovService } from '../types';
import { PORTAL_GOV_SERVICES_DATA } from '../data/portalServicesData';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';

interface LandingPageViewProps {
  onOpenLoginModal: (mode?: 'LOGIN' | 'SIGNUP') => void;
  onOpenCropModal?: () => void;
  onOpenPanResizer?: () => void;
  onOpenPassportPhoto?: () => void;
  onOpenIDCardPrint?: () => void;
  onOpenPdfPageManager?: () => void;
  onOpenJpgToPdf?: () => void;
  onOpenResumeMaker?: () => void;
  onOpenMarriageBiodata?: () => void;
  onOpenPaymentQR?: () => void;
  onOpenCompressorModal?: () => void;
}

interface ServiceItem {
  id: string;
  title: string;
  hindiTitle?: string;
  category: 'essential' | 'creative' | 'pdf_tools' | 'card_print' | 'portal_service';
  badge?: 'NEW' | 'HOT' | 'POPULAR';
  badgeColor?: 'green' | 'red' | 'blue';
  iconType: string;
  description?: string;
  actionUrl?: string;
  actionType?: 'login' | 'external' | 'tool_crop' | 'tool_resizer' | 'tool_pdf' | 'info_modal' | 'portal_expand' | 'tool_passport' | 'tool_id_card' | 'tool_resume' | 'tool_biodata' | 'tool_payment_qr' | 'tool_compressor' | 'tool_pdf_manager' | 'tool_jpg_to_pdf';
  isLocked?: boolean;
  subItems?: PortalSubItem[];
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenLoginModal,
  onOpenCropModal,
  onOpenPanResizer,
  onOpenPassportPhoto,
  onOpenIDCardPrint,
  onOpenPdfPageManager,
  onOpenJpgToPdf,
  onOpenResumeMaker,
  onOpenMarriageBiodata,
  onOpenPaymentQR,
  onOpenCompressorModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [portalSearchQuery, setPortalSearchQuery] = useState('');
  const [gridCols, setGridCols] = useState(6);
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'essential' | 'creative' | 'pdf_tools' | 'card_print' | 'portal_service'>('ALL');
  const [selectedInfoModal, setSelectedInfoModal] = useState<ServiceItem | null>(null);
  const [dynamicPortals, setDynamicPortals] = useState<PublicGovService[]>([]);
  const [expandedPortalItem, setExpandedPortalItem] = useState<ServiceItem | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<{ url: string; title: string; filename?: string } | null>(null);
  const [copiedLinkUrl, setCopiedLinkUrl] = useState<string | null>(null);

  // Responsive column count for portal grid rows
  useEffect(() => {
    const updateCols = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) setGridCols(6);
        else if (window.innerWidth >= 768) setGridCols(4);
        else if (window.innerWidth >= 640) setGridCols(3);
        else setGridCols(2);
      }
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const copyToClipboard = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedLinkUrl(url);
    setTimeout(() => setCopiedLinkUrl(null), 2500);
  };

  // Fetch dynamic public government portal services managed from Admin Dashboard
  useEffect(() => {
    const loadPortals = () => {
      fetch('/api/public-services')
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.services || []);
          if (Array.isArray(list) && list.length > 0) {
            setDynamicPortals(list);
          }
        })
        .catch(err => console.error('Failed to fetch public services for landing page:', err));
    };

    loadPortals();

    const handleRealtime = (e: any) => {
      if (e.detail?.type === 'PUBLIC_SERVICES_UPDATED') {
        if (e.detail.data?.services) {
          setDynamicPortals(e.detail.data.services);
        } else {
          loadPortals();
        }
      }
    };
    window.addEventListener('app_realtime_event', handleRealtime);
    window.addEventListener('app-realtime-event', handleRealtime);
    return () => {
      window.removeEventListener('app_realtime_event', handleRealtime);
      window.removeEventListener('app-realtime-event', handleRealtime);
    };
  }, []);

  // 1. Essential & Services
  const essentialServices: ServiceItem[] = [
    {
      id: 'latest_jobs',
      title: 'Latest Jobs',
      hindiTitle: 'सरकारी नौकरियां और एडमिट कार्ड',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'jobs',
      description: 'Find real-time central & state government job vacancies, admit cards and results.',
      actionUrl: 'https://www.sarkariresult.com',
      actionType: 'external'
    },
    {
      id: 'mock_test',
      title: 'Mock Test',
      hindiTitle: 'ऑनलाइन मॉक टेस्ट व अभ्यास',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'mock_test',
      description: 'Practice online mock tests for SSC, Railway, Banking, Police & State exams.',
      actionType: 'login'
    },
    {
      id: 'id_card_print',
      title: 'ID Card Print',
      hindiTitle: 'पीवीसी / एचडी आईडी कार्ड प्रिंट',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'id_print',
      description: 'Print smart PVC ID cards (Aadhaar, Voter, Ayushman, E-Shram) in high-definition.',
      actionType: 'tool_id_card'
    },
    {
      id: 'pvc_auto_crop',
      title: 'PVC Auto Crop',
      hindiTitle: 'एक क्लिक में पीवीसी कार्ड क्रॉप',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'pvc_crop',
      description: 'Auto detect and crop Aadhaar/Ayushman/E-Shram cards directly for instant PVC printing.',
      actionType: 'tool_id_card'
    },
    {
      id: 'auto_print',
      title: 'Auto Print',
      hindiTitle: 'स्मार्ट ऑटो प्रिंट इंजन',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'auto_print',
      description: 'Automated 1-click batch printing on 4x6 / A4 photo sheet with zero configuration.',
      actionType: 'tool_id_card'
    },
    {
      id: 'passport_photo',
      title: 'Passport Photo',
      hindiTitle: 'पासपोर्ट फोटो मेकर (8/12/32 कॉपियां)',
      category: 'essential',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'passport',
      description: 'Generate standard 3.5x4.5cm passport size photos with background change & suit overlay.',
      actionType: 'tool_passport'
    },
    {
      id: 'photo_crop_resize',
      title: 'Photo Crop And Resize',
      hindiTitle: 'फोटो क्रॉप व रीसाइज़र',
      category: 'essential',
      iconType: 'photo_crop',
      description: 'Crop and compress photo & signature to exact KB/DPI for govt exam forms.',
      actionType: 'tool_crop'
    },
    {
      id: 'resume_cv',
      title: 'Resume/CV',
      hindiTitle: 'प्रोफेशनल बायोडाटा / सीवी मेकर',
      category: 'essential',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'resume',
      description: 'Create ready-to-print professional resume, bio-data & job CV in under 2 minutes.',
      actionType: 'tool_resume'
    },
    {
      id: 'marriage_biodata',
      title: 'Marriage Biodata Maker',
      hindiTitle: 'विवाह बायोडाटा मेकर',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'red',
      iconType: 'marriage',
      description: 'Photo, personal, family और contact details के साथ सुंदर Hindi/English marriage biodata PDF बनाएँ।',
      actionType: 'tool_biodata'
    },
    {
      id: 'new_service_post',
      title: 'New Service Post',
      hindiTitle: 'नयी सेवा आवेदन करें',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'service_post',
      description: 'Submit customer applications for 160+ Bihar and Central citizen services.',
      actionType: 'login'
    },
    {
      id: 'document_album',
      title: 'Document Album',
      hindiTitle: 'कस्टमर डॉक्यूमेंट सेफ वॉल्ट',
      category: 'essential',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'doc_album',
      description: 'Secure digital cloud repository to store, search and organize customer documents.',
      actionType: 'login'
    },
    {
      id: 'nsdl_paam_id',
      title: 'NSDL PAAM ID',
      hindiTitle: 'ऑफिशियल NSDL पैन आईडी एजेंट',
      category: 'essential',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'nsdl_id',
      description: 'Get authorized NSDL Branch ID / PAAM ID for instant biometric PAN card generation.',
      actionType: 'login'
    },
    {
      id: 'payment_locked_qr',
      title: 'Payment Locked QR',
      hindiTitle: 'कस्टमर पेमेंट लॉक्ड क्यूआर',
      category: 'essential',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'qr_locked',
      description: 'Generate dynamic customer payment QR code with fixed billing amount.',
      actionType: 'tool_payment_qr'
    }
  ];

  // 2. Creative Design Studio
  const creativeServices: ServiceItem[] = [
    {
      id: 'pro_resume_maker',
      title: 'Pro Resume Maker',
      hindiTitle: 'प्रोफेशनल बायोडाटा मेकर',
      category: 'creative',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'resume_maker',
      description: 'Modern, high-converting resume templates for private & government jobs.',
      actionType: 'tool_resume'
    },
    {
      id: 'pro_id_maker',
      title: 'Pro ID Maker',
      hindiTitle: 'प्रो आईडी कार्ड डिजाइनर',
      category: 'creative',
      iconType: 'id_design',
      description: 'Custom ID card designer for schools, colleges, security guards & shops.',
      actionType: 'tool_id_card'
    },
    {
      id: 'pro_poster_maker',
      title: 'Pro Poster Maker',
      hindiTitle: 'दुकान व त्योहार पोस्टर मेकर',
      category: 'creative',
      iconType: 'poster_maker',
      description: 'Create eye-catching shop offers, festival greetings, and election banners.',
      actionType: 'login'
    },
    {
      id: 'application_maker',
      title: 'Application Maker',
      hindiTitle: 'सरकारी आवेदन पत्र / प्रार्थना पत्र',
      category: 'creative',
      iconType: 'application_maker',
      description: 'Ready-made Hindi/English letter formats for DM, SP, Bank Manager, BDO & Electricity Board.',
      actionType: 'login'
    },
    {
      id: 'shop_promotion_maker',
      title: 'Shop Promotion Maker',
      hindiTitle: 'दुकान प्रचार बैनर व फ्लेक्स',
      category: 'creative',
      iconType: 'shop_promo',
      description: 'Promotional WhatsApp status, visiting card & shop rate list flyer maker.',
      actionType: 'login'
    }
  ];

  // 3. Smart PDF & Image Tools
  const pdfTools: ServiceItem[] = [
    {
      id: 'pdf_page_manager',
      title: 'PDF Page Manager',
      hindiTitle: 'पीडीएफ पेज अरेंज व हटाएं',
      category: 'pdf_tools',
      badge: 'NEW',
      badgeColor: 'green',
      iconType: 'layers',
      description: 'Upload PDF, rearrange pages with drag & drop, remove unwanted pages, rotate orientations, and download.',
      actionType: 'tool_pdf_manager'
    },
    {
      id: 'jpg_to_pdf',
      title: 'JPG To PDF & Combiner',
      hindiTitle: 'फोटो व पीडीएफ को एक पीडीएफ बनाएं (JPG2PDF)',
      category: 'pdf_tools',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'jpg_to_pdf',
      description: 'Upload multiple JPG, PNG, WebP images & PDFs, drag to arrange serial order, and download combined PDF.',
      actionType: 'tool_jpg_to_pdf'
    },
    {
      id: 'pdf_to_jpg',
      title: 'PDF To JPG',
      hindiTitle: 'पीडीएफ को फोटो में बदलें',
      category: 'pdf_tools',
      iconType: 'pdf_to_jpg',
      description: 'Extract high-resolution images from any PDF file instantly.',
      actionType: 'tool_compressor'
    },
    {
      id: 'png_to_pdf',
      title: 'PNG To PDF',
      hindiTitle: 'पीएनजी इमेज से पीडीएफ बनाएं',
      category: 'pdf_tools',
      iconType: 'png_to_pdf',
      description: 'Convert transparent PNG images into high clarity PDF pages.',
      actionType: 'tool_jpg_to_pdf'
    },
    {
      id: 'png_to_jpg',
      title: 'PNG To JPG',
      hindiTitle: 'पीएनजी से जेपीजी कन्वर्टर',
      category: 'pdf_tools',
      iconType: 'png_to_jpg',
      description: 'Fast PNG to JPG converter with white background padding.',
      actionType: 'tool_crop'
    },
    {
      id: 'delete_pdf_page',
      title: 'Delete PDF Page',
      hindiTitle: 'पीडीएफ से पेज हटाएं',
      category: 'pdf_tools',
      iconType: 'delete_pdf',
      description: 'Remove unwanted pages or blank sheets from PDF files.',
      actionType: 'tool_pdf_manager'
    },
    {
      id: 'merge_pdf',
      title: 'Merge PDF & Images',
      hindiTitle: 'पीडीएफ और फोटो को जोड़ें',
      category: 'pdf_tools',
      badge: 'POPULAR',
      badgeColor: 'blue',
      iconType: 'merge_pdf',
      description: 'Combine multiple PDF files & images into one single organized PDF file with drag and drop.',
      actionType: 'tool_jpg_to_pdf'
    }
  ];

  // 4. Card Printing Services
  const cardPrintServices: ServiceItem[] = [
    {
      id: 'unique_id_print',
      title: 'Unique ID Card Print',
      hindiTitle: 'यूनिक आईडी कार्ड प्रिंटिंग',
      category: 'card_print',
      badge: 'HOT',
      badgeColor: 'red',
      iconType: 'aadhaar_card',
      description: 'High definition thermal / inkjet PVC printing format for Unique National Identity Cards.',
      actionType: 'tool_id_card'
    },
    {
      id: 'election_card_print',
      title: 'Election Card Print',
      hindiTitle: 'वोटर कार्ड एचडी प्रिंट',
      category: 'card_print',
      iconType: 'voter_card',
      description: 'Print smart Election EPIC Card with barcode and high resolution photo.',
      actionType: 'tool_id_card'
    },
    {
      id: 'health_plan_card_print',
      title: 'Health Plan Card Print',
      hindiTitle: 'आयुष्मान भारत हेल्थ कार्ड प्रिंट',
      category: 'card_print',
      iconType: 'ayushman_card',
      description: 'Print official PMJAY Golden Card with full saturation and crisp QR code.',
      actionType: 'tool_id_card'
    },
    {
      id: 'tax_id_card_print',
      title: 'Tax Id Card Print',
      hindiTitle: 'पैन कार्ड प्रिंटिंग सर्विस',
      category: 'card_print',
      iconType: 'pan_card',
      description: 'UTI & NSDL standard PAN card formatting with proper 85.6mm x 54mm dimensions.',
      actionType: 'tool_id_card'
    },
    {
      id: 'driving_permit_print',
      title: 'Driving Permit Print',
      hindiTitle: 'ड्राइविंग लाइसेंस प्रिंट',
      category: 'card_print',
      iconType: 'dl_card',
      description: 'Print Sarathi Driving Licence & Learner Licence in durable PVC format.',
      actionType: 'tool_id_card'
    },
    {
      id: 'school_college_id',
      title: 'School/College ID',
      hindiTitle: 'स्कूल / कॉलेज छात्र आईडी कार्ड',
      category: 'card_print',
      iconType: 'school_card',
      description: 'Standard student & employee ID card formatting for direct PVC tray printing.',
      actionType: 'tool_id_card'
    },
    {
      id: 'food_subsidy_card_print',
      title: 'Food Subsidy Card Print',
      hindiTitle: 'राशन कार्ड / खाद्य सुरक्षा कार्ड',
      category: 'card_print',
      iconType: 'ration_card',
      description: 'Print digital NFSA Ration Card & family member slip on photo paper or PVC.',
      actionType: 'login',
      isLocked: true
    }
  ];

  // 5. Portal Services (All 42+ direct Government e-Governance & Public Portals from pages 2, 3, 4)
  const portalServices: ServiceItem[] = [
    {
      id: 'census_india',
      title: 'Census Of India (भारत की जनगणना)',
      category: 'portal_service',
      iconType: 'census',
      actionUrl: 'https://censusindia.gov.in/',
      actionType: 'portal_expand',
      subItems: [
        {
          id: 'sub_c1',
          title: 'Self Enumeration Online',
          url: 'https://censusindia.gov.in/census.website/',
          type: 'LINK'
        },
        {
          id: 'sub_c2',
          title: 'State Timeline',
          url: 'https://censusindia.gov.in/nada/index.php/catalog',
          type: 'PDF'
        },
        {
          id: 'sub_c3',
          title: 'Question',
          url: 'https://censusindia.gov.in/census.website/node/364',
          type: 'PDF'
        }
      ]
    },
    {
      id: 'aadhaar_beta',
      title: 'Aadhar Beta Service',
      category: 'portal_service',
      iconType: 'aadhaar',
      actionUrl: 'https://myaadhaar.uidai.gov.in/',
      actionType: 'portal_expand',
      subItems: [
        {
          id: 'sub_ab1',
          title: 'MyAadhaar Beta Dashboard',
          url: 'https://myaadhaar.uidai.gov.in/',
          type: 'LINK'
        },
        {
          id: 'sub_ab2',
          title: 'Document Update Guidelines',
          url: 'https://uidai.gov.in/images/guidelines_for_address_update.pdf',
          type: 'PDF'
        }
      ]
    },
    {
      id: 'aadhaar_info',
      title: 'Aadhaar Information (UIDAI Link)',
      category: 'portal_service',
      iconType: 'aadhaar',
      actionUrl: 'https://uidai.gov.in/',
      actionType: 'portal_expand',
      subItems: [
        {
          id: 'sub_ai1',
          title: 'UIDAI Official Portal',
          url: 'https://uidai.gov.in/',
          type: 'LINK'
        },
        {
          id: 'sub_ai2',
          title: 'Verify Aadhaar / Mobile Link',
          url: 'https://myaadhaar.uidai.gov.in/verify-email-mobile',
          type: 'LINK'
        },
        {
          id: 'sub_ai3',
          title: 'Order PVC Card Direct',
          url: 'https://myaadhaar.uidai.gov.in/genricPVC',
          type: 'LINK'
        }
      ]
    },
    {
      id: 'pan_card_service',
      title: 'PAN Card Service',
      category: 'portal_service',
      iconType: 'pan',
      actionUrl: 'https://eportal.incometax.gov.in/',
      actionType: 'portal_expand',
      subItems: [
        {
          id: 'sub_pan1',
          title: 'Instant e-PAN (Income Tax)',
          url: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/instant-e-pan',
          type: 'LINK'
        },
        {
          id: 'sub_pan2',
          title: 'NSDL PAN Application',
          url: 'https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html',
          type: 'LINK'
        },
        {
          id: 'sub_pan3',
          title: 'UTIITSL Track Application',
          url: 'https://www.trackpan.utiitsl.com/PANONLINE_TRACK/trackApp',
          type: 'LINK'
        },
        {
          id: 'sub_pan4',
          title: 'PAN Form 49A Guidelines',
          url: 'https://incometaxindia.gov.in/forms/income-tax%20rules/103120000000007849.pdf',
          type: 'PDF'
        }
      ]
    },
    {
      id: 'voter_id_correction',
      title: 'Voter ID Correction & Status (NVSP)',
      category: 'portal_service',
      iconType: 'voter',
      actionUrl: 'https://voters.eci.gov.in/',
      actionType: 'portal_expand',
      subItems: [
        {
          id: 'sub_v1',
          title: 'ECI Voters Portal',
          url: 'https://voters.eci.gov.in/',
          type: 'LINK'
        },
        {
          id: 'sub_v2',
          title: 'Search in Electoral Roll',
          url: 'https://electoralsearch.eci.gov.in/',
          type: 'LINK'
        },
        {
          id: 'sub_v3',
          title: 'Form 6 / 8 Application Guide',
          url: 'https://voters.eci.gov.in/assets/guidelines/Form6_Guidelines.pdf',
          type: 'PDF'
        }
      ]
    },
    {
      id: 'ayushman_bharat',
      title: 'Ayushman Bharat (PM-JAY)',
      category: 'portal_service',
      iconType: 'health',
      actionUrl: 'https://beneficiary.nha.gov.in/',
      actionType: 'portal_expand',
      subItems: [
        {
          id: 'sub_ay1',
          title: 'Beneficiary NHA Portal',
          url: 'https://beneficiary.nha.gov.in/',
          type: 'LINK'
        },
        {
          id: 'sub_ay2',
          title: 'Check Scheme Eligibility',
          url: 'https://mera.pmjay.gov.in/search/login',
          type: 'LINK'
        },
        {
          id: 'sub_ay3',
          title: 'Empanelled Hospital List',
          url: 'https://hospitals.pmjay.gov.in/Search/empnlValData.htm',
          type: 'PDF'
        }
      ]
    },
    {
      id: 'driving_licence',
      title: 'Driving Licence Service',
      category: 'portal_service',
      iconType: 'transport',
      actionUrl: 'https://parivahan.gov.in/parivahan//en/content/driving-licence-0',
      actionType: 'external'
    },
    {
      id: 'rc_service',
      title: 'RC Service (Registration Certificate)',
      category: 'portal_service',
      iconType: 'transport',
      actionUrl: 'https://vahan.parivahan.gov.in/vahanservice/',
      actionType: 'external'
    },
    {
      id: 'vehicle_service',
      title: 'Vehicle Service',
      category: 'portal_service',
      iconType: 'transport',
      actionUrl: 'https://parivahan.gov.in/',
      actionType: 'external'
    },
    {
      id: 'birth_death_cert',
      title: 'Birth & Death Certificate',
      category: 'portal_service',
      iconType: 'certificate',
      actionUrl: 'https://crsorgi.gov.in/web/index.php/auth/login',
      actionType: 'external'
    },
    {
      id: 'e_challan',
      title: 'E-Challan',
      category: 'portal_service',
      iconType: 'money',
      actionUrl: 'https://echallan.parivahan.gov.in/',
      actionType: 'external'
    },
    {
      id: 'e_shram',
      title: 'E-Shram Card',
      category: 'portal_service',
      iconType: 'shram',
      actionUrl: 'https://eshram.gov.in/',
      actionType: 'external'
    },
    {
      id: 'apaar_id',
      title: 'APAAR ID Card',
      category: 'portal_service',
      iconType: 'student',
      actionUrl: 'https://apaar.education.gov.in/',
      actionType: 'external'
    },
    {
      id: 'abha_card',
      title: 'ABHA Card (Ayushman Bharat Health Account)',
      category: 'portal_service',
      iconType: 'health',
      actionUrl: 'https://abha.abdm.gov.in/',
      actionType: 'external'
    },
    {
      id: 'pmfby',
      title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      category: 'portal_service',
      iconType: 'farmer',
      actionUrl: 'https://pmfby.gov.in/',
      actionType: 'external'
    },
    {
      id: 'pmay_gramin',
      title: 'PMAY-Gramin (Pradhan Mantri Awas Yojana - Rural)',
      category: 'portal_service',
      iconType: 'house',
      actionUrl: 'https://pmayg.nic.in/',
      actionType: 'external'
    },
    {
      id: 'pmay_urban',
      title: 'PMAY-Urban/Sehri (Pradhan Mantri Awas Yojana - Urban)',
      category: 'portal_service',
      iconType: 'house',
      actionUrl: 'https://pmaymis.gov.in/',
      actionType: 'external'
    },
    {
      id: 'epfo',
      title: "EPFO (Employees' Provident Fund)",
      category: 'portal_service',
      iconType: 'epfo',
      actionUrl: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
      actionType: 'external'
    },
    {
      id: 'lic_service',
      title: 'LIC Service (Life Insurance Corporation)',
      category: 'portal_service',
      iconType: 'lic',
      actionUrl: 'https://ebiz.licindia.in/b2c/Login',
      actionType: 'external'
    },
    {
      id: 'e_nam',
      title: 'E-NAM (National Agriculture Market)',
      category: 'portal_service',
      iconType: 'farmer',
      actionUrl: 'https://www.enam.gov.in/',
      actionType: 'external'
    },
    {
      id: 'pm_svanidhi',
      title: 'PM SVANidhi Yojana',
      category: 'portal_service',
      iconType: 'street',
      actionUrl: 'https://pmsvanidhi.mohua.gov.in/',
      actionType: 'external'
    },
    {
      id: 'soil_health',
      title: 'Soil Health Card',
      category: 'portal_service',
      iconType: 'farmer',
      actionUrl: 'https://soilhealth.dac.gov.in/',
      actionType: 'external'
    },
    {
      id: 'mkisan',
      title: 'MKisan Portal',
      category: 'portal_service',
      iconType: 'farmer',
      actionUrl: 'https://mkisan.gov.in/',
      actionType: 'external'
    },
    {
      id: 'pm_surya_ghar',
      title: 'PM Surya Ghar Yojana (Muft Bijli Yojana)',
      category: 'portal_service',
      iconType: 'solar',
      actionUrl: 'https://pmsuryaghar.gov.in/',
      actionType: 'external'
    },
    {
      id: 'udyam_aadhaar',
      title: 'Udyam Aadhaar Service (MSME)',
      category: 'portal_service',
      iconType: 'msme',
      actionUrl: 'https://udyamregistration.gov.in/',
      actionType: 'external'
    },
    {
      id: 'nsp_scholarship',
      title: 'National Scholarship Portal (NSP)',
      category: 'portal_service',
      iconType: 'student',
      actionUrl: 'https://scholarships.gov.in/',
      actionType: 'external'
    },
    {
      id: 'lost_mobile_ceir',
      title: 'Lost/Found Mobile & Internet (CEIR)',
      category: 'portal_service',
      iconType: 'mobile',
      actionUrl: 'https://www.ceir.gov.in/',
      actionType: 'external'
    },
    {
      id: 'railway_irctc',
      title: 'Railway Service (IRCTC)',
      category: 'portal_service',
      iconType: 'railway',
      actionUrl: 'https://www.irctc.co.in/',
      actionType: 'external'
    },
    {
      id: 'passport_seva',
      title: 'Passport Seva Service',
      category: 'portal_service',
      iconType: 'passport',
      actionUrl: 'https://www.passportindia.gov.in/',
      actionType: 'external'
    },
    {
      id: 'pm_kisan',
      title: 'PM Kisan (Kisan Samman Nidhi Yojana)',
      category: 'portal_service',
      iconType: 'farmer',
      actionUrl: 'https://pmkisan.gov.in/',
      actionType: 'external'
    },
    {
      id: 'gst_verification',
      title: 'GST Verification',
      category: 'portal_service',
      iconType: 'gst',
      actionUrl: 'https://services.gst.gov.in/services/searchtp',
      actionType: 'external'
    },
    {
      id: 'checkpost_tax',
      title: 'Checkpost Tax / Road Tax',
      category: 'portal_service',
      iconType: 'transport',
      actionUrl: 'https://vahan.parivahan.gov.in/checkpost/',
      actionType: 'external'
    },
    {
      id: 'vahan_green_sewa',
      title: 'Vahan Green Sewa',
      category: 'portal_service',
      iconType: 'transport',
      actionUrl: 'https://parivahan.gov.in/',
      actionType: 'external'
    },
    {
      id: 'puc_service',
      title: 'PUC Service (Pollution Under Control)',
      category: 'portal_service',
      iconType: 'transport',
      actionUrl: 'https://vahan.parivahan.gov.in/puc/',
      actionType: 'external'
    },
    {
      id: 'npci_portal',
      title: 'National Payments Corporation Of India (NPCI)',
      category: 'portal_service',
      iconType: 'money',
      actionUrl: 'https://www.npci.org.in/',
      actionType: 'external'
    },
    {
      id: 'nch_consumer',
      title: 'National Consumer Helpline (NCH)',
      category: 'portal_service',
      iconType: 'consumer',
      actionUrl: 'https://consumerhelpline.gov.in/',
      actionType: 'external'
    },
    {
      id: 'ncs_career',
      title: 'National Career Service (NCS)',
      category: 'portal_service',
      iconType: 'jobs',
      actionUrl: 'https://www.ncs.gov.in/',
      actionType: 'external'
    },
    {
      id: 'cibil_score',
      title: 'Check Free CIBIL Score',
      category: 'portal_service',
      iconType: 'cibil',
      actionUrl: 'https://www.cibil.com/freecibilscore',
      actionType: 'external'
    },
    {
      id: 'indane_gas',
      title: 'INDANE GAS',
      category: 'portal_service',
      iconType: 'gas',
      actionUrl: 'https://cx.indianoil.in/',
      actionType: 'external'
    },
    {
      id: 'hp_gas',
      title: 'HP GAS',
      category: 'portal_service',
      iconType: 'gas',
      actionUrl: 'https://myhpgas.in/',
      actionType: 'external'
    },
    {
      id: 'bharat_gas',
      title: 'BHARAT GAS',
      category: 'portal_service',
      iconType: 'gas',
      actionUrl: 'https://my.ebharatgas.com/',
      actionType: 'external'
    },
    {
      id: 'udid_disability',
      title: 'Unique Disability ID Card (UDID)',
      category: 'portal_service',
      iconType: 'disability',
      actionUrl: 'https://www.swavlambancard.gov.in/',
      actionType: 'external'
    },
    {
      id: 'swachh_bharat',
      title: 'Swachhbharatmission (शौचालय योजना)',
      category: 'portal_service',
      iconType: 'swachh',
      actionUrl: 'https://sbm.gov.in/',
      actionType: 'external'
    },
    {
      id: 'fancy_number',
      title: 'Fancy Mobile Number',
      category: 'portal_service',
      iconType: 'vip_number',
      actionType: 'login'
    }
  ];

  // Base portal services loaded from PORTAL_GOV_SERVICES_DATA (Exact Image 2 order)
  const defaultPortalGovServices: ServiceItem[] = useMemo(() => {
    return PORTAL_GOV_SERVICES_DATA.map(p => ({
      id: p.id,
      title: p.title,
      hindiTitle: p.hindiTitle,
      category: 'portal_service' as const,
      badge: (p.badge as any) || 'OFFICIAL',
      badgeColor: (p.badgeColor as any) || 'indigo',
      iconType: p.iconType || 'census',
      description: p.tagline || 'Official Government Direct Web Portal & PDF Resources.',
      actionUrl: p.portalUrl,
      actionType: 'portal_expand' as const,
      subItems: p.subItems && p.subItems.length > 0 ? p.subItems : [
        {
          id: `sub_${p.id}_1`,
          title: `Direct ${p.title} Official Portal`,
          url: p.portalUrl || 'https://india.gov.in',
          type: 'LINK' as const
        }
      ]
    }));
  }, []);

  // Dynamic portal services merged with default portal services
  const effectivePortalServices: ServiceItem[] = useMemo(() => {
    if (dynamicPortals && dynamicPortals.length > 0) {
      return dynamicPortals
        .filter(p => p.isActive !== false)
        .sort((a, b) => (a.priority || (a as any).order || 0) - (b.priority || (b as any).order || 0))
        .map(p => ({
          id: p.id,
          title: p.title,
          hindiTitle: p.hindiTitle,
          category: 'portal_service' as const,
          badge: (p.badge as any) || 'OFFICIAL',
          badgeColor: (p.badgeColor as any) || 'indigo',
          iconType: p.iconType || 'census',
          description: p.tagline || p.description || 'Official Government Direct Web Portal.',
          actionUrl: p.portalUrl,
          actionType: 'portal_expand' as const,
          subItems: p.subItems && p.subItems.length > 0 ? p.subItems : [
            {
              id: `sub_${p.id}_1`,
              title: `Direct ${p.title} Official Portal`,
              url: p.portalUrl || p.actionUrl || 'https://india.gov.in',
              type: 'LINK' as const
            }
          ]
        }));
    }
    return defaultPortalGovServices;
  }, [dynamicPortals, defaultPortalGovServices]);

  // All services combined for search
  const allServicesCombined = useMemo(() => {
    return [
      ...essentialServices,
      ...creativeServices,
      ...pdfTools,
      ...cardPrintServices,
      ...effectivePortalServices
    ];
  }, [effectivePortalServices]);

  // Extract all matching sub-links, direct URLs, and PDF documents from all services when search is active
  const matchingDirectLinks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    
    const results: Array<{
      id: string;
      title: string;
      url: string;
      type?: string;
      serviceTitle: string;
      serviceHindiTitle?: string;
      serviceIcon?: any;
    }> = [];

    // Search in all services that have subItems or direct actionUrls
    allServicesCombined.forEach(service => {
      if (service.subItems && service.subItems.length > 0) {
        service.subItems.forEach((sub, sIdx) => {
          const isMatch = sub.title.toLowerCase().includes(q) ||
            service.title.toLowerCase().includes(q) ||
            (service.hindiTitle && service.hindiTitle.toLowerCase().includes(q)) ||
            (sub.url && sub.url.toLowerCase().includes(q));

          if (isMatch) {
            results.push({
              id: `${service.id}-sub-${sIdx}`,
              title: sub.title,
              url: sub.url,
              type: sub.type,
              serviceTitle: service.title,
              serviceHindiTitle: service.hindiTitle,
              serviceIcon: service.iconType
            });
          }
        });
      } else if (service.actionUrl && (service.title.toLowerCase().includes(q) || (service.hindiTitle && service.hindiTitle.toLowerCase().includes(q)))) {
        results.push({
          id: `${service.id}-main`,
          title: `Direct ${service.title} Portal`,
          url: service.actionUrl,
          type: 'LINK',
          serviceTitle: service.title,
          serviceHindiTitle: service.hindiTitle,
          serviceIcon: service.iconType
        });
      }
    });

    return results;
  }, [searchQuery, allServicesCombined]);

  // Filtered Services based on active tab and query
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allServicesCombined.filter(item => {
      const matchQuery = !q || 
        item.title.toLowerCase().includes(q) ||
        item.hindiTitle?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.subItems?.some(s => s.title.toLowerCase().includes(q) || (s.url && s.url.toLowerCase().includes(q)));

      const matchCategory = activeTabFilter === 'ALL' || item.category === activeTabFilter;

      return matchQuery && matchCategory;
    });
  }, [searchQuery, activeTabFilter, allServicesCombined]);

  // Direct sub-links matching the dedicated portal search input
  const portalMatchingDirectLinks = useMemo(() => {
    const q = portalSearchQuery.toLowerCase().trim();
    if (!q) return [];
    const results: Array<{
      id: string;
      title: string;
      url: string;
      type?: string;
      serviceTitle: string;
    }> = [];

    effectivePortalServices.forEach(service => {
      service.subItems?.forEach((sub, sIdx) => {
        if (
          sub.title.toLowerCase().includes(q) ||
          service.title.toLowerCase().includes(q) ||
          (service.hindiTitle && service.hindiTitle.toLowerCase().includes(q)) ||
          (sub.url && sub.url.toLowerCase().includes(q))
        ) {
          results.push({
            id: `${service.id}-portal-sub-${sIdx}`,
            title: sub.title,
            url: sub.url,
            type: sub.type,
            serviceTitle: service.title
          });
        }
      });
    });
    return results;
  }, [portalSearchQuery, effectivePortalServices]);

  // Portal services filtered by the dedicated portal search input
  const portalFilteredServices = useMemo(() => {
    const q = portalSearchQuery.toLowerCase().trim();
    if (!q) return effectivePortalServices;
    return effectivePortalServices.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.hindiTitle?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.subItems?.some(s => s.title.toLowerCase().includes(q) || (s.url && s.url.toLowerCase().includes(q)))
    );
  }, [effectivePortalServices, portalSearchQuery]);

  // Chunk portal services into responsive grid rows so sublinks expand directly under the clicked row
  const portalRows = useMemo(() => {
    const rows: ServiceItem[][] = [];
    for (let i = 0; i < portalFilteredServices.length; i += gridCols) {
      rows.push(portalFilteredServices.slice(i, i + gridCols));
    }
    return rows;
  }, [portalFilteredServices, gridCols]);

  const handleAction = (item: ServiceItem) => {
    if (item.category === 'portal_service' || item.actionType === 'portal_expand') {
      if (expandedPortalItem?.id === item.id) {
        setExpandedPortalItem(null);
      } else {
        setExpandedPortalItem(item);
        setTimeout(() => {
          const el = document.getElementById(`expanded-portal-box-${item.id}`) || document.getElementById(`portal-card-${item.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }
      return;
    }
    if (item.actionType === 'tool_passport' && onOpenPassportPhoto) {
      onOpenPassportPhoto();
      return;
    }
    if (item.actionType === 'tool_id_card' && onOpenIDCardPrint) {
      onOpenIDCardPrint();
      return;
    }
    if (item.actionType === 'tool_resume' && onOpenResumeMaker) {
      onOpenResumeMaker();
      return;
    }
    if (item.actionType === 'tool_biodata' && onOpenMarriageBiodata) {
      onOpenMarriageBiodata();
      return;
    }
    if (item.actionType === 'tool_payment_qr' && onOpenPaymentQR) {
      onOpenPaymentQR();
      return;
    }
    if (item.actionType === 'tool_jpg_to_pdf' && onOpenJpgToPdf) {
      onOpenJpgToPdf();
      return;
    }
    if (item.actionType === 'tool_pdf_manager' && onOpenPdfPageManager) {
      onOpenPdfPageManager();
      return;
    }
    if (item.actionType === 'tool_compressor' && onOpenCompressorModal) {
      onOpenCompressorModal();
      return;
    }
    if (item.actionType === 'tool_crop' && onOpenCropModal) {
      onOpenCropModal();
      return;
    }
    if (item.actionType === 'tool_resizer' && onOpenPanResizer) {
      onOpenPanResizer();
      return;
    }
    if (item.actionType === 'external' && item.actionUrl) {
      window.open(item.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // Default open login
    onOpenLoginModal('LOGIN');
  };

  // Render Custom Vector Illustrated Icons matching the PDF screenshots
  const renderItemIcon = (iconType: string) => {
    switch (iconType) {
      case 'jobs':
        return (
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="w-11 h-8 bg-sky-500 rounded-lg p-1 shadow-sm flex flex-col items-center justify-center border-2 border-sky-600">
              <span className="text-[8px] font-black text-slate-900 bg-white px-1 rounded tracking-tighter">JOBS</span>
              <div className="w-5 h-0.5 bg-sky-200 mt-1 rounded"></div>
            </div>
            <div className="absolute -bottom-1 w-5 h-1.5 bg-slate-400 rounded-b"></div>
          </div>
        );
      case 'mock_test':
        return (
          <div className="w-11 h-9 bg-white rounded-lg border-2 border-indigo-400 p-1 flex flex-col shadow-xs">
            <div className="flex items-center gap-1 border-b border-indigo-100 pb-0.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-center justify-around flex-1">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">✕</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">✓</span>
            </div>
          </div>
        );
      case 'id_print':
      case 'auto_print':
        return (
          <div className="w-12 h-11 flex flex-col items-center justify-center relative">
            <div className="w-7 h-2.5 bg-blue-200 rounded-t border border-blue-400"></div>
            <div className="w-11 h-6 bg-blue-600 rounded-md border border-blue-700 shadow-xs flex items-center justify-center gap-1">
              <div className="w-6 h-1 bg-slate-900 rounded-xs"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
            <div className="w-8 h-2 bg-white rounded-b border border-slate-300 shadow-2xs"></div>
          </div>
        );
      case 'pvc_crop':
        return (
          <div className="w-12 h-9 bg-slate-100 rounded-lg border-2 border-dashed border-teal-500 p-1 flex items-center justify-center relative shadow-xs">
            <div className="w-3.5 h-4.5 bg-teal-600 rounded-xs flex items-center justify-center mr-1">
              <UserIcon className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="space-y-0.5 flex-1">
              <div className="w-4 h-1 bg-slate-400 rounded"></div>
              <div className="w-2.5 h-0.5 bg-slate-300 rounded"></div>
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full"></div>
          </div>
        );
      case 'passport':
        return (
          <div className="w-10 h-12 bg-amber-50 rounded-lg border-2 border-amber-600 p-1 flex flex-col items-center justify-center shadow-xs">
            <div className="w-5 h-5 rounded-full bg-rose-400 flex items-center justify-center overflow-hidden border border-rose-500">
              <div className="w-3 h-3 bg-amber-200 rounded-full mt-1"></div>
            </div>
            <div className="w-6 h-2.5 bg-slate-800 rounded-t-md mt-0.5"></div>
          </div>
        );
      case 'photo_crop':
        return (
          <div className="w-11 h-11 border-2 border-dashed border-indigo-500 rounded-lg p-1 flex items-center justify-center relative bg-indigo-50/50">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-indigo-600 rounded-xs"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-600 rounded-xs"></div>
          </div>
        );
      case 'resume':
      case 'resume_maker':
        return (
          <div className="w-9 h-12 bg-white rounded-md border-2 border-slate-300 p-1 flex flex-col shadow-xs">
            <div className="text-[6px] font-black text-center text-blue-600 border-b border-slate-200 pb-0.5">RESUME</div>
            <div className="flex items-center gap-1 my-1">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <div className="flex-1 space-y-0.5">
                <div className="w-full h-0.5 bg-slate-400"></div>
                <div className="w-2/3 h-0.5 bg-slate-300"></div>
              </div>
            </div>
            <div className="space-y-0.5 flex-1">
              <div className="w-full h-0.5 bg-slate-300"></div>
              <div className="w-full h-0.5 bg-slate-300"></div>
            </div>
          </div>
        );
      case 'service_post':
      case 'doc_album':
        return (
          <div className="w-12 h-11 flex items-center justify-center relative">
            <div className="w-9 h-7 bg-amber-400 rounded-lg shadow-xs flex items-center justify-center border border-amber-500">
              <FileText className="w-4 h-4 text-amber-900" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-5 bg-white rounded border border-slate-300 shadow-xs flex items-center justify-center">
              <span className="text-[7px] font-black text-blue-600">✓</span>
            </div>
          </div>
        );
      case 'nsdl_id':
        return (
          <div className="w-12 h-10 bg-rose-50 rounded-lg border-2 border-rose-300 p-1 flex flex-col items-center justify-center shadow-xs">
            <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded tracking-wider">APPLY</span>
            <div className="w-3.5 h-3.5 text-rose-600 mt-0.5">👆</div>
          </div>
        );
      case 'qr_locked':
        return (
          <div className="w-11 h-11 bg-white rounded-lg border-2 border-slate-900 p-1 flex items-center justify-center shadow-xs relative">
            <QrCode className="w-7 h-7 text-slate-900" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-3 h-3 text-rose-600 bg-white p-0.5 rounded-full shadow-xs" />
            </div>
          </div>
        );
      case 'marriage':
        return (
          <div className="w-11 h-11 bg-amber-100 rounded-lg border-2 border-amber-500 p-1 flex flex-col items-center justify-center shadow-xs">
            <div className="text-[14px]">💍</div>
            <span className="text-[7px] font-black text-amber-900 bg-amber-200 px-1 rounded">VIP</span>
          </div>
        );
      case 'id_design':
      case 'school_card':
        return (
          <div className="w-11 h-11 bg-indigo-50 rounded-lg border-2 border-indigo-400 p-1 flex flex-col items-center justify-center shadow-xs">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <div className="w-6 h-1 bg-indigo-300 rounded mt-0.5"></div>
          </div>
        );
      case 'poster_maker':
      case 'shop_promo':
        return (
          <div className="w-11 h-11 bg-orange-50 rounded-lg border-2 border-orange-500 p-1 flex items-center justify-center shadow-xs">
            <Camera className="w-6 h-6 text-orange-600" />
          </div>
        );
      case 'application_maker':
        return (
          <div className="w-11 h-11 bg-sky-50 rounded-lg border-2 border-sky-500 p-1 flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
          </div>
        );
      case 'jpg_to_pdf':
      case 'png_to_pdf':
        return (
          <div className="w-13 h-10 flex items-center justify-center gap-1">
            <div className="w-5 h-6 bg-amber-100 border border-amber-400 rounded text-[7px] font-bold text-amber-800 flex items-center justify-center">JPG</div>
            <span className="text-[9px] font-bold text-slate-400">➔</span>
            <div className="w-5 h-6 bg-rose-100 border border-rose-400 rounded text-[7px] font-bold text-rose-800 flex items-center justify-center">PDF</div>
          </div>
        );
      case 'pdf_to_jpg':
      case 'png_to_jpg':
        return (
          <div className="w-13 h-10 flex items-center justify-center gap-1">
            <div className="w-5 h-6 bg-rose-100 border border-rose-400 rounded text-[7px] font-bold text-rose-800 flex items-center justify-center">PDF</div>
            <span className="text-[9px] font-bold text-slate-400">➔</span>
            <div className="w-5 h-6 bg-amber-100 border border-amber-400 rounded text-[7px] font-bold text-amber-800 flex items-center justify-center">JPG</div>
          </div>
        );
      case 'delete_pdf':
        return (
          <div className="w-11 h-11 bg-rose-50 rounded-lg border-2 border-rose-400 p-1 flex items-center justify-center shadow-xs relative">
            <FileText className="w-5 h-5 text-rose-600" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[8px] font-black flex items-center justify-center">✕</span>
          </div>
        );
      case 'merge_pdf':
        return (
          <div className="w-11 h-11 bg-emerald-50 rounded-lg border-2 border-emerald-500 p-1 flex items-center justify-center shadow-xs relative">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white rounded-full text-[8px] font-black flex items-center justify-center">+</span>
          </div>
        );
      case 'census':
        return (
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center shadow-xs border-2 border-slate-700 text-white font-black text-center p-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-blue-600 to-slate-950 opacity-80"></div>
            <div className="relative z-10 flex flex-col items-center justify-center leading-none">
              <span className="text-[8px] font-black tracking-tighter text-amber-400">INDIA</span>
              <span className="text-[10px] font-black">CENSUS</span>
            </div>
          </div>
        );
      case 'aadhaar_beta':
        return (
          <div className="w-12 h-12 rounded-full bg-indigo-50 border-2 border-indigo-500 flex flex-col items-center justify-center shadow-xs relative">
            <span className="text-base">👆</span>
            <span className="absolute -bottom-1 text-[7px] font-black bg-indigo-600 text-white px-1 rounded-full uppercase tracking-tighter">BETA</span>
          </div>
        );
      case 'aadhaar_info':
      case 'aadhaar':
      case 'aadhaar_card':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🆔</span>
          </div>
        );
      case 'pan_service':
      case 'pan':
      case 'pan_card':
        return (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 border border-cyan-400 flex flex-col items-center justify-center shadow-xs text-white p-1">
            <span className="text-[8px] font-black bg-white text-blue-900 px-1 rounded leading-tight">PAN</span>
            <span className="text-[11px] font-black mt-0.5">💳</span>
          </div>
        );
      case 'voter_service':
      case 'voter':
      case 'voter_card':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🗳️</span>
          </div>
        );
      case 'ayushman_service':
      case 'ayushman':
      case 'ayushman_card':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🏥</span>
          </div>
        );
      case 'dl_service':
      case 'dl_card':
        return (
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border-2 border-indigo-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🪪</span>
          </div>
        );
      case 'rc_service':
        return (
          <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">📋</span>
          </div>
        );
      case 'vehicle_service':
      case 'transport':
      case 'car':
        return (
          <div className="w-12 h-12 rounded-xl bg-rose-50 border-2 border-rose-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🚗</span>
          </div>
        );
      case 'birth_death':
        return (
          <div className="w-12 h-12 rounded-xl bg-teal-50 border-2 border-teal-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">📜</span>
          </div>
        );
      case 'echallan':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🚨</span>
          </div>
        );
      case 'eshram':
        return (
          <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs text-white">
            <span className="text-[7px] font-black text-amber-400">e-Shram</span>
            <span className="text-xs">👷</span>
          </div>
        );
      case 'apaar':
        return (
          <div className="w-12 h-12 rounded-xl bg-blue-900 border-2 border-blue-400 flex flex-col items-center justify-center shadow-xs text-white">
            <span className="text-[7px] font-black text-blue-200">APAAR</span>
            <span className="text-xs">🎓</span>
          </div>
        );
      case 'abha':
        return (
          <div className="w-12 h-12 rounded-xl bg-sky-50 border-2 border-sky-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🩺</span>
          </div>
        );
      case 'pmfby':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🌾</span>
          </div>
        );
      case 'pmay_g':
      case 'pmay_u':
        return (
          <div className="w-12 h-12 rounded-xl bg-orange-50 border-2 border-orange-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🏡</span>
          </div>
        );
      case 'epfo':
        return (
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border-2 border-cyan-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">⚙️</span>
          </div>
        );
      case 'lic':
        return (
          <div className="w-12 h-12 rounded-xl bg-yellow-50 border-2 border-yellow-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🛡️</span>
          </div>
        );
      case 'enam':
        return (
          <div className="w-12 h-12 rounded-xl bg-green-50 border-2 border-green-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🥬</span>
          </div>
        );
      case 'pm_kisan':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">👨‍🌾</span>
          </div>
        );
      case 'pm_surya_ghar':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">☀️</span>
          </div>
        );
      case 'ration_card':
      case 'farmer':
        return (
          <div className="w-11 h-11 bg-lime-50 rounded-lg border-2 border-lime-600 p-1 flex items-center justify-center shadow-xs">
            <Wheat className="w-6 h-6 text-lime-700" />
          </div>
        );
      case 'certificate':
        return (
          <div className="w-11 h-11 bg-teal-50 rounded-lg border-2 border-teal-600 p-1 flex items-center justify-center shadow-xs">
            <Award className="w-6 h-6 text-teal-600" />
          </div>
        );
      case 'gas':
        return (
          <div className="w-11 h-11 bg-orange-50 rounded-lg border-2 border-orange-600 p-1 flex items-center justify-center shadow-xs">
            <FlameIcon className="w-6 h-6 text-orange-600" />
          </div>
        );
      case 'money':
      case 'cibil':
      case 'gst':
        return (
          <div className="w-11 h-11 bg-emerald-50 rounded-lg border-2 border-emerald-600 p-1 flex items-center justify-center shadow-xs">
            <span className="font-black text-emerald-700 text-sm">₹</span>
          </div>
        );
      case 'railway':
        return (
          <div className="w-11 h-11 bg-slate-100 rounded-lg border-2 border-slate-600 p-1 flex items-center justify-center shadow-xs">
            <span className="text-base">🚆</span>
          </div>
        );
      case 'vip_number':
        return (
          <div className="w-11 h-11 bg-amber-100 rounded-lg border-2 border-amber-500 p-1 flex items-center justify-center shadow-xs">
            <span className="text-[9px] font-black text-amber-900 bg-amber-300 px-1 py-0.5 rounded">VIP</span>
          </div>
        );
      default:
        return (
          <div className="w-11 h-11 bg-slate-100 rounded-lg border border-slate-300 p-1 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
        );
    }
  };

  const faqs = [
    {
      q: 'What Services Are Available On eCyberCafe.in?',
      a: 'At eCyberCafe.in you can access 160+ citizen services including Instant PAN card creation, Aadhaar mobile link status, Bihar RTPS caste/income/residence certificates, PVC ID card auto cropping, Ayushman Bharat PMJAY registration, passport size photo maker, resume maker, vehicle challan, ration card, and PDF converter tools.'
    },
    {
      q: 'Are All These Tools Free To Use?',
      a: 'Many of our basic tools on eCyberCafe.in like image crop, photo compressor, UTI resizer and direct portal links are completely free to use. Premium automated services such as PVC ID Card tray printing and certified operator document processing are available under our affordable Retailer & Distributor plans.'
    },
    {
      q: 'What Should Be The Size Of The Photo To Make A Passport Photo?',
      a: 'You do not have to worry about sizing or DPI! Simply upload any regular photo to our Passport Photo tool, and our engine automatically converts it into standard 3.5cm x 4.5cm 300 DPI passport photos arranged perfectly on 4x6 or A4 sheets ready for 1-click printing.'
    },
    {
      q: 'Are My Uploaded Files Safe?',
      a: 'Yes, 100% safe. Your privacy and data security are our highest priorities. All files processed via client-side tools are wiped automatically, and customer application attachments are encrypted and stored in private sandboxed cloud storage with strict role-based access control.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 lg:px-10 py-2.5 flex items-center justify-between">
        {/* Left Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-blue-600 p-0.5 flex items-center justify-center shadow-md">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="font-black text-xl text-slate-900 tracking-tight">eCyberCafe</span>
              <span className="font-black text-xl text-blue-600 tracking-tight">.in</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold -mt-1">Digital Citizen Services</p>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <a href="#home" className="text-blue-600 font-bold hover:text-blue-700">Home</a>
          
          <div className="relative group">
            <button 
              onClick={() => setActiveMenuDropdown(activeMenuDropdown === 'services' ? null : 'services')}
              className="flex items-center gap-1 hover:text-slate-900 cursor-pointer font-bold"
            >
              <span>Tools & Studios</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {activeMenuDropdown === 'services' && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setActiveMenuDropdown(null); onOpenJpgToPdf && onOpenJpgToPdf(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>🖼️</span> JPG to PDF Combiner (jpg2pdf)
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenPdfPageManager && onOpenPdfPageManager(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>📑</span> PDF Page Manager (पेज अरेंज)
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenPassportPhoto && onOpenPassportPhoto(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>📷</span> AI Passport Photo Studio
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenIDCardPrint && onOpenIDCardPrint(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>💳</span> PVC ID Card Studio
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenResumeMaker && onOpenResumeMaker(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>📄</span> 1-Click CV & Resume Maker
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenPaymentQR && onOpenPaymentQR(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>🔲</span> Customer Payment QR Standee
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenCropModal && onOpenCropModal(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>✂️</span> Photo & Signature Crop
                </button>
                <button onClick={() => { setActiveMenuDropdown(null); onOpenCompressorModal && onOpenCompressorModal(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 cursor-pointer">
                  <span>🗜️</span> Image & PDF Compressor
                </button>
              </div>
            )}
          </div>

          <a 
            href="https://www.sarkariresult.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-slate-900 flex items-center gap-1"
          >
            <span>Latest Jobs</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </a>

          <button 
            onClick={() => onOpenLoginModal('LOGIN')} 
            className="hover:text-slate-900 cursor-pointer"
          >
            Pricing
          </button>

          <div className="relative group">
            <button 
              onClick={() => setActiveMenuDropdown(activeMenuDropdown === 'more' ? null : 'more')}
              className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {activeMenuDropdown === 'more' && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => onOpenCropModal && onOpenCropModal()} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl">
                  ✂️ Photo Crop & Resize
                </button>
                <button onClick={() => onOpenPanResizer && onOpenPanResizer()} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl">
                  🖼️ UTI PAN Resizer
                </button>
              </div>
            )}
          </div>

          <button className="text-slate-500 hover:text-slate-800 cursor-pointer" title="Language">
            <Globe className="w-4 h-4" />
          </button>
        </nav>

        {/* Right Action Icons & Buttons */}
        <div className="flex items-center gap-2.5">
          {/* App Grid Icon */}
          <button 
            onClick={() => onOpenLoginModal('LOGIN')}
            className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors cursor-pointer"
            title="App Services Hub"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Orange/Red Pill Button "Cyber Cafe?" */}
          <button
            onClick={() => onOpenLoginModal('LOGIN')}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cyber Cafe?</span>
          </button>

          {/* User Profile Pill Button */}
          <button
            onClick={() => onOpenLoginModal('LOGIN')}
            className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline font-bold">Login</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-10 flex-1">
        {/* 2. HERO BANNER (Vibrant Pink-Purple-Cyan Gradient Geometric Box) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#e93b81] via-[#8c44db] to-[#2cb8f6] p-8 sm:p-12 text-white shadow-xl">
          {/* Subtle Geometric Background Pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
          
          <div className="relative z-10 text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-md leading-tight">
              Launch Your Digital Operations With eCyberCafe.in
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-white/90 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-sm">
              eCyberCafe.in is your all-in-one platform for seamless online printing, citizen services, and digital tools.
            </p>
          </div>
        </div>

        {/* 3. CENTERED FLOATING SEARCH BAR */}
        <div className="max-w-2xl mx-auto -mt-4 relative z-20">
          <div className="relative flex items-center bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services, forms, files... (e.g. Aadhaar, List, PDF)"
              className="w-full px-3.5 py-3.5 text-sm text-slate-800 placeholder-slate-400 font-medium bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mr-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
          {[
            { id: 'ALL', label: '🌟 All Services' },
            { id: 'portal_service', label: '🏛️ Govt Portals' },
            { id: 'essential', label: '⚡ Essential & Tools' },
            { id: 'creative', label: '🎨 Design Studio' },
            { id: 'pdf_tools', label: '📄 Smart PDF' },
            { id: 'card_print', label: '🖨️ Card Printing' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTabFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* IF SEARCH IS ACTIVE, SHOW UNIFIED GRID */}
        {searchQuery ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Search Results ({filteredServices.length} Services{matchingDirectLinks.length > 0 ? `, ${matchingDirectLinks.length} Related Links` : ''})
                </h2>
              </div>
            </div>

            {/* DIRECT RELATED LINKS & PDF DOCUMENTS MATCHING SEARCH QUERY */}
            {matchingDirectLinks.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>Related Direct Links & Documents (सर्च से जुड़े सीधे लिंक्स व डाक्यूमेंट्स)</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black">
                        {matchingDirectLinks.length}
                      </span>
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 hidden sm:inline">
                    Click to Open or Preview instantly
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {matchingDirectLinks.map((link) => {
                    const isPdf = link.type === 'PDF' || (link.url && link.url.toLowerCase().endsWith('.pdf'));
                    const isCopied = copiedLinkUrl === link.url;

                    if (isPdf) {
                      return (
                        <div
                          key={link.id}
                          onClick={() => setPreviewDocModal({
                            url: link.url,
                            title: link.title,
                            filename: `${link.title}.pdf`
                          })}
                          className="group flex items-center justify-between p-3.5 bg-white hover:bg-orange-50/60 border border-orange-200/90 hover:border-orange-400 rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-md"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-xl bg-orange-100/80 border border-orange-300 flex items-center justify-center text-orange-700 font-black text-[10px] shrink-0">
                              PDF
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-orange-700 truncate leading-snug">
                                {link.title}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-600 truncate">
                                {link.serviceTitle}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 text-[10px] font-black bg-orange-100 text-orange-700 rounded-lg shrink-0">
                            Preview
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={link.id}
                        className="group flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-400 rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-md"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 min-w-0 flex-1 pr-2"
                        >
                          <div className="w-9 h-9 rounded-xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate leading-snug">
                              {link.title}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-600 truncate">
                              {link.serviceTitle}
                            </p>
                          </div>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => copyToClipboard(link.url, e)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Copy Link"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Services & Modules ({filteredServices.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {filteredServices.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleAction(item)}
                    className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] shadow-2xs hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    {item.badge && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wide ${
                          item.badgeColor === 'green' || item.badge === 'NEW' 
                            ? 'bg-lime-400 text-slate-950 font-black' 
                            : item.badgeColor === 'red' || item.badge === 'HOT'
                            ? 'bg-rose-500 text-white font-black'
                            : 'bg-blue-600 text-white font-bold'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                    )}
                    {item.isLocked && (
                      <div className="absolute top-2.5 left-2.5 text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    )}
                    <div className="my-auto pt-2 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                      {renderItemIcon(item.iconType)}
                    </div>
                    <div className="mt-auto pt-2 w-full">
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Sub-Links Expander Box for Search Results */}
            {expandedPortalItem && (
              <div 
                id={`search-expanded-portal-box-${expandedPortalItem.id}`}
                className="mt-6 bg-gradient-to-b from-white to-slate-50/80 border-2 border-indigo-500 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shrink-0 shadow-xs">
                      {renderItemIcon(expandedPortalItem.iconType || 'census')}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base sm:text-xl text-slate-900 tracking-tight">
                          {expandedPortalItem.title}
                        </h3>
                        {expandedPortalItem.hindiTitle && (
                          <span className="text-slate-600 text-xs sm:text-sm font-bold bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {expandedPortalItem.hindiTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        आधिकारिक पोर्टल लिंक, प्रश्नोत्तरी व डाउनलोड हेतु पीडीएफ संसाधन (Official Direct Links & PDF Resources)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedPortalItem(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-black text-sm transition-all cursor-pointer shrink-0"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-1">
                  {expandedPortalItem.subItems && expandedPortalItem.subItems.length > 0 ? (
                    expandedPortalItem.subItems.map((sub, sIdx) => {
                      const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));
                      return (
                        <a
                          key={sub.id || sIdx}
                          href={sub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                            isPdf 
                              ? 'bg-orange-50/40 hover:bg-orange-50 border-orange-200 hover:border-orange-400' 
                              : 'bg-white hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-400'
                          }`}
                        >
                          {isPdf ? (
                            <div className="w-10 h-10 rounded-xl bg-orange-100/80 border border-orange-300 flex flex-col items-center justify-center text-orange-700 shrink-0 group-hover:scale-105 transition-transform">
                              <FileText className="w-4 h-4 text-orange-600" />
                              <span className="text-[9px] font-black leading-none mt-0.5 text-orange-700">PDF</span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                              <ExternalLink className="w-5 h-5 text-indigo-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 block leading-snug">
                              {sub.title}
                            </span>
                            <span className={`text-[10px] font-bold block mt-0.5 ${isPdf ? 'text-orange-600' : 'text-slate-400'}`}>
                              {isPdf ? '📄 View / Download PDF' : '↗ Open Official Portal'}
                            </span>
                          </div>
                        </a>
                      );
                    })
                  ) : (
                    <a
                      href={expandedPortalItem.actionUrl || 'https://india.gov.in'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 p-4 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-400 rounded-2xl transition-all duration-150 cursor-pointer col-span-full shadow-xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                        <ExternalLink className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <span className="font-black text-sm text-slate-800 group-hover:text-indigo-600 transition-colors block">
                          Open {expandedPortalItem.title} Official Portal
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Direct secure government link</span>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT MULTI-SECTION DISPLAY */
          <div className="space-y-12">
            {/* SECTION 1: PORTAL SERVICE (Exact Image 1 Header + Image 2 Row-by-Row Expander) */}
            {(activeTabFilter === 'ALL' || activeTabFilter === 'portal_service') && (
              <div className="space-y-4" id="portal-service-section">
                {/* Header: Left Purple bar + Title + Subtitle, Right: Search Input (Image 1) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-purple-600 rounded-full shrink-0"></div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Portal Service
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Official Government Portals, Direct Application Links & PDF Documents
                      </p>
                    </div>
                  </div>

                  {/* Dedicated Search Input (Image 1) */}
                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={portalSearchQuery}
                      onChange={(e) => setPortalSearchQuery(e.target.value)}
                      placeholder="Search portal services & links..."
                      className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                    {portalSearchQuery && (
                      <button
                        onClick={() => setPortalSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct Related Sub-Links for Portal Search */}
                {portalSearchQuery && portalMatchingDirectLinks.length > 0 && (
                  <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 flex items-center gap-2">
                        <span>Direct Matching Links & PDFs ({portalMatchingDirectLinks.length})</span>
                      </span>
                      <span className="text-[11px] font-bold text-purple-700">Quick Direct Access</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {portalMatchingDirectLinks.map((sub) => {
                        const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));

                        if (isPdf) {
                          return (
                            <div
                              key={sub.id}
                              onClick={() => setPreviewDocModal({
                                url: sub.url,
                                title: sub.title,
                                filename: `${sub.title}.pdf`
                              })}
                              className="group flex items-center justify-between p-3 bg-white hover:bg-orange-50/50 border border-purple-200/70 hover:border-orange-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-7 h-7 rounded-lg bg-orange-100/80 border border-orange-200 flex items-center justify-center text-orange-600 text-xs shrink-0 font-bold">
                                  📄
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-800 group-hover:text-orange-700 truncate block">
                                    {sub.title}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium truncate block">
                                    {sub.serviceTitle}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 text-[10px] font-black bg-orange-100 text-orange-700 rounded-md shrink-0">
                                Preview
                              </span>
                            </div>
                          );
                        }

                        return (
                          <a
                            key={sub.id}
                            href={sub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2.5 p-3 bg-white hover:bg-blue-50/50 border border-purple-200/70 hover:border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 text-xs shrink-0 font-bold">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate block">
                                {sub.title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium truncate block">
                                {sub.serviceTitle}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rows of Grid Cards with Direct Row-by-Row Inline Expansion (Image 2 style) */}
                <div className="space-y-4">
                  {portalRows.map((row, rowIdx) => {
                    const activeItemInThisRow = row.find(item => item.id === expandedPortalItem?.id);

                    return (
                      <div key={rowIdx} className="space-y-4">
                        {/* Grid Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                          {row.map(tool => {
                            const isSelected = expandedPortalItem?.id === tool.id;

                            return (
                              <div
                                key={tool.id}
                                id={`portal-card-${tool.id}`}
                                onClick={() => handleAction(tool)}
                                className={`group relative bg-white rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-between text-center min-h-[145px] transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'border-2 border-purple-600 bg-purple-50/20 shadow-md ring-2 ring-purple-100 -translate-y-0.5'
                                    : 'border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-400 hover:-translate-y-0.5'
                                }`}
                              >
                                <div className="my-auto pt-1 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                                  {renderItemIcon(tool.iconType)}
                                </div>
                                <div className="mt-auto pt-2 w-full">
                                  <h3 className={`text-xs sm:text-sm font-black transition-colors leading-tight line-clamp-2 ${
                                    isSelected ? 'text-purple-700 font-black' : 'text-slate-800 group-hover:text-purple-700'
                                  }`}>
                                    {tool.title}
                                  </h3>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* INLINE EXPANDER BOX DIRECTLY UNDER THIS ROW (Image 2 design) */}
                        {activeItemInThisRow && (
                          <div
                            id={`expanded-portal-box-${activeItemInThisRow.id}`}
                            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in duration-200"
                          >
                            {/* Expander Header with Title & Close ✕ */}
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                                {activeItemInThisRow.title}
                              </h3>
                              <button
                                type="button"
                                onClick={() => setExpandedPortalItem(null)}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs transition-all cursor-pointer"
                                title="Close"
                              >
                                ✕
                              </button>
                            </div>

                            {/* 3-Column Sublinks Grid (Image 2 style) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                              {activeItemInThisRow.subItems && activeItemInThisRow.subItems.length > 0 ? (
                                activeItemInThisRow.subItems.map((sub, sIdx) => {
                                  const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));

                                  if (isPdf) {
                                    return (
                                      <a
                                        key={sub.id || sIdx}
                                        href={sub.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 p-3 bg-white hover:bg-orange-50/40 border border-slate-200/90 hover:border-orange-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                                      >
                                        <div className="w-7 h-7 rounded-lg bg-orange-100/80 border border-orange-200 flex items-center justify-center text-orange-600 text-xs shrink-0 font-bold">
                                          📄
                                        </div>
                                        <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-orange-700 truncate">
                                          {sub.title}
                                        </span>
                                      </a>
                                    );
                                  }

                                  return (
                                    <a
                                      key={sub.id || sIdx}
                                      href={sub.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-center gap-3 p-3 bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 text-xs shrink-0 font-bold">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                        {sub.title}
                                      </span>
                                    </a>
                                  );
                                })
                              ) : (
                                <a
                                  href={activeItemInThisRow.actionUrl || 'https://india.gov.in'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-3 p-3 bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs col-span-full"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 text-xs shrink-0">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                    Open {activeItemInThisRow.title} Official Portal
                                  </span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: ESSENTIAL & SERVICES */}
            {(activeTabFilter === 'ALL' || activeTabFilter === 'essential') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Essential & Services
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                  {essentialServices.map(tool => (
                    <div
                      key={tool.id}
                      onClick={() => handleAction(tool)}
                      className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] shadow-2xs hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {tool.badge && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wide ${
                            tool.badgeColor === 'green' || tool.badge === 'NEW' 
                              ? 'bg-lime-400 text-slate-950 font-black' 
                              : tool.badgeColor === 'red' || tool.badge === 'HOT'
                              ? 'bg-rose-500 text-white font-black'
                              : 'bg-blue-600 text-white font-bold'
                          }`}>
                            {tool.badge}
                          </span>
                        </div>
                      )}
                      <div className="my-auto pt-2 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                        {renderItemIcon(tool.iconType)}
                      </div>
                      <div className="mt-auto pt-2 w-full">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                          {tool.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: CREATIVE DESIGN STUDIO */}
            {(activeTabFilter === 'ALL' || activeTabFilter === 'creative') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-pink-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Creative Design Studio
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                  {creativeServices.map(tool => (
                    <div
                      key={tool.id}
                      onClick={() => handleAction(tool)}
                      className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] shadow-2xs hover:shadow-lg hover:border-pink-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="my-auto pt-2 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                        {renderItemIcon(tool.iconType)}
                      </div>
                      <div className="mt-auto pt-2 w-full">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-pink-600 transition-colors leading-tight line-clamp-2">
                          {tool.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: SMART PDF & IMAGE TOOLS */}
            {(activeTabFilter === 'ALL' || activeTabFilter === 'pdf_tools') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Smart PDF & Image Tools
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                  {pdfTools.map(tool => (
                    <div
                      key={tool.id}
                      onClick={() => handleAction(tool)}
                      className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] shadow-2xs hover:shadow-lg hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="my-auto pt-2 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                        {renderItemIcon(tool.iconType)}
                      </div>
                      <div className="mt-auto pt-2 w-full">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-amber-600 transition-colors leading-tight line-clamp-2">
                          {tool.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 5: CARD PRINTING SERVICES */}
            {(activeTabFilter === 'ALL' || activeTabFilter === 'card_print') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-teal-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Card Printing Services
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                  {cardPrintServices.map(tool => (
                    <div
                      key={tool.id}
                      onClick={() => handleAction(tool)}
                      className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] shadow-2xs hover:shadow-lg hover:border-teal-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {tool.isLocked && (
                        <div className="absolute top-2.5 left-2.5">
                          <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
                        </div>
                      )}
                      {tool.badge && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-rose-500 text-white">
                            {tool.badge}
                          </span>
                        </div>
                      )}
                      <div className="my-auto pt-2 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                        {renderItemIcon(tool.iconType)}
                      </div>
                      <div className="mt-auto pt-2 w-full">
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-teal-600 transition-colors leading-tight line-clamp-2">
                          {tool.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: eCyberCafe.in – One Stop Solution For All Your Digital Work */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              eCyberCafe.in – One Stop Solution For All Your Digital Work
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Welcome to <strong>eCyberCafe.in</strong>. It is a comprehensive platform designed to simplify your everyday digital needs. Whether you are a student who needs to merge documents for an assignment, a job seeker creating an instant professional resume, or a cyber cafe retailer who needs Aadhaar card print and Bihar RTPS citizen services, our smart online tools are always ready to help you.
            </p>
          </div>

          {/* Why Choose eCyberCafe.in */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-lg font-black text-slate-900 text-center">
              Why Choose eCyberCafe.in?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 font-bold mx-auto flex items-center justify-center text-lg">
                  ⚡
                </div>
                <h4 className="text-sm font-black text-slate-900">Simple And Fast</h4>
                <p className="text-xs text-slate-500">Fast 1-click tools and 10-minute application processing.</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-bold mx-auto flex items-center justify-center text-lg">
                  🗂️
                </div>
                <h4 className="text-sm font-black text-slate-900">Everything In One Place</h4>
                <p className="text-xs text-slate-500">Over 160+ citizen services and PDF utilities in one login.</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 font-bold mx-auto flex items-center justify-center text-lg">
                  🛡️
                </div>
                <h4 className="text-sm font-black text-slate-900">Safe And Reliable</h4>
                <p className="text-xs text-slate-500">Encrypted data vault and safe document processing guarantee.</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 font-bold mx-auto flex items-center justify-center text-lg">
                  💰
                </div>
                <h4 className="text-sm font-black text-slate-900">Affordable And Transparent</h4>
                <p className="text-xs text-slate-500">Fixed minimal pricing with zero hidden charges.</p>
              </div>
            </div>
          </div>

          {/* SECTION 7: FREQUENTLY ASKED QUESTIONS (FAQ) */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <h3 className="text-xl font-black text-slate-900 text-center">
              Frequently Asked Questions (FAQ)
            </h3>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between font-black text-sm text-slate-800 hover:text-blue-600 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 8: DARK FOOTER HUB (Matching Pages 5 & 6) */}
      <footer className="mt-auto bg-[#0d1222] text-slate-300 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Top Brand Banner in Footer */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-blue-600 p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <span className="font-black text-2xl text-white tracking-tight">
                eCyberCafe<span className="text-blue-500">.in</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Independent online tools for printing, documentation, and citizen work. We make common digital tasks simple, accessible, and fast.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-900/40 text-blue-300 border border-blue-800/60">
                ℹ️ Independent
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-800/60">
                🔒 Privacy Focused
              </span>
            </div>
          </div>

          {/* Links Columns */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 text-center border-t border-b border-slate-800/80 py-8">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Services
              </h4>
              <ul className="space-y-2 text-xs text-slate-400 font-medium">
                <li><a href="#home" className="hover:text-white">Home</a></li>
                <li><button onClick={() => onOpenLoginModal('LOGIN')} className="hover:text-white cursor-pointer">Pricing & Plans</button></li>
                <li><a href="https://www.sarkariresult.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Government Jobs</a></li>
                <li><button onClick={() => setActiveTabFilter('pdf_tools')} className="hover:text-white cursor-pointer">All PDF Tools</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Legal & Help
              </h4>
              <ul className="space-y-2 text-xs text-slate-400 font-medium">
                <li><button onClick={() => setOpenFaqIndex(0)} className="hover:text-white cursor-pointer">Help & FAQs</button></li>
                <li><button onClick={() => onOpenLoginModal('LOGIN')} className="hover:text-white cursor-pointer">Contact Us</button></li>
                <li><span className="hover:text-white cursor-pointer">Terms and Conditions</span></li>
                <li><span className="hover:text-white cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-white cursor-pointer">Refund Policy</span></li>
                <li><span className="hover:text-white cursor-pointer">DISCLAIMER</span></li>
                <li><span className="hover:text-white cursor-pointer">About Us</span></li>
              </ul>
            </div>
          </div>

          {/* Connect With Us */}
          <div className="space-y-3 text-center">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Connect With Us
            </h4>
            <div className="flex items-center justify-center gap-3">
              <a 
                href="https://wa.me/919876543210" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <span className="w-9 h-9 rounded-full bg-slate-800 hover:bg-pink-600 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer" title="Instagram">
                📸
              </span>
              <span className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer" title="Facebook">
                📘
              </span>
              <span className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer" title="YouTube">
                ▶️
              </span>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-1 text-xs text-slate-500">
            <p>© 2026 eCyberCafe.in. All rights reserved. Made with ❤️ in India</p>
            <div className="flex items-center justify-center gap-3 text-[11px]">
              <span className="hover:underline cursor-pointer">Sitemap</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Cookies & Privacy</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Action Button */}
      <a
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer group"
        title="Chat on WhatsApp with Support"
      >
        <MessageCircle className="w-7 h-7 fill-white text-emerald-600" />
      </a>

      {/* IN-APP PDF PREVIEW LIGHTBOX */}
      {previewDocModal && (
        <PhotoPreviewLightboxModal
          isOpen={true}
          onClose={() => setPreviewDocModal(null)}
          title={previewDocModal.title}
          imageUrl={previewDocModal.url}
          filename={previewDocModal.filename || 'document.pdf'}
        />
      )}
    </div>
  );
};
