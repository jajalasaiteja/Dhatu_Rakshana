import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, CheckCircle2, Crosshair } from 'lucide-react';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export default function Dropzone({ file, onFileSelect, onFileRemove, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSet = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
      setError('Invalid file format. Please upload a high-resolution JPG or PNG inspection image.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 25 MB ceiling (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB).`);
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

  // Calibrated synthetic reference specimen generator with naval steel substrate colors (gray-green steel)
  const loadSyntheticPreset = (defectType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    const isPrimer = defectType === 'scratch';
    ctx.fillStyle = isPrimer ? '#1D2520' : '#181A1D';
    ctx.fillRect(0, 0, 640, 640);

    // Micro-roughness noise
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.30)';
      ctx.fillRect(Math.random() * 640, Math.random() * 640, 2, 2);
    }

    if (defectType === 'pinhole') {
      ctx.fillStyle = '#0E0F11';
      ctx.beginPath();
      ctx.arc(280, 260, 16, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#95A47B';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    } else if (defectType === 'scratch') {
      ctx.strokeStyle = '#0E0F11';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(160, 200);
      ctx.lineTo(260, 270);
      ctx.lineTo(380, 310);
      ctx.stroke();
      ctx.strokeStyle = '#5C7964';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (defectType === 'contamination') {
      ctx.fillStyle = 'rgba(92, 121, 100, 0.50)';
      ctx.beginPath();
      ctx.ellipse(320, 300, 65, 42, Math.PI / 4, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // particulate cluster
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(240 + Math.random() * 80, 240 + Math.random() * 80, 3, 3);
      }
    }

    canvas.toBlob((blob) => {
      const sampleFile = new File([blob], `ref_inspection_${defectType}.png`, { type: 'image/png' });
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
        aria-label="Upload marine coating inspection image"
      />

      {!file ? (
        <div className="space-y-3">
          <div
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label="Drag and drop or browse coating inspection image"
            onKeyDown={handleKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-7 text-center nav-transition cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-grayGreen ${
              isDragOver
                ? 'border-matteSage bg-grayGreen/20'
                : 'border-white/20 hover:border-grayGreen/80 bg-surface-panel/30 hover:bg-surface-panel/60'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-10 h-10 mx-auto rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage mb-2.5">
              <UploadCloud className="w-5 h-5 text-fullWhite stroke-[1.8]" />
            </div>
            <p className="text-xs font-semibold text-content-primary">
              Drag & drop inspection imagery, or <span className="text-matteSage underline font-mono">browse local files</span>
            </p>
            <p className="text-[11px] font-mono text-greige mt-1">
              Accepted formats: High-resolution JPG or PNG (up to 25 MB)
            </p>
          </div>

          {/* Reference Test Images */}
          <div className="p-3 rounded border border-white/10 bg-surface-panel flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-matteSage uppercase tracking-wider">
              <Crosshair className="w-3.5 h-3.5 text-matteSage" />
              <span>Reference Test Specimens:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { type: 'scratch', label: 'Mechanical Abrasion' },
                { type: 'pinhole', label: 'Pinhole / Holiday' },
                { type: 'contamination', label: 'Surface Contaminant' },
                { type: 'particulate', label: 'Embedded Particulate' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => loadSyntheticPreset(type)}
                  className="px-2.5 py-1 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-greige hover:text-fullWhite hover:border-grayGreen text-[11px] font-mono nav-transition cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded border border-white/10 bg-surface-panel shadow-panel flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={URL.createObjectURL(file)}
              alt="Uploaded inspection image preview"
              className="w-14 h-14 rounded object-cover border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-matteSage stroke-[2.5]" />
                <p className="text-xs font-semibold text-content-primary truncate">{file.name}</p>
              </div>
              <p className="text-[10px] font-mono text-greige mt-0.5">
                {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]?.toUpperCase()} • SPECIMEN READY
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFileRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-status-failBorder/70 bg-status-fail/40 hover:bg-status-fail/70 text-status-failText text-xs font-mono nav-transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-status-failText font-mono" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
