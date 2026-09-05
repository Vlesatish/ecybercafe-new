import React, { useState, useEffect } from 'react';
import { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '../types';
import { 
  LifeBuoy, 
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
  ArrowLeft, 
  Image as ImageIcon,
  ShieldAlert,
  RefreshCw,
  X,
  Trash2,
  User,
  Store,
  Tag,
  Check
} from 'lucide-react';

interface AdminSupportTicketManagerProps {
  onNavigateToRequest?: (requestId: string) => void;
}

export function AdminSupportTicketManager({ onNavigateToRequest }: AdminSupportTicketManagerProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket for Admin Resolution
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.stats) setStats(data.stats);

        if (selectedTicket) {
          const updated = (data.tickets || []).find((t: SupportTicket) => t.id === selectedTicket.id);
          if (updated) {
            setSelectedTicket(updated);
            setAdminNote(updated.adminNotes || '');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const handleTicketEvent = () => fetchTickets();
    window.addEventListener('ticket_event', handleTicketEvent);
    return () => window.removeEventListener('ticket_event', handleTicketEvent);
  }, []);

  const handleSelectTicket = (t: SupportTicket) => {
    setSelectedTicket(t);
    setAdminNote(t.adminNotes || '');
    setReplyText('');
    setReplyAttachment(null);
  };

  // Handle Admin File Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReplyAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send Admin Reply
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!replyText.trim() && !replyAttachment) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: 'usr_admin',
          senderName: 'Helpdesk Officer (Admin)',
          senderRole: 'ADMIN',
          message: replyText.trim(),
          attachmentUrl: replyAttachment || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReplyText('');
        setReplyAttachment(null);
        if (data.ticket) setSelectedTicket(data.ticket);
        fetchTickets();
      }
    } catch (err) {
      console.error('Error replying to ticket:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Update Status & Admin Notes
  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNote.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ticket) setSelectedTicket(data.ticket);
        fetchTickets();
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? / क्या आप इस टिकट को डिलीट करना चाहते हैं?')) {
      return;
    }

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTicket(null);
        fetchTickets();
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200">❓ अन्य</span>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            OPEN (खुला है)
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            IN PROGRESS
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 text-blue-700" />
            RESOLVED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-300">
            <CheckCheck className="w-3 h-3 text-slate-500" />
            CLOSED
          </span>
        );
    }
  };

  // Filtered List
  const filteredTickets = tickets.filter(t => {
    if (activeFilter !== 'ALL' && t.status !== activeFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchUser = t.userName?.toLowerCase().includes(q) || t.userMobile?.includes(q);
      const matchNum = String(t.ticketNumber).includes(q);
      return matchSubject || matchDesc || matchUser || matchNum;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
              <LifeBuoy className="w-3 h-3" /> Admin Ticket Helpdesk
            </span>
            {stats.open > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse">
                {stats.open} नए टिकट्स पेंडिंग
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-white">रीटेलर सपोर्ट टिकट्स प्रबंधन (Support Tickets Manager)</h2>
          <p className="text-xs text-indigo-200/80 mt-0.5 font-medium">
            रीटेलर्स और डिस्ट्रीब्यूटर्स द्वारा दर्ज की गई समस्याओं की समीक्षा करें और त्वरित समाधान भेजें।
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          रिफ्रेश (Sync)
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-400">कुल टिकट्स (Total)</p>
          <p className="text-xl font-black mt-0.5">{stats.total}</p>
        </button>

        <button
          onClick={() => setActiveFilter('OPEN')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'OPEN'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-600">खुले टिकट्स (Open)</p>
            {stats.open > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
          </div>
          <p className="text-xl font-black mt-0.5 text-emerald-700">{stats.open}</p>
        </button>

        <button
          onClick={() => setActiveFilter('IN_PROGRESS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'IN_PROGRESS'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
          }`}
        >
          <p className="text-[11px] font-bold text-amber-600">प्रक्रियाधीन (In Progress)</p>
          <p className="text-xl font-black mt-0.5 text-amber-700">{stats.inProgress}</p>
        </button>

        <button
          onClick={() => setActiveFilter('RESOLVED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'RESOLVED'
              ? 'bg-blue-700 text-white border-blue-700 shadow-md ring-2 ring-blue-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'
          }`}
        >
          <p className="text-[11px] font-bold text-blue-600">समाधान हो चुके (Resolved)</p>
          <p className="text-xl font-black mt-0.5 text-blue-700">{stats.resolved}</p>
        </button>

        <button
          onClick={() => setActiveFilter('CLOSED')}
          className={`p-3.5 rounded-xl border text-left transition-all col-span-2 md:col-span-1 ${
            activeFilter === 'CLOSED'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-500">बंद (Closed)</p>
          <p className="text-xl font-black mt-0.5 text-slate-700">{stats.closed}</p>
        </button>
      </div>

      {/* Main Layout: Master-Detail view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Ticket List */}
        <div className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
          {/* Filters Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="खोजें (ID, Subject, Retailer)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-indigo-500 font-medium"
              >
                <option value="ALL">सभी श्रेणियां (All Categories)</option>
                <option value="SERVICE_REQUEST">📝 आवेदन स्टेटस</option>
                <option value="WALLET_PAYMENT">💰 वॉलेट / पेमेंट</option>
                <option value="CORRECTION">🔄 सुधार / Re-apply</option>
                <option value="TECHNICAL">⚙️ तकनीकी समस्या</option>
                <option value="OTHER">❓ अन्य</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                टिकट्स लोड हो रहे हैं...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                कोई टिकट नहीं मिला।
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`p-3.5 transition-all cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-indigo-600'
                        : t.status === 'OPEN'
                        ? 'hover:bg-slate-50 border-l-emerald-500'
                        : 'hover:bg-slate-50 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-black text-slate-800">
                          #{t.ticketNumber}
                        </span>
                        {getCategoryBadge(t.category)}
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    <h4 className="text-xs font-black text-slate-800 line-clamp-1">
                      {t.subject}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span className="font-medium truncate max-w-[180px]">
                        👤 {t.userName} ({t.userMobile || 'No mobile'})
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Ticket Detail & Resolution Panel */}
        <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Detail Header */}
              <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white lg:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300">
                      Ticket #{selectedTicket.ticketNumber}
                    </span>
                    {getCategoryBadge(selectedTicket.category)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>

                  <button
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-black text-white">{selectedTicket.subject}</h3>

                {/* Retailer Info Strip */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">रीटेलर / यूजर:</span>
                    <span className="font-bold text-white">{selectedTicket.userName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">मोबाइल नंबर:</span>
                    <a href={`tel:${selectedTicket.userMobile}`} className="font-mono text-emerald-400 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedTicket.userMobile || 'N/A'}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">दुकान / केंद्र:</span>
                    <span className="text-slate-300 truncate block">{selectedTicket.storeName || 'Cyber Cafe'}</span>
                  </div>
                </div>

                {selectedTicket.relatedRequestId && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-amber-300 flex items-center justify-between">
                    <span>संबंधित आवेदन क्रमांक: <b className="font-mono text-white">{selectedTicket.relatedRequestId}</b></span>
                    {onNavigateToRequest && (
                      <button
                        onClick={() => onNavigateToRequest(selectedTicket.relatedRequestId!)}
                        className="px-2 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-[11px] font-bold"
                      >
                        आवेदन खोलें →
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">स्थिति बदलें (Change Status):</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    disabled={isUpdatingStatus || selectedTicket.status === 'IN_PROGRESS'}
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                    className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    🟡 In Progress
                  </button>

                  <button
                    disabled={isUpdatingStatus || selectedTicket.status === 'RESOLVED'}
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    ✅ Mark Resolved
                  </button>

                  <button
                    disabled={isUpdatingStatus || selectedTicket.status === 'CLOSED'}
                    onClick={() => handleUpdateStatus('CLOSED')}
                    className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    🔒 Close Ticket
                  </button>
                </div>
              </div>

              {/* Admin Note Box */}
              <div className="p-3 bg-amber-50/50 border-b border-amber-200/60 flex items-center gap-2">
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="एडमिन नोट / समाधान टिप्पणी लिखें (Admin Note for User)..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs text-slate-800 focus:outline-hidden"
                />
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus(selectedTicket.status)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  नोट सेव करें
                </button>
              </div>

              {/* Conversation Messages */}
              <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto bg-slate-50/30 flex-1">
                {selectedTicket.messages && selectedTicket.messages.map((msg, index) => {
                  const isAdmin = msg.senderRole === 'ADMIN' || msg.senderRole === 'OPERATOR';
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-600">
                          {isAdmin ? '🛡️ Admin (Helpdesk)' : `👤 ${msg.senderName || 'Retailer'}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isAdmin
                            ? 'bg-indigo-700 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>

                        {msg.attachmentUrl && (
                          <div className="mt-2 pt-2 border-t border-slate-200/40">
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/10 hover:bg-black/20 text-[11px] font-bold"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              संलग्न अटैचमेंट देखें (Attachment)
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Admin Reply Box */}
              <form onSubmit={handleSendAdminReply} className="p-3 bg-white border-t border-slate-200">
                {replyAttachment && (
                  <div className="mb-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-800">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      स्क्रीनशॉट / रसीद संलग्न है
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyAttachment(null)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer transition-all shrink-0">
                    <Paperclip className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="रीटेलर को समाधान या उत्तर लिखें (Write resolution message)..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!replyText.trim() && !replyAttachment)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    जवाब भेजें
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center h-full">
              <LifeBuoy className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="text-sm font-bold text-slate-700">कोई टिकट नहीं चुना गया</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                बाईं ओर की सूची से किसी भी टिकट पर क्लिक करके उसका पूरा विवरण, यूजर चैट और समाधान भेजें।
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
