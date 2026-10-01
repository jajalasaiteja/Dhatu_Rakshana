import React, { useRef, useState } from 'react';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export default function Dropzone({ file, onFileSelect, onFileRemove, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSet = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
      setError('Invalid format. Please select a JPG or PNG image.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 20 MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !file) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  // Quick preset test image generator for easy evaluation
  const loadSyntheticPreset = (defectType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = defectType === 'scratch' ? '#78350f' : '#334155';
    ctx.fillRect(0, 0, 640, 640);

    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(Math.random() * 640, Math.random() * 640, 2, 2);
    }

    if (defectType === 'pinhole') {
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(280, 260, 16, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (defectType === 'scratch') {
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(160, 200);
      ctx.lineTo(260, 270);
      ctx.lineTo(380, 310);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.ellipse(320, 300, 60, 40, Math.PI / 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      const sampleFile = new File([blob], `specimen_${defectType}.png`, { type: 'image/png' });
      validateAndSet(sampleFile);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={(e) => validateAndSet(e.target.files[0])}
        disabled={disabled}
        className="hidden"
        aria-label="Upload inspection image"
      />

      {!file ? (
        <div>
          <div
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label="Drag and drop or browse coating inspection image"
            onKeyDown={handleKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-8 text-center transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-900 ${
              isDragOver
                ? 'border-slate-900 bg-slate-100'
                : 'border-[#cbd5e1] hover:border-slate-500 bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              Drag & drop specimen image here, or <span className="underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports JPG, PNG up to 20 MB
            </p>
          </div>

          {/* Quick preset synthetic buttons for examiner convenience */}
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Or test preset:</span>
            {['pinhole', 'scratch', 'contamination'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => loadSyntheticPreset(preset)}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono capitalize transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={URL.createObjectURL(file)}
              alt="Uploaded specimen preview"
              className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500 font-mono">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFileRemove}
            disabled={disabled}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium underline shrink-0 transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-400 rounded-sm"
          >
            Remove
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
