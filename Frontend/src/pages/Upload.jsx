import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { ZONES as DEFAULT_ZONES, DEFECT_STANDARDS_REFERENCE } from '../config/zones';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import StatusBadge from '../components/StatusBadge';
import Dropzone from '../components/Dropzone';
import Interactive3DTopography from '../components/Interactive3DTopography';
import {
  Shield,
  FileCheck2,
  History as HistoryIcon,
  Plus,
  ArrowRight,
  CheckCircle2,
  Box,
  Sliders,
  ExternalLink
} from 'lucide-react';

export default function Upload() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('inspection'); // 'inspection' | '3d' | 'standards' | 'history'
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONES[0].id);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);

  // Submission pipeline stages
  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState('');
  const [pipelineDesc, setPipelineDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 3D Topography options
  const [heightScale, setHeightScale] = useState(0.35);

  // New Zone Modal state
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [zoneModalLoading, setZoneModalLoading] = useState(false);

  // Tab 4 (Recent History) state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 1. Fetch available platform zones on mount
  useEffect(() => {
    apiClient('/zones')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((z) => {
            const def = DEFAULT_ZONES.find((dz) => dz.id === z.id);
            return {
              ...z,
              asset_description: z.asset_description || def?.asset_description || "Naval marine platform strake",
              risk_level: def?.risk_level || "MEDIUM",
              environment: def?.environment || "Marine Hull Strake",
            };
          });
          setZones(merged);
          setSelectedZoneId(merged[0].id);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_ZONES
      });
  }, []);

  // 2. Fetch history feed when Tab 4 is opened
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

  const handleFileSelect = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedFiles((prev) => [...prev, file]);
    setPreviewUrls((prev) => [...prev, url]);
    setActivePreviewIdx(selectedFiles.length);
    setErrorMsg('');
  };

  const handleFileRemove = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setPreviewUrls((prev) => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      return updated;
    });
    if (activePreviewIdx >= indexToRemove && activePreviewIdx > 0) {
      setActivePreviewIdx((prev) => prev - 1);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    setZoneModalLoading(true);
    try {
      const created = await apiClient('/zones', {
        method: 'POST',
        body: JSON.stringify({
          name: newZoneName.trim(),
          asset_description: newZoneDesc.trim() || 'Marine vessel hull strake'
        })
      });

      const newZoneObj = {
        ...created,
        risk_level: 'HIGH',
        environment: 'Marine Hull Zone'
      };

      setZones((prev) => [...prev, newZoneObj]);
      setSelectedZoneId(created.id);
      setShowAddZoneModal(false);
      setNewZoneName('');
      setNewZoneDesc('');
    } catch {
      // Offline fallback: create local zone
      const localId = Date.now();
      const localZone = {
        id: localId,
        name: newZoneName.trim(),
        asset_description: newZoneDesc.trim() || 'Marine vessel hull strake',
        risk_level: 'HIGH',
        environment: 'Marine Hull Zone'
      };
      setZones((prev) => [...prev, localZone]);
      setSelectedZoneId(localId);
      setShowAddZoneModal(false);
      setNewZoneName('');
      setNewZoneDesc('');
    } finally {
      setZoneModalLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg('No inspection imagery staged. Please upload high-resolution inspection image.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Stage 1: Optical Specimen Ingestion
      setPipelineStage('STAGE 1 / 4: SPECIMEN INGESTION');
      setPipelineDesc('Transferring high-resolution inspection frame and assigning platform zone metadata...');
      await new Promise((r) => setTimeout(r, 600));

      const formData = new FormData();
      formData.append('zone_id', selectedZoneId);
      if (selectedFiles.length > 1) {
        for (const f of selectedFiles) {
          formData.append('images', f);
        }
      } else if (selectedFiles.length === 1) {
        formData.append('file', selectedFiles[0]);
      }

      // Stage 2: Three-Dimensional Topography Analysis
      setPipelineStage('STAGE 2 / 4: TOPOGRAPHY RECONSTRUCTION');
      setPipelineDesc('Estimating micro-elevation, surface normals, and 3D mesh profile...');

      const createdInspection = await apiClient('/inspections', {
        method: 'POST',
        body: formData
      });

      // Stage 3 & 4: Defect Identification & Standards Grading
      setPipelineStage('STAGE 3 & 4: DEFECT IDENTIFICATION & STANDARDS EVALUATION');
      setPipelineDesc('Evaluating localized anomalies against ISO 4628 and SSPC-PA 2 criteria...');
      await new Promise((r) => setTimeout(r, 600));

      const inspectionId = createdInspection.inspection_id || createdInspection.id;
      setLoading(false);
      navigate(`/inspections/${inspectionId}`);
    } catch (err) {
      setLoading(false);
      setPipelineStage('');
      setPipelineDesc('');
      setErrorMsg(err.message || 'Inspection analysis failed. Verify backend services are reachable.');
    }
  };

  const selectedZone = zones.find((z) => z.id === Number(selectedZoneId)) || zones[0];
  const activeImageUrl = previewUrls[activePreviewIdx] || '';

  return (
    <div className="space-y-5">
      
      {/* Studio Header Card with Segmented Functional Tabs */}
      <div className="bg-surface-panel rounded-lg border border-white/10 shadow-technical overflow-hidden">
        
        {/* Technical Tab Strip */}
        <div className="flex items-center overflow-x-auto border-b border-white/10 px-4 bg-surface-dark/70 scrollbar-none font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('inspection')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 nav-transition cursor-pointer whitespace-nowrap ${
              activeTab === 'inspection'
                ? 'border-grayGreen text-fullWhite bg-surface-panel'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-matteSage" />
            <span>Inspection Image Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 nav-transition cursor-pointer whitespace-nowrap ${
              activeTab === '3d'
                ? 'border-grayGreen text-fullWhite bg-surface-panel'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel/40'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-matteSage" />
            <span>Three-Dimensional Surface Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('standards')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 nav-transition cursor-pointer whitespace-nowrap ${
              activeTab === 'standards'
                ? 'border-grayGreen text-fullWhite bg-surface-panel'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel/40'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-matteSage" />
            <span>Standards and Assessment References</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 nav-transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-grayGreen text-fullWhite bg-surface-panel'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel/40'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5 text-matteSage" />
            <span>Recent Inspection Records</span>
          </button>
        </div>

        {/* Tab 1: Inspection Image Analysis */}
        {activeTab === 'inspection' && (
          <div className="p-5 sm:p-7 space-y-7">
            
            {/* Section Overview Context */}
            <div className="pb-3 border-b border-white/10">
              <h2 className="text-sm sm:text-base font-mono font-bold text-fullWhite">
                Inspection Image Analysis
              </h2>
              <p className="text-xs text-greige mt-1 font-medium leading-relaxed max-w-4xl font-sans">
                Upload and analyze inspection imagery to identify visible coating defects and surface degradation. The analysis establishes the visual evidence used in subsequent assessment stages.
              </p>
            </div>

            {/* Zone Selector Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                    Platform Zone Identification
                  </h3>
                  <p className="text-xs text-greige font-medium mt-0.5 font-sans">
                    Select vessel compartment or hull structure for inspection assignment and threshold calibration:
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddZoneModal(true)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-xs font-mono text-fullWhite nav-transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-matteSage" />
                  <span>Add Inspection Zone</span>
                </button>
              </div>

              {/* Zone Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {zones.map((zone) => {
                  const isSelected = zone.id === Number(selectedZoneId);
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`p-3.5 rounded border nav-transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-grayGreen bg-surface-elevated text-fullWhite ring-1 ring-grayGreen shadow-panel'
                          : 'border-white/10 bg-surface-dark text-greige hover:border-matteSage/50 hover:bg-surface-dark/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                          <span className={isSelected ? 'text-matteSage font-bold' : 'text-greige font-bold'}>
                            ZONE #{zone.id}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${
                            isSelected
                              ? 'bg-surface-dark border-grayGreen/60 text-fullWhite'
                              : 'bg-surface-panel border-white/10 text-greige'
                          }`}>
                            {zone.risk_level || 'HIGH'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold truncate text-fullWhite font-sans">
                          {zone.name}
                        </h4>
                        <p className="text-[11px] text-greige mt-1 line-clamp-2 leading-relaxed font-sans">
                          {zone.asset_description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-greige">
                          {zone.environment || 'Hull Strake'}
                        </span>
                        {isSelected && (
                          <span className="font-semibold text-matteSage flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-matteSage" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspection Image Ingestion Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                    Inspection Specimen Ingestion
                  </h3>
                  <p className="text-xs text-greige font-medium mt-0.5 font-sans">
                    Review source inspection imagery used as the basis for defect identification and surface-condition assessment:
                  </p>
                </div>
                {selectedFiles.length > 0 && (
                  <span className="text-xs font-mono font-semibold text-fullWhite">
                    {selectedFiles.length} specimen{selectedFiles.length > 1 ? 's' : ''} staged
                  </span>
                )}
              </div>

              {/* Dropzone Component */}
              <Dropzone
                onFileSelect={handleFileSelect}
                disabled={loading}
              />

              {/* Multi-angle Preview Strip */}
              {previewUrls.length > 0 && (
                <div className="p-3.5 rounded border border-white/10 bg-surface-dark space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono text-fullWhite">
                    <span className="font-bold">Staged Inspection Images:</span>
                    <span className="text-[11px] text-greige">
                      Image {activePreviewIdx + 1} of {previewUrls.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActivePreviewIdx(idx)}
                        className={`relative rounded overflow-hidden shrink-0 w-20 h-20 border nav-transition cursor-pointer ${
                          activePreviewIdx === idx
                            ? 'border-grayGreen ring-1 ring-grayGreen shadow-panel'
                            : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Inspection frame ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/80 text-white font-mono text-[9px]">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileRemove(idx);
                          }}
                          className="absolute top-1 right-1 w-4 h-4 rounded bg-status-fail border border-status-failBorder text-white flex items-center justify-center text-[10px] hover:bg-status-fail/80"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Panel if pipeline fails */}
            {errorMsg && (
              <ErrorPanel message={errorMsg} onRetry={handleSubmit} />
            )}

            {/* Pipeline Stage Tracker when Loading */}
            {loading && (
              <div className="p-4 rounded border border-white/10 bg-surface-dark text-fullWhite shadow-panel space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Spinner size="sm" className="text-matteSage" />
                    <div>
                      <div className="text-xs font-mono font-bold tracking-wider uppercase text-fullWhite">
                        {pipelineStage}
                      </div>
                      <p className="text-[11px] text-greige font-mono mt-0.5">
                        {pipelineDesc}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-matteSage shrink-0">
                    IN PROGRESS
                  </span>
                </div>
                <div className="w-full bg-surface-panel h-1.5 rounded overflow-hidden border border-white/10">
                  <div className="bg-grayGreen h-full rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Submission Action Bar */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-greige">
                <Shield className="w-4 h-4 text-matteSage" />
                <span>Calibrated inspection criteria assigned to:</span>
                <span className="text-fullWhite font-bold">{selectedZone.name}</span>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedFiles.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold tracking-wide uppercase nav-transition shadow-technical flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="text-fullWhite" />
                    <span>Analyzing Inspection Image...</span>
                  </>
                ) : (
                  <>
                    <span>Start Inspection Analysis</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Three-Dimensional Surface Analysis */}
        {activeTab === '3d' && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
              <div className="max-w-3xl">
                <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                  Three-Dimensional Surface Analysis
                </h3>
                <p className="text-xs text-greige font-medium mt-0.5 leading-relaxed font-sans">
                  The reconstructed surface provides an elevation model of coating condition representing micro-roughness, pits, and blisters. Left-click drag to rotate, wheel to zoom.
                </p>
              </div>

              {/* Vertical Scale Control */}
              <div className="flex items-center gap-2.5 bg-surface-dark px-3 py-1.5 rounded border border-white/10 text-xs font-mono shrink-0">
                <Sliders className="w-3.5 h-3.5 text-greige" />
                <span className="text-greige">Elevation Scale:</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={heightScale}
                  onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                  className="w-24 accent-grayGreen cursor-pointer"
                />
                <span className="text-matteSage font-bold w-10 text-right">{heightScale.toFixed(2)}x</span>
              </div>
            </div>

            {/* Embedded 3D Viewer */}
            <Interactive3DTopography
              imageUrl={activeImageUrl}
              heightScale={heightScale}
              title={`Surface Topography — ${selectedZone.name}`}
            />
          </div>
        )}

        {/* Tab 3: Standards and Assessment References */}
        {activeTab === 'standards' && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="pb-2 border-b border-white/10">
              <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                Standards and Assessment References
              </h3>
              <p className="text-xs text-greige font-medium mt-0.5 leading-relaxed font-sans">
                Review the inspection standards and reference criteria associated with coating condition assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {DEFECT_STANDARDS_REFERENCE.map((std) => (
                <div key={std.code} className="p-4 rounded border border-white/10 bg-surface-dark shadow-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded border border-white/10 bg-surface-panel text-fullWhite font-mono text-xs font-semibold">
                      {std.code}
                    </span>
                    <span className="text-[10px] font-mono text-matteSage font-semibold uppercase">
                      STANDARD CRITERIA
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-fullWhite font-sans">
                    {std.title}
                  </h4>
                  <p className="text-xs text-greige leading-relaxed font-sans">
                    {std.scope}
                  </p>
                  <div className="p-2 rounded bg-surface-panel border border-white/10 text-[11px] font-mono">
                    <span className="text-greige uppercase font-bold block text-[10px] mb-0.5">Threshold Criterion:</span>
                    <span className="text-matteSage font-semibold">{std.threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Recent Inspection Records */}
        {activeTab === 'history' && (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                  Recent Inspection Records
                </h3>
                <p className="text-xs text-greige font-medium mt-0.5 font-sans">
                  Review previously completed inspection analyses and recorded findings:
                </p>
              </div>

              <Link
                to="/inspections"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-fullWhite text-xs font-mono nav-transition"
              >
                <span>View Full Analysis History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {historyLoading ? (
              <div className="p-10 text-center space-y-2">
                <Spinner size="md" className="text-matteSage mx-auto" />
                <p className="text-xs font-mono text-fullWhite font-semibold">Preparing Inspection Records</p>
                <p className="text-xs font-mono text-greige">Loading inspection data and associated analysis records...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-10 text-center bg-surface-dark rounded border border-white/10 space-y-2.5 max-w-md mx-auto my-4">
                <p className="text-xs font-mono font-bold text-fullWhite">No Inspection Analyses Available</p>
                <p className="text-xs text-greige">Completed inspection analyses will appear here after an inspection has been processed.</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('inspection')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition cursor-pointer"
                  >
                    <span>Start New Inspection</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-surface-dark border-b border-white/10 text-greige font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 font-semibold">Inspection ID</th>
                      <th className="py-2.5 px-3 font-semibold">Platform Zone</th>
                      <th className="py-2.5 px-3 font-semibold">Verdict</th>
                      <th className="py-2.5 px-3 font-semibold">Defect Count</th>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs bg-surface-panel">
                    {historyList.slice(0, 10).map((insp) => (
                      <tr key={insp.id} className="hover:bg-surface-dark/60 nav-transition">
                        <td className="py-3 px-3 font-bold text-fullWhite">
                          #{insp.id}
                        </td>
                        <td className="py-3 px-3 text-fullWhite">
                          {insp.zone_name || `Zone ${insp.zone_id}`}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={insp.overall_verdict} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-fullWhite font-bold">
                          {insp.defect_count ?? 0}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-greige">
                          {new Date(insp.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/inspections/${insp.id}`)}
                            className="inline-flex items-center gap-1 text-xs text-matteSage hover:underline nav-transition cursor-pointer font-semibold"
                          >
                            <span>View Analysis</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Platform Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-panel rounded border border-white/15 p-5 shadow-elevated space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-matteSage" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-fullWhite">
                  Add Inspection Zone
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddZoneModal(false)}
                className="text-greige hover:text-fullWhite font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateZone} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-greige mb-1" htmlFor="zoneName">
                  Zone Designation / Structure Identifier
                </label>
                <input
                  id="zoneName"
                  type="text"
                  required
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Starboard Midship Strake B3"
                  className="w-full px-3 py-2 rounded border border-white/10 bg-surface-dark text-xs font-mono text-fullWhite focus:outline-hidden focus:ring-1 focus:ring-grayGreen"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-greige mb-1" htmlFor="zoneDesc">
                  Environmental Exposure & Substrate Details
                </label>
                <textarea
                  id="zoneDesc"
                  rows={3}
                  value={newZoneDesc}
                  onChange={(e) => setNewZoneDesc(e.target.value)}
                  placeholder="e.g. Splash zone exposure subject to tidal flow and turbulence..."
                  className="w-full px-3 py-2 rounded border border-white/10 bg-surface-dark text-xs font-mono text-fullWhite focus:outline-hidden focus:ring-1 focus:ring-grayGreen"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddZoneModal(false)}
                  className="px-3.5 py-1.5 rounded border border-white/10 text-xs font-mono text-greige hover:bg-surface-dark cursor-pointer nav-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={zoneModalLoading || !newZoneName.trim()}
                  className="px-4 py-1.5 rounded border border-grayGreen bg-grayGreen text-fullWhite text-xs font-mono font-semibold hover:bg-grayGreen-light nav-transition cursor-pointer disabled:opacity-50"
                >
                  {zoneModalLoading ? 'Saving...' : 'Save Inspection Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
