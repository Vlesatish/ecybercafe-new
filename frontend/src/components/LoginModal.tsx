import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { 
  Shield, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Store, 
  Mail, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  X,
  MapPin,
  Building2,
  Gift,
  ArrowRight,
  Wallet,
  Check,
  ShieldCheck
} from 'lucide-react';
import { INDIAN_STATES, BIHAR_DISTRICTS, BIHAR_BLOCKS } from '../data/locationData';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'SIGNUP';
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, initialMode = 'LOGIN' }) => {
  const { loginWithMobileAndPassword, signupRetailer, user } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>(initialMode);
  const [signupBonus, setSignupBonus] = useState<number>(200);
  const [enableSignupBonus, setEnableSignupBonus] = useState<boolean>(true);
  const [enableDistributorReg, setEnableDistributorReg] = useState<boolean>(true);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>('9876543210');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => safeJson(res))
      .then((data) => {
        if (data) {
          setSignupBonus(data.signupBonus ?? 200);
          setEnableSignupBonus(data.enableSignupBonus ?? true);
          setEnableDistributorReg(data.enableDistributorRegistration ?? true);
          if (data.supportWhatsapp) {
            setSupportWhatsapp(data.supportWhatsapp);
          }
          if (data.enableDistributorRegistration === false) {
            setSelectedRole('RETAILER');
          }
        }
      })
      .catch(() => {});
  }, []);

  // Form State
  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup Form State
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'RETAILER' | 'DISTRIBUTOR'>('RETAILER');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setSelectedState('');
      setSelectedDistrict('');
      setSelectedBlock('');

      // Auto-extract referral code from URL if present
      try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref') || params.get('referral') || params.get('refCode');
        if (ref) {
          setReferralCode(ref.trim().toUpperCase());
          if (initialMode !== 'SIGNUP') {
            setMode('SIGNUP');
          }
        }
      } catch (e) {}
    }
  }, [isOpen, initialMode]);

  // Handle Location Selects
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setSelectedDistrict('');
    setSelectedBlock('');
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setSelectedBlock('');
  };

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!mobileOrEmail.trim()) {
      setErrorMsg('Please enter your registered Mobile Number or Email ID.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithMobileAndPassword(mobileOrEmail.trim(), loginPassword);
      if (result.success) {
        window.dispatchEvent(new CustomEvent('login_verification_start'));
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg(result.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Login error.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter Retailer Name.');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit Mobile Number.');
      return;
    }
    if (!selectedState) {
      setErrorMsg('Please select your State / राज्य चुनें.');
      return;
    }
    if (selectedState === 'Bihar') {
      if (!selectedDistrict) {
        setErrorMsg('Please select your Bihar District / जिला चुनें.');
        return;
      }
      if (!selectedBlock) {
        setErrorMsg('Please select your Block / ब्लॉक चुनें.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await signupRetailer(
        name.trim(),
        storeName.trim() || `${name}'s Cyber Cafe`,
        email.trim(),
        mobileNumber.trim(),
        signupPassword.trim() || '123456',
        selectedState,
        selectedState === 'Bihar' ? selectedDistrict : '',
        selectedState === 'Bihar' ? selectedBlock : '',
        referralCode.trim(),
        selectedRole
      );
      if (result.success) {
        window.dispatchEvent(new CustomEvent('login_verification_start'));
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg(result.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Signup error.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden relative my-6"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 p-2 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-xs"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Decorative Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-black text-white tracking-tight">Citizen Service Secure Login</h2>
                <p className="text-[10px] text-amber-300 font-bold">Cyber Cafe Retailer & Distributor Portal</p>
              </div>
            </div>

                {/* Tab Switcher */}
                <div className="mt-4 flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80 relative">
                  <button
                    type="button"
                    onClick={() => { setMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative z-10 ${
                      mode === 'LOGIN'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login (लॉग इन)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('SIGNUP'); setErrorMsg(''); setSuccessMsg(''); }}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative z-10 ${
                      mode === 'SIGNUP'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register (नया खाता)</span>
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-4">
                {/* Alerts */}
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-2xs"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}

                {/* MODE 1: LOGIN WITH MOBILE & PASSWORD */}
                {mode === 'LOGIN' && (
                  <motion.form 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLoginSubmit} 
                    className="space-y-4"
                  >
                    {/* Mobile Number or Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        Mobile Number / Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={mobileOrEmail}
                        onChange={(e) => setMobileOrEmail(e.target.value)}
                        placeholder="Enter 10-digit Mobile or Email"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                      />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          Password / पासवर्ड <span className="text-rose-500">*</span>
                        </label>
                        <a
                          href={`https://wa.me/${supportWhatsapp ? supportWhatsapp.replace(/\D/g, '') : '919876543210'}?text=${encodeURIComponent('Hello Admin, I forgot my password for eCyberCafe portal. Please help me recover my account. (नमस्ते एडमिन, मैं अपना पासवर्ड भूल गया हूँ, कृपया पासवर्ड रिकवर करने में मदद करें।)')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                          title="Contact Admin on WhatsApp for password recovery"
                        >
                          💬 Forgot? (पासवर्ड भूल गए?)
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter password (default: 123456)"
                          className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Log In to Cyber Cafe Portal</span>
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* MODE 2: SIGNUP / NEW ACCOUNT */}
                {mode === 'SIGNUP' && (
                  <motion.form 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSignupSubmit} 
                    className="space-y-3"
                  >
                    {/* Account Type Selection (Retailer vs Distributor) */}
                    {enableDistributorReg && (
                      <div className="space-y-1.5 pb-1">
                        <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                          <span>Select Account Type / खाता प्रकार लें *</span>
                          <span className="text-[10px] text-indigo-700 font-extrabold uppercase">
                            {selectedRole === 'DISTRIBUTOR' ? '⭐ Distributor ID' : '✓ Retailer ID'}
                          </span>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Option 1: Retailer */}
                          <button
                            type="button"
                            onClick={() => setSelectedRole('RETAILER')}
                            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                              selectedRole === 'RETAILER'
                                ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs font-black uppercase ${selectedRole === 'RETAILER' ? 'text-indigo-900' : 'text-slate-700'}`}>
                                Retailer (रिटेलर)
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                FREE
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-tight">
                              CSC Cyber Cafe Services{enableSignupBonus && signupBonus > 0 ? ` + ₹${signupBonus} Bonus` : ''}
                            </p>
                          </button>

                          {/* Option 2: Distributor */}
                          <button
                            type="button"
                            onClick={() => setSelectedRole('DISTRIBUTOR')}
                            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                              selectedRole === 'DISTRIBUTOR'
                                ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-indigo-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs font-black uppercase ${selectedRole === 'DISTRIBUTOR' ? 'text-amber-900' : 'text-slate-700'}`}>
                                Distributor (डिस्ट्रिब्यूटर)
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                                ⭐ PRO ID
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-900/90 font-bold leading-tight">
                              Create Unlimited Retailers + ₹100 Comm.
                            </p>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">Full Name / नाम *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Pankaj Kumar"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">Cyber Cafe ka Naam (Store Name)</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Pankaj Digital Cafe"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">Mobile Number (Login ID) *</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-Digit Mobile Number"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">Email ID (Optional)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. cafe@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Select State (All India) */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        Select State / राज्य चुनें *
                      </label>
                      <select
                        value={selectedState}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      >
                        <option value="">Select State / राज्य चुनें</option>
                        {INDIAN_STATES.map((st: string) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Show District and Block ONLY if Bihar is chosen */}
                    <AnimatePresence>
                      {selectedState === 'Bihar' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl shadow-xs space-y-2.5 my-1">
                            <div className="flex items-center gap-1.5 text-amber-900 border-b border-amber-200/60 pb-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="text-xs font-black uppercase tracking-wide">
                                Bihar Location Details
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Bihar District */}
                              <div className="space-y-1">
                                <label className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-amber-600" />
                                  District / जिला *
                                </label>
                                <select
                                  value={selectedDistrict}
                                  onChange={(e) => handleDistrictChange(e.target.value)}
                                  className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                                >
                                  <option value="">Select District / जिला चुनें</option>
                                  {BIHAR_DISTRICTS.map((dist: string) => (
                                    <option key={dist} value={dist}>
                                      {dist}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Bihar Block */}
                              <div className="space-y-1">
                                <label className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-amber-600" />
                                  Block / ब्लॉक *
                                </label>
                                <select
                                  value={selectedBlock}
                                  onChange={(e) => setSelectedBlock(e.target.value)}
                                  disabled={!selectedDistrict}
                                  className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                                >
                                  <option value="">
                                    {selectedDistrict ? 'Select Block / ब्लॉक चुनें' : 'Select District First'}
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

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">Set Password / पासवर्ड *</label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Create a password"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registering {selectedRole === 'DISTRIBUTOR' ? 'Distributor' : 'Retailer'} Account...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>
                            {selectedRole === 'DISTRIBUTOR'
                              ? 'Create Distributor Account (डिस्ट्रिब्यूटर खाता बनाएं)'
                              : `Create Retailer Account${enableSignupBonus && signupBonus > 0 ? ` (+₹${signupBonus} Bonus)` : ''}`}
                          </span>
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
