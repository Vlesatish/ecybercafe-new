import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  RotateCw
} from "lucide-react";
import { PaymentOrder, MerchantConfig } from "../types";
import { triggerFlowerShowerCelebration } from "../utils/celebration";
import { useAuth } from "../context/AuthContext";

interface PaymentModalProps {
  amount: number;
  description: string;
  merchantConfig: MerchantConfig;
  onClose: () => void;
  onPaymentSuccess: (order: PaymentOrder) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  amount,
  description,
  merchantConfig,
  onClose,
  onPaymentSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>("Pending");
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);

  const formattedAmount = Number(amount || 0).toFixed(2);
  const noteText = (description || "Wallet Recharge").trim();

  // 1. Create order strictly via ALLAPI gateway backend proxy with automatic background retry
  const createLiveOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    let lastErrorMsg = "Unable to connect to Payment Gateway. Please click retry.";

    // Try up to 3 times automatically in the background
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const generatedOrderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`;
        const response = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            retailerId: user?.id || "usr_ret_1",
            token: merchantConfig.apiToken || "737bb1-df709c-d3e73f-e1fb9f-699985",
            order_id: generatedOrderId,
            txn_amount: amount,
            txn_note: noteText,
            product_name: noteText,
            customer_name: user?.name || "Retailer",
            customer_mobile: user?.mobileNumber || "9999999999",
            customer_email: user?.email || "customer@ecybercafe.in",
          }),
        });

        const data = await response.json();

        if (data && (data.status === true || data.success === true)) {
          const resObj = data.results || data || {};
          const newOrder: PaymentOrder = {
            orderId: resObj.order_id || data.orderId || generatedOrderId,
            txnId: resObj.txn_id,
            amount: amount,
            status: "Pending",
            paymentUrl: resObj.payment_url || data.paymentUrl,
            upiIntent: resObj.upi_intent || data.upi_intent,
            qrData: resObj.qr_data || data.qr_data || (typeof resObj.upi_intent === "string" ? resObj.upi_intent : resObj.upi_intent?.bhim),
            qrImage: resObj.qr_image || data.qr_image,
            createdAt: new Date().toISOString(),
          };
          setOrder(newOrder);
          setError(null);
          setLoading(false);
          return; // Success! Exit immediately.
        } else {
          lastErrorMsg = data?.message || data?.error || "Payment Gateway is initializing...";
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || "Connection interrupted. Retrying...";
      }

      // If not last attempt, wait briefly before auto-retrying in background
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    // If all 3 background attempts failed, show clear error state with retry button
    setError(lastErrorMsg);
    setLoading(false);
  }, [amount, noteText, merchantConfig.apiToken, user?.id, user?.name, user?.mobileNumber, user?.email]);

  useEffect(() => {
    createLiveOrder();
  }, [createLiveOrder]);

  // 2. Auto-polling status from backend status endpoint every 3.5 seconds
  useEffect(() => {
    if (!order || pollingStatus === "Success") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/payment/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: merchantConfig.apiToken || "737bb1-df709c-d3e73f-e1fb9f-699985",
            order_id: order.orderId,
          }),
        });

        const data = await response.json();
        if (data && (data.status === true || data.success === true)) {
          const currentStatus = data?.results?.status || data?.orderStatus || data?.status;
          if (
            currentStatus === "Success" || 
            currentStatus === "SUCCESS" || 
            data?.orderStatus === "SUCCESS" || 
            data?.results?.status === "Success"
          ) {
            setPollingStatus("Success");
            triggerFlowerShowerCelebration(1000);
            clearInterval(interval);
            setTimeout(() => {
              onPaymentSuccess({ ...order, status: "Success" });
            }, 1800);
          }
        }
      } catch (e) {
        // Continue polling
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [order, pollingStatus, merchantConfig.apiToken, onPaymentSuccess]);

  // Dynamic QR data from live gateway only
  const liveQrValue =
    order?.qrData ||
    (typeof order?.upiIntent === "string" ? order.upiIntent : null) ||
    (typeof order?.upiIntent === "object" ? order.upiIntent?.bhim : null) ||
    order?.paymentUrl ||
    null;

  // Dynamic 1-Click Mobile Apps Deep Links from gateway upi_intent
  const gpayUri = (typeof order?.upiIntent === "object" && order?.upiIntent?.gpay)
    ? order.upiIntent.gpay
    : liveQrValue || order?.paymentUrl || "#";

  const phonepeUri = (typeof order?.upiIntent === "object" && order?.upiIntent?.phonepe)
    ? order.upiIntent.phonepe
    : liveQrValue || order?.paymentUrl || "#";

  const paytmUri = (typeof order?.upiIntent === "object" && order?.upiIntent?.paytm)
    ? order.upiIntent.paytm
    : liveQrValue || order?.paymentUrl || "#";

  const bhimUri = (typeof order?.upiIntent === "object" && order?.upiIntent?.bhim)
    ? order.upiIntent.bhim
    : liveQrValue || order?.paymentUrl || "#";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <CreditCard className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">
                  UPI Instant Auto-Pay
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase">
                  Live Gateway
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[11px] text-slate-400 font-mono">
                  #{order?.orderId || "Connecting..."}
                </p>
                {order?.orderId && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(order.orderId);
                      setCopiedOrderId(true);
                      setTimeout(() => setCopiedOrderId(false), 2000);
                    }}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Order ID"
                  >
                    {copiedOrderId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 text-center">
          
          {loading ? (
            <div className="py-12 space-y-3">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                ALLAPI.in Dynamic Live QR Code लोड हो रहा है...
              </p>
              <p className="text-xs text-slate-400">Connecting securely to payment gateway</p>
            </div>
          ) : error ? (
            <div className="py-8 space-y-4">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Payment Gateway Connection Issue
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium max-w-xs mx-auto">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={createLiveOrder}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Retry Gateway Connection (पुनः प्रयास करें)</span>
              </button>
            </div>
          ) : pollingStatus === "Success" ? (
            <div className="py-6 sm:py-8 space-y-4">
              {/* Clean Checkmark Badge */}
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  भुगतान सफल! (Payment Received)
                </h4>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 pt-1">
                  ₹{Number(amount).toFixed(2)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold max-w-xs mx-auto pt-1">
                  यह राशि आपके वॉलेट में सफलतापूर्वक जोड़ दी गई है।
                </p>
                {order?.orderId && (
                  <p className="text-[11px] font-mono text-slate-400 pt-1">
                    Order ID: #{order.orderId}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onPaymentSuccess({ ...order!, status: "Success" })}
                  className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer"
                >
                  Done / आगे बढ़ें
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Amount Display */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-3.5">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                  AMOUNT PAYABLE (कुल देय राशि)
                </span>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                  ₹{formattedAmount}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate font-medium">
                  {noteText}
                </p>
              </div>

              {/* Dynamic Payment Gateway QR Code Display */}
              <div className="bg-white p-4 rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/80 inline-block shadow-md relative">
                {order?.qrImage ? (
                  <img
                    src={order.qrImage}
                    alt="Payment Gateway QR Code"
                    className="w-[210px] h-[210px] object-contain rounded-2xl mx-auto"
                  />
                ) : liveQrValue ? (
                  <QRCodeSVG
                    value={liveQrValue}
                    size={210}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="w-[210px] h-[210px] flex items-center justify-center text-xs text-slate-400 font-bold">
                    Connecting Gateway...
                  </div>
                )}
              </div>

              {/* Scan Info & Auto Polling Status */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span>Auto-verifying payment every 3.5s... (ऑटो चेकिंग चालू है)</span>
              </div>

              {/* Mobile UPI Apps 1-Click Intent Links */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-left">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold text-center">
                  Direct Pay with Mobile UPI Apps:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <a
                    href={gpayUri}
                    className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    Google Pay
                  </a>
                  <a
                    href={phonepeUri}
                    className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    PhonePe
                  </a>
                  <a
                    href={paytmUri}
                    className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    Paytm
                  </a>
                  <a
                    href={bhimUri}
                    className="py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-extrabold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    BHIM / Any
                  </a>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
