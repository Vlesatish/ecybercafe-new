import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Wallet, ShieldCheck, Database, UserCheck, LogOut, ChevronDown, UserPlus, Sparkles, Store } from 'lucide-react';

interface NavbarProps {
  onOpenWallet: () => void;
  onOpenExport: () => void;
  onOpenProductChat: (productId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenWallet,
  onOpenExport,
  onOpenProductChat,
}) => {
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">MerchantVerify</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Retailer Products & Verification Portal</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && user.role === 'RETAILER' && (
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-800 border border-indigo-500/30 rounded-xl transition-all shadow-xs group"
            >
              <Wallet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block text-[9px] text-slate-400 leading-tight">Service Wallet</span>
                <span className="block text-xs font-bold text-emerald-400">
                  ₹{user.walletBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </button>
          )}

          {/* Database Export Button - Admin Only */}
          {user && user.role === 'ADMIN' && (
            <button
              onClick={onOpenExport}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60 flex items-center gap-1.5 text-xs font-medium"
              title="Export Database (JSON/CSV)"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Export DB</span>
            </button>
          )}

          {/* Notifications */}
          <NotificationDropdown onOpenProductChat={onOpenProductChat} />

          {/* Role Switcher & Account Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
              >
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover ring-2 ring-indigo-500/40"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-indigo-300 font-medium">{user.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-100 z-50 p-2 overflow-hidden">
                    <div className="p-3 bg-slate-50 rounded-xl mb-2">
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500">{user.email}</p>
                      {user.storeName && (
                        <p className="text-[10px] font-semibold text-indigo-600 mt-1 flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {user.storeName}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
