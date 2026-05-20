import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { MainLayout } from './components/layout/MainLayout';
import { InboxView } from './components/tasks/InboxView';
import { FocusView } from './components/focus/FocusView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { LoginView } from './components/auth/LoginView';
import { SignupView } from './components/auth/SignupView';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/signup" element={<SignupView />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/tasks/inbox" replace />} />
          <Route path="tasks/:listId" element={<InboxView />} />
          <Route path="tasks/list/:listId" element={<InboxView />} />
          <Route path="focus" element={<FocusView />} />
          <Route path="analytics" element={<AnalyticsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
