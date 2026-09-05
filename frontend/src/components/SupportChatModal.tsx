import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeJson } from '../utils/api';
import { Send, X, MessageSquare, Phone, Image as ImageIcon, Sparkles, Bot, CheckCheck, Paperclip, Plus, Smile, Download, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState('0000000000');

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
      const saved = localStorage.getItem('support_custom_quick_chats');
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
      localStorage.setItem('support_custom_quick_chats', JSON.stringify(updated));
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
      localStorage.setItem('support_custom_quick_chats', JSON.stringify(updated));
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
      })
      .catch((e) => console.error('Error loading settings:', e));
  }, []);

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/support-chat?userId=${user.id}`);
      if (res.ok) {
        const data = await safeJson(res, []);
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
    if (isOpen && user) {
      fetchMessages();

      const unsubscribe = realtimeClient.subscribe((payload) => {
        try {
          if (payload.type === 'SUPPORT_CHAT_MESSAGE') {
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
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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

  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[680px] max-h-[92vh] text-slate-900"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#075E54] text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700/80 flex items-center justify-center border border-emerald-400/30 text-white font-bold shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 truncate">
                  <span>WhatsApp Live Helpdesk</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </h3>
                <p className="text-[11px] text-emerald-100 font-medium truncate">Online 24x7 • Instant Response & Auto Sync</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleWhatsAppRedirect('Support Helpdesk Inquiry')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Open WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Direct</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div
            ref={messagesContainerRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]"
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
                  onClick={() => handleSendMessage('Block Rate Details & Unconfigured Fallback Prices')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-extrabold text-slate-800 transition-colors cursor-pointer"
                >
                  📍 Block Rates Details
                </button>
                <button
                  onClick={() => handleSendMessage('How to Top-Up Wallet Balance via UPI')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-extrabold text-slate-800 transition-colors cursor-pointer"
                >
                  💳 Wallet Recharge Guide
                </button>
                <button
                  onClick={() => handleSendMessage('Requesting urgent support regarding pending application')}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-[10px] font-extrabold text-amber-900 transition-colors cursor-pointer"
                >
                  ⏱️ Application Status Inquiry
                </button>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Bot className="w-12 h-12 text-emerald-600 mx-auto opacity-70 animate-bounce" />
                <p className="text-sm font-bold text-slate-700">No support messages yet.</p>
                <p className="text-xs text-slate-500">Type your question below or click a quick reply shortcut.</p>
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

          {/* Quick Chat Shortcuts Bar */}
          <div className="px-3 py-2.5 bg-[#f0f2f5] border-t border-slate-200 space-y-2">
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
        </motion.div>

        {/* Modal to Add Custom Quick Reply Template */}
        <AnimatePresence>
          {showAddTemplateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white"
              >
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
    </AnimatePresence>
  );
};
