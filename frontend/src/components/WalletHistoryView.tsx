import React, { useState, useEffect, useCallback } from 'react';
import { WalletTransaction, MerchantConfig, PaymentOrder, UpiOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  History, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Receipt,
  Coins,
  Zap,
  QrCode,
  AlertCircle,
  Copy,
  Check,
  RotateCw,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { triggerFlowerShowerCelebration } from '../utils/celebration';

interface WalletHistoryViewProps {
  onOpenTopupModal?: () => void;
}

export const WalletHistoryView: React.FC<WalletHistoryViewProps> = ({ onOpenTopupModal }) => {
  const { user, refreshUser } = useAuth();
  
  // Main View Mode: PASSBOOK (Debits/Credits) vs UPI_ORDERS (Online Gateway Orders)
  const [mainViewTab, setMainViewTab] = useState<'PASSBOOK' | 'UPI_ORDERS'>('PASSBOOK');

  // Passbook Statement State
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TOP_UP' | 'DEDUCTION' | 'REFUND' | 'COMMISSION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // UPI Gateway Orders State
  const [upiOrders, setUpiOrders] = useState<UpiOrder[]>([]);
  const [isLoadingUpiOrders, setIsLoadingUpiOrders] = useState(false);
  const [upiStatusFilter, setUpiStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [upiSearchQuery, setUpiSearchQuery] = useState('');
  const [isCheckingOrderId, setIsCheckingOrderId] = useState<string | null>(null);
  const [copiedOrderIdMap, setCopiedOrderIdMap] = useState<{ [key: string]: boolean }>({});

  // Gateway Method selection: AllApi.in Instant Gateway vs Manual UTR
  const [paymentMethodTab, setPaymentMethodTab] = useState<'ALLAPI_GATEWAY' | 'MANUAL_UTR'>('ALLAPI_GATEWAY');

  // Recharge Form State
  const [rechargeAmount, setRechargeAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('500');
  const [manualUtr, setManualUtr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState<string | null>(null);
  const [rechargeAlert, setRechargeAlert] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // AllApi.in Instant Gateway Popup State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [modalPaymentAmount, setModalPaymentAmount] = useState<number>(500);

  const [paymentSettings, setPaymentSettings] = useState<{
    upiId: string;
    payeeName: string;
    qrImageUrl: string;
  }>({
    upiId: '0000000000@ybl',
    payeeName: 'Pankaj Digital Cafe',
    qrImageUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=400&auto=format&fit=crop&q=80'
  });

  const merchantConfig: MerchantConfig = {
    apiToken: '737bb1-df709c-d3e73f-e1fb9f-699985',
    merchantVpa: paymentSettings?.upiId || 'ecybercafe@upi',
    merchantName: paymentSettings?.payeeName || 'eCyberCafe Digital Services',
    adminPassword: '',
    bwPricePerPage: 2,
    colorPricePerPage: 10,
    aadhaarPrice: 15
  };

  useEffect(() => {
    fetch('/api/admin/payment-settings')
      .then(res => res.ok ? safeJson(res) : null)
      .then(data => data && setPaymentSettings(data))
      .catch(console.error);
  }, []);

  const handleOpenAllApiPopup = (amount?: number) => {
    const parsedAmt = amount || Number(customAmount) || rechargeAmount || 500;
    if (parsedAmt <= 0) return;
    setModalPaymentAmount(parsedAmt);
    setShowPaymentModal(true);
  };

  const handlePaymentModalSuccess = async (order: PaymentOrder) => {
    setShowPaymentModal(false);
    triggerFlowerShowerCelebration();
    setRechargeSuccess(`🎉 Instant Payment Verified! ₹${order.amount.toFixed(2)} credited to your wallet balance.`);
    await refreshUser();
    await fetchTransactions();
    await fetchUpiOrders();
  };

  const handleManualRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = customAmount ? Number(customAmount) : rechargeAmount;
    if (!amt || amt <= 0 || !user) return;

    setIsSubmitting(true);
    setRechargeSuccess(null);

    try {
      const res = await fetch('/api/wallet/topup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: user.id,
          retailerName: user.name,
          retailerMobile: user.mobileNumber,
          amount: amt,
          paymentMethod: 'UPI_DIRECT',
          utrNumber: manualUtr,
          notes: 'Added from Wallet Page'
        }),
      });

      if (res.ok) {
        setRechargeSuccess(`✅ Recharge request of ₹${amt} submitted! Admin will verify UTR and update balance.`);
        setManualUtr('');
        setCustomAmount('500');
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userId = user?.id;
  const userRole = user?.role;

  const fetchTransactions = useCallback(async (showLoading = false) => {
    if (!userId) return;
    if (showLoading) {
      setIsLoadingTransactions(true);
    }
    try {
      const url = userRole === 'ADMIN' ? '/api/wallet/transactions' : `/api/wallet/transactions?retailerId=${userId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [userId, userRole]);

  const fetchUpiOrders = useCallback(async (showLoading = false) => {
    if (!userId) return;
    if (showLoading) {
      setIsLoadingUpiOrders(true);
    }
    try {
      const url = userRole === 'ADMIN' ? '/api/payment/orders' : `/api/payment/orders?retailerId=${userId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.orders) {
          setUpiOrders(data.orders);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUpiOrders(false);
    }
  }, [userId, userRole]);

  // Initial load only when userId or userRole changes - no flickering or looping
  useEffect(() => {
    if (userId) {
      fetchTransactions(transactions.length === 0);
      fetchUpiOrders(upiOrders.length === 0);
    }
  }, [userId, userRole, fetchTransactions, fetchUpiOrders]);

  // Check & Verify single UPI Order Status live with ALLAPI gateway
  const handleCheckUpiOrderStatus = async (orderId: string) => {
    setIsCheckingOrderId(orderId);
    setRechargeAlert(null);
    try {
      const res = await fetch('/api/payment/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();

      if (data && (data.status === true || data.success === true)) {
        const currentStatus = data?.results?.status || data?.orderStatus || data?.status;
        if (currentStatus === 'Success' || currentStatus === 'SUCCESS' || data?.orderStatus === 'SUCCESS') {
          triggerFlowerShowerCelebration(1000);
          setRechargeAlert({
            type: 'success',
            message: `🎉 Order #${orderId} Verified Successfully! ₹${data?.amount || data?.results?.amount || data?.order?.amount || ''} has been credited to your wallet balance.`
          });
          await refreshUser();
          await fetchTransactions();
          await fetchUpiOrders();
        } else {
          setRechargeAlert({
            type: 'warning',
            message: `⏳ Order #${orderId}: Gateway status is Pending. Bank has not yet confirmed the payment.`
          });
          await fetchUpiOrders();
        }
      } else {
        setRechargeAlert({
          type: 'warning',
          message: `⚠️ Order #${orderId}: ${data?.message || 'Payment not yet confirmed by gateway.'}`
        });
      }
    } catch (err: any) {
      setRechargeAlert({
        type: 'error',
        message: `Error verifying order #${orderId}: ${err?.message || 'Connection timeout.'}`
      });
    } finally {
      setIsCheckingOrderId(null);
    }
  };

  // Admin Manual Force Approve
  const handleAdminForceApprove = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to manually verify and credit Order #${orderId} to retailer wallet?`)) return;
    setIsCheckingOrderId(orderId);
    setRechargeAlert(null);
    try {
      const res = await fetch('/api/payment/admin-force-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data && data.success) {
        triggerFlowerShowerCelebration(1000);
        setRechargeAlert({
          type: 'success',
          message: `✅ ${data.message || 'Order manually approved and balance credited!'}`
        });
        await refreshUser();
        await fetchTransactions();
        await fetchUpiOrders();
      } else {
        alert(`Failed to approve order: ${data?.message || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsCheckingOrderId(null);
    }
  };

  const copyToClipboard = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderIdMap(prev => ({ ...prev, [orderId]: true }));
    setTimeout(() => {
      setCopiedOrderIdMap(prev => ({ ...prev, [orderId]: false }));
    }, 2000);
  };

  if (!user) return null;

  // Filtered passbook transactions calculation
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      tx.description.toLowerCase().includes(q) ||
      (tx.serviceTitle && tx.serviceTitle.toLowerCase().includes(q)) ||
      (tx.requestId && tx.requestId.toLowerCase().includes(q)) ||
      (tx.retailerName && tx.retailerName.toLowerCase().includes(q)) ||
      (tx.storeName && tx.storeName.toLowerCase().includes(q)) ||
      (tx.retailerMobile && tx.retailerMobile.includes(q)) ||
      tx.id.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Filtered UPI orders calculation
  const filteredUpiOrders = upiOrders.filter((ord) => {
    const matchesStatus = upiStatusFilter === 'ALL' || ord.status === upiStatusFilter;
    const q = upiSearchQuery.toLowerCase();
    const matchesSearch = 
      !upiSearchQuery ||
      ord.orderId.toLowerCase().includes(q) ||
      String(ord.amount).includes(q) ||
      (ord.retailerName && ord.retailerName.toLowerCase().includes(q)) ||
      (ord.retailerMobile && ord.retailerMobile.includes(q));
    return matchesStatus && matchesSearch;
  });

  // Counts for UPI orders
  const successUpiCount = upiOrders.filter(o => o.status === 'SUCCESS').length;
  const pendingUpiCount = upiOrders.filter(o => o.status === 'PENDING').length;
  const failedUpiCount = upiOrders.filter(o => o.status === 'FAILED').length;

  // Calculate totals for passbook
  const totalTopUp = transactions
    .filter(t => t.type === 'TOP_UP')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDeductions = transactions
    .filter(t => t.type === 'DEDUCTION')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunds = transactions
    .filter(t => t.type === 'REFUND')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCommission = transactions
    .filter(t => t.type === 'COMMISSION')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* 1. ADD MONEY / WALLET TOP-UP CARD */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-md space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Add Money to Wallet (वॉलेट में पैसे जोड़ें)
            </h3>
            <p className="text-xs text-slate-500">
              Instant 100% automated credit via UPI QR Code or direct bank transfer.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPaymentMethodTab('ALLAPI_GATEWAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                paymentMethodTab === 'ALLAPI_GATEWAY'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Instant Auto-UPI Gateway</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethodTab('MANUAL_UTR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                paymentMethodTab === 'MANUAL_UTR'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Direct Bank / UTR</span>
            </button>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {rechargeSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{rechargeSuccess}</span>
            </div>
            <button onClick={() => setRechargeSuccess(null)} className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer">✕</button>
          </div>
        )}

        {rechargeAlert && (
          <div className={`p-4 border rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in ${
            rechargeAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : rechargeAlert.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {rechargeAlert.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : rechargeAlert.type === 'warning' ? (
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{rechargeAlert.message}</span>
            </div>
            <button onClick={() => setRechargeAlert(null)} className="font-black cursor-pointer">✕</button>
          </div>
        )}

        {/* Tab 1: Instant Auto-Pay via Gateway */}
        {paymentMethodTab === 'ALLAPI_GATEWAY' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-2">
                  Select Quick Recharge Amount (राशि चुनें):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setRechargeAmount(amt);
                        setCustomAmount(String(amt));
                      }}
                      className={`py-3 rounded-2xl text-xs font-black border transition-all cursor-pointer ${
                        (customAmount ? Number(customAmount) : rechargeAmount) === amt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-102'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter custom amount (e.g. 500)"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) setRechargeAmount(Number(e.target.value));
                    }}
                    className="w-full pl-9 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAllApiPopup()}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer"
                >
                  <QrCode className="w-5 h-5 text-white" />
                  <span>Scan UPI QR & Instant Pay ₹{customAmount && Number(customAmount) > 0 ? customAmount : rechargeAmount}</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Zero Wait Time (तत्काल क्रेडिट)</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Payment is auto-verified in 3 seconds directly via Gateway. No UTR submission needed.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 py-1.5 px-2.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>NPCI / UPI 100% Secure</span>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Manual Direct Bank / UTR */
          <form onSubmit={handleManualRechargeSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">Recharge Amount (₹):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">12-Digit UPI / UTR Number:</label>
                <input
                  type="text"
                  required
                  value={manualUtr}
                  onChange={(e) => setManualUtr(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 412356789012"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              <span>Submit UTR for Admin Verification</span>
            </button>
          </form>
        )}
      </div>

      {/* 2. Retailer Wallet & Statement History Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 max-w-xl z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ⚡ LIVE WALLET PASSBOOK
            </span>
            <span className="text-xs text-slate-400">• Real-Time Updates</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Retailer Wallet & Statement History
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            View passbook debits/credits and check status of all online UPI gateway orders.
          </p>
        </div>

        <div className="z-10 flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              fetchTransactions();
              fetchUpiOrders();
              refreshUser();
            }}
            title="Refresh All"
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTransactions || isLoadingUpiOrders ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
            <span>Refresh Statement</span>
          </button>
        </div>
      </div>

      {/* 3. Stat Summary Cards Grid (Available, Recharged, Spent, Refunds) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Available Balance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">AVAILABLE BALANCE</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            ₹{user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Auto Deduct Enabled
          </p>
        </div>

        {/* Total Recharged */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TOTAL RECHARGED</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-600">
            +₹{totalTopUp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">UPI & Portal Recharges</p>
        </div>

        {/* Total Service Fees Spent */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">SERVICE SPENT</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600">
            -₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Total application fees</p>
        </div>

        {/* Total Refunds & Commission */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">REFUNDS & MARGINS</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Coins className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600">
            +₹{(totalRefunds + totalCommission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Reverted on rejections</p>
        </div>
      </div>

      {/* 4. MAIN STATEMENT & UPI ORDERS NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setMainViewTab('PASSBOOK')}
          className={`px-4 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
            mainViewTab === 'PASSBOOK'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Passbook Statement (डेबिट/क्रेडिट स्टेटमेंट)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            mainViewTab === 'PASSBOOK' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-600'
          }`}>
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainViewTab('UPI_ORDERS');
            fetchUpiOrders();
          }}
          className={`px-4 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
            mainViewTab === 'UPI_ORDERS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>UPI Gateway Orders (ऑनलाइन पेमेंट ऑर्डर्स)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            mainViewTab === 'UPI_ORDERS' ? 'bg-indigo-800 text-amber-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {upiOrders.length}
          </span>
          {pendingUpiCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" title={`${pendingUpiCount} Pending`} />
          )}
        </button>
      </div>

      {/* VIEW 1: PASSBOOK STATEMENT (Debit & Credit Passbook) */}
      {mainViewTab === 'PASSBOOK' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                {user.role === 'ADMIN'
                  ? 'All Users Wallet History & Passbook (सभी वॉलेट पासबुक)'
                  : 'Statement History Log (पासबुक स्टेटमेंट)'}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {filteredTransactions.length} Items
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {user.role === 'ADMIN'
                  ? 'Complete wallet transactions audit log across all retailers and users'
                  : 'Every credit and debit entry recorded in your wallet passbook'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={user.role === 'ADMIN' ? 'Search retailer, mobile, service, req #...' : 'Search service, req #, description...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Type Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'TOP_UP', label: 'RECHARGES (+)' },
                  { id: 'DEDUCTION', label: 'DEDUCTIONS (-)' },
                  { id: 'REFUND', label: 'REFUNDS (💰)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTypeFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                      typeFilter === f.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statement Items List */}
          {isLoadingTransactions ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              Fetching wallet passbook statement...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2 bg-slate-50/50 rounded-2xl border border-slate-200/80">
              <Receipt className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-extrabold text-slate-700 text-sm">No Wallet Statement Records Found</p>
              <p className="text-slate-400 max-w-sm mx-auto">
                {searchQuery || typeFilter !== 'ALL'
                  ? 'Try resetting your search query or type filters.'
                  : 'Your transactions will automatically appear here once you apply for services or add funds.'}
              </p>
              {(searchQuery || typeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('ALL');
                  }}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors mt-2"
                >
                  Reset Statement Filters
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden divide-y divide-slate-200/80 bg-white">
              {filteredTransactions.map((tx) => {
                const isTopUp = tx.type === 'TOP_UP';
                const isRefund = tx.type === 'REFUND';
                const isDeduction = tx.type === 'DEDUCTION';

                return (
                  <div
                    key={tx.id}
                    className="px-3.5 py-3 hover:bg-slate-50/90 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left Side Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Compact Icon Badge */}
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isTopUp
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRefund
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isTopUp ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isRefund ? (
                          <RefreshCw className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wide ${
                            isTopUp
                              ? 'bg-emerald-100 text-emerald-900'
                              : isRefund
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}>
                            {isTopUp ? 'WALLET RECHARGE' : isRefund ? 'REFUND CREDITED' : 'SERVICE DEDUCTION'}
                          </span>

                          {(tx.retailerName || tx.storeName) && (
                            <span className="font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded text-[9.5px]">
                              👤 {tx.retailerName || 'Retailer'} {tx.storeName ? `(${tx.storeName})` : ''} {tx.retailerMobile ? `• 📞 ${tx.retailerMobile}` : ''}
                            </span>
                          )}

                          {tx.serviceTitle && (
                            <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-[9px] truncate max-w-[150px]">
                              {tx.serviceTitle}
                            </span>
                          )}

                          {tx.requestId && (
                            <span className="font-mono text-slate-400 font-bold text-[9px]">
                              #{tx.requestId}
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-slate-900 text-xs truncate mt-0.5">
                          {tx.description}
                        </p>

                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {new Date(tx.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} • Ref: <span className="font-mono text-slate-500">{tx.id}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Side: 3-Step Balance & Service Charge Flow Series */}
                    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 flex-wrap md:justify-end self-start md:self-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 shadow-2xs">
                        <span className="text-slate-600 font-bold text-[11px]">Prev Bal:</span>
                        <strong className="text-slate-950 font-black text-xs sm:text-sm">₹{(tx.previousBalance ?? 0).toFixed(2)}</strong>
                      </div>

                      <span className="text-slate-400 font-black text-xs">➔</span>

                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-2xs ${
                        isDeduction 
                          ? 'bg-rose-50 border-rose-300 text-rose-900' 
                          : isRefund 
                          ? 'bg-blue-50 border-blue-300 text-blue-900' 
                          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      }`}>
                        <span className="font-extrabold text-[11px]">
                          {isDeduction ? 'Charge:' : 'Credit:'}
                        </span>
                        <strong className={`font-black text-xs sm:text-sm ${
                          isDeduction ? 'text-rose-700' : isRefund ? 'text-blue-700' : 'text-emerald-700'
                        }`}>
                          {isDeduction ? '-' : '+'}₹{tx.amount.toFixed(2)}
                        </strong>
                      </div>

                      <span className="text-slate-400 font-black text-xs">➔</span>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-2xs border border-emerald-700">
                        <span className="text-emerald-100 font-bold text-[11px]">New Bal:</span>
                        <strong className="text-white font-black text-xs sm:text-sm">₹{(tx.newBalance ?? 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: UPI GATEWAY ORDERS (All / Success / Pending / Failed with Live Verification) */}
      {mainViewTab === 'UPI_ORDERS' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                UPI Gateway Orders Log (गेटवे पेमेंट ऑर्डर्स लिस्ट)
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {filteredUpiOrders.length} Orders
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Check status or verify any pending/failed UPI recharge order live with the payment gateway.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Order ID / User */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Order ID, amount, mobile..."
                  value={upiSearchQuery}
                  onChange={(e) => setUpiSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {upiSearchQuery && (
                  <button
                    onClick={() => setUpiSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {[
                  { id: 'ALL', label: `ALL (${upiOrders.length})` },
                  { id: 'SUCCESS', label: `✅ SUCCESS (${successUpiCount})` },
                  { id: 'PENDING', label: `⏳ PENDING (${pendingUpiCount})` },
                  { id: 'FAILED', label: `❌ FAILED (${failedUpiCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setUpiStatusFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                      upiStatusFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders List Display */}
          {isLoadingUpiOrders ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              Loading UPI Gateway orders...
            </div>
          ) : filteredUpiOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2 bg-slate-50/50 rounded-2xl border border-slate-200/80">
              <Zap className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-extrabold text-slate-700 text-sm">No UPI Gateway Orders Found</p>
              <p className="text-slate-400 max-w-sm mx-auto">
                {upiSearchQuery || upiStatusFilter !== 'ALL'
                  ? 'No orders match your search criteria. Try resetting status filters.'
                  : 'UPI recharge orders created via the payment gateway will appear here.'}
              </p>
              <button
                onClick={() => {
                  setUpiSearchQuery('');
                  setUpiStatusFilter('ALL');
                  fetchUpiOrders();
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors mt-2"
              >
                Reset Order Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUpiOrders.map((ord) => {
                const isSuccess = ord.status === 'SUCCESS';
                const isPending = ord.status === 'PENDING';
                const isFailed = ord.status === 'FAILED';
                const isChecking = isCheckingOrderId === ord.orderId;

                return (
                  <div
                    key={ord.orderId}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs ${
                      isSuccess
                        ? 'bg-emerald-50/40 border-emerald-200/80'
                        : isPending
                        ? 'bg-amber-50/40 border-amber-200/90'
                        : 'bg-rose-50/40 border-rose-200/80'
                    }`}
                  >
                    {/* Order Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isSuccess
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isSuccess ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : isPending ? <Clock className="w-3 h-3 text-amber-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{ord.status}</span>
                        </span>

                        {/* Order ID with Copy button */}
                        <div className="flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200 font-mono font-bold text-[11px] text-slate-800">
                          <span>#{ord.orderId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ord.orderId)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer ml-1"
                            title="Copy Order ID"
                          >
                            {copiedOrderIdMap[ord.orderId] ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Retailer Info */}
                        {(ord.retailerName || ord.retailerMobile) && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10.5px] font-bold text-slate-700">
                            👤 {ord.retailerName || 'Retailer'} {ord.retailerMobile ? `• 📞 ${ord.retailerMobile}` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span>
                          📅 {new Date(ord.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {ord.updatedAt && ord.updatedAt !== ord.createdAt && (
                          <span>• Updated: {new Date(ord.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap self-end md:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">AMOUNT</span>
                        <div className={`text-lg sm:text-xl font-black ${
                          isSuccess ? 'text-emerald-700' : 'text-slate-900'
                        }`}>
                          ₹{ord.amount.toFixed(2)}
                        </div>
                      </div>

                      {/* Action 1: Check Live Status / Verify Button */}
                      {!isSuccess && (
                        <button
                          type="button"
                          disabled={isChecking}
                          onClick={() => handleCheckUpiOrderStatus(ord.orderId)}
                          className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                          <span>{isChecking ? 'Checking...' : 'Verify / Check Status (स्टेटस चेक करें)'}</span>
                        </button>
                      )}

                      {/* Action 2: View QR / Pay (For pending) */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleOpenAllApiPopup(ord.amount)}
                          className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View QR & Pay</span>
                        </button>
                      )}

                      {/* Action 3: Admin Force Approve */}
                      {user.role === 'ADMIN' && !isSuccess && (
                        <button
                          type="button"
                          disabled={isChecking}
                          onClick={() => handleAdminForceApprove(ord.orderId)}
                          className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          title="Admin Manual Approval"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Admin Force Credit</span>
                        </button>
                      )}

                      {isSuccess && (
                        <div className="flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-100/80 px-3 py-2 rounded-xl text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Credited to Wallet</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Standalone Dynamic Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          amount={modalPaymentAmount}
          description="Wallet TopUp"
          merchantConfig={merchantConfig}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentModalSuccess}
        />
      )}
    </div>
  );
};
