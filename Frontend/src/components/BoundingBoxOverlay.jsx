import React, { useRef, useState, useEffect } from 'react';

export default function BoundingBoxOverlay({
  imageUrl,
  detections = [],
  hoveredId = null,
  onHover = () => {},
  onClick = () => {}
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const updateScale = () => {
    if (!imgRef.current) return;
    const nw = imgRef.current.naturalWidth || 640;
    const nh = imgRef.current.naturalHeight || 640;
    const dw = imgRef.current.clientWidth || nw;
    const dh = imgRef.current.clientHeight || nh;

    if (nw > 0 && nh > 0) {
      setScale({
        scaleX: dw / nw,
        scaleY: dh / nh
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageLoaded]);

  if (!imageUrl) {
    return (
      <div className="relative w-full h-80 rounded-lg overflow-hidden border border-white/10 bg-surface-darker flex flex-col items-center justify-center gap-2 p-6 text-center select-none shadow-technical">
        <span className="text-xs font-mono text-greige">No Specimen Scan Available</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden border border-white/10 bg-surface-darker select-none shadow-technical"
      style={{ position: 'relative' }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Inspection Image Defect Localization"
        onLoad={() => {
          setImageLoaded(true);
          updateScale();
        }}
        className="w-full h-auto block max-h-[520px] object-contain mx-auto"
      />

      {/* Bounding box overlays */}
      {imageLoaded && detections.map((det) => {
        const rawBox = Array.isArray(det.bbox) ? det.bbox : [0, 0, 0, 0];
        let [x, y, w, h] = rawBox;

        // If coordinates appear to be [ymin, xmin, ymax, xmax]
        if (rawBox.length === 4 && rawBox[2] > rawBox[0] && rawBox[3] > rawBox[1] && rawBox[2] > 200 && rawBox[0] > 10) {
          const left = rawBox[1];
          const top = rawBox[0];
          const width = rawBox[3] - rawBox[1];
          const height = rawBox[2] - rawBox[0];
          x = left;
          y = top;
          w = width;
          h = height;
        }

        const left = x * scale.scaleX;
        const top = y * scale.scaleY;
        const width = w * scale.scaleX;
        const height = h * scale.scaleY;

        const isDefect = (det.class || '').toLowerCase() === 'defect';
        const isHovered = hoveredId === det.id;

        // Controlled technical styling:
        // Defect: industrial oxidized red boundary
        // Particulate / Contaminant: Matte Sage boundary
        const borderColor = isDefect ? 'border-status-failBorder' : 'border-matteSage';
        const bgColor = isDefect ? 'bg-status-fail/25' : 'bg-matteSage/20';
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
              left: `${left}px`,
              top: `${top}px`,
              width: `${Math.max(width, 16)}px`,
              height: `${Math.max(height, 16)}px`,
              pointerEvents: 'auto',
            }}
            className={`border-2 ${borderColor} ${bgColor} ${
              isHovered ? 'ring-2 ring-matteSage z-30 scale-101' : 'z-10'
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
  );
}
