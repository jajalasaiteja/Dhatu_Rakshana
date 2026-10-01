import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafd] text-slate-900 font-sans selection:bg-[#9c8273]/20">
      
      {/* Public Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2 focus:outline-hidden focus:ring-2 focus:ring-slate-400 rounded-lg p-1 transition-all duration-300"
            title="Dhatu Rakshana"
          >
            <span className="text-xl tracking-tight font-serif transition-colors duration-300">
              <span className="text-[#374151] font-bold group-hover:text-slate-950">Dhatu</span>{' '}
              <span className="text-[#9c8273] font-bold group-hover:text-[#83695b]">Rakshana</span>
            </span>
            <span className="relative flex h-2 w-2 mb-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9c8273] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9c8273] group-hover:scale-125 transition-transform duration-300"></span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 font-medium">
            <a href="#overview" className="hover:text-slate-900 transition-colors hover:-translate-y-0.25 duration-150">Platform Overview</a>
            <a href="#standards" className="hover:text-slate-900 transition-colors hover:-translate-y-0.25 duration-150">Standards Matrix</a>
            <a href="#specifications" className="hover:text-slate-900 transition-colors hover:-translate-y-0.25 duration-150">Specifications</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="group px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
              >
                <span>Go to Dashboard ({user?.full_name?.split(' ')[0] || 'Inspector'})</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-4 py-2 rounded-full border border-slate-300 hover:border-slate-400 hover:bg-white text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                >
                  Register Account
                </Link>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Main Hero Container matching Screenshot 1 */}
      <main className="flex-1">
        <div className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-gradient-to-b from-[#a5bbfc]/30 via-[#d5e2ff]/15 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

          {/* Sovereign Defense Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-md mb-6 text-xs text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sovereign Defense AI Platform for Marine Coating Integrity</span>
            <span className="text-slate-300">|</span>
            <span className="text-[#9c8273] font-semibold">AMPP / ISO 4628 / SSPC</span>
          </div>

          {/* Headline in Playfair Display serif */}
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-slate-900 tracking-tight leading-[1.14]">
            AI-Powered Coating Protection for <span className="italic font-normal text-[#374151]">Naval Fleets</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Real-time Open3D micro-topography reconstruction, YOLO deep learning defect localization, and deterministic standards compliance grading for defense maritime platforms.
          </p>

          {/* Buttons on Home Page */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
            >
              <span>Log In to Inspector Dashboard</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200">→</span>
            </Link>

            {!isAuthenticated && (
              <Link
                to="/register"
                className="px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
              >
                Register Inspector Account
              </Link>
            )}

            <a
              href="#standards"
              className="px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-medium hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
            >
              View Defense Standards
            </a>
          </div>

          {/* Feature Telemetry Cards (Exact match to Screenshot 1) */}
          <div id="overview" className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">MESH ENGINE</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">Open3D Micro-Elevation</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">DETECTION CORE</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">YOLO Multi-Defect</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">RULES STANDARD</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">SSPC / NACE / ISO 4628</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/90 shadow-2xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">DEPLOYMENT</div>
              <div className="text-xs font-bold text-emerald-700 mt-0.5">Air-Gapped Sovereign</div>
            </div>
          </div>

          {/* Defense Standards Matrix Section */}
          <div id="standards" className="mt-20 text-left max-w-4xl mx-auto space-y-4">
            <div className="border-b border-slate-200/80 pb-3">
              <h2 className="text-xl font-bold font-serif text-slate-900">
                Applied International Defense Coating Standards
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated deterministic rules mapping defect bounding area, severity, and platform cavitation zones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
                <span className="font-bold text-slate-900 block text-sm">SSPC-PA 2 / NACE SP0188</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Discontinuity and holiday testing for pinhole porosity in dielectric hull coatings.
                </p>
                <div className="font-mono text-[10px] space-y-1 pt-1 text-slate-500">
                  <div>&lt; 0.5% Area: <strong className="text-emerald-700">PASS</strong></div>
                  <div>0.5% - 2.0%: <strong className="text-amber-700">REVIEW</strong></div>
                  <div>&gt; 2.0%: <strong className="text-rose-700">FAIL</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
                <span className="font-bold text-slate-900 block text-sm">ISO 4628-4 / SSPC-VIS 2</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Assessment of mechanical cracking, blistering, and surface flaking degradation.
                </p>
                <div className="font-mono text-[10px] space-y-1 pt-1 text-slate-500">
                  <div>&lt; 1.0% Area: <strong className="text-emerald-700">PASS</strong></div>
                  <div>1.0% - 4.0%: <strong className="text-amber-700">REVIEW</strong></div>
                  <div>&gt; 4.0%: <strong className="text-rose-700">FAIL</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
                <span className="font-bold text-slate-900 block text-sm">ISO 8501-1 / SSPC-SP 10</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Cleanliness, chemical oil contamination, rust scale, and blast particulate evaluation.
                </p>
                <div className="font-mono text-[10px] space-y-1 pt-1 text-slate-500">
                  <div>&lt; 1.5% Area: <strong className="text-emerald-700">PASS</strong></div>
                  <div>1.5% - 4.5%: <strong className="text-amber-700">REVIEW</strong></div>
                  <div>&gt; 4.5%: <strong className="text-rose-700">FAIL</strong></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Public Footer */}
      <footer className="py-8 border-t border-[#e2e8f0] bg-white text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-slate-800">Dhatu Rakshana</span>
            <span>•</span>
            <span>Defense Marine Platform Coating Inspection Engine</span>
          </div>
          <div>
            <Link to="/login" className="text-slate-900 hover:underline font-semibold">
              Inspector Portal Login
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
