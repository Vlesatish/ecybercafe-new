import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  User as UserIcon, 
  Store, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  Building2, 
  Sparkles,
  RefreshCw,
  MapPin,
  Gift,
  Copy,
  Check,
  Share2,
  ExternalLink
} from 'lucide-react';
import { INDIAN_STATES, BIHAR_DISTRICTS, BIHAR_BLOCKS } from '../data/locationData';

interface ProfileViewProps {
  defaultTab?: 'profile' | 'password';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ defaultTab = 'profile' }) => {
  const { user, updateProfile, allUsers, loginAs } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(defaultTab);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedState, setSelectedState] = useState(user?.state || '');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || '');
  const [selectedBlock, setSelectedBlock] = useState(user?.block || '');

  // Handle State Change
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setSelectedDistrict('');
    setSelectedBlock('');
  };

  // Handle District Change
  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setSelectedBlock('');
  };

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initializedUserIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (user && initializedUserIdRef.current !== user.id) {
      initializedUserIdRef.current = user.id;
      setName(user.name || '');
      setStoreName(user.storeName || '');
      setMobileNumber(user.mobileNumber || '');
      setEmail(user.email || '');
      setSelectedState(user.state || '');
      setSelectedDistrict(user.district || '');
      setSelectedBlock(user.block || '');
    }
  }, [user]);

  // Function to re-sync form with server profile
  const handleResetForm = () => {
    if (user) {
      setName(user.name || '');
      setStoreName(user.storeName || '');
      setMobileNumber(user.mobileNumber || '');
      setEmail(user.email || '');
      setSelectedState(user.state || '');
      setSelectedDistrict(user.district || '');
      setSelectedBlock(user.block || '');
      setStatusMsg({ type: 'success', text: 'Reset form fields to saved profile.' });
    }
  };

  if (!user) return null;

  // Handle Profile Update Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'Name cannot be left empty.' });
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid 10-digit Mobile Number.' });
      return;
    }
    if (selectedState === 'Bihar') {
      if (!selectedDistrict) {
        setStatusMsg({ type: 'error', text: 'Please select your Bihar District / जिला चुनें.' });
        return;
      }
      if (!selectedBlock) {
        setStatusMsg({ type: 'error', text: 'Please select your Block / ब्लॉक चुनें.' });
        return;
      }
    }

    setIsLoading(true);
    const result = await updateProfile({
      name: name.trim(),
      storeName: storeName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim(),
      state: selectedState,
      district: selectedState === 'Bihar' ? selectedDistrict : '',
      block: selectedState === 'Bihar' ? selectedBlock : '',
    });
    setIsLoading(false);

    if (result.success) {
      setStatusMsg({ type: 'success', text: 'Profile details updated successfully! Cyber Cafe profile is active.' });
    } else {
      setStatusMsg({ type: 'error', text: result.error || 'Failed to update profile details.' });
    }
  };

  // Handle Password Change Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!currentPassword) {
      setStatusMsg({ type: 'error', text: 'Please enter your Current Password.' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New Password and Confirm Password do not match!' });
      return;
    }

    setIsLoading(true);
    const result = await updateProfile({
      currentPassword,
      newPassword,
    });
    setIsLoading(false);

    if (result.success) {
      setStatusMsg({ type: 'success', text: '🔒 Password changed successfully! Please use your new password for future logins.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setStatusMsg({ type: 'error', text: result.error || 'Password update failed. Please check your current password.' });
    }
  };

  // Copy Referral States
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const refCode = user?.referralCode || `REF${user?.mobileNumber || user?.id || '123'}`;
  const refUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${refCode}` : `https://ecybercafe.in/?ref=${refCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(refUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🎉 *Join eCyberCafe Retailer Portal!* 🎉\n\nHello! Sign up as a Cyber Cafe Retailer using my Live Referral Code *${refCode}* and access all Bihar & National E-Governance services instantly!\n\n👉 *Click to Register:* ${refUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="relative shrink-0">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-slate-900" title="Verified Retailer">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {user.role} ACCOUNT
              </span>
              <span className="text-xs text-slate-400">ID: <span className="font-mono text-slate-200">{user.id}</span></span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {user.name}
            </h2>
            <p className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              {user.storeName || 'Cyber Cafe Portal'}
            </p>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="z-10 flex items-center bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 shrink-0 self-stretch sm:self-auto">
          <button
            onClick={() => { setActiveTab('profile'); setStatusMsg(null); }}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => { setActiveTab('password'); setStatusMsg(null); }}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* Global Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PROFILE DETAILS FORM */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Live Referral Code & Sharing Card */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-700 text-white rounded-3xl p-6 shadow-md border border-amber-300/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10 relative">
              <div className="space-y-2 max-w-md">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs border border-white/30 inline-flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-200" />
                  LIVE REFERRAL CODE & LINK (रेफरल प्रोग्राम)
                </span>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Refer Retailers & Earn ₹100 Bonus!
                </h3>
                <p className="text-xs text-amber-100 font-medium leading-relaxed">
                  Share your referral code or direct link with other Cyber Cafe owners. Earn ₹100 instant bonus for every retailer who registers!
                </p>
              </div>

              {/* Referral Actions Box */}
              <div className="w-full md:w-auto bg-slate-950/40 backdrop-blur-md rounded-2xl p-4 border border-white/20 space-y-3 min-w-[280px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-extrabold uppercase text-amber-300">YOUR REFERRAL CODE</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'COPIED!' : 'COPY CODE'}</span>
                  </button>
                </div>

                <div className="bg-slate-900/90 border border-slate-700 px-3.5 py-2 rounded-xl text-center font-mono text-base font-black text-amber-300 tracking-wider">
                  {refCode}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-xs rounded-xl border border-white/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 text-amber-300" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-600" />
                Cyber Cafe & Retailer Information
              </h3>
              <p className="text-xs text-slate-500">Update your store name, mobile number, name and email credentials</p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
              Active Account
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Retailer Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                Retailer Name / नाम <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name (e.g. Pankaj Kumar)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* 2. Cyber Cafe Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                Cyber Cafe ka Naam (Store Name) / दुकान का नाम <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Pankaj Digital Cyber Cafe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* 3. Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Mobile Number / मोबाइल नंबर (For Login) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-Digit Mobile Number"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* 4. Email ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                Email ID / ईमेल पता
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. pankaj@citizenservice.in"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* 5. Select State */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Select State / राज्य चुनें
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="">-- Select State / राज्य चुनें --</option>
                {INDIAN_STATES.map((st: string) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Bihar Location Card (Smooth Expand/Collapse Animation) */}
          <AnimatePresence>
            {selectedState === 'Bihar' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60">
                    <MapPin className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-black text-amber-900">
                      Bihar Location Details / बिहार स्थान विवरण
                    </span>
                    <span className="ml-auto text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Required for Bihar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* District Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                        Select District / जिला चुनें <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required={selectedState === 'Bihar'}
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-amber-300/80 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Select District / जिला चुनें --</option>
                        {BIHAR_DISTRICTS.map((dist: string) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Block Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                        Select Block / ब्लॉक चुनें <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required={selectedState === 'Bihar'}
                        value={selectedBlock}
                        onChange={(e) => setSelectedBlock(e.target.value)}
                        disabled={!selectedDistrict}
                        className="w-full px-4 py-2.5 bg-white border border-amber-300/80 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {selectedDistrict ? '-- Select Block / ब्लॉक चुनें --' : 'First Select District'}
                        </option>
                        {selectedDistrict &&
                          (BIHAR_BLOCKS[selectedDistrict] || []).map((blk: string) => (
                            <option key={blk} value={blk}>
                              {blk}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location Badges (State, District, Block) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-600" />
              <span>Registered Retailer Location:</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-900 font-extrabold text-xs rounded-xl border border-blue-200">
                State: {selectedState || user.state || 'Not set'}
              </span>
              {selectedState === 'Bihar' && selectedDistrict && (
                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-200">
                  District: {selectedDistrict}
                </span>
              )}
              {selectedState === 'Bihar' && selectedBlock && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-xl border border-emerald-200">
                  Block: {selectedBlock}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              ⚡ Changes reflect instantly across all your citizen service receipts & wallet transactions.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>Save Cyber Cafe Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      )}

      {/* TAB 2: CHANGE PASSWORD FORM */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Change Password / नया पासवर्ड बनाएं
              </h3>
              <p className="text-xs text-slate-500">Secure your Retailer Cyber Cafe portal account with a strong password</p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              256-Bit SSL Encrypted
            </span>
          </div>

          <div className="space-y-5 max-w-xl">
            {/* 1. Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Current Password / पुराना पासवर्ड <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">(Default: 123456)</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 2. New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                New Password / नया पासवर्ड <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Confirm New Password / नया पासवर्ड दोबारा दर्ज करें <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 font-medium">
              🔑 After updating, use your Mobile Number and new password to log in.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
