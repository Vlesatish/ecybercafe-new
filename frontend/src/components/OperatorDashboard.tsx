import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceRequest, CitizenService } from '../types';
import { useAuth } from '../context/AuthContext';
import { getFormFieldLabel, getFilteredFormDataEntries } from '../utils/formUtils';
import { InlineRequestChat } from './InlineRequestChat';
import { uploadFileToServer } from '../utils/upload';
import { UTIPanResizerModal } from './UTIPanResizerModal';
import { FormAttachmentImageCard } from './FormAttachmentImageCard';
import { FormAttachmentDocumentCard } from './FormAttachmentDocumentCard';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';
import { realtimeClient } from '../utils/realtimeClient';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FileText, 
  Upload, 
  MessageSquare, 
  Eye, 
  LogOut, 
  RefreshCw, 
  Check, 
  Layers, 
  UserCheck,
  AlertCircle,
  Lock,
  Unlock,
  ShieldAlert
} from 'lucide-react';

interface OperatorDashboardProps {
  onLogout: () => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [services, setServices] = useState<CitizenService[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [claimFilter, setClaimFilter] = useState<'UNCLAIMED' | 'MY_CLAIMED'>('UNCLAIMED');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');

  // Request Management State
  const [activeChatReq, setActiveChatReq] = useState<ServiceRequest | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<{ url: string; title: string; filename?: string } | null>(null);
  const [selectedReqForPanResizer, setSelectedReqForPanResizer] = useState<ServiceRequest | null>(null);
  const [panResizerInitialImage, setPanResizerInitialImage] = useState<string | null>(null);
  const [updatingReqId, setUpdatingReqId] = useState<string | null>(null);
  const [claimingReqId, setClaimingReqId] = useState<string | null>(null);
  
  // Status Edit State
  const [editReqStatus, setEditReqStatus] = useState<Record<string, { status: string; remarks: string; outputUrl: string }>>({});
  const [uploadingForReq, setUploadingForReq] = useState<string | null>(null);

  useEffect(() => {
    fetchData(true);

    // Real-time Shared SSE Synchronization
    const unsubscribe = realtimeClient.subscribe((payload) => {
      try {
        if (
          payload.type === 'REQUEST_SUBMITTED' ||
          payload.type === 'STATUS_UPDATED' ||
          payload.type === 'REQUEST_CLAIMED' ||
          payload.type === 'REQUEST_UPDATED' ||
          payload.type === 'CHAT_MESSAGE_SENT'
        ) {
          fetchData(false);
        }
      } catch (e) {}
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial || requests.length === 0) {
        setLoading(true);
      }
      const [srvRes, reqRes] = await Promise.all([
        fetch('/api/services'),
        fetch(`/api/requests?operatorUserId=${user?.id || ''}`)
      ]);

      if (srvRes.ok) {
        const srvData = await srvRes.json();
        setServices(srvData);
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData);

        // Merge status edit state map without overwriting user's active local edits
        setEditReqStatus(prev => {
          const next = { ...prev };
          reqData.forEach((r: ServiceRequest) => {
            const current = next[r.id];
            if (!current) {
              next[r.id] = {
                status: r.status,
                remarks: r.adminRemarks || '',
                outputUrl: r.outputAttachmentUrl || '',
              };
            } else {
              // Preserve local status selection if operator has chosen a new status in dropdown
              const userHasLocalUnsavedEdit = current.status !== r.status && current.status !== undefined;
              next[r.id] = {
                status: userHasLocalUnsavedEdit ? current.status : r.status,
                remarks: current.remarks !== undefined && current.remarks !== '' ? current.remarks : (r.adminRemarks || ''),
                outputUrl: current.outputUrl !== undefined && current.outputUrl !== '' ? current.outputUrl : (r.outputAttachmentUrl || ''),
              };
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Error loading operator data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Assigned services list
  const assignedServices = services.filter(s => 
    user?.assignedServiceIds?.includes('*') || user?.assignedServiceIds?.includes(s.id)
  );

  const handleFetchPanApiForReq = async (req: ServiceRequest) => {
    let panNo = req.formData?.pan_no || req.formData?.pan;
    let aadhaar = req.formData?.aadhaar_no || req.formData?.aadhar_no || req.formData?.aadhar || req.formData?.aadhaar;

    if (!panNo) {
      for (const [k, v] of Object.entries(req.formData || {})) {
        if (typeof v === 'string' && /[A-Z]{5}[0-9]{4}[A-Z]{1}/i.test(v.trim())) {
          panNo = v.trim().toUpperCase();
          break;
        }
      }
    }

    if (!aadhaar) {
      for (const [k, v] of Object.entries(req.formData || {})) {
        if (typeof v === 'string' || typeof v === 'number') {
          const cleaned = String(v).replace(/\D/g, '');
          if (cleaned.length === 12) {
            aadhaar = String(v).trim();
            break;
          }
        }
      }
    }

    if (!panNo && !aadhaar) {
      alert('Neither PAN number nor Aadhaar number found in this request!');
      return;
    }

    setLoading(true);
    try {
      if (panNo) {
        const res = await fetch('/api/pandetails/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pan_no: panNo, requestId: req.id })
        });
        const data = await res.json();
        if (data.success) {
          alert(`🎉 PAN Details Fetched Successfully via APIAdda!\n\n• Name: ${data.name || 'N/A'}\n• Father: ${data.fathername || 'N/A'}\n• DOB: ${data.dob || 'N/A'}\n• Aadhaar Status: ${data.aadharno || 'Linked'}\n\nStatus updated to COMPLETED.`);
          await fetchData();
        } else {
          alert(`❌ API Error: ${data.error || 'Failed to fetch PAN Details'}`);
        }
      } else {
        const res = await fetch('/api/panfind/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aadhaar, requestId: req.id })
        });
        const data = await res.json();
        if (data.success && data.pan) {
          alert(`🎉 PAN Found Successfully via APIAdda!\n\nAadhaar: ${aadhaar}\nFound PAN: ${data.pan}\nStatus updated to COMPLETED.`);
          await fetchData();
        } else {
          alert(`❌ API Error: ${data.error || 'Failed to fetch PAN'}`);
        }
      }
    } catch (e: any) {
      alert(`❌ Connection error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesService = selectedServiceFilter === 'ALL' || req.serviceId === selectedServiceFilter;
    
    if (!matchesStatus || !matchesService) return false;

    // Filter by Claim / Acceptance Status
    if (claimFilter === 'UNCLAIMED') {
      // Show ONLY unaccepted requests
      if (req.claimedByOperatorId) {
        return false;
      }
    } else if (claimFilter === 'MY_CLAIMED') {
      // Show ONLY requests accepted by this operator
      if (req.claimedByOperatorId !== user?.id) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const matchesBasic = 
      req.requestNumber.toString().includes(q) ||
      req.serviceTitle.toLowerCase().includes(q) ||
      req.retailerName.toLowerCase().includes(q) ||
      (req.retailerMobile && req.retailerMobile.includes(q)) ||
      (req.claimedByOperatorName && req.claimedByOperatorName.toLowerCase().includes(q));

    const matchesFormData = Object.values(req.formData || {}).some(val => 
      String(val).toLowerCase().includes(q)
    );

    return matchesBasic || matchesFormData;
  });

  const handleStatusChange = (reqId: string, newStatus: string) => {
    setEditReqStatus(prev => {
      const current = prev[reqId] || { status: 'PENDING', remarks: '', outputUrl: '' };
      let newRemarks = current.remarks;

      if (newStatus === 'REJECTED') {
        newRemarks = ''; // Clear remarks field so operator must specify rejection reason
      } else if (newStatus === 'COMPLETED') {
        if (!newRemarks || !newRemarks.trim() || newRemarks.toLowerCase().includes('pending')) {
          newRemarks = 'Done';
        }
      }

      return {
        ...prev,
        [reqId]: {
          ...current,
          status: newStatus,
          remarks: newRemarks,
        }
      };
    });
  };

  const handleClaimRequest = async (reqId: string, action: 'CLAIM' | 'RELEASE') => {
    try {
      setClaimingReqId(reqId);
      const res = await fetch(`/api/requests/${reqId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId: user?.id,
          operatorName: user?.name,
          action,
        }),
      });

      if (res.ok) {
        if (action === 'CLAIM') {
          setClaimFilter('MY_CLAIMED');
        }
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Request lock/claim operation failed');
      }
    } catch (err: any) {
      alert('Error updating request lock: ' + err.message);
    } finally {
      setClaimingReqId(null);
    }
  };

  const handleStatusUpdate = async (reqId: string) => {
    const state = editReqStatus[reqId];
    const req = requests.find(r => r.id === reqId);
    if (!state || !req) return;

    if (state.status === 'REJECTED' && (!state.remarks || !state.remarks.trim())) {
      alert('⚠️ Rejection Reason Required / रिजेक्शन का कारण अनिवार्य है!\n\n(कृपया रिजेक्ट करने का स्पष्ट कारण Remarks में दर्ज करें, जैसे: "फोटो धुंधली है", "दस्तावेज़ अधूरा है" आदि).');
      return;
    }

    try {
      setUpdatingReqId(reqId);

      // Auto claim if not claimed yet
      if (!req.claimedByOperatorId && user?.id) {
        await fetch(`/api/requests/${reqId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorId: user.id,
            operatorName: user.name,
            action: 'CLAIM',
          }),
        });
      }

      const res = await fetch(`/api/admin/requests/${reqId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: state.status,
          adminRemarks: state.remarks,
          outputAttachmentUrl: state.outputUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedReq = data.request;

        if (updatedReq) {
          setRequests(prev => prev.map(r => r.id === reqId ? updatedReq : r));
          setEditReqStatus(prev => ({
            ...prev,
            [reqId]: {
              status: updatedReq.status,
              remarks: updatedReq.adminRemarks || '',
              outputUrl: updatedReq.outputAttachmentUrl || '',
            }
          }));
        }
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update request status');
      }
    } catch (error) {
      console.error('Failed to update request:', error);
      alert('Network error while updating request status.');
    } finally {
      setUpdatingReqId(null);
    }
  };

  const handleFileUploadForReq = async (reqId: string, file: File) => {
    try {
      setUploadingForReq(reqId);
      const res = await uploadFileToServer(file);
      setEditReqStatus(prev => ({
        ...prev,
        [reqId]: { ...prev[reqId], outputUrl: res.url }
      }));
    } catch (err: any) {
      alert('File upload failed: ' + err.message);
    } finally {
      setUploadingForReq(null);
    }
  };

  const handlePasteFileForReq = async (reqId: string, e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check files array first (e.g. copied file or screenshot)
    const files = clipboardData.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.indexOf('image') !== -1 || file.type.indexOf('pdf') !== -1 || file.type.indexOf('document') !== -1) {
        e.preventDefault();
        handleFileUploadForReq(reqId, file);
        return;
      }
    }

    // Check clipboard items (e.g. Snipping Tool / Print Screen directly)
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1 || item.type.indexOf('pdf') !== -1 || item.kind === 'file') {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            const ext = blob.type ? blob.type.split('/')[1] || 'png' : 'png';
            const file = new File([blob], `receiving_slip_${Date.now()}.${ext}`, { type: blob.type || 'image/png' });
            handleFileUploadForReq(reqId, file);
            return;
          }
        }
      }
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const processCount = requests.filter(r => r.status === 'IN_PROCESS').length;
  const completedCount = requests.filter(r => r.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-white p-2">
              <img src={lightboxImage} alt="Enlarged Document" className="max-w-full max-h-[85vh] object-contain rounded-xl mx-auto" />
              <button 
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-slate-950/80 text-white p-2 rounded-full hover:bg-rose-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg text-slate-900 leading-none">
                  {user?.name || 'Operator Panel'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  Operator Panel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {user?.operatorLabel || 'Assigned Services Processing Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-200 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner with assigned services & counts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black text-indigo-600 uppercase tracking-wider block">
                Assigned Department Dashboard
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Welcome, {user?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Requests submitted by retailers for your assigned services will appear below in real-time.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-amber-50 border border-amber-300 rounded-2xl px-3.5 py-2 text-center min-w-[85px]">
                <span className="text-[10px] font-black text-amber-800 uppercase block">Pending</span>
                <span className="text-xl font-black text-amber-600">{pendingCount}</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-3.5 py-2 text-center min-w-[85px]">
                <span className="text-[10px] font-black text-blue-800 uppercase block">In Process</span>
                <span className="text-xl font-black text-blue-600">{processCount}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 text-center min-w-[85px]">
                <span className="text-[10px] font-black text-emerald-800 uppercase block">Completed</span>
                <span className="text-xl font-black text-emerald-600">{completedCount}</span>
              </div>
            </div>
          </div>

          {/* Service Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs font-black text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Assigned Services:
            </span>
            {assignedServices.length > 0 ? (
              assignedServices.map(srv => (
                <span key={srv.id} className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {srv.title}
                </span>
              ))
            ) : (
              <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                All Portal Services Access Enabled
              </span>
            )}
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          {/* Claim & Acceptance Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
              <span>Acceptance Filter:</span>
            </span>

            {[
              { id: 'UNCLAIMED', label: '⏳ Unaccepted Only (केवल बिना स्वीकार की गई)' },
              { id: 'MY_CLAIMED', label: '👤 My Accepted Only (केवल मेरी)' },
              { id: 'ALL', label: '🌐 All Requests (सभी लिस्ट)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setClaimFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  claimFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs border border-indigo-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Applicant Name, Mobile, Request #, Form Inputs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-4 py-2.5 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="md:col-span-6 flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {['ALL', 'PENDING', 'IN_PROCESS', 'COMPLETED', 'REJECTED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading && requests.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading assigned service applications...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No requests found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              There are no service requests matching your selected filters in your assigned department.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map(req => {
              const matchedService = services.find(s => s.id === req.serviceId || s.title === req.serviceTitle);
              const state = editReqStatus[req.id] || { status: req.status, remarks: req.adminRemarks || '', outputUrl: req.outputAttachmentUrl || '' };
              const isUpdating = updatingReqId === req.id;
              const isUploading = uploadingForReq === req.id;
              const isClaiming = claimingReqId === req.id;

              // Multi-Operator Claim Status
              const isClaimed = Boolean(req.claimedByOperatorId);
              const isClaimedByMe = req.claimedByOperatorId === user?.id;
              const isClaimedByOther = isClaimed && !isClaimedByMe;

              const getStatusNeonCardStyle = (st: string) => {
                switch (st) {
                  case 'PENDING':
                    return 'border-2 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.22)] bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-white';
                  case 'IN_PROCESS':
                    return 'border-2 border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.22)] bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-white';
                  case 'COMPLETED':
                    return 'border-2 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.22)] bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-white';
                  case 'REJECTED':
                    return 'border-2 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.22)] bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-white';
                  default:
                    return 'border border-slate-200 bg-white';
                }
              };

              return (
                <div 
                  key={req.id}
                  className={`rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 transition-all relative ${getStatusNeonCardStyle(req.status)}`}
                >
                  {/* Multi-Operator Locking / Claim Banner */}
                  <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold ${
                    isClaimedByMe
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : isClaimedByOther
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isClaimedByMe ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>✅ Accepted & Claimed by You ({user?.name}) — You are processing this request.</span>
                        </>
                      ) : isClaimedByOther ? (
                        <>
                          <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>🔒 Locked: Currently accepted & being processed by Operator <strong>"{req.claimedByOperatorName}"</strong>.</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>⚠️ Unassigned Request: Click "Accept Request" below to lock and start working on this task.</span>
                        </>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {!isClaimed && (
                        <button
                          onClick={() => handleClaimRequest(req.id, 'CLAIM')}
                          disabled={isClaiming}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>Accept Request (काम स्वीकार करें)</span>
                        </button>
                      )}

                      {isClaimedByMe && (
                        <button
                          onClick={() => handleClaimRequest(req.id, 'RELEASE')}
                          disabled={isClaiming}
                          className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                          <span>Release / Unclaim</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Top Bar Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                        #{req.requestNumber}
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                          {req.serviceTitle}
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {req.category}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Retailer: <strong className="text-slate-900 font-bold">{req.retailerName}</strong> ({req.retailerMobile || 'N/A'})</span>
                          <span>• Fee: <strong className="text-emerald-700 font-black">₹{req.price}</strong></span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Entry Time: <span className="text-indigo-700 font-black">{req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A'}</span></span>
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* PENDING: Bright Yellow Background as requested */}
                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs ${
                        req.status === 'PENDING' ? 'bg-amber-400 text-amber-950 border border-amber-500/60' :
                        req.status === 'IN_PROCESS' ? 'bg-blue-600 text-white' :
                        req.status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                        'bg-rose-600 text-white'
                      }`}>
                        {req.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {req.status === 'IN_PROCESS' && <Clock className="w-3.5 h-3.5" />}
                        {req.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                        {req.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* 2-COLUMN SPLIT GRID LAYOUT */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                    {/* LEFT COLUMN: Application Details & Status Update Form */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Submitted Form Details Grid */}
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block border-b border-slate-200/80 pb-1.5">
                          📋 SUBMITTED APPLICATION INPUT DATA
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                <div key={entry.key} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-0.5 min-w-0 shadow-2xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">{entry.label}</span>
                                  <span className="text-xs font-black text-slate-900 block break-words break-all">
                                    {strVal || '—'}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Operator Processing & File Upload Controls */}
                      <div className={`rounded-2xl p-4 border transition-all ${
                        isClaimedByOther 
                          ? 'bg-slate-50 border-slate-200 opacity-60 pointer-events-none' 
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3 flex-wrap gap-2">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <span className="text-amber-500">⚡</span>
                            <span>Update Request Status & Attach Receiving Slip</span>
                          </span>

                          <div className="flex items-center gap-2">
                            {(req.serviceId === 'srv_8' || req.category === 'PAN' || req.serviceTitle.toLowerCase().includes('pan')) && (
                              <button
                                type="button"
                                onClick={() => handleFetchPanApiForReq(req)}
                                className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                              >
                                <span>⚡ Auto Find PAN (APIAdda)</span>
                              </button>
                            )}

                            {isClaimedByOther && (
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-200">
                                🔒 Locked for other operators
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          {/* Status Selector */}
                          <div className="sm:col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase block">Status (स्थिति)</label>
                            <select
                              disabled={isClaimedByOther || (!isClaimedByMe && isClaimed)}
                              value={state.status}
                              onChange={e => handleStatusChange(req.id, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-black text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 shadow-2xs"
                            >
                              <option value="PENDING">PENDING (लंबित)</option>
                              <option value="IN_PROCESS">IN_PROCESS (प्रगति पर)</option>
                              <option value="COMPLETED">COMPLETED (पूर्ण)</option>
                              <option value="REJECTED">REJECTED (अस्वीकृत)</option>
                            </select>
                          </div>

                          {/* Remarks Input */}
                          <div className="sm:col-span-7 space-y-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase block">Operator Remarks / Notes (टिप्पणी)</label>
                            <input
                              type="text"
                              disabled={isClaimedByOther || (!isClaimedByMe && isClaimed)}
                              placeholder="e.g. Done / Ack No: 12345"
                              value={state.remarks}
                              onChange={e => setEditReqStatus(prev => ({
                                ...prev,
                                [req.id]: { ...prev[req.id], remarks: e.target.value }
                              }))}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 shadow-2xs"
                            />
                          </div>

                          {/* File Attachment Upload */}
                          <div className="sm:col-span-12 space-y-1 pt-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-slate-600 uppercase block">
                                Upload Output File / Certificate (PDF / Image)
                              </label>
                              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80 flex items-center gap-1 animate-pulse">
                                📋 Ctrl+V Screenshot Paste Allowed
                              </span>
                            </div>

                            <div 
                              onPaste={e => handlePasteFileForReq(req.id, e)}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200"
                            >
                              <label className={`px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs ${
                                isClaimedByOther ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                <span>{isUploading ? 'Uploading...' : 'Choose File'}</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  disabled={isUploading || isClaimedByOther}
                                  className="hidden"
                                  onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUploadForReq(req.id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>

                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  disabled={isClaimedByOther}
                                  placeholder="Paste Screenshot (Ctrl+V) or paste URL..."
                                  value={state.outputUrl}
                                  onPaste={e => handlePasteFileForReq(req.id, e)}
                                  onChange={e => setEditReqStatus(prev => ({
                                    ...prev,
                                    [req.id]: { ...prev[req.id], outputUrl: e.target.value }
                                  }))}
                                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pr-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 pointer-events-none hidden sm:inline-block">
                                  Ctrl+V 📋
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  if (!isClaimed) {
                                    // Auto claim for this operator on save
                                    handleClaimRequest(req.id, 'CLAIM').then(() => handleStatusUpdate(req.id));
                                  } else {
                                    handleStatusUpdate(req.id);
                                  }
                                }}
                                disabled={isUpdating || isClaimedByOther}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Save Status</span>
                              </button>
                            </div>

                            {/* Output URL Preview Tag */}
                            {state.outputUrl && (
                              <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-extrabold gap-2 animate-fadeIn">
                                <span className="truncate flex items-center gap-1.5">
                                  <span>📎 Attachment Ready:</span>
                                  <span className="font-mono text-[11px] font-normal text-emerald-800 truncate">{state.outputUrl}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditReqStatus(prev => ({
                                    ...prev,
                                    [req.id]: { ...prev[req.id], outputUrl: '' }
                                  }))}
                                  className="text-rose-600 hover:text-rose-800 text-[10px] font-black underline shrink-0 cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Live Chat with Neon Glow Shadow Border */}
                    <div className="lg:col-span-5">
                      <div className="h-full rounded-3xl border-2 border-indigo-400/80 bg-white shadow-[0_0_20px_rgba(99,102,241,0.25)] p-1 overflow-hidden flex flex-col transition-shadow hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]">
                        <div className="px-3.5 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between rounded-t-2xl">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="font-black text-xs text-indigo-900 flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-indigo-600" />
                              <span>Live Chat & Messages for #{req.requestNumber}</span>
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200">
                            Retailer Chat
                          </span>
                        </div>

                        <div className="p-2 flex-1 min-h-[360px] flex flex-col justify-between">
                          <InlineRequestChat
                            request={req}
                            initialOpen={true}
                            enableChat={services.find(s => s.id === req.serviceId || s.title?.trim().toLowerCase() === req.serviceTitle?.trim().toLowerCase())?.enableChat ?? true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
            <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
            <p className="text-xs text-slate-400 font-bold mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
};
