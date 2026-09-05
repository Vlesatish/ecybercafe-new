import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadFileToServer } from '../utils/upload';
import { playNewMessageSound } from '../utils/sound';
import { realtimeClient } from '../utils/realtimeClient';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Image as ImageIcon, 
  Phone, 
  Store, 
  CheckCheck, 
  Sparkles, 
  RefreshCw, 
  UserCheck, 
  Clock,
  ShieldCheck,
  Bot,
  ArrowLeft,
  Users,
  Paperclip,
  Download,
  Maximize2,
  X,
  Volume2
} from 'lucide-react';

interface SupportChatMessage {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderRole: 'RETAILER' | 'ADMIN' | 'SYSTEM';
  text: string;
  attachmentUrl?: string;
  createdAt: string;
  isReadByAdmin?: boolean;
}

interface SupportThread {
  userId: string;
  userName: string;
  userMobile?: string;
  storeName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: SupportChatMessage[];
}

export const AdminSupportChatManager: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [showMobileList, setShowMobileList] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    if (threads.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await fetch('/api/admin/support-threads');
      if (res.ok) {
        const data: SupportThread[] = await res.json();
        setThreads(data);

        // Auto select first thread if none selected
        setSelectedUserId(prev => prev || (data.length > 0 ? data[0].userId : null));
      }
    } catch (e) {
      console.error('Error fetching support threads:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const markThreadAsRead = async (userId: string) => {
    try {
      await fetch(`/api/admin/support-threads/${userId}/mark-read`, {
        method: 'POST',
      });
      setThreads(prev =>
        prev.map(t => (t.userId === userId ? { ...t, unreadCount: 0 } : t))
      );
    } catch (e) {
      console.error('Error marking thread as read:', e);
    }
  };

  useEffect(() => {
    fetchThreads();

    const unsubscribe = realtimeClient.subscribe((payload) => {
      try {
        if (payload.type === 'SUPPORT_CHAT_MESSAGE' || payload.type === 'SUPPORT_CHAT_READ') {
          const data = (payload as any).data || (payload as any).payload;
          if (payload.type === 'SUPPORT_CHAT_MESSAGE' && data?.senderRole !== 'ADMIN') {
            playNewMessageSound();
          }
          fetchThreads();
        }
      } catch (e) {
        console.error('SSE Error:', e);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      markThreadAsRead(selectedUserId);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedUserId]);

  const activeThread = threads.find(t => t.userId === selectedUserId);

  useEffect(() => {
    if (activeThread) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages.length]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if ((!textToSend.trim() && !attachmentUrl) || isSending || !selectedUserId || !adminUser) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          senderId: adminUser.id,
          senderName: 'Helpdesk Officer (Admin)',
          senderRole: 'ADMIN',
          text: textToSend.trim(),
          attachmentUrl: attachmentUrl || undefined,
        }),
      });

      if (res.ok) {
        setInputText('');
        setAttachmentUrl('');
        setShowAttachInput(false);
        fetchThreads();
      }
    } catch (e) {
      console.error('Error sending support chat reply:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleAutoSendUploadedImage = async (imgUrl: string) => {
    if (isSending || !selectedUserId || !adminUser) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          senderId: adminUser.id,
          senderName: 'Helpdesk Officer (Admin)',
          senderRole: 'ADMIN',
          text: inputText.trim() || '📷 Image Attachment / दस्तावेज',
          attachmentUrl: imgUrl,
        }),
      });

      if (res.ok) {
        setInputText('');
        setAttachmentUrl('');
        setShowAttachInput(false);
        fetchThreads();
      }
    } catch (e) {
      console.error('Error auto-sending image reply:', e);
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

  const handleWhatsAppRedirect = (mobile?: string) => {
    if (!mobile) return;
    const cleanNum = mobile.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello Retailer! This is Scan4Print / Citizen Service Admin replying to your support query.`);
    window.open(`https://wa.me/91${cleanNum}?text=${text}`, '_blank');
  };

  const filteredThreads = threads.filter(t => 
    t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.storeName && t.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.userMobile && t.userMobile.includes(searchQuery))
  );

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const adminQuickReplies = [
    '👋 नमस्ते! आपकी समस्या दर्ज कर ली गई है, ऑपरेटर 2 मिनट में समाधान कर रहा है।',
    '💳 वॉलेट टॉप-अप के लिए होमपेज पर Wallet Top-Up पर क्लिक करें और QR Code स्कैन करें।',
    '✅ आपकी Request Process कर दी गई है। आप पोर्टल स्टेटस चेक करें।',
    '⚠️ कृपया सही एप्लीकेशन नंबर या फॉर्म का साफ़ फोटो दोबारा चैट में भेजें।',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[750px] max-h-[85vh] text-slate-900 font-sans">
      {/* Top Main WhatsApp Green Header */}
      <div className="px-5 py-3.5 bg-[#075E54] text-white flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-800 border-2 border-emerald-400 flex items-center justify-center text-white text-lg font-black shadow-xs">
            💬
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 tracking-wide">
              Retailer Support Chat Manager (हेल्पडेस्क)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white border border-emerald-400/60 shadow-xs">
                LIVE
              </span>
              {totalUnread > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse shadow-md">
                  {totalUnread} Unread
                </span>
              )}
            </h2>
            <p className="text-[11px] text-emerald-100 font-medium">
              Reply to live messages from all retailers in real time (WhatsApp Live Inbox)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => playNewMessageSound()}
            className="px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-400/40 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs active:scale-95"
            title="Test new message notification sound"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Test Sound</span>
          </button>
          <button
            onClick={fetchThreads}
            className="px-3.5 py-1.5 rounded-xl bg-[#128C7E] hover:bg-emerald-600 text-white border border-emerald-400/40 transition-all flex items-center gap-1.5 text-xs font-extrabold cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Inbox</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Inbox Left & Chat Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Inbox Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 bg-slate-50 flex-col shrink-0 ${
          showMobileList || !selectedUserId ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Header info bar */}
          <div className="px-4 py-2.5 bg-[#075E54] border-b border-emerald-700 flex items-center justify-between text-xs text-white">
            <span className="font-extrabold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-200" />
              All Retailers ({filteredThreads.length})
            </span>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#25d366] text-black">
                {totalUnread} Unread
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search retailer name or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#075E54]"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                Loading retailer support threads...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Bot className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold">No support chats found.</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.userId === selectedUserId;
                const hasUnread = thread.unreadCount > 0;

                return (
                  <button
                    key={thread.userId}
                    onClick={() => {
                      setSelectedUserId(thread.userId);
                      markThreadAsRead(thread.userId);
                      setShowMobileList(false);
                    }}
                    className={`w-full p-3.5 text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90 border-l-4 border-[#075E54]'
                        : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#128C7E] border border-emerald-400/40 font-black text-white text-sm flex items-center justify-center shadow-xs">
                        {thread.userName.charAt(0).toUpperCase()}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#25d366] text-black font-black text-[10px] flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className={`text-xs font-extrabold truncate ${hasUnread ? 'text-[#075E54] font-black' : 'text-slate-900'}`}>
                          {thread.userName}
                        </h4>
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                          {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {thread.storeName && (
                        <p className="text-[10px] font-semibold text-emerald-700 truncate flex items-center gap-1">
                          <Store className="w-2.5 h-2.5" />
                          {thread.storeName}
                        </p>
                      )}

                      <p className={`text-[11px] truncate mt-1 ${hasUnread ? 'text-amber-800 font-bold' : 'text-slate-600'}`}>
                        {thread.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat Panel */}
        <div className={`flex-1 flex-col bg-slate-100 min-w-0 ${
          !showMobileList && selectedUserId ? 'flex' : 'hidden md:flex'
        }`}>
          {activeThread ? (
            <>
              {/* Active Retailer Header */}
              <div className="px-4 py-3 bg-[#075E54] text-white border-b border-emerald-700 flex items-center justify-between shrink-0 gap-2 shadow-md">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden p-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 border border-emerald-500/60 shrink-0 cursor-pointer shadow-sm"
                    title="Back to All Retailers List"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[11px]">Retailers</span>
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-800 border-2 border-emerald-400 font-black text-white text-sm flex items-center justify-center shadow-xs">
                      {activeThread.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] border-2 border-[#075E54] rounded-full"></span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{activeThread.userName}</span>
                      {activeThread.storeName && (
                        <span className="text-[11px] font-semibold text-emerald-100 truncate hidden sm:inline">
                          ({activeThread.storeName})
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-emerald-100 font-medium truncate">
                      📱 Mobile: {activeThread.userMobile || 'N/A'} • <span className="text-emerald-300 font-bold">Online 24x7 Helpdesk</span>
                    </p>
                  </div>
                </div>

                {activeThread.userMobile && (
                  <button
                    onClick={() => handleWhatsAppRedirect(activeThread.userMobile)}
                    className="px-3 py-1.5 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] text-black font-extrabold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-black" />
                    <span className="hidden sm:inline">WhatsApp Direct</span>
                  </button>
                )}
              </div>

              {/* Chat Message Timeline with WhatsApp background pattern */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#efeae2]">
                {activeThread.messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No messages in this chat yet.
                  </div>
                ) : (
                  activeThread.messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'ADMIN';
                    const isSystem = msg.senderRole === 'SYSTEM';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-600">
                            {isAdmin ? 'You (Admin)' : msg.senderName}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs shadow-sm space-y-1.5 font-medium ${
                            isAdmin
                              ? 'bg-[#dcf8c6] text-slate-900 border border-emerald-300 rounded-tr-none'
                              : isSystem
                              ? 'bg-amber-100 border border-amber-300 text-amber-900 rounded-tl-none font-bold'
                              : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                          {msg.attachmentUrl && (
                            <div className="pt-1">
                              {msg.attachmentUrl.startsWith('data:image/') || msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                <div className="relative group/img my-1">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt="Attachment"
                                    onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                                    className="max-h-60 sm:max-h-72 w-auto max-w-full rounded-2xl object-contain border border-black/15 shadow-md cursor-pointer hover:opacity-95 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                                    className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[10px] font-extrabold opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                    <span>Enlarge</span>
                                  </button>
                                </div>
                              ) : (
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800 hover:text-emerald-900 bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-2xs"
                                >
                                  <Paperclip className="w-4 h-4 text-emerald-700" />
                                  <span>Open Attached File</span>
                                </a>
                              )}
                            </div>
                          )}

                          {isAdmin && (
                            <div className="text-right pt-0.5">
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-700 inline-block" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Preset Reply Buttons */}
              <div className="p-2 bg-slate-200/90 border-t border-slate-300 overflow-x-auto whitespace-nowrap space-x-2 scrollbar-none flex items-center">
                <span className="text-[10px] font-black uppercase text-[#075E54] tracking-wider shrink-0 mr-1">
                  ⚡ Quick Replies:
                </span>
                {adminQuickReplies.map((reply, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center shrink-0 bg-white hover:bg-emerald-50 border border-slate-300 rounded-xl overflow-hidden shadow-2xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setInputText(reply)}
                      className="px-2.5 py-1 text-[11px] font-extrabold text-slate-800 hover:text-emerald-900 cursor-pointer max-w-[220px] truncate"
                      title={`${reply}\n(Click to insert into box)`}
                    >
                      {reply}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage(reply)}
                      disabled={isSending}
                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold border-l border-slate-300 cursor-pointer flex items-center gap-1 active:scale-95 transition-transform"
                      title="Send immediately to retailer"
                    >
                      <Send className="w-2.5 h-2.5" />
                      <span>Send</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Attachment Input Bar */}
              {showAttachInput && (
                <div className="px-4 py-2 bg-slate-200 border-t border-slate-300 flex items-center gap-2">
                  <input
                    type="text"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Paste Screenshot or PDF Link (https://...)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#075E54]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAttachInput(false)}
                    className="text-xs text-rose-600 hover:underline font-bold px-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Bottom WhatsApp Input Bar */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="p-3 bg-slate-200/90 border-t border-slate-300 flex items-center gap-2"
              >
                <label className="p-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-300 rounded-xl cursor-pointer transition-colors shrink-0 shadow-2xs" title="Upload Image / Document">
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
                  type="button"
                  onClick={() => setShowAttachInput(!showAttachInput)}
                  className={`p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                    attachmentUrl
                      ? 'bg-amber-500/20 border-amber-500 text-amber-700'
                      : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Paste Image Link"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Reply to ${activeThread.userName} (उत्तर लिखें या फोटो पेस्ट करें)...`}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#075E54] font-medium"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isSending || (!inputText.trim() && !attachmentUrl)}
                  className="px-5 py-2.5 bg-[#075E54] hover:bg-[#128C7E] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer border border-emerald-500/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3 bg-slate-50">
              <MessageSquare className="w-12 h-12 text-[#075E54] opacity-60" />
              <h3 className="font-extrabold text-sm text-slate-700">Select a Retailer Support Thread</h3>
              <p className="text-xs max-w-sm text-slate-500">
                Choose a retailer from the left inbox sidebar to view their messages and reply in real time.
              </p>
            </div>
          )}
        </div>
      </div>

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
              alt="Enlarged Attachment"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
            />
            <a
              href={lightboxImage}
              download="support_chat_attachment"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
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
