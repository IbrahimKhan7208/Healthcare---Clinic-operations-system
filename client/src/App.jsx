import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { BootstrapAdminPage } from './pages/BootstrapAdminPage';
import { AgentPage } from './pages/AgentPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { PatientsPage } from './pages/PatientsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PipelineBoardPage } from './pages/PipelineBoardPage';
import { ReferralReviewPage } from './pages/ReferralReviewPage';
import { DailyOpsBriefPage } from './pages/DailyOpsBriefPage';
import { HandoffInboxPage } from './pages/HandoffInboxPage';
import { ConfirmationsPage } from './pages/ConfirmationsPage';
import { ActionInboxPage } from './pages/ActionInboxPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<BootstrapAdminPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/agent" replace />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/confirmations" element={<ConfirmationsPage />} />
            <Route path="/action-inbox" element={<ActionInboxPage />} />
            <Route path="/pipeline" element={<PipelineBoardPage />} />
            <Route path="/referrals" element={<ReferralReviewPage />} />
            <Route path="/ops-brief" element={<DailyOpsBriefPage />} />
            <Route path="/handoff" element={<HandoffInboxPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
