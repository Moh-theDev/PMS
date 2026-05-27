import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { MainLayout } from './components/layout/MainLayout';
import { InboxView } from './features/tasks/components/InboxView';
import { FocusView } from './features/focus/components/FocusView';
import { AnalyticsView } from './features/analytics/components/AnalyticsView';
import { AiAssistantView } from './features/ai-assistant/components/AiAssistantView';
import { LoginView } from './features/auth/components/LoginView';
import { SignupView } from './features/auth/components/SignupView';
import { Loader2 } from 'lucide-react';

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] text-slate-800 relative overflow-hidden">
      {/* Premium ambient light glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200/60 shadow-lg shadow-slate-200/50">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Workspace</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/tasks/inbox" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginView />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignupView />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/tasks/inbox" replace />} />
          <Route path="tasks/:listId" element={<InboxView />} />
          <Route path="tasks/list/:listId" element={<InboxView />} />
          <Route path="tasks/tag/:tagId" element={<InboxView />} />
          <Route path="focus" element={<FocusView />} />
          <Route path="analytics" element={<AnalyticsView />} />
          <Route path="ai-assistant" element={<AiAssistantView />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/tasks/inbox" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
