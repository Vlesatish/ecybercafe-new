import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  ExternalLink,
  Globe,
  RefreshCw,
  Eye,
  FileText,
  Check,
  Copy,
  Printer,
  Download,
  Share2
} from 'lucide-react';
import { PublicGovService, PortalSubItem } from '../types';
import { PORTAL_GOV_SERVICES_DATA } from '../data/portalServicesData';
import { PhotoPreviewLightboxModal } from './PhotoPreviewLightboxModal';

interface PortalServicesViewProps {
  onPreviewPdf?: (url: string, title: string) => void;
}

export const PortalServicesView: React.FC<PortalServicesViewProps> = ({ onPreviewPdf }) => {
  const [services, setServices] = useState<PublicGovService[]>(PORTAL_GOV_SERVICES_DATA);
  const [selectedService, setSelectedService] = useState<PublicGovService | null>(PORTAL_GOV_SERVICES_DATA[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePdfModal, setActivePdfModal] = useState<{ url: string; title: string } | null>(null);
  const [gridCols, setGridCols] = useState(6);

  // Dynamically track columns based on viewport breakpoint
  useEffect(() => {
    const updateCols = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) setGridCols(6);
        else if (window.innerWidth >= 768) setGridCols(4);
        else if (window.innerWidth >= 640) setGridCols(3);
        else setGridCols(2);
      }
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  // Fetch live services from backend if available, fallback to PORTAL_GOV_SERVICES_DATA
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/public-services');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setServices(data);
          // Maintain selection or default to first
          if (!selectedService || !data.some(d => d.id === selectedService.id)) {
            setSelectedService(data[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Using local fallback portal services data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    const handleRealtime = (e: any) => {
      if (e?.detail?.type === 'PUBLIC_SERVICES_UPDATED') {
        fetchServices();
      }
    };
    window.addEventListener('app_realtime_event', handleRealtime);
    return () => window.removeEventListener('app_realtime_event', handleRealtime);
  }, []);

  const handleCopyLink = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPdf = (url: string, title: string) => {
    if (onPreviewPdf) {
      onPreviewPdf(url, title);
    } else {
      setActivePdfModal({ url, title });
    }
  };

  const filteredServices = services.filter(service => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      service.title.toLowerCase().includes(query) ||
      (service.hindiTitle && service.hindiTitle.toLowerCase().includes(query)) ||
      (service.category && service.category.toLowerCase().includes(query)) ||
      (service.subItems && service.subItems.some(sub => sub.title.toLowerCase().includes(query)))
    );
  });

  // Vector / illustrated icons matching exact visual styling in images 1, 2, 3
  const renderPortalIcon = (iconType: string) => {
    switch (iconType) {
      case 'census':
        return (
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center shadow-xs border-2 border-slate-700 text-white font-black text-center p-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-blue-600 to-slate-950 opacity-80"></div>
            <div className="relative z-10 flex flex-col items-center justify-center leading-none">
              <span className="text-[8px] font-black tracking-tighter text-amber-400">INDIA</span>
              <span className="text-[10px] font-black">CENSUS</span>
            </div>
          </div>
        );
      case 'aadhaar_beta':
        return (
          <div className="w-12 h-12 rounded-full bg-indigo-50 border-2 border-indigo-500 flex flex-col items-center justify-center shadow-xs relative">
            <span className="text-base">👆</span>
            <span className="absolute -bottom-1 text-[7px] font-black bg-indigo-600 text-white px-1 rounded-full uppercase tracking-tighter">BETA</span>
          </div>
        );
      case 'aadhaar_info':
      case 'aadhaar':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🆔</span>
          </div>
        );
      case 'pan_service':
      case 'pan':
        return (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 border border-cyan-400 flex flex-col items-center justify-center shadow-xs text-white p-1">
            <span className="text-[8px] font-black bg-white text-blue-900 px-1 rounded leading-tight">PAN</span>
            <span className="text-[11px] font-black mt-0.5">💳</span>
          </div>
        );
      case 'voter_service':
      case 'voter':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🗳️</span>
          </div>
        );
      case 'ayushman_service':
      case 'ayushman':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🏥</span>
          </div>
        );
      case 'dl_service':
        return (
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border-2 border-indigo-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🪪</span>
          </div>
        );
      case 'rc_service':
        return (
          <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">📋</span>
          </div>
        );
      case 'vehicle_service':
      case 'car':
        return (
          <div className="w-12 h-12 rounded-xl bg-rose-50 border-2 border-rose-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🚗</span>
          </div>
        );
      case 'birth_death':
        return (
          <div className="w-12 h-12 rounded-xl bg-teal-50 border-2 border-teal-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">📜</span>
          </div>
        );
      case 'echallan':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🚨</span>
          </div>
        );
      case 'eshram':
        return (
          <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs text-white">
            <span className="text-[7px] font-black text-amber-400">e-Shram</span>
            <span className="text-xs">👷</span>
          </div>
        );
      case 'apaar':
        return (
          <div className="w-12 h-12 rounded-xl bg-blue-900 border-2 border-blue-400 flex flex-col items-center justify-center shadow-xs text-white">
            <span className="text-[7px] font-black text-blue-200">APAAR</span>
            <span className="text-xs">🎓</span>
          </div>
        );
      case 'abha':
        return (
          <div className="w-12 h-12 rounded-xl bg-sky-50 border-2 border-sky-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🩺</span>
          </div>
        );
      case 'pmfby':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🌾</span>
          </div>
        );
      case 'pmay_g':
      case 'pmay_u':
        return (
          <div className="w-12 h-12 rounded-xl bg-orange-50 border-2 border-orange-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🏡</span>
          </div>
        );
      case 'epfo':
        return (
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border-2 border-cyan-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">⚙️</span>
          </div>
        );
      case 'lic':
        return (
          <div className="w-12 h-12 rounded-xl bg-yellow-50 border-2 border-yellow-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🛡️</span>
          </div>
        );
      case 'enam':
        return (
          <div className="w-12 h-12 rounded-xl bg-green-50 border-2 border-green-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">🥬</span>
          </div>
        );
      case 'pm_kisan':
        return (
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">👨‍🌾</span>
          </div>
        );
      case 'pm_surya_ghar':
        return (
          <div className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg">☀️</span>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center">
            <Globe className="w-6 h-6 text-indigo-600" />
          </div>
        );
    }
  };

  const matchingDirectLinks = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const results: Array<{
      id: string;
      title: string;
      url: string;
      type?: string;
      serviceTitle: string;
      serviceIcon?: string;
    }> = [];

    services.forEach(service => {
      service.subItems?.forEach((sub, sIdx) => {
        if (
          sub.title.toLowerCase().includes(q) ||
          service.title.toLowerCase().includes(q) ||
          (service.hindiTitle && service.hindiTitle.toLowerCase().includes(q)) ||
          (sub.url && sub.url.toLowerCase().includes(q))
        ) {
          results.push({
            id: `${service.id}-sub-${sIdx}`,
            title: sub.title,
            url: sub.url,
            type: sub.type,
            serviceTitle: service.title,
            serviceIcon: service.iconType
          });
        }
      });
    });

    return results;
  }, [searchQuery, services]);

  const serviceRows = React.useMemo(() => {
    const rows: PublicGovService[][] = [];
    for (let i = 0; i < filteredServices.length; i += gridCols) {
      rows.push(filteredServices.slice(i, i + gridCols));
    }
    return rows;
  }, [filteredServices, gridCols]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Section matching Image 1: | Portal Service */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 bg-purple-600 rounded-full"></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Portal Service
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Official Government Portals, Direct Application Links & PDF Documents
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search portal services & links..."
            className="w-full pl-9.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Matching Direct Related Links & PDFs when search is active */}
      {searchQuery && matchingDirectLinks.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/50 border border-purple-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-purple-950 flex items-center gap-2">
              <span>Related Direct Links & PDF Documents (सर्च से जुड़े सीधे लिंक्स)</span>
              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-[10px] font-black">
                {matchingDirectLinks.length}
              </span>
            </span>
            <span className="text-[11px] font-bold text-purple-700 hidden sm:inline">
              Click to Open or Preview
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {matchingDirectLinks.map((sub) => {
              const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));

              if (isPdf) {
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleOpenPdf(sub.url, sub.title)}
                    className="bg-white hover:bg-orange-50/60 border border-purple-200 hover:border-orange-400 rounded-xl p-3 flex items-center justify-between gap-2.5 text-left transition-all group shadow-2xs hover:shadow-xs cursor-pointer w-full"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <div className="w-8 h-8 rounded-lg bg-orange-100/80 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 font-bold text-xs">
                        📄
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-orange-700 truncate block">
                          {sub.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium truncate block">
                          {sub.serviceTitle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md shrink-0">
                      Preview
                    </span>
                  </button>
                );
              }

              return (
                <a
                  key={sub.id}
                  href={sub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white hover:bg-blue-50/60 border border-purple-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all group shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 font-bold text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate block">
                        {sub.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate block">
                        {sub.serviceTitle}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(sub.url || '', sub.id, e)}
                    title="Copy direct URL"
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-md transition-colors shrink-0"
                  >
                    {copiedId === sub.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-scale" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Grid of Portal Service Cards with direct row-by-row expansion */}
      <div className="space-y-4">
        {serviceRows.map((row, rowIdx) => {
          const activeItemInThisRow = row.find(s => s.id === selectedService?.id);

          return (
            <div key={rowIdx} className="space-y-4">
              {/* Row Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {row.map((service) => {
                  const isSelected = selectedService?.id === service.id;

                  return (
                    <div
                      key={service.id}
                      id={`portal-service-card-${service.id}`}
                      onClick={() => setSelectedService(isSelected ? null : service)}
                      className={`group bg-white rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md ${
                        isSelected
                          ? 'border-2 border-purple-600 bg-purple-50/20 shadow-md ring-2 ring-purple-100 -translate-y-0.5'
                          : 'border border-slate-200 hover:border-purple-400 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="my-auto py-1 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                        {renderPortalIcon(service.iconType || 'default')}
                      </div>

                      <div className="mt-auto pt-2 w-full">
                        <h3
                          className={`text-xs sm:text-[13px] font-bold leading-snug transition-colors line-clamp-2 ${
                            isSelected ? 'text-purple-700' : 'text-slate-800 group-hover:text-purple-600'
                          }`}
                        >
                          {service.title}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expander Box DIRECTLY UNDER THIS ROW */}
              {activeItemInThisRow && (
                <div
                  id={`portal-expander-${activeItemInThisRow.id}`}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {/* Header with Title & Close Button */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                        {renderPortalIcon(activeItemInThisRow.iconType || 'default')}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                          {activeItemInThisRow.title}
                        </h3>
                        {activeItemInThisRow.tagline && (
                          <p className="text-xs text-slate-500 font-medium">
                            {activeItemInThisRow.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedService(null)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Close panel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Sub Items 3-column Grid (matching Image 2 & 3) */}
                  <div className="mt-5">
                    {activeItemInThisRow.subItems && activeItemInThisRow.subItems.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                        {activeItemInThisRow.subItems.map((sub) => {
                          const isPdf = sub.type === 'PDF' || (sub.url && sub.url.toLowerCase().endsWith('.pdf'));

                          if (isPdf) {
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleOpenPdf(sub.url, sub.title)}
                                className="bg-white hover:bg-orange-50/50 border border-orange-200/90 hover:border-orange-400 rounded-xl p-3.5 flex items-center justify-between gap-3 text-left transition-all group shadow-2xs hover:shadow-xs cursor-pointer w-full"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform">
                                    <span className="text-[9px] font-black tracking-tighter">📄 PDF</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-800 group-hover:text-orange-700 truncate">
                                    {sub.title}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md shrink-0">
                                  Preview
                                </span>
                              </button>
                            );
                          }

                          return (
                            <a
                              key={sub.id}
                              href={sub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white hover:bg-blue-50/50 border border-blue-200/90 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all group shadow-2xs hover:shadow-xs cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                                  <ExternalLink className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                                  {sub.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleCopyLink(sub.url || '', sub.id || String(Math.random()), e)}
                                title="Copy direct URL"
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-md transition-colors shrink-0"
                              >
                                {copiedId === sub.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 animate-scale" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <a
                          href={activeItemInThisRow.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <span>Open Official Website</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* In-App PDF / Document Lightbox Modal */}
      {activePdfModal && (
        <PhotoPreviewLightboxModal
          isOpen={Boolean(activePdfModal)}
          onClose={() => setActivePdfModal(null)}
          imageUrl={activePdfModal.url}
          title={activePdfModal.title}
          filename={`${activePdfModal.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
        />
      )}
    </div>
  );
};
