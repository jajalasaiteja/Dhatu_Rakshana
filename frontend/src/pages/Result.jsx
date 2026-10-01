import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient, { resolveMediaUrl } from '../api/client';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import BoundingBoxOverlay from '../components/BoundingBoxOverlay';
import Interactive3DTopography from '../components/Interactive3DTopography';

export default function Result() {
  const { id } = useParams();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [hoveredDetId, setHoveredDetId] = useState(null);
  const [show3DViewer, setShow3DViewer] = useState(false);

  const pollTimerRef = useRef(null);

  const fetchInspection = async () => {
    try {
      const data = await apiClient(`/inspections/${id}`);
      setInspection(data);
      setLoading(false);
      setErrorMsg('');

      // Polling contract: if pending, poll every 3 s (max 40 tries)
      if (data.overall_verdict === 'pending' && pollCount < 40) {
        pollTimerRef.current = setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 3000);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to load inspection record.');
    }
  };

  useEffect(() => {
    fetchInspection();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [id, pollCount]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded-sm animate-pulse"></div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded-sm animate-pulse"></div>
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center">
            <Spinner size="md" className="text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <Link to="/inspections" className="text-xs text-slate-500 hover:text-slate-900 font-medium">
          ← Back to history
        </Link>
        <ErrorPanel
          message={errorMsg}
          onRetry={fetchInspection}
        />
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
    // Fallback: check nested graded_records if present
    const det = detections.find((d) => d.id === detId);
    if (det && det.graded_records && det.graded_records[0]) {
      return det.graded_records[0];
    }
    return null;
  };

  const imageUrl = resolveMediaUrl(inspection.image_url || inspection.thumbnail_url);
  const meshUrl = inspection.mesh_url ? resolveMediaUrl(inspection.mesh_url) : null;
  const isPending = inspection.overall_verdict === 'pending';

  return (
    <div className="space-y-6">
      
      {/* Top back link */}
      <div>
        <Link
          to="/inspections"
          className="text-xs text-slate-500 hover:text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-400 rounded-sm"
        >
          ← Back to history
        </Link>
      </div>

      {/* Summary strip above table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
            Inspection #{inspection.id}
          </h1>
          <Badge status={inspection.overall_verdict} size="lg" />
          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-amber-700 font-mono">
              <Spinner size="sm" className="text-amber-600" />
              <span>Analysis in progress...</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500">Zone: </span>
            <strong className="text-slate-800">{inspection.zone?.name || inspection.zone_name || `Zone ${inspection.zone_id}`}</strong>
          </div>
          <div>
            <span className="text-slate-500">Detections: </span>
            <strong className="text-slate-800">{detections.length}</strong>
          </div>
          {meshUrl && (
            <a
              href={meshUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="coating_mesh.ply"
              className="text-slate-900 hover:underline font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-400 rounded-sm"
            >
              View 3D mesh
            </a>
          )}
        </div>
      </div>

      {/* Specimen Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Image with BoundingBoxOverlay or 3D view */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Coating Surface Specimen
            </span>
            {meshUrl && (
              <button
                type="button"
                onClick={() => setShow3DViewer(!show3DViewer)}
                className="text-xs text-slate-700 hover:text-slate-950 font-medium underline"
              >
                {show3DViewer ? 'Switch to 2D Bounding Boxes' : 'Interactive 3D Topography'}
              </button>
            )}
          </div>

          {show3DViewer ? (
            <Interactive3DTopography
              imageUrl={imageUrl}
              meshUrl={meshUrl}
            />
          ) : (
            <BoundingBoxOverlay
              imageUrl={imageUrl}
              detections={detections}
              hoveredId={hoveredDetId}
              onHover={setHoveredDetId}
              onClick={setHoveredDetId}
            />
          )}

          <p className="text-[11px] text-slate-400 text-center font-mono">
            Bounding boxes scaled to original image dimensions. Defect = Red, Particle = Blue.
          </p>
        </div>

        {/* Right Column: Verdict Table */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Standards Compliance Verdict
          </h2>

          {detections.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No detections — surface clear
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-slate-500 font-mono">
                    <th className="py-2.5 pr-2 font-medium">Subtype</th>
                    <th className="py-2.5 px-2 font-medium">Standard</th>
                    <th className="py-2.5 px-2 font-medium">Severity</th>
                    <th className="py-2.5 pl-2 font-medium text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {detections.map((det) => {
                    const grade = getGradeForDetection(det.id);
                    const isHovered = hoveredDetId === det.id;

                    return (
                      <tr
                        key={det.id}
                        onMouseEnter={() => setHoveredDetId(det.id)}
                        onMouseLeave={() => setHoveredDetId(null)}
                        className={`transition-colors cursor-pointer ${
                          isHovered ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 pr-2 capitalize font-mono text-slate-900">
                          {det.subtype || det.class}
                        </td>
                        <td className="py-3 px-2 text-slate-600 truncate max-w-[120px]">
                          {grade?.standard_reference || 'AMPP/SSPC-VIS 2'}
                        </td>
                        <td className="py-3 px-2 capitalize">
                          <Badge status={grade?.severity || 'medium'} size="sm" />
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <Badge status={grade?.pass_fail || 'review'} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
