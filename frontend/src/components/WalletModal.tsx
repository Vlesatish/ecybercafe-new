import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  Plus, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  QrCode,
  ExternalLink,
  Zap,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Building2,
  IndianRupee,
  Receipt,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentModal } from './PaymentModal';
import { MerchantConfigModal } from './MerchantConfigModal';
import { MerchantConfig, PaymentOrder } from '../types';
import { triggerFlowerShowerCelebration } from '../utils/celebration';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  
  // Payment Add Mode selection
  const [paymentType, setPaymentType] = useState<'UPI_GATEWAY' | 'MANUAL_ADMIN'>('UPI_GATEWAY');

  // ALL-API Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showMerchantConfigModal, setShowMerchantConfigModal] = useState<boolean>(false);
  const [isAdminConfigLoggedIn, setIsAdminConfigLoggedIn] = useState<boolean>(false);
  const [merchantConfig, setMerchantConfig] = useState<MerchantConfig>({
    apiToken: '737bb1-df709c-d3e73f-e1fb9f-699985',
    merchantVpa: 'ecybercafe@upi',
    merchantName: 'eCyberCafe Digital Services',
    adminPassword: 'admin123',
    bwPricePerPage: 2,
    colorPricePerPage: 10,
    aadhaarPrice: 15
  });

  // Instant UPI Gateway States
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [activeUpiOrder, setActiveUpiOrder] = useState<{
    orderId: string;
    amount: number;
    paymentUrl?: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
  } | null>(null);

  const [isCreatingUpi, setIsCreatingUpi] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Manual Direct Add (Requires Admin Approval) States
  const [manualAmount, setManualAmount] = useState<string>('500');
  const [manualMethod, setManualMethod] = useState<string>('UPI_DIRECT');
  const [manualUtr, setManualUtr] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);
  const [myTopupRequests, setMyTopupRequests] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<{
    upiId: string;
    payeeName: string;
    qrImageUrl: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    instructionText?: string;
  } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fetchMyTopupRequests = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/wallet/topup-requests?retailerId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMyTopupRequests(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/admin/payment-settings');
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyTopupRequests();
      fetchPaymentSettings();
    }
  }, [isOpen, user]);

  const paymentWinRef = React.useRef<Window | null>(null);

  // Listen for payment success message from external payment callback window or broadcast channel
  useEffect(() => {
    const handlePaymentMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
        if (paymentWinRef.current && !paymentWinRef.current.closed) {
          try { paymentWinRef.current.close(); } catch (e) {}
        }
        window.focus();
        setActiveUpiOrder((prev) => prev ? { ...prev, status: 'SUCCESS' } : null);
        setRequestSuccessMsg(`🎉 Instant Payment Verified! ₹${activeUpiOrder?.amount || ''} credited to your wallet.`);
        refreshUser();
      }
    };

    window.addEventListener('message', handlePaymentMessage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('payment_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
          if (paymentWinRef.current && !paymentWinRef.current.closed) {
            try { paymentWinRef.current.close(); } catch (e) {}
          }
          window.focus();
          setActiveUpiOrder((prev) => prev ? { ...prev, status: 'SUCCESS' } : null);
          setRequestSuccessMsg(`🎉 Instant Payment Verified! ₹${activeUpiOrder?.amount || ''} credited to your wallet.`);
          refreshUser();
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('message', handlePaymentMessage);
      if (channel) channel.close();
    };
  }, [activeUpiOrder]);

  const openPaymentWindow = (url: string) => {
    const win = window.open(url, 'PaymentGatewayWindow', 'width=650,height=750,resizable=yes,scrollbars=yes');
    paymentWinRef.current = win;
  };

  // Auto poll status if UPI order is pending
  useEffect(() => {
    if (!activeUpiOrder || activeUpiOrder.status !== 'PENDING') return;

    const interval = setInterval(() => {
      checkUpiOrderStatus(activeUpiOrder.orderId, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeUpiOrder]);

  if (!isOpen || !user) return null;

  // Create UPI Order via allapi.in
  const handleInitiateUpiPayment = async () => {
    const amountToTopup = customAmount ? Number(customAmount) : topupAmount;
    if (!amountToTopup || amountToTopup <= 0) return;

    setIsCreatingUpi(true);
    setRequestSuccessMsg(null);

    try {
      const res = await fetch('/api/upi/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: user.id,
          amount: amountToTopup,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveUpiOrder({
          orderId: data.orderId,
          amount: data.amount,
          paymentUrl: data.paymentUrl,
          status: 'PENDING',
        });
      }
    } catch (e) {
      console.error('Error creating UPI payment:', e);
    } finally {
      setIsCreatingUpi(false);
    }
  };

  // Check UPI Order Status
  const checkUpiOrderStatus = async (orderId: string, silent = false, simulate = false) => {
    if (!silent) setIsCheckingStatus(true);
    try {
      const url = simulate ? `/api/upi/check-status/${orderId}?simulate=true` : `/api/upi/check-status/${orderId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.orderStatus === 'SUCCESS') {
          setActiveUpiOrder((prev) => prev ? { ...prev, status: 'SUCCESS' } : null);
          setRequestSuccessMsg(`🎉 Instant Payment Verified! ₹${activeUpiOrder?.amount || ''} credited to your wallet.`);
          await refreshUser();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsCheckingStatus(false);
    }
  };

  // Submit Manual Request needing Admin Approval
  const handleSubmitManualTopupRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(manualAmount);
    if (!amt || amt <= 0) return;

    setIsSubmittingRequest(true);
    setRequestSuccessMsg(null);

    try {
      const res = await fetch('/api/wallet/topup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: user.id,
          amount: amt,
          paymentMethod: manualMethod,
          utrNumber: manualUtr,
          notes: manualNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRequestSuccessMsg(`✅ Top-Up Request submitted for ₹${amt.toFixed(2)}! It will be credited after Admin approval.`);
        setManualUtr('');
        setManualNotes('');
        await fetchMyTopupRequests();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl border border-amber-400/20 shadow-md">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  Add Money / Wallet Top-Up
                </h2>
                <p className="text-xs text-slate-400">
                  Current Balance: <span className="font-extrabold text-emerald-400 font-mono">₹{user.walletBalance.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Success Alert */}
            {requestSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="flex-1">{requestSuccessMsg}</span>
              </div>
            )}

            {/* Dynamic Instant UPI Gateway */}
            <div className="space-y-5">
                <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl space-y-2 border border-indigo-700/60 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-black text-xs">
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Instant Automated UPI Auto-Pay Gateway</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      ⚡ Instant Auto-Credit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Click to generate a real-time QR code popup. Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
                  </p>
                </div>

                {/* Amount Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 block">Select Quick Amount (रुपये चुनें या दर्ज करें):</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setTopupAmount(amt);
                          setCustomAmount(String(amt));
                        }}
                        className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          (customAmount ? Number(customAmount) : topupAmount) === amt
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input & Trigger Button */}
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter custom amount (e.g. 500)"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        if (e.target.value) setTopupAmount(Number(e.target.value));
                      }}
                      className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
                  >
                    <QrCode className="w-5 h-5 text-slate-950" />
                    <span>Scan UPI QR & Pay ₹{customAmount && Number(customAmount) > 0 ? customAmount : topupAmount}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Secure Auto-Verification</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMerchantConfigModal(true)}
                    className="font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gateway Settings</span>
                  </button>
                </div>
              </div>

            {/* Recent Top-Up Requests Status List */}
            {myTopupRequests.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Your Direct Top-Up Request Log
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {myTopupRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">₹{req.amount.toFixed(2)}</span>
                          {req.utrNumber && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md font-bold">
                              UTR: {req.utrNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(req.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                      }`}>
                        {req.status === 'APPROVED' ? 'APPROVED' : req.status === 'REJECTED' ? 'REJECTED' : 'PENDING APPROVAL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>

      {/* Standalone ALL-API Dynamic Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          amount={customAmount && Number(customAmount) > 0 ? Number(customAmount) : topupAmount}
          description="Wallet TopUp"
          merchantConfig={merchantConfig}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={async (paymentOrder: PaymentOrder) => {
            setShowPaymentModal(false);
            triggerFlowerShowerCelebration();
            setRequestSuccessMsg(`🎉 Payment Verified! ₹${paymentOrder.amount.toFixed(2)} credited to your wallet.`);
            await refreshUser();
          }}
        />
      )}

      {/* Standalone Admin Rate & Merchant Settings Modal */}
      {showMerchantConfigModal && (
        <MerchantConfigModal
          config={merchantConfig}
          isAdminLoggedIn={isAdminConfigLoggedIn}
          onAdminLoginSuccess={() => setIsAdminConfigLoggedIn(true)}
          onSave={(updatedConfig: MerchantConfig) => {
            setMerchantConfig(updatedConfig);
            setShowMerchantConfigModal(false);
          }}
          onClose={() => setShowMerchantConfigModal(false)}
        />
      )}
    </AnimatePresence>
  );
};

