import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '../types';
import { 
  LifeBuoy, 
  PlusCircle, 
  Search, 
  Filter, 
  Send, 
  Paperclip, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CheckCheck, 
  MessageSquare, 
  Phone, 
  ExternalLink, 
  ArrowLeft, 
  Image as ImageIcon,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  X,
  FileText
} from 'lucide-react';

interface SupportTicketPageViewProps {
  onNavigateToRequest?: (requestId: string) => void;
}

export function SupportTicketPageView({ onNavigateToRequest }: SupportTicketPageViewProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected ticket for thread view
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<TicketCategory>('SERVICE_REQUEST');
  const [newPriority, setNewPriority] = useState<TicketPriority>('MEDIUM');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRelatedReqId, setNewRelatedReqId] = useState('');
  const [newAttachment, setNewAttachment] = useState<string | null>(null);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      const url = user?.role === 'ADMIN' ? '/api/tickets' : `/api/tickets?userId=${encodeURIComponent(user?.id || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.stats) setStats(data.stats);
        
        // If current ticket is selected, update its state
        if (selectedTicket) {
          const updated = (data.tickets || []).find((t: SupportTicket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    
    // Listen for realtime ticket events
    const handleTicketEvent = () => {
      fetchTickets();
    };
    window.addEventListener('ticket_event', handleTicketEvent);
    return () => window.removeEventListener('ticket_event', handleTicketEvent);
  }, [user?.id]);

  // Handle File Attachment Upload (Converts to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isReply = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB / फ़ाइल 5MB से छोटी होनी चाहिए');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (isReply) {
        setReplyAttachment(base64);
      } else {
        setNewAttachment(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit New Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newSubject.trim()) {
      setFormError('कृपया विषय (Subject) दर्ज करें।');
      return;
    }
    if (!newDescription.trim()) {
      setFormError('कृपया अपनी समस्या का पूरा विवरण (Description) लिखें।');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const payload = {
        userId: user?.id || 'usr_guest',
        userName: user?.name || 'Retailer User',
        userMobile: user?.mobileNumber || '',
        storeName: user?.storeName || '',
        userRole: user?.role || 'RETAILER',
        category: newCategory,
        priority: newPriority,
        subject: newSubject.trim(),
        description: newDescription.trim(),
        relatedRequestId: newRelatedReqId.trim() || undefined,
        attachmentUrl: newAttachment || undefined
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreateModalOpen(false);
        setNewSubject('');
        setNewDescription('');
        setNewRelatedReqId('');
        setNewAttachment(null);
        await fetchTickets();
        if (data.ticket) {
          setSelectedTicket(data.ticket);
        }
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'टिकट सबमिट करने में विफल रहा।');
      }
    } catch (err: any) {
      setFormError(err.message || 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Send Reply on Ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!replyMessage.trim() && !replyAttachment) return;

    setIsSendingReply(true);
    try {
      const payload = {
        senderId: user?.id || 'usr_guest',
        senderName: user?.name || 'Retailer User',
        senderRole: user?.role || 'RETAILER',
        message: replyMessage.trim(),
        attachmentUrl: replyAttachment || undefined
      };

      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setReplyMessage('');
        setReplyAttachment(null);
        if (data.ticket) {
          setSelectedTicket(data.ticket);
        }
        fetchTickets();
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const getCategoryBadge = (cat: TicketCategory) => {
    switch (cat) {
      case 'WALLET_PAYMENT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">💰 वॉलेट / पेमेंट</span>;
      case 'SERVICE_REQUEST':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">📝 आवेदन स्टेटस</span>;
      case 'CORRECTION':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🔄 सुधार / Re-apply</span>;
      case 'TECHNICAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">⚙️ तकनीकी समस्या</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200">❓ अन्य सहायता</span>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            OPEN (खुला है)
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            IN PROGRESS (जांच जारी)
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            RESOLVED (समाधान पूर्ण)
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-300">
            <CheckCheck className="w-3 h-3 text-slate-500" />
            CLOSED (बंद)
          </span>
        );
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    if (activeFilter !== 'ALL' && t.status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchNum = String(t.ticketNumber).includes(q);
      return matchSubject || matchDesc || matchNum;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
              <LifeBuoy className="w-3 h-3" /> 24x7 Helpdesk Desk
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold">
              High Priority System
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            सपोर्ट टिकट केंद्र (Helpdesk & Support Tickets)
          </h1>
          <p className="text-emerald-100/80 text-sm mt-1 max-w-2xl font-medium">
            पोर्टल पर किसी भी सर्विस, वॉलेट टॉप-अप, आवेदन स्टेटस या समस्या के लिए टिकट दर्ज करें। एडमिन द्वारा त्वरित समाधान दिया जाएगा।
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer shrink-0 border border-emerald-400/30"
        >
          <PlusCircle className="w-5 h-5" />
          + नया टिकट बनाएं (Create Ticket)
        </button>
      </div>

      {/* Ticket Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <p className="text-xs font-bold text-slate-400">कुल टिकट्स (Total)</p>
          <p className="text-2xl font-black mt-1">{stats.total || tickets.length}</p>
        </button>

        <button
          onClick={() => setActiveFilter('OPEN')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === 'OPEN'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-600">खुले टिकट्स (Open)</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <p className="text-2xl font-black mt-1 text-emerald-700">{stats.open || tickets.filter(t => t.status === 'OPEN').length}</p>
        </button>

        <button
          onClick={() => setActiveFilter('IN_PROGRESS')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === 'IN_PROGRESS'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <p className="text-xs font-bold text-amber-600">प्रक्रियाधीन (In Progress)</p>
          <p className="text-2xl font-black mt-1 text-amber-700">{stats.inProgress || tickets.filter(t => t.status === 'IN_PROGRESS').length}</p>
        </button>

        <button
          onClick={() => setActiveFilter('RESOLVED')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === 'RESOLVED'
              ? 'bg-blue-700 text-white border-blue-700 shadow-md ring-2 ring-blue-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <p className="text-xs font-bold text-blue-600">समाधान हो चुके (Resolved)</p>
          <p className="text-2xl font-black mt-1 text-blue-700">{stats.resolved || tickets.filter(t => t.status === 'RESOLVED').length}</p>
        </button>
      </div>

      {/* Main Content: If a ticket is selected, show conversation view; else show ticket list */}
      {selectedTicket ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Thread Header */}
          <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 mt-0.5"
                title="Back to Tickets List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                    #TKT-{selectedTicket.ticketNumber}
                  </span>
                  {getCategoryBadge(selectedTicket.category)}
                  {getStatusBadge(selectedTicket.status)}
                  {selectedTicket.priority === 'URGENT' && (
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
                      🚨 URGENT
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-white">{selectedTicket.subject}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  दर्ज किया गया: {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                  {selectedTicket.relatedRequestId && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      संबंधित आवेदन: {selectedTicket.relatedRequestId}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchTickets}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                रिफ्रेश
              </button>
            </div>
          </div>

          {/* Admin Note if present */}
          {selectedTicket.adminNotes && (
            <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-900 uppercase tracking-wider">एडमिन का आधिकारिक निर्देश (Admin Resolution Note):</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed font-medium">{selectedTicket.adminNotes}</p>
              </div>
            </div>
          )}

          {/* Conversation Messages Thread */}
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-slate-50/50">
            {selectedTicket.messages && selectedTicket.messages.map((msg, index) => {
              const isAdmin = msg.senderRole === 'ADMIN' || msg.senderRole === 'OPERATOR';
              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-600">
                      {isAdmin ? '🛡️ Helpdesk Officer (Admin)' : `👤 ${msg.senderName || 'You'}`}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isAdmin
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs ring-1 ring-emerald-500/20'
                        : 'bg-emerald-700 text-white rounded-tr-xs shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>

                    {msg.attachmentUrl && (
                      <div className="mt-3 pt-2 border-t border-slate-200/40">
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-xs font-bold transition-all"
                        >
                          <ImageIcon className="w-4 h-4" />
                          संलग्न स्क्रीनशॉट देखें (View Attachment)
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          {selectedTicket.status !== 'CLOSED' ? (
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200">
              {replyAttachment && (
                <div className="mb-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center gap-1.5 font-medium truncate">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    स्क्रीनशॉट संलग्न है (Ready to send)
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyAttachment(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 cursor-pointer transition-all shrink-0">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, true)}
                  />
                </label>

                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="अपना जवाब या स्पष्टीकरण लिखें (Type your message)..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-xs text-slate-800"
                />

                <button
                  type="submit"
                  disabled={isSendingReply || (!replyMessage.trim() && !replyAttachment)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  भेजें (Reply)
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-bold">
              🔒 यह टिकट बंद कर दिया गया है। नई समस्या के लिए कृपया नया टिकट बनाएं।
            </div>
          )}
        </div>
      ) : (
        /* Ticket List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="सर्च करें (Ticket ID, Subject)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={fetchTickets}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                रिफ्रेश
              </button>
            </div>
          </div>

          {/* Tickets List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              सपोर्ट टिकट्स लोड हो रहे हैं...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">कोई सक्रिय टिकट नहीं मिला</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">
                यदि आपको किसी सेवा, रिफंड या वॉलेट से संबंधित सहायता चाहिए, तो ऊपर दिए गए बटन से नया टिकट बनाएं।
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                + नया टिकट दर्ज करें
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 hover:bg-slate-50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                      #{ticket.ticketNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getCategoryBadge(ticket.category)}
                        {getStatusBadge(ticket.status)}
                        {ticket.priority === 'URGENT' && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                            🚨 URGENT
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {ticket.subject}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-medium">
                        {ticket.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      {ticket.messages?.length || 1} संदेश
                    </span>

                    <button className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs transition-all border border-emerald-200">
                      विवरण देखें →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Official Helplines Info Box */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">आपातकालीन व्हाट्सएप सहायता (Emergency WhatsApp Desk)</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              यदि टिकट पर 30 मिनट में उत्तर न मिले, तो ऑपरेटर डेस्क पर सीधे व्हाट्सएप संदेश भेजें।
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/919999999999?text=Namaste%20Helpdesk%20Team%2C%20Need%20assistance%20with%20Portal%20Ticket"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          <Phone className="w-4 h-4" />
          WhatsApp Direct
        </a>
      </div>

      {/* CREATE NEW TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">नया सपोर्ट टिकट दर्ज करें (New Ticket)</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    समस्या की श्रेणी (Category) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-emerald-500 focus:outline-hidden font-medium"
                  >
                    <option value="SERVICE_REQUEST">📝 आवेदन स्टेटस (Application Status)</option>
                    <option value="WALLET_PAYMENT">💰 वॉलेट टॉप-अप / पेमेंट (Wallet & Payment)</option>
                    <option value="CORRECTION">🔄 सुधार / Re-apply (Correction)</option>
                    <option value="TECHNICAL">⚙️ तकनीकी समस्या (Technical Issue)</option>
                    <option value="OTHER">❓ अन्य सहायता (Other Inquiry)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    प्राथमिकता (Priority)
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-emerald-500 focus:outline-hidden font-medium"
                  >
                    <option value="LOW">🟢 सामान्य (Normal / Low)</option>
                    <option value="MEDIUM">🟡 मध्यम (Medium)</option>
                    <option value="HIGH">🟠 उच्च (High Priority)</option>
                    <option value="URGENT">🚨 अति आवश्यक (Urgent Emergency)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  संबंधित आवेदन क्रमांक / UTR No (वैकल्पिक)
                </label>
                <input
                  type="text"
                  value={newRelatedReqId}
                  onChange={(e) => setNewRelatedReqId(e.target.value)}
                  placeholder="e.g. BICCO/2026/0192 या UTR 4029182390..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  विषय (Subject) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. पैन फाइंड आवेदन पेंडिंग है / वॉलेट में बैलेंस नहीं जुड़ा"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-emerald-500 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  समस्या का पूर्ण विवरण (Description) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="कृपया पूरी जानकारी लिखें ताकि ऑपरेटर तुरंत समाधान कर सके..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-emerald-500 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  स्क्रीनशॉट / रसीद संलग्न करें (Optional Screenshot)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold cursor-pointer transition-all flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    फ़ाइल चुनें (Choose Image/PDF)
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, false)}
                    />
                  </label>

                  {newAttachment && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> संलग्न हो गया (Attached)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2"
                >
                  {isSubmittingTicket ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> सबमिट हो रहा है...
                    </>
                  ) : (
                    'टिकट सबमिट करें (Submit Ticket)'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
