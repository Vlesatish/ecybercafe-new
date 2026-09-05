import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Globe, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Upload, 
  RefreshCw, 
  X, 
  Link as LinkIcon,
  Sparkles,
  ShieldCheck,
  Building2,
  Car,
  Vote,
  HeartPulse,
  Wheat,
  CreditCard
} from 'lucide-react';
import { PublicGovService, PortalSubItem, User } from '../types';

interface PortalServiceManagerProps {
  user?: User | null;
  isAdmin?: boolean;
}

export const PortalServiceManager: React.FC<PortalServiceManagerProps> = ({
  user,
  isAdmin = true
}) => {
  const [services, setServices] = useState<PublicGovService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<PublicGovService | null>(null);
  const [formData, setFormData] = useState<Partial<PublicGovService>>({
    title: '',
    hindiTitle: '',
    tagline: 'Official Government Direct Portal',
    category: 'Census & Survey',
    portalUrl: '',
    badge: 'OFFICIAL GOVT',
    badgeColor: 'blue',
    iconType: 'census',
    iconUrl: '',
    isActive: true,
    priority: 1,
    stateCode: 'ALL',
    subItems: []
  });

  // New Sub-Item inline input state
  const [newSubTitle, setNewSubTitle] = useState<string>('');
  const [newSubType, setNewSubType] = useState<'LINK' | 'PDF'>('LINK');
  const [newSubUrl, setNewSubUrl] = useState<string>('');
  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/public-services?all=true');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error('Error loading portal services:', err);
      showToast('Failed to load portal services', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    const handleRealtime = (e: any) => {
      if (e.detail?.type === 'PUBLIC_SERVICES_UPDATED' && e.detail.data?.services) {
        setServices(e.detail.data.services);
      }
    };
    window.addEventListener('app-realtime-event', handleRealtime);
    return () => window.removeEventListener('app-realtime-event', handleRealtime);
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setFormData({
      title: '',
      hindiTitle: '',
      tagline: 'Official Government Direct Portal',
      category: 'General Utility',
      portalUrl: '',
      badge: 'OFFICIAL GOVT',
      badgeColor: 'blue',
      iconType: 'census',
      iconUrl: '',
      isActive: true,
      priority: services.length + 1,
      stateCode: 'ALL',
      subItems: [
        {
          id: `sub_${Date.now()}_1`,
          title: 'Direct Online Portal',
          url: 'https://',
          type: 'LINK'
        }
      ]
    });
    setNewSubTitle('');
    setNewSubType('LINK');
    setNewSubUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: PublicGovService) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      hindiTitle: service.hindiTitle || '',
      tagline: service.tagline || 'Official Government Direct Portal',
      category: service.category || 'General Utility',
      portalUrl: service.portalUrl || '',
      badge: service.badge || 'OFFICIAL GOVT',
      badgeColor: service.badgeColor || 'blue',
      iconType: service.iconType || 'census',
      iconUrl: service.iconUrl || '',
      isActive: service.isActive !== false,
      priority: service.priority || 1,
      stateCode: service.stateCode || 'ALL',
      subItems: service.subItems ? [...service.subItems] : []
    });
    setNewSubTitle('');
    setNewSubType('LINK');
    setNewSubUrl('');
    setIsModalOpen(true);
  };

  const handleAddSubItem = () => {
    if (!newSubTitle.trim() || !newSubUrl.trim()) {
      showToast('Please provide both Title and URL for the sub-link', 'error');
      return;
    }

    const newItem: PortalSubItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSubTitle.trim(),
      url: newSubUrl.trim(),
      type: newSubType
    };

    setFormData(prev => ({
      ...prev,
      subItems: [...(prev.subItems || []), newItem]
    }));

    setNewSubTitle('');
    setNewSubUrl('');
    setNewSubType('LINK');
  };

  const handleRemoveSubItem = (subId: string) => {
    setFormData(prev => ({
      ...prev,
      subItems: (prev.subItems || []).filter(item => item.id !== subId)
    }));
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPdf(true);
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });

      if (res.ok) {
        const uploadRes = await res.json();
        setNewSubUrl(uploadRes.url);
        setNewSubType('PDF');
        if (!newSubTitle) {
          setNewSubTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        showToast('PDF uploaded successfully! Click "+ Add Sub-Item" to save it.');
      } else {
        showToast('Failed to upload PDF document', 'error');
      }
    } catch (err) {
      console.error('PDF upload error:', err);
      showToast('Error uploading PDF', 'error');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      showToast('Service Title is required', 'error');
      return;
    }

    const effectiveUrl = formData.portalUrl?.trim() || formData.subItems?.[0]?.url || 'https://india.gov.in';

    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        portalUrl: effectiveUrl,
        subItems: formData.subItems || []
      };

      let res;
      if (editingService) {
        res = await fetch(`/api/admin/public-services/${editingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/admin/public-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setIsModalOpen(false);
        showToast(editingService ? 'Portal service updated successfully!' : 'Portal service added successfully!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save portal service', 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Server error while saving', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async (service: PublicGovService) => {
    if (!window.confirm(`Are you sure you want to delete '${service.title}'?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/public-services/${service.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        showToast('Portal service deleted');
      } else {
        showToast('Failed to delete portal service', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting service', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (service: PublicGovService) => {
    try {
      const res = await fetch(`/api/admin/public-services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive })
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        showToast(`'${service.title}' is now ${!service.isActive ? 'Active' : 'Hidden'}`);
      }
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleReorder = async (serviceId: string, direction: 'UP' | 'DOWN') => {
    try {
      const res = await fetch('/api/admin/public-services/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, direction })
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (err) {
      showToast('Failed to reorder service', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all portal services to the standard official government catalog? Custom entries will be replaced.')) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/public-services/reset-defaults', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        showToast('Reset to default official government services successfully');
      }
    } catch (err) {
      showToast('Failed to reset catalog', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Services
  const categories = Array.from(new Set(services.map(s => s.category).filter((c): c is string => Boolean(c))));
  const filteredServices = services.filter(s => {
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      s.title.toLowerCase().includes(q) || 
      (s.hindiTitle && s.hindiTitle.toLowerCase().includes(q)) ||
      (s.subItems && s.subItems.some(sub => sub.title.toLowerCase().includes(q)));
    return matchesCategory && matchesSearch;
  });

  const renderIconPreview = (type?: string, customUrl?: string) => {
    if (customUrl) {
      return <img src={customUrl} alt="" className="w-7 h-7 object-contain rounded-lg" />;
    }
    switch (type) {
      case 'census':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-xs">
            🇮🇳
          </div>
        );
      case 'aadhaar':
        return (
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-xs">
            🆔
          </div>
        );
      case 'pan':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xs">
            💳
          </div>
        );
      case 'voter':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs">
            🗳️
          </div>
        );
      case 'ayushman':
      case 'health':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xs">
            🏥
          </div>
        );
      case 'car':
      case 'transport':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xs">
            🚗
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Globe className="w-4 h-4 text-slate-600" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
            : 'bg-rose-950 text-rose-200 border-rose-800'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30">
              <Globe className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Portal Service Manager</span>
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                  DIRECT & PDF CONTROLS
                </span>
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                Manage home page Portal Services and sub-links (Online Portals, Application Links & PDF Documents like Questionnaires and Guidelines).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openAddModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Portal Service</span>
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={actionLoading}
            title="Reset to default official government services"
            className="p-2.5 bg-blue-800/60 hover:bg-blue-800 text-blue-200 hover:text-white rounded-xl border border-blue-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search portal name, sub-link or PDF..."
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories ({services.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services List / Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-bold">Loading portal services...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Globe className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="text-base font-black text-slate-700">No portal services found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No matching services found for your current search or category filter.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-indigo-700"
          >
            + Add First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServices.map((service, idx) => {
            const subItems = service.subItems || [];
            const linkCount = subItems.filter(s => s.type === 'LINK').length;
            const pdfCount = subItems.filter(s => s.type === 'PDF').length;

            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-4.5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  service.isActive ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges & Reorder */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black">
                        #{service.priority || idx + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-extrabold uppercase">
                        {service.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleReorder(service.id, 'UP')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(service.id, 'DOWN')}
                        disabled={idx === filteredServices.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-3">
                    {renderIconPreview(service.iconType, service.iconUrl)}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {service.title}
                      </h4>
                      {service.hindiTitle && (
                        <p className="text-xs font-semibold text-slate-500 truncate">
                          {service.hindiTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sub-Items Overview */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Sub-Links & Resources:</span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded font-black">
                          🔗 {linkCount} Link{linkCount !== 1 ? 's' : ''}
                        </span>
                        <span className="px-1.5 py-0.2 bg-orange-100 text-orange-700 rounded font-black">
                          📄 {pdfCount} PDF{pdfCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {subItems.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {subItems.slice(0, 3).map((sub, i) => (
                          <div key={sub.id || i} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                            {sub.type === 'PDF' ? (
                              <span className="px-1 py-0.2 bg-orange-500 text-white rounded text-[8px] font-black">
                                PDF
                              </span>
                            ) : (
                              <span className="text-blue-600 font-bold">↗</span>
                            )}
                            <span className="truncate flex-1 font-medium">{sub.title}</span>
                          </div>
                        ))}
                        {subItems.length > 3 && (
                          <p className="text-[10px] text-slate-400 font-bold">
                            +{subItems.length - 3} more items...
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        No sub-items. (Will open primary portal URL directly)
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(service)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 cursor-pointer ${
                      service.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {service.isActive ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                    <span>{service.isActive ? 'Active' : 'Hidden'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(service)}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-black text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit & Links</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-900 border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingService ? `Edit Portal: ${editingService.title}` : 'Add New Portal Service'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure service name, icon, and clickable sub-links/PDF documents.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    Service Name (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Census Of India"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    Hindi Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.hindiTitle || ''}
                    onChange={(e) => setFormData({ ...formData, hindiTitle: e.target.value })}
                    placeholder="e.g. भारत की जनगणना"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Census & Survey, Aadhaar, PAN & Tax"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    Default Main Portal URL
                  </label>
                  <input
                    type="url"
                    value={formData.portalUrl || ''}
                    onChange={(e) => setFormData({ ...formData, portalUrl: e.target.value })}
                    placeholder="https://censusindia.gov.in"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    Icon Preset
                  </label>
                  <select
                    value={formData.iconType || 'census'}
                    onChange={(e) => setFormData({ ...formData, iconType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="census">🇮🇳 Census Of India</option>
                    <option value="aadhaar">🆔 Aadhaar Service</option>
                    <option value="pan">💳 PAN Card Service</option>
                    <option value="voter">🗳️ Voter ID (NVSP)</option>
                    <option value="health">🏥 Ayushman Bharat / Health</option>
                    <option value="transport">🚗 Parivahan / Transport</option>
                    <option value="farmer">🌾 PM Kisan / Agriculture</option>
                    <option value="ration">🍚 Ration / Food</option>
                    <option value="utility">⚡ Utility / Government Hub</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">
                    Custom Icon URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.iconUrl || ''}
                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                    placeholder="https://.../icon.png"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Sub-Items / Links & PDF Resources Manager */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Sub-Items (Action Links & PDF Documents)</span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
                        {formData.subItems?.length || 0} items
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      These appear inside the expander box on the home page when users click this portal card.
                    </p>
                  </div>
                </div>

                {/* List of current sub-items */}
                {formData.subItems && formData.subItems.length > 0 ? (
                  <div className="space-y-2">
                    {formData.subItems.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.type === 'PDF' ? (
                            <span className="px-2 py-1 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                              <FileText className="w-3 h-3" />
                              PDF
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                              <ExternalLink className="w-3 h-3" />
                              LINK
                            </span>
                          )}
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-900 truncate">
                              {item.title}
                            </h5>
                            <p className="text-[10px] text-slate-400 truncate max-w-xs font-mono">
                              {item.url}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubItem(item.id || '')}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-white/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No sub-items added yet. Add links or upload PDF guidelines below.
                  </div>
                )}

                {/* Add New Sub-Item Form */}
                <div className="bg-white border border-indigo-200/80 rounded-xl p-3.5 space-y-3">
                  <h5 className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Add New Sub-Link / PDF Resource:</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newSubTitle}
                        onChange={(e) => setNewSubTitle(e.target.value)}
                        placeholder="Sub-item Title (e.g. Self Enumeration Online / Question Form)"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <select
                        value={newSubType}
                        onChange={(e) => setNewSubType(e.target.value as 'LINK' | 'PDF')}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="LINK">🔗 Direct Link (URL)</option>
                        <option value="PDF">📄 PDF Document</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="url"
                      value={newSubUrl}
                      onChange={(e) => setNewSubUrl(e.target.value)}
                      placeholder="https://... URL or Upload PDF"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <label className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{uploadingPdf ? 'Uploading...' : 'Upload PDF'}</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePdfUpload}
                          disabled={uploadingPdf}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleAddSubItem}
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingService ? 'Save Changes' : 'Create Portal Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
