import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { resolveMediaUrl } from '../api/client';
import { ZONES } from '../config/zones';
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
  const [selectedZoneId, setSelectedZoneId] = useState(ZONES[0].id);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // History tab data
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrorMsg('Please upload a valid JPG or PNG image.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setErrorMsg('Please upload a valid JPG or PNG image.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg('');
    }
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
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setErrorMsg('');
      }, 'image/png');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please upload a specimen image or click one of the preset defect buttons.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('file', selectedFile);
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

  const selectedZone = ZONES.find((z) => z.id === Number(selectedZoneId)) || ZONES[0];

  return (
    <div className="space-y-6">
      
      {/* Main Studio Card Container matching Screenshot 2 */}
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

        {/* Studio Content matching Screenshot 2 */}
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
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active: {selectedZone.name}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {ZONES.map((zone) => {
                    const isSelected = Number(selectedZoneId) === zone.id;
                    const desc = DEFECT_DESCRIPTIONS[zone.id] || "Naval platform coating section";

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
                    Upload local naval coating photograph or trigger 1-click test defect presets.
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
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Dropzone matching Screenshot 2 */}
                {!previewUrl ? (
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
                      Upload Marine Coating Specimen
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Drag & drop platform photo or click to browse (JPG, PNG up to 20 MB)
                    </span>
                    <span className="mt-3 px-5 py-2 rounded-full bg-slate-900 group-hover:bg-slate-800 text-white text-xs font-semibold shadow-xs group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-95 transition-all duration-200">
                      Select Photo
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black">
                      <img
                        src={previewUrl}
                        alt="Specimen Preview"
                        className="w-full h-64 object-contain"
                      />
                      {loading && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex flex-col items-center justify-center text-white gap-2">
                          <Spinner size="md" className="text-emerald-400" />
                          <span className="text-xs font-mono text-emerald-300">Reconstructing Open3D Mesh & Grading...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl('');
                        }}
                        className="text-slate-500 hover:text-rose-600 underline font-medium transition-colors cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                )}

                {/* 1-Click Test Defect Buttons matching Screenshot 2 */}
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

                {/* Primary Action Button matching Screenshot 2 */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !selectedFile}
                    className={`group w-full py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      loading || !selectedFile
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 cursor-pointer'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="text-emerald-400" />
                        <span>Executing Inspection Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <span>Run Full Defense Coating Inspection</span>
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

              <Interactive3DTopography
                imageUrl={previewUrl}
                title="Marine Coating Surface Roughness & Depth Profile"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Algorithm</span>
                  <span className="text-slate-800 font-bold">Poisson Surface Recon</span>
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

    </div>
  );
}
