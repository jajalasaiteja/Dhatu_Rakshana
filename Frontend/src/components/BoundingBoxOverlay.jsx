import React, { useRef, useState } from 'react';

export default function BoundingBoxOverlay({
  imageUrl,
  detections = [],
  hoveredId = null,
  onHover = () => {},
  onClick = () => {}
}) {
  const imgRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!imageUrl) {
    return (
      <div className="relative w-full h-80 rounded-lg overflow-hidden border border-white/10 bg-surface-darker flex flex-col items-center justify-center gap-2 p-6 text-center select-none shadow-technical">
        <span className="text-xs font-mono text-greige">No Specimen Scan Available</span>
      </div>
    );
  }

  const nw = naturalSize.width || (imgRef.current ? imgRef.current.naturalWidth : 0) || 5472;
  const nh = naturalSize.height || (imgRef.current ? imgRef.current.naturalHeight : 0) || 3648;

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-white/10 bg-surface-darker select-none shadow-technical flex items-center justify-center">
      {/* Tight wrapper matching the rendered image's exact dimensions */}
      <div className="relative inline-block max-w-full">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Inspection Image Defect Localization"
          onLoad={(e) => {
            const img = e.currentTarget;
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            setImageLoaded(true);
          }}
          className="w-auto h-auto block max-h-[560px] max-w-full object-contain mx-auto"
        />

        {/* Bounding box overlays */}
        {imageLoaded && detections.map((det) => {
          const rawBox = Array.isArray(det.bbox) ? det.bbox : [0, 0, 0, 0];
          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

          if (rawBox.length === 4) {
            // Standard YOLO format: [x_min, y_min, x_max, y_max]
            if (rawBox[2] > rawBox[0] && rawBox[3] > rawBox[1]) {
              x1 = rawBox[0];
              y1 = rawBox[1];
              x2 = rawBox[2];
              y2 = rawBox[3];
            } else {
              // [x, y, width, height] format fallback
              x1 = rawBox[0];
              y1 = rawBox[1];
              x2 = rawBox[0] + rawBox[2];
              y2 = rawBox[1] + rawBox[3];
            }
          }

          // Percentage-based placement relative to native image dimensions
          const leftPct = (x1 / nw) * 100;
          const topPct = (y1 / nh) * 100;
          const widthPct = Math.max(((x2 - x1) / nw) * 100, 1.2);
          const heightPct = Math.max(((y2 - y1) / nh) * 100, 1.2);

          const isDefect = (det.class || '').toLowerCase() === 'defect';
          const isHovered = hoveredId === det.id;

          const borderColor = isDefect ? 'border-status-failBorder' : 'border-matteSage';
          const bgColor = isDefect ? 'bg-status-fail/30' : 'bg-matteSage/25';
          const labelBg = isDefect
            ? 'bg-status-fail text-status-failText border-status-failBorder'
            : 'bg-surface-panel text-matteSage border-white/15';

          const confPct = Math.round((det.confidence || 0) * 100);
          const labelText = `${det.subtype || det.class} • ${confPct}%`;

          return (
            <div
              key={det.id}
              onMouseEnter={() => onHover(det.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onClick(det.id)}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                minWidth: '18px',
                minHeight: '18px',
                pointerEvents: 'auto',
              }}
              className={`border-2 ${borderColor} ${bgColor} ${
                isHovered ? 'ring-2 ring-matteSage z-30 scale-105' : 'z-10'
              } transition-all cursor-pointer rounded-xs`}
            >
              <span
                className={`absolute -top-5 left-0 px-1 py-0.2 rounded-xs border text-[9px] font-mono font-bold whitespace-nowrap shadow-xs pointer-events-none ${labelBg}`}
              >
                {labelText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
