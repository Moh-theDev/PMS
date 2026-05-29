import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== 'false'; // default to true
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar transition wrapper */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden h-screen shrink-0 border-r border-slate-200 bg-slate-50",
          sidebarOpen ? "w-60 opacity-100" : "w-0 opacity-0 border-r-0 pointer-events-none"
        )}
      >
        <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      </div>

      {/* Floating button to restore sidebar when hidden */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute top-6 left-6 z-40 h-9 w-9 bg-white border border-slate-200 hover:border-blue-200 text-slate-500 hover:text-blue-600 rounded-xl shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-left-2"
          title="Show Sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Main dashboard content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <Outlet context={{ sidebarOpen, toggleSidebar }} />
      </main>
    </div>
  );
}
