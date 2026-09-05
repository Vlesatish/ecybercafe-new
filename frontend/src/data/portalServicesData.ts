import { PublicGovService } from '../types';

export const PORTAL_GOV_SERVICES_DATA: PublicGovService[] = [
  {
    id: 'pub_census',
    title: 'Census Of India (भारत की जनगणना)',
    hindiTitle: 'भारत की जनगणना',
    tagline: 'Office of the Registrar General & Census Commissioner, India',
    category: 'Census & Survey',
    portalUrl: 'https://censusindia.gov.in/census.website/',
    iconType: 'census',
    badge: 'OFFICIAL',
    badgeColor: 'blue',
    isActive: true,
    priority: 1,
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
    id: 'pub_aadhaar_beta',
    title: 'Aadhar Beta Service',
    hindiTitle: 'आधार बीटा सेवा',
    tagline: 'UIDAI Next-Gen Aadhaar Self-Service Portal & Biometrics Tools',
    category: 'Aadhaar',
    portalUrl: 'https://myaadhaar.uidai.gov.in/',
    iconType: 'aadhaar_beta',
    badge: 'BETA DIRECT',
    badgeColor: 'indigo',
    isActive: true,
    priority: 2,
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
      },
      {
        id: 'sub_ab3',
        title: 'Biometric Lock / Unlock Service',
        url: 'https://myaadhaar.uidai.gov.in/lock-unlock-biometrics',
        type: 'LINK'
      },
      {
        id: 'sub_ab4',
        title: 'Aadhaar PVC Card Order Direct',
        url: 'https://myaadhaar.uidai.gov.in/genricPVC',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_aadhaar_info',
    title: 'Aadhaar Information (UIDAI Link)',
    hindiTitle: 'आधार जानकारी (UIDAI लिंक)',
    tagline: 'UIDAI Official Portal, e-Aadhaar & Verification Services',
    category: 'Aadhaar',
    portalUrl: 'https://uidai.gov.in/',
    iconType: 'aadhaar_info',
    badge: 'VERIFIED',
    badgeColor: 'emerald',
    isActive: true,
    priority: 3,
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
      },
      {
        id: 'sub_ai4',
        title: 'Check Aadhaar Bank Seeding Status',
        url: 'https://myaadhaar.uidai.gov.in/bank-seeding-status',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_pan_service',
    title: 'PAN Card Service',
    hindiTitle: 'पैन कार्ड सेवा',
    tagline: 'Income Tax e-Filing, NSDL Tin & UTIITSL Services',
    category: 'PAN & Tax',
    portalUrl: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/instant-e-pan',
    iconType: 'pan_service',
    badge: 'DIRECT',
    badgeColor: 'amber',
    isActive: true,
    priority: 4,
    subItems: [
      {
        id: 'sub_pan1',
        title: 'Mobile & Mail Update (NSDL)',
        url: 'https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan2',
        title: 'Address Update Free (NSDL)',
        url: 'https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan3',
        title: 'Link Aadhaar Status',
        url: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status',
        type: 'LINK'
      },
      {
        id: 'sub_pan4',
        title: 'Aadhaar to PAN link',
        url: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/bl-link-aadhaar',
        type: 'LINK'
      },
      {
        id: 'sub_pan5',
        title: 'New Pan Apply (NSDL)',
        url: 'https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan6',
        title: 'PAN Correction (NSDL)',
        url: 'https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan7',
        title: 'E-Pan Download (NSDL)',
        url: 'https://www.onlineservices.nsdl.com/paam/requestAndDownloadEPAN.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan8',
        title: 'PAN Track (NSDL)',
        url: 'https://tin.tin.nsdl.com/pantan/StatusTrack.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan9',
        title: 'Pan Card PVC Order (NSDL)',
        url: 'https://www.onlineservices.nsdl.com/paam/ReprintEPan.html',
        type: 'LINK'
      },
      {
        id: 'sub_pan10',
        title: 'Mobile & Mail Update (UTI)',
        url: 'https://www.pan.utiitsl.com/PAN_ONLINE/homereprint.action',
        type: 'LINK'
      },
      {
        id: 'sub_pan11',
        title: 'Address Update Free (UTI)',
        url: 'https://www.pan.utiitsl.com/PAN_ONLINE/addressUpdate.action',
        type: 'LINK'
      },
      {
        id: 'sub_pan12',
        title: 'New Pan Apply (UTI)',
        url: 'https://www.pan.utiitsl.com/PAN_ONLINE/ePANCard',
        type: 'LINK'
      },
      {
        id: 'sub_pan13',
        title: 'PAN Correction (UTI)',
        url: 'https://www.pan.utiitsl.com/PAN_ONLINE/panServices.action',
        type: 'LINK'
      },
      {
        id: 'sub_pan14',
        title: 'E-Pan Download (UTI)',
        url: 'https://www.pan.utiitsl.com/PAN_ONLINE/ePANCard',
        type: 'LINK'
      },
      {
        id: 'sub_pan15',
        title: 'PAN Track (UTI)',
        url: 'https://www.trackpan.utiitsl.com/PANONLINE_TRACK/trackApp',
        type: 'LINK'
      },
      {
        id: 'sub_pan16',
        title: 'Pan Card PVC Order (UTI)',
        url: 'https://www.pan.utiitsl.com/PAN_ONLINE/homereprint.action',
        type: 'LINK'
      },
      {
        id: 'sub_pan17',
        title: 'Instant PAN Apply',
        url: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/instant-e-pan',
        type: 'LINK'
      },
      {
        id: 'sub_pan18',
        title: 'Instant PAN Download',
        url: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/instant-e-pan',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_voter_service',
    title: 'Voter ID Correction & Status (NVSP)',
    hindiTitle: 'वोटर कार्ड संशोधन व स्टेटस',
    tagline: 'Election Commission of India (ECI) Voters Portal',
    category: 'Voter & Election',
    portalUrl: 'https://voters.eci.gov.in/',
    iconType: 'voter_service',
    badge: 'OFFICIAL ECI',
    badgeColor: 'purple',
    isActive: true,
    priority: 5,
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
      },
      {
        id: 'sub_v4',
        title: 'Track Application Status',
        url: 'https://voters.eci.gov.in/track-application',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_ayushman_service',
    title: 'Ayushman Bharat (PM-JAY)',
    hindiTitle: 'आयुष्मान भारत योजना',
    tagline: 'National Health Authority (NHA) Beneficiary Portal for ₹5 Lakh Free Health Care',
    category: 'Health & Welfare',
    portalUrl: 'https://beneficiary.nha.gov.in/',
    iconType: 'ayushman_service',
    badge: 'FREE ₹5 LAKH',
    badgeColor: 'emerald',
    isActive: true,
    priority: 6,
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
      },
      {
        id: 'sub_ay4',
        title: 'Download PMJAY Card',
        url: 'https://beneficiary.nha.gov.in/',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_dl_service',
    title: 'Driving Licence Service',
    hindiTitle: 'ड्राइविंग लाइसेंस सेवा',
    tagline: 'Sarathi Parivahan Portal — Apply for Learner License, DL Renewal & Slot Booking',
    category: 'Vehicle & Transport',
    portalUrl: 'https://sarathi.parivahan.gov.in/',
    iconType: 'dl_service',
    badge: 'SARATHI',
    badgeColor: 'indigo',
    isActive: true,
    priority: 7,
    subItems: [
      {
        id: 'sub_dl1',
        title: 'Sarathi Parivahan Portal',
        url: 'https://sarathi.parivahan.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_dl2',
        title: 'Apply for Learner License',
        url: 'https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do',
        type: 'LINK'
      },
      {
        id: 'sub_dl3',
        title: 'Driving License Status',
        url: 'https://sarathi.parivahan.gov.in/sarathiservice/applViewStatus.do',
        type: 'LINK'
      },
      {
        id: 'sub_dl4',
        title: 'LL / DL Test Guidelines & Syllabus',
        url: 'https://parivahan.gov.in/parivahan//sites/default/files/DL_Guidelines.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_rc_service',
    title: 'RC Service (Registration...)',
    hindiTitle: 'गाड़ी आरसी (RC) सेवाएं',
    tagline: 'Vahan Citizen Portal — Vehicle Registration Status & Ownership Transfer',
    category: 'Vehicle & Transport',
    portalUrl: 'https://vahan.parivahan.gov.in/',
    iconType: 'rc_service',
    badge: 'VAHAN',
    badgeColor: 'blue',
    isActive: true,
    priority: 8,
    subItems: [
      {
        id: 'sub_rc1',
        title: 'Vahan Parivahan Portal',
        url: 'https://vahan.parivahan.gov.in/vahanservice/',
        type: 'LINK'
      },
      {
        id: 'sub_rc2',
        title: 'RC Status Online',
        url: 'https://vahan.parivahan.gov.in/vahanservice/vahan/ui/appl_status/form_Status_view.xhtml',
        type: 'LINK'
      },
      {
        id: 'sub_rc3',
        title: 'Transfer of Ownership Form (Form 29/30)',
        url: 'https://parivahan.gov.in/parivahan//sites/default/files/form29.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_vehicle_service',
    title: 'Vehicle Service',
    hindiTitle: 'वाहन सेवाएं व टैक्स',
    tagline: 'MoRTH Parivahan Sewa — Road Tax, Fitness & Commercial Vehicle Services',
    category: 'Vehicle & Transport',
    portalUrl: 'https://parivahan.gov.in/',
    iconType: 'vehicle_service',
    badge: 'PARIVAHAN',
    badgeColor: 'amber',
    isActive: true,
    priority: 9,
    subItems: [
      {
        id: 'sub_vs1',
        title: 'Parivahan Sewa Dashboard',
        url: 'https://parivahan.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_vs2',
        title: 'Pay Road Tax Online',
        url: 'https://vahan.parivahan.gov.in/vahanservice/vahan/ui/statevalidation/homepage.xhtml',
        type: 'LINK'
      },
      {
        id: 'sub_vs3',
        title: 'Fitness Certificate Status',
        url: 'https://vahan.parivahan.gov.in/',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_birth_death',
    title: 'Birth & Death Cirtificate',
    hindiTitle: 'जन्म एवं मृत्यु प्रमाण पत्र',
    tagline: 'Civil Registration System (CRS) Portal for Birth & Death Certificates',
    category: 'Certificates & Revenue',
    portalUrl: 'https://crsorgi.gov.in/',
    iconType: 'birth_death',
    badge: 'CRS ORGI',
    badgeColor: 'emerald',
    isActive: true,
    priority: 10,
    subItems: [
      {
        id: 'sub_bd1',
        title: 'CRS Civil Registration System',
        url: 'https://crsorgi.gov.in/web/index.php/auth/login',
        type: 'LINK'
      },
      {
        id: 'sub_bd2',
        title: 'Birth Certificate Application Guide',
        url: 'https://crsorgi.gov.in/web/uploads/Guidelines_Birth_Death_Registration.pdf',
        type: 'PDF'
      },
      {
        id: 'sub_bd3',
        title: 'Verify Certificate Online',
        url: 'https://crsorgi.gov.in/',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_echallan',
    title: 'E-Challan',
    hindiTitle: 'ई-चालान भुगतान व स्टेटस',
    tagline: 'Digital Traffic Enforcement Portal — Check & Pay Pending Challan Online',
    category: 'Vehicle & Transport',
    portalUrl: 'https://echallan.parivahan.gov.in/',
    iconType: 'echallan',
    badge: 'TRAFFIC',
    badgeColor: 'rose',
    isActive: true,
    priority: 11,
    subItems: [
      {
        id: 'sub_ec1',
        title: 'E-Challan Digital Traffic Transport',
        url: 'https://echallan.parivahan.gov.in/index/accused-challan',
        type: 'LINK'
      },
      {
        id: 'sub_ec2',
        title: 'Check & Pay Challan Status',
        url: 'https://echallan.parivahan.gov.in/index/accused-challan',
        type: 'LINK'
      },
      {
        id: 'sub_ec3',
        title: 'Virtual Court Settlement',
        url: 'https://vcourts.gov.in/virtualcourt/',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_eshram',
    title: 'E-Shram Card',
    hindiTitle: 'ई-श्रम कार्ड (असंगठित कर्मकार)',
    tagline: 'Ministry of Labour & Employment — Unorganised Workers Portal (₹2 Lakh Accident Insurance)',
    category: 'Employment & Career',
    portalUrl: 'https://eshram.gov.in/',
    iconType: 'eshram',
    badge: 'LABOUR',
    badgeColor: 'cyan',
    isActive: true,
    priority: 12,
    subItems: [
      {
        id: 'sub_es1',
        title: 'e-Shram Self Registration',
        url: 'https://register.eshram.gov.in/#/user/self',
        type: 'LINK'
      },
      {
        id: 'sub_es2',
        title: 'Update e-Shram Profile',
        url: 'https://register.eshram.gov.in/#/user/already-registered',
        type: 'LINK'
      },
      {
        id: 'sub_es3',
        title: 'Scheme Guidelines & Benefits',
        url: 'https://eshram.gov.in/guidelines',
        type: 'PDF'
      },
      {
        id: 'sub_es4',
        title: 'Download UAN Card',
        url: 'https://register.eshram.gov.in/#/user/already-registered',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_apaar',
    title: 'APAAR ID Card',
    hindiTitle: 'अपार आईडी कार्ड (वन नेशन वन स्टूडेंट)',
    tagline: 'Automated Permanent Academic Account Registry — One Nation, One Student ID',
    category: 'Education & Student',
    portalUrl: 'https://apaar.education.gov.in/',
    iconType: 'apaar',
    badge: 'STUDENT ID',
    badgeColor: 'indigo',
    isActive: true,
    priority: 13,
    subItems: [
      {
        id: 'sub_ap1',
        title: 'APAAR / One Nation One Student ID',
        url: 'https://apaar.education.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_ap2',
        title: 'Digilocker APAAR Linking',
        url: 'https://www.digilocker.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_ap3',
        title: 'APAAR Creation Guidelines',
        url: 'https://apaar.education.gov.in/assets/docs/APAAR_User_Manual.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_abha',
    title: 'ABHA Card (Ayushman Bharat...)',
    hindiTitle: 'आभा हेल्थ कार्ड (ABHA ID)',
    tagline: 'Ayushman Bharat Health Account — 14 Digit Digital Health ID creation',
    category: 'Health & Welfare',
    portalUrl: 'https://abha.abdm.gov.in/abha/v3/',
    iconType: 'abha',
    badge: 'HEALTH ID',
    badgeColor: 'blue',
    isActive: true,
    priority: 14,
    subItems: [
      {
        id: 'sub_abh1',
        title: 'ABHA Number Creation',
        url: 'https://abha.abdm.gov.in/abha/v3/register',
        type: 'LINK'
      },
      {
        id: 'sub_abh2',
        title: 'Download ABHA Digital Health Card',
        url: 'https://abha.abdm.gov.in/abha/v3/login',
        type: 'LINK'
      },
      {
        id: 'sub_abh3',
        title: 'ABHA Scheme Guidelines',
        url: 'https://abdm.gov.in/assets/uploads/ABHA_Guidelines.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_pmfby',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    hindiTitle: 'प्रधानमंत्री फसल बीमा योजना',
    tagline: 'Crop Insurance Portal for Indian Farmers — Apply, Claim & Track Status',
    category: 'Farmer & Agriculture',
    portalUrl: 'https://pmfby.gov.in/',
    iconType: 'pmfby',
    badge: 'CROP INSURANCE',
    badgeColor: 'emerald',
    isActive: true,
    priority: 15,
    subItems: [
      {
        id: 'sub_pmf1',
        title: 'PMFBY Official Farmer Portal',
        url: 'https://pmfby.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_pmf2',
        title: 'Crop Insurance Calculator',
        url: 'https://pmfby.gov.in/premiumCalculator',
        type: 'LINK'
      },
      {
        id: 'sub_pmf3',
        title: 'Claim Status & Guidelines',
        url: 'https://pmfby.gov.in/pdf/Revised_Operational_Guidelines.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_pmay_g',
    title: 'PMAY-Gramin (Pradhan Mantri...)',
    hindiTitle: 'प्रधानमंत्री आवास योजना (ग्रामीण)',
    tagline: 'Rural Housing Scheme Beneficiary Search, Installment Status & FTO Tracking',
    category: 'Housing & Schemes',
    portalUrl: 'https://pmayg.nic.in/',
    iconType: 'pmay_g',
    badge: 'RURAL HOUSING',
    badgeColor: 'amber',
    isActive: true,
    priority: 16,
    subItems: [
      {
        id: 'sub_pmg1',
        title: 'PMAY-G Beneficiary Search',
        url: 'https://awaassoft.nic.in/netiay/Benificiary.aspx',
        type: 'LINK'
      },
      {
        id: 'sub_pmg2',
        title: 'FTO Tracking Online',
        url: 'https://awaassoft.nic.in/netiay/fto_tracking.aspx',
        type: 'LINK'
      },
      {
        id: 'sub_pmg3',
        title: 'Rural Housing Guidelines',
        url: 'https://pmayg.nic.in/netiay/Uploaded/PMAYG_Guidelines.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_pmay_u',
    title: 'PMAY-Urban/Sehri (Pradhan Mantri...)',
    hindiTitle: 'प्रधानमंत्री आवास योजना (शहरी)',
    tagline: 'Urban Housing for All Mission — Beneficiary Assessment & Subsidy Tracking',
    category: 'Housing & Schemes',
    portalUrl: 'https://pmaymis.gov.in/',
    iconType: 'pmay_u',
    badge: 'URBAN HOUSING',
    badgeColor: 'rose',
    isActive: true,
    priority: 17,
    subItems: [
      {
        id: 'sub_pmu1',
        title: 'PMAY-U Beneficiary Status',
        url: 'https://pmaymis.gov.in/Track_Application_Status.aspx',
        type: 'LINK'
      },
      {
        id: 'sub_pmu2',
        title: 'Assessment Form Search',
        url: 'https://pmaymis.gov.in/Search_Beneficiary_Details.aspx',
        type: 'LINK'
      },
      {
        id: 'sub_pmu3',
        title: 'Urban Mission Guidelines',
        url: 'https://pmay-urban.gov.in/uploads/guidelines/624ea88746cba-PMAY-U-Guidelines.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_epfo',
    title: "EPFO (Employee's Provident Fund)",
    hindiTitle: 'कर्मचारी भविष्य निधि संगठन (EPFO)',
    tagline: 'EPFO Member Passbook, UAN Portal, Online Claim & PF Balance',
    category: 'Employment & Career',
    portalUrl: 'https://passbook.epfindia.gov.in/MemberPassBook/Login',
    iconType: 'epfo',
    badge: 'UAN LOGIN',
    badgeColor: 'cyan',
    isActive: true,
    priority: 18,
    subItems: [
      {
        id: 'sub_ep1',
        title: 'EPFO Member Passbook',
        url: 'https://passbook.epfindia.gov.in/MemberPassBook/Login',
        type: 'LINK'
      },
      {
        id: 'sub_ep2',
        title: 'Unified Member Portal (UAN)',
        url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
        type: 'LINK'
      },
      {
        id: 'sub_ep3',
        title: 'Claim & Withdrawal Guidelines',
        url: 'https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/User_Manual_EPF_Claim.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_lic',
    title: 'LIC (Life Insurance Corporation)',
    hindiTitle: 'भारतीय जीवन बीमा निगम (LIC)',
    tagline: 'LIC Customer Portal — Pay Premium Online, Policy Status & Renewal',
    category: 'Insurance & Investment',
    portalUrl: 'https://licindia.in/',
    iconType: 'lic',
    badge: 'INSURANCE',
    badgeColor: 'rose',
    isActive: true,
    priority: 19,
    subItems: [
      {
        id: 'sub_lic1',
        title: 'LIC Customer Portal',
        url: 'https://ebiz.licindia.in/b2c/login',
        type: 'LINK'
      },
      {
        id: 'sub_lic2',
        title: 'Pay Premium Online (Direct)',
        url: 'https://ebiz.licindia.in/b2c/directPay',
        type: 'LINK'
      },
      {
        id: 'sub_lic3',
        title: 'Policy Status Tracker',
        url: 'https://licindia.in/Customer-Services/Policy-Status',
        type: 'LINK'
      }
    ]
  },
  {
    id: 'pub_enam',
    title: 'E-Nam',
    hindiTitle: 'राष्ट्रीय कृषि बाजार (e-NAM)',
    tagline: 'National Agriculture Market — Online Trading Platform for Agricultural Commodities',
    category: 'Farmer & Agriculture',
    portalUrl: 'https://enam.gov.in/web/',
    iconType: 'enam',
    badge: 'AGRI MARKET',
    badgeColor: 'emerald',
    isActive: true,
    priority: 20,
    subItems: [
      {
        id: 'sub_en1',
        title: 'e-NAM National Agriculture Portal',
        url: 'https://enam.gov.in/web/',
        type: 'LINK'
      },
      {
        id: 'sub_en2',
        title: 'Mandi Commodity Prices',
        url: 'https://enam.gov.in/web/dashboard/trade-data',
        type: 'LINK'
      },
      {
        id: 'sub_en3',
        title: 'Farmer Registration Manual',
        url: 'https://enam.gov.in/web/resources/pdf/User_Manual_Farmer.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_pm_kisan',
    title: 'PM-Kisan Samman Nidhi',
    hindiTitle: 'पीएम किसान सम्मान निधि योजना',
    tagline: 'Direct Benefit Transfer of ₹6,000/yr for Farmers — Beneficiary Status & eKYC',
    category: 'Farmer & Agriculture',
    portalUrl: 'https://pmkisan.gov.in/',
    iconType: 'pm_kisan',
    badge: '₹6000 DBT',
    badgeColor: 'emerald',
    isActive: true,
    priority: 21,
    subItems: [
      {
        id: 'sub_pmk1',
        title: 'PM Kisan Official Portal',
        url: 'https://pmkisan.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_pmk2',
        title: 'Beneficiary Status & eKYC',
        url: 'https://pmkisan.gov.in/BeneficiaryStatus_New.aspx',
        type: 'LINK'
      },
      {
        id: 'sub_pmk3',
        title: 'PM-Kisan Scheme Guidelines',
        url: 'https://pmkisan.gov.in/Documents/OperationalGuidelines.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 'pub_pm_surya_ghar',
    title: 'PM Surya Ghar (Solar Rooftop)',
    hindiTitle: 'पीएम सूर्य घर मुफ्त बिजली योजना',
    tagline: 'Up to ₹78,000 Subsidy for Rooftop Solar Plant Installation',
    category: 'Energy & Utility',
    portalUrl: 'https://pmsuryaghar.gov.in/',
    iconType: 'pm_surya_ghar',
    badge: 'SOLAR SUBSIDY',
    badgeColor: 'amber',
    isActive: true,
    priority: 22,
    subItems: [
      {
        id: 'sub_pms1',
        title: 'PM Surya Ghar National Portal',
        url: 'https://pmsuryaghar.gov.in/',
        type: 'LINK'
      },
      {
        id: 'sub_pms2',
        title: 'Subsidy Calculator',
        url: 'https://pmsuryaghar.gov.in/subsidy-calculator',
        type: 'LINK'
      },
      {
        id: 'sub_pms3',
        title: 'Solar Installation Guidelines',
        url: 'https://pmsuryaghar.gov.in/docs/PM_Surya_Ghar_Guidelines.pdf',
        type: 'PDF'
      }
    ]
  }
];
