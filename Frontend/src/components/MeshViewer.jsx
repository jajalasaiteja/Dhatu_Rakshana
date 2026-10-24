import React from 'react';
import { Box, Download, CheckCircle2 } from 'lucide-react';
import apiClient, { resolveMediaUrl } from '../api/client';

export default function MeshViewer({ meshPath }) {
  if (!meshPath) {
    return (
      <div className="p-3.5 rounded border border-white/10 bg-surface-dark text-greige flex items-center gap-2.5 shadow-panel font-mono text-xs h-full min-h-[140px]">
        <Box className="w-4 h-4 text-greige/70 shrink-0" />
        <span className="text-[11px] text-greige">
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
    <div className="p-3.5 rounded border border-white/10 bg-surface-dark shadow-panel text-content-primary flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-matteSage shrink-0" />
            <span className="font-bold text-fullWhite uppercase tracking-wide font-mono text-xs">
              Surface Topography Mesh
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-pass border border-status-passBorder text-status-passText">
            <CheckCircle2 className="w-3 h-3 text-status-passText" />
            AVAILABLE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 my-2.5 text-[11px] font-mono">
          <div className="p-2 rounded bg-surface-panel border border-white/10">
            <span className="text-greige block text-[10px] font-bold uppercase tracking-wider mb-0.5">Method</span>
            <span className="text-fullWhite truncate block">Poisson Recon</span>
          </div>
          <div className="p-2 rounded bg-surface-panel border border-white/10">
            <span className="text-greige block text-[10px] font-bold uppercase tracking-wider mb-0.5">Filename</span>
            <span className="text-fullWhite truncate block" title={meshPath.split('/').slice(-1)[0]}>
              {meshPath.split('/').slice(-1)[0]}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-grayGreen hover:bg-grayGreen-light border border-grayGreen text-xs font-mono font-bold text-fullWhite nav-transition shadow-technical cursor-pointer mt-1"
      >
        <Download className="w-3.5 h-3.5 text-fullWhite" />
        <span>Download Surface Mesh (.PLY)</span>
      </button>
    </div>
  );
}
