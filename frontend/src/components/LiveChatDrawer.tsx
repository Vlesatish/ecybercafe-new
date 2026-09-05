import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ServiceRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { uploadFileToServer } from '../utils/upload';
import { playNewMessageSound } from '../utils/sound';
import { realtimeClient } from '../utils/realtimeClient';
import { Send, X, Image as ImageIcon, MessageSquare, FileText, Download, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveChatDrawerProps {
  request: ServiceRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const ADMIN_CANNED_RESPONSES = [
  'Request received. Verification in progress.',
  'Generating PDF document from official portal now.',
  'Request completed. Please download certificate attached below.',
  'Rejected due to invalid details. Fee refunded to wallet.',
];

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({ request, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const scrollToContainerBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setShowScrollDownBtn(false);
      setHasUnreadBelow(false);
    }
  };

  const handleContainerScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isNearBottom) {
      setShowScrollDownBtn(false);
      setHasUnreadBelow(false);
    } else {
      setShowScrollDownBtn(true);
    }
  };

  const fetchMessages = async () => {
    if (!request) return;
    try {
      const res = await fetch(`/api/chat/${request.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && request) {
      fetchMessages();

      const unsubscribe = realtimeClient.subscribe((payload) => {
        try {
          if (payload.type === 'CHAT_MESSAGE_SENT' && (payload as any).requestId === request.id) {
            fetchMessages();
          }
        } catch (e) {
          console.error(e);
        }
      });

      return () => {
        unsubscribe();
      };
    } else {
      prevMsgCountRef.current = 0;
    }
  }, [isOpen, request]);

  useEffect(() => {
    if (!isOpen || !chatContainerRef.current) return;

    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    const isNewMessageAdded = messages.length > prevMsgCountRef.current;
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    
    prevMsgCountRef.current = messages.length;

    if (isInitialLoad) {
      setTimeout(() => scrollToContainerBottom(false), 50);
    } else if (isNewMessageAdded) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== user?.id) {
        playNewMessageSound();
      }
      if (isNearBottom) {
        scrollToContainerBottom(true);
      } else {
        setShowScrollDownBtn(true);
        setHasUnreadBelow(true);
      }
    }
  }, [messages, isOpen]);

  if (!isOpen || !request || !user) return null;

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/') || item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const uploaded = await uploadFileToServer(file);
            setAttachmentUrl(uploaded.url);
            setShowAttachInput(true);
          } catch (err: any) {
            alert(`File upload failed: ${err.message || 'Error'}`);
          }
          break;
        }
      }
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const msgToSend = customText || text;
    if (!msgToSend.trim() && !attachmentUrl.trim()) return;

    setIsSending(true);

    try {
      const res = await fetch(`/api/chat/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.role === 'ADMIN' ? 'Portal Admin' : user.name,
          senderRole: user.role,
          text: msgToSend,
          attachmentUrl: attachmentUrl.trim() || undefined,
        }),
      });

      if (res.ok) {
        setText('');
        setAttachmentUrl('');
        setShowAttachInput(false);
        await fetchMessages();
        setTimeout(() => scrollToContainerBottom(true), 80);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col text-slate-900"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                #{request.requestNumber}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold truncate">{request.serviceTitle}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    {request.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  Retailer: {request.retailerName} • Fee: ₹{request.price.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner */}
          <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-bold">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              Direct Service Chat & File Exchange
            </span>
            <span>Fee Paid: ₹{request.price.toFixed(2)}</span>
          </div>

          {/* Messages Feed */}
          <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
            <div 
              ref={chatContainerRef}
              onScroll={handleContainerScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50"
            >
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No chat messages for this request yet. Send a message to operator!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === user.id || (user.role === 'ADMIN' && m.senderRole === 'ADMIN');
                  const isSystem = m.text.startsWith('[SYSTEM') || m.text.startsWith('[STATUS');

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center my-3">
                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-1 px-1 font-medium">
                        {m.senderName} ({m.senderRole})
                      </span>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-none font-medium'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none font-medium'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                        {m.attachmentUrl && (
                          <div className="mt-2 p-2 bg-slate-900/10 rounded-xl flex items-center justify-between gap-2">
                            <span className="font-bold text-[11px] truncate">Document Attachment</span>
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold shrink-0">
                              Open File
                            </a>
                          </div>
                        )}

                        <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {showScrollDownBtn && (
              <button
                type="button"
                onClick={() => scrollToContainerBottom(true)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full text-xs font-black shadow-xl border border-slate-700 flex items-center gap-1.5 backdrop-blur-md transition-all animate-bounce z-10 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 text-amber-400" />
                <span>{hasUnreadBelow ? '👇 New Message Received' : '↓ Jump to latest message'}</span>
              </button>
            )}
          </div>

          {/* Admin Presets */}
          {user.role === 'ADMIN' && (
            <div className="p-2.5 bg-white border-t border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Admin Presets
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {ADMIN_CANNED_RESPONSES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(preset)}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-medium whitespace-nowrap"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachment input toggle */}
          {showAttachInput && (
            <div className="p-2 bg-slate-100 border-t border-slate-200 flex gap-2">
              <input
                type="url"
                placeholder="Document / Image URL attachment..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAttachInput(false)}
                className="px-2 text-xs text-slate-500 hover:text-slate-700 font-bold"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAttachInput(!showAttachInput)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Attach Document URL"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <input
              type="text"
              placeholder="Type message or paste screenshot (Ctrl+V)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isSending || (!text.trim() && !attachmentUrl.trim())}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
