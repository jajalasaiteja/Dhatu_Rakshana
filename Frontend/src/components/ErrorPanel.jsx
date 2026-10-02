import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorPanel({ message, onRetry, className = '' }) {
  return (
    <div
      className={`p-3.5 rounded border border-status-failBorder/80 bg-surface-panel shadow-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
      role="alert"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="p-1 rounded bg-status-fail border border-status-failBorder shrink-0 text-status-failText">
          <AlertCircle className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-status-failText">
            Inspection System Notice
          </div>
          <p className="text-xs font-medium text-content-primary mt-0.5">
            {message || 'An unexpected inspection system fault occurred.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-surface-dark hover:bg-surface-elevated text-content-primary text-xs font-mono nav-transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-matteSage" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
}
