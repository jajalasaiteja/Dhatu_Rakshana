import React from 'react';
import { Box, Download, CheckCircle2 } from 'lucide-react';
import apiClient, { resolveMediaUrl } from '../api/client';

export default function MeshViewer({ meshPath }) {
  if (!meshPath) {
    return (
      <div className="p-3.5 rounded border border-white/10 bg-surface-panel text-greige flex items-center gap-2.5 shadow-panel">
        <Box className="w-4 h-4 text-greige/70" />
        <span className="text-xs font-mono text-greige">
          Three-dimensional surface mesh not available for this analysis.
        </span>
      </div>
    );
  }

  const fullMeshUrl = resolveMediaUrl(meshPath);

  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      const endpoint = meshPath.startsWith('/') ? meshPath : `/${meshPath}`;
      const blob = await apiClient(endpoint, {
        method: 'GET',
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'coating_surface_mesh.ply';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(fullMeshUrl, '_blank');
    }
  };

  return (
    <div className="p-4 rounded border border-white/10 bg-surface-panel shadow-panel text-content-primary">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage">
            <Box className="w-4 h-4 text-matteSage" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold tracking-wider text-matteSage">
              Surface Topography Mesh
            </div>
            <p className="text-xs font-medium text-fullWhite font-sans">
              Reconstructed 3D surface mesh (.PLY format)
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-pass border border-status-passBorder text-status-passText">
          <CheckCircle2 className="w-3 h-3 text-status-passText" />
          AVAILABLE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 my-3 text-xs font-mono">
        <div className="p-2 rounded bg-surface-dark border border-white/10">
          <span className="text-greige block text-[10px] font-bold uppercase tracking-wider mb-0.5">Method</span>
          <span className="text-fullWhite">Poisson Reconstruction</span>
        </div>
        <div className="p-2 rounded bg-surface-dark border border-white/10">
          <span className="text-greige block text-[10px] font-bold uppercase tracking-wider mb-0.5">Filename</span>
          <span className="text-fullWhite truncate block">{meshPath.split('/').slice(-1)[0]}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-grayGreen hover:bg-grayGreen-light border border-grayGreen text-xs font-mono font-bold text-fullWhite nav-transition shadow-technical cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-fullWhite" />
        <span>Download Surface Mesh (.PLY)</span>
      </button>
    </div>
  );
}
