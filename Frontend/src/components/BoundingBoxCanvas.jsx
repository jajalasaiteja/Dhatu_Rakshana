import React, { useRef, useEffect, useState } from 'react';

export default function BoundingBoxCanvas({
  imageUrl,
  detections = [],
  selectedId,
  onSelectDetection,
  showLabels = true
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!imageLoaded || !imgRef.current || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    const img = imgRef.current;

    const containerWidth = container.clientWidth;
    const scale = containerWidth / img.naturalWidth;
    const targetWidth = containerWidth;
    const targetHeight = img.naturalHeight * scale;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    detections.forEach((det) => {
      const [xmin, ymin, xmax, ymax] = det.bbox || [0, 0, 0, 0];
      const isSelected = selectedId === det.id;

      const sx = xmin * scale;
      const sy = ymin * scale;
      const sw = (xmax - xmin) * scale;
      const sh = (ymax - ymin) * scale;

      const grade = det.graded_records && det.graded_records[0];
      const verdict = (grade?.pass_fail || 'REVIEW').toUpperCase();

      let strokeColor = '#A16207'; // amber
      let fillColor = 'rgba(161, 98, 7, 0.18)';
      if (verdict === 'PASS') {
        strokeColor = '#3D8278'; // technical teal
        fillColor = 'rgba(42, 92, 85, 0.20)';
      } else if (verdict === 'FAIL') {
        strokeColor = '#DC2626'; // defense rust red
        fillColor = 'rgba(185, 28, 28, 0.22)';
      }

      ctx.fillStyle = isSelected ? 'rgba(100, 79, 72, 0.35)' : fillColor;
      ctx.fillRect(sx, sy, sw, sh);

      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected ? '#F3F4F6' : strokeColor;
      ctx.strokeRect(sx, sy, sw, sh);

      if (showLabels) {
        const labelText = `${(det.subtype || det.class || 'ANOMALY').toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        const textWidth = ctx.measureText(labelText).width;
        const badgeHeight = 16;
        const badgeWidth = textWidth + 10;

        ctx.fillStyle = isSelected ? '#644F48' : strokeColor;
        ctx.fillRect(sx, Math.max(0, sy - badgeHeight), badgeWidth, badgeHeight);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, sx + 5, Math.max(12, sy - 4));
      }
    });

  }, [imageLoaded, detections, selectedId, showLabels]);

  return (
    <div ref={containerRef} className="w-full relative rounded-lg overflow-hidden border border-trout bg-blackDiamond shadow-technical">
      {!imageLoaded && (
        <div className="h-96 flex flex-col items-center justify-center text-murky gap-2.5 bg-darkGraphite">
          <div className="w-7 h-7 border-2 border-antiqueBrown border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-murky-muted">Loading inspection image...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onClick={(e) => {
          if (!imgRef.current || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          const scale = canvasRef.current.width / imgRef.current.naturalWidth;

          const hit = detections.find((d) => {
            const [x1, y1, x2, y2] = d.bbox || [0, 0, 0, 0];
            return (
              clickX >= x1 * scale &&
              clickX <= x2 * scale &&
              clickY >= y1 * scale &&
              clickY <= y2 * scale
            );
          });
          if (hit && onSelectDetection) {
            onSelectDetection(hit.id);
          }
        }}
        className="block w-full cursor-crosshair"
      />
    </div>
  );
}
