import React, { useState, useRef } from 'react';
import { 
  X, QrCode, Printer, Download, Sparkles, Lock, Store, 
  CreditCard, Check, Copy, Share2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentQRModal: React.FC<PaymentQRModalProps> = ({ isOpen, onClose }) => {
  const [upiId, setUpiId] = useState<string>('ecybercafe@upi');
  const [payeeName, setPayeeName] = useState<string>('DIGITAL SEVA KENDRA');
  const [amount, setAmount] = useState<string>('50');
  const [isLockedAmount, setIsLockedAmount] = useState<boolean>(true);
  const [note, setNote] = useState<string>('Cyber Cafe & Printing Services');
  const [phone, setPhone] = useState<string>('+91 9876543210');
  const [standeeTheme, setStandeeTheme] = useState<'bhim_tricolor' | 'soundbox_indigo' | 'paytm_blue'>('bhim_tricolor');

  const standeePrintRef = useRef<HTMLDivElement>(null);

  // Generate UPI URI
  // Format: upi://pay?pa=address@upi&pn=PayeeName&am=50&cu=INR&tn=Note
  const getUpiUrl = () => {
    let url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
    if (isLockedAmount && amount && parseFloat(amount) > 0) {
      url += `&am=${parseFloat(amount).toFixed(2)}`;
    }
    if (note.trim()) {
      url += `&tn=${encodeURIComponent(note)}`;
    }
    return url;
  };

  const handlePrintStandee = () => {
    if (!standeePrintRef.current) return;
    const content = standeePrintRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Standee - ${payeeName}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
              * { box-sizing: border-box; }
              .standee-container { width: 100%; max-width: 450px; margin: 0 auto; text-align: center; }
            </style>
          </head>
          <body>
            <div class="standee-container">
              ${content}
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Customer Payment Locked QR Standee (पेमेंट क्यूआर मेकर)
                </h3>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase">
                  UPI • BHIM • All Apps
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Generate customized UPI QR codes with fixed billing amount for counter payments & printable shop standees.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50">
          
          {/* Left Column: Configuration Settings (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Store className="w-4 h-4 text-amber-600" />
                <span>Shop & UPI Details</span>
              </h4>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. mobile@upi or name@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600">
                    Locked Amount (₹)
                  </label>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-amber-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLockedAmount}
                      onChange={(e) => setIsLockedAmount(e.target.checked)}
                      className="accent-amber-600 rounded"
                    />
                    <span>Fixed Amount Lock</span>
                  </label>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    disabled={!isLockedAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-black text-emerald-700 disabled:opacity-50 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Payment Remark / Note
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Support Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Standee Theme Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <label className="text-xs font-bold text-slate-800">Standee Visual Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bhim_tricolor', label: '🇮🇳 Tricolor BHIM' },
                  { id: 'soundbox_indigo', label: '🔊 Soundbox Pro' },
                  { id: 'paytm_blue', label: '💙 Official Blue' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setStandeeTheme(t.id as any)}
                    className={`p-2 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer ${
                      standeeTheme === t.id
                        ? 'bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-200 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Live Printable Standee Preview & Actions (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3 items-center">
            
            {/* Top action bar */}
            <div className="w-full flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-black text-slate-800">
                Printable Counter Standee (Ready for Lamination & Stand)
              </span>

              <button
                onClick={handlePrintStandee}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>1-Click Print Standee</span>
              </button>
            </div>

            {/* Standee Container (Print Target) */}
            <div className="w-full bg-slate-200 p-4 rounded-2xl flex items-center justify-center overflow-y-auto max-h-[64vh]">
              <div
                ref={standeePrintRef}
                className="bg-white w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 text-slate-800 flex flex-col items-center"
              >
                {/* Top Banner based on theme */}
                {standeeTheme === 'bhim_tricolor' ? (
                  <div className="w-full bg-gradient-to-r from-orange-500 via-white to-green-600 p-3 text-center border-b-2 border-slate-800">
                    <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase inline-block shadow-md">
                      BHIM UPI • ACCEPTED HERE
                    </div>
                  </div>
                ) : standeeTheme === 'soundbox_indigo' ? (
                  <div className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-3 text-center border-b-2 border-slate-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      🔊 SMART INSTANT VOICE AUDIO
                    </span>
                  </div>
                ) : (
                  <div className="w-full bg-sky-600 text-white p-3 text-center border-b-2 border-slate-800">
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      ALL UPI APPS ACCEPTED
                    </span>
                  </div>
                )}

                {/* Shop Name & Amount */}
                <div className="p-4 text-center w-full space-y-1">
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    {payeeName.toUpperCase()}
                  </h3>
                  
                  {isLockedAmount && amount && parseFloat(amount) > 0 && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-sm font-black border border-emerald-300 shadow-2xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Amount: ₹{parseFloat(amount).toFixed(2)}</span>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 font-bold pt-1">
                    Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                  </p>
                </div>

                {/* Big QR Code */}
                <div className="p-3 bg-white border-2 border-dashed border-slate-300 rounded-2xl shadow-inner my-1">
                  <QRCodeSVG
                    value={getUpiUrl()}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* Footer Badges & UPI ID */}
                <div className="w-full bg-slate-100 p-3 text-center border-t border-slate-200 space-y-1">
                  <p className="text-[10px] font-mono font-bold text-slate-700">
                    UPI ID: <span className="text-blue-600">{upiId}</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Help: {phone} • Note: {note}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[8px] font-black">GPAY</span>
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[8px] font-black">PHONEPE</span>
                    <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded text-[8px] font-black">PAYTM</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[8px] font-black">BHIM</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
