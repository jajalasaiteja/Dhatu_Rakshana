import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Spinner from '../components/Spinner';
import ErrorPanel from '../components/ErrorPanel';
import { formatISTDate, formatISTTime } from '../utils/dateTime';
import {
  Users,
  ShieldAlert,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
  Activity
} from 'lucide-react';

export default function VisitorLogs() {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async (currentPage = page, search = searchTerm) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const skip = (currentPage - 1) * pageSize;
      let url = `/visitors/logs?skip=${skip}&limit=${pageSize}`;
      if (search.trim()) {
        url += `&username=${encodeURIComponent(search.trim())}`;
      }
      const data = await apiClient(url);
      setLogs(data.logs || []);
      setTotalCount(data.total_count || 0);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to retrieve visitor activity audit logs.');
    }
  };

  useEffect(() => {
    fetchLogs(page, searchTerm);
  }, [page, pageSize]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, searchTerm);
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    setPage(1);
    fetchLogs(1, '');
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-6">
      
      {/* Header Panel */}
      <div className="bg-surface-panel border border-white/10 rounded p-6 shadow-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-grayGreen/40 bg-surface-dark text-[10px] font-mono text-matteSage mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
              <span>AUDIT LOG ARCHIVE</span>
              <span className="text-white/20">•</span>
              <span>INSPECTOR RESTRICTED</span>
            </div>
            <h1 className="text-2xl font-mono font-bold text-fullWhite tracking-tight">
              Visitor Access Audit Logs
            </h1>
            <p className="text-xs text-content-secondary mt-1 max-w-3xl leading-relaxed">
              Chronological audit trail of external visitor access events with server-generated timestamps.
              Enables compliance tracking and review of external record examinations.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
            <button
              type="button"
              onClick={() => fetchLogs(page, searchTerm)}
              disabled={loading}
              className="px-3.5 py-2 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-fullWhite nav-transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh visitor logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-matteSage ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between font-mono text-xs">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-greige absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by visitor username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono placeholder:text-content-secondary/70 focus:outline-hidden focus:border-matteSage"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-semibold nav-transition cursor-pointer"
            >
              Filter
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-3 py-2 rounded border border-white/10 bg-surface-dark text-greige hover:text-fullWhite nav-transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {/* Records per page & Total Count badge */}
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-greige">
              <span>Total Recorded Events: </span>
              <span className="text-fullWhite font-bold">{totalCount}</span>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono focus:outline-hidden"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-surface-panel border border-white/10 rounded">
          <Spinner size="lg" className="text-matteSage" />
          <span className="text-xs font-mono text-greige tracking-wider uppercase">
            LOADING AUDIT LOGS...
          </span>
        </div>
      )}

      {/* Error State */}
      {!loading && errorMsg && (
        <ErrorPanel
          title="Audit Log Loading Error"
          message={errorMsg}
          onRetry={() => fetchLogs(page, searchTerm)}
        />
      )}

      {/* Empty State */}
      {!loading && !errorMsg && logs.length === 0 && (
        <div className="py-16 text-center bg-surface-panel border border-white/10 rounded p-8">
          <Users className="w-10 h-10 text-greige/50 mx-auto mb-3" />
          <h3 className="text-sm font-mono font-bold text-fullWhite">
            No Visitor Access Events Recorded
          </h3>
          <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No activity events match username "${searchTerm}".`
              : 'There are currently no recorded visitor access events in the database.'}
          </p>
        </div>
      )}

      {/* Audit Logs Table */}
      {!loading && !errorMsg && logs.length > 0 && (
        <div className="bg-surface-panel border border-white/10 rounded shadow-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 bg-surface-dark text-greige uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">Visitor Username</th>
                  <th className="py-3 px-4 font-semibold">Access Date (IST)</th>
                  <th className="py-3 px-4 font-semibold">Access Time (IST)</th>
                  <th className="py-3 px-4 font-semibold">Event</th>
                  <th className="py-3 px-4 font-semibold text-right">Audit Session ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const istDate = formatISTDate(log.accessed_at, { fallback: '—' });
                  const istTime = formatISTTime(log.accessed_at, { includeSeconds: true, fallback: '—' });

                  const eventLabel =
                    log.event_type === 'SUCCESSFUL_ACCESS'
                      ? 'Successful Access'
                      : log.event_type;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.02] nav-transition"
                    >
                      {/* Visitor Username */}
                      <td className="py-3 px-4 text-fullWhite font-bold">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-matteSage" />
                          <span>{log.visitor_username}</span>
                        </div>
                      </td>

                      {/* Access Date (IST) */}
                      <td className="py-3 px-4 text-content-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-matteSage shrink-0" />
                          <span className="text-fullWhite">{istDate}</span>
                        </div>
                      </td>

                      {/* Access Time (IST) */}
                      <td className="py-3 px-4 text-content-secondary">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-greige shrink-0" />
                          <span>{istTime}</span>
                        </div>
                      </td>

                      {/* Event Column */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-status-passBorder/50 bg-status-pass/30 text-status-passText text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-status-passText" />
                          <span>{eventLabel}</span>
                        </span>
                      </td>

                      {/* Session ID */}
                      <td className="py-3 px-4 text-right text-greige text-[11px] font-mono">
                        {log.session_id ? (
                          <span title={log.session_id}>
                            {log.session_id.substring(0, 13)}...
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="py-3 px-4 bg-surface-dark border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-greige">
            <div>
              <span>
                Showing {logs.length ? (page - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(page * pageSize, totalCount)} of {totalCount} log entries
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark text-fullWhite disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-elevated nav-transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 text-fullWhite font-semibold">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark text-fullWhite disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-elevated nav-transition flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
