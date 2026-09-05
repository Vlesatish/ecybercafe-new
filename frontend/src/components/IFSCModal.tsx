import React, { useState } from 'react';
import { X, Building2, Search, CheckCircle, AlertCircle, Wallet, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface IFSCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet?: () => void;
}

export const IFSCModal: React.FC<IFSCModalProps> = ({ isOpen, onClose, onOpenWallet }) => {
  const { user, updateLocalWallet, refreshUser } = useAuth();
  const [ifsc, setIfsc] = useState('SBIN0005943');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInsufficient, setIsInsufficient] = useState(false);

  if (!isOpen) return null;

  const currentBalance = user?.walletBalance || 0;
  const verificationFee = 9.0;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length < 5) {
      setError('Please enter a valid IFSC code (e.g. SBIN0005943)');
      setIsInsufficient(false);
      return;
    }

    if (currentBalance < verificationFee) {
      setError(`Insufficient Wallet Balance! Verification charge is ₹${verificationFee.toFixed(2)}, available: ₹${currentBalance.toFixed(2)}.`);
      setIsInsufficient(true);
      return;
    }

    setError('');
    setIsInsufficient(false);
    setIsLoading(true);

    try {
      const sessionToken = localStorage.getItem('ecyber_session_token');
      const res = await fetch('/api/ifsc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          userId: user?.id,
          ifsc: cleanIfsc
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.remainingWalletBalance !== undefined) {
          updateLocalWallet(data.remainingWalletBalance);
        }
        refreshUser();
        setResult(data.result);
      } else {
        setError(data.error || 'Failed to verify IFSC code.');
        if (data.error && data.error.toLowerCase().includes('insufficient')) {
          setIsInsufficient(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Server error while verifying IFSC code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white p-5 sm:p-6 space-y-5 my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">IFSC Code Verification</h3>
              <p className="text-xs text-slate-400">Instant bank branch details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
              ₹9 / verification
            </span>
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1">
              <Wallet className="w-3 h-3 text-blue-400" />
              Balance: ₹{currentBalance.toFixed(2)}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Form Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
            <Search className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className="font-extrabold text-sm text-white">Verify IFSC Code</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enter IFSC code to get complete bank & branch details. ₹9 will be deducted from your wallet upon verification.
              </p>
            </div>
          </div>

          <form onSubmit={handleLookup} className="space-y-3">
            <div>
              <label className="font-bold text-slate-300 text-xs block mb-1">
                Enter IFSC code (e.g. SBIN0005943)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. SBIN0005943"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 bg-slate-900 border border-amber-500/50 focus:border-amber-400 rounded-xl text-xs font-mono font-bold text-amber-300 uppercase focus:outline-none shadow-xs"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-extrabold text-white rounded-xl text-xs flex items-center justify-center gap-2 shrink-0 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>{isLoading ? 'Verifying...' : 'Verify (₹9)'}</span>
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {isInsufficient && onOpenWallet && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWallet();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg flex items-center gap-1 mt-1 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Recharge Wallet Now</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Verification Result */}
        {result && (
          <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl text-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between font-black text-emerald-400 border-b border-slate-700 pb-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{result.bank}</span>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                VALID BRANCH
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
              <div><span className="text-slate-400 font-medium">IFSC Code:</span> <strong className="text-amber-300 font-mono">{result.ifsc}</strong></div>
              <div><span className="text-slate-400 font-medium">Branch:</span> <strong>{result.branch}</strong></div>
              <div><span className="text-slate-400 font-medium">City / Dist:</span> {result.city}</div>
              <div><span className="text-slate-400 font-medium">State:</span> {result.state}</div>
              <div><span className="text-slate-400 font-medium">MICR Code:</span> {result.micr}</div>
              <div><span className="text-slate-400 font-medium">UPI / IMPS:</span> <span className="text-emerald-400 font-bold">Enabled ✅</span></div>
            </div>
            <p className="text-[11px] text-slate-300 pt-2 border-t border-slate-700">
              <span className="text-slate-400 font-medium">Address:</span> {result.address}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
