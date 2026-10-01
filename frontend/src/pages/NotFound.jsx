import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="max-w-md bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-xs space-y-4">
        <h1 className="text-3xl font-bold font-serif text-slate-900">404</h1>
        <p className="text-sm text-slate-600">The requested inspection route or asset could not be found.</p>
        <div>
          <Link
            to="/upload"
            className="inline-block px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Return to Upload
          </Link>
        </div>
      </div>
    </div>
  );
}
