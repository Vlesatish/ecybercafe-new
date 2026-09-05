import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, RefreshCw, Sparkles, Lock, Store, Zap } from 'lucide-react';
import { User } from '../types';

interface LoginVerificationOverlayProps {
  user: User | null;
  isOpen: boolean;
  onComplete: () => void;
}

export const LoginVerificationOverlay: React.FC<LoginVerificationOverlayProps> = ({
  user,
  isOpen,
  onComplete
}) => {
  const [step, setStep] = useState<number>(1);
  const [progress, setProgress] = useState<number>(20);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setProgress(20);
      return;
    }

    // Step 1: टोकन एवं सुरक्षा प्रमाणीकरण (0ms - 250ms)
    const t1 = setTimeout(() => {
      setStep(2);
      setProgress(60);
    }, 250);

    // Step 2: वॉलेट बैलेंस व एक्टिव सर्विसेज लोड (250ms - 550ms)
    const t2 = setTimeout(() => {
      setStep(3);
      setProgress(90);
    }, 550);

    // Step 3: सफल सत्यापन (550ms - 800ms)
    const t3 = setTimeout(() => {
      setStep(4);
      setProgress(100);
    }, 800);

    // Final: डैशबोर्ड पर ले जाएं (1000ms)
    const t4 = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="login-verification-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-slate-900 rounded-3xl border border-blue-500/30 shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden"
        >
          {/* Glowing background highlights */}
          <div className="absolute -top-16 -left-16 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Animated Center Icon */}
          <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-400 animate-pulse opacity-70 blur-xs" />
            <div className="w-[74px] h-[74px] bg-slate-900 rounded-[14px] flex items-center justify-center relative z-10 border border-blue-400/40">
              {step < 4 ? (
                <ShieldCheck className="w-10 h-10 text-amber-400 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Title & Status */}
          <h3 className="text-lg font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{step < 4 ? 'सत्यापन प्रक्रिया चालू है...' : 'सत्यापन सफल! आपका स्वागत है'}</span>
            {step < 4 ? (
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-emerald-400" />
            )}
          </h3>

          <p className="text-xs text-slate-400 mt-1 font-medium">
            {user?.name ? (
              <span className="text-amber-300 font-semibold">{user.name} {user.storeName ? `(${user.storeName})` : ''}</span>
            ) : (
              <span>सुरक्षित सत्र (Secure Session) लोड हो रहा है...</span>
            )}
          </p>

          {/* Dynamic Step Status List */}
          <div className="mt-5 space-y-2 text-left bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2.5 text-xs">
              {step >= 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
              )}
              <span className={step >= 1 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                सुरक्षा टोकन एवं क्रेडेंशियल्स जांच
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {step >= 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
              )}
              <span className={step >= 2 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                वॉलेट बैलेंस व लाइव रेट्स लोड
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {step >= 3 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
              )}
              <span className={step >= 3 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                नागरिक सेवा पोर्टल डैशबोर्ड तैयार
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-1">
              <span>प्रोग्रेस (Verification Status)</span>
              <span className="text-amber-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 rounded-full"
                initial={{ width: '15%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
