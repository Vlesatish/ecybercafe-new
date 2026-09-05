import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceRequest, CitizenService, AdminStats, BlockApplicationRate, User, UserRole, WalletTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { syncServicesWithServerIfNeeded, getServicesWithRecoveryCheck, safeSaveServicesToLocalStorage, subscribeToFirestoreServices } from '../utils/serviceStorage';
import { realtimeClient } from '../utils/realtimeClient';
import { INDIAN_STATES, BIHAR_DISTRICTS, BIHAR_BLOCKS } from '../data/locationData';
import { InlineRequestChat } from './InlineRequestChat';
import { AdminServiceEditModal } from './AdminServiceEditModal';
import { AdminSupportTicketManager } from './AdminSupportTicketManager';
import { DatabaseExportModal } from './DatabaseExportModal';
import { UTIPanResizerModal } from './UTIPanResizerModal';
import { FormAttachmentImageCard } from './FormAttachmentImageCard';
import { FormAttachmentDocumentCard } from './FormAttachmentDocumentCard';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';
import { PortalServiceManager } from './PortalServiceManager';
import { uploadFileToServer } from '../utils/upload';
import { getFormFieldLabel, getFilteredFormDataEntries, getRequestPdfUrl, cleanAdminRemarks } from '../utils/formUtils';
import { 
  ArrowUp,
  ArrowDown,
  Sparkles, 
  Crop,
  Users, 
  Clock, 
  CheckCircle2, 
  Check,
  XCircle, 
  AlertCircle,
  IndianRupee, 
  ShieldCheck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  MessageCircle,
  Percent,
  FileText, 
  Send,
  Loader2,
  Activity,
  QrCode,
  RefreshCw,
  Upload,
  Clipboard,
  Image as ImageIcon,
  MapPin,
  Building,
  Globe,
  Eye,
  Download,
  Settings,
  Phone,
  X,
  Filter,
  Database,
  FileJson,
  LogIn,
  CheckSquare,
  PhoneCall,
  UserCheck,
  Printer,
  Copy,
  Car,
  Zap,
  LifeBuoy
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenNewServiceLaunch: () => void;
  onOpenChat: (request: ServiceRequest) => void;
  initialTab?: 'requests' | 'services' | 'retailers' | 'topups' | 'blockRates' | 'supportChats' | 'settings' | 'walletHistory' | 'operators' | 'mobileLookup';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenNewServiceLaunch,
  onOpenChat,
  initialTab
}) => {
  const { allUsers, refreshUser, loginAs } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'services' | 'retailers' | 'topups' | 'blockRates' | 'supportChats' | 'settings' | 'walletHistory' | 'operators' | 'mobileLookup' | 'publicServices'>(initialTab || 'requests');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    try {
      const cached = localStorage.getItem('ecyber_cached_admin_requests');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [services, setServices] = useState<CitizenService[]>(() => {
    return getServicesWithRecoveryCheck() || [];
  });
  const [topupRequests, setTopupRequests] = useState<any[]>([]);
  const [blockRates, setBlockRates] = useState<BlockApplicationRate[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('ALL');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPanResizerOpen, setIsPanResizerOpen] = useState(false);
  const [panResizerRequest, setPanResizerRequest] = useState<ServiceRequest | null>(null);
  const [panResizerInitialImage, setPanResizerInitialImage] = useState<string | null>(null);

  // Wallet History & Operator State
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletSearch, setWalletSearch] = useState('');
  const [walletTypeFilter, setWalletTypeFilter] = useState('ALL');

  // Operator Management State
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<User | null>(null);
  const [opName, setOpName] = useState('');
  const [opMobile, setOpMobile] = useState('');
  const [opPassword, setOpPassword] = useState('123456');
  const [opLabel, setOpLabel] = useState('');
  const [opAssignedServices, setOpAssignedServices] = useState<string[]>([]);
  const [opQuickChats, setOpQuickChats] = useState<string[]>([
    'server down hai',
    'finger lagao',
    'otp',
    'document complete',
    'processing started',
    'done'
  ]);
  const [newOpQuickChatInput, setNewOpQuickChatInput] = useState('');

  // Modals without native prompt/alert/confirm (Works seamlessly in iframe preview)
  const [noticeModalService, setNoticeModalService] = useState<CitizenService | null>(null);
  const [noticeInputText, setNoticeInputText] = useState('');
  const [priorityModalService, setPriorityModalService] = useState<CitizenService | null>(null);
  const [priorityInputVal, setPriorityInputVal] = useState('1');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Settings State
  const [signupBonus, setSignupBonus] = useState<number>(200);
  const [enableBonus, setEnableBonus] = useState<boolean>(true);
  const [enableDistributorReg, setEnableDistributorReg] = useState<boolean>(true);
  const [distributorCommissionPercent, setDistributorCommissionPercent] = useState<number>(2.0);
  const [portalName, setPortalName] = useState('eCyberCafe.in');
  const [supportHelpline, setSupportHelpline] = useState('0000000000');
  const [supportWhatsapp, setSupportWhatsapp] = useState('0000000000');
  const [telegramChannel, setTelegramChannel] = useState('https://t.me/eCyberCafeOfficial');
  const [isSavingPortalSettings, setIsSavingPortalSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // WhatsApp Integration State
  const [waToken, setWaToken] = useState('7a9a87b011a5ec92a63c57b895bad04e71af037254002adb');
  const [waSessionId, setWaSessionId] = useState('u439_Cyberacfe');
  const [waPortalUrl, setWaPortalUrl] = useState('');
  const [waEnabled, setWaEnabled] = useState(true);
  const [waTestPhone, setWaTestPhone] = useState('0000000000');
  const [waTestMsg, setWaTestMsg] = useState('Hello! 🧪 Test WhatsApp update from eCyberCafe Portal.');
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [waStatusMsg, setWaStatusMsg] = useState<string | null>(null);

  // Telegram Group & Channel Alert State
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgAlertsEnabled, setTgAlertsEnabled] = useState(true);
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [tgStatusMsg, setTgStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // WhatsApp Completion Feedback Modal State
  const [waNotificationNotice, setWaNotificationNotice] = useState<{
    show: boolean;
    status: string;
    whatsappSent: boolean;
    phone: string;
    directUrl: string;
    serviceTitle: string;
    requestNumber: number;
  } | null>(null);

  // Aadhaar to PAN Find API State
  const [panApiKey, setPanApiKey] = useState('AK474217');
  const [panSecretKey, setPanSecretKey] = useState('');
  const [panApiUrl, setPanApiUrl] = useState('https://api-domain.com/api/v12/pan-find.php');
  const [panAutoProcess, setPanAutoProcess] = useState(true);
  const [isSavingPanConfig, setIsSavingPanConfig] = useState(false);
  const [panConfigMsg, setPanConfigMsg] = useState<string | null>(null);
  const [panTestAadhaar, setPanTestAadhaar] = useState('');
  const [isTestingPanApi, setIsTestingPanApi] = useState(false);
  const [panTestResult, setPanTestResult] = useState<any | null>(null);

  // Mobile Details Find API State
  const [mobileApiKey, setMobileApiKey] = useState('AK474079');
  const [mobileApiUrl, setMobileApiUrl] = useState('https://api-domain.com/api/v2/mobil_info.php');
  const [mobileAutoProcess, setMobileAutoProcess] = useState(true);
  const [mobileAdminOnly, setMobileAdminOnly] = useState(true);
  const [isSavingMobileConfig, setIsSavingMobileConfig] = useState(false);
  const [mobileConfigMsg, setMobileConfigMsg] = useState<string | null>(null);

  // RC Print Verification API State
  const [rcApiKey, setRcApiKey] = useState('AK474217');
  const [rcApiUrl, setRcApiUrl] = useState('https://api-domain.com/api/v1/rc_print.php');
  const [rcAutoProcess, setRcAutoProcess] = useState(true);
  const [isSavingRcConfig, setIsSavingRcConfig] = useState(false);
  const [rcConfigMsg, setRcConfigMsg] = useState<string | null>(null);
  const [rcTestNo, setRcTestNo] = useState('');
  const [isTestingRcApi, setIsTestingRcApi] = useState(false);
  const [rcTestResult, setRcTestResult] = useState<any | null>(null);

  // Voter Mobile Link Without OTP API State
  const [voterApiKey, setVoterApiKey] = useState('532a23eee523fb97e7ecd64e37b51bf3');
  const [voterUserId, setVoterUserId] = useState('709136152');
  const [voterApiUrl, setVoterApiUrl] = useState('https://myprints.co.in/api/voter/voter_link_withoutOTP_Instant.php');
  const [voterStatusUrl, setVoterStatusUrl] = useState('https://myprints.co.in/api/voter/voter_link_chekStstus.php');
  const [voterAutoProcess, setVoterAutoProcess] = useState(true);
  const [isSavingVoterConfig, setIsSavingVoterConfig] = useState(false);
  const [voterConfigMsg, setVoterConfigMsg] = useState<string | null>(null);
  const [voterTestEpic, setVoterTestEpic] = useState('XXZ4596585');
  const [voterTestMobile, setVoterTestMobile] = useState('6200687014');
  const [isTestingVoterApi, setIsTestingVoterApi] = useState(false);
  const [isCheckingVoterStatus, setIsCheckingVoterStatus] = useState(false);
  const [voterTestResult, setVoterTestResult] = useState<any | null>(null);

  // Mobile Finder Instant Tool State
  const [mobileSearchNum, setMobileSearchNum] = useState('');
  const [isSearchingMobile, setIsSearchingMobile] = useState(false);
  const [mobileSearchResult, setMobileSearchResult] = useState<any | null>(null);
  const [mobileSearchErr, setMobileSearchErr] = useState<string | null>(null);
  const [mobileSearchHistory, setMobileSearchHistory] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'mobileLookup') {
      fetch('/api/admin/whatsapp/config')
        .then(res => safeJson(res))
        .then(data => {
          if (!data) return;
          if (data.token) setWaToken(data.token);
          if (data.sessionId) setWaSessionId(data.sessionId);
          if (typeof data.portalUrl === 'string') setWaPortalUrl(data.portalUrl);
          if (typeof data.enabled === 'boolean') setWaEnabled(data.enabled);
        })
        .catch(() => {});

      fetch('/api/admin/telegram/config')
        .then(res => safeJson(res))
        .then(data => {
          if (!data) return;
          if (data.botToken !== undefined) setTgBotToken(data.botToken);
          if (data.chatId !== undefined) setTgChatId(data.chatId);
          if (data.enabled !== undefined) setTgAlertsEnabled(data.enabled);
          if (data.channelUrl) setTelegramChannel(data.channelUrl);
        })
        .catch(() => {});

      fetch('/api/admin/panfind-config')
        .then(res => safeJson(res))
        .then(data => {
          if (!data) return;
          if (data.apiKey) setPanApiKey(data.apiKey);
          if (data.secretKey) setPanSecretKey(data.secretKey);
          if (data.apiUrl) setPanApiUrl(data.apiUrl);
          if (typeof data.autoProcessOnSubmit === 'boolean') setPanAutoProcess(data.autoProcessOnSubmit);
        })
        .catch(() => {});

      fetch('/api/admin/mobile-info-config')
        .then(res => safeJson(res))
        .then(data => {
          if (!data) return;
          if (data.apiKey) setMobileApiKey(data.apiKey);
          if (data.apiUrl) setMobileApiUrl(data.apiUrl);
          if (typeof data.autoProcessOnSubmit === 'boolean') setMobileAutoProcess(data.autoProcessOnSubmit);
          if (typeof data.adminOnly === 'boolean') setMobileAdminOnly(data.adminOnly);
        })
        .catch(() => {});

      fetch('/api/admin/rc-print-config')
        .then(res => safeJson(res))
        .then(data => {
          if (!data) return;
          if (data.apiKey) setRcApiKey(data.apiKey);
          if (data.apiUrl) setRcApiUrl(data.apiUrl);
          if (typeof data.autoProcessOnSubmit === 'boolean') setRcAutoProcess(data.autoProcessOnSubmit);
        })
        .catch(() => {});

      fetch('/api/admin/voter-link-config')
        .then(res => safeJson(res))
        .then(data => {
          if (!data) return;
          if (data.apiKey) setVoterApiKey(data.apiKey);
          if (data.userId) setVoterUserId(data.userId);
          if (data.apiUrl) setVoterApiUrl(data.apiUrl);
          if (data.statusUrl) setVoterStatusUrl(data.statusUrl);
          if (typeof data.autoProcessOnSubmit === 'boolean') setVoterAutoProcess(data.autoProcessOnSubmit);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const handleSaveVoterConfig = async () => {
    setIsSavingVoterConfig(true);
    setVoterConfigMsg(null);
    try {
      const res = await fetch('/api/admin/voter-link-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: voterApiKey,
          userId: voterUserId,
          apiUrl: voterApiUrl,
          statusUrl: voterStatusUrl,
          autoProcessOnSubmit: voterAutoProcess
        })
      });
      const data = await res.json();
      if (data.success) {
        setVoterConfigMsg('✅ Voter Mobile Link API configuration saved successfully!');
      } else {
        setVoterConfigMsg(`❌ ${data.error || 'Failed to save Voter Mobile Link config'}`);
      }
    } catch (e) {
      setVoterConfigMsg('❌ Network error saving Voter Mobile Link API config.');
    } finally {
      setIsSavingVoterConfig(false);
    }
  };

  const handleTestVoterLink = async () => {
    if (!voterTestEpic || !voterTestMobile) {
      alert('Please enter both Voter EPIC Number and Mobile Number for testing.');
      return;
    }
    setIsTestingVoterApi(true);
    setVoterTestResult(null);
    try {
      const res = await fetch('/api/voter-link/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: voterTestEpic,
          mobileNumber: voterTestMobile
        })
      });
      const data = await res.json();
      setVoterTestResult(data);
    } catch (e: any) {
      setVoterTestResult({ success: false, error: e.message || 'API Test Failed' });
    } finally {
      setIsTestingVoterApi(false);
    }
  };

  const handleCheckVoterStatus = async () => {
    if (!voterTestEpic) {
      alert('Please enter Voter EPIC Number for status check.');
      return;
    }
    setIsCheckingVoterStatus(true);
    setVoterTestResult(null);
    try {
      const res = await fetch('/api/voter-link/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: voterTestEpic
        })
      });
      const data = await res.json();
      setVoterTestResult(data);
    } catch (e: any) {
      setVoterTestResult({ success: false, error: e.message || 'Status Check Failed' });
    } finally {
      setIsCheckingVoterStatus(false);
    }
  };

  const handleSaveRcConfig = async () => {
    setIsSavingRcConfig(true);
    setRcConfigMsg(null);
    try {
      const res = await fetch('/api/admin/rc-print-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: rcApiKey,
          apiUrl: rcApiUrl,
          autoProcessOnSubmit: rcAutoProcess
        })
      });
      const data = await res.json();
      if (data.success) {
        setRcConfigMsg('✅ Vehicle RC Print API configuration saved successfully!');
      } else {
        setRcConfigMsg(`❌ ${data.error || 'Failed to save RC Print config'}`);
      }
    } catch (e) {
      setRcConfigMsg('❌ Network error saving RC Print API config.');
    } finally {
      setIsSavingRcConfig(false);
    }
  };

  const handleTestRcApi = async () => {
    if (!rcTestNo || rcTestNo.trim().length < 5) {
      alert('Please enter a valid Vehicle RC Number (e.g. UP32CM4081)');
      return;
    }
    setIsTestingRcApi(true);
    setRcTestResult(null);
    try {
      const res = await fetch('/api/rcprint/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rcno: rcTestNo.trim() })
      });
      const data = await res.json();
      setRcTestResult(data);
    } catch (e: any) {
      setRcTestResult({ success: false, error: e.message || 'Network error test request failed' });
    } finally {
      setIsTestingRcApi(false);
    }
  };

  const handleSaveMobileConfig = async () => {
    setIsSavingMobileConfig(true);
    setMobileConfigMsg(null);
    try {
      const res = await fetch('/api/admin/mobile-info-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: mobileApiKey,
          apiUrl: mobileApiUrl,
          autoProcessOnSubmit: mobileAutoProcess,
          adminOnly: mobileAdminOnly
        })
      });
      const data = await res.json();
      if (data.success) {
        setMobileConfigMsg('✅ Mobile Details Find API configuration saved!');
      } else {
        setMobileConfigMsg(`❌ ${data.error || 'Failed to save config'}`);
      }
    } catch (e) {
      setMobileConfigMsg('❌ Network error saving Mobile Info API config.');
    } finally {
      setIsSavingMobileConfig(false);
    }
  };

  const handleSearchMobileInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNum = mobileSearchNum.replace(/\D/g, '');
    if (cleanNum.length < 10) {
      setMobileSearchErr('कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें (10-Digit Mobile Number required)');
      return;
    }
    setIsSearchingMobile(true);
    setMobileSearchErr(null);
    setMobileSearchResult(null);
    try {
      const res = await fetch('/api/mobileinfo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: cleanNum })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMobileSearchResult(data);
        setMobileSearchHistory(prev => [
          { mobile: cleanNum, owner: data.data?.owner_name, time: new Date().toLocaleTimeString('en-IN') },
          ...prev.filter(h => h.mobile !== cleanNum)
        ]);
      } else {
        const rawErr = data.error || data.message || 'विवरण नहीं मिल सका। कृपया मोबाइल नंबर जांचें।';
        const cleanErr = String(rawErr).replace(/<[^>]*>/g, '').trim();
        setMobileSearchErr(cleanErr);
      }
    } catch (err: any) {
      setMobileSearchErr('सर्वर नेटवर्क एरर। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSearchingMobile(false);
    }
  };

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWa(true);
    setWaStatusMsg(null);
    try {
      const res = await fetch('/api/admin/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: waToken, sessionId: waSessionId, portalUrl: waPortalUrl, enabled: waEnabled }),
      });
      const data = await res.json();
      if (typeof data.portalUrl === 'string') setWaPortalUrl(data.portalUrl);
      setWaStatusMsg(`✅ WhatsApp Settings & Website Portal Link saved successfully! (${data.portalUrl ? data.portalUrl : 'Auto-detected website URL active'})`);
    } catch (err) {
      setWaStatusMsg('❌ Error saving WhatsApp settings.');
    } finally {
      setIsSavingWa(false);
    }
  };

  const handleSaveTelegramConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingTg(true);
    setTgStatusMsg(null);
    try {
      const res = await fetch('/api/admin/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tgBotToken,
          chatId: tgChatId,
          enabled: tgAlertsEnabled,
          channelUrl: telegramChannel,
        })
      });
      const data = await safeJson(res);
      if (res.ok && data?.success) {
        setTgStatusMsg({ type: 'success', message: '✅ Telegram Group & Channel Alert settings saved successfully!' });
      } else {
        setTgStatusMsg({ type: 'error', message: data?.message || '❌ Failed to save Telegram settings.' });
      }
    } catch (err: any) {
      setTgStatusMsg({ type: 'error', message: err.message || '❌ Error saving Telegram settings.' });
    } finally {
      setIsSavingTg(false);
    }
  };

  const handleTestTelegramAlert = async () => {
    setIsTestingTg(true);
    setTgStatusMsg(null);
    try {
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tgBotToken,
          chatId: tgChatId,
        })
      });
      const data = await safeJson(res);
      if (res.ok && data?.success) {
        setTgStatusMsg({ type: 'success', message: '🎉 Test alert sent successfully to Telegram Group/Channel!' });
      } else {
        setTgStatusMsg({ type: 'error', message: data?.message || '❌ Failed to send test message to Telegram.' });
      }
    } catch (err: any) {
      setTgStatusMsg({ type: 'error', message: err.message || '❌ Connection error to Telegram.' });
    } finally {
      setIsTestingTg(false);
    }
  };

  const handleSavePanConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPanConfig(true);
    setPanConfigMsg(null);
    try {
      const res = await fetch('/api/admin/panfind-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: panApiKey,
          secretKey: panSecretKey,
          apiUrl: panApiUrl,
          autoProcessOnSubmit: panAutoProcess
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPanConfigMsg('✅ Aadhaar to PAN Find API configuration (APIAdda) saved successfully!');
      } else {
        setPanConfigMsg(`❌ ${data.error || 'Failed to save PAN Find API config'}`);
      }
    } catch (err) {
      setPanConfigMsg('❌ Network error saving PAN Find API config.');
    } finally {
      setIsSavingPanConfig(false);
    }
  };

  const handleTestPanApi = async () => {
    const clean = panTestAadhaar.replace(/\D/g, '');
    if (clean.length !== 12) {
      alert('Please enter a valid 12-digit Aadhaar number for testing!');
      return;
    }
    setIsTestingPanApi(true);
    setPanTestResult(null);
    try {
      const res = await fetch('/api/panfind/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar: clean })
      });
      const data = await res.json();
      setPanTestResult(data);
    } catch (err: any) {
      setPanTestResult({ success: false, error: err.message || 'Connection error' });
    } finally {
      setIsTestingPanApi(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!waTestPhone) {
      alert('Please enter a target 10-digit mobile number for test message.');
      return;
    }
    setIsTestingWa(true);
    setWaStatusMsg(null);
    try {
      const res = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: waTestPhone, message: waTestMsg }),
      });
      const data = await res.json();
      if (data.success) {
        setWaStatusMsg(`✅ Test WhatsApp message dispatched to +${data.targetNumber}! Response: ${JSON.stringify(data.apiResult)}`);
      } else {
        setWaStatusMsg(`⚠️ WhatsApp API responded: ${JSON.stringify(data.apiResult || data)}`);
      }
    } catch (err: any) {
      setWaStatusMsg(`❌ Error sending WhatsApp message: ${err.message}`);
    } finally {
      setIsTestingWa(false);
    }
  };

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [userStateFilter, setUserStateFilter] = useState('ALL');
  const [userDistrictFilter, setUserDistrictFilter] = useState('ALL');
  const [userBlockFilter, setUserBlockFilter] = useState('ALL');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Available districts for filter based on selected userStateFilter
  const availableDistrictsForFilter = React.useMemo(() => {
    let districts: string[] = [];
    if (userStateFilter === 'Bihar' || userStateFilter === 'ALL') {
      districts = [...BIHAR_DISTRICTS];
    }
    allUsers.forEach((u) => {
      if (
        u.district &&
        (userStateFilter === 'ALL' || (u.state || '').toLowerCase() === userStateFilter.toLowerCase())
      ) {
        if (!districts.includes(u.district)) {
          districts.push(u.district);
        }
      }
    });
    return districts.sort();
  }, [allUsers, userStateFilter]);

  // Available blocks for filter based on selected userDistrictFilter
  const availableBlocksForFilter = React.useMemo(() => {
    let blocks: string[] = [];
    if (userDistrictFilter !== 'ALL' && BIHAR_BLOCKS[userDistrictFilter]) {
      blocks = [...BIHAR_BLOCKS[userDistrictFilter]];
    } else if (userDistrictFilter === 'ALL') {
      Object.values(BIHAR_BLOCKS).forEach((blkList: string[]) => {
        blkList.forEach((b: string) => {
          if (!blocks.includes(b)) blocks.push(b);
        });
      });
    }
    allUsers.forEach((u) => {
      if (
        u.block &&
        (userDistrictFilter === 'ALL' || (u.district || '').toLowerCase() === userDistrictFilter.toLowerCase())
      ) {
        if (!blocks.includes(u.block)) {
          blocks.push(u.block);
        }
      }
    });
    return blocks.sort();
  }, [allUsers, userDistrictFilter]);

  // User Form State
  const [uName, setUName] = useState('');
  const [uStoreName, setUStoreName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uMobile, setUMobile] = useState('');
  const [uPassword, setUPassword] = useState('123456');
  const [uRole, setURole] = useState<UserRole>('RETAILER');
  const [uWallet, setUWallet] = useState(200);
  const [uState, setUState] = useState('');
  const [uDistrict, setUDistrict] = useState('');
  const [uBlock, setUBlock] = useState('');
  const [uAssignedServices, setUAssignedServices] = useState<string[]>([]);
  const [uServiceAccessMode, setUServiceAccessMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [userErr, setUserErr] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleUStateChange = (st: string) => {
    setUState(st);
    setUDistrict('');
    setUBlock('');
  };

  const handleUDistrictChange = (dist: string) => {
    setUDistrict(dist);
    setUBlock('');
  };

  // User Wallet Adjustment Modal State
  const [adjustingWalletUser, setAdjustingWalletUser] = useState<User | null>(null);
  const [walletAdjType, setWalletAdjType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [walletAdjAmount, setWalletAdjAmount] = useState<number>(100);
  const [walletAdjRemarks, setWalletAdjRemarks] = useState('Admin Manual Adjustment');
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);
  const [walletAdjErr, setWalletAdjErr] = useState<string | null>(null);
  const [walletAdjSuccess, setWalletAdjSuccess] = useState<string | null>(null);

  // Block Rate Management State
  const [blockRateSearch, setBlockRateSearch] = useState('');
  const [showAddBlockRateModal, setShowAddBlockRateModal] = useState(false);
  const [editingBlockRate, setEditingBlockRate] = useState<BlockApplicationRate | null>(null);
  const [rateFormState, setRateFormState] = useState('Bihar');
  const [rateFormDistrict, setRateFormDistrict] = useState('Gaya');
  const [rateFormBlock, setRateFormBlock] = useState('Konch');
  const [rateFormPrefix, setRateFormPrefix] = useState('BICCO');
  const [rateFormPrice, setRateFormPrice] = useState<number>(50);
  const [rateFormLabel, setRateFormLabel] = useState('BICCO Application');
  const [rateFormNotes, setRateFormNotes] = useState('');
  const [isSavingBlockRate, setIsSavingBlockRate] = useState(false);
  const [blockRateMsg, setBlockRateMsg] = useState<string | null>(null);

  // Status Modal State
  const [selectedReq, setSelectedReq] = useState<ServiceRequest | null>(null);
  const [updateStatus, setUpdateStatus] = useState('COMPLETED');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [outputUrl, setOutputUrl] = useState('');
  const [refundFee, setRefundFee] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDeletingReqId, setIsDeletingReqId] = useState<string | null>(null);
  const [reqToDelete, setReqToDelete] = useState<{ id: string; requestNumber?: number } | null>(null);

  const handleDeleteRequest = (requestId: string, requestNumber?: number) => {
    setReqToDelete({ id: requestId, requestNumber });
  };

  const executeDeleteRequest = async (requestId: string, requestNumber?: number) => {
    setIsDeletingReqId(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('app_toast', { detail: `🎉 Request #${requestNumber || ''} successfully deleted.` }));
        setReqToDelete(null);
        setSelectedReq(null);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent('app_toast', { detail: `❌ Delete failed: ${data.error || 'Server error'}` }));
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('app_toast', { detail: `❌ Delete failed: ${err.message || 'Connection error'}` }));
    } finally {
      setIsDeletingReqId(null);
    }
  };

  // TopUp Reject Modal State
  const [rejectingTopupReq, setRejectingTopupReq] = useState<any | null>(null);
  const [topupRejectRemarks, setTopupRejectRemarks] = useState('Payment verification failed / Invalid UTR');

  // Edit Service Price Modal State
  const [editingService, setEditingService] = useState<CitizenService | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<{ url: string; title: string; filename?: string } | null>(null);

  // Payment QR & UPI Config State
  const [paymentSettings, setPaymentSettings] = useState<{
    upiId: string;
    payeeName: string;
    qrImageUrl: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    instructionText?: string;
    gatewayToken?: string;
    gatewayWebsiteUrl?: string;
    gatewayCreateOrderUrl?: string;
    gatewayCheckStatusUrl?: string;
    gatewayProviderName?: string;
    enableAutoGateway?: boolean;
  }>({
    upiId: 'ecybercafe@upi',
    payeeName: 'eCyberCafe Digital Services',
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=ecybercafe@upi%26pn=eCyberCafe%26cu=INR',
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
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showQrConfig, setShowQrConfig] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/admin/payment-settings');
      if (res.ok) setPaymentSettings(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data.settings);
        setSettingsSuccessMsg('✅ Payment QR & UPI ID configuration saved successfully!');
        setTimeout(() => setSettingsSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchSupportUnreadCount = async () => {
    try {
      const res = await fetch('/api/admin/support-threads');
      if (res.ok) {
        const threads = await res.json();
        const unread = threads.reduce((acc: number, t: any) => acc + (t.unreadCount || 0), 0);
        setUnreadSupportCount(unread);
      }
    } catch (e) {
      console.error('Error fetching support unread count:', e);
    }
  };

  const fetchPortalSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSignupBonus(data.signupBonus ?? 200);
        setEnableBonus(data.enableSignupBonus ?? true);
        setEnableDistributorReg(data.enableDistributorRegistration ?? true);
        setDistributorCommissionPercent(data.distributorCommissionPercent ?? 2.0);
        setPortalName(data.portalName || 'eCyberCafe.in');
        setSupportHelpline(data.supportHelpline || '0000000000');
        setSupportWhatsapp(data.supportWhatsapp || '0000000000');
        setTelegramChannel(data.telegramChannel || 'https://t.me/eCyberCafeOfficial');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePortalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPortalSettings(true);
    setSettingsMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupBonus,
          enableSignupBonus: enableBonus,
          enableDistributorRegistration: enableDistributorReg,
          distributorCommissionPercent,
          portalName,
          supportHelpline,
          supportWhatsapp,
          telegramChannel
        })
      });
      if (res.ok) {
        setSettingsMsg('🎉 Portal Settings, Distributor Commission Rate & Signup Bonus configuration updated successfully!');
        setTimeout(() => setSettingsMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingPortalSettings(false);
    }
  };

  const fetchData = async (showFullLoading = false) => {
    if (showFullLoading && requests.length === 0 && services.length === 0) {
      setIsLoading(true);
    }
    try {
      const [
        reqsRes,
        srvsRes,
        statsRes,
        topupsRes,
        ratesRes,
        walletTxsRes,
        payRes,
        settingsRes,
        supportRes
      ] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/services'),
        fetch('/api/stats'),
        fetch('/api/wallet/topup-requests'),
        fetch('/api/block-rates'),
        fetch('/api/wallet/transactions'),
        fetch('/api/admin/payment-settings'),
        fetch('/api/settings'),
        fetch('/api/admin/support-threads')
      ]);

      if (reqsRes.ok) {
        const fetchedReqs = (await safeJson(reqsRes)) || [];
        setRequests(fetchedReqs);
        try {
          localStorage.setItem('ecyber_cached_admin_requests', JSON.stringify(fetchedReqs));
        } catch (e) {}
      }
      if (srvsRes.ok) {
        const fetchedSrvs = (await safeJson(srvsRes)) || [];
        const syncedSrvs = await syncServicesWithServerIfNeeded(fetchedSrvs);
        setServices(syncedSrvs);
      } else {
        const recovered = getServicesWithRecoveryCheck();
        if (recovered) setServices(recovered);
      }
      if (statsRes.ok) setStats((await safeJson(statsRes)) || stats);
      if (topupsRes.ok) setTopupRequests((await safeJson(topupsRes)) || []);
      if (ratesRes.ok) setBlockRates((await safeJson(ratesRes)) || []);
      if (walletTxsRes.ok) setWalletTransactions((await safeJson(walletTxsRes)) || []);
      if (payRes.ok) {
        const payData = await safeJson(payRes);
        if (payData) setPaymentSettings(payData);
      }
      if (settingsRes.ok) {
        const data = await safeJson(settingsRes);
        if (data) {
          setSignupBonus(data.signupBonus ?? 200);
          setEnableBonus(data.enableSignupBonus ?? true);
          setEnableDistributorReg(data.enableDistributorRegistration ?? true);
          setPortalName(data.portalName || 'eCyberCafe.in');
          setSupportHelpline(data.supportHelpline || '0000000000');
          setSupportWhatsapp(data.supportWhatsapp || '0000000000');
          setTelegramChannel(data.telegramChannel || 'https://t.me/eCyberCafeOfficial');
        }
      }
      if (supportRes.ok) {
        const threads = (await safeJson(supportRes)) || [];
        const unread = threads.reduce((acc: number, t: any) => acc + (t.unreadCount || 0), 0);
        setUnreadSupportCount(unread);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUName('');
    setUStoreName('');
    setUEmail('');
    setUMobile('');
    setUPassword('123456');
    setURole('RETAILER');
    setUWallet(200);
    setUState('');
    setUDistrict('');
    setUBlock('');
    setUAssignedServices([]);
    setUServiceAccessMode('ALL');
    setUserErr(null);
    setUserMsg(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUName(u.name);
    setUStoreName(u.storeName || '');
    setUEmail(u.email);
    setUMobile(u.mobileNumber || '');
    setUPassword(u.password || '123456');
    setURole(u.role);
    setUWallet(u.walletBalance);
    setUState(u.state || '');
    setUDistrict(u.district || '');
    setUBlock(u.block || '');
    const assigned = u.assignedServiceIds || [];
    setUAssignedServices(assigned);
    if (assigned.length > 0 && !assigned.includes('*')) {
      setUServiceAccessMode('CUSTOM');
    } else {
      setUServiceAccessMode('ALL');
    }
    setUserErr(null);
    setUserMsg(null);
    setShowUserModal(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErr(null);
    setUserMsg(null);

    if (!uName.trim()) {
      setUserErr('Full Name is required.');
      return;
    }
    if (!uMobile.trim() || uMobile.trim().length < 10) {
      setUserErr('Valid 10-digit Mobile Number is required.');
      return;
    }
    if (uState === 'Bihar') {
      if (!uDistrict) {
        setUserErr('Please select Bihar District.');
        return;
      }
      if (!uBlock) {
        setUserErr('Please select Bihar Block.');
        return;
      }
    }

    setIsSavingUser(true);
    try {
      const isEdit = Boolean(editingUser);
      const url = isEdit ? `/api/admin/users/${editingUser?.id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const finalAssigned = uServiceAccessMode === 'ALL' ? ['*'] : uAssignedServices;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uName.trim(),
          storeName: uStoreName.trim(),
          email: uEmail.trim(),
          mobileNumber: uMobile.trim(),
          password: uPassword.trim(),
          role: uRole,
          walletBalance: uWallet,
          state: uState,
          district: uState === 'Bihar' ? uDistrict : '',
          block: uState === 'Bihar' ? uBlock : '',
          assignedServiceIds: finalAssigned
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUserMsg(`User ${isEdit ? 'updated' : 'created'} successfully!`);
        setTimeout(() => {
          setShowUserModal(false);
          setUserMsg(null);
        }, 800);
        refreshUser();
      } else {
        setUserErr(data.error || 'Operation failed.');
      }
    } catch (err: any) {
      setUserErr(err.message || 'Server error.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleBlockUser = async (u: User) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}/toggle-block`, { method: 'PATCH' });
      if (res.ok) {
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjustWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingWalletUser) return;
    setIsAdjustingWallet(true);
    setWalletAdjErr(null);
    setWalletAdjSuccess(null);
    try {
      const token = localStorage.getItem('ecyber_session_token');
      const res = await fetch(`/api/admin/users/${adjustingWalletUser.id}/adjust-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}`, 'X-Session-Token': token } : {})
        },
        body: JSON.stringify({
          type: walletAdjType,
          amount: Number(walletAdjAmount),
          remarks: walletAdjRemarks
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setWalletAdjSuccess(data.message || 'Wallet adjusted successfully!');
        fetchData();
        refreshUser();
        setTimeout(() => {
          setAdjustingWalletUser(null);
          setWalletAdjSuccess(null);
        }, 1200);
      } else {
        setWalletAdjErr(data.error || 'Failed to adjust wallet. Please check admin permissions.');
      }
    } catch (e: any) {
      console.error(e);
      setWalletAdjErr(e.message || 'Server error while adjusting wallet.');
    } finally {
      setIsAdjustingWallet(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    setDeleteConfirmModal({
      title: 'Delete User Account',
      message: `Are you sure you want to delete retailer "${u.name}" (${u.mobileNumber})?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
          if (res.ok) {
            refreshUser();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  useEffect(() => {
    fetchData(true);

    // Attach Realtime Firestore subscription for instant, un-resettable service sync
    const unsubscribeFirestore = subscribeToFirestoreServices((liveSrvs) => {
      if (Array.isArray(liveSrvs) && liveSrvs.length > 0) {
        setServices(liveSrvs);
      }
    });

    const unsubscribeRealtime = realtimeClient.subscribe((payload) => {
      try {
        if (
          payload.type === 'SUPPORT_CHAT_MESSAGE' ||
          payload.type === 'SUPPORT_CHAT_READ' ||
          payload.type === 'CHAT_MESSAGE_SENT' ||
          payload.type === 'REQUEST_CREATED' ||
          payload.type === 'REQUEST_SUBMITTED' ||
          payload.type === 'REQUEST_STATUS_UPDATED' ||
          payload.type === 'STATUS_UPDATED' ||
          payload.type === 'REQUEST_CLAIMED' ||
          payload.type === 'SETTINGS_UPDATED'
        ) {
          fetchData(false);
        }
      } catch (e) {
        console.error('SSE Error:', e);
      }
    });

    return () => {
      unsubscribeRealtime();
      unsubscribeFirestore();
    };
  }, []);

  const fetchBlockRates = async () => {
    try {
      const res = await fetch('/api/block-rates');
      if (res.ok) setBlockRates(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBlockRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBlockRate(true);
    try {
      const isEdit = Boolean(editingBlockRate);
      const url = isEdit ? `/api/block-rates/${editingBlockRate?.id}` : '/api/block-rates';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: rateFormState,
          district: rateFormDistrict,
          block: rateFormBlock,
          appPrefix: rateFormPrefix,
          appTypeLabel: rateFormLabel || `${rateFormPrefix} Application`,
          price: Number(rateFormPrice),
          notes: rateFormNotes
        })
      });

      if (res.ok) {
        setBlockRateMsg(`Block rate ${isEdit ? 'updated' : 'added'} successfully!`);
        setTimeout(() => setBlockRateMsg(null), 3000);
        setShowAddBlockRateModal(false);
        setEditingBlockRate(null);
        fetchBlockRates();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingBlockRate(false);
    }
  };

  const handleQuickUpdatePrice = async (id: string, newPrice: number) => {
    try {
      const res = await fetch(`/api/block-rates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(newPrice) })
      });
      if (res.ok) {
        fetchBlockRates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBlockRate = (id: string) => {
    setDeleteConfirmModal({
      title: 'Delete Block Rate Rule',
      message: 'Are you sure you want to delete this block rate rule?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/block-rates/${id}`, { method: 'DELETE' });
          if (res.ok) fetchBlockRates();
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleTopupAction = async (id: string, action: 'APPROVE' | 'REJECT', remarks?: string) => {
    try {
      const res = await fetch(`/api/wallet/topup-requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminRemarks: remarks }),
      });
      if (res.ok) {
        fetchData();
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for global Ctrl+V image or file clipboard paste when status modal is active
  useEffect(() => {
    if (!selectedReq) return;

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' || item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setPasteToast(`⏳ Uploading pasted file...`);
            try {
              const res = await uploadFileToServer(file);
              setOutputUrl(res.url);
              setPasteToast(`📋 Uploaded: ${file.name || 'Pasted File'}`);
              setTimeout(() => setPasteToast(null), 4000);
            } catch (err: any) {
              setPasteToast(`❌ Upload failed: ${err.message || 'Error'}`);
              setTimeout(() => setPasteToast(null), 5000);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [selectedReq]);

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (updateStatus === 'REJECTED' && (!adminRemarks || !adminRemarks.trim())) {
      alert('⚠️ Rejection Reason Required / रिजेक्शन का कारण अनिवार्य है!\n\n(कृपया रिजेक्ट करने का कारण Remarks में लिखें, जैसे: "फोटो स्पष्ट नहीं है", "दस्तावेज़ गलत है", आदि).');
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/requests/${selectedReq.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updateStatus,
          adminRemarks: adminRemarks || (updateStatus === 'COMPLETED' ? 'Done' : `Status updated to ${updateStatus}`),
          outputAttachmentUrl: outputUrl || undefined,
          shouldRefundFee: refundFee
        })
      });

      if (res.ok) {
        setSelectedReq(null);
        fetchData();
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveServicePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const res = await fetch(`/api/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: editPrice
        })
      });

      if (res.ok) {
        setEditingService(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateServiceField = async (service: CitizenService, updateData: Partial<CitizenService>) => {
    try {
      await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      fetchData();
      window.dispatchEvent(new Event('services_updated'));
    } catch (e) {
      console.error('Error updating service field:', e);
    }
  };

  const handleToggleServiceActive = async (service: CitizenService) => {
    await handleUpdateServiceField(service, { isActive: !service.isActive });
  };

  const handleToggleFlowType = async (service: CitizenService) => {
    const nextFlow = (service.flowType === 'Instant' || (service.processingTime || '').toLowerCase().includes('instant')) ? 'Manual' : 'Instant';
    const nextTime = nextFlow === 'Instant' ? 'INSTANT ⚡' : '10-15 MIN';
    await handleUpdateServiceField(service, { flowType: nextFlow, processingTime: nextTime });
  };

  const handleTogglePremiumBadge = async (service: CitizenService) => {
    const nextBadge = service.badge === 'PREMIUM' ? 'STANDARD' : 'PREMIUM';
    await handleUpdateServiceField(service, { badge: nextBadge });
  };

  const handleSetServiceUnavailable = async (service: CitizenService) => {
    const nextBadge = service.badge === 'UNAVAILABLE' ? 'STANDARD' : 'UNAVAILABLE';
    const nextActive = nextBadge === 'UNAVAILABLE' ? false : true;
    await handleUpdateServiceField(service, { badge: nextBadge, isActive: nextActive });
  };

  const handleSetPriority = (service: CitizenService) => {
    setPriorityModalService(service);
    setPriorityInputVal(String(service.priority !== undefined ? service.priority : 1));
  };

  const handleMoveService = async (serviceId: string, direction: 'UP' | 'DOWN') => {
    try {
      const res = await fetch('/api/services/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, direction }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.services)) {
          setServices(data.services);
        } else {
          fetchData();
        }
        window.dispatchEvent(new Event('services_updated'));
      }
    } catch (err) {
      console.error('Error reordering service:', err);
    }
  };

  const handleAutoReindexServices = async () => {
    try {
      const res = await fetch('/api/services/reindex', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.services)) {
          setServices(data.services);
        } else {
          fetchData();
        }
        window.dispatchEvent(new Event('services_updated'));
      }
    } catch (err) {
      console.error('Error reindexing services:', err);
    }
  };

  const handleEditNoticeBanner = (service: CitizenService) => {
    setNoticeModalService(service);
    setNoticeInputText(service.announcementBanner || service.warningNotice || '');
  };

  const handleDeleteService = (service: CitizenService) => {
    setDeleteConfirmModal({
      title: 'Delete Service',
      message: `Are you sure you want to delete service "${service.title}"?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/services/${service.id}?force=true`, {
            method: 'DELETE'
          });
          if (res.ok) {
            fetchData();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const getServicePendingCount = (serviceId: string, serviceTitle: string) => {
    return requests.filter(
      (r) =>
        (r.serviceId === serviceId || r.serviceTitle === serviceTitle) &&
        (r.status === 'PENDING' || r.status === 'IN_PROCESS')
    ).length;
  };

  const totalPendingCount = requests.filter(
    (r) => r.status === 'PENDING' || r.status === 'IN_PROCESS'
  ).length;

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.retailerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          JSON.stringify(r.formData).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesService = selectedServiceFilter === 'ALL' || r.serviceId === selectedServiceFilter || r.serviceTitle === selectedServiceFilter;
    const matchesOperator = operatorFilter === 'ALL' 
      ? true 
      : operatorFilter === 'UNCLAIMED' 
      ? !r.claimedByOperatorId 
      : (r.claimedByOperatorId === operatorFilter || r.claimedByOperatorName === operatorFilter);
    return matchesSearch && matchesStatus && matchesService && matchesOperator;
  });

  return (
    <div className="space-y-6 text-slate-900 pb-28 sm:pb-32">
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-indigo-700 text-white p-5 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1 w-full sm:w-auto">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/20 text-amber-200 border border-white/20">
            👑 SUPER ADMIN CONTROL CENTER
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">Citizen Service Portal Operator Dashboard</h2>
          <p className="text-xs text-amber-100">Launch new services, manage retailer requests, update pricing & process outputs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="w-full sm:w-auto px-4 py-3 bg-slate-950/80 hover:bg-slate-950 text-white font-extrabold text-xs rounded-2xl border border-white/20 backdrop-blur-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>💾 BACKUP & EXPORT DATA</span>
          </button>

          <button
            onClick={onOpenNewServiceLaunch}
            className="w-full sm:w-auto px-5 py-3 bg-slate-950 hover:bg-slate-900 text-amber-400 font-extrabold text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
            <span>🚀 LAUNCH NEW SERVICE</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div 
            onClick={() => {
              setActiveTab('requests');
              setStatusFilter('PENDING');
            }}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-amber-400 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase group-hover:text-amber-600 transition-colors">PENDING REQUESTS</span>
              <span className="text-[10px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
            <p className="text-xl font-black text-amber-600 mt-1">{stats.pendingRequests}</p>
            <p className="text-[10px] text-slate-400">Needs operator action</p>
          </div>

          <div 
            onClick={() => {
              setActiveTab('requests');
              setStatusFilter('IN_PROCESS');
            }}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-blue-400 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase group-hover:text-blue-600 transition-colors">IN PROCESS</span>
              <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
            <p className="text-xl font-black text-blue-600 mt-1">{stats.inProcessRequests}</p>
            <p className="text-[10px] text-slate-400">Under verification</p>
          </div>

          <div 
            onClick={() => {
              setActiveTab('requests');
              setStatusFilter('COMPLETED');
            }}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-emerald-400 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase group-hover:text-emerald-600 transition-colors">COMPLETED</span>
              <span className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
            <p className="text-xl font-black text-emerald-600 mt-1">{stats.completedRequests}</p>
            <p className="text-[10px] text-slate-400">Output generated</p>
          </div>

          <div 
            onClick={() => {
              setActiveTab('services');
            }}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-indigo-400 active:scale-98 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">ACTIVE SERVICES</span>
              <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </div>
            <p className="text-xl font-black text-indigo-600 mt-1">{stats.totalActiveServices}</p>
            <p className="text-[10px] text-slate-400">Live on portal</p>
          </div>
        </div>
      )}

      {/* View Tabs - List layout on mobile, wrapped flex on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('requests')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'requests' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span>📋</span>
            <span className="truncate">Retailer Requests</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'requests' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('retailers')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'retailers' ? 'bg-indigo-950 text-white border-indigo-900 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">User List / Retailers</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'retailers' ? 'bg-indigo-900 text-amber-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {allUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('topups')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'topups' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span>💰</span>
            <span className="truncate">Direct Top-Up Requests</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
            topupRequests.filter(t => t.status === 'PENDING').length > 0
              ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
              : activeTab === 'topups' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {topupRequests.filter(t => t.status === 'PENDING').length} Pending
          </span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'services' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span>🚀</span>
            <span className="truncate">Manage Active Services</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'services' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {services.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('blockRates')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'blockRates' ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Block Rates & Pricing</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'blockRates' ? 'bg-indigo-950 text-amber-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {blockRates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('supportChats')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'supportChats' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md border-emerald-700' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <LifeBuoy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Support Tickets (सपोर्ट टिकट्स)</span>
          </div>
          {unreadSupportCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-bounce shrink-0">
              {unreadSupportCount} New
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
              activeTab === 'supportChats' ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-100 text-slate-500'
            }`}>
              Helpdesk
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'settings' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Settings className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">⚙️ Signup Bonus & Settings</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'settings' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            ₹{signupBonus}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('operators')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'operators' ? 'bg-purple-700 text-white border-purple-700 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="w-3.5 h-3.5 text-purple-300 shrink-0" />
            <span className="truncate">👨‍💻 Service Operators</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'operators' ? 'bg-purple-900 text-white' : 'bg-purple-100 text-purple-800'
          }`}>
            {allUsers.filter(u => u.role === 'OPERATOR').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('mobileLookup')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'mobileLookup' ? 'bg-cyan-700 text-white border-cyan-700 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <PhoneCall className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span className="truncate">📱 Mobile Details Finder (Private)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'mobileLookup' ? 'bg-cyan-900 text-white' : 'bg-cyan-100 text-cyan-900'
          }`}>
            Instant
          </span>
        </button>

        <button
          id="btn-tab-public-services"
          onClick={() => setActiveTab('publicServices')}
          className={`w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between lg:justify-start gap-2 border cursor-pointer ${
            activeTab === 'publicServices' ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white border-blue-700 shadow-md ring-1 ring-amber-300' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">🏛️ Portal Service Manager (पोर्टल सेवा नियंत्रण)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            activeTab === 'publicServices' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-blue-100 text-blue-800'
          }`}>
            PORTALS & PDF
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      {/* TAB 1: RETAILER REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          {/* Service Wise Notification & Filter Bar */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Service Request Notifications (सेवा अनुसार पेंडिंग काम)</span>
                </span>
                <span className="text-[11px] text-slate-500 hidden md:inline">
                  • Click on any service to view its pending requests
                </span>
              </div>
              {selectedServiceFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedServiceFilter('ALL')}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Clear Service Filter</span>
                  <span>✕</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* All Services Pill */}
              <button
                onClick={() => setSelectedServiceFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedServiceFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>All Services</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    totalPendingCount > 0
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {totalPendingCount} Pending
                </span>
              </button>

              {/* Individual Services with Notification Badge */}
              {[...services].sort((a, b) => {
                const pA = a.priority !== undefined && !isNaN(Number(a.priority)) ? Number(a.priority) : 999999;
                const pB = b.priority !== undefined && !isNaN(Number(b.priority)) ? Number(b.priority) : 999999;
                if (pA !== pB) return pA - pB;
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
              }).map((srv) => {
                const pendingCount = getServicePendingCount(srv.id, srv.title);
                const isSelected = selectedServiceFilter === srv.id || selectedServiceFilter === srv.title;

                return (
                  <button
                    key={srv.id}
                    onClick={() =>
                      setSelectedServiceFilter(isSelected ? 'ALL' : srv.id)
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <span>{srv.title}</span>
                    {pendingCount > 0 ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isSelected
                            ? 'bg-amber-300 text-slate-950'
                            : 'bg-rose-500 text-white shadow-xs animate-pulse'
                        }`}
                      >
                        🔔 {pendingCount}
                      </span>
                    ) : (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSelected
                            ? 'bg-indigo-700 text-indigo-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        0
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter requests or retailer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500 shrink-0 active:scale-95"
                title="Download JSON Backup of Active & Pending Service Requests"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>📥 Export Requests JSON</span>
              </button>

              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">👤 All Operators (सभी ऑपरेटर)</option>
                <option value="UNCLAIMED">⏳ Unclaimed / Unaccepted Only</option>
                {allUsers.filter(u => u.role === 'OPERATOR').map(op => (
                  <option key={op.id} value={op.id}>👨‍💻 {op.name} ({op.operatorLabel || 'Operator'})</option>
                ))}
              </select>

              {['ALL', 'PENDING', 'IN_PROCESS', 'COMPLETED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                    statusFilter === st ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Indicator */}
          {selectedServiceFilter !== 'ALL' && (
            <div className="bg-indigo-50/90 border border-indigo-200/90 text-indigo-950 rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center justify-between">
              <span>
                🔍 Filtered by Service: <span className="underline font-black text-indigo-700">{services.find(s => s.id === selectedServiceFilter || s.title === selectedServiceFilter)?.title || selectedServiceFilter}</span>
              </span>
              <button
                onClick={() => setSelectedServiceFilter('ALL')}
                className="text-indigo-700 hover:text-indigo-900 font-extrabold underline text-[11px] cursor-pointer"
              >
                Show All Services
              </button>
            </div>
          )}

          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-500 space-y-2">
                <p className="font-extrabold text-sm text-slate-700">No requests found</p>
                <p className="text-xs">There are no requests matching the selected service or status filters.</p>
                {selectedServiceFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedServiceFilter('ALL')}
                    className="mt-2 px-3.5 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
                  >
                    Reset Service Filter
                  </button>
                )}
              </div>
            ) : (
              filteredRequests.map((req) => {
                const chatMsgs = req.chatMessages || [];
                const retailerMsgs = chatMsgs.filter(m => m.senderRole === 'RETAILER');
                const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;
                const isLastMsgFromRetailer = lastMsg?.senderRole === 'RETAILER';

                const neoBgClass = req.status === 'COMPLETED'
                  ? 'bg-gradient-to-br from-white via-emerald-50/30 to-emerald-100/20 border-2 border-emerald-500 shadow-emerald-500/10'
                  : req.status === 'IN_PROCESS' || (req.status as string) === 'IN_PROGRESS'
                  ? 'bg-gradient-to-br from-white via-cyan-50/30 to-cyan-100/20 border-2 border-cyan-500 shadow-cyan-500/10'
                  : req.status === 'PENDING'
                  ? 'bg-gradient-to-br from-white via-amber-50/40 to-amber-100/20 border-2 border-amber-400 shadow-amber-500/10'
                  : 'bg-gradient-to-br from-white via-rose-50/30 to-rose-100/20 border-2 border-rose-400 shadow-rose-500/10';

                return (
                  <div key={req.id} className={`p-4.5 rounded-3xl space-y-3.5 shadow-xs hover:shadow-md transition-all ${neoBgClass}`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-xs px-2.5 py-1 bg-slate-900 text-amber-300 rounded-lg shadow-2xs font-mono">#{req.requestNumber}</span>
                          <h4 className="font-extrabold text-sm text-slate-900">{req.serviceTitle}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                            req.status === 'IN_PROCESS' ? 'bg-cyan-600 text-white' :
                            req.status === 'PENDING' ? 'bg-amber-500 text-slate-950 animate-pulse' :
                            'bg-rose-600 text-white'
                          }`}>
                            {req.status}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {req.category}
                          </span>
                          {isLastMsgFromRetailer && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white animate-pulse">
                              💬 Retailer Replied
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium pt-0.5 flex flex-wrap items-center gap-2">
                          <span>Retailer: <span className="font-extrabold text-slate-900">{req.retailerName}</span> ({req.retailerMobile})</span>
                          <span>• Fee: <span className="font-black text-emerald-700">₹{req.price.toFixed(2)}</span></span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Entry Time / समय: <span className="text-blue-700 font-black">{req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A'}</span></span>
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {(() => {
                          const pdfUrl = getRequestPdfUrl(req);
                          if (!pdfUrl) return null;
                          return (
                            <a
                              href={pdfUrl}
                              download={`Receiving_${req.requestNumber}_${req.serviceTitle.replace(/\s+/g, '_')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs active:scale-98 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </a>
                          );
                        })()}

                        <button
                          onClick={() => setExpandedChatId(expandedChatId === req.id ? null : req.id)}
                          className={`px-3 py-1.5 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                            expandedChatId === req.id
                              ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                              : isLastMsgFromRetailer
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-500 hover:to-indigo-500'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {expandedChatId === req.id 
                              ? 'Close Chat' 
                              : chatMsgs.length > 0 
                              ? `Chat (${chatMsgs.length})` 
                              : 'Chat'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            const nextStatus = req.status === 'PENDING' ? 'COMPLETED' : req.status;
                            setUpdateStatus(nextStatus);
                            setAdminRemarks(req.adminRemarks || (nextStatus === 'COMPLETED' ? 'Done' : ''));
                            setOutputUrl(getRequestPdfUrl(req) || '');
                            setRefundFee(false);
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer"
                        >
                          Process / Status
                        </button>

                        <button
                          disabled={isDeletingReqId === req.id}
                          onClick={() => handleDeleteRequest(req.id, req.requestNumber)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                          title="Delete Request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingReqId === req.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Highlighted banner when Retailer sent a new message and chat is not open */}
                    {isLastMsgFromRetailer && expandedChatId !== req.id && (
                      <div 
                        onClick={() => setExpandedChatId(req.id)}
                        className="p-2.5 bg-blue-50/90 hover:bg-blue-100/90 border border-blue-300 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2 font-bold text-blue-950 truncate min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                          <span className="text-blue-700 font-black shrink-0">💬 Retailer Message:</span>
                          <span className="truncate text-slate-900 font-semibold">{lastMsg?.text || 'Sent attachment/image'}</span>
                        </div>
                        <span className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                          Reply Chat ➔
                        </span>
                      </div>
                    )}

                {/* Highlighted Operator Note with Bouncing Arrow (Show ONLY when IN_PROCESS/IN_PROGRESS) */}
                {(req.status === 'IN_PROCESS' || (req.status as string) === 'IN_PROGRESS') && req.adminRemarks && cleanAdminRemarks(req.adminRemarks) && (
                  <div className="p-3 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-500 rounded-xl space-y-1.5 shadow-xs text-xs">
                    <div className="flex items-center gap-1.5 font-black text-rose-700">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 text-xs animate-bounce">
                        ➔
                      </span>
                      <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                        OPERATOR NOTE / REMARK
                      </span>
                    </div>
                    <div className="bg-white/95 p-2 rounded-lg border border-rose-200">
                      <p className="font-extrabold text-slate-900 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300 text-xs">
                        {cleanAdminRemarks(req.adminRemarks)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submitted Form Details */}
                <div className="bg-slate-50/90 rounded-2xl p-3 text-xs space-y-2 border border-slate-200/60">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Submitted Form Data & Attachments</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(() => {
                      const targetService = services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase());
                      const filteredEntries = getFilteredFormDataEntries(req.formData, targetService);
                      return filteredEntries.map((entry) => {
                        const strVal = String(entry.value || '');

                        if (entry.isImage) {
                          return (
                            <FormAttachmentImageCard
                              key={entry.key}
                              fieldLabel={entry.label}
                              imgUrl={entry.value}
                              requestNumber={req.requestNumber}
                              onZoom={(url) => setLightboxImage(url)}
                              onRequestOpenResizer={(url) => {
                                setPanResizerInitialImage(url);
                                setPanResizerRequest(req);
                                setIsPanResizerOpen(true);
                              }}
                            />
                          );
                        }

                        if (entry.isPdf || entry.isFile) {
                          return (
                            <FormAttachmentDocumentCard
                              key={entry.key}
                              fieldLabel={entry.label}
                              fileUrl={entry.value}
                              onPreview={(url, label) => setPreviewDocModal({ url, title: label, filename: strVal.split('/').pop() || 'document.pdf' })}
                              fileName={strVal.split('/').pop() || 'document.pdf'}
                            />
                          );
                        }

                        return (
                          <div key={entry.key} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-0.5 shadow-2xs min-w-0">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">{entry.label}</span>
                            <span className="text-xs font-black text-slate-900 block break-words break-all leading-snug">
                              {strVal || '—'}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Inline Live Chat directly below submitted data */}
                <InlineRequestChat
                  request={req}
                  isOpen={expandedChatId === req.id}
                  enableChat={services.find((s: CitizenService) => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase())?.enableChat ?? true}
                  onToggle={() => setExpandedChatId(expandedChatId === req.id ? null : req.id)}
                />
              </div>
            );
          })
        )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE ACTIVE SERVICES */}
      {activeTab === 'services' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="font-black text-base text-slate-900">Launched Portal Services ({services.length})</h3>
              <p className="text-xs text-slate-500">Use Up/Down arrows (↑/↓) or click number to set serial priority order (1, 2, 3...)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoReindexServices}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Automatically assign serial numbers 1 to N for all services"
              >
                🔢 Auto Serial Order (1..N)
              </button>
              <button
                onClick={onOpenNewServiceLaunch}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Launch New Service
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...services].sort((a, b) => {
              const pA = a.priority !== undefined && !isNaN(Number(a.priority)) ? Number(a.priority) : 999999;
              const pB = b.priority !== undefined && !isNaN(Number(b.priority)) ? Number(b.priority) : 999999;
              if (pA !== pB) return pA - pB;
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeA - timeB;
            }).map((srv, index) => (
              <div key={srv.id} className="p-4 border border-slate-200 rounded-3xl bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-3.5 relative">
                {/* Top Header: Priority Control, Service Icon, Title, Badge Tag */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Up/Down Priority Rank Widget */}
                    <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shrink-0 shadow-2xs">
                      <button
                        onClick={() => handleMoveService(srv.id, 'UP')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors p-0.5 cursor-pointer"
                        title="Move Up in List"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span
                        onClick={() => handleSetPriority(srv)}
                        className="text-xs font-black text-indigo-900 leading-none my-0.5 cursor-pointer hover:text-indigo-600 hover:underline px-1 py-0.5"
                        title="Click to set custom serial number"
                      >
                        {srv.priority ?? (index + 1)}
                      </span>
                      <button
                        onClick={() => handleMoveService(srv.id, 'DOWN')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors p-0.5 cursor-pointer"
                        title="Move Down in List"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Service Circular Logo/Icon */}
                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-indigo-200 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-2xs">
                      {srv.iconUrl ? (
                        <img src={srv.iconUrl} alt={srv.title} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
                          🪪
                        </div>
                      )}
                    </div>

                    {/* Title & Category & Price */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-base text-slate-900 leading-tight uppercase tracking-tight">
                        {srv.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm font-black text-emerald-600">
                          ₹{srv.price.toFixed(2)}
                        </span>
                        {srv.distributorPrice !== undefined && srv.distributorPrice !== null && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Distributor: ₹{Number(srv.distributorPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Badge Pill (Only PREMIUM / UNAVAILABLE / DISTRIBUTOR ONLY shown) */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {srv.badge === 'PREMIUM' && (
                      <button
                        onClick={() => handleTogglePremiumBadge(srv)}
                        className="px-3 py-1 rounded-xl text-xs font-black tracking-wide border cursor-pointer transition-all bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-xs"
                        title="Premium Service"
                      >
                        👑 PREMIUM
                      </button>
                    )}
                    {srv.badge === 'UNAVAILABLE' && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        🚫 UNAVAILABLE
                      </span>
                    )}

                    {srv.isDistributorOnly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-300">
                        👑 DISTRIBUTOR ONLY
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Control Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  {/* Active Toggle Switch */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <button
                      onClick={() => handleToggleServiceActive(srv)}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                        srv.isActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                          srv.isActive ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-bold ${srv.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {srv.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Buttons: Edit Service & Delete */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setEditingService(srv)}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Full Edit Service Form"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Service</span>
                    </button>

                    <button
                      onClick={() => handleDeleteService(srv)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-all cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notice / Announcement Banner Pill */}
                {(srv.announcementBanner || srv.warningNotice) ? (
                  <div className="mt-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs font-bold text-amber-950 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">📢</span>
                      <span className="truncate">{srv.announcementBanner || srv.warningNotice}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditNoticeBanner(srv)}
                        className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-[10px] font-black cursor-pointer"
                      >
                        Edit Notice
                      </button>
                      <button
                        onClick={() => handleUpdateServiceField(srv, { announcementBanner: '', warningNotice: '' })}
                        className="p-1 text-amber-800 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Clear Notice"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditNoticeBanner(srv)}
                    className="mt-1 w-full py-1 px-2.5 bg-slate-50 hover:bg-indigo-50/60 border border-dashed border-slate-300 hover:border-indigo-300 rounded-xl text-[11px] font-bold text-slate-500 hover:text-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>📢 + Add Notice Banner / Announcement</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP-UP REQUESTS TAB */}
      {activeTab === 'topups' && (
        <div className="space-y-5">
          {/* Admin QR Code & Payment Configuration Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 border-2 border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <QrCode className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">⚙️ Admin Payment QR & UPI Config (QR/UPI सेटिंग्स)</h3>
                  <p className="text-xs text-slate-300">Retailers will see this QR Code and UPI ID in their "Direct Add" wallet top-up screen.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrConfig(!showQrConfig)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {showQrConfig ? 'Close Editor ▲' : 'Edit QR & UPI Details ✏️'}
              </button>
            </div>

            {settingsSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            {/* Current Active QR Preview Banner */}
            <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-700/80 flex-wrap sm:flex-nowrap">
              <img
                src={
                  paymentSettings.qrImageUrl && !paymentSettings.qrImageUrl.includes('api.qrserver.com')
                    ? paymentSettings.qrImageUrl
                    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${paymentSettings.upiId}&pn=${paymentSettings.payeeName}&cu=INR`)}`
                }
                alt="Active Admin Payment QR"
                className="w-20 h-20 bg-white p-1 rounded-xl object-contain border border-slate-300 shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-800">
                    Active UPI ID
                  </span>
                  <span className="font-mono text-xs font-black text-amber-300 truncate">{paymentSettings.upiId}</span>
                </div>
                <p className="text-xs font-bold text-slate-200">{paymentSettings.payeeName}</p>
                {paymentSettings.bankName && (
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {paymentSettings.bankName} • A/C: {paymentSettings.accountNumber || 'N/A'} • IFSC: {paymentSettings.ifscCode || 'N/A'}
                  </p>
                )}
              </div>
            </div>

            {/* Editable Form Panel */}
            {showQrConfig && (
              <form onSubmit={handleSavePaymentSettings} className="p-4 bg-slate-950/90 rounded-2xl border border-indigo-500/40 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-300">Admin UPI ID (VPA) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ecybercafe@upi, store@sbi"
                      value={paymentSettings.upiId}
                      onChange={(e) => {
                        const newUpi = e.target.value;
                        const isAutoQr = !paymentSettings.qrImageUrl || paymentSettings.qrImageUrl.includes('api.qrserver.com');
                        const newQr = isAutoQr 
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${newUpi}&pn=${paymentSettings.payeeName}&cu=INR`)}`
                          : paymentSettings.qrImageUrl;
                        setPaymentSettings({ ...paymentSettings, upiId: newUpi, qrImageUrl: newQr });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-300">Payee Name / Business Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Scan4Print Digital Services"
                      value={paymentSettings.payeeName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const isAutoQr = !paymentSettings.qrImageUrl || paymentSettings.qrImageUrl.includes('api.qrserver.com');
                        const newQr = isAutoQr 
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${paymentSettings.upiId}&pn=${newName}&cu=INR`)}`
                          : paymentSettings.qrImageUrl;
                        setPaymentSettings({ ...paymentSettings, payeeName: newName, qrImageUrl: newQr });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300">
                    Custom QR Image URL (Optional - Leave blank to auto-generate from UPI ID)
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://your-domain.com/qr-code.png"
                    value={paymentSettings.qrImageUrl}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, qrImageUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400">If you leave this empty, a standard high-quality UPI QR Code image will automatically be generated for your UPI ID.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-300">Bank Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={paymentSettings.bankName || ''}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, bankName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-300">Account Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 39820192831"
                      value={paymentSettings.accountNumber || ''}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-300">IFSC Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={paymentSettings.ifscCode || ''}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, ifscCode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300">Retailer Instruction Notice</label>
                  <input
                    type="text"
                    placeholder="Instructions displayed to retailers when scanning"
                    value={paymentSettings.instructionText || ''}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, instructionText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Gateway API Configuration Section */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div>
                    <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      Automated Payment Gateway API Settings (पेमेंट गेटवे एपीआई एवं वेबसाइट सेटिंग्स)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Configure your payment gateway API Token, website provider URL, and order endpoints.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-300">Gateway API Token / Key *</label>
                      <input
                        type="text"
                        placeholder="e.g. 737bb1-df709c-d3e73f-e1fb9f-699985"
                        value={paymentSettings.gatewayToken || ''}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, gatewayToken: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-300">Gateway Provider Name</label>
                      <input
                        type="text"
                        placeholder="e.g. ALLAPI.in / Custom Gateway"
                        value={paymentSettings.gatewayProviderName || ''}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, gatewayProviderName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-300">Gateway Website Domain / Provider URL</label>
                    <input
                      type="url"
                      placeholder="e.g. https://allapi.in"
                      value={paymentSettings.gatewayWebsiteUrl || ''}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, gatewayWebsiteUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-400">If you purchase payment gateway from another website, enter their provider domain URL here.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-300">Create Order Endpoint API URL</label>
                      <input
                        type="url"
                        placeholder="e.g. https://allapi.in/order/create"
                        value={paymentSettings.gatewayCreateOrderUrl || ''}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, gatewayCreateOrderUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-300">Check Status Endpoint API URL</label>
                      <input
                        type="url"
                        placeholder="e.g. https://allapi.in/order/status"
                        value={paymentSettings.gatewayCheckStatusUrl || ''}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, gatewayCheckStatusUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingSettings ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Save QR & Payment Config</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Pending Requests List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Direct Top-Up Requests (एडमिन अप्रूवल)</h3>
              <p className="text-xs text-slate-500">Approve or reject manual retailer wallet top-up requests after verifying UTR / Transaction No.</p>
            </div>

          {topupRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No top-up requests submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topupRequests.map((tReq) => (
                <div
                  key={tReq.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900">₹{tReq.amount.toFixed(2)}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900">
                        {tReq.retailerName} {tReq.storeName ? `(${tReq.storeName})` : ''}
                      </span>
                      {tReq.retailerMobile && (
                        <span className="font-mono text-slate-500 font-semibold text-[10px]">
                          📱 {tReq.retailerMobile}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 flex-wrap">
                      <span className="font-bold">Method: {tReq.paymentMethod}</span>
                      {tReq.utrNumber && (
                        <span className="font-mono bg-amber-100 text-amber-950 font-black px-2 py-0.5 rounded-md text-[11px] border border-amber-300">
                          UTR / Ref No: {tReq.utrNumber}
                        </span>
                      )}
                    </div>

                    {tReq.notes && (
                      <p className="text-slate-500 italic text-[11px]">"{tReq.notes}"</p>
                    )}

                    <p className="text-[10px] text-slate-400">
                      Submitted: {new Date(tReq.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {tReq.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleTopupAction(tReq.id, 'APPROVE')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                        >
                          Approve & Credit ₹{tReq.amount} ✅
                        </button>
                        <button
                          onClick={() => {
                            setRejectingTopupReq(tReq);
                            setTopupRejectRemarks('Payment verification failed / Invalid UTR');
                          }}
                          className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Reject</span>
                          <span>❌</span>
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full font-extrabold text-xs ${
                        tReq.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tReq.status === 'APPROVED' ? '✅ APPROVED' : '❌ REJECTED'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

      {/* TAB 3: USER LIST & RETAILER MANAGEMENT */}
      {activeTab === 'retailers' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5">
          {/* Header & Main Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Retailer User List & Account Security (यूजर सूची एवं सुरक्षा)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage registered Cyber Cafe Retailers, passwords, wallet balance, roles & account block/unblock security.
              </p>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register New Retailer / User</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-3">
            {/* Top Bar: Search Input, Role, Status */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Retailer Name, Cyber Cafe, Mobile, Email, State, District, or Block..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Roles (सभी रोल)</option>
                <option value="RETAILER">Retailers Only (रिटेलर)</option>
                <option value="DISTRIBUTOR">Distributors (डिस्ट्रीब्यूटर)</option>
                <option value="ADMIN">Admins Only (एडमिन)</option>
              </select>

              {/* Status Filter */}
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as any)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Accounts Status</option>
                <option value="ACTIVE">Active Users (सक्रिय)</option>
                <option value="BLOCKED">Blocked / Suspended (अवरुद्ध)</option>
              </select>
            </div>

            {/* Bottom Bar: State, District & Block Search Filters */}
            <div className="flex flex-wrap items-center gap-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 shrink-0">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Search by Location (राज्य, जिला एवं ब्लॉक अनुसार फ़िल्टर):</span>
              </div>

              {/* State Filter Dropdown */}
              <select
                value={userStateFilter}
                onChange={(e) => {
                  setUserStateFilter(e.target.value);
                  setUserDistrictFilter('ALL');
                  setUserBlockFilter('ALL');
                }}
                className={`px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px] cursor-pointer ${
                  userStateFilter !== 'ALL' ? 'border-indigo-500 ring-2 ring-indigo-100 font-extrabold' : 'border-slate-300'
                }`}
              >
                <option value="ALL">📍 All States (सभी राज्य)</option>
                {INDIAN_STATES.map((st: string) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* District Filter Dropdown */}
              <select
                value={userDistrictFilter}
                onChange={(e) => {
                  setUserDistrictFilter(e.target.value);
                  setUserBlockFilter('ALL');
                }}
                className={`px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px] cursor-pointer ${
                  userDistrictFilter !== 'ALL' ? 'border-amber-500 ring-2 ring-amber-100 font-extrabold' : 'border-slate-300'
                }`}
              >
                <option value="ALL">🏢 All Districts (सभी जिले)</option>
                {availableDistrictsForFilter.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>

              {/* Block Filter Dropdown */}
              <select
                value={userBlockFilter}
                onChange={(e) => setUserBlockFilter(e.target.value)}
                className={`px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px] cursor-pointer ${
                  userBlockFilter !== 'ALL' ? 'border-purple-500 ring-2 ring-purple-100 font-extrabold' : 'border-slate-300'
                }`}
              >
                <option value="ALL">🏛️ All Blocks (सभी ब्लॉक)</option>
                {availableBlocksForFilter.map((blk) => (
                  <option key={blk} value={blk}>
                    {blk}
                  </option>
                ))}
              </select>

              {/* Reset Location Filters Button */}
              {(userStateFilter !== 'ALL' || userDistrictFilter !== 'ALL' || userBlockFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setUserStateFilter('ALL');
                    setUserDistrictFilter('ALL');
                    setUserBlockFilter('ALL');
                  }}
                  className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Location Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Retailer / Store Name</th>
                  <th className="p-3.5">Contact & Login ID</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5 text-center">Wallet Balance</th>
                  <th className="p-3.5 text-center">Password</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {allUsers
                  .filter((u) => {
                    const q = userSearch.toLowerCase().trim();
                    const matchesQuery =
                      !q ||
                      u.name.toLowerCase().includes(q) ||
                      (u.storeName || '').toLowerCase().includes(q) ||
                      (u.mobileNumber || '').includes(q) ||
                      u.email.toLowerCase().includes(q) ||
                      (u.state || '').toLowerCase().includes(q) ||
                      (u.district || '').toLowerCase().includes(q) ||
                      (u.block || '').toLowerCase().includes(q);

                    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
                    const matchesStatus =
                      userStatusFilter === 'ALL' ||
                      (userStatusFilter === 'ACTIVE' && !u.isBlocked) ||
                      (userStatusFilter === 'BLOCKED' && u.isBlocked);

                    const matchesState =
                      userStateFilter === 'ALL' ||
                      (u.state || '').toLowerCase() === userStateFilter.toLowerCase();

                    const matchesDistrict =
                      userDistrictFilter === 'ALL' ||
                      (u.district || '').toLowerCase() === userDistrictFilter.toLowerCase();

                    const matchesBlock =
                      userBlockFilter === 'ALL' ||
                      (u.block || '').toLowerCase() === userBlockFilter.toLowerCase();

                    return matchesQuery && matchesRole && matchesStatus && matchesState && matchesDistrict && matchesBlock;
                  })
                  .map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.isBlocked ? 'bg-rose-50/40' : ''}`}>
                      {/* Name & Store */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                            alt={u.name}
                            className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 shrink-0"
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.isBlocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase">
                                  BLOCKED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3" />
                              <span>{u.storeName || 'Cyber Cafe Store'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5 flex-wrap">
                              <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>State: {u.state || 'Bihar'}</span>
                              {u.district && <span>| Dist: {u.district}</span>}
                              {u.block && <span>| Block: {u.block}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mobile & Email */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="font-mono text-slate-900 font-black text-xs flex items-center gap-1">
                            <span>📱 {u.mobileNumber || 'N/A'}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{u.email}</p>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : u.role === 'DISTRIBUTOR'
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : u.role === 'OPERATOR'
                            ? 'bg-cyan-100 text-cyan-950 border-cyan-300'
                            : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                        }`}>
                          {u.role === 'OPERATOR' ? 'OPERATOR / SPECIAL' : u.role}
                        </span>
                        {u.assignedServiceIds && u.assignedServiceIds.length > 0 && !u.assignedServiceIds.includes('*') ? (
                          <span className="block mt-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md w-fit">
                            🎯 {u.assignedServiceIds.length} Mark Services
                          </span>
                        ) : (
                          <span className="block mt-1 text-[9px] text-slate-400 font-medium">
                            All Services
                          </span>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          ₹{u.walletBalance.toFixed(2)}
                        </span>
                      </td>

                      {/* Password */}
                      <td className="p-3.5 text-center font-mono text-[11px] font-bold text-slate-600">
                        {u.password || '123456'}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleBlockUser(u)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                            u.isBlocked
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          }`}
                          title="Click to toggle block / unblock account"
                        >
                          {u.isBlocked ? '🛑 BLOCKED' : '✅ ACTIVE'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            await loginAs(u.id);
                          }}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black rounded-lg text-xs shadow-xs transition-transform active:scale-95 cursor-pointer inline-flex items-center gap-1"
                          title="1-Click Direct Login as this User"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>1-Click Login</span>
                        </button>

                        <button
                          onClick={() => {
                            setAdjustingWalletUser(u);
                            setWalletAdjType('ADD');
                            setWalletAdjAmount(100);
                            setWalletAdjRemarks('Admin manual wallet topup');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                          title="Direct Add/Deduct Wallet Balance"
                        >
                          💰 Wallet ±
                        </button>

                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                          Edit
                        </button>

                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                            title="Delete Retailer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BLOCK RATES & CUSTOM PRICING */}
      {activeTab === 'blockRates' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>State, District & Block Wise Custom Pricing (ब्लॉक रेट सेटिंग्स)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set custom service rates per District, Block, and Application Code Prefix (BICCO, BCCCO, BRCCO). Rates can be adjusted anytime dynamically.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingBlockRate(null);
                setRateFormState('Bihar');
                setRateFormDistrict('Gaya');
                setRateFormBlock('Konch');
                setRateFormPrefix('BICCO');
                setRateFormPrice(50);
                setRateFormLabel('BICCO Application');
                setRateFormNotes('');
                setShowAddBlockRateModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Block Rate</span>
            </button>
          </div>

          {blockRateMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{blockRateMsg}</span>
            </div>
          )}

          {/* Search bar for block rates */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search State, District, Block (Konch, Tekari, Guraru) or Prefix (BICCO)..."
                value={blockRateSearch}
                onChange={(e) => setBlockRateSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Block Rates List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">State & District</th>
                  <th className="p-3.5">Block Name</th>
                  <th className="p-3.5">App Prefix / Code</th>
                  <th className="p-3.5 text-center">Custom Rate (₹)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {blockRates
                  .filter(r => 
                    r.state.toLowerCase().includes(blockRateSearch.toLowerCase()) ||
                    r.district.toLowerCase().includes(blockRateSearch.toLowerCase()) ||
                    r.block.toLowerCase().includes(blockRateSearch.toLowerCase()) ||
                    r.appPrefix.toLowerCase().includes(blockRateSearch.toLowerCase()) ||
                    (r.appTypeLabel || '').toLowerCase().includes(blockRateSearch.toLowerCase())
                  )
                  .map((rate) => (
                    <tr key={rate.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{rate.state}</div>
                        <div className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{rate.district}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-violet-100 text-violet-900 font-black rounded-lg border border-violet-200 text-xs">
                          {rate.block}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg border border-amber-200 font-mono text-xs">
                          {rate.appPrefix}
                        </span>
                        {rate.appTypeLabel && (
                          <span className="block text-[10px] text-slate-500 mt-1">{rate.appTypeLabel}</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-xl">
                          <span className="text-emerald-700 font-bold">₹</span>
                          <input
                            type="number"
                            defaultValue={rate.price}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== rate.price) {
                                handleQuickUpdatePrice(rate.id, val);
                              }
                            }}
                            className="w-16 bg-transparent text-emerald-900 font-black text-sm text-center focus:outline-none focus:underline cursor-pointer"
                            title="Click & type to change rate upper/lower anytime"
                          />
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase ${
                          rate.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {rate.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingBlockRate(rate);
                            setRateFormState(rate.state);
                            setRateFormDistrict(rate.district);
                            setRateFormBlock(rate.block);
                            setRateFormPrefix(rate.appPrefix);
                            setRateFormPrice(rate.price);
                            setRateFormLabel(rate.appTypeLabel || '');
                            setRateFormNotes(rate.notes || '');
                            setShowAddBlockRateModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBlockRate(rate.id)}
                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SUPPORT TICKETS HELPDESK MANAGER */}
      {activeTab === 'supportChats' && (
        <AdminSupportTicketManager
          onNavigateToRequest={(reqId) => {
            setSearchQuery(reqId);
            setActiveTab('requests');
          }}
        />
      )}

      {/* TAB 7: PORTAL SETTINGS & SIGNUP BONUS CONFIGURATION */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Data Backup & Pre-Deployment Safety Net Banner */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-extrabold text-white">Manual Data Backup & Pre-Deployment Safety Net</h4>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Download a JSON backup of all active service requests or full database dump before deploying code updates to Hostinger or restarting servers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Open Data Export Center</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                <span>Portal Settings & Signup Bonus (साइनअप बोनस सेटिंग्स)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Customise welcome bonus amount for new retailer registrations & portal helpline numbers.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black">
              ⚙️ System Configuration
            </span>
          </div>

          {settingsMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 rounded-2xl text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{settingsMsg}</span>
            </div>
          )}

          <form onSubmit={handleSavePortalSettings} className="space-y-6 max-w-2xl">
            {/* Distributor Registration Control */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/40 border-2 border-indigo-200 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Distributor Registration Control (डिस्ट्रिब्यूटर रजिस्ट्रेशन ऑन/ऑफ)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When turned OFF, Distributor registration option is completely hidden from login forms and public links.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enableDistributorReg}
                    onChange={(e) => setEnableDistributorReg(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div className="text-[11px] font-bold">
                {enableDistributorReg ? (
                  <span className="text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Distributor Registration is Currently ON (चालू है)
                  </span>
                ) : (
                  <span className="text-rose-700 bg-rose-100/80 px-3 py-1 rounded-full border border-rose-300 inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Distributor Registration is Currently OFF (बंद है)
                  </span>
                )}
              </div>
            </div>

            {/* Distributor Commission Percentage Setting */}
            <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-emerald-50/50 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-indigo-600" />
                    <span>Distributor Commission Rate (%) / डिस्ट्रीब्यूटर कमीशन दर (%)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Percentage of completed order value credited to distributor when retailer finishes a service order (Default: 2.0%).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={distributorCommissionPercent}
                    onChange={(e) => setDistributorCommissionPercent(Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-indigo-600 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[1.0, 2.0, 3.0, 5.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDistributorCommissionPercent(rate)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      distributorCommissionPercent === rate
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Signup Bonus Customization */}
            <div className="p-5 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-500/10 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Welcome Signup Bonus (नया खाता बोनस)</span>
                  </h4>
                  <p className="text-xs text-slate-500">Amount credited instantly to new retailer's wallet upon registration.</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBonus}
                    onChange={(e) => setEnableBonus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {enableBonus && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Bonus Amount / बोनस राशि (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      value={signupBonus}
                      onChange={(e) => setSignupBonus(Number(e.target.value))}
                      placeholder="e.g. 200"
                      className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl font-black text-lg text-amber-700 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* Preset Amount Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Presets:</span>
                    {[0, 50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSignupBonus(amt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                          signupBonus === amt
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-105'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ₹{amt} {amt === 0 ? '(Disable Bonus)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Support Helpline & WhatsApp Support Number Settings */}
            <div className="p-5 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-indigo-50/20 border-2 border-emerald-500/30 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-600 text-white rounded-lg"><Phone className="w-4 h-4" /></span>
                  <span>WhatsApp, Telegram & Helpline Support Management</span>
                </h4>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-full border border-emerald-300">
                  📱 Active Support Line
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Yahan WhatsApp Support Number aur Telegram Channel Link change karne par website par sabhi jagah (Floating Widget, Support Chat, Sidebar Contact, Helpdesk) instantly update ho jayega.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Support Phone Helpline</span>
                  </label>
                  <input
                    type="text"
                    value={supportHelpline}
                    onChange={(e) => setSupportHelpline(e.target.value)}
                    placeholder="e.g. 0000000000"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Phone call support number shown on helpline page</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Support Number</span>
                  </label>
                  <input
                    type="text"
                    value={supportWhatsapp}
                    onChange={(e) => setSupportWhatsapp(e.target.value)}
                    placeholder="e.g. 0000000000"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-emerald-400 rounded-xl text-xs font-black font-mono text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-slate-500">WhatsApp direct chat recipient number</p>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanNum = supportWhatsapp.replace(/\D/g, '') || '0000000000';
                        window.open(`https://wa.me/91${cleanNum}?text=Testing%20Admin%20WhatsApp%20Support%20Number`, '_blank');
                      }}
                      className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      🧪 Test Link
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-600" />
                    <span>Telegram Channel Link</span>
                  </label>
                  <input
                    type="text"
                    value={telegramChannel}
                    onChange={(e) => setTelegramChannel(e.target.value)}
                    placeholder="e.g. https://t.me/your_channel"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-sky-400 rounded-xl text-xs font-black font-mono text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-xs"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-slate-500">Telegram official updates channel link</p>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(telegramChannel || 'https://t.me/', '_blank');
                      }}
                      className="text-[10px] font-black text-sky-700 hover:text-sky-800 underline cursor-pointer"
                    >
                      🧪 Test Link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Integration & Live Tester (wbapi.in) */}
            <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                <div>
                  <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp Gateway API (wbapi.in Integration)</span>
                  </h4>
                  <p className="text-xs text-emerald-700">Automated WhatsApp messages sent on request submission, status changes, document delivery & wallet credits.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    API Active
                  </span>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waEnabled}
                      onChange={(e) => setWaEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {waStatusMsg && (
                <div className="p-3 bg-white border border-emerald-300 text-slate-800 rounded-xl text-xs font-bold text-center animate-fadeIn shadow-xs">
                  {waStatusMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">
                      API Key / Token (x-api-key)
                    </label>
                    <input
                      type="text"
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      placeholder="wbapi.in token..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">
                      Session ID (e.g. u439_Cyberacfe)
                    </label>
                    <input
                      type="text"
                      value={waSessionId}
                      onChange={(e) => setWaSessionId(e.target.value)}
                      placeholder="e.g. u439_Cyberacfe"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-emerald-800 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">
                      Website Portal Link (for WhatsApp Messages)
                    </label>
                    <input
                      type="text"
                      value={waPortalUrl}
                      onChange={(e) => setWaPortalUrl(e.target.value)}
                      placeholder="e.g. https://ecybercafe.in (Auto-detects if empty)"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-sans text-xs text-indigo-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Endpoint: <code className="bg-emerald-100/80 text-emerald-900 px-1.5 py-0.5 rounded font-mono">https://wbapi.in/api/send-text</code>
                  </p>

                  <button
                    type="button"
                    onClick={handleSaveWhatsAppConfig}
                    disabled={isSavingWa}
                    className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Save WhatsApp Settings & Portal Link</span>
                  </button>
                </div>

                <div className="space-y-3 bg-white/80 p-4 border border-emerald-200 rounded-xl">
                  <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Send Test WhatsApp Message</span>
                  </h5>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={waTestPhone}
                      onChange={(e) => setWaTestPhone(e.target.value)}
                      placeholder="Recipient Mobile (e.g. 0000000000)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                    <textarea
                      rows={2}
                      value={waTestMsg}
                      onChange={(e) => setWaTestMsg(e.target.value)}
                      placeholder="Message content..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    disabled={isTestingWa}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isTestingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Test WhatsApp Now</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Telegram Group & Channel Alerts Card */}
            <div className="p-5 bg-gradient-to-br from-sky-50/80 via-blue-50/40 to-indigo-50/30 border-2 border-sky-400/50 rounded-2xl space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-200/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-sky-500 text-white rounded-xl shadow-xs">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Telegram Group / Channel Alert Bot Setup</span>
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-black rounded-full border border-sky-300">
                        ⚡ Instant Team Alerts
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Connect your Telegram Bot to deliver real-time notifications for every new service request & wallet recharge directly to your Operator and Admin team group.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border flex items-center gap-1.5 ${
                    tgBotToken && tgChatId ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${tgBotToken && tgChatId ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    {tgBotToken && tgChatId ? 'Connected / एक्टिव' : 'Token Required'}
                  </span>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tgAlertsEnabled}
                      onChange={(e) => setTgAlertsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              </div>

              {tgStatusMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-bold text-center animate-fadeIn border ${
                  tgStatusMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  {tgStatusMsg.message}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-800 flex items-center justify-between mb-1">
                      <span>Telegram Bot HTTP API Token</span>
                      <span className="text-[10px] text-sky-700 font-bold">From @BotFather</span>
                    </label>
                    <input
                      type="text"
                      value={tgBotToken}
                      onChange={(e) => setTgBotToken(e.target.value)}
                      placeholder="e.g. 7123456789:AAFxXxxXXxxXxxXxx"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Telegram par <strong className="text-slate-800">@BotFather</strong> se Naya Bot banakar uska API Token yahan paste karein.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 flex items-center justify-between mb-1">
                      <span>Telegram Group / Channel Chat ID</span>
                      <span className="text-[10px] text-sky-700 font-bold">Group / Channel ID</span>
                    </label>
                    <input
                      type="text"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      placeholder="e.g. -1001234567890 or @your_channel_username"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Apne Admin/Operator Telegram Group ka Chat ID (jaise <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-800">-100...</code>) ya Channel username (<code className="bg-slate-100 px-1 py-0.5 rounded text-sky-800">@channel</code>) darj karein.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 flex items-center justify-between mb-1">
                      <span>Public Telegram Channel Link (Website Contact)</span>
                      <span className="text-[10px] text-sky-700 font-bold">Public Link</span>
                    </label>
                    <input
                      type="text"
                      value={telegramChannel}
                      onChange={(e) => setTelegramChannel(e.target.value)}
                      placeholder="e.g. https://t.me/eCyberCafeOfficial"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Yeh link website par retailers aur users ke Telegram join karne ke liye dikhaya jata hai.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTelegramConfig()}
                      disabled={isSavingTg}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isSavingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Save Telegram Configuration</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestTelegramAlert}
                      disabled={isTestingTg || !tgBotToken || !tgChatId}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isTestingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Send Instant Test Alert 🧪</span>
                    </button>
                  </div>
                </div>

                {/* Guide / Advantages Box */}
                <div className="bg-white/90 p-4 border border-sky-200 rounded-xl space-y-3.5 text-xs text-slate-700 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h5 className="font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Telegram Group / Channel Alert setup instructions:</span>
                    </h5>
                    <ol className="list-decimal list-inside space-y-2 font-medium pt-2 text-[11px] leading-relaxed text-slate-600">
                      <li>Telegram par <strong className="text-slate-900 font-bold">@BotFather</strong> search karke <code className="bg-sky-50 text-sky-800 px-1 rounded font-bold">/newbot</code> command bhejien aur Naya Bot banayein.</li>
                      <li>Bot banne ke baad milne wala <strong className="text-slate-900 font-bold">HTTP API Token</strong> copy karke upar Bot Token field me daalein.</li>
                      <li>Apne Admin / Operators ke Telegram Group ya Channel me is Bot ko <strong className="text-emerald-700 font-bold">Admin</strong> ke roop me add karein.</li>
                      <li>Group ka Chat ID lene ke liye group se kisi message ko <strong className="text-slate-900 font-bold">@userinfobot</strong> par forward karein ya Chat ID copy karein (Starts with <code className="bg-sky-50 text-sky-800 px-1 rounded font-bold">-100...</code>).</li>
                      <li>Token aur Chat ID daalkar <strong className="text-emerald-700 font-bold">Send Instant Test Alert</strong> par click karke test karein!</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 space-y-1 text-[11px]">
                    <div className="font-black text-sky-900 flex items-center gap-1">
                      <span>💡 Instant Benefits / फायदे:</span>
                    </div>
                    <p className="text-slate-600 font-medium">
                      Har nayi service request aur wallet top-up ka instant alert aapke operator aur admin group me pahunchega, jisse request process karne me bilkul bhi deri nahi hogi!
                    </p>
                  </div>
                </div>
              </div>

              {/* Special Service-Wise Operator Telegram Group Alerts */}
              <div className="p-5 bg-gradient-to-br from-sky-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl space-y-4 border-2 border-sky-500/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-400/30">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-sky-100 flex items-center gap-2">
                        <span>📡 Special Service-Wise Operator Telegram Alerts (विशेष ऑपरेटर टेलीग्राम ग्रुप अलर्ट)</span>
                      </h4>
                      <p className="text-xs text-sky-300/80 font-medium">
                        किसी विशेष सर्विस (जैसे Mobile Link, Aadhaar Services) के लिए अलग ऑपरेटर टेलीग्राम ग्रुप का Chat ID सेट करें।
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-sky-500/20 text-sky-200 border border-sky-400/40 rounded-full text-xs font-bold shrink-0">
                    {services.filter(s => s.telegramChatId || s.telegramAlertEnabled).length} Services Configured
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...services].sort((a, b) => (a.priority || 999999) - (b.priority || 999999)).map((srv) => {
                    const hasCustomTg = Boolean(srv.telegramChatId || srv.telegramAlertEnabled);
                    return (
                      <div
                        key={srv.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                          hasCustomTg
                            ? 'bg-sky-950/70 border-sky-400/60 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-extrabold text-xs text-white truncate max-w-[170px]" title={srv.title}>
                              {srv.title}
                            </h5>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              hasCustomTg ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {hasCustomTg ? 'Active Alert' : 'Default Group'}
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-slate-400">
                            Category: <span className="text-sky-300 font-bold">{srv.category}</span>
                          </p>
                          {hasCustomTg ? (
                            <div className="p-2 bg-slate-950/80 rounded-xl border border-sky-500/30 text-[10px] font-mono text-sky-200 truncate">
                              <span className="text-slate-400 font-normal">Chat ID: </span>
                              <span className="font-bold text-sky-300">{srv.telegramChatId || 'Not Set'}</span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 italic">
                              Uses default portal Telegram group
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setEditingService(srv)}
                            className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Configure Group</span>
                          </button>

                          {hasCustomTg && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/services/${srv.id}/telegram/test`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ customChatId: srv.telegramChatId, customBotToken: srv.telegramBotToken })
                                  });
                                  const data = await res.json();
                                  alert(data.message || (res.ok ? 'Test alert sent!' : 'Failed to send test alert.'));
                                } catch (err: any) {
                                  alert('Error sending test alert: ' + err.message);
                                }
                              }}
                              className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="Send Test Alert to this group"
                            >
                              <Send className="w-3 h-3" />
                              <span>Test</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Api Key Management (Aadhaar to PAN Find API) */}
            <div className="border-2 border-emerald-400 rounded-2xl overflow-hidden shadow-md bg-white">
              {/* Cyan Header Banner matching API Key Management UI */}
              <div className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 p-4 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/30 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <h4 className="text-base font-black tracking-tight text-slate-950">Api Key Management (Aadhaar To PAN Find API)</h4>
                    <p className="text-xs font-semibold text-slate-900">Configure Server API Key & Endpoint for Instant PAN Lookup</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/90 text-teal-900 text-xs font-extrabold rounded-full shadow-2xs">
                    ⚡ Instant API
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={panAutoProcess}
                      onChange={(e) => setPanAutoProcess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="p-5 space-y-5 bg-emerald-50/20">
                {panConfigMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 rounded-xl text-xs font-bold text-center animate-fadeIn">
                    {panConfigMsg}
                  </div>
                )}

                {/* API Key & Secret Key Grid matching screenshot */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* API KEY Column */}
                  <div className="md:col-span-5 p-4 bg-emerald-300/30 border border-emerald-400/50 rounded-xl space-y-2">
                    <label className="text-xs font-black uppercase text-emerald-900 tracking-wider block">API KEY (api_key)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={panApiKey}
                        onChange={(e) => setPanApiKey(e.target.value)}
                        placeholder="AK474217"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(panApiKey);
                          alert('API Key copied!');
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Secret Key Column */}
                  <div className="md:col-span-5 p-4 bg-emerald-300/30 border border-emerald-400/50 rounded-xl space-y-2">
                    <label className="text-xs font-black uppercase text-emerald-900 tracking-wider block">Secret Key (Optional)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={panSecretKey}
                        onChange={(e) => setPanSecretKey(e.target.value)}
                        placeholder="Optional Secret Key"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(panSecretKey);
                          alert('Secret Key copied!');
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Save Action Button Column */}
                  <div className="md:col-span-2 p-4 bg-emerald-300/30 border border-emerald-400/50 rounded-xl flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleSavePanConfig}
                      disabled={isSavingPanConfig}
                      className="w-full h-full min-h-[42px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingPanConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                      <span>Save Keys</span>
                    </button>
                  </div>
                </div>

                {/* API Endpoint & Auto-process Settings */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                  <div className="md:col-span-8 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">API Endpoint URL (Instant Server API)</label>
                    <input
                      type="text"
                      value={panApiUrl}
                      onChange={(e) => setPanApiUrl(e.target.value)}
                      placeholder="https://api-domain.com/api/v12/pan-find.php"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-4 bg-white p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Instant Auto-Process</span>
                      <span className="text-[10px] text-slate-500 block">Auto-find PAN on request submission</span>
                    </div>
                    <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg ${panAutoProcess ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
                      {panAutoProcess ? 'ACTIVE (ON)' : 'MANUAL (OFF)'}
                    </span>
                  </div>
                </div>

                {/* Live Testing Box for Aadhaar to PAN */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Test Live Aadhaar to PAN Find API</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono">GET /api/v12/pan-find.php</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={panTestAadhaar}
                      onChange={(e) => setPanTestAadhaar(e.target.value)}
                      placeholder="Enter 12 Digit Aadhaar Number (e.g. 123456789012)"
                      className="flex-1 w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestPanApi}
                      disabled={isTestingPanApi}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isTestingPanApi ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Search className="w-4 h-4" />}
                      <span>Fetch PAN Live</span>
                    </button>
                  </div>

                  {panTestResult && (
                    <div className="mt-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400 font-bold">API Test Status:</span>
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${panTestResult.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                          {panTestResult.success ? 'SUCCESS (100)' : 'FAILED / ERROR'}
                        </span>
                      </div>

                      {panTestResult.pan && (
                        <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg flex items-center justify-between">
                          <span className="text-slate-300 font-sans font-extrabold">FOUND PAN NUMBER:</span>
                          <span className="text-base font-black text-emerald-300 tracking-wider bg-emerald-900/80 px-3 py-1 rounded-md border border-emerald-400">
                            {panTestResult.pan}
                          </span>
                        </div>
                      )}

                      {panTestResult.error && (
                        <div className="p-2 bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-lg">
                          Error Message: {panTestResult.error}
                        </div>
                      )}

                      <details className="pt-1">
                        <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">View Raw Response JSON</summary>
                        <pre className="mt-2 p-2 bg-black text-emerald-400 rounded-md text-[10px] overflow-x-auto border border-slate-900">
                          {JSON.stringify(panTestResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Info API Configuration Box */}
            <div className="p-5 bg-gradient-to-br from-cyan-900/10 via-blue-900/10 to-indigo-900/10 border-2 border-cyan-300/80 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-cyan-600" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Mobile Number Info API Settings (Instant Search Integration)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Configure API Key & URL to fetch Owner Name, Address, Aadhaar Number & Operator details from Mobile Number.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-full text-[10px] font-black shrink-0">
                  ⚡ INSTANT MOBILE API
                </span>
              </div>

              {mobileConfigMsg && (
                <div className="p-3 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-slate-800 text-center animate-fadeIn">
                  {mobileConfigMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 p-4 bg-white border border-cyan-200 rounded-xl space-y-2 shadow-2xs">
                  <label className="text-xs font-black uppercase text-cyan-900 tracking-wider block">API Key (api_key)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={mobileApiKey}
                      onChange={(e) => setMobileApiKey(e.target.value)}
                      placeholder="e.g. AK474079"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(mobileApiKey);
                        alert('Mobile API Key copied!');
                      }}
                      className="px-3 py-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="md:col-span-6 p-4 bg-white border border-cyan-200 rounded-xl space-y-2 shadow-2xs">
                  <label className="text-xs font-black uppercase text-cyan-900 tracking-wider block">API Base URL</label>
                  <input
                    type="text"
                    value={mobileApiUrl}
                    onChange={(e) => setMobileApiUrl(e.target.value)}
                    placeholder="https://api-domain.com/api/v2/mobil_info.php"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-cyan-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mobileAutoProc"
                    checked={mobileAutoProcess}
                    onChange={(e) => setMobileAutoProcess(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded cursor-pointer"
                  />
                  <label htmlFor="mobileAutoProc" className="text-xs font-black text-slate-800 cursor-pointer">
                    Enable Instant Auto-Process when Retailer submits Mobile Info service
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSaveMobileConfig}
                  disabled={isSavingMobileConfig}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSavingMobileConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                  <span>Save Mobile API Settings</span>
                </button>
              </div>
            </div>

            {/* Vehicle RC Print Verification API Configuration Box */}
            <div className="p-5 bg-gradient-to-br from-amber-900/10 via-orange-900/10 to-yellow-900/10 border-2 border-amber-400/80 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Vehicle RC Print Verification API Settings
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Configure API Key & URL for instant Vehicle RC Verification & PDF Download (`rc_print.php`).
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-black shrink-0">
                  ⚡ INSTANT RC PRINT API
                </span>
              </div>

              {rcConfigMsg && (
                <div className="p-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 text-center animate-fadeIn">
                  {rcConfigMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 p-4 bg-white border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                  <label className="text-xs font-black uppercase text-amber-900 tracking-wider block">API Key (api_key)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={rcApiKey}
                      onChange={(e) => setRcApiKey(e.target.value)}
                      placeholder="e.g. AK474217"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rcApiKey);
                        alert('RC API Key copied!');
                      }}
                      className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="md:col-span-6 p-4 bg-white border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                  <label className="text-xs font-black uppercase text-amber-900 tracking-wider block">API Base Endpoint URL</label>
                  <input
                    type="text"
                    value={rcApiUrl}
                    onChange={(e) => setRcApiUrl(e.target.value)}
                    placeholder="https://api-domain.com/api/v1/rc_print.php"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rcAutoProc"
                    checked={rcAutoProcess}
                    onChange={(e) => setRcAutoProcess(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <label htmlFor="rcAutoProc" className="text-xs font-black text-slate-800 cursor-pointer">
                    Enable Instant Auto-Process & PDF Generation when Retailer submits Vehicle RC Print service
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRcConfig}
                  disabled={isSavingRcConfig}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSavingRcConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                  <span>Save RC API Settings</span>
                </button>
              </div>

              {/* Live Testing Box for RC Print API */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Test Live Vehicle RC Print Verification API</span>
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">GET /api/v1/rc_print.php</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={rcTestNo}
                    onChange={(e) => setRcTestNo(e.target.value.toUpperCase())}
                    placeholder="Enter Vehicle RC Number (e.g. UP32CM4081)"
                    className="flex-1 w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestRcApi}
                    disabled={isTestingRcApi}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isTestingRcApi ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Search className="w-4 h-4" />}
                    <span>Test RC Print Live</span>
                  </button>
                </div>

                {rcTestResult && (
                  <div className="mt-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-bold">API Test Status:</span>
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${rcTestResult.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                        {rcTestResult.success ? 'SUCCESS (200)' : 'FAILED / ERROR'}
                      </span>
                    </div>

                    {rcTestResult.rcno && (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-300">Vehicle RC: {rcTestResult.rcno}</span>
                          <span className="text-xs font-bold text-slate-300">Owner: {rcTestResult.name}</span>
                        </div>
                        {rcTestResult.pdfUrl && (
                          <a
                            href={rcTestResult.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-slate-950 font-black text-xs rounded-lg hover:bg-emerald-400 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download Generated RC PDF</span>
                          </a>
                        )}
                      </div>
                    )}

                    {rcTestResult.error && (
                      <div className="p-2 bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-lg">
                        Error: {rcTestResult.error}
                      </div>
                    )}

                    <details className="pt-1">
                      <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">View Raw Response JSON</summary>
                      <pre className="mt-2 p-2 bg-black text-amber-400 rounded-md text-[10px] overflow-x-auto border border-slate-900">
                        {JSON.stringify(rcTestResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>

              {/* Voter Mobile Link Without OTP API Integration (myprints.co.in) */}
              <div className="pt-6 border-t border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                      <PhoneCall className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <span>Voter Mobile Link Without OTP (Instant API)</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md border border-blue-200">
                          MyPrints API
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Configure instant Voter Mobile Link & Status Check API credentials (apiKey, userid, endpoints).
                      </p>
                    </div>
                  </div>

                  {voterConfigMsg && (
                    <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                      {voterConfigMsg}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6 p-3.5 bg-white border border-blue-200 rounded-xl space-y-1.5 shadow-2xs">
                    <label className="text-[11px] font-black uppercase text-blue-900 tracking-wider block">API Key (apiKey)</label>
                    <input
                      type="text"
                      value={voterApiKey}
                      onChange={(e) => setVoterApiKey(e.target.value)}
                      placeholder="532a23eee523fb97e7ecd64e37b51bf3"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-6 p-3.5 bg-white border border-blue-200 rounded-xl space-y-1.5 shadow-2xs">
                    <label className="text-[11px] font-black uppercase text-blue-900 tracking-wider block">User ID (userid)</label>
                    <input
                      type="text"
                      value={voterUserId}
                      onChange={(e) => setVoterUserId(e.target.value)}
                      placeholder="709136152"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-6 p-3.5 bg-white border border-blue-200 rounded-xl space-y-1.5 shadow-2xs">
                    <label className="text-[11px] font-black uppercase text-blue-900 tracking-wider block">Link Submit Endpoint URL</label>
                    <input
                      type="text"
                      value={voterApiUrl}
                      onChange={(e) => setVoterApiUrl(e.target.value)}
                      placeholder="https://myprints.co.in/api/voter/voter_link_withoutOTP_Instant.php"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-6 p-3.5 bg-white border border-blue-200 rounded-xl space-y-1.5 shadow-2xs">
                    <label className="text-[11px] font-black uppercase text-blue-900 tracking-wider block">Status Check Endpoint URL</label>
                    <input
                      type="text"
                      value={voterStatusUrl}
                      onChange={(e) => setVoterStatusUrl(e.target.value)}
                      placeholder="https://myprints.co.in/api/voter/voter_link_chekStstus.php"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="voterAutoProc"
                      checked={voterAutoProcess}
                      onChange={(e) => setVoterAutoProcess(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="voterAutoProc" className="text-xs font-black text-slate-800 cursor-pointer">
                      Enable Instant Auto-Linking when Retailer submits Voter Mobile Link service
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveVoterConfig}
                    disabled={isSavingVoterConfig}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSavingVoterConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                    <span>Save Voter API Settings</span>
                  </button>
                </div>

                {/* Live Testing Box for Voter Mobile Link API */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h5 className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>Test Live Voter Mobile Link & Status Check API</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono">myprints.co.in</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={voterTestEpic}
                      onChange={(e) => setVoterTestEpic(e.target.value.toUpperCase())}
                      placeholder="Enter EPIC Number (e.g. XXZ4596585)"
                      className="px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={voterTestMobile}
                      onChange={(e) => setVoterTestMobile(e.target.value)}
                      placeholder="Enter Mobile Number (e.g. 6200687014)"
                      className="px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTestVoterLink}
                      disabled={isTestingVoterApi}
                      className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isTestingVoterApi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      <span>Submit Instant Mobile Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckVoterStatus}
                      disabled={isCheckingVoterStatus}
                      className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingVoterStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Check Link Status Only</span>
                    </button>
                  </div>

                  {voterTestResult && (
                    <div className="mt-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400 font-bold">API Test Status:</span>
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${voterTestResult.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                          {voterTestResult.success ? 'SUCCESS (200)' : 'FAILED / ERROR'}
                        </span>
                      </div>

                      {voterTestResult.request_status && (
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 font-sans">
                          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>{voterTestResult.request_status}</span>
                          </p>
                          <p className="text-[11px] text-slate-300 font-mono">
                            EPIC: <strong>{voterTestResult.epicNumber}</strong> | Mobile: <strong>{voterTestResult.mobileNumber || 'N/A'}</strong>
                          </p>
                        </div>
                      )}

                      {voterTestResult.error && (
                        <div className="p-2 bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-lg">
                          Error: {voterTestResult.error}
                        </div>
                      )}

                      <details className="pt-1">
                        <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">View Raw Response JSON</summary>
                        <pre className="mt-2 p-2 bg-blue-400 text-black rounded-md text-[10px] overflow-x-auto border border-slate-900 font-mono">
                          {JSON.stringify(voterTestResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPortalSettings}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingPortalSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  <span>Save Portal Settings & Bonus (सेटिंग्स सुरक्षित करें)</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: MANAGE OPERATORS / SERVICE SPECIFIC LOGIN & PERFORMANCE REPORT */}
      {activeTab === 'operators' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Service Operators Performance & Analytics (ऑपरेटर कार्य रिपोर्ट एवं प्रबंधन)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Track exact count of requests accepted/claimed, completed, rejected, and in-process by each staff operator in real-time.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingOperator(null);
                setOpName('');
                setOpMobile('');
                setOpPassword('123456');
                setOpLabel('');
                setOpAssignedServices([]);
                try {
                  const saved = localStorage.getItem('operator_custom_quick_chats');
                  if (saved) setOpQuickChats(JSON.parse(saved));
                } catch {}
                setIsOperatorModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Operator ID</span>
            </button>
          </div>

          {/* Overall Operator Performance Summary Cards */}
          {(() => {
            const operatorUsers = allUsers.filter(u => u.role === 'OPERATOR');
            const totalClaimed = requests.filter(r => !!r.claimedByOperatorId).length;
            const totalCompletedByOps = requests.filter(r => !!r.claimedByOperatorId && r.status === 'COMPLETED').length;
            const totalRejectedByOps = requests.filter(r => !!r.claimedByOperatorId && r.status === 'REJECTED').length;
            const totalInProcessByOps = requests.filter(r => !!r.claimedByOperatorId && r.status === 'IN_PROCESS').length;

            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">👥 TOTAL OPERATORS</span>
                  <div className="text-xl font-black text-purple-900">{operatorUsers.length} Staff</div>
                  <p className="text-[10px] text-purple-600 font-medium">Active operator accounts</p>
                </div>

                <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">📥 TOTAL ACCEPTED</span>
                  <div className="text-xl font-black text-indigo-900">{totalClaimed} Req</div>
                  <p className="text-[10px] text-indigo-600 font-medium">Claimed by operators</p>
                </div>

                <div className="bg-cyan-50/80 border border-cyan-200 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-cyan-800 uppercase tracking-wider block">⚙️ IN PROCESS</span>
                  <div className="text-xl font-black text-cyan-900">{totalInProcessByOps} Req</div>
                  <p className="text-[10px] text-cyan-700 font-medium">Currently being processed</p>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">✅ COMPLETED</span>
                  <div className="text-xl font-black text-emerald-900">{totalCompletedByOps} Req</div>
                  <p className="text-[10px] text-emerald-700 font-medium">Successfully finished</p>
                </div>

                <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">❌ REJECTED</span>
                  <div className="text-xl font-black text-rose-900">{totalRejectedByOps} Req</div>
                  <p className="text-[10px] text-rose-700 font-medium">Rejected & refunded</p>
                </div>
              </div>
            );
          })()}

          {/* Detailed Operator Performance Report Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Operator Performance & Work Breakdown Table (ऑपरेटरवार कार्य रिपोर्ट)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                Real-time request metrics calculated from all submitted retailer orders
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Operator Name & Mobile</th>
                    <th className="p-3 text-center">Department / Title</th>
                    <th className="p-3 text-center bg-indigo-950 text-indigo-200">Total Accepted (स्वीकृत)</th>
                    <th className="p-3 text-center text-cyan-300">In Process (प्रोसेस)</th>
                    <th className="p-3 text-center text-emerald-300">Completed (पूर्ण)</th>
                    <th className="p-3 text-center text-rose-300">Rejected (रिजेक्ट)</th>
                    <th className="p-3 text-center">Success Rate (%)</th>
                    <th className="p-3 text-right">Filter Work</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {allUsers.filter(u => u.role === 'OPERATOR').length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">
                        No operators created yet. Click "Create New Operator ID" to add one.
                      </td>
                    </tr>
                  ) : (
                    allUsers
                      .filter(u => u.role === 'OPERATOR')
                      .map(op => {
                        const opReqs = requests.filter(r => r.claimedByOperatorId === op.id || (r.claimedByOperatorName && r.claimedByOperatorName.toLowerCase() === op.name.toLowerCase()));
                        const acceptedCount = opReqs.length;
                        const inProcessCount = opReqs.filter(r => r.status === 'IN_PROCESS').length;
                        const completedCount = opReqs.filter(r => r.status === 'COMPLETED').length;
                        const rejectedCount = opReqs.filter(r => r.status === 'REJECTED').length;
                        const totalFinished = completedCount + rejectedCount;
                        const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 0;

                        return (
                          <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <span>👨‍💻 {op.name}</span>
                                {op.isBlocked && (
                                  <span className="px-1.5 py-0.2 text-[9px] bg-rose-600 text-white rounded font-black">BLOCKED</span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 font-bold">
                                📱 {op.mobileNumber}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 text-[10px]">
                                {op.operatorLabel || 'Service Operator'}
                              </span>
                            </td>
                            <td className="p-3 text-center bg-indigo-50/50">
                              <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-2xs">
                                {acceptedCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-1 rounded-xl bg-cyan-100 text-cyan-900 font-black text-xs border border-cyan-200">
                                {inProcessCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-200">
                                {completedCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 font-black text-xs border border-rose-200">
                                {rejectedCount}
                              </span>
                            </td>
                            <td className="p-3 text-center font-black">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                                successRate >= 80 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                              }`}>
                                {successRate}%
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setOperatorFilter(op.id);
                                  setActiveTab('requests');
                                }}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                              >
                                🔍 View Work List
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operator Accounts Cards List */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Operator Login Cards & Credentials (ऑपरेटर कार्ड्स)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers.filter(u => u.role === 'OPERATOR').length === 0 ? (
                <div className="col-span-full p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-sm font-bold text-slate-600">No Service Operators created yet.</p>
                  <p className="text-xs text-slate-400">Click "Create New Operator ID" above to add an operator account for specific services.</p>
                </div>
              ) : (
                allUsers
                  .filter(u => u.role === 'OPERATOR')
                  .map(op => {
                    const assignedSrvs = services.filter(s => op.assignedServiceIds?.includes('*') || op.assignedServiceIds?.includes(s.id));
                    const opReqs = requests.filter(r => r.claimedByOperatorId === op.id || (r.claimedByOperatorName && r.claimedByOperatorName.toLowerCase() === op.name.toLowerCase()));
                    const acceptedCount = opReqs.length;
                    const inProcessCount = opReqs.filter(r => r.status === 'IN_PROCESS').length;
                    const completedCount = opReqs.filter(r => r.status === 'COMPLETED').length;
                    const rejectedCount = opReqs.filter(r => r.status === 'REJECTED').length;

                    return (
                      <div key={op.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative hover:border-indigo-300 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm border border-purple-200">
                              👨‍💻
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 text-sm">{op.name}</h3>
                              <span className="text-[10px] font-bold text-indigo-600 block">
                                {op.operatorLabel || 'Service Operator'}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            op.isBlocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {op.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                          </span>
                        </div>

                        {/* Real-time Performance Badge Grid inside Card */}
                        <div className="grid grid-cols-4 gap-1 p-2 bg-indigo-950 text-white rounded-xl text-center text-[10px] font-bold">
                          <div className="p-1 rounded bg-indigo-900/60 border border-indigo-700/50">
                            <span className="text-slate-300 block text-[9px] uppercase">Accepted</span>
                            <span className="text-amber-300 font-black text-xs">{acceptedCount}</span>
                          </div>
                          <div className="p-1 rounded bg-indigo-900/60 border border-indigo-700/50">
                            <span className="text-slate-300 block text-[9px] uppercase">Process</span>
                            <span className="text-cyan-300 font-black text-xs">{inProcessCount}</span>
                          </div>
                          <div className="p-1 rounded bg-indigo-900/60 border border-indigo-700/50">
                            <span className="text-slate-300 block text-[9px] uppercase">Done</span>
                            <span className="text-emerald-400 font-black text-xs">{completedCount}</span>
                          </div>
                          <div className="p-1 rounded bg-indigo-900/60 border border-indigo-700/50">
                            <span className="text-slate-300 block text-[9px] uppercase">Reject</span>
                            <span className="text-rose-400 font-black text-xs">{rejectedCount}</span>
                          </div>
                        </div>

                        <div className="text-xs space-y-1 text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                          <div>📱 Mobile / Login ID: <strong className="text-slate-900 font-black">{op.mobileNumber}</strong></div>
                          <div>🔑 Password: <strong className="text-slate-900 font-black">{op.password}</strong></div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Assigned Services:</span>
                          <div className="flex flex-wrap gap-1">
                            {assignedSrvs.length > 0 ? (
                              assignedSrvs.map(s => (
                                <span key={s.id} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                  {s.title}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                All Services Access
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => {
                              setEditingOperator(op);
                              setOpName(op.name);
                              setOpMobile(op.mobileNumber || '');
                              setOpPassword(op.password || '123456');
                              setOpLabel(op.operatorLabel || '');
                              setOpAssignedServices(op.assignedServiceIds || []);
                              try {
                                const saved = localStorage.getItem('operator_custom_quick_chats');
                                if (saved) setOpQuickChats(JSON.parse(saved));
                              } catch {}
                              setIsOperatorModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setDeleteConfirmModal({
                                title: 'Delete Operator',
                                message: `Are you sure you want to delete operator account for "${op.name}"?`,
                                onConfirm: async () => {
                                  await fetch(`/api/admin/users/${op.id}`, { method: 'DELETE' });
                                  refreshUser();
                                }
                              });
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
      {/* DELETE REQUEST CONFIRMATION MODAL */}
      {reqToDelete && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Delete Request #{reqToDelete.requestNumber || ''}</h3>
                <p className="text-xs text-slate-500 font-medium">Permanent database removal</p>
              </div>
            </div>
            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 leading-relaxed font-medium">
              क्या आप वाकई Request <strong className="text-rose-600 font-bold">#{reqToDelete.requestNumber || ''}</strong> को डिलीट करना चाहते हैं? यह रिकॉर्ड पूरी तरह से हट जाएगा।
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(isDeletingReqId)}
                onClick={() => setReqToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel / नहीं
              </button>
              <button
                type="button"
                disabled={Boolean(isDeletingReqId)}
                onClick={() => executeDeleteRequest(reqToDelete.id, reqToDelete.requestNumber)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-black rounded-xl text-xs cursor-pointer shadow-md transition-colors flex items-center gap-1.5"
              >
                {isDeletingReqId === reqToDelete.id ? 'Deleting...' : 'Yes, Delete Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Process Request #{selectedReq.requestNumber} ({selectedReq.serviceTitle})</h3>
              <button
                type="button"
                disabled={isDeletingReqId === selectedReq.id}
                onClick={() => handleDeleteRequest(selectedReq.id, selectedReq.requestNumber)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUpdateStatus(val);
                    setRefundFee(val === 'REJECTED');
                    if (val === 'REJECTED') {
                      setAdminRemarks(''); // Clear remarks field so reason must be provided
                    } else if (val === 'COMPLETED') {
                      if (!adminRemarks || adminRemarks.toLowerCase().includes('status to') || adminRemarks.toLowerCase().includes('pending')) {
                        setAdminRemarks('Done');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="IN_PROCESS">🎯 IN_PROCESS</option>
                  <option value="COMPLETED">🎉 COMPLETED</option>
                  <option value="REJECTED">❌ REJECTED (Auto-Refund Fee)</option>
                  <option value="PENDING">📋 PENDING</option>
                </select>
              </div>

              {updateStatus === 'REJECTED' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 font-bold">
                  <span>💰</span>
                  <span>Auto-Refund Active: <strong>₹{selectedReq.price.toFixed(2)}</strong> service fee will be instantly refunded to retailer's wallet.</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {updateStatus === 'REJECTED' ? (
                    <span className="text-rose-600 font-extrabold flex items-center gap-1">
                      ⚠️ Rejection Reason (अस्वीकृति का कारण) * [Mandatory / अनिवार्य]
                    </span>
                  ) : (
                    'Operator Remarks'
                  )}
                </label>
                <input
                  type="text"
                  required={updateStatus === 'REJECTED'}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder={updateStatus === 'REJECTED' ? 'Type rejection reason (e.g. Photo blur, Document missing)' : 'Note for retailer'}
                  className={`w-full px-3.5 py-2 border rounded-xl font-bold text-xs ${
                    updateStatus === 'REJECTED' && !adminRemarks
                      ? 'bg-rose-50 border-rose-400 text-rose-950 focus:ring-2 focus:ring-rose-500'
                      : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {updateStatus === 'COMPLETED' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span>Generated Output File / Certificate Slip *</span>
                    </label>
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clipboard className="w-3 h-3 text-indigo-600" />
                      <span>Supports Ctrl + V Paste</span>
                    </span>
                  </div>
                  
                  {/* Dropzone, File Upload & Paste Container */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setPasteToast(`⏳ Uploading dropped file...`);
                        try {
                          const res = await uploadFileToServer(file);
                          setOutputUrl(res.url);
                          setPasteToast(`📁 File uploaded: ${file.name}`);
                          setTimeout(() => setPasteToast(null), 3500);
                        } catch (err: any) {
                          setPasteToast(`❌ Upload failed: ${err.message || 'Error'}`);
                          setTimeout(() => setPasteToast(null), 5000);
                        }
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 border-dashed transition-all relative space-y-2.5 ${
                      isDraggingFile
                        ? 'border-indigo-500 bg-indigo-50/80 ring-4 ring-indigo-100'
                        : 'border-slate-300 bg-slate-50/90 hover:border-slate-400'
                    }`}
                  >
                    {/* Paste Success Toast Badge */}
                    {pasteToast && (
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-between animate-bounce">
                        <span className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                          <span className="truncate">{pasteToast}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPasteToast(null)}
                          className="text-emerald-200 hover:text-white font-bold ml-2 text-xs shrink-0 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Primary Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label className="flex-1 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                        <Upload className="w-4 h-4" />
                        <span>📁 Select File from Computer / Device</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPasteToast(`⏳ Uploading file...`);
                              try {
                                const res = await uploadFileToServer(file);
                                setOutputUrl(res.url);
                                setPasteToast(`📁 Attached & Uploaded: ${file.name}`);
                                setTimeout(() => setPasteToast(null), 3500);
                              } catch (err: any) {
                                setPasteToast(`❌ Upload failed: ${err.message || 'Error'}`);
                                setTimeout(() => setPasteToast(null), 5000);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      <div className="px-3 py-2 bg-white border border-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 shadow-xs shrink-0">
                        <Clipboard className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Paste</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-black text-slate-800">
                          Ctrl + V
                        </kbd>
                      </div>
                    </div>

                    {/* Paste Hint */}
                    <p className="text-[11px] text-center text-slate-500 font-semibold">
                      💡 <strong>Image Paste Active:</strong> Copy any screenshot/image and press <kbd className="px-1 bg-slate-200 rounded text-[10px] font-mono font-black text-slate-800">Ctrl + V</kbd> anywhere, or drag file here!
                    </p>

                    <div className="text-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
                      -- OR ENTER DIRECT LINK --
                    </div>

                    <input
                      type="text"
                      value={outputUrl}
                      onChange={(e) => setOutputUrl(e.target.value)}
                      placeholder="https://... PDF or document URL"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />

                    {/* Attached File Card & Preview */}
                    {outputUrl && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-xs text-emerald-900 font-bold">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {outputUrl.startsWith('data:image')
                                ? '📎 Image Output Attached ✅'
                                : outputUrl.startsWith('data:')
                                ? '📄 Document Output Attached ✅'
                                : outputUrl}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setOutputUrl('')}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-extrabold ml-2 shrink-0 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-rose-200 shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        {/* Image Preview Thumbnail */}
                        {outputUrl.startsWith('data:image') && (
                          <div className="relative max-h-36 rounded-lg overflow-hidden border border-emerald-200 bg-white p-1 flex items-center justify-center">
                            <img
                              src={outputUrl}
                              alt="Output File Preview"
                              className="max-h-32 object-contain rounded"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-black rounded-xl shadow-md"
                >
                  {isUpdating ? 'Saving...' : 'Update & Notify Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Completion & Direct Chat Notification Modal */}
      {waNotificationNotice && waNotificationNotice.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 border-2 border-emerald-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Request #{waNotificationNotice.requestNumber} Updated ({waNotificationNotice.status})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">
                    {waNotificationNotice.serviceTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaNotificationNotice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
              waNotificationNotice.whatsappSent 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <span>{waNotificationNotice.whatsappSent ? '✅' : '📲'}</span>
                <span>
                  {waNotificationNotice.whatsappSent 
                    ? `WhatsApp Message Dispatched via Gateway API!` 
                    : `Direct WhatsApp Receipt Link Ready`}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {waNotificationNotice.whatsappSent 
                  ? `Automated WhatsApp message with clean document download link dispatched to +${waNotificationNotice.phone}.`
                  : `You can also send the completed receipt & download link directly to retailer on WhatsApp with 1-click below:`}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {waNotificationNotice.directUrl && (
                <a
                  href={waNotificationNotice.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWaNotificationNotice(null)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>📲 Open WhatsApp Direct Chat (1-Click Send)</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setWaNotificationNotice(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Done / Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service & Input Fields Modal */}
      <AdminServiceEditModal
        isOpen={!!editingService}
        service={editingService}
        onClose={() => setEditingService(null)}
        onServiceUpdated={fetchData}
      />

      {/* TopUp Request Rejection Modal */}
      {rejectingTopupReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-rose-700 flex items-center gap-2">
                <span>❌ Reject Top-Up Request</span>
              </h3>
              <button
                onClick={() => setRejectingTopupReq(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1 text-rose-900">
              <p className="font-bold">Retailer: {rejectingTopupReq.retailerName}</p>
              <p className="font-extrabold text-sm">Amount: ₹{rejectingTopupReq.amount?.toFixed(2)}</p>
              {rejectingTopupReq.utrNumber && <p className="font-mono font-bold">UTR: {rejectingTopupReq.utrNumber}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Rejection Reason / Remarks (रिजेक्शन कारण)</label>
              <textarea
                rows={3}
                value={topupRejectRemarks}
                onChange={(e) => setTopupRejectRemarks(e.target.value)}
                placeholder="Enter rejection reason for retailer..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingTopupReq(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleTopupAction(rejectingTopupReq.id, 'REJECT', topupRejectRemarks || 'Rejected by Admin');
                  setRejectingTopupReq(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
              >
                Confirm Reject ❌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>{editingUser ? 'Edit Retailer Details & Security' : 'Register New Retailer / User Account'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {userErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold">
                ⚠️ {userErr}
              </div>
            )}

            {userMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold">
                ✅ {userMsg}
              </div>
            )}

            <form onSubmit={handleSaveUserSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Retailer Full Name / पूरा नाम *</label>
                  <input
                    type="text"
                    required
                    value={uName}
                    onChange={(e) => setUName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Cyber Cafe Store Name</label>
                  <input
                    type="text"
                    value={uStoreName}
                    onChange={(e) => setUStoreName(e.target.value)}
                    placeholder="e.g. Ramesh Digital Cafe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Mobile Number (Login ID) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={uMobile}
                    onChange={(e) => setUMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-Digit Mobile Number"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                    placeholder="e.g. cafe@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Account Password / पासवर्ड *</label>
                  <input
                    type="text"
                    required
                    value={uPassword}
                    onChange={(e) => setUPassword(e.target.value)}
                    placeholder="Account password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">User Role (रोल)</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="RETAILER">RETAILER (रिटेलर - Standard)</option>
                    <option value="OPERATOR">OPERATOR (विशेष सर्विस ऑपरेटर)</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR (डिस्ट्रीब्यूटर)</option>
                    <option value="ADMIN">ADMIN (पोर्टल एडमिन)</option>
                  </select>
                </div>
              </div>

              {/* State Dropdown */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Select State / राज्य चुनें
                </label>
                <select
                  value={uState}
                  onChange={(e) => handleUStateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Select State / राज्य चुनें --</option>
                  {INDIAN_STATES.map((st: string) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Bihar Location Details Card with 250ms Smooth Animation */}
              <AnimatePresence>
                {uState === 'Bihar' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-amber-200/60">
                        <MapPin className="w-4 h-4 text-amber-700" />
                        <span className="font-black text-xs text-amber-900">
                          Bihar Location Details / बिहार स्थान विवरण
                        </span>
                        <span className="ml-auto text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Required for Bihar
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* District Dropdown */}
                        <div className="space-y-1">
                          <label className="font-extrabold text-amber-900">
                            Select District / जिला *
                          </label>
                          <select
                            required={uState === 'Bihar'}
                            value={uDistrict}
                            onChange={(e) => handleUDistrictChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-amber-300/80 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer text-xs"
                          >
                            <option value="">-- Select District / जिला --</option>
                            {BIHAR_DISTRICTS.map((dist: string) => (
                              <option key={dist} value={dist}>
                                {dist}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Block Dropdown */}
                        <div className="space-y-1">
                          <label className="font-extrabold text-amber-900">
                            Select Block / ब्लॉक *
                          </label>
                          <select
                            required={uState === 'Bihar'}
                            value={uBlock}
                            onChange={(e) => setUBlock(e.target.value)}
                            disabled={!uDistrict}
                            className="w-full px-3 py-2 bg-white border border-amber-300/80 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer disabled:opacity-50 text-xs"
                          >
                            <option value="">
                              {uDistrict ? '-- Select Block / ब्लॉक --' : 'First Select District'}
                            </option>
                            {uDistrict &&
                              (BIHAR_BLOCKS[uDistrict] || []).map((blk: string) => (
                                <option key={blk} value={blk}>
                                  {blk}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Service Access Permission Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Service Access / विशेष सेवाएं एक्सेस:</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setUServiceAccessMode('ALL');
                        setUAssignedServices([]);
                      }}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        uServiceAccessMode === 'ALL'
                          ? 'bg-indigo-600 text-white font-black shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All Services (सभी)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUServiceAccessMode('CUSTOM')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        uServiceAccessMode === 'CUSTOM'
                          ? 'bg-indigo-600 text-white font-black shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Mark Selected Only (चुनिंदा)
                    </button>
                  </div>
                </div>

                {uServiceAccessMode === 'CUSTOM' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-900">
                        {uAssignedServices.length} Selected Services (चुनी गई सेवाएं):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUAssignedServices(services.map((s) => s.id))}
                          className="text-indigo-600 hover:underline font-extrabold cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setUAssignedServices([])}
                          className="text-rose-600 hover:underline font-extrabold cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-white border border-slate-200 rounded-xl">
                      {[...services].sort((a, b) => (a.priority || 999999) - (b.priority || 999999)).map((srv) => {
                        const isChecked = uAssignedServices.includes(srv.id);
                        return (
                          <label
                            key={srv.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-indigo-50/90 border-indigo-300 font-bold text-indigo-950 shadow-2xs'
                                : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUAssignedServices([...uAssignedServices, srv.id]);
                                } else {
                                  setUAssignedServices(uAssignedServices.filter((id) => id !== srv.id));
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] leading-snug">{srv.title}</p>
                              <p className="text-[9px] text-slate-400 font-normal">{srv.category}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Initial Signup Wallet Balance (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={uWallet}
                    onChange={(e) => setUWallet(parseFloat(e.target.value) || 0)}
                    placeholder="Initial wallet credit amount"
                    className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-black rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Welcome bonus credited automatically on registration.</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 font-extrabold rounded-xl text-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingUser ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{editingUser ? 'Save Account Updates ✅' : 'Register Retailer Account 🚀'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 10: MOBILE DETAILS FINDER (INSTANT SEARCH - PRIVATE TOOL) */}
      {activeTab === 'mobileLookup' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-cyan-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-cyan-500/20 rounded-2xl border border-cyan-400/30">
                  <PhoneCall className="w-6 h-6 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Mobile Details Finder</span>
                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                      👑 ONLY FOR ADMIN / PRIVILEGED
                    </span>
                  </h3>
                  <p className="text-xs text-cyan-200 font-medium">
                    10-अंकों का मोबाइल नंबर दर्ज करें और मालिक का नाम, पिता का नाम, पूरा पता, आधार संख्या एवं ऑपरेटर विवरण तुरंत प्राप्त करें।
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-[11px] font-bold text-cyan-200 bg-cyan-900/80 px-3 py-1.5 rounded-xl border border-cyan-700/60">
                ⚡ Instant Search API v2
              </span>
            </div>
          </div>

          {/* Search Box Card */}
          <div className="bg-white border-2 border-cyan-200 rounded-3xl p-6 shadow-md space-y-5">
            <form onSubmit={handleSearchMobileInfo} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Enter 10 Digit Mobile Number / मोबाइल नंबर दर्ज करें:
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      +91
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      value={mobileSearchNum}
                      onChange={(e) => setMobileSearchNum(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 7408792646"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-mono text-base font-black text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearchingMobile || mobileSearchNum.replace(/\D/g, '').length < 10}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSearchingMobile ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Searching API...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        <span>Fetch Mobile Details (विवरण निकालें)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {mobileSearchErr && (
              <div className="p-4 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2">
                <span>⚠️ {mobileSearchErr}</span>
              </div>
            )}

            {/* Live Result Card */}
            {mobileSearchResult && mobileSearchResult.data && (
              <div className="p-6 bg-gradient-to-br from-cyan-50/80 via-blue-50/50 to-slate-50 border-2 border-cyan-300 rounded-3xl space-y-6 shadow-md animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-600 text-white rounded-2xl shadow-md">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800 block">
                        Search Result for Mobile #{mobileSearchResult.mobile || mobileSearchNum}
                      </span>
                      <h4 className="text-xl font-black text-slate-950">
                        {mobileSearchResult.data.owner_name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const info = `Mobile: ${mobileSearchResult.mobile}\nOwner: ${mobileSearchResult.data.owner_name}\nFather: ${mobileSearchResult.data.father_name}\nAddress: ${mobileSearchResult.data.address}\nAadhaar: ${mobileSearchResult.data.aadhar_number}\nAlt Mobile: ${mobileSearchResult.data.alternative_number}\nSIM: ${mobileSearchResult.data.sim_card}\nEmail: ${mobileSearchResult.data.email}`;
                        navigator.clipboard.writeText(info);
                        alert('✅ Complete Details copied to clipboard!');
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Text</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Retrieved Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">👤 Owner Name (मालिक का नाम)</span>
                    <p className="font-black text-sm text-slate-900">{mobileSearchResult.data.owner_name || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">👨‍👦 Father Name (पिता का नाम)</span>
                    <p className="font-black text-sm text-slate-900">{mobileSearchResult.data.father_name || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">🪪 Aadhaar Number (आधार संख्या)</span>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-black text-sm text-indigo-900 tracking-wider">
                        {mobileSearchResult.data.aadhar_number || 'N/A'}
                      </p>
                      {mobileSearchResult.data.aadhar_number && mobileSearchResult.data.aadhar_number !== 'N/A' && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(mobileSearchResult.data.aadhar_number);
                            alert('Aadhaar Number copied!');
                          }}
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs md:col-span-2 lg:col-span-3">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">📍 Full Residential Address (पूरा पता)</span>
                    <p className="font-bold text-xs text-slate-800 leading-relaxed">{mobileSearchResult.data.address || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">📞 Alternative Number</span>
                    <p className="font-mono font-bold text-xs text-slate-900">{mobileSearchResult.data.alternative_number || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">📱 SIM Card / Operator</span>
                    <p className="font-bold text-xs text-slate-900">{mobileSearchResult.data.sim_card || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-white border border-cyan-200/80 rounded-2xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">✉️ Email Address</span>
                    <p className="font-bold text-xs text-slate-900">{mobileSearchResult.data.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search History Table */}
          {mobileSearchHistory.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <span>Recent Searches History</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">{mobileSearchHistory.length}</span>
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {mobileSearchHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 hover:bg-slate-100 flex items-center justify-between text-xs transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-cyan-900">{item.mobile}</span>
                      <span className="font-bold text-slate-800">{item.owner}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">{item.time}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileSearchNum(item.mobile);
                          handleSearchMobileInfo();
                        }}
                        className="px-2 py-1 bg-cyan-600 text-white font-bold rounded-lg text-[10px] hover:bg-cyan-700 cursor-pointer"
                      >
                        Re-Fetch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 11: PORTAL SERVICES & SUB-LINKS MANAGER (HOME PAGE PORTALS - ADMIN CONTROL) */}
      {activeTab === 'publicServices' && (
        <div className="space-y-6 animate-fadeIn">
          <PortalServiceManager user={allUsers.find(u => u.role === 'ADMIN') || null} isAdmin={true} />
        </div>
      )}

      {/* Adjust User Wallet Balance Modal */}
      {adjustingWalletUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <span>💰 Adjust Retailer Wallet Balance</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustingWalletUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-1">
              <p className="font-extrabold text-indigo-950 text-sm">{adjustingWalletUser.name}</p>
              <p className="text-indigo-800 font-bold">Store: {adjustingWalletUser.storeName || 'Cyber Cafe Store'}</p>
              <p className="font-mono text-indigo-900 font-black">
                Current Wallet Balance: <span className="text-emerald-700">₹{adjustingWalletUser.walletBalance.toFixed(2)}</span>
              </p>
            </div>

            {walletAdjSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{walletAdjSuccess}</span>
              </div>
            )}

            {walletAdjErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{walletAdjErr}</span>
              </div>
            )}

            <form onSubmit={handleAdjustWalletSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Adjustment Type (प्रकार)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletAdjType('ADD')}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                      walletAdjType === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ➕ Credit / Add (क्रेडिट)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletAdjType('DEDUCT')}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                      walletAdjType === 'DEDUCT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ➖ Debit / Deduct (डेबिट)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Amount (₹ राशि) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={walletAdjAmount}
                    onChange={(e) => setWalletAdjAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Admin Remarks / Note</label>
                <input
                  type="text"
                  value={walletAdjRemarks}
                  onChange={(e) => setWalletAdjRemarks(e.target.value)}
                  placeholder="e.g. Manual Cash Payment received"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingWalletUser(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 font-extrabold rounded-xl text-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingWallet}
                  className={`flex-1 py-3 font-black text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    walletAdjType === 'ADD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isAdjustingWallet ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{walletAdjType === 'ADD' ? 'Credit Wallet ✅' : 'Deduct Wallet ➖'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Block Custom Rate Modal */}
      {showAddBlockRateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>{editingBlockRate ? 'Edit Custom Block Rate' : 'Add New Custom Block Rate'}</span>
              </h3>
              <button
                onClick={() => setShowAddBlockRateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlockRate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">State Name (राज्य)</label>
                <input
                  type="text"
                  required
                  value={rateFormState}
                  onChange={(e) => setRateFormState(e.target.value)}
                  placeholder="e.g. Bihar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">District Name (जिला)</label>
                <input
                  type="text"
                  required
                  value={rateFormDistrict}
                  onChange={(e) => setRateFormDistrict(e.target.value)}
                  placeholder="e.g. Gaya, Aurangabad"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Block Name (ब्लॉक)</label>
                <input
                  type="text"
                  required
                  value={rateFormBlock}
                  onChange={(e) => setRateFormBlock(e.target.value)}
                  placeholder="e.g. Konch, Tekari, Guraru, Obra"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Application Code / Prefix (BICCO, BCCCO, BRCCO)</label>
                <input
                  type="text"
                  required
                  value={rateFormPrefix}
                  onChange={(e) => setRateFormPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. BICCO, BCCCO, BRCCO"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-extrabold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Custom Fee Rate (₹ / रुपया)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={rateFormPrice}
                    onChange={(e) => setRateFormPrice(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50, 60, 55, 40, 70"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Is block aur code ke liye custom fee rate set karen. Ye rate kabhi bhi uper niche kar sakte hain.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Label (Optional)</label>
                <input
                  type="text"
                  value={rateFormNotes}
                  onChange={(e) => setRateFormNotes(e.target.value)}
                  placeholder="Optional internal remarks"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBlockRateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBlockRate}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingBlockRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Rate ✅</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX PREVIEW MODAL */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-3 shadow-2xl flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 px-3.5 py-1.5 bg-rose-600 text-white font-black text-xs rounded-xl hover:bg-rose-500 transition-colors shadow-lg z-10 cursor-pointer"
            >
              ✕ Close
            </button>
            <img src={lightboxImage} alt="Document Preview" className="max-w-full max-h-[78vh] object-contain rounded-2xl" />
            <div className="mt-3 flex items-center gap-3">
              <a 
                href={lightboxImage} 
                download="document_attachment" 
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download Attachment Image</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO & DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDocModal && (
        <PhotoPreviewLightboxModal
          isOpen={Boolean(previewDocModal)}
          onClose={() => setPreviewDocModal(null)}
          imageUrl={previewDocModal.url}
          title={previewDocModal.title}
          filename={previewDocModal.filename}
        />
      )}

      {/* Operator Account Create/Edit Modal */}
      <AnimatePresence>
        {isOperatorModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <span>👨‍💻</span>
                  <span>{editingOperator ? 'Edit Operator Login ID' : 'Create Operator Login ID'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOperatorModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!opName || !opMobile) {
                    alert('Name and Mobile number are required.');
                    return;
                  }

                  try {
                    localStorage.setItem('operator_custom_quick_chats', JSON.stringify(opQuickChats));
                  } catch (err) {
                    console.error('Failed to save operator quick chats:', err);
                  }

                  const bodyData = {
                    name: opName,
                    mobileNumber: opMobile,
                    password: opPassword,
                    role: 'OPERATOR',
                    operatorLabel: opLabel,
                    assignedServiceIds: opAssignedServices,
                  };

                  if (editingOperator) {
                    await fetch(`/api/admin/users/${editingOperator.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(bodyData),
                    });
                  } else {
                    await fetch('/api/admin/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(bodyData),
                    });
                  }

                  setIsOperatorModalOpen(false);
                  refreshUser();
                  fetchData();
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1">
                  <label className="font-black text-slate-700 block">Operator Full Name / नाम</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma (Aadhaar Staff)"
                    value={opName}
                    onChange={e => setOpName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-black text-slate-700 block">Mobile Number (Login ID)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={opMobile}
                      onChange={e => setOpMobile(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-black text-slate-700 block">Login Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Password"
                      value={opPassword}
                      onChange={e => setOpPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-black text-slate-700 block">Department / Role Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhaar & PAN Operator"
                    value={opLabel}
                    onChange={e => setOpLabel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-black text-slate-800 block flex items-center justify-between">
                    <span>Select Assigned Services (अनुमति प्राप्त सर्विसेज)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (opAssignedServices.length === services.length) {
                          setOpAssignedServices([]);
                        } else {
                          setOpAssignedServices(services.map(s => s.id));
                        }
                      }}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      {opAssignedServices.length === services.length ? 'Deselect All' : 'Select All Services'}
                    </button>
                  </label>

                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {[...services].sort((a, b) => (a.priority || 999999) - (b.priority || 999999)).map(srv => {
                      const isChecked = opAssignedServices.includes(srv.id);
                      return (
                        <label
                          key={srv.id}
                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-bold text-xs">{srv.title} ({srv.category})</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setOpAssignedServices(prev => prev.filter(id => id !== srv.id));
                              } else {
                                setOpAssignedServices(prev => [...prev, srv.id]);
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Chat Templates Config for Operator */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-black text-slate-800 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Operator Quick Chat Shortcuts (क्विक चैट रिप्लाई)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Active Shortcuts: {opQuickChats.length}</span>
                  </label>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Set default quick response buttons for this operator (e.g. server down hai, finger lagao, otp):
                  </p>

                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto">
                    {opQuickChats.map((chatText, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-800 text-white rounded-xl text-[10px] font-extrabold shadow-2xs">
                        <span>{chatText}</span>
                        <button
                          type="button"
                          onClick={() => setOpQuickChats(prev => prev.filter((_, i) => i !== idx))}
                          className="hover:text-rose-200 ml-0.5 font-black cursor-pointer text-xs"
                          title="Remove quick reply"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add custom shortcut (e.g. server down hai)"
                      value={newOpQuickChatInput}
                      onChange={(e) => setNewOpQuickChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newOpQuickChatInput.trim()) return;
                          if (!opQuickChats.includes(newOpQuickChatInput.trim())) {
                            setOpQuickChats(prev => [...prev, newOpQuickChatInput.trim()]);
                          }
                          setNewOpQuickChatInput('');
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newOpQuickChatInput.trim()) return;
                        if (!opQuickChats.includes(newOpQuickChatInput.trim())) {
                          setOpQuickChats(prev => [...prev, newOpQuickChatInput.trim()]);
                        }
                        setNewOpQuickChatInput('');
                      }}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOperatorModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                  >
                    {editingOperator ? 'Update Operator' : 'Create Operator'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATABASE BACKUP & EXPORT MODAL */}
      <DatabaseExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* UTI PAN RESIZER TOOL MODAL */}
      <UTIPanResizerModal
        isOpen={isPanResizerOpen}
        onClose={() => {
          setIsPanResizerOpen(false);
          setPanResizerRequest(null);
          setPanResizerInitialImage(null);
        }}
        request={panResizerRequest}
        initialPhoto={panResizerInitialImage}
        initialSig={panResizerInitialImage}
      />

      {/* CUSTOM NOTICE BANNER MODAL (No prompt used, works perfectly in AI Studio iframe preview) */}
      {noticeModalService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span>📢 Edit Notice Banner</span>
              </h3>
              <button
                onClick={() => setNoticeModalService(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 mb-1.5">
                Notice / Announcement Banner for <span className="text-indigo-600 font-extrabold">{noticeModalService.title}</span>:
              </p>
              <textarea
                value={noticeInputText}
                onChange={(e) => setNoticeInputText(e.target.value)}
                placeholder="e.g., Puc Without OTP Service Again Working ❤️ (Leave blank to remove notice)"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setNoticeModalService(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleUpdateServiceField(noticeModalService, {
                    announcementBanner: noticeInputText.trim(),
                    warningNotice: noticeInputText.trim()
                  });
                  setNoticeModalService(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Save Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PRIORITY SERIAL ORDER MODAL (No prompt used, works perfectly in AI Studio iframe preview) */}
      {priorityModalService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span>🔢 Set Serial Priority Order</span>
              </h3>
              <button
                onClick={() => setPriorityModalService(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">
                Set Serial Number for <span className="text-indigo-600 font-extrabold">{priorityModalService.title}</span>:
              </p>
              <input
                type="number"
                min="1"
                value={priorityInputVal}
                onChange={(e) => setPriorityInputVal(e.target.value)}
                placeholder="Enter position (e.g. 1, 2, 5...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter 1 to move to top position, 2 for second position, etc.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPriorityModalService(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const val = Number(priorityInputVal);
                  if (!isNaN(val) && val > 0) {
                    await handleUpdateServiceField(priorityModalService, { priority: val });
                  }
                  setPriorityModalService(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Set Serial Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL (No confirm popup used, works perfectly in AI Studio iframe preview) */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-rose-600 text-base flex items-center gap-2">
                <span>⚠️ {deleteConfirmModal.title || 'Confirm Action'}</span>
              </h3>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              {deleteConfirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteConfirmModal.onConfirm();
                  setDeleteConfirmModal(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
