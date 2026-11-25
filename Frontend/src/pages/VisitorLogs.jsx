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
  XCircle,
  Activity,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  ShieldCheck,
  Plus,
  X,
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Building,
  User,
  KeyRound
} from 'lucide-react';

export default function VisitorLogs() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'logs'

  // --- Visitor Directory State ---
  const [visitors, setVisitors] = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [visitorError, setVisitorError] = useState('');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'

  // --- Grant Permission Modal State ---
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantUsername, setGrantUsername] = useState('');
  const [grantPassword, setGrantPassword] = useState('');
  const [showGrantPassword, setShowGrantPassword] = useState(false);
  const [grantFullName, setGrantFullName] = useState('');
  const [grantOrg, setGrantOrg] = useState('');
  const [grantActive, setGrantActive] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // --- Audit Logs State ---
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logError, setLogError] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Action feedback auto-dismiss
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Fetch Visitors List
  const fetchVisitors = async () => {
    setLoadingVisitors(true);
    setVisitorError('');
    try {
      const data = await apiClient('/visitors/list');
      setVisitors(Array.isArray(data) ? data : []);
      setLoadingVisitors(false);
    } catch (err) {
      setLoadingVisitors(false);
      setVisitorError(err.message || 'Failed to retrieve registered visitor directory.');
    }
  };

  // Fetch Audit Logs
  const fetchLogs = async (currentPage = page, search = logSearch) => {
    setLoadingLogs(true);
    setLogError('');
    try {
      const skip = (currentPage - 1) * pageSize;
      let url = `/visitors/logs?skip=${skip}&limit=${pageSize}`;
      if (search.trim()) {
        url += `&username=${encodeURIComponent(search.trim())}`;
      }
      const data = await apiClient(url);
      setLogs(data.logs || []);
      setTotalCount(data.total_count || 0);
      setLoadingLogs(false);
    } catch (err) {
      setLoadingLogs(false);
      setLogError(err.message || 'Failed to retrieve visitor activity audit logs.');
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(page, logSearch);
    }
  }, [page, pageSize, activeTab]);

  // Handle Search for Audit Logs
  const handleLogSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, logSearch);
  };

  const handleResetLogSearch = () => {
    setLogSearch('');
    setPage(1);
    fetchLogs(1, '');
  };

  // Handle Granting Permission to Visitor
  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    const cleanUname = grantUsername.trim().toLowerCase();
    if (!cleanUname) {
      setGrantError('Visitor username is required.');
      return;
    }

    setGrantLoading(true);
    setGrantError('');

    try {
      await apiClient('/visitors/grant', {
        method: 'POST',
        body: JSON.stringify({
          username: cleanUname,
          password: grantPassword.trim() || undefined,
          full_name: grantFullName.trim() || null,
          organization: grantOrg.trim() || null,
          is_active: grantActive
        })
      });

      setGrantLoading(false);
      setShowGrantModal(false);
      setGrantUsername('');
      setGrantPassword('');
      setShowGrantPassword(false);
      setGrantFullName('');
      setGrantOrg('');
      setGrantActive(true);
      setActionSuccess(`Access permission granted successfully to visitor "${cleanUname}".`);
      fetchVisitors();
    } catch (err) {
      setGrantLoading(false);
      setGrantError(err.message || 'Failed to grant visitor permission.');
    }
  };

  // Handle Toggle Permission (Activate / Suspend)
  const handleToggleVisitor = async (visitor) => {
    try {
      const res = await apiClient(`/visitors/${visitor.id}/toggle`, {
        method: 'PATCH'
      });
      const newState = res.is_active;
      setActionSuccess(
        `Permission for visitor "${visitor.username}" is now ${
          newState ? 'ACTIVE (Permitted)' : 'SUSPENDED (Access Denied)'
        }.`
      );
      fetchVisitors();
    } catch (err) {
      setActionSuccess('');
      alert(err.message || 'Failed to toggle visitor permission.');
    }
  };

  // Handle Delete Visitor
  const handleDeleteVisitor = async (visitor) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove visitor identifier "${visitor.username}"? This visitor will no longer be authorized.`
    );
    if (!confirmDelete) return;

    try {
      await apiClient(`/visitors/${visitor.id}`, {
        method: 'DELETE'
      });
      setActionSuccess(`Visitor identifier "${visitor.username}" removed from authorized registry.`);
      fetchVisitors();
    } catch (err) {
      alert(err.message || 'Failed to delete visitor identifier.');
    }
  };

  // Filter visitors
  const filteredVisitors = visitors.filter((v) => {
    const search = visitorSearch.toLowerCase().trim();
    const matchesSearch =
      !search ||
      v.username.toLowerCase().includes(search) ||
      (v.full_name && v.full_name.toLowerCase().includes(search)) ||
      (v.organization && v.organization.toLowerCase().includes(search));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && v.is_active) ||
      (statusFilter === 'suspended' && !v.is_active);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const activeCount = visitors.filter((v) => v.is_active).length;
  const suspendedCount = visitors.filter((v) => !v.is_active).length;

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-6">
      
      {/* Header Panel */}
      <div className="bg-surface-panel border border-white/10 rounded p-6 shadow-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-grayGreen/40 bg-surface-dark text-[10px] font-mono text-matteSage mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
              <span>ACCESS CONTROL & SECURITY</span>
              <span className="text-white/20">•</span>
              <span>INSPECTOR RESTRICTED</span>
            </div>
            <h1 className="text-2xl font-mono font-bold text-fullWhite tracking-tight">
              Visitor Access & Audit Management
            </h1>
            <p className="text-xs text-content-secondary mt-1 max-w-3xl leading-relaxed">
              Inspectors can grant, review, or suspend read-only inspection access permissions and passwords for external
              auditors and observers, as well as inspect chronological activity audit logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch sm:self-auto font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                fetchVisitors();
                if (activeTab === 'logs') fetchLogs(page, logSearch);
              }}
              disabled={loadingVisitors || loadingLogs}
              className="flex-1 sm:flex-none justify-center px-3 py-2 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-fullWhite nav-transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-matteSage ${
                  loadingVisitors || loadingLogs ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGrantError('');
                setGrantPassword('');
                setShowGrantPassword(false);
                setShowGrantModal(true);
              }}
              className="flex-1 sm:flex-none justify-center px-3 sm:px-3.5 py-2 rounded border border-matteSage bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-semibold nav-transition flex items-center gap-1.5 cursor-pointer shadow-technical active:scale-98 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 text-matteSage shrink-0" />
              <span>Grant Permission</span>
            </button>
          </div>
        </div>

        {/* Operational Statistics Badges */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 font-mono text-xs">
          <div className="p-2.5 sm:p-3 rounded border border-white/5 bg-surface-dark/70">
            <span className="text-[10px] text-greige uppercase tracking-wider block truncate">Total Registered</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-fullWhite">{visitors.length}</span>
              <span className="text-[10px] text-greige">Visitors</span>
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded border border-status-passBorder/30 bg-status-pass/10">
            <span className="text-[10px] text-matteSage uppercase tracking-wider block truncate">Active Permissions</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-status-passText">{activeCount}</span>
              <span className="text-[10px] text-status-passText/80">Permitted</span>
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded border border-status-failBorder/30 bg-status-fail/10">
            <span className="text-[10px] text-status-failText uppercase tracking-wider block truncate">Suspended</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-status-failText">{suspendedCount}</span>
              <span className="text-[10px] text-status-failText/80">Suspended</span>
            </div>
          </div>
          <div className="p-2.5 sm:p-3 rounded border border-white/5 bg-surface-dark/70">
            <span className="text-[10px] text-greige uppercase tracking-wider block truncate">Audit Events</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-matteSage">{totalCount}</span>
              <span className="text-[10px] text-matteSage/80">Events</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 font-mono text-xs overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded border nav-transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'directory'
                ? 'bg-grayGreen border-matteSage text-fullWhite font-semibold shadow-technical'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-elevated'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-matteSage" />
            <span>Authorized Visitors Directory</span>
            <span className="px-1.5 py-0.2 rounded bg-surface-dark text-[10px] text-matteSage font-bold">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded border nav-transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'logs'
                ? 'bg-grayGreen border-matteSage text-fullWhite font-semibold shadow-technical'
                : 'border-transparent text-greige hover:text-fullWhite hover:bg-surface-elevated'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-matteSage" />
            <span>Activity Audit Logs</span>
            <span className="px-1.5 py-0.2 rounded bg-surface-dark text-[10px] text-greige font-bold">
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Action Success Notification */}
      {actionSuccess && (
        <div
          className="p-3 rounded border border-status-passBorder bg-status-pass/30 text-status-passText font-mono text-xs flex items-center justify-between gap-3 shadow-panel animate-fade-in"
          role="status"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-passText shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess('')}
            className="text-greige hover:text-fullWhite cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: AUTHORIZED VISITORS DIRECTORY & PERMISSION CONTROLS      */}
      {/* ============================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-surface-panel border border-white/10 rounded p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between font-mono text-xs shadow-panel">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-greige absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by username, full name, or organization..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono placeholder:text-content-secondary/70 focus:outline-hidden focus:border-matteSage"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-surface-dark p-1 rounded border border-white/10">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] nav-transition cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-surface-elevated text-fullWhite font-bold'
                      : 'text-greige hover:text-fullWhite'
                  }`}
                >
                  All ({visitors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded text-[11px] nav-transition cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-status-pass/40 text-status-passText font-bold'
                      : 'text-greige hover:text-fullWhite'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('suspended')}
                  className={`px-2.5 py-1 rounded text-[11px] nav-transition cursor-pointer ${
                    statusFilter === 'suspended'
                      ? 'bg-status-fail/40 text-status-failText font-bold'
                      : 'text-greige hover:text-fullWhite'
                  }`}
                >
                  Suspended ({suspendedCount})
                </button>
              </div>

              {visitorSearch && (
                <button
                  type="button"
                  onClick={() => setVisitorSearch('')}
                  className="px-2.5 py-1.5 rounded border border-white/10 bg-surface-dark text-greige hover:text-fullWhite nav-transition"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loadingVisitors && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 bg-surface-panel border border-white/10 rounded">
              <Spinner size="lg" className="text-matteSage" />
              <span className="text-xs font-mono text-greige tracking-wider uppercase">
                LOADING VISITOR REGISTRY...
              </span>
            </div>
          )}

          {/* Error State */}
          {!loadingVisitors && visitorError && (
            <ErrorPanel
              title="Registry Loading Error"
              message={visitorError}
              onRetry={fetchVisitors}
            />
          )}

          {/* Empty State */}
          {!loadingVisitors && !visitorError && filteredVisitors.length === 0 && (
            <div className="py-16 text-center bg-surface-panel border border-white/10 rounded p-8">
              <Users className="w-10 h-10 text-greige/50 mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-fullWhite">
                No Authorized Visitors Found
              </h3>
              <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
                {visitorSearch
                  ? `No visitors match query "${visitorSearch}".`
                  : 'No visitors match the selected filter. Click "Grant Visitor Permission" to authorize a new visitor.'}
              </p>
            </div>
          )}

          {/* Visitors Directory Table */}
          {!loadingVisitors && !visitorError && filteredVisitors.length > 0 && (
            <div className="bg-surface-panel border border-white/10 rounded shadow-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-surface-dark text-greige uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-semibold">Visitor Username</th>
                      <th className="py-3 px-4 font-semibold">Full Name / Designation</th>
                      <th className="py-3 px-4 font-semibold">Organization / Command</th>
                      <th className="py-3 px-4 font-semibold">Permission Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredVisitors.map((visitor) => (
                      <tr
                        key={visitor.id}
                        className="hover:bg-white/[0.02] nav-transition"
                      >
                        {/* Username */}
                        <td className="py-3 px-4 text-fullWhite font-bold">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                visitor.is_active ? 'bg-matteSage' : 'bg-status-failText'
                              }`}
                            />
                            <span className="font-mono text-sm">{visitor.username}</span>
                          </div>
                        </td>

                        {/* Full Name */}
                        <td className="py-3 px-4 text-fullWhite">
                          {visitor.full_name || (
                            <span className="text-greige italic">Not specified</span>
                          )}
                        </td>

                        {/* Organization */}
                        <td className="py-3 px-4 text-content-secondary">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-greige shrink-0" />
                            <span>{visitor.organization || 'Naval Platform Reviewer'}</span>
                          </div>
                        </td>

                        {/* Permission Status */}
                        <td className="py-3 px-4">
                          {visitor.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-status-passBorder/60 bg-status-pass/30 text-status-passText text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-status-passText" />
                              <span>ACTIVE (Permitted)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-status-failBorder/60 bg-status-fail/30 text-status-failText text-[11px] font-semibold">
                              <XCircle className="w-3 h-3 text-status-failText" />
                              <span>SUSPENDED</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {visitor.is_active ? (
                              <button
                                type="button"
                                onClick={() => handleToggleVisitor(visitor)}
                                className="px-2.5 py-1 rounded border border-status-failBorder/50 bg-status-fail/20 hover:bg-status-fail/40 text-status-failText text-[11px] font-mono flex items-center gap-1 cursor-pointer nav-transition"
                                title="Revoke visitor access immediately"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleVisitor(visitor)}
                                className="px-2.5 py-1 rounded border border-status-passBorder/50 bg-status-pass/20 hover:bg-status-pass/40 text-status-passText text-[11px] font-mono flex items-center gap-1 cursor-pointer nav-transition"
                                title="Grant / Restore visitor access"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Grant Access</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteVisitor(visitor)}
                              className="p-1 rounded text-greige hover:text-status-failText hover:bg-surface-dark nav-transition cursor-pointer"
                              title="Delete visitor record permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: AUDIT LOGS ARCHIVE                                      */}
      {/* ============================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          
          {/* Filter and Search Bar */}
          <div className="bg-surface-panel border border-white/10 rounded p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between font-mono text-xs shadow-panel">
            <form onSubmit={handleLogSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-greige absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter logs by visitor username..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite text-xs font-mono placeholder:text-content-secondary/70 focus:outline-hidden focus:border-matteSage"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-semibold nav-transition cursor-pointer"
              >
                Filter
              </button>
              {logSearch && (
                <button
                  type="button"
                  onClick={handleResetLogSearch}
                  className="px-3 py-2 rounded border border-white/10 bg-surface-dark text-greige hover:text-fullWhite nav-transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>

            <div className="flex items-center gap-3">
              <div className="text-[11px] text-greige">
                <span>Total Events: </span>
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

          {/* Loading State */}
          {loadingLogs && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 bg-surface-panel border border-white/10 rounded">
              <Spinner size="lg" className="text-matteSage" />
              <span className="text-xs font-mono text-greige tracking-wider uppercase">
                LOADING AUDIT LOGS...
              </span>
            </div>
          )}

          {/* Error State */}
          {!loadingLogs && logError && (
            <ErrorPanel
              title="Audit Log Loading Error"
              message={logError}
              onRetry={() => fetchLogs(page, logSearch)}
            />
          )}

          {/* Empty State */}
          {!loadingLogs && !logError && logs.length === 0 && (
            <div className="py-16 text-center bg-surface-panel border border-white/10 rounded p-8">
              <Users className="w-10 h-10 text-greige/50 mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-fullWhite">
                No Visitor Access Events Recorded
              </h3>
              <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
                {logSearch
                  ? `No activity events match username "${logSearch}".`
                  : 'There are currently no recorded visitor access events in the database.'}
              </p>
            </div>
          )}

          {/* Audit Logs Table */}
          {!loadingLogs && !logError && logs.length > 0 && (
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
                          <td className="py-3 px-4 text-fullWhite font-bold">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-matteSage" />
                              <span>{log.visitor_username}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-content-secondary">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-matteSage shrink-0" />
                              <span className="text-fullWhite">{istDate}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-content-secondary">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-greige shrink-0" />
                              <span>{istTime}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-status-passBorder/50 bg-status-pass/30 text-status-passText text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-status-passText" />
                              <span>{eventLabel}</span>
                            </span>
                          </td>

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
      )}

      {/* ============================================================== */}
      {/* MODAL: GRANT VISITOR PERMISSION                                */}
      {/* ============================================================== */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-mono overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-panel border border-white/15 rounded shadow-elevated p-5 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded border border-grayGreen/50 bg-surface-dark flex items-center justify-center text-matteSage">
                  <UserPlus className="w-4 h-4 text-matteSage" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fullWhite">
                    Grant Visitor Permission
                  </h3>
                  <p className="text-[11px] text-content-secondary mt-0.5">
                    Authorized visitors can examine coating analysis records in read-only mode using username and password.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                className="text-greige hover:text-fullWhite p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner inside modal */}
            {grantError && (
              <div className="p-2.5 rounded border border-status-failBorder bg-status-fail/40 text-status-failText text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{grantError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-greige mb-1 font-semibold" htmlFor="visitor-username">
                  Visitor Username <span className="text-status-failText">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-greige">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="visitor-username"
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. auditor_mumbai or commander_singh"
                    value={grantUsername}
                    onChange={(e) => setGrantUsername(e.target.value.toLowerCase())}
                    disabled={grantLoading}
                    className="w-full pl-9 pr-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite placeholder:text-content-secondary/60 focus:outline-hidden focus:border-matteSage"
                  />
                </div>
                <p className="text-[10px] text-content-secondary mt-1">
                  The unique login username the visitor will enter at /visitor-access.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-greige font-semibold" htmlFor="visitor-grant-password">
                    Visitor Access Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGrantPassword(!showGrantPassword)}
                    className="text-[10px] text-greige hover:text-fullWhite cursor-pointer"
                  >
                    {showGrantPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-greige">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="visitor-grant-password"
                    type={showGrantPassword ? 'text' : 'password'}
                    placeholder="Defaults to visitor123 if omitted"
                    value={grantPassword}
                    onChange={(e) => setGrantPassword(e.target.value)}
                    disabled={grantLoading}
                    className="w-full pl-9 pr-9 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite placeholder:text-content-secondary/60 focus:outline-hidden focus:border-matteSage"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGrantPassword(!showGrantPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-greige hover:text-fullWhite cursor-pointer"
                  >
                    {showGrantPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-content-secondary mt-1">
                  Leave empty to automatically assign default password: <code className="text-matteSage">visitor123</code>
                </p>
              </div>

              <div>
                <label className="block text-greige mb-1 font-semibold" htmlFor="visitor-fullname">
                  Full Name / Rank / Designation (Optional)
                </label>
                <input
                  id="visitor-fullname"
                  type="text"
                  placeholder="e.g. Lt. Commander Rajesh Sharma"
                  value={grantFullName}
                  onChange={(e) => setGrantFullName(e.target.value)}
                  disabled={grantLoading}
                  className="w-full px-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite placeholder:text-content-secondary/60 focus:outline-hidden focus:border-matteSage"
                />
              </div>

              <div>
                <label className="block text-greige mb-1 font-semibold" htmlFor="visitor-org">
                  Organization / Department / Command (Optional)
                </label>
                <input
                  id="visitor-org"
                  type="text"
                  placeholder="e.g. Naval Materials Research Laboratory (NMRL)"
                  value={grantOrg}
                  onChange={(e) => setGrantOrg(e.target.value)}
                  disabled={grantLoading}
                  className="w-full px-3 py-2 rounded border border-white/10 bg-surface-dark text-fullWhite placeholder:text-content-secondary/60 focus:outline-hidden focus:border-matteSage"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  id="grant-active"
                  type="checkbox"
                  checked={grantActive}
                  onChange={(e) => setGrantActive(e.target.checked)}
                  disabled={grantLoading}
                  className="w-4 h-4 rounded border-white/10 bg-surface-dark text-matteSage focus:ring-matteSage"
                />
                <label htmlFor="grant-active" className="text-fullWhite text-xs font-semibold cursor-pointer">
                  Activate permission immediately upon creation
                </label>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  disabled={grantLoading}
                  className="px-4 py-2 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-greige hover:text-fullWhite nav-transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantLoading}
                  className="px-4 py-2 rounded border border-matteSage bg-grayGreen hover:bg-grayGreen-light text-fullWhite font-bold nav-transition flex items-center gap-2 cursor-pointer shadow-technical active:scale-98 disabled:opacity-50"
                >
                  {grantLoading ? (
                    <>
                      <Spinner size="sm" className="text-fullWhite" />
                      <span>Granting Permission...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5 text-matteSage" />
                      <span>Grant Permission</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
