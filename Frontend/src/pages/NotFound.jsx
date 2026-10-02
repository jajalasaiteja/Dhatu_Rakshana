import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 font-mono text-content-primary selection:bg-grayGreen/50 selection:text-white">
      <div className="max-w-md bg-surface-panel rounded border border-white/10 p-7 shadow-elevated space-y-3.5">
        <div className="w-10 h-10 rounded border border-status-failBorder bg-status-fail/60 flex items-center justify-center text-status-failText mx-auto">
          <ShieldAlert className="w-5 h-5 stroke-[2]" />
        </div>

        <h1 className="text-2xl font-bold text-fullWhite">404</h1>
        <h2 className="text-xs uppercase tracking-widest text-status-failText font-semibold">
          Inspection Resource Not Found
        </h2>

        <p className="text-xs text-greige font-sans leading-relaxed">
          The requested inspection analysis, specimen image record, or platform route could not be located in the current records database.
        </p>

        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-semibold nav-transition shadow-technical"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Inspection Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
