import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Shield, LogOut, Menu, X, Plus, History as HistoryIcon, BookOpen, Users, UserCheck } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout, visitorUser, isVisitorAuthenticated, logoutVisitor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleVisitorLogout = () => {
    logoutVisitor();
    navigate('/');
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
          className="flex items-center gap-3 group focus:outline-hidden min-w-0"
          title="Dhatu Rakshana — Marine Coating Inspection & Surface Integrity Analysis"
        >
          <div className="w-8 h-8 rounded border border-grayGreen/50 bg-[#121315] flex items-center justify-center text-matteSage group-hover:border-matteSage nav-transition shrink-0">
            <Shield className="w-4 h-4 text-matteSage" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 leading-none">
              <span className="text-sm sm:text-base font-bold text-fullWhite tracking-tight font-sans truncate">
                DHATU RAKSHANA
              </span>
              {isVisitorAuthenticated && (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-matteSage/40 bg-surface-dark text-matteSage font-mono text-[9px] font-semibold">
                  VISITOR
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase text-greige mt-0.5 hidden xl:block truncate max-w-xs 2xl:max-w-none">
              Marine Coating Inspection & Surface Integrity Analysis
            </span>
          </div>
        </Link>

        {/* Center Technical Navigation */}
        <nav className="hidden md:flex items-center gap-1 xl:gap-1.5 text-xs font-medium flex-nowrap shrink-0">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                title="Submit inspection imagery for analysis and assessment."
                className={`px-2.5 xl:px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
                  isCurrent('/dashboard')
                    ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                    : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-matteSage shrink-0" />
                <span className="hidden lg:inline">New Inspection</span>
                <span className="inline lg:hidden">New</span>
              </Link>

              <Link
                to="/inspections"
                title="Review previously completed inspection analyses and recorded findings."
                className={`px-2.5 xl:px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
                  isCurrent('/inspections')
                    ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                    : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5 text-matteSage shrink-0" />
                <span className="hidden lg:inline">Analysis History</span>
                <span className="inline lg:hidden">History</span>
              </Link>

              <Link
                to="/visitor-logs"
                title="Review recorded external visitor access audit events."
                className={`px-2.5 xl:px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
                  isCurrent('/visitor-logs')
                    ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                    : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-matteSage shrink-0" />
                <span className="hidden lg:inline">Visitor Permissions</span>
                <span className="inline lg:hidden">Visitors</span>
              </Link>
            </>
          ) : isVisitorAuthenticated ? (
            <>
              <Link
                to="/visitor/records"
                title="Review permitted inspection records."
                className={`px-2.5 xl:px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
                  isCurrent('/visitor/records') || isCurrent('/records')
                    ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                    : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-matteSage shrink-0" />
                <span>Visitor Records</span>
              </Link>
            </>
          ) : (
            <Link
              to="/"
              title="Overview of inspection analysis capabilities and reference standards."
              className={`px-2.5 xl:px-3 py-1.5 rounded border nav-transition font-mono text-xs whitespace-nowrap ${
                location.pathname === '/'
                  ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                  : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
              }`}
            >
              Platform Overview
            </Link>
          )}

          {/* Dedicated ISO Rulebase Navigation Link */}
          <Link
            to="/standards"
            title="Technical reference for ISO coating inspection, surface preparation, and defect assessment standards."
            className={`px-2.5 xl:px-3 py-1.5 rounded border nav-transition font-mono text-xs flex items-center gap-1.5 whitespace-nowrap ${
              isCurrent('/standards')
                ? 'bg-grayGreen border-matteSage/60 text-fullWhite font-semibold shadow-technical'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-panel hover:border-grayGreen/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-matteSage shrink-0" />
            <span>ISO Rulebase</span>
          </Link>

          {/* Reference Standards Telemetry Indicator */}
          {!isAuthenticated && !isVisitorAuthenticated && (
            <div
              title="Active reference criteria: AMPP, ISO 4628, SSPC-PA 2"
              className="ml-2 px-2 py-1 rounded border border-grayGreen/30 bg-surface-dark text-greige font-mono text-[10px] hidden xl:flex items-center gap-1.5 cursor-default whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-matteSage shrink-0"></span>
              <span>AMPP • ISO 4628 • SSPC-PA 2</span>
            </div>
          )}
        </nav>

        {/* Right Session Controls */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
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
          ) : isVisitorAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-fullWhite leading-tight font-mono">
                  {visitorUser?.username || 'Visitor'}
                </div>
                <div className="text-[10px] font-mono text-matteSage uppercase">
                  Read-Only Observer
                </div>
              </div>

              <div className="h-5 w-px bg-white/10 mx-1" />

              <button
                type="button"
                onClick={handleVisitorLogout}
                className="px-2.5 py-1.5 rounded border border-white/10 hover:border-white/20 bg-surface-dark text-greige hover:text-status-failText hover:bg-status-fail/40 text-xs font-mono nav-transition cursor-pointer flex items-center gap-1.5"
                title="End Visitor Session"
                aria-label="End Visitor Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>End Session</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-panel text-fullWhite text-xs font-mono nav-transition"
              >
                Inspector Access
              </Link>
              <Link
                to="/visitor-access"
                className="px-3.5 py-1.5 rounded border border-grayGreen/80 bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition shadow-technical"
              >
                Visitor Access
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation Trigger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded border border-white/10 text-greige hover:text-fullWhite bg-surface-dark cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-surface-panel px-4 pt-3 pb-5 space-y-2.5 shadow-elevated">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded text-xs font-mono min-h-[44px] flex items-center gap-2 ${
                  isCurrent('/dashboard') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                <Plus className="w-4 h-4 text-matteSage" />
                <span>New Inspection</span>
              </Link>
              <Link
                to="/inspections"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded text-xs font-mono min-h-[44px] flex items-center gap-2 ${
                  isCurrent('/inspections') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                <HistoryIcon className="w-4 h-4 text-matteSage" />
                <span>Analysis History</span>
              </Link>
              <Link
                to="/visitor-logs"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded text-xs font-mono min-h-[44px] flex items-center gap-2 ${
                  isCurrent('/visitor-logs') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                <Users className="w-4 h-4 text-matteSage" />
                <span>Visitor Access & Permissions</span>
              </Link>
              <Link
                to="/standards"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded text-xs font-mono min-h-[44px] flex items-center gap-2 ${
                  isCurrent('/standards') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                <BookOpen className="w-4 h-4 text-matteSage" />
                <span>ISO Rulebase</span>
              </Link>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-fullWhite font-semibold font-mono">{user?.full_name || 'Inspector'}</div>
                  <div className="text-[10px] text-greige font-mono uppercase">{user?.role || 'Inspector'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="px-3 py-2 rounded border border-status-failBorder bg-status-fail/60 text-status-failText text-xs font-mono cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : isVisitorAuthenticated ? (
            <>
              <Link
                to="/visitor/records"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded text-xs font-mono min-h-[44px] flex items-center gap-2 ${
                  isCurrent('/visitor/records') || isCurrent('/records') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                <UserCheck className="w-4 h-4 text-matteSage" />
                <span>Visitor Records</span>
              </Link>
              <Link
                to="/standards"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded text-xs font-mono min-h-[44px] flex items-center gap-2 ${
                  isCurrent('/standards') ? 'bg-grayGreen text-fullWhite font-semibold border border-matteSage/40' : 'text-greige hover:bg-surface-dark'
                }`}
              >
                <BookOpen className="w-4 h-4 text-matteSage" />
                <span>ISO Rulebase</span>
              </Link>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-fullWhite font-semibold font-mono">{visitorUser?.username || 'Visitor'}</div>
                  <div className="text-[10px] text-matteSage font-mono uppercase">Read-Only Observer</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleVisitorLogout();
                  }}
                  className="px-3 py-2 rounded border border-status-failBorder bg-status-fail/60 text-status-failText text-xs font-mono cursor-pointer"
                >
                  End Session
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/standards"
                onClick={() => setMobileMenuOpen(false)}
                className={`block w-full text-center px-3.5 py-2.5 rounded border border-white/10 text-xs font-mono min-h-[44px] flex items-center justify-center gap-2 ${
                  isCurrent('/standards') ? 'bg-grayGreen text-fullWhite font-semibold' : 'bg-surface-dark text-fullWhite'
                }`}
              >
                <BookOpen className="w-4 h-4 text-matteSage" />
                <span>ISO Rulebase</span>
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-3.5 py-2.5 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono min-h-[44px] flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-matteSage" />
                <span>Inspector Access</span>
              </Link>
              <Link
                to="/visitor-access"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-3.5 py-2.5 rounded bg-grayGreen text-fullWhite text-xs font-mono font-semibold min-h-[44px] flex items-center justify-center gap-2 shadow-technical"
              >
                <UserCheck className="w-4 h-4 text-matteSage" />
                <span>Visitor Access</span>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
