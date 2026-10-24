import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function VisitorRoute({ children }) {
  const { isVisitorAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface text-content-primary">
        <Spinner size="lg" className="text-grayGreen" />
        <p className="text-xs font-mono font-semibold tracking-wider uppercase text-content-secondary">
          VERIFYING VISITOR ACCESS CREDENTIALS...
        </p>
      </div>
    );
  }

  if (!isVisitorAuthenticated) {
    return <Navigate to="/visitor-access" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
