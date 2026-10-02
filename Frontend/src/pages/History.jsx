import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient, { resolveMediaUrl } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import {
  Shield,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Calendar,
  Box,
  ChevronRight,
  ExternalLink,
  List,
  LayoutGrid,
  RefreshCw,
  Clock
} from 'lucide-react';

export default function History() {
  const navigate = useNavigate();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'defects'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  const fetchInspections = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient('/inspections');
      setInspections(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'UNABLE TO LOAD INSPECTION HISTORY');
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const filteredAndSorted = inspections
    .filter((insp) => {
      const zoneName = (insp.zone_name || `Zone ${insp.zone_id}`).toLowerCase();
      const idMatch = String(insp.id).includes(searchTerm.trim());
      const matchesSearch = zoneName.includes(searchTerm.toLowerCase().trim()) || idMatch;
      const matchesVerdict =
        verdictFilter === 'ALL' ||
        (insp.overall_verdict || '').toUpperCase() === verdictFilter;
      return matchesSearch && matchesVerdict;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.timestamp) - new Date(b.timestamp);
      }
      if (sortBy === 'defects') {
        return (b.defect_count ?? 0) - (a.defect_count ?? 0);
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  // Telemetry metrics
  const totalCount = inspections.length;
  const passCount = inspections.filter((i) => (i.overall_verdict || '').toUpperCase() === 'PASS').length;
  const reviewCount = inspections.filter((i) => (i.overall_verdict || '').toUpperCase() === 'REVIEW').length;
  const failCount = inspections.filter((i) => (i.overall_verdict || '').toUpperCase() === 'FAIL').length;

  return (
    <div className="space-y-5">
      
      {/* Page Header Strip & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div>
          <div className="text-[10px] font-mono uppercase font-bold tracking-widest text-matteSage">
            ANALYSIS HISTORY
          </div>
          <h1 className="text-xl font-mono font-bold text-fullWhite tracking-tight mt-0.5">
            Inspection Records & Analysis History
          </h1>
          <p className="text-xs text-greige font-medium mt-0.5 leading-relaxed font-sans">
            Review completed coating inspections, detected defect counts, surface topography records, and compliance assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchInspections}
            title="Refresh inspection records"
            className="p-2 rounded border border-white/10 bg-surface-panel hover:bg-surface-elevated text-greige hover:text-fullWhite nav-transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition shadow-technical cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Inspection</span>
          </Link>
        </div>
      </div>

      {/* Summary Telemetry Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded border border-white/10 bg-surface-panel shadow-panel">
          <span className="text-greige text-[10px] uppercase font-bold block mb-0.5">Total Records</span>
          <span className="text-base font-bold text-fullWhite">{totalCount}</span>
        </div>
        <div className="p-3 rounded border border-status-passBorder/60 bg-surface-panel shadow-panel">
          <span className="text-status-passText text-[10px] uppercase font-bold block mb-0.5">Compliant (Pass)</span>
          <span className="text-base font-bold text-status-passText">{passCount}</span>
        </div>
        <div className="p-3 rounded border border-status-reviewBorder/60 bg-surface-panel shadow-panel">
          <span className="text-status-reviewText text-[10px] uppercase font-bold block mb-0.5">Review Required</span>
          <span className="text-base font-bold text-status-reviewText">{reviewCount}</span>
        </div>
        <div className="p-3 rounded border border-status-failBorder/60 bg-surface-panel shadow-panel">
          <span className="text-status-failText text-[10px] uppercase font-bold block mb-0.5">Non-Compliant (Fail)</span>
          <span className="text-base font-bold text-status-failText">{failCount}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-panel rounded border border-white/10 p-3.5 shadow-technical flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        
        {/* Search Input */}
        <div className="w-full md:flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-greige">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Asset / Zone name or Inspection ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded border border-white/10 text-xs font-mono text-fullWhite bg-surface-dark focus:outline-hidden focus:ring-1 focus:ring-grayGreen"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Verdict Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-greige shrink-0" />
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-white/10 text-xs font-mono text-fullWhite bg-surface-dark focus:outline-hidden focus:ring-1 focus:ring-grayGreen cursor-pointer"
            >
              <option value="ALL">All Verdicts</option>
              <option value="PASS">Pass Only</option>
              <option value="REVIEW">Review Only</option>
              <option value="FAIL">Fail Only</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-white/10 text-xs font-mono text-fullWhite bg-surface-dark focus:outline-hidden focus:ring-1 focus:ring-grayGreen cursor-pointer"
            >
              <option value="newest">Newest Analyses First</option>
              <option value="oldest">Oldest Analyses First</option>
              <option value="defects">Defect Count (High → Low)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded border border-white/10 bg-surface-dark p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded nav-transition ${
                viewMode === 'table' ? 'bg-grayGreen text-fullWhite' : 'text-greige hover:text-fullWhite'
              }`}
              title="Structured Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded nav-transition ${
                viewMode === 'grid' ? 'bg-grayGreen text-fullWhite' : 'text-greige hover:text-fullWhite'
              }`}
              title="Inspection Frame Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Content States */}
      {loading ? (
        <div className="p-12 text-center bg-surface-panel rounded border border-white/10 space-y-3 shadow-panel">
          <Spinner size="md" className="text-matteSage mx-auto" />
          <h2 className="text-xs font-mono text-fullWhite font-bold uppercase tracking-wider">
            LOADING INSPECTION RECORDS
          </h2>
          <p className="text-xs font-mono text-greige">
            Preparing inspection records and analysis history...
          </p>
        </div>
      ) : errorMsg ? (
        <div className="space-y-3">
          <div className="p-4 rounded border border-status-failBorder bg-surface-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-mono font-bold text-status-failText uppercase">
                UNABLE TO LOAD INSPECTION HISTORY
              </div>
              <p className="text-greige mt-1 font-mono text-[11px]">
                {errorMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchInspections}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-fullWhite text-xs font-mono nav-transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          </div>
        </div>
      ) : inspections.length === 0 ? (
        /* Empty State */
        <div className="bg-surface-panel rounded border border-white/10 p-10 text-center shadow-panel space-y-3 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage mx-auto">
            <Shield className="w-5 h-5 text-matteSage" />
          </div>
          <h2 className="text-sm font-mono font-bold text-fullWhite uppercase tracking-wide">
            NO COMPLETED ANALYSES
          </h2>
          <p className="text-xs text-greige leading-relaxed font-sans">
            Completed inspection analyses will appear here once processing has finished.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-grayGreen bg-grayGreen text-fullWhite text-xs font-mono font-semibold hover:bg-grayGreen-light nav-transition"
            >
              <span>Start New Inspection</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="bg-surface-panel rounded border border-white/10 p-8 text-center shadow-technical space-y-2 font-mono text-xs">
          <p className="text-sm font-bold text-fullWhite">No Matching Inspection Records</p>
          <p className="text-xs text-greige">
            No records matched criteria "{searchTerm}". Clear search filter or reset verdict selector.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setVerdictFilter('ALL');
            }}
            className="text-matteSage hover:underline pt-2 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Structured Technical Data Table View */
        <div className="overflow-x-auto rounded border border-white/10 bg-surface-panel shadow-technical">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-dark border-b border-white/10 text-greige font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 font-semibold">Inspection ID</th>
                <th className="py-3 px-3.5 font-semibold">Asset / Sample</th>
                <th className="py-3 px-3.5 font-semibold">Date</th>
                <th className="py-3 px-3.5 font-semibold">Status</th>
                <th className="py-3 px-3.5 font-semibold">Defects</th>
                <th className="py-3 px-3.5 font-semibold">3D Topology</th>
                <th className="py-3 px-3.5 font-semibold">Assessment</th>
                <th className="py-3 px-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {filteredAndSorted.map((insp) => (
                <tr
                  key={insp.id}
                  onClick={() => navigate(`/inspections/${insp.id}`)}
                  className="hover:bg-surface-dark/70 nav-transition cursor-pointer"
                >
                  {/* Inspection ID */}
                  <td className="py-3 px-3.5 font-bold text-fullWhite whitespace-nowrap">
                    #{insp.id}
                  </td>

                  {/* Asset / Sample */}
                  <td className="py-3 px-3.5 text-fullWhite">
                    <div className="font-semibold">{insp.zone_name || `Zone ${insp.zone_id}`}</div>
                    <div className="text-[10px] text-greige">
                      Specimen #{insp.id}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3.5 text-[11px] text-greige whitespace-nowrap">
                    {new Date(insp.timestamp).toLocaleString()}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-dark border border-white/10 text-greige">
                      <Clock className="w-3 h-3 text-matteSage" />
                      {insp.status || 'COMPLETED'}
                    </span>
                  </td>

                  {/* Defects */}
                  <td className="py-3 px-3.5 font-bold text-fullWhite whitespace-nowrap">
                    {insp.defect_count ?? 0}
                  </td>

                  {/* 3D Topology */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {insp.topology_available || insp.mesh_url ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-pass border border-status-passBorder text-status-passText">
                        <Box className="w-3 h-3 text-status-passText" />
                        <span>
                          {insp.topology_info?.file_size
                            ? `${(insp.topology_info.file_size / (1024 * 1024)).toFixed(1)} MB`
                            : 'AVAILABLE'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-greige/60">Not Available</span>
                    )}
                  </td>

                  {/* Assessment */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <StatusBadge status={insp.overall_verdict} size="sm" />
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-matteSage hover:underline font-semibold">
                      <span>View Analysis</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Structured Technical Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredAndSorted.map((insp) => {
            const thumb = resolveMediaUrl(insp.thumbnail_url || insp.image_url);

            return (
              <div
                key={insp.id}
                onClick={() => navigate(`/inspections/${insp.id}`)}
                className="bg-surface-panel rounded border border-white/10 overflow-hidden shadow-technical hover:border-matteSage/60 nav-transition cursor-pointer flex flex-col justify-between group relative"
              >
                <div>
                  {/* Thumbnail Container */}
                  <div className="h-40 w-full bg-surface-darker relative overflow-hidden border-b border-white/10">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={`Inspection #${insp.id}`}
                        className="w-full h-full object-cover group-hover:scale-102 nav-transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-greige text-xs font-mono">
                        INSPECTION IMAGE
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <StatusBadge status={insp.overall_verdict} size="sm" />
                    </div>
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-surface-darker/90 border border-white/15 text-fullWhite font-mono text-[9px] font-bold">
                      INSPECTION #{insp.id}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-greige">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(insp.timestamp).toLocaleDateString()}</span>
                      </span>
                      <span>{new Date(insp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <h3 className="text-xs font-semibold text-fullWhite line-clamp-1 font-sans">
                      {insp.zone_name || `Zone ${insp.zone_id}`}
                    </h3>

                    <div className="flex items-center gap-3 pt-0.5 text-xs font-mono">
                      <span className="text-greige">
                        Defects: <strong className="text-fullWhite">{insp.defect_count ?? 0}</strong>
                      </span>
                      {insp.topology_available || insp.mesh_url ? (
                        <span className="text-matteSage text-[10px] font-semibold flex items-center gap-1">
                          <Box className="w-3 h-3 text-matteSage" />
                          <span>
                            .PLY {insp.topology_info?.file_size ? `(${(insp.topology_info.file_size / (1024 * 1024)).toFixed(1)} MB)` : 'AVAILABLE'}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-3.5 py-2 border-t border-white/10 bg-surface-dark/50 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-greige text-[10px]">
                    ISO 4628 / SSPC
                  </span>
                  <span className="text-matteSage font-semibold flex items-center gap-1 group-hover:underline nav-transition">
                    <span>View Analysis</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
