import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Result from './pages/Result';
import History from './pages/History';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Naval Defense Home Page */}
          <Route path="/" element={<HomePage />} />

          {/* Public Inspector Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
          </Route>

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
