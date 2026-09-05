export type UserRole = 'RETAILER' | 'ADMIN' | 'DISTRIBUTOR' | 'MASTER_DISTRIBUTOR' | 'STATE_HEAD' | 'OPERATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeName?: string;
  mobileNumber?: string;
  password?: string;
  walletBalance: number;
  commissionBalance?: number;
  distributorId?: string;
  createdById?: string;
  createdByName?: string;
  avatarUrl?: string;
  state?: string;
  district?: string;
  block?: string;
  isBlocked?: boolean;
  referralCode?: string;
  referredByCode?: string;
  assignedServiceIds?: string[]; // Service IDs this operator can access
  operatorLabel?: string; // Optional custom title e.g. "Aadhaar Dept Staff"
  createdAt?: string;
}

export type ServiceFormFieldType = 'text' | 'number' | 'select' | 'textarea' | 'file' | 'formatted_date';

export interface ServiceFormField {
  id: string;
  label: string;
  type: ServiceFormFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select dropdowns
  helpText?: string;
  maxLength?: number; // e.g. 12 for Aadhaar, 10 for Mobile
  maxFileSizeMb?: number; // Max upload limit in MB (e.g. 2MB or 5MB) for file upload fields
  enableCompression?: boolean; // Enable compression tool specifically for this file field
}

export const formatDDMMYYYY = (input: string, prevInput: string = ''): string => {
  if (input.length < prevInput.length) {
    return input;
  }
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';

  let formatted = '';
  if (digits.length >= 1) {
    formatted += digits.slice(0, 2);
    if (digits.length >= 2) formatted += '-';
  }
  if (digits.length >= 3) {
    formatted += digits.slice(2, 4);
    if (digits.length >= 4) formatted += '-';
  }
  if (digits.length >= 5) {
    formatted += digits.slice(4, 8);
  }
  return formatted;
};

export interface PortalSubItem {
  id?: string;
  title: string;
  url: string;
  type?: 'LINK' | 'PDF' | 'DIRECT' | string;
  badge?: string;
}

export interface PublicGovService {
  id: string;
  title: string;
  hindiTitle?: string;
  tagline?: string;
  category?: string;
  portalUrl?: string;
  actionUrl?: string;
  url?: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple' | 'cyan' | 'green' | 'red' | string;
  iconType?: string;
  iconUrl?: string;
  isActive?: boolean;
  priority?: number;
  order?: number;
  openInNewTab?: boolean;
  description?: string;
  stateCode?: string; // e.g. 'ALL', 'BIHAR', 'UP', 'MP', 'JHARKHAND', 'DELHI'
  subItems?: PortalSubItem[];
  createdAt?: string;
}

export interface CitizenService {
  id: string;
  title: string;
  category: 'Aadhaar' | 'Voter' | 'PAN' | 'Transport' | 'Samagra' | 'Utility' | 'Other';
  price: number;
  distributorPrice?: number; // Custom distributor rate (optional)
  distributorCommissionPercent?: number; // Custom distributor commission % override for this service (optional)
  processingTime: string;
  badge: 'NEW' | 'PREMIUM' | 'STANDARD' | 'UNAVAILABLE';
  iconType: string;
  iconUrl?: string;
  bgGradient: string;
  description: string;
  fields: ServiceFormField[];
  isActive: boolean;
  createdAt: string;
  warningNotice?: string;
  warningImage?: string;
  warningType?: 'warning' | 'critical' | 'info';
  enablePanResizer?: boolean; // Enable UTI PAN Photo & Signature Resizer tool for Admin
  enableCompressionTool?: boolean; // Enable PDF / Photo Compressor tool for this service (ON / OFF)
  enableChat?: boolean; // Controls whether Chat & WhatsApp system is enabled for this service
  isDistributorOnly?: boolean; // If true, only visible/accessible to Distributors, Master Distributors, State Heads, and Admins
  flowType?: 'Manual' | 'Instant' | 'Auto'; // Flow type: Manual vs Instant
  serviceTypeTag?: string; // e.g. 'Main Service', 'Sub Service'
  dailyLimit?: string; // e.g. 'Unlimited', '50/day'
  timingText?: string; // e.g. '24×7', '9 AM - 9 PM'
  priority?: number; // Priority rank / order e.g. 1, 104
  telegramAlertEnabled?: boolean; // Dedicated Telegram Alert Enabled for this service
  telegramChatId?: string;       // Dedicated Telegram Group/Chat ID for operators (e.g. -1001234567890)
  telegramBotToken?: string;     // Dedicated Telegram Bot Token override (optional)
  announcementBanner?: string; // Announcement notice pill shown on card e.g. '📢 Puc Without OTP Service Again Working ❤️'
}

export function getServicePriceForUser(
  service: CitizenService,
  user: User | null
): {
  displayPrice: number;
  isDistributorRate: boolean;
  retailerPrice: number;
} {
  const retailerPrice = service.price || 0;
  if (!user || !['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(user.role)) {
    return { displayPrice: retailerPrice, isDistributorRate: false, retailerPrice };
  }

  const numDistPrice =
    service.distributorPrice !== undefined &&
    service.distributorPrice !== null &&
    (service.distributorPrice as any) !== ''
      ? Number(service.distributorPrice)
      : undefined;

  const numDistCommPct =
    service.distributorCommissionPercent !== undefined &&
    service.distributorCommissionPercent !== null &&
    (service.distributorCommissionPercent as any) !== ''
      ? Number(service.distributorCommissionPercent)
      : undefined;

  if (numDistPrice !== undefined && !isNaN(numDistPrice) && numDistPrice >= 0) {
    return { displayPrice: numDistPrice, isDistributorRate: true, retailerPrice };
  }

  if (numDistCommPct !== undefined && !isNaN(numDistCommPct) && numDistCommPct >= 0) {
    const calcPrice = Number((retailerPrice * (1 - numDistCommPct / 100)).toFixed(2));
    return { displayPrice: calcPrice, isDistributorRate: true, retailerPrice };
  }

  // Default 2% distributor discount if no explicit custom price
  const defaultDistPrice = Number((retailerPrice * 0.98).toFixed(2));
  return { displayPrice: defaultDistPrice, isDistributorRate: true, retailerPrice };
}

export type ServiceRequestStatus = 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'REJECTED' | 'FAILED';

export interface ServiceRequest {
  id: string;
  requestNumber: number;
  serviceId: string;
  serviceTitle: string;
  category: string;
  retailerId: string;
  retailerName: string;
  retailerMobile?: string;
  price: number;
  formData: Record<string, any>;
  status: ServiceRequestStatus;
  rejectionReason?: string;
  adminRemarks?: string;
  outputAttachmentUrl?: string;
  generatedPdf?: string;
  claimedByOperatorId?: string;
  claimedByOperatorName?: string;
  createdAt: string;
  updatedAt: string;
  unreadChatCount?: {
    admin: number;
    retailer: number;
  };
  chatMessages?: ChatMessage[];
}

export interface WalletTransaction {
  id: string;
  retailerId: string;
  retailerName?: string;
  retailerMobile?: string;
  storeName?: string;
  type: 'DEDUCTION' | 'SERVICE_DEDUCTION' | 'TOP_UP' | 'REFUND' | 'COMMISSION' | 'COMMISSION_TRANSFER' | 'DEBIT' | 'MANUAL_CREDIT' | 'MANUAL_DEBIT';
  amount: number;
  previousBalance?: number;
  newBalance?: number;
  description: string;
  requestId?: string;
  serviceTitle?: string;
  createdAt: string;
}

export interface UpiOrder {
  orderId: string;
  retailerId: string;
  retailerName?: string;
  retailerMobile?: string;
  amount: number;
  paymentUrl?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
  attachmentUrl?: string;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
}

export interface PortalSettings {
  signupBonus?: number;
  enableSignupBonus?: boolean;
  enableDistributorRegistration?: boolean;
  distributorCommissionPercent?: number;
  portalName?: string;
  supportHelpline?: string;
  supportWhatsapp?: string;
  telegramChannel?: string;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole | 'ALL';
  recipientId?: string;
  title: string;
  message: string;
  type: 'NEW_SUBMISSION' | 'STATUS_CHANGE' | 'WALLET_DEDUCTION' | 'CHAT_MESSAGE' | 'TOP_UP';
  isRead: boolean;
  requestId?: string;
  productId?: string;
  createdAt: string;
}

export interface AdminStats {
  totalRequests: number;
  pendingRequests: number;
  inProcessRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  totalWalletRevenue: number;
  totalRetailers: number;
  totalActiveServices: number;
}

export interface BlockApplicationRate {
  id: string;
  state: string;        // e.g. "Bihar"
  district: string;     // e.g. "Gaya", "Aurangabad"
  block: string;        // e.g. "Konch", "Tekari", "Guraru"
  appPrefix: string;    // e.g. "BICCO", "BCCCO", "BRCCO" or specific app code
  appTypeLabel?: string; // e.g. "BICCO Commercial Application"
  price: number;        // Custom Rate (e.g., 50, 60, 55, 40, 70, 65)
  isActive: boolean;
  notes?: string;
  updatedAt: string;
}

export interface UpiIntent {
  bhim?: string;
  gpay?: string;
  phonepe?: string;
  paytm?: string;
}

export interface PaymentOrder {
  orderId: string;
  txnId?: string | number;
  amount: number;
  status: 'Pending' | 'Success' | 'Failed' | 'PENDING' | 'SUCCESS';
  paymentUrl?: string;
  upiIntent?: string | UpiIntent;
  qrData?: string;
  qrImage?: string;
  createdAt: string;
}

export interface MerchantConfig {
  apiToken: string;
  merchantVpa?: string;
  merchantName?: string;
  adminPassword?: string;
  bwPricePerPage?: number;
  colorPricePerPage?: number;
  aadhaarPrice?: number;
}

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'RETAILER' | 'DISTRIBUTOR' | 'OPERATOR' | 'ADMIN';
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export type TicketCategory = 'WALLET_PAYMENT' | 'SERVICE_REQUEST' | 'CORRECTION' | 'TECHNICAL' | 'OTHER';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  userId: string;
  userName: string;
  userMobile?: string;
  storeName?: string;
  userRole: 'RETAILER' | 'DISTRIBUTOR' | 'OPERATOR' | 'ADMIN';
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  relatedRequestId?: string;
  attachmentUrl?: string;
  messages: SupportTicketMessage[];
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

