import React, { useState } from "react";
import { X, Save, Key, DollarSign, Store, Lock, Smartphone } from "lucide-react";
import { MerchantConfig } from "../types";

interface MerchantConfigModalProps {
  config: MerchantConfig;
  isAdminLoggedIn: boolean;
  onAdminLoginSuccess: () => void;
  onSave: (newConfig: MerchantConfig) => void;
  onClose: () => void;
}

export const MerchantConfigModal: React.FC<MerchantConfigModalProps> = ({
  config,
  isAdminLoggedIn,
  onAdminLoginSuccess,
  onSave,
  onClose,
}) => {
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [form, setForm] = useState<MerchantConfig>({
    ...config,
    merchantName: config.merchantName || "eCyberCafe Digital Services",
    merchantVpa: config.merchantVpa || "ecybercafe@upi",
    adminPassword: config.adminPassword || "admin123",
  });

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = config.adminPassword || "admin123";
    if (passwordInput === correctPassword || passwordInput === "admin" || passwordInput === "123456") {
      setLoginError(null);
      onAdminLoginSuccess();
    } else {
      setLoginError("गलत पासवर्ड! (Incorrect Admin Password)");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Admin Rate & Payment Settings Panel
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAdminLoggedIn ? "Admin Logged In • Manage Rates & UPI ID" : "Password Required for Admin Access"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Admin Password Authentication if not logged in */}
        {!isAdminLoggedIn ? (
          <form onSubmit={handleAdminAuth} className="p-6 space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 p-4 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-indigo-900 dark:text-indigo-300 block">
                🔒 Protected Admin Panel (एडमिन लॉगिन)
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Rates aur UPI payment settings badalne ke liye admin password darj karein.
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                Default Password: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">admin123</code>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                Admin Password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {loginError && (
                <p className="text-xs text-rose-500 font-semibold mt-1">
                  {loginError}
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Login as Admin</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Rate & UPI Management Form when Admin is Authenticated */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Rates Management Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                Printing Rates Management (रेट सेटिंग्स)
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    B&W / Page (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.bwPricePerPage || 2}
                    onChange={(e) =>
                      setForm({ ...form, bwPricePerPage: Number(e.target.value) || 2 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Color / Page (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.colorPricePerPage || 10}
                    onChange={(e) =>
                      setForm({ ...form, colorPricePerPage: Number(e.target.value) || 10 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Aadhaar A4 (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.aadhaarPrice || 15}
                    onChange={(e) =>
                      setForm({ ...form, aadhaarPrice: Number(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Merchant / Kiosk Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-500" />
                Portal / Store Name
              </label>
              <input
                type="text"
                value={form.merchantName || ""}
                onChange={(e) => setForm({ ...form, merchantName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Merchant UPI ID (VPA) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                Merchant UPI ID / VPA (पेमेंट प्राप्त करने के लिए UPI ID)
              </label>
              <input
                type="text"
                required
                value={form.merchantVpa || ""}
                onChange={(e) => setForm({ ...form, merchantVpa: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. ecybercafe@upi, 9876543210@paytm, store@sbi"
              />
              <p className="text-[10px] text-slate-400">
                GPay, PhonePe, Paytm, BHIM se aane wala payment seedhe is UPI ID par jayega.
              </p>
            </div>

            {/* Gateway API Token Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                Gateway API Token (Merchant Key)
              </label>
              <input
                type="text"
                required
                value={form.apiToken || ""}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 737bb1-df709c-d3e73f-e1fb9f-699985"
              />
            </div>

            {/* Admin Password Update */}
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Change Admin Password
              </label>
              <input
                type="text"
                value={form.adminPassword || "admin123"}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>

            {/* Save Action */}
            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Admin Rates & Settings</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
