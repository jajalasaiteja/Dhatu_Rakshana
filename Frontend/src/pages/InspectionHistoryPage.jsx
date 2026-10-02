import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowRight, Calendar, Box } from 'lucide-react';
import api, { getMediaUrl } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function InspectionHistoryPage() {
  const [inspections, setInspections] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/inspections'),
      api.get('/zones')
    ])
      .then(([inspRes, zonesRes]) => {
        setInspections(inspRes.data || []);
        setZones(zonesRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load history:', err);
        setLoading(false);
      });
  }, []);

  const filteredInspections = selectedZone === 'ALL'
    ? inspections
    : inspections.filter((i) => String(i.zone_id) === String(selectedZone));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600 mb-2 border border-slate-200">
            <span>AUDIT LOG ARCHIVE</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">AMPP / ISO 4628</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
            Inspection Audit History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical marine coating inspection records, localized defect classifications, and standards compliance findings.
          </p>
        </div>

        <Link
          to="/"
          className="self-start md:self-auto px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all"
        >
          New Inspection
        </Link>
      </div>

      {/* Zone Filter Tabs (Sarvam horizontal pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedZone('ALL')}
          className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-xs ${
            selectedZone === 'ALL'
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Zones ({inspections.length})
        </button>
        {zones.map((zone) => {
          const count = inspections.filter((i) => i.zone_id === zone.id).length;
          return (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(String(zone.id))}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-xs ${
                selectedZone === String(zone.id)
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {zone.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading audit history...</p>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-xl text-slate-500">
          <p className="text-base font-semibold text-slate-800">No inspections found for this zone.</p>
          <p className="text-xs mt-1">Upload an inspection image to initiate an assessment record.</p>
          <Link
            to="/"
            className="mt-4 inline-block px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold"
          >
            Start First Inspection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInspections.map((insp) => {
            const thumbUrl = getMediaUrl(insp.image_url);

            return (
              <div
                key={insp.id}
                className="group rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-lg hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                    <img
                      src={thumbUrl}
                      alt={`Inspection #${insp.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={insp.overall_verdict} size="sm" />
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span className="font-bold text-slate-700">ID #{insp.id}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(insp.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {insp.zone_name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>Defects: <strong className="text-slate-800">{insp.defect_count}</strong></span>
                      <span>•</span>
                      <span>3D Mesh: <strong className={insp.mesh_url ? 'text-emerald-600' : 'text-slate-400'}>{insp.mesh_url ? 'Yes' : 'No'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Button */}
                <div className="p-5 pt-0">
                  <Link
                    to={`/inspections/${insp.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-slate-50 hover:bg-neutral-900 hover:text-white text-xs font-semibold text-slate-700 transition-all border border-slate-200 hover:border-neutral-900"
                  >
                    <span>View Inspection Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
