import React, { useState } from 'react';
import { Crown, Check, Zap, ArrowRight, ShieldCheck, Sparkles, Building2, UserCheck, Star, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UpgradeRolePageViewProps {
  onOpenWalletModal: () => void;
  onOpenDistributorPanel?: () => void;
}

export const UpgradeRolePageView: React.FC<UpgradeRolePageViewProps> = ({ onOpenWalletModal, onOpenDistributorPanel }) => {
  const { user, refreshUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'DISTRIBUTOR'>('DISTRIBUTOR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const walletBalance = user?.walletBalance || 0;

  const handleUpgrade = async (role: 'DISTRIBUTOR', fee: number) => {
    setIsProcessing(true);
    setSuccessMessage('');

    if (walletBalance < fee) {
      alert(`Insufficient wallet balance (₹${walletBalance.toFixed(2)}). You need ₹${fee} to upgrade to ${role.replace('_', ' ')}. Please topup your wallet.`);
      onOpenWalletModal();
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch('/api/user/upgrade-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          targetRole: role,
          fee
        })
      });

      if (res.ok) {
        const roleName = role.replace('_', ' ');
        if (user?.role === 'ADMIN') {
          setSuccessMessage(`🎉 Admin Notice: Role upgrade fee processed! Your ADMIN role and super-admin privileges remain intact.`);
        } else {
          setSuccessMessage(`🎉 Congratulations! Your ID Role has been upgraded to ${roleName}. Enjoy higher commission margins!`);
        }
        refreshUser();
      } else {
        const data = await res.json();
        alert(data.error || 'Upgrade request failed. Please try again.');
      }
    } catch (e) {
      alert('Error connecting to server. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Cyber Neon Header Hero */}
      <div className="bg-slate-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-[0_0_35px_rgba(245,158,11,0.25)]">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 font-black text-xs uppercase tracking-wider backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>OFFICIAL ID ROLE UPGRADE PORTAL</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              Upgrade Your Retailer ID Role
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Unlock unlimited retailer onboarding rights, higher commission margins on every Aadhaar/Voter/PAN service request, and automatic passbook payouts.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shrink-0 w-full sm:w-auto shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">YOUR CURRENT ROLE</span>
            <span className="px-4 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-sm uppercase mt-1.5 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              {user?.role || 'RETAILER'}
            </span>
            <span className="text-[11px] text-emerald-400 font-bold mt-2 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Balance: ₹{walletBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {user && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(user.role) && (
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-500 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-emerald-400">आप पहले से ही Active Distributor ID हैं! (Already Upgraded)</h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Your account holds full Distributor Network & Commission privileges. You can manage your retailers and custom rates anytime.
              </p>
            </div>
          </div>
          {onOpenDistributorPanel && (
            <button
              onClick={onOpenDistributorPanel}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shrink-0 shadow-lg flex items-center gap-2"
            >
              <span>Go To Distributor Panel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 rounded-2xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 2. Premium Neon Role Option */}
      <div className="max-w-2xl mx-auto w-full">
        {/* Card 1: Distributor ID (HIGHLIGHTED NEON GOLD) */}
        <div
          onClick={() => setSelectedRole('DISTRIBUTOR')}
          className="bg-slate-950 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between space-y-6 shadow-[0_0_40px_rgba(245,158,11,0.5)] ring-4 ring-amber-400/50"
        >
          {/* Top Badge */}
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase px-5 py-1.5 rounded-bl-2xl shadow-md tracking-wider flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-slate-950" />
            <span>OFFICIAL DISTRIBUTOR PARTNER</span>
          </div>

          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 fill-amber-300" />
                DISTRIBUTOR ID
              </span>
            </div>

            <div>
              <h3 className="text-3xl font-black text-amber-300 flex items-center gap-2">
                Distributor Partner
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                Get ₹100 Instant Bonus on adding every Retailer + 1% Lifetime Service Margin on all completed orders!
              </p>
            </div>

            <div className="text-4xl font-black text-amber-400 font-mono">
              ₹499 <span className="text-xs text-slate-400 font-sans font-normal">/ One-time setup fee</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-200 border-t border-slate-800/80 pt-5">
              <li className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-bold text-white">₹100 Instant Referral Bonus per Retailer registered</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-bold text-white">1% Lifetime Commission on all Retailer service requests</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Onboard & Manage Unlimited Cyber Cafe Retailers</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Access Dedicated Distributor Control Panel</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Dedicated WhatsApp & Call Support Line</span>
              </li>
            </ul>
          </div>

          {user && user.role !== 'RETAILER' ? (
            <button
              type="button"
              disabled={true}
              className="w-full py-4 bg-emerald-950/80 border-2 border-emerald-500/80 text-emerald-300 font-black text-sm rounded-2xl shadow-lg cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Already Upgraded to {user.role.replace('_', ' ')} ID (No Payment Needed)</span>
            </button>
          ) : (
            <button
              onClick={() => handleUpgrade('DISTRIBUTOR', 499)}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all cursor-pointer disabled:opacity-50 tracking-wide"
            >
              {isProcessing ? 'Processing Upgrade...' : 'Upgrade To Distributor ID (₹499)'}
            </button>
          )}
        </div>
      </div>

      {/* 3. Feature Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Retailer vs Distributor Comparison</h3>
            <p className="text-xs text-slate-400">See what benefits you unlock as a Distributor Partner</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-extrabold">Feature / Benefit</th>
                <th className="py-3 px-4 font-extrabold text-slate-300">Retailer ID</th>
                <th className="py-3 px-4 font-extrabold text-amber-400">Distributor ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Retailer Onboarding Rights</td>
                <td className="py-3.5 px-4 text-slate-500">❌ None</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">✅ Unlimited Retailers</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Referral Bonus per Retailer</td>
                <td className="py-3.5 px-4 text-slate-500">❌ None</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">✅ ₹100 Instant Bonus</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Service Order Commission</td>
                <td className="py-3.5 px-4 text-slate-400">Standard Rate</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">✅ 1% Lifetime Margin</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Distributor Dashboard Panel</td>
                <td className="py-3.5 px-4 text-slate-500">❌ None</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">✅ Full Access</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Support Priority</td>
                <td className="py-3.5 px-4 text-slate-400">Standard Ticket</td>
                <td className="py-3.5 px-4 text-amber-300 font-bold">VIP Fast Whatsapp Desk</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
