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

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-[#e2e8f0] bg-black select-none"
      style={{ position: 'relative' }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Coating Specimen Defect Localization"
        onLoad={() => {
          setImageLoaded(true);
          updateScale();
        }}
        className="w-full h-auto block max-h-[500px] object-contain mx-auto"
      />

      {/* Bounding box overlays */}
      {imageLoaded && detections.map((det) => {
        const bbox = Array.isArray(det.bbox) ? det.bbox : [0, 0, 0, 0];
        const [origX, origY, origW, origH] = bbox;

        const left = origX * scale.scaleX;
        const top = origY * scale.scaleY;
        const width = origW * scale.scaleX;
        const height = origH * scale.scaleY;

        const isDefect = (det.class || '').toLowerCase() === 'defect';
        const isHovered = hoveredId === det.id;

        // Domain rule: defect = red, particle = blue
        const borderColor = isDefect ? 'border-red-500' : 'border-blue-500';
        const bgColor = isDefect ? 'bg-red-500/10' : 'bg-blue-500/10';
        const labelBg = isDefect ? 'bg-red-600 text-white' : 'bg-blue-600 text-white';

        const confPct = Math.round((det.confidence || 0) * 100);
        const labelText = `${det.subtype || det.class} ${confPct}%`;

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
              width: `${width}px`,
              height: `${height}px`,
              boxSizing: 'border-box'
            }}
            className={`cursor-pointer transition-all border-2 ${borderColor} ${bgColor} ${
              isHovered ? 'ring-2 ring-amber-400 bg-amber-400/20 z-20' : 'z-10'
            }`}
          >
            <span
              className={`absolute -top-5 left-0 px-1.5 py-0.2 text-[10px] font-mono font-bold whitespace-nowrap rounded-xs ${labelBg}`}
            >
              {labelText}
            </span>
          </div>
        );
      })}
    </div>
  );
}
