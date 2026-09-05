import React, { useState, useEffect } from 'react';
import { CitizenService, ServiceFormField, ServiceFormFieldType } from '../types';
import { uploadFileToServer } from '../utils/upload';
import { 
  Edit3, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle, 
  ShieldCheck, 
  Clock, 
  Tag, 
  IndianRupee, 
  Percent,
  Save, 
  RefreshCw, 
  AlertCircle,
  FileUp,
  ArrowUp,
  ArrowDown,
  Send,
  Loader2
} from 'lucide-react';

interface AdminServiceEditModalProps {
  isOpen: boolean;
  service: CitizenService | null;
  onClose: () => void;
  onServiceUpdated: () => void;
}

export const AdminServiceEditModal: React.FC<AdminServiceEditModalProps> = ({
  isOpen,
  service,
  onClose,
  onServiceUpdated
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Aadhaar');
  const [customCategory, setCustomCategory] = useState('');
  const [savedCustomCategories, setSavedCustomCategories] = useState<string[]>(['Resume Services', 'Pension Services', 'Revenue & Land', 'Pankaj', 'Sahil']);

  const fetchCustomCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.customCategories)) {
          setSavedCustomCategories(data.customCategories);
        }
      }
    } catch (err) {
      console.error('Error fetching categories in edit modal:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomCategories();
    }
    const handleSyncCategories = () => {
      fetchCustomCategories();
    };
    window.addEventListener('custom_categories_updated', handleSyncCategories);
    return () => window.removeEventListener('custom_categories_updated', handleSyncCategories);
  }, [isOpen]);

  const handleDeleteCustomCategory = async (catToDelete: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(catToDelete)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.customCategories)) {
          setSavedCustomCategories(data.customCategories);
        }
        window.dispatchEvent(new Event('custom_categories_updated'));
        window.dispatchEvent(new Event('services_updated'));
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
    
    if (category.trim().toLowerCase() === catToDelete.trim().toLowerCase()) {
      setCategory('Aadhaar');
      setCustomCategory('');
    }
  };
  const [price, setPrice] = useState<number>(0);
  const [distributorPrice, setDistributorPrice] = useState<string>('');
  const [distributorCommissionPercent, setDistributorCommissionPercent] = useState<string>('');
  const [processingTime, setProcessingTime] = useState('');
  const [badge, setBadge] = useState<'NEW' | 'PREMIUM' | 'STANDARD' | 'UNAVAILABLE'>('NEW');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [warningNotice, setWarningNotice] = useState('');
  const [warningImage, setWarningImage] = useState('');
  const [warningType, setWarningType] = useState<'warning' | 'critical' | 'info'>('warning');
  const [enablePanResizer, setEnablePanResizer] = useState<boolean>(false);
  const [enableCompressionTool, setEnableCompressionTool] = useState<boolean>(false);
  const [enableChat, setEnableChat] = useState<boolean>(true);
  const [isDistributorOnly, setIsDistributorOnly] = useState<boolean>(false);
  const [flowType, setFlowType] = useState<'Manual' | 'Instant' | 'Auto'>('Manual');
  const [serviceTypeTag, setServiceTypeTag] = useState('Main Service');
  const [dailyLimit, setDailyLimit] = useState('Unlimited');
  const [timingText, setTimingText] = useState('24×7');
  const [priority, setPriority] = useState<number>(100);
  const [announcementBanner, setAnnouncementBanner] = useState('');
  const [fields, setFields] = useState<ServiceFormField[]>([]);

  const [telegramAlertEnabled, setTelegramAlertEnabled] = useState<boolean>(false);
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');
  const [isTestingServiceTg, setIsTestingServiceTg] = useState<boolean>(false);
  const [serviceTgMsg, setServiceTgMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (service) {
      setTitle(service.title || '');
      
      const stdCats = ['Aadhaar', 'Voter', 'PAN', 'Transport', 'Samagra', 'Utility'];
      if (stdCats.includes(service.category)) {
        setCategory(service.category);
        setCustomCategory('');
      } else if (savedCustomCategories.includes(service.category)) {
        setCategory(service.category);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(service.category || 'Other Custom Service');
      }

      setPrice(service.price || 0);
      setDistributorPrice(service.distributorPrice !== undefined && service.distributorPrice !== null ? String(service.distributorPrice) : '');
      setDistributorCommissionPercent(service.distributorCommissionPercent !== undefined && service.distributorCommissionPercent !== null ? String(service.distributorCommissionPercent) : '');
      setProcessingTime(service.processingTime || '10-15 MIN');
      setBadge(service.badge || 'NEW');
      setDescription(service.description || '');
      setIconUrl(service.iconUrl || '');
      setWarningNotice(service.warningNotice || '');
      setWarningImage(service.warningImage || '');
      setWarningType(service.warningType || 'warning');
      setEnablePanResizer(service.enablePanResizer ?? (service.category === 'PAN' || service.title.toLowerCase().includes('pan')));
      setEnableCompressionTool(Boolean(service.enableCompressionTool));
      setEnableChat(service.enableChat ?? true);
      setIsDistributorOnly(Boolean(service.isDistributorOnly));
      setFlowType(service.flowType || ((service.processingTime || '').toLowerCase().includes('instant') ? 'Instant' : 'Manual'));
      setServiceTypeTag(service.serviceTypeTag || 'Main Service');
      setDailyLimit(service.dailyLimit || 'Unlimited');
      setTimingText(service.timingText || '24×7');
      setPriority(service.priority !== undefined ? service.priority : 100);
      setAnnouncementBanner(service.announcementBanner && service.announcementBanner !== service.warningNotice ? service.announcementBanner : '');
      setTelegramAlertEnabled(Boolean(service.telegramAlertEnabled || service.telegramChatId));
      setTelegramChatId(service.telegramChatId || '');
      setTelegramBotToken(service.telegramBotToken || '');
      setServiceTgMsg(null);
      
      if (service.fields && service.fields.length > 0) {
        setFields(JSON.parse(JSON.stringify(service.fields)));
      } else {
        setFields([
          { id: 'f_1', label: 'Mobile Number / मोबाइल नंबर', type: 'text', placeholder: 'Enter 10 Digit Mobile Number', required: true, maxLength: 10 },
          { id: 'f_2', label: 'Aadhaar Number / आधार नंबर', type: 'text', placeholder: 'Enter 12 Digit Number', required: true, maxLength: 12 }
        ]);
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [service]);

  const handleTestServiceTelegram = async () => {
    if (!service) return;
    setIsTestingServiceTg(true);
    setServiceTgMsg(null);
    try {
      const res = await fetch(`/api/admin/services/${service.id}/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customChatId: telegramChatId,
          customBotToken: telegramBotToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setServiceTgMsg({ type: 'success', message: data.message || '✅ Test alert sent to Telegram group!' });
      } else {
        setServiceTgMsg({ type: 'error', message: data.message || '❌ Failed to send test alert.' });
      }
    } catch (err: any) {
      setServiceTgMsg({ type: 'error', message: err.message || '❌ Network error.' });
    } finally {
      setIsTestingServiceTg(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const uploaded = await uploadFileToServer(file);
        setIconUrl(uploaded.url);
      } catch (err: any) {
        alert(`Failed to upload icon image: ${err.message || 'Error'}`);
      }
    }
  };

  const handleWarningImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const uploaded = await uploadFileToServer(file, 2);
        setWarningImage(uploaded.url);
      } catch (err: any) {
        alert(`Failed to upload warning banner image: ${err.message || 'Error'}`);
      }
    }
  };

  if (!isOpen || !service) return null;

  // Add a standard text field
  const handleAddField = () => {
    const newId = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setFields([
      ...fields,
      {
        id: newId,
        label: `Field Name ${fields.length + 1}`,
        type: 'text',
        placeholder: 'Enter detail',
        required: true
      }
    ]);
  };

  // Add a file / photo upload field (e.g. Document, Photo, Signature, Scan)
  const handleAddFileUploadField = () => {
    const newId = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setFields([
      ...fields,
      {
        id: newId,
        label: `Upload Document / Attach File ${fields.length + 1}`,
        type: 'file',
        placeholder: 'Select file from device',
        required: true
      }
    ]);
  };

  const handleRemoveField = (id: string) => {
    if (fields.length <= 1) {
      alert('Service must have at least one input field for applicants.');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof ServiceFormField, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  // Move field up or down
  const handleMoveField = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === fields.length - 1) return;

    const newFields = [...fields];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = newFields[index];
    newFields[index] = newFields[targetIdx];
    newFields[targetIdx] = temp;
    setFields(newFields);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || price < 0) {
      setErrorMsg('Please specify a valid service title and non-negative price.');
      return;
    }

    if (fields.length === 0) {
      setErrorMsg('Service must contain at least one input field.');
      return;
    }

    const finalCategory = category === 'Other' 
      ? (customCategory.trim() || 'Other Custom Service') 
      : category;

    if (category === 'Other' && customCategory.trim()) {
      try {
        await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryName: customCategory.trim() })
        });
        window.dispatchEvent(new Event('custom_categories_updated'));
      } catch (err) {
        console.error('Failed to save custom category:', err);
      }
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: finalCategory,
          price: Number(price),
          distributorPrice: distributorPrice.trim() !== '' ? Number(distributorPrice) : undefined,
          distributorCommissionPercent: distributorCommissionPercent.trim() !== '' ? Number(distributorCommissionPercent) : undefined,
          processingTime: processingTime.trim() || '10-15 MIN',
          badge,
          iconUrl: iconUrl.trim(),
          description: description.trim() || `Official ${title} citizen service.`,
          warningNotice: warningNotice.trim() || undefined,
          warningImage: warningImage.trim() || undefined,
          warningType,
          enablePanResizer,
          enableCompressionTool,
          enableChat,
          isDistributorOnly,
          flowType,
          serviceTypeTag: serviceTypeTag.trim() || 'Main Service',
          dailyLimit: dailyLimit.trim() || 'Unlimited',
          timingText: timingText.trim() || '24×7',
          priority: Number(priority) || 100,
          announcementBanner: announcementBanner.trim() || undefined,
          telegramAlertEnabled,
          telegramChatId: telegramChatId.trim(),
          telegramBotToken: telegramBotToken.trim(),
          fields
        })
      });

      if (res.ok) {
        setSuccessMsg('✅ Service inputs & details updated successfully!');
        setTimeout(() => {
          onServiceUpdated();
          onClose();
        }, 600);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to update service.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error while updating service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-2xl">
              <Edit3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Update Service & Input Fields</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {service.category}
                </span>
              </div>
              <p className="text-xs text-slate-300">Add extra inputs, document uploads, or modify existing fields for "{service.title}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitUpdate} className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Service Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-300 text-xs">Service Title / सर्विस का नाम *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Service Title"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs">Category / कैटेगरी *</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="Aadhaar">Aadhaar Services</option>
                <option value="Voter">Voter Services</option>
                <option value="PAN">PAN Card Services</option>
                <option value="Transport">Transport & Challan</option>
                <option value="Samagra">Samagra ID Services</option>
                <option value="Utility">Utility & Government</option>
                {savedCustomCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">➕ Add New Custom Category / Other Custom Service (अन्य)</option>
              </select>

              {category === 'Other' && (
                <div className="pt-1.5 space-y-1">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <span>✏️ Enter Custom Category Name (कस्टम कैटेगरी का नाम) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aadhaar Mobile Link, Resume Services, Ration Card"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-amber-500/60 text-amber-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-200/50"
                  />
                  <p className="text-[10px] text-amber-300/80">This custom category will be displayed on retailer dashboards!</p>
                </div>
              )}

              {savedCustomCategories.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Custom Categories (Click tag or 🗑️ to delete):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {savedCustomCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={(e) => handleDeleteCustomCategory(cat, e)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-rose-950/60 text-slate-200 hover:text-rose-200 border border-slate-700 hover:border-rose-500/60 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95 group shadow-xs"
                        title={`Click to delete custom category "${cat}"`}
                      >
                        <span>{cat}</span>
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                Retailer Price (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                Distributor Commission Rate (%) (Default: 2%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={distributorCommissionPercent}
                onChange={(e) => setDistributorCommissionPercent(e.target.value)}
                placeholder="Leave blank for global 2%"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-indigo-400" />
                Custom Distributor Rate (₹) (Optional)
              </label>
              <input
                type="number"
                min={0}
                value={distributorPrice}
                onChange={(e) => setDistributorPrice(e.target.value)}
                placeholder="Custom distributor cost"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Processing Time Tag
              </label>
              <input
                type="text"
                value={processingTime}
                onChange={(e) => setProcessingTime(e.target.value)}
                placeholder="e.g. 10-15 MIN"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Service Flow Type Selection (Instant ⚡ vs Manual 🖐️) */}
            <div className="sm:col-span-2 bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
              <label className="font-black text-emerald-300 text-xs flex items-center justify-between">
                <span>⚡ Service Processing Flow Type / फ्लो मोड *</span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Current: {flowType}
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${flowType === 'Instant' ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold shadow-md' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
                  <input
                    type="radio"
                    name="editFlowType"
                    checked={flowType === 'Instant'}
                    onChange={() => {
                      setFlowType('Instant');
                      setProcessingTime('INSTANT ⚡');
                    }}
                    className="accent-emerald-500"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-emerald-300">⚡ Instant Flow</div>
                    <div className="text-[10px] text-emerald-200/80">ऑटोमैटिक इंस्टेंट प्रोसेस</div>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${flowType === 'Manual' ? 'bg-indigo-950/90 border-indigo-400 text-indigo-200 font-bold shadow-md' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
                  <input
                    type="radio"
                    name="editFlowType"
                    checked={flowType === 'Manual'}
                    onChange={() => {
                      setFlowType('Manual');
                      setProcessingTime('10-15 MIN');
                    }}
                    className="accent-indigo-500"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-indigo-300">🖐️ Manual Flow</div>
                    <div className="text-[10px] text-indigo-200/80">एडमिन द्वारा मैन्युअल चेक</div>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${flowType === 'Auto' ? 'bg-purple-950/90 border-purple-400 text-purple-200 font-bold shadow-md' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
                  <input
                    type="radio"
                    name="editFlowType"
                    checked={flowType === 'Auto'}
                    onChange={() => {
                      setFlowType('Auto');
                      setProcessingTime('AUTO ⚡');
                    }}
                    className="accent-purple-500"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-purple-300">🤖 Auto API</div>
                    <div className="text-[10px] text-purple-200/80">API बॉट ऑटोमेशन</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Extra Metadata: Priority, Service Tag, Limit, Timing */}
            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs">Priority Order / डिस्प्ले नंबर (e.g. 100)</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                placeholder="100"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs">Service Type Tag (e.g. Main Service)</label>
              <input
                type="text"
                value={serviceTypeTag}
                onChange={(e) => setServiceTypeTag(e.target.value)}
                placeholder="Main Service"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs">Daily Limit (e.g. Unlimited)</label>
              <input
                type="text"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs">Operating Hours (e.g. 24×7)</label>
              <input
                type="text"
                value={timingText}
                onChange={(e) => setTimingText(e.target.value)}
                placeholder="24×7"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Notice / Announcement Banner Input */}
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <span>📢 Notice / Announcement Banner / सर्विस सूचना</span>
              </label>
              <input
                type="text"
                value={announcementBanner}
                onChange={(e) => setAnnouncementBanner(e.target.value)}
                placeholder="e.g. Puc Without OTP Service Again Working ❤️"
                className="w-full px-3.5 py-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Target Audience / Distributor Only Selection */}
            <div className="sm:col-span-2 bg-slate-900 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2">
              <label className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Service Target Audience / सर्विस एक्सेस</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${!isDistributorOnly ? 'bg-indigo-950/70 border-indigo-400 text-white font-bold' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
                  <input
                    type="radio"
                    name="editTargetAudience"
                    checked={!isDistributorOnly}
                    onChange={() => setIsDistributorOnly(false)}
                    className="accent-indigo-500"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200">🌐 All Retailers & Users</div>
                    <div className="text-[10px] text-slate-400">सभी रिटेलर एवं आम उपभोक्ता हेतु उपलब्ध</div>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isDistributorOnly ? 'bg-amber-950/80 border-amber-400 text-amber-200 font-bold shadow-md' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
                  <input
                    type="radio"
                    name="editTargetAudience"
                    checked={isDistributorOnly}
                    onChange={() => setIsDistributorOnly(true)}
                    className="accent-amber-500"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-amber-300">👑 Only Distributors</div>
                    <div className="text-[10px] text-amber-200/80">केवल डिस्ट्रीब्यूटर, मास्टर डिस्ट्रीब्यूटर एवं एडमिन हेतु</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-amber-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={enablePanResizer}
                  onChange={(e) => setEnablePanResizer(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
                <div>
                  <div className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
                    ✂️ Enable UTI Resizer & 2-PDF Tool (ऑटो स्टैम्पर + आधार/DOB अटैचमेंट टूल)
                  </div>
                  <div className="text-[10px] text-amber-200/80">डैशबोर्ड पर PDF स्टैम्पर और UTI क्रॉप टूल बटन एक्टिव करें</div>
                </div>
              </label>
            </div>

            {/* COMPRESSION TOOL ENABLE / DISABLE ON-OFF SWITCH */}
            <div className="sm:col-span-2 pt-1">
              <label className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl border transition-all ${enableCompressionTool ? 'bg-sky-950/70 border-sky-400/80 shadow-md shadow-sky-900/20' : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'}`}>
                <input
                  type="checkbox"
                  checked={enableCompressionTool}
                  onChange={(e) => setEnableCompressionTool(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded accent-sky-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                      ⚡ Enable PDF & Photo Compressor Tool (कंप्रेस टूल ऑन / ऑफ करें)
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${enableCompressionTool ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
                      {enableCompressionTool ? 'ON (चालू)' : 'OFF (बंद)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {enableCompressionTool 
                      ? '🟢 ON: इस सर्विस के लिए रिटेलर को कंप्रेस टूल बटन मिलेगा।' 
                      : '🔴 OFF (डिफ़ॉल्ट): कंप्रेस टूल बंद रहेगा। राशन डिलीट/10 आधार PDF जैसी सर्विसेज बिना किसी कंप्रेस के 100% ओरिजिनल क्वालिटी में सीधे अपलोड होंगी।'}
                  </div>
                </div>
              </label>
            </div>

            {/* CHAT SYSTEM ENABLE TOGGLE */}
            <div className="sm:col-span-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-emerald-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={enableChat}
                  onChange={(e) => setEnableChat(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="font-extrabold text-emerald-300 text-xs flex items-center gap-1.5">
                    💬 Enable Operator & WhatsApp Chat System (चैट सिस्टम चालू रखें)
                  </div>
                  <div className="text-[10px] text-emerald-200/80">
                    इस सर्विस के लिए ऑपरेटर / रिटेलर के बीच लाइव चैट एवं व्हाट्सएप कम्यूनिकेशन ऑन रखें
                  </div>
                </div>
              </label>
            </div>

            {/* SPECIAL TELEGRAM OPERATOR GROUP ALERT CONFIGURATION */}
            <div className="sm:col-span-2 bg-gradient-to-br from-sky-950/80 via-slate-900 to-indigo-950/80 border-2 border-sky-500/50 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-sky-400 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-sky-200">
                      ✈️ Special Telegram Operator Group Alert (विशेष ऑपरेटर टेलीग्राम अलर्ट)
                    </h4>
                    <p className="text-[11px] text-sky-300/80 font-medium">
                      इस सर्विस के आवेदन का नोटिफिकेशन अलग टेलीग्राम ग्रुप में ऑपरेटरों को भेजें।
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramAlertEnabled}
                    onChange={(e) => setTelegramAlertEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {telegramAlertEnabled && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-sky-200 flex items-center justify-between">
                        <span>Telegram Group / Chat ID *</span>
                        <span className="text-[10px] text-sky-400 font-bold">Group Chat ID</span>
                      </label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="e.g. -1001234567890 or @operator_group"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border-2 border-sky-500/50 rounded-xl font-mono text-xs text-sky-100 font-extrabold focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-slate-500 shadow-inner"
                      />
                      <p className="text-[10px] text-slate-400">
                        अपने ऑपरेटर Telegram Group का Chat ID दर्ज करें (जैसे <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">-100...</code>)।
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-sky-200 flex items-center justify-between">
                        <span>Custom Bot Token (Optional)</span>
                        <span className="text-[10px] text-sky-400 font-bold">From @BotFather</span>
                      </label>
                      <input
                        type="text"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        placeholder="Default portal bot token used if blank"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-slate-500 shadow-inner"
                      />
                      <p className="text-[10px] text-slate-400">
                        खाली रखने पर डिफ़ॉल्ट पोर्टल Telegram Bot का उपयोग किया जाएगा।
                      </p>
                    </div>
                  </div>

                  {serviceTgMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold ${serviceTgMsg.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'}`}>
                      {serviceTgMsg.message}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-sky-300/90 font-medium">
                      💡 इस सर्विस के आवेदन आने पर ऑपरेटरों को ग्राहक द्वारा दिए गए इनपुट के साथ तुरंत मैसेज जाएगा।
                    </p>
                    <button
                      type="button"
                      onClick={handleTestServiceTelegram}
                      disabled={isTestingServiceTg || !telegramChatId}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isTestingServiceTg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Test Group Alert 🧪</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                Badge Tag
              </label>
              <select
                value={badge}
                onChange={(e: any) => setBadge(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="NEW">✨ NEW (New Launch)</option>
                <option value="PREMIUM">⭐ PREMIUM</option>
                <option value="STANDARD">⚡ STANDARD</option>
                <option value="UNAVAILABLE">🚫 UNAVAILABLE</option>
              </select>
            </div>

            {/* CUSTOM SERVICE ICON / IMAGE UPLOADER */}
            <div className="sm:col-span-2 space-y-2 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  🖼️ Service Custom Icon Image (सर्विस लोगो/इमेज सेट करें)
                </label>
                {iconUrl && (
                  <button
                    type="button"
                    onClick={() => setIconUrl('')}
                    className="text-[10px] text-rose-400 hover:underline font-bold"
                  >
                    Remove Custom Image ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-indigo-400/50 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                  {iconUrl ? (
                    <img src={iconUrl} alt="Service Icon" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🪪</span>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shrink-0 shadow-xs flex items-center gap-1">
                      <FileUp className="w-3.5 h-3.5 text-amber-300" />
                      <span>Upload Image (फोटो चुनें)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">or paste URL below</span>
                  </div>

                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://... image URL (Optional)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-300 text-xs">Description & Instructions</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for retailers..."
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* SERVICE WARNING / CAUTION ALERT SETTINGS */}
            <div className="sm:col-span-2 p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <label className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                  <span className="text-base">⚠️</span>
                  <span>Service Caution & Warning Alert (सावधानी / आवश्यक निर्देश अलर्ट)</span>
                </label>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-bold uppercase">
                  Featured Notice
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-[11px]">Alert Severity Type (प्रकार)</label>
                  <select
                    value={warningType}
                    onChange={(e: any) => setWarningType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="warning">⚠️ Caution Warning (Yellow/Amber)</option>
                    <option value="critical">🚨 Critical Alert (Red/Rose)</option>
                    <option value="info">ℹ️ Important Info (Blue/Indigo)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-300 text-[11px]">Warning Notice Text (चेतावनी सन्देश - हिंदी/English)</label>
                  <textarea
                    rows={2}
                    value={warningNotice}
                    onChange={(e) => setWarningNotice(e.target.value)}
                    placeholder="e.g. ⚠️ ध्यान दें: केवल आधार लिंक चालू मोबाइल नंबर ही भरें! गलत जानकारी पर आवेदन खारिज हो सकता है।"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Warning Banner / Sample Guide Image */}
              <div className="space-y-2 pt-1 border-t border-amber-500/20">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                    <span>🖼️ Warning Banner / Instruction Image (निर्देश या नमूना छवि)</span>
                  </label>
                  {warningImage && (
                    <button
                      type="button"
                      onClick={() => setWarningImage('')}
                      className="text-[10px] text-rose-400 hover:underline font-bold"
                    >
                      Remove Warning Image ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {warningImage && (
                    <div className="w-16 h-12 rounded-xl bg-slate-900 border border-amber-500/50 overflow-hidden shrink-0 shadow-md">
                      <img src={warningImage} alt="Warning Banner" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-colors shrink-0 shadow-xs flex items-center gap-1">
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Upload Instruction Banner (इमेज अपलोड)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleWarningImageUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Max 2 MB (Optional)</span>
                    </div>

                    <input
                      type="text"
                      value={warningImage}
                      onChange={(e) => setWarningImage(e.target.value)}
                      placeholder="https://... warning banner or sample document image URL"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Card inside Admin Editor */}
              {warningNotice && (
                <div className="pt-2">
                  <span className="text-[10px] text-amber-400 font-bold block mb-1 uppercase tracking-wider">
                    👁️ Retailer Form Live Warning Preview:
                  </span>
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed font-semibold flex items-start gap-2.5 shadow-md ${
                    warningType === 'critical'
                      ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                      : warningType === 'info'
                      ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200'
                      : 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                  }`}>
                    <span className="text-base shrink-0 mt-0.5">
                      {warningType === 'critical' ? '🚨' : warningType === 'info' ? 'ℹ️' : '⚠️'}
                    </span>
                    <div className="space-y-1.5">
                      <p className="whitespace-pre-line">{warningNotice}</p>
                      {warningImage && (
                        <div className="mt-1 rounded-lg overflow-hidden border border-amber-400/30 max-w-xs max-h-32">
                          <img src={warningImage} alt="Warning Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC FORM INPUT CUSTOMIZER SECTION */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-500/30">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  Customize Service Inputs (इन्पुट फील्ड जोड़ें या बदलें)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Total Active Fields: <span className="font-bold text-amber-300">{fields.length}</span>. Add documents, textboxes, dropdowns or numeric inputs needed for this service.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAddFileUploadField}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>+ Add Document Upload</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Text/Input Field</span>
                </button>
              </div>
            </div>

            {/* List of Input Fields */}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3 transition-all hover:border-slate-600">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-900/80 text-indigo-300 font-black rounded text-[10px] border border-indigo-700/50">
                        Field #{idx + 1}
                      </span>
                      <span className="font-bold text-white text-xs truncate">{field.label || 'Unnamed Field'}</span>
                      {field.required && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/40">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, 'UP')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMoveField(idx, 'DOWN')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition-colors ml-1"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Field Label */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                        Field Label / नाम *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aadhaar Number / Date of Birth / Upload Scan"
                        value={field.label}
                        onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    {/* Input Type */}
                    <div>
                      <label className="text-[10px] text-slate-300 font-bold block mb-0.5">Input Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(field.id, 'type', e.target.value as ServiceFormFieldType)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold focus:outline-none"
                      >
                        <option value="text">Text Input (टेक्स्ट)</option>
                        <option value="number">Numeric Input (संख्या)</option>
                        <option value="formatted_date">📅 Date / DOB (DD-MM-YYYY Typing)</option>
                        <option value="textarea">Textarea Box (बड़ा मैसेज)</option>
                        <option value="select">Dropdown List (लिस्ट select)</option>
                        <option value="file">📁 File / Photo Upload (दस्तावेज़)</option>
                      </select>
                    </div>

                    {/* Placeholder */}
                    <div className={field.type === 'file' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Placeholder / Help Text</label>
                      <input
                        type="text"
                        placeholder={field.type === 'formatted_date' ? 'DD-MM-YYYY (e.g. 15-08-1995)' : 'e.g. Enter detail'}
                        value={field.placeholder || ''}
                        onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                      />
                    </div>

                    {field.type === 'file' && (
                      <div>
                        <label className="text-[10px] text-emerald-400 font-extrabold block mb-0.5">Max Size Limit (MB)</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          placeholder="e.g. 2 or 5"
                          value={field.maxFileSizeMb || 2}
                          onChange={(e) => handleFieldChange(field.id, 'maxFileSizeMb', e.target.value ? Number(e.target.value) : 2)}
                          className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 font-mono font-extrabold focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Required Checkbox */}
                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                        Required Field (ज़रूरी है)
                      </label>
                    </div>

                    {/* DROPDOWN OPTIONS EDITOR (Visible when type === 'select') */}
                    {field.type === 'select' && (
                      <div className="sm:col-span-3 p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl space-y-2 mt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                            <span>📋 Dropdown Options List / लिस्ट के विकल्प (कॉमा से अलग करके लिखें)</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-bold">Comma Separated (,)</span>
                        </div>

                        <input
                          type="text"
                          required={field.type === 'select'}
                          placeholder="e.g. BICCO, BCCCO, BRCCO, NCLCO, OTHER or Option 1, Option 2, Option 3"
                          value={Array.isArray(field.options) ? field.options.join(', ') : ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const opts = raw.split(',').map(s => s.trim()).filter(Boolean);
                            handleFieldChange(field.id, 'options', opts);
                          }}
                          className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono font-semibold placeholder-slate-500"
                        />

                        {/* Live Option Tags Preview */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400">
                            Items Preview ({Array.isArray(field.options) ? field.options.length : 0}):
                          </span>
                          {Array.isArray(field.options) && field.options.length > 0 ? (
                            field.options.map((opt, i) => (
                              <span key={i} className="px-2 py-0.5 bg-indigo-900/80 border border-indigo-500/50 text-amber-300 text-[10px] font-black rounded-md shadow-2xs">
                                {i + 1}. {opt}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-rose-400 italic">No options added yet! Type comma separated names above.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              🛡️ Safe update: Existing submitted requests remain safe and preserved.
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Service...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-emerald-300" />
                    <span>Save Service & Inputs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
