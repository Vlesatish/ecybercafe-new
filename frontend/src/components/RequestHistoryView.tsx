import React, { useState, useEffect, useRef } from 'react';
import { ServiceRequest, UserRole, ChatMessage, CitizenService } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { InlineRequestChat } from './InlineRequestChat';
import { uploadFileToServer } from '../utils/upload';
import { getFormFieldLabel, getFilteredFormDataEntries, getRequestPdfUrl, cleanAdminRemarks } from '../utils/formUtils';
import { UTIPanResizerModal } from './UTIPanResizerModal';
import { TwoPdfStamperModal } from './TwoPdfStamperModal';
import { FormAttachmentImageCard } from './FormAttachmentImageCard';
import { FormAttachmentDocumentCard } from './FormAttachmentDocumentCard';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';
import { realtimeClient } from '../utils/realtimeClient';
import { 
  History, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FileText, 
  Download, 
  Check, 
  Send,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
  LayoutList,
  LayoutGrid,
  Eye,
  Crop,
  Copy,
  Zap,
  Terminal,
  Activity,
  ShieldCheck,
  FileType,
  Trash2
} from 'lucide-react';

interface RequestHistoryViewProps {
  requests: ServiceRequest[];
  userRole: UserRole;
  onOpenChat: (request: ServiceRequest) => void;
  onStatusUpdated?: () => void;
  isRequestsLoading?: boolean;
}

export const RequestHistoryView: React.FC<RequestHistoryViewProps> = ({
  requests,
  userRole,
  onOpenChat,
  onStatusUpdated,
  isRequestsLoading = false
}) => {
  const { user: authUser } = useAuth();
  const isAdmin = userRole === 'ADMIN' || userRole === 'OPERATOR' || authUser?.role === 'ADMIN' || authUser?.role === 'OPERATOR';
  useEffect(() => {
    const unsubscribe = realtimeClient.subscribe((payload) => {
      try {
        if (
          payload.type === 'STATUS_UPDATED' ||
          payload.type === 'REQUEST_UPDATED' ||
          payload.type === 'REQUEST_CLAIMED' ||
          payload.type === 'CHAT_MESSAGE_SENT'
        ) {
          if (onStatusUpdated) onStatusUpdated();
        }
      } catch (e) {}
    });
    return () => {
      unsubscribe();
    };
  }, [onStatusUpdated]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'requests' | 'api_search'>('requests');
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [services, setServices] = useState<CitizenService[]>([]);

  useEffect(() => {
    fetch('/api/services')
      .then(res => safeJson(res, []))
      .then(data => {
        if (Array.isArray(data)) setServices(data);
      })
      .catch(() => {});
  }, []);

  // Admin status update modal state
  const [selectedReqForAdmin, setSelectedReqForAdmin] = useState<ServiceRequest | null>(null);
  const [selectedReqForPanResizer, setSelectedReqForPanResizer] = useState<ServiceRequest | null>(null);
  const [panResizerInitialImage, setPanResizerInitialImage] = useState<string | null>(null);

  const [selectedReqForTwoPdf, setSelectedReqForTwoPdf] = useState<ServiceRequest | null>(null);
  const [isTwoPdfModalOpen, setIsTwoPdfModalOpen] = useState(false);
  
  const [adminStatus, setAdminStatus] = useState<string>('COMPLETED');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [outputUrl, setOutputUrl] = useState('');
  const [refundFee, setRefundFee] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<{ url: string; title: string; filename?: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [reqToDelete, setReqToDelete] = useState<{ id: string; requestNumber?: number } | null>(null);

  const executeDeleteRequest = async (requestId: string, requestNumber?: number) => {
    setIsDeletingId(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('app_toast', { detail: `🎉 Request #${requestNumber || ''} permanently deleted.` }));
        setReqToDelete(null);
        if (onStatusUpdated) onStatusUpdated();
      } else {
        const data: any = await res.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent('app_toast', { detail: `❌ Delete failed: ${data.error || 'Server error'}` }));
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('app_toast', { detail: `❌ Delete failed: ${err.message || 'Connection error'}` }));
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.retailerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          JSON.stringify(r.formData).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesService = selectedServiceFilter === 'ALL' || r.serviceTitle === selectedServiceFilter || r.serviceId === selectedServiceFilter;
    return matchesSearch && matchesStatus && matchesService;
  });

  const uniqueServices = Array.from(
    new Set([
      ...requests.map(r => r.serviceTitle).filter(Boolean),
      ...services.map(s => s.title).filter(Boolean)
    ])
  ).sort();

  const extractInputDataFromRequest = (req: ServiceRequest): { label: string; value: string } => {
    const formData = req.formData || {};
    const sTitle = (req.serviceTitle || '').toLowerCase();

    // Voter Mobile Link Without OTP Check
    if (sTitle.includes('voter') || req.serviceId === 'srv_voter_mobile_link') {
      const epic = formData?.epicNumber || formData?.epic_no || formData?.epic || formData?.voter_no;
      const mob = formData?.mobileNumber || formData?.mobile_no || formData?.mobile;
      if (epic || mob) {
        return {
          label: 'VOTER EPIC & MOBILE (वोटर आईडी और मोबाइल)',
          value: `EPIC: ${epic || 'N/A'} | Mob: ${mob || 'N/A'}`
        };
      }
    }

    // 1. Vehicle RC / Challan Check
    if (sTitle.includes('vehicle') || sTitle.includes('rc print') || sTitle.includes('challan') || req.serviceId === 'srv_rc_print') {
      const rcKeys = ['rcno', 'rc_no', 'rcNumber', 'vehicle_no', 'vehicleNo', 'rc'];
      for (const k of rcKeys) {
        if (formData[k] && String(formData[k]).trim()) {
          return { label: 'INPUT VEHICLE RC (गाड़ी/RC नंबर)', value: String(formData[k]).trim() };
        }
      }
      for (const [k, v] of Object.entries(formData)) {
        if (typeof v === 'string' && v.trim() && !k.startsWith('autoProcessed') && k !== 'pdfUrl' && k !== 'result') {
          return { label: 'INPUT VEHICLE RC (गाड़ी/RC नंबर)', value: v.trim() };
        }
      }
    }

    // 2. Mobile Info Check
    if (sTitle.includes('mobile') || sTitle.includes('sim') || req.serviceId === 'srv_mobile_info') {
      const mobKeys = ['mobile_no', 'mobileNumber', 'mobile', 'num'];
      for (const k of mobKeys) {
        if (formData[k] && String(formData[k]).trim()) {
          return { label: 'INPUT MOBILE NUMBER (मोबाइल नंबर)', value: String(formData[k]).trim() };
        }
      }
    }

    // 3. Aadhaar
    const aadhaarKeys = ['aadhaar_no', 'aadhar_no', 'aadhaar', 'aadhar', 'aadhaar_number', 'aadhar_number', 'aadhaarNo', 'aadharNo', 'uid', 'input_aadhaar', 'aadhaarVal', 'aadharVal'];
    for (const k of aadhaarKeys) {
      if (formData[k] && String(formData[k]).trim()) {
        return { label: 'INPUT AADHAAR (आधार नंबर)', value: String(formData[k]).trim() };
      }
    }

    // 4. Any generic key/value
    for (const [key, val] of Object.entries(formData)) {
      if (key.startsWith('autoProcessed') || key === 'pdfUrl' || key === 'result') continue;
      if (typeof val === 'string' || typeof val === 'number') {
        const valStr = String(val).trim();
        if (valStr.length >= 2) {
          const keyLabel = key.replace(/_/g, ' ').toUpperCase();
          return { label: `INPUT ${keyLabel}`, value: valStr };
        }
      }
    }

    return { label: 'INPUT PARAMETER', value: 'N/A' };
  };

  const extractAadhaarFromFormData = (formData: any): string => {
    if (!formData || typeof formData !== 'object') return 'N/A';
    const directKeys = ['aadhaar_no', 'aadhar_no', 'aadhaar', 'aadhar', 'aadhaar_number', 'aadhar_number', 'aadhaarNo', 'aadharNo', 'uid', 'input_aadhaar', 'aadhaarVal', 'aadharVal'];
    for (const k of directKeys) {
      if (formData[k] && String(formData[k]).trim().length >= 10) return String(formData[k]).trim();
    }
    for (const [key, val] of Object.entries(formData)) {
      if (typeof val === 'string' || typeof val === 'number') {
        const cleaned = String(val).replace(/\D/g, '');
        if (cleaned.length === 12) return String(val).trim();
      }
    }
    for (const [key, val] of Object.entries(formData)) {
      if (typeof val === 'string') {
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 14) return val.trim();
      }
    }
    return 'N/A';
  };

  const instantRequests = requests.filter(r => {
    const sTitle = (r.serviceTitle || '').toLowerCase();
    const srv = services.find(s => s.id === r.serviceId || s.title?.trim().toLowerCase() === sTitle.trim());
    const isInstant = (srv && srv.processingTime === 'INSTANT') ||
                      sTitle.includes('instant') ||
                      sTitle.includes('aadhar to pan') ||
                      sTitle.includes('aadhaar to pan') ||
                      sTitle.includes('pan find') ||
                      r.serviceId === 'srv_8' ||
                      r.serviceId === 'srv_9' ||
                      r.serviceId === 'srv_voter_mobile_link' ||
                      (r.adminRemarks && (r.adminRemarks.includes('INSTANT') || r.adminRemarks.includes('AUTO-PROCESSED')));
    if (!isInstant) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return sTitle.includes(q) ||
           r.retailerName.toLowerCase().includes(q) ||
           JSON.stringify(r.formData).toLowerCase().includes(q) ||
           (r.adminRemarks && r.adminRemarks.toLowerCase().includes(q));
  });

  const handleAdminUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForAdmin) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/requests/${selectedReqForAdmin.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: adminStatus,
          adminRemarks: adminRemarks || `Operator updated status to ${adminStatus}`,
          outputAttachmentUrl: outputUrl || undefined,
          shouldRefundFee: refundFee
        })
      });

      if (res.ok) {
        setSelectedReqForAdmin(null);
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 text-[#111827] pb-28 sm:pb-32 font-sans">
      {/* Top Banner Tabs */}
      <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 text-[#2563EB] rounded-2xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#111827]">Request History & Tracking</h2>
            <p className="text-xs text-[#475569] font-medium">Track real-time status of submitted citizen service requests</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#475569] w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'requests' ? 'bg-white text-[#2563EB] shadow-2xs font-extrabold border border-[#E5E7EB]' : 'hover:text-[#111827]'
            }`}
          >
            📋 Service Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('api_search')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'api_search' ? 'bg-white text-[#2563EB] shadow-2xs font-extrabold border border-[#E5E7EB]' : 'hover:text-[#111827]'
            }`}
          >
            ⚡ Instant Search Logs
          </button>
        </div>
      </div>

      {activeTab === 'requests' ? (
        <>
          {/* Filter & Search Bar Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-2.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar & Service Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[180px] max-w-full lg:max-w-xs">
                  <Search className="w-4 h-4 text-[#2563EB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search request ID, service or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#E5E7EB] focus:border-[#2563EB] rounded-xl text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-2xs transition-all"
                  />
                </div>

                {/* Service Filter Dropdown */}
                <div className="shrink-0">
                  <select
                    value={selectedServiceFilter}
                    onChange={(e) => setSelectedServiceFilter(e.target.value)}
                    className="w-full sm:w-auto bg-white border border-[#E5E7EB] focus:border-[#2563EB] text-[#111827] text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-2xs cursor-pointer max-w-full sm:max-w-[200px] truncate"
                  >
                    <option value="ALL">🛠️ All Services (सभी सर्विस)</option>
                    {uniqueServices.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter Pills & View Toggles */}
              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-black uppercase text-[#64748B] mr-1 hidden sm:inline">Status:</span>
                  {[
                    { id: 'ALL', label: 'ALL', color: 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20' },
                    { id: 'PENDING', label: 'PENDING', color: 'bg-amber-600 text-white border-amber-500 shadow-amber-500/20' },
                    { id: 'IN_PROCESS', label: 'IN_PROCESS', color: 'bg-cyan-600 text-white border-cyan-500 shadow-cyan-500/20' },
                    { id: 'COMPLETED', label: 'COMPLETED', color: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' },
                    { id: 'REJECTED', label: '❌ REJECTED', color: 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20' }
                  ].map((st) => {
                    const isActive = statusFilter === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          isActive
                            ? `${st.color} shadow-xs`
                            : st.id === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-white text-[#475569] border border-[#E5E7EB] hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                  {onStatusUpdated && (
                    <button
                      type="button"
                      onClick={onStatusUpdated}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Click to refresh requests instantly (डेटा ताज़ा करें)"
                    >
                      <Zap className={`w-3 h-3 text-blue-600 ${isRequestsLoading ? 'animate-spin' : ''}`} />
                      <span>{isRequestsLoading ? 'Syncing...' : 'Sync Data'}</span>
                    </button>
                  )}
                  {(userRole === 'ADMIN' || userRole?.toUpperCase() === 'ADMIN') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReqForTwoPdf(null);
                        setIsTwoPdfModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Open 2 PDF Output Generator Tool"
                    >
                      <FileType className="w-3 h-3 text-emerald-200" />
                      <span>2 PDF Tool</span>
                    </button>
                  )}
                </div>

                {/* View Switcher (List vs Grid) */}
                <div className="flex items-center gap-1 p-0.5 bg-white border border-[#E5E7EB] rounded-lg shrink-0 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    title="Compact List View"
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-blue-50 text-[#2563EB] font-extrabold border border-blue-200'
                        : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">List View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Grid Card View"
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-blue-50 text-[#2563EB] font-extrabold border border-blue-200'
                        : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grid Cards</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Request Items (List View or Grid View) */}
          {isRequestsLoading && filteredRequests.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 animate-pulse shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="h-5 bg-slate-200 rounded-lg w-1/3"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                  </div>
                </div>
              ))}
              <p className="text-center text-xs font-extrabold text-blue-600 animate-pulse py-2">
                ⚡ Fetching live requests... कृपया प्रतीक्षा करें (डेटा लोड हो रहा है)
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-12 text-center text-[#64748B] space-y-3">
              <History className="w-12 h-12 text-[#94A3B8] mx-auto" />
              <p className="text-sm font-bold text-[#111827]">No service requests found matching filter.</p>
              <p className="text-xs text-[#64748B]">Apply for any citizen service from the dashboard to track it here.</p>
            </div>
          ) : viewMode === 'list' ? (
            /* CLEAN HIGH-VISIBILITY LIST VIEW */
            <div className="space-y-5">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isInProcess = req.status === 'IN_PROCESS';
                const isCompleted = req.status === 'COMPLETED';
                const isRejected = req.status === 'REJECTED';
                const isExpanded = expandedChatId === req.id;

                // Distinct Neon Border & Background per status (matching Admin Dashboard)
                const borderNeonClass = isCompleted
                  ? 'bg-gradient-to-br from-white via-emerald-50/60 to-emerald-100/40 border-2 border-emerald-500 shadow-md shadow-emerald-500/15'
                  : isInProcess
                  ? 'bg-gradient-to-br from-white via-cyan-50/60 to-cyan-100/40 border-2 border-cyan-500 shadow-md shadow-cyan-500/15'
                  : isPending
                  ? 'bg-gradient-to-br from-white via-amber-50/60 to-amber-100/40 border-2 border-amber-400 shadow-md shadow-amber-500/15'
                  : 'bg-gradient-to-br from-white via-rose-50/60 to-rose-100/40 border-2 border-rose-500 shadow-md shadow-rose-500/15';

                // Distinct Badge color per status
                const badgeClass = isCompleted
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                  : isInProcess
                  ? 'bg-cyan-600 text-white shadow-xs ring-2 ring-cyan-400/40'
                  : isPending
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/40';

                return (
                  <div
                    key={req.id}
                    className={`${borderNeonClass} rounded-2xl overflow-hidden p-4 space-y-3.5 transition-all`}
                  >
                    {/* Top Row: Request Number + Title + Status + Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="bg-slate-900 text-white font-black px-2.5 py-0.5 rounded-md text-xs font-mono shrink-0">
                          #{req.requestNumber}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg truncate">
                          {req.serviceTitle}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isPending
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : isInProcess
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-rose-600 text-white shadow-xs'
                        }`}>
                          {req.status}
                        </span>
                        {req.category && (
                          <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                            {req.category}
                          </span>
                        )}
                      </div>

                      {/* Right Header Buttons */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                          type="button"
                          onClick={() => setExpandedChatId(isExpanded ? null : req.id)}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>💬 Chat {isExpanded ? '(Hide)' : ''}</span>
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              disabled={isDeletingId === req.id}
                              onClick={() => setReqToDelete({ id: req.id, requestNumber: req.requestNumber })}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                              title="Delete this request permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isDeletingId === req.id ? 'Deleting...' : 'Delete'}</span>
                            </button>

                            {(services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase())?.enablePanResizer ||
                              req.category === 'PAN' ||
                              req.serviceTitle.toLowerCase().includes('pan') ||
                              req.serviceTitle.toLowerCase().includes('uti')) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedReqForPanResizer(req)}
                                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer border border-amber-300"
                                  title="UTI PAN Photo (213x213) & Signature (1023x360) 1-Click Resizer"
                                >
                                  <Crop className="w-3.5 h-3.5 text-slate-950" />
                                  <span>✂️ UTI Resizer</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReqForTwoPdf(req);
                                    setIsTwoPdfModalOpen(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                  title="⚡ Generate 2 Output PDFs (Form PDF + Complete PDF with Aadhaar & DOB attached)"
                                >
                                  <FileType className="w-3.5 h-3.5 text-emerald-200" />
                                  <span>⚡ 2 PDF Output</span>
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReqForAdmin(req);
                                setAdminStatus(req.status);
                                setAdminRemarks(req.adminRemarks || '');
                              }}
                              className="px-3.5 py-1.5 bg-[#FFB703] hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Process / Status</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sub-line: Retailer info + Entry Time + Fee */}
                    <div className="text-xs text-slate-600 font-medium flex items-center justify-between flex-wrap gap-2 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div>
                          Retailer: <strong className="font-extrabold text-slate-900">{req.retailerName}</strong> ({req.retailerMobile || '0000000000'})
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Entry Time / प्रविष्टि समय: <span className="text-blue-700 font-black">{req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A'}</span></span>
                        </div>
                      </div>
                      <div>
                        Fee: <strong className="text-emerald-700 font-black text-sm">₹{req.price.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Data Summary Section */}
                    <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        SUBMITTED FORM DATA & ATTACHMENTS
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(() => {
                          const matchedService = services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase());
                          const filteredEntries = getFilteredFormDataEntries(req.formData, matchedService);
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
                                    setSelectedReqForPanResizer(req);
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

                    {/* OPERATOR NOTE HIGHLIGHT BANNER */}
                    {isInProcess && req.adminRemarks && (
                      <div className="p-3 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-500 rounded-2xl shadow-sm space-y-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-rose-600 text-white font-black flex items-center justify-center shrink-0 text-sm shadow-md animate-bounce">
                              ➔
                            </span>
                            <div>
                              <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 tracking-wider">
                                OPERATOR DIRECTIVE / ऑपरेटर का निर्देश
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedChatId(isExpanded ? null : req.id)}
                            className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>💬 चैट में जवाब दें (Reply in Chat)</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 bg-white/95 p-2.5 rounded-xl border border-rose-200">
                          <span className="text-rose-600 font-black text-xs shrink-0">Operator Note:</span>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300 flex-1 leading-snug">
                            {cleanAdminRemarks(req.adminRemarks)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Live Helpdesk Green Banner at Card Bottom (Exact Image 3 style!) */}
                    <div className="pt-1">
                      <div
                        onClick={() => setExpandedChatId(isExpanded ? null : req.id)}
                        className="bg-[#075E54] hover:bg-[#065047] text-white p-3 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-300">
                            💬
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">
                                WhatsApp Live Helpdesk #{req.requestNumber}
                              </h4>
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-[9px] font-black rounded-md text-white">
                                LIVE
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-100 truncate">
                              {req.serviceTitle} • {req.retailerName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 border border-emerald-500/50">
                            <Search className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Hide ^' : 'Open v'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Inline WhatsApp Chat Drawer */}
                      {isExpanded && (
                        <div className="mt-3 animate-fadeIn">
                          <InlineRequestChat
                            request={req}
                            isOpen={true}
                            hideHeader={true}
                            enableChat={services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase())?.enableChat ?? true}
                            onToggle={() => setExpandedChatId(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* GRID CARDS VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isInProcess = req.status === 'IN_PROCESS';
                const isCompleted = req.status === 'COMPLETED';
                const isRejected = req.status === 'REJECTED';
                const isExpanded = expandedChatId === req.id;

                const borderNeonClass = isCompleted
                  ? 'bg-gradient-to-br from-white via-emerald-50/60 to-emerald-100/40 border-2 border-emerald-500 shadow-md shadow-emerald-500/15'
                  : isInProcess
                  ? 'bg-gradient-to-br from-white via-cyan-50/60 to-cyan-100/40 border-2 border-cyan-500 shadow-md shadow-cyan-500/15'
                  : isPending
                  ? 'bg-gradient-to-br from-white via-amber-50/60 to-amber-100/40 border-2 border-amber-400 shadow-md shadow-amber-500/15'
                  : 'bg-gradient-to-br from-white via-rose-50/60 to-rose-100/40 border-2 border-rose-500 shadow-md shadow-rose-500/15';

                return (
                  <div
                    key={req.id}
                    className={`${borderNeonClass} rounded-2xl overflow-hidden p-4 space-y-3.5 transition-all flex flex-col justify-between`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="bg-slate-900 text-white font-black px-2.5 py-0.5 rounded-md text-xs font-mono shrink-0">
                            #{req.requestNumber}
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg truncate">
                            {req.serviceTitle}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isPending
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : isInProcess
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isCompleted
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                          }`}>
                            {req.status}
                          </span>
                          {req.category && (
                            <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                              {req.category}
                            </span>
                          )}
                        </div>

                        {/* Right Header Buttons */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                            type="button"
                            onClick={() => setExpandedChatId(isExpanded ? null : req.id)}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>💬 Chat {isExpanded ? '(Hide)' : ''}</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                disabled={isDeletingId === req.id}
                                onClick={() => setReqToDelete({ id: req.id, requestNumber: req.requestNumber })}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                title="Delete this request permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isDeletingId === req.id ? 'Deleting...' : 'Delete'}</span>
                              </button>

                              {(services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase())?.enablePanResizer ||
                                req.category === 'PAN' ||
                                req.serviceTitle.toLowerCase().includes('pan') ||
                                req.serviceTitle.toLowerCase().includes('uti')) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReqForPanResizer(req)}
                                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer border border-amber-300"
                                  title="UTI PAN Photo (213x213) & Signature (1023x360) 1-Click Resizer"
                                >
                                  <Crop className="w-3.5 h-3.5 text-slate-950" />
                                  <span>✂️ UTI Resizer</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReqForAdmin(req);
                                  setAdminStatus(req.status);
                                  setAdminRemarks(req.adminRemarks || '');
                                }}
                                className="px-3.5 py-1.5 bg-[#FFB703] hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Process / Status</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sub-line: Retailer info + Entry Time + Fee */}
                      <div className="text-xs text-slate-600 font-medium flex items-center justify-between flex-wrap gap-2 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div>
                            Retailer: <strong className="font-extrabold text-slate-900">{req.retailerName}</strong> ({req.retailerMobile || '0000000000'})
                          </div>
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Entry Time: <span className="text-blue-700 font-black">{req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A'}</span></span>
                          </div>
                        </div>
                        <div>
                          Fee: <strong className="text-emerald-700 font-black text-sm">₹{req.price.toFixed(2)}</strong>
                        </div>
                      </div>

                      {/* Submitted Form Details */}
                      <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          SUBMITTED FORM DATA & ATTACHMENTS
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {(() => {
                            const matchedService = services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase());
                            const filteredEntries = getFilteredFormDataEntries(req.formData, matchedService);
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
                                      setSelectedReqForPanResizer(req);
                                    }}
                                  />
                                );
                              }

                              if (entry.isPdf) {
                                return (
                                  <div key={entry.key} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">{entry.label}</span>
                                    <a
                                      href={entry.value}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={`${entry.label}_doc`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>View PDF</span>
                                    </a>
                                  </div>
                                );
                              }

                              return (
                                <div key={entry.key} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-0.5 shadow-2xs min-w-0">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">{entry.label}</span>
                                  <span className="text-xs font-black text-slate-900 block break-words break-all leading-snug">
                                    {strVal || '—'}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* OPERATOR DIRECTIVE / NOTE BANNER */}
                      {isInProcess && req.adminRemarks && (
                        <div className="p-3 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-500 rounded-2xl shadow-sm space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-md animate-bounce">
                              ➔
                            </span>
                            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 tracking-wider">
                              OPERATOR DIRECTIVE / ऑपरेटर का निर्देश
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-900 bg-white/90 p-2 rounded-xl border border-rose-200">
                            {cleanAdminRemarks(req.adminRemarks)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Live Helpdesk Green Banner at Card Bottom */}
                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <div
                        onClick={() => setExpandedChatId(isExpanded ? null : req.id)}
                        className="bg-[#075E54] hover:bg-[#065047] text-white p-3 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-300">
                            💬
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">
                                WhatsApp Live Helpdesk #{req.requestNumber}
                              </h4>
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-[9px] font-black rounded-md text-white">
                                LIVE
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-100 truncate">
                              {req.serviceTitle} • {req.retailerName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 border border-emerald-500/50">
                            <Search className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Hide ^' : 'Open v'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Inline WhatsApp Chat Drawer */}
                      {isExpanded && (
                        <div className="mt-3 animate-fadeIn">
                          <InlineRequestChat
                            request={req}
                            isOpen={true}
                            hideHeader={true}
                            enableChat={services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase())?.enableChat ?? true}
                            onToggle={() => setExpandedChatId(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* INSTANT SEARCH LOGS DASHBOARD (CLEAN LIGHT DESIGN) */
        <div className="space-y-5">
          {/* Top Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-4 text-blue-900 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Instant Requests</span>
                <Zap className="w-4 h-4 text-blue-600 fill-blue-500/20" />
              </div>
              <p className="text-2xl font-black text-blue-950">{instantRequests.length}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200/80 rounded-2xl p-4 text-emerald-900 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Instant Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-950">
                {instantRequests.filter(r => r.status === 'COMPLETED').length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200/80 rounded-2xl p-4 text-amber-900 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Fee Processed</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-950">
                ₹{instantRequests.filter(r => r.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.price || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Search Bar for Instant Queries */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <Search className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
            <input
              type="text"
              placeholder="Search Aadhaar number, PAN number, retailer or remark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Logs List */}
          {instantRequests.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">No Instant Search Logs Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any instant API queries submitted via 'Aadhar To Pan Find INSTANT' or other API services will automatically appear here with real-time logs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {instantRequests.map((req) => {
                const isCompleted = req.status === 'COMPLETED';
                const isRejected = req.status === 'REJECTED';
                const reqData = req.formData || {};
                const sTitle = (req.serviceTitle || '').toLowerCase();
                const isVoterReq = req.serviceId === 'srv_voter_mobile_link' || sTitle.includes('voter');
                const voterEpic = reqData.epicNumber || reqData.epic_no || reqData.epic || reqData.voter_no;
                const voterMobile = reqData.mobileNumber || reqData.mobile_no || reqData.mobile;
                const inputInfo = extractInputDataFromRequest(req);
                const inputVal = inputInfo.value;
                const panFound = reqData.pan_found || reqData.pan || (req.adminRemarks && req.adminRemarks.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)?.[0]);

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-4 space-y-3 transition-all shadow-xs hover:shadow-md ${
                      isCompleted
                        ? 'border-emerald-300/80 ring-1 ring-emerald-100'
                        : isRejected
                        ? 'border-rose-200/80 ring-1 ring-rose-50'
                        : 'border-amber-200/80 ring-1 ring-amber-50'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-black text-xs rounded-lg border border-blue-200/80 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                          #{req.requestNumber}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {req.serviceTitle}
                        </h4>
                        <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isCompleted ? '⚡ INSTANT SUCCESS' : isRejected ? '❌ FAILED / REFUNDED' : '⏳ PROCESSING'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                          Fee: ₹{req.price.toFixed(2)}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            disabled={isDeletingId === req.id}
                            onClick={() => setReqToDelete({ id: req.id, requestNumber: req.requestNumber })}
                            className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-extrabold rounded-md text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                            title="Delete this request permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeletingId === req.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Input Param Box */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          {inputInfo.label}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black font-mono text-slate-900 tracking-wider">
                            {inputVal}
                          </span>
                          {inputVal !== 'N/A' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(inputVal)}
                              className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-2xs"
                              title="Copy Input"
                            >
                              <Copy className="w-3 h-3 text-slate-500" />
                              {copiedText === inputVal ? 'Copied!' : 'Copy'}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium pt-0.5">Retailer: <span className="font-bold text-slate-700">{req.retailerName}</span></p>
                      </div>

                      {/* Output Result Box - PROMINENT HIGHLIGHT */}
                      <div className={`border-2 rounded-xl p-3 space-y-1.5 ${
                        isCompleted
                          ? 'bg-emerald-50/70 border-emerald-400'
                          : isRejected
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          RESULT HIGHLIGHT (API RESPONSE)
                        </span>
                        {isVoterReq && (voterEpic || voterMobile) ? (
                          <div className="space-y-2 pt-0.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-900">VOTER EPIC:</span>
                                <span className="text-sm font-black text-blue-700 font-mono tracking-wider bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs">
                                  {voterEpic || 'N/A'}
                                </span>
                              </div>
                              {voterEpic && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(voterEpic)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  {copiedText === voterEpic ? 'Copied!' : 'Copy EPIC'}
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">MOBILE NO:</span>
                                <span className="text-sm font-black text-slate-900 font-mono tracking-wider bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                                  {voterMobile || 'N/A'}
                                </span>
                              </div>
                              {voterMobile && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(voterMobile)}
                                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  {copiedText === voterMobile ? 'Copied!' : 'Copy Mobile'}
                                </button>
                              )}
                            </div>

                            {reqData.request_status && (
                              <div className="p-2 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-extrabold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{reqData.request_status}</span>
                              </div>
                            )}

                            {(isRejected || req.status === 'FAILED' || reqData.apiError) && (
                              <div className="p-2.5 bg-rose-100/90 border border-rose-300 text-rose-900 rounded-lg text-xs font-bold space-y-1 mt-1">
                                <p className="font-extrabold flex items-center gap-1 text-rose-700">
                                  <span>❌ Request Failed</span>
                                  <span className="text-[10px] bg-rose-200 px-1.5 py-0.5 rounded font-black text-rose-800">Wallet Fee Refunded / Not Cut</span>
                                </p>
                                <p className="text-[11px] font-mono text-rose-800">
                                  Error: {reqData.apiError || req.rejectionReason || 'API Execution Error'}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : panFound ? (
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-800">PAN NUMBER:</span>
                              <span className="text-base sm:text-lg font-black text-emerald-700 font-mono tracking-widest bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-xs">
                                {panFound}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(panFound)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedText === panFound ? 'Copied!' : 'Copy PAN'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-800 pt-1">
                            {req.adminRemarks || 'Execution in progress...'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Remarks Log Strip */}
                    {req.adminRemarks && cleanAdminRemarks(req.adminRemarks) && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-500">Log Remark:</span>
                        <span className="font-mono text-slate-800 font-medium truncate">{cleanAdminRemarks(req.adminRemarks)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Admin Status Update Modal */}
      {selectedReqForAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Update Status for Request #{selectedReqForAdmin.requestNumber}
              </h3>
              <button onClick={() => setSelectedReqForAdmin(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminUpdateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Select Status</label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="IN_PROCESS">🎯 IN_PROCESS (Under Processing)</option>
                  <option value="COMPLETED">🎉 COMPLETED (Output Generated)</option>
                  <option value="REJECTED">❌ REJECTED (Auto-Refund Fee)</option>
                  <option value="PENDING">📋 PENDING</option>
                </select>
              </div>

              {adminStatus === 'REJECTED' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 font-bold">
                  <span>💰</span>
                  <span>Auto-Refund Active: <strong>₹{selectedReqForAdmin.price.toFixed(2)}</strong> service charge will be instantly credited back to retailer's wallet.</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Operator Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Generated successfully / Invalid EPIC card number"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl"
                />
              </div>

              {adminStatus === 'COMPLETED' && (
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Attach Output File / Certificate Slip *</label>

                  {/* File Upload or Link Input Container */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors shadow-xs">
                        <FileText className="w-4 h-4" />
                        <span>📁 Select File from Computer / Device</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const res = await uploadFileToServer(file);
                                setOutputUrl(res.url);
                              } catch (err: any) {
                                alert(`Upload failed: ${err.message || 'Error uploading file'}`);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="text-center text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center gap-1">
                      <span>-- OR PASTE SCREENSHOT (CTRL+V) / ENTER LINK --</span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black">
                        Ctrl+V 📋
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={outputUrl}
                        onChange={(e) => setOutputUrl(e.target.value)}
                        onPaste={async (e) => {
                          const clipboardData = e.clipboardData;
                          if (!clipboardData) return;

                          const files = clipboardData.files;
                          if (files && files.length > 0) {
                            const file = files[0];
                            if (file.type.indexOf('image') !== -1 || file.type.indexOf('pdf') !== -1) {
                              e.preventDefault();
                              try {
                                const res = await uploadFileToServer(file);
                                setOutputUrl(res.url);
                              } catch (err: any) {
                                alert(`Upload failed: ${err.message || 'Error'}`);
                              }
                              return;
                            }
                          }

                          const items = clipboardData.items;
                          if (items) {
                            for (let i = 0; i < items.length; i++) {
                              const item = items[i];
                              if (item.type.indexOf('image') !== -1 || item.type.indexOf('pdf') !== -1 || item.kind === 'file') {
                                const blob = item.getAsFile();
                                if (blob) {
                                  e.preventDefault();
                                  try {
                                    const ext = blob.type ? blob.type.split('/')[1] || 'png' : 'png';
                                    const file = new File([blob], `admin_slip_${Date.now()}.${ext}`, { type: blob.type || 'image/png' });
                                    const res = await uploadFileToServer(file);
                                    setOutputUrl(res.url);
                                  } catch (err: any) {
                                    alert(`Upload failed: ${err.message || 'Error'}`);
                                  }
                                  return;
                                }
                              }
                            }
                          }
                        }}
                        placeholder="Paste Screenshot (Ctrl+V) or paste document URL..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 pointer-events-none">
                        Ctrl+V 📋
                      </span>
                    </div>

                    {outputUrl && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold">
                        <span className="truncate">
                          {outputUrl.startsWith('data:') ? '📎 File Uploaded Successfully ✅' : outputUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOutputUrl('')}
                          className="text-rose-600 hover:text-rose-800 text-[10px] font-extrabold ml-2 shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {adminStatus === 'REJECTED' && (
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={refundFee}
                    onChange={(e) => setRefundFee(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Refund ₹{selectedReqForAdmin.price.toFixed(2)} to Retailer Wallet</span>
                </label>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReqForAdmin(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-black rounded-xl shadow-md"
                >
                  {isUpdating ? 'Saving...' : 'Save & Notify Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UTI PAN RESIZER TOOL MODAL */}
      <UTIPanResizerModal
        isOpen={Boolean(selectedReqForPanResizer)}
        onClose={() => {
          setSelectedReqForPanResizer(null);
          setPanResizerInitialImage(null);
        }}
        request={selectedReqForPanResizer}
        initialPhoto={panResizerInitialImage}
        initialSig={panResizerInitialImage}
      />

      {/* 2 PDF STAMPER & MERGER TOOL MODAL */}
      <TwoPdfStamperModal
        isOpen={isTwoPdfModalOpen}
        onClose={() => {
          setIsTwoPdfModalOpen(false);
          setSelectedReqForTwoPdf(null);
        }}
        initialRequest={selectedReqForTwoPdf}
        allRequests={requests}
      />

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
              क्या आप वाकई Request <strong className="text-rose-600 font-bold">#{reqToDelete.requestNumber || ''}</strong> को डिलीट (DELETE) करना चाहते हैं? यह डेटा हमेशा के लिए हट जाएगा।
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(isDeletingId)}
                onClick={() => setReqToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel / नहीं
              </button>
              <button
                type="button"
                disabled={Boolean(isDeletingId)}
                onClick={() => executeDeleteRequest(reqToDelete.id, reqToDelete.requestNumber)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-black rounded-xl text-xs cursor-pointer shadow-md transition-colors flex items-center gap-1.5"
              >
                {isDeletingId === reqToDelete.id ? 'Deleting...' : 'Yes, Delete Now'}
              </button>
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
    </div>
  );
};
