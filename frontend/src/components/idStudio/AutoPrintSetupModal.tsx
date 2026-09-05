import React, { useState, useEffect } from 'react';
import { 
  Printer, Settings, CreditCard, QrCode, List, CheckCircle2, 
  AlertCircle, Download, RefreshCw, X, Sparkles, ExternalLink, 
  ShieldCheck, ArrowRight, Play, Square, Copy, Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ShopSettings, LocalAgentInfo, PrintJob } from '../../types/idStudio';
import { AutoPrintAgentService } from '../../lib/idStudio/autoPrintAgent';

interface AutoPrintSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopSettings: ShopSettings;
  onUpdateSettings: (settings: Partial<ShopSettings>) => void;
  printJobs?: PrintJob[];
  onApproveJob?: (jobId: string) => void;
  onRejectJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
}

export const AutoPrintSetupModal: React.FC<AutoPrintSetupModalProps> = ({
  isOpen,
  onClose,
  shopSettings,
  onUpdateSettings,
  printJobs = [],
  onApproveJob,
  onRejectJob,
  onRetryJob
}) => {
  const [activeTab, setActiveTab] = useState<'INSTALL' | 'SETTINGS' | 'PAYMENT' | 'QR' | 'PRINT_LIST'>('SETTINGS');
  const [agentInfo, setAgentInfo] = useState<LocalAgentInfo>({
    installed: true,
    running: true,
    version: '2.4.0',
    port: 18880,
    apiUrl: 'http://127.0.0.1:18880',
    printers: [
      'Windows Default Printer',
      'Epson L805 Photo Series (PVC Tray)',
      'Epson L8050 Series (CR-80 Tray)',
      'Canon G3010 Series Color',
      'HP LaserJet Pro M404dn (Duplex)',
      'Microsoft Print to PDF'
    ],
    status: 'RUNNING',
    isMock: true
  });
  const [isCheckingAgent, setIsCheckingAgent] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const agentService = AutoPrintAgentService.getInstance();

  useEffect(() => {
    if (isOpen) {
      checkAgentStatus();
    }
  }, [isOpen]);

  const checkAgentStatus = async () => {
    setIsCheckingAgent(true);
    try {
      const info = await agentService.checkAgentHealth();
      setAgentInfo(info);
      if (info.printers.length > 0 && !shopSettings.selectedPrinter) {
        onUpdateSettings({ selectedPrinter: info.printers[0] });
      }
    } finally {
      setIsCheckingAgent(false);
    }
  };

  const handleCopyCustomerUrl = () => {
    navigator.clipboard.writeText(shopSettings.qrUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Auto Print & Shop Automation Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Self-Service Customer QR Uploads, Automatic Spooling & UPI Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-[11px] font-bold">
              <button
                onClick={() => onUpdateSettings({ language: 'HI_EN' })}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  shopSettings.language === 'HI_EN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HI-EN
              </button>
              <button
                onClick={() => onUpdateSettings({ language: 'EN' })}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  shopSettings.language === 'EN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 gap-1 overflow-x-auto">
          {[
            { id: 'SETTINGS', label: '1. Settings', icon: Settings },
            { id: 'PAYMENT', label: '2. Rates & UPI', icon: CreditCard },
            { id: 'QR', label: '3. Customer QR', icon: QrCode },
            { id: 'PRINT_LIST', label: `4. Jobs Queue (${printJobs.length})`, icon: List },
            { id: 'INSTALL', label: '5. Windows Agent', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-black flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-950/30">
          
          {/* 1. SETTINGS TAB */}
          {activeTab === 'SETTINGS' && (
            <div className="max-w-2xl space-y-4">
              
              {/* Printer Hardware Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Target Hardware Printer
                  </label>
                  <button
                    onClick={checkAgentStatus}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingAgent ? 'animate-spin' : ''}`} />
                    <span>Refresh Printers</span>
                  </button>
                </div>
                <select
                  value={shopSettings.selectedPrinter}
                  onChange={(e) => onUpdateSettings({ selectedPrinter: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {agentInfo.printers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Select your physical photo/PVC printer (e.g. Epson L805 or Canon G3010)
                </p>
              </div>

              {/* Shop Print Rule */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Shop Printing Rule (ग्राहकों के लिए नियम)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'customer_choice', label: 'Customer Choice', desc: 'User picks Color or B/W' },
                    { id: 'only_color', label: 'Only Color', desc: 'All jobs forced Color' },
                    { id: 'only_gray', label: 'Only B&W / Gray', desc: 'All jobs forced B&W' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onUpdateSettings({ shopPrintRule: r.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        shopSettings.shopPrintRule === r.id
                          ? 'bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-black">{r.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval Before Print Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-xs font-black text-white">Manual Approval Before Print</span>
                  <p className="text-[10px] text-slate-400">
                    Require shop operator to review and click 'Approve' before spooling
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={shopSettings.approvalBeforePrint}
                  onChange={(e) => onUpdateSettings({ approvalBeforePrint: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

            </div>
          )}

          {/* 2. PAYMENT & RATES TAB */}
          {activeTab === 'PAYMENT' && (
            <div className="max-w-2xl space-y-4">
              
              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Payment Collection Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'no_payment', label: 'No Payment', desc: 'Direct Free Print' },
                    { id: 'cash', label: 'Cash at Counter', desc: 'Manual Cash Collection' },
                    { id: 'online_upi', label: 'Dynamic UPI QR', desc: 'Instant Shop QR Code' },
                    { id: 'paytm_business', label: 'Paytm Business', desc: 'Direct Merchant MID' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onUpdateSettings({ paymentMode: m.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        shopSettings.paymentMode === m.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-white ring-2 ring-emerald-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-black">{m.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Per Copy Rates */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Color ID / Page Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={shopSettings.colorRate}
                    onChange={(e) => onUpdateSettings({ colorRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    B&W / Gray Page Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={shopSettings.grayRate}
                    onChange={(e) => onUpdateSettings({ grayRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Settlement UPI Info */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Shop UPI Settlement Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">Settlement UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. yourshop@okhdfcbank"
                      value={shopSettings.settlementUpiId}
                      onChange={(e) => onUpdateSettings({ settlementUpiId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">UPI Account Name</label>
                    <input
                      type="text"
                      placeholder="e.g. AK Cyber Cafe & Printing"
                      value={shopSettings.settlementAccountName}
                      onChange={(e) => onUpdateSettings({ settlementAccountName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 3. CUSTOMER QR TAB */}
          {activeTab === 'QR' && (
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-900 rounded-2xl border border-slate-800 max-w-3xl">
              
              {/* Standee QR Display */}
              <div className="p-5 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center shrink-0">
                <div className="text-slate-900 text-xs font-black tracking-wider uppercase mb-2">
                  eCyberCafe.in Quick Print
                </div>
                <QRCodeSVG
                  value={shopSettings.qrUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
                <div className="text-[10px] text-slate-600 font-bold mt-2">
                  Scan to Upload & Print
                </div>
              </div>

              {/* QR Management Controls */}
              <div className="space-y-3 flex-1 text-left">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">
                    Shop Self-Service Upload Standee
                  </h4>
                  <p className="text-xs text-slate-400">
                    Stick this QR code on your cyber cafe counter. Customers scan it with their phone, select their document, pay via UPI, and it prints directly on your printer!
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-400 font-mono truncate">
                    {shopSettings.qrUrl}
                  </span>
                  <button
                    onClick={handleCopyCustomerUrl}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const newToken = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                      onUpdateSettings({
                        shopToken: newToken,
                        qrUrl: `${window.location.origin}/quick-print/${newToken}`
                      });
                      window.dispatchEvent(new CustomEvent('app_toast', { detail: '🔄 New QR Code generated! Old token invalidated.' }));
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rotate Token</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* 4. JOBS QUEUE TAB */}
          {activeTab === 'PRINT_LIST' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Live Spooler Queue ({printJobs.length} Jobs)
                </span>
                <span className="text-[11px] text-slate-400">
                  Agent: <b className="text-emerald-400">Online & Polling</b>
                </span>
              </div>

              {printJobs.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No active print jobs in queue. Scan the Customer QR to send a print job!
                </div>
              ) : (
                <div className="space-y-2">
                  {printJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">{job.id}</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            {job.printStatus.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {job.customerName} • {job.colorCopies} Color, {job.grayCopies} B&W • Total ₹{job.totalAmount}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.approvalStatus === 'waiting' && onApproveJob && (
                          <button
                            onClick={() => onApproveJob(job.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {job.printStatus === 'failed' && onRetryJob && (
                          <button
                            onClick={() => onRetryJob(job.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. WINDOWS AGENT TAB */}
          {activeTab === 'INSTALL' && (
            <div className="max-w-2xl space-y-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    eCyberCafe.in Windows Background Spooler Agent
                  </h4>
                  <p className="text-xs text-slate-400">
                    Runs silently in system tray and sends print jobs directly to your Epson/Canon printers
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Agent Status: </span>
                  <b className="text-emerald-400">Connected & Listening (v{agentInfo.version})</b>
                </div>
                <button
                  onClick={checkAgentStatus}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Re-Check Connection
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <p className="font-bold text-white">Installation Steps:</p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                  <li>Download <b>eCyberCafeAgent-Setup.exe</b> (Windows 10/11 64-bit).</li>
                  <li>Run the installer and grant administrator printer permissions.</li>
                  <li>Click 'Verify Connection' above to automatically pair your shop ID.</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('app_toast', { detail: '📥 Downloading eCyberCafeAgent-Setup.exe...' }));
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Download Windows Agent (v2.4.0)</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
