import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Exact Dhatu Rakshana Logo Typography matching user's image */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            <span className="text-[#374151] font-bold">Dhatu</span>{' '}
            <span className="text-[#9c8273] font-bold">Rakshana</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#9c8273] mb-2"></span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link
            to="/"
            className={`transition-colors hover:text-slate-950 ${
              location.pathname === '/' ? 'text-slate-950 font-semibold' : ''
            }`}
          >
            Inspections
          </Link>
          <Link
            to="/history"
            className={`transition-colors hover:text-slate-950 ${
              location.pathname === '/history' ? 'text-slate-950 font-semibold' : ''
            }`}
          >
            History & Logs
          </Link>
          <a
            href="#standards"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('open-standards-modal'));
            }}
            className="transition-colors hover:text-slate-950 flex items-center gap-1 cursor-pointer"
          >
            Standards Matrix
          </a>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full">
            AMPP / ISO 4628 / SSPC
          </span>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium shadow-sm transition-all active:scale-[0.98]"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-standards-modal'))}
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            Standards Spec
          </button>
        </div>

      </div>
    </header>
  );
}
