import React, { useState, useEffect, useMemo } from 'react';
import { CitizenService, ServiceRequest, User, getServicePriceForUser, PublicGovService, PortalSubItem } from '../types';
import { syncServicesWithServerIfNeeded, getServicesWithRecoveryCheck, subscribeToFirestoreServices } from '../utils/serviceStorage';
import { useAuth } from '../context/AuthContext';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';
import { 
  Search, 
  Filter, 
  Wallet, 
  Coins, 
  Activity, 
  ArrowUpCircle, 
  AlertTriangle, 
  Fingerprint, 
  ShieldCheck, 
  Download, 
  FileText, 
  Car, 
  CreditCard, 
  Users, 
  Sparkles, 
  ArrowRight,
  Clock,
  Tag,
  Smartphone,
  Crown,
  Zap,
  Phone,
  FileCheck,
  UserPlus,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Layers
} from 'lucide-react';

const getServiceIcon = (title: string, category: string, iconClass = "w-5 h-5 text-white") => {
  const lower = (title + ' ' + category).toLowerCase();
  if (lower.includes('mobile') || lower.includes('phone') || lower.includes('sim')) return <Smartphone className={iconClass} />;
  if (lower.includes('download') || lower.includes('pdf')) return <Download className={iconClass} />;
  if (lower.includes('find') || lower.includes('check') || lower.includes('search')) return <Search className={iconClass} />;
  if (lower.includes('challan') || lower.includes('vehicle') || lower.includes('car')) return <Car className={iconClass} />;
  if (lower.includes('pan') || lower.includes('card')) return <CreditCard className={iconClass} />;
  if (lower.includes('voter') || lower.includes('samagra') || lower.includes('district')) return <Users className={iconClass} />;
  return <Fingerprint className={iconClass} />;
};

interface RetailerDashboardProps {
  onOpenServiceModal: (service: CitizenService) => void;
  onOpenWalletModal: () => void;
  onOpenUpgradeModal: () => void;
  onOpenIfscModal?: () => void;
  onNavigate?: (nav: string) => void;
  onOpenPassportPhoto?: () => void;
  onOpenIDCardPrint?: () => void;
  onOpenPdfPageManager?: () => void;
  onOpenJpgToPdf?: () => void;
  onOpenResumeMaker?: () => void;
  onOpenPaymentQR?: () => void;
  onOpenCompressorModal?: () => void;
  onOpenPanResizer?: () => void;
  requests: ServiceRequest[];
}

export const RetailerDashboard: React.FC<RetailerDashboardProps> = ({
  onOpenServiceModal,
  onOpenWalletModal,
  onOpenUpgradeModal,
  onOpenIfscModal,
  onNavigate,
  onOpenPassportPhoto,
  onOpenIDCardPrint,
  onOpenPdfPageManager,
  onOpenJpgToPdf,
  onOpenResumeMaker,
  onOpenPaymentQR,
  onOpenCompressorModal,
  onOpenPanResizer,
  requests
}) => {
  const { user } = useAuth();
  const [services, setServices] = useState<CitizenService[]>(() => {
    const cached = getServicesWithRecoveryCheck();
    return cached ? cached.filter(s => s.isActive !== false) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [badgeFilter, setBadgeFilter] = useState<'ALL' | 'NEW' | 'PREMIUM'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = getServicesWithRecoveryCheck();
    return !(cached && cached.length > 0);
  });

  const [savedCustomCategories, setSavedCustomCategories] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('ecyber_cached_custom_categories');
      return cached ? JSON.parse(cached) : ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];
    } catch (e) {
      return ['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil'];
    }
  });

  const [portalServices, setPortalServices] = useState<PublicGovService[]>([]);
  const [selectedPortalModal, setSelectedPortalModal] = useState<PublicGovService | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<{ url: string; title: string; filename?: string } | null>(null);
  const [copiedLinkUrl, setCopiedLinkUrl] = useState<string | null>(null);

  const copyToClipboard = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedLinkUrl(url);
    setTimeout(() => setCopiedLinkUrl(null), 2500);
  };

  const fetchPortalServices = async () => {
    try {
      const res = await fetch('/api/public-services');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.services || []);
        setPortalServices(list.filter((s: PublicGovService) => s.isActive !== false));
      }
    } catch (e) {
      console.error('Error fetching portal services:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.customCategories)) {
          setSavedCustomCategories(data.customCategories);
          try {
            localStorage.setItem('ecyber_cached_custom_categories', JSON.stringify(data.customCategories));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services?activeOnly=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const synced = await syncServicesWithServerIfNeeded(data);
          setServices(synced.filter(s => s.isActive !== false));
        }
      } else {
        const recovered = getServicesWithRecoveryCheck();
        if (recovered && recovered.length > 0) setServices(recovered.filter(s => s.isActive !== false));
      }
    } catch (e) {
      console.error(e);
      const recovered = getServicesWithRecoveryCheck();
      if (recovered && recovered.length > 0) setServices(recovered.filter(s => s.isActive !== false));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchPortalServices();

    const unsubscribeFirestore = subscribeToFirestoreServices((liveSrvs) => {
      if (Array.isArray(liveSrvs) && liveSrvs.length > 0) {
        setServices(liveSrvs.filter(s => s.isActive !== false));
      }
    });

    const handleSync = () => {
      fetchServices();
      fetchCategories();
      fetchPortalServices();
    };

    const handleRealtime = (e: any) => {
      if (e.detail?.type === 'PUBLIC_SERVICES_UPDATED') {
        if (e.detail.data?.services) {
          setPortalServices(e.detail.data.services.filter((s: PublicGovService) => s.isActive !== false));
        } else {
          fetchPortalServices();
        }
      }
    };

    window.addEventListener('custom_categories_updated', handleSync);
    window.addEventListener('services_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('app_realtime_event', handleRealtime);
    window.addEventListener('app-realtime-event', handleRealtime);

    return () => {
      window.removeEventListener('custom_categories_updated', handleSync);
      window.removeEventListener('services_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('app_realtime_event', handleRealtime);
      window.removeEventListener('app-realtime-event', handleRealtime);
      unsubscribeFirestore();
    };
  }, []);

  const userAssignedIds = user?.assignedServiceIds;

  const isDistributorUser = user && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(user.role);

  const allowedServices = useMemo(() => {
    let list = services;
    if (!isDistributorUser) {
      list = list.filter(srv => !srv.isDistributorOnly);
    }
    if (userAssignedIds && userAssignedIds.length > 0 && !userAssignedIds.includes('*')) {
      list = list.filter(srv => userAssignedIds.includes(srv.id));
    }
    return [...list].sort((a, b) => (a.priority || 9999) - (b.priority || 9999));
  }, [services, userAssignedIds, isDistributorUser]);

  const availableCategories = useMemo(() => {
    const catMap = new Map<string, string>(); // lowercase -> display string

    // Dynamically include every category present on allowedServices for this account
    allowedServices.forEach(srv => {
      if (srv.category && srv.category.trim()) {
        const trimmed = srv.category.trim();
        const lower = trimmed.toLowerCase();
        if (!catMap.has(lower)) {
          catMap.set(lower, trimmed);
        }
      }
    });

    return Array.from(catMap.values());
  }, [savedCustomCategories, allowedServices]);

  const filteredServices = allowedServices.filter(srv => {
    const matchesSearch = srv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (srv.category && srv.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const srvCat = (srv.category || '').trim().toLowerCase();
    const selCat = (selectedCategory || 'ALL').trim().toLowerCase();

    const matchesCat = selCat === 'all' || 
                       srvCat === selCat || 
                       (srvCat.length > 0 && selCat.length > 0 && (srvCat.includes(selCat) || selCat.includes(srvCat)));
    const matchesBadge = badgeFilter === 'ALL' || srv.badge === badgeFilter;
    return matchesSearch && matchesCat && matchesBadge;
  });

  const matchingDirectPortalLinks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const results: Array<{
      id: string;
      title: string;
      url: string;
      type?: string;
      portalTitle: string;
    }> = [];

    portalServices.forEach(p => {
      p.subItems?.forEach((sub, sIdx) => {
        if (
          sub.title.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.hindiTitle && p.hindiTitle.toLowerCase().includes(q)) ||
          (sub.url && sub.url.toLowerCase().includes(q))
        ) {
          results.push({
            id: `${p.id}-portal-${sIdx}`,
            title: sub.title,
            url: sub.url,
            type: sub.type,
            portalTitle: p.title
          });
        }
      });
    });

    return results;
  }, [searchQuery, portalServices]);

  const activeRequestsCount = requests.filter(r => r.status === 'PENDING' || r.status === 'IN_PROCESS').length;

  return (
    <div className="space-y-6 text-[#111827] pb-28 sm:pb-32 font-sans">
      {/* Special Service Account Banner */}
      {userAssignedIds && userAssignedIds.length > 0 && !userAssignedIds.includes('*') && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/90 rounded-[16px] p-4 flex items-center justify-between text-indigo-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="space-y-0.5">
              <p className="font-black text-xs text-indigo-950">
                🎯 विशेष सेवा खाता (Special Service Restricted Account)
              </p>
              <p className="text-[11px] text-indigo-800 font-medium">
                आपकी आईडी के लिए <span className="font-extrabold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md">{allowedServices.length} विशेष सेवाएं</span> चालू/मार्क की गई हैं।
              </p>
            </div>
          </div>
        </div>
      )}


      {/* 4. Services Catalog Section */}
      <div className="bg-white border border-slate-200 rounded-[20px] p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>Our Services</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)]">
                160
              </span>
            </h3>
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <span>🔍 Yaha se koi bhi service search kar sakte hai</span>
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            onClick={() => { setSelectedCategory('ALL'); setBadgeFilter('ALL'); }}
            className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'ALL' && badgeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] font-extrabold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            FILTER: All Services
          </button>

          <button
            onClick={() => setBadgeFilter(badgeFilter === 'NEW' ? 'ALL' : 'NEW')}
            className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              badgeFilter === 'NEW'
                ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            ✨ NEW Only
          </button>

          <button
            onClick={() => setBadgeFilter(badgeFilter === 'PREMIUM' ? 'ALL' : 'PREMIUM')}
            className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              badgeFilter === 'PREMIUM'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                : 'bg-purple-50 text-purple-900 border border-purple-200'
            }`}
          >
            👑 Premium
          </button>

          {availableCategories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory.toLowerCase() === cat.toLowerCase() ? 'ALL' : cat)}
              className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Related Direct Links from Portals matching Search Query */}
        {searchQuery && matchingDirectPortalLinks.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/50 border border-blue-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>Related Direct Links & PDFs (सर्च से जुड़े सीधे लिंक्स)</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black">
                  {matchingDirectPortalLinks.length}
                </span>
              </span>
              <span className="text-[11px] font-bold text-blue-700 hidden sm:inline">
                Click to Open
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {matchingDirectPortalLinks.map((sub) => {
                const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));

                return (
                  <a
                    key={sub.id}
                    href={sub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all group shadow-2xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isPdf ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-blue-100 text-blue-600 border border-blue-200'
                      }`}>
                        {isPdf ? '📄' : <ExternalLink className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate block">
                          {sub.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium truncate block">
                          {sub.portalTitle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                      ↗
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading citizen services catalog...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No services found matching search.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                onClick={() => onOpenServiceModal(srv)}
                className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-500 rounded-[24px] p-4 flex flex-col items-center justify-between text-center transition-all cursor-pointer group hover:-translate-y-1 shadow-2xs hover:shadow-lg relative overflow-hidden"
              >
                {/* Service Title at top */}
                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[36px] leading-tight px-1">
                  {srv.title}
                </h4>

                {/* Circular Emblem / Custom Image in center - ENLARGED */}
                <div className="my-3 relative flex items-center justify-center">
                  <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 p-1.5 flex items-center justify-center transition-all group-hover:scale-105 ${
                    srv.badge === 'PREMIUM'
                      ? 'border-amber-400 bg-amber-50/70 shadow-[0_0_18px_rgba(245,158,11,0.3)] ring-2 ring-amber-200/60'
                      : srv.badge === 'NEW'
                      ? 'border-rose-400 bg-rose-50/70 shadow-[0_0_18px_rgba(244,63,94,0.3)] ring-2 ring-rose-200/60'
                      : 'border-blue-400 bg-blue-50/70 shadow-xs ring-2 ring-blue-100'
                  }`}>
                    <div className="w-full h-full rounded-full border border-slate-200 flex items-center justify-center bg-white overflow-hidden p-1 shadow-inner">
                      {srv.iconUrl ? (
                        <img 
                          src={srv.iconUrl} 
                          alt={srv.title} 
                          className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-full h-full rounded-full flex items-center justify-center text-white shadow-xs ${
                          srv.badge === 'PREMIUM'
                            ? 'bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700'
                            : srv.badge === 'NEW'
                            ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-rose-700'
                            : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700'
                        }`}>
                          {getServiceIcon(srv.title, srv.category, "w-10 h-10 sm:w-12 sm:h-12 text-white")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fitted Badge Tag over bottom of circle */}
                  {srv.isDistributorOnly && (
                    <span className="absolute -top-1 -right-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md border border-amber-300 flex items-center gap-0.5 z-10 whitespace-nowrap">
                      <ShieldCheck className="w-3 h-3 text-slate-950" />
                      <span>DISTRIBUTOR ONLY</span>
                    </span>
                  )}
                  {srv.badge === 'PREMIUM' && (
                    <span className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs border border-amber-300 flex items-center gap-0.5 z-10 whitespace-nowrap">
                      <Crown className="w-3 h-3 fill-slate-950 text-slate-950" />
                      <span>PREMIUM</span>
                    </span>
                  )}
                  {srv.badge === 'NEW' && (
                    <span className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xs border border-rose-400 flex items-center gap-0.5 z-10 whitespace-nowrap">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>NEW</span>
                    </span>
                  )}
                </div>

                {/* Rate Niche (Price Tag at bottom) */}
                {(() => {
                  const { displayPrice, isDistributorRate, retailerPrice } = getServicePriceForUser(srv, user);
                  return (
                    <div className="mt-2 pt-1 flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5 justify-center flex-wrap">
                        <span className={`font-black text-base tracking-tight ${isDistributorRate ? 'text-emerald-600' : 'text-blue-600'}`}>
                          ₹{displayPrice.toFixed(0)}
                        </span>
                        {isDistributorRate && displayPrice < retailerPrice && (
                          <span className="text-[11px] line-through text-slate-400 font-medium">
                            ₹{retailerPrice.toFixed(0)}
                          </span>
                        )}
                      </div>
                      {isDistributorRate && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                          Distributor Rate
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPUP MODAL: Selected Portal Service Dialog (DIRECT & PDF CONTROLS) */}
      {selectedPortalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300 font-bold shrink-0">
                  <Globe className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-lg sm:text-xl text-white tracking-tight">
                      {selectedPortalModal.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase">
                      DIRECT & PDF CONTROLS
                    </span>
                  </div>
                  {selectedPortalModal.hindiTitle && (
                    <p className="text-xs sm:text-sm font-semibold text-blue-200 mt-0.5">
                      {selectedPortalModal.hindiTitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPortalModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {selectedPortalModal.description || 'Access official government links, direct application portals, questionnaire modules, and official downloadable PDF guides.'}
              </p>

              {/* Direct Main Portal Button */}
              {selectedPortalModal.actionUrl && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-indigo-950">Official Website Entry</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Direct secure portal server</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={selectedPortalModal.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <span>Open Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => copyToClipboard(selectedPortalModal.actionUrl!, e)}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                      title="Copy URL"
                    >
                      {copiedLinkUrl === selectedPortalModal.actionUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Items / PDF Controls */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Available Controls & Documents ({selectedPortalModal.subItems?.length || 0})</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPortalModal.subItems && selectedPortalModal.subItems.length > 0 ? (
                    selectedPortalModal.subItems.map((sub, sIdx) => {
                      const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));
                      const isCopied = copiedLinkUrl === sub.url;

                      return (
                        <div
                          key={sub.id || sIdx}
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 ${
                            isPdf 
                              ? 'bg-orange-50/60 border-orange-200' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {isPdf ? (
                              <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-300 flex flex-col items-center justify-center text-orange-700 shrink-0">
                                <FileText className="w-3.5 h-3.5 text-orange-600" />
                                <span className="text-[7px] font-black leading-none">PDF</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                                <ExternalLink className="w-4 h-4 text-blue-600" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                                {sub.title}
                              </p>
                              <span className={`text-[10px] font-bold ${isPdf ? 'text-orange-700' : 'text-blue-600'}`}>
                                {isPdf ? '📄 PDF Document / Guideline' : '🌐 Direct Web Link'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            {isPdf ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDocModal({
                                    url: sub.url,
                                    title: sub.title,
                                    filename: `${sub.title}.pdf`
                                  })}
                                  className="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview PDF</span>
                                </button>
                                <a
                                  href={sub.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white hover:bg-orange-100 text-orange-800 border border-orange-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  title="Open in New Tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </>
                            ) : (
                              <>
                                <a
                                  href={sub.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                                >
                                  <span>Open Link</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => copyToClipboard(sub.url, e)}
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  title="Copy URL"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      No extra sub-links configured. Click the main button above to visit the portal.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedPortalModal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black rounded-xl cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
