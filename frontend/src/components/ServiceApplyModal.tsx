import React, { useState, useEffect } from 'react';
import { CitizenService, User, formatDDMMYYYY, getServicePriceForUser, PaymentOrder, MerchantConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { uploadFileToServer } from '../utils/upload';
import { X, ShieldCheck, Wallet, Clock, Tag, IndianRupee, AlertCircle, CheckCircle, Send, Upload, MapPin, Sparkles, Zap, Crop, Camera, Megaphone, Eye, FileText, ZoomIn } from 'lucide-react';
import { triggerFlowerShowerCelebration } from '../utils/celebration';
import { PaymentModal } from './PaymentModal';
import { ImageCompressorModal } from './ImageCompressorModal';
import { ImageCropModal } from './ImageCropModal';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';

interface ServiceApplyModalProps {
  service: CitizenService | null;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet: () => void;
  onRequestSubmittedSuccess: (reqId: string) => void;
}

export const ServiceApplyModal: React.FC<ServiceApplyModalProps> = ({
  service,
  user,
  isOpen,
  onClose,
  onOpenWallet,
  onRequestSubmittedSuccess
}) => {
  const { updateLocalWallet, refreshUser } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [effectivePrice, setEffectivePrice] = useState<number>(service?.price || 0);
  const [priceNote, setPriceNote] = useState<string>('');
  const [availableBlockRates, setAvailableBlockRates] = useState<any[]>([]);
  const [customBlockName, setCustomBlockName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rawErrorResponse, setRawErrorResponse] = useState<any | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; filename?: string; filesize?: string } | null>(null);

  // In-place Quick Deficit Recharge Modal State
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

  // Image Compressor Modal state
  const [compressorModalOpen, setCompressorModalOpen] = useState(false);
  const [activeCompressorFieldId, setActiveCompressorFieldId] = useState<string | null>(null);
  const [activeCompressorFile, setActiveCompressorFile] = useState<File | null>(null);
  const [activeCompressorMaxMb, setActiveCompressorMaxMb] = useState<number>(2);

  // Image Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [activeCropFieldId, setActiveCropFieldId] = useState<string | null>(null);
  const [activeCropInitialImg, setActiveCropInitialImg] = useState<File | string | null>(null);
  const [activeCropMaxMb, setActiveCropMaxMb] = useState<number>(2);

  const handleApplyCroppedImage = (_file: File, uploadResult?: { url: string; filename: string; size: string }) => {
    if (activeCropFieldId && uploadResult) {
      setFormData(prev => ({
        ...prev,
        [activeCropFieldId]: uploadResult.url,
        [`${activeCropFieldId}_filename`]: uploadResult.filename,
        [`${activeCropFieldId}_filesize`]: uploadResult.size
      }));
      setErrorMsg('');
    }
  };

  // Fetch active block rates from API
  useEffect(() => {
    if (isOpen) {
      fetch('/api/block-rates')
        .then(res => safeJson(res, []))
        .then(rates => {
          if (Array.isArray(rates)) setAvailableBlockRates(rates);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // District to Block Mapping
  const districtBlocksMap: Record<string, string[]> = {
    Gaya: [
      'Konch', 'Tekari', 'Guraru', 'Bodhgaya', 'Belaganj', 'Khizarsarai', 'Manpur', 
      'Barachatti', 'Sherghati', 'Dobhi', 'Fatehpur', 'Wazirganj', 'Atri', 'Imamganj', 
      'Mohanpur', 'Tankuppa', 'Paraiya', 'Amas', 'Bankey Bazar', 'Dumaria'
    ],
    Aurangabad: [
      'Obra', 'Daudnagar', 'Nabinagar', 'Aurangabad', 'Barun', 'Haspura', 'Kutumba', 
      'Deo', 'Rafiganj', 'Madanpur'
    ],
    Patna: [
      'Patna Sadar', 'Danapur', 'Phulwari Sharif', 'Sampatchak', 'Fatuha', 'Khusrupur', 
      'Bakhtiarpur', 'Barh', 'Mokama', 'Bihta', 'Naubatpur', 'Bikram', 'Paliganj', 
      'Dulhin Bazar', 'Masaurhi', 'Punpun', 'Dhanarua'
    ],
    Nawada: [
      'Nawada', 'Roh', 'Pakribarawan', 'Kawakol', 'Kashi Chak', 'Akbarpur', 
      'Gobindpur', 'Rajauli', 'Mes Kaur', 'Sironda', 'Narhat', 'Hisua'
    ],
    Jehanabad: [
      'Jehanabad', 'Kako', 'Modanganj', 'Ghosi', 'Hulasganj', 'Makhdumpur', 'Ratni Faridpur'
    ],
    Rohtas: [
      'Sasaram', 'Dehri', 'Akhorigola', 'Nauhatta', 'Rohtas', 'Chenari', 'Sheosagar', 
      'Kargahar', 'Kochas', 'Dinara', 'Bikramganj', 'Dawath', 'Suryapura', 'Karakat', 'Sanjhauli'
    ],
    Arwal: [
      'Arwal', 'Kaler', 'Karpi', 'Sonbhadra Bansi Suryapur', 'Kurtha'
    ]
  };

  // Helper to get blocks for selected district (sorted with Rate Available blocks AT TOP)
  const getFilteredBlocksForDistrict = (selectedDistrict?: string) => {
    if (!selectedDistrict) {
      // If no district selected, merge default blocks
      return ['Konch', 'Tekari', 'Guraru', 'Obra', 'Bodhgaya', 'Belaganj', 'Daudnagar', 'Nabinagar'];
    }

    const normDist = selectedDistrict.trim().toLowerCase();
    
    // Find matching key in map
    const matchedKey = Object.keys(districtBlocksMap).find(k => k.toLowerCase() === normDist);
    const mappedBlocks = matchedKey ? districtBlocksMap[matchedKey] : [];

    // Blocks configured in admin block rates for this district
    const adminConfiguredBlocks = availableBlockRates
      .filter(r => r.district.trim().toLowerCase() === normDist)
      .map(r => r.block);

    // Set of configured blocks for O(1) lookup
    const configuredSet = new Set(adminConfiguredBlocks.map(b => b.trim().toLowerCase()));

    // Merge & deduplicate
    const combined = Array.from(new Set([...adminConfiguredBlocks, ...mappedBlocks]));

    // Sort: Configured blocks (Rate Available) come FIRST AT THE TOP, followed by remaining blocks
    combined.sort((a, b) => {
      const aHas = configuredSet.has(a.trim().toLowerCase());
      const bHas = configuredSet.has(b.trim().toLowerCase());
      if (aHas && !bHas) return -1; // a goes first
      if (!aHas && bHas) return 1;  // b goes first
      return a.localeCompare(b);
    });

    return combined.length > 0 
      ? combined 
      : ['Konch', 'Tekari', 'Guraru', 'Obra', 'Bodhgaya', 'Belaganj', 'Daudnagar', 'Nabinagar'];
  };

  // Reset or recalculate price when service or form data changes
  useEffect(() => {
    if (!service) return;
    const { displayPrice } = getServicePriceForUser(service, user);
    setEffectivePrice(displayPrice);
    setPriceNote('');
  }, [service, user]);

  useEffect(() => {
    if (!service) return;
    const isBlockService = service.id === 'srv_block_app' || Boolean(formData.state && formData.district && formData.block);
    
    if (isBlockService) {
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
        .catch(err => console.error('Block rate calculation error:', err));
    }
  }, [service, formData.state, formData.district, formData.block, formData.app_prefix, formData.app_number]);

  if (!isOpen || !service) return null;

  const currentWallet = user?.walletBalance || 0;
  const isBalanceSufficient = currentWallet >= effectivePrice;

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [fieldId]: value };
      // If District is changed, reset selected block so user picks a block belonging to new district
      if (fieldId === 'district' && prev.district !== value) {
        updated.block = '';
        updated.block_name = '';
      }
      return updated;
    });
  };

  const handleAutoFillSample = () => {
    if (!service || !service.fields) return;
    const filled: Record<string, any> = { ...formData };
    service.fields.forEach((field) => {
      const labelLower = field.label.toLowerCase();
      const idLower = field.id.toLowerCase();
      const isName = labelLower.includes('name') || labelLower.includes('नाम') || idLower.includes('name');
      const isAadhaar = !isName && (labelLower.includes('aadhaar') || labelLower.includes('आधार') || idLower.includes('aadhaar'));
      const isMobile = !isName && (labelLower.includes('mobile') || labelLower.includes('मोबाइल') || idLower.includes('mobile'));

      if (isAadhaar) {
        filled[field.id] = '777026959767';
      } else if (isName) {
        filled[field.id] = 'RAMESH KUMAR';
      } else if (isMobile) {
        filled[field.id] = '9876543210';
      } else if (idLower.includes('dob') || labelLower.includes('dob') || labelLower.includes('birth')) {
        filled[field.id] = '15-08-1995';
      } else if (idLower.includes('pan') || labelLower.includes('pan')) {
        filled[field.id] = 'ABCDE1234F';
      } else if (field.type === 'formatted_date') {
        filled[field.id] = '15-08-1995';
      } else if (field.type === 'select' && field.options && field.options.length > 0) {
        filled[field.id] = field.options[0];
      } else if (field.type === 'text' || field.type === 'number') {
        filled[field.id] = 'SAMPLE VALUE';
      }
    });
    setFormData(filled);
  };

  const handleFileUpload = async (fieldId: string, e: React.ChangeEvent<HTMLInputElement>, fieldMaxMb?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxMB = fieldMaxMb || 25;
      if (file.size > maxMB * 1024 * 1024) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        setErrorMsg(`⚠️ File Size Exceeds Limit: Selected file is ${sizeInMB} MB. Maximum allowed limit is ${maxMB} MB! (फाइल साइज़ ${sizeInMB} MB है).`);
        e.target.value = '';
        return;
      }
      setErrorMsg('');
      setUploadingField(fieldId);
      try {
        const uploaded = await uploadFileToServer(file, maxMB);
        setFormData(prev => ({
          ...prev,
          [fieldId]: uploaded.url,
          [`${fieldId}_filename`]: uploaded.filename || file.name,
          [`${fieldId}_filesize`]: uploaded.size || `${(file.size / 1024).toFixed(1)} KB`
        }));
      } catch (err: any) {
        setErrorMsg(`⚠️ ${err.message || 'Server error during upload'}`);
        alert(`⚠️ Upload Warning: ${err.message || 'Server error'}`);
      } finally {
        setUploadingField(null);
        e.target.value = '';
      }
    }
  };

  const handleApplyCompressedFile = (_file: File, uploadResult?: { url: string; filename: string; size: string }) => {
    if (activeCompressorFieldId && uploadResult) {
      setFormData(prev => ({
        ...prev,
        [activeCompressorFieldId]: uploadResult.url,
        [`${activeCompressorFieldId}_filename`]: uploadResult.filename,
        [`${activeCompressorFieldId}_filesize`]: uploadResult.size
      }));
      setErrorMsg('');
    }
  };

  const handleRemoveFile = (fieldId: string) => {
    setFormData(prev => {
      const copy = { ...prev };
      delete copy[fieldId];
      delete copy[`${fieldId}_filename`];
      delete copy[`${fieldId}_filesize`];
      return copy;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Aadhaar and Mobile numbers length
    if (service?.fields) {
      for (const field of service.fields) {
        const labelLower = field.label.toLowerCase();
        const isAadhaar = labelLower.includes('aadhaar') || labelLower.includes('आधार') || field.id.includes('aadhaar');
        if (isAadhaar) {
          const val = String(formData[field.id] || '').trim();
          if (field.required && val.length !== 12) {
            setErrorMsg(`⚠️ ${field.label}: Aadhaar Number must be exactly 12 digits (आधार नंबर ठीक 12 अंक का होना चाहिए). You entered ${val.length} digits.`);
            return;
          }
        }
        const isMobile = labelLower.includes('mobile') || labelLower.includes('मोबाइल') || field.id.includes('mobile');
        if (isMobile) {
          const val = String(formData[field.id] || '').trim();
          if (field.required && val.length !== 10) {
            setErrorMsg(`⚠️ ${field.label}: Mobile Number must be exactly 10 digits (मोबाइल नंबर ठीक 10 अंक का होना चाहिए). You entered ${val.length} digits.`);
            return;
          }
        }
      }
    }

    if (!isBalanceSufficient) {
      setShowInsufficientBalanceModal(true);
      return;
    }
    setErrorMsg('');
    setShowConfirmDialog(true);
  };

  const handleConfirmAndPay = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg('');

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

      if (res.ok) {
        const data = await res.json();
        if (data.remainingWalletBalance !== undefined) {
          updateLocalWallet(data.remainingWalletBalance);
        }
        refreshUser();
        setShowConfirmDialog(false);
        onClose();

        if (data.request?.status === 'COMPLETED') {
          const reqFD = data.request.formData || {};
          if (data.request.serviceId === 'srv_voter_mobile_link' || service.id === 'srv_voter_mobile_link' || service.title.toLowerCase().includes('voter')) {
            setErrorMsg('');
          }
        }

        onRequestSubmittedSuccess(data.request.id);
      } else {
        const err = await res.json().catch(() => null);
        if (err?.remainingWalletBalance !== undefined) {
          updateLocalWallet(err.remainingWalletBalance);
        }
        refreshUser();
        const apiErrMsg = err?.error || err?.apiError || 'Failed to submit service request.';
        const rawErr = err?.rawError || { status: 'error', message: apiErrMsg };
        setRawErrorResponse(rawErr);
        setErrorMsg(apiErrMsg);
        setShowConfirmDialog(false);
      }
    } catch (err: any) {
      const msg = err.message || 'Error communicating with server.';
      refreshUser();
      setRawErrorResponse({ status: 'error', message: msg });
      setErrorMsg(msg);
      setShowConfirmDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex flex-col items-center justify-center p-1 text-center">
                <span className="text-[10px] font-black text-red-600 leading-none">AADHAAR</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">{service.title}</h2>
                {service.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md uppercase">
                    {service.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black flex items-center gap-1">
                  ⓘ TIME: {service.processingTime || '14 HOUR TO 7 DAYS'}
                </span>
                <span className="text-xs text-slate-400">• Category: {service.category}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing & Wallet Status Banner */}
        <div className="p-3 px-5 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 flex-wrap">
            <span>Service Fee:</span>
            <span className="text-base font-black text-blue-400">₹{effectivePrice.toFixed(2)}</span>
            {user && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(user.role) && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-black flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Distributor Rate</span>
                {effectivePrice < service.price && (
                  <span className="text-slate-400 font-normal line-through ml-0.5">₹{service.price.toFixed(2)}</span>
                )}
              </span>
            )}
            {priceNote && (
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[10px] font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>{priceNote}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Your Wallet:</span>
            <span className={`font-bold ${isBalanceSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{currentWallet.toFixed(2)}
            </span>
            {!isBalanceSufficient && (
              <button
                type="button"
                onClick={handleOpenDirectRecharge}
                className="px-2.5 py-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-[11px] rounded-lg transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Click to open instant UPI QR code for this deficit amount"
              >
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Recharge (₹{(effectivePrice - currentWallet).toFixed(2)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* SERVICE WARNING / CAUTION ALERT CARD OVERLAY */}
          {(service.warningNotice || service.warningImage) && (
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2.5 shadow-md ${
              service.warningType === 'critical'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                : service.warningType === 'info'
                ? 'bg-indigo-950/90 border-indigo-500/60 text-indigo-200'
                : 'bg-amber-950/90 border-amber-500/60 text-amber-200'
            }`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                  {service.warningType === 'critical' ? (
                    <span className="text-base">🚨</span>
                  ) : service.warningType === 'info' ? (
                    <span className="text-base">ℹ️</span>
                  ) : (
                    <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {service.warningType === 'critical' ? 'अति आवश्यक चेतावनी (Critical Alert)' : service.warningType === 'info' ? 'आवश्यक जानकारी (Important Notice)' : '📢 सावधानियां व आवश्यक निर्देश (CAUTION)'}
                  </span>
                </span>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded uppercase">
                  सावधान रहें
                </span>
              </div>

              {service.warningNotice && (
                <p className="font-semibold whitespace-pre-line leading-relaxed">
                  {service.warningNotice}
                </p>
              )}

              {service.warningImage && (
                <div className="mt-2 rounded-xl overflow-hidden border border-amber-500/40 max-h-48">
                  <img src={service.warningImage} alt="Warning Banner Guide" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {!isBalanceSufficient && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-200 shadow-md">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-xs text-rose-300">
                    ⚠️ INSUFFICIENT WALLET BALANCE / वॉलेट में पैसे कम हैं!
                  </p>
                  <p className="text-[11px] text-slate-200 mt-0.5">
                    Current Wallet: <strong className="text-white">₹{currentWallet.toFixed(2)}</strong> • Required: <strong className="text-amber-300">₹{effectivePrice.toFixed(2)}</strong> (Need ₹{(effectivePrice - currentWallet).toFixed(2)} more)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenWallet}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md shadow-emerald-600/30 active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                <span>+ Recharge Wallet</span>
              </button>
            </div>
          )}

          {rawErrorResponse && (
            <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-4 space-y-2 font-sans text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-100">Error Response</span>
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-md uppercase tracking-wider">
                    error
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRawErrorResponse(null)}
                  className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
              <div className="bg-[#0b1329] text-rose-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-rose-900/60 shadow-inner">
                <pre>{JSON.stringify(rawErrorResponse, null, 2)}</pre>
              </div>
            </div>
          )}

          {errorMsg && !rawErrorResponse && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Auto-Fill action row */}
          <div className="flex items-center justify-end pb-1">
            <button
              type="button"
              onClick={handleAutoFillSample}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] rounded-xl shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 border border-amber-300 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡ Auto-Fill Sample (एक क्लिक में भरें)</span>
            </button>
          </div>

          {/* Dynamic Inputs Rendered from Service Fields */}
          <div className="space-y-4">
            {service.fields.map((field) => (
              <div key={field.id} className="space-y-2 bg-slate-800/80 p-4 sm:p-4.5 rounded-2xl border-2 border-slate-700/80 hover:border-blue-500/60 shadow-xs hover:shadow-md transition-all">
                <label className="font-extrabold text-slate-200 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                  <span>{field.label}</span>
                  {field.required && <span className="text-rose-400 font-black">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    required={field.required}
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner transition-all font-extrabold"
                  />
                ) : field.id === 'block' || field.id === 'block_name' ? (
                  <div className="space-y-2">
                    {(() => {
                      const currentBlocks = getFilteredBlocksForDistrict(formData.district);
                      const isCustom = formData[field.id] === 'OTHER' || (formData[field.id] && !currentBlocks.includes(formData[field.id]));
                      
                      return (
                        <>
                          <select
                            required={field.required}
                            value={isCustom ? 'OTHER' : (formData[field.id] || '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'OTHER') {
                                handleInputChange(field.id, customBlockName || 'OTHER');
                              } else {
                                handleInputChange(field.id, val);
                              }
                            }}
                            className="w-full px-4 py-3.5 bg-slate-900 border-2 border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl text-sm sm:text-base text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 font-extrabold cursor-pointer transition-all"
                          >
                            <option value="">
                              {formData.district ? `-- Select Block for ${formData.district} / ब्लॉक चुनें --` : '-- Select District First / पहले जिला चुनें --'}
                            </option>

                            {currentBlocks.map((blk, i) => {
                              const hasConfiguredRate = availableBlockRates.some(
                                r => r.district.toLowerCase() === (formData.district || '').toLowerCase() && r.block.toLowerCase() === blk.toLowerCase()
                              );
                              return (
                                <option key={i} value={blk}>
                                  {hasConfiguredRate ? `📍 ${blk} (Rate Available)` : blk}
                                </option>
                              );
                            })}

                            <option value="OTHER">✍️ Other Block (Type Manually / अन्य ब्लॉक)</option>
                          </select>

                          {isCustom && (
                            <input
                              type="text"
                              required
                              placeholder="Type Custom Block Name / अपने ब्लॉक का नाम लिखें"
                              value={customBlockName}
                              onChange={(e) => {
                                setCustomBlockName(e.target.value);
                                handleInputChange(field.id, e.target.value);
                              }}
                              className="w-full px-4 py-3 bg-indigo-950/90 border-2 border-indigo-500/60 rounded-xl text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 font-extrabold transition-all"
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : field.type === 'select' ? (
                  <select
                    required={field.required}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-900 border-2 border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl text-sm sm:text-base text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 font-extrabold cursor-pointer transition-all"
                  >
                    <option value="">-- Select Option --</option>
                    {(
                      (field.id === 'app_prefix' || field.id === 'app_type' || field.label.toLowerCase().includes('application code'))
                        ? Array.from(new Set([...(field.options || []), 'BICCO', 'BCCCO', 'BRCCO', 'NCLCO', 'OTHER']))
                        : (field.options || [])
                    ).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'file' ? (
                  <div className="space-y-2">
                    {uploadingField === field.id ? (
                      <div className="p-4 bg-blue-500/10 border-2 border-blue-500/40 rounded-2xl flex items-center justify-center gap-3 text-blue-300 shadow-xs animate-pulse">
                        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        <div>
                          <p className="font-extrabold text-xs sm:text-sm text-white">Uploading & generating photo preview...</p>
                          <p className="text-[11px] text-blue-300 font-bold">कृपया प्रतीक्षा करें, फाइल लोड हो रही है...</p>
                        </div>
                      </div>
                    ) : formData[field.id] ? (
                      (() => {
                        const fileVal = formData[field.id];
                        const fileName = formData[`${field.id}_filename`] || (typeof fileVal === 'string' ? fileVal.split('/').pop() : 'Document File') || 'Document File';
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
                          <div className={`p-3.5 rounded-2xl shadow-md space-y-3 border-2 ${
                            isPdf ? 'bg-slate-900 border-red-500/40 hover:border-red-500/60' : 'bg-slate-900 border-emerald-500/40 hover:border-emerald-500/60'
                          }`}>
                            {/* Top Preview & File Details Card */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              {isImage ? (
                                <div
                                  onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                  className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500/80 shadow-md bg-slate-950 w-16 h-16"
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
                                  <span className="absolute bottom-0 inset-x-0 bg-emerald-600/95 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-wider">
                                    Photo
                                  </span>
                                </div>
                              ) : (
                                <div
                                  onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                  className="p-2.5 bg-red-500/20 text-red-400 rounded-xl shrink-0 border-2 border-red-500/40 flex flex-col items-center justify-center cursor-pointer hover:bg-red-500/30 transition-all w-16 h-16 shadow-md group"
                                  title="Click to Preview PDF / पीडीएफ देखें"
                                >
                                  <FileText className="w-6 h-6 mb-0.5 text-red-400 group-hover:scale-110 transition-transform" />
                                  <span className="text-[8px] font-black uppercase text-red-300">PDF Doc</span>
                                </div>
                              )}

                              {/* File details info stack */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isPdf ? (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 font-black text-[10px] rounded-md uppercase tracking-wider border border-red-500/30 whitespace-nowrap shadow-2xs">
                                      📄 PDF Document
                                    </span>
                                  ) : isImage ? (
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-black text-[10px] rounded-md uppercase tracking-wider border border-emerald-500/30 whitespace-nowrap shadow-2xs">
                                      🖼️ Photo Attached
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-black text-[10px] rounded-md uppercase tracking-wider border border-blue-500/30 whitespace-nowrap shadow-2xs">
                                      📁 File Attached
                                    </span>
                                  )}
                                  {fileSize && (
                                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold text-[10px] rounded font-mono border border-slate-700 whitespace-nowrap shadow-2xs">
                                      {fileSize}
                                    </span>
                                  )}
                                </div>
                                <p className="font-extrabold text-xs sm:text-sm text-white truncate" title={fileName}>
                                  {fileName}
                                </p>
                                <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                                  <span className="text-emerald-400 font-bold">✅ Uploaded & Ready</span>
                                  <span className="text-slate-500">•</span>
                                  <span 
                                    className="text-blue-400 font-bold cursor-pointer hover:underline" 
                                    onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                  >
                                    {isPdf ? 'Open PDF Preview' : 'Click to Zoom'}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Bottom Action Buttons Grid Toolbar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setPreviewModalImage({ url: fileVal, title: field.label, filename: fileName, filesize: fileSize })}
                                className="w-full py-2 px-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95 whitespace-nowrap"
                                title="Open Full Preview"
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
                                  className="w-full py-2 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-extrabold text-xs rounded-xl transition-colors border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                                >
                                  <Crop className="w-3.5 h-3.5 shrink-0" />
                                  <span>✂️ Crop</span>
                                </button>
                              ) : (
                                <a
                                  href={fileVal}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-extrabold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  <FileText className="w-3.5 h-3.5 shrink-0 text-red-400" />
                                  <span>New Tab</span>
                                </a>
                              )}

                              <label className="w-full py-2 px-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap border border-slate-700">
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
                                className="w-full py-2 px-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
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
                        <label className="w-full p-4 bg-slate-900/80 hover:bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1.5 text-slate-300 transition-all group shadow-2xs">
                          <Upload className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="font-extrabold text-xs sm:text-sm text-white">Click to Upload Document / Photo File</span>
                          <span className="text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
                            📄 Supports JPG, PNG, PDF (Max Limit: {field.maxFileSizeMb || 2} MB / अधिकतम {field.maxFileSizeMb || 2} MB)
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            required={field.required && !formData[field.id]}
                            onChange={(e) => handleFileUpload(field.id, e, field.maxFileSizeMb)}
                            className="hidden"
                          />
                        </label>

                        {/* Action Buttons Grid: Crop & Optional Compressor */}
                        <div className={`grid gap-2 ${service.enableCompressionTool || field.enableCompression ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCropFieldId(field.id);
                              setActiveCropInitialImg(null);
                              setActiveCropMaxMb(field.maxFileSizeMb || 25);
                              setCropModalOpen(true);
                            }}
                            className="py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-black text-xs rounded-xl border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Crop className="w-4 h-4 text-amber-400" />
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
                              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-sky-400 font-black text-xs rounded-xl border border-sky-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Zap className="w-4 h-4 text-sky-400 fill-sky-400/20" />
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
                      className="w-full px-4 py-3.5 bg-slate-900 border-2 border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 font-mono font-extrabold tracking-wider shadow-inner transition-all"
                    />
                    <p className="text-[11px] text-amber-300 font-extrabold">
                      📅 Format: DD-MM-YYYY (Type digits only, hyphens auto-insert e.g. 01122000 ➔ 01-12-2000)
                    </p>
                  </div>
                ) : (
                  {...(() => {
                    const labelLower = field.label.toLowerCase();
                    const isNameField = labelLower.includes('name') || labelLower.includes('नाम') || field.id.includes('name');
                    const isAadhaarField = !isNameField && (labelLower.includes('aadhaar') || labelLower.includes('आधार') || field.id.includes('aadhaar'));
                    const isMobileField = !isNameField && (labelLower.includes('mobile') || labelLower.includes('मोबाइल') || field.id.includes('mobile'));
                    const maxLen = field.maxLength || (isAadhaarField ? 12 : isMobileField ? 10 : undefined);
                    const currentVal = String(formData[field.id] || '');

                    return (
                      <div className="space-y-1.5">
                        <input
                          type={isAadhaarField || isMobileField ? 'text' : (field.type === 'number' ? 'number' : 'text')}
                          inputMode={isAadhaarField || isMobileField ? 'numeric' : undefined}
                          required={field.required}
                          maxLength={maxLen}
                          placeholder={field.placeholder || (isAadhaarField ? 'Enter 12 Digit Aadhaar Number' : isMobileField ? 'Enter 10 Digit Mobile Number' : `Enter ${field.label}`)}
                          value={currentVal}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (isAadhaarField) {
                              val = val.replace(/\D/g, '').slice(0, 12);
                            } else if (isMobileField) {
                              val = val.replace(/\D/g, '').slice(0, 10);
                            } else if (maxLen) {
                              val = val.slice(0, maxLen);
                            }
                            handleInputChange(field.id, val);
                          }}
                          className={`w-full px-4 py-3.5 bg-slate-900 border-2 rounded-xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-4 font-mono font-extrabold tracking-wide transition-all shadow-inner ${
                            isAadhaarField && currentVal.length === 12
                              ? 'border-emerald-500/80 focus:ring-emerald-500/20'
                              : isAadhaarField && currentVal.length > 0 && currentVal.length < 12
                              ? 'border-amber-500/80 focus:ring-amber-500/20'
                              : 'border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'
                          }`}
                        />
                        {isAadhaarField && (
                          <div className="flex items-center justify-between text-[11px] px-1 font-extrabold">
                            <span className="text-slate-400">Length Requirement: Exactly 12 Digits</span>
                            <span className={currentVal.length === 12 ? 'text-emerald-400 font-extrabold flex items-center gap-1' : 'text-amber-400 font-bold'}>
                              {currentVal.length === 12 ? '✓ 12 / 12 Digits Valid' : `⚠️ ${currentVal.length} / 12 Digits`}
                            </span>
                          </div>
                        )}
                        {isMobileField && (
                          <div className="flex items-center justify-between text-[11px] px-1 font-bold">
                            <span className="text-slate-400">Mobile Length: 10 Digits</span>
                            <span className={currentVal.length === 10 ? 'text-emerald-400 font-extrabold flex items-center gap-1' : 'text-amber-400 font-bold'}>
                              {currentVal.length === 10 ? '✓ 10 / 10 Digits Valid' : `⚠️ ${currentVal.length} / 10 Digits`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                )}
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-white font-extrabold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                isBalanceSufficient
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {isBalanceSufficient ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Request (₹{effectivePrice.toFixed(2)})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Insufficient Balance (₹{effectivePrice.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Insufficient Balance Alert Modal */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-rose-300">Insufficient Wallet Balance!</h3>
              <p className="text-xs text-slate-300">
                You do not have enough wallet balance to apply for <strong className="text-white">"{service.title}"</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-300">
                <span>Your Current Balance:</span>
                <span className="font-bold text-white">₹{currentWallet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Service Fee Required:</span>
                <span className="font-bold text-amber-400">₹{effectivePrice.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between font-extrabold text-rose-400 text-xs">
                <span>Minimum Topup Needed:</span>
                <span>+ ₹{(effectivePrice - currentWallet).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  handleOpenDirectRecharge();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Instant QR Recharge (₹{(effectivePrice - currentWallet).toFixed(2)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Confirmation Dialog Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Confirm Wallet Deduction</h3>
              <p className="text-xs text-slate-300">
                Service charge of <span className="font-extrabold text-amber-400">₹{effectivePrice.toFixed(2)}</span> will be deducted automatically from your wallet. Do you want to continue?
              </p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl text-xs space-y-1 text-left">
              <p className="text-slate-400 flex justify-between">
                <span>Current Balance:</span>
                <span className="font-bold text-white">₹{currentWallet.toFixed(2)}</span>
              </p>
              <p className="text-slate-400 flex justify-between">
                <span>Deduction Charge:</span>
                <span className="font-bold text-rose-400">- ₹{effectivePrice.toFixed(2)}</span>
              </p>
              <div className="pt-1 border-t border-slate-700 flex justify-between font-bold text-emerald-400">
                <span>Remaining Balance:</span>
                <span>₹{(currentWallet - effectivePrice).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmAndPay}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-600/30"
              >
                {isLoading ? 'Processing...' : 'Confirm & Deduct'}
              </button>
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

      {/* PHOTO PREVIEW LIGHTBOX MODAL */}
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
            await refreshUser();
          }}
        />
      )}
    </div>
  );
};
