import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { ShieldCheck, Cpu } from 'lucide-react';

export default function AppLayout() {
  const location = useLocation();

  const getPageContext = () => {
    if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/upload')) {
      return {
        title: 'New Inspection Analysis',
        subtitle: 'Submit inspection imagery for surface defect identification and 3D topography',
        badge: 'ACTIVE SESSION',
      };
    }
    if (location.pathname.startsWith('/inspections/')) {
      return {
        title: 'Inspection Analysis & Findings',
        subtitle: 'Review observed surface condition, defect classification, and 3D topography',
        badge: 'INSPECTION RECORD',
      };
    }
    if (location.pathname.startsWith('/inspections')) {
      return {
        title: 'Analysis History',
        subtitle: 'Review previously completed inspection analyses and recorded findings',
        badge: 'RECORD ARCHIVE',
      };
    }
    return {
      title: 'Marine Coating Inspection Platform',
      subtitle: 'Technical inspection platform for coating integrity and defect analysis',
      badge: 'INSPECTION WORKSTATION',
    };
  };

  const context = getPageContext();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-content-primary font-sans selection:bg-grayGreen/50 selection:text-white">
      {/* Primary Technical Navigation */}
      <Navbar />

      {/* Operational Context Sub-Header */}
      <div className="bg-surface-panel border-b border-white/10 py-2.5 shadow-panel">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded border border-matteSage/50 bg-surface-dark text-matteSage font-mono text-[10px] font-bold tracking-wider uppercase">
              {context.badge}
            </span>
            <h2 className="text-xs font-semibold text-fullWhite uppercase tracking-wide font-mono">
              {context.title}
            </h2>
            <span className="hidden md:inline-block text-white/20">•</span>
            <p className="hidden md:block text-xs text-greige font-medium">
              {context.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-matteSage">
              <ShieldCheck className="w-3.5 h-3.5 text-matteSage" />
              <span>AMPP • ISO 4628 • SSPC-PA 2</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-grayGreen-light">
              <Cpu className="w-3.5 h-3.5 text-grayGreen-light" />
              <span>SURFACE TOPOGRAPHY & MORPHOLOGY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytical Workstation Area with Route Page Transition */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {/* Operational Footer */}
      <footer className="bg-surface-panel border-t border-white/10 py-4 mt-12 text-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-fullWhite">DHATU RAKSHANA</span>
            <span className="text-greige">
              — Marine Coating Inspection & Surface Integrity Analysis Platform
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-greige font-mono text-[10px]">
            <span>SSPC-PA 2</span>
            <span>•</span>
            <span>NACE SP0188</span>
            <span>•</span>
            <span>ISO 4628 / 8501-1</span>
            <span>•</span>
            <span>SSPC-VIS 2</span>
            <span>•</span>
            <span className="text-matteSage font-semibold">STANDARDS VERIFIED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
