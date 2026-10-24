import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import VisitorRoute from './components/VisitorRoute';
import AppLayout from './components/AppLayout';

import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Result from './pages/Result';
import History from './pages/History';
import NotFound from './pages/NotFound';
import IsoRulebase from './pages/IsoRulebase';
import VisitorAccess from './pages/VisitorAccess';
import VisitorRecords from './pages/VisitorRecords';
import VisitorRecordDetail from './pages/VisitorRecordDetail';
import VisitorLogs from './pages/VisitorLogs';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Naval Defense Home Page */}
            <Route path="/" element={<HomePage />} />

            {/* Dedicated Technical Reference ISO Rulebase Page */}
            <Route path="/standards" element={<IsoRulebase />} />

            {/* Public Inspector Authentication (Login & Register) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public Visitor Access Authentication Page */}
            <Route path="/visitor-access" element={<VisitorAccess />} />

            {/* Protected Visitor Read-Only Analysis Records */}
            <Route
              path="/visitor/records"
              element={
                <VisitorRoute>
                  <VisitorRecords />
                </VisitorRoute>
              }
            />
            <Route
              path="/records"
              element={
                <VisitorRoute>
                  <VisitorRecords />
                </VisitorRoute>
              }
            />
            <Route
              path="/visitor/records/:id"
              element={
                <VisitorRoute>
                  <VisitorRecordDetail />
                </VisitorRoute>
              }
            />

            {/* Protected Inspector Operational Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Upload />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/inspections" element={<History />} />
              <Route path="/history" element={<History />} />
              <Route path="/inspections/:id" element={<Result />} />
              <Route path="/visitor-logs" element={<VisitorLogs />} />
            </Route>

            {/* Fallback 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
