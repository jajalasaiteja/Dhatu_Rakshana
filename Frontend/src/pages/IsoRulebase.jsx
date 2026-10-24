import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { STANDARDS_RULEBASE } from '../data/standardsRulebaseData';
import { Search, ArrowLeft } from 'lucide-react';

export default function IsoRulebase() {
  const { user } = useAuth();
  // Default to the chronologically oldest standard (ISO 8501-1:2007)
  const [selectedStandardId, setSelectedStandardId] = useState('iso-8501-1-2007');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter standards by query across designations, titles, scopes, and criteria
  const filteredStandards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return STANDARDS_RULEBASE;

    return STANDARDS_RULEBASE.filter((std) => {
      if (
        std.designation.toLowerCase().includes(q) ||
        std.displayTitle.toLowerCase().includes(q) ||
        std.fullOfficialTitle.toLowerCase().includes(q) ||
        std.shortNavTitle?.toLowerCase().includes(q) ||
        String(std.publicationYear).includes(q) ||
        std.scope.toLowerCase().includes(q) ||
        std.summaryDescription?.toLowerCase().includes(q)
      ) {
        return true;
      }

      // Check inspection criteria
      if (
        std.inspectionCriteria?.some(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.detail.toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      // Check table contents
      if (
        std.tables?.some(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.rows?.some((r) => r.some((cell) => cell.toLowerCase().includes(q)))
        )
      ) {
        return true;
      }

      // Check procedures
      if (
        std.procedure?.some(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.text.toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      return false;
    });
  }, [searchQuery]);

  // Sort official ISO standards chronologically in increasing order of publication year:
  // Primary: publication year (oldest to newest)
  // Secondary: standard number (e.g. ISO 4628 before ISO 19840)
  // Tertiary: part number (e.g. Part 1 before Part 8)
  const isoStandards = useMemo(() => {
    return filteredStandards
      .filter((s) => s.type === 'official_iso')
      .sort((a, b) => {
        if (a.publicationYear !== b.publicationYear) {
          return a.publicationYear - b.publicationYear;
        }
        if (a.standardCode !== b.standardCode) {
          return a.standardCode - b.standardCode;
        }
        return (a.partNumber || 0) - (b.partNumber || 0);
      });
  }, [filteredStandards]);

  // Project-specific inspection guidance kept separate
  const projectStandards = useMemo(() => {
    return filteredStandards.filter((s) => s.type === 'project_framework');
  }, [filteredStandards]);

  // Unified list for active selection lookup and mobile tab strip
  const allOrderedStandards = useMemo(() => {
    return [...isoStandards, ...projectStandards];
  }, [isoStandards, projectStandards]);

  // Ensure selected standard remains valid if search query changes
  const activeStandard = useMemo(() => {
    const found = allOrderedStandards.find((s) => s.id === selectedStandardId);
    if (found) return found;
    return allOrderedStandards[0] || STANDARDS_RULEBASE[0];
  }, [allOrderedStandards, selectedStandardId]);

  return (
    <div className="min-h-screen bg-surface text-content-primary flex flex-col font-sans selection:bg-grayGreen/50 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        {/* Header & Breadcrumb */}
        <div className="border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <Link
              to={user ? '/dashboard' : '/'}
              className="inline-flex items-center gap-2 text-xs font-mono text-greige hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {user ? 'Dashboard' : 'Home'}</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
                ISO Rulebase
              </h1>
              <p className="text-xs sm:text-sm text-greige mt-1 max-w-3xl leading-relaxed">
                Coating inspection and surface assessment criteria used by Dhatu Rakshana for marine integrity evaluation and standards compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Reference Workstation (Sidebar + Details) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Standards Navigation & Filter */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-20">
            {/* Unobtrusive Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-greige/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search standards or criteria..."
                className="w-full pl-9 pr-7 py-2 rounded bg-surface-dark border border-white/10 text-xs text-white placeholder-greige/50 focus:outline-hidden focus:border-matteSage/70 transition-colors font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-greige hover:text-white"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile Horizontal Standards Selector (< lg screens) */}
            <div className="flex lg:hidden overflow-x-auto gap-1.5 pb-1 scrollbar-none">
              {allOrderedStandards.map((std) => {
                const isSelected = activeStandard?.id === std.id;
                const isIso = std.type === 'official_iso';
                return (
                  <button
                    key={std.id}
                    type="button"
                    onClick={() => setSelectedStandardId(std.id)}
                    className={`shrink-0 px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
                      isSelected
                        ? isIso
                          ? 'bg-surface-panel border-grayGreen text-matteSage font-semibold'
                          : 'bg-surface-panel border-richTan text-strawBeige font-semibold'
                        : 'border-white/10 bg-surface-dark text-greige hover:text-white'
                    }`}
                  >
                    <span>{std.designation}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Vertical Standards Directory (lg+ screens) */}
            <nav className="hidden lg:block space-y-5" aria-label="Standards Directory">
              {/* Group 1: Official ISO Standards (Chronological) */}
              {isoStandards.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-greige/70 px-2 mb-1.5 flex items-center justify-between">
                    <span>Official ISO Standards (Chronological)</span>
                    <span className="text-[10px] text-greige/50">{isoStandards.length}</span>
                  </div>
                  <ul className="space-y-1">
                    {isoStandards.map((std) => {
                      const isSelected = activeStandard?.id === std.id;
                      return (
                        <li key={std.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedStandardId(std.id)}
                            className={`w-full text-left px-3 py-2.5 rounded text-xs transition-colors border ${
                              isSelected
                                ? 'bg-surface-panel border-grayGreen/50 text-white shadow-panel'
                                : 'border-transparent text-greige hover:text-white hover:bg-surface-panel/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 leading-tight mb-1">
                              <span
                                className={`font-mono font-semibold ${
                                  isSelected ? 'text-matteSage' : 'text-white/90'
                                }`}
                              >
                                {std.designation}
                              </span>
                              <span className="text-[10px] font-mono text-greige/60">
                                {std.publicationYear}
                              </span>
                            </div>
                            <div className="text-[11px] text-greige/80 line-clamp-1">
                              {std.shortNavTitle || std.displayTitle}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Group 2: Project-Specific Guidance */}
              {projectStandards.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-greige/70 px-2 mb-1.5 flex items-center justify-between">
                    <span>Project Inspection Guidance</span>
                    <span className="text-[10px] text-strawBeige/70">Framework</span>
                  </div>
                  <ul className="space-y-1">
                    {projectStandards.map((std) => {
                      const isSelected = activeStandard?.id === std.id;
                      return (
                        <li key={std.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedStandardId(std.id)}
                            className={`w-full text-left px-3 py-2.5 rounded text-xs transition-colors border ${
                              isSelected
                                ? 'bg-surface-panel border-richTan/50 text-white shadow-panel'
                                : 'border-transparent text-greige hover:text-white hover:bg-surface-panel/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 leading-tight mb-1">
                              <span
                                className={`font-mono font-semibold ${
                                  isSelected ? 'text-strawBeige' : 'text-white/90'
                                }`}
                              >
                                {std.designation}
                              </span>
                              <span className="text-[10px] font-mono text-greige/60">
                                {std.publicationYear}
                              </span>
                            </div>
                            <div className="text-[11px] text-greige/80 line-clamp-1">
                              {std.shortNavTitle || std.displayTitle}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {allOrderedStandards.length === 0 && (
                <div className="p-4 rounded border border-white/10 bg-surface-dark text-xs text-greige text-center">
                  No standards match “{searchQuery}”.
                  <button
                    onClick={() => setSearchQuery('')}
                    className="block mx-auto mt-2 text-matteSage hover:underline text-xs"
                  >
                    Reset search
                  </button>
                </div>
              )}
            </nav>
          </aside>

          {/* Right Column: Selected Standard Technical Reference Sheet */}
          <section className="lg:col-span-8 xl:col-span-9">
            {activeStandard ? (
              <div className="bg-surface-panel rounded border border-white/10 p-5 sm:p-7 shadow-panel space-y-7">
                
                {/* Standard Title & Clean Hierarchical Header */}
                <div className="border-b border-white/10 pb-5 space-y-3">
                  
                  {/* Top Metadata Badges & Publication Year */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${
                        activeStandard.type === 'official_iso'
                          ? 'border-grayGreen/40 bg-grayGreen/15 text-matteSage'
                          : 'border-richTan/40 bg-richTan/15 text-strawBeige'
                      }`}
                    >
                      {activeStandard.typeLabel}
                    </span>

                    <span className="text-white/20">|</span>

                    <span className="text-[11px] font-mono text-greige/80">
                      Publication Year: <strong className="text-white font-mono">{activeStandard.publicationYear}</strong>
                    </span>

                    <span className="text-white/20">|</span>

                    <span className="text-[11px] font-mono text-greige/70">
                      {activeStandard.edition}
                    </span>
                  </div>

                  {/* Primary Heading: Standard Reference Number and Year */}
                  <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                    {activeStandard.designation}
                  </h2>

                  {/* Secondary Heading: Concise, Readable Title */}
                  <h3 className="text-lg sm:text-xl font-semibold text-matteSage tracking-tight leading-snug">
                    {activeStandard.displayTitle}
                  </h3>

                  {/* Short Explanatory Description */}
                  <p className="text-xs sm:text-sm text-greige leading-relaxed font-sans pt-0.5">
                    {activeStandard.summaryDescription}
                  </p>

                  {/* Secondary Detail: Full Official Document Title */}
                  <div className="pt-2 text-[11px] font-mono text-greige/70 border-t border-white/5 leading-relaxed">
                    <span className="text-greige/40 uppercase tracking-wider text-[10px] mr-1">
                      Official Title:
                    </span>
                    <span>{activeStandard.fullOfficialTitle}</span>
                  </div>

                </div>

                {/* Scope & Application */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-matteSage font-semibold">
                    Scope & Application
                  </h4>
                  <p className="text-sm text-greige leading-relaxed font-sans">
                    {activeStandard.scope}
                  </p>
                </div>

                {/* Inspection Criteria */}
                {activeStandard.inspectionCriteria && activeStandard.inspectionCriteria.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-matteSage font-semibold">
                      Inspection Criteria
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeStandard.inspectionCriteria.map((crit, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded border border-white/5 bg-surface-dark/70 text-xs space-y-1"
                        >
                          <div className="font-mono font-semibold text-white text-[11px]">
                            {crit.label}
                          </div>
                          <p className="text-greige leading-relaxed">
                            {crit.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Tables / Rating Scales */}
                {activeStandard.tables && activeStandard.tables.length > 0 && (
                  <div className="space-y-5">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-matteSage font-semibold">
                      Defect Ratings & Classifications
                    </h4>

                    {activeStandard.tables.map((table) => (
                      <div
                        key={table.id}
                        className="rounded border border-white/10 overflow-hidden bg-surface-dark"
                      >
                        <div className="px-4 py-2.5 bg-surface-subpanel border-b border-white/10">
                          <h5 className="text-xs font-mono font-semibold text-white">
                            {table.title}
                          </h5>
                          {table.description && (
                            <p className="text-[11px] text-greige/70 mt-0.5">
                              {table.description}
                            </p>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#141517] text-greige font-mono text-[11px] uppercase tracking-wider border-b border-white/10">
                              <tr>
                                {table.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="px-3.5 py-2 font-medium">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {table.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className={`px-3.5 py-2.5 align-top text-greige leading-relaxed ${
                                        cIdx === 0
                                          ? 'font-mono font-semibold text-matteSage whitespace-nowrap'
                                          : cIdx === 1 && row.length > 2
                                          ? 'font-medium text-white/90'
                                          : ''
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Practical Inspection Procedure */}
                {activeStandard.procedure && activeStandard.procedure.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-matteSage font-semibold">
                      Practical Inspection Procedure
                    </h4>
                    <div className="space-y-2 border-l border-white/15 pl-4 ml-1">
                      {activeStandard.procedure.map((p) => (
                        <div key={p.step} className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-matteSage text-[11px]">
                              Step {p.step}.
                            </span>
                            <span className="font-semibold text-white">
                              {p.title}
                            </span>
                          </div>
                          <p className="text-greige leading-relaxed pl-5">
                            {p.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acceptance Requirements */}
                {activeStandard.acceptanceCriteria && (
                  <div className="space-y-3 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-matteSage font-semibold">
                        Acceptance Requirements
                      </h4>
                      <span className="text-[11px] font-mono text-greige/60">
                        {activeStandard.acceptanceCriteria.hasOfficialCriteria
                          ? 'Official Criteria'
                          : 'Specification-Dependent'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded border border-white/10 bg-surface-dark space-y-2 text-xs">
                      <p className="text-white/90 font-medium">
                        {activeStandard.acceptanceCriteria.summary}
                      </p>
                      <p className="text-greige leading-relaxed">
                        {activeStandard.acceptanceCriteria.details}
                      </p>

                      {/* Display explicit rules if standard includes them (e.g. ISO 19840 80/20 rule, Framework) */}
                      {activeStandard.acceptanceCriteria.rules && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 mt-2">
                          {activeStandard.acceptanceCriteria.rules.map((rule, rIdx) => (
                            <div
                              key={rIdx}
                              className="p-2.5 rounded bg-surface-panel/80 border border-white/5 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-white text-[11px]">
                                  {rule.ruleName}
                                </span>
                                <span className="font-mono text-[10px] text-matteSage px-1.5 py-0.5 rounded bg-surface-dark border border-white/5">
                                  {rule.requirement}
                                </span>
                              </div>
                              <p className="text-[11px] text-greige leading-relaxed">
                                {rule.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : null}
          </section>

        </div>
      </main>
    </div>
  );
}
