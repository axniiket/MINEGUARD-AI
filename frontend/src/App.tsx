import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MineDashboardPage from './pages/MineDashboardPage';
import InspectionsPage from './pages/InspectionsPage';
import InspectionDetailPage from './pages/InspectionDetailPage';
import AlertsPage from './pages/AlertsPage';
import MineMapPage from './pages/MineMapPage';
import CorrectiveActionsPage from './pages/CorrectiveActionsPage';
import ComplianceCalendarPage from './pages/ComplianceCalendarPage';
import RiskAnalyticsPage from './pages/RiskAnalyticsPage';
import AuditTimelinePage from './pages/AuditTimelinePage';
import ReportsExportPage from './pages/ReportsExportPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="mines" element={<DashboardPage />} />
        <Route path="mines/:id" element={<MineDashboardPage />} />
        <Route path="map" element={<MineMapPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="inspections/:id" element={<InspectionDetailPage />} />
        <Route path="actions" element={<CorrectiveActionsPage />} />
        <Route path="compliance" element={<ComplianceCalendarPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="analytics" element={<RiskAnalyticsPage />} />
        <Route path="audit" element={<AuditTimelinePage />} />
        <Route path="reports" element={<ReportsExportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
