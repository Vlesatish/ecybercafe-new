export type DocumentTypePreset = 
  | 'aadhaar' 
  | 'pan' 
  | 'voter' 
  | 'ayushman' 
  | 'dl' 
  | 'eshram' 
  | 'student' 
  | 'custom';

export type PaperSize = 'a4' | '4x6' | 'pvc_single' | 'pvc_tray' | 'custom';

export type ColorMode = 'color' | 'gray' | 'threshold_bw';

export interface EnhanceRegion {
  id: string;
  x: number; // % relative 0-100
  y: number; // % relative 0-100
  width: number; // % relative 0-100
  height: number; // % relative 0-100
  targetType: 'PHOTO' | 'TEXT_CARD';
  brightness: number; // -50 to +50
  contrast: number; // -50 to +50
  overallColor: string; // Hex or 'none'
  targetColor: string; // 'none' | 'black' | 'gray' | 'white' | 'red' | 'blue' | 'green' | 'yellow' | 'custom'
  customTargetColorHex?: string;
  colorLightDark: number; // -50 to +50
  matchingRange: number; // 1 to 100 tolerance
}

export interface ScanAdjustmentParams {
  filterMode: 'ORIGINAL' | 'NATURAL_MAGIC' | 'BW' | 'CUSTOM';
  brightness: number; // 50 - 150 (100 is default)
  contrast: number; // 50 - 160 (100 is default)
  saturation: number; // 0 - 200 (100 is default)
  warmth: number; // -50 to +50 (0 is default)
  sharpness: number; // 0 - 100 (0 is default)
  clarity: number; // 0 - 100 (0 is default)
  thresholdBW: number; // 0 - 255 (128 default for B&W threshold mode)
}

export interface CardBorderConfig {
  enabled: boolean;
  color: string; // Hex
  thicknessPx: number; // 1 - 10
}

export interface CardItem {
  id: string;
  cardName: string;
  cardTypePreset: DocumentTypePreset;
  frontImage: string | null;
  backImage: string | null;
  originalFrontBlob?: string | null;
  originalBackBlob?: string | null;
  
  // Non-destructive adjustments
  adjustments: ScanAdjustmentParams;
  textDarken: boolean; // Text & barcode deep black optimization
  mirrorFront: boolean;
  mirrorBack: boolean;
  border: CardBorderConfig;
  roundedCorners: boolean;
  enhanceRegions: EnhanceRegion[];
}

export interface PrintPage {
  id: string;
  pageNumber: number;
  cards: CardItem[];
  customDimensionsMm?: {
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'inch' | 'px';
  };
}

export interface UserProfile {
  id: string;
  name: string;
  emailOrPhone: string;
  isLoggedIn: boolean;
  shopName?: string;
  role?: 'admin' | 'operator' | 'customer';
}

export interface PrintJob {
  id: string;
  shopId?: string;
  customerName: string;
  customerPhone?: string;
  customerSessionId?: string;
  fileName?: string;
  files?: { name: string; type: string; url?: string }[];
  pages?: number;
  colorCopies: number;
  grayCopies: number;
  totalAmount: number;
  paymentMode: 'no_payment' | 'cash' | 'online_upi' | 'paytm_business';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  approvalStatus: 'none_required' | 'waiting' | 'approved' | 'rejected';
  printStatus: 'payment_pending' | 'approval_waiting' | 'queued' | 'printing' | 'printed' | 'failed' | 'cancelled';
  printerName: string;
  idempotencyKey?: string;
  createdAt: number;
  updatedAt?: number;
  errorMessage?: string;
}

export interface ShopSettings {
  shopId: string;
  shopName: string;
  shopToken: string;
  qrUrl: string;
  selectedPrinter: string;
  shopPrintRule: 'customer_choice' | 'only_color' | 'only_gray';
  paymentMode: 'no_payment' | 'cash' | 'online_upi' | 'paytm_business';
  approvalBeforePrint: boolean;
  colorRate: number;
  grayRate: number;
  settlementUpiId: string;
  settlementAccountName: string;
  receiverMode: 'platform' | 'shop_paytm';
  paytmMid?: string;
  isAgentRunning: boolean;
  language: 'HI_EN' | 'EN';
}

export interface WalletTransaction {
  id: string;
  type: 'payment_credit' | 'gateway_fee' | 'withdrawal_request' | 'withdrawal_complete' | 'adjustment';
  amount: number;
  description: string;
  jobId?: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface WalletState {
  balance: number;
  totalReceived: number;
  pendingRequests: number;
  transferredAmount: number;
  transactions: WalletTransaction[];
}

export interface LocalAgentInfo {
  installed: boolean;
  running: boolean;
  version: string;
  port: number;
  apiUrl: string;
  printers: string[];
  status: 'CHECKING' | 'AGENT_MISSING' | 'AGENT_FOUND' | 'CONNECTING' | 'RUNNING' | 'STOPPED' | 'ERROR';
  lastPing?: number;
  isMock: boolean;
}

export type PlanTier = 'FREE' | 'PRO' | 'AUTO_PRINT';

export interface UserSubscription {
  tier: PlanTier;
  hasAutoPrint: boolean;
  expiresAt: number | null;
  features: {
    hdExport: boolean;
    customSizes: boolean;
    autoPrintAgent: boolean;
    advancedEnhance: boolean;
    unlimitedPages: boolean;
    pvcWorkflow: boolean;
  };
}
