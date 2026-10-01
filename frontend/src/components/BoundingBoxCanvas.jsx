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

    // Responsive scaling
    const containerWidth = container.clientWidth;
    const scale = containerWidth / img.naturalWidth;
    const targetWidth = containerWidth;
    const targetHeight = img.naturalHeight * scale;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw background image
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Draw defect bounding boxes
    detections.forEach((det) => {
      const [xmin, ymin, xmax, ymax] = det.bbox || [0, 0, 0, 0];
      const isSelected = selectedId === det.id;

      const sx = xmin * scale;
      const sy = ymin * scale;
      const sw = (xmax - xmin) * scale;
      const sh = (ymax - ymin) * scale;

      // Color scheme based on defect subtype or verdict
      const grade = det.graded_records && det.graded_records[0];
      const verdict = (grade?.pass_fail || 'REVIEW').toUpperCase();

      let strokeColor = '#f59e0b'; // amber
      let fillColor = 'rgba(245, 158, 11, 0.18)';
      if (verdict === 'PASS') {
        strokeColor = '#10b981'; // green
        fillColor = 'rgba(16, 185, 129, 0.18)';
      } else if (verdict === 'FAIL') {
        strokeColor = '#ef4444'; // red
        fillColor = 'rgba(239, 68, 68, 0.22)';
      }

      // Draw box fill and stroke
      ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.35)' : fillColor;
      ctx.fillRect(sx, sy, sw, sh);

      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.strokeStyle = isSelected ? '#06b6d4' : strokeColor;
      ctx.strokeRect(sx, sy, sw, sh);

      // Draw tag badge
      if (showLabels) {
        const labelText = `${det.subtype?.toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        const textWidth = ctx.measureText(labelText).width;
        const badgeHeight = 18;
        const badgeWidth = textWidth + 12;

        ctx.fillStyle = isSelected ? '#0891b2' : strokeColor;
        ctx.fillRect(sx, Math.max(0, sy - badgeHeight), badgeWidth, badgeHeight);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, sx + 6, Math.max(13, sy - 5));
      }
    });

  }, [imageLoaded, detections, selectedId, showLabels]);

  return (
    <div ref={containerRef} className="w-full relative rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-950 shadow-md">
      {!imageLoaded && (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-slate-500">Loading marine coating specimen...</span>
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

          // Check if click inside any box
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
