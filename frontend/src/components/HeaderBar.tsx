import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Wallet, Shield, Activity, UserCheck, ChevronDown, LogOut, Store, Plus, Sparkles, Menu, X, LayoutDashboard, History, User, Phone, AlertTriangle, Zap, RotateCw } from 'lucide-react';

interface HeaderBarProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  onOpenWallet: () => void;
  onOpenExport?: () => void;
  onOpenProductChat?: (requestId: string) => void;
  onOpenNewServiceLaunch?: () => void;
  onOpenLoginModal?: () => void;
  onOpenSupportChat?: () => void;
  onOpenCompressorModal?: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onRefreshAllData?: () => void;
  isSyncing?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeNav,
  setActiveNav,
  onOpenWallet,
  onOpenExport = () => alert('Exporting Database backup...'),
  onOpenProductChat = () => {},
  onOpenNewServiceLaunch,
  onOpenLoginModal,
  onOpenSupportChat,
  onOpenCompressorModal,
  isSidebarOpen,
  setIsSidebarOpen,
  onRefreshAllData,
  isSyncing = false
}) => {
  const { user, logout } = useAuth();
  const [latency, setLatency] = useState(133);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Ping timer simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Math.floor(110 + Math.random() * 45));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] text-[#111827] shadow-xs px-2 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-2 w-full max-w-full">
        {/* Title & Mobile Toggle */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isSidebarOpen ? <X className="w-4 h-4 text-rose-600" /> : <Menu className="w-4 h-4" />}
          </button>

          <div
            onClick={() => setActiveNav('home')}
            className="cursor-pointer flex items-center gap-2 shrink-0 select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
              <div className="w-full h-full bg-blue-600 rounded-[10px] flex items-center justify-center text-white">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-[#111827] flex items-center gap-1.5 whitespace-nowrap">
                CafeService
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </h1>
              <p className="text-[10px] text-[#475569] font-medium hidden md:block whitespace-nowrap">Citizen Services Portal</p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          {/* Login / Sign Up Modal Trigger Button (Visible only when logged out) */}
          {!user && onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[10px] sm:text-[11px] rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Login or Register New Retailer Account (लॉग इन / साइन अप)"
            >
              <User className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Login / Signup</span>
            </button>
          )}

          {/* Live Sync / Manual Refresh Button */}
          {user && onRefreshAllData && (
            <button
              onClick={onRefreshAllData}
              disabled={isSyncing}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 ${
                isSyncing
                  ? 'bg-blue-100 border-blue-300 text-blue-700 animate-pulse'
                  : 'bg-slate-100 hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 active:scale-95'
              }`}
              title="Click to refresh requests and wallet balance instantly (ताज़ा करें)"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          {/* Support Chat Quick Button (Desktop Only) */}
          {onOpenSupportChat && (
            <button
              onClick={onOpenSupportChat}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#111827] font-bold text-[11px] rounded-xl shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Open Support Chat / Helpdesk"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Support</span>
            </button>
          )}

          {/* Admin Launch Service Quick Button (Desktop Only) */}
          {user?.role === 'ADMIN' && onOpenNewServiceLaunch && (
            <button
              onClick={onOpenNewServiceLaunch}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Launch Service</span>
            </button>
          )}

          {/* Wallet Balance Badge Button */}
          {user && (() => {
            const isLowBalance = user.walletBalance < 50;
            return (
              <>
                {/* Mobile Compact Wallet Pill (1 of 3 Mobile Header Items) */}
                <button
                  onClick={onOpenWallet}
                  className={`sm:hidden flex items-center gap-1 px-2 py-1 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 ${
                    isLowBalance
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                  title="Wallet Balance / Click to Add Funds"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-black leading-none font-mono">
                    ₹{user.walletBalance.toFixed(0)}
                  </span>
                  <span className="bg-[#2563EB] text-white p-0.5 rounded-md ml-0.5 flex items-center justify-center">
                    <Plus className="w-2.5 h-2.5" />
                  </span>
                </button>

                {/* Desktop Full Wallet Badge & Add Button */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setActiveNav('wallet')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shadow-2xs group shrink-0 relative cursor-pointer ${
                      isLowBalance
                        ? 'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#111827]'
                    }`}
                    title="View Full Wallet Statement & Passbook History"
                  >
                    {isLowBalance ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform shrink-0" />
                    ) : (
                      <Wallet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                    )}

                    <div className="text-left">
                      <span className={`block text-[8px] font-bold leading-tight uppercase ${isLowBalance ? 'text-rose-700 font-black' : 'text-[#64748B]'}`}>
                        {isLowBalance ? 'LOW BAL!' : 'Wallet'}
                      </span>
                      <span className={`block text-xs font-black leading-tight ${isLowBalance ? 'text-rose-700' : 'text-emerald-700'}`}>
                        ₹{user.walletBalance.toFixed(2)}
                      </span>
                    </div>

                    {isLowBalance && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                      </span>
                    )}
                  </button>

                  <button
                    onClick={onOpenWallet}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[11px] tracking-wide shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                    title="Add Money / Wallet Top-Up"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Fund</span>
                  </button>
                </div>
              </>
            );
          })()}

          {/* Notifications Dropdown */}
          <div>
            <NotificationDropdown onOpenProductChat={onOpenProductChat} />
          </div>

          {/* Account Switcher (Profile Avatar - 3 of 3 Mobile Header Items) */}
          {user && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <span className="text-xs font-extrabold text-[#111827] hidden md:inline">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 overflow-hidden">
                    <div className="p-3 bg-slate-50 rounded-xl mb-2">
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500">{user.email}</p>
                      <p className="text-[10px] font-bold text-indigo-600 mt-1 flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {user.storeName || 'Pankaj Digital Cafe'}
                      </p>
                    </div>

                    <div className="space-y-1 mb-2 border-b border-slate-100 pb-2">
                      <button
                        onClick={() => {
                          setActiveNav('profile');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-indigo-600" />
                        <span>My Profile & Cyber Cafe</span>
                      </button>

                      {onOpenLoginModal && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenLoginModal();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Phone className="w-4 h-4 text-indigo-600" />
                          <span>Mobile & Password Login</span>
                        </button>
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
      </header>

      {/* Mobile Quick Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-1.5 flex items-center justify-around text-white shadow-2xl">
        <button
          onClick={() => {
            setActiveNav('home');
            setIsSidebarOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeNav === 'home' || activeNav === 'dashboard' || activeNav === 'services'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Services</span>
        </button>

        <button
          onClick={() => {
            setActiveNav('history');
            setIsSidebarOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            activeNav === 'history' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">History</span>
        </button>

        <button
          onClick={onOpenWallet}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-emerald-400 font-bold"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Wallet</span>
        </button>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
            isSidebarOpen ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>
    </>
  );
};
