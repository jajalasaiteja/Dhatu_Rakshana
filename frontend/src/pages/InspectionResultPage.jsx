import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Box, Download, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import api, { getMediaUrl } from '../api';
import StatusBadge from '../components/StatusBadge';
import BoundingBoxCanvas from '../components/BoundingBoxCanvas';
import MeshViewer from '../components/MeshViewer';
import Interactive3DTopography from '../components/Interactive3DTopography';

export default function InspectionResultPage() {
  const { id } = useParams();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedDetectionId, setSelectedDetectionId] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [activeView, setActiveView] = useState('2d'); // '2d' | '3d'

  useEffect(() => {
    setLoading(true);
    api.get(`/inspections/${id}`)
      .then((res) => {
        setInspection(res.data);
        if (res.data?.detections?.length > 0) {
          setSelectedDetectionId(res.data.detections[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg('Failed to load inspection details.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Loading Dhatu Rakshana platform audit #{id}...</p>
      </div>
    );
  }

  if (errorMsg || !inspection) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl">
          <p className="text-base font-semibold text-slate-800">{errorMsg || 'Inspection record not found.'}</p>
          <Link to="/history" className="mt-4 inline-block px-5 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold">
            Return to History
          </Link>
        </div>
      </div>
    );
  }

  const detections = inspection.detections || [];
  const imageUrl = getMediaUrl(inspection.image_url);
  const meshUrl = inspection.mesh_url ? getMediaUrl(inspection.mesh_url) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/history"
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
                Inspection #{inspection.id}
              </h1>
              <StatusBadge status={inspection.overall_verdict} size="lg" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Zone: <span className="font-semibold text-slate-800">{inspection.zone?.name || 'Unspecified'}</span> • {new Date(inspection.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* View Toggle (2D Defect Canvas vs Real 3D Topography) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full border border-slate-200/80">
          <button
            onClick={() => setActiveView('2d')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeView === '2d'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2D Defect Boxes
          </button>
          <button
            onClick={() => setActiveView('3d')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === '3d'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Interactive 3D Mesh</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 2D Canvas or 3D Topography */}
        <div className="lg:col-span-7 space-y-6">
          {activeView === '2d' ? (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Specimen Defect Localization
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Show Defect Tags
                </label>
              </div>

              <BoundingBoxCanvas
                imageUrl={imageUrl}
                detections={detections}
                selectedId={selectedDetectionId}
                onSelectDetection={setSelectedDetectionId}
                showLabels={showLabels}
              />

              <p className="text-xs text-slate-400 text-center">
                Click any bounding box or row in the audit table to highlight compliance metrics.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Interactive3DTopography
                imageUrl={imageUrl}
                meshUrl={meshUrl}
                title="Reconstructed 3D Micro-Topography"
              />
            </div>
          )}

          {/* 3D Mesh Card */}
          <MeshViewer meshPath={inspection.mesh_url} />
        </div>

        {/* Right Column: Standards Compliance Audit Cards */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Standards Compliance Audit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated evaluation against SSPC-PA 2, NACE SP0188, ISO 4628, and ISO 8501.
                </p>
              </div>
            </div>

            {detections.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No coating defects detected. Specimen meets high cleanliness standards.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {detections.map((det, idx) => {
                  const isSelected = selectedDetectionId === det.id;
                  const grade = det.graded_records && det.graded_records[0];

                  return (
                    <div
                      key={det.id}
                      onClick={() => setSelectedDetectionId(det.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 capitalize font-mono">
                            {det.subtype}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({(det.confidence * 100).toFixed(0)}% conf)
                          </span>
                        </div>
                        <StatusBadge status={grade?.pass_fail || 'REVIEW'} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2.5">
                        <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                          <span className="text-slate-400 block text-[10px]">SEVERITY</span>
                          <StatusBadge status={grade?.severity || 'Medium'} size="sm" />
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                          <span className="text-slate-400 block text-[10px]">CLASS</span>
                          <span className="text-slate-700 font-semibold">{det.class}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 flex items-center gap-1">
                        <span className="text-slate-400">Standard:</span>
                        <span className="text-slate-700 truncate">{grade?.standard_reference || 'General Marine Standard'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Overall Verdict Card */}
            <div className={`p-4 rounded-2xl border mt-4 ${
              inspection.overall_verdict === 'PASS'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : inspection.overall_verdict === 'FAIL'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider font-mono">Overall Platform Verdict</span>
                <span className="text-sm font-bold font-mono">{inspection.overall_verdict}</span>
              </div>
              <p className="text-xs mt-1 text-slate-600">
                {inspection.overall_verdict === 'PASS' && 'Coating layer conforms with operational naval defense dry-film and discontinuity limits.'}
                {inspection.overall_verdict === 'REVIEW' && 'Localized coating discontinuities detected requiring visual inspection / secondary gauge audit.'}
                {inspection.overall_verdict === 'FAIL' && 'Severe film defect exceeding allowable ISO / SSPC area tolerances. Maintenance mandated.'}
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
