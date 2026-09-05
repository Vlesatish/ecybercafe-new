import React, { useState, useEffect, useRef } from 'react';
import { ServiceRequest, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { uploadFileToServer } from '../utils/upload';
import { playNewMessageSound } from '../utils/sound';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Image as ImageIcon,
  Search,
  X,
  CheckCheck,
  Reply,
  Smile,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Maximize2
} from 'lucide-react';

interface InlineRequestChatProps {
  request: ServiceRequest;
  initialOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  enableChat?: boolean;
  hideHeader?: boolean;
}

export const InlineRequestChat: React.FC<InlineRequestChatProps> = ({
  request,
  initialOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  enableChat = true,
  hideHeader = false
}) => {
  const { user } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(initialOpen);
  const isExpanded = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const quickEmojis = ['👍', '🙏', '✅', '📄', '❌', '💰', '⚡', '😊', '🆗', '🎉'];

  const defaultQuickTemplates = [
    '⚡ Processing Started (काम शुरू कर दिया गया है)',
    '✅ Done & Output Uploaded (दस्तावेज़ अपलोड कर दिया गया है)',
    '⚠️ Document Incomplete - Re-upload (दस्तावेज़ अधूरा है)',
    '💰 Payment Received / Verified (भुगतान प्राप्त हो गया)',
    '⏱️ Will take 10-15 minutes (10-15 मिनट का समय लगेगा)',
    '❌ Request Rejected - Check Details (अमान्य विवरण)'
  ];

  const [quickReplyTemplates, setQuickReplyTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('operator_custom_quick_chats');
      return saved ? JSON.parse(saved) : defaultQuickTemplates;
    } catch {
      return defaultQuickTemplates;
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
      localStorage.setItem('operator_custom_quick_chats', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom templates:', e);
    }
    setNewTemplateText('');
    setShowAddTemplateModal(false);
  };

  const handleDeleteTemplate = (idxToRemove: number) => {
    const updated = quickReplyTemplates.filter((_, idx) => idx !== idxToRemove);
    setQuickReplyTemplates(updated);
    try {
      localStorage.setItem('operator_custom_quick_chats', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update templates:', e);
    }
  };

  const handleInstantQuickSend = async (quickMsgText: string) => {
    if (isSending || !user) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/chat/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          text: quickMsgText,
          attachmentUrl: undefined,
          replyToId: undefined,
        }),
      });
      if (res.ok) {
        await fetchMessages();
        setTimeout(() => scrollToContainerBottom(true), 150);
      }
    } catch (err) {
      console.error('Instant quick message failed:', err);
    } finally {
      setIsSending(false);
    }
  };

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

  const toggleOpen = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${request.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('Failed to fetch chat messages', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      if (messages.length === 0) {
        setIsLoading(true);
      }
      fetchMessages();

      // Regular polling for instant chat sync
      const interval = setInterval(fetchMessages, 3000);

      return () => {
        clearInterval(interval);
      };
    } else {
      prevMsgCountRef.current = 0;
      setIsLoading(false);
    }
  }, [isExpanded, request.id]);

  useEffect(() => {
    if (!isExpanded || !chatContainerRef.current) return;

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
  }, [messages, isExpanded]);

  const handleAutoSendUploadedImage = async (imageUrl: string) => {
    if (isSending || !user) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/chat/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id || 'usr_anonymous',
          senderName: user?.name || (user?.role === 'ADMIN' ? 'Portal Admin' : 'Operator Staff'),
          senderRole: user?.role || 'RETAILER',
          text: inputText.trim() || '📷 Image Attachment / दस्तावेज',
          attachmentUrl: imageUrl,
          replyToId: replyingTo?.id,
          replyToText: replyingTo?.text,
          replyToSender: replyingTo?.senderName
        })
      });

      if (res.ok) {
        setInputText('');
        setAttachment(null);
        setReplyingTo(null);
        await fetchMessages();
        setTimeout(() => scrollToContainerBottom(true), 100);
      }
    } catch (err) {
      console.error('Failed to auto send image:', err);
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
          try {
            const uploaded = await uploadFileToServer(file);
            await handleAutoSendUploadedImage(uploaded.url);
          } catch (err: any) {
            alert(`File upload failed: ${err.message || 'Error'}`);
          }
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
      try {
        const uploaded = await uploadFileToServer(file);
        await handleAutoSendUploadedImage(uploaded.url);
      } catch (err: any) {
        alert(`File upload failed: ${err.message || 'Error'}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    setIsSending(true);

    try {
      const res = await fetch(`/api/chat/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id || 'usr_anonymous',
          senderName: user?.name || (user?.role === 'ADMIN' ? 'Portal Admin' : 'Retailer Operator'),
          senderRole: user?.role || 'RETAILER',
          text: inputText.trim(),
          attachmentUrl: attachment || undefined,
          replyToId: replyingTo?.id,
          replyToText: replyingTo?.text,
          replyToSender: replyingTo?.senderName
        })
      });

      if (res.ok) {
        setInputText('');
        setAttachment(null);
        setReplyingTo(null);
        await fetchMessages();
        setTimeout(() => scrollToContainerBottom(true), 80);
      }
    } catch (e) {
      console.error('Error sending chat message', e);
    } finally {
      setIsSending(false);
    }
  };

  const displayedMessages = searchQuery.trim()
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.senderName.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (enableChat === false) {
    return (
      <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-center text-xs text-amber-300 font-semibold my-2 flex items-center justify-center gap-2 shadow-sm">
        <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
        <span>💬 Chat system is disabled for this service. (इस सर्विस के लिए चैट संवाद बंद रखा गया है)</span>
      </div>
    );
  }

  return (
    <div id={`chat-inline-${request.id}`} className={`border-2 rounded-2xl overflow-hidden shadow-lg font-sans bg-[#efeae2] ${hideHeader ? 'border-emerald-600/40 my-2' : 'border-emerald-500/40 my-3'}`}>
      {/* WhatsApp Header (Only rendered when not wrapped by external header) */}
      {!hideHeader && (
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-black text-sm border-2 border-emerald-400 text-white shadow-xs">
                💬
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white tracking-wide leading-tight">
                  WhatsApp Live Helpdesk #{request.requestNumber}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-600/80 text-[10px] font-black rounded-full border border-emerald-400/50">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">
                {request.serviceTitle} • {request.retailerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1.5 hover:bg-emerald-700/80 rounded-full text-emerald-100 hover:text-white transition-colors cursor-pointer"
              title="Search Messages"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleOpen}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer border border-emerald-500/50"
            >
              <span>{isExpanded ? 'Hide' : 'Open'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="p-3 space-y-3">
          {hideHeader && (
            <div className="flex items-center justify-between px-1 text-slate-700 font-bold text-xs pb-1 border-b border-emerald-900/10">
              <span className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Chat Session #{request.requestNumber}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Search className="w-3 h-3 text-slate-500" />
                <span>{isSearchOpen ? 'Close Search' : 'Search Chat'}</span>
              </button>
            </div>
          )}
          {/* Search Bar inside Chat */}
          {isSearchOpen && (
            <div className="p-2 bg-white/95 rounded-xl border border-slate-300 shadow-xs flex items-center gap-2 animate-fadeIn">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversation..."
                className="w-full text-xs text-slate-800 focus:outline-none bg-transparent"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Chat Messages Container with WhatsApp Wallpaper */}
          <div className="relative">
            <div
              ref={chatContainerRef}
              onScroll={handleContainerScroll}
              className="max-h-80 overflow-y-auto space-y-3 p-3.5 rounded-2xl border border-emerald-900/10 shadow-inner"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px), radial-gradient(#cbd5e1 0.75px, #efeae2 0.75px)`,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px'
              }}
            >
              {isLoading && messages.length === 0 ? (
                <div className="text-center py-8 text-slate-700 text-xs font-bold flex items-center justify-center gap-2.5 bg-white/80 backdrop-blur-xs rounded-2xl p-4 border border-emerald-300/80 shadow-xs">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span>Connecting to live WhatsApp session...</span>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs space-y-2 bg-white/70 backdrop-blur-xs rounded-2xl p-4 border border-emerald-200">
                  <MessageSquare className="w-8 h-8 mx-auto text-emerald-600 mb-1" />
                  <p className="font-extrabold text-slate-800 text-sm">No messages in conversation</p>
                  <p className="text-[11px] text-slate-600">Type below to send direct WhatsApp message for Request #{request.requestNumber}.</p>
                </div>
              ) : (
                displayedMessages.map((m) => {
                  const isMe = m.senderId === user?.id || m.senderRole === user?.role;
                  const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm relative ${
                          isMe
                            ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none border border-emerald-300'
                            : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                        }`}
                      >
                        {/* Reply Header */}
                        {m.replyToText && (
                          <div className="mb-2 p-1.5 bg-black/5 rounded-lg border-l-4 border-emerald-600 text-[11px]">
                            <p className="font-extrabold text-emerald-800">{m.replyToSender || 'Message'}</p>
                            <p className="text-slate-600 line-clamp-1 italic">{m.replyToText}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isMe ? 'text-emerald-800' : 'text-indigo-700'}`}>
                            {isMe ? 'You' : m.senderName} ({m.senderRole})
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplyingTo(m)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/5 rounded text-slate-500"
                            title="Reply to message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="leading-relaxed whitespace-pre-wrap text-slate-800 font-medium text-[13px]">{m.text}</p>

                        {m.attachmentUrl && (
                          <div className="mt-2 pt-1.5 border-t border-black/10">
                            {m.attachmentUrl.startsWith('data:image/') || m.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                              <div className="relative group/img my-1">
                                <img
                                  src={m.attachmentUrl}
                                  alt="Attachment"
                                  onClick={() => setLightboxImage(m.attachmentUrl || null)}
                                  className="max-h-60 sm:max-h-72 w-auto max-w-full rounded-2xl object-contain border border-black/15 shadow-md cursor-pointer hover:opacity-95 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setLightboxImage(m.attachmentUrl || null)}
                                  className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[10px] font-extrabold opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Enlarge</span>
                                </button>
                              </div>
                            ) : (
                              <a
                                href={m.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800 hover:text-emerald-900 bg-emerald-100/80 px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-2xs"
                              >
                                <FileText className="w-4 h-4 text-emerald-700" />
                                <span>Open Attached Document / File</span>
                              </a>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-bold text-slate-500">
                          <span>{timeStr}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-600 inline-block" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {showScrollDownBtn && (
              <button
                type="button"
                onClick={() => scrollToContainerBottom(true)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-emerald-800/90 hover:bg-emerald-900 text-white rounded-full text-xs font-extrabold shadow-lg border border-emerald-600 flex items-center gap-1.5 backdrop-blur-md transition-all animate-bounce z-10 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 text-amber-300" />
                <span>{hasUnreadBelow ? '👇 New Message Received' : '↓ Scroll to bottom'}</span>
              </button>
            )}
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-emerald-800">Replying to {replyingTo.senderName}:</p>
                  <p className="text-slate-700 text-[11px] truncate">{replyingTo.text}</p>
                </div>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className="p-1 hover:bg-emerald-200 rounded-full text-emerald-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Operator/Admin Quick Text Templates Bar (1-Click Instant Send) */}
          {(user?.role === 'OPERATOR' || user?.role === 'ADMIN') && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-emerald-200/80 mb-1">
              <span className="text-[10px] font-black text-emerald-900 shrink-0 mr-1 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                <Sparkles className="w-3 h-3 text-emerald-700 animate-spin" /> Quick Text:
              </span>
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(true)}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-xl cursor-pointer shrink-0 flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                title="Add your own custom quick message"
              >
                <Plus className="w-3 h-3" />
                <span>+ Custom Quick Reply</span>
              </button>
              {quickReplyTemplates.map((tmpl, idx) => (
                <div key={idx} className="inline-flex items-center group shrink-0 bg-teal-800 rounded-xl overflow-hidden shadow-xs border border-teal-700/80">
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleInstantQuickSend(tmpl)}
                    className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-extrabold text-[11px] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
                    title="Click to instantly send message to retailer"
                  >
                    <span>{tmpl}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(idx)}
                    className="px-2 py-1 bg-teal-900/90 hover:bg-rose-600 text-teal-100 hover:text-white text-[10px] cursor-pointer transition-colors border-l border-teal-700/60 flex items-center justify-center shrink-0"
                    title="Delete custom template"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Emoji Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-extrabold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
              <Smile className="w-3 h-3 text-amber-500" /> Emojis:
            </span>
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setInputText(prev => prev + emoji)}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs transition-transform hover:scale-110 cursor-pointer shrink-0 shadow-2xs font-extrabold"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Form Typing Area */}
          <form
            onSubmit={handleSendMessage}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Type message or paste screenshot (Ctrl+V)..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border-2 border-emerald-300 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-inner font-medium"
              />
            </div>

            <label className="p-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-2xl cursor-pointer transition-colors shrink-0 shadow-2xs" title="Attach File / Screenshot">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const uploaded = await uploadFileToServer(file);
                      await handleAutoSendUploadedImage(uploaded.url);
                    } catch (err: any) {
                      alert(`Upload failed: ${err.message || 'Error'}`);
                    }
                  }
                }}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !attachment)}
              className="px-4 py-2.5 bg-[#075E54] hover:bg-[#128C7E] disabled:opacity-50 text-white rounded-2xl transition-all shrink-0 shadow-md font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {attachment && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                {attachment.startsWith('data:image/') || attachment.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                  <img src={attachment} alt="Attachment" className="w-12 h-12 object-cover rounded-xl border border-emerald-400 shrink-0 shadow-2xs" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-extrabold text-emerald-900 text-xs truncate">
                    📷 Screenshot / Image Attached!
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Ready to send with message</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[11px] font-black transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Quick Reply Modal */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 text-slate-900 border-2 border-indigo-500">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl font-bold">💬</span>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Create Custom Quick Reply</h4>
                  <p className="text-[11px] text-slate-500 font-semibold">1-Click instant message for operator</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomTemplate} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Custom Message Text (कस्टम मेसेज रिप्लाई)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  placeholder="e.g. 📄 Server down hai, 10 min baad try karein (सर्वर डाउन है)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                💡 Tip: This quick text will be saved in your operator dashboard bar for 1-click instant sending to retailers.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Quick Template</span>
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
          className="fixed inset-0 bg-black/90 z-70 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged Chat Attachment"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
            />
            <a
              href={lightboxImage}
              download="chat_attachment_image"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
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
