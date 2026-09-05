import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { playNewMessageSound } from '../utils/sound';
import { AdminSupportChatManager } from './AdminSupportChatManager';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  ShieldCheck, 
  CheckCheck, 
  Phone, 
  MessageCircle, 
  Clock, 
  HelpCircle,
  Headphones,
  Zap,
  ArrowRight,
  X,
  Paperclip,
  Plus,
  Smile,
  Download,
  Maximize2,
  Bot
} from 'lucide-react';
import { uploadFileToServer } from '../utils/upload';
import { realtimeClient } from '../utils/realtimeClient';

interface SupportChatMessage {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderRole: 'RETAILER' | 'ADMIN' | 'SYSTEM';
  text: string;
  attachmentUrl?: string;
  createdAt: string;
}

export const SupportChatPageView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState('0000000000');
  const [supportHelpline, setSupportHelpline] = useState('0000000000');
  const [telegramChannel, setTelegramChannel] = useState('https://t.me/eCyberCafeOfficial');

  const quickEmojis = ['👍', '🙏', '✅', '📄', '❌', '💰', '⚡', '😊', '🆗', '🎉'];

  const defaultSupportQuickTemplates = [
    'server down hai',
    'finger lagao',
    'otp bhejo',
    'document complete',
    'payment check karo',
    '⚡ Urgent Help Needed'
  ];

  const [quickReplyTemplates, setQuickReplyTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('support_page_quick_chats');
      return saved ? JSON.parse(saved) : defaultSupportQuickTemplates;
    } catch {
      return defaultSupportQuickTemplates;
    }
  });

  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newTemplateText, setNewTemplateText] = useState('');

  const handleAddCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateText.trim()) return;
    const updated = [...quickReplyTemplates, newTemplateText.trim()];
    setQuickReplyTemplates(updated);
    try {
      localStorage.setItem('support_page_quick_chats', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save support templates:', e);
    }
    setNewTemplateText('');
    setShowAddTemplateModal(false);
  };

  const handleDeleteTemplate = (idxToRemove: number) => {
    const updated = quickReplyTemplates.filter((_, idx) => idx !== idxToRemove);
    setQuickReplyTemplates(updated);
    try {
      localStorage.setItem('support_page_quick_chats', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update support templates:', e);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => safeJson(res))
      .then((data) => {
        if (!data) return;
        if (data.supportWhatsapp) setSupportWhatsapp(data.supportWhatsapp);
        if (data.supportHelpline) setSupportHelpline(data.supportHelpline);
        if (data.telegramChannel) setTelegramChannel(data.telegramChannel);
      })
      .catch((e) => console.error('Error loading support settings:', e));
  }, []);

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/support-chat?userId=${user.id}`);
      if (res.ok) {
        const data = await safeJson(res, []);
        // Filter out any past automated AI assistant messages
        const cleanMsgs = Array.isArray(data) 
          ? data.filter((m: any) => m.senderName !== 'Helpdesk AI Assistant' && !m.text?.includes('Thank you for reaching out!'))
          : [];
        setMessages(cleanMsgs);
      }
    } catch (e) {
      console.error('Error fetching support chat:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages();

      const unsubscribe = realtimeClient.subscribe((payload) => {
        try {
          if (payload.type === 'SUPPORT_CHAT_MESSAGE') {
            const data = (payload as any).data || (payload as any).payload;
            if (data?.userId === user.id && data?.senderRole !== user.role) {
              playNewMessageSound();
            }
            fetchMessages();
          }
        } catch (e) {
          console.error(e);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (customText?: string, customAttachmentUrl?: string) => {
    const textToSend = customText !== undefined ? customText : inputText;
    if ((!textToSend.trim() && !customAttachmentUrl) || isSending || !user) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          text: textToSend.trim() || '📷 Document Attachment',
          attachmentUrl: customAttachmentUrl || undefined,
        }),
      });

      if (res.ok) {
        if (customText === undefined) setInputText('');
        fetchMessages();
      }
    } catch (e) {
      console.error('Error sending support chat:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleAutoSendImage = async (file: File) => {
    try {
      setIsSending(true);
      const uploaded = await uploadFileToServer(file);
      await handleSendMessage(inputText.trim() || '📷 Image Attachment', uploaded.url);
    } catch (err: any) {
      alert(`Image upload failed: ${err.message || 'Error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/') || item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await handleAutoSendImage(file);
          break;
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      await handleAutoSendImage(file);
    }
  };

  const handleWhatsAppRedirect = (query: string = '') => {
    const text = encodeURIComponent(`Hello Citizen Service Support! I need assistance with: ${query}`);
    const cleanNum = supportWhatsapp.replace(/\D/g, '') || '0000000000';
    window.open(`https://wa.me/91${cleanNum}?text=${text}`, '_blank');
  };

  if (!user) return null;

  if (user.role === 'ADMIN') {
    return <AdminSupportChatManager />;
  }

  return (
    <div className="space-y-4 pb-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="bg-[#075E54] border border-emerald-600 rounded-2xl p-3.5 sm:p-4 text-white relative overflow-hidden shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center border border-emerald-300/40 shrink-0 shadow-md">
            <MessageSquare className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                WhatsApp Live Helpdesk (रिटेलर हेल्पडेस्क)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-400 text-slate-950 shadow-xs">
                ⚡ LIVE 24x7
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 font-medium">
              Instant assistance for application status, rates & wallet recharges
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => handleWhatsAppRedirect('General Help')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs border border-emerald-400 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md"
          >
            <Phone className="w-3.5 h-3.5 fill-white" />
            <span>WhatsApp Direct</span>
          </button>
        </div>
      </div>

      {/* Main Grid: WhatsApp Chat Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Box Container */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[580px]">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-[#075E54] text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-ping" />
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  Portal Admin & Support Desk
                </h4>
                <p className="text-[10px] text-emerald-100 font-medium">Online 24x7 • Pankaj Digital Cafe (Amas, Gaya)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchMessages}
                className="text-[11px] font-extrabold text-white hover:bg-emerald-700/80 px-2.5 py-1 rounded-lg bg-emerald-800/80 border border-emerald-400/30 transition-all cursor-pointer shadow-xs"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Messages Scroll Area - Clean WhatsApp Wallpaper Background */}
          <div 
            ref={messagesContainerRef} 
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#efeae2]"
          >
            {/* Quick Helper Banner */}
            <div className="p-3 bg-white/95 border border-emerald-300/80 rounded-2xl text-xs space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Quick Assistance Topics (त्वरित प्रश्न)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleWhatsAppRedirect('Direct Support Request')}
                  className="sm:hidden text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" /> WhatsApp
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleSendMessage('Where is my application PDF document?')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-extrabold text-slate-800 transition-colors cursor-pointer"
                >
                  📄 Application PDF Status
                </button>
                <button
                  onClick={() => handleSendMessage('Wallet topup & UTR verification help')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-extrabold text-slate-800 transition-colors cursor-pointer"
                >
                  💳 Wallet Topup Help
                </button>
                <button
                  onClick={() => handleSendMessage('Requesting urgent process approval for pending request')}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-[10px] font-extrabold text-amber-900 transition-colors cursor-pointer"
                >
                  ⚡ Urgent Approval
                </button>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Bot className="w-12 h-12 text-emerald-600 mx-auto opacity-70 animate-bounce" />
                <p className="text-sm font-bold text-slate-700">No support messages yet.</p>
                <p className="text-xs text-slate-500">Type your question below, paste a screenshot (Ctrl+V), or select a quick reply.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user.id;
                const isSystem = msg.senderRole === 'SYSTEM';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 px-1">
                      <span className="text-[10px] font-extrabold text-slate-600">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs shadow-xs space-y-1.5 ${
                        isMe
                          ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none border border-emerald-300/80'
                          : isSystem
                          ? 'bg-amber-100 border border-amber-300 text-amber-950 rounded-tl-none font-bold'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>

                      {msg.attachmentUrl && (
                        <div className="pt-1 group relative">
                          <img
                            src={msg.attachmentUrl}
                            alt="Attachment"
                            onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                            className="max-h-56 rounded-xl object-contain border border-black/10 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 text-[9px] opacity-75 pt-0.5 font-bold">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Chat Shortcuts & Input Bar */}
          <div className="px-3 py-2.5 bg-[#f0f2f5] border-t border-slate-200 space-y-2 shrink-0">
            {/* Quick Text Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-black text-emerald-800 shrink-0 mr-1 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                <Sparkles className="w-3 h-3 text-emerald-700" /> Quick Replies:
              </span>

              <button
                type="button"
                onClick={() => setShowAddTemplateModal(true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-xl cursor-pointer shrink-0 flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                title="Add custom quick reply"
              >
                <Plus className="w-3 h-3" />
                <span>+ Custom Quick Reply</span>
              </button>

              {quickReplyTemplates.map((tmpl, idx) => (
                <div key={idx} className="inline-flex items-center group shrink-0 bg-emerald-700 rounded-xl overflow-hidden shadow-xs border border-emerald-600">
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleSendMessage(tmpl)}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-extrabold text-[11px] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
                    title="Click to instantly send"
                  >
                    <span>{tmpl}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(idx)}
                    className="px-2 py-1 bg-teal-900 hover:bg-rose-600 text-teal-100 hover:text-white text-[10px] cursor-pointer transition-colors border-l border-teal-600 flex items-center justify-center shrink-0"
                    title="Delete custom template"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Emoji Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[10px] font-extrabold text-slate-600 shrink-0 mr-1 flex items-center gap-1">
                <Smile className="w-3 h-3 text-amber-500" /> Emojis:
              </span>
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs transition-transform hover:scale-110 cursor-pointer shrink-0 font-extrabold text-slate-800 shadow-2xs"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input Form Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-1"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Ask support question or paste screenshot (Ctrl+V)..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium shadow-2xs"
                />
              </div>

              {/* Upload Image Button with Auto-Send */}
              <label
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl cursor-pointer transition-colors shrink-0 shadow-2xs flex items-center gap-1.5 font-bold text-xs"
                title="Select image to auto send"
              >
                <Paperclip className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline text-emerald-900">Photo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleAutoSendImage(file);
                    }
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="px-4 py-2.5 bg-[#075E54] hover:bg-[#128C7E] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Sidebar Topics & Helpline */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Quick Support Topics</span>
            </h3>

            <div className="space-y-2">
              {[
                { title: 'Urgent Application Approval', desc: 'Ask operator to fast-track your pending pass', color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/60 text-emerald-900' },
                { title: 'Wallet Top-up Verification', desc: 'Send UTR / Payment screenshot link', color: 'border-blue-200 hover:border-blue-400 bg-blue-50/60 text-blue-900' },
                { title: 'Correction & Re-application', desc: 'Free re-upload for rejected requests', color: 'border-amber-200 hover:border-amber-400 bg-amber-50/60 text-amber-900' },
                { title: 'Custom Certificate Service', desc: 'Request unlisted state citizen services', color: 'border-slate-200 hover:border-slate-400 bg-slate-50/80 text-slate-800' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendMessage(`Help with: ${item.title}`)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer group shadow-2xs ${item.color}`}
                >
                  <p className="text-xs font-black">{item.title}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Official Portal Helpline</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Pankaj Digital Cafe, Amas Gaya (Bihar). Operator desk handles all citizen applications directly.
            </p>
            <div className="pt-1 flex flex-col gap-1.5 text-[11px] font-mono font-bold">
              <div className="text-emerald-800 font-extrabold">📞 Call: +91 {supportHelpline}</div>
              <button
                type="button"
                onClick={() => window.open(telegramChannel || 'https://t.me/', '_blank')}
                className="text-sky-600 hover:text-sky-700 underline flex items-center gap-1 cursor-pointer font-sans text-xs"
              >
                <span>✈️ Official Telegram Channel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal to Add Custom Quick Reply Template */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Add Custom Support Quick Reply</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomTemplate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Quick Message Text / संदेश (e.g. server down hai):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. finger lagao / server down hai"
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Save Quick Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/90 z-70 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged Attachment"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
            />
            <a
              href={lightboxImage}
              download="support_chat_attachment"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Attachment Image</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

