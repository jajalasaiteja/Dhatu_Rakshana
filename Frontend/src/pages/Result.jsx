import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient, { resolveMediaUrl, downloadInspectionReport } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import BoundingBoxOverlay from '../components/BoundingBoxOverlay';
import Interactive3DTopography from '../components/Interactive3DTopography';
import MeshViewer from '../components/MeshViewer';
import DefectClassificationTable from '../components/DefectClassificationTable';
import StructuredEvaluationPanel from '../components/StructuredEvaluationPanel';
import { formatISTDateTime, formatISTDate } from '../utils/dateTime';
import { isObsoleteHistoricalRecord } from '../utils/inspectionFilters';
import {
  FileDown,
  Box,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  Layers,
  Trash2
} from 'lucide-react';

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isNotFound, setIsNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [hoveredDetId, setHoveredDetId] = useState(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // PDF Report Download States: 'idle' | 'downloading' | 'success' | 'error'
  const [reportState, setReportState] = useState('idle');
  const [reportError, setReportError] = useState('');

  const pollTimerRef = useRef(null);

  const fetchInspection = async (isBackground = false) => {
    if (!isBackground) { setLoading(true); setInspection(null); }

    setErrorMsg('');
    setIsNotFound(false);

    try {
      const data = await apiClient(`/inspections/${id}`);
      if (isObsoleteHistoricalRecord(data)) {
        setIsNotFound(true);
        setErrorMsg(`Inspection record #${id} not found in the active database.`);
    
        setLoading(false);
        return;
      }
      setInspection(data);
      setLoading(false);
      setErrorMsg('');
      setIsNotFound(false);

      // Polling contract: if pending, poll every 3 s (max 40 tries)
      const isPending = (data.overall_verdict || '').toLowerCase() === 'pending' && (data.status || '').toLowerCase() !== 'failed';
      if (isPending && pollCount < 40) {
        pollTimerRef.current = setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 3000);
      }
    } catch (err) {
      setLoading(false);
  
      if (err.status === 404 || err.isNotFound) {
        setIsNotFound(true);
        setErrorMsg(err.message || `Inspection record #${id} not found in the active database.`);
      } else {
        setErrorMsg(err.message || 'Failed to retrieve inspection record.');
      }
    }
  };

  useEffect(() => {
    fetchInspection(pollCount > 0);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [id, pollCount]);

  useEffect(() => {
    const handleFocusOrPop = () => {
      fetchInspection(true);
    };
    window.addEventListener('popstate', handleFocusOrPop);
    window.addEventListener('focus', handleFocusOrPop);
    return () => {
      window.removeEventListener('popstate', handleFocusOrPop);
      window.removeEventListener('focus', handleFocusOrPop);
    };
  }, [id]);

  const handleDeleteInspection = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete Inspection #${id}? This will remove all associated measurements, 3D topology, and defect records from the active database.`)) {
      return;
    }
    setDeleting(true);
    try {
      await apiClient.delete(`/inspections/${id}`);
  
      window.dispatchEvent(new CustomEvent('inspection:deleted', { detail: { id } }));
      navigate('/inspections');
    } catch (err) {
      setDeleting(false);
      alert(err.message || 'Failed to delete inspection.');
    }
  };

  const handleDownloadReport = async () => {
    if (!inspection) return;
    setReportState('downloading');
    setReportError('');

    try {
      await downloadInspectionReport(id);
      setReportState('success');
      setTimeout(() => setReportState('idle'), 3500);
    } catch (err) {
      setReportState('error');
      setReportError(err.message || 'Inspection report compilation timed out or failed. Please retry.');
    }
  };

  const handleDownloadTopology = async () => {
    if (!inspection) return;
    try {
      const blob = await apiClient(`/inspections/${id}/topology/file`, {
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
    } catch (err) {
      alert(err.message || 'Failed to download 3D micro-topography PLY file.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-32 bg-surface-panel border border-white/10 rounded animate-pulse"></div>
        <div className="bg-surface-panel rounded border border-white/10 p-8 space-y-4 shadow-panel">
          <div className="h-6 w-48 bg-surface-dark rounded animate-pulse"></div>
          <div className="h-64 bg-surface-darker rounded border border-white/10 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" className="text-matteSage" />
            <div className="text-center space-y-1">
              <h3 className="text-sm font-mono font-bold text-fullWhite uppercase tracking-wide">
                Preparing Inspection Record
              </h3>
              <p className="text-xs font-mono text-greige">
                Loading inspection data, defect annotations, and surface topography records.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-12">
        <div className="bg-surface-panel rounded border border-white/10 p-8 text-center space-y-4 shadow-panel">
          <div className="w-12 h-12 rounded border border-white/15 bg-surface-darker flex items-center justify-center text-greige mx-auto">
            <Layers className="w-6 h-6 text-greige/70" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-mono font-bold text-fullWhite uppercase tracking-wide">
              Inspection Record Not Found
            </h2>
            <p className="text-xs font-mono text-greige leading-relaxed">
              Inspection #{id} does not exist in the active database or has been deleted.
              No stale, unrecorded, or deleted inspection records are retained in the application.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/inspections"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-fullWhite text-xs font-mono nav-transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Analysis History</span>
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition"
            >
              <span>Start New Inspection</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <Link
          to="/inspections"
          className="text-xs font-mono text-greige hover:text-fullWhite inline-flex items-center gap-1.5 nav-transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Analysis History</span>
        </Link>
        <ErrorPanel message={errorMsg} onRetry={fetchInspection} />
      </div>
    );
  }

  if (!inspection) return null;

  const detections = inspection.detections || [];
  const gradedResults = inspection.graded_results || [];

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

  // Build candidate images from all possible inspection schema formats
  const candidateImages = [];
  if (Array.isArray(inspection.image_urls) && inspection.image_urls.length > 0) {
    candidateImages.push(...inspection.image_urls);
  }
  if (inspection.image_url) candidateImages.push(inspection.image_url);
  if (inspection.thumbnail_url) candidateImages.push(inspection.thumbnail_url);
  if (inspection.annotated_image) candidateImages.push(inspection.annotated_image);
  if (inspection.original_image) candidateImages.push(inspection.original_image);
  if (inspection.image_path && typeof inspection.image_path === 'string') {
    const splitPaths = inspection.image_path.split(',').map((p) => p.trim()).filter(Boolean);
    candidateImages.push(...splitPaths);
  }
  if (Array.isArray(inspection.images) && inspection.images.length > 0) {
    for (const img of inspection.images) {
      if (typeof img === 'string') candidateImages.push(img);
      else if (img && img.storage_key) candidateImages.push(`/api/v1/storage/file?key=${encodeURIComponent(img.storage_key)}`);
      else if (img && img.url) candidateImages.push(img.url);
    }
  }

  // Deduplicate and resolve URLs safely
  const uniqueRawUrls = [...new Set(candidateImages.filter(Boolean))];
  const resolvedImageUrls = uniqueRawUrls.map(resolveMediaUrl);

  // Active image URL for current angle/perspective selection
  const safeImageIdx = activeImageIdx < resolvedImageUrls.length ? activeImageIdx : 0;
  const activeImageUrl = resolvedImageUrls[safeImageIdx] || '';
  const currentImageRecord = (Array.isArray(inspection.images) ? inspection.images : [])[safeImageIdx] || null;
  const currentImageId = currentImageRecord ? currentImageRecord.id : null;
  const hasPerImageDetections = detections.some((d) => d.image_id != null);
  const visibleDetections = (hasPerImageDetections && currentImageId) ? detections.filter((d) => d.image_id === currentImageId) : ((hasPerImageDetections && (inspection.images || []).length > 1) ? [] : detections);

  const hasTopology = Boolean(inspection.topology_available || inspection.mesh_url);
  const meshUrl = hasTopology
    ? resolveMediaUrl(inspection.mesh_url || `/api/v1/inspections/${id}/topology/file`)
    : null;
  const isPending = (inspection.overall_verdict || '').toLowerCase() === 'pending' && (inspection.status || '').toLowerCase() !== 'failed';

  return (
    <div className="space-y-5">
      
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex items-center justify-between font-mono text-xs">
        <Link
          to="/inspections"
          className="text-greige hover:text-fullWhite inline-flex items-center gap-1.5 nav-transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Analysis History</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDeleteInspection}
            disabled={deleting}
            title="Permanently delete inspection from database"
            className="px-3 py-1.5 rounded border border-status-failBorder/70 bg-surface-dark hover:bg-status-fail/20 text-status-failText text-xs font-mono flex items-center gap-1.5 nav-transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleting ? 'Deleting...' : 'Delete Inspection'}</span>
          </button>

          <Link
            to="/dashboard"
            className="text-matteSage hover:underline inline-flex items-center gap-1 nav-transition font-semibold"
          >
            <span>+ Start New Inspection</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Level 1: Inspection Details Structured Record Panel */}
      <div className="bg-surface-panel rounded border border-white/10 p-5 shadow-panel space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-sm sm:text-base font-mono font-bold text-fullWhite">
                Inspection Record Details
              </h2>
              <span className="px-2 py-0.5 rounded border border-white/15 bg-surface-dark font-mono text-xs font-bold text-matteSage">
                {inspection.display_label ? inspection.display_label.toUpperCase() : `RECORD ${inspection.id}`}
              </span>
              {inspection.operation_mode && (
                <span className="px-2 py-0.5 rounded border border-grayGreen/50 bg-surface-dark font-mono text-xs font-bold text-matteSage uppercase">
                  MODE: {inspection.operation_mode.replace('_', ' ')}
                </span>
              )}
              <StatusBadge status={inspection.overall_verdict} size="lg" />
            </div>
            <p className="text-xs text-greige mt-1 font-medium leading-relaxed font-sans">
              Recorded analysis details, observed coating condition, and standards compliance evidence.
            </p>
          </div>

          {/* PDF Report Download Action */}
          <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isPending || reportState === 'downloading'}
              className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider flex items-center gap-2 nav-transition border shadow-technical cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                reportState === 'downloading'
                  ? 'bg-surface-dark border-white/10 text-fullWhite'
                  : reportState === 'success'
                  ? 'bg-status-pass border-status-passBorder text-status-passText font-semibold'
                  : reportState === 'error'
                  ? 'bg-status-fail border-status-failBorder text-status-failText'
                  : 'bg-grayGreen hover:bg-grayGreen-light border-grayGreen text-fullWhite font-semibold'
              }`}
            >
              {reportState === 'downloading' ? (
                <>
                  <Spinner size="sm" className="text-fullWhite" />
                  <span>Generating Inspection Report...</span>
                </>
              ) : reportState === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-status-passText" />
                  <span>Inspection Report Downloaded</span>
                </>
              ) : reportState === 'error' ? (
                <>
                  <RotateCcw className="w-4 h-4 text-status-failText" />
                  <span>Retry Report Download</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-fullWhite" />
                  <span>Download Inspection Report (PDF)</span>
                </>
              )}
            </button>

            {reportError && (
              <p className="text-[10px] font-mono text-status-failText max-w-xs text-right">
                {reportError}
              </p>
            )}

            <p className="text-[10px] font-mono text-greige">
              Structured engineering documentation with recorded defect coordinates
            </p>
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
                  {inspection.zone?.name || inspection.zone_name || `Zone ${inspection.zone_id}`}
                </td>
                <td className="py-2.5 px-3.5 text-greige uppercase font-bold text-[10px] w-48 bg-surface-panel/40">
                  ANALYSIS DATE (IST)
                </td>
                <td className="py-2.5 px-3.5 text-matteSage font-medium">
                  {formatISTDateTime(inspection.timestamp)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 text-greige uppercase font-bold text-[10px] bg-surface-panel/40">
                  PROCESSING STATUS
                </td>
                <td className="py-2.5 px-3.5 text-fullWhite">
                  {isPending ? (
                    <span className="flex items-center gap-1.5 text-greige">
                      <Spinner size="xs" />
                      <span>Processing Imagery & Topography</span>
                    </span>
                  ) : (
                    <span className="text-matteSage font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-matteSage" />
                      <span>{inspection.status || 'COMPLETED'}</span>
                    </span>
                  )}
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
                <p className="text-[11px] text-greige font-medium mt-0.5 leading-relaxed font-sans">
                  {show3DViewer
                    ? 'The reconstructed surface provides an elevation model of coating condition representing micro-roughness, pits, and blisters. Left-click drag to rotate, wheel to zoom.'
                    : 'Review the source inspection image used as the basis for defect identification and surface-condition assessment.'}
                </p>
              </div>

              {/* View Mode Toggle */}
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

            {/* Multi-perspective Thumbnail Selector (if multiple images) */}
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

            {/* Viewport Display */}
            {show3DViewer ? (
              <Interactive3DTopography
                imageUrl={activeImageUrl}
                meshUrl={meshUrl}
                title={`Surface Topography — ${inspection.display_label || `Inspection #${inspection.id}`}`}
              />
            ) : activeImageUrl ? (
              <BoundingBoxOverlay
                imageUrl={activeImageUrl}
                detections={visibleDetections}
                hoveredId={hoveredDetId}
                onHover={setHoveredDetId}
                onClick={setHoveredDetId}
              />
            ) : (
              <div className="w-full h-80 rounded-lg border border-white/10 bg-surface-darker flex flex-col items-center justify-center gap-2 p-6 text-center select-none shadow-technical">
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
                      {inspection.topology_info?.file_size
                        ? `${(inspection.topology_info.file_size / (1024 * 1024)).toFixed(2)} MB`
                        : (hasTopology ? 'Binary PLY' : 'N/A')}
                    </span>
                  </div>
                  <div>
                    <span className="text-greige block text-[10px] font-bold">GENERATED (IST)</span>
                    <span className="text-fullWhite truncate block">
                      {formatISTDateTime(inspection.topology_info?.created_at || inspection.timestamp, { includeSeconds: false })}
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
            <MeshViewer meshPath={inspection.mesh_url} />
          </div>

        </div>

        {/* Right Column: Surface Condition Assessment & Defect Classification */}
        <div className="lg:col-span-5 relative min-h-0">
          <div className="bg-surface-panel rounded border border-white/10 p-5 shadow-panel flex flex-col min-h-0 lg:absolute lg:inset-0">
            
            <div className="pb-2.5 border-b border-white/10 flex items-center justify-between shrink-0 mb-3.5">
              <div>
                <h3 className="text-xs font-mono font-bold text-fullWhite uppercase tracking-wide">
                  Surface Condition Assessment
                </h3>
                <p className="text-[11px] text-greige font-medium mt-0.5 font-sans">
                  Identified coating defects, morphology classification, severity, and standards criteria.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded border border-white/10 bg-surface-dark font-mono text-[10px] text-matteSage shrink-0">
                {detections.length} ANOMALIES
              </span>
            </div>

            {/* Defect Classification Context */}
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

      {/* Comprehensive ISO-Aligned Evaluation Engine Results */}
      <StructuredEvaluationPanel inspection={inspection} />

    </div>
  );
}
