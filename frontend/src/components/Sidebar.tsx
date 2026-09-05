import React from 'react';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { 
  LayoutDashboard, 
  Wallet, 
  Coins, 
  History, 
  ArrowUpCircle, 
  Crown, 
  User, 
  HelpCircle, 
  LifeBuoy,
  Building2, 
  Lock, 
  Shield, 
  Palette, 
  QrCode, 
  Phone, 
  MessageCircle, 
  LogOut,
  ChevronRight,
  Sparkles,
  FileText,
  Users,
  Zap,
  Globe,
  CreditCard,
  Printer,
  Layers,
  FileDown
} from 'lucide-react';

interface SidebarProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenWallet: () => void;
  onOpenUpgradeModal: () => void;
  onOpenIfscModal: () => void;
  onOpenSupportChat?: () => void;
  onOpenNewServiceLaunch?: () => void;
  onOpenLoginModal?: () => void;
  onOpenCompressorModal?: () => void;
  onOpenPassportPhoto?: () => void;
  onOpenIDCardPrint?: () => void;
  onOpenPdfPageManager?: () => void;
  onOpenJpgToPdf?: () => void;
  onOpenResumeMaker?: () => void;
  onOpenPaymentQR?: () => void;
  onOpenPanResizer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  setActiveNav,
  isOpenMobile,
  setIsOpenMobile,
  onOpenWallet,
  onOpenUpgradeModal,
  onOpenIfscModal,
  onOpenSupportChat,
  onOpenNewServiceLaunch,
  onOpenLoginModal,
  onOpenCompressorModal,
  onOpenPassportPhoto,
  onOpenIDCardPrint,
  onOpenPdfPageManager,
  onOpenJpgToPdf,
  onOpenResumeMaker,
  onOpenPaymentQR,
  onOpenPanResizer
}) => {
  const { user, logout } = useAuth();
  const [supportWhatsapp, setSupportWhatsapp] = React.useState('0000000000');
  const [telegramChannel, setTelegramChannel] = React.useState('https://t.me/eCyberCafeOfficial');
  const [enableDistributorReg, setEnableDistributorReg] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/settings')
      .then(res => safeJson(res))
      .then(data => {
        if (!data) return;
        if (data.supportWhatsapp) setSupportWhatsapp(data.supportWhatsapp);
        if (data.telegramChannel) setTelegramChannel(data.telegramChannel);
        if (data.enableDistributorRegistration !== undefined) setEnableDistributorReg(Boolean(data.enableDistributorRegistration));
      })
      .catch(e => console.error(e));
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(!user ? [{ id: 'login_modal', label: 'Login / Signup Page', icon: Lock, action: onOpenLoginModal }] : []),
    ...(user && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(user.role) ? [{ id: 'distributor_panel', label: 'Distributor Network', badge: '₹100', icon: Users }] : []),
    ...(user && ['DISTRIBUTOR', 'MASTER_DISTRIBUTOR', 'STATE_HEAD', 'ADMIN'].includes(user.role) ? [{ id: 'user_list', label: 'User List (यूजर लिस्ट)', icon: Users }] : []),
    { id: 'history', label: 'Request History', icon: History },
    { id: 'tickets', label: 'Helpdesk Tickets (सपोर्ट टिकट)', icon: LifeBuoy },
    { id: 'wallet', label: 'Wallet & Passbook', icon: Wallet },
    ...(enableDistributorReg && (!user || user.role === 'RETAILER') ? [{ id: 'upgrade', label: 'Upgrade ID Role', icon: ArrowUpCircle }] : []),
    { id: 'profile', label: 'My Profile & Cyber Cafe', icon: User },
    { id: 'password', label: 'Security & Password', icon: Lock },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 text-slate-800 flex flex-col shrink-0 min-h-screen transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64 lg:z-auto ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-blue-600 p-0.5 flex items-center justify-center shadow-xs">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="font-black text-base tracking-tight text-slate-900">
                eCyberCafe.in
              </h2>
            </div>
          </div>

          {/* Close button for mobile menu */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

      {/* Admin Quick Launch Button Banner */}
      {user?.role === 'ADMIN' && onOpenNewServiceLaunch && (
        <div className="p-3 border-b border-slate-100 bg-blue-50/40">
          <button
            onClick={onOpenNewServiceLaunch}
            className="w-full py-2.5 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            + LAUNCH NEW SERVICE
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id || (item.id === 'dashboard' && activeNav === 'home');
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) {
                  item.action();
                }
                setActiveNav(item.id);
                setIsOpenMobile(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[12px] text-xs font-semibold transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                <span className="truncate whitespace-nowrap">{item.label}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-md shrink-0 ${
                    isActive ? 'bg-amber-300 text-slate-950' : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} />
            </button>
          );
        })}
      </nav>

      {/* Bottom User Account Card */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80 space-y-3">
        <div className="p-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/30"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-900 truncate">{user?.name || 'Pankaj Kumar'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wide ${
                  user?.role === 'ADMIN' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {user?.role || 'RETAILER'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Footer Options */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700">
          <button onClick={() => alert('Theme settings: Modern High-Contrast Light Mode active')} className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors text-slate-700 shadow-2xs">
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>My Theme</span>
          </button>
          <button onClick={() => alert(`Your Referral Code: CITIZEN-${user?.mobileNumber || '0000000000'}`)} className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors text-slate-700 shadow-2xs">
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>Refer Code</span>
          </button>
          <button onClick={() => window.open(`https://wa.me/91${supportWhatsapp.replace(/\D/g, '') || '0000000000'}`, '_blank')} className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors text-slate-700 shadow-2xs">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contact Us</span>
          </button>
          <button onClick={() => window.open(telegramChannel || 'https://t.me/', '_blank')} className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors text-slate-700 shadow-2xs">
            <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>Telegram Channel</span>
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout Portal</span>
        </button>
      </div>
    </aside>
  </>
  );
};
