import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide inspector email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('inspector@navy.mil');
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-12 selection:bg-grayGreen/50 selection:text-white font-sans text-content-primary">
      
      <div className="w-full max-w-md bg-surface-panel border border-white/10 rounded p-7 shadow-elevated relative">
        {/* Back Link */}
        <div className="mb-5">
          <Link
            to="/"
            className="text-xs font-mono text-greige hover:text-fullWhite inline-flex items-center gap-1.5 nav-transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Platform Overview</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded border border-grayGreen/50 bg-surface-darker flex items-center justify-center text-matteSage mx-auto mb-2.5">
            <Shield className="w-5 h-5 text-matteSage" />
          </div>
          <h1 className="text-lg font-mono font-bold text-fullWhite tracking-tight">
            DHATU RAKSHANA
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-wider text-greige font-semibold mt-0.5">
            Inspector Sign In
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded border border-status-failBorder bg-status-fail/40 text-status-failText text-xs font-mono" role="alert">
            <span className="font-bold mr-1">NOTICE:</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">
          <div>
            <label className="block text-greige mb-1 font-semibold" htmlFor="email">
              Username or Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-greige">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin or inspector@navy.mil"
                disabled={loading}
                className="w-full pl-9 pr-3 py-2 rounded border border-white/10 text-xs font-mono text-fullWhite bg-surface-dark focus:outline-hidden focus:ring-1 focus:ring-grayGreen disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-greige font-semibold" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-greige hover:text-fullWhite cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-greige">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full pl-9 pr-9 py-2 rounded border border-white/10 text-xs font-mono text-fullWhite bg-surface-dark focus:outline-hidden focus:ring-1 focus:ring-grayGreen disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-greige hover:text-fullWhite cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded border border-grayGreen bg-grayGreen hover:bg-grayGreen-light text-fullWhite text-xs font-mono font-semibold nav-transition shadow-technical flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 mt-3"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="text-fullWhite" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Inspection Platform</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Autofill */}
        <div className="mt-4 p-2.5 rounded border border-white/10 bg-surface-dark text-center font-mono text-[11px]">
          <p className="text-greige mb-1">
            Test Environment Credentials:
          </p>
          <button
            type="button"
            onClick={handleDemoFill}
            className="px-2.5 py-1 rounded border border-white/15 bg-surface-panel text-fullWhite hover:bg-surface-elevated nav-transition cursor-pointer"
          >
            Autofill: inspector@navy.mil
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 text-center font-mono text-xs">
          <p className="text-greige text-[11px]">
            New inspection personnel?{' '}
            <Link to="/register" className="text-matteSage hover:underline font-semibold">
              Register Credentials
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}
