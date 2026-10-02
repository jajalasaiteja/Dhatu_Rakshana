import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { resolveMediaUrl } from '../api/client';
import { ZONES as DEFAULT_ZONES } from '../config/zones';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import Badge from '../components/Badge';
import Interactive3DTopography from '../components/Interactive3DTopography';

const DEFECT_DESCRIPTIONS = {
  1: "Waterline anti-fouling primer & barrier coating subject to splash-zone cavitation",
  2: "Heavy-duty non-skid marine topcoat exposed to high-impact wheel load & salt spray",
  3: "Confined compartment epoxy barrier protecting steel against corrosive salt ballast",
  4: "High-shear superstructure hydrodynamic flow surface with polyurethane finish"
};

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('inspection'); // 'inspection' | '3d' | 'standards' | 'history'
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONES[0].id);

  // Multi-image state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Zone creation modal state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [savingZone, setSavingZone] = useState(false);
  const [zoneError, setZoneError] = useState('');

  // History tab data
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load zones dynamically from backend
  useEffect(() => {
    apiClient('/zones')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setZones(data);
          setSelectedZoneId(data[0].id);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_ZONES
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryLoading(true);
      apiClient('/inspections')
        .then((data) => {
          setHistoryList(Array.isArray(data) ? data : []);
          setHistoryLoading(false);
        })
        .catch(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  const addFiles = (incomingFiles) => {
    const valid = Array.from(incomingFiles).filter((f) =>
      ['image/jpeg', 'image/png'].includes(f.type)
    );
    if (valid.length === 0) {
      setErrorMsg('Please upload valid JPG or PNG images.');
      return;
    }
    const updated = [...selectedFiles, ...valid];
    setSelectedFiles(updated);
    const urls = updated.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    setActivePreviewIdx(updated.length - 1);
    setErrorMsg('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (idxToRemove, e) => {
    if (e) e.stopPropagation();
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== idxToRemove);
    const updatedUrls = previewUrls.filter((_, idx) => idx !== idxToRemove);
    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedUrls);
    setActivePreviewIdx((prev) => Math.max(0, Math.min(prev, updatedFiles.length - 1)));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setActivePreviewIdx(0);
  };

  // 1-Click Synthetic Defect Presets Generator
  const loadSyntheticPreset = (defectType) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');

      const isPrimer = defectType === 'scratch';
      ctx.fillStyle = isPrimer ? '#78350f' : '#334155';
      ctx.fillRect(0, 0, 640, 640);

      // Random micro-roughness surface noise
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)';
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
        ctx.moveTo(170, 210);
        ctx.lineTo(260, 280);
        ctx.lineTo(370, 310);
        ctx.stroke();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (defectType === 'contamination') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.ellipse(320, 300, 70, 45, Math.PI / 4, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // particulate cluster
        for (let i = 0; i < 24; i++) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(240 + Math.random() * 80, 240 + Math.random() * 80, 3, 3);
        }
      }

      canvas.toBlob((blob) => {
        const file = new File([blob], `preset_${defectType}.png`, { type: 'image/png' });
        setSelectedFiles([file]);
        setPreviewUrls([URL.createObjectURL(file)]);
        setActivePreviewIdx(0);
        setErrorMsg('');
      }, 'image/png');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      setZoneError('Platform zone name is required.');
      return;
    }
    setSavingZone(true);
    setZoneError('');
    try {
      const created = await apiClient('/zones', {
        method: 'POST',
        body: JSON.stringify({
          name: newZoneName.trim(),
          asset_description: newZoneDesc.trim() || 'Naval defense platform coating strake'
        })
      });
      setZones((prev) => [...prev, created]);
      setSelectedZoneId(created.id);
      setNewZoneName('');
      setNewZoneDesc('');
      setIsZoneModalOpen(false);
    } catch (err) {
      setZoneError(err.message || 'Failed to register new platform zone.');
    } finally {
      setSavingZone(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMsg('Please upload one or more specimen images or click a defect preset.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });
      // Backward compatibility keys
      formData.append('image', selectedFiles[0]);
      formData.append('file', selectedFiles[0]);
      formData.append('zone_id', selectedZoneId);

      const response = await apiClient('/inspections', {
        method: 'POST',
        body: formData
      });

      const inspectionId = response.inspection_id || response.id;
      navigate(`/inspections/${inspectionId}`);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Inspection pipeline failed. Verify FastAPI backend is running.');
    }
  };

  const selectedZone = zones.find((z) => z.id === Number(selectedZoneId)) || zones[0] || { id: 1, name: 'Zone 1' };
  const currentPreviewUrl = previewUrls[activePreviewIdx] || '';

  return (
    <div className="space-y-6">
      
      {/* Main Studio Card Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        
        {/* Top Segmented Horizontal Tab Bar */}
        <div className="flex items-center overflow-x-auto border-b border-slate-200/80 px-4 sm:px-6 bg-slate-50/60 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('inspection')}
            className={`group relative flex items-center gap-2 px-6 py-4 text-xs font-semibold border-b-2 transition-all duration-200 whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'inspection'
                ? 'border-slate-900 text-slate-950 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 hover:-translate-y-0.25'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {activeTab === 'inspection' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60"></span>
              )}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 group-hover:scale-125 transition-transform duration-200"></span>
            </span>
            <span>AI Defect Inspection</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('3d')}
            className={`group relative flex items-center gap-2 px-6 py-4 text-xs font-semibold border-b-2 transition-all duration-200 whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === '3d'
                ? 'border-slate-900 text-slate-950 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 hover:-translate-y-0.25'
            }`}
          >
            <span className="text-sm group-hover:scale-115 transition-transform duration-200">📦</span>
            <span>3D Micro-Topography</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('standards')}
            className={`group relative flex items-center gap-2 px-6 py-4 text-xs font-semibold border-b-2 transition-all duration-200 whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'standards'
                ? 'border-slate-900 text-slate-950 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 hover:-translate-y-0.25'
            }`}
          >
            <span className="text-sm group-hover:scale-115 transition-transform duration-200">⚖️</span>
            <span>Standards Compliance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`group relative flex items-center gap-2 px-6 py-4 text-xs font-semibold border-b-2 transition-all duration-200 whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'history'
                ? 'border-slate-900 text-slate-950 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 hover:-translate-y-0.25'
            }`}
          >
            <span className="text-sm group-hover:scale-115 transition-transform duration-200">📜</span>
            <span>Audit History & Logs</span>
          </button>
        </div>

        {/* Studio Content */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: AI DEFECT INSPECTION */}
          {activeTab === 'inspection' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Platform Zone Selector */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    NAVAL PLATFORM ZONES
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsZoneModalOpen(true)}
                    className="text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Add Platform</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                  {zones.map((zone) => {
                    const isSelected = Number(selectedZoneId) === zone.id;
                    const desc = zone.asset_description || DEFECT_DESCRIPTIONS[zone.id] || "Naval platform coating section";

                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`group w-full text-left p-3.5 rounded-xl border transition-all duration-200 active:scale-[0.99] cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-400 text-slate-900 shadow-xs ring-1 ring-emerald-400/30 sm:translate-x-1'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 text-slate-700 hover:translate-x-0.5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full transition-all duration-200 ${
                              isSelected
                                ? 'bg-emerald-500 ring-4 ring-emerald-500/20 scale-110'
                                : 'bg-slate-300 group-hover:bg-slate-400'
                            }`}></span>
                            <span className="text-sm font-semibold text-slate-900">{zone.name}</span>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                            isSelected ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-slate-100 text-slate-600'
                          }`}>
                            ID: {zone.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-normal mt-1.5 leading-snug pl-4">
                          {desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-900 block">Defense Specification Note</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Evaluated against dry coating thickness limits under SSPC-PA 2 and degradation thresholds under ISO 4628.
                  </p>
                </div>
              </div>

              {/* Right Column: Specimen Ingestion */}
              <div className="lg:col-span-7 space-y-5">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Specimen Ingestion
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload multiple perspectives/strakes or trigger 1-click test defect presets.
                  </p>
                </div>

                {errorMsg && (
                  <ErrorPanel
                    message={errorMsg}
                    onRetry={handleSubmit}
                  />
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Dropzone or Multi-Image Preview Container */}
                {selectedFiles.length === 0 ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-500 bg-slate-50/50 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center group"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 group-hover:scale-105 transition-transform">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      Upload Marine Coating Specimen(s)
                    </span>
                    <span className="text-xs text-slate-500 mt-1 max-w-sm">
                      Drag & drop single photo or multiple perspective photos (JPG, PNG up to 20 MB each)
                    </span>
                    <span className="mt-3 px-5 py-2 rounded-full bg-slate-900 group-hover:bg-slate-800 text-white text-xs font-semibold shadow-xs group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-95 transition-all duration-200">
                      Select Photos (Multiple Allowed)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Image Main Preview */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black">
                      <img
                        src={currentPreviewUrl}
                        alt="Specimen Preview"
                        className="w-full h-64 object-contain"
                      />
                      {loading && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex flex-col items-center justify-center text-white gap-2">
                          <Spinner size="md" className="text-emerald-400" />
                          <span className="text-xs font-mono text-emerald-300">
                            Reconstructing Open3D Composite Mesh & Grading...
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-md border border-slate-700">
                        Angle #{activePreviewIdx + 1} of {selectedFiles.length}
                      </div>
                    </div>

                    {/* Multi-Image Thumbnail Strip & Management Bar */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            📸 {selectedFiles.length} Specimen{selectedFiles.length > 1 ? 's' : ''} Staged
                          </span>
                          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Multi-Strake 3D Composite
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                          >
                            + Add More Photos
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={clearAllFiles}
                            className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Thumbnails Row */}
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                        {selectedFiles.map((file, idx) => {
                          const isCurrent = activePreviewIdx === idx;
                          const url = previewUrls[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => setActivePreviewIdx(idx)}
                              className={`group relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                isCurrent
                                  ? 'border-emerald-600 ring-2 ring-emerald-400/40 scale-102 shadow-sm'
                                  : 'border-slate-300 opacity-75 hover:opacity-100 hover:border-slate-400'
                              }`}
                            >
                              <img src={url} alt={`Specimen ${idx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-slate-950/85 text-[10px] text-white text-center font-mono py-0.5">
                                #{idx + 1}
                              </span>
                              {/* Remove individual photo button */}
                              <button
                                type="button"
                                title="Remove this photo"
                                onClick={(e) => removeFile(idx, e)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[11px] font-bold opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition-opacity shadow-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200">
                        <span>Active: {selectedFiles[activePreviewIdx]?.name}</span>
                        <span>{(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1-Click Test Defect Buttons */}
                <div className="pt-2">
                  <span className="text-xs text-slate-500 font-medium block mb-2">
                    Or evaluate with 1-click test defect buttons:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: 'pinhole', label: '[Pinhole / Holiday]' },
                      { key: 'scratch', label: '[Mechanical Scratch]' },
                      { key: 'contamination', label: '[Contamination]' },
                      { key: 'particulate', label: '[Particulate Cluster]' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => loadSyntheticPreset(item.key)}
                        className="group px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 text-xs font-mono font-medium text-slate-700 hover:text-slate-950 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-emerald-500 transition-colors"></span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || selectedFiles.length === 0}
                    className={`group w-full py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      loading || selectedFiles.length === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 cursor-pointer'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="text-emerald-400" />
                        <span>Reconstructing 3D Micro-Topography & Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          Run Defense Coating Inspection {selectedFiles.length > 1 ? `(${selectedFiles.length} Angles)` : ''}
                        </span>
                        <span className="group-hover:translate-x-1.5 transition-transform duration-200">→</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: 3D MICRO-TOPOGRAPHY (THREE.JS VIEWER) */}
          {activeTab === '3d' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Interactive 3D Micro-Topography Viewer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time Three.js surface elevation rendering showing micro-roughness and localized defect depressions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('inspection')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                >
                  Back to Ingestion
                </button>
              </div>

              {previewUrls.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
                  <span className="text-slate-500 flex-shrink-0">Preview Angle:</span>
                  {previewUrls.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePreviewIdx(idx)}
                      className={`px-2.5 py-1 rounded-md border text-xs cursor-pointer ${
                        activePreviewIdx === idx
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Angle #{idx + 1}
                    </button>
                  ))}
                </div>
              )}

              <Interactive3DTopography
                imageUrl={currentPreviewUrl}
                title="Marine Coating Surface Roughness & Depth Profile"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Algorithm</span>
                  <span className="text-slate-800 font-bold">Surface Heightfield Mesh</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Topography Scale</span>
                  <span className="text-emerald-700 font-bold">Micro-Roughness (Z-Axis)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Controls</span>
                  <span className="text-slate-800 font-bold">Orbit • Zoom • Wireframe</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STANDARDS COMPLIANCE */}
          {activeTab === 'standards' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Defense Marine Standards Compliance Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Automated grading threshold rules mapped in backend/config/grading_thresholds.yaml
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">SSPC-PA 2 / NACE SP0188</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Pinhole / Holiday</span>
                  </div>
                  <p className="text-slate-600 mb-2">Dielectric discontinuity limits on marine steel platform coatings.</p>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <span className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">&lt; 0.5% Area: PASS</span>
                    <span className="p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-center">0.5 - 2.0%: REVIEW</span>
                    <span className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-center">&gt; 2.0%: FAIL</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">ISO 4628-4 / SSPC-VIS 2</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Mechanical Scratch</span>
                  </div>
                  <p className="text-slate-600 mb-2">Mechanical damage, gouges, and cracking integrity assessment.</p>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <span className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">&lt; 1.0% Area: PASS</span>
                    <span className="p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-center">1.0 - 4.0%: REVIEW</span>
                    <span className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-center">&gt; 4.0%: FAIL</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">ISO 8501-1 / SSPC-SP 10</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Inclusions / Grease</span>
                  </div>
                  <p className="text-slate-600 mb-2">Surface cleanliness, chemical/oil contamination, and slag inclusion tolerances.</p>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <span className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">&lt; 1.5% Area: PASS</span>
                    <span className="p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-center">1.5 - 4.5%: REVIEW</span>
                    <span className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-center">&gt; 4.5%: FAIL</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY & LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Chronological Audit Logs
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inspections stored in database with pass/review/fail verdicts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/inspections')}
                  className="text-xs text-slate-900 hover:underline font-semibold"
                >
                  Full History Grid →
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Spinner size="md" className="text-slate-600" />
                  <span className="text-xs text-slate-500">Fetching audit records...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No inspection logs found yet. Run an inspection in the First Tab to generate an audit log!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historyList.slice(0, 6).map((insp) => (
                    <div
                      key={insp.id}
                      onClick={() => navigate(`/inspections/${insp.id}`)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-white hover:shadow-xs transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 font-mono">#{insp.id}</span>
                        <Badge status={insp.overall_verdict} size="sm" />
                      </div>
                      <div className="text-xs text-slate-700 font-semibold truncate">
                        {insp.zone_name || `Zone ${insp.zone_id}`}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-100">
                        <span>{new Date(insp.timestamp).toLocaleDateString()}</span>
                        <span className="text-slate-800 font-semibold">View Result →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Modal: Add Defense Platform Zone */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Register Naval Platform Zone
                </h3>
                <p className="text-xs text-slate-500">
                  Add a new hull strake, tank compartment, or flight deck section.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsZoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {zoneError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {zoneError}
              </div>
            )}

            <form onSubmit={handleCreateZone} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Platform Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keel Strake 4, Sonar Dome Compartment"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asset Description & Coating Spec
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-velocity splash zone titanium alloy with anti-cavitation barrier"
                  value={newZoneDesc}
                  onChange={(e) => setNewZoneDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingZone}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {savingZone && <Spinner size="xs" />}
                  <span>Save Defense Zone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
