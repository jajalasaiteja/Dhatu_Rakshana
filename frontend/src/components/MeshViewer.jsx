import React from 'react';
import { Box, Download, Layers, CheckCircle2 } from 'lucide-react';
import { getMediaUrl } from '../api';

export default function MeshViewer({ meshPath }) {
  if (!meshPath) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center gap-3 shadow-xs">
        <Box className="w-5 h-5 text-slate-400" />
        <span className="text-sm">3D Surface micro-mesh not available for this record.</span>
      </div>
    );
  }

  const fullMeshUrl = getMediaUrl(meshPath);

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Box className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Open3D Micro-Topography</h4>
            <p className="text-xs text-slate-500">Poisson surface mesh with estimated surface normals</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          .PLY READY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 my-3.5 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-slate-400 block mb-0.5">Algorithm</span>
          <span className="text-slate-800 font-semibold">Poisson Surface Recon</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-slate-400 block mb-0.5">Mesh Key</span>
          <span className="text-indigo-600 truncate block">{meshPath.split('/').slice(-1)[0]}</span>
        </div>
      </div>

      <a
        href={fullMeshUrl}
        download="marine_coating_mesh.ply"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-medium text-white transition-all shadow-xs"
      >
        <Download className="w-3.5 h-3.5" />
        Download 3D Surface Mesh (.PLY)
      </a>
    </div>
  );
}
