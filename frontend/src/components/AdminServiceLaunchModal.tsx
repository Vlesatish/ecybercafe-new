import React, { useState, useEffect } from 'react';
import { CitizenService, ServiceFormField, ServiceFormFieldType } from '../types';
import { uploadFileToServer } from '../utils/upload';
import { Sparkles, Plus, Trash2, X, CheckCircle, ShieldCheck, Clock, Tag, IndianRupee, ArrowUp, ArrowDown, Zap } from 'lucide-react';

interface AdminServiceLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceLaunched: () => void;
}

export const AdminServiceLaunchModal: React.FC<AdminServiceLaunchModalProps> = ({
  isOpen,
  onClose,
  onServiceLaunched
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
      console.error('Error fetching categories in launch modal:', err);
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
  const [price, setPrice] = useState<number>(99);
  const [processingTime, setProcessingTime] = useState('10-15 MIN');
  const [badge, setBadge] = useState<'NEW' | 'PREMIUM' | 'STANDARD' | 'UNAVAILABLE'>('NEW');
  const [iconType, setIconType] = useState('shield-check');
  const [iconUrl, setIconUrl] = useState('');
  const [description, setDescription] = useState('');
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        setErrorMsg(`⚠️ File Size Warning: Selected image/file is ${sizeInMB} MB. Maximum allowed limit is 2 MB.`);
        e.target.value = '';
        return;
      }
      try {
        const uploaded = await uploadFileToServer(file, 2);
        setIconUrl(uploaded.url);
      } catch (err: any) {
        setErrorMsg(`⚠️ Failed to upload icon image: ${err.message || 'Error'}`);
      }
    }
  };

  const handleWarningImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        setErrorMsg(`⚠️ File Size Warning: Selected image/file is ${sizeInMB} MB. Maximum allowed limit is 2 MB.`);
        e.target.value = '';
        return;
      }
      try {
        const uploaded = await uploadFileToServer(file, 2);
        setWarningImage(uploaded.url);
      } catch (err: any) {
        setErrorMsg(`⚠️ Failed to upload warning banner: ${err.message || 'Error'}`);
      }
    }
  };

  // Dynamic Form Fields state (Mobile Number first, Aadhaar Number second)
  const [fields, setFields] = useState<ServiceFormField[]>([
    { id: 'f_1', label: 'Mobile Number / मोबाइल नंबर', type: 'text', placeholder: 'Enter 10 Digit Mobile Number', required: true, maxLength: 10 },
    { id: 'f_2', label: 'Aadhaar Number / आधार नंबर', type: 'text', placeholder: 'Enter 12 Digit Number', required: true, maxLength: 12 }
  ]);

  if (!isOpen) return null;

  const handleAddField = () => {
    const newId = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setFields([
      ...fields,
      {
        id: newId,
        label: `New Field ${fields.length + 1}`,
        type: 'text',
        placeholder: 'Enter detail',
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

  const handleSubmitLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || price < 0) {
      setErrorMsg('Please specify a valid service title and price.');
      return;
    }

    const finalCategory = category === 'Other' 
      ? (customCategory.trim() || 'Other Services') 
      : category;

    if (category === 'Other' && customCategory.trim()) {
      try {
        await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryName: customCategory.trim() })
        });
        window.dispatchEvent(new Event('custom_categories_updated'));
      } catch (e) {
        console.error('Error saving custom category:', e);
      }
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category: finalCategory,
          price: Number(price),
          processingTime,
          badge,
          iconType,
          iconUrl: iconUrl.trim(),
          description: description || `Official ${title} citizen service.`,
          warningNotice: warningNotice.trim() || undefined,
          warningImage: warningImage.trim() || undefined,
          warningType,
          enablePanResizer: enablePanResizer || (finalCategory === 'PAN' || title.toLowerCase().includes('pan')),
          enableCompressionTool,
          enableChat,
          isDistributorOnly,
          flowType,
          serviceTypeTag: serviceTypeTag.trim() || 'Main Service',
          dailyLimit: dailyLimit.trim() || 'Unlimited',
          timingText: timingText.trim() || '24×7',
          priority: Number(priority) || 100,
          announcementBanner: announcementBanner.trim() || undefined,
          fields
        })
      });

      if (res.ok) {
        onServiceLaunched();
        onClose();
        // Reset
        setTitle('');
        setCustomCategory('');
        setPrice(99);
        setDescription('');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to launch new service.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error while launching service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-indigo-950/90 to-slate-950 border border-indigo-500/40 rounded-3xl shadow-[0_0_60px_rgba(99,102,241,0.25)] text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500/30 to-orange-500/30 border border-amber-400/50 text-amber-300 rounded-2xl shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-amber-200 to-indigo-200 bg-clip-text text-transparent">🚀 Launch New Citizen Service</h2>
              <p className="text-xs text-slate-300">New service will instantly appear on all Retailer forms with your pricing & fields!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitLaunch} className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-semibold flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* Basic Service Info Grid */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <span>📌 Step 1: Basic Service Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-300 text-xs">Service Title / सर्विस का नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ration Card Member Addition / PAN Instant Find"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs">Category / कैटेगरी *</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
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
                  <option value="Other">➕ Add New Custom Category (अन्य)</option>
                </select>

                {category === 'Other' && (
                  <div className="pt-1 space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Enter custom category name (e.g. Resume Services, Caste Certificate)"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-200/50"
                    />
                    <p className="text-[10px] text-amber-300">This new category will automatically be saved and available for future services!</p>
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
                  Service Charge / Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="e.g. 99"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs font-black text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Processing Time Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10-15 MIN / INSTANT / 24 HRS"
                  value={processingTime}
                  onChange={(e) => setProcessingTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Service Flow Type Selection (Instant ⚡ vs Manual 🖐️) */}
              <div className="sm:col-span-2 bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
                <label className="font-black text-emerald-300 text-xs flex items-center justify-between">
                  <span>⚡ Service Processing Flow Type / फ्लो मोड *</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Current: {flowType}
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${flowType === 'Instant' ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold shadow-md' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                    <input
                      type="radio"
                      name="launchFlowType"
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

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${flowType === 'Manual' ? 'bg-indigo-950/90 border-indigo-400 text-indigo-200 font-bold shadow-md' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                    <input
                      type="radio"
                      name="launchFlowType"
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

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${flowType === 'Auto' ? 'bg-purple-950/90 border-purple-400 text-purple-200 font-bold shadow-md' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                    <input
                      type="radio"
                      name="launchFlowType"
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
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs">Service Type Tag (e.g. Main Service)</label>
                <input
                  type="text"
                  value={serviceTypeTag}
                  onChange={(e) => setServiceTypeTag(e.target.value)}
                  placeholder="Main Service"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs">Daily Limit (e.g. Unlimited)</label>
                <input
                  type="text"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs">Operating Hours (e.g. 24×7)</label>
                <input
                  type="text"
                  value={timingText}
                  onChange={(e) => setTimingText(e.target.value)}
                  placeholder="24×7"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <div className="sm:col-span-2 bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2">
                <label className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Service Target Audience / सर्विस एक्सेस</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${!isDistributorOnly ? 'bg-indigo-950/70 border-indigo-400 text-white font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                    <input
                      type="radio"
                      name="launchTargetAudience"
                      checked={!isDistributorOnly}
                      onChange={() => setIsDistributorOnly(false)}
                      className="accent-indigo-500"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200">🌐 All Retailers & Users</div>
                      <div className="text-[10px] text-slate-400">सभी रिटेलर एवं आम उपभोक्ता हेतु उपलब्ध</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isDistributorOnly ? 'bg-amber-950/80 border-amber-400 text-amber-200 font-bold shadow-md' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                    <input
                      type="radio"
                      name="launchTargetAudience"
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

              {/* 2-PDF & UTI RESIZER TOOL ENABLE TOGGLE */}
              <div className="sm:col-span-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-950/80 hover:bg-slate-900 rounded-2xl border border-amber-500/40 transition-colors">
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
                    <div className="text-[10px] text-amber-200/80">एडमिन/ऑपरेटर डैशबोर्ड पर PDF स्टैम्पर और UTI क्रॉप टूल बटन एक्टिव करें</div>
                  </div>
                </label>
              </div>

              {/* COMPRESSION TOOL ENABLE / DISABLE ON-OFF SWITCH */}
              <div className="sm:col-span-2 pt-1">
                <label className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl border transition-all ${enableCompressionTool ? 'bg-sky-950/70 border-sky-400/80 shadow-md shadow-sky-900/20' : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700/80'}`}>
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${enableCompressionTool ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
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
                <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-950/80 hover:bg-slate-900 rounded-2xl border border-emerald-500/40 transition-colors">
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
                      इस सर्विस के लिए ऑपरेटर / रिटेलर के बीच लाइव चैट एवं व्हाट्सएप संवाद ऑन रखें
                    </div>
                  </div>
                </label>
              </div>

              {processingTime.toUpperCase().includes('INSTANT') && (
                <div className="col-span-full bg-gradient-to-r from-amber-950/80 via-emerald-950/80 to-slate-950 border-2 border-emerald-500/60 rounded-2xl p-3.5 space-y-1.5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                    <span className="font-extrabold text-xs text-amber-300">⚡ API INSTANT AUTO-PROCESS MODE ACTIVE</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Aapne 'INSTANT' select kiya hai. Iss service mein API key (Server API) se auto-find chalega aur result Instant Search Logs mein save hoga. Retailer form par auto-fill sample button active ho jayega.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Badge Tag
                </label>
                <select
                  value={badge}
                  onChange={(e: any) => setBadge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="NEW">✨ NEW (New Launch)</option>
                  <option value="PREMIUM">⭐ PREMIUM</option>
                  <option value="STANDARD">⚡ STANDARD</option>
                  <option value="UNAVAILABLE">🚫 UNAVAILABLE</option>
                </select>
              </div>

              {/* CUSTOM SERVICE ICON / IMAGE UPLOADER */}
              <div className="sm:col-span-2 space-y-2 p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    🖼️ Custom Service Icon Image (सर्विस लोगो/इमेज सेट करें)
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

              {/* SERVICE WARNING / CAUTION ALERT SETTINGS */}
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                  <label className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                    <span className="text-base">⚠️</span>
                    <span>Service Caution & Warning Alert (सावधानी / आवश्यक निर्देश)</span>
                  </label>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-bold uppercase">
                    Notice Badge
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 text-[11px]">Alert Severity Type</label>
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
                          <span>Upload Instruction Banner (इमेज अपलोड)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleWarningImageUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-slate-400">Max 2 MB</span>
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
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-300 text-xs">Description & Operator Note</label>
                <textarea
                  rows={2}
                  placeholder="Short instructions or requirements for this service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Form Input Builder */}
          <div className="p-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  📝 Step 2: Customize Applicant Form Inputs
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Define what information retailers must fill (PDF/File uploads auto-restricted to max 2 MB with warning).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const newId = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    setFields([
                      ...fields,
                      {
                        id: newId,
                        label: `Upload Document / Scan ${fields.length + 1}`,
                        type: 'file',
                        placeholder: 'Select file from device',
                        required: true
                      }
                    ]);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + File/Photo Upload Field
                </button>

                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Field
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3.5 bg-gradient-to-br from-slate-900/95 via-indigo-950/40 to-slate-900/95 border border-indigo-500/30 rounded-2xl space-y-3 shadow-md hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <span className="font-extrabold text-amber-300 text-[11px] flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-indigo-900/80 border border-indigo-500/50 rounded-md text-white font-mono">Field #{idx + 1}</span>
                      {field.label.toLowerCase().includes('aadhaar') || field.label.includes('आधार') ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-black">
                          🔒 Aadhaar Field (12 Digits Enforced)
                        </span>
                      ) : null}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, 'UP')}
                        className={`p-1 rounded-lg transition-colors ${
                          idx === 0 
                            ? 'text-slate-600 cursor-not-allowed' 
                            : 'text-slate-300 hover:text-amber-300 hover:bg-slate-700'
                        }`}
                        title="Move Field Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMoveField(idx, 'DOWN')}
                        className={`p-1 rounded-lg transition-colors ${
                          idx === fields.length - 1 
                            ? 'text-slate-600 cursor-not-allowed' 
                            : 'text-slate-300 hover:text-amber-300 hover:bg-slate-700'
                        }`}
                        title="Move Field Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
                        title="Remove Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-300 font-bold block mb-0.5">Field Name / Label *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aadhaar Number / Date of Birth"
                        value={field.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isAadhaar = val.toLowerCase().includes('aadhaar') || val.includes('आधार');
                          const isMobile = val.toLowerCase().includes('mobile') || val.includes('मोबाइल');
                          handleFieldChange(field.id, 'label', val);
                          if (isAadhaar) handleFieldChange(field.id, 'maxLength', 12);
                          else if (isMobile) handleFieldChange(field.id, 'maxLength', 10);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-300 font-bold block mb-0.5">Input Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(field.id, 'type', e.target.value as ServiceFormFieldType)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400 font-medium cursor-pointer"
                      >
                        <option value="text">Text Input</option>
                        <option value="number">Numeric Input</option>
                        <option value="formatted_date">Date / DOB (DD-MM-YYYY Typing)</option>
                        <option value="textarea">Textarea Box</option>
                        <option value="select">Dropdown List</option>
                        <option value="file">File / Photo Upload</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-300 font-bold block mb-0.5">Placeholder</label>
                      <input
                        type="text"
                        placeholder={field.type === 'formatted_date' ? 'DD-MM-YYYY (e.g. 15-08-1995)' : 'e.g. Enter detail'}
                        value={field.placeholder || ''}
                        onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400 font-medium"
                      />
                    </div>

                    {field.type === 'file' ? (
                      <div>
                        <label className="text-[10px] text-emerald-400 font-extrabold block mb-0.5">
                          Max Upload Size Limit (MB) / अधिकतम साइज
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          placeholder="e.g. 2 or 5 MB"
                          value={field.maxFileSizeMb || 2}
                          onChange={(e) => handleFieldChange(field.id, 'maxFileSizeMb', e.target.value ? Number(e.target.value) : 2)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-emerald-500/60 rounded-lg text-xs text-emerald-300 font-mono font-extrabold focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                          Max Length / अंकों की सीमा (e.g. 12 for Aadhaar)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="e.g. 12"
                          value={field.maxLength || (field.label.toLowerCase().includes('aadhaar') || field.label.includes('आधार') ? 12 : field.label.toLowerCase().includes('mobile') || field.label.includes('मोबाइल') ? 10 : '')}
                          onChange={(e) => handleFieldChange(field.id, 'maxLength', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                        />
                        Required Field
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

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-orange-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Launching Service...' : '🚀 Launch Service To All Forms'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
