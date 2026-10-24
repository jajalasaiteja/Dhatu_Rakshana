import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * Compact, independently scrollable Defect Identification and Classification table.
 * 
 * Features:
 * - Dynamic S.No. sequential numbering starting at "01" (Section 8)
 * - Columns: S.No. | Defect Type | Standard Reference | Severity | Verdict
 * - Flexible height (flex-1 min-h-0) filling available panel height on desktop
 * - Mobile-constrained height (max-h-[340px] on small screens, lg:max-h-none flex-1 on desktop)
 * - Sticky table header that stays visible during scrolling
 * - Compact row heights and cell padding with single-line or compact standard references
 * - Preserves all underlying anomaly records, defect types, confidence scores, standards, severity, and verdicts
 * - Interactive row hover / selection synchronized with BoundingBoxOverlay
 * - Full responsiveness and light/dark mode theme support
 */
export default function DefectClassificationTable({
  detections = [],
  getGradeForDetection,
  gradedRecords = [],
  hoveredDetId = null,
  onHoverDetection,
  onSelectDetection,
  className = '',
  maxHeight
}) {
  const getGrade = (detId) => {
    if (typeof getGradeForDetection === 'function') {
      return getGradeForDetection(detId);
    }
    if (Array.isArray(gradedRecords)) {
      return gradedRecords.find((g) => g.detection_id === detId || g.id === detId);
    }
    return null;
  };

  if (!detections || detections.length === 0) {
    return (
      <div
        className={`p-6 text-center bg-surface-dark rounded border border-white/10 space-y-2 flex flex-col items-center justify-center flex-1 min-h-0 ${className}`}
      >
        <CheckCircle2 className="w-6 h-6 text-matteSage mx-auto stroke-[2.2]" />
        <p className="text-xs font-mono font-semibold text-fullWhite">No Surface Defects Detected</p>
        <p className="text-[11px] text-greige font-sans max-w-sm">
          Coating surface meets nominal condition criteria with no localized anomalies exceeding tolerance thresholds.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded border border-white/10 bg-surface-panel overflow-hidden shadow-panel flex flex-col flex-1 min-h-0 ${className}`}
      role="region"
      aria-label="Defect identification and classification records"
    >
      <div
        tabIndex={0}
        className="overflow-y-auto overflow-x-auto focus:outline-hidden flex-1 min-h-0 max-h-[340px] lg:max-h-none"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-dark select-none shadow-xs">
            <tr className="bg-surface-dark text-greige font-mono uppercase tracking-wider text-[10px] border-b border-white/10">
              <th
                scope="col"
                className="py-2 px-2.5 text-center font-semibold sticky top-0 bg-surface-dark border-b border-white/10 w-12 shrink-0"
              >
                S.No.
              </th>
              <th
                scope="col"
                className="py-2 px-2.5 font-semibold sticky top-0 bg-surface-dark border-b border-white/10"
              >
                Defect Type
              </th>
              <th
                scope="col"
                className="py-2 px-2.5 font-semibold sticky top-0 bg-surface-dark border-b border-white/10"
              >
                Standard Reference
              </th>
              <th
                scope="col"
                className="py-2 px-2 font-semibold sticky top-0 bg-surface-dark border-b border-white/10 text-center"
              >
                Severity
              </th>
              <th
                scope="col"
                className="py-2 px-2.5 font-semibold text-right sticky top-0 bg-surface-dark border-b border-white/10"
              >
                Verdict
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs bg-surface-panel">
            {detections.map((det, index) => {
              const serialNo = String(index + 1).padStart(2, '0');
              const grade = getGrade(det.id);
              const isHovered = hoveredDetId === det.id;
              const confPct = Math.round((det.confidence || 0) * 100);
              const defectType = det.defect_type || det.subtype || det.class || 'Coating Defect';
              const standardRef =
                grade?.standard_reference || grade?.standard_name || 'ISO 8501-1 / SSPC';
              const severity = grade?.severity || det.severity || 'medium';
              const verdict = grade?.pass_fail || grade?.compliance_status || 'review';

              return (
                <tr
                  key={det.id ?? index}
                  onMouseEnter={() => onHoverDetection && onHoverDetection(det.id)}
                  onMouseLeave={() => onHoverDetection && onHoverDetection(null)}
                  onClick={() => onSelectDetection && onSelectDetection(det.id)}
                  className={`nav-transition cursor-pointer ${
                    isHovered ? 'bg-surface-elevated' : 'hover:bg-surface-dark/50'
                  }`}
                >
                  <td className="py-2 px-2.5 text-center text-greige font-mono text-[11px] font-medium shrink-0">
                    {serialNo}
                  </td>
                  <td className="py-2 px-2.5 font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-fullWhite capitalize text-xs">
                        {defectType}
                      </span>
                      {det.confidence !== undefined && det.confidence !== null && (
                        <span className="text-[10px] text-greige whitespace-nowrap">
                          · {confPct}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 text-greige text-[11px] font-mono" title={standardRef}>
                    <span className="truncate block max-w-[140px] sm:max-w-[180px]">
                      {standardRef}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    <StatusBadge status={severity} size="sm" />
                  </td>
                  <td className="py-2 px-2.5 text-right whitespace-nowrap">
                    <StatusBadge status={verdict} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
