import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Search, X, Volume2, ShieldCheck, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { AppNotification } from '../types';
import { playNotificationSound } from '../utils/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'ADMIN' | 'RETAILER';
  userId?: string;
  onNotificationCountUpdate?: (count: number) => void;
}

export const NotificationCenterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userRole,
  userId,
  onNotificationCountUpdate
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>('default');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        role: userRole,
        ...(userId ? { userId } : {}),
        ...(searchQuery ? { query: searchQuery } : {})
      });
      const res = await fetch(`/api/notifications?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unreadCount = data.filter((n: AppNotification) => !n.isRead).length;
        if (onNotificationCountUpdate) onNotificationCountUpdate(unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, [isOpen, searchQuery, userRole, userId]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('Browser does not support desktop notifications');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        playNotificationSound();
        // Register token / device
        const token = `device_tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await fetch('/api/notifications/subscribe-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            role: userRole,
            userId: userId || 'usr_admin',
            userAgent: navigator.userAgent
          })
        });

        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('🔔 Push Notifications Activated!', {
            body: 'You will receive instant real-time request alerts on this mobile device.',
            icon: '/icon.svg',
            badge: '/icon.svg'
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userRole, userId })
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'READ') return n.isRead;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-all">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl relative">
              <Bell className="w-5 h-5 text-amber-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Notification Center</h3>
              <p className="text-[11px] text-blue-200">Live Mobile Alerts & Service Updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playNotificationSound()}
              title="Test Sound"
              className="p-2 hover:bg-white/10 rounded-xl text-amber-300 transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Mobile Push Enable Banner */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
          {pushStatus !== 'granted' && (
            <div className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-amber-950 truncate">
                  Enable Instant Mobile Push Alerts
                </span>
              </div>
              <button
                onClick={requestPushPermission}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-lg shadow-2xs cursor-pointer shrink-0"
              >
                Allow Alerts 🔔
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications, ID, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter Tabs & Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
              {(['ALL', 'UNREAD', 'READ'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filter === tab
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchNotifications}
                title="Refresh"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <Bell className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs font-bold">No notifications found</p>
              <p className="text-[11px]">New request alerts and updates will appear here instantly.</p>
            </div>
          ) : (
            filteredNotifications.map(notif => (
              <div
                key={notif.id}
                className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all space-y-1.5 ${
                  !notif.isRead
                    ? 'bg-blue-50/80 border border-blue-200 shadow-2xs'
                    : 'bg-white border border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                    )}
                    <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                      {notif.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkSingleRead(notif.id)}
                        title="Mark Read"
                        className="p-1 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      title="Delete"
                      className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                  {notif.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(notif.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {notif.requestId && (
                    <span className="text-blue-600 font-bold flex items-center gap-0.5">
                      Req #{notif.requestId.slice(-5)} <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[10px] font-extrabold text-slate-500">
          eCyberCafe Real-Time Mobile Push Notification System Active ⚡
        </div>

      </div>
    </div>
  );
};
