import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const norm = (status || '').toUpperCase();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm font-semibold'
  }[size] || 'px-2.5 py-1 text-xs';

  if (norm === 'PASS') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-xs ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        PASS
      </span>
    );
  }

  if (norm === 'REVIEW') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200/90 shadow-xs ${sizeClasses}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        REVIEW
      </span>
    );
  }

  if (norm === 'FAIL') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200/90 shadow-xs ${sizeClasses}`}>
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        FAIL
      </span>
    );
  }

  // Severity Badges (Low, Medium, High, Critical)
  const severityMap = {
    LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    NEGLIGIBLE: 'bg-slate-100 text-slate-600 border-slate-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
  };

  const style = severityMap[norm] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-mono border ${style} ${sizeClasses}`}>
      {norm}
    </span>
  );
}
