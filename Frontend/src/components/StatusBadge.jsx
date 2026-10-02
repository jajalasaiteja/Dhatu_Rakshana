import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const norm = (status || '').toUpperCase();

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] font-mono tracking-wider',
    md: 'px-2 py-0.5 text-[11px] font-mono tracking-wider',
    lg: 'px-2.5 py-1 text-xs font-mono tracking-wider',
  }[size] || 'px-2 py-0.5 text-[11px] font-mono';

  if (norm === 'PASS') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-passBorder bg-status-pass text-status-passText font-semibold ${sizeClasses}`}>
        <CheckCircle2 className="w-3 h-3 stroke-[2.5] text-status-passText" />
        PASS
      </span>
    );
  }

  if (norm === 'REVIEW') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-reviewBorder bg-status-review/40 text-status-reviewText font-semibold ${sizeClasses}`}>
        <AlertTriangle className="w-3 h-3 stroke-[2.5] text-status-reviewBorder" />
        REVIEW
      </span>
    );
  }

  if (norm === 'FAIL') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-failBorder bg-status-fail/40 text-status-failText font-semibold ${sizeClasses}`}>
        <XCircle className="w-3 h-3 stroke-[2.5] text-status-failBorder" />
        FAIL
      </span>
    );
  }

  if (norm === 'PENDING' || norm === 'IN_PROGRESS') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-dullCoffee/70 bg-surface-panel text-strawBeige font-semibold ${sizeClasses}`}>
        <Clock className="w-3 h-3 animate-spin text-strawBeige" />
        ANALYSIS IN PROGRESS
      </span>
    );
  }

  // Severity Classifications
  if (norm === 'CRITICAL') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-failBorder bg-status-fail/60 text-status-failText font-bold ${sizeClasses}`}>
        <ShieldAlert className="w-3 h-3" />
        CRITICAL
      </span>
    );
  }

  if (norm === 'HIGH') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-failBorder/80 bg-status-fail/40 text-status-failText font-semibold ${sizeClasses}`}>
        HIGH
      </span>
    );
  }

  if (norm === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-reviewBorder bg-status-review/30 text-status-reviewText font-semibold ${sizeClasses}`}>
        MEDIUM
      </span>
    );
  }

  if (norm === 'LOW') {
    return (
      <span className={`inline-flex items-center gap-1 rounded border border-status-passBorder/80 bg-status-pass/40 text-status-passText font-semibold ${sizeClasses}`}>
        LOW
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded border border-dullCoffee/60 bg-surface-panel text-greige ${sizeClasses}`}>
      {norm || 'STANDARD'}
    </span>
  );
}
