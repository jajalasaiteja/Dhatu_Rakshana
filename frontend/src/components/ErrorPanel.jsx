import React from 'react';

export default function ErrorPanel({ message, onRetry, className = '' }) {
  return (
    <div className={`p-4 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm ${className}`}>
      <div className="flex items-center gap-2.5">
        <svg className="w-5 h-5 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{message || 'An unexpected error occurred.'}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
