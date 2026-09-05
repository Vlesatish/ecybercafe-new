import React, { useState } from 'react';
import { Crown, Check, Zap, Sparkles, X, ShieldCheck } from 'lucide-react';
import { UserSubscription } from '../../types/idStudio';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: UserSubscription;
  onUpgrade: (tier: 'PRO' | 'AUTO_PRINT_UNLIMITED') => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentSubscription,
  onUpgrade
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                eCyberCafe.in Pro & Automation Tiers
              </h3>
              <p className="text-[11px] text-slate-400">
                Unlock high-speed 400 DPI exports, Auto-Spooling & batch queueing
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

        {/* Pricing Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40">
          
          {/* Card 1: Pro Studio */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wider">Studio Pro</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">Most Popular</span>
              </div>
              <div className="text-2xl font-black text-white mt-2">
                ₹199 <span className="text-xs text-slate-400 font-normal">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">For cyber cafe & photo printing operators</p>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-400" />
                  <span>Unlimited 300 & 400 DPI PDF Exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-400" />
                  <span>Advanced Regional Lighting Filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-400" />
                  <span>Auto-Split for all Indian ID Standards</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-400" />
                  <span>No Watermark & Multi-Page Queues</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                onUpgrade('PRO');
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {currentSubscription.tier === 'PRO' ? 'Current Plan' : 'Activate Pro Access'}
            </button>
          </div>

          {/* Card 2: Auto-Print Automation Suite */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/20 to-slate-900 border border-amber-500/40 flex flex-col justify-between space-y-4 relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Auto-Print Shop Hub</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Full Suite</span>
              </div>
              <div className="text-2xl font-black text-white mt-2">
                ₹399 <span className="text-xs text-slate-400 font-normal">/ month</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Zero-touch customer self-service kiosk</p>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>All Studio Pro Features Included</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Windows Background Spooler Agent</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Customer QR Standee with UPI Gateway</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Auto-Spool directly to Epson & Canon Tray</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                onUpgrade('AUTO_PRINT_UNLIMITED');
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              Activate Auto-Print Suite
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Safe & Instant Activation</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
