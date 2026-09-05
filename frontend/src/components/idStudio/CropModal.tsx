import React, { useState, useEffect, useRef } from 'react';
import { Scissors, RotateCw, Check, X, Sparkles, Layers, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { splitCardImage } from '../../lib/idStudio/cropDetection';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  cardPreset: string;
  onCropConfirmed: (frontDataUrl: string, backDataUrl: string | null) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  cardPreset,
  onCropConfirmed
}) => {
  const [selectedMode, setSelectedMode] = useState<'AUTO_AADHAAR' | 'AUTO_SIDE_BY_SIDE' | 'AUTO_STACKED' | 'MANUAL_CROP'>('AUTO_AADHAAR');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [manualBox, setManualBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 50
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (cardPreset === 'aadhaar') {
        setSelectedMode('AUTO_AADHAAR');
      } else if (cardPreset === 'ayushman' || cardPreset === 'eshram') {
        setSelectedMode('AUTO_STACKED');
      } else {
        setSelectedMode('AUTO_SIDE_BY_SIDE');
      }
      setRotationDeg(0);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
        renderCanvas();
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, cardPreset]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (rotationDeg !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    } else {
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();

    // Draw Visual Guides based on selected split mode
    const W = canvas.width;
    const H = canvas.height;

    ctx.save();
    if (selectedMode === 'AUTO_AADHAAR') {
      const cardStartY = Math.round(H * 0.685);
      const cardH = Math.round(H * 0.288);
      const cardW = Math.round(W * 0.445);
      const leftX = Math.round(W * 0.048);
      const rightX = Math.round(W * 0.508);

      // Front
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(leftX, cardStartY, cardW, cardH);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(leftX, cardStartY - 22, 120, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText('Aadhaar Front', leftX + 8, cardStartY - 6);

      // Back
      ctx.strokeStyle = '#8b5cf6';
      ctx.strokeRect(rightX, cardStartY, cardW, cardH);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(rightX, cardStartY - 22, 120, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Aadhaar Back', rightX + 8, cardStartY - 6);

    } else if (selectedMode === 'AUTO_SIDE_BY_SIDE') {
      const halfW = Math.floor(W / 2);

      // Front
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, halfW, H);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(10, 10, 100, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText('Front Side (Left)', 18, 27);

      // Back
      ctx.strokeStyle = '#8b5cf6';
      ctx.strokeRect(halfW, 0, halfW, H);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(halfW + 10, 10, 100, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Back Side (Right)', halfW + 18, 27);

    } else if (selectedMode === 'AUTO_STACKED') {
      const halfH = Math.floor(H / 2);

      // Front
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, W, halfH);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(10, 10, 100, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText('Front Side (Top)', 18, 27);

      // Back
      ctx.strokeStyle = '#8b5cf6';
      ctx.strokeRect(0, halfH, W, halfH);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(10, halfH + 10, 100, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Back Side (Bottom)', 18, halfH + 27);
    }
    ctx.restore();
  };

  useEffect(() => {
    if (imgRef.current) {
      renderCanvas();
    }
  }, [selectedMode, rotationDeg]);

  const handleApplySplit = async () => {
    if (!imageSrc) return;

    try {
      if (selectedMode === 'MANUAL_CROP') {
        // Single Manual Crop
        onCropConfirmed(imageSrc, null);
      } else {
        const result = await splitCardImage(imageSrc, selectedMode);
        onCropConfirmed(result.front, result.back);
      }
      onClose();
    } catch (err) {
      console.error(err);
      onCropConfirmed(imageSrc, null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Intelligent Document Auto-Crop
              </h3>
              <p className="text-[11px] text-slate-400">
                1-Click Front & Back Separation for Indian ID Standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Canvas Preview with Guides */}
          <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[280px]">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-xl border border-slate-800"
            />
          </div>

          {/* Right Mode Presets */}
          <div className="w-full md:w-80 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-4 space-y-4 overflow-y-auto">
            
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                Select Auto-Crop Preset
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: 'AUTO_AADHAAR',
                    label: '🆔 e-Aadhaar PDF Letter',
                    desc: 'Crops bottom-left Front & bottom-right Back'
                  },
                  {
                    id: 'AUTO_SIDE_BY_SIDE',
                    label: '💳 Side-by-Side (Left/Right)',
                    desc: 'Left = Front, Right = Back (PAN, Voter, DL)'
                  },
                  {
                    id: 'AUTO_STACKED',
                    label: '📑 Top / Bottom Stacked',
                    desc: 'Top = Front, Bottom = Back (Ayushman, eShram)'
                  },
                  {
                    id: 'MANUAL_CROP',
                    label: '🪪 Single Card (As-is)',
                    desc: 'Use uploaded image as Front side'
                  }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id as any)}
                    className={`w-full p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col ${
                      selectedMode === m.id
                        ? 'bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/30'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black">{m.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rotate control */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90° Clockwise</span>
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApplySplit}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Crop & Extract</span>
          </button>
        </div>

      </div>
    </div>
  );
};
