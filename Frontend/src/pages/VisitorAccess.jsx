import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';
import { Shield, UserCheck, ArrowRight, ArrowLeft, AlertCircle, Info } from 'lucide-react';

export default function VisitorAccess() {
  const { loginVisitor, isVisitorAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated as visitor, redirect to records
  useEffect(() => {
    if (isVisitorAuthenticated) {
      const destination = location.state?.from?.pathname || '/visitor/records';
      navigate(destination, { replace: true });
    }
  }, [isVisitorAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please provide a valid visitor username.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginVisitor(cleanUsername);
      const destination = location.state?.from?.pathname || '/visitor/records';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.message || 'Access denied: Username not authorized for visitor access.'
      );
      setLoading(false);
    }
  };

  const handleQuickFill = (val) => {
    setUsername(val);
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-12 selection:bg-grayGreen/50 selection:text-white font-sans text-content-primary">
      <div className="w-full max-w-md bg-surface-panel border border-white/10 rounded p-7 shadow-elevated relative">
        
        {/* Secondary Action: Return to Home & Theme Toggle */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/"
            className="text-xs font-mono text-greige hover:text-fullWhite inline-flex items-center gap-1.5 nav-transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-grayGreen/40 bg-surface-dark text-[10px] font-mono text-matteSage uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-matteSage" />
              <span>Audit Tracked</span>
            </div>
          </div>
        </div>

        {/* Brand Crest & Heading */}
        <div className="text-center mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage mx-auto mb-2.5">
            <Shield className="w-5 h-5 text-matteSage" />
          </div>
          <h1 className="text-xl font-mono font-bold text-fullWhite tracking-tight">
            Visitor Access
          </h1>
          <p className="text-xs text-content-secondary mt-2 leading-relaxed">
            Enter your username to access available inspection analysis records. Your access will be recorded for audit purposes.
          </p>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div
            className="mb-4 p-3 rounded border border-status-failBorder bg-status-fail/40 text-status-failText text-xs font-mono flex items-start gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-status-failText shrink-0 mt-0.5" />
            <div>
              <span className="font-bold mr-1">ACCESS REJECTED:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Visitor Access Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-greige mb-1.5 font-semibold" htmlFor="visitor-username">
              Visitor Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-greige">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <input
                id="visitor-username"
                name="visitor-username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. visitor or auditor"
                disabled={loading}
                className="w-full pl-9 pr-3 py-2.5 rounded border border-white/10 text-xs font-mono text-fullWhite bg-surface-dark placeholder:text-content-secondary/70 focus:outline-hidden focus:ring-1 focus:ring-grayGreen disabled:opacity-50"
              />
            </div>
            <p className="text-[10px] text-content-secondary mt-1">
              Registered visitor access identifier. Passwords are not required.
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition shadow-technical flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="text-fullWhite" />
                <span>Verifying Visitor Identity...</span>
              </>
            ) : (
              <>
                <span>Continue to Records</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Authorized Visitor Demo Helper */}
        <div className="mt-5 p-3 rounded border border-white/10 bg-surface-dark font-mono text-[11px] space-y-2">
          <div className="flex items-center gap-1.5 text-greige font-semibold">
            <Info className="w-3 h-3 text-matteSage" />
            <span>Authorized Test Visitor Identifiers:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {['visitor', 'auditor', 'defense_observer', 'naval_cadet'].map((uname) => (
              <button
                key={uname}
                type="button"
                onClick={() => handleQuickFill(uname)}
                className="px-2 py-0.5 rounded border border-white/15 bg-surface-panel hover:bg-surface-elevated text-matteSage hover:text-fullWhite text-[10px] nav-transition cursor-pointer"
                title={`Click to fill: ${uname}`}
              >
                {uname}
              </button>
            ))}
          </div>
        </div>

        {/* Inspector Access Link */}
        <div className="mt-5 pt-3 border-t border-white/10 text-center font-mono text-xs">
          <p className="text-greige text-[11px]">
            Certified naval inspector or platform admin?{' '}
            <Link to="/login" className="text-matteSage hover:underline font-semibold">
              Inspector Access
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
