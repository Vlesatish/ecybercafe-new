import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ShieldCheck, Volume2, Sparkles, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playNotificationSound, playNewMessageSound } from '../utils/sound';

export const NotificationPermissionPrompt: React.FC = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    // Show popup if permission is still default (not asked yet) or if user dismissed earlier
    const dismissedAt = localStorage.getItem('notif_prompt_dismissed');
    const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 3600000; // 1 hour buffer

    if (currentPerm === 'default' && !isDismissedRecently) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500); // Wait 1.5 seconds after load
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('आपका ब्राउज़र पुश नोटिफिकेशन सपोर्ट नहीं करता है।');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await Notification.requestPermission();
      setPermission(res);

      if (res === 'granted') {
        playNewMessageSound();

        // Subscribe device token to backend
        const token = `device_tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await fetch('/api/notifications/subscribe-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            role: user?.role || 'RETAILER',
            userId: user?.id || 'guest',
            userAgent: navigator.userAgent
          })
        }).catch(() => {});

        // Try triggering a native system push notification
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('🔔 eCyberCafe Push Notifications Active!', {
              body: 'बधाई हो! अब आपको सभी नए अपडेट्स, रिक्वेस्ट status और मेसेज के अलर्ट्स तुरंत मिलेंगे।',
              icon: '/icon.svg',
              badge: '/icon.svg'
            });
          } catch (swErr) {
            new Notification('🔔 eCyberCafe Push Notifications Active!', {
              body: 'बधाई हो! अब आपको सभी नए अपडेट्स, रिक्वेस्ट status और मेसेज के अलर्ट्स तुरंत मिलेंगे।',
              icon: '/icon.svg'
            });
          }
        } else {
          new Notification('🔔 eCyberCafe Push Notifications Active!', {
            body: 'बधाई हो! अब आपको सभी नए अपडेट्स और मेसेज के अलर्ट्स तुरंत मिलेंगे।',
            icon: '/icon.svg'
          });
        }

        setIsVisible(false);
        setIsSuccessToast(true);
        setTimeout(() => setIsSuccessToast(false), 5000);
      } else if (res === 'denied') {
        // Keep popup or show denied guide
      }
    } catch (e) {
      console.error('Permission error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('notif_prompt_dismissed', Date.now().toString());
  };

  return (
    <>
      {/* Floating Permission Request Modal / Popup */}
      <AnimatePresence>
        {isVisible && permission === 'default' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100"
            >
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white relative">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                    <Bell className="w-7 h-7 text-amber-300 animate-bounce" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider uppercase bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" /> Live Alert System
                    </span>
                    <h3 className="text-xl font-black text-white mt-0.5 leading-tight">
                      Allow Notifications
                    </h3>
                    <p className="text-emerald-100 text-xs font-medium">
                      सिस्टम नोटिफिकेशन ऑन करें (ध्वनि अलर्ट)
                    </p>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-4 text-slate-700">
                <p className="text-sm font-semibold leading-relaxed text-slate-800">
                  कृपया ब्राउज़र की <strong className="text-emerald-600">Notification permission allow करें</strong> ताकि आपको हर नए कार्य और मैसेज का तुरंत ऑडियो पॉप-अप मिले:
                </p>

                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700">
                      <strong>न्यू सर्विस रिक्वेस्ट व स्थिति अपडेट:</strong> रिजेक्ट या कंप्लीट होने पर तुरंत अलर्ट
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700">
                      <strong>लाइव सपोर्ट चैट मेसेज:</strong> नया संदेश आते ही स्पेशल साउंड बजना
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700">
                      <strong>वॉलेट रिचार्ज:</strong> टॉप-अप अप्रूवल अलर्ट
                    </span>
                  </div>
                </div>

                {/* Sound Test Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 font-medium">साउंड चेक करें:</span>
                  <button
                    type="button"
                    onClick={() => playNewMessageSound()}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span>Test Chime Sound</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Bell className="w-5 h-5 text-amber-300" />
                        <span>Allow Notifications (नोटिफिकेशन चालू करें)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    बाद में करें (Remind Me Later)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Mini Prompt / Button when permission is NOT granted */}
      {permission !== 'granted' && !isVisible && (
        <div className="fixed bottom-20 left-4 z-40">
          <button
            onClick={() => setIsVisible(true)}
            className="px-3.5 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 group"
            title="Enable Live Push Notifications"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <Bell className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Allow Notifications</span>
            <span className="sm:hidden">Notify</span>
          </button>
        </div>
      )}

      {/* Success Notification Toast */}
      <AnimatePresence>
        {isSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 right-5 z-50 bg-emerald-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3.5 max-w-sm"
          >
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-emerald-300">Push Notifications Activated!</h4>
              <p className="text-xs text-emerald-100 mt-0.5">
                नोटिफिकेशन सफलतापूर्वक एक्टिव कर दिए गए हैं।
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
