import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafd] text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="group flex items-center gap-2 focus:outline-hidden focus:ring-2 focus:ring-slate-400 rounded-lg p-1 transition-all duration-300"
              title="Dhatu Rakshana - Marine Defense Platform"
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

            {/* Animated Navigation Pill Buttons */}
            <nav className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-full border border-slate-200/80">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:-translate-y-0.25'
                  }`
                }
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 text-slate-400 group-hover:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:-translate-y-0.25'
                  }`
                }
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/inspections"
                className={({ isActive }) =>
                  `group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:-translate-y-0.25'
                  }`
                }
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>History</span>
              </NavLink>
            </nav>
          </div>

          {/* User profile & animated Log out button */}
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-700 font-medium">
                {user?.full_name || user?.email || 'Inspector'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
              className="px-3 py-1.5 rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 font-medium transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>Log out</span>
              <span className="text-[10px]">↳</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#e2e8f0] text-center text-xs text-slate-400">
        <span className="font-serif font-bold text-slate-600">Dhatu Rakshana</span> • Marine Coating Defect Inspection & Grading System
      </footer>
    </div>
  );
}
