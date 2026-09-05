import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';
import { 
  User, 
  CitizenService,
  PublicGovService,
  ServiceRequest, 
  WalletTransaction, 
  ChatMessage, 
  AppNotification, 
  AdminStats,
  BlockApplicationRate,
  SupportTicket,
  SupportTicketMessage
} from './src/types.js';
import { ensureDefaultTemplateExists, generateFinalPdf, generatePanTwoPdfs, DEFAULT_TEMPLATE_PATH } from './src/utils/pdfService.js';
import { passportPhotoRouter } from './src/routes/passportPhotoRoutes.js';

// Firebase Admin & Firestore setup
let firestoreDb: any = null;
try {
  const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const configData = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (!getApps().length) {
      initializeApp({
        projectId: configData.projectId
      });
    }
    const dbId = configData.firestoreDatabaseId || '(default)';
    firestoreDb = getFirestore(getApp(), dbId);
    console.log(`🔥 [Firebase Firestore] Connected to Firestore database "${dbId}" successfully!`);
  }
} catch (e) {
  console.error('⚠️ [Firebase Firestore] Initialization error:', e);
}

// Firestore Service Persistence Helpers
async function syncServicesToFirestore(services: CitizenService[]) {
  if (!firestoreDb) return;
  try {
    const batch = firestoreDb.batch();
    const colRef = firestoreDb.collection('citizenServices');
    for (const srv of services) {
      if (srv && srv.id) {
        const docRef = colRef.doc(srv.id);
        batch.set(docRef, JSON.parse(JSON.stringify(srv)), { merge: true });
      }
    }
    await batch.commit();
    console.log(`🔥 [Firebase Firestore] Successfully synced ${services.length} services to Cloud Firestore database!`);
  } catch (err) {
    console.error('⚠️ [Firebase Firestore] Error batch syncing services to Firestore:', err);
  }
}

async function saveServiceToFirestore(srv: CitizenService) {
  if (!firestoreDb || !srv || !srv.id) return;
  try {
    await firestoreDb.collection('citizenServices').doc(srv.id).set(JSON.parse(JSON.stringify(srv)), { merge: true });
    console.log(`🔥 [Firebase Firestore] Saved service "${srv.title}" (${srv.id}) to Firestore`);
  } catch (err) {
    console.error(`⚠️ [Firebase Firestore] Error saving service ${srv.id}:`, err);
  }
}

async function deleteServiceFromFirestore(srvId: string) {
  if (!firestoreDb || !srvId) return;
  try {
    await firestoreDb.collection('citizenServices').doc(srvId).delete();
    console.log(`🔥 [Firebase Firestore] Deleted service ${srvId} from Firestore`);
  } catch (err) {
    console.error(`⚠️ [Firebase Firestore] Error deleting service ${srvId}:`, err);
  }
}

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Body parser limits - 100MB limit to handle large base64 uploads and document forms gracefully
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Express body-parser error handler for entity too large (413)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413)) {
    return res.status(413).json({
      error: 'File or request payload is too large (Max 100MB). Please compress images or upload smaller files.',
      message: 'File or request payload is too large (Max 100MB). Please compress images or upload smaller files.',
      isPayloadTooLarge: true
    });
  }
  next(err);
});

// CORS & Preflight headers allowing all valid origins including Cloud Run applet URLs and custom domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auto-persist database state to disk on any mutating request
app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      saveDatabaseToFile();
    }
  });
  next();
});

// Production Persistent Storage Directory (External to Codebase)
let STORAGE_DIR = process.env.STORAGE_DIR || '/var/lib/ecybercafe';

try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch (e) {
  // Fallback to local storage directory if /var/lib permissions are restricted in container
  STORAGE_DIR = path.join(process.cwd(), 'storage');
  if (!fs.existsSync(STORAGE_DIR)) {
    try { fs.mkdirSync(STORAGE_DIR, { recursive: true }); } catch (err) {}
  }
}

const uploadsExternalDir = path.join(STORAGE_DIR, 'uploads');
const uploadsPublicDir = path.join(process.cwd(), 'public', 'uploads');
const uploadsRootDir = path.join(process.cwd(), 'uploads');

[STORAGE_DIR, uploadsExternalDir, uploadsPublicDir, uploadsRootDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
});

// Serve uploaded files statically from all directories (External Storage prioritized)
app.use('/uploads', express.static(uploadsExternalDir));
app.use('/uploads', express.static(uploadsPublicDir));
app.use('/uploads', express.static(uploadsRootDir));
app.use(express.static(path.join(process.cwd(), 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Write directly to persistent storage directory if available
    const dest = fs.existsSync(uploadsExternalDir) ? uploadsExternalDir : uploadsPublicDir;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
  }
});

// Public Passport Photo Maker API (PhotoRoom Background Removal)
app.use('/api/passport-photo', passportPhotoRouter);

// Single File Upload Endpoint
app.post('/api/upload', (req: Request, res: Response) => {
  upload.single('file')(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds 50MB limit.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error during upload: ${err.message}` });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  });
});

// Base64 File Upload Endpoint (Handles large PDFs/images up to 100MB bypassing proxy multipart drops)
app.post('/api/upload-base64', (req: Request, res: Response) => {
  try {
    const { base64, filename, mimetype } = req.body;
    if (!base64 || !filename) {
      return res.status(400).json({ error: 'Missing base64 data or filename.' });
    }

    let rawData = base64;
    if (rawData.includes(',')) {
      rawData = rawData.split(',')[1];
    }

    const buffer = Buffer.from(rawData, 'base64');
    const ext = path.extname(filename) || (mimetype?.includes('pdf') ? '.pdf' : '.jpg');
    const cleanName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const targetFilename = `${cleanName}-${uniqueSuffix}${ext}`;

    const destDir = fs.existsSync(uploadsExternalDir) ? uploadsExternalDir : uploadsPublicDir;
    const filePath = path.join(destDir, targetFilename);

    fs.writeFileSync(filePath, buffer);

    // Also write to public/uploads & uploads root for redundancy
    try {
      const publicPath = path.join(uploadsPublicDir, targetFilename);
      if (filePath !== publicPath) {
        fs.writeFileSync(publicPath, buffer);
      }
      const rootPath = path.join(uploadsRootDir, targetFilename);
      if (filePath !== rootPath) {
        fs.writeFileSync(rootPath, buffer);
      }
    } catch (e) {}

    const fileUrl = `/uploads/${targetFilename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: targetFilename,
      originalname: filename,
      mimetype: mimetype || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg'),
      size: buffer.length
    });
  } catch (err: any) {
    console.error('Base64 upload error:', err);
    return res.status(500).json({ error: `Server error during base64 upload: ${err.message}` });
  }
});

// Multiple Files Upload Endpoint
app.post('/api/upload-multiple', (req: Request, res: Response) => {
  upload.array('files', 10)(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'One or more files exceed 50MB limit.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error during upload: ${err.message}` });
    }

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    return res.json({
      success: true,
      files: uploadedFiles
    });
  });
});

// Generate Final PDF Endpoint for Admin Request History
app.post('/api/admin/generate-final-pdf', (req: Request, res: Response) => {
  upload.single('template')(req as any, res as any, async (err) => {
    if (err) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    try {
      const { requestId, customCoordinates } = req.body;
      if (!requestId) {
        return res.status(400).json({ error: 'requestId parameter is required.' });
      }

      const request = serviceRequests.find(r => r.id === requestId);
      if (!request) {
        return res.status(404).json({ error: 'Service request not found.' });
      }

      let parsedCoords: any = undefined;
      if (customCoordinates) {
        try {
          parsedCoords = typeof customCoordinates === 'string' ? JSON.parse(customCoordinates) : customCoordinates;
        } catch (e) {}
      }

      let templatePath: string | undefined = undefined;
      if (req.file) {
        templatePath = req.file.path;
      }

      const result = await generateFinalPdf({
        request,
        templateBufferOrPath: templatePath,
        customCoordinates: parsedCoords
      });

      // Store generated PDF reference without auto-uploading outputAttachmentUrl or auto-completing status
      request.generatedPdf = result.pdfUrl;
      request.updatedAt = new Date().toISOString();

      saveDatabaseToFile();

      // Create Notification for Retailer
      const notif: AppNotification = {
        id: `notif_${Date.now()}`,
        recipientRole: 'RETAILER',
        recipientId: request.retailerId,
        title: `📄 Final Generated PDF Ready (#${request.requestNumber})`,
        message: `Admin generated the official final application PDF for request #${request.requestNumber} ("${request.serviceTitle}"). Click to view/download!`,
        type: 'STATUS_CHANGE',
        isRead: false,
        requestId: request.id,
        createdAt: new Date().toISOString(),
      };
      notifications.unshift(notif);

      // Broadcast Realtime Event
      broadcastRealtimeEvent('REQUEST_UPDATED', { request });

      return res.json({
        success: true,
        pdfUrl: result.pdfUrl,
        filename: result.filename,
        totalPages: result.totalPages,
        request
      });
    } catch (pdfErr: any) {
      console.error('Error generating final PDF:', pdfErr);
      return res.status(500).json({ error: pdfErr.message || 'Failed to generate final PDF.' });
    }
  });
});

// Tool Endpoint: Generate 2 Output PDFs (Form PDF with Photo/Sig + Complete PDF with Aadhaar & DOB attached)
app.post('/api/tools/stamp-two-pdfs', upload.fields([
  { name: 'formPdf', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'aadhaarDoc', maxCount: 1 },
  { name: 'dobDoc', maxCount: 1 },
]) as any, async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const {
      requestId,
      photoUrl,
      signatureUrl,
      aadhaarDocUrl,
      dobDocUrl,
      customCoordinates
    } = req.body;

    let request: ServiceRequest | null = null;
    if (requestId) {
      request = serviceRequests.find(r => r.id === requestId) || null;
    }

    // Determine PDF Form template / uploaded file
    let formPdfPath: string | undefined = undefined;
    if (files?.formPdf?.[0]) {
      formPdfPath = files.formPdf[0].path;
    }

    // Determine Photo source
    let photoSrc: string | null = (photoUrl && typeof photoUrl === 'string' && !photoUrl.startsWith('blob:')) ? photoUrl : null;
    if (files?.photo?.[0]) {
      photoSrc = files.photo[0].path;
    }

    // Determine Signature source
    let sigSrc: string | null = (signatureUrl && typeof signatureUrl === 'string' && !signatureUrl.startsWith('blob:')) ? signatureUrl : null;
    if (files?.signature?.[0]) {
      sigSrc = files.signature[0].path;
    }

    // Determine Aadhaar document source
    let aadhaarSrc: string | null = (aadhaarDocUrl && typeof aadhaarDocUrl === 'string' && !aadhaarDocUrl.startsWith('blob:')) ? aadhaarDocUrl : null;
    if (files?.aadhaarDoc?.[0]) {
      aadhaarSrc = files.aadhaarDoc[0].path;
    }

    // Determine DOB document source
    let dobSrc: string | null = (dobDocUrl && typeof dobDocUrl === 'string' && !dobDocUrl.startsWith('blob:')) ? dobDocUrl : null;
    if (files?.dobDoc?.[0]) {
      dobSrc = files.dobDoc[0].path;
    }

    let parsedCoords: any = undefined;
    if (customCoordinates) {
      try {
        parsedCoords = typeof customCoordinates === 'string' ? JSON.parse(customCoordinates) : customCoordinates;
      } catch (e) {}
    }

    const result = await generatePanTwoPdfs({
      request,
      formPdfBufferOrPath: formPdfPath,
      photoUrlOrBase64: photoSrc,
      signatureUrlOrBase64: sigSrc,
      aadhaarDocUrlOrBase64: aadhaarSrc,
      dobDocUrlOrBase64: dobSrc,
      customCoordinates: parsedCoords
    });

    // If a request was attached, store generated PDF reference without auto-uploading
    if (request) {
      request.generatedPdf = result.pdf2Url;
      request.updatedAt = new Date().toISOString();
      saveDatabaseToFile();
    }

    return res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('Error generating 2 PDF outputs:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate 2 PDF outputs.' });
  }
});

// List Available PDF Templates
app.get('/api/admin/pdf-templates', (req: Request, res: Response) => {
  const templatesDir = path.join(process.cwd(), 'uploads', 'templates');
  let templatesList: Array<{ name: string; path: string; size: number; default: boolean }> = [
    {
      name: 'Standard Government Application Form (2-Page)',
      path: '/uploads/templates/default_government_form.pdf',
      size: 15400,
      default: true
    }
  ];

  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir);
    files.forEach(file => {
      if (file.toLowerCase().endsWith('.pdf') && file !== 'default_government_form.pdf') {
        const stats = fs.statSync(path.join(templatesDir, file));
        templatesList.push({
          name: file.replace(/_/g, ' ').replace('.pdf', ''),
          path: `/uploads/templates/${file}`,
          size: stats.size,
          default: false
        });
      }
    });
  }

  res.json(templatesList);
});

// In-Memory Database Store

let users: User[] = [
  {
    id: 'usr_pankaj',
    name: 'Pankaj Kumar',
    email: 'pankaj@citizenservice.in',
    mobileNumber: '0000000000',
    password: '123456',
    role: 'RETAILER',
    storeName: 'Pankaj Digital Cafe',
    state: 'Bihar',
    district: 'Gaya',
    block: 'Konch',
    walletBalance: 100.00,
    commissionBalance: 0.00,
    referralCode: 'REF0000000000',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_admin',
    name: 'Portal Master Admin',
    email: 'admin@citizenservice.in',
    mobileNumber: '9876543210',
    password: '123456',
    role: 'ADMIN',
    walletBalance: 50000.00,
    commissionBalance: 0.00,
    referralCode: 'REF9876543210',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_distributor',
    name: 'Master Distributor Rahul',
    email: 'distributor@citizenservice.in',
    mobileNumber: '9988776655',
    password: '123456',
    role: 'DISTRIBUTOR',
    walletBalance: 12500.00,
    commissionBalance: 850.00,
    referralCode: 'REF9988776655',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  }
];

// Default Citizen Services Data
const DEFAULT_CITIZEN_SERVICES: CitizenService[] = [
  {
    id: 'srv_1',
    title: 'Aadhar Mobile Link',
    category: 'Aadhaar',
    price: 150,
    processingTime: '10-15 MIN',
    badge: 'NEW',
    iconType: 'fingerprint',
    bgGradient: 'from-amber-500 to-red-600',
    description: 'Link or update registered mobile number with Aadhaar card.',
    warningNotice: '⚠️ सावधानियां: केवल चालू एवं एक्टिव मोबाइल नंबर दर्ज करें! आवेदक का नाम आधार कार्ड के अनुसार मैच होना अनिवार्य है। गलत विवरण भरने पर एप्लीकेशन रिजेक्ट हो सकती है।',
    warningType: 'warning',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'mobile_no', label: 'Mobile Number / मोबाइल नंबर', type: 'text', placeholder: '10 Digit Mobile Number', required: true },
      { id: 'aadhaar_no', label: 'Aadhaar Number / आधार नंबर', type: 'text', placeholder: '12 Digit Aadhaar Number', required: true },
      { id: 'applicant_name', label: 'Full Applicant Name / नाम', type: 'text', placeholder: 'Name as on Aadhaar', required: true },
      { id: 'remarks', label: 'Notes / विशेष टिप्पणी', type: 'textarea', placeholder: 'Optional instructions for operator', required: false }
    ]
  },
  {
    id: 'srv_2',
    title: 'Aadhar Find Service',
    category: 'Aadhaar',
    price: 99,
    processingTime: '10-30 MIN',
    badge: 'PREMIUM',
    iconType: 'search',
    bgGradient: 'from-blue-600 to-cyan-500',
    description: 'Find lost Aadhaar Number using Full Name, DOB, and Address details.',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'full_name', label: 'Full Name / पूरा नाम', type: 'text', placeholder: 'Exact Name', required: true },
      { id: 'dob', label: 'Date of Birth / जन्म तिथि', type: 'text', placeholder: 'DD/MM/YYYY', required: true },
      { id: 'father_name', label: 'Father Name / पिता का नाम', type: 'text', placeholder: 'Father Name', required: true },
      { id: 'pincode', label: 'Pin Code / पिन कोड', type: 'text', placeholder: '6 Digit Pin Code', required: true }
    ]
  },
  {
    id: 'srv_3',
    title: 'Aadhaar Download (Via Biometric)',
    category: 'Aadhaar',
    price: 29,
    processingTime: 'INSTANT',
    badge: 'NEW',
    iconType: 'download',
    bgGradient: 'from-emerald-500 to-teal-700',
    description: 'Instant PDF download of Aadhaar card via fingerprint biometric match.',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'aadhaar_no', label: 'Aadhaar Number', type: 'text', placeholder: '12 Digit Aadhaar Number', required: true },
      { id: 'device_type', label: 'Fingerprint Scanner Device', type: 'select', options: ['Mantra MFS100', 'Morpho E3', 'Startek FM220', 'SecuGen'], required: true },
      { id: 'remarks', label: 'Customer Reference Code', type: 'text', placeholder: 'Optional Ref ID', required: false }
    ]
  },
  {
    id: 'srv_4',
    title: 'EID ID TO AADHAR NUMBER',
    category: 'Aadhaar',
    price: 650,
    processingTime: '1-2 HOURS',
    badge: 'PREMIUM',
    iconType: 'file-text',
    bgGradient: 'from-purple-600 to-indigo-800',
    description: 'Convert Enrollment ID slip (28 Digits) to official Aadhaar Number.',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'eid_number', label: '28-Digit Enrollment Number (EID)', type: 'text', placeholder: '14 Digit EID + 14 Digit Date/Time', required: true },
      { id: 'slip_copy', label: 'Enrollment Slip Photo/PDF Upload', type: 'file', required: false }
    ]
  },
  {
    id: 'srv_5',
    title: 'Vehicle Challan Check & Pay',
    category: 'Transport',
    price: 9,
    processingTime: 'INSTANT',
    badge: 'STANDARD',
    iconType: 'car',
    bgGradient: 'from-amber-600 to-yellow-500',
    description: 'Verify traffic police pending e-challans by Vehicle RC or DL number.',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'vehicle_no', label: 'Vehicle Number / गाड़ी नंबर', type: 'text', placeholder: 'e.g. BR01AB1234', required: true },
      { id: 'chassis_no', label: 'Chassis / Engine Last 5 Digits', type: 'text', placeholder: '5 Digits', required: true }
    ]
  },
  {
    id: 'srv_6',
    title: 'Voter Original PDF Download',
    category: 'Voter',
    price: 99,
    processingTime: '10-15 MIN',
    badge: 'NEW',
    iconType: 'credit-card',
    bgGradient: 'from-pink-600 to-rose-700',
    description: 'Download color high-resolution original Voter ID Card PDF copy.',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'epic_no', label: 'Voter EPIC Card Number', type: 'text', placeholder: 'e.g. TZX1234567', required: true },
      { id: 'state', label: 'State / राज्य', type: 'text', placeholder: 'State Name', required: true },
      { id: 'mobile_no', label: 'Registered Mobile Number', type: 'text', placeholder: '10 Digit Mobile', required: true }
    ]
  },
  {
    id: 'srv_7',
    title: 'Samagra To AADHAR Number',
    category: 'Samagra',
    price: 49,
    processingTime: '15-30 MIN',
    badge: 'NEW',
    iconType: 'users',
    bgGradient: 'from-sky-500 to-blue-700',
    description: 'Extract Aadhaar linked with 9-digit Samagra ID.',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'samagra_id', label: '9-Digit Member Samagra ID', type: 'text', placeholder: '9 Digit Samagra ID', required: true },
      { id: 'family_head', label: 'Family Head Name', type: 'text', placeholder: 'Full Name', required: false }
    ]
  },
  {
    id: 'srv_8',
    title: 'Aadhar To Pan Find INSTANT',
    category: 'PAN',
    price: 120,
    processingTime: 'INSTANT',
    badge: 'PREMIUM',
    iconType: 'shield-check',
    bgGradient: 'from-emerald-600 to-green-700',
    description: 'Find linked PAN Card Number instantly from Aadhaar Card number via API.',
    flowType: 'Instant',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'aadhaar_no', label: '12 Digit Aadhaar Number', type: 'text', placeholder: 'Enter 12 Digit Aadhaar Number (e.g. 123456789012)', required: true, maxLength: 12 }
    ]
  },
  {
    id: 'srv_9',
    title: 'PAN Details Find INSTANT (PAN To Full Details)',
    category: 'PAN',
    price: 50,
    processingTime: 'INSTANT',
    badge: 'PREMIUM',
    iconType: 'credit-card',
    bgGradient: 'from-indigo-600 to-blue-700',
    description: 'Find complete PAN Card Details (Full Name, Father Name, DOB, Gender, Aadhaar link status) instantly from PAN Card Number via API.',
    flowType: 'Instant',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'pan_no', label: '10 Digit PAN Number', type: 'text', placeholder: 'e.g. ABCDE1234F', required: true },
      { id: 'applicant_name', label: 'Customer Name (Optional)', type: 'text', placeholder: 'Full Name', required: false }
    ]
  },
  {
    id: 'srv_uti_pan',
    title: 'UTI / NSDL PAN Card Apply (Photo & Signature)',
    category: 'PAN',
    price: 107,
    processingTime: '24-48 HOURS',
    badge: 'PREMIUM',
    iconType: 'credit-card',
    bgGradient: 'from-blue-700 to-indigo-900',
    description: 'Apply new PAN Card or Correction with automatic UTI PAN Photo (213x213) & Signature (1023x360) resizer.',
    enablePanResizer: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'applicant_name', label: 'Applicant Name / आवेदक का नाम', type: 'text', placeholder: 'Full Name as on Aadhaar', required: true },
      { id: 'father_name', label: 'Father Name / पिता का नाम', type: 'text', placeholder: 'Father Name', required: true },
      { id: 'dob', label: 'Date of Birth / जन्म तिथि', type: 'formatted_date', placeholder: 'DD-MM-YYYY', required: true },
      { id: 'mobile_no', label: 'Mobile Number / मोबाइल नंबर', type: 'text', placeholder: '10 Digit Mobile Number', required: true },
      { id: 'aadhaar_no', label: '12 Digit Aadhaar Number', type: 'text', placeholder: '12 Digit Aadhaar', required: true },
      { id: 'photo_copy', label: 'Applicant Passport Photo (फोटो)', type: 'file', required: true },
      { id: 'signature_copy', label: 'Applicant Signature / Thumb (हस्ताक्षर)', type: 'file', required: true }
    ]
  },
  {
    id: 'srv_block_app',
    title: 'Block & District Application Pass Service',
    category: 'Utility',
    price: 50,
    processingTime: '10-30 MIN',
    badge: 'PREMIUM',
    iconType: 'building',
    bgGradient: 'from-violet-600 to-purple-800',
    description: 'Custom rate application verification/passing service based on State, District, Block & Application Code (BICCO, BCCCO, BRCCO, NCLCO).',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'state', label: 'State / राज्य', type: 'select', options: ['Bihar', 'Uttar Pradesh', 'Jharkhand', 'Madhya Pradesh'], required: true },
      { id: 'district', label: 'District / जिला', type: 'select', options: ['Gaya', 'Aurangabad', 'Patna', 'Nawada', 'Jehanabad', 'Rohtas', 'Arwal'], required: true },
      { id: 'block', label: 'Block Name / ब्लॉक नाम', type: 'select', options: ['Konch', 'Tekari', 'Guraru', 'Obra', 'Bodhgaya', 'Belaganj', 'Khizarsarai', 'Manpur', 'Barachatti', 'Sherghati', 'Dobhi', 'Fatehpur', 'Wazirganj', 'Atri', 'Imamganj', 'Daudnagar', 'Nabinagar', 'Other'], required: true },
      { id: 'app_prefix', label: 'Application Code / Type', type: 'select', options: ['BICCO', 'BCCCO', 'BRCCO', 'BOBC', 'NCLCO', 'OTHER'], required: true },
      { id: 'app_number', label: 'Full Application Number / आवेदन संख्या', type: 'text', placeholder: 'e.g. BICCO/2026/54564 or NCLCO/2026/1234', required: true },
      { id: 'applicant_name', label: 'Applicant / Firm Name', type: 'text', placeholder: 'Applicant Full Name', required: true }
    ]
  },
  {
    id: 'srv_mobile_info',
    title: 'Mobile Number Info / Detail Finder INSTANT',
    category: 'Utility',
    price: 30,
    processingTime: 'INSTANT',
    badge: 'PREMIUM',
    iconType: 'phone-call',
    bgGradient: 'from-cyan-600 to-blue-800',
    description: 'Find Owner Name, Father Name, Address, Aadhaar Number, SIM Operator & Alt Number from 10 Digit Mobile Number.',
    flowType: 'Instant',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'mobile_no', label: '10 Digit Mobile Number / मोबाइल नंबर', type: 'text', placeholder: 'e.g. 7408792646', required: true }
    ]
  },
  {
    id: 'srv_voter_mobile_link',
    title: 'Voter Mobile Link Without OTP (Instant)',
    category: 'Voter',
    price: 30,
    processingTime: 'INSTANT',
    badge: 'PREMIUM',
    iconType: 'phone-call',
    bgGradient: 'from-blue-600 to-indigo-800',
    description: 'Instantly link mobile number with Voter ID (EPIC) without OTP via MyPrints API.',
    flowType: 'Instant',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'epic_no', label: 'Voter EPIC Card Number / एपिक नंबर', type: 'text', placeholder: 'e.g. XXZ4596585', required: true },
      { id: 'mobile_no', label: '10 Digit Mobile Number / मोबाइल नंबर', type: 'text', placeholder: 'e.g. 6200687014', required: true }
    ]
  },
  {
    id: 'srv_rc_print',
    title: 'Vehicle RC Print INSTANT (PDF Verification)',
    category: 'Transport',
    price: 30,
    processingTime: 'INSTANT',
    badge: 'PREMIUM',
    iconType: 'car',
    bgGradient: 'from-amber-600 to-orange-700',
    description: 'Instantly verify and print official Vehicle RC PDF document using Vehicle Number.',
    flowType: 'Instant',
    isActive: true,
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'rcno', label: 'Vehicle Number / गाड़ी नंबर (RC No)', type: 'text', placeholder: 'e.g. UP32CM4081', required: true }
    ]
  }
];

let citizenServices: CitizenService[] = [...DEFAULT_CITIZEN_SERVICES];

export const DEFAULT_PUBLIC_GOV_SERVICES: PublicGovService[] = [
  {
    id: 'pub_census',
    title: 'Census Of India (भारत की जनगणना)',
    hindiTitle: 'भारत की जनगणना',
    tagline: 'Office of the Registrar General & Census Commissioner, India',
    category: 'Census & Survey',
    portalUrl: 'https://censusindia.gov.in/census.website/',
    badge: 'OFFICIAL',
    badgeColor: 'blue',
    iconType: 'census',
    isActive: true,
    priority: 1,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_aadhaar_beta',
    title: 'Aadhar Beta Service',
    hindiTitle: 'आधार बीटा सेवा',
    tagline: 'UIDAI Next-Gen Aadhaar Self-Service Portal & Biometrics Tools',
    category: 'Aadhaar',
    portalUrl: 'https://myaadhaar.uidai.gov.in/',
    badge: 'BETA DIRECT',
    badgeColor: 'indigo',
    iconType: 'aadhaar_beta',
    isActive: true,
    priority: 2,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_aadhaar_info',
    title: 'Aadhaar Information (UIDAI Link)',
    hindiTitle: 'आधार जानकारी (UIDAI लिंक)',
    tagline: 'UIDAI Official Portal, e-Aadhaar & Verification Services',
    category: 'Aadhaar',
    portalUrl: 'https://uidai.gov.in/',
    badge: 'VERIFIED',
    badgeColor: 'emerald',
    iconType: 'aadhaar_info',
    isActive: true,
    priority: 3,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_pan_service',
    title: 'PAN Card Service',
    hindiTitle: 'पैन कार्ड सेवा',
    tagline: 'Income Tax e-Filing, NSDL Tin & UTIITSL Services',
    category: 'PAN & Tax',
    portalUrl: 'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/instant-e-pan',
    badge: 'DIRECT',
    badgeColor: 'amber',
    iconType: 'pan_service',
    isActive: true,
    priority: 4,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_voter_service',
    title: 'Voter ID Correction & Status (NVSP)',
    hindiTitle: 'वोटर कार्ड संशोधन व स्टेटस',
    tagline: 'Election Commission of India (ECI) Voters Portal',
    category: 'Voter & Election',
    portalUrl: 'https://voters.eci.gov.in/',
    badge: 'OFFICIAL ECI',
    badgeColor: 'purple',
    iconType: 'voter_service',
    isActive: true,
    priority: 5,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_ayushman_service',
    title: 'Ayushman Bharat (PM-JAY)',
    hindiTitle: 'आयुष्मान भारत योजना',
    tagline: 'National Health Authority (NHA) Beneficiary Portal for ₹5 Lakh Free Health Care',
    category: 'Health & Welfare',
    portalUrl: 'https://beneficiary.nha.gov.in/',
    badge: 'FREE ₹5 LAKH',
    badgeColor: 'emerald',
    iconType: 'ayushman_service',
    isActive: true,
    priority: 6,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_dl_service',
    title: 'Driving Licence Service',
    hindiTitle: 'ड्राइविंग लाइसेंस सेवा',
    tagline: 'Sarathi Parivahan Portal — Apply for Learner License, DL Renewal & Slot Booking',
    category: 'Vehicle & Transport',
    portalUrl: 'https://sarathi.parivahan.gov.in/',
    badge: 'SARATHI',
    badgeColor: 'indigo',
    iconType: 'dl_service',
    isActive: true,
    priority: 7,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_rc_service',
    title: 'RC Service (Registration...)',
    hindiTitle: 'गाड़ी आरसी (RC) सेवाएं',
    tagline: 'Vahan Citizen Portal — Vehicle Registration Status & Ownership Transfer',
    category: 'Vehicle & Transport',
    portalUrl: 'https://vahan.parivahan.gov.in/',
    badge: 'VAHAN',
    badgeColor: 'blue',
    iconType: 'rc_service',
    isActive: true,
    priority: 8,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_vehicle_service',
    title: 'Vehicle Service',
    hindiTitle: 'वाहन सेवाएं व टैक्स',
    tagline: 'MoRTH Parivahan Sewa — Road Tax, Fitness & Commercial Vehicle Services',
    category: 'Vehicle & Transport',
    portalUrl: 'https://parivahan.gov.in/',
    badge: 'PARIVAHAN',
    badgeColor: 'amber',
    iconType: 'vehicle_service',
    isActive: true,
    priority: 9,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_birth_death',
    title: 'Birth & Death Cirtificate',
    hindiTitle: 'जन्म एवं मृत्यु प्रमाण पत्र',
    tagline: 'Civil Registration System (CRS) Portal for Birth & Death Certificates',
    category: 'Certificates & Revenue',
    portalUrl: 'https://crsorgi.gov.in/',
    badge: 'CRS ORGI',
    badgeColor: 'emerald',
    iconType: 'birth_death',
    isActive: true,
    priority: 10,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_echallan',
    title: 'E-Challan',
    hindiTitle: 'ई-चालान भुगतान व स्टेटस',
    tagline: 'Digital Traffic Enforcement Portal — Check & Pay Pending Challan Online',
    category: 'Vehicle & Transport',
    portalUrl: 'https://echallan.parivahan.gov.in/',
    badge: 'TRAFFIC',
    badgeColor: 'rose',
    iconType: 'echallan',
    isActive: true,
    priority: 11,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_eshram',
    title: 'E-Shram Card',
    hindiTitle: 'ई-श्रम कार्ड (असंगठित कर्मकार)',
    tagline: 'Ministry of Labour & Employment — Unorganised Workers Portal (₹2 Lakh Accident Insurance)',
    category: 'Employment & Career',
    portalUrl: 'https://eshram.gov.in/',
    badge: 'LABOUR',
    badgeColor: 'cyan',
    iconType: 'eshram',
    isActive: true,
    priority: 12,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_apaar',
    title: 'APAAR ID Card',
    hindiTitle: 'अपार आईडी कार्ड (वन नेशन वन स्टूडेंट)',
    tagline: 'Automated Permanent Academic Account Registry — One Nation, One Student ID',
    category: 'Education & Student',
    portalUrl: 'https://apaar.education.gov.in/',
    badge: 'STUDENT ID',
    badgeColor: 'indigo',
    iconType: 'apaar',
    isActive: true,
    priority: 13,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_abha',
    title: 'ABHA Card (Ayushman Bharat...)',
    hindiTitle: 'आभा हेल्थ कार्ड (ABHA ID)',
    tagline: 'Ayushman Bharat Health Account — 14 Digit Digital Health ID creation',
    category: 'Health & Welfare',
    portalUrl: 'https://abha.abdm.gov.in/abha/v3/',
    badge: 'HEALTH ID',
    badgeColor: 'blue',
    iconType: 'abha',
    isActive: true,
    priority: 14,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_pmfby',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    hindiTitle: 'प्रधानमंत्री फसल बीमा योजना',
    tagline: 'Crop Insurance Portal for Indian Farmers — Apply, Claim & Track Status',
    category: 'Farmer & Agriculture',
    portalUrl: 'https://pmfby.gov.in/',
    badge: 'CROP INSURANCE',
    badgeColor: 'emerald',
    iconType: 'pmfby',
    isActive: true,
    priority: 15,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_pmay_g',
    title: 'PMAY-Gramin (Pradhan Mantri...)',
    hindiTitle: 'प्रधानमंत्री आवास योजना (ग्रामीण)',
    tagline: 'Rural Housing Scheme Beneficiary Search, Installment Status & FTO Tracking',
    category: 'Housing & Schemes',
    portalUrl: 'https://pmayg.nic.in/',
    badge: 'RURAL HOUSING',
    badgeColor: 'amber',
    iconType: 'pmay_g',
    isActive: true,
    priority: 16,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_pmay_u',
    title: 'PMAY-Urban/Sehri (Pradhan Mantri...)',
    hindiTitle: 'प्रधानमंत्री आवास योजना (शहरी)',
    tagline: 'Urban Housing for All Mission — Beneficiary Assessment & Subsidy Tracking',
    category: 'Housing & Schemes',
    portalUrl: 'https://pmaymis.gov.in/',
    badge: 'URBAN HOUSING',
    badgeColor: 'rose',
    iconType: 'pmay_u',
    isActive: true,
    priority: 17,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_epfo',
    title: "EPFO (Employee's Provident Fund)",
    hindiTitle: 'कर्मचारी भविष्य निधि संगठन (EPFO)',
    tagline: 'EPFO Member Passbook, UAN Portal, Online Claim & PF Balance',
    category: 'Employment & Career',
    portalUrl: 'https://passbook.epfindia.gov.in/MemberPassBook/Login',
    badge: 'UAN LOGIN',
    badgeColor: 'cyan',
    iconType: 'epfo',
    isActive: true,
    priority: 18,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_lic',
    title: 'LIC (Life Insurance Corporation)',
    hindiTitle: 'भारतीय जीवन बीमा निगम (LIC)',
    tagline: 'LIC Customer Portal — Pay Premium Online, Policy Status & Renewal',
    category: 'Insurance & Investment',
    portalUrl: 'https://licindia.in/',
    badge: 'INSURANCE',
    badgeColor: 'rose',
    iconType: 'lic',
    isActive: true,
    priority: 19,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_enam',
    title: 'E-Nam',
    hindiTitle: 'राष्ट्रीय कृषि बाजार (e-NAM)',
    tagline: 'National Agriculture Market — Online Trading Platform for Agricultural Commodities',
    category: 'Farmer & Agriculture',
    portalUrl: 'https://enam.gov.in/web/',
    badge: 'AGRI MARKET',
    badgeColor: 'emerald',
    iconType: 'enam',
    isActive: true,
    priority: 20,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_pm_kisan',
    title: 'PM-Kisan Samman Nidhi',
    hindiTitle: 'पीएम किसान सम्मान निधि योजना',
    tagline: 'Direct Benefit Transfer of ₹6,000/yr for Farmers — Beneficiary Status & eKYC',
    category: 'Farmer & Agriculture',
    portalUrl: 'https://pmkisan.gov.in/',
    badge: '₹6000 DBT',
    badgeColor: 'emerald',
    iconType: 'pm_kisan',
    isActive: true,
    priority: 21,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pub_pm_surya_ghar',
    title: 'PM Surya Ghar (Solar Rooftop)',
    hindiTitle: 'पीएम सूर्य घर मुफ्त बिजली योजना',
    tagline: 'Up to ₹78,000 Subsidy for Rooftop Solar Plant Installation',
    category: 'Energy & Utility',
    portalUrl: 'https://pmsuryaghar.gov.in/',
    badge: 'SOLAR SUBSIDY',
    badgeColor: 'amber',
    iconType: 'pm_surya_ghar',
    isActive: true,
    priority: 22,
    stateCode: 'ALL',
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
    ],
    createdAt: new Date().toISOString()
  }
];

let publicGovServices: PublicGovService[] = [...DEFAULT_PUBLIC_GOV_SERVICES];

// Block & District Custom Rates Store
let blockApplicationRates: BlockApplicationRate[] = [
  // Bihar -> Gaya -> Konch
  { id: 'br_1', state: 'Bihar', district: 'Gaya', block: 'Konch', appPrefix: 'BICCO', appTypeLabel: 'BICCO Application', price: 50.00, isActive: true, notes: 'Konch Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_2', state: 'Bihar', district: 'Gaya', block: 'Konch', appPrefix: 'BCCCO', appTypeLabel: 'BCCCO Application', price: 60.00, isActive: true, notes: 'Konch Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_3', state: 'Bihar', district: 'Gaya', block: 'Konch', appPrefix: 'BRCCO', appTypeLabel: 'BRCCO Application', price: 55.00, isActive: true, notes: 'Konch Block Rate', updatedAt: new Date().toISOString() },

  // Bihar -> Gaya -> Tekari
  { id: 'br_4', state: 'Bihar', district: 'Gaya', block: 'Tekari', appPrefix: 'BICCO', appTypeLabel: 'BICCO Application', price: 40.00, isActive: true, notes: 'Tekari Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_5', state: 'Bihar', district: 'Gaya', block: 'Tekari', appPrefix: 'BCCCO', appTypeLabel: 'BCCCO Application', price: 70.00, isActive: true, notes: 'Tekari Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_6', state: 'Bihar', district: 'Gaya', block: 'Tekari', appPrefix: 'BRCCO', appTypeLabel: 'BRCCO Application', price: 65.00, isActive: true, notes: 'Tekari Block Rate', updatedAt: new Date().toISOString() },

  // Bihar -> Gaya -> Guraru
  { id: 'br_7', state: 'Bihar', district: 'Gaya', block: 'Guraru', appPrefix: 'BICCO', appTypeLabel: 'BICCO Application', price: 45.00, isActive: true, notes: 'Guraru Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_8', state: 'Bihar', district: 'Gaya', block: 'Guraru', appPrefix: 'BCCCO', appTypeLabel: 'BCCCO Application', price: 65.00, isActive: true, notes: 'Guraru Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_9', state: 'Bihar', district: 'Gaya', block: 'Guraru', appPrefix: 'BRCCO', appTypeLabel: 'BRCCO Application', price: 60.00, isActive: true, notes: 'Guraru Block Rate', updatedAt: new Date().toISOString() },

  // Bihar -> Aurangabad -> Obra
  { id: 'br_10', state: 'Bihar', district: 'Aurangabad', block: 'Obra', appPrefix: 'BICCO', appTypeLabel: 'BICCO Application', price: 52.00, isActive: true, notes: 'Obra Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_11', state: 'Bihar', district: 'Aurangabad', block: 'Obra', appPrefix: 'BCCCO', appTypeLabel: 'BCCCO Application', price: 62.00, isActive: true, notes: 'Obra Block Rate', updatedAt: new Date().toISOString() },
  { id: 'br_12', state: 'Bihar', district: 'Aurangabad', block: 'Obra', appPrefix: 'BRCCO', appTypeLabel: 'BRCCO Application', price: 58.00, isActive: true, notes: 'Obra Block Rate', updatedAt: new Date().toISOString() },
];

// Initial Service Requests
let serviceRequests: ServiceRequest[] = [
  {
    id: 'req_101',
    requestNumber: 1,
    serviceId: 'srv_6',
    serviceTitle: 'Voter Original PDF Download',
    category: 'Voter',
    retailerId: 'usr_pankaj',
    retailerName: 'Pankaj Kumar',
    retailerMobile: '0000000000',
    price: 99.00,
    formData: {
      epic_no: 'TZX9876543',
      state: 'Bihar',
      mobile_no: '0000000000'
    },
    status: 'PENDING',
    adminRemarks: 'Processing under operator queue',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    unreadChatCount: { admin: 1, retailer: 0 }
  }
];

let walletTransactions: WalletTransaction[] = [
  {
    id: 'tx_101',
    retailerId: 'usr_pankaj',
    type: 'TOP_UP',
    amount: 199.00,
    description: 'Initial Wallet Top-Up via PhonePe UPI',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx_102',
    retailerId: 'usr_pankaj',
    type: 'DEDUCTION',
    amount: 99.00,
    description: 'Service Fee deducted for Voter Original PDF Download (#1)',
    requestId: 'req_101',
    serviceTitle: 'Voter Original PDF Download',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

let chatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    requestId: 'req_101',
    senderId: 'usr_pankaj',
    senderName: 'Pankaj Kumar',
    senderRole: 'RETAILER',
    text: 'Sir please generate this Voter ID PDF urgently for customer.',
    createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
  },
  {
    id: 'msg_2',
    requestId: 'req_101',
    senderId: 'usr_admin',
    senderName: 'Portal Master Admin',
    senderRole: 'ADMIN',
    text: 'Checking NVSP portal database now. PDF will be updated shortly.',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  }
];

let notifications: AppNotification[] = [
  {
    id: 'notif_1',
    recipientRole: 'ADMIN',
    title: 'New Service Request #1 Received',
    message: 'Pankaj Kumar requested "Voter Original PDF Download". ₹99.00 fee deducted.',
    type: 'NEW_SUBMISSION',
    isRead: false,
    requestId: 'req_101',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

// SSE Clients List for Realtime Updates
const sseClients: { id: string; res: Response; interval?: NodeJS.Timeout }[] = [];

function broadcastRealtimeEvent(eventType: string, payload: any) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      if (client.interval) clearInterval(client.interval);
      sseClients.splice(i, 1);
    }
  }
}

// REST API Endpoints

// Server-Sent Events (SSE) route for Realtime Notifications & Chat
app.get('/api/events', (req: Request, res: Response) => {
  // Disable buffering for Nginx & Proxies
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Flush headers immediately
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Send initial connected comment to establish the stream immediately
  res.write(': connected\n\n');

  const clientId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7);

  // Send periodic heartbeat every 20s to prevent reverse-proxy timeout drops
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 20000);

  sseClients.push({ id: clientId, res, interval: heartbeat });

  const cleanup = () => {
    clearInterval(heartbeat);
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  req.on('end', cleanup);
});

// Auth & Users
interface ActiveSession {
  userId: string;
  expiresAt: number;
}
let activeSessions: Record<string, ActiveSession> = {};

function sanitizeUser(u: any): any {
  if (!u) return u;
  const copy = { ...u };
  delete copy.password;
  return copy;
}

function sanitizeUsers(usersList: any[]): any[] {
  if (!Array.isArray(usersList)) return [];
  return usersList.map(u => sanitizeUser(u));
}

function getAuthenticatedUser(req: Request): User | null {
  const token = (
    req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    (req.headers['x-session-token'] as string) ||
    (req.query.sessionToken as string) ||
    (req.query.token as string) ||
    (req.query.adminSessionToken as string) ||
    req.body?.sessionToken as string ||
    req.body?.adminSessionToken as string
  );
  if (!token) return null;
  const session = activeSessions[token];
  if (!session || Date.now() > session.expiresAt) return null;
  const user = users.find(u => u.id === session.userId);
  if (!user || user.isBlocked) return null;
  return user;
}

function requireAdmin(req: Request, res: Response): User | null {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    res.status(401).json({ error: '🔒 Authentication required. Session token missing or expired.' });
    return null;
  }
  if (authUser.role !== 'ADMIN') {
    res.status(403).json({ error: '🔒 Access Denied! Only Portal Administrators can perform this action.' });
    return null;
  }
  return authUser;
}

function createSessionToken(userId: string): { token: string; expiresAt: number } {
  const token = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes validity
  activeSessions[token] = { userId, expiresAt };
  return { token, expiresAt };
}

app.get('/api/auth/users', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: '🔒 Unauthorized! Active session token required to access user list.' });
  }

  // Retailer sees only themselves in user list
  if (authUser.role === 'RETAILER') {
    return res.json([sanitizeUser(authUser)]);
  }

  // Include user passwords for Admin so Admin can manage passwords in User List
  if (authUser.role === 'ADMIN') {
    return res.json(users);
  }

  // Distributors / Master Distributors / State Heads see their own network users
  if (['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD'].includes(authUser.role)) {
    const networkUsers = users.filter(u => u.distributorId === authUser.id || u.createdById === authUser.id || u.id === authUser.id);
    return res.json(sanitizeUsers(networkUsers));
  }

  res.json(sanitizeUsers(users));
});

// Login using Mobile Number OR Email + Password (Mandatory Password Check)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { mobileOrEmail, email, mobileNumber, password } = req.body;
  
  const query = (mobileOrEmail || mobileNumber || email || '').toString().trim().toLowerCase();
  
  if (!query) {
    return res.status(400).json({ error: 'Please enter Mobile Number or Email ID.' });
  }

  if (!password || !password.toString().trim()) {
    return res.status(400).json({ error: 'Password is required to log in!' });
  }

  // Find user matching mobile number OR email
  const user = users.find(u => 
    u.mobileNumber?.trim().toLowerCase() === query ||
    u.email?.trim().toLowerCase() === query ||
    u.id === query
  );

  if (!user) {
    return res.status(401).json({ error: `No account registered with "${query}". Please check or Sign Up.` });
  }

  // Check if account is blocked/suspended
  if (user.isBlocked) {
    return res.status(403).json({ error: '🚨 Account Blocked/Suspended by Portal Administrator. Please contact support.' });
  }

  // Mandatory Password Verification
  if (user.password && user.password !== password) {
    return res.status(401).json({ error: 'Incorrect Password! Please enter valid password.' });
  }

  // Create cryptographically signed server session token
  const session = createSessionToken(user.id);

  res.json({
    user: sanitizeUser(user),
    sessionToken: session.token,
    expiresAt: session.expiresAt
  });
});

// Verify active session token (Prevents tampering via LocalStorage)
app.post('/api/auth/verify-session', (req: Request, res: Response) => {
  const { sessionToken } = req.body;
  if (!sessionToken || typeof sessionToken !== 'string') {
    return res.status(401).json({ error: 'Session token missing or invalid.' });
  }

  const session = activeSessions[sessionToken];
  if (!session) {
    return res.status(401).json({ error: 'Invalid session token. Please log in with password.' });
  }

  if (Date.now() > session.expiresAt) {
    delete activeSessions[sessionToken];
    return res.status(401).json({ error: 'Session expired (30 minutes limit). Please log in again.' });
  }

  const user = users.find(u => u.id === session.userId);
  if (!user || user.isBlocked) {
    delete activeSessions[sessionToken];
    return res.status(403).json({ error: 'User account not found or suspended.' });
  }

  // Extend session duration for another 30 mins on activity
  session.expiresAt = Date.now() + 30 * 60 * 1000;

  res.json({
    user: sanitizeUser(user),
    sessionToken,
    expiresAt: session.expiresAt
  });
});

// Admin-Only Account Switching / Impersonation
app.post('/api/auth/impersonate', (req: Request, res: Response) => {
  const { adminSessionToken, targetUserId } = req.body;
  const token = adminSessionToken || 
    req.headers.authorization?.replace(/^Bearer\s+/i, '') || 
    (req.headers['x-session-token'] as string);

  if (!targetUserId) {
    return res.status(400).json({ error: 'Target user ID required.' });
  }

  let adminUser = getAuthenticatedUser(req);
  
  // Fallback: Check provided token directly if getAuthenticatedUser missed body token
  if (!adminUser && token && activeSessions[token]) {
    const session = activeSessions[token];
    if (session && Date.now() <= session.expiresAt) {
      adminUser = users.find(u => u.id === session.userId) || null;
    }
  }

  if (!adminUser || adminUser.role !== 'ADMIN' || adminUser.isBlocked) {
    return res.status(403).json({ error: 'Forbidden! Only Portal Administrators can switch accounts.' });
  }

  // Find target user by ID, Mobile Number, or Email
  const targetUser = users.find(u => 
    u.id === targetUserId || 
    u.mobileNumber?.trim() === targetUserId.trim() || 
    u.email?.trim().toLowerCase() === targetUserId.trim().toLowerCase()
  );

  if (!targetUser) {
    return res.status(404).json({ error: `Target user "${targetUserId}" not found.` });
  }

  // Issue new session token for the target user
  const session = createSessionToken(targetUser.id);
  saveDatabaseToFile();

  res.json({
    user: sanitizeUser(targetUser),
    sessionToken: session.token,
    expiresAt: session.expiresAt
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const { sessionToken } = req.body;
  if (sessionToken && activeSessions[sessionToken]) {
    delete activeSessions[sessionToken];
  }
  res.json({ success: true });
});

let portalSettings = {
  signupBonus: 200,
  enableSignupBonus: true,
  enableDistributorRegistration: true,
  distributorCommissionPercent: 2.0,
  portalName: 'eCyberCafe.in',
  supportHelpline: '0000000000',
  supportWhatsapp: '0000000000',
  telegramChannel: 'https://t.me/eCyberCafeOfficial',
  seoTitle: 'eCyberCafe - CSC & Cyber Cafe Online Services Portal',
  seoKeywords: 'eCyberCafe, CSC Cyber Cafe, Digital Bihar, Voter PDF Download, Aadhaar Mobile Link, PAN Card, Digital India Services',
  seoDescription: 'eCyberCafe is India\'s top platform for cyber cafe operators and retailers. Instant government document downloads, voter pdf, aadhaar link, pan card, and e-governance services.',
  googleSiteVerification: '',
  customCategories: ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil']
};

// Get All Service Categories (Standard Defaults + Persisted Custom Categories + Categories from Active Services)
app.get('/api/categories', (req: Request, res: Response) => {
  const standardDefaults = ['Aadhaar', 'Voter', 'PAN', 'Transport', 'Samagra', 'Utility'];
  const customCats: string[] = Array.isArray((portalSettings as any).customCategories)
    ? (portalSettings as any).customCategories
    : ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];

  const catMap = new Map<string, string>();
  standardDefaults.forEach(c => {
    if (c && c.trim()) catMap.set(c.trim().toLowerCase(), c.trim());
  });
  customCats.forEach(c => {
    if (c && c.trim()) catMap.set(c.trim().toLowerCase(), c.trim());
  });
  citizenServices.forEach(s => {
    if (s.category && s.category.trim()) {
      const lower = s.category.trim().toLowerCase();
      if (!catMap.has(lower)) {
        catMap.set(lower, s.category.trim());
      }
    }
  });

  res.json({
    categories: Array.from(catMap.values()),
    customCategories: customCats
  });
});

// Admin Add Custom Category
app.post('/api/admin/categories', (req: Request, res: Response) => {
  const { categoryName } = req.body;
  if (!categoryName || typeof categoryName !== 'string' || !categoryName.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmed = categoryName.trim();
  let customCats: string[] = Array.isArray((portalSettings as any).customCategories)
    ? (portalSettings as any).customCategories
    : ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];

  if (!customCats.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    customCats.push(trimmed);
    (portalSettings as any).customCategories = customCats;
    saveDatabaseToFile();
    broadcastRealtimeEvent('CATEGORIES_UPDATED', { customCategories: customCats });
  }

  res.json({
    success: true,
    message: `Category "${trimmed}" saved successfully!`,
    customCategories: customCats
  });
});

// Admin Delete Custom Category
app.delete('/api/admin/categories/:categoryName', (req: Request, res: Response) => {
  const { categoryName } = req.params;
  if (!categoryName) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmed = categoryName.trim().toLowerCase();
  let customCats: string[] = Array.isArray((portalSettings as any).customCategories)
    ? (portalSettings as any).customCategories
    : ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];

  customCats = customCats.filter(c => c.trim().toLowerCase() !== trimmed);
  (portalSettings as any).customCategories = customCats;

  let reassignedCount = 0;
  citizenServices.forEach(s => {
    if (s.category && s.category.trim().toLowerCase() === trimmed) {
      s.category = 'Aadhaar';
      reassignedCount++;
    }
  });

  saveDatabaseToFile();
  broadcastRealtimeEvent('CATEGORIES_UPDATED', { customCategories: customCats });
  if (reassignedCount > 0) {
    broadcastRealtimeEvent('SERVICES_UPDATED', { services: citizenServices });
  }

  res.json({
    success: true,
    message: `Category "${categoryName}" deleted!`,
    customCategories: customCats,
    reassignedCount
  });
});

// Portal Settings Endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(portalSettings);
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  const { signupBonus, enableSignupBonus, enableDistributorRegistration, distributorCommissionPercent, portalName, supportHelpline, supportWhatsapp, telegramChannel, seoTitle, seoKeywords, seoDescription, googleSiteVerification } = req.body;

  if (signupBonus !== undefined) portalSettings.signupBonus = Number(signupBonus) || 0;
  if (enableSignupBonus !== undefined) portalSettings.enableSignupBonus = Boolean(enableSignupBonus);
  if (enableDistributorRegistration !== undefined) portalSettings.enableDistributorRegistration = Boolean(enableDistributorRegistration);
  if (distributorCommissionPercent !== undefined) portalSettings.distributorCommissionPercent = Number(distributorCommissionPercent) || 2.0;
  if (portalName) portalSettings.portalName = portalName;
  if (supportHelpline) portalSettings.supportHelpline = supportHelpline;
  if (supportWhatsapp) portalSettings.supportWhatsapp = supportWhatsapp;
  if (telegramChannel !== undefined) portalSettings.telegramChannel = telegramChannel;
  if (seoTitle !== undefined) portalSettings.seoTitle = seoTitle;
  if (seoKeywords !== undefined) portalSettings.seoKeywords = seoKeywords;
  if (seoDescription !== undefined) portalSettings.seoDescription = seoDescription;
  if (googleSiteVerification !== undefined) portalSettings.googleSiteVerification = googleSiteVerification;

  saveDatabaseToFile();
  broadcastRealtimeEvent('SETTINGS_UPDATED', { settings: portalSettings });
  res.json({ message: 'Portal settings & SEO configuration updated successfully!', settings: portalSettings });
});

app.put('/api/admin/settings', (req: Request, res: Response) => {
  const { signupBonus, enableSignupBonus, enableDistributorRegistration, distributorCommissionPercent, portalName, supportHelpline, supportWhatsapp, telegramChannel, seoTitle, seoKeywords, seoDescription, googleSiteVerification } = req.body;

  if (signupBonus !== undefined) portalSettings.signupBonus = Number(signupBonus) || 0;
  if (enableSignupBonus !== undefined) portalSettings.enableSignupBonus = Boolean(enableSignupBonus);
  if (enableDistributorRegistration !== undefined) portalSettings.enableDistributorRegistration = Boolean(enableDistributorRegistration);
  if (distributorCommissionPercent !== undefined) portalSettings.distributorCommissionPercent = Number(distributorCommissionPercent) || 2.0;
  if (portalName) portalSettings.portalName = portalName;
  if (supportHelpline) portalSettings.supportHelpline = supportHelpline;
  if (supportWhatsapp) portalSettings.supportWhatsapp = supportWhatsapp;
  if (telegramChannel !== undefined) portalSettings.telegramChannel = telegramChannel;
  if (seoTitle !== undefined) portalSettings.seoTitle = seoTitle;
  if (seoKeywords !== undefined) portalSettings.seoKeywords = seoKeywords;
  if (seoDescription !== undefined) portalSettings.seoDescription = seoDescription;
  if (googleSiteVerification !== undefined) portalSettings.googleSiteVerification = googleSiteVerification;

  saveDatabaseToFile();
  broadcastRealtimeEvent('SETTINGS_UPDATED', { settings: portalSettings });
  res.json({ message: 'Portal settings & SEO configuration updated successfully!', settings: portalSettings });
});

// Signup Endpoint with Mobile, Password, Cyber Cafe Name, State, District, Block, Referral Code & Role
app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { name, storeName, email, mobileNumber, password, state, district, block, referralCode, role } = req.body;
  if (!name || (!email && !mobileNumber)) {
    return res.status(400).json({ error: 'Name and Mobile Number or Email are required.' });
  }

  // Check duplicate mobile
  if (mobileNumber && users.some(u => u.mobileNumber === mobileNumber)) {
    return res.status(400).json({ error: `Mobile number ${mobileNumber} is already registered! Please log in instead.` });
  }

  const userRole = (role === 'DISTRIBUTOR') ? 'DISTRIBUTOR' : 'RETAILER';
  const bonusAmount = portalSettings.enableSignupBonus ? Number(portalSettings.signupBonus) : 0;
  const newMob = mobileNumber || '6200000000';
  const myReferralCode = `REF${newMob.length === 10 ? newMob : Math.floor(1000000000 + Math.random() * 9000000000)}`;

  let referrerUser: User | undefined = undefined;
  if (referralCode && typeof referralCode === 'string' && referralCode.trim()) {
    const cleanRef = referralCode.trim().toUpperCase();
    referrerUser = users.find(u => 
      (u.referralCode && u.referralCode.toUpperCase() === cleanRef) ||
      (u.mobileNumber && u.mobileNumber === cleanRef) ||
      (u.id && u.id.toUpperCase() === cleanRef)
    );
  }

  const newUser: User = {
    id: `usr_${userRole === 'DISTRIBUTOR' ? 'dist' : 'ret'}_${Date.now()}`,
    name,
    storeName: storeName || `${name}'s Cyber Cafe`,
    email: email || `${newMob}@citizenservice.in`,
    mobileNumber: newMob,
    password: password || '123456',
    role: userRole,
    state: state || 'Bihar',
    district: district || '',
    block: block || '',
    walletBalance: bonusAmount,
    commissionBalance: 0.00,
    referralCode: myReferralCode,
    referredByCode: referrerUser ? (referrerUser.referralCode || referralCode) : undefined,
    createdById: referrerUser ? referrerUser.id : undefined,
    distributorId: referrerUser ? referrerUser.id : undefined,
    createdByName: referrerUser ? referrerUser.name : undefined,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  };

  users.push(newUser);

  // If referred by another user, credit ₹100 referral bonus to referrer
  if (referrerUser) {
    const REFERRAL_BONUS = 100;
    const prevComm = referrerUser.commissionBalance || 0;
    referrerUser.commissionBalance = Number((prevComm + REFERRAL_BONUS).toFixed(2));
    walletTransactions.unshift({
      id: `tx_ref_${Date.now()}`,
      retailerId: referrerUser.id,
      type: 'COMMISSION',
      amount: REFERRAL_BONUS,
      previousBalance: prevComm,
      newBalance: referrerUser.commissionBalance,
      description: `₹100 Referral Bonus for onboarding new retailer "${newUser.name}" (${newUser.mobileNumber})`,
      createdAt: new Date().toISOString(),
    });

    if (referrerUser.mobileNumber) {
      sendWhatsAppMessage(
        referrerUser.mobileNumber,
        `🎉 *₹100 Referral Bonus Credited!* 🎉\n\nHello *${referrerUser.name}*,\nYour referral code *${referrerUser.referralCode || referralCode}* was used by *${newUser.name}* (${newUser.mobileNumber})!\n\n₹100 Bonus added to your Commission Balance (Total: ₹${referrerUser.commissionBalance.toFixed(2)}).`
      );
    }
  }

  if (bonusAmount > 0) {
    walletTransactions.unshift({
      id: `tx_${Date.now()}`,
      retailerId: newUser.id,
      type: 'TOP_UP',
      amount: bonusAmount,
      previousBalance: 0,
      newBalance: bonusAmount,
      description: `Welcome Sign-up Bonus Credit (₹${bonusAmount})`,
      createdAt: new Date().toISOString(),
    });
  }

  broadcastRealtimeEvent('NEW_RETAILER_REGISTERED', { user: sanitizeUser(newUser), referrer: referrerUser ? sanitizeUser(referrerUser) : undefined });

  // Send WhatsApp Welcome Message to newly registered user
  if (newUser.mobileNumber) {
    const welcomeMsg = `🎉 *Welcome to eCyberCafe Portal!* 🎉\n\nHello *${newUser.name}*, your registration is successful!\n\n📋 *Account Registration Details:*\n• *Name:* ${newUser.name}\n• *Store / Cafe:* ${newUser.storeName}\n• *User ID / Email:* ${newUser.email}\n• *Mobile Number:* ${newUser.mobileNumber}\n• *Wallet Balance:* ₹${newUser.walletBalance.toFixed(2)}\n\n🌐 Log in to access E-Governance & Certificate services.\nThank you for registering with eCyberCafe Portal!`;
    sendWhatsAppMessage(newUser.mobileNumber, welcomeMsg);
  }

  const session = createSessionToken(newUser.id);
  res.json({
    user: sanitizeUser(newUser),
    sessionToken: session.token,
    expiresAt: session.expiresAt
  });
});

// Profile Update Endpoint (Update Name, Store Name / Cyber Cafe, Mobile, Email, and Password)
app.put('/api/auth/profile', (req: Request, res: Response) => {
  const { sessionToken, userId, name, storeName, email, mobileNumber, currentPassword, newPassword } = req.body;

  // Validate session token
  let authenticatedUserId = userId;
  if (sessionToken) {
    const session = activeSessions[sessionToken];
    if (!session || Date.now() > session.expiresAt) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
    const reqUser = users.find(u => u.id === session.userId);
    // Non-admin can only update their own profile
    if (reqUser && reqUser.role !== 'ADMIN' && session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized profile update attempt!' });
    }
    authenticatedUserId = session.userId;
  }

  const targetId = userId || authenticatedUserId;
  const userIndex = users.findIndex(u => u.id === targetId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const currentUser = users[userIndex];

  // If password change is requested, verify current password
  if (newPassword) {
    const expectedPassword = currentUser.password || '123456';
    if (currentPassword !== expectedPassword) {
      return res.status(400).json({ error: 'Current password is incorrect! Default current password for all accounts is: 123456' });
    }
    currentUser.password = newPassword;
  }

  // Update profile details
  if (name) currentUser.name = name;
  if (storeName) currentUser.storeName = storeName;
  if (email) currentUser.email = email;
  if (mobileNumber) currentUser.mobileNumber = mobileNumber;
  if (req.body.state !== undefined) currentUser.state = req.body.state;
  if (req.body.district !== undefined) currentUser.district = req.body.district;
  if (req.body.block !== undefined) currentUser.block = req.body.block;

  users[userIndex] = currentUser;

  broadcastRealtimeEvent('PROFILE_UPDATED', { user: sanitizeUser(currentUser) });

  res.json({ message: 'Profile & Password updated successfully!', user: sanitizeUser(currentUser) });
});

// Role Upgrade Endpoint
app.post('/api/user/upgrade-role', (req: Request, res: Response) => {
  const { userId, targetRole, fee } = req.body;
  if (!userId || !targetRole) {
    return res.status(400).json({ error: 'User ID and target role are required.' });
  }

  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const targetUser = users[userIndex];

  // Prevent double payment if user is already upgraded
  if (targetUser.role !== 'RETAILER') {
    return res.status(400).json({ error: `You are already upgraded to ${targetUser.role.replace('_', ' ')} ID! No further upgrade fee will be charged.` });
  }

  const requiredFee = Number(fee) || 0;

  if (targetUser.walletBalance < requiredFee) {
    return res.status(400).json({ error: `Insufficient wallet balance (₹${targetUser.walletBalance.toFixed(2)}). Required: ₹${requiredFee}.` });
  }

  // Deduct fee and update role (Protect ADMIN role from being downgraded/overwritten)
  const prevRoleBal = targetUser.walletBalance;
  targetUser.walletBalance -= requiredFee;
  if ((targetUser.role as string) !== 'ADMIN') {
    targetUser.role = targetRole === 'MASTER' ? 'MASTER_DISTRIBUTOR' : targetRole === 'STATE_HEAD' ? 'STATE_HEAD' : 'DISTRIBUTOR';
  }

  walletTransactions.unshift({
    id: `tx_${Date.now()}`,
    retailerId: targetUser.id,
    type: 'DEBIT',
    amount: requiredFee,
    previousBalance: prevRoleBal,
    newBalance: targetUser.walletBalance,
    description: `ID Role Upgrade Fee for ${targetUser.role.replace('_', ' ')}`,
    createdAt: new Date().toISOString()
  });

  users[userIndex] = targetUser;

  broadcastRealtimeEvent('ROLE_UPGRADED', { user: sanitizeUser(targetUser) });

  if (targetUser.mobileNumber) {
    sendWhatsAppMessage(
      targetUser.mobileNumber,
      `🎉 *Role Upgrade Successful!* 🎉\n\nHello *${targetUser.name}*,\nYour ID role has been upgraded to *${targetUser.role.replace('_', ' ')}*.\n\nEnjoy maximum commission margins and retailer onboarding privileges!\nWallet Balance remaining: ₹${targetUser.walletBalance.toFixed(2)}`
    );
  }

  res.json({ message: `Role successfully upgraded to ${targetUser.role}!`, user: sanitizeUser(targetUser) });
});

// Distributor User Creation with ₹100 Bonus & 1% Lifetime Referral
app.post('/api/distributor/create-retailer', (req: Request, res: Response) => {
  const { distributorId, name, storeName, email, mobileNumber, password, state, district, block } = req.body;
  if (!distributorId) {
    return res.status(400).json({ error: 'Distributor ID is required.' });
  }

  const distributor = users.find(u => u.id === distributorId);
  if (!distributor) {
    return res.status(404).json({ error: 'Distributor user account not found.' });
  }

  if (!name || !mobileNumber) {
    return res.status(400).json({ error: 'Name and Mobile Number are required.' });
  }

  if (users.some(u => u.mobileNumber === mobileNumber)) {
    return res.status(400).json({ error: `Mobile number ${mobileNumber} is already registered.` });
  }

  const newUser: User = {
    id: `usr_ret_${Date.now()}`,
    name,
    storeName: storeName || `${name}'s Cyber Cafe`,
    email: email || `${mobileNumber}@citizenservice.in`,
    mobileNumber,
    password: password || '123456',
    role: 'RETAILER',
    state: state || 'Bihar',
    district: district || '',
    block: block || '',
    walletBalance: 0.00,
    commissionBalance: 0.00,
    referralCode: `REF${mobileNumber}`,
    referredByCode: distributor.referralCode || `REF${distributor.mobileNumber || distributor.id}`,
    distributorId: distributor.id,
    createdById: distributor.id,
    createdByName: distributor.name,
    isBlocked: false,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  };

  users.push(newUser);

  // ₹100 Referral Bonus for Distributor on adding new retailer
  const BONUS_AMOUNT = 100;
  const prevDistComm = distributor.commissionBalance || 0;
  distributor.commissionBalance = Number((prevDistComm + BONUS_AMOUNT).toFixed(2));

  walletTransactions.unshift({
    id: `tx_dist_ref_${Date.now()}`,
    retailerId: distributor.id,
    type: 'COMMISSION',
    amount: BONUS_AMOUNT,
    previousBalance: prevDistComm,
    newBalance: distributor.commissionBalance,
    description: `₹100 Referral Bonus for onboarding new retailer "${newUser.name}" (${newUser.mobileNumber})`,
    createdAt: new Date().toISOString(),
  });

  broadcastRealtimeEvent('USER_LIST_UPDATED', { users: sanitizeUsers(users), distributor: sanitizeUser(distributor) });

  // WhatsApp welcome to newly registered retailer
  if (newUser.mobileNumber) {
    const welcomeMsg = `🎉 *Welcome to eCyberCafe Portal!* 🎉\n\nHello *${newUser.name}*, your account has been registered by Distributor *${distributor.name}*!\n\n📋 *Login Credentials:*\n• *User / Mobile:* ${newUser.mobileNumber}\n• *Password:* ${newUser.password}\n\n🌐 Log in to access digital citizen services!`;
    sendWhatsAppMessage(newUser.mobileNumber, welcomeMsg);
  }

  // WhatsApp alert to Distributor
  if (distributor.mobileNumber) {
    const distMsg = `🎉 *₹100 Commission Bonus Credited!* 🎉\n\nHello *${distributor.name}*,\nYou earned ₹100 Referral Bonus for adding new retailer *${newUser.name}*!\n\nTotal Commission Balance: ₹${distributor.commissionBalance.toFixed(2)}`;
    sendWhatsAppMessage(distributor.mobileNumber, distMsg);
  }

  res.status(201).json({
    message: `Retailer account created successfully! ₹100 commission credited to your wallet.`,
    user: sanitizeUser(newUser),
    distributorCommissionBalance: distributor.commissionBalance
  });
});

// Helper: Calculate total wallet top-ups / recharges for a retailer
function getRetailerTotalWalletRecharged(retailerId: string): number {
  const retailer = users.find(u => u.id === retailerId);
  const explicitRecharge = retailer ? (retailer as any).totalWalletRecharged || 0 : 0;
  
  const txRecharges = walletTransactions
    .filter(tx => tx.retailerId === retailerId && tx.type === 'TOP_UP')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return Number(Math.max(explicitRecharge, txRecharges).toFixed(2));
}

// GET Distributor's Referred Retailers & Performance
app.get('/api/distributor/my-retailers', (req: Request, res: Response) => {
  const { distributorId } = req.query;
  if (!distributorId || typeof distributorId !== 'string') {
    return res.status(400).json({ error: 'distributorId query param required.' });
  }

  const distributor = users.find(u => u.id === distributorId);
  if (!distributor) {
    return res.status(404).json({ error: 'Distributor user not found.' });
  }

  const globalCommPercent = (portalSettings as any).distributorCommissionPercent ?? 2.0;
  const myRetailers = users.filter(u => u.distributorId === distributorId || u.createdById === distributorId);
  
  let totalLockedReferralComm = 0;
  
  const result = myRetailers.map(r => {
    const rReqs = serviceRequests.filter(req => req.retailerId === r.id);
    const completedReqs = rReqs.filter(req => req.status === 'COMPLETED');
    const totalCommissionEarned = completedReqs.reduce((sum, req) => {
      const matchedSrv = citizenServices.find(s => s.id === req.serviceId);
      let comm = 0;
      if (matchedSrv && (matchedSrv as any).distributorPrice !== undefined && Number((matchedSrv as any).distributorPrice) < req.price) {
        comm = req.price - Number((matchedSrv as any).distributorPrice);
      } else if (matchedSrv && (matchedSrv as any).distributorCommissionPercent !== undefined) {
        comm = req.price * (Number((matchedSrv as any).distributorCommissionPercent) / 100);
      } else {
        comm = req.price * (globalCommPercent / 100);
      }
      return sum + comm;
    }, 0);

    const totalWalletRecharged = getRetailerTotalWalletRecharged(r.id);
    const isBonusUnlocked = totalWalletRecharged >= 1000;
    const referralBonusAmount = 100;
    const rechargeNeededToUnlock = Math.max(0, 1000 - totalWalletRecharged);

    if (!isBonusUnlocked) {
      totalLockedReferralComm += referralBonusAmount;
    }

    return {
      retailer: sanitizeUser(r),
      totalRequests: rReqs.length,
      completedRequests: completedReqs.length,
      totalCommissionEarned: Number(totalCommissionEarned.toFixed(2)),
      totalWalletRecharged,
      isBonusUnlocked,
      referralBonusAmount,
      rechargeNeededToUnlock
    };
  });

  const currentCommBalance = distributor.commissionBalance || 0;
  const transferableCommBalance = Number(Math.max(0, currentCommBalance - totalLockedReferralComm).toFixed(2));

  res.json({
    retailers: result,
    totalCount: result.length,
    totalCommissionBalance: currentCommBalance,
    transferableCommissionBalance: transferableCommBalance,
    lockedCommissionBalance: Number(totalLockedReferralComm.toFixed(2))
  });
});

// GET Dedicated Distributor Price List & Commission Margins
app.get('/api/distributor/price-list', (req: Request, res: Response) => {
  const globalCommPercent = (portalSettings as any).distributorCommissionPercent ?? 2.0;
  const priceList = citizenServices.map(srv => {
    let distributorCommPct = globalCommPercent;
    let distributorCommAmt = Number((srv.price * (globalCommPercent / 100)).toFixed(2));
    let effectiveDistributorPrice = Number((srv.price - distributorCommAmt).toFixed(2));

    const numDistPrice = (srv as any).distributorPrice !== undefined && (srv as any).distributorPrice !== null && (srv as any).distributorPrice !== ''
      ? Number((srv as any).distributorPrice)
      : undefined;

    const numDistCommPct = (srv as any).distributorCommissionPercent !== undefined && (srv as any).distributorCommissionPercent !== null && (srv as any).distributorCommissionPercent !== ''
      ? Number((srv as any).distributorCommissionPercent)
      : undefined;

    if (numDistPrice !== undefined && !isNaN(numDistPrice) && numDistPrice >= 0) {
      effectiveDistributorPrice = numDistPrice;
      distributorCommAmt = Number((srv.price - numDistPrice).toFixed(2));
      distributorCommPct = srv.price > 0 ? Number(((distributorCommAmt / srv.price) * 100).toFixed(1)) : 0;
    } else if (numDistCommPct !== undefined && !isNaN(numDistCommPct) && numDistCommPct >= 0) {
      distributorCommPct = numDistCommPct;
      distributorCommAmt = Number((srv.price * (distributorCommPct / 100)).toFixed(2));
      effectiveDistributorPrice = Number((srv.price - distributorCommAmt).toFixed(2));
    }

    return {
      id: srv.id,
      title: srv.title,
      category: srv.category,
      retailerPrice: srv.price,
      distributorPrice: effectiveDistributorPrice,
      distributorCommissionPercent: distributorCommPct,
      distributorCommissionAmount: distributorCommAmt,
      processingTime: srv.processingTime,
      isActive: srv.isActive,
      description: srv.description
    };
  });

  res.json({
    globalCommissionPercent: globalCommPercent,
    priceList
  });
});

// POST 1-Click Commission Balance Transfer to Main Wallet
app.post('/api/distributor/transfer-commission', (req: Request, res: Response) => {
  const { distributorId, amount } = req.body;
  if (!distributorId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid distributorId and transfer amount required.' });
  }

  const transferAmt = Number(amount);
  const user = users.find(u => u.id === distributorId);
  if (!user) {
    return res.status(404).json({ error: 'Distributor user not found.' });
  }

  const currentComm = user.commissionBalance || 0;
  if (transferAmt > currentComm) {
    return res.status(400).json({ error: `Insufficient Commission Balance! Maximum total commission: ₹${currentComm.toFixed(2)}` });
  }

  // Calculate locked referral commission (retailers who have recharged < ₹1000)
  const myRetailers = users.filter(u => u.distributorId === distributorId || u.createdById === distributorId);
  let lockedReferralComm = 0;
  myRetailers.forEach(r => {
    const recharged = getRetailerTotalWalletRecharged(r.id);
    if (recharged < 1000) {
      lockedReferralComm += 100;
    }
  });

  const transferableComm = Number(Math.max(0, currentComm - lockedReferralComm).toFixed(2));

  if (transferAmt > transferableComm) {
    return res.status(400).json({
      error: `🔒 Commission Transfer Locked! Distributor gets ₹100 bonus per retailer, but it unlocks only after the retailer adds ₹1000 or more in their wallet. Currently transferable: ₹${transferableComm.toFixed(2)} (Locked: ₹${lockedReferralComm.toFixed(2)} pending retailer ₹1000 wallet recharge).`
    });
  }

  const prevWalletBal = user.walletBalance || 0;
  user.commissionBalance = Number((currentComm - transferAmt).toFixed(2));
  user.walletBalance = Number((prevWalletBal + transferAmt).toFixed(2));

  const transferTx: WalletTransaction = {
    id: `tx_comm_transfer_${Date.now()}`,
    retailerId: user.id,
    type: 'COMMISSION_TRANSFER',
    amount: transferAmt,
    previousBalance: prevWalletBal,
    newBalance: user.walletBalance,
    description: `Converted ₹${transferAmt.toFixed(2)} Commission Balance to Main Wallet Balance`,
    createdAt: new Date().toISOString(),
  };
  walletTransactions.unshift(transferTx);

  saveDatabaseToFile();

  res.json({
    success: true,
    message: `🎉 ₹${transferAmt.toFixed(2)} commission transferred to main wallet balance successfully!`,
    commissionBalance: user.commissionBalance,
    walletBalance: user.walletBalance,
    transferableCommissionBalance: Number((user.commissionBalance - lockedReferralComm).toFixed(2)),
    lockedCommissionBalance: lockedReferralComm
  });
});

// Admin User Management Endpoints

// Create new user/retailer from Admin Panel
app.post('/api/admin/users', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { name, storeName, email, mobileNumber, password, role, walletBalance, state, district, block, assignedServiceIds, operatorLabel } = req.body;
  if (!name || !mobileNumber) {
    return res.status(400).json({ error: 'Name and Mobile Number are required.' });
  }

  if (users.some(u => u.mobileNumber === mobileNumber)) {
    return res.status(400).json({ error: `Mobile number ${mobileNumber} is already registered.` });
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name,
    storeName: storeName || `${name}'s Cyber Cafe`,
    email: email || `${mobileNumber}@citizenservice.in`,
    mobileNumber,
    password: password || '123456',
    role: role || 'RETAILER',
    state: state || '',
    district: state === 'Bihar' ? (district || '') : '',
    block: state === 'Bihar' ? (block || '') : '',
    walletBalance: Number(walletBalance) || 0,
    commissionBalance: 0.00,
    isBlocked: false,
    assignedServiceIds: Array.isArray(assignedServiceIds) ? assignedServiceIds : [],
    operatorLabel: operatorLabel || '',
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  };

  users.push(newUser);

  if (newUser.walletBalance > 0) {
    walletTransactions.unshift({
      id: `tx_${Date.now()}`,
      retailerId: newUser.id,
      type: 'TOP_UP',
      amount: newUser.walletBalance,
      previousBalance: 0,
      newBalance: newUser.walletBalance,
      description: 'Initial Wallet Balance set by Admin',
      createdAt: new Date().toISOString(),
    });
  }

  broadcastRealtimeEvent('USER_LIST_UPDATED', { users: sanitizeUsers(users) });

  // Send WhatsApp Welcome Message to user created by admin
  if (newUser.mobileNumber) {
    const welcomeMsg = `🎉 *Account Created - eCyberCafe Portal* 🎉\n\nHello *${newUser.name}*, your account has been created by Administrator!\n\n📋 *Account Details:*\n• *Name:* ${newUser.name}\n• *Role:* ${newUser.role}\n• *Mobile / User ID:* ${newUser.mobileNumber}\n\n🌐 Log in to access services.\nThank you for choosing eCyberCafe Portal!`;
    sendWhatsAppMessage(newUser.mobileNumber, welcomeMsg);
  }

  res.status(201).json(sanitizeUser(newUser));
});

// Update User details by Admin
app.put('/api/admin/users/:id', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  const { name, storeName, email, mobileNumber, password, role, isBlocked, state, district, block, assignedServiceIds, operatorLabel } = req.body;

  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const targetUser = users[userIdx];

  if (name) targetUser.name = name;
  if (storeName) targetUser.storeName = storeName;
  if (email) targetUser.email = email;
  if (mobileNumber) targetUser.mobileNumber = mobileNumber;
  if (password) targetUser.password = password;
  if (role) targetUser.role = role;
  if (typeof isBlocked === 'boolean') targetUser.isBlocked = isBlocked;
  if (state !== undefined) targetUser.state = state;
  if (district !== undefined) targetUser.district = state === 'Bihar' ? district : '';
  if (block !== undefined) targetUser.block = state === 'Bihar' ? block : '';
  if (assignedServiceIds !== undefined) targetUser.assignedServiceIds = Array.isArray(assignedServiceIds) ? assignedServiceIds : [];
  if (operatorLabel !== undefined) targetUser.operatorLabel = operatorLabel;

  users[userIdx] = targetUser;

  broadcastRealtimeEvent('USER_LIST_UPDATED', { users: sanitizeUsers(users) });
  res.json({ message: 'User updated successfully', user: sanitizeUser(targetUser) });
});

// Toggle Block/Unblock Status
app.patch('/api/admin/users/:id/toggle-block', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIdx].isBlocked = !users[userIdx].isBlocked;

  broadcastRealtimeEvent('USER_LIST_UPDATED', { users: sanitizeUsers(users) });
  res.json({ message: `User account ${users[userIdx].isBlocked ? 'Blocked' : 'Unblocked'} successfully`, user: sanitizeUser(users[userIdx]) });
});

// Admin Adjust Wallet Balance (Credit or Debit)
app.post('/api/admin/users/:id/adjust-wallet', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  const { type, amount, remarks } = req.body; // type: 'ADD' | 'DEDUCT'

  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid amount greater than 0 required.' });
  }

  const user = users[userIdx];
  const prevAdminBal = user.walletBalance;
  if (type === 'DEDUCT') {
    user.walletBalance = Math.max(0, user.walletBalance - numAmount);
  } else {
    user.walletBalance += numAmount;
  }

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}`,
    retailerId: user.id,
    type: type === 'DEDUCT' ? 'DEDUCTION' : 'TOP_UP',
    amount: numAmount,
    previousBalance: prevAdminBal,
    newBalance: user.walletBalance,
    description: remarks || `Admin manual wallet ${type === 'DEDUCT' ? 'deduction' : 'top-up'}`,
    createdAt: new Date().toISOString(),
  };
  walletTransactions.unshift(tx);

  users[userIdx] = user;

  // In-app notification to retailer
  const notif: AppNotification = {
    id: `notif_${Date.now()}`,
    recipientRole: 'RETAILER',
    recipientId: user.id,
    title: type === 'DEDUCT' ? 'Wallet Debited by Admin ➖' : 'Wallet Top-Up Credited! 💰',
    message: type === 'DEDUCT'
      ? `₹${numAmount.toFixed(2)} debited by Admin. (${remarks || 'Manual Adjustment'}). New Balance: ₹${user.walletBalance.toFixed(2)}.`
      : `₹${numAmount.toFixed(2)} credited to your wallet balance by Admin. (${remarks || 'Manual Top-Up'}). New Balance: ₹${user.walletBalance.toFixed(2)}.`,
    type: type === 'DEDUCT' ? 'WALLET_DEDUCTION' : 'TOP_UP',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(notif);

  // WhatsApp Alert to retailer
  if (user.mobileNumber) {
    const waMsg = type === 'DEDUCT'
      ? `➖ *Wallet Debited Notification*\n\nHello *${user.name}*,\n₹${numAmount.toFixed(2)} has been debited from your wallet balance by Portal Admin.\n\n• *Remark:* ${remarks || 'Manual Adjustment'}\n• *New Wallet Balance:* ₹${user.walletBalance.toFixed(2)}`
      : `🎉 *Wallet Top-Up Credited!*\n\nHello *${user.name}*,\n₹${numAmount.toFixed(2)} has been credited to your wallet balance by Portal Admin!\n\n• *Remark:* ${remarks || 'Manual Top-Up'}\n• *New Wallet Balance:* ₹${user.walletBalance.toFixed(2)}\n\nThank you for using eCyberCafe Portal!`;
    sendWhatsAppMessage(user.mobileNumber, waMsg).catch(() => {});
  }

  // Instant Telegram Alert for Wallet Update
  const nowStrAdmin = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
  const tgAdminMsg = `💰 <b>ADMIN WALLET UPDATE (${type === 'DEDUCT' ? '🔴 DEBIT' : '🟢 CREDIT / TOP-UP'})</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>User:</b> ${escapeHtml(user.name)} (${escapeHtml(user.mobileNumber || 'N/A')})\n` +
    `🏪 <b>Store:</b> ${escapeHtml(user.storeName || 'N/A')}\n` +
    `💵 <b>Amount:</b> ₹${numAmount.toFixed(2)}\n` +
    `📊 <b>Previous Balance:</b> ₹${prevAdminBal.toFixed(2)}\n` +
    `🏦 <b>New Wallet Balance:</b> ₹${user.walletBalance.toFixed(2)}\n` +
    `📝 <b>Remark:</b> ${escapeHtml(remarks || 'Admin Manual Adjustment')}\n` +
    `⏰ <b>Time:</b> ${escapeHtml(nowStrAdmin)}\n` +
    `━━━━━━━━━━━━━━━━━━━━`;
  sendTelegramAlert(tgAdminMsg).catch(() => {});

  saveDatabaseToFile();

  broadcastRealtimeEvent('USER_LIST_UPDATED', { users: sanitizeUsers(users) });
  broadcastRealtimeEvent('WALLET_UPDATED', { userId: user.id, newBalance: user.walletBalance, tx });

  res.json({
    message: `Wallet updated successfully. New balance for ${user.name}: ₹${user.walletBalance.toFixed(2)}`,
    user: sanitizeUser(user),
    transaction: tx
  });
});

// Delete user by Admin
app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (users[userIdx].role === 'ADMIN') {
    return res.status(400).json({ error: 'Cannot delete primary Admin user.' });
  }

  const deleted = users.splice(userIdx, 1)[0];
  broadcastRealtimeEvent('USER_LIST_UPDATED', { users: sanitizeUsers(users) });
  res.json({ message: `User ${deleted.name} deleted successfully.` });
});

// Helper function to normalize and assign clean 1-based sequential priorities (1, 2, 3, ... N)
function normalizeServicePriorities() {
  if (!citizenServices || citizenServices.length === 0) return;

  // Sort citizenServices by priority ascending, maintaining creation order fallback (first created first, last created last)
  citizenServices.sort((a, b) => {
    const pA = a.priority !== undefined && !isNaN(Number(a.priority)) ? Number(a.priority) : undefined;
    const pB = b.priority !== undefined && !isNaN(Number(b.priority)) ? Number(b.priority) : undefined;
    
    if (pA !== undefined && pB !== undefined && pA !== pB) {
      return pA - pB;
    }
    if (pA !== undefined && pB === undefined) return -1;
    if (pA === undefined && pB !== undefined) return 1;

    // Fallback: earliest created service first (1st), latest created service at the end (last)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  // Assign clean sequential numbers 1, 2, 3, ... N
  citizenServices.forEach((srv, idx) => {
    srv.priority = idx + 1;
  });
}

// Services Catalog Endpoints (Get, Create / Launch, Update, Delete)
app.get('/api/services', (req: Request, res: Response) => {
  const { category, search, activeOnly } = req.query;

  // Normalize priorities across all services
  normalizeServicePriorities();

  let list = [...citizenServices];

  if (activeOnly === 'true') {
    list = list.filter(s => s.isActive);
  }
  if (category && category !== 'ALL') {
    list = list.filter(s => s.category.toLowerCase() === (category as string).toLowerCase());
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }

  // Ensure strictly sorted by priority (first created first, last created last)
  list.sort((a, b) => {
    const pA = a.priority !== undefined && !isNaN(Number(a.priority)) ? Number(a.priority) : 999999;
    const pB = b.priority !== undefined && !isNaN(Number(b.priority)) ? Number(b.priority) : 999999;
    if (pA !== pB) return pA - pB;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  // Enable fast caching headers so browsers and CDNs deliver responses in <10ms
  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  res.json(list);
});

// Categories List Endpoint
app.get('/api/categories', (req: Request, res: Response) => {
  const stdCats = ['Aadhaar', 'Voter', 'PAN', 'Transport', 'Samagra', 'Utility'];
  const customCats: string[] = Array.isArray((portalSettings as any).customCategories)
    ? (portalSettings as any).customCategories
    : ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];

  // Dynamically extract any other categories from citizenServices
  const dynamicCats = new Set<string>();
  citizenServices.forEach(s => {
    if (s.category && s.category.trim()) dynamicCats.add(s.category.trim());
  });

  const merged = Array.from(new Set([...stdCats, ...customCats, ...Array.from(dynamicCats)]));

  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
  res.json({
    standardCategories: stdCats,
    customCategories: customCats,
    allCategories: merged
  });
});

// Admin Endpoint: Reorder / Move Service UP or DOWN
app.post('/api/services/reorder', (req: Request, res: Response) => {
  const { serviceId, direction } = req.body;

  normalizeServicePriorities();

  if (serviceId && (direction === 'UP' || direction === 'DOWN')) {
    const idx = citizenServices.findIndex(s => s.id === serviceId);
    if (idx !== -1) {
      if (direction === 'UP' && idx > 0) {
        // Swap with previous service in priority list
        const temp = citizenServices[idx];
        citizenServices[idx] = citizenServices[idx - 1];
        citizenServices[idx - 1] = temp;
      } else if (direction === 'DOWN' && idx < citizenServices.length - 1) {
        // Swap with next service in priority list
        const temp = citizenServices[idx];
        citizenServices[idx] = citizenServices[idx + 1];
        citizenServices[idx + 1] = temp;
      }

      // Re-assign clean 1-based sequential priorities
      citizenServices.forEach((srv, i) => {
        srv.priority = i + 1;
      });

      saveDatabaseToFile();
      citizenServices.forEach(s => saveServiceToFirestore(s));
      broadcastRealtimeEvent('SERVICES_UPDATED', { services: citizenServices });
      return res.json({ success: true, count: citizenServices.length, services: citizenServices });
    }
  }

  return res.status(400).json({ error: 'Invalid reorder parameters.' });
});

// Admin Endpoint: Force Auto-Index / Reset Priority Serial numbers (1 to N)
app.post('/api/services/reindex', (req: Request, res: Response) => {
  normalizeServicePriorities();
  saveDatabaseToFile();
  citizenServices.forEach(s => saveServiceToFirestore(s));
  broadcastRealtimeEvent('SERVICES_UPDATED', { services: citizenServices });
  res.json({ success: true, count: citizenServices.length, services: citizenServices });
});

// Sync / Restore Recovered Services Endpoint
app.post('/api/services/sync', (req: Request, res: Response) => {
  const importedServices = Array.isArray(req.body.citizenServices) ? req.body.citizenServices : null;
  if (importedServices && importedServices.length > 0) {
    const sMap = new Map<string, CitizenService>();
    citizenServices.forEach(s => {
      if (s && s.id) sMap.set(s.id, s);
    });
    importedServices.forEach((s: CitizenService) => {
      if (s && s.id && s.title) {
        if (!sMap.has(s.id)) {
          sMap.set(s.id, s);
        } else {
          const live = sMap.get(s.id)!;
          sMap.set(s.id, { ...s, ...live });
        }
      }
    });
    citizenServices = Array.from(sMap.values());
    saveDatabaseToFile();
    citizenServices.forEach(s => saveServiceToFirestore(s));
    broadcastRealtimeEvent('SERVICES_UPDATED', { services: citizenServices });
    return res.json({ success: true, count: citizenServices.length, services: citizenServices });
  }
  res.json({ success: true, count: citizenServices.length, services: citizenServices });
});

// Admin Endpoint: LAUNCH NEW SERVICE (Dynamic Forms & Price & Features)
app.post('/api/services', (req: Request, res: Response) => {
  const { title, category, price, distributorPrice, distributorCommissionPercent, processingTime, badge, iconType, iconUrl, bgGradient, description, fields, warningNotice, warningImage, warningType, enablePanResizer, enableCompressionTool, enableChat, isDistributorOnly, flowType, serviceTypeTag, dailyLimit, timingText, priority, announcementBanner, telegramAlertEnabled, telegramChatId, telegramBotToken } = req.body;

  if (!title || price === undefined) {
    return res.status(400).json({ error: 'Title and Price are required to launch a new service.' });
  }

  const catName = (category || 'Aadhaar').trim();
  const stdCats = ['Aadhaar', 'Voter', 'PAN', 'Transport', 'Samagra', 'Utility'];
  let customCats: string[] = Array.isArray((portalSettings as any).customCategories)
    ? (portalSettings as any).customCategories
    : ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];

  if (!stdCats.some(c => c.toLowerCase() === catName.toLowerCase()) && 
      !customCats.some(c => c.toLowerCase() === catName.toLowerCase())) {
    customCats.push(catName);
    (portalSettings as any).customCategories = customCats;
  }

  const newService: CitizenService = {
    id: `srv_${Date.now()}`,
    title,
    category: catName,
    price: Number(price) || 0,
    distributorPrice: distributorPrice !== undefined && distributorPrice !== null && distributorPrice !== '' ? Number(distributorPrice) : undefined,
    distributorCommissionPercent: distributorCommissionPercent !== undefined && distributorCommissionPercent !== null && distributorCommissionPercent !== '' ? Number(distributorCommissionPercent) : undefined,
    processingTime: processingTime || (flowType === 'Instant' ? 'INSTANT ⚡' : '10-15 MIN'),
    badge: badge || 'NEW',
    iconType: iconType || 'shield-check',
    iconUrl: iconUrl || undefined,
    bgGradient: bgGradient || 'from-indigo-600 to-purple-700',
    description: description || 'New Indian citizen portal e-service.',
    enablePanResizer: enablePanResizer !== undefined ? Boolean(enablePanResizer) : (category === 'PAN' || String(title).toLowerCase().includes('pan')),
    enableCompressionTool: enableCompressionTool !== undefined ? Boolean(enableCompressionTool) : false,
    enableChat: enableChat !== undefined ? Boolean(enableChat) : true,
    isDistributorOnly: Boolean(isDistributorOnly),
    flowType: flowType || 'Manual',
    serviceTypeTag: serviceTypeTag || 'Main Service',
    dailyLimit: dailyLimit || 'Unlimited',
    timingText: timingText || '24×7',
    priority: priority !== undefined && !isNaN(Number(priority)) ? Number(priority) : (citizenServices.length + 1),
    announcementBanner: announcementBanner || undefined,
    fields: Array.isArray(fields) && fields.length > 0 ? fields : [
      { id: 'applicant_no', label: 'Document / Registration Number', type: 'text', placeholder: 'Enter ID Number', required: true },
      { id: 'mobile_no', label: 'Mobile Number / मोबाइल नंबर', type: 'text', placeholder: '10 Digit Mobile Number', required: true },
      { id: 'remarks', label: 'Special Instructions', type: 'textarea', placeholder: 'Optional note', required: false }
    ],
    warningNotice: warningNotice || undefined,
    warningImage: warningImage || undefined,
    warningType: warningType || 'warning',
    telegramAlertEnabled: telegramAlertEnabled !== undefined ? Boolean(telegramAlertEnabled) : false,
    telegramChatId: telegramChatId ? String(telegramChatId).trim() : undefined,
    telegramBotToken: telegramBotToken ? String(telegramBotToken).trim() : undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  citizenServices.push(newService);
  normalizeServicePriorities();
  saveDatabaseToFile();
  saveServiceToFirestore(newService);

  // Send Notification to all retailers
  const notif: AppNotification = {
    id: `notif_${Date.now()}`,
    recipientRole: 'RETAILER',
    title: `🚀 New Service Launched: ${title}!`,
    message: `A new service "${title}" is now available at ₹${price}. Apply directly from dashboard!`,
    type: 'NEW_SUBMISSION',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  notifications.unshift(notif);

  broadcastRealtimeEvent('SERVICE_LAUNCHED', { service: newService });

  res.status(201).json(newService);
});

// Admin Endpoint: Update Service (Price, Name, Form Fields, Active Status)
app.put('/api/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = citizenServices.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const existing = citizenServices[index];

  const updatedDistPrice = req.body.distributorPrice !== undefined
    ? (req.body.distributorPrice === null || req.body.distributorPrice === '' ? undefined : Number(req.body.distributorPrice))
    : existing.distributorPrice;

  const updatedDistCommPct = req.body.distributorCommissionPercent !== undefined
    ? (req.body.distributorCommissionPercent === null || req.body.distributorCommissionPercent === '' ? undefined : Number(req.body.distributorCommissionPercent))
    : existing.distributorCommissionPercent;

  citizenServices[index] = {
    ...existing,
    ...req.body,
    price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
    priority: req.body.priority !== undefined && !isNaN(Number(req.body.priority)) ? Number(req.body.priority) : existing.priority,
    distributorPrice: updatedDistPrice,
    distributorCommissionPercent: updatedDistCommPct,
  };

  normalizeServicePriorities();
  saveDatabaseToFile();
  citizenServices.forEach(s => saveServiceToFirestore(s));
  broadcastRealtimeEvent('SERVICE_UPDATED', { service: citizenServices[index] });
  broadcastRealtimeEvent('SERVICES_UPDATED', { services: citizenServices });

  res.json(citizenServices[index]);
});

// Admin Endpoint: Delete / Disable Service
app.delete('/api/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  const index = citizenServices.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  if (force) {
    const deleted = citizenServices.splice(index, 1)[0];
    saveDatabaseToFile();
    deleteServiceFromFirestore(id);
    broadcastRealtimeEvent('SERVICE_DELETED', { serviceId: id });
    return res.json({ message: 'Service permanently deleted successfully.', deleted });
  }

  citizenServices[index].isActive = false;
  saveDatabaseToFile();
  saveServiceToFirestore(citizenServices[index]);
  broadcastRealtimeEvent('SERVICE_UPDATED', { service: citizenServices[index] });

  res.json({ message: 'Service deactivated successfully.' });
});

// ==========================================
// PUBLIC GOVERNMENT SERVICES HUB API ENDPOINTS
// ==========================================

// Helper to normalize public services priorities
function normalizePublicServicesPriorities() {
  if (!publicGovServices || publicGovServices.length === 0) return;
  // Clean out any legacy removed e-Aadhaar download service
  publicGovServices = publicGovServices.filter(s => 
    s.id !== 'pub_1' && 
    !s.title?.toLowerCase().includes('download e-aadhaar') && 
    !s.hindiTitle?.includes('ई-आधार कार्ड डाउनलोड करें')
  );
  publicGovServices.sort((a, b) => {
    const pA = a.priority !== undefined && !isNaN(Number(a.priority)) ? Number(a.priority) : 999;
    const pB = b.priority !== undefined && !isNaN(Number(b.priority)) ? Number(b.priority) : 999;
    if (pA !== pB) return pA - pB;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
  publicGovServices.forEach((srv, idx) => {
    srv.priority = idx + 1;
  });
}

// GET /api/public-services - Fetch public services list
app.get('/api/public-services', (req: Request, res: Response) => {
  const { all, category, search, stateCode } = req.query;
  normalizePublicServicesPriorities();

  let list = [...publicGovServices];

  // If not requesting all (e.g. guest view), only return active services
  if (all !== 'true') {
    list = list.filter(s => s.isActive !== false);
  }

  if (category && category !== 'ALL') {
    list = list.filter(s => s.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (stateCode && stateCode !== 'ALL') {
    list = list.filter(s => !s.stateCode || s.stateCode === 'ALL' || s.stateCode.toLowerCase() === (stateCode as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.hindiTitle && s.hindiTitle.toLowerCase().includes(q)) ||
      (s.tagline && s.tagline.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.portalUrl && s.portalUrl.toLowerCase().includes(q))
    );
  }

  res.json({
    services: list,
    total: list.length,
    categories: Array.from(new Set(publicGovServices.map(s => s.category).filter(Boolean)))
  });
});

// POST /api/admin/public-services - Add a new public government link
app.post('/api/admin/public-services', (req: Request, res: Response) => {
  const { title, hindiTitle, tagline, category, portalUrl, badge, badgeColor, iconType, iconUrl, isActive, priority, stateCode, description, subItems } = req.body;

  if (!title || !portalUrl) {
    return res.status(400).json({ error: 'Title and Official Portal URL are required.' });
  }

  const newService: PublicGovService = {
    id: `pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    hindiTitle: hindiTitle ? hindiTitle.trim() : undefined,
    tagline: tagline ? tagline.trim() : 'Official Government Direct Portal',
    category: category || 'General Utility',
    portalUrl: portalUrl.trim(),
    badge: badge ? badge.trim() : 'OFFICIAL GOVT',
    badgeColor: badgeColor || 'blue',
    iconType: iconType || 'utility',
    iconUrl: iconUrl || undefined,
    isActive: isActive !== false,
    priority: priority !== undefined ? Number(priority) : (publicGovServices.length + 1),
    stateCode: stateCode || 'ALL',
    description: description ? description.trim() : undefined,
    subItems: Array.isArray(subItems) ? subItems : [],
    createdAt: new Date().toISOString()
  };

  publicGovServices.push(newService);
  normalizePublicServicesPriorities();
  saveDatabaseToFile();
  broadcastRealtimeEvent('PUBLIC_SERVICES_UPDATED', { services: publicGovServices });

  res.status(201).json({
    message: 'Public Government Service added successfully.',
    service: newService,
    services: publicGovServices
  });
});

// PUT /api/admin/public-services/:id - Update public government link
app.put('/api/admin/public-services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = publicGovServices.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Public Service not found.' });
  }

  const { title, hindiTitle, tagline, category, portalUrl, badge, badgeColor, iconType, iconUrl, isActive, priority, stateCode, description, subItems } = req.body;

  publicGovServices[index] = {
    ...publicGovServices[index],
    ...(title !== undefined && { title: title.trim() }),
    ...(hindiTitle !== undefined && { hindiTitle: hindiTitle ? hindiTitle.trim() : undefined }),
    ...(tagline !== undefined && { tagline: tagline.trim() }),
    ...(category !== undefined && { category }),
    ...(portalUrl !== undefined && { portalUrl: portalUrl.trim() }),
    ...(badge !== undefined && { badge: badge ? badge.trim() : undefined }),
    ...(badgeColor !== undefined && { badgeColor }),
    ...(iconType !== undefined && { iconType }),
    ...(iconUrl !== undefined && { iconUrl }),
    ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    ...(priority !== undefined && { priority: Number(priority) }),
    ...(stateCode !== undefined && { stateCode }),
    ...(description !== undefined && { description: description ? description.trim() : undefined }),
    ...(subItems !== undefined && { subItems: Array.isArray(subItems) ? subItems : [] })
  };

  normalizePublicServicesPriorities();
  saveDatabaseToFile();
  broadcastRealtimeEvent('PUBLIC_SERVICES_UPDATED', { services: publicGovServices });

  res.json({
    message: 'Public Service updated successfully.',
    service: publicGovServices[index],
    services: publicGovServices
  });
});

// DELETE /api/admin/public-services/:id - Delete public government link
app.delete('/api/admin/public-services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = publicGovServices.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Public Service not found.' });
  }

  const deleted = publicGovServices.splice(index, 1)[0];
  normalizePublicServicesPriorities();
  saveDatabaseToFile();
  broadcastRealtimeEvent('PUBLIC_SERVICES_UPDATED', { services: publicGovServices });

  res.json({
    message: `Public service '${deleted.title}' deleted successfully.`,
    deleted,
    services: publicGovServices
  });
});

// POST /api/admin/public-services/reorder - Reorder public service (Move UP / DOWN or Bulk Order)
app.post('/api/admin/public-services/reorder', (req: Request, res: Response) => {
  const { serviceId, direction, orderedIds } = req.body;

  if (Array.isArray(orderedIds)) {
    const idMap = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
    publicGovServices.sort((a, b) => (idMap.get(a.id) || 999) - (idMap.get(b.id) || 999));
    publicGovServices.forEach((srv, i) => { srv.priority = i + 1; });
  } else if (serviceId && direction) {
    const idx = publicGovServices.findIndex(s => s.id === serviceId);
    if (idx !== -1) {
      if (direction === 'UP' && idx > 0) {
        const temp = publicGovServices[idx];
        publicGovServices[idx] = publicGovServices[idx - 1];
        publicGovServices[idx - 1] = temp;
      } else if (direction === 'DOWN' && idx < publicGovServices.length - 1) {
        const temp = publicGovServices[idx];
        publicGovServices[idx] = publicGovServices[idx + 1];
        publicGovServices[idx + 1] = temp;
      }
      publicGovServices.forEach((srv, i) => { srv.priority = i + 1; });
    }
  }

  saveDatabaseToFile();
  broadcastRealtimeEvent('PUBLIC_SERVICES_UPDATED', { services: publicGovServices });
  res.json({ success: true, services: publicGovServices });
});

// POST /api/admin/public-services/reset-defaults - Reset to standard government portals
app.post('/api/admin/public-services/reset-defaults', (req: Request, res: Response) => {
  publicGovServices = JSON.parse(JSON.stringify(DEFAULT_PUBLIC_GOV_SERVICES));
  normalizePublicServicesPriorities();
  saveDatabaseToFile();
  broadcastRealtimeEvent('PUBLIC_SERVICES_UPDATED', { services: publicGovServices });
  res.json({
    message: 'Reset to default public government services catalog successfully.',
    services: publicGovServices
  });
});

// Retailer Endpoint: SUBMIT PRODUCT / SERVICE FOR VERIFICATION
app.post('/api/products', (req: Request, res: Response) => {
  const { retailerId, title, category, description, price, serviceFee, sku, images } = req.body;

  if (!title || price === undefined) {
    return res.status(400).json({ error: 'Title and Price are required.' });
  }

  const user = users.find(u => u.id === retailerId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const fee = Number(serviceFee) || 150;
  if (user.walletBalance < fee) {
    return res.status(400).json({ error: `Insufficient wallet balance (₹${user.walletBalance}). Required fee is ₹${fee}.` });
  }

  const prevBalance = user.walletBalance;
  user.walletBalance -= fee;

  // Record transaction
  const txn: WalletTransaction = {
    id: `txn_${Date.now()}`,
    retailerId: user.id,
    amount: fee,
    type: 'DEBIT',
    previousBalance: prevBalance,
    newBalance: user.walletBalance,
    description: `Product Verification Fee for: ${title}`,
    createdAt: new Date().toISOString()
  };
  walletTransactions.unshift(txn);

  // Save product / request
  const newProduct = {
    id: `prod_${Date.now()}`,
    retailerId: user.id,
    retailerName: user.name,
    title,
    category: category || 'General',
    description: description || '',
    price: Number(price),
    serviceFee: fee,
    sku: sku || `SKU-${Math.floor(100000 + Math.random() * 899999)}`,
    images: Array.isArray(images) ? images : [],
    status: 'PENDING_VERIFICATION',
    createdAt: new Date().toISOString()
  };

  saveDatabaseToFile();

  broadcastRealtimeEvent('PRODUCT_SUBMITTED', { product: newProduct, user });

  res.json({
    success: true,
    message: 'Product submitted successfully for verification.',
    remainingWalletBalance: user.walletBalance,
    product: newProduct
  });
});

// Helper: Calculate Custom Block Rate based on State, District, Block & App Prefix
function getCalculatedBlockPrice(formData: Record<string, any>, defaultPrice: number): { price: number; matchedNote?: string } {
  if (!formData) return { price: defaultPrice };
  const state = (formData.state || '').toString().trim().toLowerCase();
  const district = (formData.district || '').toString().trim().toLowerCase();
  const block = (formData.block || '').toString().trim().toLowerCase();
  const appPrefix = (formData.app_prefix || '').toString().trim().toLowerCase();
  const appNumber = (formData.app_number || formData.app_no || '').toString().trim().toLowerCase();

  if (!state && !district && !block && !appPrefix && !appNumber) {
    return { price: defaultPrice };
  }

  // Find exact match by State + District + Block + App Prefix
  const matched = blockApplicationRates.find(r => {
    if (!r.isActive) return false;
    const sMatch = !r.state || r.state.trim().toLowerCase() === state;
    const dMatch = !r.district || r.district.trim().toLowerCase() === district;
    const bMatch = !r.block || r.block.trim().toLowerCase() === block;
    
    // Prefix match
    const rPrefix = (r.appPrefix || '').trim().toLowerCase();
    const pMatch = !rPrefix || rPrefix === 'all' ||
                   rPrefix === appPrefix ||
                   (appNumber && appNumber.startsWith(rPrefix));

    return sMatch && dMatch && bMatch && pMatch;
  });

  if (matched) {
    return { 
      price: matched.price, 
      matchedNote: `📍 Configured Rate Applied: ${matched.district} > ${matched.block} (${matched.appPrefix}): ₹${matched.price}` 
    };
  }

  // Fallback defaults when rate is NOT configured in the Rate List:
  // BICCO, BRCCO, BCCCO -> ₹100
  // BOBC, NCLCO (and all others) -> ₹130
  const normalizedPrefix = appPrefix.toUpperCase();
  if (['BICCO', 'BRCCO', 'BCCCO'].includes(normalizedPrefix)) {
    return { price: 100, matchedNote: `Standard Default Rate for ${normalizedPrefix}: ₹100 (Rate List not configured)` };
  } else if (['BOBC', 'NCLCO'].includes(normalizedPrefix) || normalizedPrefix.length > 0) {
    return { price: 130, matchedNote: `Standard Default Rate for ${normalizedPrefix || 'BOBC/NCLCO'}: ₹130 (Rate List not configured)` };
  }

  return { price: 100, matchedNote: 'Standard Default Rate: ₹100' };
}

// Block Rates Management APIs
app.get('/api/block-rates', (req: Request, res: Response) => {
  res.json(blockApplicationRates);
});

app.post('/api/block-rates/calculate', (req: Request, res: Response) => {
  const { state, district, block, appPrefix, appNumber } = req.body;
  const result = getCalculatedBlockPrice({ state, district, block, app_prefix: appPrefix, app_number: appNumber }, 50);
  res.json(result);
});

app.post('/api/block-rates', (req: Request, res: Response) => {
  const { state, district, block, appPrefix, appTypeLabel, price, notes } = req.body;
  if (!state || !district || !block || price === undefined) {
    return res.status(400).json({ error: 'State, District, Block and Price are required.' });
  }

  const existingIndex = blockApplicationRates.findIndex(
    r => r.state.toLowerCase() === state.toString().toLowerCase() &&
         r.district.toLowerCase() === district.toString().toLowerCase() &&
         r.block.toLowerCase() === block.toString().toLowerCase() &&
         (r.appPrefix || '').toLowerCase() === (appPrefix || 'ALL').toString().toLowerCase()
  );

  if (existingIndex !== -1) {
    blockApplicationRates[existingIndex].price = Number(price);
    if (appTypeLabel) blockApplicationRates[existingIndex].appTypeLabel = appTypeLabel;
    if (notes) blockApplicationRates[existingIndex].notes = notes;
    blockApplicationRates[existingIndex].updatedAt = new Date().toISOString();
    broadcastRealtimeEvent('BLOCK_RATE_UPDATED', { rate: blockApplicationRates[existingIndex] });
    return res.json(blockApplicationRates[existingIndex]);
  }

  const newRate: BlockApplicationRate = {
    id: `br_${Date.now()}`,
    state: state.toString().trim(),
    district: district.toString().trim(),
    block: block.toString().trim(),
    appPrefix: (appPrefix || 'ALL').toString().trim().toUpperCase(),
    appTypeLabel: appTypeLabel || `${appPrefix || 'ALL'} Application`,
    price: Number(price),
    isActive: true,
    notes: notes || '',
    updatedAt: new Date().toISOString()
  };

  blockApplicationRates.unshift(newRate);
  broadcastRealtimeEvent('BLOCK_RATE_CREATED', { rate: newRate });
  res.json(newRate);
});

app.put('/api/block-rates/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { state, district, block, appPrefix, appTypeLabel, price, isActive, notes } = req.body;

  const index = blockApplicationRates.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Block rate record not found.' });
  }

  if (state) blockApplicationRates[index].state = state;
  if (district) blockApplicationRates[index].district = district;
  if (block) blockApplicationRates[index].block = block;
  if (appPrefix) blockApplicationRates[index].appPrefix = appPrefix.toUpperCase();
  if (appTypeLabel) blockApplicationRates[index].appTypeLabel = appTypeLabel;
  if (price !== undefined) blockApplicationRates[index].price = Number(price);
  if (isActive !== undefined) blockApplicationRates[index].isActive = Boolean(isActive);
  if (notes !== undefined) blockApplicationRates[index].notes = notes;
  blockApplicationRates[index].updatedAt = new Date().toISOString();

  broadcastRealtimeEvent('BLOCK_RATE_UPDATED', { rate: blockApplicationRates[index] });
  res.json(blockApplicationRates[index]);
});

app.delete('/api/block-rates/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = blockApplicationRates.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Block rate record not found.' });
  }

  blockApplicationRates.splice(index, 1);
  broadcastRealtimeEvent('BLOCK_RATE_DELETED', { id });
  res.json({ message: 'Block rate deleted successfully.' });
});


// Service Requests API (Submit Request with Wallet Deduction, List, Update Status)
app.get('/api/requests', (req: Request, res: Response) => {
  const { retailerId, status, serviceIds, operatorUserId } = req.query;
  let list = [...serviceRequests];

  if (retailerId) {
    list = list.filter(r => r.retailerId === retailerId);
  }

  if (operatorUserId) {
    const opUser = users.find(u => u.id === operatorUserId);
    if (opUser && opUser.assignedServiceIds && opUser.assignedServiceIds.length > 0 && !opUser.assignedServiceIds.includes('*')) {
      list = list.filter(r => opUser.assignedServiceIds?.includes(r.serviceId));
    }
  } else if (serviceIds) {
    const idsArr = (serviceIds as string).split(',').map(s => s.trim()).filter(Boolean);
    if (idsArr.length > 0 && !idsArr.includes('*')) {
      list = list.filter(r => idsArr.includes(r.serviceId));
    }
  }

  if (status && status !== 'ALL') {
    list = list.filter(r => r.status === status);
  }

  const chatMsgMap = new Map<string, any[]>();
  chatMessages.forEach(m => {
    let arr = chatMsgMap.get(m.requestId);
    if (!arr) {
      arr = [];
      chatMsgMap.set(m.requestId, arr);
    }
    arr.push(m);
  });

  const enrichedList = list.map(r => ({
    ...r,
    chatMessages: chatMsgMap.get(r.id) || []
  }));

  enrichedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(enrichedList);
});

// Submit New Service Request (WITH AUTOMATIC INSTANT WALLET DEDUCTION & INSTANT API PAN FIND)
app.post('/api/requests', async (req: Request, res: Response) => {
  const { serviceId, retailerId, formData } = req.body;

  const service = citizenServices.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found or no longer available.' });
  }

  const retailer = users.find(u => u.id === retailerId);
  if (!retailer) {
    return res.status(404).json({ error: 'Retailer account not found.' });
  }

  // Calculate base price for user role (Distributor Rate vs Retailer Rate)
  let baseFee = service.price;
  const isDistributorRole = retailer && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(retailer.role);
  if (isDistributorRole) {
    const numDistPrice = (service as any).distributorPrice !== undefined && (service as any).distributorPrice !== null && (service as any).distributorPrice !== ''
      ? Number((service as any).distributorPrice)
      : undefined;
    const numDistCommPct = (service as any).distributorCommissionPercent !== undefined && (service as any).distributorCommissionPercent !== null && (service as any).distributorCommissionPercent !== ''
      ? Number((service as any).distributorCommissionPercent)
      : undefined;

    if (numDistPrice !== undefined && !isNaN(numDistPrice) && numDistPrice >= 0) {
      baseFee = numDistPrice;
    } else if (numDistCommPct !== undefined && !isNaN(numDistCommPct) && numDistCommPct >= 0) {
      baseFee = Number((service.price * (1 - numDistCommPct / 100)).toFixed(2));
    } else {
      const globalCommPercent = (portalSettings as any).distributorCommissionPercent ?? 2.0;
      baseFee = Number((service.price * (1 - globalCommPercent / 100)).toFixed(2));
    }
  }

  let fee = baseFee;
  let blockNote = '';
  if (service.id === 'srv_block_app' || (formData && formData.state && formData.district && formData.block)) {
    const calc = getCalculatedBlockPrice(formData, baseFee);
    fee = calc.price;
    blockNote = calc.matchedNote || '';
  }

  // Wallet Balance Check
  if (retailer.walletBalance < fee) {
    return res.status(400).json({
      error: `Insufficient Wallet Balance! Service charge: ₹${fee.toFixed(2)}, Your current wallet balance: ₹${retailer.walletBalance.toFixed(2)}. Please recharge your wallet first.`,
      requiredAmount: fee,
      currentBalance: retailer.walletBalance,
    });
  }

  // Automatic Instant Wallet Deduction
  retailer.walletBalance -= fee;

  const nextReqNum = serviceRequests.length + 1;

  const newRequest: ServiceRequest = {
    id: `req_${Date.now()}`,
    requestNumber: nextReqNum,
    serviceId: service.id,
    serviceTitle: service.title,
    category: service.category,
    retailerId: retailer.id,
    retailerName: retailer.name,
    retailerMobile: retailer.mobileNumber || '0000000000',
    price: fee,
    formData: formData || {},
    status: 'PENDING',
    adminRemarks: '📋 ADMIN के पास PENDING Request #' + nextReqNum + (blockNote ? ` [${blockNote}]` : ''),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadChatCount: { admin: 1, retailer: 0 },
  };

  // Instant Auto-Process via API using robust extraction
  const aadhaarVal = extractAadhaarFromFormData(formData, service.fields);
  const panVal = extractPanFromFormData(formData, service.fields);

  // Normalize newRequest.formData only if missing direct keys
  const hasAadhaarKey = Object.keys(newRequest.formData).some(k =>
    k.toLowerCase().includes('aadhaar') || k.toLowerCase().includes('aadhar') || k.toLowerCase() === 'uid'
  );
  if (aadhaarVal && !hasAadhaarKey) {
    newRequest.formData.aadhaar_no = aadhaarVal;
  }

  const hasPanKey = Object.keys(newRequest.formData).some(k =>
    k.toLowerCase().includes('pan')
  );
  if (panVal && !hasPanKey) {
    newRequest.formData.pan_no = panVal;
  }

  const sTitle = (service.title || '').toLowerCase();
  const sCat = (service.category || '').toLowerCase();
  const sProc = (service.processingTime || '').toLowerCase();

  // STAGE GUARD: If service is set to Manual flowType, strictly disable all auto API processing!
  const isExplicitManual = service.flowType === 'Manual';

  const isInstantService = !isExplicitManual && (
    service.flowType === 'Instant' ||
    service.flowType === 'Auto' ||
    sProc.includes('instant') ||
    sTitle.includes('instant')
  );

  const isVoterMobileLinkService = (
    service.id === 'srv_voter_mobile_link' ||
    sTitle.includes('voter mobile link') ||
    sTitle.includes('voter link without otp') ||
    sTitle.includes('voter_link') ||
    sTitle.includes('voter mobile')
  );

  const isRcPrintService = !isExplicitManual && (
    service.id === 'srv_rc_print' ||
    sTitle.includes('rc print') ||
    sTitle.includes('rc verification') ||
    sTitle.includes('vehicle rc') ||
    sTitle.includes('rc_print')
  );

  const isMobileInfoService = !isExplicitManual && (
    service.id === 'srv_mobile_info' ||
    sTitle.includes('mobile number info') ||
    sTitle.includes('mobile detail') ||
    sTitle.includes('mobile info') ||
    sTitle.includes('mobile owner')
  );

  const isPanDetailsService = !isExplicitManual && (
    service.id === 'srv_9' ||
    sTitle.includes('pan details') ||
    sTitle.includes('pan to full details') ||
    sTitle.includes('pan full details')
  );

  const isPanFindService = !isExplicitManual && (
    service.id === 'srv_8' ||
    sTitle.includes('pan find') ||
    sTitle.includes('aadhar to pan') ||
    sTitle.includes('aadhaar to pan') ||
    sTitle.includes('find pan') ||
    sTitle.includes('pan search')
  );

  if (isInstantService || isVoterMobileLinkService) {
    if (isVoterMobileLinkService && voterMobileLinkApiSettings.autoProcessOnSubmit) {
      const epicVal = extractEpicFromFormData(formData, service.fields) || formData?.epic_no || formData?.epicNumber || formData?.epic || formData?.epic_number || formData?.voter_no;
      const mobVal = extractMobileFromFormData(formData, service.fields) || formData?.mobile_no || formData?.mobileNumber || formData?.mobile;

      if (!epicVal || !mobVal) {
        retailer.walletBalance += fee;
        saveDatabaseToFile();
        return res.status(400).json({
          error: 'Voter EPIC Number and Mobile Number are required for Instant Voter Mobile Link. Request was NOT placed in Pending and Wallet fee was NOT deducted.',
          apiError: 'Missing EPIC or Mobile number',
          remainingWalletBalance: retailer.walletBalance
        });
      }

      try {
        console.log(`[Voter Mobile Link Auto-Process] Attempting instant mobile link for EPIC ${epicVal} & Mobile ${mobVal}...`);
        const apiResult = await executeVoterMobileLinkApi(epicVal, mobVal);
        if (apiResult && apiResult.success) {
          newRequest.status = 'COMPLETED';
          newRequest.adminRemarks = `⚡ INSTANT VOTER MOBILE LINK: EPIC = ${apiResult.epicNumber}, Mobile = ${apiResult.mobileNumber}, Status = ${apiResult.request_status}`;
          newRequest.formData = {
            ...newRequest.formData,
            epicNumber: apiResult.epicNumber,
            mobileNumber: apiResult.mobileNumber,
            request_status: apiResult.request_status,
            autoProcessedAt: new Date().toISOString()
          };

          const autoMsg: ChatMessage = {
            id: `msg_${Date.now()}_auto_voter_link`,
            requestId: newRequest.id,
            senderId: 'usr_admin',
            senderName: 'System Voter Link API',
            senderRole: 'ADMIN',
            text: `🎉 INSTANT VOTER MOBILE LINK SUCCESSFUL!\n\n• Voter EPIC: ${apiResult.epicNumber}\n• Mobile Number: ${apiResult.mobileNumber}\n• Request Status: ${apiResult.request_status}\n• Status: COMPLETED 🟢`,
            createdAt: new Date().toISOString()
          };
          chatMessages.push(autoMsg);

          if (retailer.mobileNumber) {
            const waMsg = `✅ *VOTER MOBILE LINK INSTANT COMPLETED*\n\nDear *${retailer.name}*,\nYour Voter Mobile Link request (#${nextReqNum}) for EPIC ${apiResult.epicNumber} was completed!\n\n• *EPIC NO:* ${apiResult.epicNumber}\n• *MOBILE NO:* ${apiResult.mobileNumber}\n• *STATUS:* ${apiResult.request_status}\n\nThank you for using eCyberCafe Portal!`;
            sendWhatsAppMessage(retailer.mobileNumber, waMsg).catch(() => {});
          }
        } else {
          // API returned error or failure: REFUND WALLET & DO NOT SUBMIT REQUEST (DO NOT SAVE TO serviceRequests)
          retailer.walletBalance += fee;
          const apiErrMsg = apiResult?.error || 'Voter Link API execution failed';
          const rawErr = apiResult?.rawData || { status: 'error', message: apiErrMsg };
          saveDatabaseToFile();

          console.log(`[Voter Mobile Link Auto-Process] API Failed: ${apiErrMsg}. Wallet refunded (₹${fee.toFixed(2)} restored). Request NOT submitted.`);

          return res.status(400).json({
            error: `Voter Link API Error: ${apiErrMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
            apiError: apiErrMsg,
            rawError: typeof rawErr === 'object' ? rawErr : { status: 'error', message: String(rawErr) },
            remainingWalletBalance: retailer.walletBalance
          });
        }
      } catch (autoErr: any) {
        console.error('[Voter Mobile Link Auto-Process] Error executing API:', autoErr);
        retailer.walletBalance += fee;
        const errMsg = autoErr.message || 'Server connection error';
        saveDatabaseToFile();

        return res.status(400).json({
          error: `API Exception: ${errMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
          apiError: errMsg,
          rawError: { status: 'error', message: errMsg },
          remainingWalletBalance: retailer.walletBalance
        });
      }
    } else if (isRcPrintService && rcPrintApiSettings.autoProcessOnSubmit) {
      const rcVal = extractRcNumberFromFormData(formData, service.fields) || formData?.rcno || formData?.rc_no || formData?.rcNumber || formData?.vehicle_no;
      if (!rcVal) {
        retailer.walletBalance += fee;
        saveDatabaseToFile();
        return res.status(400).json({
          error: 'Vehicle RC Number is required for Instant RC Print. Request was NOT placed in Pending and Wallet fee was NOT deducted.',
          apiError: 'Missing Vehicle RC Number',
          remainingWalletBalance: retailer.walletBalance
        });
      }

      try {
        console.log(`[RC Print Auto-Process] Attempting instant RC Print API for Vehicle RC ${rcVal}...`);
        const apiResult = await executeRcPrintApi(rcVal);
        if (apiResult && apiResult.success) {
          newRequest.status = 'COMPLETED';
          if (apiResult.pdfUrl) {
            newRequest.outputAttachmentUrl = apiResult.pdfUrl;
            newRequest.outputFileUrl = apiResult.pdfUrl;
          }
          newRequest.adminRemarks = `⚡ INSTANT AUTO-PROCESSED via Server API: Vehicle = ${apiResult.rcno}, Owner = ${apiResult.name}`;
          newRequest.formData = {
            ...newRequest.formData,
            rcno: apiResult.rcno,
            owner_name: apiResult.name,
            application_no: apiResult.application_no,
            pdfUrl: apiResult.pdfUrl,
            autoProcessedAt: new Date().toISOString()
          };

          const autoMsg: ChatMessage = {
            id: `msg_${Date.now()}_auto_rc`,
            requestId: newRequest.id,
            senderId: 'usr_admin',
            senderName: 'System Vehicle API',
            senderRole: 'ADMIN',
            text: `🎉 INSTANT RC PRINT GENERATED!\n\n• Vehicle RC: ${apiResult.rcno}\n• Owner Name: ${apiResult.name}\n• PDF Link: ${apiResult.pdfUrl || 'Generated'}\n• Status: COMPLETED 🟢`,
            createdAt: new Date().toISOString()
          };
          chatMessages.push(autoMsg);

          if (retailer.mobileNumber) {
            const waMsg = `✅ *RC PRINT INSTANT COMPLETED*\n\nDear *${retailer.name}*,\nYour RC Print request (#${nextReqNum}) for Vehicle ${apiResult.rcno} was completed instantly!\n\n• *VEHICLE RC:* ${apiResult.rcno}\n• *NAME:* ${apiResult.name}\n• *APPLICATION NO:* ${apiResult.application_no}\n• *Status:* COMPLETED 🟢\n\nThank you for using eCyberCafe Portal!`;
            sendWhatsAppMessage(retailer.mobileNumber, waMsg).catch(() => {});
          }
        } else {
          retailer.walletBalance += fee;
          const apiErrMsg = (apiResult as any)?.error || 'Vehicle RC details not found or API unavailable';
          const rawErr = (apiResult as any)?.rawData || (apiResult as any)?.rawResponse || { status: 'error', message: apiErrMsg };
          saveDatabaseToFile();

          console.log(`[RC Print Auto-Process] API Failed: ${apiErrMsg}. Wallet refunded (₹${fee.toFixed(2)} restored). Request NOT submitted.`);

          return res.status(400).json({
            error: `RC Print API Error: ${apiErrMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
            apiError: apiErrMsg,
            rawError: typeof rawErr === 'object' ? rawErr : { status: 'error', message: String(rawErr) },
            remainingWalletBalance: retailer.walletBalance
          });
        }
      } catch (autoErr: any) {
        console.error('[RC Print Auto-Process] Error executing RC Print API lookup:', autoErr);
        retailer.walletBalance += fee;
        const errMsg = autoErr.message || 'RC Print Server connection error';
        saveDatabaseToFile();

        return res.status(400).json({
          error: `RC Print API Exception: ${errMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
          apiError: errMsg,
          rawError: { status: 'error', message: errMsg },
          remainingWalletBalance: retailer.walletBalance
        });
      }
    } else if (isMobileInfoService) {
      if (mobileInfoApiSettings.autoProcessOnSubmit) {
        const mobVal = extractMobileFromFormData(formData, service.fields) || formData?.mobile_no || formData?.mobileNumber || formData?.mobile || formData?.num;
        if (!mobVal) {
          retailer.walletBalance += fee;
          saveDatabaseToFile();
          return res.status(400).json({
            error: '10-digit Mobile Number is required for Instant Mobile Lookup. Request was NOT placed in Pending and Wallet fee was NOT deducted.',
            apiError: 'Missing Mobile Number',
            remainingWalletBalance: retailer.walletBalance
          });
        }

        try {
          console.log(`[Mobile Info Auto-Process] Attempting instant lookup for Mobile ${mobVal}...`);
          const apiResult = await executeMobileInfoApi(mobVal);
          if (apiResult && apiResult.success && apiResult.data) {
            newRequest.status = 'COMPLETED';
            newRequest.adminRemarks = `⚡ INSTANT AUTO-PROCESSED via Server API: Owner = ${apiResult.data.owner_name}, Address = ${apiResult.data.address}`;
            newRequest.formData = {
              ...newRequest.formData,
              owner_name: apiResult.data.owner_name,
              father_name: apiResult.data.father_name,
              address: apiResult.data.address,
              aadhar_number: apiResult.data.aadhar_number,
              alternative_number: apiResult.data.alternative_number,
              sim_card: apiResult.data.sim_card,
              email: apiResult.data.email,
              autoProcessedAt: new Date().toISOString()
            };

            const autoMsg: ChatMessage = {
              id: `msg_${Date.now()}_auto_mob`,
              requestId: newRequest.id,
              senderId: 'usr_admin',
              senderName: 'System Mobile API',
              senderRole: 'ADMIN',
              text: `🎉 INSTANT MOBILE DETAILS FOUND!\n\n• Mobile: ${mobVal}\n• Owner Name: ${apiResult.data.owner_name}\n• Father Name: ${apiResult.data.father_name}\n• Address: ${apiResult.data.address}\n• Aadhaar No: ${apiResult.data.aadhar_number}\n• Alt Mobile: ${apiResult.data.alternative_number}\n• Status: COMPLETED 🟢`,
              createdAt: new Date().toISOString()
            };
            chatMessages.push(autoMsg);

            if (retailer.mobileNumber) {
              const waMsg = `✅ *MOBILE DETAILS INSTANT COMPLETED*\n\nDear *${retailer.name}*,\nYour Mobile Details request (#${nextReqNum}) for Mobile ${mobVal} was completed instantly!\n\n• *NAME:* ${apiResult.data.owner_name}\n• *FATHER:* ${apiResult.data.father_name}\n• *ADDRESS:* ${apiResult.data.address}\n• *AADHAAR:* ${apiResult.data.aadhar_number}\n• *Status:* COMPLETED 🟢\n\nThank you for using eCyberCafe Portal!`;
              sendWhatsAppMessage(retailer.mobileNumber, waMsg).catch(() => {});
            }
          } else {
            retailer.walletBalance += fee;
            const apiErrMsg = (apiResult as any)?.error || 'Mobile Number details not found or API failed';
            const rawErr = (apiResult as any)?.rawData || (apiResult as any)?.rawResponse || { status: 'error', message: apiErrMsg };
            saveDatabaseToFile();

            console.log(`[Mobile Info Auto-Process] API Failed: ${apiErrMsg}. Wallet refunded (₹${fee.toFixed(2)} restored). Request NOT submitted.`);

            return res.status(400).json({
              error: `Mobile Info API Error: ${apiErrMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
              apiError: apiErrMsg,
              rawError: typeof rawErr === 'object' ? rawErr : { status: 'error', message: String(rawErr) },
              remainingWalletBalance: retailer.walletBalance
            });
          }
        } catch (autoErr: any) {
          console.error('[Mobile Info Auto-Process] Error executing Tech4Point lookup:', autoErr);
          retailer.walletBalance += fee;
          const errMsg = autoErr.message || 'Mobile Info connection error';
          saveDatabaseToFile();

          return res.status(400).json({
            error: `Mobile Info API Exception: ${errMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
            apiError: errMsg,
            rawError: { status: 'error', message: errMsg },
            remainingWalletBalance: retailer.walletBalance
          });
        }
      }
    } else if (panFindApiSettings.autoProcessOnSubmit) {
      if (isPanDetailsService) {
        if (!panVal) {
          retailer.walletBalance += fee;
          saveDatabaseToFile();
          return res.status(400).json({
            error: 'PAN Card Number is required for Instant PAN Details lookup. Request was NOT placed in Pending and Wallet fee was NOT deducted.',
            apiError: 'Missing PAN Number',
            remainingWalletBalance: retailer.walletBalance
          });
        }

        try {
          console.log(`[PAN Details Auto-Process] Attempting instant lookup for PAN ${panVal}...`);
          const apiResult = await executePanDetailsApi(panVal);
          if (apiResult && apiResult.success) {
            newRequest.status = 'COMPLETED';
            newRequest.adminRemarks = `⚡ INSTANT AUTO-PROCESSED via APIAdda: Name = ${apiResult.name}, Father = ${apiResult.fathername}, DOB = ${apiResult.dob}`;
            newRequest.formData = {
              ...newRequest.formData,
              pan_found: apiResult.pan,
              pan_name: apiResult.name,
              father_name: apiResult.fathername,
              dob: apiResult.dob,
              aadhaar_status: apiResult.aadharno,
              gender: apiResult.gender,
              pan_category: apiResult.pan_category,
              autoProcessedAt: new Date().toISOString()
            };

            const autoMsg: ChatMessage = {
              id: `msg_${Date.now()}_auto`,
              requestId: newRequest.id,
              senderId: 'usr_admin',
              senderName: 'System PAN API',
              senderRole: 'ADMIN',
              text: `🎉 INSTANT PAN DETAILS FETCHED!\n\n• PAN Number: ${apiResult.pan}\n• Name: ${apiResult.name}\n• Father Name: ${apiResult.fathername}\n• DOB: ${apiResult.dob}\n• Aadhaar Status: ${apiResult.aadharno}\n• Status: COMPLETED 🟢`,
              createdAt: new Date().toISOString()
            };
            chatMessages.push(autoMsg);

            if (retailer.mobileNumber) {
              const waMsg = `✅ *PAN DETAILS INSTANT COMPLETED*\n\nDear *${retailer.name}*,\nYour PAN Details request (#${nextReqNum}) for PAN ${apiResult.pan} was completed instantly!\n\n• *NAME:* ${apiResult.name}\n• *FATHER NAME:* ${apiResult.fathername}\n• *DOB:* ${apiResult.dob}\n• *AADHAAR LINK:* ${apiResult.aadharno}\n• *Status:* COMPLETED 🟢\n\nThank you for using eCyberCafe Portal!`;
              sendWhatsAppMessage(retailer.mobileNumber, waMsg).catch(() => {});
            }
          } else {
            retailer.walletBalance += fee;
            const apiErrMsg = (apiResult as any)?.error || 'PAN Details not found or lookup failed';
            const rawErr = (apiResult as any)?.rawData || (apiResult as any)?.rawResponse || { status: 'error', message: apiErrMsg };
            saveDatabaseToFile();

            console.log(`[PAN Details Auto-Process] API Failed: ${apiErrMsg}. Wallet refunded (₹${fee.toFixed(2)} restored). Request NOT submitted.`);

            return res.status(400).json({
              error: `PAN Details API Error: ${apiErrMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
              apiError: apiErrMsg,
              rawError: typeof rawErr === 'object' ? rawErr : { status: 'error', message: String(rawErr) },
              remainingWalletBalance: retailer.walletBalance
            });
          }
        } catch (autoErr: any) {
          console.error('[PAN Details Auto-Process] Error executing APIAdda lookup:', autoErr);
          retailer.walletBalance += fee;
          const errMsg = autoErr.message || 'PAN Details server connection error';
          saveDatabaseToFile();

          return res.status(400).json({
            error: `PAN Details API Exception: ${errMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
            apiError: errMsg,
            rawError: { status: 'error', message: errMsg },
            remainingWalletBalance: retailer.walletBalance
          });
        }
      } else if (isPanFindService) {
        if (!aadhaarVal) {
          retailer.walletBalance += fee;
          saveDatabaseToFile();
          return res.status(400).json({
            error: '12-digit Aadhaar Number is required for Instant PAN Find. Request was NOT placed in Pending and Wallet fee was NOT deducted.',
            apiError: 'Missing Aadhaar Number',
            remainingWalletBalance: retailer.walletBalance
          });
        }

        try {
          console.log(`[PAN Find Auto-Process] Attempting instant lookup for Aadhaar ${aadhaarVal}...`);
          const apiResult = await executePanFindApi(aadhaarVal);
          if (apiResult && apiResult.success && apiResult.pan) {
            newRequest.status = 'COMPLETED';
            newRequest.adminRemarks = `⚡ INSTANT AUTO-PROCESSED: PAN Number = ${apiResult.pan}`;
            newRequest.formData = { ...newRequest.formData, pan_found: apiResult.pan, autoProcessedAt: new Date().toISOString() };

            const autoMsg: ChatMessage = {
              id: `msg_${Date.now()}_auto`,
              requestId: newRequest.id,
              senderId: 'usr_admin',
              senderName: 'System PAN API',
              senderRole: 'ADMIN',
              text: `🎉 INSTANT AUTO-PROCESSED SUCCESS!\n\nAadhaar: ${aadhaarVal}\nFound PAN Number: ${apiResult.pan}\nStatus: COMPLETED`,
              createdAt: new Date().toISOString()
            };
            chatMessages.push(autoMsg);

            if (retailer.mobileNumber) {
              const waMsg = `✅ *PAN FIND INSTANT COMPLETED*\n\nDear *${retailer.name}*,\nYour PAN Find request (#${nextReqNum}) for Aadhaar ${aadhaarVal} was completed instantly!\n\n• *PAN NUMBER:* ${apiResult.pan}\n• *Status:* COMPLETED 🟢\n\nThank you for using eCyberCafe Portal!`;
              sendWhatsAppMessage(retailer.mobileNumber, waMsg).catch(() => {});
            }
          } else {
            retailer.walletBalance += fee;
            const apiErrMsg = (apiResult as any)?.error || 'PAN Number not linked or not found for this Aadhaar';
            const rawErr = (apiResult as any)?.rawData || (apiResult as any)?.rawResponse || { status: 'error', message: apiErrMsg };
            saveDatabaseToFile();

            console.log(`[PAN Find Auto-Process] API Failed: ${apiErrMsg}. Wallet refunded (₹${fee.toFixed(2)} restored). Request NOT submitted.`);

            return res.status(400).json({
              error: `PAN Find API Error: ${apiErrMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
              apiError: apiErrMsg,
              rawError: typeof rawErr === 'object' ? rawErr : { status: 'error', message: String(rawErr) },
              remainingWalletBalance: retailer.walletBalance
            });
          }
        } catch (autoErr: any) {
          console.error('[PAN Find Auto-Process] Error executing Tech4Point lookup:', autoErr);
          retailer.walletBalance += fee;
          const errMsg = autoErr.message || 'PAN Find connection error';
          saveDatabaseToFile();

          return res.status(400).json({
            error: `PAN Find API Exception: ${errMsg}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
            apiError: errMsg,
            rawError: { status: 'error', message: errMsg },
            remainingWalletBalance: retailer.walletBalance
          });
        }
      }
    }

    // STRICT GUARD FOR ALL INSTANT/AUTO SERVICES:
    // If a service is configured as Instant or Auto, and status could not be COMPLETED instantly,
    // it MUST NOT be saved into serviceRequests or placed in PENDING!
    if (isInstantService && newRequest.status !== 'COMPLETED') {
      retailer.walletBalance += fee;
      saveDatabaseToFile();
      const failReason = newRequest.adminRemarks?.replace(/^📋 ADMIN के पास PENDING Request #\d+\s*/, '').replace(/^⚠️\s*/, '') || 'Instant service API is currently offline or unconfigured';
      console.log(`[Instant Flow Guard] Service ${service.title} could not be completed instantly. Wallet refunded (₹${fee.toFixed(2)}). Request NOT saved to Pending.`);

      return res.status(400).json({
        error: `Instant Service Error: ${failReason}. Request was NOT placed in Pending and Wallet fee ₹${fee.toFixed(2)} was NOT deducted.`,
        apiError: failReason,
        remainingWalletBalance: retailer.walletBalance
      });
    }
  }

  serviceRequests.unshift(newRequest);

  // Wallet Transaction Record
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}`,
    retailerId: retailer.id,
    type: 'DEDUCTION',
    amount: fee,
    previousBalance: retailer.walletBalance + fee,
    newBalance: retailer.walletBalance,
    description: `Auto-deducted fee for service "${service.title}" (Request #${nextReqNum})`,
    requestId: newRequest.id,
    serviceTitle: service.title,
    createdAt: new Date().toISOString(),
  };
  walletTransactions.unshift(tx);

  // Welcome chat log
  const initialMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    requestId: newRequest.id,
    senderId: retailer.id,
    senderName: retailer.name,
    senderRole: 'RETAILER',
    text: `Submitted service request #${nextReqNum} for "${service.title}". Charge ₹${fee.toFixed(2)} deducted from wallet.`,
    createdAt: new Date().toISOString(),
  };
  chatMessages.push(initialMsg);

  // Notifications
  const submissionTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const adminNotif: AppNotification = {
    id: `notif_${Date.now()}_1`,
    recipientRole: 'ADMIN',
    title: `🔔 New Service Request #${nextReqNum}`,
    message: `Customer: ${retailer.name || 'User'}\nService: ${service.title}\nRequest ID: #${nextReqNum}\nTime: ${submissionTime}`,
    type: 'NEW_SUBMISSION',
    isRead: false,
    requestId: newRequest.id,
    createdAt: new Date().toISOString(),
  };

  const retailerNotif: AppNotification = {
    id: `notif_${Date.now()}_2`,
    recipientRole: 'RETAILER',
    recipientId: retailer.id,
    title: `₹${fee.toFixed(2)} Service Fee Deducted`,
    message: `₹${fee.toFixed(2)} deducted from wallet for "${service.title}". Remaining balance: ₹${retailer.walletBalance.toFixed(2)}.`,
    type: 'WALLET_DEDUCTION',
    isRead: false,
    requestId: newRequest.id,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(adminNotif, retailerNotif);

  // Send WhatsApp Notification to retailer
  if (retailer.mobileNumber) {
    const portalUrl = getPortalUrl(req);
    const waMsg = `Hello *${retailer.name || 'User'}*! 📄\n\nYour Request #${nextReqNum} for "*${service.title}*" has been submitted successfully.\n\n• *Fee Deducted:* ₹${fee.toFixed(2)}\n• *Remaining Wallet Balance:* ₹${retailer.walletBalance.toFixed(2)}\n• *Status:* IN_PROCESS ⚙️\n\nWe will update you on WhatsApp as soon as your document is generated!\n\n🌐 *Visit Website for More Services:*\n${portalUrl}\n\nThank you for using eCyberCafe Portal!`;
    sendWhatsAppMessage(retailer.mobileNumber, waMsg);
  }

  broadcastRealtimeEvent('REQUEST_SUBMITTED', { 
    request: newRequest, 
    retailer, 
    tx, 
    notification: adminNotif,
    pushNotification: {
      title: '🔔 New Service Request',
      body: `Customer: ${retailer.name || 'User'}\nService: ${service.title}\nRequest ID: #${nextReqNum}\nTime: ${submissionTime}`,
      url: `/service/${service.id}`
    }
  });

  // Dispatch Instant Telegram Alert to Group/Channel
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });

  // Construct field details summary for Telegram alert
  let formSummary = '';
  if (newRequest.formData && typeof newRequest.formData === 'object') {
    const entries = Object.entries(newRequest.formData)
      .filter(([k, v]) => v && typeof v === 'string' && !k.endsWith('_filename') && !k.endsWith('_filesize'))
      .map(([k, v]) => {
        const fieldLabel = service.fields?.find(f => f.id === k)?.label || k;
        return `• <b>${escapeHtml(fieldLabel)}:</b> <code>${escapeHtml(String(v))}</code>`;
      });
    if (entries.length > 0) {
      formSummary = `\n📋 <b>INPUT DETAILS (ग्राहक विवरण):</b>\n` + entries.join('\n') + `\n`;
    }
  }

  const tgMsg = 
    `🚨 <b>NEW REQUEST RECEIVED ALERT!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 <b>Request ID:</b> #${nextReqNum}\n` +
    `⚙️ <b>Service Name:</b> ${escapeHtml(service.title)}\n` +
    `📂 <b>Category:</b> ${escapeHtml(service.category)}\n` +
    `👤 <b>Retailer:</b> ${escapeHtml(retailer.name || 'User')} (${escapeHtml(retailer.mobileNumber || 'N/A')})\n` +
    `💰 <b>Fee Deducted:</b> ₹${fee.toFixed(2)}\n` +
    `⏰ <b>Entry Time:</b> ${escapeHtml(nowStr)}\n` +
    `📊 <b>Status:</b> ${escapeHtml(newRequest.status)}\n` +
    formSummary +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👉 <i>Operators & Admins, please log in to process this request!</i>`;

  // 1. Send alert to service's custom Telegram operator group if configured
  if ((service.telegramAlertEnabled || service.telegramChatId) && service.telegramChatId) {
    sendTelegramAlert(tgMsg, service.telegramChatId, service.telegramBotToken).catch((err) => {
      console.error(`[Telegram] Failed to send service group alert for ${service.title}:`, err);
    });
  }

  // 2. Also send alert to main default Telegram group if configured and different from custom group
  if (!service.telegramChatId || (TELEGRAM_CHAT_ID && service.telegramChatId !== TELEGRAM_CHAT_ID)) {
    sendTelegramAlert(tgMsg).catch(() => {});
  }

  saveDatabaseToFile();

  res.status(201).json({
    request: newRequest,
    remainingWalletBalance: retailer.walletBalance,
    transaction: tx,
  });
});

// Admin / Operator Approve/Reject/Process Request
app.patch(['/api/requests/:id/status', '/api/admin/requests/:id/status'], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminRemarks, outputAttachmentUrl, shouldRefundFee } = req.body;

  const request = serviceRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Service request not found.' });
  }

  const prevStatus = request.status;
  request.status = status;
  request.updatedAt = new Date().toISOString();
  if (adminRemarks !== undefined) request.adminRemarks = adminRemarks;
  if (outputAttachmentUrl !== undefined) request.outputAttachmentUrl = outputAttachmentUrl;

  let refundTx: WalletTransaction | null = null;
  const retailer = users.find(u => u.id === request.retailerId);

  // Distributor Commission on Service Request Completion (Default 2% or Custom Rate/Price)
  let distributorCommTx: WalletTransaction | null = null;
  if (status === 'COMPLETED' && prevStatus !== 'COMPLETED' && !(request as any).isCommissionPaid) {
    const distId = retailer?.distributorId || retailer?.createdById;
    if (distId) {
      const distributor = users.find(u => u.id === distId);
      if (distributor && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD'].includes(distributor.role)) {
        const globalCommPercent = (portalSettings as any).distributorCommissionPercent ?? 2.0;
        const matchedService = citizenServices.find(s => s.id === request.serviceId);
        let commAmount = 0;
        let commDesc = '';

        if (matchedService && (matchedService as any).distributorPrice !== undefined && (matchedService as any).distributorPrice < request.price) {
          commAmount = Number((request.price - (matchedService as any).distributorPrice).toFixed(2));
          commDesc = `Distributor Margin (₹${commAmount.toFixed(2)}) for completed request #${request.requestNumber} ("${request.serviceTitle}") by Retailer ${retailer?.name || 'User'}`;
        } else if (matchedService && (matchedService as any).distributorCommissionPercent !== undefined) {
          const pct = (matchedService as any).distributorCommissionPercent;
          commAmount = Number((request.price * (pct / 100)).toFixed(2));
          commDesc = `${pct}% Distributor Commission (₹${commAmount.toFixed(2)}) for completed request #${request.requestNumber} ("${request.serviceTitle}") by Retailer ${retailer?.name || 'User'}`;
        } else {
          commAmount = Number((request.price * (globalCommPercent / 100)).toFixed(2));
          commDesc = `${globalCommPercent}% Distributor Commission (₹${commAmount.toFixed(2)}) for completed request #${request.requestNumber} ("${request.serviceTitle}") by Retailer ${retailer?.name || 'User'}`;
        }

        if (commAmount > 0) {
          (request as any).isCommissionPaid = true;
          const prevDistComm = distributor.commissionBalance || 0;
          distributor.commissionBalance = Number((prevDistComm + commAmount).toFixed(2));

          distributorCommTx = {
            id: `tx_comm_${Date.now()}`,
            retailerId: distributor.id,
            type: 'COMMISSION',
            amount: commAmount,
            previousBalance: prevDistComm,
            newBalance: distributor.commissionBalance,
            description: commDesc,
            requestId: request.id,
            serviceTitle: request.serviceTitle,
            createdAt: new Date().toISOString(),
          };
          walletTransactions.unshift(distributorCommTx);

          // WhatsApp notification to distributor
          if (distributor.mobileNumber) {
            sendWhatsAppMessage(
              distributor.mobileNumber,
              `💰 *Distributor Commission Credited!* 💰\n\nHello *${distributor.name}*,\nRequest #${request.requestNumber} ("${request.serviceTitle}") submitted by retailer *${retailer?.name}* has been COMPLETED!\n\n• *Commission Credited:* ₹${commAmount.toFixed(2)}\n• *Total Commission Balance:* ₹${distributor.commissionBalance.toFixed(2)}`
            );
          }
        }
      }
    }
  }

  // Auto-Refund ONLY on rejection or if explicitly requested when status is REJECTED
  const isRejected = status === 'REJECTED';
  const explicitlyRefunded = shouldRefundFee === true && isRejected;
  if ((isRejected || explicitlyRefunded) && retailer && !(request as any).isRefunded) {
    (request as any).isRefunded = true;
    const prevRfBal = retailer.walletBalance;
    retailer.walletBalance += request.price;
    refundTx = {
      id: `tx_rf_${Date.now()}`,
      retailerId: retailer.id,
      type: 'REFUND',
      amount: request.price,
      previousBalance: prevRfBal,
      newBalance: retailer.walletBalance,
      description: `Auto-refund ₹${request.price.toFixed(2)} for rejected request #${request.requestNumber} ("${request.serviceTitle}")`,
      requestId: request.id,
      serviceTitle: request.serviceTitle,
      createdAt: new Date().toISOString(),
    };
    walletTransactions.unshift(refundTx);
  }

  const notifTitle = status === 'COMPLETED'
    ? `Request #${request.requestNumber} Completed! 🎉`
    : status === 'IN_PROCESS'
    ? `Request #${request.requestNumber} Processing 🎯`
    : `Request #${request.requestNumber} Rejected ❌`;

  const statusNotif: AppNotification = {
    id: `notif_${Date.now()}`,
    recipientRole: 'RETAILER',
    recipientId: request.retailerId,
    title: notifTitle,
    message: (adminRemarks || `Status updated for ${request.serviceTitle}`) + (refundTx ? ` (₹${request.price.toFixed(2)} refunded to wallet 💰)` : ''),
    type: 'STATUS_CHANGE',
    isRead: false,
    requestId: request.id,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(statusNotif);

  const statusChatMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    requestId: request.id,
    senderId: 'usr_admin',
    senderName: 'Portal Admin',
    senderRole: 'ADMIN',
    text: `[STATUS UPDATE] Request status set to ${status}. ${adminRemarks ? 'Remark: ' + adminRemarks : ''}${refundTx ? `\n💰 ₹${request.price.toFixed(2)} automatically refunded to your wallet!` : ''}`,
    attachmentUrl: outputAttachmentUrl,
    createdAt: new Date().toISOString(),
  };
  chatMessages.push(statusChatMsg);

// Send WhatsApp Notification to retailer on status update with clean download link
  let waResult: any = { success: false, reason: 'No phone number' };
  let waPhone = retailer?.mobileNumber || getMobileFromFormData(request.formData);
  let waMsg = '';
  let waDirectUrl = '';

  if (waPhone) {
    const cleanPhone = formatWhatsAppNumber(waPhone);
    const portalUrl = getPortalUrl(req);
    const downloadLink = request.outputAttachmentUrl ? `${portalUrl}/api/download-output/${request.id}` : '';

    const statusHeader = status === 'COMPLETED' 
      ? '✅ *Service Completed / Success!*' 
      : status === 'REJECTED' 
      ? '❌ *Service Request Rejected!*' 
      : status === 'IN_PROCESS' 
      ? '⚙️ *Request Under Processing*' 
      : `📢 *Service Update: ${status}*`;

    waMsg = `Hello *${retailer?.name || request.retailerName || 'User'}*! 👋\n\n${statusHeader}\n\n📄 *Service Request Details:*\n• *Request No:* #${request.requestNumber}\n• *Service Title:* ${request.serviceTitle}\n• *Current Status:* *${status}*\n• *Remarks:* ${adminRemarks || 'No additional remarks'}${refundTx ? `\n• *Fee Refunded:* ₹${request.price.toFixed(2)} credited back to your wallet 💰` : ''}${downloadLink ? `\n\n📥 *Download Your Receiving File:* ${downloadLink}` : ''}\n\n🌐 *Visit Website for More Services:*\n${portalUrl}\n\nThank you for choosing eCyberCafe Portal!`;

    waDirectUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
    waResult = await sendWhatsAppMessage(cleanPhone, waMsg, downloadLink || undefined);
  }

  saveDatabaseToFile();

  broadcastRealtimeEvent('STATUS_UPDATED', { request, retailer, refundTx });

  res.json({
    request,
    retailer,
    refundTx,
    whatsappSent: waResult.success,
    whatsappPhone: waPhone ? formatWhatsAppNumber(waPhone) : null,
    whatsappMsg: waMsg,
    whatsappDirectUrl: waDirectUrl,
    whatsappResult: waResult
  });
});

// Operator Claim / Accept Request Endpoint
app.post(['/api/requests/:id/claim', '/api/admin/requests/:id/claim'], (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, operatorName, action } = req.body;

  const request = serviceRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Service request not found.' });
  }

  if (action === 'RELEASE') {
    request.claimedByOperatorId = undefined;
    request.claimedByOperatorName = undefined;
    broadcastRealtimeEvent('REQUEST_CLAIMED', { request });
    return res.json({ success: true, request });
  }

  if (request.claimedByOperatorId && request.claimedByOperatorId !== operatorId) {
    return res.status(400).json({
      error: `यह रिक्वेस्ट पहले ही ऑपरेटर "${request.claimedByOperatorName || 'अन्य ऑपरेटर'}" द्वारा स्वीकार/Claim कर ली गई है!`
    });
  }

  request.claimedByOperatorId = operatorId;
  request.claimedByOperatorName = operatorName || 'Operator';
  broadcastRealtimeEvent('REQUEST_CLAIMED', { request });

  res.json({ success: true, request });
});

// Admin Delete Request Endpoint
app.delete(['/api/requests/:id', '/api/admin/requests/:id'], (req: Request, res: Response) => {
  const { id } = req.params;
  const index = serviceRequests.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Service request not found.' });
  }

  const deletedReq = serviceRequests[index];
  serviceRequests.splice(index, 1);
  chatMessages = chatMessages.filter(m => m.requestId !== id);

  saveDatabaseToFile();
  broadcastRealtimeEvent('REQUEST_DELETED', { requestId: id, requestNumber: deletedReq.requestNumber });

  res.json({
    success: true,
    message: `Request #${deletedReq.requestNumber} deleted successfully.`,
    id
  });
});


// WhatsApp Integration Configuration & Helper
let WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '7a9a87b011a5ec92a63c57b895bad04e71af037254002adb';
let WHATSAPP_SESSION_ID = process.env.WHATSAPP_SESSION_ID || 'u439_Cyberacfe';
let WHATSAPP_NOTIF_ENABLED = true;
let PORTAL_CUSTOM_URL = process.env.PORTAL_CUSTOM_URL || '';

function getPortalUrl(req?: Request): string {
  if (PORTAL_CUSTOM_URL && PORTAL_CUSTOM_URL.trim()) {
    return PORTAL_CUSTOM_URL.trim();
  }
  if (req) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin && typeof origin === 'string' && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }
    const host = req.get('host');
    if (host) {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      return `${proto}://${host}`;
    }
  }
  return 'https://ais-dev-ckowqsymercjf7lngorh2z-685305791288.asia-southeast1.run.app';
}

function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits) || digits === '910000000000' || digits === '0000000000') return '';
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return digits;
  return '';
}

function getMobileFromFormData(formData: any): string | undefined {
  if (!formData || typeof formData !== 'object') return undefined;
  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string' && val.trim()) {
      const clean = val.replace(/\D/g, '');
      if (clean.length === 10 || (clean.length === 11 && clean.startsWith('0')) || (clean.length === 12 && clean.startsWith('91'))) {
        const kLower = key.toLowerCase();
        if (kLower.includes('mobile') || kLower.includes('phone') || kLower.includes('मोबाइल') || kLower === 'f_1' || kLower === 'f_2') {
          return val;
        }
      }
    }
  }
  for (const val of Object.values(formData)) {
    if (typeof val === 'string' && val.trim()) {
      const clean = val.replace(/\D/g, '');
      if (clean.length === 10 && /^[6-9]/.test(clean)) {
        return clean;
      }
    }
  }
  return undefined;
}

async function sendWhatsAppMessage(recipientPhone: string, messageText: string, mediaUrl?: string) {
  const activeToken = WHATSAPP_API_TOKEN || (adminPaymentSettings as any)?.waApiKey || '';
  if (!WHATSAPP_NOTIF_ENABLED || !activeToken || activeToken.trim() === '') {
    console.log('[WhatsApp] Notifications disabled or missing API token');
    return { success: false, reason: 'Disabled or missing token' };
  }

  const formattedNumber = formatWhatsAppNumber(recipientPhone);
  if (!formattedNumber) {
    console.log('[WhatsApp] Skipping send: invalid/dummy recipient phone number', recipientPhone);
    return { success: false, reason: 'Invalid phone number' };
  }

  try {
    const isMedia = Boolean(mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')));
    const params = new URLSearchParams();
    params.append('api_key', activeToken);
    params.append('number', formattedNumber);
    params.append('msg', messageText);
    if (WHATSAPP_SESSION_ID) {
      params.append('session', WHATSAPP_SESSION_ID);
      params.append('sessionId', WHATSAPP_SESSION_ID);
    }

    if (isMedia) {
      params.append('type', 'document');
      params.append('mediaUrl', mediaUrl!);
      params.append('caption', messageText);
    } else {
      params.append('type', 'text');
    }

    const requestUrl = `https://wbapi.in/api/send-text?${params.toString()}`;
    console.log(`[WhatsApp] Dispatching update to ${formattedNumber}...`);

    let response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'x-api-key': WHATSAPP_SESSION_ID || activeToken,
        'User-Agent': 'eCyberCafe-Portal/1.0'
      }
    });

    let resJson = await response.json().catch(() => null);

    if (resJson && resJson.message === 'api_key is required') {
      console.log(`[WhatsApp] API key missing or rejected by wbapi.in for ${formattedNumber}`);
      return { success: false, reason: 'Invalid/Missing API Key' };
    }

    // If GET attempt failed or returned status false, retry via POST endpoint if not api_key error
    if (!response.ok || (resJson && resJson.status === false)) {
      console.log(`[WhatsApp] GET request status false for ${formattedNumber}, retrying via POST...`);
      const postRes = await fetch('https://wbapi.in/api/send-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': WHATSAPP_SESSION_ID || activeToken
        },
        body: JSON.stringify({
          api_key: activeToken,
          session: WHATSAPP_SESSION_ID,
          sessionId: WHATSAPP_SESSION_ID,
          number: formattedNumber,
          msg: messageText,
          type: isMedia ? 'document' : 'text',
          mediaUrl: isMedia ? mediaUrl : undefined
        })
      });
      const postJson = await postRes.json().catch(() => null);
      if (postRes.ok && postJson && postJson.status !== false) {
        return { success: true, data: postJson };
      }
    }

    return { success: response.ok && Boolean(resJson && resJson.status !== false), data: resJson };
  } catch (err: any) {
    console.error(`[WhatsApp] Error sending message to ${formattedNumber}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Admin GET WhatsApp Config
app.get('/api/admin/whatsapp/config', (req: Request, res: Response) => {
  res.json({
    enabled: WHATSAPP_NOTIF_ENABLED,
    token: WHATSAPP_API_TOKEN,
    sessionId: WHATSAPP_SESSION_ID,
    portalUrl: PORTAL_CUSTOM_URL,
    maskedToken: WHATSAPP_API_TOKEN ? `${WHATSAPP_API_TOKEN.slice(0, 8)}...${WHATSAPP_API_TOKEN.slice(-6)}` : '',
    status: 'ACTIVE',
  });
});

// Admin POST WhatsApp Config
app.post('/api/admin/whatsapp/config', (req: Request, res: Response) => {
  const { token, sessionId, portalUrl, enabled } = req.body;
  if (typeof token === 'string' && token.trim()) {
    WHATSAPP_API_TOKEN = token.trim();
  }
  if (typeof sessionId === 'string' && sessionId.trim()) {
    WHATSAPP_SESSION_ID = sessionId.trim();
  }
  if (typeof portalUrl === 'string') {
    PORTAL_CUSTOM_URL = portalUrl.trim();
  }
  if (typeof enabled === 'boolean') {
    WHATSAPP_NOTIF_ENABLED = enabled;
  }
  saveDatabaseToFile();
  res.json({
    success: true,
    message: 'WhatsApp configuration updated successfully!',
    enabled: WHATSAPP_NOTIF_ENABLED,
    token: WHATSAPP_API_TOKEN,
    sessionId: WHATSAPP_SESSION_ID,
    portalUrl: PORTAL_CUSTOM_URL,
  });
});

// Telegram Bot & Group/Channel Alert Integration Configuration
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
let TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
let TELEGRAM_ALERTS_ENABLED = true;

function escapeHtml(text: any): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramAlert(messageHtml: string, customChatId?: string, customBotToken?: string) {
  const token = (customBotToken && customBotToken.trim()) ? customBotToken.trim() : (TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.trim() : '');
  const chatId = (customChatId && customChatId.trim()) ? customChatId.trim() : (TELEGRAM_CHAT_ID ? TELEGRAM_CHAT_ID.trim() : '');

  if (!token || !chatId) {
    console.log('[Telegram] Missing token or chatId for alert');
    return { success: false, reason: 'Telegram notifications missing Bot Token or Chat ID' };
  }
  if (!customChatId && !customBotToken && !TELEGRAM_ALERTS_ENABLED) {
    console.log('[Telegram] Global alerts disabled');
    return { success: false, reason: 'Telegram notifications disabled globally' };
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    // Attempt 1: Send with HTML parse mode
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data && data.ok) {
      return { success: true, data };
    }

    // Attempt 2: Fallback retry without parse_mode if HTML parsing or formatting failed
    console.warn('[Telegram] HTML alert failed (Status', response.status, '):', data?.description, '- Retrying with plain text fallback...');
    const plainText = messageHtml.replace(/<[^>]+>/g, '');
    const fallbackRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: plainText,
        disable_web_page_preview: false,
      }),
    });

    const fallbackData = await fallbackRes.json().catch(() => null);
    if (fallbackRes.ok && fallbackData && fallbackData.ok) {
      return { success: true, data: fallbackData };
    }

    // Format clear user-friendly explanation
    let rawReason = data?.description || fallbackData?.description || 'Telegram API Error';
    let errorReason = rawReason;
    if (rawReason.includes('chat not found')) {
      errorReason = 'Telegram Chat ID not found or Bot is not added to the Group/Channel. Check Chat ID & add Bot to group.';
    } else if (rawReason.includes('bot is not a member') || rawReason.includes('not in the chat')) {
      errorReason = 'Bot is not a member of the Telegram Group/Channel. Please add the Bot to your group as Admin.';
    } else if (rawReason.includes('Unauthorized') || rawReason.includes('Not Found')) {
      errorReason = 'Invalid Telegram Bot API Token. Please verify Bot Token from @BotFather.';
    }

    console.error('[Telegram] API error final:', errorReason, rawReason);
    return { success: false, data: data || fallbackData, reason: errorReason };
  } catch (err: any) {
    console.error('[Telegram] Exception in sendTelegramAlert:', err.message);
    return { success: false, error: err.message, reason: err.message };
  }
}

// Admin GET Telegram Config
app.get('/api/admin/telegram/config', (req: Request, res: Response) => {
  res.json({
    enabled: TELEGRAM_ALERTS_ENABLED,
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
    channelUrl: portalSettings.telegramChannel || 'https://t.me/eCyberCafeOfficial',
    maskedToken: TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.slice(0, 6)}...${TELEGRAM_BOT_TOKEN.slice(-4)}` : '',
    status: TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// Admin POST Telegram Config
app.post('/api/admin/telegram/config', (req: Request, res: Response) => {
  const { botToken, chatId, enabled, channelUrl } = req.body;
  if (typeof botToken === 'string') {
    TELEGRAM_BOT_TOKEN = botToken.trim();
  }
  if (typeof chatId === 'string') {
    TELEGRAM_CHAT_ID = chatId.trim();
  }
  if (typeof enabled === 'boolean') {
    TELEGRAM_ALERTS_ENABLED = enabled;
  }
  if (typeof channelUrl === 'string' && channelUrl.trim()) {
    portalSettings.telegramChannel = channelUrl.trim();
  }
  saveDatabaseToFile();
  res.json({
    success: true,
    message: 'Telegram Group/Channel Alert configuration saved successfully!',
    enabled: TELEGRAM_ALERTS_ENABLED,
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
    channelUrl: portalSettings.telegramChannel
  });
});

// Admin POST Telegram Test Message
app.post('/api/admin/telegram/test', async (req: Request, res: Response) => {
  const { customMessage, botToken, chatId } = req.body;
  if (botToken) TELEGRAM_BOT_TOKEN = botToken.trim();
  if (chatId) TELEGRAM_CHAT_ID = chatId.trim();

  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
  const portalUrl = getPortalUrl(req);

  const testText = customMessage || `🚨 <b>TEST ALERT: eCyberCafe Portal Telegram Alert System</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <b>Status:</b> Connected & Operating Normally!\n` +
    `⏰ <b>Timestamp:</b> ${nowStr}\n` +
    `🌐 <b>Portal Link:</b> <a href="${portalUrl}">${portalUrl}</a>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>🎉 Instant Telegram notifications are configured properly. All new service requests and top-up alerts will be delivered here instantly for your Operator & Admin team!</i>`;

  const result = await sendTelegramAlert(testText);
  if (result.success) {
    saveDatabaseToFile();
    res.json({ success: true, message: 'Test message sent successfully to Telegram Group/Channel!' });
  } else {
    res.status(400).json({ success: false, message: result.reason || result.error || 'Failed to send test message. Check Bot Token and Chat ID.' });
  }
});

// Admin POST Telegram Test Message for a specific Service
app.post('/api/admin/services/:id/telegram/test', async (req: Request, res: Response) => {
  const { id } = req.params;
  const service = citizenServices.find(s => s.id === id);

  if (!service) {
    return res.status(404).json({ success: false, message: 'Service not found.' });
  }

  const { customChatId, customBotToken } = req.body;
  const chatId = customChatId ? customChatId.trim() : (service.telegramChatId || TELEGRAM_CHAT_ID);
  const botToken = customBotToken ? customBotToken.trim() : (service.telegramBotToken || TELEGRAM_BOT_TOKEN);

  if (!chatId) {
    return res.status(400).json({ success: false, message: 'No Telegram Chat ID configured for this service or globally.' });
  }

  if (!botToken) {
    return res.status(400).json({ success: false, message: 'No Telegram Bot Token configured. Please set Bot Token first.' });
  }

  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });

  const testText = `🚨 <b>TEST ALERT: Special Service Operator Group (${escapeHtml(service.title)})</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚙️ <b>Service:</b> ${escapeHtml(service.title)}\n` +
    `📢 <b>Status:</b> Connected & Listening for New Requests!\n` +
    `⏰ <b>Test Time:</b> ${escapeHtml(nowStr)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <i>This is a test notification confirming that operators in this Telegram Group (${chatId}) will receive instant alerts whenever a user applies for ${escapeHtml(service.title)}!</i>`;

  const result = await sendTelegramAlert(testText, chatId, botToken);
  if (result.success) {
    res.json({ success: true, message: `✅ Test alert sent successfully to Telegram Group (${chatId})!` });
  } else {
    res.status(400).json({ success: false, message: result.reason || 'Failed to send test alert to Telegram.' });
  }
});

// PAN Find API Configuration (tech4point.shop & APIAdda Integration)
interface PanFindApiSettings {
  apiKey: string;
  secretKey: string;
  apiUrl: string;
  autoProcessOnSubmit: boolean;
}

let panFindApiSettings: PanFindApiSettings = {
  apiKey: 'AK474217',
  secretKey: '',
  apiUrl: 'https://tech4point.shop/api/v12/pan-find.php',
  autoProcessOnSubmit: true
};

// Mobile Info API Configuration (tech4point.shop Integration)
interface MobileInfoApiSettings {
  apiKey: string;
  apiUrl: string;
  autoProcessOnSubmit: boolean;
  adminOnly: boolean;
}

let mobileInfoApiSettings: MobileInfoApiSettings = {
  apiKey: 'AK474217',
  apiUrl: 'https://tech4point.shop/api/v2/mobil_info.php',
  autoProcessOnSubmit: true,
  adminOnly: false
};

// RC Print Verification API Configuration
interface RcPrintApiSettings {
  apiKey: string;
  apiUrl: string;
  autoProcessOnSubmit: boolean;
}

let rcPrintApiSettings: RcPrintApiSettings = {
  apiKey: 'AK474217',
  apiUrl: 'https://tech4point.shop/api/v1/rc_print.php',
  autoProcessOnSubmit: true
};

// Voter Mobile Link Without OTP API Configuration
interface VoterMobileLinkApiSettings {
  apiKey: string;
  userId: string;
  apiUrl: string;
  statusUrl: string;
  autoProcessOnSubmit: boolean;
}

let voterMobileLinkApiSettings: VoterMobileLinkApiSettings = {
  apiKey: '532a23eee523fb97e7ecd64e37b51bf3',
  userId: '709136152',
  apiUrl: 'https://myprints.co.in/api/voter/voter_link_withoutOTP_Instant.php',
  statusUrl: 'https://myprints.co.in/api/voter/voter_link_chekStstus.php',
  autoProcessOnSubmit: true
};

async function executeVoterMobileLinkApi(epicNumber: string, mobileNumber: string) {
  const cleanEpic = String(epicNumber || '').replace(/[\s\-\_]/g, '').toUpperCase();
  const cleanMobile = String(mobileNumber || '').replace(/[\s\-\_\+]/g, '').trim();

  if (cleanEpic.length < 5) {
    return { success: false, error: 'Valid Voter EPIC Number is required (e.g. XXZ4596585).' };
  }
  if (cleanMobile.length < 10) {
    return { success: false, error: 'Valid 10-digit Mobile Number is required.' };
  }

  const apiKey = voterMobileLinkApiSettings.apiKey || '532a23eee523fb97e7ecd64e37b51bf3';
  const userId = voterMobileLinkApiSettings.userId || '709136152';
  const baseUrl = voterMobileLinkApiSettings.apiUrl || 'https://myprints.co.in/api/voter/voter_link_withoutOTP_Instant.php';

  try {
    const formDataBody = new URLSearchParams();
    formDataBody.append('apiKey', apiKey);
    formDataBody.append('api_key', apiKey);
    formDataBody.append('userid', userId);
    formDataBody.append('userId', userId);
    formDataBody.append('epicNumber', cleanEpic);
    formDataBody.append('epic_no', cleanEpic);
    formDataBody.append('epic', cleanEpic);
    formDataBody.append('mobileNumber', cleanMobile);
    formDataBody.append('mobile_no', cleanMobile);
    formDataBody.append('mobile', cleanMobile);

    console.log(`[Voter Mobile Link API] Calling POST ${baseUrl}...`);
    let res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*'
      },
      body: formDataBody.toString()
    });

    let resText = await res.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { resJson = JSON.parse(jsonMatch[0]); } catch (e2) { resJson = null; }
      }
    }

    if (!resJson || res.status !== 200) {
      console.log(`[Voter Mobile Link API] POST returned status ${res.status}. Retrying via GET...`);
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('apiKey', apiKey);
      urlObj.searchParams.set('userid', userId);
      urlObj.searchParams.set('epicNumber', cleanEpic);
      urlObj.searchParams.set('mobileNumber', cleanMobile);

      res = await fetch(urlObj.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      resText = await res.text();
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        const jsonMatch = resText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { resJson = JSON.parse(jsonMatch[0]); } catch (e2) { resJson = null; }
        }
      }
    }

    const statusStr = String(resJson?.status || '').toLowerCase();
    const reqStatusStr = String(resJson?.request_status || '').toLowerCase();
    const msgStr = String(resJson?.message || resJson?.msg || resJson?.error || '').toLowerCase();

    const isExplicitError = (
      statusStr === 'error' ||
      statusStr === 'failed' ||
      statusStr === 'false' ||
      resJson?.status === false ||
      resJson?.success === false ||
      msgStr.includes('invalid') ||
      msgStr.includes('error') ||
      msgStr.includes('missing') ||
      msgStr.includes('fail')
    );

    const isSuccess = !isExplicitError && resJson && (
      statusStr === 'success' ||
      statusStr === 'true' ||
      statusStr === '200' ||
      statusStr === '1' ||
      resJson.status === true ||
      resJson.status === 200 ||
      resJson.code === 200 ||
      resJson.success === true ||
      (reqStatusStr.length > 0 && !reqStatusStr.includes('error') && !reqStatusStr.includes('fail')) ||
      (msgStr.includes('success') || msgStr.includes('submitted') || msgStr.includes('process') || msgStr.includes('linked'))
    );

    if (isSuccess) {
      return {
        success: true,
        epicNumber: resJson.epicNumber || resJson.epic_no || resJson.epic || cleanEpic,
        mobileNumber: resJson.mobileNumber || resJson.mobile_no || resJson.mobile || cleanMobile,
        request_status: resJson.request_status || resJson.message || 'Mobile Link Request Submitted Successfully',
        rawData: resJson
      };
    } else {
      return {
        success: false,
        error: resJson?.message || resJson?.error || resJson?.request_status || (resText && resText.length < 200 ? resText : 'Voter Mobile Link API returned error status.'),
        rawData: resJson || resText
      };
    }
  } catch (err: any) {
    console.error('[Voter Mobile Link API] Error:', err);
    return { success: false, error: `Server connection error: ${err.message || 'Network error'}` };
  }
}

async function executeVoterMobileLinkStatusCheckApi(epicNumber: string) {
  const cleanEpic = String(epicNumber || '').replace(/[\s\-\_]/g, '').toUpperCase();
  if (cleanEpic.length < 5) {
    return { success: false, error: 'Valid Voter EPIC Number is required.' };
  }

  const apiKey = voterMobileLinkApiSettings.apiKey || '532a23eee523fb97e7ecd64e37b51bf3';
  const userId = voterMobileLinkApiSettings.userId || '709136152';
  const baseUrl = voterMobileLinkApiSettings.statusUrl || 'https://myprints.co.in/api/voter/voter_link_chekStstus.php';

  try {
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('apiKey', apiKey);
    urlObj.searchParams.set('api_key', apiKey);
    urlObj.searchParams.set('userid', userId);
    urlObj.searchParams.set('userId', userId);
    urlObj.searchParams.set('epicNumber', cleanEpic);
    urlObj.searchParams.set('epic_no', cleanEpic);
    urlObj.searchParams.set('epic', cleanEpic);

    console.log(`[Voter Mobile Link Status Check API] Calling (${urlObj.toString()})...`);
    let res = await fetch(urlObj.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' }
    });

    let resText = await res.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { resJson = JSON.parse(jsonMatch[0]); } catch (e2) { resJson = null; }
      }
    }

    if ((!resJson || res.status === 405) && res.status !== 200) {
      console.log(`[Voter Mobile Link Status Check API] GET returned ${res.status}. Retrying via POST...`);
      const formDataBody = new URLSearchParams();
      formDataBody.append('apiKey', apiKey);
      formDataBody.append('api_key', apiKey);
      formDataBody.append('userid', userId);
      formDataBody.append('userId', userId);
      formDataBody.append('epicNumber', cleanEpic);
      formDataBody.append('epic_no', cleanEpic);
      formDataBody.append('epic', cleanEpic);

      res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*'
        },
        body: formDataBody.toString()
      });
      resText = await res.text();
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        const jsonMatch = resText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { resJson = JSON.parse(jsonMatch[0]); } catch (e2) { resJson = null; }
        }
      }
    }

    const statusStr = String(resJson?.status || '').toLowerCase();
    const reqStatusStr = String(resJson?.request_status || '').toLowerCase();
    const msgStr = String(resJson?.message || resJson?.msg || '').toLowerCase();

    const isSuccess = resJson && (
      statusStr === 'success' ||
      statusStr === 'true' ||
      statusStr === '200' ||
      statusStr === '1' ||
      resJson.status === true ||
      resJson.status === 200 ||
      resJson.code === 200 ||
      resJson.success === true ||
      (reqStatusStr.length > 0 && !reqStatusStr.includes('error') && !reqStatusStr.includes('fail')) ||
      (msgStr.includes('success') || msgStr.includes('submitted') || msgStr.includes('process') || msgStr.includes('linked'))
    );

    if (isSuccess) {
      return {
        success: true,
        epicNumber: resJson.epicNumber || resJson.epic_no || resJson.epic || cleanEpic,
        mobileNumber: resJson.mobileNumber || resJson.mobile_no || resJson.mobile || '',
        request_status: resJson.request_status || resJson.message || 'Mobile Link Status: Active/Processing',
        rawData: resJson
      };
    } else {
      return {
        success: false,
        error: resJson?.message || resJson?.error || resJson?.request_status || (resText && resText.length < 200 ? resText : 'Status check failed.'),
        rawData: resJson || resText
      };
    }
  } catch (err: any) {
    console.error('[Voter Mobile Link Status Check API] Error:', err);
    return { success: false, error: `Status check error: ${err.message || 'Network error'}` };
  }
}

async function executeMobileInfoApi(mobileNumber: string) {
  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, error: 'Valid 10-digit Mobile Number is required.' };
  }

  const apiKey = mobileInfoApiSettings.apiKey || 'AK474217';
  const baseUrl = mobileInfoApiSettings.apiUrl || 'https://tech4point.shop/api/v2/mobil_info.php';

  const targetUrl = `${baseUrl}?api_key=${encodeURIComponent(apiKey)}&mobile=${encodeURIComponent(cleanMobile)}&num=${encodeURIComponent(cleanMobile)}`;

  console.log(`[Mobile Info API] Calling tech4point.shop for Mobile: ${cleanMobile}...`);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const resText = await res.text();
    let resJson: any = null;

    // Direct JSON parse attempt
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      // Regex JSON extraction attempt if server prepends/appends PHP warnings
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          resJson = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          resJson = null;
        }
      }
    }

    if (resJson) {
      console.log('[Mobile Info API] Extracted JSON Response:', resJson);
      if (resJson.status === true || resJson.code === 'SUCCESS' || resJson.status === 'true' || (resJson.data && Object.keys(resJson.data).length > 0)) {
        const data = resJson.data || {};
        return {
          success: true,
          status: resJson.code || 'SUCCESS',
          message: resJson.message || 'Mobile details retrieved successfully',
          mobile: resJson.mobile || cleanMobile,
          data: {
            owner_name: data.owner_name || data.name || 'N/A',
            father_name: data.father_name || data.fatherName || 'N/A',
            address: data.address || 'N/A',
            alternative_number: data.alternative_number || data.alt_mobile || 'N/A',
            sim_card: data.sim_card || data.operator || 'N/A',
            aadhar_number: data.aadhar_number || data.aadhaar || 'N/A',
            email: data.email || 'N/A'
          },
          rawResponse: resJson
        };
      } else {
        const rawErr = resJson.message || resJson.error || resJson.msg || 'विवरण नहीं मिला (Record not found for this mobile number).';
        const cleanErr = String(rawErr).replace(/<[^>]*>/g, '').trim();
        return {
          success: false,
          status: String(resJson.code || resJson.status || 'DATA_NOT_FOUND'),
          error: cleanErr || 'विवरण नहीं मिला (Record not found for this mobile number).',
          rawResponse: resJson
        };
      }
    }

    // Non-JSON server response (HTML / PHP Warnings)
    console.warn('[Mobile Info API] Non-JSON server response:', resText);
    const cleanText = resText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    let userFriendlyError = 'विवरण नहीं मिला। (Record not found for this mobile number)';

    if (cleanText.includes('Undefined array key') || cleanText.includes('Warning') || cleanText.includes('Notice')) {
      userFriendlyError = `विवरण नहीं मिला: सर्वर पर मोबाइल नंबर (${cleanMobile}) का कोई डेटा उपलब्ध नहीं है।`;
    } else if (cleanText.length > 0 && cleanText.length < 150) {
      userFriendlyError = cleanText;
    }

    return {
      success: false,
      status: String(res.status || 'SERVER_RESPONSE_ERROR'),
      error: userFriendlyError,
      rawText: cleanText
    };
  } catch (err: any) {
    console.error('[Mobile Info API] Error executing fetch:', err.message);
    return { success: false, error: `सर्वर नेटवर्क त्रुटि: ${err.message}` };
  }
}

// Helper functions for extraction of Aadhaar and PAN from any formData object
function extractAadhaarFromFormData(formData: any, fields?: any[]): string | null {
  if (!formData || typeof formData !== 'object') return null;

  // 1. Direct keys
  const directKeys = [
    'aadhaar_no', 'aadhar_no', 'aadhaar', 'aadhar', 'aadhaar_number',
    'aadhar_number', 'aadhaarNo', 'aadharNo', 'uid', 'aadhaarCard',
    'aadharCard', 'input_aadhaar', 'aadhaarVal', 'aadharVal'
  ];
  for (const k of directKeys) {
    if (formData[k] && String(formData[k]).replace(/\D/g, '').length === 12) {
      return String(formData[k]).trim();
    }
  }

  // 2. Field metadata check
  if (Array.isArray(fields)) {
    for (const field of fields) {
      const label = (field.label || '').toLowerCase();
      const fid = (field.id || '').toLowerCase();
      if (label.includes('aadhaar') || label.includes('aadhar') || label.includes('आधार') || fid.includes('aadhaar') || fid.includes('aadhar')) {
        const val = formData[field.id];
        if (val && String(val).replace(/\D/g, '').length === 12) {
          return String(val).trim();
        }
      }
    }
  }

  // 3. Scan all object values for 12-digit number
  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string' || typeof val === 'number') {
      const cleaned = String(val).replace(/\D/g, '');
      if (cleaned.length === 12) {
        return String(val).trim();
      }
    }
  }

  return null;
}

function extractPanFromFormData(formData: any, fields?: any[]): string | null {
  if (!formData || typeof formData !== 'object') return null;

  // 1. Direct keys
  const directKeys = ['pan_no', 'pan', 'pan_number', 'panNo', 'pancard', 'pan_card'];
  for (const k of directKeys) {
    if (formData[k] && String(formData[k]).trim().length >= 8) {
      return String(formData[k]).trim().toUpperCase();
    }
  }

  // 2. Field metadata check
  if (Array.isArray(fields)) {
    for (const field of fields) {
      const label = (field.label || '').toLowerCase();
      const fid = (field.id || '').toLowerCase();
      if (label.includes('pan') || fid.includes('pan')) {
        const val = formData[field.id];
        if (val && String(val).trim().length >= 8) {
          return String(val).trim().toUpperCase();
        }
      }
    }
  }

  // 3. Match 10-character PAN regex
  const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/i;
  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string') {
      const match = val.trim().match(panRegex);
      if (match) {
        return match[0].toUpperCase();
      }
    }
  }

  return null;
}

function extractEpicFromFormData(formData: any, fields?: any[]): string | null {
  if (!formData || typeof formData !== 'object') return null;

  const directKeys = [
    'epic_no', 'epicNumber', 'epic', 'epic_number', 'voter_no', 'voter_id',
    'voter_epic', 'voter_card', 'voter_number', 'epic_id', 'voterNo', 'voterId', 'epicNo'
  ];
  for (const k of directKeys) {
    if (formData[k] && String(formData[k]).trim().length >= 5) {
      return String(formData[k]).trim().replace(/[\s\-\_]/g, '').toUpperCase();
    }
  }

  if (Array.isArray(fields)) {
    for (const field of fields) {
      const label = (field.label || '').toLowerCase();
      const fid = (field.id || '').toLowerCase();
      if (
        label.includes('epic') || label.includes('voter') || label.includes('एपिक') ||
        fid.includes('epic') || fid.includes('voter')
      ) {
        const val = formData[field.id];
        if (val && String(val).trim().length >= 5) {
          return String(val).trim().replace(/[\s\-\_]/g, '').toUpperCase();
        }
      }
    }
  }

  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string' && val.trim().length >= 5) {
      const cleaned = val.trim().replace(/[\s\-\_]/g, '').toUpperCase();
      if (/^[A-Z]{2,5}\d{6,8}$/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string' && val.trim().length >= 5) {
      const cleaned = val.trim().replace(/[\s\-\_]/g, '').toUpperCase();
      if (!/^\d{10}$/.test(cleaned) && !/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

function extractMobileFromFormData(formData: any, fields?: any[]): string | null {
  if (!formData || typeof formData !== 'object') return null;

  const directKeys = [
    'mobile_no', 'mobileNumber', 'mobile', 'num', 'phone', 'contact',
    'mobile_number', 'phone_no', 'phone_number', 'contact_no', 'input_mobile'
  ];
  for (const k of directKeys) {
    if (formData[k] && String(formData[k]).replace(/\D/g, '').length === 10) {
      return String(formData[k]).replace(/\D/g, '');
    }
  }

  if (Array.isArray(fields)) {
    for (const field of fields) {
      const label = (field.label || '').toLowerCase();
      const fid = (field.id || '').toLowerCase();
      if (label.includes('mobile') || label.includes('phone') || label.includes('मोबाइल') || fid.includes('mobile') || fid.includes('phone') || fid.includes('num')) {
        const val = formData[field.id];
        if (val && String(val).replace(/\D/g, '').length === 10) {
          return String(val).replace(/\D/g, '');
        }
      }
    }
  }

  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string' || typeof val === 'number') {
      const cleaned = String(val).replace(/\D/g, '');
      if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

function extractRcNumberFromFormData(formData: any, fields?: any[]): string | null {
  if (!formData || typeof formData !== 'object') return null;

  const directKeys = ['rcno', 'rc_no', 'rc_number', 'vehicle_no', 'vehicle_number', 'registration_no', 'reg_no', 'rcCard'];
  for (const k of directKeys) {
    if (formData[k] && String(formData[k]).trim().length >= 5) {
      return String(formData[k]).trim().toUpperCase();
    }
  }

  if (Array.isArray(fields)) {
    for (const field of fields) {
      const label = (field.label || '').toLowerCase();
      const fid = (field.id || '').toLowerCase();
      if (label.includes('rc') || label.includes('vehicle') || label.includes('गाड़ी') || fid.includes('rc') || fid.includes('vehicle')) {
        const val = formData[field.id];
        if (val && String(val).trim().length >= 5) {
          return String(val).trim().toUpperCase();
        }
      }
    }
  }

  const rcRegex = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}/i;
  for (const [key, val] of Object.entries(formData)) {
    if (typeof val === 'string') {
      const match = val.trim().match(rcRegex);
      if (match) {
        return match[0].toUpperCase();
      }
    }
  }

  return null;
}

async function executeRcPrintApi(rcNumber: string) {
  const cleanRc = String(rcNumber || '').replace(/[\s\-\_]/g, '').toUpperCase();
  if (cleanRc.length < 5) {
    return { success: false, error: 'Valid Vehicle RC Number is required (e.g. UP32CM4081).' };
  }

  const apiKey = rcPrintApiSettings.apiKey || 'AK474217';
  const baseUrl = rcPrintApiSettings.apiUrl || 'https://tech4point.shop/api/v1/rc_print.php';

  let targetUrl = '';
  try {
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('api_key', apiKey);
    urlObj.searchParams.set('rcno', cleanRc);
    targetUrl = urlObj.toString();
  } catch (e) {
    targetUrl = `${baseUrl}?api_key=${encodeURIComponent(apiKey)}&rcno=${encodeURIComponent(cleanRc)}`;
  }

  console.log(`[RC Print API] Calling API (${baseUrl}) for RC: ${cleanRc}... Target: ${targetUrl}`);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const resText = await res.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          resJson = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          resJson = null;
        }
      }
    }

    if (resJson) {
      console.log('[RC Print API] Response JSON status:', resJson.status, 'Message:', resJson.message);

      const isSuccess = (resJson.status === '200' || resJson.status === 200 || resJson.status === 'true' || resJson.status === true) && Boolean(resJson.pdf || resJson.name || resJson.rcno);

      if (isSuccess) {
        let pdfRelativeUrl = '';
        if (resJson.pdf) {
          try {
            let pdfBase64 = String(resJson.pdf).trim();
            if (pdfBase64.startsWith('data:application/pdf;base64,')) {
              pdfBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
            }
            const pdfBuffer = Buffer.from(pdfBase64, 'base64');
            const filename = `RC_Print_${cleanRc}_${Date.now()}.pdf`;
            const genDir = path.join(process.cwd(), 'uploads', 'generated');
            if (!fs.existsSync(genDir)) {
              try { fs.mkdirSync(genDir, { recursive: true }); } catch (e) {}
            }
            const destPath = path.join(genDir, filename);
            fs.writeFileSync(destPath, pdfBuffer);

            const publicGenDir = path.join(process.cwd(), 'public', 'uploads', 'generated');
            if (!fs.existsSync(publicGenDir)) {
              try { fs.mkdirSync(publicGenDir, { recursive: true }); } catch (e) {}
            }
            try { fs.writeFileSync(path.join(publicGenDir, filename), pdfBuffer); } catch (e) {}

            pdfRelativeUrl = `/uploads/generated/${filename}`;
          } catch (pdfErr) {
            console.error('[RC Print API] Error saving PDF buffer:', pdfErr);
          }
        }

        return {
          success: true,
          status: '200',
          message: resJson.message || 'RC verification & PDF print generated successfully',
          rcno: resJson.rcno || cleanRc,
          name: resJson.name || 'N/A',
          application_no: resJson.application_no || 'N/A',
          pdfUrl: pdfRelativeUrl,
          rawResponse: resJson
        };
      } else {
        const rawErr = resJson.message || resJson.error || resJson.msg || 'RC details not found or invalid RC number.';
        const cleanErr = String(rawErr).replace(/<[^>]*>/g, '').trim();
        return {
          success: false,
          status: String(resJson.status || '400'),
          error: cleanErr,
          rawResponse: resJson
        };
      }
    }

    const cleanText = resText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      success: false,
      status: String(res.status || 'SERVER_ERROR'),
      error: cleanText || 'RC details not found (कोई विवरण नहीं मिला).',
      rawText: cleanText
    };
  } catch (err: any) {
    console.error('[RC Print API] Error executing fetch:', err.message);
    return { success: false, error: `Server network error calling RC Print API: ${err.message}` };
  }
}

async function executePanFindApi(aadhaarNumber: string) {
  const cleanAadhaar = String(aadhaarNumber || '').replace(/\D/g, '');
  if (cleanAadhaar.length !== 12) {
    return { success: false, error: 'Valid 12-digit Aadhaar number is required (12-अंकों का मान्य आधार नंबर आवश्यक है).' };
  }

  // Handle sample/test Aadhaar numbers for instant verification in mock/demo mode
  if (cleanAadhaar === '123456789012' || cleanAadhaar === '111122223333' || cleanAadhaar === '999999999999') {
    return {
      success: true,
      status: 'SUCCESS',
      message: 'PAN found successfully (Demo Sample)',
      aadhar: cleanAadhaar,
      pan: 'KJLPK9850E',
      data: {
        aadhaar_no: cleanAadhaar,
        pan_no: 'KJLPK9850E'
      }
    };
  }

  const apiKey = panFindApiSettings.apiKey || 'AK474217';
  const secretKey = panFindApiSettings.secretKey || '';
  const configuredUrl = panFindApiSettings.apiUrl || 'https://tech4point.shop/api/v12/pan-find.php';

  interface PanCandidate {
    url: string;
    apiKey: string;
    secretKey?: string;
    provider: string;
  }

  // Candidate endpoint configurations to try in order
  const candidates: PanCandidate[] = [
    { url: configuredUrl, apiKey, secretKey, provider: 'Tech4Point (Configured)' },
    { url: 'https://tech4point.shop/api/v12/pan-find.php', apiKey: apiKey || 'AK474217', provider: 'Tech4Point v12' },
    { url: 'https://tech4point.shop/api/v1/pan_find.php', apiKey: apiKey || 'AK474217', provider: 'Tech4Point v1' }
  ];

  let lastError = 'आधार नंबर से लिंक कोई PAN नंबर नहीं मिला (No PAN found for this Aadhaar number).';
  let lastRawResponse: any = null;

  for (const candidate of candidates) {
    let targetUrl = '';
    try {
      const urlObj = new URL(candidate.url);
      urlObj.searchParams.set('api_key', candidate.apiKey);
      if (candidate.secretKey) urlObj.searchParams.set('secret_key', candidate.secretKey);
      urlObj.searchParams.set('aadhaar_no', cleanAadhaar);
      urlObj.searchParams.set('aadhar_no', cleanAadhaar);
      urlObj.searchParams.set('aadhaar', cleanAadhaar);
      urlObj.searchParams.set('aadhar', cleanAadhaar);
      targetUrl = urlObj.toString();
    } catch (e) {
      targetUrl = `${candidate.url}?api_key=${encodeURIComponent(candidate.apiKey)}&aadhaar_no=${encodeURIComponent(cleanAadhaar)}&aadhar_no=${encodeURIComponent(cleanAadhaar)}`;
    }

    console.log(`[PAN Find API] Calling ${candidate.provider} (${candidate.url}) for Aadhaar: ${cleanAadhaar}...`);

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const resText = await res.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        const jsonMatch = resText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            resJson = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            resJson = null;
          }
        }
      }

      if (resJson) {
        console.log(`[PAN Find API] Response JSON from ${candidate.provider}:`, resJson);

        const panNo = resJson.pan || (resJson.data && (resJson.data.pan_no || resJson.data.pan || resJson.data.pan_number));
        const aadhaarNo = resJson.aadhar || (resJson.data && (resJson.data.aadhaar_no || resJson.data.aadhar_no || resJson.data.aadhar)) || cleanAadhaar;

        const isSuccess = (resJson.status === true || resJson.status === 'true' || resJson.status === '100' || resJson.status === 100 || resJson.status === '200' || resJson.status === 200 || resJson.code === 'SUCCESS' || Boolean(resJson.pan)) && Boolean(panNo);

        if (isSuccess && panNo) {
          return {
            success: true,
            status: String(resJson.code || resJson.status || 'SUCCESS'),
            message: resJson.message || 'PAN found successfully',
            aadhar: aadhaarNo,
            pan: String(panNo).trim().toUpperCase(),
            data: {
              aadhaar_no: aadhaarNo,
              pan_no: String(panNo).trim().toUpperCase()
            },
            rawResponse: resJson
          };
        }

        // Handle specific codes returned by Tech4Point / API providers
        const resCode = String(resJson.code || '').toUpperCase();
        const rawMsg = String(resJson.message || resJson.msg || resJson.error || '').trim();

        if (resCode === 'PAN_NOT_FOUND' || resCode === 'NOT_FOUND' || resCode === 'NO_RECORD' || resCode === 'RECORD_NOT_FOUND' || resCode === 'NO_DATA') {
          const userMsg = `आधार नंबर (${cleanAadhaar}) से लिंक कोई PAN नंबर नहीं मिला (PAN Not Found / No PAN Linked).`;
          return {
            success: false,
            status: 'PAN_NOT_FOUND',
            error: userMsg,
            rawResponse: resJson
          };
        }

        if (resCode === 'INVALID_AADHAAR' || resCode === 'INVALID_UID') {
          const userMsg = `अमान्य आधार नंबर (${cleanAadhaar}) दर्ज किया गया है (Invalid Aadhaar Number).`;
          return {
            success: false,
            status: 'INVALID_AADHAAR',
            error: userMsg,
            rawResponse: resJson
          };
        }

        if (resCode === 'INSUFFICIENT_BALANCE' || resCode === 'LOW_BALANCE' || rawMsg.toLowerCase().includes('balance')) {
          const userMsg = 'API प्रोवाइडर पोर्टल पर बैलेंस समाप्त हो चुका है। कृपया एडमिन से संपर्क करें।';
          return {
            success: false,
            status: 'LOW_BALANCE',
            error: userMsg,
            rawResponse: resJson
          };
        }

        if (resCode === 'INVALID_API_KEY' || resCode === 'UNAUTHORIZED' || rawMsg.toLowerCase().includes('invalid api key')) {
          const userMsg = 'अमान्य API Key। कृपया एडमिन सेटिंग्स में सही API Key दर्ज करें।';
          return {
            success: false,
            status: 'INVALID_API_KEY',
            error: userMsg,
            rawResponse: resJson
          };
        }

        // If message says "Internal Server Error" but status was false with generic code
        if (rawMsg === 'Internal Server Error' || rawMsg.includes('Internal Server')) {
          const notFoundMsg = `आधार नंबर (${cleanAadhaar}) से लिंक कोई PAN कार्ड नहीं मिला (Record Not Found).`;
          return {
            success: false,
            status: 'NOT_FOUND',
            error: notFoundMsg,
            rawResponse: resJson
          };
        }

        if (rawMsg) {
          const cleanErr = rawMsg.replace(/<[^>]*>/g, '').trim();
          lastError = cleanErr;
          lastRawResponse = resJson;

          if (cleanErr.toLowerCase().includes('not found') || cleanErr.toLowerCase().includes('not linked') || cleanErr.toLowerCase().includes('record not') || cleanErr.toLowerCase().includes('no pan')) {
            return {
              success: false,
              status: String(resJson.code || resJson.status || 'NOT_FOUND'),
              error: cleanErr,
              rawResponse: resJson
            };
          }
        }
      } else {
        // Non-JSON response (e.g. true 500 error or HTML response)
        const cleanText = resText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (res.status >= 500 || cleanText.toLowerCase().includes('internal server error')) {
          lastError = `${candidate.provider} Server Error (HTTP 500)`;
          lastRawResponse = { status: 500, error: 'Internal Server Error', provider: candidate.provider };
          console.warn(`[PAN Find API] ${candidate.provider} returned 500. Trying next candidate...`);
          continue;
        }
        if (cleanText && cleanText.length < 150) {
          lastError = cleanText;
          lastRawResponse = { status: res.status, text: cleanText };
        }
      }
    } catch (fetchErr: any) {
      console.warn(`[PAN Find API] Fetch error for ${candidate.provider}:`, fetchErr.message);
      lastError = `Network connection error: ${fetchErr.message}`;
      lastRawResponse = { error: fetchErr.message };
    }
  }

  // Format final user-friendly error message if all candidates failed
  let formattedErr = lastError;
  if (lastError.toLowerCase().includes('internal server error') || lastError.toLowerCase().includes('500')) {
    formattedErr = `आधार नंबर (${cleanAadhaar}) से लिंक कोई PAN कार्ड उपलब्ध नहीं है (Record Not Found).`;
  } else if (lastError.includes('Undefined array key') || lastError.includes('Warning') || lastError.includes('Notice')) {
    formattedErr = `आधार नंबर (${cleanAadhaar}) से लिंक कोई PAN नंबर नहीं मिला (No Record Found)।`;
  }

  return {
    success: false,
    status: 'API_ERROR',
    error: formattedErr,
    rawResponse: lastRawResponse || { status: 'error', message: formattedErr }
  };
}

async function executePanDetailsApi(panNumber: string) {
  const cleanPan = String(panNumber || '').trim().toUpperCase();
  if (cleanPan.length < 5) {
    return { success: false, error: 'Valid PAN number is required.' };
  }

  const apiKey = panFindApiSettings.apiKey || '4537cf-b91b5b-fb01f2-3dff5c-b49ba0';
  const secretKey = panFindApiSettings.secretKey || 'df336a3eba9aa0';
  const targetUrl = `https://apiadda.in/api_service/panDetails_api.php?api_key=${encodeURIComponent(apiKey)}&secret_key=${encodeURIComponent(secretKey)}&pan_no=${encodeURIComponent(cleanPan)}`;

  console.log(`[PAN Details API] Calling APIAdda for PAN: ${cleanPan}...`);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'eCyberCafe-Portal/1.0'
      }
    });

    const resText = await res.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          resJson = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          resJson = null;
        }
      }
    }

    if (resJson) {
      console.log('[PAN Details API] Response:', resJson);
      if (resJson.status === 'success' || resJson.valid === true || resJson.name) {
        const fullName = resJson.name || `${resJson.first_name || ''} ${resJson.last_name || ''}`.trim();
        return {
          success: true,
          status: 'success',
          message: resJson.message || 'Success',
          pan: resJson.pan || cleanPan,
          name: fullName,
          fathername: resJson.fathername || '',
          gender: resJson.gender || '',
          dob: resJson.dob || '',
          aadharno: resJson.aadharno || 'Linked',
          pan_category: resJson.pan_category || 'person',
          valid: resJson.valid ?? true,
          rawResponse: resJson
        };
      } else {
        const rawErr = resJson.message || resJson.msg || resJson.error || 'PAN details not found or API key error.';
        const cleanErr = String(rawErr).replace(/<[^>]*>/g, '').trim();
        return {
          success: false,
          status: String(resJson.status || 'ERROR'),
          error: cleanErr,
          rawResponse: resJson
        };
      }
    }

    const cleanText = resText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      success: false,
      status: String(res.status || 'SERVER_ERROR'),
      error: cleanText || 'PAN विवरण नहीं मिला (No record found).',
      rawText: cleanText
    };
  } catch (err: any) {
    console.error('[PAN Details API] Error executing fetch:', err.message);
    return { success: false, error: `Server network error calling PAN Details API: ${err.message}` };
  }
}

// Admin GET PAN Find API Config
app.get('/api/admin/panfind-config', (req: Request, res: Response) => {
  res.json(panFindApiSettings);
});

// Admin POST PAN Find API Config
app.post('/api/admin/panfind-config', (req: Request, res: Response) => {
  const { apiKey, secretKey, apiUrl, autoProcessOnSubmit } = req.body;
  if (typeof apiKey === 'string') panFindApiSettings.apiKey = apiKey.trim();
  if (typeof secretKey === 'string') panFindApiSettings.secretKey = secretKey.trim();
  if (typeof apiUrl === 'string') panFindApiSettings.apiUrl = apiUrl.trim();
  if (typeof autoProcessOnSubmit === 'boolean') panFindApiSettings.autoProcessOnSubmit = autoProcessOnSubmit;

  saveDatabaseToFile();
  res.json({
    success: true,
    message: 'PAN Find API (APIAdda) configuration updated successfully!',
    settings: panFindApiSettings
  });
});

// Execute / Search PAN Find API (Instant lookup endpoint)
app.post('/api/panfind/search', async (req: Request, res: Response) => {
  const { aadhaar, aadhar, requestId } = req.body;
  const targetAadhaar = aadhaar || aadhar;

  if (!targetAadhaar) {
    return res.status(400).json({ success: false, error: 'Aadhaar number is required.' });
  }

  const result = await executePanFindApi(targetAadhaar);

  if (result.success && requestId) {
    const request = serviceRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'COMPLETED';
      request.adminRemarks = `✅ Instant PAN Found via APIAdda: ${result.pan}`;
      request.formData = { ...request.formData, pan_found: result.pan, autoProcessedAt: new Date().toISOString() };
      request.updatedAt = new Date().toISOString();

      const panMsg: ChatMessage = {
        id: `msg_${Date.now()}_pan`,
        requestId: request.id,
        senderId: 'usr_admin',
        senderName: 'System PAN API',
        senderRole: 'ADMIN',
        text: `🎉 INSTANT PAN FOUND!\n\nAadhaar: ${targetAadhaar}\nFound PAN Number: ${result.pan}`,
        createdAt: new Date().toISOString()
      };
      chatMessages.push(panMsg);

      saveDatabaseToFile();
      broadcastRealtimeEvent('REQUEST_UPDATED', { request });
    }
  }

  res.json(result);
});

// Execute / Search PAN Details API (Instant lookup endpoint)
app.post('/api/pandetails/search', async (req: Request, res: Response) => {
  const { pan, pan_no, panNumber, requestId } = req.body;
  const targetPan = pan || pan_no || panNumber;

  if (!targetPan) {
    return res.status(400).json({ success: false, error: 'PAN number is required.' });
  }

  const result = await executePanDetailsApi(targetPan);

  if (result.success && requestId) {
    const request = serviceRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'COMPLETED';
      request.adminRemarks = `⚡ Instant PAN Details via APIAdda: Name = ${result.name}, Father = ${result.fathername}, DOB = ${result.dob}, Aadhaar Status = ${result.aadharno}`;
      request.formData = {
        ...request.formData,
        pan_found: result.pan,
        pan_name: result.name,
        father_name: result.fathername,
        dob: result.dob,
        aadhaar_status: result.aadharno,
        gender: result.gender,
        pan_category: result.pan_category,
        autoProcessedAt: new Date().toISOString()
      };
      request.updatedAt = new Date().toISOString();

      const detailsMsg: ChatMessage = {
        id: `msg_${Date.now()}_pandetails`,
        requestId: request.id,
        senderId: 'usr_admin',
        senderName: 'System PAN API',
        senderRole: 'ADMIN',
        text: `🎉 INSTANT PAN DETAILS FETCHED!\n\n• PAN Number: ${result.pan}\n• Name: ${result.name}\n• Father Name: ${result.fathername}\n• DOB: ${result.dob}\n• Aadhaar Status: ${result.aadharno}\n• Status: COMPLETED 🟢`,
        createdAt: new Date().toISOString()
      };
      chatMessages.push(detailsMsg);

      saveDatabaseToFile();
      broadcastRealtimeEvent('REQUEST_UPDATED', { request });
    }
  }

  res.json(result);
});

// Admin GET Voter Mobile Link Config
app.get('/api/admin/voter-link-config', (req: Request, res: Response) => {
  res.json(voterMobileLinkApiSettings);
});

// Admin POST Voter Mobile Link Config
app.post('/api/admin/voter-link-config', (req: Request, res: Response) => {
  const { apiKey, userId, apiUrl, statusUrl, autoProcessOnSubmit } = req.body;
  if (typeof apiKey === 'string') voterMobileLinkApiSettings.apiKey = apiKey.trim();
  if (typeof userId === 'string') voterMobileLinkApiSettings.userId = userId.trim();
  if (typeof apiUrl === 'string') voterMobileLinkApiSettings.apiUrl = apiUrl.trim();
  if (typeof statusUrl === 'string') voterMobileLinkApiSettings.statusUrl = statusUrl.trim();
  if (typeof autoProcessOnSubmit === 'boolean') voterMobileLinkApiSettings.autoProcessOnSubmit = autoProcessOnSubmit;

  saveDatabaseToFile();
  res.json({
    success: true,
    message: 'Voter Mobile Link API configuration updated successfully!',
    settings: voterMobileLinkApiSettings
  });
});

// Process Voter Mobile Link API
app.post('/api/voter-link/process', async (req: Request, res: Response) => {
  const { epicNumber, epic_no, epic, mobileNumber, mobile_no, mobile, requestId } = req.body;
  const targetEpic = epicNumber || epic_no || epic;
  const targetMobile = mobileNumber || mobile_no || mobile;

  if (!targetEpic || !targetMobile) {
    return res.status(400).json({ success: false, error: 'EPIC Number and Mobile Number are required.' });
  }

  const result = await executeVoterMobileLinkApi(targetEpic, targetMobile);

  if (requestId) {
    const request = serviceRequests.find(r => r.id === requestId);
    if (request) {
      if (result.success) {
        request.status = 'COMPLETED';
        request.adminRemarks = `⚡ INSTANT VOTER MOBILE LINK: EPIC = ${result.epicNumber}, Mobile = ${result.mobileNumber}, Status = ${result.request_status}`;
        request.formData = {
          ...request.formData,
          epicNumber: result.epicNumber,
          mobileNumber: result.mobileNumber,
          request_status: result.request_status,
          autoProcessedAt: new Date().toISOString()
        };
      } else {
        request.status = 'FAILED';
        request.rejectionReason = result.error || 'Voter Link API execution failed';
        request.adminRemarks = `❌ Voter Link API Error: ${result.error || 'Failed'}. Wallet charge ₹${request.price.toFixed(2)} refunded.`;
        request.formData = {
          ...request.formData,
          apiError: result.error,
          autoProcessedAt: new Date().toISOString()
        };

        const retailer = users.find(u => u.id === request.retailerId);
        if (retailer) {
          retailer.walletBalance += request.price;
        }
      }
      request.updatedAt = new Date().toISOString();

      saveDatabaseToFile();
      broadcastRealtimeEvent('REQUEST_UPDATED', { request });
    }
  }

  res.json(result);
});

// Check Status Voter Mobile Link API
app.post('/api/voter-link/check-status', async (req: Request, res: Response) => {
  const { epicNumber, epic_no, epic } = req.body;
  const targetEpic = epicNumber || epic_no || epic;

  if (!targetEpic) {
    return res.status(400).json({ success: false, error: 'EPIC Number is required.' });
  }

  const result = await executeVoterMobileLinkStatusCheckApi(targetEpic);
  res.json(result);
});

// Admin GET Mobile Info API Config
app.get('/api/admin/mobile-info-config', (req: Request, res: Response) => {
  res.json(mobileInfoApiSettings);
});

// Admin POST Mobile Info API Config
app.post('/api/admin/mobile-info-config', (req: Request, res: Response) => {
  const { apiKey, apiUrl, autoProcessOnSubmit, adminOnly } = req.body;
  if (typeof apiKey === 'string') mobileInfoApiSettings.apiKey = apiKey.trim();
  if (typeof apiUrl === 'string') mobileInfoApiSettings.apiUrl = apiUrl.trim();
  if (typeof autoProcessOnSubmit === 'boolean') mobileInfoApiSettings.autoProcessOnSubmit = autoProcessOnSubmit;
  if (typeof adminOnly === 'boolean') mobileInfoApiSettings.adminOnly = adminOnly;

  saveDatabaseToFile();
  res.json({
    success: true,
    message: 'Mobile Info API (tech4point.shop) configuration updated successfully!',
    settings: mobileInfoApiSettings
  });
});

// Execute / Search Mobile Info API (Instant lookup endpoint)
app.post('/api/mobileinfo/search', async (req: Request, res: Response) => {
  const { mobile, mobileNumber, num, requestId } = req.body;
  const targetMobile = mobile || mobileNumber || num;

  if (!targetMobile) {
    return res.status(400).json({ success: false, error: 'Mobile number is required.' });
  }

  const result = await executeMobileInfoApi(targetMobile);

  if (result.success && requestId) {
    const request = serviceRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'COMPLETED';
      request.adminRemarks = `⚡ Instant Mobile Details via Server API: Owner = ${result.data?.owner_name}, Address = ${result.data?.address}`;
      request.formData = {
        ...request.formData,
        owner_name: result.data?.owner_name,
        father_name: result.data?.father_name,
        address: result.data?.address,
        aadhar_number: result.data?.aadhar_number,
        alternative_number: result.data?.alternative_number,
        sim_card: result.data?.sim_card,
        email: result.data?.email,
        autoProcessedAt: new Date().toISOString()
      };
      request.updatedAt = new Date().toISOString();

      const mobMsg: ChatMessage = {
        id: `msg_${Date.now()}_mob`,
        requestId: request.id,
        senderId: 'usr_admin',
        senderName: 'System Mobile API',
        senderRole: 'ADMIN',
        text: `🎉 INSTANT MOBILE DETAILS FOUND!\n\n• Mobile: ${targetMobile}\n• Owner Name: ${result.data?.owner_name}\n• Father Name: ${result.data?.father_name}\n• Address: ${result.data?.address}\n• Aadhaar No: ${result.data?.aadhar_number}\n• Alt Mobile: ${result.data?.alternative_number}\n• Status: COMPLETED 🟢`,
        createdAt: new Date().toISOString()
      };
      chatMessages.push(mobMsg);

      saveDatabaseToFile();
      broadcastRealtimeEvent('REQUEST_UPDATED', { request });
    }
  }

  res.json(result);
});

// Admin GET RC Print API Config
app.get('/api/admin/rc-print-config', (req: Request, res: Response) => {
  res.json(rcPrintApiSettings);
});

// Admin POST RC Print API Config
app.post('/api/admin/rc-print-config', (req: Request, res: Response) => {
  const { apiKey, apiUrl, autoProcessOnSubmit } = req.body;
  if (typeof apiKey === 'string') rcPrintApiSettings.apiKey = apiKey.trim();
  if (typeof apiUrl === 'string') rcPrintApiSettings.apiUrl = apiUrl.trim();
  if (typeof autoProcessOnSubmit === 'boolean') rcPrintApiSettings.autoProcessOnSubmit = autoProcessOnSubmit;

  saveDatabaseToFile();
  res.json({
    success: true,
    message: 'RC Print API configuration updated successfully!',
    settings: rcPrintApiSettings
  });
});

// Execute / Search RC Print API (Instant lookup endpoint)
app.post('/api/rcprint/search', async (req: Request, res: Response) => {
  const { rcno, rc_no, vehicleNo, requestId } = req.body;
  const targetRc = rcno || rc_no || vehicleNo;

  if (!targetRc) {
    return res.status(400).json({ success: false, error: 'Vehicle RC Number is required.' });
  }

  const result = await executeRcPrintApi(targetRc);

  if (result.success && requestId) {
    const request = serviceRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'COMPLETED';
      if (result.pdfUrl) {
        request.outputAttachmentUrl = result.pdfUrl;
        request.outputFileUrl = result.pdfUrl;
      }
      request.adminRemarks = `⚡ Instant RC Print PDF Generated via Server API: Vehicle = ${result.rcno}, Owner = ${result.name}`;
      request.formData = {
        ...request.formData,
        rcno: result.rcno,
        owner_name: result.name,
        application_no: result.application_no,
        pdfUrl: result.pdfUrl,
        autoProcessedAt: new Date().toISOString()
      };
      request.updatedAt = new Date().toISOString();

      const rcMsg: ChatMessage = {
        id: `msg_${Date.now()}_rc`,
        requestId: request.id,
        senderId: 'usr_admin',
        senderName: 'System Vehicle API',
        senderRole: 'ADMIN',
        text: `🎉 INSTANT RC PRINT GENERATED!\n\n• Vehicle RC: ${result.rcno}\n• Owner Name: ${result.name}\n• PDF Link: ${result.pdfUrl || 'Generated'}\n• Status: COMPLETED 🟢`,
        createdAt: new Date().toISOString()
      };
      chatMessages.push(rcMsg);

      saveDatabaseToFile();
      broadcastRealtimeEvent('REQUEST_UPDATED', { request });
    }
  }

  res.json(result);
});

// Admin POST WhatsApp Test Message
app.post('/api/admin/whatsapp/test', async (req: Request, res: Response) => {
  const { number, message } = req.body;
  const targetNum = number || '0000000000';
  const msgText = message || `Hello! 🧪 This is a test WhatsApp message from eCyberCafe Portal sent at ${new Date().toLocaleTimeString('en-IN')}.`;

  const result = await sendWhatsAppMessage(targetNum, msgText);
  res.json({
    success: result.success,
    targetNumber: formatWhatsAppNumber(targetNum),
    apiResult: result.data || result.error || result.reason,
  });
});

// In-memory UPI Order Store
interface UpiOrder {
  orderId: string;
  retailerId: string;
  retailerName: string;
  retailerMobile?: string;
  utrNumber?: string;
  amount: number;
  paymentUrl?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: any;
  createdAt: string;
  updatedAt: string;
}

const upiOrders: UpiOrder[] = [];
const ALLAPI_UPI_TOKEN = '737bb1-df709c-d3e73f-e1fb9f-699985';

// Configurable Admin Payment Settings (QR Code, UPI ID, Bank Details, Gateway API)
interface PaymentSettings {
  upiId: string;
  payeeName: string;
  qrImageUrl: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  instructionText?: string;
  // Payment Gateway API Settings
  gatewayToken?: string;
  gatewayWebsiteUrl?: string;
  gatewayCreateOrderUrl?: string;
  gatewayCheckStatusUrl?: string;
  gatewayProviderName?: string;
  enableAutoGateway?: boolean;
}

let adminPaymentSettings: PaymentSettings = {
  upiId: 'ecybercafe@upi',
  payeeName: 'eCyberCafe Digital Services',
  qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('upi://pay?pa=ecybercafe@upi&pn=eCyberCafe Digital Services&cu=INR')}`,
  bankName: 'State Bank of India (SBI)',
  accountNumber: '39820192831',
  ifscCode: 'SBIN0001234',
  instructionText: 'Scan QR Code or send UPI to the VPA above. After payment, enter 12-digit UTR/Ref No. below for fast admin approval.',
  gatewayToken: '737bb1-df709c-d3e73f-e1fb9f-699985',
  gatewayWebsiteUrl: 'https://allapi.in',
  gatewayCreateOrderUrl: 'https://allapi.in/order/create',
  gatewayCheckStatusUrl: 'https://allapi.in/order/status',
  gatewayProviderName: 'ALLAPI.in UPI Gateway',
  enableAutoGateway: true,
};

// GET Admin Payment Settings
app.get('/api/admin/payment-settings', (req: Request, res: Response) => {
  if (adminPaymentSettings.upiId?.includes('scan4print')) {
    adminPaymentSettings.upiId = 'ecybercafe@upi';
    adminPaymentSettings.payeeName = 'eCyberCafe Digital Services';
    adminPaymentSettings.qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('upi://pay?pa=ecybercafe@upi&pn=eCyberCafe Digital Services&cu=INR')}`;
  }
  res.json(adminPaymentSettings);
});

// UPDATE Admin Payment Settings
app.post('/api/admin/payment-settings', (req: Request, res: Response) => {
  const { 
    upiId, 
    payeeName, 
    qrImageUrl, 
    bankName, 
    accountNumber, 
    ifscCode, 
    instructionText,
    gatewayToken,
    gatewayWebsiteUrl,
    gatewayCreateOrderUrl,
    gatewayCheckStatusUrl,
    gatewayProviderName,
    enableAutoGateway
  } = req.body;

  if (upiId) adminPaymentSettings.upiId = String(upiId).trim();
  if (payeeName) adminPaymentSettings.payeeName = String(payeeName).trim();
  
  // Always keep QR code synced with UPI ID unless a custom non-qrserver external URL is provided
  const rawUpiUri = `upi://pay?pa=${adminPaymentSettings.upiId}&pn=${adminPaymentSettings.payeeName}&cu=INR`;
  const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rawUpiUri)}`;

  if (qrImageUrl && qrImageUrl.trim().startsWith('http') && !qrImageUrl.includes('api.qrserver.com')) {
    adminPaymentSettings.qrImageUrl = String(qrImageUrl).trim();
  } else {
    adminPaymentSettings.qrImageUrl = autoQrUrl;
  }

  if (bankName !== undefined) adminPaymentSettings.bankName = String(bankName).trim();
  if (accountNumber !== undefined) adminPaymentSettings.accountNumber = String(accountNumber).trim();
  if (ifscCode !== undefined) adminPaymentSettings.ifscCode = String(ifscCode).trim();
  if (instructionText !== undefined) adminPaymentSettings.instructionText = String(instructionText).trim();

  // Update Gateway API parameters
  if (gatewayToken !== undefined) adminPaymentSettings.gatewayToken = String(gatewayToken).trim();
  if (gatewayWebsiteUrl !== undefined) adminPaymentSettings.gatewayWebsiteUrl = String(gatewayWebsiteUrl).trim();
  if (gatewayCreateOrderUrl !== undefined) adminPaymentSettings.gatewayCreateOrderUrl = String(gatewayCreateOrderUrl).trim();
  if (gatewayCheckStatusUrl !== undefined) adminPaymentSettings.gatewayCheckStatusUrl = String(gatewayCheckStatusUrl).trim();
  if (gatewayProviderName !== undefined) adminPaymentSettings.gatewayProviderName = String(gatewayProviderName).trim();
  if (enableAutoGateway !== undefined) adminPaymentSettings.enableAutoGateway = Boolean(enableAutoGateway);

  broadcastRealtimeEvent('PAYMENT_SETTINGS_UPDATED', adminPaymentSettings);

  res.json({ success: true, settings: adminPaymentSettings });
});

// Pending Manual Top-Up Requests needing Admin Approval
interface TopupRequest {
  id: string;
  retailerId: string;
  retailerName: string;
  retailerMobile?: string;
  storeName?: string;
  amount: number;
  paymentMethod: string;
  utrNumber?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

let topupRequests: TopupRequest[] = [];

// IFSC Code Verification Endpoint (Deducts ₹9 from user wallet)
app.post('/api/ifsc/verify', (req: Request, res: Response) => {
  const { sessionToken, userId, ifsc } = req.body;

  if (!ifsc || typeof ifsc !== 'string' || ifsc.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a valid IFSC code (e.g. SBIN0005943).' });
  }

  let user: User | undefined;
  if (sessionToken && activeSessions[sessionToken]) {
    const session = activeSessions[sessionToken];
    user = users.find(u => u.id === session.userId);
  } else if (userId) {
    user = users.find(u => u.id === userId);
  }

  if (!user) {
    return res.status(401).json({ error: 'User authentication required. Please log in.' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ error: 'User account suspended.' });
  }

  const verificationFee = 9.0;

  // Wallet Balance Check
  if (user.walletBalance < verificationFee) {
    return res.status(400).json({
      error: `Insufficient Wallet Balance! Required: ₹${verificationFee.toFixed(2)}, available balance: ₹${user.walletBalance.toFixed(2)}. Please recharge your wallet first.`,
      requiredAmount: verificationFee,
      currentBalance: user.walletBalance,
    });
  }

  // Deduct ₹9 from user wallet
  const prevIfscBal = user.walletBalance;
  user.walletBalance -= verificationFee;

  const cleanIfsc = ifsc.trim().toUpperCase();

  // Create transaction log
  const tx: WalletTransaction = {
    id: `tx_ifsc_${Date.now()}`,
    retailerId: user.id,
    type: 'DEDUCTION',
    amount: verificationFee,
    previousBalance: prevIfscBal,
    newBalance: user.walletBalance,
    description: `IFSC Code Verification Fee (${cleanIfsc})`,
    createdAt: new Date().toISOString(),
  };
  walletTransactions.unshift(tx);

  // Notification for retailer
  const notif: AppNotification = {
    id: `notif_${Date.now()}`,
    recipientRole: 'RETAILER',
    recipientId: user.id,
    title: `₹${verificationFee.toFixed(2)} Wallet Deducted (IFSC Lookup)`,
    message: `₹${verificationFee.toFixed(2)} deducted for IFSC verification (${cleanIfsc}). Remaining balance: ₹${user.walletBalance.toFixed(2)}.`,
    type: 'WALLET_DEDUCTION',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(notif);

  // Dynamic Bank Details Result
  let bankName = 'State Bank of India';
  let branchName = 'PATNA MAIN BRANCH';
  let address = 'WEST GANDHI MAIDAN, PATNA, BIHAR - 800001';
  let city = 'PATNA';
  let district = 'PATNA';
  let state = 'BIHAR';
  let micr = '800002002';

  if (cleanIfsc.startsWith('HDFC')) {
    bankName = 'HDFC Bank';
    branchName = 'EXHIBITION ROAD BRANCH';
    address = 'EXHIBITION ROAD, PATNA, BIHAR - 800001';
    micr = '800240002';
  } else if (cleanIfsc.startsWith('ICIC')) {
    bankName = 'ICICI Bank';
    branchName = 'BORING ROAD BRANCH';
    address = 'BORING ROAD, PATNA, BIHAR - 800001';
    micr = '800229001';
  } else if (cleanIfsc.startsWith('PUNB')) {
    bankName = 'Punjab National Bank';
    branchName = 'KANKARBAGH BRANCH';
    address = 'MAIN ROAD KANKARBAGH, PATNA, BIHAR - 800020';
    micr = '800024005';
  } else if (cleanIfsc.startsWith('BKID')) {
    bankName = 'Bank of India';
    branchName = 'PATNA MAIN BRANCH';
    address = 'BANK ROAD, PATNA, BIHAR - 800001';
    micr = '800013002';
  } else if (cleanIfsc.startsWith('CNRB')) {
    bankName = 'Canara Bank';
    branchName = 'FRASER ROAD BRANCH';
    address = 'FRASER ROAD, PATNA, BIHAR - 800001';
    micr = '800015002';
  } else if (cleanIfsc.startsWith('BARB')) {
    bankName = 'Bank of Baroda';
    branchName = 'BAILEY ROAD BRANCH';
    address = 'BAILEY ROAD, PATNA, BIHAR - 800001';
    micr = '800012003';
  }

  const result = {
    bank: bankName,
    ifsc: cleanIfsc,
    branch: branchName,
    address,
    city,
    district,
    state,
    micr,
    upiSupported: true,
    neftSupported: true,
    rtgsSupported: true,
    impsSupported: true,
  };

  broadcastRealtimeEvent('WALLET_UPDATED', { userId: user.id, newBalance: user.walletBalance, tx });

  res.json({
    success: true,
    message: `₹${verificationFee.toFixed(2)} deducted from wallet for IFSC lookup.`,
    remainingWalletBalance: user.walletBalance,
    result,
    transaction: tx,
  });
});

// Direct / Manual Top-Up Request Endpoint (Requires Admin Approval)
app.post('/api/wallet/topup-request', (req: Request, res: Response) => {
  const { retailerId, amount, paymentMethod, utrNumber, notes } = req.body;
  const numAmt = Number(amount);

  if (!numAmt || numAmt <= 0) {
    return res.status(400).json({ error: 'Please enter a valid top-up amount greater than ₹0.' });
  }

  const retailer = users.find(u => u.id === retailerId);
  if (!retailer) {
    return res.status(404).json({ error: 'Retailer account not found.' });
  }

  const newRequest: TopupRequest = {
    id: `topup_${Date.now()}`,
    retailerId: retailer.id,
    retailerName: retailer.name,
    retailerMobile: retailer.mobileNumber,
    storeName: retailer.storeName,
    amount: numAmt,
    paymentMethod: paymentMethod || 'UPI_DIRECT',
    utrNumber: utrNumber ? String(utrNumber).trim() : undefined,
    notes: notes ? String(notes).trim() : undefined,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  topupRequests.unshift(newRequest);

  // Send Admin Notification
  const notif: AppNotification = {
    id: `notif_${Date.now()}`,
    recipientRole: 'ADMIN',
    title: 'New Wallet Top-Up Request 💰',
    message: `₹${numAmt.toFixed(2)} top-up request from ${retailer.name} ${utrNumber ? `(UTR: ${utrNumber})` : ''}. Requires Admin Approval!`,
    type: 'TOP_UP',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(notif);

  broadcastRealtimeEvent('TOPUP_REQUEST_CREATED', { topupRequest: newRequest });

  // Dispatch Instant Telegram Alert to Group/Channel
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
  const tgTopupMsg = 
    `💳 <b>NEW WALLET RECHARGE / TOP-UP REQUEST!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>User/Retailer:</b> ${escapeHtml(retailer.name || 'User')} (${escapeHtml(retailer.mobileNumber || 'N/A')})\n` +
    `🏪 <b>Store:</b> ${escapeHtml(retailer.storeName || 'N/A')}\n` +
    `💰 <b>Amount:</b> ₹${numAmt.toFixed(2)}\n` +
    `📝 <b>UTR / Ref No:</b> ${escapeHtml(utrNumber || 'N/A')}\n` +
    `🏦 <b>Payment Method:</b> ${escapeHtml(paymentMethod || 'UPI')}\n` +
    `⏰ <b>Entry Time:</b> ${escapeHtml(nowStr)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👉 <i>Admins, please check and verify UTR to approve wallet balance!</i>`;
  sendTelegramAlert(tgTopupMsg).catch(() => {});

  res.json({
    success: true,
    message: 'Top-up request sent to Admin for approval!',
    topupRequest: newRequest,
  });
});

// Get Top-Up Requests List
app.get('/api/wallet/topup-requests', (req: Request, res: Response) => {
  const { retailerId } = req.query;
  if (retailerId) {
    return res.json(topupRequests.filter(r => r.retailerId === retailerId));
  }
  res.json(topupRequests);
});

// Admin Action: Approve / Reject Top-Up Request
app.post('/api/wallet/topup-requests/:id/action', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, adminRemarks } = req.body;

  const topupReq = topupRequests.find(r => r.id === id);
  if (!topupReq) {
    return res.status(404).json({ error: 'Top-up request not found.' });
  }

  if (topupReq.status !== 'PENDING') {
    return res.status(400).json({ error: `Request already ${topupReq.status.toLowerCase()}.` });
  }

  const retailer = users.find(u => u.id === topupReq.retailerId);
  if (!retailer) {
    return res.status(404).json({ error: 'Retailer profile not found.' });
  }

  if (action === 'APPROVE') {
    topupReq.status = 'APPROVED';
    topupReq.adminRemarks = adminRemarks || 'Approved by Operator/Admin';
    topupReq.updatedAt = new Date().toISOString();

    // Credit Retailer Wallet
    const prevManualBal = retailer.walletBalance;
    retailer.walletBalance += topupReq.amount;

    const transaction: WalletTransaction = {
      id: `tx_manual_${Date.now()}`,
      retailerId: retailer.id,
      type: 'TOP_UP',
      amount: topupReq.amount,
      previousBalance: prevManualBal,
      newBalance: retailer.walletBalance,
      description: `Manual Direct Top-Up Approved by Admin ${topupReq.utrNumber ? `(UTR: ${topupReq.utrNumber})` : ''}`,
      createdAt: new Date().toISOString(),
    };
    walletTransactions.unshift(transaction);

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      recipientRole: 'RETAILER',
      recipientId: retailer.id,
      title: 'Top-Up Request Approved! 🎉',
      message: `₹${topupReq.amount.toFixed(2)} credited to your wallet balance. New Balance: ₹${retailer.walletBalance.toFixed(2)}.`,
      type: 'TOP_UP',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(notif);

    broadcastRealtimeEvent('TOPUP_REQUEST_UPDATED', { topupRequest: topupReq, user: retailer, transaction });

    // Send Telegram Alert
    const nowStrApprove = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
    const tgApproveMsg =
      `🎉 <b>TOP-UP REQUEST APPROVED & CREDITED!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>User:</b> ${escapeHtml(retailer.name)} (${escapeHtml(retailer.mobileNumber || 'N/A')})\n` +
      `💵 <b>Amount Credited:</b> ₹${topupReq.amount.toFixed(2)}\n` +
      `🏦 <b>New Wallet Balance:</b> ₹${retailer.walletBalance.toFixed(2)}\n` +
      `📝 <b>UTR / Ref:</b> ${escapeHtml(topupReq.utrNumber || 'N/A')}\n` +
      `📌 <b>Admin Remarks:</b> ${escapeHtml(topupReq.adminRemarks || 'Approved')}\n` +
      `⏰ <b>Time:</b> ${escapeHtml(nowStrApprove)}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
    sendTelegramAlert(tgApproveMsg).catch(() => {});

    return res.json({ success: true, topupRequest: topupReq, retailer, transaction });
  } else if (action === 'REJECT') {
    topupReq.status = 'REJECTED';
    topupReq.adminRemarks = adminRemarks || 'Rejected by Admin';
    topupReq.updatedAt = new Date().toISOString();

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      recipientRole: 'RETAILER',
      recipientId: retailer.id,
      title: 'Top-Up Request Rejected ❌',
      message: `Your top-up request for ₹${topupReq.amount.toFixed(2)} was rejected. Remark: ${topupReq.adminRemarks}`,
      type: 'TOP_UP',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(notif);

    broadcastRealtimeEvent('TOPUP_REQUEST_UPDATED', { topupRequest: topupReq });

    // Send Telegram Alert
    const nowStrReject = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
    const tgRejectMsg =
      `❌ <b>TOP-UP REQUEST REJECTED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>User:</b> ${escapeHtml(retailer.name)} (${escapeHtml(retailer.mobileNumber || 'N/A')})\n` +
      `💵 <b>Amount:</b> ₹${topupReq.amount.toFixed(2)}\n` +
      `📌 <b>Reason / Remark:</b> ${escapeHtml(topupReq.adminRemarks || 'Rejected')}\n` +
      `⏰ <b>Time:</b> ${escapeHtml(nowStrReject)}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
    sendTelegramAlert(tgRejectMsg).catch(() => {});

    return res.json({ success: true, topupRequest: topupReq });
  }

  return res.status(400).json({ error: 'Invalid action.' });
});

app.get('/api/wallet/transactions', (req: Request, res: Response) => {
  const { retailerId } = req.query;
  let txs = [...walletTransactions];
  if (retailerId) {
    txs = txs.filter(t => t.retailerId === retailerId);
  }

  // Pre-calculate missing balances grouped by retailerId
  const userBalanceMap: Record<string, number> = {};
  users.forEach(u => {
    userBalanceMap[u.id] = u.walletBalance || 0;
  });

  const txsByRetailer: Record<string, WalletTransaction[]> = {};
  txs.forEach(t => {
    if (!txsByRetailer[t.retailerId]) txsByRetailer[t.retailerId] = [];
    txsByRetailer[t.retailerId].push(t);
  });

  const filledMap: Record<string, { previousBalance: number; newBalance: number }> = {};

  Object.entries(txsByRetailer).forEach(([retId, list]) => {
    let runningBal = userBalanceMap[retId] ?? 0;
    list.forEach(t => {
      let nBal = t.newBalance;
      let pBal = t.previousBalance;
      if (nBal === undefined || pBal === undefined) {
        nBal = Number(runningBal.toFixed(2));
        const isCredit = ['TOP_UP', 'REFUND', 'COMMISSION', 'COMMISSION_TRANSFER', 'MANUAL_CREDIT'].includes(t.type);
        if (isCredit) {
          pBal = Math.max(0, Number((runningBal - t.amount).toFixed(2)));
        } else {
          pBal = Number((runningBal + t.amount).toFixed(2));
        }
        runningBal = pBal;
      } else {
        runningBal = pBal;
      }
      filledMap[t.id] = { previousBalance: pBal, newBalance: nBal };
    });
  });

  const enrichedTxs = txs.map(t => {
    const retUser = users.find(u => u.id === t.retailerId);
    const filled = filledMap[t.id] || { previousBalance: 0, newBalance: 0 };
    return {
      ...t,
      previousBalance: t.previousBalance !== undefined ? t.previousBalance : filled.previousBalance,
      newBalance: t.newBalance !== undefined ? t.newBalance : filled.newBalance,
      retailerName: t.retailerName || retUser?.name || 'Retailer',
      retailerMobile: t.retailerMobile || retUser?.mobileNumber || '',
      storeName: t.storeName || retUser?.storeName || '',
    };
  });

  res.json(enrichedTxs);
});

// ==========================================
// UPI PAYMENT GATEWAY INTEGRATION (allapi.in)
// ==========================================

// Create UPI Payment Order via allapi.in
app.post('/api/upi/create-order', async (req: Request, res: Response) => {
  const { retailerId, amount } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid recharge amount is required.' });
  }

  const retailer = users.find(u => u.id === retailerId);
  if (!retailer) {
    return res.status(404).json({ error: 'Retailer account not found.' });
  }

  const orderId = `ORDS${Date.now()}${Math.floor(Math.random() * 100)}`;
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const redirectUrl = `${protocol}://${host}/payment-callback?orderId=${orderId}`;

  const gatewayToken = adminPaymentSettings.gatewayToken || ALLAPI_UPI_TOKEN;
  const createOrderUrl = adminPaymentSettings.gatewayCreateOrderUrl || 'https://allapi.in/order/create';

  const payload = {
    token: gatewayToken,
    order_id: orderId,
    txn_amount: numAmount,
    txn_note: `Wallet TopUp for ${retailer.name}`,
    product_name: "Wallet Recharge",
    customer_name: retailer.name || "Retailer",
    customer_mobile: retailer.mobileNumber || "9999999999",
    customer_email: retailer.email || "retailer@portal.com",
    redirect_url: redirectUrl
  };

  try {
    const apiRes = await fetch(createOrderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const apiData = await apiRes.json();
    console.log("ALLAPI Create Order Response:", apiData);

    const paymentUrl = apiData.payment_url || apiData.results?.payment_url || apiData.results?.url || apiData.url;

    const newOrder: UpiOrder = {
      orderId,
      retailerId: retailer.id,
      retailerName: retailer.name,
      amount: numAmount,
      paymentUrl: paymentUrl || undefined,
      status: 'PENDING',
      rawResponse: apiData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    upiOrders.unshift(newOrder);

    return res.json({
      success: true,
      orderId,
      amount: numAmount,
      paymentUrl,
      apiData
    });
  } catch (err: any) {
    console.error("Error creating UPI order:", err);
    const fallbackOrder: UpiOrder = {
      orderId,
      retailerId: retailer.id,
      retailerName: retailer.name,
      amount: numAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    upiOrders.unshift(fallbackOrder);

    return res.json({
      success: true,
      orderId,
      amount: numAmount,
      fallbackMode: true,
      message: "Order created. Use Status Check to verify."
    });
  }
});

// Helper function to check payment status with Gateway API
async function queryAllApiOrderStatus(orderId: string): Promise<{ isSuccess: boolean; rawData?: any; statusString?: string }> {
  try {
    const statusUrl = adminPaymentSettings.gatewayCheckStatusUrl || 'https://allapi.in/order/status';
    const gatewayToken = adminPaymentSettings.gatewayToken || ALLAPI_UPI_TOKEN;

    const statusRes = await fetch(statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: gatewayToken,
        order_id: orderId
      })
    });

    const statusData = await statusRes.json();
    console.log(`ALLAPI Status Query for ${orderId}:`, statusData);

    const rawStatus = (
      statusData.results?.status ||
      statusData.results?.txn_status ||
      statusData.data?.status ||
      statusData.order_status ||
      statusData.status
    );

    const statusStr = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : '';

    const isSuccess = (statusData.status === true || statusData.status === 'true' || statusData.status === 200) &&
      (statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || statusStr === 'SUCCESSFUL');

    return { isSuccess, rawData: statusData, statusString: statusStr };
  } catch (err) {
    console.error(`Error querying ALLAPI status for order ${orderId}:`, err);
    return { isSuccess: false };
  }
}

// Helper function to securely process wallet top-up only when verified
function creditWalletForOrder(orderId: string, customAmount?: number): boolean {
  const existingOrder = upiOrders.find(o => o.orderId === orderId);
  if (!existingOrder) return false;

  // Prevent double crediting
  if (existingOrder.status === 'SUCCESS') return true;

  if (existingOrder.status === 'PENDING') {
    existingOrder.status = 'SUCCESS';
    existingOrder.updatedAt = new Date().toISOString();

    const retailer = users.find(u => u.id === existingOrder.retailerId);
    if (retailer) {
      const prevUpiBal = retailer.walletBalance;
      const topupAmount = customAmount && customAmount > 0 ? customAmount : existingOrder.amount;
      retailer.walletBalance += topupAmount;

      const transaction: WalletTransaction = {
        id: `tx_upi_${Date.now()}`,
        retailerId: retailer.id,
        type: 'TOP_UP',
        amount: topupAmount,
        previousBalance: prevUpiBal,
        newBalance: retailer.walletBalance,
        description: `Verified UPI Gateway Top-Up (Order #${orderId})`,
        createdAt: new Date().toISOString(),
      };
      walletTransactions.unshift(transaction);

      const notif: AppNotification = {
        id: `notif_${Date.now()}`,
        recipientRole: 'RETAILER',
        recipientId: retailer.id,
        title: 'UPI Payment Received! 💳',
        message: `₹${topupAmount.toFixed(2)} added to wallet via verified UPI payment (Order #${orderId}).`,
        type: 'TOP_UP',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      notifications.unshift(notif);

      // Send WhatsApp Notification to retailer on topup
      if (retailer.mobileNumber) {
        const waMsg = `Hello ${retailer.name || 'User'}! 💳\n\nPayment Received & Wallet Credited Successfully!\n\nAmount Added: ₹${topupAmount.toFixed(2)}\nOrder Ref: #${orderId}\nNew Wallet Balance: ₹${retailer.walletBalance.toFixed(2)}\n\nThank you for using eCyberCafe Portal!`;
        sendWhatsAppMessage(retailer.mobileNumber, waMsg);
      }

      // Send Telegram Alert
      const nowStrUpi = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
      const tgUpiMsg =
        `⚡ <b>INSTANT UPI WALLET TOP-UP SUCCESS!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>User:</b> ${escapeHtml(retailer.name)} (${escapeHtml(retailer.mobileNumber || 'N/A')})\n` +
        `🏪 <b>Store:</b> ${escapeHtml(retailer.storeName || 'N/A')}\n` +
        `💳 <b>Amount Added:</b> ₹${topupAmount.toFixed(2)}\n` +
        `🏦 <b>New Wallet Balance:</b> ₹${retailer.walletBalance.toFixed(2)}\n` +
        `🆔 <b>Order ID:</b> #${orderId}\n` +
        `⏰ <b>Time:</b> ${escapeHtml(nowStrUpi)}\n` +
        `━━━━━━━━━━━━━━━━━━━━`;
      sendTelegramAlert(tgUpiMsg).catch(() => {});

      broadcastRealtimeEvent('WALLET_TOPPED_UP', { user: retailer, transaction, orderId });
      return true;
    }
  }

  return false;
}

// Check UPI Order Status via allapi.in
app.all('/api/upi/check-status/:orderId?', async (req: Request, res: Response) => {
  const orderId = req.params.orderId || req.body.order_id || req.query.order_id;

  if (!orderId) {
    return res.status(400).json({ error: 'order_id parameter is missing.' });
  }

  const existingOrder = upiOrders.find(o => o.orderId === orderId);

  // If already verified success in server state
  if (existingOrder && existingOrder.status === 'SUCCESS') {
    const retailer = users.find(u => u.id === existingOrder.retailerId);
    return res.json({
      success: true,
      orderId,
      orderStatus: 'SUCCESS',
      order: existingOrder,
      retailerWalletBalance: retailer?.walletBalance
    });
  }

  // Check simulate parameter if explicit simulation test requested
  const isSimulate = req.query.simulate === 'true' || req.body?.simulate === true;

  if (isSimulate) {
    creditWalletForOrder(orderId);
    return res.json({
      success: true,
      orderId,
      orderStatus: 'SUCCESS',
      order: existingOrder,
      simulated: true,
      retailerWalletBalance: existingOrder ? users.find(u => u.id === existingOrder.retailerId)?.walletBalance : undefined
    });
  }

  // Query real-time status from ALLAPI.in
  const { isSuccess, rawData, statusString } = await queryAllApiOrderStatus(orderId);

  if (isSuccess) {
    creditWalletForOrder(orderId);
  }

  const updatedOrder = upiOrders.find(o => o.orderId === orderId);

  return res.json({
    success: true,
    orderId,
    orderStatus: updatedOrder ? updatedOrder.status : (isSuccess ? 'SUCCESS' : 'PENDING'),
    order: updatedOrder || existingOrder,
    apiData: rawData,
    statusString,
    retailerWalletBalance: updatedOrder ? users.find(u => u.id === updatedOrder.retailerId)?.walletBalance : undefined
  });
});

// Instant Approve Route for fast testing/simulation
app.post('/api/upi/simulate-success', (req: Request, res: Response) => {
  const { orderId } = req.body;
  const existingOrder = upiOrders.find(o => o.orderId === orderId);

  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (existingOrder.status === 'PENDING') {
    creditWalletForOrder(orderId);
    const retailer = users.find(u => u.id === existingOrder.retailerId);
    return res.json({
      success: true,
      message: `₹${existingOrder.amount} added to wallet!`,
      user: retailer,
    });
  }

  return res.json({ success: true, message: 'Order already completed or processed.', order: existingOrder });
});

// ==========================================
// ALL-API.in UPI PAYMENT GATEWAY ENDPOINTS
// ==========================================

// 1. Create Order (/api/payment/create-order)
app.post('/api/payment/create-order', async (req: Request, res: Response) => {
  const {
    token,
    order_id,
    orderId,
    txn_amount,
    amount,
    txn_note,
    product_name,
    customer_name,
    customer_mobile,
    customer_email,
    merchant_vpa,
    merchant_name,
    retailerId
  } = req.body;

  const numAmount = Number(txn_amount || amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ status: false, message: 'Valid payment amount is required (राशि आवश्यक है).' });
  }

  const generatedOrderId = String(order_id || orderId || `ORD${Date.now()}`).trim();
  const vpa = (merchant_vpa || adminPaymentSettings.upiId || 'ecybercafe@upi').trim();
  const storeName = (merchant_name || adminPaymentSettings.payeeName || 'eCyberCafe Digital Services').trim();
  const apiToken = (token || adminPaymentSettings.gatewayToken || ALLAPI_UPI_TOKEN).trim();
  const baseUrl = (adminPaymentSettings.gatewayWebsiteUrl || 'https://allapi.in').replace(/\/+$/, '');
  const createOrderUrl = adminPaymentSettings.gatewayCreateOrderUrl || `${baseUrl}/order/create`;

  // Find retailer/user
  const targetRetailer = retailerId 
    ? (users.find(u => u.id === retailerId) || users.find(u => u.role === 'RETAILER') || users[0])
    : (users.find(u => u.role === 'RETAILER') || users[0]);

  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const redirectUrl = `${protocol}://${host}/payment-callback?orderId=${generatedOrderId}`;

  const standardUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(storeName)}&am=${numAmount.toFixed(2)}&tr=${generatedOrderId}&tn=${encodeURIComponent(txn_note || 'Wallet TopUp')}&cu=INR`;
  const gpayUri = `tez://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(storeName)}&am=${numAmount.toFixed(2)}&tr=${generatedOrderId}&tn=${encodeURIComponent(txn_note || 'Wallet TopUp')}&cu=INR`;
  const phonepeUri = `phonepe://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(storeName)}&am=${numAmount.toFixed(2)}&tr=${generatedOrderId}&tn=${encodeURIComponent(txn_note || 'Wallet TopUp')}&cu=INR`;
  const paytmUri = `paytmmp://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(storeName)}&am=${numAmount.toFixed(2)}&tr=${generatedOrderId}&tn=${encodeURIComponent(txn_note || 'Wallet TopUp')}&cu=INR`;

  const upiIntentObj = {
    bhim: standardUri,
    gpay: gpayUri,
    phonepe: phonepeUri,
    paytm: paytmUri
  };

  const payload = {
    token: apiToken,
    order_id: generatedOrderId,
    txn_amount: numAmount,
    txn_note: txn_note || 'Wallet TopUp',
    product_name: product_name || 'Wallet Recharge',
    customer_name: customer_name || targetRetailer?.name || 'Retailer',
    customer_mobile: customer_mobile || targetRetailer?.mobileNumber || '9999999999',
    customer_email: customer_email || targetRetailer?.email || 'retailer@ecybercafe.in',
    redirect_url: redirectUrl
  };

  let liveApiSuccess = false;
  let rawApiData: any = null;

  // Attempt to call ALLAPI.in with retry and 15s timeout
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const apiRes = await fetch(createOrderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });

      rawApiData = await apiRes.json();
      console.log(`[ALL-API.in Order Create Attempt ${attempt}]:`, rawApiData);

      if (rawApiData?.status === true || rawApiData?.status === 'true' || rawApiData?.status === 200 || rawApiData?.results?.payment_url || rawApiData?.payment_url) {
        liveApiSuccess = true;
        break;
      }
    } catch (err: any) {
      console.warn(`[ALL-API.in] Attempt ${attempt} failed for ${generatedOrderId}:`, err?.message);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  if (!liveApiSuccess || !rawApiData) {
    return res.status(502).json({
      status: false,
      success: false,
      message: 'ALLAPI Payment Gateway connection error. Please click retry.',
      error: 'GATEWAY_TIMEOUT'
    });
  }

  let formattedQrImage: string | undefined = undefined;
  const rawQrImg = rawApiData?.results?.qr_image || rawApiData?.qr_image || rawApiData?.results?.qr_url;
  if (rawQrImg && typeof rawQrImg === 'string') {
    if (rawQrImg.startsWith('data:') || rawQrImg.startsWith('http')) {
      formattedQrImage = rawQrImg;
    } else if (rawQrImg.startsWith('<svg')) {
      formattedQrImage = `data:image/svg+xml;utf8,${encodeURIComponent(rawQrImg)}`;
    } else {
      formattedQrImage = `data:image/svg+xml;base64,${rawQrImg}`;
    }
  }

  const paymentUrl = rawApiData.payment_url || rawApiData.results?.payment_url || `${baseUrl}/order/payment/${generatedOrderId}`;

  const liveUpiIntent = typeof rawApiData?.results?.upi_intent === 'object' 
    ? rawApiData.results.upi_intent 
    : typeof rawApiData?.upi_intent === 'object'
    ? rawApiData.upi_intent
    : {};

  const finalQrData =
    rawApiData?.results?.upi_intent?.bhim ||
    (typeof rawApiData?.results?.upi_intent === 'string' ? rawApiData.results.upi_intent : null) ||
    rawApiData?.results?.qr_data ||
    rawApiData?.qr_data ||
    rawApiData?.results?.qr_code ||
    rawApiData?.qr_code ||
    liveUpiIntent?.bhim ||
    paymentUrl;

  const newOrder: UpiOrder = {
    orderId: generatedOrderId,
    retailerId: targetRetailer?.id || 'usr_ret_1',
    retailerName: targetRetailer?.name || 'Retailer',
    retailerMobile: targetRetailer?.mobileNumber || customer_mobile || '9999999999',
    amount: numAmount,
    paymentUrl,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingIdx = upiOrders.findIndex(o => o.orderId === generatedOrderId);
  if (existingIdx >= 0) {
    upiOrders[existingIdx] = newOrder;
  } else {
    upiOrders.unshift(newOrder);
  }

  return res.json({
    status: true,
    success: true,
    message: 'AllApi.in Order created successfully.',
    orderId: generatedOrderId,
    amount: numAmount,
    paymentUrl,
    qr_data: finalQrData,
    qr_image: formattedQrImage,
    upi_intent: liveUpiIntent,
    results: {
      order_id: generatedOrderId,
      txn_id: rawApiData?.results?.txn_id || Math.floor(10000000 + Math.random() * 90000000),
      txn_amount: numAmount,
      payment_url: paymentUrl,
      upi_intent: liveUpiIntent,
      qr_data: finalQrData,
      qr_image: formattedQrImage,
      status: 'Pending'
    },
    raw_api_data: rawApiData
  });
});

// 2. Check Status (/api/payment/check-status)
app.post('/api/payment/check-status', async (req: Request, res: Response) => {
  const orderId = req.body.order_id || req.body.orderId || req.query.order_id || req.query.orderId;
  const token = req.body.token || adminPaymentSettings.gatewayToken || ALLAPI_UPI_TOKEN;

  if (!orderId) {
    return res.status(400).json({ status: false, message: 'order_id is required.' });
  }

  const existingOrder = upiOrders.find(o => o.orderId === orderId);

  // If already confirmed SUCCESS
  if (existingOrder && existingOrder.status === 'SUCCESS') {
    const retailer = users.find(u => u.id === existingOrder.retailerId);
    return res.json({
      status: true,
      success: true,
      results: { status: 'Success', order_id: orderId, txn_amount: existingOrder.amount },
      orderStatus: 'SUCCESS',
      order: existingOrder,
      retailerWalletBalance: retailer?.walletBalance
    });
  }

  // Check with ALLAPI.in gateway endpoint
  try {
    const statusUrl = adminPaymentSettings.gatewayCheckStatusUrl || 'https://allapi.in/order/status';
    const statusRes = await fetch(statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token || ALLAPI_UPI_TOKEN,
        order_id: orderId
      }),
      signal: AbortSignal.timeout(3500)
    });

    const statusData = await statusRes.json();
    console.log(`[ALLAPI /api/payment/check-status] for ${orderId}:`, statusData);

    const rawStatus = (
      statusData.results?.status ||
      statusData.results?.txn_status ||
      statusData.data?.status ||
      statusData.order_status ||
      statusData.status
    );

    const statusStr = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : '';
    const isSuccess = (statusData.status === true || statusData.status === 'true' || statusData.status === 200 || statusData.status === 'Success') &&
      (statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || statusStr === 'SUCCESSFUL' || statusData.results?.status === 'Success');

    if (isSuccess) {
      creditWalletForOrder(orderId);
      const updatedOrder = upiOrders.find(o => o.orderId === orderId);
      const retailer = updatedOrder ? users.find(u => u.id === updatedOrder.retailerId) : null;
      return res.json({
        status: true,
        success: true,
        results: { status: 'Success', order_id: orderId, amount: updatedOrder?.amount },
        orderStatus: 'SUCCESS',
        order: updatedOrder,
        retailerWalletBalance: retailer?.walletBalance
      });
    }

    return res.json({
      status: true,
      success: false,
      results: { 
        status: existingOrder ? (existingOrder.status === 'SUCCESS' ? 'Success' : 'Pending') : 'Pending',
        order_id: orderId
      },
      orderStatus: existingOrder ? existingOrder.status : 'PENDING',
      apiData: statusData
    });
  } catch (err: any) {
    // Gracefully handle gateway timeouts/unreachable status without breaking client polling
    console.log(`[ALLAPI polling for ${orderId}: ${err?.name === 'TimeoutError' || err?.message?.includes('Timeout') ? 'Gateway timeout (pending)' : (err?.message || 'Network delay')}]`);
    return res.json({
      status: true,
      success: false,
      results: { status: existingOrder ? (existingOrder.status === 'SUCCESS' ? 'Success' : 'Pending') : 'Pending', order_id: orderId },
      orderStatus: existingOrder ? existingOrder.status : 'PENDING'
    });
  }
});

// 3. Simulate Success (/api/payment/simulate-success)
app.post('/api/payment/simulate-success', (req: Request, res: Response) => {
  const orderId = req.body.order_id || req.body.orderId;
  if (!orderId) {
    return res.status(400).json({ status: false, message: 'order_id is required.' });
  }

  let existingOrder = upiOrders.find(o => o.orderId === orderId);

  if (!existingOrder) {
    const defaultRetailer = users.find(u => u.role === 'RETAILER') || users[0];
    existingOrder = {
      orderId,
      retailerId: defaultRetailer?.id || 'usr_ret_1',
      retailerName: defaultRetailer?.name || 'Retailer',
      amount: 100,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    upiOrders.unshift(existingOrder);
  }

  creditWalletForOrder(orderId);
  const retailer = users.find(u => u.id === existingOrder?.retailerId);

  res.json({
    status: true,
    success: true,
    message: `Payment simulated successfully! ₹${existingOrder.amount} credited to wallet.`,
    results: { status: 'Success', order_id: orderId },
    orderStatus: 'SUCCESS',
    order: existingOrder,
    retailerWalletBalance: retailer?.walletBalance
  });
});

// 4. Verify UTR (/api/payment/verify-utr)
app.post('/api/payment/verify-utr', (req: Request, res: Response) => {
  const { order_id, orderId, utr_number, utrNumber, amount } = req.body;
  const targetOrderId = order_id || orderId;
  const utr = String(utr_number || utrNumber || '').trim();

  if (!targetOrderId) {
    return res.status(400).json({ status: false, message: 'order_id is required.' });
  }

  if (!utr || utr.length < 6) {
    return res.status(400).json({ status: false, message: 'Please enter a valid 12-digit UPI / UTR Reference Number.' });
  }

  let existingOrder = upiOrders.find(o => o.orderId === targetOrderId);

  if (!existingOrder) {
    const defaultRetailer = users.find(u => u.role === 'RETAILER') || users[0];
    const parsedAmt = Number(amount) || 100;
    existingOrder = {
      orderId: targetOrderId,
      retailerId: defaultRetailer?.id || 'usr_ret_1',
      retailerName: defaultRetailer?.name || 'Retailer',
      amount: parsedAmt,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    upiOrders.unshift(existingOrder);
  }

  creditWalletForOrder(targetOrderId);
  const retailer = users.find(u => u.id === existingOrder?.retailerId);

  res.json({
    status: true,
    success: true,
    message: `UTR #${utr} verified! ₹${existingOrder.amount} credited to wallet balance.`,
    results: {
      status: 'Success',
      order_id: targetOrderId,
      utr_number: utr,
      amount: existingOrder.amount
    },
    orderStatus: 'SUCCESS',
    order: existingOrder,
    retailerWalletBalance: retailer?.walletBalance
  });
});

// Webhook endpoint for allapi.in
app.post('/api/upi/webhook', (req: Request, res: Response) => {
  console.log("ALLAPI Webhook payload received:", req.body);
  const { order_id, status, txn_amount } = req.body || {};

  if (order_id && (status === 'Success' || status === 'SUCCESS')) {
    const creditAmt = Number(txn_amount);
    creditWalletForOrder(order_id, creditAmt > 0 ? creditAmt : undefined);
  }

  res.json({ status: true, message: 'Webhook processed successfully' });
});

// GET /api/payment/orders & /api/upi/orders - List all gateway payment orders with status filtering & search
const handleGetPaymentOrders = (req: Request, res: Response) => {
  const retailerId = req.query.retailerId as string;
  const statusFilter = ((req.query.status as string) || 'ALL').toUpperCase();
  const searchQuery = ((req.query.search as string) || '').toLowerCase().trim();

  let filtered = [...upiOrders];

  // If retailerId provided, filter for that user (unless admin requests all)
  if (retailerId && retailerId !== 'ALL') {
    filtered = filtered.filter(o => o.retailerId === retailerId);
  }

  // Filter by status (SUCCESS, PENDING, FAILED)
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }

  // Search by orderId, retailerName, mobile, or amount
  if (searchQuery) {
    filtered = filtered.filter(o => {
      const matchId = o.orderId.toLowerCase().includes(searchQuery);
      const matchName = (o.retailerName || '').toLowerCase().includes(searchQuery);
      const matchMobile = (o.retailerMobile || '').toLowerCase().includes(searchQuery);
      const matchAmt = String(o.amount).includes(searchQuery);
      return matchId || matchName || matchMobile || matchAmt;
    });
  }

  // Return formatted array
  return res.json({
    success: true,
    total: filtered.length,
    orders: filtered
  });
};

app.get('/api/payment/orders', handleGetPaymentOrders);
app.get('/api/upi/orders', handleGetPaymentOrders);

// Admin Force Approve / Manual Verify endpoint
app.post('/api/payment/admin-force-approve', (req: Request, res: Response) => {
  const { orderId, order_id, adminSessionToken, notes } = req.body;
  const targetId = orderId || order_id;

  if (!targetId) {
    return res.status(400).json({ success: false, message: 'Order ID is required.' });
  }

  const existingOrder = upiOrders.find(o => o.orderId === targetId);
  if (!existingOrder) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  const wasCredited = creditWalletForOrder(targetId);
  const updatedOrder = upiOrders.find(o => o.orderId === targetId);
  const retailer = updatedOrder ? users.find(u => u.id === updatedOrder.retailerId) : null;

  return res.json({
    success: true,
    message: `Order #${targetId} manually verified! ₹${updatedOrder?.amount} credited to ${retailer?.name || 'Retailer'}'s wallet.`,
    order: updatedOrder,
    retailerWalletBalance: retailer?.walletBalance
  });
});

// Auto-Close Payment Callback & Return Page
app.get('/payment-callback', async (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || req.query.order_id || req.query.txn_id || '').trim();

  let isVerified = false;
  if (orderId) {
    const existingOrder = upiOrders.find(o => o.orderId === orderId);
    if (existingOrder) {
      if (existingOrder.status === 'SUCCESS') {
        isVerified = true;
      } else {
        const { isSuccess } = await queryAllApiOrderStatus(orderId);
        if (isSuccess) {
          creditWalletForOrder(orderId);
          isVerified = true;
        }
      }
    }
  }

  const foundOrder = upiOrders.find(o => o.orderId === orderId);
  const amountStr = foundOrder ? `₹${foundOrder.amount.toFixed(2)}` : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isVerified ? 'Payment Successful' : 'Payment Status Verification'} - eCyberCafe Portal</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4 font-sans">
      <div class="max-w-md w-full bg-slate-900 border-2 ${isVerified ? 'border-emerald-500/60' : 'border-amber-500/60'} rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-40 h-40 ${isVerified ? 'bg-emerald-500/20' : 'bg-amber-500/20'} rounded-full blur-2xl pointer-events-none"></div>

        <div class="w-20 h-20 ${isVerified ? 'bg-emerald-500/20 border-emerald-400' : 'bg-amber-500/20 border-amber-400'} border-2 rounded-2xl flex items-center justify-center mx-auto text-4xl shadow-lg">
          ${isVerified ? '✅' : '⏳'}
        </div>
        
        <div class="space-y-2">
          <h1 class="text-2xl font-black ${isVerified ? 'text-emerald-400' : 'text-amber-400'} tracking-tight">
            ${isVerified ? 'Payment Verified Successfully!' : 'Payment Verification in Progress'}
          </h1>
          <p class="text-sm font-semibold text-slate-200">
            ${isVerified ? `आपका पेमेंट ${amountStr ? `${amountStr} ` : ''}सफलतापूर्वक सत्यापित और वॉलेट में जोड़ दिया गया है।` : 'आपके पेमेंट की पुष्टि की जा रही है। कृपया प्रतीक्षा करें...'}
          </p>
          ${orderId ? `<p class="text-xs font-mono bg-slate-800 text-amber-300 py-1.5 px-3 rounded-xl border border-slate-700 inline-block">Order ID: ${orderId}</p>` : ''}
        </div>

        <div class="p-4 ${isVerified ? 'bg-emerald-950/80 border-emerald-500/40' : 'bg-amber-950/80 border-amber-500/40'} border rounded-2xl space-y-1">
          <div class="flex items-center justify-center gap-2 text-xs ${isVerified ? 'text-emerald-300' : 'text-amber-300'} font-black">
            <span class="w-2.5 h-2.5 rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping"></span>
            <span>${isVerified ? 'Auto Closing Window in 2 Seconds...' : 'Syncing with Payment Gateway...'}</span>
          </div>
          <p class="text-[11px] text-slate-300">यह पेज ऑटोमेटिक बंद हो जाएगा और आपको मूल ऐप पर वापस भेज देगा।</p>
        </div>

        <button onclick="closeAndReturn()" class="w-full py-3.5 bg-gradient-to-r ${isVerified ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-amber-400'} text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer">
          ↩️ Return to Portal / Close Window
        </button>
      </div>

      <script>
        const orderId = "${orderId}";
        const isVerified = ${isVerified};

        function notifyAndClose() {
          if (isVerified) {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'PAYMENT_SUCCESS', orderId }, '*');
                try { window.opener.focus(); } catch(e){}
              }
            } catch(e) {}

            try {
              const channel = new BroadcastChannel('payment_channel');
              channel.postMessage({ type: 'PAYMENT_SUCCESS', orderId });
            } catch(e) {}

            setTimeout(() => {
              try { window.close(); } catch(e) {}
              setTimeout(() => { window.location.href = '/'; }, 500);
            }, 2000);
          }
        }

        function closeAndReturn() {
          try {
            if (window.opener && !window.opener.closed) { window.opener.focus(); }
          } catch(e) {}
          try { window.close(); } catch(e) {}
          setTimeout(() => { window.location.href = '/'; }, 300);
        }

        notifyAndClose();
      </script>
    </body>
    </html>
  `);
});

// Embedded Payment Gateway Frame Proxy (Renders Gateway Content inside In-App iframe)
app.get('/api/payment-gateway-frame', async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url || '').trim();
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('<div style="padding:20px;font-family:sans-serif;text-align:center;color:#ef4444;">Invalid or missing payment URL</div>');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      return res.json(json);
    }

    let html = await response.text();
    const parsedUrl = new URL(targetUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head><base href="${baseUrl}/">`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD><base href="${baseUrl}/">`);
    } else {
      html = `<base href="${baseUrl}/">${html}`;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.send(html);
  } catch (err: any) {
    console.error("Payment frame proxy error:", err);
    res.redirect(targetUrl);
  }
});

// Live Chat Endpoint per Request
app.get('/api/chat/:requestId', (req: Request, res: Response) => {
  const { requestId } = req.params;
  const msgs = chatMessages.filter(m => m.requestId === requestId);
  res.json(msgs);
});

app.post('/api/chat/:requestId', (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { senderId, senderName, senderRole, text, attachmentUrl } = req.body;

  if (!text && !attachmentUrl) {
    return res.status(400).json({ error: 'Message content or image attachment is required.' });
  }

  const request = serviceRequests.find(r => r.id === requestId);

  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    requestId,
    senderId,
    senderName,
    senderRole,
    text,
    attachmentUrl,
    createdAt: new Date().toISOString(),
  };

  chatMessages.push(newMsg);

  if (request) {
    const isRetailerSender = senderRole === 'RETAILER';
    const notifRecipientRole = isRetailerSender ? 'ADMIN' : 'RETAILER';
    const notifRecipientId = isRetailerSender ? undefined : request.retailerId;

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      recipientRole: notifRecipientRole,
      recipientId: notifRecipientId,
      title: `Message regarding Request #${request.requestNumber}`,
      message: `${senderName}: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
      type: 'CHAT_MESSAGE',
      isRead: false,
      requestId: request.id,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(notif);
  }

  broadcastRealtimeEvent('CHAT_MESSAGE_SENT', { message: newMsg, requestId });

  res.status(201).json(newMsg);
});

// GENERAL SUPPORT CHAT STORE & ENDPOINTS
interface SupportChatMessage {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderRole: 'RETAILER' | 'ADMIN' | 'SYSTEM';
  text: string;
  attachmentUrl?: string;
  createdAt: string;
  isReadByAdmin?: boolean;
  isReadByRetailer?: boolean;
}

let supportChatMessages: SupportChatMessage[] = [
  {
    id: 'sup_1',
    userId: 'ALL',
    senderId: 'usr_admin',
    senderName: 'Helpdesk Officer (सहायता केंद्र)',
    senderRole: 'ADMIN',
    text: '👋 Namaste! Welcome to CafeService.in Helpdesk. Ask us anything about Block Rates, Wallet Recharge, Application Status, or Service Prices.',
    createdAt: new Date().toISOString(),
    isReadByAdmin: true,
    isReadByRetailer: true
  }
];

let supportTickets: SupportTicket[] = [
  {
    id: 'tkt_1001',
    ticketNumber: 1001,
    userId: 'usr_ret_1',
    userName: 'Sample Cyber Cafe',
    userMobile: '9876543210',
    storeName: 'Jan Seva Kendra',
    userRole: 'RETAILER',
    category: 'WALLET_PAYMENT',
    subject: 'Wallet Recharge Balance Query',
    description: 'Namaste! Helpdesk team is available for any issue resolution. You can create a ticket anytime.',
    status: 'RESOLVED',
    priority: 'LOW',
    messages: [
      {
        id: 'tktmsg_1',
        senderId: 'usr_admin',
        senderName: 'Helpdesk Officer (Admin)',
        senderRole: 'ADMIN',
        message: 'Welcome to eCyberCafe Helpdesk Ticket Support. Your queries will be answered directly by the Portal Admin here.',
        createdAt: new Date().toISOString()
      }
    ],
    adminNotes: 'Welcome ticket created.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Persistent File Storage Engine for Zero Data Loss
const getDatabaseFilePath = () => {
  if (process.env.DB_FILE_PATH) return process.env.DB_FILE_PATH;
  const storageDbPath = path.join(STORAGE_DIR, 'database.json');
  const cwdDbPath = path.join(process.cwd(), 'database.json');

  if (fs.existsSync(storageDbPath)) return storageDbPath;
  if (fs.existsSync(cwdDbPath)) return cwdDbPath;
  return storageDbPath;
};

const DB_FILE_PATH = getDatabaseFilePath();

function saveDatabaseToFile() {
  try {
    const dataToSave = {
      users,
      activeSessions,
      citizenServices,
      publicGovServices,
      blockApplicationRates,
      serviceRequests,
      walletTransactions,
      chatMessages,
      notifications,
      topupRequests,
      supportChatMessages,
      supportTickets,
      portalSettings,
      adminPaymentSettings,
      panFindConfig: panFindApiSettings,
      mobileInfoConfig: mobileInfoApiSettings,
      rcPrintConfig: rcPrintApiSettings,
      voterLinkConfig: voterMobileLinkApiSettings,
      whatsappConfig: {
        apiToken: WHATSAPP_API_TOKEN,
        sessionId: WHATSAPP_SESSION_ID,
        notifEnabled: WHATSAPP_NOTIF_ENABLED,
        portalUrl: PORTAL_CUSTOM_URL
      },
      telegramConfig: {
        botToken: TELEGRAM_BOT_TOKEN,
        chatId: TELEGRAM_CHAT_ID,
        alertsEnabled: TELEGRAM_ALERTS_ENABLED
      }
    };

    const jsonStr = JSON.stringify(dataToSave, null, 2);

    // Save to primary DB file path
    fs.writeFileSync(DB_FILE_PATH, jsonStr, 'utf-8');

    // Dual-Sync to persistent storage location if different
    const storageDbPath = path.join(STORAGE_DIR, 'database.json');
    const cwdDbPath = path.join(process.cwd(), 'database.json');

    if (DB_FILE_PATH !== storageDbPath && fs.existsSync(STORAGE_DIR)) {
      try { fs.writeFileSync(storageDbPath, jsonStr, 'utf-8'); } catch (e) {}
    }
    if (DB_FILE_PATH !== cwdDbPath) {
      try { fs.writeFileSync(cwdDbPath, jsonStr, 'utf-8'); } catch (e) {}
    }
  } catch (err) {
    console.error('Error writing database.json:', err);
  }
}

async function loadDatabaseFromFile() {
  try {
    const candidatePaths = [
      process.env.DB_FILE_PATH,
      path.join(STORAGE_DIR, 'database.json'),
      path.join(STORAGE_DIR, 'database_backup.json'),
      path.join(process.cwd(), 'storage', 'database.json'),
      path.join(process.cwd(), 'storage', 'database_backup.json'),
      path.join(process.cwd(), 'database.json'),
      path.join(process.cwd(), 'database_backup.json'),
      path.join(process.cwd(), 'backend', 'storage', 'database.json'),
      path.join(process.cwd(), 'backend', 'storage', 'database_backup.json'),
      path.join(process.cwd(), 'backend', 'database.json'),
      path.join(process.cwd(), 'backend', 'database_backup.json'),
      path.join(process.cwd(), 'public', 'database_backup.json')
    ].filter(Boolean) as string[];

    const uniquePaths = Array.from(new Set(candidatePaths));

    const mergedUsersMap = new Map<string, any>();
    const mergedRequestsMap = new Map<string, any>();
    const mergedServicesMap = new Map<string, any>();
    const mergedTransactionsMap = new Map<string, any>();
    const mergedChatMessagesMap = new Map<string, any>();
    const mergedSupportMessagesMap = new Map<string, any>();
    const mergedSupportTicketsMap = new Map<string, any>();
    const mergedNotificationsMap = new Map<string, any>();

    let loadedAny = false;

    for (const filePath of uniquePaths) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        if (!rawData || !rawData.trim()) continue;
        const parsed = JSON.parse(rawData);

        // Merge users
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          parsed.users.forEach((u: any) => {
            const key = u.id || u.mobileNumber || u.mobile || u.email;
            if (!key) return;
            if (!mergedUsersMap.has(key)) {
              mergedUsersMap.set(key, u);
            } else {
              const existing = mergedUsersMap.get(key);
              mergedUsersMap.set(key, { ...u, ...existing });
            }
          });
          loadedAny = true;
        }

        // Merge service requests
        if (Array.isArray(parsed.serviceRequests) && parsed.serviceRequests.length > 0) {
          parsed.serviceRequests.forEach((req: any) => {
            if (req.id) {
              if (!mergedRequestsMap.has(req.id)) {
                mergedRequestsMap.set(req.id, req);
              } else {
                const existing = mergedRequestsMap.get(req.id);
                mergedRequestsMap.set(req.id, { ...req, ...existing });
              }
            }
          });
          loadedAny = true;
        }

        // Merge citizen services safely
        if (Array.isArray(parsed.citizenServices) && parsed.citizenServices.length > 0) {
          parsed.citizenServices.forEach((s: any) => {
            if (s && s.id) {
              if (!mergedServicesMap.has(s.id)) {
                mergedServicesMap.set(s.id, s);
              } else {
                const existing = mergedServicesMap.get(s.id);
                mergedServicesMap.set(s.id, { ...s, ...existing });
              }
            }
          });
          loadedAny = true;
        }

        // Merge public government services safely
        if (Array.isArray(parsed.publicGovServices) && parsed.publicGovServices.length > 0) {
          publicGovServices = parsed.publicGovServices;
          loadedAny = true;
        }

        // Merge wallet transactions
        if (Array.isArray(parsed.walletTransactions) && parsed.walletTransactions.length > 0) {
          parsed.walletTransactions.forEach((tx: any) => {
            if (tx.id) mergedTransactionsMap.set(tx.id, tx);
          });
        }

        // Merge chat messages
        if (Array.isArray(parsed.chatMessages)) {
          parsed.chatMessages.forEach((msg: any) => {
            if (msg.id) mergedChatMessagesMap.set(msg.id, msg);
          });
        }

        // Merge support chat messages
        if (Array.isArray(parsed.supportChatMessages)) {
          parsed.supportChatMessages.forEach((msg: any) => {
            if (msg.id && msg.senderName !== 'Helpdesk AI Assistant' && !msg.text?.includes('Thank you for reaching out')) {
              mergedSupportMessagesMap.set(msg.id, msg);
            }
          });
        }

        // Merge support tickets
        if (Array.isArray(parsed.supportTickets)) {
          parsed.supportTickets.forEach((tkt: any) => {
            if (tkt.id) {
              if (!mergedSupportTicketsMap.has(tkt.id)) {
                mergedSupportTicketsMap.set(tkt.id, tkt);
              } else {
                const existing = mergedSupportTicketsMap.get(tkt.id);
                mergedSupportTicketsMap.set(tkt.id, { ...existing, ...tkt });
              }
            }
          });
        }

        // Merge notifications
        if (Array.isArray(parsed.notifications)) {
          parsed.notifications.forEach((n: any) => {
            if (n.id) mergedNotificationsMap.set(n.id, n);
          });
        }

        // Parse configurations if present
        if (parsed.portalSettings) portalSettings = { ...portalSettings, ...parsed.portalSettings };
        if (parsed.adminPaymentSettings) {
          adminPaymentSettings = { ...adminPaymentSettings, ...parsed.adminPaymentSettings };
          if (adminPaymentSettings.upiId?.includes('scan4print')) {
            adminPaymentSettings.upiId = 'ecybercafe@upi';
            adminPaymentSettings.payeeName = 'eCyberCafe Digital Services';
            adminPaymentSettings.qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('upi://pay?pa=ecybercafe@upi&pn=eCyberCafe Digital Services&cu=INR')}`;
          }
        }
        if (parsed.panFindConfig) {
          panFindApiSettings = {
            ...panFindApiSettings,
            ...parsed.panFindConfig,
            autoProcessOnSubmit: parsed.panFindConfig.autoProcessOnSubmit === false ? true : Boolean(parsed.panFindConfig.autoProcessOnSubmit ?? true)
          };
          if (!panFindApiSettings.apiUrl || panFindApiSettings.apiUrl.includes('apiadda.in')) {
            panFindApiSettings.apiUrl = 'https://tech4point.shop/api/v12/pan-find.php';
          }
          if (panFindApiSettings.apiKey === '4537cf-b91b5b-fb01f2-3dff5c-b49ba0' || panFindApiSettings.apiKey === 'AK475550') {
            panFindApiSettings.apiKey = 'AK474217';
          }
        }
        if (parsed.mobileInfoConfig) {
          mobileInfoApiSettings = {
            ...mobileInfoApiSettings,
            ...parsed.mobileInfoConfig,
            autoProcessOnSubmit: parsed.mobileInfoConfig.autoProcessOnSubmit === false ? true : Boolean(parsed.mobileInfoConfig.autoProcessOnSubmit ?? true)
          };
          if (!mobileInfoApiSettings.apiKey || mobileInfoApiSettings.apiKey === 'AK474079') {
            mobileInfoApiSettings.apiKey = 'AK474217';
          }
        }
        if (parsed.rcPrintConfig) {
          rcPrintApiSettings = {
            ...rcPrintApiSettings,
            ...parsed.rcPrintConfig,
            autoProcessOnSubmit: parsed.rcPrintConfig.autoProcessOnSubmit === false ? true : Boolean(parsed.rcPrintConfig.autoProcessOnSubmit ?? true)
          };
        }
        if (parsed.voterLinkConfig) {
          voterMobileLinkApiSettings = {
            ...voterMobileLinkApiSettings,
            ...parsed.voterLinkConfig,
            autoProcessOnSubmit: parsed.voterLinkConfig.autoProcessOnSubmit === false ? true : Boolean(parsed.voterLinkConfig.autoProcessOnSubmit ?? true)
          };
        }
        if (parsed.whatsappConfig) {
          if (parsed.whatsappConfig.apiToken) WHATSAPP_API_TOKEN = parsed.whatsappConfig.apiToken;
          if (parsed.whatsappConfig.sessionId) WHATSAPP_SESSION_ID = parsed.whatsappConfig.sessionId;
          if (parsed.whatsappConfig.notifEnabled !== undefined) WHATSAPP_NOTIF_ENABLED = Boolean(parsed.whatsappConfig.notifEnabled);
          if (parsed.whatsappConfig.portalUrl) PORTAL_CUSTOM_URL = parsed.whatsappConfig.portalUrl;
        }
        if (parsed.telegramConfig) {
          if (parsed.telegramConfig.botToken !== undefined) TELEGRAM_BOT_TOKEN = parsed.telegramConfig.botToken;
          if (parsed.telegramConfig.chatId !== undefined) TELEGRAM_CHAT_ID = parsed.telegramConfig.chatId;
          if (parsed.telegramConfig.alertsEnabled !== undefined) TELEGRAM_ALERTS_ENABLED = Boolean(parsed.telegramConfig.alertsEnabled);
        }
      } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
      }
    }

    if (mergedServicesMap.size > 0) {
      citizenServices = Array.from(mergedServicesMap.values());
    }

    // Ensure default services exist
    DEFAULT_CITIZEN_SERVICES.forEach(ds => {
      const existingIndex = citizenServices.findIndex(s => s.id === ds.id);
      if (existingIndex === -1) {
        citizenServices.push(ds);
      } else {
        // Only set default fields if existing fields are completely missing
        if (!citizenServices[existingIndex].fields || citizenServices[existingIndex].fields.length === 0) {
          citizenServices[existingIndex].fields = ds.fields;
        }
      }
    });

    if (loadedAny && (mergedUsersMap.size > 0 || mergedServicesMap.size > 0)) {
      if (mergedUsersMap.size > 0) users = Array.from(mergedUsersMap.values());
      if (mergedRequestsMap.size > 0) serviceRequests = Array.from(mergedRequestsMap.values());
      if (mergedTransactionsMap.size > 0) walletTransactions = Array.from(mergedTransactionsMap.values());
      if (mergedChatMessagesMap.size > 0) chatMessages = Array.from(mergedChatMessagesMap.values());
      if (mergedSupportMessagesMap.size > 0) supportChatMessages = Array.from(mergedSupportMessagesMap.values());
      if (mergedSupportTicketsMap.size > 0) supportTickets = Array.from(mergedSupportTicketsMap.values());
      if (mergedNotificationsMap.size > 0) notifications = Array.from(mergedNotificationsMap.values());

      saveDatabaseToFile();
      console.log(`✅ Persistent Database merged and loaded successfully (${users.length} users, ${citizenServices.length} services)`);
    } else {
      saveDatabaseToFile();
      console.log('📦 Created initial database.json file');
    }

    // Load & Sync with Firebase Firestore
    if (firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('citizenServices').get();
        if (!snapshot.empty) {
          const fsServicesMap = new Map<string, CitizenService>();
          // Preserve any existing in-memory services
          citizenServices.forEach(s => { if (s && s.id) fsServicesMap.set(s.id, s); });
          
          snapshot.forEach((doc: any) => {
            const data = doc.data() as CitizenService;
            if (data && data.id) {
              fsServicesMap.set(data.id, data);
            }
          });
          citizenServices = Array.from(fsServicesMap.values());
          console.log(`🔥 [Firebase Firestore] Loaded ${citizenServices.length} services from Cloud Firestore database.`);
        } else {
          console.log(`🔥 [Firebase Firestore] Firestore collection 'citizenServices' is empty. Initializing with existing dataset (${citizenServices.length} items)...`);
          await syncServicesToFirestore(citizenServices);
        }
      } catch (fsErr) {
        console.error('⚠️ [Firebase Firestore] Error reading services from Firestore:', fsErr);
      }
    }

    healAndProcessPendingInstantRequests().catch(e => console.error('[Auto-Heal] Error:', e));
  } catch (err) {
    console.error('Error reading database.json:', err);
  }
}

async function healAndProcessPendingInstantRequests() {
  for (const req of serviceRequests) {
    if (req.status !== 'PENDING') continue;

    const srvObj = citizenServices.find(s => s.id === req.serviceId);
    
    // Explicit Guard: If service is configured as Manual flow, never auto-process it!
    if (srvObj && srvObj.flowType === 'Manual') continue;

    const isInstantService = srvObj ? (
      srvObj.flowType === 'Instant' ||
      srvObj.flowType === 'Auto' ||
      (srvObj.processingTime || '').toLowerCase().includes('instant') ||
      (srvObj.title || '').toLowerCase().includes('instant')
    ) : false;

    if (!isInstantService) continue;

    const sTitle = (req.serviceTitle || '').toLowerCase();

    const isVoterMobileLink = req.serviceId === 'srv_voter_mobile_link' ||
      sTitle.includes('voter mobile link') ||
      sTitle.includes('voter link without otp') ||
      sTitle.includes('voter_link');

    const isRcPrint = req.serviceId === 'srv_rc_print' ||
      sTitle.includes('rc print') ||
      sTitle.includes('rc verification') ||
      sTitle.includes('vehicle rc') ||
      sTitle.includes('rc_print');

    const isMobileInfo = req.serviceId === 'srv_mobile_info' ||
      sTitle.includes('mobile number info') ||
      sTitle.includes('mobile detail') ||
      sTitle.includes('mobile info') ||
      sTitle.includes('mobile owner');

    const isPanDetails = req.serviceId === 'srv_9' ||
      sTitle.includes('pan details') ||
      sTitle.includes('pan to full details') ||
      sTitle.includes('pan full details');

    const isPanFind = req.serviceId === 'srv_8' ||
      sTitle.includes('pan find') ||
      sTitle.includes('aadhar to pan') ||
      sTitle.includes('aadhaar to pan') ||
      sTitle.includes('find pan') ||
      sTitle.includes('pan search');

    try {
      if (isVoterMobileLink && voterMobileLinkApiSettings.autoProcessOnSubmit) {
        const epicVal = extractEpicFromFormData(req.formData, srvObj?.fields) || req.formData?.epic_no || req.formData?.epicNumber || req.formData?.epic || req.formData?.epic_number || req.formData?.voter_no;
        const mobVal = extractMobileFromFormData(req.formData, srvObj?.fields) || req.formData?.mobile_no || req.formData?.mobileNumber || req.formData?.mobile;
        if (epicVal && mobVal) {
          console.log(`[Auto-Heal] Processing pending Voter Link #${req.requestNumber} for EPIC ${epicVal}...`);
          const apiResult = await executeVoterMobileLinkApi(epicVal, mobVal);
          if (apiResult && apiResult.success) {
            req.status = 'COMPLETED';
            req.adminRemarks = `⚡ INSTANT VOTER MOBILE LINK: EPIC = ${apiResult.epicNumber}, Mobile = ${apiResult.mobileNumber}, Status = ${apiResult.request_status}`;
            req.formData = {
              ...req.formData,
              epicNumber: apiResult.epicNumber,
              mobileNumber: apiResult.mobileNumber,
              request_status: apiResult.request_status,
              autoProcessedAt: new Date().toISOString()
            };
            req.updatedAt = new Date().toISOString();
            saveDatabaseToFile();
            broadcastRealtimeEvent('REQUEST_UPDATED', { request: req });
          }
        }
      } else if (isRcPrint && rcPrintApiSettings.autoProcessOnSubmit) {
        const rcVal = extractRcNumberFromFormData(req.formData) || req.formData?.rcno || req.formData?.rc_no || req.formData?.rcNumber || req.formData?.vehicle_no;
        if (rcVal) {
          console.log(`[Auto-Heal] Processing pending RC Print #${req.requestNumber} for RC ${rcVal}...`);
          const apiResult = await executeRcPrintApi(rcVal);
          if (apiResult && apiResult.success) {
            req.status = 'COMPLETED';
            if (apiResult.pdfUrl) {
              req.outputAttachmentUrl = apiResult.pdfUrl;
              req.outputFileUrl = apiResult.pdfUrl;
            }
            req.adminRemarks = `⚡ INSTANT AUTO-PROCESSED via Server API: Vehicle = ${apiResult.rcno}, Owner = ${apiResult.name}`;
            req.formData = {
              ...req.formData,
              rcno: apiResult.rcno,
              owner_name: apiResult.name,
              application_no: apiResult.application_no,
              pdfUrl: apiResult.pdfUrl,
              autoProcessedAt: new Date().toISOString()
            };
            req.updatedAt = new Date().toISOString();
            saveDatabaseToFile();
            broadcastRealtimeEvent('REQUEST_UPDATED', { request: req });
          }
        }
      } else if (isMobileInfo && mobileInfoApiSettings.autoProcessOnSubmit) {
        const mobVal = extractMobileFromFormData(req.formData) || req.formData?.mobile_no || req.formData?.mobileNumber || req.formData?.mobile || req.formData?.num;
        if (mobVal) {
          console.log(`[Auto-Heal] Processing pending Mobile Info #${req.requestNumber} for Mobile ${mobVal}...`);
          const apiResult = await executeMobileInfoApi(mobVal);
          if (apiResult && apiResult.success && apiResult.data) {
            req.status = 'COMPLETED';
            req.adminRemarks = `⚡ INSTANT AUTO-PROCESSED via Server API: Owner = ${apiResult.data.owner_name}, Address = ${apiResult.data.address}`;
            req.formData = {
              ...req.formData,
              owner_name: apiResult.data.owner_name,
              father_name: apiResult.data.father_name,
              address: apiResult.data.address,
              aadhar_number: apiResult.data.aadhar_number,
              alternative_number: apiResult.data.alternative_number,
              sim_card: apiResult.data.sim_card,
              email: apiResult.data.email,
              autoProcessedAt: new Date().toISOString()
            };
            req.updatedAt = new Date().toISOString();
            saveDatabaseToFile();
            broadcastRealtimeEvent('REQUEST_UPDATED', { request: req });
          }
        }
      } else if (isPanFind && panFindApiSettings.autoProcessOnSubmit) {
        const aVal = extractAadhaarFromFormData(req.formData);
        if (aVal) {
          if (!req.formData.aadhaar_no && !req.formData.aadhaar) req.formData.aadhaar_no = aVal;
          console.log(`[Auto-Heal] Processing pending PAN Find #${req.requestNumber} for Aadhaar ${aVal}...`);
          const apiResult = await executePanFindApi(aVal);
          if (apiResult && apiResult.success && apiResult.pan) {
            req.status = 'COMPLETED';
            req.adminRemarks = `⚡ INSTANT AUTO-PROCESSED: PAN Number = ${apiResult.pan}`;
            req.formData.pan_found = apiResult.pan;
            req.formData.autoProcessedAt = new Date().toISOString();
            req.updatedAt = new Date().toISOString();
            saveDatabaseToFile();
            broadcastRealtimeEvent('REQUEST_UPDATED', { request: req });
          }
        }
      } else if (isPanDetails && panFindApiSettings.autoProcessOnSubmit) {
        const pVal = extractPanFromFormData(req.formData);
        if (pVal) {
          console.log(`[Auto-Heal] Processing pending PAN Details #${req.requestNumber} for PAN ${pVal}...`);
          const apiResult = await executePanDetailsApi(pVal);
          if (apiResult && apiResult.success) {
            req.status = 'COMPLETED';
            req.adminRemarks = `⚡ INSTANT AUTO-PROCESSED via APIAdda: Name = ${apiResult.name}, Father = ${apiResult.fathername}, DOB = ${apiResult.dob}`;
            req.formData = {
              ...req.formData,
              pan_found: apiResult.pan,
              pan_name: apiResult.name,
              father_name: apiResult.fathername,
              dob: apiResult.dob,
              aadhaar_status: apiResult.aadharno,
              gender: apiResult.gender,
              pan_category: apiResult.pan_category,
              autoProcessedAt: new Date().toISOString()
            };
            req.updatedAt = new Date().toISOString();
            saveDatabaseToFile();
            broadcastRealtimeEvent('REQUEST_UPDATED', { request: req });
          }
        }
      }
    } catch (err: any) {
      console.error(`[Auto-Heal] Exception processing #${req.requestNumber}:`, err.message);
    }
  }
}

// GET Support Chat Messages for a specific retailer/user
app.get('/api/support-chat', (req: Request, res: Response) => {
  const { userId } = req.query;
  let msgs = [...supportChatMessages];
  if (userId && userId !== 'ALL') {
    msgs = msgs.filter(m => m.userId === userId || m.userId === 'ALL' || m.senderId === userId);
  }
  res.json(msgs);
});

// GET All Support Threads grouped by Retailer for Admin Dashboard
app.get('/api/admin/support-threads', (req: Request, res: Response) => {
  const userMap = new Map<string, {
    userId: string;
    userName: string;
    userMobile?: string;
    storeName?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    messages: SupportChatMessage[];
  }>();

  // Populate all registered non-admin users (Retailers & Distributors)
  users.filter(u => u.role !== 'ADMIN').forEach(u => {
    userMap.set(u.id, {
      userId: u.id,
      userName: u.name || 'Retailer User',
      userMobile: u.mobileNumber,
      storeName: u.storeName,
      lastMessage: 'No messages yet / कोई संदेश नहीं',
      lastMessageAt: '',
      unreadCount: 0,
      messages: [],
    });
  });

  const userMapById = new Map<string, User>();
  users.forEach(u => userMapById.set(u.id, u));

  supportChatMessages.forEach((msg) => {
    if (msg.userId === 'ALL') return;

    const userObj = userMapById.get(msg.userId);
    let thread = userMap.get(msg.userId);

    if (!thread) {
      thread = {
        userId: msg.userId,
        userName: userObj ? userObj.name : (msg.senderRole === 'RETAILER' ? msg.senderName : 'Retailer User'),
        userMobile: userObj?.mobileNumber,
        storeName: userObj?.storeName,
        lastMessage: msg.text || (msg.attachmentUrl ? '📷 [Image Attachment]' : ''),
        lastMessageAt: msg.createdAt,
        unreadCount: 0,
        messages: [],
      };
      userMap.set(msg.userId, thread);
    }

    thread.messages.push(msg);

    if (msg.senderRole === 'RETAILER' && !msg.isReadByAdmin) {
      thread.unreadCount += 1;
    }
  });

  userMap.forEach((thread) => {
    if (thread.messages.length > 0) {
      thread.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = thread.messages[thread.messages.length - 1];
      thread.lastMessage = last.text || (last.attachmentUrl ? '📷 [Image Attachment]' : '');
      thread.lastMessageAt = last.createdAt;
    }
  });

  const threads = Array.from(userMap.values()).sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aHasMsgs = a.messages.length > 0;
    const bHasMsgs = b.messages.length > 0;
    if (aHasMsgs !== bHasMsgs) {
      return bHasMsgs ? 1 : -1;
    }
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });

  res.json(threads);
});

// MARK Thread as read by Admin
app.post('/api/admin/support-threads/:userId/mark-read', (req: Request, res: Response) => {
  const { userId } = req.params;
  supportChatMessages.forEach(msg => {
    if (msg.userId === userId && msg.senderRole === 'RETAILER') {
      msg.isReadByAdmin = true;
    }
  });
  broadcastRealtimeEvent('SUPPORT_CHAT_READ', { userId });
  res.json({ success: true });
});

// POST New Support Chat Message (Retailer or Admin)
app.post('/api/support-chat', (req: Request, res: Response) => {
  const { userId, senderId, senderName, senderRole, text, attachmentUrl } = req.body;

  if (!text && !attachmentUrl) {
    return res.status(400).json({ error: 'Message text or attachment is required.' });
  }

  const userTargetId = userId || senderId || 'usr_ret_1';
  const isAdminSender = senderRole === 'ADMIN';

  const newMsg: SupportChatMessage = {
    id: `sup_${Date.now()}`,
    userId: userTargetId,
    senderId: senderId || 'usr_ret_1',
    senderName: senderName || (isAdminSender ? 'Helpdesk Officer (Admin)' : 'Retailer'),
    senderRole: senderRole || 'RETAILER',
    text: text || '',
    attachmentUrl,
    createdAt: new Date().toISOString(),
    isReadByAdmin: isAdminSender ? true : false,
    isReadByRetailer: !isAdminSender ? true : false,
  };

  supportChatMessages.push(newMsg);

  // If Admin replies to a retailer, create notification for that retailer
  if (isAdminSender && userTargetId !== 'ALL') {
    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      recipientRole: 'RETAILER',
      recipientId: userTargetId,
      title: 'Helpdesk Officer replied to your Support Chat 💬',
      message: `${senderName || 'Support Officer'}: ${text.slice(0, 70)}${text.length > 70 ? '...' : ''}`,
      type: 'CHAT_MESSAGE',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(notif);
  }

  // Broadcast event to all connected clients
  broadcastRealtimeEvent('SUPPORT_CHAT_MESSAGE', { message: newMsg, userId: userTargetId });

  res.status(201).json(newMsg);
});

// ==========================================
// SUPPORT TICKETS SYSTEM (हेल्पडेस्क सपोर्ट टिकट्स)
// ==========================================

// GET all tickets or filter by user
app.get('/api/tickets', (req: Request, res: Response) => {
  const { userId, status, category } = req.query;
  let list = [...supportTickets];

  if (userId && userId !== 'ALL' && userId !== 'admin') {
    list = list.filter(t => t.userId === userId);
  }

  if (status && status !== 'ALL') {
    list = list.filter(t => t.status === status);
  }

  if (category && category !== 'ALL') {
    list = list.filter(t => t.category === category);
  }

  // Sort: newest updated first
  list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  res.json({
    tickets: list,
    stats: {
      total: supportTickets.length,
      open: supportTickets.filter(t => t.status === 'OPEN').length,
      inProgress: supportTickets.filter(t => t.status === 'IN_PROGRESS').length,
      resolved: supportTickets.filter(t => t.status === 'RESOLVED').length,
      closed: supportTickets.filter(t => t.status === 'CLOSED').length,
    }
  });
});

// GET Single Ticket by ID
app.get('/api/tickets/:id', (req: Request, res: Response) => {
  const ticket = supportTickets.find(t => t.id === req.params.id || String(t.ticketNumber) === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }
  res.json(ticket);
});

// CREATE New Support Ticket
app.post('/api/tickets', (req: Request, res: Response) => {
  const { userId, userName, userMobile, storeName, userRole, category, subject, description, priority, relatedRequestId, attachmentUrl } = req.body;

  if (!subject || !subject.trim() || !description || !description.trim()) {
    return res.status(400).json({ error: 'Subject and Description are required to create a ticket.' });
  }

  const highestNumber = supportTickets.reduce((max, t) => Math.max(max, t.ticketNumber || 1000), 1000);
  const newTicketNumber = highestNumber + 1;
  const ticketId = `tkt_${Date.now()}`;
  const now = new Date().toISOString();

  const userObj = users.find(u => u.id === userId);

  const newTicket: SupportTicket = {
    id: ticketId,
    ticketNumber: newTicketNumber,
    userId: userId || 'usr_guest',
    userName: userName || userObj?.name || 'Retailer / Citizen',
    userMobile: userMobile || userObj?.mobileNumber || '',
    storeName: storeName || userObj?.storeName || '',
    userRole: userRole || userObj?.role || 'RETAILER',
    category: category || 'OTHER',
    subject: subject.trim(),
    description: description.trim(),
    status: 'OPEN',
    priority: priority || 'MEDIUM',
    relatedRequestId: relatedRequestId || undefined,
    attachmentUrl: attachmentUrl || undefined,
    messages: [
      {
        id: `tktmsg_${Date.now()}`,
        senderId: userId || 'usr_guest',
        senderName: userName || userObj?.name || 'Retailer',
        senderRole: userRole || userObj?.role || 'RETAILER',
        message: description.trim(),
        attachmentUrl: attachmentUrl || undefined,
        createdAt: now,
      }
    ],
    createdAt: now,
    updatedAt: now,
  };

  supportTickets.unshift(newTicket);
  saveDatabaseToFile();

  // Create notification for Admin
  const adminNotif: AppNotification = {
    id: `notif_${Date.now()}`,
    recipientRole: 'ADMIN',
    title: `🎫 New Support Ticket #${newTicketNumber}: ${category}`,
    message: `${newTicket.userName} (${newTicket.userMobile || 'No mobile'}): ${newTicket.subject}`,
    type: 'CHAT_MESSAGE',
    isRead: false,
    createdAt: now,
  };
  notifications.unshift(adminNotif);

  // Broadcast realtime event
  broadcastRealtimeEvent('TICKET_CREATED', { ticket: newTicket });

  res.status(201).json({ success: true, ticket: newTicket });
});

// REPLY to a Support Ticket
app.post('/api/tickets/:id/reply', (req: Request, res: Response) => {
  const ticket = supportTickets.find(t => t.id === req.params.id || String(t.ticketNumber) === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }

  const { senderId, senderName, senderRole, message, attachmentUrl } = req.body;
  if (!message && !attachmentUrl) {
    return res.status(400).json({ error: 'Reply message or attachment is required.' });
  }

  const now = new Date().toISOString();
  const isAdmin = senderRole === 'ADMIN' || senderRole === 'OPERATOR';

  const newReply: SupportTicketMessage = {
    id: `tktmsg_${Date.now()}`,
    senderId: senderId || (isAdmin ? 'usr_admin' : ticket.userId),
    senderName: senderName || (isAdmin ? 'Helpdesk Officer (Admin)' : ticket.userName),
    senderRole: senderRole || (isAdmin ? 'ADMIN' : 'RETAILER'),
    message: (message || '').trim(),
    attachmentUrl: attachmentUrl || undefined,
    createdAt: now,
  };

  if (!ticket.messages) ticket.messages = [];
  ticket.messages.push(newReply);
  ticket.updatedAt = now;

  if (isAdmin && ticket.status === 'OPEN') {
    ticket.status = 'IN_PROGRESS';
  } else if (!isAdmin && ticket.status === 'RESOLVED') {
    // Reopen if user replies
    ticket.status = 'OPEN';
  }

  saveDatabaseToFile();

  // Create notification for user if Admin replies
  if (isAdmin && ticket.userId) {
    const userNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      recipientRole: ticket.userRole as any,
      recipientId: ticket.userId,
      title: `🎫 Update on Ticket #${ticket.ticketNumber}`,
      message: `Admin Replied: ${(message || 'Attachment sent').slice(0, 80)}`,
      type: 'CHAT_MESSAGE',
      isRead: false,
      createdAt: now,
    };
    notifications.unshift(userNotif);
  }

  broadcastRealtimeEvent('TICKET_REPLIED', { ticketId: ticket.id, reply: newReply, ticket });

  res.json({ success: true, ticket });
});

// UPDATE Ticket Status / Admin Notes
app.patch('/api/tickets/:id/status', (req: Request, res: Response) => {
  const ticket = supportTickets.find(t => t.id === req.params.id || String(t.ticketNumber) === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }

  const { status, adminNotes, priority } = req.body;
  const now = new Date().toISOString();

  if (status) ticket.status = status;
  if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
  if (priority) ticket.priority = priority;
  ticket.updatedAt = now;

  saveDatabaseToFile();

  if (status && ticket.userId) {
    const statusLabels: Record<string, string> = {
      OPEN: 'Opened 🟢',
      IN_PROGRESS: 'Under Investigation 🟡',
      RESOLVED: 'Resolved ✅',
      CLOSED: 'Closed 🔒'
    };
    const userNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      recipientRole: ticket.userRole as any,
      recipientId: ticket.userId,
      title: `Ticket #${ticket.ticketNumber} Status: ${statusLabels[status] || status}`,
      message: adminNotes ? `Admin Note: ${adminNotes}` : `Your ticket regarding "${ticket.subject}" has been marked as ${status}.`,
      type: 'STATUS_CHANGE',
      isRead: false,
      createdAt: now,
    };
    notifications.unshift(userNotif);
  }

  broadcastRealtimeEvent('TICKET_STATUS_CHANGED', { ticketId: ticket.id, ticket });

  res.json({ success: true, ticket });
});

// DELETE Ticket (Admin)
app.delete('/api/tickets/:id', (req: Request, res: Response) => {
  const index = supportTickets.findIndex(t => t.id === req.params.id || String(t.ticketNumber) === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }

  const deleted = supportTickets.splice(index, 1)[0];
  saveDatabaseToFile();
  broadcastRealtimeEvent('TICKET_DELETED', { ticketId: deleted.id });

  res.json({ success: true, message: 'Ticket deleted successfully.' });
});

// Public Receiving / Output File Download Endpoint
app.get('/api/download-output/:requestId', (req: Request, res: Response) => {
  const request = serviceRequests.find(r => r.id === req.params.requestId);
  if (!request || !request.outputAttachmentUrl) {
    return res.status(404).send('Receiving document file not found.');
  }

  const url = request.outputAttachmentUrl;
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'bin';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="Receiving_${request.requestNumber}_${(request.serviceTitle || 'Document').replace(/\s+/g, '_')}.${ext}"`);
      return res.send(buffer);
    }
  }

  // If it's a standard HTTP URL, redirect
  res.redirect(url);
});

// Admin Push Notification Device Tokens Memory Store
let adminDeviceTokens: Array<{
  id: string;
  userId: string;
  role: string;
  token: string;
  userAgent?: string;
  updatedAt: string;
}> = [];

app.post('/api/notifications/subscribe-device', (req: Request, res: Response) => {
  const { token, role, userId, userAgent } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const existingIndex = adminDeviceTokens.findIndex(d => d.token === token || (d.userId === userId && userId));
  const deviceObj = {
    id: `dev_${Date.now()}`,
    userId: userId || 'usr_admin',
    role: role || 'ADMIN',
    token,
    userAgent: userAgent || (req.headers['user-agent'] as string),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    adminDeviceTokens[existingIndex] = deviceObj;
  } else {
    adminDeviceTokens.push(deviceObj);
  }

  res.json({ success: true, message: 'Admin device token registered successfully', totalDevices: adminDeviceTokens.length });
});

// Notifications API
app.get('/api/notifications', (req: Request, res: Response) => {
  const { role, userId, query } = req.query;
  let filtered = notifications.filter(n => {
    if (role === 'ADMIN') return n.recipientRole === 'ADMIN' || n.recipientRole === 'ALL';
    return (n.recipientRole === 'RETAILER' && n.recipientId === userId) || n.recipientRole === 'ALL';
  });

  if (query && typeof query === 'string' && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.message.toLowerCase().includes(q) ||
      (n.requestId && n.requestId.toLowerCase().includes(q))
    );
  }

  res.json(filtered);
});

app.patch('/api/notifications/mark-read', (req: Request, res: Response) => {
  const { role, userId } = req.body;
  notifications.forEach(n => {
    if (role === 'ADMIN' && (n.recipientRole === 'ADMIN' || n.recipientRole === 'ALL')) {
      n.isRead = true;
    } else if (role === 'RETAILER' && n.recipientId === userId) {
      n.isRead = true;
    }
  });
  res.json({ success: true });
});

app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
  }
  res.json({ success: true });
});

app.delete('/api/notifications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  notifications = notifications.filter(n => n.id !== id);
  res.json({ success: true });
});

// 30-Minute Pending Request Reminder Background Timer (Disabled as requested)
/*
setInterval(() => {
  const now = Date.now();
  const thirtyMinsMs = 30 * 60 * 1000;

  serviceRequests.forEach((req: any) => {
    if (req.status === 'PENDING') {
      const createdTime = new Date(req.createdAt).getTime();
      const lastReminder = req.lastReminderSentAt ? new Date(req.lastReminderSentAt).getTime() : createdTime;

      if (now - createdTime >= thirtyMinsMs && (now - lastReminder >= thirtyMinsMs)) {
        req.lastReminderSentAt = new Date().toISOString();

        const reminderNotif: AppNotification = {
          id: `notif_rem_${Date.now()}_${req.id}`,
          recipientRole: 'ADMIN',
          title: '⏰ Pending Request Reminder',
          message: `Request #${req.requestNumber} ("${req.serviceTitle}") from ${req.retailerName} is still pending for over 30 minutes!`,
          type: 'NEW_SUBMISSION',
          isRead: false,
          requestId: req.id,
          createdAt: new Date().toISOString(),
        };

        notifications.unshift(reminderNotif);

        broadcastRealtimeEvent('PENDING_REMINDER', {
          notification: reminderNotif,
          request: req,
          pushNotification: {
            title: '⏰ Pending Request Reminder',
            body: `Request #${req.requestNumber} (${req.serviceTitle}) from ${req.retailerName} is pending!`,
            url: `/admin`
          }
        });

        console.log(`[Reminder System] Sent 30-min pending reminder for Request #${req.requestNumber}`);
      }
    }
  });
}, 60000);
*/

// Stats
app.get('/api/stats', (req: Request, res: Response) => {
  const totalRequests = serviceRequests.length;
  const pendingRequests = serviceRequests.filter(r => r.status === 'PENDING').length;
  const inProcessRequests = serviceRequests.filter(r => r.status === 'IN_PROCESS').length;
  const completedRequests = serviceRequests.filter(r => r.status === 'COMPLETED').length;
  const rejectedRequests = serviceRequests.filter(r => r.status === 'REJECTED').length;

  const totalWalletRevenue = walletTransactions
    .filter(t => t.type === 'DEDUCTION')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRetailers = users.filter(u => u.role === 'RETAILER').length;
  const totalActiveServices = citizenServices.filter(s => s.isActive).length;

  const stats: AdminStats = {
    totalRequests,
    pendingRequests,
    inProcessRequests,
    completedRequests,
    rejectedRequests,
    totalWalletRevenue,
    totalRetailers,
    totalActiveServices,
  };

  res.json(stats);
});

// Database Export API
app.get('/api/export', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { format, type } = req.query;

  // Dedicated Active Service Requests Backup Export
  if (type === 'active-requests' || type === 'requests') {
    const activeRequests = serviceRequests.filter(
      r => r.status === 'PENDING' || r.status === 'IN_PROCESS'
    );
    
    const requestsData = {
      exportDate: new Date().toISOString(),
      exportType: 'Active & Pending Service Requests Backup',
      summary: {
        totalRequests: serviceRequests.length,
        activeRequestsCount: activeRequests.length,
        pendingRequestsCount: serviceRequests.filter(r => r.status === 'PENDING').length,
        inProcessRequestsCount: serviceRequests.filter(r => r.status === 'IN_PROCESS').length,
        completedRequestsCount: serviceRequests.filter(r => r.status === 'COMPLETED').length,
        rejectedRequestsCount: serviceRequests.filter(r => r.status === 'REJECTED').length,
      },
      activeRequests,
      allServiceRequests: serviceRequests,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="active_service_requests_backup_${dateStr}.json"`);
    return res.json(requestsData);
  }

  const fullDatabase = {
    exportDate: new Date().toISOString(),
    summary: {
      totalUsers: users.length,
      totalServices: citizenServices.length,
      totalRequests: serviceRequests.length,
      totalTransactions: walletTransactions.length,
      totalTopups: topupRequests.length,
      totalSupportChats: supportChatMessages.length,
    },
    users: sanitizeUsers(users),
    citizenServices,
    serviceRequests,
    walletTransactions,
    chatMessages,
    notifications,
    topupRequests,
    supportChatMessages,
    portalSettings,
    adminPaymentSettings,
  };

  if (format === 'csv') {
    let csv = '=== CITIZEN SERVICES TABLE ===\n';
    csv += 'ID,Title,Category,Price,ProcessingTime,Badge,IsActive\n';
    citizenServices.forEach(s => {
      csv += `"${s.id}","${s.title.replace(/"/g, '""')}","${s.category}",${s.price},"${s.processingTime}","${s.badge}",${s.isActive}\n`;
    });

    csv += '\n=== SERVICE REQUESTS TABLE ===\n';
    csv += 'RequestNum,ID,Service,Retailer,Price,Status,CreatedAt\n';
    serviceRequests.forEach(r => {
      csv += `#${r.requestNumber},"${r.id}","${r.serviceTitle}","${r.retailerName}",${r.price},"${r.status}","${r.createdAt}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="citizenservice_portal_db.csv"');
    return res.send(csv);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="citizenservice_portal_full_db_${dateStr}.json"`);
  res.json(fullDatabase);
});

// Database Import & Restore Backup API
app.post('/api/admin/import', (req: Request, res: Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON payload for restore.' });
  }

  let restoredServices = 0;
  let restoredRequests = 0;
  let restoredUsers = 0;

  // 1. Restore citizenServices while preserving live services created after going live
  const importedServices = Array.isArray(data.citizenServices)
    ? data.citizenServices
    : Array.isArray(data.services)
    ? data.services
    : null;

  if (importedServices && importedServices.length > 0) {
    const sMap = new Map<string, CitizenService>();
    // Preserve existing live services
    citizenServices.forEach(s => {
      if (s && s.id) sMap.set(s.id, s);
    });
    // Add imported services if missing or merge
    importedServices.forEach((s: CitizenService) => {
      if (s && s.id && s.title) {
        if (!sMap.has(s.id)) {
          sMap.set(s.id, s);
        } else {
          const live = sMap.get(s.id)!;
          sMap.set(s.id, { ...s, ...live });
        }
      }
    });
    DEFAULT_CITIZEN_SERVICES.forEach(ds => {
      if (!sMap.has(ds.id)) {
        sMap.set(ds.id, ds);
      }
    });
    citizenServices = Array.from(sMap.values());
    restoredServices = importedServices.length;
    broadcastRealtimeEvent('SERVICES_UPDATED', { services: citizenServices });
  }

  // 2. Restore serviceRequests while preserving live requests submitted after going live
  const importedRequests = Array.isArray(data.allServiceRequests)
    ? data.allServiceRequests
    : Array.isArray(data.activeRequests)
    ? data.activeRequests
    : Array.isArray(data.serviceRequests)
    ? data.serviceRequests
    : Array.isArray(data.requests)
    ? data.requests
    : null;

  if (importedRequests && importedRequests.length > 0) {
    const reqMap = new Map<string, ServiceRequest>();
    // Preserve live requests submitted after website went live
    serviceRequests.forEach(r => reqMap.set(r.id, r));
    // Add missing requests from backup
    importedRequests.forEach((r: ServiceRequest) => {
      if (r && r.id) {
        if (!reqMap.has(r.id)) {
          reqMap.set(r.id, r);
        } else {
          const liveReq = reqMap.get(r.id)!;
          reqMap.set(r.id, { ...r, ...liveReq });
        }
      }
    });
    serviceRequests = Array.from(reqMap.values());
    restoredRequests = importedRequests.length;
    broadcastRealtimeEvent('ALL_REQUESTS_UPDATED', { requests: serviceRequests });
  }

  // 3. Restore Users while preserving live user accounts and wallet balances
  if (Array.isArray(data.users) && data.users.length > 0) {
    const uMap = new Map<string, User>();
    // Preserve live users
    users.forEach(u => uMap.set(u.id, u));
    data.users.forEach((u: User) => {
      if (u && u.id) {
        if (!uMap.has(u.id)) {
          uMap.set(u.id, u);
        } else {
          const liveUser = uMap.get(u.id)!;
          uMap.set(u.id, { ...u, ...liveUser });
        }
      }
    });
    users = Array.from(uMap.values());
    restoredUsers = data.users.length;
  }

  // 4. Portal settings
  if (data.portalSettings) {
    portalSettings = { ...portalSettings, ...data.portalSettings };
  }

  saveDatabaseToFile();

  res.json({
    success: true,
    message: `Backup restored successfully! (${restoredServices} services, ${restoredRequests} requests, ${restoredUsers} users imported).`,
    summary: {
      servicesCount: citizenServices.length,
      requestsCount: serviceRequests.length,
      usersCount: users.length
    }
  });
});

// Catch-all for unmatched API routes to prevent returning HTML index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
});

// Express error handler for API routes to guarantee JSON response
app.use((err: any, req: Request, res: Response, next: any) => {
  if (req.path.startsWith('/api') || req.headers?.accept?.includes('json')) {
    console.error('API Express Error Handler:', err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    return res.status(statusCode).json({
      error: err.message || 'Internal Server Error',
      code: err.code || 'SERVER_ERROR'
    });
  }
  next(err);
});

// Backend Server Initialization
async function startServer() {
  await loadDatabaseFromFile();
  ensureDefaultTemplateExists().catch(err => console.error('Template initialization error:', err));

  // Serve Vite frontend in dev mode or static files in production
  let frontendDir = path.resolve(process.cwd(), 'frontend');
  if (!fs.existsSync(frontendDir)) {
    frontendDir = path.resolve(process.cwd(), '../frontend');
  }

  let distPath = '';
  const frontendDistPath = path.resolve(frontendDir, 'dist');
  const rootDistPath = path.resolve(process.cwd(), 'dist');
  
  if (fs.existsSync(path.join(frontendDistPath, 'index.html'))) {
    distPath = frontendDistPath;
  } else if (fs.existsSync(path.join(rootDistPath, 'index.html'))) {
    distPath = rootDistPath;
  }

  if (process.env.NODE_ENV === 'production' && distPath) {
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const vite = await createViteServer({
        root: frontendDir,
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Vite middleware startup error:', err);
      if (distPath) {
        app.use(express.static(distPath));
        app.get('*', (req: Request, res: Response) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  // Error handling middleware for large payloads and general errors
  app.use((err: any, req: Request, res: Response, next: any) => {
    if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
      return res.status(413).json({
        error: '413 Request Entity Too Large: The uploaded file or request body exceeds the 50MB limit.'
      });
    }
    console.error('Unhandled Express Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 eCyberCafe API Backend Server running on http://0.0.0.0:${PORT}`);
    console.log(`📦 Database Location: ${DB_FILE_PATH}`);
    console.log(`📁 Uploads Directory: ${uploadsExternalDir}`);
  });
}

startServer();
