import React, { useState } from 'react';
import { 
  Upload, Printer, CheckCircle2, ArrowRight, FileText, 
  CreditCard, Smartphone, Check, AlertCircle, RefreshCw, X 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ShopSettings, PrintJob } from '../../types/idStudio';
import { generateUpiUri, calculateJobPrice } from '../../lib/idStudio/paymentEngine';
import { renderPdfPages } from '../../lib/idStudio/pdfProcessing';
import { PasswordPromptModal } from './PasswordPromptModal';
import { PdfPasswordRequest } from '../../lib/idStudio/loadPdfWithPassword';

interface CustomerQuickPrintViewProps {
  shopSettings: ShopSettings;
  onJobSubmitted: (job: PrintJob) => void;
  onExit: () => void;
}

export const CustomerQuickPrintView: React.FC<CustomerQuickPrintViewProps> = ({
  shopSettings,
  onJobSubmitted,
  onExit
}) => {
  const [step, setStep] = useState<'UPLOAD' | 'CONFIG' | 'PAY' | 'SUCCESS'>('UPLOAD');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; dataUrl: string }[]>([]);
  const [colorCopies, setColorCopies] = useState<number>(1);
  const [grayCopies, setGrayCopies] = useState<number>(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [currentJob, setCurrentJob] = useState<PrintJob | null>(null);
  const [passwordRequest, setPasswordRequest] = useState<PdfPasswordRequest | null>(null);
  const [passwordError, setPasswordError] = useState<string>();
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [uploadController, setUploadController] = useState<AbortController | null>(null);

  const totalAmount = calculateJobPrice(
    colorCopies,
    grayCopies,
    shopSettings.colorRate,
    shopSettings.grayRate
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const controller = new AbortController();
    setUploadController(controller);
    try {
      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const result = await renderPdfPages(buffer, {
          fileName: file.name,
          signal: controller.signal,
          requestPassword: (request) => {
            setPasswordError(request.reason === 'incorrect' ? 'Incorrect PDF password. Please try again.' : undefined);
            setIsVerifyingPassword(false);
            setPasswordRequest(request);
          },
          onStatus: (status) => {
            if (status === 'verifying') setIsVerifyingPassword(true);
            if (status === 'unlocked') {
              setPasswordRequest(null);
              setPasswordError(undefined);
              setIsVerifyingPassword(false);
            }
          }
        });
        if (result.success && result.pages.length > 0) {
          setUploadedFiles(result.pages.map((p) => ({
            name: `${file.name} - Page ${p.pageNumber}`,
            dataUrl: p.dataUrl
          })));
          setStep('CONFIG');
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedFiles([{ name: file.name, dataUrl: reader.result as string }]);
          setStep('CONFIG');
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setIsProcessingFile(false);
      setUploadController(null);
    }
  };

  const handleProceedToPayment = () => {
    const newJob: PrintJob = {
      id: `JOB-${Date.now().toString().slice(-6)}`,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || undefined,
      printerName: shopSettings.selectedPrinter,
      fileName: uploadedFiles[0]?.name || 'Document.pdf',
      colorCopies,
      grayCopies,
      totalAmount,
      paymentMode: shopSettings.paymentMode,
      paymentStatus: shopSettings.paymentMode === 'no_payment' || shopSettings.paymentMode === 'cash' ? 'paid' : 'pending',
      approvalStatus: shopSettings.approvalBeforePrint ? 'waiting' : 'approved',
      printStatus: 'queued',
      createdAt: Date.now()
    };

    setCurrentJob(newJob);

    if (shopSettings.paymentMode === 'online_upi' || shopSettings.paymentMode === 'paytm_business') {
      setStep('PAY');
    } else {
      onJobSubmitted(newJob);
      setStep('SUCCESS');
    }
  };

  const handleConfirmUpiPaid = () => {
    if (!currentJob) return;
    const paidJob: PrintJob = {
      ...currentJob,
      paymentStatus: 'paid'
    };
    onJobSubmitted(paidJob);
    setStep('SUCCESS');
  };

  const upiUri = currentJob ? generateUpiUri({
    upiId: shopSettings.settlementUpiId,
    accountName: shopSettings.settlementAccountName,
    amount: totalAmount,
    transactionNote: `Print ${currentJob.id}`,
    orderId: currentJob.id
  }) : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Shop Branding Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/60 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">{shopSettings.settlementAccountName || 'eCyberCafe.in Express'}</h2>
              <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Printer Ready & Connected
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload */}
        {step === 'UPLOAD' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Upload Your Document / ID Card</h3>
              <p className="text-xs text-slate-400">PDF, JPG, PNG supported (Aadhaar, PAN, Voter, etc.)</p>
            </div>

            <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-950/50 hover:bg-blue-950/20 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-white">Tap to Select File from Phone</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Direct encrypted transmission</p>
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {isProcessingFile && (
              <div className="flex items-center justify-center gap-2 text-xs text-blue-400 font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Document...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure Copies & Customer Info */}
        {step === 'CONFIG' && (
          <div className="p-6 space-y-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{uploadedFiles[0]?.name}</div>
                <div className="text-[10px] text-emerald-400">File uploaded successfully</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Copies Selection */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">Color Copies (₹{shopSettings.colorRate}/ea)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setColorCopies(Math.max(0, colorCopies - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-blue-400">{colorCopies}</span>
                    <button
                      onClick={() => setColorCopies(colorCopies + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">B&W Copies (₹{shopSettings.grayRate}/ea)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGrayCopies(Math.max(0, grayCopies - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-blue-400">{grayCopies}</span>
                    <button
                      onClick={() => setGrayCopies(grayCopies + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Total Price Banner */}
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider">Total Amount</span>
                <span className="text-lg font-black text-emerald-400 font-mono">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={colorCopies === 0 && grayCopies === 0}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <span>Proceed to Print</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Instant UPI QR Payment */}
        {step === 'PAY' && (
          <div className="p-6 space-y-4 text-center">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Scan & Pay via Any UPI App</h3>
              <p className="text-xs text-slate-400">GPay, PhonePe, Paytm, BHIM</p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-xl inline-block mx-auto">
              <QRCodeSVG value={upiUri} size={180} level="H" includeMargin={true} />
              <div className="text-slate-900 font-black text-sm mt-1">₹{totalAmount.toFixed(2)}</div>
            </div>

            <div className="text-xs text-slate-400">
              Paying to: <b className="text-white">{shopSettings.settlementUpiId}</b>
            </div>

            <button
              onClick={handleConfirmUpiPaid}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>I Have Completed Payment</span>
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'SUCCESS' && (
          <div className="p-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Print Job Sent to Printer!</h3>
              <p className="text-xs text-slate-400">
                Job ID: <b className="text-blue-400 font-mono">{currentJob?.id}</b>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Please collect your high-quality print from the shop counter.
              </p>
            </div>

            <button
              onClick={() => {
                setStep('UPLOAD');
                setUploadedFiles([]);
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
            >
              Print Another Document
            </button>
          </div>
        )}

      </div>

      <PasswordPromptModal
        isOpen={Boolean(passwordRequest)}
        fileName={passwordRequest?.fileName}
        isVerifying={isVerifyingPassword}
        errorMessage={passwordError}
        onUnlock={(password) => {
          if (!passwordRequest || !password) return;
          setPasswordError(undefined);
          setIsVerifyingPassword(true);
          passwordRequest.submitPassword(password);
        }}
        onClose={() => {
          passwordRequest?.cancel();
          uploadController?.abort();
          setPasswordRequest(null);
          setPasswordError(undefined);
          setIsVerifyingPassword(false);
        }}
      />
    </div>
  );
};
