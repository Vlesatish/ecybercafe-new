import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, AlertCircle, X, DollarSign } from 'lucide-react';
import { WalletState, WalletTransaction } from '../../types/idStudio';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  settlementUpi?: string;
  onRequestWithdrawal: (amount: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletState,
  settlementUpi = 'yourshop@okhdfcbank',
  onRequestWithdrawal
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  if (!isOpen) return null;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(withdrawAmount);
    if (!val || val <= 0 || val > walletState.balance) {
      window.dispatchEvent(new CustomEvent('app_toast', { detail: '⚠️ Invalid withdrawal amount' }));
      return;
    }
    onRequestWithdrawal(val);
    setShowWithdrawForm(false);
    setWithdrawAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Shop Earnings & UPI Settlement Wallet
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct UPI QR customer print payments & daily payouts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 bg-slate-950/40">
          
          {/* Balance Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Available Balance</span>
              <div className="text-lg font-black text-emerald-400 mt-1">₹{walletState.balance.toFixed(2)}</div>
            </div>
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Received</span>
              <div className="text-lg font-black text-white mt-1">₹{walletState.totalReceived.toFixed(2)}</div>
            </div>
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Pending Payout</span>
              <div className="text-lg font-black text-amber-400 mt-1">₹{walletState.pendingRequests.toFixed(2)}</div>
            </div>
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Settled to Bank</span>
              <div className="text-lg font-black text-blue-400 mt-1">₹{walletState.transferredAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Withdraw Request Action */}
          {!showWithdrawForm ? (
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-white">Instant UPI Settlement</div>
                <div className="text-[11px] text-slate-400">Transfer funds to <b>{settlementUpi}</b></div>
              </div>
              <button
                onClick={() => setShowWithdrawForm(true)}
                disabled={walletState.balance < 10}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Withdraw Funds
              </button>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="p-4 bg-slate-900 rounded-xl border border-emerald-500/50 space-y-3">
              <div className="text-xs font-black text-white">Request Bank / UPI Payout</div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Withdraw Amount (₹)</label>
                <input
                  type="number"
                  max={walletState.balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max ₹${walletState.balance}`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          )}

          {/* Transactions Ledger */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Recent Settlement Ledger
            </h4>
            <div className="space-y-1.5">
              {walletState.transactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                  No transaction records yet.
                </div>
              ) : (
                walletState.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {tx.type === 'payment_credit' ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white">{tx.description}</div>
                        <div className="text-[10px] text-slate-500">{new Date(tx.timestamp).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className={`font-mono font-black ${tx.type === 'payment_credit' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {tx.type === 'payment_credit' ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
          >
            Close Wallet
          </button>
        </div>

      </div>
    </div>
  );
};
