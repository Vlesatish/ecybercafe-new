import React from 'react';
import { X, Crown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UpgradeIDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
}

export const UpgradeIDModal: React.FC<UpgradeIDModalProps> = ({
  isOpen,
  onClose,
  onUpgradeSuccess
}) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const isUpgraded = user && user.role !== 'RETAILER';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white p-6 space-y-6 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-2xl">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isUpgraded ? `Already Upgraded (${user.role.replace('_', ' ')})` : 'Upgrade Retailer ID Role'}
              </h3>
              <p className="text-xs text-slate-400">
                {isUpgraded ? 'Your account already enjoys Distributor level privileges' : 'Earn lifetime commission on all retailer service transactions'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isUpgraded ? (
          <div className="p-5 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Check className="w-5 h-5 shrink-0" />
              <span>You are already an upgraded Partner!</span>
            </div>
            <p className="text-slate-300">
              Your account current role is <strong>{user.role.replace('_', ' ')}</strong>. No additional upgrade payment is required.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-600/10 border-2 border-amber-500 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] tracking-wider">
                DISTRIBUTOR ID PARTNER
              </span>
              <span className="text-amber-400 font-mono font-black text-sm">₹499</span>
            </div>
            <h4 className="text-lg font-black text-white">₹499 <span className="text-xs font-normal text-slate-400">/ One-time fee</span></h4>
            <ul className="space-y-2 text-xs text-slate-200 border-t border-slate-800 pt-3">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> ₹100 Instant Referral Bonus per Retailer</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> 1% Lifetime Margin on all Retailer Orders</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Onboard & Manage Unlimited Cyber Cafe Retailers</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Priority WhatsApp & Call Support Line</li>
            </ul>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
          >
            {isUpgraded ? 'Close Window' : 'Cancel'}
          </button>
          {!isUpgraded && (
            <button
              type="button"
              onClick={() => {
                alert(`Role Upgrade Request for DISTRIBUTOR submitted! Our account manager will contact you.`);
                onClose();
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 text-white font-extrabold text-xs rounded-xl shadow-lg"
            >
              Upgrade Role Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
