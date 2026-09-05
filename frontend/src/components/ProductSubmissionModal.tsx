import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Upload, Wallet, AlertTriangle, ShieldCheck, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet: () => void;
  onSubmittedSuccess: () => void;
}

const CATEGORIES = [
  'Electronics & Accessories',
  'Apparel & Fashion',
  'Home & Kitchen Appliances',
  'Beauty & Personal Care',
  'Hardware & Construction',
  'Digital & Repair Services',
  'Automotive Spare Parts',
  'Food & Beverages Packaging',
];

const SAMPLE_IMAGES = [
  { label: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Smart Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80' },
  { label: 'Wireless Mouse', url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80' },
  { label: 'Leather Jacket', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80' },
  { label: 'Summer Dress', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80' },
  { label: 'Coffee Maker', url: 'https://images.unsplash.com/photo-1517668808822-9fea0282b986?w=600&auto=format&fit=crop&q=80' },
];

export const ProductSubmissionModal: React.FC<ProductSubmissionModalProps> = ({
  isOpen,
  onClose,
  onOpenWallet,
  onSubmittedSuccess,
}) => {
  const { user, updateLocalWallet, refreshUser } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [serviceFee, setServiceFee] = useState('150');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(SAMPLE_IMAGES[0].url);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const currentFee = Number(serviceFee) || 150;
  const isBalanceSufficient = user.walletBalance >= currentFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !description.trim() || !price) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (!isBalanceSufficient) {
      setErrorMessage(`Insufficient wallet balance (₹${user.walletBalance}). Required fee is ₹${currentFee}. Please top up your wallet.`);
      return;
    }

    setIsSubmitting(true);
    const imageUrl = customImageUrl.trim() || selectedImage;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: user.id,
          title,
          category,
          description,
          price: Number(price),
          serviceFee: currentFee,
          sku: sku.trim() || `SKU-${Math.floor(100000 + Math.random() * 899999)}`,
          images: [imageUrl],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit product.');
      } else {
        // Update wallet locally & on server
        if (data.remainingWalletBalance !== undefined) {
          updateLocalWallet(data.remainingWalletBalance);
        }
        await refreshUser();
        onSubmittedSuccess();
        onClose();
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Server error while processing submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/20">
                <Plus className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Submit Product / Service for Verification</h2>
                <p className="text-xs text-slate-300">Admin verification & automated wallet fee deduction</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Wallet Deduct Notice Box */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isBalanceSufficient ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-start gap-3">
                <Wallet className={`w-5 h-5 mt-0.5 shrink-0 ${isBalanceSufficient ? 'text-indigo-600' : 'text-rose-600'}`} />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    Automatic Service Fee Deduction
                  </div>
                  <div className="text-sm font-bold mt-0.5">
                    Verification Fee: <span className="text-indigo-700">₹{currentFee}</span> | Your Wallet: <span className={isBalanceSufficient ? 'text-emerald-700' : 'text-rose-600'}>₹{user.walletBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {!isBalanceSufficient && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWallet();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shrink-0 shadow-sm transition-colors"
                >
                  Top Up Wallet Now
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Product / Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Ergonomic Headphones"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Retail Price (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="1499"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Verification Fee (₹)</label>
                <input
                  type="number"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">SKU / Serial Code (Optional)</label>
              <input
                type="text"
                placeholder="Auto-generated if left blank"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Product Image Selection</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SAMPLE_IMAGES.map((img) => (
                  <button
                    key={img.label}
                    type="button"
                    onClick={() => {
                      setSelectedImage(img.url);
                      setCustomImageUrl('');
                    }}
                    className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                      selectedImage === img.url && !customImageUrl
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] py-0.5 px-1 truncate text-center">
                      {img.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <input
                  type="url"
                  placeholder="Or paste custom image URL"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Description & Quality Specifications *</label>
              <textarea
                required
                rows={3}
                placeholder="Include key specs, warranty info, and manufacturer details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isBalanceSufficient}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Processing Submission...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit & Deduct ₹{currentFee}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
