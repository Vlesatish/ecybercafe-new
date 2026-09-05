import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Coins, 
  Sparkles, 
  TrendingUp, 
  Search, 
  CheckCircle2, 
  Store, 
  Phone, 
  MapPin, 
  X, 
  Lock, 
  FileCheck,
  AlertCircle,
  RefreshCw,
  Gift,
  Copy,
  Check,
  Share2,
  ExternalLink,
  IndianRupee,
  Receipt,
  ArrowRightLeft,
  Percent,
  Clock,
  Printer,
  ShieldCheck,
  Download,
  Filter,
  CheckCircle,
  History
} from 'lucide-react';

interface RetailerStatItem {
  retailer: {
    id: string;
    name: string;
    storeName?: string;
    mobileNumber?: string;
    email?: string;
    state?: string;
    district?: string;
    block?: string;
    isBlocked?: boolean;
    createdAt?: string;
    walletBalance: number;
  };
  totalRequests: number;
  completedRequests: number;
  totalCommissionEarned: number;
  totalWalletRecharged?: number;
  isBonusUnlocked?: boolean;
  referralBonusAmount?: number;
  rechargeNeededToUnlock?: number;
}

interface DistributorPriceItem {
  id: string;
  title: string;
  category: string;
  retailerPrice: number;
  distributorPrice: number;
  distributorCommissionPercent: number;
  distributorCommissionAmount: number;
  processingTime: string;
  isActive: boolean;
  description: string;
}

export const DistributorPanelView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'retailers' | 'price_list' | 'commission_history'>('retailers');

  // Retailer Network State
  const [retailersList, setRetailersList] = useState<RetailerStatItem[]>([]);
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Price List State
  const [priceList, setPriceList] = useState<DistributorPriceItem[]>([]);
  const [globalCommPercent, setGlobalCommPercent] = useState<number>(2.0);
  const [isLoadingPriceList, setIsLoadingPriceList] = useState(false);
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedPriceList, setCopiedPriceList] = useState(false);

  // Commission Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Retailer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Referral Copy States
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const refCode = user?.referralCode || `REF${user?.mobileNumber || user?.id || '9988776655'}`;
  const refUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${refCode}` : `https://ecybercafe.in/?ref=${refCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(refUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🎉 *Join eCyberCafe Retailer Network!* 🎉\n\nHello! Register as a Cyber Cafe Retailer using my Referral Code *${refCode}* to access all Bihar & National E-Governance services instantly!\n\n👉 *Click here to Register:* ${refUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Add Retailer Form State
  const [formName, setFormName] = useState('');
  const [formStoreName, setFormStoreName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formEmail, setFormEmail] = useState('');
  const [formState, setFormState] = useState('Bihar');
  const [formDistrict, setFormDistrict] = useState('');
  const [formBlock, setFormBlock] = useState('');

  const [transferableCommBalance, setTransferableCommBalance] = useState<number>(0);
  const [lockedCommBalance, setLockedCommBalance] = useState<number>(0);

  const fetchMyRetailers = async () => {
    if (!user) return;
    setIsLoadingRetailers(true);
    try {
      const res = await fetch(`/api/distributor/my-retailers?distributorId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRetailersList(data.retailers || []);
        if (data.transferableCommissionBalance !== undefined) {
          setTransferableCommBalance(data.transferableCommissionBalance);
        }
        if (data.lockedCommissionBalance !== undefined) {
          setLockedCommBalance(data.lockedCommissionBalance);
        }
      }
    } catch (e) {
      console.error('Error fetching distributor retailers:', e);
    } finally {
      setIsLoadingRetailers(false);
    }
  };

  const fetchPriceList = async () => {
    setIsLoadingPriceList(true);
    try {
      const res = await fetch('/api/distributor/price-list');
      if (res.ok) {
        const data = await res.json();
        setPriceList(data.priceList || []);
        if (data.globalCommissionPercent !== undefined) {
          setGlobalCommPercent(data.globalCommissionPercent);
        }
      }
    } catch (e) {
      console.error('Error fetching price list:', e);
    } finally {
      setIsLoadingPriceList(false);
    }
  };

  useEffect(() => {
    fetchMyRetailers();
    fetchPriceList();

    const handleUpdates = () => {
      fetchPriceList();
      fetchMyRetailers();
    };

    window.addEventListener('services_updated', handleUpdates);
    window.addEventListener('SERVICE_UPDATED', handleUpdates);
    window.addEventListener('settings_updated', handleUpdates);
    window.addEventListener('custom_categories_updated', handleUpdates);

    return () => {
      window.removeEventListener('services_updated', handleUpdates);
      window.removeEventListener('SERVICE_UPDATED', handleUpdates);
      window.removeEventListener('settings_updated', handleUpdates);
      window.removeEventListener('custom_categories_updated', handleUpdates);
    };
  }, [user?.id]);

  const handleCreateRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formName.trim() || !formMobile.trim()) {
      setErrorMsg('कृपया रिटेलर का पूरा नाम और 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (formMobile.trim().length !== 10 || !/^\d{10}$/.test(formMobile.trim())) {
      setErrorMsg('कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/distributor/create-retailer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributorId: user?.id,
          name: formName.trim(),
          storeName: formStoreName.trim(),
          mobileNumber: formMobile.trim(),
          password: formPassword.trim() || '123456',
          email: formEmail.trim(),
          state: formState,
          district: formDistrict,
          block: formBlock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create retailer.');
      }

      setSuccessMsg(`🎉 Retailer "${formName}" added successfully! ₹100 Referral bonus credited to your commission balance!`);
      
      // Reset form
      setFormName('');
      setFormStoreName('');
      setFormMobile('');
      setFormPassword('123456');
      setFormEmail('');
      setFormDistrict('');
      setFormBlock('');

      fetchMyRetailers();
      if (refreshUser) refreshUser();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 2500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding retailer account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMsg(null);

    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      setTransferMsg({ type: 'error', text: 'कृपया सही ट्रांसफर राशि (₹) दर्ज करें।' });
      return;
    }

    const currentComm = user?.commissionBalance || 0;
    if (amt > currentComm) {
      setTransferMsg({ type: 'error', text: `अपरियाप्त कमीशन बैलेंस! आपका वर्तमान कमीशन बैलेंस ₹${currentComm.toFixed(2)} है।` });
      return;
    }

    setIsTransferring(true);
    try {
      const res = await fetch('/api/distributor/transfer-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributorId: user?.id,
          amount: amt
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transfer failed.');
      }

      setTransferMsg({ type: 'success', text: data.message || `🎉 ₹${amt.toFixed(2)} मुख्य वॉलेट में ट्रांसफर कर दिया गया!` });
      setTransferAmount('');
      if (refreshUser) refreshUser();

      setTimeout(() => {
        setIsTransferModalOpen(false);
        setTransferMsg(null);
      }, 2500);

    } catch (err: any) {
      setTransferMsg({ type: 'error', text: err.message || 'कमीशन ट्रांसफर विफल रहा।' });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCopyPriceList = () => {
    let formattedText = `📋 *Distributor Rate List & Retailer Price Margin*\n*eCyberCafe Digital Services Portal*\n-----------------------------------------\n`;
    filteredPriceList.forEach((item, idx) => {
      formattedText += `${idx + 1}. *${item.title}*\n   • Retailer Price: ₹${item.retailerPrice}\n   • Distributor Cost: ₹${item.distributorPrice}\n   • 2% Commission Profit: ₹${item.distributorCommissionAmount}\n   • Time: ${item.processingTime}\n\n`;
    });
    formattedText += `-----------------------------------------\n📞 *Contact Distributor for Onboarding:* ${user?.mobileNumber || ''}\n🔗 *Register Link:* ${refUrl}`;

    navigator.clipboard.writeText(formattedText);
    setCopiedPriceList(true);
    setTimeout(() => setCopiedPriceList(false), 2500);
  };

  // Filter Retailers
  const filteredRetailers = retailersList.filter(item => {
    const q = searchQuery.toLowerCase();
    const r = item.retailer;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.storeName && r.storeName.toLowerCase().includes(q)) ||
      (r.mobileNumber && r.mobileNumber.toLowerCase().includes(q)) ||
      (r.district && r.district.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const totalRetailersCount = retailersList.length;
  const totalCompletedOrders = retailersList.reduce((acc, curr) => acc + curr.completedRequests, 0);
  const totalCommissionEarned = retailersList.reduce((acc, curr) => acc + curr.totalCommissionEarned, 0);

  // Filter Price List
  const categories = ['ALL', ...Array.from(new Set(priceList.map(p => p.category)))];
  const filteredPriceList = priceList.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery = priceSearchQuery === '' || 
      p.title.toLowerCase().includes(priceSearchQuery.toLowerCase()) || 
      p.category.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(priceSearchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* DISTRIBUTOR TOP BANNER & KPI DASHBOARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 shadow-2xl p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>OFFICIAL DISTRIBUTOR DASHBOARD</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome, {user?.name || 'Distributor Partner'} 👋
            </h1>

            <p className="text-sm text-slate-300 max-w-xl">
              Manage retailer networks, track live <strong>2% distributor commissions</strong> on every completed order, view customized service rate cards, and transfer earnings to main wallet instantly.
            </p>
          </div>

          {/* COMMISSION BALANCE & TRANSFER ACTION */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-400">
                <Coins className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Total Commission Balance</span>
                <span className="text-3xl font-black text-emerald-400">
                  ₹{(user?.commissionBalance || 0).toFixed(2)}
                </span>
                <div className="flex items-center gap-2 mt-1 text-[11px]">
                  <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Unlocked: ₹{transferableCommBalance.toFixed(2)}
                  </span>
                  {lockedCommBalance > 0 && (
                    <span className="text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      Locked: ₹{lockedCommBalance.toFixed(2)} (₹1000 Wallet Add Pending)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setTransferAmount(transferableCommBalance.toString());
                setIsTransferModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg hover:shadow-emerald-500/2 shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer Unlocked Commission</span>
            </button>
          </div>

        </div>

        {/* 3 QUICK STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Onboarded Retailers</p>
              <p className="text-xl font-bold text-white">{totalRetailersCount} Active</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Retailer Completed Orders</p>
              <p className="text-xl font-bold text-white">{totalCompletedOrders} Completed</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Lifetime 2% Commission Earning</p>
              <p className="text-xl font-bold text-amber-300">₹{totalCommissionEarned.toFixed(2)}</p>
            </div>
          </div>
        </div>

      </div>

      {/* REFERRAL LINK SHARE BOX */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-400 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Your Referral Code & Instant ₹100 Onboarding Bonus</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Share your referral link with Cyber Cafe operators. Every retailer registering with your code gives you <strong>₹100 instant bonus + 2% commission</strong> on all their future orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleCopyCode}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-white border border-slate-200 hover:border-amber-400 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
            <span>Code: {refCode}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-white border border-slate-200 hover:border-amber-400 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-amber-600" />}
            <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Share</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('retailers')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'retailers'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Retailer Network ({retailersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('price_list')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'price_list'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>📋 Price List & 2% Margins ({priceList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('commission_history')}
          className={`px-5 py-3 font-bold text-xs sm:text-sm rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'commission_history'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>💰 Commission & Wallet Logs</span>
        </button>
      </div>

      {/* TAB 1: RETAILER NETWORK */}
      {activeTab === 'retailers' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by retailer name, shop or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Retailer (₹100 Bonus)</span>
            </button>
          </div>

          {isLoadingRetailers ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <p className="text-xs font-semibold">Loading your retailer network...</p>
            </div>
          ) : filteredRetailers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Retailers Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery ? 'No retailer matching your search query.' : 'You have not added any retailers yet. Click "+ Add New Retailer" or share your referral code to start earning 2% commission!'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add First Retailer</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRetailers.map((item) => (
                <div key={item.retailer.id} className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 space-y-4 shadow-xs hover:shadow-md transition-all">
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-base uppercase shrink-0">
                        {item.retailer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.retailer.name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Store className="w-3 h-3 text-slate-400" />
                          <span>{item.retailer.storeName || 'Cyber Cafe'}</span>
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="w-3.5 h-3.5" /> Mobile
                      </span>
                      <span className="font-semibold text-slate-800">{item.retailer.mobileNumber || 'N/A'}</span>
                    </div>

                    {item.retailer.district && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3.5 h-3.5" /> Location
                        </span>
                        <span className="font-medium text-slate-700">{item.retailer.district}, {item.retailer.block || 'Bihar'}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Current Wallet</span>
                      <span className="font-bold text-slate-800">₹{(item.retailer.walletBalance || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total Wallet Add</span>
                      <span className="font-bold text-indigo-700">₹{(item.totalWalletRecharged || 0).toFixed(2)}</span>
                    </div>

                    {/* ₹100 Referral Bonus Unlock Badge */}
                    <div className="pt-2">
                      {item.isBonusUnlocked ? (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>₹100 Bonus Unlocked</span>
                          </span>
                          <span className="text-emerald-700 font-extrabold">Unlocked</span>
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-medium text-amber-900 space-y-0.5">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1 text-amber-700">
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>₹100 Bonus Locked</span>
                            </span>
                            <span className="text-amber-700 font-bold">₹{(item.totalWalletRecharged || 0).toFixed(0)} / ₹1000</span>
                          </div>
                          <p className="text-[10px] text-amber-800">
                            Retailer needs to add <strong>₹{(item.rechargeNeededToUnlock || 1000).toFixed(0)} more</strong> to unlock your ₹100 commission transfer.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed Requests</span>
                      <span className="text-sm font-black text-slate-900">{item.completedRequests}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">2% Commission</span>
                      <span className="text-sm font-black text-emerald-600">₹{item.totalCommissionEarned.toFixed(2)}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: DISTRIBUTOR PRICE LIST & 2% MARGINS */}
      {activeTab === 'price_list' && (
        <div className="space-y-4">
          
          {/* SEARCH & CATEGORY FILTER */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search price list by service title..."
                  value={priceSearchQuery}
                  onChange={(e) => setPriceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  fetchPriceList();
                  fetchMyRetailers();
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
                title="Refresh latest distributor prices and commission margins"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPriceList ? 'animate-spin' : ''}`} />
                <span>Refresh Rates</span>
              </button>

              <button
                onClick={handleCopyPriceList}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                {copiedPriceList ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copiedPriceList ? 'Copied Rate List!' : 'Copy Rate Card'}</span>
              </button>
            </div>
          </div>

          {/* PRICE LIST TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 font-bold uppercase text-[11px] tracking-wider border-b border-slate-800">
                    <th className="p-4">Service Name & Category</th>
                    <th className="p-4 text-center">Retailer Price (₹)</th>
                    <th className="p-4 text-center">Distributor Commission (%)</th>
                    <th className="p-4 text-center text-emerald-400">Distributor Earning (₹)</th>
                    <th className="p-4 text-center">Distributor Cost (₹)</th>
                    <th className="p-4 text-center">Processing Time</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {isLoadingPriceList ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                        <span>Loading price list & margins...</span>
                      </td>
                    </tr>
                  ) : filteredPriceList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No services matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPriceList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold">
                            {item.category}
                          </span>
                        </td>

                        <td className="p-4 text-center font-bold text-slate-900 text-xs sm:text-sm">
                          ₹{item.retailerPrice}
                        </td>

                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-xs">
                            <Percent className="w-3 h-3 text-amber-600" />
                            {item.distributorCommissionPercent}%
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <span className="font-black text-emerald-600 text-xs sm:text-sm">
                            +₹{item.distributorCommissionAmount}
                          </span>
                        </td>

                        <td className="p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                          ₹{item.distributorPrice}
                        </td>

                        <td className="p-4 text-center text-slate-500">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.processingTime}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: COMMISSION & WALLET LOGS */}
      {activeTab === 'commission_history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Distributor Commission Earning Rules & Transfer Logic</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Understanding how distributor commissions are calculated, credited, and transferred into main wallet.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>2% Automatic Retailer Order Margin</span>
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Whenever any retailer under your distributor network completes an order for any citizen service (Aadhaar, Voter, PAN, Transport, Utility), <strong>2% of the order total</strong> is automatically credited to your <strong>Commission Balance</strong> in real-time.
              </p>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
              <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>Instant Wallet Conversion</span>
              </h4>
              <p className="text-xs text-indigo-800 leading-relaxed">
                You can transfer your accumulated commission points into your main wallet balance at any time with <strong>0% fee</strong>. Use main wallet balance to submit orders or withdraw funds.
              </p>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setTransferAmount((user?.commissionBalance || 0).toString());
                setIsTransferModalOpen(true);
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all inline-flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Open Transfer Commission Modal</span>
            </button>
          </div>
        </div>
      )}

      {/* 1-CLICK COMMISSION TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl text-white">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Transfer Commission</h3>
                  <p className="text-xs text-emerald-100">Convert commission points to main wallet balance</p>
                </div>
              </div>

              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferCommission} className="p-6 space-y-5">
              
              {transferMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  transferMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transferMsg.text}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Available Commission Balance</span>
                <span className="text-xl font-black text-emerald-600">
                  ₹{(user?.commissionBalance || 0).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Amount to Transfer (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={1}
                    max={user?.commissionBalance || 0}
                    step="any"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount in ₹"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* QUICK SELECTION BUTTONS */}
              <div className="flex items-center gap-2">
                {[50, 100, 250, 500].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTransferAmount(amt.toString())}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all"
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTransferAmount((user?.commissionBalance || 0).toString())}
                  className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all"
                >
                  All (100%)
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  {isTransferring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Confirm Transfer</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ADD NEW RETAILER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Add New Retailer</h3>
                  <p className="text-xs text-indigo-200">Onboard a cyber cafe operator to your network</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRetailer} className="p-6 space-y-4">
              
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Retailer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rahul Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Shop / Cyber Cafe Name</label>
                  <input
                    type="text"
                    value={formStoreName}
                    onChange={(e) => setFormStoreName(e.target.value)}
                    placeholder="e.g. Rahul Cyber Cafe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Mobile Number (10 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Initial Password</label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Default: 123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">District (जिला)</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="e.g. Patna / Muzaffarpur"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Block (प्रखंड)</label>
                  <input
                    type="text"
                    value={formBlock}
                    onChange={(e) => setFormBlock(e.target.value)}
                    placeholder="e.g. Danapur"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-800 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You will receive an instant <strong>₹100 bonus credit</strong> to your commission wallet upon successful registration!</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Retailer Account</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
