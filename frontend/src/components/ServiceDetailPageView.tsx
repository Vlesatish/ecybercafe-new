import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CitizenService, ServiceRequest, User, formatDDMMYYYY, getServicePriceForUser, PaymentOrder, MerchantConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { uploadFileToServer } from '../utils/upload';
import { getFormFieldLabel, getFilteredFormDataEntries, getRequestPdfUrl, cleanAdminRemarks } from '../utils/formUtils';
import { triggerFlowerShowerCelebration } from '../utils/celebration';
import { PaymentModal } from './PaymentModal';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Wallet,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  Upload,
  MapPin,
  Copy,
  Check,
  Printer,
  Download,
  Search,
  Filter,
  RotateCw,
  Bell,
  Star,
  FileText,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  PlusCircle,
  X,
  FileCheck,
  AlertTriangle,
  ShieldAlert,
  Info,
  ZoomIn,
  Zap,
  Crop,
  Camera,
  Megaphone,
  ExternalLink
} from 'lucide-react';
import { ImageCompressorModal } from './ImageCompressorModal';
import { ImageCropModal } from './ImageCropModal';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';
import { FormAttachmentDocumentCard } from './FormAttachmentDocumentCard';
import { FormAttachmentImageCard } from './FormAttachmentImageCard';

interface ServiceDetailPageViewProps {
  service: CitizenService;
  requests: ServiceRequest[];
  onBack: () => void;
  onOpenWallet: () => void;
  onRequestSubmittedSuccess: (reqId: string) => void;
  onOpenChat: (req: ServiceRequest) => void;
}

export const ServiceDetailPageView: React.FC<ServiceDetailPageViewProps> = ({
  service,
  requests,
  onBack,
  onOpenWallet,
  onRequestSubmittedSuccess,
  onOpenChat
}) => {
  const { user, updateLocalWallet, refreshUser } = useAuth();

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [effectivePrice, setEffectivePrice] = useState<number>(() => getServicePriceForUser(service, user).displayPrice);
  const [priceNote, setPriceNote] = useState<string>('');
  const [availableBlockRates, setAvailableBlockRates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [walletDeductedAnim, setWalletDeductedAnim] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewDetailReq, setViewDetailReq] = useState<ServiceRequest | null>(null);
  const [printReq, setPrintReq] = useState<ServiceRequest | null>(null);
  const [showNoticeImageZoom, setShowNoticeImageZoom] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; filename?: string; filesize?: string } | null>(null);

  // Compressor Modal state
  const [compressorModalOpen, setCompressorModalOpen] = useState(false);
  const [activeCompressorFieldId, setActiveCompressorFieldId] = useState<string | null>(null);
  const [activeCompressorFile, setActiveCompressorFile] = useState<File | null>(null);
  const [activeCompressorMaxMb, setActiveCompressorMaxMb] = useState<number>(2);

  // In-Place Quick Deficit Recharge Modal State
  const [showDirectPaymentModal, setShowDirectPaymentModal] = useState<boolean>(false);
  const [rechargeDeficitAmount, setRechargeDeficitAmount] = useState<number>(0);
  const [merchantConfig] = useState<MerchantConfig>({
    apiToken: '737bb1-df709c-d3e73f-e1fb9f-699985',
    merchantVpa: 'ecybercafe@upi',
    merchantName: 'eCyberCafe Digital Services',
    adminPassword: 'admin123',
    bwPricePerPage: 2,
    colorPricePerPage: 10,
    aadhaarPrice: 15
  });

  const handleOpenDirectRecharge = () => {
    const deficit = Math.max(1, +(effectivePrice - currentWallet).toFixed(2));
    setRechargeDeficitAmount(deficit);
    setShowDirectPaymentModal(true);
  };

  // Image Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [activeCropFieldId, setActiveCropFieldId] = useState<string | null>(null);
  const [activeCropInitialImg, setActiveCropInitialImg] = useState<File | string | null>(null);
  const [activeCropMaxMb, setActiveCropMaxMb] = useState<number>(2);

  const handleApplyCroppedImage = (_file: File, uploadResult?: { url: string; filename: string; size: string }) => {
    if (activeCropFieldId && uploadResult) {
      handleInputChange(activeCropFieldId, uploadResult.url);
      handleInputChange(`${activeCropFieldId}_filename`, uploadResult.filename);
      handleInputChange(`${activeCropFieldId}_filesize`, uploadResult.size);
      setSuccessToast(`✂️ Photo cropped & uploaded successfully! (${uploadResult.size})`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [expandedReqIds, setExpandedReqIds] = useState<Record<string, boolean>>({});

  const toggleReqExpand = (id: string) => {
    setExpandedReqIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Favorite Toggle initialization
  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('favorite_services') || '[]');
      setIsFavorite(favs.includes(service.id));
    } catch (e) {
      setIsFavorite(false);
    }
  }, [service.id]);

  const toggleFavorite = () => {
    try {
      const favs = JSON.parse(localStorage.getItem('favorite_services') || '[]');
      let updated: string[];
      if (favs.includes(service.id)) {
        updated = favs.filter((id: string) => id !== service.id);
        setIsFavorite(false);
      } else {
        updated = [...favs, service.id];
        setIsFavorite(true);
      }
      localStorage.setItem('favorite_services', JSON.stringify(updated));
    } catch (e) {}
  };

  // Draft Auto-Save Load
  useEffect(() => {
    const draftKey = `draft_service_${service.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (e) {}
    } else {
      setFormData({});
    }
  }, [service.id]);

  // Fetch block rates
  useEffect(() => {
    fetch('/api/block-rates')
      .then(res => safeJson(res, []))
      .then(rates => {
        if (Array.isArray(rates)) setAvailableBlockRates(rates);
      })
      .catch(err => console.error(err));
  }, []);

  // Recalculate price for Block Applications or Distributor Custom Rates
  useEffect(() => {
    const { displayPrice } = getServicePriceForUser(service, user);
    setEffectivePrice(displayPrice);
    setPriceNote('');
  }, [service, user]);

  useEffect(() => {
    const isBlockService = service.id === 'srv_block_app' || Boolean(formData.state && formData.district && formData.block);

    if (isBlockService && (formData.state || formData.district || formData.block)) {
      fetch('/api/block-rates/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: formData.state,
          district: formData.district,
          block: formData.block,
          appPrefix: formData.app_prefix,
          appNumber: formData.app_number
        })
      })
        .then(res => safeJson(res))
        .then(data => {
          if (data && typeof data.price === 'number') {
            setEffectivePrice(data.price);
            setPriceNote(data.matchedNote || '');
          }
        })
        .catch(err => console.error('Block rate error:', err));
    }
  }, [service, formData.state, formData.district, formData.block, formData.app_prefix, formData.app_number]);

  // Save draft on form data update
  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [fieldId]: value };
      if (fieldId === 'district' && prev.district !== value) {
        updated.block = '';
      }
      localStorage.setItem(`draft_service_${service.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleFileUpload = async (fieldId: string, e: React.ChangeEvent<HTMLInputElement>, fieldMaxMb?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxMB = fieldMaxMb || 25;
      if (file.size > maxMB * 1024 * 1024) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        alert(`⚠️ File Size Warning / चेतावनी:\nSelected file size is ${sizeInMB} MB. Maximum allowed upload limit is ${maxMB} MB!`);
        e.target.value = '';
        return;
      }
      setUploadingField(fieldId);
      try {
        const uploaded = await uploadFileToServer(file, maxMB);
        handleInputChange(fieldId, uploaded.url);
        handleInputChange(`${fieldId}_filename`, uploaded.filename || file.name);
        handleInputChange(`${fieldId}_filesize`, uploaded.size || `${(file.size / 1024).toFixed(1)} KB`);
        setSuccessToast(`✅ Photo / Document attached! (${uploaded.size || `${(file.size / 1024).toFixed(1)} KB`})`);
        setTimeout(() => setSuccessToast(null), 3000);
      } catch (err: any) {
        alert(`⚠️ ${err.message || 'Server error during upload'}`);
      } finally {
        setUploadingField(null);
        e.target.value = '';
      }
    }
  };

  const handleApplyCompressedFile = (_compressedFile: File, uploadResult?: { url: string; filename: string; size: string }) => {
    if (activeCompressorFieldId && uploadResult) {
      handleInputChange(activeCompressorFieldId, uploadResult.url);
      handleInputChange(`${activeCompressorFieldId}_filename`, uploadResult.filename);
      handleInputChange(`${activeCompressorFieldId}_filesize`, uploadResult.size);
      setSuccessToast(`⚡ Image compressed & uploaded successfully! (${uploadResult.size})`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleRemoveFile = (fieldId: string) => {
    setFormData(prev => {
      const copy = { ...prev };
      delete copy[fieldId];
      delete copy[`${fieldId}_filename`];
      delete copy[`${fieldId}_filesize`];
      localStorage.setItem(`draft_service_${service.id}`, JSON.stringify(copy));
      return copy;
    });
  };

  const currentWallet = user?.walletBalance || 0;
  const isBalanceSufficient = currentWallet >= effectivePrice;

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorToast('Please log in to submit requests.');
      return;
    }

    if (!isBalanceSufficient) {
      setErrorToast(`Insufficient Wallet Balance! Required: ₹${effectivePrice.toFixed(2)}, Available: ₹${currentWallet.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorToast(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          retailerId: user.id,
          formData
        })
      });

      const data = await res.json();

      if (res.ok && data.request) {
        // Clear draft
        localStorage.removeItem(`draft_service_${service.id}`);
        setFormData({});

        // Trigger wallet animation
        setWalletDeductedAnim(effectivePrice);
        setTimeout(() => setWalletDeductedAnim(null), 2500);

        if (data.remainingWalletBalance !== undefined) {
          updateLocalWallet(data.remainingWalletBalance);
        }
        refreshUser();

        if (data.request?.status === 'COMPLETED') {
          const reqFD = data.request.formData || {};
        }

        setSuccessToast(`Request #${data.request.requestNumber} submitted successfully! Fee ₹${effectivePrice.toFixed(2)} deducted.`);
        setTimeout(() => setSuccessToast(null), 4000);

        onRequestSubmittedSuccess(data.request.id);
      } else {
        const apiErrMsg = data?.error || data?.apiError || 'Failed to submit request.';
        if (data?.remainingWalletBalance !== undefined) {
          updateLocalWallet(data.remainingWalletBalance);
        }
        refreshUser();
        setErrorToast(apiErrMsg);
      }
    } catch (err: any) {
      const msg = err.message || 'Error communicating with server.';
      refreshUser();
      setErrorToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Duplicate Previous Request
  const handleDuplicate = (req: ServiceRequest) => {
    if (req.formData) {
      setFormData(req.formData);
      localStorage.setItem(`draft_service_${service.id}`, JSON.stringify(req.formData));
      setSuccessToast(`Copied details from Request #${req.requestNumber}!`);
      setTimeout(() => setSuccessToast(null), 3000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter requests belonging to this service or overall
  const serviceRequests = requests.filter(r => r.serviceId === service.id || r.serviceTitle.toLowerCase() === service.title.toLowerCase());

  const filteredRequests = serviceRequests.filter(r => {
    // Status Filter
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const reqNum = String(r.requestNumber);
      const name = String(r.formData?.fullName || r.formData?.name || r.formData?.applicant_name || '').toLowerCase();
      const epic = String(r.formData?.epic_number || r.formData?.ration_number || r.formData?.aadhaar_number || '').toLowerCase();
      if (!reqNum.includes(q) && !name.includes(q) && !epic.includes(q) && !r.serviceTitle.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Date Filter
    if (dateFilter !== 'ALL') {
      const created = new Date(r.createdAt);
      const now = new Date();
      if (dateFilter === 'TODAY') {
        if (created.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (created < weekAgo) return false;
      } else if (dateFilter === 'MONTH') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (created < monthAgo) return false;
      }
    }

    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshUser();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6 text-[#111827] pb-20 font-sans">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-[#111827] rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#111827]" />
          <span>Back to Services</span>
        </button>
      </div>

      {/* TOAST MESSAGES */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-600 text-white rounded-[18px] shadow-md flex items-center justify-between text-xs font-bold"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="p-1 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-600 text-white rounded-[18px] shadow-md flex items-center justify-between text-xs font-bold"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorToast}</span>
            </div>
            <button onClick={() => setErrorToast(null)} className="p-1 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN 2-COLUMN LAYOUT (LEFT 40% STICKY FORM, RIGHT 60% SCROLLABLE REQUESTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT PANEL (40% - STICKY FORM) ================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-5">
          <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-5 sm:p-6 shadow-sm space-y-5">
            {/* Service Title & Fee Banner */}
            <div className="p-4.5 bg-slate-50 border border-[#E5E7EB] rounded-2xl shadow-2xs space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#2563EB] p-0.5 shadow-2xs flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-white rounded-[14px] flex flex-col items-center justify-center p-0.5 text-center overflow-hidden">
                      {service.iconUrl ? (
                        <img src={service.iconUrl} alt={service.title} className="w-full h-full object-cover rounded-[12px]" />
                      ) : (
                        <FileCheck className="w-7 h-7 text-[#2563EB]" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="font-black text-base text-[#111827] leading-tight">
                      {service.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-[#2563EB] border border-blue-200 rounded-md text-[10px] font-black uppercase">
                        {service.badge || 'NEW'}
                      </span>
                      {service.isDistributorOnly && (
                        <span className="px-2 py-0.5 bg-amber-500 text-slate-950 border border-amber-300 rounded-md text-[10px] font-black uppercase flex items-center gap-1 shadow-xs">
                          <ShieldCheck className="w-3 h-3 text-slate-950" />
                          <span>DISTRIBUTOR ONLY</span>
                        </span>
                      )}
                      <span className="text-xs text-[#475569] font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {service.processingTime || '10-15 MIN'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Announcement Notice Banner Pill */}
              {service.announcementBanner && service.announcementBanner !== service.warningNotice && (
                <div className="pt-2 border-t border-slate-200 relative z-10">
                  <div className="bg-gradient-to-r from-amber-100/90 via-amber-50 to-orange-100/90 border border-amber-300/90 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-950 shadow-2xs">
                    <span className="text-sm shrink-0">📢</span>
                    <span className="leading-snug">{service.announcementBanner}</span>
                  </div>
                </div>
              )}

              {/* Price Row */}
              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs relative z-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#475569] font-medium">Service Fee:</span>
                  <span className="text-base font-black text-[#2563EB]">₹{effectivePrice.toFixed(2)}</span>
                  {priceNote && (
                    <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-md text-[10px] font-bold">
                      {priceNote}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] block font-medium">Your Wallet</span>
                  <span className={`font-black text-xs ${isBalanceSufficient ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹{currentWallet.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* SERVICE WARNING / CAUTION ALERT CARD OVERLAY */}
            {(service.warningNotice || service.warningImage) && (
              <div className={`p-4 rounded-2xl border shadow-sm space-y-3 relative overflow-hidden transition-all ${
                service.warningType === 'critical'
                  ? 'bg-gradient-to-br from-rose-50 via-rose-100/60 to-rose-50 border-rose-300/90 text-rose-950'
                  : service.warningType === 'info'
                  ? 'bg-gradient-to-br from-blue-50 via-indigo-50/60 to-blue-50 border-blue-300/90 text-blue-950'
                  : 'bg-gradient-to-br from-amber-50 via-amber-100/60 to-amber-50 border-amber-300/90 text-amber-950'
              }`}>
                <div className={`flex items-center justify-between border-b pb-2 ${
                  service.warningType === 'critical' ? 'border-rose-200/80' : service.warningType === 'info' ? 'border-blue-200/80' : 'border-amber-200/80'
                }`}>
                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                    {service.warningType === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                    ) : service.warningType === 'info' ? (
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Megaphone className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                    )}
                    <span className={service.warningType === 'critical' ? 'text-rose-700' : service.warningType === 'info' ? 'text-blue-700' : 'text-amber-800'}>
                      {service.warningType === 'critical' ? '🚨 अति आवश्यक चेतावनी (Critical Alert)' : service.warningType === 'info' ? 'ℹ️ आवश्यक निर्देश (Important Notice)' : '📢 सावधानियां व आवश्यक निर्देश (CAUTION)'}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border shadow-2xs ${
                    service.warningType === 'critical' ? 'bg-rose-600 text-white border-rose-400' : service.warningType === 'info' ? 'bg-blue-600 text-white border-blue-400' : 'bg-amber-500 text-slate-950 border-amber-300'
                  }`}>
                    सावधान रहें
                  </span>
                </div>

                {service.warningNotice && (
                  <p className="text-xs font-bold leading-relaxed whitespace-pre-line text-slate-900">
                    {service.warningNotice}
                  </p>
                )}

                {service.warningImage && (
                  <div className="pt-1">
                    <div 
                      onClick={() => setShowNoticeImageZoom(service.warningImage!)}
                      className="relative group rounded-xl overflow-hidden border border-slate-300/80 shadow-xs cursor-pointer max-h-52 bg-slate-900 flex items-center justify-center"
                    >
                      <img 
                        src={service.warningImage} 
                        alt="Warning Notice Guide Banner" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs gap-1.5 backdrop-blur-2xs">
                        <ZoomIn className="w-4 h-4 text-amber-300" />
                        <span>इमेज बड़ा करके देखें (Click to Zoom)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Insufficient Wallet Warning Callout */}
            {!isBalanceSufficient && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2 text-rose-900 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Wallet balance low! Add ₹{(effectivePrice - currentWallet).toFixed(2)} to proceed.</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenDirectRecharge}
                  className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 transition-all"
                  title="Click to open instant UPI QR code for this deficit amount"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Recharge (₹{(effectivePrice - currentWallet).toFixed(2)})</span>
                </button>
              </div>
            )}

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {service.fields && service.fields.length > 0 ? (
                service.fields.map(field => (
                  <div key={field.id} className="space-y-2 bg-gradient-to-br from-white via-slate-50/80 to-blue-50/30 p-4 sm:p-4.5 rounded-2xl border-2 border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all">
                    <label className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 shadow-2xs"></span>
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-600 font-black">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        rows={3}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 rounded-xl text-slate-900 font-extrabold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all placeholder:text-slate-400 placeholder:font-normal"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 rounded-xl text-slate-900 font-extrabold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-blue-500/15 shadow-2xs transition-all cursor-pointer"
                      >
                        <option value="">-- Select {field.label} --</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'file' ? (
                      <div className="space-y-2">
                        {uploadingField === field.id ? (
                          <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-2xl flex items-center justify-center gap-3 text-blue-900 shadow-xs animate-pulse">
                            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                            <div>
                              <p className="font-extrabold text-xs sm:text-sm text-blue-950">Uploading & processing photo / document...</p>
                              <p className="text-[11px] text-blue-700 font-bold">कृपया प्रतीक्षा करें, फाइल लोड हो रही है...</p>
                            </div>
                          </div>
                        ) : formData[field.id] ? (
                          (() => {
                            const fileVal = formData[field.id];
                            const fileName = formData[`${field.id}_filename`] || (typeof fileVal === 'string' ? fileVal.split('/').pop() : 'Uploaded File') || 'Uploaded File';
                            const fileSize = formData[`${field.id}_filesize`] || '';
                            
                            const isPdf = Boolean(
                              (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf')) ||
                              (typeof fileVal === 'string' && (
                                fileVal.toLowerCase().endsWith('.pdf') ||
                                fileVal.toLowerCase().includes('.pdf?') ||
                                fileVal.startsWith('data:application/pdf')
                              ))
                            );

                            const isImage = !isPdf && typeof fileVal === 'string' && (
                              fileVal.startsWith('data:image/') ||
                              fileVal.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i) ||
                              (typeof fileName === 'string' && Boolean(fileName.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i)))
                            );

                            return (
                              <div className={`p-3.5 rounded-2xl shadow-xs space-y-3 border-2 ${
                                isPdf 
                                  ? 'bg-gradient-to-br from-red-50/90 via-rose-50/40 to-red-50/90 border-red-300' 
                                  : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-emerald-50/90 border-emerald-400'
                              }`}>
                                {/* Top Preview & File Details Card */}
                                <div className="flex items-center gap-3.5 min-w-0">
                                  {/* Visual Live Photo Preview Thumbnail */}
                                  {isImage ? (
                                    <div
                                      onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                      className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-950 w-16 h-16"
                                      title="Click to Zoom / बड़ी फोटो देखें"
                                    >
                                      <img
                                        src={fileVal}
                                        alt={fileName}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <ZoomIn className="w-5 h-5" />
                                      </div>
                                      <span className="absolute bottom-0 inset-x-0 bg-emerald-700/95 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-wider">
                                        Photo
                                      </span>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                      className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0 border-2 border-red-400 flex flex-col items-center justify-center cursor-pointer hover:bg-red-200 transition-all w-16 h-16 shadow-xs group"
                                      title="Click to view PDF document / पीडीएफ देखें"
                                    >
                                      <FileText className="w-6 h-6 mb-0.5 text-red-600 group-hover:scale-110 transition-transform" />
                                      <span className="text-[8px] font-black uppercase text-red-800 font-bold">PDF Doc</span>
                                    </div>
                                  )}

                                  {/* File details info stack */}
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isPdf ? (
                                        <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-md uppercase tracking-wider whitespace-nowrap shadow-2xs">
                                          📄 PDF Document
                                        </span>
                                      ) : isImage ? (
                                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-md uppercase tracking-wider whitespace-nowrap shadow-2xs">
                                          🖼️ Photo Attached
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md uppercase tracking-wider whitespace-nowrap shadow-2xs">
                                          📁 File Attached
                                        </span>
                                      )}
                                      {fileSize && (
                                        <span className="px-2 py-0.5 bg-white text-slate-800 border border-slate-300 font-extrabold text-[10px] rounded-md font-mono whitespace-nowrap shadow-2xs">
                                          {fileSize}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-extrabold text-xs sm:text-sm text-slate-900 truncate" title={fileName}>
                                      {fileName}
                                    </p>
                                    <p className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                                      <span className="text-emerald-700 font-bold">✅ Uploaded & Ready</span>
                                      <span className="text-slate-400">•</span>
                                      <span 
                                        className="text-blue-700 font-bold cursor-pointer hover:underline" 
                                        onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                      >
                                        {isPdf ? 'Open PDF Preview' : 'Click to Zoom'}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {/* Bottom Action Buttons Grid Toolbar */}
                                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t ${
                                  isPdf ? 'border-red-200' : 'border-emerald-200'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                    className="w-full py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95 whitespace-nowrap"
                                    title="Open Full Size Preview"
                                  >
                                    <Eye className="w-3.5 h-3.5 shrink-0" />
                                    <span>{isPdf ? 'View PDF' : 'Zoom View'}</span>
                                  </button>

                                  {isImage ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveCropFieldId(field.id);
                                        setActiveCropInitialImg(fileVal);
                                        setActiveCropMaxMb(field.maxFileSizeMb || 2);
                                        setCropModalOpen(true);
                                      }}
                                      className="w-full py-2 px-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95 whitespace-nowrap"
                                      title="Crop or Rotate Image"
                                    >
                                      <Crop className="w-3.5 h-3.5 shrink-0" />
                                      <span>✂️ Crop</span>
                                    </button>
                                  ) : (
                                    <a
                                      href={fileVal}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-full py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-extrabold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                                    >
                                      <FileText className="w-3.5 h-3.5 shrink-0 text-red-600" />
                                      <span>New Tab</span>
                                    </a>
                                  )}

                                  <label className="w-full py-2 px-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors active:scale-95 whitespace-nowrap">
                                    <Upload className="w-3.5 h-3.5 shrink-0" />
                                    <span>Change</span>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={(e) => handleFileUpload(field.id, e, field.maxFileSizeMb)}
                                      className="hidden"
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(field.id)}
                                    className="w-full py-2 px-2 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 font-extrabold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
                                    title="Remove this photo"
                                  >
                                    <X className="w-3.5 h-3.5 shrink-0" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="space-y-2">
                            <label className="border-2 border-dashed border-slate-300 hover:border-blue-600 bg-white hover:bg-blue-50/40 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-2xs">
                              <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-600 transition-colors mb-1.5" />
                              <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                                Upload Document / Photo (PDF / JPG / PNG)
                              </span>
                              <span className="text-[11px] text-amber-700 font-extrabold mt-0.5">Drag & drop or click to browse (Max Limit: {field.maxFileSizeMb || 2} MB / अधिकतम {field.maxFileSizeMb || 2} MB)</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                required={field.required}
                                onChange={(e) => handleFileUpload(field.id, e, field.maxFileSizeMb)}
                                className="hidden"
                              />
                            </label>

                            <div className={`grid gap-2 ${service.enableCompressionTool || field.enableCompression ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCropFieldId(field.id);
                                  setActiveCropInitialImg(null);
                                  setActiveCropMaxMb(field.maxFileSizeMb || 25);
                                  setCropModalOpen(true);
                                }}
                                className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-xs rounded-xl border border-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Crop className="w-4 h-4 text-amber-600" />
                                <span>✂️ Crop Photo / फोटो क्रॉप करें</span>
                              </button>

                              {(service.enableCompressionTool || field.enableCompression) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCompressorFieldId(field.id);
                                    setActiveCompressorFile(null);
                                    setActiveCompressorMaxMb(field.maxFileSizeMb || 2);
                                    setCompressorModalOpen(true);
                                  }}
                                  className="py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-900 font-black text-xs rounded-xl border border-sky-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Zap className="w-4 h-4 text-sky-600 fill-sky-600/30" />
                                  <span>⚡ Compressor Tool (&lt;200 KB)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : field.type === 'formatted_date' ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          required={field.required}
                          maxLength={10}
                          placeholder={field.placeholder || 'DD-MM-YYYY (e.g. 15-08-1995)'}
                          value={formData[field.id] || ''}
                          onChange={(e) => {
                            const formatted = formatDDMMYYYY(e.target.value, formData[field.id] || '');
                            handleInputChange(field.id, formatted);
                          }}
                          className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 rounded-xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/15 font-mono font-extrabold tracking-wider shadow-2xs transition-all"
                        />
                        <p className="text-[11px] text-amber-700 font-extrabold">
                          📅 Format: DD-MM-YYYY (Type digits only, hyphens auto-insert e.g. 01122000 ➔ 01-12-2000)
                        </p>
                      </div>
                    ) : (
                      {...(() => {
                        const labelLower = field.label.toLowerCase();
                        const isAadhaar = labelLower.includes('aadhaar') || labelLower.includes('आधार') || field.id.includes('aadhaar');
                        const isMobile = labelLower.includes('mobile') || labelLower.includes('मोबाइल') || field.id.includes('mobile');
                        const maxLen = field.maxLength || (isAadhaar ? 12 : isMobile ? 10 : undefined);
                        const currentVal = String(formData[field.id] || '');

                        return (
                          <div className="space-y-1.5">
                            <input
                              type={isAadhaar || isMobile ? 'text' : field.type}
                              inputMode={isAadhaar || isMobile ? 'numeric' : undefined}
                              required={field.required}
                              maxLength={maxLen}
                              placeholder={field.placeholder || (isAadhaar ? 'Enter 12 Digit Aadhaar Number' : isMobile ? 'Enter 10 Digit Mobile Number' : `Enter ${field.label}`)}
                              value={currentVal}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (isAadhaar) {
                                  val = val.replace(/\D/g, '').slice(0, 12);
                                } else if (isMobile) {
                                  val = val.replace(/\D/g, '').slice(0, 10);
                                } else if (maxLen) {
                                  val = val.slice(0, maxLen);
                                }
                                handleInputChange(field.id, val);
                              }}
                              className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-slate-900 font-mono font-extrabold text-sm sm:text-base focus:outline-none focus:ring-4 transition-all shadow-2xs ${
                                isAadhaar && currentVal.length === 12
                                  ? 'border-emerald-500 focus:ring-emerald-500/20'
                                  : isAadhaar && currentVal.length > 0 && currentVal.length < 12
                                  ? 'border-amber-500 focus:ring-amber-500/20'
                                  : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-blue-500/15'
                              }`}
                            />
                            {isAadhaar && (
                              <div className="flex items-center justify-between text-[11px] px-1 font-extrabold">
                                <span className="text-slate-500">Aadhaar Requirement: 12 Digits</span>
                                <span className={currentVal.length === 12 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'}>
                                  {currentVal.length === 12 ? '✓ 12 / 12 Digits Valid' : `⚠️ ${currentVal.length} / 12 Digits`}
                                </span>
                              </div>
                            )}
                            {isMobile && (
                              <div className="flex items-center justify-between text-[11px] px-1 font-extrabold">
                                <span className="text-slate-500">Mobile Requirement: 10 Digits</span>
                                <span className={currentVal.length === 10 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'}>
                                  {currentVal.length === 10 ? '✓ 10 / 10 Digits Valid' : `⚠️ ${currentVal.length} / 10 Digits`}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    )}
                  </div>
                ))
              ) : (
                /* Fallback Default Fields */
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#111827] text-xs block uppercase tracking-wide">
                      • APPLICANT / EPIC CARD NUMBER <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TZX1234567 or Aadhaar Number"
                      value={formData.epic_number || formData.applicant_id || ''}
                      onChange={(e) => handleInputChange('epic_number', e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] text-[#111827] font-mono font-bold text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10 shadow-2xs transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#111827] text-xs block uppercase tracking-wide">
                        • STATE / राज्य <span className="text-rose-600">*</span>
                      </label>
                      <select
                        required
                        value={formData.state || 'Bihar'}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-3.5 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] text-[#111827] font-bold text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10 shadow-2xs cursor-pointer"
                      >
                        <option value="Bihar">Bihar</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Jharkhand">Jharkhand</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Delhi">Delhi</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#111827] text-xs block uppercase tracking-wide">
                        • MOBILE NUMBER <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10 Digit Mobile"
                        value={formData.mobile || ''}
                        onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] text-[#111827] font-semibold text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#111827] text-xs block uppercase tracking-wide">
                      • REMARKS / SPECIAL INSTRUCTIONS
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes for operator..."
                      value={formData.remarks || ''}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] text-[#111827] font-medium text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-500/10 shadow-2xs"
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isBalanceSufficient}
                className="w-full mt-2 py-3.5 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-sm rounded-[16px] shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Request (₹{effectivePrice.toFixed(2)})</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ================= RIGHT PANEL (60% - PREVIOUS REQUESTS CARDS) ================= */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-5 sm:p-6 shadow-sm space-y-5">
            {/* Header Title & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-[#111827] flex items-center gap-2">
                  <span>Previous Requests</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#2563EB] border border-blue-200">
                    {filteredRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-[#475569] mt-0.5">
                  Live status, operator updates & instant downloads
                </p>
              </div>

              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#111827] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">📅 All Time</option>
                  <option value="TODAY">Today Only</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                </select>
              </div>
            </div>

            {/* Search Box & Status Filter Pills */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#2563EB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search request #, applicant name, EPIC number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] focus:border-[#2563EB] focus:bg-white rounded-2xl text-xs font-medium text-[#111827] focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-2xs transition-all"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                {[
                  { id: 'ALL', label: 'All Requests' },
                  { id: 'PENDING', label: '⏳ Pending' },
                  { id: 'IN_PROCESS', label: '⚙️ Processing' },
                  { id: 'COMPLETED', label: '✅ Completed' },
                  { id: 'REJECTED', label: '❌ Rejected' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-[#2563EB] text-white shadow-2xs font-extrabold'
                        : 'bg-slate-100 text-[#475569] hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Cards Container */}
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center bg-[#F8FAFC] rounded-3xl border border-dashed border-[#E5E7EB] space-y-3">
                <div className="w-12 h-12 bg-blue-50 text-[#2563EB] rounded-2xl mx-auto flex items-center justify-center font-bold text-xl">
                  📄
                </div>
                <h4 className="font-extrabold text-sm text-[#111827]">No requests found</h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Submit a new request using the left form to see real-time updates here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map(req => {
                  const applicantName = req.formData?.fullName || req.formData?.name || req.formData?.applicant_name || 'Applicant';
                  const epicNo = req.formData?.epic_number || req.formData?.ration_number || req.formData?.aadhaar_number || req.formData?.id || 'N/A';
                  const isExpanded = Boolean(expandedReqIds[req.id]);

                  // Distinct Neon Border Class per status
                  const cardNeonClass = req.status === 'COMPLETED'
                    ? 'border-l-8 border-l-emerald-500 border-t border-r border-b border-emerald-200/90 shadow-[0_4px_16px_-2px_rgba(16,185,129,0.18)] hover:shadow-[0_8px_24px_-2px_rgba(16,185,129,0.28)] bg-gradient-to-r from-emerald-50/30 via-white to-white'
                    : req.status === 'IN_PROCESS'
                    ? 'border-l-8 border-l-blue-500 border-t border-r border-b border-blue-200/90 shadow-[0_4px_16px_-2px_rgba(37,99,235,0.18)] hover:shadow-[0_8px_24px_-2px_rgba(37,99,235,0.28)] bg-gradient-to-r from-blue-50/30 via-white to-white'
                    : req.status === 'REJECTED'
                    ? 'border-l-8 border-l-rose-500 border-t border-r border-b border-rose-200/90 shadow-[0_4px_16px_-2px_rgba(244,63,94,0.18)] hover:shadow-[0_8px_24px_-2px_rgba(244,63,94,0.28)] bg-gradient-to-r from-rose-50/30 via-white to-white'
                    : 'border-l-8 border-l-amber-500 border-t border-r border-b border-amber-200/90 shadow-[0_4px_16px_-2px_rgba(245,158,11,0.18)] hover:shadow-[0_8px_24px_-2px_rgba(245,158,11,0.28)] bg-gradient-to-r from-amber-50/30 via-white to-white';

                  const badgeBg = req.status === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : req.status === 'IN_PROCESS'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : req.status === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-amber-600 text-white shadow-2xs';

                  return (
                    <div
                      key={req.id}
                      className={`rounded-[18px] p-4 sm:p-5 transition-all space-y-3 relative overflow-hidden group ${cardNeonClass}`}
                    >
                      {/* Card Summary Row */}
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-xs ${badgeBg}`}>
                            #{req.requestNumber}
                          </span>
                          <button
                            onClick={() => copyToClipboard(String(req.requestNumber), req.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title="Copy Request Number"
                          >
                            {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-extrabold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Entry Time: {req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A'}</span>
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider flex items-center gap-1 shadow-2xs ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : req.status === 'IN_PROCESS'
                            ? 'bg-blue-100 text-blue-900 border-blue-300 animate-pulse'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {req.status === 'COMPLETED' && '✅ COMPLETED'}
                          {req.status === 'IN_PROCESS' && '⚙️ PROCESSING'}
                          {req.status === 'REJECTED' && '❌ REJECTED'}
                          {req.status === 'PENDING' && '⏳ PENDING'}
                        </span>
                      </div>

                      {/* Dynamic Form Input Details according to service */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Form Inputs Data
                          </span>
                          <button
                            onClick={() => toggleReqExpand(req.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          >
                            <span>{isExpanded ? 'Less Details' : 'More Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(() => {
                            const filteredEntries = getFilteredFormDataEntries(req.formData, service);
                            if (filteredEntries.length === 0) {
                              return <div className="col-span-full text-xs text-slate-400 italic">No input details</div>;
                            }
                            return filteredEntries.map((entry) => {
                              const strVal = String(entry.value || '');

                              if (entry.isImage) {
                                return (
                                  <div key={entry.key} className="col-span-full sm:col-span-1">
                                    <FormAttachmentImageCard
                                      fieldLabel={entry.label}
                                      imgUrl={entry.value}
                                      requestNumber={req.requestNumber}
                                      onZoom={(url) => setPreviewModalImage({ url, title: entry.label, filename: entry.key })}
                                    />
                                  </div>
                                );
                              }

                              if (entry.isPdf || entry.isFile) {
                                return (
                                  <div key={entry.key} className="col-span-full sm:col-span-1">
                                    <FormAttachmentDocumentCard
                                      fieldLabel={entry.label}
                                      fileUrl={entry.value}
                                      onPreview={(url, label) => setPreviewModalImage({ url, title: label, filename: strVal.split('/').pop() || 'document.pdf' })}
                                      fileName={strVal.split('/').pop() || 'document.pdf'}
                                    />
                                  </div>
                                );
                              }

                              return (
                                <div key={entry.key} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-center min-w-0 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase block truncate">
                                    {entry.label}
                                  </span>
                                  <span className="font-black text-slate-900 block break-words break-all text-[11px] mt-0.5 leading-snug">
                                    {strVal}
                                  </span>
                                </div>
                              );
                            });
                          })()}

                          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 flex flex-col justify-center shadow-2xs">
                            <span className="text-[9px] font-bold text-blue-600 uppercase block">
                              Fee Charged
                            </span>
                            <span className="font-black text-blue-700 block text-[11px] mt-0.5">
                              ₹{req.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Uploaded Receiving / Output Document Section (Prominent) */}
                      {(() => {
                        const pdfUrl = getRequestPdfUrl(req);
                        if (pdfUrl) {
                          return (
                            <div className="p-3 bg-emerald-50/90 border-2 border-emerald-400 rounded-2xl space-y-2 shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                  <FileCheck className="w-4 h-4 text-emerald-600" />
                                  <span>Receiving / Output File (प्राप्ति रसीद तैयार है)</span>
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                                  READY
                                </span>
                              </div>

                              {req.adminRemarks && cleanAdminRemarks(req.adminRemarks) && (
                                <p className="text-xs font-semibold text-emerald-900 bg-emerald-100/70 p-2 rounded-xl border border-emerald-200">
                                  <strong className="font-extrabold text-emerald-950">Operator Remark:</strong> {cleanAdminRemarks(req.adminRemarks)}
                                </p>
                              )}

                              <div className="flex items-center gap-2 pt-0.5">
                                <a
                                  href={pdfUrl}
                                  download={`Receiving_${req.requestNumber}_${req.serviceTitle.replace(/\s+/g, '_')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Download PDF File (पीडीएफ डाउनलोड करें)</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const w = window.open();
                                    if (w) {
                                      if (pdfUrl.startsWith('data:image/')) {
                                        w.document.write(`<img src="${pdfUrl}" style="max-width:100%" />`);
                                      } else {
                                        w.location.href = pdfUrl;
                                      }
                                    }
                                  }}
                                  className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                              </div>
                            </div>
                          );
                        }
                        if (req.status === 'COMPLETED') {
                          return (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Request Processed & Completed</span>
                                </span>
                              </div>
                              {req.adminRemarks && cleanAdminRemarks(req.adminRemarks) && (
                                <p className="text-xs text-blue-800 font-medium pt-1">
                                  <strong>Operator Remark:</strong> {cleanAdminRemarks(req.adminRemarks)}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Expandable Section for More Details */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[#64748B] block text-[10px] font-medium">ID / Ref No</span>
                              <span className="font-mono font-bold text-[#111827] truncate block">
                                {epicNo}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] block text-[10px] font-medium">Submitted Time</span>
                              <span className="font-medium text-[#111827] block text-[11px]">
                                {new Date(req.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>

                          {/* Live Timeline Tracker Visualizer */}
                          <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#475569]">
                              <span>Submitted</span>
                              <span>Processing</span>
                              <span>{req.status === 'REJECTED' ? 'Rejected' : 'Completed'}</span>
                            </div>

                            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                              <div className={`h-full transition-all duration-500 ${
                                req.status === 'PENDING'
                                  ? 'w-1/3 bg-amber-500'
                                  : req.status === 'IN_PROCESS'
                                  ? 'w-2/3 bg-[#2563EB]'
                                  : req.status === 'COMPLETED'
                                  ? 'w-full bg-emerald-600'
                                  : 'w-full bg-rose-600'
                              }`} />
                            </div>
                          </div>

                          {/* Operator Remarks Callout */}
                          {req.adminRemarks && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                              <span className="font-bold">Operator Remark:</span> {req.adminRemarks}
                            </div>
                          )}

                          {/* Download PDF Button (if output file exists) */}
                          {req.outputAttachmentUrl && (
                            <a
                              href={req.outputAttachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download Output Document (PDF)</span>
                            </a>
                          )}

                          {/* Action Button Bar */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewDetailReq(req)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#111827] rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Full Form Data</span>
                              </button>

                              <button
                                onClick={() => handleDuplicate(req)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border border-blue-100"
                                title="Autofill Left Form with this request's details"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Duplicate</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPrintReq(req)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-[#475569] rounded-xl text-[11px] font-bold cursor-pointer"
                                title="Print Customer Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {service.enableChat !== false ? (
                                <button
                                  onClick={() => onOpenChat(req)}
                                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Operator Chat</span>
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-200 text-slate-500 rounded-xl font-semibold text-[10px] flex items-center gap-1 cursor-not-allowed" title="Chat system is disabled for this service by Admin">
                                  <MessageSquare className="w-3 h-3 text-slate-400" />
                                  <span>Chat Disabled</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewDetailReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Request Details #{viewDetailReq.requestNumber}
              </h3>
              <button onClick={() => setViewDetailReq(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <p><strong className="text-slate-500">Service:</strong> {viewDetailReq.serviceTitle}</p>
                <p><strong className="text-slate-500">Submitted On:</strong> {new Date(viewDetailReq.createdAt).toLocaleString()}</p>
                <p><strong className="text-slate-500">Charged Amount:</strong> ₹{viewDetailReq.price.toFixed(2)}</p>
                <p><strong className="text-slate-500">Status:</strong> {viewDetailReq.status}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 dark:text-white">Form Fields Submitted:</h4>
                <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl max-h-72 overflow-y-auto text-[11px] space-y-2">
                  {getFilteredFormDataEntries(viewDetailReq.formData, service).map((entry) => {
                    const strVal = String(entry.value || '');
                    if (entry.isPdf || entry.isFile || entry.isImage) {
                      return (
                        <div key={entry.key} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2 gap-2">
                          <span className="text-slate-600 dark:text-slate-300 font-bold truncate">{entry.label}:</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewModalImage({ url: entry.value, title: entry.label, filename: strVal.split('/').pop() || 'document.pdf' })}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-md shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                            <a
                              href={entry.value}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-[10px] rounded-md flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>New Tab</span>
                            </a>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={entry.key} className="flex justify-between border-b border-slate-200 dark:border-slate-700/50 pb-1 gap-2 font-mono">
                        <span className="text-slate-500 font-sans truncate">{entry.label}:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px] shrink-0">
                          {strVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewDetailReq(null)}
              className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {printReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 my-auto">
            <div className="text-center border-b pb-4 space-y-1">
              <h2 className="font-black text-lg text-blue-700">eCyberCafe Portal</h2>
              <p className="text-xs text-slate-500">Official Customer Acknowledgment Receipt</p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span>Receipt No:</span><strong>#{printReq.requestNumber}</strong></div>
              <div className="flex justify-between"><span>Date & Time:</span><span>{new Date(printReq.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Service Name:</span><strong>{printReq.serviceTitle}</strong></div>
              <div className="flex justify-between"><span>Applicant Name:</span><strong>{printReq.formData?.fullName || printReq.formData?.name || 'Customer'}</strong></div>
              <div className="flex justify-between"><span>Amount Paid:</span><strong className="text-emerald-600">₹{printReq.price.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Status:</span><strong className="uppercase">{printReq.status}</strong></div>
            </div>

            <div className="border-t pt-3 text-center text-[10px] text-slate-400">
              Thank you for using eCyberCafe Portal Citizen Services!
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setPrintReq(null)}
                className="px-4 py-2.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTICE IMAGE ZOOM LIGHTBOX MODAL */}
      {showNoticeImageZoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">Service Caution & Instruction Guide</span>
              </div>
              <button
                onClick={() => setShowNoticeImageZoom(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950">
              <img src={showNoticeImageZoom} alt="Full Notice Guide" className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg" />
            </div>
          </div>
        </div>
      )}
      {/* IMAGE COMPRESSOR MODAL */}
      <ImageCompressorModal
        isOpen={compressorModalOpen}
        onClose={() => setCompressorModalOpen(false)}
        initialFile={activeCompressorFile}
        onApplyCompressedFile={handleApplyCompressedFile}
        maxSizeLimitMb={activeCompressorMaxMb}
      />

      {/* IMAGE CROP MODAL */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        initialImage={activeCropInitialImg}
        maxSizeMb={activeCropMaxMb}
        fieldId={activeCropFieldId}
        onApplyCroppedImage={handleApplyCroppedImage}
      />

      {/* PHOTO & DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewModalImage && (
        <PhotoPreviewLightboxModal
          isOpen={Boolean(previewModalImage)}
          onClose={() => setPreviewModalImage(null)}
          imageUrl={previewModalImage.url}
          title={previewModalImage.title}
          filename={previewModalImage.filename}
          filesize={previewModalImage.filesize}
        />
      )}

      {/* IN-PLACE INSTANT DEFICIT RECHARGE UPI POPUP MODAL */}
      {showDirectPaymentModal && (
        <PaymentModal
          amount={rechargeDeficitAmount}
          description={`Recharge for ${service.title}`}
          merchantConfig={merchantConfig}
          onClose={() => setShowDirectPaymentModal(false)}
          onPaymentSuccess={async (paymentOrder: PaymentOrder) => {
            setShowDirectPaymentModal(false);
            triggerFlowerShowerCelebration(1000);
            setSuccessToast(`🎉 Wallet Recharged with ₹${paymentOrder.amount.toFixed(2)}! You can now submit your request.`);
            setTimeout(() => setSuccessToast(null), 5000);
            await refreshUser();
          }}
        />
      )}
    </div>
  );
};
