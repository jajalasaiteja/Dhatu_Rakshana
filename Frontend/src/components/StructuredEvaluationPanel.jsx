import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Layers,
  Search,
  Filter,
  Box,
  Sliders,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Activity
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function StructuredEvaluationPanel({ inspection, initialTab = 'standards' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'standards' | 'quantitative' | 'measurements' | 'recommendations'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedMeasurementKey, setExpandedMeasurementKey] = useState(null);

  if (!inspection) return null;

  const evalSummary = inspection.evaluation_summary || {};
  const measurements = inspection.measurements || [];
  const quant = evalSummary.quantitative_defect_assessment || {};
  const standardsList = evalSummary.standards_based_assessment || [];
  const recommendations = evalSummary.recommendations || {};
  const fallbackLimitations = [
    'Dry film thickness cannot be inferred from 2D optical photographs (SSPC-PA 2 / ISO 19840 requires calibrated magnetic gauge).',
    'Coating dielectric continuity / holiday verification cannot be proven by optical inspection alone (NACE SP0188 requires spark tester).',
    'Pre-coating blast cleanliness (Sa / St) cannot be established retrospectively from painted surface without pre-blast records.',
    'Surface micro-topography depth and roughness indicators represent optical relative proxies, not calibrated physical profilometry.',
    'Pixel area measurements remain uncalibrated without physical dimensional reference markers in the image.'
  ];
  const limitations = (evalSummary.inspection_summary?.important_limitations && evalSummary.inspection_summary.important_limitations.length > 0)
    ? evalSummary.inspection_summary.important_limitations
    : fallbackLimitations;

  const categories = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'QUANTITATIVE_DEFECT', label: 'Defect Metrics' },
    { id: 'ISO_4628_DEGRADATION', label: 'ISO 4628 Degradation' },
    { id: 'ISO_8501_SURFACE_PREP', label: 'ISO 8501 Surface Prep' },
    { id: 'DRY_FILM_THICKNESS', label: 'SSPC-PA 2 Thickness' },
    { id: 'COATING_CONTINUITY', label: 'NACE SP0188 Continuity' },
    { id: 'SURFACE_TOPOGRAPHY', label: '3D Topography' }
  ];

  const filteredMeasurements = measurements.filter((m) => {
    const matchCategory = selectedCategory === 'ALL' || m.measurement_category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      !query ||
      (m.measurement_name || '').toLowerCase().includes(query) ||
      (m.measurement_key || '').toLowerCase().includes(query) ||
      (m.applicable_standard || '').toLowerCase().includes(query) ||
      (m.measured_value || '').toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'MEASURED' || s === 'ASSESSED' || s === 'PASS') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-pass border border-status-passBorder text-status-passText">
          {status}
        </span>
      );
    }
    if (s === 'REVIEW' || s === 'INSUFFICIENT EVIDENCE' || s === 'INSUFFICIENT_EVIDENCE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-review border border-status-reviewBorder text-status-reviewText">
          {status}
        </span>
      );
    }
    if (s === 'NOT MEASURED' || s === 'NOT TESTED' || s === 'NOT_MEASURED' || s === 'NOT_TESTED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EFECE5] dark:bg-white/5 border border-[#D0CBC0] dark:border-white/15 text-[#55585E] dark:text-greige">
          {status}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-fail border border-status-failBorder text-status-failText">
        {status}
      </span>
    );
  };

  return (
    <div className="bg-surface-panel rounded border border-white/10 shadow-panel space-y-4 p-5 font-sans">
      
      {/* Header and Section Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2DFD7] dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#2D4C36] dark:text-matteSage" />
            <h3 className="text-sm font-mono font-bold text-[#18191C] dark:text-fullWhite uppercase tracking-wide">
              ISO-Aligned Structured Evaluation Results
            </h3>
          </div>
          <p className="text-xs text-[#52565C] dark:text-greige font-medium mt-0.5 font-sans">
            Traceable coating degradation assessments, geometric defect measurements, and standards evaluation matrix.
          </p>
        </div>

        {/* View Mode Tab Buttons */}
        <div className="flex items-center gap-1 p-0.5 rounded border border-[#D4D0C5] dark:border-white/10 bg-[#ECE9E2] dark:bg-surface-dark text-xs font-mono shrink-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('standards')}
            className={`px-3 py-1.5 rounded nav-transition cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'standards'
                ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/50'
                : 'text-[#474B51] hover:text-[#18191C] dark:text-greige dark:hover:text-fullWhite'
            }`}
          >
            Standards Assessment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quantitative')}
            className={`px-3 py-1.5 rounded nav-transition cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'quantitative'
                ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/50'
                : 'text-[#474B51] hover:text-[#18191C] dark:text-greige dark:hover:text-fullWhite'
            }`}
          >
            Quantitative Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('measurements')}
            className={`px-3 py-1.5 rounded nav-transition cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'measurements'
                ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/50'
                : 'text-[#474B51] hover:text-[#18191C] dark:text-greige dark:hover:text-fullWhite'
            }`}
          >
            Structured Measurements ({measurements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1.5 rounded nav-transition cursor-pointer text-xs whitespace-nowrap ${
              activeTab === 'recommendations'
                ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/50'
                : 'text-[#474B51] hover:text-[#18191C] dark:text-greige dark:hover:text-fullWhite'
            }`}
          >
            Recommendations & Scope
          </button>
        </div>
      </div>

      {/* Tab 1: Standards-Based Assessment Matrix */}
      {activeTab === 'standards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standardsList.map((std, idx) => {
              const status = std.acceptance_status || 'ASSESSED';
              return (
                <div
                  key={idx}
                  className="p-4 rounded border border-[#D4D0C5] dark:border-white/10 bg-[#F7F6F2] dark:bg-surface-dark/70 space-y-2.5 shadow-panel"
                >
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-[#E2DFD7] dark:border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#18191C] dark:text-fullWhite">
                          {std.standard_identifier}
                        </span>
                        <span className="text-[10px] font-mono text-[#52565C] dark:text-greige">
                          {std.edition}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#2D4C36] dark:text-matteSage block mt-0.5">
                        Criterion: {std.assessment_criterion}
                      </span>
                    </div>
                    <div>{getStatusBadge(status)}</div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#52565C] dark:text-greige block font-semibold">
                        OBSERVED EVIDENCE
                      </span>
                      <p className="text-[#18191C] dark:text-fullWhite font-medium text-[11px] font-sans leading-relaxed">
                        {std.observed_evidence}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="p-2 rounded bg-white dark:bg-surface-panel/60 border border-[#D8D4CA] dark:border-white/5">
                        <span className="text-[10px] uppercase text-[#52565C] dark:text-greige block font-semibold">
                          ASSIGNED RATING
                        </span>
                        <span className="text-[#18191C] dark:text-fullWhite font-bold text-xs truncate block">
                          {std.assigned_rating}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-surface-panel/60 border border-[#D8D4CA] dark:border-white/5">
                        <span className="text-[10px] uppercase text-[#52565C] dark:text-greige block font-semibold">
                          RULE TRACEABILITY
                        </span>
                        <span className="text-[#2D4C36] dark:text-matteSage font-semibold text-xs truncate block">
                          {std.rule_traceability}
                        </span>
                      </div>
                    </div>

                    {std.limitations && (
                      <div className="pt-1.5 text-[10px] text-[#52565C] dark:text-greige font-mono flex items-start gap-1.5 border-t border-[#E2DFD7] dark:border-white/5">
                        <Info className="w-3.5 h-3.5 text-[#2D4C36] dark:text-matteSage shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{std.limitations}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Physical Verification Scope Reminder */}
          <div className="p-3.5 rounded bg-[#F2EFE8] dark:bg-surface-dark border border-[#CDC8BC] dark:border-white/10 shadow-panel text-xs font-mono flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#2D4C36] dark:text-matteSage shrink-0 mt-0.5" />
            <div>
              <span className="text-[#18191C] dark:text-fullWhite font-bold block mb-0.5">
                Physical Verification Scope Notice (ISO 8501-1 / SSPC-PA 2 / NACE SP0188)
              </span>
              <p className="text-[11px] font-sans leading-relaxed text-[#22252A] dark:text-greige font-medium">
                Optical computer vision detects surface anomalies, area ratios, and visible rust grades. It does not replace physical non-destructive dry film thickness gauges (SSPC-PA 2 / ISO 19840) or dielectric holiday spark testers (NACE SP0188). Pre-coating blast cleanliness (ISO 8501-1 Sa 2½) cannot be determined retrospectively on an applied paint film without pre-coating QA logs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quantitative Defect Assessment */}
      {activeTab === 'quantitative' && (
        <div className="space-y-4">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded bg-[#F7F6F2] dark:bg-surface-dark border border-[#D4D0C5] dark:border-white/10 font-mono space-y-1 shadow-panel">
              <span className="text-[10px] uppercase text-[#52565C] dark:text-greige font-bold block">TOTAL DEFECTS</span>
              <span className="text-lg font-bold text-[#18191C] dark:text-fullWhite">{quant.total_defect_count ?? 0}</span>
              <span className="text-[10px] text-[#2D4C36] dark:text-matteSage block font-medium">discrete instances</span>
            </div>

            <div className="p-3.5 rounded bg-[#F7F6F2] dark:bg-surface-dark border border-[#D4D0C5] dark:border-white/10 font-mono space-y-1 shadow-panel">
              <span className="text-[10px] uppercase text-[#52565C] dark:text-greige font-bold block">CUMULATIVE AREA</span>
              <span className="text-lg font-bold text-[#18191C] dark:text-fullWhite">
                {quant.total_defect_pixels != null ? `${quant.total_defect_pixels.toLocaleString()} px²` : '0 px²'}
              </span>
              <span className="text-[10px] text-[#2D4C36] dark:text-matteSage block font-medium">
                {quant.cumulative_defect_area_pct != null ? `${quant.cumulative_defect_area_pct.toFixed(3)}% of scan` : '0%'}
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#F7F6F2] dark:bg-surface-dark border border-[#D4D0C5] dark:border-white/10 font-mono space-y-1 shadow-panel">
              <span className="text-[10px] uppercase text-[#52565C] dark:text-greige font-bold block">LARGEST DEFECT</span>
              <span className="text-lg font-bold text-[#18191C] dark:text-fullWhite">
                {quant.largest_defect_area_px != null ? `${quant.largest_defect_area_px.toLocaleString()} px²` : '0 px²'}
              </span>
              <span className="text-[10px] text-[#2D4C36] dark:text-matteSage block font-medium">
                Subtype: {quant.largest_defect_subtype || 'None'}
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#F7F6F2] dark:bg-surface-dark border border-[#D4D0C5] dark:border-white/10 font-mono space-y-1 shadow-panel">
              <span className="text-[10px] uppercase text-[#52565C] dark:text-greige font-bold block">CONFIDENCE</span>
              <span className="text-lg font-bold text-[#2D4C36] dark:text-matteSage">
                {quant.assessment_confidence_pct != null ? `${quant.assessment_confidence_pct.toFixed(1)}%` : '100%'}
              </span>
              <span className="text-[10px] text-[#52565C] dark:text-greige block font-medium">mean CV inference</span>
            </div>
          </div>

          {/* Spatial Quadrant Distribution & Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            
            {/* Spatial Quadrant Binning */}
            <div className="p-4 rounded bg-[#F7F6F2] dark:bg-surface-dark border border-[#D4D0C5] dark:border-white/10 space-y-3 font-mono shadow-panel">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DFD7] dark:border-white/10">
                <span className="text-xs font-bold text-[#18191C] dark:text-fullWhite uppercase">
                  Spatial Quadrant Distribution
                </span>
                <span className="text-[10px] text-[#52565C] dark:text-greige font-medium">ISO 4628-1 Uniformity</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                {['NW', 'NE', 'SW', 'SE'].map((quad) => {
                  const cnt = quant.spatial_distribution_quadrants?.[quad] ?? 0;
                  const pct = quant.total_defect_count ? Math.round((cnt / quant.total_defect_count) * 100) : 0;
                  return (
                    <div
                      key={quad}
                      className="p-3 rounded border border-[#D8D4CA] dark:border-white/10 bg-white dark:bg-surface-panel/60 space-y-1"
                    >
                      <span className="text-[10px] text-[#52565C] dark:text-greige font-bold block">QUADRANT {quad}</span>
                      <div className="text-sm font-bold text-[#18191C] dark:text-fullWhite">{cnt} anomalies</div>
                      <span className="text-[10px] text-[#2D4C36] dark:text-matteSage font-semibold block">{pct}% of defects</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#474B51] dark:text-greige font-sans pt-1">
                <b className="text-[#18191C] dark:text-fullWhite">Pattern Analysis:</b> {quant.spatial_distribution_summary || 'Uniform distribution'}
              </p>
            </div>

            {/* Subtype Classification Breakdown */}
            <div className="p-4 rounded bg-[#F7F6F2] dark:bg-surface-dark border border-[#D4D0C5] dark:border-white/10 space-y-3 font-mono shadow-panel">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DFD7] dark:border-white/10">
                <span className="text-xs font-bold text-[#18191C] dark:text-fullWhite uppercase">
                  Defect Category Breakdown
                </span>
                <span className="text-[10px] text-[#2D4C36] dark:text-matteSage font-semibold">Classified Indications</span>
              </div>

              <div className="space-y-2 text-xs">
                {quant.category_distribution && Object.keys(quant.category_distribution).length > 0 ? (
                  Object.entries(quant.category_distribution).map(([cat, count]) => {
                    const px = quant.category_pixel_areas?.[cat] ?? 0;
                    const pct = quant.total_image_pixels ? ((px / quant.total_image_pixels) * 100).toFixed(2) : 0;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-surface-panel/60 border border-[#D8D4CA] dark:border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-matteSage" />
                          <span className="font-bold text-[#18191C] dark:text-fullWhite capitalize">{cat}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#18191C] dark:text-fullWhite block">{count} instances</span>
                          <span className="text-[10px] text-[#52565C] dark:text-greige block">{px.toLocaleString()} px² ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[#52565C] dark:text-greige text-xs p-4 text-center font-sans">
                    No defect categories identified on this specimen.
                  </p>
                )}
              </div>
            </div>

          </div>

          <p className="text-[10px] font-mono text-[#52565C] dark:text-greige">
            * All measurements are reported in pixel units (px / px²). Do not report pixel dimensions as physical metric units (mm²) without an in-plane spatial calibration reference.
          </p>
        </div>
      )}

      {/* Tab 3: Structured Measurements Inventory Table */}
      {activeTab === 'measurements' && (
        <div className="space-y-3">
          {/* Controls: Search and Category Filtering */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-greige" />
              <input
                type="text"
                placeholder="Search measurements, standards, keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-white/10 bg-surface-dark text-xs font-mono text-fullWhite placeholder:text-greige focus:outline-hidden focus:border-matteSage"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 font-mono text-xs">
              <Filter className="w-3 h-3 text-greige shrink-0" />
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded text-[11px] cursor-pointer whitespace-nowrap nav-transition ${
                    selectedCategory === c.id
                      ? 'bg-matteSage text-surface-dark font-bold'
                      : 'bg-surface-dark hover:bg-surface-panel border border-white/10 text-greige'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Measurements Table */}
          <div className="overflow-x-auto rounded border border-white/10 bg-surface-dark">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-dark border-b border-white/10 text-[10px] font-mono uppercase text-greige">
                  <th className="py-2.5 px-3 font-semibold">Measurement Name</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">Measured Value</th>
                  <th className="py-2.5 px-3 font-semibold">Unit</th>
                  <th className="py-2.5 px-3 font-semibold">Standard & Edition</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {filteredMeasurements.length > 0 ? (
                  filteredMeasurements.map((m, idx) => {
                    const isExpanded = expandedMeasurementKey === m.measurement_key;
                    return (
                      <React.Fragment key={idx}>
                        <tr
                          onClick={() => setExpandedMeasurementKey(isExpanded ? null : m.measurement_key)}
                          className="hover:bg-white/5 cursor-pointer nav-transition"
                        >
                          <td className="py-2.5 px-3 font-bold text-fullWhite">
                            {m.measurement_name}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-greige">
                            <span className="px-1.5 py-0.5 rounded bg-surface-panel border border-white/5">
                              {m.measurement_category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-matteSage">
                            {m.measured_value ?? 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-greige text-[11px]">
                            {m.unit || 'dimensionless'}
                          </td>
                          <td className="py-2.5 px-3 text-greige text-[11px]">
                            {m.applicable_standard || 'Project Framework'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getStatusBadge(m.assessment_status)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              className="text-greige hover:text-fullWhite text-[10px] font-mono cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-surface-panel/40">
                            <td colSpan={7} className="py-3 px-4 text-xs font-sans text-greige space-y-2 border-b border-white/10">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                                <div>
                                  <span className="text-[10px] uppercase text-greige font-bold block">
                                    CALCULATION METHOD
                                  </span>
                                  <span className="text-fullWhite">{m.measurement_method || 'Automated Computer Vision'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-greige font-bold block">
                                    EVIDENCE SOURCE
                                  </span>
                                  <span className="text-fullWhite">{m.evidence_source || 'Optical scan'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-greige font-bold block">
                                    RATING OR CRITERION
                                  </span>
                                  <span className="text-matteSage">{m.rating_or_criterion || 'Clause specification'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-greige font-bold block">
                                    ENGINE VERSION & TIMESTAMP (IST)
                                  </span>
                                  <span className="text-fullWhite">{m.evaluation_engine_version} • {m.evaluation_timestamp}</span>
                                </div>
                              </div>
                              {m.explanation && (
                                <div className="pt-2 border-t border-white/5 font-sans text-xs text-fullWhite/90">
                                  <span className="font-mono text-[10px] uppercase text-greige font-bold block">
                                    EXPLANATION & REASONING
                                  </span>
                                  <p className="mt-0.5 leading-relaxed">{m.explanation}</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-greige font-sans">
                      No measurements match the active query or category filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Recommendations & Scope Limitations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Automated Recommendations */}
            <div className="p-4 rounded border border-white/10 bg-surface-dark space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Sliders className="w-4 h-4 text-matteSage" />
                <h4 className="text-xs font-mono font-bold text-fullWhite uppercase">
                  Automated Operational Recommendations
                </h4>
              </div>
              <ul className="space-y-2 text-xs font-sans text-fullWhite">
                {recommendations.automated_recommendations && recommendations.automated_recommendations.length > 0 ? (
                  recommendations.automated_recommendations.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-matteSage font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-greige">No automated remediation recommendations generated.</li>
                )}
              </ul>
              <span className="text-[10px] font-mono text-greige block pt-1 border-t border-white/5">
                Algorithmic advisories derived from detected defect morphology and area thresholds.
              </span>
            </div>

            {/* Mandatory Standards Prerequisites */}
            <div className="p-4 rounded border border-white/10 bg-surface-dark space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Shield className="w-4 h-4 text-status-reviewText" />
                <h4 className="text-xs font-mono font-bold text-fullWhite uppercase">
                  Mandatory Standards Clauses
                </h4>
              </div>
              <ul className="space-y-2 text-xs font-sans text-fullWhite">
                {recommendations.mandatory_standards_requirements && recommendations.mandatory_standards_requirements.length > 0 ? (
                  recommendations.mandatory_standards_requirements.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-status-reviewText font-bold">•</span>
                      <span><b>[Mandatory]</b> {m}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-greige">No mandatory prerequisites flagged.</li>
                )}
              </ul>
              <span className="text-[10px] font-mono text-greige block pt-1 border-t border-white/5">
                Contractual and procedural requirements in referenced ISO, SSPC, and NACE standards.
              </span>
            </div>

          </div>

          {/* Scope Limitations */}
          <div className="p-4 rounded border border-[#D4D0C5] dark:border-white/10 bg-[#F7F6F2] dark:bg-surface-dark space-y-2.5 shadow-panel">
            <span className="text-xs font-mono font-bold text-[#18191C] dark:text-fullWhite uppercase block pb-1.5 border-b border-[#E2DFD7] dark:border-white/10">
              Important Engineering Scope & Inspection Limitations
            </span>
            <ul className="space-y-2 text-xs font-sans text-[#22252A] dark:text-greige">
              {limitations.map((lim, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-[#2D4C36] dark:text-matteSage font-bold select-none shrink-0 mt-0.5 leading-none">
                    •
                  </span>
                  <span className="text-[#22252A] dark:text-greige font-medium min-w-0 break-words leading-relaxed">
                    {lim}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
