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
  Image as ImageIcon,
  Search,
  User,
  FileType,
  Check,
  ArrowRight
} from 'lucide-react';

interface TwoPdfStamperModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRequest?: ServiceRequest | null;
  allRequests?: ServiceRequest[];
}

export const TwoPdfStamperModal: React.FC<TwoPdfStamperModalProps> = ({
  isOpen,
  onClose,
  initialRequest,
  allRequests = []
}) => {
  // Selected Request from History
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  // Template Choice
  const [templateType, setTemplateType] = useState<'DEFAULT' | 'CUSTOM'>('DEFAULT');
  const [customFormPdfFile, setCustomFormPdfFile] = useState<File | null>(null);

  // Uploaded / Extracted Assets
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);

  const [dobDocFile, setDobDocFile] = useState<File | null>(null);
  const [dobDocPreview, setDobDocPreview] = useState<string | null>(null);

  // Coordinate Overrides
  const [showTuner, setShowTuner] = useState(false);
  const [leftPhotoX, setLeftPhotoX] = useState<number>(25);
  const [leftPhotoY, setLeftPhotoY] = useState<number>(825);
  const [rightPhotoX, setRightPhotoX] = useState<number>(630);
  const [rightPhotoY, setRightPhotoY] = useState<number>(810);

  const [leftSigX, setLeftSigX] = useState<number>(20);
  const [leftSigY, setLeftSigY] = useState<number>(780);
  const [rightSigX, setRightSigX] = useState<number>(550);
  const [rightSigY, setRightSigY] = useState<number>(70);

  // Progress & Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);

  // Results (2 PDFs)
  const [activeTab, setActiveTab] = useState<'PDF1' | 'PDF2'>('PDF1');
  const [resultPdfs, setResultPdfs] = useState<{
    pdf1Url: string;
    pdf2Url: string;
    filename1: string;
    filename2: string;
    pdf1Pages: number;
    pdf2Pages: number;
  } | null>(null);

  // Load initial request or first request from list
  useEffect(() => {
    if (isOpen) {
      const req = initialRequest || (allRequests.length > 0 ? allRequests[0] : null);
      if (req) {
        loadRequestData(req);
      }
      setResultPdfs(null);
      setErrorMsg('');
      setIsGenerating(false);
      setProgressStep(0);
    }
  }, [isOpen, initialRequest]);

  if (!isOpen) return null;

  const loadRequestData = (req: ServiceRequest) => {
    setSelectedRequestId(req.id);
    setSelectedRequest(req);

    const fd = req.formData || {};
    let foundPhoto: string | null = null;
    let foundSign: string | null = null;
    let foundAadhaar: string | null = null;
    let foundDob: string | null = null;

    // Collect all uploaded file/image/PDF URLs in order
    const fileEntries: { key: string; labelKey: string; url: string }[] = [];

    for (const [k, v] of Object.entries(fd)) {
      if (typeof v === 'string' && v.trim().length > 0) {
        const val = v.trim();
        const isUrlOrData = val.startsWith('data:') || val.startsWith('/uploads/') || val.startsWith('http://') || val.startsWith('https://');
        if (isUrlOrData) {
          fileEntries.push({ key: k, labelKey: k.toLowerCase(), url: val });
        }
      }
    }

    // Step 1: Keyword matching for Photo & Signature
    for (const item of fileEntries) {
      const lk = item.labelKey;
      if (!foundPhoto && (lk.includes('photo') || lk.includes('passport') || lk.includes('image') || lk.includes('pic') || lk.includes('avatar') || lk === 'f_photo')) {
        foundPhoto = item.url;
      }
      if (!foundSign && (lk.includes('sign') || lk.includes('signature') || lk === 'f_sign')) {
        foundSign = item.url;
      }
    }

    // Fallback Photo / Signature if not found by keyword
    if (!foundPhoto || !foundSign) {
      for (const item of fileEntries) {
        const isImg = item.url.startsWith('data:image/') || item.url.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
        if (isImg) {
          if (!foundPhoto) foundPhoto = item.url;
          else if (!foundSign && item.url !== foundPhoto) foundSign = item.url;
        }
      }
    }

    // Step 2: Keyword matching for Aadhaar and DOB proof documents
    for (const item of fileEntries) {
      if (item.url === foundPhoto || item.url === foundSign) continue;
      const lk = item.labelKey;
      if (!foundAadhaar && (lk.includes('aadhaar') || lk.includes('adhar') || lk.includes('aadhar') || lk.includes('id_proof') || lk.includes('identity') || lk.includes('doc1') || lk.includes('file1') || lk.includes('pdf1'))) {
        foundAadhaar = item.url;
      }
      if (!foundDob && (lk.includes('dob') || lk.includes('birth') || lk.includes('age_proof') || lk.includes('proof') || lk.includes('doc2') || lk.includes('file2') || lk.includes('pdf2'))) {
        foundDob = item.url;
      }
    }

    // Step 3: Generic document/PDF assignment for Aadhaar & DOB if still null
    for (const item of fileEntries) {
      if (item.url === foundPhoto || item.url === foundSign) continue;
      if (!foundAadhaar) {
        foundAadhaar = item.url;
      } else if (!foundDob && item.url !== foundAadhaar) {
        foundDob = item.url;
      }
    }

    // Step 4: Fallback from request attachments if still missing
    if (!foundAadhaar || !foundDob) {
      const attachments = [req.outputAttachmentUrl, req.generatedPdf].filter(Boolean) as string[];
      for (const att of attachments) {
        if (att === foundPhoto || att === foundSign) continue;
        if (!foundAadhaar) foundAadhaar = att;
        else if (!foundDob && att !== foundAadhaar) foundDob = att;
      }
    }

    setPhotoPreview(foundPhoto);
    setPhotoFile(null);

    setSignaturePreview(foundSign);
    setSignatureFile(null);

    setAadhaarPreview(foundAadhaar);
    setAadhaarFile(null);

    setDobDocPreview(foundDob);
    setDobDocFile(null);
  };

  const handleSelectRequestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const reqId = e.target.value;
    setSelectedRequestId(reqId);
    const req = allRequests.find(r => r.id === reqId);
    if (req) {
      loadRequestData(req);
    } else {
      setSelectedRequest(null);
    }
  };

  // File Change Handlers (Preserve Original High Quality)
  const handleCustomFormPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMsg('⚠️ Please upload a valid PDF file (.pdf)');
        return;
      }
      setErrorMsg('');
      setCustomFormPdfFile(file);
      setTemplateType('CUSTOM');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAadhaarFile(file);
      setAadhaarPreview(URL.createObjectURL(file));
    }
  };

  const handleDobDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDobDocFile(file);
      setDobDocPreview(URL.createObjectURL(file));
    }
  };

  // Submit & Generate
  const handleGenerateTwoPdfs = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setProgressStep(1);
    setProgressMsg('📄 1. Loading PDF Form Template...');

    try {
      const formDataToSend = new FormData();

      if (selectedRequestId) {
        formDataToSend.append('requestId', selectedRequestId);
      }

      if (templateType === 'CUSTOM' && customFormPdfFile) {
        formDataToSend.append('formPdf', customFormPdfFile);
      }

      // Assets
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      } else if (photoPreview && !photoPreview.startsWith('blob:')) {
        formDataToSend.append('photoUrl', photoPreview);
      }

      if (signatureFile) {
        formDataToSend.append('signature', signatureFile);
      } else if (signaturePreview && !signaturePreview.startsWith('blob:')) {
        formDataToSend.append('signatureUrl', signaturePreview);
      }

      if (aadhaarFile) {
        formDataToSend.append('aadhaarDoc', aadhaarFile);
      } else if (aadhaarPreview && !aadhaarPreview.startsWith('blob:')) {
        formDataToSend.append('aadhaarDocUrl', aadhaarPreview);
      }

      if (dobDocFile) {
        formDataToSend.append('dobDoc', dobDocFile);
      } else if (dobDocPreview && !dobDocPreview.startsWith('blob:')) {
        formDataToSend.append('dobDocUrl', dobDocPreview);
      }

      // Custom Coordinates
      const customCoords = {
        leftPhoto: { x: leftPhotoX, y: leftPhotoY, width: 105, height: 130, page: 1 },
        rightPhoto: { x: rightPhotoX, y: rightPhotoY, width: 105, height: 130, page: 1 },
        leftSignature: { x: leftSigX, y: leftSigY, width: 125, height: 50, page: 1 },
        rightSignature: { x: rightSigX, y: rightSigY, width: 195, height: 55, page: 2 },
      };
      formDataToSend.append('customCoordinates', JSON.stringify(customCoords));

      // Timed Steps
      setTimeout(() => {
        setProgressStep(2);
        setProgressMsg('🖼️ 2. Stamping Photo 1 & Photo 2 on Form...');
      }, 500);

      setTimeout(() => {
        setProgressStep(3);
        setProgressMsg('✍️ 3. Applying Transparent Signature 1 & Signature 2...');
      }, 1000);

      setTimeout(() => {
        setProgressStep(4);
        setProgressMsg('📎 4. Appending Aadhaar Card & DOB Proof Pages...');
      }, 1500);

      const res = await fetch('/api/tools/stamp-two-pdfs', {
        method: 'POST',
        body: formDataToSend,
      });

      if (res.ok) {
        const data = await res.json();
        setTimeout(() => {
          setProgressStep(5);
          setProgressMsg('🎉 5. Both PDFs Generated Successfully!');
          setResultPdfs({
            pdf1Url: data.pdf1Url,
            pdf2Url: data.pdf2Url,
            filename1: data.filename1,
            filename2: data.filename2,
            pdf1Pages: data.pdf1Pages || 2,
            pdf2Pages: data.pdf2Pages || 4,
          });
          setIsGenerating(false);
        }, 2000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to generate 2 PDF outputs');
        setIsGenerating(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error while stamping PDFs');
      setIsGenerating(false);
    }
  };

  const currentPdfUrl = activeTab === 'PDF1' ? resultPdfs?.pdf1Url : resultPdfs?.pdf2Url;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-emerald-500 p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <FileType className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">⚡ 2 PDF Output Generator Tool</h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black">
                  Photo + Signature + Aadhaar + DOB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate 2 PDFs instantly: <strong className="text-blue-300">Form PDF (2 Pages)</strong> & <strong className="text-emerald-300">Complete PDF with Attachments (4 Pages)</strong>
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300 font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {compressionNotice && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-200 font-extrabold text-xs flex items-center justify-between gap-2.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>⚡ Auto-Compression: {compressionNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCompressionNotice(null)}
                className="p-1 text-emerald-400 hover:text-white font-black text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* SECTION 1: REQUEST HISTORY SELECTOR & FORM TEMPLATE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Request History Dropdown */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xs text-blue-400 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  1. Auto-Load from Request History
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {allRequests.length} Requests Available
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block font-bold mb-1.5">
                  Select Applicant Request:
                </label>
                <select
                  value={selectedRequestId}
                  onChange={handleSelectRequestChange}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Manual Upload / No Request --</option>
                  {allRequests.map((req) => {
                    const fd = req.formData || {};
                    const name = fd.applicant_name || fd.full_name || req.retailerName || 'Applicant';
                    return (
                      <option key={req.id} value={req.id}>
                        #{req.requestNumber} - {name} ({req.serviceTitle})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedRequest && (
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] space-y-1">
                  <p className="font-extrabold text-blue-300">
                    Applicant: {selectedRequest.formData?.applicant_name || selectedRequest.formData?.full_name || selectedRequest.retailerName}
                  </p>
                  <p className="text-slate-400">
                    Aadhaar: <strong className="text-slate-200">{selectedRequest.formData?.aadhaar_no || 'N/A'}</strong> | DOB: <strong className="text-slate-200">{selectedRequest.formData?.dob || 'N/A'}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Template PDF Upload */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="font-black text-xs text-indigo-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                2. Prefilled Form PDF Source
              </h3>

              <div className="space-y-2">
                <label
                  onClick={() => setTemplateType('DEFAULT')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    templateType === 'DEFAULT'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="templateType"
                    checked={templateType === 'DEFAULT'}
                    onChange={() => setTemplateType('DEFAULT')}
                    className="text-indigo-500"
                  />
                  <span>🏛️ Standard Form 49A / Govt Form Template</span>
                </label>

                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    templateType === 'CUSTOM'
                      ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="templateType"
                      checked={templateType === 'CUSTOM'}
                      onChange={() => setTemplateType('CUSTOM')}
                      className="text-purple-500"
                    />
                    <span className="truncate max-w-[200px]">
                      {customFormPdfFile ? customFormPdfFile.name : '📤 Upload Custom Prefilled PDF Form'}
                    </span>
                  </div>

                  <label className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors shrink-0">
                    Browse PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleCustomFormPdfChange}
                      className="hidden"
                    />
                  </label>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: ASSET SOURCES (Photo, Signature, Aadhaar, DOB) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                3. Photo, Signature, Aadhaar & DOB Attachments
              </h3>
              <span className="text-[10px] text-slate-400">
                Supports Images (JPG/PNG) & PDF files
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Photo Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[11px] text-white">📸 Applicant Photo</span>
                    {photoPreview && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Loaded</span>}
                  </div>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Photo" className="w-full h-24 object-cover rounded-lg border border-slate-700" />
                  ) : (
                    <div className="w-full h-24 bg-slate-800 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}
                </div>
                <label className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-bold text-[10px] rounded-lg cursor-pointer transition-colors block">
                  {photoPreview ? 'Swap Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              {/* Signature Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[11px] text-white">✍️ Signature</span>
                    {signaturePreview && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Loaded</span>}
                  </div>
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="Signature" className="w-full h-24 object-contain rounded-lg border border-slate-700 bg-white/5" />
                  ) : (
                    <div className="w-full h-24 bg-slate-800 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                      <FileCheck className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">No Signature</span>
                    </div>
                  )}
                </div>
                <label className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-bold text-[10px] rounded-lg cursor-pointer transition-colors block">
                  {signaturePreview ? 'Swap Signature' : 'Upload Signature'}
                  <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                </label>
              </div>

              {/* Aadhaar Card Document */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[11px] text-white">🪪 Aadhaar Card</span>
                    {aadhaarPreview && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">Attached</span>}
                  </div>
                  {aadhaarPreview ? (
                    <div className="w-full h-24 bg-blue-950/40 border border-blue-500/40 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                      <FileText className="w-8 h-8 text-blue-400 mb-1" />
                      <span className="text-[10px] text-blue-200 font-bold truncate max-w-full">Aadhaar Page Ready</span>
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-slate-800 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                      <FileText className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">No Aadhaar Doc</span>
                    </div>
                  )}
                </div>
                <label className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-bold text-[10px] rounded-lg cursor-pointer transition-colors block">
                  {aadhaarPreview ? 'Swap Aadhaar Doc' : 'Upload Aadhaar Doc'}
                  <input type="file" accept="image/*,.pdf" onChange={handleAadhaarUpload} className="hidden" />
                </label>
              </div>

              {/* DOB Proof Document */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[11px] text-white">📅 DOB Proof Doc</span>
                    {dobDocPreview && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">Attached</span>}
                  </div>
                  {dobDocPreview ? (
                    <div className="w-full h-24 bg-purple-950/40 border border-purple-500/40 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                      <FileText className="w-8 h-8 text-purple-400 mb-1" />
                      <span className="text-[10px] text-purple-200 font-bold truncate max-w-full">DOB Page Ready</span>
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-slate-800 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                      <FileText className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">No DOB Doc</span>
                    </div>
                  )}
                </div>
                <label className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-bold text-[10px] rounded-lg cursor-pointer transition-colors block">
                  {dobDocPreview ? 'Swap DOB Doc' : 'Upload DOB Doc'}
                  <input type="file" accept="image/*,.pdf" onChange={handleDobDocUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Optional Position Coordinates Fine Tuner */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTuner(!showTuner)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-extrabold flex items-center gap-1.5 cursor-pointer bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
              >
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>{showTuner ? 'Hide Position Coordinate Tuning ▲' : '⚡ Easy Coordinate Tuning (Photo 1, Photo 2, Signature 1 & 2 Positions) ▼'}</span>
              </button>

              {showTuner && (
                <div className="mt-2.5 p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn shadow-xl">
                  {/* Preset Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-black text-indigo-300 flex items-center gap-1">
                      🎯 Quick Presets:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLeftPhotoX(25);
                          setLeftPhotoY(825);
                          setRightPhotoX(630);
                          setRightPhotoY(810);
                          setLeftSigX(20);
                          setLeftSigY(780);
                          setRightSigX(550);
                          setRightSigY(70);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/50 rounded-lg cursor-pointer transition-all"
                      >
                        ⚡ Standard Default
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLeftPhotoX(15);
                          setLeftPhotoY(626);
                          setRightPhotoX(480);
                          setRightPhotoY(600);
                          setLeftSigX(15);
                          setLeftSigY(600);
                          setRightSigX(320);
                          setRightSigY(50);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50 rounded-lg cursor-pointer transition-all"
                      >
                        📑 Compact Preset
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLeftPhotoX(25);
                          setLeftPhotoY(825);
                          setRightPhotoX(630);
                          setRightPhotoY(810);
                          setLeftSigX(20);
                          setLeftSigY(780);
                          setRightSigX(550);
                          setRightSigY(70);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-all"
                      >
                        🔄 Reset All
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-semibold">
                    💡 Click <span className="text-indigo-300 font-bold">+</span> or <span className="text-indigo-300 font-bold">-</span> buttons to shift element positions easily by 1pt or 10pt:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Item 1: Photo 1 (Left) */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
                        <span>🖼️ Photo 1 (Left Box)</span>
                        <span className="text-[10px] text-slate-500 font-mono">X:{leftPhotoX} | Y:{leftPhotoY}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">X (Left/Right):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setLeftPhotoX(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setLeftPhotoX(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={leftPhotoX} onChange={(e) => setLeftPhotoX(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setLeftPhotoX(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setLeftPhotoX(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">Y (Up/Down):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setLeftPhotoY(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setLeftPhotoY(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={leftPhotoY} onChange={(e) => setLeftPhotoY(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setLeftPhotoY(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setLeftPhotoY(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Item 2: Photo 2 (Right) */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
                        <span>🖼️ Photo 2 (Right Box)</span>
                        <span className="text-[10px] text-slate-500 font-mono">X:{rightPhotoX} | Y:{rightPhotoY}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">X (Left/Right):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setRightPhotoX(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setRightPhotoX(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={rightPhotoX} onChange={(e) => setRightPhotoX(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setRightPhotoX(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setRightPhotoX(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">Y (Up/Down):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setRightPhotoY(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setRightPhotoY(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={rightPhotoY} onChange={(e) => setRightPhotoY(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setRightPhotoY(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setRightPhotoY(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Item 3: Sig 1 (Across Photo) */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-cyan-300">
                        <span>✍️ Sig 1 (Across Photo)</span>
                        <span className="text-[10px] text-slate-500 font-mono">X:{leftSigX} | Y:{leftSigY}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">X (Left/Right):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setLeftSigX(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setLeftSigX(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={leftSigX} onChange={(e) => setLeftSigX(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setLeftSigX(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setLeftSigX(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">Y (Up/Down):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setLeftSigY(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setLeftSigY(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={leftSigY} onChange={(e) => setLeftSigY(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setLeftSigY(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setLeftSigY(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Item 4: Sig 2 (Page 2 Box) */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-cyan-300">
                        <span>✍️ Sig 2 (Page 2 Box)</span>
                        <span className="text-[10px] text-slate-500 font-mono">X:{rightSigX} | Y:{rightSigY}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">X (Left/Right):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setRightSigX(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setRightSigX(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={rightSigX} onChange={(e) => setRightSigX(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setRightSigX(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setRightSigX(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">Y (Up/Down):</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setRightSigY(prev => prev - 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-5</button>
                            <button type="button" onClick={() => setRightSigY(prev => prev - 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">-1</button>
                            <input type="number" value={rightSigY} onChange={(e) => setRightSigY(Number(e.target.value))} className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono text-[11px]" />
                            <button type="button" onClick={() => setRightSigY(prev => prev + 1)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+1</button>
                            <button type="button" onClick={() => setRightSigY(prev => prev + 5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono font-bold">+5</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GENERATE ACTION BUTTON & PROGRESS */}
          {!resultPdfs && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
              {isGenerating ? (
                <div className="space-y-4 max-w-md mx-auto py-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center animate-spin">
                    <RefreshCw className="w-6 h-6" />
                  </div>

                  <div className="space-y-2">
                    <p className="font-black text-sm text-blue-400">{progressMsg}</p>

                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-md"
                        style={{ width: `${(progressStep / 5) * 100}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Step {progressStep} of 5 • Generating both 2-Page Form PDF and Complete 4-Page PDF
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGenerateTwoPdfs}
                    className="px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-indigo-600/30 active:scale-95 inline-flex items-center gap-2.5 cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-white/20" />
                    <span>⚡ Process & Output 2 PDFs Now</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Outputs <strong>PDF 1 (Form with Photo & Signature)</strong> + <strong>PDF 2 (Complete Form + Aadhaar + DOB)</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DUAL PDF PREVIEW & DOWNLOAD TABS */}
          {resultPdfs && (
            <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-4 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-emerald-400">
                      🎉 2 PDFs Generated Successfully!
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Switch tabs below to preview and download PDF 1 or PDF 2
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateTwoPdfs}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Both</span>
                </button>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('PDF1')}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'PDF1'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>📄 PDF 1: Signed Form PDF ({resultPdfs.pdf1Pages} Pages)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PDF2')}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'PDF2'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>📄 PDF 2: Complete Application ({resultPdfs.pdf2Pages} Pages)</span>
                </button>
              </div>

              {/* PDF VIEWER IFRAME */}
              <div className="w-full h-[420px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                {currentPdfUrl ? (
                  <iframe
                    src={`${currentPdfUrl}#toolbar=1&navpanes=0`}
                    title="PDF Output Preview"
                    className="w-full h-full border-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    No PDF Loaded
                  </div>
                )}
              </div>

              {/* DOWNLOAD BUTTONS BAR */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <a
                  href={resultPdfs.pdf1Url}
                  download={resultPdfs.filename1}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>⬇️ Download PDF 1 (Form Only)</span>
                </a>

                <a
                  href={resultPdfs.pdf2Url}
                  download={resultPdfs.filename2}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>⬇️ Download PDF 2 (Complete 4-Page)</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    // Trigger download for both
                    const link1 = document.createElement('a');
                    link1.href = resultPdfs.pdf1Url;
                    link1.download = resultPdfs.filename1;
                    link1.click();

                    setTimeout(() => {
                      const link2 = document.createElement('a');
                      link2.href = resultPdfs.pdf2Url;
                      link2.download = resultPdfs.filename2;
                      link2.click();
                    }, 500);
                  }}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>⬇️ Download BOTH PDFs</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
