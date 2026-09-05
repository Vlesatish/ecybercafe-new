import React, { useState, useEffect } from 'react';
import { ServiceRequest } from '../types';
import { 
  X, 
  Printer, 
  FileText, 
  Upload, 
  CheckCircle, 
  Sparkles, 
  Eye, 
  Download, 
  Zap, 
  AlertCircle,
  FileCheck,
  RefreshCw,
  Sliders,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

interface GeneratePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest | null;
  onPdfGeneratedSuccess?: (updatedRequest: ServiceRequest) => void;
}

interface TemplateOption {
  name: string;
  path: string;
  size: number;
  default: boolean;
}

export const GeneratePdfModal: React.FC<GeneratePdfModalProps> = ({
  isOpen,
  onClose,
  request,
  onPdfGeneratedSuccess
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('DEFAULT');
  const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<TemplateOption[]>([]);
  
  // Progress & Status States
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Output State
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(2);
  const [isSavedToDb, setIsSavedToDb] = useState(false);

  // Position Tuner Accordion Toggle
  const [showPositionTuner, setShowPositionTuner] = useState(false);
  const [photoX, setPhotoX] = useState<number>(445);
  const [photoY, setPhotoY] = useState<number>(626);
  const [sigX, setSigX] = useState<number>(360);
  const [sigY, setSigY] = useState<number>(280);

  // Fetch Available Templates on mount/open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/pdf-templates')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAvailableTemplates(data);
          }
        })
        .catch(err => console.error('Error fetching templates:', err));

      if (request?.generatedPdf) {
        setGeneratedPdfUrl(request.generatedPdf);
      } else {
        setGeneratedPdfUrl(null);
      }
      setIsSavedToDb(false);
      setErrorMsg('');
      setProgressStep(0);
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const fd = request.formData || {};

  // Extract Applicant Details for display
  const applicantName = fd.applicant_name || fd.full_name || fd.name || request.retailerName || 'N/A';
  const fatherName = fd.father_name || fd.fatherName || 'N/A';
  const motherName = fd.mother_name || fd.motherName || 'N/A';
  const dob = fd.dob || fd.date_of_birth || 'N/A';
  const gender = fd.gender || 'Male';
  const mobile = fd.mobile_no || fd.mobile || fd.mobileNumber || request.retailerMobile || 'N/A';
  const aadhaar = fd.aadhaar_no || fd.aadhaar || 'N/A';
  const address = fd.address || fd.full_address || [fd.village, fd.block, fd.district, fd.state].filter(Boolean).join(', ') || 'N/A';

  // Find photo & signature from formData
  let photoPreview: string | null = null;
  let signPreview: string | null = null;

  for (const [k, v] of Object.entries(fd)) {
    if (typeof v === 'string') {
      const kl = k.toLowerCase();
      if (!photoPreview && (kl.includes('photo') || kl.includes('passport') || kl.includes('image'))) {
        if (v.startsWith('data:image/') || v.startsWith('/uploads/') || v.startsWith('http')) photoPreview = v;
      }
      if (!signPreview && (kl.includes('sign') || kl.includes('signature'))) {
        if (v.startsWith('data:image/') || v.startsWith('/uploads/') || v.startsWith('http')) signPreview = v;
      }
    }
  }

  const handleCustomTemplateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorMsg('⚠️ Please upload a valid PDF file only (.pdf)');
        return;
      }
      setErrorMsg('');
      setCustomTemplateFile(file);
      setSelectedTemplate('CUSTOM');
    }
  };

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setProgressStep(1);
    setProgressMessage('📥 Loading Template PDF...');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('requestId', request.id);

      if (selectedTemplate === 'CUSTOM' && customTemplateFile) {
        formDataToSend.append('template', customTemplateFile);
      }

      // Pass custom position overrides if modified
      const coords = {
        photo: { x: photoX, y: photoY, width: 115, height: 135, page: 1 },
        signature: { x: sigX, y: sigY, width: 200, height: 75, page: 2 }
      };
      formDataToSend.append('customCoordinates', JSON.stringify(coords));

      // Animated steps
      setTimeout(() => {
        setProgressStep(2);
        setProgressMessage('🖼️ Processing Photo & Transparent Signature...');
      }, 600);

      setTimeout(() => {
        setProgressStep(3);
        setProgressMessage('✍️ Overlaying Applicant Text Fields...');
      }, 1200);

      setTimeout(() => {
        setProgressStep(4);
        setProgressMessage('📎 Merging Retailer Attachment PDF...');
      }, 1800);

      const response = await fetch('/api/admin/generate-final-pdf', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setTimeout(() => {
          setProgressStep(5);
          setProgressMessage('✅ Single Final PDF Generated Successfully!');
          setGeneratedPdfUrl(data.pdfUrl);
          setTotalPages(data.totalPages || 2);
          setIsSavedToDb(true);
          setIsGenerating(false);

          if (data.request && onPdfGeneratedSuccess) {
            onPdfGeneratedSuccess(data.request);
          }
        }, 2200);
      } else {
        const err = await response.json();
        setErrorMsg(err.error || 'Failed to generate PDF');
        setIsGenerating(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error while generating PDF');
      setIsGenerating(false);
    }
  };

  const handlePrintPdf = () => {
    if (!generatedPdfUrl) return;
    const printWindow = window.open(generatedPdfUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
      setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Printer className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">🖨️ Generate Final PDF</h2>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-black">
                  Request #{request.requestNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {request.serviceTitle} • Retailer: <strong className="text-slate-200">{request.retailerName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300 font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: TEMPLATE SELECTION & UPLOAD */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-blue-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                1. Select / Upload Government Template PDF
              </h3>
              <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded-lg text-slate-400 font-medium">
                📄 Accepts .PDF only (Usually 2-Page Form)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Default Template Radio Choice */}
              <label 
                onClick={() => setSelectedTemplate('DEFAULT')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedTemplate === 'DEFAULT'
                    ? 'bg-blue-600/15 border-blue-500/80 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <input 
                  type="radio" 
                  name="templateChoice" 
                  checked={selectedTemplate === 'DEFAULT'}
                  onChange={() => setSelectedTemplate('DEFAULT')}
                  className="mt-1 text-blue-500"
                />
                <div className="space-y-1">
                  <p className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    🏛️ Default Govt Application Form (2-Page)
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Standard 2-page form template with pre-positioned Photo, Signature, and Applicant Information boxes.
                  </p>
                </div>
              </label>

              {/* Upload Custom Template */}
              <label 
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative ${
                  selectedTemplate === 'CUSTOM'
                    ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <input 
                  type="radio" 
                  name="templateChoice" 
                  checked={selectedTemplate === 'CUSTOM'}
                  onChange={() => setSelectedTemplate('CUSTOM')}
                  className="mt-1 text-indigo-500"
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="font-extrabold text-xs text-white flex items-center justify-between">
                    <span>📤 Upload Custom Template PDF</span>
                    {customTemplateFile && <span className="text-[10px] text-emerald-400 font-bold">✓ Selected</span>}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {customTemplateFile ? customTemplateFile.name : 'Admin can upload any new government form PDF anytime.'}
                  </p>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors mt-1 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{customTemplateFile ? 'Change PDF' : 'Browse PDF File'}</span>
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={handleCustomTemplateSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 2: APPLICANT DATA & ATTACHMENT PREVIEW */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-sm text-blue-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              2. Applicant Data & Auto-Detected Assets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Applicant Fields List */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                  Extracted Form Data
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Name:</span>
                    <strong className="text-white font-semibold">{applicantName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Father's Name:</span>
                    <strong className="text-white font-semibold">{fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Mother's Name:</span>
                    <strong className="text-white font-semibold">{motherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DOB / Gender:</span>
                    <strong className="text-white font-semibold">{dob} ({gender})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Mobile Number:</span>
                    <strong className="text-white font-semibold">{mobile}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Aadhaar Number:</span>
                    <strong className="text-white font-semibold">{aadhaar}</strong>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Full Address:</span>
                  <p className="text-slate-300 font-medium text-[11px]">{address}</p>
                </div>
              </div>

              {/* Photo & Signature Preview Cards */}
              <div className="space-y-2 flex flex-col">
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center gap-3">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Applicant Photo" className="w-12 h-14 object-cover rounded-lg border border-slate-700 shrink-0" />
                  ) : (
                    <div className="w-12 h-14 bg-slate-800 rounded-lg border border-dashed border-slate-700 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Passport Photo</p>
                    <p className={`text-[10px] ${photoPreview ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}`}>
                      {photoPreview ? '✓ Photo Detected (Auto Crop)' : '⚠️ Default Placeholder'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center gap-3">
                  {signPreview ? (
                    <img src={signPreview} alt="Signature" className="w-16 h-10 object-contain rounded-lg border border-slate-700 bg-white/5 shrink-0" />
                  ) : (
                    <div className="w-16 h-10 bg-slate-800 rounded-lg border border-dashed border-slate-700 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Signature Image</p>
                    <p className={`text-[10px] ${signPreview ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}`}>
                      {signPreview ? '✓ Transparent PNG Active' : '⚠️ Default Sign Box'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Position Fine Tuner Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPositionTuner(!showPositionTuner)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showPositionTuner ? 'Hide Position Fine-Tuner Coordinates ▲' : 'Optional: Fine-Tune Photo & Signature Position Coordinates ▼'}</span>
              </button>

              {showPositionTuner && (
                <div className="mt-2.5 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs animate-fadeIn">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block">Photo X (pt):</label>
                      <input 
                        type="number" 
                        value={photoX} 
                        onChange={(e) => setPhotoX(Number(e.target.value))} 
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block">Photo Y (pt):</label>
                      <input 
                        type="number" 
                        value={photoY} 
                        onChange={(e) => setPhotoY(Number(e.target.value))} 
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block">Signature X (pt):</label>
                      <input 
                        type="number" 
                        value={sigX} 
                        onChange={(e) => setSigX(Number(e.target.value))} 
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block">Signature Y (pt):</label>
                      <input 
                        type="number" 
                        value={sigY} 
                        onChange={(e) => setSigY(Number(e.target.value))} 
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GENERATE ACTION BUTTON & PROGRESS ANIMATION */}
          {!generatedPdfUrl && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
              {isGenerating ? (
                <div className="space-y-4 max-w-md mx-auto py-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center animate-spin">
                    <RefreshCw className="w-6 h-6" />
                  </div>

                  <div className="space-y-2">
                    <p className="font-black text-sm text-blue-400">{progressMessage}</p>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-md"
                        style={{ width: `${(progressStep / 5) * 100}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Step {progressStep} of 5 • Automatically embedding photo, transparent signature, & merging retailer PDF
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    className="px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-blue-600/30 active:scale-95 inline-flex items-center gap-2.5 cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-white/20" />
                    <span>🖨️ Generate Final PDF Now</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Generates 1 single merged PDF: Filled Template (2 Pages) + Retailer Attached Document PDF
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: GENERATED PDF PREVIEW & DOWNLOAD / PRINT ACTIONS */}
          {generatedPdfUrl && (
            <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-emerald-400">
                      🎉 Final Single PDF Generated Successfully!
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Merged Document: {totalPages} Total Pages (Template + Retailer Attachments)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Embedded PDF Viewer */}
              <div className="w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                <iframe
                  src={`${generatedPdfUrl}#toolbar=1&navpanes=0`}
                  title="Generated Final PDF Preview"
                  className="w-full h-full border-none"
                />
              </div>

              {/* Bottom Action Controls */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>
                    Saved in DB: <strong className="text-emerald-400 font-mono">{generatedPdfUrl}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={generatedPdfUrl}
                    download={`Final_Document_${request.requestNumber}.pdf`}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Download PDF</span>
                  </a>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Print PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Done & Close</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
