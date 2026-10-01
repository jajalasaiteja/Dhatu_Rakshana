import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
  Ship,
  Anchor,
  Box,
  Compass,
  FileText,
  Activity,
  Check,
  RefreshCw
} from 'lucide-react';
import api from '../api';
import BoundingBoxCanvas from '../components/BoundingBoxCanvas';
import Interactive3DTopography from '../components/Interactive3DTopography';

// Built-in naval platform zones guaranteed to load instantly
const DEFAULT_ZONES = [
  {
    id: 1,
    name: "Hull Port Waterline - Strake A1",
    asset_description: "Waterline anti-fouling primer & barrier coating subject to splash-zone cavitation"
  },
  {
    id: 2,
    name: "Keel Lower Plating - Forward Section",
    asset_description: "Cathodic protection boundary and underwater hull bottom strakes"
  },
  {
    id: 3,
    name: "Ballast Tank 3C - Internal Void",
    asset_description: "Confined compartment epoxy barrier protecting steel against corrosive salt ballast"
  },
  {
    id: 4,
    name: "Rudder Blade & Hydrofoil - Starboard",
    asset_description: "High-shear hydrodynamic flow surface with anti-cavitation polyurethane coating"
  },
  {
    id: 5,
    name: "Main Deck Superstructure - Helo Pad",
    asset_description: "Heavy-duty non-skid marine topcoat exposed to aircraft wheel load & salt spray"
  }
];

export default function NewInspectionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Pre-seed zones so user is NEVER blocked by "Please select a platform zone"
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [selectedZone, setSelectedZone] = useState(DEFAULT_ZONES[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('inspection'); // 'inspection' | '3d' | 'standards' | 'history'
  const [showStandardsModal, setShowStandardsModal] = useState(false);
  const [dismissNotice, setDismissNotice] = useState(false);

  // Sync zones from backend if running
  useEffect(() => {
    api.get('/zones')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setZones(res.data);
          setSelectedZone(res.data[0]);
        }
      })
      .catch((err) => {
        // Safe fallback already active with DEFAULT_ZONES
        console.log('[Dhatu Rakshana] Using built-in defense zones.');
      });
  }, []);

  // Listen for Navbar events
  useEffect(() => {
    const handleOpenModal = () => setShowStandardsModal(true);
    window.addEventListener('open-standards-modal', handleOpenModal);
    return () => window.removeEventListener('open-standards-modal', handleOpenModal);
  }, []);

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setErrorMsg('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setErrorMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  // Helper to load sample defect specimens instantly
  const loadSampleSpecimen = async (defectType) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');

      const isPrimer = defectType === 'scratch';
      ctx.fillStyle = isPrimer ? '#7c2d12' : '#334155';
      ctx.fillRect(0, 0, 640, 640);

      // Procedural surface noise
      for (let i = 0; i < 3500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(Math.random() * 640, Math.random() * 640, 2, 2);
      }

      if (defectType === 'pinhole') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(280, 260, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (defectType === 'scratch') {
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(170, 210);
        ctx.lineTo(260, 280);
        ctx.lineTo(360, 310);
        ctx.stroke();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (defectType === 'contamination') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.ellipse(320, 300, 70, 45, Math.PI / 4, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // particle cluster
        for (let i = 0; i < 18; i++) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(240 + Math.random() * 90, 240 + Math.random() * 90, 3, 3);
        }
      }

      canvas.toBlob((blob) => {
        const file = new File([blob], `sample_${defectType}.png`, { type: 'image/png' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setErrorMsg('');
      }, 'image/png');

    } catch (e) {
      console.error('Failed to create sample specimen:', e);
    }
  };

  const handleExecuteInspection = async () => {
    if (!selectedFile) {
      setErrorMsg('Please upload an inspection image or click a sample defect button first.');
      return;
    }
    const zoneToUse = selectedZone || zones[0];

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('zone_id', zoneToUse.id);

      const response = await api.post('/inspections', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const inspectionId = response.data.inspection_id;
      navigate(`/inspections/${inspectionId}`);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.response?.data?.detail || 'Backend API server error. Verify FastAPI is running on port 8000.');
    }
  };

  const zoneIcons = [Ship, Anchor, Box, Compass, Layers];

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Background ambient gradient glow like Sarvam AI */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#a5bbfc]/35 via-[#d5e2ff]/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-36 -right-20 w-96 h-96 bg-[#9c8273]/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Section based on Sarvam AI aesthetics */}
      <div className="relative overflow-hidden pt-4 pb-10 sm:pt-8 sm:pb-12 text-center max-w-4xl mx-auto px-4">
        
        {/* Sarvam AI-style subtle pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-md mb-5 text-xs text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sovereign Defense AI Platform for Marine Coating Integrity</span>
          <span className="text-slate-300">|</span>
          <span className="text-[#9c8273] font-semibold">AMPP / ISO 4628 / SSPC</span>
        </div>

        {/* Headline in serif typography like Sarvam */}
        <h1 className="text-3xl sm:text-5xl lg:text-5xl font-serif font-bold text-slate-900 tracking-tight leading-[1.18]">
          AI-Powered Coating Protection for <span className="italic font-normal text-[#374151]">Naval Fleets</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Real-time Open3D micro-topography reconstruction, YOLO deep learning defect localization, and deterministic standards compliance grading for defense maritime platforms.
        </p>

        {/* Hero CTA pill buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setActiveTab('inspection');
              document.getElementById('studio-workbench')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Launch Inspection Studio</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('3d');
              document.getElementById('studio-workbench')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Box className="w-4 h-4 text-emerald-600" />
            <span>Interactive 3D Topography</span>
          </button>

          <button
            onClick={() => setShowStandardsModal(true)}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#9c8273]" />
            <span>Standards Spec</span>
          </button>
        </div>

        {/* Feature Highlights Strip (Sarvam-like pill cards) */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Mesh Engine</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">Open3D Micro-Elevation</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Detection Core</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">YOLO Multi-Defect</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Rules Standard</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">SSPC / NACE / ISO 4628</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Deployment</div>
            <div className="text-xs font-bold text-emerald-700 mt-0.5">Air-Gapped Sovereign</div>
          </div>
        </div>
      </div>

      {/* Main Studio Card Container */}
      <div id="studio-workbench" className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-200/60 overflow-hidden">
        
        {/* Top Horizontal Segmented Tab Bar */}
        <div className="flex items-center overflow-x-auto border-b border-slate-200/80 px-4 sm:px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('inspection')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'inspection'
                ? 'border-[#374151] text-[#374151] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <span className="text-base">🛡️</span>
            <span>AI Defect Inspection</span>
          </button>

          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === '3d'
                ? 'border-[#374151] text-[#374151] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <Box className="w-4 h-4 text-emerald-600" />
            <span>3D Micro-Topography</span>
          </button>

          <button
            onClick={() => setActiveTab('standards')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'standards'
                ? 'border-[#374151] text-[#374151] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Standards Compliance (AMPP/ISO)</span>
          </button>

          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 transition-all whitespace-nowrap"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Audit History & Logs</span>
          </button>
        </div>

        {/* Studio Layout (No chatbot column!) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* Left Column: Platform Zone Selector */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Platform Inspection Zones
              </h3>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active: {selectedZone?.name.split(' - ')[0]}
              </span>
            </div>

            <div className="space-y-2.5">
              {zones.map((zone, idx) => {
                const isSelected = selectedZone?.id === zone.id;
                const IconComponent = zoneIcons[idx % zoneIcons.length];

                return (
                  <button
                    key={zone.id}
                    onClick={() => handleZoneSelect(zone)}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-2xl text-left text-sm transition-all ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 shadow-xs border border-emerald-300 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-slate-900">{zone.name}</span>
                      <span className="block text-[11px] text-slate-500 font-normal line-clamp-2 mt-0.5 leading-snug">
                        {zone.asset_description || 'Naval coating surface section'}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Defense Standards Box */}
            <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Shield className="w-3.5 h-3.5 text-[#9c8273]" />
                <span>Naval Coating Defense Standards</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Mapped to SSPC-PA 2 / NACE SP0188 Discontinuity limits and ISO 4628 degradation tolerances.
              </p>
            </div>
          </div>

          {/* Right Main Area: Interactive Workbench (8 Columns wide!) */}
          <div className="lg:col-span-8 p-6 lg:p-8 bg-slate-50/30 flex flex-col justify-between">
            
            {/* TAB 1: AI DEFECT INSPECTION */}
            {activeTab === 'inspection' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedZone?.name || 'Naval Coating Defect Scanner'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedZone?.asset_description}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('3d')}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                  >
                    <Box className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View in 3D</span>
                  </button>
                </div>

                {/* Specimen Ingestion Zone */}
                <div className="flex flex-col items-center">
                  {!previewUrl ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full max-w-lg border-2 border-dashed border-slate-300 hover:border-slate-500 bg-white rounded-3xl p-8 transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm group hover:shadow-md"
                    >
                      <div className="w-24 h-24 rounded-full bg-emerald-100/70 border border-emerald-300/60 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-105 transition-transform shadow-sm">
                        <Upload className="w-10 h-10" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Upload Marine Coating Specimen</h4>
                      <p className="text-xs text-slate-500 mt-1 text-center">
                        Drag & drop platform photo or click to browse local files (PNG, JPG)
                      </p>
                      <span className="mt-4 px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs">
                        Select Photo
                      </span>
                    </div>
                  ) : (
                    <div className="w-full max-w-lg flex flex-col items-center">
                      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-black">
                        <img
                          src={previewUrl}
                          alt="Specimen Preview"
                          className="w-full h-72 object-contain"
                        />
                        {isSubmitting && (
                          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            <span className="text-xs font-mono text-emerald-300">Reconstructing Open3D 3D Topography & Grading...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs font-mono text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                          {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Quick Sample Presets */}
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Or load synthetic test specimen:</span>
                    {['pinhole', 'scratch', 'contamination', 'particle'].map((type) => (
                      <button
                        key={type}
                        onClick={() => loadSampleSpecimen(type)}
                        className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs capitalize"
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleExecuteInspection}
                    disabled={isSubmitting || !selectedFile}
                    className={`w-full py-4 px-6 rounded-full text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 ${
                      isSubmitting || !selectedFile
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-neutral-900/10 active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Executing Inspection Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Run Full Defense Coating Inspection</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

            {/* TAB 2: 3D MICRO-TOPOGRAPHY (WORKING THREE.JS VIEWER!) */}
            {activeTab === '3d' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Box className="w-5 h-5 text-emerald-600" />
                      Interactive 3D Micro-Topography Viewer
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time Three.js elevation displacement rendering coating roughness and localized defect depth.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('inspection')}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    Back to Scan
                  </button>
                </div>

                {/* Real Working 3D Viewer */}
                <Interactive3DTopography
                  imageUrl={previewUrl}
                  title="Marine Coating Surface Roughness & Depth Profile"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-400 block mb-0.5">Algorithm</span>
                    <span className="text-slate-800 font-bold">Poisson Surface Recon</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-400 block mb-0.5">Topography Scale</span>
                    <span className="text-emerald-700 font-bold">Micro-Roughness (Z-Axis)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-400 block mb-0.5">Controls</span>
                    <span className="text-slate-800 font-bold">Orbit • Zoom • Wireframe</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STANDARDS COMPLIANCE */}
            {activeTab === 'standards' && (
              <div className="space-y-4">
                <div className="border-b border-slate-200/80 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#9c8273]" />
                    Defense Marine Standards Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defect grading logic mapped in config/grading_thresholds.yaml
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">SSPC-PA 2 / NACE SP0188</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Pinhole / Holiday</span>
                    </div>
                    <p className="text-slate-600 mb-2">Dielectric discontinuity limits on marine steel platform coatings.</p>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <span className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">&lt; 0.5% Area: PASS</span>
                      <span className="p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-center">0.5 - 2.0%: REVIEW</span>
                      <span className="p-1.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-center">&gt; 2.0%: FAIL</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">ISO 4628-4 / SSPC-VIS 2</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Mechanical Scratch</span>
                    </div>
                    <p className="text-slate-600 mb-2">Mechanical damage, gouges, and cracking integrity assessment.</p>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <span className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">&lt; 1.0% Area: PASS</span>
                      <span className="p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-center">1.0 - 4.0%: REVIEW</span>
                      <span className="p-1.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-center">&gt; 4.0%: FAIL</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">ISO 8501-1 / SSPC-SP 10</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Inclusions / Grease</span>
                    </div>
                    <p className="text-slate-600 mb-2">Surface cleanliness, chemical/oil contamination, and slag inclusion tolerances.</p>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <span className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">&lt; 1.5% Area: PASS</span>
                      <span className="p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-center">1.5 - 4.5%: REVIEW</span>
                      <span className="p-1.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-center">&gt; 4.5%: FAIL</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Floating Bottom-Right Defense Standards Card */}
      {!dismissNotice && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xl text-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Defense Standards Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal mb-3">
            Automatic defect grading compliant with SSPC-PA 2, NACE SP0188, ISO 4628, and ISO 8501.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setActiveTab('standards')}
              className="px-3 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
            >
              Matrix
            </button>
            <button
              onClick={() => setDismissNotice(true)}
              className="px-3.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Standards Specification Modal */}
      {showStandardsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Applied Marine Platform Standards</h3>
                <p className="text-xs text-slate-500">Evaluation rules mapped in config/grading_thresholds.yaml</p>
              </div>
              <button
                onClick={() => setShowStandardsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block mb-0.5">SSPC-PA 2 / NACE SP0188</span>
                <span className="text-slate-600">Measurement of dry coating thickness & discontinuity (pinhole/holiday) limits on ship hulls.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block mb-0.5">ISO 4628-4 / SSPC-VIS 2</span>
                <span className="text-slate-600">Assessment of mechanical coating integrity, gouges, cracking, and surface flaking.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block mb-0.5">ISO 8501-1 / SSPC-SP 10</span>
                <span className="text-slate-600">Surface cleanliness, rust contamination, and embedded blast slag tolerance grades.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block mb-0.5">ISO 8502-3</span>
                <span className="text-slate-600">Assessment of dust and particulate debris on marine steel platforms.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowStandardsModal(false)}
                className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
