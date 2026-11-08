import { useRef, useState, useEffect } from 'react';

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset dimensions and load state when specimen image changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoaded(false);
    setHasError(false);
    setNaturalSize({ width: 0, height: 0 });

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      const currentSrc = imgRef.current.currentSrc || imgRef.current.src || '';
      if (currentSrc.includes(imageUrl) || imageUrl.includes(currentSrc)) {
        setNaturalSize({
          width: imgRef.current.naturalWidth,
          height: imgRef.current.naturalHeight,
        });
        setImageLoaded(true);
      }
    }
  }, [imageUrl]);

  if (!imageUrl || hasError) {
    return (
      <div className="relative w-full h-80 rounded-lg overflow-hidden border border-white/10 bg-surface-darker flex flex-col items-center justify-center gap-2 p-6 text-center select-none shadow-technical">
        <span className="text-xs font-mono text-greige font-bold">
          {hasError ? 'Specimen Image File Unavailable in Storage' : 'No Specimen Scan Available'}
        </span>
        <span className="text-[11px] font-mono text-greige/70">
          {hasError ? 'The image asset could not be loaded from the storage bucket.' : 'Select an inspection record with a captured specimen scan.'}
        </span>
      </div>
    );
  }

  const nw = naturalSize.width;
  const nh = naturalSize.height;

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
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
              setImageLoaded(true);
              setHasError(false);
            }
          }}
          onError={() => {
            setImageLoaded(false);
            setHasError(true);
          }}
          className="w-auto h-auto block max-h-[560px] max-w-full object-contain mx-auto"
        />

        {/* Bounding box overlays */}
        {imageLoaded && naturalSize.width > 0 && naturalSize.height > 0 && detections.map((det) => {
          const rawBox = Array.isArray(det.bbox) ? det.bbox : [0, 0, 0, 0];
          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

          if (rawBox.length === 4) {
            // Standard YOLO format: [x_min, y_min, x_max, y_max]
            if (rawBox[2] >= rawBox[0] && rawBox[3] >= rawBox[1]) {
              x1 = rawBox[0];
              y1 = rawBox[1];
              x2 = rawBox[2];
              y2 = rawBox[3];
            } else {
              // [x, y, width, height] format fallback
              x1 = rawBox[0];
              y1 = rawBox[1];
              x2 = rawBox[0] + Math.max(0, rawBox[2]);
              y2 = rawBox[1] + Math.max(0, rawBox[3]);
            }
          }

          if (x1 === 0 && y1 === 0 && x2 === 0 && y2 === 0) {
            return null;
          }

          // Percentage-based placement relative to native image dimensions (supports both normalized and pixel coords)
          const isNormalized = (x1 <= 1.0 && y1 <= 1.0 && x2 <= 1.0 && y2 <= 1.0 && (x2 > 0 || y2 > 0));
          const leftPct = isNormalized ? x1 * 100 : (x1 / nw) * 100;
          const topPct = isNormalized ? y1 * 100 : (y1 / nh) * 100;
          const widthPct = Math.max(isNormalized ? (x2 - x1) * 100 : ((x2 - x1) / nw) * 100, 1.2);
          const heightPct = Math.max(isNormalized ? (y2 - y1) * 100 : ((y2 - y1) / nh) * 100, 1.2);

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
