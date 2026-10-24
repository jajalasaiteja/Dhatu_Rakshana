import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { resolveMediaUrl } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import BoundingBoxOverlay from '../components/BoundingBoxOverlay';
import Interactive3DTopography from '../components/Interactive3DTopography';
import MeshViewer from '../components/MeshViewer';
import DefectClassificationTable from '../components/DefectClassificationTable';
import StructuredEvaluationPanel from '../components/StructuredEvaluationPanel';
import ThemeToggle from '../components/ThemeToggle';
import { formatISTDateTime, formatISTDate } from '../utils/dateTime';
import { isObsoleteHistoricalRecord } from '../utils/inspectionFilters';
import {
  Shield,
  ArrowLeft,
  Calendar,
  Box,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  UserCheck,
  ChevronRight,
  Maximize2,
  FileDown
} from 'lucide-react';

export default function VisitorRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { visitorUser, logoutVisitor } = useAuth();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isNotFound, setIsNotFound] = useState(false);
  const [hoveredDetId, setHoveredDetId] = useState(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const fetchDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    setIsNotFound(false);
    setRecord(null);
    try {
      const data = await apiClient(`/visitors/records/${id}`);
      if (isObsoleteHistoricalRecord(data)) {
        setIsNotFound(true);
        setErrorMsg(`Visitor inspection record #${id} was not found or has been deleted.`);
        setRecord(null);
        setLoading(false);
        return;
      }
      setRecord(data);
      setLoading(false);
      setErrorMsg('');
      setIsNotFound(false);
    } catch (err) {
      setLoading(false);
      setRecord(null);
      if (err.status === 404 || err.isNotFound) {
        setIsNotFound(true);
        setErrorMsg(err.message || `Visitor inspection record #${id} was not found or has been deleted.`);
      } else {
        setErrorMsg(err.message || 'Failed to retrieve visitor inspection record detail.');
      }
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    const handleSync = () => {
      fetchDetail();
    };
    window.addEventListener('popstate', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('popstate', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [id]);

  const handleEndSession = () => {
    logoutVisitor();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-sans text-content-primary">
        <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/visitor/records"
                className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite text-xs font-mono inline-flex items-center gap-1.5 nav-transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Records</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-4">
          <div className="h-5 w-32 bg-surface-panel border border-white/10 rounded animate-pulse" />
          <div className="bg-surface-panel rounded border border-white/10 p-8 space-y-4 shadow-panel">
            <div className="h-6 w-48 bg-surface-dark rounded animate-pulse" />
            <div className="h-64 bg-surface-dark rounded border border-white/10 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" className="text-matteSage" />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-mono font-bold text-fullWhite uppercase tracking-wide">
                  Retrieving Inspection Record
                </h3>
                <p className="text-xs font-mono text-greige">
                  Loading analysis data, defect classifications, and surface topography artifacts...
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-sans text-content-primary">
        <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
            <Link
              to="/visitor/records"
              className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite text-xs font-mono inline-flex items-center gap-1.5 nav-transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Records</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 space-y-4">
          <div className="bg-surface-panel rounded border border-white/10 p-8 text-center space-y-4 shadow-panel">
            <div className="w-12 h-12 rounded border border-white/15 bg-surface-dark flex items-center justify-center text-greige mx-auto">
              <Layers className="w-6 h-6 text-greige/70" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-mono font-bold text-fullWhite uppercase tracking-wide">
                Inspection Record Not Found
              </h2>
              <p className="text-xs font-mono text-greige leading-relaxed">
                Inspection #{id} was not found in the active database or has been deleted.
                Visitors are permitted to view genuine, successfully persisted inspection entries only.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/visitor/records"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Permitted Records</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-sans text-content-primary">
        <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
            <Link
              to="/visitor/records"
              className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite text-xs font-mono inline-flex items-center gap-1.5 nav-transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Records</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-4">
          <ErrorPanel
            title="Unable to Load Inspection Record"
            message={errorMsg}
            onRetry={fetchDetail}
          />
        </main>
      </div>
    );
  }

  if (!record) return null;

  const detections = record.detections || [];
  const gradedResults = record.graded_results || [];

  // Match graded result to detection by detection_id
  const getGradeForDetection = (detId) => {
    const matched = gradedResults.find((g) => g.detection_id === detId);
    if (matched) return matched;
    const det = detections.find((d) => d.id === detId);
    if (det && det.graded_records && det.graded_records[0]) {
      return det.graded_records[0];
    }
    return null;
  };

  // Build candidate images from all possible record schema formats
  const candidateImages = [];
  if (Array.isArray(record.image_urls) && record.image_urls.length > 0) {
    candidateImages.push(...record.image_urls);
  }
  if (record.image_url) candidateImages.push(record.image_url);
  if (record.thumbnail_url) candidateImages.push(record.thumbnail_url);
  if (record.original_image) candidateImages.push(record.original_image);

  const uniqueRawUrls = [...new Set(candidateImages.filter(Boolean))];
  const resolvedImageUrls = uniqueRawUrls.map(resolveMediaUrl);

  const safeImageIdx = activeImageIdx < resolvedImageUrls.length ? activeImageIdx : 0;
  const activeImageUrl = resolvedImageUrls[safeImageIdx] || '';

  const hasTopology = Boolean(record.topology_available || record.mesh_url);
  const meshUrl = hasTopology
    ? resolveMediaUrl(record.mesh_url || `/api/v1/visitors/records/${id}/topology/file`)
    : null;

  const handleDownloadTopology = async () => {
    if (!record || !meshUrl) return;
    try {
      const endpoint = `/visitors/records/${id}/topology/file`;
      const blob = await apiClient(endpoint, {
        method: 'GET',
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `dhatu-rakshana-topology-${id}.ply`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(meshUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-content-primary font-sans selection:bg-grayGreen/50 selection:text-white">
      
      {/* Sticky Visitor Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/visitor/records"
              className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage text-greige hover:text-fullWhite text-xs font-mono inline-flex items-center gap-1.5 nav-transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Records</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-fullWhite font-mono font-bold text-sm">
                {record?.display_label || `Specimen #${id}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-matteSage/40 bg-surface-dark text-matteSage font-mono font-semibold">
                READ-ONLY AUDITED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-mono font-semibold text-fullWhite flex items-center gap-1 justify-end">
                  <UserCheck className="w-3 h-3 text-matteSage" />
                  <span>{visitorUser?.username || 'Visitor'}</span>
                </span>
                <span className="text-[10px] font-mono text-greige uppercase">
                  Audited Session
                </span>
              </div>
              <button
                type="button"
                onClick={handleEndSession}
                className="px-2.5 py-1 rounded border border-status-failBorder/80 bg-status-fail/30 hover:bg-status-fail/60 text-status-failText text-xs font-mono nav-transition cursor-pointer"
                title="End visitor session"
              >
                <LogOut className="w-3.5 h-3.5 sm:hidden" />
                <span className="hidden sm:inline">End Session</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-6">
        
        {/* Level 1: Inspection Details Structured Record Panel (1:1 with Result.jsx) */}
        <div className="bg-surface-panel rounded border border-white/10 p-5 shadow-panel space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-sm sm:text-base font-mono font-bold text-fullWhite">
                  Inspection Record Details
                </h2>
                <span className="px-2 py-0.5 rounded border border-white/15 bg-surface-dark font-mono text-xs font-bold text-matteSage">
                  {record.display_label ? record.display_label.toUpperCase() : `INSPECTION #${record.id}`}
                </span>
                <StatusBadge status={record.overall_verdict} size="lg" />
                <span className="px-2 py-0.5 rounded border border-grayGreen/40 bg-surface-dark font-mono text-[11px] text-matteSage font-semibold">
                  VISITOR AUTHORIZED VIEW
                </span>
              </div>
              <p className="text-xs text-content-secondary mt-1 font-medium leading-relaxed font-sans">
                Recorded analysis details, observed coating condition, and standards compliance evidence.
              </p>
            </div>

            {/* Read-Only Notice Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-white/10 bg-surface-dark text-greige text-xs font-mono shrink-0">
              <Info className="w-3.5 h-3.5 text-matteSage shrink-0" />
              <span>Inspection record is protected against external modification</span>
            </div>
          </div>

          {/* Structured Technical Metadata Table */}
          <div className="overflow-x-auto rounded border border-white/10 bg-surface-dark/60">
            <table className="w-full text-left text-xs font-mono">
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="py-2.5 px-3.5 text-greige uppercase font-bold text-[10px] w-48 bg-surface-panel/40">
                    PLATFORM ZONE
                  </td>
                  <td className="py-2.5 px-3.5 text-fullWhite font-semibold">
                    {record.zone?.name || record.zone_name || `Zone ${record.zone_id}`}
                  </td>
                  <td className="py-2.5 px-3.5 text-greige uppercase font-bold text-[10px] w-48 bg-surface-panel/40">
                    ANALYSIS DATE (IST)
                  </td>
                  <td className="py-2.5 px-3.5 text-matteSage font-medium">
                    {formatISTDateTime(record.timestamp)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3.5 text-greige uppercase font-bold text-[10px] bg-surface-panel/40">
                    PROCESSING STATUS
                  </td>
                  <td className="py-2.5 px-3.5 text-fullWhite">
                    <span className="text-matteSage font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-matteSage" />
                      <span>{record.status || 'COMPLETED'}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-greige uppercase font-bold text-[10px] bg-surface-panel/40">
                    ASSESSMENT BASIS
                  </td>
                  <td className="py-2.5 px-3.5 text-matteSage font-medium">
                    ISO 4628 • SSPC-PA 2 / VIS 2 • NACE SP0188
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Level 2 & 3: Primary Evidence & Analytical Findings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left Column: 3D Micro-Topography Panel & Surface Topography Mesh */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Contextual Evidence Viewport */}
            <div className="bg-surface-panel rounded border border-white/10 p-5 shadow-panel space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-white/10">
                <div className="max-w-md">
                  <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                    {show3DViewer ? 'Three-Dimensional Surface Analysis' : 'Inspection Image & Defect Overlay'}
                  </h3>
                  <p className="text-[11px] text-content-secondary font-medium mt-0.5 leading-relaxed font-sans">
                    {show3DViewer
                      ? 'The reconstructed surface provides an elevation model of coating condition representing micro-roughness, pits, and blisters. Left-click drag to rotate, wheel to zoom.'
                      : 'Review the source inspection image used as the basis for defect identification and surface-condition assessment.'}
                  </p>
                </div>

                {/* View Mode Toggle: 2D Defect Overlay vs 3D Topography */}
                <div className="flex items-center gap-1 p-0.5 rounded border border-white/10 bg-surface-dark text-xs font-mono shrink-0">
                  <button
                    type="button"
                    onClick={() => setShow3DViewer(false)}
                    className={`px-2.5 py-1 rounded nav-transition cursor-pointer text-[11px] ${
                      !show3DViewer
                        ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/50'
                        : 'text-greige hover:text-fullWhite'
                    }`}
                  >
                    2D Defect Overlay
                  </button>
                  <button
                    type="button"
                    onClick={() => setShow3DViewer(true)}
                    className={`px-2.5 py-1 rounded nav-transition cursor-pointer text-[11px] ${
                      show3DViewer
                        ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/50'
                        : 'text-greige hover:text-fullWhite'
                    }`}
                  >
                    3D Topography
                  </button>
                </div>
              </div>

              {/* Multi-perspective Thumbnail Selector */}
              {resolvedImageUrls.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono">
                  <span className="text-[10px] font-semibold text-greige shrink-0 uppercase tracking-wider">
                    Inspection Angles:
                  </span>
                  {resolvedImageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-12 h-12 rounded overflow-hidden shrink-0 border nav-transition cursor-pointer ${
                        activeImageIdx === idx
                          ? 'border-grayGreen ring-1 ring-grayGreen shadow-panel'
                          : 'border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Angle #${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Viewport Display: 3D Topography vs 2D Defect Overlay */}
              {show3DViewer ? (
                <Interactive3DTopography
                  imageUrl={activeImageUrl}
                  meshUrl={meshUrl}
                  title={`Surface Topography — ${record.display_label || `Inspection #${record.id}`}`}
                />
              ) : activeImageUrl ? (
                <BoundingBoxOverlay
                  imageUrl={activeImageUrl}
                  detections={detections}
                  hoveredId={hoveredDetId}
                  onHover={setHoveredDetId}
                  onClick={setHoveredDetId}
                />
              ) : (
                <div className="w-full h-80 rounded-lg border border-white/10 bg-surface-dark flex flex-col items-center justify-center gap-2 p-6 text-center select-none shadow-technical">
                  <Layers className="w-8 h-8 text-greige opacity-50" />
                  <div className="space-y-1">
                    <div className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                      No Specimen Scan Available
                    </div>
                    <p className="text-[11px] font-mono text-greige max-w-sm">
                      This inspection record does not contain an associated 2D optical scan.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-greige pt-0.5">
                <span>Red = Defect anomaly • Sage = Particulate / Contaminant</span>
                {hasTopology && (
                  <button
                    type="button"
                    onClick={handleDownloadTopology}
                    className="text-matteSage hover:underline font-semibold flex items-center gap-1 nav-transition cursor-pointer"
                  >
                    <Box className="w-3 h-3 text-matteSage" />
                    <span>Download Surface Mesh (.PLY)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Surface Topography Mesh Information & Topography Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* 3D Micro-Topography Metadata Card */}
              <div className="p-3.5 rounded bg-surface-dark border border-white/10 shadow-panel space-y-2.5 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-matteSage shrink-0" />
                      <span className="font-bold text-fullWhite uppercase tracking-wide">3D Micro-Topography</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      hasTopology
                        ? 'bg-status-pass border-status-passBorder text-status-passText'
                        : 'bg-surface-panel border-white/10 text-greige'
                    }`}>
                      {hasTopology ? 'AVAILABLE' : 'NOT AVAILABLE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2">
                    <div>
                      <span className="text-greige block text-[10px] font-bold">FILE SIZE</span>
                      <span className="text-fullWhite font-semibold truncate block">
                        {record.topology_info?.file_size
                          ? `${(record.topology_info.file_size / (1024 * 1024)).toFixed(2)} MB`
                          : (hasTopology ? 'Binary PLY' : 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span className="text-greige block text-[10px] font-bold">GENERATED (IST)</span>
                      <span className="text-fullWhite truncate block">
                        {formatISTDateTime(record.topology_info?.created_at || record.timestamp, { includeSeconds: false })}
                      </span>
                    </div>
                    <div>
                      <span className="text-greige block text-[10px] font-bold">INTEGRITY</span>
                      <span className="text-matteSage font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-matteSage shrink-0" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-greige block text-[10px] font-bold">STORAGE</span>
                      <span className="text-fullWhite font-semibold truncate block">Persistent Vault</span>
                    </div>
                  </div>
                </div>

                {hasTopology && (
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShow3DViewer(true)}
                      className="flex-1 py-1.5 px-2 rounded bg-surface-panel hover:bg-surface-elevated border border-white/10 text-xs font-semibold text-fullWhite nav-transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5 text-matteSage" />
                      <span>Inspect in 3D</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTopology}
                      className="flex-1 py-1.5 px-2 rounded bg-grayGreen hover:bg-grayGreen-light border border-grayGreen text-xs font-semibold text-fullWhite nav-transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-fullWhite" />
                      <span>Download PLY</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Surface Topography Mesh Information */}
              <MeshViewer meshPath={record.mesh_url} />
            </div>

          </div>

          {/* Right Column: Surface Condition Assessment & Defect Classification */}
          <div className="lg:col-span-5 relative min-h-0">
            <div className="bg-surface-panel rounded border border-white/10 p-5 shadow-panel flex flex-col min-h-0 lg:absolute lg:inset-0">
              
              {/* Surface Condition Header */}
              <div className="pb-2.5 border-b border-white/10 flex items-center justify-between shrink-0 mb-3.5">
                <div>
                  <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                    Surface Condition Assessment
                  </h3>
                  <p className="text-[11px] text-content-secondary font-medium mt-0.5 font-sans">
                    Identified coating defects, morphology classification, severity, and standards criteria.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded border border-white/10 bg-surface-dark font-mono text-[10px] text-matteSage shrink-0">
                  {detections.length} ANOMALIES
                </span>
              </div>

              {/* Defect Classification Context Description */}
              <div className="p-3 rounded bg-surface-dark/80 border border-white/10 text-[11px] text-greige leading-relaxed space-y-1 shrink-0 mb-3.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-fullWhite block">
                  Defect Identification and Classification
                </span>
                <p className="font-sans">
                  Identified surface anomalies are organized by defect type and relevant characteristics to support consistent inspection and assessment.
                </p>
              </div>

              {/* Compact, Scrollable Defect Classification Table */}
              <DefectClassificationTable
                detections={detections}
                getGradeForDetection={getGradeForDetection}
                hoveredDetId={hoveredDetId}
                onHoverDetection={setHoveredDetId}
                onSelectDetection={setHoveredDetId}
                className="flex-1 min-h-0"
              />

            </div>
          </div>

        </div>

        {/* Structured ISO-Aligned Evaluation Results (Visitor Read-Only Mode) */}
        <StructuredEvaluationPanel inspection={record} />

      </main>
    </div>
  );
}
