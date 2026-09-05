import React, { useState, useRef } from 'react';
import { Download, FileJson, FileText, Database, X, Check, Copy, ShieldCheck, Sparkles, Loader2, Upload, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiUrl } from '../utils/api';

interface DatabaseExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseExportModal: React.FC<DatabaseExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'requests' | 'full'>('requests');
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadFileWithAuth = async (endpointPath: string, fallbackFilename: string) => {
    setDownloading(endpointPath);
    try {
      const token = localStorage.getItem('ecyber_session_token') || '';
      const separator = endpointPath.includes('?') ? '&' : '?';
      const fullPath = `${endpointPath}${separator}sessionToken=${encodeURIComponent(token)}`;
      const url = getApiUrl(fullPath);

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-session-token': token
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition');
      let filename = fallbackFilename;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e: any) {
      console.error('Download error:', e);
      // Fallback redirect with session token
      const token = localStorage.getItem('ecyber_session_token') || '';
      const separator = endpointPath.includes('?') ? '&' : '?';
      window.location.href = getApiUrl(`${endpointPath}${separator}sessionToken=${encodeURIComponent(token)}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadActiveRequestsJSON = () => {
    downloadFileWithAuth('/api/export?type=active-requests', 'active_service_requests_backup.json');
  };

  const handleDownloadFullJSON = () => {
    downloadFileWithAuth('/api/export?format=json', 'citizenservice_portal_full_db.json');
  };

  const handleDownloadCSV = () => {
    downloadFileWithAuth('/api/export?format=csv', 'citizenservice_portal_db.csv');
  };

  const handleFetchPreview = async (type: 'requests' | 'full') => {
    setPreviewType(type);
    try {
      const token = localStorage.getItem('ecyber_session_token') || '';
      const path = type === 'requests' ? '/api/export?type=active-requests' : '/api/export?format=json';
      const separator = path.includes('?') ? '&' : '?';
      const url = getApiUrl(`${path}${separator}sessionToken=${encodeURIComponent(token)}`);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-session-token': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(JSON.stringify(data, null, 2));
      } else {
        const err = await res.json();
        setPreviewData(`Error (${res.status}): ${err.error || 'Failed to retrieve backup preview.'}`);
      }
    } catch (e: any) {
      console.error(e);
      setPreviewData(`Connection error: ${e?.message || 'Failed to reach server.'}`);
    }
  };

  const handleCopy = () => {
    if (previewData) {
      navigator.clipboard.writeText(previewData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRestoreJsonText(content);
        setRestoreMessage({ type: 'success', text: `📁 File loaded: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Click 'Restore Backup Now' below to apply.` });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreJsonText.trim()) {
      setRestoreMessage({ type: 'error', text: 'Please upload or paste a JSON backup payload first.' });
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(restoreJsonText.trim());
    } catch (err: any) {
      setRestoreMessage({ type: 'error', text: 'Invalid JSON format. Please verify the backup file or text.' });
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const token = localStorage.getItem('ecyber_session_token') || '';
      const url = getApiUrl('/api/admin/import');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-session-token': token
        },
        body: JSON.stringify(parsed)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to restore backup');
      }

      setRestoreMessage({ type: 'success', text: `✅ ${data.message || 'Backup restored successfully!'} Reloading page...` });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      setRestoreMessage({ type: 'error', text: e.message || 'Error executing restore.' });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/20">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>Database Backup & Export Center</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Pre-Deployment Safety Net
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Download manual JSON backups of active service requests & portal data</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Safety Banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-extrabold">Manual Data Safety Net</p>
                <p className="text-amber-800">
                  Before deploying updates or restarting the server, export a JSON copy of all active service requests. This guarantees you have a instant local backup of all pending customer form inputs, request numbers, and status histories.
                </p>
              </div>
            </div>

            {/* Download Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active Service Requests JSON (Featured) */}
              <div
                onClick={handleDownloadActiveRequestsJSON}
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-white border-2 border-amber-400 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                      RECOMMENDED
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <span>Active Requests JSON</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    Downloads all pending & active retailer service requests with complete form fields, applicant details, and status logs.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-900 group-hover:text-amber-950">
                  <span>{downloading === '/api/export?type=active-requests' ? 'Downloading...' : 'Download .JSON Backup'}</span>
                  {downloading === '/api/export?type=active-requests' ? (
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-amber-600 group-hover:translate-y-0.5 transition-transform" />
                  )}
                </div>
              </div>

              {/* Full JSON Database Dump */}
              <div
                onClick={handleDownloadFullJSON}
                className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <Database className="w-5 h-5" />
                    </div>
                    {downloading === '/api/export?format=json' ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Full Database Dump</h3>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Complete portal export containing users, wallet transactions, chat messages, topups, and settings.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                  <span>{downloading === '/api/export?format=json' ? 'Downloading...' : 'Full .JSON File'}</span>
                  {downloading === '/api/export?format=json' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* CSV Spreadsheet Export */}
              <div
                onClick={handleDownloadCSV}
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    {downloading === '/api/export?format=csv' ? (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">CSV Spreadsheet</h3>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Formatted multi-table CSV file compatible with Microsoft Excel and Google Sheets.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>{downloading === '/api/export?format=csv' ? 'Downloading...' : 'Download .CSV'}</span>
                  {downloading === '/api/export?format=csv' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>

            {/* Live Data Preview */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">JSON Data Inspector</h3>
                  {previewData && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Showing {previewType === 'requests' ? 'Active Requests' : 'Full DB'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFetchPreview('requests')}
                    className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      previewData && previewType === 'requests'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Preview Requests JSON
                  </button>

                  <button
                    onClick={() => handleFetchPreview('full')}
                    className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      previewData && previewType === 'full'
                        ? 'bg-indigo-600 text-white font-black'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Preview Full DB
                  </button>

                  {previewData && (
                    <button
                      onClick={handleCopy}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Raw JSON'}
                    </button>
                  )}
                </div>
              </div>

              {previewData ? (
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                  {previewData}
                </pre>
              ) : (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  Click "Preview Requests JSON" above to inspect active service request records before downloading your manual backup.
                </div>
              )}
            </div>

            {/* RESTORE / IMPORT BACKUP SECTION */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Restore / Import Backup (.JSON)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Upload your saved backup JSON file or paste backup content to restore missing services and requests instantly.
                  </p>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Backup File (.json)</span>
                  </button>
                </div>
              </div>

              {restoreMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    restoreMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {restoreMessage.text}
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  value={restoreJsonText}
                  onChange={(e) => setRestoreJsonText(e.target.value)}
                  placeholder="Paste your exported backup JSON content here or select a file above..."
                  rows={4}
                  className="w-full p-3 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleExecuteRestore}
                    disabled={isRestoring || !restoreJsonText.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Restoring Backup...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Restore Backup Now (रीस्टोर करें)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
