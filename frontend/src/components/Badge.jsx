import React from 'react';

export default function Badge({ status, size = 'md' }) {
  const normalized = (status || 'pending').toLowerCase();

  let styles = 'bg-amber-50 text-amber-800 border-amber-200';
  let label = status || 'Review';

  if (normalized === 'pass') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    label = 'PASS';
  } else if (normalized === 'fail') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
    label = 'FAIL';
  } else if (normalized === 'review' || normalized === 'pending') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    label = normalized === 'pending' ? 'PENDING' : 'REVIEW';
  } else if (normalized === 'low') {
    styles = 'bg-slate-100 text-slate-700 border-slate-200';
    label = 'Low';
  } else if (normalized === 'medium') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    label = 'Medium';
  } else if (normalized === 'high') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
    label = 'High';
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px]'
    : size === 'lg'
    ? 'px-3.5 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center font-medium font-mono rounded-full border ${styles} ${sizeClasses}`}>
      {label}
    </span>
  );
}
