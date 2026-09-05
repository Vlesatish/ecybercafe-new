import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { CropState, CropAreaPixels } from '../../lib/passportPhoto/types.js';
import { BIOMETRIC_GUIDELINES } from '../../lib/passportPhoto/cropEngine.js';

interface PassportCropEditorProps {
  imageSrc: string;
  cropState: CropState;
  targetAspect: number; // width / height
  onChangeCropState: (state: CropState) => void;
}

export const PassportCropEditor: React.FC<PassportCropEditorProps> = ({
  imageSrc,
  cropState,
  targetAspect,
  onChangeCropState
}) => {
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [showRuleOfThirds, setShowRuleOfThirds] = useState(true);

  const handleCropChange = useCallback((crop: { x: number; y: number }) => {
    onChangeCropState({
      ...cropState,
      crop
    });
  }, [cropState, onChangeCropState]);

  const handleZoomChange = useCallback((zoom: number) => {
    onChangeCropState({
      ...cropState,
      zoom
    });
  }, [cropState, onChangeCropState]);

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: CropAreaPixels) => {
    onChangeCropState({
      ...cropState,
      croppedAreaPixels
    });
  }, [cropState, onChangeCropState]);

  const handleFineRotationChange = (val: number) => {
    onChangeCropState({
      ...cropState,
      rotation: val
    });
  };

  const handleRotateLeft90 = () => {
    onChangeCropState({
      ...cropState,
      rotation: ((cropState.rotation - 90) % 360)
    });
  };

  const handleRotateRight90 = () => {
    onChangeCropState({
      ...cropState,
      rotation: ((cropState.rotation + 90) % 360)
    });
  };

  const handleFlipHorizontal = () => {
    onChangeCropState({
      ...cropState,
      flipH: !cropState.flipH
    });
  };

  const handleResetCrop = () => {
    onChangeCropState({
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      flipH: false
    });
  };

  return (
    <div id="passport-crop-editor" className="flex flex-col space-y-3">
      {/* Cropper viewport container */}
      <div className="relative w-full h-[340px] sm:h-[400px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner select-none touch-none">
        <Cropper
          image={imageSrc}
          crop={cropState.crop}
          zoom={cropState.zoom}
          rotation={cropState.rotation}
          aspect={targetAspect}
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          onCropComplete={handleCropComplete}
          showGrid={showRuleOfThirds}
          zoomWithScroll={true}
          style={{
            containerStyle: {
              transform: cropState.flipH ? 'scaleX(-1)' : 'none'
            }
          }}
        />

        {/* Biometric Portrait Guidelines Overlay */}
        {showGuidelines && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="relative border-2 border-dashed border-indigo-400/80 shadow-2xl"
              style={{
                aspectRatio: `${targetAspect}`,
                maxHeight: '85%',
                maxWidth: '85%',
                height: '100%'
              }}
            >
              {/* Head Top Guideline */}
              <div
                className="absolute inset-x-0 border-t border-yellow-300/80 flex items-center justify-between px-2"
                style={{ top: `${BIOMETRIC_GUIDELINES.headTopPercent}%` }}
              >
                <span className="text-[9px] font-bold text-yellow-300 bg-black/60 px-1 rounded-xs">
                  Head Top (70-80% frame)
                </span>
              </div>

              {/* Eye-line Guideline */}
              <div
                className="absolute inset-x-0 border-t border-cyan-300/80 flex items-center justify-between px-2"
                style={{ top: `${BIOMETRIC_GUIDELINES.eyeLinePercent}%` }}
              >
                <span className="text-[9px] font-bold text-cyan-300 bg-black/60 px-1 rounded-xs">
                  Eye Line
                </span>
              </div>

              {/* Chin Guideline */}
              <div
                className="absolute inset-x-0 border-t border-green-300/80 flex items-center justify-between px-2"
                style={{ top: `${BIOMETRIC_GUIDELINES.chinLinePercent}%` }}
              >
                <span className="text-[9px] font-bold text-green-300 bg-black/60 px-1 rounded-xs">
                  Chin Base
                </span>
              </div>

              {/* Centering crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/50 -translate-y-1/2" />
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* Floating Guidelines Toggles */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg backdrop-blur-md transition-colors flex items-center gap-1 shadow-md ${
              showGuidelines
                ? 'bg-indigo-600/90 text-white'
                : 'bg-black/60 text-slate-300 hover:text-white'
            }`}
          >
            {showGuidelines ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Guides
          </button>
          <button
            type="button"
            onClick={() => setShowRuleOfThirds(!showRuleOfThirds)}
            className={`px-2 py-1 text-[11px] font-semibold rounded-lg backdrop-blur-md transition-colors shadow-md ${
              showRuleOfThirds
                ? 'bg-indigo-600/90 text-white'
                : 'bg-black/60 text-slate-300 hover:text-white'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Control Tools Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Zoom Slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={cropState.zoom}
              onChange={e => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-600 w-10 text-right">
              {Math.round(cropState.zoom * 100)}%
            </span>
          </div>
          <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        {/* Fine Rotation Slider */}
        <div className="flex items-center gap-3">
          <RotateCcw className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={cropState.rotation}
              onChange={e => handleFineRotationChange(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-600 w-10 text-right">
              {cropState.rotation}°
            </span>
          </div>
          <RotateCw className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        {/* Quick Rotation, Flip & Reset Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRotateLeft90}
              className="p-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 border border-slate-200 font-medium"
              title="Rotate Left 90°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              -90°
            </button>
            <button
              type="button"
              onClick={handleRotateRight90}
              className="p-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 border border-slate-200 font-medium"
              title="Rotate Right 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              +90°
            </button>
            <button
              type="button"
              onClick={handleFlipHorizontal}
              className={`p-1.5 text-xs rounded-lg flex items-center gap-1 border font-medium transition-colors ${
                cropState.flipH
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Flip Horizontally"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Flip
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetCrop}
            className="p-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Crop
          </button>
        </div>
      </div>
    </div>
  );
};
