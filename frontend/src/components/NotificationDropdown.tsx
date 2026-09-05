import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, Package, Wallet, MessageSquare, AlertCircle, Sparkles, SlidersHorizontal, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playNotificationSound, playNewMessageSound } from '../utils/sound';
import { NotificationCenterModal } from './NotificationCenterModal';
import { realtimeClient } from '../utils/realtimeClient';

interface NotificationDropdownProps {
  onOpenProductChat?: (productId: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onOpenProductChat }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCenterOpen, setIsCenterOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?role=${user.role}&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    }

    // Subscribe to Shared SSE real-time notifications
    const unsubscribe = realtimeClient.subscribe((payload) => {
      try {
        if (
          payload.type === 'REQUEST_SUBMITTED' || 
          payload.type === 'STATUS_UPDATED' || 
          payload.type === 'PENDING_REMINDER' ||
          payload.type === 'PRODUCT_SUBMITTED' || 
          payload.type === 'WALLET_TOPPED_UP' || 
          payload.type === 'CHAT_MESSAGE_SENT' ||
          payload.type === 'SUPPORT_CHAT_MESSAGE'
        ) {
          fetchNotifications();

          // Play sound alert for admin or recipient
          const data = (payload as any).data || (payload as any).payload;
          if (user?.role === 'ADMIN' || data?.retailer?.id === user?.id || data?.userId === user?.id) {
            if (payload.type === 'CHAT_MESSAGE_SENT' || payload.type === 'SUPPORT_CHAT_MESSAGE') {
              playNewMessageSound();
            } else {
              playNotificationSound();
            }

            // Trigger System Push Notification
            if (Notification.permission === 'granted') {
              const notifTitle = data?.pushNotification?.title || data?.notification?.title || '🔔 eCyberCafe Portal Alert';
              const notifBody = data?.pushNotification?.body || data?.notification?.message || 'New update available on your portal!';
              
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(notifTitle, {
                    body: notifBody,
                    icon: '/icon.svg',
                    badge: '/icon.svg',
                    vibrate: [200, 100, 200]
                  } as any);
                });
              } else {
                new Notification(notifTitle, { body: notifBody, icon: '/icon.svg' });
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role, userId: user.id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'NEW_SUBMISSION':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'WALLET_DEDUCTION':
      case 'TOP_UP':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      case 'CHAT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'STATUS_CHANGE':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative">
      <button
        id="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Real-time Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-20px)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if ((n as any).productId && onOpenProductChat) {
                          onOpenProductChat((n as any).productId);
                          setIsOpen(false);
                        }
                      }}
                      className={`p-3.5 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.isRead ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-100 shrink-0 h-fit">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Notification Center Open Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsCenterOpen(true);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Open Full Notification Center & PWA Alerts</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NotificationCenterModal
        isOpen={isCenterOpen}
        onClose={() => setIsCenterOpen(false)}
        userRole={user?.role === 'ADMIN' ? 'ADMIN' : 'RETAILER'}
        userId={user?.id}
        onNotificationCountUpdate={() => fetchNotifications()}
      />
    </div>
  );
};
