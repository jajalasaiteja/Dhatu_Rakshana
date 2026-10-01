import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient, { resolveMediaUrl } from '../api/client';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';

export default function History() {
  const navigate = useNavigate();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');

  const fetchInspections = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient('/inspections');
      // Sort newest first
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        : [];
      setInspections(sorted);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to load inspection history.');
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  // Filter client-side by zone name and verdict
  const filtered = inspections.filter((insp) => {
    const zoneName = (insp.zone_name || `Zone ${insp.zone_id}`).toLowerCase();
    const matchesSearch = zoneName.includes(searchTerm.toLowerCase().trim());
    const matchesVerdict = verdictFilter === 'ALL' || (insp.overall_verdict || '').toUpperCase() === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Inspection History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical scans, localized defects, and standards compliance audit records.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="self-start sm:self-auto px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
        >
          <span>+ New Inspection</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by zone name (e.g. Hull, Deck, Ballast)..."
            className="w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All Verdicts</option>
            <option value="PASS">Pass</option>
            <option value="REVIEW">Review</option>
            <option value="FAIL">Fail</option>
          </select>
        </div>
      </div>

      {/* Content states */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden p-4 space-y-3 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-2/3 bg-slate-200 rounded-sm"></div>
              <div className="h-3 w-1/2 bg-slate-100 rounded-sm"></div>
            </div>
          ))}
        </div>
      ) : errorMsg ? (
        <ErrorPanel
          message={errorMsg}
          onRetry={fetchInspections}
        />
      ) : inspections.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center text-slate-500 space-y-3 shadow-xs">
          <p className="text-base font-semibold text-slate-800">No inspections logged yet.</p>
          <p className="text-xs">Upload your first defense platform coating specimen to begin.</p>
          <div>
            <Link
              to="/upload"
              className="inline-block px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Upload Specimen
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center text-slate-500 shadow-xs">
          <p className="text-sm font-semibold text-slate-800">No matches found</p>
          <p className="text-xs mt-1">No inspections match "{searchTerm}". Try clearing your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((insp) => {
            const thumb = resolveMediaUrl(insp.thumbnail_url || insp.image_url);

            return (
              <div
                key={insp.id}
                onClick={() => navigate(`/inspections/${insp.id}`)}
                className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                <div>
                  <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                    <img
                      src={thumb}
                      alt={`Inspection #${insp.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <Badge status={insp.overall_verdict} size="sm" />
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>#{insp.id}</span>
                      <span>{new Date(insp.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-950 transition-colors">
                      {insp.zone_name || `Zone ${insp.zone_id}`}
                    </h3>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Defects: <strong className="text-slate-800">{insp.defect_count ?? 0}</strong></span>
                  <span className="text-slate-900 font-semibold flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
                    <span>View Result</span>
                    <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
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
