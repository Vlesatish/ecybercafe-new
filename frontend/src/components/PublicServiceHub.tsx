import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  FileText, 
  CreditCard, 
  Vote, 
  Car, 
  HeartPulse, 
  Wheat, 
  Briefcase, 
  Award, 
  Building2,
  Filter,
  CheckCircle2,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PublicGovService, User } from '../types';

interface PublicServiceHubProps {
  user?: User | null;
  isAdmin?: boolean;
  onOpenAdminManager?: () => void;
  showAdminControls?: boolean;
}

export const PublicServiceHub: React.FC<PublicServiceHubProps> = ({
  user,
  isAdmin = false,
  onOpenAdminManager,
  showAdminControls = true
}) => {
  const [services, setServices] = useState<PublicGovService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Admin Quick Edit Modal State
  const [editingService, setEditingService] = useState<PublicGovService | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<PublicGovService>>({
    title: '',
    hindiTitle: '',
    tagline: '',
    category: 'Aadhaar',
    portalUrl: '',
    badge: 'OFFICIAL GOVT',
    badgeColor: 'blue',
    iconType: 'aadhaar',
    isActive: true,
    priority: 1,
    stateCode: 'ALL'
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  const isUserAdmin = isAdmin || user?.role === 'ADMIN';

  const fetchPublicServices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public-services${isUserAdmin ? '?all=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error('Error fetching public services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicServices();

    // Listen for realtime updates
    const handleRealtime = (e: any) => {
      if (e.detail?.type === 'PUBLIC_SERVICES_UPDATED') {
        if (e.detail.data?.services) {
          setServices(e.detail.data.services);
        } else {
          fetchPublicServices();
        }
      }
    };
    window.addEventListener('app_realtime_event', handleRealtime);
    return () => window.removeEventListener('app_realtime_event', handleRealtime);
  }, [isUserAdmin]);

  const handleCopy = (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Categories list
  const categories = [
    { id: 'ALL', label: 'All Services (सभी)', icon: Globe },
    { id: 'Aadhaar', label: 'Aadhaar (आधार)', icon: FingerprintIcon },
    { id: 'PAN & Tax', label: 'PAN & Tax (पैन)', icon: CreditCard },
    { id: 'Voter & Election', label: 'Voter ID (वोटर)', icon: Vote },
    { id: 'Vehicle & Transport', label: 'Vehicle & DL (वाहन)', icon: Car },
    { id: 'Health & Welfare', label: 'Health & Ayushman (स्वास्थ्य)', icon: HeartPulse },
    { id: 'Ration & Food', label: 'Ration (राशन)', icon: Wheat },
    { id: 'Certificates & Revenue', label: 'Certificates (प्रमाण पत्र)', icon: Award },
    { id: 'Employment & Career', label: 'EPFO & Jobs (रोजगार)', icon: Briefcase },
    { id: 'General Utility', label: 'Utilities (अन्य)', icon: Building2 }
  ];

  // States list
  const states = [
    { id: 'ALL', label: 'All India / Central (समस्त भारत)' },
    { id: 'BIHAR', label: 'Bihar (बिहार)' },
    { id: 'UP', label: 'Uttar Pradesh (उत्तर प्रदेश)' },
    { id: 'MP', label: 'Madhya Pradesh (मध्य प्रदेश)' },
    { id: 'JHARKHAND', label: 'Jharkhand (झारखंड)' }
  ];

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      // Admin sees active and inactive; guests only active
      if (!isUserAdmin && srv.isActive === false) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && srv.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // State filter
      if (selectedState !== 'ALL') {
        const sCode = (srv.stateCode || 'ALL').toUpperCase();
        if (sCode !== 'ALL' && sCode !== selectedState.toUpperCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = srv.title?.toLowerCase().includes(q);
        const matchesHindi = srv.hindiTitle?.toLowerCase().includes(q);
        const matchesTagline = srv.tagline?.toLowerCase().includes(q);
        const matchesCategory = srv.category?.toLowerCase().includes(q);
        const matchesUrl = srv.portalUrl?.toLowerCase().includes(q);
        const matchesBadge = srv.badge?.toLowerCase().includes(q);
        return matchesTitle || matchesHindi || matchesTagline || matchesCategory || matchesUrl || matchesBadge;
      }

      return true;
    });
  }, [services, isUserAdmin, selectedCategory, selectedState, searchQuery]);

  // Admin Actions
  const handleToggleActive = async (service: PublicGovService, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/admin/public-services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive })
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to toggle public service status:', err);
    }
  };

  const handleMoveOrder = async (serviceId: string, direction: 'UP' | 'DOWN', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/admin/public-services/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, direction })
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to reorder service:', err);
    }
  };

  const handleDeleteService = async (serviceId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/public-services/${serviceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to delete public service:', err);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.portalUrl) {
      alert('Please provide Service Title and Portal URL.');
      return;
    }

    setActionLoading(true);
    setActionMessage('');

    try {
      let res;
      if (isAddingNew) {
        res = await fetch('/api/admin/public-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else if (editingService) {
        res = await fetch(`/api/admin/public-services/${editingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setServices(data.services);
        setIsAddingNew(false);
        setEditingService(null);
      } else {
        const errData = await res?.json();
        alert(errData?.error || 'Failed to save service.');
      }
    } catch (err) {
      console.error('Error saving public service:', err);
      alert('Network error while saving.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all public government portal links to standard verified defaults?')) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/public-services/reset-defaults', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to reset defaults:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for Badge Color
  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'cyan':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'blue':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Helper for Category Icon
  const getServiceIcon = (iconType?: string, category?: string) => {
    const key = (iconType || category || '').toLowerCase();
    if (key.includes('aadhaar') || key.includes('finger')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs">
          <FingerprintIcon className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('pan') || key.includes('tax') || key.includes('credit')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs">
          <CreditCard className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('voter') || key.includes('election') || key.includes('vote')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-800 flex items-center justify-center text-white shadow-xs">
          <Vote className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('car') || key.includes('vehicle') || key.includes('transport') || key.includes('driving')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-700 flex items-center justify-center text-white shadow-xs">
          <Car className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('health') || key.includes('ayushman') || key.includes('pmjay') || key.includes('pulse')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs">
          <HeartPulse className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('ration') || key.includes('food') || key.includes('wheat') || key.includes('nfsa')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-700 flex items-center justify-center text-white shadow-xs">
          <Wheat className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('certificate') || key.includes('rtps') || key.includes('revenue') || key.includes('district')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-800 flex items-center justify-center text-white shadow-xs">
          <Award className="w-5 h-5" />
        </div>
      );
    }
    if (key.includes('epfo') || key.includes('job') || key.includes('career') || key.includes('work')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-800 flex items-center justify-center text-white shadow-xs">
          <Briefcase className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-xs">
        <Building2 className="w-5 h-5" />
      </div>
    );
  };

  return (
    <section id="public-service-hub" className="w-full py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Tricolor Accent Bar */}
        <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-orange-500 via-white to-emerald-600 shadow-xs"></div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>100% Free & Direct Official Portals</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Govt Verified Links</span>
              </span>
              {isUserAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
                  ⚡ Admin Control Mode Active
                </span>
              )}
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Public Service Hub</span>
              <span className="text-sm sm:text-base font-normal text-slate-500 hidden sm:inline">(सरकारी सेवा केंद्र डायरेक्ट लिंक्स)</span>
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              Official Indian Government portals for instant Aadhaar download, PAN status tracking, Voter ID, Vehicle Challan, Ayushman Card, Ration slips, and State Services. Click any service to open its official government portal directly.
            </p>
          </div>

          {/* Admin Header Action Controls */}
          {isUserAdmin && showAdminControls && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                id="btn-admin-add-gov-link"
                onClick={() => {
                  setFormData({
                    title: '',
                    hindiTitle: '',
                    tagline: '',
                    category: 'Aadhaar',
                    portalUrl: '',
                    badge: 'OFFICIAL GOVT',
                    badgeColor: 'blue',
                    iconType: 'aadhaar',
                    isActive: true,
                    priority: services.length + 1,
                    stateCode: 'ALL'
                  });
                  setIsAddingNew(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Govt Link</span>
              </button>

              <button
                id="btn-admin-reset-gov-links"
                onClick={handleResetDefaults}
                title="Reset to default government portals list"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-300 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Defaults</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-public-service-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Govt Services... (e.g. Aadhaar, PAN Status, Voter Card, Challan, Ayushman, Ration)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-blue-500 rounded-xl text-sm font-medium outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* State Filter Selector */}
            <div className="md:col-span-4 relative">
              <select
                id="select-public-service-state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                aria-label="Filter government services by state"
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              >
                {states.map(st => (
                  <option key={st.id} value={st.id}>
                    📍 {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Chips Scrollbar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
              return (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Count & Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-slate-800 font-bold">{filteredServices.length}</strong> official government portals
            {selectedCategory !== 'ALL' && <span> in <strong className="text-blue-700">{selectedCategory}</strong></span>}
            {selectedState !== 'ALL' && <span> for <strong className="text-emerald-700">{selectedState}</strong></span>}
          </span>
          {isUserAdmin && (
            <span className="text-purple-700 font-semibold">
              Admin controls enabled (Edit, Reorder, Toggle Active)
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading government services catalog...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredServices.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">No official services found</h3>
              <p className="text-xs text-slate-500">
                No matching portal found for "{searchQuery || selectedCategory}". Try clearing your filters.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedState('ALL');
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Services Grid (Official Government Cards) */}
        {!loading && filteredServices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServices.map((service, index) => {
              const isCopied = copiedId === service.id;
              const badgeStyle = getBadgeStyle(service.badgeColor);

              return (
                <div
                  key={service.id}
                  id={`service-card-${service.id}`}
                  className={`group relative bg-white border rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-blue-400 ${
                    !service.isActive ? 'opacity-60 bg-slate-50/80 border-dashed border-slate-300' : 'border-slate-200/90 shadow-xs'
                  }`}
                >
                  {/* Top Header with Icon & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {getServiceIcon(service.iconType, service.category)}
                      
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {service.badge && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${badgeStyle}`}>
                            {service.badge}
                          </span>
                        )}
                        {service.stateCode && service.stateCode !== 'ALL' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {service.stateCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {service.title}
                      </h3>
                      {service.hindiTitle && (
                        <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                          {service.hindiTitle}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
                        {service.tagline || 'Official Government Direct Web Portal.'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5">
                      {/* Primary Open Portal Button */}
                      <a
                        id={`btn-open-portal-${service.id}`}
                        href={service.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <span>Open Portal</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      {/* Copy Link Button */}
                      <button
                        id={`btn-copy-portal-${service.id}`}
                        onClick={(e) => handleCopy(service.id, service.portalUrl || service.actionUrl || '', e)}
                        title="Copy official website link"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 shrink-0 cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-600 animate-scale" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {/* Admin Specific Action Toolbar */}
                    {isUserAdmin && showAdminControls && (
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200 text-[11px]">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleMoveOrder(service.id, 'UP', e)}
                            title="Move Priority Up"
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleMoveOrder(service.id, 'DOWN', e)}
                            title="Move Priority Down"
                            disabled={index === filteredServices.length - 1}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">#{service.priority}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleToggleActive(service, e)}
                            title={service.isActive ? 'Hide from public' : 'Show to public'}
                            className={`p-1 rounded cursor-pointer ${service.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                          >
                            {service.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              setFormData({ ...service });
                              setEditingService(service);
                              setIsAddingNew(false);
                            }}
                            title="Edit Service Details"
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteService(service.id, service.title, e)}
                            title="Delete Service"
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Safety & Information Notice Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">100% Direct Official Government Redirection</span>
              <span className="text-slate-600 text-[11px]">All links navigate directly to UIDAI, NSDL, ECI, Parivahan, NFSA, PMJAY and State ServicePlus portals without intermediary redirection.</span>
            </div>
          </div>
          <span className="text-[11px] text-blue-800 font-semibold shrink-0 bg-blue-100/80 px-2.5 py-1 rounded-full border border-blue-200">
            eCyberCafe Public Hub
          </span>
        </div>

      </div>

      {/* ADMIN ADD / EDIT MODAL */}
      {(isAddingNew || editingService) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  {isAddingNew ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isAddingNew ? 'Add New Government Portal Link' : 'Edit Government Portal Link'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage direct public links displayed on the home page
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingService(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Service Title (English) *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Download e-Aadhaar PDF"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Hindi Title (Optional)</label>
                <input
                  type="text"
                  value={formData.hindiTitle || ''}
                  onChange={(e) => setFormData({ ...formData, hindiTitle: e.target.value })}
                  placeholder="e.g. ई-आधार कार्ड डाउनलोड करें (UIDAI)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Official Portal URL *</label>
                <input
                  type="url"
                  required
                  value={formData.portalUrl || ''}
                  onChange={(e) => setFormData({ ...formData, portalUrl: e.target.value })}
                  placeholder="https://myaadhaar.uidai.gov.in/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Category</label>
                  <select
                    value={formData.category || 'Aadhaar'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="Aadhaar">Aadhaar (आधार)</option>
                    <option value="PAN & Tax">PAN & Tax (पैन)</option>
                    <option value="Voter & Election">Voter & Election (वोटर)</option>
                    <option value="Vehicle & Transport">Vehicle & Transport (वाहन)</option>
                    <option value="Health & Welfare">Health & Welfare (स्वास्थ्य)</option>
                    <option value="Ration & Food">Ration & Food (राशन)</option>
                    <option value="Certificates & Revenue">Certificates & Revenue (प्रमाण पत्र)</option>
                    <option value="Employment & Career">Employment & Career (रोजगार)</option>
                    <option value="General Utility">General Utility (अन्य)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">State Filter</label>
                  <select
                    value={formData.stateCode || 'ALL'}
                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="ALL">All India (Central Govt)</option>
                    <option value="BIHAR">Bihar (बिहार)</option>
                    <option value="UP">Uttar Pradesh (उत्तर प्रदेश)</option>
                    <option value="MP">Madhya Pradesh (मध्य प्रदेश)</option>
                    <option value="JHARKHAND">Jharkhand (झारखंड)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Badge Text</label>
                  <input
                    type="text"
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. OFFICIAL GOVT, POPULAR"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">Badge Color</label>
                  <select
                    value={formData.badgeColor || 'blue'}
                    onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="blue">Blue</option>
                    <option value="emerald">Green / Emerald</option>
                    <option value="amber">Amber / Orange</option>
                    <option value="rose">Rose / Red</option>
                    <option value="purple">Purple</option>
                    <option value="cyan">Cyan</option>
                    <option value="indigo">Indigo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">Tagline / Short Description</label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Official UIDAI Direct e-Aadhaar Portal..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-is-active"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="chk-is-active" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Service is Active & Visible to Citizens
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold shadow-xs hover:from-blue-700 hover:to-indigo-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : isAddingNew ? 'Add Portal Link' : 'Update Portal Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

// Fingerprint Icon for Aadhaar
function FingerprintIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}
export default PublicServiceHub;
