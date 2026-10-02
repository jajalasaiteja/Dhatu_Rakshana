import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, Menu, X, Plus, History as HistoryIcon } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCurrent = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/upload';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
        
        {/* Platform Crest & Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-hidden"
          title="Dhatu Rakshana — Marine Coating Inspection & Surface Integrity Analysis"
        >
          <div className="w-8 h-8 rounded border border-grayGreen/50 bg-[#121315] flex items-center justify-center text-matteSage group-hover:border-matteSage nav-transition">
            <Shield className="w-4 h-4 text-matteSage" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 leading-none">
              <span className="text-base font-bold text-fullWhite tracking-tight font-sans">
                DHATU RAKSHANA
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase text-greige mt-0.5">
              Marine Coating Inspection & Surface Integrity Analysis
            </span>
          </div>
        </Link>

        {/* Center Technical Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                title="Submit inspection imagery for analysis and assessment."
                className={`px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 ${
                  isCurrent('/dashboard')
                    ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                    : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-matteSage" />
                <span>New Inspection</span>
              </Link>

              <Link
                to="/inspections"
                title="Review previously completed inspection analyses and recorded findings."
                className={`px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 ${
                  isCurrent('/inspections')
                    ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                    : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5 text-matteSage" />
                <span>Analysis History</span>
              </Link>
            </>
          ) : (
            <Link
              to="/"
              title="Overview of inspection analysis capabilities and reference standards."
              className={`px-3 py-1.5 rounded border nav-transition font-mono text-xs ${
                location.pathname === '/'
                  ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                  : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
              }`}
            >
              Platform Overview
            </Link>
          )}

          {/* Reference Standards Telemetry Indicator */}
          <div
            title="Active reference criteria: AMPP, ISO 4628, SSPC-PA 2"
            className="ml-3 px-2.5 py-1 rounded border border-grayGreen/30 bg-surface-dark text-greige font-mono text-[10px] flex items-center gap-2 cursor-default"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-matteSage"></span>
            <span>AMPP • ISO 4628 • SSPC-PA 2</span>
          </div>
        </nav>

        {/* Right Inspector Profile / Session Controls */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-fullWhite leading-tight">
                  {user?.full_name || 'Certified Inspector'}
                </div>
                <div className="text-[10px] font-mono text-greige uppercase">
                  {user?.role || 'Defense Naval Inspector'}
                </div>
              </div>

              <div className="h-5 w-px bg-white/10 mx-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded border border-white/10 hover:border-white/20 bg-surface-dark text-greige hover:text-status-failText hover:bg-status-fail/40 nav-transition cursor-pointer"
                title="End Inspection Session"
                aria-label="End Inspection Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-panel text-fullWhite text-xs font-mono nav-transition"
              >
                Inspector Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded border border-grayGreen/80 bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition shadow-technical"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation Trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded border border-white/10 text-greige hover:text-fullWhite bg-surface-dark"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-surface-panel px-4 pt-3 pb-5 space-y-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-xs font-mono ${
                  isCurrent('/dashboard') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                New Inspection
              </Link>
              <Link
                to="/inspections"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-xs font-mono ${
                  isCurrent('/inspections') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                Analysis History
              </Link>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-greige font-mono">{user?.full_name || 'Inspector'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="px-2.5 py-1 rounded border border-status-failBorder bg-status-fail/60 text-status-failText text-xs font-mono"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono"
              >
                Inspector Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-3 py-2 rounded bg-grayGreen text-fullWhite text-xs font-mono font-semibold"
              >
                Register Credentials
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
