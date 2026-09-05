import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, X, Send, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';
import { safeJson } from '../utils/api';

interface WhatsAppWidgetProps {
  onOpenSupportChat?: () => void;
}

export const WhatsAppWidget: React.FC<WhatsAppWidgetProps> = ({ onOpenSupportChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [supportWhatsapp, setSupportWhatsapp] = useState('0000000000');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => safeJson(res))
      .then((data) => {
        if (data && data.supportWhatsapp) {
          setSupportWhatsapp(data.supportWhatsapp);
        }
      })
      .catch((err) => console.error('Error loading support settings:', err));
  }, []);

  const handleWhatsAppRedirect = (query: string = '') => {
    const text = encodeURIComponent(`Hello Citizen Service Support! I need help with: ${query}`);
    const cleanNum = supportWhatsapp.replace(/\D/g, '') || '0000000000';
    window.open(`https://wa.me/91${cleanNum}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed bottom-16 sm:bottom-20 lg:bottom-6 right-3 sm:right-5 z-40 flex flex-col items-end">
      {/* Expanded Quick Support Chat Panel */}
      {isOpen && (
        <div className="mb-3 w-80 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-white overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-black text-xs text-white">Support & Helpline Desk</h4>
                <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                  Online • Avg reply 2 mins
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Support Topics */}
          <div className="p-4 space-y-3 text-xs">
            <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 text-slate-300">
              👋 Namaste! How can we help your Cyber Cafe / Retailer account today?
            </div>

            {onOpenSupportChat && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSupportChat();
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 font-extrabold rounded-xl text-white flex items-center justify-between shadow-md transition-all active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-300" />
                  <span>💬 Open In-App Support Chat</span>
                </div>
                <span className="text-amber-300 text-xs">GO →</span>
              </button>
            )}

            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Quick Direct Links</p>
              
              <button
                onClick={() => handleWhatsAppRedirect('Wallet Recharge & Topup Issue')}
                className="w-full text-left p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl font-medium text-slate-200 transition-colors flex items-center justify-between"
              >
                <span>💳 Wallet Top-Up Support</span>
                <span className="text-emerald-400 font-bold">→</span>
              </button>

              <button
                onClick={() => handleWhatsAppRedirect('Request Processing Status Check')}
                className="w-full text-left p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl font-medium text-slate-200 transition-colors flex items-center justify-between"
              >
                <span>🎯 Pending Service Request Check</span>
                <span className="text-emerald-400 font-bold">→</span>
              </button>

              <button
                onClick={() => handleWhatsAppRedirect('Request New Service Addition')}
                className="w-full text-left p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl font-medium text-slate-200 transition-colors flex items-center justify-between"
              >
                <span>🚀 Service Price & Commission Help</span>
                <span className="text-emerald-400 font-bold">→</span>
              </button>
            </div>

            <button
              onClick={() => handleWhatsAppRedirect('General Enquiry')}
              className="w-full py-2 bg-emerald-600/90 hover:bg-emerald-500 font-bold rounded-xl text-white flex items-center justify-center gap-2 transition-colors text-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              Open Live WhatsApp Chat
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all ring-4 ring-emerald-500/20 group"
        title="Contact WhatsApp Support"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        )}
      </button>
    </div>
  );
};
