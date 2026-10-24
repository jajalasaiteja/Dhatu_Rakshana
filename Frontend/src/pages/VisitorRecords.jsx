import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { resolveMediaUrl } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import ThemeToggle from '../components/ThemeToggle';
import {
  formatISTDate,
  formatISTTime,
  compareDatesAsc,
  compareDatesDesc
} from '../utils/dateTime';
import { filterGenuineInspections } from '../utils/inspectionFilters';
import {
  Shield,
  Search,
  Filter,
  Calendar,
  Box,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  LogOut,
  UserCheck,
  BookOpen,
  Eye,
  Layers,
  Clock
} from 'lucide-react';

export default function VisitorRecords() {
  const { visitorUser, logoutVisitor } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('oldest'); // 'oldest' | 'newest' | 'defects'

  const getRecordLabel = (insp) => {
    if (insp.display_label) return insp.display_label;
    return `Record ${insp.id}`;
  };

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient('/visitors/records');
      const valid = filterGenuineInspections(Array.isArray(data) ? data : []);
      setRecords(valid);
      setLoading(false);
    } catch (err) {
      setRecords([]);
      setLoading(false);
      setErrorMsg(err.message || 'UNABLE TO LOAD VISITOR ANALYSIS RECORDS');
    }
  };

  useEffect(() => {
    fetchRecords();

    const handleSync = () => {
      fetchRecords();
    };
    window.addEventListener('inspection:deleted', handleSync);
    window.addEventListener('popstate', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('inspection:deleted', handleSync);
      window.removeEventListener('popstate', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const handleEndSession = () => {
    logoutVisitor();
    navigate('/');
  };

  const filteredAndSorted = records
    .filter((insp) => {
      const zoneName = (insp.zone_name || `Zone ${insp.zone_id}`).toLowerCase();
      const label = getRecordLabel(insp).toLowerCase();
      const idMatch = String(insp.id).includes(searchTerm.trim()) ||
                      label.includes(searchTerm.toLowerCase().trim());
      const matchesSearch = zoneName.includes(searchTerm.toLowerCase().trim()) || idMatch;
      const matchesVerdict =
        verdictFilter === 'ALL' ||
        (insp.overall_verdict || '').toUpperCase() === verdictFilter;
      return matchesSearch && matchesVerdict;
    })
    .sort((a, b) => {
      if (sortBy === 'defects') {
        return (b.defect_count || 0) - (a.defect_count || 0);
      }
      if (sortBy === 'newest') {
        return compareDatesDesc(a.timestamp, b.timestamp);
      }
      // default: oldest (Oldest First)
      return compareDatesAsc(a.timestamp, b.timestamp);
    });

  return (
    <div className="min-h-screen flex flex-col bg-surface text-content-primary font-sans selection:bg-grayGreen/50 selection:text-white">
      
      {/* Dedicated Visitor Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#18191C] border-b border-white/10 shadow-panel">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-15 flex items-center justify-between">
          
          {/* Brand Crest */}
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
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-matteSage/40 bg-surface-dark text-matteSage font-mono font-semibold">
                  VISITOR READ-ONLY
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider uppercase text-greige mt-0.5">
                Permitted Coating Inspection Records Archive
              </span>
            </div>
          </Link>

          {/* Center Reference Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-mono">
            <Link
              to="/standards"
              className="px-3 py-1.5 rounded border border-transparent hover:border-white/10 hover:bg-surface-panel text-greige hover:text-fullWhite nav-transition flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-matteSage" />
              <span>ISO Rulebase</span>
            </Link>
            <div className="px-2.5 py-1 rounded border border-grayGreen/30 bg-surface-dark text-greige text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
              <span>AMPP • ISO 4628 • SSPC-PA 2</span>
            </div>
          </nav>

          {/* Right Controls: Visitor Session and Theme Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <div className="flex items-center gap-3 pl-2 border-l border-white/10">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-mono font-semibold text-fullWhite flex items-center gap-1 justify-end">
                  <UserCheck className="w-3 h-3 text-matteSage" />
                  <span>{visitorUser?.username || 'Visitor'}</span>
                </span>
                <span className="text-[10px] font-mono text-greige uppercase">
                  External Observer
                </span>
              </div>

              <button
                type="button"
                onClick={handleEndSession}
                className="px-3 py-1.5 rounded border border-status-failBorder/80 bg-status-fail/30 hover:bg-status-fail/60 text-status-failText text-xs font-mono flex items-center gap-1.5 nav-transition cursor-pointer"
                title="End visitor session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End Session</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-6">
        
        {/* Header Banner */}
        <div className="bg-surface-panel border border-white/10 rounded p-6 shadow-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-grayGreen/40 bg-surface-dark text-[10px] font-mono text-matteSage mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
                <span>VISITOR ACCESS GRANTED</span>
                <span className="text-white/20">•</span>
                <span>AUDIT LOGGED</span>
              </div>
              <h1 className="text-2xl font-mono font-bold text-fullWhite tracking-tight">
                Coating Inspection Records
              </h1>
              <p className="text-xs text-content-secondary mt-1 max-w-3xl leading-relaxed">
                Viewing permitted historical naval surface coating evaluation scans, defect classifications, and standards compliance findings in authorized read-only mode.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
              <button
                type="button"
                onClick={fetchRecords}
                disabled={loading}
                className="px-3.5 py-2 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-fullWhite nav-transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Refresh analysis records"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-matteSage ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between font-mono text-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-greige absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by zone name or specimen ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono placeholder:text-content-secondary/70 focus:outline-hidden focus:border-matteSage"
              />
            </div>

            {/* Verdict Filter and Sort */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-greige" />
                <span className="text-greige text-[11px] font-semibold">Verdict:</span>
                <select
                  value={verdictFilter}
                  onChange={(e) => setVerdictFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono focus:outline-hidden"
                >
                  <option value="ALL">All Verdicts</option>
                  <option value="PASS">Pass Only</option>
                  <option value="FAIL">Fail Only</option>
                  <option value="MONITOR">Monitor Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-greige text-[11px] font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono focus:outline-hidden"
                >
                  <option value="oldest">Sequence (Oldest First)</option>
                  <option value="newest">Newest First</option>
                  <option value="defects">Most Defects</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-surface-panel border border-white/10 rounded">
            <Spinner size="lg" className="text-matteSage" />
            <span className="text-xs font-mono text-greige tracking-wider uppercase">
              RETRIEVING PERMITTED ANALYSIS RECORDS...
            </span>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <ErrorPanel
            title="Records Retrieval Error"
            message={errorMsg}
            onRetry={fetchRecords}
          />
        )}

        {/* Empty State */}
        {!loading && !errorMsg && filteredAndSorted.length === 0 && (
          <div className="py-16 text-center bg-surface-panel border border-white/10 rounded p-8">
            <Box className="w-10 h-10 text-greige/50 mx-auto mb-3" />
            <h3 className="text-sm font-mono font-bold text-fullWhite">
              No Inspection Records Available
            </h3>
            <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
              {searchTerm || verdictFilter !== 'ALL'
                ? 'No inspection records match your current filter criteria. Try resetting filters.'
                : 'No inspection records available. Upload an inspection image to begin a new analysis.'}
            </p>
          </div>
        )}

        {/* Records Table */}
        {!loading && !errorMsg && filteredAndSorted.length > 0 && (
          <div className="bg-surface-panel border border-white/10 rounded shadow-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-surface-dark text-greige uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-semibold">Specimen ID</th>
                    <th className="py-3 px-4 font-semibold">Evaluation Date & Time (IST)</th>
                    <th className="py-3 px-4 font-semibold">Platform Zone</th>
                    <th className="py-3 px-4 font-semibold text-center">Standards Verdict</th>
                    <th className="py-3 px-4 font-semibold text-center">Defects</th>
                    <th className="py-3 px-4 font-semibold text-center">3D Topography</th>
                    <th className="py-3 px-4 font-semibold text-right">Inspection Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAndSorted.map((insp) => {
                    const istDateStr = formatISTDate(insp.timestamp, { fallback: '—' });
                    const istTimeStr = formatISTTime(insp.timestamp, { includeSeconds: true, fallback: '' });

                    return (
                      <tr
                        key={insp.id}
                        className="hover:bg-white/[0.02] nav-transition group"
                      >
                        {/* Specimen ID */}
                        <td className="py-3 px-4 text-fullWhite font-bold">
                          {getRecordLabel(insp)}
                        </td>

                        {/* Date and Time in IST */}
                        <td className="py-3 px-4 text-content-secondary">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-matteSage shrink-0" />
                            <div>
                              <div className="text-fullWhite font-medium">{istDateStr}</div>
                              <div className="text-[10px] text-greige">{istTimeStr}</div>
                            </div>
                          </div>
                        </td>

                        {/* Zone */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-fullWhite font-medium">
                              {insp.zone_name || `Zone ${insp.zone_id}`}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-dark border border-matteSage/30 text-[9px] text-matteSage font-mono font-semibold">
                              {insp.evaluation_engine_version ? `v${insp.evaluation_engine_version}` : 'v2.0.0-iso'}
                            </span>
                          </div>
                        </td>

                        {/* Verdict Badge */}
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={insp.overall_verdict} />
                        </td>

                        {/* Defects Count */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              insp.defect_count > 0
                                ? 'bg-status-fail/40 text-status-failText border border-status-failBorder/50'
                                : 'bg-status-pass/40 text-status-passText border border-status-passBorder/50'
                            }`}
                          >
                            {insp.defect_count} {insp.defect_count === 1 ? 'defect' : 'defects'}
                          </span>
                        </td>

                        {/* 3D Topography */}
                        <td className="py-3 px-4 text-center">
                          {insp.topology_available ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-grayGreen/40 bg-surface-dark text-matteSage font-semibold">
                              <Layers className="w-3 h-3 text-matteSage" />
                              <span>Available</span>
                            </span>
                          ) : (
                            <span className="text-greige/50 text-[10px]">None</span>
                          )}
                        </td>

                        {/* Action Link */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/visitor/records/${insp.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-surface-dark hover:border-matteSage hover:bg-surface-elevated text-fullWhite text-xs nav-transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-matteSage" />
                            <span>View Findings</span>
                            <ChevronRight className="w-3.5 h-3.5 text-greige group-hover:translate-x-0.5 nav-transition" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer Count */}
            <div className="py-3 px-4 bg-surface-dark border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-greige">
              <span>Showing {filteredAndSorted.length} of {records.length} total inspection records</span>
              <span>ISO 4628 & AMPP Compliant Record Format</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
